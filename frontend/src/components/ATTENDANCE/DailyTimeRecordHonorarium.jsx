import API_BASE_URL from '../../apiConfig';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { useSocket } from '../../contexts/SocketContext';
import LoadingOverlay from '../LoadingOverlay';
import { jwtDecode } from 'jwt-decode';
import { AccessTime, CalendarToday, Refresh } from '@mui/icons-material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrintIcon from '@mui/icons-material/Print';
import {
  Box,
  Button,
  Card,
  Fade,
  IconButton,
  Paper,
  styled,
  Tooltip,
  Typography,
  CircularProgress as MCircularProgress,
  Snackbar,
  Alert,
  Grid,
} from '@mui/material';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { alpha } from '@mui/material/styles';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import {
  AttendanceFilterHeader,
  AttendanceFilterSectionLabel,
  AttendanceFilterDateControls,
  applyQuickDateRange,
  filterPanelScrollSx,
  filterSidebarCardSx,
  attendanceMainPanelHeightSx,
  MONTHS_SHORT,
  ATTENDANCE_COMPACT_PAGE_SX,
  useAttendanceCompactPage,
} from './attendanceFilterLayout';
import DTRTemplate from './DTRTemplate';
import { DTRPrintStyles, printDtrHtml, downloadDtrHtml } from './DailyTimeRecordPrintable';
import { fetchEmployeeDisplayName, formatDtrPdfFileName } from '../../utils/dtrFormatHelpers';

// ─── DESIGN TOKENS (unified with DailyTimeRecordFaculty / DailyTimeRecord) ───
const T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  accentMid: '#8B4545',
  accentFaint: 'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover: 'rgba(109,35,35,0.10)',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#a0a0a0',
  surface: '#ffffff',
  divider: 'rgba(0,0,0,0.08)',
};

const scrollbarSx = {
  '&::-webkit-scrollbar': { width: 4 },
  '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
  '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
};

// ─── STYLED COMPONENTS (kept local, same tokens as the hub view) ─────────────

const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: T.surface,
});

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.875rem',
  letterSpacing: '0.01em',
  transition: 'all 0.18s ease',
  '&:hover': { transform: 'translateY(-1px)' },
  '&:active': { transform: 'translateY(0)' },
});

