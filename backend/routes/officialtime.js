const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, logAudit } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const xlsx = require('xlsx');
const fs = require('fs');

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

// Format date as YYYY-MM-DD so frontend sees the same calendar date as in DB (avoids UTC -1 day)
function toDateOnlyString(val) {
  if (val == null || val === '') return val;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val))
    return val.split('T')[0];
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Overlap: [a1,a2] and [b1,b2] overlap iff a1 < b2 AND b1 < a2
function hasOverlappingRange(conn, employeeID, newStart, newEnd) {
  return new Promise((resolve, reject) => {
    conn.query(
      'SELECT DISTINCT startDate, endDate FROM officialtime WHERE employeeID = ? AND startDate IS NOT NULL AND endDate IS NOT NULL',
      [employeeID],
      (err, rows) => {
        if (err) return reject(err);
        const newS = new Date(newStart).getTime();
        const newE = new Date(newEnd).getTime();
        const rowList = Array.isArray(rows) ? rows : [];
        for (const row of rowList) {
          const s = new Date(row.startDate).getTime();
          const e = new Date(row.endDate).getTime();
          if (newS < e && s < newE) return resolve(true);
        }
        resolve(false);
      },
    );
  });
}

// Parse time like "08:00:00 AM" or "5:00 PM" to minutes-from-midnight (0..1439).
// Returns null for empty/invalid/"00:00:00 AM".
function parseTimeToMinutes(val) {
  if (val == null) return null;
  const s = String(val).trim();
  if (!s || s === '—') return null;

  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!m) return null;
  let hh = Number(m[1]);
  const mm = Number(m[2]);
  const ap = (m[4] || '').toUpperCase();
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 12 || mm < 0 || mm > 59) return null;

  // If AM/PM is provided, treat as 12-hour; otherwise treat as 24-hour-ish within 0-23.
  if (ap) {
    if (hh === 12) hh = 0;
    if (ap === 'PM') hh += 12;
  } else {
    // no AM/PM → allow 0..23
    if (hh > 23) return null;
  }

  const minutes = hh * 60 + mm;
  // Treat midnight as "empty" for this system's defaults
  if (minutes === 0) return null;
  return minutes;
}

// Build schedule segments (work, honorarium, service credits, overtime) for one day row.
function getSegmentsForDayRow(row) {
  const segments = [];
  const add = (label, start, end) => {
    if (start == null || end == null) return;
    // Allow overnight is NOT supported in this system; require start < end
    if (!(start < end)) return;
    segments.push({ label, start, end });
  };

  const ti = parseTimeToMinutes(row.officialTimeIN);
  const to = parseTimeToMinutes(row.officialTimeOUT);
  const bi = parseTimeToMinutes(row.officialBreaktimeIN);
  const bo = parseTimeToMinutes(row.officialBreaktimeOUT);

  // Work day: Time In → Break In, Break Out → Time Out (or Time In → Time Out if no break)
  if (ti != null && to != null) {
    if (bi != null && bo != null) {
      add('Work time (Time In → Break In)', ti, bi);
      add('Work time (Break Out → Time Out)', bo, to);
    } else {
      add('Work time (Time In → Time Out)', ti, to);
    }
  }

  add(
    'Honorarium time',
    parseTimeToMinutes(row.officialHonorariumTimeIN),
    parseTimeToMinutes(row.officialHonorariumTimeOUT),
  );
  add(
    'Service Credits time',
    parseTimeToMinutes(row.officialServiceCreditTimeIN),
    parseTimeToMinutes(row.officialServiceCreditTimeOUT),
  );
  add(
    'Overtime time',
    parseTimeToMinutes(row.officialOverTimeIN),
    parseTimeToMinutes(row.officialOverTimeOUT),
  );

  return segments;
}

function findOverlapInSegments(segments) {
  // Overlap in half-open intervals [a,b): a < d && c < b
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const a = segments[i];
      const b = segments[j];
      if (a.start < b.end && b.start < a.end) return { a, b };
    }
  }
  return null;
}

function formatMinutesToTime(mins) {
  const m = Math.max(0, Math.min(1439, Number(mins)));
  const hh24 = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  const ap = hh24 >= 12 ? 'PM' : 'AM';
  let hh12 = hh24 % 12;
  if (hh12 === 0) hh12 = 12;
  return `${hh12}:${mm} ${ap}`;
}

function formatTimeOverlapMessage({ day, employeeID, segA, segB }) {
  const overlapStart = Math.max(segA.start, segB.start);
  const overlapEnd = Math.min(segA.end, segB.end);
  const between = `${formatMinutesToTime(overlapStart)} and ${formatMinutesToTime(overlapEnd)}`;
  const period = `${formatMinutesToTime(overlapStart)} – ${formatMinutesToTime(overlapEnd)}`;
  return (
    `Schedule conflict detected on ${day || 'Unknown day'} for Employee ${employeeID}:\n` +
    `${segA.label} overlaps with ${segB.label} between ${between}.\n` +
    `Overlapping period: ${period}.\n` +
    `Please revise the schedule to remove the conflict.`
  );
}

function buildTimeOverlapPayload({ day, employeeID, segA, segB }) {
  const overlapStart = Math.max(segA.start, segB.start);
  const overlapEnd = Math.min(segA.end, segB.end);
  return {
    day: day || 'Unknown day',
    employeeID: String(employeeID),
    segmentA: { label: segA.label, start: segA.start, end: segA.end },
    segmentB: { label: segB.label, start: segB.start, end: segB.end },
    overlap: {
      start: overlapStart,
      end: overlapEnd,
      startText: formatMinutesToTime(overlapStart),
      endText: formatMinutesToTime(overlapEnd),
      periodText: `${formatMinutesToTime(overlapStart)} – ${formatMinutesToTime(overlapEnd)}`,
    },
  };
}

