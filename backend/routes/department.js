const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, logAudit, requireAdmin } = require('../middleware/auth');
const { notifyPayrollChanged } = require('../socket/socketService');

router.use(authenticateToken, requireAdmin);

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
  if (!code || !employeeNumber)
    return res.status(400).send('Code and Employee Number are required');

  const sql = `INSERT INTO department_assignment (code, name, employeeNumber) VALUES (?, ?, ?)`;
  db.query(sql, [code, name, employeeNumber], (err, result) => {
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
    });

    res.status(201).json({ id: result.insertId, code, name, employeeNumber });
  });
});

// PUT: Update a department assignment
router.put('/api/department-assignment/:id', (req, res) => {
  const { id } = req.params;
  const { code, name, employeeNumber } = req.body;

  const sql = `UPDATE department_assignment SET code = ?, name = ?, employeeNumber = ? WHERE id = ?`;
  db.query(sql, [code, name, employeeNumber, id], (err, result) => {
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




