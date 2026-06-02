const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin, requireSuperAdmin, requireTechnical, requireSelfOrAdmin } = require('../middleware/auth');
const socketService = require('../socket/socketService');
const {
  PAGE_ACCESS_ACTIVE_SQL,
  parseExpiresAt,
  roleInPageGroup,
} = require('../utils/pageAccess');

function resolvePageAccessExpiry({ pageGroup, userRole, page_privilege, expires_at }) {
  const granting =
    String(page_privilege ?? '') !== '0' && String(page_privilege ?? '') !== '';
  if (!granting) {
    return { ok: true, expiresAt: null };
  }

  const inScope = roleInPageGroup(pageGroup, userRole);
  const expiresAt = parseExpiresAt(expires_at);

  if (inScope) {
    if (expiresAt) {
      return {
        ok: false,
        error:
          'Pages within this user\'s role use permanent access and cannot have an expiry.',
      };
    }
    return { ok: true, expiresAt: null };
  }

  if (!expiresAt || expiresAt.getTime() <= Date.now()) {
    return {
      ok: false,
      error:
        'Pages outside this user\'s role require temporary access with a future expiry date.',
    };
  }

  const maxExpiryMs = Date.now() + 24 * 60 * 60 * 1000;
  if (expiresAt.getTime() > maxExpiryMs) {
    return {
      ok: false,
      error: 'Temporary access cannot exceed 1 day.',
    };
  }

  return { ok: true, expiresAt };
}

function fetchUserRoleAndPage(pageId, employeeNumber, callback) {
  db.query(
    'SELECT role FROM users WHERE employeeNumber = ? LIMIT 1',
    [employeeNumber],
    (userErr, users) => {
      if (userErr) return callback(userErr);
      if (!users?.length) {
        return callback(new Error('User not found'));
      }

      db.query(
        'SELECT id, page_group FROM pages WHERE id = ? LIMIT 1',
        [pageId],
        (pageErr, pageRows) => {
          if (pageErr) return callback(pageErr);
          if (!pageRows?.length) {
            return callback(new Error('Page not found'));
          }
          callback(null, users[0].role, pageRows[0].page_group);
        },
      );
    },
  );
}

// GET ALL PAGES
router.get('/pages', authenticateToken, requireAdmin, async (req, res) => {
  const query = `
    SELECT id, page_name, page_description, page_url, page_group, component_identifier
    FROM pages
    ORDER BY page_description ASC
  `;

  try {
    db.query(query, (err, result) => {
      if (err) {
        console.error('Error fetching pages:', err);
        return res.status(500).json({ error: 'Failed to fetch pages' });
      }

      res.status(200).json(result);
    });
  } catch (err) {
    console.error('Error during page fetch:', err);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

// GET PAGE REGISTRY (id + identifier + group) — any authenticated user for access checks
router.get('/pages/access-registry', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT id, page_name, page_description, page_url, page_group, component_identifier
      FROM pages
      WHERE component_identifier IS NOT NULL AND component_identifier != ''
      ORDER BY page_description ASC, page_name ASC
    `;

    db.query(query, (err, result) => {
      if (err) {
        console.error('Error fetching page access registry:', err);
        return res.status(500).json({ error: 'Failed to fetch page registry' });
      }
      res.status(200).json(result);
    });
  } catch (err) {
    console.error('Error during page registry fetch:', err);
    res.status(500).json({ error: 'Failed to fetch page registry' });
  }
});

// GET PAGE BY COMPONENT IDENTIFIER (for dynamic page access)
router.get('/pages/by-identifier/:identifier', authenticateToken, async (req, res) => {
  const { identifier } = req.params;

  if (!identifier) {
    return res.status(400).json({ error: 'Component identifier is required' });
  }

  try {
    const query = `
      SELECT id, page_name, page_description, page_url, page_group, component_identifier
      FROM pages
      WHERE component_identifier = ?
      LIMIT 1
    `;

    db.query(query, [identifier], (err, result) => {
      if (err) {
        console.error('Error fetching page by identifier:', err);
        return res.status(500).json({ error: 'Failed to fetch page' });
      }

      if (result.length === 0) {
        return res.status(404).json({ error: 'Page not found for the given identifier' });
      }

      res.status(200).json(result[0]);
    });
  } catch (err) {
    console.error('Error during page fetch by identifier:', err);
    res.status(500).json({ error: 'Failed to fetch page' });
  }
});

// CREATE PAGE
router.post('/pages', authenticateToken, requireTechnical, async (req, res) => {
  const { page_name, page_description, page_url, page_group, component_identifier } = req.body;

  // Validate required fields
  if (!page_name || !page_description || !page_group) {
    return res.status(400).json({
      error: 'Page name, description, and group are required',
    });
  }

  try {
    const query = `
      INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
      query,
      [page_name, page_description, page_url || null, page_group, component_identifier || null],
      (err, result) => {
        if (err) {
          console.error('Error creating page:', err);
          return res.status(500).json({ error: 'Failed to create page' });
        }

        res.status(201).json({
          message: 'Page created successfully',
          pageId: result.insertId,
        });
      }
    );
  } catch (err) {
    console.error('Error during page creation:', err);
    res.status(500).json({ error: 'Failed to create page' });
  }
});

