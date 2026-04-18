import API_BASE_URL from '../../apiConfig';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useSocket } from '../../contexts/SocketContext';
import {
  Box,
  Typography,
  Alert,
  Collapse,
  Chip,
  CircularProgress,
  Fade,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  alpha,
  styled,
  Card,
  Button,
  Fab,
  Zoom,
  Avatar,
  Checkbox,
  Dialog,
  LinearProgress,
  Backdrop,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  TextField,
  Paper,
  List,
  ListItemButton,
  InputAdornment,
} from '@mui/material';
import {
  Search,
  Person,
  CalendarToday,
  AccessTime,
  CheckCircle,
  Cancel,
  Info,
  Refresh,
  Today,
  ArrowBackIos,
  Clear,
  KeyboardArrowUp,
  KeyboardArrowDown,
  FilterList,
  NewReleases,
  Send,
  People,
  Assignment,
  ArrowBack,
  ArrowForward,
  SearchOutlined,
  ExpandMore,
  ExpandLess,
  Close,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';

// ─── Theme tokens (mirrors AttendanceUserState T object) ───────────────────
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

// ─── Shimmer keyframes ─────────────────────────────────────────────────────
const shimmerKf = `
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}`;

// ─── Shimmer bone ──────────────────────────────────────────────────────────
const Bone = ({ w = '100%', h = 14, r = 6, sx = {} }) => (
  <Box sx={{
    width: w, height: h, borderRadius: r,
    background: 'linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)',
    backgroundSize: '800px 100%',
    animation: 'shimmer 1.6s infinite linear',
    flexShrink: 0, ...sx,
  }} />
);

// ─── Wireframe skeleton ────────────────────────────────────────────────────
const ViewAttendanceWireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box sx={{
      py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 },
      width: '100vw', maxWidth: '100%',
      position: 'relative', left: '63%', transform: 'translateX(-61%)',
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

// ─── Styled primitives (mirrors AttendanceUserState) ───────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: '#fff',
});

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.8rem',
  letterSpacing: '0.01em',
  transition: 'all 0.18s ease',
  '&:hover':  { transform: 'translateY(-1px)' },
  '&:active': { transform: 'translateY(0)' },
});

// ─── Shared panel header bar ───────────────────────────────────────────────
const PanelHeader = ({ icon: Icon, title, right }) => (
  <Box sx={{
    px: 2.5, py: 1.25,
    borderBottom: `1px solid ${T.divider}`,
    display: 'flex', alignItems: 'center', gap: 1.25,
    bgcolor: T.accentFaint, minHeight: 42,
  }}>
    <Icon sx={{ fontSize: 14, color: T.accent }} />
    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: T.accent }}>
      {title}
    </Typography>
    {right && <><Box sx={{ flex: 1 }} />{right}</>}
  </Box>
);

// ─── Native input ──────────────────────────────────────────────────────────
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

// ─── Row action button ─────────────────────────────────────────────────────
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

// ─── Quick filter button ───────────────────────────────────────────────────
const QuickBtn = ({ label, icon, onClick, active }) => (
  <button
    onClick={onClick}
    style={{
      background: active ? T.accent : 'transparent',
      border: `1px solid ${active ? T.accent : T.accentBorder}`,
      borderRadius: '6px',
      padding: '6px 14px',
      cursor: 'pointer',
      color: active ? '#fff' : T.accent,
      display: 'flex', alignItems: 'center', gap: '5px',
      fontSize: '0.78rem', fontWeight: 700,
      fontFamily: 'inherit',
      transition: 'all 0.15s ease',
      whiteSpace: 'nowrap',
    }}
    onMouseEnter={e => { if (!active) { e.currentTarget.style.backgroundColor = T.accentFaint; e.currentTarget.style.borderColor = T.accent; }}}
    onMouseLeave={e => { if (!active) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = T.accentBorder; }}}
  >
    {icon}{label}
  </button>
);

// ─── Styled table primitives ───────────────────────────────────────────────
const CompactTableContainer = styled(TableContainer)({
  borderRadius: 0,
  overflowX: 'auto',
});

const CompactTableCell = styled(TableCell)(({ isHeader }) => ({
  fontWeight: isHeader ? 700 : 500,
  padding: '10px 14px',
  borderBottom: isHeader ? `1px solid ${T.divider}` : `1px solid ${T.divider}`,
  fontSize: isHeader ? '0.65rem' : '0.8rem',
  letterSpacing: isHeader ? '0.08em' : '0.01em',
  color: isHeader ? '#fff' : T.text,
  whiteSpace: 'nowrap',
}));

// ─── Utility functions ─────────────────────────────────────────────────────
const formatTime = (time) => {
  if (!time) return 'N/A';
  if (time.includes('AM') || time.includes('PM')) {
    const [hour, minute, second] = time.split(/[: ]/);
    return `${hour.padStart(2,'0')}:${minute}:${second} ${time.slice(-2)}`;
  }
  const [hour, minute, second] = time.split(':');
  const hour24 = parseInt(hour, 10);
  const hour12 = hour24 % 12 || 12;
  return `${String(hour12).padStart(2,'0')}:${minute}:${second} ${hour24 < 12 ? 'AM' : 'PM'}`;
};

const getDayOfWeek = (dateString) =>
  new Date(dateString).toLocaleDateString('en-US', { weekday: 'long' });

const formatFullName = (fullName) => {
  if (!fullName) return '';
  const cleaned = String(fullName).trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  const parts    = cleaned.split(' ');
  const suffixes = new Set(['JR','JR.','SR','SR.','II','III','IV','V']);
  let suffix = '';
  if (suffixes.has(parts[parts.length - 1]?.toUpperCase())) suffix = parts.pop();
  if (parts.length === 1) return suffix ? `${parts[0]} ${suffix}` : parts[0];
  const firstName       = parts[0];
  const lastName        = parts[parts.length - 1];
  const middleFormatted = parts.slice(1, parts.length - 1)
    .map((m) => { const mm = String(m).replace(/\./g,''); return mm.length === 1 ? `${mm.toUpperCase()}.` : m; })
    .join(' ');
  const base = `${lastName}, ${firstName}${middleFormatted ? ` ${middleFormatted}` : ''}`;
  return suffix ? `${base} ${suffix}` : base;
};

