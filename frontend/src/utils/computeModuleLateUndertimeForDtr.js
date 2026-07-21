/**
 * Compute daily late/undertime using the same formulas as the three attendance
 * modules, then persist to overall_attendance_record (daily-late-undertime only).
 * Used by DailyTimeRecordOverall so DTR Late/Undertime columns update without
 * a full "Save to summary".
 */
import axios from 'axios';
import API_BASE_URL from '../apiConfig';
import {
  MODULE_TYPES,
  buildReviewByDate,
  parseHalfDayReviewJson,
  migrateLegacyHalfDayReview,
  getApprovedHalfDayDatesSet,
  buildHalfDayReviewArray,
} from './halfDayReview';
import {
  buildDailyLateUndertimeRows,
  persistDailyLateUndertimeFromModule,
  fetchDailyLateUndertime,
  rowsToByDateMap,
} from './dtrLateUndertimeFromOverall';
import { applyFacultyPunchGatedBreaktimes } from './facultyBreaktimeFromPunches';
import { fetchAttendanceCalendarMaps } from '../components/ATTENDANCE/attendanceLeaveIntegration';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

const ZERO = '00:00:00';

const dateOnly = (val) => (val ? String(val).split('T')[0] : '');

const dedupeOnePerDate = (rows) => {
  const seen = new Set();
  return (rows || []).filter((row) => {
    const d = dateOnly(row.date);
    if (!d) return true;
    if (seen.has(d)) return false;
    seen.add(d);
    return true;
  });
};

const filterRowsInOwnRange = (rows) =>
  (rows || []).filter((row) => {
    const d = dateOnly(row.date);
    const start = dateOnly(row.startDate);
    const end = dateOnly(row.endDate);
    if (!d) return true;
    if (!start || !end) return true;
    return d >= start && d <= end;
  });

// ─── Non-Teaching (AM + PM segment tardiness → lateTotal) ────────────────────

