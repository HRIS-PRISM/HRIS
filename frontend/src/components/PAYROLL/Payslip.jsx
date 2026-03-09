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
} from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import Refresh from '@mui/icons-material/Refresh';
import Download from '@mui/icons-material/Download';
import Person from '@mui/icons-material/Person';
import CalendarToday from '@mui/icons-material/CalendarToday';
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

// Helper function to convert hex to rgb
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '109, 35, 35';
};

// Professional styled components — same as PayslipOverall
const GlassCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  backdropFilter: 'blur(10px)',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-4px)',
  },
}));

const ProfessionalButton = styled(Button)(({ theme, variant }) => ({
  borderRadius: 12,
  fontWeight: 600,
  padding: '12px 24px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  textTransform: 'none',
  fontSize: '0.95rem',
  letterSpacing: '0.025em',
  boxShadow:
    variant === 'contained' ? '0 4px 14px rgba(254, 249, 225, 0.25)' : 'none',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow:
      variant === 'contained' ? '0 6px 20px rgba(254, 249, 225, 0.35)' : 'none',
  },
  '&:active': {
    transform: 'translateY(0)',
  },
}));

const ModernTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    '&:hover': {
      transform: 'translateY(-1px)',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
    },
    '&.Mui-focused': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 20px rgba(254, 249, 225, 0.25)',
      backgroundColor: 'rgba(255, 255, 255, 1)',
    },
  },
  '& .MuiInputLabel-root': {
    fontWeight: 500,
  },
}));

