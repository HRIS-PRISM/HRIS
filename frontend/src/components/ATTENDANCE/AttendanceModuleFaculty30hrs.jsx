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
    Tooltip,
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
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
    Collapse,
    Paper,
    Fab,
    Zoom,
    TextField,
    List,
    ListItemButton,
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
  } from '@mui/icons-material';
  import { useNavigate, useLocation } from 'react-router-dom';
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
  } from '../../utils/halfDayReview';
  import HalfDayReviewDialog from './HalfDayReviewDialog';
  import {
    HalfDayApproveHeaderCell,
    HalfDayApproveBodyCell,
    HalfDayApproveTotalsCell,
    getHalfDayReviewRowChrome,
  } from './HalfDayApproveCheckboxCell';
  import {
    parseOfficialTimeToSeconds,
    formatOfficialAttendanceSeconds,
    isExcludedAttendanceCalendarDate,
    isScheduledByOfficialTime,
    getOfficialSchedWorkSec,
  } from '../../utils/officialAttendanceFromDailyRows';
  import { computeLateTotalTimeFromTardiness } from '../../utils/attendanceLateTotals';
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
  import { applyFacultyPunchGatedBreaktimes } from '../../utils/facultyBreaktimeFromPunches';

  // ─── Theme tokens (unified) ────────────────────────────────────────────────
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
    holiday:   { bg: 'rgba(245,124,0,0.10)',  color: '#f57c00', border: 'rgba(245,124,0,0.35)'  },
    halfDay:   { bg: 'rgba(106,27,154,0.10)', color: '#6a1b9a', border: 'rgba(106,27,154,0.35)' },
    leave:     { bg: 'rgba(46,125,50,0.10)',   color: '#2e7d32', border: 'rgba(46,125,50,0.35)'  },
    suspended: { bg: 'rgba(211,47,47,0.10)',   color: '#d32f2f', border: 'rgba(211,47,47,0.35)'  },
    absent:    { bg: 'rgba(183,28,28,0.08)',   color: '#b71c1c', border: 'rgba(183,28,28,0.25)'  },
    rendered:  { bg: 'rgba(27,94,32,0.08)',    color: '#1b5e20', border: 'rgba(27,94,32,0.25)'   },
    tardiness: { bg: 'rgba(183,28,28,0.08)',   color: '#b71c1c', border: 'rgba(183,28,28,0.25)'  },
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
    <Box
      sx={{
        width: w, height: h, borderRadius: r,
        background: 'linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)',
        backgroundSize: '800px 100%',
        animation: 'shimmer 1.6s infinite linear',
        flexShrink: 0, ...sx,
      }}
    />
  );

  // ─── Wireframe skeleton ────────────────────────────────────────────────────
  const AttendanceFacultyWireframe = () => (
    <>
      <style>{shimmerKf}</style>
      <Box sx={{
        py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 },
        width: '100vw', maxWidth: '100%',
        position: 'relative', left: '63%', transform: 'translateX(-61%)',
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
              {[1, 2, 3].map((i) => (
                <Box key={i} sx={{ flex: 1, height: 40, borderRadius: '8px', bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }} />
              ))}
            </Box>
            <Box sx={{ border: `2px dashed ${T.accentBorder}`, borderRadius: '8px', p: 3 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <Box key={i} sx={{ width: 64, height: 36, borderRadius: '6px', bgcolor: T.accentFaint }} />
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
        <Box sx={{ borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.09)', bgcolor: '#fff', animation: 'blink 2s ease-in-out 0.2s infinite' }}>
          <Box sx={{ px: 2.5, py: 1.25, bgcolor: T.accent, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 2 }}>
            {[100, 80, 80, 80].map((w, i) => (
              <Box key={i} sx={{ height: 10, width: w, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.22)' }} />
            ))}
          </Box>
          {[...Array(5)].map((_, i) => (
            <Box key={i} sx={{ px: 2.5, py: 2, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 2, alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)', bgcolor: i % 2 === 0 ? '#fff' : T.rowOdd }}>
              <Bone w={120} h={12} /><Bone w={80} h={12} /><Bone w={80} h={12} />
              <Box sx={{ width: 90, height: 24, borderRadius: '12px', bgcolor: T.accentFaint }} />
            </Box>
          ))}
        </Box>
      </Box>
    </>
  );

  // ─── Styled primitives ─────────────────────────────────────────────────────
  const SectionCard = styled(Card)({
    borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
    border: '0.5px solid rgba(0,0,0,0.09)',
    overflow: 'hidden',
    background: '#fff',
  });

  // ─── Panel header bar ──────────────────────────────────────────────────────
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

  // ─── Native input ──────────────────────────────────────────────────────────
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
        onFocus={(e) => { if (!disabled) { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 1.5px ${T.accent}22`; } }}
        onBlur={(e) => { e.target.style.borderColor = T.accentBorder; e.target.style.boxShadow = 'none'; }}
      />
    </Box>
  );

  // ─── Employee search ───────────────────────────────────────────────────────
  const FieldInput = styled(TextField)({
    '& .MuiOutlinedInput-root': {
      borderRadius: 8, fontSize: '0.875rem', backgroundColor: '#fff',
      '& fieldset': { borderColor: T.accentBorder },
      '&:hover fieldset': { borderColor: T.accent },
      '&.Mui-focused fieldset': { borderColor: T.accent, borderWidth: 1.5 },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: T.accent },
  });

  const formatFullNameForSearch = (fullName) => {
    if (!fullName) return '';
    const cleaned = String(fullName).trim().replace(/\s+/g, ' ');
    if (!cleaned) return '';
    const parts = cleaned.split(' ');
    const suffixes = new Set(['JR', 'JR.', 'SR', 'SR.', 'II', 'III', 'IV', 'V']);
    let suffix = '';
    if (suffixes.has(parts[parts.length - 1]?.toUpperCase())) suffix = parts.pop();
    if (parts.length === 1) return suffix ? `${parts[0]} ${suffix}` : parts[0];
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    const middleFormatted = parts.slice(1, parts.length - 1).map((m) => {
      const mm = String(m).replace(/\./g, '');
      return mm.length === 1 ? `${mm.toUpperCase()}.` : m;
    }).join(' ');
    const base = `${lastName}, ${firstName}${middleFormatted ? ` ${middleFormatted}` : ''}`;
    return suffix ? `${base} ${suffix}` : base;
  };

  const EmployeeSearchField = ({
    value,
    onSelectEmployeeNumber,
    onSearchQueryChange,
    disabled = false,
  }) => {
    const [query, setQuery] = useState(value || '');
    const [debouncedQuery, setDebouncedQuery] = useState(value || '');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const debounceRef = useRef(null);
    const containerRef = useRef(null);
    const abortRef = useRef(null);

    useEffect(() => { setQuery(value || ''); setDebouncedQuery(value || ''); }, [value]);
    useEffect(() => {
      const handleOutside = (event) => { if (!containerRef.current?.contains(event.target)) setOpen(false); };
      document.addEventListener('mousedown', handleOutside);
      return () => document.removeEventListener('mousedown', handleOutside);
    }, []);
    useEffect(() => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    }, []);
    useEffect(() => {
      if (!open) return;
      if (abortRef.current) abortRef.current.abort();
      const q = debouncedQuery.trim();
      if (q.length < 2) { setResults([]); setLoading(false); return; }
      setLoading(true);
      const controller = new AbortController();
      abortRef.current = controller;
      axios.get(`${API_BASE_URL}/users/search`, {
        params: { q },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        signal: controller.signal,
      })
        .then((res) => { const list = Array.isArray(res.data) ? res.data : []; setResults(list.slice(0, 20)); })
        .catch((err) => { if (err?.code === 'ERR_CANCELED') return; setResults([]); })
        .finally(() => setLoading(false));
      return () => controller.abort();
    }, [debouncedQuery, open]);

    const queueSearch = (nextValue) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => { setDebouncedQuery(nextValue); setOpen(true); }, 220);
    };
    const handleInputChange = (e) => {
      const next = e.target.value;
      onSelectEmployeeNumber(next);
      setQuery(next);
      onSearchQueryChange?.(next.trim());
      queueSearch(next);
    };
    const handleSelect = (emp) => {
      const num = emp?.employeeNumber ? String(emp.employeeNumber) : '';
      onSelectEmployeeNumber(num);
      setQuery(num);
      setDebouncedQuery(num);
      setOpen(false);
      onSearchQueryChange?.(query.trim());
    };
    const handleClear = () => { if (debounceRef.current) clearTimeout(debounceRef.current); if (abortRef.current) abortRef.current.abort(); setQuery(''); setDebouncedQuery(''); setResults([]); setOpen(false); onSelectEmployeeNumber(''); };

    return (
      <Box sx={{ position: 'relative', width: '100%' }} ref={containerRef}>
        <FieldInput
          fullWidth size="small" value={query} onChange={handleInputChange} onFocus={() => setOpen(true)}
          placeholder="Type name or employee number..." disabled={disabled} autoComplete="off"
          inputProps={{ autoComplete: 'new-password' }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchOutlined sx={{ color: T.muted, fontSize: 16 }} /></InputAdornment>,
            endAdornment: (
              <InputAdornment position="end">
                {loading ? <CircularProgress size={14} sx={{ color: T.accent }} /> : query ? (
                  <IconButton size="small" onClick={handleClear} sx={{ p: 0.25 }}><CloseIcon sx={{ fontSize: 14, color: T.faint }} /></IconButton>
                ) : null}
              </InputAdornment>
            ),
          }}
        />
        {open && (
          <Paper elevation={6} sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1300, mt: 0.5, maxHeight: 280, overflow: 'auto', borderRadius: '10px', border: `1px solid ${T.accentBorder}` }}>
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 2.5 }}>
                <CircularProgress size={16} sx={{ color: T.accent }} />
                <Typography sx={{ fontSize: '0.8rem', color: T.muted }}>Searching...</Typography>
              </Box>
            ) : results.length > 0 ? (
              <List dense disablePadding>
                {results.map((emp) => (
                  <ListItemButton key={emp.employeeNumber} onClick={() => handleSelect(emp)}
                    sx={{ py: 1, px: 1.5, borderBottom: `1px solid ${T.divider}`, '&:hover': { bgcolor: T.accentFaint }, '&:last-child': { borderBottom: 'none' } }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                      <Typography sx={{ fontSize: '0.83rem', fontWeight: 700, color: T.text, lineHeight: 1.2 }}>{formatFullNameForSearch(emp.fullName)}</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>#{emp.employeeNumber}</Typography>
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

  // ─── Row action button ─────────────────────────────────────────────────────
  const RowBtn = ({ icon, label, onClick, color, hoverBg, disabled = false }) => (
    <button onClick={onClick} disabled={disabled}
      style={{ background: 'transparent', border: `1px solid ${color}40`, borderRadius: '8px', padding: '9px 18px', cursor: disabled ? 'default' : 'pointer', color, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'inherit', transition: 'background-color 0.15s, border-color 0.15s', whiteSpace: 'nowrap', opacity: disabled ? 0.5 : 1 }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.borderColor = color; } }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = `${color}40`; }}>
      {icon}{label}
    </button>
  );

  // ─── Half-day helpers ─────────────────────────────────────────────────────
  const attendanceEmptyPunch = (v) => {
    if (v == null) return true;
    const normalized = String(v).trim().replace(/\s+/g, ' ').toLowerCase();
    return (
      !normalized ||
      normalized === '—' ||
      normalized === '-' ||
      normalized === '--' ||
      normalized === 'n/a' ||
      normalized === 'na' ||
      normalized === 'null' ||
      normalized === 'undefined'
    );
  };

  // 30hrs half-day/absent bucketing uses only Time IN and Time OUT.
  // Break punches can be system-filled and should not decide attendance presence.
  function hasNoPunchesTimeInOutOnly(row) {
    return attendanceEmptyPunch(row?.timeIN) && attendanceEmptyPunch(row?.timeOUT);
  }
  function hasMorningPunchTimeInOnly(row) {
    return !attendanceEmptyPunch(row?.timeIN);
  }
  function hasAfternoonPunchTimeOutOnly(row) {
    return !attendanceEmptyPunch(row?.timeOUT);
  }

  function computeOfficialAwareAbsenceAndLate_TimeInOutOnly(rows, calendarMaps) {
    let absentDays = 0;
    let halfDays = 0;
    let absentSecTotal = 0;
    let halfDayShortfallSecTotal = 0;
    let lateShortfallSecTotal = 0;
    let renderedSecTotal = 0;

    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const d = String(row?.date ?? '').trim().slice(0, 10);
      if (calendarMaps && isExcludedAttendanceCalendarDate(d, calendarMaps)) return;
      if (!isScheduledByOfficialTime(row)) return;

      const schedWorkSec = getOfficialSchedWorkSec(row);
      if (schedWorkSec == null) return;

      if (hasNoPunchesTimeInOutOnly(row)) {
        absentDays += 1;
        absentSecTotal += schedWorkSec;
        return;
      }

      const morning = hasMorningPunchTimeInOnly(row);
      const afternoon = hasAfternoonPunchTimeOutOnly(row);
      if (morning !== afternoon) halfDays += 1;

      const inSec = parseOfficialTimeToSeconds(row?.timeIN);
      const outSec = parseOfficialTimeToSeconds(row?.timeOUT);

      let renderedSec = 0;
      if (inSec != null && outSec != null) {
        renderedSec = Math.max(0, outSec - inSec);
      } else if (morning !== afternoon) {
        renderedSec = Math.floor(schedWorkSec / 2);
      }

      renderedSecTotal += renderedSec;
      const deficit = Math.max(0, schedWorkSec - renderedSec);
      if (morning !== afternoon) halfDayShortfallSecTotal += deficit;
      else lateShortfallSecTotal += deficit;
    });

    const overallShortfallSecTotal = absentSecTotal + halfDayShortfallSecTotal + lateShortfallSecTotal;
    return {
      absentDays,
      halfDays,
      absentSecTotal,
      halfDayShortfallSecTotal,
      lateShortfallSecTotal,
      overallShortfallSecTotal,
      absentTime: formatOfficialAttendanceSeconds(absentSecTotal),
      halfDayShortfallTime: formatOfficialAttendanceSeconds(halfDayShortfallSecTotal),
      lateShortfallTime: formatOfficialAttendanceSeconds(lateShortfallSecTotal),
      overallShortfallTime: formatOfficialAttendanceSeconds(overallShortfallSecTotal),
      renderedSecTotal,
    };
  }

  function listHalfDayDatesFromDailyRows_TimeInOutOnly(rows, calendarMaps) {
    const dates = [];
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const d = String(row?.date ?? '').trim().slice(0, 10);
      if (calendarMaps && isExcludedAttendanceCalendarDate(d, calendarMaps)) return;
      if (!isScheduledByOfficialTime(row)) return;
      if (getOfficialSchedWorkSec(row) == null) return;
      if (hasNoPunchesTimeInOutOnly(row)) return;
      const morning = hasMorningPunchTimeInOnly(row);
      const afternoon = hasAfternoonPunchTimeOutOnly(row);
      if (morning === afternoon) return;
      if (d && d.length >= 8) dates.push(d);
    });
    return [...new Set(dates)].sort();
  }

  function listAbsentDatesFromDailyRows_TimeInOutOnly(rows, calendarMaps) {
    const dates = [];
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const d = String(row?.date ?? '').trim().slice(0, 10);
      if (calendarMaps && isExcludedAttendanceCalendarDate(d, calendarMaps)) return;
      if (!isScheduledByOfficialTime(row)) return;
      if (getOfficialSchedWorkSec(row) == null) return;
      if (!hasNoPunchesTimeInOutOnly(row)) return;
      if (d && d.length >= 8) dates.push(d);
    });
    return [...new Set(dates)].sort();
  }

  // ─── Grace period constant ─────────────────────────────────────────────────
  const GRACE_PERIOD_MS = 15 * 60 * 1000;

  const truncateMsToMinutes = (ms) => Math.floor(Math.max(0, ms) / 60000) * 60000;

  const formatDurationMsNoSeconds = (ms) => {
    if (!Number.isFinite(ms)) return '00:00:00';
    const truncated = truncateMsToMinutes(ms);
    const totalSeconds = Math.floor(truncated / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':');
  };

  /**
   * Converts a HH:MM:SS tardiness string into a human-readable "Xd Yh Zm" format.
   * For the 30hrs faculty module: 6 hours = 1 day.
   */
  const formatTardinessAsDaysHours = (hhmmss) => {
    if (!hhmmss || hhmmss === '00:00:00') return '0m';
    const parts = String(hhmmss).split(':').map(Number);
    const totalMinutes = (parts[0] || 0) * 60 + (parts[1] || 0);
    if (totalMinutes === 0) return '0m';
    const totalHours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const days = Math.floor(totalHours / 6);
    const hrs = totalHours % 6;
    let out = '';
    if (days > 0) out += `${days}d `;
    if (hrs > 0) out += `${hrs}h `;
    if (mins > 0) out += `${mins}m`;
    return out.trim();
  };

  const tardinessMsFromLateFloorEarlyCeil = (lateRawMs, earlyRawMs) => {
    const lateMs = truncateMsToMinutes(lateRawMs);
    const earlyMs = earlyRawMs <= 0 ? 0 : Math.ceil(earlyRawMs / 60000) * 60000;
    return lateMs + earlyMs;
  };

  // ─── Tab definitions ───────────────────────────────────────────────────────
  const VIEW_TABS = [
    { key: 'regular',       label: 'Regular Time',  icon: <Schedule sx={{ fontSize: 14 }} /> },
    { key: 'honorarium',    label: 'Honorarium',     icon: <Star sx={{ fontSize: 14 }} /> },
    { key: 'serviceCredit', label: 'Service Credit', icon: <CreditScore sx={{ fontSize: 14 }} /> },
    { key: 'overtime',      label: 'Overtime',       icon: <AccessTime sx={{ fontSize: 14 }} /> },
  ];

  const TAB_COLUMNS = {
    regular: [
      { label: 'Date',              key: 'date',            minWidth: 130, group: 'meta' },
      { label: 'Day',               key: 'day',             minWidth: 80,  group: 'meta' },
      { label: 'Time IN',           key: 'timeIN',          minWidth: 140, group: 'actual' },
      { label: 'Time OUT',          key: 'timeOUT',         minWidth: 140, group: 'actual' },
      { label: 'Official Time IN',  key: 'officialTimeIN',  minWidth: 150, group: 'official' },
      { label: 'Official Time OUT', key: 'officialTimeOUT', minWidth: 150, group: 'official' },
      { label: 'Total Rendered',    key: '_rendered',       minWidth: 130, group: 'calc' },
      { label: 'Total Tardiness',   key: '_tardiness',      minWidth: 130, group: 'tard' },
    ],
    honorarium: [
      { label: 'Date',                 key: 'date',                      minWidth: 130, group: 'meta' },
      { label: 'Day',                  key: 'day',                       minWidth: 80,  group: 'meta' },
      { label: 'Time IN',              key: '_hnTimeIN',                 minWidth: 140, group: 'actual' },
      { label: 'Time OUT',             key: '_hnTimeOUT',                minWidth: 140, group: 'actual' },
      { label: 'Official HN Time IN',  key: 'officialHonorariumTimeIN',  minWidth: 150, group: 'official' },
      { label: 'Official HN Time OUT', key: 'officialHonorariumTimeOUT', minWidth: 150, group: 'official' },
      { label: 'HN Rendered',          key: '_hnRendered',               minWidth: 130, group: 'calc' },
      { label: 'HN Tardiness',         key: '_hnTardiness',              minWidth: 130, group: 'tard' },
    ],
    serviceCredit: [
      { label: 'Date',                 key: 'date',                         minWidth: 130, group: 'meta' },
      { label: 'Day',                  key: 'day',                          minWidth: 80,  group: 'meta' },
      { label: 'Time IN',              key: '_scTimeIN',                    minWidth: 140, group: 'actual' },
      { label: 'Time OUT',             key: '_scTimeOUT',                   minWidth: 140, group: 'actual' },
      { label: 'Official SC Time IN',  key: 'officialServiceCreditTimeIN',  minWidth: 150, group: 'official' },
      { label: 'Official SC Time OUT', key: 'officialServiceCreditTimeOUT', minWidth: 150, group: 'official' },
      { label: 'SC Rendered',          key: '_scRendered',                  minWidth: 130, group: 'calc' },
      { label: 'SC Tardiness',         key: '_scTardiness',                 minWidth: 130, group: 'tard' },
    ],
    overtime: [
      { label: 'Date',                key: 'date',               minWidth: 130, group: 'meta' },
      { label: 'Day',                 key: 'day',                minWidth: 80,  group: 'meta' },
      { label: 'Time IN',             key: '_otTimeIN',          minWidth: 140, group: 'actual' },
      { label: 'Time OUT',            key: '_otTimeOUT',         minWidth: 140, group: 'actual' },
      { label: 'Official OT Time IN', key: 'officialOverTimeIN', minWidth: 150, group: 'official' },
      { label: 'Official OT Time OUT',key: 'officialOverTimeOUT',minWidth: 150, group: 'official' },
      { label: 'OT Rendered',         key: '_otRendered',        minWidth: 130, group: 'calc' },
      { label: 'OT Tardiness',        key: '_otTardiness',       minWidth: 130, group: 'tard' },
    ],
  };

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

  const getHalfDayShortfallTimeInOutOnly = (row) => {
    if (!row || !isScheduledByOfficialTime(row) || hasNoPunchesTimeInOutOnly(row)) return null;
    const morning = hasMorningPunchTimeInOnly(row);
    const afternoon = hasAfternoonPunchTimeOutOnly(row);
    if (morning === afternoon) return null;
    const schedWorkSec = getOfficialSchedWorkSec(row);
    if (schedWorkSec == null) return null;
    const renderedSec = Math.floor(schedWorkSec / 2);
    return formatOfficialAttendanceSeconds(Math.max(0, schedWorkSec - renderedSec));
  };

  // ─── getCellValue ──────────────────────────────────────────────────────────
  /** @param {Record<string, string> | null} [tardOverrides] HR edits for Regular Time tardiness (per date). */
  /** @param {Record<string, object> | null} [reviewByDate] Half-day HR review by date. */
  const getCellValue = (row, colKey, isFurlough = false, tardOverrides = null, reviewByDate = null) => {
    const NA = '00:00:00';
    const isNA = (v) => !v || v === '00:00:00 AM' || v === '00:00:00 PM' || v === '00:00:00';
    if (!isFurlough && row?.date && tardOverrides?.[row.date] != null && String(tardOverrides[row.date]).trim() !== '' && colKey === '_tardiness') {
      const n = normalizeDurationInput(tardOverrides[row.date]);
      if (n) return n;
    }
    const getSpecialTime = (expectedType, timeField) => {
      if (row.specialType === expectedType && row[timeField]) return row[timeField];
      return NA;
    };
    switch (colKey) {
      // Regular tab virtual keys
      case '_rendered':
        return getRowTotalRenderedDisplay(
          row,
          reviewByDate,
          MODULE_TYPES.FACULTY_30HRS,
          isFurlough,
        );
      case '_tardiness':
        if (isFurlough) return '00:00:00';
        {
          const d = normalizeReviewDate(row?.date);
          const entry = reviewByDate?.[d];
          const fallback =
            !row.officialTimeIN ||
            !row.timeOUT ||
            row.formattedfinalcalcFaculty === 'NaN:NaN:NaN'
              ? row.formattedFacultyMaxRenderedTime
              : row.formattedfinalcalcFaculty;
          return getRowTotalTardinessDisplay(
            row,
            reviewByDate,
            MODULE_TYPES.FACULTY_30HRS,
            isFurlough,
            fallback,
          );
        }
      // Honorarium
      case '_hnTimeIN':
        return isNA(row.officialHonorariumTimeIN) ? NA : getSpecialTime('HONORARIUM', 'specialTimeIN');
      case '_hnTimeOUT':
        return isNA(row.officialHonorariumTimeOUT) ? NA : getSpecialTime('HONORARIUM', 'specialTimeOUT');
      case '_hnRendered':
        if (isFurlough) return !row.formattedFacultyMaxRenderedTimeHN || row.formattedFacultyMaxRenderedTimeHN === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyMaxRenderedTimeHN;
        return isNA(row.officialHonorariumTimeIN) || isNA(row.officialHonorariumTimeOUT) || row.formattedFacultyRenderedTimeHN === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyRenderedTimeHN;
      case '_hnTardiness':
        if (isFurlough) return '00:00:00';
        return isNA(row.officialHonorariumTimeIN) || isNA(row.officialHonorariumTimeOUT) || row.formattedfinalcalcFacultyHN === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedfinalcalcFacultyHN;
      // Service Credit
      case '_scTimeIN':
        return isNA(row.officialServiceCreditTimeIN) ? NA : getSpecialTime('SERVICE', 'specialTimeIN');
      case '_scTimeOUT':
        return isNA(row.officialServiceCreditTimeOUT) ? NA : getSpecialTime('SERVICE', 'specialTimeOUT');
      case '_scRendered':
        if (isFurlough) return !row.formattedFacultyMaxRenderedTimeSC || row.formattedFacultyMaxRenderedTimeSC === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyMaxRenderedTimeSC;
        return isNA(row.officialServiceCreditTimeIN) || isNA(row.officialServiceCreditTimeOUT) || row.formattedFacultyRenderedTimeSC === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyRenderedTimeSC;
      case '_scTardiness':
        if (isFurlough) return '00:00:00';
        return isNA(row.officialServiceCreditTimeIN) || isNA(row.officialServiceCreditTimeOUT) || row.formattedfinalcalcFacultySC === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedfinalcalcFacultySC;
      // Overtime
      case '_otTimeIN':
        return isNA(row.officialOverTimeIN) ? NA : getSpecialTime('OVERTIME', 'specialTimeIN');
      case '_otTimeOUT':
        return isNA(row.officialOverTimeOUT) ? NA : getSpecialTime('OVERTIME', 'specialTimeOUT');
      case '_otRendered':
        if (isFurlough) return !row.formattedFacultyMaxRenderedTimeOT || row.formattedFacultyMaxRenderedTimeOT === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyMaxRenderedTimeOT;
        return isNA(row.officialOverTimeIN) || isNA(row.officialOverTimeOUT) || row.formattedFacultyRenderedTimeOT === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyRenderedTimeOT;
      case '_otTardiness':
        if (isFurlough) return '00:00:00';
        return isNA(row.officialOverTimeIN) || isNA(row.officialOverTimeOUT) || row.formattedfinalcalcFacultyOT === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedfinalcalcFacultyOT;
      // Passthrough official fields
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

  /** Regular Time: system tardiness + optional HR override (same row shape as NonTeaching editable cell). */
  const EditableRegularTardinessCell = ({
    row,
    isFurlough,
    isEven,
    storedOverride,
    onCommit,
    onInvalid,
    halfDayReviewByDate = null,
    reviewLocked = false,
  }) => {
    const systemVal = canonicalTardDisplay(getCellValue(row, '_tardiness', isFurlough, null, halfDayReviewByDate));
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
          disabled={reviewLocked}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={applyBlur}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
            placeholder={systemVal}
            disabled={isFurlough}
            inputProps={{
              'aria-label': 'Regular time tardiness',
              sx: { fontFamily: T.recordFont, fontSize: '0.78rem', textAlign: 'center', py: 0.65 },
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end" sx={{ ml: 0 }}>
                  <Tooltip title="Use system calculation" placement="top" arrow>
                    <span>
                      <IconButton
                        size="small"
                        aria-label="Use system calculation"
                        disabled={isFurlough}
                        onClick={() => { onCommit(null); setLocal(systemVal); }}
                        sx={{ p: 0.35, color: T.accentMid }}
                      >
                        <RestartAlt sx={{ fontSize: 17 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: 1, bgcolor: '#fff', fontSize: '0.78rem' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder },
            }}
          />
          {hasAdjusted && !isFurlough && (
            <Typography sx={{ fontSize: '0.58rem', color: T.muted, textAlign: 'center', lineHeight: 1.2 }}>
              System: {systemVal}
            </Typography>
          )}
        </Box>
      </TableCell>
    );
  };

  // ─── Floating Totals Bar (unified style matching NonTeaching) ─────────────
  const FloatingTotalsBar = ({ totals, visible, onSave, saving, activeTab, startDate, endDate }) => {
    const [expanded, setExpanded] = useState(true);
    if (!visible) return null;

    const allItems = [
      { label: 'Absent Days',         value: String(Number.isFinite(Number(totals.absentDays)) ? Number(totals.absentDays) : 0), style: T.absent,    accent: true },
      { label: 'Half Days',           value: String(Number.isFinite(Number(totals.halfDays))   ? Number(totals.halfDays)   : 0), style: T.halfDay, accent: true },
      { label: 'Late Total',          value: totals.lateTotalTime || '00:00:00',                                             style: T.tardiness, accent: true },
      { label: 'Overall Rendered',    value: totals.regularRendered  || '00:00:00',                                              style: T.rendered,  accent: true },
      { label: 'Overall Tardiness',   value: formatTardinessAsDaysHours(totals.regularTardiness || '00:00:00'),                  style: T.tardiness, accent: true },
      { label: 'HN Rendered',         value: totals.hnRendered       || '00:00:00' },
      { label: 'HN Tardiness',        value: totals.hnTardiness      || '00:00:00' },
      { label: 'SC Rendered',         value: totals.scRendered       || '00:00:00' },
      { label: 'SC Tardiness',        value: totals.scTardiness      || '00:00:00' },
      { label: 'OT Rendered',         value: totals.otRendered       || '00:00:00' },
      { label: 'OT Tardiness',        value: totals.otTardiness      || '00:00:00' },
    ];

    return (
      <Box sx={{ width: '100%' }}>
        <Paper elevation={8} sx={{
          borderRadius: '12px', overflow: 'hidden', width: '100%',
          border: `1px solid ${T.accentBorder}`, bgcolor: '#fff', mt: 2, mb: 2,
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        }}>
          {/* Bar header */}
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
              <Box
                onClick={(e) => { e.stopPropagation(); if (!saving) onSave(); }}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.75,
                  px: 1.5, py: 0.6, borderRadius: '8px',
                  border: `1px solid ${T.accentBorder}`, bgcolor: '#fff',
                  cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                  '&:hover': saving ? {} : { bgcolor: T.accentFaint, borderColor: T.accent },
                }}
              >
                {saving
                  ? <CircularProgress size={14} thickness={5} sx={{ color: T.accent }} />
                  : <SaveAs sx={{ color: T.accent, fontSize: 16 }} />
                }
                <Typography sx={{ fontSize: '0.74rem', fontWeight: 700, color: T.accent }}>
                  {saving ? 'Saving…' : 'Save to summary'}
                </Typography>
              </Box>
              {expanded
                ? <ExpandMore sx={{ fontSize: 16, color: T.muted }} />
                : <ExpandLess sx={{ fontSize: 16, color: T.muted }} />
              }
            </Box>
          </Box>

          <Collapse in={expanded}>
            <Box sx={{ px: 1.5, py: 1.25, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {allItems.map(({ label, value, style, accent }) => {
                const isTardLabel = label.includes('Tardiness');
                const isActive = (
                  (activeTab === 'regular' && (label === 'Overall Rendered' || label === 'Overall Tardiness' || label === 'Absent Days' || label === 'Half Days' || label === 'Late Total')) ||
                  (activeTab === 'honorarium' && (label === 'HN Rendered' || label === 'HN Tardiness')) ||
                  (activeTab === 'serviceCredit' && (label === 'SC Rendered' || label === 'SC Tardiness')) ||
                  (activeTab === 'overtime' && (label === 'OT Rendered' || label === 'OT Tardiness'))
                );
                return (
                  <Box key={label} sx={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    px: 1.5, py: 0.75, borderRadius: '6px',
                    border: `1px solid ${accent ? style.border : isActive ? T.accentBorder : T.divider}`,
                    bgcolor: accent ? style.bg : isActive ? T.accentFaint : '#fafafa',
                    minWidth: 90,
                    transform: isActive && !accent ? 'translateY(-1px)' : 'none',
                    boxShadow: isActive && !accent ? `0 2px 8px ${alpha(T.accent, 0.12)}` : 'none',
                    transition: 'all 0.2s ease',
                  }}>
                    <Typography sx={{
                      fontSize: '0.6rem', fontWeight: 700,
                      color: accent ? style.color : isActive ? T.accent : T.faint,
                      letterSpacing: '0.05em', textTransform: 'uppercase', mb: 0.2,
                    }}>
                      {label}
                    </Typography>
                    {label === 'Overall Tardiness' ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.1 }}>
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: style.color, fontFamily: T.recordFont }}>
                          {value}
                        </Typography>
                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 500, color: alpha(style.color, 0.55), fontFamily: T.recordFont }}>
                          {totals.regularTardiness || '00:00:00'}
                        </Typography>
                      </Box>
                    ) : label === 'Absent Days' ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.1 }}>
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: style.color, fontFamily: T.recordFont }}>
                          {value}
                        </Typography>
                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: alpha(style.color, 0.6), fontFamily: T.recordFont }}>
                          {totals.absentTime || '00:00:00'}
                        </Typography>
                      </Box>
                    ) : label === 'Half Days' ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.1 }}>
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: style.color, fontFamily: T.recordFont }}>
                          {value}
                        </Typography>
                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: alpha(style.color, 0.6), fontFamily: T.recordFont }}>
                          {totals.halfDayShortfallTime || '00:00:00'}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography sx={{
                        fontSize: '0.82rem', fontWeight: 700,
                        color: accent ? style.color : isActive ? T.accent : T.muted,
                        fontFamily: T.recordFont,
                      }}>
                        {value}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Collapse>
        </Paper>
      </Box>
    );
  };

  // ─── Styled Modal ──────────────────────────────────────────────────────────
  const StyledModal = ({ open, onClose, title, message, type = 'info', onConfirm, showCancel = false, confirmLabel = null }) => {
    const typeConfig = {
      success: { icon: <CheckCircleIcon sx={{ fontSize: 26, color: '#2e7d32' }} />, avatarBg: 'rgba(46,125,50,0.12)', label: 'Success', labelColor: '#2e7d32' },
      warning: { icon: <WarningIcon sx={{ fontSize: 26, color: '#92400e' }} />,      avatarBg: 'rgba(146,64,14,0.12)',  label: 'Warning', labelColor: '#92400e' },
      error:   { icon: <ErrorIcon sx={{ fontSize: 26, color: '#991b1b' }} />,        avatarBg: 'rgba(153,27,27,0.12)', label: 'Error',   labelColor: '#991b1b' },
      info:    { icon: <InfoIcon sx={{ fontSize: 26, color: T.accent }} />,          avatarBg: T.accentFaint,          label: 'Notice',  labelColor: T.accent  },
    };
    const cfg = typeConfig[type] || typeConfig.info;
    const lines = message.split('\n').map((l) => l.trim()).filter(Boolean);
    const isListItem = (l) => l.startsWith('•') || l.startsWith('-') || /^\d{5,}/.test(l) || /^Employee\s+\d/.test(l);
    const isNote = (l) => /^(contact|please|this action|note:|important)/i.test(l);

    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '12px', overflow: 'hidden', border: `0.5px solid rgba(0,0,0,0.09)`, bgcolor: '#fff' } }}>
        <Box sx={{ px: 3, py: 3, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle,${alpha(T.accent, 0.1)} 0%,transparent 70%)`, pointerEvents: 'none' }} />
          <IconButton size="small" onClick={onClose}
            sx={{ position: 'absolute', top: 12, right: 12, color: T.accent, opacity: 0.45, '&:hover': { opacity: 1, bgcolor: T.accentFaint } }}>
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
            onMouseEnter={(e) => { e.currentTarget.style.background = T.accentDark; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = T.accent; }}>
            {confirmLabel || (showCancel ? 'Confirm' : 'OK')}
          </button>
        </Box>
      </Dialog>
    );
  };

  // ─── Main Component ────────────────────────────────────────────────────────
  const AttendanceModuleFaculty = () => {
    const [suspensionByDate, setSuspensionByDate] = useState({});
    const [leaveByDate, setLeaveByDate] = useState({});
    const [holidayByDate, setHolidayByDate] = useState({});
    const { settings } = useSystemSettings();
    const [employeeNumber, setEmployeeNumber] = useState('');
    const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [attendanceData, setAttendanceData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showNoOfficialTimeModal, setShowNoOfficialTimeModal] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('regular');
    const [showScrollTop, setShowScrollTop] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    /** Per-date HR override for Regular Time tardiness only; cleared on new search. */
    const [tardinessOverrides, setTardinessOverrides] = useState({});
    const [halfDayReviewByDate, setHalfDayReviewByDate] = useState({});
    const [halfDayReviewDialog, setHalfDayReviewDialog] = useState(null);

    const resultsRef = useRef(null);

    const { hasAccess, loading: accessLoading } = usePageAccess('attendance-module-faculty');

    const currentYear = new Date().getFullYear();
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [snackbarCountdown, setSnackbarCountdown] = useState(6);
    const showSnackbar = (message, severity = 'success') => { setSnackbar({ open: true, message, severity }); setSnackbarCountdown(6); };
    const handleCloseSnackbar = () => setSnackbar((p) => ({ ...p, open: false }));

    const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'info', onConfirm: null, showCancel: false, confirmLabel: null });
    const showModal = (title, message, type = 'info', onConfirm = null, showCancel = false, confirmLabel = null) =>
      setModal({ open: true, title, message, type, onConfirm, showCancel, confirmLabel });
    const closeModal = () => setModal((p) => ({ ...p, open: false, confirmLabel: null }));

    const [compareOpen, setCompareOpen] = useState(false);
    const [pendingSavedOverall, setPendingSavedOverall] = useState(null);
    const [pendingProposedOverall, setPendingProposedOverall] = useState(null);

    useEffect(() => {
      let timer;
      if (snackbar.open && snackbarCountdown > 0) timer = setInterval(() => setSnackbarCountdown((p) => p - 1), 1000);
      return () => clearInterval(timer);
    }, [snackbar.open, snackbarCountdown]);

    useEffect(() => { if (!accessLoading) setPageLoading(false); }, [accessLoading]);

    useEffect(() => {
      const en = localStorage.getItem('attendanceFaculty30EmployeeNumber');
      const sd = localStorage.getItem('attendanceFaculty30StartDate');
      const ed = localStorage.getItem('attendanceFaculty30EndDate');
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

    useEffect(() => {
      const s = location.state;

      if (!s?.fromDevice) return;

      setEmployeeNumber(s.employeeNumber || '');
      setStartDate(s.startDate || '');
      setEndDate(s.endDate || '');

      setTimeout(() => {
        if (handleSubmitRef.current) handleSubmitRef.current();
      }, 300);
    }, [location.state]);

    const isFurloughDate = (date, suspMap, leaveMap, holidayMap) =>
      Boolean(suspMap?.[date] || leaveMap?.[date] || holidayMap?.[date]);

    const handleSubmit = async () => {
      localStorage.setItem('attendanceFaculty30EmployeeNumber', employeeNumber);
      localStorage.setItem('attendanceFaculty30StartDate', startDate);
      localStorage.setItem('attendanceFaculty30EndDate', endDate);
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        const [deviceRows, maps] = await Promise.all([
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
        ]);
        if (deviceRows.length === 0) {
          setAttendanceData([]);
          setSuspensionByDate({});
          setLeaveByDate({});
          setHolidayByDate({});
          showModal(
            'No Device Records Found',
            'No biometric device records were found for this employee within the selected date range.\n\nPlease verify the employee number and date range, or check if the attendance device has synced.\n\nPress OK to open Attendance Device.',
            'warning',
            () => { closeModal(); navigate('/view_attendance'); },
          );
          return;
        }

        const response = await axios.get(
          `${API_BASE_URL}/attendance/api/attendance`,
          { params: { personId: employeeNumber, startDate, endDate }, ...getAuthHeaders() },
        );
        const rawRows = Array.isArray(response.data) ? response.data : [];
        if (rawRows.length === 0) {
          setAttendanceData([]);
          setSuspensionByDate({});
          setLeaveByDate({});
          setHolidayByDate({});
          showModal(
            'No Official Time Schedule',
            `Device records were found for this employee (${deviceRows.length} day${deviceRows.length !== 1 ? 's' : ''}), but no matching attendance/official schedule rows exist for this period.\n\nPlease set up the official time schedule in the Official Time Management module before generating attendance records.\n\nPress OK to open Official Time Management.`,
            'warning',
            () => { closeModal(); navigate('/official_time'); },
          );
          return;
        }
        const dateOnly = (val) => (val ? String(val).split('T')[0] : '');
        const byDateRange = rawRows.filter((row) => {
          const d = dateOnly(row.date), start = dateOnly(row.startDate), end = dateOnly(row.endDate);
          if (!d) return true;
          if (!start || !end) return true;
          return d >= start && d <= end;
        });
        const seen = new Set();
        const onePerDate = byDateRange.filter((row) => {
          const d = dateOnly(row.date);
          if (seen.has(d)) return false;
          seen.add(d);
          return true;
        });
        const hasOfficialTime = onePerDate.some(
          (row) => row.officialTimeIN && row.officialTimeOUT && row.officialTimeIN !== '00:00:00 AM' && row.officialTimeOUT !== '00:00:00 AM',
        );
        if (onePerDate.length === 0) {
          setAttendanceData([]);
          setSuspensionByDate({});
          setLeaveByDate({});
          setHolidayByDate({});
          showModal(
            'No Official Time Schedule',
            `Device records were found for this employee (${deviceRows.length} day${deviceRows.length !== 1 ? 's' : ''}), but no rows remained after filtering for this period.\n\nPlease verify official time and date range.\n\nPress OK to open Official Time Management.`,
            'warning',
            () => { closeModal(); navigate('/official_time'); },
          );
          return;
        }
        if (!hasOfficialTime) { setShowNoOfficialTimeModal(true); return; }

        const processedData = onePerDate.map((row) => {
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

          const { displayBreaktimeIN, displayBreaktimeOUT } =
            applyFacultyPunchGatedBreaktimes({
              timeIN,
              timeOUT,
              breaktimeIN,
              breaktimeOUT,
              officialBreaktimeIN,
              officialBreaktimeOUT,
            });
          const startDateFaculty = new Date(`01/01/2000 ${timeIN}`);
          const endDateFaculty = new Date(`01/01/2000 ${timeOUT}`);
          const startOfficialTimeFaculty = new Date(`01/01/2000 ${officialTimeIN}`);
          const endOfficialTimeFaculty = new Date(`01/01/2000 ${officialTimeOUT}`);
          const midnightFaculty = new Date(`01/01/2000 00:00:00 AM`);
          const timeinfaculty =
            startDateFaculty > endOfficialTimeFaculty
              ? midnightFaculty
              : startDateFaculty < startOfficialTimeFaculty
                ? startOfficialTimeFaculty
                : startDateFaculty;
          const timeoutfaculty =
            timeinfaculty === midnightFaculty
              ? midnightFaculty
              : endDateFaculty < endOfficialTimeFaculty
                ? endDateFaculty
                : endOfficialTimeFaculty;
          const diffMs = timeoutfaculty - timeinfaculty;
          const diffMsFaculty = endOfficialTimeFaculty - startOfficialTimeFaculty;
          const formattedFacultyRenderedTime = formatDurationMsNoSeconds(diffMs);
          const formattedFacultyMaxRenderedTime = formatDurationMsNoSeconds(diffMsFaculty);
          const isMidnightEdge = timeinfaculty.getTime() === midnightFaculty.getTime();
          const lateRawMs = isMidnightEdge ? 0 : Math.max(0, timeinfaculty - startOfficialTimeFaculty);
          const earlyRawMs = isMidnightEdge ? 0 : Math.max(0, endOfficialTimeFaculty - timeoutfaculty);
          const formattedfinalcalcFaculty = formatDurationMsNoSeconds(
            tardinessMsFromLateFloorEarlyCeil(lateRawMs, earlyRawMs),
          );

          const calcSeg = (tIn, tOut, offIn, offOut) => {
            const s = new Date(`01/01/2000 ${tIn}`);
            const e = new Date(`01/01/2000 ${tOut}`);
            const os = new Date(`01/01/2000 ${offIn}`);
            const oe = new Date(`01/01/2000 ${offOut}`);
            const mid = new Date(`01/01/2000 00:00:00 AM`);
            const msToHHMMSS = (ms) => formatDurationMsNoSeconds(ms);
            if (os.getTime() === mid.getTime() || oe.getTime() === mid.getTime())
              return { rendered: '00:00:00', maxRendered: '00:00:00', tardiness: '00:00:00' };
            if (!tIn || !tOut || isNaN(s.getTime()) || isNaN(e.getTime()))
              return { rendered: '00:00:00', maxRendered: msToHHMMSS(oe - os), tardiness: msToHHMMSS(oe - os) };
            const isWithinGrace = s > os && s - os <= GRACE_PERIOD_MS;
            const effectiveStart = isWithinGrace ? os : s;
            const clampedStart = effectiveStart > os ? effectiveStart : os;
            const clampedEnd = e < oe ? e : oe;
            const diffMs = clampedEnd > clampedStart ? clampedEnd - clampedStart : 0;
            const offDiffMs = oe - os;
            const lateRawMs = clampedStart > os ? clampedStart - os : 0;
            const earlyRawMs = clampedEnd < oe ? oe - clampedEnd : 0;
            const tardMs = tardinessMsFromLateFloorEarlyCeil(lateRawMs, earlyRawMs);
            return { rendered: msToHHMMSS(diffMs), maxRendered: msToHHMMSS(offDiffMs), tardiness: msToHHMMSS(tardMs) };
          };

          const hnTIn  = row.specialType === 'HONORARIUM' && row.specialTimeIN  ? row.specialTimeIN  : timeIN;
          const hnTOut = row.specialType === 'HONORARIUM' && row.specialTimeOUT ? row.specialTimeOUT : timeOUT;
          const scTIn  = row.specialType === 'SERVICE'    && row.specialTimeIN  ? row.specialTimeIN  : timeIN;
          const scTOut = row.specialType === 'SERVICE'    && row.specialTimeOUT ? row.specialTimeOUT : timeOUT;
          const otTIn  = row.specialType === 'OVERTIME'   && row.specialTimeIN  ? row.specialTimeIN  : timeIN;
          const otTOut = row.specialType === 'OVERTIME'   && row.specialTimeOUT ? row.specialTimeOUT : timeOUT;

          const hn = calcSeg(hnTIn, hnTOut, officialHonorariumTimeIN, officialHonorariumTimeOUT);
          const sc = calcSeg(scTIn, scTOut, officialServiceCreditTimeIN, officialServiceCreditTimeOUT);
          const ot = calcSeg(otTIn, otTOut, officialOverTimeIN, officialOverTimeOUT);

          return {
            ...row,
            breaktimeIN: displayBreaktimeIN,
            breaktimeOUT: displayBreaktimeOUT,
            lateTotal: formattedfinalcalcFaculty,
            undertimeTotal: '00:00:00',
            formattedfinalcalcFaculty,
            formattedFacultyRenderedTime,
            formattedFacultyMaxRenderedTime,
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

        setSuspensionByDate(maps.suspensionByDate);
        setLeaveByDate(maps.leaveByDate);
        setHolidayByDate(maps.holidayByDate);
        setTardinessOverrides({});
        setAttendanceData(processedData);

        const calendarMaps = {
          suspensionByDate: maps.suspensionByDate,
          holidayByDate: maps.holidayByDate,
          leaveByDate: maps.leaveByDate,
        };
        let reviewMap = {};
        try {
          const stored = await fetchDailyLateUndertime(employeeNumber, startDate, endDate);
          reviewMap = migrateLegacyHalfDayReview(
            buildReviewByDate(parseHalfDayReviewJson(stored.half_day_review)),
            stored.halfDayDates,
            processedData,
            MODULE_TYPES.FACULTY_30HRS,
            calendarMaps,
          );
        } catch {
          reviewMap = migrateLegacyHalfDayReview(
            {},
            '',
            processedData,
            MODULE_TYPES.FACULTY_30HRS,
            calendarMaps,
          );
        }
        setHalfDayReviewByDate(reviewMap);
        const approvedSet = getApprovedHalfDayDatesSet(reviewMap);
        persistDailyLateUndertimeFromModule({
          personID: employeeNumber,
          startDate,
          endDate,
          moduleType: 'FACULTY_30HRS',
          rows: buildDailyLateUndertimeRows(
            processedData,
            approvedSet,
            reviewMap,
            MODULE_TYPES.FACULTY_30HRS,
          ),
          halfDayDates: [...approvedSet].join(', '),
          half_day_review: buildHalfDayReviewArray(reviewMap),
        });

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
          module: ATTENDANCE_AUDIT_MODULES.FACULTY_30HRS,
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
      } catch (err) {
        console.error('Error fetching attendance data:', err);
        const msg = 'Failed to fetch attendance data. Please try again.';
        setError(msg);
        showSnackbar(msg, 'error');
      } finally {
        setLoading(false);
      }
    };

    // ── Status helpers ────────────────────────────────────────────────────────
    const getStatusLabelForDate = useCallback(
      (date) => getLeaveStatusLabelForDate(date, { suspensionByDate, holidayByDate, leaveByDate }),
      [suspensionByDate, holidayByDate, leaveByDate],
    );

    const commitTardinessOverride = useCallback((date, normalizedOrNull) => {
      setTardinessOverrides((prev) => {
        const row = attendanceData.find((r) => r.date === date);
        if (!row) return prev;
        const f = Boolean(getStatusLabelForDate(date));
        const sys = canonicalTardDisplay(getCellValue(row, '_tardiness', f, null, halfDayReviewByDate));
        const next = { ...prev };
        if (normalizedOrNull == null || normalizedOrNull === sys) {
          delete next[date];
        } else {
          next[date] = normalizedOrNull;
        }
        return next;
      });
    }, [attendanceData, getStatusLabelForDate, halfDayReviewByDate]);

    const getStatusStyle = (label) => {
      if (label === 'WORK SUSPENDED') return { bgcolor: alpha('#d32f2f', 0.12), color: '#d32f2f', border: `1px solid ${alpha('#d32f2f', 0.4)}` };
      if (label === 'HOLIDAY')        return { bgcolor: alpha('#f57c00', 0.12), color: '#f57c00', border: `1px solid ${alpha('#f57c00', 0.4)}` };
      if (label === 'ON LEAVE')       return { bgcolor: alpha('#2e7d32', 0.12), color: '#2e7d32', border: `1px solid ${alpha('#2e7d32', 0.4)}` };
      return {};
    };

    // ── Totals ────────────────────────────────────────────────────────────────
    const sumTimeRows = useCallback((rows, getTime) => {
      let totalSeconds = 0;
      rows.forEach((row) => {
        const t = getTime(row) || '00:00:00';
        const [h, m] = t.split(':').map(Number);
        if (!isNaN(h)) totalSeconds += h * 3600 + m * 60;
      });
      const hh = Math.floor(totalSeconds / 3600),
        mm = Math.floor((totalSeconds % 3600) / 60),
        ss = totalSeconds % 60;
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    }, []);

    const totals = React.useMemo(() => {
      if (!attendanceData.length) return {};
      const calendarMaps = { suspensionByDate, holidayByDate, leaveByDate };
      const buckets = computeReviewAwareAbsenceBuckets(
        attendanceData,
        halfDayReviewByDate,
        calendarMaps,
        MODULE_TYPES.FACULTY_30HRS,
      );
      const regularRendered = sumTimeRows(attendanceData, (row) => {
        const isFurlough = Boolean(getStatusLabelForDate(row.date));
        if (isFurlough) return !row.formattedFacultyMaxRenderedTime || row.formattedFacultyMaxRenderedTime === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyMaxRenderedTime;
        return !row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTime === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyRenderedTime;
      });
      const regularTardiness = sumTimeRows(attendanceData, (row) => {
        const f = Boolean(getStatusLabelForDate(row.date));
        if (f) return null;
        return getCellValue(row, '_tardiness', f, tardinessOverrides, halfDayReviewByDate);
      });
      const hnRendered = sumTimeRows(attendanceData, (row) => {
        const isFurlough = Boolean(getStatusLabelForDate(row.date));
        if (isFurlough) return !row.formattedFacultyMaxRenderedTimeHN || row.formattedFacultyMaxRenderedTimeHN === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyMaxRenderedTimeHN;
        return !row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeHN === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyRenderedTimeHN;
      });
      const hnTardiness = sumTimeRows(attendanceData, (row) => {
        if (Boolean(getStatusLabelForDate(row.date))) return null;
        return !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyHN === 'NaN:NaN:NaN' ? row.formattedFacultyMaxRenderedTimeHN : row.formattedfinalcalcFacultyHN;
      });
      const scRendered = sumTimeRows(attendanceData, (row) => {
        const isFurlough = Boolean(getStatusLabelForDate(row.date));
        if (isFurlough) return !row.formattedFacultyMaxRenderedTimeSC || row.formattedFacultyMaxRenderedTimeSC === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyMaxRenderedTimeSC;
        return !row.officialTimeSC || !row.timeOUT || row.formattedFacultyRenderedTimeSC === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyRenderedTimeSC;
      });
      const scTardiness = sumTimeRows(attendanceData, (row) => {
        if (Boolean(getStatusLabelForDate(row.date))) return null;
        return !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultySC === 'NaN:NaN:NaN' ? row.formattedFacultyMaxRenderedTimeSC : row.formattedfinalcalcFacultySC;
      });
      const otRendered = sumTimeRows(attendanceData, (row) => {
        const isFurlough = Boolean(getStatusLabelForDate(row.date));
        if (isFurlough) return !row.formattedFacultyMaxRenderedTimeOT || row.formattedFacultyMaxRenderedTimeOT === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyMaxRenderedTimeOT;
        return !row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeOT === 'NaN:NaN:NaN' ? '00:00:00' : row.formattedFacultyRenderedTimeOT;
      });
      const otTardiness = sumTimeRows(attendanceData, (row) => {
        if (Boolean(getStatusLabelForDate(row.date))) return null;
        return !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyOT === 'NaN:NaN:NaN' ? row.formattedFacultyMaxRenderedTimeOT : row.formattedfinalcalcFacultyOT;
      });
      const lateTotalTime = computeLateTotalTimeFromTardiness(
        regularTardiness,
        buckets,
      );

      return {
        absentDays: buckets.absentDays,
        halfDays: buckets.halfDays,
        absentTime: buckets.absentTime,
        halfDayShortfallTime: buckets.halfDayShortfallTime,
        lateTotalTime,
        regularRendered,
        regularTardiness,
        hnRendered,
        hnTardiness,
        scRendered,
        scTardiness,
        otRendered,
        otTardiness,
      };
    }, [attendanceData, sumTimeRows, getStatusLabelForDate, leaveByDate, holidayByDate, suspensionByDate, tardinessOverrides, halfDayReviewByDate]);

    const isAbsentAttendanceRow = useCallback((row) => {
      const d = String(row?.date ?? '').slice(0, 10);
      const calendarMaps = { suspensionByDate, holidayByDate, leaveByDate };
      if (isExcludedAttendanceCalendarDate(d, calendarMaps)) return false;
      if (!isScheduledByOfficialTime(row)) return false;
      return hasNoPunchesTimeInOutOnly(row);
    }, [suspensionByDate, holidayByDate, leaveByDate]);

    const getHalfDayUiStatus = useCallback(
      (row) => {
        const calendarMaps = { suspensionByDate, holidayByDate, leaveByDate };
        return getRowHalfDayUiStatus(
          row,
          halfDayReviewByDate,
          MODULE_TYPES.FACULTY_30HRS,
          calendarMaps,
        );
      },
      [suspensionByDate, holidayByDate, leaveByDate, halfDayReviewByDate],
    );

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
            moduleType: MODULE_TYPES.FACULTY_30HRS,
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
          module: ATTENDANCE_AUDIT_MODULES.FACULTY_30HRS,
          entry,
          computationModuleType: MODULE_TYPES.FACULTY_30HRS,
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
      const approvedSet = getApprovedHalfDayDatesSet(halfDayReviewByDate);
      persistDailyLateUndertimeFromModule({
        personID: employeeNumber,
        startDate,
        endDate,
        moduleType: 'FACULTY_30HRS',
        rows: buildDailyLateUndertimeRows(
          attendanceData,
          approvedSet,
          halfDayReviewByDate,
          MODULE_TYPES.FACULTY_30HRS,
        ),
        halfDayDates: [...approvedSet].join(', '),
        half_day_review: buildHalfDayReviewArray(halfDayReviewByDate),
      });
    }, [halfDayReviewByDate, attendanceData, employeeNumber, startDate, endDate]);

    const getTabTotalsValues = (tab) => {
      switch (tab) {
        case 'regular':       return [totals.regularRendered, totals.regularTardiness];
        case 'honorarium':    return [totals.hnRendered, totals.hnTardiness];
        case 'serviceCredit': return [totals.scRendered, totals.scTardiness];
        case 'overtime':      return [totals.otRendered, totals.otTardiness];
        default:              return [];
      }
    };

    // ── Save ──────────────────────────────────────────────────────────────────
    const navigateToOverallAttendanceSummary = useCallback(() => {
      const en = String(employeeNumber ?? '').trim();
      if (en) localStorage.setItem('employeeNumber', en);
      if (startDate) localStorage.setItem('startDate', startDate);
      if (endDate) localStorage.setItem('endDate', endDate);
      navigate('/attendance_summary', { state: { employeeNumber: en, startDate, endDate } });
    }, [employeeNumber, startDate, endDate, navigate]);

    const buildOverallRecordPayload = () => {
      const calendarMaps = { suspensionByDate, holidayByDate, leaveByDate };
      const approvedSet = getApprovedHalfDayDatesSet(halfDayReviewByDate);
      const dailyRows = buildDailyLateUndertimeRows(
        attendanceData,
        approvedSet,
        halfDayReviewByDate,
        MODULE_TYPES.FACULTY_30HRS,
      );
      return {
      ...(function computeAbsentHalfBuckets() {
        const c = computeReviewAwareAbsenceBuckets(
          attendanceData,
          halfDayReviewByDate,
          calendarMaps,
          MODULE_TYPES.FACULTY_30HRS,
        );
        const absentList = listAbsentDatesFromDailyRows_TimeInOutOnly(attendanceData, calendarMaps);
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
      totalRenderedTimeMorning:             '00:00:00',
      totalRenderedTimeMorningTardiness:    '00:00:00',
      totalRenderedTimeAfternoon:           '00:00:00',
      totalRenderedTimeAfternoonTardiness:  '00:00:00',
      totalRenderedHonorarium:              totals.hnRendered,
      totalRenderedHonorariumTardiness:     totals.hnTardiness,
      totalRenderedServiceCredit:           totals.scRendered,
      totalRenderedServiceCreditTardiness:  totals.scTardiness,
      totalRenderedOvertime:                totals.otRendered,
      totalRenderedOvertimeTardiness:       totals.otTardiness,
      overallRenderedOfficialTime:          totals.regularRendered,
      overallRenderedOfficialTimeTardiness: totals.regularTardiness,
      daily_late_undertime: dailyRows,
      computation_module_type: 'FACULTY_30HRS',
    };
    };

    const putMergedOverall = async (mergedPayload, recordId) => {
      await axios.put(
        `${API_BASE_URL}/attendance/api/overall_attendance_record/${recordId}`,
        mergedPayload,
        getAuthHeaders(),
      );
      showSnackbar('Attendance summary updated from your choices.', 'success');
      navigateToOverallAttendanceSummary();
    };

    const saveOverallAttendance = async () => {
      const record = buildOverallRecordPayload();
      setSaving(true);
      try {
        const dup = await axios.get(
          `${API_BASE_URL}/attendance/api/overall_attendance_record`,
          { params: { personID: employeeNumber, startDate, endDate }, ...getAuthHeaders() },
        );
        const existingList = dup.data?.data || [];
        const { action, existing } = classifyOverallSave(existingList, startDate, endDate, record);
        if (action === 'fill-stub' && existing?.id) {
          await axios.put(`${API_BASE_URL}/attendance/api/overall_attendance_record/${existing.id}`, record, getAuthHeaders());
          showSnackbar('Attendance summary saved.', 'success');
          await persistDailyLateUndertimeFromModule({
            personID: employeeNumber,
            startDate,
            endDate,
            moduleType: 'FACULTY_30HRS',
            rows: record.daily_late_undertime,
            halfDayDates: record.halfDayDates,
            half_day_review: record.half_day_review,
          });
          navigateToOverallAttendanceSummary();
          return;
        }
        if (action === 'duplicate-info') {
          showModal(
            'Duplicate attendance summary',
            `A summary for employee ${employeeNumber} (${startDate} to ${endDate}) already exists and matches these totals.\n\nNothing new will be saved. You can continue to Attendance Summary to review or use payroll routing.`,
            'info',
            () => { closeModal(); navigateToOverallAttendanceSummary(); },
            true,
            'Continue to summary',
          );
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
        showSnackbar(response.data.message || 'Attendance record saved successfully!', 'success');
        await persistDailyLateUndertimeFromModule({
          personID: employeeNumber,
          startDate,
          endDate,
          moduleType: 'FACULTY_30HRS',
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

    const handleSubmitRef = useRef(handleSubmit);
    useEffect(() => { handleSubmitRef.current = handleSubmit; });

    useAttendanceRealtimeRefresh(
      useCallback(() => {
        if (!employeeNumber || !startDate || !endDate) return;
        handleSubmitRef.current();
      }, [employeeNumber, startDate, endDate]),
      { personId: employeeNumber, startDate, endDate, requireDateRange: true, matchMode: 'strict' },
    );

    const handleCompareClose = () => { setCompareOpen(false); setPendingSavedOverall(null); setPendingProposedOverall(null); };

    const handleCompareConfirm = async (choices) => {
      if (!pendingSavedOverall?.id || !pendingProposedOverall) { handleCompareClose(); return; }
      setCompareOpen(false);
      setSaving(true);
      try {
        const merged = mergeOverallPayload({
          savedRow: pendingSavedOverall, proposed: pendingProposedOverall,
          choices, personID: employeeNumber, startDate, endDate,
        });
        await putMergedOverall(merged, pendingSavedOverall.id);
        await persistDailyLateUndertimeFromModule({
          personID: employeeNumber,
          startDate,
          endDate,
          moduleType: 'FACULTY_30HRS',
          rows: merged.daily_late_undertime ?? pendingProposedOverall.daily_late_undertime,
          halfDayDates: merged.halfDayDates,
          half_day_review: merged.half_day_review,
        });
      } catch (err) {
        console.error('Error updating overall attendance:', err);
        showSnackbar(err.response?.data?.message || 'Failed to update attendance record.', 'error');
      } finally {
        setSaving(false);
        setPendingSavedOverall(null);
        setPendingProposedOverall(null);
      }
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
      setAttendanceData([]); setError(''); setSuccess(''); setSelectedMonth(null);
      setTardinessOverrides({});
    };

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    // ── Guards ────────────────────────────────────────────────────────────────
    if (pageLoading || accessLoading) return <AttendanceFacultyWireframe />;
    if (hasAccess === false) return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Attendance Module for Faculty (30 hours). Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );

    const columnSlots = TAB_COLUMNS[activeTab].map((col) => ({ col }));

    const tabTotals = getTabTotalsValues(activeTab);

    const buildTableHead = () => (
      <TableHead>
        <TableRow>
          <HalfDayApproveHeaderCell themeT={T} />
          {columnSlots.map(({ col }) => (
            <TableCell
              key={col.key + '_h'}
              sx={{
                position: 'sticky', top: 0, zIndex: 3,
                bgcolor: T.accent,
                fontWeight: 700, fontSize: '0.65rem',
                letterSpacing: '0.05em', textTransform: 'uppercase',
                color: '#fff', textAlign: 'center',
                px: 1.5,
                pt: 1,
                pb: 1,
                minWidth: col.minWidth || 80,
                borderBottom: `2px solid ${T.accentBorder}`,
                borderRight: `1px solid rgba(255,255,255,0.15)`,
                whiteSpace: 'nowrap',
                verticalAlign: 'bottom',
              }}
            >
              {col.label}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
    );

    // ─── Cell builder ─────────────────────────────────────────────────────────
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

    // ─── Totals row ────────────────────────────────────────────────────────────
    const renderTotalsRow = (label, renderedVal, tardinessVal) => {
      const renderedKeys  = columnSlots.filter((s) => s.col.group === 'calc').map((s) => s.col.key);
      const tardinessKeys = columnSlots.filter((s) => s.col.group === 'tard').map((s) => s.col.key);
      const nonCalcCount  = columnSlots.filter((s) => s.col.group !== 'calc' && s.col.group !== 'tard').length;
      const targetRenderedKey = renderedKeys[renderedKeys.length - 1];
      const targetTardKey     = tardinessKeys[tardinessKeys.length - 1];

      return (
        <TableRow sx={{ bgcolor: '#fafafa', borderTop: `2px solid ${T.accentBorder}` }}>
          <HalfDayApproveTotalsCell themeT={T} />
          {columnSlots.map(({ col }, ci) => {
            if (ci === 0) return (
              <TableCell key={col.key + '_tl'} colSpan={nonCalcCount}
                sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.faint, textAlign: 'right', pr: 2.5, py: 1.25, borderBottom: 'none', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {label}
              </TableCell>
            );
            if (ci < nonCalcCount) return null;
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

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
      <Fade in timeout={400}>
        <Box sx={{
          py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 },
          width: '100vw', maxWidth: '100%',
          position: 'relative', left: '63%', transform: 'translateX(-61%)',
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
                  <Chip label={`${snackbarCountdown}s`} size="small" sx={{ backgroundColor: snackbar.severity === 'success' ? 'rgba(255,255,255,0.3)' : undefined, color: snackbar.severity === 'success' ? '#ffffff' : undefined, fontWeight: 700 }} />
                )}
              </Box>
            </Alert>
          </Snackbar>

          <LoadingOverlay open={loading} message="Fetching attendance records…" />

          {/* ── Page Header ── */}
          <SectionCard sx={{ mb: 2 }}>
            <Box sx={{ px: 4, py: 3, background: 'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.10) 0%,transparent 70%)' }} />
              <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)' }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, position: 'relative', zIndex: 1 }}>
                <WorkHistory sx={{ fontSize: 30, color: T.accent }} />
                <Box>
                  <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.25 }}>
                    Attendance Records (30hrs)
                  </Typography>
                  <Typography sx={{ fontSize: '0.78rem', color: T.accentMid, fontWeight: 600 }}>
                    30hrs · Job Order (JO) Faculty · Generate and review attendance records
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
                <Box sx={{ px: 2, py: 0.6, borderRadius: 5, bgcolor: alpha('#4caf50', 0.12), border: '1px solid rgba(76,175,80,0.25)' }}>
                  <Typography sx={{ fontSize: '0.72rem', color: '#2e7d32', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CheckCircleIcon sx={{ fontSize: 12 }} /> 30hrs | JO
                  </Typography>
                </Box>
                <button onClick={handleSubmit} disabled={!employeeNumber || !startDate || !endDate}
                  style={{ background: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, borderRadius: '8px', padding: '7px 10px', cursor: (!employeeNumber || !startDate || !endDate) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: T.accent, fontSize: '0.75rem', fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.15s', opacity: (!employeeNumber || !startDate || !endDate) ? 0.5 : 1 }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = alpha(T.accent, 0.14); }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = alpha(T.accent, 0.08); }}>
                  <Refresh sx={{ fontSize: 15 }} /> Refresh
                </button>
              </Box>
            </Box>
          </SectionCard>

          {/* ── Alerts ── */}
          <Collapse in={!!error}>
            <Alert severity="error" onClose={() => setError('')} sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.82rem' }}>{error}</Alert>
          </Collapse>
          <Collapse in={!!success}>
            <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.82rem' }}>{success}</Alert>
          </Collapse>

          {/* ── Controls Card ── */}
          <SectionCard sx={{ mb: 2 }}>
            <PanelHeader icon={FilterList} title="Filter Attendance Records" />
            <Box sx={{ px: 2.5, pt: 2, pb: 2.5 }}>
              {/* Input row */}
              <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 160 }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Employee Number</Typography>
                  <EmployeeSearchField
                    value={employeeNumber}
                    onSearchQueryChange={setEmployeeSearchQuery}
                    onSelectEmployeeNumber={setEmployeeNumber}
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

              {/* Month picker */}
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
                      {yearOptions.map((y) => <MenuItem key={y} value={y} sx={{ fontSize: '0.85rem' }}>{y}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, justifyContent: 'center' }}>
                  {months.map((month, index) => {
                    const sel = selectedMonth === index;
                    return (
                      <button key={month} onClick={() => handleMonthClick(index)}
                        style={{ background: sel ? T.accent : '#fff', border: `1px solid ${sel ? T.accent : T.accentBorder}`, borderRadius: '6px', padding: '7px 14px', cursor: 'pointer', color: sel ? '#fff' : T.accent, fontSize: '0.75rem', fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.15s ease', boxShadow: sel ? `0 2px 8px ${alpha(T.accent, 0.25)}` : 'none', letterSpacing: '0.04em' }}
                        onMouseEnter={(e) => { if (!sel) { e.currentTarget.style.backgroundColor = T.accentFaint; e.currentTarget.style.borderColor = T.accent; } }}
                        onMouseLeave={(e) => { if (!sel) { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = T.accentBorder; } }}>
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
                  color={T.accent} hoverBg={T.accentFaint}
                  disabled={!employeeNumber || !startDate || !endDate || loading}
                  onClick={handleSubmit}
                />
              </Box>
            </Box>
          </SectionCard>

          {/* ── Results Card ── */}
          {attendanceData.length > 0 && (
            <Fade in={!loading} timeout={400}>
              <SectionCard ref={resultsRef} sx={{ mb: 2 }}>
                <PanelHeader
                  icon={Assignment}
                  title={`Records for ${employeeNumber}`}
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
                        onMouseEnter={(e) => { if (activeTab !== key) e.currentTarget.style.backgroundColor = T.accentFaint; }}
                        onMouseLeave={(e) => { if (activeTab !== key) e.currentTarget.style.backgroundColor = 'transparent'; }}>
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
                      <Table
                        sx={{
                          minWidth: columnSlots.reduce((s, { col }) => s + (col.minWidth || 100), 0),
                          borderCollapse: 'collapse',
                        }}
                      >
                        {buildTableHead()}
                        <TableBody>
                          {attendanceData.map((row, index) => {
                            const statusLabel = getStatusLabelForDate(row.date);
                            const isFurlough  = Boolean(statusLabel);
                            const isEven      = index % 2 === 0;

                            const rowIsAbsent = isAbsentAttendanceRow(row);
                            const halfUi = !rowIsAbsent ? getHalfDayUiStatus(row) : null;
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
                                <HalfDayApproveBodyCell
                                  row={row}
                                  halfUi={halfUi}
                                  isEven={isEven}
                                  themeT={T}
                                  rowBorder={rowBorder}
                                  onApproveClick={(r) => openHalfDayDialog(r, 'approve')}
                                  onRejectClick={(r) => openHalfDayDialog(r, 'reject')}
                                />
                                {columnSlots.map(({ col }) => {
                                  if (col.key === 'date') return (
                                    <TableCell
                                      key={col.key}
                                      sx={{
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        color: T.text,
                                        bgcolor: isEven ? '#fff' : T.rowOdd,
                                        borderBottom: `1px solid ${T.divider}`,
                                        borderRight: `1px solid ${T.divider}`,
                                        px: 1.5,
                                        py: 0.9,
                                        whiteSpace: 'nowrap',
                                        textAlign: 'left',
                                        transition: 'background-color 0.12s',
                                      }}
                                    >
                                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.25 }}>
                                        <span>{row.date}</span>
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
                                        {statusLabel && (
                                          <Chip size="small" label={statusLabel}
                                            sx={{ fontWeight: 700, fontSize: '0.62rem', height: 16, mt: 0.3, ...getStatusStyle(statusLabel) }} />
                                        )}
                                      </Box>
                                    </TableCell>
                                  );

                                  if (col.key === 'day') return (
                                    <TableCell key={col.key} sx={{ fontSize: '0.8rem', color: T.muted, bgcolor: isEven ? '#fff' : T.rowOdd, borderBottom: `1px solid ${T.divider}`, borderRight: `1px solid ${T.divider}`, px: 1.5, py: 0.9, textAlign: 'center', transition: 'background-color 0.12s' }}>
                                      {row.day}
                                    </TableCell>
                                  );

                                  if (activeTab === 'regular' && (col.key === 'timeIN' || col.key === 'timeOUT')) {
                                    return (
                                      <React.Fragment key={col.key}>
                                        {buildCell(row[col.key] || '—', col.group, isEven)}
                                      </React.Fragment>
                                    );
                                  }
                                  if (activeTab === 'regular' && (col.key === 'officialTimeIN' || col.key === 'officialTimeOUT')) {
                                    return (
                                      <React.Fragment key={col.key}>
                                        {buildCell(row[col.key] || '—', col.group, isEven)}
                                      </React.Fragment>
                                    );
                                  }

                                  if (activeTab === 'regular' && col.key === '_tardiness') {
                                    return (
                                      <EditableRegularTardinessCell
                                        key={col.key}
                                        row={row}
                                        isFurlough={isFurlough}
                                        isEven={isEven}
                                        storedOverride={tardinessOverrides[row.date]}
                                        halfDayReviewByDate={halfDayReviewByDate}
                                        reviewLocked={getHalfDayUiStatus(row) === 'suggested'}
                                        onCommit={(v) => commitTardinessOverride(row.date, v)}
                                        onInvalid={(msg) => showSnackbar(msg, 'warning')}
                                      />
                                    );
                                  }

                                  const tardOv = activeTab === 'regular' ? tardinessOverrides : null;
                                  return (
                                    <React.Fragment key={col.key}>
                                      {buildCell(getCellValue(row, col.key, isFurlough, tardOv, halfDayReviewByDate), col.group, isEven)}
                                    </React.Fragment>
                                  );
                                })}
                              </TableRow>
                            );
                          })}

                          {/* Totals row */}
                          {renderTotalsRow(
                            `Overall Rendered Time (${startDate} – ${endDate})`,
                            tabTotals[0],
                            tabTotals[1],
                          )}
                        </TableBody>
                      </Table>
                    </Box>
                  </Box>

                  {/* Footer legend */}
                  <Box sx={{ px: 0, pt: 1.5, display: 'flex', gap: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    {[
                      { swatch: { bgcolor: alpha(T.accent, 0.12), border: `1px solid ${alpha(T.accent, 0.3)}` }, label: 'Employee device punch-in/out' },
                      { swatch: { bgcolor: T.rendered.bg, border: `1px solid ${T.rendered.border}` },             label: 'Computed rendered time' },
                      { swatch: { bgcolor: T.tardiness.bg, border: `1px solid ${T.tardiness.border}` },           label: 'Computed tardiness' },
                      { swatch: { bgcolor: 'rgba(109,35,35,0.08)', border: `1px solid ${T.accentBorder}` },         label: 'Regular Time: tardiness is system-calculated and editable (↻ restores system)' },
                      { swatch: { bgcolor: T.halfDay.bg, border: `1px solid ${T.halfDay.border}` }, label: 'Half day highlight' },
                      { swatch: { bgcolor: alpha('#b71c1c', 0.08), border: `1px solid ${alpha('#b71c1c', 0.55)}` }, label: 'Absent highlight' },
                      { swatch: { bgcolor: T.holiday.bg, border: `1px solid ${T.holiday.border}` },               label: 'Holiday' },
                      { swatch: { bgcolor: T.leave.bg, border: `1px solid ${T.leave.border}` },                   label: 'On leave' },
                      { swatch: { bgcolor: T.suspended.bg, border: `1px solid ${T.suspended.border}` },           label: 'Work suspended' },
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

          {/* ── No Official Time Modal ── */}
          <Dialog open={showNoOfficialTimeModal} onClose={() => setShowNoOfficialTimeModal(false)} maxWidth="sm" fullWidth
            PaperProps={{ sx: { borderRadius: '12px', border: '0.5px solid rgba(0,0,0,0.09)' } }}>
            <Box sx={{ px: 3, py: 3, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: alpha('#ff9800', 0.15), width: 48, height: 48 }}>
                <WorkHistory sx={{ fontSize: 24, color: '#ff9800' }} />
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: T.accent }}>No Official Time Schedule</Typography>
                <Typography sx={{ fontSize: '0.74rem', color: T.faint }}>Employee #{employeeNumber}</Typography>
              </Box>
            </Box>
            <Box sx={{ px: 3, py: 2.5, borderTop: `1px solid ${T.divider}` }}>
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2, fontSize: '0.82rem' }}>
                Cannot generate attendance records. This employee needs an official time schedule set up first.
              </Alert>
              <Box sx={{ p: 2, borderRadius: '8px', bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: T.accent }}>
                  Please set up the official time schedule in the Official Time Management module.
                </Typography>
              </Box>
            </Box>
            <Box sx={{ px: 3, py: 2, display: 'flex', gap: 1, justifyContent: 'flex-end', borderTop: `1px solid ${T.divider}` }}>
              <RowBtn icon={null} label="Close" color={T.muted} hoverBg="rgba(0,0,0,0.05)" onClick={() => setShowNoOfficialTimeModal(false)} />
              <button
                onClick={() => { setShowNoOfficialTimeModal(false); navigate('/official_time'); }}
                style={{ background: T.accent, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 20px', fontWeight: 700, fontSize: '0.82rem', fontFamily: 'inherit', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = T.accentDark; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = T.accent; }}>
                Setup Official Time
              </button>
            </Box>
          </Dialog>

          {/* ── Styled Modal ── */}
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

          <OverallAttendanceCompareModal
            open={compareOpen}
            onClose={handleCompareClose}
            onConfirm={handleCompareConfirm}
            savedRow={pendingSavedOverall}
            proposedRecord={pendingProposedOverall}
            fields={OVERALL_COMPARE_FIELD_META}
            title="Compare saved summary vs new totals"
          />

          <HalfDayReviewDialog
            open={Boolean(halfDayReviewDialog)}
            mode={halfDayReviewDialog?.mode}
            row={halfDayReviewDialog?.row}
            moduleType={MODULE_TYPES.FACULTY_30HRS}
            themeT={T}
            onClose={() => setHalfDayReviewDialog(null)}
            onConfirm={commitHalfDayReview}
          />

          {/* ── Scroll to Top FAB ── */}
          <Zoom in={showScrollTop}>
            <Fab size="small" sx={{ position: 'fixed', bottom: 24, right: 45, zIndex: 1000, bgcolor: T.accent, color: '#fff', '&:hover': { bgcolor: T.accentDark }, boxShadow: `0 4px 14px ${alpha(T.accent, 0.35)}` }} onClick={scrollToTop}>
              <KeyboardArrowUp />
            </Fab>
          </Zoom>
        </Box>
      </Fade>
    );
  };
  

  export default AttendanceModuleFaculty;