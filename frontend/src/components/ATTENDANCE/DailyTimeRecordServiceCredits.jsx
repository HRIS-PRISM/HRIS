import API_BASE_URL from '../../apiConfig';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { useSocket } from '../../contexts/SocketContext';
import LoadingOverlay from '../LoadingOverlay';
import { jwtDecode } from 'jwt-decode';
import { AccessTime, CalendarToday } from '@mui/icons-material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrintIcon from '@mui/icons-material/Print';
import VerifiedIcon from '@mui/icons-material/Verified';
import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Container,
  Fade,
  Grid,
  IconButton,
  Paper,
  styled,
  TextField,
  Tooltip,
  Typography,
  CircularProgress as MCircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
} from '@mui/material';
import earistLogo from '../../assets/earistLogo.png';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { alpha } from '@mui/material/styles';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import {
  formatDtrPdfFileName,
  openPdfBlobForPrint,
} from '../../utils/dtrFormatHelpers';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '109, 35, 35';
};

const generateHash = (data) => {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).toUpperCase();
};

/** YYYY-MM-DD as a Philippines calendar day (fixes holiday/leave off-by-one from UTC-midnight ISO strings). */
const toPhCalendarYmd = (value) => {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
  }
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const y = parts.find((p) => p.type === 'year')?.value;
    const mo = parts.find((p) => p.type === 'month')?.value;
    const da = parts.find((p) => p.type === 'day')?.value;
    if (y && mo && da) return `${y}-${mo}-${da}`;
  } catch {
    /* ignore */
  }
  return s.split('T')[0];
};

const recordMatchesDay = (record, dayPadded) => {
  const ymd = toPhCalendarYmd(record?.date);
  if (!ymd || dayPadded.length !== 2) return false;
  return ymd.endsWith(`-${dayPadded}`);
};

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────

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

// ─── STYLED COMPONENTS ───────────────────────────────────────────────────────

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
  fontSize: '0.875rem',
  letterSpacing: '0.01em',
  transition: 'all 0.18s ease',
  '&:hover': { transform: 'translateY(-1px)' },
  '&:active': { transform: 'translateY(0)' },
});

const FormSectionLabel = ({ icon: Icon, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
    <Icon sx={{ fontSize: 12, color: alpha(T.accent, 0.45) }} />
    <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: alpha(T.accent, 0.45) }}>
      {children}
    </Typography>
  </Box>
);

// ─── Shimmer / Wireframe ──────────────────────────────────────────────────────

