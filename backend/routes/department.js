const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, logAudit, requireAdmin } = require('../middleware/auth');
const { getResolved } = require('../services/payrollTemplate/positionOverrides');
const { notifyPayrollChanged } = require('../socket/socketService');

router.use(authenticateToken, requireAdmin);

// Payroll budget target: optional override telling the Appendix 33 export which
// tab an employee's pay is charged to. Two kinds of target are allowed, chosen in
// the Department Assignment form:
//   department          -> a department code enabled in the Appendix 33 layout
//   employment_category -> a category from the Employment Category set-up
//                          (employment_type_config), stored with the module's own
//                          label "<parentGroup> | <typeName>" — the same
//                          categoryLabel EmploymentCategoryHrPanel displays.
// Blank is stored as NULL so the export falls back to the real department.
const BUDGET_TYPE_DEPARTMENT = 'department';
const BUDGET_TYPE_EMPLOYMENT = 'employment_category';

const normalizeBudgetType = (value) => (
  String(value || '').trim().toLowerCase() === BUDGET_TYPE_EMPLOYMENT
    ? BUDGET_TYPE_EMPLOYMENT
    : BUDGET_TYPE_DEPARTMENT
);

/** Department targets are stored as the upper-cased layout code. */
const normalizeBudgetCode = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed.toUpperCase();
};

const allowedBudgetValues = (values) => new Set(
  Object.keys(values || {}).map((v) => String(v).trim().toUpperCase()).filter(Boolean),
);

/** A department target may only point at a department the layout can export. */
const validateBudgetDepartment = (budgetCode) => {
  if (!budgetCode) return null;
  if (!allowedBudgetValues(getResolved().departments).has(String(budgetCode).toUpperCase())) {
    return `Budget department "${budgetCode}" is not enabled in the Appendix 33 layout's department tab.`;
  }
  return null;
};

/**
 * Validates a budget target against its own source of truth and returns the value
 * to store: { code, error }.
 *   department  -> the Appendix 33 layout allow-list (synchronous)
 *   category    -> the Employment Category set-up, so any configured category can
 *                  be charged even when the Appendix 33 layout has no tab for it
 *                  yet (the field warns about export effect instead of blocking)
 */
const resolveBudgetTarget = (value, budgetType) => new Promise((resolve) => {
  const trimmed = value === undefined || value === null ? '' : String(value).trim();
  if (!trimmed) return resolve({ code: null, error: null });

  if (budgetType !== BUDGET_TYPE_EMPLOYMENT) {
    const code = normalizeBudgetCode(trimmed);
    return resolve({ code, error: validateBudgetDepartment(code) });
  }

  // Accept either the stored label "Group | Type" or a bare type name, and return
  // the label exactly as Employment Category spells it.
  const parts = trimmed.split('|');
  const hasGroup = parts.length > 1;
  const group = hasGroup ? parts.slice(0, parts.length - 1).join('|').trim() : '';
  const typeName = (hasGroup ? parts[parts.length - 1] : trimmed).trim();
  const sql = hasGroup
    ? `SELECT parentGroup, typeName, isActive FROM employment_type_config
       WHERE LOWER(TRIM(parentGroup)) = LOWER(?) AND LOWER(TRIM(typeName)) = LOWER(?) LIMIT 1`
    : `SELECT parentGroup, typeName, isActive FROM employment_type_config
       WHERE LOWER(TRIM(typeName)) = LOWER(?) LIMIT 1`;
  const params = hasGroup ? [group, typeName] : [typeName];

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error('department-assignment budget target lookup:', err);
      return resolve({ code: trimmed, error: 'Could not verify the employment category against Employment Category.' });
    }
    if (!rows.length) {
      return resolve({
        code: trimmed,
        error: `Employment category "${trimmed}" is not configured in Employment Category.`,
      });
    }
    if (!Number(rows[0].isActive)) {
      return resolve({
        code: trimmed,
        error: `Employment category "${trimmed}" is inactive. Enable it in Employment Category first.`,
      });
    }
    const row = rows[0];
    resolve({ code: row.parentGroup ? `${row.parentGroup} | ${row.typeName}` : row.typeName, error: null });
  });
});

