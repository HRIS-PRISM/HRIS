const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const { notifyPayrollChanged } = require('../socket/socketService');
const { logAudit } = require('../middleware/auth');

const getActorEmployeeNumber = (req, fallback = null) => {
  if (req.user?.employeeNumber) return String(req.user.employeeNumber);
  const authHeader = req.headers?.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded?.employeeNumber) return String(decoded.employeeNumber);
      if (decoded?.username) return String(decoded.username);
    } catch (e) { /* ignore */ }
  }
  return fallback ? String(fallback) : 'unknown';
};

// POST: Add PhilHealth contribution
router.post('/api/philhealth', (req, res) => {
  const { employeeNumber, PhilHealthContribution } = req.body;

  const query =
    'INSERT INTO philhealth (employeeNumber, PhilHealthContribution) VALUES (?, ?)';
  db.query(query, [employeeNumber, PhilHealthContribution], (err, results) => {
    if (err) {
      logAudit({ employeeNumber: getActorEmployeeNumber(req, employeeNumber) }, 'Insert Failed', 'philhealth', null, employeeNumber);
      return res.status(500).json({ error: err.message });
    }
    logAudit({ employeeNumber: getActorEmployeeNumber(req, employeeNumber) }, 'Insert', 'philhealth', results.insertId, employeeNumber);
    notifyPayrollChanged('created', {
      module: 'philhealth',
      employeeNumber,
    });
    res
      .status(201)
      .json({ message: 'PhilHealth contribution added successfully' });
  });
});

// GET: Get all PhilHealth contributions
router.get('/api/philhealth', (req, res) => {
  db.query('SELECT * FROM philhealth', (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// PUT: Update PhilHealth contribution
router.put('/api/philhealth/:id', (req, res) => {
  const { id } = req.params;
  const { employeeNumber, PhilHealthContribution } = req.body;

  const query =
    'UPDATE philhealth SET employeeNumber = ?, PhilHealthContribution = ? WHERE id = ?';
  db.query(
    query,
    [employeeNumber, PhilHealthContribution, id],
    (err, results) => {
      if (err) {
        logAudit({ employeeNumber: getActorEmployeeNumber(req, employeeNumber) }, 'Update Failed', 'philhealth', id, employeeNumber);
        return res.status(500).json({ error: err.message });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: 'Contribution not found' });
      }
      logAudit({ employeeNumber: getActorEmployeeNumber(req, employeeNumber) }, 'Update', 'philhealth', id, employeeNumber);
      notifyPayrollChanged('updated', {
        module: 'philhealth',
        id,
        employeeNumber,
      });
      res.json({ message: 'PhilHealth contribution updated successfully' });
    }
  );
});

// DELETE: Delete PhilHealth contribution
router.delete('/api/philhealth/:id', (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM philhealth WHERE id = ?';
  db.query(query, [id], (err, results) => {
    if (err) {
      logAudit({ employeeNumber: getActorEmployeeNumber(req) }, 'Delete Failed', 'philhealth', id, null);
      return res.status(500).json({ error: err.message });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Contribution not found' });
    }
    logAudit({ employeeNumber: getActorEmployeeNumber(req) }, 'Delete', 'philhealth', id, null);
    notifyPayrollChanged('deleted', { module: 'philhealth', id });
    res.json({ message: 'PhilHealth contribution deleted successfully' });
  });
});

module.exports = router;




