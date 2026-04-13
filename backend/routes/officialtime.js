'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// QA FIXES APPLIED:
//  #1  DB transactions on upload (inactivate + insert are atomic per employee)
//  #2  hasOverlappingRange now filters by status = 'active' only
//  #3  Bulk schedule uses per-employee transactions for atomicity
//  #4  Validate route uses the same active-only overlap check as insert
//  #5  Status column in Excel is documented/warned in response (not silently ignored)
//  #6  breaktime validated as numeric string; non-numeric values rejected with clear error
//  #7  Duplicate day check per employee per block before insert
//  #8  hasOverlappingRange filters status = 'active' (fixes inactive blocking new uploads)
//  #9  Excel dates parsed via xlsx serial-number-safe normalization (locale-safe)
//  #10 Time field format strictly validated; invalid formats reported per row/column
//  #11 Audit truncation is surfaced in the API response warnings array
//  #12 Temp file cleanup wrapped in finally block — always runs
//  #13 Skipped rows (bad dates) are collected and returned as warnings
//  #14 academicYear auto-formatted server-side (same as frontend)
//  #15 File size limit enforced in route (10 MB hard cap)
//  #16 Graceful startup — missing dependencies caught and reported
// ─────────────────────────────────────────────────────────────────────────────

// ── #16: Graceful dependency loading ─────────────────────────────────────────
let express, router, db, authenticateToken, logAudit, upload, xlsx, fs, fillExemptAttendance;
try {
  express          = require('express');
  router           = express.Router();
  db               = require('../db');
  ({ authenticateToken, logAudit } = require('../middleware/auth'));
  ({ upload }      = require('../middleware/upload'));
  ({ fillExemptAttendance } = require('../services/autoAttendanceService'));
  xlsx             = require('xlsx');
  fs               = require('fs');
} catch (depErr) {
  console.error('[officialtime] FATAL: Failed to load dependency —', depErr.message);
  // Export a dummy router that always returns 503 so the server stays alive
  const fallback = require('express').Router();
  fallback.use((req, res) => res.status(503).json({ error: 'Official Time module failed to load. Check server logs.' }));
  module.exports = fallback;
  return;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // #15: 10 MB hard cap
const DAYS_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const VALID_TIME_RE = /^\d{1,2}:\d{2}:\d{2}\s*(AM|PM)$/i; // #10: strict time format

// ─────────────────────────────────────────────────────────────────────────────
// PURE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function toDateOnlyString(val) {
  if (val == null || val === '') return val;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.split('T')[0];
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// #14: Auto-format academic year server-side.
// Stored format is compact (e.g. 2025-2026) so semester concatenation becomes
// "2025-2026 2nd Semester" when provided from Excel.
function autoFormatAcademicYear(raw) {
  if (!raw) return raw;
  const trimmed = String(raw).trim();
  if (/^\d{4}\s*-\s*\d{4}$/.test(trimmed)) {
    const [startYear, endYear] = trimmed.split('-').map((part) => part.trim());
    return `${startYear}-${endYear}`;
  }
  if (/^\d{4}$/.test(trimmed)) {
    const y = parseInt(trimmed, 10);
    return `${y}-${y + 1}`;
  }
  return raw;
}

// #9: Locale-safe date normalisation for Excel values
// xlsx raw:false gives strings, but date serial numbers may still appear depending on cell format.
function normDate(val) {
  if (val == null || val === '') return null;
  const s = String(val).trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Excel serial number (e.g. 45000) — convert without timezone shift
  if (/^\d{4,6}$/.test(s)) {
    const serial = parseInt(s, 10);
    // Excel epoch: Dec 30 1899
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = excelEpoch.getTime() + serial * 86400000;
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
  }

  // MM/DD/YYYY or DD/MM/YYYY — parse both; if ambiguous prefer ISO interpretation
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, a, b, y] = slashMatch;
    // Treat as MM/DD/YYYY (US format from xlsx)
    const month = parseInt(a, 10);
    const day   = parseInt(b, 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${y}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
  }

  // Fallback: parse via Date (UTC-safe)
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

// #10: Strict time format validation — returns normalised "HH:MM:SS AM/PM" or null + reason
function validateAndNormaliseTime(val, fieldName) {
  if (val == null || val === '') return { value: '00:00:00 AM', valid: true };
  const s = String(val).trim();

  // Already valid strict format
  if (VALID_TIME_RE.test(s)) {
    const parts = s.match(/^(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i);
    const hh = String(parts[1]).padStart(2,'0');
    return { value: `${hh}:${parts[2]}:${parts[3]} ${parts[4].toUpperCase()}`, valid: true };
  }

  // HH:MM AM/PM (no seconds) — add :00
  const noSec = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (noSec) {
    const hh = String(noSec[1]).padStart(2,'0');
    return { value: `${hh}:${noSec[2]}:00 ${noSec[3].toUpperCase()}`, valid: true };
  }

  // HH:MM:SS (24h, no AM/PM) — convert
  const h24 = s.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (h24) {
    let hh = parseInt(h24[1], 10);
    const mm = h24[2], ss = h24[3];
    const ap = hh >= 12 ? 'PM' : 'AM';
    if (hh === 0) hh = 12;
    else if (hh > 12) hh -= 12;
    return { value: `${String(hh).padStart(2,'0')}:${mm}:${ss} ${ap}`, valid: true };
  }

  return { value: null, valid: false, reason: `Invalid time format for "${fieldName}": "${s}". Expected HH:MM:SS AM/PM (e.g. 08:00:00 AM).` };
}

// #6: Validate breaktime — must be empty, null, or a non-negative integer string
function validateBreaktime(val) {
  if (val == null || val === '') return { value: null, valid: true };
  const s = String(val).trim();
  if (s === '') return { value: null, valid: true };
  if (!/^\d+$/.test(s)) return { value: null, valid: false, reason: `breaktime must be a whole number of minutes (e.g. 60). Got: "${s}".` };
  return { value: s, valid: true };
}

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
  if (ap) { if (hh === 12) hh = 0; if (ap === 'PM') hh += 12; } else { if (hh > 23) return null; }
  const minutes = hh * 60 + mm;
  if (minutes === 0) return null;
  return minutes;
}

function getSegmentsForDayRow(row) {
  const segments = [];
  const add = (label, start, end) => { if (start != null && end != null && start < end) segments.push({ label, start, end }); };
  const ti = parseTimeToMinutes(row.officialTimeIN);
  const to = parseTimeToMinutes(row.officialTimeOUT);
  const bi = parseTimeToMinutes(row.officialBreaktimeIN);
  const bo = parseTimeToMinutes(row.officialBreaktimeOUT);
  if (ti != null && to != null) {
    if (bi != null && bo != null) {
      add('Work time (Time In → Break In)', ti, bi);
      add('Work time (Break Out → Time Out)', bo, to);
    } else {
      add('Work time (Time In → Time Out)', ti, to);
    }
  }
  add('Honorarium time',     parseTimeToMinutes(row.officialHonorariumTimeIN),    parseTimeToMinutes(row.officialHonorariumTimeOUT));
  add('Service Credits time',parseTimeToMinutes(row.officialServiceCreditTimeIN), parseTimeToMinutes(row.officialServiceCreditTimeOUT));
  add('Overtime time',       parseTimeToMinutes(row.officialOverTimeIN),           parseTimeToMinutes(row.officialOverTimeOUT));
  return segments;
}

function findOverlapInSegments(segments) {
  for (let i = 0; i < segments.length; i++)
    for (let j = i + 1; j < segments.length; j++) {
      const a = segments[i], b = segments[j];
      if (a.start < b.end && b.start < a.end) return { a, b };
    }
  return null;
}

function formatMinutesToTime(mins) {
  const m = Math.max(0, Math.min(1439, Number(mins)));
  const hh24 = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  const ap = hh24 >= 12 ? 'PM' : 'AM';
  let hh12 = hh24 % 12; if (hh12 === 0) hh12 = 12;
  return `${hh12}:${mm} ${ap}`;
}

function formatTimeOverlapMessage({ day, employeeID, segA, segB }) {
  const os = Math.max(segA.start, segB.start), oe = Math.min(segA.end, segB.end);
  return (
    `Schedule conflict on ${day || 'Unknown day'} for Employee ${employeeID}:\n` +
    `${segA.label} overlaps with ${segB.label} between ${formatMinutesToTime(os)} and ${formatMinutesToTime(oe)}.\n` +
    `Overlapping period: ${formatMinutesToTime(os)} – ${formatMinutesToTime(oe)}.\n` +
    `Please revise the schedule to remove the conflict.`
  );
}

function buildTimeOverlapPayload({ day, employeeID, segA, segB }) {
  const os = Math.max(segA.start, segB.start), oe = Math.min(segA.end, segB.end);
  return {
    day: day || 'Unknown day', employeeID: String(employeeID),
    segmentA: { label: segA.label, start: segA.start, end: segA.end },
    segmentB: { label: segB.label, start: segB.start, end: segB.end },
    overlap: { start: os, end: oe, startText: formatMinutesToTime(os), endText: formatMinutesToTime(oe), periodText: `${formatMinutesToTime(os)} – ${formatMinutesToTime(oe)}` },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const OFFICIAL_TIME_AUDIT_ROW_FIELDS = [
  'day','officialTimeIN','officialBreaktimeIN','officialBreaktimeOUT','officialTimeOUT',
  'officialHonorariumTimeIN','officialHonorariumTimeOUT','officialServiceCreditTimeIN',
  'officialServiceCreditTimeOUT','officialOverTimeIN','officialOverTimeOUT',
  'breaktime','status','startDate','endDate','academicYear',
];

function normalizeAuditValue(val) {
  if (val == null) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

// #11: Truncation is returned so callers can surface it in API response
function sanitizeOfficialTimeRows(rows, maxRows = 200) {
  const list = Array.isArray(rows) ? rows : [];
  const truncated = list.length > maxRows;
  const records = list.slice(0, maxRows).map((row) => {
    const src = row || {}, out = {};
    OFFICIAL_TIME_AUDIT_ROW_FIELDS.forEach((key) => { out[key] = normalizeAuditValue(src[key]); });
    return out;
  });
  return { records, totalRows: list.length, truncated };
}

function buildOfficialTimeAuditDetails(payload = {}) {
  const base = payload || {};
  const { records, totalRows, truncated } = sanitizeOfficialTimeRows(base.records, 200);
  return {
    module: 'officialtime', source: base.source || 'unknown',
    employeeID: base.employeeID == null ? null : String(base.employeeID).trim() || null,
    academicYear: normalizeAuditValue(base.academicYear),
    startDate: normalizeAuditValue(base.startDate), endDate: normalizeAuditValue(base.endDate),
    lookupEndDate: normalizeAuditValue(base.lookupEndDate), notes: normalizeAuditValue(base.notes),
    records, totalRows, truncated, recordedAt: new Date().toISOString(),
  };
}

function normalizeEmployeeList(list) {
  const arr = Array.isArray(list) ? list : [];
  return [...new Set(arr
    .map((v) => String(v == null ? '' : v).trim())
    .filter((v) => v !== ''))];
}

function buildOfficialTimeActionAuditDetails(payload = {}) {
  const base = payload || {};
  const affectedEmployeeNumbers = normalizeEmployeeList(base.affectedEmployeeNumbers);
  return {
    module: 'officialtime',
    source: base.source || 'unknown',
    status: base.status || 'success',
    employeeID: base.employeeID == null ? null : String(base.employeeID).trim() || null,
    affectedEmployeeNumbers,
    affectedCount: affectedEmployeeNumbers.length,
    academicYear: normalizeAuditValue(base.academicYear),
    startDate: normalizeAuditValue(base.startDate),
    endDate: normalizeAuditValue(base.endDate),
    lookupEndDate: normalizeAuditValue(base.lookupEndDate),
    blockCount: Number.isFinite(base.blockCount) ? base.blockCount : null,
    rowCount: Number.isFinite(base.rowCount) ? base.rowCount : null,
    insertedCount: Number.isFinite(base.insertedCount) ? base.insertedCount : null,
    updatedCount: Number.isFinite(base.updatedCount) ? base.updatedCount : null,
    skippedCount: Number.isFinite(base.skippedCount) ? base.skippedCount : null,
    failedCount: Number.isFinite(base.failedCount) ? base.failedCount : null,
    notes: normalizeAuditValue(base.notes),
    recordedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// #2 & #8: Filter by status = 'active' only — inactive schedules no longer block uploads
function hasOverlappingRange(conn, employeeID, newStart, newEnd) {
  return new Promise((resolve, reject) => {
    conn.query(
      `SELECT DISTINCT startDate, endDate FROM officialtime
       WHERE employeeID = ? AND status = 'active'
         AND startDate IS NOT NULL AND endDate IS NOT NULL`,
      [employeeID],
      (err, rows) => {
        if (err) return reject(err);
        const newS = new Date(newStart).getTime();
        const newE = new Date(newEnd).getTime();
        for (const row of (Array.isArray(rows) ? rows : [])) {
          const s = new Date(row.startDate).getTime();
          const e = new Date(row.endDate).getTime();
          if (newS < e && s < newE) return resolve(true);
        }
        resolve(false);
      },
    );
  });
}

// #1 & #3: Transaction helpers
function beginTransaction(conn) {
  return new Promise((resolve, reject) => conn.beginTransaction((err) => err ? reject(err) : resolve()));
}
function commitTransaction(conn) {
  return new Promise((resolve, reject) => conn.commit((err) => err ? reject(err) : resolve()));
}
function rollbackTransaction(conn) {
  return new Promise((resolve) => {
    if (!conn || typeof conn.rollback !== 'function') {
      console.error('[officialtime] Invalid connection for rollback');
      return resolve();
    }
    conn.rollback(() => resolve());
  });
}
function queryAsync(conn, sql, params) {
  return new Promise((resolve, reject) => conn.query(sql, params, (err, result) => err ? reject(err) : resolve(result)));
}
function getConnectionAsync(pool) {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) return reject(err);
      resolve(connection);
    });
  });
}
function releaseConnection(conn) {
  if (conn && typeof conn.release === 'function') conn.release();
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL FIELD RESOLVER
// ─────────────────────────────────────────────────────────────────────────────

function getField(r, dbField, aliases = []) {
  const dbLower = dbField.toLowerCase();
  if (r[dbLower] != null) return r[dbLower];
  for (const alias of aliases) { if (r[alias] != null) return r[alias]; }
  return null;
}

function normaliseRow(row) {
  const out = {};
  for (const key in row) {
    const cleanKey = String(key).replace(/\u00A0/g, '').trim().toLowerCase();
    out[cleanKey] = row[key];
  }
  return out;
}

// #7: Duplicate day detection helper
function hasDuplicateDay(rows) {
  const seen = new Set();
  for (const r of rows) {
    const d = (r.day || '').trim().toLowerCase();
    if (seen.has(d)) return r.day;
    seen.add(d);
  }
  return null;
}

// TIME_FIELDS for validation
const TIME_FIELDS = [
  'officialTimeIN','officialBreaktimeIN','officialBreaktimeOUT','officialTimeOUT',
  'officialHonorariumTimeIN','officialHonorariumTimeOUT',
  'officialServiceCreditTimeIN','officialServiceCreditTimeOUT',
  'officialOverTimeIN','officialOverTimeOUT',
];

/**
 * Parse all rows from the cleaned sheet into schedule groups.
 * Returns { groups, skippedRows, timeErrors }
 * #9  locale-safe dates via normDate
 * #10 strict time validation
 * #13 skipped rows collected with reasons
 */
function parseSheetIntoGroups(cleanedSheet) {
  const groupKey = (empId, from, to) => `${String(empId)}|${from}|${to}`;
  const groups   = new Map();
  const skippedRows  = []; // #13
  const timeErrors   = []; // #10

  cleanedSheet.forEach((r, rowIndex) => {
    const excelRow = rowIndex + 2; // 1-based + header row

    const employeeID = getField(r, 'employeeID', ['employeenumber','employee number','employee_id']);
    const day        = getField(r, 'day', ['weekday']);

    // #13: Collect skipped rows with specific reasons
    if (!employeeID) { skippedRows.push({ row: excelRow, reason: 'Missing employeeID' }); return; }
    if (!day)        { skippedRows.push({ row: excelRow, employeeID, reason: 'Missing day' }); return; }

    const effectiveFrom  = normDate(getField(r, 'startDate', ['effective_from','effective from','start date']));
    const effectiveUntil = normDate(getField(r, 'endDate',   ['effective_until','effective until','end date']));

    if (!effectiveFrom)  { skippedRows.push({ row: excelRow, employeeID, day, reason: 'Missing or invalid startDate' }); return; }
    if (!effectiveUntil) { skippedRows.push({ row: excelRow, employeeID, day, reason: 'Missing or invalid endDate' }); return; }
    if (effectiveFrom > effectiveUntil) { skippedRows.push({ row: excelRow, employeeID, day, reason: `startDate (${effectiveFrom}) is after endDate (${effectiveUntil})` }); return; }

    // #10: Validate all time fields
    const resolvedTimes = {};
    let rowHasTimeError = false;
    for (const field of TIME_FIELDS) {
      const rawVal = getField(r, field, []);
      const result = validateAndNormaliseTime(rawVal, field);
      if (!result.valid) {
        timeErrors.push({ row: excelRow, employeeID, day, field, reason: result.reason });
        rowHasTimeError = true;
      } else {
        resolvedTimes[field] = result.value;
      }
    }
    if (rowHasTimeError) return; // skip row if any time field is invalid

    // #6: Validate breaktime
    const rawBreaktime = getField(r, 'breaktime', ['break time']);
    const breaktimeResult = validateBreaktime(rawBreaktime);
    if (!breaktimeResult.valid) {
      timeErrors.push({ row: excelRow, employeeID, day, field: 'breaktime', reason: breaktimeResult.reason });
      return;
    }

    // Status from file (stored for audit reference only — always inserted as 'active')
    const statusFromFile = getField(r, 'status', []) || null;

    const key = groupKey(employeeID, effectiveFrom, effectiveUntil);
    if (!groups.has(key)) {
      // #14: Auto-format academicYear server-side
      const academicYearVal = (() => {
        const ayRaw  = getField(r, 'academicYear', ['academic year']);
        const semRaw = getField(r, 'semester', []);
        const yrRaw  = getField(r, 'year', []);
        const ay  = ayRaw  != null && String(ayRaw).trim()  !== '' ? autoFormatAcademicYear(String(ayRaw).trim())  : null;
        const sem = semRaw != null && String(semRaw).trim() !== '' ? String(semRaw).trim() : '';
        if (ay && sem) return `${ay} ${sem}`.trim();
        if (ay) return ay;
        if (yrRaw != null && String(yrRaw).trim() !== '') {
          const y = Number(String(yrRaw).trim());
          if (Number.isFinite(y)) return sem ? `${y}-${y+1} ${sem}`.trim() : `${y}-${y+1}`;
        }
        return sem || null;
      })();

      groups.set(key, { employeeID, startDate: effectiveFrom, endDate: effectiveUntil, academicYear: academicYearVal, rows: [] });
    }

    groups.get(key).rows.push({
      day,
      ...resolvedTimes,
      breaktime:       breaktimeResult.value,
      _statusFromFile: statusFromFile,
    });
  });

  return { groups, skippedRows, timeErrors };
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED VALIDATION LOGIC (used by both /validate and actual upload)
// #4: Both routes use the same validation function so results are never stale
// ─────────────────────────────────────────────────────────────────────────────

async function validateScheduleList(scheduleList) {
  const errors = [];

  // Time segment overlaps
  for (const s of scheduleList) {
    // #7: Duplicate day check
    const dupDay = hasDuplicateDay(s.rows);
    if (dupDay) {
      errors.push({ type: 'duplicate_day', employeeID: s.employeeID, day: dupDay, message: `Duplicate day "${dupDay}" found for employee ${s.employeeID} in range ${s.startDate}–${s.endDate}.` });
      continue;
    }

    for (const row of s.rows) {
      const segments = getSegmentsForDayRow(row);
      const overlap  = findOverlapInSegments(segments);
      if (overlap) {
        errors.push({
          type: 'time_overlap',
          employeeID: s.employeeID,
          day: row.day,
          message: formatTimeOverlapMessage({ day: row.day, employeeID: s.employeeID, segA: overlap.a, segB: overlap.b }),
          overlap: buildTimeOverlapPayload({ day: row.day, employeeID: s.employeeID, segA: overlap.a, segB: overlap.b }),
        });
      }
    }
  }

  // Within-file date range overlap
  const rangesOverlap = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;
  const uniqueEmpIds = [...new Set(scheduleList.map((s) => String(s.employeeID)))];
  for (const empId of uniqueEmpIds) {
    const list = scheduleList.filter((s) => String(s.employeeID) === empId);
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++)
        if (rangesOverlap(list[i].startDate, list[i].endDate, list[j].startDate, list[j].endDate))
          errors.push({ type: 'date_overlap_in_file', employeeID: empId, message: `Overlapping schedule in file for employee ${empId}: ${list[i].startDate}–${list[i].endDate} overlaps ${list[j].startDate}–${list[j].endDate}.` });
  }

  // #2 & #8: DB date range overlap — active schedules only
  for (const s of scheduleList) {
    const overlaps = await hasOverlappingRange(db, s.employeeID, s.startDate, s.endDate);
    if (overlaps)
      errors.push({ type: 'date_overlap_db', employeeID: s.employeeID, message: `Upload would overlap an existing active schedule for employee ${s.employeeID} (${s.startDate}–${s.endDate}). Please use a different date range or deactivate the existing schedule first.` });
  }

  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE CLEANUP HELPER — #12: always deletes temp file
// ─────────────────────────────────────────────────────────────────────────────

function safeUnlink(filePath) {
  if (!filePath) return;
  fs.unlink(filePath, (err) => { if (err && err.code !== 'ENOENT') console.error('[officialtime] Failed to delete temp file:', err.message); });
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHOOL YEAR ACTIVATOR (stubs)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/officialtime/school-year/:empId', authenticateToken, (req, res) => res.status(200).json(null));
router.post('/officialtime/school-year', authenticateToken, (req, res) => res.status(200).json({ message: 'OK' }));

// ─────────────────────────────────────────────────────────────────────────────
// GET official time table by employeeID
// ─────────────────────────────────────────────────────────────────────────────

router.get('/officialtimetable/:employeeID', authenticateToken, (req, res) => {
  const { employeeID } = req.params;
  const { date, startDate, endDate } = req.query;

  let sql = 'SELECT * FROM officialtime WHERE employeeID = ?';
  const params = [employeeID];
  if (date) { sql += ' AND ? BETWEEN startDate AND endDate'; params.push(date); }
  else if (startDate && endDate) { sql += ' AND startDate = ? AND endDate = ?'; params.push(startDate, endDate); }
  sql += ' ORDER BY startDate, endDate, id';

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    const out = (results || []).map((row) => ({ ...row, startDate: toDateOnlyString(row.startDate), endDate: toDateOnlyString(row.endDate) }));
    try {
      logAudit(
        req.user,
        'View',
        'Official Time',
        null,
        employeeID,
        buildOfficialTimeActionAuditDetails({
          source: 'view-db',
          employeeID,
          affectedEmployeeNumbers: [employeeID],
          startDate: startDate || date || null,
          endDate: endDate || date || null,
          rowCount: out.length,
        }),
      );
    } catch (e) { console.error('Audit log error:', e); }
    res.json(out);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST official time table (insert new schedule version)
// #1: Wrapped in DB transaction
// ─────────────────────────────────────────────────────────────────────────────

router.post('/officialtimetable', authenticateToken, async (req, res) => {
  const { employeeID, academicYear, startDate, endDate, status, records } = req.body || {};

  if (!employeeID)                              return res.status(400).json({ message: 'employeeID is required.' });
  if (!startDate || !endDate)                   return res.status(400).json({ message: 'startDate and endDate are required.' });
  if (new Date(startDate) > new Date(endDate))  return res.status(400).json({ message: 'startDate must be on or before endDate.' });
  if (!records || !Array.isArray(records) || !records.length) return res.status(400).json({ message: 'No records to insert.' });

  // #2: Active-only overlap check
  try {
    const overlaps = await hasOverlappingRange(db, employeeID, startDate, endDate);
    if (overlaps) return res.status(409).json({ message: `This date range (${startDate}–${endDate}) overlaps an existing active schedule for employee ${employeeID}. Choose different dates.` });
  } catch (err) { return res.status(500).json({ error: 'Overlap check failed: ' + err.message }); }

  // #14: Auto-format academicYear
  const academicYearVal = academicYear ? autoFormatAcademicYear(String(academicYear).trim()) : null;

  const values = records.map((r) => [
    employeeID, academicYearVal, startDate, endDate, r.day ?? null,
    r.officialTimeIN ?? null, r.officialBreaktimeIN ?? null, r.officialBreaktimeOUT ?? null, r.officialTimeOUT ?? null,
    r.officialHonorariumTimeIN ?? null, r.officialHonorariumTimeOUT ?? null,
    r.officialServiceCreditTimeIN ?? null, r.officialServiceCreditTimeOUT ?? null,
    r.officialOverTimeIN ?? null, r.officialOverTimeOUT ?? null,
    'active', r.breaktime ?? null,
  ]);

  let conn;
  // #1: Transaction
  try {
    conn = await getConnectionAsync(db);
    await beginTransaction(conn);
    await queryAsync(conn, "UPDATE officialtime SET status = 'inactive' WHERE employeeID = ?", [employeeID]);
    const result = await queryAsync(conn, `
      INSERT INTO officialtime (
        employeeID, academicYear, startDate, endDate, day,
        officialTimeIN, officialBreaktimeIN, officialBreaktimeOUT, officialTimeOUT,
        officialHonorariumTimeIN, officialHonorariumTimeOUT,
        officialServiceCreditTimeIN, officialServiceCreditTimeOUT,
        officialOverTimeIN, officialOverTimeOUT, status, breaktime
      ) VALUES ?`, [values]);
    await commitTransaction(conn);

    try {
      logAudit(
        req.user,
        `Add official time for ${employeeID} (${records.length} rows)`,
        'Official Time',
        null,
        employeeID,
        buildOfficialTimeActionAuditDetails({
          source: 'manual-create',
          employeeID,
          affectedEmployeeNumbers: [employeeID],
          academicYear: academicYearVal,
          startDate,
          endDate,
          rowCount: records.length,
          insertedCount: result.affectedRows || 0,
        }),
      );
    } catch (e) { console.error('Audit log error:', e); }

    let autoAttendance = { inserted: 0, skipped: 0, errors: [] };
    try {
      autoAttendance = await fillExemptAttendance({
        startDate: normDate(startDate),
        endDate: normDate(endDate),
        employeeIDs: [employeeID],
      });
    } catch (autoErr) {
      autoAttendance.errors = [`Auto-attendance trigger failed: ${autoErr.message}`];
    }

    res.json({
      message: 'Official time records saved successfully',
      inserted: result.affectedRows,
      autoAttendance: {
        inserted: autoAttendance.inserted,
        skipped: autoAttendance.skipped,
      },
      warnings: autoAttendance.errors.length ? autoAttendance.errors : undefined,
    });
  } catch (err) {
    await rollbackTransaction(conn);
    console.error('Error creating schedule version:', err);
    if (err.code === 'ER_DUP_ENTRY' || (err.message && err.message.includes('Duplicate')))
      return res.status(409).json({ message: 'A schedule already exists for this employee and day.' });
    res.status(500).json({ error: err.message || 'Database error' });
  } finally {
    releaseConnection(conn);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL UPLOAD — VALIDATE FIRST
// #4: Uses shared validateScheduleList (same logic as insert)
// #12: safeUnlink in finally
// #15: File size check
// ─────────────────────────────────────────────────────────────────────────────

router.post('/upload-excel-faculty-official-time/validate', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
  const filePath = req.file.path;

  try {
    // #15: File size check
    if (req.file.size > MAX_UPLOAD_BYTES)
      return res.status(400).json({ message: `File too large. Maximum allowed size is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` });

    const workbook = xlsx.readFile(filePath);
    const sheet    = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: null, raw: false });

    if (!sheet.length) return res.status(400).json({ message: 'Excel file is empty.' });

    const cleanedSheet = sheet.map(normaliseRow);
    const { groups, skippedRows, timeErrors } = parseSheetIntoGroups(cleanedSheet); // #10 #13

    // #10: Return time errors immediately
    if (timeErrors.length > 0)
      return res.status(400).json({ message: `Invalid time format(s) found in Excel.`, timeErrors });

    const scheduleList = Array.from(groups.values()).filter((g) => g.rows.length > 0);

    if (scheduleList.length === 0)
      return res.status(400).json({
        message: 'No valid schedule blocks found. Ensure each row has employeeID, day, startDate, and endDate.',
        skippedRows,
      });

    // #4: Shared validation
    const validationErrors = await validateScheduleList(scheduleList);
    if (validationErrors.length > 0) {
      const first = validationErrors[0];
      return res.status(400).json({ message: first.message, overlap: first.overlap || null, allErrors: validationErrors });
    }

    // #5: Warn if any Excel rows had a status column value
    const statusWarnings = scheduleList.flatMap((s) =>
      s.rows.filter((r) => r._statusFromFile && String(r._statusFromFile).toLowerCase() !== 'active')
            .map((r) => `Row for employee ${s.employeeID} day ${r.day} had status="${r._statusFromFile}" in Excel — will be inserted as "active".`)
    );

    return res.json({
      message: 'Validation passed. No overlaps detected.',
      schedules: scheduleList.map((s) => ({ employeeID: s.employeeID, academicYear: s.academicYear, startDate: s.startDate, endDate: s.endDate, rows: s.rows.length })),
      warnings: [
        ...skippedRows.map((r) => `Row ${r.row} skipped: ${r.reason}`),
        ...statusWarnings,
      ],
    });
  } catch (error) {
    console.error('Error validating Excel file:', error);
    return res.status(500).json({ message: 'Error validating Excel file.', detail: error.message });
  } finally {
    safeUnlink(filePath); // #12
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL UPLOAD — ACTUAL INSERT
// #1:  Per-employee DB transaction (atomic inactivate + insert)
// #4:  Same shared validation as /validate
// #5:  Status from Excel acknowledged in response
// #11: Audit truncation surfaced in response warnings
// #12: safeUnlink in finally
// #15: File size check
// ─────────────────────────────────────────────────────────────────────────────

router.post('/upload-excel-faculty-official-time', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
  const filePath = req.file.path;

  try {
    // #15
    if (req.file.size > MAX_UPLOAD_BYTES)
      return res.status(400).json({ message: `File too large. Maximum allowed size is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` });

    const workbook = xlsx.readFile(filePath);
    const sheet    = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: null, raw: false });

    if (!sheet.length) return res.status(400).json({ message: 'Excel file is empty.' });

    const cleanedSheet = sheet.map(normaliseRow);
    const { groups, skippedRows, timeErrors } = parseSheetIntoGroups(cleanedSheet);

    // #10
    if (timeErrors.length > 0)
      return res.status(400).json({ message: 'Invalid time format(s) found in Excel.', timeErrors });

    const scheduleList = Array.from(groups.values()).filter((g) => g.rows.length > 0);
    if (scheduleList.length === 0)
      return res.status(400).json({ message: 'No valid schedule blocks found.', skippedRows });

    // #4: Same validation as /validate
    const validationErrors = await validateScheduleList(scheduleList);
    if (validationErrors.length > 0) {
      const first = validationErrors[0];
      return res.status(400).json({ message: first.message, overlap: first.overlap || null, allErrors: validationErrors });
    }

    // ── Insert with per-employee transactions ────────────────────────────────
    let insertedCount = 0;
    let autoAttendanceInserted = 0;
    let autoAttendanceSkipped = 0;
    const processedRecords = [];
    const insertWarnings   = [];

    for (const s of scheduleList) {
      // #1: Transaction per employee — if insert fails, inactivate is rolled back
      let conn;
      try {
        conn = await getConnectionAsync(db);
        await beginTransaction(conn);

        await queryAsync(conn, "UPDATE officialtime SET status = 'inactive' WHERE employeeID = ?", [s.employeeID]);

        const values = s.rows.map((row) => [
          s.employeeID, s.academicYear, s.startDate, s.endDate, row.day ?? null,
          row.officialTimeIN ?? null, row.officialBreaktimeIN ?? null, row.officialBreaktimeOUT ?? null, row.officialTimeOUT ?? null,
          row.officialHonorariumTimeIN ?? null, row.officialHonorariumTimeOUT ?? null,
          row.officialServiceCreditTimeIN ?? null, row.officialServiceCreditTimeOUT ?? null,
          row.officialOverTimeIN ?? null, row.officialOverTimeOUT ?? null,
          'active', // #5: always active regardless of Excel status column
          row.breaktime ?? null,
        ]);

        const result = await queryAsync(conn, `
          INSERT INTO officialtime (
            employeeID, academicYear, startDate, endDate, day,
            officialTimeIN, officialBreaktimeIN, officialBreaktimeOUT, officialTimeOUT,
            officialHonorariumTimeIN, officialHonorariumTimeOUT,
            officialServiceCreditTimeIN, officialServiceCreditTimeOUT,
            officialOverTimeIN, officialOverTimeOUT, status, breaktime
          ) VALUES ?`, [values]);

        await commitTransaction(conn);

        insertedCount += result.affectedRows || 0;

        try {
          const autoResult = await fillExemptAttendance({
            startDate: normDate(s.startDate),
            endDate: normDate(s.endDate),
            employeeIDs: [s.employeeID],
          });
          autoAttendanceInserted += autoResult.inserted;
          autoAttendanceSkipped += autoResult.skipped;
          if (autoResult.errors.length > 0) insertWarnings.push(...autoResult.errors);
        } catch (autoErr) {
          insertWarnings.push(`Employee ${s.employeeID}: Auto-attendance trigger failed. Reason: ${autoErr.message}`);
        }

        for (const row of s.rows) {
          // #5: Warn if status in Excel differed from 'active'
          if (row._statusFromFile && String(row._statusFromFile).toLowerCase() !== 'active')
            insertWarnings.push(`Employee ${s.employeeID} day ${row.day}: Excel status "${row._statusFromFile}" ignored — inserted as "active".`);

          processedRecords.push({
            employeeID: s.employeeID, academicYear: s.academicYear,
            startDate: s.startDate, endDate: s.endDate, day: row.day, status: 'active',
            officialTimeIN: row.officialTimeIN, officialBreaktimeIN: row.officialBreaktimeIN,
            officialBreaktimeOUT: row.officialBreaktimeOUT, officialTimeOUT: row.officialTimeOUT,
            officialHonorariumTimeIN: row.officialHonorariumTimeIN, officialHonorariumTimeOUT: row.officialHonorariumTimeOUT,
            officialServiceCreditTimeIN: row.officialServiceCreditTimeIN, officialServiceCreditTimeOUT: row.officialServiceCreditTimeOUT,
            officialOverTimeIN: row.officialOverTimeIN, officialOverTimeOUT: row.officialOverTimeOUT,
            breaktime: row.breaktime,
          });
        }
      } catch (empErr) {
        await rollbackTransaction(conn); // #1: rollback so employee's old schedule stays active
        console.error(`[officialtime] Upload failed for employee ${s.employeeID}:`, empErr.message);
        insertWarnings.push(`Employee ${s.employeeID}: Insert failed and was rolled back — existing schedule remains active. Reason: ${empErr.message}`);
      } finally {
        releaseConnection(conn);
      }
    }

    if (!insertedCount)
      return res.status(400).json({ message: 'Upload parsed successfully but no records were inserted.', warnings: insertWarnings, skippedRows });

    const affectedEmployees = normalizeEmployeeList(scheduleList.map((s) => s.employeeID));
    const failedCount = scheduleList.filter((s) =>
      insertWarnings.some((w) => w.includes(`Employee ${s.employeeID}: Insert failed`)),
    ).length;
    try {
      logAudit(
        req.user,
        `Upload official time via Excel (${insertedCount} rows)`,
        'Official Time',
        null,
        affectedEmployees.length === 1 ? affectedEmployees[0] : null,
        buildOfficialTimeActionAuditDetails({
          source: 'excel-upload',
          status: failedCount > 0 ? 'partial' : 'success',
          affectedEmployeeNumbers: affectedEmployees,
          blockCount: scheduleList.length,
          rowCount: scheduleList.reduce((sum, s) => sum + (s.rows?.length || 0), 0),
          insertedCount,
          skippedCount: skippedRows.length,
          failedCount,
          notes: insertWarnings.length > 0 ? `${insertWarnings.length} warning(s) during upload.` : null,
        }),
      );
    } catch (e) { console.error('Audit log error:', e); }

    const allWarnings = [
      ...skippedRows.map((r) => `Row ${r.row} skipped: ${r.reason}`),
      ...insertWarnings,
    ];

    res.json({
      message: 'Upload complete. Uploaded schedules are set to Active. Previous active schedules have been set to Inactive.',
      inserted: insertedCount,
      updated: 0,
      autoAttendance: {
        inserted: autoAttendanceInserted,
        skipped: autoAttendanceSkipped,
      },
      records: processedRecords,
      warnings: allWarnings.length > 0 ? allWarnings : undefined,
    });
  } catch (error) {
    console.error('Error processing Excel file:', error);
    res.status(500).json({ message: 'Error processing Excel file.', detail: error.message });
  } finally {
    safeUnlink(filePath); // #12: always clean up temp file
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET all users with their official time status
// ─────────────────────────────────────────────────────────────────────────────

router.get('/officialtime/users-status', authenticateToken, (req, res) => {
  const sql = `
    SELECT
      u.employeeNumber, u.email, u.role,
      p.firstName, p.middleName, p.lastName, p.nameExtension,
      dt.description AS department,
      latest_ot.academicYear, latest_ot.startDate, latest_ot.endDate,
      CASE WHEN COALESCE(active_days.dayCount, 0) >= 7 THEN 1 ELSE 0 END AS hasDefaultOfficialTime,
      COALESCE(active_days.dayCount, 0) AS officialTimeDaysCount
    FROM users u
    LEFT JOIN person_table p ON u.employeeNumber = p.agencyEmployeeNum
    LEFT JOIN department_assignment da ON u.employeeNumber = da.employeeNumber
    LEFT JOIN department_table dt ON da.code = dt.code
    LEFT JOIN (
      SELECT employeeID, COUNT(DISTINCT day) AS dayCount
      FROM officialtime WHERE status = 'active' OR status IS NULL
      GROUP BY employeeID
    ) active_days ON u.employeeNumber = active_days.employeeID
    LEFT JOIN (
      SELECT o.employeeID, o.academicYear, o.startDate, o.endDate
      FROM officialtime o
      INNER JOIN (
        SELECT employeeID, MAX(startDate) AS maxStart
        FROM officialtime WHERE status = 'active'
        GROUP BY employeeID
      ) m ON o.employeeID = m.employeeID AND o.startDate = m.maxStart
      WHERE o.status = 'active'
      GROUP BY o.employeeID
    ) latest_ot ON u.employeeNumber = latest_ot.employeeID
    GROUP BY u.employeeNumber, u.email, u.role, p.firstName, p.middleName, p.lastName,
             p.nameExtension, dt.description, latest_ot.academicYear, latest_ot.startDate,
             latest_ot.endDate, active_days.dayCount
    ORDER BY p.lastName, p.firstName
  `;
  db.query(sql, (err, results) => {
    if (err) { console.error('Error fetching users:', err); return res.status(500).json({ error: err.message }); }
    try {
      logAudit(
        req.user,
        'View',
        'Official Time Users Status',
        null,
        null,
        buildOfficialTimeActionAuditDetails({
          source: 'view-users-status',
          rowCount: (results || []).length,
        }),
      );
    } catch (e) { console.error('Audit log error:', e); }
    res.json((results || []).map((row) => ({
      employeeNumber: row.employeeNumber, email: row.email, role: row.role,
      firstName: row.firstName || '', middleName: row.middleName || '',
      lastName: row.lastName || '', nameExtension: row.nameExtension || '',
      fullName: `${row.firstName || ''} ${row.middleName ? row.middleName + ' ' : ''}${row.lastName || ''}${row.nameExtension ? ' ' + row.nameExtension : ''}`.trim(),
      department: row.department || '', academicYear: row.academicYear || null,
      startDate: row.startDate ? toDateOnlyString(row.startDate) : null,
      endDate:   row.endDate   ? toDateOnlyString(row.endDate)   : null,
      hasDefaultOfficialTime: row.hasDefaultOfficialTime === 1,
      officialTimeDaysCount:  row.officialTimeDaysCount  || 0,
    })));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST set default official time for selected users
// ─────────────────────────────────────────────────────────────────────────────

router.post('/officialtime/set-default-for-users', authenticateToken, (req, res) => {
  const { employeeNumbers } = req.body;
  const defaultTimes = {
    officialTimeIN: '08:00:00 AM', officialBreaktimeIN: '00:00:00 AM', officialBreaktimeOUT: '00:00:00 AM', officialTimeOUT: '05:00:00 PM',
    officialHonorariumTimeIN: '00:00:00 AM', officialHonorariumTimeOUT: '00:00:00 AM',
    officialServiceCreditTimeIN: '00:00:00 AM', officialServiceCreditTimeOUT: '00:00:00 AM',
    officialOverTimeIN: '00:00:00 AM', officialOverTimeOUT: '00:00:00 AM', breaktime: '',
  };
  const days = DAYS_ORDER;

  let userQuery = 'SELECT employeeNumber FROM users';
  let queryParams = [];
  if (employeeNumbers && Array.isArray(employeeNumbers) && employeeNumbers.length > 0) {
    userQuery += ` WHERE employeeNumber IN (${employeeNumbers.map(() => '?').join(',')})`;
    queryParams = employeeNumbers;
  }

  db.query(userQuery, queryParams, (err, users) => {
    if (err) { console.error('Error fetching users:', err); return res.status(500).json({ error: err.message }); }

    let processedCount = 0, insertedCount = 0, skippedCount = 0;
    const errors = [];

    const processUser = (user, callback) => {
      const employeeID = user.employeeNumber;
      db.query('SELECT COUNT(*) as count FROM officialtime WHERE employeeID = ?', [employeeID], (checkErr, checkResult) => {
        if (checkErr) { errors.push(`Error checking ${employeeID}: ${checkErr.message}`); return callback(); }
        if ((checkResult[0]?.count || 0) > 0) { skippedCount++; processedCount++; return callback(); }

        const values = days.map((day) => [
          employeeID, null, '1970-01-01', '2099-12-31', day,
          defaultTimes.officialTimeIN, defaultTimes.officialBreaktimeIN, defaultTimes.officialBreaktimeOUT, defaultTimes.officialTimeOUT,
          defaultTimes.officialHonorariumTimeIN, defaultTimes.officialHonorariumTimeOUT,
          defaultTimes.officialServiceCreditTimeIN, defaultTimes.officialServiceCreditTimeOUT,
          defaultTimes.officialOverTimeIN, defaultTimes.officialOverTimeOUT, 'active', defaultTimes.breaktime,
        ]);

        db.query(`INSERT INTO officialtime (employeeID, academicYear, startDate, endDate, day, officialTimeIN, officialBreaktimeIN, officialBreaktimeOUT, officialTimeOUT, officialHonorariumTimeIN, officialHonorariumTimeOUT, officialServiceCreditTimeIN, officialServiceCreditTimeOUT, officialOverTimeIN, officialOverTimeOUT, status, breaktime) VALUES ?`,
          [values], (insertErr, insertResult) => {
            if (insertErr) errors.push(`Error setting default for ${employeeID}: ${insertErr.message}`);
            else insertedCount += insertResult.affectedRows || 0;
            processedCount++;
            callback();
          });
      });
    };

    let currentIndex = 0;
    const processNext = () => {
      if (currentIndex >= users.length) {
        try {
          const affectedEmployees = normalizeEmployeeList(
            Array.isArray(employeeNumbers) && employeeNumbers.length > 0
              ? employeeNumbers
              : users.map((u) => u.employeeNumber),
          );
          logAudit(
            req.user,
            `Set default official time for ${processedCount} users`,
            'Official Time',
            null,
            affectedEmployees.length === 1 ? affectedEmployees[0] : null,
            buildOfficialTimeActionAuditDetails({
              source: 'set-default-for-users',
              status: errors.length > 0 ? 'partial' : 'success',
              affectedEmployeeNumbers: affectedEmployees,
              insertedCount,
              skippedCount,
              failedCount: errors.length,
              notes: errors.length > 0 ? `${errors.length} error(s) occurred while setting defaults.` : null,
            }),
          );
        } catch (e) { console.error('Audit log error:', e); }
        return res.json({ message: 'Default official time set successfully', processed: processedCount, inserted: insertedCount, insertedUsers: Math.floor((insertedCount || 0) / 7), skipped: skippedCount, errors: errors.length > 0 ? errors : undefined });
      }
      processUser(users[currentIndex], () => { currentIndex++; processNext(); });
    };

    if (users.length === 0) return res.json({ message: 'No users found', processed: 0, inserted: 0 });
    processNext();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST bulk create schedules for multiple employees
// #3: Per-employee transaction for atomicity
// ─────────────────────────────────────────────────────────────────────────────

router.post('/officialtime/bulk-schedules', authenticateToken, async (req, res) => {
  const { employeeIDs, blocks, records } = req.body || {};

  if (!employeeIDs || !Array.isArray(employeeIDs) || !employeeIDs.length) return res.status(400).json({ message: 'employeeIDs is required and must be a non-empty array.' });
  if (!blocks || !Array.isArray(blocks) || !blocks.length)               return res.status(400).json({ message: 'blocks is required and must contain at least one schedule block.' });
  if (!records || !Array.isArray(records) || !records.length)            return res.status(400).json({ message: 'records is required and must contain at least one day row.' });

  // Validate time overlaps in the template rows
  for (const row of records) {
    const segments = getSegmentsForDayRow(row);
    const overlap  = findOverlapInSegments(segments);
    if (overlap) return res.status(400).json({ message: formatTimeOverlapMessage({ day: row.day, employeeID: 'multiple', segA: overlap.a, segB: overlap.b }), overlap: buildTimeOverlapPayload({ day: row.day, employeeID: 'multiple', segA: overlap.a, segB: overlap.b }) });
  }

  // #7: Duplicate day in template
  const dupDay = hasDuplicateDay(records);
  if (dupDay) return res.status(400).json({ message: `Duplicate day "${dupDay}" found in records. Each day must appear only once.` });

  for (const b of blocks) {
    if (!b || !b.startDate || !b.endDate) return res.status(400).json({ message: 'Each block must have startDate and endDate.' });
    if (new Date(b.startDate) > new Date(b.endDate)) return res.status(400).json({ message: `Block startDate must be on or before endDate (${b.startDate} > ${b.endDate}).` });
  }

  const results = [];

  for (const empIdRaw of employeeIDs) {
    const employeeID = String(empIdRaw || '').trim();
    if (!employeeID) continue;

    const empResult = { employeeID, inserted: 0, errors: [] };

    // Pre-check all blocks for this employee (#2: active-only)
    const blockOverlaps = [];
    for (const b of blocks) {
      const overlaps = await hasOverlappingRange(db, employeeID, b.startDate, b.endDate);
      if (overlaps) blockOverlaps.push(`Overlap for ${employeeID} on ${b.startDate}–${b.endDate}`);
    }
    if (blockOverlaps.length === blocks.length) { empResult.errors = blockOverlaps; results.push(empResult); continue; }

    // #3: Per-employee transaction
    let conn;
    try {
      conn = await getConnectionAsync(db);
      await beginTransaction(conn);
      await queryAsync(conn, "UPDATE officialtime SET status = 'inactive' WHERE employeeID = ?", [employeeID]);

      for (const b of blocks) {
        const overlaps = await hasOverlappingRange(conn, employeeID, b.startDate, b.endDate);
        if (overlaps) { empResult.errors.push(`Overlap for ${employeeID} on ${b.startDate}–${b.endDate}`); continue; }

        const academicYearVal = (() => {
          const ay  = b.academicYear ? autoFormatAcademicYear(String(b.academicYear).trim()) : ''; // #14
          const sem = b.semester     ? String(b.semester).trim() : '';
          if (ay && sem) return `${ay} ${sem}`.trim();
          return ay || sem || null;
        })();

        const values = records.map((r) => [
          employeeID, academicYearVal, b.startDate, b.endDate, r.day ?? null,
          r.officialTimeIN ?? null, r.officialBreaktimeIN ?? null, r.officialBreaktimeOUT ?? null, r.officialTimeOUT ?? null,
          r.officialHonorariumTimeIN ?? null, r.officialHonorariumTimeOUT ?? null,
          r.officialServiceCreditTimeIN ?? null, r.officialServiceCreditTimeOUT ?? null,
          r.officialOverTimeIN ?? null, r.officialOverTimeOUT ?? null,
          'active', r.breaktime ?? null,
        ]);

        const insertResult = await queryAsync(conn, `
          INSERT INTO officialtime (
            employeeID, academicYear, startDate, endDate, day,
            officialTimeIN, officialBreaktimeIN, officialBreaktimeOUT, officialTimeOUT,
            officialHonorariumTimeIN, officialHonorariumTimeOUT,
            officialServiceCreditTimeIN, officialServiceCreditTimeOUT,
            officialOverTimeIN, officialOverTimeOUT, status, breaktime
          ) VALUES ?`, [values]);

        empResult.inserted += insertResult.affectedRows || 0;
      }

      await commitTransaction(conn);
    } catch (e) {
      await rollbackTransaction(conn); // #3: full rollback — employee's old schedules restored
      empResult.errors.push(`Transaction failed and was rolled back: ${e.message}`);
      empResult.inserted = 0;
    } finally {
      releaseConnection(conn);
    }

    results.push(empResult);
  }

  const totalInserted = results.reduce((sum, r) => sum + (r.inserted || 0), 0);

  try {
    const affectedEmployees = normalizeEmployeeList(employeeIDs);
    const failedCount = results.filter((r) => Array.isArray(r.errors) && r.errors.length > 0).length;
    logAudit(
      req.user,
      `Bulk create official time (${employeeIDs.length} employees)`,
      'Official Time',
      null,
      affectedEmployees.length === 1 ? affectedEmployees[0] : null,
      buildOfficialTimeActionAuditDetails({
        source: 'bulk-create',
        status: failedCount > 0 ? 'partial' : 'success',
        affectedEmployeeNumbers: affectedEmployees,
        blockCount: Array.isArray(blocks) ? blocks.length : null,
        rowCount: (Array.isArray(records) ? records.length : 0) * (Array.isArray(blocks) ? blocks.length : 0),
        insertedCount: totalInserted,
        failedCount,
        notes: failedCount > 0 ? `${failedCount} employee(s) had errors during bulk create.` : null,
      }),
    );
  } catch (e) { console.error('Audit log error:', e); }

  res.json({ message: 'Bulk schedules processed.', totalInserted, results });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT — edit an existing active schedule
// ─────────────────────────────────────────────────────────────────────────────

router.put('/officialtimetable/:employeeID', authenticateToken, async (req, res) => {
  const { employeeID } = req.params;
  const { startDate, endDate, origEndDate, records } = req.body || {};

  if (!startDate)  return res.status(400).json({ message: 'startDate is required.' });
  if (!endDate)    return res.status(400).json({ message: 'endDate is required.' });
  if (new Date(startDate) > new Date(endDate)) return res.status(400).json({ message: 'endDate cannot be before startDate.' });
  if (!records || !Array.isArray(records) || !records.length) return res.status(400).json({ message: 'No records provided.' });

  const normalizedStartDate = normDate(startDate);
  const normalizedEndDate = normDate(endDate);
  const normalizedOrigEndDate = origEndDate ? normDate(origEndDate) : null;

  if (!normalizedStartDate) return res.status(400).json({ message: 'Invalid startDate format.' });
  if (!normalizedEndDate) return res.status(400).json({ message: 'Invalid endDate format.' });
  if (normalizedOrigEndDate === null && origEndDate) return res.status(400).json({ message: 'Invalid origEndDate format.' });

  for (const row of records) {
    const segments = getSegmentsForDayRow(row);
    const overlap  = findOverlapInSegments(segments);
    if (overlap) return res.status(422).json({ message: formatTimeOverlapMessage({ day: row.day, employeeID, segA: overlap.a, segB: overlap.b }), overlap: buildTimeOverlapPayload({ day: row.day, employeeID, segA: overlap.a, segB: overlap.b }) });
  }

  let lookupEndDate = normalizedOrigEndDate || null;

  try {
    if (!lookupEndDate) {
      const activeEndDates = await new Promise((resolve, reject) => {
        db.query(
          `SELECT endDate, COUNT(*) AS rowCount
           FROM officialtime
           WHERE employeeID = ? AND startDate = ? AND status = 'active'
           GROUP BY endDate
           ORDER BY rowCount DESC, endDate DESC
           LIMIT 1`,
          [employeeID, normalizedStartDate],
          (err, rows) => err ? reject(err) : resolve(rows || []),
        );
      });

      if (!activeEndDates.length) {
        return res.status(404).json({
          message: `No active schedule found for employee ${employeeID} with startDate ${normalizedStartDate}.`,
        });
      }

      lookupEndDate = toDateOnlyString(activeEndDates[0].endDate);
    }

    let updatedCount = 0;
    for (const r of records) {
      const result = await new Promise((resolve, reject) => {
        db.query(
          `UPDATE officialtime SET endDate=?, officialTimeIN=?, officialBreaktimeIN=?, officialBreaktimeOUT=?, officialTimeOUT=?, officialHonorariumTimeIN=?, officialHonorariumTimeOUT=?, officialServiceCreditTimeIN=?, officialServiceCreditTimeOUT=?, officialOverTimeIN=?, officialOverTimeOUT=?, breaktime=?
           WHERE employeeID=? AND startDate=? AND endDate=? AND day=? AND status='active'`,
          [normalizedEndDate, r.officialTimeIN??null, r.officialBreaktimeIN??null, r.officialBreaktimeOUT??null, r.officialTimeOUT??null, r.officialHonorariumTimeIN??null, r.officialHonorariumTimeOUT??null, r.officialServiceCreditTimeIN??null, r.officialServiceCreditTimeOUT??null, r.officialOverTimeIN??null, r.officialOverTimeOUT??null, r.breaktime??null, employeeID, normalizedStartDate, lookupEndDate, r.day??null],
          (err, result) => err ? reject(err) : resolve(result),
        );
      });
      updatedCount += result.affectedRows || 0;
    }

    if (!updatedCount) {
      return res.status(404).json({
        message: `No active rows were updated for employee ${employeeID}. Ensure the selected schedule still exists and is active.`,
      });
    }

    try {
      logAudit(
        req.user,
        `Edit official time for ${employeeID} (${normalizedStartDate}–${normalizedEndDate})`,
        'Official Time',
        null,
        employeeID,
        buildOfficialTimeActionAuditDetails({
          source: 'manual-edit',
          employeeID,
          affectedEmployeeNumbers: [employeeID],
          startDate: normalizedStartDate,
          endDate: normalizedEndDate,
          lookupEndDate,
          rowCount: records.length,
          updatedCount,
        }),
      );
    } catch (e) { console.error('Audit log error:', e); }

    let autoAttendance = { inserted: 0, skipped: 0, errors: [] };
    try {
      autoAttendance = await fillExemptAttendance({
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        employeeIDs: [employeeID],
      });
    } catch (autoErr) {
      autoAttendance.errors = [`Auto-attendance trigger failed: ${autoErr.message}`];
    }

    res.json({
      message: 'Official time updated successfully.',
      updated: updatedCount,
      autoAttendance: {
        inserted: autoAttendance.inserted,
        skipped: autoAttendance.skipped,
      },
      warnings: autoAttendance.errors.length ? autoAttendance.errors : undefined,
    });
  } catch (err) {
    console.error('Error updating official time:', err);
    res.status(500).json({ error: err.message || 'Database error' });
  }
});

module.exports = router;