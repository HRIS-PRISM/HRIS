import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
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
  Assignment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';

// ─── Theme tokens (unified with AttendanceModuleFaculty) ──────────────────
const T = {
  accent:       '#6d2323',
  accentDark:   '#5a1d1d',
  accentMid:    '#8B4545',
  accentFaint:  'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover:  'rgba(109,35,35,0.10)',
  rowOdd:       'rgba(109,35,35,0.025)',
  rowHover:     'rgba(109,35,35,0.055)',
  text:         '#1a1a1a',
  muted:        '#6b6b6b',
  faint:        '#a0a0a0',
  surface:      '#ffffff',
  divider:      'rgba(0,0,0,0.08)',
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

// ─── Shimmer bone ─────────────────────────────────────────────────────────
const Bone = ({ w = '100%', h = 14, r = 6, sx = {} }) => (
  <Box sx={{
    width: w, height: h, borderRadius: r,
    background: 'linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)',
    backgroundSize: '800px 100%',
    animation: 'shimmer 1.6s infinite linear',
    flexShrink: 0, ...sx,
  }} />
);

// ─── Wireframe skeleton ───────────────────────────────────────────────────
const AttendanceNonTeachingWireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box sx={{
      py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 },
      width: '100vw', maxWidth: '100%',
      position: 'relative', left: '53%', transform: 'translateX(-51%)',
      px: { xs: 2, sm: 3, md: 6 },
    }}>
      {/* Header */}
      <Box sx={{ mb: 2, borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.09)', animation: 'blink 2s ease-in-out infinite' }}>
        <Box sx={{ px: 4, py: 3, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)' }} />
          <Box><Bone w={280} h={18} sx={{ mb: 1 }} /><Bone w={380} h={11} /></Box>
        </Box>
      </Box>
      {/* Controls */}
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
      {/* Table */}
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

// ─── Panel header bar ─────────────────────────────────────────────────────
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

// ─── Native input ─────────────────────────────────────────────────────────
const NativeInput = ({ value, onChange, type = 'text', placeholder, disabled, icon }) => (
  <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
    {icon && (
      <Box sx={{ position: 'absolute', left: 10, color: T.accentMid, display: 'flex', alignItems: 'center', zIndex: 1, pointerEvents: 'none' }}>
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
      onFocus={e => { if (!disabled) { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 1.5px ${T.accent}22`; } }}
      onBlur={e => { e.target.style.borderColor = T.accentBorder; e.target.style.boxShadow = 'none'; }}
    />
  </Box>
);

// ─── Row action button ────────────────────────────────────────────────────
const RowBtn = ({ icon, label, onClick, color, hoverBg, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: 'transparent',
      border: `1px solid ${color}40`,
      borderRadius: '6px',
      padding: '4px 10px',
      cursor: disabled ? 'default' : 'pointer',
      color,
      display: 'flex', alignItems: 'center', gap: '4px',
      fontSize: '0.72rem', fontWeight: 700,
      fontFamily: 'inherit',
      transition: 'background-color 0.15s, border-color 0.15s',
      whiteSpace: 'nowrap',
      opacity: disabled ? 0.5 : 1,
    }}
    onMouseEnter={e => { if (!disabled) { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.borderColor = color; }}}
    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = `${color}40`; }}
  >
    {icon}{label}
  </button>
);

// ─── Compact table cell ───────────────────────────────────────────────────
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
  { key: 'regular',       label: 'Regular Time',  icon: <Schedule sx={{ fontSize: 14 }} /> },
  { key: 'honorarium',    label: 'Honorarium',     icon: <Star sx={{ fontSize: 14 }} /> },
  { key: 'serviceCredit', label: 'Service Credit', icon: <CreditScore sx={{ fontSize: 14 }} /> },
  { key: 'overtime',      label: 'Overtime',       icon: <AccessTime sx={{ fontSize: 14 }} /> },
];

// ─── Column definitions ───────────────────────────────────────────────────
const TAB_COLUMNS = {
  regular: [
    { label: 'Date',                   key: 'date',                 minWidth: 130, group: 'meta' },
    { label: 'Day',                    key: 'day',                  minWidth: 100, group: 'meta' },
    { label: 'Time IN',                key: 'timeIN',               minWidth: 140, group: 'actual',   dividerBefore: true },
    { label: 'Official Time IN',       key: 'officialTimeIN',       minWidth: 150, group: 'official', dividerBefore: true },
    { label: 'Breaktime IN',           key: 'breaktimeIN',          minWidth: 140, group: 'actual' },
    { label: 'Official Breaktime IN',  key: 'officialBreaktimeIN',  minWidth: 150, group: 'official' },
    { label: 'Morning Rendered',       key: '_morningRendered',     minWidth: 140, group: 'calc',     dividerBefore: true },
    { label: 'Morning Tardiness',      key: '_morningTardiness',    minWidth: 140, group: 'tard' },
    { label: 'Breaktime OUT',          key: 'breaktimeOUT',         minWidth: 140, group: 'actual',   dividerBefore: true },
    { label: 'Official Breaktime OUT', key: 'officialBreaktimeOUT', minWidth: 150, group: 'official', dividerBefore: true },
    { label: 'Time OUT',               key: 'timeOUT',              minWidth: 130, group: 'actual' },
    { label: 'Official Time OUT',      key: 'officialTimeOUT',      minWidth: 150, group: 'official' },
    { label: 'Afternoon Rendered',     key: '_afternoonRendered',   minWidth: 140, group: 'calc',     dividerBefore: true },
    { label: 'Afternoon Tardiness',    key: '_afternoonTardiness',  minWidth: 140, group: 'tard' },
  ],
  honorarium: [
    { label: 'Date',                          key: 'date',                      minWidth: 130, group: 'meta' },
    { label: 'Day',                           key: 'day',                       minWidth: 100, group: 'meta' },
    { label: 'Time IN',                       key: '_hnTimeIN',                 minWidth: 140, group: 'actual',   dividerBefore: true },
    { label: 'Time OUT',                      key: '_hnTimeOUT',                minWidth: 140, group: 'actual' },
    { label: 'Official Honorarium Time IN',   key: 'officialHonorariumTimeIN',  minWidth: 180, group: 'official', dividerBefore: true },
    { label: 'Official Honorarium Time OUT',  key: 'officialHonorariumTimeOUT', minWidth: 180, group: 'official' },
    { label: 'Honorarium Rendered',           key: '_hnRendered',               minWidth: 140, group: 'calc',     dividerBefore: true },
    { label: 'Honorarium Tardiness',          key: '_hnTardiness',              minWidth: 140, group: 'tard' },
  ],
  serviceCredit: [
    { label: 'Date',                               key: 'date',                         minWidth: 130, group: 'meta' },
    { label: 'Day',                                key: 'day',                          minWidth: 100, group: 'meta' },
    { label: 'Time IN',                            key: '_scTimeIN',                    minWidth: 140, group: 'actual',   dividerBefore: true },
    { label: 'Time OUT',                           key: '_scTimeOUT',                   minWidth: 140, group: 'actual' },
    { label: 'Official Service Credit Time IN',    key: 'officialServiceCreditTimeIN',  minWidth: 200, group: 'official', dividerBefore: true },
    { label: 'Official Service Credit Time OUT',   key: 'officialServiceCreditTimeOUT', minWidth: 200, group: 'official' },
    { label: 'Service Credit Rendered',            key: '_scRendered',                  minWidth: 150, group: 'calc',     dividerBefore: true },
    { label: 'Service Credit Tardiness',           key: '_scTardiness',                 minWidth: 150, group: 'tard' },
  ],
  overtime: [
    { label: 'Date',                       key: 'date',              minWidth: 130, group: 'meta' },
    { label: 'Day',                        key: 'day',               minWidth: 100, group: 'meta' },
    { label: 'Time IN',                    key: '_otTimeIN',         minWidth: 140, group: 'actual',   dividerBefore: true },
    { label: 'Time OUT',                   key: '_otTimeOUT',        minWidth: 140, group: 'actual' },
    { label: 'Official Overtime Time IN',  key: 'officialOverTimeIN',  minWidth: 170, group: 'official', dividerBefore: true },
    { label: 'Official Overtime Time OUT', key: 'officialOverTimeOUT', minWidth: 170, group: 'official' },
    { label: 'Overtime Rendered',          key: '_otRendered',       minWidth: 140, group: 'calc',     dividerBefore: true },
    { label: 'Overtime Tardiness',         key: '_otTardiness',      minWidth: 140, group: 'tard' },
  ],
};

// ─── getCellValue ─────────────────────────────────────────────────────────
const getCellValue = (row, colKey, isFurlough = false) => {
  const NA = 'N/A';
  const isNA = (v) => !v || v === '00:00:00 AM' || v === '00:00:00 PM' || v === '00:00:00';

  switch (colKey) {
    case '_morningRendered':
      if (isFurlough)
        return !row.formattedFacultyMaxRenderedTimeAM || row.formattedFacultyMaxRenderedTimeAM === 'NaN:NaN:NaN'
          ? '00:00:00' : row.formattedFacultyMaxRenderedTimeAM;
      return !row.officialTimeIN || !row.breaktimeIN || row.formattedFacultyRenderedTimeAM === 'NaN:NaN:NaN'
        ? '00:00:00' : row.formattedFacultyRenderedTimeAM;
    case '_morningTardiness':
      if (isFurlough) return '00:00:00';
      return !row.officialTimeIN || !row.breaktimeIN || row.formattedfinalcalcFacultyAM === 'NaN:NaN:NaN'
        ? row.formattedFacultyMaxRenderedTimeAM : row.formattedfinalcalcFacultyAM;
    case '_afternoonRendered':
      if (isFurlough)
        return !row.formattedFacultyMaxRenderedTimePM || row.formattedFacultyMaxRenderedTimePM === 'NaN:NaN:NaN'
          ? '00:00:00' : row.formattedFacultyMaxRenderedTimePM;
      return !row.officialBreaktimeOUT || !row.timeOUT || row.formattedFacultyRenderedTimePM === 'NaN:NaN:NaN'
        ? '00:00:00' : row.formattedFacultyRenderedTimePM;
    case '_afternoonTardiness':
      if (isFurlough) return '00:00:00';
      return !row.officialBreaktimeOUT || !row.timeOUT || row.formattedfinalcalcFacultyPM === 'NaN:NaN:NaN'
        ? row.formattedFacultyMaxRenderedTimePM : row.formattedfinalcalcFacultyPM;
    case '_hnTimeIN':  return isNA(row.officialHonorariumTimeIN)  ? NA : row.timeIN;
    case '_hnTimeOUT': return isNA(row.officialHonorariumTimeOUT) ? NA : row.timeOUT;
    case '_hnRendered':
      if (isFurlough)
        return !row.formattedFacultyMaxRenderedTimeHN || row.formattedFacultyMaxRenderedTimeHN === 'NaN:NaN:NaN'
          ? '00:00:00' : row.formattedFacultyMaxRenderedTimeHN;
      return !row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeHN === 'NaN:NaN:NaN'
        ? '00:00:00' : row.formattedFacultyRenderedTimeHN;
    case '_hnTardiness':
      if (isFurlough) return '00:00:00';
      return !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyHN === 'NaN:NaN:NaN'
        ? row.formattedFacultyMaxRenderedTimeHN : row.formattedfinalcalcFacultyHN;
    case '_scTimeIN':  return isNA(row.officialServiceCreditTimeIN)  ? NA : row.timeIN;
    case '_scTimeOUT': return isNA(row.officialServiceCreditTimeOUT) ? NA : row.timeOUT;
    case '_scRendered':
      if (isFurlough)
        return !row.formattedFacultyMaxRenderedTimeSC || row.formattedFacultyMaxRenderedTimeSC === 'NaN:NaN:NaN'
          ? '00:00:00' : row.formattedFacultyMaxRenderedTimeSC;
      return !row.officialTimeSC || !row.timeOUT || row.formattedFacultyRenderedTimeSC === 'NaN:NaN:NaN'
        ? '00:00:00' : row.formattedFacultyRenderedTimeSC;
    case '_scTardiness':
      if (isFurlough) return '00:00:00';
      return !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultySC === 'NaN:NaN:NaN'
        ? row.formattedFacultyMaxRenderedTimeSC : row.formattedfinalcalcFacultySC;
    case '_otTimeIN':  return isNA(row.officialOverTimeIN)  ? NA : row.timeIN;
    case '_otTimeOUT': return isNA(row.officialOverTimeOUT) ? NA : row.timeOUT;
    case '_otRendered':
      if (isFurlough)
        return !row.formattedFacultyMaxRenderedTimeOT || row.formattedFacultyMaxRenderedTimeOT === 'NaN:NaN:NaN'
          ? '00:00:00' : row.formattedFacultyMaxRenderedTimeOT;
      return !row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeOT === 'NaN:NaN:NaN'
        ? '00:00:00' : row.formattedFacultyRenderedTimeOT;
    case '_otTardiness':
      if (isFurlough) return '00:00:00';
      return !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyOT === 'NaN:NaN:NaN'
        ? row.formattedFacultyMaxRenderedTimeOT : row.formattedfinalcalcFacultyOT;
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

// ─── Status helpers ───────────────────────────────────────────────────────
const getStatusStyle = (label) => {
  if (label === 'WORK SUSPENDED') return { bgcolor: alpha('#d32f2f', 0.12), color: '#d32f2f', border: `1px solid ${alpha('#d32f2f', 0.4)}` };
  if (label === 'HOLIDAY')        return { bgcolor: alpha('#f57c00', 0.12), color: '#f57c00', border: `1px solid ${alpha('#f57c00', 0.4)}` };
  if (label === 'ON LEAVE')       return { bgcolor: alpha('#2e7d32', 0.12), color: '#2e7d32', border: `1px solid ${alpha('#2e7d32', 0.4)}` };
  return {};
};

// ─── Floating Totals Bar ──────────────────────────────────────────────────
const FloatingTotalsBar = ({ totals, visible, onSave, saving, activeTab, startDate, endDate }) => {
  const [expanded, setExpanded] = useState(true);
  if (!visible) return null;

  const items = [
    { label: 'AM Rendered',   value: totals.morningRendered,    group: 'regular' },
    { label: 'AM Tardiness',  value: totals.morningTardiness,   group: 'regular' },
    { label: 'PM Rendered',   value: totals.afternoonRendered,  group: 'regular' },
    { label: 'PM Tardiness',  value: totals.afternoonTardiness, group: 'regular' },
    { label: 'Overall Rend.', value: totals.overallRendered,    group: 'regular' },
    { label: 'Overall Tard.', value: totals.overallTardiness,   group: 'regular' },
    { label: 'HN Rendered',   value: totals.hnRendered,         group: 'honorarium' },
    { label: 'HN Tardiness',  value: totals.hnTardiness,        group: 'honorarium' },
    { label: 'SC Rendered',   value: totals.scRendered,         group: 'serviceCredit' },
    { label: 'SC Tardiness',  value: totals.scTardiness,        group: 'serviceCredit' },
    { label: 'OT Rendered',   value: totals.otRendered,         group: 'overtime' },
    { label: 'OT Tardiness',  value: totals.otTardiness,        group: 'overtime' },
  ];

  return (
    <Paper elevation={12} sx={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1300, borderRadius: '12px', overflow: 'hidden',
      minWidth: 340, maxWidth: 'calc(100vw - 48px)',
      boxShadow: `0 8px 40px ${alpha(T.accent, 0.35)}, 0 2px 10px ${alpha(T.accent, 0.12)}`,
      border: `1.5px solid ${T.accentBorder}`,
      bgcolor: '#fff',
      backdropFilter: 'blur(20px)',
      transition: 'all 0.25s ease',
    }}>
      {/* Bar header */}
      <Box
        onClick={() => setExpanded(p => !p)}
        sx={{
          px: 2.5, py: 1.25,
          background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentDark} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <WorkHistory sx={{ color: '#fff', fontSize: 14 }} />
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.74rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Attendance Summary
          </Typography>
          {startDate && endDate && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, px: 1, py: 0.2, borderRadius: '5px', bgcolor: 'rgba(255,255,255,0.18)' }}>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.67rem', fontFamily: 'monospace' }}>
                {startDate} – {endDate}
              </Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ color: '#fff', display: 'flex', alignItems: 'center' }}>
          {expanded ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{
          px: 2, py: 1.75,
          display: 'flex', flexWrap: 'nowrap', gap: 1, alignItems: 'stretch',
          overflowX: 'auto',
          '&::-webkit-scrollbar': { height: 4 },
          '&::-webkit-scrollbar-thumb': { background: T.accentBorder, borderRadius: 2 },
        }}>
          {items.map(({ label, value, group }) => {
            const isActive = group === activeTab;
            const isTard = label.includes('Tardiness') || label.includes('Tard.');
            return (
              <Box key={label} sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                minWidth: 82, px: 1, py: 1, borderRadius: '8px',
                bgcolor: isActive
                  ? (isTard ? 'rgba(153,27,27,0.12)' : T.accentFaint)
                  : (isTard ? 'rgba(153,27,27,0.05)' : T.accentFaint),
                border: `1px solid ${isActive ? T.accent : T.accentBorder}`,
                boxShadow: isActive ? `0 0 10px ${alpha(T.accent, 0.22)}` : 'none',
                transform: isActive ? 'translateY(-2px) scale(1.03)' : 'none',
                transition: 'all 0.2s ease',
              }}>
                <Typography sx={{
                  fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.05em', mb: 0.25, textAlign: 'center', lineHeight: 1.2,
                  color: isActive ? T.accent : T.faint,
                }}>
                  {label}
                </Typography>
                <Typography sx={{
                  fontSize: isActive ? '0.95rem' : '0.88rem', fontWeight: 800,
                  color: isTard ? '#991b1b' : '#166534',
                  fontFamily: 'monospace', letterSpacing: '0.04em',
                  transition: 'all 0.2s',
                }}>
                  {value || '00:00:00'}
                </Typography>
              </Box>
            );
          })}

          {/* Save button */}
          <Box
            onClick={!saving ? onSave : undefined}
            sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minWidth: 120, px: 1.5, py: 1, borderRadius: '8px',
              bgcolor: T.accent, border: `1px solid ${T.accent}`,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              boxShadow: `0 4px 14px ${alpha(T.accent, 0.35)}`,
              flexShrink: 0, transition: 'all 0.18s ease',
              '&:hover': !saving ? { boxShadow: `0 6px 20px ${alpha(T.accent, 0.5)}`, transform: 'translateY(-1px)' } : {},
            }}
          >
            {saving
              ? <CircularProgress size={16} sx={{ color: '#fff', mb: 0.3 }} />
              : <SaveAs sx={{ color: '#fff', fontSize: 16, mb: 0.3 }} />
            }
            <Typography sx={{ fontSize: '0.7rem', color: '#fff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', lineHeight: 1.2 }}>
              {saving ? 'Saving…' : 'Save Record'}
            </Typography>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};

// ─── Sticky Scrollbar ─────────────────────────────────────────────────────
const StickyScrollbar = ({ innerRef }) => {
  const proxyRef   = useRef(null);
  const ghostRef   = useRef(null);
  const syncingRef = useRef(false);
  useEffect(() => {
    const inner = innerRef.current;
    const proxy = proxyRef.current;
    const ghost = ghostRef.current;
    if (!inner || !proxy || !ghost) return;
    const updateWidth = () => { ghost.style.width = inner.scrollWidth + 'px'; };
    const ro = new ResizeObserver(updateWidth);
    ro.observe(inner);
    updateWidth();
    const onInnerScroll = () => { if (syncingRef.current) return; syncingRef.current = true; proxy.scrollLeft = inner.scrollLeft; syncingRef.current = false; };
    const onProxyScroll = () => { if (syncingRef.current) return; syncingRef.current = true; inner.scrollLeft = proxy.scrollLeft; syncingRef.current = false; };
    inner.addEventListener('scroll', onInnerScroll);
    proxy.addEventListener('scroll', onProxyScroll);
    return () => { inner.removeEventListener('scroll', onInnerScroll); proxy.removeEventListener('scroll', onProxyScroll); ro.disconnect(); };
  }, [innerRef]);
  return (
    <Box ref={proxyRef} sx={{ position: 'sticky', bottom: 0, left: 0, width: '100%', zIndex: 10, overflowX: 'auto', overflowY: 'hidden', height: 16, bgcolor: '#fff', borderTop: `1px solid ${T.divider}`, '&::-webkit-scrollbar': { height: 12 }, '&::-webkit-scrollbar-track': { background: T.accentFaint, borderRadius: 4 }, '&::-webkit-scrollbar-thumb': { background: T.accentMid, borderRadius: 4, '&:hover': { background: T.accent } } }}>
      <Box ref={ghostRef} sx={{ height: 1 }} />
    </Box>
  );
};

// ─── Styled Modal ─────────────────────────────────────────────────────────
const StyledModal = ({ open, onClose, title, message, type = 'info', onConfirm, showCancel = false }) => {
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
      {/* Header */}
      <Box sx={{ px: 3, py: 3, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle,${alpha(T.accent,0.1)} 0%,transparent 70%)`, pointerEvents: 'none' }} />
        <IconButton size="small" onClick={onClose} sx={{ position: 'absolute', top: 12, right: 12, color: T.accent, opacity: 0.45, '&:hover': { opacity: 1, bgcolor: T.accentFaint } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
          <Avatar sx={{ bgcolor: cfg.avatarBg, width: 48, height: 48, border: `1px solid ${T.accentBorder}` }}>
            {cfg.icon}
          </Avatar>
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

      {/* Body */}
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
          return (
            <Typography key={i} sx={{ fontSize: '0.88rem', color: T.muted, lineHeight: 1.8, fontWeight: 500, mb: i < lines.length - 1 ? 1 : 0 }}>{line}</Typography>
          );
        })}
      </Box>

      {/* Footer */}
      <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        {showCancel && (
          <RowBtn icon={null} label="Cancel" color={T.muted} hoverBg="rgba(0,0,0,0.05)" onClick={onClose} />
        )}
        <button
          onClick={onConfirm || onClose}
          style={{
            background: T.accent, color: '#fff', border: 'none', borderRadius: '8px',
            padding: '8px 24px', fontWeight: 700, fontSize: '0.82rem',
            fontFamily: 'inherit', cursor: 'pointer', transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = T.accentDark; }}
          onMouseLeave={e => { e.currentTarget.style.background = T.accent; }}
        >
          {showCancel ? 'Confirm' : 'OK'}
        </button>
      </Box>
    </Dialog>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
const AttendanceModuleNonTeachingStaff = () => {
  const { settings }          = useSystemSettings();
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [startDate, setStartDate]           = useState('');
  const [endDate, setEndDate]               = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading]               = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState('');
  const [pageLoading, setPageLoading]       = useState(true);
  const [activeTab, setActiveTab]           = useState('regular');
  const [showScrollTop, setShowScrollTop]   = useState(false);

  const [suspensionByDate, setSuspensionByDate] = useState({});
  const [leaveByDate, setLeaveByDate]           = useState({});
  const [holidayByDate, setHolidayByDate]       = useState({});

  const navigate     = useNavigate();
  const resultsRef   = useRef(null);
  const tableBodyRef = useRef(null);

  const { hasAccess, loading: accessLoading } = usePageAccess('attendance-module');

  const currentYear = new Date().getFullYear();
  const months      = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear());
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const [snackbar, setSnackbar]                   = useState({ open: false, message: '', severity: 'success' });
  const [snackbarCountdown, setSnackbarCountdown] = useState(6);

  const showSnackbar = (message, severity = 'success') => { setSnackbar({ open: true, message, severity }); setSnackbarCountdown(6); };
  const handleCloseSnackbar = () => setSnackbar((p) => ({ ...p, open: false }));

  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'info', onConfirm: null, showCancel: false });
  const showModal = (title, message, type = 'info', onConfirm = null, showCancel = false) =>
    setModal({ open: true, title, message, type, onConfirm, showCancel });
  const closeModal = () => setModal((p) => ({ ...p, open: false }));

  useEffect(() => {
    let timer;
    if (snackbar.open && snackbarCountdown > 0)
      timer = setInterval(() => setSnackbarCountdown(p => p - 1), 1000);
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
      if (resultsRef.current) resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
    return () => clearTimeout(timer);
  }, [attendanceData]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  };

  const getStatusLabelForDate = useCallback((date) => {
    if (suspensionByDate?.[date]) return 'WORK SUSPENDED';
    if (holidayByDate?.[date])    return 'HOLIDAY';
    if (leaveByDate?.[date])      return 'ON LEAVE';
    return '';
  }, [suspensionByDate, holidayByDate, leaveByDate]);

  // ── Segment calculator ─────────────────────────────────────────────────
  const calcSegment = (startStr, endStr, officialStartStr, officialEndStr) => {
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
      if (mer) { if (hh === 12) hh = 0; if (mer === 'PM') hh += 12; }
      return hh * 3600 + mm * 60 + ss;
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
    const startSec    = parseTimeToSeconds(startStr);
    const endSecRaw   = parseTimeToSeconds(endStr);
    const offStartSec = parseTimeToSeconds(officialStartStr);
    const offEndSecRaw = parseTimeToSeconds(officialEndStr);
    if (offStartSec == null || offEndSecRaw == null)
      return { rendered: '00:00:00', maxRendered: '00:00:00', tardiness: '00:00:00' };
    const offEndSec = normalizeEnd(offStartSec, offEndSecRaw);
    const endSec    = normalizeEnd(startSec ?? offStartSec, endSecRaw);
    const maxRenderedSec = Math.max(0, offEndSec - offStartSec);
    let renderedSec = 0;
    if (startSec != null && endSec != null) {
      const effectiveStart = Math.max(startSec, offStartSec);
      const effectiveEnd   = Math.min(endSec, offEndSec);
      renderedSec = Math.max(0, effectiveEnd - effectiveStart);
    }
    const tardinessSec = Math.max(0, maxRenderedSec - renderedSec);
    return { rendered: formatSeconds(renderedSec), maxRendered: formatSeconds(maxRenderedSec), tardiness: formatSeconds(tardinessSec) };
  };

  // ── handleSubmit ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    localStorage.setItem('attendanceNonTeachingEmployeeNumber', employeeNumber);
    localStorage.setItem('attendanceNonTeachingStartDate', startDate);
    localStorage.setItem('attendanceNonTeachingEndDate', endDate);
    setLoading(true); setError('');
    try {
      const deviceCheck = await axios.post(
        `${API_BASE_URL}/attendance/api/all-attendance`,
        { personID: employeeNumber, startDate, endDate },
        getAuthHeaders(),
      );
      const deviceRows = Array.isArray(deviceCheck.data) ? deviceCheck.data : [];
      if (deviceRows.length === 0) {
        setAttendanceData([]); setSuspensionByDate({}); setLeaveByDate({}); setHolidayByDate({});
        showModal('No Device Records Found', 'No biometric device records were found for this employee within the selected date range.\n\nPlease verify the employee number and date range, or check if the attendance device has synced.\n\nPress OK to open Attendance Device.', 'warning', () => { closeModal(); navigate('/view_attendance'); });
        return;
      }
      const response = await axios.get(`${API_BASE_URL}/attendance/api/attendance`, {
        params: { personId: employeeNumber, startDate, endDate },
        ...getAuthHeaders(),
      });
      const rawRows = Array.isArray(response.data) ? response.data : [];
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
        return {
          ...row,
          formattedFacultyRenderedTimeAM: am.rendered, formattedFacultyMaxRenderedTimeAM: am.maxRendered, formattedfinalcalcFacultyAM: am.tardiness,
          formattedFacultyRenderedTimePM: pm.rendered, formattedFacultyMaxRenderedTimePM: pm.maxRendered, formattedfinalcalcFacultyPM: pm.tardiness,
          formattedFacultyRenderedTimeHN: hn.rendered, formattedFacultyMaxRenderedTimeHN: hn.maxRendered, formattedfinalcalcFacultyHN: hn.tardiness,
          formattedFacultyRenderedTimeSC: sc.rendered, formattedFacultyMaxRenderedTimeSC: sc.maxRendered, formattedfinalcalcFacultySC: sc.tardiness,
          formattedFacultyRenderedTimeOT: ot.rendered, formattedFacultyMaxRenderedTimeOT: ot.maxRendered, formattedfinalcalcFacultyOT: ot.tardiness,
        };
      });
      const [suspRes, leaveRes, holidayRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/attendance/api/suspensions`, { params: { startDate, endDate }, ...getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/attendance/api/leaves`,      { params: { startDate, endDate }, ...getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/attendance/api/holiday`,     { params: { startDate, endDate }, ...getAuthHeaders() }),
      ]);
      setSuspensionByDate(suspRes.data?.byDate  || {});
      setLeaveByDate(leaveRes.data?.byDate       || {});
      setHolidayByDate(holidayRes.data?.byDate   || {});
      setAttendanceData(processedData);
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      const msg = 'Failed to fetch attendance data. Please try again.';
      setError(msg); showSnackbar(msg, 'error');
    } finally { setLoading(false); }
  };

  // ── Totals ─────────────────────────────────────────────────────────────
  const sumTime = useCallback((values) => {
    let total = 0;
    values.forEach((t) => {
      if (!t || t === 'NaN:NaN:NaN' || t === '—') return;
      const parts = t.split(':').map(Number);
      if (parts.length === 3 && parts.every(n => !isNaN(n)))
        total += parts[0] * 3600 + parts[1] * 60 + parts[2];
    });
    const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }, []);

  const addTimes = useCallback((a, b) => {
    const parse = (t) => { const [h, m, s] = (t || '00:00:00').split(':').map(Number); return h * 3600 + m * 60 + s; };
    const total = parse(a) + parse(b);
    const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }, []);

  const totals = React.useMemo(() => {
    if (!attendanceData.length) return {};
    const morningRendered    = sumTime(attendanceData.map(r => getCellValue(r, '_morningRendered',   Boolean(getStatusLabelForDate(r.date)))));
    const morningTardiness   = sumTime(attendanceData.map(r => getCellValue(r, '_morningTardiness',  Boolean(getStatusLabelForDate(r.date)))));
    const afternoonRendered  = sumTime(attendanceData.map(r => getCellValue(r, '_afternoonRendered', Boolean(getStatusLabelForDate(r.date)))));
    const afternoonTardiness = sumTime(attendanceData.map(r => getCellValue(r, '_afternoonTardiness',Boolean(getStatusLabelForDate(r.date)))));
    const overallRendered    = addTimes(morningRendered,   afternoonRendered);
    const overallTardiness   = addTimes(morningTardiness,  afternoonTardiness);
    const hnRendered  = sumTime(attendanceData.map(r => getCellValue(r, '_hnRendered',  Boolean(getStatusLabelForDate(r.date)))));
    const hnTardiness = sumTime(attendanceData.map(r => getCellValue(r, '_hnTardiness', Boolean(getStatusLabelForDate(r.date)))));
    const scRendered  = sumTime(attendanceData.map(r => getCellValue(r, '_scRendered',  Boolean(getStatusLabelForDate(r.date)))));
    const scTardiness = sumTime(attendanceData.map(r => getCellValue(r, '_scTardiness', Boolean(getStatusLabelForDate(r.date)))));
    const otRendered  = sumTime(attendanceData.map(r => getCellValue(r, '_otRendered',  Boolean(getStatusLabelForDate(r.date)))));
    const otTardiness = sumTime(attendanceData.map(r => getCellValue(r, '_otTardiness', Boolean(getStatusLabelForDate(r.date)))));
    return { morningRendered, morningTardiness, afternoonRendered, afternoonTardiness, overallRendered, overallTardiness, hnRendered, hnTardiness, scRendered, scTardiness, otRendered, otTardiness };
  }, [attendanceData, sumTime, addTimes, getStatusLabelForDate]);

  // ── Save ───────────────────────────────────────────────────────────────
  const saveOverallAttendance = async () => {
    setSaving(true);
    try {
      const dup = await axios.get(`${API_BASE_URL}/attendance/api/overall_attendance_record`, { params: { personID: employeeNumber, startDate, endDate }, ...getAuthHeaders() });
      if (dup.data?.data?.length) {
        setSaving(false);
        showModal('Duplicate Attendance Record', `The system has detected an existing attendance record for the specified period.\n\n• Employee ${employeeNumber}: ${startDate} → ${endDate}\n\nNote: This record has already been submitted and saved. To make changes, please locate and edit the existing record in the Overall Attendance Summary.`, 'warning', () => { closeModal(); navigate('/attendance_summary'); });
        return;
      }
    } catch (e) {
      console.error('Duplicate-check failed:', e);
      setSaving(false);
      showModal('Verification Failed', 'Could not verify existing records. Saving has been aborted.\n\nPlease try again or contact your administrator.', 'error');
      return;
    } finally { setSaving(false); }

    setSaving(true);
    const record = {
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
    };
    try {
      const response = await axios.post(`${API_BASE_URL}/attendance/api/overall_attendance`, record, getAuthHeaders());
      showSnackbar(response.data.message || 'Attendance record saved successfully!', 'success');
      setTimeout(() => navigate('/attendance_summary'), 1500);
    } catch (err) {
      console.error('Error saving overall attendance:', err);
      showSnackbar('Failed to save attendance record.', 'error');
    } finally { setSaving(false); }
  };

  const handleMonthClick = (monthIndex) => {
    const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const end   = new Date(Date.UTC(selectedYear, monthIndex + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex);
  };

  const handleClearFilters = () => {
    setEmployeeNumber(''); setStartDate(''); setEndDate('');
    setAttendanceData([]); setError(''); setSelectedMonth(null);
    setSuspensionByDate({}); setLeaveByDate({}); setHolidayByDate({});
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // ── Guards ────────────────────────────────────────────────────────────
  if (pageLoading || accessLoading) return <AttendanceNonTeachingWireframe />;
  if (hasAccess === false) return (
    <AccessDenied title="Access Denied" message="You do not have permission to access Attendance Module for Non-Teaching Staff. Contact your administrator to request access." returnPath="/admin-home" returnButtonText="Return to Home" />
  );

  const columns = TAB_COLUMNS[activeTab];

  // ─── Table cell builder ───────────────────────────────────────────────
  const buildCell = (content, group, isEven, dividerBefore = false) => (
    <TableCell sx={{
      fontSize: '0.8rem', fontFamily: 'monospace',
      borderBottom: `1px solid ${T.divider}`,
      borderLeft: group === 'actual'
        ? `3px solid ${alpha(T.accent, 0.4)}`
        : dividerBefore ? `2px solid ${T.accentBorder}` : 'none',
      px: 1.75, py: 1, whiteSpace: 'nowrap', textAlign: 'center',
      fontWeight: group === 'calc' || group === 'tard' || group === 'actual' ? 700 : 400,
      color: group === 'calc' ? '#166534' : group === 'tard' ? '#991b1b' : group === 'official' ? '#374151' : '#111827',
      bgcolor:
        group === 'actual'   ? (isEven ? alpha(T.accent,0.07) : alpha(T.accent,0.12)) :
        group === 'calc'     ? (isEven ? 'rgba(21,128,61,0.05)'  : 'rgba(21,128,61,0.09)') :
        group === 'tard'     ? (isEven ? 'rgba(153,27,27,0.04)'  : 'rgba(153,27,27,0.08)') :
        isEven ? '#fff' : T.rowOdd,
      transition: 'background-color 0.12s',
      'tr:hover &': { bgcolor: T.rowHover + ' !important' },
    }}>{content}</TableCell>
  );

  // ─── Two-row sticky header ────────────────────────────────────────────
  // Derive group spans dynamically from column definitions
  const buildGroupSpans = (cols) => {
    const groups = [];
    let cur = null;
    cols.forEach(col => {
      if (!cur || cur.group !== col.group) {
        const labels = {
          meta:     '',
          actual:   'Employee Device Records',
          official: 'Official Schedule',
          calc:     'Rendered',
          tard:     'Tardiness',
        };
        cur = { label: labels[col.group] || '', group: col.group, span: 1, dividerBefore: col.dividerBefore };
        groups.push(cur);
      } else {
        cur.span++;
      }
    });
    return groups;
  };

  const hBg  = (g) => g === 'actual' ? alpha(T.accent,0.12) : g === 'official' ? alpha(T.accent,0.05) : g === 'calc' ? 'rgba(21,128,61,0.09)' : g === 'tard' ? 'rgba(153,27,27,0.09)' : alpha(T.accent,0.03);
  const hBg2 = (g) => g === 'actual' ? alpha(T.accent,0.08) : g === 'official' ? alpha(T.accent,0.03) : g === 'calc' ? 'rgba(21,128,61,0.06)' : g === 'tard' ? 'rgba(153,27,27,0.06)' : alpha(T.accent,0.02);

  const buildTwoRowHead = (cols) => {
    const groupSpans = buildGroupSpans(cols);
    return (
      <TableHead>
        <TableRow>
          {groupSpans.map(({ label, span, group, dividerBefore }, gi) => (
            <TableCell key={gi} colSpan={span} sx={{
              textAlign: 'center', fontWeight: 700, fontSize: '0.62rem',
              letterSpacing: '0.07em', textTransform: 'uppercase',
              py: 0.85, px: 1.75, whiteSpace: 'nowrap',
              position: 'sticky', top: 0, zIndex: 3,
              borderBottom: `1px solid ${T.accentBorder}`,
              borderLeft: dividerBefore ? `2px solid ${alpha(T.accent,0.3)}` : 'none',
              bgcolor: hBg(group),
              color: group === 'actual' ? T.accent : group === 'calc' ? '#166534' : group === 'tard' ? '#991b1b' : 'transparent',
            }}>{label}</TableCell>
          ))}
        </TableRow>
        <TableRow>
          {cols.map(({ label, minWidth, group, dividerBefore }) => (
            <TableCell key={label} sx={{
              minWidth: minWidth || 120, textAlign: 'center',
              position: 'sticky', top: 32, zIndex: 2,
              fontSize: '0.65rem', fontWeight: 700,
              py: 0.85, px: 1.75, whiteSpace: 'nowrap', letterSpacing: '0.06em', textTransform: 'uppercase',
              borderBottom: `2px solid ${alpha(T.accent,0.25)}`,
              borderLeft: dividerBefore ? `2px solid ${alpha(T.accent,0.3)}` : 'none',
              bgcolor: hBg2(group), color: '#fff',
              background: group === 'actual' ? T.accent : group === 'calc' ? '#166534' : group === 'tard' ? '#991b1b' : group === 'official' ? T.accentMid : T.accentDark,
            }}>{label}</TableCell>
          ))}
        </TableRow>
      </TableHead>
    );
  };

  // ─── Totals row (overall for regular tab) ─────────────────────────────
  const renderTotalsRow = (cols, leftLabel, renderedVal, tardinessVal) => {
    const calcCols  = cols.filter(c => c.group === 'calc' || c.group === 'tard');
    const nonCalc   = cols.length - calcCols.length;
    return (
      <TableRow sx={{ bgcolor: T.accentFaint, borderTop: `2px solid ${T.accentBorder}` }}>
        <TableCell colSpan={nonCalc} sx={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.faint, textAlign: 'right', pr: 2.5, py: 1.25, borderBottom: 'none' }}>
          {leftLabel}
        </TableCell>
        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.88rem', color: '#166534', textAlign: 'center', py: 1.25, borderBottom: 'none', borderLeft: `2px solid ${T.accentBorder}`, bgcolor: 'rgba(21,128,61,0.07)' }}>
          {renderedVal || '00:00:00'}
        </TableCell>
        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.88rem', color: '#991b1b', textAlign: 'center', py: 1.25, borderBottom: 'none', bgcolor: 'rgba(153,27,27,0.07)' }}>
          {tardinessVal || '00:00:00'}
        </TableCell>
      </TableRow>
    );
  };

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <Fade in timeout={400}>
      <Box sx={{
        py: { xs: 1, md: 2 },
        mt: { xs: 0, md: -2 },
        mb: { xs: 1, md: 2 },
        width: '100vw', maxWidth: '100%',
        position: 'relative', left: '53%',
        transform: 'translateX(-51%)',
        px: { xs: 2, sm: 3, md: 6 },
        pb: attendanceData.length > 0 ? '160px' : undefined,
      }}>
        <style>{shimmerKf}</style>

        {/* ── Snackbar ── */}
        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled"
            sx={{ width: '100%', fontWeight: 600, backgroundColor: snackbar.severity === 'success' ? '#4caf50' : undefined, color: snackbar.severity === 'success' ? '#ffffff' : undefined, '& .MuiAlert-icon': { color: snackbar.severity === 'success' ? '#ffffff' : undefined } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>{snackbar.message}</span>
              {snackbar.open && snackbarCountdown > 0 && (
                <Chip label={`${snackbarCountdown}s`} size="small"
                  sx={{ backgroundColor: snackbar.severity === 'success' ? 'rgba(255,255,255,0.3)' : undefined, color: snackbar.severity === 'success' ? '#ffffff' : undefined, fontWeight: 700 }} />
              )}
            </Box>
          </Alert>
        </Snackbar>

        {/* ── Page Header ── */}
        <SectionCard sx={{ mb: 2 }}>
          <Box sx={{
            px: 4, py: 3,
            background: 'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'relative', overflow: 'hidden',
          }}>
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.10) 0%,transparent 70%)' }} />
            <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)' }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, position: 'relative', zIndex: 1 }}>
              <WorkHistory sx={{ fontSize: 30, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.25 }}>
                  Attendance Records (Non-Teaching)
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', color: T.accentMid, fontWeight: 600 }}>
                  Non-Teaching Staff · Generate and review attendance records
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
              <Box sx={{ px: 2, py: 0.6, borderRadius: 5, bgcolor: alpha('#4caf50', 0.12), border: '1px solid rgba(76,175,80,0.25)' }}>
                <Typography sx={{ fontSize: '0.72rem', color: '#2e7d32', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CheckCircleIcon sx={{ fontSize: 12 }} /> Non-Teaching
                </Typography>
              </Box>
              <button
                onClick={handleSubmit}
                disabled={!employeeNumber || !startDate || !endDate}
                style={{
                  background: alpha(T.accent, 0.08),
                  border: `1px solid ${T.accentBorder}`,
                  borderRadius: '8px', padding: '7px 10px',
                  cursor: (!employeeNumber || !startDate || !endDate) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  color: T.accent, fontSize: '0.75rem', fontWeight: 700,
                  fontFamily: 'inherit', transition: 'all 0.15s',
                  opacity: (!employeeNumber || !startDate || !endDate) ? 0.5 : 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = alpha(T.accent, 0.14); }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = alpha(T.accent, 0.08); }}
              >
                <Refresh sx={{ fontSize: 15 }} /> Refresh
              </button>
            </Box>
          </Box>
        </SectionCard>

        {/* ── Alerts ── */}
        <Collapse in={!!error}>
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.82rem' }}>{error}</Alert>
        </Collapse>

        {/* ── Controls Card ── */}
        <SectionCard sx={{ mb: 2 }}>
          <PanelHeader icon={FilterList} title="Filter Attendance Records" />

          <Box sx={{ px: 2.5, pt: 2, pb: 2.5 }}>
            {/* Input row */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Employee Number
                </Typography>
                <NativeInput
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                  placeholder="Employee number"
                  icon={<Person sx={{ fontSize: 16 }} />}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Start Date
                </Typography>
                <NativeInput
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  icon={<CalendarToday sx={{ fontSize: 15 }} />}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  End Date
                </Typography>
                <NativeInput
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  icon={<CalendarToday sx={{ fontSize: 15 }} />}
                />
              </Box>
            </Box>

            <Box sx={{ height: 1, bgcolor: T.divider, mb: 2 }} />

            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, mb: 1.25, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <FilterList sx={{ fontSize: 13 }} />
              Quick Date Selection
            </Typography>

            {/* Month picker */}
            <Box sx={{ p: 2.5, borderRadius: 2, border: `2px dashed ${T.accentBorder}`, bgcolor: T.accentFaint }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: T.accent, mb: 0.3 }}>
                    Select Entire Month
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>
                    Choose a year, then click any month to set the date range
                  </Typography>
                </Box>
                <FormControl sx={{ minWidth: 130 }} size="small">
                  <InputLabel sx={{ fontWeight: 600, fontSize: '0.8rem' }}>Year</InputLabel>
                  <Select
                    value={selectedYear}
                    label="Year"
                    onChange={(e) => { setSelectedYear(e.target.value); setSelectedMonth(null); showSnackbar('Year changed — please click a month to load records.', 'info'); }}
                    sx={{ bgcolor: '#fff', borderRadius: 2, fontWeight: 600, fontSize: '0.85rem', '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder } }}
                  >
                    {yearOptions.map(y => <MenuItem key={y} value={y} sx={{ fontSize: '0.85rem' }}>{y}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, justifyContent: 'center' }}>
                {months.map((month, index) => {
                  const sel = selectedMonth === index;
                  return (
                    <button
                      key={month}
                      onClick={() => handleMonthClick(index)}
                      style={{
                        background: sel ? T.accent : '#fff',
                        border: `1px solid ${sel ? T.accent : T.accentBorder}`,
                        borderRadius: '6px', padding: '7px 14px',
                        cursor: 'pointer',
                        color: sel ? '#fff' : T.accent,
                        fontSize: '0.75rem', fontWeight: 700,
                        fontFamily: 'inherit',
                        transition: 'all 0.15s ease',
                        boxShadow: sel ? `0 2px 8px ${alpha(T.accent,0.25)}` : 'none',
                        letterSpacing: '0.04em',
                      }}
                      onMouseEnter={e => { if (!sel) { e.currentTarget.style.backgroundColor = T.accentFaint; e.currentTarget.style.borderColor = T.accent; }}}
                      onMouseLeave={e => { if (!sel) { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = T.accentBorder; }}}
                    >
                      {month}
                    </button>
                  );
                })}
              </Box>
            </Box>

            {/* Clear + Search */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, flexWrap: 'wrap', gap: 1 }}>
              <RowBtn icon={<Clear sx={{ fontSize: 13 }} />} label="Clear All Filters" color="#C62828" hoverBg="rgba(198,40,40,0.08)" onClick={handleClearFilters} />
              <RowBtn
                icon={loading ? <CircularProgress size={12} sx={{ color: T.accent }} /> : <Search sx={{ fontSize: 13 }} />}
                label={loading ? 'Loading…' : 'Search Records'}
                color={T.accent}
                hoverBg={T.accentFaint}
                disabled={!employeeNumber || !startDate || !endDate || loading}
                onClick={handleSubmit}
              />
            </Box>
          </Box>
        </SectionCard>

        {/* ── Loading indicator ── */}
        {loading && (
          <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CircularProgress size={16} sx={{ color: T.accent }} />
            <Typography sx={{ fontSize: '0.78rem', color: T.muted }}>Fetching attendance records…</Typography>
          </Box>
        )}

        {/* ── Results Card ── */}
        {attendanceData.length > 0 && (
          <Fade in={!loading} timeout={400}>
            <SectionCard ref={resultsRef} sx={{ mb: 2 }}>
              <PanelHeader
                icon={Assignment}
                title={`Records for ${employeeNumber}`}
                rightContent={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>
                      {startDate} → {endDate}
                    </Typography>
                    <Box sx={{ px: 1.5, py: 0.3, borderRadius: 5, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.18)}` }}>
                      <Typography sx={{ fontSize: '0.72rem', color: T.accent, fontWeight: 700 }}>
                        {attendanceData.length} {attendanceData.length === 1 ? 'record' : 'records'}
                      </Typography>
                    </Box>
                  </Box>
                }
              />

              {/* Tab switcher */}
              <Box sx={{ px: 2.5, pt: 2 }}>
                <Box sx={{ display: 'flex', border: `1px solid ${T.accentBorder}`, borderRadius: '8px', overflow: 'hidden', mb: 2 }}>
                  {VIEW_TABS.map(({ key, label, icon }, i, arr) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      style={{
                        flex: 1, border: 'none',
                        borderRight: i < arr.length - 1 ? `1px solid ${T.accentBorder}` : 'none',
                        borderRadius: 0, padding: '8px 12px',
                        cursor: 'pointer',
                        background: activeTab === key ? T.accent : 'transparent',
                        color: activeTab === key ? '#fff' : T.accent,
                        fontSize: '0.78rem', fontWeight: 700,
                        fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => { if (activeTab !== key) e.currentTarget.style.backgroundColor = T.accentFaint; }}
                      onMouseLeave={e => { if (activeTab !== key) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {icon}{label}
                    </button>
                  ))}
                </Box>
              </Box>

              {/* Table */}
              <Box sx={{ px: 2.5, pb: 2.5 }}>
                <Box sx={{ position: 'relative', borderRadius: '8px', border: `1px solid ${T.accentBorder}`, overflow: 'hidden' }}>
                  <Box
                    ref={tableBodyRef}
                    sx={{
                      overflowX: 'auto', overflowY: 'auto', maxHeight: 500,
                      scrollbarWidth: 'thin',
                      '&::-webkit-scrollbar': { height: 6, width: 6 },
                      '&::-webkit-scrollbar-track': { background: T.accentFaint, borderRadius: 4 },
                      '&::-webkit-scrollbar-thumb': { background: T.accentMid, borderRadius: 4 },
                    }}
                  >
                    <Table sx={{ minWidth: columns.reduce((s, c) => s + (c.minWidth || 120), 0), borderCollapse: 'collapse' }}>
                      {buildTwoRowHead(columns)}
                      <TableBody>
                        {attendanceData.map((row, index) => {
                          const statusLabel = getStatusLabelForDate(row.date);
                          const isFurlough  = Boolean(statusLabel);
                          const isEven      = index % 2 === 0;
                          return (
                            <TableRow key={index} sx={{ '&:hover td': { bgcolor: `${T.rowHover} !important` } }}>
                              {columns.map(({ key, group, dividerBefore: db }) => {
                                if (key === 'date') {
                                  return (
                                    <TableCell key={key} sx={{ fontSize: '0.8rem', fontWeight: 600, color: T.text, bgcolor: isEven ? '#fff' : T.rowOdd, borderBottom: `1px solid ${T.divider}`, px: 1.75, py: 1, whiteSpace: 'nowrap', textAlign: 'center', transition: 'background-color 0.12s' }}>
                                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.3 }}>
                                        <span>{row.date}</span>
                                        {statusLabel && <Chip size="small" label={statusLabel} sx={{ fontWeight: 700, fontSize: '0.62rem', height: 16, ...getStatusStyle(statusLabel) }} />}
                                      </Box>
                                    </TableCell>
                                  );
                                }
                                if (key === 'day') {
                                  return (
                                    <TableCell key={key} sx={{ fontSize: '0.8rem', color: T.muted, bgcolor: isEven ? '#fff' : T.rowOdd, borderBottom: `1px solid ${T.divider}`, px: 1.75, py: 1, textAlign: 'center', transition: 'background-color 0.12s' }}>
                                      {row.day}
                                    </TableCell>
                                  );
                                }
                                return (
                                  <React.Fragment key={key}>
                                    {buildCell(getCellValue(row, key, isFurlough), group, isEven, db)}
                                  </React.Fragment>
                                );
                              })}
                            </TableRow>
                          );
                        })}

                        {/* Regular tab: AM totals, PM totals, Overall row */}
                        {activeTab === 'regular' && <>
                          {renderTotalsRow(columns, `Morning Total  (${startDate} – ${endDate})`, totals.morningRendered, totals.morningTardiness)}
                          {renderTotalsRow(columns, `Afternoon Total  (${startDate} – ${endDate})`, totals.afternoonRendered, totals.afternoonTardiness)}
                          <TableRow sx={{ bgcolor: alpha(T.accent, 0.08), borderTop: `2px solid ${T.accent}` }}>
                            <TableCell colSpan={columns.length - 2} sx={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.accent, textAlign: 'right', pr: 2.5, py: 1.5, borderBottom: 'none' }}>
                              Overall Rendered Time ({startDate} – {endDate})
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.95rem', color: '#166534', textAlign: 'center', py: 1.5, borderBottom: 'none', borderLeft: `2px solid ${T.accentBorder}`, bgcolor: 'rgba(21,128,61,0.10)' }}>
                              {totals.overallRendered || '00:00:00'}
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.95rem', color: '#991b1b', textAlign: 'center', py: 1.5, borderBottom: 'none', bgcolor: 'rgba(153,27,27,0.10)' }}>
                              {totals.overallTardiness || '00:00:00'}
                            </TableCell>
                          </TableRow>
                        </>}

                        {/* Other tabs: single totals row */}
                        {activeTab !== 'regular' && (() => {
                          const rendMap  = { honorarium: totals.hnRendered,  serviceCredit: totals.scRendered,  overtime: totals.otRendered  };
                          const tardMap  = { honorarium: totals.hnTardiness, serviceCredit: totals.scTardiness, overtime: totals.otTardiness };
                          return renderTotalsRow(columns, `Overall Rendered Time (${startDate} – ${endDate})`, rendMap[activeTab], tardMap[activeTab]);
                        })()}
                      </TableBody>
                    </Table>
                  </Box>
                </Box>

                {/* Footer legend */}
                <Box sx={{ pt: 1.5, display: 'flex', gap: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
                  {[
                    { icon: <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: alpha(T.accent, 0.12), border: `1px solid ${alpha(T.accent, 0.3)}` }} />, label: 'Employee device punch-in/out' },
                    { icon: <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: 'rgba(21,128,61,0.1)', border: '1px solid rgba(21,128,61,0.3)' }} />, label: 'Computed rendered time' },
                    { icon: <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: 'rgba(153,27,27,0.08)', border: '1px solid rgba(153,27,27,0.3)' }} />, label: 'Computed tardiness' },
                  ].map((item, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                      {item.icon}
                      <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>{item.label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </SectionCard>
          </Fade>
        )}

        {/* ── Floating Totals + Save Bar ── */}
        <FloatingTotalsBar
          totals={totals}
          visible={attendanceData.length > 0}
          onSave={saveOverallAttendance}
          saving={saving}
          activeTab={activeTab}
          startDate={startDate}
          endDate={endDate}
        />

        {/* ── Styled Modal ── */}
        <StyledModal
          open={modal.open}
          onClose={closeModal}
          title={modal.title}
          message={modal.message}
          type={modal.type}
          onConfirm={modal.onConfirm}
          showCancel={modal.showCancel}
        />

        {/* ── Scroll to Top FAB ── */}
        <Zoom in={showScrollTop}>
          <Fab
            size="small"
            sx={{ position: 'fixed', bottom: 24, right: 45, zIndex: 1000, bgcolor: T.accent, color: '#fff', '&:hover': { bgcolor: T.accentDark }, boxShadow: `0 4px 14px ${alpha(T.accent, 0.35)}` }}
            onClick={scrollToTop}
          >
            <KeyboardArrowUp />
          </Fab>
        </Zoom>

      </Box>
    </Fade>
  );
};

export default AttendanceModuleNonTeachingStaff;