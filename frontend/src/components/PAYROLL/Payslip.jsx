import API_BASE_URL from '../../apiConfig';
import { jwtDecode } from 'jwt-decode';
import React, { useRef, forwardRef, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Chip,
  Divider,
  Fade,
  Backdrop,
  styled,
  alpha,
  IconButton,
  Tooltip,
  Grid,
  LinearProgress,
  Stack,
  Badge,
  Snackbar,
} from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import Refresh from '@mui/icons-material/Refresh';
import Download from '@mui/icons-material/Download';
import Person from '@mui/icons-material/Person';
import CalendarToday from '@mui/icons-material/CalendarToday';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';
import logo from '../../assets/logo.png';
import hrisLogo from '../../assets/hrisLogo.png';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import usePayrollRealtimeRefresh from '../../hooks/usePayrollRealtimeRefresh';

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

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// ── Styled Components ──────────────────────────────────────────────────────

const GlassCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  backdropFilter: 'blur(10px)',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': { transform: 'translateY(-2px)' },
}));

const ProfessionalButton = styled(Button)(({ theme, variant }) => ({
  borderRadius: 10,
  fontWeight: 600,
  padding: '10px 20px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  textTransform: 'none',
  fontSize: '0.9rem',
  letterSpacing: '0.02em',
  boxShadow: variant === 'contained' ? '0 4px 14px rgba(109,35,35,0.25)' : 'none',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: variant === 'contained' ? '0 6px 20px rgba(109,35,35,0.35)' : 'none',
  },
  '&:active': { transform: 'translateY(0)' },
}));

const ModernTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 10,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
    '&.Mui-focused': {
      boxShadow: '0 4px 20px rgba(109,35,35,0.15)',
      backgroundColor: '#fff',
    },
  },
  '& .MuiInputLabel-root': { fontWeight: 500 },
}));

// ── Money display component for payslip ────────────────────────────────────
const MoneyCell = ({ label, value, highlight = false, large = false }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      px: 3,
      py: 2,
      borderBottom: '1.5px solid #ddd',
      backgroundColor: highlight ? 'rgba(109,35,35,0.05)' : 'transparent',
    }}
  >
    <Typography sx={{ fontSize: large ? '20px' : '18px', fontWeight: 700, color: highlight ? '#6d2323' : '#333', fontFamily: '"Poppins", sans-serif' }}>{label}</Typography>
    <Typography sx={{ fontSize: large ? '22px' : '20px', fontWeight: 900, color: highlight ? '#6d2323' : '#111', fontFamily: '"Poppins", sans-serif', minWidth: '140px', textAlign: 'right' }}>{value || '—'}</Typography>
  </Box>
);

// ── Deduction row ──────────────────────────────────────────────────────────
const DeductionRow = ({ items, isEven }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', backgroundColor: isEven ? '#fdf6f6' : '#fff', borderBottom: '1.5px solid #c9a8a8' }}>
    {items.map(([label, value], i) => (
      <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1.5, py: 0.5, borderRight: i < 2 ? '1.5px solid #c9a8a8' : 'none', minHeight: '38px', gap: 0.5 }}>
        <Typography sx={{ fontSize: '20px', color: '#1a1a1a', fontFamily: '"Poppins", sans-serif', fontWeight: 700, lineHeight: 1.1, flex: 1 }}>{label || ''}</Typography>
        <Typography sx={{ fontSize: '20px', fontWeight: 900, color: value ? '#6d2323' : '#aaa', fontFamily: '"Poppins", sans-serif', minWidth: '100px', textAlign: 'right', flexShrink: 0 }}>{value || '—'}</Typography>
      </Box>
    ))}
  </Box>
);

