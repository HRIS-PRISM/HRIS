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
  Tooltip,
  List,
  ListItemButton,
  InputAdornment,
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
  UnfoldMore,
  UnfoldLess,
  RestartAlt,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import useAttendanceWorkflow from '../../hooks/useAttendanceWorkflow';
import AttendanceWorkflowNav from './AttendanceWorkflowNav';
import { navigateAttendanceWorkflow } from '../../utils/attendanceWorkflow';
import { seedEmbeddedModuleContext, ATTENDANCE_EMBEDDED_ROOT_SX, notifyModuleSaveSuccess } from '../../utils/attendanceModuleEmbedded';
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
  applyStoredLateUndertimeToAttendanceRows,
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
  hasHrHalfDayConfirmation,
  resolveEntryRenderedTotal,
  shouldZeroAmPmHalfDayColumns,
  countSuggestedHalfDays,
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
  isExcludedAttendanceCalendarDate,
  isScheduledByOfficialTime,
} from '../../utils/officialAttendanceFromDailyRows';
import {
  ZERO_HM,
  formatDurationHhMm,
  formatDurationMsToHhMm,
  normalizeDurationInput,
  canonicalTardDisplay,
  displayDurationHhMm,
  sumDurationHhMm,
  addTimeHhMmOnly,
  computeArrivalLateMinuteSec,
  computeEarlyLeaveUndertimeMinuteSec,
  computeAmPmMinuteBuckets,
  getRowTotalRenderedMinuteDisplay,
  getRowTotalTardinessMinuteDisplay,
  normalizeFacultyRowDurations,
  parseDurationToMinuteSec,
  getAmPmSlotLateMinuteSec,
  getOfficialSchedWorkMinuteSec,
} from '../../utils/attendanceDurationHhMm';
import {
  postAttendanceDevicePreflightNoSync,
  fetchAttendanceCalendarMaps,
  getLeaveStatusLabelForDate,
} from './attendanceLeaveIntegration';
import { getAuthHeaders } from '../../utils/auth';
import OverallAttendanceCompareModal from './OverallAttendanceCompareModal';
import {
  classifyOverallSave,
  mergeOverallPayload,
  OVERALL_COMPARE_FIELD_META,
} from './overallAttendanceMerge';
import {
  applyFacultyPunchGatedBreaktimes,
  isEmptyAttendancePunch,
} from '../../utils/facultyBreaktimeFromPunches';

/** Parse "01/01/2000 …" style times for duration math; seconds/ms stripped. */
function parseAttendanceTimeOn2000(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return new Date(NaN);
  const d = new Date(`01/01/2000 ${timeStr}`);
  if (Number.isNaN(d.getTime())) return d;
  d.setSeconds(0, 0);
  return d;
}

