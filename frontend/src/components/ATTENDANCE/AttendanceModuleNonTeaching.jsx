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
  InputAdornment,
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
  UnfoldMore,
  UnfoldLess,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import useAttendanceWorkflow from '../../hooks/useAttendanceWorkflow';
import AttendanceWorkflowNav from './AttendanceWorkflowNav';
import { navigateAttendanceWorkflow } from '../../utils/attendanceWorkflow';
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
  computeReviewAwareAbsenceBuckets,
  getEffectiveTardinessFromReview,
  getEffectiveTardinessFromApproved,
  getRowHalfDayUiStatus,
  getRowTotalRenderedDisplay,
  getRowTotalTardinessDisplay,
  shouldZeroAmPmHalfDayColumns,
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
  computeOfficialAwareAbsenceAndLate,
  listAbsentDatesFromDailyRows,
  listHalfDayDatesFromDailyRows,
  parseOfficialTimeToSeconds,
  formatOfficialAttendanceSeconds,
  isExcludedAttendanceCalendarDate,
  isScheduledByOfficialTime,
  hasNoPunches,
  isNonTeachingHalfDayByPunches,
} from '../../utils/officialAttendanceFromDailyRows';
import {
  sumHmsDurationStrings,
  computeLateTotalTimeFromTardiness,
  computeOverallTardinessFromBuckets,
} from '../../utils/attendanceLateTotals';
import {
  postAttendanceDevicePreflightNoSync,
  fetchAttendanceCalendarMaps,
  getLeaveStatusLabelForDate,
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
  holiday:      { bg: 'rgba(245,124,0,0.10)', color: '#f57c00', border: 'rgba(245,124,0,0.35)' },
  leave:        { bg: 'rgba(46,125,50,0.10)',  color: '#2e7d32', border: 'rgba(46,125,50,0.35)' },
  suspended:    { bg: 'rgba(211,47,47,0.10)',  color: '#d32f2f', border: 'rgba(211,47,47,0.35)' },
  halfDay:      { bg: 'rgba(106,27,154,0.10)', color: '#6a1b9a', border: 'rgba(106,27,154,0.35)' },
  absent:       { bg: 'rgba(183,28,28,0.08)',  color: '#b71c1c', border: 'rgba(183,28,28,0.25)' },
  rendered:     { bg: 'rgba(27,94,32,0.08)',   color: '#1b5e20', border: 'rgba(27,94,32,0.25)' },
  tardiness:    { bg: 'rgba(183,28,28,0.08)',  color: '#b71c1c', border: 'rgba(183,28,28,0.25)' },
};

const formatTardinessAsDaysHours = (hhmmss) => {
  if (!hhmmss || hhmmss === '00:00:00') return '0m';
  const parts = String(hhmmss).split(':').map(Number);
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
// colGroup: collapse together; isGroupLeader on first column of each group.
const TAB_COLUMNS = {
  regular: [
    { label: 'Date',                   key: 'date',                 minWidth: 130, group: 'meta',     colGroup: null },
    { label: 'Day',                    key: 'day',                  minWidth: 80,  group: 'meta',     colGroup: null },
    { label: 'Time IN',                key: 'timeIN',               minWidth: 110, group: 'actual',   colGroup: 'morningDevice',        isGroupLeader: true },
    { label: 'Official Time IN',       key: 'officialTimeIN',       minWidth: 130, group: 'official', colGroup: 'morningOfficial',      isGroupLeader: true },
    { label: 'Breaktime IN',           key: 'breaktimeIN',          minWidth: 110, group: 'actual',   colGroup: 'breaktimeDevice',      isGroupLeader: true },
    { label: 'Official Breaktime IN',  key: 'officialBreaktimeIN',  minWidth: 130, group: 'official', colGroup: 'breaktimeOfficial',    isGroupLeader: true },
    { label: 'Breaktime OUT',          key: 'breaktimeOUT',         minWidth: 110, group: 'actual',   colGroup: 'afternoonBreakDevice', isGroupLeader: true },
    { label: 'Time OUT',               key: 'timeOUT',              minWidth: 110, group: 'actual',   colGroup: 'timeOutDevice',        isGroupLeader: true },
    { label: 'Official Breaktime OUT', key: 'officialBreaktimeOUT', minWidth: 130, group: 'official', colGroup: 'afternoonOfficial',    isGroupLeader: true },
    { label: 'Official Time OUT',      key: 'officialTimeOUT',      minWidth: 130, group: 'official', colGroup: 'afternoonOfficial' },
    { label: 'AM Rendered',            key: '_morningRendered',     minWidth: 110, group: 'calc',     colGroup: 'amRendered',           isGroupLeader: true },
    { label: 'AM Tardiness',           key: '_morningTardiness',    minWidth: 110, group: 'tard',     colGroup: 'amTard',               isGroupLeader: true },
    { label: 'PM Rendered',            key: '_afternoonRendered',   minWidth: 110, group: 'calc',     colGroup: 'pmRendered',           isGroupLeader: true },
    { label: 'PM Tardiness',           key: '_afternoonTardiness',  minWidth: 110, group: 'tard',     colGroup: 'pmTard',               isGroupLeader: true },
    { label: 'Total Rendered',         key: '_totalRendered',       minWidth: 110, group: 'calc',     colGroup: 'totalRendered',        isGroupLeader: true },
    { label: 'Total Tardiness',        key: '_totalTardiness',      minWidth: 110, group: 'tard',     colGroup: 'totalTard',            isGroupLeader: true },
  ],
  honorarium: [
    { label: 'Date',                 key: 'date',                      minWidth: 130, group: 'meta',     colGroup: null },
    { label: 'Day',                  key: 'day',                       minWidth: 80,  group: 'meta',     colGroup: null },
    { label: 'Time IN',              key: '_hnTimeIN',                 minWidth: 110, group: 'actual',   colGroup: 'hnTimes',    isGroupLeader: true },
    { label: 'Time OUT',             key: '_hnTimeOUT',                minWidth: 110, group: 'actual',   colGroup: 'hnTimes' },
    { label: 'Official HN Time IN',  key: 'officialHonorariumTimeIN',  minWidth: 140, group: 'official', colGroup: 'hnOfficial', isGroupLeader: true },
    { label: 'Official HN Time OUT', key: 'officialHonorariumTimeOUT', minWidth: 140, group: 'official', colGroup: 'hnOfficial' },
    { label: 'HN Rendered',          key: '_hnRendered',               minWidth: 110, group: 'calc',     colGroup: 'hnRendered', isGroupLeader: true },
    { label: 'HN Tardiness',         key: '_hnTardiness',              minWidth: 110, group: 'tard',     colGroup: 'hnTard',     isGroupLeader: true },
  ],
  serviceCredit: [
    { label: 'Date',                 key: 'date',                         minWidth: 130, group: 'meta',     colGroup: null },
    { label: 'Day',                  key: 'day',                          minWidth: 80,  group: 'meta',     colGroup: null },
    { label: 'Time IN',              key: '_scTimeIN',                    minWidth: 110, group: 'actual',   colGroup: 'scTimes',    isGroupLeader: true },
    { label: 'Time OUT',             key: '_scTimeOUT',                   minWidth: 110, group: 'actual',   colGroup: 'scTimes' },
    { label: 'Official SC Time IN',  key: 'officialServiceCreditTimeIN',  minWidth: 140, group: 'official', colGroup: 'scOfficial', isGroupLeader: true },
    { label: 'Official SC Time OUT', key: 'officialServiceCreditTimeOUT', minWidth: 140, group: 'official', colGroup: 'scOfficial' },
    { label: 'SC Rendered',          key: '_scRendered',                  minWidth: 110, group: 'calc',     colGroup: 'scRendered', isGroupLeader: true },
    { label: 'SC Tardiness',         key: '_scTardiness',                 minWidth: 110, group: 'tard',     colGroup: 'scTard',     isGroupLeader: true },
  ],
  overtime: [
    { label: 'Date',                key: 'date',              minWidth: 130, group: 'meta',     colGroup: null },
    { label: 'Day',                 key: 'day',               minWidth: 80,  group: 'meta',     colGroup: null },
    { label: 'Time IN',             key: '_otTimeIN',         minWidth: 110, group: 'actual',   colGroup: 'otTimes',    isGroupLeader: true },
    { label: 'Time OUT',            key: '_otTimeOUT',        minWidth: 110, group: 'actual',   colGroup: 'otTimes' },
    { label: 'Official OT Time IN', key: 'officialOverTimeIN',  minWidth: 140, group: 'official', colGroup: 'otOfficial', isGroupLeader: true },
    { label: 'Official OT Time OUT',key: 'officialOverTimeOUT', minWidth: 140, group: 'official', colGroup: 'otOfficial' },
    { label: 'OT Rendered',         key: '_otRendered',       minWidth: 110, group: 'calc',     colGroup: 'otRendered', isGroupLeader: true },
    { label: 'OT Tardiness',        key: '_otTardiness',      minWidth: 110, group: 'tard',     colGroup: 'otTard',     isGroupLeader: true },
  ],
};

const COL_GROUP_META = {
  morningDevice:        { label: 'Time IN · device' },
  morningOfficial:      { label: 'Time IN · official' },
  breaktimeDevice:      { label: 'Break IN · device' },
  breaktimeOfficial:    { label: 'Break IN · official' },
  afternoonBreakDevice: { label: 'Break OUT · device' },
  timeOutDevice:        { label: 'Time OUT · device' },
  afternoonOfficial:    { label: 'PM · official' },
  amRendered:           { label: 'AM rendered' },
  amTard:               { label: 'AM tardiness' },
  pmRendered:           { label: 'PM rendered' },
  pmTard:               { label: 'PM tardiness' },
  totalRendered:        { label: 'Total rendered' },
  totalTard:            { label: 'Total tardiness' },
  hnTimes:              { label: 'Device times' },
  hnOfficial:           { label: 'Official schedule' },
  hnRendered:           { label: 'HN rendered' },
  hnTard:               { label: 'HN tardiness' },
  scTimes:              { label: 'Device times' },
  scOfficial:           { label: 'Official schedule' },
  scRendered:           { label: 'SC rendered' },
  scTard:               { label: 'SC tardiness' },
  otTimes:              { label: 'Device times' },
  otOfficial:           { label: 'Official schedule' },
  otRendered:           { label: 'OT rendered' },
  otTard:               { label: 'OT tardiness' },
};

// ─── Tardiness duration helpers (HR overrides on AM/PM tardiness) ───────
/** Parse HH:MM or HH:MM:SS → HH:MM:SS; returns null if invalid. */
const normalizeDurationInput = (raw) => {
  const s = String(raw ?? '').trim();
  if (!s || s === '—') return null;
  const parts = s.split(':').map((p) => Number(String(p).trim()));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 2) return `${String(parts[0]).padStart(2, '0')}:${String(parts[1]).padStart(2, '0')}:00`;
  if (parts.length >= 3) return `${String(parts[0]).padStart(2, '0')}:${String(parts[1]).padStart(2, '0')}:${String(parts[2]).padStart(2, '0')}`;
  return null;
};

