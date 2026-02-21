const express = require('express');
const router = express.Router();
const db = require('../db');

// Socket.IO instance will be injected by the main app
let io;
router.setSocketIO = (socketIO) => {
  io = socketIO;
};

// Helper to emit Socket.IO events
const emitLeaveChange = (eventName) => {
  if (io) {
    io.emit(eventName);
    console.log(`[Socket.IO] Emitted ${eventName}`);
  }
};

// ============================================
// EMPLOYEES (for dropdown selection)
// ============================================

// GET all employees for dropdown
router.get('/employees', (req, res) => {
  const query = `
    SELECT 
      u.employeeNumber,
      u.email,
      u.role,
      p.firstName,
      p.middleName,
      p.lastName,
      p.nameExtension,
      CONCAT_WS(' ', p.firstName, p.middleName, p.lastName, p.nameExtension) as fullName
    FROM users u
    LEFT JOIN person_table p ON u.employeeNumber = p.agencyEmployeeNum
    WHERE u.role != 'superadmin'
    ORDER BY p.lastName, p.firstName
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching employees:', err);
      return res.status(500).json({ error: 'Failed to fetch employees' });
    }
    console.log(
      `[LeaveRoute] Fetched ${results.length} employees for dropdown`,
    );
    res.json(results);
  });
});

// ============================================
// LEAVE TABLE (Universal Leave Types)
// ============================================

// GET all leave types
router.get('/leave_table', (req, res) => {
  const query = 'SELECT * FROM leave_table ORDER BY leave_code';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching leave types:', err);
      return res.status(500).json({ error: 'Failed to fetch leave types' });
    }
    res.json(results);
  });
});

// POST create new leave type
router.post('/leave_table', (req, res) => {
  const { leave_code, leave_description, leave_hours } = req.body;
  const query =
    'INSERT INTO leave_table (leave_code, leave_description, leave_hours) VALUES (?, ?, ?)';
  db.query(
    query,
    [leave_code, leave_description, leave_hours || 0],
    (err, result) => {
      if (err) {
        console.error('Error creating leave type:', err);
        return res.status(500).json({ error: 'Failed to create leave type' });
      }
      res.json({
        id: result.insertId,
        leave_code,
        leave_description,
        leave_hours,
      });
    },
  );
});

// PUT update leave type
router.put('/leave_table/:id', (req, res) => {
  const { id } = req.params;
  const { leave_code, leave_description, leave_hours } = req.body;
  const query =
    'UPDATE leave_table SET leave_code = ?, leave_description = ?, leave_hours = ? WHERE id = ?';
  db.query(
    query,
    [leave_code, leave_description, leave_hours, id],
    (err, result) => {
      if (err) {
        console.error('Error updating leave type:', err);
        return res.status(500).json({ error: 'Failed to update leave type' });
      }
      res.json({ id, leave_code, leave_description, leave_hours });
    },
  );
});

// DELETE leave type
router.delete('/leave_table/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM leave_table WHERE id = ?';
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error deleting leave type:', err);
      return res.status(500).json({ error: 'Failed to delete leave type' });
    }
    res.json({ message: 'Leave type deleted successfully' });
  });
});

// ============================================
// LEAVE ASSIGNMENT (Per-Employee Credits)
// ============================================

// GET all leave assignments with employee names
router.get('/leave_assignment', (req, res) => {
  const query = `
    SELECT 
      la.id,
      la.employeeNumber,
      la.leave_code,
      la.total_hours,
      la.remaining_hours,
      la.used_hours,
      la.approve_date AS approved_date,
      la.carried_forward_hours,
      la.allocated_hours,
      la.period_year,
      la.period_semester,
      lt.leave_description,
      lt.leave_hours as default_hours,
      p.firstName,
      p.middleName,
      p.lastName,
      p.nameExtension,
      CONCAT_WS(' ', p.firstName, p.middleName, p.lastName, p.nameExtension) as fullName
    FROM leave_assignment la
    LEFT JOIN leave_table lt ON la.leave_code = lt.leave_code
    LEFT JOIN person_table p ON la.employeeNumber = p.agencyEmployeeNum
    ORDER BY p.lastName, p.firstName, la.leave_code
  `;

  console.log('[GET /leave_assignment] Query executing...');
  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ [GET /leave_assignment] Database Error:', err.message);
      console.error('❌ SQL Error Code:', err.code);
      console.error('❌ SQL Error SQL:', err.sql);
      return res
        .status(500)
        .json({ error: 'Failed to fetch leave assignments: ' + err.message });
    }
    console.log(
      '[GET /leave_assignment] ✅ Success, returned ' +
        results.length +
        ' records',
    );
    res.json(results);
  });
});

// GET leave assignments by employee number
router.get('/leave_assignment/employee/:employeeNumber', (req, res) => {
  const { employeeNumber } = req.params;
  const query = `
    SELECT 
      la.id,
      la.employeeNumber,
      la.leave_code,
      la.total_hours,
      la.remaining_hours,
      la.used_hours,
      la.approve_date AS approved_date,
      la.carried_forward_hours,
      la.allocated_hours,
      la.period_year,
      la.period_semester,
      lt.leave_description
    FROM leave_assignment la
    LEFT JOIN leave_table lt ON la.leave_code = lt.leave_code
    WHERE la.employeeNumber = ?
  `;

  db.query(query, [employeeNumber], (err, results) => {
    if (err) {
      console.error('Error fetching employee leave assignments:', err);
      return res
        .status(500)
        .json({ error: 'Failed to fetch leave assignments' });
    }
    res.json(results);
  });
});

// GET calculate available carry forward hours for an employee and leave type
router.get(
  '/leave_assignment/calculate-carryforward/:employeeNumber/:leave_code',
  (req, res) => {
    const { employeeNumber, leave_code } = req.params;

    console.log(
      `[Calculate Carryforward] Employee: ${employeeNumber}, Leave Code: ${leave_code}`,
    );

    // Find the most recent assignment for this employee and leave type
    const query = `
    SELECT 
      id,
      remaining_hours,
      period_year,
      period_semester,
      allocated_hours,
      carried_forward_hours,
      total_hours,
      used_hours
    FROM leave_assignment
    WHERE employeeNumber = ? AND leave_code = ?
    ORDER BY period_year DESC, 
             CASE 
               WHEN period_semester = '2nd' THEN 3
               WHEN period_semester = '1st' THEN 2
               ELSE 1
             END DESC
    LIMIT 1
  `;

    db.query(query, [employeeNumber, leave_code], (err, results) => {
      if (err) {
        console.error('Error calculating carry forward:', err);
        return res
          .status(500)
          .json({ error: 'Failed to calculate carry forward' });
      }

      if (results.length === 0) {
        // No previous assignment found
        console.log(`[Calculate Carryforward] No previous assignment found`);
        return res.json({
          hasHistory: false,
          suggestedCarryForward: 0,
          previousPeriod: null,
          message:
            'No previous leave assignment found for this employee and leave type',
        });
      }

      const previousAssignment = results[0];
      const suggestedCarryForward = previousAssignment.remaining_hours || 0;

      console.log(`[Calculate Carryforward] Found previous assignment:`, {
        id: previousAssignment.id,
        period: `${previousAssignment.period_year} ${previousAssignment.period_semester || ''}`,
        remaining: previousAssignment.remaining_hours,
        suggested: suggestedCarryForward,
      });

      res.json({
        hasHistory: true,
        suggestedCarryForward: suggestedCarryForward,
        previousPeriod: {
          year: previousAssignment.period_year,
          semester: previousAssignment.period_semester,
          total_hours: previousAssignment.total_hours,
          used_hours: previousAssignment.used_hours,
          remaining_hours: previousAssignment.remaining_hours,
          allocated_hours: previousAssignment.allocated_hours,
          carried_forward_hours: previousAssignment.carried_forward_hours,
        },
        message:
          suggestedCarryForward > 0
            ? `Employee has ${suggestedCarryForward} unused hours from previous period`
            : 'Employee has no unused hours from previous period',
      });
    });
  },
);

// POST create new leave assignment (assign leave type to employee)
router.post('/leave_assignment', (req, res) => {
  console.log('\n==============================================');
  console.log('POST /leave_assignment CALLED');
  console.log('req.body:', JSON.stringify(req.body, null, 2));
  console.log('==============================================\n');

  const {
    employeeNumber,
    leave_code,
    total_hours,
    carried_forward_hours,
    allocated_hours,
    period_year,
    period_semester,
  } = req.body;

  console.log('=== POST /leave_assignment received ===');
  console.log('employeeNumber:', employeeNumber);
  console.log('leave_code:', leave_code);
  console.log('total_hours:', total_hours);
  console.log('typeof total_hours:', typeof total_hours);

  // First check if assignment already exists for THIS period
  const checkQuery =
    'SELECT id FROM leave_assignment WHERE employeeNumber = ? AND leave_code = ? AND period_year = ? AND period_semester <=> ?';
  db.query(
    checkQuery,
    [
      employeeNumber,
      leave_code,
      period_year || new Date().getFullYear(),
      period_semester,
    ],
    (checkErr, existing) => {
      if (checkErr) {
        console.error('Error checking existing assignment:', checkErr);
        return res
          .status(500)
          .json({ error: 'Failed to check existing assignment' });
      }

      if (existing.length > 0) {
        return res
          .status(400)
          .json({
            error:
              'This employee already has an assignment for this leave type and period',
          });
      }

      // Check if custom hours were provided
      const customHoursProvided =
        req.body.hasOwnProperty('total_hours') &&
        total_hours !== null &&
        total_hours !== undefined &&
        total_hours !== '';

      console.log('→ customHoursProvided:', customHoursProvided);
      console.log(
        '→ total_hours value:',
        total_hours,
        'type:',
        typeof total_hours,
      );

      if (customHoursProvided) {
        // Use custom hours provided by admin
        const customHours = Number(total_hours);
        const carriedForward = Number(carried_forward_hours) || 0;
        const allocated = Number(allocated_hours) || customHours;
        const currentYear = period_year || new Date().getFullYear();
        const semester = period_semester || null;

        console.log('Using custom hours:', customHours);
        console.log('Carried forward:', carriedForward);
        console.log('Allocated:', allocated);
        console.log('Period:', currentYear, semester);
        console.log('Type of customHours:', typeof customHours);
        console.log(
          'leave_code:',
          leave_code,
          'employeeNumber:',
          employeeNumber,
        );

        const insertQuery = `
        INSERT INTO leave_assignment (leave_code, employeeNumber, total_hours, remaining_hours, used_hours, approve_date, carried_forward_hours, allocated_hours, period_year, period_semester)
        VALUES (?, ?, ?, ?, 0, NULL, ?, ?, ?, ?)
      `;

        const insertValues = [
          leave_code,
          employeeNumber,
          customHours,
          customHours,
          carriedForward,
          allocated,
          currentYear,
          semester,
        ];
        console.log('Executing INSERT with values:', insertValues);
        console.log('Full INSERT query:', insertQuery);

        db.query(insertQuery, insertValues, (insertErr, result) => {
          if (insertErr) {
            console.error('❌ INSERT ERROR:', insertErr);
            console.error('Failed query:', insertQuery);
            console.error('Failed values:', insertValues);
            return res
              .status(500)
              .json({
                error:
                  'Failed to create leave assignment: ' + insertErr.message,
              });
          }

          console.log(
            '✅ Successfully inserted assignment with ID:',
            result.insertId,
          );

          // Verify what was actually inserted
          db.query(
            'SELECT * FROM leave_assignment WHERE id = ?',
            [result.insertId],
            (verifyErr, verifyResult) => {
              if (!verifyErr && verifyResult.length > 0) {
                console.log('📋 Verified inserted record:', verifyResult[0]);
              }
            },
          );

          emitLeaveChange('leaveAssignmentChanged'); // Notify clients to refresh

          res.json({
            id: result.insertId,
            leave_code,
            employeeNumber,
            total_hours: customHours,
            remaining_hours: customHours,
            used_hours: 0,
            approved_date: null,
            carried_forward_hours: carriedForward,
            allocated_hours: allocated,
            period_year: currentYear,
            period_semester: semester,
          });
        });
      } else {
        // Use default hours from leave_table
        const getHoursQuery =
          'SELECT leave_hours FROM leave_table WHERE leave_code = ?';
        db.query(getHoursQuery, [leave_code], (hoursErr, leaveType) => {
          if (hoursErr) {
            console.error('Error fetching leave type:', hoursErr);
            return res
              .status(500)
              .json({ error: 'Failed to fetch leave type' });
          }

          const defaultHours = leaveType[0]?.leave_hours || 0;
          const carriedForward = Number(carried_forward_hours) || 0;
          const allocated = Number(allocated_hours) || defaultHours;
          const currentYear = period_year || new Date().getFullYear();
          const semester = period_semester || null;

          const insertQuery = `
          INSERT INTO leave_assignment (leave_code, employeeNumber, total_hours, remaining_hours, used_hours, approve_date, carried_forward_hours, allocated_hours, period_year, period_semester)
          VALUES (?, ?, ?, ?, 0, NULL, ?, ?, ?, ?)
        `;

          db.query(
            insertQuery,
            [
              leave_code,
              employeeNumber,
              defaultHours,
              defaultHours,
              carriedForward,
              allocated,
              currentYear,
              semester,
            ],
            (insertErr, result) => {
              if (insertErr) {
                console.error('Error creating leave assignment:', insertErr);
                return res
                  .status(500)
                  .json({ error: 'Failed to create leave assignment' });
              }

              emitLeaveChange('leaveAssignmentChanged'); // Notify clients to refresh

              res.json({
                id: result.insertId,
                leave_code,
                employeeNumber,
                total_hours: defaultHours,
                remaining_hours: defaultHours,
                used_hours: 0,
                approved_date: null,
                carried_forward_hours: carriedForward,
                allocated_hours: allocated,
                period_year: currentYear,
                period_semester: semester,
              });
            },
          );
        });
      }
    },
  );
});

// PUT update leave assignment (edit employee's leave credits)
router.put('/leave_assignment/:id', (req, res) => {
  const { id } = req.params;
  const {
    employeeNumber,
    leave_code,
    remaining_hours,
    total_hours,
    carried_forward_hours,
    allocated_hours,
    period_year,
    period_semester,
  } = req.body;

  console.log(
    '\n========== [PUT /leave_assignment/:id] REQUEST RECEIVED ==========',
  );
  console.log('[PUT] ID from URL params:', id);
  console.log('[PUT] Body received:', {
    employeeNumber,
    leave_code,
    remaining_hours,
    total_hours,
    carried_forward_hours,
    allocated_hours,
    period_year,
    period_semester,
  });

  // Get current assignment to calculate used_hours
  const getCurrentQuery = 'SELECT * FROM leave_assignment WHERE id = ?';
  db.query(getCurrentQuery, [id], (err, current) => {
    if (err) {
      console.error('[PUT] Error fetching current assignment:', err);
      return res.status(500).json({ error: 'Failed to fetch assignment' });
    }

    if (current.length === 0) {
      console.error('[PUT] Assignment not found with ID:', id);
      return res.status(404).json({ error: 'Assignment not found' });
    }

    console.log('[PUT] Current assignment from DB:', current[0]);

    // Use provided values or keep existing
    const newTotal =
      total_hours !== undefined
        ? parseFloat(total_hours)
        : current[0].total_hours;
    const newRemaining = parseFloat(remaining_hours) || 0;
    const newUsed = Math.max(0, newTotal - newRemaining);
    const newCarriedForward =
      carried_forward_hours !== undefined
        ? parseFloat(carried_forward_hours)
        : current[0].carried_forward_hours || 0;
    const newAllocated =
      allocated_hours !== undefined
        ? parseFloat(allocated_hours)
        : current[0].allocated_hours || newTotal;
    const newYear =
      period_year !== undefined ? period_year : current[0].period_year;
    const newSemester =
      period_semester !== undefined
        ? period_semester
        : current[0].period_semester;

    console.log('[PUT] Calculated new values:', {
      newTotal,
      newRemaining,
      newUsed,
      newCarriedForward,
      newAllocated,
      newYear,
      newSemester,
    });

    const updateQuery = `
      UPDATE leave_assignment 
      SET leave_code = ?, employeeNumber = ?, total_hours = ?, remaining_hours = ?, used_hours = ?, 
          carried_forward_hours = ?, allocated_hours = ?, period_year = ?, period_semester = ?
      WHERE id = ?
    `;

    console.log('[PUT] Executing update query with values:', [
      leave_code,
      employeeNumber,
      newTotal,
      newRemaining,
      newUsed,
      newCarriedForward,
      newAllocated,
      newYear,
      newSemester,
      id,
    ]);

    db.query(
      updateQuery,
      [
        leave_code,
        employeeNumber,
        newTotal,
        newRemaining,
        newUsed,
        newCarriedForward,
        newAllocated,
        newYear,
        newSemester,
        id,
      ],
      (updateErr, result) => {
        if (updateErr) {
          console.error('[PUT] Error executing UPDATE query:', updateErr);
          return res
            .status(500)
            .json({ error: 'Failed to update leave assignment' });
        }

        console.log(
          '[PUT] Update successful. Rows affected:',
          result.affectedRows,
        );

        emitLeaveChange('leaveAssignmentChanged'); // Notify clients to refresh

        const responseData = {
          id,
          leave_code,
          employeeNumber,
          total_hours: newTotal,
          remaining_hours: newRemaining,
          used_hours: newUsed,
          carried_forward_hours: newCarriedForward,
          allocated_hours: newAllocated,
          period_year: newYear,
          period_semester: newSemester,
        };

        console.log('[PUT] Sending response:', responseData);
        console.log(
          '========== [PUT /leave_assignment/:id] COMPLETED SUCCESSFULLY ==========\n',
        );

        res.json(responseData);
      },
    );
  });
});

// DELETE leave assignment
router.delete('/leave_assignment/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM leave_assignment WHERE id = ?';

  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error deleting leave assignment:', err);
      return res
        .status(500)
        .json({ error: 'Failed to delete leave assignment' });
    }
    emitLeaveChange('leaveAssignmentChanged'); // Notify clients to refresh
    res.json({ message: 'Leave assignment deleted successfully' });
  });
});

// ============================================
// LEAVE REQUESTS
// ============================================

// GET all leave requests
router.get('/leave_request', (req, res) => {
  const query = `
    SELECT lr.*, 
      lt.leave_description,
      p.firstName, p.lastName,
      CONCAT_WS(' ', p.firstName, p.middleName, p.lastName, p.nameExtension) as fullName,
      DATE_FORMAT(lr.leave_date, '%Y-%m-%d') as leave_date,
      DATE_FORMAT(lr.created_at, '%Y-%m-%d %H:%i:%s') as created_at
    FROM leave_request lr
    LEFT JOIN leave_table lt ON lr.leave_code = lt.leave_code
    LEFT JOIN person_table p ON lr.employeeNumber = p.agencyEmployeeNum
    ORDER BY lr.created_at DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching leave requests:', err);
      return res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
    res.json(results);
  });
});