const highlightMatch = (text, q) => {
  const query = (q || '').trim();
  if (!query || !text) return text;
  const s   = String(text);
  const idx = s.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <span>
      {s.slice(0, idx)}
      <span style={{ backgroundColor: '#ffeb3b', color: '#000', padding: '0 3px', borderRadius: 2 }}>
        {s.slice(idx, idx + query.length)}
      </span>
      {s.slice(idx + query.length)}
    </span>
  );
};

// ─── Employee search field (debounced, users-backed) ───────────────────────
const EmployeeSearchField = ({ value, onSelectEmployeeNumber, disabled = false }) => {
  const [query, setQuery] = useState(value || '');
  const [debouncedQuery, setDebouncedQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
    setDebouncedQuery(value || '');
  }, [value]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    if (abortRef.current) abortRef.current.abort();

    const q = debouncedQuery.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    axios
      .get(`${API_BASE_URL}/users/search`, {
        params: { q },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setResults(list.slice(0, 20));
      })
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED') return;
        console.error('Error searching registered users:', err);
        setResults([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [debouncedQuery, open]);

  const queueSearch = (nextValue) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(nextValue);
      setOpen(true);
    }, 220);
  };

  const handleInputChange = (event) => {
    const next = event.target.value;
    onSelectEmployeeNumber(next);
    setQuery(next);
    queueSearch(next);
  };

  const handleSelect = (employee) => {
    const employeeNumber = employee?.employeeNumber ? String(employee.employeeNumber) : '';
    onSelectEmployeeNumber(employeeNumber);
    setQuery(employeeNumber);
    setDebouncedQuery(employeeNumber);
    setOpen(false);
  };

  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    setQuery('');
    setDebouncedQuery('');
    setResults([]);
    setOpen(false);
    onSelectEmployeeNumber('');
  };

  return (
    <Box sx={{ position: 'relative', width: '100%' }} ref={containerRef}>
      <TextField
        fullWidth
        size="small"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        placeholder="Type name or employee number..."
        disabled={disabled}
        autoComplete="off"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Person sx={{ color: T.accentMid, fontSize: 16 }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {loading ? (
                <CircularProgress size={14} sx={{ color: T.accent }} />
              ) : query ? (
                <IconButton size="small" onClick={handleClear} sx={{ p: 0.25 }}>
                  <Close sx={{ fontSize: 14, color: T.faint }} />
                </IconButton>
              ) : (
                <IconButton size="small" onClick={() => setOpen((p) => !p)} sx={{ p: 0.25 }}>
                  {open ? (
                    <ExpandLess sx={{ fontSize: 16, color: T.faint }} />
                  ) : (
                    <ExpandMore sx={{ fontSize: 16, color: T.faint }} />
                  )}
                </IconButton>
              )}
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accent },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.accent },
          },
        }}
      />

      {open && (
        <Paper
          elevation={6}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1300,
            mt: 0.5,
            maxHeight: 280,
            overflow: 'auto',
            borderRadius: '10px',
            border: `1px solid ${T.accentBorder}`,
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 2.5 }}>
              <CircularProgress size={16} sx={{ color: T.accent }} />
              <Typography sx={{ fontSize: '0.8rem', color: T.muted }}>Searching...</Typography>
            </Box>
          ) : results.length > 0 ? (
            <List dense disablePadding>
              {results.map((emp) => (
                <ListItemButton
                  key={emp.employeeNumber}
                  onClick={() => handleSelect(emp)}
                  sx={{
                    py: 1,
                    px: 1.5,
                    borderBottom: `1px solid ${T.divider}`,
                    '&:hover': { bgcolor: T.accentFaint },
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                    <Typography sx={{ fontSize: '0.83rem', fontWeight: 700, color: T.text, lineHeight: 1.2 }}>
                      {formatFullName(emp.fullName)}
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>
                      #{emp.employeeNumber}
                    </Typography>
                  </Box>
                </ListItemButton>
              ))}
            </List>
          ) : (
            <Box sx={{ py: 2.5, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.78rem', color: T.faint, fontStyle: 'italic' }}>
                {query.trim().length >= 2 ? `No registered user found for "${query.trim()}"` : 'Type at least 2 characters to search users'}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
const ViewAttendanceRecord = () => {
  const { socket, connected } = useSocket();
  const { settings }          = useSystemSettings();
  const navigate              = useNavigate();

  const [personID, setPersonID]     = useState('');
  const [startDate, setStartDate]   = useState('');
  const [endDate, setEndDate]       = useState('');
  const [records, setRecords]       = useState([]);
  const [personName, setPersonName] = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const [snackbar, setSnackbar]                   = useState({ open: false, message: '', severity: 'success' });
  const [snackbarCountdown, setSnackbarCountdown] = useState(6);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalMessage, setModalMessage]         = useState('');

  const [allUsersDTR, setAllUsersDTR]         = useState([]);
  const [selectedUsers, setSelectedUsers]     = useState(new Set());
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);
  const [viewMode, setViewMode]               = useState('single');
  const [selectedMonth, setSelectedMonth]     = useState(null);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const [departments, setDepartments]                           = useState([]);
  const [departmentAssignmentsMap, setDepartmentAssignmentsMap] = useState({});
  const [departmentCodeFilter, setDepartmentCodeFilter]         = useState('');
  const [loadingDepartments, setLoadingDepartments]             = useState(false);

  const [rowsPerPage, setRowsPerPage]   = useState(10);
  const [currentPage, setCurrentPage]   = useState(1);
  const [recordFilter, setRecordFilter] = useState('all');
  const [searchQuery, setSearchQuery]   = useState('');

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => clearTimeout(t);
  }, [searchQuery]);
  const trimmedSearch = debouncedSearch.trim();

  const [progressOpen, setProgressOpen]   = useState(false);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressDone, setProgressDone]   = useState(0);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [pageLoading, setPageLoading]     = useState(true);

  const fetchRecordsRef     = useRef(null);
  const fetchAllUsersDTRRef = useRef(null);
  const resultsRef          = useRef(null);

  const { hasAccess, loading: accessLoading } = usePageAccess('view-attendance');

  const today          = new Date();
  const formattedToday = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
    setSnackbarCountdown(6);
  };
  const handleCloseSnackbar = () => setSnackbar((p) => ({ ...p, open: false }));

  useEffect(() => {
    let timer;
    if (snackbar.open && snackbarCountdown > 0)
      timer = setInterval(() => setSnackbarCountdown((p) => p - 1), 1000);
    return () => clearInterval(timer);
  }, [snackbar.open, snackbarCountdown]);

  useEffect(() => { if (!accessLoading) setPageLoading(false); }, [accessLoading]);

  useEffect(() => {
    if (records.length > 0 && viewMode === 'single' && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 30);
    }
  }, [records, viewMode]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchDepartmentsAndAssignments = async () => {
    setLoadingDepartments(true);
    try {
      const [deptRes, assignRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/department-table`, getAuthHeaders()),
        axios.get(`${API_BASE_URL}/api/department-assignment`, getAuthHeaders()),
      ]);
      const deptList = Array.isArray(deptRes.data) ? deptRes.data : [];
      deptList.sort((a, b) => String(a?.code||'').localeCompare(String(b?.code||'')));
      setDepartments(deptList);
      const map = {};
      (Array.isArray(assignRes.data) ? assignRes.data : []).forEach((a) => {
        if (!a?.employeeNumber) return;
        map[String(a.employeeNumber)] = a.code || '';
      });
      setDepartmentAssignmentsMap(map);
    } catch (err) {
      console.error('Error fetching departments/assignments:', err);
      setDepartments([]); setDepartmentAssignmentsMap({});
      showSnackbar('Failed to load departments for filtering', 'warning');
    } finally { setLoadingDepartments(false); }
  };

  useEffect(() => {
    if (viewMode !== 'multiple') return;
    fetchDepartmentsAndAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  const filteredUsers = useMemo(() => {
    let f = allUsersDTR.slice();
    if (recordFilter === 'has') f = f.filter((u) => (u.recordsCount || 0) > 0);
    else if (recordFilter === 'no') f = f.filter((u) => (u.recordsCount || 0) === 0);
    if (departmentCodeFilter) {
      f = f.filter((u) => {
        const dc = departmentAssignmentsMap?.[u.employeeNumber] || '';
        if (departmentCodeFilter === '__UNASSIGNED__') return !dc;
        return dc === departmentCodeFilter;
      });
    }
    if (!trimmedSearch) return f;
    const q = trimmedSearch.toLowerCase();
    return f.filter((u) =>
      (u.fullName||'').toLowerCase().includes(q) ||
      (u.lastName||'').toLowerCase().includes(q) ||
      (u.employeeNumber||'').toLowerCase().includes(q),
    );
  }, [allUsersDTR, recordFilter, departmentCodeFilter, departmentAssignmentsMap, trimmedSearch]);

  const selectedCountInFiltered = useMemo(() => {
    let c = 0; for (const u of filteredUsers) if (selectedUsers.has(u.employeeNumber)) c++;
    return c;
  }, [filteredUsers, selectedUsers]);

  const totalPages     = useMemo(() => Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage)), [filteredUsers.length, rowsPerPage]);
  const paginatedUsers = useMemo(() => { const s = (currentPage-1)*rowsPerPage; return filteredUsers.slice(s, s+rowsPerPage); }, [filteredUsers, currentPage, rowsPerPage]);
  const goToPage       = (p) => setCurrentPage(Math.min(Math.max(1,p), totalPages));

  const fetchRecords = async (showLoading = true) => {
    if (!personID || !startDate || !endDate) return;
    if (showLoading) setLoading(true);
    setError('');
    try {
      const res  = await axios.post(`${API_BASE_URL}/attendance/api/all-attendance`, { personID, startDate, endDate }, getAuthHeaders());
      const recs = Array.isArray(res.data) ? res.data : [];
      setRecords(recs);
      if (recs.length > 0) { setPersonName(recs[0].PersonName); showSnackbar(`Loaded ${recs.length} records and auto-saved to database`, 'success'); }
      else { setPersonName(''); showSnackbar('No records found for this period', 'info'); }
    } catch (err) {
      console.error('Error fetching attendance records:', err);
      setError('Failed to fetch attendance records. Please try again.');
      showSnackbar('Failed to fetch attendance records', 'error');
    } finally { if (showLoading) setLoading(false); }
  };

  const fetchAllUsersDTR = async () => {
    if (!startDate || !endDate) { showSnackbar('Please select start date and end date first', 'warning'); return; }
    setLoadingAllUsers(true); setProgressOpen(true); setProgressDone(0); setProgressTotal(0);
    try {
      const usersRes = await axios.get(`${API_BASE_URL}/attendance/api/all-device-users`, getAuthHeaders());
      let users = usersRes.data || [];
      if (departmentCodeFilter && Object.keys(departmentAssignmentsMap||{}).length === 0 && !loadingDepartments)
        await fetchDepartmentsAndAssignments();
      if (departmentCodeFilter) {
        const dm = departmentAssignmentsMap || {};
        users = users.filter((u) => {
          const dc = dm[String(u?.PersonID??'')] || '';
          if (departmentCodeFilter === '__UNASSIGNED__') return !dc;
          return dc === departmentCodeFilter;
        });
      }
      showSnackbar(`Found ${users.length} users in device records`, 'info');
      setProgressTotal(users.length); setProgressDone(0);
      const dtrPromises = users.map(async (user) => {
        const empNo = user?.PersonID; const dn = user?.PersonName || empNo || 'Unknown';
        try {
          const dr = await axios.post(`${API_BASE_URL}/attendance/api/all-attendance`, { personID: empNo, startDate, endDate }, getAuthHeaders());
          const dd = Array.isArray(dr.data) ? dr.data : [];
          return { employeeNumber: empNo, firstName: dn.split(' ')[0], lastName: dn.split(' ').slice(1).join(' '), fullName: dn, recordsCount: dd.length, hasRecords: dd.length > 0 };
        } catch { return { employeeNumber: empNo, firstName: dn.split(' ')[0], lastName: dn.split(' ').slice(1).join(' '), fullName: dn, recordsCount: 0, hasRecords: false }; }
        finally { setProgressDone((p) => p + 1); }
      });
      const all = await Promise.all(dtrPromises);
      all.sort((a, b) => (a.lastName||'').toUpperCase().localeCompare((b.lastName||'').toUpperCase()));
      setAllUsersDTR(all);
      const totalRecs = all.reduce((s,u) => s+(u.recordsCount||0), 0);
      const withRecs  = all.filter((u) => u.hasRecords).length;
      showSnackbar(`Loaded ${all.length} employees (${withRecs} with records, ${totalRecs} total records auto-saved)`, 'success');
      if (totalRecs > 0) {
        setModalMessage(`Successfully auto-saved ${totalRecs} attendance records for ${withRecs} employees to the database. You can now view or print their DTR.`);
        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error('Error fetching all users DTR:', err);
      showSnackbar('Error fetching users DTR data: ' + (err.response?.data?.error || err.message), 'error');
    } finally { setLoadingAllUsers(false); setTimeout(() => setProgressOpen(false), 250); }
  };

  useEffect(() => { fetchRecordsRef.current = fetchRecords; fetchAllUsersDTRRef.current = fetchAllUsersDTR; });

  useEffect(() => {
    if (!socket || !connected) return;
    let debounceTimer = null;
    const handleAttendanceChanged = (payload) => {
      const ids = Array.isArray(payload?.personIDs) ? payload.personIDs : payload?.personID ? [payload.personID] : [];
      if (viewMode === 'single') {
        if (personID && ids.length > 0 && !ids.includes(personID)) return;
        if (personID && startDate && endDate) fetchRecordsRef.current?.(false);
        return;
      }
      if (!startDate || !endDate || allUsersDTR.length === 0) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchAllUsersDTRRef.current?.(), 300);
    };
    socket.on('attendanceChanged', handleAttendanceChanged);
    return () => { if (debounceTimer) clearTimeout(debounceTimer); socket.off('attendanceChanged', handleAttendanceChanged); };
  }, [socket, connected, viewMode, personID, startDate, endDate, allUsersDTR.length]);

  const handleSendToDTR = async () => {
    if (!personID || !startDate || !endDate) { showSnackbar('Please fill in all fields first', 'warning'); return; }
    try {
      const res = await axios.post(`${API_BASE_URL}/attendance/api/send-to-dtr`, { personID, startDate, endDate }, getAuthHeaders());
      if (res.data.success) { showSnackbar(res.data.message, 'success'); navigate('/daily_time_record_faculty', { state: { employeeNumber: personID, fullName: personName, startDate, endDate } }); }
    } catch (err) { showSnackbar(err.response?.data?.message || 'Failed to view to DTR', 'error'); }
  };

  const handleBulkSendToDTR = async () => {
    const sel = filteredUsers.filter((u) => selectedUsers.has(u.employeeNumber));
    if (sel.length === 0) { showSnackbar('Please select at least one user', 'warning'); return; }
    try {
      const res = await axios.post(`${API_BASE_URL}/attendance/api/bulk-send-to-dtr`, { userIDs: sel.map((u) => u.employeeNumber), startDate, endDate }, getAuthHeaders());
      if (res.data.success) { showSnackbar(res.data.message, 'success'); navigate('/daily_time_record_faculty', { state: { users: sel, startDate, endDate, isBulk: true } }); }
    } catch (err) { showSnackbar(err.response?.data?.message || 'Failed to view DTR', 'error'); }
  };

  const handleUserSelect = (empNo) => setSelectedUsers((p) => { const n = new Set(p); n.has(empNo) ? n.delete(empNo) : n.add(empNo); return n; });
  const handleSelectAll  = (checked) => checked ? setSelectedUsers(new Set(filteredUsers.map((u) => u.employeeNumber))) : setSelectedUsers(new Set());
  const handleSubmit     = (e) => { e.preventDefault(); fetchRecords(true); };

  useEffect(() => {
    if (personID && startDate && endDate) fetchRecords(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

  const handleMonthClick = (monthIndex) => {
    const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const end   = new Date(Date.UTC(selectedYear, monthIndex + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex);
  };

  const handleClearFilters = () => {
    setPersonID(''); setStartDate(''); setEndDate(''); setRecords([]);
    setPersonName(''); setError(''); setAllUsersDTR([]); setSelectedUsers(new Set());
    setDepartmentCodeFilter(''); setSelectedMonth(null); setSearchQuery(''); setCurrentPage(1);
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // ── Guards ──
  if (pageLoading || accessLoading) return <ViewAttendanceWireframe />;

  if (hasAccess === false) return (
    <AccessDenied title="Access Denied" message="You do not have permission to access Device Attendance Records." returnPath="/admin-home" returnButtonText="Return to Home" />
  );

  const pct = progressTotal > 0 ? Math.min(100, Math.round((progressDone / progressTotal) * 100)) : 0;

  return (
    <Fade in timeout={400}>
      <Box sx={{
        py: { xs: 1, md: 2 },
        mt: { xs: 0, md: -2 },
        mb: { xs: 1, md: 2 },
        width: '100vw', maxWidth: '100%',
        position: 'relative', left: '63%',
        transform: 'translateX(-61%)',
        px: { xs: 2, sm: 3, md: 6 },
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

        {/* ── Progress Dialog ── */}
        <Dialog open={progressOpen} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
          <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: T.text }}>Loading All Users</Typography>
            <CircularProgress size={72} thickness={4} sx={{ color: '#2e7d32', my: 0.5 }} />
            <Typography sx={{ fontWeight: 900, fontSize: '1.4rem', color: '#2e7d32' }}>{pct}%</Typography>
            <Box sx={{ width: '100%' }}>
              <LinearProgress variant="determinate" value={pct}
                sx={{ height: 10, borderRadius: 99, bgcolor: T.divider, '& .MuiLinearProgress-bar': { borderRadius: 99, bgcolor: '#2e7d32' } }} />
            </Box>
            <Typography sx={{ fontSize: '0.78rem', color: T.muted, fontWeight: 600 }}>{progressDone} / {progressTotal} processed</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>Please wait while records are being fetched and auto-saved…</Typography>
          </Box>
        </Dialog>

        {/* ── Success Modal ── */}
        <Dialog open={showSuccessModal} onClose={() => setShowSuccessModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <Box sx={{ p: 4, textAlign: 'center', background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)' }}>
            <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: '#4caf50' }}>
              <CheckCircle sx={{ fontSize: 36, color: '#fff' }} />
            </Avatar>
            <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: T.accent, mb: 1.5 }}>Records Auto-Saved Successfully!</Typography>
            <Typography sx={{ fontSize: '0.85rem', color: T.muted, mb: 3, lineHeight: 1.6 }}>{modalMessage}</Typography>
            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                background: T.accent, color: '#fff', border: 'none', borderRadius: '8px',
                padding: '10px 32px', fontWeight: 700, fontSize: '0.875rem',
                fontFamily: 'inherit', cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = T.accentDark; }}
              onMouseLeave={e => { e.currentTarget.style.background = T.accent; }}
            >
              OK
            </button>
          </Box>
        </Dialog>

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
              <Search sx={{ fontSize: 30, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.25 }}>
                  Device Attendance Records
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', color: T.accentMid, fontWeight: 600 }}>
                  Auto-saved records from biometric devices · Ready for DTR
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
              {/* View mode toggle */}
              <Box sx={{ display: 'flex', borderRadius: '8px', border: `1px solid ${T.accentBorder}`, overflow: 'hidden' }}>
                {['single', 'multiple'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    style={{
                      background: viewMode === mode ? T.accent : 'transparent',
                      border: 'none',
                      padding: '7px 14px',
                      cursor: 'pointer',
                      color: viewMode === mode ? '#fff' : T.accent,
                      fontSize: '0.75rem', fontWeight: 700,
                      fontFamily: 'inherit',
                      transition: 'all 0.15s',
                    }}
                  >
                    {mode === 'single' ? 'Single User' : 'All Users'}
                  </button>
                ))}
              </Box>

              <Box sx={{ px: 2, py: 0.6, borderRadius: 5, bgcolor: alpha('#4caf50', 0.12), border: '1px solid rgba(76,175,80,0.25)' }}>
                <Typography sx={{ fontSize: '0.72rem', color: '#2e7d32', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CheckCircle sx={{ fontSize: 12 }} /> Auto-Save Enabled
                </Typography>
              </Box>

              <button
                onClick={() => fetchRecords(true)}
                style={{
                  background: alpha(T.accent, 0.08),
                  border: `1px solid ${T.accentBorder}`,
                  borderRadius: '8px',
                  padding: '7px 10px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  color: T.accent, fontSize: '0.75rem', fontWeight: 700,
                  fontFamily: 'inherit', transition: 'all 0.15s',
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
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.82rem' }}>
            {error}
          </Alert>
        </Collapse>

        {/* ── Controls Card ── */}
        <SectionCard sx={{ mb: 2 }}>
          <PanelHeader icon={FilterList} title="Filter Attendance Records" />

          <Box sx={{ px: 2.5, pt: 2, pb: 2.5 }}>

            {/* Input fields */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
              {viewMode === 'single' && (
                <Box sx={{ flex: 1, minWidth: 160 }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Employee Number
                  </Typography>
                  <EmployeeSearchField value={personID} onSelectEmployeeNumber={setPersonID} />
                </Box>
              )}
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

            {/* Department filter (All Users mode) */}
            {viewMode === 'multiple' && (
              <Box sx={{ mb: 2.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <Box sx={{ flex: 1, minWidth: 220 }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Department
                  </Typography>
                  <FormControl fullWidth size="small" disabled={loadingDepartments}>
                    <Select
                      value={departmentCodeFilter}
                      onChange={(e) => { setDepartmentCodeFilter(e.target.value); setCurrentPage(1); }}
                      displayEmpty
                      sx={{
                        borderRadius: '8px', fontSize: '0.875rem', bgcolor: '#fff',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accent },
                      }}
                    >
                      <MenuItem value="" sx={{ fontSize: '0.875rem' }}>All Departments</MenuItem>
                      <MenuItem value="__UNASSIGNED__" sx={{ fontSize: '0.875rem' }}>Unassigned</MenuItem>
                      {departments.map((d) => (
                        <MenuItem key={d.id ?? d.code} value={d.code} sx={{ fontSize: '0.875rem' }}>
                          {d.code}{d.description ? ` - ${d.description}` : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <RowBtn
                  icon={loadingDepartments ? <CircularProgress size={12} /> : <Refresh sx={{ fontSize: 13 }} />}
                  label="Refresh Depts"
                  color={T.accent}
                  hoverBg={T.accentFaint}
                  onClick={fetchDepartmentsAndAssignments}
                  disabled={loadingDepartments}
                />
              </Box>
            )}

            <Box sx={{ height: 1, bgcolor: T.divider, mb: 2 }} />

            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, mb: 1.25, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <FilterList sx={{ fontSize: 13 }} />
              Quick Date Selection
            </Typography>

            {/* Quick buttons */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
              {[
                { label: 'Today',        icon: <Today sx={{ fontSize: 13 }} />,        fn: () => { setStartDate(formattedToday); setEndDate(formattedToday); setSelectedMonth(null); } },
                { label: 'Yesterday',    icon: <ArrowBackIos sx={{ fontSize: 11 }} />, fn: () => { const y = new Date(today); y.setDate(y.getDate()-1); const s = y.toISOString().substring(0,10); setStartDate(s); setEndDate(s); setSelectedMonth(null); } },
                { label: 'Last 7 Days',  icon: null, fn: () => { const d = new Date(today); d.setDate(d.getDate()-7); setStartDate(d.toISOString().substring(0,10)); setEndDate(formattedToday); setSelectedMonth(null); } },
                { label: 'Last 15 Days', icon: null, fn: () => { const d = new Date(today); d.setDate(d.getDate()-15); setStartDate(d.toISOString().substring(0,10)); setEndDate(formattedToday); setSelectedMonth(null); } },
                { label: 'Last 30 Days', icon: null, fn: () => { const d = new Date(today); d.setMonth(d.getMonth()-1); setStartDate(d.toISOString().substring(0,10)); setEndDate(formattedToday); setSelectedMonth(null); } },
              ].map(({ label, icon, fn }) => (
                <QuickBtn key={label} label={label} icon={icon} onClick={fn} />
              ))}
            </Box>

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
                    {yearOptions.map((y) => <MenuItem key={y} value={y} sx={{ fontSize: '0.85rem' }}>{y}</MenuItem>)}
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
                        borderRadius: '6px',
                        padding: '7px 14px',
                        cursor: 'pointer',
                        color: sel ? '#fff' : T.accent,
                        fontSize: '0.75rem', fontWeight: 700,
                        fontFamily: 'inherit',
                        transition: 'all 0.15s ease',
                        boxShadow: sel ? `0 2px 8px ${alpha(T.accent, 0.25)}` : 'none',
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

            {/* Clear + Submit */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, flexWrap: 'wrap', gap: 1 }}>
              <RowBtn
                icon={<Clear sx={{ fontSize: 13 }} />}
                label="Clear All Filters"
                color="#C62828"
                hoverBg="rgba(198,40,40,0.08)"
                onClick={handleClearFilters}
              />
              {viewMode === 'single' && (
                <RowBtn
                  icon={<Search sx={{ fontSize: 13 }} />}
                  label="Fetch Records"
                  color={T.accent}
                  hoverBg={T.accentFaint}
                  onClick={() => fetchRecords(true)}
                />
              )}
            </Box>
          </Box>
        </SectionCard>

        {/* ── Loading indicator ── */}
        {(loading || loadingAllUsers) && (
          <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CircularProgress size={16} sx={{ color: T.accent }} />
            <Typography sx={{ fontSize: '0.78rem', color: T.muted }}>
              {loadingAllUsers ? 'Fetching all users…' : 'Fetching attendance records…'}
            </Typography>
          </Box>
        )}

        {/* ── All Users Card ── */}
        {viewMode === 'multiple' && (
          <Fade in timeout={400}>
            <SectionCard sx={{ mb: 2 }}>
              <PanelHeader
                icon={People}
                title="All Users DTR List (Auto-Saved)"
                right={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <RowBtn
                      icon={loadingAllUsers ? <CircularProgress size={12} /> : <People sx={{ fontSize: 13 }} />}
                      label={loadingAllUsers ? 'Loading…' : 'Load All Users'}
                      color={T.accent}
                      hoverBg={T.accentFaint}
                      onClick={fetchAllUsersDTR}
                      disabled={loadingAllUsers || !startDate || !endDate}
                    />
                    {allUsersDTR.length > 0 && (
                      <RowBtn
                        icon={<Send sx={{ fontSize: 13 }} />}
                        label={`View DTR (${selectedCountInFiltered})`}
                        color="#2e7d32"
                        hoverBg="rgba(46,125,50,0.08)"
                        onClick={handleBulkSendToDTR}
                        disabled={selectedCountInFiltered === 0}
                      />
                    )}
                  </Box>
                }
              />

              <Box sx={{ px: 2.5, pt: 2, pb: 2.5 }}>
                {allUsersDTR.length > 0 ? (
                  <>
                    {/* Toolbar */}
                    <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Search */}
                      <Box sx={{ flex: 1, minWidth: 220 }}>
                        <NativeInput
                          value={searchQuery}
                          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                          placeholder="Search by name or employee number…"
                          icon={<SearchOutlined sx={{ fontSize: 16 }} />}
                        />
                      </Box>

                      {/* Record filter */}
                      <FormControl size="small" sx={{ minWidth: 140 }}>
                        <Select
                          value={recordFilter}
                          onChange={(e) => { setRecordFilter(e.target.value); setCurrentPage(1); }}
                          displayEmpty
                          sx={{ borderRadius: '8px', fontSize: '0.82rem', bgcolor: '#fff', '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder } }}
                        >
                          <MenuItem value="all"  sx={{ fontSize: '0.82rem' }}>All</MenuItem>
                          <MenuItem value="has"  sx={{ fontSize: '0.82rem' }}>Has Records</MenuItem>
                          <MenuItem value="no"   sx={{ fontSize: '0.82rem' }}>No Records</MenuItem>
                        </Select>
                      </FormControl>

                      <RowBtn
                        icon={null}
                        label={selectedCountInFiltered === filteredUsers.length ? 'Deselect All' : 'Select All'}
                        color={T.accent}
                        hoverBg={T.accentFaint}
                        onClick={() => handleSelectAll(selectedCountInFiltered !== filteredUsers.length)}
                      />
                    </Box>

                    {/* Table */}
                    <Box sx={{ borderRadius: '8px', overflow: 'hidden', border: `1px solid ${T.divider}` }}>
                      <Box sx={{ maxHeight: 480, overflowY: 'auto' }}>
                        <Table sx={{ minWidth: 700 }} stickyHeader>
                          <TableHead>
                            <TableRow>
                              <CompactTableCell isHeader sx={{ bgcolor: T.accent, width: 48 }}>
                                <Checkbox
                                  size="small"
                                  checked={selectedCountInFiltered === filteredUsers.length && filteredUsers.length > 0}
                                  indeterminate={selectedCountInFiltered > 0 && selectedCountInFiltered < filteredUsers.length}
                                  onChange={(e) => handleSelectAll(e.target.checked)}
                                  sx={{ color: 'rgba(255,255,255,0.6)', '&.Mui-checked': { color: '#fff' }, '&.MuiCheckbox-indeterminate': { color: '#fff' }, p: 0 }}
                                />
                              </CompactTableCell>
                              {['Employee #', 'Department', 'Full Name', 'Records', 'Status', 'Action'].map((h) => (
                                <CompactTableCell key={h} isHeader sx={{ bgcolor: T.accent }}>{h}</CompactTableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {paginatedUsers.map((user, idx) => (
                              <TableRow
                                key={user.employeeNumber}
                                sx={{ bgcolor: idx % 2 === 0 ? '#fff' : T.rowOdd, '&:hover': { bgcolor: T.rowHover }, transition: 'background 0.12s', '&:last-child td': { borderBottom: 'none' } }}
                              >
                                <CompactTableCell sx={{ width: 48 }}>
                                  <Checkbox
                                    size="small"
                                    checked={selectedUsers.has(user.employeeNumber)}
                                    onChange={() => handleUserSelect(user.employeeNumber)}
                                    sx={{ color: alpha(T.accent, 0.4), '&.Mui-checked': { color: T.accent }, p: 0 }}
                                  />
                                </CompactTableCell>
                                <CompactTableCell sx={{ color: T.text, fontSize: '0.8rem', fontWeight: 600 }}>
                                  {user.employeeNumber}
                                </CompactTableCell>
                                <CompactTableCell>
                                  {(() => {
                                    const d = departmentAssignmentsMap?.[user.employeeNumber] || '';
                                    return d
                                      ? <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.25, py: 0.3, borderRadius: '12px', bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}><Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent }}>{d}</Typography></Box>
                                      : <Typography sx={{ fontSize: '0.72rem', color: T.faint, fontStyle: 'italic' }}>Unassigned</Typography>;
                                  })()}
                                </CompactTableCell>
                                <CompactTableCell sx={{ color: T.text, fontSize: '0.8rem' }}>
                                  {trimmedSearch ? highlightMatch(formatFullName(user.fullName), trimmedSearch) : formatFullName(user.fullName)}
                                </CompactTableCell>
                                <CompactTableCell sx={{ color: T.muted, fontSize: '0.8rem', fontWeight: 600 }}>
                                  {user.recordsCount || 0}
                                </CompactTableCell>
                                <CompactTableCell>
                                  <Box sx={{
                                    display: 'inline-flex', alignItems: 'center', gap: 0.5,
                                    px: 1.25, py: 0.3, borderRadius: '12px',
                                    bgcolor: user.hasRecords ? 'rgba(76,175,80,0.1)' : T.accentFaint,
                                    border: `1px solid ${user.hasRecords ? 'rgba(76,175,80,0.25)' : T.accentBorder}`,
                                  }}>
                                    {user.hasRecords
                                      ? <CheckCircle sx={{ fontSize: 11, color: '#4caf50' }} />
                                      : <Cancel sx={{ fontSize: 11, color: T.faint }} />
                                    }
                                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: user.hasRecords ? '#2e7d32' : T.faint }}>
                                      {user.hasRecords ? 'Auto-Saved' : 'No Records'}
                                    </Typography>
                                  </Box>
                                </CompactTableCell>
                                <CompactTableCell>
                                  <RowBtn
                                    icon={<Send sx={{ fontSize: 11 }} />}
                                    label="View DTR"
                                    color="#2e7d32"
                                    hoverBg="rgba(46,125,50,0.08)"
                                    disabled={!user.hasRecords}
                                    onClick={() => navigate('/daily_time_record_faculty', { state: { employeeNumber: user.employeeNumber, fullName: user.fullName, startDate, endDate } })}
                                  />
                                </CompactTableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    </Box>

                    {/* Pagination */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, flexWrap: 'wrap', gap: 1.5 }}>
                      <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>
                        Showing {filteredUsers.length === 0 ? 0 : Math.min(filteredUsers.length,(currentPage-1)*rowsPerPage+1)}–{Math.min(filteredUsers.length,currentPage*rowsPerPage)} of {filteredUsers.length} users
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <FormControl size="small" sx={{ minWidth: 110 }}>
                          <Select
                            value={rowsPerPage}
                            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            displayEmpty
                            sx={{ borderRadius: '8px', fontSize: '0.82rem', bgcolor: '#fff', '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder } }}
                          >
                            {[10,20,50,100].map((n) => <MenuItem key={n} value={n} sx={{ fontSize: '0.82rem' }}>{n} rows</MenuItem>)}
                          </Select>
                        </FormControl>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <IconButton size="small" onClick={() => goToPage(currentPage-1)} disabled={currentPage === 1}
                            sx={{ border: `1px solid ${T.accentBorder}`, width: 30, height: 30, '&:hover': { bgcolor: T.accentFaint } }}>
                            <ArrowBack sx={{ fontSize: 14, color: T.accent }} />
                          </IconButton>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: T.accent, minWidth: 50, textAlign: 'center' }}>
                            {currentPage} / {totalPages}
                          </Typography>
                          <IconButton size="small" onClick={() => goToPage(currentPage+1)} disabled={currentPage === totalPages}
                            sx={{ border: `1px solid ${T.accentBorder}`, width: 30, height: 30, '&:hover': { bgcolor: T.accentFaint } }}>
                            <ArrowForward sx={{ fontSize: 14, color: T.accent }} />
                          </IconButton>
                        </Box>
                      </Box>
                    </Box>
                  </>
                ) : (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                      <People sx={{ fontSize: 24, color: alpha(T.accent, 0.3) }} />
                    </Box>
                    <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: T.muted, mb: 0.4 }}>No data loaded</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: T.faint }}>Click "Load All Users" to fetch and auto-save all users' DTR data.</Typography>
                  </Box>
                )}
              </Box>
            </SectionCard>
          </Fade>
        )}

        {/* ── Single User Results ── */}
        {viewMode === 'single' && personName && (
          <Fade in={!loading} timeout={400}>
            <SectionCard ref={resultsRef} sx={{ mb: 2 }}>
              <PanelHeader
                icon={Assignment}
                title={`Records for ${personName}`}
                right={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>
                      {startDate} → {endDate}
                    </Typography>
                    <Box sx={{ px: 1.5, py: 0.3, borderRadius: 5, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.18)}` }}>
                      <Typography sx={{ fontSize: '0.72rem', color: T.accent, fontWeight: 700 }}>
                        {records.length} {records.length === 1 ? 'record' : 'records'}
                      </Typography>
                    </Box>
                    <Box sx={{ px: 1.5, py: 0.3, borderRadius: 5, bgcolor: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.25)' }}>
                      <Typography sx={{ fontSize: '0.72rem', color: '#2e7d32', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.4 }}>
                        <CheckCircle sx={{ fontSize: 11 }} /> Auto-Saved
                      </Typography>
                    </Box>
                    <RowBtn
                      icon={<Send sx={{ fontSize: 11 }} />}
                      label="View DTR Module"
                      color="#2e7d32"
                      hoverBg="rgba(46,125,50,0.08)"
                      disabled={records.length === 0}
                      onClick={handleSendToDTR}
                    />
                  </Box>
                }
              />

              {/* Sticky column headers */}
              <Box sx={{ overflowX: 'auto' }}>
                <Box sx={{ minWidth: 900 }}>
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr',
                    px: 2.5, py: 1.25,
                    bgcolor: T.accent,
                    gap: 1.5,
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                  }}>
                    {['EMP ID','DATE','DAY','TIME IN','BREAK IN','BREAK OUT','TIME OUT','SPECIAL TYPE','SP. TIME IN','SP. TIME OUT'].map((h) => (
                      <Typography key={h} sx={{ color: '#fff', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.07em' }}>
                        {h}
                      </Typography>
                    ))}
                  </Box>

                  <Box sx={{ maxHeight: 440, overflowY: 'auto' }}>
                    {records.length === 0 ? (
                      <Box sx={{ py: 8, textAlign: 'center' }}>
                        <Box sx={{ width: 60, height: 60, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                          <Info sx={{ fontSize: 28, color: alpha(T.accent, 0.3) }} />
                        </Box>
                        <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: T.muted, mb: 0.4 }}>No records found</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: T.faint }}>Try adjusting your date range or employee number.</Typography>
                      </Box>
                    ) : records.map((record, index) => {
                      let specialTypeBadge = null;
                      if (record.Time5 || record.Time6) {
                        const type       = record.specialType || 'UNCATEGORIZED';
                        const typeLabels = { HONORARIUM: 'Honorarium', SERVICE: 'Service Credit', OVERTIME: 'Overtime', UNCATEGORIZED: 'Uncategorized' };
                        const colors     = { HONORARIUM: '#4CAF50', SERVICE: '#2196F3', OVERTIME: '#FF9800', UNCATEGORIZED: '#9E9E9E' };
                        const bc         = colors[type] || colors.UNCATEGORIZED;
                        specialTypeBadge = (
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1, py: 0.3, borderRadius: '10px', bgcolor: alpha(bc, 0.12), border: `1px solid ${alpha(bc, 0.3)}` }}>
                            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: bc }}>{typeLabels[type] || 'Uncategorized'}</Typography>
                          </Box>
                        );
                      }
                      return (
                        <Box
                          key={index}
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr',
                            px: 2.5, py: 1.5, gap: 1.5,
                            alignItems: 'center',
                            bgcolor: index % 2 === 0 ? '#fff' : T.rowOdd,
                            borderBottom: `1px solid ${T.divider}`,
                            transition: 'background 0.12s',
                            '&:hover': { bgcolor: T.rowHover },
                            '&:last-child': { borderBottom: 'none' },
                          }}
                        >
                          <Typography sx={{ fontSize: '0.78rem', color: T.muted, fontWeight: 500 }}>{record.PersonID}</Typography>
                          <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: T.text }}>{record.Date}</Typography>
                          <Typography sx={{ fontSize: '0.78rem', color: T.muted }}>{getDayOfWeek(record.Date)}</Typography>
                          <Typography sx={{ fontSize: '0.78rem', color: T.text }}>{formatTime(record.Time1)}</Typography>
                          <Typography sx={{ fontSize: '0.78rem', color: T.text }}>{formatTime(record.Time3)}</Typography>
                          <Typography sx={{ fontSize: '0.78rem', color: T.text }}>{formatTime(record.Time2)}</Typography>
                          <Typography sx={{ fontSize: '0.78rem', color: T.text }}>{formatTime(record.Time4)}</Typography>
                          <Box>{specialTypeBadge || <Typography sx={{ fontSize: '0.75rem', color: T.faint }}>—</Typography>}</Box>
                          <Typography sx={{ fontSize: '0.78rem', color: T.text }}>{record.Time5 ? formatTime(record.Time5) : '—'}</Typography>
                          <Typography sx={{ fontSize: '0.78rem', color: T.text }}>{record.Time6 ? formatTime(record.Time6) : '—'}</Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Box>

              {/* Footer legend */}
              {records.length > 0 && (
                <Box sx={{ px: 2.5, py: 1.75, borderTop: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', gap: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
                  {[
                    { icon: <CheckCircle sx={{ fontSize: 13, color: '#4caf50' }} />, label: 'Auto-saved records from biometric device' },
                    { icon: <Info sx={{ fontSize: 13, color: T.accent }} />, label: 'Times displayed in 12-hour format' },
                  ].map((item, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                      {item.icon}
                      <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>{item.label}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </SectionCard>
          </Fade>
        )}

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

export default ViewAttendanceRecord;