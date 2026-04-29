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
  return Array.isArray(deviceCheck.data) ? deviceCheck.data : [];
}

/** Suspensions, HR-approved leaves, and holidays keyed by YYYY-MM-DD */
export async function fetchAttendanceCalendarMaps({
  apiBaseUrl,
  getAuthHeaders,
  startDate,
  endDate,
}) {
  const [suspRes, leaveRes, holidayRes] = await Promise.all([
    axios.get(`${apiBaseUrl}/attendance/api/suspensions`, {
      params: { startDate, endDate },
      ...getAuthHeaders(),
    }),
    axios.get(`${apiBaseUrl}/attendance/api/leaves`, {
      params: { startDate, endDate },
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
