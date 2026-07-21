const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireSelfOrAdmin } = require('../middleware/auth');

const ADMIN_ROLES = ['admin', 'administrator', 'superadmin', 'technical'];

async function assertNoteOwnership(req, res, noteId) {
  const [rows] = await db.promise().query(
    'SELECT employee_number FROM notes WHERE id = ? LIMIT 1',
    [noteId],
  );
  if (!rows.length) {
    res.status(404).json({ message: 'Note not found' });
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

// GET notes by employee number
router.get(
  '/api/notes/:employeeNumber',
  authenticateToken,
  requireSelfOrAdmin('employeeNumber'),
  async (req, res) => {
    try {
      const { employeeNumber } = req.params;
      const [rows] = await db.promise().query(
        'SELECT * FROM notes WHERE employee_number = ? ORDER BY created_at DESC',
        [employeeNumber],
      );
      res.json(rows);
    } catch (error) {
      console.error('Error fetching notes:', error);
      res.status(500).json({ message: 'Error fetching notes' });
    }
  },
);

// POST: Create note
router.post(
  '/api/notes',
  authenticateToken,
  requireSelfOrAdmin('employee_number'),
  async (req, res) => {
    try {
      const { employee_number, date, content } = req.body;
      const [result] = await db.promise().query(
        'INSERT INTO notes (employee_number, date, content) VALUES (?, ?, ?)',
        [employee_number, date, content],
      );

      const [newNote] = await db.promise().query('SELECT * FROM notes WHERE id = ?', [
        result.insertId,
      ]);

      res.json(newNote[0]);
    } catch (error) {
      console.error('Error creating note:', error);
      res.status(500).json({ message: 'Error creating note' });
    }
  },
);

// DELETE: Delete note
router.delete('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await assertNoteOwnership(req, res, id))) {
      return;
    }
    await db.promise().query('DELETE FROM notes WHERE id = ?', [id]);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ message: 'Error deleting note' });
  }
});

module.exports = router;
