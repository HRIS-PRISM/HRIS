import API_BASE_URL from '../../apiConfig';
import React, { useRef, forwardRef, useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  TextField,
  Select,
  MenuItem,
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
  InputAdornment,
  Alert,
} from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import Search from '@mui/icons-material/Search';
import Refresh from '@mui/icons-material/Refresh';
import Send from '@mui/icons-material/Send';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import usePayrollRealtimeRefresh from '../../hooks/usePayrollRealtimeRefresh';

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '109, 35, 35';
};

const GlassCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  backdropFilter: 'blur(10px)',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': { transform: 'translateY(-4px)' },
}));

const ProfessionalButton = styled(Button)(({ theme, variant, color = 'primary' }) => ({
  borderRadius: 12,
  fontWeight: 600,
  padding: '12px 24px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  textTransform: 'none',
  fontSize: '0.95rem',
  letterSpacing: '0.025em',
  boxShadow: variant === 'contained' ? '0 4px 14px rgba(254, 249, 225, 0.25)' : 'none',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: variant === 'contained' ? '0 6px 20px rgba(254, 249, 225, 0.35)' : 'none',
  },
  '&:active': { transform: 'translateY(0)' },
}));

const ModernTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    '&:hover': { transform: 'translateY(-1px)', backgroundColor: 'rgba(255, 255, 255, 0.95)' },
    '&.Mui-focused': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 20px rgba(254, 249, 225, 0.25)',
      backgroundColor: 'rgba(255, 255, 255, 1)',
    },
  },
  '& .MuiInputLabel-root': { fontWeight: 500 },
}));

const PremiumTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: 16,
  overflow: 'hidden',
  boxShadow: '0 4px 24px rgba(109, 35, 35, 0.06)',
  border: '1px solid rgba(109, 35, 35, 0.08)',
}));

const PremiumTableCell = styled(TableCell)(({ theme, isHeader = false }) => ({
  fontWeight: isHeader ? 600 : 500,
  padding: '18px 20px',
  borderBottom: isHeader ? '2px solid rgba(254, 249, 225, 0.5)' : '1px solid rgba(109, 35, 35, 0.06)',
  fontSize: '0.95rem',
  letterSpacing: '0.025em',
}));

