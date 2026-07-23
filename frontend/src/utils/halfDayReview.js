/**
 * Half-day HR review: detect-only suggestions, approve (HR rendered → earnings deduction),
 * reject (HR tardiness → attendance Late Total only).
 */
import {
  parseOfficialTimeToSeconds,
  formatOfficialAttendanceSeconds,
  isExcludedAttendanceCalendarDate,
  isScheduledByOfficialTime,
  getOfficialSchedWorkSec,
  hasNoPunches,
  isHalfDayByPunchPattern,
  isHalfDayByTimeInOutOnly,
  computeArrivalLateSec,
  computeEarlyLeaveUndertimeSec,
} from './officialAttendanceFromDailyRows';
import { sanitizeDurationHhMmSs } from './dtrLateUndertimeFromOverall';

export const HALF_DAY_STATUS = {
  SUGGESTED: 'suggested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

/** Where deficiency is charged after HR confirms half-day. */
export const DEDUCTION_SOURCE = {
  EARNINGS: 'earnings',
  ATTENDANCE: 'attendance',
};

export const MODULE_TYPES = {
  DESIGNATED_40HRS: 'DESIGNATED_40HRS',
  FACULTY_30HRS: 'FACULTY_30HRS',
  NON_TEACHING: 'NON_TEACHING',
};

const EMPTY_PUNCH = (v) => {
  if (v == null) return true;
  const s = String(v).trim();
  if (!s) return true;
  const n = s.replace(/\s+/g, ' ').toLowerCase();
  return (
    n === '—' ||
    n === '-' ||
    n === '--' ||
    n === '00:00:00 am' ||
    n === '00:00:00 pm' ||
    n === '00:00:00' ||
    n === 'n/a' ||
    n === 'na' ||
    n === 'null' ||
    n === 'undefined'
  );
};

export const normalizeReviewDate = (dateStr) =>
  String(dateStr ?? '').trim().slice(0, 10);

export const parseHalfDayReviewJson = (raw) => {
  if (raw == null || raw === '') return [];
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

export const buildReviewByDate = (reviewArray) => {
  const map = {};
  (reviewArray || []).forEach((entry) => {
    const d = normalizeReviewDate(entry?.date);
    if (d) map[d] = { ...entry, date: d };
  });
  return map;
};

export const buildHalfDayReviewArray = (reviewByDate) =>
  Object.values(reviewByDate || {})
    .filter((e) => e && normalizeReviewDate(e.date))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

/** HR-confirmed total rendered (supports legacy AM/PM fields). */
export const resolveEntryRenderedTotal = (entry, moduleType) => {
  if (!entry) return null;
  const z = '00:00:00';
  if (entry.renderedTotal != null && String(entry.renderedTotal).trim() !== '') {
    return parseHrDurationToHhMmSs(entry.renderedTotal, { fallback: z });
  }
  if (entry.renderedRegular != null && String(entry.renderedRegular).trim() !== '') {
    return parseHrDurationToHhMmSs(entry.renderedRegular, { fallback: z });
  }
  if (
    moduleType !== MODULE_TYPES.FACULTY_30HRS &&
    (entry.renderedMorning != null || entry.renderedAfternoon != null)
  ) {
    return sumHmsStrings([entry.renderedMorning, entry.renderedAfternoon]);
  }
  return null;
};

/**
 * Parse HR duration input: HH:MM:SS, HH:MM, or hours-only (e.g. "5" → 5 hours).
 */
export function parseHrDurationToSeconds(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  const fromClock = parseOfficialTimeToSeconds(raw);
  if (fromClock != null) return fromClock;
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const hrs = parseFloat(raw);
    if (Number.isFinite(hrs) && hrs >= 0) return Math.round(hrs * 3600);
  }
  const hm = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) {
    const h = Number(hm[1]);
    const m = Number(hm[2]);
    if (!Number.isNaN(h) && !Number.isNaN(m)) return h * 3600 + m * 60;
  }
  return null;
}

export function parseHrDurationToHhMmSs(input, { fallback = '00:00:00' } = {}) {
  const sec = parseHrDurationToSeconds(input);
  if (sec == null) return fallback;
  return formatOfficialAttendanceSeconds(sec);
}

const EMPTY_OFFICIAL_CLOCK = (v) => {
  if (v == null) return true;
  const s = String(v).trim();
  if (!s) return true;
  const n = s.replace(/\s+/g, ' ').toLowerCase();
  return (
    n === '—' ||
    n === '-' ||
    n === '00:00:00 am' ||
    n === '00:00:00 pm' ||
    n === '00:00:00'
  );
};

/** Official clock for display (Time IN / breaks / Time OUT). */
export function formatOfficialClockDisplay(v) {
  if (EMPTY_OFFICIAL_CLOCK(v)) return null;
  return String(v).trim();
}

/** Official schedule on the row for half-day review dialog. */
export function getOfficialScheduleDisplay(row, moduleType) {
  const totalSec = getOfficialSchedWorkSec(row);
  const officialTimeIN = formatOfficialClockDisplay(row?.officialTimeIN);
  const officialBreaktimeIN = formatOfficialClockDisplay(row?.officialBreaktimeIN);
  const officialBreaktimeOUT = formatOfficialClockDisplay(row?.officialBreaktimeOUT);
  const officialTimeOUT = formatOfficialClockDisplay(row?.officialTimeOUT);
  return {
    officialTimeIN,
    officialBreaktimeIN,
    officialBreaktimeOUT,
    officialTimeOUT,
    totalRendered: getRowMaxRenderedTotal(row, moduleType),
    hasSchedule:
      Boolean(officialTimeIN || officialBreaktimeIN || officialBreaktimeOUT || officialTimeOUT) ||
      (totalSec != null && totalSec > 0),
  };
}

