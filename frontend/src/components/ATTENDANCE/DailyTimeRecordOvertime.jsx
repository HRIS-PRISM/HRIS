import API_BASE_URL from '../../apiConfig';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
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

// ─── STYLED COMPONENTS ───────────────────────────────────────────────────────

const GlassCard = styled(Card)(() => ({
  borderRadius: 20,
  backdropFilter: 'blur(10px)',
  overflow: 'hidden',
  transition: 'box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
}));

const ProfessionalButton = styled(Button)(({ variant }) => ({
  borderRadius: 12,
  fontWeight: 600,
  padding: '12px 24px',
  transition: 'box-shadow 0.2s ease-in-out, background-color 0.2s',
  textTransform: 'none',
  fontSize: '0.95rem',
  letterSpacing: '0.025em',
  boxShadow: variant === 'contained' ? '0 4px 14px rgba(254, 249, 225, 0.25)' : 'none',
  '&:hover': {
    boxShadow: variant === 'contained' ? '0 6px 20px rgba(254, 249, 225, 0.35)' : 'none',
  },
  '&:active': { boxShadow: 'none' },
}));

const ModernTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    transition: 'box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.95)' },
    '&.Mui-focused': {
      boxShadow: '0 4px 20px rgba(254, 249, 225, 0.25)',
      backgroundColor: 'rgba(255, 255, 255, 1)',
    },
  },
  '& .MuiInputLabel-root': { fontWeight: 500 },
}));

// ─── Shimmer / Wireframe ──────────────────────────────────────────────────────

const SHIMMER_CSS = `
@keyframes dtrShimmer {
  0%   { background-position: -900px 0; }
  100% { background-position:  900px 0; }
}
@keyframes dtrPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}`;

const S = ({ w = '100%', h = 14, r = 6, sx = {}, accent = '#6d2323' }) => (
  <Box
    sx={{
      width: w, height: h, borderRadius: r, flexShrink: 0,
      background: `linear-gradient(90deg,
        ${alpha(accent, 0.07)} 25%,
        ${alpha(accent, 0.18)} 50%,
        ${alpha(accent, 0.07)} 75%)`,
      backgroundSize: '900px 100%',
      animation: 'dtrShimmer 1.6s infinite linear',
      ...sx,
    }}
  />
);

const Placeholder = ({ w, h, r = 4, color = 'rgba(109,35,35,0.08)', sx = {} }) => (
  <Box sx={{ width: w, height: h, borderRadius: r, bgcolor: color, flexShrink: 0, ...sx }} />
);

