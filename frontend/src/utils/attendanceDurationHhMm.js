import {
  HALF_DAY_STATUS,
  MODULE_TYPES,
  normalizeReviewDate,
  getEffectiveTardinessFromReview,
  hasHrHalfDayConfirmation,
  resolveEntryRenderedTotal,
  isHalfDayPendingHrReview,
  getRowMaxRenderedTotal,
} from './halfDayReview';
import {
  isExcludedAttendanceCalendarDate,
  isScheduledByOfficialTime,
  hasNoPunches,
  isHalfDayByTimeInOutOnly,
  hasNoPunchesTimeInOutOnly,
} from './officialAttendanceFromDailyRows';

/** Duration zero / display — hours + minutes only (no seconds). */
export const ZERO_HM = '00:00';

export const truncateSecToMinutes = (secs) =>
  Math.floor(Math.max(0, Number(secs) || 0) / 60) * 60;

export const formatDurationHhMm = (secs) => {
  const safe = truncateSecToMinutes(secs);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** Normalize any HH:MM / HH:MM:SS → HH:MM (seconds dropped). */
export const normalizeDurationInput = (raw) => {
  const s = String(raw ?? '').trim();
  if (!s || s === '—') return null;
  const parts = s.split(':').map((p) => Number(String(p).trim()));
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return null;
  return `${String(parts[0]).padStart(2, '0')}:${String(parts[1]).padStart(2, '0')}`;
};

export const canonicalTardDisplay = (v) => normalizeDurationInput(v) || ZERO_HM;

/** Strip seconds for table display (also accepts legacy HH:MM:SS). */
export const displayDurationHhMm = (v) => {
  if (v == null || v === '' || v === '—' || v === 'N/A' || v === 'NaN:NaN:NaN') {
    return v === 'N/A' || v === '—' ? v : ZERO_HM;
  }
  return normalizeDurationInput(v) || ZERO_HM;
};

/** Clock punch → seconds at minute precision (seconds ignored). */
export const parseClockToMinuteSec = (timeStr) => {
  if (!timeStr) return null;
  const trimmed = String(timeStr).trim();
  if (!trimmed || trimmed === '—') return null;
  const m = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i);
  if (!m) return null;
  let hh = Number(m[1]);
  const mm = Number(m[2]);
  const mer = (m[4] || '').toUpperCase();
  if ([hh, mm].some(Number.isNaN)) return null;
  if (mer) { if (hh === 12) hh = 0; if (mer === 'PM') hh += 12; }
  return hh * 3600 + mm * 60;
};

/** Duration string → seconds at minute precision (seconds ignored). */
export const parseDurationToMinuteSec = (raw) => {
  const hm = normalizeDurationInput(raw);
  if (!hm) return 0;
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 3600 + (m || 0) * 60;
};

export const sumDurationHhMm = (values) => {
  let total = 0;
  (values || []).forEach((v) => { total += parseDurationToMinuteSec(v); });
  return formatDurationHhMm(total);
};

export const addTimeHhMmOnly = (a, b) => {
  return formatDurationHhMm(parseDurationToMinuteSec(a) + parseDurationToMinuteSec(b));
};

/** Millisecond delta → HH:MM (seconds stripped). */
export const formatDurationMsToHhMm = (diffMs) => {
  if (!Number.isFinite(diffMs)) return ZERO_HM;
  const totalMinutes = Math.floor(Math.max(0, diffMs) / 60000);
  return formatDurationHhMm(totalMinutes * 60);
};

export const getEffectiveArrivalMinuteSec = (row) => {
  const timeIn = parseClockToMinuteSec(row?.timeIN);
  if (timeIn != null) return timeIn;
  const candidates = [
    parseClockToMinuteSec(row?.breaktimeIN),
    parseClockToMinuteSec(row?.breaktimeOUT),
  ].filter((s) => s != null);
  if (!candidates.length) return null;
  return Math.min(...candidates);
};

export const getEffectiveDepartureMinuteSec = (row) => {
  const timeOut = parseClockToMinuteSec(row?.timeOUT);
  if (timeOut != null) return timeOut;
  const candidates = [
    parseClockToMinuteSec(row?.breaktimeOUT),
    parseClockToMinuteSec(row?.breaktimeIN),
  ].filter((s) => s != null);
  if (!candidates.length) return null;
  return Math.max(...candidates);
};

export const computeArrivalLateMinuteSec = (row) => {
  const offIn = parseClockToMinuteSec(row?.officialTimeIN);
  if (offIn == null) return null;
  const arrival = getEffectiveArrivalMinuteSec(row);
  if (arrival == null) return null;
  return Math.max(0, arrival - offIn);
};

