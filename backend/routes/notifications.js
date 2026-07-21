const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireSelfOrAdmin } = require('../middleware/auth');

// GET notifications by employee number
router.get('/api/notifications/:employeeNumber', authenticateToken, requireSelfOrAdmin('employeeNumber'), async (req, res) => {
  try {
    const { employeeNumber } = req.params;

    const [rows] = await db.promise().query(
      `SELECT * FROM notifications 
       WHERE CAST(employeeNumber AS CHAR) = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [String(employeeNumber)],
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// GET unread notifications count by employee number
router.get('/api/notifications/:employeeNumber/unread-count', authenticateToken, requireSelfOrAdmin('employeeNumber'), async (req, res) => {
  try {
    const { employeeNumber } = req.params;
    const [rows] = await db.promise().query(
      `SELECT COUNT(*) as count FROM notifications 
       WHERE CAST(employeeNumber AS CHAR) = ? AND read_status = 0`,
      [String(employeeNumber)],
    );
    res.json({ count: rows[0].count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Error fetching unread count' });
  }
});

// PUT: Mark notification as read (must own the notification)
router.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const caller = String(req.user?.employeeNumber || '').trim();
    const role = String(req.user?.role || '').toLowerCase();
    const adminRoles = ['admin', 'administrator', 'superadmin', 'technical'];

    const [rows] = await db.promise().query(
      'SELECT employeeNumber FROM notifications WHERE id = ? LIMIT 1',
      [id],
    );
    if (!rows.length) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const owner = String(rows[0].employeeNumber || '').trim();
    if (!adminRoles.includes(role) && owner !== caller) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [result] = await db.promise().query(
      'UPDATE notifications SET read_status = 1 WHERE id = ?',
      [id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ message: 'Error updating notification' });
  }
});

// PUT: Mark all notifications as read for an employee
router.put('/api/notifications/:employeeNumber/read-all', authenticateToken, requireSelfOrAdmin('employeeNumber'), async (req, res) => {
  try {
    const { employeeNumber } = req.params;
    await db.promise().query(
      'UPDATE notifications SET read_status = 1 WHERE employeeNumber = ?',
      [employeeNumber],
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating notifications:', error);
    res.status(500).json({ message: 'Error updating notifications' });
  }
});

module.exports = router;
