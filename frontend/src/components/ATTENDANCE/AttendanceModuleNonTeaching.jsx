import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Card,
  Avatar,
  IconButton,
  Fade,
  Alert,
  alpha,
  Chip,
  styled,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  Snackbar,
  Collapse,
  Paper,
  Fab,
  Zoom,
  TextField,
  List,
  ListItemButton,
  Tooltip,
} from '@mui/material';
import {
  WorkHistory,
  Person,
  CalendarToday,
  Clear,
  SaveAs,
  Refresh,
  ExpandLess,
  ExpandMore,
  Schedule,
  Star,
  CreditScore,
  AccessTime,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  FilterList,
  KeyboardArrowUp,
  Search,
  SearchOutlined,
  Assignment,
  RestartAlt,
  Close,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import useAttendanceWorkflow from '../../hooks/useAttendanceWorkflow';
import AttendanceWorkflowNav from './AttendanceWorkflowNav';
import { navigateAttendanceWorkflow } from '../../utils/attendanceWorkflow';
import {
  ATTENDANCE_EMBEDDED_ROOT_SX,
  ATTENDANCE_ALWAYS_VISIBLE_X_SCROLL_SX,
  useEmbeddedModuleAutoSearch,
  notifyModuleSaveSuccess,
} from '../../utils/attendanceModuleEmbedded';
import { ATTENDANCE_PAGE_BOTTOM_PAD, ATTENDANCE_PAGE_SCROLL_CSS, useAttendancePageScroll } from './attendanceFilterLayout';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import useAttendanceRealtimeRefresh from '../../hooks/useAttendanceRealtimeRefresh';
import {
  ATTENDANCE_AUDIT_MODULES,
  buildAuditPeriodLabel,
  logAttendanceModuleAction,
  logAttendanceHalfDayReview,
} from '../../utils/moduleEmployeeSearchAudit';
import AccessDenied from '../AccessDenied';
import LoadingOverlay from '../LoadingOverlay';
import { computeAbsentDays } from './attendanceMetrics';
import {
  buildDailyLateUndertimeRows,
  persistDailyLateUndertimeFromModule,
  persistHalfDayReviewDailyLate,
  fetchDailyLateUndertime,
} from '../../utils/dtrLateUndertimeFromOverall';
import {
  MODULE_TYPES,
  HALF_DAY_STATUS,
  normalizeReviewDate,
  parseHalfDayReviewJson,
  buildReviewByDate,
  buildHalfDayReviewArray,
  migrateLegacyHalfDayReview,
  getApprovedHalfDayDatesSet,
  getEffectiveTardinessFromReview,
  getEffectiveTardinessFromApproved,
  getRowHalfDayUiStatus,
  shouldZeroAmPmHalfDayColumns,
  countSuggestedHalfDays,
  hasHrHalfDayConfirmation,
  resolveEntryRenderedTotal,
  isHalfDayPendingHrReview,
  getRowMaxRenderedTotal,
} from '../../utils/halfDayReview';
import HalfDayReviewDialog from './HalfDayReviewDialog';
import { EmployeeSearchField } from './attendanceModuleEmployeeSearch';
import UnresolvedHalfDaysDialog from './UnresolvedHalfDaysDialog';
import {
  HalfDayTotalColumnHeader,
  HalfDayTotalCellContent,
  halfDayTotalColumnVariant,
} from './HalfDayTotalColumnHints';
import { getHalfDayReviewRowChrome } from './HalfDayApproveCheckboxCell';
import {
  listAbsentDatesFromDailyRows,
  isExcludedAttendanceCalendarDate,
  isScheduledByOfficialTime,
  hasNoPunches,
} from '../../utils/officialAttendanceFromDailyRows';
import {
  postAttendanceDevicePreflightNoSync,
  fetchAttendanceCalendarMaps,
  getLeaveStatusLabelForDate,
  isSuspendedStatusLabel,
  pickApplicableSuspension,
  pickApplicableHoliday,
  fetchEmployeeBranch,
} from './attendanceLeaveIntegration';
import { toLocalYmd } from '../../utils/dateYmd';
import OverallAttendanceCompareModal from './OverallAttendanceCompareModal';
import {
  classifyOverallSave,
  mergeOverallPayload,
  OVERALL_COMPARE_FIELD_META,
} from './overallAttendanceMerge';

// ─── Theme tokens ──────────────────────────────────────────────────────────
const T = {
  accent:       '#6d2323',
  accentDark:   '#5a1d1d',
  accentMid:    '#8B4545',
  accentFaint:  'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover:  'rgba(109,35,35,0.10)',
  rowOdd:       '#f9f9f9',
  rowHover:     '#f3f3f3',
  text:         '#1a1a1a',
  muted:        '#6b6b6b',
  faint:        '#a0a0a0',
  surface:      '#ffffff',
  divider:      'rgba(0,0,0,0.08)',
  recordFont:
    "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  holiday:      { bg: 'rgba(245,124,0,0.10)', color: '#b85c00', border: 'rgba(245,124,0,0.40)' },
  leave:        { bg: 'rgba(46,125,50,0.10)',  color: '#2e7d32', border: 'rgba(46,125,50,0.35)' },
  suspended:    { bg: 'rgba(211,47,47,0.10)',  color: '#d32f2f', border: 'rgba(211,47,47,0.35)' },
  halfDay:      { bg: 'rgba(106,27,154,0.10)', color: '#6a1b9a', border: 'rgba(106,27,154,0.35)' },
  absent:       { bg: 'rgba(183,28,28,0.08)',  color: '#b71c1c', border: 'rgba(183,28,28,0.40)' },
  rendered:     { bg: 'rgba(27,94,32,0.08)',   color: '#1b5e20', border: 'rgba(27,94,32,0.25)' },
  tardiness:    { bg: 'rgba(183,28,28,0.08)',  color: '#b71c1c', border: 'rgba(183,28,28,0.25)' },
};

/** Column visibility sets — matches compact attendance-records layout. */
const COLUMN_SETS = [
  { key: 'official', label: 'Official schedule' },
  { key: 'rendered', label: 'Rendered time' },
];
const defaultHiddenSets = () => ({ official: true, rendered: true });

const formatTardinessAsDaysHours = (hhmm) => {
  if (!hhmm || hhmm === '00:00' || hhmm === '00:00:00') return '0m';
  const parts = String(hhmm).split(':').map(Number);
  const totalMinutes = (parts[0] || 0) * 60 + (parts[1] || 0);
  if (totalMinutes === 0) return '0m';
  const totalHours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const days = Math.floor(totalHours / 8);
  const hrs = totalHours % 8;
  let out = '';
  if (days > 0) out += `${days}d `;
  if (hrs > 0) out += `${hrs}h `;
  if (mins > 0) out += `${mins}m`;
  return out.trim();
};

/** Duration zero / display — hours + minutes only (no seconds). */
const ZERO_HM = '00:00';
const truncateSecToMinutes = (secs) =>
  Math.floor(Math.max(0, Number(secs) || 0) / 60) * 60;
const formatDurationHhMm = (secs) => {
  const safe = truncateSecToMinutes(secs);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
/** Normalize any HH:MM / HH:MM:SS → HH:MM (seconds dropped). */
const normalizeDurationInput = (raw) => {
  const s = String(raw ?? '').trim();
  if (!s || s === '—') return null;
  const parts = s.split(':').map((p) => Number(String(p).trim()));
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return null;
  return `${String(parts[0]).padStart(2, '0')}:${String(parts[1]).padStart(2, '0')}`;
};
const canonicalTardDisplay = (v) => normalizeDurationInput(v) || ZERO_HM;
/** Strip seconds for table display (also accepts legacy HH:MM:SS). */
const displayDurationHhMm = (v) => {
  if (v == null || v === '' || v === '—' || v === 'N/A' || v === 'NaN:NaN:NaN') {
    return v === 'N/A' || v === '—' ? v : ZERO_HM;
  }
  return normalizeDurationInput(v) || ZERO_HM;
};

/** Clock punch / official time display — HH:MM [AM|PM], seconds hidden. */
const displayClockHhMm = (raw) => {
  if (raw == null || raw === '' || raw === '—' || raw === 'N/A') return raw ?? '—';
  const trimmed = String(raw).trim();
  const m = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*(AM|PM))?$/i);
  if (!m) return trimmed;
  const mer = m[3] ? ` ${m[3].toUpperCase()}` : '';
  return `${String(Number(m[1])).padStart(2, '0')}:${m[2]}${mer}`;
};

