const db = require('../db');
const express = require('express');
const router = express.Router();
const authenticateToken = require('./authMiddleware');

router.use(authenticateToken);

router.get('/leave_table', (req, res) => {
  db.query('SELECT * FROM leave_table', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.post('/leave_table', (req, res) => {
  const { leave_description, leave_code, leave_hours } = req.body;

  if (!leave_description || !leave_code || leave_hours === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query =
    'INSERT INTO leave_table (leave_description, leave_code, leave_hours) VALUES (?, ?, ?)';
  db.query(
    query,
    [leave_description, leave_code, leave_hours],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        id: result.insertId,
        leave_description,
        leave_code,
        leave_hours,
      });
    },
  );
});

router.put('/leave_table/:id', (req, res) => {
  const { id } = req.params;
  const { leave_description, leave_code, leave_hours } = req.body;

  const query =
    'UPDATE leave_table SET leave_description = ?, leave_code = ?, leave_hours = ? WHERE id = ?';
  db.query(
    query,
    [leave_description, leave_code, leave_hours, id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0)
        return res.status(404).json({ error: 'Leave type not found' });
      res.json({ id, leave_description, leave_code, leave_hours });
    },
  );
});

router.delete('/leave_table/:id', (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM leave_table WHERE id = ?';
  db.query(query, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Leave type not found' });
    res.json({ message: 'Deleted successfully' });
  });
});

// ============================
// LEAVE ASSIGNMENT ROUTES (updated)
// ============================

router.get('/leave_assignment', (req, res) => {
  const query = `
    SELECT
      la.*,
      lt.leave_hours as total_hours
    FROM leave_assignment la
    JOIN leave_table lt ON la.leave_code = lt.leave_code
    ORDER BY la.id DESC
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.post('/leave_assignment', (req, res) => {
  const { leave_code, employeeNumber, approve_date } = req.body;

  if (!leave_code || !employeeNumber) {
    return res.status(400).json({
      error: 'Missing required fields: leave_code and employeeNumber',
    });
  }

  // Get leave_hours from leave_table to set as total_hours
  const getLeaveTypeQuery =
    'SELECT leave_hours FROM leave_table WHERE leave_code = ?';
  db.query(getLeaveTypeQuery, [leave_code], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) {
      return res.status(404).json({ error: 'Leave type not found' });
    }

    const totalHours = results[0].leave_hours;

    const insertQuery = `
      INSERT INTO leave_assignment
      (leave_code, employeeNumber, total_hours, remaining_hours, used_hours, approve_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
      insertQuery,
      [
        leave_code,
        employeeNumber,
        totalHours,
        totalHours, // remaining_hours starts as total_hours
        0, // used_hours starts at 0
        approve_date || null,
      ],
      (err2, result) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({
          id: result.insertId,
          leave_code,
          employeeNumber,
          total_hours: totalHours,
          remaining_hours: totalHours,
          used_hours: 0,
          approve_date: approve_date || null,
        });
      },
    );
  });
});

router.put('/leave_assignment/:id', (req, res) => {
  const { id } = req.params;
  const {
    leave_code,
    employeeNumber,
    remaining_hours,
    used_hours,
    approve_date,
  } = req.body;

  // Get total_hours from leave_table
  const getLeaveTypeQuery =
    'SELECT leave_hours FROM leave_table WHERE leave_code = ?';
  db.query(getLeaveTypeQuery, [leave_code], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) {
      return res.status(404).json({ error: 'Leave type not found' });
    }

    const totalHours = results[0].leave_hours;

    const updateQuery = `
      UPDATE leave_assignment
      SET leave_code = ?, employeeNumber = ?, total_hours = ?, remaining_hours = ?, used_hours = ?, approve_date = ?
      WHERE id = ?
    `;

    db.query(
      updateQuery,
      [
        leave_code,
        employeeNumber,
        totalHours,
        remaining_hours || totalHours - (used_hours || 0),
        used_hours || 0,
        approve_date || null,
        id,
      ],
      (err2, result) => {
        if (err2) return res.status(500).json({ error: err2.message });
        if (result.affectedRows === 0)
          return res.status(404).json({ error: 'Leave assignment not found' });

        res.json({
          id,
          leave_code,
          employeeNumber,
          total_hours: totalHours,
          remaining_hours: remaining_hours || totalHours - (used_hours || 0),
          used_hours: used_hours || 0,
          approve_date: approve_date || null,
        });
      },
    );
  });
});

router.delete('/leave_assignment/:id', (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM leave_assignment WHERE id = ?';
  db.query(query, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Leave assignment not found' });
    res.json({ message: 'Deleted successfully' });
  });
});

// ============================
// LEAVE REQUEST ROUTES (updated with proper relationships)
// ============================

// ============================
// LEAVE REQUEST ROUTES
// ============================

