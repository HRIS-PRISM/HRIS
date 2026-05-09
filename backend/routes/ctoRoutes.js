 
const db      = require('../db');
const express = require('express');
const router  = express.Router();
const { authenticateToken, requireAdmin, logAudit } = require('../middleware/auth');

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

const auditCto = ({ req, action, recordId, targetEmployeeNumber, details }) => {
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
    employeeNumber, ot_hours, earned_hours,
    period_year, period_month, expiry_date,
    remarks, emp_category_snapshot,
  } = req.body;
 
  const earned = parseFloat(earned_hours ?? ot_hours) || 0;
 
  db.query(
    `INSERT INTO cto_credit
     (employeeNumber, ot_hours, earned_hours, remaining_hours, used_hours,
      period_year, period_month, expiry_date, remarks, emp_category_snapshot)
     VALUES (?,?,?,?,0,?,?,?,?,?)`,
    [
      employeeNumber,
      parseFloat(ot_hours) || 0,
      earned,
      earned,                                // remaining = earned at creation
      parseInt(period_year, 10) || null,
      period_month || null,
      expiry_date  || null,
      remarks      || null,
      emp_category_snapshot || null,
    ],
    (err, result) => {
      if (err) {
        console.error('cto POST error:', err);
        return res.status(500).json({ error: err.message });
      }
      (async () => {
        const actorEmp = getActorEmpNum(req);
        const emp = String(employeeNumber || "").trim();
        const [actorName, targetName] = await Promise.all([
          getEmployeeFullName(actorEmp),
          getEmployeeFullName(emp),
        ]);
        const actorDisplay = formatUserDisplayName(actorEmp, actorName);
        const targetDisplay = formatUserDisplayName(emp, targetName);
        const msg = `${actorDisplay} assigned Compensatory Time Off (${toNum(earned).toFixed(3)} hrs) to ${targetDisplay} for period ${fmtPeriod(period_year, period_month)}.`;
        await insertTransactionLog(emp, msg);
        auditCto({
          req,
          action: "Create",
          recordId: result.insertId,
          targetEmployeeNumber: emp,
          details: { employeeNumber: emp, ot_hours, earned_hours: earned, period_year, period_month, expiry_date, remarks },
        });
      })();
      res.json({ id: result.insertId, ...req.body, remaining_hours: earned, used_hours: 0 });
    }
  );
});
 
// ─── PUT /cto/:id ─────────────────────────────────────────────────────────────
router.put('/cto/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { ot_hours, earned_hours, used_hours, expiry_date, remarks } = req.body;
  const earned = parseFloat(earned_hours) || 0;
  const used   = parseFloat(used_hours)   || 0;
  const rem    = Math.max(0, earned - used);
 
  db.query(
    `UPDATE cto_credit
     SET ot_hours       = ?,
         earned_hours   = ?,
         remaining_hours= ?,
         used_hours     = ?,
         expiry_date    = ?,
         remarks        = ?
     WHERE id = ?`,
    [
      parseFloat(ot_hours) || 0,
      earned, rem, used,
      expiry_date || null,
      remarks     || null,
      id,
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
      (async () => {
        const actorEmp = getActorEmpNum(req);
        const targetEmp = String(req.body.employeeNumber || req.body.employee_number || "").trim();
        const [actorName, targetName] = await Promise.all([
          getEmployeeFullName(actorEmp),
          getEmployeeFullName(targetEmp),
        ]);
        const actorDisplay = formatUserDisplayName(actorEmp, actorName);
        const targetDisplay = formatUserDisplayName(targetEmp, targetName);
        const msg = `${actorDisplay} updated Compensatory Time Off (record #${id}) for ${targetDisplay} for period ${fmtPeriod(req.body.period_year, req.body.period_month)}.`;
        await insertTransactionLog(targetEmp, msg);
        auditCto({
          req,
          action: "Update",
          recordId: id,
          targetEmployeeNumber: targetEmp,
          details: { id, ot_hours, earned_hours: earned, used_hours: used, remaining_hours: rem, expiry_date, remarks },
        });
      })();
      res.json({ id, ...req.body, remaining_hours: rem });
    }
  );
});
 
