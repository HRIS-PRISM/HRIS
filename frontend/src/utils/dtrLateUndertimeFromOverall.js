import axios from 'axios';
import API_BASE_URL from '../apiConfig';
import {
  HALF_DAY_STATUS,
  MODULE_TYPES,
  normalizeReviewDate,
  getEffectiveTardinessFromReview,
  hasHrHalfDayConfirmation,
  buildReviewByDate,
  parseHalfDayReviewJson,
  getApprovedHalfDayDatesSet,
  buildHalfDayReviewArray,
  isHalfDayPendingHrReview,
} from './halfDayReview';
import { isScheduledByOfficialTime } from './officialAttendanceFromDailyRows';

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** Calendar weekday name for YYYY-MM-DD (Asia/Manila), e.g. Sunday for unscheduled rest days. */
export const getDayNameFromYmd = (ymd) => {
  const s = String(ymd ?? '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  try {
    const d = new Date(`${s}T12:00:00+08:00`);
    if (Number.isNaN(d.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      weekday: 'long',
    }).formatToParts(d);
    return parts.find((p) => p.type === 'weekday')?.value || '';
  } catch {
    return WEEKDAY_NAMES[new Date(`${s}T12:00:00`).getDay()] || '';
  }
};

/** True when at least one weekday in the map has official Time IN/OUT. */
export const hasAnyOfficialScheduleDay = (officialTimesByDay) => {
  if (!officialTimesByDay || typeof officialTimesByDay !== 'object') return false;
  return Object.values(officialTimesByDay).some((row) =>
    isScheduledByOfficialTime(row),
  );
};

/**
 * True when Official Time Form covers this calendar day (matches attendance modules).
 * If no official schedule is loaded/configured at all, returns true so DTR keeps the
 * blank original grid instead of marking every day as NON-WORKING DAY.
 */
export const isDtrDateScheduledByOfficialTime = ({
  record,
  officialTimesByDay,
  fullDate,
}) => {
  if (isScheduledByOfficialTime(record)) return true;
  if (!hasAnyOfficialScheduleDay(officialTimesByDay)) return true;
  const dayName = getDayNameFromYmd(fullDate);
  if (dayName) {
    return isScheduledByOfficialTime(officialTimesByDay[dayName]);
  }
  return true;
};

/** Half-day suggested or not HR-confirmed — DTR must not show late/undertime yet. */
export const isDtrHalfDayLateUndertimePending = ({
  record,
  fullDate,
  reviewByDate,
  moduleType = MODULE_TYPES.NON_TEACHING,
}) => {
  const row = record || (fullDate ? { date: fullDate } : null);
  if (!row) return false;
  return isHalfDayPendingHrReview(row, reviewByDate || {}, moduleType);
};

const STORAGE_KEY = 'dtrComputedDailyLate';
const UPDATE_EVENT = 'dtrComputedDailyLateUpdated';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
};

export const stripSecondsFromDuration = (value) => {
  const s = String(value ?? '').trim();
  if (!s) return '';
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})$/);
  if (m) return `${m[1]}:${m[2]}`;
  return s;
};

/** Invalid / legacy bad values from duration math with no punches → treat as empty. */
export const sanitizeDurationHhMmSs = (value, { fallback = '00:00:00' } = {}) => {
  const s = String(value ?? '').trim();
  if (!s) return fallback;
  if (s === 'NaN:NaN:NaN' || /NaN/i.test(s)) return fallback;
  const parts = s.split(':').map((p) => Number(String(p).trim()));
  if (parts.length >= 2 && parts.some((n) => Number.isNaN(n))) return fallback;
  return s;
};

/** Hide zero-like values so empty late/undertime cells stay blank on DTR. */
export const formatLateUndertimeDisplay = (value) => {
  const s = sanitizeDurationHhMmSs(value, { fallback: '' });
  if (!s) return '';
  if (s === '0' || s === '00:00' || s === '00:00:00') return '';

  const hhmmss = s.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (hhmmss) {
    const h = parseInt(hhmmss[1], 10) || 0;
    const m = parseInt(hhmmss[2], 10) || 0;
    const sec = parseInt(hhmmss[3], 10) || 0;
    if (h === 0 && m === 0 && sec === 0) return '';
  }

  const hhmm = s.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    const h = parseInt(hhmm[1], 10) || 0;
    const m = parseInt(hhmm[2], 10) || 0;
    if (h === 0 && m === 0) return '';
  }

  return stripSecondsFromDuration(s);
};

