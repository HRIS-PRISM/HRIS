import API_BASE_URL from '../../apiConfig';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useSocket } from '../../contexts/SocketContext';
import {
  AccessTime, CalendarToday, SearchOutlined,
  ArrowBack, ArrowForward, Close, Refresh,
} from '@mui/icons-material';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { Stack, Divider, Grid } from '@mui/material';
import {
  Alert, Box, Button, Card, Checkbox, Chip,
  Dialog, DialogContent, Fade, FormControl,
  IconButton, InputAdornment, MenuItem, Paper, Select, Snackbar, styled,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, List, ListItemButton,
  Typography, CircularProgress as MCircularProgress, LinearProgress,
} from '@mui/material';
import earistLogo from '../../assets/earistLogo.png';
import hrisLogo from '../../assets/hrisLogo.png';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { alpha } from '@mui/material/styles';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import LoadingOverlay from '../LoadingOverlay';

// ─── Theme tokens ──────────────────────────────────────────────────────────
const T = {
  accent:       '#6d2323',
  accentDark:   '#5a1d1d',
  accentMid:    '#8B4545',
  accentFaint:  'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover:  'rgba(109,35,35,0.10)',
  headerGrad:   'linear-gradient(180deg,#6d2323 0%,#7e2c2c 100%)',
  rowEven:      '#ffffff',
  rowOdd:       'rgba(109,35,35,0.025)',
  rowHover:     'rgba(109,35,35,0.055)',
  text:         '#1a1a1a',
  muted:        '#6b6b6b',
  faint:        '#a0a0a0',
  surface:      '#ffffff',
  divider:      'rgba(0,0,0,0.08)',
};

const EMPLOYMENT_CATEGORY_OPTIONS = [
  { value: 0, label: 'JO Graduate', color: '#F57C00' },
  { value: 1, label: 'JO UnderGrad', color: '#E64A19' },
  { value: 2, label: 'Regular Non-Teaching', color: '#2E7D32' },
  { value: 3, label: 'Regular Teaching (30Hrs)', color: '#1565C0' },
  { value: 4, label: 'Regular Designated (40Hrs)', color: '#7B1FA2' },
  { value: 5, label: 'Other', color: '#00796B' },
];

// ─── Styled components ────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: T.surface,
});

const AccentButton = styled(Button)({
  borderRadius: 8, textTransform: 'none', fontWeight: 600, fontSize: '0.875rem',
  letterSpacing: '0.01em', transition: 'all 0.18s ease',
  '&:hover': { transform: 'translateY(-1px)' },
  '&:active': { transform: 'translateY(0)' },
});

const FieldInput = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8, fontSize: '0.875rem', backgroundColor: '#fff',
    '& fieldset': { borderColor: T.accentBorder },
    '&:hover fieldset': { borderColor: T.accent },
    '&.Mui-focused fieldset': { borderColor: T.accent, borderWidth: 1.5 },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: T.accent },
});

const FormSectionLabel = ({ icon: Icon, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
    <Icon sx={{ fontSize: 12, color: alpha(T.accent, 0.45) }} />
    <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: alpha(T.accent, 0.45) }}>
      {children}
    </Typography>
  </Box>
);

const scrollbarSx = {
  '&::-webkit-scrollbar': { width: 4 },
  '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
  '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
};

const selectSx = {
  borderRadius: '8px', fontSize: '0.82rem', bgcolor: '#fff',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accent },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.accent, borderWidth: '1.5px' },
};

