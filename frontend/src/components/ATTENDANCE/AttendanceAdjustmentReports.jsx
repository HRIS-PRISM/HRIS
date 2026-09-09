import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { sortEmployeesByLastName } from '../../utils/sortEmployeesByLastName';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Box, Typography, Card, CircularProgress, Fade,
  FormControl, Select, MenuItem, Tooltip, Avatar,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TablePagination, alpha, styled, Collapse,
  Tabs, Tab,
} from '@mui/material';
import {
  EditCalendar as EditCalendarIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  CalendarToday as CalendarTodayIcon,
  Print as PrintIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Groups as GroupsIcon,
  East as EastIcon,
  Notes as NotesIcon,
  ArrowBackIos as ArrowBackIosIcon,
  EventAvailable as EventAvailableIcon,
  Edit as EditIcon,
  TableChart as TableChartIcon,
  Insights as InsightsIcon,
  Fingerprint as FingerprintIcon,
  ListAlt as ListAltIcon,
  PersonOff as PersonOffIcon,
  FileDownload as FileDownloadIcon,
} from '@mui/icons-material';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip,
} from 'recharts';

// ─── Poppins font import ───────────────────────────────────────────────────
const poppinsImport = `@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');`;

// ─── Theme tokens ─────────────────────────────────────────────────────────
const T = {
  accent:       '#6d2323',
  accentDark:   '#5a1d1d',
  accentMid:    '#8B4545',
  accentFaint:  'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover:  'rgba(109,35,35,0.055)',
  rowEven:      '#ffffff',
  rowOdd:       'rgba(109,35,35,0.025)',
  rowHover:     'rgba(109,35,35,0.055)',
  text:         '#1a1a1a',
  muted:        '#6b6b6b',
  faint:        '#a0a0a0',
  surface:      '#ffffff',
  divider:      'rgba(0,0,0,0.08)',
  font:         "'Poppins', sans-serif",
};

// ─── Shimmer keyframes ────────────────────────────────────────────────────
const shimmerKf = `
${poppinsImport}
* { font-family: 'Poppins', sans-serif !important; }
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

// ─── Styled primitives ────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: '#fff',
  fontFamily: "'Poppins', sans-serif",
});

const scrollbarSx = {
  '&::-webkit-scrollbar': { width: 4, height: 4 },
  '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
  '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
};

const NativeInput = ({ value, onChange, type = 'text', placeholder, disabled, icon }) => (
  <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
    {icon && (
      <Box sx={{ position: 'absolute', left: 10, color: T.accentMid, display: 'flex', alignItems: 'center', zIndex: 1, pointerEvents: 'none' }}>
        {icon}
      </Box>
    )}
    <input
      type={type} value={value} onChange={onChange}
      placeholder={placeholder} disabled={disabled}
      style={{
        width: '100%',
        padding: icon ? '8px 12px 8px 32px' : '8px 12px',
        borderRadius: '8px', border: `1px solid ${T.accentBorder}`,
        fontSize: '0.82rem', outline: 'none', fontFamily: T.font,
        boxSizing: 'border-box', transition: 'border-color 0.18s',
        background: disabled ? '#f5f5f5' : '#fff', color: T.text,
        cursor: disabled ? 'not-allowed' : 'text',
      }}
      onFocus={e => { if (!disabled) { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 1.5px ${T.accent}22`; } }}
      onBlur={e  => { e.target.style.borderColor = T.accentBorder; e.target.style.boxShadow = 'none'; }}
    />
  </Box>
);

const selectSx = {
  borderRadius: '8px', fontSize: '0.82rem', bgcolor: '#fff', fontFamily: T.font,
  '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accent },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.accent, borderWidth: '1.5px' },
};
const menuItemSx = { fontSize: '0.82rem', fontFamily: T.font };

// ─── Source Badge ─────────────────────────────────────────────────────────
const SourceBadge = ({ autofillRemarks }) => {
  const isAutoFill = !!autofillRemarks;
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      px: '8px', py: '3px', borderRadius: '4px',
      bgcolor: isAutoFill ? alpha('#6d2323', 0.07) : alpha('#1565c0', 0.07),
      border: `1px solid ${isAutoFill ? alpha('#6d2323', 0.2) : alpha('#1565c0', 0.2)}`,
    }}>
      {isAutoFill
        ? <EventAvailableIcon sx={{ fontSize: 11, color: '#6d2323' }} />
        : <EditIcon           sx={{ fontSize: 11, color: '#1565c0' }} />}
      <Typography sx={{ fontSize: '0.64rem', fontWeight: 800, fontFamily: T.font, color: isAutoFill ? '#6d2323' : '#1565c0', whiteSpace: 'nowrap' }}>
        {isAutoFill ? 'AUTO-FILL' : 'MANUAL'}
      </Typography>
    </Box>
  );
};

// ─── Adjustment Type Badge ────────────────────────────────────────────────
const adjTypeConfig = {
  'Time In':       { color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  'Time Out':      { color: '#065f46', bg: '#ecfdf5', border: '#a7f3d0' },
  'Breaktime In':  { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  'Breaktime Out': { color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
  'Manual Entry':  { color: '#92400e', bg: '#fefce8', border: '#fef08a' },
};
const AdjTypeBadge = ({ type }) => {
  const cfg = adjTypeConfig[type] || adjTypeConfig['Manual Entry'];
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', px: '10px', py: '3px', borderRadius: '4px', bgcolor: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: cfg.color, whiteSpace: 'nowrap', fontFamily: T.font }}>{type}</Typography>
    </Box>
  );
};

// ─── Op Type Badge ────────────────────────────────────────────────────────
const OpTypeBadge = ({ type }) => {
  const isInsert = type === 'INSERT';
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', px: '8px', py: '2px', borderRadius: '4px',
      bgcolor: isInsert ? alpha('#f59e0b', 0.12) : alpha('#6d2323', 0.08),
      border: `1px solid ${isInsert ? alpha('#f59e0b', 0.35) : alpha('#6d2323', 0.2)}`,
    }}>
      <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, fontFamily: T.font, color: isInsert ? '#92400e' : T.accent }}>
        {isInsert ? 'NEW' : 'EDIT'}
      </Typography>
    </Box>
  );
};

// ─── Before → After ───────────────────────────────────────────────────────
const BeforeAfter = ({ before, after }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, whiteSpace: 'nowrap' }}>
    <Typography sx={{
      fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600,
      color: before && before !== '—' ? '#ef4444' : T.faint,
      textDecoration: before && before !== '—' ? 'line-through' : 'none',
    }}>
      {before || '—'}
    </Typography>
    <EastIcon sx={{ fontSize: 12, color: T.faint }} />
    <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>
      {after || '—'}
    </Typography>
  </Box>
);

// ─── Stat Card ────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color, icon: Icon }) => (
  <Box sx={{
    flex: 1, minWidth: 130, p: 2, borderRadius: '10px',
    bgcolor: '#fff', border: `1px solid ${T.accentBorder}`,
    display: 'flex', flexDirection: 'column', gap: 0.5,
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: T.font }}>
        {label}
      </Typography>
      {Icon && <Icon sx={{ fontSize: 16, color: alpha(color, 0.4) }} />}
    </Box>
    <Typography sx={{ fontSize: '1.8rem', fontWeight: 800, color, lineHeight: 1, fontFamily: T.font }}>{value}</Typography>
  </Box>
);