/**
 * DTR Late/Undertime: show only for full days, HR-confirmed half-days, or rejected half-days.
 * Pending/suggested half-days stay blank (matches attendance modules).
 */
export const resolveDtrLateUndertimeDisplay = ({
  computed,
  record,
  isExcludedDay,
  hasIncompletePunch,
  isNotScheduledDay = false,
  isPendingHalfDay = false,
}) => {
  if (isNotScheduledDay || isPendingHalfDay) {
    return { lateDisplay: '', undertimeDisplay: '' };
  }
  const lateRaw = computed?.lateTotal ?? record?.hours ?? '';
  const undertimeRaw = computed?.undertimeTotal ?? record?.minutes ?? '';
  const lateFmt = formatLateUndertimeDisplay(lateRaw);
  const undertimeFmt = formatLateUndertimeDisplay(undertimeRaw);
  const hideLate = isExcludedDay || (hasIncompletePunch && !lateFmt);
  const hideUt = isExcludedDay || (hasIncompletePunch && !undertimeFmt);
  return {
    lateDisplay: hideLate ? '' : lateFmt,
    undertimeDisplay: hideUt ? '' : undertimeFmt,
  };
};

export const rowsToByDateMap = (rows) => {
  const map = {};
  (rows || []).forEach((r) => {
    const d = String(r.date || '').slice(0, 10);
    if (!d) return;
    const entry = {
      lateTotal: sanitizeDurationHhMmSs(r.lateTotal),
      undertimeTotal: sanitizeDurationHhMmSs(r.undertimeTotal),
    };
    const hash = String(r.inputHash || '').trim();
    if (hash) entry.inputHash = hash;
    map[d] = entry;
  });
  return map;
};

/**
 * Bump when late/undertime formula changes so stored values recompute.
 * Values stay sticky when punches + official times are unchanged.
 */
export const LATE_UNDERTIME_FORMULA_VERSION = 'v2-arrival-earlyleave';

const normLateInputClock = (v) => {
  if (v == null) return '';
  const s = String(v).trim();
  if (!s) return '';
  const lower = s.replace(/\s+/g, ' ').toLowerCase();
  if (
    lower === '—' ||
    lower === '-' ||
    lower === '--' ||
    lower === 'n/a' ||
    lower === 'na'
  ) {
    return '';
  }
  return s;
};

/** Fingerprint of inputs that drive late/undertime (not the computed result). */
export const buildLateUndertimeInputHash = (row) =>
  [
    LATE_UNDERTIME_FORMULA_VERSION,
    normLateInputClock(row?.timeIN),
    normLateInputClock(row?.breaktimeIN),
    normLateInputClock(row?.breaktimeOUT),
    normLateInputClock(row?.timeOUT),
    normLateInputClock(row?.officialTimeIN),
    normLateInputClock(row?.officialBreaktimeIN),
    normLateInputClock(row?.officialBreaktimeOUT),
    normLateInputClock(row?.officialTimeOUT),
  ].join('|');

/**
 * Keep stored late/undertime when input hash matches; otherwise use freshly computed.
 * Review overrides (approved / rejected / pending) always win (`skipStorageMerge`).
 */
export const mergeDailyLateUndertimeRowsWithStored = (rows, storedByDate) =>
  (rows || []).map((r) => {
    const date = String(r.date || '').slice(0, 10);
    const inputHash = r.inputHash || buildLateUndertimeInputHash(r);
    if (r.skipStorageMerge) {
      return { ...r, date, inputHash };
    }
    const stored = storedByDate?.[date];
    if (
      stored &&
      stored.inputHash &&
      stored.inputHash === inputHash &&
      stored.lateTotal != null
    ) {
      return {
        ...r,
        date,
        inputHash,
        lateTotal: sanitizeDurationHhMmSs(stored.lateTotal),
        undertimeTotal: sanitizeDurationHhMmSs(stored.undertimeTotal),
      };
    }
    return { ...r, date, inputHash };
  });