const CLOCK_DISPLAY_KEYS = new Set([
  'timeIN', 'timeOUT', 'breaktimeIN', 'breaktimeOUT',
  'officialTimeIN', 'officialTimeOUT', 'officialBreaktimeIN', 'officialBreaktimeOUT',
  'officialHonorariumTimeIN', 'officialHonorariumTimeOUT',
  'officialServiceCreditTimeIN', 'officialServiceCreditTimeOUT',
  'officialOverTimeIN', 'officialOverTimeOUT',
]);

/** Clock punch → seconds at minute precision (seconds ignored). */
const parseClockToMinuteSec = (timeStr) => {
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
const parseDurationToMinuteSec = (raw) => {
  const hm = normalizeDurationInput(raw);
  if (!hm) return 0;
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 3600 + (m || 0) * 60;
};

const sumDurationHhMm = (values) => {
  let total = 0;
  (values || []).forEach((v) => { total += parseDurationToMinuteSec(v); });
  return formatDurationHhMm(total);
};

const getEffectiveArrivalMinuteSec = (row) => {
  const timeIn = parseClockToMinuteSec(row?.timeIN);
  if (timeIn != null) return timeIn;
  const candidates = [
    parseClockToMinuteSec(row?.breaktimeIN),
    parseClockToMinuteSec(row?.breaktimeOUT),
  ].filter((s) => s != null);
  if (!candidates.length) return null;
  return Math.min(...candidates);
};

const getEffectiveDepartureMinuteSec = (row) => {
  const timeOut = parseClockToMinuteSec(row?.timeOUT);
  if (timeOut != null) return timeOut;
  const candidates = [
    parseClockToMinuteSec(row?.breaktimeOUT),
    parseClockToMinuteSec(row?.breaktimeIN),
  ].filter((s) => s != null);
  if (!candidates.length) return null;
  return Math.max(...candidates);
};

const computeArrivalLateMinuteSec = (row) => {
  const offIn = parseClockToMinuteSec(row?.officialTimeIN);
  if (offIn == null) return null;
  const arrival = getEffectiveArrivalMinuteSec(row);
  if (arrival == null) return null;
  return Math.max(0, arrival - offIn);
};

const computeEarlyLeaveUndertimeMinuteSec = (row) => {
  const offOut = parseClockToMinuteSec(row?.officialTimeOUT);
  if (offOut == null) return null;
  const departure = getEffectiveDepartureMinuteSec(row);
  if (departure == null) return null;
  return Math.max(0, offOut - departure);
};

const getAmPmSlotLateMinuteSec = (row) =>
  (computeArrivalLateMinuteSec(row) ?? 0)
  + (computeEarlyLeaveUndertimeMinuteSec(row) ?? 0)
  + (computeMissingBreakDeductionMinuteSec(row) ?? 0);

const getOfficialSchedWorkMinuteSec = (row) => {
  const offInSec = parseClockToMinuteSec(row?.officialTimeIN);
  const offOutSec = parseClockToMinuteSec(row?.officialTimeOUT);
  if (offInSec == null || offOutSec == null) return null;
  const schedTotal = Math.max(0, offOutSec - offInSec);
  return Math.max(0, schedTotal - getOfficialBreakDurationMinuteSec(row));
};

/** Empty device / schedule clock (same sentinels as NA checks elsewhere). */
const isEmptyPunchClock = (t) => {
  if (t == null) return true;
  const s = String(t).trim();
  return (
    !s
    || s === '—'
    || s === 'N/A'
    || s === '00:00:00 AM'
    || s === '00:00:00 PM'
    || s === '00:00:00'
  );
};

/** Official lunch window length (minute precision). */
const getOfficialBreakDurationMinuteSec = (row) => {
  const breakIn = parseClockToMinuteSec(row?.officialBreaktimeIN);
  const breakOut = parseClockToMinuteSec(row?.officialBreaktimeOUT);
  if (breakIn == null || breakOut == null) return 0;
  let end = breakOut;
  while (end <= breakIn) end += 12 * 3600;
  return Math.max(0, end - breakIn);
};

/**
 * Break IN and Break OUT are required on a full day (Time IN + Time OUT).
 * If either punch is missing, deduct the official break duration.
 * Half-day patterns (Time IN only / Time OUT only) are excluded.
 */
const computeMissingBreakDeductionMinuteSec = (row) => {
  if (isEmptyPunchClock(row?.officialBreaktimeIN) || isEmptyPunchClock(row?.officialBreaktimeOUT)) {
    return 0;
  }
  if (isEmptyPunchClock(row?.timeIN) || isEmptyPunchClock(row?.timeOUT)) {
    return 0;
  }
  const missingBreakIn = isEmptyPunchClock(row?.breaktimeIN);
  const missingBreakOut = isEmptyPunchClock(row?.breaktimeOUT);
  if (!missingBreakIn && !missingBreakOut) return 0;
  return getOfficialBreakDurationMinuteSec(row);
};

/**
 * For rendered AM/PM only: when a full-day employee skipped break punches,
 * use official break times as segment boundaries so work hours still credit,
 * while the missing-break deduction is charged separately as tardiness.
 */
const resolveBreakPunchForSegment = (actualBreak, officialBreak, row) => {
  if (!isEmptyPunchClock(actualBreak)) return actualBreak;
  if (
    !isEmptyPunchClock(row?.timeIN)
    && !isEmptyPunchClock(row?.timeOUT)
    && !isEmptyPunchClock(officialBreak)
  ) {
    return officialBreak;
  }
  return actualBreak;
};

const getRejectedHalfDayLateMinuteSec = (entry) => {
  const eff = getEffectiveTardinessFromReview(entry, MODULE_TYPES.NON_TEACHING);
  if (!eff) return 0;
  const am = parseDurationToMinuteSec(eff.morning);
  const pm = parseDurationToMinuteSec(eff.afternoon);
  if (am > 0 || pm > 0) return am + pm;
  return parseDurationToMinuteSec(eff.total);
};

const computeApprovedHalfDayShortfallMinuteSec = (row, entry) => {
  const schedWorkSec = getOfficialSchedWorkMinuteSec(row);
  if (schedWorkSec == null) return 0;
  const rendSec = parseDurationToMinuteSec(resolveEntryRenderedTotal(entry, MODULE_TYPES.NON_TEACHING));
  return Math.max(0, schedWorkSec - rendSec);
};

// ─── Suspension scope/type helpers (Non-Teaching) ─────────────────────────
const NON_TEACHING_SCOPE = 'non_teaching';

const suspensionAppliesToNonTeaching = (susp) => {
  if (!susp) return false;
  const scope = susp.personnel_scope || 'all';
  return scope === 'all' || scope === NON_TEACHING_SCOPE;
};

/** Same start-anchored wraparound handling calcSegment() already uses. */
const normalizeOfficialEndSec = (startSec, endSec) => {
  if (startSec == null || endSec == null) return endSec;
  let fixedEnd = endSec;
  while (fixedEnd <= startSec) fixedEnd += 12 * 3600;
  return fixedEnd;
};

/**
 * Choose the earlier of the employee's existing official end and a
 * suspension cutoff, anchored to official start (mirrors calcSegment's own
 * comparison). Never extends the day: if the cutoff is later than the
 * original end, the original is returned unchanged. Falls back to the
 * original string whenever either side can't be parsed.
 */
const pickEarlierOfficialEnd = (officialStartStr, originalEndStr, candidateEndStr) => {
  const offStartSec = parseClockToMinuteSec(officialStartStr);
  const originalEndSec = normalizeOfficialEndSec(offStartSec, parseClockToMinuteSec(originalEndStr));
  const candidateEndSec = normalizeOfficialEndSec(offStartSec, parseClockToMinuteSec(candidateEndStr));
  if (offStartSec == null || originalEndSec == null || candidateEndSec == null) {
    return originalEndStr;
  }
  return candidateEndSec < originalEndSec ? candidateEndStr : originalEndStr;
};

/**
 * Partial-day suspension: shorten officialTimeOUT to the suspension cutoff
 * for applicable dates, never extending the employee's existing official
 * end time. Reads maps.suspensionByDate (raw, full metadata) — that map is
 * never mutated or discarded; this only returns adjusted row copies.
 */
const clampNonTeachingRowsForPartialSuspension = (rows, suspensionByDate, employeeBranch) =>
  (rows || []).map((row) => {
    const d = normalizeReviewDate(row?.date);
    const susp = pickApplicableSuspension(
      suspensionByDate,
      d,
      suspensionAppliesToNonTeaching,
      employeeBranch,
    );
    if (!susp) return row;
    if ((susp.suspension_type || 'whole_day') !== 'partial_day') return row;
    if (!susp.effective_time) return row;
    const effectiveOfficialTimeOUT = pickEarlierOfficialEnd(
      row?.officialTimeIN,
      row?.officialTimeOUT,
      susp.effective_time,
    );
    if (effectiveOfficialTimeOUT === row?.officialTimeOUT) return row;
    return { ...row, officialTimeOUT: effectiveOfficialTimeOUT };
  });

/**
 * Holiday or applicable whole-day suspension: zero late/undertime for the
 * day regardless of punches, matching the existing full-day exclusion
 * behavior. Does not touch officialTimeOUT or actual punches.
 */
const applyNonTeachingWholeDayOverrides = (rows, holidayByDate, suspensionByDate, employeeBranch) =>
  (rows || []).map((row) => {
    const d = normalizeReviewDate(row?.date);
    if (!d) return row;
    const zeroed = {
      lateTotal: ZERO_HM,
      undertimeTotal: ZERO_HM,
      missingBreakDeduction: ZERO_HM,
      formattedfinalcalcFacultyAM: ZERO_HM,
      formattedfinalcalcFacultyPM: ZERO_HM,
    };
    if (pickApplicableHoliday(holidayByDate, d, employeeBranch)) {
      return { ...row, ...zeroed };
    }
    const susp = pickApplicableSuspension(
      suspensionByDate,
      d,
      suspensionAppliesToNonTeaching,
      employeeBranch,
    );
    if (susp && (susp.suspension_type || 'whole_day') === 'whole_day') {
      return { ...row, ...zeroed };
    }
    return row;
  });

/**
 * Applicable-scope suspensions (whole-day + partial) for Non-Teaching.
 * Used for status badges and calendar maps. Partial days still show a badge
 * but are not treated as furlough (see isExcludedAttendanceCalendarDate).
 * Out-of-scope (e.g. academic-only) suspensions are omitted.
 * maps.suspensionByDate (full metadata) is only read here, never mutated.
 */
const filterApplicableSuspensionsForNonTeaching = (suspensionByDate, employeeBranch) => {
  const out = {};
  Object.keys(suspensionByDate || {}).forEach((d) => {
    const susp = pickApplicableSuspension(
      suspensionByDate,
      d,
      suspensionAppliesToNonTeaching,
      employeeBranch,
    );
    if (susp) out[d] = susp;
  });
  return out;
};

/** Minute-only absence / half-day / late buckets for Non-Teaching totals. */
const computeNonTeachingMinuteBuckets = (rows, reviewByDate, calendarMaps) => {
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

    if (hasNoPunches(row)) {
      absentDays += 1;
      absentSecTotal += schedWorkSec;
      return;
    }

    const entry = reviewByDate?.[d];
    if (entry?.status === HALF_DAY_STATUS.APPROVED && hasHrHalfDayConfirmation(entry)) {
      halfDays += 1;
      halfDayShortfallSecTotal += computeApprovedHalfDayShortfallMinuteSec(row, entry);
      // Half-day shortfall → Overall only; not Late Total
      return;
    }

    if (entry?.status === HALF_DAY_STATUS.REJECTED) {
      const rej = getRejectedHalfDayLateMinuteSec(entry);
      lateShortfallSecTotal += rej;
      lateTotalDisplaySec += rej;
      return;
    }

    const punchLate = getAmPmSlotLateMinuteSec(row);
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
    absentTime: formatDurationHhMm(absentSecTotal),
    halfDayShortfallTime: formatDurationHhMm(halfDayShortfallSecTotal),
    lateShortfallTime: formatDurationHhMm(lateShortfallSecTotal),
    lateTotalDisplayTime: formatDurationHhMm(lateTotalDisplaySec),
    overallShortfallTime: formatDurationHhMm(overallShortfallSecTotal),
  };
};

