 
const db      = require('../db');
const express = require('express');
const router  = express.Router();
const { authenticateToken, requireAdmin, logAudit } = require('../middleware/auth');
const { getCtoCreditRunningTotals } = require('../services/ctoCreditRunningTotals');

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const insertTransactionLog = (employeeId, message) =>
  new Promise((resolve) => {
    if (!employeeId || !message) return resolve();
    db.query(
      "INSERT INTO transaction_table (employee_id, message) VALUES (?, ?)",
      [String(employeeId), String(message).slice(0, 4000)],
      () => resolve(),
    );
  });

const getActorEmpNum = (req) => (req?.user?.employeeNumber ? String(req.user.employeeNumber) : null);

const getEmployeeFullName = (employeeNumber) =>
  new Promise((resolve) => {
    const emp = String(employeeNumber || "").trim();
    if (!emp) return resolve("");
    db.query(
      `SELECT CONCAT_WS(' ', firstName, middleName, lastName, nameExtension) AS fullName
       FROM person_table
       WHERE TRIM(CAST(agencyEmployeeNum AS CHAR)) = TRIM(?)
       LIMIT 1`,
      [emp],
      (err, rows) => {
        if (err) return resolve("");
        resolve((rows && rows[0] && rows[0].fullName) ? String(rows[0].fullName) : "");
      },
    );
  });

const formatUserDisplayName = (employeeNumber, fullName) => {
  const emp = employeeNumber ? String(employeeNumber) : "unknown";
  const name = (fullName || "").trim();
  return name ? `${name} (${emp})` : emp;
};

const fmtPeriod = (y, m) => {
  const yy = y != null && String(y).trim() !== "" ? String(y).trim() : "—";
  const mmRaw = m != null && String(m).trim() !== "" ? String(m).trim() : "00";
  const mm = String(parseInt(mmRaw, 10) || 0).padStart(2, "0");
  return `${yy}-${mm}`;
};

const auditCto = async ({ req, action, recordId, targetEmployeeNumber, details }) => {
  try {
    logAudit(
      { employeeNumber: getActorEmpNum(req) },
      action,
      "cto_credit",
      recordId,
      targetEmployeeNumber != null ? String(targetEmployeeNumber) : null,
      details,
    );
  } catch {}
};

/** Always mirror balance changes to transaction_table + audit_log (same pattern as leave_assignment). */
const logCtoBalanceChange = async ({
  req,
  targetEmp,
  recordId,
  action,
  period_year,
  period_month,
  balBeforeRem,
  balAfterRem,
  details = {},
}) => {
  const actorEmp = getActorEmpNum(req);
  const emp = String(targetEmp || "").trim();
  if (!emp) return;
  const [actorName, targetName] = await Promise.all([
    getEmployeeFullName(actorEmp),
    getEmployeeFullName(emp),
  ]);
  const actorDisplay = formatUserDisplayName(actorEmp, actorName);
  const targetDisplay = formatUserDisplayName(emp, targetName);
  const hasBal =
    balBeforeRem != null &&
    balAfterRem != null &&
    Number.isFinite(Number(balBeforeRem)) &&
    Number.isFinite(Number(balAfterRem));
  const b0 = hasBal ? toNum(balBeforeRem) : null;
  const b1 = hasBal ? toNum(balAfterRem) : null;
  const delta = hasBal ? b1 - b0 : null;
  const balPart = hasBal
    ? ` Balance updated: ${b0.toFixed(3)} hrs → ${b1.toFixed(3)} hrs (${delta >= 0 ? "+" : "−"}${Math.abs(delta).toFixed(3)} hrs).`
    : "";
  const msg = `${actorDisplay} ${action} Compensatory Time Off for ${targetDisplay} (record #${recordId}) for period ${fmtPeriod(period_year, period_month)}.${balPart}`;
  await insertTransactionLog(emp, msg);
  await auditCto({
    req,
    action,
    recordId,
    targetEmployeeNumber: emp,
    details: {
      ...details,
      transaction_message: msg,
      ...(hasBal
        ? {
            balance_before_remaining: b0,
            balance_after_remaining: b1,
            balance_delta_remaining: delta,
          }
        : {}),
    },
  });
};
 