const TableSkeleton = ({ accent }) => {
  const border     = `1px solid rgba(0,0,0,0.18)`;
  const cellBorder = `1px solid rgba(0,0,0,0.12)`;
  const colWidths  = ['8%', '16%', '16%', '16%', '16%', '14%', '14%'];

  return (
    <Box sx={{ width: '49%', border, borderRadius: '2px', overflow: 'hidden', bgcolor: 'white', display: 'flex', flexDirection: 'column' }}>
      {/* Header block */}
      <Box sx={{ p: '12px 10px 8px', borderBottom: border, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
        <S w="55%" h={9} r={3} accent={accent} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', justifyContent: 'center', my: '2px' }}>
          <Placeholder w={44} h={44} r="50%" color={alpha(accent, 0.12)} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, maxWidth: 220 }}>
            <S w="95%" h={9} r={3} accent={accent} />
            <S w="80%" h={9} r={3} accent={accent} />
          </Box>
        </Box>
        <S w="45%" h={8} r={3} accent={accent} />
        <S w="32%" h={7} r={3} accent={accent} />
        {/* Title — "DAILY TIME RECORD - OVERTIME" */}
        <S w="72%" h={16} r={4} accent={accent} sx={{ my: '3px' }} />
        <Box sx={{ width: '72%', mt: '4px' }}>
          <Box sx={{ borderBottom: '2px solid rgba(0,0,0,0.25)', pb: '3px', mb: '3px' }}>
            <S w="100%" h={11} r={3} accent={accent} />
          </Box>
          <S w="28%" h={7} r={3} accent={accent} sx={{ mx: 'auto' }} />
        </Box>
        <Box sx={{ width: '90%', display: 'flex', alignItems: 'center', gap: '6px', mt: '2px' }}>
          <S w={72} h={8} r={3} accent={accent} />
          <S w="55%" h={8} r={3} accent={accent} />
        </Box>
        <Box sx={{ width: '90%', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <S w={90} h={8} r={3} accent={accent} />
          <S w="35%" h={8} r={3} accent={accent} />
        </Box>
        <S w="88%" h={8} r={3} accent={accent} sx={{ mt: '4px' }} />
        <Box sx={{ width: '85%', display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
          <S w={80} h={8} r={3} accent={accent} sx={{ flexShrink: 0 }} />
          <Box sx={{ flex: 1, borderBottom: '1.5px solid rgba(0,0,0,0.18)', mb: '1px' }} />
        </Box>
        <Box sx={{ height: 10 }} />
        <Box sx={{ width: '85%', display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
          <S w={64} h={8} r={3} accent={accent} sx={{ flexShrink: 0 }} />
          <Box sx={{ flex: 1, borderBottom: '1.5px solid rgba(0,0,0,0.18)', mb: '1px' }} />
        </Box>
        <Box sx={{ height: 10 }} />
      </Box>

      {/* Column header row 1 */}
      <Box sx={{ display: 'flex', borderBottom: cellBorder, bgcolor: alpha('#FEF9E1', 0.6) }}>
        {colWidths.map((w, ci) => (
          <Box key={ci} sx={{ width: w, py: '6px', px: '2px', borderRight: ci < 6 ? cellBorder : 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <S w="70%" h={9} r={3} accent={accent} />
          </Box>
        ))}
      </Box>

      {/* Column header row 2 */}
      <Box sx={{ display: 'flex', borderBottom: cellBorder, bgcolor: alpha('#FEF9E1', 0.35) }}>
        {colWidths.map((w, ci) => (
          <Box key={ci} sx={{ width: w, py: '5px', px: '2px', borderRight: ci < 6 ? cellBorder : 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {ci !== 0 && <S w="65%" h={8} r={3} accent={accent} />}
          </Box>
        ))}
      </Box>

      {/* 31 data rows */}
      {Array.from({ length: 31 }, (_, ri) => (
        <Box key={ri} sx={{
          display: 'flex',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          bgcolor: ri % 2 === 0 ? 'transparent' : alpha('#FEF9E1', 0.22),
          animation: `dtrPulse 2.2s ease-in-out ${ri * 0.035}s infinite`,
        }}>
          {colWidths.map((w, ci) => (
            <Box key={ci} sx={{ width: w, height: 15, borderRight: ci < 6 ? '1px solid rgba(0,0,0,0.06)' : 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', px: '2px' }}>
              {(ci === 0 || (ci >= 1 && ci <= 4 && ri % 3 === 0)) && (
                <S w={ci === 0 ? '55%' : ri % 5 === 0 ? '0%' : '78%'} h={7} r={3} accent={accent} />
              )}
            </Box>
          ))}
        </Box>
      ))}

      {/* Footer */}
      <Box sx={{ p: '10px 8px 14px', borderTop: border, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <Box sx={{ borderTop: '2px solid rgba(0,0,0,0.2)', mb: '4px' }} />
        <S w="92%" h={7} r={3} accent={accent} />
        <S w="85%" h={7} r={3} accent={accent} />
        <S w="78%" h={7} r={3} accent={accent} />
        <Box sx={{ width: '50%', ml: 'auto', mt: '28px', textAlign: 'center' }}>
          <Box sx={{ borderTop: '2px solid rgba(0,0,0,0.18)', mb: '4px' }} />
          <S w="60%" h={7} r={3} accent={accent} sx={{ mx: 'auto' }} />
        </Box>
        <Box sx={{ mt: '12px' }}>
          <Box sx={{ borderTop: '1px solid rgba(0,0,0,0.15)', mb: '2px' }} />
          <Box sx={{ borderTop: '1.5px solid rgba(0,0,0,0.2)', mb: '6px' }} />
          <S w="72%" h={7} r={3} accent={accent} />
        </Box>
        <Box sx={{ width: '80%', ml: 'auto', mt: '12px', textAlign: 'center' }}>
          <Box sx={{ borderTop: '2px solid rgba(0,0,0,0.18)', mb: '4px' }} />
          <S w="45%" h={7} r={3} accent={accent} sx={{ mx: 'auto', mb: '3px' }} />
          <S w="65%" h={7} r={3} accent={accent} sx={{ mx: 'auto' }} />
        </Box>
      </Box>
    </Box>
  );
};

const DTROvertimeWireframeLoading = ({
  accentColor    = '#6d2323',
  primaryColor   = '#FEF9E1',
  secondaryColor = '#FFF8E7',
}) => {
  const ac   = accentColor;
  const grad = `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`;

  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <Container maxWidth="xl" sx={{ py: 4, mt: -5 }}>
        <Box sx={{ px: { xs: 2, sm: 4, md: 6 } }}>

          {/* 1. Header card */}
          <Box sx={{
            mb: 4, borderRadius: '20px', overflow: 'hidden',
            border: `1px solid ${alpha(ac, 0.1)}`,
            boxShadow: `0 8px 40px ${alpha(ac, 0.08)}`,
            animation: 'dtrPulse 2.2s ease-in-out infinite',
          }}>
            <Box sx={{ p: 5, background: grad }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Placeholder w={64} h={64} r="50%" color={alpha(ac, 0.13)} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <S w={290} h={26} r={6} accent={ac} />
                    <S w={270} h={13} r={4} accent={ac} />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {/* Integrity badge + Overtime chip + icon button */}
                  <S w={145} h={26} r={13} accent={ac} />
                  <S w={90} h={26} r={13} accent={ac} />
                  <Placeholder w={48} h={48} r="50%" color={alpha(ac, 0.11)} />
                </Box>
              </Box>
            </Box>
          </Box>

          {/* 2. Filter card */}
          <Box sx={{
            mb: 4, borderRadius: '20px', overflow: 'hidden',
            border: `1px solid ${alpha(ac, 0.1)}`,
            boxShadow: `0 8px 40px ${alpha(ac, 0.08)}`,
            animation: 'dtrPulse 2.2s ease-in-out 0.1s infinite',
            bgcolor: `rgba(254,249,225,0.95)`,
          }}>
            {/* Banner */}
            <Box sx={{ p: 4, background: grad, display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
              <Placeholder w={28} h={28} r="50%" color={alpha(ac, 0.2)} />
              <S w={280} h={13} r={4} accent={ac} />
            </Box>

            <Box sx={{ p: 4 }}>
              {/* Employee Number + Start Date + End Date — 3-column row */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                {[110, 70, 70].map((labelW, fi) => (
                  <Box key={fi} sx={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <S w={labelW} h={12} r={3} accent={ac} />
                    <Box sx={{ height: 56, borderRadius: '12px', border: `1px solid ${alpha(ac, 0.18)}`, bgcolor: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', px: 1.5 }}>
                      <S w={fi === 0 ? '40%' : '60%'} h={13} r={4} accent={ac} />
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* Year selector row */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <S w={185} h={15} r={4} accent={ac} />
                <Box sx={{ width: 140, height: 40, borderRadius: '8px', border: `1px solid ${alpha(ac, 0.25)}`, bgcolor: 'white', display: 'flex', alignItems: 'center', px: 1.5, gap: 1 }}>
                  <S w="50%" h={12} r={3} accent={ac} />
                  <Placeholder w={18} h={18} r={3} color={alpha(ac, 0.15)} sx={{ ml: 'auto' }} />
                </Box>
              </Box>

              {/* 12 month buttons */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                {Array.from({ length: 12 }, (_, i) => (
                  <S key={i} w={64} h={44} r={10} accent={ac} sx={{ animation: `dtrShimmer 1.6s infinite linear ${i * 0.05}s` }} />
                ))}
              </Box>
            </Box>
          </Box>

          {/* 3. DTR tables */}
          <Box sx={{
            borderRadius: '8px', overflow: 'hidden',
            border: `1px solid ${alpha(ac, 0.12)}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            mb: 4, bgcolor: 'white',
            animation: 'dtrPulse 2.2s ease-in-out 0.18s infinite',
          }}>
            <Box sx={{ p: 5, display: 'flex', gap: '2%', overflowX: 'auto' }}>
              <TableSkeleton accent={ac} />
              <TableSkeleton accent={ac} />
            </Box>
          </Box>

        </Box>
      </Container>

      {/* 4. FAB buttons — fixed bottom-right (? + Print + PDF) */}
      <Box sx={{ position: 'fixed', bottom: 60, right: 24, display: 'flex', flexDirection: 'row', gap: 1.5, zIndex: 1300, animation: 'dtrPulse 2.2s ease-in-out 0.3s infinite' }}>
        {Array.from({ length: 3 }, (_, i) => (
          <Placeholder key={i} w={52} h={52} r="50%" color="rgba(255,255,255,0.9)" sx={{ border: '1px solid #e0e0e0', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }} />
        ))}
      </Box>
    </>
  );
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────

const DailyTimeRecordOvertime = () => {
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

  // ── Year selector ──────────────────────────────────────────────────────────
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  // ── pageLoading ────────────────────────────────────────────────────────────
  const [pageLoading, setPageLoading] = useState(true);
  const initialLoadDone = useRef(false);

  const DTR_WIDTH_IN = '8.7in';

  // ── Theme colours ──────────────────────────────────────────────────────────
  const primaryColor       = settings.accentColor       || '#FEF9E1';
  const secondaryColor     = settings.backgroundColor   || '#FFF8E7';
  const accentColor        = settings.primaryColor      || '#6d2323';
  const accentDark         = settings.secondaryColor    || '#8B3333';
  const textPrimaryColor   = settings.textPrimaryColor  || '#6d2323';
  const textSecondaryColor = settings.textSecondaryColor|| '#FEF9E1';
  const hoverColor         = settings.hoverColor        || '#6D2323';

  // ── Access guard ───────────────────────────────────────────────────────────
  const { hasAccess, loading: accessLoading } = usePageAccess('daily-time-record-overtime');

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
          const d = (r.date || '').split('T')[0].split('-')[2];
          return d === dayText;
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
          const span = cells[cellIdx]?.querySelector('span');
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
        if (m.type === 'characterData') { const span = m.target.parentElement; return span && span.tagName === 'SPAN'; }
        if (m.type === 'childList') return m.target.tagName === 'TD' || m.target.tagName === 'SPAN';
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
    try {
      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/view-attendance`,
        { personID, startDate, endDate },
        getAuthHeaders(),
      );
      const data = response.data;
      const overtimeRecords = data.filter(
        (r) => r.specialType === 'OVERTIME' && (r.specialTimeIN || r.specialTimeOUT),
      );
      if (data.length > 0) {
        stopObserver();
        setRecords(overtimeRecords);
        const immutable = Object.freeze(JSON.parse(JSON.stringify(overtimeRecords)));
        setOriginalRecords(immutable);
        originalRecordsRef.current = immutable;
        const hash = generateHash(overtimeRecords);
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
    try {
      const pdf  = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'a4' });
      const orig = ensureCaptureStyles(dtrRef.current);
      await new Promise((r) => setTimeout(r, 100));
      const canvas = await html2canvas(dtrRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
      restoreCaptureStyles(dtrRef.current, orig);
      const imgData = canvas.toDataURL('image/png');
      const dtrWidth = 8, dtrHeight = 9.5;
      const pw = pdf.internal.pageSize.getWidth(); const ph = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', (pw - dtrWidth) / 2, (ph - dtrHeight) / 2, dtrWidth, dtrHeight);
      addWatermark(pdf); pdf.autoPrint(); window.open(pdf.output('bloburl'), '_blank');
    } catch (err) { console.error('Error generating print view:', err); }
  };

  const downloadPDF = async () => {
    if (!dtrRef.current) return;
    if (!verifyIntegrity()) return;
    restoreDOMFromOriginal();
    await new Promise((r) => setTimeout(r, 80));
    try {
      const pdf  = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'a4' });
      const orig = ensureCaptureStyles(dtrRef.current);
      await new Promise((r) => setTimeout(r, 100));
      const canvas = await html2canvas(dtrRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff', logging: false });
      restoreCaptureStyles(dtrRef.current, orig);
      const imgData = canvas.toDataURL('image/png');
      const dtrWidth = 8, dtrHeight = 10;
      const pw = pdf.internal.pageSize.getWidth(); const ph = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', (pw - dtrWidth) / 2, (ph - dtrHeight) / 2, dtrWidth, dtrHeight);
      addWatermark(pdf);
      pdf.save(`DTR-Overtime-${employeeName}-${formatMonth(startDate)}.pdf`);
      setSnackbar({ open: true, message: 'DTR downloaded successfully. Integrity verified.', severity: 'success' });
    } catch (err) { console.error('Error generating PDF:', err); }
  };

  // ── Month click ────────────────────────────────────────────────────────────
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

  const handleMonthClick = (monthIndex) => {
    const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const end   = new Date(Date.UTC(selectedYear, monthIndex + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex);
  };

  // ── Date indicator helpers ─────────────────────────────────────────────────
  const isDateInRange = (date, s, e) => {
    if (!date) return false;
    const d  = new Date(date); d.setHours(0,0,0,0);
    const sd = s ? new Date(s) : null; if (sd) sd.setHours(0,0,0,0);
    const ed = e ? new Date(e) : null; if (ed) ed.setHours(0,0,0,0);
    if (sd && ed) return d >= sd && d <= ed;
    if (sd) return d >= sd;
    if (ed) return d <= ed;
    return false;
  };

  const isApprovedLeaveDate = (dateString) => {
    if (!dateString || approvedLeaves.length === 0) return false;
    const check = dateString.split('T')[0];
    return approvedLeaves.some((req) => {
      const dates = Array.isArray(req.leave_date) ? req.leave_date : String(req.leave_date).split(',').map((d) => d.trim());
      return dates.some((d) => d.split('T')[0] === check);
    });
  };

  const getDateIndicator = (dateString) => {
    if (!dateString) return null;
    const date = dateString.split('T')[0];
    if (isApprovedLeaveDate(date))
      return { label: 'ON LEAVE',   bgColor: 'rgba(46,125,50,0.2)',  borderColor: '#2e7d32' };
    const susp = suspensions.find((s) => isDateInRange(date, s.date_start || s.date, s.date_end || s.date));
    if (susp)
      return { label: 'SUSPENSION', bgColor: 'rgba(211,47,47,0.2)',  borderColor: '#d32f2f' };
    const hol  = holidays.find((h) => isDateInRange(date, h.date_start || h.date, h.date_end || h.date));
    if (hol)
      return { label: 'HOLIDAY',    bgColor: 'rgba(237,108,2,0.25)', borderColor: '#ed6c02' };
    return null;
  };

  // ── Integrity badge ────────────────────────────────────────────────────────
  const IntegrityBadge = () => {
    if (integrityStatus === 'none') return null;
    if (integrityStatus === 'ok') return (
      <Tooltip title={`Data integrity verified | Hash: ${recordsHash} | Fetched: ${fetchedAt ? new Date(fetchedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : 'N/A'}`}>
        <Chip icon={<VerifiedIcon sx={{ fontSize: '16px !important' }} />} label="Integrity Verified" size="small"
          sx={{ bgcolor: 'rgba(46,125,50,0.15)', color: '#2e7d32', fontWeight: 600, fontSize: '11px', border: '1px solid rgba(46,125,50,0.4)', cursor: 'pointer' }} />
      </Tooltip>
    );
    return null;
  };

  // ── Access / loading guards ────────────────────────────────────────────────
  if (pageLoading || accessLoading) return (
    <DTROvertimeWireframeLoading
      accentColor={accentColor}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
    />
  );

  if (hasAccess === false) return (
    <AccessDenied
      title="Access Denied"
      message="You do not have permission to access Daily Time Record - Overtime. Contact your administrator to request access."
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
          <h4 style={{ fontFamily: 'Times New Roman,serif', textAlign: 'center', margin: '2px 0', fontWeight: 'bold', fontSize: '16px' }}>DAILY TIME RECORD - OVERTIME</h4>
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
          Official hours for overtime (arrival and departure)
        </td></tr>
        <tr><td colSpan="7" style={{ padding: '2px 5px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingLeft: '5%', height: '14px', fontFamily: 'Arial,serif', fontSize: '10px' }}>
            <span style={{ marginRight: '5px' }}>Regular Days:</span>
            <span style={{ display: 'inline-block', borderBottom: '1.5px solid black', flexGrow: 1, minWidth: '300px', marginBottom: '2px' }}></span>
          </div>
        </td></tr>
        {Array.from({ length: 2 }, (_, i) => <tr key={`e2${i}`}><td colSpan="7"></td></tr>)}
        <tr><td colSpan="7" style={{ padding: '2px 5px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingLeft: '5%', height: '20px', fontFamily: 'Arial,serif', fontSize: '10px', whiteSpace: 'nowrap' }}>
            <span style={{ marginRight: '5px' }}>Saturdays:</span>
            <span style={{ display: 'inline-block', borderBottom: '1.5px solid black', flexGrow: 1, minWidth: '318px', marginBottom: '2px' }}></span>
          </div>
        </td></tr>
        {Array.from({ length: 2 }, (_, i) => <tr key={`e3${i}`}><td colSpan="7"></td></tr>)}
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

  const renderTableBody = () =>
    Array.from({ length: 31 }, (_, i) => {
      const day    = (i + 1).toString().padStart(2, '0');
      const record = records.find((r) => r.date && r.date.endsWith(`-${day}`));
      let fullDate = null;
      if (record?.date) { fullDate = record.date; }
      else if (startDate) { const [y, m] = startDate.split('-'); fullDate = `${y}-${m}-${day}`; }
      else if (selectedMonth !== null) { const mn = String(selectedMonth + 1).padStart(2, '0'); fullDate = `${selectedYear}-${mn}-${day}`; }
      const ind    = getDateIndicator(fullDate);
      const tdBase = { ...cellStyle, backgroundColor: ind ? ind.bgColor : 'transparent' };
      const tdRel  = { ...tdBase, position: 'relative' };
      const cellOverlay = ind ? (cellValue) => {
        if (cellValue) return null;
        return (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '7px', fontWeight: 'bold', color: 'rgba(0,0,0,0.25)', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 0 }}>
            {ind.label}
          </div>
        );
      } : () => null;

      return (
        <tr key={i}>
          <td style={tdBase}>{day}</td>
          <td style={tdRel}>
            {cellOverlay(record?.specialTimeIN)}
            <span style={{ position: 'relative', zIndex: 1 }}>{formatTime(record?.specialTimeIN || '')}</span>
          </td>
          <td style={tdRel}>
            {cellOverlay('')}
            <span style={{ position: 'relative', zIndex: 1 }}></span>
          </td>
          <td style={tdRel}>
            {cellOverlay('')}
            <span style={{ position: 'relative', zIndex: 1 }}></span>
          </td>
          <td style={tdRel}>
            {cellOverlay(record?.specialTimeOUT)}
            <span style={{ position: 'relative', zIndex: 1 }}>{formatTime(record?.specialTimeOUT || '')}</span>
          </td>
          <td style={tdBase}><span></span></td>
          <td style={tdBase}><span></span></td>
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
      <Container maxWidth="xl" sx={{ py: 4, mt: -5 }}>
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

        <Box sx={{ px: { xs: 2, sm: 4, md: 6 } }}>

          {/* Header card */}
          <Fade in timeout={500}>
            <Box sx={{ mb: 4 }} className="no-print">
              <GlassCard sx={{ background: `rgba(${hexToRgb(primaryColor)},0.95)`, boxShadow: `0 8px 40px ${alpha(accentColor,0.08)}`, border: `1px solid ${alpha(accentColor,0.1)}` }}>
                <Box sx={{ p: 5, background: `linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%)`, color: textPrimaryColor, position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: `radial-gradient(circle,${alpha(accentColor,0.1)} 0%,${alpha(accentColor,0)} 70%)` }} />
                  <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, background: `radial-gradient(circle,${alpha(accentColor,0.08)} 0%,${alpha(accentColor,0)} 70%)` }} />
                  <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ bgcolor: alpha(accentColor,0.15), mr: 4, width: 64, height: 64, boxShadow: `0 8px 24px ${alpha(accentColor,0.15)}` }}>
                        <AccessTime sx={{ color: textPrimaryColor, fontSize: 32 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2, color: textPrimaryColor }}>Daily Time Record - Overtime</Typography>
                        <Typography variant="body1" sx={{ opacity: 0.8, fontWeight: 400, color: textPrimaryColor }}>Filter your overtime DTR records by date</Typography>
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <IntegrityBadge />
                      <Chip label="Overtime" size="small" sx={{ bgcolor: alpha(accentColor,0.15), color: textPrimaryColor, fontWeight: 500, '& .MuiChip-label': { px: 1 } }} />
                      <Tooltip title="Refresh Data">
                        <IconButton onClick={() => window.location.reload()} sx={{ bgcolor: alpha(accentColor,0.1), '&:hover':{ bgcolor: alpha(accentColor,0.2) }, color: textPrimaryColor, width: 48, height: 48 }}>
                          <AccessTime sx={{ fontSize: 24 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Box>
              </GlassCard>
            </Box>
          </Fade>

          {/* Filter card */}
          <Fade in timeout={700}>
            <GlassCard className="no-print" sx={{ mb: 4, background: `rgba(${hexToRgb(primaryColor)},0.95)`, boxShadow: `0 8px 40px ${alpha(accentColor,0.08)}`, border: `1px solid ${alpha(accentColor,0.1)}` }}>
              <Box sx={{ p: 4, background: `linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%)`, color: textPrimaryColor, display: 'flex', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <CalendarToday sx={{ fontSize: '1.8rem', mr: 2 }} />
                <Typography variant="h7" sx={{ opacity: 0.9 }}>Select date range to view records</Typography>
              </Box>
              <Box sx={{ p: 4 }}>

                {/* Employee Number + Start Date + End Date — 3-column row */}
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 160 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: textPrimaryColor }}>Employee Number</Typography>
                    <ModernTextField value={personID} variant="outlined" disabled fullWidth />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 160 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: textPrimaryColor }}>Start Date</Typography>
                    <ModernTextField type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} variant="outlined" InputLabelProps={{ shrink: true }} fullWidth />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 160 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: textPrimaryColor }}>End Date</Typography>
                    <ModernTextField type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} variant="outlined" InputLabelProps={{ shrink: true }} fullWidth />
                  </Box>
                </Box>

                {/* Year + Month selection */}
                <Box>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ color: textPrimaryColor, fontWeight: 600 }}>Select Month &amp; Year</Typography>
                    <FormControl sx={{ minWidth: 140 }}>
                      <InputLabel sx={{ fontWeight: 600 }}>Year</InputLabel>
                      <Select
                        value={selectedYear}
                        label="Year"
                        onChange={(e) => {
                          setSelectedYear(e.target.value);
                          setSelectedMonth(null);
                          setSnackbar({ open: true, message: 'Year changed — please click a month to load records.', severity: 'info' });
                        }}
                        sx={{ backgroundColor: 'white', '& .MuiOutlinedInput-notchedOutline':{ borderColor: accentColor }, borderRadius: 2, fontWeight: 600 }}
                      >
                        {yearOptions.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                    {months.map((month, index) => {
                      const sel = selectedMonth === index;
                      return (
                        <ProfessionalButton key={month} variant={sel ? 'contained' : 'outlined'} size="medium" onClick={() => handleMonthClick(index)}
                          sx={{ borderColor: accentColor, backgroundColor: sel ? accentColor : 'transparent', color: sel ? textSecondaryColor : textPrimaryColor, py: 1.5, fontWeight: 600, '&:hover':{ backgroundColor: sel ? accentDark : alpha(accentColor,0.1), borderWidth: 2 }, transition: 'all 0.3s ease', boxShadow: sel ? `0 4px 12px ${alpha(accentColor,0.3)}` : 'none' }}>
                          {month}
                        </ProfessionalButton>
                      );
                    })}
                  </Box>
                </Box>

              </Box>
            </GlassCard>
          </Fade>

          {/* DTR table */}
          <Fade in timeout={900}>
            <Paper elevation={4} sx={{ borderRadius: 2, overflowX: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid rgba(109,35,35,0.1)', mb: 4, width: '100%' }}>
              <Box sx={{ p: 5, minWidth: 'fit-content' }}>
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
          </Fade>

          {/* FAB buttons */}
          <Box className="no-print" sx={{ position: 'fixed', bottom: 60, right: 24, display: 'flex', flexDirection: 'row', gap: 1.5, zIndex: 1300, alignItems: 'center' }}>
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
              <IconButton sx={{ backgroundColor: '#ffffff', color: '#6D2323', width: 52, height: 52, border: '1px solid #e0e0e0', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transition: 'all 0.2s ease', fontSize: '18px', fontWeight: 700, '&:hover':{ backgroundColor: '#f5f5f5', transform: 'translateY(-2px)' } }}>?</IconButton>
            </Tooltip>
            <Tooltip title="Print DTR" placement="top">
              <IconButton onClick={printPage} sx={{ backgroundColor: '#ffffff', color: '#6D2323', width: 52, height: 52, border: '1px solid #e0e0e0', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transition: 'all 0.2s ease', '&:hover':{ backgroundColor: '#f5f5f5', transform: 'translateY(-2px)' } }}><PrintIcon /></IconButton>
            </Tooltip>
            <Tooltip title="Download PDF" placement="top">
              <IconButton onClick={downloadPDF} sx={{ backgroundColor: '#ffffff', color: '#A31D1D', width: 52, height: 52, border: '1px solid #e0e0e0', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transition: 'all 0.2s ease', '&:hover':{ backgroundColor: '#f5f5f5', transform: 'translateY(-2px)' } }}><PictureAsPdfIcon /></IconButton>
            </Tooltip>
          </Box>

        </Box>
      </Container>
    </Fade>
  );
};

export default DailyTimeRecordOvertime;