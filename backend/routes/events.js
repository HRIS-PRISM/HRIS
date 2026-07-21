const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireSelfOrAdmin } = require('../middleware/auth');

const ADMIN_ROLES = ['admin', 'administrator', 'superadmin', 'technical'];

async function assertEventOwnership(req, res, eventId) {
  const [rows] = await db.promise().query(
    'SELECT employee_number FROM events WHERE id = ? LIMIT 1',
    [eventId],
  );
  if (!rows.length) {
    res.status(404).json({ message: 'Event not found' });
    return false;
  }

  const role = String(req.user?.role || '').toLowerCase();
  const caller = String(req.user?.employeeNumber || '').trim();
  const owner = String(rows[0].employee_number || '').trim();

  if (!ADMIN_ROLES.includes(role) && owner !== caller) {
    res.status(403).json({ message: 'Access denied' });
    return false;
  }

  return true;
}

// GET events by employee number
router.get(
  '/api/events/:employeeNumber',
  authenticateToken,
  requireSelfOrAdmin('employeeNumber'),
  async (req, res) => {
    try {
      const { employeeNumber } = req.params;
      const [rows] = await db.promise().query(
        'SELECT * FROM events WHERE employee_number = ? ORDER BY created_at DESC',
        [employeeNumber],
      );
      res.json(rows);
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ message: 'Error fetching events' });
    }
  },
);

// POST: Create event
router.post(
  '/api/events',
  authenticateToken,
  requireSelfOrAdmin('employee_number'),
  async (req, res) => {
    try {
      const { employee_number, date, title, description } = req.body;
      const [result] = await db.promise().query(
        'INSERT INTO events (employee_number, date, title, description) VALUES (?, ?, ?, ?)',
        [employee_number, date, title, description],
      );

      const [newEvent] = await db.promise().query('SELECT * FROM events WHERE id = ?', [
        result.insertId,
      ]);

      res.json(newEvent[0]);
    } catch (error) {
      console.error('Error creating event:', error);
      res.status(500).json({ message: 'Error creating event' });
    }
  },
);

// DELETE: Delete event
router.delete('/api/events/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await assertEventOwnership(req, res, id))) {
      return;
    }
    await db.promise().query('DELETE FROM events WHERE id = ?', [id]);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ message: 'Error deleting event' });
  }
});

module.exports = router;
