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
  import useAttendanceWorkflow from '../../hooks/useAttendanceWorkflow';
  import AttendanceWorkflowNav from './AttendanceWorkflowNav';
  import { navigateAttendanceWorkflow } from '../../utils/attendanceWorkflow';
  import {
    seedEmbeddedModuleContext,
    ATTENDANCE_EMBEDDED_ROOT_SX,
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
    countSuggestedHalfDays,
  } from '../../utils/halfDayReview';
  import HalfDayReviewDialog from './HalfDayReviewDialog';
  import { buildDisplayName } from './attendanceModuleEmployeeSearch';
  import {
    HalfDayTotalColumnHeader,
    HalfDayTotalCellContent,
    halfDayTotalColumnVariant,
  } from './HalfDayTotalColumnHints';
  import {
    getHalfDayReviewRowChrome,
  } from './HalfDayApproveCheckboxCell';
  import {
    isExcludedAttendanceCalendarDate,
    isScheduledByOfficialTime,
    isHalfDayByPunchPattern,
    computeOfficialWindowRenderedSec,
  } from '../../utils/officialAttendanceFromDailyRows';
  import {
    ZERO_HM,
    formatDurationHhMm,
    formatDurationMsToHhMm,
    normalizeDurationInput,
    canonicalTardDisplay,
    displayDurationHhMm,
    sumDurationHhMm,
    parseClockToMinuteSec,
    parseDurationToMinuteSec,
    computeFaculty30MinuteBuckets,
    getRowTotalRenderedMinuteDisplay,
    getRowTotalTardinessMinuteDisplay,
    normalizeFacultyRowDurations,
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

  const formatEmployeeFieldValue = (num, name) => {
    const n = String(num || '').trim();
    const nm = String(name || '').trim();
    if (n && nm) return `${n} | ${nm}`;
    return n;
  };

  const FieldInput = styled(TextField)({
    '& .MuiOutlinedInput-root': {
      borderRadius: 8, fontSize: '0.875rem', backgroundColor: '#fff',
      '& fieldset': { borderColor: T.accentBorder },
      '&:hover fieldset': { borderColor: T.accent },
      '&.Mui-focused fieldset': { borderColor: T.accent, borderWidth: 1.5 },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: T.accent },
  });

  const EmployeeSearchField = ({
    value,
    displayName = '',
    onSelectEmployeeNumber,
    onSelectEmployeeName,
    onSearchQueryChange,
    disabled = false,
  }) => {
    const [query, setQuery] = useState(() => formatEmployeeFieldValue(value, displayName));
    const [debouncedQuery, setDebouncedQuery] = useState(value || '');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(0);
    const debounceRef = useRef(null);
    const containerRef = useRef(null);
    const abortRef = useRef(null);
    const listRef = useRef(null);
    const pendingEnterRef = useRef(false);

    useEffect(() => {
      setQuery(formatEmployeeFieldValue(value, displayName));
      setDebouncedQuery(value || '');
    }, [value, displayName]);

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
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : [];
          setResults(list.slice(0, 20));
          setHighlightIndex(0);
        })
        .catch((err) => { if (err?.code === 'ERR_CANCELED') return; setResults([]); })
        .finally(() => setLoading(false));
      return () => controller.abort();
    }, [debouncedQuery, open]);

    useEffect(() => {
      if (!open || !listRef.current) return;
      const el = listRef.current.querySelector(`[data-emp-idx="${highlightIndex}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    }, [highlightIndex, open, results.length]);

    const queueSearch = (nextValue) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => { setDebouncedQuery(nextValue); setOpen(true); }, 220);
    };

    const flushSearch = (nextValue) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      setDebouncedQuery(nextValue);
      setOpen(true);
    };

    const handleSelect = (emp) => {
      if (!emp) return;
      const num = emp?.employeeNumber ? String(emp.employeeNumber) : '';
      const name = buildDisplayName(emp);
      onSelectEmployeeNumber(num);
      onSelectEmployeeName?.(name);
      setQuery(formatEmployeeFieldValue(num, name));
      setDebouncedQuery(num);
      setOpen(false);
      setResults([]);
      onSearchQueryChange?.(num);
    };

    useEffect(() => {
      if (!pendingEnterRef.current || results.length === 0 || loading) return;
      pendingEnterRef.current = false;
      handleSelect(results[highlightIndex] ?? results[0]);
    }, [results, highlightIndex, loading]);

    const handleInputChange = (e) => {
      const next = e.target.value;
      onSelectEmployeeNumber(next);
      onSelectEmployeeName?.('');
      setQuery(next);
      onSearchQueryChange?.(next.trim());
      queueSearch(next);
    };

    const handleClear = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
      setQuery('');
      setDebouncedQuery('');
      setResults([]);
      setOpen(false);
      onSelectEmployeeNumber('');
      onSelectEmployeeName?.('');
      onSearchQueryChange?.('');
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!open) setOpen(true);
        setHighlightIndex((idx) => Math.min(results.length - 1, idx + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((idx) => Math.max(0, idx - 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        flushSearch(query);
        if (results.length > 0) {
          handleSelect(results[highlightIndex] ?? results[0]);
          return;
        }
        pendingEnterRef.current = true;
      }
    };

    return (
      <Box sx={{ position: 'relative', width: '100%' }} ref={containerRef}>
        <FieldInput
          fullWidth size="small" value={query} onChange={handleInputChange} onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
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
              <List dense disablePadding ref={listRef}>
                {results.map((emp, idx) => {
                  const active = idx === highlightIndex;
                  return (
                  <ListItemButton
                    key={emp.employeeNumber}
                    data-emp-idx={idx}
                    selected={active}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    onClick={() => handleSelect(emp)}
                    sx={{
                      py: 1, px: 1.5,
                      borderBottom: `1px solid ${T.divider}`,
                      bgcolor: active ? T.accentFaint : 'transparent',
                      '&:hover': { bgcolor: T.accentFaint },
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                      <Typography sx={{ fontSize: '0.83rem', fontWeight: 700, color: T.text, lineHeight: 1.2 }}>{buildDisplayName(emp)}</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>#{emp.employeeNumber}</Typography>
                    </Box>
                  </ListItemButton>
                  );
                })}
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

      const schedWorkSec = getOfficialSchedWorkMinuteSec(row);
      if (schedWorkSec == null) return;

      if (hasNoPunchesTimeInOutOnly(row)) {
        absentDays += 1;
        absentSecTotal += schedWorkSec;
        return;
      }

      const isHalfDay = isHalfDayByPunchPattern(row);
      if (isHalfDay) halfDays += 1;

      const inSec = parseClockToMinuteSec(row?.timeIN);
      const outSec = parseClockToMinuteSec(row?.timeOUT);

      let renderedSec = 0;
      if (inSec != null && outSec != null && !isHalfDay) {
        renderedSec = Math.max(0, outSec - inSec);
      } else if (isHalfDay) {
        renderedSec = Math.floor(schedWorkSec / 2);
      }

      renderedSecTotal += renderedSec;
      const deficit = Math.max(0, schedWorkSec - renderedSec);
      if (isHalfDay) halfDayShortfallSecTotal += deficit;
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
      absentTime: formatDurationHhMm(absentSecTotal),
      halfDayShortfallTime: formatDurationHhMm(halfDayShortfallSecTotal),
      lateShortfallTime: formatDurationHhMm(lateShortfallSecTotal),
      overallShortfallTime: formatDurationHhMm(overallShortfallSecTotal),
      renderedSecTotal,
    };
  }

  function listHalfDayDatesFromDailyRows_TimeInOutOnly(rows, calendarMaps) {
    const dates = [];
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const d = String(row?.date ?? '').trim().slice(0, 10);
      if (calendarMaps && isExcludedAttendanceCalendarDate(d, calendarMaps)) return;
      if (!isScheduledByOfficialTime(row)) return;
      if (getOfficialSchedWorkMinuteSec(row) == null) return;
      if (hasNoPunchesTimeInOutOnly(row)) return;
      if (!isHalfDayByPunchPattern(row)) return;
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
      if (getOfficialSchedWorkMinuteSec(row) == null) return;
      if (!hasNoPunchesTimeInOutOnly(row)) return;
      if (d && d.length >= 8) dates.push(d);
    });
    return [...new Set(dates)].sort();
  }

  // ─── Grace period constant ─────────────────────────────────────────────────
  const GRACE_PERIOD_MS = 15 * 60 * 1000;

  const truncateMsToMinutes = (ms) => Math.floor(Math.max(0, ms) / 60000) * 60000;

  const formatDurationMsNoSeconds = formatDurationMsToHhMm;

  /**
   * Converts a HH:MM tardiness string into a human-readable "Xd Yh Zm" format.
   * For the 30hrs faculty module: 6 hours = 1 day.
   */
  const formatTardinessAsDaysHours = (hhmm) => {
    if (!hhmm || hhmm === ZERO_HM || hhmm === '00:00:00') return '0m';
    const parts = String(hhmm).split(':').map(Number);
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

  /** @param {Record<string, string> | null} [tardOverrides] HR edits for Regular Time tardiness (per date). */
  /** @param {Record<string, object> | null} [reviewByDate] Half-day HR review by date. */
  const getCellValue = (row, colKey, isFurlough = false, tardOverrides = null, reviewByDate = null) => {
    const NA = ZERO_HM;
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
        return getRowTotalRenderedMinuteDisplay(
          row,
          reviewByDate,
          MODULE_TYPES.FACULTY_30HRS,
          isFurlough,
        );
      case '_tardiness':
        if (isFurlough) return ZERO_HM;
        {
          const fallback =
            !row.officialTimeIN ||
            !row.timeOUT ||
            row.formattedfinalcalcFaculty === 'NaN:NaN:NaN'
              ? row.formattedFacultyMaxRenderedTime
              : row.formattedfinalcalcFaculty;
          return getRowTotalTardinessMinuteDisplay(
            row,
            reviewByDate,
            MODULE_TYPES.FACULTY_30HRS,
            isFurlough,
            fallback,
            null,
            { hasNoPunchesFn: hasNoPunchesTimeInOutOnly },
          );
        }
      // Honorarium
      case '_hnTimeIN':
        return isNA(row.officialHonorariumTimeIN) ? NA : getSpecialTime('HONORARIUM', 'specialTimeIN');
      case '_hnTimeOUT':
        return isNA(row.officialHonorariumTimeOUT) ? NA : getSpecialTime('HONORARIUM', 'specialTimeOUT');
      case '_hnRendered':
        if (isFurlough) return !row.formattedFacultyMaxRenderedTimeHN || row.formattedFacultyMaxRenderedTimeHN === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyMaxRenderedTimeHN);
        return isNA(row.officialHonorariumTimeIN) || isNA(row.officialHonorariumTimeOUT) || row.formattedFacultyRenderedTimeHN === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyRenderedTimeHN);
      case '_hnTardiness':
        if (isFurlough) return ZERO_HM;
        return isNA(row.officialHonorariumTimeIN) || isNA(row.officialHonorariumTimeOUT) || row.formattedfinalcalcFacultyHN === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedfinalcalcFacultyHN);
      // Service Credit
      case '_scTimeIN':
        return isNA(row.officialServiceCreditTimeIN) ? NA : getSpecialTime('SERVICE', 'specialTimeIN');
      case '_scTimeOUT':
        return isNA(row.officialServiceCreditTimeOUT) ? NA : getSpecialTime('SERVICE', 'specialTimeOUT');
      case '_scRendered':
        if (isFurlough) return !row.formattedFacultyMaxRenderedTimeSC || row.formattedFacultyMaxRenderedTimeSC === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyMaxRenderedTimeSC);
        return isNA(row.officialServiceCreditTimeIN) || isNA(row.officialServiceCreditTimeOUT) || row.formattedFacultyRenderedTimeSC === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyRenderedTimeSC);
      case '_scTardiness':
        if (isFurlough) return ZERO_HM;
        return isNA(row.officialServiceCreditTimeIN) || isNA(row.officialServiceCreditTimeOUT) || row.formattedfinalcalcFacultySC === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedfinalcalcFacultySC);
      // Overtime
      case '_otTimeIN':
        return isNA(row.officialOverTimeIN) ? NA : getSpecialTime('OVERTIME', 'specialTimeIN');
      case '_otTimeOUT':
        return isNA(row.officialOverTimeOUT) ? NA : getSpecialTime('OVERTIME', 'specialTimeOUT');
      case '_otRendered':
        if (isFurlough) return !row.formattedFacultyMaxRenderedTimeOT || row.formattedFacultyMaxRenderedTimeOT === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyMaxRenderedTimeOT);
        return isNA(row.officialOverTimeIN) || isNA(row.officialOverTimeOUT) || row.formattedFacultyRenderedTimeOT === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyRenderedTimeOT);
      case '_otTardiness':
        if (isFurlough) return ZERO_HM;
        return isNA(row.officialOverTimeIN) || isNA(row.officialOverTimeOUT) || row.formattedfinalcalcFacultyOT === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedfinalcalcFacultyOT);
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
          disabled={reviewLocked || isFurlough}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={applyBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.target.blur();
          }}
          placeholder={systemVal}
          inputProps={{
            'aria-label': 'Regular time tardiness',
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
                  <span>
                    <IconButton
                      size="small"
                      aria-label="Use system calculation"
                      disabled={isFurlough}
                      onClick={() => {
                        onCommit(null);
                        setLocal(systemVal);
                      }}
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
            '& .MuiOutlinedInput-root': {
              borderRadius: 1,
              bgcolor: '#fff',
              fontSize: '0.78rem',
            },
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
  const FloatingTotalsBar = ({ totals, visible, onSave, saving, activeTab, startDate, endDate, showSaveButton = true }) => {
    const [expanded, setExpanded] = useState(true);
    if (!visible) return null;

    const allItems = [
      { label: 'Absent Days',         value: String(Number.isFinite(Number(totals.absentDays)) ? Number(totals.absentDays) : 0), subtitle: totals.absentTime || ZERO_HM, style: T.absent,    accent: true },
      { label: 'Half Days',           value: String(Number.isFinite(Number(totals.halfDays))   ? Number(totals.halfDays)   : 0), subtitle: totals.halfDayShortfallTime || ZERO_HM, style: T.halfDay, accent: true },
      { label: 'Late Total',          value: totals.lateTotalTime || ZERO_HM,                                             style: T.tardiness, accent: true },
      { label: 'Overall Rendered',    value: totals.regularRendered  || ZERO_HM,                                              style: T.rendered,  accent: true },
      { label: 'Overall Tardiness',   value: formatTardinessAsDaysHours(totals.overallTardiness || ZERO_HM), subtitle: `${totals.overallTardiness || ZERO_HM} · Absent + Half + Late`, style: T.tardiness, accent: true },
      { label: 'HN Rendered',         value: totals.hnRendered       || ZERO_HM },
      { label: 'HN Tardiness',        value: totals.hnTardiness      || ZERO_HM },
      { label: 'SC Rendered',         value: totals.scRendered       || ZERO_HM },
      { label: 'SC Tardiness',        value: totals.scTardiness      || ZERO_HM },
      { label: 'OT Rendered',         value: totals.otRendered       || ZERO_HM },
      { label: 'OT Tardiness',        value: totals.otTardiness      || ZERO_HM },
    ];
    const halfDaysForReview = Number(totals.halfDaysForReview) || 0;

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
                          {totals.overallTardiness || ZERO_HM}
                        </Typography>
                      </Box>
                    ) : label === 'Absent Days' ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.1 }}>
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: style.color, fontFamily: T.recordFont }}>
                          {value}
                        </Typography>
                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: alpha(style.color, 0.6), fontFamily: T.recordFont }}>
                          {totals.absentTime || ZERO_HM}
                        </Typography>
                      </Box>
                    ) : label === 'Half Days' ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.1 }}>
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: style.color, fontFamily: T.recordFont }}>
                          {value}
                        </Typography>
                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: alpha(style.color, 0.6), fontFamily: T.recordFont }}>
                          {totals.halfDayShortfallTime || ZERO_HM}
                        </Typography>
                        {halfDaysForReview > 0 && (
                          <Typography sx={{
                            fontSize: '0.58rem', fontWeight: 500, color: T.tardiness.color,
                            letterSpacing: '0.04em', textTransform: 'uppercase',
                            fontFamily: T.recordFont, mt: 0.2,
                          }}>
                            {halfDaysForReview} FOR REVIEW
                          </Typography>
                        )}
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

  const parseUnresolvedHalfDayDateParts = (iso) => {
    const raw = String(iso ?? '').slice(0, 10);
    if (!raw) return { iso: raw, longLabel: raw };
    const parsed = new Date(`${raw}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return { iso: raw, longLabel: raw };
    const longLabel = parsed.toLocaleDateString('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric',
    });
    return { iso: raw, longLabel };
  };

  const UnresolvedHalfDaysDialog = ({ dates, onClose }) => {
    const open = Array.isArray(dates) && dates.length > 0;
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: `0 24px 48px ${alpha(T.accent, 0.2)}`,
          },
        }}
      >
        <Box
          sx={{
            px: 2.5, py: 2,
            bgcolor: T.accent,
            display: 'flex', alignItems: 'flex-start', gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 42, height: 42, borderRadius: '10px',
              bgcolor: alpha('#fff', 0.14),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <WarningIcon sx={{ fontSize: 22, color: '#FEF9E1' }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0, pt: 0.15 }}>
            <Typography sx={{ color: '#FEF9E1', fontWeight: 800, fontSize: '1rem', lineHeight: 1.2 }}>
              Unresolved Half Days
            </Typography>
            <Typography sx={{ color: alpha('#FEF9E1', 0.82), fontSize: '0.74rem', mt: 0.35 }}>
              Review required before saving to summary.
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: alpha('#FEF9E1', 0.9),
              bgcolor: alpha('#fff', 0.1),
              '&:hover': { bgcolor: alpha('#fff', 0.18) },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <Box sx={{ px: 2.5, pt: 2, pb: 1 }}>
          <Typography sx={{ fontSize: '0.82rem', color: T.muted, mb: 1.5, lineHeight: 1.6 }}>
            The following dates are flagged as half days but have not been reviewed yet:
          </Typography>

          <Box
            sx={{
              mx: -2.5,
              mb: 1.5,
              borderLeft: `1px solid ${T.accentBorder}`,
              borderRight: `1px solid ${T.accentBorder}`,
              borderTop: `1px solid ${T.accentBorder}`,
              borderBottom: `1px solid ${T.accentBorder}`,
            }}
          >
            {(dates || []).map((d, index) => {
              const { iso, longLabel } = parseUnresolvedHalfDayDateParts(d);
              return (
              <Box
                key={d}
                sx={{
                  bgcolor: T.accentFaint,
                  ...(index > 0 ? { borderTop: `1px solid ${T.accentBorder}` } : {}),
                }}
              >
                <Box
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.25,
                    px: 2.5, py: 0.85,
                  }}
                >
                  <CalendarToday sx={{ fontSize: 13, color: T.accentMid, flexShrink: 0 }} />
                  <Typography
                    component="div"
                    sx={{
                      fontSize: '0.82rem', fontWeight: 600,
                      color: T.text,
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Box component="span" sx={{ fontWeight: 700 }}>{iso}</Box>
                    <Box component="span" sx={{ color: T.faint, mx: 0.75 }}>|</Box>
                    <Box component="span" sx={{ color: T.muted }}>{longLabel}</Box>
                  </Typography>
                </Box>
              </Box>
              );
            })}
          </Box>

          <Box
            sx={{
              display: 'flex', alignItems: 'flex-start', gap: 1,
              px: 1.25, py: 1,
              borderRadius: '8px',
              bgcolor: '#fafafa',
              borderLeft: `3px solid ${alpha(T.accent, 0.45)}`,
              border: `1px solid ${T.divider}`,
              mb: 2,
            }}
          >
            <InfoIcon sx={{ fontSize: 13, color: T.accentMid, mt: 0.2, flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.75rem', color: T.muted, lineHeight: 1.55 }}>
              Approve or deny each half day (enter rendered time or tardiness) before saving to summary or proceeding to the next step.
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            px: 2.5, py: 1.75,
            bgcolor: T.accentFaint,
            borderTop: `1px solid ${T.divider}`,
            display: 'flex', justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: T.accent, color: '#fff',
              border: 'none', borderRadius: '8px',
              padding: '8px 24px',
              fontWeight: 700, fontSize: '0.82rem',
              fontFamily: 'inherit', cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = T.accentDark; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = T.accent; }}
          >
            OK
          </button>
        </Box>
      </Dialog>
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
  const AttendanceModuleFaculty = ({
    embedded = false,
    initialContext = null,
    onClose,
    onSavedToSummary,
    saveSignal = 0,
  } = {}) => {
    const seedEmp = String(initialContext?.employeeNumber || '').trim();
    const seedStart = initialContext?.startDate || '';
    const seedEnd = initialContext?.endDate || '';
    const [suspensionByDate, setSuspensionByDate] = useState({});
    const [leaveByDate, setLeaveByDate] = useState({});
    const [holidayByDate, setHolidayByDate] = useState({});
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
    const [unresolvedDatesModal, setUnresolvedDatesModal] = useState(null);

    const resultsRef = useRef(null);
    const submitInFlightRef = useRef(false);
    const persistDebounceRef = useRef(null);

    const { hasAccess, loading: accessLoading } = usePageAccess('attendance-module-faculty');

    const currentYear = new Date().getFullYear();
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const [selectedMonth, setSelectedMonth] = useState(
      initialContext?.selectedMonth ?? null,
    );
    const [selectedYear, setSelectedYear] = useState(
      initialContext?.selectedYear ?? new Date().getFullYear(),
    );
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
      if (embedded) return;
      const en = localStorage.getItem('attendanceFaculty30EmployeeNumber');
      const sd = localStorage.getItem('attendanceFaculty30StartDate');
      const ed = localStorage.getItem('attendanceFaculty30EndDate');
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

    useEffect(() => {
      // Hub drawer uses initialContext + remount; do not let router state
      // overwrite the seeded employee/period or race the embedded reload.
      if (embedded) return;
      const s = location.state;

      if (!s?.fromDevice) return;

      setEmployeeNumber(s.employeeNumber || '');
      setStartDate(s.startDate || '');
      setEndDate(s.endDate || '');

      setTimeout(() => {
        if (handleSubmitRef.current) handleSubmitRef.current();
      }, 300);
    }, [embedded, location.state]);

    const isFurloughDate = (date, suspMap, leaveMap, holidayMap) =>
      Boolean(suspMap?.[date] || leaveMap?.[date] || holidayMap?.[date]);

    const handleSubmit = async () => {
      if (submitInFlightRef.current) return;
      submitInFlightRef.current = true;
      localStorage.setItem('attendanceFaculty30EmployeeNumber', employeeNumber);
      localStorage.setItem('attendanceFaculty30StartDate', startDate);
      localStorage.setItem('attendanceFaculty30EndDate', endDate);
      setLoading(true);
      setError('');
      setSuccess('');
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

        // ── FIX: fetch rawRows BEFORE the "no device records" guard, and only
        // treat this as a hard "no records" case when BOTH the raw device
        // punches AND the manually-entered/modified attendancerecord rows
        // (Attendance Modification) come back empty. This lets records that
        // were added/edited via Attendance Modification (and therefore exist
        // in `attendancerecord` even without matching device punches) still
        // load in this module — matching Non-Teaching's behavior.
        const rawRows = Array.isArray(attendanceRes.data) ? attendanceRes.data : [];

        if (deviceRows.length === 0 && rawRows.length === 0) {
          setAttendanceData([]);
          setSuspensionByDate({});
          setLeaveByDate({});
          setHolidayByDate({});
          showModal(
            'No Device Records Found',
            'No biometric device records were found for this employee within the selected date range, and no records have been manually added.\n\nPlease verify the employee number and date range, check if the attendance device has synced, or add records in Attendance Modification.\n\nPress OK to open Attendance Device.',
            'warning',
            () => { closeModal(); navigate('/view_attendance'); },
          );
          return;
        }

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
        const hasOfficialTime = rawRows.some(
          (row) => row.officialTimeIN && row.officialTimeOUT && row.officialTimeIN !== '00:00:00 AM' && row.officialTimeOUT !== '00:00:00 AM',
        );
        if (!hasOfficialTime) { setShowNoOfficialTimeModal(true); return; }

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

          const { displayBreaktimeIN, displayBreaktimeOUT } =
            applyFacultyPunchGatedBreaktimes({
              timeIN,
              timeOUT,
              breaktimeIN,
              breaktimeOUT,
              officialBreaktimeIN,
              officialBreaktimeOUT,
            });
          const startOfficialTimeFaculty = new Date(`01/01/2000 ${officialTimeIN}`);
          const endOfficialTimeFaculty = new Date(`01/01/2000 ${officialTimeOUT}`);
          const diffMsFaculty = endOfficialTimeFaculty - startOfficialTimeFaculty;
          const formattedFacultyMaxRenderedTime = formatDurationMsNoSeconds(diffMsFaculty);

          const calcSeg = (tIn, tOut, offIn, offOut) => {
            const s = new Date(`01/01/2000 ${tIn}`);
            const e = new Date(`01/01/2000 ${tOut}`);
            const os = new Date(`01/01/2000 ${offIn}`);
            const oe = new Date(`01/01/2000 ${offOut}`);
            const mid = new Date(`01/01/2000 00:00:00 AM`);
            const msToHHMMSS = (ms) => formatDurationMsNoSeconds(ms);
            if (os.getTime() === mid.getTime() || oe.getTime() === mid.getTime())
              return { rendered: ZERO_HM, maxRendered: ZERO_HM, tardiness: ZERO_HM };
            if (!tIn || !tOut || isNaN(s.getTime()) || isNaN(e.getTime()))
              return { rendered: ZERO_HM, maxRendered: msToHHMMSS(oe - os), tardiness: msToHHMMSS(oe - os) };
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

          if (isHalfDayByPunchPattern(row)) {
            const halfSchedSec = Math.floor(diffMsFaculty / 2);
            const tardWhenSinglePunch = formatDurationMsNoSeconds(
              Math.max(0, halfSchedSec),
            );
            const hn = calcSeg(
              row.specialType === 'HONORARIUM' && row.specialTimeIN ? row.specialTimeIN : timeIN,
              row.specialType === 'HONORARIUM' && row.specialTimeOUT ? row.specialTimeOUT : timeOUT,
              officialHonorariumTimeIN,
              officialHonorariumTimeOUT,
            );
            const sc = calcSeg(
              row.specialType === 'SERVICE' && row.specialTimeIN ? row.specialTimeIN : timeIN,
              row.specialType === 'SERVICE' && row.specialTimeOUT ? row.specialTimeOUT : timeOUT,
              officialServiceCreditTimeIN,
              officialServiceCreditTimeOUT,
            );
            const ot = calcSeg(
              row.specialType === 'OVERTIME' && row.specialTimeIN ? row.specialTimeIN : timeIN,
              row.specialType === 'OVERTIME' && row.specialTimeOUT ? row.specialTimeOUT : timeOUT,
              officialOverTimeIN,
              officialOverTimeOUT,
            );
            return {
              ...row,
              breaktimeIN: displayBreaktimeIN,
              breaktimeOUT: displayBreaktimeOUT,
              lateTotal: tardWhenSinglePunch,
              undertimeTotal: ZERO_HM,
              formattedfinalcalcFaculty: tardWhenSinglePunch,
              formattedFacultyRenderedTime: ZERO_HM,
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
          }

          if (attendanceEmptyPunch(timeIN) || attendanceEmptyPunch(timeOUT)) {
            const schedSec = Math.round(diffMsFaculty / 1000);
            const renderedSec = computeOfficialWindowRenderedSec(row) ?? 0;
            const tardSec = Math.max(0, schedSec - renderedSec);
            const tardWhenPartial = formatDurationMsNoSeconds(tardSec * 1000);
            const renderedDisplay = formatDurationMsNoSeconds(renderedSec * 1000);
            const hn = calcSeg(
              row.specialType === 'HONORARIUM' && row.specialTimeIN ? row.specialTimeIN : timeIN,
              row.specialType === 'HONORARIUM' && row.specialTimeOUT ? row.specialTimeOUT : timeOUT,
              officialHonorariumTimeIN,
              officialHonorariumTimeOUT,
            );
            const sc = calcSeg(
              row.specialType === 'SERVICE' && row.specialTimeIN ? row.specialTimeIN : timeIN,
              row.specialType === 'SERVICE' && row.specialTimeOUT ? row.specialTimeOUT : timeOUT,
              officialServiceCreditTimeIN,
              officialServiceCreditTimeOUT,
            );
            const ot = calcSeg(
              row.specialType === 'OVERTIME' && row.specialTimeIN ? row.specialTimeIN : timeIN,
              row.specialType === 'OVERTIME' && row.specialTimeOUT ? row.specialTimeOUT : timeOUT,
              officialOverTimeIN,
              officialOverTimeOUT,
            );
            return {
              ...row,
              breaktimeIN: displayBreaktimeIN,
              breaktimeOUT: displayBreaktimeOUT,
              lateTotal: tardWhenPartial,
              undertimeTotal: ZERO_HM,
              formattedfinalcalcFaculty: tardWhenPartial,
              formattedFacultyRenderedTime: renderedDisplay,
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
          }
          const startDateFaculty = new Date(`01/01/2000 ${timeIN}`);
          const endDateFaculty = new Date(`01/01/2000 ${timeOUT}`);
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
          const formattedFacultyRenderedTime = formatDurationMsNoSeconds(diffMs);
          const isMidnightEdge = timeinfaculty.getTime() === midnightFaculty.getTime();
          const lateRawMs = isMidnightEdge ? 0 : Math.max(0, timeinfaculty - startOfficialTimeFaculty);
          const earlyRawMs = isMidnightEdge ? 0 : Math.max(0, endOfficialTimeFaculty - timeoutfaculty);
          const formattedfinalcalcFaculty = formatDurationMsNoSeconds(
            tardinessMsFromLateFloorEarlyCeil(lateRawMs, earlyRawMs),
          );

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
            undertimeTotal: ZERO_HM,
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
            MODULE_TYPES.FACULTY_30HRS,
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

        void (async () => {
          try {
            const stored = await fetchDailyLateUndertime(
              employeeNumber,
              startDate,
              endDate,
            );
            setHalfDayReviewByDate(buildReviewMapFromStored(stored));
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
      return sumDurationHhMm(rows.map((row) => getTime(row)));
    }, []);

    const totals = React.useMemo(() => {
      if (!attendanceData.length) return {};
      const calendarMaps = { suspensionByDate, holidayByDate, leaveByDate };
      const buckets = computeFaculty30MinuteBuckets(
        attendanceData,
        halfDayReviewByDate,
        calendarMaps,
        {
          hasNoPunchesFn: hasNoPunchesTimeInOutOnly,
        },
      );
      const regularRendered = sumTimeRows(attendanceData, (row) => {
        const isFurlough = Boolean(getStatusLabelForDate(row.date));
        if (isFurlough) return !row.formattedFacultyMaxRenderedTime || row.formattedFacultyMaxRenderedTime === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyMaxRenderedTime);
        return !row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTime === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyRenderedTime);
      });
      const rowTardinessSum = sumTimeRows(attendanceData, (row) => {
        const f = Boolean(getStatusLabelForDate(row.date));
        if (f) return null;
        return getCellValue(row, '_tardiness', f, tardinessOverrides, halfDayReviewByDate);
      });
      const regularTardiness = rowTardinessSum;
      const hnRendered = sumTimeRows(attendanceData, (row) => {
        const isFurlough = Boolean(getStatusLabelForDate(row.date));
        if (isFurlough) return !row.formattedFacultyMaxRenderedTimeHN || row.formattedFacultyMaxRenderedTimeHN === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyMaxRenderedTimeHN);
        return !row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeHN === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyRenderedTimeHN);
      });
      const hnTardiness = sumTimeRows(attendanceData, (row) => {
        if (Boolean(getStatusLabelForDate(row.date))) return null;
        return !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyHN === 'NaN:NaN:NaN' ? displayDurationHhMm(row.formattedFacultyMaxRenderedTimeHN) : displayDurationHhMm(row.formattedfinalcalcFacultyHN);
      });
      const scRendered = sumTimeRows(attendanceData, (row) => {
        const isFurlough = Boolean(getStatusLabelForDate(row.date));
        if (isFurlough) return !row.formattedFacultyMaxRenderedTimeSC || row.formattedFacultyMaxRenderedTimeSC === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyMaxRenderedTimeSC);
        return !row.officialTimeSC || !row.timeOUT || row.formattedFacultyRenderedTimeSC === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyRenderedTimeSC);
      });
      const scTardiness = sumTimeRows(attendanceData, (row) => {
        if (Boolean(getStatusLabelForDate(row.date))) return null;
        return !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultySC === 'NaN:NaN:NaN' ? displayDurationHhMm(row.formattedFacultyMaxRenderedTimeSC) : displayDurationHhMm(row.formattedfinalcalcFacultySC);
      });
      const otRendered = sumTimeRows(attendanceData, (row) => {
        const isFurlough = Boolean(getStatusLabelForDate(row.date));
        if (isFurlough) return !row.formattedFacultyMaxRenderedTimeOT || row.formattedFacultyMaxRenderedTimeOT === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyMaxRenderedTimeOT);
        return !row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeOT === 'NaN:NaN:NaN' ? ZERO_HM : displayDurationHhMm(row.formattedFacultyRenderedTimeOT);
      });
      const otTardiness = sumTimeRows(attendanceData, (row) => {
        if (Boolean(getStatusLabelForDate(row.date))) return null;
        return !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyOT === 'NaN:NaN:NaN' ? displayDurationHhMm(row.formattedFacultyMaxRenderedTimeOT) : displayDurationHhMm(row.formattedfinalcalcFacultyOT);
      });
      const lateTotalTime = buckets.lateShortfallTime;
      const overallTardiness = buckets.overallShortfallTime;

      return {
        absentDays: buckets.absentDays,
        halfDays: buckets.halfDays,
        halfDaysForReview: countSuggestedHalfDays(
          halfDayReviewByDate,
          attendanceData,
          MODULE_TYPES.FACULTY_30HRS,
          calendarMaps,
        ),
        absentTime: buckets.absentTime,
        halfDayShortfallTime: buckets.halfDayShortfallTime,
        lateTotalTime,
        overallTardiness,
        overallShortfallTime: buckets.overallShortfallTime,
        rowTardinessSum,
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
      if (persistDebounceRef.current) clearTimeout(persistDebounceRef.current);
      persistDebounceRef.current = setTimeout(() => {
        const approvedSet = getApprovedHalfDayDatesSet(halfDayReviewByDate);
        void persistDailyLateUndertimeFromModule({
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
      }, 350);
      return () => {
        if (persistDebounceRef.current) clearTimeout(persistDebounceRef.current);
      };
    }, [halfDayReviewByDate, attendanceData, employeeNumber, startDate, endDate]);

    const getTabTotalsValues = (tab) => {
      switch (tab) {
        case 'regular':
          return [totals.regularRendered, totals.regularTardiness || totals.rowTardinessSum || ZERO_HM];
        case 'honorarium':    return [totals.hnRendered, totals.hnTardiness];
        case 'serviceCredit': return [totals.scRendered, totals.scTardiness];
        case 'overtime':      return [totals.otRendered, totals.otTardiness];
        default:              return [];
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
        MODULE_TYPES.FACULTY_30HRS,
      );
      return {
      ...(function computeAbsentHalfBuckets() {
        const c = computeFaculty30MinuteBuckets(
          attendanceData,
          halfDayReviewByDate,
          calendarMaps,
          {
            hasNoPunchesFn: hasNoPunchesTimeInOutOnly,
          },
        );
        const absentList = listAbsentDatesFromDailyRows_TimeInOutOnly(attendanceData, calendarMaps);
        return {
          absentDays: c.absentDays,
          halfDays: c.halfDays,
          lateTotalTime: c.lateShortfallTime || ZERO_HM,
          absentTime: c.absentTime,
          halfDayShortfallTime: c.halfDayShortfallTime,
          absentDates: absentList.join(', '),
          halfDayDates: [...approvedSet].join(', '),
          half_day_review: buildHalfDayReviewArray(halfDayReviewByDate),
        };
      })(),
      personID: employeeNumber, startDate, endDate,
      totalRenderedTimeMorning:             ZERO_HM,
      totalRenderedTimeMorningTardiness:    ZERO_HM,
      totalRenderedTimeAfternoon:           ZERO_HM,
      totalRenderedTimeAfternoonTardiness:  ZERO_HM,
      totalRenderedHonorarium:              totals.hnRendered,
      totalRenderedHonorariumTardiness:     totals.hnTardiness,
      totalRenderedServiceCredit:           totals.scRendered,
      totalRenderedServiceCreditTardiness:  totals.scTardiness,
      totalRenderedOvertime:                totals.otRendered,
      totalRenderedOvertimeTardiness:       totals.otTardiness,
      overallRenderedOfficialTime:          totals.regularRendered,
      overallRenderedOfficialTimeTardiness: totals.overallTardiness,
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
          { params: { personID: employeeNumber, startDate, endDate }, ...getAuthHeaders() },
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
            moduleType: 'FACULTY_30HRS',
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
            moduleType: 'FACULTY_30HRS',
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
    } = useAttendanceWorkflow('faculty_30', {
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
      setEmployeeNumber('');
      setEmployeeDisplayName('');
      setEmployeeSearchQuery('');
      setStartDate('');
      setEndDate('');
      setAttendanceData([]);
      setError('');
      setSuccess('');
      setSelectedMonth(null);
      setTardinessOverrides({});
      setHalfDayReviewByDate({});
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
          {columnSlots.map(({ col }) => {
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
                pt: 1,
                pb: 1,
                minWidth: col.minWidth || 80,
                borderBottom: `2px solid ${T.accentBorder}`,
                borderRight: `1px solid rgba(255,255,255,0.15)`,
                whiteSpace: halfDayTotalCol ? 'normal' : 'nowrap',
                verticalAlign: 'bottom',
              }}
            >
              <HalfDayTotalColumnHeader label={col.label} colKey={col.key} />
            </TableCell>
            );
          })}
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
                {renderedVal || ZERO_HM}
              </TableCell>
            );
            if (showTardiness) return (
              <TableCell key={col.key + '_tt'} sx={{ fontFamily: T.recordFont, fontWeight: 800, fontSize: '0.88rem', textAlign: 'center', py: 1.25, borderBottom: 'none', color: T.tardiness.color, bgcolor: T.tardiness.bg }}>
                {tardinessVal || ZERO_HM}
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
        <Box sx={embedded ? ATTENDANCE_EMBEDDED_ROOT_SX : {
          py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 },
          pb: ATTENDANCE_PAGE_BOTTOM_PAD,
          width: '100vw', maxWidth: '100%',
          position: 'relative', left: '63%', transform: 'translateX(-61%)',
          px: { xs: 2, sm: 3, md: 6 },
        }}>
          <style>{`${ATTENDANCE_PAGE_SCROLL_CSS}${shimmerKf}`}</style>

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

          <LoadingOverlay open={loading && !compareOpen} message="Fetching attendance records…" />

          {embedded ? (
            <Box sx={{ flexShrink: 0, mb: 1.25, px: 1.5, py: 1, borderRadius: '10px', border: `1px solid ${T.accentBorder}`, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                <WorkHistory sx={{ fontSize: 20, color: T.accent }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 900, color: T.accent, lineHeight: 1.15 }}>Faculty 30hrs Computation</Typography>
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
          /* ── Page Header ── */
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
                    Faculty 30hrs · Generate and review attendance records
                  </Typography>
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
                    <CheckCircleIcon sx={{ fontSize: 12 }} /> Faculty 30hrs
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
          )}

          {/* ── Alerts ── */}
          <Collapse in={!!error}>
            <Alert severity="error" onClose={() => setError('')} sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.82rem' }}>{error}</Alert>
          </Collapse>
          <Collapse in={!!success}>
            <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.82rem' }}>{success}</Alert>
          </Collapse>

          {/* ── Controls Card — hidden in DTR sliding drawer ── */}
          {!embedded && (
          <SectionCard sx={{ mb: 2 }}>
            <PanelHeader icon={FilterList} title="Filter Attendance Records" />
            <Box sx={{ px: 2.5, pt: 2, pb: 2.5 }}>
              {/* Input row */}
              <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 160 }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Employee Number</Typography>
                  <EmployeeSearchField
                    value={employeeNumber}
                    displayName={employeeDisplayName}
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

          {/* ── Results Card ── */}
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
                                  const halfUiRow =
                                    !rowIsAbsent && !isFurlough
                                      ? getHalfDayUiStatus(row)
                                      : null;
                                  if (
                                    activeTab === 'regular' &&
                                    halfDayTotalColumnVariant(col.key) &&
                                    halfUiRow
                                  ) {
                                    const metricVal = getCellValue(
                                      row,
                                      col.key,
                                      isFurlough,
                                      tardOv,
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
                                          halfUi={halfUiRow}
                                          colKey={col.key}
                                          halfDayColor={T.halfDay?.color}
                                        />
                                      </TableCell>
                                    );
                                  }
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
                <Typography sx={{ fontSize: '0.74rem', color: T.faint }}>
                  {employeeDisplayName
                    ? `${employeeNumber} | ${employeeDisplayName}`
                    : `Employee #${employeeNumber}`}
                </Typography>
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

          <UnresolvedHalfDaysDialog
            dates={unresolvedDatesModal}
            onClose={() => setUnresolvedDatesModal(null)}
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
            confirmLabel={modal.confirmLabel}
          />

          <OverallAttendanceCompareModal
            open={compareOpen}
            onClose={handleCompareClose}
            onConfirm={handleCompareConfirm}
            savedRow={pendingSavedOverall}
            proposedRecord={pendingProposedOverall}
            fields={OVERALL_COMPARE_FIELD_META}
            mode="duplicate"
            currentModuleType="FACULTY_30HRS"
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