const calcNonTeachingSegment = (startStr, endStr, officialStartStr, officialEndStr) => {
  const parseTimeToSeconds = (timeStr) => {
    if (!timeStr || timeStr === '—') return null;
    const trimmed = String(timeStr).trim();
    const m = trimmed.match(/^(\d{1,2}):(\d{2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!m) return null;
    let hh = Number(m[1]);
    const mm = Number(m[2]);
    const ss = Number(m[3]);
    const mer = (m[4] || '').toUpperCase();
    if ([hh, mm, ss].some(Number.isNaN)) return null;
    if (mer) {
      if (hh === 12) hh = 0;
      if (mer === 'PM') hh += 12;
    }
    return hh * 3600 + mm * 60;
  };
  const formatSeconds = (secs) => {
    const safe = Math.max(0, Number(secs) || 0);
    const h = Math.floor(safe / 3600);
    const m2 = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    return [h, m2, s].map((x) => String(x).padStart(2, '0')).join(':');
  };
  const normalizeEnd = (startSec, endSec) => {
    if (startSec == null || endSec == null) return endSec;
    let fixedEnd = endSec;
    while (fixedEnd <= startSec) fixedEnd += 12 * 3600;
    return fixedEnd;
  };
  const startSec = parseTimeToSeconds(startStr);
  const endSecRaw = parseTimeToSeconds(endStr);
  const offStartSec = parseTimeToSeconds(officialStartStr);
  const offEndSecRaw = parseTimeToSeconds(officialEndStr);
  if (offStartSec == null || offEndSecRaw == null) {
    return { tardiness: ZERO };
  }
  const offEndSec = normalizeEnd(offStartSec, offEndSecRaw);
  const endSec = normalizeEnd(startSec ?? offStartSec, endSecRaw);
  const maxRenderedSec = Math.max(0, offEndSec - offStartSec);
  let renderedSec = 0;
  if (startSec != null && endSec != null) {
    renderedSec = Math.max(
      0,
      Math.min(endSec, offEndSec) - Math.max(startSec, offStartSec),
    );
  }
  return { tardiness: formatSeconds(Math.max(0, maxRenderedSec - renderedSec)) };
};

const parseTardinessToSeconds = (t) => {
  if (!t || t === 'NaN:NaN:NaN' || t === '—') return 0;
  const parts = String(t).split(':').map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const s = parts[2] || 0;
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 3600 + m * 60 + (Number.isNaN(s) ? 0 : s);
};

const formatSecondsHms = (totalSeconds) => {
  const safe = Math.max(0, Number(totalSeconds) || 0);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':');
};

export const processNonTeachingLateUndertimeRows = (rawRows) =>
  (rawRows || []).map((row) => {
    const {
      timeIN,
      timeOUT,
      breaktimeIN,
      breaktimeOUT,
      officialBreaktimeIN,
      officialBreaktimeOUT,
      officialTimeIN,
      officialTimeOUT,
    } = row;
    const am = calcNonTeachingSegment(
      timeIN,
      breaktimeIN,
      officialTimeIN,
      officialBreaktimeIN,
    );
    const pm = calcNonTeachingSegment(
      breaktimeOUT,
      timeOUT,
      officialBreaktimeOUT,
      officialTimeOUT,
    );
    const lateTotal = formatSecondsHms(
      parseTardinessToSeconds(am.tardiness) + parseTardinessToSeconds(pm.tardiness),
    );
    return {
      ...row,
      lateTotal,
      undertimeTotal: row._undertimeTotal || ZERO,
    };
  });

// ─── Faculty 30hrs (full-day rendered vs schedule → lateTotal) ───────────────

const faculty30EmptyPunch = (v) => {
  if (v == null) return true;
  const normalized = String(v).trim().replace(/\s+/g, ' ').toLowerCase();
  return (
    !normalized ||
    normalized === '—' ||
    normalized === '-' ||
    normalized === '--' ||
    normalized === 'n/a' ||
    normalized === 'na' ||
    normalized === 'null' ||
    normalized === 'undefined'
  );
};

const truncateMsToMinutes = (ms) => Math.floor(Math.max(0, ms) / 60000) * 60000;
const formatDurationMsNoSeconds = (ms) => {
  if (!Number.isFinite(ms)) return ZERO;
  const truncated = truncateMsToMinutes(ms);
  const totalSeconds = Math.floor(truncated / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':');
};
const tardinessMsFromLateFloorEarlyCeil = (lateRawMs, earlyRawMs) => {
  const lateMs = truncateMsToMinutes(lateRawMs);
  const earlyMs = earlyRawMs <= 0 ? 0 : Math.ceil(earlyRawMs / 60000) * 60000;
  return lateMs + earlyMs;
};

export const processFaculty30LateUndertimeRows = (rawRows) => {
  const onePerDate = dedupeOnePerDate(filterRowsInOwnRange(rawRows));
  return onePerDate.map((row) => {
    const {
      timeIN,
      timeOUT,
      breaktimeIN,
      breaktimeOUT,
      officialBreaktimeIN,
      officialBreaktimeOUT,
      officialTimeIN,
      officialTimeOUT,
    } = row;

    applyFacultyPunchGatedBreaktimes({
      timeIN,
      timeOUT,
      breaktimeIN,
      breaktimeOUT,
      officialBreaktimeIN,
      officialBreaktimeOUT,
    });

    const startOfficialTimeFaculty = new Date(`01/01/2000 ${officialTimeIN}`);
    const endOfficialTimeFaculty = new Date(`01/01/2000 ${officialTimeOUT}`);
    const diffMsFaculty = endOfficialTimeFaculty - startOfficialTimeFaculty;

    if (faculty30EmptyPunch(timeIN) || faculty30EmptyPunch(timeOUT)) {
      const halfSchedSec =
        faculty30EmptyPunch(timeIN) && faculty30EmptyPunch(timeOUT)
          ? diffMsFaculty
          : Math.floor(diffMsFaculty / 2);
      const tardWhenSinglePunch = formatDurationMsNoSeconds(Math.max(0, halfSchedSec));
      return {
        ...row,
        lateTotal: tardWhenSinglePunch,
        undertimeTotal: ZERO,
      };
    }

    const startDateFaculty = new Date(`01/01/2000 ${timeIN}`);
    const endDateFaculty = new Date(`01/01/2000 ${timeOUT}`);
    const midnightFaculty = new Date(`01/01/2000 00:00:00 AM`);
    const timeinfaculty =
      startDateFaculty > endOfficialTimeFaculty
        ? midnightFaculty
        : startDateFaculty < startOfficialTimeFaculty
          ? startOfficialTimeFaculty
          : startDateFaculty;
    const timeoutfaculty =
      timeinfaculty === midnightFaculty
        ? midnightFaculty
        : endDateFaculty < endOfficialTimeFaculty
          ? endDateFaculty
          : endOfficialTimeFaculty;
    const isMidnightEdge = timeinfaculty.getTime() === midnightFaculty.getTime();
    const lateRawMs = isMidnightEdge
      ? 0
      : Math.max(0, timeinfaculty - startOfficialTimeFaculty);
    const earlyRawMs = isMidnightEdge
      ? 0
      : Math.max(0, endOfficialTimeFaculty - timeoutfaculty);
    const lateTotal = formatDurationMsNoSeconds(
      tardinessMsFromLateFloorEarlyCeil(lateRawMs, earlyRawMs),
    );
    return {
      ...row,
      lateTotal,
      undertimeTotal: ZERO,
    };
  });
};

// ─── Designated 40hrs (AM → late, PM → undertime) ────────────────────────────

const parseAttendanceTimeOn2000 = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return new Date(NaN);
  const d = new Date(`01/01/2000 ${timeStr}`);
  if (Number.isNaN(d.getTime())) return d;
  d.setSeconds(0, 0);
  return d;
};