/**
 * Re-apply stored late/undertime onto module attendance rows when inputs unchanged.
 */
export const applyStoredLateUndertimeToAttendanceRows = (rows, storedByDate) =>
  (rows || []).map((row) => {
    const date = normalizeReviewDate(row?.date);
    const inputHash = buildLateUndertimeInputHash(row);
    const stored = date ? storedByDate?.[date] : null;
    if (
      !stored ||
      !stored.inputHash ||
      stored.inputHash !== inputHash ||
      stored.lateTotal == null
    ) {
      return { ...row, inputHash };
    }
    const lateTotal = sanitizeDurationHhMmSs(stored.lateTotal);
    const undertimeTotal = sanitizeDurationHhMmSs(stored.undertimeTotal);
    return {
      ...row,
      inputHash,
      lateTotal,
      undertimeTotal,
      formattedfinalcalcFacultyAM: lateTotal,
      formattedfinalcalcFacultyPM: undertimeTotal,
    };
  });

/** Parse halfDayDates string from overall_attendance_record (comma-separated YYYY-MM-DD). */
export const parseHalfDayDatesSet = (halfDayDatesStr) => {
  const set = new Set();
  if (!halfDayDatesStr) return set;
  const matches = String(halfDayDatesStr).match(/\d{4}-\d{2}-\d{2}/g) || [];
  matches.forEach((d) => set.add(d));
  return set;
};

/** HR-approved half day → zero late/undertime on DTR (deficiency charged in Earnings only). */
export const approvedHalfDayToDailyLateRow = (entry) => {
  if (!entry || !hasHrHalfDayConfirmation(entry)) return null;
  const z = '00:00:00';
  return { lateTotal: z, undertimeTotal: z };
};

/** Overlay approved half-day zeros onto DTR daily map (fixes legacy rows with computed tardiness). */
export const enrichDailyLateByDateFromReview = (
  byDate,
  reviewRaw,
  moduleType = MODULE_TYPES.NON_TEACHING,
) => {
  const map = { ...(byDate || {}) };
  const reviewByDate = buildReviewByDate(parseHalfDayReviewJson(reviewRaw));
  Object.values(reviewByDate).forEach((entry) => {
    const d = normalizeReviewDate(entry?.date);
    if (!d || entry?.status !== HALF_DAY_STATUS.APPROVED) return;
    if (!hasHrHalfDayConfirmation(entry)) return;
    const patch = approvedHalfDayToDailyLateRow(entry);
    if (patch) map[d] = patch;
  });
  return map;
};

/**
 * Build daily rows for DTR from processed attendance rows.
 * @param {Set<string>} approvedHalfDaySet — HR-approved half-day dates (HR tardiness on DTR)
 * @param {Record<string, object>} [reviewByDate] — rejected → HR tardiness; suggested → punch values
 * @param {string} [moduleType] — MODULE_TYPES.* for reject tardiness shape
 */
