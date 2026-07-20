const express = require('express');
const router = express.Router();
const db = require('../db');
const { upload } = require('../middleware/upload');
const path = require('path');
const fs = require('fs');
const { broadcastToRoles, notifyMultipleUsers } = require('../socket/socketService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET all suspensions (normalize date_start/date_end for backward compat)
router.get('/api/suspensions', (req, res) => {
  const query =
    'SELECT id, title, about, COALESCE(date_start, date) AS date_start, COALESCE(date_end, date) AS date_end, date, reason, image FROM suspensions ORDER BY COALESCE(date_start, date) DESC';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching suspensions:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json(results);
  });
});

// POST: Create suspension (Title, About, Date Range, Reason)
router.post('/api/suspensions', authenticateToken, requireAdmin, upload.single('image'), (req, res) => {
  const { title, about, date_start, date_end, reason } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;
  const date = date_start || date_end || null;

  const query =
    'INSERT INTO suspensions (title, about, date, date_start, date_end, reason, image) VALUES (?, ?, ?, ?, ?, ?, ?)';
  db.query(
    query,
    [title || '', about || '', date, date_start || null, date_end || null, reason || '', image],
    (err, result) => {
      if (err) {
        console.error('Error creating suspension:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      const suspensionId = result.insertId;
      const notificationDescription = 'New suspension notice has been posted. Click to see details.';

      broadcastToRoles(
        ['administrator', 'superadmin', 'technical'],
        'adminDashboardUpdated',
        { source: 'suspensions', action: 'created', suspensionId },
      );

      // Create notifications for all employees (same as announcements)
      db.query(
        `SELECT DISTINCT employeeNumber FROM users WHERE employeeNumber IS NOT NULL AND employeeNumber != ""
         UNION
         SELECT DISTINCT agencyEmployeeNum AS employeeNumber FROM person_table WHERE agencyEmployeeNum IS NOT NULL AND agencyEmployeeNum != ""`,
        (userErr, users) => {
          if (userErr) {
            console.error('Error fetching users for suspension notifications:', userErr.message);
            return res.status(201).json({ message: 'Suspension created successfully', id: suspensionId });
          }
          const employeeNumbers = Array.from(
            new Set(
              (users || [])
                .map((u) => String(u.employeeNumber || '').trim())
                .filter(Boolean),
            ),
          );
          if (employeeNumbers.length === 0) {
            return res.status(201).json({ message: 'Suspension created successfully', id: suspensionId });
          }
          let completed = 0;
          employeeNumbers.forEach((empNum) => {
            db.query(
              'INSERT INTO notifications (employeeNumber, description, read_status, notification_type, action_link) VALUES (?, ?, 0, ?, NULL)',
              [empNum, notificationDescription, 'suspension'],
              (notifErr) => {
                if (notifErr) {
                  db.query(
                    'INSERT INTO notifications (employeeNumber, description, read_status) VALUES (?, ?, 0)',
                    [empNum, notificationDescription],
                    () => {},
                  );
                }
                completed++;
                if (completed === employeeNumbers.length) {
                  notifyMultipleUsers(employeeNumbers, 'notificationCreated', {
                    notification_type: 'suspension',
                    description: notificationDescription,
                  });
                }
              },
            );
          });
        },
      );

      res.status(201).json({
        message: 'Suspension created successfully',
        id: suspensionId,
      });
    }
  );
});

// DELETE: Delete suspension
router.delete('/api/suspensions/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  const getQuery = 'SELECT image FROM suspensions WHERE id = ?';
  db.query(getQuery, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Suspension not found' });
    }
    if (results[0].image) {
      const imagePath = path.join(__dirname, '..', results[0].image);
      fs.unlink(imagePath, (e) => { if (e) console.error('Error deleting image:', e.message); });
    }
    db.query('DELETE FROM suspensions WHERE id = ?', [id], (delErr) => {
      if (delErr) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      broadcastToRoles(
        ['administrator', 'superadmin', 'technical'],
        'adminDashboardUpdated',
        { source: 'suspensions', action: 'deleted', suspensionId: id },
      );
      res.json({ message: 'Suspension deleted successfully' });
    });
  });
});

module.exports = router;
