const jwt = require('jsonwebtoken');
const db = require('../db');
const { broadcastNewAuditLog } = require('../socket/socketService');
const { PAGE_ACCESS_ACTIVE_SQL } = require('../utils/pageAccess');

const ADMIN_ROLES = ['admin', 'administrator', 'superadmin', 'technical'];
const SUPERADMIN_ROLES = ['superadmin', 'technical'];
const TECHNICAL_ROLES = ['technical'];

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

function requireRoles(...roles) {
  const allowed = roles.flat();
  return (req, res, next) => {
    const role = String(req.user?.role || '').toLowerCase();
    if (req.user && allowed.includes(role)) {
      next();
    } else {
      res.status(403).json({ error: 'Insufficient permissions' });
    }
  };
}

function requireAdmin(req, res, next) {
  const role = String(req.user?.role || '').toLowerCase();
  if (req.user && ADMIN_ROLES.includes(role)) {
    next();
  } else {
    res.status(403).json({ error: 'Insufficient permissions' });
  }
}

function requireSuperAdmin(req, res, next) {
  const role = String(req.user?.role || '').toLowerCase();
  if (req.user && SUPERADMIN_ROLES.includes(role)) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Superadmin role required.' });
  }
}

function requireTechnical(req, res, next) {
  const role = String(req.user?.role || '').toLowerCase();
  if (req.user && TECHNICAL_ROLES.includes(role)) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Technical role required.' });
  }
}

function requireSelfOrAdmin(paramName = 'employeeNumber') {
  return (req, res, next) => {
    const target =
      req.params[paramName] ||
      req.body?.[paramName] ||
      req.query?.[paramName];
    const caller = String(req.user?.employeeNumber || '').trim();
    const role = String(req.user?.role || '').toLowerCase();

    if (ADMIN_ROLES.includes(role)) {
      return next();
    }

    if (target && caller && String(target).trim() === caller) {
      return next();
    }

    return res.status(403).json({ error: 'Access denied' });
  };
}

function isAdminRole(role) {
  return ADMIN_ROLES.includes(String(role || '').toLowerCase());
}

function scopeEmployeeNumberFromUser(req) {
  if (isAdminRole(req.user?.role)) {
    return null;
  }
  return String(req.user?.employeeNumber || '').trim() || null;
}

/** Supervisor workflow: JWT user must match supervisorEmployeeNumber param/body (admins bypass). */
function requireSupervisorSelfOrAdmin(paramName = 'supervisorEmployeeNumber') {
  return (req, res, next) => {
    const role = String(req.user?.role || '').toLowerCase();
    if (ADMIN_ROLES.includes(role)) {
      return next();
    }

    const target =
      req.params[paramName] ||
      req.body?.[paramName] ||
      req.query?.[paramName];
    const caller = String(req.user?.employeeNumber || '').trim();

    if (target && caller && String(target).trim() === caller) {
      return next();
    }

    return res.status(403).json({ error: 'Access denied' });
  };
}

function requirePageAccess(componentIdentifier) {
  return (req, res, next) => {
    const role = String(req.user?.role || '').toLowerCase();
    const employeeNumber = String(req.user?.employeeNumber || '').trim();

    if (role === 'superadmin' || role === 'technical') {
      return next();
    }

    if (role !== 'administrator' && role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (!employeeNumber) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const pageQuery =
      'SELECT id FROM pages WHERE component_identifier = ? LIMIT 1';

    db.query(pageQuery, [componentIdentifier], (pageErr, pageRows) => {
      if (pageErr) {
        console.error('Error checking page access:', pageErr);
        return res.status(500).json({ error: 'Failed to verify page access' });
      }
      if (!Array.isArray(pageRows) || pageRows.length === 0) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const pageId = pageRows[0].id;
      const accessQuery = `
        SELECT 1
        FROM page_access pa
        WHERE pa.employeeNumber = ?
          AND pa.page_id = ?
          AND ${PAGE_ACCESS_ACTIVE_SQL}
        LIMIT 1
      `;

      db.query(accessQuery, [employeeNumber, pageId], (accessErr, accessRows) => {
        if (accessErr) {
          console.error('Error checking page access:', accessErr);
          return res.status(500).json({ error: 'Failed to verify page access' });
        }
        if (Array.isArray(accessRows) && accessRows.length > 0) {
          return next();
        }
        return res.status(403).json({ error: 'Insufficient permissions' });
      });
    });
  };
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

  let safeRecordId = null;
  if (recordId !== undefined && recordId !== null && recordId !== '') {
    const n =
      typeof recordId === 'bigint' ? Number(recordId) : parseInt(recordId, 10);
    if (Number.isFinite(n) && n > 0) safeRecordId = n;
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
      safeRecordId,
      targetEmployeeNumber,
      detailsJson,
    ],
    (err, result) => {
      if (err) {
        console.error('Error inserting audit log:', err);
        return;
      }

      broadcastNewAuditLog({
        id: result.insertId,
        employeeNumber,
        action,
        table_name: tableName,
        record_id: safeRecordId,
        targetEmployeeNumber: targetEmployeeNumber || null,
        details_json: detailsJson,
        timestamp,
      });
    },
  );
}

function insertAuditLog(employeeNumber, action) {
  const sql = `INSERT INTO audit_log (employeeNumber, action) VALUES (?, ?)`;
  db.query(sql, [employeeNumber, action], (err) => {
    if (err) {
      console.error('Error inserting audit log:', err);
    }
  });
}

module.exports = {
  authenticateToken,
  requireRoles,
  requireAdmin,
  requireSuperAdmin,
  requireTechnical,
  requireSelfOrAdmin,
  requireSupervisorSelfOrAdmin,
  requirePageAccess,
  isAdminRole,
  scopeEmployeeNumberFromUser,
  logAudit,
  insertAuditLog,
  ADMIN_ROLES,
  SUPERADMIN_ROLES,
};