export const buildDailyLateUndertimeRows = (
  processedData,
  approvedHalfDaySet = new Set(),
  reviewByDate = null,
  moduleType = MODULE_TYPES.NON_TEACHING,
) => {
  return (processedData || []).map((r) => {
    const date = normalizeReviewDate(r.date);
    const inputHash = buildLateUndertimeInputHash(r);
    if (!isScheduledByOfficialTime(r)) {
      return {
        date,
        lateTotal: '00:00:00',
        undertimeTotal: '00:00:00',
        inputHash,
        skipStorageMerge: true,
      };
    }
    const entry = reviewByDate?.[date];
    if (
      (approvedHalfDaySet.has(date) ||
        (entry?.status === HALF_DAY_STATUS.APPROVED &&
          hasHrHalfDayConfirmation(entry))) &&
      entry
    ) {
      const approved = approvedHalfDayToDailyLateRow(entry);
      if (approved) {
        return {
          date,
          lateTotal: approved.lateTotal,
          undertimeTotal: approved.undertimeTotal,
          inputHash,
          skipStorageMerge: true,
        };
      }
    }
    if (entry?.status === HALF_DAY_STATUS.REJECTED) {
      const eff = getEffectiveTardinessFromReview(entry, moduleType);
      if (moduleType === MODULE_TYPES.FACULTY_30HRS) {
        return {
          date,
          lateTotal: eff?.regular || eff?.total || '00:00:00',
          undertimeTotal: '00:00:00',
          inputHash,
          skipStorageMerge: true,
        };
      }
      const am = eff?.morning;
      const pm = eff?.afternoon;
      const hasSplit =
        (am != null && String(am).trim() !== '' && am !== '00:00:00') ||
        (pm != null && String(pm).trim() !== '' && pm !== '00:00:00');
      if (hasSplit) {
        return {
          date,
          lateTotal: am || '00:00:00',
          undertimeTotal: pm || '00:00:00',
          inputHash,
          skipStorageMerge: true,
        };
      }
      return {
        date,
        lateTotal: eff?.total || '00:00:00',
        undertimeTotal: '00:00:00',
        inputHash,
        skipStorageMerge: true,
      };
    }
    if (isHalfDayPendingHrReview(r, reviewByDate || {}, moduleType)) {
      return {
        date,
        lateTotal: '00:00:00',
        undertimeTotal: '00:00:00',
        inputHash,
        skipStorageMerge: true,
      };
    }
    return {
      date,
      lateTotal: sanitizeDurationHhMmSs(r.lateTotal),
      undertimeTotal: sanitizeDurationHhMmSs(r.undertimeTotal),
      inputHash,
    };
  });
};

/**
 * Build daily late rows from review state and push to overall record (DTR source).
 * Call right after HR confirms half day so DTR shows tardiness without waiting for full save.
 */
export const persistHalfDayReviewDailyLate = async ({
  personID,
  startDate,
  endDate,
  moduleType,
  attendanceData,
  reviewByDate,
}) => {
  if (!personID || !startDate || !endDate) return;
  const review = reviewByDate || {};
  const approvedSet = getApprovedHalfDayDatesSet(review);
  const mod =
    typeof moduleType === 'string'
      ? moduleType
      : MODULE_TYPES.NON_TEACHING;
  const rows = buildDailyLateUndertimeRows(
    attendanceData,
    approvedSet,
    review,
    mod,
  );
  return persistDailyLateUndertimeFromModule({
    personID,
    startDate,
    endDate,
    moduleType: mod,
    rows,
    halfDayDates: [...approvedSet].join(', '),
    half_day_review: buildHalfDayReviewArray(review),
    /** Half-day confirm must write review overrides, not revive old punch late. */
    forceOverwrite: true,
  });
};

/**
 * Upsert daily late/undertime on overall_attendance_record.
 * By default keeps stored late/undertime when input hash is unchanged.
 */
export const persistDailyLateUndertimeFromModule = async ({
  personID,
  startDate,
  endDate,
  moduleType,
  rows,
  halfDayDates,
  half_day_review,
  forceOverwrite = false,
  storedByDate = null,
}) => {
  let mergedRows = (rows || []).map((r) => ({
    date: String(r.date).slice(0, 10),
    lateTotal: sanitizeDurationHhMmSs(r.lateTotal),
    undertimeTotal: sanitizeDurationHhMmSs(r.undertimeTotal),
    inputHash: r.inputHash || buildLateUndertimeInputHash(r),
    skipStorageMerge: Boolean(r.skipStorageMerge),
  }));

  if (!forceOverwrite) {
    let byDate = storedByDate;
    if (!byDate) {
      try {
        const stored = await fetchDailyLateUndertime(
          personID,
          startDate,
          endDate,
        );
        byDate = stored?.byDate || {};
      } catch {
        byDate = {};
      }
    }
    mergedRows = mergeDailyLateUndertimeRowsWithStored(mergedRows, byDate);
  }

  const payload = {
    personID: String(personID),
    startDate,
    endDate,
    moduleType,
    rows: mergedRows.map((r) => ({
      date: r.date,
      lateTotal: sanitizeDurationHhMmSs(r.lateTotal),
      undertimeTotal: sanitizeDurationHhMmSs(r.undertimeTotal),
      inputHash: r.inputHash || undefined,
    })),
    halfDayDates:
      halfDayDates != null && String(halfDayDates).trim() !== ''
        ? String(halfDayDates).trim()
        : undefined,
    half_day_review: half_day_review ?? undefined,
  };

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      employeeNumber: payload.personID,
      startDate: payload.startDate,
      endDate: payload.endDate,
      moduleType: payload.moduleType,
      rows: payload.rows,
      halfDayDates: payload.halfDayDates,
      half_day_review: payload.half_day_review,
    }),
  );
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));

  try {
    await axios.put(
      `${API_BASE_URL}/attendance/api/overall_attendance_record/daily-late-undertime`,
      payload,
      getAuthHeaders(),
    );
  } catch (err) {
    console.warn('Failed to persist daily late/undertime to overall record:', err?.message || err);
  }
};

