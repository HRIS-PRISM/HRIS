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
    console.log(`[LeaveRoute] Fetched ${results.length} employees for dropdown`);
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
  const query = 'INSERT INTO leave_table (leave_code, leave_description, leave_hours) VALUES (?, ?, ?)';
  db.query(query, [leave_code, leave_description, leave_hours || 0], (err, result) => {
    if (err) {
      console.error('Error creating leave type:', err);
      return res.status(500).json({ error: 'Failed to create leave type' });
    }
    res.json({ id: result.insertId, leave_code, leave_description, leave_hours });
  });
});

// PUT update leave type
router.put('/leave_table/:id', (req, res) => {
  const { id } = req.params;
  const { leave_code, leave_description, leave_hours } = req.body;
  const query = 'UPDATE leave_table SET leave_code = ?, leave_description = ?, leave_hours = ? WHERE id = ?';
  db.query(query, [leave_code, leave_description, leave_hours, id], (err, result) => {
    if (err) {
      console.error('Error updating leave type:', err);
      return res.status(500).json({ error: 'Failed to update leave type' });
    }
    res.json({ id, leave_code, leave_description, leave_hours });
  });
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
      la.approved_date,
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
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching leave assignments:', err);
      return res.status(500).json({ error: 'Failed to fetch leave assignments' });
    }
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
      la.approved_date,
      lt.leave_description
    FROM leave_assignment la
    LEFT JOIN leave_table lt ON la.leave_code = lt.leave_code
    WHERE la.employeeNumber = ?
  `;
  
  db.query(query, [employeeNumber], (err, results) => {
    if (err) {
      console.error('Error fetching employee leave assignments:', err);
      return res.status(500).json({ error: 'Failed to fetch leave assignments' });
    }
    res.json(results);
  });
});

// POST create new leave assignment (assign leave type to employee)
router.post('/leave_assignment', (req, res) => {
  const { employeeNumber, leave_code } = req.body;
  
  // First check if assignment already exists
  const checkQuery = 'SELECT id FROM leave_assignment WHERE employeeNumber = ? AND leave_code = ?';
  db.query(checkQuery, [employeeNumber, leave_code], (checkErr, existing) => {
    if (checkErr) {
      console.error('Error checking existing assignment:', checkErr);
      return res.status(500).json({ error: 'Failed to check existing assignment' });
    }
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'This employee already has an assignment for this leave type' });
    }
    
    // Get default hours from leave_table
    const getHoursQuery = 'SELECT leave_hours FROM leave_table WHERE leave_code = ?';
    db.query(getHoursQuery, [leave_code], (hoursErr, leaveType) => {
      if (hoursErr) {
        console.error('Error fetching leave type:', hoursErr);
        return res.status(500).json({ error: 'Failed to fetch leave type' });
      }
      
      const totalHours = leaveType[0]?.leave_hours || 0;
      
      const insertQuery = `
        INSERT INTO leave_assignment (leave_code, employeeNumber, total_hours, remaining_hours, used_hours, approved_date)
        VALUES (?, ?, ?, ?, 0, NULL)
      `;
      
      db.query(insertQuery, [leave_code, employeeNumber, totalHours, totalHours], (insertErr, result) => {
        if (insertErr) {
          console.error('Error creating leave assignment:', insertErr);
          return res.status(500).json({ error: 'Failed to create leave assignment' });
        }
        
        emitLeaveChange('leaveAssignmentChanged'); // Notify clients to refresh
        
        res.json({ 
          id: result.insertId, 
          leave_code,
          employeeNumber, 
          total_hours: totalHours, 
          remaining_hours: totalHours, 
          used_hours: 0,
          approved_date: null
        });
      });
    });
  });
});

// PUT update leave assignment (edit employee's leave credits)
router.put('/leave_assignment/:id', (req, res) => {
  const { id } = req.params;
  const { employeeNumber, leave_code, remaining_hours } = req.body;
  
  // Get current assignment to calculate used_hours
  const getCurrentQuery = 'SELECT * FROM leave_assignment WHERE id = ?';
  db.query(getCurrentQuery, [id], (err, current) => {
    if (err) {
      console.error('Error fetching current assignment:', err);
      return res.status(500).json({ error: 'Failed to fetch assignment' });
    }
    
    if (current.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    const totalHours = current[0].total_hours;
    const newRemaining = parseFloat(remaining_hours) || 0;
    const newUsed = Math.max(0, totalHours - newRemaining);
    
    const updateQuery = `
      UPDATE leave_assignment 
      SET leave_code = ?, employeeNumber = ?, remaining_hours = ?, used_hours = ?
      WHERE id = ?
    `;
    
    db.query(updateQuery, [leave_code, employeeNumber, newRemaining, newUsed, id], (updateErr) => {
      if (updateErr) {
        console.error('Error updating leave assignment:', updateErr);
        return res.status(500).json({ error: 'Failed to update leave assignment' });
      }
      
      emitLeaveChange('leaveAssignmentChanged'); // Notify clients to refresh
      
      res.json({ 
        id, 
        leave_code,
        employeeNumber, 
        total_hours: totalHours,
        remaining_hours: newRemaining, 
        used_hours: newUsed 
      });
    });
  });
});

// DELETE leave assignment
router.delete('/leave_assignment/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM leave_assignment WHERE id = ?';
  
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error deleting leave assignment:', err);
      return res.status(500).json({ error: 'Failed to delete leave assignment' });
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
    return res.status(400).json({ error: 'At least one leave date is required' });
  }
  
  // Insert each date as a separate record
  const insertPromises = dates.map(date => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO leave_request (employeeNumber, leave_code, leave_date, status, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `;
      
      db.query(query, [employeeNumber, leave_code, date, status || 0], (err, result) => {
        if (err) {
          console.error('Error inserting leave request:', err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  });
  
  Promise.all(insertPromises)
    .then(() => {
      emitLeaveChange('leaveRequestChanged'); // Notify clients to refresh
      res.json({ 
        message: 'Leave requests created successfully',
        count: dates.length
      });
    })
    .catch(err => {
      console.error('Error creating leave requests:', err);
      res.status(500).json({ error: 'Failed to create leave requests' });
    });
});

// PUT update leave request (employee edits or admin changes status)
router.put('/leave_request/:id', (req, res) => {
  const { id } = req.params;
  const { employeeNumber, leave_code, leave_date, status } = req.body;
  
  console.log('=== PUT /leave_request/:id called ===');
  console.log('Request ID:', id);
  console.log('Request body:', { employeeNumber, leave_code, leave_date, status });
  
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
      
      console.log('Updating leave_request with:', { employeeNumber, leave_code, leave_date, status: newStatus, id });
      
      db.query(updateQuery, [employeeNumber, leave_code, leave_date, newStatus, id], (updateErr) => {
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
          message: 'Status updated successfully'
        });
      });
    };
    
    // Status: 0=Pending, 1=Manager Approved, 2=HR Approved, 3=Denied, 4=Cancelled
    
    // DEDUCT credits when HR approves (status changes to 2)
    // Each leave_date record represents 8 hours (1 day)
    if (newStatus === 2 && oldStatus !== 2) {
      console.log('✅ CONDITION MET: HR Approval detected (newStatus === 2 && oldStatus !== 2)');
      console.log(`[Leave Credit Deduction] HR Approved leave for employee ${employeeNumber}, leave_code ${leave_code}`);
      
      const getAssignmentQuery = 'SELECT * FROM leave_assignment WHERE employeeNumber = ? AND leave_code = ?';
      
      console.log('Querying leave_assignment for:', { employeeNumber, leave_code });
      
      db.query(getAssignmentQuery, [employeeNumber, leave_code], (assignErr, assignment) => {
        if (assignErr) {
          console.error('❌ Error fetching assignment:', assignErr);
          return updateStatus(); // Continue with status update even if credit deduction fails
        }
        
        console.log('Assignment query returned:', assignment.length, 'results');
        if (assignment.length > 0) {
          console.log('Assignment found:', assignment[0]);
        }
        
        if (assignment.length > 0) {
          const currentRemaining = parseFloat(assignment[0].remaining_hours) || 0;
          const currentUsed = parseFloat(assignment[0].used_hours) || 0;
          const hoursToDeduct = 8; // Each leave request record = 1 day = 8 hours
          
          const newRemaining = Math.max(0, currentRemaining - hoursToDeduct);
          const newUsed = currentUsed + hoursToDeduct;
          
          console.log(`[Credit Deduction] Employee ${employeeNumber}:`);
          console.log(`  - Current remaining: ${currentRemaining} hrs`);
          console.log(`  - Current used: ${currentUsed} hrs`);
          console.log(`  - Deducting: ${hoursToDeduct} hrs`);
          console.log(`  - New remaining: ${newRemaining} hrs`);
          console.log(`  - New used: ${newUsed} hrs`);
          
          const updateAssignmentQuery = 'UPDATE leave_assignment SET remaining_hours = ?, used_hours = ? WHERE id = ?';
          console.log('Executing UPDATE on leave_assignment:', { remaining_hours: newRemaining, used_hours: newUsed, id: assignment[0].id });
          
          db.query(updateAssignmentQuery, [newRemaining, newUsed, assignment[0].id], (updateAssignErr) => {
            if (updateAssignErr) {
              console.error('❌ Error deducting credits:', updateAssignErr);
            } else {
              console.log(`✅ [Credit Deduction] Successfully deducted ${hoursToDeduct} hours from employee ${employeeNumber}`);
              emitLeaveChange('leaveAssignmentChanged'); // Notify clients to refresh
            }
            updateStatus();
          });
        } else {
          console.warn(`❌ [Credit Deduction] No leave assignment found for employee ${employeeNumber} with leave_code ${leave_code}`);
          updateStatus();
        }
      });
    }
    // RESTORE credits when cancelled/denied AFTER being HR approved
    else if (oldStatus === 2 && (newStatus === 3 || newStatus === 4)) {
      console.log('✅ CONDITION MET: Restoration detected (oldStatus === 2 && (newStatus === 3 || 4))');
      console.log(`[Leave Credit Restoration] Restoring credits for employee ${employeeNumber}, leave_code ${leave_code}`);
      
      const getAssignmentQuery = 'SELECT * FROM leave_assignment WHERE employeeNumber = ? AND leave_code = ?';
      
      db.query(getAssignmentQuery, [employeeNumber, leave_code], (assignErr, assignment) => {
        if (assignErr) {
          console.error('Error fetching assignment:', assignErr);
          return updateStatus();
        }
        
        if (assignment.length > 0) {
          const currentRemaining = parseFloat(assignment[0].remaining_hours) || 0;
          const currentUsed = parseFloat(assignment[0].used_hours) || 0;
          const hoursToRestore = 8; // Each leave request record = 1 day = 8 hours
          
          const newRemaining = currentRemaining + hoursToRestore;
          const newUsed = Math.max(0, currentUsed - hoursToRestore);
          
          console.log(`[Credit Restoration] Employee ${employeeNumber}: ${currentRemaining}hrs -> ${newRemaining}hrs (restored ${hoursToRestore}hrs)`);
          
          const updateAssignmentQuery = 'UPDATE leave_assignment SET remaining_hours = ?, used_hours = ? WHERE id = ?';
          db.query(updateAssignmentQuery, [newRemaining, newUsed, assignment[0].id], (updateAssignErr) => {
            if (updateAssignErr) {
              console.error('Error restoring credits:', updateAssignErr);
            } else {
              console.log(`✅ [Credit Restoration] Successfully restored ${hoursToRestore} hours for employee ${employeeNumber}`);
              emitLeaveChange('leaveAssignmentChanged'); // Notify clients to refresh
            }
            updateStatus();
          });
        } else {
          console.warn(`[Credit Restoration] No leave assignment found for employee ${employeeNumber} with leave_code ${leave_code}`);
          updateStatus();
        }
      });
    }
    else {
      console.log('❌ NO CONDITION MET - No credit changes needed');
      console.log(`Reason: newStatus=${newStatus}, oldStatus=${oldStatus}`);
      console.log(`Check: newStatus === 2? ${newStatus === 2}`);
      console.log(`Check: oldStatus !== 2? ${oldStatus !== 2}`);
      console.log(`Check: newStatus === 2 && oldStatus !== 2? ${newStatus === 2 && oldStatus !== 2}`);
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