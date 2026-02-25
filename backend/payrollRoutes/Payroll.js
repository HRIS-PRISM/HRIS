const db = require('../db');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { notifyPayrollChanged } = require('../socket/socketService');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('Auth header:', authHeader);
  console.log('Token:', token ? 'Token exists' : 'No token');

  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) {
      console.log('JWT verification error:', err.message);
      return res.status(403).json({ error: 'Invalid token' });
    }
    console.log('Decoded JWT:', user);
    req.user = user;
    next();
  });
}

function logAudit(
  user,
  action,
  tableName,
  recordId,
  targetEmployeeNumber = null,
) {
  if (!user || !user.employeeNumber) {
    console.error('Invalid user object for audit logging:', user);
    return;
  }

  const auditQuery = `
    INSERT INTO audit_log (employeeNumber, action, table_name, record_id, targetEmployeeNumber, timestamp)
    VALUES (?, ?, ?, ?, ?, NOW())
  `;

  db.query(
    auditQuery,
    [user.employeeNumber, action, tableName, recordId, targetEmployeeNumber],
    (err) => {
      if (err) {
        console.error('Error inserting audit log:', err);
      }
    },
  );
}

router.get('/test-auth', authenticateToken, (req, res) => {
  res.json({
    message: 'Authentication successful',
    user: req.user,
    timestamp: new Date().toISOString(),
  });
});

router.get('/payroll', authenticateToken, (req, res) => {
  const sql = 'SELECT * FROM payroll_processing WHERE rh IS NULL OR rh = ""';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });

    let recordId = results.length > 0 ? results[0].id : null;
    logAudit(req.user, 'view', 'payroll_processing', recordId);
    res.json(results);
  });
});