/** @deprecated alias */
export const loadDtrComputedDailyLateFromStorage = (employeeNumber, startDate, endDate) => {
  const { byDate } = loadDailyLateFromStorage(employeeNumber, startDate, endDate);
  return byDate;
};

/** Remove browser cache for this employee/period (e.g. after overall_attendance_record deleted). */
export const clearDailyLateStorageForPeriod = (employeeNumber, startDate, endDate) => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (
      String(parsed.employeeNumber) === String(employeeNumber) &&
      parsed.startDate === startDate &&
      parsed.endDate === endDate
    ) {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  }
};

export const loadDailyLateFromStorage = (employeeNumber, startDate, endDate) => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { byDate: {}, halfDayDates: '' };
  try {
    const parsed = JSON.parse(raw);
    if (
      String(parsed.employeeNumber) !== String(employeeNumber) ||
      parsed.startDate !== startDate ||
      parsed.endDate !== endDate
    ) {
      return { byDate: {}, halfDayDates: '' };
    }
    const moduleType = parsed.moduleType || MODULE_TYPES.NON_TEACHING;
    return {
      byDate: enrichDailyLateByDateFromReview(
        rowsToByDateMap(parsed.rows),
        parsed.half_day_review,
        moduleType,
      ),
      halfDayDates: parsed.halfDayDates || '',
      half_day_review: parsed.half_day_review,
      computation_module_type: moduleType,
    };
  } catch {
    return { byDate: {}, halfDayDates: '' };
  }
};

const pickOverallForExactPeriod = (list, startDate, endDate) => {
  const sd = String(startDate).slice(0, 10);
  const ed = String(endDate).slice(0, 10);
  const rows = Array.isArray(list) ? list : [];
  const exact = rows.find(
    (r) =>
      String(r.startDate).slice(0, 10) === sd &&
      String(r.endDate).slice(0, 10) === ed,
  );
  if (exact) return exact;
  return (
    rows.find((r) => {
      const rs = String(r.startDate).slice(0, 10);
      const re = String(r.endDate).slice(0, 10);
      return rs <= ed && re >= sd;
    }) || null
  );
};

export const fetchDailyLateUndertime = async (employeeNumber, periodStart, periodEnd) => {
  try {
    const row = await fetchOverallAttendanceForPeriod(
      employeeNumber,
      periodStart,
      periodEnd,
    );
    if (!row) {
      // No DB record — do not restore HR-approved half-day from browser cache.
      clearDailyLateStorageForPeriod(employeeNumber, periodStart, periodEnd);
      return {
        byDate: {},
        halfDayDates: '',
        half_day_review: null,
        computation_module_type: MODULE_TYPES.NON_TEACHING,
      };
    }
    let byDate = {};
    if (row.daily_late_undertime != null) {
      if (typeof row.daily_late_undertime === 'string') {
        try {
          byDate = rowsToByDateMap(JSON.parse(row.daily_late_undertime));
        } catch {
          byDate = {};
        }
      } else if (Array.isArray(row.daily_late_undertime)) {
        byDate = rowsToByDateMap(row.daily_late_undertime);
      }
    }
    const moduleType =
      row.computation_module_type || MODULE_TYPES.NON_TEACHING;
    const enriched = enrichDailyLateByDateFromReview(
      byDate,
      row.half_day_review,
      moduleType,
    );
    return {
      byDate: enriched,
      halfDayDates: row.halfDayDates || '',
      half_day_review: row.half_day_review,
      computation_module_type: moduleType,
    };
  } catch (err) {
    console.warn('fetchDailyLateUndertime failed:', err?.message || err);
    const stored = loadDailyLateFromStorage(employeeNumber, periodStart, periodEnd);
    return stored;
  }
};