// ─── FIX: Normalize a record's date to strip UTC offset so getDateDay is always accurate
// When dates like "2025-04-01T00:00:00.000Z" are accessed from UTC+8 (PH),
// new Date() would shift them to March 31. We neutralize this by replacing
// the time portion with T00:00:00 (no Z), anchoring to local midnight.
const normalizeDateField = (dateStr) => {
  if (!dateStr) return dateStr;
  const s = String(dateStr);
  if (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s)) {
    const d = new Date(s);
    const ph = new Date(d.getTime() + 8 * 60 * 60 * 1000);
    const yy = ph.getUTCFullYear();
    const mm = String(ph.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(ph.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}T00:00:00`;
  }
  const datePart = s.split('T')[0];
  return `${datePart}T00:00:00`;
};

const normalizeRecord = (record) => ({
  ...record,
  date: normalizeDateField(record.date),
});

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

    axios.get(`${API_BASE_URL}/users/search`, {
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

  const getDisplayName = (emp) => {
    if (!emp) return '';
    const full = (emp.fullName || '').trim();
    if (full) return full;
    const composed = `${emp.firstName || ''} ${emp.middleName || ''} ${emp.lastName || ''}`.replace(/\s+/g, ' ').trim();
    return composed || String(emp.employeeNumber || '');
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
      <FieldInput
        fullWidth
        size="small"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        placeholder="Type name or employee number..."
        disabled={disabled}
        autoComplete="off"
        inputProps={{ autoComplete: 'new-password' }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchOutlined sx={{ color: T.muted, fontSize: 16 }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {loading ? (
                <MCircularProgress size={14} sx={{ color: T.accent }} />
              ) : query ? (
                <IconButton size="small" onClick={handleClear} sx={{ p: 0.25 }}>
                  <Close sx={{ fontSize: 14, color: T.faint }} />
                </IconButton>
              ) : null}
            </InputAdornment>
          ),
        }}
      />

      {open && (
        <Paper elevation={6} sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1300, mt: 0.5, maxHeight: 280, overflow: 'auto', borderRadius: '10px', border: `1px solid ${T.accentBorder}` }}>
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 2.5 }}>
              <MCircularProgress size={16} sx={{ color: T.accent }} />
              <Typography sx={{ fontSize: '0.8rem', color: T.muted }}>Searching...</Typography>
            </Box>
          ) : results.length > 0 ? (
            <List dense disablePadding>
              {results.map((emp) => (
                <ListItemButton
                  key={emp.employeeNumber}
                  onClick={() => handleSelect(emp)}
                  sx={{ py: 1, px: 1.5, borderBottom: `1px solid ${T.divider}`, '&:hover': { bgcolor: T.accentFaint }, '&:last-child': { borderBottom: 'none' } }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                    <Typography sx={{ fontSize: '0.83rem', fontWeight: 700, color: T.text, lineHeight: 1.2 }}>
                      {getDisplayName(emp)}
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

const SHIMMER_CSS = `
@keyframes dtrShimmer {
  0%   { background-position: -900px 0; }
  100% { background-position:  900px 0; }
}
@keyframes dtrPulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.55; }
}
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.55; }
}`;

const Bone = ({ w = '100%', h = 14, r = 6, sx = {} }) => (
  <Box sx={{
    width: w,
    height: h,
    borderRadius: r,
    background: 'linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)',
    backgroundSize: '800px 100%',
    animation: 'shimmer 1.6s infinite linear',
    flexShrink: 0,
    ...sx,
  }} />
);

const DTROverallWireframe = () => (
  <>
    <style>{SHIMMER_CSS}</style>
    <Box sx={{ py: { xs: 2, md: 4 }, mt: { xs: 0, md: -5 }, width: '100vw', maxWidth: '100%', position: 'relative', left: '63%', transform: 'translateX(-61%)', px: { xs: 2, sm: 3, md: 6 } }}>
      <Box sx={{ mb: 2, borderRadius: 3, overflow: 'hidden', border: `1px solid ${T.accentBorder}`, animation: 'blink 2s ease-in-out infinite' }}>
        <Box sx={{ p: 3.5, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2.5, position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.06)' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)', flexShrink: 0 }} />
            <Box>
              <Bone w={220} h={18} sx={{ mb: 1 }} />
              <Bone w={360} h={11} />
            </Box>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {[3, 9].map((lg, idx) => (
          <Grid item xs={12} lg={lg} key={idx}>
            <Box sx={{ borderRadius: 3, border: `1px solid ${T.accentBorder}`, bgcolor: '#fff', overflow: 'hidden', animation: `blink 2s ease-in-out ${idx * 0.1}s infinite`, height: 'calc(100vh - 280px)' }}>
              <Box sx={{ px: 3.5, py: 2.5, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)' }} />
                <Bone w={lg === 3 ? 160 : 240} h={13} />
              </Box>

              {lg === 3 ? (
                <Box sx={{ p: 3.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {[100, 160, 120, 140, 110, 130].map((w, i) => (
                    <Box key={i}>
                      <Bone w={w} h={10} sx={{ mb: 1 }} />
                      <Box sx={{ height: 40, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: '#fafafa' }} />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ p: 3.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  <Box sx={{ display: 'flex', gap: 1.25, mb: 1 }}>
                    <Box sx={{ flex: 2, height: 38, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: '#fafafa' }} />
                    <Box sx={{ width: 130, height: 38, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: '#fafafa' }} />
                    <Box sx={{ width: 160, height: 38, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: '#fafafa' }} />
                  </Box>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '50px 110px 1fr 130px 130px 120px 80px', gap: 1, alignItems: 'center', py: 0.45 }}>
                      <Bone w={18} h={18} r={4} />
                      <Bone w={90} h={11} />
                      <Bone w="75%" h={11} />
                      <Bone w={95} h={20} r={12} />
                      <Bone w={95} h={20} r={12} />
                      <Bone w={85} h={20} r={12} />
                      <Bone w={28} h={28} r={6} />
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  </>
);

// ─── Skeleton shimmer ─────────────────────────────────────────────────────
const SkeletonChip = () => (
  <Box sx={{
    display: 'inline-block', width: 64, height: 20, borderRadius: '10px',
    bgcolor: 'rgba(0,0,0,0.08)',
    animation: 'dtr-pulse 1.4s ease-in-out infinite',
    '@keyframes dtr-pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
  }} />
);

const SkeletonText = ({ width = 80 }) => (
  <Box sx={{
    display: 'inline-block', width, height: 14, borderRadius: 1,
    bgcolor: 'rgba(0,0,0,0.07)',
    animation: 'dtr-pulse 1.4s ease-in-out infinite',
    '@keyframes dtr-pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
  }} />
);

const generateHash = (data) => {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).toUpperCase();
};

const DTRColGroup = () => (
  <colgroup>
    <col style={{ width: '8%' }} />
    <col style={{ width: '16%' }} />
    <col style={{ width: '16%' }} />
    <col style={{ width: '16%' }} />
    <col style={{ width: '16%' }} />
    <col style={{ width: '14%' }} />
    <col style={{ width: '14%' }} />
  </colgroup>
);

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
};

const DTR_WIDTH_IN = '8.7in';
const PAGE_SIZE = 30;

// ─── Date helper — timezone-safe day extraction ────────────────────────────
// Splits the ISO string directly instead of using new Date() to avoid
// UTC-to-local timezone shifts when the app is accessed via a local IP.
// AFTER — always strips timezone before extracting day
// AFTER — always strips timezone before extracting day
// Replace getDateDay entirely with this UTC+8 aware version
const getDateDay = (dateStr) => {
  if (!dateStr) return '';
  const s = String(dateStr);
  // If it has a Z or offset, it's a true UTC timestamp — shift to UTC+8
  if (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s)) {
    const d = new Date(s);
    // Add 8 hours to get Philippine local time
    const ph = new Date(d.getTime() + 8 * 60 * 60 * 1000);
    return String(ph.getUTCDate()).padStart(2, '0');
  }
  // Already local (no Z) — safe to split directly
  return (s.split('T')[0].split('-')[2] ?? '').padStart(2, '0');
};
// ─── Main Component ────────────────────────────────────────────────────────
const DailyTimeRecordFaculty = () => {
  const { socket, connected } = useSocket();
  const { settings }          = useSystemSettings();

  const [personID, setPersonID]           = useState('');
  const [startDate, setStartDate]         = useState('');
  const [endDate, setEndDate]             = useState('');
  const [records, setRecords]             = useState([]);
  const [employeeName, setEmployeeName]   = useState('');
  const [officialTimes, setOfficialTimes] = useState({});
  const dtrRef = useRef(null);

  const fetchRecordsRef     = useRef(null);
  const fetchAllUsersDTRRef = useRef(null);

  const [allUsersDTR, setAllUsersDTR]       = useState([]);
  const [selectedUsers, setSelectedUsers]   = useState(new Set());
  const [searchQuery, setSearchQuery]       = useState('');
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);
  const bulkDTRRefs = useRef({});
  const [loadPhase, setLoadPhase] = useState('');

  const [originalRecords, setOriginalRecords] = useState([]);
  const [recordsHash, setRecordsHash]         = useState('');
  const [fetchedAt, setFetchedAt]             = useState(null);
  const [integrityStatus, setIntegrityStatus] = useState('none');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const observerRef          = useRef(null);
  const restoreTimerRef      = useRef(null);
  const originalRecordsRef   = useRef([]);
  const isRestoringRef       = useRef(false);
  const formatTimeRef        = useRef(null);
  const abortControllerRef   = useRef(null);

  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const currentYear  = new Date().getFullYear();
  const yearOptions  = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const [holidays, setHolidays]       = useState([]);
  const [suspensions, setSuspensions] = useState([]);

  const [previewModalOpen, setPreviewModalOpen]       = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [previewUsers, setPreviewUsers]               = useState([]);
  const [printingAll, setPrintingAll]                 = useState(false);
  const [printingStatus, setPrintingStatus]           = useState('');

  // viewMode: 'single' | 'multiple'
  const [viewMode, setViewMode]         = useState('single');
  const [recordFilter, setRecordFilter] = useState('all');
  const [dtrType, setDtrType]           = useState('regular');
  // monthLoading mirrors DailyTimeRecord's monthLoading
  const [monthLoading, setMonthLoading] = useState(false);

  const [printStatusFilter, setPrintStatusFilter] = useState('all');
  const [printStatusMap, setPrintStatusMap]       = useState(new Map());

  const [alertModal, setAlertModal]     = useState({ open: false, title: '', message: '' });
  const [confirmModal, setConfirmModal] = useState({ open: false, user: null });
  const showAlert          = (title, message) => setAlertModal({ open: true, title, message });
  const closeAlert         = () => setAlertModal({ open: false, title: '', message: '' });
  const showReprintConfirm = (user) => setConfirmModal({ open: true, user });
  const closeConfirm       = () => setConfirmModal({ open: false, user: null });

  const [departmentFilter, setDepartmentFilter]                 = useState('');
  const [employmentCategoryFilter, setEmploymentCategoryFilter] = useState('');
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState('');
  const [departments, setDepartments]                           = useState([]);
  const [approvedLeaves, setApprovedLeaves]                     = useState([]);

  const [singlePrintLoading, setSinglePrintLoading] = useState(false);
  const [singlePrintStatus, setSinglePrintStatus]   = useState('');

  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasSearchedSingle, setHasSearchedSingle] = useState(false);

  const { hasAccess, loading: accessLoading } = usePageAccess('daily-time-record-faculty');

  const monthsShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const months      = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

  useEffect(() => {
    setPersonID('');
    setStartDate('');
    setEndDate('');
    setSelectedMonth(null);
    setHasSearchedSingle(false);
    setRecords([]);
    setOriginalRecords([]);
    originalRecordsRef.current = [];
    setRecordsHash('');
    setFetchedAt(null);
    setIntegrityStatus('none');
    setEmployeeName('');
    setOfficialTimes({});
    setApprovedLeaves([]);
    setMonthLoading(false);
    setAllUsersDTR([]);
    setSelectedUsers(new Set());
    setSearchQuery('');
    setRecordFilter('all');
    setPrintStatusFilter('all');
    setDepartmentFilter('');
    setEmploymentCategoryFilter('');
    setRegistrationStatusFilter('');
    setCurrentPage(1);
  }, []);

  // ─── Format helpers ────────────────────────────────────────────────────
  const formatFullName = (user = {}) => {
    const last      = (user.lastName || user.surname || user.familyName || '').trim();
    const first     = (user.firstName || user.givenName || '').trim();
    const middleRaw = (user.middleName || user.middleInitial || '').trim();
    const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
    const middle    = middleRaw ? `${middleRaw.charAt(0).toUpperCase()}.` : '';
    const lastPart  = last ? last.toUpperCase() : '';
    const firstPart = first ? capitalize(first) : '';
    return `${lastPart}${lastPart && firstPart ? ', ' : ''}${firstPart}${middle ? ' ' + middle : ''}`.trim()
      || user.fullName || user.displayName || 'Unknown';
  };

  const formatTime  = (timeString) => {
    if (!timeString) return '';
    const normalized = String(timeString).replace(/\s+/g, ' ').trim();
    return normalized.replace(/^(\d{1,2}:\d{2}):\d{2}(\s?[AP]M)?$/i, '$1$2');
  };
const formatMonth = (dateString) => {
  if (!dateString) return '';
  const [, month] = dateString.split('T')[0].split('-');
  return new Date(2000, parseInt(month) - 1, 1).toLocaleDateString(undefined, { month: 'long' }).toUpperCase();
};  
const formatStartDate = (dateString) => {
  if (!dateString) return '';
  const [, month, day] = dateString.split('T')[0].split('-');
  return new Date(2000, parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
};  
const formatEndDate = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('T')[0].split('-');
  return `${parseInt(day)}, ${year}`;
};

  const formattedStartDate = formatStartDate(startDate);
  const formattedEndDate   = formatEndDate(endDate);

  useEffect(() => { formatTimeRef.current = formatTime; }, []);

  // ─── Anti-tamper DOM restore ───────────────────────────────────────────
  const restoreDOMFromOriginal = useCallback(() => {
    if (!dtrRef.current) return;
    const original = originalRecordsRef.current;
    if (!original || original.length === 0) return;
    isRestoringRef.current = true;
    const fmt = formatTimeRef.current || ((s) => s || '');
    const tbodies = dtrRef.current.querySelectorAll('tbody');
    tbodies.forEach((tbody) => {
      tbody.querySelectorAll('tr').forEach((row) => {
        const dayCell = row.querySelector('td:first-child');
        if (!dayCell) return;
        const dayText = dayCell.textContent.trim();
        if (!/^\d{2}$/.test(dayText)) return;
        const record = original.find((r) => getDateDay(r.date) === dayText);
        const cells  = row.querySelectorAll('td');
        if (cells.length < 5) return;
        [fmt(record?.timeIN || ''), fmt(record?.breaktimeIN || ''), fmt(record?.breaktimeOUT || ''), fmt(record?.timeOUT || '')].forEach((val, idx) => {
          const span = cells[idx + 1]?.querySelector('span');
          if (span && span.textContent.trim() !== val) span.textContent = val;
        });
      });
    });
    setTimeout(() => { isRestoringRef.current = false; }, 50);
  }, []);

  const startObserver = useCallback(() => {
    if (!dtrRef.current) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new MutationObserver((mutations) => {
      if (isRestoringRef.current) return;
      const isTimeTamper = mutations.some((m) => {
        if (m.type === 'characterData') { const s = m.target.parentElement; return s && s.tagName === 'SPAN'; }
        if (m.type === 'childList') return m.target.tagName === 'TD' || m.target.tagName === 'SPAN';
        return false;
      });
      if (!isTimeTamper) return;
      if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);
      restoreTimerRef.current = setTimeout(() => restoreDOMFromOriginal(), 300);
    });
    observerRef.current.observe(dtrRef.current, { subtree: true, childList: true, characterData: true });
  }, [restoreDOMFromOriginal]);

  const stopObserver = useCallback(() => {
    if (observerRef.current) { observerRef.current.disconnect(); observerRef.current = null; }
    if (restoreTimerRef.current) { clearTimeout(restoreTimerRef.current); restoreTimerRef.current = null; }
  }, []);

  useEffect(() => {
    if (originalRecords.length > 0 && dtrRef.current) {
      const t = setTimeout(() => startObserver(), 100);
      return () => { clearTimeout(t); stopObserver(); };
    } else stopObserver();
  }, [originalRecords, startObserver, stopObserver]);

  useEffect(() => () => stopObserver(), [stopObserver]);

  // ─── Integrity verification ────────────────────────────────────────────
  const verifyIntegrity = () => {
    if (!fetchedAt || originalRecords.length === 0) { setSnackbar({ open: true, message: 'No DTR data loaded. Please search first.', severity: 'warning' }); return false; }
    if (Date.now() - new Date(fetchedAt).getTime() > 30 * 60 * 1000) { setIntegrityStatus('warn'); setSnackbar({ open: true, message: 'DTR data is older than 30 minutes. Please search again.', severity: 'warning' }); return false; }
    if (generateHash(records) !== recordsHash) { setIntegrityStatus('warn'); setSnackbar({ open: true, message: 'Data integrity check failed. Records may have been modified.', severity: 'error' }); return false; }
    setIntegrityStatus('ok'); return true;
  };

  // ─── Secondary data helpers ────────────────────────────────────────────
  const fetchOfficialTimes = useCallback(async (employeeID) => {
    try {
      const r = await axios.get(`${API_BASE_URL}/officialtimetable/${employeeID}`, getAuthHeaders());
      setOfficialTimes(r.data.reduce((acc, rec) => {
        acc[rec.day] = { officialTimeIN: rec.officialTimeIN, officialTimeOUT: rec.officialTimeOUT, officialBreaktimeIN: rec.officialBreaktimeIN, officialBreaktimeOUT: rec.officialBreaktimeOUT };
        return acc;
      }, {}));
    } catch { setOfficialTimes({}); }
  }, []);

  const fetchApprovedLeaves = useCallback(async (empID) => {
    try {
      const r = await axios.get(`${API_BASE_URL}/leaveRoute/leave_request`, getAuthHeaders());
      setApprovedLeaves(r.data.filter((req) => String(req.status) === '2' && String(req.employeeNumber) === String(empID)));
    } catch { setApprovedLeaves([]); }
  }, []);

  useEffect(() => {
    if (personID) {
      Promise.all([fetchOfficialTimes(personID), fetchApprovedLeaves(personID)]).catch(() => {});
    }
  }, [personID, fetchOfficialTimes, fetchApprovedLeaves]);

  // ─── Static data on mount ──────────────────────────────────────────────
  useEffect(() => {
    const fetchAllStaticData = async () => {
      try {
        const [deptRes, hRes, sRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/department-table`, getAuthHeaders()),
          axios.get(`${API_BASE_URL}/holiday`, getAuthHeaders()),
          axios.get(`${API_BASE_URL}/api/suspensions`, getAuthHeaders()),
        ]);
        setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
        setHolidays(Array.isArray(hRes.data) ? hRes.data : []);
        setSuspensions(Array.isArray(sRes.data) ? sRes.data : []);
      } catch (e) { console.error('Error fetching static data:', e); }
    };
    fetchAllStaticData();
  }, []);

  const filterByDtrType = (data, type) => {
    if (type === 'regular')        return data.filter((r) => r.timeIN || r.timeOUT);
    if (type === 'service-credit') return data.filter((r) => r.specialType === 'SERVICE'    && (r.specialTimeIN || r.specialTimeOUT));
    if (type === 'honorarium')     return data.filter((r) => r.specialType === 'HONORARIUM' && (r.specialTimeIN || r.specialTimeOUT));
    if (type === 'overtime')       return data.filter((r) => r.specialType === 'OVERTIME'   && (r.specialTimeIN || r.specialTimeOUT));
    return data;
  };

  // ─── Single user fetch ─────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setMonthLoading(true);
    try {
      const r    = await axios.post(`${API_BASE_URL}/attendance/api/view-attendance`, { personID, startDate, endDate }, getAuthHeaders());

      // ── FIX: Normalize all date fields to strip UTC offset before processing ──
      const data = r.data.map(normalizeRecord);

      const filtered = filterByDtrType(data, dtrType);
      setRecords(filtered);
      if (filtered.length > 0) {
        stopObserver();
        const immutable = Object.freeze(JSON.parse(JSON.stringify(filtered)));
        setOriginalRecords(immutable);
        originalRecordsRef.current = immutable;
        setRecordsHash(generateHash(filtered));
        setFetchedAt(new Date().toISOString());
        setIntegrityStatus('ok');
      } else {
        stopObserver();
        setOriginalRecords([]); originalRecordsRef.current = [];
        setRecordsHash(''); setFetchedAt(null); setIntegrityStatus('none');
      }
      if (data.length > 0) {
        const { firstName, lastName, middleName } = data[0];
        setEmployeeName(formatFullName({ firstName, lastName, middleName }));
        fetchOfficialTimes(personID);
      } else {
        setEmployeeName('No records found'); setOfficialTimes({});
      }
    } catch (err) { console.error('Error fetching records:', err); }
    finally { setMonthLoading(false); }
  }, [personID, startDate, endDate, dtrType, stopObserver, fetchOfficialTimes]);

  useEffect(() => {
    if (viewMode === 'single' && hasSearchedSingle && personID && startDate && endDate) fetchRecords();
  }, [dtrType, viewMode, hasSearchedSingle, personID, startDate, endDate, fetchRecords]);

  useEffect(() => {
    if (viewMode === 'multiple' && allUsersDTR.length > 0) fetchAllUsersDTR();
  }, [dtrType]);

  useEffect(() => { fetchRecordsRef.current = fetchRecords; fetchAllUsersDTRRef.current = fetchAllUsersDTR; });

  // ─── Socket realtime ───────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !connected) return;
    let debounceTimer = null;
    const handleAttendanceChanged = (payload) => {
      const action = payload?.action;
      if (action === 'dtr-printed') {
        const printed = Array.isArray(payload?.employeeNumbers) ? payload.employeeNumbers : [];
        if (printed.length > 0) {
          setPrintStatusMap((prev) => {
            const next = new Map(prev);
            const at   = typeof payload?.printed_at === 'string' ? payload.printed_at : new Date().toISOString();
            const by   = payload?.printedBy || payload?.printed_by || 'system';
            printed.forEach((emp) => next.set(emp, { printed_at: at, printed_by: by }));
            return next;
          });
        }
        return;
      }
      const changedIDs = Array.isArray(payload?.personIDs) ? payload.personIDs : payload?.personID ? [payload.personID] : [];
      const isBulk    = action === 'bulk-auto-sync';
      if (viewMode === 'single') {
        if (changedIDs.length === 0 && !isBulk) return;
        if (personID && changedIDs.length > 0 && !changedIDs.includes(personID)) return;
        if (hasSearchedSingle && personID && startDate && endDate) fetchRecordsRef.current?.();
        return;
      }
      if (!startDate || !endDate || allUsersDTR.length === 0) return;
      if (changedIDs.length === 0 && !isBulk) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchAllUsersDTRRef.current?.(), 150);
    };
    socket.on('attendanceChanged', handleAttendanceChanged);
    return () => { if (debounceTimer) clearTimeout(debounceTimer); socket.off('attendanceChanged', handleAttendanceChanged); };
  }, [socket, connected, viewMode, personID, startDate, endDate, allUsersDTR.length, hasSearchedSingle]);

  // ─── Batch fetch ───────────────────────────────────────────────────────
  const fetchAllUsersDTR = useCallback(async () => {
    if (!startDate || !endDate) { showAlert('Date Required', 'Please select start date and end date first'); return; }
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;
    setLoadingAllUsers(true);
    setLoadPhase('Loading employee list…');
    setAllUsersDTR([]);
    setSelectedUsers(new Set());
    setCurrentPage(1);
    const cfg = () => ({ ...getAuthHeaders(), signal });
    try {
      const [empRes, deptRes, catRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/attendance/api/dtr-employee-list`, { params: { startDate, endDate }, ...cfg() }).catch((e) => { if (!signal.aborted) console.warn('emp list:', e.message); return { data: [] }; }),
        axios.get(`${API_BASE_URL}/api/department-assignment`, cfg()).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`, cfg()).catch(() => ({ data: [] })),
      ]);
      if (signal.aborted) return;
      const empList = empRes.data || [];
      if (empList.length === 0) {
        setAllUsersDTR([]); setLoadingAllUsers(false); setLoadPhase('');
        showAlert('No Records Found', 'No attendance records found for the selected date range.');
        return;
      }
      const deptMap = new Map();
      (deptRes.data || []).forEach((d) => { if (d.employeeNumber && d.code) deptMap.set(String(d.employeeNumber), d.code); });
      const catMap = new Map();
      (catRes.data || []).forEach((c) => { catMap.set(String(c.employeeNumber), c.employmentCategory); });
      const skeletonUsers = empList.map((emp) => {
        const empNum    = emp.personID;
        const deptCode  = deptMap.get(String(empNum)) || '';
        const empCat    = catMap.get(String(empNum));
        const displayName = emp.firstName && emp.lastName
          ? formatFullName({ firstName: emp.firstName, lastName: emp.lastName, middleName: emp.middleName })
          : emp.devicePersonName || String(empNum);
        return {
          employeeNumber: empNum, firstName: emp.firstName || '', lastName: emp.lastName || '',
          middleName: emp.middleName || '', fullName: displayName,
          devicePersonName: emp.devicePersonName || '',
          registrationStatus: emp.registrationStatus || 'Not Registered',
          departmentCode: deptCode, employmentCategory: empCat,
          records: [], hasRecords: false, _loading: true,
          rawUser: { employeeNumber: empNum, firstName: emp.firstName, lastName: emp.lastName, middleName: emp.middleName, departmentCode: deptCode, employmentCategory: empCat, registrationStatus: emp.registrationStatus || 'Not Registered' },
        };
      });
      setAllUsersDTR(skeletonUsers);
      setLoadPhase(`Loading attendance (0 / ${empList.length})…`);
      const empNums = empList.map((e) => e.personID);
      axios.post(`${API_BASE_URL}/attendance/api/dtr-print-status`, { employeeNumbers: empNums, year: new Date(startDate).getFullYear(), month: new Date(startDate).getMonth() + 1 }, cfg())
        .then((psRes) => {
          if (signal.aborted) return;
          const newMap = new Map();
          (psRes.data || []).forEach((s) => newMap.set(s.employee_number, { printed_at: s.printed_at, printed_by: s.printed_by }));
          setPrintStatusMap(newMap);
        }).catch((e) => { if (!signal.aborted) console.error('print status:', e); });
      const totalPages = Math.ceil(empList.length / PAGE_SIZE);
      const pageResults = await Promise.all(
        Array.from({ length: totalPages }, (_, index) => index + 1).map(async (page) => {
          if (signal.aborted) return { page, data: [] };
          setLoadPhase(`Loading attendance page ${page} of ${totalPages}…`);
          try {
            const pageRes = await axios.post(
              `${API_BASE_URL}/attendance/api/view-attendance-all-users-paged`,
              { startDate, endDate, page, pageSize: PAGE_SIZE },
              cfg(),
            );
            return { page, data: pageRes.data?.data || [] };
          } catch (e) {
            if (!signal.aborted) console.error(`Page ${page} fetch failed:`, e.message);
            return { page, data: [] };
          }
        }),
      );
      if (signal.aborted) return;
      let mergedUsers = skeletonUsers.slice();
      pageResults
        .sort((a, b) => a.page - b.page)
        .forEach(({ data: pageData }) => {
          const pageMap = new Map();

          // ── FIX: Normalize each record's date field when building the page map ──
          pageData.forEach((record) => {
            const normalized = normalizeRecord(record);
            const id = normalized.personID || normalized.agencyEmployeeNum;
            if (!pageMap.has(id)) pageMap.set(id, []);
            pageMap.get(id).push(normalized);
          });

          mergedUsers = mergedUsers.map((user) => {
            if (!pageMap.has(user.employeeNumber)) return user;
            const rows     = pageMap.get(user.employeeNumber);
            const filtered = filterByDtrType(rows, dtrType);
            return { ...user, records: filtered, hasRecords: filtered.length > 0, _loading: false };
          });
        });
      setAllUsersDTR(mergedUsers.slice());
      setAllUsersDTR((prev) => prev.map((u) => (u._loading ? { ...u, _loading: false } : u)));
    } catch (error) {
      if (error?.code === 'ERR_CANCELED' || signal?.aborted) return;
      console.error('fetchAllUsersDTR error:', error);
      showAlert('Fetch Error', error.response?.data?.error || 'Error fetching attendance records.');
      setAllUsersDTR([]);
    } finally {
      if (!signal?.aborted) { setLoadingAllUsers(false); setLoadPhase(''); }
    }
  }, [startDate, endDate, dtrType]);

  useEffect(() => {
    if (viewMode === 'multiple' && startDate && endDate) fetchAllUsersDTR();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, viewMode]);

  // ─── Month click (shared for both modes) ──────────────────────────────
  const handleMonthClick = (idx) => {
    const start = new Date(Date.UTC(selectedYear, idx, 1));
    const end   = new Date(Date.UTC(selectedYear, idx + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(idx);
    if (viewMode === 'single') {
      setHasSearchedSingle(false);
      setRecords([]);
      setEmployeeName('');
      setMonthLoading(false);
    }
  };

  const handleSingleSearch = () => {
    if (!personID || !startDate || !endDate) {
      setHasSearchedSingle(false);
      setRecords([]);
      showAlert('Missing Required Fields', 'Please enter an employee number and select a month before searching.');
      return;
    }
    setHasSearchedSingle(true);
    fetchRecords();
  };

  // ─── Selection helpers ─────────────────────────────────────────────────
  const handleUserSelect = (empNum) => {
    if (printStatusMap.has(empNum)) return;
    setSelectedUsers((prev) => { const next = new Set(prev); next.has(empNum) ? next.delete(empNum) : next.add(empNum); return next; });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const selectable = getFilteredUsers().filter((u) => !printStatusMap.has(u.employeeNumber));
      const limited    = selectable.slice(0, 50);
      setSelectedUsers(new Set(limited.map((u) => u.employeeNumber)));
      if (selectable.length > 50) showAlert('Selection Limited', `Only first 50 selected. Bulk print limit is 50 per batch.`);
    } else { setSelectedUsers(new Set()); }
  };

  const getFilteredUsers = useCallback(() => {
    let filtered = allUsersDTR.slice();
    if (recordFilter === 'has')     filtered = filtered.filter((u) => u.records?.length > 0 && !u._loading);
    else if (recordFilter === 'no') filtered = filtered.filter((u) => !u.records?.length && !u._loading);
    if (printStatusFilter === 'printed')    filtered = filtered.filter((u) => printStatusMap.has(u.employeeNumber));
    else if (printStatusFilter === 'unprinted') filtered = filtered.filter((u) => !printStatusMap.has(u.employeeNumber));
    if (departmentFilter) filtered = filtered.filter((u) => (u.departmentCode || u.rawUser?.departmentCode || '') === departmentFilter);
    if (employmentCategoryFilter !== '') filtered = filtered.filter((u) => { const cat = u.rawUser?.employmentCategory ?? u.employmentCategory ?? null; return cat !== null && cat === parseInt(employmentCategoryFilter); });
    if (registrationStatusFilter) filtered = filtered.filter((u) => (u.registrationStatus || 'Not Registered') === registrationStatusFilter);
    if (dtrType !== 'regular') {
      const isValid = (t) => { if (!t) return false; const s = String(t).trim(); return s && s !== '00:00:00 AM' && s !== '00:00:00 PM' && s !== '12:00:00 AM'; };
      filtered = filtered.filter((u) => u.records?.some((r) => {
        if (dtrType === 'honorarium')     return r.specialType === 'HONORARIUM' && isValid(r.specialTimeIN) && isValid(r.specialTimeOUT);
        if (dtrType === 'service-credit') return r.specialType === 'SERVICE'    && isValid(r.specialTimeIN) && isValid(r.specialTimeOUT);
        if (dtrType === 'overtime')       return r.specialType === 'OVERTIME'   && isValid(r.specialTimeIN) && isValid(r.specialTimeOUT);
        return false;
      }));
    }
    if (searchQuery?.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((u) => {
        const full   = (u.fullName || `${u.firstName || ''} ${u.lastName || ''}`).toLowerCase();
        const emp    = String(u.employeeNumber || '').toLowerCase();
        const device = (u.devicePersonName || '').toLowerCase();
        return full.includes(q) || emp.includes(q) || device.includes(q);
      });
    }
    return filtered;
  }, [allUsersDTR, recordFilter, printStatusFilter, printStatusMap, departmentFilter, employmentCategoryFilter, registrationStatusFilter, dtrType, searchQuery]);

  const filteredUsers  = getFilteredUsers();
  const totalPageCount = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const goToPage       = (p) => setCurrentPage(Math.min(Math.max(1, p), totalPageCount));

  const getCategoryLabel = (id) => EMPLOYMENT_CATEGORY_OPTIONS.find((option) => String(option.value) === String(id))?.label || 'Unknown';
  const getCategoryColor = (id) => EMPLOYMENT_CATEGORY_OPTIONS.find((option) => String(option.value) === String(id))?.color || '#757575';

  const getRegistrationStatusCounts = () => {
    const c = { Registered: 0, 'Not Registered': 0 };
    allUsersDTR.forEach((u) => { const s = u.registrationStatus || 'Not Registered'; if (c[s] !== undefined) c[s]++; });
    return c;
  };
  const registrationStatusCounts = getRegistrationStatusCounts();

  const handleAutoSelectFirstN = (n) => {
    const f     = getFilteredUsers();
    if (!f.length) { setSelectedUsers(new Set()); return; }
    const count = n === 'all' ? Math.min(50, f.length) : Number(n) || 0;
    setSelectedUsers(new Set(f.slice(0, count).map((u) => u.employeeNumber)));
    setPreviewUsers(f.slice(0, count));
    setCurrentPreviewIndex(0);
  };

  const handleBulkPrint = () => {
    const toPrint = filteredUsers.filter((u) => selectedUsers.has(u.employeeNumber));
    if (!toPrint.length) { showAlert('No Selection', 'Please select at least one user to print'); return; }
    if (toPrint.length > 50) { showAlert('Too Many Selected', `You selected ${toPrint.length} users. Limit is 50 per batch.`); return; }
    setPreviewUsers(toPrint); setCurrentPreviewIndex(0); setPreviewModalOpen(true);
  };

  const handlePrevious = () => setCurrentPreviewIndex((p) => (p > 0 ? p - 1 : previewUsers.length - 1));
  const handleNext     = () => setCurrentPreviewIndex((p) => (p < previewUsers.length - 1 ? p + 1 : 0));

  // ─── Capture helpers ────────────────────────────────────────────────────
  const ensureCaptureStyles = (el) => {
    if (!el) return {};
    const orig = { backgroundColor: el.style.backgroundColor, width: el.style.width, visibility: el.style.visibility, display: el.style.display, position: el.style.position, left: el.style.left, zIndex: el.style.zIndex, opacity: el.style.opacity };
    el.style.backgroundColor = '#ffffff'; el.style.width = DTR_WIDTH_IN; el.style.visibility = 'visible';
    el.style.display = 'block'; el.style.position = 'fixed'; el.style.left = '-9999px'; el.style.zIndex = '10000'; el.style.opacity = '1';
    return orig;
  };

  const restoreCaptureStyles = (el, orig) => {
    if (!el || !orig) return;
    try {
      el.style.backgroundColor = orig.backgroundColor || ''; el.style.width = orig.width || '';
      el.style.visibility = orig.visibility || ''; el.style.display = orig.display || '';
      el.style.position = orig.position || ''; el.style.left = orig.left || '';
      el.style.zIndex = orig.zIndex || ''; el.style.opacity = orig.opacity || '';
    } catch (e) { /* noop */ }
  };

  const printPage = async () => {
    if (!dtrRef.current) return;
    if (!verifyIntegrity()) return;
    restoreDOMFromOriginal();
    await new Promise((r) => setTimeout(r, 80));
    setSinglePrintLoading(true); setSinglePrintStatus('Preparing DTR for printing...');
    try {
      const pdf  = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'a4' });
      const orig = ensureCaptureStyles(dtrRef.current);
      setSinglePrintStatus('Capturing DTR layout...');
      await new Promise((r) => setTimeout(r, 100));
      const canvas  = await html2canvas(dtrRef.current, { scale: 2, useCORS: true, logging: false });
      restoreCaptureStyles(dtrRef.current, orig);
      const imgData = canvas.toDataURL('image/png');
      const dtrW = 8, dtrH = 9.5, pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', (pw - dtrW) / 2, (ph - dtrH) / 2, dtrW, dtrH);
      pdf.autoPrint();
      window.open(pdf.output('bloburl'), '_blank');
    } catch (e) { console.error('Error generating print view:', e); }
    finally { setSinglePrintLoading(false); setSinglePrintStatus(''); }
  };

  const downloadPDF = async () => {
    if (!dtrRef.current) return;
    if (!verifyIntegrity()) return;
    restoreDOMFromOriginal();
    await new Promise((r) => setTimeout(r, 80));
    setSinglePrintLoading(true); setSinglePrintStatus('Preparing DTR for download...');
    try {
      const pdf  = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'a4' });
      const orig = ensureCaptureStyles(dtrRef.current);
      await new Promise((r) => setTimeout(r, 100));
      const canvas  = await html2canvas(dtrRef.current, { scale: 2, useCORS: true, logging: false });
      restoreCaptureStyles(dtrRef.current, orig);
      const imgData = canvas.toDataURL('image/png');
      const dtrW = 8, dtrH = 10, pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', (pw - dtrW) / 2, (ph - dtrH) / 2, dtrW, dtrH);
      pdf.save(`DTR-${employeeName}-${formatMonth(startDate)}.pdf`);
    } catch (e) { console.error('Error generating PDF:', e); }
    finally { setSinglePrintLoading(false); setSinglePrintStatus(''); }
  };

  const handleIndividualPrintConfirmed = async (user) => {
    closeConfirm();
    const wasOpen = previewModalOpen;
    try {
      setPrintingAll(true); setPrintingStatus(`Preparing DTR for ${user.firstName} ${user.lastName}...`);
      setPreviewUsers([user]); setCurrentPreviewIndex(0); setPreviewModalOpen(true);
      await new Promise((r) => setTimeout(r, 1500));
      const ref = bulkDTRRefs.current[user.employeeNumber];
      if (!ref) throw new Error('DTR element not found. Please try again.');
      const orig   = ensureCaptureStyles(ref);
      await new Promise((r) => setTimeout(r, 100));
      const canvas = await html2canvas(ref, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
      restoreCaptureStyles(ref, orig);
      if (!canvas || canvas.width === 0) throw new Error('Failed to capture DTR.');
      const imgData = canvas.toDataURL('image/png');
      if (!imgData || imgData === 'data:,') throw new Error('Failed to generate image.');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'a4' });
      const dtrW = 8, dtrH = 9.5, pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', (pw - dtrW) / 2, (ph - dtrH) / 2, dtrW, dtrH);
      pdf.autoPrint();
      const year  = new Date(startDate).getFullYear();
      const month = new Date(startDate).getMonth() + 1;
      await axios.post(`${API_BASE_URL}/attendance/api/mark-dtr-printed`, { employeeNumbers: [user.employeeNumber], year, month, startDate, endDate }, getAuthHeaders());
      const newMap = new Map(printStatusMap);
      newMap.set(user.employeeNumber, { printed_at: new Date().toISOString(), printed_by: 'current_user' });
      setPrintStatusMap(newMap);
      window.open(pdf.output('bloburl'), '_blank');
    } catch (error) {
      console.error('Error printing individual DTR:', error);
      showAlert('Print Error', `Error printing DTR: ${error.message}`);
    } finally {
      setPrintingStatus(''); setPrintingAll(false);
      if (!wasOpen) setPreviewModalOpen(false);
    }
  };

  const handlePrintAllSelected = async () => {
    if (!previewUsers.length) { showAlert('No Selection', 'No DTRs to print.'); return; }
    try {
      setPrintingAll(true); setPrintingStatus('Preparing DTRs for printing...');
      await new Promise((r) => requestAnimationFrame(r));
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'a4' });
      const dtrW = 8, dtrH = 9.5, pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
      const captureScale = previewUsers.length >= 40 ? 1.2 : previewUsers.length >= 20 ? 1.4 : 2;
      let successCount = 0;
      for (let i = 0; i < previewUsers.length; i++) {
        const user = previewUsers[i];
        const ref  = bulkDTRRefs.current[user.employeeNumber];
        if (i === 0 || (i + 1) % 5 === 0 || i === previewUsers.length - 1) {
          setPrintingStatus(`Capturing DTR ${i + 1} of ${previewUsers.length}...`);
        }
        if (!ref) continue;
        try {
          const orig   = ensureCaptureStyles(ref);
          const canvas = await html2canvas(ref, { scale: captureScale, useCORS: true, logging: false });
          restoreCaptureStyles(ref, orig);
          if (!canvas || canvas.width === 0) continue;
          const imgData = canvas.toDataURL('image/png');
          if (!imgData || imgData === 'data:,') continue;
          if (successCount > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', (pw - dtrW) / 2, (ph - dtrH) / 2, dtrW, dtrH);
          successCount++;
        } catch (e) { console.error(`Error capturing ${user.employeeNumber}:`, e); try { restoreCaptureStyles(ref, {}); } catch {} }
        if ((i + 1) % 4 === 0) await new Promise((r) => setTimeout(r, 0));
      }
      if (successCount === 0) throw new Error('No DTRs were successfully captured.');
      pdf.autoPrint();
      window.open(pdf.output('bloburl'), '_blank');
      try {
        const year    = new Date(startDate).getFullYear();
        const month   = new Date(startDate).getMonth() + 1;
        const empNums = previewUsers.map((u) => u.employeeNumber);
        await axios.post(`${API_BASE_URL}/attendance/api/mark-dtr-printed`, { employeeNumbers: empNums, year, month, startDate, endDate }, getAuthHeaders());
        const newMap = new Map(printStatusMap);
        empNums.forEach((n) => newMap.set(n, { printed_at: new Date().toISOString(), printed_by: 'current_user' }));
        setPrintStatusMap(newMap); setSelectedUsers(new Set());
      } catch (e) { console.error('Error marking DTRs printed:', e); }
    } catch (error) {
      console.error('Error printing DTRs:', error);
      showAlert('Print Error', `Error: ${error.message || 'Unknown error'}`);
    } finally { setPrintingStatus(''); setPrintingAll(false); setPreviewModalOpen(false); }
  };

  const handleDownloadAllSelected = async () => {
    if (!previewUsers.length) { showAlert('No Selection', 'No DTRs to download.'); return; }
    try {
      setPrintingAll(true); setPrintingStatus('Preparing DTRs for download...');
      await new Promise((r) => requestAnimationFrame(r));
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'a4' });
      const dtrW = 8, dtrH = 10, pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
      const captureScale = previewUsers.length >= 40 ? 1.2 : previewUsers.length >= 20 ? 1.4 : 2;
      let successCount = 0;
      for (let i = 0; i < previewUsers.length; i++) {
        const user = previewUsers[i];
        const ref  = bulkDTRRefs.current[user.employeeNumber];
        if (i === 0 || (i + 1) % 5 === 0 || i === previewUsers.length - 1) {
          setPrintingStatus(`Capturing DTR ${i + 1} of ${previewUsers.length}...`);
        }
        if (!ref) continue;
        try {
          const orig   = ensureCaptureStyles(ref);
          const canvas = await html2canvas(ref, { scale: captureScale, useCORS: true, logging: false });
          restoreCaptureStyles(ref, orig);
          if (!canvas || canvas.width === 0) continue;
          const imgData = canvas.toDataURL('image/png');
          if (!imgData || imgData === 'data:,') continue;
          if (successCount > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', (pw - dtrW) / 2, (ph - dtrH) / 2, dtrW, dtrH);
          successCount++;
        } catch (e) { try { restoreCaptureStyles(ref, {}); } catch {} }
        if ((i + 1) % 4 === 0) await new Promise((r) => setTimeout(r, 0));
      }
      if (successCount === 0) throw new Error('No DTRs were successfully captured.');
      pdf.save(`DTR-AllUsers-${formatMonth(startDate)}.pdf`);
    } catch (error) { showAlert('Download Error', `Error: ${error.message || 'Unknown error'}`); }
    finally { setPrintingStatus(''); setPrintingAll(false); setPreviewModalOpen(false); }
  };

  // ─── Date indicator helpers ────────────────────────────────────────────
  const isApprovedLeaveDate = (dateString) => {
    if (!dateString || !approvedLeaves.length) return false;
    const check = dateString.split('T')[0];
    return approvedLeaves.some((req) => {
      const dates = Array.isArray(req.leave_date) ? req.leave_date : String(req.leave_date).split(',').map((d) => d.trim());
      return dates.some((d) => d.split('T')[0] === check);
    });
  };

  const isDateInRange = (date, s, e) => {
  if (!date) return false;
  const d = String(date).split('T')[0];
  const st = s ? String(s).split('T')[0] : null;
  const en = e ? String(e).split('T')[0] : null;
  if (st && en) return d >= st && d <= en;
  if (st) return d >= st;
  if (en) return d <= en;
  return false;
};

  const getDateIndicator = (dateString) => {
    if (!dateString) return null;
    const date = String(dateString).split('T')[0];
    if (isApprovedLeaveDate(date)) return { type: 'leave', label: 'ON LEAVE', bgColor: 'rgba(46,125,50,0.2)', textColor: '#000', borderColor: '#2e7d32' };
    const susp = suspensions.find((s) => isDateInRange(date, s.date_start || s.date, s.date_end || s.date));
    if (susp) return { type: 'suspension', label: 'SUSPENSION', bgColor: 'rgba(211,47,47,0.2)', textColor: '#000', borderColor: '#d32f2f' };
    const hol = holidays.find((h) => isDateInRange(date, h.date_start || h.date, h.date_end || h.date));
    if (hol) return { type: 'holiday', label: 'HOLIDAY', bgColor: 'rgba(237,108,2,0.25)', textColor: '#000', borderColor: '#ed6c02' };
    return null;
  };

  const highlightMatch = (text, q) => {
    if (!q || !text) return text;
    const lower = text.toLowerCase();
    const idx   = lower.indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return <span>{text.slice(0, idx)}<span style={{ backgroundColor: '#ffeb3b', color: '#000', padding: '0 2px', borderRadius: 2, fontWeight: 700 }}>{text.slice(idx, idx + q.length)}</span>{text.slice(idx + q.length)}</span>;
  };

  // ─── Access guards ─────────────────────────────────────────────────────
  if (accessLoading) {
    return <DTROverallWireframe />;
  }
  if (hasAccess === false) {
    return <AccessDenied title="Access Denied" message="You do not have permission to access Daily Time Record." returnPath="/admin-home" returnButtonText="Return to Home" />;
  }

  // ─── DTR table renderers ───────────────────────────────────────────────
  const getTimeFields = (record, type) => {
    if (!record) return { timeIN: '', breaktimeIN: '', breaktimeOUT: '', timeOUT: '' };
    switch (type) {
      case 'honorarium': case 'service-credit': case 'overtime':
        return { timeIN: record.specialTimeIN || '', breaktimeIN: '', breaktimeOUT: '', timeOUT: record.specialTimeOUT || '' };
      default:
        return { timeIN: record.timeIN || '', breaktimeIN: record.breaktimeIN || '', breaktimeOUT: record.breaktimeOUT || '', timeOUT: record.timeOUT || '' };
    }
  };

  const getRenderedTimeData = (record, type) => {
    if (!record) return { hours: '', minutes: '' };
    if (type === 'regular') return { hours: '', minutes: record.minutes || '' };
    const mins = record.minutes || 0;
    return { hours: mins >= 60 ? String(Math.floor(mins / 60)) : '', minutes: mins % 60 > 0 ? String(mins % 60) : '' };
  };

  const renderDTRHeader = (nameDisplay, type = dtrType) => {
    const fs = '10px';
    return (
      <thead style={{ textAlign: 'center' }}>
        <tr>
          <td colSpan="7" style={{ position: 'relative', padding: '25px 10px 0px 10px', textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', fontFamily: 'Arial,"Times New Roman",serif', color: 'black', marginBottom: '2px' }}>Republic of the Philippines</div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '3px' }}>
              <img src={earistLogo} alt="Logo" width="50" height="50" style={{ position: 'absolute', left: '10px' }} />
              <p style={{ margin: '0', fontSize: '11.5px', fontWeight: 'bold', textAlign: 'center', fontFamily: 'Arial,"Times New Roman",serif', lineHeight: '1.2' }}>EULOGIO "AMANG" RODRIGUEZ <br /> INSTITUTE OF SCIENCE &amp; TECHNOLOGY</p>
            </div>
          </td>
        </tr>
        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '0px 5px 2px 5px' }}><p style={{ fontSize: '11px', fontWeight: 'bold', margin: '0', fontFamily: 'Arial,serif' }}>Nagtahan, Sampaloc Manila</p></td></tr>
        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2px 5px' }}><p style={{ fontSize: '8px', fontWeight: 'bold', margin: '0', fontFamily: 'Arial,serif' }}>Civil Service Form No. 48</p></td></tr>
        <tr>
          <td colSpan="7" style={{ textAlign: 'center', padding: '2px 5px', lineHeight: '1.2' }}>
            {type === 'service-credit' ? (
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ fontFamily: 'Times New Roman,serif', margin: '2px 0', fontWeight: 'bold', fontSize: '16px' }}>DAILY TIME RECORD</h4>
                <div style={{ fontFamily: 'Times New Roman,serif', fontSize: '16px', marginTop: '-2px', fontWeight: 'bold' }}>SERVICE CREDITS</div>
              </div>
            ) : (
              <h4 style={{ fontFamily: 'Times New Roman,serif', textAlign: 'center', margin: '2px 0', fontWeight: 'bold', fontSize: '16px' }}>
                {type === 'honorarium' ? 'DAILY TIME RECORD - HONORARIUM' : type === 'overtime' ? 'DAILY TIME RECORD - OVERTIME' : 'DAILY TIME RECORD'}
              </h4>
            )}
          </td>
        </tr>
        <tr>
          <td colSpan="7" style={{ paddingTop: '10px', paddingBottom: '5px', lineHeight: '1.1', verticalAlign: 'top', textAlign: 'center' }}>
            <div style={{ margin: '0 auto', fontFamily: 'Arial,serif', width: '100%', maxWidth: '400px', position: 'relative' }}>
              <div style={{ borderBottom: '2px solid black', width: '100%', margin: '2px 0 3px 0' }} />
              <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: 'center', fontFamily: 'Times New Roman', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nameDisplay}</div>
              <div style={{ borderBottom: '2px solid black', width: '100%', margin: '2px 0 3px 0' }} />
              <div style={{ fontSize: '9px', textAlign: 'center', fontFamily: 'Times New Roman' }}>NAME</div>
            </div>
          </td>
        </tr>
        <tr><td colSpan="7" style={{ padding: '2px 5px', lineHeight: '1.1', textAlign: 'left' }}><div style={{ display: 'flex', alignItems: 'flex-end', paddingLeft: '5px', fontFamily: 'Times New Roman,serif', fontSize: '10px' }}><span style={{ marginRight: '6px' }}>Covered Dates:</span><div style={{ fontWeight: 'bold', textAlign: 'left', fontSize: '10px', fontFamily: 'Times New Roman,serif' }}>{formattedStartDate} - {formattedEndDate}</div></div></td></tr>
        <tr><td colSpan="7" style={{ padding: '2px 5px', lineHeight: '1.2', textAlign: 'left' }}><p style={{ fontSize: '11px', margin: '0', paddingLeft: '5px', fontFamily: 'Times New Roman,serif' }}>For the month of: <b>{startDate ? formatMonth(startDate) : ''}</b></p></td></tr>
        <tr><td colSpan="7" style={{ padding: '8px 5px 2px 5px', textAlign: 'left', fontSize: '10px', fontFamily: 'Arial,serif', lineHeight: '1.2' }}>Official hours for arrival (regular day) and departure</td></tr>
        {Array.from({ length: 6 }, (_, i) => <tr key={`e1-${i}`}><td colSpan="7"></td></tr>)}
        <tr><td colSpan="7" style={{ padding: '2px 5px' }}><div style={{ display: 'flex', alignItems: 'flex-end', paddingLeft: '5%', height: '12px', fontFamily: 'Arial,serif', fontSize: '10px', whiteSpace: 'nowrap' }}><span style={{ marginRight: '5px' }}>Regular Days:</span><span style={{ display: 'inline-block', borderBottom: '1.5px solid black', flexGrow: 1, minWidth: '310px', marginBottom: '2px' }}></span></div></td></tr>
        {Array.from({ length: 2 }, (_, i) => <tr key={`e2-${i}`}><td colSpan="7"></td></tr>)}
        <tr><td colSpan="7" style={{ padding: '2px 5px' }}><div style={{ display: 'flex', alignItems: 'flex-end', paddingLeft: '5%', height: '20px', fontFamily: 'Arial,serif', fontSize: '10px', whiteSpace: 'nowrap' }}><span style={{ marginRight: '5px' }}>Saturdays:</span><span style={{ display: 'inline-block', borderBottom: '1.5px solid black', flexGrow: 1, minWidth: '318px', marginBottom: '2px' }}></span></div></td></tr>
        {Array.from({ length: 2 }, (_, i) => <tr key={`e3-${i}`}><td colSpan="7"></td></tr>)}
        <tr>
          <th rowSpan="2" style={{ border: '1px solid black', fontFamily: 'Arial,serif', fontSize: fs }}>DAY</th>
          <th colSpan="2" style={{ border: '1px solid black', fontFamily: 'Arial,serif', fontSize: fs }}>A.M.</th>
          <th colSpan="2" style={{ border: '1px solid black', fontFamily: 'Arial,serif', fontSize: fs }}>P.M.</th>
          <th style={{ border: '1px solid black', fontFamily: 'Arial,serif', fontSize: fs }}>Late</th>
          <th style={{ border: '1px solid black', fontFamily: 'Arial,serif', fontSize: fs }}>Undertime</th>
        </tr>
        <tr style={{ textAlign: 'center' }}>
          {['Arrival','Departure','Arrival','Departure','Min','Min'].map((lbl, i) => (
            <td key={i} style={{ border: '1px solid black', fontSize: '9px', fontFamily: 'Arial,serif' }}>{lbl}</td>
          ))}
        </tr>
      </thead>
    );
  };

  const renderDTRFooter = () => (
    <tr>
      <td colSpan="7" style={{ padding: '10px 5px' }}>
        <hr style={{ borderTop: '2px solid black', width: '100%' }} />
        <p style={{ textAlign: 'justify', fontSize: '9px', lineHeight: '1.4', fontFamily: 'Times New Roman,serif', margin: '5px 0' }}>
          I CERTIFY on my honor that the above is a true and correct report<br />of the hours of work performed, record of which was made daily at<br />the time of arrival and at the time of departure from office.
        </p>
        <div style={{ width: '50%', marginLeft: 'auto', textAlign: 'center', marginTop: '40px' }}>
          <hr style={{ borderTop: '2px solid black', margin: 0 }} />
          <p style={{ fontSize: '9px', fontFamily: 'Arial,serif', margin: '5px 0 0 0' }}>Signature</p>
        </div>
        <div style={{ width: '100%', marginTop: '15px' }}>
          <hr style={{ borderTop: '1px solid black', width: '100%', margin: 0 }} />
          <hr style={{ borderTop: '1.5px solid black', width: '100%', margin: '2px 0 0 0' }} />
          <p style={{ paddingLeft: '30px', fontSize: '9px', fontFamily: 'Arial,serif', margin: '5px 0 0 0' }}>Verified as to prescribed office hours.</p>
        </div>
        <div style={{ width: '80%', marginLeft: 'auto', marginTop: '15px', textAlign: 'center' }}>
          <hr style={{ borderTop: '2px solid black', margin: 0 }} />
          <p style={{ fontSize: '9px', fontFamily: 'Times New Roman,serif', margin: '2px 0 0 0' }}>In-Charge</p>
          <p style={{ fontSize: '9px', fontFamily: 'Arial,serif', margin: '0' }}>(Signature Over Printed Name)</p>
        </div>
      </td>
    </tr>
  );

  const cellStyle = { border: '1px solid black', textAlign: 'center', padding: '0 1px', fontFamily: 'Arial,serif', fontSize: '10px', height: '16px', whiteSpace: 'nowrap' };

  const renderDTRRows = (sourceRecords, type) =>
    Array.from({ length: 31 }, (_, i) => {
      const day    = (i + 1).toString().padStart(2, '0');

      // ── FIX: use getDateDay() to avoid UTC→local timezone shift ──
      // Records are already normalized via normalizeRecord() at fetch time,
      // so getDateDay() will always return the correct local calendar day.
const record = sourceRecords.find((r) => getDateDay(normalizeRecord(r).date) === day);

      let fullDate = null;
      if (record?.date) fullDate = record.date.split('T')[0];
      else if (startDate) { const [y, m] = startDate.split('-'); fullDate = `${y}-${m}-${day}`; }
      else if (selectedMonth !== null) { fullDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${day}`; }

      const indicator = getDateIndicator(fullDate);
      const tf = getTimeFields(record, type);
      const rt = getRenderedTimeData(record, type);
      const bg = indicator ? indicator.bgColor : 'transparent';
      return (
        <tr key={i}>
          <td style={{ ...cellStyle, backgroundColor: bg, position: 'relative' }}>
            <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{day}</div>
          </td>
          {type === 'regular' ? (
            <>
              <td style={{ ...cellStyle, backgroundColor: bg, position: 'relative' }}>
                {indicator && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '7px', fontWeight: 'bold', color: 'rgba(0,0,0,0.25)', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 0 }}>{indicator.label}</div>}
                <span style={{ position: 'relative', zIndex: 1 }}>{formatTime(tf.timeIN)}</span>
              </td>
              <td style={{ ...cellStyle, backgroundColor: bg }}><span>{formatTime(tf.breaktimeIN)}</span></td>
              <td style={{ ...cellStyle, backgroundColor: bg }}><span>{formatTime(tf.breaktimeOUT)}</span></td>
              <td style={{ ...cellStyle, backgroundColor: bg, position: 'relative' }}>
                {indicator && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '7px', fontWeight: 'bold', color: 'rgba(0,0,0,0.25)', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 0 }}>{indicator.label}</div>}
                <span style={{ position: 'relative', zIndex: 1 }}>{formatTime(tf.timeOUT)}</span>
              </td>
              <td style={{ ...cellStyle, backgroundColor: bg }}><span>{rt.minutes}</span></td>
              <td style={{ ...cellStyle, backgroundColor: bg }}><span>{rt.minutes}</span></td>
            </>
          ) : (
            <>
              <td style={{ ...cellStyle, backgroundColor: bg }}><span>{formatTime(tf.timeIN)}</span></td>
              <td style={{ ...cellStyle, backgroundColor: bg }}><span></span></td>
              <td style={{ ...cellStyle, backgroundColor: bg }}><span></span></td>
              <td style={{ ...cellStyle, backgroundColor: bg }}><span>{formatTime(tf.timeOUT)}</span></td>
              <td style={{ ...cellStyle, backgroundColor: bg }}><span></span></td>
              <td style={{ ...cellStyle, backgroundColor: bg }}><span></span></td>
            </>
          )}
        </tr>
      );
    });

  const renderDTRTablePair = (sourceRecords, nameDisplay) => (
    <div style={{ display: 'flex', gap: '2%', width: '8.7in', minWidth: '8.5in', margin: '0 auto', backgroundColor: 'white', position: 'relative', zIndex: 1 }} className="table-side-by-side">
      {[0, 1].map((tIdx) => (
        <table key={tIdx} style={{ position: 'relative', border: '1px solid black', borderCollapse: 'collapse', width: '49%', tableLayout: 'fixed' }} className="print-visible">
          <DTRColGroup />
          {renderDTRHeader(nameDisplay)}
          <tbody>{renderDTRRows(sourceRecords, dtrType)}{renderDTRFooter()}</tbody>
        </table>
      ))}
    </div>
  );

  const renderDTRForModal = (user) => (
    <div className="table-container">
      <div className="table-wrapper" style={{ position: 'relative' }}>
        <img src={hrisLogo} alt="Watermark" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.07, width: '80%', maxWidth: '600px', pointerEvents: 'none', userSelect: 'none', zIndex: 0 }} />
        {renderDTRTablePair(user.records, user.fullName)}
      </div>
    </div>
  );

  const renderUserDTRTable = (user) => (
    <div key={user.employeeNumber}
      ref={(el) => { if (el) bulkDTRRefs.current[user.employeeNumber] = el; }}
      style={{ position: 'absolute', left: '-9999px', top: '0', visibility: 'hidden', width: DTR_WIDTH_IN, color: 'black' }}
      className="bulk-dtr-print"
    >
      {renderDTRForModal(user)}
    </div>
  );

  // ─── Left panel shared section: Year + Month + DTR Type ───────────────
  const renderLeftPanelContent = () => (
    <Box sx={{ px: 3.5, py: 1, flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0, ...scrollbarSx }}>

      {/* Mode toggle */}
      <FormSectionLabel icon={AccessTime}>View Mode</FormSectionLabel>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', mb: 2.5 }}>
        {[{ val: 'single', label: 'Individual DTR' }, { val: 'multiple', label: 'Batch Printing' }].map(({ val, label }) => {
          const isActive = viewMode === val;
          return (
            <Box key={val} onClick={() => setViewMode(val)}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.75, py: 0.9, borderRadius: '7px', cursor: 'pointer', border: `1px solid ${isActive ? T.accent : 'transparent'}`, bgcolor: isActive ? T.accent : 'transparent', transition: 'all 0.14s ease', '&:hover': isActive ? {} : { bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` } }}>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: isActive ? 700 : 500, color: isActive ? '#fff' : T.text, lineHeight: 1 }}>{label}</Typography>
              {isActive && <Box sx={{ px: 0.75, py: 0.2, borderRadius: '4px', bgcolor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.25)' }}><Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>Active</Typography></Box>}
            </Box>
          );
        })}
      </Box>

      {/* DTR Type */}
      <FormSectionLabel icon={PrintIcon}>DTR Type</FormSectionLabel>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '3px', mb: 1.25 }}>
        {[{ val: 'regular', label: 'Regular' }, { val: 'honorarium', label: 'Honorarium' }, { val: 'service-credit', label: 'Service Credit' }, { val: 'overtime', label: 'Overtime' }].map(({ val, label }) => {
          const isActive = dtrType === val;
          return (
            <Box key={val} onClick={() => setDtrType(val)}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.45, borderRadius: '6px', cursor: 'pointer', border: `1px solid ${isActive ? T.accent : 'transparent'}`, bgcolor: isActive ? T.accent : 'transparent', transition: 'all 0.14s ease', minHeight: 26, '&:hover': isActive ? {} : { bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` } }}>
              <Typography sx={{ fontSize: '0.68rem', fontWeight: isActive ? 700 : 500, color: isActive ? '#fff' : T.text, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</Typography>
              {isActive && <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />}
            </Box>
          );
        })}
      </Box>

      {/* Year */}
      <FormSectionLabel icon={CalendarToday}>Year</FormSectionLabel>
      <Box sx={{ mb: 2.5 }}>
        <select value={selectedYear} onChange={(e) => { setSelectedYear(parseInt(e.target.value)); setSelectedMonth(null); setHasSearchedSingle(false); setRecords([]); setEmployeeName(''); setSnackbar({ open: true, message: 'Year changed — select month and click Search to load records.', severity: 'info' }); }}
          style={{ width: '100%', padding: '9px 13px', borderRadius: '8px', border: `1px solid ${T.accentBorder}`, fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit', background: '#fff', color: T.text, cursor: 'pointer' }}>
          {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </Box>

      {/* Month */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <CalendarToday sx={{ fontSize: 12, color: alpha(T.accent, 0.45) }} />
          <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: alpha(T.accent, 0.45) }}>Month</Typography>
        </Box>
        {selectedMonth !== null && (
          <Box onClick={() => { setSelectedMonth(null); setHasSearchedSingle(false); setRecords([]); setEmployeeName(''); setStartDate(''); setEndDate(''); setAllUsersDTR([]); }}
            sx={{ fontSize: '0.65rem', color: T.accent, cursor: 'pointer', fontWeight: 700, '&:hover': { textDecoration: 'underline' } }}>Clear</Box>
        )}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '4px', mb: 0.5 }}>
        {monthsShort.map((m, idx) => {
          const isSelected = selectedMonth === idx;
          return (
            <Box key={m} onClick={() => handleMonthClick(idx)}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 30, px: 0.75, py: 0.45, borderRadius: '6px', cursor: 'pointer', border: `1px solid ${isSelected ? T.accent : 'transparent'}`, bgcolor: isSelected ? T.accent : 'transparent', transition: 'all 0.14s ease', '&:hover': isSelected ? {} : { bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` } }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: isSelected ? 700 : 600, color: isSelected ? '#fff' : T.text, lineHeight: 1, letterSpacing: '0.03em', textAlign: 'center', width: '100%' }}>
                {m}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {viewMode === 'multiple' && (
        <Box sx={{ mt: 2, mb: 2.5, p: 1.5, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
          <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: alpha(T.accent, 0.6), mb: 0.5 }}>Batch Summary</Typography>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: T.text, lineHeight: 1.3 }}>
            {loadingAllUsers ? 'Loading employees and DTRs...' : `${filteredUsers.length} ${filteredUsers.length === 1 ? 'employee' : 'employees'} found`}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: T.muted, mt: 0.4 }}>
            {loadingAllUsers ? 'Please wait while the selected month is being scanned.' : 'Use the filters on the right to narrow the batch before printing.'}
          </Typography>
        </Box>
      )}

      {/* Individual-only: employee number field */}
      {viewMode === 'single' && (
        <Box sx={{ mt: 2.5 }}>
          <FormSectionLabel icon={SearchOutlined}>Employee</FormSectionLabel>
          <Box sx={{ mb: 1.5 }}>
            <EmployeeSearchField
              value={personID}
              onSelectEmployeeNumber={(next) => {
                setPersonID(next);
                setHasSearchedSingle(false);
                setRecords([]);
                setEmployeeName('');
              }}
            />
          </Box>
          <AccentButton variant="contained" fullWidth onClick={handleSingleSearch}
            startIcon={<SearchOutlined sx={{ fontSize: '16px !important' }} />}
            sx={{ bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}>
            Search
          </AccentButton>
        </Box>
      )}
    </Box>
  );

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <Fade in timeout={500}>
      <Box>
        <style>{`
          html { overflow-y: scroll; }
          @page { size: A4; margin: 0; }
          @media print {
            .no-print { display: none !important; }
            .header,.top-banner,header,footer,.MuiDrawer-root,.MuiAppBar-root { display: none !important; }
            html,body { width: 21cm; height: 29.7cm; margin: 0; padding: 0; background: white; }
            .MuiContainer-root { max-width: 100% !important; width: 21cm !important; margin: 0 auto !important; padding: 0 !important; background: white !important; }
            .table-container { width: 100% !important; display: block !important; background: transparent !important; }
            .table-wrapper { display: flex !important; justify-content: center !important; }
            .table-side-by-side { display: flex !important; flex-direction: row !important; gap: 1.5% !important; width: 100% !important; }
            .table-side-by-side table { width: 47% !important; border: 1px solid black !important; border-collapse: collapse !important; background: white !important; }
            table { page-break-inside: avoid !important; table-layout: fixed !important; }
            .bulk-dtr-print { display: none !important; }
          }
        `}</style>

        {/* Snackbar */}
        <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} variant="filled" sx={{ width: '100%', fontWeight: 600 }}>{snackbar.message}</Alert>
        </Snackbar>

        <LoadingOverlay
          open={viewMode === 'single' && monthLoading}
          message={selectedMonth !== null ? `Loading DTR — ${monthsShort[selectedMonth]}…` : 'Loading DTR — Fetching records…'}
        />
        <LoadingOverlay
          open={viewMode === 'multiple' && loadingAllUsers}
          message={loadPhase ? `Batch load — ${loadPhase}` : 'Batch load — Loading…'}
        />

        {/* Print loading overlay */}
        {(printingAll || singlePrintLoading) && (
          <Dialog open maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, backgroundColor: '#fff', boxShadow: '0 10px 50px rgba(0,0,0,0.12)', overflow: 'hidden' } }}>
            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2 }}>
              <MCircularProgress size={48} thickness={4} sx={{ color: T.accent }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: T.text, lineHeight: 1.3 }}>
                {singlePrintLoading ? singlePrintStatus || 'Preparing DTR...' : printingStatus || 'Preparing DTRs...'}
              </Typography>
              <Typography variant="body2" sx={{ color: T.muted, maxWidth: 280, lineHeight: 1.6 }}>Please wait while the DTR is being prepared.</Typography>
              <Box sx={{ width: '100%', mt: 1 }}>
                <LinearProgress sx={{ height: 4, borderRadius: 2, backgroundColor: alpha(T.accent, 0.12), '& .MuiLinearProgress-bar': { borderRadius: 2, backgroundColor: T.accent } }} />
              </Box>
            </Box>
          </Dialog>
        )}

        <Box sx={{ py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 }, width: '100vw', maxWidth: '100%', position: 'relative', left: '63%', transform: 'translateX(-61%)', px: { xs: 2, sm: 3, md: 6 } }}>

          {/* ── Page Header ── */}
          <SectionCard className="no-print" sx={{ mb: 2, overflow: 'hidden' }}>
            <Box sx={{ px: 4, py: 3, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)' }} />
              <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)' }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
                <AccessTime sx={{ fontSize: 32, color: T.accent }} />
                <Box>
                  <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3 }}>Daily Time Record</Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: T.accentMid, fontWeight: 700, opacity: 0.9 }}>Administrative Panel • View and print employee DTR records</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
                {viewMode === 'multiple' && allUsersDTR.length > 0 && (
                  <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                    <Typography sx={{ fontSize: '0.8rem', color: T.accent, fontWeight: 700 }}>{allUsersDTR.length} employees</Typography>
                  </Box>
                )}
                {viewMode === 'single' && records.length > 0 && (
                  <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                    <Typography sx={{ fontSize: '0.8rem', color: T.accent, fontWeight: 700 }}>{records.length} records</Typography>
                  </Box>
                )}
                <Tooltip title="Refresh Page">
                  <IconButton onClick={() => window.location.reload()} sx={{ bgcolor: alpha(T.accent, 0.08), color: T.accent, width: 36, height: 36, '&:hover': { bgcolor: alpha(T.accent, 0.15) } }}>
                    <Refresh sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </SectionCard>

          {/* ── Two-column layout ── */}
          <Grid container spacing={2}>

            {/* LEFT: Sidebar panel */}
            <Grid item xs={12} lg={3} className="no-print">
              <SectionCard sx={{ height: { xs: 'auto', lg: 'calc(100vh - 280px)' }, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ px: 3.5, py: 1.25, borderBottom: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: T.accentFaint }}>
                  <CalendarToday sx={{ fontSize: 15, color: T.accent }} />
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.accent }}>DTR Period</Typography>
                </Box>
                {renderLeftPanelContent()}
              </SectionCard>
            </Grid>

            {/* RIGHT: Content panel */}
            <Grid item xs={12} lg={9}>
              <SectionCard sx={{ height: { xs: 'auto', lg: 'calc(100vh - 280px)' }, display: 'flex', flexDirection: 'column', position: 'relative' }}>

                {/* ── INDIVIDUAL DTR VIEW ── */}
                {viewMode === 'single' && (
                  <>
                    <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0 }} className="no-print">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <AccessTime sx={{ fontSize: 15, color: T.accent }} />
                          <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: T.text }}>DTR Preview</Typography>
                          {selectedMonth !== null && employeeName && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: T.faint }} />
                              <Typography sx={{ fontSize: '0.78rem', color: T.muted, fontWeight: 500 }}>{employeeName}</Typography>
                              <Box sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.accent, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, borderRadius: '5px', px: '6px', py: '2px' }}>{monthsShort[selectedMonth]}</Box>
                            </Box>
                          )}
                        </Box>
                        {selectedMonth !== null && records.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip placement="top" title={
                              <Box sx={{ p: 0.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em' }}>LEGEND</Typography>
                                {[{ label: 'Holiday', bg: 'rgba(237,108,2,0.25)', border: '#ed6c02' }, { label: 'Suspension', bg: 'rgba(211,47,47,0.2)', border: '#d32f2f' }, { label: 'On Leave', bg: 'rgba(46,125,50,0.2)', border: '#2e7d32' }].map(({ label, bg, border }) => (
                                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 28, height: 16, backgroundColor: bg, border: `1.5px solid ${border}`, borderRadius: '3px', flexShrink: 0 }} />
                                    <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 500 }}>{label}</Typography>
                                  </Box>
                                ))}
                              </Box>
                            } arrow componentsProps={{ tooltip: { sx: { bgcolor: 'white', color: '#333', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: '1px solid #e0e0e0', borderRadius: '10px', p: 1.5 } }, arrow: { sx: { color: 'white' } } }}>
                              <IconButton size="small" sx={{ bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, color: T.accent, fontSize: '13px', fontWeight: 700, width: 32, height: 32, '&:hover': { bgcolor: alpha(T.accent, 0.15) } }}>?</IconButton>
                            </Tooltip>
                            <Tooltip title="Print DTR" placement="top">
                              <IconButton size="small" onClick={printPage} sx={{ bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, color: T.accent, width: 32, height: 32, '&:hover': { bgcolor: alpha(T.accent, 0.15) } }}><PrintIcon sx={{ fontSize: 16 }} /></IconButton>
                            </Tooltip>
                            <AccentButton variant="contained" size="small"
                              startIcon={<PictureAsPdfIcon sx={{ fontSize: '13px !important' }} />}
                              onClick={downloadPDF}
                              sx={{ fontSize: '0.78rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 8px ${alpha(T.accent, 0.3)}`, '&:hover': { bgcolor: T.accentDark } }}>
                              Download PDF
                            </AccentButton>
                          </Box>
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ flexGrow: 1, overflowY: 'auto', position: 'relative', ...scrollbarSx }}>
                      {selectedMonth === null || (!personID) || !hasSearchedSingle ? (
                        <Box sx={{ py: 10, textAlign: 'center' }}>
                          <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                            <CalendarToday sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                          </Box>
                          <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>Select a DTR Period</Typography>
                          <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>
                            {!personID ? 'Enter an employee number and select a month from the left panel.' : !hasSearchedSingle ? 'Click Search to load records for the selected month.' : 'Choose a month from the left panel to view the DTR.'}
                          </Typography>
                        </Box>
                      ) : (
                        <Fade in timeout={250}>
                          <Box sx={{ bgcolor: '#f4f0f0', p: 2.5, display: 'flex', justifyContent: 'center', position: 'relative' }}>
                            <Paper elevation={2} sx={{ p: 2, borderRadius: '8px', bgcolor: '#fff', position: 'relative', boxSizing: 'border-box', overflowX: 'auto', width: '100%' }}>
                              <Box sx={{ overflowX: 'auto' }}>
                                <div className="table-container" ref={dtrRef}>
                                  <div className="table-wrapper" style={{ position: 'relative' }}>
                                    <img src={hrisLogo} alt="Watermark" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.07, width: '80%', maxWidth: '600px', pointerEvents: 'none', userSelect: 'none', zIndex: 0 }} />
                                    {renderDTRTablePair(records, employeeName)}
                                  </div>
                                </div>
                              </Box>
                            </Paper>
                          </Box>
                        </Fade>
                      )}
                    </Box>

                    {selectedMonth !== null && records.length > 0 && (
                      <Box className="no-print" sx={{ px: 3.5, py: 1.25, borderTop: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                        <PictureAsPdfIcon sx={{ fontSize: 13, color: alpha(T.accent, 0.45) }} />
                        <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>
                          Download generates a PDF of the DTR for {employeeName} — {monthsShort[selectedMonth]} {selectedYear}
                        </Typography>
                      </Box>
                    )}
                  </>
                )}

                {/* ── BATCH PRINTING VIEW ── */}
                {viewMode === 'multiple' && (
                  <>
                    <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0 }} className="no-print">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <PrintIcon sx={{ fontSize: 15, color: T.accent }} />
                          <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: T.text }}>
                            Batch Printing
                            {loadingAllUsers && loadPhase && (
                              <Typography component="span" sx={{ fontSize: '0.72rem', color: T.muted, ml: 1, fontWeight: 400 }}>{loadPhase}</Typography>
                            )}
                          </Typography>
                          {allUsersDTR.length > 0 && (
                            <Box sx={{ px: 1.5, py: 0.3, borderRadius: 6, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}` }}>
                              <Typography sx={{ fontSize: '0.7rem', color: T.accent, fontWeight: 700 }}>
                                {filteredUsers.length} users{loadingAllUsers ? ' (loading…)' : ''}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Reload all users DTR" placement="top">
                            <IconButton size="small" onClick={fetchAllUsersDTR} disabled={loadingAllUsers || !startDate || !endDate}
                              sx={{ bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, color: T.accent, width: 32, height: 32, '&:hover': { bgcolor: alpha(T.accent, 0.15) }, '&:disabled': { opacity: 0.4 } }}>
                              {loadingAllUsers ? <MCircularProgress size={14} sx={{ color: T.accent }} /> : <Refresh sx={{ fontSize: 16 }} />}
                            </IconButton>
                          </Tooltip>
                          {selectedUsers.size > 0 && (
                            <AccentButton variant="contained" size="small"
                              startIcon={<PrintIcon sx={{ fontSize: '13px !important' }} />}
                              onClick={handleBulkPrint}
                              sx={{ fontSize: '0.78rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 8px ${alpha(T.accent, 0.3)}`, '&:hover': { bgcolor: T.accentDark } }}>
                              Bulk Print ({selectedUsers.size})
                            </AccentButton>
                          )}
                        </Box>
                      </Box>
                      {loadingAllUsers && (
                        <Box sx={{ mt: 1.5 }}>
                          <LinearProgress sx={{ height: 3, borderRadius: 2, bgcolor: alpha(T.accent, 0.1), '& .MuiLinearProgress-bar': { bgcolor: T.accent } }} />
                          <Typography sx={{ fontSize: '0.68rem', color: T.faint, mt: 0.4 }}>{loadPhase}</Typography>
                        </Box>
                      )}
                    </Box>

                    {allUsersDTR.length > 0 ? (
                      <>
                        {/* Filters bar */}
                        <Box sx={{ px: 3, py: 1.5, borderBottom: `1px solid ${T.divider}`, bgcolor: alpha(T.accent, 0.02), flexShrink: 0 }}>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                            <FieldInput size="small" placeholder="Search by name or employee number…" value={searchQuery}
                              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                              sx={{ flex: 1, minWidth: 200 }}
                              InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined sx={{ fontSize: 16, color: T.muted }} /></InputAdornment> }}
                            />
                            <FormControl size="small" sx={{ minWidth: 130 }}>
                              <Select value={recordFilter} onChange={(e) => { setRecordFilter(e.target.value); setCurrentPage(1); }} sx={selectSx} displayEmpty>
                                <MenuItem value="all" sx={{ fontSize: '0.82rem' }}>All Records</MenuItem>
                                <MenuItem value="has" sx={{ fontSize: '0.82rem' }}>Has Records</MenuItem>
                                <MenuItem value="no"  sx={{ fontSize: '0.82rem' }}>No Records</MenuItem>
                              </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 140 }}>
                              <Select value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setCurrentPage(1); }} sx={selectSx} displayEmpty renderValue={(v) => v || 'All Depts'}>
                                <MenuItem value="" sx={{ fontSize: '0.82rem' }}>All Departments</MenuItem>
                                {departments.map((d) => <MenuItem key={d.code} value={d.code} sx={{ fontSize: '0.82rem' }}>{d.code}</MenuItem>)}
                              </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 160 }}>
                              <Select value={employmentCategoryFilter} onChange={(e) => { setEmploymentCategoryFilter(e.target.value); setCurrentPage(1); }} sx={selectSx} displayEmpty renderValue={(v) => v !== '' ? getCategoryLabel(v) : 'All Categories'}>
                                <MenuItem value="" sx={{ fontSize: '0.82rem' }}>All Categories</MenuItem>
                                {EMPLOYMENT_CATEGORY_OPTIONS.map((option) => (
                                  <MenuItem key={option.value} value={option.value} sx={{ fontSize: '0.82rem' }}>{option.label}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', gap: 0.75 }}>
                              {['all', 'printed', 'unprinted'].map((val) => (
                                <Box key={val} onClick={() => { setPrintStatusFilter(val); setCurrentPage(1); }}
                                  sx={{ px: 1.5, py: 0.4, borderRadius: '20px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, bgcolor: printStatusFilter === val ? T.accent : alpha(T.accent, 0.07), color: printStatusFilter === val ? '#fff' : T.accent, border: `1px solid ${printStatusFilter === val ? T.accent : T.accentBorder}`, transition: 'all 0.15s' }}>
                                  {val.charAt(0).toUpperCase() + val.slice(1)}
                                </Box>
                              ))}
                            </Box>
                            <FormControl size="small" sx={{ minWidth: 160 }}>
                              <Select value={registrationStatusFilter} onChange={(e) => { setRegistrationStatusFilter(e.target.value); setCurrentPage(1); }} sx={selectSx} displayEmpty renderValue={(v) => v || 'All Status'}>
                                <MenuItem value="" sx={{ fontSize: '0.82rem' }}>All Status</MenuItem>
                                <MenuItem value="Registered" sx={{ fontSize: '0.82rem' }}>🟢 Registered ({registrationStatusCounts['Registered']})</MenuItem>
                                <MenuItem value="Not Registered" sx={{ fontSize: '0.82rem' }}>🟠 Not Registered ({registrationStatusCounts['Not Registered']})</MenuItem>
                              </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 80 }}>
                              <Select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} sx={selectSx}>
                                {[10, 20, 50, 100].map((n) => <MenuItem key={n} value={n} sx={{ fontSize: '0.82rem' }}>{n} rows</MenuItem>)}
                              </Select>
                            </FormControl>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, ml: 'auto' }}>
                              {[{ label: '«', fn: () => goToPage(1), dis: currentPage === 1 }, { label: '‹', fn: () => goToPage(currentPage - 1), dis: currentPage === 1 }].map(({ label, fn, dis }) => (
                                <IconButton key={label} size="small" onClick={fn} disabled={dis} sx={{ width: 28, height: 28, color: T.accent, border: `1px solid ${T.accentBorder}`, borderRadius: '6px', '&:disabled': { opacity: 0.35 } }}>
                                  <Typography sx={{ fontSize: '0.8rem', lineHeight: 1 }}>{label}</Typography>
                                </IconButton>
                              ))}
                              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.muted, minWidth: 60, textAlign: 'center' }}>{currentPage} / {totalPageCount}</Typography>
                              {[{ label: '›', fn: () => goToPage(currentPage + 1), dis: currentPage === totalPageCount }, { label: '»', fn: () => goToPage(totalPageCount), dis: currentPage === totalPageCount }].map(({ label, fn, dis }) => (
                                <IconButton key={label} size="small" onClick={fn} disabled={dis} sx={{ width: 28, height: 28, color: T.accent, border: `1px solid ${T.accentBorder}`, borderRadius: '6px', '&:disabled': { opacity: 0.35 } }}>
                                  <Typography sx={{ fontSize: '0.8rem', lineHeight: 1 }}>{label}</Typography>
                                </IconButton>
                              ))}
                            </Box>
                          </Box>
                        </Box>

                        {/* Table */}
                        <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'auto', ...scrollbarSx }}>
                          <Table stickyHeader sx={{ tableLayout: 'fixed', width: '100%', minWidth: 800 }}>
                            <TableHead>
                              <TableRow sx={{ '& .MuiTableCell-head': { bgcolor: T.accent, color: '#fff', fontWeight: 700, fontSize: '0.75rem', py: 1.25 } }}>
                                <TableCell padding="checkbox" sx={{ width: 48 }}>
                                  <Checkbox
                                    checked={(() => { const sel = filteredUsers.filter((u) => !printStatusMap.has(u.employeeNumber)); return sel.length > 0 && selectedUsers.size === sel.length; })()}
                                    indeterminate={(() => { const sel = filteredUsers.filter((u) => !printStatusMap.has(u.employeeNumber)).length; return selectedUsers.size > 0 && selectedUsers.size < sel; })()}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    sx={{ color: '#fff', '&.Mui-checked': { color: '#fff' }, '&.MuiCheckbox-indeterminate': { color: '#fff' } }}
                                  />
                                </TableCell>
                                {['Emp. No.', 'Full Name', 'Department', 'Category', 'Registration', 'Print Status', 'Action'].map((h) => (
                                  <TableCell key={h} sx={{ minWidth: h === 'Full Name' ? 200 : 80 }}>{h}</TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {paginatedUsers.map((user, idx) => {
                                const isPrinted  = printStatusMap.has(user.employeeNumber);
                                const isSelected = selectedUsers.has(user.employeeNumber);
                                const isLoading  = user._loading;
                                const deptCode   = user.departmentCode || user.rawUser?.departmentCode || 'N/A';
                                return (
                                  <TableRow key={user.employeeNumber}
                                    sx={{ bgcolor: isSelected ? alpha(T.accent, 0.06) : idx % 2 === 0 ? T.rowEven : T.rowOdd, '&:hover': { bgcolor: T.rowHover }, transition: 'background 0.1s' }}>
                                    <TableCell padding="checkbox">
                                      <Checkbox checked={isSelected} onChange={() => handleUserSelect(user.employeeNumber)} disabled={isPrinted || isLoading} sx={{ '&.Mui-checked': { color: T.accent } }} />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.78rem', color: T.muted, fontWeight: 600 }}>
                                      {isLoading ? <SkeletonText width={60} /> : `#${user.employeeNumber}`}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600, color: T.text, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {isLoading ? <SkeletonText width={120} /> : (searchQuery ? highlightMatch(user.fullName || '', searchQuery) : user.fullName)}
                                    </TableCell>
                                    <TableCell>
                                      {isLoading ? <SkeletonChip /> : (
                                        deptCode !== 'N/A'
                                          ? <Box sx={{ px: 1.2, py: 0.3, borderRadius: 1, bgcolor: alpha(T.accent, 0.07), border: `1px solid ${T.accentBorder}`, display: 'inline-block' }}><Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: T.accent }}>{deptCode}</Typography></Box>
                                          : <Typography sx={{ fontSize: '0.72rem', color: T.faint, fontStyle: 'italic' }}>N/A</Typography>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {isLoading ? <SkeletonChip /> : (
                                        <Chip label={getCategoryLabel(user.rawUser?.employmentCategory ?? user.employmentCategory ?? null)} size="small"
                                          sx={{ bgcolor: alpha(getCategoryColor(user.rawUser?.employmentCategory ?? user.employmentCategory), 0.1), color: getCategoryColor(user.rawUser?.employmentCategory ?? user.employmentCategory), border: `1px solid ${getCategoryColor(user.rawUser?.employmentCategory ?? user.employmentCategory)}`, fontWeight: 600, fontSize: '0.68rem', height: 20 }} />
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {isLoading ? <SkeletonChip /> : (
                                        <Chip label={user.registrationStatus === 'Registered' ? '🟢 Registered' : '🟠 Not Registered'} size="small" color={user.registrationStatus === 'Registered' ? 'success' : 'warning'} sx={{ fontWeight: 600, fontSize: '0.68rem', height: 20 }} />
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {isLoading ? <SkeletonChip /> : (
                                        isPrinted
                                          ? <Chip label="Printed" size="small" color="success" sx={{ fontSize: '0.68rem', height: 20, fontWeight: 600 }} />
                                          : <Chip label="Unprinted" size="small" sx={{ fontSize: '0.68rem', height: 20, bgcolor: alpha('#757575', 0.1), color: '#757575', border: '1px solid #bdbdbd' }} />
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {isLoading ? <SkeletonChip /> : (
                                        <Tooltip title={isPrinted ? 'Re-print DTR' : 'Print DTR'}>
                                          <IconButton size="small" onClick={() => showReprintConfirm(user)} sx={{ color: T.accent, bgcolor: T.accentFaint, '&:hover': { bgcolor: T.accentHover }, borderRadius: '6px', width: 28, height: 28 }}>
                                            <PrintIcon sx={{ fontSize: 14 }} />
                                          </IconButton>
                                        </Tooltip>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                          {paginatedUsers.length === 0 && (
                            <Box sx={{ py: 8, textAlign: 'center' }}>
                              <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>{allUsersDTR.length === 0 ? 'No attendance records' : 'No users match your filters'}</Typography>
                              <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>{allUsersDTR.length === 0 ? 'Select a month to auto-load records.' : 'Try adjusting the search or filters.'}</Typography>
                            </Box>
                          )}
                        </Box>

                        {/* Action bar footer */}
                        <Box className="no-print" sx={{ px: 3, py: 1.25, borderTop: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, flexShrink: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                            <FormControl size="small" sx={{ minWidth: 130, bgcolor: '#fff' }}>
                              <Select value="" onChange={(e) => { const v = e.target.value; if (v === 'none') return; v === 'all' ? handleAutoSelectFirstN('all') : handleAutoSelectFirstN(Number(v)); }} displayEmpty renderValue={() => 'Quick select…'} sx={selectSx}>
                                <MenuItem value="none"><em>Choose</em></MenuItem>
                                <MenuItem value={10}>First 10</MenuItem>
                                <MenuItem value={20}>First 20</MenuItem>
                                <MenuItem value={50}>First 50 (max)</MenuItem>
                              </Select>
                            </FormControl>
                            <AccentButton variant="contained" onClick={handleBulkPrint} disabled={selectedUsers.size === 0}
                              startIcon={<PrintIcon sx={{ fontSize: '16px !important' }} />}
                              sx={{ bgcolor: selectedUsers.size > 0 ? T.accent : alpha(T.accent, 0.35), color: '#fff', boxShadow: selectedUsers.size > 0 ? `0 2px 10px ${alpha(T.accent, 0.32)}` : 'none', '&:hover': { bgcolor: T.accentDark } }}>
                              Bulk Print ({selectedUsers.size})
                            </AccentButton>
                          </Box>
                          <Typography sx={{ fontSize: '0.75rem', color: T.muted }}>
                            {filteredUsers.length > 0 ? `Showing ${Math.min(filteredUsers.length, (currentPage - 1) * rowsPerPage + 1)}–${Math.min(filteredUsers.length, currentPage * rowsPerPage)} of ${filteredUsers.length}` : '0 users'}
                          </Typography>
                        </Box>
                      </>
                    ) : (
                      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                          {loadingAllUsers ? <MCircularProgress sx={{ color: T.accent }} /> : <PrintIcon sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />}
                        </Box>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>
                          {loadingAllUsers ? loadPhase || 'Loading records…' : (!startDate || !endDate ? 'Select a month first' : 'No records loaded')}
                        </Typography>
                        <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>
                          {!startDate || !endDate ? 'Pick a year and month from the left panel — data loads automatically.' : 'Click the reload button in the toolbar to fetch records.'}
                        </Typography>
                      </Box>
                    )}
                  </>
                )}

                {/* Off-screen bulk DTR nodes */}
                <Box sx={{ position: 'absolute', left: '-9999px', top: 0, width: 0, height: 0, overflow: 'hidden' }}>
                  {previewUsers.map((user) => renderUserDTRTable(user))}
                </Box>
              </SectionCard>
            </Grid>
          </Grid>
        </Box>

        {/* ── Bulk Print Preview Modal ── */}
        <Dialog open={previewModalOpen} onClose={() => setPreviewModalOpen(false)} maxWidth="lg" fullWidth
          PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden', visibility: printingAll ? 'hidden' : 'visible', pointerEvents: printingAll ? 'none' : 'auto', display: 'flex', flexDirection: 'column', maxHeight: '90vh' } }}>
          <Box sx={{ px: 3, py: 2, background: T.headerGrad, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <Box>
              <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>DTR Preview</Typography>
              {previewUsers[currentPreviewIndex] && <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)' }}>{previewUsers[currentPreviewIndex].fullName}{startDate && ` · ${formatMonth(startDate)} ${new Date(startDate).getFullYear()}`}</Typography>}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {previewUsers.length > 1 && !printingAll && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: '20px', px: 1.5, py: 0.5 }}>
                  <IconButton size="small" onClick={handlePrevious} sx={{ color: '#fff', p: 0.25 }}><ArrowBack sx={{ fontSize: 16 }} /></IconButton>
                  <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.75rem', minWidth: 48, textAlign: 'center' }}>{currentPreviewIndex + 1} of {previewUsers.length}</Typography>
                  <IconButton size="small" onClick={handleNext} sx={{ color: '#fff', p: 0.25 }}><ArrowForward sx={{ fontSize: 16 }} /></IconButton>
                </Box>
              )}
              <IconButton onClick={() => setPreviewModalOpen(false)} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', width: 28, height: 28, '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}>
                <Close sx={{ fontSize: 15 }} />
              </IconButton>
            </Box>
          </Box>
          <DialogContent sx={{ p: 0, flex: 1, overflow: 'hidden', bgcolor: '#f0f0f0', display: 'flex', flexDirection: 'column' }}>
            {!printingAll && (
              <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', p: 2, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', ...scrollbarSx }}>
                {previewUsers[currentPreviewIndex] && (
                  <Paper elevation={0} sx={{ p: 2, bgcolor: 'white', borderRadius: 2, width: 'fit-content', maxWidth: '100%', border: `1px solid ${T.accentBorder}` }}>
                    {renderDTRForModal(previewUsers[currentPreviewIndex])}
                  </Paper>
                )}
              </Box>
            )}
          </DialogContent>
          <Box sx={{ px: 3, py: 1.5, bgcolor: '#fff', borderTop: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <AccentButton variant="contained" onClick={handlePrintAllSelected}
                startIcon={<PrintIcon sx={{ fontSize: '16px !important' }} />}
                sx={{ bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}>
                Print All
                <Box component="span" sx={{ ml: 1, bgcolor: 'rgba(255,255,255,0.25)', borderRadius: '20px', px: 1, py: 0.2, fontSize: '0.72rem', fontWeight: 700 }}>{previewUsers.length}</Box>
              </AccentButton>
              <AccentButton variant="outlined" onClick={handleDownloadAllSelected}
                startIcon={<PictureAsPdfIcon sx={{ fontSize: '16px !important' }} />}
                sx={{ borderColor: T.accentBorder, color: T.accent, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent } }}>
                Download PDF
                <Box component="span" sx={{ ml: 1, bgcolor: T.accentFaint, borderRadius: '20px', px: 1, py: 0.2, fontSize: '0.72rem', fontWeight: 700, color: T.accent }}>{previewUsers.length}</Box>
              </AccentButton>
            </Box>
            <AccentButton variant="text" onClick={() => setPreviewModalOpen(false)} sx={{ color: T.muted, '&:hover': { bgcolor: alpha('#000', 0.04), transform: 'none' }, '&:active': { transform: 'none' } }}>Close</AccentButton>
          </Box>
        </Dialog>

        {/* ── Alert Modal ── */}
        <Dialog open={alertModal.open} onClose={closeAlert} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
          <Box sx={{ px: 3, py: 2, background: T.headerGrad, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.92rem' }}>{alertModal.title}</Typography>
            <IconButton size="small" onClick={closeAlert} sx={{ color: 'rgba(255,255,255,0.75)', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}><Close sx={{ fontSize: 16 }} /></IconButton>
          </Box>
          <Box sx={{ p: 3 }}><Typography sx={{ fontSize: '0.85rem', color: T.text, lineHeight: 1.6 }}>{alertModal.message}</Typography></Box>
          <Box sx={{ px: 3, pb: 2.5, display: 'flex', justifyContent: 'flex-end' }}>
            <AccentButton variant="contained" onClick={closeAlert} sx={{ bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}>OK</AccentButton>
          </Box>
        </Dialog>

        {/* ── Re-print Confirmation Modal ── */}
        <Dialog open={confirmModal.open} onClose={closeConfirm} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
          <DialogContent sx={{ textAlign: 'center', py: 4, px: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{ mb: 2, color: T.accent, bgcolor: T.accentFaint, p: 2, borderRadius: '12px' }}><PrintIcon sx={{ fontSize: 36 }} /></Box>
            <Typography sx={{ fontSize: '1rem', fontWeight: 700, mb: 0.5, color: T.text }}>{printStatusMap.has(confirmModal.user?.employeeNumber) ? 'Re-print DTR?' : 'Confirm Print Job'}</Typography>
            <Typography sx={{ fontSize: '0.82rem', color: T.muted, mb: 3, maxWidth: '85%', lineHeight: 1.6 }}>
              {printStatusMap.has(confirmModal.user?.employeeNumber) ? 'This record was printed previously. Generate a new copy?' : 'Verify the details below before printing.'}
            </Typography>
            {confirmModal.user && (
              <Box sx={{ width: '100%', border: `1.5px dashed ${T.accentBorder}`, bgcolor: T.accentFaint, borderRadius: 2, p: 2.5, mb: 3 }}>
                <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: T.text, mb: 1 }}>{confirmModal.user.fullName || `${confirmModal.user.firstName} ${confirmModal.user.lastName}`}</Typography>
                <Box sx={{ width: 40, height: 3, bgcolor: T.accent, borderRadius: 2, mx: 'auto', mb: 1 }} />
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Typography sx={{ fontSize: '0.75rem', color: T.muted }}>#{confirmModal.user.employeeNumber}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: T.faint }}>|</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: T.muted }}>{formatMonth(startDate)}</Typography>
                </Box>
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
              <AccentButton variant="outlined" onClick={closeConfirm} sx={{ borderColor: T.accentBorder, color: T.muted, '&:hover': { borderColor: T.accent, color: T.accent, bgcolor: T.accentFaint } }}>Cancel</AccentButton>
              <AccentButton variant="contained" onClick={() => confirmModal.user && handleIndividualPrintConfirmed(confirmModal.user)}
                startIcon={<PrintIcon sx={{ fontSize: '16px !important' }} />}
                sx={{ bgcolor: T.accent, color: '#fff', boxShadow: `0 4px 14px ${alpha(T.accent, 0.35)}`, '&:hover': { bgcolor: T.accentDark } }}>
                Print
              </AccentButton>
            </Box>
          </DialogContent>
        </Dialog>

      </Box>
    </Fade>
  );
};

export default DailyTimeRecordFaculty;