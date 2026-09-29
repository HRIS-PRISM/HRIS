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
//   department          -> a department code from department_table / the layout
//   employment_category -> a employment_type_config.typeName from the layout
// Blank is stored as NULL so the export falls back to the real department.
const BUDGET_TYPE_DEPARTMENT = 'department';
const BUDGET_TYPE_EMPLOYMENT = 'employment_category';

const normalizeBudgetType = (value) => (
  String(value || '').trim().toLowerCase() === BUDGET_TYPE_EMPLOYMENT
    ? BUDGET_TYPE_EMPLOYMENT
    : BUDGET_TYPE_DEPARTMENT
);

/**
 * Stored value for the target: upper-cased department code, or the layout's own
 * spelling of an employment category name so the export can match it exactly.
 */
const normalizeBudgetCode = (value, budgetType = BUDGET_TYPE_DEPARTMENT) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (trimmed === '') return null;
  if (budgetType === BUDGET_TYPE_EMPLOYMENT) {
    const layoutName = Object.keys(getResolved().employmentTypes || {})
      .find((name) => String(name).trim().toUpperCase() === trimmed.toUpperCase());
    return layoutName ? String(layoutName).trim() : trimmed;
  }
  return trimmed.toUpperCase();
};

const allowedBudgetValues = (values) => new Set(
  Object.keys(values || {}).map((v) => String(v).trim().toUpperCase()).filter(Boolean),
);

const validateBudgetCode = (budgetCode, budgetType = BUDGET_TYPE_DEPARTMENT) => {
  if (!budgetCode) return null;
  const maps = getResolved();
  if (budgetType === BUDGET_TYPE_EMPLOYMENT) {
    if (!allowedBudgetValues(maps.employmentTypes).has(String(budgetCode).toUpperCase())) {
      return `Employment category "${budgetCode}" is not enabled in the Appendix 33 layout's employment-category tab.`;
    }
    return null;
  }
  if (!allowedBudgetValues(maps.departments).has(String(budgetCode).toUpperCase())) {
    return `Budget department "${budgetCode}" is not enabled in the Appendix 33 layout's department tab.`;
  }
  return null;
};

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
router.post('/api/department-assignment', (req, res) => {
  const { code, name, employeeNumber } = req.body;
  const budgetType = normalizeBudgetType(req.body.budgetType);
  const budgetCode = normalizeBudgetCode(req.body.budgetCode, budgetType);
  if (!code || !employeeNumber)
    return res.status(400).send('Code and Employee Number are required');

  const budgetError = validateBudgetCode(budgetCode, budgetType);
  if (budgetError) return res.status(422).json({ error: budgetError });

  const sql = `INSERT INTO department_assignment (code, budgetCode, budgetType, name, employeeNumber) VALUES (?, ?, ?, ?, ?)`;
  db.query(sql, [code, budgetCode, budgetType, name, employeeNumber], (err, result) => {
    if (err) {
      try {
        logAudit(req.user, 'Insert Failed', 'department_assignment', null, employeeNumber);
      } catch (e) {
        console.error('Audit log error:', e);
      }
      return res.status(500).send(err);
    }

    try {
      logAudit(
        req.user,
        'Insert',
        'department_assignment',
        result.insertId,
        employeeNumber
      );
    } catch (e) {
      console.error('Audit log error:', e);
    }

    notifyPayrollChanged('created', {
      module: 'department-assignment',
      id: result.insertId,
      employeeNumber,
      code,
      budgetCode,
      budgetType,
    });

    res.status(201).json({ id: result.insertId, code, budgetCode, budgetType, name, employeeNumber });
  });
});

// PUT: Update a department assignment
router.put('/api/department-assignment/:id', (req, res) => {
  const { id } = req.params;
  const { code, name, employeeNumber } = req.body;
  const budgetType = normalizeBudgetType(req.body.budgetType);
  const budgetCode = normalizeBudgetCode(req.body.budgetCode, budgetType);

  const budgetError = validateBudgetCode(budgetCode, budgetType);
  if (budgetError) return res.status(422).json({ error: budgetError });

  const sql = `UPDATE department_assignment SET code = ?, budgetCode = ?, budgetType = ?, name = ?, employeeNumber = ? WHERE id = ?`;
  db.query(sql, [code, budgetCode, budgetType, name, employeeNumber, id], (err, result) => {
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