/** Fetch overall row for exact period (avoids range query returning wrong pay period). */
export const fetchOverallAttendanceForPeriod = async (
  employeeNumber,
  periodStart,
  periodEnd,
) => {
  const res = await axios.get(
    `${API_BASE_URL}/attendance/api/overall_attendance_record`,
    {
      params: { personID: employeeNumber, startDate: periodStart, endDate: periodEnd },
      ...getAuthHeaders(),
    },
  );
  return pickOverallForExactPeriod(res.data?.data, periodStart, periodEnd);
};

const BATCH_CHUNK = 150;

export const fetchDailyLateUndertimeBatch = async (
  employeeNumbers,
  periodStart,
  periodEnd,
) => {
  const ids = [...new Set((employeeNumbers || []).map((n) => String(n).trim()).filter(Boolean))];
  if (!ids.length || !periodStart || !periodEnd) {
    return {
      byEmployee: {},
      halfDayDatesByEmployee: {},
      halfDayReviewByEmployee: {},
      computationModuleTypeByEmployee: {},
    };
  }

  const byEmployee = {};
  const halfDayDatesByEmployee = {};
  const halfDayReviewByEmployee = {};
  const computationModuleTypeByEmployee = {};
  for (let i = 0; i < ids.length; i += BATCH_CHUNK) {
    const chunk = ids.slice(i, i + BATCH_CHUNK);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/attendance/api/overall_attendance_record/daily-late-undertime/batch`,
        { startDate: periodStart, endDate: periodEnd, employeeNumbers: chunk },
        getAuthHeaders(),
      );
      const chunkByEmp = res.data?.byEmployee || {};
      const metaByEmp = res.data?.metaByEmployee || {};
      Object.entries(chunkByEmp).forEach(([emp, byDate]) => {
        const meta = metaByEmp[emp];
        const mod = meta?.computation_module_type || MODULE_TYPES.NON_TEACHING;
        byEmployee[emp] = meta
          ? enrichDailyLateByDateFromReview(
              byDate,
              meta.half_day_review,
              mod,
            )
          : byDate;
        if (meta) {
          halfDayReviewByEmployee[emp] = buildReviewByDate(
            parseHalfDayReviewJson(meta.half_day_review),
          );
          computationModuleTypeByEmployee[emp] = mod;
        }
      });
      Object.assign(halfDayDatesByEmployee, res.data?.halfDayDatesByEmployee || {});
    } catch (err) {
      console.warn('fetchDailyLateUndertimeBatch chunk failed:', err?.message || err);
    }
  }
  return {
    byEmployee,
    halfDayDatesByEmployee,
    halfDayReviewByEmployee,
    computationModuleTypeByEmployee,
  };
};

/** @deprecated use persistDailyLateUndertimeFromModule */
export const persistDtrComputedDailyLate = persistDailyLateUndertimeFromModule;

/** @deprecated use fetchDailyLateUndertime — returns byDate map only */
export const fetchDtrComputedDailyLate = async (employeeNumber, periodStart, periodEnd) => {
  const { byDate } = await fetchDailyLateUndertime(employeeNumber, periodStart, periodEnd);
  return byDate;
};

/** @deprecated use fetchDailyLateUndertimeBatch — returns byEmployee only */
export const fetchDtrComputedDailyLateBatch = async (employeeNumbers, periodStart, periodEnd) => {
  const { byEmployee } = await fetchDailyLateUndertimeBatch(
    employeeNumbers,
    periodStart,
    periodEnd,
  );
  return byEmployee;
};

export const DTR_COMPUTED_LATE_UPDATE_EVENT = UPDATE_EVENT;
export const DTR_COMPUTED_LATE_STORAGE_KEY = STORAGE_KEY;