const PayslipDistribution = forwardRef(({ employee }, ref) => {
  const payslipRef = ref || useRef();

  const [allPayroll, setAllPayroll] = useState([]);
  const [displayEmployee, setDisplayEmployee] = useState(employee || null);
  const [loading, setLoading] = useState(!employee);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [successOverlay, setSuccessOverlay] = useState({ open: false, action: '' });
  const [modal, setModal] = useState({ open: false, type: 'error', message: '' });

  const { settings } = useSystemSettings();

  // Colors from system settings
  const primaryColor       = settings.accentColor       || '#FEF9E1';
  const secondaryColor     = settings.backgroundColor   || '#FFF8E7';
  const accentColor        = settings.primaryColor      || '#6d2323';
  const accentDark         = settings.secondaryColor    || '#8B3333';
  const textPrimaryColor   = settings.textPrimaryColor  || '#6d2323';
  const textSecondaryColor = settings.textSecondaryColor|| '#FEF9E1';
  const hoverColor         = settings.hoverColor        || '#6D2323';

  // ── Dynamic logos — fall back to bundled assets if admin hasn't uploaded yet ──
  const institutionLogo = settings.institutionLogo || '';
  const hrisLogo        = settings.hrisLogo        || '';

  const { hasAccess, loading: accessLoading } = usePageAccess('distribution-payslip');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  };

  const [searchQuery, setSearchQuery]       = useState('');
  const [selectedMonth, setSelectedMonth]   = useState('');
  const [selectedYear, setSelectedYear]     = useState(new Date().getFullYear());
  const [filteredPayroll, setFilteredPayroll] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE_URL}/PayrollReleasedRoute/released-payroll-detailed`,
        getAuthHeaders()
      );
      setAllPayroll(res.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch payroll data. Please try again.');
      setLoading(false);
    }
  };

  usePayrollRealtimeRefresh(() => { if (!employee) fetchPayrollData(); });
  useEffect(() => { if (!employee) fetchPayrollData(); }, [employee]);

  useEffect(() => {
    let result = [...allPayroll];
    if (selectedMonth) {
      const monthIndex = months.indexOf(selectedMonth);
      result = result.filter((emp) => {
        if (!emp.startDate) return false;
        const date = new Date(emp.startDate);
        return date.getMonth() === monthIndex && date.getFullYear() === selectedYear;
      });
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (emp) => emp.name.toLowerCase().includes(q) || emp.employeeNumber.toString().includes(q)
      );
    }
    setFilteredPayroll(result);
    setSelectedEmployees([]);
  }, [selectedMonth, selectedYear, searchQuery, allPayroll]);

  const handleMonthSelect = (month) => { setSelectedMonth(month); setDisplayEmployee(null); };

  const allSelected  = filteredPayroll.length > 0 && selectedEmployees.length === filteredPayroll.length;
  const someSelected = selectedEmployees.length > 0 && selectedEmployees.length < filteredPayroll.length;

  const handleSelectAll = (event) => {
    setSelectedEmployees(event.target.checked ? filteredPayroll.map((emp) => emp.employeeNumber) : []);
  };
  const handleSelectOne = (id) => {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const formatCurrency = (value) => {
    const num = parseFloat(value);
    return !isNaN(num) && num !== 0 ? `₱${num.toLocaleString()}` : '';
  };
  const formatRenderedDays = (value) => {
    const h = Number(value);
    if (!isNaN(h) && h > 0) {
      const d = Math.floor(h / 8), r = h % 8;
      return `${d} days${r > 0 ? ` & ${r} hrs` : ''}`;
    }
    return '';
  };
  const getSurname = (name) => {
    if (!name) return 'EARIST';
    const parts = name.trim().split(' ');
    return parts[parts.length - 1] || 'EARIST';
  };
  const formatPeriod = (startDate) => {
    if (!startDate) return 'Unknown';
    const d = new Date(startDate);
    return `${d.toLocaleString('en-US', { month: 'long' })}_${d.getFullYear()}`;
  };

  const generate3MonthPDF = async (employee) => {
    const overlays = document.querySelectorAll('[class*="overlay"], [class*="backdrop"], [class*="MuiBackdrop"]');
    const savedStyles = [];
    overlays.forEach((el) => {
      savedStyles.push({ el, d: el.style.display, v: el.style.visibility, o: el.style.opacity });
      el.style.display = 'none'; el.style.visibility = 'hidden'; el.style.opacity = '0';
    });

    const currentStart = new Date(employee.startDate);
    const currentMonth = currentStart.getMonth();
    const currentYr    = currentStart.getFullYear();

    const monthsToGet = [0, 1, 2].map((i) => {
      const d = new Date(currentYr, currentMonth - i, 1);
      return { month: d.getMonth(), year: d.getFullYear(),
               label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }) };
    });

    const records = monthsToGet.map(({ month, year, label }) => {
      const payroll = allPayroll.find(
        (p) => p.employeeNumber === employee.employeeNumber &&
               new Date(p.startDate).getMonth() === month &&
               new Date(p.startDate).getFullYear() === year
      );
      return { payroll, label };
    });

    const pdf = new jsPDF('l', 'in', 'a4');
    const cw = 3.5, ch = 7.1, gap = 0.2;
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const yo = (ph - ch) / 2;
    const tw = cw * 3 + gap * 2;
    const positions = [
      (pw - tw) / 2,
      (pw - tw) / 2 + cw + gap,
      (pw - tw) / 2 + (cw + gap) * 2,
    ];

    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:800px;background:#fff;';
    document.body.appendChild(tempContainer);

    for (let i = 0; i < records.length; i++) {
      const { payroll, label } = records[i];
      let imgData;
      if (payroll) {
        setDisplayEmployee(payroll);
        await new Promise((resolve) => requestAnimationFrame(() => resolve()));
        const input = payslipRef.current;
        if (!input) {
          const c = document.createElement('canvas'); c.width = 600; c.height = 1200;
          const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,600,1200);
          imgData = c.toDataURL('image/png');
        } else {
          const clone = input.cloneNode(true);
          clone.style.cssText = 'width:800px;overflow:hidden;box-shadow:none;filter:none;';
          tempContainer.innerHTML = '';
          tempContainer.appendChild(clone);
          const canvas = await html2canvas(clone, {
            scale: 1.0, useCORS: true, logging: false, backgroundColor: '#ffffff',
            removeContainer: false, allowTaint: false, imageTimeout: 0,
            windowWidth: 800, windowHeight: 1200, foreignObjectRendering: false,
            ignoreElements: (el) => {
              const cls = el.className || '';
              return typeof cls === 'string' && (cls.includes('overlay') || cls.includes('backdrop') || cls.includes('MuiBackdrop'));
            },
          });
          imgData = canvas.toDataURL('image/png', 0.85);
        }
      } else {
        const c = document.createElement('canvas'); c.width = 600; c.height = 1200;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0,0,600,1200);
        ctx.fillStyle = '#6D2323'; ctx.font = 'bold 28px Arial'; ctx.textAlign = 'center';
        ctx.fillText('No Data', 300, 500); ctx.font = '20px Arial';
        ctx.fillText(`for ${label}`, 300, 550);
        imgData = c.toDataURL('image/png');
      }
      pdf.addImage(imgData, 'PNG', positions[i], yo, cw, ch);
    }

    document.body.removeChild(tempContainer);
    savedStyles.forEach(({ el, d, v, o }) => {
      el.style.display = d; el.style.visibility = v; el.style.opacity = o;
    });
    return pdf.output('blob');
  };

  const sendSelectedPayslips = async () => {
    if (selectedEmployees.length === 0) return;
    setSending(true);
    setLoadingMessage('Generating payslips and sending via Gmail...');
    try {
      const employees = filteredPayroll.filter((e) => selectedEmployees.includes(e.employeeNumber));
      const batchSize = 3;
      const batches = [];
      for (let i = 0; i < employees.length; i += batchSize) batches.push(employees.slice(i, i + batchSize));

      const formData = new FormData();
      let payslipMeta = [];

      for (let bi = 0; bi < batches.length; bi++) {
        const batch = batches[bi];
        setLoadingMessage(`Processing batch ${bi + 1}/${batches.length}...`);
        const results = await Promise.all(
          batch.map(async (emp) => {
            setLoadingMessage(`Batch ${bi + 1}/${batches.length}: Generating for ${emp.name}...`);
            const pdfBlob = await generate3MonthPDF(emp);
            return { pdfBlob, emp };
          })
        );
        results.forEach(({ pdfBlob, emp }) => {
          formData.append('pdfs', pdfBlob, `${getSurname(emp.name)}_${formatPeriod(emp.startDate)}.pdf`);
          payslipMeta.push({ name: emp.name, employeeNumber: emp.employeeNumber });
        });
      }

      setLoadingMessage('Sending payslips via Gmail...');
      formData.append('payslips', JSON.stringify(payslipMeta));
      await axios.post(`${API_BASE_URL}/SendPayslipRoute/send-bulk`, formData, {
        ...getAuthHeaders(),
        headers: { ...getAuthHeaders().headers, 'Content-Type': 'multipart/form-data' },
      });
      setSending(false);
      setSuccessOverlay({ open: true, action: 'gmail' });
    } catch (err) {
      setSending(false);
      setModal({ open: true, type: 'error', message: 'An error occurred while sending bulk payslips.' });
    }
  };

  if (accessLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress sx={{ color: '#6d2323', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#6d2323' }}>Loading access information...</Typography>
        </Box>
      </Container>
    );
  }
  if (!accessLoading && hasAccess !== true) {
    return (
      <AccessDenied title="Access Denied"
        message="You do not have permission to access Payslip Distribution. Contact your administrator to request access."
        returnPath="/admin-home" returnButtonText="Return to Home" />
    );
  }

const PayslipHeader = () => (
  <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}
    sx={{ background: 'linear-gradient(to right, #6d2323, #a31d1d)', borderRadius: '3px', p: 2 }}>
   <Box>
  {institutionLogo && (
    <img src={institutionLogo} alt="Institution Logo"
      style={{ width: '80px', height: '80px', marginLeft: '15px', borderRadius: '50%', objectFit: 'cover' }} />
  )}
</Box>
    <Box textAlign="center" flex={1} sx={{ color: 'white' }}>
      <Typography variant="h5" sx={{ fontStyle: 'italic', fontSize: '16px' }}>
        Republic of the Philippines
      </Typography>
      <Typography variant="h4" fontWeight="bold" sx={{ fontSize: '18px', lineHeight: 1.3 }}>
        {settings.institutionName || 'EULOGIO "AMANG" RODRIGUEZ INSTITUTE OF SCIENCE AND TECHNOLOGY'}
      </Typography>
      <Typography variant="h6" sx={{ fontSize: '14px' }}>
        Nagtahan, Sampaloc Manila
      </Typography>
    </Box>
  <Box>
  {hrisLogo && (
    <img src={hrisLogo} alt="HRIS Logo"
      style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover' }} />
  )}
</Box>
  </Box>
);
  return (
    <>
      <Box sx={{ py: 4, pt: -10, width: '1200px', mx: 'auto', overflow: 'hidden' }}>
        <Box sx={{ px: 6 }}>

          {/* Header */}
          <Fade in timeout={500}>
            <Box sx={{ mb: 4 }}>
              <GlassCard sx={{
                background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
                boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`,
                border: `1px solid ${alpha(accentColor, 0.1)}`,
              }}>
                <Box sx={{
                  p: 5,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  color: textPrimaryColor, position: 'relative', overflow: 'hidden',
                }}>
                  <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200,
                    background: `radial-gradient(circle, ${alpha(accentColor, 0.1)} 0%, ${alpha(accentColor, 0)} 70%)` }} />
                  <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150,
                    background: `radial-gradient(circle, ${alpha(accentColor, 0.08)} 0%, ${alpha(accentColor, 0)} 70%)` }} />
                  <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ bgcolor: alpha(accentColor, 0.15), mr: 4, width: 64, height: 64,
                        boxShadow: `0 8px 24px ${alpha(accentColor, 0.15)}` }}>
                        <WorkIcon sx={{ color: textPrimaryColor, fontSize: 32 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="h4" component="h1"
                          sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2, color: textPrimaryColor }}>
                          Employee Payslip Distribution
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.8, color: textPrimaryColor }}>
                          Manage and distribute monthly employee payslip records
                        </Typography>
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Chip label="System Generated" size="small"
                        sx={{ bgcolor: 'rgba(109,35,35,0.15)', color: textPrimaryColor, fontWeight: 500 }} />
                      <Tooltip title="Refresh Data">
                        <IconButton onClick={() => window.location.reload()}
                          sx={{ bgcolor: 'rgba(109,35,35,0.1)', '&:hover': { bgcolor: 'rgba(109,35,35,0.2)' },
                            color: textPrimaryColor, width: 48, height: 48 }}>
                          <Refresh />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Box>
              </GlassCard>
            </Box>
          </Fade>

          <Backdrop sx={{ color: primaryColor, zIndex: (theme) => theme.zIndex.drawer + 1 }} open={loading}>
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress color="inherit" size={60} thickness={4} />
              <Typography variant="h6" sx={{ mt: 2, color: primaryColor }}>Fetching payroll records...</Typography>
            </Box>
          </Backdrop>

          {error && <Fade in timeout={300}><Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>{error}</Alert></Fade>}

          {/* Controls */}
          <Fade in timeout={700}>
            <GlassCard sx={{ mb: 4, background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
              border: `1px solid ${alpha(accentColor, 0.1)}` }}>
              <CardContent sx={{ p: 4 }}>
                <Grid container spacing={4}>
                  <Grid item xs={12} md={6}>
                    <ModernTextField fullWidth label="Search by Name or Employee Number"
                      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      InputProps={{ startAdornment: (
                        <InputAdornment position="start"><Search sx={{ color: accentColor }} /></InputAdornment>
                      )}} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <ModernTextField fullWidth select label="Year" value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}>
                      {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                    </ModernTextField>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 3, borderColor: 'rgba(109,35,35,0.1)' }} />
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ color: textPrimaryColor, display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Search sx={{ mr: 2, fontSize: 24 }} /><b>Filter By Month:</b>
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3,1fr)', sm: 'repeat(6,1fr)', md: 'repeat(12,1fr)' }, gap: 1.5 }}>
                    {months.map((month) => (
                      <ProfessionalButton key={month} variant={month === selectedMonth ? 'contained' : 'outlined'}
                        size="small" onClick={() => handleMonthSelect(month)}
                        sx={{ borderColor: accentColor, color: month === selectedMonth ? primaryColor : accentColor,
                          minWidth: 'auto', fontSize: '0.875rem', fontWeight: 500, py: 1,
                          backgroundColor: month === selectedMonth ? accentColor : 'transparent',
                          '&:hover': { backgroundColor: month === selectedMonth ? accentDark : alpha(accentColor, 0.1) } }}>
                        {month}
                      </ProfessionalButton>
                    ))}
                  </Box>
                </Box>
              </CardContent>
            </GlassCard>
          </Fade>

          {/* Employee Table */}
          {selectedMonth && (
            <Fade in timeout={900}>
              <GlassCard sx={{ mb: 4, background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
                border: `1px solid ${alpha(accentColor, 0.1)}` }}>
                <Box sx={{ p: 4, background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  color: accentColor, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.8, mb: 1, textTransform: 'uppercase', letterSpacing: '0.1em', color: accentDark }}>
                      Employee List
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: accentColor }}>
                      {selectedMonth} {selectedYear}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                      <Chip label={`${filteredPayroll.length} Employees`} size="small"
                        sx={{ bgcolor: 'rgba(109,35,35,0.15)', color: textPrimaryColor, fontWeight: 500 }} />
                      <Chip label={`${selectedEmployees.length} Selected`} size="small"
                        sx={{ bgcolor: 'rgba(109,35,35,0.15)', color: textPrimaryColor, fontWeight: 500 }} />
                    </Box>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(109,35,35,0.15)', width: 80, height: 80,
                    fontSize: '2rem', fontWeight: 600, color: textPrimaryColor }}>
                    {selectedMonth.substring(0, 1)}
                  </Avatar>
                </Box>
                <PremiumTableContainer>
                  <Table sx={{ minWidth: 800 }}>
                    <TableHead sx={{ bgcolor: alpha(primaryColor, 0.7) }}>
                      <TableRow>
                        <PremiumTableCell isHeader sx={{ color: accentColor, width: '80px' }}>
                          <Checkbox checked={allSelected} indeterminate={someSelected}
                            onChange={handleSelectAll} sx={{ color: accentColor }} />
                        </PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: accentColor }}>Name</PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: accentColor }}>Employee Number</PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: accentColor }}>Payslip Status</PremiumTableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredPayroll.length > 0 ? filteredPayroll.map((emp) => (
                        <TableRow key={emp.employeeNumber}
                          sx={{ '&:nth-of-type(even)': { bgcolor: alpha(primaryColor, 0.3) },
                            '&:hover': { bgcolor: alpha(accentColor, 0.05) }, transition: 'all 0.2s ease' }}>
                          <PremiumTableCell>
                            <Checkbox checked={selectedEmployees.includes(emp.employeeNumber)}
                              onChange={() => handleSelectOne(emp.employeeNumber)} sx={{ color: accentColor }} />
                          </PremiumTableCell>
                          <PremiumTableCell>{emp.name}</PremiumTableCell>
                          <PremiumTableCell>{emp.employeeNumber}</PremiumTableCell>
                          <PremiumTableCell>
                            {emp.startDate
                              ? <Chip label="Available" size="small" sx={{ bgcolor: 'rgba(76,175,80,0.15)', color: '#2e7d32', fontWeight: 500 }} />
                              : <Chip label="No Data" size="small" sx={{ bgcolor: 'rgba(244,67,54,0.15)', color: '#c62828', fontWeight: 500 }} />
                            }
                          </PremiumTableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                            <Avatar sx={{ bgcolor: 'rgba(109,35,35,0.15)', mx: 'auto', mb: 2, width: 80, height: 80, color: textPrimaryColor }}>
                              <Search sx={{ fontSize: 40 }} />
                            </Avatar>
                            <Typography variant="h5" color={accentColor} gutterBottom sx={{ fontWeight: 600 }}>No Employee Data Found</Typography>
                            <Typography variant="body1" color={accentDark}>Try adjusting your search filters or selecting a different month/year</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </PremiumTableContainer>
              </GlassCard>
            </Fade>
          )}

          {/* Send Button */}
          {selectedMonth && filteredPayroll.length > 0 && (
            <Fade in timeout={1100}>
              <GlassCard sx={{ background: `rgba(${hexToRgb(primaryColor)}, 0.95)`, border: `1px solid ${alpha(accentColor, 0.1)}` }}>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: alpha(primaryColor, 0.8), color: textPrimaryColor }}><Send /></Avatar>
                      <Typography variant="body2" sx={{ color: accentDark }}>Send payslips to selected employees via Gmail</Typography>
                    </Box>
                  }
                  sx={{ bgcolor: alpha(primaryColor, 0.5), pb: 2, borderBottom: '1px solid rgba(109,35,35,0.1)' }}
                />
                <CardContent sx={{ p: 4 }}>
                  <ProfessionalButton variant="contained" fullWidth startIcon={<Send />}
                    onClick={sendSelectedPayslips} disabled={sending || selectedEmployees.length === 0}
                    sx={{ py: 2, bgcolor: accentColor, color: primaryColor, fontSize: '1rem',
                      '&:hover': { bgcolor: accentDark } }}>
                    Distribute Monthly Payslips
                  </ProfessionalButton>
                </CardContent>
              </GlassCard>
            </Fade>
          )}

          {/* Hidden payslip renderer — uses dynamic logos */}
          {displayEmployee && (
            <Paper ref={payslipRef} elevation={6}
              sx={{ p: 5, position: 'absolute', top: '-9999px', left: '-9999px',
                borderRadius: 1, backgroundColor: '#fff', fontFamily: '"Poppins", sans-serif',
                overflow: 'hidden', width: '100%', maxWidth: '100%', margin: '0 auto',
                fontSize: '1rem', boxSizing: 'border-box' }}>

              {/* Watermark — dynamic hrisLogo */}
              <Box component="img" src={hrisLogo} alt="Watermark"
                sx={{ position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)', opacity: 0.07, width: '100%',
                  pointerEvents: 'none', userSelect: 'none' }} />

              {/* Header with dynamic logos */}
              <PayslipHeader />

              {/* Payslip body */}
              {(() => {
                const isJO = (displayEmployee.employmentCategory ?? -1) === 0;
                if (isJO) return (
                  <>
                    <Box sx={{ border: '1px solid black', borderRadius: '3px', mb: 3 }}>
                      <Box sx={{ backgroundColor: '#6D2323', color: 'white', p: 2, textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>EMPLOYEE INFORMATION</Box>
                      <Box sx={{ p: 3 }}>
                        <Grid container spacing={2}>
                          {[
                            { label: 'EMPLOYEE NUMBER:', value: displayEmployee.employeeNumber ? `${parseFloat(displayEmployee.employeeNumber)}` : '', red: true },
                            { label: 'NAME:', value: displayEmployee.name || '', red: true },
                            { label: 'PERIOD:', value: (() => {
                              if (!displayEmployee.startDate || !displayEmployee.endDate) return '—';
                              const s = new Date(displayEmployee.startDate), e = new Date(displayEmployee.endDate);
                              return `${s.toLocaleString('en-US',{month:'long'}).toUpperCase()} ${s.getDate()}-${e.getDate()} ${e.getFullYear()}`;
                            })() },
                            { label: 'RENDERED DAYS:', value: formatRenderedDays(displayEmployee.rh) },
                          ].map(({ label, value, red }) => (
                            <Grid item xs={12} md={6} key={label}>
                              <Typography sx={{ fontSize: '16px', fontWeight: 'bold', mb: 1, color: accentColor }}>{label}</Typography>
                              <Typography sx={{ fontSize: '16px', color: red ? 'red' : 'inherit', fontWeight: red ? 'bold' : 'normal' }}>{value}</Typography>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    </Box>
                    <Box sx={{ border: '1px solid black', borderRadius: '3px', mb: 3 }}>
                      <Box sx={{ backgroundColor: '#6D2323', color: 'white', p: 2, textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>SALARY DETAILS</Box>
                      <Box sx={{ p: 3 }}>
                        <Grid container spacing={3}>
                          <Grid item xs={12}>
                            <Typography sx={{ fontSize: '16px', fontWeight: 'bold', mb: 1, color: accentColor }}>GROSS SALARY:</Typography>
                            <Typography sx={{ fontSize: '16px' }}>{formatCurrency(displayEmployee.grossSalary)}</Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography sx={{ fontSize: '16px', fontWeight: 'bold', mb: 2, color: accentColor }}>TOTAL DEDUCTIONS:</Typography>
                            <Box sx={{ pl: 2, mb: 2 }}>
                              {[['SSS:', displayEmployee.sss], ['PAGIBIG:', displayEmployee.pagibigFundCont]].map(([lbl, val]) => (
                                <Box key={lbl} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                                  <Typography sx={{ fontWeight: 600 }}>{lbl}</Typography>
                                  <Typography>{formatCurrency(val)}</Typography>
                                </Box>
                              ))}
                            </Box>
                            <Typography sx={{ fontSize: '16px', fontWeight: 'bold' }}>{formatCurrency(displayEmployee.totalDeductions)}</Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Box sx={{ border: '1px solid #6d2323', borderRadius: 3, p: 2, textAlign: 'center', background: 'rgba(109,35,35,0.05)' }}>
                              <Typography sx={{ fontSize: '18px', fontWeight: 'bold', mb: 1, color: accentColor }}>NET AMOUNT:</Typography>
                              <Typography sx={{ fontSize: '20px', fontWeight: 'bold', color: '#6d2323' }}>{formatCurrency(displayEmployee.netSalary)}</Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>
                    </Box>
                    <Box textAlign="center" mt={4} p={3}>
                      <Typography sx={{ fontSize: '16px', fontWeight: 'bold', mb: 2 }}>Certified Correct:</Typography>
                      <Typography sx={{ fontSize: '18px', fontWeight: 'bold', mb: 1 }}>GIOVANNI L. AHUNIN</Typography>
                      <Typography sx={{ fontSize: '14px' }}>Director, Administrative Services</Typography>
                    </Box>
                  </>
                );

                // Regular employee
                const deductions = [
                  { label: 'Withholding Tax',  value: displayEmployee.withholdingTax },
                  { label: 'Life & Retirement', value: displayEmployee.personalLifeRetIns },
                  { label: 'GSIS Salary Loan', value: displayEmployee.gsisSalaryLoan },
                  { label: 'Policy Loan',       value: displayEmployee.gsisPolicyLoan },
                  { label: 'Housing Loan',      value: displayEmployee.gsisHousingLoan },
                  { label: 'GSIS Arrears',      value: displayEmployee.gsisArrears },
                  { label: 'GFAL',              value: displayEmployee.gfal },
                  { label: 'CPL',               value: displayEmployee.cpl },
                  { label: 'MPL',               value: displayEmployee.mpl },
                  { label: 'MPL Lite',          value: displayEmployee.mplLite },
                  { label: 'ELA',               value: displayEmployee.ela },
                  { label: 'SSS',               value: displayEmployee.sss },
                  { label: 'Pag-IBIG',          value: displayEmployee.pagibigFundCont },
                  { label: 'PhilHealth',        value: displayEmployee.PhilHealthContribution },
                  { label: 'PhilHealth Diff',   value: displayEmployee.philhealthDiff },
                  { label: 'Pag-IBIG 2',        value: displayEmployee.pagibig2 },
                  { label: 'LBP Loan',          value: displayEmployee.lbpLoan },
                  { label: 'MTSLAI',            value: displayEmployee.mtslai },
                  { label: 'ECC',               value: displayEmployee.ecc },
                  { label: 'To Be Refunded',    value: displayEmployee.toBeRefunded },
                  { label: 'FEU',               value: displayEmployee.feu },
                  { label: 'ESLAI',             value: displayEmployee.eslai },
                  { label: 'ABS',               value: displayEmployee.abs },
                ];
                return (
                  <>
                    <Box sx={{ border: '1px solid black', borderRadius: '3px', mb: 3 }}>
                      <Box sx={{ backgroundColor: '#6D2323', color: 'white', p: 2, textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>EMPLOYEE INFORMATION</Box>
                      <Box sx={{ p: 3 }}>
                        <Grid container spacing={2}>
                          {[
                            { label: 'PERIOD:', value: (() => {
                              if (!displayEmployee.startDate || !displayEmployee.endDate) return '—';
                              const s = new Date(displayEmployee.startDate), e = new Date(displayEmployee.endDate);
                              return `${s.toLocaleString('en-US',{month:'long'}).toUpperCase()} ${s.getDate()}-${e.getDate()} ${e.getFullYear()}`;
                            })() },
                            { label: 'EMPLOYEE NUMBER:', value: displayEmployee.employeeNumber ? `${parseFloat(displayEmployee.employeeNumber)}` : '', red: true },
                            { label: 'NAME:', value: displayEmployee.name || '', red: true },
                          ].map(({ label, value, red }) => (
                            <Grid item xs={12} md={6} key={label}>
                              <Typography sx={{ fontSize: '16px', fontWeight: 'bold', mb: 1, color: accentColor }}>{label}</Typography>
                              <Typography sx={{ fontSize: '16px', color: red ? 'red' : 'inherit', fontWeight: red ? 'bold' : 'normal' }}>{value}</Typography>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    </Box>
                    <Box sx={{ border: '1px solid black', borderRadius: '3px', mb: 3 }}>
                      <Box sx={{ backgroundColor: '#6D2323', color: 'white', p: 2, textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>SALARY DETAILS</Box>
                      <Box sx={{ p: 3 }}>
                        <Grid container spacing={3}>
                          {[
                            { label: 'GROSS SALARY:', value: formatCurrency(displayEmployee.grossSalary) },
                            { label: 'TOTAL DEDUCTIONS:', value: formatCurrency(displayEmployee.totalDeductions) },
                          ].map(({ label, value }) => (
                            <Grid item xs={12} md={4} key={label}>
                              <Typography sx={{ fontSize: '16px', fontWeight: 'bold', mb: 1, color: accentColor }}>{label}</Typography>
                              <Typography sx={{ fontSize: '16px' }}>{value}</Typography>
                            </Grid>
                          ))}
                          <Grid item xs={12} md={4}>
                            <Box sx={{ border: '1px solid #6d2323', borderRadius: 3, p: 2, textAlign: 'center', background: 'rgba(109,35,35,0.05)' }}>
                              <Typography sx={{ fontSize: '18px', fontWeight: 'bold', mb: 1, color: accentColor }}>NET SALARY:</Typography>
                              <Typography sx={{ fontSize: '20px', fontWeight: 'bold', color: '#6d2323' }}>{formatCurrency(displayEmployee.netSalary)}</Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>
                    </Box>
                    <Box sx={{ border: '1px solid black', borderRadius: '3px', mb: 3 }}>
                      <Box sx={{ backgroundColor: '#6D2323', color: 'white', p: 2, textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>DEDUCTIONS BREAKDOWN</Box>
                      <Box sx={{ p: 3 }}>
                        <Grid container spacing={2}>
                          {deductions.map((item, i) => (
                            <Grid item xs={12} sm={6} md={4} key={i}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '1px solid #e0e0e0', pb: 1, mb: 1 }}>
                                <Typography sx={{ fontWeight: 600 }}>{item.label}:</Typography>
                                <Typography>{formatCurrency(item.value)}</Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    </Box>
                    <Box sx={{ border: '1px solid black', borderRadius: '3px', mb: 3 }}>
                      <Box sx={{ backgroundColor: '#6D2323', color: 'white', p: 2, textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>PAYMENT BREAKDOWN</Box>
                      <Box sx={{ p: 3 }}>
                        <Grid container spacing={3}>
                          {[['1st Quincena:', displayEmployee.pay1st], ['2nd Quincena:', displayEmployee.pay2nd]].map(([lbl, val]) => (
                            <Grid item xs={12} md={6} key={lbl}>
                              <Typography sx={{ fontSize: '16px', fontWeight: 'bold', mb: 1, color: accentColor }}>{lbl}</Typography>
                              <Typography sx={{ fontSize: '16px' }}>{formatCurrency(val)}</Typography>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    </Box>
                    <Box textAlign="center" mt={4} p={3}>
                      <Typography sx={{ fontSize: '16px', fontWeight: 'bold', mb: 2 }}>Certified Correct:</Typography>
                      <Typography sx={{ fontSize: '18px', fontWeight: 'bold', mb: 1 }}>GIOVANNI L. AHUNIN</Typography>
                      <Typography sx={{ fontSize: '14px' }}>Director, Administrative Services</Typography>
                    </Box>
                  </>
                );
              })()}
            </Paper>
          )}

          <Dialog open={modal.open} onClose={() => setModal({ ...modal, open: false })}>
            <DialogTitle>
              <SuccessfulOverlay open={modal.open && modal.type === 'success'} action={modal.action}
                onClose={() => setModal({ ...modal, open: false })} />
              {modal.type === 'error' && <div style={{ color: 'red', fontWeight: 'bold' }}>❌ Error</div>}
            </DialogTitle>
            <DialogContent><Typography>{modal.message}</Typography></DialogContent>
            <DialogActions>
              <Button onClick={() => setModal({ ...modal, open: false })} autoFocus>OK</Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>

      {sending && <LoadingOverlay open={sending} message={loadingMessage || 'Processing...'} />}
      {successOverlay.open && (
        <SuccessfulOverlay open={successOverlay.open} action={successOverlay.action}
          onClose={() => setSuccessOverlay({ open: false, action: '' })} showOkButton={true} />
      )}
    </>
  );
});

export default PayslipDistribution;