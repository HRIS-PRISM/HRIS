import API_BASE_URL from '../../apiConfig';
import { jwtDecode } from 'jwt-decode';
import React, { useRef, forwardRef, useState, useEffect } from 'react';
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
  Grid,
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
  LinearProgress,
  Stack,
  Badge,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import Search from '@mui/icons-material/Search';
import LoadingOverlay from '../LoadingOverlay';
import WorkIcon from '@mui/icons-material/Work';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';
import SuccessfulOverlay from '../SuccessfulOverlay';
import { Refresh, Download } from '@mui/icons-material';
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
  padding: '8px 16px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  textTransform: 'none',
  fontSize: '0.85rem',
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

const Payslip = forwardRef(({ employee }, ref) => {
  const payslipRef = ref || useRef();

  const [allPayroll, setAllPayroll] = useState([]);
  const [displayEmployee, setDisplayEmployee] = useState(employee || null);
  const [loading, setLoading] = useState(!employee);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [modal, setModal] = useState({ open: false, type: 'success', message: '' });

  const [search, setSearch] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filteredPayroll, setFilteredPayroll] = useState([]);
  const [personID, setPersonID] = useState('');

  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const { settings } = useSystemSettings();

  const primaryColor      = settings.accentColor       || '#FEF9E1';
  const secondaryColor    = settings.backgroundColor   || '#FFF8E7';
  const accentColor       = settings.primaryColor      || '#6d2323';
  const accentDark        = settings.secondaryColor    || '#8B3333';
  const textPrimaryColor  = settings.textPrimaryColor  || '#6d2323';
  const textSecondaryColor= settings.textSecondaryColor|| '#FEF9E1';
  const hoverColor        = settings.hoverColor        || '#6D2323';

  // ── Logo resolution: prefer settings, fall back to bundled assets ──────────
  const institutionLogo = settings.institutionLogo || '';
  const hrisLogo        = settings.hrisLogo        || '';

  const { hasAccess, loading: accessLoading } = usePageAccess('payslip');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  };

  const fetchPayrollData = async () => {
    if (!personID) return;
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE_URL}/PayrollReleasedRoute/released-payroll-detailed`,
        getAuthHeaders()
      );
      setAllPayroll(res.data);
      setDisplayEmployee(null);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch payroll data. Please try again.');
      setLoading(false);
    }
  };

  usePayrollRealtimeRefresh(() => { if (!employee) fetchPayrollData(); });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try { setPersonID(jwtDecode(token).employeeNumber); } catch {}
    }
  }, []);

  useEffect(() => { if (!employee) fetchPayrollData(); }, [employee, personID]);

  const getSurname = (name) => {
    if (!name) return 'EARIST';
    const parts = name.trim().split(' ');
    return parts[parts.length - 1] || 'EARIST';
  };

  const formatPeriod = (startDate, endDate) => {
    if (!startDate || !endDate) return 'Unknown';
    const start = new Date(startDate);
    return `${start.toLocaleString('en-US', { month: 'long' })}_${start.getFullYear()}`;
  };

  const downloadPDF = async () => {
    if (!displayEmployee) return;
    const currentStart  = new Date(displayEmployee.startDate);
    const currentMonth  = currentStart.getMonth();
    const currentYr     = currentStart.getFullYear();

    const monthsToGet = [0, 1, 2].map((i) => {
      const d = new Date(currentYr, currentMonth - i, 1);
      return { month: d.getMonth(), year: d.getFullYear(),
               label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }) };
    });

    const records = monthsToGet.map(({ month, year, label }) => {
      const payroll = allPayroll.find(
        (p) => p.employeeNumber === displayEmployee.employeeNumber &&
               new Date(p.startDate).getMonth() === month &&
               new Date(p.startDate).getFullYear() === year
      );
      return { payroll, label };
    });

    const pdf = new jsPDF('l', 'mm', 'a4');
    const pageWidth  = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10, gap = 5;
    const payslipWidth  = (pageWidth - 2 * margin - 2 * gap) / 3;
    const payslipHeight = pageHeight - 2 * margin;
    const positions = [margin, margin + payslipWidth + gap, margin + 2 * payslipWidth + 2 * gap];

    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = 'position:absolute;left:-9999px;width:1200px;background:#fff;';
    document.body.appendChild(tempContainer);

    for (let i = 0; i < records.length; i++) {
      const { payroll, label } = records[i];
      let imgData;

      if (payroll) {
        setDisplayEmployee(payroll);
        await new Promise((resolve) => setTimeout(resolve, 300));
        const input = payslipRef.current;
        const clone = input.cloneNode(true);
        clone.style.width = '1200px';
        clone.style.overflow = 'hidden';
        tempContainer.innerHTML = '';
        tempContainer.appendChild(clone);
        const canvas = await html2canvas(clone, { scale: 2, useCORS: true, width: 1200, height: 1700,
          windowWidth: 1200, windowHeight: 1700, logging: false });
        imgData = canvas.toDataURL('image/png');
      } else {
        const placeholderCanvas = document.createElement('canvas');
        placeholderCanvas.width = 1200; placeholderCanvas.height = 1700;
        const ctx = placeholderCanvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1200, 1700);
        ctx.fillStyle = '#6D2323'; ctx.font = 'bold 48px Arial'; ctx.textAlign = 'center';
        ctx.fillText('No Data', 600, 750); ctx.font = '32px Arial';
        ctx.fillText(`for ${label}`, 600, 820);
        imgData = placeholderCanvas.toDataURL('image/png');
      }
      pdf.addImage(imgData, 'PNG', positions[i], margin, payslipWidth, payslipHeight);
    }

    document.body.removeChild(tempContainer);
    pdf.save(`${getSurname(displayEmployee.name)}_${formatPeriod(displayEmployee.startDate, displayEmployee.endDate)}.pdf`);
    setModal({ open: true, type: 'success', action: 'download' });
    setDisplayEmployee(employee);
  };

  const handleSearch = () => {
    if (!search.trim()) return;
    const result = allPayroll.filter(
      (emp) => emp.employeeNumber.toString().includes(search.trim()) ||
               emp.name.toLowerCase().includes(search.trim().toLowerCase())
    );
    setFilteredPayroll(result);
    setDisplayEmployee(result.length > 0 ? result[0] : null);
    setHasSearched(true);
  };

  const clearSearch = () => {
    setSearch(''); setHasSearched(false); setSelectedMonth(null);
    setSelectedYear(new Date().getFullYear()); setFilteredPayroll([]);
    if (employee) setDisplayEmployee(employee);
    else if (allPayroll.length > 0) setDisplayEmployee(allPayroll[0]);
    else setDisplayEmployee(null);
  };

  const handleMonthSelect = (monthIndex) => {
    setSelectedMonth(monthIndex);
    const result = allPayroll.filter((emp) => {
      if (!emp.startDate) return false;
      const d = new Date(emp.startDate);
      return emp.employeeNumber?.toString() === personID.toString() &&
             d.getMonth() === monthIndex && d.getFullYear() === selectedYear;
    });
    setFilteredPayroll(result);
    setDisplayEmployee(result.length > 0 ? result[0] : null);
    setHasSearched(true);
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
    if (selectedMonth !== null) {
      const result = allPayroll.filter((emp) => {
        if (!emp.startDate) return false;
        const d = new Date(emp.startDate);
        return emp.employeeNumber?.toString() === personID.toString() &&
               d.getMonth() === selectedMonth && d.getFullYear() === year;
      });
      setFilteredPayroll(result);
      setDisplayEmployee(result.length > 0 ? result[0] : null);
    }
  };

  const formatCurrency = (value) => {
    const num = parseFloat(value);
    return !isNaN(num) && num !== 0 ? `₱${num.toLocaleString()}` : '';
  };

  const formatRenderedDays = (value) => {
    const totalHours = Number(value);
    if (!isNaN(totalHours) && totalHours > 0) {
      const days = Math.floor(totalHours / 8);
      const hours = totalHours % 8;
      return `${days} days${hours > 0 ? ` & ${hours} hrs` : ''}`;
    }
    return '';
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
        message="You do not have permission to access Payslip. Contact your administrator to request access."
        returnPath="/admin-home" returnButtonText="Return to Home" />
    );
  }
const PayslipHeader = () => (
  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}
    sx={{ background: 'linear-gradient(to right, #6d2323, #a31d1d)', borderRadius: '3px', p: 1 }}>
    
    {/* Institution Logo */}
    <Box sx={{ width: 70, height: 70, minWidth: 70, minHeight: 70, flexShrink: 0, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.6)' }}>
      {institutionLogo && (
        <img src={institutionLogo} alt="Institution Logo"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      )}
    </Box>

    <Box textAlign="center" flex={1} sx={{ color: 'white', px: 1 }}>
      <Typography variant="caption" sx={{ fontStyle: 'italic', fontSize: '10px', lineHeight: 1.2 }}>
        Republic of the Philippines
      </Typography>
      <Typography variant="body1" fontWeight="bold" sx={{ fontSize: '12px', lineHeight: 1.2 }}>
        {settings.institutionName || 'EULOGIO "AMANG" RODRIGUEZ INSTITUTE OF SCIENCE AND TECHNOLOGY'}
      </Typography>
      <Typography variant="caption" sx={{ fontSize: '10px' }}>
        Nagtahan, Sampaloc Manila
      </Typography>
    </Box>

    {/* HRIS Logo */}
    <Box sx={{ width: 70, height: 70, minWidth: 70, minHeight: 70, flexShrink: 0, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.6)' }}>
      {hrisLogo && (
        <img src={hrisLogo} alt="HRIS Logo"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      )}
    </Box>

  </Box>
);

  return (
    <Box sx={{ py: 4, pt: -10, width: '1200px', mx: 'auto', overflow: 'hidden' }}>
      <Fade in timeout={500}>
        <Box sx={{ mb: 3, px: 6 }}>
          <GlassCard sx={{ background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
            boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`,
            border: `1px solid ${alpha(accentColor, 0.1)}`,
            '&:hover': { boxShadow: `0 12px 48px ${alpha(accentColor, 0.15)}` } }}>
            <Box sx={{ p: 3, background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
              color: textPrimaryColor, position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200,
                background: 'radial-gradient(circle, rgba(109,35,35,0.1) 0%, rgba(109,35,35,0) 70%)' }} />
              <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150,
                background: 'radial-gradient(circle, rgba(109,35,35,0.08) 0%, rgba(109,35,35,0) 70%)' }} />
              <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ bgcolor: 'rgba(109,35,35,0.15)', mr: 3, width: 48, height: 48,
                    boxShadow: '0 8px 24px rgba(109,35,35,0.15)' }}>
                    <WorkIcon sx={{ color: accentColor, fontSize: 24 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 0.5, lineHeight: 1.2, color: accentColor }}>
                      Employee Payslip Record
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8, fontWeight: 400, color: accentDark }}>
                      View and download employee payslip
                    </Typography>
                  </Box>
                </Box>
                <Tooltip title="Refresh Data">
                  <IconButton onClick={() => window.location.reload()}
                    sx={{ bgcolor: 'rgba(109,35,35,0.1)', '&:hover': { bgcolor: 'rgba(109,35,35,0.2)' },
                      color: accentColor, width: 40, height: 40 }}>
                    <Refresh sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </GlassCard>
        </Box>
      </Fade>

      <Box sx={{ px: 6 }}>
        <Backdrop sx={{ color: primaryColor, zIndex: (theme) => theme.zIndex.drawer + 1 }} open={loading}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress color="inherit" size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 2, color: primaryColor }}>Initializing Payroll System...</Typography>
            <LinearProgress sx={{ width: 400, mt: 3, height: 8, borderRadius: 4,
              backgroundColor: alpha(accentColor, 0.2) }} />
          </Box>
        </Backdrop>

        {error && (
          <Fade in timeout={400}>
            <Alert severity="error" sx={{ mb: 4, borderRadius: 4, fontSize: '1.1rem',
              '& .MuiAlert-message': { fontWeight: 600 } }}>{error}</Alert>
          </Fade>
        )}

        <Fade in timeout={700}>
          <Box sx={{ mb: 3 }}>
            <GlassCard sx={{ border: `1px solid ${alpha(accentColor, 0.1)}` }}>
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: accentColor }}>
                      Employee Information
                    </Typography>
                    <ModernTextField fullWidth label="Employee Number" value={personID} disabled
                      InputProps={{ startAdornment: (
                        <InputAdornment position="start">
                          <Search sx={{ color: textPrimaryColor, fontSize: 24 }} />
                        </InputAdornment>
                      )}}
                      sx={{ '& .MuiInputBase-input': { fontSize: '1rem', py: 1.5, fontWeight: 500 },
                        '& .MuiInputLabel-root': { fontSize: '0.9rem' } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    {displayEmployee && (
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: accentColor }}>Actions</Typography>
                        <ProfessionalButton variant="contained" fullWidth
                          startIcon={sending ? <CircularProgress size={20} sx={{ color: primaryColor }} /> : <Download sx={{ fontSize: 20 }} />}
                          onClick={downloadPDF} disabled={sending}
                          sx={{ py: 2, backgroundColor: accentColor, color: primaryColor, fontSize: '1rem',
                            '&:hover': { backgroundColor: accentDark } }}>
                          {sending ? 'Processing...' : 'Download PDF Document'}
                        </ProfessionalButton>
                      </Box>
                    )}
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3, borderColor: 'rgba(109,35,35,0.1)' }} />

                <Box>
                  <Box sx={{ mb: 1, display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="subtitle1" sx={{ color: accentColor, fontWeight: 600,
                      display: 'flex', alignItems: 'center', fontSize: '0.95rem' }}>
                      <Search sx={{ mr: 1, fontSize: 20 }} /> Filter By Year &amp; Month:
                    </Typography>
                    <FormControl sx={{ minWidth: 120 }}>
                      <InputLabel sx={{ fontWeight: 600, fontSize: '0.9rem' }}>Year</InputLabel>
                      <Select value={selectedYear} label="Year" onChange={(e) => handleYearChange(e.target.value)}
                        sx={{ backgroundColor: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: accentColor },
                          borderRadius: 2, fontWeight: 600, color: accentColor, height: 40 }}>
                        {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', gap: 0.5,
                    alignItems: 'center', pb: 1,
                    '&::-webkit-scrollbar': { height: '6px' },
                    '&::-webkit-scrollbar-thumb': { backgroundColor: alpha(accentColor, 0.3), borderRadius: '4px' } }}>
                    {months.map((month, index) => {
                      const isSelected = selectedMonth === index;
                      return (
                        <ProfessionalButton key={month} variant={isSelected ? 'contained' : 'outlined'} size="small"
                          onClick={() => handleMonthSelect(index)}
                          sx={{ borderColor: accentColor, backgroundColor: isSelected ? accentColor : 'transparent',
                            color: isSelected ? textSecondaryColor : accentColor, minWidth: '84px', flexShrink: 0,
                            fontSize: '0.75rem', fontWeight: 600, py: 1, px: 1.5,
                            '&:hover': { backgroundColor: isSelected ? accentDark : alpha(accentColor, 0.1), borderWidth: 2 },
                            transition: 'all 0.3s ease',
                            boxShadow: isSelected ? `0 4px 12px ${alpha(accentColor, 0.3)}` : 'none' }}>
                          {month}
                        </ProfessionalButton>
                      );
                    })}
                  </Box>
                </Box>
              </CardContent>
            </GlassCard>
          </Box>
        </Fade>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            {displayEmployee ? (
              <Fade in timeout={900}>
                <GlassCard sx={{ mb: 2, border: `1px solid ${alpha(accentColor, 0.1)}`,
                  height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ p: 2, background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    color: accentColor, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="caption" sx={{ opacity: 0.8, mb: 0.5, textTransform: 'uppercase',
                        letterSpacing: '0.1em', color: accentDark, fontSize: '0.75rem' }}>
                        Employee Payslip Record
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5, color: accentColor, fontSize: '1.25rem' }}>
                        {displayEmployee.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <Chip label={`ID: ${displayEmployee.employeeNumber}`} size="small"
                          sx={{ bgcolor: 'rgba(109,35,35,0.15)', color: accentColor, fontWeight: 500, height: 24, fontSize: '0.75rem' }} />
                        <Chip label={(() => {
                          if (!displayEmployee.startDate || !displayEmployee.endDate) return '—';
                          const start = new Date(displayEmployee.startDate);
                          const end   = new Date(displayEmployee.endDate);
                          return `${start.toLocaleString('en-US',{month:'short'}).toUpperCase()} ${start.getDate()}-${end.getDate()}`;
                        })()} size="small"
                          sx={{ bgcolor: 'rgba(109,35,35,0.15)', color: accentColor, fontWeight: 500, height: 24, fontSize: '0.75rem' }} />
                      </Box>
                    </Box>
                    <Avatar sx={{ bgcolor: 'rgba(109,35,35,0.15)', width: 56, height: 56,
                      fontSize: '1.5rem', fontWeight: 600, color: accentColor }}>
                      {displayEmployee.name ? displayEmployee.name.split(' ').map((n) => n[0]).join('').toUpperCase() : 'E'}
                    </Avatar>
                  </Box>

                  <Paper ref={payslipRef} elevation={6}
                    sx={{ p: 2, mt: 1, borderRadius: 1, backgroundColor: '#fff',
                      fontFamily: '"Poppins", sans-serif', position: 'relative', overflow: 'hidden',
                      width: '100%', maxWidth: '100%', margin: '0 auto', fontSize: '0.85rem', boxSizing: 'border-box' }}>

                    {/* Watermark — uses hrisLogo from systemSettings */}
                    <Box component="img" src={hrisLogo} alt="Watermark"
                      sx={{ position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)', opacity: 0.07, width: '80%',
                        pointerEvents: 'none', userSelect: 'none' }} />

                    {/* Header with dynamic logos */}
                    <PayslipHeader />

                    {(() => {
                      const isJO = (displayEmployee.employmentCategory ?? -1) === 0;

                      if (isJO) {
                        return (
                          <>
                            <Box sx={{ border: '1px solid black', borderRadius: '3px', mb: 1.5 }}>
                              <Box sx={{ backgroundColor: '#6D2323', color: 'white', p: 0.5,
                                textAlign: 'center', fontWeight: 'bold', fontSize: '11px' }}>EMPLOYEE INFORMATION</Box>
                              <Box sx={{ p: 1 }}>
                                <Grid container spacing={1}>
                                  {[
                                    { label: 'EMPLOYEE NUMBER:', value: displayEmployee.employeeNumber ? `${parseFloat(displayEmployee.employeeNumber)}` : '—', red: true },
                                    { label: 'NAME:', value: displayEmployee.name || '—', red: true },
                                    { label: 'PERIOD:', value: (() => {
                                      if (!displayEmployee.startDate || !displayEmployee.endDate) return '—';
                                      const s = new Date(displayEmployee.startDate), e = new Date(displayEmployee.endDate);
                                      return `${s.toLocaleString('en-US',{month:'long'}).toUpperCase()} ${s.getDate()}-${e.getDate()} ${e.getFullYear()}`;
                                    })() },
                                    { label: 'RENDERED DAYS:', value: formatRenderedDays(displayEmployee.rh) || '—' },
                                  ].map(({ label, value, red }) => (
                                    <Grid item xs={12} md={6} key={label}>
                                      <Typography sx={{ fontSize: '10px', fontWeight: 'bold', mb: 0.25, color: accentColor }}>{label}</Typography>
                                      <Typography sx={{ fontSize: '11px', color: red ? 'red' : 'inherit', fontWeight: red ? 'bold' : 'normal' }}>{value}</Typography>
                                    </Grid>
                                  ))}
                                </Grid>
                              </Box>
                            </Box>

                            <Box sx={{ border: '1px solid black', borderRadius: '3px', mb: 1.5 }}>
                              <Box sx={{ backgroundColor: '#6D2323', color: 'white', p: 0.5,
                                textAlign: 'center', fontWeight: 'bold', fontSize: '11px' }}>SALARY DETAILS</Box>
                              <Box sx={{ p: 1 }}>
                                <Grid container spacing={1}>
                                  <Grid item xs={12}>
                                    <Typography sx={{ fontSize: '10px', fontWeight: 'bold', mb: 0.25, color: accentColor }}>GROSS SALARY:</Typography>
                                    <Typography sx={{ fontSize: '11px' }}>{formatCurrency(displayEmployee.grossSalary) || '—'}</Typography>
                                  </Grid>
                                  <Grid item xs={12}>
                                    <Typography sx={{ fontSize: '10px', fontWeight: 'bold', mb: 0.5, color: accentColor }}>TOTAL DEDUCTIONS:</Typography>
                                    <Box sx={{ pl: 1, mb: 0.5 }}>
                                      {[['SSS:', displayEmployee.sss], ['PAGIBIG:', displayEmployee.pagibigFundCont]].map(([lbl, val]) => (
                                        <Box key={lbl} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                                          <Typography sx={{ fontWeight: 600, fontSize: '10px' }}>{lbl}</Typography>
                                          <Typography sx={{ fontSize: '11px' }}>{formatCurrency(val) || '—'}</Typography>
                                        </Box>
                                      ))}
                                    </Box>
                                    <Typography sx={{ fontSize: '11px', fontWeight: 'bold' }}>{formatCurrency(displayEmployee.totalDeductions) || '—'}</Typography>
                                  </Grid>
                                  <Grid item xs={12}>
                                    <Box sx={{ border: '1px solid #6d2323', borderRadius: 2, p: 1,
                                      textAlign: 'center', background: 'rgba(109,35,35,0.05)' }}>
                                      <Typography sx={{ fontSize: '11px', fontWeight: 'bold', mb: 0.25, color: accentColor }}>NET AMOUNT:</Typography>
                                      <Typography sx={{ fontSize: '14px', fontWeight: 'bold', color: '#6d2323' }}>
                                        {formatCurrency(displayEmployee.netSalary) || '—'}
                                      </Typography>
                                    </Box>
                                  </Grid>
                                </Grid>
                              </Box>
                            </Box>

                            <Box textAlign="center" mt={2} p={1}>
                              <Typography sx={{ fontSize: '11px', fontWeight: 'bold', mb: 0.5 }}>Certified Correct:</Typography>
                              <Typography sx={{ fontSize: '12px', fontWeight: 'bold', mb: 0.25 }}>GIOVANNI L. AHUNIN</Typography>
                              <Typography sx={{ fontSize: '10px' }}>Director, Administrative Services</Typography>
                            </Box>
                          </>
                        );
                      }

                      // Regular Employee
                      const allDeductions = [
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
                      ].filter((item) => { const n = parseFloat(item.value); return !isNaN(n) && n !== 0; });

                      return (
                        <>
                          <Box sx={{ border: '1px solid black', borderRadius: '3px', mb: 1.5 }}>
                            <Box sx={{ backgroundColor: '#6D2323', color: 'white', p: 0.5, textAlign: 'center', fontWeight: 'bold', fontSize: '11px' }}>EMPLOYEE INFORMATION</Box>
                            <Box sx={{ p: 1 }}>
                              <Grid container spacing={1}>
                                <Grid item xs={12} md={6}>
                                  <Typography sx={{ fontSize: '10px', fontWeight: 'bold', mb: 0.25, color: accentColor }}>PERIOD:</Typography>
                                  <Typography sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                                    {(() => {
                                      if (!displayEmployee.startDate || !displayEmployee.endDate) return '—';
                                      const s = new Date(displayEmployee.startDate), e = new Date(displayEmployee.endDate);
                                      return `${s.toLocaleString('en-US',{month:'long'}).toUpperCase()} ${s.getDate()}-${e.getDate()} ${e.getFullYear()}`;
                                    })()}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <Typography sx={{ fontSize: '10px', fontWeight: 'bold', mb: 0.25, color: accentColor }}>EMPLOYEE NUMBER:</Typography>
                                  <Typography sx={{ fontSize: '11px', color: 'red', fontWeight: 'bold' }}>
                                    {displayEmployee.employeeNumber ? `${parseFloat(displayEmployee.employeeNumber)}` : '—'}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <Typography sx={{ fontSize: '10px', fontWeight: 'bold', mb: 0.25, color: accentColor }}>NAME:</Typography>
                                  <Typography sx={{ fontSize: '11px', color: 'red', fontWeight: 'bold' }}>{displayEmployee.name || '—'}</Typography>
                                </Grid>
                              </Grid>
                            </Box>
                          </Box>

                          <Box sx={{ border: '1px solid black', borderRadius: '3px', mb: 1.5 }}>
                            <Box sx={{ backgroundColor: '#6D2323', color: 'white', p: 0.5, textAlign: 'center', fontWeight: 'bold', fontSize: '11px' }}>SALARY DETAILS</Box>
                            <Box sx={{ p: 1 }}>
                              <Grid container spacing={1}>
                                {[
                                  { label: 'GROSS SALARY:', value: formatCurrency(displayEmployee.grossSalary) },
                                  { label: 'TOTAL DEDUCTIONS:', value: formatCurrency(displayEmployee.totalDeductions) },
                                ].map(({ label, value }) => (
                                  <Grid item xs={12} md={4} key={label}>
                                    <Typography sx={{ fontSize: '10px', fontWeight: 'bold', mb: 0.25, color: accentColor }}>{label}</Typography>
                                    <Typography sx={{ fontSize: '11px' }}>{value || '—'}</Typography>
                                  </Grid>
                                ))}
                                <Grid item xs={12} md={4}>
                                  <Box sx={{ border: '1px solid #6d2323', borderRadius: 2, p: 1, textAlign: 'center', background: 'rgba(109,35,35,0.05)' }}>
                                    <Typography sx={{ fontSize: '11px', fontWeight: 'bold', mb: 0.25, color: accentColor }}>NET SALARY:</Typography>
                                    <Typography sx={{ fontSize: '14px', fontWeight: 'bold', color: '#6d2323' }}>{formatCurrency(displayEmployee.netSalary) || '—'}</Typography>
                                  </Box>
                                </Grid>
                              </Grid>
                            </Box>
                          </Box>

                          <Box sx={{ border: '1px solid black', borderRadius: '3px', mb: 1.5 }}>
                            <Box sx={{ backgroundColor: '#6D2323', color: 'white', p: 0.5, textAlign: 'center', fontWeight: 'bold', fontSize: '11px' }}>DEDUCTIONS BREAKDOWN</Box>
                            <Box sx={{ p: 1 }}>
                              <Grid container spacing={0.5}>
                                {allDeductions.map((item, index) => (
                                  <Grid item xs={12} sm={6} md={4} key={index}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e0e0e0', pb: 0.25, mb: 0.25 }}>
                                      <Typography sx={{ fontWeight: 600, fontSize: '10px' }}>{item.label}:</Typography>
                                      <Typography sx={{ fontSize: '11px' }}>{formatCurrency(item.value) || '—'}</Typography>
                                    </Box>
                                  </Grid>
                                ))}
                              </Grid>
                            </Box>
                          </Box>

                          <Box sx={{ border: '1px solid black', borderRadius: '3px', mb: 1.5 }}>
                            <Box sx={{ backgroundColor: '#6D2323', color: 'white', p: 0.5, textAlign: 'center', fontWeight: 'bold', fontSize: '11px' }}>PAYMENT BREAKDOWN</Box>
                            <Box sx={{ p: 1 }}>
                              <Grid container spacing={1}>
                                {[['1st Quincena:', displayEmployee.pay1st], ['2nd Quincena:', displayEmployee.pay2nd]].map(([lbl, val]) => (
                                  <Grid item xs={12} md={6} key={lbl}>
                                    <Typography sx={{ fontSize: '10px', fontWeight: 'bold', mb: 0.25, color: accentColor }}>{lbl}</Typography>
                                    <Typography sx={{ fontSize: '11px' }}>{formatCurrency(val)}</Typography>
                                  </Grid>
                                ))}
                              </Grid>
                            </Box>
                          </Box>

                          <Box textAlign="center" mt={2} p={1}>
                            <Typography sx={{ fontSize: '11px', fontWeight: 'bold', mb: 0.5 }}>Certified Correct:</Typography>
                            <Typography sx={{ fontSize: '12px', fontWeight: 'bold', mb: 0.25 }}>GIOVANNI L. AHUNIN</Typography>
                            <Typography sx={{ fontSize: '10px' }}>Director, Administrative Services</Typography>
                          </Box>
                        </>
                      );
                    })()}
                  </Paper>
                </GlassCard>
              </Fade>
            ) : null}
          </Grid>
        </Grid>

        <Dialog open={modal.open} onClose={() => setModal({ ...modal, open: false })}
          PaperProps={{ sx: { borderRadius: 4, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' } }}>
          <SuccessfulOverlay open={modal.open && modal.type === 'success'} action={modal.action}
            onClose={() => setModal({ ...modal, open: false })} />
          {modal.type === 'error' && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Error Occurred</Typography>
              <Typography variant="body1" color="text.secondary">{modal.message || 'An error occurred.'}</Typography>
            </Box>
          )}
        </Dialog>
      </Box>
    </Box>
  );
});

export default Payslip;