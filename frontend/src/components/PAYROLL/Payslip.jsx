import API_BASE_URL from '../../apiConfig';
import { jwtDecode } from 'jwt-decode';
import React, {
  useRef,
  forwardRef,
  useState,
  useEffect,
  useMemo,
} from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Alert,
  Collapse,
  Card,
  Button,
  alpha,
  styled,
  Fade,
  Snackbar,
  Grid,
  Paper,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import Refresh from '@mui/icons-material/Refresh';
import Download from '@mui/icons-material/Download';
import Person from '@mui/icons-material/Person';
import CalendarToday from '@mui/icons-material/CalendarToday';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import usePayrollRealtimeRefresh from '../../hooks/usePayrollRealtimeRefresh';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';

// ─── Utilities ────────────────────────────────────────────────────────────────
const generateHash = (data) => {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
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

// ─── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  accentMid: '#8B4545',
  accentFaint: 'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover: 'rgba(109,35,35,0.10)',
  headerGrad: 'linear-gradient(180deg,#6d2323 0%,#7e2c2c 100%)',
  rowOdd: 'rgba(109,35,35,0.025)',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#a0a0a0',
  surface: '#ffffff',
  divider: 'rgba(0,0,0,0.08)',
};

// ─── Styled primitives ─────────────────────────────────────────────────────────
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

const FieldInput = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8,
    fontSize: '0.875rem',
    backgroundColor: '#fff',
    '& fieldset': { borderColor: T.accentBorder },
    '&:hover fieldset': { borderColor: T.accent },
    '&.Mui-focused fieldset': { borderColor: T.accent, borderWidth: 1.5 },
    '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: T.text },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: T.accent },
});

// ─── Section label ─────────────────────────────────────────────────────────────
const FormSectionLabel = ({ icon: Icon, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
    <Icon sx={{ fontSize: 12, color: alpha(T.accent, 0.45) }} />
    <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: alpha(T.accent, 0.45) }}>
      {children}
    </Typography>
  </Box>
);