// GET school year activator info for an employee (optional; returns empty when no record)
router.get(
  '/officialtime/school-year/:empId',
  authenticateToken,
  (req, res) => {
    const { empId } = req.params;
    // No dedicated table for school-year activator; return empty so frontend uses defaults
    res.status(200).json(null);
  },
);

// POST school year activator info (optional; no-op when no table)
router.post('/officialtime/school-year', authenticateToken, (req, res) => {
  res.status(200).json({ message: 'OK' });
});

// GET official time table by employeeID (optional ?date= or ?startDate=&endDate= to filter by version)
router.get('/officialtimetable/:employeeID', authenticateToken, (req, res) => {
  const { employeeID } = req.params;
  const { date, startDate, endDate } = req.query;

  let sql = 'SELECT * FROM officialtime WHERE employeeID = ?';
  const params = [employeeID];

  if (date) {
    sql += ' AND ? BETWEEN startDate AND endDate';
    params.push(date);
  } else if (startDate && endDate) {
    sql += ' AND startDate = ? AND endDate = ?';
    params.push(startDate, endDate);
  }

  sql += ' ORDER BY startDate, endDate, id';

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    try {
      logAudit(req.user, `View`, 'Official Time', null, employeeID);
    } catch (e) {
      console.error('Audit log error:', e);
    }
    // Send startDate/endDate as YYYY-MM-DD so frontend matches DB (no UTC -1 day)
    const out = (results || []).map((row) => ({
      ...row,
      startDate: toDateOnlyString(row.startDate),
      endDate: toDateOnlyString(row.endDate),
    }));
    res.json(out);
  });
});

// POST official time table (insert-only; overlap check is done on the frontend)
router.post('/officialtimetable', authenticateToken, async (req, res) => {
  const { employeeID, academicYear, startDate, endDate, status, records } =
    req.body || {};

  if (!employeeID) {
    return res.status(400).json({ message: 'employeeID is required.' });
  }
  if (
    startDate == null ||
    startDate === '' ||
    endDate == null ||
    endDate === ''
  ) {
    return res
      .status(400)
      .json({ message: 'startDate and endDate are required.' });
  }
  if (new Date(startDate) > new Date(endDate)) {
    return res
      .status(400)
      .json({ message: 'startDate must be on or before endDate.' });
  }
  if (!records || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ message: 'No records to insert.' });
  }

  const academicYearVal =
    academicYear != null && String(academicYear).trim() !== ''
      ? String(academicYear).trim()
      : null;

  // New schedule is always active; existing schedules for this employee become inactive
  const newStatus = 'active';
  const values = records.map((r) => [
    employeeID,
    academicYearVal,
    startDate,
    endDate,
    r.day ?? null,
    r.officialTimeIN ?? null,
    r.officialBreaktimeIN ?? null,
    r.officialBreaktimeOUT ?? null,
    r.officialTimeOUT ?? null,
    r.officialHonorariumTimeIN ?? null,
    r.officialHonorariumTimeOUT ?? null,
    r.officialServiceCreditTimeIN ?? null,
    r.officialServiceCreditTimeOUT ?? null,
    r.officialOverTimeIN ?? null,
    r.officialOverTimeOUT ?? null,
    newStatus,
    r.breaktime ?? null,
  ]);

  const insertSql = `
    INSERT INTO officialtime (
      employeeID, academicYear, startDate, endDate, day,
      officialTimeIN, officialBreaktimeIN, officialBreaktimeOUT, officialTimeOUT,
      officialHonorariumTimeIN, officialHonorariumTimeOUT,
      officialServiceCreditTimeIN, officialServiceCreditTimeOUT,
      officialOverTimeIN, officialOverTimeOUT, status, breaktime
    )
    VALUES ?
  `;

  try {
    // Mark all existing official time rows for this employee as inactive before adding the new schedule
    await new Promise((resolve, reject) => {
      db.query(
        "UPDATE officialtime SET status = 'inactive' WHERE employeeID = ?",
        [employeeID],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        },
      );
    });

    const result = await new Promise((resolve, reject) => {
      db.query(insertSql, [values], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
    const affected = result && result.affectedRows;
    if (affected !== records.length) {
      console.warn(
        `Official time insert: expected ${records.length} rows, got affectedRows=${affected}`,
      );
    }

    try {
      logAudit(
        req.user,
        `Add official time version for ${employeeID} (${records.length} rows)`,
        'Official Time',
        null,
        employeeID,
      );
    } catch (e) {
      console.error('Audit log error:', e);
    }

    res.json({
      message: 'Official time records saved successfully',
      inserted: affected,
    });
  } catch (err) {
    console.error('Error creating schedule version:', err);
    const isDup =
      err.code === 'ER_DUP_ENTRY' ||
      (err.message && err.message.includes('Duplicate'));
    if (isDup) {
      return res.status(409).json({
        message:
          'A schedule already exists for this employee and day. Drop UNIQUE on (employeeID, day) to allow multiple versions.',
      });
    }
    res
      .status(500)
      .json({ error: err.message || 'Database error', message: err.message });
  }
});

