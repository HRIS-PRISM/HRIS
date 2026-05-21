import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Box, Typography, Card, CircularProgress, Fade,
  FormControl, Select, MenuItem, Tooltip, Avatar,
  IconButton, Dialog, TablePagination,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
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
} from '@mui/icons-material';

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const T = {
  accent:       '#6d2323',
  accentDark:   '#5a1d1d',
  accentMid:    '#8B4545',
  accentFaint:  'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover:  'rgba(109,35,35,0.10)',
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

// ─── Shimmer / font ───────────────────────────────────────────────────────────
const shimmerKf = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
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

// ─── Styled ───────────────────────────────────────────────────────────────────
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
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: T.accent, fontFamily: T.font }}>
        {title}
      </Typography>
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
      type={type} value={value} onChange={onChange}
      placeholder={placeholder} disabled={disabled}
      style={{
        width: '100%',
        padding: icon ? '9px 13px 9px 34px' : '9px 13px',
        borderRadius: '8px', border: `1px solid ${T.accentBorder}`,
        fontSize: '0.875rem', outline: 'none', fontFamily: T.font,
        boxSizing: 'border-box', transition: 'border-color 0.18s',
        background: disabled ? '#f5f5f5' : '#fff', color: T.text,
        cursor: disabled ? 'not-allowed' : 'text',
      }}
      onFocus={e => { if (!disabled) { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 1.5px ${T.accent}22`; } }}
      onBlur={e  => { e.target.style.borderColor = T.accentBorder; e.target.style.boxShadow = 'none'; }}
    />
  </Box>
);

// ─── Source badge ─────────────────────────────────────────────────────────────
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
      <Typography sx={{
        fontSize: '0.64rem', fontWeight: 800, fontFamily: T.font,
        color: isAutoFill ? '#6d2323' : '#1565c0',
        whiteSpace: 'nowrap',
      }}>
        {isAutoFill ? 'AUTO-FILL' : 'MANUAL'}
      </Typography>
    </Box>
  );
};

// ─── Adjustment type chip ─────────────────────────────────────────────────────
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
    <Box sx={{
      display: 'inline-flex', alignItems: 'center',
      px: '10px', py: '3px', borderRadius: '4px',
      bgcolor: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: cfg.color, whiteSpace: 'nowrap', fontFamily: T.font }}>
        {type}
      </Typography>
    </Box>
  );
};

// ─── Operation type badge ─────────────────────────────────────────────────────
const OpTypeBadge = ({ type }) => {
  const isInsert = type === 'INSERT';
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center',
      px: '8px', py: '2px', borderRadius: '4px',
      bgcolor: isInsert ? alpha('#f59e0b', 0.12) : alpha('#6d2323', 0.08),
      border: `1px solid ${isInsert ? alpha('#f59e0b', 0.35) : alpha('#6d2323', 0.2)}`,
    }}>
      <Typography sx={{
        fontSize: '0.65rem', fontWeight: 800, fontFamily: T.font,
        color: isInsert ? '#92400e' : T.accent,
      }}>
        {isInsert ? 'NEW' : 'EDIT'}
      </Typography>
    </Box>
  );
};

// ─── Before / After ───────────────────────────────────────────────────────────
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

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color, icon: Icon }) => (
  <Box sx={{
    flex: 1, minWidth: 150,
    p: 2, borderRadius: '10px',
    bgcolor: '#fff', border: `1px solid ${T.accentBorder}`,
    display: 'flex', flexDirection: 'column', gap: 0.5,
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography sx={{
        fontSize: '0.7rem', fontWeight: 600, color: T.faint,
        textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: T.font,
      }}>
        {label}
      </Typography>
      {Icon && <Icon sx={{ fontSize: 16, color: alpha(color, 0.4) }} />}
    </Box>
    <Typography sx={{ fontSize: '1.8rem', fontWeight: 800, color, lineHeight: 1, fontFamily: T.font }}>
      {value}
    </Typography>
  </Box>
);

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ open, onClose, record }) => {
  if (!record) return null;

  const empName  = record.employeeName || record.employeeNumber;
  const initials = (empName || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const rows = [
    { label: 'Employee No.',  value: record.employeeNumber },
    { label: 'Employee Name', value: record.employeeName || '—' },
    { label: 'Department',    value: record.department || '—' },
    { label: 'Original Date', value: record.originalDate },
    { label: 'Day',           value: record.dayOfWeek || '—' },
    {
      label: 'DB Field',
      value: (
        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: T.accentMid }}>
          {record.fieldName || '—'}
        </Typography>
      ),
    },
    { label: 'Adjustment Type', value: <AdjTypeBadge type={record.adjustmentType} /> },
    { label: 'Operation',       value: <OpTypeBadge  type={record.operationType}  /> },
    { label: 'Source',          value: <SourceBadge  autofillRemarks={record.autofillRemarks} /> },
    {
      label: 'Change',
      value: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{
            fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 600,
            color: record.valueBefore && record.valueBefore !== '—' ? '#ef4444' : T.faint,
            textDecoration: record.valueBefore && record.valueBefore !== '—' ? 'line-through' : 'none',
          }}>
            {record.valueBefore || '—'}
          </Typography>
          <EastIcon sx={{ fontSize: 13, color: T.faint }} />
          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700, color: '#059669' }}>
            {record.valueAfter || '—'}
          </Typography>
        </Box>
      ),
    },
    {
      label: 'Save Remarks',
      value: record.remarks
        ? (
          <Box sx={{
            px: 1.5, py: 1, borderRadius: '6px',
            bgcolor: alpha('#1565c0', 0.04),
            border: `1px solid ${alpha('#1565c0', 0.2)}`,
            maxWidth: 320,
          }}>
            <Typography sx={{ fontSize: '0.82rem', color: '#1565c0', fontFamily: T.font, lineHeight: 1.5 }}>
              {record.remarks}
            </Typography>
          </Box>
        )
        : <Typography sx={{ fontSize: '0.82rem', color: T.faint, fontStyle: 'italic', fontFamily: T.font }}>—</Typography>,
    },
    {
      label: 'Fill Remarks',
      value: record.autofillRemarks
        ? (
          <Box sx={{
            px: 1.5, py: 1, borderRadius: '6px',
            bgcolor: alpha('#6d2323', 0.04),
            border: `1px solid ${T.accentBorder}`,
            maxWidth: 320,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
              <EventAvailableIcon sx={{ fontSize: 12, color: T.accent }} />
              <Typography sx={{
                fontSize: '0.65rem', fontWeight: 800, color: T.accent,
                letterSpacing: '0.06em', fontFamily: T.font,
              }}>
                AUTO-FILL REASON
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.82rem', color: T.accentMid, fontFamily: T.font, lineHeight: 1.5 }}>
              {record.autofillRemarks}
            </Typography>
          </Box>
        )
        : <Typography sx={{ fontSize: '0.82rem', color: T.faint, fontStyle: 'italic', fontFamily: T.font }}>—</Typography>,
    },
    { label: 'Approved By', value: record.approvedBy || '—' },
    {
      label: 'Adjusted On',
      value: record.adjustedAt
        ? new Date(record.adjustedAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })
        : '—',
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.09)' } }}>
      {/* Header */}
      <Box sx={{
        px: 3, py: 2.5,
        background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{
          position: 'absolute', top: -40, right: -40, width: 160, height: 160,
          borderRadius: '50%',
          background: `radial-gradient(circle,${alpha(T.accent, 0.1)} 0%,transparent 70%)`,
          pointerEvents: 'none',
        }} />
        <IconButton size="small" onClick={onClose} sx={{
          position: 'absolute', top: 12, right: 12,
          color: T.accent, opacity: 0.5, '&:hover': { opacity: 1 },
        }}>
          <CloseIcon fontSize="small" />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
          <Avatar sx={{
            bgcolor: alpha(T.accent, 0.12), width: 46, height: 46,
            border: `1px solid ${T.accentBorder}`,
            color: T.accent, fontWeight: 800, fontSize: '1rem',
          }}>
            {initials}
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: T.accent, lineHeight: 1.2, fontFamily: T.font }}>
              {empName}
            </Typography>
            <Typography sx={{ fontSize: '0.74rem', color: T.faint, fontWeight: 500, fontFamily: T.font }}>
              {record.employeeNumber}
              {record.department && record.department !== '—' ? ` · ${record.department}` : ''}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{
        px: 3, py: 2.5,
        display: 'flex', flexDirection: 'column',
        maxHeight: '65vh', overflowY: 'auto',
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
      }}>
        {rows.map(({ label, value }) => (
          <Box key={label} sx={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            py: 1.1, borderBottom: `1px solid ${T.divider}`, gap: 2,
          }}>
            <Typography sx={{
              fontSize: '0.78rem', fontWeight: 600, color: T.muted,
              flexShrink: 0, fontFamily: T.font, minWidth: 110,
            }}>
              {label}
            </Typography>
            <Box sx={{ textAlign: 'right' }}>
              {typeof value === 'string'
                ? <Typography sx={{ fontSize: '0.82rem', fontWeight: 500, color: T.text, fontFamily: T.font }}>{value}</Typography>
                : value}
            </Box>
          </Box>
        ))}
      </Box>

      <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{
          background: T.accent, color: '#fff', border: 'none', borderRadius: '8px',
          padding: '8px 24px', fontWeight: 700, fontSize: '0.82rem',
          fontFamily: T.font, cursor: 'pointer',
        }}>
          Close
        </button>
      </Box>
    </Dialog>
  );
};

// ─── Wireframe ────────────────────────────────────────────────────────────────
const AdjustmentReportWireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box sx={{
      py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 },
      width: '100vw', maxWidth: '100%',
      position: 'relative', left: '53%', transform: 'translateX(-51%)',
      px: { xs: 2, sm: 3, md: 6 },
    }}>
      <Box sx={{ mb: 2, borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.09)', animation: 'blink 2s ease-in-out infinite' }}>
        <Box sx={{ px: 4, py: 3, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)', flexShrink: 0 }} />
            <Box><Bone w={280} h={18} sx={{ mb: 1 }} /><Bone w={340} h={11} /></Box>
          </Box>
          <Bone w={130} h={40} r={8} />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
        {[1, 2, 3, 4].map(i => (
          <Box key={i} sx={{ flex: 1, height: 80, borderRadius: '10px', bgcolor: '#fff', border: `1px solid ${T.accentBorder}`, animation: `blink 2s ease-in-out ${i * 0.1}s infinite` }} />
        ))}
      </Box>
      <Box sx={{ mb: 2, borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.09)', bgcolor: '#fff', animation: 'blink 2s ease-in-out 0.1s infinite' }}>
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint }}><Bone w={160} h={12} /></Box>
        <Box sx={{ p: 2.5, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Box key={i} sx={{ flex: '1 1 120px', height: 36, borderRadius: '8px', bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }} />
          ))}
        </Box>
      </Box>
      <Box sx={{ borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.09)', bgcolor: '#fff', animation: 'blink 2s ease-in-out 0.2s infinite' }}>
        <Box sx={{ px: 2.5, py: 1.5, bgcolor: T.accent, display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 1.5 }}>
          {Array(12).fill(0).map((_, i) => (
            <Box key={i} sx={{ height: 10, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.22)' }} />
          ))}
        </Box>
        {[...Array(7)].map((_, i) => (
          <Box key={i} sx={{
            px: 2.5, py: 2,
            display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 1.5,
            alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)',
            bgcolor: i % 2 === 0 ? '#fff' : T.rowOdd,
          }}>
            {Array(12).fill(0).map((_, j) => <Bone key={j} h={12} w={j === 3 ? '60%' : '80%'} />)}
          </Box>
        ))}
      </Box>
    </Box>
  </>
);

// ─── Adjustment type options ──────────────────────────────────────────────────
const ADJ_TYPES = ['Time In', 'Time Out', 'Breaktime In', 'Breaktime Out', 'Manual Entry'];

// ─── Shared select sx ────────────────────────────────────────────────────────
const selectSx = {
  borderRadius: '8px', fontSize: '0.875rem', bgcolor: '#fff', fontFamily: T.font,
  '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accent },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.accent, borderWidth: '1.5px' },
};

const menuItemSx = { fontSize: '0.875rem', fontFamily: T.font };

// ─── Main Component ───────────────────────────────────────────────────────────
const AttendanceAdjustmentReports = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Pre-filter context passed from AttendanceSearch via URL
  const preEmpNum   = searchParams.get('empNum')   || '';
  const preEmpName  = searchParams.get('empName')  || '';
  const preDateFrom = searchParams.get('dateFrom') || '';
  const preDateTo   = searchParams.get('dateTo')   || '';

  const [adjustments, setAdjustments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error,       setError]       = useState('');

  // Filters — pre-populated from URL when arriving from AttendanceSearch
  const [dateFrom,      setDateFrom]      = useState(preDateFrom);
  const [dateTo,        setDateTo]        = useState(preDateTo);
  const [searchName,    setSearchName]    = useState(preEmpName);
  const [searchEmpNum,  setSearchEmpNum]  = useState(preEmpNum);
  const [typeFilter,    setTypeFilter]    = useState('all');
  const [deptFilter,    setDeptFilter]    = useState('all');
  const [opFilter,      setOpFilter]      = useState('all');
  const [sourceFilter,  setSourceFilter]  = useState('all'); // all | autofill | manual

  // Table
  const [page,           setPage]          = useState(0);
  const [rowsPerPage,    setRowsPerPage]   = useState(25);
  const [selectedRecord, setSelected]      = useState(null);
  const [detailOpen,     setDetailOpen]    = useState(false);

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Pass server-side filters for large datasets
      const params = {};
      if (searchEmpNum) params.personID = searchEmpNum;
      if (dateFrom)     params.dateFrom  = dateFrom;
      if (dateTo)       params.dateTo    = dateTo;

      const res = await axios.get(
        `${API_BASE_URL}/attendance/api/attendance_adjustment`,
        { ...getAuthHeaders(), params },
      );
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

      const deptSet = new Set(
        normalised.map(r => r.department).filter(d => d && d !== '—'),
      );
      setDepartments([...deptSet].sort());
      setAdjustments(normalised);
    } catch (err) {
      console.error('AttendanceAdjustmentReports fetch error:', err);
      setError('Failed to load adjustment records. Please try again.');
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  }, [searchEmpNum, dateFrom, dateTo]); // eslint-disable-line

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset to page 0 whenever any filter changes
  useEffect(() => {
    setPage(0);
  }, [dateFrom, dateTo, searchName, searchEmpNum, typeFilter, deptFilter, opFilter, sourceFilter]);

  // ── Client-side filter ─────────────────────────────────────────────────────
  const filtered = useMemo(() => adjustments.filter(r => {
    if (dateFrom && r.originalDate && r.originalDate < dateFrom) return false;
    if (dateTo   && r.originalDate && r.originalDate > dateTo)   return false;
    if (typeFilter !== 'all' && r.adjustmentType !== typeFilter)  return false;
    if (deptFilter !== 'all' && r.department     !== deptFilter)  return false;
    if (opFilter !== 'all') {
      if ((opFilter === 'INSERT') !== (r.operationType === 'INSERT')) return false;
    }
    if (sourceFilter === 'autofill' && !r.autofillRemarks) return false;
    if (sourceFilter === 'manual'   &&  r.autofillRemarks) return false;
    const name = (r.employeeName || '').toLowerCase();
    if (searchName   && !name.includes(searchName.toLowerCase()))                             return false;
    if (searchEmpNum && !r.employeeNumber.toLowerCase().includes(searchEmpNum.toLowerCase())) return false;
    return true;
  }), [adjustments, dateFrom, dateTo, typeFilter, deptFilter, opFilter, sourceFilter, searchName, searchEmpNum]);

  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalAdjustments  = filtered.length;
  const employeesAffected = new Set(filtered.map(r => r.employeeNumber)).size;
  const newInsertions     = filtered.filter(r => r.operationType === 'INSERT').length;
  const autoFillCount     = filtered.filter(r => r.autofillRemarks).length;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const clearFilters = () => {
    setDateFrom(''); setDateTo('');
    setSearchName(''); setSearchEmpNum('');
    setTypeFilter('all'); setDeptFilter('all');
    setOpFilter('all'); setSourceFilter('all');
    setPage(0);
  };

  const formatDate = d => {
    if (!d || d === '—') return '—';
    const parts = String(d).split('-');
    if (parts.length !== 3) return d;
    const [y, m, day] = parts;
    return new Date(+y, +m - 1, +day).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  // ── Back navigation ────────────────────────────────────────────────────────
  const handleBack = () => {
    if (preEmpNum) {
      navigate(`/search-attendance?empNum=${preEmpNum}`);
    } else {
      navigate(-1);
    }
  };

  // ── Table columns ──────────────────────────────────────────────────────────
  const TABLE_COLS = [
    { key: 'employeeNumber', label: 'Emp No.',        w: 95  },
    { key: 'name',           label: 'Employee',       w: 160 },
    { key: 'originalDate',   label: 'Date',           w: 110 },
    { key: 'dayOfWeek',      label: 'Day',            w: 80  },
    { key: 'operationType',  label: 'Op',             w: 65  },
    { key: 'source',         label: 'Source',         w: 95  },
    { key: 'adjustmentType', label: 'Field',          w: 130 },
    { key: 'change',         label: 'Before → After', w: 185 },
    { key: 'remarks',        label: 'Save Remarks',   w: 190 },
    { key: 'fillRemarks',    label: 'Fill Remarks',   w: 190 },
    { key: 'approvedBy',     label: 'By',             w: 115 },
    { key: 'adjustedAt',     label: 'Adjusted On',    w: 125 },
  ];

  if (pageLoading) return <AdjustmentReportWireframe />;

  return (
    <Fade in timeout={400}>
      <Box sx={{
        py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 },
        width: '100vw', maxWidth: '100%',
        position: 'relative', left: '53%', transform: 'translateX(-51%)',
        px: { xs: 2, sm: 3, md: 6 },
        fontFamily: T.font,
      }}>
        <style>{shimmerKf}</style>
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #adj-printable, #adj-printable * { visibility: visible; }
            #adj-printable { position: absolute; top: 0; left: 0; width: 100%; }
            .no-print { display: none !important; }
          }
        `}</style>

        {/* ── Page Header ── */}
        <SectionCard sx={{ mb: 2 }}>
          <Box sx={{
            px: 4, py: 3,
            background: 'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'relative', overflow: 'hidden',
          }}>
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.10) 0%,transparent 70%)', pointerEvents: 'none' }} />
            <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)', pointerEvents: 'none' }} />

            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, position: 'relative', zIndex: 1 }}>
              {/* Back button */}
              <Tooltip title="Back to Attendance Management">
                <IconButton
                  size="small"
                  onClick={handleBack}
                  sx={{
                    mt: 0.5, flexShrink: 0,
                    bgcolor: alpha(T.accent, 0.08),
                    border: `1px solid ${T.accentBorder}`,
                    color: T.accent,
                    '&:hover': { bgcolor: alpha(T.accent, 0.14) },
                  }}
                >
                  <ArrowBackIosIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>

              <Box sx={{
                width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${T.accent}`, bgcolor: alpha(T.accent, 0.07),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <EditCalendarIcon sx={{ fontSize: 26, color: T.accent, opacity: 0.8 }} />
              </Box>

              <Box>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.faint, mb: 0.25, fontFamily: T.font }}>
                  Human Resource Information System
                </Typography>
                <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.25, fontFamily: T.font }}>
                  Attendance Adjustment Report
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', color: T.accentMid, fontWeight: 600, fontFamily: T.font }}>
                  Full audit trail of every admin-modified attendance time entry
                </Typography>

                {/* Pre-filter badge — only shown when arriving from AttendanceSearch */}
                {preEmpNum && (
                  <Box sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 0.75, mt: 0.75,
                    px: 1.25, py: 0.35, borderRadius: '5px',
                    bgcolor: alpha(T.accent, 0.1), border: `1px solid ${T.accentBorder}`,
                  }}>
                    <PersonIcon sx={{ fontSize: 12, color: T.accent }} />
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, fontFamily: T.font }}>
                      Filtered: {preEmpName || preEmpNum}
                    </Typography>
                    <button
                      onClick={clearFilters}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: T.faint, fontSize: '0.65rem', padding: 0, fontFamily: T.font,
                      }}
                    >
                      ✕ clear
                    </button>
                  </Box>
                )}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1.5, position: 'relative', zIndex: 1 }}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: '0.65rem', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: T.font }}>
                  Generated
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.text, fontFamily: T.font }}>
                  {today}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Refresh">
                  <IconButton size="small" onClick={fetchData} disabled={loading}
                    sx={{ bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, color: T.accent, '&:hover': { bgcolor: alpha(T.accent, 0.14) } }}>
                    {loading
                      ? <CircularProgress size={14} sx={{ color: T.accent }} />
                      : <RefreshIcon sx={{ fontSize: 16 }} />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Print Report">
                  <IconButton size="small" onClick={() => window.print()}
                    sx={{ bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, color: T.accent, '&:hover': { bgcolor: alpha(T.accent, 0.14) } }}>
                    <PrintIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>
        </SectionCard>

        {/* ── Error banner ── */}
        {error && (
          <Box sx={{ mb: 2, px: 2, py: 1.5, borderRadius: '8px', bgcolor: alpha('#d32f2f', 0.06), border: `1px solid ${alpha('#d32f2f', 0.25)}` }}>
            <Typography sx={{ fontSize: '0.82rem', color: '#b71c1c', fontFamily: T.font }}>{error}</Typography>
          </Box>
        )}

        {/* ── Stat Cards ── */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }} className="no-print">
          <StatCard label="Total Adjustments"  value={totalAdjustments}  color={T.accent}    icon={EditCalendarIcon}   />
          <StatCard label="Employees Affected" value={employeesAffected} color="#2563eb"     icon={GroupsIcon}         />
          <StatCard label="New Insertions"     value={newInsertions}     color="#92400e"     icon={EditCalendarIcon}   />
          <StatCard label="Auto-Fills"         value={autoFillCount}     color={T.accentMid} icon={EventAvailableIcon} />
        </Box>

        {/* ── Filter Panel ── */}
        <SectionCard sx={{ mb: 2 }} className="no-print">
          <PanelHeader
            icon={FilterListIcon}
            title="Report Filters"
            rightContent={
              <button onClick={clearFilters} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: T.faint, fontSize: '0.72rem', fontFamily: T.font,
              }}>
                Clear All
              </button>
            }
          />
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>

              {/* Date From */}
              <Box sx={{ flex: '1 1 130px', minWidth: 130 }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.faint, mb: 0.5, fontFamily: T.font }}>
                  Date From
                </Typography>
                <NativeInput type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  icon={<CalendarTodayIcon sx={{ fontSize: 14 }} />} />
              </Box>

              {/* Date To */}
              <Box sx={{ flex: '1 1 130px', minWidth: 130 }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.faint, mb: 0.5, fontFamily: T.font }}>
                  Date To
                </Typography>
                <NativeInput type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  icon={<CalendarTodayIcon sx={{ fontSize: 14 }} />} />
              </Box>

              {/* Employee Name */}
              <Box sx={{ flex: '1 1 160px', minWidth: 160 }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.faint, mb: 0.5, fontFamily: T.font }}>
                  Employee Name
                </Typography>
                <NativeInput value={searchName} onChange={e => setSearchName(e.target.value)}
                  placeholder="Search name…" icon={<PersonIcon sx={{ fontSize: 14 }} />} />
              </Box>

              {/* Emp No. */}
              <Box sx={{ flex: '1 1 130px', minWidth: 130 }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.faint, mb: 0.5, fontFamily: T.font }}>
                  Employee No.
                </Typography>
                <NativeInput value={searchEmpNum} onChange={e => setSearchEmpNum(e.target.value)}
                  placeholder="EMP-XXX…" icon={<SearchIcon sx={{ fontSize: 14 }} />} />
              </Box>

              {/* Source */}
              <Box sx={{ flex: '1 1 130px', minWidth: 130 }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.faint, mb: 0.5, fontFamily: T.font }}>
                  Source
                </Typography>
                <FormControl fullWidth size="small">
                  <Select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} sx={selectSx}>
                    <MenuItem value="all"      sx={menuItemSx}>All Sources</MenuItem>
                    <MenuItem value="autofill" sx={menuItemSx}>Auto-Fill only</MenuItem>
                    <MenuItem value="manual"   sx={menuItemSx}>Manual only</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Adjustment Type */}
              <Box sx={{ flex: '1 1 140px', minWidth: 140 }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.faint, mb: 0.5, fontFamily: T.font }}>
                  Field
                </Typography>
                <FormControl fullWidth size="small">
                  <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} sx={selectSx}>
                    <MenuItem value="all" sx={menuItemSx}>All Fields</MenuItem>
                    {ADJ_TYPES.map(t => (
                      <MenuItem key={t} value={t} sx={menuItemSx}>{t}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Operation Type */}
              <Box sx={{ flex: '1 1 120px', minWidth: 120 }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.faint, mb: 0.5, fontFamily: T.font }}>
                  Operation
                </Typography>
                <FormControl fullWidth size="small">
                  <Select value={opFilter} onChange={e => setOpFilter(e.target.value)} sx={selectSx}>
                    <MenuItem value="all"    sx={menuItemSx}>All</MenuItem>
                    <MenuItem value="UPDATE" sx={menuItemSx}>Edit (UPDATE)</MenuItem>
                    <MenuItem value="INSERT" sx={menuItemSx}>New (INSERT)</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Department */}
              {departments.length > 0 && (
                <Box sx={{ flex: '1 1 140px', minWidth: 140 }}>
                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.faint, mb: 0.5, fontFamily: T.font }}>
                    Department
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} sx={selectSx}>
                      <MenuItem value="all" sx={menuItemSx}>All Departments</MenuItem>
                      {departments.map(d => (
                        <MenuItem key={d} value={d} sx={menuItemSx}>{d}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              )}

            </Box>
          </Box>
        </SectionCard>

        {/* ── Data Table ── */}
        <SectionCard id="adj-printable">

          {/* Toolbar */}
          <Box sx={{
            px: 2.5, py: 1.5,
            borderBottom: `1px solid ${T.divider}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 1.5, flexWrap: 'wrap',
          }} className="no-print">
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <SearchIcon sx={{ position: 'absolute', left: 10, fontSize: 15, color: T.faint, pointerEvents: 'none' }} />
              <input
                placeholder="Quick search by name…"
                value={searchName}
                onChange={e => { setSearchName(e.target.value); setPage(0); }}
                style={{
                  paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
                  width: 240, fontSize: '0.8rem',
                  border: `1px solid ${T.accentBorder}`, borderRadius: '6px',
                  outline: 'none', fontFamily: T.font,
                }}
                onFocus={e => { e.target.style.borderColor = T.accent; }}
                onBlur={e  => { e.target.style.borderColor = T.accentBorder; }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {loading && <CircularProgress size={14} sx={{ color: T.accent }} />}
              <Typography sx={{ fontSize: '0.78rem', color: T.faint, fontWeight: 600, fontFamily: T.font }}>
                {filtered.length} record{filtered.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Box>

          {/* Print-only header */}
          <Box sx={{ display: 'none', '@media print': { display: 'block' }, px: 3, py: 2 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: T.accent, fontFamily: T.font }}>
              Attendance Adjustment Report
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: T.muted, fontFamily: T.font }}>
              Generated: {today}
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
              <Typography sx={{ fontSize: '0.75rem', fontFamily: T.font }}>
                Total: <strong>{totalAdjustments}</strong>
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', fontFamily: T.font }}>
                Employees: <strong>{employeesAffected}</strong>
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', fontFamily: T.font }}>
                Auto-fills: <strong>{autoFillCount}</strong>
              </Typography>
            </Box>
          </Box>

          {/* Scrollable table */}
          <Box sx={{
            overflowX: 'auto', maxHeight: 560, overflowY: 'auto',
            scrollbarWidth: 'thin',
            '&::-webkit-scrollbar': { height: 5, width: 5 },
            '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 3 },
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: 1400 }}>
              <thead>
                <tr>
                  {TABLE_COLS.map(col => (
                    <th key={col.key} style={{
                      padding: '10px 14px', textAlign: 'left',
                      fontSize: '0.62rem', fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: '#fff', whiteSpace: 'nowrap',
                      background: T.accent,
                      borderBottom: `2px solid ${alpha(T.accent, 0.4)}`,
                      position: 'sticky', top: 0, zIndex: 10,
                      minWidth: col.w,
                      fontFamily: T.font,
                    }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={TABLE_COLS.length} style={{ padding: '60px 16px', textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <EditCalendarIcon sx={{ fontSize: 36, color: alpha(T.accent, 0.25) }} />
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, fontFamily: T.font }}>
                          {adjustments.length === 0 ? 'No adjustment records found' : 'No records match your filters'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.78rem', color: T.faint, fontFamily: T.font }}>
                          {adjustments.length === 0
                            ? 'Records appear here as soon as admins save changes in Attendance Management.'
                            : 'Try adjusting your filter criteria.'}
                        </Typography>
                      </Box>
                    </td>
                  </tr>
                ) : paged.map((rec, idx) => {
                  const isEven = idx % 2 === 0;
                  const rowBg  = isEven ? T.rowEven : T.rowOdd;
                  const adjDate = rec.adjustedAt
                    ? new Date(rec.adjustedAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })
                    : '—';

                  return (
                    <tr
                      key={rec.id}
                      onClick={() => { setSelected(rec); setDetailOpen(true); }}
                      style={{ borderBottom: `1px solid ${T.divider}`, background: rowBg, cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = T.rowHover; }}
                      onMouseLeave={e => { e.currentTarget.style.background = rowBg; }}
                    >
                      {/* Emp No. */}
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.72rem', color: T.accent, fontWeight: 700 }}>
                        {rec.employeeNumber}
                      </td>

                      {/* Name */}
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: T.text, fontFamily: T.font }}>
                        {rec.employeeName || <span style={{ color: T.faint, fontStyle: 'italic' }}>—</span>}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.74rem', color: T.muted, whiteSpace: 'nowrap' }}>
                        {formatDate(rec.originalDate)}
                      </td>

                      {/* Day */}
                      <td style={{ padding: '10px 14px', fontSize: '0.74rem', color: T.muted, whiteSpace: 'nowrap', fontFamily: T.font }}>
                        {rec.dayOfWeek || '—'}
                      </td>

                      {/* Op */}
                      <td style={{ padding: '10px 14px' }}>
                        <OpTypeBadge type={rec.operationType} />
                      </td>

                      {/* Source */}
                      <td style={{ padding: '10px 14px' }}>
                        <SourceBadge autofillRemarks={rec.autofillRemarks} />
                      </td>

                      {/* Field */}
                      <td style={{ padding: '10px 14px' }}>
                        <AdjTypeBadge type={rec.adjustmentType} />
                      </td>

                      {/* Before → After */}
                      <td style={{ padding: '10px 14px' }}>
                        <BeforeAfter before={rec.valueBefore} after={rec.valueAfter} />
                      </td>

                      {/* Save Remarks */}
                      <td style={{ padding: '10px 14px', maxWidth: 210, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rec.remarks ? (
                          <Tooltip title={rec.remarks} placement="top">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <NotesIcon sx={{ fontSize: 13, color: '#1565c0', flexShrink: 0 }} />
                              <Typography sx={{
                                fontSize: '0.78rem', color: '#1565c0', fontFamily: T.font,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {rec.remarks}
                              </Typography>
                            </Box>
                          </Tooltip>
                        ) : (
                          <Typography sx={{ fontSize: '0.75rem', color: T.faint, fontStyle: 'italic', fontFamily: T.font }}>—</Typography>
                        )}
                      </td>

                      {/* Fill Remarks */}
                      <td style={{ padding: '10px 14px', maxWidth: 210, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rec.autofillRemarks ? (
                          <Tooltip title={rec.autofillRemarks} placement="top">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <EventAvailableIcon sx={{ fontSize: 13, color: T.accent, flexShrink: 0 }} />
                              <Typography sx={{
                                fontSize: '0.78rem', color: T.accentMid, fontFamily: T.font,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {rec.autofillRemarks}
                              </Typography>
                            </Box>
                          </Tooltip>
                        ) : (
                          <Typography sx={{ fontSize: '0.75rem', color: T.faint, fontStyle: 'italic', fontFamily: T.font }}>—</Typography>
                        )}
                      </td>

                      {/* Approved By */}
                      <td style={{ padding: '10px 14px', color: T.muted, whiteSpace: 'nowrap', fontSize: '0.78rem', fontFamily: T.font }}>
                        {rec.approvedBy}
                      </td>

                      {/* Adjusted On */}
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.72rem', color: T.muted, whiteSpace: 'nowrap' }}>
                        {adjDate}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {filtered.length > 0 && (
                <tfoot>
                  <tr style={{ background: alpha(T.accent, 0.05), borderTop: `2px solid ${T.accentBorder}` }}>
                    <td colSpan={TABLE_COLS.length} style={{ padding: '10px 14px', fontSize: '0.75rem', fontWeight: 700, color: T.muted, fontFamily: T.font }}>
                      {filtered.length} record{filtered.length !== 1 ? 's' : ''} &nbsp;|&nbsp;
                      {employeesAffected} employee{employeesAffected !== 1 ? 's' : ''} affected &nbsp;|&nbsp;
                      {newInsertions} new insertion{newInsertions !== 1 ? 's' : ''} &nbsp;|&nbsp;
                      {autoFillCount} auto-fill{autoFillCount !== 1 ? 's' : ''}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </Box>

          {/* Pagination */}
          {filtered.length > 0 && (
            <Box sx={{ px: 2, py: 0.5, borderTop: `1px solid ${T.divider}` }} className="no-print">
              <TablePagination
                component="div"
                count={filtered.length}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
                rowsPerPageOptions={[10, 25, 50, 100]}
                sx={{
                  '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                    fontSize: '0.78rem', fontWeight: 600, fontFamily: T.font,
                  },
                }}
              />
            </Box>
          )}
        </SectionCard>

        {/* ── Print signature card ── */}
        <SectionCard sx={{ mt: 2, display: 'none', '@media print': { display: 'block' } }}>
          <Box sx={{ px: 3, py: 2.5 }}>
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.faint, mb: 2, fontFamily: T.font }}>
              Certification
            </Typography>
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

        {/* ── Source note ── */}
        <Box sx={{ mt: 1.5, px: 0.5, display: 'flex', alignItems: 'center', gap: 0.75 }} className="no-print">
          <InfoIcon sx={{ fontSize: 13, color: T.faint }} />
          <Typography sx={{ fontSize: '0.7rem', color: T.faint, fontFamily: T.font }}>
            Data sourced from <strong>attendance_adjustment_log</strong> — written every time an admin saves via Attendance Management. Click any row to see full details.
          </Typography>
        </Box>

        {/* ── Detail Modal ── */}
        <DetailModal
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          record={selectedRecord}
        />
      </Box>
    </Fade>
  );
};

export default AttendanceAdjustmentReports;