const getRowTotalRenderedMinuteDisplay = (row, reviewByDate, isFurlough, calendarMaps = null) => {
  if (isFurlough) {
    return displayDurationHhMm(getRowMaxRenderedTotal(row, MODULE_TYPES.NON_TEACHING));
  }
  const d = normalizeReviewDate(row?.date);
  const entry = reviewByDate?.[d];
  if (entry?.status === HALF_DAY_STATUS.APPROVED && hasHrHalfDayConfirmation(entry)) {
    const hr = entry?.renderedTotal ?? entry?.renderedRegular ?? entry?.renderedMorning;
    if (hr) return displayDurationHhMm(hr);
  }
  if (isHalfDayPendingHrReview(row, reviewByDate, MODULE_TYPES.NON_TEACHING, calendarMaps)) {
    return ZERO_HM;
  }
  const am =
    !row?.officialTimeIN || row?.formattedFacultyRenderedTimeAM === 'NaN:NaN:NaN'
      ? ZERO_HM
      : displayDurationHhMm(row.formattedFacultyRenderedTimeAM);
  const pm =
    !row?.officialBreaktimeOUT || !row?.timeOUT || row?.formattedFacultyRenderedTimePM === 'NaN:NaN:NaN'
      ? ZERO_HM
      : displayDurationHhMm(row.formattedFacultyRenderedTimePM);
  return addTimeHhMmOnly(am, pm);
};