const SHIMMER_CSS = `
@keyframes dtrShimmer {
  0%   { background-position: -900px 0; }
  100% { background-position:  900px 0; }
}
@keyframes dtrPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}
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
    background: `linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)`,
    backgroundSize: '800px 100%',
    animation: 'shimmer 1.6s infinite linear',
    flexShrink: 0, ...sx,
  }} />
);

const DTRWireframe = () => (
  <>
    <style>{SHIMMER_CSS}</style>
    <Box sx={{ py: { xs: 2, md: 4 }, mt: { xs: 0, md: -5 }, width: '100vw', maxWidth: '100%', position: 'relative', left: '63%', transform: 'translateX(-61%)', px: { xs: 2, sm: 3, md: 6 } }}>
      {/* Header skeleton */}
      <Box sx={{ mb: 2, borderRadius: 3, overflow: 'hidden', border: `1px solid ${T.accentBorder}`, animation: 'blink 2s ease-in-out infinite' }}>
        <Box sx={{ p: 3.5, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2.5, position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.06)' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)', flexShrink: 0 }} />
            <Box><Bone w={220} h={18} sx={{ mb: 1 }} /><Bone w={360} h={11} /></Box>
          </Box>
        </Box>
      </Box>
      <Grid container spacing={3}>
        {[3, 9].map((lg, idx) => (
          <Grid item xs={12} lg={lg} key={idx}>
            <Box sx={{ borderRadius: 3, border: `1px solid ${T.accentBorder}`, bgcolor: '#fff', overflow: 'hidden', animation: `blink 2s ease-in-out ${idx * 0.1}s infinite`, height: 'calc(100vh - 280px)' }}>
              <Box sx={{ px: 3.5, py: 2.5, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)' }} />
                <Bone w={lg === 3 ? 160 : 220} h={13} />
              </Box>
              {lg === 3 ? (
                <Box sx={{ p: 3.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Bone w={80} h={10} sx={{ mb: 1 }} />
                    <Box sx={{ height: 40, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: '#fafafa' }} />
                  </Box>
                  <Box>
                    <Bone w={52} h={10} sx={{ mb: 1 }} />
                    <Box sx={{ height: 40, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: '#fafafa' }} />
                  </Box>
                  <Box>
                    <Bone w={60} h={10} sx={{ mb: 1 }} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}>
                      {Array.from({ length: 12 }, (_, i) => (
                        <Box key={i} sx={{ height: 42, borderRadius: 1.5, border: `1px solid ${T.accentBorder}`, bgcolor: '#fafafa' }} />
                      ))}
                    </Box>
                  </Box>
                  <Box sx={{ mt: 1, p: 1.5, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: T.accentFaint }}>
                    <Bone w={100} h={10} sx={{ mb: 1 }} />
                    <Bone w={150} h={12} sx={{ mb: 1 }} />
                    <Bone w={180} h={10} />
                  </Box>
                </Box>
              ) : (
                <Box sx={{ p: 3.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {[100, 160, 120, 140, 110, 130].map((w, i) => (
                    <Box key={i}><Bone w={w} h={10} sx={{ mb: 1 }} /><Box sx={{ height: 40, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: '#fafafa' }} /></Box>
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

/** html2canvas often under-renders faint text; bump contrast on the cloned DOM used for capture */
const enhanceDtrWatermarksInClone = (clonedDoc) => {
  if (!clonedDoc?.querySelectorAll) return;
  clonedDoc.querySelectorAll('.dtr-cell-watermark span').forEach((el) => {
    el.style.setProperty('color', 'rgba(0,0,0,0.55)');
    el.style.setProperty('opacity', '1');
  });
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────

const DailyTimeRecordServiceCredits = () => {
  const { socket, connected } = useSocket();
  const { settings } = useSystemSettings();

  // ── Core state ─────────────────────────────────────────────────────────────
  const [personID, setPersonID]           = useState('');
  const [startDate, setStartDate]         = useState('');
  const [endDate, setEndDate]             = useState('');
  const [records, setRecords]             = useState([]);
  const [employeeName, setEmployeeName]   = useState('');
  const [officialTimes, setOfficialTimes] = useState({});
  const dtrRef = useRef(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [holidays, setHolidays]           = useState([]);
  const [suspensions, setSuspensions]     = useState([]);
  const [approvedLeaves, setApprovedLeaves] = useState([]);

  // ── Anti-tamper state ──────────────────────────────────────────────────────
  const [originalRecords, setOriginalRecords] = useState([]);
  const [recordsHash, setRecordsHash]         = useState('');
  const [fetchedAt, setFetchedAt]             = useState(null);
  const [integrityStatus, setIntegrityStatus] = useState('none');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // ── Anti-tamper refs ───────────────────────────────────────────────────────
  const observerRef        = useRef(null);
  const restoreTimerRef    = useRef(null);
  const originalRecordsRef = useRef([]);
  const isRestoringRef     = useRef(false);
  const formatTimeRef      = useRef(null);
  const fetchRequestSeqRef = useRef(0);

  // ── Loading states ─────────────────────────────────────────────────────────
  const [singlePrintLoading, setSinglePrintLoading] = useState(false);
  const [singlePrintStatus, setSinglePrintStatus]   = useState('');
  const [monthLoading, setMonthLoading]             = useState(false);

  // ── Year selector ──────────────────────────────────────────────────────────
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  // ── pageLoading ────────────────────────────────────────────────────────────
  const [pageLoading, setPageLoading] = useState(true);
  const initialLoadDone = useRef(false);

  const DTR_WIDTH_IN = '8.7in';

  // ── Theme colours (kept for any remaining usage) ───────────────────────────
  const primaryColor       = settings.accentColor       || '#FEF9E1';
  const secondaryColor     = settings.backgroundColor   || '#FFF8E7';
  const accentColor        = settings.primaryColor      || '#6d2323';

  // ── Access guard ───────────────────────────────────────────────────────────
  const { hasAccess, loading: accessLoading } = usePageAccess('daily-time-record-service-credits');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  };

  // ── Decode token ────────────────────────────────────────────────────────────
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
    return timeString.replace(/\s+/g, ' ').trim();
  }, []);

  useEffect(() => { formatTimeRef.current = formatTime; }, [formatTime]);

  const formatMonth = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(undefined, { month: 'long' }).toUpperCase();
  };

  const formatStartDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const formatEndDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return `${d.getDate()}, ${d.getFullYear()}`;
  };

  const formattedStartDate = formatStartDate(startDate);
  const formattedEndDate   = formatEndDate(endDate);

  // ── DOM restore logic ──────────────────────────────────────────────────────
  const restoreDOMFromOriginal = useCallback(() => {
    if (!dtrRef.current) return;
    const original = originalRecordsRef.current;
    if (!original || original.length === 0) return;
    isRestoringRef.current = true;
    const fmt = formatTimeRef.current || ((s) => s || '');
    const tbodies = dtrRef.current.querySelectorAll('tbody');
    tbodies.forEach((tbody) => {
      const rows = tbody.querySelectorAll('tr');
      rows.forEach((row) => {
        const dayCell = row.querySelector('td:first-child');
        if (!dayCell) return;
        const dayText = dayCell.textContent.trim();
        if (!/^\d{2}$/.test(dayText)) return;
        const record = original.find((r) => {
          return recordMatchesDay(r, dayText);
        });
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return;
        const timeValues = [
          fmt(record?.specialTimeIN  || ''),
          '',
          '',
          fmt(record?.specialTimeOUT || ''),
        ];
        [1, 2, 3, 4].forEach((cellIdx, spanIdx) => {
          // Target ONLY the direct-child time span — never the nested watermark span
          // inside .dtr-cell-watermark (so HOLIDAY/SUSPENSION/ON LEAVE labels survive).
          const td = cells[cellIdx];
          if (!td) return;
          const span = td.querySelector(':scope > span');
          if (span && span.textContent.trim() !== timeValues[spanIdx]) {
            span.textContent = timeValues[spanIdx];
          }
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
        // Ignore mutations inside the watermark wrapper — those are intentional UI labels.
        const target = m.target;
        const isInWatermark = (n) => !!(n && n.closest && n.closest('.dtr-cell-watermark'));
        if (isInWatermark(target)) return false;
        if (m.type === 'characterData') {
          const span = target.parentElement;
          if (isInWatermark(span)) return false;
          return span && span.tagName === 'SPAN';
        }
        if (m.type === 'childList') return target.tagName === 'TD' || target.tagName === 'SPAN';
        return false;
      });
      if (!isTimeTamper) return;
      if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);
      restoreTimerRef.current = setTimeout(() => { restoreDOMFromOriginal(); }, 300);
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
    } else { stopObserver(); }
  }, [originalRecords, startObserver, stopObserver]);

  useEffect(() => () => stopObserver(), [stopObserver]);

  // ── Data fetching ───────────────────────────────────────────────────────────
  const fetchRecords = async () => {
    const requestSeq = ++fetchRequestSeqRef.current;
    setMonthLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/view-attendance`,
        { personID, startDate, endDate, type: 'SERVICE_CREDIT' },
        getAuthHeaders(),
      );
      if (requestSeq !== fetchRequestSeqRef.current) return;
      const data = response.data;
      const serviceRecords = data.filter(
        (r) => r.specialType === 'SERVICE' && (r.specialTimeIN || r.specialTimeOUT),
      );
      if (data.length > 0) {
        stopObserver();
        setRecords(serviceRecords);
        const immutable = Object.freeze(JSON.parse(JSON.stringify(serviceRecords)));
        setOriginalRecords(immutable);
        originalRecordsRef.current = immutable;
        const hash = generateHash(serviceRecords);
        setRecordsHash(hash);
        setFetchedAt(new Date().toISOString());
        setIntegrityStatus('ok');
        const { firstName, lastName, middleName } = data[0];
        const full = `${firstName || ''} ${middleName ? middleName + ' ' : ''}${lastName || ''}`.trim();
        setEmployeeName(full || 'Unknown');
        await fetchOfficialTimes(personID);
      } else {
        stopObserver();
        setRecords([]);
        setOriginalRecords([]);
        originalRecordsRef.current = [];
        setRecordsHash('');
        setFetchedAt(null);
        setIntegrityStatus('none');
        setEmployeeName('No records found');
        setOfficialTimes({});
      }
    } catch (err) { console.error(err); }
    finally {
      if (requestSeq === fetchRequestSeqRef.current) {
        setMonthLoading(false);
      }
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
      setTimeout(() => setPageLoading(false), 350);
    };
    init();
  }, [personID]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-fetch when date range changes ─────────────────────────────────────
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

  // ── Integrity check ────────────────────────────────────────────────────────
  const verifyIntegrity = () => {
    if (!fetchedAt || originalRecords.length === 0) {
      setSnackbar({ open: true, message: 'No DTR data loaded. Please search first.', severity: 'warning' });
      return false;
    }
    const ageMs = Date.now() - new Date(fetchedAt).getTime();
    if (ageMs > 30 * 60 * 1000) {
      setIntegrityStatus('warn');
      setSnackbar({ open: true, message: 'DTR data is older than 30 minutes. Please search again.', severity: 'warning' });
      return false;
    }
    const currentHash = generateHash(records);
    if (currentHash !== recordsHash) {
      setIntegrityStatus('warn');
      setSnackbar({ open: true, message: 'Data integrity check failed. Please reload.', severity: 'error' });
      return false;
    }
    setIntegrityStatus('ok');
    return true;
  };

  // ── Capture helpers ────────────────────────────────────────────────────────
  const getSingleDtrPdfUser = () => {
    if (records[0]) {
      const r = records[0];
      return {
        firstName: r.firstName,
        lastName: r.lastName,
        middleName: r.middleName,
      };
    }
    return { fullName: employeeName };
  };

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
      el.style.backgroundColor = orig.backgroundColor || ''; el.style.width = orig.width || ''; el.style.visibility = orig.visibility || '';
      el.style.display = orig.display || ''; el.style.position = orig.position || ''; el.style.left = orig.left || ''; el.style.zIndex = orig.zIndex || ''; el.style.opacity = orig.opacity || '';
    } catch (e) { /* noop */ }
  };

  const addWatermark = (pdf) => {
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageWidth  = pdf.internal.pageSize.getWidth();
    const meta = `Emp: ${personID} | Hash: ${recordsHash} | Generated: ${new Date(fetchedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} | ${employeeName}`;
    pdf.setFontSize(6); pdf.setTextColor(100, 100, 100);
    pdf.text(meta, pageWidth / 2, pageHeight - 0.12, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
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
      const canvas  = await html2canvas(dtrRef.current, { scale: 2, useCORS: true, logging: false, onclone: (doc) => enhanceDtrWatermarksInClone(doc) });
      restoreCaptureStyles(dtrRef.current, orig);
      const imgData = canvas.toDataURL('image/png');
      const dtrW = 8, dtrH = 9.5, pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', (pw - dtrW) / 2, (ph - dtrH) / 2, dtrW, dtrH);
      addWatermark(pdf);
      pdf.autoPrint();
      openPdfBlobForPrint(
        pdf,
        formatDtrPdfFileName(getSingleDtrPdfUser(), startDate),
      );
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
      const canvas  = await html2canvas(dtrRef.current, { scale: 2, useCORS: true, logging: false, onclone: (doc) => enhanceDtrWatermarksInClone(doc) });
      restoreCaptureStyles(dtrRef.current, orig);
      const imgData = canvas.toDataURL('image/png');
      const dtrW = 8, dtrH = 10, pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', (pw - dtrW) / 2, (ph - dtrH) / 2, dtrW, dtrH);
      addWatermark(pdf);
      pdf.save(formatDtrPdfFileName(getSingleDtrPdfUser(), startDate));
      setSnackbar({ open: true, message: 'DTR downloaded successfully. Integrity verified.', severity: 'success' });
    } catch (e) { console.error('Error generating PDF:', e); }
    finally { setSinglePrintLoading(false); setSinglePrintStatus(''); }
  };

  // ── Month click ────────────────────────────────────────────────────────────
  const months      = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const monthsShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const handleMonthClick = (monthIndex) => {
    const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const end   = new Date(Date.UTC(selectedYear, monthIndex + 1, 0));
    setMonthLoading(true);
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex);
  };

  // ── Date indicator helpers ─────────────────────────────────────────────────
  const isDateInRange = (date, s, e) => {
    if (!date) return false;
    const d  = toPhCalendarYmd(date);
    const st = s ? toPhCalendarYmd(s) : null;
    const en = e ? toPhCalendarYmd(e) : null;
    if (st && en) return d >= st && d <= en;
    if (st) return d >= st;
    if (en) return d <= en;
    return false;
  };

  const isApprovedLeaveDate = (dateString) => {
    if (!dateString || approvedLeaves.length === 0) return false;
    const check = toPhCalendarYmd(dateString);
    return approvedLeaves.some((req) => {
      const dates = Array.isArray(req.leave_date)
        ? req.leave_date
        : String(req.leave_date).split(',').map((d) => d.trim());
      return dates.some((d) => toPhCalendarYmd(d) === check);
    });
  };

  const getDateIndicator = (dateString) => {
    if (!dateString) return null;
    const date = toPhCalendarYmd(dateString);
    if (isApprovedLeaveDate(date))
      return { type: 'leave',      label: 'ON LEAVE',   bgColor: 'rgba(46,125,50,0.2)',  textColor: '#000', borderColor: '#2e7d32' };
    const susp = suspensions.find((s) => isDateInRange(date, s.date_start || s.date, s.date_end || s.date));
    if (susp)
      return { type: 'suspension', label: 'SUSPENSION', bgColor: 'rgba(211,47,47,0.2)',  textColor: '#000', borderColor: '#d32f2f' };
    const hol  = holidays.find((h) => isDateInRange(date, h.date_start || h.date, h.date_end || h.date));
    if (hol)
      return { type: 'holiday',    label: 'HOLIDAY',    bgColor: 'rgba(237,108,2,0.25)', textColor: '#000', borderColor: '#ed6c02' };
    return null;
  };

  // ── Integrity badge ────────────────────────────────────────────────────────
  const IntegrityBadge = () => {
    if (integrityStatus !== 'ok') return null;
    return (
      <Tooltip title={`Data integrity verified | Hash: ${recordsHash} | Fetched: ${fetchedAt ? new Date(fetchedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : 'N/A'}`}>
        <Chip
          icon={<VerifiedIcon sx={{ fontSize: '13px !important' }} />}
          label="Integrity Verified"
          size="small"
          sx={{ bgcolor: 'rgba(46,125,50,0.1)', color: '#2e7d32', fontWeight: 700, fontSize: '0.65rem', border: '1px solid rgba(46,125,50,0.3)', cursor: 'pointer', height: 24 }}
        />
      </Tooltip>
    );
  };

  // ── Access / loading guards ────────────────────────────────────────────────
  if (pageLoading || accessLoading) return <DTRWireframe />;

  if (hasAccess === false) return (
    <AccessDenied
      title="Access Denied"
      message="You do not have permission to access Daily Time Record - Service Credits. Contact your administrator to request access."
      returnPath="/admin-home"
      returnButtonText="Return to Home"
    />
  );

  // ── DTR table header ───────────────────────────────────────────────────────
  const renderHeader = () => {
    const fs = '10px';
    return (
      <thead style={{ textAlign: 'center' }}>
        <tr>
          <td colSpan="7" style={{ position: 'relative', padding: '25px 10px 0px 10px', textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', fontFamily: 'Arial,"Times New Roman",serif', color: 'black', marginBottom: '2px' }}>Republic of the Philippines</div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '3px' }}>
              <img src={earistLogo} alt="Logo" width="50" height="50" style={{ position: 'absolute', left: '10px' }} />
              <p style={{ margin: '0', fontSize: '11.5px', fontWeight: 'bold', textAlign: 'center', fontFamily: 'Arial,"Times New Roman",serif', lineHeight: '1.2' }}>
                EULOGIO "AMANG" RODRIGUEZ <br /> INSTITUTE OF SCIENCE &amp; TECHNOLOGY
              </p>
            </div>
          </td>
        </tr>
        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '0px 5px 2px 5px' }}>
          <p style={{ fontSize: '11px', fontWeight: 'bold', margin: '0', fontFamily: 'Arial,serif' }}>Nagtahan, Sampaloc Manila</p>
        </td></tr>
        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2px 5px' }}>
          <p style={{ fontSize: '8px', fontWeight: 'bold', margin: '0', fontFamily: 'Arial,serif' }}>Civil Service Form No. 48</p>
        </td></tr>
        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2px 5px', lineHeight: '1.2' }}>
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ fontFamily: 'Times New Roman,serif', margin: '2px 0', fontWeight: 'bold', fontSize: '16px' }}>DAILY TIME RECORD</h4>
            <div style={{ fontFamily: 'Times New Roman,serif', fontSize: '16px', marginTop: '-2px', fontWeight: 'bold' }}>SERVICE CREDITS</div>
          </div>
        </td></tr>
        <tr>
          <td colSpan="7" style={{ paddingTop: '10px', paddingBottom: '5px', lineHeight: '1.1', verticalAlign: 'top', textAlign: 'center' }}>
            <div style={{ margin: '0 auto', fontFamily: 'Arial,serif', width: '100%', maxWidth: '400px', position: 'relative' }}>
              <div style={{ borderBottom: '2px solid black', width: '100%', margin: '2px 0 3px 0' }} />
              <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: 'center', fontFamily: 'Times New Roman', overflow: 'hidden', textOverflow: 'ellipsis' }}>{employeeName || ''}</div>
              <div style={{ borderBottom: '2px solid black', width: '100%', margin: '2px 0 3px 0' }} />
              <div style={{ fontSize: '9px', textAlign: 'center', fontFamily: 'Times New Roman' }}>NAME</div>
            </div>
          </td>
        </tr>
        <tr><td colSpan="7" style={{ padding: '2px 5px', lineHeight: '1.1', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingLeft: '5px', fontFamily: 'Times New Roman,serif', fontSize: '10px' }}>
            <span style={{ marginRight: '6px' }}>Covered Dates:</span>
            <div style={{ minWidth: '220px', flexGrow: 1 }}>
              <div style={{ fontWeight: 'bold', textAlign: 'left', fontSize: '10px', fontFamily: 'Times New Roman,serif' }}>{formattedStartDate} - {formattedEndDate}</div>
            </div>
          </div>
        </td></tr>
        <tr><td colSpan="7" style={{ padding: '2px 5px', lineHeight: '1.2', textAlign: 'left' }}>
          <p style={{ fontSize: '11px', margin: '0', paddingLeft: '5px', fontFamily: 'Times New Roman,serif' }}>For the month of: <b>{startDate ? formatMonth(startDate) : ''}</b></p>
        </td></tr>
        <tr><td colSpan="7" style={{ padding: '8px 5px 2px 5px', textAlign: 'left', fontSize: '10px', fontFamily: 'Arial,serif', lineHeight: '1.2' }}>
          Official hours for service credits (arrival and departure)
        </td></tr>
        <tr><td colSpan="7" style={{ padding: '2px 5px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingLeft: '5%', height: '14px', fontFamily: 'Arial,serif', fontSize: '10px' }}>
            <span style={{ marginRight: '5px' }}>Regular Days:</span>
            <span style={{ display: 'inline-block', borderBottom: '1.5px solid black', flexGrow: 1, minWidth: '300px', marginBottom: '2px' }}></span>
          </div>
        </td></tr>
        {Array.from({ length: 2 }, (_, i) => <tr key={`e2${i}`}><td colSpan="7"></td></tr>)}
        <tr>
          <th rowSpan="2" style={{ border: '1px solid black', fontFamily: 'Arial,serif', fontSize: fs }}>DAY</th>
          <th colSpan="2" style={{ border: '1px solid black', fontFamily: 'Arial,serif', fontSize: fs }}>A.M.</th>
          <th colSpan="2" style={{ border: '1px solid black', fontFamily: 'Arial,serif', fontSize: fs }}>P.M.</th>
          <th style={{ border: '1px solid black', fontFamily: 'Arial,serif', fontSize: fs }}>Late</th>
          <th style={{ border: '1px solid black', fontFamily: 'Arial,serif', fontSize: fs }}>Undertime</th>
        </tr>
        <tr style={{ textAlign: 'center' }}>
          {['Arrival','Departure','Arrival','Departure','Min','Min'].map((label, i) => (
            <td key={i} style={{ border: '1px solid black', fontSize: '9px', fontFamily: 'Arial,serif', whiteSpace: 'nowrap' }}>{label}</td>
          ))}
        </tr>
      </thead>
    );
  };

  const cellStyle = {
    border: '1px solid black', textAlign: 'center', padding: '0 1px',
    fontFamily: 'Arial,serif', fontSize: '10px', height: '16px',
    whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '52px', letterSpacing: '-0.3px',
  };

  const daysInSelectedMonth = (() => {
    if (selectedMonth == null || !Number.isFinite(selectedYear)) return 31;
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  })();

  const dtrRawEmpty = (v) => v == null || (typeof v === 'string' && v.trim() === '');

  const dtrWmSpanStyle = {
    fontSize: '8.5px',
    fontWeight: 700,
    fontFamily: 'Arial, "Times New Roman", serif',
    color: 'rgba(0,0,0,0.48)',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    lineHeight: 1,
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact',
  };

  const renderDtrAmPmWatermarkCell = (rawVal, displayText, rowTint, indicator, colKey) => {
    const showWm = Boolean(indicator && dtrRawEmpty(rawVal));
    return (
      <td
        key={colKey}
        style={{
          ...cellStyle,
          backgroundColor: rowTint,
          position: 'relative',
          verticalAlign: 'middle',
          overflow: 'visible',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {showWm && (
          <div
            className="dtr-cell-watermark"
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          >
            <span style={dtrWmSpanStyle}>{indicator.label}</span>
          </div>
        )}
        <span style={{ position: 'relative', zIndex: 1 }}>{displayText}</span>
      </td>
    );
  };

  const renderTableBody = () =>
    Array.from({ length: daysInSelectedMonth }, (_, i) => {
      const day    = (i + 1).toString().padStart(2, '0');
      const record = records.find((r) => r.date && recordMatchesDay(r, day));
      let fullDate = null;
      if (record?.date) fullDate = toPhCalendarYmd(record.date);
      else if (startDate) { const [y, m] = startDate.split('-'); fullDate = `${y}-${m}-${day}`; }
      else if (selectedMonth !== null) { const mn = String(selectedMonth + 1).padStart(2, '0'); fullDate = `${selectedYear}-${mn}-${day}`; }
      const indicator = getDateIndicator(fullDate);
      const rowTint   = indicator ? indicator.bgColor.replace(/,\s*[\d.]+\)$/i, ', 0.08)') : 'transparent';

      return (
        <tr key={i}>
          <td style={{ ...cellStyle, backgroundColor: rowTint, position: 'relative', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{day}</div>
          </td>
          {renderDtrAmPmWatermarkCell(record?.specialTimeIN,  formatTime(record?.specialTimeIN  || ''), rowTint, indicator, `s-${i}-0`)}
          {renderDtrAmPmWatermarkCell(null,                   '',                                       rowTint, indicator, `s-${i}-1`)}
          {renderDtrAmPmWatermarkCell(null,                   '',                                       rowTint, indicator, `s-${i}-2`)}
          {renderDtrAmPmWatermarkCell(record?.specialTimeOUT, formatTime(record?.specialTimeOUT || ''), rowTint, indicator, `s-${i}-3`)}
          <td style={{ ...cellStyle, backgroundColor: rowTint, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}><span></span></td>
          <td style={{ ...cellStyle, backgroundColor: rowTint, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}><span></span></td>
        </tr>
      );
    });

  const renderFooter = () => (
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

  const colgroup = (
    <colgroup>
      <col style={{ width: '8%' }}  />
      <col style={{ width: '16%' }} />
      <col style={{ width: '16%' }} />
      <col style={{ width: '16%' }} />
      <col style={{ width: '16%' }} />
      <col style={{ width: '14%' }} />
      <col style={{ width: '14%' }} />
    </colgroup>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Fade in timeout={500}>
      <Box>
        <style>{SHIMMER_CSS}</style>
        <style>{`
          html { overflow-y: scroll; }
          .dtr-responsive-header,.dtr-responsive-cell,.dtr-time-cell{width:auto!important;max-width:none!important;}
          .dtr-time-cell{white-space:nowrap!important;word-break:keep-all!important;}
          table{table-layout:auto!important;}
          @page{size:A4;margin:0;}
          @media print{
            .no-print{display:none!important;}
            .header,.top-banner,.page-banner,header,footer,.MuiDrawer-root,.MuiAppBar-root{display:none!important;}
            html,body{width:21cm;height:29.7cm;margin:0;padding:0;background:white;}
            .MuiContainer-root{max-width:100%!important;width:21cm!important;margin:0 auto!important;padding:0!important;display:flex!important;justify-content:center!important;align-items:center!important;background:white!important;}
            .MuiPaper-root,.MuiBox-root,.MuiCard-root{background:transparent!important;box-shadow:none!important;margin:0!important;}
            .table-container{width:100%!important;height:auto!important;margin:0 auto!important;padding:0!important;display:block!important;background:transparent!important;}
            .table-wrapper{width:100%!important;height:auto!important;margin:0!important;padding:0!important;display:flex!important;justify-content:center!important;align-items:flex-start!important;box-sizing:border-box!important;}
            .table-side-by-side{display:flex!important;flex-direction:row!important;gap:1.5%!important;width:100%!important;height:auto!important;}
            .table-side-by-side table{width:47%!important;border:1px solid black!important;border-collapse:collapse!important;background:white!important;}
            table td,table th{background:white!important;font-family:Arial,"Times New Roman",serif!important;position:relative!important;overflow:visible!important;}
            table thead div,table thead p,table thead h4{font-family:Arial,"Times New Roman",serif!important;}
            table td div{position:relative!important;}
            table{page-break-inside:avoid!important;table-layout:fixed!important;}
            .dtr-responsive-header,.dtr-responsive-cell,.dtr-time-cell{width:auto!important;white-space:nowrap!important;word-break:keep-all!important;}
            table tbody tr:last-child td{padding-bottom:20px!important;}
          }
        `}</style>

        {/* Snackbar */}
        <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} variant="filled" sx={{ width: '100%', fontWeight: 600 }}>{snackbar.message}</Alert>
        </Snackbar>

        <LoadingOverlay
          open={monthLoading}
          message={selectedMonth !== null ? `Service credits DTR — ${monthsShort[selectedMonth]}…` : 'Service credits DTR — Fetching records…'}
        />
        <LoadingOverlay
          open={singlePrintLoading}
          message={singlePrintStatus ? `DTR — ${singlePrintStatus}` : 'DTR — Capturing preview…'}
        />

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
                  <Typography sx={{ fontSize: '0.82rem', color: T.accentMid, fontWeight: 700, opacity: 0.9 }}>Employee Portal • Service Credits DTR</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
                <IntegrityBadge />
                <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                  <Typography sx={{ fontSize: '0.8rem', color: T.accent, fontWeight: 700 }}>
                    {records.length} records
                  </Typography>
                </Box>
                <Box
                  component="button"
                  onClick={() => window.location.reload()}
                  title="Refresh"
                  sx={{ bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, borderRadius: '8px', p: '7px 10px', cursor: 'pointer', color: T.accent, display: 'flex', alignItems: 'center', transition: 'all 0.15s', '&:hover': { bgcolor: alpha(T.accent, 0.15), transform: 'translateY(-1px)' } }}
                >
                  <AccessTime sx={{ fontSize: 17 }} />
                </Box>
              </Box>
            </Box>
          </SectionCard>

          {/* ── Two-column layout ── */}
          <Grid container spacing={2}>

            {/* LEFT: Filter / Period selector panel */}
            <Grid item xs={12} lg={3} className="no-print">
              <SectionCard sx={{ height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ px: 3.5, py: 1.25, borderBottom: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: T.accentFaint }}>
                  <CalendarToday sx={{ fontSize: 15, color: T.accent }} />
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.accent }}>SC DTR Period</Typography>
                </Box>

                <Box sx={{ px: 3.5, py: 3, flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 } }}>

                  {/* Employee (read-only) */}
                  <FormSectionLabel icon={AccessTime}>Employee</FormSectionLabel>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1.1, mb: 2.5, borderRadius: '8px', border: `1px dashed ${T.accentBorder}`, bgcolor: alpha(T.accent, 0.03), cursor: 'not-allowed', userSelect: 'none' }}>
                    <AccessTime sx={{ fontSize: 14, color: alpha(T.accent, 0.4), flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '0.82rem', color: T.muted, fontWeight: 600, flex: 1 }}>{personID || '—'}</Typography>
                    <Box sx={{ px: 0.75, py: 0.2, borderRadius: '4px', bgcolor: alpha(T.accent, 0.08), border: `1px solid ${alpha(T.accent, 0.15)}` }}>
                      <Typography sx={{ fontSize: '0.58rem', color: T.accent, fontWeight: 700, letterSpacing: '0.05em' }}>AUTO</Typography>
                    </Box>
                  </Box>

                  {/* Year */}
                  <FormSectionLabel icon={CalendarToday}>Year</FormSectionLabel>
                  <Box sx={{ mb: 2.5 }}>
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        setSelectedYear(parseInt(e.target.value));
                        setSelectedMonth(null);
                        setSnackbar({ open: true, message: 'Year changed — please click a month to load records.', severity: 'info' });
                      }}
                      style={{ width: '100%', padding: '9px 13px', borderRadius: '8px', border: `1px solid ${T.accentBorder}`, fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit', background: '#fff', color: T.text, cursor: 'pointer' }}
                    >
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
                      <Box onClick={() => { setSelectedMonth(null); setRecords([]); setStartDate(''); setEndDate(''); setIntegrityStatus('none'); }} sx={{ fontSize: '0.65rem', color: T.accent, cursor: 'pointer', fontWeight: 700, '&:hover': { textDecoration: 'underline' } }}>Clear</Box>
                    )}
                  </Box>

                  {/* Month list */}
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: '8px',
                    mb: 1.25,
                  }}>
                    {monthsShort.map((m, idx) => {
                      const isSelected = selectedMonth === idx;
                      return (
                        <Box
                          key={m}
                          onClick={() => handleMonthClick(idx)}
                          sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            minHeight: 42,
                            px: 1,
                            py: 0.65,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            border: `1px solid ${isSelected ? T.accent : 'transparent'}`,
                            bgcolor: isSelected ? T.accent : 'transparent',
                            transition: 'all 0.14s ease',
                            '&:hover': isSelected ? {} : { bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` },
                          }}
                        >
                          <Typography sx={{
                            fontSize: '0.78rem',
                            fontWeight: isSelected ? 700 : 600,
                            color: isSelected ? '#fff' : T.text,
                            lineHeight: 1,
                            letterSpacing: '0.03em',
                            textAlign: 'center',
                            width: '100%',
                          }}>
                            {m}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>

                  <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: alpha(T.accent, 0.6), mb: 0.5 }}>
                      Total Records
                    </Typography>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: T.text, lineHeight: 1.3 }}>
                      {records.length} {records.length === 1 ? 'record' : 'records'} found
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: T.muted, mt: 0.4 }}>
                      Counts loaded entries for the selected month.
                    </Typography>
                  </Box>
                </Box>
              </SectionCard>
            </Grid>

            {/* RIGHT: DTR preview panel */}
            <Grid item xs={12} lg={9}>
              <SectionCard sx={{ height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column', position: 'relative' }}>

                {/* Toolbar */}
                <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint }} className="no-print">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <AccessTime sx={{ fontSize: 15, color: T.accent }} />
                      <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: T.text }}>DTR Preview</Typography>
                      {selectedMonth !== null && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: T.faint }} />
                          <Typography sx={{ fontSize: '0.78rem', color: T.muted, fontWeight: 500 }}>{employeeName}</Typography>
                          <Box sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.accent, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, borderRadius: '5px', px: '6px', py: '2px' }}>{monthsShort[selectedMonth]}</Box>
                          <Box sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#2e7d32', bgcolor: 'rgba(46,125,50,0.08)', border: '1px solid rgba(46,125,50,0.2)', borderRadius: '5px', px: '6px', py: '2px' }}>SC</Box>
                        </Box>
                      )}
                    </Box>
                    {selectedMonth !== null && (
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {/* Legend tooltip */}
                        <Tooltip placement="top" title={
                          <Box sx={{ p: 0.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em' }}>LEGEND</Typography>
                            {[
                              { label: 'Holiday',    bg: 'rgba(237,108,2,0.25)',  border: '#ed6c02' },
                              { label: 'Suspension', bg: 'rgba(211,47,47,0.2)',   border: '#d32f2f' },
                              { label: 'On Leave',   bg: 'rgba(46,125,50,0.2)',   border: '#2e7d32' },
                            ].map(({ label, bg, border }) => (
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
                        <AccentButton
                          variant="contained"
                          size="small"
                          startIcon={singlePrintLoading ? <MCircularProgress size={12} sx={{ color: '#fff' }} /> : <PictureAsPdfIcon sx={{ fontSize: '13px !important' }} />}
                          onClick={downloadPDF}
                          disabled={singlePrintLoading}
                          sx={{ fontSize: '0.78rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 8px ${alpha(T.accent, 0.3)}`, '&:hover': { bgcolor: T.accentDark }, '&:disabled': { bgcolor: '#ddd !important' } }}
                        >
                          {singlePrintLoading ? 'Processing…' : 'Download PDF'}
                        </AccentButton>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Content */}
                <Box sx={{ flexGrow: 1, overflowY: 'auto', position: 'relative', '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                  {selectedMonth === null ? (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                      <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                        <CalendarToday sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                      </Box>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>Select a DTR Period</Typography>
                      <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>Choose a month from the left panel to view your Service Credits Daily Time Record.</Typography>
                    </Box>
                  ) : (
                    <Fade in timeout={250}>
                      <Box sx={{ bgcolor: '#f4f0f0', p: 2.5, display: 'flex', justifyContent: 'center', position: 'relative' }}>
                        <Paper elevation={2} sx={{ p: 2, borderRadius: '8px', bgcolor: '#fff', position: 'relative', boxSizing: 'border-box', overflowX: 'auto', width: '100%' }}>
                          <Box sx={{ overflowX: 'auto' }}>
                            <div className="table-container" ref={dtrRef}>
                              <div className="table-wrapper">
                                <div style={{ display: 'flex', gap: '2%', width: DTR_WIDTH_IN, minWidth: '8.5in', margin: '0 auto', backgroundColor: 'white' }} className="table-side-by-side">
                                  {[0, 1].map((tableIdx) => (
                                    <table key={tableIdx} style={{ border: '1px solid black', borderCollapse: 'collapse', width: '49%', tableLayout: 'fixed' }}>
                                      {colgroup}
                                      {renderHeader()}
                                      <tbody>
                                        {renderTableBody()}
                                        {renderFooter()}
                                      </tbody>
                                    </table>
                                  ))}
                                </div>
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
                  <Box className="no-print" sx={{ px: 3.5, py: 1.25, borderTop: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PictureAsPdfIcon sx={{ fontSize: 13, color: alpha(T.accent, 0.45) }} />
                    <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>Download generates a verified PDF of your Service Credits DTR for {monthsShort[selectedMonth]} {selectedYear}</Typography>
                  </Box>
                )}
              </SectionCard>
            </Grid>
          </Grid>

        </Box>
      </Box>
    </Fade>
  );
};

export default DailyTimeRecordServiceCredits;