// ── Summary Card ───────────────────────────────────────────────────────────
const SummaryCard = ({ icon, label, value, accent = false }) => (
  <Box sx={{ flex: 1, borderRadius: 2, p: 1.5, background: accent ? 'linear-gradient(135deg, #f5ede8 0%, #ede0d8 100%)' : '#fff', border: accent ? '2.5px solid #6d2323' : '2.5px solid #c9a8a8', boxShadow: accent ? '0 4px 16px rgba(109,35,35,0.25)' : 'none', display: 'flex', flexDirection: 'column', gap: 0.8 }}>
    <Typography sx={{ fontSize: '17px', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6d2323', fontFamily: '"Poppins", sans-serif' }}>{label}</Typography>
    <Typography sx={{ fontSize: '34px', fontWeight: 900, color: accent ? '#6d2323' : '#1a1a1a', fontFamily: '"Poppins", sans-serif', lineHeight: 1.1, letterSpacing: '-0.01em' }}>{value || '—'}</Typography>
  </Box>
);

// ── Shimmer / Wireframe ───────────────────────────────────────────────────

const psKeyframes = `
@keyframes psShimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes psPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}
`;

const Shim = ({ w = '100%', h = 16, r = 8, sx = {} }) => (
  <Box sx={{
    width: w, height: h, borderRadius: `${r}px`, flexShrink: 0,
    background: 'linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.18) 50%,rgba(109,35,35,0.07) 75%)',
    backgroundSize: '800px 100%',
    animation: 'psShimmer 1.6s infinite linear',
    ...sx,
  }} />
);

const PayslipWireframe = () => (
  <>
    <style>{psKeyframes}</style>
    <Box sx={{ py: 4, pt: -10, width: '1200px', mx: 'auto', overflow: 'hidden' }}>
      <Box sx={{ px: 6 }}>
        <Box sx={{ mb: 4, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(109,35,35,0.10)', background: 'linear-gradient(135deg,rgba(109,35,35,0.08) 0%,rgba(109,35,35,0.05) 100%)', animation: 'psPulse 2.2s ease-in-out infinite' }}>
          <Box sx={{ p: 4, position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, bgcolor: 'rgba(109,35,35,0.25)', borderRadius: '0 3px 3px 0' }} />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pl: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.10)', flexShrink: 0 }} />
                <Box>
                  <Shim w={200} h={22} r={5} sx={{ mb: 1 }} />
                  <Shim w={270} h={13} r={4} />
                </Box>
              </Box>
              <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.08)' }} />
            </Box>
          </Box>
        </Box>
        <Box sx={{ mb: 4, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(109,35,35,0.10)', bgcolor: '#fff', boxShadow: '0 2px 16px rgba(109,35,35,0.04)', animation: 'psPulse 2.2s ease-in-out 0.07s infinite' }}>
          <Box sx={{ p: 4 }}>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              {[0, 1].map((i) => (
                <Grid item xs={12} md={6} key={i}>
                  <Box sx={{ height: 56, borderRadius: 10, border: '1px solid rgba(109,35,35,0.15)', bgcolor: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: 1.5, px: 2 }}>
                    <Shim w="50%" h={13} r={4} />
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Box sx={{ borderBottom: '1px solid rgba(109,35,35,0.08)', mb: 3 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 1 }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <Box key={i} sx={{ height: 40, borderRadius: 2, border: '1.5px solid rgba(109,35,35,0.15)', animation: `psPulse 2.2s ease-in-out ${i * 0.04}s infinite` }}>
                  <Shim w="100%" h="100%" r={6} sx={{ opacity: 0.6 }} />
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
        <Box sx={{ mb: 4, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(109,35,35,0.10)', boxShadow: '0 4px 24px rgba(109,35,35,0.06)', animation: 'psPulse 2.2s ease-in-out 0.13s infinite' }}>
          <Box sx={{ p: 3, background: 'linear-gradient(135deg,rgba(109,35,35,0.08) 0%,rgba(109,35,35,0.05) 100%)', borderBottom: '2px solid rgba(109,35,35,0.10)' }}>
            <Shim w={220} h={24} r={5} sx={{ mb: 1.5 }} />
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Shim w={110} h={26} r={13} />
              <Shim w={90} h={26} r={13} />
            </Box>
          </Box>
          <Box sx={{ p: 3, pb: 4, bgcolor: '#fff' }}>
            {Array.from({ length: 6 }).map((_, row) => (
              <Box key={row} sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid rgba(109,35,35,0.08)' }}>
                <Shim w="40%" h={16} r={4} />
                <Shim w="25%" h={16} r={4} />
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  </>
);

// ══════════════════════════════════════════════════════════════════════════
const Payslip = forwardRef(({ employee }, ref) => {
  const payslipRef = ref || useRef();

  // ── Read navigation state passed from Home's "View Full" button ─────────
  const location = useLocation();
  const locationState = location?.state || {};

  const [allPayroll, setAllPayroll] = useState([]);
  const [displayEmployee, setDisplayEmployee] = useState(employee || null);
  const [loading, setLoading] = useState(!employee);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [modal, setModal] = useState({ open: false, type: 'success', message: '' });

  // Pre-populate from Home navigation state if present
  const [selectedMonth, setSelectedMonth] = useState(
    locationState.selectedMonth !== undefined ? locationState.selectedMonth : null
  );
  const [selectedYear, setSelectedYear] = useState(
    locationState.selectedYear !== undefined ? locationState.selectedYear : new Date().getFullYear()
  );

  const [hasSearched, setHasSearched] = useState(false);
  const [personID, setPersonID] = useState('');
  const [pageLoading, setPageLoading] = useState(true);

  // ── Anti-tamper state ──────────────────────────────────────────────────────
  const [originalPayroll, setOriginalPayroll] = useState([]);
  const [payrollHash, setPayrollHash] = useState('');
  const [fetchedAt, setFetchedAt] = useState(null);
  const [integrityStatus, setIntegrityStatus] = useState('none');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // ── Anti-tamper refs ───────────────────────────────────────────────────────
  const observerRef = useRef(null);
  const restoreTimerRef = useRef(null);
  const originalPayrollRef = useRef([]);
  const isRestoringRef = useRef(false);

  const monthsShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const years = Array.from({ length: 2060 - 1990 + 1 }, (_, i) => 1990 + i);

  const { settings } = useSystemSettings();
  const primaryColor       = settings.accentColor        || '#FEF9E1';
  const secondaryColor     = settings.backgroundColor    || '#FFF8E7';
  const accentColor        = settings.primaryColor       || '#6d2323';
  const accentDark         = settings.secondaryColor     || '#8B3333';
  const institutionLogo    = settings.institutionLogo    || '';
  const dynamicHrisLogo    = settings.hrisLogo           || '';
  const textPrimaryColor   = settings.textPrimaryColor   || '#6d2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';
  const hoverColor         = settings.hoverColor         || '#6D2323';
  const grayColor          = '#6c757d';

  const institutionName    = settings.institutionName    || 'Institution Name';
  const institutionAddress = settings.institutionAddress || 'Institute Address';
  const certifierName      = settings.certifierName      || 'Default Certifier';
  const certifierPosition  = settings.certifierPosition  || 'Default Position';

  const { hasAccess, loading: accessLoading } = usePageAccess('payslip');

  const getAuthHeaders = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });

  // ── Fetch all released payroll records ───────────────────────────────────
  const fetchPayrollData = async () => {
    if (!personID) return;
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE_URL}/PayrollReleasedRoute/released-payroll-detailed`,
        getAuthHeaders(),
      );
      const data = Array.isArray(res.data) ? res.data : [];
      setAllPayroll(data);
      
      // ── Capture integrity data ─────────────────────────────────
      if (data.length > 0) {
        const immutable = Object.freeze(JSON.parse(JSON.stringify(data)));
        setOriginalPayroll(immutable);
        originalPayrollRef.current = immutable;
        const hash = generateHash(data);
        setPayrollHash(hash);
        setFetchedAt(new Date().toISOString());
        setIntegrityStatus('ok');
      } else {
        setOriginalPayroll([]);
        originalPayrollRef.current = [];
        setPayrollHash('');
        setFetchedAt(null);
        setIntegrityStatus('none');
      }
    } catch (err) {
      console.error('Error fetching payroll:', err);
      setError('Failed to fetch payroll data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  usePayrollRealtimeRefresh(() => { if (!employee) fetchPayrollData(); });

  // Decode token to get personID
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try { setPersonID(jwtDecode(token).employeeNumber); }
      catch (e) { console.error('Token decode error:', e); }
    }
  }, []);

  // Fetch payroll once personID is ready
  useEffect(() => {
    const init = async () => {
      if (!employee) await fetchPayrollData();
    };
    init();
  }, [employee, personID]); // eslint-disable-line

  // ── KEY FIX: Auto-select the month once data is loaded ───────────────────
  // Fires when allPayroll populates AND we have a month from Home navigation.
  // !hasSearched ensures this only runs once automatically — after that the
  // user controls month selection manually.
  useEffect(() => {
    if (
      locationState.selectedMonth !== undefined &&
      personID &&
      allPayroll.length > 0 &&
      !hasSearched
    ) {
      handleMonthSelect(locationState.selectedMonth);
    }
  }, [allPayroll, personID]); // eslint-disable-line

  useEffect(() => {
    if (!accessLoading && !loading) {
      setTimeout(() => setPageLoading(false), 300);
    }
  }, [accessLoading, loading]);

  // ── Month selection — same logic as original, untouched ─────────────────
  const handleMonthSelect = (idx) => {
    setSelectedMonth(idx);
    const result = allPayroll.filter((emp) => {
      if (!emp.startDate) return false;
      const d = new Date(emp.startDate);
      return (
        emp.employeeNumber?.toString() === personID.toString() &&
        d.getMonth() === idx &&
        d.getFullYear() === selectedYear
      );
    });
    setDisplayEmployee(result.length > 0 ? result[0] : null);
    setHasSearched(true);
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
    if (selectedMonth !== null) {
      const result = allPayroll.filter((emp) => {
        if (!emp.startDate) return false;
        const d = new Date(emp.startDate);
        return (
          emp.employeeNumber?.toString() === personID.toString() &&
          d.getMonth() === selectedMonth &&
          d.getFullYear() === year
        );
      });
      setDisplayEmployee(result.length > 0 ? result[0] : null);
    }
  };

  const formatCurrency = (v) => {
    const n = parseFloat(v);
    return !isNaN(n) && n !== 0 ? `₱${n.toLocaleString()}` : '';
  };

  const formatRenderedDays = (v) => {
    const totalHours = Number(v);
    if (!isNaN(totalHours) && totalHours > 0) {
      const days  = Math.floor(totalHours / 8);
      const hours = totalHours % 8;
      return `${days} days${hours > 0 ? ` & ${hours} hrs` : ''}`;
    }
    return '';
  };

  const getSurname = (name) => {
    if (!name) return 'EARIST';
    const p = name.trim().split(' ');
    return p[p.length - 1] || 'EARIST';
  };

  const formatPeriod = (startDate, endDate) => {
    if (!startDate || !endDate) return 'Unknown';
    const start = new Date(startDate);
    return `${start.toLocaleString('en-US', { month: 'long' })}_${start.getFullYear()}`;
  };

  const formatAbs = (v) => {
    const formatted = formatCurrency(v);
    return formatted || 'Deducted from VL';
  };

  const computeNetPay = (emp) => {
    const net        = parseFloat(emp.netSalary)      || 0;
    const deductions = parseFloat(emp.totalDeductions) || 0;
    const result     = net - deductions;
    return !isNaN(result) && result !== 0 ? `₱${result.toLocaleString()}` : '—';
  };

  const buildPayslipHTML = (emp, logoSrc, hrisLogoSrc) => {
    const fc = (v) => {
      const n = parseFloat(v);
      return !isNaN(n) && n !== 0 ? `&#8369;${n.toLocaleString()}` : '';
    };
    const fcAbs = (v) => fc(v) || 'Deducted from VL';
    const frd = (v) => {
      const h = Number(v);
      if (!isNaN(h) && h > 0) {
        const d = Math.floor(h / 8);
        const r = h % 8;
        return `${d} days${r > 0 ? ` & ${r} hrs` : ''}`;
      }
      return '';
    };
    const period = (() => {
      if (!emp.startDate || !emp.endDate) return '&mdash;';
      const s = new Date(emp.startDate), e = new Date(emp.endDate);
      return `${s.toLocaleString('en-US', { month: 'long' }).toUpperCase()} ${s.getDate()}&ndash;${e.getDate()} ${e.getFullYear()}`;
    })();
    const isJO = (emp.employmentCategory ?? -1) === 0;
    const netPayCalc = (() => {
      const n = (parseFloat(emp.netSalary) || 0) - (parseFloat(emp.totalDeductions) || 0);
      return n !== 0 ? `&#8369;${n.toLocaleString()}` : '&mdash;';
    })();

    const headerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#6d2323 0%,#a31d1d 100%);border-radius:6px;padding:20px 28px;margin-bottom:18px;box-shadow:0 4px 20px rgba(109,35,35,0.3);">
        ${logoSrc ? `<img src="${logoSrc}" style="width:88px;height:88px;border-radius:50%;object-fit:cover;margin-left:8px;flex-shrink:0;" crossorigin="anonymous"/>` : `<div style="width:88px;height:88px;border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);margin-left:8px;flex-shrink:0;"></div>`}
        <div style="flex:1;text-align:center;color:white;padding:0 16px;">
          <div style="font-style:italic;font-size:18px;opacity:0.9;font-family:Poppins,sans-serif;">Republic of the Philippines</div>
          <div style="font-weight:900;font-size:22px;line-height:1.4;font-family:Poppins,sans-serif;letter-spacing:0.02em;margin-top:4px;">${escapeHtml(institutionName)}</div>
          <div style="font-size:17px;opacity:0.85;font-family:Poppins,sans-serif;margin-top:4px;">${escapeHtml(institutionAddress)}</div>
        </div>
        ${hrisLogoSrc ? `<img src="${hrisLogoSrc}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;flex-shrink:0;" crossorigin="anonymous"/>` : `<div style="width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);flex-shrink:0;"></div>`}
      </div>`;

    const secHead = (t) =>
      `<div style="background:#6D2323;color:white;padding:8px 16px;"><span style="font-weight:800;font-size:20px;letter-spacing:0.07em;font-family:Poppins,sans-serif;">${t}</span></div>`;
    const infoCell = (lbl, content, br = false, bb = false, fw = false) => `
      <div style="padding:12px 16px;${br ? 'border-right:2px solid #e0c8c8;' : ''}${bb ? 'border-bottom:2px solid #e0c8c8;' : ''}min-height:60px;${fw ? 'grid-column:1/-1;' : ''}">
        <div style="font-size:18px;font-weight:800;letter-spacing:0.06em;color:#6d2323;margin-bottom:4px;font-family:Poppins,sans-serif;text-transform:uppercase;">${lbl}</div>
        ${content}
      </div>`;
    const summaryCards = (netSal, totalDed, netPay) => `
      <div style="display:flex;gap:12px;margin-bottom:24px;">
        ${[
          ['Net Salary', netSal, false],
          ['Total Deductions', totalDed, false],
          ['Net Pay', netPay, true],
        ]
          .map(
            ([lbl, val, acc]) => `
          <div style="flex:1;border-radius:8px;padding:12px;background:${acc ? 'linear-gradient(135deg,#f5ede8 0%,#ede0d8 100%)' : '#fff'};border:${acc ? '2.5px solid #6d2323' : '2.5px solid #c9a8a8'};${acc ? 'box-shadow:0 4px 16px rgba(109,35,35,0.25);' : ''}">
            <div style="font-size:17px;font-weight:800;letter-spacing:0.07em;text-transform:uppercase;color:#6d2323;font-family:Poppins,sans-serif;">${lbl}</div>
            <div style="font-size:34px;font-weight:900;color:${acc ? '#6d2323' : '#1a1a1a'};font-family:Poppins,sans-serif;line-height:1.1;">${val || '&mdash;'}</div>
          </div>`,
          )
          .join('')}
      </div>`;
    const footer = `
      <div style="margin-top:40px;padding-top:24px;text-align:center;">
        <div style="font-size:18px;color:#555;margin-bottom:8px;font-family:Poppins,sans-serif;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;">Certified Correct</div>
        <div style="font-size:24px;font-weight:900;color:#1a1a1a;font-family:Poppins,sans-serif;">${escapeHtml(certifierName)}</div>
        <div style="font-size:20px;color:#444;font-family:Poppins,sans-serif;font-weight:600;margin-top:4px;">${escapeHtml(certifierPosition)}</div>
      </div>`;

    let bodyHTML = '';
    if (isJO) {
      bodyHTML = `
        <div style="border:2.5px solid #6d2323;border-radius:6px;margin-bottom:16px;overflow:hidden;">
          ${secHead('EMPLOYEE INFORMATION')}
          <div style="display:grid;grid-template-columns:1fr 1fr;">
            ${infoCell('Employee Number', `<div style="font-size:26px;color:#c0392b;font-weight:900;font-family:Poppins,sans-serif;">${emp.employeeNumber ? parseFloat(emp.employeeNumber) : '&mdash;'}</div>`, true, true)}
            ${infoCell('Name', `<div style="font-size:26px;color:#c0392b;font-weight:900;font-family:Poppins,sans-serif;">${escapeHtml(emp.name || '&mdash;')}</div>`, false, true)}
            ${infoCell('Period', `<div style="font-size:21px;font-weight:700;color:#1a1a1a;font-family:Poppins,sans-serif;">${period}</div>`, true, false)}
            ${infoCell('Rendered Days', `<div style="font-size:21px;font-weight:700;color:#1a1a1a;font-family:Poppins,sans-serif;">${frd(emp.rh) || '&mdash;'}</div>`, false, false)}
          </div>
        </div>
        <div style="border:2.5px solid #6d2323;border-radius:6px;margin-bottom:16px;overflow:hidden;">
          ${secHead('DEDUCTIONS')}
          ${[
            ['SSS', fc(emp.sss)],
            ['Pag-IBIG', fc(emp.pagibigFundCont)],
          ]
            .map(
              ([lbl, val]) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:1.5px solid #ddd;">
              <span style="font-size:18px;font-weight:700;color:#333;font-family:Poppins,sans-serif;">${lbl}</span>
              <span style="font-size:20px;font-weight:900;color:#111;font-family:Poppins,sans-serif;min-width:140px;text-align:right;">${val || '&mdash;'}</span>
            </div>`,
            )
            .join('')}
        </div>
        ${summaryCards(fc(emp.netSalary), fc(emp.totalDeductions), netPayCalc)}
        ${footer}`;
    } else {
      const rows = [
        [['Withholding Tax', fc(emp.withholdingTax)], ['GSIS Salary Loan', fc(emp.gsisSalaryLoan)], ['Life & Retirement', fc(emp.personalLifeRetIns)]],
        [['PhilHealth', fc(emp.PhilHealthContribution)], ['GSIS Policy Loan', fc(emp.gsisPolicyLoan)], ['PhilHealth Diff', fc(emp.philhealthDiff)]],
        [['Pag-IBIG', fc(emp.pagibigFundCont)], ['GSIS Housing Loan', fc(emp.gsisHousingLoan)], ['Pag-IBIG 2', fc(emp.pagibig2)]],
        [['SSS', fc(emp.sss)], ['GSIS Arrears', fc(emp.gsisArrears)], ['LBP Loan', fc(emp.lbpLoan)]],
        [['ECC', fc(emp.ecc)], ['GFAL', fc(emp.gfal)], ['MTSLAI', fc(emp.mtslai)]],
        [['To Be Refunded', fc(emp.toBeRefunded)], ['CPL', fc(emp.cpl)], ['ESLAI', fc(emp.eslai)]],
        [['FEU', fc(emp.feu)], ['MPL', fc(emp.mpl)], ['ABS', fcAbs(emp.abs)]],
        [['', ''], ['MPL Lite', fc(emp.mplLite)], ['ELA', fc(emp.ela)]],
      ];
      bodyHTML = `
        <div style="border:2.5px solid #6d2323;border-radius:6px;margin-bottom:16px;overflow:hidden;">
          ${secHead('EMPLOYEE INFORMATION')}
          <div style="display:grid;grid-template-columns:1fr 1fr;">
            ${infoCell('Period', `<div style="font-size:21px;font-weight:700;color:#1a1a1a;font-family:Poppins,sans-serif;">${period}</div>`, true, true)}
            ${infoCell('Employee Number', `<div style="font-size:26px;color:#c0392b;font-weight:900;font-family:Poppins,sans-serif;">${emp.employeeNumber ? parseFloat(emp.employeeNumber) : '&mdash;'}</div>`, false, true)}
            ${infoCell('Name', `<div style="font-size:26px;color:#c0392b;font-weight:900;font-family:Poppins,sans-serif;">${escapeHtml(emp.name || '&mdash;')}</div>`, false, false, true)}
          </div>
        </div>
        <div style="border:2.5px solid #6d2323;border-radius:6px;margin-bottom:16px;overflow:hidden;">
          ${secHead('DEDUCTIONS BREAKDOWN')}
          <div style="display:grid;grid-template-columns:repeat(3,1fr);background:#f5eaea;border-bottom:2px solid #c9a8a8;">
            ${['Government & Tax', 'GSIS Loans', 'Other Deductions'].map((h, i) => `<div style="font-size:18px;font-weight:800;color:#6d2323;letter-spacing:0.06em;text-transform:uppercase;padding:8px 16px;font-family:Poppins,sans-serif;${i < 2 ? 'border-right:2px solid #c9a8a8;' : ''}">${h}</div>`).join('')}
          </div>
          ${rows.map((row, ri) => `
            <div style="display:grid;grid-template-columns:repeat(3,1fr);background:${ri % 2 === 0 ? '#fdf6f6' : '#fff'};border-bottom:1.5px solid #c9a8a8;">
              ${row.map(([lbl, val], ci) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 12px;${ci < 2 ? 'border-right:1.5px solid #c9a8a8;' : ''}min-height:38px;gap:4px;">
                  <span style="font-size:20px;color:#1a1a1a;font-family:Poppins,sans-serif;font-weight:700;flex:1;">${lbl || ''}</span>
                  <span style="font-size:20px;font-weight:900;color:${val ? '#6d2323' : '#aaa'};font-family:Poppins,sans-serif;min-width:100px;text-align:right;">${val || '&mdash;'}</span>
                </div>`).join('')}
            </div>`).join('')}
        </div>
        ${summaryCards(fc(emp.netSalary), fc(emp.totalDeductions), netPayCalc)}
        <div style="border:2.5px solid #6d2323;border-radius:6px;margin-bottom:16px;overflow:hidden;">
          ${secHead('PAYMENT BREAKDOWN')}
          <div style="display:grid;grid-template-columns:1fr 1fr;">
            ${[['1ST QUINCENA', fc(emp.pay1st)], ['2ND QUINCENA', fc(emp.pay2nd)]].map(([lbl, val], i) => `
              <div style="padding:16px;${i === 0 ? 'border-right:2px solid #e0c8c8;' : ''}min-height:70px;">
                <div style="font-size:18px;font-weight:800;color:#6d2323;letter-spacing:0.1em;text-transform:uppercase;font-family:Poppins,sans-serif;margin-bottom:4px;">${lbl}</div>
                <div style="font-size:26px;font-weight:900;color:#1a1a1a;font-family:Poppins,sans-serif;line-height:1.1;">${val || '&mdash;'}</div>
              </div>`).join('')}
          </div>
        </div>
        ${footer}`;
    }

    return `
      <div style="font-family:Poppins,sans-serif;background:#fff;width:1100px;padding:24px 24px 32px;box-sizing:border-box;position:relative;">
        <div style="position:relative;z-index:1;">${headerHTML}${bodyHTML}</div>
        ${hrisLogoSrc ? `<img data-watermark="1" src="${hrisLogoSrc}" crossorigin="anonymous" style="position:absolute;left:50%;width:70%;opacity:0.08;pointer-events:none;z-index:2;mix-blend-mode:multiply;top:50%;transform:translate(-50%,-50%);"/>` : ''}
      </div>`;
  };

  const generate3MonthPDF = async (emp) => {
    const s = new Date(emp.startDate);
    const monthsToGet = [0, 1, 2].map((i) => {
      const d = new Date(s.getFullYear(), s.getMonth() - i, 1);
      return {
        month: d.getMonth(),
        year: d.getFullYear(),
        label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      };
    });

    const records = monthsToGet.map(({ month, year, label }) => ({
      label,
      payroll: allPayroll.find(
        (p) =>
          p.employeeNumber === emp.employeeNumber &&
          new Date(p.startDate).getMonth() === month &&
          new Date(p.startDate).getFullYear() === year,
      ),
    }));

    const containers = records.map((_, i) => {
      const div = document.createElement('div');
      div.style.cssText = `position:absolute;left:${-9999 - i * 1200}px;top:-9999px;width:1100px;background:#fff;`;
      document.body.appendChild(div);
      return div;
    });

    records.forEach(({ payroll, label }, i) => {
      containers[i].innerHTML = payroll
        ? buildPayslipHTML(payroll, institutionLogo, dynamicHrisLogo)
        : `<div style="width:1100px;height:1700px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;">
             <div style="font-size:28px;font-weight:bold;color:#6D2323;font-family:Poppins,sans-serif;">No Data</div>
             <div style="font-size:20px;color:#6D2323;font-family:Poppins,sans-serif;margin-top:8px;">for ${label}</div>
           </div>`;
    });

    await new Promise((r) => requestAnimationFrame(r));
    containers.forEach((container) => {
      const root = container.firstElementChild;
      if (!root) return;
      const totalH = root.scrollHeight || root.offsetHeight;
      const wm = root.querySelector('img[data-watermark="1"]');
      if (wm) {
        const wmH =
          wm.naturalHeight && wm.naturalWidth
            ? (wm.offsetWidth || 770) * (wm.naturalHeight / wm.naturalWidth)
            : 400;
        wm.style.transform = 'none';
        wm.style.top = `${totalH / 2 - wmH / 2}px`;
        wm.style.left = `${(1100 - (wm.offsetWidth || 770)) / 2}px`;
      }
    });

    const images = await Promise.all(
      containers.map((container) => {
        const root = container.firstElementChild || container;
        const h = root.scrollHeight || root.offsetHeight || 1700;
        return html2canvas(root, {
          scale: 1.0,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          imageTimeout: 15000,
          windowWidth: 1100,
          windowHeight: h,
          height: h,
          foreignObjectRendering: false,
        }).then((c) => c.toDataURL('image/jpeg', 0.82));
      }),
    );

    containers.forEach((c) => document.body.removeChild(c));

    const pdf = new jsPDF('l', 'in', 'a4');
    const cw = 3.5, ch = 7.1, gap = 0.2;
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
    const tw = cw * 3 + gap * 2;
    const yo = (ph - ch) / 2;
    const pos = [
      (pw - tw) / 2,
      (pw - tw) / 2 + cw + gap,
      (pw - tw) / 2 + (cw + gap) * 2,
    ];
    images.forEach((img, i) => pdf.addImage(img, 'JPEG', pos[i], yo, cw, ch));
    return pdf;
  };

  // ── Integrity verification ─────────────────────────────────────────────────
  const verifyIntegrity = () => {
    if (!fetchedAt || originalPayroll.length === 0) {
      setSnackbar({ open: true, message: 'No payroll data loaded. Please search first.', severity: 'warning' });
      return false;
    }
    const ageMs = Date.now() - new Date(fetchedAt).getTime();
    if (ageMs > 30 * 60 * 1000) {
      setIntegrityStatus('warn');
      setSnackbar({ open: true, message: 'Payroll data is older than 30 minutes. Please refresh to get fresh data.', severity: 'warning' });
      return false;
    }
    const currentHash = generateHash(allPayroll);
    if (currentHash !== payrollHash) {
      setIntegrityStatus('warn');
      setSnackbar({ open: true, message: 'Data integrity check failed. The records may have been modified. Please reload.', severity: 'error' });
      return false;
    }
    setIntegrityStatus('ok');
    return true;
  };

  const downloadPDF = async () => {
    if (!displayEmployee) return;
    if (!verifyIntegrity()) return;
    setSending(true);
    try {
      const pdf = await generate3MonthPDF(displayEmployee);
      pdf.save(`${getSurname(displayEmployee.name)}_${formatPeriod(displayEmployee.startDate, displayEmployee.endDate)}.pdf`);

      try {
        await axios.post(
          `${API_BASE_URL}/PayrollReleasedRoute/log-print`,
          { employeeNumber: displayEmployee.employeeNumber },
          getAuthHeaders(),
        );
      } catch (e) {
        console.error('Print audit log error:', e);
      }

      setModal({ open: true, type: 'success', message: '' });
    } catch (error) {
      console.error('PDF generation error:', error);
      setModal({ open: true, type: 'error', message: 'Failed to generate PDF.' });
    } finally {
      setSending(false);
    }
  };

  if (pageLoading || accessLoading) return <PayslipWireframe />;

  if (!accessLoading && hasAccess !== true)
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Payslip. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );

  return (
    <Box sx={{ py: 4, pt: -10, width: '1200px', mx: 'auto', overflow: 'hidden' }}>
      <Box sx={{ px: 6 }}>

        {/* ══ HEADER ══════════════════════════════════════════════════════ */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }}>
            <GlassCard sx={{
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
              boxShadow: `0 4px 24px ${alpha(accentColor, 0.12)}`,
              border: `1px solid ${alpha(accentColor, 0.15)}`,
            }}>
              <Box sx={{ p: 4, position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: `linear-gradient(180deg, ${accentColor}, ${accentDark})` }} />
                <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ pl: 2 }}>
                  <Box display="flex" alignItems="center" gap={2.5}>
                    <Avatar sx={{ bgcolor: alpha(accentColor, 0.12), width: 56, height: 56, boxShadow: `0 4px 16px ${alpha(accentColor, 0.2)}` }}>
                      <WorkIcon sx={{ color: accentColor, fontSize: 28 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: accentColor, lineHeight: 1.2, fontFamily: '"Poppins", sans-serif' }}>Employee Payslip</Typography>
                      <Typography variant="body2" sx={{ color: accentDark, opacity: 0.7, fontFamily: '"Poppins", sans-serif', mt: 0.3 }}>View and download your payslip records</Typography>
                    </Box>
                  </Box>
                  <Tooltip title="Refresh Data">
                    <IconButton onClick={() => window.location.reload()} sx={{ bgcolor: alpha(accentColor, 0.1), '&:hover': { bgcolor: alpha(accentColor, 0.2) }, color: accentColor, width: 44, height: 44 }}>
                      <Refresh />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {error && (
          <Fade in timeout={400}>
            <Alert severity="error" sx={{ mb: 4, borderRadius: 3, '& .MuiAlert-message': { fontWeight: 600 } }}>{error}</Alert>
          </Fade>
        )}

        {/* ══ CONTROLS ════════════════════════════════════════════════════ */}
        <Fade in timeout={700}>
          <GlassCard sx={{ mb: 4, border: `1px solid ${alpha(accentColor, 0.1)}`, boxShadow: `0 2px 16px ${alpha(accentColor, 0.06)}` }}>
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <ModernTextField fullWidth label="Employee Number" value={personID} disabled
                    InputProps={{ startAdornment: (<InputAdornment position="start"><Person sx={{ color: textPrimaryColor }} /></InputAdornment>) }}
                    sx={{ '& .MuiInputBase-input': { fontSize: '1rem', py: 1.5 } }} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <ModernTextField fullWidth select label="Filter By Year" value={selectedYear}
                    onChange={(e) => handleYearChange(parseInt(e.target.value))}
                    SelectProps={{ native: true }}
                    sx={{ '& .MuiInputBase-input': { fontSize: '1rem', py: 1.5 } }}>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </ModernTextField>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3, borderColor: alpha(accentColor, 0.1) }} />

              <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
                <CalendarToday sx={{ color: accentColor, fontSize: 20 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: accentColor, fontFamily: '"Poppins", sans-serif', letterSpacing: '0.02em' }}>Select Month</Typography>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 1 }}>
                {monthsShort.map((month, idx) => (
                  <Box key={month} onClick={() => handleMonthSelect(idx)} sx={{
                    cursor: 'pointer', borderRadius: 2, py: 1.2, textAlign: 'center',
                    fontFamily: '"Poppins", sans-serif', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.02em',
                    transition: 'all 0.2s ease',
                    border: `1.5px solid ${idx === selectedMonth ? accentColor : alpha(accentColor, 0.2)}`,
                    backgroundColor: idx === selectedMonth ? accentColor : 'transparent',
                    color: idx === selectedMonth ? primaryColor : accentColor,
                    '&:hover': { backgroundColor: idx === selectedMonth ? accentDark : alpha(accentColor, 0.08), borderColor: accentColor, transform: 'translateY(-1px)' },
                  }}>
                    {month}
                  </Box>
                ))}
              </Box>
            </CardContent>
          </GlassCard>
        </Fade>

        {/* ══ PAYSLIP DISPLAY ═════════════════════════════════════════════ */}
        {displayEmployee ? (
          <Fade in timeout={900}>
            <GlassCard sx={{ mb: 4, border: `1px solid ${alpha(accentColor, 0.1)}`, boxShadow: `0 4px 24px ${alpha(accentColor, 0.08)}` }}>
              <Box sx={{
                p: 3,
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                borderBottom: `2px solid ${alpha(accentColor, 0.15)}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <Box>
                  <Typography variant="caption" sx={{ color: accentDark, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: '"Poppins", sans-serif', opacity: 0.7 }}>Payslip Record</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: accentColor, fontFamily: '"Poppins", sans-serif', mt: 0.3 }}>{displayEmployee.name}</Typography>
                  <Box sx={{ display: 'flex', gap: 1.5, mt: 1.5 }}>
                    <Chip icon={<Person sx={{ fontSize: 16 }} />} label={`ID: ${displayEmployee.employeeNumber}`} size="small" sx={{ bgcolor: alpha(accentColor, 0.12), color: accentColor, fontWeight: 600, fontSize: '0.78rem' }} />
                    <Chip
                      icon={<CalendarToday sx={{ fontSize: 16 }} />}
                      label={(() => {
                        if (!displayEmployee.startDate || !displayEmployee.endDate) return '—';
                        const start = new Date(displayEmployee.startDate);
                        const end   = new Date(displayEmployee.endDate);
                        return `${start.toLocaleString('en-US', { month: 'short' }).toUpperCase()} ${start.getDate()}–${end.getDate()}`;
                      })()}
                      size="small"
                      sx={{ bgcolor: alpha(accentColor, 0.12), color: accentColor, fontWeight: 600, fontSize: '0.78rem' }}
                    />
                  </Box>
                </Box>
              </Box>

              <Paper ref={payslipRef} elevation={0} sx={{ p: 1.5, pb: 2, mt: 0, borderRadius: 0, backgroundColor: '#fff', fontFamily: '"Poppins", sans-serif', position: 'relative', width: '920px', display: 'block', margin: '0 auto', boxSizing: 'border-box' }}>
                <Box component="img" src={dynamicHrisLogo} alt="Watermark" sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.08, width: '70%', pointerEvents: 'none', userSelect: 'none', zIndex: 2, mixBlendMode: 'multiply' }} />

                <Box data-preview-scale="true" sx={{ zoom: 0.64, width: '1200px', margin: '0 auto' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, background: 'linear-gradient(135deg, #6d2323 0%, #a31d1d 100%)', borderRadius: '6px', p: '20px 28px', boxShadow: '0 4px 20px rgba(109,35,35,0.3)' }}>
                    {institutionLogo ? (
                      <img src={institutionLogo} alt="Logo" style={{ width: '88px', height: '88px', borderRadius: '50%', objectFit: 'cover', marginLeft: '8px' }} />
                    ) : (
                      <Box sx={{ width: 88, height: 88, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', marginLeft: '8px', flexShrink: 0 }} />
                    )}
                    <Box textAlign="center" flex={1} sx={{ color: 'white', px: 2 }}>
                      <Typography sx={{ fontStyle: 'italic', fontSize: '18px', opacity: 0.9, fontFamily: '"Poppins", sans-serif' }}>Republic of the Philippines</Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: '22px', lineHeight: 1.4, fontFamily: '"Poppins", sans-serif', letterSpacing: '0.02em', mt: 0.5 }}>{institutionName}</Typography>
                      <Typography sx={{ fontSize: '17px', opacity: 0.85, fontFamily: '"Poppins", sans-serif', mt: 0.3 }}>{institutionAddress}</Typography>
                    </Box>
                    {dynamicHrisLogo ? (
                      <img src={dynamicHrisLogo} alt="HRIS Logo" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <Box sx={{ width: 100, height: 100, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
                    )}
                  </Box>

                  <Box sx={{ position: 'relative', zIndex: 1 }}>
                  {(() => {
                    const isJO = (displayEmployee.employmentCategory ?? -1) === 0;

                    if (isJO) {
                      return (
                        <>
                          <Box sx={{ border: '2.5px solid #6d2323', borderRadius: '6px', mb: 2, overflow: 'hidden' }}>
                            <Box sx={{ backgroundColor: '#6D2323', color: 'white', px: 2, py: 0.8 }}>
                              <Typography sx={{ fontWeight: 800, fontSize: '20px', letterSpacing: '0.07em', fontFamily: '"Poppins", sans-serif' }}>EMPLOYEE INFORMATION</Typography>
                            </Box>
                            <Grid container>
                              {[
                                ['EMPLOYEE NUMBER', <Typography sx={{ fontSize: '26px', color: '#c0392b', fontWeight: 900, fontFamily: '"Poppins", sans-serif', lineHeight: 1.2 }}>{displayEmployee.employeeNumber ? `${parseFloat(displayEmployee.employeeNumber)}` : '—'}</Typography>],
                                ['NAME', <Typography sx={{ fontSize: '26px', color: '#c0392b', fontWeight: 900, fontFamily: '"Poppins", sans-serif', lineHeight: 1.2 }}>{displayEmployee.name || '—'}</Typography>],
                                ['PERIOD', <Typography sx={{ fontSize: '21px', fontWeight: 700, color: '#1a1a1a', fontFamily: '"Poppins", sans-serif' }}>
                                  {(() => { if (!displayEmployee.startDate || !displayEmployee.endDate) return '—'; const s = new Date(displayEmployee.startDate); const e = new Date(displayEmployee.endDate); return `${s.toLocaleString('en-US', { month: 'long' }).toUpperCase()} ${s.getDate()}–${e.getDate()} ${e.getFullYear()}`; })()}
                                </Typography>],
                                ['RENDERED DAYS', <Typography sx={{ fontSize: '21px', fontWeight: 700, color: '#1a1a1a', fontFamily: '"Poppins", sans-serif' }}>{formatRenderedDays(displayEmployee.rh) || '—'}</Typography>],
                              ].map(([label, content], i) => (
                                <Grid item xs={12} md={6} key={i}>
                                  <Box sx={{ p: 1.5, borderRight: i % 2 === 0 ? '2px solid #e0c8c8' : 'none', borderBottom: i < 2 ? '2px solid #e0c8c8' : 'none', minHeight: '60px' }}>
                                    <Typography sx={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.06em', color: '#6d2323', mb: 1, fontFamily: '"Poppins", sans-serif', textTransform: 'uppercase' }}>{label}</Typography>
                                    {content}
                                  </Box>
                                </Grid>
                              ))}
                            </Grid>
                          </Box>

                          <Box sx={{ border: '2.5px solid #6d2323', borderRadius: '6px', mb: 2, overflow: 'hidden' }}>
                            <Box sx={{ backgroundColor: '#6D2323', color: 'white', px: 2, py: 0.8, display: 'flex', alignItems: 'center', gap: 1.2 }}>
                              <RemoveCircleOutlineIcon sx={{ fontSize: 22 }} />
                              <Typography sx={{ fontWeight: 800, fontSize: '20px', letterSpacing: '0.07em', fontFamily: '"Poppins", sans-serif' }}>DEDUCTIONS</Typography>
                            </Box>
                            <Box>
                              <MoneyCell label="SSS"     value={formatCurrency(displayEmployee.sss)} />
                              <MoneyCell label="Pag-IBIG" value={formatCurrency(displayEmployee.pagibigFundCont)} />
                            </Box>
                          </Box>

                          <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
                            <SummaryCard label="Net Salary"       value={formatCurrency(displayEmployee.netSalary)} />
                            <SummaryCard label="Total Deductions" value={formatCurrency(displayEmployee.totalDeductions)} />
                            <SummaryCard label="Net Pay"          value={computeNetPay(displayEmployee)} accent />
                          </Box>

                          <Box sx={{ borderTop: '2.5px solid #e0c8c8', mt: 5, pt: 4, textAlign: 'center' }}>
                            <Typography sx={{ fontSize: '18px', color: '#555', mb: 1.5, fontFamily: '"Poppins", sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Certified Correct</Typography>
                            <Typography sx={{ fontSize: '24px', fontWeight: 900, color: '#1a1a1a', fontFamily: '"Poppins", sans-serif' }}>{certifierName}</Typography>
                            <Typography sx={{ fontSize: '20px', color: '#444', fontFamily: '"Poppins", sans-serif', fontWeight: 600, mt: 0.5 }}>{certifierPosition}</Typography>
                          </Box>
                        </>
                      );
                    }

                    return (
                      <>
                        <Box sx={{ border: '2.5px solid #6d2323', borderRadius: '6px', mb: 2, overflow: 'hidden' }}>
                          <Box sx={{ backgroundColor: '#6D2323', color: 'white', px: 2, py: 0.8 }}>
                            <Typography sx={{ fontWeight: 800, fontSize: '20px', letterSpacing: '0.07em', fontFamily: '"Poppins", sans-serif' }}>EMPLOYEE INFORMATION</Typography>
                          </Box>
                          <Grid container>
                            {[
                              ['PERIOD', <Typography sx={{ fontSize: '21px', fontWeight: 700, color: '#1a1a1a', fontFamily: '"Poppins", sans-serif' }}>
                                {(() => { if (!displayEmployee.startDate || !displayEmployee.endDate) return '—'; const s = new Date(displayEmployee.startDate); const e = new Date(displayEmployee.endDate); return `${s.toLocaleString('en-US', { month: 'long' }).toUpperCase()} ${s.getDate()}–${e.getDate()} ${e.getFullYear()}`; })()}
                              </Typography>],
                              ['EMPLOYEE NUMBER', <Typography sx={{ fontSize: '26px', color: '#c0392b', fontWeight: 900, fontFamily: '"Poppins", sans-serif', lineHeight: 1.2 }}>{displayEmployee.employeeNumber ? `${parseFloat(displayEmployee.employeeNumber)}` : '—'}</Typography>],
                              ['NAME', <Typography sx={{ fontSize: '26px', color: '#c0392b', fontWeight: 900, fontFamily: '"Poppins", sans-serif', lineHeight: 1.2 }}>{displayEmployee.name || '—'}</Typography>],
                            ].map(([label, content], i) => (
                              <Grid item xs={12} md={i === 2 ? 12 : 6} key={i}>
                                <Box sx={{ p: 2, borderRight: i === 0 ? '2px solid #e0c8c8' : 'none', borderBottom: i < 2 ? '2px solid #e0c8c8' : 'none', minHeight: '70px' }}>
                                  <Typography sx={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.06em', color: '#6d2323', mb: 1, fontFamily: '"Poppins", sans-serif', textTransform: 'uppercase' }}>{label}</Typography>
                                  {content}
                                </Box>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>

                        <Box sx={{ border: '2.5px solid #6d2323', borderRadius: '6px', mb: 2, overflow: 'hidden' }}>
                          <Box sx={{ backgroundColor: '#6D2323', color: 'white', px: 2, py: 0.8 }}>
                            <Typography sx={{ fontWeight: 800, fontSize: '20px', letterSpacing: '0.07em', fontFamily: '"Poppins", sans-serif' }}>DEDUCTIONS BREAKDOWN</Typography>
                          </Box>
                          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', backgroundColor: '#f5eaea', borderBottom: '2px solid #c9a8a8' }}>
                            {['Government & Tax', 'GSIS Loans', 'Other Deductions'].map((h, i) => (
                              <Typography key={i} sx={{ fontSize: '18px', fontWeight: 800, color: '#6d2323', letterSpacing: '0.06em', textTransform: 'uppercase', px: 2, py: 1, fontFamily: '"Poppins", sans-serif', borderRight: i < 2 ? '2px solid #c9a8a8' : 'none' }}>{h}</Typography>
                            ))}
                          </Box>
                          {[
                            [["Withholding Tax",  formatCurrency(displayEmployee.withholdingTax)],        ["GSIS Salary Loan",  formatCurrency(displayEmployee.gsisSalaryLoan)],  ["Life & Retirement", formatCurrency(displayEmployee.personalLifeRetIns)]],
                            [["PhilHealth",       formatCurrency(displayEmployee.PhilHealthContribution)], ["GSIS Policy Loan",  formatCurrency(displayEmployee.gsisPolicyLoan)],  ["PhilHealth Diff",   formatCurrency(displayEmployee.philhealthDiff)]],
                            [["Pag-IBIG",         formatCurrency(displayEmployee.pagibigFundCont)],        ["GSIS Housing Loan", formatCurrency(displayEmployee.gsisHousingLoan)], ["Pag-IBIG 2",        formatCurrency(displayEmployee.pagibig2)]],
                            [["SSS",              formatCurrency(displayEmployee.sss)],                   ["GSIS Arrears",      formatCurrency(displayEmployee.gsisArrears)],     ["LBP Loan",          formatCurrency(displayEmployee.lbpLoan)]],
                            [["ECC",              formatCurrency(displayEmployee.ecc)],                   ["GFAL",              formatCurrency(displayEmployee.gfal)],            ["MTSLAI",            formatCurrency(displayEmployee.mtslai)]],
                            [["To Be Refunded",   formatCurrency(displayEmployee.toBeRefunded)],          ["CPL",               formatCurrency(displayEmployee.cpl)],             ["ESLAI",             formatCurrency(displayEmployee.eslai)]],
                            [["FEU",              formatCurrency(displayEmployee.feu)],                   ["MPL",               formatCurrency(displayEmployee.mpl)],             ["ABS",               formatAbs(displayEmployee.abs)]],
                            [["",                 ""],                                                    ["MPL Lite",          formatCurrency(displayEmployee.mplLite)],         ["ELA",               formatCurrency(displayEmployee.ela)]],
                          ].map((row, i) => <DeductionRow key={i} items={row} isEven={i % 2 === 0} />)}
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
                          <SummaryCard label="Net Salary"       value={formatCurrency(displayEmployee.netSalary)} />
                          <SummaryCard label="Total Deductions" value={formatCurrency(displayEmployee.totalDeductions)} />
                          <SummaryCard label="Net Pay"          value={computeNetPay(displayEmployee)} accent />
                        </Box>

                        <Box sx={{ border: '2.5px solid #6d2323', borderRadius: '6px', mb: 2, overflow: 'hidden' }}>
                          <Box sx={{ backgroundColor: '#6D2323', color: 'white', px: 2, py: 0.8 }}>
                            <Typography sx={{ fontWeight: 800, fontSize: '20px', letterSpacing: '0.07em', fontFamily: '"Poppins", sans-serif' }}>PAYMENT BREAKDOWN</Typography>
                          </Box>
                          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' }}>
                            {[['1ST QUINCENA', formatCurrency(displayEmployee.pay1st)], ['2ND QUINCENA', formatCurrency(displayEmployee.pay2nd)]].map(([label, value], i) => (
                              <Box key={i} sx={{ p: 2, borderRight: i === 0 ? '2px solid #e0c8c8' : 'none', minHeight: '70px' }}>
                                <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#6d2323', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: '"Poppins", sans-serif', mb: 0.5 }}>{label}</Typography>
                                <Typography sx={{ fontSize: '26px', fontWeight: 900, color: '#1a1a1a', fontFamily: '"Poppins", sans-serif', lineHeight: 1.1 }}>{value || '—'}</Typography>
                              </Box>
                            ))}
                          </Box>
                        </Box>

                        <Box sx={{ mt: 5, pt: 4, textAlign: 'center' }}>
                          <Typography sx={{ fontSize: '18px', color: '#555', mb: 1.5, fontFamily: '"Poppins", sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Certified Correct</Typography>
                          <Typography sx={{ fontSize: '24px', fontWeight: 900, color: '#1a1a1a', fontFamily: '"Poppins", sans-serif' }}>{certifierName}</Typography>
                          <Typography sx={{ fontSize: '20px', color: '#444', fontFamily: '"Poppins", sans-serif', fontWeight: 600, mt: 0.5 }}>{certifierPosition}</Typography>
                        </Box>
                      </>
                    );
                  })()}
                  </Box>
                </Box>
              </Paper>
            </GlassCard>
          </Fade>

        ) : selectedMonth !== null ? (
          <Fade in timeout={600}>
            <GlassCard sx={{ mb: 4 }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: alpha(accentColor, 0.1), mx: 'auto', mb: 3, width: 72, height: 72, color: accentColor }}>
                  <CalendarToday sx={{ fontSize: 36 }} />
                </Avatar>
                <Typography variant="h6" color={accentColor} gutterBottom sx={{ fontWeight: 700, fontFamily: '"Poppins", sans-serif' }}>No Payslip Found</Typography>
                <Typography variant="body2" color={grayColor} sx={{ mb: 2.5 }}>
                  No records found for <b>{monthsShort[selectedMonth]}</b> {selectedYear}
                </Typography>
                <Chip label="Please select a different period" sx={{ bgcolor: alpha(accentColor, 0.1), color: accentColor, fontWeight: 600 }} />
              </CardContent>
            </GlassCard>
          </Fade>
        ) : (
          <Fade in timeout={600}>
            <GlassCard sx={{ mb: 4 }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: alpha(accentColor, 0.1), mx: 'auto', mb: 3, width: 72, height: 72, color: accentColor }}>
                  <CalendarToday sx={{ fontSize: 36 }} />
                </Avatar>
                <Typography variant="h6" color={accentColor} gutterBottom sx={{ fontWeight: 700, fontFamily: '"Poppins", sans-serif' }}>Select Pay Period</Typography>
                <Typography variant="body2" color={grayColor}>Please select a month to view payslip</Typography>
              </CardContent>
            </GlassCard>
          </Fade>
        )}

        {/* ══ DOWNLOAD FAB ════════════════════════════════════════════════ */}
        {displayEmployee && (
          <Box component="button" onClick={downloadPDF} disabled={sending} sx={{
            position: 'fixed', bottom: 90, right: 28, zIndex: 1200,
            color: primaryColor, border: 'none', px: '20px', py: '13px',
            borderRadius: '50px', fontSize: '0.9rem', fontWeight: 700,
            cursor: sending ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px',
            background: sending ? grayColor : `linear-gradient(135deg, ${accentColor} 0%, ${accentDark} 100%)`,
            boxShadow: sending ? 'none' : '0 6px 20px rgba(109,35,35,0.4)',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            fontFamily: '"Poppins", sans-serif',
            whiteSpace: 'nowrap',
            '&:hover:not(:disabled)': { transform: 'translateY(-3px) scale(1.03)', boxShadow: '0 12px 28px rgba(109,35,35,0.5)' },
          }}>
            {sending ? (
              <><CircularProgress size={18} sx={{ color: primaryColor }} /><span>Processing...</span></>
            ) : (
              <><Download sx={{ fontSize: '1.2rem' }} /><span>Download PDF</span></>
            )}
          </Box>
        )}

        <Dialog open={modal.open} onClose={() => setModal({ ...modal, open: false })} PaperProps={{ sx: { borderRadius: 4, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' } }}>
          <SuccessfulOverlay open={modal.open && modal.type === 'success'} action={modal.action} onClose={() => setModal({ ...modal, open: false })} />
          {modal.type === 'error' && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Error Occurred</Typography>
              <Typography variant="body1" color="text.secondary">{modal.message || 'An error occurred while processing your request.'}</Typography>
            </Box>
          )}
        </Dialog>

        {/* ── Integrity Status Snackbar ────────────────────────────────────────── */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={5000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

      </Box>
    </Box>
  );
});

export default Payslip;