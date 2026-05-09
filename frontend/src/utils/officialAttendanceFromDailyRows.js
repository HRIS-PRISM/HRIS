/**
 * Single source of truth for official-time-aware attendance metrics
 * (matches Overall Attendance / AttendanceSummary.jsx logic).
 */

export function parseOfficialTimeToSeconds(timeStr) {
  if (!timeStr) return null;
  const trimmed = String(timeStr).trim();
  if (!trimmed) return null;
  const m = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i);
  if (!m) return null;
  let hh = Number(m[1]);
  const mm = Number(m[2]);
  const ss = Number(m[3] ?? 0);
  const mer = (m[4] || "").toUpperCase();
  if ([hh, mm, ss].some(Number.isNaN)) return null;
  if (mer) {
    if (hh === 12) hh = 0;
    if (mer === "PM") hh += 12;
  }
  return hh * 3600 + mm * 60 + ss;
}

export function formatOfficialAttendanceSeconds(secs) {
  const safe = Math.max(0, Number(secs) || 0);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return [h, m, s].map((x) => String(x).padStart(2, "0")).join(":");
}

function empty(v) {
  if (v == null) return true;
  const s = String(v).trim();
  if (!s) return true;
  // Some endpoints use placeholder glyphs/strings for "no punch".
  // Treat these as empty so half-day/absent bucketing matches what users see.
  const normalized = s.replace(/\s+/g, " ").toLowerCase();
  return (
    normalized === "—" ||
    normalized === "-" ||
    normalized === "--" ||
    normalized === "n/a" ||
    normalized === "na" ||
    normalized === "null" ||
    normalized === "undefined"
  );
}

export function isScheduledByOfficialTime(row) {
  const offIn = row?.officialTimeIN;
  const offOut = row?.officialTimeOUT;
  return (
    !empty(offIn) &&
    !empty(offOut) &&
    String(offIn).trim() !== "00:00:00 AM" &&
    String(offOut).trim() !== "00:00:00 PM"
  );
}

export function hasNoPunches(row) {
  const ti = row?.timeIN;
  const bi = row?.breaktimeIN;
  const bo = row?.breaktimeOUT;
  const to = row?.timeOUT;
  return empty(ti) && empty(bi) && empty(bo) && empty(to);
}

export function hasMorningPunch(row) {
  return !empty(row?.timeIN) || !empty(row?.breaktimeIN);
}

export function hasAfternoonPunch(row) {
  return !empty(row?.breaktimeOUT) || !empty(row?.timeOUT);
}

/** Official scheduled work seconds (day span minus official break), or null if not parseable. */
export function getOfficialSchedWorkSec(row) {
  const offInSec = parseOfficialTimeToSeconds(row?.officialTimeIN);
  const offOutSec = parseOfficialTimeToSeconds(row?.officialTimeOUT);
  if (offInSec == null || offOutSec == null) return null;
  const schedTotal = Math.max(0, offOutSec - offInSec);
  const offBreakInSec = parseOfficialTimeToSeconds(row?.officialBreaktimeIN);
  const offBreakOutSec = parseOfficialTimeToSeconds(row?.officialBreaktimeOUT);
  const breakSec =
    offBreakInSec != null && offBreakOutSec != null
      ? Math.max(0, offBreakOutSec - offBreakInSec)
      : 0;
  return Math.max(0, schedTotal - breakSec);
}

/**
 * @param {string} dateStr
 * @param {{ suspensionByDate?: Record<string, unknown>, holidayByDate?: Record<string, unknown>, leaveByDate?: Record<string, unknown> }} [calendarMaps] - from `fetchAttendanceCalendarMaps`
 */
export function isExcludedAttendanceCalendarDate(dateStr, calendarMaps) {
  if (!calendarMaps || typeof calendarMaps !== "object") return false;
  const d = String(dateStr ?? "").trim().slice(0, 10);
  if (!d || d.length < 8) return false;
  const s = calendarMaps.suspensionByDate;
  const h = calendarMaps.holidayByDate;
  const l = calendarMaps.leaveByDate;
  return !!(s?.[d] || h?.[d] || l?.[d]);
}

/** Dates where daily row is treated as a half-day (same rules as metrics). */
export function listHalfDayDatesFromDailyRows(rows, calendarMaps) {
  const dates = [];
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const d = String(row?.date ?? "").trim().slice(0, 10);
    if (calendarMaps && isExcludedAttendanceCalendarDate(d, calendarMaps)) return;
    if (!isScheduledByOfficialTime(row)) return;
    if (getOfficialSchedWorkSec(row) == null) return;
    if (hasNoPunches(row)) return;
    const hasMorning = hasMorningPunch(row);
    const hasAfternoon = hasAfternoonPunch(row);
    if (hasMorning === hasAfternoon) return;
    if (d && d.length >= 8) dates.push(d);
  });
  return [...new Set(dates)].sort();
}

