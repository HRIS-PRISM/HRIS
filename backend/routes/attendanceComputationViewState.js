const express = require('express');
const router = express.Router();
const db = require('../db');
const {
  authenticateToken,
  requireAdmin,
  logAudit,
} = require('../middleware/auth');

// POST /api/attendance-computation-view-state
// Body: { employeeNumber, periodStart, periodEnd, selectedComputationType }
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { employeeNumber, periodStart, periodEnd, selectedComputationType } =
    req.body;
  const selectedBy =
    req.user && (req.user.employeeNumber || req.user.username)
      ? req.user.employeeNumber || req.user.username
      : null;

  if (
    !employeeNumber ||
    !periodStart ||
    !periodEnd ||
    !selectedComputationType
  ) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const sql = `
    INSERT INTO attendance_computation_view_state
      (employee_number, period_start, period_end, selected_computation_type, selected_by, selected_at)
    VALUES (?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      selected_computation_type = VALUES(selected_computation_type),
      selected_by = VALUES(selected_by),
      updated_at = NOW();
  `;

  db.query(
    sql,
    [
      String(employeeNumber),
      periodStart,
      periodEnd,
      String(selectedComputationType),
      selectedBy,
    ],
    (err, result) => {
      if (err) {
        console.error(
          'Error upserting attendance_computation_view_state:',
          err,
        );
        return res.status(500).json({ error: err.message });
      }

      if (req.body.auditButton) {
        try {
          const details = {
            button: req.body.auditButton,
            actor_employeeNumber: req.user?.employeeNumber ?? null,
            target_employeeNumber: String(employeeNumber),
            target_name: req.body.targetEmployeeName || null,
            period_start: periodStart,
            period_end: periodEnd,
            month_label: req.body.monthLabel || null,
            computation_type: selectedComputationType,
            when: new Date().toISOString(),
          };
          logAudit(
            req.user,
            req.body.auditButton,
            'Attendance Device',
            `${periodStart} to ${periodEnd}`,
            String(employeeNumber),
            details,
          );
        } catch (e) {
          console.error('audit log failed', e);
        }
      }

      res.json({ ok: true, changedRows: result.affectedRows });
    },
  );
});

// GET /api/attendance-computation-view-state?employeeNumber=...&periodStart=...&periodEnd=...
router.get('/', authenticateToken, (req, res) => {
  const { employeeNumber, periodStart, periodEnd } = req.query;
  if (!employeeNumber || !periodStart || !periodEnd)
    return res.status(400).json({ error: 'Missing required query params' });

  const sql = `SELECT * FROM attendance_computation_view_state WHERE employee_number = ? AND period_start = ? AND period_end = ? LIMIT 1`;
  db.query(
    sql,
    [String(employeeNumber), periodStart, periodEnd],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const row = rows && rows[0] ? rows[0] : null;
      res.json({
        row,
        selectedComputationType: row?.selected_computation_type ?? null,
      });
    },
  );
});

module.exports = router;
