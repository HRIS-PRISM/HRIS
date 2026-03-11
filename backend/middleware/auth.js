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
  targetEmployeeNumber = null
) {
  const auditQuery = `
    INSERT INTO audit_log (employeeNumber, action, table_name, record_id, targetEmployeeNumber, timestamp)
    VALUES (?, ?, ?, ?, ?, NOW())
  `;

  const timestamp = new Date().toISOString();

  db.query(
    auditQuery,
    [user.employeeNumber, action, tableName, recordId, targetEmployeeNumber],
    (err, result) => {
      if (err) {
        console.error('Error inserting audit log:', err);
        return;
      }

      // Broadcast the new log entry via WebSocket for real-time updates
      broadcastNewAuditLog({
        id: result.insertId,
        employeeNumber: user.employeeNumber,
        action,
        table_name: tableName,
        record_id: recordId,
        targetEmployeeNumber: targetEmployeeNumber || null,
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

module.exports = {
  authenticateToken,
  logAudit,
  insertAuditLog,
};