/** Dates counted as full absent (no punches, has official schedule) — same rules as `computeOfficialAwareAbsenceAndLate`. */
export function listAbsentDatesFromDailyRows(rows, calendarMaps) {
  const dates = [];
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const d = String(row?.date ?? "").trim().slice(0, 10);
    if (calendarMaps && isExcludedAttendanceCalendarDate(d, calendarMaps)) return;
    if (!isScheduledByOfficialTime(row)) return;
    if (getOfficialSchedWorkSec(row) == null) return;
    if (!hasNoPunches(row)) return;
    if (d && d.length >= 8) dates.push(d);
  });
  return [...new Set(dates)].sort();
}

/**
 * Absent / half-day / full-day late are **mutually exclusive** buckets of the same
 * quantity: official scheduled work minus time rendered from punches (per row).
 * Their formatted durations sum to `overallShortfallTime` (payroll / earnings shortfall).
 *
 * @returns {{
 *   absentDays: number,
 *   halfDays: number,
 *   absentSecTotal: number,
 *   halfDayShortfallSecTotal: number,
 *   lateShortfallSecTotal: number,
 *   overallShortfallSecTotal: number,
 *   absentTime: string,
 *   halfDayShortfallTime: string,
 *   lateShortfallTime: string,
 *   overallShortfallTime: string,
 *   halfDayTotal: string,
 *   lateDeficit: string,
 *   lateDeficitSecTotal: number,
 *   renderedSecTotal: number,
 * }}
 * @param {{ suspensionByDate?: Record<string, unknown>, holidayByDate?: Record<string, unknown>, leaveByDate?: Record<string, unknown> }} [calendarMaps] - when set, dates with suspension / holiday / approved leave are excluded from all buckets (same APIs as faculty attendance modules).
 */
export function computeOfficialAwareAbsenceAndLate(rows, calendarMaps) {
  let absentDays = 0;
  let halfDays = 0;
  let absentSecTotal = 0;
  let halfDayShortfallSecTotal = 0;
  let lateShortfallSecTotal = 0;
  let renderedSecTotal = 0;

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const d = String(row?.date ?? "").trim().slice(0, 10);
    if (calendarMaps && isExcludedAttendanceCalendarDate(d, calendarMaps)) return;

    if (!isScheduledByOfficialTime(row)) return;

    const schedWorkSec = getOfficialSchedWorkSec(row);
    if (schedWorkSec == null) return;

    if (hasNoPunches(row)) {
      absentDays += 1;
      absentSecTotal += schedWorkSec;
      return;
    }

    const morning = hasMorningPunch(row);
    const afternoon = hasAfternoonPunch(row);
    if (morning !== afternoon) halfDays += 1;

    const inSec = parseOfficialTimeToSeconds(row?.timeIN);
    const outSec = parseOfficialTimeToSeconds(row?.timeOUT);
    const breakInSec = parseOfficialTimeToSeconds(row?.breaktimeIN);
    const breakOutSec = parseOfficialTimeToSeconds(row?.breaktimeOUT);

    let renderedSec = 0;
    if (inSec != null && outSec != null) {
      if (breakInSec != null && breakOutSec != null && breakOutSec >= breakInSec) {
        renderedSec = Math.max(0, breakInSec - inSec) + Math.max(0, outSec - breakOutSec);
      } else {
        renderedSec = Math.max(0, outSec - inSec);
      }
    } else if (morning !== afternoon) {
      renderedSec = Math.floor(schedWorkSec / 2);
    }

    renderedSecTotal += renderedSec;
    const deficit = Math.max(0, schedWorkSec - renderedSec);
    if (morning !== afternoon) halfDayShortfallSecTotal += deficit;
    else lateShortfallSecTotal += deficit;
  });

  const overallShortfallSecTotal =
    absentSecTotal + halfDayShortfallSecTotal + lateShortfallSecTotal;

  return {
    absentDays,
    halfDays,
    absentSecTotal,
    halfDayShortfallSecTotal,
    lateShortfallSecTotal,
    overallShortfallSecTotal,
    absentTime: formatOfficialAttendanceSeconds(absentSecTotal),
    halfDayShortfallTime: formatOfficialAttendanceSeconds(halfDayShortfallSecTotal),
    lateShortfallTime: formatOfficialAttendanceSeconds(lateShortfallSecTotal),
    overallShortfallTime: formatOfficialAttendanceSeconds(overallShortfallSecTotal),
    /** @deprecated alias — half-day shortfall duration */
    halfDayTotal: formatOfficialAttendanceSeconds(halfDayShortfallSecTotal),
    /** @deprecated alias — full-day late shortfall only */
    lateDeficit: formatOfficialAttendanceSeconds(lateShortfallSecTotal),
    /** @deprecated alias — same as lateShortfallSecTotal */
    lateDeficitSecTotal: lateShortfallSecTotal,
    renderedSecTotal,
  };
}
