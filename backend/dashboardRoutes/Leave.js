const db = require('../db');
const express = require('express');
const router = express.Router();






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
    }
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
    }
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
      }
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
      }
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
    SELECT id, employeeNumber, leave_code,
           DATE_FORMAT(leave_date, '%Y-%m-%d') AS leave_date,
           status, created_at
    FROM leave_request
    ORDER BY leave_date DESC
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});


router.get('/leave_request/:employeeNumber', (req, res) => {
  const { employeeNumber } = req.params;
  const query = `
    SELECT id, employeeNumber, leave_code,
           DATE_FORMAT(leave_date, '%Y-%m-%d') AS leave_date,
           status, created_at
    FROM leave_request
    WHERE employeeNumber = ?
    ORDER BY leave_date DESC
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
      }
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
        }
      );


      // If status is HR Approved (2), recalculate leave_assignment
      if (numStatus === 2) {
        // 1. Count all HR Approved requests for this employee/leave_code
        const countQuery = 'SELECT COUNT(*) as approved_days FROM leave_request WHERE employeeNumber = ? AND leave_code = ? AND status = 2';
        db.query(countQuery, [employeeNumber, leave_code], (err3, countResults) => {
          if (err3) return res.status(500).json({ error: err3.message });
          // 2. Get leave_hours for this leave_code
          const getHoursQuery = 'SELECT leave_hours FROM leave_table WHERE leave_code = ?';
          db.query(getHoursQuery, [leave_code], (err4, hoursResults) => {
            if (err4) return res.status(500).json({ error: err4.message });
            const leaveHours = hoursResults[0]?.leave_hours || 8;
            const usedHours = (countResults[0].approved_days || 0) * leaveHours;
            // 3. Update leave_assignment
            const updateAssignmentQuery = `
              UPDATE leave_assignment la
              JOIN leave_table lt ON la.leave_code = lt.leave_code
              SET la.used_hours = ?, la.remaining_hours = la.allocated_hours - ?, la.total_hours = la.allocated_hours
              WHERE la.employeeNumber = ? AND la.leave_code = ?
            `;
            db.query(updateAssignmentQuery, [usedHours, usedHours, employeeNumber, leave_code], (err5) => {
              if (err5) return res.status(500).json({ error: err5.message });
              res.json({ message: 'Leave request updated and leave credits deducted successfully' });
            });
          });
        });
      } else {
        res.json({ message: 'Leave request updated successfully' });
      }
    }
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


      // If the request was HR approved (status 2), recalculate leave_assignment
      if (status === 2) {
        updateLeaveAssignment(employeeNumber, leave_code, (err) => {
          if (err) {
            console.error(
              'Error updating leave assignment after admin cancellation:',
              err
            );
          }
        });
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


        // Recalculate leave_assignment if approved
        if (status === 2) {
          const countQuery =
            'SELECT COUNT(*) as approved_days FROM leave_request WHERE employeeNumber = ? AND leave_code = ? AND status = 2';
          db.query(
            countQuery,
            [employeeNumber, leave_code],
            (err3, countResults) => {
              if (err3) return res.status(500).json({ error: err3.message });


              const usedHours = (countResults[0].approved_days || 0) * 8;
              const updateAssignmentQuery = `
            UPDATE leave_assignment la
            JOIN leave_table lt ON la.leave_code = lt.leave_code
            SET la.used_hours = ?, la.remaining_hours = lt.leave_hours - ?, la.total_hours = lt.leave_hours
            WHERE la.employeeNumber = ? AND la.leave_code = ?
          `;
              db.query(
                updateAssignmentQuery,
                [usedHours, usedHours, employeeNumber, leave_code],
                (err4) => {
                  if (err4)
                    return res.status(500).json({ error: err4.message });
                  res.json({
                    message:
                      'Leave request deleted and leave assignments recalculated',
                  });
                }
              );
            }
          );
        } else {
          res.json({ message: 'Leave request deleted successfully' });
        }
      });
    }
  );
});


module.exports = router;