const FormSectionLabel = ({ icon: Icon, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
    <Icon sx={{ fontSize: 12, color: alpha(T.accent, 0.45) }} />
    <Typography
      sx={{
        fontSize: '0.68rem',
        fontWeight: 700,
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        color: alpha(T.accent, 0.45),
      }}
    >
      {children}
    </Typography>
  </Box>
);

// ─── COMPONENT ────────────────────────────────────────────────────────────────

const DailyTimeRecordHonorarium = () => {
  const { socket, connected } = useSocket();
  const { settings } = useSystemSettings();

  // ── Core state ─────────────────────────────────────────────────────────────
  const [personID, setPersonID] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [records, setRecords] = useState([]);
  const [employeeName, setEmployeeName] = useState('');
  const [employeeNameParts, setEmployeeNameParts] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
  });
  const [officialTimes, setOfficialTimes] = useState({});
  const dtrRef = useRef(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [suspensions, setSuspensions] = useState([]);
  const [approvedLeaves, setApprovedLeaves] = useState([]);

  // ── Loading states ──────────────────────────────────────────────────────────
  const [monthLoading, setMonthLoading] = useState(false);
  const [singlePrintLoading, setSinglePrintLoading] = useState(false);
  const [singlePrintStatus, setSinglePrintStatus] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const initialLoadDone = useRef(false);
  const fetchRequestSeqRef = useRef(0);

  // ── Snackbar ───────────────────────────────────────────────────────────────
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // ── Year selector ──────────────────────────────────────────────────────────
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const monthsShort = MONTHS_SHORT;

  // ── Theme colours (kept for parity, unused for layout now) ────────────────
  const primaryColor = settings.accentColor || '#FEF9E1';
  const secondaryColor = settings.backgroundColor || '#FFF8E7';
  const accentColor = settings.primaryColor || '#6d2323';
  const accentDark = settings.secondaryColor || '#8B3333';
  const textPrimaryColor = settings.textPrimaryColor || '#6d2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';

  // ── Access guard ───────────────────────────────────────────────────────────
  const { hasAccess, loading: accessLoading } = usePageAccess('daily-time-record-honorarium');

  // Same compact page treatment as the hub (Faculty) DTR view.
  useAttendanceCompactPage();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  };

  // ── Decode token ───────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setPersonID(decoded.employeeNumber);
      } catch (err) {
        console.error('Error decoding token:', err);
      }
    }
  }, []);

  // ── Formatters ─────────────────────────────────────────────────────────────
  const formatTime = useCallback((timeString) => {
    if (!timeString) return '';
    const cleaned = timeString.replace(/\s+/g, ' ').trim();
    const match = cleaned.match(/^(\d{1,2}:\d{2})(?::\d{2})?(\s*[AaPp][Mm])?/);
    if (match) {
      return (match[1] + (match[2] ? match[2].trim().toUpperCase() : '')).trim();
    }
    return cleaned;
  }, []);

  // ── Fetchers ───────────────────────────────────────────────────────────────
  const fetchRecords = async () => {
    const requestSeq = ++fetchRequestSeqRef.current;
    setMonthLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/view-attendance`,
        { personID, startDate, endDate, type: 'HONORARIUM' },
        getAuthHeaders(),
      );
      if (requestSeq !== fetchRequestSeqRef.current) return;
      const data = response.data;
      const honorariumRecords = data.filter(
        (r) => r.specialType === 'HONORARIUM' && (r.specialTimeIN || r.specialTimeOUT),
      );
      if (data.length > 0) {
        setRecords(honorariumRecords);
        const { firstName, lastName, middleName } = data[0];
        const full = `${firstName || ''} ${middleName ? middleName + ' ' : ''}${lastName || ''}`.trim();
        setEmployeeName(full || 'Unknown');
        setEmployeeNameParts({
          firstName: firstName || '',
          lastName: lastName || '',
          middleName: middleName || '',
        });
        await fetchOfficialTimes(personID);
      } else {
        setRecords([]);
        await fetchOfficialTimes(personID);
        const name = await fetchEmployeeDisplayName(
          API_BASE_URL,
          personID,
          getAuthHeaders(),
        );
        if (name) setEmployeeName(name);
        else
          setEmployeeName((prev) =>
            prev && prev !== 'No records found' ? prev : '',
          );
        setEmployeeNameParts({
          firstName: '',
          lastName: '',
          middleName: '',
          fullName: name || '',
        });
      }
    } catch (err) { console.error(err); }
    finally {
      if (requestSeq === fetchRequestSeqRef.current) setMonthLoading(false);
    }
  };

  const fetchOfficialTimes = async (employeeID) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/officialtimetable/${employeeID}`, getAuthHeaders());
      const map = response.data.reduce((acc, r) => {
        acc[r.day] = {
          officialTimeIN: r.officialTimeIN, officialTimeOUT: r.officialTimeOUT,
          officialBreaktimeIN: r.officialBreaktimeIN, officialBreaktimeOUT: r.officialBreaktimeOUT,
          officialHonorariumTimeIN: r.officialHonorariumTimeIN, officialHonorariumTimeOUT: r.officialHonorariumTimeOUT,
          officialServiceCreditTimeIN: r.officialServiceCreditTimeIN, officialServiceCreditTimeOUT: r.officialServiceCreditTimeOUT,
          officialOverTimeIN: r.officialOverTimeIN, officialOverTimeOUT: r.officialOverTimeOUT,
        };
        return acc;
      }, {});
      setOfficialTimes(map);
    } catch (err) { console.error('Error fetching official times:', err); setOfficialTimes({}); }
  };

  const fetchApprovedLeaves = async (empID) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/leaveRoute/leave_request`, getAuthHeaders());
      const hrApproved = response.data.filter(
        (req) => String(req.status) === '2' && String(req.employeeNumber) === String(empID),
      );
      setApprovedLeaves(hrApproved);
    } catch (err) { console.error('Error fetching approved leaves:', err); setApprovedLeaves([]); }
  };

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!personID || initialLoadDone.current) return;
    initialLoadDone.current = true;
    const init = async () => {
      await Promise.allSettled([
        fetchOfficialTimes(personID),
        fetchApprovedLeaves(personID),
        axios.get(`${API_BASE_URL}/holiday`, getAuthHeaders()).then((r) => {
          setHolidays(Array.isArray(r.data) ? r.data : []);
        }).catch(() => setHolidays([])),
        axios.get(`${API_BASE_URL}/api/suspensions`, getAuthHeaders()).then((r) => {
          setSuspensions(Array.isArray(r.data) ? r.data : []);
        }).catch(() => setSuspensions([])),
      ]);
      setPageLoading(false);
    };
    init();
  }, [personID]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (personID && startDate && endDate) fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personID, startDate, endDate]);

  const fetchRecordsRef = useRef(fetchRecords);
  fetchRecordsRef.current = fetchRecords;

  useEffect(() => {
    if (!socket || !connected) return;
    let debounceTimer = null;
    const handleAttendanceChanged = (payload) => {
      if (payload?.action === 'dtr-printed') return;
      const scope = payload?.scope;
      if (scope === 'suspensions' || scope === 'leaves' || scope === 'holiday') return;
      const changedIDs = Array.isArray(payload?.personIDs)
        ? payload.personIDs
        : payload?.personID != null
          ? [payload.personID]
          : [];
      const isBulk = payload?.action === 'bulk-auto-sync';
      if (changedIDs.length === 0 && !isBulk) return;
      if (personID && changedIDs.length > 0 && !changedIDs.some((id) => String(id) === String(personID))) return;
      if (!personID || !startDate || !endDate) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchRecordsRef.current?.(), 120);
    };
    socket.on('attendanceChanged', handleAttendanceChanged);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      socket.off('attendanceChanged', handleAttendanceChanged);
    };
  }, [socket, connected, personID, startDate, endDate]);

  // Print uses fast HTML; Download auto-saves:
  // Surname, First Name, MI. Month, Year.pdf
  const resolveSinglePdfName = () =>
    formatDtrPdfFileName(
      { ...employeeNameParts, fullName: employeeName },
      startDate,
    );

  const printPage = async () => {
    if (!dtrRef.current) return;
    await printDtrHtml(dtrRef.current, {
      title: resolveSinglePdfName().replace(/\.pdf$/i, ''),
    });
  };

  const downloadPDF = async () => {
    if (!dtrRef.current) return;
    setSinglePrintLoading(true);
    setSinglePrintStatus('Preparing PDF download…');
    try {
      await downloadDtrHtml(dtrRef.current, resolveSinglePdfName());
    } catch (error) {
      console.error('Error downloading DTR PDF:', error);
      setSnackbar({
        open: true,
        message: error?.message || 'Failed to download PDF.',
        severity: 'error',
      });
    } finally {
      setSinglePrintLoading(false);
      setSinglePrintStatus('');
    }
  };

  // ── Month / quick-date selection (shared with the hub DTR view) ────────────
  const handleMonthClick = (monthIndex) => {
    const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const end = new Date(Date.UTC(selectedYear, monthIndex + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex);
  };

  const handleQuickDateSelect = (value) => {
    applyQuickDateRange(value, setStartDate, setEndDate, setSelectedMonth);
    setRecords([]);
    setEmployeeName('');
    setEmployeeNameParts({ firstName: '', lastName: '', middleName: '' });
  };

  // ── Access guard ───────────────────────────────────────────────────────────
  if (!accessLoading && hasAccess === false) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Daily Time Record - Honorarium. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }

  const loadingOverlayOpen =
    accessLoading || pageLoading || monthLoading || singlePrintLoading;

  const loadingOverlayMessage = (() => {
    if (accessLoading) return 'Checking access…';
    if (pageLoading) return 'Loading Honorarium DTR…';
    if (singlePrintLoading) return singlePrintStatus || 'Preparing DTR…';
    if (monthLoading)
      return selectedMonth !== null
        ? `Honorarium DTR — ${monthsShort[selectedMonth]}…`
        : 'Honorarium DTR — Fetching records…';
    return 'Processing…';
  })();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <LoadingOverlay
        open={loadingOverlayOpen}
        message={loadingOverlayMessage}
        showDelayMs={singlePrintLoading ? 0 : 150}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {!accessLoading && !pageLoading && (
        <Fade in timeout={500}>
          <Box>
            <DTRPrintStyles />

            <Box sx={ATTENDANCE_COMPACT_PAGE_SX}>
              {/* ── Page Header — unified with the hub (Faculty) DTR view ── */}
              <SectionCard className="no-print" sx={{ mb: 2, overflow: 'hidden' }}>
                <Box
                  sx={{
                    px: 4,
                    py: 3,
                    background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -50,
                      right: -50,
                      width: 200,
                      height: 200,
                      borderRadius: '50%',
                      background:
                        'radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -30,
                      left: '30%',
                      width: 150,
                      height: 150,
                      borderRadius: '50%',
                      background:
                        'radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)',
                    }}
                  />
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <AccessTime sx={{ fontSize: 32, color: T.accent }} />
                    <Box>
                      <Typography
                        sx={{
                          fontSize: '1.25rem',
                          fontWeight: 900,
                          color: T.accent,
                          lineHeight: 1.2,
                          mb: 0.3,
                        }}
                      >
                        Daily Time Record - Honorarium
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.82rem',
                          color: T.accentMid,
                          fontWeight: 700,
                          opacity: 0.9,
                        }}
                      >
                        Employee Portal — view and download your honorarium DTR records
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <Box
                      sx={{
                        px: 2.5,
                        py: 0.75,
                        borderRadius: 6,
                        bgcolor: alpha(T.accent, 0.1),
                        border: `1px solid ${alpha(T.accent, 0.2)}`,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '0.8rem',
                          color: T.accent,
                          fontWeight: 700,
                        }}
                      >
                        {records.length} records
                      </Typography>
                    </Box>
                    <Tooltip title="Refresh Page">
                      <IconButton
                        onClick={() => window.location.reload()}
                        sx={{
                          bgcolor: alpha(T.accent, 0.08),
                          color: T.accent,
                          width: 36,
                          height: 36,
                          '&:hover': { bgcolor: alpha(T.accent, 0.15) },
                        }}
                      >
                        <Refresh sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </SectionCard>

              {/* ── Two-column layout — same Grid + SectionCard rules as the hub view ── */}
              <Grid container spacing={2}>
                {/* LEFT: shared filter sidebar */}
                <Grid item xs={12} lg={3} className="no-print">
                  <SectionCard sx={filterSidebarCardSx}>
                    <AttendanceFilterHeader />
                    <Box sx={filterPanelScrollSx}>
                      {/* Employee (read-only, resolved from token) */}
                      <FormSectionLabel icon={AccessTime}>
                        Employee
                      </FormSectionLabel>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          px: 1.5,
                          py: 1.1,
                          mb: 2.5,
                          borderRadius: '8px',
                          border: `1px dashed ${T.accentBorder}`,
                          bgcolor: alpha(T.accent, 0.03),
                          cursor: 'not-allowed',
                          userSelect: 'none',
                        }}
                      >
                        <AccessTime
                          sx={{
                            fontSize: 14,
                            color: alpha(T.accent, 0.4),
                            flexShrink: 0,
                          }}
                        />
                        <Typography
                          sx={{
                            fontSize: '0.82rem',
                            color: T.muted,
                            fontWeight: 600,
                            flex: 1,
                          }}
                        >
                          {personID || '—'}
                        </Typography>
                        <Box
                          sx={{
                            px: 0.75,
                            py: 0.2,
                            borderRadius: '4px',
                            bgcolor: alpha(T.accent, 0.08),
                            border: `1px solid ${alpha(T.accent, 0.15)}`,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: '0.58rem',
                              color: T.accent,
                              fontWeight: 700,
                              letterSpacing: '0.05em',
                            }}
                          >
                            AUTO
                          </Typography>
                        </Box>
                      </Box>

                      {/* Year / Month — same shared control as the hub view */}
                      <AttendanceFilterDateControls
                        selectedYear={selectedYear}
                        onYearChange={(e) => {
                          setSelectedYear(parseInt(e.target.value));
                          setSelectedMonth(null);
                          setRecords([]);
                          setStartDate('');
                          setEndDate('');
                          setSnackbar({
                            open: true,
                            message:
                              'Year changed — please click a month to load records.',
                            severity: 'info',
                          });
                        }}
                        yearOptions={yearOptions}
                        selectedMonth={selectedMonth}
                        onMonthClick={handleMonthClick}
                        onMonthClear={() => {
                          setSelectedMonth(null);
                          setRecords([]);
                          setStartDate('');
                          setEndDate('');
                        }}
                        onQuickDate={handleQuickDateSelect}
                        months={monthsShort}
                      />

                      <Box
                        sx={{
                          mt: 2,
                          mb: 2.5,
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: T.accentFaint,
                          border: `1px solid ${T.accentBorder}`,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: alpha(T.accent, 0.6),
                            mb: 0.5,
                          }}
                        >
                          Total Records
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.9rem',
                            fontWeight: 800,
                            color: T.text,
                            lineHeight: 1.3,
                          }}
                        >
                          {records.length}{' '}
                          {records.length === 1 ? 'record' : 'records'} found
                        </Typography>
                        <Typography
                          sx={{ fontSize: '0.75rem', color: T.muted, mt: 0.4 }}
                        >
                          {selectedMonth !== null
                            ? `For ${monthsShort[selectedMonth]} ${selectedYear}.`
                            : 'Select a month to load your honorarium DTR.'}
                        </Typography>
                      </Box>
                    </Box>
                  </SectionCard>
                </Grid>

                {/* RIGHT: DTR preview panel */}
                <Grid item xs={12} lg={9}>
                  <SectionCard
                    sx={{
                      ...attendanceMainPanelHeightSx,
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                    }}
                  >
                    {/* Toolbar */}
                    <Box
                      sx={{
                        px: 3.5,
                        py: 2,
                        borderBottom: `1px solid ${T.divider}`,
                        bgcolor: T.accentFaint,
                        flexShrink: 0,
                      }}
                      className="no-print"
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                        >
                          <AccessTime sx={{ fontSize: 15, color: T.accent }} />
                          <Typography
                            sx={{
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              color: T.text,
                            }}
                          >
                            DTR Preview
                          </Typography>
                          {selectedMonth !== null && (
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.75,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 4,
                                  height: 4,
                                  borderRadius: '50%',
                                  bgcolor: T.faint,
                                }}
                              />
                              <Typography
                                sx={{
                                  fontSize: '0.78rem',
                                  color: T.muted,
                                  fontWeight: 500,
                                }}
                              >
                                {employeeName}
                              </Typography>
                              <Box
                                sx={{
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  color: T.accent,
                                  bgcolor: alpha(T.accent, 0.08),
                                  border: `1px solid ${T.accentBorder}`,
                                  borderRadius: '5px',
                                  px: '6px',
                                  py: '2px',
                                }}
                              >
                                {monthsShort[selectedMonth]}
                              </Box>
                              <Box
                                sx={{
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  color: '#fff',
                                  bgcolor: T.accentMid,
                                  borderRadius: '5px',
                                  px: '6px',
                                  py: '2px',
                                }}
                              >
                                HONORARIUM
                              </Box>
                            </Box>
                          )}
                        </Box>
                        {selectedMonth !== null && (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {/* Legend tooltip */}
                            <Tooltip
                              placement="top"
                              title={
                                <Box
                                  sx={{
                                    p: 0.5,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontWeight: 700,
                                      fontSize: '11px',
                                      letterSpacing: '0.05em',
                                    }}
                                  >
                                    LEGEND
                                  </Typography>
                                  {[
                                    {
                                      label: 'Holiday',
                                      bg: 'rgba(237,108,2,0.25)',
                                      border: '#ed6c02',
                                    },
                                    {
                                      label: 'Suspension',
                                      bg: 'rgba(211,47,47,0.2)',
                                      border: '#d32f2f',
                                    },
                                  ].map(({ label, bg, border }) => (
                                    <Box
                                      key={label}
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          width: 28,
                                          height: 16,
                                          backgroundColor: bg,
                                          border: `1.5px solid ${border}`,
                                          borderRadius: '3px',
                                          flexShrink: 0,
                                        }}
                                      />
                                      <Typography
                                        variant="caption"
                                        sx={{ fontSize: '11px', fontWeight: 500 }}
                                      >
                                        {label}
                                      </Typography>
                                    </Box>
                                  ))}
                                </Box>
                              }
                              arrow
                              componentsProps={{
                                tooltip: {
                                  sx: {
                                    bgcolor: 'white',
                                    color: '#333',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '10px',
                                    p: 1.5,
                                  },
                                },
                                arrow: { sx: { color: 'white' } },
                              }}
                            >
                              <AccentButton
                                variant="contained"
                                size="small"
                                aria-label="Color legend"
                                sx={{
                                  minWidth: 32,
                                  width: 32,
                                  height: 32,
                                  p: 0,
                                  fontSize: '0.85rem',
                                  fontWeight: 800,
                                  bgcolor: T.accent,
                                  color: '#fff',
                                  boxShadow: `0 2px 8px ${alpha(T.accent, 0.3)}`,
                                  '&:hover': { bgcolor: T.accentDark },
                                }}
                              >
                                ?
                              </AccentButton>
                            </Tooltip>
                            <Tooltip title="Print DTR" placement="top">
                              <IconButton
                                size="small"
                                onClick={printPage}
                                sx={{
                                  bgcolor: alpha(T.accent, 0.08),
                                  border: `1px solid ${T.accentBorder}`,
                                  color: T.accent,
                                  width: 32,
                                  height: 32,
                                  '&:hover': { bgcolor: alpha(T.accent, 0.15) },
                                }}
                              >
                                <PrintIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <AccentButton
                              variant="contained"
                              size="small"
                              startIcon={
                                singlePrintLoading ? (
                                  <MCircularProgress
                                    size={12}
                                    sx={{ color: '#fff' }}
                                  />
                                ) : (
                                  <PictureAsPdfIcon
                                    sx={{ fontSize: '13px !important' }}
                                  />
                                )
                              }
                              onClick={downloadPDF}
                              disabled={singlePrintLoading}
                              sx={{
                                fontSize: '0.78rem',
                                bgcolor: T.accent,
                                color: '#fff',
                                boxShadow: `0 2px 8px ${alpha(T.accent, 0.3)}`,
                                '&:hover': { bgcolor: T.accentDark },
                                '&:disabled': { bgcolor: '#ddd !important' },
                              }}
                            >
                              {singlePrintLoading ? 'Downloading…' : 'Download PDF'}
                            </AccentButton>
                          </Box>
                        )}
                      </Box>
                    </Box>

                    {/* Content */}
                    <Box
                      sx={{
                        flexGrow: 1,
                        overflowY: 'auto',
                        position: 'relative',
                        ...scrollbarSx,
                      }}
                    >
                      {selectedMonth === null ? (
                        <Box sx={{ py: 10, textAlign: 'center' }}>
                          <Box
                            sx={{
                              width: 72,
                              height: 72,
                              borderRadius: '50%',
                              bgcolor: T.accentFaint,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mx: 'auto',
                              mb: 2,
                            }}
                          >
                            <CalendarToday
                              sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }}
                            />
                          </Box>
                          <Typography
                            sx={{
                              fontSize: '0.9rem',
                              fontWeight: 600,
                              color: T.muted,
                              mb: 0.5,
                            }}
                          >
                            Select a DTR Period
                          </Typography>
                          <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>
                            Choose a month from the left panel to view your
                            Honorarium Daily Time Record.
                          </Typography>
                        </Box>
                      ) : (
                        <Fade in timeout={250}>
                          <Box
                            className="dtr-print-area"
                            sx={{
                              bgcolor: '#f4f0f0',
                              p: 2.5,
                              display: 'flex',
                              justifyContent: 'center',
                              position: 'relative',
                            }}
                          >
                            <Paper
                              elevation={2}
                              sx={{
                                p: 2,
                                borderRadius: '8px',
                                bgcolor: '#fff',
                                position: 'relative',
                                boxSizing: 'border-box',
                                overflowX: 'auto',
                                width: '100%',
                              }}
                            >
                              <Box sx={{ overflowX: 'auto' }}>
                                <div className="table-container" ref={dtrRef}>
                                  <div className="table-wrapper">
                                    <DTRTemplate
                                      employeeName={employeeName}
                                      records={records}
                                      officialTime={officialTimes}
                                      startDate={startDate}
                                      endDate={endDate}
                                      selectedYear={selectedYear}
                                      selectedMonth={selectedMonth}
                                      holidays={holidays}
                                      suspensions={suspensions}
                                      approvedLeaves={approvedLeaves}
                                      formatTime={formatTime}
                                      keyPrefix="screen"
                                      dtrType="honorarium"
                                    />
                                  </div>
                                </div>
                              </Box>
                            </Paper>
                          </Box>
                        </Fade>
                      )}
                    </Box>

                    {/* Footer info bar */}
                    {selectedMonth !== null && (
                      <Box
                        className="no-print"
                        sx={{
                          flexShrink: 0,
                          px: 3.5,
                          py: 1.25,
                          borderTop: `1px solid ${T.divider}`,
                          bgcolor: T.accentFaint,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <PictureAsPdfIcon
                          sx={{ fontSize: 13, color: alpha(T.accent, 0.45) }}
                        />
                        <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>
                          Download generates a PDF of your Honorarium DTR for{' '}
                          {monthsShort[selectedMonth]} {selectedYear}
                        </Typography>
                      </Box>
                    )}
                  </SectionCard>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </Fade>
      )}
    </>
  );
};

export default DailyTimeRecordHonorarium;