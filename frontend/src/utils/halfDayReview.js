/**
 * Half-day HR review: detect-only suggestions, approve (HR rendered → tardiness),
 * reject (HR tardiness with punch-based suggestions).
 */
import {
  parseOfficialTimeToSeconds,
  formatOfficialAttendanceSeconds,
  isExcludedAttendanceCalendarDate,
  isScheduledByOfficialTime,
  getOfficialSchedWorkSec,
  hasNoPunches,
  hasMorningPunch,
  hasAfternoonPunch,
} from './officialAttendanceFromDailyRows';
import { sanitizeDurationHhMmSs } from './dtrLateUndertimeFromOverall';

export const HALF_DAY_STATUS = {
  SUGGESTED: 'suggested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
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
  return n === '—' || n === '-' || n === 'n/a' || n === 'na';
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

/** True only when HR used Confirm half day (rendered / computed tardiness saved). */
export const hasHrHalfDayConfirmation = (entry) => {
  if (!entry || entry.status !== HALF_DAY_STATUS.APPROVED) return false;
  if (entry.detectedReason === 'legacy_halfDayDates') return false;
  return (
    entry.renderedTotal != null ||
    entry.renderedRegular != null ||
    entry.renderedMorning != null ||
    entry.renderedAfternoon != null ||
    entry.computedTardinessTotal != null ||
    entry.computedTardinessRegular != null ||
    entry.computedTardinessMorning != null ||
    entry.computedTardinessAfternoon != null
  );
};

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

  Object.keys(map).forEach((d) => {
    const entry = map[d];
    if (entry?.status !== HALF_DAY_STATUS.APPROVED) return;
    if (hasHrHalfDayConfirmation(entry)) return;
    const row = (rows || []).find((r) => normalizeReviewDate(r.date) === d);
    if (!row) {
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
  return map;
};

export function detectSuggestedHalfDay(row, moduleType, calendarMaps) {
  const d = normalizeReviewDate(row?.date);
  if (calendarMaps && isExcludedAttendanceCalendarDate(d, calendarMaps)) return false;
  if (!isScheduledByOfficialTime(row)) return false;
  if (getOfficialSchedWorkSec(row) == null) return false;

  if (moduleType === MODULE_TYPES.NON_TEACHING) {
    if (hasNoPunches(row)) return false;
    return hasMorningPunch(row) !== hasAfternoonPunch(row);
  }

  if (hasNoPunchesTimeInOutOnly(row)) return false;
  const morning = !EMPTY_PUNCH(row?.timeIN);
  const afternoon = !EMPTY_PUNCH(row?.timeOUT);
  return morning !== afternoon;
}

function hasNoPunchesTimeInOutOnly(row) {
  return EMPTY_PUNCH(row?.timeIN) && EMPTY_PUNCH(row?.timeOUT);
}

export function createSuggestedEntry(row, moduleType) {
  const suggested = computeSuggestedTardinessFromPunches(row, moduleType);
  return {
    date: normalizeReviewDate(row.date),
    status: HALF_DAY_STATUS.SUGGESTED,
    detectedReason: 'xor_punch',
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
  let lateShortfallSecTotal = 0;

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
      return;
    }

    if (entry?.status === HALF_DAY_STATUS.REJECTED) {
      lateShortfallSecTotal += getRejectedHalfDayLateSeconds(entry, moduleType);
      return;
    }

    const inSec = parseOfficialTimeToSeconds(row?.timeIN);
    const outSec = parseOfficialTimeToSeconds(row?.timeOUT);
    let renderedSec = 0;
    if (inSec != null && outSec != null) {
      renderedSec = Math.max(0, outSec - inSec);
    }
    const deficit = Math.max(0, schedWorkSec - renderedSec);
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

export function getEffectiveTardinessFromApproved(entry, moduleType) {
  if (!entry || !hasHrHalfDayConfirmation(entry)) return null;
  const z = '00:00:00';
  const total = sanitizeDurationHhMmSs(
    entry.computedTardinessTotal ??
      entry.computedTardinessRegular ??
      entry.hrTardinessTotal ??
      entry.hrTardinessRegular,
    { fallback: z },
  );
  const hasSplit =
    entry.computedTardinessMorning != null ||
    entry.computedTardinessAfternoon != null ||
    entry.renderedMorning != null;
  if (moduleType === MODULE_TYPES.FACULTY_30HRS || !hasSplit) {
    return { regular: total, total, morning: null, afternoon: null };
  }
  return {
    total,
    regular: total,
    morning: sanitizeDurationHhMmSs(
      entry.computedTardinessMorning ?? entry.hrTardinessMorning,
      { fallback: z },
    ),
    afternoon: sanitizeDurationHhMmSs(
      entry.computedTardinessAfternoon ?? entry.hrTardinessAfternoon,
      { fallback: z },
    ),
  };
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
  const entry = reviewByDate?.[d];
  if (entry?.status === HALF_DAY_STATUS.REJECTED) return false;
  if (entry?.status === HALF_DAY_STATUS.SUGGESTED) return true;
  if (entry?.status === HALF_DAY_STATUS.APPROVED && hasHrHalfDayConfirmation(entry)) {
    return true;
  }
  return detectSuggestedHalfDay(row, moduleType, calendarMaps);
}

/** Half day flagged but HR has not confirmed rendered / rejected yet. */
export function isHalfDayPendingHrReview(row, reviewByDate, moduleType, calendarMaps) {
  const d = normalizeReviewDate(row?.date);
  const entry = reviewByDate?.[d];
  if (entry?.status === HALF_DAY_STATUS.REJECTED) return false;
  if (entry?.status === HALF_DAY_STATUS.APPROVED && hasHrHalfDayConfirmation(entry)) {
    return false;
  }
  if (entry?.status === HALF_DAY_STATUS.SUGGESTED) return true;
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
  if (isFurlough) {
    return getRowMaxRenderedTotal(row, moduleType);
  }
  return getRowRenderedTotalFromPunches(row, moduleType);
}

/** Display value for Total Tardiness when review applies. */
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
  if (entry?.status === HALF_DAY_STATUS.REJECTED) {
    const eff = getEffectiveTardinessFromReview(entry, moduleType);
    if (eff?.total) return eff.total;
  }
  if (entry?.status === HALF_DAY_STATUS.APPROVED && hasHrHalfDayConfirmation(entry)) {
    const fresh = computeApprovedTardinessFromRendered(row, entry, moduleType);
    const t =
      fresh?.computedTardinessTotal || fresh?.computedTardinessRegular;
    if (t) return t;
    const eff = getEffectiveTardinessFromApproved(entry, moduleType);
    if (eff?.total) return eff.total;
  }
  if (isHalfDayPendingHrReview(row, reviewByDate, moduleType, calendarMaps)) {
    return '00:00:00';
  }
  return fallbackTotal;
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
    if (entry?.status === HALF_DAY_STATUS.SUGGESTED || detectSuggestedHalfDay(row, moduleType, calendarMaps)) {
      set.add(d);
    }
  });
  return set;
}

export function getRowHalfDayUiStatus(row, reviewByDate, moduleType, calendarMaps) {
  const d = normalizeReviewDate(row?.date);
  const entry = reviewByDate?.[d];
  if (entry?.status === HALF_DAY_STATUS.APPROVED && hasHrHalfDayConfirmation(entry)) {
    return 'approved';
  }
  if (entry?.status === HALF_DAY_STATUS.REJECTED) return 'rejected';
  if (entry?.status === HALF_DAY_STATUS.SUGGESTED) return 'suggested';
  if (detectSuggestedHalfDay(row, moduleType, calendarMaps)) return 'suggested';
  return null;
}