export const computeEarlyLeaveUndertimeMinuteSec = (row) => {
  const offOut = parseClockToMinuteSec(row?.officialTimeOUT);
  if (offOut == null) return null;
  const departure = getEffectiveDepartureMinuteSec(row);
  if (departure == null) return null;
  return Math.max(0, offOut - departure);
};

export const getAmPmSlotLateMinuteSec = (row) =>
  (computeArrivalLateMinuteSec(row) ?? 0) + (computeEarlyLeaveUndertimeMinuteSec(row) ?? 0);

export const getOfficialSchedWorkMinuteSec = (row) => {
  const offInSec = parseClockToMinuteSec(row?.officialTimeIN);
  const offOutSec = parseClockToMinuteSec(row?.officialTimeOUT);
  if (offInSec == null || offOutSec == null) return null;
  const schedTotal = Math.max(0, offOutSec - offInSec);
  const offBreakInSec = parseClockToMinuteSec(row?.officialBreaktimeIN);
  const offBreakOutSec = parseClockToMinuteSec(row?.officialBreaktimeOUT);
  const breakSec =
    offBreakInSec != null && offBreakOutSec != null
      ? Math.max(0, offBreakOutSec - offBreakInSec)
      : 0;
  return Math.max(0, schedTotal - breakSec);
};

export const getRejectedHalfDayLateMinuteSec = (entry, moduleType) => {
  const eff = getEffectiveTardinessFromReview(entry, moduleType);
  if (!eff) return 0;
  if (moduleType === MODULE_TYPES.FACULTY_30HRS) {
    return parseDurationToMinuteSec(eff.regular ?? eff.total);
  }
  const am = parseDurationToMinuteSec(eff.morning);
  const pm = parseDurationToMinuteSec(eff.afternoon);
  if (am > 0 || pm > 0) return am + pm;
  return parseDurationToMinuteSec(eff.total);
};

export const computeApprovedHalfDayShortfallMinuteSec = (row, entry, moduleType) => {
  const schedWorkSec = getOfficialSchedWorkMinuteSec(row);
  if (schedWorkSec == null) return 0;
  const rendSec = parseDurationToMinuteSec(resolveEntryRenderedTotal(entry, moduleType));
  return Math.max(0, schedWorkSec - rendSec);
};

const buildMinuteBucketResult = ({
  absentDays,
  halfDays,
  absentSecTotal,
  halfDayShortfallSecTotal,
  lateShortfallSecTotal,
  lateTotalDisplaySec,
}) => {
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
    absentTime: formatDurationHhMm(absentSecTotal),
    halfDayShortfallTime: formatDurationHhMm(halfDayShortfallSecTotal),
    lateShortfallTime: formatDurationHhMm(lateShortfallSecTotal),
    lateTotalDisplayTime: formatDurationHhMm(lateTotalDisplaySec),
    overallShortfallTime: formatDurationHhMm(overallShortfallSecTotal),
  };
};

/** AM/PM split modules (Non-Teaching, Designated) — minute-only buckets. */
export const computeAmPmMinuteBuckets = (
  rows,
  reviewByDate,
  calendarMaps,
  moduleType,
  { hasNoPunchesFn = hasNoPunches } = {},
) => {
  let absentDays = 0;
  let halfDays = 0;
  let absentSecTotal = 0;
  let halfDayShortfallSecTotal = 0;
  let lateShortfallSecTotal = 0;
  let lateTotalDisplaySec = 0;

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const d = normalizeReviewDate(row?.date);
    if (calendarMaps && isExcludedAttendanceCalendarDate(d, calendarMaps)) return;
    if (!isScheduledByOfficialTime(row)) return;
    const schedWorkSec = getOfficialSchedWorkMinuteSec(row);
    if (schedWorkSec == null) return;

    if (hasNoPunchesFn(row)) {
      absentDays += 1;
      absentSecTotal += schedWorkSec;
      return;
    }

    const entry = reviewByDate?.[d];
    if (entry?.status === HALF_DAY_STATUS.APPROVED && hasHrHalfDayConfirmation(entry)) {
      halfDays += 1;
      halfDayShortfallSecTotal += computeApprovedHalfDayShortfallMinuteSec(row, entry, moduleType);
      // Half-day shortfall goes to Overall only — not Late Total
      return;
    }

    if (entry?.status === HALF_DAY_STATUS.REJECTED) {
      const rej = getRejectedHalfDayLateMinuteSec(entry, moduleType);
      lateShortfallSecTotal += rej;
      lateTotalDisplaySec += rej;
      return;
    }

    const punchLate = getAmPmSlotLateMinuteSec(row);
    lateShortfallSecTotal += punchLate;
    lateTotalDisplaySec += punchLate;
  });

  return buildMinuteBucketResult({
    absentDays,
    halfDays,
    absentSecTotal,
    halfDayShortfallSecTotal,
    lateShortfallSecTotal,
    lateTotalDisplaySec,
  });
};