// GET all department table records
router.get('/api/department-table', (req, res) => {
  db.query('SELECT * FROM department_table', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

// GET a single department table by ID
router.get('/api/department-table/:id', (req, res) => {
  const { id } = req.params;
  db.query(
    'SELECT * FROM department_table WHERE id = ?',
    [id],
    (err, result) => {
      if (err) return res.status(500).send(err);
      if (result.length === 0)
        return res.status(404).send('Department not found');
      res.json(result[0]);
    }
  );
});

// POST: Add a new department table
router.post('/api/department-table', (req, res) => {
  const { code, description } = req.body;
  if (!code || !description)
    return res.status(400).send('Code and description are required');

  const sql = `INSERT INTO department_table (code, description) VALUES (?, ?)`;
  db.query(sql, [code, description], (err, result) => {
    if (err) return res.status(500).send(err);

    try {
      logAudit(req.user, 'Insert', 'department_table', result.insertId, null);
    } catch (e) {
      console.error('Audit log error:', e);
    }

    notifyPayrollChanged('created', {
      module: 'department-table',
      id: result.insertId,
      code,
    });

    res.status(201).json({ id: result.insertId, code, description });
  });
});

// PUT: Update a department table
router.put('/api/department-table/:id', (req, res) => {
  const { id } = req.params;
  const { code, description } = req.body;

  const sql = `UPDATE department_table SET code = ?, description = ? WHERE id = ?`;
  db.query(sql, [code, description, id], (err, result) => {
    if (err) return res.status(500).send(err);

    try {
      logAudit(req.user, 'Update', 'department_table', id, null);
    } catch (e) {
      console.error('Audit log error:', e);
    }

    notifyPayrollChanged('updated', { module: 'department-table', id, code });

    res.send('Department updated successfully');
  });
});

// DELETE: Delete a department table
router.delete('/api/department-table/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM department_table WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(500).send(err);

    try {
      logAudit(req.user, 'Delete', 'department_table', id, null);
    } catch (e) {
      console.error('Audit log error:', e);
    }

    notifyPayrollChanged('deleted', { module: 'department-table', id });

    res.send('Department deleted successfully');
  });
});

// GET all department assignments
router.get('/api/department-assignment', (req, res) => {
  db.query('SELECT * FROM department_assignment', (err, results) => {
    if (err) return res.status(500).send(err);
  res.json(results);
});
});