const readOfficialMaxRenderedHms = (hms) => {
  if (hms == null || hms === 'NaN:NaN:NaN') return null;
  const s = sanitizeDurationHhMmSs(hms, { fallback: '00:00:00' });
  const sec = parseOfficialTimeToSeconds(s);
  return sec != null && sec > 0 ? s : null;
};

/**
 * Full official rendered for the day: AM max + PM max (e.g. 8–12 + 1–5 = 8h),
 * else faculty single max, else IN–OUT schedule minus break.
 */
export function getOfficialDayMaxRenderedTotal(row) {
  const z = '00:00:00';
  const facultyMax = readOfficialMaxRenderedHms(row?.formattedFacultyMaxRenderedTime);
  if (facultyMax) return facultyMax;

  // Full official day (IN–OUT minus break) — must run before AM/PM row fields, which are
  // often 00:00:00 on the missing half when only one punch exists (would halve one slot twice).
  const schedSec = getOfficialSchedWorkSec(row);
  if (schedSec != null && schedSec > 0) {
    return formatOfficialAttendanceSeconds(schedSec);
  }

  const am = readOfficialMaxRenderedHms(row?.formattedFacultyMaxRenderedTimeAM);
  const pm = readOfficialMaxRenderedHms(row?.formattedFacultyMaxRenderedTimePM);
  if (am || pm) {
    return sumHmsStrings([am || z, pm || z]);
  }
  return z;
}

/**
 * Earnings half-day VL modal: official schedule, HR rendered, and system shortfall
 * (Total Tardiness for that date) from overall `half_day_review` + daily row.
 */
export function buildHalfDayDeductionModalContext(
  summary,
  dailyRow,
  moduleType = MODULE_TYPES.NON_TEACHING,
) {
  const dateStr = normalizeReviewDate(dailyRow?.date);
  if (!dateStr || !summary || !dailyRow) return null;
  const reviewMap = buildReviewByDate(parseHalfDayReviewJson(summary?.half_day_review));
  const entry = reviewMap[dateStr];
  if (!isApprovedHalfDayChargeViaEarnings(entry)) return null;

  const officialSchedule = getOfficialScheduleDisplay(dailyRow, moduleType);
  const renderedTotal = resolveEntryRenderedTotal(entry, moduleType) || '00:00:00';
  const maxOfficialTotal = getRowMaxRenderedTotal(dailyRow, moduleType);
  const shortfallSec = computeApprovedHalfDayShortfallSec(dailyRow, entry, moduleType);
  const totalTardiness = formatOfficialAttendanceSeconds(shortfallSec);
  const suggestedHours = shortfallSec / 3600;
  const suggestedDays = suggestedHours / 8;
  const schedSec = getOfficialSchedWorkSec(dailyRow);
  const suggestedRateDecimal =
    schedSec != null && schedSec > 0
      ? Math.round((shortfallSec / schedSec) * 10000) / 10000
      : 0.5;

  return {
    date: dateStr,
    officialSchedule,
    renderedTotal,
    maxOfficialTotal,
    totalTardiness,
    totalTardinessSec: shortfallSec,
    suggestedDeductionHours: suggestedHours,
    suggestedDeductionDays: suggestedDays,
    suggestedRateDecimal,
  };
}

/** Half of total official day (sum AM+PM, then ÷2 — e.g. 8h → 4h suggestion). */
export function getSuggestedHalfDayRenderedTotal(row) {
  const totalSec = parseOfficialTimeToSeconds(getOfficialDayMaxRenderedTotal(row));
  if (totalSec == null || totalSec <= 0) return '00:00:00';
  return formatOfficialAttendanceSeconds(Math.floor(totalSec / 2));
}

/** Same half-day suggestion for both slots (total AM+PM, then halved). */
export function getSuggestedHalfDayRenderedAmPm(row) {
  const half = getSuggestedHalfDayRenderedTotal(row);
  return { morning: half, afternoon: half };
}

/** Max official rendered for the day — full schedule (e.g. 10h), not AM+PM slot max only. */
export const getRowMaxRenderedTotal = (row, moduleType) => {
  const z = '00:00:00';
  if (moduleType === MODULE_TYPES.FACULTY_30HRS) {
    return sanitizeDurationHhMmSs(row?.formattedFacultyMaxRenderedTime, { fallback: z });
  }
  const schedSec = getOfficialSchedWorkSec(row);
  if (schedSec != null && schedSec > 0) {
    return formatOfficialAttendanceSeconds(schedSec);
  }
  return sumHmsStrings([
    row?.formattedFacultyMaxRenderedTimeAM,
    row?.formattedFacultyMaxRenderedTimePM,
  ]);
};

