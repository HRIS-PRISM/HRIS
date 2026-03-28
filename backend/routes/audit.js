const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, logAudit } = require('../middleware/auth');

const AUDIT_LOGS_COMPONENT_IDENTIFIER = 'audit-logs';

const canAccessAuditLogs = (req, callback) => {
  const role = String(req.user?.role || '').toLowerCase();
  const employeeNumber = String(req.user?.employeeNumber || '').trim();

  if (role === 'superadmin' || role === 'technical') {
    return callback(null, true);
  }

  if (role !== 'administrator' || !employeeNumber) {
    return callback(null, false);
  }

  const pageQuery =
    'SELECT id FROM pages WHERE component_identifier = ? LIMIT 1';

  db.query(pageQuery, [AUDIT_LOGS_COMPONENT_IDENTIFIER], (pageErr, pageRows) => {
    if (pageErr) return callback(pageErr, false);
    if (!Array.isArray(pageRows) || pageRows.length === 0) {
      return callback(null, false);
    }

    const pageId = pageRows[0].id;
    const accessQuery = `
      SELECT 1
      FROM page_access
      WHERE employeeNumber = ?
        AND page_id = ?
        AND COALESCE(page_privilege, '') NOT IN ('', '0')
      LIMIT 1
    `;

    db.query(accessQuery, [employeeNumber, pageId], (accessErr, accessRows) => {
      if (accessErr) return callback(accessErr, false);
      return callback(null, Array.isArray(accessRows) && accessRows.length > 0);
    });
  });
};

// GET audit logs
router.get('/audit-logs', authenticateToken, (req, res) => {
  canAccessAuditLogs(req, (accessErr, hasAccess) => {
    if (accessErr) {
      console.error('Error checking audit log access:', accessErr);
      return res.status(500).json({ error: 'Failed to verify audit log access' });
    }

    if (!hasAccess) {
      return res.status(403).json({
        error:
          'Unauthorized: only superadmin/technical or administrators with page access can view audit logs',
      });
    }

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
});

// DELETE audit log
router.delete('/audit-logs/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  canAccessAuditLogs(req, (accessErr, hasAccess) => {
    if (accessErr) {
      console.error('Error checking audit log delete access:', accessErr);
      return res
        .status(500)
        .json({ error: 'Failed to verify audit log delete access' });
    }

    if (!hasAccess) {
      return res.status(403).json({
        error:
          'Unauthorized: only superadmin/technical or administrators with page access can delete audit logs',
      });
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
});

module.exports = router;