// EXCEL UPLOAD FOR OFFICIAL TIME
router.post(
  '/upload-excel-faculty-official-time',
  upload.single('file'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    try {
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: null,
        raw: false,
      });

      if (!sheet.length) {
        return res.status(400).json({ message: 'Excel file is empty.' });
      }

      const cleanedSheet = sheet.map((row) => {
        const normalized = {};
        for (const key in row) {
          const cleanKey = key
            .replace(/\u00A0/g, '')
            .trim()
            .toLowerCase();
          normalized[cleanKey] = row[key];
        }
        return normalized;
      });

      const getField = (r, names) => {
        for (const n of names) {
          if (r[n] != null) return r[n];
        }
        return null;
      };

      // Normalize date to YYYY-MM-DD
      const normDate = (val) => {
        if (val == null || val === '') return null;
        const s = String(val).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        const d = new Date(val);
        if (Number.isNaN(d.getTime())) return null;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayNum = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dayNum}`;
      };

      // Group rows by (employeeID, effective_from, effective_until); require date range
      const groupKey = (empId, from, to) => `${String(empId)}|${from}|${to}`;
      const groups = new Map();

      for (const r of cleanedSheet) {
        const employeeID = getField(r, [
          'employeeid',
          'employeenumber',
          'employee number',
          'employee_id',
        ]);
        const day = getField(r, ['day', 'weekday']);
        const effectiveFrom = normDate(
          getField(r, [
            'effective_from',
            'effective from',
            'startdate',
            'start date',
          ]),
        );
        const effectiveUntil = normDate(
          getField(r, [
            'effective_until',
            'effective until',
            'enddate',
            'end date',
          ]),
        );

        if (!employeeID || !day) continue;
        if (!effectiveFrom || !effectiveUntil) continue; // require date range for versioned upload
        if (effectiveFrom > effectiveUntil) continue;

        const officialTimeIN = getField(r, [
          'officialtimein',
          'time in',
          'timein',
        ]);
        const officialBreaktimeIN = getField(r, [
          'officialbreaktimein',
          'break in',
          'breakin',
        ]);
        const officialBreaktimeOUT = getField(r, [
          'officialbreaktimeout',
          'break out',
          'breakout',
        ]);
        const officialTimeOUT = getField(r, [
          'officialtimeout',
          'time out',
          'timeout',
        ]);
        const officialHonorariumTimeIN = getField(r, [
          'officialhonorariumtimein',
          'honorarium time in',
          'honorariumtimein',
        ]);
        const officialHonorariumTimeOUT = getField(r, [
          'officialhonorariumtimeout',
          'honorarium time out',
          'honorariumtimeout',
        ]);
        const officialServiceCreditTimeIN = getField(r, [
          'officialservicecredittimein',
          'service credit time in',
          'servicecredittimein',
        ]);
        const officialServiceCreditTimeOUT = getField(r, [
          'officialservicecredittimeout',
          'service credit time out',
          'servicecredittimeout',
        ]);
        const officialOverTimeIN = getField(r, [
          'officialovertimein',
          'overtime in',
          'ot in',
          'overtimein',
        ]);
        const officialOverTimeOUT = getField(r, [
          'officialovertimeout',
          'overtime out',
          'ot out',
          'overtimeout',
        ]);
        const breaktime = getField(r, ['breaktime', 'break time']);

        const key = groupKey(employeeID, effectiveFrom, effectiveUntil);
        if (!groups.has(key)) {
          const academicYearVal = (() => {
            const academicYearCol = getField(r, [
              'academic year',
              'academicyear',
            ]);
            const semesterCol = getField(r, ['semester']);
            const yearRaw = getField(r, ['year']);
            const sem =
              semesterCol != null && String(semesterCol).trim() !== ''
                ? String(semesterCol).trim()
                : '';
            if (
              academicYearCol != null &&
              String(academicYearCol).trim() !== ''
            ) {
              const s = String(academicYearCol).trim();
              if (sem) return `${s} ${sem}`.trim();
              return s;
            }
            if (yearRaw != null && String(yearRaw).trim() !== '') {
              const y = Number(String(yearRaw).trim());
              if (Number.isFinite(y))
                return sem ? `${y}-${y + 1} ${sem}`.trim() : `${y}-${y + 1}`;
            }
            return sem || null;
          })();
          groups.set(key, {
            employeeID,
            startDate: effectiveFrom,
            endDate: effectiveUntil,
            academicYear: academicYearVal,
            rows: [],
          });
        }
        const g = groups.get(key);
        g.rows.push({
          day,
          officialTimeIN: officialTimeIN || '00:00:00 AM',
          officialBreaktimeIN: officialBreaktimeIN || '00:00:00 AM',
          officialBreaktimeOUT: officialBreaktimeOUT || '00:00:00 AM',
          officialTimeOUT: officialTimeOUT || '00:00:00 AM',
          officialHonorariumTimeIN: officialHonorariumTimeIN || '00:00:00 AM',
          officialHonorariumTimeOUT: officialHonorariumTimeOUT || '00:00:00 AM',
          officialServiceCreditTimeIN:
            officialServiceCreditTimeIN || '00:00:00 AM',
          officialServiceCreditTimeOUT:
            officialServiceCreditTimeOUT || '00:00:00 AM',
          officialOverTimeIN: officialOverTimeIN || '00:00:00 AM',
          officialOverTimeOUT: officialOverTimeOUT || '00:00:00 AM',
          breaktime: breaktime != null ? breaktime : null,
        });
      }

      const scheduleList = Array.from(groups.values()).filter(
        (g) => g.rows.length > 0,
      );
      if (scheduleList.length === 0) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({
          message:
            'No valid schedule blocks found. Ensure each row has employeeID, day, effective_from, and effective_until.',
        });
      }

      // Content validation: detect time overlaps within each day (Work vs Honorarium/Service Credits/Overtime)
      for (const s of scheduleList) {
        for (const row of s.rows) {
          const segments = getSegmentsForDayRow(row);
          const overlap = findOverlapInSegments(segments);
          if (overlap) {
            fs.unlink(req.file.path, () => {});
            return res.status(400).json({
              message: formatTimeOverlapMessage({
                day: row.day,
                employeeID: s.employeeID,
                segA: overlap.a,
                segB: overlap.b,
              }),
              overlap: buildTimeOverlapPayload({
                day: row.day,
                employeeID: s.employeeID,
                segA: overlap.a,
                segB: overlap.b,
              }),
            });
          }
        }
      }

      // Overlap check: two ranges [a1,a2] and [b1,b2] overlap iff a1 < b2 && b1 < a2
      const rangesOverlap = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;

      // Within-file: per employee, check that no two schedule blocks overlap
      const uniqueEmpIds = [
        ...new Set(scheduleList.map((s) => String(s.employeeID))),
      ];
      for (const empId of uniqueEmpIds) {
        const list = scheduleList.filter((s) => String(s.employeeID) === empId);
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            if (
              rangesOverlap(
                list[i].startDate,
                list[i].endDate,
                list[j].startDate,
                list[j].endDate,
              )
            ) {
              fs.unlink(req.file.path, () => {});
              return res.status(400).json({
                message: `Overlapping schedule in file for employee ${list[i].employeeID}: ${list[i].startDate}–${list[i].endDate} overlaps ${list[j].startDate}–${list[j].endDate}. Please remove or adjust one of the ranges.`,
              });
            }
          }
        }
      }

      // DB overlap: for each schedule, check existing officialtime for same employee
      for (const s of scheduleList) {
        const overlaps = await hasOverlappingRange(
          db,
          s.employeeID,
          s.startDate,
          s.endDate,
        );
        if (overlaps) {
          fs.unlink(req.file.path, () => {});
          return res.status(400).json({
            message: `Upload would overlap an existing schedule for employee ${s.employeeID} (${s.startDate}–${s.endDate}). Please use a different date range or deactivate the existing schedule first.`,
          });
        }
      }

      let insertedCount = 0;
      const processedRecords = [];

      for (const s of scheduleList) {
        // Mark all existing official time for this employee as inactive
        await new Promise((resolve, reject) => {
          db.query(
            "UPDATE officialtime SET status = 'inactive' WHERE employeeID = ?",
            [s.employeeID],
            (err, result) => {
              if (err) return reject(err);
              resolve(result);
            },
          );
        });

        const values = s.rows.map((row) => [
          s.employeeID,
          s.academicYear,
          s.startDate,
          s.endDate,
          row.day ?? null,
          row.officialTimeIN ?? null,
          row.officialBreaktimeIN ?? null,
          row.officialBreaktimeOUT ?? null,
          row.officialTimeOUT ?? null,
          row.officialHonorariumTimeIN ?? null,
          row.officialHonorariumTimeOUT ?? null,
          row.officialServiceCreditTimeIN ?? null,
          row.officialServiceCreditTimeOUT ?? null,
          row.officialOverTimeIN ?? null,
          row.officialOverTimeOUT ?? null,
          'active', // status: always active on upload (not read from Excel)
          row.breaktime ?? null,
        ]);

        const insertSql = `
          INSERT INTO officialtime (
            employeeID, academicYear, startDate, endDate, day,
            officialTimeIN, officialBreaktimeIN, officialBreaktimeOUT, officialTimeOUT,
            officialHonorariumTimeIN, officialHonorariumTimeOUT,
            officialServiceCreditTimeIN, officialServiceCreditTimeOUT,
            officialOverTimeIN, officialOverTimeOUT, status, breaktime
          ) VALUES ?
        `;
        const [result] = await db.promise().query(insertSql, [values]);
        insertedCount += result.affectedRows || 0;

        for (const row of s.rows) {
          processedRecords.push({
            employeeID: s.employeeID,
            academicYear: s.academicYear,
            startDate: s.startDate,
            endDate: s.endDate,
            day: row.day,
            status: 'active',
            officialTimeIN: row.officialTimeIN,
            officialBreaktimeIN: row.officialBreaktimeIN,
            officialBreaktimeOUT: row.officialBreaktimeOUT,
            officialTimeOUT: row.officialTimeOUT,
            officialHonorariumTimeIN: row.officialHonorariumTimeIN,
            officialHonorariumTimeOUT: row.officialHonorariumTimeOUT,
            officialServiceCreditTimeIN: row.officialServiceCreditTimeIN,
            officialServiceCreditTimeOUT: row.officialServiceCreditTimeOUT,
            officialOverTimeIN: row.officialOverTimeIN,
            officialOverTimeOUT: row.officialOverTimeOUT,
          });
        }
      }

      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting uploaded file:', err);
      });

      if (!insertedCount) {
        return res.status(400).json({
          message:
            'Upload parsed successfully but no records were inserted. Please check the Excel contents (required columns and date range) and try again.',
        });
      }

      res.json({
        message:
          'Upload complete. New schedules are set to Active; status is not read from the file.',
        inserted: insertedCount,
        updated: 0,
        records: processedRecords,
      });
    } catch (error) {
      console.error('Error processing Excel file:', error);
      res.status(500).json({ message: 'Error processing Excel file.' });
    }
  },
);

// EXCEL VALIDATION ONLY (no DB insert) - used by frontend to block uploads on overlap/invalid contents
router.post(
  '/upload-excel-faculty-official-time/validate',
  upload.single('file'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    try {
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: null,
        raw: false,
      });

      if (!sheet.length) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ message: 'Excel file is empty.' });
      }

      const cleanedSheet = sheet.map((row) => {
        const normalized = {};
        for (const key in row) {
          const cleanKey = String(key)
            .replace(/\u00A0/g, '')
            .trim()
            .toLowerCase();
          normalized[cleanKey] = row[key];
        }
        return normalized;
      });

      const getField = (r, names) => {
        for (const n of names) {
          if (r[n] != null) return r[n];
        }
        return null;
      };

      // Normalize date to YYYY-MM-DD
      const normDate = (val) => {
        if (val == null || val === '') return null;
        const s = String(val).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        const d = new Date(val);
        if (Number.isNaN(d.getTime())) return null;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayNum = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dayNum}`;
      };

      const groupKey = (empId, from, to) => `${String(empId)}|${from}|${to}`;
      const groups = new Map();

      for (const r of cleanedSheet) {
        const employeeID = getField(r, [
          'employeeid',
          'employeenumber',
          'employee number',
          'employee_id',
        ]);
        const day = getField(r, ['day', 'weekday']);
        const effectiveFrom = normDate(
          getField(r, [
            'effective_from',
            'effective from',
            'startdate',
            'start date',
          ]),
        );
        const effectiveUntil = normDate(
          getField(r, [
            'effective_until',
            'effective until',
            'enddate',
            'end date',
          ]),
        );

        if (!employeeID || !day) continue;
        if (!effectiveFrom || !effectiveUntil) continue;
        if (effectiveFrom > effectiveUntil) continue;

        const officialTimeIN = getField(r, [
          'officialtimein',
          'time in',
          'timein',
        ]);
        const officialBreaktimeIN = getField(r, [
          'officialbreaktimein',
          'break in',
          'breakin',
        ]);
        const officialBreaktimeOUT = getField(r, [
          'officialbreaktimeout',
          'break out',
          'breakout',
        ]);
        const officialTimeOUT = getField(r, [
          'officialtimeout',
          'time out',
          'timeout',
        ]);
        const officialHonorariumTimeIN = getField(r, [
          'officialhonorariumtimein',
          'honorarium time in',
          'honorariumtimein',
        ]);
        const officialHonorariumTimeOUT = getField(r, [
          'officialhonorariumtimeout',
          'honorarium time out',
          'honorariumtimeout',
        ]);
        const officialServiceCreditTimeIN = getField(r, [
          'officialservicecredittimein',
          'service credit time in',
          'servicecredittimein',
        ]);
        const officialServiceCreditTimeOUT = getField(r, [
          'officialservicecredittimeout',
          'service credit time out',
          'servicecredittimeout',
        ]);
        const officialOverTimeIN = getField(r, [
          'officialovertimein',
          'overtime in',
          'ot in',
          'overtimein',
        ]);
        const officialOverTimeOUT = getField(r, [
          'officialovertimeout',
          'overtime out',
          'ot out',
          'overtimeout',
        ]);
        const breaktime = getField(r, ['breaktime', 'break time']);

        const key = groupKey(employeeID, effectiveFrom, effectiveUntil);
        if (!groups.has(key)) {
          const academicYearVal = (() => {
            const academicYearCol = getField(r, [
              'academic year',
              'academicyear',
            ]);
            const semesterCol = getField(r, ['semester']);
            const yearRaw = getField(r, ['year']);
            const sem =
              semesterCol != null && String(semesterCol).trim() !== ''
                ? String(semesterCol).trim()
                : '';
            if (
              academicYearCol != null &&
              String(academicYearCol).trim() !== ''
            ) {
              const s = String(academicYearCol).trim();
              if (sem) return `${s} ${sem}`.trim();
              return s;
            }
            if (yearRaw != null && String(yearRaw).trim() !== '') {
              const y = Number(String(yearRaw).trim());
              if (Number.isFinite(y))
                return sem ? `${y}-${y + 1} ${sem}`.trim() : `${y}-${y + 1}`;
            }
            return sem || null;
          })();
          groups.set(key, {
            employeeID,
            startDate: effectiveFrom,
            endDate: effectiveUntil,
            academicYear: academicYearVal,
            rows: [],
          });
        }
        const g = groups.get(key);
        g.rows.push({
          day,
          officialTimeIN: officialTimeIN || '00:00:00 AM',
          officialBreaktimeIN: officialBreaktimeIN || '00:00:00 AM',
          officialBreaktimeOUT: officialBreaktimeOUT || '00:00:00 AM',
          officialTimeOUT: officialTimeOUT || '00:00:00 AM',
          officialHonorariumTimeIN: officialHonorariumTimeIN || '00:00:00 AM',
          officialHonorariumTimeOUT: officialHonorariumTimeOUT || '00:00:00 AM',
          officialServiceCreditTimeIN:
            officialServiceCreditTimeIN || '00:00:00 AM',
          officialServiceCreditTimeOUT:
            officialServiceCreditTimeOUT || '00:00:00 AM',
          officialOverTimeIN: officialOverTimeIN || '00:00:00 AM',
          officialOverTimeOUT: officialOverTimeOUT || '00:00:00 AM',
          breaktime: breaktime != null ? breaktime : null,
        });
      }

      const scheduleList = Array.from(groups.values()).filter(
        (g) => g.rows.length > 0,
      );
      if (scheduleList.length === 0) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({
          message:
            'No valid schedule blocks found. Ensure each row has employeeID, day, effective_from, and effective_until.',
        });
      }

      // Content validation (time overlaps)
      for (const s of scheduleList) {
        for (const row of s.rows) {
          const segments = getSegmentsForDayRow(row);
          const overlap = findOverlapInSegments(segments);
          if (overlap) {
            fs.unlink(req.file.path, () => {});
            return res.status(400).json({
              message: formatTimeOverlapMessage({
                day: row.day,
                employeeID: s.employeeID,
                segA: overlap.a,
                segB: overlap.b,
              }),
              overlap: buildTimeOverlapPayload({
                day: row.day,
                employeeID: s.employeeID,
                segA: overlap.a,
                segB: overlap.b,
              }),
            });
          }
        }
      }

      // Within-file date-range overlap
      const rangesOverlap = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;
      const uniqueEmpIds = [
        ...new Set(scheduleList.map((s) => String(s.employeeID))),
      ];
      for (const empId of uniqueEmpIds) {
        const list = scheduleList.filter((s) => String(s.employeeID) === empId);
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            if (
              rangesOverlap(
                list[i].startDate,
                list[i].endDate,
                list[j].startDate,
                list[j].endDate,
              )
            ) {
              fs.unlink(req.file.path, () => {});
              return res.status(400).json({
                message: `Overlapping schedule in file for employee ${list[i].employeeID}: ${list[i].startDate}–${list[i].endDate} overlaps ${list[j].startDate}–${list[j].endDate}. Please remove or adjust one of the ranges.`,
              });
            }
          }
        }
      }

      // DB date-range overlap
      for (const s of scheduleList) {
        const overlaps = await hasOverlappingRange(
          db,
          s.employeeID,
          s.startDate,
          s.endDate,
        );
        if (overlaps) {
          fs.unlink(req.file.path, () => {});
          return res.status(400).json({
            message: `Upload would overlap an existing schedule for employee ${s.employeeID} (${s.startDate}–${s.endDate}). Please use a different date range.`,
          });
        }
      }

      fs.unlink(req.file.path, () => {});
      return res.json({
        message: 'Validation passed. No overlaps detected.',
        schedules: scheduleList.map((s) => ({
          employeeID: s.employeeID,
          academicYear: s.academicYear,
          startDate: s.startDate,
          endDate: s.endDate,
          rows: s.rows.length,
        })),
      });
    } catch (error) {
      fs.unlink(req.file.path, () => {});
      console.error('Error validating Excel file:', error);
      return res.status(500).json({ message: 'Error validating Excel file.' });
    }
  },
);