router.get('/payroll/search', authenticateToken, (req, res) => {
  const { searchTerm } = req.query;

  const query = `
    SELECT
      p.id,
      p.department AS code,
      p.employeeNumber,
      p.startDate,
      p.endDate,
      p.rateNbc584,
      p.rateNbc594,
      p.nbcDiffl597,
      p.grossSalary,
      COALESCE(lav.remaining_hours, 0) AS tevl,
      p.abs,
      p.h,
      p.m,
      p.s,
      p.netSalary,
      p.withholdingTax,
      p.personalLifeRetIns,
      p.totalGsisDeds,
      p.totalPagibigDeds,
      p.totalOtherDeds,
      p.totalDeductions,
      p.pay1st,
      p.pay2nd,
      p.pay1stCompute,
      p.pay2ndCompute,
      p.rtIns,
      p.ec,
      p.status,
      CONCAT_WS(', ', pt.lastName, CONCAT_WS(' ', pt.firstName, pt.middleName, pt.nameExtension)) AS name,
      r.nbc594,
      r.increment,
      r.gsisSalaryLoan,
      r.gsisPolicyLoan,
      r.gsisArrears,
      r.cpl,
      r.mpl,
      r.eal,
      r.mplLite,
      r.emergencyLoan,
      r.pagibigFundCont,
      r.pagibig2,
      r.multiPurpLoan,
      r.landbankSalaryLoan,
      r.earistCreditCoop,
      r.feu,
      r.liquidatingCash,
      itt.item_description AS position,
      sgt.sg_number,
      ph.PhilHealthContribution,
      da.code AS department,
      oar.overallRenderedOfficialTime,
      oar.overallRenderedOfficialTimeTardiness,
      oar.totalRenderedTimeMorning,
      oar.totalRenderedTimeMorningTardiness,
      oar.totalRenderedTimeAfternoon,
      oar.totalRenderedTimeAfternoonTardiness,
      oar.totalRenderedHonorarium,
      oar.totalRenderedHonorariumTardiness,
      oar.totalRenderedServiceCredit,
      oar.totalRenderedServiceCreditTardiness,
      oar.totalRenderedOvertime,
      oar.totalRenderedOvertimeTardiness,
      CASE itt.step
        WHEN 'step1' THEN sgt.step1
        WHEN 'step2' THEN sgt.step2
        WHEN 'step3' THEN sgt.step3
        WHEN 'step4' THEN sgt.step4
        WHEN 'step5' THEN sgt.step5
        WHEN 'step6' THEN sgt.step6
        WHEN 'step7' THEN sgt.step7
        WHEN 'step8' THEN sgt.step8
        ELSE NULL
      END AS rateNbc594
    FROM payroll_processing p
    LEFT JOIN person_table pt ON pt.agencyEmployeeNum = p.employeeNumber
    LEFT JOIN (
      SELECT employeeNumber,
             MAX(id) as max_id
      FROM remittance_table
      GROUP BY employeeNumber
    ) r_max ON p.employeeNumber = r_max.employeeNumber
    LEFT JOIN remittance_table r ON r.employeeNumber = p.employeeNumber AND r.id = r_max.max_id
    LEFT JOIN (
      SELECT employeeNumber,
             MAX(id) as max_id
      FROM philhealth
      GROUP BY employeeNumber
    ) ph_max ON p.employeeNumber = ph_max.employeeNumber
    LEFT JOIN philhealth ph ON ph.employeeNumber = p.employeeNumber AND ph.id = ph_max.max_id
    LEFT JOIN (
      SELECT employeeNumber,
             MAX(id) as max_id
      FROM department_assignment
      GROUP BY employeeNumber
    ) da_max ON p.employeeNumber = da_max.employeeNumber
    LEFT JOIN department_assignment da ON da.employeeNumber = p.employeeNumber AND da.id = da_max.max_id
    LEFT JOIN (
      SELECT employeeID,
             MAX(id) as max_id
      FROM item_table
      GROUP BY employeeID
    ) itt_max ON p.employeeNumber = itt_max.employeeID
    LEFT JOIN item_table itt ON itt.employeeID = p.employeeNumber AND itt.id = itt_max.max_id
    LEFT JOIN (
      SELECT la.employeeNumber, la.remaining_hours
      FROM leave_assignment la
      WHERE (la.carried_forward_hours IS NULL OR la.carried_forward_hours = 0)
        AND la.id = (
          SELECT id FROM leave_assignment la2
          WHERE la2.employeeNumber = la.employeeNumber
            AND (la2.carried_forward_hours IS NULL OR la2.carried_forward_hours = 0)
          ORDER BY la2.period_year DESC,
            CASE
              WHEN la2.period_semester LIKE '%2nd%' THEN 2
              WHEN la2.period_semester LIKE '%1st%' THEN 1
              ELSE 0
            END DESC
          LIMIT 1
        )
    ) lav ON lav.employeeNumber = p.employeeNumber
    LEFT JOIN salary_grade_table sgt ON sgt.sg_number = itt.salary_grade
      AND sgt.effectivityDate = itt.effectivityDate
    LEFT JOIN (
      SELECT personID, startDate, endDate, overallRenderedOfficialTime,
             overallRenderedOfficialTimeTardiness, totalRenderedTimeMorning,
             totalRenderedTimeMorningTardiness, totalRenderedTimeAfternoon,
             totalRenderedTimeAfternoonTardiness, totalRenderedHonorarium,
             totalRenderedHonorariumTardiness, totalRenderedServiceCredit,
             totalRenderedServiceCreditTardiness, totalRenderedOvertime,
             totalRenderedOvertimeTardiness, MAX(id) AS max_id
      FROM overall_attendance_record
      GROUP BY personID, startDate, endDate
    ) oar ON oar.personID = p.employeeNumber
      AND oar.startDate = p.startDate
      AND oar.endDate = p.endDate
    WHERE (p.rh IS NULL OR p.rh = "")
      AND (p.employeeNumber LIKE ? OR CONCAT_WS(', ', pt.lastName, CONCAT_WS(' ', pt.firstName, pt.middleName, pt.nameExtension)) LIKE ?)
  `;

  const searchPattern = `%${searchTerm}%`;

  db.query(query, [searchPattern, searchPattern], (err, results) => {
    if (err) {
      console.error('Error searching payroll data:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    let recordId = results.length > 0 ? results[0].id : null;
    logAudit(req.user, 'search', 'Payroll Processing', recordId, searchTerm);
    res.json(results);
  });
});

router.get('/payroll-with-remittance', authenticateToken, (req, res) => {
  const { employeeNumber, startDate, endDate } = req.query;

  if (employeeNumber && startDate && endDate) {
    const checkQuery = `
      SELECT * FROM payroll_processing
      WHERE employeeNumber = ? AND startDate = ? AND endDate = ?
        AND (rh IS NULL OR rh = "")
    `;

    db.query(
      checkQuery,
      [employeeNumber, startDate, endDate],
      (err, result) => {
        if (err) {
          console.error('Error checking existing payroll data:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (result.length > 0) {
          return res.json({ exists: true });
        }

        res.json({ exists: false });
      },
    );
  } else {
    const query = `
      SELECT
        p.id,
        p.department AS code,
        p.employeeNumber,
        p.startDate,
        p.endDate,
        p.rateNbc584,
        p.rateNbc594,
        p.nbcDiffl597,
        p.grossSalary,
        p.abs,
        COALESCE(lav.remaining_hours, 0) AS tevl,
        p.h,
        p.m,
        p.s,
        p.netSalary,
        p.withholdingTax,
        p.personalLifeRetIns,
        p.totalGsisDeds,
        p.totalPagibigDeds,
        p.totalOtherDeds,
        p.totalDeductions,
        p.pay1st,
        p.pay2nd,
        p.pay1stCompute,
        p.pay2ndCompute,
        p.rtIns,
        p.ec,
        p.status,
        CONCAT_WS(', ', pt.lastName, CONCAT_WS(' ', pt.firstName, pt.middleName, pt.nameExtension)) AS name,
        r.nbc594,
        r.increment,
        r.gsisSalaryLoan,
        r.gsisPolicyLoan,
        r.gsisArrears,
        r.cpl,
        r.mpl,
        r.eal,
        r.mplLite,
        r.emergencyLoan,
        r.pagibigFundCont,
        r.pagibig2,
        r.multiPurpLoan,
        r.landbankSalaryLoan,
        r.earistCreditCoop,
        r.feu,
        r.liquidatingCash,
        itt.item_description AS position,
        sgt.sg_number,
        ph.PhilHealthContribution,
        da.code AS department,
        oar.overallRenderedOfficialTime,
        oar.overallRenderedOfficialTimeTardiness,
        oar.totalRenderedTimeMorning,
        oar.totalRenderedTimeMorningTardiness,
        oar.totalRenderedTimeAfternoon,
        oar.totalRenderedTimeAfternoonTardiness,
        oar.totalRenderedHonorarium,
        oar.totalRenderedHonorariumTardiness,
        oar.totalRenderedServiceCredit,
        oar.totalRenderedServiceCreditTardiness,
        oar.totalRenderedOvertime,
        oar.totalRenderedOvertimeTardiness,
        CASE itt.step
          WHEN 'step1' THEN sgt.step1
          WHEN 'step2' THEN sgt.step2
          WHEN 'step3' THEN sgt.step3
          WHEN 'step4' THEN sgt.step4
          WHEN 'step5' THEN sgt.step5
          WHEN 'step6' THEN sgt.step6
          WHEN 'step7' THEN sgt.step7
          WHEN 'step8' THEN sgt.step8
          ELSE NULL
        END AS rateNbc594
      FROM payroll_processing p
      LEFT JOIN person_table pt ON pt.agencyEmployeeNum = p.employeeNumber
      LEFT JOIN (
        SELECT employeeNumber,
               MAX(id) as max_id
        FROM remittance_table
        GROUP BY employeeNumber
      ) r_max ON p.employeeNumber = r_max.employeeNumber
      LEFT JOIN remittance_table r ON r.employeeNumber = p.employeeNumber AND r.id = r_max.max_id
      LEFT JOIN (
        SELECT employeeNumber,
               MAX(id) as max_id
        FROM philhealth
        GROUP BY employeeNumber
      ) ph_max ON p.employeeNumber = ph_max.employeeNumber
      LEFT JOIN philhealth ph ON ph.employeeNumber = p.employeeNumber AND ph.id = ph_max.max_id
      LEFT JOIN (
        SELECT employeeNumber,
               MAX(id) as max_id
        FROM department_assignment
        GROUP BY employeeNumber
      ) da_max ON p.employeeNumber = da_max.employeeNumber
      LEFT JOIN department_assignment da ON da.employeeNumber = p.employeeNumber AND da.id = da_max.max_id
      LEFT JOIN (
        SELECT employeeID,
               MAX(id) as max_id
        FROM item_table
        GROUP BY employeeID
      ) itt_max ON p.employeeNumber = itt_max.employeeID
      LEFT JOIN item_table itt ON itt.employeeID = p.employeeNumber AND itt.id = itt_max.max_id
      LEFT JOIN (
        SELECT la.employeeNumber, la.remaining_hours
        FROM leave_assignment la
        WHERE (la.carried_forward_hours IS NULL OR la.carried_forward_hours = 0)
          AND la.id = (
            SELECT id FROM leave_assignment la2
            WHERE la2.employeeNumber = la.employeeNumber
              AND (la2.carried_forward_hours IS NULL OR la2.carried_forward_hours = 0)
            ORDER BY la2.period_year DESC,
              CASE
                WHEN la2.period_semester LIKE '%2nd%' THEN 2
                WHEN la2.period_semester LIKE '%1st%' THEN 1
                ELSE 0
              END DESC
            LIMIT 1
          )
      ) lav ON lav.employeeNumber = p.employeeNumber
      LEFT JOIN salary_grade_table sgt ON sgt.sg_number = itt.salary_grade
        AND sgt.effectivityDate = itt.effectivityDate
      LEFT JOIN (
        SELECT personID, startDate, endDate, overallRenderedOfficialTime,
               overallRenderedOfficialTimeTardiness, totalRenderedTimeMorning,
               totalRenderedTimeMorningTardiness, totalRenderedTimeAfternoon,
               totalRenderedTimeAfternoonTardiness, totalRenderedHonorarium,
               totalRenderedHonorariumTardiness, totalRenderedServiceCredit,
               totalRenderedServiceCreditTardiness, totalRenderedOvertime,
               totalRenderedOvertimeTardiness, MAX(id) AS max_id
        FROM overall_attendance_record
        GROUP BY personID, startDate, endDate
      ) oar ON oar.personID = p.employeeNumber
        AND oar.startDate = p.startDate
        AND oar.endDate = p.endDate
      WHERE p.rh IS NULL OR p.rh = ""
    `;

    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching joined payroll data:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      console.log('Payroll query results count:', results.length);
      if (results.length > 0) {
        console.log('Sample result with attendance data:', {
          employeeNumber: results[0].employeeNumber,
          h: results[0].h,
          m: results[0].m,
          s: results[0].s,
          overallRenderedOfficialTime: results[0].overallRenderedOfficialTime,
          overallRenderedOfficialTimeTardiness:
            results[0].overallRenderedOfficialTimeTardiness,
        });
      }

      if (req.user) {
        logAudit(req.user, 'view', 'Payroll Processing', null, null);
      }

      res.json(results);
    });
  }
});

router.put(
  '/payroll-with-remittance/:employeeNumber/:startDate/:endDate',
  authenticateToken,
  (req, res) => {
    const { employeeNumber, startDate, endDate } = req.params;
    const {
      name,
      rateNbc584,
      rateNbc594,
      nbcDiffl597,
      grossSalary,
      tevl,
      // dvlt and vlb removed
      abs,
      h,
      m,
      s,
      netSalary,
      withholdingTax,
      personalLifeRetIns,
      totalGsisDeds,
      totalPagibigDeds,
      totalOtherDeds,
      totalDeductions,
      pay1st,
      pay2nd,
      pay1stCompute,
      pay2ndCompute,
      rtIns,
      ec,
      nbc594,
      increment,
      gsisSalaryLoan,
      gsisPolicyLoan,
      gsisArrears,
      cpl,
      mpl,
      eal,
      mplLite,
      emergencyLoan,
      pagibigFundCont,
      pagibig2,
      multiPurpLoan,
      position,
      liquidatingCash,
      landbankSalaryLoan,
      earistCreditCoop,
      feu,
      PhilHealthContribution,
      department,
    } = req.body;

    const nameExtensionCandidates = ['Jr.', 'Sr.', 'II', 'III', 'IV'];

    let lastName = '';
    let firstName = '';
    let middleName = '';
    let nameExtension = '';

    if (typeof name === 'string') {
      const [last, firstMiddle] = name.split(',').map((part) => part.trim());

      if (last && firstMiddle) {
        lastName = last;

        const nameParts = firstMiddle.split(' ').filter(Boolean);
        if (nameParts.length > 0) {
          firstName = nameParts[0];
          const middleParts = [];

          for (let i = 1; i < nameParts.length; i++) {
            if (nameExtensionCandidates.includes(nameParts[i])) {
              nameExtension = nameParts[i];
            } else {
              middleParts.push(nameParts[i]);
            }
          }

          middleName = middleParts.join(' ');
        }
      }
    } else {
      console.error('Invalid name input:', name);
    }

    const payrollQuery = `
    UPDATE payroll_processing p
    LEFT JOIN item_table itt ON p.employeeNumber = itt.employeeID
    SET
      p.department = ?,
      p.name = ?,
      itt.item_description = ?,
      p.rateNbc584 =?,
      p.rateNbc594 = ?,
      p.nbcDiffl597 =?,
      p.grossSalary = ?,
      p.tevl = ?,
      p.abs = ?,
      p.h = ?,
      p.m = ?,
      p.s = ?,
      p.netSalary = ?,
      p.withholdingTax = ?,
      p.personalLifeRetIns = ?,
      p.totalGsisDeds = ?,
      p.totalPagibigDeds = ?,
      p.totalOtherDeds = ?,
      p.totalDeductions = ?,
      p.pay1st = ?,
      p.pay2nd = ?,
      p.pay1stCompute = ?,
      p.pay2ndCompute = ?,
      p.rtIns = ?,
      p.ec = ?
    WHERE p.employeeNumber = ? AND p.startDate = ? AND p.endDate = ?
  `;

    const payrollValues = [
      department,
      name,
      position,
      rateNbc584,
      rateNbc594,
      nbcDiffl597,
      grossSalary,
      tevl,
      // dvlt and vlb removed from values
      abs,
      h,
      m,
      s,
      netSalary,
      withholdingTax,
      personalLifeRetIns,
      totalGsisDeds,
      totalPagibigDeds,
      totalOtherDeds,
      totalDeductions,
      pay1st,
      pay2nd,
      pay1stCompute,
      pay2ndCompute,
      rtIns,
      ec,
      employeeNumber,
      startDate,
      endDate,
    ];

    db.query(payrollQuery, payrollValues, (err, result) => {
      if (err) {
        console.error('Error updating payroll data:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Fetch the payroll record id for audit logging
      const getIdQuery =
        'SELECT id FROM payroll_processing WHERE employeeNumber = ? AND startDate = ? AND endDate = ? LIMIT 1';
      db.query(
        getIdQuery,
        [employeeNumber, startDate, endDate],
        (idErr, idResult) => {
          if (idErr || !idResult || idResult.length === 0) {
            console.error('Error fetching payroll id for audit log:', idErr);
            // Proceed without id
            logAudit(
              req.user,
              'update',
              'Payroll Processing',
              null,
              employeeNumber,
            );
          } else {
            logAudit(
              req.user,
              'update',
              'Payroll Processing',
              idResult[0].id,
              employeeNumber,
            );
          }

          const checkRemittanceQuery = `
          SELECT id FROM remittance_table
          WHERE employeeNumber = ?
          ORDER BY id DESC
          LIMIT 1
        `;

          db.query(
            checkRemittanceQuery,
            [employeeNumber],
            (err2, checkResult) => {
              if (err2) {
                console.error('Error checking existing remittance:', err2);
                return res.status(500).json({ error: 'Internal server error' });
              }

              const remittanceValues = [
                nbc594 || 0,
                increment || 0,
                gsisSalaryLoan || 0,
                gsisPolicyLoan || 0,
                gsisArrears || 0,
                cpl || 0,
                mpl || 0,
                eal || 0,
                mplLite || 0,
                emergencyLoan || 0,
                pagibigFundCont || 0,
                pagibig2 || 0,
                multiPurpLoan || 0,
                liquidatingCash || 0,
                landbankSalaryLoan || 0,
                earistCreditCoop || 0,
                feu || 0,
              ];

              if (checkResult.length > 0) {
                const updateRemittanceQuery = `
            UPDATE remittance_table SET
              nbc594 = ?,
              increment = ?,
              gsisSalaryLoan = ?,
              gsisPolicyLoan = ?,
              gsisArrears = ?,
              cpl = ?,
              mpl = ?,
              eal = ?,
              mplLite = ?,
              emergencyLoan = ?,
              pagibigFundCont = ?,
              pagibig2 = ?,
              multiPurpLoan = ?,
              liquidatingCash = ?,
              landbankSalaryLoan = ?,
              earistCreditCoop = ?,
              feu = ?
            WHERE employeeNumber = ?
          `;

                db.query(
                  updateRemittanceQuery,
                  [...remittanceValues, employeeNumber],
                  (err3) => {
                    if (err3) {
                      console.error('Error updating remittance data:', err3);
                      return res
                        .status(500)
                        .json({ error: 'Internal server error' });
                    }
                    console.log(
                      'Remittance record updated for employee:',
                      employeeNumber,
                    );
                    proceedWithPersonUpdate();
                  },
                );
              } else {
                const insertRemittanceQuery = `
            INSERT INTO remittance_table (
              employeeNumber,
              nbc594,
              increment,
              gsisSalaryLoan,
              gsisPolicyLoan,
              gsisArrears,
              cpl,
              mpl,
              eal,
              mplLite,
              emergencyLoan,
              pagibigFundCont,
              pagibig2,
              multiPurpLoan,
              liquidatingCash,
              landbankSalaryLoan,
              earistCreditCoop,
              feu
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

                db.query(
                  insertRemittanceQuery,
                  [employeeNumber, ...remittanceValues],
                  (err3) => {
                    if (err3) {
                      console.error('Error inserting remittance data:', err3);
                      return res
                        .status(500)
                        .json({ error: 'Internal server error' });
                    }
                    console.log(
                      'New remittance record created for employee:',
                      employeeNumber,
                    );
                    proceedWithPersonUpdate();
                  },
                );
              }

              function proceedWithPersonUpdate() {
                const personQuery = `
            UPDATE person_table
            SET firstName = ?, middleName = ?, lastName = ?, nameExtension = ?
            WHERE agencyEmployeeNum = ?
          `;

                db.query(
                  personQuery,
                  [
                    firstName,
                    middleName,
                    lastName,
                    nameExtension,
                    employeeNumber,
                  ],
                  (err3) => {
                    if (err3) {
                      console.error('Error updating person name:', err3);
                      return res
                        .status(500)
                        .json({ error: 'Internal server error' });
                    }

                    const philHealthQuery = `
                UPDATE philhealth
                SET PhilHealthContribution = ?
                WHERE employeeNumber = ?
              `;

                    db.query(
                      philHealthQuery,
                      [PhilHealthContribution, employeeNumber],
                      (err4) => {
                        if (err4) {
                          console.error(
                            'Error updating PhilHealth contribution:',
                            err4,
                          );
                          return res
                            .status(500)
                            .json({ error: 'Internal server error' });
                        }

                        const departmentAssignmentQuery = `
                    UPDATE department_assignment
                    SET code = ?
                    WHERE employeeNumber = ?
                  `;

                        db.query(
                          departmentAssignmentQuery,
                          [department, employeeNumber],
                          (err5) => {
                            if (err5) {
                              console.error(
                                'Error updating department assignment:',
                                err5,
                              );
                              return res
                                .status(500)
                                .json({ error: 'Internal server error' });
                            }

                            notifyPayrollChanged('updated', {
                              module: 'payroll-processing',
                              employeeNumber,
                            });

                            res.json({
                              message: 'Payroll record updated successfully',
                            });
                          },
                        );
                      },
                    );
                  },
                );
              }
            },
          );
        },
      );
    });
  },
);

router.delete(
  '/payroll-with-remittance/:id/:employeeNumber',
  authenticateToken,
  (req, res) => {
    const { id, employeeNumber } = req.params;

    const query = `
    DELETE FROM payroll_processing
    WHERE id = ? AND employeeNumber = ?
  `;

    db.query(query, [id, employeeNumber], (err, result) => {
      if (err) {
        console.error('Error deleting payroll data:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ error: 'Payroll record not found or employee mismatch' });
      }

      logAudit(req.user, 'delete', 'Payroll Processing', id, employeeNumber);
      notifyPayrollChanged('deleted', {
        module: 'payroll-processing',
        id,
        employeeNumber,
      });
      res.json({ message: 'Payroll record deleted successfully' });
    });
  },
);

router.post('/add-rendered-time', authenticateToken, async (req, res) => {
  const attendanceData = req.body;

  console.log('Received attendance data for payroll:', attendanceData);

  if (!Array.isArray(attendanceData)) {
    return res.status(400).json({ error: 'Expected an array of data.' });
  }

  try {
    for (const record of attendanceData) {
      const {
        employeeNumber,
        startDate,
        endDate,
        overallRenderedOfficialTimeTardiness,
      } = record;

      const departmentQuery = `
        SELECT code FROM department_assignment
        WHERE employeeNumber = ?
        ORDER BY id DESC
        LIMIT 1
      `;

      const [departmentRows] = await db
        .promise()
        .query(departmentQuery, [employeeNumber]);

      if (departmentRows.length === 0) {
        return res.status(404).json({
          error: `Department not found for employee ${employeeNumber}.`,
        });
      }

      const departmentCode = departmentRows[0].code;

      // Parse HH:MM:SS (TARDINESS ONLY) into h, m, s
      let h = '00';
      let m = '00';
      let s = '00';

      if (overallRenderedOfficialTimeTardiness) {
        const parts = overallRenderedOfficialTimeTardiness.split(':');
        if (parts.length === 3) {
          h = parts[0].padStart(2, '0');
          m = parts[1].padStart(2, '0');
          s = parts[2].padStart(2, '0');
        }
      }

      // Avoid duplicate payroll entries
      const existsQuery = `
        SELECT id FROM payroll_processing
        WHERE employeeNumber = ? AND startDate = ? AND endDate = ?
        LIMIT 1
      `;

      const [existingRows] = await db
        .promise()
        .query(existsQuery, [employeeNumber, startDate, endDate]);

      if (existingRows.length === 0) {
        const insertQuery = `
          INSERT INTO payroll_processing (employeeNumber, startDate, endDate, h, m, s, department)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        await db
          .promise()
          .query(insertQuery, [
            employeeNumber,
            startDate,
            endDate,
            h,
            m,
            s,
            departmentCode,
          ]);
      }

      logAudit(
        req.user,
        'insert',
        'Payroll Processing (tardiness only)',
        `${startDate} && ${endDate}`,
        employeeNumber,
      );
    }

    notifyPayrollChanged('imported', {
      module: 'payroll-processing',
      count: attendanceData.length,
    });

    res
      .status(200)
      .json({ message: 'Records added to payroll with time data.' });
  } catch (err) {
    console.error('Error inserting into payroll:', err);
    res.status(500).json({ error: 'Failed to insert payroll records.' });
  }
});

// Updated route name to match database table name
router.get('/payroll-processed', authenticateToken, (req, res) => {
  const query = `
    SELECT pp.*, COALESCE(ec.employmentCategory, -1) AS employmentCategory
    FROM payroll_processed pp
    LEFT JOIN employment_category ec ON pp.employeeNumber = ec.employeeNumber
    ORDER BY pp.dateCreated DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching payroll processed:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // Audit log
    logAudit(
      req.user,
      'view',
      'payroll_processed',
      results.length > 0 ? results[0].id : null,
    );

    res.json(results);
  });
});

// Keep old route for backward compatibility (deprecated)
router.get('/finalized-payroll', authenticateToken, (req, res) => {
  const query = `
    SELECT pp.*, COALESCE(ec.employmentCategory, -1) AS employmentCategory
    FROM payroll_processed pp
    LEFT JOIN employment_category ec ON pp.employeeNumber = ec.employeeNumber
    ORDER BY pp.dateCreated DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching finalized payroll:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // Audit log
    logAudit(
      req.user,
      'view',
      'payroll_processed',
      results.length > 0 ? results[0].id : null,
    );

    res.json(results);
  });
});

// GET finalized payroll for Regular employees only
router.get('/finalized-payroll-regular', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM payroll_processed ORDER BY dateCreated DESC';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching finalized regular payroll:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // Audit log
    logAudit(
      req.user,
      'view',
      'payroll_processed_regular',
      results.length > 0 ? results[0].id : null,
    );

    res.json(results);
  });
});

router.post('/finalized-payroll', authenticateToken, async (req, res) => {
  const payrollData = req.body;

  if (!Array.isArray(payrollData) || payrollData.length === 0) {
    return res.status(400).json({ error: 'No payroll data received.' });
  }

  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    const toInt = (v) => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : 0;
    };

    const toSeconds = (h, m, s) => toInt(h) * 3600 + toInt(m) * 60 + toInt(s);

    const secondsToHMS = (totalSeconds) => {
      const sec = Math.max(0, totalSeconds);
      return {
        h: Math.floor(sec / 3600),
        m: Math.floor((sec % 3600) / 60),
        s: sec % 60,
      };
    };

    const values = payrollData.map((entry) => {
      // ORIGINAL tardiness from payroll_processing
      const originalSeconds = toSeconds(entry.h, entry.m, entry.s);

      // TEVL deduction in seconds
      const tevlSeconds = toInt(entry.tevl) * 3600;

      // Compute adjusted tardiness
      const remainingSeconds = originalSeconds - tevlSeconds;
      const adjusted = secondsToHMS(remainingSeconds);
      const absHours =
        parseFloat(entry.grossSalary) * 0.0055555525544423 * adjusted.h;
      const absMinutes =
        parseFloat(entry.grossSalary) * 0.0000925948584897 * adjusted.m;
      const calculatedABS = absHours - absMinutes;

      return [
        entry.employeeNumber,
        entry.startDate,
        entry.endDate,
        entry.name,
        entry.rateNbc584,
        entry.nbc594,
        entry.rateNbc594,
        entry.nbcDiffl597,
        entry.grossSalary,

        entry.tevl ?? 0,
        entry.dvlt ?? '00:00:00',
        entry.vlb ?? '00:00:00',
        calculatedABS,

        // ✅ INSERT COMPUTED TIME (NOT ORIGINAL)
        adjusted.h,
        adjusted.m,
        adjusted.s,

        entry.rh ?? 0,
        entry.netSalary,
        entry.withholdingTax,
        entry.personalLifeRetIns,
        entry.totalGsisDeds,
        entry.totalPagibigDeds,
        entry.totalOtherDeds,
        entry.totalDeductions,
        entry.pay1st,
        entry.pay2nd,
        entry.pay1stCompute,
        entry.pay2ndCompute,
        entry.rtIns,
        entry.ec,
        entry.increment,
        entry.gsisSalaryLoan,
        entry.gsisPolicyLoan,
        entry.gsisArrears,
        entry.cpl,
        entry.mpl,
        entry.eal,
        entry.mplLite,
        entry.emergencyLoan,
        entry.pagibigFundCont,
        entry.pagibig2,
        entry.multiPurpLoan,
        entry.position,
        entry.liquidatingCash,
        entry.landbankSalaryLoan,
        entry.earistCreditCoop,
        entry.feu,
        entry.PhilHealthContribution,
        entry.department,
      ];
    });

    const insertQuery = `
      INSERT INTO payroll_processed (
        employeeNumber, startDate, endDate, name,
        rateNbc584, nbc594, rateNbc594, nbcDiffl597, grossSalary,
        tevl, dvlt, vlb, abs,
        h, m, s,
        rh, netSalary, withholdingTax, personalLifeRetIns,
        totalGsisDeds, totalPagibigDeds, totalOtherDeds,
        totalDeductions, pay1st, pay2nd,
        pay1stCompute, pay2ndCompute, rtIns, ec, increment,
        gsisSalaryLoan, gsisPolicyLoan, gsisArrears,
        cpl, mpl, eal, mplLite, emergencyLoan,
        pagibigFundCont, pagibig2, multiPurpLoan,
        position, liquidatingCash, landbankSalaryLoan,
        earistCreditCoop, feu, PhilHealthContribution, department
      ) VALUES ?
    `;

    await connection.query(insertQuery, [values]);

    // Only update status in payroll_processing
    try {
      await connection.beginTransaction();

      for (const entry of payrollData) {
        // Update payroll_processing status
        await connection.query(
          `UPDATE payroll_processing
          SET status = 1
          WHERE employeeNumber = ?
          AND startDate = ?
          AND endDate = ?`,
          [entry.employeeNumber, entry.startDate, entry.endDate],
        );

        // Update VL remaining hours
        await connection.query(
          `UPDATE leave_assignment
          SET remaining_hours = ?
          WHERE employeeNumber = ?
          AND leave_code = 'VL'`,
          [entry.vlb, entry.employeeNumber],
        );
      }

      await connection.commit();
      console.log('Payroll processed successfully');
    } catch (error) {
      await connection.rollback();
      console.error('Payroll processing failed:', error);
      throw error;
    }

    await connection.commit();

    res.json({
      message:
        'Payroll finalized successfully. Original time preserved. Processed time computed.',
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error finalizing payroll:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Updated DELETE route to match new endpoint naming
router.delete('/payroll-processed/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  // ✅ First fetch the unique identifiers from payroll_processed so we can update ONLY the matching processing row
  const selectQuery = `
    SELECT employeeNumber, startDate, endDate
    FROM payroll_processed
    WHERE id = ?
    LIMIT 1
  `;

  const deleteQuery = 'DELETE FROM payroll_processed WHERE id = ?';
  const updateQuery = `
    UPDATE payroll_processing
    SET status = 0
    WHERE employeeNumber = ? AND startDate = ? AND endDate = ?
  `;

  db.query(selectQuery, [id], (selectErr, rows) => {
    if (selectErr) return res.status(500).json({ error: selectErr.message });
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }

    const { employeeNumber, startDate, endDate } = rows[0];

    db.query(deleteQuery, [id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: 'Payroll record not found' });
      }

      db.query(
        updateQuery,
        [employeeNumber, startDate, endDate],
        (updateErr, updateResult) => {
          if (updateErr) {
            return res
              .status(500)
              .json({ error: 'Deleted but failed to update status.' });
          }

          // Audit log
          logAudit(req.user, 'delete', 'payroll_processed', id, employeeNumber);

          notifyPayrollChanged('deleted', { module: 'payroll-processed', id });

          res.json({
            message: 'Deleted and status updated.',
            deleted: results.affectedRows,
            updated: updateResult.affectedRows,
          });
        },
      );
    });
  });
});

// Keep old DELETE route for backward compatibility (deprecated)
router.delete('/finalized-payroll/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { employeeNumber, startDate, endDate } = req.body;

  const deleteQuery = 'DELETE FROM payroll_processed WHERE id = ?';
  const updateQuery = `
	  UPDATE payroll_processing
	  SET status = 0
	  WHERE employeeNumber = ? AND startDate = ? AND endDate = ?
	`;

  db.query(deleteQuery, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }

    db.query(
      updateQuery,
      [employeeNumber, startDate, endDate],
      (updateErr, updateResult) => {
        if (updateErr) {
          return res
            .status(500)
            .json({ error: 'Deleted but failed to update status.' });
        }

        // Audit log
        logAudit(req.user, 'delete', 'payroll_processed', id, employeeNumber);

        notifyPayrollChanged('deleted', { module: 'payroll-processed', id });

        res.json({
          message: 'Deleted and status updated.',
          deleted: results.affectedRows,
          updated: updateResult.affectedRows,
        });
      },
    );
  });
});

module.exports = router;