// ─── Detail Modal ─────────────────────────────────────────────────────────
const DetailModal = ({ open, onClose, record }) => {
  if (!record) return null;
  const empName  = record.employeeName || record.employeeNumber;
  const initials = (empName || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const rows = [
    { label: 'Employee No.',    value: record.employeeNumber },
    { label: 'Employee Name',   value: record.employeeName || '—' },
    { label: 'Department',      value: record.department || '—' },
    { label: 'Original Date',   value: record.originalDate },
    { label: 'Day',             value: record.dayOfWeek || '—' },
    { label: 'DB Field',        value: <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: T.accentMid }}>{record.fieldName || '—'}</Typography> },
    { label: 'Adjustment Type', value: <AdjTypeBadge type={record.adjustmentType} /> },
    { label: 'Operation',       value: <OpTypeBadge  type={record.operationType}  /> },
    { label: 'Source',          value: <SourceBadge  autofillRemarks={record.autofillRemarks} /> },
    {
      label: 'Change',
      value: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 600, color: record.valueBefore && record.valueBefore !== '—' ? '#ef4444' : T.faint, textDecoration: record.valueBefore && record.valueBefore !== '—' ? 'line-through' : 'none' }}>{record.valueBefore || '—'}</Typography>
          <EastIcon sx={{ fontSize: 13, color: T.faint }} />
          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700, color: '#059669' }}>{record.valueAfter || '—'}</Typography>
        </Box>
      ),
    },
    {
      label: 'Save Remarks',
      value: record.remarks
        ? <Box sx={{ px: 1.5, py: 1, borderRadius: '6px', bgcolor: alpha('#1565c0', 0.04), border: `1px solid ${alpha('#1565c0', 0.2)}`, maxWidth: 320 }}><Typography sx={{ fontSize: '0.82rem', color: '#1565c0', fontFamily: T.font, lineHeight: 1.5 }}>{record.remarks}</Typography></Box>
        : <Typography sx={{ fontSize: '0.82rem', color: T.faint, fontStyle: 'italic', fontFamily: T.font }}>—</Typography>,
    },
    {
      label: 'Fill Remarks',
      value: record.autofillRemarks
        ? (
          <Box sx={{ px: 1.5, py: 1, borderRadius: '6px', bgcolor: alpha('#6d2323', 0.04), border: `1px solid ${T.accentBorder}`, maxWidth: 320 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
              <EventAvailableIcon sx={{ fontSize: 12, color: T.accent }} />
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: T.accent, letterSpacing: '0.06em', fontFamily: T.font }}>AUTO-FILL REASON</Typography>
            </Box>
            <Typography sx={{ fontSize: '0.82rem', color: T.accentMid, fontFamily: T.font, lineHeight: 1.5 }}>{record.autofillRemarks}</Typography>
          </Box>
        )
        : <Typography sx={{ fontSize: '0.82rem', color: T.faint, fontStyle: 'italic', fontFamily: T.font }}>—</Typography>,
    },
    { label: 'Approved By', value: record.approvedBy || '—' },
    {
      label: 'Adjusted On',
      value: record.adjustedAt
        ? new Date(record.adjustedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—',
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.09)' } }}>
      <Box sx={{ px: 3, py: 2.5, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle,${alpha(T.accent, 0.1)} 0%,transparent 70%)`, pointerEvents: 'none' }} />
        <IconButton size="small" onClick={onClose} sx={{ position: 'absolute', top: 12, right: 12, color: T.accent, opacity: 0.5, '&:hover': { opacity: 1 } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
          <Avatar sx={{ bgcolor: alpha(T.accent, 0.12), width: 46, height: 46, border: `1px solid ${T.accentBorder}`, color: T.accent, fontWeight: 800, fontSize: '1rem' }}>{initials}</Avatar>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: T.accent, lineHeight: 1.2, fontFamily: T.font }}>{empName}</Typography>
            <Typography sx={{ fontSize: '0.74rem', color: T.faint, fontWeight: 500, fontFamily: T.font }}>
              {record.employeeNumber}{record.department && record.department !== '—' ? ` · ${record.department}` : ''}
            </Typography>
          </Box>
        </Box>
      </Box>
      <Box sx={{ px: 3, py: 2.5, display: 'flex', flexDirection: 'column', maxHeight: '65vh', overflowY: 'auto', ...scrollbarSx }}>
        {rows.map(({ label, value }) => (
          <Box key={label} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', py: 1.1, borderBottom: `1px solid ${T.divider}`, gap: 2 }}>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: T.muted, flexShrink: 0, fontFamily: T.font, minWidth: 110 }}>{label}</Typography>
            <Box sx={{ textAlign: 'right' }}>
              {typeof value === 'string' ? <Typography sx={{ fontSize: '0.82rem', fontWeight: 500, color: T.text, fontFamily: T.font }}>{value}</Typography> : value}
            </Box>
          </Box>
        ))}
      </Box>
      <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ background: T.accent, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 24px', fontWeight: 700, fontSize: '0.82rem', fontFamily: T.font, cursor: 'pointer' }}>Close</button>
      </Box>
    </Dialog>
  );
};

// ─── Wireframe ────────────────────────────────────────────────────────────
const AdjustmentReportWireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box sx={{ py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, width: '100vw', maxWidth: '100%', position: 'relative', left: '53%', transform: 'translateX(-51%)', px: { xs: 2, sm: 3, md: 6 } }}>
      <Box sx={{ mb: 2, borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.09)', animation: 'blink 2s ease-in-out infinite' }}>
        <Box sx={{ px: 4, py: 3, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)' }} />
          <Box><Bone w={280} h={18} sx={{ mb: 1 }} /><Bone w={380} h={11} /></Box>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
        {[1,2,3,4].map(i => <Box key={i} sx={{ flex: 1, height: 80, borderRadius: '10px', bgcolor: '#fff', border: `1px solid ${T.accentBorder}`, animation: `blink 2s ease-in-out ${i*0.1}s infinite` }} />)}
      </Box>
      <Box sx={{ borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.09)', bgcolor: '#fff', animation: 'blink 2s ease-in-out 0.1s infinite' }}>
        <Box sx={{ px: 2.5, py: 1.25, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.divider}` }}><Bone w={160} h={12} /></Box>
        <Box sx={{ p: 2.5, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {[1,2,3,4,5,6,7,8].map(i => <Box key={i} sx={{ flex: '1 1 120px', height: 34, borderRadius: '8px', bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }} />)}
        </Box>
        <Box sx={{ px: 2.5, py: 1.1, bgcolor: T.accent, display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 1.5 }}>
          {Array(12).fill(0).map((_, i) => <Box key={i} sx={{ height: 9, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.22)' }} />)}
        </Box>
        {[...Array(7)].map((_, i) => (
          <Box key={i} sx={{ px: 2.5, py: 1.5, display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 1.5, alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)', bgcolor: i % 2 === 0 ? '#fff' : T.rowOdd }}>
            {Array(12).fill(0).map((_, j) => <Bone key={j} h={12} w={j === 3 ? '60%' : '80%'} />)}
          </Box>
        ))}
      </Box>
    </Box>
  </>
);

const ADJ_TYPES = ['Time In', 'Time Out', 'Breaktime In', 'Breaktime Out', 'Manual Entry'];

const CHART_COLORS = ['#6d2323', '#2563eb', '#059669', '#c2410c', '#7c3aed', '#92400e', '#0369a1', '#8B4545'];
const ADJ_TYPE_COLORS = {
  'Time In': '#0369a1',
  'Time Out': '#065f46',
  'Breaktime In': '#7c3aed',
  'Breaktime Out': '#c2410c',
  'Manual Entry': '#92400e',
};

const ChartCard = ({ title, subtitle, headerAction, filters, children }) => (
  <Box sx={{
    flex: '1 1 360px', minWidth: 300, p: 2.5, borderRadius: '10px',
    bgcolor: '#fff', border: `1px solid ${T.accentBorder}`,
    display: 'flex', flexDirection: 'column', gap: 1,
  }}>
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography sx={{ fontSize: '0.88rem', fontWeight: 800, color: T.accent, fontFamily: T.font }}>{title}</Typography>
          {headerAction}
        </Box>
        {subtitle && (
          <Typography sx={{ fontSize: '0.7rem', color: T.faint, fontFamily: T.font, mt: 0.25 }}>{subtitle}</Typography>
        )}
        {filters}
      </Box>
    </Box>
    <Box sx={{ width: '100%', height: 280 }}>{children}</Box>
  </Box>
);

const formatPersonDisplayName = (person, fallback = '') => {
  if (person?.lastName || person?.firstName) {
    const mi = person.middleName ? ` ${String(person.middleName).trim().charAt(0)}.` : '';
    return `${person.lastName || ''}, ${person.firstName || ''}${mi}`.replace(/^,\s*/, '').trim();
  }
  if (!fallback) return '—';
  const parts = String(fallback).trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    const first = parts[0];
    const mi = parts.length > 2 ? ` ${parts[1].charAt(0)}.` : '';
    return `${last}, ${first}${mi}`;
  }
  return fallback;
};

const buildEmpCatLabel = (item) => {
  if (!item) return '';
  if (item.parentGroup && item.typeName) return `${item.parentGroup} | ${item.typeName}`;
  if (item.customCategory?.trim()) return `Other (${item.customCategory.trim()})`;
  if (item.categoryLabel && item.categoryLabel !== 'Unassigned') return item.categoryLabel;
  return '';
};

const UNREG_ACCENT = '#c2410c';

const formatDeviceTimestamp = (ts) => {
  if (ts == null || ts === '') return '—';
  const d = new Date(Number(ts));
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const PUNCH_BRACKETS = [
  { key: 'timeIn', label: 'Time In', field: 'daysWithTimeIn' },
  { key: 'breakIn', label: 'Break Time In', field: 'daysWithBreakIn' },
  { key: 'breakOut', label: 'Break Time Out', field: 'daysWithBreakOut' },
  { key: 'timeOut', label: 'Time Out', field: 'daysWithTimeOut' },
];

const chartTooltipStyle = {
  contentStyle: {
    borderRadius: 8, border: `1px solid ${T.accentBorder}`,
    fontFamily: T.font, fontSize: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
};

// ─── TABLE columns ────────────────────────────────────────────────────────
const TABLE_COLS = [
  { key: 'employeeNumber', label: 'EMP #',          w: 90  },
  { key: 'name',           label: 'EMPLOYEE',       w: 155 },
  { key: 'originalDate',   label: 'DATE',           w: 105 },
  { key: 'dayOfWeek',      label: 'DAY',            w: 75  },
  { key: 'operationType',  label: 'OP',             w: 60  },
  { key: 'source',         label: 'SOURCE',         w: 90  },
  { key: 'adjustmentType', label: 'FIELD',          w: 125 },
  { key: 'change',         label: 'BEFORE → AFTER', w: 180 },
  { key: 'remarks',        label: 'SAVE REMARKS',   w: 185 },
  { key: 'fillRemarks',    label: 'FILL REMARKS',   w: 185 },
  { key: 'approvedBy',     label: 'BY',             w: 110 },
  { key: 'adjustedAt',     label: 'ADJUSTED ON',    w: 120 },
];
const GRID_COLS = '90px 155px 105px 75px 60px 90px 125px 180px 185px 185px 110px 120px';

// ─── Main Component ────────────────────────────────────────────────────────
const AttendanceAdjustmentReports = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const preEmpNum   = searchParams.get('empNum')   || '';
  const preEmpName  = searchParams.get('empName')  || '';
  const preDateFrom = searchParams.get('dateFrom') || '';
  const preDateTo   = searchParams.get('dateTo')   || '';

  const [adjustments,  setAdjustments]  = useState([]);
  const [departments,  setDepartments]  = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [pageLoading,  setPageLoading]  = useState(true);
  const [error,        setError]        = useState('');

  const [dateFrom,     setDateFrom]     = useState(preDateFrom);
  const [dateTo,       setDateTo]       = useState(preDateTo);
  const [searchName,   setSearchName]   = useState(preEmpName);
  const [searchEmpNum, setSearchEmpNum] = useState(preEmpNum);
  const [typeFilter,   setTypeFilter]   = useState('all');
  const [deptFilter,   setDeptFilter]   = useState('all');
  const [empCatFilter, setEmpCatFilter] = useState('all');
  const [opFilter,     setOpFilter]     = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  const [page,           setPage]        = useState(0);
  const [rowsPerPage,    setRowsPerPage] = useState(25);
  const [selectedRecord, setSelected]    = useState(null);
  const [detailOpen,     setDetailOpen]  = useState(false);
  const [activeTab,      setActiveTab]   = useState('table');

  const [allEmployees,      setAllEmployees]      = useState([]);
  const [personMap,         setPersonMap]         = useState({});
  const [deviceUsers,       setDeviceUsers]       = useState([]);
  const [allDeviceUsersRaw, setAllDeviceUsersRaw] = useState([]);
  const [allDeviceSummaryRaw, setAllDeviceSummaryRaw] = useState([]);
  const [deviceSummary,     setDeviceSummary]     = useState([]);
  const [modSummary,        setModSummary]        = useState([]);
  const [punchInsights,     setPunchInsights]     = useState([]);
  const [departmentTable,   setDepartmentTable]   = useState([]);
  const [deptCodeByEmployee, setDeptCodeByEmployee] = useState({});
  const [empCatMap,         setEmpCatMap]         = useState({});
  const [deviceLoading,     setDeviceLoading]     = useState(false);
  const [deviceError,       setDeviceError]       = useState('');
  const [deviceDeptFilter,  setDeviceDeptFilter]  = useState('all');
  const [noRecordsDialogOpen, setNoRecordsDialogOpen] = useState(false);
  const [noRecordsSearch, setNoRecordsSearch] = useState('');
  const [unregisteredDialogOpen, setUnregisteredDialogOpen] = useState(false);
  const [unregisteredSearch, setUnregisteredSearch] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  const insightsExportRef = useRef(null);

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = {};
      if (searchEmpNum) params.personID = searchEmpNum;
      if (dateFrom)     params.dateFrom = dateFrom;
      if (dateTo)       params.dateTo   = dateTo;
      if (searchName)   params.employeeName = searchName;
      if (typeFilter !== 'all') params.adjustmentType = typeFilter;
      if (opFilter !== 'all') params.operationType = opFilter;
      if (deptFilter !== 'all') params.department = deptFilter;
      if (sourceFilter !== 'all') params.source = sourceFilter;

      const res = await axios.get(`${API_BASE_URL}/attendance/api/attendance_adjustment`, { ...getAuthHeaders(), params });
      const raw = Array.isArray(res.data) ? res.data : (res.data?.data || []);

      const normalised = raw.map(row => ({
        id:              row.id,
        employeeNumber:  String(row.employeeNumber || row.personID || '').trim(),
        employeeName:    row.employeeName    || '',
        department:      row.department      || '—',
        originalDate:    row.originalDate    || '—',
        dayOfWeek:       row.dayOfWeek       || '',
        fieldName:       row.fieldName       || '',
        adjustmentType:  row.adjustmentType  || 'Manual Entry',
        operationType:   row.operationType   || 'UPDATE',
        valueBefore:     row.valueBefore     ?? '—',
        valueAfter:      row.valueAfter      ?? '—',
        remarks:         row.remarks         || '',
        autofillRemarks: row.autofill_remarks || '',
        approvedBy:      row.approvedBy      || '—',
        adjustedAt:      row.adjustedAt      || null,
      }));

      const deptSet = new Set(normalised.map(r => r.department).filter(d => d && d !== '—'));
      // Keep known departments so dropdown stays usable when a dept filter is active
      setDepartments((prev) => [...new Set([...prev, ...deptSet])].sort());
      setAdjustments(normalised);
    } catch (err) {
      console.error('AttendanceAdjustmentReports fetch error:', err);
      setError('Failed to load adjustment records. Please try again.');
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  }, [searchEmpNum, dateFrom, dateTo, searchName, typeFilter, opFilter, deptFilter, sourceFilter]); // eslint-disable-line

  const fetchEmployeeDirectory = useCallback(async () => {
    try {
      const auth = getAuthHeaders();
      const [usersResp, personsResp, empCatResp] = await Promise.all([
        fetch(`${API_BASE_URL}/users`, { method: 'GET', ...auth }),
        fetch(`${API_BASE_URL}/personalinfo/person_table`, { method: 'GET', ...auth }),
        fetch(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`, { method: 'GET', ...auth }),
      ]);
      if (!usersResp.ok) return;
      const usersDataRaw = await usersResp.json().catch(() => []);
      const personsDataRaw = personsResp.ok ? await personsResp.json().catch(() => []) : [];
      const empCatsDataRaw = empCatResp.ok ? await empCatResp.json().catch(() => []) : [];
      const usersArray = Array.isArray(usersDataRaw) ? usersDataRaw : usersDataRaw.users || usersDataRaw.data || [];
      const personsArray = Array.isArray(personsDataRaw) ? personsDataRaw : personsDataRaw.persons || personsDataRaw.data || [];
      const empCatsArray = Array.isArray(empCatsDataRaw) ? empCatsDataRaw : empCatsDataRaw.data || empCatsDataRaw.records || [];

      const nextPersonMap = {};
      (personsArray || []).forEach((p) => {
        const key = String(p.agencyEmployeeNum ?? p.employeeNumber ?? '').trim();
        if (!key) return;
        nextPersonMap[key] = p;
      });
      const employees = (usersArray || []).map((u) => {
        const key = String(u.employeeNumber || '').trim();
        const p = nextPersonMap[key];
        const fullName = p
          ? `${p.firstName || ''} ${p.middleName || ''} ${p.lastName || ''} ${p.nameExtension || ''}`.trim()
          : '';
        return {
          employeeNumber: key,
          fullName: fullName || u.username || key,
        };
      }).filter((u) => u.employeeNumber);
      setPersonMap(nextPersonMap);
      setAllEmployees(employees);

      const nextEmpCatMap = {};
      (empCatsArray || []).forEach((item) => {
        if (!item?.employeeNumber) return;
        const label = buildEmpCatLabel(item);
        if (label) {
          nextEmpCatMap[String(item.employeeNumber)] = {
            label,
            colorHex: item.colorHex || '#757575',
          };
        }
      });
      setEmpCatMap(nextEmpCatMap);
    } catch (err) {
      console.error('AttendanceAdjustmentReports employee directory fetch error:', err);
    }
  }, []); // eslint-disable-line

  const allEmployeeSet = useMemo(
    () => new Set(
      allEmployees
        .map((u) => String(u.employeeNumber || '').trim())
        .filter(Boolean),
    ),
    [allEmployees],
  );

  const fetchDeviceInsights = useCallback(async () => {
    if (!dateFrom || !dateTo) {
      setDeviceUsers([]);
      setAllDeviceUsersRaw([]);
      setAllDeviceSummaryRaw([]);
      setDeviceSummary([]);
      setModSummary([]);
      setPunchInsights([]);
      return;
    }
    setDeviceLoading(true);
    setDeviceError('');
    try {
      const auth = getAuthHeaders();
      const [bundleRes, deptTableRes, deptAssignRes] = await Promise.all([
        axios.post(
          `${API_BASE_URL}/attendance/api/device-insights-bundle`,
          { startDate: dateFrom, endDate: dateTo },
          auth,
        ),
        axios.get(`${API_BASE_URL}/api/department-table`, auth),
        axios.get(`${API_BASE_URL}/api/department-assignment`, auth),
      ]);

      const allowed = allEmployeeSet;
      const bundle = bundleRes.data || {};
      const rawDeviceUsers = Array.isArray(bundle.users) ? bundle.users : [];
      const rawSummary = Array.isArray(bundle.summary) ? bundle.summary : [];
      setAllDeviceUsersRaw(rawDeviceUsers);
      setAllDeviceSummaryRaw(rawSummary);

      const filteredUsers = rawDeviceUsers.filter(
        (u) => u?.PersonID != null && allowed.has(String(u.PersonID)),
      );
      const filteredSummary = rawSummary.filter(
        (row) => row?.PersonID != null && allowed.has(String(row.PersonID)),
      );
      const filteredPunch = (Array.isArray(bundle.punchInsights) ? bundle.punchInsights : []).filter(
        (row) => row?.PersonID != null && allowed.has(String(row.PersonID)),
      );
      const filteredMod = (Array.isArray(bundle.modSummary) ? bundle.modSummary : []).filter(
        (row) => row?.PersonID != null && allowed.has(String(row.PersonID)),
      );

      const deptList = Array.isArray(deptTableRes.data) ? deptTableRes.data : [];
      deptList.sort((a, b) => String(a?.code || '').localeCompare(String(b?.code || '')));
      setDepartmentTable(deptList);

      const codeMap = {};
      (Array.isArray(deptAssignRes.data) ? deptAssignRes.data : []).forEach((a) => {
        if (!a?.employeeNumber) return;
        codeMap[String(a.employeeNumber)] = a.code || '';
      });
      setDeptCodeByEmployee(codeMap);

      setDeviceUsers(filteredUsers);
      setDeviceSummary(filteredSummary);
      setModSummary(filteredMod);
      setPunchInsights(filteredPunch);
    } catch (err) {
      console.error('AttendanceAdjustmentReports device insights fetch error:', err);
      setDeviceError('Failed to load device attendance insights.');
      setDeviceUsers([]);
      setAllDeviceUsersRaw([]);
      setAllDeviceSummaryRaw([]);
      setDeviceSummary([]);
      setModSummary([]);
      setPunchInsights([]);
    } finally {
      setDeviceLoading(false);
    }
  }, [dateFrom, dateTo, allEmployeeSet]);

  const handleRefresh = useCallback(async () => {
    const jobs = [fetchData()];
    if (activeTab === 'insights') jobs.push(fetchDeviceInsights());
    await Promise.all(jobs);
  }, [fetchData, fetchDeviceInsights, activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchEmployeeDirectory(); }, [fetchEmployeeDirectory]);
  // Lazy-load Device Insights only when Insights tab is open
  useEffect(() => {
    if (activeTab !== 'insights') return;
    if (!dateFrom || !dateTo) return;
    if (allEmployeeSet.size === 0) return;
    fetchDeviceInsights();
  }, [activeTab, fetchDeviceInsights, allEmployeeSet.size, dateFrom, dateTo]);
  useEffect(() => { setPage(0); }, [dateFrom, dateTo, searchName, searchEmpNum, typeFilter, deptFilter, empCatFilter, opFilter, sourceFilter]);

  const getEmpCatLabelForEmployee = useCallback((empNo) => {
    return empCatMap[String(empNo)]?.label || 'Unassigned';
  }, [empCatMap]);

  // Server already applied most filters; keep emp-category + light safety filters client-side
  const filtered = useMemo(() => adjustments.filter(r => {
    if (empCatFilter !== 'all' && getEmpCatLabelForEmployee(r.employeeNumber) !== empCatFilter) return false;
    return true;
  }), [adjustments, empCatFilter, getEmpCatLabelForEmployee]);

  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const totalAdjustments  = filtered.length;
  const employeesAffected = new Set(filtered.map(r => r.employeeNumber)).size;
  const newInsertions     = filtered.filter(r => r.operationType === 'INSERT').length;
  const autoFillCount     = filtered.filter(r => r.autofillRemarks).length;

  const chartData = useMemo(() => {
    const byTypeMap = {};
    const bySourceMap = { 'Auto-Fill': 0, Manual: 0 };
    const byOpMap = { NEW: 0, EDIT: 0 };
    const byDeptMap = {};
    const byDayMap = {};

    filtered.forEach(r => {
      const type = r.adjustmentType || 'Manual Entry';
      byTypeMap[type] = (byTypeMap[type] || 0) + 1;

      if (r.autofillRemarks) bySourceMap['Auto-Fill'] += 1;
      else bySourceMap.Manual += 1;

      if (r.operationType === 'INSERT') byOpMap.NEW += 1;
      else byOpMap.EDIT += 1;

      const dept = r.department && r.department !== '—' ? r.department : 'Unassigned';
      byDeptMap[dept] = (byDeptMap[dept] || 0) + 1;

      const day = r.dayOfWeek || 'Unknown';
      byDayMap[day] = (byDayMap[day] || 0) + 1;
    });

    const byType = Object.entries(byTypeMap).map(([name, value]) => ({
      name, value, fill: ADJ_TYPE_COLORS[name] || CHART_COLORS[0],
    }));
    const bySource = Object.entries(bySourceMap)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({
        name, value, fill: name === 'Auto-Fill' ? T.accent : '#1565c0',
      }));
    const byOperation = Object.entries(byOpMap)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({
        name, value, fill: name === 'NEW' ? '#f59e0b' : T.accent,
      }));
    const byDepartment = Object.entries(byDeptMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const byDay = dayOrder
      .filter(d => byDayMap[d])
      .map(name => ({ name: name.slice(0, 3), fullName: name, value: byDayMap[name] }));

    return { byType, bySource, byOperation, byDepartment, byDay };
  }, [filtered]);

  const deptDescriptionByCode = useMemo(() => {
    const map = {};
    departmentTable.forEach((d) => {
      if (d?.code) map[String(d.code)] = d.description || d.code;
    });
    return map;
  }, [departmentTable]);

  const empCatOptions = useMemo(() => {
    const labels = new Set();
    Object.values(empCatMap).forEach((entry) => {
      if (entry?.label) labels.add(entry.label);
    });
    return [...labels].sort();
  }, [empCatMap]);

  const getDeptCodeForEmployee = useCallback((empNo) => {
    const code = deptCodeByEmployee[String(empNo)] || '';
    return code || 'Unassigned';
  }, [deptCodeByEmployee]);

  const getDeptLabelForEmployee = useCallback((empNo) => {
    const code = deptCodeByEmployee[String(empNo)] || '';
    if (!code) return { code: 'Unassigned', label: 'Unassigned' };
    return { code, label: deptDescriptionByCode[code] || code };
  }, [deptCodeByEmployee, deptDescriptionByCode]);

  const deviceScopedUsers = useMemo(() => deviceUsers
    .filter((u) => {
      if (u?.PersonID == null) return false;
      const emp = String(u.PersonID);
      const displayName = formatPersonDisplayName(personMap[emp], u.PersonName || emp);
      if (searchEmpNum && !emp.toLowerCase().includes(searchEmpNum.toLowerCase())) return false;
      if (searchName && !displayName.toLowerCase().includes(searchName.toLowerCase())) return false;
      if (empCatFilter !== 'all' && getEmpCatLabelForEmployee(emp) !== empCatFilter) return false;
      if (deviceDeptFilter !== 'all') {
        const code = deptCodeByEmployee[emp] || '';
        if (deviceDeptFilter === '__UNASSIGNED__') {
          if (code) return false;
        } else if (code !== deviceDeptFilter) {
          return false;
        }
      }
      return true;
    })
    .map((u) => {
      const emp = String(u.PersonID);
      return {
        employeeNumber: emp,
        fullName: formatPersonDisplayName(personMap[emp], u.PersonName || emp),
      };
    }), [
    deviceUsers,
    personMap,
    searchEmpNum,
    searchName,
    empCatFilter,
    getEmpCatLabelForEmployee,
    deviceDeptFilter,
    deptCodeByEmployee,
  ]);

  const classifyDeviceCoverage = useCallback((rawCount, modCount) => {
    if (rawCount === 0) return 'hasNoRecords';
    if (rawCount >= 20 || modCount >= 20) return 'hasRecords';
    if ((rawCount >= 10 && rawCount <= 19) || (modCount >= 10 && modCount <= 19)) return 'almostHasRecords';
    if (rawCount >= 1 || modCount >= 1) return 'almostNoRecord';
    return 'hasNoRecords';
  }, []);

  const deviceChartData = useMemo(() => {
    const scopedSet = new Set(deviceScopedUsers.map((u) => String(u.employeeNumber)));
    const summaryMap = new Map();
    const rawCountMap = new Map();
    deviceSummary
      .filter((row) => scopedSet.has(String(row.PersonID)))
      .forEach((row) => {
        summaryMap.set(String(row.PersonID), Number(row.recordsCount) || 0);
        rawCountMap.set(String(row.PersonID), Number(row.rawRecordCount) || 0);
      });

    const modCountMap = new Map();
    modSummary
      .filter((row) => scopedSet.has(String(row.PersonID)))
      .forEach((row) => {
        modCountMap.set(String(row.PersonID), Number(row.modRecordCount) || 0);
      });

    const punchMap = new Map();
    punchInsights
      .filter((row) => scopedSet.has(String(row.PersonID)))
      .forEach((row) => {
        punchMap.set(String(row.PersonID), {
          totalDays: Number(row.totalDays) || 0,
          daysWithTimeIn: Number(row.daysWithTimeIn) || 0,
          daysWithBreakIn: Number(row.daysWithBreakIn) || 0,
          daysWithBreakOut: Number(row.daysWithBreakOut) || 0,
          daysWithTimeOut: Number(row.daysWithTimeOut) || 0,
        });
      });

    const nameMap = new Map();
    deviceUsers.forEach((u) => {
      if (u?.PersonID != null) nameMap.set(String(u.PersonID), u.PersonName || String(u.PersonID));
    });
    deviceScopedUsers.forEach((u) => {
      const key = String(u.employeeNumber);
      if (!nameMap.has(key)) nameMap.set(key, u.fullName || key);
    });

    let withRecords = 0;
    let withoutRecords = 0;
    const employeesNotUsingDevice = [];
    const coverageBuckets = {
      hasNoRecords: [],
      almostNoRecord: [],
      almostHasRecords: [],
      hasRecords: [],
    };

    deviceScopedUsers.forEach((u) => {
      const emp = String(u.employeeNumber);
      const rawCount = rawCountMap.get(emp) || 0;
      const modCount = modCountMap.get(emp) || 0;
      const category = classifyDeviceCoverage(rawCount, modCount);
      const empCat = empCatMap[emp];
      const dept = getDeptLabelForEmployee(emp);
      const empEntry = {
        employeeNumber: emp,
        displayName: formatPersonDisplayName(personMap[emp], u.fullName || emp),
        rawRecordCount: rawCount,
        modRecordCount: modCount,
        employmentCategory: empCat?.label || 'Unassigned',
        employmentCategoryColor: empCat?.colorHex || '#757575',
        departmentCode: dept.code,
        departmentLabel: dept.label,
      };

      coverageBuckets[category].push(empEntry);

      if (rawCount === 0) {
        withoutRecords += 1;
        employeesNotUsingDevice.push(empEntry);
      } else {
        withRecords += 1;
      }
    });

    const sortedEmployeesNotUsingDevice = sortEmployeesByLastName(
      employeesNotUsingDevice,
      (e) => e.displayName || e,
    );
    Object.keys(coverageBuckets).forEach((key) => {
      coverageBuckets[key] = sortEmployeesByLastName(coverageBuckets[key], (e) => e.displayName || e);
    });

    const byCoverage = [
      { name: 'Has Records (20+)', value: coverageBuckets.hasRecords.length, fill: '#059669' },
      { name: 'Almost Has Records (10–15)', value: coverageBuckets.almostHasRecords.length, fill: '#2563eb' },
      { name: 'Almost No Record (1–3)', value: coverageBuckets.almostNoRecord.length, fill: '#f59e0b' },
      { name: 'Has No Records (0)', value: coverageBuckets.hasNoRecords.length, fill: '#94a3b8' },
    ].filter((d) => d.value > 0);

    const byEmployee = [...summaryMap.entries()]
      .map(([pid, value]) => {
        const fullName = nameMap.get(pid) || pid;
        const parts = fullName.split(' ').filter(Boolean);
        return {
          name: parts.length > 1 ? parts[parts.length - 1] : fullName,
          fullName,
          value,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const byDeptMap = {};
    deviceScopedUsers.forEach((u) => {
      const code = getDeptCodeForEmployee(u.employeeNumber);
      const count = summaryMap.get(String(u.employeeNumber)) || 0;
      byDeptMap[code] = (byDeptMap[code] || 0) + count;
    });
    const byDepartment = Object.entries(byDeptMap)
      .map(([code, value]) => ({
        name: code,
        fullName: code === 'Unassigned' ? 'Unassigned' : (deptDescriptionByCode[code] || code),
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const bucketDefs = [
      { name: '1–5 days', min: 1, max: 5 },
      { name: '6–10 days', min: 6, max: 10 },
      { name: '11–15 days', min: 11, max: 15 },
      { name: '16–20 days', min: 16, max: 20 },
      { name: '21+ days', min: 21, max: Infinity },
    ];
    const byPunchDays = bucketDefs
      .map(({ name, min, max }) => ({
        name,
        value: [...summaryMap.values()].filter((c) => c >= min && c <= max).length,
        fill: T.accentMid,
      }))
      .filter((d) => d.value > 0);

    const totalPunchDays = [...summaryMap.values()].reduce((sum, n) => sum + n, 0);

    const punchConsistency = PUNCH_BRACKETS.map(({ key, label, field }) => {
      let consistent = 0;
      let partial = 0;
      let missing = 0;
      punchMap.forEach((row) => {
        const total = row.totalDays || 0;
        const bracketDays = row[field] || 0;
        if (total <= 0) return;
        if (bracketDays >= total) consistent += 1;
        else if (bracketDays > 0) partial += 1;
        else missing += 1;
      });
      return { key, label, consistent, partial, missing };
    });

    const byPunchConsistencyWide = punchConsistency.map(({ label, consistent, partial, missing }) => ({
      label,
      Consistent: consistent,
      Partial: partial,
      Missing: missing,
    }));

    const unregisteredRawCountMap = new Map();
    allDeviceSummaryRaw.forEach((row) => {
      if (row?.PersonID == null) return;
      unregisteredRawCountMap.set(String(row.PersonID), Number(row.rawRecordCount) || 0);
    });

    const unregisteredDeviceUsers = sortEmployeesByLastName(
      (Array.isArray(allDeviceUsersRaw) ? allDeviceUsersRaw : [])
        .filter((u) => u?.PersonID != null && !allEmployeeSet.has(String(u.PersonID)))
        .map((u) => {
          const emp = String(u.PersonID);
          return {
            employeeNumber: emp,
            displayName: formatPersonDisplayName(null, u.PersonName || emp),
            personName: u.PersonName || '',
            firstSeen: formatDeviceTimestamp(u.firstSeen),
            lastSeen: formatDeviceTimestamp(u.lastSeen),
            rawRecordCount: unregisteredRawCountMap.get(emp) || 0,
          };
        }),
      (u) => u.displayName || u,
    );

    return {
      byCoverage,
      coverageBuckets,
      byEmployee,
      byDepartment,
      byPunchDays,
      byPunchConsistencyWide,
      punchConsistency,
      employeesNotUsingDevice: sortedEmployeesNotUsingDevice,
      unregisteredDeviceUsers,
      withRecords,
      withoutRecords,
      employeeCount: deviceScopedUsers.length,
      totalPunchDays,
      avgPunchDays: withRecords > 0 ? (totalPunchDays / withRecords).toFixed(1) : '0',
      unregisteredCount: unregisteredDeviceUsers.length,
    };
  }, [
    deviceScopedUsers,
    deviceSummary,
    modSummary,
    deviceUsers,
    punchInsights,
    personMap,
    getDeptCodeForEmployee,
    deptDescriptionByCode,
    allDeviceUsersRaw,
    allDeviceSummaryRaw,
    allEmployeeSet,
    empCatMap,
    getDeptLabelForEmployee,
    classifyDeviceCoverage,
  ]);

  const filteredNonDeviceList = useMemo(() => {
    const q = noRecordsSearch.trim().toLowerCase();
    if (!q) return deviceChartData.employeesNotUsingDevice;
    return deviceChartData.employeesNotUsingDevice.filter(
      (row) =>
        row.employeeNumber.toLowerCase().includes(q)
        || row.displayName.toLowerCase().includes(q)
        || (row.employmentCategory || '').toLowerCase().includes(q)
        || (row.departmentCode || '').toLowerCase().includes(q)
        || (row.departmentLabel || '').toLowerCase().includes(q),
    );
  }, [deviceChartData.employeesNotUsingDevice, noRecordsSearch]);

  const filteredUnregisteredList = useMemo(() => {
    const q = unregisteredSearch.trim().toLowerCase();
    if (!q) return deviceChartData.unregisteredDeviceUsers;
    return deviceChartData.unregisteredDeviceUsers.filter(
      (row) =>
        row.employeeNumber.toLowerCase().includes(q)
        || row.displayName.toLowerCase().includes(q)
        || row.personName.toLowerCase().includes(q)
        || row.firstSeen.toLowerCase().includes(q)
        || row.lastSeen.toLowerCase().includes(q),
    );
  }, [deviceChartData.unregisteredDeviceUsers, unregisteredSearch]);

  const clearFilters = () => {
    setDateFrom(''); setDateTo('');
    setSearchName(''); setSearchEmpNum('');
    setTypeFilter('all'); setDeptFilter('all'); setEmpCatFilter('all');
    setOpFilter('all'); setSourceFilter('all');
    setPage(0);
  };

  const buildReportFilename = (prefix, ext) => {
    const from = dateFrom || 'all';
    const to = dateTo || 'all';
    const stamp = new Date().toISOString().slice(0, 10);
    return `${prefix}_${from}_${to}_${stamp}.${ext}`;
  };

  const handleGenerateTableReport = useCallback(() => {
    if (filtered.length === 0) {
      setExportMessage('No records to export. Adjust filters and try again.');
      return;
    }
    setExportLoading(true);
    setExportMessage('');
    try {
      const headers = [
        'Employee No.', 'Employee Name', 'Department', 'Date', 'Day',
        'Operation', 'Source', 'Field', 'Before', 'After',
        'Save Remarks', 'Fill Remarks', 'Approved By', 'Adjusted On',
      ];
      const rows = filtered.map((rec) => [
        rec.employeeNumber,
        rec.employeeName || '',
        rec.department || '',
        rec.originalDate || '',
        rec.dayOfWeek || '',
        rec.operationType || '',
        rec.autofillRemarks ? 'Auto-Fill' : 'Manual',
        rec.adjustmentType || '',
        rec.valueBefore ?? '',
        rec.valueAfter ?? '',
        rec.remarks || '',
        rec.autofillRemarks || '',
        rec.approvedBy || '',
        rec.adjustedAt
          ? new Date(rec.adjustedAt).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })
          : '',
      ]);

      const wsData = [
        ['Attendance Adjustment Report'],
        [`Generated: ${today}`],
        [`Date Range: ${dateFrom || '—'} to ${dateTo || '—'}`],
        [`Total Records: ${filtered.length}`],
        [`Employees Affected: ${employeesAffected}`],
        [`Auto-Fills: ${autoFillCount}`],
        [],
        headers,
        ...rows,
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = headers.map((_, colIdx) => ({
        wch: Math.min(
          40,
          Math.max(
            headers[colIdx]?.length || 10,
            ...rows.map((row) => String(row[colIdx] ?? '').length),
          ),
        ),
      }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Adjustments');
      XLSX.writeFile(wb, buildReportFilename('AttendanceAdjustmentReport', 'xlsx'));
      setExportMessage('Table report downloaded as XLSX.');
    } catch (err) {
      console.error('Table report export error:', err);
      setExportMessage('Failed to generate XLSX report.');
    } finally {
      setExportLoading(false);
    }
  }, [
    filtered, today, dateFrom, dateTo, employeesAffected, autoFillCount,
  ]);

  const handleGenerateInsightsReport = useCallback(async () => {
    const element = insightsExportRef.current;
    if (!element) {
      setExportMessage('Insights content is not ready to export.');
      return;
    }
    setExportLoading(true);
    setExportMessage('');
    const originalOverflow = element.style.overflow;
    const originalHeight = element.style.height;
    try {
      element.style.overflow = 'visible';
      element.style.height = `${element.scrollHeight}px`;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/png');

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(buildReportFilename('AttendanceAdjustmentInsights', 'pdf'));
      setExportMessage('Insights report downloaded as PDF.');
    } catch (err) {
      console.error('Insights report export error:', err);
      setExportMessage('Failed to generate PDF report.');
    } finally {
      element.style.overflow = originalOverflow;
      element.style.height = originalHeight;
      setExportLoading(false);
    }
  }, [dateFrom, dateTo]);

  const handleExportNonDeviceUsers = useCallback((rows) => {
    const list = rows || deviceChartData.employeesNotUsingDevice;
    if (list.length === 0) {
      setExportMessage('No employees to export — none are without device records for this period.');
      return;
    }
    setExportLoading(true);
    setExportMessage('');
    try {
      const wsData = [
        ['Employees Not Using Device'],
        [`Generated: ${today}`],
        [`Date Range: ${dateFrom || '—'} to ${dateTo || '—'}`],
        ['Source: Attendance Device (AttendanceRecordInfo) · compared with attendancerecord modifications'],
        ['Criteria: Zero raw records from AttendanceRecordInfo in the selected period'],
        [`Total: ${list.length}`],
        [],
        ['Employee No.', 'Name (Last, First M.I.)', 'Employment Category', 'Department Code', 'Department', 'Raw Records', 'Modification Records'],
        ...list.map((row) => [
          row.employeeNumber,
          row.displayName,
          row.employmentCategory || 'Unassigned',
          row.departmentCode || 'Unassigned',
          row.departmentLabel || 'Unassigned',
          row.rawRecordCount ?? 0,
          row.modRecordCount ?? 0,
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{ wch: 16 }, { wch: 36 }, { wch: 28 }, { wch: 14 }, { wch: 32 }, { wch: 14 }, { wch: 20 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Not Using Device');
      XLSX.writeFile(wb, buildReportFilename('EmployeesNotUsingDevice', 'xlsx'));
      setExportMessage(`Exported ${list.length} employee${list.length === 1 ? '' : 's'} not using device.`);
    } catch (err) {
      console.error('Non-device users export error:', err);
      setExportMessage('Failed to export non-device employee list.');
    } finally {
      setExportLoading(false);
    }
  }, [deviceChartData.employeesNotUsingDevice, today, dateFrom, dateTo]);

  const handleExportUnregisteredUsers = useCallback((rows) => {
    const list = rows || deviceChartData.unregisteredDeviceUsers;
    if (list.length === 0) {
      setExportMessage('No unregistered device users to export.');
      return;
    }
    setExportLoading(true);
    setExportMessage('');
    try {
      const wsData = [
        ['Device Users Not in HRIS'],
        [`Generated: ${today}`],
        [`Date Range: ${dateFrom || '—'} to ${dateTo || '—'}`],
        ['Source: AttendanceRecordInfo · not found in HRIS users list'],
        [`Total: ${list.length}`],
        [],
        ['Employee No.', 'Name', 'Device Name', 'First Seen', 'Last Seen', 'Raw Records (Period)'],
        ...list.map((row) => [
          row.employeeNumber,
          row.displayName,
          row.personName || '—',
          row.firstSeen,
          row.lastSeen,
          row.rawRecordCount ?? 0,
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{ wch: 16 }, { wch: 36 }, { wch: 36 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Not in HRIS');
      XLSX.writeFile(wb, buildReportFilename('DeviceUsersNotInHRIS', 'xlsx'));
      setExportMessage(`Exported ${list.length} unregistered device user${list.length === 1 ? '' : 's'}.`);
    } catch (err) {
      console.error('Unregistered device users export error:', err);
      setExportMessage('Failed to export unregistered device user list.');
    } finally {
      setExportLoading(false);
    }
  }, [deviceChartData.unregisteredDeviceUsers, today, dateFrom, dateTo]);

  const formatDate = d => {
    if (!d || d === '—') return '—';
    const parts = String(d).split('-');
    if (parts.length !== 3) return d;
    const [y, m, day] = parts;
    return new Date(+y, +m - 1, +day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleBack = () => preEmpNum ? navigate(`/search-attendance?empNum=${preEmpNum}`) : navigate(-1);

  if (pageLoading) return <AdjustmentReportWireframe />;

  return (
    <Fade in timeout={400}>
      <Box sx={{ fontFamily: T.font }}>
        <style>{shimmerKf}</style>
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #adj-print-summary, #adj-print-summary *,
            #adj-printable, #adj-printable * { visibility: visible; }
            #adj-print-summary { position: absolute; top: 0; left: 0; width: 100%; padding: 24px; }
            #adj-printable { position: absolute; top: 100px; left: 0; width: 100%; overflow: visible !important; max-height: none !important; }
            .no-print { display: none !important; }
          }
        `}</style>

        {/* ── Page wrapper — mirrors AttendanceSearch layout ── */}
        <Box sx={{
          py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 },
          width: '100vw', maxWidth: '100%',
          position: 'relative', left: '53%', transform: 'translateX(-51%)',
          px: { xs: 2, sm: 3, md: 6 },
        }}>

          {/* ── Page Header ── */}
          <SectionCard sx={{ mb: 2 }} className="no-print">
            <Box sx={{
              px: 4, py: 3,
              background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              position: 'relative', overflow: 'hidden',
            }}>
              <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.10) 0%,transparent 70%)', pointerEvents: 'none' }} />
              <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)', pointerEvents: 'none' }} />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, position: 'relative', zIndex: 1 }}>
                <Tooltip title="Back to Attendance Management">
                  <IconButton size="small" onClick={handleBack} sx={{ bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, color: T.accent, '&:hover': { bgcolor: alpha(T.accent, 0.14) } }}>
                    <ArrowBackIosIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
                <EditCalendarIcon sx={{ fontSize: 30, color: T.accent }} />
                <Box>
                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.faint, mb: 0.25, fontFamily: T.font }}>
                    Human Resource Information System
                  </Typography>
                  <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.25, fontFamily: T.font }}>
                    Attendance Adjustment Report
                  </Typography>
                  <Typography sx={{ fontSize: '0.78rem', color: T.accentMid, fontWeight: 600, fontFamily: T.font }}>
                    Admin Portal · Full audit trail of every admin-modified attendance entry
                  </Typography>
                  {preEmpNum && (
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, mt: 0.75, px: 1.25, py: 0.35, borderRadius: '5px', bgcolor: alpha(T.accent, 0.1), border: `1px solid ${T.accentBorder}` }}>
                      <PersonIcon sx={{ fontSize: 12, color: T.accent }} />
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, fontFamily: T.font }}>Filtered: {preEmpName || preEmpNum}</Typography>
                      <button onClick={clearFilters} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.faint, fontSize: '0.65rem', padding: 0, fontFamily: T.font }}>✕ clear</button>
                    </Box>
                  )}
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, position: 'relative', zIndex: 1 }}>
                <Box sx={{ textAlign: 'right', mr: 0.5 }}>
                  <Typography sx={{ fontSize: '0.65rem', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: T.font }}>Generated</Typography>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: T.text, fontFamily: T.font }}>{today}</Typography>
                </Box>
                <Tooltip title="Refresh">
                  <IconButton size="small" onClick={handleRefresh} disabled={loading || deviceLoading} sx={{ bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, color: T.accent, '&:hover': { bgcolor: alpha(T.accent, 0.14) } }}>
                    {(loading || deviceLoading) ? <CircularProgress size={14} sx={{ color: T.accent }} /> : <RefreshIcon sx={{ fontSize: 16 }} />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Print Report">
                  <IconButton size="small" onClick={() => window.print()} sx={{ bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, color: T.accent, '&:hover': { bgcolor: alpha(T.accent, 0.14) } }}>
                    <PrintIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </SectionCard>

          <Collapse in={!!exportMessage}>
            <Box sx={{ mb: 2, px: 2, py: 1.5, borderRadius: '8px', bgcolor: alpha(T.accent, 0.06), border: `1px solid ${T.accentBorder}` }}>
              <Typography sx={{ fontSize: '0.82rem', color: T.accentMid, fontFamily: T.font }}>{exportMessage}</Typography>
            </Box>
          </Collapse>

          {/* ── Error ── */}
          <Collapse in={!!error}>
            <Box sx={{ mb: 2, px: 2, py: 1.5, borderRadius: '8px', bgcolor: alpha('#d32f2f', 0.06), border: `1px solid ${alpha('#d32f2f', 0.25)}` }}>
              <Typography sx={{ fontSize: '0.82rem', color: '#b71c1c', fontFamily: T.font }}>{error}</Typography>
            </Box>
          </Collapse>

          {/* ── Stat Cards ── */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }} className="no-print">
            <StatCard label="Total Adjustments"  value={totalAdjustments}  color={T.accent}    icon={EditCalendarIcon}   />
            <StatCard label="Employees Affected" value={employeesAffected} color="#2563eb"     icon={GroupsIcon}         />
            <StatCard label="New Insertions"     value={newInsertions}     color="#92400e"     icon={EditCalendarIcon}   />
            <StatCard label="Auto-Fills"         value={autoFillCount}     color={T.accentMid} icon={EventAvailableIcon} />
          </Box>

          {/* ── Tabs: Table | Insights ── */}
          <SectionCard sx={{ mb: 2 }} className="no-print">
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{
                minHeight: 44,
                px: 1,
                '& .MuiTabs-indicator': { bgcolor: T.accent, height: 3, borderRadius: '3px 3px 0 0' },
                '& .MuiTab-root': {
                  minHeight: 44, textTransform: 'none', fontFamily: T.font,
                  fontWeight: 600, fontSize: '0.82rem', color: T.faint,
                  '&.Mui-selected': { color: T.accent, fontWeight: 800 },
                },
              }}
            >
              <Tab value="table" icon={<TableChartIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Table" />
              <Tab value="insights" icon={<InsightsIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Insights" />
            </Tabs>
          </SectionCard>

          {/* ── Main card — fixed height with internal scroll, mirrors AttendanceSearch ── */}
          <SectionCard sx={{ height: 'calc(100vh - 470px)', display: 'flex', flexDirection: 'column' }}>

            {/* Filter bar — flexShrink: 0 so it never scrolls away */}
            <Box className="no-print" sx={{ borderBottom: `1px solid ${T.divider}`, flexShrink: 0 }}>
              {/* Filter controls row */}
              <Box sx={{ px: 2.5, py: 1.5, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <FilterListIcon sx={{ fontSize: 14, color: T.accent, flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: T.accent, fontFamily: T.font, mr: 0.5 }}>Filters</Typography>

                {/* Date From */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: T.faint, fontFamily: T.font, whiteSpace: 'nowrap' }}>From</Typography>
                  <NativeInput type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} icon={<CalendarTodayIcon sx={{ fontSize: 13 }} />} />
                </Box>

                {/* Date To */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: T.faint, fontFamily: T.font, whiteSpace: 'nowrap' }}>To</Typography>
                  <NativeInput type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} icon={<CalendarTodayIcon sx={{ fontSize: 13 }} />} />
                </Box>

                {/* Emp Name */}
                <Box sx={{ minWidth: 150 }}>
                  <NativeInput value={searchName} onChange={e => { setSearchName(e.target.value); setPage(0); }} placeholder="Employee name…" icon={<PersonIcon sx={{ fontSize: 13 }} />} />
                </Box>

                {/* Emp No */}
                <Box sx={{ minWidth: 120 }}>
                  <NativeInput value={searchEmpNum} onChange={e => { setSearchEmpNum(e.target.value); setPage(0); }} placeholder="Emp No…" icon={<SearchIcon sx={{ fontSize: 13 }} />} />
                </Box>

                {/* Source */}
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <Select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} sx={selectSx}>
                    <MenuItem value="all"      sx={menuItemSx}>All Sources</MenuItem>
                    <MenuItem value="autofill" sx={menuItemSx}>Auto-Fill</MenuItem>
                    <MenuItem value="manual"   sx={menuItemSx}>Manual</MenuItem>
                  </Select>
                </FormControl>

                {/* Field */}
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} sx={selectSx}>
                    <MenuItem value="all" sx={menuItemSx}>All Fields</MenuItem>
                    {ADJ_TYPES.map(t => <MenuItem key={t} value={t} sx={menuItemSx}>{t}</MenuItem>)}
                  </Select>
                </FormControl>

                {/* Operation */}
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select value={opFilter} onChange={e => setOpFilter(e.target.value)} sx={selectSx}>
                    <MenuItem value="all"    sx={menuItemSx}>All Ops</MenuItem>
                    <MenuItem value="UPDATE" sx={menuItemSx}>Edit</MenuItem>
                    <MenuItem value="INSERT" sx={menuItemSx}>New</MenuItem>
                  </Select>
                </FormControl>

                {/* Department */}
                {departments.length > 0 && (
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <Select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} sx={selectSx}>
                      <MenuItem value="all" sx={menuItemSx}>All Depts</MenuItem>
                      {departments.map(d => <MenuItem key={d} value={d} sx={menuItemSx}>{d}</MenuItem>)}
                    </Select>
                  </FormControl>
                )}

                {/* Employment Category */}
                {(empCatOptions.length > 0 || empCatFilter !== 'all') && (
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <Select value={empCatFilter} onChange={e => { setEmpCatFilter(e.target.value); setPage(0); }} sx={selectSx}>
                      <MenuItem value="all" sx={menuItemSx}>All Categories</MenuItem>
                      <MenuItem value="Unassigned" sx={menuItemSx}>Unassigned</MenuItem>
                      {empCatOptions.map((label) => (
                        <MenuItem key={label} value={label} sx={menuItemSx}>{label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <Box sx={{ flex: 1 }} />

                {/* Record count + export + clear */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                  {(loading || exportLoading) && <CircularProgress size={14} sx={{ color: T.accent }} />}
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: T.faint, fontFamily: T.font, whiteSpace: 'nowrap' }}>
                    {activeTab === 'table'
                      ? `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`
                      : 'Insights view'}
                  </Typography>
                  {activeTab === 'table' ? (
                    <Tooltip title="Download filtered table as XLSX">
                      <button
                        onClick={handleGenerateTableReport}
                        disabled={exportLoading || filtered.length === 0}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: T.accent, color: '#fff', border: 'none',
                          borderRadius: '8px', padding: '7px 14px',
                          fontWeight: 700, fontSize: '0.72rem', fontFamily: T.font,
                          cursor: exportLoading || filtered.length === 0 ? 'not-allowed' : 'pointer',
                          opacity: exportLoading || filtered.length === 0 ? 0.55 : 1,
                        }}
                      >
                        <FileDownloadIcon sx={{ fontSize: 14 }} />
                        Generate Report
                      </button>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Download insights charts as PDF">
                      <button
                        onClick={handleGenerateInsightsReport}
                        disabled={exportLoading}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: T.accent, color: '#fff', border: 'none',
                          borderRadius: '8px', padding: '7px 14px',
                          fontWeight: 700, fontSize: '0.72rem', fontFamily: T.font,
                          cursor: exportLoading ? 'not-allowed' : 'pointer',
                          opacity: exportLoading ? 0.55 : 1,
                        }}
                      >
                        <FileDownloadIcon sx={{ fontSize: 14 }} />
                        Generate Report
                      </button>
                    </Tooltip>
                  )}
                  <button onClick={clearFilters} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.faint, fontSize: '0.72rem', fontFamily: T.font, whiteSpace: 'nowrap' }}>
                    Clear All
                  </button>
                </Box>
              </Box>

              {/* Legend row — table only */}
              {activeTab === 'table' && (
                <Box sx={{ px: 2.5, py: 0.75, bgcolor: '#fafafa', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  {[
                    { color: '#f59e0b', label: 'New insertion' },
                    { color: T.accent,  label: 'Auto-filled'   },
                    { color: '#1565c0', label: 'Manual edit'   },
                  ].map(({ color, label }) => (
                    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: color, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '0.65rem', color: T.faint, fontFamily: T.font }}>{label}</Typography>
                    </Box>
                  ))}
                  <Typography sx={{ fontSize: '0.64rem', color: T.faint, fontStyle: 'italic', ml: 'auto', fontFamily: T.font }}>
                    Click any row to view full details
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Print-only summary */}
            <Box id="adj-print-summary" sx={{ display: 'none', '@media print': { display: 'block' }, flexShrink: 0 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: T.accent, fontFamily: T.font }}>Attendance Adjustment Report</Typography>
              <Typography sx={{ fontSize: '0.78rem', color: T.muted, fontFamily: T.font }}>Generated: {today}</Typography>
              <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
                <Typography sx={{ fontSize: '0.75rem', fontFamily: T.font }}>Total: <strong>{totalAdjustments}</strong></Typography>
                <Typography sx={{ fontSize: '0.75rem', fontFamily: T.font }}>Employees: <strong>{employeesAffected}</strong></Typography>
                <Typography sx={{ fontSize: '0.75rem', fontFamily: T.font }}>Auto-fills: <strong>{autoFillCount}</strong></Typography>
              </Box>
            </Box>

            {activeTab === 'table' ? (
              <>
                {/* Column header — flexShrink: 0 so it stays fixed */}
                <Box sx={{ display: 'grid', gridTemplateColumns: GRID_COLS, px: 2, py: 1.1, bgcolor: T.accent, gap: 1.5, overflowX: 'hidden', flexShrink: 0 }}>
                  {TABLE_COLS.map(col => (
                    <Typography key={col.key} sx={{ color: '#FEF9E1', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.07em', fontFamily: T.font, whiteSpace: 'nowrap' }}>
                      {col.label}
                    </Typography>
                  ))}
                </Box>

                {/* Scrollable rows — flexGrow: 1 fills remaining card height */}
                <Box
                  id="adj-printable"
                  sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    overflowX: 'auto',
                    ...scrollbarSx,
                  }}
                >
                  <Box sx={{ minWidth: 1480 }}>
                    {paged.length === 0 ? (
                      <Box sx={{ py: 10, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                        <EditCalendarIcon sx={{ fontSize: 36, color: alpha(T.accent, 0.25) }} />
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, fontFamily: T.font }}>
                          {adjustments.length === 0 ? 'No adjustment records found' : 'No records match your filters'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.78rem', color: T.faint, fontFamily: T.font }}>
                          {adjustments.length === 0
                            ? 'Records appear here as soon as admins save changes via Attendance Management.'
                            : 'Try adjusting your filter criteria.'}
                        </Typography>
                      </Box>
                    ) : paged.map((rec, idx) => {
                      const rowBg  = idx % 2 === 0 ? T.rowEven : T.rowOdd;
                      const adjDate = rec.adjustedAt
                        ? new Date(rec.adjustedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—';

                      return (
                        <Box
                          key={rec.id}
                          onClick={() => { setSelected(rec); setDetailOpen(true); }}
                          sx={{
                            display: 'grid', gridTemplateColumns: GRID_COLS,
                            px: 2, py: 1.25, gap: 1.5, alignItems: 'center',
                            borderBottom: `1px solid ${T.divider}`,
                            bgcolor: rowBg, cursor: 'pointer', transition: 'background 0.1s',
                            '&:hover': { bgcolor: T.rowHover },
                          }}
                        >
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.72rem', color: T.accent, fontWeight: 700 }}>{rec.employeeNumber}</Typography>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.78rem', color: T.text, fontFamily: T.font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rec.employeeName || <span style={{ color: T.faint, fontStyle: 'italic' }}>—</span>}
                          </Typography>
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.74rem', color: T.muted, whiteSpace: 'nowrap' }}>{formatDate(rec.originalDate)}</Typography>
                          <Typography sx={{ fontSize: '0.74rem', color: T.muted, fontFamily: T.font }}>{rec.dayOfWeek || '—'}</Typography>
                          <Box><OpTypeBadge type={rec.operationType} /></Box>
                          <Box><SourceBadge autofillRemarks={rec.autofillRemarks} /></Box>
                          <Box><AdjTypeBadge type={rec.adjustmentType} /></Box>
                          <Box><BeforeAfter before={rec.valueBefore} after={rec.valueAfter} /></Box>

                          {/* Save Remarks */}
                          <Box sx={{ overflow: 'hidden' }}>
                            {rec.remarks ? (
                              <Tooltip title={rec.remarks} placement="top">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <NotesIcon sx={{ fontSize: 13, color: '#1565c0', flexShrink: 0 }} />
                                  <Typography sx={{ fontSize: '0.78rem', color: '#1565c0', fontFamily: T.font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.remarks}</Typography>
                                </Box>
                              </Tooltip>
                            ) : (
                              <Typography sx={{ fontSize: '0.75rem', color: T.faint, fontStyle: 'italic', fontFamily: T.font }}>—</Typography>
                            )}
                          </Box>

                          {/* Fill Remarks */}
                          <Box sx={{ overflow: 'hidden' }}>
                            {rec.autofillRemarks ? (
                              <Tooltip title={rec.autofillRemarks} placement="top">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <EventAvailableIcon sx={{ fontSize: 13, color: T.accent, flexShrink: 0 }} />
                                  <Typography sx={{ fontSize: '0.78rem', color: T.accentMid, fontFamily: T.font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.autofillRemarks}</Typography>
                                </Box>
                              </Tooltip>
                            ) : (
                              <Typography sx={{ fontSize: '0.75rem', color: T.faint, fontStyle: 'italic', fontFamily: T.font }}>—</Typography>
                            )}
                          </Box>

                          <Typography sx={{ fontSize: '0.78rem', color: T.muted, fontFamily: T.font, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.approvedBy}</Typography>
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.72rem', color: T.muted, whiteSpace: 'nowrap' }}>{adjDate}</Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>

                {/* Pagination — flexShrink: 0, always at the bottom of the card */}
                {filtered.length > 0 && (
                  <Box sx={{ px: 2, py: 0.5, borderTop: `1px solid ${T.divider}`, flexShrink: 0 }} className="no-print">
                    <TablePagination
                      component="div"
                      count={filtered.length}
                      page={page}
                      onPageChange={(_, p) => setPage(p)}
                      rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
                      rowsPerPageOptions={[10, 25, 50, 100]}
                      sx={{ '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.78rem', fontWeight: 600, fontFamily: T.font } }}
                    />
                  </Box>
                )}
              </>
            ) : (
              /* ── Insights graphs ── */
              <Box
                ref={insightsExportRef}
                sx={{
                  flexGrow: 1, overflowY: 'auto', p: 2.5,
                  display: 'flex', flexWrap: 'wrap', gap: 2, alignContent: 'flex-start',
                  bgcolor: '#fff',
                  ...scrollbarSx,
                }}
              >
                <Box sx={{ width: '100%', mb: 0.5, pb: 1.5, borderBottom: `1px solid ${T.divider}` }}>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: T.accent, fontFamily: T.font }}>
                    Attendance Adjustment Insights Report
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: T.muted, fontFamily: T.font, mt: 0.25 }}>
                    Generated: {today}
                    {dateFrom || dateTo ? ` · Period: ${dateFrom || '—'} to ${dateTo || '—'}` : ''}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                    <Typography sx={{ fontSize: '0.72rem', fontFamily: T.font, color: T.text }}>
                      Adjustments: <strong>{totalAdjustments}</strong>
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', fontFamily: T.font, color: T.text }}>
                      Employees: <strong>{employeesAffected}</strong>
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', fontFamily: T.font, color: T.text }}>
                      Auto-Fills: <strong>{autoFillCount}</strong>
                    </Typography>
                    {deviceChartData.employeeCount > 0 && (
                      <Typography sx={{ fontSize: '0.72rem', fontFamily: T.font, color: T.text }}>
                        Device Users: <strong>{deviceChartData.employeeCount}</strong>
                      </Typography>
                    )}
                  </Box>
                </Box>

                {filtered.length === 0 && (
                  <Box sx={{ width: '100%', py: 4, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <InsightsIcon sx={{ fontSize: 32, color: alpha(T.accent, 0.25) }} />
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: T.muted, fontFamily: T.font }}>
                      No adjustment data to visualize
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: T.faint, fontFamily: T.font }}>
                      Adjustment charts appear when matching records exist. Device insights below use Attendance Device data.
                    </Typography>
                  </Box>
                )}

                {filtered.length > 0 && (
                  <>
                    <ChartCard title="By Field Type" subtitle="Pie · adjustment field distribution">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData.byType}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="45%"
                            innerRadius={48}
                            outerRadius={80}
                            paddingAngle={3}
                          >
                            {chartData.byType.map((entry, i) => (
                              <Cell key={entry.name} fill={entry.fill || CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartTooltip {...chartTooltipStyle} />
                          <Legend wrapperStyle={{ fontSize: '0.7rem', fontFamily: T.font }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="By Source" subtitle="Pie · auto-fill vs manual">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData.bySource}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="45%"
                            innerRadius={48}
                            outerRadius={80}
                            paddingAngle={3}
                          >
                            {chartData.bySource.map((entry) => (
                              <Cell key={entry.name} fill={entry.fill} />
                            ))}
                          </Pie>
                          <RechartTooltip {...chartTooltipStyle} />
                          <Legend wrapperStyle={{ fontSize: '0.7rem', fontFamily: T.font }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="By Operation" subtitle="Bar · new insertions vs edits">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.byOperation} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={T.divider} />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: T.font }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11, fontFamily: T.font }} />
                          <RechartTooltip {...chartTooltipStyle} />
                          <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
                            {chartData.byOperation.map((entry) => (
                              <Cell key={entry.name} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="By Department" subtitle="Bar · top 10 departments">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.byDepartment} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={T.divider} />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fontFamily: T.font }} />
                          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fontFamily: T.font }} />
                          <RechartTooltip {...chartTooltipStyle} />
                          <Bar dataKey="value" name="Count" fill={T.accent} radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>

                    {chartData.byDay.length > 0 && (
                      <ChartCard title="By Day of Week" subtitle="Bar · adjustments per weekday">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData.byDay} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={T.divider} />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: T.font }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11, fontFamily: T.font }} />
                            <RechartTooltip
                              {...chartTooltipStyle}
                              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || _}
                            />
                            <Bar dataKey="value" name="Count" fill={T.accentMid} radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartCard>
                    )}
                  </>
                )}

                {/* ── Device Attendance Insights (all HRIS employees) ── */}
                <Box sx={{ width: '100%', mt: filtered.length > 0 ? 1 : 0, pt: filtered.length > 0 ? 2 : 0, borderTop: filtered.length > 0 ? `2px solid ${T.accentBorder}` : 'none' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <FingerprintIcon sx={{ fontSize: 18, color: T.accent }} />
                        <Box>
                          <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: T.accent, fontFamily: T.font }}>
                            Device Attendance Insights
                          </Typography>
                          <Typography sx={{ fontSize: '0.7rem', color: T.faint, fontFamily: T.font }}>
                            From Attendance Device · compared against all employees in HRIS (person_table)
                          </Typography>
                        </Box>
                      </Box>

                      <Collapse in={!!deviceError}>
                        <Box sx={{ mb: 1.5, px: 2, py: 1.25, borderRadius: '8px', bgcolor: alpha('#d32f2f', 0.06), border: `1px solid ${alpha('#d32f2f', 0.25)}` }}>
                          <Typography sx={{ fontSize: '0.78rem', color: '#b71c1c', fontFamily: T.font }}>{deviceError}</Typography>
                        </Box>
                      </Collapse>

                      {!dateFrom || !dateTo ? (
                        <Box sx={{ width: '100%', py: 6, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <CalendarTodayIcon sx={{ fontSize: 32, color: alpha(T.accent, 0.25) }} />
                          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: T.muted, fontFamily: T.font }}>
                            Set a date range to load device attendance insights
                          </Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: T.faint, fontFamily: T.font }}>
                            Use the From and To filters above — same range as Attendance Device.
                          </Typography>
                        </Box>
                      ) : deviceLoading ? (
                        <Box sx={{ width: '100%', py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                          <CircularProgress size={28} sx={{ color: T.accent }} />
                          <Typography sx={{ fontSize: '0.78rem', color: T.faint, fontFamily: T.font }}>Loading device attendance data…</Typography>
                        </Box>
                      ) : deviceChartData.employeeCount === 0 ? (
                        <Box sx={{ width: '100%', py: 6, textAlign: 'center' }}>
                          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: T.muted, fontFamily: T.font }}>
                            No device users match the current filters
                          </Typography>
                        </Box>
                      ) : (
                        <>
                          <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                            <StatCard label="Device Users" value={deviceChartData.employeeCount} color={T.accent} icon={GroupsIcon} />
                            <StatCard label="With Device Records" value={deviceChartData.withRecords} color="#059669" icon={FingerprintIcon} />
                            <StatCard label="No Device Records" value={deviceChartData.withoutRecords} color="#64748b" icon={PersonIcon} />
                            <StatCard label="Total Punch Days" value={deviceChartData.totalPunchDays} color="#2563eb" icon={CalendarTodayIcon} />
                            <StatCard label="Avg Days / Employee" value={deviceChartData.avgPunchDays} color={T.accentMid} icon={InsightsIcon} />
                            <StatCard label="Not in HRIS" value={deviceChartData.unregisteredCount} color="#c2410c" icon={PersonOffIcon} />
                          </Box>

                          <Box sx={{ width: '100%', display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5, alignItems: 'center' }}>
                            <FilterListIcon sx={{ fontSize: 14, color: T.accent }} />
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: T.accent, fontFamily: T.font, mr: 0.5 }}>
                              Device filters
                            </Typography>
                            <FormControl size="small" sx={{ minWidth: 170 }}>
                              <Select
                                value={deviceDeptFilter}
                                onChange={(e) => setDeviceDeptFilter(e.target.value)}
                                sx={{ ...selectSx, height: 32 }}
                                displayEmpty
                              >
                                <MenuItem value="all" sx={menuItemSx}>All Departments</MenuItem>
                                <MenuItem value="__UNASSIGNED__" sx={menuItemSx}>Unassigned</MenuItem>
                                {departmentTable.map((d) => (
                                  <MenuItem key={d.code} value={d.code} sx={menuItemSx}>
                                    {d.code}{d.description ? ` — ${d.description}` : ''}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <Box sx={{ flex: 1 }} />
                            {deviceChartData.employeesNotUsingDevice.length > 0 && (
                              <Tooltip title="Download XLSX — device users with no raw AttendanceRecordInfo records in this period">
                                <button
                                  onClick={() => handleExportNonDeviceUsers()}
                                  disabled={exportLoading}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    background: T.accent, color: '#fff', border: 'none',
                                    borderRadius: '8px', padding: '7px 14px',
                                    fontWeight: 700, fontSize: '0.72rem', fontFamily: T.font,
                                    cursor: exportLoading ? 'not-allowed' : 'pointer',
                                    opacity: exportLoading ? 0.55 : 1,
                                  }}
                                >
                                  <FileDownloadIcon sx={{ fontSize: 14 }} />
                                  Not Using Device ({deviceChartData.employeesNotUsingDevice.length})
                                </button>
                              </Tooltip>
                            )}
                          </Box>

                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            {deviceChartData.byCoverage.length > 0 && (
                              <ChartCard
                                title="Device Record Coverage"
                                subtitle="Pie · raw AttendanceRecordInfo coverage vs attendancerecord modifications"
                                headerAction={deviceChartData.employeesNotUsingDevice.length > 0 ? (
                                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <Tooltip title="View HRIS employees not using the device">
                                      <IconButton
                                        size="small"
                                        onClick={() => { setNoRecordsSearch(''); setNoRecordsDialogOpen(true); }}
                                        sx={{
                                          bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`,
                                          color: T.accent, '&:hover': { bgcolor: alpha(T.accent, 0.14) },
                                        }}
                                      >
                                        <ListAltIcon sx={{ fontSize: 16 }} />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Download list as XLSX">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleExportNonDeviceUsers()}
                                        disabled={exportLoading}
                                        sx={{
                                          bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`,
                                          color: T.accent, '&:hover': { bgcolor: alpha(T.accent, 0.14) },
                                        }}
                                      >
                                        <FileDownloadIcon sx={{ fontSize: 16 }} />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                ) : null}
                              >
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={deviceChartData.byCoverage}
                                      dataKey="value"
                                      nameKey="name"
                                      cx="50%"
                                      cy="45%"
                                      innerRadius={48}
                                      outerRadius={80}
                                      paddingAngle={3}
                                    >
                                      {deviceChartData.byCoverage.map((entry) => (
                                        <Cell key={entry.name} fill={entry.fill} />
                                      ))}
                                    </Pie>
                                    <RechartTooltip {...chartTooltipStyle} />
                                    <Legend wrapperStyle={{ fontSize: '0.7rem', fontFamily: T.font }} />
                                  </PieChart>
                                </ResponsiveContainer>
                              </ChartCard>
                            )}

                            {deviceChartData.byEmployee.length > 0 && (
                              <ChartCard title="Top Employees by Punch Days" subtitle="Bar · top 10 employees with device records">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={deviceChartData.byEmployee} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={T.divider} />
                                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fontFamily: T.font }} />
                                    <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 10, fontFamily: T.font }} />
                                    <RechartTooltip
                                      {...chartTooltipStyle}
                                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || _}
                                    />
                                    <Bar dataKey="value" name="Punch Days" fill="#059669" radius={[0, 6, 6, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </ChartCard>
                            )}

                            {deviceChartData.byDepartment.length > 0 && (
                              <ChartCard
                                title="Punch Days by Department"
                                subtitle="Bar · total punch days grouped by department code"
                              >
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={deviceChartData.byDepartment} layout="vertical" margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={T.divider} />
                                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fontFamily: T.font }} />
                                    <YAxis type="category" dataKey="name" width={56} tick={{ fontSize: 10, fontFamily: T.font }} />
                                    <RechartTooltip
                                      {...chartTooltipStyle}
                                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || _}
                                    />
                                    <Bar dataKey="value" name="Punch Days" fill={T.accent} radius={[0, 6, 6, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </ChartCard>
                            )}

                            {deviceChartData.byPunchDays.length > 0 && (
                              <ChartCard title="Punch Day Distribution" subtitle="Bar · employees grouped by days with device records">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={deviceChartData.byPunchDays} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={T.divider} />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: T.font }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fontFamily: T.font }} />
                                    <RechartTooltip {...chartTooltipStyle} />
                                    <Bar dataKey="value" name="Employees" fill={T.accentMid} radius={[6, 6, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </ChartCard>
                            )}

                            {deviceChartData.byPunchConsistencyWide.some((row) => row.Consistent + row.Partial + row.Missing > 0) && (
                              <ChartCard
                                title="Punch Consistency by Time Bracket"
                                subtitle="Stacked · consistent, partial, and missing punches per bracket"
                              >
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={deviceChartData.byPunchConsistencyWide} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={T.divider} />
                                    <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: T.font }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fontFamily: T.font }} />
                                    <RechartTooltip {...chartTooltipStyle} />
                                    <Legend wrapperStyle={{ fontSize: '0.7rem', fontFamily: T.font }} />
                                    <Bar dataKey="Consistent" name="Consistent" fill="#059669" stackId="a" />
                                    <Bar dataKey="Partial" name="Partial" fill="#f59e0b" stackId="a" />
                                    <Bar dataKey="Missing" name="Missing" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </ChartCard>
                            )}

                            {deviceChartData.punchConsistency.length > 0 && (
                              <ChartCard title="Fully Consistent Employees" subtitle="Count · employees who punch every working day per bracket">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={deviceChartData.punchConsistency} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={T.divider} />
                                    <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: T.font }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fontFamily: T.font }} />
                                    <RechartTooltip {...chartTooltipStyle} />
                                    <Bar dataKey="consistent" name="Consistent" fill="#059669" radius={[6, 6, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </ChartCard>
                            )}

                            {deviceChartData.employeesNotUsingDevice.length > 0 && (
                              <ChartCard
                                title="Not Using Device"
                                subtitle="Zero raw records in AttendanceRecordInfo for the period"
                                headerAction={(
                                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <Tooltip title="View full list">
                                      <IconButton
                                        size="small"
                                        onClick={() => { setNoRecordsSearch(''); setNoRecordsDialogOpen(true); }}
                                        sx={{
                                          bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`,
                                          color: T.accent, '&:hover': { bgcolor: alpha(T.accent, 0.14) },
                                        }}
                                      >
                                        <ListAltIcon sx={{ fontSize: 16 }} />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Download list as XLSX">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleExportNonDeviceUsers()}
                                        disabled={exportLoading}
                                        sx={{
                                          bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`,
                                          color: T.accent, '&:hover': { bgcolor: alpha(T.accent, 0.14) },
                                        }}
                                      >
                                        <FileDownloadIcon sx={{ fontSize: 16 }} />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                )}
                              >
                                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                                  <PersonIcon sx={{ fontSize: 42, color: alpha(T.accent, 0.35) }} />
                                  <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: T.accent, fontFamily: T.font }}>
                                    {deviceChartData.employeesNotUsingDevice.length}
                                  </Typography>
                                  <Typography sx={{ fontSize: '0.78rem', color: T.muted, fontFamily: T.font, textAlign: 'center', px: 2 }}>
                                    HRIS employee{deviceChartData.employeesNotUsingDevice.length === 1 ? '' : 's'} with no raw data from AttendanceRecordInfo
                                  </Typography>
                                </Box>
                              </ChartCard>
                            )}

                            {deviceChartData.unregisteredCount > 0 && (
                              <ChartCard
                                title="Device Users Not in HRIS"
                                subtitle="In AttendanceRecordInfo but not in HRIS users list"
                                headerAction={(
                                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <Tooltip title="View unregistered device users">
                                      <IconButton
                                        size="small"
                                        onClick={() => { setUnregisteredSearch(''); setUnregisteredDialogOpen(true); }}
                                        sx={{
                                          bgcolor: alpha(UNREG_ACCENT, 0.08), border: `1px solid ${alpha(UNREG_ACCENT, 0.2)}`,
                                          color: UNREG_ACCENT, '&:hover': { bgcolor: alpha(UNREG_ACCENT, 0.14) },
                                        }}
                                      >
                                        <ListAltIcon sx={{ fontSize: 16 }} />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Download list as XLSX">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleExportUnregisteredUsers()}
                                        disabled={exportLoading}
                                        sx={{
                                          bgcolor: alpha(UNREG_ACCENT, 0.08), border: `1px solid ${alpha(UNREG_ACCENT, 0.2)}`,
                                          color: UNREG_ACCENT, '&:hover': { bgcolor: alpha(UNREG_ACCENT, 0.14) },
                                        }}
                                      >
                                        <FileDownloadIcon sx={{ fontSize: 16 }} />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                )}
                              >
                                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                                  <PersonOffIcon sx={{ fontSize: 42, color: alpha(UNREG_ACCENT, 0.35) }} />
                                  <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: UNREG_ACCENT, fontFamily: T.font }}>
                                    {deviceChartData.unregisteredCount}
                                  </Typography>
                                  <Typography sx={{ fontSize: '0.78rem', color: T.muted, fontFamily: T.font, textAlign: 'center', px: 2 }}>
                                    device user{deviceChartData.unregisteredCount === 1 ? '' : 's'} in AttendanceRecordInfo but not in HRIS
                                  </Typography>
                                </Box>
                              </ChartCard>
                            )}
                          </Box>
                        </>
                      )}
                    </Box>
              </Box>
            )}
          </SectionCard>

          {/* Print certification */}
          <SectionCard sx={{ mt: 2, display: 'none', '@media print': { display: 'block' } }}>
            <Box sx={{ px: 3, py: 2.5 }}>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.faint, mb: 2, fontFamily: T.font }}>Certification</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5 }}>
                {['Prepared by:', 'Verified by:', 'Noted by:'].map(role => (
                  <Box key={role}>
                    <Typography sx={{ fontSize: '0.72rem', color: T.faint, mb: 3, fontFamily: T.font }}>{role}</Typography>
                    <Box sx={{ borderBottom: '1px solid #475569', mb: 0.5 }} />
                    <Typography sx={{ fontSize: '0.72rem', color: T.faint, fontFamily: T.font }}>Signature over Printed Name</Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: T.faint, fontFamily: T.font }}>Designation / Date</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </SectionCard>

          {/* Source note */}
          <Box sx={{ mt: 1.5, px: 0.5, display: 'flex', alignItems: 'center', gap: 0.75 }} className="no-print">
            <InfoIcon sx={{ fontSize: 13, color: T.faint }} />
            <Typography sx={{ fontSize: '0.7rem', color: T.faint, fontFamily: T.font }}>
              Adjustments from <strong>attendance_adjustment_log</strong> · Device insights from <strong>AttendanceRecordInfo</strong>, compared with <strong>attendancerecord</strong> modifications.
            </Typography>
          </Box>
        </Box>

        <DetailModal open={detailOpen} onClose={() => setDetailOpen(false)} record={selectedRecord} />

        <Dialog
          open={noRecordsDialogOpen}
          onClose={() => setNoRecordsDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: '12px', overflow: 'hidden' } }}
        >
          <DialogTitle
            sx={{
              fontFamily: T.font,
              fontWeight: 800,
              color: '#fff',
              bgcolor: T.accent,
              py: 1.75,
              px: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '1rem', fontWeight: 800, fontFamily: T.font, color: '#fff', lineHeight: 1.3 }}>
                Employees Not Using Device
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 500, fontFamily: T.font, color: alpha('#fff', 0.82), mt: 0.25 }}>
                Zero raw records in AttendanceRecordInfo for the selected period
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => setNoRecordsDialogOpen(false)}
              sx={{ color: '#fff', '&:hover': { bgcolor: alpha('#fff', 0.12) } }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 0 }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${T.divider}`, bgcolor: '#fafafa' }}>
              <NativeInput
                value={noRecordsSearch}
                onChange={(e) => setNoRecordsSearch(e.target.value)}
                placeholder="Search employee no., name, category, or department…"
                icon={<SearchIcon sx={{ fontSize: 13 }} />}
              />
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '96px minmax(0, 1.2fr) minmax(130px, 1fr) minmax(110px, 0.9fr)',
                gap: 1.5,
                px: 2.5,
                py: 1,
                bgcolor: T.accentFaint,
                borderBottom: `1px solid ${T.accentBorder}`,
                position: 'sticky',
                top: 0,
                zIndex: 1,
              }}
            >
              {['Employee No.', 'Name', 'Employment Category', 'Department'].map((label) => (
                <Typography
                  key={label}
                  sx={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: T.accent,
                    fontFamily: T.font,
                  }}
                >
                  {label}
                </Typography>
              ))}
            </Box>
            <Box sx={{ maxHeight: 420, overflowY: 'auto', ...scrollbarSx }}>
              {filteredNonDeviceList.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center', px: 2 }}>
                  <Typography sx={{ fontSize: '0.82rem', color: T.muted, fontFamily: T.font }}>
                    {deviceChartData.employeesNotUsingDevice.length === 0
                      ? 'All device users have raw records in this period.'
                      : 'No employees match your search.'}
                  </Typography>
                </Box>
              ) : (
                filteredNonDeviceList.map((row, idx) => (
                  <Box
                    key={row.employeeNumber}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '96px minmax(0, 1.2fr) minmax(130px, 1fr) minmax(110px, 0.9fr)',
                      gap: 1.5,
                      px: 2.5,
                      py: 1.1,
                      alignItems: 'center',
                      borderBottom: `1px solid ${T.divider}`,
                      bgcolor: idx % 2 === 0 ? '#fff' : T.rowOdd,
                      '&:hover': { bgcolor: T.rowHover },
                    }}
                  >
                    <Typography sx={{ fontFamily: 'monospace', fontSize: '0.76rem', fontWeight: 700, color: T.accent }}>
                      {row.employeeNumber}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: T.text,
                        fontFamily: T.font,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={row.displayName}
                    >
                      {row.displayName}
                    </Typography>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignSelf: 'flex-start',
                        maxWidth: '100%',
                        px: '8px',
                        py: '3px',
                        borderRadius: '6px',
                        bgcolor: alpha(row.employmentCategoryColor || '#757575', 0.12),
                        border: `1px solid ${alpha(row.employmentCategoryColor || '#757575', 0.28)}`,
                      }}
                      title={row.employmentCategory}
                    >
                      <Typography
                        sx={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: row.employmentCategoryColor || '#757575',
                          fontFamily: T.font,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.employmentCategory || 'Unassigned'}
                      </Typography>
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          color: T.text,
                          fontFamily: T.font,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={row.departmentCode}
                      >
                        {row.departmentCode || 'Unassigned'}
                      </Typography>
                      {row.departmentCode !== 'Unassigned' && row.departmentLabel !== row.departmentCode && (
                        <Typography
                          sx={{
                            fontSize: '0.68rem',
                            color: T.muted,
                            fontFamily: T.font,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={row.departmentLabel}
                        >
                          {row.departmentLabel}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 2.5, py: 1.5, bgcolor: '#fafafa', borderTop: `1px solid ${T.divider}` }}>
            <Typography sx={{ flex: 1, fontSize: '0.72rem', color: T.muted, fontFamily: T.font, fontWeight: 600 }}>
              {filteredNonDeviceList.length} employee{filteredNonDeviceList.length === 1 ? '' : 's'}
            </Typography>
            <button
              onClick={() => handleExportNonDeviceUsers(filteredNonDeviceList)}
              disabled={exportLoading || filteredNonDeviceList.length === 0}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#fff', color: T.accent, border: `1px solid ${T.accentBorder}`,
                borderRadius: '8px', padding: '8px 16px', fontWeight: 700,
                fontSize: '0.82rem', fontFamily: T.font,
                cursor: exportLoading || filteredNonDeviceList.length === 0 ? 'not-allowed' : 'pointer',
                opacity: exportLoading || filteredNonDeviceList.length === 0 ? 0.55 : 1,
              }}
            >
              <FileDownloadIcon sx={{ fontSize: 14 }} />
              Generate Report
            </button>
            <button
              onClick={() => setNoRecordsDialogOpen(false)}
              style={{
                background: T.accent, color: '#fff', border: 'none', borderRadius: '8px',
                padding: '8px 20px', fontWeight: 700, fontSize: '0.82rem', fontFamily: T.font, cursor: 'pointer',
              }}
            >
              Close
            </button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={unregisteredDialogOpen}
          onClose={() => setUnregisteredDialogOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{ sx: { borderRadius: '12px', overflow: 'hidden' } }}
        >
          <DialogTitle
            sx={{
              fontFamily: T.font,
              fontWeight: 800,
              color: '#fff',
              bgcolor: UNREG_ACCENT,
              py: 1.75,
              px: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '1rem', fontWeight: 800, fontFamily: T.font, color: '#fff', lineHeight: 1.3 }}>
                Device Users Not in HRIS
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 500, fontFamily: T.font, color: alpha('#fff', 0.82), mt: 0.25 }}>
                Found in AttendanceRecordInfo but not registered in HRIS users list
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => setUnregisteredDialogOpen(false)}
              sx={{ color: '#fff', '&:hover': { bgcolor: alpha('#fff', 0.12) } }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 0 }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${T.divider}`, bgcolor: '#fafafa' }}>
              <NativeInput
                value={unregisteredSearch}
                onChange={(e) => setUnregisteredSearch(e.target.value)}
                placeholder="Search employee no., name, or device activity…"
                icon={<SearchIcon sx={{ fontSize: 13 }} />}
              />
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '96px minmax(0, 1.1fr) minmax(0, 1fr) 104px 104px 88px',
                gap: 1.5,
                px: 2.5,
                py: 1,
                bgcolor: alpha(UNREG_ACCENT, 0.06),
                borderBottom: `1px solid ${alpha(UNREG_ACCENT, 0.18)}`,
                position: 'sticky',
                top: 0,
                zIndex: 1,
              }}
            >
              {['Employee No.', 'Name', 'Device Name', 'First Seen', 'Last Seen', 'Raw Rec.'].map((label) => (
                <Typography
                  key={label}
                  sx={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: UNREG_ACCENT,
                    fontFamily: T.font,
                  }}
                >
                  {label}
                </Typography>
              ))}
            </Box>
            <Box sx={{ maxHeight: 420, overflowY: 'auto', ...scrollbarSx }}>
              {filteredUnregisteredList.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center', px: 2 }}>
                  <Typography sx={{ fontSize: '0.82rem', color: T.muted, fontFamily: T.font }}>
                    {deviceChartData.unregisteredCount === 0
                      ? 'All device users are registered in HRIS.'
                      : 'No unregistered device users match your search.'}
                  </Typography>
                </Box>
              ) : (
                filteredUnregisteredList.map((row, idx) => (
                  <Box
                    key={row.employeeNumber}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '96px minmax(0, 1.1fr) minmax(0, 1fr) 104px 104px 88px',
                      gap: 1.5,
                      px: 2.5,
                      py: 1.1,
                      alignItems: 'center',
                      borderBottom: `1px solid ${T.divider}`,
                      bgcolor: idx % 2 === 0 ? '#fff' : alpha(UNREG_ACCENT, 0.025),
                      '&:hover': { bgcolor: alpha(UNREG_ACCENT, 0.055) },
                    }}
                  >
                    <Typography sx={{ fontFamily: 'monospace', fontSize: '0.76rem', fontWeight: 700, color: UNREG_ACCENT }}>
                      {row.employeeNumber}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: T.text,
                        fontFamily: T.font,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={row.displayName}
                    >
                      {row.displayName}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.78rem',
                        color: T.muted,
                        fontFamily: T.font,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={row.personName || '—'}
                    >
                      {row.personName || '—'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.74rem', color: T.text, fontFamily: T.font }}>
                      {row.firstSeen}
                    </Typography>
                    <Typography sx={{ fontSize: '0.74rem', color: T.text, fontFamily: T.font }}>
                      {row.lastSeen}
                    </Typography>
                    <Typography sx={{ fontSize: '0.76rem', fontWeight: 700, color: T.text, fontFamily: T.font, textAlign: 'right' }}>
                      {row.rawRecordCount ?? 0}
                    </Typography>
                  </Box>
                ))
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 2.5, py: 1.5, bgcolor: '#fafafa', borderTop: `1px solid ${T.divider}` }}>
            <Typography sx={{ flex: 1, fontSize: '0.72rem', color: T.muted, fontFamily: T.font, fontWeight: 600 }}>
              {filteredUnregisteredList.length} unregistered device user{filteredUnregisteredList.length === 1 ? '' : 's'}
            </Typography>
            <button
              onClick={() => handleExportUnregisteredUsers(filteredUnregisteredList)}
              disabled={exportLoading || filteredUnregisteredList.length === 0}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#fff', color: UNREG_ACCENT, border: `1px solid ${alpha(UNREG_ACCENT, 0.28)}`,
                borderRadius: '8px', padding: '8px 16px', fontWeight: 700,
                fontSize: '0.82rem', fontFamily: T.font,
                cursor: exportLoading || filteredUnregisteredList.length === 0 ? 'not-allowed' : 'pointer',
                opacity: exportLoading || filteredUnregisteredList.length === 0 ? 0.55 : 1,
              }}
            >
              <FileDownloadIcon sx={{ fontSize: 14 }} />
              Generate Report
            </button>
            <button
              onClick={() => setUnregisteredDialogOpen(false)}
              style={{
                background: UNREG_ACCENT, color: '#fff', border: 'none', borderRadius: '8px',
                padding: '8px 20px', fontWeight: 700, fontSize: '0.82rem', fontFamily: T.font, cursor: 'pointer',
              }}
            >
              Close
            </button>
          </DialogActions>
        </Dialog>
      </Box>
    </Fade>
  );
};

export default AttendanceAdjustmentReports;