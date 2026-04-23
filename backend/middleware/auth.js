const jwt = require('jsonwebtoken');
const db = require('../db');
const { broadcastNewAuditLog } = require('../socket/socketService');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

function logAudit(
  user,
  action,
  tableName,
  recordId,
  targetEmployeeNumber = null,
  details = null,
) {
  const auditQuery = `
    INSERT INTO audit_log (employeeNumber, action, table_name, record_id, targetEmployeeNumber, details_json, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
  `;

  const employeeNumber =
    user && typeof user === 'object' && user.employeeNumber
      ? user.employeeNumber
      : user || null;

  // Guard against NOT NULL violations on audit_log.employeeNumber.
  // If actor identity is missing, skip audit insert instead of throwing SQL errors.
  if (!employeeNumber) {
    console.warn(
      `[audit] Skipping audit log for action "${action}" because employeeNumber is missing.`
    );
    return;
  }

  let detailsJson = null;
  if (details != null) {
    if (typeof details === 'string') {
      detailsJson = details;
    } else {
      try {
        detailsJson = JSON.stringify(details);
      } catch (e) {
        detailsJson = JSON.stringify({
          error: 'Failed to serialize audit details',
        });
      }
    }
  }

  const timestamp = new Date().toISOString();

  db.query(
    auditQuery,
    [
      employeeNumber,
      action,
      tableName,
      recordId,
      targetEmployeeNumber,
      detailsJson,
    ],
    (err, result) => {
      if (err) {
        console.error('Error inserting audit log:', err);
        return;
      }

      // Broadcast the new log entry via WebSocket for real-time updates
      broadcastNewAuditLog({
        id: result.insertId,
        employeeNumber,
        action,
        table_name: tableName,
        record_id: recordId,
        targetEmployeeNumber: targetEmployeeNumber || null,
        details_json: detailsJson,
        timestamp,
      });
    }
  );
}

function insertAuditLog(employeeNumber, action) {
  const sql = `INSERT INTO audit_log (employeeNumber, action) VALUES (?, ?)`;
  db.query(sql, [employeeNumber, action], (err, result) => {
    if (err) {
      console.error('Error inserting audit log:', err);
    }
  });
}

function requireAdmin(req, res, next) {
  const allowedRoles = ['admin', 'administrator', 'superadmin', 'technical'];
  if (req.user && allowedRoles.includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ error: 'Insufficient permissions' });
  }
}

module.exports = {
  authenticateToken,
  logAudit,
  insertAuditLog,
  requireAdmin,
};