// ─── Shimmer keyframes ────────────────────────────────────────────────────────
const shimmerKf = `
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

// ─── Wireframe skeleton ────────────────────────────────────────────────────────
const PayslipWireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box sx={{ py: { xs: 2, md: 4 }, mt: { xs: 0, md: -5 }, width: '100vw', maxWidth: '100%', position: 'relative', left: '63%', transform: 'translateX(-61%)', px: { xs: 2, sm: 3, md: 6 } }}>
      <Box sx={{ mb: 3, borderRadius: 3, overflow: 'hidden', border: `1px solid ${T.accentBorder}`, animation: 'blink 2s ease-in-out infinite' }}>
        <Box sx={{ p: 3.5, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2.5, position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.06)' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)', flexShrink: 0 }} />
            <Box><Bone w={220} h={18} sx={{ mb: 1 }} /><Bone w={360} h={11} /></Box>
          </Box>
        </Box>
      </Box>
      <Grid container spacing={3}>
        {[4, 8].map((lg, idx) => (
          <Grid item xs={12} lg={lg} key={idx}>
            <Box sx={{ borderRadius: 3, border: `1px solid ${T.accentBorder}`, bgcolor: '#fff', overflow: 'hidden', animation: `blink 2s ease-in-out ${idx * 0.1}s infinite`, height: 'calc(100vh - 280px)' }}>
              <Box sx={{ px: 3.5, py: 2.5, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)' }} />
                <Bone w={lg === 4 ? 160 : 220} h={13} />
              </Box>
              <Box sx={{ p: 3.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {[100, 160, 120, 140, 110, 130].map((w, i) => (
                  <Box key={i}><Bone w={w} h={10} sx={{ mb: 1 }} /><Box sx={{ height: 40, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: '#fafafa' }} /></Box>
                ))}
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  </>
);

// ─── Payslip preview sub-components ───────────────────────────────────────────
const MoneyCell = ({ label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, py: 2, borderBottom: '1.5px solid #ddd' }}>
    <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#333', fontFamily: '"Poppins", sans-serif' }}>{label}</Typography>
    <Typography sx={{ fontSize: '20px', fontWeight: 900, color: '#111', fontFamily: '"Poppins", sans-serif', minWidth: '140px', textAlign: 'right' }}>{value || '—'}</Typography>
  </Box>
);

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

const SummaryCard = ({ label, value, accent = false }) => (
  <Box sx={{ flex: 1, borderRadius: 2, p: 1.5, background: accent ? 'linear-gradient(135deg, #f5ede8 0%, #ede0d8 100%)' : '#fff', border: accent ? '2.5px solid #6d2323' : '2.5px solid #c9a8a8', boxShadow: accent ? '0 4px 16px rgba(109,35,35,0.25)' : 'none', display: 'flex', flexDirection: 'column', gap: 0.8 }}>
    <Typography sx={{ fontSize: '17px', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6d2323', fontFamily: '"Poppins", sans-serif' }}>{label}</Typography>
    <Typography sx={{ fontSize: '34px', fontWeight: 900, color: accent ? '#6d2323' : '#1a1a1a', fontFamily: '"Poppins", sans-serif', lineHeight: 1.1, letterSpacing: '-0.01em' }}>{value || '—'}</Typography>
  </Box>
);

// ─── Auth helper ───────────────────────────────────────────────────────────────
const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
});

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const monthFromLocationState = (val) => {
  if (val === undefined || val === null) return '';
  if (typeof val === 'number' && val >= 0 && val <= 11) return MONTHS[val];
  if (typeof val === 'string' && MONTHS.includes(val)) return val;
  return '';
};

// ─── "No Data" placeholder for a month slot ───────────────────────────────────
const NoDataSlip = ({ label }) => (
  <Box sx={{
    width: '920px',
    minHeight: '600px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    bgcolor: '#fff',
    border: '2.5px dashed rgba(109,35,35,0.2)',
    borderRadius: '8px',
    gap: 1.5,
  }}>
    <CalendarToday sx={{ fontSize: 48, color: alpha(T.accent, 0.18) }} />
    <Typography sx={{ fontSize: '26px', fontWeight: 800, color: alpha(T.accent, 0.35), fontFamily: '"Poppins",sans-serif' }}>No Data</Typography>
    <Typography sx={{ fontSize: '18px', color: alpha(T.accent, 0.25), fontFamily: '"Poppins",sans-serif' }}>{label}</Typography>
  </Box>
);

// ════════════════════════════════════════════════════════════════════════════
const Payslip = forwardRef(({ employee }, ref) => {
  const payslipRef = ref || useRef();
  const location = useLocation();
  const locationState = location?.state || {};

  const [allPayroll, setAllPayroll] = useState([]);
  const [displayEmployee, setDisplayEmployee] = useState(employee || null);
  const [loading, setLoading] = useState(!employee);
  const [error, setError] = useState('');
  const [modal, setModal] = useState({ open: false, type: 'error', message: '' });

  const [selectedMonth, setSelectedMonth] = useState(() => monthFromLocationState(locationState.selectedMonth));
  const [selectedYear, setSelectedYear] = useState(
    locationState.selectedYear !== undefined ? locationState.selectedYear : new Date().getFullYear(),
  );
  const [personID, setPersonID] = useState('');
  const [pageLoading, setPageLoading] = useState(true);

  const [originalPayroll, setOriginalPayroll] = useState([]);
  const [payrollHash, setPayrollHash] = useState('');
  const [fetchedAt, setFetchedAt] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [alertState, setAlertState] = useState({ open: false, message: '', severity: 'success' });
  const [pdfBusy, setPdfBusy] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const base = Array.from({ length: 6 }, (_, i) => currentYear - i);
    const y = Number(selectedYear);
    if (!Number.isNaN(y) && !base.includes(y)) return [...base, y].sort((a, b) => b - a);
    return base;
  }, [currentYear, selectedYear]);

  const { settings } = useSystemSettings();
  const institutionLogo = settings.institutionLogo || '';
  const dynamicHrisLogo = settings.hrisLogo || '';
  const institutionName = settings.institutionName || 'Institution Name';
  const institutionAddress = settings.institutionAddress || 'Institute Address';
  const certifierName = settings.certifierName || 'Default Certifier';
  const certifierPosition = settings.certifierPosition || 'Default Position';

  const { hasAccess, loading: accessLoading } = usePageAccess('payslip');

  const fetchPayrollData = async () => {
    if (!personID) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/PayrollReleasedRoute/released-payroll-detailed`, getAuthHeaders());
      const data = Array.isArray(res.data) ? res.data : [];
      setAllPayroll(data);
      if (data.length > 0) {
        const immutable = Object.freeze(JSON.parse(JSON.stringify(data)));
        setOriginalPayroll(immutable);
        setPayrollHash(generateHash(data));
        setFetchedAt(new Date().toISOString());
      } else {
        setOriginalPayroll([]);
        setPayrollHash('');
        setFetchedAt(null);
      }
    } catch (err) {
      console.error('Error fetching payroll:', err);
      setError('Failed to fetch payroll data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  usePayrollRealtimeRefresh(() => { if (!employee) fetchPayrollData(); });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try { setPersonID(jwtDecode(token).employeeNumber); }
      catch (e) { console.error('Token decode error:', e); }
    }
  }, []);

  useEffect(() => { if (!employee) fetchPayrollData(); }, [employee, personID]); // eslint-disable-line

  useEffect(() => {
    if (!personID || allPayroll.length === 0) return;
    if (!selectedMonth) {
      setDisplayEmployee(null);
      return;
    }
    const monthIndex = MONTHS.indexOf(selectedMonth);
    if (monthIndex < 0) return;
    const result = allPayroll.filter((emp) => {
      if (!emp.startDate) return false;
      const d = new Date(emp.startDate);
      return emp.employeeNumber?.toString() === personID.toString() && d.getMonth() === monthIndex && d.getFullYear() === Number(selectedYear);
    });
    setDisplayEmployee(result.length > 0 ? result[0] : null);
  }, [allPayroll, personID, selectedMonth, selectedYear]);

  useEffect(() => {
    if (!accessLoading && !loading) setTimeout(() => setPageLoading(false), 300);
  }, [accessLoading, loading]);

  const myPayrollRows = allPayroll.filter((p) => p.employeeNumber?.toString() === personID.toString());
  const filteredPayrollCount = selectedMonth
    ? allPayroll.filter((emp) => {
        if (!emp.startDate) return false;
        const d = new Date(emp.startDate);
        if (emp.employeeNumber?.toString() !== personID.toString()) return false;
        return d.getMonth() === MONTHS.indexOf(selectedMonth) && d.getFullYear() === Number(selectedYear);
      }).length
    : 0;

  // ── Compute the 3 months to display: selected month + 2 prior ────────────
  const threeMonthSlots = useMemo(() => {
    if (!selectedMonth) return [];
    const monthIndex = MONTHS.indexOf(selectedMonth);
    if (monthIndex < 0) return [];
    return [0, 1, 2].map((offset) => {
      let m = monthIndex - offset;
      let y = Number(selectedYear);
      while (m < 0) { m += 12; y -= 1; }
      const label = `${MONTHS[m]} ${y}`;
      const payroll = allPayroll.find((p) => {
        if (!p.startDate || p.employeeNumber?.toString() !== personID.toString()) return false;
        const d = new Date(p.startDate);
        return d.getMonth() === m && d.getFullYear() === y;
      }) || null;
      return { month: m, year: y, label, payroll };
    });
  }, [selectedMonth, selectedYear, allPayroll, personID]);

  const handleYearChange = (year) => {
    setSelectedYear(year);
    setSnackbar({ open: true, message: 'Year changed — payroll for the selected month updates automatically.', severity: 'info' });
  };

  const formatCurrency = (v) => { const n = parseFloat(v); return !isNaN(n) && n !== 0 ? `₱${n.toLocaleString()}` : ''; };
  const formatRenderedDays = (v) => { const h = Number(v); if (!isNaN(h) && h > 0) { const d = Math.floor(h / 8), r = h % 8; return `${d} days${r > 0 ? ` & ${r} hrs` : ''}`; } return ''; };
  const getSurname = (name) => { if (!name) return 'EARIST'; const p = name.trim().split(' '); return p[p.length - 1] || 'EARIST'; };
  const sanitizeFilenamePart = (s) =>
    String(s ?? '')
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
      .replace(/\s+/g, '')
      .toUpperCase();
  const buildPayslipDownloadFilename = (emp) => {
    const last = sanitizeFilenamePart(getSurname(emp?.name)) || 'UNKNOWN';
    if (!emp?.startDate) return `${last}.pdf`;
    const d = new Date(emp.startDate);
    if (Number.isNaN(d.getTime())) return `${last}.pdf`;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-${last}.pdf`;
  };
  const formatAbs = (v) => formatCurrency(v) || 'Deducted from VL';
  const computeNetPay = (emp) => { const r = (parseFloat(emp.netSalary) || 0) - (parseFloat(emp.totalDeductions) || 0); return !isNaN(r) && r !== 0 ? `₱${r.toLocaleString()}` : '—'; };

  // ── buildPayslipHTML ──────────────────────────────────────────────────────
  const buildPayslipHTML = (emp, logoSrc, hrisLogoSrc) => {
    const fc = (v) => { const n = parseFloat(v); return !isNaN(n) && n !== 0 ? `&#8369;${n.toLocaleString()}` : ''; };
    const fcAbs = (v) => fc(v) || 'Deducted from VL';
    const frd = (v) => { const h = Number(v); if (!isNaN(h) && h > 0) { const d = Math.floor(h / 8), r = h % 8; return `${d} days${r > 0 ? ` & ${r} hrs` : ''}`; } return ''; };
    const period = (() => { if (!emp.startDate || !emp.endDate) return '&mdash;'; const s = new Date(emp.startDate), e = new Date(emp.endDate); return `${s.toLocaleString('en-US', { month: 'long' }).toUpperCase()} ${s.getDate()}&ndash;${e.getDate()} ${e.getFullYear()}`; })();
    const isJO = (emp.employmentCategory ?? -1) === 0;
    const netPayCalc = (() => { const n = (parseFloat(emp.netSalary) || 0) - (parseFloat(emp.totalDeductions) || 0); return n !== 0 ? `&#8369;${n.toLocaleString()}` : '&mdash;'; })();
    const headerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#6d2323 0%,#a31d1d 100%);border-radius:6px;padding:20px 28px;margin-bottom:18px;box-shadow:0 4px 20px rgba(109,35,35,0.3);">${logoSrc ? `<img src="${logoSrc}" style="width:88px;height:88px;border-radius:50%;object-fit:cover;margin-left:8px;flex-shrink:0;" crossorigin="anonymous"/>` : `<div style="width:88px;height:88px;border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);margin-left:8px;flex-shrink:0;"></div>`}<div style="flex:1;text-align:center;color:white;padding:0 16px;"><div style="font-style:italic;font-size:18px;opacity:0.9;font-family:Poppins,sans-serif;">Republic of the Philippines</div><div style="font-weight:900;font-size:22px;line-height:1.4;font-family:Poppins,sans-serif;letter-spacing:0.02em;margin-top:4px;">${escapeHtml(institutionName)}</div><div style="font-size:17px;opacity:0.85;font-family:Poppins,sans-serif;margin-top:4px;">${escapeHtml(institutionAddress)}</div></div>${hrisLogoSrc ? `<img src="${hrisLogoSrc}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;flex-shrink:0;" crossorigin="anonymous"/>` : `<div style="width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);flex-shrink:0;"></div>`}</div>`;
    const secHead = (t) => `<div style="background:#6D2323;color:white;padding:8px 16px;"><span style="font-weight:800;font-size:20px;letter-spacing:0.07em;font-family:Poppins,sans-serif;">${t}</span></div>`;
    const infoCell = (lbl, content, br = false, bb = false, fw = false) => `<div style="padding:12px 16px;${br ? 'border-right:2px solid #e0c8c8;' : ''}${bb ? 'border-bottom:2px solid #e0c8c8;' : ''}min-height:60px;${fw ? 'grid-column:1/-1;' : ''}"><div style="font-size:18px;font-weight:800;letter-spacing:0.06em;color:#6d2323;margin-bottom:4px;font-family:Poppins,sans-serif;text-transform:uppercase;">${lbl}</div>${content}</div>`;
    const summaryCards = (netSal, totalDed, netPay) => `<div style="display:flex;gap:12px;margin-bottom:24px;">${[['Net Salary', netSal, false], ['Total Deductions', totalDed, false], ['Net Pay', netPay, true]].map(([lbl, val, acc]) => `<div style="flex:1;border-radius:8px;padding:12px;background:${acc ? 'linear-gradient(135deg,#f5ede8 0%,#ede0d8 100%)' : '#fff'};border:${acc ? '2.5px solid #6d2323' : '2.5px solid #c9a8a8'};${acc ? 'box-shadow:0 4px 16px rgba(109,35,35,0.25);' : ''}"><div style="font-size:17px;font-weight:800;letter-spacing:0.07em;text-transform:uppercase;color:#6d2323;font-family:Poppins,sans-serif;">${lbl}</div><div style="font-size:34px;font-weight:900;color:${acc ? '#6d2323' : '#1a1a1a'};font-family:Poppins,sans-serif;line-height:1.1;">${val || '&mdash;'}</div></div>`).join('')}</div>`;
    const footer = `<div style="margin-top:40px;padding-top:24px;text-align:center;"><div style="font-size:18px;color:#555;margin-bottom:8px;font-family:Poppins,sans-serif;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;">Certified Correct</div><div style="font-size:24px;font-weight:900;color:#1a1a1a;font-family:Poppins,sans-serif;">${escapeHtml(certifierName)}</div><div style="font-size:20px;color:#444;font-family:Poppins,sans-serif;font-weight:600;margin-top:4px;">${escapeHtml(certifierPosition)}</div></div>`;
    let bodyHTML = '';
    if (isJO) {
      bodyHTML = `<div style="border:2.5px solid #6d2323;border-radius:6px;margin-bottom:16px;overflow:hidden;">${secHead('EMPLOYEE INFORMATION')}<div style="display:grid;grid-template-columns:1fr 1fr;">${infoCell('Employee Number', `<div style="font-size:26px;color:#c0392b;font-weight:900;font-family:Poppins,sans-serif;">${emp.employeeNumber ? parseFloat(emp.employeeNumber) : '&mdash;'}</div>`, true, true)}${infoCell('Name', `<div style="font-size:26px;color:#c0392b;font-weight:900;font-family:Poppins,sans-serif;">${escapeHtml(emp.name || '&mdash;')}</div>`, false, true)}${infoCell('Period', `<div style="font-size:21px;font-weight:700;color:#1a1a1a;font-family:Poppins,sans-serif;">${period}</div>`, true, false)}${infoCell('Rendered Days', `<div style="font-size:21px;font-weight:700;color:#1a1a1a;font-family:Poppins,sans-serif;">${frd(emp.rh) || '&mdash;'}</div>`, false, false)}</div></div><div style="border:2.5px solid #6d2323;border-radius:6px;margin-bottom:16px;overflow:hidden;">${secHead('DEDUCTIONS')}${[['SSS', fc(emp.sss)], ['Pag-IBIG', fc(emp.pagibigFundCont)]].map(([lbl, val]) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:1.5px solid #ddd;"><span style="font-size:18px;font-weight:700;color:#333;font-family:Poppins,sans-serif;">${lbl}</span><span style="font-size:20px;font-weight:900;color:#111;font-family:Poppins,sans-serif;min-width:140px;text-align:right;">${val || '&mdash;'}</span></div>`).join('')}</div>${summaryCards(fc(emp.netSalary), fc(emp.totalDeductions), netPayCalc)}${footer}`;
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
      bodyHTML = `<div style="border:2.5px solid #6d2323;border-radius:6px;margin-bottom:16px;overflow:hidden;">${secHead('EMPLOYEE INFORMATION')}<div style="display:grid;grid-template-columns:1fr 1fr;">${infoCell('Period', `<div style="font-size:21px;font-weight:700;color:#1a1a1a;font-family:Poppins,sans-serif;">${period}</div>`, true, true)}${infoCell('Employee Number', `<div style="font-size:26px;color:#c0392b;font-weight:900;font-family:Poppins,sans-serif;">${emp.employeeNumber ? parseFloat(emp.employeeNumber) : '&mdash;'}</div>`, false, true)}${infoCell('Name', `<div style="font-size:26px;color:#c0392b;font-weight:900;font-family:Poppins,sans-serif;">${escapeHtml(emp.name || '&mdash;')}</div>`, false, false, true)}</div></div><div style="border:2.5px solid #6d2323;border-radius:6px;margin-bottom:16px;overflow:hidden;">${secHead('DEDUCTIONS BREAKDOWN')}<div style="display:grid;grid-template-columns:repeat(3,1fr);background:#f5eaea;border-bottom:2px solid #c9a8a8;">${['Government & Tax', 'GSIS Loans', 'Other Deductions'].map((h, i) => `<div style="font-size:18px;font-weight:800;color:#6d2323;letter-spacing:0.06em;text-transform:uppercase;padding:8px 16px;font-family:Poppins,sans-serif;${i < 2 ? 'border-right:2px solid #c9a8a8;' : ''}">${h}</div>`).join('')}</div>${rows.map((row, ri) => `<div style="display:grid;grid-template-columns:repeat(3,1fr);background:${ri % 2 === 0 ? '#fdf6f6' : '#fff'};border-bottom:1.5px solid #c9a8a8;">${row.map(([lbl, val], ci) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 12px;${ci < 2 ? 'border-right:1.5px solid #c9a8a8;' : ''}min-height:38px;gap:4px;"><span style="font-size:20px;color:#1a1a1a;font-family:Poppins,sans-serif;font-weight:700;flex:1;">${lbl || ''}</span><span style="font-size:20px;font-weight:900;color:${val ? '#6d2323' : '#aaa'};font-family:Poppins,sans-serif;min-width:100px;text-align:right;">${val || '&mdash;'}</span></div>`).join('')}</div>`).join('')}</div>${summaryCards(fc(emp.netSalary), fc(emp.totalDeductions), netPayCalc)}<div style="border:2.5px solid #6d2323;border-radius:6px;margin-bottom:16px;overflow:hidden;">${secHead('PAYMENT BREAKDOWN')}<div style="display:grid;grid-template-columns:1fr 1fr;">${[['1ST QUINCENA', fc(emp.pay1st)], ['2ND QUINCENA', fc(emp.pay2nd)]].map(([lbl, val], i) => `<div style="padding:16px;${i === 0 ? 'border-right:2px solid #e0c8c8;' : ''}min-height:70px;"><div style="font-size:18px;font-weight:800;color:#6d2323;letter-spacing:0.1em;text-transform:uppercase;font-family:Poppins,sans-serif;margin-bottom:4px;">${lbl}</div><div style="font-size:26px;font-weight:900;color:#1a1a1a;font-family:Poppins,sans-serif;line-height:1.1;">${val || '&mdash;'}</div></div>`).join('')}</div></div>${footer}`;
    }
    return `<div style="font-family:Poppins,sans-serif;background:#fff;width:1100px;padding:24px 24px 32px;box-sizing:border-box;position:relative;"><div style="position:relative;z-index:1;">${headerHTML}${bodyHTML}</div>${hrisLogoSrc ? `<img data-watermark="1" src="${hrisLogoSrc}" crossorigin="anonymous" style="position:absolute;left:50%;width:70%;opacity:0.08;pointer-events:none;z-index:2;mix-blend-mode:multiply;top:50%;transform:translate(-50%,-50%);"/>` : ''}</div>`;
  };

  const generate3MonthPDF = async (emp) => {
    const s = new Date(emp.startDate);
    const monthsToGet = [0, 1, 2].map((i) => { const d = new Date(s.getFullYear(), s.getMonth() - i, 1); return { month: d.getMonth(), year: d.getFullYear(), label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }) }; });
    const records = monthsToGet.map(({ month, year, label }) => ({ label, payroll: allPayroll.find((p) => p.employeeNumber === emp.employeeNumber && new Date(p.startDate).getMonth() === month && new Date(p.startDate).getFullYear() === year) }));
    const containers = records.map((_, i) => { const div = document.createElement('div'); div.style.cssText = `position:absolute;left:${-9999 - i * 1200}px;top:-9999px;width:1100px;background:#fff;`; document.body.appendChild(div); return div; });
    records.forEach(({ payroll, label }, i) => { containers[i].innerHTML = payroll ? buildPayslipHTML(payroll, institutionLogo, dynamicHrisLogo) : `<div style="width:1100px;height:1700px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;"><div style="font-size:28px;font-weight:bold;color:#6D2323;font-family:Poppins,sans-serif;">No Data</div><div style="font-size:20px;color:#6D2323;font-family:Poppins,sans-serif;margin-top:8px;">for ${label}</div></div>`; });
    await new Promise((r) => requestAnimationFrame(r));
    containers.forEach((container) => { const root = container.firstElementChild; if (!root) return; const totalH = root.scrollHeight || root.offsetHeight; const wm = root.querySelector('img[data-watermark="1"]'); if (wm) { const wmH = wm.naturalHeight && wm.naturalWidth ? (wm.offsetWidth || 770) * (wm.naturalHeight / wm.naturalWidth) : 400; wm.style.transform = 'none'; wm.style.top = `${totalH / 2 - wmH / 2}px`; wm.style.left = `${(1100 - (wm.offsetWidth || 770)) / 2}px`; } });
    const images = await Promise.all(containers.map((container) => { const root = container.firstElementChild || container; const h = root.scrollHeight || root.offsetHeight || 1700; return html2canvas(root, { scale: 1.0, useCORS: true, allowTaint: true, logging: false, backgroundColor: '#ffffff', imageTimeout: 15000, windowWidth: 1100, windowHeight: h, height: h, foreignObjectRendering: false }).then((c) => c.toDataURL('image/jpeg', 0.82)); }));
    containers.forEach((c) => document.body.removeChild(c));
    const pdf = new jsPDF('l', 'in', 'a4');
