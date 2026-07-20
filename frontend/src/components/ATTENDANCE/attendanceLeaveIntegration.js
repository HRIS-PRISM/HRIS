import axios from 'axios';

/**
 * Device pre-check without writing device punches into attendancerecord
 * (same behavior for Non-Teaching / Designated / 30hrs modules).
 */
export async function postAttendanceDevicePreflightNoSync({
  apiBaseUrl,
  getAuthHeaders,
  personID,
  startDate,
  endDate,
}) {
  const deviceCheck = await axios.post(
    `${apiBaseUrl}/attendance/api/all-attendance`,
    {
      personID,
      startDate,
      endDate,
      syncDeviceToRecords: false,
    },
    getAuthHeaders(),
  );
  const payload = deviceCheck.data;
  return Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.records)
      ? payload.records
      : [];
}

/** Suspensions, HR-approved leaves, and holidays keyed by YYYY-MM-DD */
export async function fetchAttendanceCalendarMaps({
  apiBaseUrl,
  getAuthHeaders,
  startDate,
  endDate,
  /** Employee number / person id — required so leave overlay matches the viewed employee */
  personId,
}) {
  const personKey = String(personId ?? '').trim();
  const [suspRes, leaveRes, holidayRes] = await Promise.all([
    axios.get(`${apiBaseUrl}/attendance/api/suspensions`, {
      params: { startDate, endDate },
      ...getAuthHeaders(),
    }),
    axios.get(`${apiBaseUrl}/attendance/api/leaves`, {
      params: { startDate, endDate, ...(personKey ? { personId: personKey } : {}) },
      ...getAuthHeaders(),
    }),
    axios.get(`${apiBaseUrl}/attendance/api/holiday`, {
      params: { startDate, endDate },
      ...getAuthHeaders(),
    }),
  ]);
  return {
    suspensionByDate: suspRes.data?.byDate || {},
    leaveByDate: leaveRes.data?.byDate || {},
    holidayByDate: holidayRes.data?.byDate || {},
  };
}

/**
 * @param {string} date - YYYY-MM-DD
 * @param {{ suspensionByDate?: object, holidayByDate?: object, leaveByDate?: object }} maps
 */
export function getLeaveStatusLabelForDate(date, maps) {
  const {
    suspensionByDate = {},
    holidayByDate = {},
    leaveByDate = {},
  } = maps || {};
  if (suspensionByDate[date]) return 'WORK SUSPENDED';
  if (holidayByDate[date]) return 'HOLIDAY';
  if (leaveByDate[date]) return 'ON LEAVE';
  return '';
}

const FILED_LEAVE_STATUS_LABEL = {
  0: 'Pending',
  1: 'Supervisor approved',
  2: 'HR approved',
};

/** Map leave_request rows in [startDate, endDate] with status 0–2 → by YYYY-MM-DD. */
export function buildFiledLeaveByDate(requests, startDate, endDate) {
  const start = String(startDate || '').slice(0, 10);
  const end = String(endDate || '').slice(0, 10);
  const byDate = {};
  (Array.isArray(requests) ? requests : []).forEach((lr) => {
    const d = String(lr?.leave_date ?? '').trim().slice(0, 10);
    if (!d || (start && d < start) || (end && d > end)) return;
    const st = Number(lr.status);
    if (![0, 1, 2].includes(st)) return;
    byDate[d] = {
      id: lr.id,
      leave_code: lr.leave_code,
      leave_description: lr.leave_description || lr.leave_code,
      status: st,
      statusLabel: FILED_LEAVE_STATUS_LABEL[st] || 'Leave',
    };
  });
  return byDate;
}
