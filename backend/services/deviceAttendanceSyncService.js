'use strict';

/**
 * Batched device → attendancerecord sync.
 * Replaces per-row officialtime + existing-record SELECT loops that starved the pool.
 */

const db = require('../db');

function queryAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)));
  });
}

function toDateYmd(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function recordKey(personID, dateYmd) {
  return `${String(personID).trim()}|${String(dateYmd).slice(0, 10)}`;
}

function pickOfficialTime(officialRowsByEmp, personID, dateYmd, dayName) {
  const rows = officialRowsByEmp.get(String(personID).trim()) || [];
  for (const row of rows) {
    if (String(row.day || '').toLowerCase() !== String(dayName || '').toLowerCase()) {
      continue;
    }
    const start = row.startDate
      ? String(row.startDate).slice(0, 10)
      : null;
    const end = row.endDate ? String(row.endDate).slice(0, 10) : null;
    if (start && end && (dateYmd < start || dateYmd > end)) continue;
    return row;
  }
  return null;
}

/**
 * Sync aggregated device day rows into attendancerecord using batched reads/writes.
 *
 * @param {Array<object>} dayRows - rows with PersonID, Date, Time1..Time6
 * @param {object} helpers
 * @param {Function} helpers.formatTime
 * @param {Function} helpers.getDayOfWeek
 * @param {Function} helpers.determineSpecialType
 * @param {Function} helpers.safeSpecialTypeForDb
 * @param {Function} helpers.toManilaTime - (timestamp) => manila time string | null
 * @returns {Promise<{saved:number, updated:number, failed:number, skipped:number, errors:Array}>}
 */
async function syncAggregatedDeviceDays(dayRows, helpers) {
  const {
    formatTime,
    getDayOfWeek,
    determineSpecialType,
    safeSpecialTypeForDb,
    toManilaTime,
  } = helpers;

  const stats = { saved: 0, updated: 0, failed: 0, skipped: 0, errors: [] };
  if (!Array.isArray(dayRows) || dayRows.length === 0) return stats;

  const normalized = [];
  const personIds = new Set();
  let minDate = null;
  let maxDate = null;

  for (const raw of dayRows) {
    const personKey = String(raw.PersonID ?? '').trim();
    const dateYmd = toDateYmd(raw.Date);
    if (!personKey || !dateYmd || dateYmd.length < 10) continue;
    personIds.add(personKey);
    if (!minDate || dateYmd < minDate) minDate = dateYmd;
    if (!maxDate || dateYmd > maxDate) maxDate = dateYmd;
    normalized.push({ raw, personKey, dateYmd });
  }

  if (normalized.length === 0) return stats;

  const personList = [...personIds];
  const placeholders = personList.map(() => '?').join(',');

  const [existingRows, officialRows] = await Promise.all([
    queryAsync(
      `SELECT id, personID, date, timeIN, breaktimeIN, breaktimeOUT, timeOUT,
              specialType, specialTimeIN, specialTimeOUT, day, manually_modified
       FROM attendancerecord
       WHERE personID IN (${placeholders})
         AND date BETWEEN ? AND ?`,
      [...personList, minDate, maxDate],
    ),
    queryAsync(
      `SELECT employeeID, day, startDate, endDate,
              officialTimeIN, officialTimeOUT,
              officialBreaktimeIN, officialBreaktimeOUT,
              officialHonorariumTimeIN, officialHonorariumTimeOUT,
              officialServiceCreditTimeIN, officialServiceCreditTimeOUT,
              officialOverTimeIN, officialOverTimeOUT
       FROM officialtime
       WHERE employeeID IN (${placeholders})`,
      personList,
    ),
  ]);

  const existingByKey = new Map();
  for (const row of existingRows) {
    existingByKey.set(recordKey(row.personID, toDateYmd(row.date)), row);
  }

  const officialRowsByEmp = new Map();
  for (const row of officialRows) {
    const emp = String(row.employeeID ?? '').trim();
    if (!officialRowsByEmp.has(emp)) officialRowsByEmp.set(emp, []);
    officialRowsByEmp.get(emp).push(row);
  }

  const toInsert = [];
  const toUpdate = [];

  for (const { raw, personKey, dateYmd } of normalized) {
    try {
      const newDay = getDayOfWeek(dateYmd);
      const officialTimeData = pickOfficialTime(
        officialRowsByEmp,
        personKey,
        dateYmd,
        newDay,
      );

      const newTimeIN = formatTime(toManilaTime(raw.Time1));
      const newBreaktimeIN = formatTime(toManilaTime(raw.Time3));
      const newBreaktimeOUT = formatTime(toManilaTime(raw.Time2));
      const newTimeOUT = formatTime(toManilaTime(raw.Time4));

      let specialType = null;
      let specialTimeIN = null;
      let specialTimeOUT = null;

      if (raw.Time5 || raw.Time6) {
        const specialTime = toManilaTime(raw.Time5 || raw.Time6);
        const specialResult = determineSpecialType(specialTime, officialTimeData);
        specialType = safeSpecialTypeForDb(specialResult.type);
        specialTimeIN = raw.Time5 ? formatTime(toManilaTime(raw.Time5)) : null;
        specialTimeOUT = raw.Time6 ? formatTime(toManilaTime(raw.Time6)) : null;
      }

      const existing = existingByKey.get(recordKey(personKey, dateYmd));
      if (!existing) {
        toInsert.push([
          personKey,
          dateYmd,
          newDay,
          newTimeIN,
          newBreaktimeIN,
          newBreaktimeOUT,
          newTimeOUT,
          specialType,
          specialTimeIN,
          specialTimeOUT,
        ]);
        continue;
      }

      if (Number(existing.manually_modified) === 1) {
        stats.skipped++;
        continue;
      }

      const hasChanges =
        (existing.timeIN || 'N/A') !== (newTimeIN || 'N/A') ||
        (existing.breaktimeIN || 'N/A') !== (newBreaktimeIN || 'N/A') ||
        (existing.breaktimeOUT || 'N/A') !== (newBreaktimeOUT || 'N/A') ||
        (existing.timeOUT || 'N/A') !== (newTimeOUT || 'N/A') ||
        (existing.specialType || null) !== (specialType || null) ||
        (existing.specialTimeIN || null) !== (specialTimeIN || null) ||
        (existing.specialTimeOUT || null) !== (specialTimeOUT || null) ||
        (existing.day || '') !== newDay;

      if (!hasChanges) {
        stats.skipped++;
        continue;
      }

      toUpdate.push({
        params: [
          newTimeIN,
          newBreaktimeIN,
          newBreaktimeOUT,
          newTimeOUT,
          specialType,
          specialTimeIN,
          specialTimeOUT,
          newDay,
          personKey,
          dateYmd,
        ],
      });
    } catch (rowErr) {
      stats.failed++;
      if (stats.errors.length < 5) {
        stats.errors.push({
          personID: personKey,
          date: dateYmd,
          error: rowErr?.message || String(rowErr),
        });
      }
    }
  }

  const INSERT_CHUNK = 100;
  for (let i = 0; i < toInsert.length; i += INSERT_CHUNK) {
    const chunk = toInsert.slice(i, i + INSERT_CHUNK);
    try {
      await queryAsync(
        `INSERT INTO attendancerecord
           (personID, date, day, timeIN, breaktimeIN, breaktimeOUT, timeOUT,
            specialType, specialTimeIN, specialTimeOUT)
         VALUES ?`,
        [chunk],
      );
      stats.saved += chunk.length;
    } catch (err) {
      // Fall back to row inserts so one bad row does not abort the batch
      for (const row of chunk) {
        try {
          await queryAsync(
            `INSERT INTO attendancerecord
               (personID, date, day, timeIN, breaktimeIN, breaktimeOUT, timeOUT,
                specialType, specialTimeIN, specialTimeOUT)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            row,
          );
          stats.saved++;
        } catch (rowErr) {
          stats.failed++;
          if (stats.errors.length < 5) {
            stats.errors.push({
              personID: row[0],
              date: row[1],
              error: rowErr?.message || String(rowErr),
            });
          }
        }
      }
    }
  }

  const UPDATE_CONCURRENCY = 10;
  const updateSql = `
    UPDATE attendancerecord
    SET timeIN = ?, breaktimeIN = ?, breaktimeOUT = ?, timeOUT = ?,
        specialType = ?, specialTimeIN = ?, specialTimeOUT = ?, day = ?
    WHERE personID = ? AND date = ?`;

  for (let i = 0; i < toUpdate.length; i += UPDATE_CONCURRENCY) {
    const chunk = toUpdate.slice(i, i + UPDATE_CONCURRENCY);
    const results = await Promise.allSettled(
      chunk.map((u) => queryAsync(updateSql, u.params)),
    );
    for (let j = 0; j < results.length; j++) {
      if (results[j].status === 'fulfilled') {
        stats.updated++;
      } else {
        stats.failed++;
        if (stats.errors.length < 5) {
          stats.errors.push({
            personID: chunk[j].params[8],
            date: chunk[j].params[9],
            error: results[j].reason?.message || String(results[j].reason),
          });
        }
      }
    }
  }

  return stats;
}

module.exports = {
  syncAggregatedDeviceDays,
  queryAsync,
};
