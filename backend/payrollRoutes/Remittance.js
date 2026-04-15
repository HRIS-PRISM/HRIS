const db = require("../db");
const express = require('express');
const router = express.Router();
const { notifyPayrollChanged } = require('../socket/socketService');
const { authenticateToken, logAudit } = require('../middleware/auth');


// Function to construct full name from person_table columns
const getFullNameSQL = () => {
  return `CONCAT_WS(' ',
    p.firstName,
    p.middleName,
    p.lastName,
    CASE WHEN p.nameExtension IS NOT NULL AND p.nameExtension != ''
         THEN p.nameExtension
         ELSE NULL
    END
  ) as name`;
};


// NEW: GET employees for autocomplete/dropdown
router.get('/employees/search', authenticateToken, (req, res) => {
  const { q } = req.query; // Search query parameter


  let sql = `
    SELECT u.employeeNumber, ${getFullNameSQL()}
    FROM users u
    LEFT JOIN person_table p ON u.employeeNumber = p.agencyEmployeeNum
    WHERE p.firstName IS NOT NULL
  `;


  let queryParams = [];


  // If search query is provided, filter by name or employee number
  if (q && q.trim() !== '') {
    sql += ` AND (
      CONCAT_WS(' ', p.firstName, p.middleName, p.lastName, p.nameExtension) LIKE ?
      OR p.firstName LIKE ?
      OR p.lastName LIKE ?
      OR u.employeeNumber LIKE ?
    )`;
    const searchTerm = `%${q.trim()}%`;
    queryParams = [searchTerm, searchTerm, searchTerm, searchTerm];
  }


  sql += ` ORDER BY p.firstName, p.lastName ASC LIMIT 50`; // Limit results for performance


  db.query(sql, queryParams, (err, result) => {
    if (err) {
      console.error('Error fetching employees:', err);
      res.status(500).json({ message: 'Error fetching employees' });
    } else {
      res.json(result);
    }
  });
});


// NEW: GET specific employee by employee number
router.get('/employees/:employeeNumber', authenticateToken, (req, res) => {
  const { employeeNumber } = req.params;


  const sql = `
    SELECT u.employeeNumber, ${getFullNameSQL()}
    FROM users u
    LEFT JOIN person_table p ON u.employeeNumber = p.agencyEmployeeNum
    WHERE u.employeeNumber = ?
  `;


  db.query(sql, [employeeNumber], (err, result) => {
    if (err) {
      console.error('Error fetching employee:', err);
      res.status(500).json({ message: 'Error fetching employee' });
    } else if (result.length === 0) {
      res.status(404).json({ message: 'Employee not found' });
    } else {
      res.json(result[0]);
    }
  });
});


// CORRECTED: GET remittance records with names from both person_table and payroll_processing
router.get('/employee-remittance', authenticateToken, (req, res) => {
  const sql = `
    SELECT r.id, r.employeeNumber,
           COALESCE(pp.name,
             CONCAT_WS(' ',
               p.firstName,
               p.middleName,
               p.lastName,
               CASE WHEN p.nameExtension IS NOT NULL AND p.nameExtension != ''
                    THEN p.nameExtension
                    ELSE NULL
               END
             )
           ) as name,
           r.liquidatingCash, r.gsisSalaryLoan, r.gsisPolicyLoan, r.gfal, r.gsisArrears,
           r.cpl, r.mpl, r.mplLite, r.emergencyLoan, r.nbc594, r.increment, r.sss,
           r.pagibig, r.pagibigFundCont, r.pagibig2, r.multiPurpLoan,
           r.landbankSalaryLoan, r.earistCreditCoop, r.feu, r.created_at
    FROM remittance_table r
    LEFT JOIN users u ON r.employeeNumber = u.employeeNumber
    LEFT JOIN person_table p ON u.employeeNumber = p.agencyEmployeeNum
    LEFT JOIN payroll_processing pp ON r.employeeNumber = pp.employeeNumber
    ORDER BY r.created_at DESC
  `;


  db.query(sql, (err, result) => {
    if (err) {
      console.error('Error fetching remittance data:', err);
      res
        .status(500)
        .json({ message: 'Error fetching data', error: err.message });
    } else {
      res.json(result);
    }
  });
});