/** Rendered from punches (AM+PM sum on split modules). */
export const getRowRenderedTotalFromPunches = (row, moduleType) => {
  const z = '00:00:00';
  if (moduleType === MODULE_TYPES.FACULTY_30HRS) {
    if (
      !row?.officialTimeIN ||
      !row?.timeOUT ||
      row?.formattedFacultyRenderedTime === 'NaN:NaN:NaN'
    ) {
      return z;
    }
    return sanitizeDurationHhMmSs(row?.formattedFacultyRenderedTime, { fallback: z });
  }
  const am =
    !row?.officialTimeIN ||
    !row?.breaktimeIN ||
    row?.formattedFacultyRenderedTimeAM === 'NaN:NaN:NaN'
      ? z
      : sanitizeDurationHhMmSs(row?.formattedFacultyRenderedTimeAM, { fallback: z });
  const pm =
    !row?.officialBreaktimeOUT ||
    !row?.timeOUT ||
    row?.formattedFacultyRenderedTimePM === 'NaN:NaN:NaN'
      ? z
      : sanitizeDurationHhMmSs(row?.formattedFacultyRenderedTimePM, { fallback: z });
  return sumHmsStrings([am, pm]);
};

/** True only when HR confirmed approve with rendered time (not legacy halfDayDates alone). */
export const hasHrHalfDayConfirmation = (entry) => {
  if (!entry || entry.status !== HALF_DAY_STATUS.APPROVED) return false;
  if (entry.detectedReason === 'legacy_halfDayDates') return false;
  return (
    entry.renderedTotal != null ||
    entry.renderedRegular != null ||
    entry.renderedMorning != null ||
    entry.renderedAfternoon != null
  );
};

/** Approved half-day: charge via Earnings / leave credits, not attendance tardiness. */
export const isApprovedHalfDayChargeViaEarnings = (entry) =>
  Boolean(entry && hasHrHalfDayConfirmation(entry));

/** Exclude approved half-day from Total Tardiness / Late Total / DTR late. */
export const shouldExcludeApprovedHalfDayFromTardiness = (entry) =>
  isApprovedHalfDayChargeViaEarnings(entry);

/**
 * Merge stored review + legacy halfDayDates + live detection.
 * Old halfDayDates alone are for review only — never auto-confirmed.
 */
export const migrateLegacyHalfDayReview = (
  reviewByDate,
  halfDayDatesStr,
  rows,
  moduleType,
  calendarMaps,
) => {
  const map = { ...reviewByDate };

  // Drop or refresh suggestions when punches no longer match half-day detection
  // (e.g. timeOUT removed in Modification then restored).
  Object.keys(map).forEach((d) => {
    const entry = map[d];
    const row = (rows || []).find((r) => normalizeReviewDate(r.date) === d);
    if (!row) {
      delete map[d];
      return;
    }
    if (entry?.status !== HALF_DAY_STATUS.SUGGESTED) return;
    if (!detectSuggestedHalfDay(row, moduleType, calendarMaps)) {
      delete map[d];
      return;
    }
    map[d] = {
      ...createSuggestedEntry(row, moduleType),
      ...entry,
      date: d,
      status: HALF_DAY_STATUS.SUGGESTED,
    };
  });

  Object.keys(map).forEach((d) => {
    const entry = map[d];
    if (entry?.status !== HALF_DAY_STATUS.APPROVED) return;
    if (hasHrHalfDayConfirmation(entry)) return;
    const row = (rows || []).find((r) => normalizeReviewDate(r.date) === d);
    if (!row) {
      delete map[d];
      return;
    }
    // If this date no longer matches half-day detection (punches are now complete),
    // drop legacy "approved w/o confirmation" artifacts so the UI doesn't keep
    // showing "Half day — for review" forever.
    if (!detectSuggestedHalfDay(row, moduleType, calendarMaps)) {
      delete map[d];
      return;
    }
    map[d] = {
      ...createSuggestedEntry(row, moduleType),
      ...entry,
      date: d,
      status: HALF_DAY_STATUS.SUGGESTED,
      detectedReason: entry.detectedReason || 'legacy_halfDayDates',
      note:
        entry.note ||
        'Re-review required — was saved without HR confirm in Review column',
    };
  });

  const legacyDates = String(halfDayDatesStr || '').match(/\d{4}-\d{2}-\d{2}/g) || [];
  legacyDates.forEach((d) => {
    if (map[d]?.status === HALF_DAY_STATUS.REJECTED) return;
    if (map[d]?.status === HALF_DAY_STATUS.APPROVED && hasHrHalfDayConfirmation(map[d])) {
      return;
    }
    const row = (rows || []).find((r) => normalizeReviewDate(r.date) === d);
    if (!row) return;
    // Only restore legacy half-day dates if the current punches still look like a half-day.
    // This prevents stale localStorage/DB legacy strings from re-flagging full IN/OUT days.
    if (!detectSuggestedHalfDay(row, moduleType, calendarMaps)) return;
    map[d] = {
      ...createSuggestedEntry(row, moduleType),
      date: d,
      status: HALF_DAY_STATUS.SUGGESTED,
      detectedReason: 'legacy_halfDayDates',
      note: 'Previously in saved halfDayDates — confirm in Review column',
    };
  });

  (rows || []).forEach((row) => {
    const d = normalizeReviewDate(row.date);
    if (!d || map[d]) return;
    if (!detectSuggestedHalfDay(row, moduleType, calendarMaps)) return;
    map[d] = createSuggestedEntry(row, moduleType);
  });

  if (calendarMaps) {
    Object.keys(map).forEach((d) => {
      if (isExcludedAttendanceCalendarDate(d, calendarMaps)) delete map[d];
    });
  }

  return map;
};