const canonicalTardDisplay = (v) => {
  const n = normalizeDurationInput(v);
  if (n) return n;
  if (v == null || v === '' || v === '—' || v === 'NaN:NaN:NaN') return '00:00:00';
  return '00:00:00';
};

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
      if (zeroAmPmHalfDay) return '00:00:00';
      if (isFurlough) return !row.formattedFacultyMaxRenderedTimeAM || row.formattedFacultyMaxRenderedTimeAM === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyMaxRenderedTimeAM;
      return !row.officialTimeIN || !row.breaktimeIN || row.formattedFacultyRenderedTimeAM === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyRenderedTimeAM;
    case '_morningTardiness': {
      if (zeroAmPmHalfDay || isFurlough) return '00:00:00';
      const d = normalizeReviewDate(row?.date);
      const entry = reviewByDate?.[d];
      if (entry?.status === HALF_DAY_STATUS.REJECTED) {
        const eff = getEffectiveTardinessFromReview(entry, MODULE_TYPES.NON_TEACHING);
        if (eff?.morning) return eff.morning;
      }
      if (entry?.status === HALF_DAY_STATUS.APPROVED) {
        const eff = getEffectiveTardinessFromApproved(entry, MODULE_TYPES.NON_TEACHING);
        if (eff?.morning) return eff.morning;
      }
      return !row.officialTimeIN || !row.breaktimeIN || row.formattedfinalcalcFacultyAM === 'NaN:NaN:NaN' ? row.formattedFacultyMaxRenderedTimeAM : row.formattedfinalcalcFacultyAM;
    }
    case '_totalRendered':
      return getRowTotalRenderedDisplay(
        row,
        reviewByDate,
        MODULE_TYPES.NON_TEACHING,
        isFurlough,
      );
    case '_afternoonRendered':
      if (zeroAmPmHalfDay) return '00:00:00';
      if (isFurlough) return !row.formattedFacultyMaxRenderedTimePM || row.formattedFacultyMaxRenderedTimePM === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyMaxRenderedTimePM;
      return !row.officialBreaktimeOUT || !row.timeOUT || row.formattedFacultyRenderedTimePM === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyRenderedTimePM;
    case '_afternoonTardiness': {
      if (zeroAmPmHalfDay || isFurlough) return '00:00:00';
      const d = normalizeReviewDate(row?.date);
      const entry = reviewByDate?.[d];
      if (entry?.status === HALF_DAY_STATUS.REJECTED) {
        const eff = getEffectiveTardinessFromReview(entry, MODULE_TYPES.NON_TEACHING);
        if (eff?.afternoon) return eff.afternoon;
      }
      if (entry?.status === HALF_DAY_STATUS.APPROVED) {
        const eff = getEffectiveTardinessFromApproved(entry, MODULE_TYPES.NON_TEACHING);
        if (eff?.afternoon) return eff.afternoon;
      }
      return !row.officialBreaktimeOUT || !row.timeOUT || row.formattedfinalcalcFacultyPM === 'NaN:NaN:NaN' ? row.formattedFacultyMaxRenderedTimePM : row.formattedfinalcalcFacultyPM;
    }
    case '_totalTardiness': {
      if (isFurlough) return '00:00:00';
      return getRowTotalTardinessDisplay(
        row,
        reviewByDate,
        MODULE_TYPES.NON_TEACHING,
        isFurlough,
        addTimeHhMmOnly(
          getCellValue(row, '_morningTardiness', isFurlough, tardOverrides, reviewByDate),
          getCellValue(row, '_afternoonTardiness', isFurlough, tardOverrides, reviewByDate),
        ),
      );
    }
    case '_hnTimeIN':  return isNA(row.officialHonorariumTimeIN)  ? NA : row.timeIN;
    case '_hnTimeOUT': return isNA(row.officialHonorariumTimeOUT) ? NA : row.timeOUT;
    case '_hnRendered':
      if (isFurlough) return !row.formattedFacultyMaxRenderedTimeHN || row.formattedFacultyMaxRenderedTimeHN === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyMaxRenderedTimeHN;
      return !row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeHN === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyRenderedTimeHN;
    case '_hnTardiness':
      if (isFurlough) return '00:00:00';
      return !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyHN === 'NaN:NaN:NaN' ? row.formattedFacultyMaxRenderedTimeHN : row.formattedfinalcalcFacultyHN;
    case '_scTimeIN':  return isNA(row.officialServiceCreditTimeIN)  ? NA : row.timeIN;
    case '_scTimeOUT': return isNA(row.officialServiceCreditTimeOUT) ? NA : row.timeOUT;
    case '_scRendered':
      if (isFurlough) return !row.formattedFacultyMaxRenderedTimeSC || row.formattedFacultyMaxRenderedTimeSC === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyMaxRenderedTimeSC;
      return !row.officialTimeSC || !row.timeOUT || row.formattedFacultyRenderedTimeSC === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyRenderedTimeSC;
    case '_scTardiness':
      if (isFurlough) return '00:00:00';
      return !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultySC === 'NaN:NaN:NaN' ? row.formattedFacultyMaxRenderedTimeSC : row.formattedfinalcalcFacultySC;
    case '_otTimeIN':  return isNA(row.officialOverTimeIN)  ? NA : row.timeIN;
    case '_otTimeOUT': return isNA(row.officialOverTimeOUT) ? NA : row.timeOUT;
    case '_otRendered':
      if (isFurlough) return !row.formattedFacultyMaxRenderedTimeOT || row.formattedFacultyMaxRenderedTimeOT === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyMaxRenderedTimeOT;
      return !row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeOT === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyRenderedTimeOT;
    case '_otTardiness':
      if (isFurlough) return '00:00:00';
      return !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyOT === 'NaN:NaN:NaN' ? row.formattedFacultyMaxRenderedTimeOT : row.formattedfinalcalcFacultyOT;
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

