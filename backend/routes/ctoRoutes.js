 
const db      = require('../db');
const express = require('express');
const router  = express.Router();
 
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
 
// ─── POST /cto ────────────────────────────────────────────────────────────────
router.post('/cto', (req, res) => {
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
      res.json({ id: result.insertId, ...req.body, remaining_hours: earned, used_hours: 0 });
    }
  );
});
 
// ─── PUT /cto/:id ─────────────────────────────────────────────────────────────
router.put('/cto/:id', (req, res) => {
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
      res.json({ id, ...req.body, remaining_hours: rem });
    }
  );
});
 
// ─── DELETE /cto/:id ──────────────────────────────────────────────────────────
router.delete('/cto/:id', (req, res) => {
  db.query('DELETE FROM cto_credit WHERE id = ?', [req.params.id], (err, r) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!r.affectedRows) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  });
});
 
// ─── POST /cto/:id/action ────────────────────────────────────────────────────
router.post('/cto/:id/action', (req, res) => {
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
 
        res.json({ message: 'Action applied', hours_applied: apply, remaining_hours: newRem });
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
 