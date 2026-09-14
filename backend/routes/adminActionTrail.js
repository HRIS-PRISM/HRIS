const express = require('express');
const router = express.Router();
const db = require('../db');
const {
  authenticateToken,
  requireSuperAdmin,
} = require('../middleware/auth');

/**
 * GET /admin-action-trail
 * Superadmin + technical only. Read-only trail of admin/superadmin actions.
 * Query: action, table_name|module, employeeNumber, actor_role, dateFrom, dateTo
 */
router.get(
  '/admin-action-trail',
  authenticateToken,
  requireSuperAdmin,
  (req, res) => {
    const {
      action,
      table_name,
      module: moduleName,
      employeeNumber,
      actor_role,
      dateFrom,
      dateTo,
    } = req.query;

    const conditions = [];
    const params = [];

    if (action && String(action).trim()) {
      conditions.push('aat.action LIKE ?');
      params.push(`%${String(action).trim()}%`);
    }

    const tableFilter = table_name || moduleName;
    if (tableFilter && String(tableFilter).trim()) {
      conditions.push('aat.table_name LIKE ?');
      params.push(`%${String(tableFilter).trim()}%`);
    }

    if (employeeNumber && String(employeeNumber).trim()) {
      conditions.push('aat.employeeNumber LIKE ?');
      params.push(`%${String(employeeNumber).trim()}%`);
    }

    if (actor_role && String(actor_role).trim()) {
      conditions.push('LOWER(aat.actor_role) = ?');
      params.push(String(actor_role).trim().toLowerCase());
    }

    if (dateFrom && String(dateFrom).trim()) {
      conditions.push('DATE(aat.timestamp) >= ?');
      params.push(String(dateFrom).trim());
    }

    if (dateTo && String(dateTo).trim()) {
      conditions.push('DATE(aat.timestamp) <= ?');
      params.push(String(dateTo).trim());
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        aat.*,
        TRIM(CONCAT(p1.firstName, ' ', COALESCE(p1.middleName, ''), ' ', p1.lastName)) AS actorName,
        TRIM(CONCAT(p2.firstName, ' ', COALESCE(p2.middleName, ''), ' ', p2.lastName)) AS targetName
      FROM admin_action_trail aat
      LEFT JOIN person_table p1 ON p1.agencyEmployeeNum = aat.employeeNumber
      LEFT JOIN person_table p2 ON p2.agencyEmployeeNum = aat.targetEmployeeNumber
      ${whereClause}
      ORDER BY aat.timestamp DESC
      LIMIT 5000
    `;

    db.query(query, params, (err, result) => {
      if (err) {
        console.error('Error fetching admin action trail:', err);
        return res
          .status(500)
          .json({ error: 'Failed to fetch admin action trail' });
      }
      res.json(result);
    });
  },
);

module.exports = router;