/** Faculty 30hrs — punch-pattern half-day (Time IN only / Time OUT only); minute-only. */
export const computeFaculty30MinuteBuckets = (
  rows,
  reviewByDate,
  calendarMaps,
  { hasNoPunchesFn = hasNoPunchesTimeInOutOnly } = {},
) => {
  let absentDays = 0;
  let halfDays = 0;
  let absentSecTotal = 0;
  let halfDayShortfallSecTotal = 0;
  let lateShortfallSecTotal = 0;
  let lateTotalDisplaySec = 0;

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const d = normalizeReviewDate(row?.date);
    if (calendarMaps && isExcludedAttendanceCalendarDate(d, calendarMaps)) return;
    if (!isScheduledByOfficialTime(row)) return;
    const schedWorkSec = getOfficialSchedWorkMinuteSec(row);
    if (schedWorkSec == null) return;

    if (hasNoPunchesFn(row)) {
      absentDays += 1;
      absentSecTotal += schedWorkSec;
      return;
    }

    const entry = reviewByDate?.[d];
    if (entry?.status === HALF_DAY_STATUS.APPROVED && hasHrHalfDayConfirmation(entry)) {
      halfDays += 1;
      halfDayShortfallSecTotal += computeApprovedHalfDayShortfallMinuteSec(
        row,
        entry,
        MODULE_TYPES.FACULTY_30HRS,
      );
      // Half-day shortfall → Overall only; do not add to Late Total
      return;
    }

    if (entry?.status === HALF_DAY_STATUS.REJECTED) {
      const rej = getRejectedHalfDayLateMinuteSec(entry, MODULE_TYPES.FACULTY_30HRS);
      lateShortfallSecTotal += rej;
      lateTotalDisplaySec += rej;
      return;
    }

    const isHalfDay = isHalfDayByTimeInOutOnly(row);
    if (isHalfDay) {
      halfDays += 1;
      halfDayShortfallSecTotal += Math.max(0, schedWorkSec - Math.floor(schedWorkSec / 2));
      // Suggested / punch half-day shortfall is Half Days, not Late Total
      return;
    }

    // Full day: use the same late as the table (arrival late + early leave),
    // not schedule-duration minus (Time OUT − Time IN).
    const punchLate = getFaculty30TableLateMinuteSec(row);
    lateShortfallSecTotal += punchLate;
    lateTotalDisplaySec += punchLate;
  });

  return buildMinuteBucketResult({
    absentDays,
    halfDays,
    absentSecTotal,
    halfDayShortfallSecTotal,
    lateShortfallSecTotal,
    lateTotalDisplaySec,
  });
};

/** Match Faculty 30hrs table Total Tardiness (lateTotal / final calc). */
export const getFaculty30TableLateMinuteSec = (row) => {
  if (row?.lateTotal != null && String(row.lateTotal).trim() !== '') {
    return parseDurationToMinuteSec(row.lateTotal);
  }
  if (
    row?.formattedfinalcalcFaculty != null &&
    String(row.formattedfinalcalcFaculty).trim() !== '' &&
    row.formattedfinalcalcFaculty !== 'NaN:NaN:NaN'
  ) {
    return parseDurationToMinuteSec(row.formattedfinalcalcFaculty);
  }
  const offIn = parseClockToMinuteSec(row?.officialTimeIN);
  const offOut = parseClockToMinuteSec(row?.officialTimeOUT);
  const inSec = parseClockToMinuteSec(row?.timeIN);
  const outSec = parseClockToMinuteSec(row?.timeOUT);
  if (offIn == null || offOut == null || inSec == null || outSec == null) return 0;
  return Math.max(0, inSec - offIn) + Math.max(0, offOut - outSec);
};

export const getRowTotalRenderedMinuteDisplay = (
  row,
  reviewByDate,
  moduleType,
  isFurlough,
  calendarMaps = null,
) => {
  if (isFurlough) {
    return displayDurationHhMm(getRowMaxRenderedTotal(row, moduleType));
  }
  const d = normalizeReviewDate(row?.date);
  const entry = reviewByDate?.[d];
  if (entry?.status === HALF_DAY_STATUS.APPROVED && hasHrHalfDayConfirmation(entry)) {
    const hr = entry?.renderedTotal ?? entry?.renderedRegular ?? entry?.renderedMorning;
    if (hr) return displayDurationHhMm(hr);
  }
  if (isHalfDayPendingHrReview(row, reviewByDate, moduleType, calendarMaps)) {
    return ZERO_HM;
  }
  if (moduleType === MODULE_TYPES.FACULTY_30HRS) {
    if (!row?.officialTimeIN || !row?.timeOUT || row?.formattedFacultyRenderedTime === 'NaN:NaN:NaN') {
      return ZERO_HM;
    }
    return displayDurationHhMm(row.formattedFacultyRenderedTime);
  }
  const am =
    !row?.officialTimeIN || row?.formattedFacultyRenderedTimeAM === 'NaN:NaN:NaN'
      ? ZERO_HM
      : displayDurationHhMm(row.formattedFacultyRenderedTimeAM);
  const pm =
    !row?.officialTimeOUT || !row?.timeOUT || row?.formattedFacultyRenderedTimePM === 'NaN:NaN:NaN'
      ? ZERO_HM
      : displayDurationHhMm(row.formattedFacultyRenderedTimePM);
  return addTimeHhMmOnly(am, pm);
};