// ─── GET /cto ─────────────────────────────────────────────────────────────────
router.get('/cto', (req, res) => {
  const q = `
    SELECT c.*,
           CONCAT(p.firstName,' ',p.lastName) AS fullName,
           p.firstName, p.lastName
    FROM cto_credit c
    LEFT JOIN users u        ON u.employeeNumber    = c.employeeNumber
    LEFT JOIN person_table p ON p.agencyEmployeeNum = c.employeeNumber
    ORDER BY c.period_year DESC, c.period_month DESC, c.id DESC
  `;
  db.query(q, (err, rows) => {
    if (err) {
      console.error('cto GET error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});
 
// ─── GET /cto/:employeeNumber ────────────────────────────────────────────────
router.get('/cto/:employeeNumber', (req, res) => {
  db.query(
    `SELECT * FROM cto_credit
     WHERE employeeNumber = ?
     ORDER BY period_year DESC, period_month DESC, id DESC`,
    [req.params.employeeNumber],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ─── GET /cto/:id/audit ───────────────────────────────────────────────────────
router.get('/cto/:id/audit', authenticateToken, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });
  db.query(
    `SELECT *
     FROM audit_log
     WHERE table_name = 'cto_credit' AND record_id = ?
     ORDER BY timestamp DESC
     LIMIT 200`,
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Failed to fetch audit logs" });
      res.json(Array.isArray(rows) ? rows : []);
    },
  );
});
 
// ─── POST /cto ────────────────────────────────────────────────────────────────
router.post('/cto', authenticateToken, requireAdmin, (req, res) => {
  const {
    employeeNumber, ot_hours, earned_hours, remaining_hours, used_hours,
    period_year, period_month, expiry_date,
    remarks, emp_category_snapshot,
  } = req.body;
 
  const earned = parseFloat(earned_hours ?? ot_hours) || 0;
  const rem = parseFloat(remaining_hours ?? earned_hours) || 0;
  const used = parseFloat(used_hours) || 0;
 
  db.query(
    `INSERT INTO cto_credit
     (employeeNumber, ot_hours, earned_hours, remaining_hours, used_hours,
      period_year, period_month, expiry_date, remarks, emp_category_snapshot)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      employeeNumber,
      parseFloat(ot_hours) || 0,
      earned,
      rem,
      used,
      parseInt(period_year, 10) || null,
      period_month || null,
      expiry_date  || null,
      remarks      || null,
      emp_category_snapshot || null,
    ],
    async (err, result) => {
      if (err) {
        console.error('cto POST error:', err);
        return res.status(500).json({ error: err.message });
      }
      const newId = result.insertId;
      const emp = String(employeeNumber || "").trim();
      try {
        const balBefore = Math.max(0, rem - earned);
        await logCtoBalanceChange({
          req,
          targetEmp: emp,
          recordId: newId,
          action: "assigned",
          period_year,
          period_month,
          balBeforeRem: balBefore,
          balAfterRem: rem,
          details: {
            employeeNumber: emp,
            ot_hours,
            earned_hours: earned,
            period_year,
            period_month,
            expiry_date,
            remarks,
            source: "cto_credit_create",
          },
        });
        res.json({ id: newId, ...req.body, remaining_hours: rem, used_hours: used });
      } catch (e) {
        console.error("[cto] POST audit:", e.message);
        res.status(500).json({ error: "CTO saved but failed to write audit log" });
      }
    }
  );
});
 
// ─── PUT /cto/:id ─────────────────────────────────────────────────────────────
// Append-only ledger snapshot (do not UPDATE in place — running balance reads latest id).
router.put('/cto/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { ot_hours, earned_hours, used_hours, expiry_date, remarks } = req.body;
  const snapEarned = toNum(earned_hours);
  const snapUsed = toNum(used_hours);
  const snapRem = Math.max(0, snapEarned - snapUsed);
  const snapOt = toNum(ot_hours);

  db.query('SELECT * FROM cto_credit WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    const rec = rows[0];
    const emp = rec.employeeNumber;
    const ledgerRemark = [`cto_manual_adjust:source_row_${id}`, remarks].filter(Boolean).join(' · ');

    getCtoCreditRunningTotals(emp, (errSum, cur) => {
      if (errSum) return res.status(500).json({ error: errSum.message });
      const balBefore = cur.remaining;

      db.query(
        `INSERT INTO cto_credit
          (employeeNumber, ot_hours, earned_hours, remaining_hours, used_hours, period_year, period_month, expiry_date, remarks, emp_category_snapshot)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          emp,
          snapOt,
          snapEarned,
          snapRem,
          snapUsed,
          rec.period_year,
          rec.period_month,
          expiry_date != null ? expiry_date : rec.expiry_date,
          ledgerRemark,
          rec.emp_category_snapshot || null,
        ],
        async (errIns, insRes) => {
          if (errIns) return res.status(500).json({ error: errIns.message });
          const newId = insRes.insertId;
          try {
            await logCtoBalanceChange({
              req,
              targetEmp: emp,
              recordId: newId,
              action: "updated",
              period_year: rec.period_year,
              period_month: rec.period_month,
              balBeforeRem: balBefore,
              balAfterRem: snapRem,
              details: {
                source_cto_credit_id: id,
                cto_credit_id: newId,
                ot_hours: snapOt,
                earned_hours: snapEarned,
                used_hours: snapUsed,
                remaining_hours: snapRem,
                expiry_date: expiry_date != null ? expiry_date : rec.expiry_date,
                remarks,
              },
            });
            res.json({
              id: newId,
              ...req.body,
              employeeNumber: emp,
              remaining_hours: snapRem,
            });
          } catch (e) {
            console.error("[cto] PUT audit:", e.message);
            res.status(500).json({ error: "Ledger updated but failed to write audit log" });
          }
        },
      );
    });
  });
});
 