const cw = 3.5, ch = 6, gap = 0.2;
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
    const tw = cw * 3 + gap * 2, yo = (ph - ch) / 2;
    const pos = [(pw - tw) / 2, (pw - tw) / 2 + cw + gap, (pw - tw) / 2 + (cw + gap) * 2];
    images.forEach((img, i) => pdf.addImage(img, 'JPEG', pos[i], yo, cw, ch));
    return pdf;
  };

  const verifyIntegrity = () => {
    if (!fetchedAt || originalPayroll.length === 0) { setSnackbar({ open: true, message: 'No payroll data loaded. Please search first.', severity: 'warning' }); return false; }
    const ageMs = Date.now() - new Date(fetchedAt).getTime();
    if (ageMs > 30 * 60 * 1000) { setSnackbar({ open: true, message: 'Data is older than 30 minutes. Please refresh.', severity: 'warning' }); return false; }
    if (generateHash(allPayroll) !== payrollHash) { setSnackbar({ open: true, message: 'Integrity check failed. Records may have been modified. Please reload.', severity: 'error' }); return false; }
    return true;
  };

  const downloadPDF = async () => {
    if (!displayEmployee || !verifyIntegrity()) return;
    try {
      setPdfBusy(true);
      const pdf = await generate3MonthPDF(displayEmployee);
      pdf.save(buildPayslipDownloadFilename(displayEmployee));
      try { await axios.post(`${API_BASE_URL}/PayrollReleasedRoute/log-print`, { employeeNumber: displayEmployee.employeeNumber }, getAuthHeaders()); }
      catch (e) { console.error('Print audit log error:', e); }
      setSuccessOpen(true);
    } catch (err) {
      console.error('PDF generation error:', err);
      setModal({ open: true, type: 'error', message: 'Failed to generate PDF.' });
    } finally {
      setPdfBusy(false);
    }
  };

  // ── Payslip preview renderer (single slip) ────────────────────────────────
  const renderPayslipPreview = (emp) => {
    const isJO = (emp.employmentCategory ?? -1) === 0;
    const SecHead = ({ title, icon }) => (
      <Box sx={{ backgroundColor: '#6D2323', color: 'white', px: 2, py: 0.8, display: 'flex', alignItems: 'center', gap: 1.2 }}>
        {icon}
        <Typography sx={{ fontWeight: 800, fontSize: '20px', letterSpacing: '0.07em', fontFamily: '"Poppins",sans-serif' }}>{title}</Typography>
      </Box>
    );
    const period = (() => {
      if (!emp.startDate || !emp.endDate) return '—';
      const s = new Date(emp.startDate), e = new Date(emp.endDate);
      return `${s.toLocaleString('en-US', { month: 'long' }).toUpperCase()} ${s.getDate()}–${e.getDate()} ${e.getFullYear()}`;
    })();

    if (isJO) return (
      <>
        <Box sx={{ border: '2.5px solid #6d2323', borderRadius: '6px', mb: 2, overflow: 'hidden' }}>
          <SecHead title="EMPLOYEE INFORMATION" />
          <Grid container>
            {[['EMPLOYEE NUMBER', <Typography sx={{ fontSize: '26px', color: '#c0392b', fontWeight: 900, fontFamily: '"Poppins",sans-serif' }}>{emp.employeeNumber ? `${parseFloat(emp.employeeNumber)}` : '—'}</Typography>], ['NAME', <Typography sx={{ fontSize: '26px', color: '#c0392b', fontWeight: 900, fontFamily: '"Poppins",sans-serif' }}>{emp.name || '—'}</Typography>], ['PERIOD', <Typography sx={{ fontSize: '21px', fontWeight: 700, color: '#1a1a1a', fontFamily: '"Poppins",sans-serif' }}>{period}</Typography>], ['RENDERED DAYS', <Typography sx={{ fontSize: '21px', fontWeight: 700, color: '#1a1a1a', fontFamily: '"Poppins",sans-serif' }}>{formatRenderedDays(emp.rh) || '—'}</Typography>]].map(([label, content], i) => (
              <Grid item xs={12} md={6} key={i}>
                <Box sx={{ p: 1.5, borderRight: i % 2 === 0 ? '2px solid #e0c8c8' : 'none', borderBottom: i < 2 ? '2px solid #e0c8c8' : 'none', minHeight: '60px' }}>
                  <Typography sx={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.06em', color: '#6d2323', mb: 0.5, fontFamily: '"Poppins",sans-serif', textTransform: 'uppercase' }}>{label}</Typography>
                  {content}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
        <Box sx={{ border: '2.5px solid #6d2323', borderRadius: '6px', mb: 2, overflow: 'hidden' }}>
          <SecHead title="DEDUCTIONS" icon={<RemoveCircleOutlineIcon sx={{ fontSize: 22 }} />} />
          <MoneyCell label="SSS" value={formatCurrency(emp.sss)} />
          <MoneyCell label="Pag-IBIG" value={formatCurrency(emp.pagibigFundCont)} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}><SummaryCard label="Net Salary" value={formatCurrency(emp.netSalary)} /><SummaryCard label="Total Deductions" value={formatCurrency(emp.totalDeductions)} /><SummaryCard label="Net Pay" value={computeNetPay(emp)} accent /></Box>
        <Box sx={{ borderTop: '2.5px solid #e0c8c8', mt: 5, pt: 4, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '18px', color: '#555', mb: 1.5, fontFamily: '"Poppins",sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Certified Correct</Typography>
          <Typography sx={{ fontSize: '24px', fontWeight: 900, color: '#1a1a1a', fontFamily: '"Poppins",sans-serif' }}>{certifierName}</Typography>
          <Typography sx={{ fontSize: '20px', color: '#444', fontFamily: '"Poppins",sans-serif', fontWeight: 600, mt: 0.5 }}>{certifierPosition}</Typography>
        </Box>
      </>
    );

    return (
      <>
        <Box sx={{ border: '2.5px solid #6d2323', borderRadius: '6px', mb: 2, overflow: 'hidden' }}>
          <SecHead title="EMPLOYEE INFORMATION" />
          <Grid container>
            {[['PERIOD', <Typography sx={{ fontSize: '21px', fontWeight: 700, color: '#1a1a1a', fontFamily: '"Poppins",sans-serif' }}>{period}</Typography>], ['EMPLOYEE NUMBER', <Typography sx={{ fontSize: '26px', color: '#c0392b', fontWeight: 900, fontFamily: '"Poppins",sans-serif' }}>{emp.employeeNumber ? `${parseFloat(emp.employeeNumber)}` : '—'}</Typography>], ['NAME', <Typography sx={{ fontSize: '26px', color: '#c0392b', fontWeight: 900, fontFamily: '"Poppins",sans-serif' }}>{emp.name || '—'}</Typography>]].map(([label, content], i) => (
              <Grid item xs={12} md={i === 2 ? 12 : 6} key={i}>
                <Box sx={{ p: 2, borderRight: i === 0 ? '2px solid #e0c8c8' : 'none', borderBottom: i < 2 ? '2px solid #e0c8c8' : 'none', minHeight: '70px' }}>
                  <Typography sx={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.06em', color: '#6d2323', mb: 0.5, fontFamily: '"Poppins",sans-serif', textTransform: 'uppercase' }}>{label}</Typography>
                  {content}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
        <Box sx={{ border: '2.5px solid #6d2323', borderRadius: '6px', mb: 2, overflow: 'hidden' }}>
          <SecHead title="DEDUCTIONS BREAKDOWN" />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', backgroundColor: '#f5eaea', borderBottom: '2px solid #c9a8a8' }}>
            {['Government & Tax', 'GSIS Loans', 'Other Deductions'].map((h, i) => (
              <Typography key={i} sx={{ fontSize: '18px', fontWeight: 800, color: '#6d2323', letterSpacing: '0.06em', textTransform: 'uppercase', px: 2, py: 1, fontFamily: '"Poppins",sans-serif', borderRight: i < 2 ? '2px solid #c9a8a8' : 'none' }}>{h}</Typography>
            ))}
          </Box>
          {[[['Withholding Tax', formatCurrency(emp.withholdingTax)], ['GSIS Salary Loan', formatCurrency(emp.gsisSalaryLoan)], ['Life & Retirement', formatCurrency(emp.personalLifeRetIns)]], [['PhilHealth', formatCurrency(emp.PhilHealthContribution)], ['GSIS Policy Loan', formatCurrency(emp.gsisPolicyLoan)], ['PhilHealth Diff', formatCurrency(emp.philhealthDiff)]], [['Pag-IBIG', formatCurrency(emp.pagibigFundCont)], ['GSIS Housing Loan', formatCurrency(emp.gsisHousingLoan)], ['Pag-IBIG 2', formatCurrency(emp.pagibig2)]], [['SSS', formatCurrency(emp.sss)], ['GSIS Arrears', formatCurrency(emp.gsisArrears)], ['LBP Loan', formatCurrency(emp.lbpLoan)]], [['ECC', formatCurrency(emp.ecc)], ['GFAL', formatCurrency(emp.gfal)], ['MTSLAI', formatCurrency(emp.mtslai)]], [['To Be Refunded', formatCurrency(emp.toBeRefunded)], ['CPL', formatCurrency(emp.cpl)], ['ESLAI', formatCurrency(emp.eslai)]], [['FEU', formatCurrency(emp.feu)], ['MPL', formatCurrency(emp.mpl)], ['ABS', formatAbs(emp.abs)]], [['', ''], ['MPL Lite', formatCurrency(emp.mplLite)], ['ELA', formatCurrency(emp.ela)]]].map((row, i) => <DeductionRow key={i} items={row} isEven={i % 2 === 0} />)}
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}><SummaryCard label="Net Salary" value={formatCurrency(emp.netSalary)} /><SummaryCard label="Total Deductions" value={formatCurrency(emp.totalDeductions)} /><SummaryCard label="Net Pay" value={computeNetPay(emp)} accent /></Box>
        <Box sx={{ border: '2.5px solid #6d2323', borderRadius: '6px', mb: 2, overflow: 'hidden' }}>
          <SecHead title="PAYMENT BREAKDOWN" />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)' }}>
            {[['1ST QUINCENA', formatCurrency(emp.pay1st)], ['2ND QUINCENA', formatCurrency(emp.pay2nd)]].map(([label, value], i) => (
              <Box key={i} sx={{ p: 2, borderRight: i === 0 ? '2px solid #e0c8c8' : 'none', minHeight: '70px' }}>
                <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#6d2323', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: '"Poppins",sans-serif', mb: 0.5 }}>{label}</Typography>
                <Typography sx={{ fontSize: '26px', fontWeight: 900, color: '#1a1a1a', fontFamily: '"Poppins",sans-serif', lineHeight: 1.1 }}>{value || '—'}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
        <Box sx={{ mt: 0.75, pt: 0.5, pb: 0.5, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '16px', color: '#555', mb: 0.5, fontFamily: '"Poppins",sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Certified Correct</Typography>
          <Typography sx={{ fontSize: '22px', fontWeight: 900, color: '#1a1a1a', fontFamily: '"Poppins",sans-serif', lineHeight: 1.05 }}>{certifierName}</Typography>
          <Typography sx={{ fontSize: '18px', color: '#444', fontFamily: '"Poppins",sans-serif', fontWeight: 600, mt: 0.25, lineHeight: 1.05 }}>{certifierPosition}</Typography>
        </Box>
      </>
    );
  };

  // ── Institution header (used inside each slip) ────────────────────────────
  const PayslipInstitutionHeader = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, background: 'linear-gradient(135deg,#6d2323 0%,#a31d1d 100%)', borderRadius: '6px', p: '20px 28px', boxShadow: '0 4px 20px rgba(109,35,35,0.3)' }}>
      {institutionLogo ? <img src={institutionLogo} alt="Logo" style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', marginLeft: 8 }} /> : <Box sx={{ width: 88, height: 88, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', marginLeft: 8, flexShrink: 0 }} />}
      <Box textAlign="center" flex={1} sx={{ color: 'white', px: 2 }}>
        <Typography sx={{ fontStyle: 'italic', fontSize: '18px', opacity: 0.9, fontFamily: '"Poppins",sans-serif' }}>Republic of the Philippines</Typography>
        <Typography sx={{ fontWeight: 900, fontSize: '22px', lineHeight: 1.4, fontFamily: '"Poppins",sans-serif', letterSpacing: '0.02em', mt: 0.5 }}>{institutionName}</Typography>
        <Typography sx={{ fontSize: '17px', opacity: 0.85, fontFamily: '"Poppins",sans-serif', mt: 0.3 }}>{institutionAddress}</Typography>
      </Box>
      {dynamicHrisLogo ? <img src={dynamicHrisLogo} alt="HRIS Logo" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover' }} /> : <Box sx={{ width: 100, height: 100, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />}
    </Box>
  );

  if (pageLoading || accessLoading) return <PayslipWireframe />;
  if (!accessLoading && hasAccess !== true)
    return <AccessDenied title="Access Denied" message="You do not have permission to access Payslip. Contact your administrator to request access." returnPath="/admin-home" returnButtonText="Return to Home" />;

  // ── Has a month been selected and do we have any data to show? ─────────────
  const hasAnySlipData = threeMonthSlots.some((s) => s.payroll !== null);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Fade in timeout={400}>
      <Box sx={{ py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 }, width: '100vw', maxWidth: '100%', position: 'relative', left: '63%', transform: 'translateX(-61%)', px: { xs: 2, sm: 3, md: 6 } }}>
        <style>{shimmerKf}</style>

        {/* ── Page Header ── */}
        <SectionCard sx={{ mb: 2, overflow: 'hidden' }}>
          <Box sx={{ px: 4, py: 3, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)' }} />
            <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)' }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
              <WorkIcon sx={{ fontSize: 32, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3 }}>Employee Payslip</Typography>
                <Typography sx={{ fontSize: '0.82rem', color: T.accentMid, fontWeight: 700, opacity: 0.9 }}>Employee Portal • View and download your payslip records</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
              <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                <Typography sx={{ fontSize: '0.8rem', color: T.accent, fontWeight: 700 }}>
                  {myPayrollRows.length} {myPayrollRows.length === 1 ? 'record' : 'records'}
                </Typography>
              </Box>
              <Tooltip title="Refresh Data">
                <IconButton
                  onClick={() => fetchPayrollData()}
                  size="small"
                  sx={{ bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, color: T.accent, width: 34, height: 34, '&:hover': { bgcolor: alpha(T.accent, 0.15) } }}
                >
                  <Refresh sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </SectionCard>

        {/* ── Alerts ── */}
        <Collapse in={alertState.open}>
          <Alert severity={alertState.severity} onClose={() => setAlertState((a) => ({ ...a, open: false }))} sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.82rem' }}>{alertState.message}</Alert>
        </Collapse>
        {error && <Collapse in={!!error}><Alert severity="error" sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.82rem' }}>{error}</Alert></Collapse>}

        {/* ── Two-column layout ── */}
        <Grid container spacing={2}>

          {/* LEFT: Period selector panel */}
          <Grid item xs={12} lg={3}>
            <SectionCard sx={{ height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ px: 3.5, py: 1.25, borderBottom: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: T.accentFaint }}>
                <CalendarToday sx={{ fontSize: 15, color: T.accent }} />
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.accent }}>Pay Period</Typography>
              </Box>

              <Box sx={{ px: 3.5, py: 3, flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 } }}>

                {/* Employee (read-only) */}
                <FormSectionLabel icon={Person}>Employee</FormSectionLabel>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1.1, mb: 2.5, borderRadius: '8px', border: `1px dashed ${T.accentBorder}`, bgcolor: alpha(T.accent, 0.03), cursor: 'not-allowed', userSelect: 'none' }}>
                  <Person sx={{ fontSize: 14, color: alpha(T.accent, 0.4), flexShrink: 0 }} />
                  <Typography sx={{ fontSize: '0.82rem', color: T.muted, fontWeight: 600, flex: 1 }}>{personID || '—'}</Typography>
                  <Box sx={{ px: 0.75, py: 0.2, borderRadius: '4px', bgcolor: alpha(T.accent, 0.08), border: `1px solid ${alpha(T.accent, 0.15)}` }}>
                    <Typography sx={{ fontSize: '0.58rem', color: T.accent, fontWeight: 700, letterSpacing: '0.05em' }}>AUTO</Typography>
                  </Box>
                </Box>

                {/* Year */}
                <FormSectionLabel icon={CalendarToday}>Year</FormSectionLabel>
                <Box sx={{ mb: 2.5 }}>
                  <FieldInput
                    fullWidth
                    size="small"
                    select
                    value={selectedYear}
                    onChange={(e) => handleYearChange(Number(e.target.value))}
                    sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.82rem' } }}
                  >
                    {years.map((y) => (
                      <MenuItem key={y} value={y} sx={{ fontSize: '0.82rem' }}>{y}</MenuItem>
                    ))}
                  </FieldInput>
                </Box>

                {/* Month grid */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <CalendarToday sx={{ fontSize: 12, color: alpha(T.accent, 0.45) }} />
                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: alpha(T.accent, 0.45) }}>Month</Typography>
                  </Box>
                  {!!selectedMonth && (
                    <Box
                      onClick={() => setSelectedMonth('')}
                      sx={{ fontSize: '0.65rem', color: T.accent, cursor: 'pointer', fontWeight: 700, '&:hover': { textDecoration: 'underline' } }}
                    >
                      Clear
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', mb: 1.25 }}>
                  {MONTHS.map((m) => (
                    <Box
                      key={m}
                      onClick={() => setSelectedMonth(m === selectedMonth ? '' : m)}
                      sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        minHeight: 42, px: 1, py: 0.65, borderRadius: '6px', cursor: 'pointer',
                        border: `1px solid ${selectedMonth === m ? T.accent : 'transparent'}`,
                        bgcolor: selectedMonth === m ? T.accent : 'transparent',
                        transition: 'all 0.14s ease',
                        '&:hover': selectedMonth === m ? {} : { bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` },
                      }}
                    >
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: selectedMonth === m ? 700 : 600, color: selectedMonth === m ? '#fff' : T.text, lineHeight: 1, letterSpacing: '0.03em', textAlign: 'center', width: '100%' }}>
                        {m}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: alpha(T.accent, 0.6), mb: 0.5 }}>
                    Total Records
                  </Typography>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: T.text, lineHeight: 1.3 }}>
                    {selectedMonth ? filteredPayrollCount : 0} {(selectedMonth ? filteredPayrollCount : 0) === 1 ? 'record' : 'records'} found
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: T.muted, mt: 0.4 }}>
                    Counts loaded payroll entries for the selected month and year.
                  </Typography>
                </Box>
              </Box>
            </SectionCard>
          </Grid>

          {/* RIGHT: 3-month payslip preview panel */}
          <Grid item xs={12} lg={9}>
            <SectionCard sx={{ height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>

              {/* Toolbar */}
              <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <WorkIcon sx={{ fontSize: 15, color: T.accent }} />
                    <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: T.text }}>
                      {selectedMonth ? `3-Month Payslip View — ${selectedMonth} ${selectedYear} & prior 2 months` : 'Payslip Preview'}
                    </Typography>
                    {selectedMonth && (
                      <Box sx={{ px: 1, py: 0.2, borderRadius: '5px', bgcolor: alpha(T.accent, 0.1), border: `1px solid ${T.accentBorder}` }}>
                        <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: T.accent }}>
                          {threeMonthSlots.filter((s) => s.payroll).length} / 3 records
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  {hasAnySlipData && (
                    <AccentButton
                      variant="contained"
                      size="small"
                      startIcon={<Download sx={{ fontSize: '13px !important' }} />}
                      onClick={downloadPDF}
                      sx={{ fontSize: '0.78rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 8px ${alpha(T.accent, 0.3)}`, '&:hover': { bgcolor: T.accentDark } }}
                    >
                      Download PDF
                    </AccentButton>
                  )}
                </Box>
              </Box>

              {/* Content */}
              <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'auto', '&::-webkit-scrollbar': { width: 6, height: 6 }, '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 } }}>

                {!selectedMonth ? (
                  /* ── No month selected ── */
                  <Box sx={{ py: 10, textAlign: 'center' }}>
                    <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                      <CalendarToday sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                    </Box>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>Select a Month</Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>Choose a month from the left panel to view your 3-month payslip.</Typography>
                  </Box>
                ) : (
                  /* ── 3-month side-by-side layout (mirrors the PDF) ── */
                  <Fade in timeout={250}>
                    <Box sx={{
                      bgcolor: '#e8e0e0',
                      p: 2,
                      minHeight: '100%',
                      // horizontal flex row of 3 slips
                      display: 'flex',
                      flexDirection: 'row',
                      gap: 1.5,
                      alignItems: 'flex-start',
                      justifyContent: 'center',
                      // allow horizontal scroll on very small viewports
                      minWidth: 'max-content',
                      width: '100%',
                    }}>
                      {threeMonthSlots.map((slot, idx) => (
                        <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, flexShrink: 0 }}>
                          {/* Month label badge above each slip */}
                          <Box sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75,
                            px: 1.5, py: 0.5, borderRadius: '6px',
                            bgcolor: idx === 0 ? T.accent : alpha(T.accent, 0.12),
                            border: `1px solid ${idx === 0 ? T.accent : T.accentBorder}`,
                            alignSelf: 'flex-start',
                          }}>
                            <Typography sx={{
                              fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em',
                              color: idx === 0 ? '#fff' : T.accent,
                              textTransform: 'uppercase',
                            }}>
                              {idx === 0 ? '● ' : ''}{slot.label}
                              {idx === 0 ? ' (Selected)' : idx === 1 ? ' — 1 month prior' : ' — 2 months prior'}
                            </Typography>
                          </Box>

                          {/* The payslip paper or no-data placeholder */}
                          <Paper
                            elevation={idx === 0 ? 4 : 2}
                            sx={{
                              zoom: 0.38,
                              width: '920px',
                              p: 1.5,
                              borderRadius: '8px',
                              bgcolor: '#fff',
                              fontFamily: '"Poppins",sans-serif',
                              position: 'relative',
                              boxSizing: 'border-box',
                              border: idx === 0 ? `2px solid ${T.accent}` : '2px solid transparent',
                              transition: 'box-shadow 0.2s ease',
                            }}
                          >
                            {slot.payroll ? (
                              <>
                                {dynamicHrisLogo && (
                                  <Box component="img" src={dynamicHrisLogo} alt="Watermark" sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.08, width: '70%', pointerEvents: 'none', userSelect: 'none', zIndex: 2, mixBlendMode: 'multiply' }} />
                                )}
                                <PayslipInstitutionHeader />
                                <Box sx={{ position: 'relative', zIndex: 1 }}>
                                  {renderPayslipPreview(slot.payroll)}
                                </Box>
                              </>
                            ) : (
                              <NoDataSlip label={slot.label} />
                            )}
                          </Paper>
                        </Box>
                      ))}
                    </Box>
                  </Fade>
                )}
              </Box>

              {/* Footer info bar */}
              {hasAnySlipData && (
                <Box sx={{ px: 3.5, py: 1.25, borderTop: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Download sx={{ fontSize: 13, color: alpha(T.accent, 0.45) }} />
                  <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>
                    Showing {selectedMonth} {selectedYear} and the 2 prior months side-by-side — exactly as they appear in the downloaded PDF.
                  </Typography>
                </Box>
              )}
            </SectionCard>
          </Grid>
        </Grid>

        {/* ── Error modal ── */}
        {modal.open && modal.type === 'error' && (
          <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.35)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setModal({ ...modal, open: false })}>
            <Box sx={{ bgcolor: '#fff', borderRadius: 3, p: 4, maxWidth: 380, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
              <Typography sx={{ fontWeight: 700, mb: 1.5, color: T.accent }}>Error</Typography>
              <Typography sx={{ fontSize: '0.88rem', color: T.muted }}>{modal.message || 'An error occurred.'}</Typography>
              <AccentButton onClick={() => setModal({ ...modal, open: false })} sx={{ mt: 2.5, border: `1px solid ${T.accentBorder}`, color: T.accent }}>Close</AccentButton>
            </Box>
          </Box>
        )}

        <LoadingOverlay
          open={loading || pdfBusy}
          message={pdfBusy ? 'Generating PDF…' : 'Loading payroll…'}
        />
        <SuccessfulOverlay
          open={successOpen}
          action="download"
          onClose={() => setSuccessOpen(false)}
        />

        <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2, fontSize: '0.82rem' }}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </Fade>
  );
});

export default Payslip;