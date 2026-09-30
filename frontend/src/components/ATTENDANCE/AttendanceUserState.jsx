import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Alert,
  Collapse,
  Fade,
  Grid,
  Card,
  Button,
  TextField,
  IconButton,
  Tooltip,
  Pagination,
  MenuItem,
  Select,
  LinearProgress,
  CircularProgress,
  alpha,
  styled,
} from '@mui/material';
import {
  Person,
  AccessTime,
  CheckCircle,
  Cancel,
  Info,
  Refresh,
  KeyboardArrowUp,
  KeyboardArrowDown,
  CalendarToday,
  EventNote,
  Assignment,
  Download as DownloadIcon,
} from '@mui/icons-material';
import {
  AttendanceFilterHeader,
  AttendanceFilterSectionLabel,
  AttendanceFilterYearQuickRow,
  AttendanceFilterMonthHeader,
  AttendanceFilterMonthGrid,
  AttendanceFilterSummaryBox,
  applyQuickDateRange,
  filterPanelScrollSx,
  filterSidebarCardSx,
  attendanceMainPanelHeightSx,
  ATTENDANCE_COMPACT_PAGE_SX,
  MONTHS_SHORT,
  useAttendanceCompactPage,
} from './attendanceFilterLayout';
import AttendanceBranchSource, { punchBranchLabel, punchSourceText } from './AttendanceBranchSource';
import AttendanceExcelReportDialog, { formatReportDate } from './AttendanceExcelReportDialog';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import { downloadStyledExcel, excelTimestamp, excelExporterName } from '../../utils/styledExcelExport';
import { getUserInfo } from '../../utils/auth';

// ─── Theme tokens (same as AttendanceState) ────────────────────────────────
const T = {
  accent:       '#6d2323',
  accentDark:   '#5a1d1d',
  accentMid:    '#8B4545',
  accentFaint:  'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  rowOdd:       'rgba(109,35,35,0.025)',
  rowHover:     'rgba(109,35,35,0.055)',
  text:         '#1a1a1a',
  muted:        '#6b6b6b',
  faint:        '#a0a0a0',
  divider:      'rgba(0,0,0,0.08)',
};

// ─── Styled components (same as AttendanceState) ───────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: '#fff',
});

const FieldInput = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8,
    fontSize: '0.8rem',
    backgroundColor: '#fff',
    '& fieldset': { borderColor: T.accentBorder },
    '&:hover fieldset': { borderColor: T.accent },
    '&.Mui-focused fieldset': { borderColor: T.accent, borderWidth: 1.5 },
  },
  '& .MuiOutlinedInput-input': { py: '6px' },
  '& .MuiInputLabel-root.Mui-focused': { color: T.accent },
});

const SortButton = styled(Button)({
  borderRadius: 6,
  textTransform: 'none',
  fontWeight: 700,
  fontSize: '0.72rem',
  padding: '3px 10px',
  color: T.accent,
  border: `1px solid ${alpha(T.accent, 0.25)}`,
  '&:hover': { backgroundColor: T.accentFaint, borderColor: T.accent },
});

// ─── Attendance state helpers (same colours/labels as AttendanceState) ─────
const getAttendanceColor = (state) => {
  switch (state) {
    case 1: return '#4caf50';
    case 2: return '#ff9800';
    case 3: return '#ff9800';
    case 4: return '#4caf50';
    default: return '#f44336';
  }
};

const getAttendanceIcon = (state) => {
  const color = getAttendanceColor(state);
  switch (state) {
    case 1:
    case 4: return <CheckCircle sx={{ fontSize: 14, color }} />;
    case 2:
    case 3: return <AccessTime sx={{ fontSize: 14, color }} />;
    default: return <Cancel sx={{ fontSize: 14, color }} />;
  }
};

const getAttendanceLabel = (state) => {
  switch (state) {
    case 1: return 'Time IN';
    case 2: return 'Break OUT';
    case 3: return 'Break IN';
    case 4: return 'Time OUT';
    default: return 'Uncategorized';
  }
};

/** Read-only status pill — the same look as AttendanceState's status chip. */
const StatusChip = ({ value }) => {
  const state = Number(value) || 0;
  const color = getAttendanceColor(state);
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.6,
        px: 1.25,
        py: 0.4,
        borderRadius: '12px',
        bgcolor: alpha(color, 0.1),
        border: `1px solid ${alpha(color, 0.25)}`,
      }}
    >
      {getAttendanceIcon(state)}
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color }}>
        {getAttendanceLabel(state)}
      </Typography>
    </Box>
  );
};