// UPDATE PAGE
router.put('/pages/:id', authenticateToken, requireTechnical, async (req, res) => {
  const { id } = req.params;
  const { page_name, page_description, page_url, page_group, component_identifier } = req.body;

  try {
    const query = `
      UPDATE pages 
      SET page_name = ?, page_description = ?, page_url = ?, page_group = ?, component_identifier = ?
      WHERE id = ?
    `;

    db.query(
      query,
      [page_name, page_description, page_url, page_group, component_identifier || null, id],
      (err, result) => {
        if (err) {
          console.error('Error updating page:', err);
          return res.status(500).json({ error: 'Failed to update page' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Page not found' });
        }

        res.status(200).json({ message: 'Page updated successfully' });
      }
    );
  } catch (err) {
    console.error('Error during page update:', err);
    res.status(500).json({ error: 'Failed to update page' });
  }
});

// DELETE PAGE
router.delete('/pages/:id', authenticateToken, requireTechnical, async (req, res) => {
  const { id } = req.params;

  try {
    const query = 'DELETE FROM pages WHERE id = ?';

    db.query(query, [id], (err, result) => {
      if (err) {
        console.error('Error deleting page:', err);
        return res.status(500).json({ error: 'Failed to delete page' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Page not found' });
      }

      res.status(200).json({ message: 'Page deleted successfully' });
    });
  } catch (err) {
    console.error('Error during page deletion:', err);
    res.status(500).json({ error: 'Failed to delete page' });
  }
});

// GET USER PAGE ACCESS
router.get('/page_access/:employeeNumber', authenticateToken, requireSelfOrAdmin('employeeNumber'), async (req, res) => {
  const { employeeNumber } = req.params;

  try {
    const query = `
      SELECT page_id, page_privilege, expires_at
      FROM page_access 
      WHERE employeeNumber = ?
    `;

    db.query(query, [employeeNumber], (err, results) => {
      if (err) {
        console.error('Error fetching page access:', err);
        return res.status(500).json({ error: 'Failed to fetch page access' });
      }
      res.status(200).json(results);
    });
  } catch (err) {
    console.error('Error during page access fetch:', err);
    res.status(500).json({ error: 'Failed to fetch page access' });
  }
});

// CREATE PAGE ACCESS
router.post('/page_access', authenticateToken, requireSuperAdmin, async (req, res) => {
  const { employeeNumber, page_id, page_privilege, expires_at } = req.body;

  if (!employeeNumber || !page_id || !page_privilege) {
    return res.status(400).json({
      error: 'Employee number, page ID, and privilege are required',
    });
  }

  fetchUserRoleAndPage(page_id, employeeNumber, (metaErr, userRole, pageGroup) => {
    if (metaErr) {
      console.error('Error resolving page access context:', metaErr);
      return res.status(404).json({ error: metaErr.message || 'User or page not found' });
    }

    const expiry = resolvePageAccessExpiry({
      pageGroup,
      userRole,
      page_privilege,
      expires_at,
    });
    if (!expiry.ok) {
      return res.status(400).json({ error: expiry.error });
    }

    const checkQuery = `
      SELECT * FROM page_access 
      WHERE employeeNumber = ? AND page_id = ?
    `;

    db.query(checkQuery, [employeeNumber, page_id], (checkErr, checkResults) => {
      if (checkErr) {
        console.error('Error checking existing page access:', checkErr);
        return res.status(500).json({ error: 'Failed to check page access' });
      }

      if (checkResults.length > 0) {
        return res
          .status(409)
          .json({ error: 'Page access already exists for this user' });
      }

      const insertQuery = `
        INSERT INTO page_access (employeeNumber, page_id, page_privilege, expires_at)
        VALUES (?, ?, ?, ?)
      `;

      db.query(
        insertQuery,
        [employeeNumber, page_id, page_privilege, expiry.expiresAt],
        (insertErr) => {
          if (insertErr) {
            console.error('Error creating page access:', insertErr);
            return res.status(500).json({ error: 'Failed to create page access' });
          }

          const pageQuery = 'SELECT * FROM pages WHERE id = ?';
          db.query(pageQuery, [page_id], (pageErr, pageResults) => {
            if (!pageErr && pageResults.length > 0) {
              socketService.notifyPageAccessGranted(employeeNumber, {
                page_id: page_id,
                page_name: pageResults[0].page_name,
                page_url: pageResults[0].page_url,
                component_identifier: pageResults[0].component_identifier,
                page_privilege: page_privilege,
                expires_at: expiry.expiresAt,
              });
            }
          });

          res.status(201).json({ message: 'Page access created successfully' });
        },
      );
    });
  });
});

// UPDATE PAGE ACCESS
router.put('/page_access/:employeeNumber/:pageId', authenticateToken, requireSuperAdmin, async (req, res) => {
  const { employeeNumber, pageId } = req.params;
  const { page_privilege, expires_at } = req.body;
  const hasExpiresField = Object.prototype.hasOwnProperty.call(req.body, 'expires_at');

  fetchUserRoleAndPage(pageId, employeeNumber, (metaErr, userRole, pageGroup) => {
    if (metaErr) {
      console.error('Error resolving page access context:', metaErr);
      return res.status(404).json({ error: metaErr.message || 'User or page not found' });
    }

    const expiry = resolvePageAccessExpiry({
      pageGroup,
      userRole,
      page_privilege,
      expires_at,
    });
    if (!expiry.ok) {
      return res.status(400).json({ error: expiry.error });
    }

    const granting =
      String(page_privilege ?? '') !== '0' && String(page_privilege ?? '') !== '';
    const inScope = roleInPageGroup(pageGroup, userRole);
    const resolvedExpires = granting
      ? inScope
        ? null
        : expiry.expiresAt
      : null;

    const query = `
      UPDATE page_access 
      SET page_privilege = ?, expires_at = ?
      WHERE employeeNumber = ? AND page_id = ?
    `;

    db.query(
      query,
      [page_privilege, resolvedExpires, employeeNumber, pageId],
      (err, result) => {
        if (err) {
          console.error('Error updating page access:', err);
          return res.status(500).json({ error: 'Failed to update page access' });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Page access record not found' });
        }

        const pageQuery = 'SELECT * FROM pages WHERE id = ?';
        db.query(pageQuery, [pageId], (pageErr, pageResults) => {
          if (!pageErr && pageResults.length > 0) {
            const action =
              page_privilege !== '0' && page_privilege !== '' ? 'granted' : 'revoked';
            socketService.notifyPageAccessChanged(employeeNumber, action, {
              page_id: pageId,
              page_name: pageResults[0].page_name,
              page_url: pageResults[0].page_url,
              component_identifier: pageResults[0].component_identifier,
              page_privilege: page_privilege,
              expires_at: resolvedExpires,
            });
          }
        });

        res.status(200).json({ message: 'Page access updated successfully' });
      },
    );
  });
});

// GET ACCESSIBLE PAGES FOR USER (Optimized combined endpoint)
router.get('/pages/accessible/:employeeNumber', authenticateToken, requireSelfOrAdmin('employeeNumber'), async (req, res) => {
  const { employeeNumber } = req.params;

  try {
    const query = `
      SELECT 
        p.id,
        p.page_name,
        p.page_description,
        p.page_url,
        p.page_group,
        p.component_identifier,
        pa.page_privilege,
        pa.expires_at
      FROM pages p
      INNER JOIN page_access pa ON p.id = pa.page_id
      WHERE pa.employeeNumber = ? 
        AND ${PAGE_ACCESS_ACTIVE_SQL}
      ORDER BY p.page_description ASC, p.page_name ASC
    `;

    db.query(query, [employeeNumber], (err, results) => {
      if (err) {
        console.error('Error fetching accessible pages:', err);
        return res.status(500).json({ error: 'Failed to fetch accessible pages' });
      }
      res.status(200).json(results);
    });
  } catch (err) {
    console.error('Error during accessible pages fetch:', err);
    res.status(500).json({ error: 'Failed to fetch accessible pages' });
  }
});

module.exports = router;