const Payslip = forwardRef(({ employee }, ref) => {
  const payslipRef = ref || useRef();

  const [allPayroll, setAllPayroll] = useState([]);
  const [displayEmployee, setDisplayEmployee] = useState(employee || null);
  const [loading, setLoading] = useState(!employee);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [modal, setModal] = useState({
    open: false,
    type: 'success',
    message: '',
  });
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [hasSearched, setHasSearched] = useState(false);
  const [personID, setPersonID] = useState('');

  const monthsShort = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const years = Array.from({ length: 2060 - 1990 + 1 }, (_, i) => 1990 + i);

  const { settings } = useSystemSettings();

  // Get colors from system settings — same mapping as PayslipOverall
  const primaryColor = settings.accentColor || '#FEF9E1';
  const secondaryColor = settings.backgroundColor || '#FFF8E7';
  const accentColor = settings.primaryColor || '#6d2323';
  const accentDark = settings.secondaryColor || '#8B3333';
  const institutionLogo = settings.institutionLogo || logo; 
  const dynamicHrisLogo = settings.hrisLogo || hrisLogo;     
  const textPrimaryColor = settings.textPrimaryColor || '#6d2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';
  const hoverColor = settings.hoverColor || '#6D2323';
  const blackColor = '#1a1a1a';
  const whiteColor = '#FFFFFF';
  const grayColor = '#6c757d';


  const { hasAccess, loading: accessLoading } = usePageAccess('payslip');

  const getAuthHeaders = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchPayrollData = async () => {
    if (!personID) return;
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE_URL}/PayrollReleasedRoute/released-payroll-detailed`,
        getAuthHeaders(),
      );
      setAllPayroll(res.data);
      setDisplayEmployee(null);
    } catch (err) {
      console.error('Error fetching payroll:', err);
      setError('Failed to fetch payroll data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  usePayrollRealtimeRefresh(() => {
    if (!employee) fetchPayrollData();
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        setPersonID(jwtDecode(token).employeeNumber);
      } catch (e) {
        console.error('Token decode error:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (!employee) fetchPayrollData();
  }, [employee, personID]);

  // ── Filters ───────────────────────────────────────────────────────────────
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

  // ── Formatters ────────────────────────────────────────────────────────────
  const formatCurrency = (v) => {
    const n = parseFloat(v);
    return !isNaN(n) && n !== 0 ? `₱${n.toLocaleString()}` : '';
  };

  const formatRenderedDays = (v) => {
    const totalHours = Number(v);
    if (!isNaN(totalHours) && totalHours > 0) {
      const days = Math.floor(totalHours / 8);
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
    const month = start.toLocaleString('en-US', { month: 'long' });
    const year = start.getFullYear();
    return `${month}_${year}`;
  };

  // ── PDF Download — same A4 landscape 3-up logic as PayslipOverall ─────────
  const downloadPDF = async () => {
    if (!displayEmployee) return;
    setSending(true);

    const currentStart = new Date(displayEmployee.startDate);
    const currentMonth = currentStart.getMonth();
    const currentYear = currentStart.getFullYear();

    const monthsToGet = [0, 1, 2].map((i) => {
      const d = new Date(currentYear, currentMonth - i, 1);
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
          p.employeeNumber === displayEmployee.employeeNumber &&
          new Date(p.startDate).getMonth() === month &&
          new Date(p.startDate).getFullYear() === year,
      ),
    }));

    // PDF setup with A4 dimensions in mm — identical to PayslipOverall
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 10;
    const gap = 5;
    const payslipWidth = (pageWidth - 2 * margin - 2 * gap) / 3;
    const payslipHeight = pageHeight - 2 * margin;

    const positions = [
      margin,
      margin + payslipWidth + gap,
      margin + 2 * payslipWidth + 2 * gap,
    ];

    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '1200px';
    tempContainer.style.backgroundColor = '#fff';
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

        const canvas = await html2canvas(clone, {
          scale: 2,
          useCORS: true,
          width: 1200,
          height: 1700,
          windowWidth: 1200,
          windowHeight: 1700,
          logging: false,
        });
        imgData = canvas.toDataURL('image/png');
      } else {
        const placeholderCanvas = document.createElement('canvas');
        placeholderCanvas.width = 1200;
        placeholderCanvas.height = 1700;
        const ctx = placeholderCanvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, placeholderCanvas.width, placeholderCanvas.height);
        ctx.fillStyle = '#6D2323';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No Data', placeholderCanvas.width / 2, 750);
        ctx.font = '32px Arial';
        ctx.fillText(`for ${label}`, placeholderCanvas.width / 2, 820);
        imgData = placeholderCanvas.toDataURL('image/png');
      }

      pdf.addImage(
        imgData,
        'PNG',
        positions[i],
        margin,
        payslipWidth,
        payslipHeight,
      );
    }

    document.body.removeChild(tempContainer);

    const surname = getSurname(displayEmployee.name);
    const period = formatPeriod(
      displayEmployee.startDate,
      displayEmployee.endDate,
    );
    const filename = `${surname}_${period}.pdf`;
    pdf.save(filename);

    setDisplayEmployee(employee || null);
    setSending(false);
    setModal({ open: true, type: 'success', action: 'download' });
  };

  // ── Access guards ─────────────────────────────────────────────────────────
  if (accessLoading)
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <CircularProgress sx={{ color: '#6d2323', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#6d2323' }}>
            Loading access information...
          </Typography>
        </Box>
      </Container>
    );

  if (!accessLoading && hasAccess !== true)
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Payslip. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        py: 4,
        pt: -10,
        width: '1200px',
        mx: 'auto',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 6 }}>
        {/* ══ HEADER ══════════════════════════════════════════════════════ */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }}>
            <GlassCard
              sx={{
                background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
                boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`,
                border: `1px solid ${alpha(accentColor, 0.1)}`,
                '&:hover': {
                  boxShadow: `0 12px 48px ${alpha(accentColor, 0.15)}`,
                },
              }}
            >
              <Box
                sx={{
                  p: 5,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  color: textPrimaryColor,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Decorative elements */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: -50,
                    right: -50,
                    width: 200,
                    height: 200,
                    background:
                      'radial-gradient(circle, rgba(109,35,35,0.1) 0%, rgba(109,35,35,0) 70%)',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -30,
                    left: '30%',
                    width: 150,
                    height: 150,
                    background:
                      'radial-gradient(circle, rgba(109,35,35,0.08) 0%, rgba(109,35,35,0) 70%)',
                  }}
                />

                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  position="relative"
                  zIndex={1}
                >
                  <Box display="flex" alignItems="center">
                    <Avatar
                      sx={{
                        bgcolor: 'rgba(109,35,35,0.15)',
                        mr: 4,
                        width: 64,
                        height: 64,
                        boxShadow: '0 8px 24px rgba(109,35,35,0.15)',
                      }}
                    >
                      <WorkIcon sx={{ color: accentColor, fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                          fontWeight: 700,
                          mb: 1,
                          lineHeight: 1.2,
                          color: accentColor,
                        }}
                      >
                        Employee Payslip Record
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          opacity: 0.8,
                          fontWeight: 400,
                          color: accentDark,
                        }}
                      >
                        View and download employee payslip
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Tooltip title="Refresh Data">
                      <IconButton
                        onClick={() => window.location.reload()}
                        sx={{
                          bgcolor: 'rgba(109,35,35,0.1)',
                          '&:hover': { bgcolor: 'rgba(109,35,35,0.2)' },
                          color: accentColor,
                          width: 48,
                          height: 48,
                        }}
                      >
                        <Refresh sx={{ fontSize: 24 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {/* Loading Backdrop */}
        <Backdrop
          sx={{
            color: primaryColor,
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
          open={loading}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress color="inherit" size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 2, color: primaryColor }}>
              Initializing Payroll System...
            </Typography>
            <LinearProgress
              sx={{
                width: 400,
                mt: 3,
                height: 8,
                borderRadius: 4,
                backgroundColor: alpha(accentColor, 0.2),
              }}
            />
          </Box>
        </Backdrop>

        {error && (
          <Fade in timeout={400}>
            <Alert
              severity="error"
              sx={{
                mb: 4,
                borderRadius: 4,
                fontSize: '1.1rem',
                '& .MuiAlert-message': { fontWeight: 600 },
              }}
            >
              {error}
            </Alert>
          </Fade>
        )}

        {/* ══ CONTROLS ════════════════════════════════════════════════════ */}
        <Fade in timeout={700}>
          <GlassCard
            sx={{ mb: 4, border: `1px solid ${alpha(accentColor, 0.1)}` }}
          >
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={4}>
                {/* Employee Number (read-only) */}
                <Grid item xs={12} md={6}>
                  <ModernTextField
                    fullWidth
                    label="Employee Number"
                    value={personID}
                    disabled
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person
                            sx={{ color: textPrimaryColor, fontSize: 24 }}
                          />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiInputBase-input': { fontSize: '1.1rem', py: 2 },
                    }}
                  />
                </Grid>

                {/* Year selector */}
                <Grid item xs={12} md={6}>
                  <ModernTextField
                    fullWidth
                    select
                    label="Filter By Year"
                    value={selectedYear}
                    onChange={(e) => handleYearChange(parseInt(e.target.value))}
                    SelectProps={{ native: true }}
                    sx={{
                      '& .MuiInputBase-input': { fontSize: '1.1rem', py: 2 },
                    }}
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </ModernTextField>
                </Grid>
              </Grid>

              <Divider sx={{ my: 4, borderColor: 'rgba(109,35,35,0.1)' }} />

              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  mb: 3,
                  color: accentColor,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <CalendarToday sx={{ mr: 2, fontSize: 24 }} />
                Select Month
              </Typography>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(3, 1fr)',
                    sm: 'repeat(6, 1fr)',
                    md: 'repeat(12, 1fr)',
                  },
                  gap: 1.5,
                }}
              >
                {monthsShort.map((month, idx) => (
                  <ProfessionalButton
                    key={month}
                    variant={idx === selectedMonth ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => handleMonthSelect(idx)}
                    sx={{
                      borderColor: accentColor,
                      color: idx === selectedMonth ? primaryColor : accentColor,
                      minWidth: 'auto',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      py: 1,
                      backgroundColor:
                        idx === selectedMonth ? accentColor : 'transparent',
                      '&:hover': {
                        backgroundColor:
                          idx === selectedMonth
                            ? accentDark
                            : alpha(accentColor, 0.1),
                      },
                    }}
                  >
                    {month}
                  </ProfessionalButton>
                ))}
              </Box>
            </CardContent>
          </GlassCard>
        </Fade>

        {/* ══ PAYSLIP DISPLAY ═════════════════════════════════════════════ */}
        {displayEmployee ? (
          <Fade in timeout={900}>
            <GlassCard
              sx={{ mb: 4, border: `1px solid ${alpha(accentColor, 0.1)}` }}
            >
              {/* Card header bar */}
              <Box
                sx={{
                  p: 4,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  color: accentColor,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      opacity: 0.8,
                      mb: 1,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: accentDark,
                    }}
                  >
                    Employee Payslip Record
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 600, mb: 1, color: accentColor }}
                  >
                    {displayEmployee.name}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      mt: 2,
                    }}
                  >
                    <Chip
                      icon={<Person sx={{ fontSize: 20 }} />}
                      label={`ID: ${displayEmployee.employeeNumber}`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(109,35,35,0.15)',
                        color: accentColor,
                        fontWeight: 500,
                      }}
                    />
                    <Chip
                      icon={<CalendarToday sx={{ fontSize: 20 }} />}
                      label={(() => {
                        if (
                          !displayEmployee.startDate ||
                          !displayEmployee.endDate
                        )
                          return '—';
                        const start = new Date(displayEmployee.startDate);
                        const end = new Date(displayEmployee.endDate);
                        const month = start
                          .toLocaleString('en-US', { month: 'short' })
                          .toUpperCase();
                        return `${month} ${start.getDate()}-${end.getDate()}`;
                      })()}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(109,35,35,0.15)',
                        color: accentColor,
                        fontWeight: 500,
                      }}
                    />
                  </Box>
                </Box>
                <Avatar
                  sx={{
                    bgcolor: 'rgba(109,35,35,0.15)',
                    width: 80,
                    height: 80,
                    fontSize: '2rem',
                    fontWeight: 600,
                    color: accentColor,
                  }}
                >
                  {displayEmployee.name
                    ? displayEmployee.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                    : 'E'}
                </Avatar>
              </Box>

              {/* Payslip Paper — same ref, same sizing as PayslipOverall */}
              <Paper
                ref={payslipRef}
                elevation={6}
                sx={{
                  p: 5,
                  mt: 3,
                  borderRadius: 1,
                  backgroundColor: '#fff',
                  fontFamily: '"Poppins", sans-serif',
                  position: 'relative',
                  overflow: 'hidden',
                  width: '100%',
                  maxWidth: '100%',
                  margin: '0 auto',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
              >
                {/* Watermark */}
                <Box
                  component="img"
                  src={dynamicHrisLogo}
                  alt="Watermark"
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    opacity: 0.07,
                    width: '100%',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                />

                {/* Payslip Header */}
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  mb={3}
                  sx={{
                    background: 'linear-gradient(to right, #6d2323, #a31d1d)',
                    borderRadius: '3px',
                    p: 2,
                  }}
                >
                  <Box>
                    <img
                      src={institutionLogo}
                      alt="Logo"
                      style={{ width: '80px', marginLeft: '15px' }}
                    />
                  </Box>
                  <Box textAlign="center" flex={1} sx={{ color: 'white' }}>
                    <Typography
                      variant="h5"
                      sx={{ fontStyle: 'italic', fontSize: '16px' }}
                    >
                      Republic of the Philippines
                    </Typography>
                    <Typography
                      variant="h4"
                      fontWeight="bold"
                      sx={{ fontSize: '18px', lineHeight: 1.3 }}
                    >
                      EULOGIO "AMANG" RODRIGUEZ INSTITUTE OF SCIENCE AND
                      TECHNOLOGY
                    </Typography>
                    <Typography variant="h6" sx={{ fontSize: '14px' }}>
                      Nagtahan, Sampaloc Manila
                    </Typography>
                  </Box>
                  <Box>
                    <img
                      src={dynamicHrisLogo}
                      alt="HRIS Logo"
                      style={{ width: '100px' }}
                    />
                  </Box>
                </Box>

                {/* JO vs Regular layout — same as PayslipOverall */}
                {(() => {
                  const isJO = (displayEmployee.employmentCategory ?? -1) === 0;

                  if (isJO) {
                    return (
                      <>
                        {/* Employee Information — JO */}
                        <Box
                          sx={{
                            border: '1px solid black',
                            borderRadius: '3px',
                            mb: 3,
                          }}
                        >
                          <Box
                            sx={{
                              backgroundColor: '#6D2323',
                              color: 'white',
                              p: 2,
                              textAlign: 'center',
                              fontWeight: 'bold',
                              fontSize: '18px',
                            }}
                          >
                            EMPLOYEE INFORMATION
                          </Box>
                          <Box sx={{ p: 3 }}>
                            <Grid container spacing={2}>
                              <Grid item xs={12} md={6}>
                                <Typography
                                  sx={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    mb: 1,
                                    color: accentColor,
                                  }}
                                >
                                  EMPLOYEE NUMBER:
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: '16px',
                                    color: 'red',
                                    fontWeight: 'bold',
                                  }}
                                >
                                  {displayEmployee.employeeNumber
                                    ? `${parseFloat(displayEmployee.employeeNumber)}`
                                    : ''}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <Typography
                                  sx={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    mb: 1,
                                    color: accentColor,
                                  }}
                                >
                                  NAME:
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: '16px',
                                    color: 'red',
                                    fontWeight: 'bold',
                                  }}
                                >
                                  {displayEmployee.name || ''}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <Typography
                                  sx={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    mb: 1,
                                    color: accentColor,
                                  }}
                                >
                                  PERIOD:
                                </Typography>
                                <Typography
                                  sx={{ fontSize: '16px', fontWeight: 'bold' }}
                                >
                                  {(() => {
                                    if (
                                      !displayEmployee.startDate ||
                                      !displayEmployee.endDate
                                    )
                                      return '—';
                                    const start = new Date(
                                      displayEmployee.startDate,
                                    );
                                    const end = new Date(
                                      displayEmployee.endDate,
                                    );
                                    const month = start
                                      .toLocaleString('en-US', {
                                        month: 'long',
                                      })
                                      .toUpperCase();
                                    return `${month} ${start.getDate()}-${end.getDate()} ${end.getFullYear()}`;
                                  })()}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <Typography
                                  sx={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    mb: 1,
                                    color: accentColor,
                                  }}
                                >
                                  RENDERED DAYS:
                                </Typography>
                                <Typography sx={{ fontSize: '16px' }}>
                                  {formatRenderedDays(displayEmployee.rh)}
                                </Typography>
                              </Grid>
                            </Grid>
                          </Box>
                        </Box>

                        {/* Salary Section — JO */}
                        <Box
                          sx={{
                            border: '1px solid black',
                            borderRadius: '3px',
                            mb: 3,
                          }}
                        >
                          <Box
                            sx={{
                              backgroundColor: '#6D2323',
                              color: 'white',
                              p: 2,
                              textAlign: 'center',
                              fontWeight: 'bold',
                              fontSize: '18px',
                            }}
                          >
                            SALARY DETAILS
                          </Box>
                          <Box sx={{ p: 3 }}>
                            <Grid container spacing={3}>
                              <Grid item xs={12}>
                                <Typography
                                  sx={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    mb: 1,
                                    color: accentColor,
                                  }}
                                >
                                  GROSS SALARY:
                                </Typography>
                                <Typography sx={{ fontSize: '16px' }}>
                                  {formatCurrency(displayEmployee.grossSalary)}
                                </Typography>
                              </Grid>
                              <Grid item xs={12}>
                                <Typography
                                  sx={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    mb: 2,
                                    color: accentColor,
                                  }}
                                >
                                  TOTAL DEDUCTIONS:
                                </Typography>
                                <Box sx={{ pl: 2, mb: 2 }}>
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      mb: 1.5,
                                      fontSize: '16px',
                                    }}
                                  >
                                    <Typography sx={{ fontWeight: 600 }}>
                                      SSS:
                                    </Typography>
                                    <Typography>
                                      {formatCurrency(displayEmployee.sss)}
                                    </Typography>
                                  </Box>
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      fontSize: '16px',
                                    }}
                                  >
                                    <Typography sx={{ fontWeight: 600 }}>
                                      PAGIBIG:
                                    </Typography>
                                    <Typography>
                                      {formatCurrency(
                                        displayEmployee.pagibigFundCont,
                                      )}
                                    </Typography>
                                  </Box>
                                </Box>
                                <Typography
                                  sx={{ fontSize: '16px', fontWeight: 'bold' }}
                                >
                                  {formatCurrency(
                                    displayEmployee.totalDeductions,
                                  )}
                                </Typography>
                              </Grid>
                              <Grid item xs={12}>
                                <Box
                                  sx={{
                                    border: '1px solid #6d2323',
                                    borderRadius: 3,
                                    p: 2,
                                    textAlign: 'center',
                                    background: 'rgba(109, 35, 35, 0.05)',
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: '18px',
                                      fontWeight: 'bold',
                                      mb: 1,
                                      color: accentColor,
                                    }}
                                  >
                                    NET AMOUNT:
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontSize: '20px',
                                      fontWeight: 'bold',
                                      color: '#6d2323',
                                    }}
                                  >
                                    {formatCurrency(displayEmployee.netSalary)}
                                  </Typography>
                                </Box>
                              </Grid>
                            </Grid>
                          </Box>
                        </Box>

                        {/* Footer */}
                        <Box textAlign="center" mt={4} p={3}>
                          <Typography
                            sx={{ fontSize: '16px', fontWeight: 'bold', mb: 2 }}
                          >
                            Certified Correct:
                          </Typography>
                          <Typography
                            sx={{ fontSize: '18px', fontWeight: 'bold', mb: 1 }}
                          >
                            GIOVANNI L. AHUNIN
                          </Typography>
                          <Typography sx={{ fontSize: '14px' }}>
                            Director, Administrative Services
                          </Typography>
                        </Box>
                      </>
                    );
                  }

                  // Regular Employee — Full Detailed Layout
                  return (
                    <>
                      {/* Employee Information */}
                      <Box
                        sx={{
                          border: '1px solid black',
                          borderRadius: '3px',
                          mb: 3,
                        }}
                      >
                        <Box
                          sx={{
                            backgroundColor: '#6D2323',
                            color: 'white',
                            p: 2,
                            textAlign: 'center',
                            fontWeight: 'bold',
                            fontSize: '18px',
                          }}
                        >
                          EMPLOYEE INFORMATION
                        </Box>
                        <Box sx={{ p: 3 }}>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <Typography
                                sx={{
                                  fontSize: '16px',
                                  fontWeight: 'bold',
                                  mb: 1,
                                  color: accentColor,
                                }}
                              >
                                PERIOD:
                              </Typography>
                              <Typography
                                sx={{ fontSize: '16px', fontWeight: 'bold' }}
                              >
                                {(() => {
                                  if (
                                    !displayEmployee.startDate ||
                                    !displayEmployee.endDate
                                  )
                                    return '—';
                                  const start = new Date(
                                    displayEmployee.startDate,
                                  );
                                  const end = new Date(displayEmployee.endDate);
                                  const month = start
                                    .toLocaleString('en-US', { month: 'long' })
                                    .toUpperCase();
                                  return `${month} ${start.getDate()}-${end.getDate()} ${end.getFullYear()}`;
                                })()}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Typography
                                sx={{
                                  fontSize: '16px',
                                  fontWeight: 'bold',
                                  mb: 1,
                                  color: accentColor,
                                }}
                              >
                                EMPLOYEE NUMBER:
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: '16px',
                                  color: 'red',
                                  fontWeight: 'bold',
                                }}
                              >
                                {displayEmployee.employeeNumber
                                  ? `${parseFloat(displayEmployee.employeeNumber)}`
                                  : ''}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Typography
                                sx={{
                                  fontSize: '16px',
                                  fontWeight: 'bold',
                                  mb: 1,
                                  color: accentColor,
                                }}
                              >
                                NAME:
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: '16px',
                                  color: 'red',
                                  fontWeight: 'bold',
                                }}
                              >
                                {displayEmployee.name || ''}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Box>
                      </Box>

                      {/* Salary Section */}
                      <Box
                        sx={{
                          border: '1px solid black',
                          borderRadius: '3px',
                          mb: 3,
                        }}
                      >
                        <Box
                          sx={{
                            backgroundColor: '#6D2323',
                            color: 'white',
                            p: 2,
                            textAlign: 'center',
                            fontWeight: 'bold',
                            fontSize: '18px',
                          }}
                        >
                          SALARY DETAILS
                        </Box>
                        <Box sx={{ p: 3 }}>
                          <Grid container spacing={3}>
                            <Grid item xs={12} md={4}>
                              <Typography
                                sx={{
                                  fontSize: '16px',
                                  fontWeight: 'bold',
                                  mb: 1,
                                  color: accentColor,
                                }}
                              >
                                GROSS SALARY:
                              </Typography>
                              <Typography sx={{ fontSize: '16px' }}>
                                {formatCurrency(displayEmployee.grossSalary)}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <Typography
                                sx={{
                                  fontSize: '16px',
                                  fontWeight: 'bold',
                                  mb: 1,
                                  color: accentColor,
                                }}
                              >
                                TOTAL DEDUCTIONS:
                              </Typography>
                              <Typography sx={{ fontSize: '16px' }}>
                                {formatCurrency(
                                  displayEmployee.totalDeductions,
                                )}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <Box
                                sx={{
                                  border: '1px solid #6d2323',
                                  borderRadius: 3,
                                  p: 2,
                                  textAlign: 'center',
                                  background: 'rgba(109, 35, 35, 0.05)',
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    mb: 1,
                                    color: accentColor,
                                  }}
                                >
                                  NET SALARY:
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: '20px',
                                    fontWeight: 'bold',
                                    color: '#6d2323',
                                  }}
                                >
                                  {formatCurrency(displayEmployee.netSalary)}
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>
                      </Box>

                      {/* Deductions Section */}
                      <Box
                        sx={{
                          border: '1px solid black',
                          borderRadius: '3px',
                          mb: 3,
                        }}
                      >
                        <Box
                          sx={{
                            backgroundColor: '#6D2323',
                            color: 'white',
                            p: 2,
                            textAlign: 'center',
                            fontWeight: 'bold',
                            fontSize: '18px',
                          }}
                        >
                          DEDUCTIONS BREAKDOWN
                        </Box>
                        <Box sx={{ p: 3 }}>
                          <Grid container spacing={2}>
                            {[
                              {
                                label: 'Withholding Tax',
                                value: displayEmployee.withholdingTax,
                              },
                              {
                                label: 'Life & Retirement',
                                value: displayEmployee.personalLifeRetIns,
                              },
                              {
                                label: 'GSIS Salary Loan',
                                value: displayEmployee.gsisSalaryLoan,
                              },
                              {
                                label: 'Policy Loan',
                                value: displayEmployee.gsisPolicyLoan,
                              },
                              {
                                label: 'Housing Loan',
                                value: displayEmployee.gsisHousingLoan,
                              },
                              {
                                label: 'GSIS Arrears',
                                value: displayEmployee.gsisArrears,
                              },
                              { label: 'GFAL', value: displayEmployee.gfal },
                              { label: 'CPL', value: displayEmployee.cpl },
                              { label: 'MPL', value: displayEmployee.mpl },
                              {
                                label: 'MPL Lite',
                                value: displayEmployee.mplLite,
                              },
                              { label: 'ELA', value: displayEmployee.ela },
                              { label: 'SSS', value: displayEmployee.sss },
                              {
                                label: 'Pag-IBIG',
                                value: displayEmployee.pagibigFundCont,
                              },
                              {
                                label: 'PhilHealth',
                                value: displayEmployee.PhilHealthContribution,
                              },
                              {
                                label: 'PhilHealth Diff',
                                value: displayEmployee.philhealthDiff,
                              },
                              {
                                label: 'Pag-IBIG 2',
                                value: displayEmployee.pagibig2,
                              },
                              {
                                label: 'LBP Loan',
                                value: displayEmployee.lbpLoan,
                              },
                              {
                                label: 'MTSLAI',
                                value: displayEmployee.mtslai,
                              },
                              { label: 'ECC', value: displayEmployee.ecc },
                              {
                                label: 'To Be Refunded',
                                value: displayEmployee.toBeRefunded,
                              },
                              { label: 'FEU', value: displayEmployee.feu },
                              { label: 'ESLAI', value: displayEmployee.eslai },
                              { label: 'ABS', value: displayEmployee.abs },
                            ].map((item, index) => (
                              <Grid item xs={12} sm={6} md={4} key={index}>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '14px',
                                    borderBottom: '1px solid #e0e0e0',
                                    pb: 1,
                                    mb: 1,
                                  }}
                                >
                                  <Typography sx={{ fontWeight: 600 }}>
                                    {item.label}:
                                  </Typography>
                                  <Typography>
                                    {formatCurrency(item.value)}
                                  </Typography>
                                </Box>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      </Box>

                      {/* Payment Section */}
                      <Box
                        sx={{
                          border: '1px solid black',
                          borderRadius: '3px',
                          mb: 3,
                        }}
                      >
                        <Box
                          sx={{
                            backgroundColor: '#6D2323',
                            color: 'white',
                            p: 2,
                            textAlign: 'center',
                            fontWeight: 'bold',
                            fontSize: '18px',
                          }}
                        >
                          PAYMENT BREAKDOWN
                        </Box>
                        <Box sx={{ p: 3 }}>
                          <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                              <Typography
                                sx={{
                                  fontSize: '16px',
                                  fontWeight: 'bold',
                                  mb: 1,
                                  color: accentColor,
                                }}
                              >
                                1st Quincena:
                              </Typography>
                              <Typography sx={{ fontSize: '16px' }}>
                                {formatCurrency(displayEmployee.pay1st) || '—'}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Typography
                                sx={{
                                  fontSize: '16px',
                                  fontWeight: 'bold',
                                  mb: 1,
                                  color: accentColor,
                                }}
                              >
                                2nd Quincena:
                              </Typography>
                              <Typography sx={{ fontSize: '16px' }}>
                                {formatCurrency(displayEmployee.pay2nd) || '—'}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Box>
                      </Box>

                      {/* Footer */}
                      <Box textAlign="center" mt={4} p={3}>
                        <Typography
                          sx={{ fontSize: '16px', fontWeight: 'bold', mb: 2 }}
                        >
                          Certified Correct:
                        </Typography>
                        <Typography
                          sx={{ fontSize: '18px', fontWeight: 'bold', mb: 1 }}
                        >
                          GIOVANNI L. AHUNIN
                        </Typography>
                        <Typography sx={{ fontSize: '14px' }}>
                          Director, Administrative Services
                        </Typography>
                      </Box>
                    </>
                  );
                })()}
              </Paper>
            </GlassCard>
          </Fade>
        ) : selectedMonth !== null ? (
          <Fade in timeout={600}>
            <GlassCard sx={{ mb: 4 }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Avatar
                  sx={{
                    bgcolor: 'rgba(109,35,35,0.1)',
                    mx: 'auto',
                    mb: 3,
                    width: 80,
                    height: 80,
                    color: accentColor,
                  }}
                >
                  <CalendarToday sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography
                  variant="h5"
                  color={accentColor}
                  gutterBottom
                  sx={{ fontWeight: 600 }}
                >
                  No Payslip Found
                </Typography>
                <Typography variant="body1" color={grayColor} sx={{ mb: 3 }}>
                  No payslip records found for{' '}
                  <b>{monthsShort[selectedMonth]}</b>
                </Typography>
                <Chip
                  label="Please select a different period"
                  size="medium"
                  sx={{
                    bgcolor: 'rgba(109,35,35,0.1)',
                    color: accentColor,
                    fontWeight: 600,
                    fontSize: '1rem',
                  }}
                />
              </CardContent>
            </GlassCard>
          </Fade>
        ) : hasSearched ? (
          <Fade in timeout={600}>
            <GlassCard sx={{ mb: 4 }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Avatar
                  sx={{
                    bgcolor: 'rgba(109,35,35,0.1)',
                    mx: 'auto',
                    mb: 3,
                    width: 80,
                    height: 80,
                    color: accentColor,
                  }}
                >
                  <CalendarToday sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography
                  variant="h5"
                  color={accentColor}
                  gutterBottom
                  sx={{ fontWeight: 600 }}
                >
                  Select Pay Period
                </Typography>
                <Typography variant="body1" color={grayColor}>
                  Please select a month to view payslip
                </Typography>
              </CardContent>
            </GlassCard>
          </Fade>
        ) : null}

        {/* ══ FLOATING DOWNLOAD FAB ═══════════════════════════════════════ */}
        {displayEmployee && (
          <Box
            component="button"
            onClick={downloadPDF}
            disabled={sending}
            sx={{
              position: 'fixed',
              bottom: 90,
              right: 28,
              zIndex: 1200,
              color: primaryColor,
              border: 'none',
              px: '22px',
              py: '14px',
              borderRadius: '50px',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: sending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: sending
                ? grayColor
                : `linear-gradient(135deg, ${accentColor} 0%, ${accentDark} 100%)`,
              boxShadow: sending ? 'none' : '0 8px 24px rgba(109,35,35,0.45)',
              transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              fontFamily: '"Poppins", sans-serif',
              whiteSpace: 'nowrap',
              '&:hover:not(:disabled)': {
                transform: 'translateY(-4px) scale(1.04)',
                boxShadow: '0 14px 30px rgba(109,35,35,0.5)',
              },
            }}
          >
            {sending ? (
              <>
                <CircularProgress size={20} sx={{ color: primaryColor }} />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Download sx={{ fontSize: '1.4rem' }} />
                <span>Download PDF</span>
              </>
            )}
          </Box>
        )}

        {/* Dialog */}
        <Dialog
          open={modal.open}
          onClose={() => setModal({ ...modal, open: false })}
          PaperProps={{
            sx: { borderRadius: 4, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
          }}
        >
          <SuccessfulOverlay
            open={modal.open && modal.type === 'success'}
            action={modal.action}
            onClose={() => setModal({ ...modal, open: false })}
          />
          {modal.type === 'error' && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Error Occurred
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {modal.message ||
                  'An error occurred while processing your request.'}
              </Typography>
            </Box>
          )}
        </Dialog>
      </Box>
    </Box>
  );
});

export default Payslip;