export function detectSuggestedHalfDay(row, moduleType, calendarMaps) {
  const d = normalizeReviewDate(row?.date);
  if (calendarMaps && isExcludedAttendanceCalendarDate(d, calendarMaps)) return false;
  if (!isScheduledByOfficialTime(row)) return false;
  if (getOfficialSchedWorkSec(row) == null) return false;

  if (moduleType === MODULE_TYPES.NON_TEACHING) {
    if (hasNoPunches(row)) return false;
  } else if (hasNoPunchesTimeInOutOnly(row)) {
    return false;
  }

  // Faculty 30hrs only requires Time IN + Time OUT; break punches are ignored.
  if (moduleType === MODULE_TYPES.FACULTY_30HRS) {
    return isHalfDayByTimeInOutOnly(row);
  }

  return isHalfDayByPunchPattern(row);
}

function hasNoPunchesTimeInOutOnly(row) {
  return EMPTY_PUNCH(row?.timeIN) && EMPTY_PUNCH(row?.timeOUT);
}

export function createSuggestedEntry(row, moduleType) {
  const suggested = computeSuggestedTardinessFromPunches(row, moduleType);
  const detectedReason = 'punch_pattern';
  return {
    date: normalizeReviewDate(row.date),
    status: HALF_DAY_STATUS.SUGGESTED,
    detectedReason,
    ...suggested,
  };
}

export function computeSuggestedTardinessFromPunches(row, moduleType) {
  const zero = '00:00:00';
  const maxTotal = getRowMaxRenderedTotal(row, moduleType);
  const renderedTotal = getRowRenderedTotalFromPunches(row, moduleType);
  const suggestedTotal = computeTardinessFromMaxAndRendered(maxTotal, renderedTotal);
  if (moduleType === MODULE_TYPES.FACULTY_30HRS) {
    return {
      suggestedTardinessMorning: null,
      suggestedTardinessAfternoon: null,
      suggestedTardinessRegular: suggestedTotal,
      suggestedRenderedTotal: renderedTotal,
    };
  }
  const am = sanitizeDurationHhMmSs(
    row?.formattedfinalcalcFacultyAM === 'NaN:NaN:NaN'
      ? row?.formattedFacultyMaxRenderedTimeAM
      : row?.formattedfinalcalcFacultyAM,
    { fallback: zero },
  );
  const pm = sanitizeDurationHhMmSs(
    row?.formattedfinalcalcFacultyPM === 'NaN:NaN:NaN'
      ? row?.formattedFacultyMaxRenderedTimePM
      : row?.formattedfinalcalcFacultyPM,
    { fallback: zero },
  );
  return {
    suggestedTardinessMorning: am,
    suggestedTardinessAfternoon: pm,
    suggestedTardinessRegular: suggestedTotal,
    suggestedRenderedTotal: renderedTotal,
  };
}

export function computeTardinessFromMaxAndRendered(maxHms, renderedHms) {
  const maxSec = parseOfficialTimeToSeconds(maxHms);
  const rendSec = parseHrDurationToSeconds(renderedHms);
  if (maxSec == null || rendSec == null) return '00:00:00';
  return formatOfficialAttendanceSeconds(Math.max(0, maxSec - rendSec));
}

export function computeApprovedTardinessFromRendered(row, entry, moduleType) {
  const zero = '00:00:00';
  const rawRendered =
    entry?.renderedTotal ?? entry?.renderedRegular ?? zero;
  const renderedTotal = parseHrDurationToHhMmSs(rawRendered, { fallback: zero });
  const maxTotal = getRowMaxRenderedTotal(row, moduleType);
  const tardTotal = computeTardinessFromMaxAndRendered(maxTotal, renderedTotal);
  const base = {
    renderedTotal,
    renderedRegular: renderedTotal,
    renderedMorning: null,
    renderedAfternoon: null,
    computedTardinessTotal: tardTotal,
    computedTardinessRegular: tardTotal,
    hrTardinessTotal: tardTotal,
    hrTardinessRegular: tardTotal,
    hrTardinessMorning: null,
    hrTardinessAfternoon: null,
    computedTardinessMorning: null,
    computedTardinessAfternoon: null,
  };
  if (moduleType === MODULE_TYPES.FACULTY_30HRS) return base;
  return base;
}

export function computeApprovedHalfDayShortfallSec(row, entry, moduleType) {
  const schedWorkSec = getOfficialSchedWorkSec(row);
  if (schedWorkSec == null) return 0;
  const rendSec =
    parseHrDurationToSeconds(resolveEntryRenderedTotal(entry, moduleType)) ?? 0;
  return Math.max(0, schedWorkSec - rendSec);
}

export const getApprovedHalfDayDatesSet = (reviewByDate) => {
  const set = new Set();
  Object.values(reviewByDate || {}).forEach((e) => {
    if (
      e?.status === HALF_DAY_STATUS.APPROVED &&
      hasHrHalfDayConfirmation(e) &&
      normalizeReviewDate(e.date)
    ) {
      set.add(normalizeReviewDate(e.date));
    }
  });
  return set;
};