const formatDurationMsToHhMmSs = (diffMs) => {
  if (!Number.isFinite(diffMs)) return ZERO;
  return [
    Math.floor(diffMs / 3600000),
    Math.floor((diffMs % 3600000) / 60000),
    Math.floor((diffMs % 60000) / 1000),
  ]
    .map((x) => String(x).padStart(2, '0'))
    .join(':');
};

export const processDesignatedLateUndertimeRows = (rawRows) =>
  (rawRows || []).map((row) => {
    const {
      timeIN,
      timeOUT,
      breaktimeIN,
      breaktimeOUT,
      officialBreaktimeIN,
      officialBreaktimeOUT,
      officialTimeIN,
      officialTimeOUT,
    } = row;

    const {
      noTimeIn: noAmPunch,
      noTimeOut: noPmPunch,
      scheduleBreakIn,
      scheduleBreakOut,
      effectiveBreaktimeIN,
      effectiveBreaktimeOUT,
    } = applyFacultyPunchGatedBreaktimes({
      timeIN,
      timeOUT,
      breaktimeIN,
      breaktimeOUT,
      officialBreaktimeIN,
      officialBreaktimeOUT,
    });

    const schedMidpoint = parseAttendanceTimeOn2000(
      scheduleBreakIn ?? effectiveBreaktimeIN ?? officialBreaktimeIN,
    );
    const punchInTime = !noAmPunch ? parseAttendanceTimeOn2000(timeIN) : null;
    const punchInIsPmSide =
      punchInTime != null &&
      !Number.isNaN(schedMidpoint.getTime()) &&
      punchInTime >= schedMidpoint;

    const pmSideLonePunch = !noAmPunch && noPmPunch && punchInIsPmSide;
    const effectiveNoPmPunch = noPmPunch && !punchInIsPmSide;
    const hasOnlyMorningPunch = !noAmPunch && noPmPunch && !punchInIsPmSide;

    let formattedfinalcalcFacultyAM = ZERO;
    if (!pmSideLonePunch) {
      const startOfficialTimeFacultyAM = parseAttendanceTimeOn2000(officialTimeIN);
      const endOfficialTimeFacultyAM = parseAttendanceTimeOn2000(
        effectiveBreaktimeIN ?? scheduleBreakIn ?? officialBreaktimeIN,
      );
      const diffMsAMMax = endOfficialTimeFacultyAM - startOfficialTimeFacultyAM;
      const formattedFacultyMaxRenderedTimeAM = formatDurationMsToHhMmSs(diffMsAMMax);
      const midnightFacultyAM = new Date('01/01/2000 00:00:00 AM');
      let timeinfacultyAM;
      let timeoutfacultyAM;
      if (noAmPunch) {
        timeinfacultyAM = midnightFacultyAM;
        timeoutfacultyAM = midnightFacultyAM;
      } else {
        const startDateFacultyAM = parseAttendanceTimeOn2000(timeIN);
        const endDateFacultyAM = parseAttendanceTimeOn2000(
          effectiveBreaktimeIN ?? scheduleBreakIn ?? officialBreaktimeIN,
        );
        timeinfacultyAM =
          startDateFacultyAM > endOfficialTimeFacultyAM
            ? midnightFacultyAM
            : startDateFacultyAM < startOfficialTimeFacultyAM
              ? startOfficialTimeFacultyAM
              : startDateFacultyAM;
        timeoutfacultyAM =
          timeinfacultyAM === midnightFacultyAM
            ? midnightFacultyAM
            : endDateFacultyAM;
      }
      const formattedFacultyRenderedTimeAM = formatDurationMsToHhMmSs(
        timeoutfacultyAM - timeinfacultyAM,
      );
      const tardAM =
        parseAttendanceTimeOn2000(formattedFacultyMaxRenderedTimeAM) -
        parseAttendanceTimeOn2000(formattedFacultyRenderedTimeAM);
      formattedfinalcalcFacultyAM = formatDurationMsToHhMmSs(tardAM);
    }

    let formattedfinalcalcFacultyPM = ZERO;
    if (!hasOnlyMorningPunch) {
      const startOfficialTimeFacultyPM = parseAttendanceTimeOn2000(
        effectiveBreaktimeOUT ?? scheduleBreakOut ?? officialBreaktimeOUT,
      );
      const endOfficialTimeFacultyPM = parseAttendanceTimeOn2000(officialTimeOUT);
      const formattedFacultyMaxRenderedTimePM = formatDurationMsToHhMmSs(
        endOfficialTimeFacultyPM - startOfficialTimeFacultyPM,
      );
      const midnightFacultyPM = new Date('01/01/2000 00:00:00 PM');
      let timeinfacultyPM;
      let timeoutfacultyPM;
      if (effectiveNoPmPunch) {
        timeoutfacultyPM = midnightFacultyPM;
        timeinfacultyPM = midnightFacultyPM;
      } else {
        const startDateFacultyPM = parseAttendanceTimeOn2000(
          effectiveBreaktimeOUT ?? scheduleBreakOut ?? officialBreaktimeOUT,
        );
        const endDateFacultyPM = parseAttendanceTimeOn2000(timeOUT);
        timeoutfacultyPM =
          endDateFacultyPM < startOfficialTimeFacultyPM
            ? midnightFacultyPM
            : endDateFacultyPM > endOfficialTimeFacultyPM
              ? endOfficialTimeFacultyPM
              : endDateFacultyPM;
        timeinfacultyPM =
          timeoutfacultyPM === midnightFacultyPM
            ? midnightFacultyPM
            : startDateFacultyPM;
      }
      const formattedFacultyRenderedTimePM = formatDurationMsToHhMmSs(
        timeoutfacultyPM - timeinfacultyPM,
      );
      const tardPM =
        parseAttendanceTimeOn2000(formattedFacultyMaxRenderedTimePM) -
        parseAttendanceTimeOn2000(formattedFacultyRenderedTimePM);
      formattedfinalcalcFacultyPM = formatDurationMsToHhMmSs(tardPM);
    }

    return {
      ...row,
      lateTotal: formattedfinalcalcFacultyAM,
      undertimeTotal: formattedfinalcalcFacultyPM,
    };
  });

