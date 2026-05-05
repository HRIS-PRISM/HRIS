 
const db      = require('../db');
const express = require('express');
const router  = express.Router();
const { getServiceCreditRunningTotals } = require('../services/serviceCreditRunningTotals');
 
// ─── GET /ot-types ────────────────────────────────────────────────────────────
router.get('/ot-types', (req, res) => {
  db.query(
    `SELECT id, name, description, multiplier, sort_order
     FROM ot_type
     WHERE is_active = 1
     ORDER BY sort_order ASC, name ASC`,
    (err, rows) => {
      if (err) {
        // Table might not exist yet — return empty so frontend uses defaults
        console.warn('ot_type table not ready, returning empty:', err.message);
        return res.json([]);
      }
      res.json(rows);
    }
  );
});
 
// ─── GET /service_credit ─────────────────────────────────────────────────────
router.get('/service_credit', (req, res) => {
  const q = `
    SELECT sc.*,
           CONCAT(p.firstName, ' ', p.lastName) AS fullName,
           p.firstName, p.lastName
    FROM service_credit sc
    LEFT JOIN users u         ON u.employeeNumber        = sc.employeeNumber
    LEFT JOIN person_table p  ON p.agencyEmployeeNum     = sc.employeeNumber
    ORDER BY sc.period_year DESC, sc.period_month DESC, sc.id DESC
  `;
  db.query(q, (err, rows) => {
    if (err) {
      console.error('service_credit GET error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});
 
// ─── POST /service_credit ─────────────────────────────────────────────────────
router.post('/service_credit', (req, res) => {
  const {
    employeeNumber,
    sc_type,
    ot_hours_regular,
    ot_hours_holiday,
    ot_hours_night_diff,
    total_ot_hours,
    earned_hours,
    remaining_hours,
    used_hours,
    period_year,
    period_month,
    remarks,
    emp_category_snapshot,
  } = req.body;

  const q = `
    INSERT INTO service_credit
    (
      employeeNumber,
      sc_type,
      ot_hours_regular,
      ot_hours_holiday,
      ot_hours_night_diff,
      total_ot_hours,
      earned_hours,
      remaining_hours,
      used_hours,
      period_year,
      period_month,
      remarks,
      emp_category_snapshot
    )
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `;

  const values = [
    employeeNumber,
    sc_type || 'non_commutative',
    parseFloat(ot_hours_regular) || 0,
    parseFloat(ot_hours_holiday) || 0,
    parseFloat(ot_hours_night_diff) || 0,
    parseFloat(total_ot_hours) || 0,
    parseFloat(earned_hours) || 0,
    parseFloat(remaining_hours ?? earned_hours) || 0,
    parseFloat(used_hours) || 0,
    parseInt(period_year, 10) || null,
    period_month || null,
    remarks || null,
    emp_category_snapshot || null,
  ];

  db.query(q, values, (err, result) => {
    if (err) {
      console.error('service_credit POST error:', err);
      return res.status(500).json({ error: err.message });
    }

    res.json({ id: result.insertId, ...req.body });
  });
});
 
// ─── PUT /service_credit/:id ──────────────────────────────────────────────────
router.put('/service_credit/:id', (req, res) => {
  const { id } = req.params;
  const { earned_hours, total_ot_hours, used_hours, remarks, sc_type } = req.body;
  const rem = Math.max(0, (parseFloat(earned_hours) || 0) - (parseFloat(used_hours) || 0));
 
  db.query(
    `UPDATE service_credit
     SET earned_hours   = ?,
         total_ot_hours = ?,
         remaining_hours= ?,
         used_hours     = ?,
         remarks        = ?,
         sc_type        = COALESCE(?, sc_type)
     WHERE id = ?`,
    [
      parseFloat(earned_hours)    || 0,
      parseFloat(total_ot_hours)  || 0,
      rem,
      parseFloat(used_hours)      || 0,
      remarks                     || null,
      sc_type                     || null,
      id,
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
      res.json({ id, ...req.body, remaining_hours: rem });
    }
  );
});
 
// ─── DELETE /service_credit/:id ───────────────────────────────────────────────
router.delete('/service_credit/:id', (req, res) => {
  db.query('DELETE FROM service_credit WHERE id = ?', [req.params.id], (err, r) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!r.affectedRows) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  });
});
 
// ─── POST /service_credit/:id/action ──────────────────────────────────────────
router.post('/service_credit/:id/action', (req, res) => {
  const { id } = req.params;
  const { action, hours, targetLeaveCode } = req.body;
 
  db.query('SELECT * FROM service_credit WHERE id = ?', [id], (err, rows) => {
    if (err)          return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
 
    const rec    = rows[0];
    const scType = rec.sc_type || 'non_commutative';
    const emp    = rec.employeeNumber;

    getServiceCreditRunningTotals(emp, scType, (errSum, cur) => {
      if (errSum) return res.status(500).json({ error: errSum.message });
      const totalRem = cur.remaining;
      const apply    = Math.min(parseFloat(hours) || totalRem, Math.max(0, totalRem));
      if (apply <= 0) return res.status(400).json({ error: 'No hours to apply' });

      const snapEarned = cur.earned;
      const snapUsed   = cur.used + apply;
      const snapRem    = cur.remaining - apply;
      const remarks =
        `service_credit_action:source_row_${id}:${action || 'offset'}`;

      db.query(
        `INSERT INTO service_credit
          (employeeNumber, sc_type, ot_hours_regular, ot_hours_holiday, ot_hours_night_diff, total_ot_hours,
           earned_hours, remaining_hours, used_hours, period_year, period_month, remarks, emp_category_snapshot)
         VALUES (?, ?, 0, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?)`,
        [
          emp,
          scType,
          snapEarned,
          snapRem,
          snapUsed,
          rec.period_year,
          rec.period_month,
          remarks,
          rec.emp_category_snapshot || null,
        ],
        (errIns, insRes) => {
          if (errIns) return res.status(500).json({ error: errIns.message });
          const newScId = insRes.insertId;

          db.query(
            `INSERT INTO service_credit_usage
             (service_credit_id, employeeNumber, action, hours_applied, target_leave_code)
             VALUES (?,?,?,?,?)`,
            [newScId, emp, action, apply, targetLeaveCode || null],
            (err3) => { if (err3) console.error('SC audit log error:', err3); }
          );

          if ((action === 'convert_to_sl' || action === 'convert_to_vl') && targetLeaveCode) {
            db.query(
              `SELECT id, remaining_hours FROM leave_assignment
               WHERE employeeNumber = ? AND leave_code = ?
               ORDER BY period_year DESC, id DESC LIMIT 1`,
              [emp, targetLeaveCode],
              (err4, laRows) => {
                if (!err4 && laRows.length) {
                  const la       = laRows[0];
                  const newLARem = (parseFloat(la.remaining_hours) || 0) + apply;
                  db.query(
                    'UPDATE leave_assignment SET remaining_hours = ?, total_hours = total_hours + ? WHERE id = ?',
                    [newLARem, apply, la.id],
                    (err5) => { if (err5) console.error('LA update error:', err5); }
                  );
                }
              }
            );
          }

          res.json({ message: 'Action applied', hours_applied: apply, remaining_hours: snapRem });
        }
      );
    });
  });
});
 
// ─── POST /service_credit/:id/commute ─────────────────────────────────────────
// Transfer remaining SC hours to Leave Commutation (creates leave_commutation row)
router.post('/service_credit/:id/commute', (req, res) => {
  const { id } = req.params;
  const { commuted_by, remarks } = req.body || {};

  db.query('SELECT * FROM service_credit WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    const rec = rows[0];
    const scType = rec.sc_type || 'non_commutative';
    const emp = rec.employeeNumber;

    getServiceCreditRunningTotals(emp, scType, (errSum, cur) => {
      if (errSum) return res.status(500).json({ error: errSum.message });
      const remHrs = cur.remaining;
      if (remHrs <= 0) return res.status(400).json({ error: 'No remaining hours to commute' });

      const snapEarned = cur.earned;
      const snapUsed   = cur.used + remHrs;
      const snapRem    = 0;
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
          'SC',
          rec.period_year || null,
          rec.period_month || null,
          remHrs,
          commutedDays,
          commuted_by || null,
          remarks || `Transferred SC (${commutedDays.toFixed(2)} days) to Leave Commutation.`,
        ],
        (insErr, insResult) => {
          if (insErr) return res.status(500).json({ error: 'Failed to create commutation record: ' + insErr.message });

          const ledgerRemark = `service_credit_commute:source_row_${id}`;
          db.query(
            `INSERT INTO service_credit
              (employeeNumber, sc_type, ot_hours_regular, ot_hours_holiday, ot_hours_night_diff, total_ot_hours,
               earned_hours, remaining_hours, used_hours, period_year, period_month, remarks, emp_category_snapshot)
             VALUES (?, ?, 0, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?)`,
            [
              emp,
              scType,
              snapEarned,
              snapRem,
              snapUsed,
              rec.period_year || null,
              rec.period_month || null,
              ledgerRemark,
              rec.emp_category_snapshot || null,
            ],
            (insScErr, insScRes) => {
              if (insScErr) {
                return res.status(500).json({
                  error: 'Commutation recorded but failed to append SC ledger: ' + insScErr.message,
                });
              }
              const newScId = insScRes.insertId;
              db.query(
                `INSERT INTO service_credit_usage
                 (service_credit_id, employeeNumber, action, hours_applied, target_leave_code)
                 VALUES (?,?,?,?,?)`,
                [newScId, emp, 'commute', remHrs, null],
                () => {}
              );

              res.json({
                message: 'Service Credit transferred to commutation',
                commutation_id: insResult.insertId,
                service_credit_id: newScId,
                employeeNumber: emp,
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
});

module.exports = router;