/**
 * Half-day dates shown in Earnings (VL deduction): same HR-approved set as attendance
 * modules (`half_day_review` / `halfDayDates` on overall record). Excludes approved
 * leave only — not punch-pattern detection.
 */
export function listEarningsHalfDayDatesFromOverallSummary(summary, calendarMaps) {
  const reviewMap = buildReviewByDate(
    parseHalfDayReviewJson(summary?.half_day_review),
  );
  let approved = getApprovedHalfDayDatesSet(reviewMap);
  if (!approved.size && summary?.halfDayDates) {
    approved = new Set();
    const matches = String(summary.halfDayDates).match(/\d{4}-\d{2}-\d{2}/g) || [];
    matches.forEach((d) => {
      const n = normalizeReviewDate(d);
      if (n) approved.add(n);
    });
  }
  const leave = calendarMaps?.leaveByDate;
  return [...approved]
    .filter((d) => d && !(leave && leave[d]))
    .sort();
}

/**
 * Half-day dates for Earnings UI list (includes on-leave days — show "On Leave" instead of hiding).
 */
/** True when overall record has HR-approved half-day for this date (earnings may deduct). */
export function isApprovedHalfDayDateInSummary(summary, dateStr) {
  const d = normalizeReviewDate(dateStr);
  if (!d || !summary) return false;
  const reviewMap = buildReviewByDate(parseHalfDayReviewJson(summary?.half_day_review));
  return isApprovedHalfDayChargeViaEarnings(reviewMap[d]);
}

export function listEarningsHalfDayDatesForDisplay(summary) {
  const reviewMap = buildReviewByDate(
    parseHalfDayReviewJson(summary?.half_day_review),
  );
  let approved = getApprovedHalfDayDatesSet(reviewMap);
  if (!approved.size && summary?.halfDayDates) {
    approved = new Set();
    const matches = String(summary.halfDayDates).match(/\d{4}-\d{2}-\d{2}/g) || [];
    matches.forEach((d) => {
      const n = normalizeReviewDate(d);
      if (n) approved.add(n);
    });
  }
  return [...approved].filter(Boolean).sort();
}

export const countSuggestedHalfDays = (reviewByDate, rows, moduleType, calendarMaps) => {
  let n = 0;
  (rows || []).forEach((row) => {
    const d = normalizeReviewDate(row.date);
    const entry = reviewByDate?.[d];
    if (entry?.status === HALF_DAY_STATUS.APPROVED || entry?.status === HALF_DAY_STATUS.REJECTED) {
      return;
    }
    if (detectSuggestedHalfDay(row, moduleType, calendarMaps)) n += 1;
  });
  return n;
};

/** Punch-based late seconds for one row (matches table AM/PM or faculty calc). */
export function getPunchLateSecondsForModule(row, moduleType) {
  if (moduleType === MODULE_TYPES.FACULTY_30HRS) {
    const sysTard =
      row?.formattedfinalcalcFaculty === 'NaN:NaN:NaN'
        ? row?.formattedFacultyMaxRenderedTime
        : row?.formattedfinalcalcFaculty;
    const sysSec = parseOfficialTimeToSeconds(sysTard);
    return sysSec != null ? Math.max(0, sysSec) : 0;
  }
  if (
    moduleType === MODULE_TYPES.NON_TEACHING ||
    moduleType === MODULE_TYPES.DESIGNATED_40HRS
  ) {
    return getAmPmSlotLateSecondsFromRow(row);
  }
  const schedWorkSec = getOfficialSchedWorkSec(row);
  if (schedWorkSec == null) return 0;
  const inSec = parseOfficialTimeToSeconds(row?.timeIN);
  const outSec = parseOfficialTimeToSeconds(row?.timeOUT);
  let renderedSec = 0;
  if (inSec != null && outSec != null) {
    renderedSec = Math.max(0, outSec - inSec);
  }
  return Math.max(0, schedWorkSec - renderedSec);
}