// ─── DELETE /cto/:id ──────────────────────────────────────────────────────────
router.delete('/cto/:id', authenticateToken, requireAdmin, (req, res) => {
  const id = req.params.id;
  db.query('SELECT employeeNumber FROM cto_credit WHERE id = ? LIMIT 1', [id], (e0, rows0) => {
    const emp = !e0 && rows0 && rows0[0] ? rows0[0].employeeNumber : null;
    db.query('DELETE FROM cto_credit WHERE id = ?', [id], async (err, r) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!r.affectedRows) return res.status(404).json({ error: 'Not found' });
      const targetEmp = String(emp || "").trim();
      try {
        await logCtoBalanceChange({
          req,
          targetEmp,
          recordId: id,
          action: "deleted",
          period_year: null,
          period_month: null,
          balBeforeRem: null,
          balAfterRem: null,
          details: { id, source: "cto_credit_delete" },
        });
        res.json({ message: 'Deleted' });
      } catch (e) {
        console.error("[cto] DELETE audit:", e.message);
        res.status(500).json({ error: "Record deleted but failed to write audit log" });
      }
    });
  });
});
 
// ─── POST /cto/:id/action ────────────────────────────────────────────────────
router.post('/cto/:id/action', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { action, hours, date_used, remarks } = req.body;
 
  const VALID_ACTIONS = ['offset', 'use_as_leave', 'forfeit'];
  if (!VALID_ACTIONS.includes(action))
    return res.status(400).json({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` });
 
  db.query('SELECT * FROM cto_credit WHERE id = ?', [id], (err, rows) => {
    if (err)          return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
 
    const rec = rows[0];
    const emp = rec.employeeNumber;

    getCtoCreditRunningTotals(emp, (errSum, cur) => {
      if (errSum) return res.status(500).json({ error: errSum.message });
      const totalRem = cur.remaining;
      const apply = Math.min(parseFloat(hours) || totalRem, Math.max(0, totalRem));
      if (apply <= 0) return res.status(400).json({ error: 'No hours to apply' });

      const snapEarned = cur.earned;
      const snapUsed = cur.used + apply;
      const snapRem = cur.remaining - apply;
      const ledgerRemark = `cto_credit_action:source_row_${id}:${action || 'offset'}`;

      db.query(
        `INSERT INTO cto_credit
          (employeeNumber, ot_hours, earned_hours, remaining_hours, used_hours, period_year, period_month, expiry_date, remarks, emp_category_snapshot)
         VALUES (?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          emp,
          snapEarned,
          snapRem,
          snapUsed,
          rec.period_year,
          rec.period_month,
          rec.expiry_date || null,
          ledgerRemark,
          rec.emp_category_snapshot || null,
        ],
        (errIns, insRes) => {
          if (errIns) return res.status(500).json({ error: errIns.message });
          const newCtoId = insRes.insertId;

          db.query(
            `INSERT INTO cto_usage
             (cto_credit_id, employeeNumber, action, hours_applied, date_used, remarks)
             VALUES (?,?,?,?,?,?)`,
            [newCtoId, emp, action, apply, date_used || null, remarks || null],
            (err3) => { if (err3) console.error('CTO usage insert:', err3); }
          );

          (async () => {
            try {
              await logCtoBalanceChange({
                req,
                targetEmp: emp,
                recordId: newCtoId,
                action: `applied action "${action}" (${toNum(apply).toFixed(3)} hrs deducted)`,
                period_year: rec.period_year,
                period_month: rec.period_month,
                balBeforeRem: totalRem,
                balAfterRem: snapRem,
                details: {
                  source_cto_credit_id: id,
                  cto_credit_id: newCtoId,
                  action,
                  hours_applied: apply,
                  date_used: date_used || null,
                  remarks: remarks || null,
                },
              });
            } catch (e) {
              console.error("[cto] action audit:", e.message);
            }
          })();

          res.json({ message: 'Action applied', hours_applied: apply, remaining_hours: snapRem });
        },
      );
    });
  });
});
 