// NEW: GET person_table structure (for debugging)
router.get('/debug/person-structure', authenticateToken, (req, res) => {
  const sql = `
    SELECT u.employeeNumber,
           p.agencyEmployeeNum,
           p.firstName,
           p.middleName,
           p.lastName,
           p.nameExtension,
           ${getFullNameSQL()}
    FROM users u
    LEFT JOIN person_table p ON u.employeeNumber = p.agencyEmployeeNum
    WHERE p.firstName IS NOT NULL
    LIMIT 5
  `;


  db.query(sql, (err, result) => {
    if (err) {
      console.error('Error fetching sample data:', err);
      res.status(500).json({ message: 'Error fetching sample data' });
    } else {
      res.json({
        message: 'Sample person data with constructed full names',
        sampleData: result,
        nameConstructionSQL: getFullNameSQL(),
      });
    }
  });
});


// ENHANCED: POST with employee validation, duplicate check, and audit logging
router.post('/employee-remittance', authenticateToken, (req, res) => {
  const {
    employeeNumber,
    liquidatingCash,
    gsisSalaryLoan,
    gsisPolicyLoan,
    gfal,
    gsisArrears,
    cpl,
    mpl,
    mplLite,
    emergencyLoan,
    nbc594,
    increment,
    sss,
    pagibig,
    pagibigFundCont,
    pagibig2,
    multiPurpLoan,
    landbankSalaryLoan,
    earistCreditCoop,
    feu,
  } = req.body;


  // First, validate that the employee exists
  const validateEmployeeSql = `
    SELECT u.employeeNumber
    FROM users u
    WHERE u.employeeNumber = ?
  `;


  db.query(validateEmployeeSql, [employeeNumber], (err, employeeResult) => {
    if (err) {
      console.error('Error validating employee:', err);
      return res.status(500).json({ message: 'Error validating employee' });
    }


    if (employeeResult.length === 0) {
      return res.status(400).json({ message: 'Employee not found' });
    }


    // Check for duplicate employeeNumber in remittance_table
    const checkDuplicateSql = `
      SELECT id, employeeNumber
      FROM remittance_table
      WHERE employeeNumber = ?
    `;


    db.query(checkDuplicateSql, [employeeNumber], (err, duplicateResult) => {
      if (err) {
        console.error('Error checking for duplicate employee:', err);
        return res
          .status(500)
          .json({ message: 'Error checking for existing records' });
      }


      if (duplicateResult.length > 0) {
        return res.status(409).json({
          message: 'Employee data already exists',
          error: 'DUPLICATE_EMPLOYEE',
          existingRecordId: duplicateResult[0].id,
        });
      }


      // If employee exists and no duplicate found, proceed with insertion
      const sql = `
        INSERT INTO remittance_table (
          employeeNumber, liquidatingCash, gsisSalaryLoan, gsisPolicyLoan, gfal, gsisArrears,
          cpl, mpl, mplLite, emergencyLoan, nbc594, increment, sss,
          pagibig, pagibigFundCont, pagibig2, multiPurpLoan,
          landbankSalaryLoan, earistCreditCoop, feu
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;


      const values = [
        employeeNumber,
        liquidatingCash || 0,
        gsisSalaryLoan || 0,
        gsisPolicyLoan || 0,
        gfal || 0,
        gsisArrears || 0,
        cpl || 0,
        mpl || 0,
        mplLite || 0,
        emergencyLoan || 0,
        nbc594 || 0,
        increment || 0,
        sss || 0,
        pagibig || 0,
        pagibigFundCont || 0,
        pagibig2 || 0,
        multiPurpLoan || 0,
        landbankSalaryLoan || 0,
        earistCreditCoop || 0,
        feu || 0,
      ];


      db.query(sql, values, (err, result) => {
        if (err) {
          console.error('Error during POST request:', err);
          try {
            logAudit(req.user, 'Insert Failed', 'remittance_table', null, employeeNumber);
          } catch (e) {
            console.error('Audit log error:', e);
          }
          res.status(500).json({ message: 'Error adding data' });
        } else {
          try {
            logAudit(
              req.user,
              'Insert',
              'remittance_table',
              result.insertId,
              employeeNumber
            );
          } catch (e) {
            console.error('Audit log error:', e);
          }
          notifyPayrollChanged('created', {
            module: 'remittance',
            id: result.insertId,
            employeeNumber,
          });
          res.status(201).json({
            message: 'Data added successfully',
            id: result.insertId,
          });
        }
      });
    });
  });
});


// ENHANCED: PUT with employee validation, duplicate check for different employees, and audit logging
router.put('/employee-remittance/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const {
    employeeNumber,
    liquidatingCash,
    gsisSalaryLoan,
    gsisPolicyLoan,
    gfal,
    gsisArrears,
    cpl,
    mpl,
    mplLite,
    emergencyLoan,
    nbc594,
    increment,
    sss,
    pagibig,
    pagibigFundCont,
    pagibig2,
    multiPurpLoan,
    landbankSalaryLoan,
    earistCreditCoop,
    feu,
  } = req.body;


  // First, validate that the employee exists
  const validateEmployeeSql = `
    SELECT u.employeeNumber
    FROM users u
    WHERE u.employeeNumber = ?
  `;


  db.query(validateEmployeeSql, [employeeNumber], (err, employeeResult) => {
    if (err) {
      console.error('Error validating employee:', err);
      return res.status(500).json({ message: 'Error validating employee' });
    }


    if (employeeResult.length === 0) {
      return res.status(400).json({ message: 'Employee not found' });
    }


    // Check for duplicate employeeNumber in remittance_table (excluding current record)
    const checkDuplicateSql = `
      SELECT id, employeeNumber
      FROM remittance_table
      WHERE employeeNumber = ? AND id != ?
    `;


    db.query(
      checkDuplicateSql,
      [employeeNumber, id],
      (err, duplicateResult) => {
        if (err) {
          console.error('Error checking for duplicate employee:', err);
          return res
            .status(500)
            .json({ message: 'Error checking for existing records' });
        }


        if (duplicateResult.length > 0) {
          return res.status(409).json({
            message: 'Employee data already exists',
            error: 'DUPLICATE_EMPLOYEE',
            existingRecordId: duplicateResult[0].id,
          });
        }


        // If employee exists and no duplicate found, proceed with update
        const sql = `
        UPDATE remittance_table
        SET employeeNumber = ?,
            liquidatingCash = ?,
            gsisSalaryLoan = ?,
            gsisPolicyLoan = ?,
          gfal = ?,
            gsisArrears = ?,
            cpl = ?,
            mpl = ?,
            mplLite = ?,
            emergencyLoan = ?,
            nbc594 = ?,
            increment = ?,
            sss = ?,
            pagibig = ?,
            pagibigFundCont = ?,
            pagibig2 = ?,
            multiPurpLoan = ?,
            landbankSalaryLoan = ?,
            earistCreditCoop = ?,
            feu = ?
        WHERE id = ?
      `;


        const values = [
          employeeNumber,
          liquidatingCash || 0,
          gsisSalaryLoan || 0,
          gsisPolicyLoan || 0,
          gfal || 0,
          gsisArrears || 0,
          cpl || 0,
          mpl || 0,
          mplLite || 0,
          emergencyLoan || 0,
          nbc594 || 0,
          increment || 0,
          sss || 0,
          pagibig || 0,
          pagibigFundCont || 0,
          pagibig2 || 0,
          multiPurpLoan || 0,
          landbankSalaryLoan || 0,
          earistCreditCoop || 0,
          feu || 0,
          id,
        ];


        db.query(sql, values, (err, result) => {
          if (err) {
            console.error('Error updating data:', err);
            try {
              logAudit(req.user, 'Update Failed', 'remittance_table', id, employeeNumber);
            } catch (e) {
              console.error('Audit log error:', e);
            }
            res.status(500).json({ message: 'Error updating data' });
          } else {
            if (result.affectedRows === 0) {
              res.status(404).json({ message: 'Remittance record not found' });
            } else {
              try {
                logAudit(
                  req.user,
                  'Update',
                  'remittance_table',
                  id,
                  employeeNumber
                );
              } catch (e) {
                console.error('Audit log error:', e);
              }
              notifyPayrollChanged('updated', {
                module: 'remittance',
                id,
                employeeNumber,
              });
              res.status(200).json({ message: 'Data updated successfully' });
            }
          }
        });
      }
    );
  });
});


// ENHANCED: PUT with employee validation and audit logging
router.put('/employee-remittance/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const {
    employeeNumber,
    liquidatingCash,
    gsisSalaryLoan,
    gsisPolicyLoan,
    gfal,
    gsisArrears,
    cpl,
    mpl,
    mplLite,
    emergencyLoan,
    nbc594,
    increment,
    sss,
    pagibig,
    pagibigFundCont,
    pagibig2,
    multiPurpLoan,
    landbankSalaryLoan,
    earistCreditCoop,
    feu,
  } = req.body;


  // First, validate that the employee exists
  const validateEmployeeSql = `
    SELECT u.employeeNumber
    FROM users u
    WHERE u.employeeNumber = ?
  `;


  db.query(validateEmployeeSql, [employeeNumber], (err, employeeResult) => {
    if (err) {
      console.error('Error validating employee:', err);
      return res.status(500).json({ message: 'Error validating employee' });
    }


    if (employeeResult.length === 0) {
      return res.status(400).json({ message: 'Employee not found' });
    }


    // If employee exists, proceed with update
    const sql = `
      UPDATE remittance_table
      SET employeeNumber = ?,
          liquidatingCash = ?,
          gsisSalaryLoan = ?,
          gsisPolicyLoan = ?,
          gfal = ?,
          gsisArrears = ?,
          cpl = ?,
          mpl = ?,
          mplLite = ?,
          emergencyLoan = ?,
          nbc594 = ?,
          increment = ?,
          sss = ?,
          pagibig = ?,
          pagibigFundCont = ?,
          pagibig2 = ?,
          multiPurpLoan = ?,
          landbankSalaryLoan = ?,
          earistCreditCoop = ?,
          feu = ?
      WHERE id = ?
    `;


    const values = [
      employeeNumber,
      liquidatingCash || 0,
      gsisSalaryLoan || 0,
      gsisPolicyLoan || 0,
      gfal || 0,
      gsisArrears || 0,
      cpl || 0,
      mpl || 0,
      mplLite || 0,
      emergencyLoan || 0,
      nbc594 || 0,
      increment || 0,
      sss || 0,
      pagibig || 0,
      pagibigFundCont || 0,
      pagibig2 || 0,
      multiPurpLoan || 0,
      landbankSalaryLoan || 0,
      earistCreditCoop || 0,
      feu || 0,
      id,
    ];


    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('Error updating data:', err);
        try {
          logAudit(req.user, 'Update Failed', 'remittance_table', id, employeeNumber);
        } catch (e) {
          console.error('Audit log error:', e);
        }
        res.status(500).json({ message: 'Error updating data' });
      } else {
        if (result.affectedRows === 0) {
          res.status(404).json({ message: 'Remittance record not found' });
        } else {
          try {
            logAudit(
              req.user,
              'Update',
              'remittance_table',
              id,
              employeeNumber
            );
          } catch (e) {
            console.error('Audit log error:', e);
          }
          notifyPayrollChanged('updated', {
            module: 'remittance',
            id,
            employeeNumber,
          });
          res.status(200).json({ message: 'Data updated successfully' });
        }
      }
    });
  });
});


// DELETE with authentication and audit logging
router.delete('/employee-remittance/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM remittance_table WHERE id = ?';


  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error deleting data:', err);
      try {
        logAudit(req.user, 'Delete Failed', 'remittance_table', id, null);
      } catch (e) {
        console.error('Audit log error:', e);
      }
      res.status(500).json({ message: 'Error deleting data' });
    } else {
      if (result.affectedRows === 0) {
        res.status(404).json({ message: 'Remittance record not found' });
      } else {
        try {
          logAudit(req.user, 'Delete', 'remittance_table', id, null);
        } catch (e) {
          console.error('Audit log error:', e);
        }
        notifyPayrollChanged('deleted', { module: 'remittance', id });
        res.status(200).json({ message: 'Data deleted successfully' });
      }
    }
  });
});


module.exports = router;