/** e.g. `2026-02-02` → `02-02-26` for Day column subtitle layout. */
function formatDateMmDdYy(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) {
    const [, y, mo, da] = iso;
    return `${mo}-${da}-${y.slice(-2)}`;
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return trimmed;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}-${dd}-${yy}`;
}

/** Millisecond delta → `HH:MM`; non-finite → `00:00`. */
const formatDurationMsToHhMmSs = formatDurationMsToHhMm;

function normalizeBadHhMmSsDisplay(v) {
  if (v === 'NaN:NaN:NaN') return ZERO_HM;
  return displayDurationHhMm(v);
}

function formatTardinessAsDaysHoursWithHoursPerDay(hhmm, hoursPerDay) {
  if (!hhmm || hhmm === ZERO_HM || hhmm === '00:00:00') return '0m';
  const parts = String(hhmm).split(':').map(Number);
  const totalMinutes = (parts[0] || 0) * 60 + (parts[1] || 0);
  if (totalMinutes === 0) return '0m';

  const divisorMinutesRaw = Number(hoursPerDay) * 60;
  const divisorMinutes =
    Number.isFinite(divisorMinutesRaw) && divisorMinutesRaw > 0
      ? Math.round(divisorMinutesRaw)
      : 8 * 60;

  const days = Math.floor(totalMinutes / divisorMinutes);
  const remMinutes = totalMinutes - days * divisorMinutes;
  const hrs = Math.floor(remMinutes / 60);
  const mins = remMinutes % 60;
  let out = '';
  if (days > 0) out += `${days}d `;
  if (hrs > 0) out += `${hrs}h `;
  if (mins > 0) out += `${mins}m`;
  return out.trim();
}

function minutesFromOfficialScheduleRow(row) {
  if (!row || typeof row !== 'object') return null;
  const pickValidTime = (t) => {
    if (!t || typeof t !== 'string') return null;
    const s = t.trim();
    if (
      !s ||
      s === '—' ||
      s === '00:00:00' ||
      s === '00:00:00 AM' ||
      s === '00:00:00 PM'
    )
      return null;
    return s;
  };

  const offIn = pickValidTime(row.officialTimeIN);
  const offOut = pickValidTime(row.officialTimeOUT);
  if (!offIn || !offOut) return null;

  // Prefer official breaktimes; fall back to effective breaktime fields (already normalized in processing).
  const brIn =
    pickValidTime(row.officialBreaktimeIN) ?? pickValidTime(row.breaktimeIN);
  const brOut =
    pickValidTime(row.officialBreaktimeOUT) ?? pickValidTime(row.breaktimeOUT);
  if (!brIn || !brOut) return null;

  const startAM = parseAttendanceTimeOn2000(offIn);
  const endAM = parseAttendanceTimeOn2000(brIn);
  const startPM = parseAttendanceTimeOn2000(brOut);
  const endPM = parseAttendanceTimeOn2000(offOut);
  if ([startAM, endAM, startPM, endPM].some((d) => Number.isNaN(d.getTime())))
    return null;

  const amMs = Math.max(0, endAM - startAM);
  const pmMs = Math.max(0, endPM - startPM);
  const totalMinutes = Math.round((amMs + pmMs) / 60000);
  return totalMinutes > 0 ? totalMinutes : null;
}

// ─── Theme tokens ──────────────────────────────────────────────────────────
const T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  accentMid: '#8B4545',
  accentFaint: 'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover: 'rgba(109,35,35,0.10)',
  rowOdd: 'rgba(109,35,35,0.025)',
  rowHover: 'rgba(109,35,35,0.055)',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#a0a0a0',
  surface: '#ffffff',
  divider: 'rgba(0,0,0,0.08)',
  recordFont:
    "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  holiday: {
    bg: 'rgba(245,124,0,0.10)',
    color: '#f57c00',
    border: 'rgba(245,124,0,0.35)',
  },
  leave: {
    bg: 'rgba(46,125,50,0.10)',
    color: '#2e7d32',
    border: 'rgba(46,125,50,0.35)',
  },
  suspended: {
    bg: 'rgba(211,47,47,0.10)',
    color: '#d32f2f',
    border: 'rgba(211,47,47,0.35)',
  },
  halfDay: {
    bg: 'rgba(106,27,154,0.10)',
    color: '#6a1b9a',
    border: 'rgba(106,27,154,0.35)',
  },
  absent: {
    bg: 'rgba(183,28,28,0.08)',
    color: '#b71c1c',
    border: 'rgba(183,28,28,0.25)',
  },
  rendered: {
    bg: 'rgba(27,94,32,0.08)',
    color: '#1b5e20',
    border: 'rgba(27,94,32,0.25)',
  },
  tardiness: {
    bg: 'rgba(183,28,28,0.08)',
    color: '#b71c1c',
    border: 'rgba(183,28,28,0.25)',
  },
};

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
  <Box
    sx={{
      width: w,
      height: h,
      borderRadius: r,
      background:
        'linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)',
      backgroundSize: '800px 100%',
      animation: 'shimmer 1.6s infinite linear',
      flexShrink: 0,
      ...sx,
    }}
  />
);

const AttendanceDesignatedWireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box
      sx={{
          py: { xs: 1, md: 2 },
          mt: { xs: 0, md: -2 },
          mb: { xs: 1, md: 2 },
          pb: ATTENDANCE_PAGE_BOTTOM_PAD,
        width: '100vw',
        maxWidth: '100%',
        position: 'relative',
        left: '53%',
        transform: 'translateX(-51%)',
        px: { xs: 2, sm: 3, md: 6 },
      }}
    >
      <Box
        sx={{
          mb: 2,
          borderRadius: '12px',
          overflow: 'hidden',
          border: '0.5px solid rgba(0,0,0,0.09)',
          animation: 'blink 2s ease-in-out infinite',
        }}
      >
        <Box
          sx={{
            px: 4,
            py: 3,
            background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
            display: 'flex',
            alignItems: 'center',
            gap: 2.5,
          }}
        >
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              bgcolor: 'rgba(109,35,35,0.12)',
            }}
          />
          <Box>
            <Bone w={280} h={18} sx={{ mb: 1 }} />
            <Bone w={380} h={11} />
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          mb: 2,
          borderRadius: '12px',
          overflow: 'hidden',
          border: '0.5px solid rgba(0,0,0,0.09)',
          bgcolor: '#fff',
          animation: 'blink 2s ease-in-out 0.1s infinite',
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 1.25,
            bgcolor: T.accentFaint,
            borderBottom: `1px solid ${T.divider}`,
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            minHeight: 42,
          }}
        >
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              bgcolor: 'rgba(109,35,35,0.2)',
            }}
          />
          <Bone w={180} h={12} />
        </Box>
        <Box sx={{ px: 2.5, py: 2.5 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            {[1, 2, 3].map((i) => (
              <Box
                key={i}
                sx={{
                  flex: 1,
                  height: 40,
                  borderRadius: '8px',
                  bgcolor: T.accentFaint,
                  border: `1px solid ${T.accentBorder}`,
                }}
              />
            ))}
          </Box>
          <Box
            sx={{
              border: `2px dashed ${T.accentBorder}`,
              borderRadius: '8px',
              p: 3,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                justifyContent: 'center',
              }}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    width: 64,
                    height: 36,
                    borderRadius: '6px',
                    bgcolor: T.accentFaint,
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          borderRadius: '12px',
          overflow: 'hidden',
          border: '0.5px solid rgba(0,0,0,0.09)',
          bgcolor: '#fff',
          animation: 'blink 2s ease-in-out 0.2s infinite',
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 1.25,
            bgcolor: T.accent,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: 2,
          }}
        >
          {[100, 80, 80, 80].map((w, i) => (
            <Box
              key={i}
              sx={{
                height: 10,
                width: w,
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.22)',
              }}
            />
          ))}
        </Box>
        {[...Array(5)].map((_, i) => (
          <Box
            key={i}
            sx={{
              px: 2.5,
              py: 2,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gap: 2,
              alignItems: 'center',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              bgcolor: i % 2 === 0 ? '#fff' : T.rowOdd,
            }}
          >
            <Bone w={120} h={12} />
            <Bone w={80} h={12} />
            <Bone w={80} h={12} />
            <Box
              sx={{
                width: 90,
                height: 24,
                borderRadius: '12px',
                bgcolor: T.accentFaint,
              }}
            />
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
  <Box
    sx={{
      px: 2.5,
      py: 1.5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: `1px solid ${T.divider}`,
      bgcolor: T.accentFaint,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Icon sx={{ fontSize: 15, color: T.accent }} />
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: T.accent }}>
        {title}
      </Typography>
    </Box>
    {rightContent}
  </Box>
);

const NativeInput = ({
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled,
  icon,
}) => (
  <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
    {icon && (
      <Box
        sx={{
          position: 'absolute',
          left: 10,
          color: T.accentMid,
          display: 'flex',
          alignItems: 'center',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        {icon}
      </Box>
    )}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: '100%',
        padding: icon ? '9px 13px 9px 34px' : '9px 13px',
        borderRadius: '8px',
        border: `1px solid ${T.accentBorder}`,
        fontSize: '0.875rem',
        outline: 'none',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        transition: 'border-color 0.18s',
        background: disabled ? '#f5f5f5' : '#fff',
        color: T.text,
        cursor: disabled ? 'not-allowed' : 'text',
      }}
      onFocus={(e) => {
        if (!disabled) {
          e.target.style.borderColor = T.accent;
          e.target.style.boxShadow = `0 0 0 1.5px ${T.accent}22`;
        }
      }}
      onBlur={(e) => {
        e.target.style.borderColor = T.accentBorder;
        e.target.style.boxShadow = 'none';
      }}
    />
  </Box>
);

const RowBtn = ({ icon, label, onClick, color, hoverBg, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: 'transparent',
      border: `1px solid ${color}40`,
      borderRadius: '8px',
      padding: '9px 18px',
      cursor: disabled ? 'default' : 'pointer',
      color,
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '0.85rem',
      fontWeight: 700,
      fontFamily: 'inherit',
      transition: 'background-color 0.15s, border-color 0.15s',
      whiteSpace: 'nowrap',
      opacity: disabled ? 0.5 : 1,
    }}
    onMouseEnter={(e) => {
      if (!disabled) {
        e.currentTarget.style.backgroundColor = hoverBg;
        e.currentTarget.style.borderColor = color;
      }
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = 'transparent';
      e.currentTarget.style.borderColor = `${color}40`;
    }}
  >
    {icon}
    {label}
  </button>
);

// ─── Half-day helpers ─────────────────────────────────────────────────────
const attendanceEmptyPunch = (v) =>
  v == null ||
  String(v).trim() === '' ||
  String(v).trim() === '—' ||
  String(v).trim().toUpperCase() === 'N/A';

const isHalfDayByMinuteTardinessThreshold = (row) => {
  if (!isScheduledByOfficialTime(row)) return false;
  if (hasNoPunchesTimeInOutOnly(row)) return false;
  const schedWorkSec = getOfficialSchedWorkMinuteSec(row);
  if (schedWorkSec == null || schedWorkSec <= 0) return false;
  return getAmPmSlotLateMinuteSec(row) > schedWorkSec / 2;
};

const isHalfDayAttendanceRow = (row, fn) => {
  if (!row || fn(row.date)) return false;
  return isHalfDayByMinuteTardinessThreshold(row);
};

// Designated (40hrs) module rule: ignore breaktime punches for absent.
function hasNoPunchesTimeInOutOnly(row) {
  return (
    attendanceEmptyPunch(row?.timeIN) && attendanceEmptyPunch(row?.timeOUT)
  );
}

function computeOfficialAwareAbsenceAndLate_TimeInOutOnly(rows, calendarMaps) {
  let absentDays = 0;
  let halfDays = 0;
  let absentSecTotal = 0;
  let halfDayShortfallSecTotal = 0;
  let lateShortfallSecTotal = 0;

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const d = String(row?.date ?? '')
      .trim()
      .slice(0, 10);
    if (calendarMaps && isExcludedAttendanceCalendarDate(d, calendarMaps))
      return;
    if (!isScheduledByOfficialTime(row)) return;
    const schedWorkSec = getOfficialSchedWorkMinuteSec(row);
    if (schedWorkSec == null) return;

    if (hasNoPunchesTimeInOutOnly(row)) {
      absentDays += 1;
      absentSecTotal += schedWorkSec;
      return;
    }

    const deficit = getAmPmSlotLateMinuteSec(row);
    const isHalfDay = deficit > schedWorkSec / 2;
    if (isHalfDay) {
      halfDays += 1;
      halfDayShortfallSecTotal += deficit;
    } else {
      lateShortfallSecTotal += deficit;
    }
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
    absentTime: formatDurationHhMm(absentSecTotal),
    halfDayShortfallTime: formatDurationHhMm(halfDayShortfallSecTotal),
    lateShortfallTime: formatDurationHhMm(lateShortfallSecTotal),
    overallShortfallTime: formatDurationHhMm(overallShortfallSecTotal),
  };
}

function listHalfDayDatesFromDailyRows_TimeInOutOnly(rows, calendarMaps) {
  const dates = [];
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const d = String(row?.date ?? '')
      .trim()
      .slice(0, 10);
    if (calendarMaps && isExcludedAttendanceCalendarDate(d, calendarMaps))
      return;
    if (!isHalfDayByMinuteTardinessThreshold(row)) return;
    if (d && d.length >= 8) dates.push(d);
  });
  return [...new Set(dates)].sort();
}

function listAbsentDatesFromDailyRows_TimeInOutOnly(rows, calendarMaps) {
  const dates = [];
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const d = String(row?.date ?? '')
      .trim()
      .slice(0, 10);
    if (calendarMaps && isExcludedAttendanceCalendarDate(d, calendarMaps))
      return;
    if (!isScheduledByOfficialTime(row)) return;
    if (getOfficialSchedWorkMinuteSec(row) == null) return;
    if (!hasNoPunchesTimeInOutOnly(row)) return;
    if (d && d.length >= 8) dates.push(d);
  });
  return [...new Set(dates)].sort();
}

// ─── Status chip ──────────────────────────────────────────────────────────
const StatusChip = ({ label }) => {
  const styles = {
    'WORK SUSPENDED': T.suspended,
    HOLIDAY: T.holiday,
    'ON LEAVE': T.leave,
  };
  const s = styles[label] || {};
  return (
    <Chip
      size="small"
      label={label}
      sx={{
        fontWeight: 700,
        fontSize: '0.6rem',
        height: 16,
        mt: 0.3,
        bgcolor: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    />
  );
};

// CompactTableCell kept for compatibility
const CompactTableCell = styled(TableCell)(({ isHeader }) => ({
  fontWeight: isHeader ? 700 : 500,
  padding: '10px 14px',
  borderBottom: `1px solid ${T.divider}`,
  fontSize: isHeader ? '0.65rem' : '0.8rem',
  letterSpacing: isHeader ? '0.08em' : '0.01em',
  color: isHeader ? '#fff' : T.text,
  whiteSpace: 'nowrap',
}));

// ─── Tab definitions ──────────────────────────────────────────────────────
const VIEW_TABS = [
  {
    key: 'regular',
    label: 'Regular Time',
    icon: <Schedule sx={{ fontSize: 14 }} />,
  },
  {
    key: 'honorarium',
    label: 'Honorarium',
    icon: <Star sx={{ fontSize: 14 }} />,
  },
  {
    key: 'serviceCredit',
    label: 'Service Credit',
    icon: <CreditScore sx={{ fontSize: 14 }} />,
  },
  {
    key: 'overtime',
    label: 'Overtime',
    icon: <AccessTime sx={{ fontSize: 14 }} />,
  },
];

// ─── Column definitions ───────────────────────────────────────────────────
// colGroup: columns sharing a group key collapse together (leader = isGroupLeader).
// Regular tab column order matches NonTeaching: all punches, then AM/PM rendered & tardiness + total tardiness.
const TAB_COLUMNS = {
  regular: [
    {
      label: 'Date',
      key: 'date',
      minWidth: 130,
      group: 'meta',
      colGroup: null,
    },
    { label: 'Day', key: 'day', minWidth: 118, group: 'meta', colGroup: null },
    {
      label: 'Time IN',
      key: 'timeIN',
      minWidth: 140,
      group: 'actual',
      colGroup: 'morningDevice',
      isGroupLeader: true,
    },
    {
      label: 'Official Time IN',
      key: 'officialTimeIN',
      minWidth: 130,
      group: 'official',
      colGroup: 'morningOfficial',
      isGroupLeader: true,
    },
    {
      label: 'Breaktime IN',
      key: 'breaktimeIN',
      minWidth: 140,
      group: 'actual',
      colGroup: 'breaktimeDevice',
      isGroupLeader: true,
    },
    {
      label: 'Official Breaktime IN',
      key: 'officialBreaktimeIN',
      minWidth: 140,
      group: 'official',
      colGroup: 'breaktimeOfficial',
      isGroupLeader: true,
    },
    {
      label: 'Breaktime OUT',
      key: 'breaktimeOUT',
      minWidth: 130,
      group: 'actual',
      colGroup: 'afternoonBreakDevice',
      isGroupLeader: true,
    },
    {
      label: 'Time OUT',
      key: 'timeOUT',
      minWidth: 120,
      group: 'actual',
      colGroup: 'timeOutDevice',
      isGroupLeader: true,
    },
    {
      label: 'Official Breaktime OUT',
      key: 'officialBreaktimeOUT',
      minWidth: 140,
      group: 'official',
      colGroup: 'afternoonOfficial',
      isGroupLeader: true,
    },
    {
      label: 'Official Time OUT',
      key: 'officialTimeOUT',
      minWidth: 130,
      group: 'official',
      colGroup: 'afternoonOfficial',
    },
    {
      label: 'AM Rendered',
      key: '_morningRendered',
      minWidth: 130,
      group: 'calc',
      colGroup: 'amRendered',
      isGroupLeader: true,
    },
    {
      label: 'AM Tardiness',
      key: '_morningTardiness',
      minWidth: 130,
      group: 'tard',
      colGroup: 'amTard',
      isGroupLeader: true,
    },
    {
      label: 'PM Rendered',
      key: '_afternoonRendered',
      minWidth: 130,
      group: 'calc',
      colGroup: 'pmRendered',
      isGroupLeader: true,
    },
    {
      label: 'PM Tardiness',
      key: '_afternoonTardiness',
      minWidth: 130,
      group: 'tard',
      colGroup: 'pmTard',
      isGroupLeader: true,
    },
    {
      label: 'Total Rendered',
      key: '_totalRendered',
      minWidth: 130,
      group: 'calc',
      colGroup: 'totalRendered',
      isGroupLeader: true,
    },
    {
      label: 'Total Tardiness',
      key: '_totalTardiness',
      minWidth: 130,
      group: 'tard',
      colGroup: 'totalTard',
      isGroupLeader: true,
    },
  ],
  honorarium: [
    {
      label: 'Date',
      key: 'date',
      minWidth: 130,
      group: 'meta',
      colGroup: null,
    },
    { label: 'Day', key: 'day', minWidth: 118, group: 'meta', colGroup: null },
    {
      label: 'Time IN',
      key: '_hnTimeIN',
      minWidth: 140,
      group: 'actual',
      colGroup: 'hnTimes',
      isGroupLeader: true,
    },
    {
      label: 'Time OUT',
      key: '_hnTimeOUT',
      minWidth: 140,
      group: 'actual',
      colGroup: 'hnTimes',
    },
    {
      label: 'Official Honorarium Time IN',
      key: 'officialHonorariumTimeIN',
      minWidth: 180,
      group: 'official',
      colGroup: 'hnOfficial',
      isGroupLeader: true,
    },
    {
      label: 'Official Honorarium Time OUT',
      key: 'officialHonorariumTimeOUT',
      minWidth: 180,
      group: 'official',
      colGroup: 'hnOfficial',
    },
    {
      label: 'Honorarium Rendered',
      key: '_hnRendered',
      minWidth: 140,
      group: 'calc',
      colGroup: 'hnRendered',
      isGroupLeader: true,
    },
    {
      label: 'Honorarium Tardiness',
      key: '_hnTardiness',
      minWidth: 140,
      group: 'tard',
      colGroup: 'hnTard',
      isGroupLeader: true,
    },
  ],
  serviceCredit: [
    {
      label: 'Date',
      key: 'date',
      minWidth: 130,
      group: 'meta',
      colGroup: null,
    },
    { label: 'Day', key: 'day', minWidth: 118, group: 'meta', colGroup: null },
    {
      label: 'Time IN',
      key: '_scTimeIN',
      minWidth: 140,
      group: 'actual',
      colGroup: 'scTimes',
      isGroupLeader: true,
    },
    {
      label: 'Time OUT',
      key: '_scTimeOUT',
      minWidth: 140,
      group: 'actual',
      colGroup: 'scTimes',
    },
    {
      label: 'Official Service Credit Time IN',
      key: 'officialServiceCreditTimeIN',
      minWidth: 200,
      group: 'official',
      colGroup: 'scOfficial',
      isGroupLeader: true,
    },
    {
      label: 'Official Service Credit Time OUT',
      key: 'officialServiceCreditTimeOUT',
      minWidth: 200,
      group: 'official',
      colGroup: 'scOfficial',
    },
    {
      label: 'Service Credit Rendered',
      key: '_scRendered',
      minWidth: 150,
      group: 'calc',
      colGroup: 'scRendered',
      isGroupLeader: true,
    },
    {
      label: 'Service Credit Tardiness',
      key: '_scTardiness',
      minWidth: 150,
      group: 'tard',
      colGroup: 'scTard',
      isGroupLeader: true,
    },
  ],
  overtime: [
    {
      label: 'Date',
      key: 'date',
      minWidth: 130,
      group: 'meta',
      colGroup: null,
    },
    { label: 'Day', key: 'day', minWidth: 118, group: 'meta', colGroup: null },
    {
      label: 'Time IN',
      key: '_otTimeIN',
      minWidth: 140,
      group: 'actual',
      colGroup: 'otTimes',
      isGroupLeader: true,
    },
    {
      label: 'Time OUT',
      key: '_otTimeOUT',
      minWidth: 140,
      group: 'actual',
      colGroup: 'otTimes',
    },
    {
      label: 'Official Overtime Time IN',
      key: 'officialOverTimeIN',
      minWidth: 170,
      group: 'official',
      colGroup: 'otOfficial',
      isGroupLeader: true,
    },
    {
      label: 'Official Overtime Time OUT',
      key: 'officialOverTimeOUT',
      minWidth: 170,
      group: 'official',
      colGroup: 'otOfficial',
    },
    {
      label: 'Overtime Rendered',
      key: '_otRendered',
      minWidth: 140,
      group: 'calc',
      colGroup: 'otRendered',
      isGroupLeader: true,
    },
    {
      label: 'Overtime Tardiness',
      key: '_otTardiness',
      minWidth: 140,
      group: 'tard',
      colGroup: 'otTard',
      isGroupLeader: true,
    },
  ],
};

const COL_GROUP_META = {
  morningDevice: { label: 'Time IN · device' },
  morningOfficial: { label: 'Time IN · official' },
  breaktimeDevice: { label: 'Break IN · device' },
  breaktimeOfficial: { label: 'Break IN · official' },
  afternoonBreakDevice: { label: 'Break OUT · device' },
  timeOutDevice: { label: 'Time OUT · device' },
  afternoonOfficial: { label: 'PM · official' },
  amRendered: { label: 'AM rendered' },
  amTard: { label: 'AM tardiness' },
  pmRendered: { label: 'PM rendered' },
  pmTard: { label: 'PM tardiness' },
  totalRendered: { label: 'Total rendered' },
  totalTard: { label: 'Total tardiness' },
  hnTimes: { label: 'Device times' },
  hnOfficial: { label: 'Official schedule' },
  hnRendered: { label: 'HN rendered' },
  hnTard: { label: 'HN tardiness' },
  scTimes: { label: 'Device times' },
  scOfficial: { label: 'Official schedule' },
  scRendered: { label: 'SC rendered' },
  scTard: { label: 'SC tardiness' },
  otTimes: { label: 'Device times' },
  otOfficial: { label: 'Official schedule' },
  otRendered: { label: 'OT rendered' },
  otTard: { label: 'OT tardiness' },
};

// ─── Tardiness duration helpers (HR overrides on AM/PM tardiness) ───────
/** Return displayed value for a column, considering rendered & tardiness overrides. */
const getDisplayedCellValue = (
  row,
  colKey,
  isFurlough = false,
  tardOverrides = null,
  renderedOverridesLocal = null,
  reviewByDate = null,
) => {
  const dateKey = row?.date;
  const rendOverrides = renderedOverridesLocal || {};
  const tardOverridesUsed = tardOverrides || {};
  const d = normalizeReviewDate(dateKey);
  const reviewEntry = reviewByDate?.[d];
  const calendarMaps = null;
  const zeroAmPmHalfDay =
    !isFurlough &&
    shouldZeroAmPmHalfDayColumns(
      row,
      reviewByDate,
      MODULE_TYPES.DESIGNATED_40HRS,
      calendarMaps,
    );

  if (
    zeroAmPmHalfDay &&
    (colKey === '_morningRendered' ||
      colKey === '_afternoonRendered' ||
      colKey === '_morningTardiness' ||
      colKey === '_afternoonTardiness')
  ) {
    return ZERO_HM;
  }

  if (colKey === '_totalRendered') {
    return getRowTotalRenderedMinuteDisplay(
      row,
      reviewByDate,
      MODULE_TYPES.DESIGNATED_40HRS,
      isFurlough,
    );
  }

  // Rendered overrides (editable)
  if (colKey === '_morningRendered' || colKey === '_afternoonRendered') {
    const part = colKey === '_morningRendered' ? 'morning' : 'afternoon';
    if (
      reviewEntry?.status === HALF_DAY_STATUS.APPROVED &&
      hasHrHalfDayConfirmation(reviewEntry) &&
      (reviewEntry.renderedMorning != null || reviewEntry.renderedAfternoon != null)
    ) {
      const hr =
        part === 'morning'
          ? reviewEntry.renderedMorning
          : reviewEntry.renderedAfternoon;
      if (hr != null && String(hr).trim() !== '') return hr;
    }
    const stored = rendOverrides?.[dateKey]?.[part];
    if (stored != null && String(stored).trim() !== '') return stored;
    return getCellValue(row, colKey, isFurlough, null, reviewByDate);
  }

  // Tardiness: prefer explicit tardiness override, else compute from rendered override if present
  if (colKey === '_morningTardiness' || colKey === '_afternoonTardiness') {
    const part = colKey === '_morningTardiness' ? 'morning' : 'afternoon';
    const explicit = tardOverridesUsed?.[dateKey]?.[part];
    if (explicit != null && String(explicit).trim() !== '') return explicit;

    const renderedStored = rendOverrides?.[dateKey]?.[part];
    if (renderedStored != null && String(renderedStored).trim() !== '') {
      // derive tardiness = maxRendered - renderedStored
      const maxKey =
        part === 'morning'
          ? 'formattedFacultyMaxRenderedTimeAM'
          : 'formattedFacultyMaxRenderedTimePM';
      const maxRendered = row?.[maxKey] || ZERO_HM;
      const diff =
        parseAttendanceTimeOn2000(maxRendered) -
        parseAttendanceTimeOn2000(renderedStored);
      return formatDurationMsToHhMm(Math.max(0, diff));
    }
    return getCellValue(row, colKey, isFurlough, null, reviewByDate);
  }

  if (colKey === '_totalTardiness') {
    return getRowTotalTardinessMinuteDisplay(
      row,
      reviewByDate,
      MODULE_TYPES.DESIGNATED_40HRS,
      isFurlough,
      addTimeHhMmOnly(
        getDisplayedCellValue(
          row,
          '_morningTardiness',
          isFurlough,
          tardOverridesUsed,
          rendOverrides,
          reviewByDate,
        ),
        getDisplayedCellValue(
          row,
          '_afternoonTardiness',
          isFurlough,
          tardOverridesUsed,
          rendOverrides,
          reviewByDate,
        ),
      ),
      calendarMaps,
      { hasNoPunchesFn: hasNoPunchesTimeInOutOnly },
    );
  }

  // Gated break display (official autofill) — raw punches stay on the row for half-day.
  if (colKey === 'breaktimeIN' && row?.displayBreaktimeIN != null) {
    return row.displayBreaktimeIN;
  }
  if (colKey === 'breaktimeOUT' && row?.displayBreaktimeOUT != null) {
    return row.displayBreaktimeOUT;
  }

  // default: use original getter (honor tardinessOverrides where applicable)
  return getCellValue(row, colKey, isFurlough, tardOverridesUsed, reviewByDate);
};

// Editable rendered cell (AM/PM) — allows HR to override rendered time.
const EditableRenderedCell = ({
  row,
  part,
  isFurlough,
  isEven,
  storedOverride,
  onCommit,
  onInvalid,
}) => {
  const colKey = part === 'morning' ? '_morningRendered' : '_afternoonRendered';
  const systemVal = getCellValue(row, colKey, isFurlough, null) || ZERO_HM;
  const [local, setLocal] = React.useState(() => storedOverride ?? systemVal);
  React.useEffect(() => {
    setLocal(storedOverride ?? systemVal);
  }, [row.date, storedOverride, systemVal]);

  const baseBg = isEven ? '#fff' : T.rowOdd;
  const cellBg = storedOverride ? alpha(T.rendered.color, 0.06) : baseBg;

  const applyBlur = () => {
    const trimmed = String(local).trim();
    if (trimmed === '') {
      onCommit(null);
      setLocal(systemVal);
      return;
    }
    const n = normalizeDurationInput(local);
    if (!n) {
      onInvalid('Use HH:MM or HH:MM:SS (e.g. 04:10 or 04:10:00).');
      setLocal(storedOverride ?? systemVal);
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
        transition: 'background-color 0.12s',
        'tr:hover &': { bgcolor: `${T.rowHover} !important` },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 0.35,
          minWidth: 96,
        }}
      >
        <TextField
          size="small"
          fullWidth
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={applyBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.target.blur();
          }}
          placeholder={systemVal}
          inputProps={{
            'aria-label': part === 'morning' ? 'AM rendered' : 'PM rendered',
            sx: {
              fontFamily: T.recordFont,
              fontSize: '0.78rem',
              textAlign: 'center',
              py: 0.65,
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 1,
              bgcolor: '#fff',
              fontSize: '0.78rem',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: T.accentBorder,
            },
          }}
        />
        {storedOverride && (
          <Typography
            sx={{
              fontSize: '0.58rem',
              color: T.muted,
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            System: {systemVal}
          </Typography>
        )}
      </Box>
    </TableCell>
  );
};

// ─── getCellValue ─────────────────────────────────────────────────────────
/** @param {Record<string, { morning?: string, afternoon?: string }> | null} [tardOverrides] HR edits for Regular Time AM/PM tardiness. */
const getCellValue = (
  row,
  colKey,
  isFurlough = false,
  tardOverrides = null,
  reviewByDate = null,
) => {
  const NA = 'N/A';
  const isNA = (v) =>
    !v || v === '00:00:00 AM' || v === '00:00:00 PM' || v === '00:00:00';
  if (row?.date && tardOverrides?.[row.date]) {
    const e = tardOverrides[row.date];
    if (
      colKey === '_morningTardiness' &&
      e.morning != null &&
      String(e.morning).trim() !== ''
    ) {
      const n = normalizeDurationInput(e.morning);
      if (n) return n;
    }
    if (
      colKey === '_afternoonTardiness' &&
      e.afternoon != null &&
      String(e.afternoon).trim() !== ''
    ) {
      const n = normalizeDurationInput(e.afternoon);
      if (n) return n;
    }
  }
  const zeroAmPmHalfDay =
    !isFurlough &&
    shouldZeroAmPmHalfDayColumns(
      row,
      reviewByDate,
      MODULE_TYPES.DESIGNATED_40HRS,
      null,
    );
  switch (colKey) {
    case '_morningRendered':
      if (zeroAmPmHalfDay) return ZERO_HM;
      if (isFurlough)
        return !row.formattedFacultyMaxRenderedTimeAM ||
          row.formattedFacultyMaxRenderedTimeAM === 'NaN:NaN:NaN'
          ? ZERO_HM
          : displayDurationHhMm(row.formattedFacultyMaxRenderedTimeAM);
      return !row.officialTimeIN ||
        row.formattedFacultyRenderedTimeAM === 'NaN:NaN:NaN'
        ? ZERO_HM
        : displayDurationHhMm(row.formattedFacultyRenderedTimeAM);
    case '_morningTardiness': {
      if (zeroAmPmHalfDay || isFurlough) return ZERO_HM;
      const d = normalizeReviewDate(row?.date);
      const entry = reviewByDate?.[d];
      if (entry?.status === HALF_DAY_STATUS.REJECTED) {
        const eff = getEffectiveTardinessFromReview(entry, MODULE_TYPES.DESIGNATED_40HRS);
        if (eff?.morning) return displayDurationHhMm(eff.morning);
      }
      if (entry?.status === HALF_DAY_STATUS.APPROVED) {
        const eff = getEffectiveTardinessFromApproved(entry, MODULE_TYPES.DESIGNATED_40HRS);
        if (eff?.morning) return displayDurationHhMm(eff.morning);
      }
      return !row.officialTimeIN ||
        row.formattedfinalcalcFacultyAM === 'NaN:NaN:NaN'
        ? displayDurationHhMm(row.formattedFacultyMaxRenderedTimeAM)
        : displayDurationHhMm(row.formattedfinalcalcFacultyAM);
    }
    case '_afternoonRendered':
      if (zeroAmPmHalfDay) return ZERO_HM;
      if (isFurlough)
        return !row.formattedFacultyMaxRenderedTimePM ||
          row.formattedFacultyMaxRenderedTimePM === 'NaN:NaN:NaN'
          ? ZERO_HM
          : displayDurationHhMm(row.formattedFacultyMaxRenderedTimePM);
      return !row.officialTimeOUT ||
        !row.timeOUT ||
        row.formattedFacultyRenderedTimePM === 'NaN:NaN:NaN'
        ? ZERO_HM
        : displayDurationHhMm(row.formattedFacultyRenderedTimePM);
    case '_afternoonTardiness': {
      if (zeroAmPmHalfDay || isFurlough) return ZERO_HM;
      const d = normalizeReviewDate(row?.date);
      const entry = reviewByDate?.[d];
      if (entry?.status === HALF_DAY_STATUS.REJECTED) {
        const eff = getEffectiveTardinessFromReview(entry, MODULE_TYPES.DESIGNATED_40HRS);
        if (eff?.afternoon) return displayDurationHhMm(eff.afternoon);
      }
      if (entry?.status === HALF_DAY_STATUS.APPROVED) {
        const eff = getEffectiveTardinessFromApproved(entry, MODULE_TYPES.DESIGNATED_40HRS);
        if (eff?.afternoon) return displayDurationHhMm(eff.afternoon);
      }
      return !row.officialTimeOUT ||
        !row.timeOUT ||
        row.formattedfinalcalcFacultyPM === 'NaN:NaN:NaN'
        ? displayDurationHhMm(row.formattedFacultyMaxRenderedTimePM)
        : displayDurationHhMm(row.formattedfinalcalcFacultyPM);
    }
    case '_totalRendered':
      return getRowTotalRenderedMinuteDisplay(
        row,
        reviewByDate,
        MODULE_TYPES.DESIGNATED_40HRS,
        isFurlough,
      );
    case '_totalTardiness': {
      if (isFurlough) return ZERO_HM;
      return getRowTotalTardinessMinuteDisplay(
        row,
        reviewByDate,
        MODULE_TYPES.DESIGNATED_40HRS,
        isFurlough,
        addTimeHhMmOnly(
          getCellValue(row, '_morningTardiness', isFurlough, tardOverrides, reviewByDate),
          getCellValue(row, '_afternoonTardiness', isFurlough, tardOverrides, reviewByDate),
        ),
        null,
        { hasNoPunchesFn: hasNoPunchesTimeInOutOnly },
      );
    }
    case '_hnTimeIN':
      return isNA(row.officialHonorariumTimeIN) ? NA : row.timeIN;
    case '_hnTimeOUT':
      return isNA(row.officialHonorariumTimeOUT) ? NA : row.timeOUT;
    case '_hnRendered':
      if (isFurlough)
        return !row.formattedFacultyMaxRenderedTimeHN ||
          row.formattedFacultyMaxRenderedTimeHN === 'NaN:NaN:NaN'
          ? ZERO_HM
          : displayDurationHhMm(row.formattedFacultyMaxRenderedTimeHN);
      return !row.officialTimeIN ||
        !row.timeOUT ||
        row.formattedFacultyRenderedTimeHN === 'NaN:NaN:NaN'
        ? ZERO_HM
        : displayDurationHhMm(row.formattedFacultyRenderedTimeHN);
    case '_hnTardiness':
      if (isFurlough) return ZERO_HM;
      return !row.officialTimeIN ||
        !row.timeOUT ||
        row.formattedfinalcalcFacultyHN === 'NaN:NaN:NaN'
        ? displayDurationHhMm(row.formattedFacultyMaxRenderedTimeHN)
        : displayDurationHhMm(row.formattedfinalcalcFacultyHN);
    case '_scTimeIN':
      return isNA(row.officialServiceCreditTimeIN) ? NA : row.timeIN;
    case '_scTimeOUT':
      return isNA(row.officialServiceCreditTimeOUT) ? NA : row.timeOUT;
    case '_scRendered':
      if (isFurlough)
        return !row.formattedFacultyMaxRenderedTimeSC ||
          row.formattedFacultyMaxRenderedTimeSC === 'NaN:NaN:NaN'
          ? ZERO_HM
          : displayDurationHhMm(row.formattedFacultyMaxRenderedTimeSC);
      return !row.officialTimeSC ||
        !row.timeOUT ||
        row.formattedFacultyRenderedTimeSC === 'NaN:NaN:NaN'
        ? ZERO_HM
        : displayDurationHhMm(row.formattedFacultyRenderedTimeSC);
    case '_scTardiness':
      if (isFurlough) return ZERO_HM;
      return !row.officialTimeIN ||
        !row.timeOUT ||
        row.formattedfinalcalcFacultySC === 'NaN:NaN:NaN'
        ? displayDurationHhMm(row.formattedFacultyMaxRenderedTimeSC)
        : displayDurationHhMm(row.formattedfinalcalcFacultySC);
    case '_otTimeIN':
      return isNA(row.officialOverTimeIN) ? NA : row.timeIN;
    case '_otTimeOUT':
      return isNA(row.officialOverTimeOUT) ? NA : row.timeOUT;
    case '_otRendered':
      if (isFurlough)
        return !row.formattedFacultyMaxRenderedTimeOT ||
          row.formattedFacultyMaxRenderedTimeOT === 'NaN:NaN:NaN'
          ? ZERO_HM
          : displayDurationHhMm(row.formattedFacultyMaxRenderedTimeOT);
      return !row.officialTimeIN ||
        !row.timeOUT ||
        row.formattedFacultyRenderedTimeOT === 'NaN:NaN:NaN'
        ? ZERO_HM
        : displayDurationHhMm(row.formattedFacultyRenderedTimeOT);
    case '_otTardiness':
      if (isFurlough) return ZERO_HM;
      return !row.officialTimeIN ||
        !row.timeOUT ||
        row.formattedfinalcalcFacultyOT === 'NaN:NaN:NaN'
        ? displayDurationHhMm(row.formattedFacultyMaxRenderedTimeOT)
        : displayDurationHhMm(row.formattedfinalcalcFacultyOT);
    case 'officialHonorariumTimeIN':
    case 'officialHonorariumTimeOUT':
    case 'officialServiceCreditTimeIN':
    case 'officialServiceCreditTimeOUT':
    case 'officialOverTimeIN':
    case 'officialOverTimeOUT':
      return isNA(row[colKey]) ? NA : row[colKey];
    default:
      return row[colKey] ?? '—';
  }
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
  const colKey =
    part === 'morning' ? '_morningTardiness' : '_afternoonTardiness';
  const systemVal = canonicalTardDisplay(
    getCellValue(row, colKey, isFurlough, null),
  );
  const [local, setLocal] = React.useState(() =>
    canonicalTardDisplay(storedOverride ?? systemVal),
  );
  React.useEffect(() => {
    setLocal(canonicalTardDisplay(storedOverride ?? systemVal));
  }, [row.date, storedOverride, systemVal]);
  const normalizedStored =
    storedOverride != null && String(storedOverride).trim() !== ''
      ? normalizeDurationInput(storedOverride)
      : null;
  const hasAdjusted = Boolean(
    normalizedStored && normalizedStored !== systemVal,
  );

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
      onInvalid('Use HH:MM or HH:MM:SS (e.g. 00:05:00).');
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
        transition: 'background-color 0.12s',
        'tr:hover &': { bgcolor: `${T.rowHover} !important` },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 0.35,
          minWidth: 96,
        }}
      >
        <TextField
          size="small"
          fullWidth
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={applyBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.target.blur();
            }
          }}
          placeholder={systemVal}
          inputProps={{
            'aria-label': part === 'morning' ? 'AM tardiness' : 'PM tardiness',
            sx: {
              fontFamily: T.recordFont,
              fontSize: '0.78rem',
              textAlign: 'center',
              py: 0.65,
            },
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end" sx={{ ml: 0 }}>
                <Tooltip title="Use system calculation" placement="top" arrow>
                  <IconButton
                    size="small"
                    aria-label="Use system calculation"
                    onClick={() => {
                      onCommit(null);
                      setLocal(systemVal);
                    }}
                    sx={{ p: 0.35, color: T.accentMid }}
                  >
                    <RestartAlt sx={{ fontSize: 17 }} />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 1,
              bgcolor: '#fff',
              fontSize: '0.78rem',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: T.accentBorder,
            },
          }}
        />
        {hasAdjusted && (
          <Typography
            sx={{
              fontSize: '0.58rem',
              color: T.muted,
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            System: {systemVal}
          </Typography>
        )}
      </Box>
    </TableCell>
  );
};

// ─── Floating Totals / Save Bar (unified NonTeaching style) ──────────────
const FloatingTotalsBar = ({
  totals,
  visible,
  onSave,
  saving,
  startDate,
  endDate,
  officialHoursPerDay,
  showSaveButton = true,
}) => {
  const [expanded, setExpanded] = useState(true);
  if (!visible) return null;

  const allItems = [
    {
      label: 'Absent Days',
      value: String(
        Number.isFinite(Number(totals.absentDays))
          ? Number(totals.absentDays)
          : 0,
      ),
      subtitle: totals.absentTime || ZERO_HM,
      style: T.absent,
      accent: true,
    },
    {
      label: 'Half Days',
      value: String(
        Number.isFinite(Number(totals.halfDays)) ? Number(totals.halfDays) : 0,
      ),
      subtitle: totals.halfDayShortfallTime || ZERO_HM,
      statusLine:
        Number(totals.halfDaysForReview) > 0
          ? `${Number(totals.halfDaysForReview)} FOR REVIEW`
          : null,
      style: T.halfDay,
      accent: true,
    },
    {
      label: 'Late Total',
      value: totals.lateTotalTime || ZERO_HM,
      style: T.tardiness,
      accent: true,
    },
    {
      label: 'Overall Rendered',
      value: totals.overallRendered || ZERO_HM,
      style: T.rendered,
      accent: true,
    },
    {
      label: 'Overall Tardiness',
      value: formatTardinessAsDaysHoursWithHoursPerDay(
        totals.overallTardiness || ZERO_HM,
        officialHoursPerDay,
      ),
      subtitle: `${totals.overallTardiness || ZERO_HM} · Absent + Half + Late`,
      style: T.tardiness,
      accent: true,
    },
    { label: 'AM Rendered', value: totals.morningRendered || ZERO_HM },
    { label: 'AM Tardiness', value: totals.morningTardiness || ZERO_HM },
    { label: 'PM Rendered', value: totals.afternoonRendered || ZERO_HM },
    { label: 'PM Tardiness', value: totals.afternoonTardiness || ZERO_HM },
    { label: 'HN Rendered', value: totals.hnRendered || ZERO_HM },
    { label: 'HN Tardiness', value: totals.hnTardiness || ZERO_HM },
    { label: 'SC Rendered', value: totals.scRendered || ZERO_HM },
    { label: 'SC Tardiness', value: totals.scTardiness || ZERO_HM },
    { label: 'OT Rendered', value: totals.otRendered || ZERO_HM },
    { label: 'OT Tardiness', value: totals.otTardiness || ZERO_HM },
  ];

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <Paper
        elevation={8}
        sx={{
          borderRadius: '12px',
          overflow: 'hidden',
          width: '100%',
          maxWidth: '100%',
          border: `1px solid ${T.accentBorder}`,
          bgcolor: '#fff',
          mt: 2,
          mb: 2,
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        }}
      >
        <Box
          onClick={() => setExpanded((p) => !p)}
          sx={{
            px: 2.5,
            py: 1.25,
            bgcolor: T.accentFaint,
            borderBottom: `1px solid ${T.accentBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WorkHistory sx={{ fontSize: 14, color: T.accent }} />
            <Typography
              sx={{
                fontSize: '0.74rem',
                fontWeight: 700,
                color: T.accent,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Attendance Summary
            </Typography>
            {startDate && endDate && (
              <Typography
                sx={{
                  fontSize: '0.67rem',
                  color: T.muted,
                  fontFamily: T.recordFont,
                }}
              >
                {startDate} – {endDate}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {showSaveButton && (
            <Button
              variant="contained"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                if (!saving) onSave();
              }}
              disabled={saving}
              startIcon={
                saving ? (
                  <CircularProgress
                    size={14}
                    thickness={5}
                    sx={{ color: '#fff' }}
                  />
                ) : (
                  <SaveAs sx={{ fontSize: '15px !important' }} />
                )
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
            {expanded ? (
              <ExpandMore sx={{ fontSize: 16, color: T.muted }} />
            ) : (
              <ExpandLess sx={{ fontSize: 16, color: T.muted }} />
            )}
          </Box>
        </Box>
        <Collapse
          in={expanded}
          sx={{
            width: '100%',
            maxWidth: '100%',
            '& .MuiCollapse-wrapper': { width: '100%' },
            '& .MuiCollapse-wrapperInner': { width: '100%', maxWidth: '100%' },
          }}
        >
          <Box
            sx={{
              px: 1.5,
              py: 1.25,
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
              overflowX: 'auto',
              overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch',
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
                <Box
                  key={label}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: 1.5,
                    py: 0.75,
                    borderRadius: '6px',
                    flex: '0 0 auto',
                    border: `1px solid ${accent ? style.border : T.divider}`,
                    bgcolor: accent ? style.bg : '#fafafa',
                    minWidth: 90,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      color: accent ? style.color : T.faint,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      mb: 0.2,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: accent ? style.color : T.muted,
                      fontFamily: T.recordFont,
                      lineHeight: 1.2,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {value}
                  </Typography>
                  {subtitle != null && (
                    <Typography
                      sx={{
                        fontFamily: T.recordFont,
                        fontWeight: 600,
                        fontSize: '0.62rem',
                        color: accent ? style.color : T.muted,
                        opacity: 0.55,
                        mt: 0.25,
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {subtitle}
                    </Typography>
                  )}
                  {statusLine != null && (
                    <Typography
                      sx={{
                        fontFamily: T.recordFont,
                        fontWeight: 500,
                        fontSize: '0.58rem',
                        color: T.tardiness.color,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        mt: 0.35,
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                      }}
                    >
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

// ─── Sticky Scrollbar (kept from original) ────────────────────────────────
const StickyScrollbar = ({ innerRef }) => {
  const proxyRef = useRef(null);
  const ghostRef = useRef(null);
  const syncingRef = useRef(false);
  useEffect(() => {
    const inner = innerRef.current,
      proxy = proxyRef.current,
      ghost = ghostRef.current;
    if (!inner || !proxy || !ghost) return;
    const updateWidth = () => {
      ghost.style.width = inner.scrollWidth + 'px';
    };
    const ro = new ResizeObserver(updateWidth);
    ro.observe(inner);
    updateWidth();
    const onInnerScroll = () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      proxy.scrollLeft = inner.scrollLeft;
      syncingRef.current = false;
    };
    const onProxyScroll = () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      inner.scrollLeft = proxy.scrollLeft;
      syncingRef.current = false;
    };
    inner.addEventListener('scroll', onInnerScroll);
    proxy.addEventListener('scroll', onProxyScroll);
    return () => {
      inner.removeEventListener('scroll', onInnerScroll);
      proxy.removeEventListener('scroll', onProxyScroll);
      ro.disconnect();
    };
  }, [innerRef]);
  return (
    <Box
      ref={proxyRef}
      sx={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        width: '100%',
        zIndex: 10,
        overflowX: 'auto',
        overflowY: 'hidden',
        height: 16,
        bgcolor: '#fff',
        borderTop: `1px solid ${T.divider}`,
        '&::-webkit-scrollbar': { height: 12 },
        '&::-webkit-scrollbar-track': {
          background: T.accentFaint,
          borderRadius: 4,
        },
        '&::-webkit-scrollbar-thumb': {
          background: T.accentMid,
          borderRadius: 4,
          '&:hover': { background: T.accent },
        },
      }}
    >
      <Box ref={ghostRef} sx={{ height: 1 }} />
    </Box>
  );
};

// ─── Styled Modal ─────────────────────────────────────────────────────────
const StyledModal = ({
  open,
  onClose,
  title,
  message,
  type = 'info',
  onConfirm,
  showCancel = false,
  confirmLabel = null,
}) => {
  const typeConfig = {
    success: {
      icon: <CheckCircleIcon sx={{ fontSize: 26, color: '#2e7d32' }} />,
      avatarBg: 'rgba(46,125,50,0.12)',
      label: 'Success',
      labelColor: '#2e7d32',
    },
    warning: {
      icon: <WarningIcon sx={{ fontSize: 26, color: '#92400e' }} />,
      avatarBg: 'rgba(146,64,14,0.12)',
      label: 'Warning',
      labelColor: '#92400e',
    },
    error: {
      icon: <ErrorIcon sx={{ fontSize: 26, color: '#991b1b' }} />,
      avatarBg: 'rgba(153,27,27,0.12)',
      label: 'Error',
      labelColor: '#991b1b',
    },
    info: {
      icon: <InfoIcon sx={{ fontSize: 26, color: T.accent }} />,
      avatarBg: T.accentFaint,
      label: 'Notice',
      labelColor: T.accent,
    },
  };
  const cfg = typeConfig[type] || typeConfig.info;
  const lines = message
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const isListItem = (l) =>
    l.startsWith('•') ||
    l.startsWith('-') ||
    /^\d{5,}/.test(l) ||
    /^Employee\s+\d/.test(l);
  const isNote = (l) =>
    /^(contact|please|this action|note:|important)/i.test(l);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          overflow: 'hidden',
          border: '0.5px solid rgba(0,0,0,0.09)',
          bgcolor: '#fff',
        },
      }}
    >
      <Box
        sx={{
          px: 3,
          py: 3,
          background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: `radial-gradient(circle,${alpha(T.accent, 0.1)} 0%,transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            color: T.accent,
            opacity: 0.45,
            '&:hover': { opacity: 1, bgcolor: T.accentFaint },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Avatar
            sx={{
              bgcolor: cfg.avatarBg,
              width: 48,
              height: 48,
              border: `1px solid ${T.accentBorder}`,
            }}
          >
            {cfg.icon}
          </Avatar>
          <Box>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}
            >
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  color: T.accent,
                  lineHeight: 1.2,
                }}
              >
                {title}
              </Typography>
              <Chip
                label={cfg.label}
                size="small"
                sx={{
                  bgcolor: alpha(cfg.labelColor, 0.1),
                  color: cfg.labelColor,
                  fontWeight: 700,
                  fontSize: '0.62rem',
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  height: 18,
                  borderRadius: '5px',
                  border: `1px solid ${alpha(cfg.labelColor, 0.2)}`,
                }}
              />
            </Box>
            <Typography
              sx={{ fontSize: '0.74rem', color: T.faint, fontWeight: 500 }}
            >
              {new Date().toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Typography>
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          px: 3,
          py: 2.5,
          borderTop: `1px solid ${T.divider}`,
          borderBottom: `1px solid ${T.divider}`,
        }}
      >
        {lines.map((line, i) => {
          if (isListItem(line)) {
            const clean = line.replace(/^[•\-]\s*/, '');
            const [empPart, ...rest] = clean.split(':');
            return (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 1,
                  px: 1.5,
                  py: 1,
                  borderRadius: '8px',
                  bgcolor: T.accentFaint,
                  border: `1px solid ${T.accentBorder}`,
                }}
              >
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '6px',
                    flexShrink: 0,
                    bgcolor: alpha(T.accent, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Person
                    sx={{ fontSize: 14, color: T.accent, opacity: 0.7 }}
                  />
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: T.text,
                      lineHeight: 1.2,
                    }}
                  >
                    {empPart?.trim()}
                  </Typography>
                  {rest.length > 0 && (
                    <Typography
                      sx={{
                        fontSize: '0.74rem',
                        color: T.muted,
                        fontWeight: 500,
                        mt: 0.1,
                      }}
                    >
                      {rest.join(':').trim()}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          }
          if (isNote(line)) {
            return (
              <Box
                key={i}
                sx={{
                  mt: 1.5,
                  px: 1.5,
                  py: 1.25,
                  borderRadius: '8px',
                  bgcolor: T.accentFaint,
                  border: `1px solid ${T.accentBorder}`,
                  borderLeft: `4px solid ${alpha(T.accent, 0.5)}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                }}
              >
                <InfoIcon
                  sx={{
                    fontSize: 13,
                    color: T.accent,
                    opacity: 0.6,
                    mt: 0.2,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  sx={{
                    fontSize: '0.82rem',
                    color: T.muted,
                    fontWeight: 600,
                    lineHeight: 1.65,
                  }}
                >
                  {line}
                </Typography>
              </Box>
            );
          }
          return (
            <Typography
              key={i}
              sx={{
                fontSize: '0.88rem',
                color: T.muted,
                lineHeight: 1.8,
                fontWeight: 500,
                mb: i < lines.length - 1 ? 1 : 0,
              }}
            >
              {line}
            </Typography>
          );
        })}
      </Box>
      <Box
        sx={{
          px: 3,
          py: 2,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1,
        }}
      >
        {showCancel && (
          <RowBtn
            icon={null}
            label="Cancel"
            color={T.muted}
            hoverBg="rgba(0,0,0,0.05)"
            onClick={onClose}
          />
        )}
        <button
          onClick={onConfirm || onClose}
          style={{
            background: T.accent,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 24px',
            fontWeight: 700,
            fontSize: '0.82rem',
            fontFamily: 'inherit',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = T.accentDark;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = T.accent;
          }}
        >
          {confirmLabel || (showCancel ? 'Confirm' : 'OK')}
        </button>
      </Box>
    </Dialog>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
const AttendanceModuleFacultyDesignated = ({
  embedded = false,
  initialContext = null,
  onClose,
  onSavedToSummary,
  saveSignal = 0,
  refreshEpoch = 0,
} = {}) => {
  const seedEmp = String(initialContext?.employeeNumber || '').trim();
  const seedStart = initialContext?.startDate || '';
  const seedEnd = initialContext?.endDate || '';
  const { settings } = useSystemSettings();
  const [employeeNumber, setEmployeeNumber] = useState(seedEmp);
  const [employeeDisplayName, setEmployeeDisplayName] = useState(
    initialContext?.fullName || initialContext?.employee?.fullName || '',
  );
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(seedStart);
  const [endDate, setEndDate] = useState(seedEnd);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('regular');
  const [showScrollTop, setShowScrollTop] = useState(false);

  // ── Collapsed column groups per tab ───────────────────────────────────
  const [collapsedGroups, setCollapsedGroups] = useState({
    regular: {
      morningDevice: false,
      morningOfficial: true,
      breaktimeDevice: false,
      breaktimeOfficial: true,
      afternoonBreakDevice: false,
      timeOutDevice: false,
      afternoonOfficial: true,
      amRendered: false,
      amTard: false,
      pmRendered: false,
      pmTard: false,
      totalTard: false,
    },
    honorarium: {
      hnTimes: false,
      hnOfficial: true,
      hnRendered: false,
      hnTard: false,
    },
    serviceCredit: {
      scTimes: false,
      scOfficial: true,
      scRendered: false,
      scTard: false,
    },
    overtime: {
      otTimes: false,
      otOfficial: true,
      otRendered: false,
      otTard: false,
    },
  });
  const toggleColGroup = (tab, groupKey) =>
    setCollapsedGroups((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], [groupKey]: !prev[tab][groupKey] },
    }));

  const [suspensionByDate, setSuspensionByDate] = useState({});
  const [leaveByDate, setLeaveByDate] = useState({});
  const [holidayByDate, setHolidayByDate] = useState({});
  const [tardinessOverrides, setTardinessOverrides] = useState({});
  const [renderedOverrides, setRenderedOverrides] = useState({});
  const [halfDayReviewByDate, setHalfDayReviewByDate] = useState({});
  const [halfDayReviewDialog, setHalfDayReviewDialog] = useState(null);
  const [unresolvedDatesModal, setUnresolvedDatesModal] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const resultsRef = useRef(null);
  const submitInFlightRef = useRef(false);
  const persistDebounceRef = useRef(null);

  const { hasAccess, loading: accessLoading } = usePageAccess(
    'attendance-module-faculty-40hrs',
  );

  const currentYear = new Date().getFullYear();
  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];
  const [selectedMonth, setSelectedMonth] = useState(
    initialContext?.selectedMonth ?? null,
  );
  const [selectedYear, setSelectedYear] = useState(
    initialContext?.selectedYear ?? new Date().getFullYear(),
  );
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [snackbarCountdown, setSnackbarCountdown] = useState(6);
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
    setSnackbarCountdown(6);
  };
  const handleCloseSnackbar = () => setSnackbar((p) => ({ ...p, open: false }));

  const [modal, setModal] = useState({
    open: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    showCancel: false,
    confirmLabel: null,
  });
  const showModal = (
    title,
    message,
    type = 'info',
    onConfirm = null,
    showCancel = false,
    confirmLabel = null,
  ) =>
    setModal({
      open: true,
      title,
      message,
      type,
      onConfirm,
      showCancel,
      confirmLabel,
    });
  const closeModal = () =>
    setModal((p) => ({ ...p, open: false, confirmLabel: null }));

  const [compareOpen, setCompareOpen] = useState(false);
  const [pendingSavedOverall, setPendingSavedOverall] = useState(null);
  const [pendingProposedOverall, setPendingProposedOverall] = useState(null);

  useEffect(() => {
    let timer;
    if (snackbar.open && snackbarCountdown > 0)
      timer = setInterval(() => setSnackbarCountdown((p) => p - 1), 1000);
    return () => clearInterval(timer);
  }, [snackbar.open, snackbarCountdown]);

  useEffect(() => {
    if (!accessLoading) setPageLoading(false);
  }, [accessLoading]);

  useEffect(() => {
    if (embedded) return;
    const en = localStorage.getItem('attendanceDesignatedEmployeeNumber');
    const sd = localStorage.getItem('attendanceDesignatedStartDate');
    const ed = localStorage.getItem('attendanceDesignatedEndDate');
    if (en) setEmployeeNumber(en);
    if (sd) setStartDate(sd);
    if (ed) setEndDate(ed);
  }, [embedded]);

  useEffect(() => {
    if (attendanceData.length === 0) return;
    const timer = setTimeout(() => {
      document.body.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('overflow');
      if (resultsRef.current) {
        resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [attendanceData]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Hub drawer uses initialContext + remount; skip router hydration when embedded.
    if (embedded) return;
    const s = location.state;
    if (!s?.fromAttendanceWorkflow && !s?.fromDevice) return;

    const en = s?.employeeNumber != null ? String(s.employeeNumber).trim() : '';
    const sd = s?.startDate ? String(s.startDate).slice(0, 10) : '';
    const ed = s?.endDate ? String(s.endDate).slice(0, 10) : '';
    if (!en || !sd || !ed) return;

    setEmployeeNumber(en);
    setStartDate(sd);
    setEndDate(ed);

    const t = setTimeout(() => {
      if (handleSubmitRef.current) handleSubmitRef.current();
    }, 300);
    return () => clearTimeout(t);
  }, [
    embedded,
    location.state?.employeeNumber,
    location.state?.startDate,
    location.state?.endDate,
  ]);

  const getStatusLabelForDate = useCallback(
    (date) =>
      getLeaveStatusLabelForDate(date, {
        suspensionByDate,
        holidayByDate,
        leaveByDate,
      }),
    [suspensionByDate, holidayByDate, leaveByDate],
  );

  const commitTardinessOverride = useCallback(
    (date, part, normalizedOrNull) => {
      setTardinessOverrides((prev) => {
        const row = attendanceData.find((r) => r.date === date);
        if (!row) return prev;
        const colKey =
          part === 'morning' ? '_morningTardiness' : '_afternoonTardiness';
        const f = Boolean(getStatusLabelForDate(date));
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
    },
    [attendanceData, getStatusLabelForDate],
  );

  const commitRenderedOverride = useCallback((date, part, normalizedOrNull) => {
    setRenderedOverrides((prev) => {
      const next = { ...prev };
      const cur = { ...(next[date] || {}) };
      if (normalizedOrNull == null) {
        delete cur[part];
      } else {
        cur[part] = normalizedOrNull;
      }
      if (!cur.morning && !cur.afternoon) delete next[date];
      else next[date] = cur;
      return next;
    });
  }, []);

  // ── handleSubmit — with pre-flight device check ──
  // FIX: Non-Teaching-style behavior — fetch BOTH the raw device punches
  // (deviceRows, biometric preflight) AND the persisted attendancerecord rows
  // (rawRows, which include anything saved via Attendance Modification, e.g.
  // manually_modified = 1 rows, leave-gap rows, schedule-gap rows). We only
  // show the "No Device Records Found" dialog when BOTH sources are empty —
  // previously this module bailed out the instant deviceRows was empty,
  // even if the employee already had manually-entered records for the period.
  const handleSubmit = async () => {
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    localStorage.setItem('attendanceDesignatedEmployeeNumber', employeeNumber);
    localStorage.setItem('attendanceDesignatedStartDate', startDate);
    localStorage.setItem('attendanceDesignatedEndDate', endDate);
    setLoading(true);
    setError('');
    try {
      const [deviceRows, maps, attendanceRes] = await Promise.all([
        postAttendanceDevicePreflightNoSync({
          apiBaseUrl: API_BASE_URL,
          getAuthHeaders,
          personID: employeeNumber,
          startDate,
          endDate,
        }),
        fetchAttendanceCalendarMaps({
          apiBaseUrl: API_BASE_URL,
          getAuthHeaders,
          startDate,
          endDate,
          personId: employeeNumber,
        }),
        axios.get(`${API_BASE_URL}/attendance/api/attendance`, {
          params: { personId: employeeNumber, startDate, endDate },
          ...getAuthHeaders(),
        }),
      ]);

      // Compute rawRows BEFORE any early return, so manually-modified /
      // Attendance-Modification-saved records are visible to the emptiness check.
      const rawRows = Array.isArray(attendanceRes.data) ? attendanceRes.data : [];

      // Only treat this as "nothing found" when BOTH the device AND the
      // persisted attendancerecord table are empty for this period.
      if (deviceRows.length === 0 && rawRows.length === 0) {
        setAttendanceData([]);
        setTardinessOverrides({});
        setSuspensionByDate({});
        setLeaveByDate({});
        setHolidayByDate({});
        showModal(
          'No Device Records Found',
          'No biometric device records were found for this employee within the selected date range, and no records have been manually added.\n\nPlease verify the employee number and date range, check if the attendance device has synced, or add records in Attendance Modification.\n\nPress OK to open Attendance Device.',
          'warning',
          () => {
            closeModal();
            navigate('/view_attendance');
          },
        );
        return;
      }

      // At this point either the device has punches, or manually-modified
      // records already exist. If rawRows is still empty here, it means the
      // device has punches but there is no matching Official Time Schedule
      // (the join in /api/attendance requires officialtime), so we guide the
      // user to set that up instead of silently rendering nothing.
      if (rawRows.length === 0) {
        setAttendanceData([]);
        setTardinessOverrides({});
        setSuspensionByDate({});
        setLeaveByDate({});
        setHolidayByDate({});
        showModal(
          'No Official Time Schedule',
          `Device records were found for this employee (${deviceRows.length} day${deviceRows.length !== 1 ? 's' : ''}), but no matching Official Time Schedule exists for this period.\n\nPlease set up the official time schedule in the Official Time Management module before generating attendance records.\n\nPress OK to open Official Time Management.`,
          'warning',
          () => {
            closeModal();
            navigate('/official_time');
          },
        );
        return;
      }

      const processedData = rawRows.map((row) => {
        const {
          timeIN,
          timeOUT,
          breaktimeIN,
          breaktimeOUT,
          officialBreaktimeIN,
          officialBreaktimeOUT,
          officialTimeIN,
          officialTimeOUT,
          officialHonorariumTimeIN,
          officialHonorariumTimeOUT,
          officialServiceCreditTimeIN,
          officialServiceCreditTimeOUT,
          officialOverTimeIN,
          officialOverTimeOUT,
        } = row;

        const isEmptyPunch = (t) => isEmptyAttendancePunch(t);

        const {
          noTimeIn: noAmPunch,
          noTimeOut: noPmPunch,
          scheduleBreakIn,
          scheduleBreakOut,
          effectiveBreaktimeIN,
          effectiveBreaktimeOUT,
          displayBreaktimeIN,
          displayBreaktimeOUT,
        } = applyFacultyPunchGatedBreaktimes({
          timeIN,
          timeOUT,
          breaktimeIN,
          breaktimeOUT,
          officialBreaktimeIN,
          officialBreaktimeOUT,
        });

        // Schedule-aware half-day detection: classify a lone timeIN based on the
        // official break boundary rather than the field name alone.
        const schedMidpoint = parseAttendanceTimeOn2000(
          scheduleBreakIn ?? effectiveBreaktimeIN ?? officialBreaktimeIN,
        );
        const punchInTime = !noAmPunch
          ? parseAttendanceTimeOn2000(timeIN)
          : null;
        const punchInIsPmSide =
          punchInTime != null &&
          !Number.isNaN(schedMidpoint.getTime()) &&
          punchInTime >= schedMidpoint;

        const pmSideLonePunch = !noAmPunch && noPmPunch && punchInIsPmSide;
        const effectiveNoPmPunch = noPmPunch && !punchInIsPmSide;

        // ── HALF-DAY DETECTION ──────────────────────────────────────────────────
        // A half-day means exactly one of the two anchors (timeIN / timeOUT) is
        // present.  In that case we must NOT charge tardiness for the missing half;
        // only the present half's shortfall is relevant.
        const hasOnlyMorningPunch = !noAmPunch && noPmPunch && !punchInIsPmSide;
        const hasOnlyAfternoonPunch =
          pmSideLonePunch || (noAmPunch && !noPmPunch);
        const isHalfDayRow = hasOnlyMorningPunch || hasOnlyAfternoonPunch;

        // ── AM SEGMENT ──────────────────────────────────────────────────────────
        let formattedFacultyRenderedTimeAM = ZERO_HM;
        let formattedFacultyMaxRenderedTimeAM = ZERO_HM;
        let formattedfinalcalcFacultyAM = ZERO_HM;

        // Skip AM computation only for the PM-side lone timeIN case.
        if (!pmSideLonePunch) {
          const startOfficialTimeFacultyAM =
            parseAttendanceTimeOn2000(officialTimeIN);
          const endOfficialTimeFacultyAM = parseAttendanceTimeOn2000(
            effectiveBreaktimeIN ?? scheduleBreakIn ?? officialBreaktimeIN,
          );
          const diffMsAMMax =
            endOfficialTimeFacultyAM - startOfficialTimeFacultyAM;
          formattedFacultyMaxRenderedTimeAM =
            formatDurationMsToHhMmSs(diffMsAMMax);

          const midnightFacultyAM = new Date('01/01/2000 00:00:00 AM');
          let timeinfacultyAM, timeoutfacultyAM;
          if (noAmPunch) {
            // Both punches absent → full absent row, not half-day; AM gets full tardiness.
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
          const diffMsAM = timeoutfacultyAM - timeinfacultyAM;
          formattedFacultyRenderedTimeAM = formatDurationMsToHhMmSs(diffMsAM);
          const tardAM =
            parseAttendanceTimeOn2000(formattedFacultyMaxRenderedTimeAM) -
            parseAttendanceTimeOn2000(formattedFacultyRenderedTimeAM);
          formattedfinalcalcFacultyAM = formatDurationMsToHhMmSs(tardAM);
        }

        // ── PM SEGMENT ──────────────────────────────────────────────────────────
        let formattedFacultyRenderedTimePM = ZERO_HM;
        let formattedFacultyMaxRenderedTimePM = ZERO_HM;
        let formattedfinalcalcFacultyPM = ZERO_HM;

        // Skip PM computation entirely when the employee only punched IN (AM half-day).
        if (!hasOnlyMorningPunch) {
          const startOfficialTimeFacultyPM = parseAttendanceTimeOn2000(
            effectiveBreaktimeOUT ??
              scheduleBreakOut ??
              officialBreaktimeOUT,
          );
          const endOfficialTimeFacultyPM =
            parseAttendanceTimeOn2000(officialTimeOUT);
          const diffMsPMMax =
            endOfficialTimeFacultyPM - startOfficialTimeFacultyPM;
          formattedFacultyMaxRenderedTimePM =
            formatDurationMsToHhMmSs(diffMsPMMax);

          const midnightFacultyPM = new Date('01/01/2000 00:00:00 PM');
          let timeinfacultyPM, timeoutfacultyPM;
          if (effectiveNoPmPunch) {
            // Both absent → full absent row; PM gets full tardiness.
            timeoutfacultyPM = midnightFacultyPM;
            timeinfacultyPM = midnightFacultyPM;
          } else {
            const startDateFacultyPM = parseAttendanceTimeOn2000(
              effectiveBreaktimeOUT ??
                scheduleBreakOut ??
                officialBreaktimeOUT,
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
          const diffMsPM = timeoutfacultyPM - timeinfacultyPM;
          formattedFacultyRenderedTimePM = formatDurationMsToHhMmSs(diffMsPM);
          const tardPM =
            parseAttendanceTimeOn2000(formattedFacultyMaxRenderedTimePM) -
            parseAttendanceTimeOn2000(formattedFacultyRenderedTimePM);
          formattedfinalcalcFacultyPM = formatDurationMsToHhMmSs(tardPM);
        }

        // ── HONORARIUM / SERVICE CREDIT / OVERTIME SEGMENTS ─────────────────────
        const calcSeg = (tIn, tOut, offIn, offOut) => {
          const emptyIn = isEmptyPunch(tIn),
            emptyOut = isEmptyPunch(tOut);
          if (emptyIn && emptyOut) {
            const os = parseAttendanceTimeOn2000(offIn),
              oe = parseAttendanceTimeOn2000(offOut);
            if (
              Number.isNaN(os.getTime()) ||
              Number.isNaN(oe.getTime()) ||
              oe <= os
            )
              return {
                rendered: ZERO_HM,
                maxRendered: ZERO_HM,
                tardiness: ZERO_HM,
              };
            const offDiff = oe - os;
            const maxRendered = formatDurationMsToHhMmSs(offDiff);
            return {
              rendered: ZERO_HM,
              maxRendered,
              tardiness: maxRendered,
            };
          }
          const s = parseAttendanceTimeOn2000(tIn),
            e = parseAttendanceTimeOn2000(tOut);
          const os = parseAttendanceTimeOn2000(offIn),
            oe = parseAttendanceTimeOn2000(offOut);
          const mid = new Date('01/01/2000 00:00:00 AM');
          const si = e < os || s > oe ? mid : s < os ? os : s;
          const ei = si === mid ? mid : e < os ? mid : e < oe ? e : oe;
          const diff = ei - si;
          const rendered = formatDurationMsToHhMmSs(diff);
          const offDiff = oe - os;
          const maxRendered = formatDurationMsToHhMmSs(offDiff);
          const tard =
            parseAttendanceTimeOn2000(maxRendered) -
            parseAttendanceTimeOn2000(rendered);
          const tardiness = formatDurationMsToHhMmSs(tard);
          return { rendered, maxRendered, tardiness };
        };

        const hn = calcSeg(
          timeIN,
          timeOUT,
          officialHonorariumTimeIN,
          officialHonorariumTimeOUT,
        );
        const sc = calcSeg(
          timeIN,
          timeOUT,
          officialServiceCreditTimeIN,
          officialServiceCreditTimeOUT,
        );
        const ot = calcSeg(
          timeIN,
          timeOUT,
          officialOverTimeIN,
          officialOverTimeOUT,
        );

        // Late = arrival − official Time IN; Undertime = official Time OUT − departure.
        const arrivalLateSec = computeArrivalLateMinuteSec({
          timeIN,
          timeOUT,
          breaktimeIN,
          breaktimeOUT,
          officialTimeIN,
          officialTimeOUT,
        }) ?? 0;
        const earlyLeaveSec = computeEarlyLeaveUndertimeMinuteSec({
          timeIN,
          timeOUT,
          breaktimeIN,
          breaktimeOUT,
          officialTimeIN,
          officialTimeOUT,
        }) ?? 0;
        formattedfinalcalcFacultyAM = formatDurationHhMm(arrivalLateSec);
        formattedfinalcalcFacultyPM = formatDurationHhMm(earlyLeaveSec);

        return {
          ...row,
          // Raw punches for half-day / late (match DTR Apply Designated).
          breaktimeIN: breaktimeIN || '',
          breaktimeOUT: breaktimeOUT || '',
          displayBreaktimeIN,
          displayBreaktimeOUT,
          lateTotal: formattedfinalcalcFacultyAM,
          undertimeTotal: formattedfinalcalcFacultyPM,
          formattedFacultyRenderedTimeAM,
          formattedFacultyMaxRenderedTimeAM,
          formattedfinalcalcFacultyAM,
          formattedFacultyRenderedTimePM,
          formattedFacultyMaxRenderedTimePM,
          formattedfinalcalcFacultyPM,
          formattedFacultyRenderedTimeHN: hn.rendered,
          formattedFacultyMaxRenderedTimeHN: hn.maxRendered,
          formattedfinalcalcFacultyHN: hn.tardiness,
          formattedFacultyRenderedTimeSC: sc.rendered,
          formattedFacultyMaxRenderedTimeSC: sc.maxRendered,
          formattedfinalcalcFacultySC: sc.tardiness,
          formattedFacultyRenderedTimeOT: ot.rendered,
          formattedFacultyMaxRenderedTimeOT: ot.maxRendered,
          formattedfinalcalcFacultyOT: ot.tardiness,
        };
      });

      const calendarMaps = {
        suspensionByDate: maps.suspensionByDate,
        holidayByDate: maps.holidayByDate,
        leaveByDate: maps.leaveByDate,
      };

      const buildReviewMapFromStored = (stored) =>
        migrateLegacyHalfDayReview(
          buildReviewByDate(parseHalfDayReviewJson(stored?.half_day_review)),
          stored?.halfDayDates ?? '',
          processedData,
          MODULE_TYPES.DESIGNATED_40HRS,
          calendarMaps,
        );

      const initialReviewMap = buildReviewMapFromStored({
        half_day_review: null,
        halfDayDates: '',
      });

      const normalizedProcessed = processedData.map(normalizeFacultyRowDurations);

      setSuspensionByDate(maps.suspensionByDate);
      setLeaveByDate(maps.leaveByDate);
      setHolidayByDate(maps.holidayByDate);
      setTardinessOverrides({});
      setAttendanceData(normalizedProcessed);
      setHalfDayReviewByDate(initialReviewMap);

      const totalLateSec = normalizedProcessed.reduce(
        (sum, row) => sum + parseDurationToMinuteSec(row.lateTotal),
        0,
      );
      const totalLateLabel = formatDurationHhMm(totalLateSec);

      logAttendanceModuleAction({
        module: 'Attendance Module (Faculty Designated)',
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
          const serverReviewMap = buildReviewMapFromStored(stored);
          setHalfDayReviewByDate(serverReviewMap);
          setAttendanceData(
            applyStoredLateUndertimeToAttendanceRows(
              normalizedProcessed,
              stored?.byDate || {},
            ).map(normalizeFacultyRowDurations),
          );
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
      setError(msg);
      showSnackbar(msg, 'error');
    } finally {
      submitInFlightRef.current = false;
      setLoading(false);
    }
  };

  // ── Totals ─────────────────────────────────────────────────────────────────
  const sumTime = useCallback((values) => sumDurationHhMm(values), []);

  const addTimes = useCallback((a, b) => addTimeHhMmOnly(a, b), []);

  const totals = React.useMemo(() => {
    if (!attendanceData.length) return {};
    const calendarMaps = { suspensionByDate, holidayByDate, leaveByDate };
    const buckets = computeAmPmMinuteBuckets(
      attendanceData,
      halfDayReviewByDate,
      calendarMaps,
      MODULE_TYPES.DESIGNATED_40HRS,
      { hasNoPunchesFn: hasNoPunchesTimeInOutOnly },
    );
    const morningRendered = sumTime(
      attendanceData.map((r) =>
        getDisplayedCellValue(
          r,
          '_morningRendered',
          Boolean(getStatusLabelForDate(r.date)),
          tardinessOverrides,
          renderedOverrides,
          halfDayReviewByDate,
        ),
      ),
    );
    const morningTardiness = sumTime(
      attendanceData.map((r) =>
        getDisplayedCellValue(
          r,
          '_morningTardiness',
          Boolean(getStatusLabelForDate(r.date)),
          tardinessOverrides,
          renderedOverrides,
          halfDayReviewByDate,
        ),
      ),
    );
    const afternoonRendered = sumTime(
      attendanceData.map((r) =>
        getDisplayedCellValue(
          r,
          '_afternoonRendered',
          Boolean(getStatusLabelForDate(r.date)),
          tardinessOverrides,
          renderedOverrides,
          halfDayReviewByDate,
        ),
      ),
    );
    const afternoonTardiness = sumTime(
      attendanceData.map((r) =>
        getDisplayedCellValue(
          r,
          '_afternoonTardiness',
          Boolean(getStatusLabelForDate(r.date)),
          tardinessOverrides,
          renderedOverrides,
          halfDayReviewByDate,
        ),
      ),
    );
    const totalRendered = sumTime(
      attendanceData.map((r) =>
        getDisplayedCellValue(
          r,
          '_totalRendered',
          Boolean(getStatusLabelForDate(r.date)),
          tardinessOverrides,
          renderedOverrides,
          halfDayReviewByDate,
        ),
      ),
    );
    const overallRendered = addTimes(morningRendered, afternoonRendered);
    const rowTardinessSum = sumDurationHhMm(
      attendanceData.map((r) =>
        getDisplayedCellValue(
          r,
          '_totalTardiness',
          Boolean(getStatusLabelForDate(r.date)),
          tardinessOverrides,
          renderedOverrides,
          halfDayReviewByDate,
        ),
      ),
    );
    const lateTotalTime = buckets.lateTotalDisplayTime;
    const overallTardiness = buckets.overallShortfallTime;
    const hnRendered = sumTime(
      attendanceData.map((r) =>
        getCellValue(r, '_hnRendered', Boolean(getStatusLabelForDate(r.date))),
      ),
    );
    const hnTardiness = sumTime(
      attendanceData.map((r) =>
        getCellValue(r, '_hnTardiness', Boolean(getStatusLabelForDate(r.date))),
      ),
    );
    const scRendered = sumTime(
      attendanceData.map((r) =>
        getCellValue(r, '_scRendered', Boolean(getStatusLabelForDate(r.date))),
      ),
    );
    const scTardiness = sumTime(
      attendanceData.map((r) =>
        getCellValue(r, '_scTardiness', Boolean(getStatusLabelForDate(r.date))),
      ),
    );
    const otRendered = sumTime(
      attendanceData.map((r) =>
        getCellValue(r, '_otRendered', Boolean(getStatusLabelForDate(r.date))),
      ),
    );
    const otTardiness = sumTime(
      attendanceData.map((r) =>
        getCellValue(r, '_otTardiness', Boolean(getStatusLabelForDate(r.date))),
      ),
    );
    return {
      absentDays: buckets.absentDays,
      halfDays: buckets.halfDays,
      halfDaysForReview: countSuggestedHalfDays(
        halfDayReviewByDate,
        attendanceData,
        MODULE_TYPES.DESIGNATED_40HRS,
        calendarMaps,
      ),
      absentTime: buckets.absentTime,
      halfDayShortfallTime: buckets.halfDayShortfallTime,
      lateTotalTime,
      morningRendered,
      morningTardiness,
      afternoonRendered,
      afternoonTardiness,
      totalRendered,
      overallRendered: totalRendered || overallRendered,
      overallTardiness,
      overallShortfallTime: buckets.overallShortfallTime,
      rowTardinessSum,
      hnRendered,
      hnTardiness,
      scRendered,
      scTardiness,
      otRendered,
      otTardiness,
    };
  }, [
    attendanceData,
    sumTime,
    addTimes,
    getStatusLabelForDate,
    leaveByDate,
    holidayByDate,
    suspensionByDate,
    tardinessOverrides,
    renderedOverrides,
    halfDayReviewByDate,
  ]);

  const officialHoursPerDay = React.useMemo(() => {
    // For this 40hrs designated module: expected 10 hours/day, but prefer deriving from official schedule times.
    const defaultMinutes = 10 * 60;
    const scheduledRows = attendanceData.filter((r) =>
      isScheduledByOfficialTime(r),
    );
    const derivedMinutes =
      scheduledRows
        .map(minutesFromOfficialScheduleRow)
        .find((m) => Number.isFinite(m) && m > 0) ?? null;
    const minutes = derivedMinutes ?? defaultMinutes;
    return minutes / 60;
  }, [attendanceData]);

  const isAbsentAttendanceRow = useCallback(
    (row) => {
      const d = String(row?.date ?? '').slice(0, 10);
      const calendarMaps = { suspensionByDate, holidayByDate, leaveByDate };
      if (isExcludedAttendanceCalendarDate(d, calendarMaps)) return false;
      if (!isScheduledByOfficialTime(row)) return false;
      return hasNoPunchesTimeInOutOnly(row);
    },
    [suspensionByDate, holidayByDate, leaveByDate],
  );

  const getHalfDayUiStatus = useCallback(
    (row) => {
      const calendarMaps = { suspensionByDate, holidayByDate, leaveByDate };
      return getRowHalfDayUiStatus(
        row,
        halfDayReviewByDate,
        MODULE_TYPES.DESIGNATED_40HRS,
        calendarMaps,
      );
    },
    [suspensionByDate, holidayByDate, leaveByDate, halfDayReviewByDate],
  );

  const collectUnresolvedHalfDayDates = useCallback(() => (
    attendanceData
      .filter((row) => {
        if (isAbsentAttendanceRow(row)) return false;
        if (getStatusLabelForDate(row.date)) return false;
        return getHalfDayUiStatus(row) === 'suggested';
      })
      .map((row) => row.date)
  ), [attendanceData, isAbsentAttendanceRow, getStatusLabelForDate, getHalfDayUiStatus]);

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
          moduleType: MODULE_TYPES.DESIGNATED_40HRS,
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
      if (entry.status === HALF_DAY_STATUS.APPROVED && hasHrHalfDayConfirmation(entry)) {
        const total = resolveEntryRenderedTotal(entry, MODULE_TYPES.DESIGNATED_40HRS);
        setRenderedOverrides((prev) => ({
          ...prev,
          [d]: {
            total: total || undefined,
            morning: entry.renderedMorning || undefined,
            afternoon: entry.renderedAfternoon || undefined,
          },
        }));
      }
      logAttendanceHalfDayReview({
        module: ATTENDANCE_AUDIT_MODULES.FACULTY_DESIGNATED,
        entry,
        computationModuleType: MODULE_TYPES.DESIGNATED_40HRS,
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
        moduleType: 'DESIGNATED_40HRS',
        rows: buildDailyLateUndertimeRows(
          attendanceData,
          approvedSet,
          halfDayReviewByDate,
          MODULE_TYPES.DESIGNATED_40HRS,
        ),
        halfDayDates: [...approvedSet].join(', '),
        half_day_review: buildHalfDayReviewArray(halfDayReviewByDate),
      });
    }, 350);
    return () => {
      if (persistDebounceRef.current) clearTimeout(persistDebounceRef.current);
    };
  }, [halfDayReviewByDate, attendanceData, employeeNumber, startDate, endDate]);

  // Kept for compatibility
  const getTabTotalsValues = (tab) => {
    switch (tab) {
      case 'regular':
        return [
          totals.morningRendered,
          totals.morningTardiness,
          totals.afternoonRendered,
          totals.afternoonTardiness,
        ];
      case 'honorarium':
        return [totals.hnRendered, totals.hnTardiness];
      case 'serviceCredit':
        return [totals.scRendered, totals.scTardiness];
      case 'overtime':
        return [totals.otRendered, totals.otTardiness];
      default:
        return [];
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
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
    const calendarMaps = { suspensionByDate, holidayByDate, leaveByDate };
    const approvedSet = getApprovedHalfDayDatesSet(halfDayReviewByDate);
    const dailyRows = buildDailyLateUndertimeRows(
      attendanceData,
      approvedSet,
      halfDayReviewByDate,
      MODULE_TYPES.DESIGNATED_40HRS,
    );
    return {
    ...(function computeAbsentHalfBuckets() {
      const c = computeAmPmMinuteBuckets(
        attendanceData,
        halfDayReviewByDate,
        calendarMaps,
        MODULE_TYPES.DESIGNATED_40HRS,
        { hasNoPunchesFn: hasNoPunchesTimeInOutOnly },
      );
      const absentList = listAbsentDatesFromDailyRows_TimeInOutOnly(
        attendanceData,
        calendarMaps,
      );
      return {
        absentDays: c.absentDays,
        halfDays: c.halfDays,
        lateTotalTime: totals.lateTotalTime || ZERO_HM,
        absentTime: c.absentTime,
        halfDayShortfallTime: c.halfDayShortfallTime,
        absentDates: absentList.join(', '),
        halfDayDates: [...approvedSet].join(', '),
        half_day_review: buildHalfDayReviewArray(halfDayReviewByDate),
      };
    })(),
    personID: employeeNumber,
    startDate,
    endDate,
    totalRenderedTimeMorning: totals.morningRendered,
    totalRenderedTimeMorningTardiness: totals.morningTardiness,
    totalRenderedTimeAfternoon: totals.afternoonRendered,
    totalRenderedTimeAfternoonTardiness: totals.afternoonTardiness,
    totalRenderedHonorarium: totals.hnRendered,
    totalRenderedHonorariumTardiness: totals.hnTardiness,
    totalRenderedServiceCredit: totals.scRendered,
    totalRenderedServiceCreditTardiness: totals.scTardiness,
    totalRenderedOvertime: totals.otRendered,
    totalRenderedOvertimeTardiness: totals.otTardiness,
    overallRenderedOfficialTime: totals.overallRendered,
    overallRenderedOfficialTimeTardiness: totals.overallTardiness,
    daily_late_undertime: dailyRows,
    computation_module_type: 'DESIGNATED_40HRS',
  };
  };

  const putMergedOverall = async (mergedPayload, recordId) => {
    await axios.put(
      `${API_BASE_URL}/attendance/api/overall_attendance_record/${recordId}`,
      mergedPayload,
      getAuthHeaders(),
    );
    notifyModuleSaveSuccess(embedded, showSnackbar, 'Attendance summary updated from your choices.');
    navigateToOverallAttendanceSummary();
  };

  const saveOverallAttendance = async () => {
    if (warnUnresolvedHalfDays()) return;
    const record = buildOverallRecordPayload();
    setSaving(true);
    try {
      const dup = await axios.get(
        `${API_BASE_URL}/attendance/api/overall_attendance_record`,
        {
          params: { personID: employeeNumber, startDate, endDate },
          ...getAuthHeaders(),
        },
      );
      const existingList = dup.data?.data || [];
      const { action, existing } = classifyOverallSave(existingList, startDate, endDate, record);
      if (action === 'fill-stub' && existing?.id) {
        await axios.put(`${API_BASE_URL}/attendance/api/overall_attendance_record/${existing.id}`, record, getAuthHeaders());
        notifyModuleSaveSuccess(embedded, showSnackbar, 'Attendance summary saved.');
        await persistDailyLateUndertimeFromModule({
          personID: employeeNumber,
          startDate,
          endDate,
          moduleType: 'DESIGNATED_40HRS',
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
        showModal(
          'Duplicate attendance summary',
          `A summary for employee ${employeeNumber} (${startDate} to ${endDate}) already exists and matches these totals.\n\nNothing new will be saved. You can continue to Attendance Summary to review or use payroll routing.`,
          'info',
          () => {
            closeModal();
            if (warnUnresolvedHalfDays()) return;
            navigateToOverallAttendanceSummary();
          },
          true,
          'Continue to summary',
        );
        return;
      }
      if (action === 'auto-update' && existing?.id) {
        await axios.put(`${API_BASE_URL}/attendance/api/overall_attendance_record/${existing.id}`, record, getAuthHeaders());
        notifyModuleSaveSuccess(embedded, showSnackbar, 'Attendance summary updated.');
        await persistDailyLateUndertimeFromModule({
          personID: employeeNumber,
          startDate,
          endDate,
          moduleType: 'DESIGNATED_40HRS',
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
      showModal(
        'Verification Failed',
        'Could not verify existing records. Saving has been aborted.\n\nPlease try again or contact your administrator.',
        'error',
      );
      return;
    } finally {
      setSaving(false);
    }

    setSaving(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/overall_attendance`,
        record,
        getAuthHeaders(),
      );
      notifyModuleSaveSuccess(
        embedded,
        showSnackbar,
        response.data.message || 'Attendance record saved successfully!',
      );
      await persistDailyLateUndertimeFromModule({
        personID: employeeNumber,
        startDate,
        endDate,
        moduleType: 'DESIGNATED_40HRS',
        rows: record.daily_late_undertime,
        halfDayDates: record.halfDayDates,
        half_day_review: record.half_day_review,
      });
      navigateToOverallAttendanceSummary();
    } catch (err) {
      console.error('Error saving overall attendance:', err);
      showSnackbar('Failed to save attendance record.', 'error');
    } finally {
      setSaving(false);
    }
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
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  });

  const embeddedSeededRef = useRef(false);
  useEffect(() => {
    if (!embedded || !initialContext || embeddedSeededRef.current) return;
    embeddedSeededRef.current = true;
    seedEmbeddedModuleContext({
      initialContext,
      setEmployeeNumber,
      setEmployeeDisplayName,
      setStartDate,
      setEndDate,
      setSelectedYear,
      setSelectedMonth,
    });
    setTimeout(() => {
      handleSubmitRef.current?.();
    }, 350);
  }, [embedded, initialContext]);

  // Hub Modification save bumps refreshEpoch → remount + reload latest punches.
  const lastRefreshEpochRef = useRef(refreshEpoch);
  useEffect(() => {
    if (!embedded) return;
    if (refreshEpoch === lastRefreshEpochRef.current) return;
    lastRefreshEpochRef.current = refreshEpoch;
    if (!employeeNumber || !startDate || !endDate) return;
    setTimeout(() => {
      handleSubmitRef.current?.();
    }, 50);
  }, [embedded, refreshEpoch, employeeNumber, startDate, endDate]);

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
  } = useAttendanceWorkflow('faculty_designated', {
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
    {
      personId: employeeNumber,
      startDate,
      endDate,
      requireDateRange: true,
      matchMode: 'strict',
    },
  );

  useAttendancePageScroll(loading, attendanceData.length > 0);

  const handleCompareClose = () => {
    setCompareOpen(false);
    setPendingSavedOverall(null);
    setPendingProposedOverall(null);
  };
  const handleCompareConfirm = async (choices) => {
    if (!pendingSavedOverall?.id || !pendingProposedOverall) {
      handleCompareClose();
      return;
    }
    setCompareOpen(false);
    setSaving(true);
    try {
      const merged = mergeOverallPayload({
        savedRow: pendingSavedOverall,
        proposed: pendingProposedOverall,
        choices,
        personID: employeeNumber,
        startDate,
        endDate,
      });
      await putMergedOverall(merged, pendingSavedOverall.id);
      await persistDailyLateUndertimeFromModule({
        personID: employeeNumber,
        startDate,
        endDate,
        moduleType: 'DESIGNATED_40HRS',
        rows: merged.daily_late_undertime ?? pendingProposedOverall.daily_late_undertime,
        halfDayDates: merged.halfDayDates,
        half_day_review: merged.half_day_review,
      });
    } catch (err) {
      console.error('Error updating overall attendance:', err);
      showSnackbar(
        err.response?.data?.message || 'Failed to update attendance record.',
        'error',
      );
    } finally {
      setSaving(false);
      setPendingSavedOverall(null);
      setPendingProposedOverall(null);
    }
  };

  const handleMonthClick = (monthIndex) => {
    const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const end = new Date(Date.UTC(selectedYear, monthIndex + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex);
  };

  const handleClearFilters = () => {
    setEmployeeNumber('');
    setEmployeeDisplayName('');
    setEmployeeSearchQuery('');
    setStartDate('');
    setEndDate('');
    setAttendanceData([]);
    setError('');
    setSelectedMonth(null);
    setTardinessOverrides({});
    setHalfDayReviewByDate({});
    setSuspensionByDate({});
    setLeaveByDate({});
    setHolidayByDate({});
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  if (pageLoading || accessLoading) return <AttendanceDesignatedWireframe />;
  if (hasAccess === false)
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Attendance Module for Faculty (40 hours/Designated). Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );

  // ─────────────────────────────────────────────────────────────────────────
  // COLUMN VISIBILITY
  // Single flat header row. Collapsed groups render ONE narrow placeholder
  // cell (the leader cell). Expanded groups render all member columns.
  // ─────────────────────────────────────────────────────────────────────────
  const allColumns = TAB_COLUMNS[activeTab];
  const curCollapsed = collapsedGroups[activeTab] || {};

  const columnSlots = allColumns.reduce((acc, col) => {
    const g = col.colGroup;
    if (!g) {
      acc.push({ col, isCollapsedPlaceholder: false });
      return acc;
    }
    const collapsed = !!curCollapsed[g];
    if (collapsed) {
      if (col.isGroupLeader) acc.push({ col, isCollapsedPlaceholder: true });
    } else {
      acc.push({ col, isCollapsedPlaceholder: false });
    }
    return acc;
  }, []);

  // ── Single-row table head ─────────────────────────────────────────────
  const buildTableHead = () => (
    <TableHead>
      <TableRow>
        {columnSlots.map(({ col, isCollapsedPlaceholder }) => {
          const g = col.colGroup;
          const groupLabel = g ? COL_GROUP_META[g]?.label || g : null;

          if (isCollapsedPlaceholder) {
            return (
              <TableCell
                key={col.key + '_ph'}
                onClick={() => toggleColGroup(activeTab, g)}
                sx={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 3,
                  bgcolor: '#b07070',
                  px: 0.75,
                  py: 1,
                  minWidth: 36,
                  width: 36,
                  maxWidth: 36,
                  cursor: 'pointer',
                  textAlign: 'center',
                  borderBottom: `2px solid ${T.accentBorder}`,
                  borderRight: `1px solid rgba(255,255,255,0.2)`,
                  verticalAlign: 'middle',
                  '&:hover': { bgcolor: T.accentMid },
                  transition: 'background-color 0.15s',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.3,
                  }}
                >
                  <UnfoldMore sx={{ fontSize: 13, color: '#fff' }} />
                  <Typography
                    sx={{
                      fontSize: '0.52rem',
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.9)',
                      writingMode: 'vertical-rl',
                      textOrientation: 'mixed',
                      transform: 'rotate(180deg)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      maxHeight: 80,
                      overflow: 'hidden',
                    }}
                  >
                    {groupLabel}
                  </Typography>
                </Box>
              </TableCell>
            );
          }

          const isLeader = col.isGroupLeader && g && !curCollapsed[g];
          const halfDayTotalCol = halfDayTotalColumnVariant(col.key);
          return (
            <TableCell
              key={col.key + '_h'}
              sx={{
                position: 'sticky',
                top: 0,
                zIndex: 3,
                bgcolor: T.accent,
                fontWeight: 700,
                fontSize: '0.65rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: '#fff',
                textAlign: 'center',
                px: 1.5,
                pt: isLeader ? 0.5 : 1,
                pb: 1,
                minWidth: col.minWidth || 80,
                borderBottom: `2px solid ${T.accentBorder}`,
                borderRight: `1px solid rgba(255,255,255,0.15)`,
                whiteSpace: halfDayTotalCol ? 'normal' : 'nowrap',
                verticalAlign: 'bottom',
              }}
            >
              {isLeader && (
                <Box
                  onClick={() => toggleColGroup(activeTab, g)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.4,
                    mb: 0.6,
                    cursor: 'pointer',
                    px: 0.75,
                    py: 0.2,
                    borderRadius: '4px',
                    bgcolor: 'rgba(255,255,255,0.14)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    transition: 'background-color 0.15s',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.24)' },
                  }}
                >
                  <UnfoldLess
                    sx={{ fontSize: 10, color: 'rgba(255,255,255,0.85)' }}
                  />
                  <Typography
                    sx={{
                      fontSize: '0.57rem',
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.9)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {groupLabel} · hide
                  </Typography>
                </Box>
              )}
              <HalfDayTotalColumnHeader label={col.label} colKey={col.key} />
            </TableCell>
          );
        })}
      </TableRow>
    </TableHead>
  );

  // ── Cell builder ──────────────────────────────────────────────────────
  const buildCell = (content, group, isEven) => (
    <TableCell
      sx={{
        borderBottom: `1px solid ${T.divider}`,
        borderRight: `1px solid ${T.divider}`,
        px: 1.5,
        py: 0.9,
        whiteSpace: 'nowrap',
        textAlign: 'center',
        color: group === 'official' ? T.faint : T.text,
        fontWeight: group === 'official' ? 400 : 500,
        fontSize: group === 'official' ? '0.75rem' : '0.8rem',
        fontFamily: T.recordFont,
        bgcolor: isEven ? '#fff' : T.rowOdd,
        transition: 'background-color 0.12s',
        'tr:hover &': { bgcolor: `${T.rowHover} !important` },
      }}
    >
      {typeof content === 'string'
        ? normalizeBadHhMmSsDisplay(content)
        : content}
    </TableCell>
  );

  // ── Collapsed placeholder body cell ───────────────────────────────────
  const buildCollapsedCell = (isEven) => (
    <TableCell
      sx={{
        minWidth: 36,
        width: 36,
        maxWidth: 36,
        bgcolor: isEven ? 'rgba(109,35,35,0.03)' : 'rgba(109,35,35,0.06)',
        borderBottom: `1px solid ${T.divider}`,
        borderRight: `1px solid ${T.divider}`,
        p: 0,
      }}
    />
  );

  // ── Totals row ────────────────────────────────────────────────────────
  /** @param {{ renderedColKey?: string, tardColKey?: string }} [opts] — pin totals to visible columns when groups are expanded. */
  const renderTotalsRow = (label, renderedVal, tardinessVal, opts = {}) => {
    const { renderedColKey, tardColKey } = opts;
    const renderedKeys = columnSlots
      .filter((s) => !s.isCollapsedPlaceholder && s.col.group === 'calc')
      .map((s) => s.col.key);
    const tardinessKeys = columnSlots
      .filter((s) => !s.isCollapsedPlaceholder && s.col.group === 'tard')
      .map((s) => s.col.key);
    const nonCalcCount = columnSlots.filter(
      (s) =>
        s.isCollapsedPlaceholder ||
        (s.col.group !== 'calc' && s.col.group !== 'tard'),
    ).length;

    const targetRenderedKey =
      renderedColKey || renderedKeys[renderedKeys.length - 1];
    const targetTardKey = tardColKey || tardinessKeys[tardinessKeys.length - 1];

    return (
      <TableRow
        sx={{ bgcolor: '#fafafa', borderTop: `2px solid ${T.accentBorder}` }}
      >
        {columnSlots.map(({ col, isCollapsedPlaceholder: isCp }, ci) => {
          if (ci === 0)
            return (
              <TableCell
                key={col.key + '_tl'}
                colSpan={nonCalcCount}
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: T.faint,
                  textAlign: 'right',
                  pr: 2.5,
                  py: 1.25,
                  borderBottom: 'none',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {label}
              </TableCell>
            );
          if (ci < nonCalcCount) return null;
          if (isCp)
            return (
              <TableCell
                key={col.key + '_tcp'}
                sx={{
                  borderBottom: 'none',
                  bgcolor: '#fafafa',
                  minWidth: 36,
                  width: 36,
                  maxWidth: 36,
                }}
              />
            );
          const showRendered =
            col.group === 'calc' &&
            targetRenderedKey &&
            col.key === targetRenderedKey;
          const showTardiness =
            col.group === 'tard' && targetTardKey && col.key === targetTardKey;
          if (showRendered)
            return (
              <TableCell
                key={col.key + '_tr'}
                sx={{
                  fontFamily: T.recordFont,
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  textAlign: 'center',
                  py: 1.25,
                  borderBottom: 'none',
                  color: T.rendered.color,
                  bgcolor: T.rendered.bg,
                }}
              >
                {renderedVal || ZERO_HM}
              </TableCell>
            );
          if (showTardiness)
            return (
              <TableCell
                key={col.key + '_tt'}
                sx={{
                  fontFamily: T.recordFont,
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  textAlign: 'center',
                  py: 1.25,
                  borderBottom: 'none',
                  color: T.tardiness.color,
                  bgcolor: T.tardiness.bg,
                }}
              >
                {tardinessVal || ZERO_HM}
              </TableCell>
            );
          return (
            <TableCell
              key={col.key + '_td'}
              sx={{
                borderBottom: 'none',
                bgcolor: '#fafafa',
                textAlign: 'center',
                color: T.faint,
                fontSize: '0.75rem',
              }}
            >
              —
            </TableCell>
          );
        })}
      </TableRow>
    );
  };

  // Legacy helpers kept for compatibility (not directly used in render below)
  const buildGroupSpans = (cols) => {
    const groups = [];
    cols.forEach((col) => {
      const last = groups[groups.length - 1];
      if (last && last.group === col.group && !col.dividerBefore) {
        last.span++;
      } else {
        groups.push({
          label: col.group,
          span: 1,
          group: col.group,
          dividerBefore: col.dividerBefore,
        });
      }
    });
    const groupLabels = {
      meta: '',
      actual: 'Employee Device Records',
      official: 'Official Schedule',
      calc: 'Rendered',
      tard: 'Tardiness',
    };
    return groups.map((g) => ({ ...g, label: groupLabels[g.group] || '' }));
  };
  const hBg = (g) =>
    g === 'actual'
      ? alpha(T.accent, 0.12)
      : g === 'official'
        ? alpha(T.accent, 0.05)
        : g === 'calc'
          ? 'rgba(21,128,61,0.09)'
          : g === 'tard'
            ? 'rgba(153,27,27,0.09)'
            : alpha(T.accent, 0.03);
  const hBg2 = (g) =>
    g === 'actual'
      ? alpha(T.accent, 0.08)
      : g === 'official'
        ? alpha(T.accent, 0.03)
        : g === 'calc'
          ? 'rgba(21,128,61,0.06)'
          : g === 'tard'
            ? 'rgba(153,27,27,0.06)'
            : alpha(T.accent, 0.02);
  const buildTwoRowHead = (cols) => {
    const spans = buildGroupSpans(cols);
    return (
      <TableHead>
        <TableRow>
          {spans.map(({ label, span, group, dividerBefore }, gi) => (
            <TableCell
              key={gi}
              colSpan={span}
              sx={{
                textAlign: 'center',
                fontWeight: 700,
                fontSize: '0.62rem',
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                py: 0.85,
                px: 1.75,
                whiteSpace: 'nowrap',
                position: 'sticky',
                top: 0,
                zIndex: 3,
                borderBottom: `1px solid ${T.accentBorder}`,
                borderLeft: dividerBefore
                  ? `2px solid ${alpha(T.accent, 0.3)}`
                  : 'none',
                bgcolor: hBg(group),
                color:
                  group === 'actual'
                    ? T.accent
                    : group === 'calc'
                      ? '#166534'
                      : group === 'tard'
                        ? '#991b1b'
                        : 'transparent',
              }}
            >
              {label}
            </TableCell>
          ))}
        </TableRow>
        <TableRow>
          {cols.map(({ label, minWidth, group, dividerBefore }) => (
            <TableCell
              key={label}
              sx={{
                minWidth: minWidth || 120,
                textAlign: 'center',
                position: 'sticky',
                top: 32,
                zIndex: 2,
                fontSize: '0.65rem',
                fontWeight: 700,
                py: 0.85,
                px: 1.75,
                whiteSpace: 'nowrap',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                borderBottom: `2px solid ${alpha(T.accent, 0.25)}`,
                borderLeft: dividerBefore
                  ? `2px solid ${alpha(T.accent, 0.3)}`
                  : 'none',
                color: '#fff',
                background:
                  group === 'actual'
                    ? T.accent
                    : group === 'calc'
                      ? '#166534'
                      : group === 'tard'
                        ? '#991b1b'
                        : group === 'official'
                          ? T.accentMid
                          : T.accentDark,
              }}
            >
              {label}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
    );
  };

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <Fade in timeout={400}>
      <Box
        sx={embedded ? ATTENDANCE_EMBEDDED_ROOT_SX : {
          py: { xs: 1, md: 2 },
          mt: { xs: 0, md: -2 },
          mb: 0,
          pb: ATTENDANCE_PAGE_BOTTOM_PAD,
          width: '100vw',
          maxWidth: '100%',
          position: 'relative',
          left: '53%',
          transform: 'translateX(-51%)',
          px: { xs: 2, sm: 3, md: 6 },
        }}
      >
        <style>{`${ATTENDANCE_PAGE_SCROLL_CSS}${shimmerKf}`}</style>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            variant="filled"
            sx={{
              width: '100%',
              fontWeight: 600,
              backgroundColor:
                snackbar.severity === 'success' ? '#4caf50' : undefined,
              color: snackbar.severity === 'success' ? '#ffffff' : undefined,
              '& .MuiAlert-icon': {
                color: snackbar.severity === 'success' ? '#ffffff' : undefined,
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>{snackbar.message}</span>
              {snackbar.open && snackbarCountdown > 0 && (
                <Chip
                  label={`${snackbarCountdown}s`}
                  size="small"
                  sx={{
                    backgroundColor:
                      snackbar.severity === 'success'
                        ? 'rgba(255,255,255,0.3)'
                        : undefined,
                    color:
                      snackbar.severity === 'success' ? '#ffffff' : undefined,
                    fontWeight: 700,
                  }}
                />
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
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 900, color: T.accent, lineHeight: 1.15 }}>Designated Computation</Typography>
                <Typography sx={{ fontSize: '0.68rem', color: T.accentMid, fontWeight: 600 }}>Review tardiness, then Save to Summary</Typography>
              </Box>
            </Box>
            {typeof onClose === 'function' && (
              <IconButton onClick={onClose} size="small" sx={{ bgcolor: T.accent, color: '#fff', '&:hover': { bgcolor: T.accentDark } }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            )}
          </Box>
        ) : (
        /* Page Header */
        <SectionCard sx={{ mb: 2 }}>
          <Box
            sx={{
              px: 4,
              py: 3,
              background: 'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle,rgba(109,35,35,0.10) 0%,transparent 70%)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: -30,
                left: '30%',
                width: 150,
                height: 150,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)',
              }}
            />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2.5,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <WorkHistory sx={{ fontSize: 30, color: T.accent }} />
              <Box>
                <Typography
                  sx={{
                    fontSize: '1.2rem',
                    fontWeight: 900,
                    color: T.accent,
                    lineHeight: 1.2,
                    mb: 0.25,
                  }}
                >
                  Attendance Records (40hrs / Designated)
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    color: T.accentMid,
                    fontWeight: 600,
                  }}
                >
                  40hrs · Designated Faculty · Generate and review attendance
                  records
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <AttendanceWorkflowNav
                inline
                prevStep={prevStep}
                nextStep={nextStep}
                onPrevious={goPrevious}
                onNext={handleWorkflowNext}
              />
              <Box
                sx={{
                  px: 2,
                  py: 0.6,
                  borderRadius: 5,
                  bgcolor: alpha('#4caf50', 0.12),
                  border: '1px solid rgba(76,175,80,0.25)',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.72rem',
                    color: '#2e7d32',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <CheckCircleIcon sx={{ fontSize: 12 }} /> 40hrs | Designated
                </Typography>
              </Box>
              <button
                onClick={handleSubmit}
                disabled={!employeeNumber || !startDate || !endDate}
                style={{
                  background: alpha(T.accent, 0.08),
                  border: `1px solid ${T.accentBorder}`,
                  borderRadius: '8px',
                  padding: '7px 10px',
                  cursor:
                    !employeeNumber || !startDate || !endDate
                      ? 'not-allowed'
                      : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: T.accent,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  opacity: !employeeNumber || !startDate || !endDate ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = alpha(T.accent, 0.14);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = alpha(T.accent, 0.08);
                }}
              >
                <Refresh sx={{ fontSize: 15 }} /> Refresh
              </button>
            </Box>
          </Box>
        </SectionCard>
        )}

        <Collapse in={!!error}>
          <Alert
            severity="error"
            onClose={() => setError('')}
            sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.82rem' }}
          >
            {error}
          </Alert>
        </Collapse>

        {/* Controls — hidden in DTR sliding drawer */}
        {!embedded && (
        <SectionCard sx={{ mb: 2 }}>
          <PanelHeader icon={FilterList} title="Filter Attendance Records" />
          <Box sx={{ px: 2.5, pt: 2, pb: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <Typography
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: T.accent,
                    mb: 0.6,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Employee Number
                </Typography>
                <EmployeeSearchField
                  value={employeeNumber}
                  displayName={employeeDisplayName}
                  themeT={T}
                  onSearchQueryChange={setEmployeeSearchQuery}
                  onSelectEmployeeNumber={setEmployeeNumber}
                  onSelectEmployeeName={setEmployeeDisplayName}
                />
              </Box>
              {[
                {
                  label: 'Start Date',
                  value: startDate,
                  onChange: (e) => setStartDate(e.target.value),
                  type: 'date',
                },
                {
                  label: 'End Date',
                  value: endDate,
                  onChange: (e) => setEndDate(e.target.value),
                  type: 'date',
                },
              ].map(({ label, value, onChange, type }) => (
                <Box key={label} sx={{ flex: 1, minWidth: 160 }}>
                  <Typography
                    sx={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: T.accent,
                      mb: 0.6,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {label}
                  </Typography>
                  <NativeInput
                    type={type}
                    value={value}
                    onChange={onChange}
                    icon={<CalendarToday sx={{ fontSize: 15 }} />}
                  />
                </Box>
              ))}
            </Box>
            <Box sx={{ height: 1, bgcolor: T.divider, mb: 2 }} />
            <Typography
              sx={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: T.accent,
                mb: 1.25,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
              }}
            >
              <FilterList sx={{ fontSize: 13 }} /> Quick Date Selection
            </Typography>
            <Box
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: `2px dashed ${T.accentBorder}`,
                bgcolor: T.accentFaint,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                  gap: 2,
                  mb: 2,
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: T.accent,
                      mb: 0.3,
                    }}
                  >
                    Select Entire Month
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>
                    Choose a year, then click any month to set the date range
                  </Typography>
                </Box>
                <FormControl sx={{ minWidth: 130 }} size="small">
                  <InputLabel sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                    Year
                  </InputLabel>
                  <Select
                    value={selectedYear}
                    label="Year"
                    onChange={(e) => {
                      setSelectedYear(e.target.value);
                      setSelectedMonth(null);
                      showSnackbar(
                        'Year changed — please click a month to load records.',
                        'info',
                      );
                    }}
                    sx={{
                      bgcolor: '#fff',
                      borderRadius: 2,
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: T.accentBorder,
                      },
                    }}
                  >
                    {yearOptions.map((y) => (
                      <MenuItem key={y} value={y} sx={{ fontSize: '0.85rem' }}>
                        {y}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0.75,
                  justifyContent: 'center',
                }}
              >
                {months.map((month, index) => {
                  const sel = selectedMonth === index;
                  return (
                    <button
                      key={month}
                      onClick={() => handleMonthClick(index)}
                      style={{
                        background: sel ? T.accent : '#fff',
                        border: `1px solid ${sel ? T.accent : T.accentBorder}`,
                        borderRadius: '6px',
                        padding: '7px 14px',
                        cursor: 'pointer',
                        color: sel ? '#fff' : T.accent,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        fontFamily: 'inherit',
                        transition: 'all 0.15s ease',
                        boxShadow: sel
                          ? `0 2px 8px ${alpha(T.accent, 0.25)}`
                          : 'none',
                        letterSpacing: '0.04em',
                      }}
                      onMouseEnter={(e) => {
                        if (!sel) {
                          e.currentTarget.style.backgroundColor = T.accentFaint;
                          e.currentTarget.style.borderColor = T.accent;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!sel) {
                          e.currentTarget.style.backgroundColor = '#fff';
                          e.currentTarget.style.borderColor = T.accentBorder;
                        }
                      }}
                    >
                      {month}
                    </button>
                  );
                })}
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mt: 2,
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <RowBtn
                icon={<Clear sx={{ fontSize: 13 }} />}
                label="Clear All Filters"
                color="#C62828"
                hoverBg="rgba(198,40,40,0.08)"
                onClick={handleClearFilters}
              />
              <RowBtn
                icon={<Search sx={{ fontSize: 13 }} />}
                label="Search Records"
                color={T.accent}
                hoverBg={T.accentFaint}
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
                    <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>
                      {startDate} → {endDate}
                    </Typography>
                    <Box
                      sx={{
                        px: 1.5,
                        py: 0.3,
                        borderRadius: 5,
                        bgcolor: alpha(T.accent, 0.1),
                        border: `1px solid ${alpha(T.accent, 0.18)}`,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '0.72rem',
                          color: T.accent,
                          fontWeight: 700,
                        }}
                      >
                        {attendanceData.length}{' '}
                        {attendanceData.length === 1 ? 'record' : 'records'}
                      </Typography>
                    </Box>
                  </Box>
                }
              />

              {/* Tab switcher */}
              <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
                <Box
                  sx={{
                    display: 'flex',
                    border: `1px solid ${T.accentBorder}`,
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  {VIEW_TABS.map(({ key, label, icon }, i, arr) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      style={{
                        flex: 1,
                        border: 'none',
                        borderRight:
                          i < arr.length - 1
                            ? `1px solid ${T.accentBorder}`
                            : 'none',
                        borderRadius: 0,
                        padding: '8px 12px',
                        cursor: 'pointer',
                        background:
                          activeTab === key ? T.accent : 'transparent',
                        color: activeTab === key ? '#fff' : T.accent,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (activeTab !== key)
                          e.currentTarget.style.backgroundColor = T.accentFaint;
                      }}
                      onMouseLeave={(e) => {
                        if (activeTab !== key)
                          e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </Box>
              </Box>

              {/* Table */}
              <Box sx={{ px: 2.5, pb: 2.5 }}>
                <Box
                  sx={{
                    position: 'relative',
                    borderRadius: '8px',
                    border: `1px solid ${T.accentBorder}`,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      overflowX: 'auto',
                      overflowY: 'auto',
                      maxHeight: 500,
                      scrollbarWidth: 'thin',
                      '&::-webkit-scrollbar': { height: 6, width: 6 },
                      '&::-webkit-scrollbar-track': {
                        background: T.accentFaint,
                        borderRadius: 4,
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: T.accentMid,
                        borderRadius: 4,
                      },
                    }}
                  >
                    <Table
                      sx={{
                        minWidth: columnSlots.reduce(
                          (s, { col, isCollapsedPlaceholder: cp }) =>
                            s + (cp ? 36 : col.minWidth || 100),
                          0,
                        ),
                        borderCollapse: 'collapse',
                      }}
                    >
                      {buildTableHead()}
                      <TableBody>
                        {attendanceData.map((row, index) => {
                          const statusLabel = getStatusLabelForDate(row.date);
                          const isFurlough = Boolean(statusLabel);
                          const isEven = index % 2 === 0;
                          const rowIsAbsent = isAbsentAttendanceRow(row);
                          const halfUi =
                            !rowIsAbsent && !isFurlough
                              ? getHalfDayUiStatus(row)
                              : null;
                          const halfDayChrome = halfUi
                            ? getHalfDayReviewRowChrome(halfUi, T)
                            : null;
                          const statusRowBorder =
                            !rowIsAbsent && !halfDayChrome && statusLabel
                              ? {
                                  'WORK SUSPENDED': `3px solid ${T.suspended.border}`,
                                  HOLIDAY: `3px solid ${T.holiday.border}`,
                                  'ON LEAVE': `3px solid ${T.leave.border}`,
                                }[statusLabel] || null
                              : null;
                          const statusRowBg =
                            !rowIsAbsent && !halfDayChrome && statusLabel
                              ? {
                                  'WORK SUSPENDED': T.suspended.bg,
                                  HOLIDAY: T.holiday.bg,
                                  'ON LEAVE': T.leave.bg,
                                }[statusLabel] || null
                              : null;
                          const rowBg = rowIsAbsent
                            ? alpha('#b71c1c', 0.08)
                            : halfDayChrome?.rowBg || statusRowBg;
                          const rowBorder = rowIsAbsent
                            ? `3px solid ${alpha('#b71c1c', 0.55)}`
                            : halfDayChrome?.rowBorder ||
                              statusRowBorder ||
                              '3px solid transparent';

                          return (
                            <TableRow
                              key={row.date || index}
                              sx={{
                                '&:hover td': {
                                  bgcolor: `${rowBg || T.rowHover} !important`,
                                },
                                ...(rowBg
                                  ? {
                                      '& td': {
                                        bgcolor: `${rowBg} !important`,
                                      },
                                    }
                                  : {}),
                              }}
                            >
                              {columnSlots.map(
                                ({ col, isCollapsedPlaceholder: isCp }) => {
                                  if (isCp)
                                    return (
                                      <React.Fragment key={col.key + '_cp'}>
                                        {buildCollapsedCell(isEven)}
                                      </React.Fragment>
                                    );

                                  if (col.key === 'date') {
                                    return (
                                      <TableCell
                                        key={col.key}
                                        sx={{
                                          fontSize: '0.8rem',
                                          fontWeight: 600,
                                          color: T.text,
                                          bgcolor: isEven ? '#fff' : T.rowOdd,
                                          borderBottom: `1px solid ${T.divider}`,
                                          borderLeft: rowBorder,
                                          borderRight: `1px solid ${T.divider}`,
                                          px: 1.5,
                                          py: 0.9,
                                          whiteSpace: 'nowrap',
                                          textAlign: 'left',
                                          transition: 'background-color 0.12s',
                                        }}
                                      >
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.3 }}>
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
                                          {statusLabel && <StatusChip label={statusLabel} />}
                                          {!statusLabel && rowIsAbsent && (
                                            <Chip size="small" label="Absent" sx={{ fontWeight: 800, fontSize: '0.6rem', height: 16, mt: 0.3, bgcolor: alpha('#b71c1c', 0.12), color: '#b71c1c', border: `1px solid ${alpha('#b71c1c', 0.35)}` }} />
                                          )}
                                          {!statusLabel && !rowIsAbsent && halfUi === 'suggested' && (
                                            <Chip size="small" label="Half day — for review" sx={{ fontWeight: 800, fontSize: '0.58rem', height: 16, mt: 0.3, bgcolor: T.halfDay.bg, color: T.halfDay.color, border: `1px solid ${T.halfDay.border}` }} />
                                          )}
                                          {!statusLabel && !rowIsAbsent && halfUi === 'approved' && (
                                            <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: alpha(T.halfDay.color, 0.6), fontStyle: 'italic', mt: 0.25, lineHeight: 1.2 }}>
                                              Half day
                                            </Typography>
                                          )}
                                          {!statusLabel && !rowIsAbsent && halfUi === 'rejected' && (
                                            <Chip size="small" label="Not half day" sx={{ fontWeight: 800, fontSize: '0.58rem', height: 16, mt: 0.3, bgcolor: alpha(T.accent, 0.1), color: T.accent, border: `1px solid ${T.accentBorder}` }} />
                                          )}
                                        </Box>
                                      </TableCell>
                                    );
                                  }

                                  if (col.key === 'day')
                                    return (
                                      <TableCell
                                        key={col.key}
                                        sx={{
                                          fontSize: '0.8rem',
                                          color: T.muted,
                                          bgcolor: isEven ? '#fff' : T.rowOdd,
                                          borderBottom: `1px solid ${T.divider}`,
                                          borderRight: `1px solid ${T.divider}`,
                                          px: 1.5,
                                          py: 0.9,
                                          textAlign: 'center',
                                          transition: 'background-color 0.12s',
                                        }}
                                      >
                                        {row.day}
                                      </TableCell>
                                    );

                                  if (
                                    activeTab === 'regular' &&
                                    (col.key === '_morningRendered' ||
                                      col.key === '_afternoonRendered')
                                  ) {
                                    const part =
                                      col.key === '_morningRendered'
                                        ? 'morning'
                                        : 'afternoon';
                                    return (
                                      <EditableRenderedCell
                                        key={col.key}
                                        row={row}
                                        part={part}
                                        isFurlough={isFurlough}
                                        isEven={isEven}
                                        storedOverride={
                                          renderedOverrides[row.date]?.[part]
                                        }
                                        onCommit={(v) =>
                                          commitRenderedOverride(
                                            row.date,
                                            part,
                                            v,
                                          )
                                        }
                                        onInvalid={(msg) =>
                                          showSnackbar(msg, 'error')
                                        }
                                      />
                                    );
                                  }

                                  if (
                                    activeTab === 'regular' &&
                                    (col.key === '_morningTardiness' ||
                                      col.key === '_afternoonTardiness')
                                  ) {
                                    const part =
                                      col.key === '_morningTardiness'
                                        ? 'morning'
                                        : 'afternoon';
                                    return (
                                      <EditableTardinessCell
                                        key={col.key}
                                        row={row}
                                        part={part}
                                        isFurlough={isFurlough}
                                        isEven={isEven}
                                        storedOverride={
                                          tardinessOverrides[row.date]?.[part]
                                        }
                                        onCommit={(v) =>
                                          commitTardinessOverride(
                                            row.date,
                                            part,
                                            v,
                                          )
                                        }
                                        onInvalid={(msg) =>
                                          showSnackbar(msg, 'error')
                                        }
                                      />
                                    );
                                  }

                                  if (
                                    activeTab === 'regular' &&
                                    halfDayTotalColumnVariant(col.key) &&
                                    halfUi
                                  ) {
                                    const reviewEntryForNote =
                                      halfDayReviewByDate?.[normalizeReviewDate(row.date)];
                                    const hrNote =
                                      reviewEntryForNote?.note ||
                                      reviewEntryForNote?.hrNote ||
                                      null;
                                    const metricVal = normalizeBadHhMmSsDisplay(
                                      getDisplayedCellValue(
                                        row,
                                        col.key,
                                        isFurlough,
                                        activeTab === 'regular'
                                          ? tardinessOverrides
                                          : null,
                                        renderedOverrides,
                                        halfDayReviewByDate,
                                      ),
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
                                          'tr:hover &': {
                                            bgcolor: `${T.rowHover} !important`,
                                          },
                                        }}
                                      >
                                        <HalfDayTotalCellContent
                                          value={metricVal}
                                          halfUi={halfUi}
                                          colKey={col.key}
                                          hrNote={hrNote}
                                          halfDayColor={T.halfDay?.color}
                                        />
                                      </TableCell>
                                    );
                                  }

                                  return (
                                    <React.Fragment key={col.key}>
                                      {buildCell(
                                        getDisplayedCellValue(
                                          row,
                                          col.key,
                                          isFurlough,
                                          activeTab === 'regular'
                                            ? tardinessOverrides
                                            : null,
                                          renderedOverrides,
                                          halfDayReviewByDate,
                                        ),
                                        col.group,
                                        isEven,
                                      )}
                                    </React.Fragment>
                                  );
                                },
                              )}
                            </TableRow>
                          );
                        })}

                        {/* Totals rows */}
                        {activeTab === 'regular' && (
                          <>
                            {renderTotalsRow(
                              `Morning total (${startDate} – ${endDate})`,
                              totals.morningRendered,
                              totals.morningTardiness,
                              {
                                renderedColKey: '_morningRendered',
                                tardColKey: '_morningTardiness',
                              },
                            )}
                            {renderTotalsRow(
                              `Afternoon total (${startDate} – ${endDate})`,
                              totals.afternoonRendered,
                              totals.afternoonTardiness,
                              {
                                renderedColKey: '_afternoonRendered',
                                tardColKey: '_afternoonTardiness',
                              },
                            )}
                            {/* Overall row */}
                            {(() => {
                              const calcSlots = columnSlots.filter(
                                (s) =>
                                  !s.isCollapsedPlaceholder &&
                                  (s.col.group === 'calc' ||
                                    s.col.group === 'tard'),
                              );
                              const nonCalcCnt =
                                columnSlots.length - calcSlots.length;
                              const visCalcKeys = calcSlots
                                .filter((x) => x.col.group === 'calc')
                                .map((x) => x.col.key);
                              const visTardKeys = calcSlots
                                .filter((x) => x.col.group === 'tard')
                                .map((x) => x.col.key);
                              const overallRenderedKey = visCalcKeys.includes(
                                '_totalRendered',
                              )
                                ? '_totalRendered'
                                : visCalcKeys.includes('_afternoonRendered')
                                  ? '_afternoonRendered'
                                  : visCalcKeys.includes('_morningRendered')
                                    ? '_morningRendered'
                                    : (visCalcKeys[visCalcKeys.length - 1] ??
                                      null);
                              const overallTardKey = visTardKeys.includes(
                                '_totalTardiness',
                              )
                                ? '_totalTardiness'
                                : (visTardKeys[visTardKeys.length - 1] ?? null);
                              const showRenderedInLabel = !overallRenderedKey;
                              const showTardInLabel = !overallTardKey;
                              return (
                                <TableRow
                                  sx={{
                                    bgcolor: '#fafafa',
                                    borderTop: `2px solid ${T.accent}`,
                                  }}
                                >
                                  <TableCell
                                    colSpan={nonCalcCnt}
                                    sx={{
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      color: T.accent,
                                      textAlign: 'right',
                                      pr: 2.5,
                                      py: 1.5,
                                      borderBottom: 'none',
                                      letterSpacing: '0.04em',
                                      textTransform: 'uppercase',
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-end',
                                        gap: 0.5,
                                      }}
                                    >
                                      <span>
                                        Overall rendered time ({startDate} –{' '}
                                        {endDate})
                                      </span>
                                      {(showRenderedInLabel ||
                                        showTardInLabel) && (
                                        <Box sx={{ textAlign: 'right' }}>
                                          {showRenderedInLabel && (
                                            <Typography
                                              sx={{
                                                fontFamily: T.recordFont,
                                                fontWeight: 900,
                                                fontSize: '0.88rem',
                                                color: T.rendered.color,
                                              }}
                                            >
                                              {(overallRenderedKey === '_totalRendered'
                                                ? totals.totalRendered
                                                : totals.overallRendered) ||
                                                ZERO_HM}{' '}
                                              <Typography
                                                component="span"
                                                sx={{
                                                  color: T.faint,
                                                  fontWeight: 600,
                                                  fontSize: '0.65rem',
                                                  textTransform: 'none',
                                                }}
                                              >
                                                rendered
                                              </Typography>
                                            </Typography>
                                          )}
                                          {showTardInLabel && (
                                            <Typography
                                              sx={{
                                                fontFamily: T.recordFont,
                                                fontWeight: 800,
                                                fontSize: '0.8rem',
                                                color: T.tardiness.color,
                                              }}
                                            >
                                              {formatTardinessAsDaysHoursWithHoursPerDay(
                                                totals.overallTardiness ||
                                                  ZERO_HM,
                                                officialHoursPerDay,
                                              )}{' '}
                                              <Typography
                                                component="span"
                                                sx={{
                                                  color: T.faint,
                                                  fontWeight: 600,
                                                  fontSize: '0.65rem',
                                                  textTransform: 'none',
                                                }}
                                              >
                                                (
                                                {totals.overallTardiness ||
                                                  ZERO_HM}
                                                )
                                              </Typography>
                                            </Typography>
                                          )}
                                        </Box>
                                      )}
                                    </Box>
                                  </TableCell>
                                  {columnSlots.slice(nonCalcCnt).map((s) => {
                                    if (s.isCollapsedPlaceholder)
                                      return (
                                        <TableCell
                                          key={s.col.key + '_ocp'}
                                          sx={{
                                            borderBottom: 'none',
                                            bgcolor: '#fafafa',
                                            minWidth: 36,
                                            width: 36,
                                            maxWidth: 36,
                                          }}
                                        />
                                      );
                                    const isOverallRendered =
                                      overallRenderedKey &&
                                      s.col.group === 'calc' &&
                                      s.col.key === overallRenderedKey;
                                    const isOverallTardiness =
                                      overallTardKey &&
                                      s.col.group === 'tard' &&
                                      s.col.key === overallTardKey;
                                    if (isOverallRendered)
                                      return (
                                        <TableCell
                                          key={s.col.key}
                                          sx={{
                                            fontFamily: T.recordFont,
                                            fontWeight: 900,
                                            fontSize: '0.95rem',
                                            textAlign: 'center',
                                            py: 1.5,
                                            borderBottom: 'none',
                                            color: T.rendered.color,
                                            bgcolor: T.rendered.bg,
                                          }}
                                        >
                                          {(overallRenderedKey === '_totalRendered'
                                            ? totals.totalRendered
                                            : totals.overallRendered) || ZERO_HM}
                                        </TableCell>
                                      );
                                    if (isOverallTardiness)
                                      return (
                                        <TableCell
                                          key={s.col.key}
                                          sx={{
                                            textAlign: 'center',
                                            py: 1.5,
                                            borderBottom: 'none',
                                            color: T.tardiness.color,
                                            bgcolor: T.tardiness.bg,
                                          }}
                                        >
                                          <Typography
                                            sx={{
                                              fontFamily: T.recordFont,
                                              fontWeight: 900,
                                              fontSize: '0.95rem',
                                            }}
                                          >
                                            {formatTardinessAsDaysHoursWithHoursPerDay(
                                              totals.overallTardiness ||
                                                ZERO_HM,
                                              officialHoursPerDay,
                                            )}
                                          </Typography>
                                          <Typography
                                            sx={{
                                              fontFamily: T.recordFont,
                                              fontWeight: 600,
                                              fontSize: '0.7rem',
                                              opacity: 0.55,
                                            }}
                                          >
                                            {totals.overallTardiness ||
                                              ZERO_HM}
                                          </Typography>
                                        </TableCell>
                                      );
                                    return (
                                      <TableCell
                                        key={s.col.key}
                                        sx={{
                                          borderBottom: 'none',
                                          bgcolor: '#fafafa',
                                          textAlign: 'center',
                                          color: T.faint,
                                        }}
                                      >
                                        —
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              );
                            })()}
                          </>
                        )}

                        {activeTab !== 'regular' &&
                          (() => {
                            const rendMap = {
                              honorarium: totals.hnRendered,
                              serviceCredit: totals.scRendered,
                              overtime: totals.otRendered,
                            };
                            const tardMap = {
                              honorarium: totals.hnTardiness,
                              serviceCredit: totals.scTardiness,
                              overtime: totals.otTardiness,
                            };
                            const keyMap = {
                              honorarium: {
                                renderedColKey: '_hnRendered',
                                tardColKey: '_hnTardiness',
                              },
                              serviceCredit: {
                                renderedColKey: '_scRendered',
                                tardColKey: '_scTardiness',
                              },
                              overtime: {
                                renderedColKey: '_otRendered',
                                tardColKey: '_otTardiness',
                              },
                            };
                            return renderTotalsRow(
                              `Overall rendered time (${startDate} – ${endDate})`,
                              rendMap[activeTab],
                              tardMap[activeTab],
                              keyMap[activeTab],
                            );
                          })()}
                      </TableBody>
                    </Table>
                  </Box>
                </Box>

                {/* Legend */}
                <Box
                  sx={{
                    pt: 1.5,
                    display: 'flex',
                    gap: 2,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  {[
                    {
                      swatch: {
                        bgcolor: T.holiday.bg,
                        border: `1px solid ${T.holiday.border}`,
                      },
                      label: 'Holiday',
                    },
                    {
                      swatch: {
                        bgcolor: T.leave.bg,
                        border: `1px solid ${T.leave.border}`,
                      },
                      label: 'On leave',
                    },
                    {
                      swatch: {
                        bgcolor: T.suspended.bg,
                        border: `1px solid ${T.suspended.border}`,
                      },
                      label: 'Work suspended',
                    },
                    {
                      swatch: {
                        bgcolor: alpha('#b71c1c', 0.08),
                        border: `1px solid ${alpha('#b71c1c', 0.55)}`,
                      },
                      label: 'Absent highlight',
                    },
                    {
                      swatch: {
                        bgcolor: T.halfDay.bg,
                        border: `1px solid ${T.halfDay.border}`,
                      },
                      label: 'Half day highlight',
                    },
                    {
                      swatch: {
                        bgcolor: T.halfDay.bg,
                        border: `1px solid ${T.halfDay.border}`,
                      },
                      label: 'Half day',
                    },
                    {
                      swatch: {
                        bgcolor: T.rendered.bg,
                        border: `1px solid ${T.rendered.border}`,
                      },
                      label: 'Rendered totals',
                    },
                    {
                      swatch: {
                        bgcolor: T.tardiness.bg,
                        border: `1px solid ${T.tardiness.border}`,
                      },
                      label: 'Tardiness totals',
                    },
                    {
                      swatch: {
                        bgcolor: 'rgba(109,35,35,0.08)',
                        border: `1px solid ${T.accentBorder}`,
                      },
                      label:
                        'Regular Time: AM/PM tardiness is system-calculated and editable (↻ restores system)',
                    },
                    {
                      swatch: {
                        bgcolor: '#b07070',
                        border: `1px solid ${T.accentBorder}`,
                      },
                      label:
                        'Group headers: click hide to collapse a column group, or the narrow strip to expand',
                    },
                  ].map((item, i) => (
                    <Box
                      key={i}
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}
                    >
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '2px',
                          ...item.swatch,
                        }}
                      />
                      <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>
                        {item.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </SectionCard>
          </Fade>
        )}

        <FloatingTotalsBar
          totals={totals}
          visible={attendanceData.length > 0}
          onSave={saveOverallAttendance}
          saving={saving}
          startDate={startDate}
          endDate={endDate}
          officialHoursPerDay={officialHoursPerDay}
        />

        <UnresolvedHalfDaysDialog
          dates={unresolvedDatesModal}
          onClose={() => setUnresolvedDatesModal(null)}
          themeT={T}
        />

        <StyledModal
          open={modal.open}
          onClose={closeModal}
          title={modal.title}
          message={modal.message}
          type={modal.type}
          onConfirm={modal.onConfirm}
          showCancel={modal.showCancel}
          confirmLabel={modal.confirmLabel}
        />

        <HalfDayReviewDialog
          open={Boolean(halfDayReviewDialog)}
          mode={halfDayReviewDialog?.mode}
          row={halfDayReviewDialog?.row}
          moduleType={MODULE_TYPES.DESIGNATED_40HRS}
          themeT={T}
          onClose={() => setHalfDayReviewDialog(null)}
          onConfirm={commitHalfDayReview}
        />

        <OverallAttendanceCompareModal
          open={compareOpen}
          onClose={handleCompareClose}
          onConfirm={handleCompareConfirm}
          savedRow={pendingSavedOverall}
          proposedRecord={pendingProposedOverall}
          fields={OVERALL_COMPARE_FIELD_META}
          mode="duplicate"
          currentModuleType="DESIGNATED_40HRS"
        />

        <Zoom in={showScrollTop}>
          <Fab
            size="small"
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 45,
              zIndex: 1000,
              bgcolor: T.accent,
              color: '#fff',
              '&:hover': { bgcolor: T.accentDark },
              boxShadow: `0 4px 14px ${alpha(T.accent, 0.35)}`,
            }}
            onClick={scrollToTop}
          >
            <KeyboardArrowUp />
          </Fab>
        </Zoom>
      </Box>
    </Fade>
  );
};


export default AttendanceModuleFacultyDesignated;