// ─── POST /cto/:id/commute ─────────────────────────────────────────────────────
// Transfer remaining CTO hours to Leave Commutation (creates leave_commutation row)
router.post('/cto/:id/commute', (req, res) => {
  const { id } = req.params;
  const { commuted_by, remarks } = req.body || {};

  db.query('SELECT * FROM cto_credit WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    const rec = rows[0];
    const emp = rec.employeeNumber;

    getCtoCreditRunningTotals(emp, (errSum, cur) => {
      if (errSum) return res.status(500).json({ error: errSum.message });
      const remHrs = cur.remaining;
      if (remHrs <= 0) return res.status(400).json({ error: 'No remaining hours to commute' });

      const snapEarned = cur.earned;
      const snapUsed = cur.used + remHrs;
      const snapRem = 0;
      const commutedDays = remHrs / 8;

      const insertQuery = `
      INSERT INTO leave_commutation
        (leave_assignment_id, employeeNumber, leave_code, period_year, period_semester,
         commuted_hours, commuted_days, status, commuted_by, commuted_at, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, NOW(), ?)
    `;

      db.query(
        insertQuery,
        [
          null,
          emp,
          'CTO',
          rec.period_year || null,
          rec.period_month || null,
          remHrs,
          commutedDays,
          commuted_by || null,
          remarks || `Transferred CTO (${commutedDays.toFixed(2)} days) to Leave Commutation.`,
        ],
        (insErr, insResult) => {
          if (insErr) return res.status(500).json({ error: 'Failed to create commutation record: ' + insErr.message });

          const ledgerRemark = `cto_credit_commute:source_row_${id}`;
          db.query(
            `INSERT INTO cto_credit
              (employeeNumber, ot_hours, earned_hours, remaining_hours, used_hours, period_year, period_month, expiry_date, remarks, emp_category_snapshot)
             VALUES (?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              emp,
              snapEarned,
              snapRem,
              snapUsed,
              rec.period_year || null,
              rec.period_month || null,
              rec.expiry_date || null,
              ledgerRemark,
              rec.emp_category_snapshot || null,
            ],
            (insScErr, insScRes) => {
              if (insScErr) {
                return res.status(500).json({
                  error: 'Commutation recorded but failed to append CTO ledger: ' + insScErr.message,
                });
              }
              const newCtoId = insScRes.insertId;
              db.query(
                `INSERT INTO cto_usage
                 (cto_credit_id, employeeNumber, action, hours_applied, date_used, remarks)
                 VALUES (?,?,?,?,?,?)`,
                [newCtoId, emp, 'commute', remHrs, null, remarks || null],
                () => {}
              );

              (async () => {
                try {
                  await logCtoBalanceChange({
                    req,
                    targetEmp: emp,
                    recordId: newCtoId,
                    action: `transferred to commutation (${toNum(remHrs).toFixed(3)} hrs)`,
                    period_year: rec.period_year,
                    period_month: rec.period_month,
                    balBeforeRem: remHrs,
                    balAfterRem: snapRem,
                    details: {
                      source_cto_credit_id: id,
                      cto_credit_id: newCtoId,
                      commutation_id: insResult.insertId,
                      commuted_hours: remHrs,
                      commuted_days: commutedDays,
                    },
                  });
                  res.json({
                    message: 'CTO transferred to commutation',
                    commutation_id: insResult.insertId,
                    cto_credit_id: newCtoId,
                    employeeNumber: emp,
                    commuted_hours: remHrs,
                    commuted_days: commutedDays,
                    status: 0,
                  });
                } catch (e) {
                  console.error("[cto] commute audit:", e.message);
                  res.status(500).json({
                    error: 'Commutation recorded but failed to write audit log',
                  });
                }
              })();
            },
          );
        },
      );
    });
  });
});

// ─── GET /cto/:id/usage ───────────────────────────────────────────────────────
router.get('/cto/:id/usage', (req, res) => {
  db.query(
    `SELECT * FROM cto_usage WHERE cto_credit_id = ? ORDER BY processed_at DESC`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});
 
module.exports = router;
 