// GET all users with their official time status
router.get('/officialtime/users-status', authenticateToken, (req, res) => {
  const sql = `
    SELECT 
      u.employeeNumber,
      u.email,
      u.role,
      p.firstName,
      p.middleName,
      p.lastName,
      p.nameExtension,
      -- department via assignment -> department_table
      dt.description AS department,
      -- latest active schedule fields (academicYear, startDate, endDate) via join to latest startDate row
      ot.academicYear AS academicYear,
      ot.startDate AS startDate,
      ot.endDate AS endDate,
      CASE 
        WHEN COUNT(DISTINCT ot2.day) >= 7 THEN 1 
        ELSE 0 
      END as hasDefaultOfficialTime,
      COUNT(DISTINCT ot2.day) as officialTimeDaysCount
    FROM users u
    LEFT JOIN person_table p ON u.employeeNumber = p.agencyEmployeeNum
    LEFT JOIN department_assignment da ON u.employeeNumber = da.employeeNumber
    LEFT JOIN department_table dt ON da.code = dt.code
    -- ot2 counts active days for the user (preserves previous behavior)
    LEFT JOIN officialtime ot2 ON u.employeeNumber = ot2.employeeID AND (ot2.status = 'active' OR ot2.status IS NULL)
    -- join to subquery that finds the latest startDate per employee for active schedules
    LEFT JOIN (
      SELECT employeeID, MAX(startDate) AS latestStart
      FROM officialtime
      WHERE status = 'active'
      GROUP BY employeeID
    ) latest ON u.employeeNumber = latest.employeeID
    LEFT JOIN officialtime ot ON ot.employeeID = latest.employeeID AND ot.startDate = latest.latestStart AND ot.status = 'active'
    GROUP BY u.employeeNumber, u.email, u.role, p.firstName, p.middleName, p.lastName, p.nameExtension, dt.description, ot.academicYear, ot.startDate, ot.endDate
    ORDER BY p.lastName, p.firstName
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching users with official time status:', err);
      return res.status(500).json({ error: err.message });
    }

    try {
      logAudit(req.user, 'View', 'Official Time Users Status', null, null);
    } catch (e) {
      console.error('Audit log error:', e);
    }

    // Format the results
    const formattedResults = results.map((row) => ({
      employeeNumber: row.employeeNumber,
      email: row.email,
      role: row.role,
      firstName: row.firstName || '',
      middleName: row.middleName || '',
      lastName: row.lastName || '',
      nameExtension: row.nameExtension || '',
      fullName:
        `${row.firstName || ''} ${row.middleName ? row.middleName + ' ' : ''}${row.lastName || ''}${row.nameExtension ? ' ' + row.nameExtension : ''}`.trim(),
      department: row.department || '',
      academicYear: row.academicYear || null,
      startDate: row.startDate ? toDateOnlyString(row.startDate) : null,
      endDate: row.endDate ? toDateOnlyString(row.endDate) : null,
      hasDefaultOfficialTime: row.hasDefaultOfficialTime === 1,
      officialTimeDaysCount: row.officialTimeDaysCount || 0,
    }));

    res.json(formattedResults);
  });
});

// POST set default official time for users who don't have it
router.post(
  '/officialtime/set-default-for-users',
  authenticateToken,
  (req, res) => {
    const { employeeNumbers } = req.body; // Optional: if provided, only set for these users

    // Default official time values
    const defaultTimes = {
      officialTimeIN: '08:00:00 AM',
      officialBreaktimeIN: '00:00:00 AM',
      officialBreaktimeOUT: '00:00:00 AM',
      officialTimeOUT: '05:00:00 PM',
      officialHonorariumTimeIN: '00:00:00 AM',
      officialHonorariumTimeOUT: '00:00:00 AM',
      officialServiceCreditTimeIN: '00:00:00 AM',
      officialServiceCreditTimeOUT: '00:00:00 AM',
      officialOverTimeIN: '00:00:00 AM',
      officialOverTimeOUT: '00:00:00 AM',
      breaktime: '',
    };

    const days = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];

    // First, get all users or specific users
    let userQuery = 'SELECT employeeNumber FROM users';
    let queryParams = [];

    if (
      employeeNumbers &&
      Array.isArray(employeeNumbers) &&
      employeeNumbers.length > 0
    ) {
      const placeholders = employeeNumbers.map(() => '?').join(',');
      userQuery += ` WHERE employeeNumber IN (${placeholders})`;
      queryParams = employeeNumbers;
    }

    db.query(userQuery, queryParams, (err, users) => {
      if (err) {
        console.error('Error fetching users:', err);
        return res.status(500).json({ error: err.message });
      }

      let processedCount = 0;
      let insertedCount = 0;
      let skippedCount = 0;
      let errors = [];

      // Process each user
      const processUser = (user, callback) => {
        const employeeID = user.employeeNumber;

        // Check if user already has official time for all days
        const checkQuery =
          'SELECT COUNT(*) as count FROM officialtime WHERE employeeID = ?';
        db.query(checkQuery, [employeeID], (checkErr, checkResult) => {
          if (checkErr) {
            errors.push(
              `Error checking official time for ${employeeID}: ${checkErr.message}`,
            );
            return callback();
          }

          const existingCount = checkResult[0]?.count || 0;

          // Safety: if user already has ANY official time, skip (avoid creating overlaps/duplicates)
          if (existingCount > 0) {
            skippedCount++;
            processedCount++;
            return callback();
          }

          const defaultStartDate = '1970-01-01';
          const defaultEndDate = '2099-12-31';
          const defaultStatus = 'active';
          const defaultAcademicYear = null;

          const values = days.map((day) => [
            employeeID,
            defaultAcademicYear,
            defaultStartDate,
            defaultEndDate,
            day,
            defaultTimes.officialTimeIN,
            defaultTimes.officialBreaktimeIN,
            defaultTimes.officialBreaktimeOUT,
            defaultTimes.officialTimeOUT,
            defaultTimes.officialHonorariumTimeIN,
            defaultTimes.officialHonorariumTimeOUT,
            defaultTimes.officialServiceCreditTimeIN,
            defaultTimes.officialServiceCreditTimeOUT,
            defaultTimes.officialOverTimeIN,
            defaultTimes.officialOverTimeOUT,
            defaultStatus,
            defaultTimes.breaktime,
          ]);

          const insertQuery = `
          INSERT INTO officialtime (
            employeeID, academicYear, startDate, endDate, day,
            officialTimeIN, officialBreaktimeIN, officialBreaktimeOUT, officialTimeOUT,
            officialHonorariumTimeIN, officialHonorariumTimeOUT,
            officialServiceCreditTimeIN, officialServiceCreditTimeOUT,
            officialOverTimeIN, officialOverTimeOUT, status, breaktime
          )
          VALUES ?
        `;

          db.query(insertQuery, [values], (insertErr, insertResult) => {
            if (insertErr) {
              errors.push(
                `Error setting default official time for ${employeeID}: ${insertErr.message}`,
              );
            } else {
              insertedCount += insertResult.affectedRows || 0;
            }
            processedCount++;
            callback();
          });
        });
      };

      // Process all users sequentially to avoid overwhelming the database
      let currentIndex = 0;
      const processNext = () => {
        if (currentIndex >= users.length) {
          try {
            logAudit(
              req.user,
              `Set default official time for ${processedCount} users (${insertedCount} records inserted)`,
              'Official Time',
              null,
              null,
            );
          } catch (e) {
            console.error('Audit log error:', e);
          }

          res.json({
            message: 'Default official time set successfully',
            processed: processedCount,
            inserted: insertedCount,
            insertedUsers: Math.floor((insertedCount || 0) / 7),
            skipped: skippedCount,
            errors: errors.length > 0 ? errors : undefined,
          });
          return;
        }

        processUser(users[currentIndex], () => {
          currentIndex++;
          processNext();
        });
      };

      if (users.length === 0) {
        return res.json({
          message: 'No users found',
          processed: 0,
          inserted: 0,
        });
      }

      processNext();
    });
  },
);

// BULK create schedules for multiple employees and multiple blocks (dates), using one set of day records
router.post(
  '/officialtime/bulk-schedules',
  authenticateToken,
  async (req, res) => {
    const { employeeIDs, blocks, records } = req.body || {};

    if (
      !employeeIDs ||
      !Array.isArray(employeeIDs) ||
      employeeIDs.length === 0
    ) {
      return res
        .status(400)
        .json({
          message: 'employeeIDs is required and must be a non-empty array.',
        });
    }
    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
      return res
        .status(400)
        .json({
          message:
            'blocks is required and must contain at least one schedule block.',
        });
    }
    if (!records || !Array.isArray(records) || records.length === 0) {
      return res
        .status(400)
        .json({
          message: 'records is required and must contain at least one day row.',
        });
    }

    // Validate time overlaps once for the provided records (applies to all blocks)
    for (const row of records) {
      const segments = getSegmentsForDayRow(row);
      const overlap = findOverlapInSegments(segments);
      if (overlap) {
        return res.status(400).json({
          message: formatTimeOverlapMessage({
            day: row.day,
            employeeID: 'multiple',
            segA: overlap.a,
            segB: overlap.b,
          }),
          overlap: buildTimeOverlapPayload({
            day: row.day,
            employeeID: 'multiple',
            segA: overlap.a,
            segB: overlap.b,
          }),
        });
      }
    }

    // Validate blocks
    for (const b of blocks) {
      if (!b || !b.startDate || !b.endDate) {
        return res
          .status(400)
          .json({ message: 'Each block must have startDate and endDate.' });
      }
      if (new Date(b.startDate) > new Date(b.endDate)) {
        return res
          .status(400)
          .json({
            message: `Block startDate must be on or before endDate (${b.startDate} > ${b.endDate}).`,
          });
      }
    }

    const results = [];

    for (const empIdRaw of employeeIDs) {
      const employeeID = String(empIdRaw || '').trim();
      if (!employeeID) continue;

      const empResult = { employeeID, inserted: 0, errors: [] };

      // Check overlaps against existing schedules for each block
      for (const b of blocks) {
        const overlaps = await hasOverlappingRange(
          db,
          employeeID,
          b.startDate,
          b.endDate,
        );
        if (overlaps) {
          empResult.errors.push(
            `Overlap with existing schedule for ${employeeID} on range ${b.startDate}–${b.endDate}`,
          );
        }
      }

      // If all blocks overlap, skip inserts
      if (empResult.errors.length === blocks.length) {
        results.push(empResult);
        continue;
      }

      // Inactivate existing schedules once per employee
      try {
        await db
          .promise()
          .query(
            "UPDATE officialtime SET status = 'inactive' WHERE employeeID = ?",
            [employeeID],
          );
      } catch (e) {
        empResult.errors.push(
          `Error inactivating existing schedules: ${e.message}`,
        );
        results.push(empResult);
        continue;
      }

      for (const b of blocks) {
        // Skip blocks that conflict
        const overlaps = await hasOverlappingRange(
          db,
          employeeID,
          b.startDate,
          b.endDate,
        );
        if (overlaps) {
          empResult.errors.push(
            `Overlap with existing schedule for ${employeeID} on range ${b.startDate}–${b.endDate}`,
          );
          continue;
        }

        const academicYearVal = (() => {
          const ay = b.academicYear ? String(b.academicYear).trim() : '';
          const sem = b.semester ? String(b.semester).trim() : '';
          if (ay && sem) return `${ay} ${sem}`.trim();
          if (ay) return ay;
          if (sem) return sem;
          return null;
        })();

        const values = records.map((r) => [
          employeeID,
          academicYearVal,
          b.startDate,
          b.endDate,
          r.day ?? null,
          r.officialTimeIN ?? null,
          r.officialBreaktimeIN ?? null,
          r.officialBreaktimeOUT ?? null,
          r.officialTimeOUT ?? null,
          r.officialHonorariumTimeIN ?? null,
          r.officialHonorariumTimeOUT ?? null,
          r.officialServiceCreditTimeIN ?? null,
          r.officialServiceCreditTimeOUT ?? null,
          r.officialOverTimeIN ?? null,
          r.officialOverTimeOUT ?? null,
          'active',
          r.breaktime ?? null,
        ]);

        try {
          const insertSql = `
          INSERT INTO officialtime (
            employeeID, academicYear, startDate, endDate, day,
            officialTimeIN, officialBreaktimeIN, officialBreaktimeOUT, officialTimeOUT,
            officialHonorariumTimeIN, officialHonorariumTimeOUT,
            officialServiceCreditTimeIN, officialServiceCreditTimeOUT,
            officialOverTimeIN, officialOverTimeOUT, status, breaktime
          ) VALUES ?
        `;
          const [insertResult] = await db.promise().query(insertSql, [values]);
          empResult.inserted += insertResult.affectedRows || 0;
        } catch (e) {
          empResult.errors.push(
            `Error inserting schedule ${b.startDate}–${b.endDate}: ${e.message}`,
          );
        }
      }

      results.push(empResult);
    }

    const totalInserted = results.reduce(
      (sum, r) => sum + (r.inserted || 0),
      0,
    );
    res.json({
      message: 'Bulk schedules processed.',
      totalInserted,
      results,
    });
  },
);

module.exports = router;
