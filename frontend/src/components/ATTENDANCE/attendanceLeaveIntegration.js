import axios from 'axios';
import { calendarAppliesToBranch, normalizeBranchCode } from '../../constants/branches';

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
 * Fetch users.branch for an employee (0=Manila, 1=Cavite, null=unset).
 */
export async function fetchEmployeeBranch({
  apiBaseUrl,
  getAuthHeaders,
  employeeNumber,
}) {
  const key = String(employeeNumber ?? '').trim();
  if (!key) return null;
  try {
    const res = await axios.get(
      `${apiBaseUrl}/users/${encodeURIComponent(key)}`,
      { ...getAuthHeaders() },
    );
    const b = res.data?.user?.branch;
    if (b === null || b === undefined || b === '') return null;
    const n = Number(b);
    return n === 0 || n === 1 ? n : null;
  } catch {
    return null;
  }
}

/**
 * Normalize holidayByDate entry (single object or array from API).
 */
export function holidaysOnDate(holidayByDate, date) {
  const d = String(date ?? '').trim().slice(0, 10);
  if (!d || !holidayByDate) return [];
  const entry = holidayByDate[d];
  if (!entry) return [];
  return Array.isArray(entry) ? entry.filter(Boolean) : [entry];
}

/**
 * Normalize suspensionByDate entry (single object or array from API).
 */
export function suspensionsOnDate(suspensionByDate, date) {
  const d = String(date ?? '').trim().slice(0, 10);
  if (!d || !suspensionByDate) return [];
  const entry = suspensionByDate[d];
  if (!entry) return [];
  return Array.isArray(entry) ? entry.filter(Boolean) : [entry];
}

function preferScopedThenNewer(a, b, employeeBranch) {
  const aBranch = normalizeBranchCode(a.branch);
  const bBranch = normalizeBranchCode(b.branch);
  const empB = normalizeBranchCode(employeeBranch);
  const aExactBranch = empB !== null && aBranch === empB ? 1 : 0;
  const bExactBranch = empB !== null && bBranch === empB ? 1 : 0;
  if (bExactBranch !== aExactBranch) return bExactBranch - aExactBranch;
  const aAllBranch = aBranch === null ? 1 : 0;
  const bAllBranch = bBranch === null ? 1 : 0;
  if (aAllBranch !== bAllBranch) return aAllBranch - bAllBranch;
  const aAll = (a.personnel_scope || 'all') === 'all' ? 1 : 0;
  const bAll = (b.personnel_scope || 'all') === 'all' ? 1 : 0;
  if (aAll !== bAll) return aAll - bAll;
  return (Number(b.id) || 0) - (Number(a.id) || 0);
}

/**
 * Pick the best holiday for a date for this employee branch.
 * Prefers branch-specific over all-campus, then higher id.
 */
export function pickApplicableHoliday(holidayByDate, date, employeeBranch) {
  const list = holidaysOnDate(holidayByDate, date).filter((h) =>
    calendarAppliesToBranch(h, employeeBranch),
  );
  if (!list.length) return null;
  list.sort((a, b) => preferScopedThenNewer(a, b, employeeBranch));
  return list[0];
}

/**
 * Pick the best suspension for a date. Optional appliesFn filters by personnel_scope.
 * Prefers branch-specific, then exact personnel scope over "all", then higher id.
 */
export function pickApplicableSuspension(
  suspensionByDate,
  date,
  appliesFn,
  employeeBranch,
) {
  const list = suspensionsOnDate(suspensionByDate, date).filter((s) =>
    calendarAppliesToBranch(s, employeeBranch),
  );
  const matches =
    typeof appliesFn === 'function' ? list.filter(appliesFn) : list.slice();
  if (!matches.length) return null;
  matches.sort((a, b) => preferScopedThenNewer(a, b, employeeBranch));
  return matches[0];
}

/**
 * @param {string} date - YYYY-MM-DD
 * @param {{ suspensionByDate?: object, holidayByDate?: object, leaveByDate?: object, employeeBranch?: number|null }} maps
 */
export function getLeaveStatusLabelForDate(date, maps) {
  const {
    suspensionByDate = {},
    holidayByDate = {},
    leaveByDate = {},
    employeeBranch,
  } = maps || {};
  const susp = pickApplicableSuspension(
    suspensionByDate,
    date,
    null,
    employeeBranch,
  );
  if (susp) {
    // Whole-day and partial both show this badge. Partial days keep
    // punches/hours (not furlough) via isExcludedAttendanceCalendarDate.
    return 'WORK SUSPENDED';
  }
  if (pickApplicableHoliday(holidayByDate, date, employeeBranch)) {
    return 'HOLIDAY';
  }
  if (leaveByDate[date]) {
    const leave = leaveByDate[date];
    return (
      String(leave.title || leave.leave_description || leave.label || 'ON LEAVE').trim() ||
      'ON LEAVE'
    );
  }
  return '';
}

/** True when a status chip should use the suspended (red) style. */
export function isSuspendedStatusLabel(label) {
  if (!label) return false;
  const s = String(label);
  return s === 'WORK SUSPENDED' || s.startsWith('SUSP FROM ');
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
