import API_BASE_URL from '../../apiConfig';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Menu,
  MenuItem,
  CircularProgress,
  alpha,
  Card,
  styled,
  FormControl,
  IconButton,
  Select,
} from '@mui/material';
import {
  AccessTime,
  Assignment,
  Cancel,
  CheckCircle,
  KeyboardArrowDown,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  KeyboardArrowUp,
  Person,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import useAttendanceRealtimeRefresh from '../../hooks/useAttendanceRealtimeRefresh';
import { logAttendanceStateChange } from '../../utils/moduleEmployeeSearchAudit';
import {
  detectUnmountedPunches,
  indexUnmountedIssues,
} from '../../utils/unmountedPunchIssues';

const T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  accentFaint: 'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  rowOdd: 'rgba(109,35,35,0.025)',
  rowHover: 'rgba(109,35,35,0.055)',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#a0a0a0',
  divider: 'rgba(0,0,0,0.08)',
};

const pickerFieldSx = {
  '& .MuiOutlinedInput-root': {
    height: 30,
    fontSize: '0.7rem',
    bgcolor: '#fff',
    '& fieldset': { borderColor: T.accentBorder },
    '&:hover fieldset': { borderColor: T.accent },
    '&.Mui-focused fieldset': { borderColor: T.accent },
  },
  '& .MuiInputBase-input': { py: 0.4, fontSize: '0.7rem', fontWeight: 600 },
  '& .MuiInputAdornment-root .MuiIconButton-root': { p: 0.25 },
  '& .MuiSvgIcon-root': { fontSize: 16, color: T.accent },
};

const SidebarCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: '#fff',
});

const PUNCH_PAGE_SIZE = 25;

const ATTENDANCE_STATE_OPTIONS = [
  { value: 1, label: 'Time IN' },
  { value: 2, label: 'Breaktime OUT' },
  { value: 3, label: 'Breaktime IN' },
  { value: 4, label: 'Time OUT' },
  { value: 5, label: 'Special Time IN' },
  { value: 6, label: 'Special Time OUT' },
];

const getAttendanceIcon = (state) => {
  switch (state) {
    case 1:
      return <CheckCircle sx={{ fontSize: 12, color: '#4caf50' }} />;
    case 2:
      return <AccessTime sx={{ fontSize: 12, color: '#ff9800' }} />;
    case 3:
      return <AccessTime sx={{ fontSize: 12, color: '#ff9800' }} />;
    case 4:
      return <CheckCircle sx={{ fontSize: 12, color: '#4caf50' }} />;
    case 5:
      return <AccessTime sx={{ fontSize: 12, color: '#1565C0' }} />;
    case 6:
      return <AccessTime sx={{ fontSize: 12, color: '#1565C0' }} />;
    default:
      return <Cancel sx={{ fontSize: 12, color: '#f44336' }} />;
  }
};

const getAttendanceColor = (state) => {
  switch (state) {
    case 1:
    case 4:
      return '#4caf50';
    case 2:
    case 3:
      return '#ff9800';
    case 5:
    case 6:
      return '#1565C0';
    default:
      return '#f44336';
  }
};

const getAttendanceLabel = (state) => {
  switch (state) {
    case 1:
      return 'Time IN';
    case 2:
      return 'Breaktime OUT';
    case 3:
      return 'Breaktime IN';
    case 4:
      return 'Time OUT';
    case 5:
      return 'Special Time IN';
    case 6:
      return 'Special Time OUT';
    default:
      return 'Uncategorized';
  }
};

