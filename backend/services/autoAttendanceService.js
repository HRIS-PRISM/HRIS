'use strict';

const db = require('../db');

function queryAsync(sql, params) {
  return new Promise((resolve, reject) =>
    db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result))),
  );
}

function expandDateRange(startDate, endDate) {
  const dates = [];
  const cur = new Date(startDate + 'T00:00:00Z');
  const last = new Date(endDate + 'T00:00:00Z');

  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return dates;
}

function weekdayName(dateStr) {
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return DAYS[new Date(dateStr + 'T00:00:00Z').getUTCDay()];
}

async function getActiveOfficialRangesForEmployee(employeeID) {
  const rows = await queryAsync(
    `SELECT DISTINCT startDate, endDate
     FROM officialtime
     WHERE employeeID = ?
       AND status = 'active'
       AND startDate IS NOT NULL
       AND endDate IS NOT NULL
     ORDER BY startDate ASC, endDate ASC`,
    [employeeID],
  );

  return rows.map((row) => ({
    startDate: new Date(row.startDate).toISOString().slice(0, 10),
    endDate: new Date(row.endDate).toISOString().slice(0, 10),
  }));
}

async function fillExemptAttendance({ startDate, endDate, employeeIDs = null }) {
  let exemptSql = `
    SELECT DISTINCT employeeID
    FROM item_table
    WHERE exempt_from_biometrics = 1
      AND employeeID IS NOT NULL
      AND TRIM(employeeID) <> ''
  `;
  const exemptParams = [];

  if (Array.isArray(employeeIDs) && employeeIDs.length > 0) {
    exemptSql += ` AND employeeID IN (${employeeIDs.map(() => '?').join(',')})`;
    exemptParams.push(...employeeIDs.map(String));
  }

  const exemptRows = await queryAsync(exemptSql, exemptParams);
  if (!exemptRows.length) return { inserted: 0, skipped: 0, errors: [] };

  const dates = expandDateRange(startDate, endDate);
  let inserted = 0;
  let skipped = 0;
  const errors = [];

  for (const { employeeID } of exemptRows) {
    for (const date of dates) {
      const day = weekdayName(date);
      try {
        const existing = await queryAsync(
          `SELECT id FROM attendancerecord WHERE personID = ? AND date = ? LIMIT 1`,
          [employeeID, date],
        );

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        const otRows = await queryAsync(
          `SELECT
             officialTimeIN,
             officialBreaktimeIN,
             officialBreaktimeOUT,
             officialTimeOUT
           FROM officialtime
           WHERE employeeID = ?
             AND day = ?
             AND status = 'active'
             AND ? BETWEEN startDate AND endDate
           LIMIT 1`,
          [employeeID, day, date],
        );

        if (!otRows.length) {
          skipped++;
          continue;
        }

        const ot = otRows[0];

        await queryAsync(
          `INSERT INTO attendancerecord
             (personID, date, day, timeIN, breaktimeIN, breaktimeOUT, timeOUT)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            employeeID,
            date,
            day,
            ot.officialTimeIN || null,
            ot.officialBreaktimeIN || null,
            ot.officialBreaktimeOUT || null,
            ot.officialTimeOUT || null,
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

async function fillExemptAttendanceForEmployeeOfficialRanges(employeeID) {
  const ranges = await getActiveOfficialRangesForEmployee(employeeID);
  let inserted = 0;
  let skipped = 0;
  const errors = [];

  for (const range of ranges) {
    const result = await fillExemptAttendance({
      startDate: range.startDate,
      endDate: range.endDate,
      employeeIDs: [employeeID],
    });
    inserted += result.inserted;
    skipped += result.skipped;
    if (result.errors.length > 0) errors.push(...result.errors);
  }

  return { inserted, skipped, errors, rangesProcessed: ranges.length };
}

module.exports = {
  fillExemptAttendance,
  fillExemptAttendanceForEmployeeOfficialRanges,
  getActiveOfficialRangesForEmployee,
};