/** Absent unchanged; half-day buckets only for HR-approved dates. */
export function computeReviewAwareAbsenceBuckets(
  rows,
  reviewByDate,
  calendarMaps,
  moduleType,
) {
  let absentDays = 0;
  let halfDays = 0;
  let absentSecTotal = 0;
  let halfDayShortfallSecTotal = 0;
  /** Late that feeds Overall Tardiness and Late Total (excludes approved half-day days). */
  let lateShortfallSecTotal = 0;
  /** Same as lateShortfall — kept for callers that still read lateTotalDisplay*. */
  let lateTotalDisplaySec = 0;

  const isFacultyInOut =
    moduleType === MODULE_TYPES.DESIGNATED_40HRS ||
    moduleType === MODULE_TYPES.FACULTY_30HRS;

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const d = normalizeReviewDate(row?.date);
    if (calendarMaps && isExcludedAttendanceCalendarDate(d, calendarMaps)) return;
    if (!isScheduledByOfficialTime(row)) return;
    const schedWorkSec = getOfficialSchedWorkSec(row);
    if (schedWorkSec == null) return;

    const noPunch = isFacultyInOut
      ? hasNoPunchesTimeInOutOnly(row)
      : hasNoPunches(row);
    if (noPunch) {
      absentDays += 1;
      absentSecTotal += schedWorkSec;
      return;
    }

    const entry = reviewByDate?.[d];
    if (entry?.status === HALF_DAY_STATUS.APPROVED && hasHrHalfDayConfirmation(entry)) {
      halfDays += 1;
      halfDayShortfallSecTotal += computeApprovedHalfDayShortfallSec(
        row,
        entry,
        moduleType,
      );
      // Half-day shortfall → Overall only; not Late Total
      return;
    }

    if (entry?.status === HALF_DAY_STATUS.REJECTED) {
      const rej = getRejectedHalfDayLateSeconds(entry, moduleType);
      lateShortfallSecTotal += rej;
      lateTotalDisplaySec += rej;
      return;
    }

    const punchLate = getPunchLateSecondsForModule(row, moduleType);
    lateShortfallSecTotal += punchLate;
    lateTotalDisplaySec += punchLate;
  });

  const overallShortfallSecTotal =
    absentSecTotal + halfDayShortfallSecTotal + lateShortfallSecTotal;

  return {
    absentDays,
    halfDays,
    absentSecTotal,
    halfDayShortfallSecTotal,
    lateShortfallSecTotal,
    lateTotalDisplaySec,
    overallShortfallSecTotal,
    absentTime: formatOfficialAttendanceSeconds(absentSecTotal),
    halfDayShortfallTime: formatOfficialAttendanceSeconds(halfDayShortfallSecTotal),
    lateShortfallTime: formatOfficialAttendanceSeconds(lateShortfallSecTotal),
    lateTotalDisplayTime: formatOfficialAttendanceSeconds(lateTotalDisplaySec),
    overallShortfallTime: formatOfficialAttendanceSeconds(overallShortfallSecTotal),
  };
}

/** Seconds of HR-entered tardiness when half day is rejected (not absent / not half-day shortfall). */
export function getRejectedHalfDayLateSeconds(entry, moduleType) {
  const eff = getEffectiveTardinessFromReview(entry, moduleType);
  if (!eff) return 0;
  if (moduleType === MODULE_TYPES.FACULTY_30HRS) {
    return parseOfficialTimeToSeconds(eff.regular ?? eff.total) ?? 0;
  }
  const am = parseOfficialTimeToSeconds(eff.morning) ?? 0;
  const pm = parseOfficialTimeToSeconds(eff.afternoon) ?? 0;
  if (am > 0 || pm > 0) return am + pm;
  return parseOfficialTimeToSeconds(eff.total) ?? 0;
}

/** Tardiness string(s) for display/totals from review entry. */
export function getEffectiveTardinessFromReview(entry, moduleType) {
  if (!entry || entry.status !== HALF_DAY_STATUS.REJECTED) return null;
  const z = '00:00:00';
  const total = sanitizeDurationHhMmSs(
    entry.hrTardinessTotal ??
      entry.hrTardinessRegular ??
      sumHmsStrings([entry.hrTardinessMorning, entry.hrTardinessAfternoon]),
    { fallback: z },
  );
  if (moduleType === MODULE_TYPES.FACULTY_30HRS) {
    return { regular: total, total, morning: null, afternoon: null };
  }
  const hasSplit =
    entry.hrTardinessMorning != null || entry.hrTardinessAfternoon != null;
  if (hasSplit) {
    return {
      total,
      regular: total,
      morning: sanitizeDurationHhMmSs(entry.hrTardinessMorning, { fallback: z }),
      afternoon: sanitizeDurationHhMmSs(entry.hrTardinessAfternoon, { fallback: z }),
    };
  }
  return { total, regular: total, morning: null, afternoon: null };
}

/** Approved half-days: zero tardiness in attendance (deficiency charged in Earnings only). */
export function getEffectiveTardinessFromApproved(entry, moduleType) {
  if (!shouldExcludeApprovedHalfDayFromTardiness(entry)) return null;
  const z = '00:00:00';
  if (moduleType === MODULE_TYPES.FACULTY_30HRS) {
    return { regular: z, total: z, morning: null, afternoon: null };
  }
  return { total: z, regular: z, morning: z, afternoon: z };
}

/**
 * Half-day rows use Total Rendered / Total Tardiness only; AM/PM columns show 00:00:00.
 */
export function shouldZeroAmPmHalfDayColumns(
  row,
  reviewByDate,
  moduleType,
  calendarMaps,
) {
  const d = normalizeReviewDate(row?.date);
  if (calendarMaps && isExcludedAttendanceCalendarDate(d, calendarMaps)) return false;
  const entry = reviewByDate?.[d];
  if (entry?.status === HALF_DAY_STATUS.REJECTED) return false;
  if (entry?.status === HALF_DAY_STATUS.SUGGESTED) {
    return detectSuggestedHalfDay(row, moduleType, calendarMaps);
  }
  if (entry?.status === HALF_DAY_STATUS.APPROVED && hasHrHalfDayConfirmation(entry)) {
    return true;
  }
  return detectSuggestedHalfDay(row, moduleType, calendarMaps);
}

