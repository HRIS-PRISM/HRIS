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

/** Minute-only absence / half-day / late buckets for Non-Teaching totals.
 * @param {Record<string, { morning?: string, afternoon?: string }> | null} [tardOverrides]
 *   HR-entered AM/PM tardiness overrides, keyed by date. When present for a
 *   day (including an absent day with no punches), the override replaces
 *   the automatic figure for that slot so every total — Late Total, Overall
 *   Tardiness, and the saved payroll record — agrees with what the AM/PM
 *   tardiness cells display.
 */
const computeNonTeachingMinuteBuckets = (rows, reviewByDate, calendarMaps, tardOverrides = null) => {
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
      const ov = tardOverrides?.[row?.date] || tardOverrides?.[d];
      const hasOverride = ov && (
        (ov.morning != null && String(ov.morning).trim() !== '')
        || (ov.afternoon != null && String(ov.afternoon).trim() !== '')
      );
      if (hasOverride) {
        // A manual override on an absent day reclassifies that portion of
        // the day from "absent" to "late" instead of being dropped, so
        // Late Total / Overall Tardiness stay in sync with what the AM/PM
        // tardiness cells (and Morning/Afternoon Total) already show.
        const amSec = ov.morning != null && String(ov.morning).trim() !== ''
          ? parseDurationToMinuteSec(ov.morning)
          : (computeArrivalLateMinuteSec(row) ?? 0);
        const pmSec = ov.afternoon != null && String(ov.afternoon).trim() !== ''
          ? parseDurationToMinuteSec(ov.afternoon)
          : (computeEarlyLeaveUndertimeMinuteSec(row) ?? 0) + (computeMissingBreakDeductionMinuteSec(row) ?? 0);
        const overrideSec = Math.min(schedWorkSec, amSec + pmSec);
        lateShortfallSecTotal += overrideSec;
        lateTotalDisplaySec += overrideSec;
        absentSecTotal += Math.max(0, schedWorkSec - overrideSec);
      } else {
        absentSecTotal += schedWorkSec;
      }
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

    const ov = tardOverrides?.[row?.date] || tardOverrides?.[d];
    let punchLate;
    if (ov && ((ov.morning != null && String(ov.morning).trim() !== '') || (ov.afternoon != null && String(ov.afternoon).trim() !== ''))) {
      const amSec = ov.morning != null && String(ov.morning).trim() !== ''
        ? parseDurationToMinuteSec(ov.morning)
        : (computeArrivalLateMinuteSec(row) ?? 0);
      const pmSec = ov.afternoon != null && String(ov.afternoon).trim() !== ''
        ? parseDurationToMinuteSec(ov.afternoon)
        : (computeEarlyLeaveUndertimeMinuteSec(row) ?? 0) + (computeMissingBreakDeductionMinuteSec(row) ?? 0);
      punchLate = amSec + pmSec;
    } else {
      punchLate = getAmPmSlotLateMinuteSec(row);
    }
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
    if (schedWorkSec != null) {
      // fallbackTotal is computed by the caller from the AM/PM tardiness
      // cells, which already honor a manual HR override (see getCellValue).
      // Without punches the automatic AM/PM formulas always yield 0, so a
      // positive fallbackTotal here can only mean a real override was
      // entered — let it win over the default "whole scheduled day" figure.
      const fallbackSec = parseDurationToMinuteSec(fallbackTotal);
      if (fallbackSec > 0) return formatDurationHhMm(Math.min(schedWorkSec, fallbackSec));
      return formatDurationHhMm(schedWorkSec);
    }
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
      return !row.officialBreaktimeOUT || !row.timeOUT || row.formattedFacultyRenderedTimePM === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyRenderedTimePM);
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