const toISODateFromRecord = (rawDate) => {
  const [month, day, year] = String(rawDate || '').split('/');
  if (!month || !day || !year) return '';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const recordSortTimestamp = (record) => {
  const [month, day, year] = String(record?.Date || '').split('/');
  if (month && day && year) {
    const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${record?.Time || '00:00:00'}`;
    const ts = new Date(iso).getTime();
    if (!Number.isNaN(ts)) return ts;
  }
  const fallback = new Date(`${record?.Date || ''} ${record?.Time || ''}`).getTime();
  return Number.isNaN(fallback) ? 0 : fallback;
};

const enrichAttendanceRecords = (rows) =>
  rows.map((record, index) => {
    const iso = toISODateFromRecord(record?.Date);
    const dateForLabel = iso ? new Date(`${iso}T12:00:00`) : null;
    const dateLabel =
      dateForLabel && !Number.isNaN(dateForLabel.getTime())
        ? dateForLabel.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })
        : String(record?.Date || '');
    return {
      ...record,
      _isoDate: iso,
      _sortTs: recordSortTimestamp(record),
      _dateLabel: dateLabel,
      _rowKey: `${record?.AttendanceDateTime ?? ''}|${record?.Date ?? ''}|${record?.Time ?? ''}|${index}`,
    };
  });

const getAuthHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  },
});

const AttendanceStatusChip = ({ value, saving = false, editable = false, onOpenMenu }) => {
  const state = Number(value) || 0;
  const stateColor = getAttendanceColor(state);
  return (
    <Box
      component={editable ? 'button' : 'div'}
      type={editable ? 'button' : undefined}
      disabled={editable && saving}
      onClick={
        editable
          ? (e) => {
              e.stopPropagation();
              onOpenMenu?.(e);
            }
          : undefined
      }
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.4,
        maxWidth: '100%',
        px: 0.85,
        py: 0.28,
        borderRadius: '10px',
        bgcolor: alpha(stateColor, 0.1),
        border: `1px solid ${alpha(stateColor, 0.25)}`,
        cursor: editable && !saving ? 'pointer' : 'default',
        font: 'inherit',
        outline: 'none',
        opacity: saving ? 0.7 : 1,
        '&:hover': editable && !saving ? { bgcolor: alpha(stateColor, 0.16) } : {},
      }}
    >
      {saving ? (
        <CircularProgress size={10} sx={{ color: stateColor }} />
      ) : (
        getAttendanceIcon(state)
      )}
      <Typography
        sx={{
          fontSize: '0.64rem',
          fontWeight: 700,
          color: stateColor,
          whiteSpace: 'nowrap',
          lineHeight: 1.2,
        }}
      >
        {getAttendanceLabel(state)}
      </Typography>
      {editable && !saving && (
        <KeyboardArrowDown sx={{ fontSize: 13, color: stateColor, ml: -0.15 }} />
      )}
    </Box>
  );
};

/**
 * Compact punch-status rail used on Device Attendance so admins can correct
 * Time IN / Time OUT without leaving the page.
 */
const AttendancePunchStatusSidebar = ({
  personID,
  startDate,
  endDate,
  enabled = false,
  targetUsername = '',
  monthLabel = '',
  onStatusUpdated,
  onIssuesChange,
  reviewFocusToken = 0,
}) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [statusMenu, setStatusMenu] = useState({ anchor: null, record: null });
  const [savingStatusKey, setSavingStatusKey] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [page, setPage] = useState(0);
  const requestControllerRef = useRef(null);
  const fetchRef = useRef(null);
  const listRef = useRef(null);
  const onIssuesChangeRef = useRef(onIssuesChange);

  const fetchPunches = useCallback(
    async (showLoading = true) => {
      if (!enabled || !personID || !startDate || !endDate) {
        setRecords([]);
        return;
      }

      requestControllerRef.current?.abort();
      const controller = new AbortController();
      requestControllerRef.current = controller;

      if (showLoading) setLoading(true);
      setError('');

      try {
        const adjustedStart = new Date(startDate);
        adjustedStart.setDate(adjustedStart.getDate() - 1);
        const adjustedEnd = new Date(endDate);
        adjustedEnd.setDate(adjustedEnd.getDate() + 1);

        const response = await axios.post(
          `${API_BASE_URL}/attendance/api/attendance`,
          {
            personID: String(personID).trim(),
            startDate: adjustedStart.toISOString().substring(0, 10),
            endDate: adjustedEnd.toISOString().substring(0, 10),
          },
          { ...getAuthHeaders(), signal: controller.signal },
        );

        const raw = Array.isArray(response.data) ? response.data : [];
        const filtered = enrichAttendanceRecords(
          raw.filter((record) => {
            const iso = toISODateFromRecord(record?.Date);
            return iso && iso >= startDate && iso <= endDate;
          }),
        );
        setRecords(filtered);
      } catch (err) {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
        console.error('Error fetching punch statuses:', err);
        setError('Failed to load punch statuses');
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [enabled, personID, startDate, endDate],
  );

  useEffect(() => {
    fetchRef.current = fetchPunches;
  }, [fetchPunches]);

  useEffect(() => {
    fetchPunches(true);
    return () => requestControllerRef.current?.abort();
  }, [fetchPunches]);

  useEffect(() => {
    setStatusFilter('all');
    setRangeStart(startDate ? dayjs(startDate) : null);
    setRangeEnd(endDate ? dayjs(endDate) : null);
  }, [personID, startDate, endDate]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [personID, startDate, endDate, reviewFocusToken, page]);

  useAttendanceRealtimeRefresh(
    useCallback(() => {
      if (!enabled || !personID || !startDate || !endDate) return;
      fetchRef.current?.(false);
    }, [enabled, personID, startDate, endDate]),
    {
      personId: personID,
      startDate,
      endDate,
      requireDateRange: true,
      matchMode: 'strict',
      debounceMs: 250,
    },
  );

  const unmountedIssues = useMemo(() => detectUnmountedPunches(records), [records]);
  const highlightedRowKeys = useMemo(() => {
    const keys = new Set();
    const seen = new Set();
    unmountedIssues.forEach((issue) => {
      const fingerprint = `${issue.date}|${issue.time}|${issue.state}|${issue.reason}`;
      if (seen.has(fingerprint) || !issue.rowKey) return;
      seen.add(fingerprint);
      keys.add(issue.rowKey);
    });
    return keys;
  }, [unmountedIssues]);
  const issueByKey = useMemo(() => {
    const map = indexUnmountedIssues(unmountedIssues);
    [...map.keys()].forEach((key) => {
      if (!highlightedRowKeys.has(key)) map.delete(key);
    });
    return map;
  }, [unmountedIssues, highlightedRowKeys]);

  useEffect(() => {
    onIssuesChangeRef.current = onIssuesChange;
  }, [onIssuesChange]);

  useEffect(() => {
    const reviewIssues = unmountedIssues.filter((issue) => highlightedRowKeys.has(issue.rowKey));
    onIssuesChangeRef.current?.({
      issues: enabled ? reviewIssues : [],
      ready: Boolean(enabled && !loading),
    });
  }, [enabled, loading, unmountedIssues, highlightedRowKeys]);

  const periodStart = startDate ? dayjs(startDate) : null;
  const periodEnd = endDate ? dayjs(endDate) : null;
  const filtersActive =
    (statusFilter !== 'all' && statusFilter !== 'review') ||
    (rangeStart?.isValid() && startDate && rangeStart.format('YYYY-MM-DD') !== startDate) ||
    (rangeEnd?.isValid() && endDate && rangeEnd.format('YYYY-MM-DD') !== endDate);

  const filteredRecords = useMemo(() => {
    const fromIso = rangeStart?.isValid() ? rangeStart.format('YYYY-MM-DD') : '';
    const toIso = rangeEnd?.isValid() ? rangeEnd.format('YYYY-MM-DD') : '';
    return records
      .filter((record) => {
        if (statusFilter === 'review' && !highlightedRowKeys.has(record._rowKey)) {
          return false;
        }
        if (
          statusFilter !== 'all' &&
          statusFilter !== 'review' &&
          Number(record.AttendanceState || 0) !== Number(statusFilter)
        ) {
          return false;
        }
        if (fromIso && record._isoDate && record._isoDate < fromIso) return false;
        if (toIso && record._isoDate && record._isoDate > toIso) return false;
        return true;
      })
      .sort((a, b) => {
        const aNeedsReview = highlightedRowKeys.has(a._rowKey) ? 0 : 1;
        const bNeedsReview = highlightedRowKeys.has(b._rowKey) ? 0 : 1;
        if (aNeedsReview !== bNeedsReview) return aNeedsReview - bNeedsReview;
        const diff = (a._sortTs ?? 0) - (b._sortTs ?? 0);
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [records, sortOrder, statusFilter, rangeStart, rangeEnd, issueByKey, highlightedRowKeys]);

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / PUNCH_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * PUNCH_PAGE_SIZE;
  const pageRecords = useMemo(
    () => filteredRecords.slice(pageStart, pageStart + PUNCH_PAGE_SIZE),
    [filteredRecords, pageStart],
  );

  useEffect(() => {
    setPage(0);
  }, [personID, startDate, endDate, statusFilter, rangeStart, rangeEnd, sortOrder, reviewFocusToken]);

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  const handleStatusMenuOpen = (event, record) => {
    event.stopPropagation();
    setStatusMenu({ anchor: event.currentTarget, record });
  };

  const handleStatusMenuClose = () => setStatusMenu({ anchor: null, record: null });

  const handleStatusChange = async (record, newState) => {
    const ts = record?.AttendanceDateTime;
    const previousState = Number(record?.AttendanceState);
    const nextState = Number(newState);
    if (!ts || !Number.isFinite(nextState) || previousState === nextState) return;

    const rowKey = record._rowKey;
    setSavingStatusKey(rowKey);
    setError('');

    try {
      await axios.patch(
        `${API_BASE_URL}/attendance/api/attendance-record-state`,
        {
          personID: record.PersonID,
          attendanceDateTime: ts,
          attendanceState: nextState,
        },
        getAuthHeaders(),
      );

      setRecords((prev) =>
        prev.map((r) => (r._rowKey === rowKey ? { ...r, AttendanceState: nextState } : r)),
      );

      logAttendanceStateChange({
        targetEmployeeNumber: String(record.PersonID || personID || '').trim(),
        targetUsername: targetUsername || String(personID || '').trim(),
        periodStart: startDate,
        periodEnd: endDate,
        monthLabel,
        punchDate: record.Date,
        punchTime: record.Time,
        previousState,
        newState: nextState,
      });

      onStatusUpdated?.({
        label: getAttendanceLabel(nextState),
        date: record.Date,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update attendance status');
    } finally {
      setSavingStatusKey(null);
    }
  };

  const handleStatusPick = (newState) => {
    const record = statusMenu.record;
    handleStatusMenuClose();
    if (record) handleStatusChange(record, newState);
  };

  return (
    <SidebarCard
      sx={{
        width: '100%',
        maxWidth: '100%',
        flexShrink: 0,
        minWidth: 0,
        boxSizing: 'border-box',
        minHeight: 0,
        height: { xs: 'min(48vh, 420px)', lg: 'auto' },
        alignSelf: 'stretch',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderBottom: `1px solid ${T.divider}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          bgcolor: T.accentFaint,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
          <Assignment sx={{ fontSize: 13, color: T.accent }} />
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.accent }}>
            Punch Status
          </Typography>
        </Box>
        {records.length > 0 && (
          <Box
            sx={{
              px: 0.9,
              py: 0.15,
              borderRadius: 5,
              bgcolor: alpha(T.accent, 0.1),
              border: `1px solid ${alpha(T.accent, 0.18)}`,
              flexShrink: 0,
            }}
          >
            <Typography sx={{ fontSize: '0.64rem', color: T.accent, fontWeight: 700 }}>
              {filteredRecords.length === records.length
                ? records.length
                : `${filteredRecords.length}/${records.length}`}
            </Typography>
          </Box>
        )}
      </Box>

      {enabled && (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Box
            sx={{
              px: 1.25,
              py: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75,
              borderBottom: `1px solid ${T.divider}`,
              bgcolor: '#fff',
              flexShrink: 0,
            }}
          >
            <FormControl size="small" fullWidth>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                displayEmpty
                sx={{
                  height: 30,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  bgcolor: '#fff',
                  '& .MuiSelect-select': { py: 0.4, display: 'flex', alignItems: 'center', gap: 0.6 },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accent },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.accent },
                }}
              >
                <MenuItem value="review" sx={{ fontSize: '0.74rem', fontWeight: 700 }}>
                  Needs review{unmountedIssues.length ? ` (${unmountedIssues.length})` : ''}
                </MenuItem>
                <MenuItem value="all" sx={{ fontSize: '0.74rem' }}>
                  All statuses
                </MenuItem>
                {ATTENDANCE_STATE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={String(opt.value)} sx={{ fontSize: '0.74rem' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      {getAttendanceIcon(opt.value)}
                      {opt.label}
                    </Box>
                  </MenuItem>
                ))}
                <MenuItem value="0" sx={{ fontSize: '0.74rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {getAttendanceIcon(0)}
                    Uncategorized
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.6 }}>
              {[
                {
                  label: 'From',
                  value: rangeStart,
                  onChange: setRangeStart,
                  minDate: periodStart?.isValid() ? periodStart : undefined,
                  maxDate: rangeEnd?.isValid() ? rangeEnd : periodEnd?.isValid() ? periodEnd : undefined,
                },
                {
                  label: 'To',
                  value: rangeEnd,
                  onChange: setRangeEnd,
                  minDate: rangeStart?.isValid() ? rangeStart : periodStart?.isValid() ? periodStart : undefined,
                  maxDate: periodEnd?.isValid() ? periodEnd : undefined,
                },
              ].map((field) => (
                <Box key={field.label} sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: '0.58rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      color: T.faint,
                      mb: 0.3,
                      textTransform: 'uppercase',
                    }}
                  >
                    {field.label}
                  </Typography>
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    minDate={field.minDate}
                    maxDate={field.maxDate}
                    format="MM/DD/YY"
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                        sx: pickerFieldSx,
                      },
                      popper: { placement: 'bottom-end' },
                    }}
                  />
                </Box>
              ))}
            </Box>

            {filtersActive && (
              <Typography
                component="button"
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setRangeStart(startDate ? dayjs(startDate) : null);
                  setRangeEnd(endDate ? dayjs(endDate) : null);
                }}
                sx={{
                  alignSelf: 'flex-start',
                  border: 'none',
                  bgcolor: 'transparent',
                  p: 0,
                  fontFamily: 'inherit',
                  fontSize: '0.64rem',
                  fontWeight: 700,
                  color: T.accent,
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Clear filters
              </Typography>
            )}
          </Box>
        </LocalizationProvider>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1.25fr 0.85fr 1.15fr',
          px: 1.25,
          py: 0.85,
          bgcolor: T.accent,
          gap: 0.75,
          flexShrink: 0,
        }}
      >
        {[
          { label: 'DATE', sortable: true },
          { label: 'TIME' },
          { label: 'STATUS' },
        ].map(({ label, sortable }) => (
          <Typography
            key={label}
            onClick={sortable ? () => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc')) : undefined}
            sx={{
              color: '#fff',
              fontSize: '0.58rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              cursor: sortable ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              gap: 0.25,
              userSelect: 'none',
              '&:hover': sortable ? { opacity: 0.8 } : {},
            }}
          >
            {label}
            {sortable &&
              (sortOrder === 'asc' ? (
                <KeyboardArrowUp sx={{ fontSize: 12 }} />
              ) : (
                <KeyboardArrowDown sx={{ fontSize: 12 }} />
              ))}
          </Typography>
        ))}
      </Box>

      <Box
        ref={listRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
        }}
      >
        {loading ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <CircularProgress size={22} sx={{ color: T.accent, mb: 1.5 }} />
            <Typography sx={{ fontSize: '0.74rem', color: T.muted, fontWeight: 600 }}>
              Loading punches…
            </Typography>
          </Box>
        ) : !enabled ? (
          <Box sx={{ py: 7, px: 2, textAlign: 'center' }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                bgcolor: T.accentFaint,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 1.5,
              }}
            >
              <Person sx={{ fontSize: 24, color: alpha(T.accent, 0.3) }} />
            </Box>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: T.muted, mb: 0.4 }}>
              Fetch records first
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: T.faint, lineHeight: 1.45 }}>
              Punch statuses appear here so you can correct Time IN / Time OUT without leaving this page.
            </Typography>
          </Box>
        ) : filteredRecords.length === 0 ? (
          <Box sx={{ py: 7, px: 2, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: T.muted, mb: 0.4 }}>
              {statusFilter === 'review' && records.length > 0
                ? 'No punches need review'
                : records.length > 0
                  ? 'No punches match'
                  : 'No punches found'}
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>
              {statusFilter === 'review' && records.length > 0
                ? 'Every tap in this period will print on the DTR.'
                : records.length > 0
                  ? 'Try another status or date range.'
                  : error || 'No device punches in this period.'}
            </Typography>
          </Box>
        ) : (
          pageRecords.map((record, index) => {
            const state = record.AttendanceState;
            const canEdit = Boolean(record.AttendanceDateTime);
            const issue = highlightedRowKeys.has(record._rowKey)
              ? issueByKey.get(record._rowKey)
              : null;
            return (
              <Box
                key={`${record._rowKey}-${index}`}
                sx={{
                  px: 1.25,
                  py: 0.75,
                  bgcolor: issue
                    ? alpha('#c62828', 0.06)
                    : (pageStart + index) % 2 === 0
                      ? '#fff'
                      : T.rowOdd,
                  borderBottom: `1px solid ${T.divider}`,
                  borderLeft: issue ? '3px solid #c62828' : '3px solid transparent',
                  '&:hover': { bgcolor: issue ? alpha('#c62828', 0.1) : T.rowHover },
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1.25fr 0.85fr 1.15fr',
                    gap: 0.75,
                    alignItems: 'center',
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      color: T.text,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {record._dateLabel}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.68rem',
                      color: T.muted,
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {record.Time}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                    <AttendanceStatusChip
                      value={state}
                      saving={savingStatusKey === record._rowKey}
                      editable={canEdit}
                      onOpenMenu={(e) => handleStatusMenuOpen(e, record)}
                    />
                  </Box>
                </Box>
                {issue && (
                  <Typography
                    sx={{
                      mt: 0.35,
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      color: '#c62828',
                      lineHeight: 1.35,
                    }}
                  >
                    {issue.reason}
                  </Typography>
                )}
              </Box>
            );
          })
        )}
      </Box>

      {error && enabled && records.length > 0 && (
        <Box sx={{ px: 1.5, py: 0.75, borderTop: `1px solid ${T.divider}`, bgcolor: alpha('#f44336', 0.06) }}>
          <Typography sx={{ fontSize: '0.68rem', color: '#c62828', fontWeight: 600 }}>
            {error}
          </Typography>
        </Box>
      )}

      {enabled && filteredRecords.length > 0 && (
        <Box
          sx={{
            px: 0.5,
            py: 0.35,
            borderTop: `1px solid ${T.divider}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 0.5,
            flexShrink: 0,
            bgcolor: '#fff',
          }}
        >
          <IconButton
            size="small"
            aria-label="Previous punches"
            disabled={safePage === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            sx={{ color: T.accent, '&.Mui-disabled': { color: T.faint } }}
          >
            <KeyboardArrowLeft sx={{ fontSize: 18 }} />
          </IconButton>
          <Typography
            sx={{
              fontSize: '0.64rem',
              fontWeight: 700,
              color: T.muted,
              whiteSpace: 'nowrap',
            }}
          >
            {pageStart + 1}–{Math.min(pageStart + PUNCH_PAGE_SIZE, filteredRecords.length)} of{' '}
            {filteredRecords.length}
          </Typography>
          <IconButton
            size="small"
            aria-label="Next punches"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
            sx={{ color: T.accent, '&.Mui-disabled': { color: T.faint } }}
          >
            <KeyboardArrowRight sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      )}

      <Box
        sx={{
          px: 1.5,
          py: 0.9,
          borderTop: `1px solid ${T.divider}`,
          bgcolor: T.accentFaint,
          flexShrink: 0,
        }}
      >
        <Typography sx={{ fontSize: '0.64rem', color: T.faint, lineHeight: 1.4 }}>
          Punches that need review stay at the top and stay highlighted. Click a status chip to correct them — the daily record rebuilds after you save.
        </Typography>
      </Box>

      <Menu
        anchorEl={statusMenu.anchor}
        open={Boolean(statusMenu.anchor)}
        onClose={handleStatusMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {ATTENDANCE_STATE_OPTIONS.map((opt) => (
          <MenuItem
            key={opt.value}
            selected={Number(statusMenu.record?.AttendanceState) === opt.value}
            onClick={() => handleStatusPick(opt.value)}
            sx={{ fontSize: '0.76rem' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getAttendanceIcon(opt.value)}
              {opt.label}
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </SidebarCard>
  );
};

export default AttendancePunchStatusSidebar;