/** Half day flagged but HR has not confirmed rendered / rejected yet. */
export function isHalfDayPendingHrReview(row, reviewByDate, moduleType, calendarMaps) {
  const d = normalizeReviewDate(row?.date);
  if (calendarMaps && isExcludedAttendanceCalendarDate(d, calendarMaps)) return false;
  const entry = reviewByDate?.[d];
  if (entry?.status === HALF_DAY_STATUS.REJECTED) return false;
  if (entry?.status === HALF_DAY_STATUS.APPROVED && hasHrHalfDayConfirmation(entry)) {
    return false;
  }
  if (entry?.status === HALF_DAY_STATUS.SUGGESTED) {
    return detectSuggestedHalfDay(row, moduleType, calendarMaps);
  }
  return detectSuggestedHalfDay(row, moduleType, calendarMaps);
}

/** Total tardiness from official max minus punch-based total rendered (not AM+PM sum). */
export function getRowTotalTardinessFallbackFromPunches(row, moduleType) {
  const maxTotal = getRowMaxRenderedTotal(row, moduleType);
  const renderedTotal = getRowRenderedTotalFromPunches(row, moduleType);
  return computeTardinessFromMaxAndRendered(maxTotal, renderedTotal);
}

/** Display value for Total Rendered column. */
export function getRowTotalRenderedDisplay(
  row,
  reviewByDate,
  moduleType,
  isFurlough,
  calendarMaps = null,
) {
  const d = normalizeReviewDate(row?.date);
  if (isFurlough) {
    return getRowMaxRenderedTotal(row, moduleType);
  }
  const entry = reviewByDate?.[d];
  if (entry?.status === HALF_DAY_STATUS.APPROVED && hasHrHalfDayConfirmation(entry)) {
    const hr =
      parseHrDurationToHhMmSs(entry?.renderedTotal ?? entry?.renderedRegular, {
        fallback: '',
      }) || resolveEntryRenderedTotal(entry, moduleType);
    if (hr) return hr;
  }
  if (isHalfDayPendingHrReview(row, reviewByDate, moduleType, calendarMaps)) {
    return '00:00:00';
  }
  return getRowRenderedTotalFromPunches(row, moduleType);
}

/**
 * Non-Teaching / Designated late seconds: arrival late + early-leave undertime.
 */
export function getAmPmSlotLateSecondsFromRow(row) {
  return (
    (computeArrivalLateSec(row) ?? 0) + (computeEarlyLeaveUndertimeSec(row) ?? 0)
  );
}

/** Absent-day shortfall for Total Tardiness column (counts toward Overall, not Late Total). */
export function getRowAbsentTardinessDisplay(row, moduleType, calendarMaps) {
  const d = normalizeReviewDate(row?.date);
  if (calendarMaps && isExcludedAttendanceCalendarDate(d, calendarMaps)) return null;
  if (!isScheduledByOfficialTime(row)) return null;
  const schedWorkSec = getOfficialSchedWorkSec(row);
  if (schedWorkSec == null) return null;
  const noPunch =
    moduleType === MODULE_TYPES.NON_TEACHING
      ? hasNoPunches(row)
      : hasNoPunchesTimeInOutOnly(row);
  if (!noPunch) return null;
  return formatOfficialAttendanceSeconds(schedWorkSec);
}

/** HR-approved half-day shortfall for Total Tardiness (Overall yes, Late Total no). */
export function getApprovedHalfDayShortfallDisplay(row, entry, moduleType) {
  return formatOfficialAttendanceSeconds(
    computeApprovedHalfDayShortfallSec(row, entry, moduleType),
  );
}

/**
 * Total Tardiness per row — must sum to Overall Tardiness (Absent + Half day + Late).
 * Approved half-day / absent show their bucket shortfall; late days use punch calc.
 */
export function getRowTotalTardinessDisplay(
  row,
  reviewByDate,
  moduleType,
  isFurlough,
  fallbackTotal,
  calendarMaps = null,
) {
  if (isFurlough) return '00:00:00';
  const d = normalizeReviewDate(row?.date);
  const entry = reviewByDate?.[d];

  const absentTard = getRowAbsentTardinessDisplay(row, moduleType, calendarMaps);
  if (absentTard) return absentTard;

  if (entry?.status === HALF_DAY_STATUS.REJECTED) {
    const eff = getEffectiveTardinessFromReview(entry, moduleType);
    if (eff?.total) return eff.total;
  }
  if (entry?.status === HALF_DAY_STATUS.APPROVED && hasHrHalfDayConfirmation(entry)) {
    return getApprovedHalfDayShortfallDisplay(row, entry, moduleType);
  }
  return fallbackTotal ?? '00:00:00';
}

export function sumHmsStrings(times) {
  let total = 0;
  (times || []).forEach((t) => {
    const sec = parseOfficialTimeToSeconds(t);
    if (sec != null) total += sec;
  });
  return formatOfficialAttendanceSeconds(total);
}

/** From persisted half_day_review JSON (DTR / summary). */
export function parseSuggestedHalfDayDatesFromReview(reviewRaw) {
  const set = new Set();
  parseHalfDayReviewJson(reviewRaw).forEach((entry) => {
    if (entry?.status === HALF_DAY_STATUS.SUGGESTED) {
      const d = normalizeReviewDate(entry.date);
      if (d) set.add(d);
    }
  });
  return set;
}

