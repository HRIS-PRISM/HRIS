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

/** No Time IN and no Time OUT (break punches ignored for this check). */
export function hasNoPunchesTimeInOutOnly(row) {
  return empty(row?.timeIN) && empty(row?.timeOUT);
}

/** Raw device punch empty (Time IN / OUT / breaks). */
export function isEmptyAttendancePunch(v) {
  return empty(v);
}

/**
 * Half day — morning: Time IN only (no break punches, no Time OUT).
 * Time IN + Break IN = late (not half day).
 */
export function isHalfDayMorningByPunches(row) {
  return (
    !empty(row?.timeIN) &&
    empty(row?.breaktimeIN) &&
    empty(row?.breaktimeOUT) &&
    empty(row?.timeOUT)
  );
}

/**
 * Half day — afternoon: Time OUT only (no break punches, no Time IN).
 * Break OUT + Time OUT = late (not half day).
 */
export function isHalfDayAfternoonByPunches(row) {
  return (
    !empty(row?.timeOUT) &&
    empty(row?.breaktimeIN) &&
    empty(row?.breaktimeOUT) &&
    empty(row?.timeIN)
  );
}

/** Suggested half-day when exactly one anchor punch exists without breaks. */
export function isHalfDayByPunchPattern(row) {
  return isHalfDayMorningByPunches(row) || isHalfDayAfternoonByPunches(row);
}

/**
 * Faculty 30hrs half-day: exactly one of Time IN / Time OUT.
 * Break punches are not required and must not affect detection.
 */
export function isHalfDayByTimeInOutOnly(row) {
  const hasIn = !empty(row?.timeIN);
  const hasOut = !empty(row?.timeOUT);
  return hasIn !== hasOut;
}

/** Morning segment engaged as late: Time IN + Break IN. */
export function hasMorningLateSegmentByPunches(row) {
  return !empty(row?.timeIN) && !empty(row?.breaktimeIN);
}

/** Afternoon segment engaged as late: Break OUT + Time OUT. */
export function hasAfternoonLateSegmentByPunches(row) {
  return !empty(row?.breaktimeOUT) && !empty(row?.timeOUT);
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
 * Work seconds rendered inside official schedule windows using Time IN / Time OUT.
 * Clamps to official AM (Time IN→Break IN) and PM (Break OUT→Time OUT) windows so
 * lunch is excluded. Returns 0 when either punch is missing; null if no official schedule.
 */
export function computeOfficialWindowRenderedSec(row) {
  const offIn = parseOfficialTimeToSeconds(row?.officialTimeIN);
  const offOut = parseOfficialTimeToSeconds(row?.officialTimeOUT);
  if (offIn == null || offOut == null) return null;

  const inSec = parseOfficialTimeToSeconds(row?.timeIN);
  const outSec = parseOfficialTimeToSeconds(row?.timeOUT);
  if (inSec == null || outSec == null) return 0;

  const offBrkIn = parseOfficialTimeToSeconds(row?.officialBreaktimeIN);
  const offBrkOut = parseOfficialTimeToSeconds(row?.officialBreaktimeOUT);

  if (offBrkIn != null && offBrkOut != null && offBrkOut >= offBrkIn) {
    const am = Math.max(
      0,
      Math.min(outSec, offBrkIn) - Math.max(inSec, offIn),
    );
    const pm = Math.max(
      0,
      Math.min(outSec, offOut) - Math.max(inSec, offBrkOut),
    );
    return am + pm;
  }

  return Math.max(0, Math.min(outSec, offOut) - Math.max(inSec, offIn));
}

/**
 * Effective day arrival: Time IN, else earliest break punch (DTR PM-only layout).
 */
export function getEffectiveArrivalSec(row) {
  const timeIn = parseOfficialTimeToSeconds(row?.timeIN);
  if (timeIn != null) return timeIn;
  const candidates = [
    parseOfficialTimeToSeconds(row?.breaktimeIN),
    parseOfficialTimeToSeconds(row?.breaktimeOUT),
  ].filter((s) => s != null);
  if (!candidates.length) return null;
  return Math.min(...candidates);
}

/**
 * Effective day departure: Time OUT, else latest break punch.
 */
export function getEffectiveDepartureSec(row) {
  const timeOut = parseOfficialTimeToSeconds(row?.timeOUT);
  if (timeOut != null) return timeOut;
  const candidates = [
    parseOfficialTimeToSeconds(row?.breaktimeOUT),
    parseOfficialTimeToSeconds(row?.breaktimeIN),
  ].filter((s) => s != null);
  if (!candidates.length) return null;
  return Math.max(...candidates);
}

/**
 * Late/tardiness from clock-in: max(0, arrival − official Time IN).
 */
export function computeArrivalLateSec(row) {
  const offIn = parseOfficialTimeToSeconds(row?.officialTimeIN);
  if (offIn == null) return null;
  const arrival = getEffectiveArrivalSec(row);
  if (arrival == null) return null;
  return Math.max(0, arrival - offIn);
}

/**
 * Undertime from early leave: max(0, official Time OUT − departure).
 */
export function computeEarlyLeaveUndertimeSec(row) {
  const offOut = parseOfficialTimeToSeconds(row?.officialTimeOUT);
  if (offOut == null) return null;
  const departure = getEffectiveDepartureSec(row);
  if (departure == null) return null;
  return Math.max(0, offOut - departure);
}

/** Arrival late + early-leave undertime (seconds). */
export function computePunchTardinessSec(row) {
  return (computeArrivalLateSec(row) ?? 0) + (computeEarlyLeaveUndertimeSec(row) ?? 0);
}

/**
 * Half-day when punch tardiness (arrival late + early leave) is **more than half**
 * of official scheduled work. ≤ half counts as late/tardiness only.
 */
export function isHalfDayByTardinessThreshold(row) {
  if (!isScheduledByOfficialTime(row)) return false;
  if (hasNoPunches(row) && hasNoPunchesTimeInOutOnly(row)) return false;
  const schedWorkSec = getOfficialSchedWorkSec(row);
  if (schedWorkSec == null || schedWorkSec <= 0) return false;
  if (
    getEffectiveArrivalSec(row) == null &&
    getEffectiveDepartureSec(row) == null
  ) {
    return false;
  }
  return computePunchTardinessSec(row) > schedWorkSec / 2;
}

/** @deprecated Use {@link isHalfDayByTardinessThreshold} — same rule. */
export function isNonTeachingHalfDayByPunches(row) {
  return isHalfDayByTardinessThreshold(row);
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
    if (!isHalfDayByPunchPattern(row)) return;
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

    if (isHalfDayByPunchPattern(row)) {
      halfDays += 1;
      const renderedSec = Math.floor(schedWorkSec / 2);
      const deficit = Math.max(0, schedWorkSec - renderedSec);
      halfDayShortfallSecTotal += deficit;
      renderedSecTotal += renderedSec;
      return;
    }

    // Arrival late + early leave (matches DTR Late / Undertime).
    const lateSec = computeArrivalLateSec(row) ?? 0;
    const undertimeSec = computeEarlyLeaveUndertimeSec(row) ?? 0;
    const deficit = lateSec + undertimeSec;
    const renderedSec = Math.max(0, schedWorkSec - deficit);
    renderedSecTotal += renderedSec;
    lateShortfallSecTotal += deficit;
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
