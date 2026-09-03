const db = require('../db');
const { notifyAttendanceChanged } = require('./socketService');

const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_BATCH_LIMIT = 100;
const MAX_BATCH_LIMIT = 500;

let pollTimer = null;
let isPolling = false;
let lastSeenAttendanceDateTime = null;

function queryAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function normalizeLimit(value, fallback = DEFAULT_BATCH_LIMIT) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, MAX_BATCH_LIMIT);
}

function toManilaDate(timestamp) {
  if (!timestamp) return null;
  return new Date(Number(timestamp)).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Manila',
  });
}

async function getLatestAttendanceRecordInfo(limit = DEFAULT_BATCH_LIMIT) {
  const safeLimit = normalizeLimit(limit);
  return queryAsync(
    `
      SELECT
        PersonID,
        PersonName,
        AttendanceDateTime,
        AttendanceState
      FROM AttendanceRecordInfo
      ORDER BY AttendanceDateTime DESC
      LIMIT ?
    `,
    [safeLimit],
  );
}

async function getCurrentMaxAttendanceDateTime() {
  const rows = await queryAsync(
    `SELECT MAX(AttendanceDateTime) AS maxAttendanceDateTime FROM AttendanceRecordInfo`,
  );
  const maxValue = rows[0]?.maxAttendanceDateTime;
  return maxValue == null ? null : Number(maxValue);
}

function emitRawAttendanceInserted(io, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;

  const personIDs = [...new Set(rows.map((row) => String(row.PersonID)))];
  const dates = [
    ...new Set(
      rows
        .map((row) => toManilaDate(row.AttendanceDateTime))
        .filter(Boolean),
    ),
  ];
  const latestAttendanceDateTime = Math.max(
    ...rows.map((row) => Number(row.AttendanceDateTime) || 0),
  );

  const payload = {
    action: 'inserted',
    scope: 'attendancerecordinfo',
    records: rows,
    count: rows.length,
    personIDs,
    dates,
    latestAttendanceDateTime,
    timestamp: new Date().toISOString(),
  };

  io.to('role:staff').emit('attendanceRecordInfoInserted', payload);
  io.to('role:administrator').emit('attendanceRecordInfoInserted', payload);
  io.to('role:superadmin').emit('attendanceRecordInfoInserted', payload);
  io.to('role:technical').emit('attendanceRecordInfoInserted', payload);

  notifyAttendanceChanged('device-record-inserted', {
    scope: 'attendancerecordinfo',
    personIDs,
    dates,
    count: rows.length,
    latestAttendanceDateTime,
  });
}

async function pollAttendanceRecordInfo(io, batchLimit) {
  if (isPolling) return;
  isPolling = true;

  try {
    if (lastSeenAttendanceDateTime == null) {
      lastSeenAttendanceDateTime = await getCurrentMaxAttendanceDateTime();
      return;
    }

    const rows = await queryAsync(
      `
        SELECT
          PersonID,
          PersonName,
          AttendanceDateTime,
          AttendanceState
        FROM AttendanceRecordInfo
        WHERE AttendanceDateTime > ?
        ORDER BY AttendanceDateTime ASC
        LIMIT ?
      `,
      [lastSeenAttendanceDateTime, batchLimit],
    );

    if (rows.length === 0) return;

    lastSeenAttendanceDateTime = Math.max(
      lastSeenAttendanceDateTime,
      ...rows.map((row) => Number(row.AttendanceDateTime) || 0),
    );
    emitRawAttendanceInserted(io, rows);
  } catch (error) {
    console.error('AttendanceRecordInfo socket poll failed:', error.message);
  } finally {
    isPolling = false;
  }
}

function registerAttendanceRecordInfoSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('attendanceRecordInfo:getLatest', async (options = {}, callback) => {
      try {
        const rows = await getLatestAttendanceRecordInfo(options?.limit);
        const payload = {
          records: rows,
          count: rows.length,
          timestamp: new Date().toISOString(),
        };

        if (typeof callback === 'function') callback({ ok: true, ...payload });
        else socket.emit('attendanceRecordInfo:latest', payload);
      } catch (error) {
        const response = { ok: false, error: error.message };
        if (typeof callback === 'function') callback(response);
        else socket.emit('attendanceRecordInfo:error', response);
      }
    });
  });
}

function startAttendanceRecordInfoSocketApi(io, options = {}) {
  if (pollTimer) return;

  const pollIntervalMs = Math.max(
    500,
    Number.parseInt(
      options.pollIntervalMs || process.env.ATTENDANCE_RECORD_INFO_POLL_MS,
      10,
    ) || DEFAULT_POLL_INTERVAL_MS,
  );
  const batchLimit = normalizeLimit(
    options.batchLimit || process.env.ATTENDANCE_RECORD_INFO_BATCH_LIMIT,
  );

  registerAttendanceRecordInfoSocketHandlers(io);
  pollTimer = setInterval(
    () => pollAttendanceRecordInfo(io, batchLimit),
    pollIntervalMs,
  );
  pollAttendanceRecordInfo(io, batchLimit);

  console.log(
    `AttendanceRecordInfo socket API watching every ${pollIntervalMs}ms`,
  );
}

function stopAttendanceRecordInfoSocketApi() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  isPolling = false;
}

module.exports = {
  startAttendanceRecordInfoSocketApi,
  stopAttendanceRecordInfoSocketApi,
  getLatestAttendanceRecordInfo,
};
