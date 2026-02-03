const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { upload } = require('../middleware/upload');
const { broadcastToRoles } = require('../socket/socketService');
const { notifyPayrollChanged } = require('../socket/socketService');

// GET all holiday records (normalize title/about/date_start/date_end for backward compat)
router.get('/holiday', (req, res) => {
  const sql = `SELECT id, COALESCE(title, description) AS title, COALESCE(about, '') AS about, COALESCE(date_start, date) AS date_start, COALESCE(date_end, date) AS date_end, status, image, description, date FROM holiday`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error('Database Query Error:', err.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    res.json(result);
  });
});

// POST: Create holiday record (Title, About, Date Range, same as announcement)
router.post('/holiday', upload.single('image'), (req, res) => {
  const { title, about, date_start, date_end, status } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const sql = `INSERT INTO holiday (title, about, date_start, date_end, description, date, status, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(sql, [title, about || null, date_start || null, date_end || null, title, date_start || date_end, status || 'Active', image], (err, result) => {
    if (err) {
      console.error('Database Insert Error:', err.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    notifyPayrollChanged('created', {
      module: 'holiday',
      holidayId: result.insertId,
    });

    broadcastToRoles(
      ['administrator', 'superadmin', 'technical'],
      'adminDashboardUpdated',
      { source: 'holiday', action: 'created', holidayId: result.insertId },
    );

    res.status(201).json({
      message: 'Holiday record added successfully',
      id: result.insertId,
    });
  });
});

// PUT: Update holiday record (Title, About, Date Range, optional image)
router.put('/holiday/:id', upload.single('image'), (req, res) => {
  const { id } = req.params;
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  const { title, about, date_start, date_end, status } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const image = req.file ? `/uploads/${req.file.filename}` : null;

  let sql, params;
  if (image) {
    sql = `UPDATE holiday SET title = ?, about = ?, date_start = ?, date_end = ?, description = ?, date = ?, status = ?, image = ? WHERE id = ?`;
    params = [title, about || null, date_start || null, date_end || null, title, date_start || date_end, status || 'Active', image, id];
  } else {
    sql = `UPDATE holiday SET title = ?, about = ?, date_start = ?, date_end = ?, description = ?, date = ?, status = ? WHERE id = ?`;
    params = [title, about || null, date_start || null, date_end || null, title, date_start || date_end, status || 'Active', id];
  }

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('Database Update Error:', err.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Hol record not found' });
    }

    notifyPayrollChanged('updated', { module: 'holiday', holidayId: id });

    broadcastToRoles(
      ['administrator', 'superadmin', 'technical'],
      'adminDashboardUpdated',
      { source: 'holiday', action: 'updated', holidayId: id },
    );

    res.json({ message: 'Hol record updated successfully' });
  });
});

// DELETE: Delete holiday record (and image file if present)
router.delete('/holiday/:id', (req, res) => {
  const { id } = req.params;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  const getQuery = 'SELECT image FROM holiday WHERE id = ?';
  db.query(getQuery, [id], (err, rows) => {
    if (err) {
      console.error('Database Query Error:', err.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Holiday record not found' });
    }

    const imagePath = rows[0].image;
    if (imagePath) {
      const fullPath = path.join(__dirname, '..', imagePath);
      fs.unlink(fullPath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting holiday image:', unlinkErr);
      });
    }

    const sql = `DELETE FROM holiday WHERE id = ?`;
    db.query(sql, [id], (err, result) => {
      if (err) {
        console.error('Database Delete Error:', err.message);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Holiday record not found' });
      }

      notifyPayrollChanged('deleted', { module: 'holiday', holidayId: id });

      broadcastToRoles(
        ['administrator', 'superadmin', 'technical'],
        'adminDashboardUpdated',
        { source: 'holiday', action: 'deleted', holidayId: id },
      );

      res.json({ message: 'Holiday record deleted successfully' });
    });
  });
});

module.exports = router;
