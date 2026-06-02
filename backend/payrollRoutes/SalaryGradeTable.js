const db = require("../db");
const express = require('express');
const router = express.Router();
const { notifyPayrollChanged } = require('../socket/socketService');
const { authenticateToken, logAudit, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const { parse } = require('csv-parse/sync');

const upload = multer({ storage: multer.memoryStorage() });

// ── CREATE (single) ──────────────────────────────────────────────────────────
router.post('/salary-grade', authenticateToken, requireAdmin, (req, res) => {
  const {
    effectivityDate, sg_number,
    step1, step2, step3, step4, step5, step6, step7, step8,
  } = req.body;

  const query =
    'INSERT INTO salary_grade_table (effectivityDate, sg_number, step1, step2, step3, step4, step5, step6, step7, step8) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  const values = [effectivityDate, sg_number, step1, step2, step3, step4, step5, step6, step7, step8];

  db.query(query, values, (err, results) => {
    if (err) {
      console.error('Error inserting data:', err);
      return res.status(500).send('Error inserting data');
    }
    try { logAudit(req.user, 'Insert', 'salary_grade_table', results.insertId, null); } catch (e) { console.error('Audit log error:', e); }
    notifyPayrollChanged('created', { module: 'salary-grade', id: results.insertId, sg_number, effectivityDate });
    res.status(200).send('Salary grade added successfully');
  });
});

// ── BULK IMPORT via CSV ──────────────────────────────────────────────────────
router.post('/salary-grade/bulk-import', authenticateToken, requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');

  let records;
  try {
    records = parse(req.file.buffer.toString(), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err) {
    console.error('CSV parse error:', err);
    return res.status(400).send('Invalid CSV format');
  }

  if (!records.length) return res.status(400).send('CSV file is empty');

  const required = ['effectivityDate', 'sg_number', 'step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'step7', 'step8'];
  const headers = Object.keys(records[0]);
  const missing = required.filter(c => !headers.includes(c));
  if (missing.length) return res.status(400).send(`Missing columns: ${missing.join(', ')}`);

  const values = records.map(r => [
    r.effectivityDate, r.sg_number,
    r.step1, r.step2, r.step3, r.step4,
    r.step5, r.step6, r.step7, r.step8,
  ]);

  const query = `INSERT INTO salary_grade_table 
    (effectivityDate, sg_number, step1, step2, step3, step4, step5, step6, step7, step8) 
    VALUES ?`;

  db.query(query, [values], (err, results) => {
    if (err) {
      console.error('Bulk import error:', err);
      return res.status(500).send('Error importing data');
    }
    try { logAudit(req.user, 'BulkImport', 'salary_grade_table', null, null); } catch (e) { console.error('Audit log error:', e); }
    notifyPayrollChanged('created', { module: 'salary-grade', count: results.affectedRows });
    res.status(200).json({ imported: results.affectedRows });
  });
});

// ── READ (all) ───────────────────────────────────────────────────────────────
router.get('/salary-grade', authenticateToken, requireAdmin, (req, res) => {
  const query = 'SELECT * FROM salary_grade_table';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching data:', err);
      return res.status(500).send('Error fetching data');
    }
    res.status(200).json(results);
  });
});

// ── UPDATE ───────────────────────────────────────────────────────────────────
router.put('/salary-grade/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const {
    effectivityDate, sg_number,
    step1, step2, step3, step4, step5, step6, step7, step8,
  } = req.body;

  const query =
    'UPDATE salary_grade_table SET effectivityDate = ?, sg_number = ?, step1 = ?, step2 = ?, step3 = ?, step4 = ?, step5 = ?, step6 = ?, step7 = ?, step8 = ? WHERE id = ?';
  const values = [effectivityDate, sg_number, step1, step2, step3, step4, step5, step6, step7, step8, id];

  db.query(query, values, (err) => {
    if (err) {
      console.error('Error updating data:', err);
      return res.status(500).send('Error updating data');
    }
    try { logAudit(req.user, 'Update', 'salary_grade_table', id, null); } catch (e) { console.error('Audit log error:', e); }
    notifyPayrollChanged('updated', { module: 'salary-grade', id, sg_number, effectivityDate });
    res.status(200).send('Salary grade updated successfully');
  });
});

// ── DELETE ───────────────────────────────────────────────────────────────────
router.delete('/salary-grade/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM salary_grade_table WHERE id = ?';
  db.query(query, [id], (err) => {
    if (err) {
      console.error('Error deleting data:', err);
      return res.status(500).send('Error deleting data');
    }
    try { logAudit(req.user, 'Delete', 'salary_grade_table', id, null); } catch (e) { console.error('Audit log error:', e); }
    notifyPayrollChanged('deleted', { module: 'salary-grade', id });
    res.status(200).send('Salary grade deleted successfully');
  });
});

module.exports = router;