// ─── Styled Modal ─────────────────────────────────────────────────────────
const StyledModal = ({ open, onClose, title, message, type = 'info', onConfirm, showCancel = false, confirmLabel = null }) => {
  const typeConfig = {
    success: { icon: <CheckCircleIcon sx={{ fontSize: 26, color: '#2e7d32' }} />, avatarBg: 'rgba(46,125,50,0.12)', label: 'Success', labelColor: '#2e7d32' },
    warning: { icon: <WarningIcon sx={{ fontSize: 26, color: '#92400e' }} />,      avatarBg: 'rgba(146,64,14,0.12)',  label: 'Warning', labelColor: '#92400e' },
    error:   { icon: <ErrorIcon sx={{ fontSize: 26, color: '#991b1b' }} />,        avatarBg: 'rgba(153,27,27,0.12)', label: 'Error',   labelColor: '#991b1b' },
    info:    { icon: <InfoIcon sx={{ fontSize: 26, color: T.accent }} />,          avatarBg: T.accentFaint,          label: 'Notice',  labelColor: T.accent },
  };
  const cfg = typeConfig[type] || typeConfig.info;
  const lines = message.split('\n').map(l => l.trim()).filter(Boolean);
  const isListItem = (l) => l.startsWith('•') || l.startsWith('-') || /^\d{5,}/.test(l) || /^Employee\s+\d/.test(l);
  const isNote = (l) => /^(contact|please|this action|note:|important)/i.test(l);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px', overflow: 'hidden', border: `0.5px solid rgba(0,0,0,0.09)`, bgcolor: '#fff' } }}>
      <Box sx={{ px: 3, py: 3, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle,${alpha(T.accent,0.1)} 0%,transparent 70%)`, pointerEvents: 'none' }} />
        <IconButton size="small" onClick={onClose} sx={{ position: 'absolute', top: 12, right: 12, color: T.accent, opacity: 0.45, '&:hover': { opacity: 1, bgcolor: T.accentFaint } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
          <Avatar sx={{ bgcolor: cfg.avatarBg, width: 48, height: 48, border: `1px solid ${T.accentBorder}` }}>{cfg.icon}</Avatar>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: T.accent, lineHeight: 1.2 }}>{title}</Typography>
              <Chip label={cfg.label} size="small" sx={{ bgcolor: alpha(cfg.labelColor, 0.1), color: cfg.labelColor, fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.07em', textTransform: 'uppercase', height: 18, borderRadius: '5px', border: `1px solid ${alpha(cfg.labelColor, 0.2)}` }} />
            </Box>
            <Typography sx={{ fontSize: '0.74rem', color: T.faint, fontWeight: 500 }}>
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Typography>
          </Box>
        </Box>
      </Box>
      <Box sx={{ px: 3, py: 2.5, borderTop: `1px solid ${T.divider}`, borderBottom: `1px solid ${T.divider}` }}>
        {lines.map((line, i) => {
          if (isListItem(line)) {
            const clean = line.replace(/^[•\-]\s*/, '');
            const [empPart, ...rest] = clean.split(':');
            return (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, px: 1.5, py: 1, borderRadius: '8px', bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                <Box sx={{ width: 28, height: 28, borderRadius: '6px', flexShrink: 0, bgcolor: alpha(T.accent, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Person sx={{ fontSize: 14, color: T.accent, opacity: 0.7 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text, lineHeight: 1.2 }}>{empPart?.trim()}</Typography>
                  {rest.length > 0 && <Typography sx={{ fontSize: '0.74rem', color: T.muted, fontWeight: 500, mt: 0.1 }}>{rest.join(':').trim()}</Typography>}
                </Box>
              </Box>
            );
          }
          if (isNote(line)) {
            return (
              <Box key={i} sx={{ mt: 1.5, px: 1.5, py: 1.25, borderRadius: '8px', bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderLeft: `4px solid ${alpha(T.accent, 0.5)}`, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <InfoIcon sx={{ fontSize: 13, color: T.accent, opacity: 0.6, mt: 0.2, flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.82rem', color: T.muted, fontWeight: 600, lineHeight: 1.65 }}>{line}</Typography>
              </Box>
            );
          }
          return <Typography key={i} sx={{ fontSize: '0.88rem', color: T.muted, lineHeight: 1.8, fontWeight: 500, mb: i < lines.length - 1 ? 1 : 0 }}>{line}</Typography>;
        })}
      </Box>
      <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        {showCancel && <RowBtn icon={null} label="Cancel" color={T.muted} hoverBg="rgba(0,0,0,0.05)" onClick={onClose} />}
        <button onClick={onConfirm || onClose}
          style={{ background: T.accent, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 24px', fontWeight: 700, fontSize: '0.82rem', fontFamily: 'inherit', cursor: 'pointer', transition: 'background 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = T.accentDark; }}
          onMouseLeave={e => { e.currentTarget.style.background = T.accent; }}>
          {confirmLabel || (showCancel ? 'Confirm' : 'OK')}
        </button>
      </Box>
    </Dialog>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
const AttendanceModuleNonTeachingStaff = ({
  embedded = false,
  initialContext = null,
  onClose,
  onSavedToSummary,
  saveSignal = 0,
  refreshEpoch = 0,
  onOpenHubTool,
} = {}) => {
  const seedEmp = String(initialContext?.employeeNumber || '').trim();
  const seedStart = initialContext?.startDate || '';
  const seedEnd = initialContext?.endDate || '';
  const { settings }          = useSystemSettings();
  const [employeeNumber, setEmployeeNumber] = useState(seedEmp);
  const [employeeDisplayName, setEmployeeDisplayName] = useState(
    initialContext?.fullName || initialContext?.employee?.fullName || '',
  );
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [employeeBranch, setEmployeeBranch] = useState(null);
  const [startDate, setStartDate]           = useState(seedStart);
  const [endDate, setEndDate]               = useState(seedEnd);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading]               = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState('');
  const [pageLoading, setPageLoading]       = useState(true);
  const [activeTab, setActiveTab]           = useState('regular');
  const [showScrollTop, setShowScrollTop]   = useState(false);

  /** Per-date HR overrides for AM/PM tardiness (Regular Time); cleared on new search. */
  const [tardinessOverrides, setTardinessOverrides] = useState({});
  const [halfDayReviewByDate, setHalfDayReviewByDate] = useState({});
  const [halfDayReviewDialog, setHalfDayReviewDialog] = useState(null);
  const [unresolvedDatesModal, setUnresolvedDatesModal] = useState(null);

  /** Per-tab: hide official / rendered column sets (compact layout default). */
  const [hiddenColumnSets, setHiddenColumnSets] = useState({
    regular: defaultHiddenSets(),
    honorarium: defaultHiddenSets(),
    serviceCredit: defaultHiddenSets(),
    overtime: defaultHiddenSets(),
  });
  const toggleColumnSet = (tab, setKey) =>
    setHiddenColumnSets((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], [setKey]: !prev[tab][setKey] },
    }));
  const applyColumnPreset = (tab, preset) =>
    setHiddenColumnSets((prev) => ({
      ...prev,
      [tab]: {
        official: preset === 'compact',
        rendered: preset === 'compact',
      },
    }));

  const [suspensionByDate, setSuspensionByDate] = useState({});
  const [leaveByDate, setLeaveByDate]           = useState({});
  const [holidayByDate, setHolidayByDate]       = useState({});

  const navigate     = useNavigate();
  const resultsRef = useRef(null);
  const submitInFlightRef = useRef(false);
  const persistDebounceRef = useRef(null);

  const { hasAccess, loading: accessLoading } = usePageAccess('attendance-module');

  const currentYear  = new Date().getFullYear();
  const months       = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const [selectedMonth, setSelectedMonth] = useState(
    initialContext?.selectedMonth ?? null,
  );
  const [selectedYear, setSelectedYear]   = useState(
    initialContext?.selectedYear ?? new Date().getFullYear(),
  );
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const [snackbar, setSnackbar]                   = useState({ open: false, message: '', severity: 'success' });
  const [snackbarCountdown, setSnackbarCountdown] = useState(6);
  const showSnackbar = (message, severity = 'success') => { setSnackbar({ open: true, message, severity }); setSnackbarCountdown(6); };
  const handleCloseSnackbar = () => setSnackbar((p) => ({ ...p, open: false }));

  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'info', onConfirm: null, showCancel: false, confirmLabel: null });
  const showModal = (title, message, type = 'info', onConfirm = null, showCancel = false, confirmLabel = null) =>
    setModal({ open: true, title, message, type, onConfirm, showCancel, confirmLabel });
  const closeModal = () => setModal((p) => ({ ...p, open: false, confirmLabel: null }));

  const [compareOpen, setCompareOpen]                   = useState(false);
  const [pendingSavedOverall, setPendingSavedOverall]   = useState(null);
  const [pendingProposedOverall, setPendingProposedOverall] = useState(null);

  useEffect(() => {
    let timer;
    if (snackbar.open && snackbarCountdown > 0) timer = setInterval(() => setSnackbarCountdown(p => p - 1), 1000);
    return () => clearInterval(timer);
  }, [snackbar.open, snackbarCountdown]);

  useEffect(() => { if (!accessLoading) setPageLoading(false); }, [accessLoading]);

  useEffect(() => {
    if (embedded) return;
    const en = localStorage.getItem('attendanceNonTeachingEmployeeNumber');
    const sd = localStorage.getItem('attendanceNonTeachingStartDate');
    const ed = localStorage.getItem('attendanceNonTeachingEndDate');
    if (en) setEmployeeNumber(en);
    if (sd) setStartDate(sd);
    if (ed) setEndDate(ed);
  }, [embedded]);

  useEffect(() => {
    if (attendanceData.length === 0) return;
    const timer = setTimeout(() => {
      document.body.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('overflow');
      if (resultsRef.current) resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
    return () => clearTimeout(timer);
  }, [attendanceData]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' } });

  useEffect(() => {
    const key = String(employeeNumber ?? '').trim();
    if (!key) {
      setEmployeeBranch(null);
      return;
    }
    let cancelled = false;
    fetchEmployeeBranch({
      apiBaseUrl: API_BASE_URL,
      getAuthHeaders,
      employeeNumber: key,
    }).then((branch) => {
      if (!cancelled) setEmployeeBranch(branch);
    });
    return () => {
      cancelled = true;
    };
  }, [employeeNumber]);

  const getStatusLabelForDate = useCallback(
    (date) =>
      getLeaveStatusLabelForDate(date, {
        suspensionByDate,
        holidayByDate,
        leaveByDate,
        employeeBranch,
      }),
    [suspensionByDate, holidayByDate, leaveByDate, employeeBranch],
  );

  /** Whole-day suspension / holiday / leave only — not partial suspension. */
  const isFurloughForDate = useCallback(
    (date) =>
      isExcludedAttendanceCalendarDate(date, {
        suspensionByDate,
        holidayByDate,
        leaveByDate,
        employeeBranch,
      }),
    [suspensionByDate, holidayByDate, leaveByDate, employeeBranch],
  );

  const commitTardinessOverride = useCallback((date, part, normalizedOrNull) => {
    setTardinessOverrides((prev) => {
      const row = attendanceData.find((r) => r.date === date);
      if (!row) return prev;
      const colKey = part === 'morning' ? '_morningTardiness' : '_afternoonTardiness';
      const f = isFurloughForDate(date);
      const sys = canonicalTardDisplay(getCellValue(row, colKey, f, null));
      const next = { ...prev };
      const cur = { ...(next[date] || {}) };
      if (normalizedOrNull == null || normalizedOrNull === sys) {
        delete cur[part];
      } else {
        cur[part] = normalizedOrNull;
      }
      if (!cur.morning && !cur.afternoon) delete next[date];
      else next[date] = cur;
      return next;
    });
  }, [attendanceData, isFurloughForDate]);

  const calcSegment = (startStr, endStr, officialStartStr, officialEndStr) => {
    const formatSeconds = (secs) => formatDurationHhMm(secs);
    const normalizeEnd = (startSec, endSec) => {
      if (startSec == null || endSec == null) return endSec;
      let fixedEnd = endSec;
      while (fixedEnd <= startSec) fixedEnd += 12 * 3600;
      return fixedEnd;
    };
    const startSec = parseClockToMinuteSec(startStr);
    const endSecRaw = parseClockToMinuteSec(endStr);
    const offStartSec = parseClockToMinuteSec(officialStartStr);
    const offEndSecRaw = parseClockToMinuteSec(officialEndStr);
    if (offStartSec == null || offEndSecRaw == null) return { rendered: ZERO_HM, maxRendered: ZERO_HM, tardiness: ZERO_HM };
    const offEndSec = normalizeEnd(offStartSec, offEndSecRaw);
    const endSec = normalizeEnd(startSec ?? offStartSec, endSecRaw);
    const maxRenderedSec = Math.max(0, offEndSec - offStartSec);
    let renderedSec = 0;
    if (startSec != null && endSec != null) {
      renderedSec = Math.max(0, Math.min(endSec, offEndSec) - Math.max(startSec, offStartSec));
    }
    return { rendered: formatSeconds(renderedSec), maxRendered: formatSeconds(maxRenderedSec), tardiness: formatSeconds(Math.max(0, maxRenderedSec - renderedSec)) };
  };

  const handleSubmit = async () => {
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    localStorage.setItem('attendanceNonTeachingEmployeeNumber', employeeNumber);
    localStorage.setItem('attendanceNonTeachingStartDate', startDate);
    localStorage.setItem('attendanceNonTeachingEndDate', endDate);
    setLoading(true); setError('');
    try {
    let branch = employeeBranch;
    if (branch == null && employeeNumber) {
      branch = await fetchEmployeeBranch({
        apiBaseUrl: API_BASE_URL,
        getAuthHeaders,
        employeeNumber,
      });
      setEmployeeBranch(branch);
    }
    const [deviceRows, maps, attendanceRes] = await Promise.all([
  postAttendanceDevicePreflightNoSync({ apiBaseUrl: API_BASE_URL, getAuthHeaders, personID: employeeNumber, startDate, endDate }),
  fetchAttendanceCalendarMaps({ apiBaseUrl: API_BASE_URL, getAuthHeaders, startDate, endDate, personId: employeeNumber }),
  axios.get(`${API_BASE_URL}/attendance/api/attendance`, { params: { personId: employeeNumber, startDate, endDate }, ...getAuthHeaders() }),
]);

const rawRows = Array.isArray(attendanceRes.data) ? attendanceRes.data : [];   // ← moved up

if (deviceRows.length === 0 && rawRows.length === 0) {                        // ← added `&& rawRows.length === 0`
  setAttendanceData([]); setSuspensionByDate({}); setLeaveByDate({}); setHolidayByDate({});
  showModal('No Device Records Found', 'No biometric device records were found for this employee within the selected date range, and no records have been manually added.\n\nPlease verify the employee number and date range, check if the attendance device has synced, or add records in Attendance Modification.\n\nPress OK to open Attendance Modification.', 'warning', () => {
    closeModal();
    if (embedded && typeof onOpenHubTool === 'function') onOpenHubTool('modification');
    else navigate('/view_attendance');
  });
  return;
}
if (rawRows.length === 0) {
  setAttendanceData([]); setSuspensionByDate({}); setLeaveByDate({}); setHolidayByDate({});
  showModal('No Official Time Schedule', `Device records were found for this employee (${deviceRows.length} day${deviceRows.length !== 1 ? 's' : ''}), but no matching Official Time Schedule exists for this period.\n\nPlease set up the official time schedule in the Official Time Management module before generating attendance records.\n\nPress OK to open Official Time.`, 'warning', () => {
    closeModal();
    if (embedded && typeof onOpenHubTool === 'function') onOpenHubTool('officialTime');
    else navigate('/official_time');
  });
  return;
}
   // Shorten officialTimeOUT to the applicable partial-suspension cutoff
// (never extending the original end) before the module's own formulas run.
// maps.suspensionByDate (full metadata) itself is untouched.
const suspensionAdjustedRawRows = clampNonTeachingRowsForPartialSuspension(
  rawRows,
  maps.suspensionByDate,
  branch,
);

const processedDataPreOverrides = suspensionAdjustedRawRows.map((row) => {
  const { timeIN, timeOUT, breaktimeIN, breaktimeOUT, officialBreaktimeIN, officialBreaktimeOUT, officialTimeIN, officialTimeOUT, officialHonorariumTimeIN, officialHonorariumTimeOUT, officialServiceCreditTimeIN, officialServiceCreditTimeOUT, officialOverTimeIN, officialOverTimeOUT } = row;
  const effBreakIn = resolveBreakPunchForSegment(breaktimeIN, officialBreaktimeIN, row);
  const effBreakOut = resolveBreakPunchForSegment(breaktimeOUT, officialBreaktimeOUT, row);
  const am = calcSegment(timeIN, effBreakIn, officialTimeIN, officialBreaktimeIN);
  const pm = calcSegment(effBreakOut, timeOUT, officialBreaktimeOUT, officialTimeOUT);
  const hn = calcSegment(timeIN, timeOUT, officialHonorariumTimeIN, officialHonorariumTimeOUT);
  const sc = calcSegment(timeIN, timeOUT, officialServiceCreditTimeIN, officialServiceCreditTimeOUT);
  const ot = calcSegment(timeIN, timeOUT, officialOverTimeIN, officialOverTimeOUT);
  const arrivalLateSec = computeArrivalLateMinuteSec(row) ?? 0;
  const earlyLeaveSec = computeEarlyLeaveUndertimeMinuteSec(row) ?? 0;
  const missingBreakSec = computeMissingBreakDeductionMinuteSec(row) ?? 0;
  // Missing Break IN/OUT → deduct official break length (charged on PM / undertime).
  const amTardiness = formatDurationHhMm(arrivalLateSec);
  const pmTardiness = formatDurationHhMm(earlyLeaveSec + missingBreakSec);
  return normalizeNonTeachingRowDurations({
    ...row,
    lateTotal: amTardiness,
    undertimeTotal: pmTardiness,
    missingBreakDeduction: formatDurationHhMm(missingBreakSec),
    formattedFacultyRenderedTimeAM: am.rendered,  formattedFacultyMaxRenderedTimeAM: am.maxRendered, formattedfinalcalcFacultyAM: amTardiness,
    formattedFacultyRenderedTimePM: pm.rendered,  formattedFacultyMaxRenderedTimePM: pm.maxRendered, formattedfinalcalcFacultyPM: pmTardiness,
    formattedFacultyRenderedTimeHN: hn.rendered,  formattedFacultyMaxRenderedTimeHN: hn.maxRendered, formattedfinalcalcFacultyHN: hn.tardiness,
    formattedFacultyRenderedTimeSC: sc.rendered,  formattedFacultyMaxRenderedTimeSC: sc.maxRendered, formattedfinalcalcFacultySC: sc.tardiness,
    formattedFacultyRenderedTimeOT: ot.rendered,  formattedFacultyMaxRenderedTimeOT: ot.maxRendered, formattedfinalcalcFacultyOT: ot.tardiness,
  });
});

// Whole-day suspension / holiday: zero late/undertime, matching the
// existing full-day exclusion behavior.
const processedData = applyNonTeachingWholeDayOverrides(
  processedDataPreOverrides,
  maps.holidayByDate,
  maps.suspensionByDate,
  branch,
);

// Scope-filtered map (whole + partial) for badges / calendar.
// Exclusion still ignores partial via isExcludedAttendanceCalendarDate.
const scopedSuspensionByDate = filterApplicableSuspensionsForNonTeaching(
  maps.suspensionByDate,
  branch,
);

const calendarMaps = {
  suspensionByDate: scopedSuspensionByDate,
  holidayByDate: maps.holidayByDate,
  leaveByDate: maps.leaveByDate,
  employeeBranch: branch,
};

      const buildReviewMapFromStored = (stored) =>
        migrateLegacyHalfDayReview(
          buildReviewByDate(parseHalfDayReviewJson(stored?.half_day_review)),
          stored?.halfDayDates ?? '',
          processedData,
          MODULE_TYPES.NON_TEACHING,
          calendarMaps,
        );

      const initialReviewMap = buildReviewMapFromStored({
        half_day_review: null,
        halfDayDates: '',
      });

setSuspensionByDate(scopedSuspensionByDate);
      setLeaveByDate(maps.leaveByDate);
      setHolidayByDate(maps.holidayByDate);
      setTardinessOverrides({});
      setAttendanceData(processedData);
      setHalfDayReviewByDate(initialReviewMap);

      const totalLateSec = processedData.reduce(
        (sum, row) =>
          sum +
          parseDurationToMinuteSec(row.lateTotal) +
          parseDurationToMinuteSec(row.undertimeTotal),
        0,
      );
      const totalLateLabel = formatDurationHhMm(totalLateSec);

      logAttendanceModuleAction({
        module: 'Attendance Module (Non-Teaching)',
        auditButton: 'Search Records',
        targetEmployeeNumber: employeeNumber,
        targetEmployeeName: processedData[0]?.username || null,
        periodStart: startDate,
        periodEnd: endDate,
        monthLabel: buildAuditPeriodLabel({
          selectedMonth,
          monthNames: months,
          selectedYear,
          startDate,
          endDate,
        }),
        searchQuery: employeeSearchQuery.trim() || employeeNumber,
        daysCalculated: processedData.length,
        totalLate: totalLateLabel,
      });

      void (async () => {
  try {
    const stored = await fetchDailyLateUndertime(
      employeeNumber,
      startDate,
      endDate,
    );
    // Hydrate HR half-day review decisions only. The module's own
    // suspension-aware computation in `processedData` is authoritative for
    // lateTotal/undertimeTotal and is no longer overwritten by whatever was
    // previously persisted — the module is the source of truth, not storage.
    setHalfDayReviewByDate(buildReviewMapFromStored(stored));
  } catch (err) {
    console.warn(
      'Half-day review fetch failed; using local cache:',
      err?.message || err,
    );
  }
})();
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      const msg = 'Failed to fetch attendance data. Please try again.';
      setError(msg); showSnackbar(msg, 'error');
    } finally {
      submitInFlightRef.current = false;
      setLoading(false);
    }
  };

  const sumTime = useCallback((values) => sumDurationHhMm(values), []);

  const addTimes = useCallback((a, b) => addTimeHhMmOnly(a, b), []);

  const totals = React.useMemo(() => {
    if (!attendanceData.length) return {};
    const calendarMaps = { suspensionByDate, holidayByDate, leaveByDate, employeeBranch };
    const ov = tardinessOverrides;
    const rv = halfDayReviewByDate;
    const buckets = computeNonTeachingMinuteBuckets(
      attendanceData,
      halfDayReviewByDate,
      calendarMaps,
      ov,
    );
    const morningRendered    = sumTime(attendanceData.map(r => getCellValue(r, '_morningRendered',    isFurloughForDate(r.date), ov, rv)));
    const morningTardiness   = sumTime(attendanceData.map(r => getCellValue(r, '_morningTardiness',   isFurloughForDate(r.date), ov, rv)));
    const afternoonRendered  = sumTime(attendanceData.map(r => getCellValue(r, '_afternoonRendered',  isFurloughForDate(r.date), ov, rv)));
    const totalRendered      = sumTime(attendanceData.map(r => getCellValue(r, '_totalRendered',      isFurloughForDate(r.date), ov, rv)));
    const afternoonTardiness = sumTime(attendanceData.map(r => getCellValue(r, '_afternoonTardiness', isFurloughForDate(r.date), ov, rv)));
    const overallRendered    = addTimes(morningRendered,  afternoonRendered);
    const rowTardinessSum = sumDurationHhMm(
      attendanceData.map((r) =>
        getCellValue(
          r,
          '_totalTardiness',
          isFurloughForDate(r.date),
          ov,
          rv,
        ),
      ),
    );
    const lateTotalTime = buckets.lateShortfallTime;
    const overallTardiness = buckets.overallShortfallTime;
    const hnRendered  = sumTime(attendanceData.map(r => getCellValue(r, '_hnRendered',  isFurloughForDate(r.date), ov, rv)));
    const hnTardiness = sumTime(attendanceData.map(r => getCellValue(r, '_hnTardiness', isFurloughForDate(r.date), ov, rv)));
    const scRendered  = sumTime(attendanceData.map(r => getCellValue(r, '_scRendered',  isFurloughForDate(r.date), ov, rv)));
    const scTardiness = sumTime(attendanceData.map(r => getCellValue(r, '_scTardiness', isFurloughForDate(r.date), ov, rv)));
    const otRendered  = sumTime(attendanceData.map(r => getCellValue(r, '_otRendered',  isFurloughForDate(r.date), ov, rv)));
    const otTardiness = sumTime(attendanceData.map(r => getCellValue(r, '_otTardiness', isFurloughForDate(r.date), ov, rv)));
    return {
      absentDays: buckets.absentDays,
      halfDays: buckets.halfDays,
      halfDaysForReview: countSuggestedHalfDays(
        halfDayReviewByDate,
        attendanceData,
        MODULE_TYPES.NON_TEACHING,
        calendarMaps,
      ),
      absentTime: buckets.absentTime,
      halfDayShortfallTime: buckets.halfDayShortfallTime,
      lateTotalTime,
      overallTardiness,
      overallShortfallTime: overallTardiness,
      rowTardinessSum,
      morningRendered,
      morningTardiness,
      afternoonRendered,
      afternoonTardiness,
      totalRendered,
      overallRendered: totalRendered || overallRendered,
      hnRendered,
      hnTardiness,
      scRendered,
      scTardiness,
      otRendered,
      otTardiness,
    };
  }, [attendanceData, sumTime, addTimes, isFurloughForDate, leaveByDate, holidayByDate, suspensionByDate, employeeBranch, tardinessOverrides, halfDayReviewByDate]);

  const isAbsentAttendanceRow = useCallback((row) => {
    const d = String(row?.date ?? '').slice(0, 10);
    const calendarMaps = { suspensionByDate, holidayByDate, leaveByDate, employeeBranch };
    if (isExcludedAttendanceCalendarDate(d, calendarMaps)) return false;
    if (!isScheduledByOfficialTime(row)) return false;
    return hasNoPunches(row);
  }, [suspensionByDate, holidayByDate, leaveByDate, employeeBranch]);

  const getHalfDayUiStatus = useCallback(
    (row) => {
      const calendarMaps = { suspensionByDate, holidayByDate, leaveByDate, employeeBranch };
      return getRowHalfDayUiStatus(row, halfDayReviewByDate, MODULE_TYPES.NON_TEACHING, calendarMaps);
    },
    [suspensionByDate, holidayByDate, leaveByDate, employeeBranch, halfDayReviewByDate],
  );

  const collectUnresolvedHalfDayDates = useCallback(() => (
    attendanceData
      .filter((row) => {
        if (isAbsentAttendanceRow(row)) return false;
        if (isFurloughForDate(row.date)) return false;
        return getHalfDayUiStatus(row) === 'suggested';
      })
      .map((row) => row.date)
  ), [attendanceData, isAbsentAttendanceRow, isFurloughForDate, getHalfDayUiStatus]);

  const warnUnresolvedHalfDays = useCallback(() => {
    const dates = collectUnresolvedHalfDayDates();
    if (!dates.length) return false;
    setUnresolvedDatesModal(dates);
    return true;
  }, [collectUnresolvedHalfDayDates]);

  const commitHalfDayReview = useCallback(
    (entry) => {
      const d = normalizeReviewDate(entry?.date);
      if (!d) return;
      setHalfDayReviewByDate((prev) => {
        const next = { ...prev, [d]: entry };
        void persistHalfDayReviewDailyLate({
          personID: employeeNumber,
          startDate,
          endDate,
          moduleType: MODULE_TYPES.NON_TEACHING,
          attendanceData,
          reviewByDate: next,
        });
        return next;
      });
      setTardinessOverrides((prev) => {
        const next = { ...prev };
        delete next[d];
        return next;
      });
      logAttendanceHalfDayReview({
        module: ATTENDANCE_AUDIT_MODULES.NON_TEACHING,
        entry,
        computationModuleType: MODULE_TYPES.NON_TEACHING,
        targetEmployeeNumber: employeeNumber,
        targetUsername: attendanceData[0]?.username || null,
        periodStart: startDate,
        periodEnd: endDate,
      });
    },
    [employeeNumber, startDate, endDate, attendanceData],
  );

  const openHalfDayDialog = useCallback((row, mode) => {
    setHalfDayReviewDialog({ row, mode });
  }, []);

  useEffect(() => {
    if (!employeeNumber || !startDate || !endDate || !attendanceData.length) return;
    if (persistDebounceRef.current) clearTimeout(persistDebounceRef.current);
    persistDebounceRef.current = setTimeout(() => {
      const approvedSet = getApprovedHalfDayDatesSet(halfDayReviewByDate);
      void persistDailyLateUndertimeFromModule({
        personID: employeeNumber,
        startDate,
        endDate,
        moduleType: 'NON_TEACHING',
        rows: buildDailyLateUndertimeRows(
          attendanceData,
          approvedSet,
          halfDayReviewByDate,
          MODULE_TYPES.NON_TEACHING,
        ),
        halfDayDates: [...approvedSet].join(', '),
        half_day_review: buildHalfDayReviewArray(halfDayReviewByDate),
      });
    }, 350);
    return () => {
      if (persistDebounceRef.current) clearTimeout(persistDebounceRef.current);
    };
  }, [halfDayReviewByDate, attendanceData, employeeNumber, startDate, endDate]);

  const navigateToOverallAttendanceSummary = useCallback(() => {
    if (embedded && typeof onSavedToSummary === 'function') {
      onSavedToSummary();
      return;
    }
    navigateAttendanceWorkflow(navigate, 'summary', {
      employeeNumber,
      startDate,
      endDate,
    });
  }, [embedded, onSavedToSummary, employeeNumber, startDate, endDate, navigate]);

  const buildOverallRecordPayload = () => {
    const calendarMaps = { suspensionByDate, holidayByDate, leaveByDate, employeeBranch };
    const approvedSet = getApprovedHalfDayDatesSet(halfDayReviewByDate);
    const dailyRows = buildDailyLateUndertimeRows(
      attendanceData,
      approvedSet,
      halfDayReviewByDate,
      MODULE_TYPES.NON_TEACHING,
    );
    return {
    ...(function computeAbsentHalfBuckets() {
      const c = computeNonTeachingMinuteBuckets(
        attendanceData,
        halfDayReviewByDate,
        calendarMaps,
        tardinessOverrides,
      );
      const absentList = listAbsentDatesFromDailyRows(attendanceData, calendarMaps);
      return {
        absentDays: c.absentDays,
        halfDays: c.halfDays,
        lateTotalTime: c.lateShortfallTime,
        absentTime: c.absentTime,
        halfDayShortfallTime: c.halfDayShortfallTime,
        absentDates: absentList.join(', '),
        halfDayDates: [...approvedSet].join(', '),
        half_day_review: buildHalfDayReviewArray(halfDayReviewByDate),
      };
    })(),
    personID: employeeNumber, startDate, endDate,
    totalRenderedTimeMorning:             totals.morningRendered,
    totalRenderedTimeMorningTardiness:    totals.morningTardiness,
    totalRenderedTimeAfternoon:           totals.afternoonRendered,
    totalRenderedTimeAfternoonTardiness:  totals.afternoonTardiness,
    totalRenderedHonorarium:              totals.hnRendered,
    totalRenderedHonorariumTardiness:     totals.hnTardiness,
    totalRenderedServiceCredit:           totals.scRendered,
    totalRenderedServiceCreditTardiness:  totals.scTardiness,
    totalRenderedOvertime:                totals.otRendered,
    totalRenderedOvertimeTardiness:       totals.otTardiness,
    overallRenderedOfficialTime:          totals.overallRendered,
    overallRenderedOfficialTimeTardiness: totals.overallTardiness,
    daily_late_undertime: dailyRows,
    computation_module_type: 'NON_TEACHING',
  };
  };

  const putMergedOverall = async (mergedPayload, recordId) => {
    await axios.put(`${API_BASE_URL}/attendance/api/overall_attendance_record/${recordId}`, mergedPayload, getAuthHeaders());
    notifyModuleSaveSuccess(embedded, showSnackbar, 'Attendance summary updated from your choices.');
    navigateToOverallAttendanceSummary();
  };

  const saveOverallAttendance = async () => {
    if (warnUnresolvedHalfDays()) return;
    const record = buildOverallRecordPayload();
    setSaving(true);
    try {
      const dup = await axios.get(`${API_BASE_URL}/attendance/api/overall_attendance_record`, { params: { personID: employeeNumber, startDate, endDate }, ...getAuthHeaders() });
      const existingList = dup.data?.data || [];
      const { action, existing } = classifyOverallSave(existingList, startDate, endDate, record);
      if (action === 'fill-stub' && existing?.id) {
        await axios.put(`${API_BASE_URL}/attendance/api/overall_attendance_record/${existing.id}`, record, getAuthHeaders());
        notifyModuleSaveSuccess(embedded, showSnackbar, 'Attendance summary saved.');
        await persistDailyLateUndertimeFromModule({
          personID: employeeNumber,
          startDate,
          endDate,
          moduleType: 'NON_TEACHING',
          rows: record.daily_late_undertime,
          halfDayDates: record.halfDayDates,
          half_day_review: record.half_day_review,
        });
        navigateToOverallAttendanceSummary();
        return;
      }
      if (action === 'duplicate-info') {
        if (embedded) {
          navigateToOverallAttendanceSummary();
          return;
        }
        showSnackbar('Summary already matches these totals.', 'info');
        showModal('Duplicate attendance summary', `A summary for employee ${employeeNumber} (${startDate} to ${endDate}) already exists and matches these totals.\n\nNothing new will be saved. You can continue to Attendance Summary to review or use payroll routing.`, 'info',
          () => { closeModal(); if (warnUnresolvedHalfDays()) return; navigateToOverallAttendanceSummary(); }, true, 'Continue to summary');
        return;
      }
      if (action === 'auto-update' && existing?.id) {
        await axios.put(`${API_BASE_URL}/attendance/api/overall_attendance_record/${existing.id}`, record, getAuthHeaders());
        notifyModuleSaveSuccess(embedded, showSnackbar, 'Attendance summary updated.');
        await persistDailyLateUndertimeFromModule({
          personID: employeeNumber,
          startDate,
          endDate,
          moduleType: 'NON_TEACHING',
          rows: record.daily_late_undertime,
          halfDayDates: record.halfDayDates,
          half_day_review: record.half_day_review,
        });
        navigateToOverallAttendanceSummary();
        return;
      }
      if (action === 'compare' && existing) {
        setPendingSavedOverall(existing);
        setPendingProposedOverall(record);
        setLoading(false);
        setCompareOpen(true);
        return;
      }
    } catch (e) {
      console.error('Duplicate-check failed:', e);
      showModal('Verification Failed', 'Could not verify existing records. Saving has been aborted.\n\nPlease try again or contact your administrator.', 'error');
      return;
    } finally { setSaving(false); }
    setSaving(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/attendance/api/overall_attendance`, record, getAuthHeaders());
      notifyModuleSaveSuccess(
        embedded,
        showSnackbar,
        response.data.message || 'Attendance record saved successfully!',
      );
      await persistDailyLateUndertimeFromModule({
        personID: employeeNumber,
        startDate,
        endDate,
        moduleType: 'NON_TEACHING',
        rows: record.daily_late_undertime,
        halfDayDates: record.halfDayDates,
        half_day_review: record.half_day_review,
      });
      navigateToOverallAttendanceSummary();
    } catch (err) {
      console.error('Error saving overall attendance:', err);
      showSnackbar('Failed to save attendance record.', 'error');
    } finally { setSaving(false); }
  };

  const saveOverallAttendanceRef = useRef(saveOverallAttendance);
  useEffect(() => {
    saveOverallAttendanceRef.current = saveOverallAttendance;
  });
  const lastSaveSignalRef = useRef(saveSignal);
  useEffect(() => {
    if (!embedded || !saveSignal) return;
    if (saveSignal === lastSaveSignalRef.current) return;
    lastSaveSignalRef.current = saveSignal;
    saveOverallAttendanceRef.current?.();
  }, [saveSignal, embedded]);

  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => { handleSubmitRef.current = handleSubmit; });

  useEmbeddedModuleAutoSearch({
    embedded,
    initialContext,
    accessLoading,
    hasAccess,
    refreshEpoch,
    setEmployeeNumber,
    setEmployeeDisplayName,
    setStartDate,
    setEndDate,
    setSelectedYear,
    setSelectedMonth,
    runSearchRef: handleSubmitRef,
  });

  const handleWorkflowHydrate = useCallback((payload) => {
    setEmployeeNumber(payload.employeeNumber || '');
    setEmployeeDisplayName(payload.fullName || '');
    setStartDate(payload.startDate);
    setEndDate(payload.endDate);
    if (payload.selectedYear != null) setSelectedYear(payload.selectedYear);
    if (payload.selectedMonth != null) setSelectedMonth(payload.selectedMonth);
    setTimeout(() => {
      handleSubmitRef.current?.();
    }, 300);
  }, []);

  const {
    prevStep,
    nextStep,
    goPrevious,
    goNext,
  } = useAttendanceWorkflow('non_teaching', {
    employeeNumber,
    fullName: employeeDisplayName,
    startDate,
    endDate,
    onHydrate: handleWorkflowHydrate,
  });

  const handleWorkflowNext = useCallback(() => {
    if (warnUnresolvedHalfDays()) return;
    goNext();
  }, [warnUnresolvedHalfDays, goNext]);

  useAttendanceRealtimeRefresh(
    useCallback(() => {
      if (!employeeNumber || !startDate || !endDate) return;
      handleSubmitRef.current();
    }, [employeeNumber, startDate, endDate]),
    { personId: employeeNumber, startDate, endDate, requireDateRange: true, matchMode: 'strict' },
  );

  useAttendancePageScroll(loading, attendanceData.length > 0);

  const handleCompareClose = () => { setCompareOpen(false); setPendingSavedOverall(null); setPendingProposedOverall(null); };
  const handleCompareConfirm = async (choices) => {
    if (!pendingSavedOverall?.id || !pendingProposedOverall) { handleCompareClose(); return; }
    setCompareOpen(false); setSaving(true);
    try {
      const merged = mergeOverallPayload({ savedRow: pendingSavedOverall, proposed: pendingProposedOverall, choices, personID: employeeNumber, startDate, endDate });
      await putMergedOverall(merged, pendingSavedOverall.id);
      await persistDailyLateUndertimeFromModule({
        personID: employeeNumber,
        startDate,
        endDate,
        moduleType: 'NON_TEACHING',
        rows: merged.daily_late_undertime ?? pendingProposedOverall.daily_late_undertime,
        halfDayDates: merged.halfDayDates,
        half_day_review: merged.half_day_review,
      });
    } catch (err) {
      console.error('Error updating overall attendance:', err);
      showSnackbar(err.response?.data?.message || 'Failed to update attendance record.', 'error');
    } finally { setSaving(false); setPendingSavedOverall(null); setPendingProposedOverall(null); }
  };

  const handleMonthClick = (monthIndex) => {
    const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const end   = new Date(Date.UTC(selectedYear, monthIndex + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex);
  };

  const handleClearFilters = () => {
    setEmployeeNumber('');
    setEmployeeDisplayName('');
    setEmployeeSearchQuery('');
    setEmployeeBranch(null);
    setStartDate(''); setEndDate('');
    setAttendanceData([]); setError(''); setSelectedMonth(null);
    setSuspensionByDate({}); setLeaveByDate({}); setHolidayByDate({});
    setTardinessOverrides({});
    setHalfDayReviewByDate({});
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  if (pageLoading || accessLoading) return <AttendanceNonTeachingWireframe />;
  if (hasAccess === false) return (
    <AccessDenied title="Access Denied" message="You do not have permission to access Attendance Module for Non-Teaching Staff. Contact your administrator to request access." returnPath="/admin-home" returnButtonText="Return to Home" />
  );

  const allColumns = TAB_COLUMNS[activeTab];
  const hid = hiddenColumnSets[activeTab] || defaultHiddenSets();
  const visibleColumns = allColumns.filter((col) => !(col.set && hid[col.set]));
  const allHidden = COLUMN_SETS.every((x) => hid[x.key]);
  const allShown = COLUMN_SETS.every((x) => !hid[x.key]);

  // ── Single-row table head ─────────────────────────────────────────────
  const buildTableHead = () => (
    <TableHead>
      <TableRow>
        {visibleColumns.map((col) => {
          const halfDayTotalCol = halfDayTotalColumnVariant(col.key);
          return (
            <TableCell
              key={col.key + '_h'}
              sx={{
                position: 'sticky',
                top: 0,
                left: col.sticky ? 0 : 'auto',
                zIndex: col.sticky ? 4 : 3,
                bgcolor: T.accent,
                fontWeight: 700,
                fontSize: '0.65rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: '#fff',
                textAlign: col.sticky ? 'left' : 'center',
                px: 1.75,
                py: 1.35,
                minWidth: col.minWidth || 80,
                borderBottom: `2px solid ${T.accentBorder}`,
                borderRight: `1px solid rgba(255,255,255,0.15)`,
                whiteSpace: halfDayTotalCol ? 'normal' : 'nowrap',
                verticalAlign: 'middle',
              }}
            >
              <HalfDayTotalColumnHeader label={col.label} colKey={col.key} />
            </TableCell>
          );
        })}
      </TableRow>
    </TableHead>
  );

  // ── Cell builder ──────────────────────────────────────────────────────
  const buildCell = (content, group, isEven, opts = {}) => (
    <TableCell sx={{
      borderBottom: `1px solid ${T.divider}`,
      borderRight: `1px solid ${T.divider}`,
      px: 1.75, py: 1, whiteSpace: 'nowrap', textAlign: 'center',
      color: group === 'official' ? T.faint : T.text,
      fontWeight: group === 'official' ? 400 : 500,
      fontSize: group === 'official' ? '0.75rem' : '0.8rem',
      fontFamily: T.recordFont,
      fontVariantNumeric: 'tabular-nums',
      bgcolor: isEven ? '#fff' : T.rowOdd,
      transition: 'background-color 0.12s',
      'tr:hover &': { bgcolor: `${T.rowHover} !important` },
      ...opts.sx,
    }}>{group === 'calc' || group === 'tard' ? displayDurationHhMm(content) : (content === '—' || content === 'N/A'
      ? <Box component="span" sx={{ color: T.faint, fontWeight: 400 }}>{content}</Box>
      : content)}</TableCell>
  );

  // ── Totals row ────────────────────────────────────────────────────────
  /** @param {{ renderedColKey?: string, tardColKey?: string }} [opts] */
  const renderTotalsRow = (label, renderedVal, tardinessVal, opts = {}) => {
    const { renderedColKey, tardColKey, overall = false } = opts;
    const renderedKeys  = visibleColumns.filter(c => c.group === 'calc').map(c => c.key);
    const tardinessKeys = visibleColumns.filter(c => c.group === 'tard').map(c => c.key);
    const firstMetricIdx = visibleColumns.findIndex(c => c.group === 'calc' || c.group === 'tard');
    const labelSpan = firstMetricIdx < 1 ? Math.max(visibleColumns.length, 1) : firstMetricIdx;

    const targetRenderedKey = renderedColKey || renderedKeys[renderedKeys.length - 1];
    const targetTardKey     = tardColKey     || tardinessKeys[tardinessKeys.length - 1];
    const renderedVisible = targetRenderedKey && visibleColumns.some(c => c.key === targetRenderedKey);
    const tardVisible = targetTardKey && visibleColumns.some(c => c.key === targetTardKey);

    return (
      <TableRow sx={{
        bgcolor: overall ? '#fff' : '#fafafa',
        borderTop: overall ? `2px solid ${T.accent}` : `2px solid ${T.accentBorder}`,
      }}>
        {visibleColumns.map((col, ci) => {
          if (ci === 0) {
            return (
              <TableCell
                key={col.key + '_tl'}
                colSpan={labelSpan}
                sx={{
                  fontSize: overall ? '0.72rem' : '0.7rem',
                  fontWeight: overall ? 800 : 700,
                  color: overall ? T.accent : T.faint,
                  textAlign: 'right',
                  pr: 2.5,
                  py: overall ? 1.5 : 1.25,
                  borderBottom: 'none',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  position: col.sticky ? 'sticky' : 'static',
                  left: col.sticky ? 0 : 'auto',
                  zIndex: col.sticky ? 1 : 'auto',
                  bgcolor: overall ? '#fff' : '#fafafa',
                }}
              >
                {label}
                {!renderedVisible && renderedVal != null && (
                  <Box component="span" sx={{ ml: 1, color: T.rendered.color, textTransform: 'none', letterSpacing: 0, fontSize: '0.78rem', fontWeight: 700 }}>
                    {displayDurationHhMm(renderedVal)} rendered
                  </Box>
                )}
                {overall && !tardVisible && tardinessVal != null && (
                  <Box component="span" sx={{ ml: 1, color: T.tardiness.color, textTransform: 'none', letterSpacing: 0, fontSize: '0.78rem', fontWeight: 700 }}>
                    {formatTardinessAsDaysHours(tardinessVal)} ({displayDurationHhMm(tardinessVal)})
                  </Box>
                )}
              </TableCell>
            );
          }
          if (ci < labelSpan) return null;
          const showRendered  = col.group === 'calc' && targetRenderedKey && col.key === targetRenderedKey;
          const showTardiness = col.group === 'tard' && targetTardKey && col.key === targetTardKey;
          if (showRendered) return (
            <TableCell key={col.key + '_tr'} sx={{ fontFamily: T.recordFont, fontWeight: 800, fontSize: '0.88rem', textAlign: 'center', py: 1.25, borderBottom: 'none', color: T.rendered.color, bgcolor: T.rendered.bg, fontVariantNumeric: 'tabular-nums' }}>
              {displayDurationHhMm(renderedVal)}
            </TableCell>
          );
          if (showTardiness) return (
            <TableCell key={col.key + '_tt'} sx={{ fontFamily: T.recordFont, fontWeight: 800, fontSize: '0.88rem', textAlign: 'center', py: 1.25, borderBottom: 'none', color: T.tardiness.color, bgcolor: T.tardiness.bg, fontVariantNumeric: 'tabular-nums' }}>
              {overall ? (
                <>
                  <Typography sx={{ fontFamily: T.recordFont, fontWeight: 900, fontSize: '0.95rem' }}>{formatTardinessAsDaysHours(tardinessVal || ZERO_HM)}</Typography>
                  <Typography sx={{ fontFamily: T.recordFont, fontWeight: 600, fontSize: '0.68rem', opacity: 0.6 }}>{displayDurationHhMm(tardinessVal)}</Typography>
                </>
              ) : displayDurationHhMm(tardinessVal)}
            </TableCell>
          );
          return <TableCell key={col.key + '_td'} sx={{ borderBottom: 'none', bgcolor: overall ? '#fff' : '#fafafa', textAlign: 'center', color: T.faint, fontSize: '0.75rem' }} />;
        })}
      </TableRow>
    );
  };

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <Fade in timeout={400}>
      <Box sx={embedded ? ATTENDANCE_EMBEDDED_ROOT_SX : {
        py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 },
        pb: ATTENDANCE_PAGE_BOTTOM_PAD,
        width: '100vw', maxWidth: '100%',
        position: 'relative', left: '53%', transform: 'translateX(-51%)',
        px: { xs: 2, sm: 3, md: 6 },
      }}>
        <style>{`${ATTENDANCE_PAGE_SCROLL_CSS}${shimmerKf}`}</style>

        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled"
            sx={{ width: '100%', fontWeight: 600, backgroundColor: snackbar.severity === 'success' ? '#4caf50' : undefined, color: snackbar.severity === 'success' ? '#ffffff' : undefined, '& .MuiAlert-icon': { color: snackbar.severity === 'success' ? '#ffffff' : undefined } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>{snackbar.message}</span>
              {snackbar.open && snackbarCountdown > 0 && (
                <Chip label={`${snackbarCountdown}s`} size="small" sx={{ backgroundColor: snackbar.severity === 'success' ? 'rgba(255,255,255,0.3)' : undefined, color: snackbar.severity === 'success' ? '#ffffff' : undefined, fontWeight: 700 }} />
              )}
            </Box>
          </Alert>
        </Snackbar>

        <LoadingOverlay open={loading && !compareOpen} message="Fetching attendance records…" />

        {embedded ? (
          <Box sx={{ flexShrink: 0, mb: 1.25, px: 1.5, py: 1, borderRadius: '10px', border: `1px solid ${T.accentBorder}`, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
              <WorkHistory sx={{ fontSize: 20, color: T.accent }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 900, color: T.accent, lineHeight: 1.15 }}>Non-Teaching | JO Computation</Typography>
                <Typography sx={{ fontSize: '0.68rem', color: T.accentMid, fontWeight: 600 }}>Review tardiness, then Save to Summary</Typography>
              </Box>
            </Box>
            {typeof onClose === 'function' && (
              <IconButton onClick={onClose} size="small" sx={{ bgcolor: T.accent, color: '#fff', '&:hover': { bgcolor: T.accentDark } }}>
                <Close sx={{ fontSize: 18 }} />
              </IconButton>
            )}
          </Box>
        ) : (
        /* Page Header */
        <SectionCard sx={{ mb: 2 }}>
          <Box sx={{ px: 4, py: 3, background: 'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.10) 0%,transparent 70%)' }} />
            <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)' }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, position: 'relative', zIndex: 1 }}>
              <WorkHistory sx={{ fontSize: 30, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.25 }}>Attendance Records (Non-Teaching | JO)</Typography>
                <Typography sx={{ fontSize: '0.78rem', color: T.accentMid, fontWeight: 600 }}>Non-Teaching & Job Order (JO) Staff · Generate and review attendance records</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
              <AttendanceWorkflowNav
                inline
                prevStep={prevStep}
                nextStep={nextStep}
                onPrevious={goPrevious}
                onNext={handleWorkflowNext}
              />
              <Box sx={{ px: 2, py: 0.6, borderRadius: 5, bgcolor: alpha('#4caf50', 0.12), border: '1px solid rgba(76,175,80,0.25)' }}>
                <Typography sx={{ fontSize: '0.72rem', color: '#2e7d32', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CheckCircleIcon sx={{ fontSize: 12 }} /> Non-Teaching | JO
                </Typography>
              </Box>
              <button onClick={handleSubmit} disabled={!employeeNumber || !startDate || !endDate}
                style={{ background: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, borderRadius: '8px', padding: '7px 10px', cursor: (!employeeNumber || !startDate || !endDate) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: T.accent, fontSize: '0.75rem', fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.15s', opacity: (!employeeNumber || !startDate || !endDate) ? 0.5 : 1 }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = alpha(T.accent, 0.14); }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = alpha(T.accent, 0.08); }}>
                <Refresh sx={{ fontSize: 15 }} /> Refresh
              </button>
            </Box>
          </Box>
        </SectionCard>
        )}

        <Collapse in={!!error}>
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.82rem' }}>{error}</Alert>
        </Collapse>

        {/* Controls — hidden in DTR sliding drawer (context is seeded automatically) */}
        {!embedded && (
        <SectionCard sx={{ mb: 2 }}>
          <PanelHeader icon={FilterList} title="Filter Attendance Records" />
          <Box sx={{ px: 2.5, pt: 2, pb: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Employee Number</Typography>
                <EmployeeSearchField
                  value={employeeNumber}
                  displayName={employeeDisplayName}
                  themeT={T}
                  onSearchQueryChange={setEmployeeSearchQuery}
                  onSelectEmployeeNumber={setEmployeeNumber}
                  onSelectEmployeeName={setEmployeeDisplayName}
                  onSelectEmployee={(emp) =>
                    setEmployeeBranch(
                      emp?.branch != null && emp?.branch !== ''
                        ? Number(emp.branch)
                        : null,
                    )
                  }
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Start Date</Typography>
                <NativeInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} icon={<CalendarToday sx={{ fontSize: 15 }} />} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>End Date</Typography>
                <NativeInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} icon={<CalendarToday sx={{ fontSize: 15 }} />} />
              </Box>
            </Box>
            <Box sx={{ height: 1, bgcolor: T.divider, mb: 2 }} />
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, mb: 1.25, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <FilterList sx={{ fontSize: 13 }} /> Quick Date Selection
            </Typography>
            <Box sx={{ p: 2.5, borderRadius: 2, border: `2px dashed ${T.accentBorder}`, bgcolor: T.accentFaint }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: T.accent, mb: 0.3 }}>Select Entire Month</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>Choose a year, then click any month to set the date range</Typography>
                </Box>
                <FormControl sx={{ minWidth: 130 }} size="small">
                  <InputLabel sx={{ fontWeight: 600, fontSize: '0.8rem' }}>Year</InputLabel>
                  <Select value={selectedYear} label="Year"
                    onChange={(e) => { setSelectedYear(e.target.value); setSelectedMonth(null); showSnackbar('Year changed — please click a month to load records.', 'info'); }}
                    sx={{ bgcolor: '#fff', borderRadius: 2, fontWeight: 600, fontSize: '0.85rem', '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder } }}>
                    {yearOptions.map(y => <MenuItem key={y} value={y} sx={{ fontSize: '0.85rem' }}>{y}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, justifyContent: 'center' }}>
                {months.map((month, index) => {
                  const sel = selectedMonth === index;
                  return (
                    <button key={month} onClick={() => handleMonthClick(index)}
                      style={{ background: sel ? T.accent : '#fff', border: `1px solid ${sel ? T.accent : T.accentBorder}`, borderRadius: '6px', padding: '7px 14px', cursor: 'pointer', color: sel ? '#fff' : T.accent, fontSize: '0.75rem', fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.15s ease', boxShadow: sel ? `0 2px 8px ${alpha(T.accent,0.25)}` : 'none', letterSpacing: '0.04em' }}
                      onMouseEnter={e => { if (!sel) { e.currentTarget.style.backgroundColor = T.accentFaint; e.currentTarget.style.borderColor = T.accent; } }}
                      onMouseLeave={e => { if (!sel) { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = T.accentBorder; } }}>
                      {month}
                    </button>
                  );
                })}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, flexWrap: 'wrap', gap: 1 }}>
              <RowBtn icon={<Clear sx={{ fontSize: 13 }} />} label="Clear All Filters" color="#C62828" hoverBg="rgba(198,40,40,0.08)" onClick={handleClearFilters} />
              <RowBtn
                icon={<Search sx={{ fontSize: 13 }} />}
                label="Search Records"
                color={T.accent} hoverBg={T.accentFaint}
                disabled={!employeeNumber || !startDate || !endDate || loading}
                onClick={handleSubmit}
              />
            </Box>
          </Box>
        </SectionCard>
        )}

        {/* Results */}
        {attendanceData.length > 0 && (
          <Fade in timeout={250}>
            <SectionCard ref={resultsRef} sx={{ mb: 2 }}>
              <PanelHeader
                icon={Assignment}
                title={
                  employeeDisplayName
                    ? `Records for ${employeeNumber} | ${employeeDisplayName}`
                    : `Records for ${employeeNumber}`
                }
                rightContent={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>{startDate} → {endDate}</Typography>
                    <Box sx={{ px: 1.5, py: 0.3, borderRadius: 5, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.18)}` }}>
                      <Typography sx={{ fontSize: '0.72rem', color: T.accent, fontWeight: 700 }}>
                        {attendanceData.length} {attendanceData.length === 1 ? 'record' : 'records'}
                      </Typography>
                    </Box>
                  </Box>
                }
              />

              {/* Tab switcher */}
              <Box sx={{ display: 'flex', mx: 2.25, mt: 2, border: `1px solid ${T.accentBorder}`, borderRadius: '8px', overflow: 'hidden' }}>
                {VIEW_TABS.map(({ key, label, icon }, i, arr) => (
                  <button key={key} onClick={() => setActiveTab(key)}
                    style={{ flex: 1, border: 'none', borderRight: i < arr.length - 1 ? `1px solid ${T.accentBorder}` : 'none', borderRadius: 0, padding: '10px 8px', cursor: 'pointer', background: activeTab === key ? T.accentDark : 'transparent', color: activeTab === key ? '#fff' : T.accent, fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', transition: 'all 0.15s ease' }}
                    onMouseEnter={e => { if (activeTab !== key) e.currentTarget.style.backgroundColor = T.accentFaint; }}
                    onMouseLeave={e => { if (activeTab !== key) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                    {icon}{label}
                  </button>
                ))}
              </Box>

              {/* Table */}
              <Box sx={{ px: 2.25, pt: 1.75, pb: 2.25 }}>
                {/* Columns toolbar */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.25 }}>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: T.muted, letterSpacing: '0.06em', textTransform: 'uppercase', mr: 0.25 }}>
                    Columns
                  </Typography>
                  <Box
                    role="group"
                    aria-label="Column preset"
                    sx={{ display: 'inline-flex', gap: '2px', p: '3px', bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderRadius: '10px' }}
                  >
                    <SegBtn label="Compact view" pressed={allHidden} onClick={() => applyColumnPreset(activeTab, 'compact')} />
                    <SegBtn label="Show all" pressed={allShown} onClick={() => applyColumnPreset(activeTab, 'all')} />
                  </Box>
                  <Box
                    role="group"
                    aria-label="Show or hide columns"
                    sx={{ display: 'inline-flex', gap: '2px', p: '3px', bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderRadius: '10px' }}
                  >
                    {COLUMN_SETS.map((x) => (
                      <SegBtn
                        key={x.key}
                        label={x.label}
                        pressed={!hid[x.key]}
                        onClick={() => toggleColumnSet(activeTab, x.key)}
                      />
                    ))}
                  </Box>
                  <Typography sx={{ ml: 'auto', fontSize: '0.72rem', color: T.faint }}>
                    Showing {visibleColumns.length} of {allColumns.length} columns
                  </Typography>
                </Box>

                <Box sx={{ position: 'relative', borderRadius: '8px', border: `1px solid ${T.accentBorder}`, overflow: 'visible', bgcolor: '#fff' }}>
                  <Box
                    sx={{ overflowY: 'auto', maxHeight: 560, ...ATTENDANCE_ALWAYS_VISIBLE_X_SCROLL_SX }}>
                    <Table sx={{ minWidth: visibleColumns.reduce((s, col) => s + (col.minWidth || 100), 0), borderCollapse: 'separate', borderSpacing: 0 }}>
                      {buildTableHead()}
                      <TableBody>
                        {attendanceData.map((row, index) => {
                          const statusLabel = getStatusLabelForDate(row.date);
                          const isFurlough  = isFurloughForDate(row.date);
                          const isEven      = index % 2 === 0;
                          const rowIsAbsent = isAbsentAttendanceRow(row);
                          const isHoliday = statusLabel === 'HOLIDAY';
                          const halfUi =
                            !rowIsAbsent && !isFurlough
                              ? getHalfDayUiStatus(row)
                              : null;
                          const halfDayChrome = halfUi
                            ? getHalfDayReviewRowChrome(halfUi, T)
                            : null;
                          const rowBg = rowIsAbsent
                            ? alpha('#c62828', 0.08)
                            : isHoliday
                              ? alpha('#f57c00', 0.08)
                              : halfDayChrome?.rowBg;
                          const rowBorder = rowIsAbsent
                            ? `3px solid ${T.absent.border}`
                            : isHoliday
                              ? `3px solid ${T.holiday.border}`
                              : halfDayChrome?.rowBorder ?? '3px solid transparent';
                          const faintRest = isFurlough && !rowIsAbsent && !isHoliday && !halfUi;

                          return (
                            <TableRow
                              key={row.date || index}
                              sx={{
                                color: faintRest ? T.faint : 'inherit',
                                '&:hover td': { bgcolor: `${T.rowHover} !important` },
                                ...(rowBg ? { '& td': { bgcolor: `${rowBg} !important` } } : {}),
                              }}
                            >
                              {visibleColumns.map((col) => {
                                if (col.key === 'date') return (
                                  <TableCell
                                    key={col.key}
                                    sx={{
                                      position: 'sticky',
                                      left: 0,
                                      zIndex: 1,
                                      fontSize: '0.8rem',
                                      fontWeight: 600,
                                      color: faintRest ? T.faint : T.text,
                                      bgcolor: rowBg || (isEven ? '#fff' : T.rowOdd),
                                      borderBottom: `1px solid ${T.divider}`,
                                      borderLeft: rowBorder,
                                      borderRight: `1px solid ${T.divider}`,
                                      px: 1.75,
                                      py: 1,
                                      whiteSpace: 'nowrap',
                                      textAlign: 'left',
                                      minWidth: 170,
                                      transition: 'background-color 0.12s',
                                      boxShadow: rowBorder !== '3px solid transparent' ? `inset 3px 0 0 ${rowIsAbsent ? T.absent.border : isHoliday ? T.holiday.border : T.halfDay.border}` : 'none',
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.25 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 0.75 }}>
                                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: T.text, lineHeight: 1.2 }}>
                                          {row.date}
                                        </Typography>
                                        {!rowIsAbsent && halfUi && (
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
                                            {halfUi === 'approved' ? (
                                              <Box/>
                                            ) : halfUi === 'rejected' ? (
                                              <Box/>
                                            ) : (
                                              <>
                                                <Tooltip title="Approve half day — enter rendered time" placement="top" arrow>
                                                  <IconButton
                                                    size="small"
                                                    onClick={() => openHalfDayDialog(row, 'approve')}
                                                    sx={{
                                                      p: 0.4,
                                                      borderRadius: '4px',
                                                      border: `1px solid ${T.divider}`,
                                                      bgcolor: 'transparent',
                                                      color: T.faint,
                                                      '&:hover': { bgcolor: T.halfDay.bg, borderColor: T.halfDay.border },
                                                    }}
                                                  >
                                                    <Box sx={{
                                                      width: 13, height: 13, borderRadius: '2px',
                                                      border: `2px solid ${T.faint}`,
                                                      bgcolor: 'transparent',
                                                    }} />
                                                  </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Deny half day — enter tardiness for Late Total" placement="top" arrow>
                                                  <IconButton
                                                    size="small"
                                                    onClick={() => openHalfDayDialog(row, 'reject')}
                                                    sx={{
                                                      p: 0.4,
                                                      borderRadius: '4px',
                                                      border: `1px solid ${T.divider}`,
                                                      bgcolor: 'transparent',
                                                      color: T.faint,
                                                      '&:hover': { bgcolor: alpha(T.accent, 0.08), borderColor: T.accentBorder },
                                                    }}
                                                  >
                                                    <CloseIcon sx={{ fontSize: 13 }} />
                                                  </IconButton>
                                                </Tooltip>
                                              </>
                                            )}
                                          </Box>
                                        )}
                                      </Box>
                                      {rowIsAbsent && (
                                        <Chip size="small" label="Absent" sx={{ fontWeight: 800, fontSize: '0.6rem', height: 16, mt: 0.3, bgcolor: alpha('#b71c1c', 0.12), color: '#b71c1c', border: `1px solid ${alpha('#b71c1c', 0.35)}` }} />
                                      )}
                                      {!rowIsAbsent && halfUi === 'suggested' && (
                                        <Chip size="small" label="Half day — for review" sx={{ fontWeight: 800, fontSize: '0.58rem', height: 16, mt: 0.3, bgcolor: T.halfDay.bg, color: T.halfDay.color, border: `1px solid ${T.halfDay.border}` }} />
                                      )}
                                      {!rowIsAbsent && halfUi === 'approved' && (
                                        <Chip size="small" label="Half day — confirmed" sx={{ fontWeight: 800, fontSize: '0.58rem', height: 16, mt: 0.3, bgcolor: T.halfDay.bg, color: T.halfDay.color, border: `1px solid ${T.halfDay.border}` }} />
                                      )}
                                      {!rowIsAbsent && halfUi === 'rejected' && (
                                        <Chip size="small" label="Not half day" sx={{ fontWeight: 800, fontSize: '0.58rem', height: 16, mt: 0.3, bgcolor: alpha(T.accent, 0.1), color: T.accent, border: `1px solid ${T.accentBorder}` }} />
                                      )}
                                      {statusLabel && <StatusChip label={statusLabel} />}
                                    </Box>
                                  </TableCell>
                                );

                                if (col.key === 'day') return (
                                  <TableCell key={col.key} sx={{ fontSize: '0.8rem', color: T.muted, bgcolor: isEven ? '#fff' : T.rowOdd, borderBottom: `1px solid ${T.divider}`, borderRight: `1px solid ${T.divider}`, px: 1.5, py: 0.9, textAlign: 'center', transition: 'background-color 0.12s' }}>
                                    {row.day}
                                  </TableCell>
                                );

                                if (activeTab === 'regular' && (col.key === 'breaktimeIN' || col.key === 'breaktimeOUT')) {
                                  const showMissingBreak =
                                    !rowIsAbsent && !isFurlough && computeMissingBreakDeductionMinuteSec(row) > 0;
                                  const breakInIdx = visibleColumns.findIndex((c) => c.key === 'breaktimeIN');
                                  const breakOutIdx = visibleColumns.findIndex((c) => c.key === 'breaktimeOUT');
                                  const breaksAdjacent =
                                    breakInIdx >= 0 && breakOutIdx === breakInIdx + 1;

                                  // One centered label spanning Break IN + Break OUT when both are adjacent.
                                  if (showMissingBreak && breaksAdjacent) {
                                    if (col.key === 'breaktimeOUT') return null;
                                    return (
                                      <TableCell
                                        key="breaktime-missing"
                                        colSpan={2}
                                        sx={{
                                          borderBottom: `1px solid ${T.divider}`,
                                          borderRight: `1px solid ${T.divider}`,
                                          px: 1.5,
                                          py: 0.9,
                                          textAlign: 'center',
                                          verticalAlign: 'middle',
                                          fontFamily: T.recordFont,
                                          bgcolor: T.tardiness.bg,
                                          transition: 'background-color 0.12s',
                                          'tr:hover &': { bgcolor: `${T.rowHover} !important` },
                                        }}
                                      >
                                        <Typography
                                          component="span"
                                          sx={{
                                            fontSize: '0.58rem',
                                            fontWeight: 700,
                                            color: T.tardiness.color,
                                            lineHeight: 1.2,
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          No break punch — deducted
                                        </Typography>
                                      </TableCell>
                                    );
                                  }

                                  // Fallback: show the note once under Break IN only.
                                  const punchVal = getCellValue(row, col.key, isFurlough, null, halfDayReviewByDate);
                                  const noteHere = showMissingBreak && col.key === 'breaktimeIN';
                                  return (
                                    <TableCell
                                      key={col.key}
                                      sx={{
                                        borderBottom: `1px solid ${T.divider}`,
                                        borderRight: `1px solid ${T.divider}`,
                                        px: 1.5,
                                        py: 0.9,
                                        textAlign: 'center',
                                        verticalAlign: 'middle',
                                        fontWeight: 500,
                                        fontSize: '0.8rem',
                                        fontFamily: T.recordFont,
                                        fontVariantNumeric: 'tabular-nums',
                                        bgcolor: noteHere ? T.tardiness.bg : (isEven ? '#fff' : T.rowOdd),
                                        transition: 'background-color 0.12s',
                                        'tr:hover &': { bgcolor: `${T.rowHover} !important` },
                                      }}
                                    >
                                      {noteHere ? (
                                        <Typography
                                          component="span"
                                          sx={{
                                            fontSize: '0.58rem',
                                            fontWeight: 700,
                                            color: T.tardiness.color,
                                            lineHeight: 1.2,
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          No break punch — deducted
                                        </Typography>
                                      ) : (
                                        <Box component="span" sx={{ color: (punchVal === '—' || punchVal === 'N/A') ? T.faint : T.text, fontWeight: (punchVal === '—' || punchVal === 'N/A') ? 400 : 500 }}>
                                          {punchVal}
                                        </Box>
                                      )}
                                    </TableCell>
                                  );
                                }

                                if (activeTab === 'regular' && (col.key === '_morningTardiness' || col.key === '_afternoonTardiness')) {
                                  const part = col.key === '_morningTardiness' ? 'morning' : 'afternoon';
                                  return (
                                    <EditableTardinessCell
                                      key={col.key}
                                      row={row}
                                      part={part}
                                      isFurlough={isFurlough}
                                      isEven={isEven}
                                      storedOverride={tardinessOverrides[row.date]?.[part]}
                                      onCommit={(v) => commitTardinessOverride(row.date, part, v)}
                                      onInvalid={(msg) => showSnackbar(msg, 'warning')}
                                    />
                                  );
                                }

                                if (
                                  activeTab === 'regular' &&
                                  halfDayTotalColumnVariant(col.key) &&
                                  halfUi
                                ) {
                                  const metricVal = getCellValue(
                                    row,
                                    col.key,
                                    isFurlough,
                                    activeTab === 'regular' ? tardinessOverrides : null,
                                    halfDayReviewByDate,
                                  );
                                  return (
                                    <TableCell
                                      key={col.key}
                                      sx={{
                                        borderBottom: `1px solid ${T.divider}`,
                                        borderRight: `1px solid ${T.divider}`,
                                        px: 1.5,
                                        py: 0.9,
                                        textAlign: 'center',
                                        fontWeight: 500,
                                        fontSize: '0.8rem',
                                        fontFamily: T.recordFont,
                                        bgcolor: isEven ? '#fff' : T.rowOdd,
                                        transition: 'background-color 0.12s',
                                        'tr:hover &': { bgcolor: `${T.rowHover} !important` },
                                      }}
                                    >
                                      <HalfDayTotalCellContent
                                        value={metricVal}
                                        halfUi={halfUi}
                                        colKey={col.key}
                                        halfDayColor={T.halfDay?.color}
                                      />
                                    </TableCell>
                                  );
                                }

                                return (
                                  <React.Fragment key={col.key}>
                                    {buildCell(getCellValue(row, col.key, isFurlough, activeTab === 'regular' ? tardinessOverrides : null, halfDayReviewByDate), col.group, isEven)}
                                  </React.Fragment>
                                );
                              })}
                            </TableRow>
                          );
                        })}

                        {/* Totals rows */}
                        {activeTab === 'regular' && <>
                          {renderTotalsRow(`Morning total (${startDate} – ${endDate})`, totals.morningRendered, totals.morningTardiness, { renderedColKey: '_morningRendered', tardColKey: '_morningTardiness' })}
                          {renderTotalsRow(`Afternoon total (${startDate} – ${endDate})`, totals.afternoonRendered, totals.afternoonTardiness, { renderedColKey: '_afternoonRendered', tardColKey: '_afternoonTardiness' })}
                          {renderTotalsRow(
                            `Overall rendered time (${startDate} – ${endDate})`,
                            totals.totalRendered || totals.overallRendered,
                            totals.rowTardinessSum || totals.overallTardiness,
                            { renderedColKey: '_totalRendered', tardColKey: '_totalTardiness', overall: true },
                          )}
                        </>}

                        {activeTab !== 'regular' && (() => {
                          const rendMap = { honorarium: totals.hnRendered,  serviceCredit: totals.scRendered,  overtime: totals.otRendered  };
                          const tardMap = { honorarium: totals.hnTardiness, serviceCredit: totals.scTardiness, overtime: totals.otTardiness };
                          const keyMap = {
                            honorarium:    { renderedColKey: '_hnRendered', tardColKey: '_hnTardiness', overall: true },
                            serviceCredit: { renderedColKey: '_scRendered', tardColKey: '_scTardiness', overall: true },
                            overtime:      { renderedColKey: '_otRendered', tardColKey: '_otTardiness', overall: true },
                          };
                          return renderTotalsRow(`Overall rendered time (${startDate} – ${endDate})`, rendMap[activeTab], tardMap[activeTab], keyMap[activeTab]);
                        })()}
                      </TableBody>
                    </Table>
                  </Box>
                </Box>

                {/* Legend */}
                <Box sx={{ pt: 1.25, display: 'flex', gap: '6px 16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {[
                    { swatch: { bgcolor: T.halfDay.bg, border: `1px solid ${T.halfDay.border}` }, label: 'Half day' },
                    { swatch: { bgcolor: T.absent.bg, border: `1px solid ${T.absent.border}` }, label: 'Absent' },
                    { swatch: { bgcolor: T.holiday.bg, border: `1px solid ${T.holiday.border}` }, label: 'Holiday' },
                    { swatch: { bgcolor: T.rendered.bg, border: `1px solid ${T.rendered.border}` }, label: 'Rendered totals' },
                    { swatch: { bgcolor: T.tardiness.bg, border: `1px solid ${T.tardiness.border}` }, label: 'Tardiness totals' },
                  ].map((item, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '2px', border: '1px solid', ...item.swatch }} />
                      <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>{item.label}</Typography>
                    </Box>
                  ))}
                  <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>
                    AM/PM tardiness is system-calculated and editable. The circular arrow restores the system value.
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>
                    Break IN and Break OUT are required on a full day. Missing either deducts the official break duration (PM tardiness / Late Total).
                  </Typography>
                </Box>
              </Box>
            </SectionCard>
          </Fade>
        )}

        <FloatingTotalsBar totals={totals} visible={attendanceData.length > 0} onSave={saveOverallAttendance} saving={saving} startDate={startDate} endDate={endDate} showSaveButton />

        <UnresolvedHalfDaysDialog
          dates={unresolvedDatesModal}
          onClose={() => setUnresolvedDatesModal(null)}
          themeT={T}
        />

        <StyledModal open={modal.open} onClose={closeModal} title={modal.title} message={modal.message} type={modal.type} onConfirm={modal.onConfirm} showCancel={modal.showCancel} confirmLabel={modal.confirmLabel} />

        <OverallAttendanceCompareModal open={compareOpen} onClose={handleCompareClose} onConfirm={handleCompareConfirm} savedRow={pendingSavedOverall} proposedRecord={pendingProposedOverall} fields={OVERALL_COMPARE_FIELD_META} mode="duplicate" currentModuleType="NON_TEACHING" />

        <HalfDayReviewDialog
          open={Boolean(halfDayReviewDialog)}
          mode={halfDayReviewDialog?.mode}
          row={halfDayReviewDialog?.row}
          moduleType={MODULE_TYPES.NON_TEACHING}
          themeT={T}
          onClose={() => setHalfDayReviewDialog(null)}
          onConfirm={commitHalfDayReview}
        />

        <Zoom in={showScrollTop}>
          <Fab size="small" sx={{ position: 'fixed', bottom: 24, right: 45, zIndex: 1000, bgcolor: T.accent, color: '#fff', '&:hover': { bgcolor: T.accentDark }, boxShadow: `0 4px 14px ${alpha(T.accent, 0.35)}` }} onClick={scrollToTop}>
            <KeyboardArrowUp />
          </Fab>
        </Zoom>
      </Box>
    </Fade>
  );
};


export default AttendanceModuleNonTeachingStaff;