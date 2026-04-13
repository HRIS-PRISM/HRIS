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
//   • Manual trigger ONLY — no automatic side-effects on other routes.
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
const router  = express.Router();
const db      = require('../db');
const { authenticateToken, logAudit } = require('../middleware/auth');

// ── helpers ───────────────────────────────────────────────────────────────────

function queryAsync(sql, params) {
  return new Promise((resolve, reject) =>
    db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result))),
  );
}

/** All dates between startDate and endDate inclusive (YYYY-MM-DD). */
function expandDateRange(startDate, endDate) {
  const dates = [];
  const cur   = new Date(startDate + 'T00:00:00Z');
  const last  = new Date(endDate   + 'T00:00:00Z');
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

/** English weekday name from a YYYY-MM-DD string (locale-safe, UTC). */
function weekdayName(dateStr) {
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return DAYS[new Date(dateStr + 'T00:00:00Z').getUTCDay()];
}

// ── core logic ────────────────────────────────────────────────────────────────

/**
 * fillExemptAttendance({ startDate, endDate, employeeIDs? })
 *
 * For every exempt employee (optionally filtered by employeeIDs) and every
 * date in [startDate, endDate]:
 *   1. Skip if attendancerecord already has a row for that employee+date.
 *   2. Look up the active officialtime row for employee + weekday + date range.
 *   3. Insert attendancerecord with timeIN/breaktimeIN/breaktimeOUT/timeOUT
 *      copied verbatim from officialtime → perfect attendance, no tardiness.
 *
 * @returns {{ inserted: number, skipped: number, errors: string[] }}
 */
async function fillExemptAttendance({ startDate, endDate, employeeIDs = null }) {
  // 1. Fetch exempt employees
  let exemptSql = `
    SELECT DISTINCT employeeID
    FROM   item_table
    WHERE  exempt_from_biometrics = 1
      AND  employeeID IS NOT NULL
      AND  TRIM(employeeID) <> ''
  `;
  const exemptParams = [];

  if (Array.isArray(employeeIDs) && employeeIDs.length > 0) {
    exemptSql += ` AND employeeID IN (${employeeIDs.map(() => '?').join(',')})`;
    exemptParams.push(...employeeIDs.map(String));
  }

  const exemptRows = await queryAsync(exemptSql, exemptParams);
  if (!exemptRows.length) return { inserted: 0, skipped: 0, errors: [] };

  const dates  = expandDateRange(startDate, endDate);
  let inserted = 0;
  let skipped  = 0;
  const errors = [];

  for (const { employeeID } of exemptRows) {
    for (const date of dates) {
      const day = weekdayName(date);

      try {
        // 2. Skip if record already exists (preserve any manual edits)
        const existing = await queryAsync(
          `SELECT id FROM attendancerecord WHERE personID = ? AND date = ? LIMIT 1`,
          [employeeID, date],
        );
        if (existing.length > 0) {
          skipped++;
          continue;
        }

        // 3. Find active official time for this employee / weekday / date
        const otRows = await queryAsync(
          `SELECT
             officialTimeIN,
             officialBreaktimeIN,
             officialBreaktimeOUT,
             officialTimeOUT
           FROM officialtime
           WHERE employeeID = ?
             AND day        = ?
             AND status     = 'active'
             AND ? BETWEEN startDate AND endDate
           LIMIT 1`,
          [employeeID, day, date],
        );

        if (!otRows.length) {
          // No schedule configured for this weekday — skip silently
          skipped++;
          continue;
        }

        const ot = otRows[0];

        // 4. Insert full-day attendance copied directly from official schedule.
        //    timeIN  = officialTimeIN  (arrived exactly on time)
        //    timeOUT = officialTimeOUT (left exactly on time)
        //    Breaktime fields also filled so downstream hour-calculations work.
        await queryAsync(
          `INSERT INTO attendancerecord
             (personID, date, day, timeIN, breaktimeIN, breaktimeOUT, timeOUT)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            employeeID,
            date,
            day,
            ot.officialTimeIN       || null,
            ot.officialBreaktimeIN  || null,
            ot.officialBreaktimeOUT || null,
            ot.officialTimeOUT      || null,
          ],
        );
        inserted++;

      } catch (err) {
        errors.push(`Employee ${employeeID} on ${date}: ${err.message}`);
      }
    }
  }

  return { inserted, skipped, errors };
}

// ── POST /api/auto-attendance/fill ────────────────────────────────────────────

router.post('/api/auto-attendance/fill', authenticateToken, async (req, res) => {
  const { startDate, endDate, employeeIDs } = req.body || {};

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'startDate and endDate are required.' });
  }
  if (new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({ message: 'startDate must be on or before endDate.' });
  }

  try {
    const result = await fillExemptAttendance({
      startDate,
      endDate,
      employeeIDs: Array.isArray(employeeIDs) && employeeIDs.length ? employeeIDs : null,
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
      message : 'Auto-attendance fill complete.',
      inserted: result.inserted,
      skipped : result.skipped,
      warnings: result.errors.length ? result.errors : undefined,
    });
  } catch (err) {
    console.error('[auto-attendance] fill error:', err);
    return res.status(500).json({ message: 'Auto-attendance fill failed.', detail: err.message });
  }
});

// ── GET /api/auto-attendance/exempt-employees ─────────────────────────────────

router.get('/api/auto-attendance/exempt-employees', authenticateToken, async (req, res) => {
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
    return res.status(500).json({ message: 'Failed to fetch exempt employees.', detail: err.message });
  }
});

module.exports = router;