// GET every employee with their assignment (if any), so the Department Assignment
// page can show who still has no department code / budget target set. Employees
// without a department_assignment row come back with null assignment fields.
router.get('/api/department-assignment-status', (req, res) => {
  const sql = `
    SELECT
      u.employeeNumber,
      CONCAT_WS(' ', p.firstName, p.middleName, p.lastName,
        CASE WHEN p.nameExtension IS NOT NULL AND p.nameExtension != '' THEN p.nameExtension ELSE NULL END
      ) AS name,
      p.lastName,
      CASE WHEN p.lastName IS NOT NULL AND p.lastName != ''
        -- "Surname, FirstName, Middle" (a name extension stays with the first name)
        THEN CONCAT_WS(', ',
          p.lastName,
          NULLIF(CONCAT_WS(' ', NULLIF(p.firstName, ''), NULLIF(p.nameExtension, '')), ''),
          NULLIF(p.middleName, ''))
        ELSE NULL
      END AS surnameFirst,
      da.id AS assignmentId,
      da.code,
      da.budgetCode,
      da.budgetType
    FROM users u
    INNER JOIN person_table p ON u.employeeNumber = p.agencyEmployeeNum
    LEFT JOIN department_assignment da ON da.employeeNumber = u.employeeNumber
    WHERE p.firstName IS NOT NULL
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('department-assignment status:', err);
      return res.status(500).json({ error: 'Failed to load employee assignment status.' });
    }
    res.json(results);
  });
});

// GET a single department assignment by ID
router.get('/api/department-assignment/:id', (req, res) => {
  const { id } = req.params;
  db.query(
    'SELECT * FROM department_assignment WHERE id = ?',
    [id],
    (err, result) => {
      if (err) return res.status(500).send(err);
      if (result.length === 0)
        return res.status(404).send('Department Assignment not found');
      res.json(result[0]);
    }
  );
});

// POST: Add a new department assignment
router.post('/api/department-assignment', async (req, res) => {
  const { code, name, employeeNumber } = req.body;
  const budgetType = normalizeBudgetType(req.body.budgetType);
  if (!employeeNumber)
    return res.status(400).send('Employee Number is required');

  const budgetTarget = await resolveBudgetTarget(req.body.budgetCode, budgetType);
  if (budgetTarget.error) return res.status(422).json({ error: budgetTarget.error });
  const budgetCode = budgetTarget.code;

  // Either field may be filled in on its own: department only, budget target only,
  // or both — but the record must stand for something.
  const deptCode = code == null ? '' : String(code).trim();
  if (!deptCode && !budgetCode) {
    return res.status(400).json({ error: 'Choose a Department and/or a Budget Department.' });
  }

  const finish = (updated, id, action, saved) => {
    try {
      logAudit(req.user, action, 'department_assignment', id, employeeNumber);
    } catch (e) {
      console.error('Audit log error:', e);
    }
    notifyPayrollChanged(updated ? 'updated' : 'created', {
      module: 'department-assignment',
      id,
      employeeNumber,
      ...saved,
    });
    res.status(updated ? 200 : 201).json({ id, updated, ...saved, name, employeeNumber });
  };

  // One active assignment per employee: update it when it already exists instead
  // of inserting a second row for the same person.
  db.query(
    'SELECT id, code, budgetCode, budgetType FROM department_assignment WHERE employeeNumber = ? ORDER BY id DESC LIMIT 1',
    [employeeNumber],
    (findErr, rows) => {
      if (findErr) {
        console.error('department-assignment lookup:', findErr);
        return res.status(500).send(findErr);
      }

      const existing = rows && rows.length ? rows[0] : null;
      const existingId = existing ? existing.id : null;

      if (existingId) {
        // The assign form fills in one or both fields; a blank field keeps what the
        // employee already has, so assigning a budget later does not wipe the
        // department (and vice versa). Clearing a field is done from the Edit modal.
        const saved = budgetCode
          ? { code: deptCode || existing.code || '', budgetCode, budgetType }
          : {
            code: deptCode,
            budgetCode: existing.budgetCode || null,
            budgetType: normalizeBudgetType(existing.budgetType),
          };
        const updateSql = `
          UPDATE department_assignment
          SET code = ?, budgetCode = ?, budgetType = ?, name = COALESCE(?, name)
          WHERE id = ?
        `;
        db.query(updateSql, [saved.code, saved.budgetCode, saved.budgetType, name ?? null, existingId], (updErr) => {
          if (updErr) {
            try {
              logAudit(req.user, 'Update Failed', 'department_assignment', existingId, employeeNumber);
            } catch (e) {
              console.error('Audit log error:', e);
            }
            return res.status(500).send(updErr);
          }
          finish(true, existingId, 'Update', saved);
        });
        return;
      }

      const insertSql = `INSERT INTO department_assignment (code, budgetCode, budgetType, name, employeeNumber) VALUES (?, ?, ?, ?, ?)`;
      db.query(insertSql, [deptCode, budgetCode, budgetType, name, employeeNumber], (insErr, result) => {
        if (insErr) {
          try {
            logAudit(req.user, 'Insert Failed', 'department_assignment', null, employeeNumber);
          } catch (e) {
            console.error('Audit log error:', e);
          }
          return res.status(500).send(insErr);
        }
        finish(false, result.insertId, 'Insert', { code: deptCode, budgetCode, budgetType });
      });
    },
  );
});

// PUT: Update a department assignment
router.put('/api/department-assignment/:id', async (req, res) => {
  const { id } = req.params;
  const { code, name, employeeNumber } = req.body;
  const budgetType = normalizeBudgetType(req.body.budgetType);

  const budgetTarget = await resolveBudgetTarget(req.body.budgetCode, budgetType);
  if (budgetTarget.error) return res.status(422).json({ error: budgetTarget.error });
  const budgetCode = budgetTarget.code;

  // Same rule as POST: department only, budget target only, or both
  const deptCode = code == null ? '' : String(code).trim();
  if (!deptCode && !budgetCode) {
    return res.status(400).json({ error: 'Choose a Department and/or a Budget Department.' });
  }

  const sql = `UPDATE department_assignment SET code = ?, budgetCode = ?, budgetType = ?, name = ?, employeeNumber = ? WHERE id = ?`;
  db.query(sql, [deptCode, budgetCode, budgetType, name, employeeNumber, id], (err, result) => {
    if (err) {
      try {
        logAudit(req.user, 'Update Failed', 'department_assignment', id, employeeNumber);
      } catch (e) {
        console.error('Audit log error:', e);
      }
      return res.status(500).send(err);
    }

    try {
      logAudit(req.user, 'Update', 'department_assignment', id, employeeNumber);
    } catch (e) {
      console.error('Audit log error:', e);
    }

    notifyPayrollChanged('updated', {
      module: 'department-assignment',
      id,
      employeeNumber,
      code,
      budgetCode,
      budgetType,
    });

    res.send('Department assignment updated successfully');
  });
});

// DELETE: Delete a department assignment
router.delete('/api/department-assignment/:id', (req, res) => {
  const { id } = req.params;
  db.query(
    'DELETE FROM department_assignment WHERE id = ?',
    [id],
    (err, result) => {
      if (err) {
        try {
          logAudit(req.user, 'Delete Failed', 'department_assignment', id, null);
        } catch (e) {
          console.error('Audit log error:', e);
        }
        return res.status(500).send(err);
      }

      try {
        logAudit(req.user, 'Delete', 'department_assignment', id, null);
      } catch (e) {
        console.error('Audit log error:', e);
      }

      notifyPayrollChanged('deleted', { module: 'department-assignment', id });

      res.send('Department assignment deleted successfully');
    }
  );
});

module.exports = router;




