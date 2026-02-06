const db = require("../db");
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');



// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Audit logging
function logAudit(
  user,
  action,
  tableName,
  recordId,
  targetEmployeeNumber = null
) {
  const auditQuery = `
    INSERT INTO audit_log (employeeNumber, action, table_name, record_id, targetEmployeeNumber, timestamp)
    VALUES (?, ?, ?, ?, ?, NOW())
  `;

  const employeeNumber =
    user && typeof user === 'object' && user.employeeNumber
      ? user.employeeNumber
      : user || null;

  db.query(
    auditQuery,
    [employeeNumber, action, tableName, recordId, targetEmployeeNumber],
    (err) => {
      if (err) console.error('Error inserting audit log:', err);
    }
  );
}

// ========================================
// GET ALL - Fetch all employment categories
// ========================================
router.get('/employment-category', authenticateToken, (req, res) => {
  const sql = `
    SELECT 
      ec.id,
      ec.employeeNumber,
      ec.employmentCategory,
      CONCAT_WS(', ', pt.lastName, CONCAT_WS(' ', pt.firstName, pt.middleName, pt.nameExtension)) AS employeeName,
     CASE 
  WHEN ec.employmentCategory = 0 THEN 'Job Order - Graduate'
  WHEN ec.employmentCategory = 1 THEN 'Job Order - UnderGrad'
  WHEN ec.employmentCategory = 2 THEN 'Regular - Non-Teaching'
  WHEN ec.employmentCategory = 3 THEN 'Regular - Teaching (30Hrs)'
  WHEN ec.employmentCategory = 4 THEN 'Regular - Designated (40Hrs)'
  ELSE 'Unknown'
END AS categoryLabel
    FROM employment_category ec
    LEFT JOIN person_table pt ON pt.agencyEmployeeNum = ec.employeeNumber
    ORDER BY ec.employeeNumber ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching employment categories:', err);
      return res
        .status(500)
        .json({ message: 'Error fetching employment categories' });
    }

    logAudit(req.user, 'view', 'employment_category', null, null);
    res.json(results);
  });
});

// ========================================
// GET ONE - Fetch employment category by employee number
// ========================================
router.get(
  '/employment-category/:employeeNumber',
  authenticateToken,
  (req, res) => {
    const { employeeNumber } = req.params;

    const sql = `
    SELECT 
      ec.id,
      ec.employeeNumber,
      ec.employmentCategory,
      CONCAT_WS(', ', pt.lastName, CONCAT_WS(' ', pt.firstName, pt.middleName, pt.nameExtension)) AS employeeName,
      CASE 
        WHEN ec.employmentCategory = 0 THEN 'Job Order - Graduate'
        WHEN ec.employmentCategory = 1 THEN 'Job Order - UnderGrad'
        WHEN ec.employmentCategory = 2 THEN 'Regular - Non-Teaching'
        WHEN ec.employmentCategory = 3 THEN 'Regular - Teaching (Designated)'
        WHEN ec.employmentCategory = 4 THEN 'Regular - 30Hrs'
        ELSE 'Unknown'
      END AS categoryLabel
    FROM employment_category ec
    LEFT JOIN person_table pt ON pt.agencyEmployeeNum = ec.employeeNumber
    WHERE ec.employeeNumber = ?
  `;

    db.query(sql, [employeeNumber], (err, results) => {
      if (err) {
        console.error('Error fetching employment category:', err);
        return res
          .status(500)
          .json({ message: 'Error fetching employment category' });
      }

      if (results.length === 0) {
        return res
          .status(404)
          .json({ message: 'Employment category not found' });
      }

      logAudit(
        req.user,
        'view',
        'employment_category',
        results[0].id,
        employeeNumber
      );
      res.json(results[0]);
    });
  }
);

router.get(
  '/employment-category/search/:searchTerm',
  authenticateToken,
  (req, res) => {
    const { searchTerm } = req.params;

    if (!searchTerm || searchTerm.trim() === '') {
      return res.status(400).json({ error: 'Search term is required' });
    }

    const sql = `
      SELECT 
        ec.id,
        ec.employeeNumber,
        ec.employmentCategory,
        CONCAT_WS(', ', pt.lastName, CONCAT_WS(' ', pt.firstName, pt.middleName, pt.nameExtension)) AS employeeName,
        CASE 
          WHEN ec.employmentCategory = 0 THEN 'Job Order - Graduate'
          WHEN ec.employmentCategory = 1 THEN 'Job Order - UnderGrad'
          WHEN ec.employmentCategory = 2 THEN 'Regular - Non-Teaching'
          WHEN ec.employmentCategory = 3 THEN 'Regular - Teaching (Designated)'
          WHEN ec.employmentCategory = 4 THEN 'Regular - 30Hrs'
          ELSE 'Unknown'
        END AS categoryLabel
      FROM employment_category ec
      LEFT JOIN person_table pt ON pt.agencyEmployeeNum = ec.employeeNumber
      WHERE ec.employeeNumber LIKE ? 
         OR pt.lastName LIKE ?
         OR pt.firstName LIKE ?
         OR pt.middleName LIKE ?
         OR CONCAT(pt.firstName, ' ', pt.lastName) LIKE ?
         OR CONCAT(pt.lastName, ' ', pt.firstName) LIKE ?
      ORDER BY ec.employeeNumber ASC
    `;

    const searchPattern = `%${searchTerm}%`;

    db.query(
      sql,
      [
        searchPattern, 
        searchPattern, 
        searchPattern, 
        searchPattern,
        searchPattern,
        searchPattern
      ],
      (err, results) => {
        if (err) {
          console.error('Error searching employment categories:', err);
          return res
            .status(500)
            .json({ message: 'Error searching employment categories' });
        }

        // Log audit trail
        logAudit(req.user, 'search', 'employment_category', null, searchTerm);
        
        res.json(results);
      }
    );
  }
);

// ========================================
// UPDATE ROUTE - Update employment category
// ========================================
router.put('/employment-category/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { employeeNumber, employmentCategory } = req.body;

  // Validation: Allow integers 0 through 4
  if (!employeeNumber) {
    return res.status(400).json({ error: 'Employee number is required' });
  }

  if (
    employmentCategory === undefined ||
    employmentCategory === null ||
    isNaN(employmentCategory) ||
    employmentCategory < 0 ||
    employmentCategory > 4
  ) {
    return res.status(400).json({
      error: 'Invalid employment category. Must be between 0 and 4.',
    });
  }

  // Check if record exists
  const checkSql = `SELECT employeeNumber FROM employment_category WHERE id = ?`;

  db.query(checkSql, [id], (err, results) => {
    if (err) {
      console.error('Error checking record:', err);
      return res.status(500).json({ message: 'Error checking record' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Employment category not found' });
    }

    const oldEmployeeNumber = results[0].employeeNumber;

    // Check for duplicate if changing employee number
    if (oldEmployeeNumber !== employeeNumber) {
      const duplicateCheckSql = `SELECT id FROM employment_category WHERE employeeNumber = ? AND id != ?`;

      db.query(
        duplicateCheckSql,
        [employeeNumber, id],
        (err, duplicateResults) => {
          if (err) {
            console.error('Error checking duplicate:', err);
            return res
              .status(500)
              .json({ message: 'Error checking duplicate' });
          }

          if (duplicateResults.length > 0) {
            return res.status(409).json({
              error: 'Employment category already exists for this employee',
            });
          }

          // No duplicate found, proceed with update
          performUpdate();
        }
      );
    } else {
      // Employee number not changed, proceed with update
      performUpdate();
    }

    function performUpdate() {
      const updateSql = `
        UPDATE employment_category 
        SET employeeNumber = ?, employmentCategory = ?
        WHERE id = ?
      `;

      db.query(
        updateSql,
        [employeeNumber, employmentCategory, id],
        (err, result) => {
          if (err) {
            console.error('Error updating employment category:', err);
            return res
              .status(500)
              .json({ message: 'Error updating employment category' });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Employment category not found' });
          }

          // SYNC: Also update users table
          const updateUsersSql = `
            UPDATE users 
            SET employmentCategory = ? 
            WHERE employeeNumber = ?
          `;
          
          db.query(
            updateUsersSql,
            [employmentCategory, employeeNumber],
            (updateErr, updateResult) => {
              if (updateErr) {
                console.error('Error updating users table:', updateErr);
                // Don't fail the whole operation, just log the error
                // You might want to handle this differently based on your requirements
              }

              // Log audit trail
              logAudit(
                req.user,
                'update',
                'employment_category',
                id,
                employeeNumber
              );
              
              // Send success response
              res.json({
                message: 'Employment category updated successfully',
                id,
                employeeNumber,
                employmentCategory,
              });
            }
          );
        }
      );
    }
  });
});

// ========================================
// CREATE - Add new employment category
// ========================================
router.post('/employment-category', authenticateToken, (req, res) => {
  const { employeeNumber, employmentCategory } = req.body;

  // Validation
  if (!employeeNumber) {
    return res.status(400).json({ error: 'Employee number is required' });
  }

  if (
    employmentCategory === undefined ||
    employmentCategory === null ||
    isNaN(employmentCategory) ||
    employmentCategory < 0 ||
    employmentCategory > 4
  ) {
    return res
      .status(400)
      .json({
        error: 'Invalid employment category. Must be between 0 and 4.',
      });
  }

  // Check if employee exists
  const checkEmployeeSql = `SELECT agencyEmployeeNum FROM person_table WHERE agencyEmployeeNum = ?`;

  db.query(checkEmployeeSql, [employeeNumber], (err, employeeResults) => {
    if (err) {
      console.error('Error checking employee:', err);
      return res.status(500).json({ message: 'Error checking employee' });
    }

    if (employeeResults.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if employment category already exists
    const checkSql = `SELECT id FROM employment_category WHERE employeeNumber = ?`;

    db.query(checkSql, [employeeNumber], (err, results) => {
      if (err) {
        console.error('Error checking existing record:', err);
        return res
          .status(500)
          .json({ message: 'Error checking existing record' });
      }

      if (results.length > 0) {
        return res
          .status(409)
          .json({
            error: 'Employment category already exists for this employee',
          });
      }

      // Insert new record
      const insertSql = `
        INSERT INTO employment_category (employeeNumber, employmentCategory)
        VALUES (?, ?)
      `;

      db.query(
        insertSql,
        [employeeNumber, employmentCategory],
        (err, result) => {
          if (err) {
            console.error('Error creating employment category:', err);
            return res
              .status(500)
              .json({ message: 'Error creating employment category' });
          }

          // Also update users table
          const updateUsersSql = `UPDATE users SET employmentCategory = ? WHERE employeeNumber = ?`;
          db.query(
            updateUsersSql,
            [employmentCategory, employeeNumber],
            (updateErr) => {
              if (updateErr) {
                console.error('Error updating users table:', updateErr);
              }
            }
          );

          logAudit(
            req.user,
            'create',
            'employment_category',
            result.insertId,
            employeeNumber
          );
          res.status(201).json({
            message: 'Employment category created successfully',
            id: result.insertId,
            employeeNumber,
            employmentCategory,
          });
        }
      );
    });
  });
});

// ========================================
// DELETE - Delete employment category
// ========================================
router.delete('/employment-category/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID provided' });
  }

  const getEmployeeNumberSql = `SELECT employeeNumber FROM employment_category WHERE id = ?`;

  db.query(getEmployeeNumberSql, [id], (err, results) => {
    if (err) {
      console.error('Error fetching record:', err);
      return res.status(500).json({ message: 'Error fetching record' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Employment category not found' });
    }

    const employeeNumber = results[0].employeeNumber;

    const deleteSql = `DELETE FROM employment_category WHERE id = ?`;

    db.query(deleteSql, [id], (err, result) => {
      if (err) {
        console.error('Error deleting employment category:', err);
        return res
          .status(500)
          .json({ message: 'Error deleting employment category' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Employment category not found' });
      }

      // SYNC: Set employmentCategory to NULL (or 0) in users table
      // You can choose NULL or a default value like 0
      const updateUsersSql = `
        UPDATE users 
        SET employmentCategory = NULL 
        WHERE employeeNumber = ?
      `;
      
      db.query(updateUsersSql, [employeeNumber], (updateErr, updateResult) => {
        if (updateErr) {
          console.error('Error updating users table:', updateErr);
          // Log the error but don't fail the delete operation
        }

        // Log audit trail
        logAudit(req.user, 'delete', 'employment_category', id, employeeNumber);
        
        // Send success response
        res.json({ 
          message: 'Employment category deleted successfully',
          deletedId: id,
          employeeNumber: employeeNumber
        });
      });
    });
  });
});

module.exports = router;