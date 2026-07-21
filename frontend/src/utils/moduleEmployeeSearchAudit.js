import axios from 'axios';
import API_BASE_URL from '../apiConfig';

/** Stored as table_name; AuditLogs formats to ATTENDANCE_MODULE_(…). */
export const ATTENDANCE_AUDIT_MODULES = {
  NON_TEACHING: 'Attendance Module (Non-Teaching)',
  FACULTY_DESIGNATED: 'Attendance Module (Faculty Designated)',
  FACULTY_30HRS: 'Attendance Module (Faculty 30 hrs)',
  MODIFICATION: 'Attendance Modification',
  STATE: 'Attendance State',
  DTR_OVERALL: 'Daily Time Record (Overall)',
  OFFICIAL_TIME: 'Official Time',
};

const HALF_DAY_COMPUTATION_LABELS = {
  NON_TEACHING: 'Non-Teaching',
  DESIGNATED_40HRS: 'Faculty Designated',
  FACULTY_30HRS: 'Faculty 30hrs',
};

export function buildAuditPeriodLabel({
  selectedMonth,
  monthNames,
  selectedYear,
  startDate,
  endDate,
}) {
  if (
    selectedMonth != null &&
    Array.isArray(monthNames) &&
    monthNames[selectedMonth]
  ) {
    return `${monthNames[selectedMonth]} ${selectedYear ?? ''}`.trim();
  }
  if (startDate && endDate) return `${startDate} – ${endDate}`;
  return null;
}

export function employeeDisplayName(emp) {
  if (!emp) return '';
  const full = String(emp.fullName || '').trim();
  if (full) return full;
  return `${emp.firstName || ''} ${emp.lastName || ''}`.replace(/\s+/g, ' ').trim();
}

/**
 * Log employee picker selection in a specific HRIS module (not on every keystroke).
 */