router.get('/leave_request', (req, res) => {
  const query = `
    SELECT lr.id, lr.employeeNumber, lr.leave_code,
           lt.leave_description,
           DATE_FORMAT(lr.leave_date, '%Y-%m-%d') AS leave_date,
           lr.status, lr.created_at
    FROM leave_request lr
    LEFT JOIN leave_table lt ON lr.leave_code = lt.leave_code
    ORDER BY lr.leave_date DESC
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.get('/leave_request/:employeeNumber', (req, res) => {
  const { employeeNumber } = req.params;
  const query = `
    SELECT lr.id, lr.employeeNumber, lr.leave_code,
           lt.leave_description,
           DATE_FORMAT(lr.leave_date, '%Y-%m-%d') AS leave_date,
           lr.status, lr.created_at
    FROM leave_request lr
    LEFT JOIN leave_table lt ON lr.leave_code = lt.leave_code
    WHERE lr.employeeNumber = ?
    ORDER BY lr.leave_date DESC
  `;
  db.query(query, [employeeNumber], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Helper to format date
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  if (isNaN(date)) throw new Error(`Invalid date: ${dateStr}`);
  return date.toISOString().split('T')[0];
};

// POST leave_request
router.post('/leave_request', (req, res) => {
  const { employeeNumber, leave_code, leave_dates, status = 0 } = req.body;

  if (
    !employeeNumber ||
    !leave_code ||
    !Array.isArray(leave_dates) ||
    leave_dates.length === 0
  ) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const numStatus = Number(status);
  if (![0, 1, 2, 3, 4].includes(numStatus))
    return res.status(400).json({ error: 'Invalid status value' });

  try {
    const insertValues = leave_dates.map((d) => [
      employeeNumber,
      leave_code,
      formatDate(d),
      numStatus,
    ]);

    db.query(
      'INSERT INTO leave_request (employeeNumber, leave_code, leave_date, status) VALUES ?',
      [insertValues],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        // Optional: Add notification
        const notifQuery =
          'INSERT INTO notifications (employeeNumber, description, read_status) VALUES ?';
        const notifValues = leave_dates.map(() => [
          employeeNumber,
          `${employeeNumber} has added a leave request`,
          0,
        ]);
        db.query(notifQuery, [notifValues], (notifErr) => {
          if (notifErr) console.error('Notification error:', notifErr);
        });

        res.json({
          message: 'Leave request(s) created',
          inserted: result.affectedRows,
        });
      },
    );
  } catch (error) {
    return res.status(400).json({ error: 'Invalid date format' });
  }
});

// PUT leave_request/:id
router.put('/leave_request/:id', (req, res) => {
  const { id } = req.params;
  const { employeeNumber, leave_code, leave_date, status } = req.body;

  const numStatus = Number(status);
  if (![0, 1, 2, 3, 4].includes(numStatus))
    return res.status(400).json({ error: 'Invalid status value' });

  let formattedDate;
  if (leave_date) {
    const d = new Date(leave_date);
    if (isNaN(d)) return res.status(400).json({ error: 'Invalid date' });
    formattedDate = d.toISOString().split('T')[0];
  }

  const query =
    'UPDATE leave_request SET employeeNumber = ?, leave_code = ?, leave_date = ?, status = ? WHERE id = ?';
  db.query(
    query,
    [employeeNumber, leave_code, formattedDate, numStatus, id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0)
        return res.status(404).json({ error: 'Leave request not found' });

      // Optional: add notification
      const notifQuery =
        'INSERT INTO notifications (employeeNumber, description, read_status) VALUES (?, ?, 0)';
      db.query(
        notifQuery,
        [employeeNumber, `Your leave request status has been updated`],
        (notifErr) => {
          if (notifErr) console.error('Notification error:', notifErr);
        },
      );

      // Leave balances are driven by leave_credit_usage + /api/leave HR approval.
      // This legacy dashboard route must not overwrite leave_assignment totals.
      res.json({ message: 'Leave request updated successfully' });
    },
  );
});

router.put('/leave_request/:id/admin-cancel', (req, res) => {
  const { id } = req.params;
  const { cancelledBy } = req.body; // Optional: track who cancelled it

  // First, get the current leave request details
  const getRequestQuery = `
    SELECT employeeNumber, leave_code, status
    FROM leave_request
    WHERE id = ?
  `;

  db.query(getRequestQuery, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    const { employeeNumber, leave_code, status } = results[0];

    // Admin can cancel any request except those already cancelled
    if (status === 4) {
      return res.status(400).json({
        error: 'This request is already cancelled.',
      });
    }

    // Update status to cancelled (4)
    const updateQuery = 'UPDATE leave_request SET status = 4 WHERE id = ?';

    db.query(updateQuery, [id], (err2, updateResult) => {
      if (err2) return res.status(500).json({ error: err2.message });
      if (updateResult.affectedRows === 0) {
        return res.status(404).json({ error: 'Leave request not found' });
      }

      // Add notification to employee
      const notifQuery = `
        INSERT INTO notifications (employeeNumber, description, read_status)
        VALUES (?, ?, 0)
      `;
      const message = cancelledBy
        ? `Your leave request has been cancelled by ${cancelledBy}`
        : 'Your leave request has been cancelled by HR/Admin';

      db.query(notifQuery, [employeeNumber, message], (notifErr) => {
        if (notifErr) console.error('Notification error:', notifErr);
      });

      res.json({
        message: 'Leave request cancelled successfully by admin',
        id: parseInt(id),
        status: 4,
        previousStatus: status,
      });
    });
  });
});

// DELETE leave_request/:id
router.delete('/leave_request/:id', (req, res) => {
  const { id } = req.params;

  db.query(
    'SELECT employeeNumber, leave_code, status FROM leave_request WHERE id = ?',
    [id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0)
        return res.status(404).json({ error: 'Leave request not found' });

      const { employeeNumber, leave_code, status } = results[0];

      db.query('DELETE FROM leave_request WHERE id = ?', [id], (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });

        res.json({
          message:
            status === 2
              ? 'Leave request deleted. If this request had deducted credits via /api/leave, reverse that in the main Leave module if needed.'
              : 'Leave request deleted successfully',
        });
      });
    },
  );
});

module.exports = router;
