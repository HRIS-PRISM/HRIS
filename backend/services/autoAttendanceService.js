'use strict';

const db = require('../db');

function queryAsync(sql, params) {
  return new Promise((resolve, reject) =>
    db.query(sql, params, (err, result) =>
      err ? reject(err) : resolve(result),
    ),
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
  const DAYS = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  return DAYS[new Date(dateStr + 'T00:00:00Z').getUTCDay()];
}

function recordKey(personID, date) {
  return `${String(personID).trim()}|${String(date).slice(0, 10)}`;
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

/**
 * Fill attendancerecord for biometrics-exempt employees using batched queries.
 * @param {{startDate:string, endDate:string, employeeIDs?:string[]|null}} opts
 * @returns {Promise<{inserted:number, skipped:number, errors:string[]}>}
 */
async function fillExemptAttendance({
  startDate,
  endDate,
  employeeIDs = null,
}) {
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
  if (!dates.length) return { inserted: 0, skipped: 0, errors: [] };

  const empList = exemptRows.map((r) => String(r.employeeID).trim()).filter(Boolean);
  const placeholders = empList.map(() => '?').join(',');
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];

  const [existingRows, officialRows] = await Promise.all([
    queryAsync(
      `SELECT personID, date FROM attendancerecord
       WHERE personID IN (${placeholders})
         AND date BETWEEN ? AND ?`,
      [...empList, minDate, maxDate],
    ),
    queryAsync(
      `SELECT employeeID, day, startDate, endDate,
              officialTimeIN, officialBreaktimeIN, officialBreaktimeOUT, officialTimeOUT
       FROM officialtime
       WHERE employeeID IN (${placeholders})
         AND status = 'active'`,
      empList,
    ),
  ]);

  const existingKeys = new Set(
    existingRows.map((r) => recordKey(r.personID, r.date)),
  );

  const officialByEmp = new Map();
  for (const row of officialRows) {
    const emp = String(row.employeeID ?? '').trim();
    if (!officialByEmp.has(emp)) officialByEmp.set(emp, []);
    officialByEmp.get(emp).push(row);
  }

  const toInsert = [];
  let skipped = 0;
  const errors = [];

  for (const employeeID of empList) {
    const otRows = officialByEmp.get(employeeID) || [];
    for (const date of dates) {
      const key = recordKey(employeeID, date);
      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }
      const day = weekdayName(date);
      const ot = otRows.find((row) => {
        if (String(row.day || '') !== day) return false;
        const start = row.startDate
          ? String(row.startDate).slice(0, 10)
          : null;
        const end = row.endDate ? String(row.endDate).slice(0, 10) : null;
        if (start && end && (date < start || date > end)) return false;
        return true;
      });
      if (!ot) {
        skipped++;
        continue;
      }
      toInsert.push([
        employeeID,
        date,
        day,
        ot.officialTimeIN || null,
        ot.officialBreaktimeIN || null,
        ot.officialBreaktimeOUT || null,
        ot.officialTimeOUT || null,
      ]);
    }
  }

  let inserted = 0;
  const INSERT_CHUNK = 100;
  for (let i = 0; i < toInsert.length; i += INSERT_CHUNK) {
    const chunk = toInsert.slice(i, i + INSERT_CHUNK);
    try {
      await queryAsync(
        `INSERT INTO attendancerecord
           (personID, date, day, timeIN, breaktimeIN, breaktimeOUT, timeOUT)
         VALUES ?`,
        [chunk],
      );
      inserted += chunk.length;
    } catch (err) {
      for (const row of chunk) {
        try {
          await queryAsync(
            `INSERT INTO attendancerecord
               (personID, date, day, timeIN, breaktimeIN, breaktimeOUT, timeOUT)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            row,
          );
          inserted++;
        } catch (rowErr) {
          errors.push(`Employee ${row[0]} on ${row[1]}: ${rowErr.message}`);
        }
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