const addTimeHhMmOnly = (a, b) => {
  const toSec = (t) => {
    if (!t || t === 'NaN:NaN:NaN' || t === '—') return 0;
    const parts = String(t).split(':').map(Number);
    if (parts.length < 2 || [parts[0], parts[1]].some((n) => Number.isNaN(n))) return 0;
    return parts[0] * 3600 + parts[1] * 60;
  };
  const total = toSec(a) + toSec(b);
  const h = Math.floor(total / 3600);
  const m2 = Math.floor((total % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m2).padStart(2, '0')}:00`;
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
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 0.35, minWidth: 96 }}>
        <TextField
          size="small"
          fullWidth
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={applyBlur}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
          placeholder={systemVal}
          inputProps={{
            'aria-label': part === 'morning' ? 'AM tardiness' : 'PM tardiness',
            sx: { fontFamily: T.recordFont, fontSize: '0.78rem', textAlign: 'center', py: 0.65 },
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end" sx={{ ml: 0 }}>
                <Tooltip title="Use system calculation" placement="top" arrow>
                  <IconButton
                    size="small"
                    aria-label="Use system calculation"
                    onClick={() => { onCommit(null); setLocal(systemVal); }}
                    sx={{ p: 0.35, color: T.accentMid }}
                  >
                    <RestartAlt sx={{ fontSize: 17 }} />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': { borderRadius: 1, bgcolor: '#fff', fontSize: '0.78rem' },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder },
          }}
        />
        {hasAdjusted && (
          <Typography sx={{ fontSize: '0.58rem', color: T.muted, textAlign: 'center', lineHeight: 1.2 }}>
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
  const s = styles[label] || {};
  return (
    <Chip size="small" label={label}
      sx={{ fontWeight: 700, fontSize: '0.6rem', height: 16, mt: 0.3,
        bgcolor: s.bg, color: s.color, border: `1px solid ${s.border}` }} />
  );
};

// ─── Floating Totals / Save Bar ───────────────────────────────────────────
const FloatingTotalsBar = ({ totals, visible, onSave, saving, startDate, endDate }) => {
  const [expanded, setExpanded] = useState(true);
  if (!visible) return null;

  const allItems = [
    { label: 'Absent Days',       value: String(Number.isFinite(Number(totals.absentDays)) ? Number(totals.absentDays) : 0), subtitle: totals.absentTime || '00:00:00', style: T.absent,    accent: true },
    { label: 'Half Days',         value: String(Number.isFinite(Number(totals.halfDays))   ? Number(totals.halfDays)   : 0), subtitle: totals.halfDayShortfallTime || '00:00:00', style: T.halfDay,   accent: true },
    { label: 'Late Total',        value: totals.lateTotalTime || '00:00:00',                                              style: T.tardiness, accent: true },
    { label: 'Overall Rendered',  value: totals.overallRendered  || '00:00:00',                                              style: T.rendered,  accent: true },
    { label: 'Overall Tardiness', value: formatTardinessAsDaysHours(totals.overallTardiness || '00:00:00'), subtitle: `${totals.overallTardiness || '00:00:00'} · Absent + Half + Late`, style: T.tardiness, accent: true },
    { label: 'AM Rendered',       value: totals.morningRendered    || '00:00:00' },
    { label: 'AM Tardiness',      value: totals.morningTardiness   || '00:00:00' },
    { label: 'PM Rendered',       value: totals.afternoonRendered  || '00:00:00' },
    { label: 'PM Tardiness',      value: totals.afternoonTardiness || '00:00:00' },
    { label: 'HN Rendered',       value: totals.hnRendered         || '00:00:00' },
    { label: 'HN Tardiness',      value: totals.hnTardiness        || '00:00:00' },
    { label: 'SC Rendered',       value: totals.scRendered         || '00:00:00' },
    { label: 'SC Tardiness',      value: totals.scTardiness        || '00:00:00' },
    { label: 'OT Rendered',       value: totals.otRendered         || '00:00:00' },
    { label: 'OT Tardiness',      value: totals.otTardiness        || '00:00:00' },
  ];

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <Paper elevation={8} sx={{
        borderRadius: '12px', overflow: 'hidden', width: '100%', maxWidth: '100%',
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
            <Box onClick={(e) => { e.stopPropagation(); if (!saving) onSave(); }}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.75,
                px: 1.5, py: 0.6, borderRadius: '8px',
                border: `1px solid ${T.accentBorder}`, bgcolor: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                '&:hover': saving ? {} : { bgcolor: T.accentFaint, borderColor: T.accent },
              }}>
              {saving ? <CircularProgress size={14} thickness={5} sx={{ color: T.accent }} /> : <SaveAs sx={{ color: T.accent, fontSize: 16 }} />}
              <Typography sx={{ fontSize: '0.74rem', fontWeight: 700, color: T.accent }}>
                {saving ? 'Saving…' : 'Save to summary'}
              </Typography>
            </Box>
            {expanded ? <ExpandMore sx={{ fontSize: 16, color: T.muted }} /> : <ExpandLess sx={{ fontSize: 16, color: T.muted }} />}
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
          {/* Outer: fixed viewport width + horizontal scroll. Inner: single intrinsic-width row (never wraps). */}
          <Box
            sx={{
              px: 1.5, py: 1.25,
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
              {allItems.map(({ label, value, style, accent, subtitle }) => (
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
const AttendanceModuleNonTeachingStaff = () => {
  const { settings }          = useSystemSettings();
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [employeeDisplayName, setEmployeeDisplayName] = useState('');
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [startDate, setStartDate]           = useState('');
  const [endDate, setEndDate]               = useState('');
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
    honorarium:    { hnTimes: false, hnOfficial: true, hnRendered: false, hnTard: false },
    serviceCredit: { scTimes: false, scOfficial: true, scRendered: false, scTard: false },
    overtime:      { otTimes: false, otOfficial: true, otRendered: false, otTard: false },
  });
  const toggleColGroup = (tab, groupKey) =>
    setCollapsedGroups((prev) => ({ ...prev, [tab]: { ...prev[tab], [groupKey]: !prev[tab][groupKey] } }));

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
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear());
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
    const en = localStorage.getItem('attendanceNonTeachingEmployeeNumber');
    const sd = localStorage.getItem('attendanceNonTeachingStartDate');
    const ed = localStorage.getItem('attendanceNonTeachingEndDate');
    if (en) setEmployeeNumber(en);
    if (sd) setStartDate(sd);
    if (ed) setEndDate(ed);
  }, []);

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

  const getStatusLabelForDate = useCallback(
    (date) => getLeaveStatusLabelForDate(date, { suspensionByDate, holidayByDate, leaveByDate }),
    [suspensionByDate, holidayByDate, leaveByDate],
  );

  const commitTardinessOverride = useCallback((date, part, normalizedOrNull) => {
    setTardinessOverrides((prev) => {
      const row = attendanceData.find((r) => r.date === date);
      if (!row) return prev;
      const colKey = part === 'morning' ? '_morningTardiness' : '_afternoonTardiness';
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
  }, [attendanceData, getStatusLabelForDate]);

  const calcSegment = (startStr, endStr, officialStartStr, officialEndStr) => {
    const parseTimeToSeconds = (timeStr) => {
      if (!timeStr || timeStr === '—') return null;
      const trimmed = String(timeStr).trim();
      const m = trimmed.match(/^(\d{1,2}):(\d{2}):(\d{2})(?:\s*(AM|PM))?$/i);
      if (!m) return null;
      let hh = Number(m[1]); const mm = Number(m[2]); const ss = Number(m[3]); const mer = (m[4] || '').toUpperCase();
      if ([hh, mm, ss].some(Number.isNaN)) return null;
      if (mer) { if (hh === 12) hh = 0; if (mer === 'PM') hh += 12; }
      return hh * 3600 + mm * 60;
    };
    const formatSeconds = (secs) => {
      const safe = Math.max(0, Number(secs) || 0);
      const h = Math.floor(safe / 3600), m2 = Math.floor((safe % 3600) / 60), s = safe % 60;
      return [h, m2, s].map(x => String(x).padStart(2, '0')).join(':');
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
    if (offStartSec == null || offEndSecRaw == null) return { rendered: '00:00:00', maxRendered: '00:00:00', tardiness: '00:00:00' };
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
      const [deviceRows, maps, attendanceRes] = await Promise.all([
        postAttendanceDevicePreflightNoSync({ apiBaseUrl: API_BASE_URL, getAuthHeaders, personID: employeeNumber, startDate, endDate }),
        fetchAttendanceCalendarMaps({ apiBaseUrl: API_BASE_URL, getAuthHeaders, startDate, endDate, personId: employeeNumber }),
        axios.get(`${API_BASE_URL}/attendance/api/attendance`, { params: { personId: employeeNumber, startDate, endDate }, ...getAuthHeaders() }),
      ]);
      if (deviceRows.length === 0) {
        setAttendanceData([]); setSuspensionByDate({}); setLeaveByDate({}); setHolidayByDate({});
        showModal('No Device Records Found', 'No biometric device records were found for this employee within the selected date range.\n\nPlease verify the employee number and date range, or check if the attendance device has synced.\n\nPress OK to open Attendance Device.', 'warning', () => { closeModal(); navigate('/view_attendance'); });
        return;
      }
      const rawRows = Array.isArray(attendanceRes.data) ? attendanceRes.data : [];
      if (rawRows.length === 0) {
        setAttendanceData([]); setSuspensionByDate({}); setLeaveByDate({}); setHolidayByDate({});
        showModal('No Official Time Schedule', `Device records were found for this employee (${deviceRows.length} day${deviceRows.length !== 1 ? 's' : ''}), but no matching Official Time Schedule exists for this period.\n\nPlease set up the official time schedule in the Official Time Management module before generating attendance records.\n\nPress OK to open Official Time Management.`, 'warning', () => { closeModal(); navigate('/official_time'); });
        return;
      }
      const processedData = rawRows.map((row) => {
        const { timeIN, timeOUT, breaktimeIN, breaktimeOUT, officialBreaktimeIN, officialBreaktimeOUT, officialTimeIN, officialTimeOUT, officialHonorariumTimeIN, officialHonorariumTimeOUT, officialServiceCreditTimeIN, officialServiceCreditTimeOUT, officialOverTimeIN, officialOverTimeOUT } = row;
        const am = calcSegment(timeIN, breaktimeIN, officialTimeIN, officialBreaktimeIN);
        const pm = calcSegment(breaktimeOUT, timeOUT, officialBreaktimeOUT, officialTimeOUT);
        const hn = calcSegment(timeIN, timeOUT, officialHonorariumTimeIN, officialHonorariumTimeOUT);
        const sc = calcSegment(timeIN, timeOUT, officialServiceCreditTimeIN, officialServiceCreditTimeOUT);
        const ot = calcSegment(timeIN, timeOUT, officialOverTimeIN, officialOverTimeOUT);
        const parseTardiness = (t) => {
          if (!t || t === 'NaN:NaN:NaN' || t === '—') return 0;
          const parts = (t || '00:00:00').split(':').map(Number);
          const h = parts[0] || 0;
          const m = parts[1] || 0;
          if (Number.isNaN(h) || Number.isNaN(m)) return 0;
          return h * 3600 + m * 60;
        };
        const totalTardinessSeconds =
          parseTardiness(am.tardiness) + parseTardiness(pm.tardiness);
        const h = Math.floor(totalTardinessSeconds / 3600);
        const m = Math.floor((totalTardinessSeconds % 3600) / 60);
        const s = totalTardinessSeconds % 60;
        const lateTotal = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '00')}`;
        return {
          ...row,
          lateTotal,
          undertimeTotal: row._undertimeTotal || '00:00:00',
          formattedFacultyRenderedTimeAM: am.rendered,  formattedFacultyMaxRenderedTimeAM: am.maxRendered, formattedfinalcalcFacultyAM: am.tardiness,
          formattedFacultyRenderedTimePM: pm.rendered,  formattedFacultyMaxRenderedTimePM: pm.maxRendered, formattedfinalcalcFacultyPM: pm.tardiness,
          formattedFacultyRenderedTimeHN: hn.rendered,  formattedFacultyMaxRenderedTimeHN: hn.maxRendered, formattedfinalcalcFacultyHN: hn.tardiness,
          formattedFacultyRenderedTimeSC: sc.rendered,  formattedFacultyMaxRenderedTimeSC: sc.maxRendered, formattedfinalcalcFacultySC: sc.tardiness,
          formattedFacultyRenderedTimeOT: ot.rendered,  formattedFacultyMaxRenderedTimeOT: ot.maxRendered, formattedfinalcalcFacultyOT: ot.tardiness,
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
          MODULE_TYPES.NON_TEACHING,
          calendarMaps,
        );

      const initialReviewMap = buildReviewMapFromStored({
        half_day_review: null,
        halfDayDates: '',
      });

      setSuspensionByDate(maps.suspensionByDate);
      setLeaveByDate(maps.leaveByDate);
      setHolidayByDate(maps.holidayByDate);
      setTardinessOverrides({});
      setAttendanceData(processedData);
      setHalfDayReviewByDate(initialReviewMap);

      const parseLateToSeconds = (t) => {
        if (!t || t === 'NaN:NaN:NaN' || t === '—') return 0;
        const parts = String(t).split(':').map(Number);
        if (parts.length < 2 || [parts[0], parts[1]].some(Number.isNaN)) return 0;
        return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
      };
      const totalLateSec = processedData.reduce(
        (sum, row) => sum + parseLateToSeconds(row.lateTotal),
        0,
      );
      const th = Math.floor(totalLateSec / 3600);
      const tm = Math.floor((totalLateSec % 3600) / 60);
      const ts = totalLateSec % 60;
      const totalLateLabel = `${String(th).padStart(2, '0')}:${String(tm).padStart(2, '0')}:${String(ts).padStart(2, '0')}`;

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

  const sumTime = useCallback((values) => {
    let total = 0;
    values.forEach((t) => {
      if (!t || t === 'NaN:NaN:NaN' || t === '—') return;
      const parts = t.split(':').map(Number);
      if (parts.length >= 2 && [parts[0], parts[1]].every((n) => !Number.isNaN(n)))
        total += parts[0] * 3600 + parts[1] * 60;
    });
    const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'00')}`;
  }, []);

  const addTimes = useCallback((a, b) => {
    const parse = (t) => { const parts = (t || '00:00:00').split(':').map(Number); const h = parts[0] || 0; const m = parts[1] || 0; if (Number.isNaN(h) || Number.isNaN(m)) return 0; return h * 3600 + m * 60; };
    const total = parse(a) + parse(b);
    const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'00')}`;
  }, []);

  const totals = React.useMemo(() => {
    if (!attendanceData.length) return {};
    const calendarMaps = { suspensionByDate, holidayByDate, leaveByDate };
    const buckets = computeReviewAwareAbsenceBuckets(
      attendanceData,
      halfDayReviewByDate,
      calendarMaps,
      MODULE_TYPES.NON_TEACHING,
    );
    const ov = tardinessOverrides;
    const rv = halfDayReviewByDate;
    const morningRendered    = sumTime(attendanceData.map(r => getCellValue(r, '_morningRendered',    Boolean(getStatusLabelForDate(r.date)), ov, rv)));
    const morningTardiness   = sumTime(attendanceData.map(r => getCellValue(r, '_morningTardiness',   Boolean(getStatusLabelForDate(r.date)), ov, rv)));
    const afternoonRendered  = sumTime(attendanceData.map(r => getCellValue(r, '_afternoonRendered',  Boolean(getStatusLabelForDate(r.date)), ov, rv)));
    const totalRendered      = sumTime(attendanceData.map(r => getCellValue(r, '_totalRendered',      Boolean(getStatusLabelForDate(r.date)), ov, rv)));
    const afternoonTardiness = sumTime(attendanceData.map(r => getCellValue(r, '_afternoonTardiness', Boolean(getStatusLabelForDate(r.date)), ov, rv)));
    const overallRendered    = addTimes(morningRendered,  afternoonRendered);
    const rowTardinessSum = sumHmsDurationStrings(
      attendanceData.map((r) =>
        getCellValue(
          r,
          '_totalTardiness',
          Boolean(getStatusLabelForDate(r.date)),
          ov,
          rv,
        ),
      ),
    );
    const lateTotalTime = computeLateTotalTimeFromTardiness(null, buckets);
    const overallTardiness = computeOverallTardinessFromBuckets(buckets);
    const hnRendered  = sumTime(attendanceData.map(r => getCellValue(r, '_hnRendered',  Boolean(getStatusLabelForDate(r.date)), ov, rv)));
    const hnTardiness = sumTime(attendanceData.map(r => getCellValue(r, '_hnTardiness', Boolean(getStatusLabelForDate(r.date)), ov, rv)));
    const scRendered  = sumTime(attendanceData.map(r => getCellValue(r, '_scRendered',  Boolean(getStatusLabelForDate(r.date)), ov, rv)));
    const scTardiness = sumTime(attendanceData.map(r => getCellValue(r, '_scTardiness', Boolean(getStatusLabelForDate(r.date)), ov, rv)));
    const otRendered  = sumTime(attendanceData.map(r => getCellValue(r, '_otRendered',  Boolean(getStatusLabelForDate(r.date)), ov, rv)));
    const otTardiness = sumTime(attendanceData.map(r => getCellValue(r, '_otTardiness', Boolean(getStatusLabelForDate(r.date)), ov, rv)));
    return {
      absentDays: buckets.absentDays,
      halfDays: buckets.halfDays,
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
  }, [attendanceData, sumTime, addTimes, getStatusLabelForDate, leaveByDate, holidayByDate, suspensionByDate, tardinessOverrides, halfDayReviewByDate]);

  const isAbsentAttendanceRow = useCallback((row) => {
    const d = String(row?.date ?? '').slice(0, 10);
    const calendarMaps = { suspensionByDate, holidayByDate, leaveByDate };
    if (isExcludedAttendanceCalendarDate(d, calendarMaps)) return false;
    if (!isScheduledByOfficialTime(row)) return false;
    return hasNoPunches(row);
  }, [suspensionByDate, holidayByDate, leaveByDate]);

  const getHalfDayUiStatus = useCallback(
    (row) => {
      const calendarMaps = { suspensionByDate, holidayByDate, leaveByDate };
      return getRowHalfDayUiStatus(row, halfDayReviewByDate, MODULE_TYPES.NON_TEACHING, calendarMaps);
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
    navigateAttendanceWorkflow(navigate, 'summary', {
      employeeNumber,
      startDate,
      endDate,
    });
  }, [employeeNumber, startDate, endDate, navigate]);

  const buildOverallRecordPayload = () => {
    const calendarMaps = { suspensionByDate, holidayByDate, leaveByDate };
    const approvedSet = getApprovedHalfDayDatesSet(halfDayReviewByDate);
    const dailyRows = buildDailyLateUndertimeRows(
      attendanceData,
      approvedSet,
      halfDayReviewByDate,
      MODULE_TYPES.NON_TEACHING,
    );
    return {
    ...(function computeAbsentHalfBuckets() {
      const c = computeReviewAwareAbsenceBuckets(
        attendanceData,
        halfDayReviewByDate,
        calendarMaps,
        MODULE_TYPES.NON_TEACHING,
      );
      const absentList = listAbsentDatesFromDailyRows(attendanceData, calendarMaps);
      return {
        absentDays: c.absentDays,
        halfDays: c.halfDays,
        lateTotalTime: totals.lateTotalTime || '00:00:00',
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
    showSnackbar('Attendance summary updated from your choices.', 'success');
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
        showSnackbar('Attendance summary saved.', 'success');
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
        showModal('Duplicate attendance summary', `A summary for employee ${employeeNumber} (${startDate} to ${endDate}) already exists and matches these totals.\n\nNothing new will be saved. You can continue to Attendance Summary to review or use payroll routing.`, 'info',
          () => { closeModal(); if (warnUnresolvedHalfDays()) return; navigateToOverallAttendanceSummary(); }, true, 'Continue to summary');
        return;
      }
      if (action === 'compare' && existing) {
        setPendingSavedOverall(existing);
        setPendingProposedOverall(record);
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
      showSnackbar(response.data.message || 'Attendance record saved successfully!', 'success');
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

  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => { handleSubmitRef.current = handleSubmit; });

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

  const allColumns   = TAB_COLUMNS[activeTab];
  const curCollapsed = collapsedGroups[activeTab] || {};
  const columnSlots = allColumns.reduce((acc, col) => {
    const g = col.colGroup;
    if (!g) { acc.push({ col, isCollapsedPlaceholder: false }); return acc; }
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
                  position: 'sticky', top: 0, zIndex: 3,
                  bgcolor: '#b07070',
                  px: 0.75, py: 1,
                  minWidth: 36, width: 36, maxWidth: 36,
                  cursor: 'pointer', textAlign: 'center',
                  borderBottom: `2px solid ${T.accentBorder}`,
                  borderRight: `1px solid rgba(255,255,255,0.2)`,
                  verticalAlign: 'middle',
                  '&:hover': { bgcolor: T.accentMid },
                  transition: 'background-color 0.15s',
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.3 }}>
                  <UnfoldMore sx={{ fontSize: 13, color: '#fff' }} />
                  <Typography sx={{
                    fontSize: '0.52rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)',
                    writingMode: 'vertical-rl', textOrientation: 'mixed',
                    transform: 'rotate(180deg)',
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                    maxHeight: 80, overflow: 'hidden',
                  }}>
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
                position: 'sticky', top: 0, zIndex: 3,
                bgcolor: T.accent,
                fontWeight: 700, fontSize: '0.65rem',
                letterSpacing: '0.05em', textTransform: 'uppercase',
                color: '#fff', textAlign: 'center',
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
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.4,
                    mb: 0.6, cursor: 'pointer',
                    px: 0.75, py: 0.2, borderRadius: '4px',
                    bgcolor: 'rgba(255,255,255,0.14)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    transition: 'background-color 0.15s',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.24)' },
                  }}
                >
                  <UnfoldLess sx={{ fontSize: 10, color: 'rgba(255,255,255,0.85)' }} />
                  <Typography sx={{ fontSize: '0.57rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
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
    <TableCell sx={{
      borderBottom: `1px solid ${T.divider}`,
      borderRight: `1px solid ${T.divider}`,
      px: 1.5, py: 0.9, whiteSpace: 'nowrap', textAlign: 'center',
      color: group === 'official' ? T.faint : T.text,
      fontWeight: group === 'official' ? 400 : 500,
      fontSize: group === 'official' ? '0.75rem' : '0.8rem',
      fontFamily: T.recordFont,
      bgcolor: isEven ? '#fff' : T.rowOdd,
      transition: 'background-color 0.12s',
      'tr:hover &': { bgcolor: `${T.rowHover} !important` },
    }}>{content}</TableCell>
  );

  const buildCollapsedCell = (isEven) => (
    <TableCell sx={{
      minWidth: 36, width: 36, maxWidth: 36,
      bgcolor: isEven ? 'rgba(109,35,35,0.03)' : 'rgba(109,35,35,0.06)',
      borderBottom: `1px solid ${T.divider}`,
      borderRight: `1px solid ${T.divider}`,
      p: 0,
    }} />
  );

  // ── Totals row ────────────────────────────────────────────────────────
  /** @param {{ renderedColKey?: string, tardColKey?: string }} [opts] — when set, values show in those columns (e.g. morning vs afternoon partial totals). */
  const renderTotalsRow = (label, renderedVal, tardinessVal, opts = {}) => {
    const { renderedColKey, tardColKey } = opts;
    const renderedKeys  = columnSlots.filter(s => !s.isCollapsedPlaceholder && s.col.group === 'calc').map(s => s.col.key);
    const tardinessKeys = columnSlots.filter(s => !s.isCollapsedPlaceholder && s.col.group === 'tard').map(s => s.col.key);
    const nonCalcCount  = columnSlots.filter(s => s.isCollapsedPlaceholder || (s.col.group !== 'calc' && s.col.group !== 'tard')).length;

    const targetRenderedKey = renderedColKey || renderedKeys[renderedKeys.length - 1];
    const targetTardKey     = tardColKey     || tardinessKeys[tardinessKeys.length - 1];

    return (
      <TableRow sx={{ bgcolor: '#fafafa', borderTop: `2px solid ${T.accentBorder}` }}>
        {columnSlots.map(({ col, isCollapsedPlaceholder: isCp }, ci) => {
          if (ci === 0) return (
            <TableCell key={col.key + '_tl'} colSpan={nonCalcCount}
              sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.faint, textAlign: 'right', pr: 2.5, py: 1.25, borderBottom: 'none', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {label}
            </TableCell>
          );
          if (ci < nonCalcCount) return null;
          if (isCp) return null;
          const showRendered  = col.group === 'calc' && targetRenderedKey && col.key === targetRenderedKey;
          const showTardiness = col.group === 'tard' && targetTardKey && col.key === targetTardKey;
          if (showRendered) return (
            <TableCell key={col.key + '_tr'} sx={{ fontFamily: T.recordFont, fontWeight: 800, fontSize: '0.88rem', textAlign: 'center', py: 1.25, borderBottom: 'none', color: T.rendered.color, bgcolor: T.rendered.bg }}>
              {renderedVal || '00:00:00'}
            </TableCell>
          );
          if (showTardiness) return (
            <TableCell key={col.key + '_tt'} sx={{ fontFamily: T.recordFont, fontWeight: 800, fontSize: '0.88rem', textAlign: 'center', py: 1.25, borderBottom: 'none', color: T.tardiness.color, bgcolor: T.tardiness.bg }}>
              {tardinessVal || '00:00:00'}
            </TableCell>
          );
          return <TableCell key={col.key + '_td'} sx={{ borderBottom: 'none', bgcolor: '#fafafa', textAlign: 'center', color: T.faint, fontSize: '0.75rem' }}>—</TableCell>;
        })}
      </TableRow>
    );
  };

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <Fade in timeout={400}>
      <Box sx={{
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

        <LoadingOverlay open={loading} message="Fetching attendance records…" />

        {/* Page Header */}
        <SectionCard sx={{ mb: 2 }}>
          <Box sx={{ px: 4, py: 3, background: 'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.10) 0%,transparent 70%)' }} />
            <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)' }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, position: 'relative', zIndex: 1 }}>
              <WorkHistory sx={{ fontSize: 30, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.25 }}>Attendance Records (Non-Teaching)</Typography>
                <Typography sx={{ fontSize: '0.78rem', color: T.accentMid, fontWeight: 600 }}>Non-Teaching Staff · Generate and review attendance records</Typography>
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
                  <CheckCircleIcon sx={{ fontSize: 12 }} /> Non-Teaching
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

        <Collapse in={!!error}>
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.82rem' }}>{error}</Alert>
        </Collapse>

        {/* Controls */}
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
              <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
                <Box sx={{ display: 'flex', border: `1px solid ${T.accentBorder}`, borderRadius: '8px', overflow: 'hidden' }}>
                  {VIEW_TABS.map(({ key, label, icon }, i, arr) => (
                    <button key={key} onClick={() => setActiveTab(key)}
                      style={{ flex: 1, border: 'none', borderRight: i < arr.length - 1 ? `1px solid ${T.accentBorder}` : 'none', borderRadius: 0, padding: '8px 12px', cursor: 'pointer', background: activeTab === key ? T.accent : 'transparent', color: activeTab === key ? '#fff' : T.accent, fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', transition: 'all 0.15s ease' }}
                      onMouseEnter={e => { if (activeTab !== key) e.currentTarget.style.backgroundColor = T.accentFaint; }}
                      onMouseLeave={e => { if (activeTab !== key) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                      {icon}{label}
                    </button>
                  ))}
                </Box>
              </Box>

              {/* Table */}
              <Box sx={{ px: 2.5, pb: 2.5 }}>
                <Box sx={{ position: 'relative', borderRadius: '8px', border: `1px solid ${T.accentBorder}`, overflow: 'hidden' }}>
                  <Box
                    sx={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 500, scrollbarWidth: 'thin', '&::-webkit-scrollbar': { height: 6, width: 6 }, '&::-webkit-scrollbar-track': { background: T.accentFaint, borderRadius: 4 }, '&::-webkit-scrollbar-thumb': { background: T.accentMid, borderRadius: 4 } }}>
                    <Table sx={{ minWidth: columnSlots.reduce((s, { col, isCollapsedPlaceholder: cp }) => s + (cp ? 36 : (col.minWidth || 100)), 0), borderCollapse: 'collapse' }}>
                      {buildTableHead()}
                      <TableBody>
                        {attendanceData.map((row, index) => {
                          const statusLabel = getStatusLabelForDate(row.date);
                          const isFurlough  = Boolean(statusLabel);
                          const isEven      = index % 2 === 0;
                          const rowIsAbsent = isAbsentAttendanceRow(row);
                          const halfUi =
                            !rowIsAbsent && !isFurlough
                              ? getHalfDayUiStatus(row)
                              : null;
                          const halfDayChrome = halfUi
                            ? getHalfDayReviewRowChrome(halfUi, T)
                            : null;
                          const rowBg = rowIsAbsent
                            ? alpha('#b71c1c', 0.08)
                            : halfDayChrome?.rowBg;
                          const rowBorder = rowIsAbsent
                            ? `3px solid ${alpha('#b71c1c', 0.55)}`
                            : halfDayChrome?.rowBorder ?? '3px solid transparent';

                          return (
                            <TableRow
                              key={row.date || index}
                              sx={{
                                '&:hover td': { bgcolor: `${T.rowHover} !important` },
                                ...(rowBg ? { '& td': { bgcolor: `${rowBg} !important` } } : {}),
                              }}
                            >
                              {columnSlots.map(({ col, isCollapsedPlaceholder: isCp }) => {
                                if (isCp) return <React.Fragment key={col.key + '_cp'}>{buildCollapsedCell(isEven)}</React.Fragment>;

                                if (col.key === 'date') return (
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
                          {/* Overall row */}
                          {(() => {
                            const calcSlots  = columnSlots.filter(s => !s.isCollapsedPlaceholder && (s.col.group === 'calc' || s.col.group === 'tard'));
                            const nonCalcCnt = columnSlots.filter((s) => !s.isCollapsedPlaceholder && s.col.group !== 'calc' && s.col.group !== 'tard').length;
                            const visCalcKeys = calcSlots.filter((x) => x.col.group === 'calc').map((x) => x.col.key);
                            const visTardKeys = calcSlots.filter((x) => x.col.group === 'tard').map((x) => x.col.key);
                            const overallRenderedKey = visCalcKeys.includes('_totalRendered')
                              ? '_totalRendered'
                              : visCalcKeys.includes('_afternoonRendered')
                                ? '_afternoonRendered'
                                : visCalcKeys.includes('_morningRendered')
                                  ? '_morningRendered'
                                  : visCalcKeys[visCalcKeys.length - 1] ?? null;
                            const overallTardKey = visTardKeys.includes('_totalTardiness') ? '_totalTardiness'
                              : visTardKeys[visTardKeys.length - 1] ?? null;
                            const showRenderedInLabel = !overallRenderedKey;
                            const showTardInLabel = !overallTardKey;
                            return (
                              <TableRow sx={{ bgcolor: '#fafafa', borderTop: `2px solid ${T.accent}` }}>
                                <TableCell colSpan={nonCalcCnt} sx={{ fontSize: '0.72rem', fontWeight: 800, color: T.accent, textAlign: 'right', pr: 2.5, py: 1.5, borderBottom: 'none', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                                    <span>Overall rendered time ({startDate} – {endDate})</span>
                                    {(showRenderedInLabel || showTardInLabel) && (
                                      <Box sx={{ textAlign: 'right' }}>
                                        {showRenderedInLabel && (
                                          <Typography sx={{ fontFamily: T.recordFont, fontWeight: 900, fontSize: '0.88rem', color: T.rendered.color }}>
                                            {(overallRenderedKey === '_totalRendered' ? totals.totalRendered : totals.overallRendered) || '00:00:00'} <Typography component="span" sx={{ color: T.faint, fontWeight: 600, fontSize: '0.65rem', textTransform: 'none' }}>rendered</Typography>
                                          </Typography>
                                        )}
                                        {showTardInLabel && (
                                          <Typography sx={{ fontFamily: T.recordFont, fontWeight: 800, fontSize: '0.8rem', color: T.tardiness.color }}>
                                            {formatTardinessAsDaysHours(totals.overallTardiness || '00:00:00')} <Typography component="span" sx={{ color: T.faint, fontWeight: 600, fontSize: '0.65rem', textTransform: 'none' }}>({totals.overallTardiness || '00:00:00'})</Typography>
                                          </Typography>
                                        )}
                                      </Box>
                                    )}
                                  </Box>
                                </TableCell>
                                {calcSlots.map((s) => {
                                  const isOverallRendered = overallRenderedKey && s.col.group === 'calc' && s.col.key === overallRenderedKey;
                                  const isOverallTardiness = overallTardKey && s.col.group === 'tard' && s.col.key === overallTardKey;
                                  if (isOverallRendered) return (
                                    <TableCell key={s.col.key} sx={{ fontFamily: T.recordFont, fontWeight: 900, fontSize: '0.95rem', textAlign: 'center', py: 1.5, borderBottom: 'none', color: T.rendered.color, bgcolor: T.rendered.bg }}>
                                      {(overallRenderedKey === '_totalRendered' ? totals.totalRendered : totals.overallRendered) || '00:00:00'}
                                    </TableCell>
                                  );
                                  if (isOverallTardiness) return (
                                    <TableCell key={s.col.key} sx={{ textAlign: 'center', py: 1.5, borderBottom: 'none', color: T.tardiness.color, bgcolor: T.tardiness.bg }}>
                                      <Typography sx={{ fontFamily: T.recordFont, fontWeight: 900, fontSize: '0.95rem' }}>{formatTardinessAsDaysHours((totals.rowTardinessSum || totals.overallTardiness) || '00:00:00')}</Typography>
                                      <Typography sx={{ fontFamily: T.recordFont, fontWeight: 600, fontSize: '0.7rem', opacity: 0.55 }}>{totals.rowTardinessSum || totals.overallTardiness || '00:00:00'}</Typography>
                                    </TableCell>
                                  );
                                  return <TableCell key={s.col.key} sx={{ borderBottom: 'none', bgcolor: '#fafafa', textAlign: 'center', color: T.faint }}>—</TableCell>;
                                })}
                              </TableRow>
                            );
                          })()}
                        </>}

                        {activeTab !== 'regular' && (() => {
                          const rendMap = { honorarium: totals.hnRendered,  serviceCredit: totals.scRendered,  overtime: totals.otRendered  };
                          const tardMap = { honorarium: totals.hnTardiness, serviceCredit: totals.scTardiness, overtime: totals.otTardiness };
                          const keyMap = {
                            honorarium:    { renderedColKey: '_hnRendered', tardColKey: '_hnTardiness' },
                            serviceCredit: { renderedColKey: '_scRendered', tardColKey: '_scTardiness' },
                            overtime:      { renderedColKey: '_otRendered', tardColKey: '_otTardiness' },
                          };
                          return renderTotalsRow(`Overall rendered time (${startDate} – ${endDate})`, rendMap[activeTab], tardMap[activeTab], keyMap[activeTab]);
                        })()}
                      </TableBody>
                    </Table>
                  </Box>
                </Box>

                {/* Legend */}
                <Box sx={{ pt: 1.5, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  {[
                    { swatch: { bgcolor: T.holiday.bg,  border: `1px solid ${T.holiday.border}` },   label: 'Holiday' },
                    { swatch: { bgcolor: T.leave.bg,    border: `1px solid ${T.leave.border}` },     label: 'On leave' },
                    { swatch: { bgcolor: T.suspended.bg,border: `1px solid ${T.suspended.border}` }, label: 'Work suspended' },
                    { swatch: { bgcolor: alpha('#b71c1c', 0.08), border: `1px solid ${alpha('#b71c1c', 0.55)}` }, label: 'Absent highlight' },
                    { swatch: { bgcolor: T.halfDay.bg, border: `1px solid ${T.halfDay.border}` }, label: 'Half day highlight' },
                    { swatch: { bgcolor: T.halfDay.bg,  border: `1px solid ${T.halfDay.border}` },   label: 'Half day' },
                    { swatch: { bgcolor: T.rendered.bg, border: `1px solid ${T.rendered.border}` },  label: 'Rendered totals' },
                    { swatch: { bgcolor: T.tardiness.bg,border: `1px solid ${T.tardiness.border}` }, label: 'Tardiness totals' },
                    { swatch: { bgcolor: 'rgba(109,35,35,0.08)', border: `1px solid ${T.accentBorder}` }, label: 'Regular Time: AM/PM tardiness is system-calculated and editable (↻ restores system)' },
                    { swatch: { bgcolor: '#b07070', border: `1px solid ${T.accentBorder}` }, label: 'Group headers: hide collapses columns; narrow strip expands' },
                  ].map((item, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '2px', ...item.swatch }} />
                      <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>{item.label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </SectionCard>
          </Fade>
        )}

        <FloatingTotalsBar totals={totals} visible={attendanceData.length > 0} onSave={saveOverallAttendance} saving={saving} startDate={startDate} endDate={endDate} />

        <UnresolvedHalfDaysDialog
          dates={unresolvedDatesModal}
          onClose={() => setUnresolvedDatesModal(null)}
          themeT={T}
        />

        <StyledModal open={modal.open} onClose={closeModal} title={modal.title} message={modal.message} type={modal.type} onConfirm={modal.onConfirm} showCancel={modal.showCancel} confirmLabel={modal.confirmLabel} />

        <OverallAttendanceCompareModal open={compareOpen} onClose={handleCompareClose} onConfirm={handleCompareConfirm} savedRow={pendingSavedOverall} proposedRecord={pendingProposedOverall} fields={OVERALL_COMPARE_FIELD_META} title="Compare saved summary vs new totals" />

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