const getRowTotalTardinessMinuteDisplay = (
  row,
  reviewByDate,
  isFurlough,
  fallbackTotal,
  calendarMaps = null,
) => {
  if (isFurlough) return ZERO_HM;
  const d = normalizeReviewDate(row?.date);
  if (calendarMaps && isExcludedAttendanceCalendarDate(d, calendarMaps)) return ZERO_HM;
  if (isScheduledByOfficialTime(row) && hasNoPunches(row)) {
    const schedWorkSec = getOfficialSchedWorkMinuteSec(row);
    if (schedWorkSec != null) return formatDurationHhMm(schedWorkSec);
  }
  const entry = reviewByDate?.[d];
  if (entry?.status === HALF_DAY_STATUS.REJECTED) {
    const eff = getEffectiveTardinessFromReview(entry, MODULE_TYPES.NON_TEACHING);
    if (eff?.total) return displayDurationHhMm(eff.total);
  }
  if (entry?.status === HALF_DAY_STATUS.APPROVED && hasHrHalfDayConfirmation(entry)) {
    return formatDurationHhMm(computeApprovedHalfDayShortfallMinuteSec(row, entry));
  }
  return displayDurationHhMm(fallbackTotal ?? ZERO_HM);
};

const normalizeNonTeachingRowDurations = (row) => ({
  ...row,
  lateTotal: displayDurationHhMm(row.lateTotal),
  undertimeTotal: displayDurationHhMm(row.undertimeTotal),
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

// ─── Shimmer keyframes ────────────────────────────────────────────────────
const shimmerKf = `
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}`;

const Bone = ({ w = '100%', h = 14, r = 6, sx = {} }) => (
  <Box sx={{
    width: w, height: h, borderRadius: r,
    background: 'linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)',
    backgroundSize: '800px 100%',
    animation: 'shimmer 1.6s infinite linear',
    flexShrink: 0, ...sx,
  }} />
);

const AttendanceNonTeachingWireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box sx={{
      py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 },
      width: '100vw', maxWidth: '100%',
      position: 'relative', left: '53%', transform: 'translateX(-51%)',
      px: { xs: 2, sm: 3, md: 6 },
    }}>
      <Box sx={{ mb: 2, borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.09)', animation: 'blink 2s ease-in-out infinite' }}>
        <Box sx={{ px: 4, py: 3, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)' }} />
          <Box><Bone w={280} h={18} sx={{ mb: 1 }} /><Bone w={380} h={11} /></Box>
        </Box>
      </Box>
      <Box sx={{ mb: 2, borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.09)', bgcolor: '#fff', animation: 'blink 2s ease-in-out 0.1s infinite' }}>
        <Box sx={{ px: 2.5, py: 1.25, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', gap: 1.25, minHeight: 42 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.2)' }} />
          <Bone w={180} h={12} />
        </Box>
        <Box sx={{ px: 2.5, py: 2.5 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            {[1,2,3].map(i => <Box key={i} sx={{ flex: 1, height: 40, borderRadius: '8px', bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }} />)}
          </Box>
          <Box sx={{ border: `2px dashed ${T.accentBorder}`, borderRadius: '8px', p: 3 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
              {Array.from({ length: 12 }).map((_, i) => <Box key={i} sx={{ width: 64, height: 36, borderRadius: '6px', bgcolor: T.accentFaint }} />)}
            </Box>
          </Box>
        </Box>
      </Box>
      <Box sx={{ borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.09)', bgcolor: '#fff', animation: 'blink 2s ease-in-out 0.2s infinite' }}>
        <Box sx={{ px: 2.5, py: 1.25, bgcolor: T.accent, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 2 }}>
          {[100, 80, 80, 80].map((w, i) => <Box key={i} sx={{ height: 10, width: w, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.22)' }} />)}
        </Box>
        {[...Array(5)].map((_, i) => (
          <Box key={i} sx={{ px: 2.5, py: 2, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 2, alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)', bgcolor: i % 2 === 0 ? '#fff' : T.rowOdd }}>
            <Bone w={120} h={12} /><Bone w={80} h={12} /><Bone w={80} h={12} /><Box sx={{ width: 90, height: 24, borderRadius: '12px', bgcolor: T.accentFaint }} />
          </Box>
        ))}
      </Box>
    </Box>
  </>
);

// ─── Styled primitives ────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: '#fff',
});

const PanelHeader = ({ icon: Icon, title, rightContent }) => (
  <Box sx={{
    px: 2.5, py: 1.5,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: `1px solid ${T.divider}`,
    bgcolor: T.accentFaint,
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Icon sx={{ fontSize: 15, color: T.accent }} />
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: T.accent }}>{title}</Typography>
    </Box>
    {rightContent}
  </Box>
);

const NativeInput = ({ value, onChange, type = 'text', placeholder, disabled, icon }) => (
  <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
    {icon && (
      <Box sx={{ position: 'absolute', left: 10, color: T.accentMid, display: 'flex', alignItems: 'center', zIndex: 1, pointerEvents: 'none' }}>
        {icon}
      </Box>
    )}
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
      style={{
        width: '100%', padding: icon ? '9px 13px 9px 34px' : '9px 13px',
        borderRadius: '8px', border: `1px solid ${T.accentBorder}`,
        fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit',
        boxSizing: 'border-box', transition: 'border-color 0.18s',
        background: disabled ? '#f5f5f5' : '#fff', color: T.text,
        cursor: disabled ? 'not-allowed' : 'text',
      }}
      onFocus={e => { if (!disabled) { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 1.5px ${T.accent}22`; } }}
      onBlur={e => { e.target.style.borderColor = T.accentBorder; e.target.style.boxShadow = 'none'; }}
    />
  </Box>
);

const RowBtn = ({ icon, label, onClick, color, hoverBg, disabled = false }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ background: 'transparent', border: `1px solid ${color}40`, borderRadius: '8px', padding: '9px 18px', cursor: disabled ? 'default' : 'pointer', color, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'inherit', transition: 'background-color 0.15s, border-color 0.15s', whiteSpace: 'nowrap', opacity: disabled ? 0.5 : 1 }}
    onMouseEnter={e => { if (!disabled) { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.borderColor = color; } }}
    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = `${color}40`; }}>
    {icon}{label}
  </button>
);

// ─── Tab definitions ──────────────────────────────────────────────────────
const VIEW_TABS = [
  { key: 'regular',       label: 'Regular Time',  icon: <Schedule sx={{ fontSize: 14 }} /> },
  { key: 'honorarium',    label: 'Honorarium',     icon: <Star sx={{ fontSize: 14 }} /> },
  { key: 'serviceCredit', label: 'Service Credit', icon: <CreditScore sx={{ fontSize: 14 }} /> },
  { key: 'overtime',      label: 'Overtime',       icon: <AccessTime sx={{ fontSize: 14 }} /> },
];

// ─── Column definitions ───────────────────────────────────────────────────
// set: 'official' | 'rendered' — toggleable column groups (compact layout).
const TAB_COLUMNS = {
  regular: [
    { label: 'Date',                   key: 'date',                 minWidth: 170, group: 'meta', sticky: true },
    { label: 'Day',                    key: 'day',                  minWidth: 80,  group: 'meta' },
    { label: 'Time IN',                key: 'timeIN',               minWidth: 110, group: 'actual' },
    { label: 'Official Time IN',       key: 'officialTimeIN',       minWidth: 130, group: 'official', set: 'official' },
    { label: 'Breaktime IN',           key: 'breaktimeIN',          minWidth: 110, group: 'actual' },
    { label: 'Official Breaktime IN',  key: 'officialBreaktimeIN',  minWidth: 130, group: 'official', set: 'official' },
    { label: 'Breaktime OUT',          key: 'breaktimeOUT',         minWidth: 110, group: 'actual' },
    { label: 'Time OUT',               key: 'timeOUT',              minWidth: 110, group: 'actual' },
    { label: 'Official Breaktime OUT', key: 'officialBreaktimeOUT', minWidth: 130, group: 'official', set: 'official' },
    { label: 'Official Time OUT',      key: 'officialTimeOUT',      minWidth: 130, group: 'official', set: 'official' },
    { label: 'AM Rendered',            key: '_morningRendered',     minWidth: 110, group: 'calc', set: 'rendered' },
    { label: 'AM Tardiness',           key: '_morningTardiness',    minWidth: 110, group: 'tard' },
    { label: 'PM Rendered',            key: '_afternoonRendered',   minWidth: 110, group: 'calc', set: 'rendered' },
    { label: 'PM Tardiness',           key: '_afternoonTardiness',  minWidth: 110, group: 'tard' },
    { label: 'Total Rendered',         key: '_totalRendered',       minWidth: 110, group: 'calc', set: 'rendered' },
    { label: 'Total Tardiness',        key: '_totalTardiness',      minWidth: 110, group: 'tard' },
  ],
  honorarium: [
    { label: 'Date',                 key: 'date',                      minWidth: 170, group: 'meta', sticky: true },
    { label: 'Day',                  key: 'day',                       minWidth: 80,  group: 'meta' },
    { label: 'Time IN',              key: '_hnTimeIN',                 minWidth: 110, group: 'actual' },
    { label: 'Time OUT',             key: '_hnTimeOUT',                minWidth: 110, group: 'actual' },
    { label: 'Official HN Time IN',  key: 'officialHonorariumTimeIN',  minWidth: 140, group: 'official', set: 'official' },
    { label: 'Official HN Time OUT', key: 'officialHonorariumTimeOUT', minWidth: 140, group: 'official', set: 'official' },
    { label: 'HN Rendered',          key: '_hnRendered',               minWidth: 110, group: 'calc', set: 'rendered' },
    { label: 'HN Tardiness',         key: '_hnTardiness',              minWidth: 110, group: 'tard' },
  ],
  serviceCredit: [
    { label: 'Date',                 key: 'date',                         minWidth: 170, group: 'meta', sticky: true },
    { label: 'Day',                  key: 'day',                          minWidth: 80,  group: 'meta' },
    { label: 'Time IN',              key: '_scTimeIN',                    minWidth: 110, group: 'actual' },
    { label: 'Time OUT',             key: '_scTimeOUT',                   minWidth: 110, group: 'actual' },
    { label: 'Official SC Time IN',  key: 'officialServiceCreditTimeIN',  minWidth: 140, group: 'official', set: 'official' },
    { label: 'Official SC Time OUT', key: 'officialServiceCreditTimeOUT', minWidth: 140, group: 'official', set: 'official' },
    { label: 'SC Rendered',          key: '_scRendered',                  minWidth: 110, group: 'calc', set: 'rendered' },
    { label: 'SC Tardiness',         key: '_scTardiness',                 minWidth: 110, group: 'tard' },
  ],
  overtime: [
    { label: 'Date',                key: 'date',                minWidth: 170, group: 'meta', sticky: true },
    { label: 'Day',                 key: 'day',                 minWidth: 80,  group: 'meta' },
    { label: 'Time IN',             key: '_otTimeIN',           minWidth: 110, group: 'actual' },
    { label: 'Time OUT',            key: '_otTimeOUT',          minWidth: 110, group: 'actual' },
    { label: 'Official OT Time IN', key: 'officialOverTimeIN',  minWidth: 140, group: 'official', set: 'official' },
    { label: 'Official OT Time OUT',key: 'officialOverTimeOUT', minWidth: 140, group: 'official', set: 'official' },
    { label: 'OT Rendered',         key: '_otRendered',         minWidth: 110, group: 'calc', set: 'rendered' },
    { label: 'OT Tardiness',        key: '_otTardiness',        minWidth: 110, group: 'tard' },
  ],
};

const SegBtn = ({ label, pressed, onClick }) => (
  <button
    type="button"
    aria-pressed={pressed}
    data-label={label}
    onClick={onClick}
    style={{
      display: 'inline-grid',
      alignItems: 'center',
      justifyItems: 'center',
      height: 28,
      padding: '0 14px',
      border: 0,
      borderRadius: 7,
      background: pressed ? T.accentDark : 'transparent',
      color: pressed ? '#fff' : T.accent,
      font: 'inherit',
      fontSize: '0.78rem',
      fontWeight: pressed ? 600 : 500,
      fontFamily: 'inherit',
      cursor: 'pointer',
      transition: 'background-color .12s, color .12s',
    }}
    onMouseEnter={(e) => {
      if (!pressed) e.currentTarget.style.backgroundColor = T.accentBorder;
    }}
    onMouseLeave={(e) => {
      if (!pressed) e.currentTarget.style.backgroundColor = 'transparent';
    }}
  >
    <span style={{ gridArea: '1 / 1' }}>{label}</span>
    <span aria-hidden style={{ gridArea: '1 / 1', fontWeight: 600, visibility: 'hidden', height: 0 }}>{label}</span>
  </button>
);

// ─── getCellValue ─────────────────────────────────────────────────────────
/** @param {Record<string, { morning?: string, afternoon?: string }> | null} [tardOverrides] HR edits for Regular Time AM/PM tardiness. */
/** @param {Record<string, object> | null} [reviewByDate] Half-day HR review. */
const getCellValue = (row, colKey, isFurlough = false, tardOverrides = null, reviewByDate = null) => {
  const NA = 'N/A';
  const isNA = (v) => !v || v === '00:00:00 AM' || v === '00:00:00 PM' || v === '00:00:00';
  if (row?.date && tardOverrides?.[row.date]) {
    const e = tardOverrides[row.date];
    if (colKey === '_morningTardiness' && e.morning != null && String(e.morning).trim() !== '') {
      const n = normalizeDurationInput(e.morning);
      if (n) return n;
    }
    if (colKey === '_afternoonTardiness' && e.afternoon != null && String(e.afternoon).trim() !== '') {
      const n = normalizeDurationInput(e.afternoon);
      if (n) return n;
    }
  }
  const zeroAmPmHalfDay =
    !isFurlough &&
    shouldZeroAmPmHalfDayColumns(
      row,
      reviewByDate,
      MODULE_TYPES.NON_TEACHING,
      null,
    );

  switch (colKey) {
    case '_morningRendered':
      if (zeroAmPmHalfDay) return ZERO_HM;
      if (isFurlough) return !row.formattedFacultyMaxRenderedTimeAM || row.formattedFacultyMaxRenderedTimeAM === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyMaxRenderedTimeAM);
      return !row.officialTimeIN || row.formattedFacultyRenderedTimeAM === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyRenderedTimeAM);
    case '_morningTardiness': {
      if (zeroAmPmHalfDay || isFurlough) return ZERO_HM;
      const d = normalizeReviewDate(row?.date);
      const entry = reviewByDate?.[d];
      if (entry?.status === HALF_DAY_STATUS.REJECTED) {
        const eff = getEffectiveTardinessFromReview(entry, MODULE_TYPES.NON_TEACHING);
        if (eff?.morning) return displayDurationHhMm(eff.morning);
      }
      if (entry?.status === HALF_DAY_STATUS.APPROVED) {
        const eff = getEffectiveTardinessFromApproved(entry, MODULE_TYPES.NON_TEACHING);
        if (eff?.morning) return displayDurationHhMm(eff.morning);
      }
      return !row.officialTimeIN ||
        row.formattedfinalcalcFacultyAM === 'NaN:NaN:NaN'
        ? displayDurationHhMm(row.formattedFacultyMaxRenderedTimeAM)
        : displayDurationHhMm(row.formattedfinalcalcFacultyAM);
    }
    case '_totalRendered':
      return getRowTotalRenderedMinuteDisplay(
        row,
        reviewByDate,
        isFurlough,
        null,
      );
    case '_afternoonRendered':
      if (zeroAmPmHalfDay) return ZERO_HM;
      if (isFurlough) return !row.formattedFacultyMaxRenderedTimePM || row.formattedFacultyMaxRenderedTimePM === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyMaxRenderedTimePM);
      return !row.officialBreaktimeOUT || !row?.timeOUT || row.formattedFacultyRenderedTimePM === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyRenderedTimePM);
    case '_afternoonTardiness': {
      if (zeroAmPmHalfDay || isFurlough) return ZERO_HM;
      const d = normalizeReviewDate(row?.date);
      const entry = reviewByDate?.[d];
      if (entry?.status === HALF_DAY_STATUS.REJECTED) {
        const eff = getEffectiveTardinessFromReview(entry, MODULE_TYPES.NON_TEACHING);
        if (eff?.afternoon) return displayDurationHhMm(eff.afternoon);
      }
      if (entry?.status === HALF_DAY_STATUS.APPROVED) {
        const eff = getEffectiveTardinessFromApproved(entry, MODULE_TYPES.NON_TEACHING);
        if (eff?.afternoon) return displayDurationHhMm(eff.afternoon);
      }
      return !row.officialTimeOUT ||
        row.formattedfinalcalcFacultyPM === 'NaN:NaN:NaN'
        ? displayDurationHhMm(row.formattedFacultyMaxRenderedTimePM)
        : displayDurationHhMm(row.formattedfinalcalcFacultyPM);
    }
    case '_totalTardiness': {
      if (isFurlough) return ZERO_HM;
      return getRowTotalTardinessMinuteDisplay(
        row,
        reviewByDate,
        isFurlough,
        addTimeHhMmOnly(
          getCellValue(row, '_morningTardiness', isFurlough, tardOverrides, reviewByDate),
          getCellValue(row, '_afternoonTardiness', isFurlough, tardOverrides, reviewByDate),
        ),
        null,
      );
    }
    case '_hnTimeIN':  return isNA(row.officialHonorariumTimeIN)  ? NA : displayClockHhMm(row.timeIN);
    case '_hnTimeOUT': return isNA(row.officialHonorariumTimeOUT) ? NA : displayClockHhMm(row.timeOUT);
    case '_hnRendered':
      if (isFurlough) return !row.formattedFacultyMaxRenderedTimeHN || row.formattedFacultyMaxRenderedTimeHN === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyMaxRenderedTimeHN);
      return !row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeHN === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyRenderedTimeHN);
    case '_hnTardiness':
      if (isFurlough) return ZERO_HM;
      return displayDurationHhMm(
        !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyHN === 'NaN:NaN:NaN'
          ? row.formattedFacultyMaxRenderedTimeHN
          : row.formattedfinalcalcFacultyHN,
      );
    case '_scTimeIN':  return isNA(row.officialServiceCreditTimeIN)  ? NA : displayClockHhMm(row.timeIN);
    case '_scTimeOUT': return isNA(row.officialServiceCreditTimeOUT) ? NA : displayClockHhMm(row.timeOUT);
    case '_scRendered':
      if (isFurlough) return !row.formattedFacultyMaxRenderedTimeSC || row.formattedFacultyMaxRenderedTimeSC === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyMaxRenderedTimeSC);
      return !row.officialTimeSC || !row.timeOUT || row.formattedFacultyRenderedTimeSC === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyRenderedTimeSC);
    case '_scTardiness':
      if (isFurlough) return ZERO_HM;
      return displayDurationHhMm(
        !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultySC === 'NaN:NaN:NaN'
          ? row.formattedFacultyMaxRenderedTimeSC
          : row.formattedfinalcalcFacultySC,
      );
    case '_otTimeIN':  return isNA(row.officialOverTimeIN)  ? NA : displayClockHhMm(row.timeIN);
    case '_otTimeOUT': return isNA(row.officialOverTimeOUT) ? NA : displayClockHhMm(row.timeOUT);
    case '_otRendered':
      if (isFurlough) return !row.formattedFacultyMaxRenderedTimeOT || row.formattedFacultyMaxRenderedTimeOT === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyMaxRenderedTimeOT);
      return !row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeOT === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyRenderedTimeOT);
    case '_otTardiness':
      if (isFurlough) return ZERO_HM;
      return displayDurationHhMm(
        !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyOT === 'NaN:NaN:NaN'
          ? row.formattedFacultyMaxRenderedTimeOT
          : row.formattedfinalcalcFacultyOT,
      );
    case 'officialHonorariumTimeIN':
    case 'officialHonorariumTimeOUT':
    case 'officialServiceCreditTimeIN':
    case 'officialServiceCreditTimeOUT':
    case 'officialOverTimeIN':
    case 'officialOverTimeOUT':
      return isNA(row[colKey]) ? NA : displayClockHhMm(row[colKey]);
    default: {
      const v = row[colKey] ?? '—';
      return CLOCK_DISPLAY_KEYS.has(colKey) ? displayClockHhMm(v) : v;
    }
  }
};

const addTimeHhMmOnly = (a, b) => {
  const toSec = (t) => {
    if (!t || t === 'NaN:NaN:NaN' || t === '—') return 0;
    const parts = String(t).split(':').map(Number);
    if (parts.length < 2 || [parts[0], parts[1]].some((n) => Number.isNaN(n))) return 0;
    return parts[0] * 3600 + parts[1] * 60;
  };
  return formatDurationHhMm(toSec(a) + toSec(b));
};

/** Regular Time only: editable AM/PM tardiness (system default + HR override). */
const EditableTardinessCell = ({
  row,
  part,
  isFurlough,
  isEven,
  storedOverride,
  onCommit,
  onInvalid,
}) => {
  const colKey = part === 'morning' ? '_morningTardiness' : '_afternoonTardiness';
  const systemVal = canonicalTardDisplay(getCellValue(row, colKey, isFurlough, null));
  const [local, setLocal] = React.useState(() => canonicalTardDisplay(storedOverride ?? systemVal));
  React.useEffect(() => {
    setLocal(canonicalTardDisplay(storedOverride ?? systemVal));
  }, [row.date, storedOverride, systemVal]);
  const normalizedStored = storedOverride != null && String(storedOverride).trim() !== '' ? normalizeDurationInput(storedOverride) : null;
  const hasAdjusted = Boolean(normalizedStored && normalizedStored !== systemVal);

  const baseBg = isEven ? '#fff' : T.rowOdd;
  const cellBg = hasAdjusted ? alpha(T.tardiness.color, 0.06) : baseBg;

  const applyBlur = () => {
    const trimmed = String(local).trim();
    if (trimmed === '') {
      onCommit(null);
      setLocal(systemVal);
      return;
    }
    const n = normalizeDurationInput(local);
    if (!n) {
      onInvalid('Use HH:MM (e.g. 00:05).');
      setLocal(canonicalTardDisplay(storedOverride ?? systemVal));
      return;
    }
    if (n === systemVal) onCommit(null);
    else onCommit(n);
    setLocal(n);
  };

  return (
    <TableCell
      sx={{
        borderBottom: `1px solid ${T.divider}`,
        borderRight: `1px solid ${T.divider}`,
        px: 0.75,
        py: 0.5,
        verticalAlign: 'middle',
        bgcolor: cellBg,
        fontVariantNumeric: 'tabular-nums',
        transition: 'background-color 0.12s',
        'tr:hover &': { bgcolor: `${T.rowHover} !important` },
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: 120,
          width: '100%',
          '&:hover .tard-reset': { opacity: 1 },
        }}
      >
        <TextField
          size="small"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={applyBlur}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
          placeholder={systemVal}
          inputProps={{
            inputMode: 'numeric',
            'aria-label': part === 'morning' ? 'AM tardiness' : 'PM tardiness',
            style: { textAlign: 'center', fontVariantNumeric: 'tabular-nums', padding: '5px 4px', fontSize: '0.78rem', fontFamily: T.recordFont },
          }}
          sx={{
            width: 64,
            '& .MuiOutlinedInput-root': {
              borderRadius: '6px',
              bgcolor: hasAdjusted ? T.tardiness.bg : 'transparent',
              fontSize: '0.78rem',
              '& fieldset': { borderColor: hasAdjusted ? T.tardiness.border : 'transparent' },
              '&:hover fieldset': { borderColor: T.accentBorder },
              '&.Mui-focused fieldset': { borderColor: T.accentBorder },
              '&:hover, &.Mui-focused': { bgcolor: hasAdjusted ? T.tardiness.bg : '#fff' },
            },
          }}
        />
        <Tooltip title="Use system calculation" placement="top" arrow>
          <IconButton
            className="tard-reset"
            size="small"
            aria-label="Use system calculation"
            onClick={() => { onCommit(null); setLocal(systemVal); }}
            sx={{
              p: '3px',
              borderRadius: '5px',
              color: T.accentMid,
              opacity: hasAdjusted ? 1 : 0.35,
              transition: 'opacity .12s',
              '&:hover': { bgcolor: T.accentFaint, opacity: 1 },
            }}
          >
            <RestartAlt sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
        {hasAdjusted && (
          <Typography
            component="span"
            sx={{
              flexBasis: '100%',
              display: 'block',
              fontSize: '0.58rem',
              fontWeight: 500,
              color: T.muted,
              lineHeight: 1.2,
              mt: '2px',
              textAlign: 'center',
            }}
          >
            System: {systemVal}
          </Typography>
        )}
      </Box>
    </TableCell>
  );
};

// ─── Status chip ──────────────────────────────────────────────────────────
const StatusChip = ({ label }) => {
  const styles = { 'WORK SUSPENDED': T.suspended, 'HOLIDAY': T.holiday, 'ON LEAVE': T.leave };
  const s = isSuspendedStatusLabel(label) ? T.suspended : (styles[label] || {});
  return (
    <Chip size="small" label={label}
      sx={{ fontWeight: 700, fontSize: '0.6rem', height: 'auto', minHeight: 16, py: 0.15, mt: 0.3,
        maxWidth: 'none', bgcolor: s.bg, color: s.color, border: `1px solid ${s.border}`,
        '& .MuiChip-label': { px: 0.75, whiteSpace: 'nowrap' } }} />
  );
};

// ─── Floating Totals / Save Bar ───────────────────────────────────────────
const FloatingTotalsBar = ({ totals, visible, onSave, saving, startDate, endDate, showSaveButton = true }) => {
  const [expanded, setExpanded] = useState(true);
  if (!visible) return null;

  const allItems = [
    { label: 'Absent Days',       value: String(Number.isFinite(Number(totals.absentDays)) ? Number(totals.absentDays) : 0), subtitle: displayDurationHhMm(totals.absentTime), style: T.absent,    accent: true },
    {
      label: 'Half Days',
      value: String(Number.isFinite(Number(totals.halfDays)) ? Number(totals.halfDays) : 0),
      subtitle: displayDurationHhMm(totals.halfDayShortfallTime),
      statusLine:
        Number(totals.halfDaysForReview) > 0
          ? `${Number(totals.halfDaysForReview)} FOR REVIEW`
          : null,
      style: T.halfDay,
      accent: true,
    },
    { label: 'Late Total',        value: displayDurationHhMm(totals.lateTotalTime), style: T.tardiness, accent: true },
    { label: 'Overall Rendered',  value: displayDurationHhMm(totals.overallRendered), style: T.rendered,  accent: true },
    { label: 'Overall Tardiness', value: formatTardinessAsDaysHours(totals.overallTardiness || ZERO_HM), subtitle: `${displayDurationHhMm(totals.overallTardiness)} · Absent + Half + Late`, style: T.tardiness, accent: true },
    { label: 'AM Rendered',       value: displayDurationHhMm(totals.morningRendered) },
    { label: 'AM Tardiness',      value: displayDurationHhMm(totals.morningTardiness) },
    { label: 'PM Rendered',       value: displayDurationHhMm(totals.afternoonRendered) },
    { label: 'PM Tardiness',      value: displayDurationHhMm(totals.afternoonTardiness) },
    { label: 'HN Rendered',       value: displayDurationHhMm(totals.hnRendered) },
    { label: 'HN Tardiness',      value: displayDurationHhMm(totals.hnTardiness) },
    { label: 'SC Rendered',       value: displayDurationHhMm(totals.scRendered) },
    { label: 'SC Tardiness',      value: displayDurationHhMm(totals.scTardiness) },
    { label: 'OT Rendered',       value: displayDurationHhMm(totals.otRendered) },
    { label: 'OT Tardiness',      value: displayDurationHhMm(totals.otTardiness) },
  ];

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <Paper elevation={8} sx={{
        borderRadius: '12px', overflow: 'visible', width: '100%', maxWidth: '100%',
        border: `1px solid ${T.accentBorder}`, bgcolor: '#fff', mt: 2, mb: 2,
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      }}>
        <Box onClick={() => setExpanded(p => !p)} sx={{
          px: 2.5, py: 1.25, bgcolor: T.accentFaint,
          borderBottom: `1px solid ${T.accentBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', userSelect: 'none',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WorkHistory sx={{ fontSize: 14, color: T.accent }} />
            <Typography sx={{ fontSize: '0.74rem', fontWeight: 700, color: T.accent, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Attendance Summary
            </Typography>
            {startDate && endDate && (
              <Typography sx={{ fontSize: '0.67rem', color: T.muted, fontFamily: T.recordFont }}>
                {startDate} – {endDate}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {showSaveButton && (
            <Button
              variant="contained"
              size="small"
              onClick={(e) => { e.stopPropagation(); if (!saving) onSave(); }}
              disabled={saving}
              startIcon={
                saving
                  ? <CircularProgress size={14} thickness={5} sx={{ color: '#fff' }} />
                  : <SaveAs sx={{ fontSize: '15px !important' }} />
              }
              sx={{
                height: 32,
                fontSize: '0.75rem',
                fontWeight: 700,
                px: 1.5,
                borderRadius: '8px',
                textTransform: 'none',
                bgcolor: T.accent,
                color: '#fff',
                boxShadow: `0 2px 8px ${alpha(T.accent, 0.3)}`,
                '&:hover': { bgcolor: T.accentDark },
                '&.Mui-disabled': { opacity: 0.7, color: '#fff' },
              }}
            >
              {saving ? 'Saving…' : 'Save to Summary'}
            </Button>
            )}
            {expanded ? <ExpandMore sx={{ fontSize: 16, color: T.muted }} /> : <ExpandLess sx={{ fontSize: 16, color: T.muted }} />}
          </Box>
        </Box>
        <Collapse
          in={expanded}
          sx={{
            width: '100%',
            maxWidth: '100%',
            overflow: 'visible',
            '& .MuiCollapse-wrapper': { width: '100%', overflow: 'visible' },
            '& .MuiCollapse-wrapperInner': { width: '100%', maxWidth: '100%', overflow: 'visible' },
          }}
        >
          {/* Outer: reserved horizontal scrollbar so zoom cannot clip it. */}
          <Box
            sx={{
              px: 1.5, py: 1.25,
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
              overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch',
              ...ATTENDANCE_ALWAYS_VISIBLE_X_SCROLL_SX,
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                alignItems: 'stretch',
                gap: 0.5,
                verticalAlign: 'top',
                minWidth: 'min-content',
              }}
            >
              {allItems.map(({ label, value, style, accent, subtitle, statusLine }) => (
                <Box key={label} sx={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  px: 1.5, py: 0.75, borderRadius: '6px', flex: '0 0 auto',
                  border: `1px solid ${accent ? style.border : T.divider}`,
                  bgcolor: accent ? style.bg : '#fafafa', minWidth: 90,
                }}>
                  <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: accent ? style.color : T.faint, letterSpacing: '0.05em', textTransform: 'uppercase', mb: 0.2, whiteSpace: 'nowrap' }}>
                    {label}
                  </Typography>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: accent ? style.color : T.muted, fontFamily: T.recordFont, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                    {value}
                  </Typography>
                  {subtitle != null && (
                    <Typography sx={{
                      fontFamily: T.recordFont, fontWeight: 600, fontSize: '0.62rem',
                      color: accent ? style.color : T.muted, opacity: 0.55, mt: 0.25, lineHeight: 1.2, whiteSpace: 'nowrap',
                    }}>
                      {subtitle}
                    </Typography>
                  )}
                  {statusLine != null && (
                    <Typography sx={{
                      fontFamily: T.recordFont, fontWeight: 500, fontSize: '0.58rem',
                      color: T.tardiness.color, letterSpacing: '0.04em',
                      textTransform: 'uppercase', mt: 0.35, lineHeight: 1.2, whiteSpace: 'nowrap',
                    }}>
                      {statusLine}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
};


export default AttendanceModuleNonTeachingStaff;