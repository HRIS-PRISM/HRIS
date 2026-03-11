import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Typography,
  Alert,
  Card,
  CardContent,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  LinearProgress,
  Fade,
  Grid,
  InputAdornment,
  Badge,
  Divider,
  Fab,
  Zoom,
  alpha,
  styled,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
} from '@mui/material';
import {
  EventNote,
  CalendarToday,
  Person,
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
} from '@mui/icons-material';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '109, 35, 35';
};

// ─────────────────────────────────────────────
// WIREFRAME — unified shimmer matching all modules
// ─────────────────────────────────────────────
const SHIMMER_CSS = `
@keyframes varShimmer {
  0%   { background-position: -900px 0; }
  100% { background-position:  900px 0; }
}
@keyframes varPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}`;

const S = ({ w = '100%', h = 14, r = 6, sx = {}, accent = '#6d2323' }) => (
  <Box sx={{
    width: w, height: h, borderRadius: r, flexShrink: 0,
    background: `linear-gradient(90deg,
      ${alpha(accent, 0.07)} 25%,
      ${alpha(accent, 0.18)} 50%,
      ${alpha(accent, 0.07)} 75%)`,
    backgroundSize: '900px 100%',
    animation: 'varShimmer 1.6s infinite linear',
    ...sx,
  }} />
);

const Placeholder = ({ w, h, r = 4, color = 'rgba(109,35,35,0.08)', sx = {} }) => (
  <Box sx={{ width: w, height: h, borderRadius: r, bgcolor: color, flexShrink: 0, ...sx }} />
);

