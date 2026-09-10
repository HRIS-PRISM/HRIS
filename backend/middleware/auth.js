const jwt = require('jsonwebtoken');
const db = require('../db');
const {
  broadcastNewAuditLog,
  broadcastNewAdminActionTrail,
} = require('../socket/socketService');
const { PAGE_ACCESS_ACTIVE_SQL } = require('../utils/pageAccess');
const {
  resolveCanonicalEmployeeNumber,
  fetchSupervisorDepartments,
  empMatchSql,
  bindEmpMatchParams,
} = require('../utils/supervisorPageAccess');

const ADMIN_ROLES = ['admin', 'administrator', 'superadmin', 'technical'];
const SUPERADMIN_ROLES = ['superadmin', 'technical'];
const TECHNICAL_ROLES = ['technical'];
/** Roles whose actions are written to admin_action_trail (excludes technical). */
const TRAILED_ADMIN_ROLES = ['superadmin', 'administrator', 'admin'];

/** Short TTL cache so every API call does not re-hit users + canonical emp lookup. */
const ENRICH_TTL_MS = Math.max(
  5_000,
  parseInt(process.env.AUTH_ENRICH_TTL_MS || '60000', 10) || 60_000,
);
const enrichCache = new Map(); // key -> { expiresAt, value }

function enrichCacheKey(user) {
  if (user?.id != null) return `id:${user.id}`;
  if (user?.employeeNumber) return `emp:${String(user.employeeNumber).trim()}`;
  return null;
}

function getCachedEnrich(key) {
  const hit = enrichCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    enrichCache.delete(key);
    return null;
  }
  return hit.value;
}

function setCachedEnrich(key, value) {
  if (!key) return;
  enrichCache.set(key, { value, expiresAt: Date.now() + ENRICH_TTL_MS });
  // Prevent unbounded growth under many unique tokens/users
  if (enrichCache.size > 2000) {
    const firstKey = enrichCache.keys().next().value;
    enrichCache.delete(firstKey);
  }
}

/**
 * Enrich JWT user with DB employeeNumber/role/email.
 * @param {object} user - decoded JWT payload
 * @returns {Promise<object>} enriched user (same shape + canonical employeeNumber)
 */
async function enrichUserFromDb(user) {
  if (!user) return user;

  const cacheKey = enrichCacheKey(user);
  if (cacheKey) {
    const cached = getCachedEnrich(cacheKey);
    if (cached) {
      return { ...user, ...cached };
    }
  }

  let enriched = user;

  if (user.id) {
    const [rows] = await db.promise().query(
      'SELECT employeeNumber, role, email FROM users WHERE id = ? LIMIT 1',
      [user.id],
    );
    if (rows[0]?.employeeNumber) {
      const canonical = await resolveCanonicalEmployeeNumber(rows[0].employeeNumber);
      enriched = {
        ...user,
        employeeNumber: canonical || String(rows[0].employeeNumber).trim(),
        role: rows[0].role || user.role,
        email: rows[0].email || user.email,
      };
    }
  } else if (user.employeeNumber) {
    const canonical = await resolveCanonicalEmployeeNumber(user.employeeNumber);
    enriched = { ...user, employeeNumber: canonical || String(user.employeeNumber).trim() };
  }

  if (cacheKey && enriched !== user) {
    setCachedEnrich(cacheKey, {
      employeeNumber: enriched.employeeNumber,
      role: enriched.role,
      email: enriched.email,
    });
  } else if (cacheKey && user.employeeNumber) {
    setCachedEnrich(cacheKey, {
      employeeNumber: enriched.employeeNumber,
      role: enriched.role,
      email: enriched.email,
    });
  }

  return enriched;
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    enrichUserFromDb(user)
      .then((enriched) => {
        req.user = enriched;
        next();
      })
      .catch(() => {
        req.user = user;
        next();
      });
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

function normalizeEmployeeNumber(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^\d+$/.test(raw)) {
    const stripped = raw.replace(/^0+/, '') || '0';
    return stripped;
  }
  return raw;
}

function employeeNumbersMatch(a, b) {
  const left = normalizeEmployeeNumber(a);
  const right = normalizeEmployeeNumber(b);
  if (!left || !right) return false;
  return left === right;
}