export const getRowTotalTardinessMinuteDisplay = (
  row,
  reviewByDate,
  moduleType,
  isFurlough,
  fallbackTotal,
  calendarMaps = null,
  { hasNoPunchesFn = hasNoPunches } = {},
) => {
  if (isFurlough) return ZERO_HM;
  const d = normalizeReviewDate(row?.date);
  if (calendarMaps && isExcludedAttendanceCalendarDate(d, calendarMaps)) return ZERO_HM;
  if (isScheduledByOfficialTime(row) && hasNoPunchesFn(row)) {
    const schedWorkSec = getOfficialSchedWorkMinuteSec(row);
    if (schedWorkSec != null) return formatDurationHhMm(schedWorkSec);
  }
  const entry = reviewByDate?.[d];
  if (entry?.status === HALF_DAY_STATUS.REJECTED) {
    const eff = getEffectiveTardinessFromReview(entry, moduleType);
    if (moduleType === MODULE_TYPES.FACULTY_30HRS) {
      if (eff?.regular || eff?.total) return displayDurationHhMm(eff.regular ?? eff.total);
    } else if (eff?.total) {
      return displayDurationHhMm(eff.total);
    }
  }
  if (entry?.status === HALF_DAY_STATUS.APPROVED && hasHrHalfDayConfirmation(entry)) {
    return formatDurationHhMm(computeApprovedHalfDayShortfallMinuteSec(row, entry, moduleType));
  }
  return displayDurationHhMm(fallbackTotal ?? ZERO_HM);
};

export const normalizeFacultyRowDurations = (row) => ({
  ...row,
  lateTotal: displayDurationHhMm(row.lateTotal),
  undertimeTotal: displayDurationHhMm(row.undertimeTotal),
  formattedfinalcalcFaculty: displayDurationHhMm(row.formattedfinalcalcFaculty),
  formattedFacultyRenderedTime: displayDurationHhMm(row.formattedFacultyRenderedTime),
  formattedFacultyMaxRenderedTime: displayDurationHhMm(row.formattedFacultyMaxRenderedTime),
  formattedfinalcalcFacultyAM: displayDurationHhMm(row.formattedfinalcalcFacultyAM),
  formattedfinalcalcFacultyPM: displayDurationHhMm(row.formattedfinalcalcFacultyPM),
  formattedFacultyRenderedTimeAM: displayDurationHhMm(row.formattedFacultyRenderedTimeAM),
  formattedFacultyRenderedTimePM: displayDurationHhMm(row.formattedFacultyRenderedTimePM),
  formattedFacultyMaxRenderedTimeAM: displayDurationHhMm(row.formattedFacultyMaxRenderedTimeAM),
  formattedFacultyMaxRenderedTimePM: displayDurationHhMm(row.formattedFacultyMaxRenderedTimePM),
  formattedFacultyRenderedTimeHN: displayDurationHhMm(row.formattedFacultyRenderedTimeHN),
  formattedFacultyMaxRenderedTimeHN: displayDurationHhMm(row.formattedFacultyMaxRenderedTimeHN),
  formattedfinalcalcFacultyHN: displayDurationHhMm(row.formattedfinalcalcFacultyHN),
  formattedFacultyRenderedTimeSC: displayDurationHhMm(row.formattedFacultyRenderedTimeSC),
  formattedFacultyMaxRenderedTimeSC: displayDurationHhMm(row.formattedFacultyMaxRenderedTimeSC),
  formattedfinalcalcFacultySC: displayDurationHhMm(row.formattedfinalcalcFacultySC),
  formattedFacultyRenderedTimeOT: displayDurationHhMm(row.formattedFacultyRenderedTimeOT),
  formattedFacultyMaxRenderedTimeOT: displayDurationHhMm(row.formattedFacultyMaxRenderedTimeOT),
  formattedfinalcalcFacultyOT: displayDurationHhMm(row.formattedfinalcalcFacultyOT),
});
