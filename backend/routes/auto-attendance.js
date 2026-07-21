'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-ATTENDANCE ROUTE
//
// Purpose:
//   Employees whose position is flagged exempt_from_biometrics = 1 in
//   item_table do not use the biometric device.  Their attendance should
//   be recorded as "perfectly attended" by copying their official time
//   schedule directly into attendancerecord.
//
// Design decisions:
//   • Supports both manual trigger and automatic invocation from other routes.
//   • Time values come from the active officialtime row for that employee
//     and weekday:  timeIN, breaktimeIN, breaktimeOUT, timeOUT are all
//     filled from the official schedule → zero tardiness by design.
//   • If a row already exists in attendancerecord for that employee+date
//     it is LEFT UNTOUCHED.  Manual edits are never overwritten.
//   • Days where no official schedule exists (e.g. Sunday for a Mon-Fri
//     employee) are silently skipped.
//
// Endpoints:
//   POST /api/auto-attendance/fill
//     Body: { startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD", employeeIDs?: string[] }
//     Fills attendance for all exempt employees (or a specific subset).
//
//   GET  /api/auto-attendance/exempt-employees
//     Returns every employee currently flagged as exempt.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, logAudit } = require('../middleware/auth');
const { fillExemptAttendance } = require('../services/autoAttendanceService');

// ── helpers ───────────────────────────────────────────────────────────────────

function queryAsync(sql, params) {
  return new Promise((resolve, reject) =>
    db.query(sql, params, (err, result) =>
      err ? reject(err) : resolve(result),
    ),
  );
}

// ── core logic is provided by shared service ────────────────────────────────

// ── POST /api/auto-attendance/fill ────────────────────────────────────────────

router.post(
  '/api/auto-attendance/fill',
  authenticateToken,
  async (req, res) => {
    const { startDate, endDate, employeeIDs } = req.body || {};

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: 'startDate and endDate are required.' });
    }
    if (new Date(startDate) > new Date(endDate)) {
      return res
        .status(400)
        .json({ message: 'startDate must be on or before endDate.' });
    }

    try {
      const result = await fillExemptAttendance({
        startDate,
        endDate,
        employeeIDs:
          Array.isArray(employeeIDs) && employeeIDs.length ? employeeIDs : null,
      });

      try {
        logAudit(
          req.user,
          `Auto-filled attendance for exempt employees — ${result.inserted} inserted, ${result.skipped} skipped`,
          'Auto Attendance',
          `${startDate} to ${endDate}`,
          null,
        );
      } catch (e) {
        console.error('[auto-attendance] Audit log error:', e);
      }

      return res.json({
        message: 'Auto-attendance fill complete.',
        inserted: result.inserted,
        skipped: result.skipped,
        warnings: result.errors.length ? result.errors : undefined,
      });
    } catch (err) {
      console.error('[auto-attendance] fill error:', err);
      return res
        .status(500)
        .json({ message: 'Auto-attendance fill failed.', detail: err.message });
    }
  },
);

// ── GET /api/auto-attendance/exempt-employees ─────────────────────────────────

router.get(
  '/api/auto-attendance/exempt-employees',
  authenticateToken,
  async (req, res) => {
    try {
      const rows = await queryAsync(
        `SELECT
         it.employeeID,
         it.item_description AS position,
         it.item_code,
         it.salary_grade,
         TRIM(CONCAT(
           COALESCE(p.firstName, ''), ' ',
           COALESCE(p.middleName, ''), ' ',
           COALESCE(p.lastName, '')
         )) AS fullName
       FROM   item_table it
       LEFT JOIN person_table p ON it.employeeID = p.agencyEmployeeNum
       WHERE  it.exempt_from_biometrics = 1
         AND  it.employeeID IS NOT NULL
         AND  TRIM(it.employeeID) <> ''
       ORDER BY p.lastName, p.firstName`,
        [],
      );

      return res.json(rows);
    } catch (err) {
      console.error('[auto-attendance] exempt-employees error:', err);
      return res
        .status(500)
        .json({
          message: 'Failed to fetch exempt employees.',
          detail: err.message,
        });
    }
  },
);

module.exports = router;