const MODULE_PROCESSORS = {
  [MODULE_TYPES.NON_TEACHING]: processNonTeachingLateUndertimeRows,
  [MODULE_TYPES.FACULTY_30HRS]: processFaculty30LateUndertimeRows,
  [MODULE_TYPES.DESIGNATED_40HRS]: processDesignatedLateUndertimeRows,
};

export const MODULE_LATE_BUTTONS = [
  {
    key: MODULE_TYPES.NON_TEACHING,
    label: 'Non-Teaching',
    tip: 'Apply Non-Teaching late/undertime computation to this DTR',
  },
  {
    key: MODULE_TYPES.FACULTY_30HRS,
    label: 'Faculty 30hrs',
    tip: 'Apply Faculty 30hrs late/undertime computation to this DTR',
  },
  {
    key: MODULE_TYPES.DESIGNATED_40HRS,
    label: 'Designated',
    tip: 'Apply Designated (40hrs) late/undertime computation to this DTR',
  },
];

/** Map employment category → attendance module late/undertime type. */
export function resolveModuleTypeFromEmploymentCategory(categoryOrMeta) {
  if (categoryOrMeta == null || categoryOrMeta === '') return null;

  if (typeof categoryOrMeta === 'object') {
    const id = categoryOrMeta.employmentCategory ?? categoryOrMeta.id;
    if (id != null && id !== '') {
      const fromId = resolveModuleTypeFromEmploymentCategory(id);
      if (fromId) return fromId;
    }
    const label = String(
      categoryOrMeta.label ||
        categoryOrMeta.typeName ||
        categoryOrMeta.categoryLabel ||
        '',
    ).toLowerCase();
    if (/\b30\b|30\s*hr|teaching\s*\(30/.test(label)) {
      return MODULE_TYPES.FACULTY_30HRS;
    }
    if (/designated|40\s*hr/.test(label)) return MODULE_TYPES.DESIGNATED_40HRS;
    if (/non[-\s]?teaching/.test(label)) return MODULE_TYPES.NON_TEACHING;
    return null;
  }

  const n = Number(categoryOrMeta);
  if (!Number.isNaN(n)) {
    if (n === 2) return MODULE_TYPES.NON_TEACHING;
    if (n === 3) return MODULE_TYPES.FACULTY_30HRS;
    if (n === 4) return MODULE_TYPES.DESIGNATED_40HRS;
  }

  const s = String(categoryOrMeta).toLowerCase();
  if (/\b30\b|30\s*hr|teaching\s*\(30/.test(s)) return MODULE_TYPES.FACULTY_30HRS;
  if (/designated|40\s*hr/.test(s)) return MODULE_TYPES.DESIGNATED_40HRS;
  if (/non[-\s]?teaching/.test(s)) return MODULE_TYPES.NON_TEACHING;
  return null;
}

export function getModuleLateButtonMeta(moduleType) {
  return MODULE_LATE_BUTTONS.find((b) => b.key === moduleType) || null;
}

/**
 * Fetch attendance punches + official time, run the selected module formula,
 * persist daily late/undertime, and return maps for DTR state.
 */
export async function computeAndApplyModuleLateUndertime({
  personID,
  startDate,
  endDate,
  moduleType,
}) {
  if (!personID || !startDate || !endDate) {
    throw new Error('Employee and date range are required.');
  }
  const mod =
    typeof moduleType === 'string' && MODULE_PROCESSORS[moduleType]
      ? moduleType
      : MODULE_TYPES.NON_TEACHING;
  const processRows = MODULE_PROCESSORS[mod];

  const [attendanceRes, maps, stored] = await Promise.all([
    axios.get(`${API_BASE_URL}/attendance/api/attendance`, {
      params: { personId: personID, startDate, endDate },
      ...getAuthHeaders(),
    }),
    fetchAttendanceCalendarMaps({
      apiBaseUrl: API_BASE_URL,
      getAuthHeaders,
      startDate,
      endDate,
      personId: personID,
    }),
    fetchDailyLateUndertime(personID, startDate, endDate),
  ]);

  const rawRows = Array.isArray(attendanceRes.data) ? attendanceRes.data : [];
  if (rawRows.length === 0) {
    throw new Error(
      'No attendance or Official Time rows for this period. Set Official Time / sync device records first.',
    );
  }

  const processedData = processRows(rawRows);
  const calendarMaps = {
    suspensionByDate: maps.suspensionByDate,
    holidayByDate: maps.holidayByDate,
    leaveByDate: maps.leaveByDate,
  };
  const reviewByDate = migrateLegacyHalfDayReview(
    buildReviewByDate(parseHalfDayReviewJson(stored?.half_day_review)),
    stored?.halfDayDates ?? '',
    processedData,
    mod,
    calendarMaps,
  );
  const approvedSet = getApprovedHalfDayDatesSet(reviewByDate);
  const rows = buildDailyLateUndertimeRows(
    processedData,
    approvedSet,
    reviewByDate,
    mod,
  );

  await persistDailyLateUndertimeFromModule({
    personID,
    startDate,
    endDate,
    moduleType: mod,
    rows,
    halfDayDates: [...approvedSet].join(', '),
    half_day_review: buildHalfDayReviewArray(reviewByDate),
  });

  return {
    byDate: rowsToByDateMap(rows),
    halfDayDates: [...approvedSet].join(', '),
    half_day_review: buildHalfDayReviewArray(reviewByDate),
    computation_module_type: mod,
  };
}
