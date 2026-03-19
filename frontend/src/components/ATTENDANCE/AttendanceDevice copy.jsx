import API_BASE_URL from '../../apiConfig';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useSocket } from '../../contexts/SocketContext';
import {
  Box,
  TextField,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Grid,
  InputAdornment,
  Divider,
  Avatar,
  IconButton,
  Fade,
  Alert,
  alpha,
  Chip,
  styled,
  Backdrop,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Snackbar,
  Dialog,
  LinearProgress,
  Container,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Person,
  CalendarToday,
  Today,
  ArrowBackIos,
  Clear,
  Send,
  Refresh,
  Info,
  Assignment,
  FilterList,
  People,
  CheckCircle,
  ArrowBack,
  ArrowForward,
  SearchOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import AccessDenied from '../AccessDenied';
import usePageAccess from '../../hooks/usePageAccess';

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
// WIREFRAME  — same shimmer pattern as DailyTimeRecord
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

const ViewAttendanceWireframe = ({
  accentColor    = '#6d2323',
  primaryColor   = '#FEF9E1',
  secondaryColor = '#FFF8E7',
}) => {
  const ac   = accentColor;
  const grad = `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`;

  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <Box sx={{ py: { xs: 2, md: 4 }, width: '100vw', mx: 'auto', maxWidth: '100%', overflow: 'hidden', position: 'relative', left: '53%', transform: 'translateX(-51%)', px: { xs: 2, sm: 3, md: 6 } }}>

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
                    <S w={260} h={26} r={6} accent={ac} />
                    <S w={320} h={13} r={4} accent={ac} />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <S w={145} h={26} r={13} accent={ac} />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <S w={105} h={40} r={12} accent={ac} />
                    <S w={95}  h={40} r={12} accent={ac} />
                  </Box>
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
            <Box sx={{ p: 4, background: grad, display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
              <Placeholder w={28} h={28} r="50%" color={alpha(ac, 0.2)} />
              <S w={270} h={13} r={4} accent={ac} />
            </Box>
            <Box sx={{ p: 4 }}>
              {/* 3-field input row */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                {[110, 70, 70].map((lw, fi) => (
                  <Box key={fi} sx={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <S w={lw} h={12} r={3} accent={ac} />
                    <Box sx={{ height: 56, borderRadius: '12px', border: `1px solid ${alpha(ac, 0.18)}`, bgcolor: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', px: 1.5 }}>
                      <S w={fi === 0 ? '40%' : '60%'} h={13} r={4} accent={ac} />
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* Divider */}
              <Box sx={{ height: 1, bgcolor: alpha(ac, 0.1), my: 3 }} />

              {/* Section label */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Placeholder w={20} h={20} r="50%" color={alpha(ac, 0.15)} />
                <S w={210} h={14} r={4} accent={ac} />
              </Box>

              {/* Dept filter */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                <Box sx={{ width: 320, height: 52, borderRadius: '4px', border: `1px solid ${alpha(ac, 0.18)}`, bgcolor: '#fff', display: 'flex', alignItems: 'center', px: 2 }}>
                  <S w="55%" h={11} r={3} accent={ac} />
                </Box>
                <Box sx={{ width: 180, height: 48, borderRadius: '12px', border: `1px solid ${alpha(ac, 0.20)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
                  <Placeholder w={18} h={18} r="50%" color={alpha(ac, 0.12)} />
                  <S w={110} h={11} r={3} accent={ac} />
                </Box>
              </Box>

              {/* Quick buttons */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                {[80, 100, 108, 108, 114].map((w, i) => (
                  <Box key={i} sx={{ width: w, height: 48, borderRadius: '12px', border: `1px solid ${alpha(ac, 0.20)}`, bgcolor: 'transparent', animation: `varPulse 2.2s ease-in-out ${i * 0.07}s infinite` }} />
                ))}
              </Box>

              {/* Month picker */}
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
                <Box sx={{ width: 150, height: 48, borderRadius: '12px', border: '1px solid rgba(211,47,47,0.30)', bgcolor: 'transparent' }} />
              </Box>
            </Box>
          </Box>

          {/* 3. All Users table card */}
          <Box sx={{
            mb: 4, borderRadius: '20px', overflow: 'hidden',
            border: `1px solid ${alpha(ac, 0.1)}`,
            boxShadow: `0 8px 40px ${alpha(ac, 0.08)}`,
            animation: 'varPulse 2.2s ease-in-out 0.15s infinite',
            bgcolor: `rgba(${hexToRgb(primaryColor)},0.95)`,
          }}>
            <Box sx={{ p: 4, background: grad, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Placeholder w={48} h={48} r="50%" color={alpha(ac, 0.15)} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <S w={210} h={16} r={4} accent={ac} />
                  <S w={130} h={11} r={3} accent={ac} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <S w={140} h={44} r={12} accent={ac} />
                <S w={140} h={44} r={12} accent="#4caf50" sx={{ background: 'linear-gradient(90deg,rgba(76,175,80,0.15) 25%,rgba(76,175,80,0.30) 50%,rgba(76,175,80,0.15) 75%)', backgroundSize: '900px 100%' }} />
              </Box>
            </Box>

            <Box sx={{ p: 4 }}>
              {/* Toolbar */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                <Box sx={{ width: 300, height: 52, borderRadius: '12px', border: `1px solid ${alpha(ac, 0.18)}`, bgcolor: '#fff', display: 'flex', alignItems: 'center', px: 1.5, gap: 1 }}>
                  <Placeholder w={18} h={18} r="50%" color={alpha(ac, 0.12)} />
                  <S w="55%" h={11} r={3} accent={ac} />
                </Box>
                <Box sx={{ width: 160, height: 52, borderRadius: '4px', border: `1px solid ${alpha(ac, 0.18)}`, bgcolor: '#fff', display: 'flex', alignItems: 'center', px: 1.5 }}>
                  <S w="58%" h={11} r={3} accent={ac} />
                </Box>
                <Box sx={{ width: 118, height: 48, borderRadius: '12px', border: `1px solid ${alpha(ac, 0.22)}`, bgcolor: 'transparent' }} />
              </Box>

              {/* Table */}
              <Box sx={{ borderRadius: '16px', overflow: 'hidden', border: `1px solid ${alpha(ac, 0.08)}`, boxShadow: `0 4px 24px ${alpha(ac, 0.06)}` }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '52px 1.1fr 1fr 2fr 1fr 1.1fr 1fr', gap: 2, px: 3, py: 2, bgcolor: alpha(primaryColor, 0.7), borderBottom: `2px solid ${alpha(ac, 0.08)}`, alignItems: 'center' }}>
                  <Placeholder w={20} h={20} r={4} color={alpha(ac, 0.10)} />
                  {[88, 75, 75, 100, 78, 68].map((w, i) => <S key={i} w={w} h={10} r={3} accent={ac} />)}
                </Box>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Box key={i} sx={{
                    display: 'grid', gridTemplateColumns: '52px 1.1fr 1fr 2fr 1fr 1.1fr 1fr',
                    gap: 2, px: 3, py: 2.25, alignItems: 'center',
                    borderBottom: i < 7 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                    bgcolor: i % 2 === 0 ? '#fff' : alpha(primaryColor, 0.3),
                    animation: `varPulse 2.2s ease-in-out ${i * 0.06}s infinite`,
                  }}>
                    <Placeholder w={20} h={20} r={4} color={alpha(ac, 0.10)} />
                    <S w={60} h={11} r={3} accent={ac} />
                    <Box sx={{ width: 66, height: 24, borderRadius: '12px', bgcolor: alpha(ac, 0.09), border: `1px solid ${alpha(ac, 0.14)}` }} />
                    <Box><S w={140} h={12} r={3} accent={ac} sx={{ mb: 0.4 }} /><S w={72} h={9} r={2} accent={ac} /></Box>
                    <S w={28} h={11} r={3} accent={ac} />
                    <Box sx={{ width: 82, height: 24, borderRadius: '12px', bgcolor: 'rgba(76,175,80,0.12)', border: '1px solid rgba(76,175,80,0.22)' }} />
                    <Box sx={{ width: 84, height: 32, borderRadius: '12px', bgcolor: 'rgba(76,175,80,0.18)' }} />
                  </Box>
                ))}
              </Box>

              {/* Pagination */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2.5, flexWrap: 'wrap', gap: 2 }}>
                <S w={210} h={11} r={3} accent={ac} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 140, height: 44, borderRadius: '4px', border: `1px solid ${alpha(ac, 0.18)}`, bgcolor: '#fff', display: 'flex', alignItems: 'center', px: 1.5 }}>
                    <S w="50%" h={11} r={3} accent={ac} />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Placeholder w={36} h={36} r="50%" color={alpha(ac, 0.10)} />
                    <S w={38} h={11} r={3} accent={ac} />
                    <Placeholder w={36} h={36} r="50%" color={alpha(ac, 0.10)} />
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>

      </Box>

      {/* FAB placeholders */}
      <Box sx={{ position: 'fixed', bottom: 60, right: 24, display: 'flex', gap: 1.5, zIndex: 1300, animation: 'varPulse 2.2s ease-in-out 0.3s infinite' }}>
        {[0, 1].map((i) => (
          <Placeholder key={i} w={52} h={52} r="50%" color="rgba(255,255,255,0.9)" sx={{ border: '1px solid #e0e0e0', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }} />
        ))}
      </Box>
    </>
  );
};

// ─────────────────────────────────────────────
// STYLED COMPONENTS  (matches DailyTimeRecord)
// ─────────────────────────────────────────────
const GlassCard = styled(Card)(({ theme }) => ({
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
  boxShadow: variant === 'contained' ? '0 4px 14px rgba(254,249,225,0.25)' : 'none',
  '&:hover': { boxShadow: variant === 'contained' ? '0 6px 20px rgba(254,249,225,0.35)' : 'none' },
  '&:active': { boxShadow: 'none' },
}));

const ModernTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    transition: 'box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s',
    backgroundColor: 'rgba(255,255,255,0.8)',
    '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
    '&.Mui-focused': { boxShadow: '0 4px 20px rgba(254,249,225,0.25)', backgroundColor: 'rgba(255,255,255,1)' },
  },
  '& .MuiInputLabel-root': { fontWeight: 500 },
}));

const PremiumTableContainer = styled(TableContainer)(() => ({
  borderRadius: 16,
  overflowX: 'auto',
  boxShadow: '0 4px 24px rgba(109,35,35,0.06)',
  border: '1px solid rgba(109,35,35,0.08)',
}));

const PremiumTableCell = styled(TableCell)(({ isHeader = false }) => ({
  fontWeight: isHeader ? 600 : 500,
  padding: '18px 20px',
  borderBottom: isHeader ? '2px solid rgba(254,249,225,0.5)' : '1px solid rgba(109,35,35,0.06)',
  fontSize: '0.95rem',
  letterSpacing: '0.025em',
}));

// ─────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
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

  const [snackbar, setSnackbar]               = useState({ open: false, message: '', severity: 'success' });
  const [snackbarCountdown, setSnackbarCountdown] = useState(6);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalMessage, setModalMessage]         = useState('');

  const [allUsersDTR, setAllUsersDTR]         = useState([]);
  const [selectedUsers, setSelectedUsers]     = useState(new Set());
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);
  const [viewMode, setViewMode]               = useState('single');
  const [selectedMonth, setSelectedMonth]     = useState(null);

  // ── Year selector — same pattern as DailyTimeRecord ──
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const [departments, setDepartments]                             = useState([]);
  const [departmentAssignmentsMap, setDepartmentAssignmentsMap]   = useState({});
  const [departmentCodeFilter, setDepartmentCodeFilter]           = useState('');
  const [loadingDepartments, setLoadingDepartments]               = useState(false);

  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
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

  const [pageLoading, setPageLoading] = useState(true);

  const fetchRecordsRef     = useRef(null);
  const fetchAllUsersDTRRef = useRef(null);

  const { hasAccess, loading: accessLoading } = usePageAccess('view-attendance');

  // ── Theme ──
  const primaryColor       = settings.accentColor        || '#FEF9E1';
  const secondaryColor     = settings.backgroundColor    || '#FFF8E7';
  const accentColor        = settings.primaryColor       || '#6d2323';
  const accentDark         = settings.secondaryColor     || '#8B3333';
  const textPrimaryColor   = settings.textPrimaryColor   || '#6d2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';

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

  // Dismiss wireframe once access resolves
  useEffect(() => { if (!accessLoading) setPageLoading(false); }, [accessLoading]);

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

  // ── Month click — same as DailyTimeRecord ──
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

  // ── Wireframe guard ──
  if (pageLoading || accessLoading) return (
    <ViewAttendanceWireframe accentColor={accentColor} primaryColor={primaryColor} secondaryColor={secondaryColor} />
  );

  if (hasAccess === false) return (
    <AccessDenied title="Access Denied" message="You do not have permission to access Device Attendance Records." returnPath="/admin-home" returnButtonText="Return to Home" />
  );

  const pct = progressTotal > 0 ? Math.min(100, Math.round((progressDone / progressTotal) * 100)) : 0;

  return (
    <Fade in timeout={500}>
      <Box sx={{ py: { xs: 2, md: 4 }, width: '100vw', mx: 'auto', maxWidth: '100%', overflow: 'hidden', position: 'relative', left: '53%', transform: 'translateX(-51%)', px: { xs: 2, sm: 3, md: 6 } }}>

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

          {/* ── Progress Dialog ── */}
          <Dialog open={progressOpen} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4, backgroundColor: '#ffffff', boxShadow: `0 10px 50px ${alpha(accentColor,0.12)}`, overflow: 'hidden' } }}>
            <Box sx={{ p: 4, minHeight: 320, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 2 }}>
              <Typography sx={{ fontWeight: 900, fontSize: '1.4rem', color: '#111', mb: 0.5 }}>Loading All Users</Typography>
              <CircularProgress size={90} thickness={4.2} sx={{ color: '#2e7d32', my: 1 }} />
              <Typography sx={{ fontWeight: 1000, fontSize: '1.5rem', lineHeight: 1, color: '#2e7d32', letterSpacing: '-0.02em' }}>{pct}%</Typography>
              <Box sx={{ width: '100%', maxWidth: 420, mt: 1 }}>
                <LinearProgress variant="determinate" value={pct} sx={{ height: 14, borderRadius: 99, backgroundColor: '#eeeeee', '& .MuiLinearProgress-bar': { borderRadius: 99, backgroundColor: '#2e7d32' } }} />
              </Box>
              <Typography variant="body2" sx={{ color: '#444', fontWeight: 700, mt: 1 }}>{progressDone} / {progressTotal} processed</Typography>
              <Typography variant="caption" sx={{ color: '#666' }}>Please wait while records are being fetched and auto-saved...</Typography>
            </Box>
          </Dialog>

          {/* ── Success Modal ── */}
          <Dialog open={showSuccessModal} onClose={() => setShowSuccessModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4, boxShadow: `0 8px 40px ${alpha(accentColor,0.2)}` } }}>
            <Box sx={{ p: 4, textAlign: 'center', background: `linear-gradient(135deg, ${alpha(primaryColor,0.3)} 0%, ${alpha(secondaryColor,0.5)} 100%)` }}>
              <Avatar sx={{ width: 80, height: 80, margin: '0 auto 20px', backgroundColor: '#4caf50' }}><CheckCircle sx={{ fontSize: 48, color: '#ffffff' }} /></Avatar>
              <Typography variant="h5" sx={{ fontWeight: 700, color: textPrimaryColor, mb: 2 }}>Records Auto-Saved Successfully!</Typography>
              <Typography variant="body1" sx={{ color: alpha(textPrimaryColor,0.8), mb: 4, lineHeight: 1.6 }}>{modalMessage}</Typography>
              <ProfessionalButton variant="contained" onClick={() => setShowSuccessModal(false)}
                sx={{ backgroundColor: accentColor, color: textSecondaryColor, px: 6, py: 1.5, fontSize: '1rem', fontWeight: 700, '&:hover': { backgroundColor: accentDark, transform: 'scale(1.05)' }, transition: 'all 0.3s ease' }}>
                OK
              </ProfessionalButton>
            </Box>
          </Dialog>

          {/* ── Hero Header ── */}
          <Fade in timeout={500}>
            <Box sx={{ mb: 4 }}>
              <GlassCard sx={{ background: `rgba(${hexToRgb(primaryColor)},0.95)`, boxShadow: `0 8px 40px ${alpha(accentColor,0.08)}`, border: `1px solid ${alpha(accentColor,0.1)}` }}>
                <Box sx={{ p: 5, background: `linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%)`, color: textPrimaryColor, position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: `radial-gradient(circle,${alpha(accentColor,0.1)} 0%,${alpha(accentColor,0)} 70%)` }} />
                  <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, background: `radial-gradient(circle,${alpha(accentColor,0.08)} 0%,${alpha(accentColor,0)} 70%)` }} />
                  <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ bgcolor: alpha(accentColor,0.15), mr: 4, width: 64, height: 64, boxShadow: `0 8px 24px ${alpha(accentColor,0.15)}` }}>
                        <Search sx={{ color: textPrimaryColor, fontSize: 32 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2, color: textPrimaryColor }}>Device Attendance Records</Typography>
                        <Typography variant="body1" sx={{ opacity: 0.8, color: textPrimaryColor }}>Auto-saved records from biometric devices - ready for DTR</Typography>
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Chip icon={<CheckCircle />} label="Auto-Save Enabled" size="small" sx={{ bgcolor: alpha('#4caf50',0.2), color: '#2e7d32', fontWeight: 600 }} />
                      <Box display="flex" gap={1}>
                        <ProfessionalButton variant={viewMode === 'single' ? 'contained' : 'outlined'} onClick={() => setViewMode('single')}
                          sx={{ backgroundColor: viewMode === 'single' ? accentColor : 'transparent', color: viewMode === 'single' ? textSecondaryColor : textPrimaryColor, borderColor: accentColor, py: 0.75, px: 2 }}>
                          Single User
                        </ProfessionalButton>
                        <ProfessionalButton variant={viewMode === 'multiple' ? 'contained' : 'outlined'} onClick={() => setViewMode('multiple')}
                          sx={{ backgroundColor: viewMode === 'multiple' ? accentColor : 'transparent', color: viewMode === 'multiple' ? textSecondaryColor : textPrimaryColor, borderColor: accentColor, py: 0.75, px: 2 }}>
                          All Users
                        </ProfessionalButton>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </GlassCard>
            </Box>
          </Fade>

          {/* ── Controls Card ── */}
          <Fade in timeout={700}>
            <GlassCard sx={{ mb: 4, background: `rgba(${hexToRgb(primaryColor)},0.95)`, boxShadow: `0 8px 40px ${alpha(accentColor,0.08)}`, border: `1px solid ${alpha(accentColor,0.1)}` }}>
              <CardContent sx={{ p: 4 }}>
                <Box component="form" onSubmit={handleSubmit}>

                  {/* Date inputs */}
                  {viewMode === 'single' ? (
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                      {[
                        { label: 'Employee Number', value: personID,   onChange: (e) => setPersonID(e.target.value),   type: 'text', icon: <Person sx={{ color: textPrimaryColor }} /> },
                        { label: 'Start Date',      value: startDate,  onChange: (e) => setStartDate(e.target.value),  type: 'date', icon: <CalendarToday sx={{ color: textPrimaryColor }} /> },
                        { label: 'End Date',        value: endDate,    onChange: (e) => setEndDate(e.target.value),    type: 'date', icon: <CalendarToday sx={{ color: textPrimaryColor }} /> },
                      ].map(({ label, value, onChange, type, icon }) => (
                        <Box key={label} sx={{ flex: 1, minWidth: 160 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: textPrimaryColor }}>{label}</Typography>
                          <ModernTextField type={type} value={value} onChange={onChange} InputLabelProps={type === 'date' ? { shrink: true } : {}}
                            InputProps={{ startAdornment: <InputAdornment position="start">{icon}</InputAdornment> }} fullWidth required />
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                      {[
                        { label: 'Start Date', value: startDate, onChange: (e) => setStartDate(e.target.value) },
                        { label: 'End Date',   value: endDate,   onChange: (e) => setEndDate(e.target.value) },
                      ].map(({ label, value, onChange }) => (
                        <Box key={label} sx={{ flex: 1, minWidth: 160 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: textPrimaryColor }}>{label}</Typography>
                          <ModernTextField type="date" value={value} onChange={onChange} InputLabelProps={{ shrink: true }}
                            InputProps={{ startAdornment: <InputAdornment position="start"><CalendarToday sx={{ color: textPrimaryColor }} /></InputAdornment> }} fullWidth required />
                        </Box>
                      ))}
                    </Box>
                  )}

                  <Divider sx={{ my: 3, borderColor: alpha(accentColor,0.1) }} />

                  {/* Quick Date Selection */}
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ color: textPrimaryColor, fontWeight: 600, display: 'flex', alignItems: 'center', mb: 2 }}>
                      <FilterList sx={{ mr: 2 }} />Select date range to filter records
                    </Typography>

                    {/* Department filter */}
                    {viewMode === 'multiple' && (
                      <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <FormControl sx={{ minWidth: 320, backgroundColor: 'white' }} disabled={loadingDepartments}>
                          <InputLabel>Department</InputLabel>
                          <Select value={departmentCodeFilter} label="Department" onChange={(e) => { setDepartmentCodeFilter(e.target.value); setCurrentPage(1); }}>
                            <MenuItem value="">All Departments</MenuItem>
                            <MenuItem value="__UNASSIGNED__">Unassigned</MenuItem>
                            {departments.map((d) => <MenuItem key={d.id??d.code} value={d.code}>{d.code}{d.description ? ` - ${d.description}` : ''}</MenuItem>)}
                          </Select>
                        </FormControl>
                        <ProfessionalButton variant="outlined" onClick={fetchDepartmentsAndAssignments} disabled={loadingDepartments}
                          startIcon={loadingDepartments ? <CircularProgress size={18} /> : <Refresh />}
                          sx={{ borderColor: accentColor, color: textPrimaryColor }}>
                          Refresh Departments
                        </ProfessionalButton>
                      </Box>
                    )}

                    {/* Quick buttons */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                      {[
                        { label: 'Today',        icon: <Today />,        fn: () => { setStartDate(formattedToday); setEndDate(formattedToday); } },
                        { label: 'Yesterday',    icon: <ArrowBackIos />, fn: () => { const y = new Date(today); y.setDate(y.getDate()-1); const s = y.toISOString().substring(0,10); setStartDate(s); setEndDate(s); } },
                        { label: 'Last 7 Days',  icon: null,             fn: () => { const d = new Date(today); d.setDate(d.getDate()-7); setStartDate(d.toISOString().substring(0,10)); setEndDate(formattedToday); } },
                        { label: 'Last 15 Days', icon: null,             fn: () => { const d = new Date(today); d.setDate(d.getDate()-15); setStartDate(d.toISOString().substring(0,10)); setEndDate(formattedToday); } },
                        { label: 'Last 30 Days', icon: null,             fn: () => { const d = new Date(today); d.setMonth(d.getMonth()-1); setStartDate(d.toISOString().substring(0,10)); setEndDate(formattedToday); } },
                      ].map(({ label, icon, fn }) => (
                        <ProfessionalButton key={label} variant="outlined" size="medium" onClick={fn}
                          startIcon={icon || undefined}
                          sx={{ borderColor: accentColor, color: textPrimaryColor, fontWeight: 600, py: 1.5, '&:hover':{ backgroundColor: alpha(accentColor,0.07), borderWidth: 2 }, transition: 'all 0.3s ease' }}>
                          {label}
                        </ProfessionalButton>
                      ))}
                    </Box>

                    {/* Month picker — layout matches DailyTimeRecord exactly */}
                    <Box sx={{ p: 3, borderRadius: 2, border: `2px dashed ${alpha(accentColor,0.2)}`, backgroundColor: alpha(primaryColor,0.3) }}>
                      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 2 }}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ color: textPrimaryColor, fontWeight: 600, mb: 0.5 }}>Select Entire Month</Typography>
                          <Typography variant="body2" sx={{ color: alpha(textPrimaryColor,0.7) }}>Choose a year, then click any month to set the range</Typography>
                        </Box>

                        {/* ── Year selector — copied from DailyTimeRecord, fires snackbar on change ── */}
                        <FormControl sx={{ minWidth: 140 }}>
                          <InputLabel sx={{ fontWeight: 600 }}>Year</InputLabel>
                          <Select
                            value={selectedYear}
                            label="Year"
                            onChange={(e) => {
                              setSelectedYear(e.target.value);
                              setSelectedMonth(null);
                              showSnackbar('Year changed — please click a month to load records.', 'info');
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
                              sx={{ borderColor: accentColor, backgroundColor: sel ? accentColor : 'transparent', color: sel ? textSecondaryColor : textPrimaryColor, py: 1.5, px: 4.5, fontWeight: 600, '&:hover':{ backgroundColor: sel ? accentDark : alpha(accentColor,0.1), borderWidth: 2 }, transition: 'all 0.3s ease', boxShadow: sel ? `0 4px 12px ${alpha(accentColor,0.3)}` : 'none' }}>
                              {month}
                            </ProfessionalButton>
                          );
                        })}
                      </Box>
                    </Box>
                  </Box>

                  {/* Clear button */}
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <ProfessionalButton variant="outlined" startIcon={<Clear />} onClick={handleClearFilters}
                      sx={{ borderColor: '#d32f2f', color: '#d32f2f', '&:hover':{ borderColor: '#b71c1c', backgroundColor: alpha('#d32f2f',0.05) } }}>
                      Clear All Filters
                    </ProfessionalButton>
                  </Box>
                </Box>
              </CardContent>
            </GlassCard>
          </Fade>

          {/* ── All Users Card ── */}
          {viewMode === 'multiple' && (
            <Fade in timeout={1000}>
              <GlassCard sx={{ mb: 4, background: `rgba(${hexToRgb(primaryColor)},0.95)`, boxShadow: `0 8px 40px ${alpha(accentColor,0.08)}`, border: `1px solid ${alpha(accentColor,0.1)}` }}>
                <Box sx={{ p: 4, background: `linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%)`, color: textPrimaryColor, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: textPrimaryColor }}>All Users DTR List (Auto-Saved)</Typography>
                  <Box display="flex" gap={2} flexWrap="wrap">
                    <ProfessionalButton variant="contained" onClick={fetchAllUsersDTR} disabled={loadingAllUsers || !startDate || !endDate}
                      startIcon={loadingAllUsers ? <CircularProgress size={20} /> : <People />}
                      sx={{ backgroundColor: accentColor, color: textSecondaryColor }}>
                      {loadingAllUsers ? 'Loading...' : 'Load All Users'}
                    </ProfessionalButton>
                    {allUsersDTR.length > 0 && (
                      <ProfessionalButton variant="contained" onClick={handleBulkSendToDTR} disabled={selectedCountInFiltered === 0} startIcon={<Send />}
                        sx={{ backgroundColor: '#4caf50', color: '#ffffff', '&:hover':{ backgroundColor: '#45a049' } }}>
                        View DTR ({selectedCountInFiltered})
                      </ProfessionalButton>
                    )}
                  </Box>
                </Box>

                <Box sx={{ p: 4 }}>
                  {allUsersDTR.length > 0 ? (
                    <>
                      {/* Toolbar */}
                      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                        <ModernTextField label="Search users" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                          InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined /></InputAdornment>, endAdornment: searchQuery ? (<InputAdornment position="end"><IconButton size="small" onClick={() => { setSearchQuery(''); setCurrentPage(1); }}><Clear /></IconButton></InputAdornment>) : null }}
                          sx={{ minWidth: 300 }} />
                        <FormControl sx={{ minWidth: 160, backgroundColor: 'white' }}>
                          <InputLabel>Records</InputLabel>
                          <Select value={recordFilter} label="Records" onChange={(e) => { setRecordFilter(e.target.value); setCurrentPage(1); }}>
                            <MenuItem value="all">All</MenuItem>
                            <MenuItem value="has">Has Records</MenuItem>
                            <MenuItem value="no">No Records</MenuItem>
                          </Select>
                        </FormControl>
                        <ProfessionalButton variant="outlined" onClick={() => handleSelectAll(selectedCountInFiltered !== filteredUsers.length)}
                          sx={{ borderColor: accentColor, color: accentColor }}>
                          {selectedCountInFiltered === filteredUsers.length ? 'Deselect All' : 'Select All'}
                        </ProfessionalButton>
                      </Box>

                      {/* Table */}
                      <PremiumTableContainer sx={{ maxHeight: 520, overflowY: 'auto' }}>
                        <Table sx={{ minWidth: 800 }} stickyHeader>
                          <TableHead>
                            <TableRow sx={{ bgcolor: alpha(primaryColor,0.7) }}>
                              <PremiumTableCell isHeader>
                                <Checkbox checked={selectedCountInFiltered === filteredUsers.length && filteredUsers.length > 0} indeterminate={selectedCountInFiltered > 0 && selectedCountInFiltered < filteredUsers.length} onChange={(e) => handleSelectAll(e.target.checked)}
                                  sx={{ color: alpha(accentColor,0.5), '&.Mui-checked':{ color: accentColor }, '&.MuiCheckbox-indeterminate':{ color: accentColor } }} />
                              </PremiumTableCell>
                              {['Employee Number','Department','Full Name','Records Count','Status','Action'].map((h) => (
                                <PremiumTableCell key={h} isHeader sx={{ color: textPrimaryColor }}>{h}</PremiumTableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {paginatedUsers.map((user) => (
                              <TableRow key={user.employeeNumber} sx={{ '&:nth-of-type(even)':{ bgcolor: alpha(primaryColor,0.3) }, '&:hover':{ bgcolor: alpha(accentColor,0.05) }, transition: 'all 0.2s ease' }}>
                                <PremiumTableCell><Checkbox checked={selectedUsers.has(user.employeeNumber)} onChange={() => handleUserSelect(user.employeeNumber)} /></PremiumTableCell>
                                <PremiumTableCell>{user.employeeNumber}</PremiumTableCell>
                                <PremiumTableCell>{(() => { const d = departmentAssignmentsMap?.[user.employeeNumber]||''; return d ? <Chip label={d} size="small" /> : <Chip label="Unassigned" size="small" variant="outlined" />; })()}</PremiumTableCell>
                                <PremiumTableCell>{trimmedSearch ? highlightMatch(formatFullName(user.fullName), trimmedSearch) : formatFullName(user.fullName)}</PremiumTableCell>
                                <PremiumTableCell>{user.recordsCount || 0}</PremiumTableCell>
                                <PremiumTableCell><Chip label={user.hasRecords ? 'Auto-Saved' : 'No Records'} color={user.hasRecords ? 'success' : 'default'} size="small" icon={user.hasRecords ? <CheckCircle /> : undefined} /></PremiumTableCell>
                                <PremiumTableCell>
                                  <ProfessionalButton variant="contained" size="small" startIcon={<Send />} disabled={!user.hasRecords}
                                    onClick={() => navigate('/daily_time_record_faculty', { state: { employeeNumber: user.employeeNumber, fullName: user.fullName, startDate, endDate } })}
                                    sx={{ backgroundColor: '#4caf50', color: '#ffffff', py: 0.5, px: 1.5, '&:hover':{ backgroundColor: '#45a049' }, '&:disabled':{ backgroundColor: alpha('#4caf50',0.3), color: alpha('#ffffff',0.5) } }}>
                                    View DTR
                                  </ProfessionalButton>
                                </PremiumTableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </PremiumTableContainer>

                      {/* Pagination */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, gap: 2, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ color: textPrimaryColor }}>
                          Showing {filteredUsers.length === 0 ? 0 : Math.min(filteredUsers.length,(currentPage-1)*rowsPerPage+1)} - {Math.min(filteredUsers.length,currentPage*rowsPerPage)} of {filteredUsers.length} users
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <FormControl sx={{ minWidth: 140, backgroundColor: 'white' }}>
                            <InputLabel>Rows</InputLabel>
                            <Select value={rowsPerPage} label="Rows" onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                              {[10,20,50,100].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                            </Select>
                          </FormControl>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconButton onClick={() => goToPage(currentPage-1)} disabled={currentPage === 1} sx={{ bgcolor: 'white', border: `1px solid ${alpha(accentColor,0.15)}` }}><ArrowBack /></IconButton>
                            <Typography sx={{ minWidth: 36, textAlign: 'center', fontWeight: 600, color: textPrimaryColor }}>{currentPage} / {totalPages}</Typography>
                            <IconButton onClick={() => goToPage(currentPage+1)} disabled={currentPage === totalPages} sx={{ bgcolor: 'white', border: `1px solid ${alpha(accentColor,0.15)}` }}><ArrowForward /></IconButton>
                          </Box>
                        </Box>
                      </Box>
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4, color: textPrimaryColor, opacity: 0.7 }}>
                      <Typography variant="body1">Click "Load All Users" to fetch and auto-save all users' DTR data</Typography>
                    </Box>
                  )}
                </Box>
              </GlassCard>
            </Fade>
          )}

          {/* ── Loading Backdrop ── */}
          <Backdrop sx={{ color: textSecondaryColor, zIndex: (theme) => theme.zIndex.drawer + 1 }} open={loading}>
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress color="inherit" size={60} thickness={4} />
              <Typography variant="h6" sx={{ mt: 2, color: textSecondaryColor }}>Fetching and auto-saving records...</Typography>
            </Box>
          </Backdrop>

          {error && <Fade in timeout={300}><Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>{error}</Alert></Fade>}

          {/* ── Single User Results ── */}
          {viewMode === 'single' && personName && (
            <Fade in={!loading} timeout={500}>
              <GlassCard sx={{ mb: 4, background: `rgba(${hexToRgb(primaryColor)},0.95)`, boxShadow: `0 8px 40px ${alpha(accentColor,0.08)}`, border: `1px solid ${alpha(accentColor,0.1)}` }}>
                <Box sx={{ p: 4, background: `linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%)`, color: textPrimaryColor, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.8, mb: 1, textTransform: 'uppercase', letterSpacing: '0.1em', color: textPrimaryColor }}>Device Record Summary (Auto-Saved)</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2, color: textPrimaryColor }}>{personName}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                      <Chip icon={<Assignment />} label={`${records.length} Records`} size="small" sx={{ bgcolor: alpha(accentColor,0.15), color: textPrimaryColor, fontWeight: 500 }} />
                      <Chip icon={<CheckCircle />} label="Auto-Saved" size="small" sx={{ bgcolor: alpha('#4caf50',0.2), color: '#2e7d32', fontWeight: 500 }} />
                      <Typography variant="body2" sx={{ opacity: 0.8, color: textPrimaryColor }}>{startDate} to {endDate}</Typography>
                    </Box>
                  </Box>
                  <Box display="flex" flexDirection="column" alignItems="flex-end" gap={2}>
                    <Avatar sx={{ bgcolor: alpha(accentColor,0.15), width: 80, height: 80, fontSize: '2rem', fontWeight: 700, color: textPrimaryColor, boxShadow: `0 8px 24px ${alpha(accentColor,0.15)}` }}>
                      {personName.split(' ').map((n) => n[0]).join('').toUpperCase()}
                    </Avatar>
                    <ProfessionalButton variant="contained" startIcon={<Send />} onClick={handleSendToDTR} disabled={records.length === 0}
                      sx={{ backgroundColor: '#4caf50', color: '#ffffff', py: 1.5, px: 3, '&:hover':{ backgroundColor: '#45a049' } }}>
                      View DTR Module
                    </ProfessionalButton>
                  </Box>
                </Box>

                <PremiumTableContainer>
                  <Table sx={{ minWidth: 800 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(primaryColor,0.7) }}>
                        {['Employee ID','Date','Day','Time IN','Break IN','Break OUT','Time OUT','Special Type','Special Time IN','Special Time OUT'].map((h) => (
                          <PremiumTableCell key={h} isHeader sx={{ color: textPrimaryColor }}>{h}</PremiumTableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {records.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Info sx={{ fontSize: 80, color: alpha(accentColor,0.3), mb: 3 }} />
                              <Typography variant="h5" sx={{ color: alpha(accentColor,0.6), fontWeight: 600, mb: 1 }}>No Records Found</Typography>
                              <Typography variant="body1" sx={{ color: alpha(accentColor,0.4) }}>Try adjusting your date range or search for a different employee</Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ) : records.map((record, index) => {
                        let specialTypeBadge = null;
                        if (record.Time5 || record.Time6) {
                          const type       = record.specialType || 'UNCATEGORIZED';
                          const typeLabels = { HONORARIUM: 'Honorarium', SERVICE: 'Service Credit', OVERTIME: 'Overtime', UNCATEGORIZED: 'Uncategorized' };
                          const colors     = { HONORARIUM: { bg: '#4CAF50', text: '#fff' }, SERVICE: { bg: '#2196F3', text: '#fff' }, OVERTIME: { bg: '#FF9800', text: '#fff' }, UNCATEGORIZED: { bg: '#9E9E9E', text: '#fff' } };
                          const bc         = colors[type] || colors.UNCATEGORIZED;
                          specialTypeBadge = <Chip label={typeLabels[type]||'Uncategorized'} size="small" sx={{ bgcolor: bc.bg, color: bc.text, fontWeight: 600, fontSize: '0.75rem' }} />;
                        }
                        return (
                          <TableRow key={index} sx={{ '&:nth-of-type(even)':{ bgcolor: alpha(primaryColor,0.3) }, '&:hover':{ bgcolor: alpha(accentColor,0.05) }, transition: 'all 0.2s ease' }}>
                            <PremiumTableCell>{record.PersonID}</PremiumTableCell>
                            <PremiumTableCell>{record.Date}</PremiumTableCell>
                            <PremiumTableCell>{getDayOfWeek(record.Date)}</PremiumTableCell>
                            <PremiumTableCell>{formatTime(record.Time1)}</PremiumTableCell>
                            <PremiumTableCell>{formatTime(record.Time3)}</PremiumTableCell>
                            <PremiumTableCell>{formatTime(record.Time2)}</PremiumTableCell>
                            <PremiumTableCell>{formatTime(record.Time4)}</PremiumTableCell>
                            <PremiumTableCell>{specialTypeBadge || '-'}</PremiumTableCell>
                            <PremiumTableCell>{record.Time5 ? formatTime(record.Time5) : '-'}</PremiumTableCell>
                            <PremiumTableCell>{record.Time6 ? formatTime(record.Time6) : '-'}</PremiumTableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </PremiumTableContainer>
              </GlassCard>
            </Fade>
          )}

      </Box>
    </Fade>
  );
};

export default ViewAttendanceRecord;