// GET leave requests by employee
router.get('/leave_request/:employeeNumber', (req, res) => {
  const { employeeNumber } = req.params;
  const query = `
    SELECT lr.*, 
      lt.leave_description,
      DATE_FORMAT(lr.leave_date, '%Y-%m-%d') as leave_date,
      DATE_FORMAT(lr.created_at, '%Y-%m-%d %H:%i:%s') as created_at
    FROM leave_request lr
    LEFT JOIN leave_table lt ON lr.leave_code = lt.leave_code
    WHERE lr.employeeNumber = ?
    ORDER BY lr.created_at DESC
  `;

  db.query(query, [employeeNumber], (err, results) => {
    if (err) {
      console.error('Error fetching employee leave requests:', err);
      return res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
    res.json(results);
  });
});

// POST create new leave request (can be multiple dates)
router.post('/leave_request', (req, res) => {
  const { employeeNumber, leave_code, leave_dates, status } = req.body;

  // leave_dates should be an array of dates
  const dates = Array.isArray(leave_dates) ? leave_dates : [leave_dates];

  if (dates.length === 0) {
    return res
      .status(400)
      .json({ error: 'At least one leave date is required' });
  }

  // Insert each date as a separate record
  const insertPromises = dates.map((date) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO leave_request (employeeNumber, leave_code, leave_date, status, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `;

      db.query(
        query,
        [employeeNumber, leave_code, date, status || 0],
        (err, result) => {
          if (err) {
            console.error('Error inserting leave request:', err);
            reject(err);
          } else {
            resolve(result);
          }
        },
      );
    });
  });

  Promise.all(insertPromises)
    .then(() => {
      emitLeaveChange('leaveRequestChanged'); // Notify clients to refresh
      res.json({
        message: 'Leave requests created successfully',
        count: dates.length,
      });
    })
    .catch((err) => {
      console.error('Error creating leave requests:', err);
      res.status(500).json({ error: 'Failed to create leave requests' });
    });
});

// BULK UPDATE leave_request status (MUST be before :id route)
router.put('/leave_request/bulk-update', (req, res) => {
  const { ids, status } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids must be a non-empty array' });
  }

  const newStatus = Number(status);
  if (![0, 1, 2, 3, 4].includes(newStatus)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  const placeholders = ids.map(() => '?').join(',');
  const getRequestsQuery = `
    SELECT id, employeeNumber, leave_code, leave_date, status
    FROM leave_request
    WHERE id IN (${placeholders})
  `;

  db.query(getRequestsQuery, ids, (err, requests) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (requests.length === 0) {
      return res
        .status(404)
        .json({ error: 'No leave requests found with provided IDs' });
    }

    const updateQuery = `UPDATE leave_request SET status = ? WHERE id IN (${placeholders})`;
    db.query(updateQuery, [newStatus, ...ids], (updateErr, result) => {
      if (updateErr) {
        return res.status(500).json({ error: updateErr.message });
      }

      let processedCount = 0;
      const processDone = () => {
        processedCount++;
        if (processedCount >= requests.length) {
          emitLeaveChange('leaveRequestChanged');
          res.json({
            message: 'Bulk update successful',
            updated: requests.length,
            newStatus,
          });
        }
      };

      requests.forEach((req) => {
        const {
          id,
          employeeNumber,
          leave_code,
          leave_date,
          status: oldStatus,
        } = req;
        const oldStatusNum = Number(oldStatus);

        const parsedDate = leave_date ? new Date(leave_date) : null;
        const hasValidDate = parsedDate && !Number.isNaN(parsedDate.getTime());
        const targetYear = hasValidDate ? parsedDate.getFullYear() : null;
        const targetSemester = hasValidDate
          ? parsedDate.getMonth() < 6
            ? '1st semester'
            : '2nd semester'
          : null;

        const getAssignmentQuery = `
          SELECT *
          FROM leave_assignment
          WHERE employeeNumber = ? AND TRIM(leave_code) = TRIM(?)
            AND (? IS NULL OR period_year = ?)
            AND (
              ? IS NULL
              OR period_semester <=> ?
              OR period_semester IS NULL
            )
          ORDER BY period_year DESC,
            CASE
              WHEN period_semester IN ('2nd', '2nd semester') THEN 2
              WHEN period_semester IN ('1st', '1st semester') THEN 1
              ELSE 0
            END DESC
          LIMIT 1
        `;

        const fallbackAssignmentQuery = `
          SELECT *
          FROM leave_assignment
          WHERE employeeNumber = ? AND TRIM(leave_code) = TRIM(?)
          ORDER BY period_year DESC,
            CASE
              WHEN period_semester IN ('2nd', '2nd semester') THEN 2
              WHEN period_semester IN ('1st', '1st semester') THEN 1
              ELSE 0
            END DESC
          LIMIT 1
        `;

        const updateAssignment = (deltaHours) => {
          db.query(
            getAssignmentQuery,
            [
              employeeNumber,
              leave_code,
              targetYear,
              targetYear,
              targetSemester,
              targetSemester,
            ],
            (assignErr, assignment) => {
              const applyDelta = (assignmentRow) => {
                const currentRemaining =
                  parseFloat(assignmentRow.remaining_hours) || 0;
                const currentUsed = parseFloat(assignmentRow.used_hours) || 0;
                const newRemaining = Math.max(0, currentRemaining - deltaHours);
                const newUsed = Math.max(0, currentUsed + deltaHours);

                const updateAssignmentQuery =
                  'UPDATE leave_assignment SET remaining_hours = ?, used_hours = ? WHERE id = ?';
                db.query(
                  updateAssignmentQuery,
                  [newRemaining, newUsed, assignmentRow.id],
                  (updateAssignErr) => {
                    if (updateAssignErr) {
                      console.error(
                        'Bulk update credit error:',
                        updateAssignErr,
                      );
                    }
                    return processDone();
                  },
                );
              };

              if (assignErr || assignment.length === 0) {
                if (assignErr) {
                  console.error('Bulk update assignment error:', assignErr);
                }
                return db.query(
                  fallbackAssignmentQuery,
                  [employeeNumber, leave_code],
                  (fallbackErr, fallbackAssignment) => {
                    if (fallbackErr || fallbackAssignment.length === 0) {
                      if (fallbackErr) {
                        console.error(
                          'Bulk update fallback error:',
                          fallbackErr,
                        );
                      }
                      return processDone();
                    }
                    return applyDelta(fallbackAssignment[0]);
                  },
                );
              }

              return applyDelta(assignment[0]);
            },
          );
        };

        // Deduct when HR approves (status changes to 2)
        if (newStatus === 2 && oldStatusNum !== 2) {
          return updateAssignment(8);
        }

        // Restore when cancelled/denied AFTER HR approved
        if (oldStatusNum === 2 && (newStatus === 3 || newStatus === 4)) {
          return updateAssignment(-8);
        }

        return processDone();
      });
    });
  });
});

// PUT update leave request (employee edits or admin changes status)
router.put('/leave_request/:id', (req, res) => {
  const { id } = req.params;
  const { employeeNumber, leave_code, leave_date, status } = req.body;

  console.log('=== PUT /leave_request/:id called ===');
  console.log('Request ID:', id);
  console.log('Request body:', {
    employeeNumber,
    leave_code,
    leave_date,
    status,
  });

  // Get current request details first to check old status
  const getCurrentQuery = 'SELECT * FROM leave_request WHERE id = ?';

  db.query(getCurrentQuery, [id], (err, currentReq) => {
    if (err) {
      console.error('Error fetching request:', err);
      return res.status(500).json({ error: 'Failed to fetch request' });
    }

    if (currentReq.length === 0) {
      console.error('Leave request not found for id:', id);
      return res.status(404).json({ error: 'Leave request not found' });
    }

    const request = currentReq[0];
    const oldStatus = parseInt(request.status);
    const newStatus = parseInt(status);

    console.log('Current request data:', request);
    console.log('Old Status:', oldStatus, 'New Status:', newStatus);
    console.log('Status change:', `${oldStatus} -> ${newStatus}`);

    // Helper function to update status
    const updateStatus = () => {
      const updateQuery = `
        UPDATE leave_request 
        SET employeeNumber = ?, leave_code = ?, leave_date = ?, status = ?
        WHERE id = ?
      `;

      console.log('Updating leave_request with:', {
        employeeNumber,
        leave_code,
        leave_date,
        status: newStatus,
        id,
      });

      db.query(
        updateQuery,
        [employeeNumber, leave_code, leave_date, newStatus, id],
        (updateErr) => {
          if (updateErr) {
            console.error('Error updating status:', updateErr);
            return res.status(500).json({ error: 'Failed to update status' });
          }

          console.log('Leave request updated successfully');
          emitLeaveChange('leaveRequestChanged'); // Notify clients to refresh

          res.json({
            id,
            employeeNumber,
            leave_code,
            leave_date,
            status: newStatus,
            message: 'Status updated successfully',
          });
        },
      );
    };

    // Status: 0=Pending, 1=Manager Approved, 2=HR Approved, 3=Denied, 4=Cancelled

    // DEDUCT credits when HR approves (status changes to 2)
    // Each leave_date record represents 8 hours (1 day)
    if (newStatus === 2 && oldStatus !== 2) {
      const effectiveLeaveDate = leave_date || request.leave_date;
      const parsedDate = effectiveLeaveDate
        ? new Date(effectiveLeaveDate)
        : null;
      const hasValidDate = parsedDate && !Number.isNaN(parsedDate.getTime());
      const targetYear = hasValidDate ? parsedDate.getFullYear() : null;
      const targetSemester = hasValidDate
        ? parsedDate.getMonth() < 6
          ? '1st semester'
          : '2nd semester'
        : null;

      console.log(
        '✅ CONDITION MET: HR Approval detected (newStatus === 2 && oldStatus !== 2)',
      );
      console.log(
        `[Leave Credit Deduction] HR Approved leave for employee ${employeeNumber}, leave_code ${leave_code}`,
      );
      console.log(
        '[Leave Credit Deduction] Effective leave_date:',
        effectiveLeaveDate,
      );

      const getAssignmentQuery = `
        SELECT *
        FROM leave_assignment
        WHERE employeeNumber = ? AND TRIM(leave_code) = TRIM(?)
          AND (? IS NULL OR period_year = ?)
          AND (
            ? IS NULL
            OR period_semester <=> ?
            OR period_semester IS NULL
          )
        ORDER BY period_year DESC,
          CASE
            WHEN period_semester IN ('2nd', '2nd semester') THEN 2
            WHEN period_semester IN ('1st', '1st semester') THEN 1
            ELSE 0
          END DESC
        LIMIT 1
      `;

      const fallbackAssignmentQuery = `
        SELECT *
        FROM leave_assignment
        WHERE employeeNumber = ? AND TRIM(leave_code) = TRIM(?)
        ORDER BY period_year DESC,
          CASE
            WHEN period_semester IN ('2nd', '2nd semester') THEN 2
            WHEN period_semester IN ('1st', '1st semester') THEN 1
            ELSE 0
          END DESC
        LIMIT 1
      `;

      console.log('Querying leave_assignment for:', {
        employeeNumber,
        leave_code,
      });

      db.query(
        getAssignmentQuery,
        [
          employeeNumber,
          leave_code,
          targetYear,
          targetYear,
          targetSemester,
          targetSemester,
        ],
        (assignErr, assignment) => {
          if (assignErr) {
            console.error('❌ Error fetching assignment:', assignErr);
            return updateStatus(); // Continue with status update even if credit deduction fails
          }

          console.log(
            'Assignment query returned:',
            assignment.length,
            'results',
          );
          const applyDeduction = (assignmentRow) => {
            console.log('Assignment found:', assignmentRow);
            const currentRemaining =
              parseFloat(assignmentRow.remaining_hours) || 0;
            const currentUsed = parseFloat(assignmentRow.used_hours) || 0;
            const hoursToDeduct = 8; // Each leave request record = 1 day = 8 hours

            const newRemaining = Math.max(0, currentRemaining - hoursToDeduct);
            const newUsed = currentUsed + hoursToDeduct;

            console.log(`[Credit Deduction] Employee ${employeeNumber}:`);
            console.log(`  - Current remaining: ${currentRemaining} hrs`);
            console.log(`  - Current used: ${currentUsed} hrs`);
            console.log(`  - Deducting: ${hoursToDeduct} hrs`);
            console.log(`  - New remaining: ${newRemaining} hrs`);
            console.log(`  - New used: ${newUsed} hrs`);

            const updateAssignmentQuery =
              'UPDATE leave_assignment SET remaining_hours = ?, used_hours = ? WHERE id = ?';
            console.log('Executing UPDATE on leave_assignment:', {
              remaining_hours: newRemaining,
              used_hours: newUsed,
              id: assignmentRow.id,
            });

            db.query(
              updateAssignmentQuery,
              [newRemaining, newUsed, assignmentRow.id],
              (updateAssignErr) => {
                if (updateAssignErr) {
                  console.error('❌ Error deducting credits:', updateAssignErr);
                } else {
                  console.log(
                    `✅ [Credit Deduction] Successfully deducted ${hoursToDeduct} hours from employee ${employeeNumber}`,
                  );
                  emitLeaveChange('leaveAssignmentChanged'); // Notify clients to refresh
                }
                updateStatus();
              },
            );
          };

          if (assignment.length > 0) {
            applyDeduction(assignment[0]);
          } else {
            console.warn(
              `❌ [Credit Deduction] No period match found, falling back to latest assignment for ${employeeNumber} / ${leave_code}`,
            );
            db.query(
              fallbackAssignmentQuery,
              [employeeNumber, leave_code],
              (fallbackErr, fallbackAssignment) => {
                if (fallbackErr || fallbackAssignment.length === 0) {
                  if (fallbackErr) {
                    console.error(
                      '❌ [Credit Deduction] Fallback query error:',
                      fallbackErr,
                    );
                  }
                  console.warn(
                    `❌ [Credit Deduction] No leave assignment found for employee ${employeeNumber} with leave_code ${leave_code}`,
                  );
                  return updateStatus();
                }
                applyDeduction(fallbackAssignment[0]);
              },
            );
          }
        },
      );
    }
    // RESTORE credits when cancelled/denied AFTER being HR approved
    else if (oldStatus === 2 && (newStatus === 3 || newStatus === 4)) {
      const effectiveLeaveDate = leave_date || request.leave_date;
      const parsedDate = effectiveLeaveDate
        ? new Date(effectiveLeaveDate)
        : null;
      const hasValidDate = parsedDate && !Number.isNaN(parsedDate.getTime());
      const targetYear = hasValidDate ? parsedDate.getFullYear() : null;
      const targetSemester = hasValidDate
        ? parsedDate.getMonth() < 6
          ? '1st semester'
          : '2nd semester'
        : null;

      console.log(
        '✅ CONDITION MET: Restoration detected (oldStatus === 2 && (newStatus === 3 || 4))',
      );
      console.log(
        `[Leave Credit Restoration] Restoring credits for employee ${employeeNumber}, leave_code ${leave_code}`,
      );
      console.log(
        '[Leave Credit Restoration] Effective leave_date:',
        effectiveLeaveDate,
      );

      const getAssignmentQuery = `
        SELECT *
        FROM leave_assignment
        WHERE employeeNumber = ? AND TRIM(leave_code) = TRIM(?)
          AND (? IS NULL OR period_year = ?)
          AND (
            ? IS NULL
            OR period_semester <=> ?
            OR period_semester IS NULL
          )
        ORDER BY period_year DESC,
          CASE
            WHEN period_semester IN ('2nd', '2nd semester') THEN 2
            WHEN period_semester IN ('1st', '1st semester') THEN 1
            ELSE 0
          END DESC
        LIMIT 1
      `;

      const fallbackAssignmentQuery = `
        SELECT *
        FROM leave_assignment
        WHERE employeeNumber = ? AND TRIM(leave_code) = TRIM(?)
        ORDER BY period_year DESC,
          CASE
            WHEN period_semester IN ('2nd', '2nd semester') THEN 2
            WHEN period_semester IN ('1st', '1st semester') THEN 1
            ELSE 0
          END DESC
        LIMIT 1
      `;

      db.query(
        getAssignmentQuery,
        [
          employeeNumber,
          leave_code,
          targetYear,
          targetYear,
          targetSemester,
          targetSemester,
        ],
        (assignErr, assignment) => {
          if (assignErr) {
            console.error('Error fetching assignment:', assignErr);
            return updateStatus();
          }

          const applyRestore = (assignmentRow) => {
            const currentRemaining =
              parseFloat(assignmentRow.remaining_hours) || 0;
            const currentUsed = parseFloat(assignmentRow.used_hours) || 0;
            const hoursToRestore = 8; // Each leave request record = 1 day = 8 hours

            const newRemaining = currentRemaining + hoursToRestore;
            const newUsed = Math.max(0, currentUsed - hoursToRestore);

            console.log(
              `[Credit Restoration] Employee ${employeeNumber}: ${currentRemaining}hrs -> ${newRemaining}hrs (restored ${hoursToRestore}hrs)`,
            );

            const updateAssignmentQuery =
              'UPDATE leave_assignment SET remaining_hours = ?, used_hours = ? WHERE id = ?';
            db.query(
              updateAssignmentQuery,
              [newRemaining, newUsed, assignmentRow.id],
              (updateAssignErr) => {
                if (updateAssignErr) {
                  console.error('Error restoring credits:', updateAssignErr);
                } else {
                  console.log(
                    `✅ [Credit Restoration] Successfully restored ${hoursToRestore} hours for employee ${employeeNumber}`,
                  );
                  emitLeaveChange('leaveAssignmentChanged'); // Notify clients to refresh
                }
                updateStatus();
              },
            );
          };

          if (assignment.length > 0) {
            applyRestore(assignment[0]);
          } else {
            console.warn(
              `❌ [Credit Restoration] No period match found, falling back to latest assignment for ${employeeNumber} / ${leave_code}`,
            );
            db.query(
              fallbackAssignmentQuery,
              [employeeNumber, leave_code],
              (fallbackErr, fallbackAssignment) => {
                if (fallbackErr || fallbackAssignment.length === 0) {
                  if (fallbackErr) {
                    console.error(
                      '❌ [Credit Restoration] Fallback query error:',
                      fallbackErr,
                    );
                  }
                  console.warn(
                    `[Credit Restoration] No leave assignment found for employee ${employeeNumber} with leave_code ${leave_code}`,
                  );
                  return updateStatus();
                }
                applyRestore(fallbackAssignment[0]);
              },
            );
          }
        },
      );
    } else {
      console.log('❌ NO CONDITION MET - No credit changes needed');
      console.log(`Reason: newStatus=${newStatus}, oldStatus=${oldStatus}`);
      console.log(`Check: newStatus === 2? ${newStatus === 2}`);
      console.log(`Check: oldStatus !== 2? ${oldStatus !== 2}`);
      console.log(
        `Check: newStatus === 2 && oldStatus !== 2? ${newStatus === 2 && oldStatus !== 2}`,
      );
      // No credit changes needed
      updateStatus();
    }
  });
});

// DELETE leave request
router.delete('/leave_request/:id', (req, res) => {
  const { id } = req.params;

  const deleteQuery = 'DELETE FROM leave_request WHERE id = ?';
  db.query(deleteQuery, [id], (err) => {
    if (err) {
      console.error('Error deleting leave request:', err);
      return res.status(500).json({ error: 'Failed to delete leave request' });
    }
    emitLeaveChange('leaveRequestChanged'); // Notify clients to refresh
    res.json({ message: 'Leave request deleted successfully' });
  });
});

module.exports = router;