// ─── DELETE /cto/:id ──────────────────────────────────────────────────────────
router.delete('/cto/:id', authenticateToken, requireAdmin, (req, res) => {
  const id = req.params.id;
  db.query('SELECT employeeNumber FROM cto_credit WHERE id = ? LIMIT 1', [id], (e0, rows0) => {
    const emp = !e0 && rows0 && rows0[0] ? rows0[0].employeeNumber : null;
    db.query('DELETE FROM cto_credit WHERE id = ?', [id], (err, r) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!r.affectedRows) return res.status(404).json({ error: 'Not found' });
      (async () => {
        const actorEmp = getActorEmpNum(req);
        const targetEmp = String(emp || "").trim();
        const [actorName, targetName] = await Promise.all([
          getEmployeeFullName(actorEmp),
          getEmployeeFullName(targetEmp),
        ]);
        const actorDisplay = formatUserDisplayName(actorEmp, actorName);
        const targetDisplay = formatUserDisplayName(targetEmp, targetName);
        const msg = `${actorDisplay} deleted Compensatory Time Off (record #${id}) for ${targetDisplay}.`;
        await insertTransactionLog(targetEmp, msg);
        auditCto({ req, action: "Delete", recordId: id, targetEmployeeNumber: emp, details: { id } });
      })();
      res.json({ message: 'Deleted' });
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
 
    const rec    = rows[0];
    const remHrs = parseFloat(rec.remaining_hours) || 0;
    const apply  = Math.min(parseFloat(hours) || remHrs, remHrs);
    if (apply <= 0) return res.status(400).json({ error: 'No hours to apply' });
 
    const newRem  = Math.max(0, remHrs - apply);
    const newUsed = (parseFloat(rec.used_hours) || 0) + apply;
 
    db.query(
      'UPDATE cto_credit SET remaining_hours = ?, used_hours = ? WHERE id = ?',
      [newRem, newUsed, id],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
 
        // Audit log
        db.query(
          `INSERT INTO cto_usage
           (cto_credit_id, employeeNumber, action, hours_applied, date_used, remarks)
           VALUES (?,?,?,?,?,?)`,
          [id, rec.employeeNumber, action, apply, date_used || null, remarks || null],
          (err3) => { if (err3) console.error('CTO audit log error:', err3); }
        );
        (async () => {
          const actorEmp = getActorEmpNum(req);
          const [actorName, targetName] = await Promise.all([
            getEmployeeFullName(actorEmp),
            getEmployeeFullName(rec.employeeNumber),
          ]);
          const actorDisplay = formatUserDisplayName(actorEmp, actorName);
          const targetDisplay = formatUserDisplayName(rec.employeeNumber, targetName);
          const msg = `${actorDisplay} applied CTO action "${action}" (${toNum(apply).toFixed(3)} hrs) to ${targetDisplay} (record #${id}) for period ${fmtPeriod(rec.period_year, rec.period_month)}.`;
          await insertTransactionLog(rec.employeeNumber, msg);
          auditCto({
            req,
            action: "Action",
            recordId: id,
            targetEmployeeNumber: rec.employeeNumber,
            details: { action, hours_applied: apply, date_used: date_used || null, remarks: remarks || null },
          });
        })();
 
        res.json({ message: 'Action applied', hours_applied: apply, remaining_hours: newRem });
      }
    );
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
    const remHrs = parseFloat(rec.remaining_hours) || 0;
    if (remHrs <= 0) return res.status(400).json({ error: 'No remaining hours to commute' });

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
        rec.employeeNumber,
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

        const newUsed = (parseFloat(rec.used_hours) || 0) + remHrs;
        db.query(
          'UPDATE cto_credit SET remaining_hours = 0, used_hours = ? WHERE id = ?',
          [newUsed, id],
          (upErr) => {
            if (upErr) return res.status(500).json({ error: 'Commutation recorded but failed to zero out CTO: ' + upErr.message });

            // Best-effort audit trail (cto_usage)
            db.query(
              `INSERT INTO cto_usage
               (cto_credit_id, employeeNumber, action, hours_applied, date_used, remarks)
               VALUES (?,?,?,?,?,?)`,
              [id, rec.employeeNumber, 'commute', remHrs, null, remarks || null],
              () => {}
            );
            (async () => {
              const actorEmp = getActorEmpNum(req);
              const [actorName, targetName] = await Promise.all([
                getEmployeeFullName(actorEmp),
                getEmployeeFullName(rec.employeeNumber),
              ]);
              const actorDisplay = formatUserDisplayName(actorEmp, actorName);
              const targetDisplay = formatUserDisplayName(rec.employeeNumber, targetName);
              const msg = `${actorDisplay} transferred Compensatory Time Off (${toNum(remHrs).toFixed(3)} hrs) to Commutation for ${targetDisplay} (record #${id}) for period ${fmtPeriod(rec.period_year, rec.period_month)}.`;
              await insertTransactionLog(rec.employeeNumber, msg);
              auditCto({
                req,
                action: "Commute",
                recordId: id,
                targetEmployeeNumber: rec.employeeNumber,
                details: { commuted_hours: remHrs, commuted_days: commutedDays, remarks: remarks || null },
              });
            })();

            res.json({
              message: 'CTO transferred to commutation',
              commutation_id: insResult.insertId,
              cto_credit_id: rec.id,
              employeeNumber: rec.employeeNumber,
              commuted_hours: remHrs,
              commuted_days: commutedDays,
              status: 0,
            });
          }
        );
      }
    );
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
 