export function logModuleEmployeeSearch({
  module,
  action = 'Select employee',
  targetEmployeeNumber,
  targetName,
  searchQuery,
  periodLabel,
}) {
  if (!module || !targetEmployeeNumber) return;

  const token = localStorage.getItem('token');
  if (!token) return;

  axios
    .post(
      `${API_BASE_URL}/users/module-employee-search-audit`,
      {
        module,
        action,
        targetEmployeeNumber: String(targetEmployeeNumber),
        targetName: targetName || null,
        searchQuery: searchQuery || null,
        periodLabel: periodLabel || null,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    )
    .catch(() => {});
}

/** One audit when attendance module Search Records finishes (tardiness / month grid). */
export function logAttendanceModuleAction({
  module,
  auditButton,
  targetEmployeeNumber,
  targetEmployeeName,
  periodStart,
  periodEnd,
  monthLabel,
  searchQuery,
  daysCalculated,
  totalLate,
  halfDayDate,
  halfDayStatus,
  computationModuleType,
  renderedTotal,
  tardinessTotal,
  halfDayNote,
  deductionSource,
  targetUsername,
  auditEvent,
  recordsCount,
  rowsChanged,
  changesSummary,
  saveRemarks,
  viewType,
}) {
  if (!module || !auditButton || !targetEmployeeNumber) return;

  const token = localStorage.getItem('token');
  if (!token) return;

  axios
    .post(
      `${API_BASE_URL}/attendance/api/module-search-audit`,
      {
        module,
        auditButton,
        targetEmployeeNumber: String(targetEmployeeNumber),
        targetEmployeeName: targetEmployeeName || null,
        targetUsername: targetUsername || null,
        periodStart: periodStart || null,
        periodEnd: periodEnd || null,
        monthLabel: monthLabel || null,
        searchQuery: searchQuery || null,
        daysCalculated: daysCalculated ?? null,
        totalLate: totalLate ?? null,
        halfDayDate: halfDayDate || null,
        halfDayStatus: halfDayStatus || null,
        computationModuleType: computationModuleType || null,
        renderedTotal: renderedTotal || null,
        tardinessTotal: tardinessTotal || null,
        halfDayNote: halfDayNote || null,
        deductionSource: deductionSource || null,
        auditEvent: auditEvent || null,
        recordsCount: recordsCount ?? null,
        rowsChanged: rowsChanged ?? null,
        changesSummary: changesSummary || null,
        saveRemarks: saveRemarks || null,
        viewType: viewType || null,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    )
    .catch(() => {});
}

/** Audit half-day approve/reject with module and computation type. */
export function logAttendanceHalfDayReview({
  module,
  entry,
  computationModuleType,
  targetEmployeeNumber,
  targetUsername,
  periodStart,
  periodEnd,
}) {
  if (!module || !entry || !targetEmployeeNumber || !computationModuleType) return;

  const status = String(entry.status || '').toLowerCase();
  const auditButton =
    status === 'approved'
      ? 'approved Half Day'
      : status === 'rejected'
        ? 'rejected Half Day'
        : null;
  if (!auditButton) return;

  const isApproved = status === 'approved';
  const tardiness = isApproved
    ? null
    : entry.hrTardinessTotal ?? entry.hrTardinessRegular ?? null;
  const deductionSource =
    entry.deductionSource ||
    (isApproved ? 'earnings' : status === 'rejected' ? 'attendance' : null);

  const username = String(targetUsername || '').trim();

  logAttendanceModuleAction({
    module,
    auditButton,
    targetEmployeeNumber,
    targetEmployeeName: username || null,
    targetUsername: username || null,
    periodStart,
    periodEnd,
    auditEvent: 'half_day_review',
    halfDayDate: entry.date ? String(entry.date).slice(0, 10) : null,
    halfDayStatus: status || null,
    computationModuleType,
    renderedTotal: entry.renderedTotal ?? null,
    tardinessTotal: tardiness,
    halfDayNote: entry.note?.trim() || null,
    deductionSource,
  });
}

export function halfDayComputationLabel(computationModuleType) {
  return (
    HALF_DAY_COMPUTATION_LABELS[computationModuleType] ||
    computationModuleType ||
    ''
  );
}

/** After employee + period load in Attendance Modification. */
export function logAttendanceModificationView({
  targetEmployeeNumber,
  targetUsername,
  periodStart,
  periodEnd,
  monthLabel,
  recordsCount,
  viewType = 'records',
}) {
  logAttendanceModuleAction({
    module: ATTENDANCE_AUDIT_MODULES.MODIFICATION,
    auditButton: viewType === 'full_month' ? 'Loaded full month' : 'Loaded records',
    targetEmployeeNumber,
    targetUsername: targetUsername || null,
    targetEmployeeName: targetUsername || null,
    periodStart,
    periodEnd,
    monthLabel,
    auditEvent: 'modification_view',
    recordsCount: recordsCount ?? 0,
    viewType,
  });
}

/** After saving attendance edits in Attendance Modification. */
export function logAttendanceModificationSave({
  targetEmployeeNumber,
  targetUsername,
  periodStart,
  periodEnd,
  monthLabel,
  rowsChanged,
  changesSummary,
  saveRemarks,
  viewType = 'records',
}) {
  logAttendanceModuleAction({
    module: ATTENDANCE_AUDIT_MODULES.MODIFICATION,
    auditButton: 'Saved changes',
    targetEmployeeNumber,
    targetUsername: targetUsername || null,
    targetEmployeeName: targetUsername || null,
    periodStart,
    periodEnd,
    monthLabel,
    auditEvent: 'modification_save',
    rowsChanged: rowsChanged ?? 0,
    changesSummary: changesSummary || null,
    saveRemarks: saveRemarks || null,
    viewType,
  });
}

/** After Fetch Records in Attendance State (employee + month). */
export function logAttendanceStateView({
  targetEmployeeNumber,
  targetUsername,
  periodStart,
  periodEnd,
  monthLabel,
  recordsCount,
}) {
  logAttendanceModuleAction({
    module: ATTENDANCE_AUDIT_MODULES.STATE,
    auditButton: 'Fetched records',
    targetEmployeeNumber,
    targetUsername: targetUsername || null,
    targetEmployeeName: targetUsername || null,
    periodStart,
    periodEnd,
    monthLabel,
    auditEvent: 'state_view',
    recordsCount: recordsCount ?? 0,
  });
}

/** After admin corrects a raw punch status in Attendance State. */
export function logAttendanceStateChange({
  targetEmployeeNumber,
  targetUsername,
  periodStart,
  periodEnd,
  monthLabel,
  punchDate,
  punchTime,
  previousState,
  newState,
}) {
  const prev = previousState ?? '?';
  const next = newState ?? '?';
  logAttendanceModuleAction({
    module: ATTENDANCE_AUDIT_MODULES.STATE,
    auditButton: 'Updated punch status',
    targetEmployeeNumber,
    targetUsername: targetUsername || null,
    targetEmployeeName: targetUsername || null,
    periodStart,
    periodEnd,
    monthLabel,
    auditEvent: 'state_status_change',
    changesSummary: `${punchDate || ''} ${punchTime || ''}: state ${prev} → ${next}`.trim(),
  });
}

/** After Search in Daily Time Record (Overall) — single employee. */
export function logDtrOverallSearch({
  targetEmployeeNumber,
  targetUsername,
  periodStart,
  periodEnd,
  monthLabel,
  recordsCount,
}) {
  logAttendanceModuleAction({
    module: ATTENDANCE_AUDIT_MODULES.DTR_OVERALL,
    auditButton: 'Search',
    targetEmployeeNumber,
    targetUsername: targetUsername || null,
    targetEmployeeName: targetUsername || null,
    periodStart,
    periodEnd,
    monthLabel,
    auditEvent: 'dtr_overall_search',
    recordsCount: recordsCount ?? 0,
  });
}

/** Official Time — employee search completed (schedule loaded). */
export function logOfficialTimeSearch({
  targetEmployeeNumber,
  targetName,
  scheduleCount,
  hadExisting,
}) {
  logAttendanceModuleAction({
    module: ATTENDANCE_AUDIT_MODULES.OFFICIAL_TIME,
    auditButton: 'Searched employee',
    targetEmployeeNumber,
    targetUsername: targetName || null,
    targetEmployeeName: targetName || null,
    auditEvent: 'official_time_search',
    recordsCount: scheduleCount ?? 0,
    changesSummary: hadExisting
      ? `${scheduleCount ?? 0} schedule(s) found`
      : 'No saved schedule',
  });
}

/** Official Time — new schedule saved. */
export function logOfficialTimeAdd({
  targetEmployeeNumber,
  targetName,
  periodStart,
  periodEnd,
  academicYear,
}) {
  logAttendanceModuleAction({
    module: ATTENDANCE_AUDIT_MODULES.OFFICIAL_TIME,
    auditButton: 'Added schedule',
    targetEmployeeNumber,
    targetUsername: targetName || null,
    targetEmployeeName: targetName || null,
    periodStart,
    periodEnd,
    monthLabel: academicYear || null,
    auditEvent: 'official_time_add',
    rowsChanged: 7,
    changesSummary: periodStart && periodEnd ? `${periodStart} to ${periodEnd}` : null,
  });
}

/** Official Time — existing schedule updated. */
export function logOfficialTimeEdit({
  targetEmployeeNumber,
  targetName,
  periodStart,
  periodEnd,
}) {
  logAttendanceModuleAction({
    module: ATTENDANCE_AUDIT_MODULES.OFFICIAL_TIME,
    auditButton: 'Edited schedule',
    targetEmployeeNumber,
    targetUsername: targetName || null,
    targetEmployeeName: targetName || null,
    periodStart,
    periodEnd,
    auditEvent: 'official_time_edit',
    rowsChanged: 7,
    changesSummary: periodStart && periodEnd ? `${periodStart} to ${periodEnd}` : null,
  });
}