// "M/D/YYYY" (API format) → sortable timestamp + readable label
const toISODateFromRecord = (rawDate) => {
  const [month, day, year] = String(rawDate || '').split('/');
  if (!month || !day || !year) return '';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const recordSortTimestamp = (record) => {
  const iso = toISODateFromRecord(record?.Date);
  if (iso) {
    const ts = new Date(`${iso}T${record?.Time || '00:00:00'}`).getTime();
    if (!Number.isNaN(ts)) return ts;
  }
  const fallback = new Date(`${record?.Date || ''} ${record?.Time || ''}`).getTime();
  return Number.isNaN(fallback) ? 0 : fallback;
};

const formatDateLabel = (record) => {
  const iso = toISODateFromRecord(record?.Date);
  const d = iso ? new Date(`${iso}T12:00:00`) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
    : String(record?.Date || '');
};

const COLUMNS = '1.8fr 0.9fr 1.3fr 1.3fr 0.9fr';

const DetailField = ({ label, value }) => (
  <Box>
    <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.faint, mb: 0.25 }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: T.text }}>{value}</Typography>
  </Box>
);

// ─── Main Component ────────────────────────────────────────────────────────
const AttendanceUserState = () => {
  useAttendanceCompactPage();

  const loggedInEmployeeNumber = localStorage.getItem('employeeNumber') || '';
  const today = new Date();
  // Local date (not UTC)
  const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Dynamic page access control — 'attendance-user-state' matches pages.component_identifier
  const { hasAccess, loading: accessLoading } = usePageAccess('attendance-user-state');

  const [personID] = useState(loggedInEmployeeNumber);
  // Signed-in employee's name ("Surname, First Middle Ext") from their own PDS record
  const [employeeName, setEmployeeName] = useState('');
  const [startDate, setStartDate] = useState(formattedToday);
  const [endDate, setEndDate] = useState(formattedToday);
  const [records, setRecords] = useState([]);
  const [submittedID, setSubmittedID] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  // Server-side paging — only one page of punches is loaded at a time
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const lastFilterKeyRef = useRef('');

  // Year / month selector (same controls as AttendanceState)
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const yearOptions = Array.from({ length: 11 }, (_, i) => today.getFullYear() - 5 + i);

  const getAuthHeaders = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });

  const handleMonthClick = (monthIndex) => {
    const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const end = new Date(Date.UTC(selectedYear, monthIndex + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex);
  };

  const resetToToday = () => {
    setStartDate(formattedToday);
    setEndDate(formattedToday);
    setSelectedMonth(null);
  };

  // ── Excel report (same dialog + file layout as Attendance State) ──
  // The table is paged, so the report loads every punch of the period first.
  const [excelOpen, setExcelOpen] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelRecords, setExcelRecords] = useState([]);

  const openExcelDialog = async () => {
    if (!personID || !startDate || !endDate) return;
    setExcelOpen(true);
    setExcelLoading(true);
    try {
      // Unpaged request: widen a day each side, then keep the period's Manila days
      const from = new Date(startDate);
      from.setDate(from.getDate() - 1);
      const to = new Date(endDate);
      to.setDate(to.getDate() + 1);
      const res = await axios.post(
        `${API_BASE_URL}/attendance/api/attendance`,
        { personID, startDate: from.toISOString().substring(0, 10), endDate: to.toISOString().substring(0, 10) },
        getAuthHeaders(),
      );
      const all = (Array.isArray(res.data) ? res.data : [])
        .map((r) => ({ ...r, _isoDate: toISODateFromRecord(r.Date), _sortTs: recordSortTimestamp(r) }))
        .filter((r) => r._isoDate && r._isoDate >= startDate && r._isoDate <= endDate);
      setExcelRecords(all);
    } catch (err) {
      console.error('Loading punches for Excel failed:', err);
      setError('Failed to load attendance records for the Excel report.');
      setExcelOpen(false);
    } finally {
      setExcelLoading(false);
    }
  };

  const handleDownloadExcel = (chosen, { fromDate, toDate, selectedDates }) => {
    try {
      const rows = chosen.map((record) => ({
        employeeNumber: record.PersonID || personID || '—',
        name: employeeName || '—',
        date: formatDateLabel(record),
        time: record.Time || '—',
        status: getAttendanceLabel(Number(record.AttendanceState) || 0),
        branch: punchSourceText(record),
        punch: record.AttendanceDateTime || '—',
      }));
      const filterParts = [`Employee: ${personID}`];
      if (selectedDates.length) filterParts.push(`Selected dates: ${selectedDates.map(formatReportDate).join(', ')}`);
      else filterParts.push(`Report range: ${fromDate} to ${toDate}`);
      filterParts.push(`Sort: ${sortOrder === 'asc' ? 'oldest first' : 'newest first'}`);

      const stamp = new Date().toISOString().slice(0, 10);
      const safeId = String(personID || 'employee').replace(/[^\w.-]+/g, '_');
      downloadStyledExcel({
        filename: `My-Attendance-Records_${safeId}_${stamp}.xlsx`,
        sheetName: 'Attendance States',
        title: 'My Attendance Records',
        subtitle: [employeeName, personID ? `#${personID}` : ''].filter(Boolean).join(' · ') || 'Attendance punches',
        generatedAt: excelTimestamp(),
        exportedBy: excelExporterName(getUserInfo()),
        recordCount: rows.length,
        filtersLabel: filterParts.join(' | '),
        columns: [
          { key: 'employeeNumber', header: 'Employee No.', width: 110, kind: 'mono' },
          { key: 'name', header: 'Name', width: 200 },
          { key: 'date', header: 'Date', width: 160 },
          { key: 'time', header: 'Time', width: 90, kind: 'mono' },
          { key: 'status', header: 'Status', width: 150, kind: 'status' },
          { key: 'branch', header: 'Branch (device)', width: 170 },
          { key: 'punch', header: 'Punch timestamp', width: 180, kind: 'mono' },
        ],
        rows,
      });
      setExcelOpen(false);
    } catch (err) {
      console.error('Attendance Excel export failed:', err);
      setError('Failed to generate Excel export.');
    }
  };

  const fetchRecords = async (showLoading = true) => {
    if (!personID || !startDate || !endDate) return;
    if (showLoading) setLoading(true);
    try {
      // One page of punches for the exact Manila days of the range, sorted by
      // the server; `total` drives the pager.
      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/attendance`,
        { personID, startDate, endDate, page, pageSize, sort: sortOrder },
        getAuthHeaders(),
      );

      const body = response.data || {};
      setRecords(Array.isArray(body.data) ? body.data : []);
      setTotal(Number(body.total) || 0);
      setSubmittedID(personID);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch attendance records');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    // A new range, sort or page size starts again at page 1 (without first
    // fetching the old page number for the new range).
    const filterKey = `${startDate}|${endDate}|${sortOrder}|${pageSize}`;
    if (lastFilterKeyRef.current !== filterKey) {
      lastFilterKeyRef.current = filterKey;
      setExpandedRow(null);
      if (page !== 1) {
        setPage(1);
        return undefined;
      }
    }

    fetchRecords();

    // Smart refresh: only while the tab is visible, every 30 seconds
    const intervalId = setInterval(() => {
      if (!document.hidden) fetchRecords(false);
    }, 30000);

    // Refresh when the user returns to the tab
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchRecords(false);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personID, startDate, endDate, page, pageSize, sortOrder]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const firstShown = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastShown = Math.min(page * pageSize, total);

  // Same lookup the employee Home page uses for the signed-in user's own name
  useEffect(() => {
    if (!personID) return undefined;
    let cancelled = false;
    axios
      .get(`${API_BASE_URL}/personalinfo/person_table/${encodeURIComponent(personID)}`, getAuthHeaders())
      .then((res) => {
        if (cancelled) return;
        const p = Array.isArray(res.data) ? (res.data[0] ?? {}) : (res.data ?? {});
        const given = [p.firstName, p.middleName, p.nameExtension]
          .map((v) => String(v || '').trim())
          .filter(Boolean)
          .join(' ');
        const last = String(p.lastName || '').trim();
        setEmployeeName(last && given ? `${last}, ${given}` : (last || given));
      })
      .catch(() => { /* keep showing the employee number */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personID]);

  // The server already sorts; this keeps the page in order if punches share a second
  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => {
      const diff = recordSortTimestamp(a) - recordSortTimestamp(b);
      return sortOrder === 'asc' ? diff : -diff;
    }),
    [records, sortOrder],
  );

  // ── Guards ──
  if (accessLoading) {
    return (
      <Box sx={{ py: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
        <CircularProgress size={28} sx={{ color: T.accent }} />
        <Typography sx={{ fontSize: '0.85rem', color: T.accent, fontWeight: 600 }}>
          Loading access information...
        </Typography>
      </Box>
    );
  }
  if (hasAccess === false) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Attendance User State. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }

  // ─── Left panel ────────────────────────────────────────────────────────
  const renderLeftPanel = () => (
    <Box sx={filterPanelScrollSx}>
      {/* Whose records — always the signed-in employee */}
      <Box
        sx={{
          mb: 1.25,
          p: 1.25,
          borderRadius: '12px',
          border: `2px solid ${T.accent}`,
          bgcolor: alpha(T.accent, 0.04),
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
        }}
      >
        <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: T.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Person sx={{ fontSize: 20 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: alpha(T.accent, 0.65) }}>
            Your Records
          </Typography>
          <Tooltip title={employeeName || ''} disableHoverListener={!employeeName}>
            <Typography noWrap sx={{ fontSize: '0.88rem', fontWeight: 800, color: T.text, lineHeight: 1.25 }}>
              {employeeName || `#${personID || '—'}`}
            </Typography>
          </Tooltip>
          {employeeName && (
            <Typography sx={{ fontSize: '0.7rem', color: T.muted, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              #{personID}
            </Typography>
          )}
        </Box>
      </Box>

      <AttendanceFilterYearQuickRow
        selectedYear={selectedYear}
        onYearChange={(e) => {
          setSelectedYear(parseInt(e.target.value, 10));
          setSelectedMonth(null);
        }}
        yearOptions={yearOptions}
        onQuickDate={(value) => applyQuickDateRange(value, setStartDate, setEndDate, setSelectedMonth)}
      />
      <AttendanceFilterMonthHeader
        onClear={resetToToday}
        showClear={selectedMonth !== null}
      />
      <AttendanceFilterMonthGrid
        months={MONTHS_SHORT}
        selectedMonth={selectedMonth}
        onMonthClick={handleMonthClick}
      />

      <AttendanceFilterSectionLabel icon={CalendarToday}>Date Range</AttendanceFilterSectionLabel>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', mb: 1.25 }}>
        <FieldInput
          size="small"
          type="date"
          label="From"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setSelectedMonth(null); }}
          InputLabelProps={{ shrink: true }}
          inputProps={{ max: endDate || undefined }}
        />
        <FieldInput
          size="small"
          type="date"
          label="To"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setSelectedMonth(null); }}
          InputLabelProps={{ shrink: true }}
          inputProps={{ min: startDate || undefined }}
        />
      </Box>

      <AttendanceFilterSummaryBox
        title="Record Summary"
        primary={
          loading
            ? 'Loading records...'
            : `${total} ${total === 1 ? 'record' : 'records'} found`
        }
        secondary={startDate && endDate ? `${startDate} → ${endDate}` : 'Choose a month or date range.'}
      />
      {(startDate !== formattedToday || endDate !== formattedToday) && (
        <Typography
          onClick={resetToToday}
          sx={{ fontSize: '0.68rem', color: T.accent, fontWeight: 700, mt: 0.75, cursor: 'pointer', width: 'fit-content', '&:hover': { textDecoration: 'underline' } }}
        >
          Back to today
        </Typography>
      )}
    </Box>
  );

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <Fade in timeout={150}>
      <Box sx={ATTENDANCE_COMPACT_PAGE_SX}>
        {/* ── Page Header (same as AttendanceState) ── */}
        <SectionCard sx={{ mb: 2 }}>
          <Box
            sx={{
              px: 4, py: 3,
              background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              position: 'relative', overflow: 'hidden',
            }}
          >
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.10) 0%,transparent 70%)' }} />
            <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)' }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
              <EventNote sx={{ fontSize: 32, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3 }}>
                  My Attendance Records
                </Typography>
                <Typography sx={{ fontSize: '0.82rem', color: T.accentMid, fontWeight: 700, opacity: 0.9 }}>
                  View your attendance punches and their states
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
              <Box sx={{ px: 2, py: 0.6, borderRadius: 5, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.18)}` }}>
                <Typography sx={{ fontSize: '0.72rem', color: T.accent, fontWeight: 700 }}>System Generated</Typography>
              </Box>
              {total > 0 && (
                <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                  <Typography sx={{ fontSize: '0.8rem', color: T.accent, fontWeight: 700 }}>
                    {total} records
                  </Typography>
                </Box>
              )}
              <Tooltip title="Refresh Data">
                <IconButton
                  onClick={() => fetchRecords(true)}
                  sx={{ bgcolor: alpha(T.accent, 0.08), color: T.accent, width: 36, height: 36, '&:hover': { bgcolor: alpha(T.accent, 0.15) } }}
                >
                  <Refresh sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </SectionCard>

        <Collapse in={!!error}>
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.82rem' }}>
            {error}
          </Alert>
        </Collapse>

        {/* ── Two-column layout ── */}
        <Grid container spacing={2}>
          {/* LEFT: Sidebar */}
          <Grid item xs={12} lg={3}>
            <SectionCard sx={filterSidebarCardSx}>
              <AttendanceFilterHeader />
              {renderLeftPanel()}
            </SectionCard>
          </Grid>

          {/* RIGHT: Records */}
          <Grid item xs={12} lg={9}>
            <SectionCard sx={{ ...attendanceMainPanelHeightSx, display: 'flex', flexDirection: 'column', position: 'relative' }}>
              {/* Toolbar */}
              <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Assignment sx={{ fontSize: 15, color: T.accent }} />
                    <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: T.text }}>
                      Attendance States
                    </Typography>
                  </Box>
                  {total > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: '0.72rem', color: T.muted, fontWeight: 600 }}>
                        {total.toLocaleString()} punch{total === 1 ? '' : 'es'}
                      </Typography>
                      <Tooltip title="Choose dates and download your attendance as Excel">
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<DownloadIcon sx={{ fontSize: '13px !important' }} />}
                          onClick={openExcelDialog}
                          disabled={excelLoading}
                          aria-label="Download attendance as Excel"
                          sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            color: T.accent,
                            borderColor: alpha(T.accent, 0.35),
                            bgcolor: '#fff',
                            boxShadow: 'none',
                            '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent },
                          }}
                        >
                          Excel
                        </Button>
                      </Tooltip>
                      <SortButton
                        size="small"
                        onClick={() => setSortOrder((s) => (s === 'asc' ? 'desc' : 'asc'))}
                        startIcon={sortOrder === 'asc' ? <KeyboardArrowUp sx={{ fontSize: 14 }} /> : <KeyboardArrowDown sx={{ fontSize: 14 }} />}
                      >
                        Sort {sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
                      </SortButton>
                    </Box>
                  )}
                </Box>
              </Box>
              {loading && (
                <LinearProgress sx={{ flexShrink: 0, height: 2, bgcolor: T.accentFaint, '& .MuiLinearProgress-bar': { bgcolor: T.accent } }} />
              )}

              {/* Records area */}
              <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {!submittedID ? (
                  <Box sx={{ py: 10, textAlign: 'center' }}>
                    <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                      <Person sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                    </Box>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>
                      {loading ? 'Loading your records…' : 'Select a Period'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>
                      Choose a month or date range from the left panel.
                    </Typography>
                  </Box>
                ) : sortedRecords.length === 0 && !loading ? (
                  <Box sx={{ py: 10, textAlign: 'center' }}>
                    <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                      <Info sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                    </Box>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>
                      No records found
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>
                      Try adjusting your date range.
                    </Typography>
                  </Box>
                ) : (
                  <>
                    {/* Column headers */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: COLUMNS, px: 2.5, py: 1.25, bgcolor: T.accent, gap: 2, flexShrink: 0 }}>
                      {[
                        { label: 'DATE', sortable: true },
                        { label: 'TIME' },
                        { label: 'STATUS' },
                        { label: 'BRANCH' },
                        { label: 'DETAILS' },
                      ].map(({ label, sortable }) => (
                        <Typography
                          key={label}
                          onClick={sortable ? () => setSortOrder((s) => (s === 'asc' ? 'desc' : 'asc')) : undefined}
                          sx={{
                            color: '#fff',
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            cursor: sortable ? 'pointer' : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            userSelect: 'none',
                            '&:hover': sortable ? { opacity: 0.8 } : {},
                          }}
                        >
                          {label}
                          {sortable && (sortOrder === 'asc'
                            ? <KeyboardArrowUp sx={{ fontSize: 14 }} />
                            : <KeyboardArrowDown sx={{ fontSize: 14 }} />)}
                        </Typography>
                      ))}
                    </Box>

                    {/* Rows */}
                    <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                      {sortedRecords.map((record, idx) => {
                        const isOpen = expandedRow === idx;
                        return (
                          <Box key={`${record.Date}|${record.Time}|${idx}`}>
                            <Box
                              onClick={() => setExpandedRow(isOpen ? null : idx)}
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: COLUMNS,
                                px: 2.5,
                                py: 1.5,
                                gap: 2,
                                alignItems: 'center',
                                minHeight: 52,
                                boxSizing: 'border-box',
                                cursor: 'pointer',
                                bgcolor: isOpen ? T.rowHover : (idx % 2 === 0 ? '#fff' : T.rowOdd),
                                borderBottom: `1px solid ${T.divider}`,
                                transition: 'background 0.12s',
                                '&:hover': { bgcolor: T.rowHover },
                              }}
                            >
                              <Typography sx={{ fontWeight: 600, fontSize: '0.82rem', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {formatDateLabel(record)}
                              </Typography>
                              <Typography sx={{ fontSize: '0.8rem', color: T.muted, fontWeight: 500 }}>
                                {record.Time}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <StatusChip value={record.AttendanceState} />
                              </Box>
                              <AttendanceBranchSource record={record} />
                              <Box
                                component="span"
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  width: 'fit-content',
                                  px: 1.25,
                                  py: 0.4,
                                  borderRadius: '6px',
                                  border: `1px solid ${alpha(T.accent, 0.25)}`,
                                  color: T.accent,
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                }}
                              >
                                {isOpen ? 'Hide' : 'View'}
                                {isOpen ? <KeyboardArrowUp sx={{ fontSize: 14 }} /> : <KeyboardArrowDown sx={{ fontSize: 14 }} />}
                              </Box>
                            </Box>
                            <Collapse in={isOpen} unmountOnExit>
                              <Box sx={{ px: 2.5, py: 1.5, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.divider}`, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 2 }}>
                                <DetailField label="Employee ID" value={record.PersonID || personID} />
                                <DetailField label="Date" value={record.Date} />
                                <DetailField label="Time" value={record.Time} />
                                <DetailField label="Status" value={getAttendanceLabel(record.AttendanceState)} />
                                <DetailField label="Branch" value={punchBranchLabel(record.Branch)} />
                                <DetailField
                                  label="Device"
                                  value={record.DeviceName
                                    ? record.DeviceName
                                    : '—'}
                                />
                              </Box>
                            </Collapse>
                          </Box>
                        );
                      })}
                    </Box>
                  </>
                )}
              </Box>

              {/* Pager — the server sends one page at a time */}
              {total > 0 && (
                <Box sx={{ px: 2.5, py: 1, borderTop: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '0.72rem', color: T.muted, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {firstShown}–{lastShown} of {total.toLocaleString()}
                    </Typography>
                    <Select
                      size="small"
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      inputProps={{ 'aria-label': 'Rows per page' }}
                      sx={{
                        fontSize: '0.72rem',
                        bgcolor: '#fff',
                        borderRadius: '6px',
                        '& .MuiSelect-select': { py: '3px', pl: 1 },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accent },
                      }}
                    >
                      {[25, 50, 100].map((n) => (
                        <MenuItem key={n} value={n} sx={{ fontSize: '0.76rem' }}>{n} / page</MenuItem>
                      ))}
                    </Select>
                  </Box>
                  <Pagination
                    count={pageCount}
                    page={Math.min(page, pageCount)}
                    onChange={(_, p) => { setPage(p); setExpandedRow(null); }}
                    size="small"
                    siblingCount={1}
                    disabled={loading}
                    sx={{
                      '& .MuiPaginationItem-root': { fontSize: '0.74rem', fontWeight: 600, color: T.muted },
                      '& .MuiPaginationItem-root.Mui-selected': { bgcolor: T.accent, color: '#fff', '&:hover': { bgcolor: T.accentDark } },
                    }}
                  />
                </Box>
              )}
            </SectionCard>
          </Grid>
        </Grid>

        <AttendanceExcelReportDialog
          open={excelOpen}
          onClose={() => setExcelOpen(false)}
          periodStart={startDate}
          periodEnd={endDate}
          records={excelRecords}
          loading={excelLoading}
          sortOrder={sortOrder}
          onDownload={handleDownloadExcel}
        />
      </Box>
    </Fade>
  );
};

export default AttendanceUserState;
