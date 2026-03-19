const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, logAudit } = require('../middleware/auth');
const { notifyPayrollChanged } = require('../socket/socketService');

// GET all item table records
router.get('/api/item-table', authenticateToken, (req, res) => {
  const sql = `
    SELECT 
      id, 
      COALESCE(item_description, '') as item_description, 
      COALESCE(employeeID, '') as employeeID, 
      COALESCE(name, '') as name, 
      COALESCE(item_code, '') as item_code, 
      COALESCE(salary_grade, '') as salary_grade, 
      COALESCE(step, '') as step, 
      COALESCE(effectivityDate, '') as effectivityDate, 
      dateCreated
    FROM item_table
    ORDER BY dateCreated DESC
  `;
  db.query(sql, (err, result) => {
    if (err) {
      console.error('Database Query Error:', err.message);
      console.error('SQL Error Code:', err.code);
      console.error('SQL Error SQL State:', err.sqlState);
      return res.status(500).json({ 
        error: 'Internal Server Error',
        message: err.message,
        details: 'Failed to fetch item records'
      });
    }

    // Debug logging
    console.log('=== ITEM TABLE FETCH DEBUG ===');
    console.log('Total records found:', result.length);
    if (result.length > 0) {
      console.log('Sample record:', {
        id: result[0].id,
        employeeID: result[0].employeeID,
        name: result[0].name,
        item_description: result[0].item_description,
        salary_grade: result[0].salary_grade,
        step: result[0].step,
      });
      // Check for NULL values
      const nullFields = result.filter(r => 
        r.employeeID === null || 
        r.name === null || 
        r.item_description === null
      );
      if (nullFields.length > 0) {
        console.log('Records with NULL values:', nullFields.length);
        console.log('Sample NULL record:', nullFields[0]);
      }
    } else {
      console.log('No records found in item_table');
    }
    console.log('==============================');

    res.json(result);
  });
});

// POST: Add new item
router.post('/api/item-table', authenticateToken, (req, res) => {
  const {
    item_description,
    employeeID,
    name,
    item_code,
    salary_grade,
    step,
    effectivityDate,
  } = req.body;

  // Normalize values: convert null/undefined to empty string for NOT NULL fields
  // salary_grade is NOT NULL in database, so ensure it's never null
  const normalizedData = {
    item_description: item_description || null,
    employeeID: employeeID || null,
    name: name || null,
    item_code: item_code || null,
    salary_grade: salary_grade !== null && salary_grade !== undefined ? salary_grade : '',
    step: step || null,
    effectivityDate: effectivityDate || null,
  };

  // Log the data being inserted for debugging
  console.log('Inserting item data:', normalizedData);

  const sql = `
    INSERT INTO item_table (item_description, employeeID, name, item_code, salary_grade, step, effectivityDate)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(
    sql,
    [
      normalizedData.item_description,
      normalizedData.employeeID,
      normalizedData.name,
      normalizedData.item_code,
      normalizedData.salary_grade,
      normalizedData.step,
      normalizedData.effectivityDate,
    ],
    (err, result) => {
      if (err) {
        console.error('Database Insert Error:', err.message);
        console.error('SQL Error Code:', err.code);
        console.error('SQL Error SQL State:', err.sqlState);
        return res.status(500).json({ 
          error: 'Internal Server Error',
          message: err.message,
          details: 'Failed to insert item record. Please check the data and try again.'
        });
      }

      try {
        logAudit(req.user, 'Insert', 'item_table', result.insertId, employeeID);
      } catch (e) {
        console.error('Audit log error:', e);
      }

      notifyPayrollChanged('created', {
        module: 'item-table',
        id: result.insertId,
        employeeID,
      });

      res.json({
        message: 'Item record added successfully',
        id: result.insertId,
      });
    }
  );
});

// PUT: Update item
router.put('/api/item-table/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const {
    item_description,
    employeeID,
    name,
    item_code,
    salary_grade,
    step,
    effectivityDate,
  } = req.body;

  // Normalize values: convert null/undefined to empty string for NOT NULL fields
  // salary_grade is NOT NULL in database, so ensure it's never null
  const normalizedData = {
    item_description: item_description || null,
    employeeID: employeeID || null,
    name: name || null,
    item_code: item_code || null,
    salary_grade: salary_grade !== null && salary_grade !== undefined ? salary_grade : '',
    step: step || null,
    effectivityDate: effectivityDate || null,
  };

  // Log the data being updated for debugging
  console.log('Updating item data for ID:', id, normalizedData);

  const sql = `
    UPDATE item_table SET
      item_description = ?,
      employeeID = ?,
      name = ?,
      item_code = ?,
      salary_grade = ?,
      step = ?,
      effectivityDate = ?
    WHERE id = ?
  `;
  db.query(
    sql,
    [
      normalizedData.item_description,
      normalizedData.employeeID,
      normalizedData.name,
      normalizedData.item_code,
      normalizedData.salary_grade,
      normalizedData.step,
      normalizedData.effectivityDate,
      id,
    ],
    (err, result) => {
      if (err) {
        console.error('Database Update Error:', err.message);
        console.error('SQL Error Code:', err.code);
        console.error('SQL Error SQL State:', err.sqlState);
        return res.status(500).json({ 
          error: 'Internal Server Error',
          message: err.message,
          details: 'Failed to update item record. Please check the data and try again.'
        });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }

      try {
        logAudit(req.user, 'Update', 'item_table', id, employeeID);
      } catch (e) {
        console.error('Audit log error:', e);
      }

      notifyPayrollChanged('updated', {
        module: 'item-table',
        id,
        employeeID,
      });

      res.json({ message: 'Item record updated successfully' });
    }
  );
});

// DELETE: Delete item
router.delete('/api/item-table/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM item_table WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error('Database Delete Error:', err.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    try {
      logAudit(req.user, 'Delete', 'item_table', id, null);
    } catch (e) {
      console.error('Audit log error:', e);
    }

    notifyPayrollChanged('deleted', { module: 'item-table', id });

    res.json({ message: 'Item record deleted successfully' });
  });
});

module.exports = router;