function requireSelfOrAdmin(paramName = 'employeeNumber') {
  return (req, res, next) => {
    (async () => {
      const target =
        req.params[paramName] ||
        req.body?.[paramName] ||
        req.query?.[paramName];
      const role = String(req.user?.role || '').toLowerCase();

      if (ADMIN_ROLES.includes(role)) {
        return next();
      }

      let caller = String(req.user?.employeeNumber || '').trim();
      if (!caller && req.user) {
        const enriched = await enrichUserFromDb(req.user);
        req.user = enriched;
        caller = String(enriched?.employeeNumber || '').trim();
      }

      if (target && caller && employeeNumbersMatch(target, caller)) {
        return next();
      }

      return res.status(403).json({ error: 'Access denied' });
    })().catch(next);
  };
}

/** Staff supervisors: allow when supervisor_assignment or active page_access exists. */
function requireSupervisorModuleAccess(...componentIdentifiers) {
  const identifiers = componentIdentifiers.flat().filter(Boolean);
  return (req, res, next) => {
    (async () => {
      const role = String(req.user?.role || '').toLowerCase();
      if (ADMIN_ROLES.includes(role)) {
        return next();
      }

      let emp = String(req.user?.employeeNumber || '').trim();
      if (!emp && req.user) {
        const enriched = await enrichUserFromDb(req.user);
        req.user = enriched;
        emp = String(enriched?.employeeNumber || '').trim();
      }
      if (!emp) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { departments } = await fetchSupervisorDepartments(emp);
      if (departments.length > 0) {
        return next();
      }

      for (const identifier of identifiers) {
        const [pageRows] = await db.promise().query(
          'SELECT id FROM pages WHERE component_identifier = ? LIMIT 1',
          [identifier],
        );
        if (!pageRows[0]?.id) continue;

        const [accessRows] = await db.promise().query(
          `SELECT 1 FROM page_access pa
           WHERE ${empMatchSql('pa.employeeNumber')}
             AND pa.page_id = ?
             AND ${PAGE_ACCESS_ACTIVE_SQL}
           LIMIT 1`,
          [...bindEmpMatchParams(emp), pageRows[0].id],
        );
        if (accessRows.length > 0) {
          return next();
        }
      }

      return res.status(403).json({ error: 'Supervisor assignment required' });
    })().catch(next);
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
    (async () => {
      const role = String(req.user?.role || '').toLowerCase();
      if (ADMIN_ROLES.includes(role)) {
        return next();
      }

      const target =
        req.params[paramName] ||
        req.body?.[paramName] ||
        req.query?.[paramName];

      let caller = String(req.user?.employeeNumber || '').trim();
      if (!caller && req.user) {
        const enriched = await enrichUserFromDb(req.user);
        req.user = enriched;
        caller = String(enriched?.employeeNumber || '').trim();
      }

      // Safety: /context/me may match :param routes if /me handler is missing — treat as self.
      if (target && String(target).toLowerCase() === 'me') {
        if (!caller) {
          return res.status(403).json({ error: 'Access denied' });
        }
        return next();
      }

      if (target && caller && employeeNumbersMatch(target, caller)) {
        return next();
      }

      return res.status(403).json({ error: 'Access denied' });
    })().catch(next);
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

  const actorRole =
    user && typeof user === 'object' && user.role
      ? String(user.role).toLowerCase()
      : null;

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

  if (actorRole && TRAILED_ADMIN_ROLES.includes(actorRole)) {
    const trailQuery = `
      INSERT INTO admin_action_trail
        (employeeNumber, actor_role, action, table_name, record_id, targetEmployeeNumber, details_json, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    db.query(
      trailQuery,
      [
        employeeNumber,
        actorRole,
        action,
        tableName,
        safeRecordId,
        targetEmployeeNumber,
        detailsJson,
      ],
      (trailErr, trailResult) => {
        if (trailErr) {
          console.error('Error inserting admin action trail:', trailErr);
          return;
        }

        broadcastNewAdminActionTrail({
          id: trailResult.insertId,
          employeeNumber,
          actor_role: actorRole,
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
  requireSupervisorModuleAccess,
  requirePageAccess,
  enrichUserFromDb,
  isAdminRole,
  scopeEmployeeNumberFromUser,
  normalizeEmployeeNumber,
  employeeNumbersMatch,
  logAudit,
  insertAuditLog,
  ADMIN_ROLES,
  SUPERADMIN_ROLES,
  TRAILED_ADMIN_ROLES,
};
