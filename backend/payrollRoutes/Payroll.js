const db = require('../db');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { notifyPayrollChanged } = require('../socket/socketService');
const { logAudit } = require('../middleware/auth');

const getUserDisplayName = (user) => {
  const parts = [user.firstName, user.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : (user.username || user.employeeNumber || 'Unknown');
};

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────

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



// ─────────────────────────────────────────────
// UTILITY: time helpers
// ─────────────────────────────────────────────

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

const hmsStringToHours = (hmsString) => {
  if (!hmsString) return 0;
  const parts = String(hmsString).split(':');
  if (parts.length === 3) {
    return (
      parseInt(parts[0]) + parseInt(parts[1]) / 60 + parseInt(parts[2]) / 3600
    );
  }
  const num = parseFloat(hmsString);
  return Number.isFinite(num) ? num : 0;
};

const formatHMS = (h, m, s) =>
  `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

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
      COALESCE(ec.employmentCategory, -1) AS employmentCategory,
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
    LEFT JOIN employment_category ec ON CAST(ec.employeeNumber AS CHAR) = CAST(p.employeeNumber AS CHAR)
    LEFT JOIN (
      SELECT employeeNumber, MAX(id) as max_id
      FROM remittance_table
      GROUP BY employeeNumber
    ) r_max ON p.employeeNumber = r_max.employeeNumber
    LEFT JOIN remittance_table r ON r.employeeNumber = p.employeeNumber AND r.id = r_max.max_id
    LEFT JOIN (
      SELECT employeeNumber, MAX(id) as max_id
      FROM philhealth
      GROUP BY employeeNumber
    ) ph_max ON p.employeeNumber = ph_max.employeeNumber
    LEFT JOIN philhealth ph ON ph.employeeNumber = p.employeeNumber AND ph.id = ph_max.max_id
    LEFT JOIN (
      SELECT employeeNumber, MAX(id) as max_id
      FROM department_assignment
      GROUP BY employeeNumber
    ) da_max ON p.employeeNumber = da_max.employeeNumber
    LEFT JOIN department_assignment da ON da.employeeNumber = p.employeeNumber AND da.id = da_max.max_id
    LEFT JOIN (
      SELECT employeeID, MAX(id) as max_id
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
      AND COALESCE(ec.employmentCategory, -1) IN (2, 3, 4, -1)
      AND (
        p.employeeNumber LIKE ?
        OR CONCAT_WS(', ', pt.lastName, CONCAT_WS(' ', pt.firstName, pt.middleName, pt.nameExtension)) LIKE ?
      )
  `;

  const searchPattern = `%${searchTerm}%`;

  db.query(query, [searchPattern, searchPattern], (err, results) => {
    if (err) {
      console.error('Error searching payroll data:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json(results);
  });
});

router.get('/payroll-with-remittance', authenticateToken, (req, res) => {
  const { employeeNumber, startDate, endDate, searchTerm } = req.query; // ← add searchTerm

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
        return res.json({ exists: result.length > 0 });
      },
    );
  } else {
    let baseQuery = `
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
        COALESCE(ec.employmentCategory, -1) AS employmentCategory,
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
      LEFT JOIN employment_category ec ON CAST(ec.employeeNumber AS CHAR) = CAST(p.employeeNumber AS CHAR)
      LEFT JOIN (
        SELECT employeeNumber, MAX(id) as max_id
        FROM remittance_table
        GROUP BY employeeNumber
      ) r_max ON p.employeeNumber = r_max.employeeNumber
      LEFT JOIN remittance_table r ON r.employeeNumber = p.employeeNumber AND r.id = r_max.max_id
      LEFT JOIN (
        SELECT employeeNumber, MAX(id) as max_id
        FROM philhealth
        GROUP BY employeeNumber
      ) ph_max ON p.employeeNumber = ph_max.employeeNumber
      LEFT JOIN philhealth ph ON ph.employeeNumber = p.employeeNumber AND ph.id = ph_max.max_id
      LEFT JOIN (
        SELECT employeeNumber, MAX(id) as max_id
        FROM department_assignment
        GROUP BY employeeNumber
      ) da_max ON p.employeeNumber = da_max.employeeNumber
      LEFT JOIN department_assignment da ON da.employeeNumber = p.employeeNumber AND da.id = da_max.max_id
      LEFT JOIN (
        SELECT employeeID, MAX(id) as max_id
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
        AND COALESCE(ec.employmentCategory, -1) IN (2, 3, 4, -1)
    `;

    const queryParams = [];

    // ← Add search filter if searchTerm is provided
    if (searchTerm) {
      baseQuery += ` AND (
        p.employeeNumber LIKE ?
        OR CONCAT_WS(', ', pt.lastName, CONCAT_WS(' ', pt.firstName, pt.middleName, pt.nameExtension)) LIKE ?
      )`;
      const searchPattern = `%${searchTerm}%`;
      queryParams.push(searchPattern, searchPattern);
    }

    db.query(baseQuery, queryParams, (err, results) => {
      if (err) {
        console.error('Error fetching joined payroll data:', err);
        return res.status(500).json({ error: 'Internal server error' });
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
        p.rateNbc584 = ?,
        p.rateNbc594 = ?,
        p.nbcDiffl597 = ?,
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

      const getIdQuery =
        'SELECT id FROM payroll_processing WHERE employeeNumber = ? AND startDate = ? AND endDate = ? LIMIT 1';
      db.query(
        getIdQuery,
        [employeeNumber, startDate, endDate],
        (idErr, idResult) => {
          const checkRemittanceQuery = `
          SELECT id FROM remittance_table
          WHERE employeeNumber = ?
          ORDER BY id DESC LIMIT 1
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
                nbc594 = ?, increment = ?,
                gsisSalaryLoan = ?, gsisPolicyLoan = ?, gsisArrears = ?,
                cpl = ?, mpl = ?, eal = ?, mplLite = ?, emergencyLoan = ?,
                pagibigFundCont = ?, pagibig2 = ?, multiPurpLoan = ?,
                liquidatingCash = ?, landbankSalaryLoan = ?,
                earistCreditCoop = ?, feu = ?
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
                    proceedWithPersonUpdate();
                  },
                );
              } else {
                const insertRemittanceQuery = `
              INSERT INTO remittance_table (
                employeeNumber, nbc594, increment,
                gsisSalaryLoan, gsisPolicyLoan, gsisArrears,
                cpl, mpl, eal, mplLite, emergencyLoan,
                pagibigFundCont, pagibig2, multiPurpLoan,
                liquidatingCash, landbankSalaryLoan,
                earistCreditCoop, feu
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

                    db.query(
                      'UPDATE philhealth SET PhilHealthContribution = ? WHERE employeeNumber = ?',
                      [PhilHealthContribution, employeeNumber],
                      (err4) => {
                        if (err4) {
                          console.error('Error updating PhilHealth:', err4);
                          return res
                            .status(500)
                            .json({ error: 'Internal server error' });
                        }

                        db.query(
                          'UPDATE department_assignment SET code = ? WHERE employeeNumber = ?',
                          [department, employeeNumber],
                          (err5) => {
                            if (err5) {
                              console.error('Error updating department:', err5);
                              return res
                                .status(500)
                                .json({ error: 'Internal server error' });
                            }

                            notifyPayrollChanged('updated', {
                              module: 'payroll-processing',
                              employeeNumber,
                            });
                            try {
                              logAudit(req.user, 'UPDATE', 'payroll_processing', employeeNumber, employeeNumber);
                            } catch (e) { console.error('Audit log error:', e); }
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

      notifyPayrollChanged('deleted', {
        module: 'payroll-processing',
        id,
        employeeNumber,
      });
      try {
        logAudit(req.user, 'DELETE', 'payroll_processing', id, employeeNumber);
      } catch (e) { console.error('Audit log error:', e); }
      res.json({ message: 'Payroll record deleted successfully' });
    });
  },
);

router.post('/add-rendered-time', authenticateToken, async (req, res) => {
  const attendanceData = req.body;

  if (!Array.isArray(attendanceData)) {
    return res.status(400).json({ error: 'Expected an array of data.' });
  }

  let newCount = 0;

  try {
    for (const record of attendanceData) {
      const {
        employeeNumber,
        startDate,
        endDate,
        overallRenderedOfficialTimeTardiness,
      } = record;

      const [departmentRows] = await db
        .promise()
        .query(
          'SELECT code FROM department_assignment WHERE employeeNumber = ? ORDER BY id DESC LIMIT 1',
          [employeeNumber],
        );

      if (departmentRows.length === 0) {
        return res
          .status(404)
          .json({
            error: `Department not found for employee ${employeeNumber}.`,
          });
      }

      const departmentCode = departmentRows[0].code;

      let h = '00',
        m = '00',
        s = '00';
      if (overallRenderedOfficialTimeTardiness) {
        const parts = overallRenderedOfficialTimeTardiness.split(':');
        if (parts.length === 3) {
          h = parts[0].padStart(2, '0');
          m = parts[1].padStart(2, '0');
          s = parts[2].padStart(2, '0');
        }
      }

      const [existingRows] = await db
        .promise()
        .query(
          'SELECT id, rh, rm, rs FROM payroll_processing WHERE employeeNumber = ? AND startDate = ? AND endDate = ? LIMIT 5',
          [employeeNumber, startDate, endDate],
        );

      console.log(`[add-rendered-time] emp=${employeeNumber} start=${startDate} end=${endDate} | found rows:`, JSON.stringify(existingRows));

      const hasRegularRecord = existingRows.some(
        (row) => row.rh === null || row.rh === '' || row.rh === 0,
      );

      if (!hasRegularRecord) {
        await db
          .promise()
          .query(
            'INSERT INTO payroll_processing (employeeNumber, startDate, endDate, h, m, s, rh, rm, rs, department) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?)',
            [employeeNumber, startDate, endDate, h, m, s, departmentCode],
          );
        newCount++;

        // ── audit log per new record ──────────────────────────────────────
        try {
          logAudit(req.user, 'ADD', 'payroll_processing', employeeNumber, employeeNumber);
        } catch (e) { console.error('Audit log error:', e); }
      }

    }

    notifyPayrollChanged('imported', {
      module: 'payroll-processing',
      count: newCount,
    });
    try {
      logAudit(req.user, 'ADD', 'payroll_processing', null, null);
    } catch (e) { console.error('Audit log error:', e); }
    res
      .status(200)
      .json({ message: 'Records added to payroll with time data.', newCount, totalSubmitted: attendanceData.length });
  } catch (err) {
    console.error('Error inserting into payroll:', err);
    res.status(500).json({ error: 'Failed to insert payroll records.' });
  }
});

// ─────────────────────────────────────────────
// GET payroll-processed
// ─────────────────────────────────────────────

router.get('/payroll-processed', authenticateToken, (req, res) => {
  const query = `
    SELECT pp.*, COALESCE(ec.employmentCategory, -1) AS employmentCategory
    FROM payroll_processed pp
    LEFT JOIN employment_category ec ON CAST(pp.employeeNumber AS CHAR) = CAST(ec.employeeNumber AS CHAR)
    ORDER BY pp.dateCreated DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching payroll processed:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    res.json(results);
  });
});


router.post('/payroll-processed', authenticateToken, async (req, res) => {
  const payrollData = req.body;

  if (!Array.isArray(payrollData) || payrollData.length === 0) {
    return res.status(400).json({ error: 'No payroll data received.' });
  }

  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    // ── Build INSERT values for payroll_processed ──────────────────────────
    const values = payrollData.map((entry) => {
      const originalSeconds = toSeconds(entry.h, entry.m, entry.s);

      // The frontend already sent tevl with +10 included.
      // We store tevl as-is; we record the +10 credit separately in the audit.
      const tevlSeconds = toInt(entry.tevl) * 3600;

      // Compute how many seconds of tardiness are absorbed by VL (DVLT)
      const dvltSeconds = Math.min(tevlSeconds, originalSeconds);
      const vlbSeconds = Math.max(0, tevlSeconds - dvltSeconds);

      const dvlt = formatHMS(...Object.values(secondsToHMS(dvltSeconds)));
      const vlb = formatHMS(...Object.values(secondsToHMS(vlbSeconds)));

      // Remaining tardiness after VL absorption (used for ABS computation)
      const remainingSeconds = Math.max(0, originalSeconds - tevlSeconds);
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
        entry.tevl ?? 0, // stored WITH the +10 already included
        dvlt,
        vlb,
        calculatedABS,
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

    const _actorName = getUserDisplayName(req.user);
    const _actorEmpNum = req.user?.employeeNumber ? String(req.user.employeeNumber) : null;
    const _actorDisplay = _actorEmpNum ? `${_actorName} (${_actorEmpNum})` : _actorName;

    for (const entry of payrollData) {
      const tardySeconds = toSeconds(entry.h, entry.m, entry.s);
      const tevlAfterCredit = parseFloat(entry.tevl) || 0;
      const tevlSeconds = tevlAfterCredit * 3600;
      const dvltSeconds = Math.min(tevlSeconds, tardySeconds);
      const vlbSeconds = Math.max(0, tevlSeconds - dvltSeconds);
      const vlbHours = vlbSeconds / 3600;

      const finalLeaveHours =
        tardySeconds === 0
          ? tevlAfterCredit
          : vlbHours;

      // ── 3. Update payroll_processing status ─────────────────────────────
      await connection.query(
        `UPDATE payroll_processing
         SET status = 1
         WHERE employeeNumber = ? AND startDate = ? AND endDate = ?`,
        [entry.employeeNumber, entry.startDate, entry.endDate],
      );

      // ── 4. Update leave_assignment ───────────────────────────────────────
      await connection.query(
        `UPDATE leave_assignment
         SET remaining_hours = ?
         WHERE employeeNumber = ? AND leave_code = 'VL'`,
        [finalLeaveHours, entry.employeeNumber],
      );

      // ── 5. Insert transaction_table records per employee ─────────────────
      const VL_CREDIT = 10;
      const tevlBefore = Math.max(0, tevlAfterCredit - VL_CREDIT);
      const dvltHours = dvltSeconds / 3600;

      const _empDisplay = entry.name ? `${entry.name} (${entry.employeeNumber})` : String(entry.employeeNumber);

      // 5a. VL credit added
      await connection.query(
        `INSERT INTO transaction_table (employee_id, message) VALUES (?, ?)`,
        [entry.employeeNumber, `${_actorDisplay} added VL monthly credit of +${VL_CREDIT} hrs for ${_empDisplay}. TEVL updated from ${tevlBefore.toFixed(2)} hrs to ${tevlAfterCredit.toFixed(2)} hrs.`],
      );

      // 5b. Tardiness absorbed by VL (only if there is tardiness)
      if (tardySeconds > 0) {
        await connection.query(
          `INSERT INTO transaction_table (employee_id, message) VALUES (?, ?)`,
          [entry.employeeNumber, `${_actorDisplay} applied tardiness deduction of ${(tardySeconds / 3600).toFixed(2)} hrs from TEVL for ${_empDisplay} (used to cover ABS). DVLT applied: ${dvltHours.toFixed(2)} hrs.`],
        );
      }

      // 5c. Remaining VL balance after deduction
      await connection.query(
        `INSERT INTO transaction_table (employee_id, message) VALUES (?, ?)`,
        [entry.employeeNumber, `${_actorDisplay} finalized VL balance for ${_empDisplay}: ${finalLeaveHours.toFixed(2)} hrs remaining after deduction.`],
      );

      // ── 6. Audit log per employee ────────────────────────────────────────
      try {
        logAudit(req.user, 'ADD', 'payroll_processed', entry.employeeNumber, entry.employeeNumber);
        logAudit(req.user, 'TEVL +10', 'leave_assignment', entry.employeeNumber, entry.employeeNumber);
        if (dvltSeconds > 0) {
          logAudit(req.user, 'DEDUCTED TEVL', 'leave_assignment', entry.employeeNumber, entry.employeeNumber);
        }
        logAudit(req.user, 'VL BALANCE', 'leave_assignment', entry.employeeNumber, entry.employeeNumber);
      } catch (e) { console.error('Audit log error:', e); }

    }

    await connection.commit();

    try {
      logAudit(req.user, 'ADD', 'payroll_processed', null, null);
    } catch (e) { console.error('Audit log error:', e); }

    res.json({
      message: 'Payroll finalized successfully.',
      processedCount: payrollData.length,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error finalizing payroll:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// ─────────────────────────────────────────────
// DELETE payroll-processed/:id
// ─────────────────────────────────────────────

router.delete('/payroll-processed/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      'SELECT employeeNumber, startDate, endDate, tevl FROM payroll_processed WHERE id = ? LIMIT 1',
      [id],
    );

    if (!rows || rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Payroll record not found' });
    }

    const { employeeNumber, startDate, endDate, tevl } = rows[0];

    // tevl in payroll_processed already has +10 included.
    // To restore leave balance: subtract the +10 credit that was added during finalization.
    const VL_MONTHLY_CREDIT_HOURS = 10;
    const originalLeaveHours = Math.max(
      0,
      (parseFloat(tevl) || 0) - VL_MONTHLY_CREDIT_HOURS,
    );

    // ── Delete the record ────────────────────────────────────────────────
    await connection.query('DELETE FROM payroll_processed WHERE id = ?', [id]);

    // ── Restore leave balance ────────────────────────────────────────────
    await connection.query(
      `UPDATE leave_assignment
       SET remaining_hours = ?
       WHERE employeeNumber = ? AND leave_code = 'VL'`,
      [originalLeaveHours, employeeNumber],
    );

    // ── Revert payroll_processing status ────────────────────────────────
    await connection.query(
      `UPDATE payroll_processing
       SET status = 0
       WHERE employeeNumber = ? AND startDate = ? AND endDate = ?`,
      [employeeNumber, startDate, endDate],
    );

    // ── Insert transaction_table records for deletion ────────────────────
    const _delActorName = getUserDisplayName(req.user);
    const _delActorEmpNum = req.user?.employeeNumber ? String(req.user.employeeNumber) : null;
    const _delActorDisplay = _delActorEmpNum ? `${_delActorName} (${_delActorEmpNum})` : _delActorName;

    // Entry 1: deletion event
    await connection.query(
      'INSERT INTO transaction_table (employee_id, message) VALUES (?, ?)',
      [employeeNumber, `${_delActorDisplay} deleted a payroll record. Employee's VL monthly credit has been reversed and balance adjusted.`],
    );
    // Entry 2: VL reversal detail
    await connection.query(
      'INSERT INTO transaction_table (employee_id, message) VALUES (?, ?)',
      [employeeNumber, `${_delActorDisplay} reversed VL credit of \u2212${VL_MONTHLY_CREDIT_HOURS} hrs. VL balance restored from ${(parseFloat(tevl) || 0).toFixed(2)} hrs to ${originalLeaveHours.toFixed(2)} hrs.`],
    );

    await connection.commit();

    notifyPayrollChanged('deleted', { module: 'payroll-processed', id });

    try {
      logAudit(req.user, 'DELETE', 'payroll_processed', id, employeeNumber);
      logAudit(req.user, `VL CREDIT REVERSED (-${VL_MONTHLY_CREDIT_HOURS} hrs)`, 'leave_assignment', employeeNumber, employeeNumber);
      logAudit(req.user, `VL BALANCE RESTORED: ${originalLeaveHours.toFixed(2)} hrs (was ${(parseFloat(tevl) || 0).toFixed(2)} hrs)`, 'leave_assignment', employeeNumber, employeeNumber);
    } catch (e) { console.error('Audit log error:', e); }

    res.json({
      message:
        'Payroll record deleted, status reverted, and VL balance restored.',
      deleted: 1,
      restoredLeaveHours: originalLeaveHours,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting payroll processed:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

module.exports = router;