const AttendanceUserStateWireframe = ({
  accentColor    = '#6d2323',
  primaryColor   = '#FEF9E1',
  secondaryColor = '#FFF8E7',
}) => {
  const ac   = accentColor;
  const grad = `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`;

  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <Box sx={{
        py: { xs: 2, md: 4 },
        width: '100vw', mx: 'auto', maxWidth: '100%',
        overflow: 'hidden', position: 'relative',
        left: '53%', transform: 'translateX(-51%)',
        px: { xs: 2, sm: 3, md: 6 },
      }}>

        {/* 1. Hero header */}
        <Box sx={{
          mb: 4, borderRadius: '20px', overflow: 'hidden',
          border: `1px solid ${alpha(ac, 0.1)}`,
          boxShadow: `0 8px 40px ${alpha(ac, 0.08)}`,
          animation: 'varPulse 2.2s ease-in-out infinite',
        }}>
          <Box sx={{ p: 5, background: grad, position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: `radial-gradient(circle,${alpha(ac,0.1)} 0%,${alpha(ac,0)} 70%)` }} />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Placeholder w={64} h={64} r="50%" color={alpha(ac, 0.13)} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <S w={240} h={26} r={6} accent={ac} />
                  <S w={310} h={13} r={4} accent={ac} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <S w={145} h={26} r={13} accent={ac} />
                <Placeholder w={48} h={48} r="50%" color={alpha(ac, 0.12)} />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* 2. Controls card */}
        <Box sx={{
          mb: 4, borderRadius: '20px', overflow: 'hidden',
          border: `1px solid ${alpha(ac, 0.1)}`,
          boxShadow: `0 8px 40px ${alpha(ac, 0.08)}`,
          animation: 'varPulse 2.2s ease-in-out 0.08s infinite',
          bgcolor: `rgba(${hexToRgb(primaryColor)},0.95)`,
        }}>
          <Box sx={{ p: 4 }}>
            {/* 3 input fields */}
            <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
              {[0, 1, 2].map((fi) => (
                <Box key={fi} sx={{ flex: 1, minWidth: 160 }}>
                  <Box sx={{ height: 56, borderRadius: '12px', border: `1px solid ${alpha(ac, 0.18)}`, bgcolor: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', px: 1.5, gap: 1 }}>
                    <Placeholder w={20} h={20} r="50%" color={alpha(ac, 0.12)} />
                    <S w={fi === 0 ? '40%' : '55%'} h={13} r={4} accent={ac} />
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Divider */}
            <Box sx={{ height: 1, bgcolor: alpha(ac, 0.1), my: 3 }} />

            {/* Section label */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Placeholder w={20} h={20} r="50%" color={alpha(ac, 0.15)} />
              <S w={220} h={14} r={4} accent={ac} />
            </Box>
            <S w={300} h={11} r={3} accent={ac} sx={{ mb: 3 }} />

            {/* Quick buttons */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              {[80, 100, 108, 108, 114].map((w, i) => (
                <Box key={i} sx={{ width: w, height: 48, borderRadius: '12px', border: `1px solid ${alpha(ac, 0.20)}`, bgcolor: 'transparent', animation: `varPulse 2.2s ease-in-out ${i * 0.07}s infinite` }} />
              ))}
            </Box>

            {/* Month picker dashed box */}
            <Box sx={{ p: 3, borderRadius: 2, border: `2px dashed ${alpha(ac, 0.20)}`, bgcolor: alpha(primaryColor, 0.30) }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <S w={185} h={14} r={4} accent={ac} />
                  <S w={270} h={11} r={3} accent={ac} />
                </Box>
                <Box sx={{ width: 140, height: 40, borderRadius: '8px', border: `1px solid ${alpha(ac, 0.25)}`, bgcolor: 'white', display: 'flex', alignItems: 'center', px: 1.5, gap: 1 }}>
                  <S w="50%" h={12} r={3} accent={ac} />
                  <Placeholder w={18} h={18} r={3} color={alpha(ac, 0.15)} sx={{ ml: 'auto' }} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                {Array.from({ length: 12 }, (_, i) => (
                  <S key={i} w={64} h={44} r={10} accent={ac} sx={{ animation: `varShimmer 1.6s infinite linear ${i * 0.05}s` }} />
                ))}
              </Box>
            </Box>

            {/* Clear button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Box sx={{ width: 160, height: 48, borderRadius: '12px', border: '1px solid rgba(211,47,47,0.30)', bgcolor: 'transparent' }} />
            </Box>
          </Box>
        </Box>

        {/* 3. Results table card */}
        <Box sx={{
          mb: 4, borderRadius: '20px', overflow: 'hidden',
          border: `1px solid ${alpha(ac, 0.1)}`,
          boxShadow: `0 8px 40px ${alpha(ac, 0.08)}`,
          animation: 'varPulse 2.2s ease-in-out 0.15s infinite',
          bgcolor: `rgba(${hexToRgb(primaryColor)},0.95)`,
        }}>
          <Box sx={{ p: 4, background: grad, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <S w={100} h={10} r={3} accent={ac} />
              <S w={160} h={18} r={4} accent={ac} />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <S w={80} h={10} r={3} accent={ac} />
              <S w={120} h={10} r={3} accent={ac} />
            </Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr', gap: 2, px: 3, py: 2, bgcolor: alpha(primaryColor, 0.7), borderBottom: `2px solid ${alpha(ac, 0.08)}` }}>
            {[120, 80, 100].map((w, i) => <S key={i} w={w} h={10} r={3} accent={ac} />)}
          </Box>
          {Array.from({ length: 6 }).map((_, i) => (
            <Box key={i} sx={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr',
              gap: 2, px: 3, py: 2.25, alignItems: 'center',
              borderBottom: i < 5 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              bgcolor: i % 2 === 0 ? '#fff' : alpha(primaryColor, 0.3),
              animation: `varPulse 2.2s ease-in-out ${i * 0.06}s infinite`,
            }}>
              <S w={160} h={12} r={3} accent={ac} />
              <S w={70} h={12} r={3} accent={ac} />
              <Box sx={{ width: 100, height: 26, borderRadius: '13px', bgcolor: alpha(ac, 0.09), border: `1px solid ${alpha(ac, 0.14)}` }} />
            </Box>
          ))}
        </Box>

      </Box>

      {/* FAB placeholder */}
      <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300, animation: 'varPulse 2.2s ease-in-out 0.3s infinite' }}>
        <Placeholder w={56} h={56} r="50%" color="rgba(255,255,255,0.9)" sx={{ border: '1px solid #e0e0e0', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }} />
      </Box>
    </>
  );
};

// ─────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────
const GlassCard = styled(Card)(() => ({
  borderRadius: 20,
  backdropFilter: 'blur(10px)',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': { transform: 'translateY(-4px)' },
}));

const ProfessionalButton = styled(Button)(({ variant }) => ({
  borderRadius: 12,
  fontWeight: 600,
  padding: '12px 24px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  textTransform: 'none',
  fontSize: '0.95rem',
  letterSpacing: '0.025em',
  boxShadow: variant === 'contained' ? '0 4px 14px rgba(254,249,225,0.25)' : 'none',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: variant === 'contained' ? '0 6px 20px rgba(254,249,225,0.35)' : 'none',
  },
  '&:active': { transform: 'translateY(0)' },
}));

const ModernTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backgroundColor: 'rgba(255,255,255,0.8)',
    '&:hover': { transform: 'translateY(-1px)', backgroundColor: 'rgba(255,255,255,0.95)' },
    '&.Mui-focused': { transform: 'translateY(-1px)', boxShadow: '0 4px 20px rgba(254,249,225,0.25)', backgroundColor: 'rgba(255,255,255,1)' },
  },
  '& .MuiInputLabel-root': { fontWeight: 500 },
}));