/** Dates with status suggested (or detectable but not yet decided). */
export function getSuggestedHalfDayDatesSet(rows, reviewByDate, moduleType, calendarMaps) {
  const set = new Set();
  (rows || []).forEach((row) => {
    const d = normalizeReviewDate(row?.date);
    if (!d) return;
    const entry = reviewByDate?.[d];
    if (entry?.status === HALF_DAY_STATUS.APPROVED || entry?.status === HALF_DAY_STATUS.REJECTED) {
      return;
    }
    if (entry?.status === HALF_DAY_STATUS.SUGGESTED) {
      if (detectSuggestedHalfDay(row, moduleType, calendarMaps)) set.add(d);
      return;
    }
    if (detectSuggestedHalfDay(row, moduleType, calendarMaps)) {
      set.add(d);
    }
  });
  return set;
}

export function getRowHalfDayUiStatus(row, reviewByDate, moduleType, calendarMaps) {
  const d = normalizeReviewDate(row?.date);
  if (calendarMaps && isExcludedAttendanceCalendarDate(d, calendarMaps)) return null;
  const entry = reviewByDate?.[d];
  if (entry?.status === HALF_DAY_STATUS.APPROVED && hasHrHalfDayConfirmation(entry)) {
    return 'approved';
  }
  if (entry?.status === HALF_DAY_STATUS.REJECTED) return 'rejected';
  if (entry?.status === HALF_DAY_STATUS.SUGGESTED) {
    return detectSuggestedHalfDay(row, moduleType, calendarMaps) ? 'suggested' : null;
  }
  if (detectSuggestedHalfDay(row, moduleType, calendarMaps)) return 'suggested';
  return null;
}

/** Matches ON LEAVE / SUSPENSION watermark shape on DTR punch cells. */
export function getDtrHalfDayIndicator(halfUi) {
  if (halfUi === 'approved' || halfUi === 'suggested') {
    return {
      type: 'halfDay',
      label: 'HALF DAY',
      bgColor: 'rgba(106, 27, 154, 0.2)',
      textColor: '#000',
      borderColor: '#6a1b9a',
    };
  }
  if (halfUi === 'rejected') {
    return {
      type: 'halfDayRejected',
      label: 'NOT HALF DAY',
      bgColor: 'rgba(109, 35, 35, 0.15)',
      textColor: '#000',
      borderColor: '#6d2323',
    };
  }
  return null;
}

/** Absent row — same palette as attendance modules (T.absent). */
export function getDtrAbsentIndicator() {
  return {
    type: 'absent',
    label: 'ABSENT',
    bgColor: 'rgba(183, 28, 28, 0.2)',
    textColor: '#000',
    borderColor: '#b71c1c',
  };
}

/**
 * Scheduled work day with no punches → ABSENT on DTR.
 * Only when the period has attendance records (`hasPeriodRecords`).
 * Empty DTR (no data) stays blank — holidays still come from `dateIndicator`.
 */
export function isDtrAbsentRow({
  record,
  dateIndicator,
  isNotScheduledDay,
  moduleType = MODULE_TYPES.NON_TEACHING,
  hasPeriodRecords = true,
}) {
  if (!hasPeriodRecords) return false;
  if (dateIndicator || isNotScheduledDay) return false;
  const row = record || {};
  return moduleType === MODULE_TYPES.NON_TEACHING
    ? hasNoPunches(row)
    : hasNoPunchesTimeInOutOnly(row);
}

/** Holiday / leave / suspension wins over absent / half-day watermark. */
export function mergeDtrDateAndHalfDayIndicators(dateIndicator, halfDayIndicator) {
  if (dateIndicator) return dateIndicator;
  return halfDayIndicator;
}

/** Calendar / leave / suspension → absent → half-day watermark. */
export function resolveDtrRowIndicator(
  dateIndicator,
  { absentIndicator, halfDayIndicator } = {},
) {
  if (dateIndicator) return dateIndicator;
  if (absentIndicator) return absentIndicator;
  return halfDayIndicator || null;
}

/** Subtle row tint — same pattern as getDateIndicator bg on DTR rows. */
export function getDtrHalfDayRowTint(halfDayIndicator, fallback = 'transparent') {
  if (!halfDayIndicator?.bgColor) return fallback;
  return String(halfDayIndicator.bgColor).replace(/,\s*[\d.]+\)$/i, ', 0.08)');
}

export function getDtrAbsentRowTint(absentIndicator, fallback = 'transparent') {
  if (!absentIndicator?.bgColor) return fallback;
  return String(absentIndicator.bgColor).replace(/,\s*[\d.]+\)$/i, ', 0.08)');
}

/** Row background priority: calendar → absent → half-day (suggested uses lighter tint). */
export function resolveDtrRowTint(
  dateIndicator,
  { absentIndicator, halfDayIndicator, suggestedHalfDay = false } = {},
) {
  if (dateIndicator?.bgColor) {
    return String(dateIndicator.bgColor).replace(/,\s*[\d.]+\)$/i, ', 0.08)');
  }
  if (absentIndicator) return getDtrAbsentRowTint(absentIndicator);
  if (halfDayIndicator) {
    return suggestedHalfDay
      ? 'rgba(106, 27, 154, 0.06)'
      : getDtrHalfDayRowTint(halfDayIndicator);
  }
  return 'transparent';
}

/** Subtitle under Late / Undertime columns on DTR (approved half-day policy). */
export const DTR_LATE_UNDERTIME_LEAVE_CREDIT_NOTE =
  'Deducted from Leave Credits';
