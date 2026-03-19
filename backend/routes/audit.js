const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, logAudit } = require('../middleware/auth');

// GET audit logs
router.get('/audit-logs', authenticateToken, (req, res) => {
  const query = `
    SELECT
      al.*,
      TRIM(CONCAT(p1.firstName, ' ', COALESCE(p1.middleName, ''), ' ', p1.lastName)) AS actorName,
      TRIM(CONCAT(p2.firstName, ' ', COALESCE(p2.middleName, ''), ' ', p2.lastName)) AS targetName
    FROM audit_log al
    LEFT JOIN person_table p1 ON p1.agencyEmployeeNum = al.employeeNumber
    LEFT JOIN person_table p2 ON p2.agencyEmployeeNum = al.targetEmployeeNumber
    ORDER BY al.timestamp DESC
  `;
  db.query(query, (err, result) => {
    if (err) {
      console.error('Error fetching audit logs:', err);
      return res.status(500).json({ error: 'Failed to fetch audit logs' });
    }

    try {
      logAudit(req.user, 'View', 'audit_log', null, null);
    } catch (e) {
      console.error('Audit log error:', e);
    }

    res.json(result);
  });
});

// DELETE audit log
router.delete('/audit-logs/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userRole = req.user?.role;

  // Only allow administrators and superadmins to delete audit logs
  if (userRole !== 'administrator' && userRole !== 'superadmin' && userRole !== 'technical') {
    return res.status(403).json({ error: 'Unauthorized: Only administrators can delete audit logs' });
  }

  const query = 'DELETE FROM audit_log WHERE id = ?';
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error deleting audit log:', err);
      return res.status(500).json({ error: 'Failed to delete audit log' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    try {
      logAudit(req.user, 'Delete', 'audit_log', id, null);
    } catch (e) {
      console.error('Audit log error:', e);
    }

    res.json({ message: 'Audit log deleted successfully' });
  });
});

module.exports = router;