const PremiumTableContainer = styled(TableContainer)(() => ({
  borderRadius: 16,
  overflow: 'auto',
  boxShadow: '0 4px 24px rgba(109,35,35,0.06)',
  border: '1px solid rgba(109,35,35,0.08)',
  maxHeight: '600px',
  '&::-webkit-scrollbar': { width: '8px', height: '8px' },
  '&::-webkit-scrollbar-track': { background: 'rgba(254,249,225,0.3)', borderRadius: '4px' },
  '&::-webkit-scrollbar-thumb': { background: 'rgba(109,35,35,0.4)', borderRadius: '4px', '&:hover': { background: 'rgba(109,35,35,0.6)' } },
}));

const PremiumTableCell = styled(TableCell)(({ isHeader = false }) => ({
  fontWeight: isHeader ? 600 : 500,
  padding: '18px 20px',
  borderBottom: isHeader ? '2px solid rgba(254,249,225,0.5)' : '1px solid rgba(109,35,35,0.06)',
  fontSize: '0.95rem',
  letterSpacing: '0.025em',
  minWidth: '120px',
  whiteSpace: 'nowrap',
}));

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const AttendanceUserState = () => {
  const { settings } = useSystemSettings();

  const primaryColor       = settings.accentColor        || '#FEF9E1';
  const secondaryColor     = settings.backgroundColor    || '#FFF8E7';
  const accentColor        = settings.primaryColor       || '#6D2323';
  const accentDark         = settings.secondaryColor     || '#8B3333';
  const textPrimaryColor   = settings.textPrimaryColor   || '#6D2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';
  const blackColor         = '#1a1a1a';

  const loggedInEmployeeNumber = localStorage.getItem('employeeNumber') || '';
  const today          = new Date();
  const formattedToday = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const { hasAccess, loading: accessLoading } = usePageAccess('attendance-user-state');

  const [personID, setPersonID]         = useState(loggedInEmployeeNumber);
  const [startDate, setStartDate]       = useState(formattedToday);
  const [endDate, setEndDate]           = useState(formattedToday);
  const [records, setRecords]           = useState([]);
  const [submittedID, setSubmittedID]   = useState('');
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [expandedRow, setExpandedRow]   = useState(null);
  const [sortOrder, setSortOrder]       = useState('desc');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [pageLoading, setPageLoading]   = useState(true);

  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  // ── Snackbar (unified with all modules) ──
  const [snackbar, setSnackbar]               = useState({ open: false, message: '', severity: 'success' });
  const [snackbarCountdown, setSnackbarCountdown] = useState(6);

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

  // ── Dismiss wireframe once access resolves ──
  useEffect(() => { if (!accessLoading) setPageLoading(false); }, [accessLoading]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  };

  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

  const handleMonthClick = (monthIndex) => {
    const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const end   = new Date(Date.UTC(selectedYear, monthIndex + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex);
  };

  const handleSort        = () => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  const handleRowExpand   = (i) => setExpandedRow(expandedRow === i ? null : i);
  const handleClearFilters = () => {
    setStartDate(formattedToday); setEndDate(formattedToday);
    setSelectedMonth(null);
  };

  const fetchRecords = async (showLoading = true) => {
    if (!personID || !startDate || !endDate) return;
    if (showLoading) setLoading(true);
    try {
      const adjustedStart = new Date(startDate);
      adjustedStart.setDate(adjustedStart.getDate() - 1);
      const adjustedEnd = new Date(endDate);
      adjustedEnd.setDate(adjustedEnd.getDate() + 1);

      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/attendance`,
        { personID, startDate: adjustedStart.toISOString().substring(0,10), endDate: adjustedEnd.toISOString().substring(0,10) },
        getAuthHeaders()
      );

      const filteredData = response.data.filter((record) => {
        const dateParts = record.Date.split('/');
        if (dateParts.length === 3) {
          const recordDate = `${dateParts[2]}-${dateParts[0].padStart(2,'0')}-${dateParts[1].padStart(2,'0')}`;
          return recordDate >= startDate && recordDate <= endDate;
        }
        return false;
      });

      setRecords(filteredData);
      setSubmittedID(personID);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch attendance records');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    const initialFetch = async () => {
      await fetchRecords(false);
    };
    initialFetch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch on filter changes
  const isFirstRender = React.useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    fetchRecords();

    const intervalId = setInterval(() => { if (!document.hidden) fetchRecords(false); }, 30000);
    const handleVisibility = () => { if (!document.hidden) fetchRecords(false); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { clearInterval(intervalId); document.removeEventListener('visibilitychange', handleVisibility); };
  }, [personID, startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getAttendanceIcon  = (state) => {
    switch (state) {
      case 1: return <CheckCircle sx={{ fontSize: 16, color: '#4caf50' }} />;
      case 2: return <AccessTime  sx={{ fontSize: 16, color: '#ff9800' }} />;
      case 3: return <AccessTime  sx={{ fontSize: 16, color: '#ff9800' }} />;
      case 4: return <CheckCircle sx={{ fontSize: 16, color: '#4caf50' }} />;
      default: return <Cancel     sx={{ fontSize: 16, color: '#f44336' }} />;
    }
  };
  const getAttendanceColor = (state) => {
    switch (state) {
      case 1: return '#4caf50'; case 2: return '#ff9800';
      case 3: return '#ff9800'; case 4: return '#4caf50';
      default: return '#f44336';
    }
  };
  const getAttendanceLabel = (state) => {
    switch (state) {
      case 1: return 'Time IN'; case 2: return 'Break OUT';
      case 3: return 'Break IN'; case 4: return 'Time OUT';
      default: return 'Uncategorized';
    }
  };

  const filteredRecords = records.sort((a, b) => {
    const dateA = new Date(a.Date + ' ' + a.Time);
    const dateB = new Date(b.Date + ' ' + b.Time);
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // ── Wireframe guard ──
  if (pageLoading || accessLoading) return (
    <AttendanceUserStateWireframe
      accentColor={accentColor}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
    />
  );

  if (hasAccess === false) return (
    <AccessDenied
      title="Access Denied"
      message="You do not have permission to access Attendance User State. Contact your administrator to request access."
      returnPath="/admin-home"
      returnButtonText="Return to Home"
    />
  );

  return (
    <Fade in timeout={500}>
      <Box sx={{
        py: { xs: 2, md: 4 },
        width: '100vw', mx: 'auto', maxWidth: '100%',
        overflow: 'hidden', position: 'relative',
        left: '53%', transform: 'translateX(-51%)',
        px: { xs: 2, sm: 3, md: 6 },
      }}>

        {/* ── Snackbar ── */}
        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert
            onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled"
            sx={{
              width: '100%', fontWeight: 600,
              backgroundColor: snackbar.severity === 'success' ? '#4caf50' : undefined,
              color: snackbar.severity === 'success' ? '#ffffff' : undefined,
              '& .MuiAlert-icon': { color: snackbar.severity === 'success' ? '#ffffff' : undefined },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>{snackbar.message}</span>
              {snackbar.open && snackbarCountdown > 0 && (
                <Chip label={`${snackbarCountdown}s`} size="small"
                  sx={{ backgroundColor: snackbar.severity === 'success' ? 'rgba(255,255,255,0.3)' : undefined, color: snackbar.severity === 'success' ? '#ffffff' : undefined, fontWeight: 700 }} />
              )}
            </Box>
          </Alert>
        </Snackbar>

        {/* ── Hero Header ── */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }}>
            <GlassCard sx={{
              background: `rgba(${hexToRgb(primaryColor)},0.95)`,
              boxShadow: `0 8px 40px ${alpha(accentColor,0.08)}`,
              border: `1px solid ${alpha(accentColor,0.1)}`,
              '&:hover': { boxShadow: `0 12px 48px ${alpha(accentColor,0.15)}` },
            }}>
              <Box sx={{
                p: 5,
                background: `linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%)`,
                color: textPrimaryColor, position: 'relative', overflow: 'hidden',
              }}>
                <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: `radial-gradient(circle,${alpha(accentColor,0.1)} 0%,${alpha(accentColor,0)} 70%)` }} />
                <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, background: `radial-gradient(circle,${alpha(accentColor,0.08)} 0%,${alpha(accentColor,0)} 70%)` }} />
                <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{ bgcolor: alpha(accentColor,0.15), mr: 4, width: 64, height: 64, boxShadow: `0 8px 24px ${alpha(accentColor,0.15)}` }}>
                      <EventNote sx={{ color: textPrimaryColor, fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2, color: textPrimaryColor }}>
                        Attendance Records
                      </Typography>
                      <Typography variant="body1" sx={{ opacity: 0.8, color: textPrimaryColor }}>
                        View and manage your attendance history
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip label="System Generated" size="small"
                      sx={{ bgcolor: alpha(accentColor,0.15), color: textPrimaryColor, fontWeight: 500, '& .MuiChip-label': { px: 1 } }} />
                    <Tooltip title="Refresh Data">
                      <IconButton onClick={() => fetchRecords(true)}
                        sx={{ bgcolor: alpha(accentColor,0.1), '&:hover': { bgcolor: alpha(accentColor,0.2) }, color: textPrimaryColor, width: 48, height: 48 }}>
                        <Refresh />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {/* ── Controls Card ── */}
        <Fade in timeout={700}>
          <GlassCard sx={{
            mb: 4,
            background: `rgba(${hexToRgb(primaryColor)},0.95)`,
            boxShadow: `0 8px 40px ${alpha(accentColor,0.08)}`,
            border: `1px solid ${alpha(accentColor,0.1)}`,
            '&:hover': { boxShadow: `0 12px 48px ${alpha(accentColor,0.15)}` },
          }}>
            <CardContent sx={{ p: 4, '&:last-child': { pb: 4 } }}>

              {/* Input fields */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                {[
                  { label: 'Employee Number', value: personID,  onChange: null,                              type: 'text', icon: <Person sx={{ color: textPrimaryColor }} />, disabled: true },
                  { label: 'Start Date',      value: startDate, onChange: (e) => setStartDate(e.target.value), type: 'date', icon: <CalendarToday sx={{ color: textPrimaryColor }} /> },
                  { label: 'End Date',        value: endDate,   onChange: (e) => setEndDate(e.target.value),   type: 'date', icon: <CalendarToday sx={{ color: textPrimaryColor }} /> },
                ].map(({ label, value, onChange, type, icon, disabled }) => (
                  <Box key={label} sx={{ flex: 1, minWidth: 160 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: textPrimaryColor }}>{label}</Typography>
                    <ModernTextField
                      type={type} value={value} onChange={onChange} disabled={!!disabled}
                      InputLabelProps={type === 'date' ? { shrink: true } : {}}
                      InputProps={{ startAdornment: <InputAdornment position="start">{icon}</InputAdornment> }}
                      fullWidth
                    />
                  </Box>
                ))}
              </Box>

              <Divider sx={{ my: 3, borderColor: alpha(accentColor,0.1) }} />

              {/* Quick Date Selection */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ color: textPrimaryColor, fontWeight: 600, display: 'flex', alignItems: 'center', mb: 2 }}>
                  <FilterList sx={{ mr: 2 }} />
                  Select date range to filter records
                </Typography>

                {/* Quick buttons */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                  {[
                    { label: 'Today',        icon: <Today />,        fn: () => { setStartDate(formattedToday); setEndDate(formattedToday); setSelectedMonth(null); } },
                    { label: 'Yesterday',    icon: <ArrowBackIos />, fn: () => { const y = new Date(today); y.setDate(y.getDate()-1); const s = y.toISOString().substring(0,10); setStartDate(s); setEndDate(s); setSelectedMonth(null); } },
                    { label: 'Last 7 Days',  icon: null,             fn: () => { const d = new Date(today); d.setDate(d.getDate()-7); setStartDate(d.toISOString().substring(0,10)); setEndDate(formattedToday); setSelectedMonth(null); } },
                    { label: 'Last 15 Days', icon: null,             fn: () => { const d = new Date(today); d.setDate(d.getDate()-15); setStartDate(d.toISOString().substring(0,10)); setEndDate(formattedToday); setSelectedMonth(null); } },
                    { label: 'Last 30 Days', icon: null,             fn: () => { const d = new Date(today); d.setMonth(d.getMonth()-1); setStartDate(d.toISOString().substring(0,10)); setEndDate(formattedToday); setSelectedMonth(null); } },
                  ].map(({ label, icon, fn }) => (
                    <ProfessionalButton key={label} variant="outlined" size="medium" onClick={fn}
                      startIcon={icon || undefined}
                      sx={{ borderColor: accentColor, color: textPrimaryColor, fontWeight: 600, py: 1.5, '&:hover': { backgroundColor: alpha(accentColor,0.07), borderWidth: 2 }, transition: 'all 0.3s ease' }}>
                      {label}
                    </ProfessionalButton>
                  ))}
                </Box>

                {/* Month picker — unified dashed box */}
                <Box sx={{ p: 3, borderRadius: 2, border: `2px dashed ${alpha(accentColor,0.2)}`, backgroundColor: alpha(primaryColor,0.3) }}>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 2 }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ color: textPrimaryColor, fontWeight: 600, mb: 0.5 }}>
                        Select Entire Month
                      </Typography>
                      <Typography variant="body2" sx={{ color: alpha(textPrimaryColor,0.7) }}>
                        Choose a year, then click any month to set the range
                      </Typography>
                    </Box>

                    {/* Year selector — fires snackbar on change */}
                    <FormControl sx={{ minWidth: 140 }}>
                      <InputLabel sx={{ fontWeight: 600 }}>Year</InputLabel>
                      <Select
                        value={selectedYear} label="Year"
                        onChange={(e) => {
                          setSelectedYear(e.target.value);
                          setSelectedMonth(null);
                          showSnackbar('Year changed — please click a month to load records.', 'info');
                        }}
                        sx={{ backgroundColor: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: accentColor }, borderRadius: 2, fontWeight: 600 }}
                      >
                        {yearOptions.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>

                  {/* Month buttons — unified flex wrap centered */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                    {months.map((month, index) => {
                      const sel = selectedMonth === index;
                      return (
                        <ProfessionalButton key={month} variant={sel ? 'contained' : 'outlined'} size="medium" onClick={() => handleMonthClick(index)}
                          sx={{
                            borderColor: accentColor,
                            backgroundColor: sel ? accentColor : 'transparent',
                            color: sel ? textSecondaryColor : textPrimaryColor,
                            py: 1.5, px: 4.5, fontWeight: 600,
                            '&:hover': { backgroundColor: sel ? accentDark : alpha(accentColor,0.1), borderWidth: 2 },
                            transition: 'all 0.3s ease',
                            boxShadow: sel ? `0 4px 12px ${alpha(accentColor,0.3)}` : 'none',
                          }}>
                          {month}
                        </ProfessionalButton>
                      );
                    })}
                  </Box>
                </Box>
              </Box>

              {/* Clear button */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <ProfessionalButton variant="outlined" startIcon={<Clear />} onClick={handleClearFilters}
                  sx={{ borderColor: '#d32f2f', color: '#d32f2f', '&:hover': { borderColor: '#b71c1c', backgroundColor: alpha('#d32f2f',0.05) } }}>
                  Clear All Filters
                </ProfessionalButton>
              </Box>

            </CardContent>
          </GlassCard>
        </Fade>

        {loading && (
          <LinearProgress sx={{ mb: 2, borderRadius: 1, bgcolor: alpha(accentColor,0.1), '& .MuiLinearProgress-bar': { bgcolor: accentColor } }} />
        )}

        {error && (
          <Fade in timeout={300}>
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
          </Fade>
        )}

        {/* ── Results ── */}
        {submittedID && (
          <Fade in={!loading} timeout={500}>
            <GlassCard sx={{ mb: 4, border: `1px solid ${alpha(accentColor,0.1)}` }}>
              <Box sx={{
                p: 4,
                background: `linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%)`,
                color: accentColor, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: accentDark }}>
                    Employee Number
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: accentColor }}>{submittedID}</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Badge badgeContent={filteredRecords.length} color="secondary" sx={{ '& .MuiBadge-badge': { fontSize: '0.8rem', height: 24, minWidth: 24 } }}>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Records Found</Typography>
                  </Badge>
                  <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.5, color: accentDark }}>
                    {startDate} to {endDate}
                  </Typography>
                </Box>
              </Box>

              <PremiumTableContainer>
                <Table stickyHeader sx={{ minWidth: '800px' }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(primaryColor,0.7) }}>
                      <PremiumTableCell isHeader sx={{ color: accentColor, cursor: 'pointer', userSelect: 'none', '&:hover': { bgcolor: alpha(accentColor,0.05) } }} onClick={handleSort}>
                        <Box display="flex" alignItems="center" gap={1}>
                          Date
                          {sortOrder === 'asc' ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                        </Box>
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: accentColor }}>Time</PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: accentColor }}>Status</PremiumTableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 6 }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Info sx={{ fontSize: 64, color: alpha(accentColor,0.3), mb: 2 }} />
                            <Typography variant="h5" color={alpha(accentColor,0.6)} gutterBottom sx={{ fontWeight: 600 }}>No records found</Typography>
                            <Typography variant="body1" color={alpha(accentColor,0.4)}>Try adjusting your date range</Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.map((record, idx) => (
                        <React.Fragment key={idx}>
                          <TableRow
                            sx={{ '&:nth-of-type(even)': { bgcolor: alpha(primaryColor,0.3) }, '&:hover': { bgcolor: alpha(accentColor,0.05) }, cursor: 'pointer', transition: 'all 0.2s ease' }}
                            onClick={() => handleRowExpand(idx)}
                          >
                            <PremiumTableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500, color: blackColor }}>
                                {new Date(record.Date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                              </Typography>
                            </PremiumTableCell>
                            <PremiumTableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500, color: blackColor }}>{record.Time}</Typography>
                            </PremiumTableCell>
                            <PremiumTableCell>
                              <Chip
                                icon={getAttendanceIcon(record.AttendanceState)}
                                label={getAttendanceLabel(record.AttendanceState)}
                                size="small"
                                sx={{ bgcolor: alpha(getAttendanceColor(record.AttendanceState),0.1), color: getAttendanceColor(record.AttendanceState), fontWeight: 600, '& .MuiChip-icon': { color: getAttendanceColor(record.AttendanceState) } }}
                              />
                            </PremiumTableCell>
                          </TableRow>
                          {expandedRow === idx && (
                            <TableRow>
                              <TableCell colSpan={3} sx={{ p: 0, bgcolor: alpha(primaryColor,0.5) }}>
                                <Box sx={{ p: 3 }}>
                                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: blackColor }}>Record Details</Typography>
                                  <Grid container spacing={2}>
                                    {[
                                      { label: 'Employee ID', value: record.PersonID },
                                      { label: 'Date',        value: record.Date },
                                      { label: 'Time',        value: record.Time },
                                      { label: 'Status',      value: getAttendanceLabel(record.AttendanceState) },
                                    ].map(({ label, value }) => (
                                      <Grid item xs={6} md={4} key={label}>
                                        <Typography variant="body2" color="text.secondary">{label}</Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 500, color: blackColor }}>{value}</Typography>
                                      </Grid>
                                    ))}
                                  </Grid>
                                </Box>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </PremiumTableContainer>
            </GlassCard>
          </Fade>
        )}

        {/* ── Scroll to Top ── */}
        <Zoom in={showScrollTop}>
          <Fab sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, bgcolor: accentColor, color: primaryColor, '&:hover': { bgcolor: accentDark } }} onClick={scrollToTop}>
            <KeyboardArrowUp />
          </Fab>
        </Zoom>

      </Box>
    </Fade>
  );
};

export default AttendanceUserState;