import API_BASE_URL from '../../apiConfig';
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
import Search from '@mui/icons-material/Search';
import WorkIcon from '@mui/icons-material/Work';
import Refresh from '@mui/icons-material/Refresh';
import Download from '@mui/icons-material/Download';
import Send from '@mui/icons-material/Send';
import Person from '@mui/icons-material/Person';
import CalendarToday from '@mui/icons-material/CalendarToday';
import AttachMoney from '@mui/icons-material/AttachMoney';
import Receipt from '@mui/icons-material/Receipt';
import Mail from '@mui/icons-material/Mail';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';
import logo from '../../assets/logo.png';
import hrisLogo from '../../assets/hrisLogo.png';
import SuccessfulOverlay from '../SuccessfulOverlay';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import usePayrollRealtimeRefresh from '../../hooks/usePayrollRealtimeRefresh';

// Helper function to convert hex to rgb
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '109, 35, 35';
};

// Professional styled components - colors will be applied via sx prop
const GlassCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  backdropFilter: 'blur(10px)',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-4px)',
  },
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

const PayslipOverall = forwardRef(({ employee }, ref) => {
  const payslipRef = ref || useRef();

  const [allPayroll, setAllPayroll] = useState([]);
  const [displayEmployee, setDisplayEmployee] = useState(employee || null);
  const [loading, setLoading] = useState(!employee);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [modal, setModal] = useState({
    open: false,
    type: '',
    action: '',
  });

  const { settings } = useSystemSettings();
  
  // Get colors from system settings
  const primaryColor = settings.accentColor || '#FEF9E1'; // Cards color
  const secondaryColor = settings.backgroundColor || '#FFF8E7'; // Background
  const accentColor = settings.primaryColor || '#6d2323'; // Primary accent
  const accentDark = settings.secondaryColor || '#8B3333'; // Darker accent
  const textPrimaryColor = settings.textPrimaryColor || '#6d2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';
  const hoverColor = settings.hoverColor || '#6D2323';
  const blackColor = '#1a1a1a';
  const whiteColor = '#FFFFFF';
  const grayColor = '#6c757d';

  //ACCESSING
  // Dynamic page access control using component identifier
  // The identifier 'overall-payslip' should match the component_identifier in the pages table
  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('overall-payslip');
  // ACCESSING END

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  };

  const [search, setSearch] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [filteredPayroll, setFilteredPayroll] = useState([]);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

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
      console.error('Error fetching payroll:', err);
      setError('Failed to fetch payroll data. Please try again.');
      setLoading(false);
    }
  };

  usePayrollRealtimeRefresh(() => {
    if (!employee) fetchPayrollData();
  });

  // Fetch payroll data
  useEffect(() => {
    if (!employee) {
      fetchPayrollData();
    }
  }, [employee]);

  // Helper function to get surname from name
  const getSurname = (name) => {
    if (!name) return 'EARIST';
    const nameParts = name.trim().split(' ');
    return nameParts[nameParts.length - 1] || 'EARIST';
  };

  // Helper function to format period/month
  const formatPeriod = (startDate, endDate) => {
    if (!startDate || !endDate) return 'Unknown';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const month = start.toLocaleString('en-US', { month: 'long' });
    const year = start.getFullYear();
    return `${month}_${year}`;
  };

  const downloadPDF = async () => {
    if (!displayEmployee) return;

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

    const records = monthsToGet.map(({ month, year, label }) => {
      const payroll = allPayroll.find(
        (p) =>
          p.employeeNumber === displayEmployee.employeeNumber &&
          new Date(p.startDate).getMonth() === month &&
          new Date(p.startDate).getFullYear() === year
      );
      return { payroll, label };
    });

    // PDF setup with A4 dimensions in mm
    const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape orientation, mm units
    const pageWidth = pdf.internal.pageSize.getWidth(); // ~297mm for A4 landscape
    const pageHeight = pdf.internal.pageSize.getHeight(); // ~210mm for A4 landscape
    
    // Calculate dimensions for 3 payslips side by side with proper margins
    const margin = 10; // 10mm margin on each side
    const gap = 5; // 5mm gap between payslips
    const payslipWidth = (pageWidth - (2 * margin) - (2 * gap)) / 3; // Divide remaining width by 3
    const payslipHeight = pageHeight - (2 * margin); // Use full height with margins

    const positions = [
      margin, // First payslip position
      margin + payslipWidth + gap, // Second payslip position
      margin + (2 * payslipWidth) + (2 * gap) // Third payslip position
    ];

    // Create a temporary container for proper rendering
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '1200px'; // Fixed width for rendering
    tempContainer.style.backgroundColor = '#fff';
    document.body.appendChild(tempContainer);

    for (let i = 0; i < records.length; i++) {
      const { payroll, label } = records[i];
      let imgData;

      if (payroll) {
        setDisplayEmployee(payroll);
        await new Promise((resolve) => setTimeout(resolve, 300));
        
        // Clone the payslip element for rendering
        const input = payslipRef.current;
        const clone = input.cloneNode(true);
        clone.style.width = '1200px';
        clone.style.overflow = 'hidden';
        tempContainer.innerHTML = '';
        tempContainer.appendChild(clone);
        
        const canvas = await html2canvas(clone, { 
          scale: 2, // Adjusted scale for better quality
          useCORS: true,
          width: 1200,
          height: 1700,
          windowWidth: 1200,
          windowHeight: 1700,
          logging: false, // Disable console logs
        });
        imgData = canvas.toDataURL('image/png');
      } else {
        // No Data placeholder with larger dimensions
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

      // Add to PDF with proper dimensions
      pdf.addImage(
        imgData,
        'PNG',
        positions[i],
        margin, // Top margin
        payslipWidth,
        payslipHeight
      );
    }

    // Clean up temporary container
    document.body.removeChild(tempContainer);

    // Generate filename: Surname - Period/Month
    const surname = getSurname(displayEmployee.name);
    const period = formatPeriod(displayEmployee.startDate, displayEmployee.endDate);
    const filename = `${surname}_${period}.pdf`;

    // Save file
    pdf.save(filename);

    setModal({
      open: true,
      type: 'success',
      action: 'download',
    });

    setDisplayEmployee(employee);
  };

  const sendPayslipViaGmail = async () => {
    if (!displayEmployee) return;

    setSending(true);
    try {
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

      const records = monthsToGet.map(({ month, year, label }) => {
        const payroll = allPayroll.find(
          (p) =>
            p.employeeNumber === displayEmployee.employeeNumber &&
            new Date(p.startDate).getMonth() === month &&
            new Date(p.startDate).getFullYear() === year
        );
        return { payroll, label };
      });

      // PDF setup with A4 dimensions in mm
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate dimensions for 3 payslips side by side with proper margins
      const margin = 10; // 10mm margin on each side
      const gap = 5; // 5mm gap between payslips
      const payslipWidth = (pageWidth - (2 * margin) - (2 * gap)) / 3;
      const payslipHeight = pageHeight - (2 * margin);

      const positions = [
        margin,
        margin + payslipWidth + gap,
        margin + (2 * payslipWidth) + (2 * gap)
      ];

      // Create a temporary container for proper rendering
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
          
          // Clone the payslip element for rendering
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
          payslipHeight
        );
      }

      // Clean up temporary container
      document.body.removeChild(tempContainer);

      // Generate filename: Surname - Period/Month
      const surname = getSurname(displayEmployee.name);
      const period = formatPeriod(displayEmployee.startDate, displayEmployee.endDate);
      const filename = `${surname}_${period}.pdf`;

      const pdfBlob = pdf.output('blob');
      const formData = new FormData();
      formData.append('pdf', pdfBlob, filename);
      formData.append('name', displayEmployee.name);
      formData.append('employeeNumber', displayEmployee.employeeNumber);

      const res = await axios.post(
        `${API_BASE_URL}/SendPayslipRoute/send-payslip`,
        formData,
        {
          ...getAuthHeaders(),
          headers: {
            ...getAuthHeaders().headers,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (res.data.success) {
        setModal({
          open: true,
          type: 'success',
          action: 'gmail',
        });
      } else {
        setModal({
          open: true,
          type: 'error',
          message: res.data.error || 'Failed to send payslip.',
        });
      }
    } catch (err) {
      console.error('Error sending payslip:', err);
      setModal({
        open: true,
        type: 'error',
        message: 'An error occurred while sending payslip.',
      });
    } finally {
      setDisplayEmployee(employee);
      setSending(false);
    }
  };

  const handleSearch = () => {
    if (!search.trim()) return;

    const result = allPayroll.filter(
      (emp) =>
        emp.employeeNumber.toString().includes(search.trim()) ||
        emp.name.toLowerCase().includes(search.trim().toLowerCase())
    );

    if (result.length > 0) {
      setFilteredPayroll(result);
      setDisplayEmployee(null);
      setSelectedMonth('');
      setHasSearched(true);
    } else {
      setFilteredPayroll([]);
      setDisplayEmployee(null);
      setSelectedMonth('');
      setHasSearched(true);
    }
  };

  const clearSearch = () => {
    setSearch('');
    setHasSearched(false);
    setSelectedMonth('');
    setFilteredPayroll([]);
    if (employee) {
      setDisplayEmployee(employee);
    } else {
      setDisplayEmployee(null);
    }
  };

  const handleMonthSelect = (month) => {
    setSelectedMonth(month);
    const monthIndex = months.indexOf(month);

    const result = allPayroll.filter(
      (emp) =>
        (hasSearched
          ? emp.employeeNumber.toString().includes(search.trim()) ||
            emp.name.toLowerCase().includes(search.trim().toLowerCase())
          : true) &&
        new Date(emp.startDate).getMonth() === monthIndex
    );

    setDisplayEmployee(result.length > 0 ? result[0] : null);
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

  // ACCESSING 2
  // Loading state
  if (accessLoading) {
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
  }
  // Access denied state - Now using the reusable component
  if (!accessLoading && hasAccess !== true) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Overall Payslip. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }
  //ACCESSING END2

  return (
    <Box sx={{ 
      py: 4,
      pt: -10,
      width: '1200px', // Reduced width for better readability
      mx: 'auto', // Center horizontally
      overflow: 'hidden', // Prevent horizontal scroll
    }}>
      {/* Container with fixed width */}
      <Box sx={{ px: 6 }}>
        {/* Header */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }}>
            <GlassCard sx={{
              background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
              boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`,
              border: `1px solid ${alpha(accentColor, 0.1)}`,
              '&:hover': {
                boxShadow: `0 12px 48px ${alpha(accentColor, 0.15)}`,
              },
            }}>
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
                    background: 'radial-gradient(circle, rgba(109,35,35,0.1) 0%, rgba(109,35,35,0) 70%)',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -30,
                    left: '30%',
                    width: 150,
                    height: 150,
                    background: 'radial-gradient(circle, rgba(109,35,35,0.08) 0%, rgba(109,35,35,0) 70%)',
                  }}
                />
                
                <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
                  <Box display="flex" alignItems="center">
                    <Avatar 
                      sx={{ 
                        bgcolor: 'rgba(109,35,35,0.15)', 
                        mr: 4, 
                        width: 64,
                        height: 64,
                        boxShadow: '0 8px 24px rgba(109,35,35,0.15)'
                      }}
                    >
                      <WorkIcon sx={{color: accentColor, fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2, color: accentColor }}>
                        Payslip Records
                      </Typography>
                      <Typography variant="body1" sx={{ opacity: 0.8, fontWeight: 400, color: accentDark }}>
                        Payroll overall records management
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
          sx={{ color: primaryColor, zIndex: (theme) => theme.zIndex.drawer + 1 }}
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
                backgroundColor: alpha(accentColor, 0.2)
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
                '& .MuiAlert-message': { fontWeight: 600 }
              }}
            >
              {error}
            </Alert>
          </Fade>
        )}

        {/* Controls */}
        <Fade in timeout={700}>
          <GlassCard sx={{ mb: 4, border: `1px solid ${alpha(accentColor, 0.1)}` }}>
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={4}>
                <Grid item xs={12} md={9}>
                  <ModernTextField
                    fullWidth
                    label="Search Employee by Name or Employee Number"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person sx={{ color: textPrimaryColor, fontSize: 24 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiInputBase-input': {
                        fontSize: '1.1rem',
                        py: 2,
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Stack direction="row" spacing={2}>
                    <ProfessionalButton
                      variant="contained"
                      onClick={handleSearch}
                      disabled={!search.trim()}
                      sx={{
                        backgroundColor: accentColor,
                        color: primaryColor,
                        '&:hover': { backgroundColor: accentDark },
                        '&:disabled': { backgroundColor: grayColor },
                        flex: 1,
                        fontSize: '1.1rem'
                      }}
                    >
                      Search
                    </ProfessionalButton>
                    <ProfessionalButton
                      variant="outlined"
                      onClick={clearSearch}
                      sx={{
                        borderColor: accentColor,
                        color: accentColor,
                        "&:hover": {
                          backgroundColor: alpha(accentColor, 0.1),
                        },
                        fontSize: '1.1rem'
                      }}
                    >
                      Clear
                    </ProfessionalButton>
                  </Stack>
                </Grid>
              </Grid>

              <Divider sx={{ my: 4, borderColor: 'rgba(109,35,35,0.1)' }} />

              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: accentColor, display: 'flex', alignItems: 'center' }}>
                <CalendarToday sx={{ mr: 2, fontSize: 24 }} />
                Select Month {!hasSearched && <span style={{ marginLeft: '12px', fontWeight: 400, opacity: 0.7 }}>(Search required first)</span>}
              </Typography>
              
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(3, 1fr)",
                    sm: "repeat(6, 1fr)",
                    md: "repeat(12, 1fr)",
                  },
                  gap: 1.5,
                }}
              >
                {months.map((month) => (
                  <ProfessionalButton
                    key={month}
                    variant={month === selectedMonth ? 'contained' : 'outlined'}
                    size="small"
                    disabled={!hasSearched}
                    onClick={() => handleMonthSelect(month)}
                    sx={{
                      borderColor: hasSearched ? accentColor : grayColor,
                      color: month === selectedMonth ? primaryColor : (hasSearched ? accentColor : grayColor),
                      minWidth: "auto",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      py: 1,
                      backgroundColor: month === selectedMonth ? accentColor : 'transparent',
                      "&:hover": {
                        backgroundColor: hasSearched
                          ? month === selectedMonth
                            ? accentDark
                            : alpha(accentColor, 0.1)
                          : 'transparent',
                      },
                      "&:disabled": {
                        backgroundColor: 'transparent',
                        color: grayColor,
                        borderColor: grayColor,
                        opacity: 0.5
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

        {/* Payslip Display */}
        {displayEmployee ? (
          <Fade in timeout={900}>
            <GlassCard sx={{ mb: 4, border: `1px solid ${alpha(accentColor, 0.1)}` }}>
              <Box sx={{ 
                p: 4, 
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`, 
                color: accentColor,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8, mb: 1, textTransform: 'uppercase', letterSpacing: '0.1em', color: accentDark }}>
                    Employee Payslip Record
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: accentColor }}>
                    {displayEmployee.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                    <Chip 
                      icon={<Person sx={{ fontSize: 20 }} />}
                      label={`ID: ${displayEmployee.employeeNumber}`}
                      size="small"
                      sx={{ 
                        bgcolor: 'rgba(109,35,35,0.15)', 
                        color: accentColor,
                        fontWeight: 500
                      }} 
                    />
                    <Chip 
                      icon={<CalendarToday sx={{ fontSize: 20 }} />}
                      label={(() => {
                        if (!displayEmployee.startDate || !displayEmployee.endDate) return '—';
                        const start = new Date(displayEmployee.startDate);
                        const end = new Date(displayEmployee.endDate);
                        const month = start.toLocaleString('en-US', { month: 'short' }).toUpperCase();
                        return `${month} ${start.getDate()}-${end.getDate()}`;
                      })()}
                      size="small"
                      sx={{ 
                        bgcolor: 'rgba(109,35,35,0.15)', 
                        color: accentColor,
                        fontWeight: 500
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
                    color: accentColor
                  }}
                >
                  {displayEmployee.name ? displayEmployee.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'E'}
                </Avatar>
              </Box>

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
                  // Much larger for frontend display
                  width: '100%',
                  maxWidth: '100%',
                  margin: '0 auto',
                  fontSize: '1rem',
                  boxSizing: 'border-box', // Added to prevent overflow
                }}
              >
                <Box
                  component="img"
                  src={hrisLogo}
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
                
                {/* Header */}
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
                      src={logo}
                      alt="Logo"
                      style={{ width: '80px', marginLeft: '15px' }}
                    />
                  </Box>
                  <Box textAlign="center" flex={1} sx={{ color: 'white' }}>
                    <Typography variant="h5" sx={{ fontStyle: 'italic', fontSize: '16px' }}>
                      Republic of the Philippines
                    </Typography>
                    <Typography
                      variant="h4"
                      fontWeight="bold"
                      sx={{ fontSize: '18px', lineHeight: 1.3 }}
                    >
                      EULOGIO "AMANG" RODRIGUEZ INSTITUTE OF SCIENCE AND TECHNOLOGY
                    </Typography>
                    <Typography variant="h6" sx={{ fontSize: '14px' }}>
                      Nagtahan, Sampaloc Manila
                    </Typography>
                  </Box>
                  <Box>
                    <img src={hrisLogo} alt="HRIS Logo" style={{ width: '100px' }} />
                  </Box>
                </Box>

                {/* Check if JO Employee - Render Simplified Layout */}
                {(() => {
                  const employmentCategory = displayEmployee.employmentCategory ?? -1;
                  const isJO = employmentCategory === 0;

                  if (isJO) {
                    // Simplified JO Payslip Layout
                    return (
                      <>
                        {/* Employee Information Section - JO */}
                        <Box sx={{ border: '1px solid black', borderRadius: '3px', mb: 3 }}>
                          <Box sx={{ backgroundColor: '#6D2323', color: 'white', p: 2, textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>
                            EMPLOYEE INFORMATION
                          </Box>
                          <Box sx={{ p: 3 }}>
                            <Grid container spacing={2}>
                              <Grid item xs={12} md={6}>
                                <Typography sx={{ fontSize: '16px', fontWeight: 'bold', mb: 1, color: accentColor }}>
                                  EMPLOYEE NUMBER:
                                </Typography>
                                <Typography sx={{ fontSize: '16px', color: 'red', fontWeight: 'bold' }}>
                                  {displayEmployee.employeeNumber
                                    ? `${parseFloat(displayEmployee.employeeNumber)}`
                                    : ''}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <Typography sx={{ fontSize: '16px', fontWeight: 'bold', mb: 1, color: accentColor }}>
                                  NAME:
                                </Typography>
                                <Typography sx={{ fontSize: '16px', color: 'red', fontWeight: 'bold' }}>
                                  {displayEmployee.name ? `${displayEmployee.name}` : ''}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <Typography sx={{ fontSize: '16px', fontWeight: 'bold', mb: 1, color: accentColor }}>
                                  PERIOD:
                                </Typography>
                                <Typography sx={{ fontSize: '16px', fontWeight: 'bold' }}>
                                  {(() => {
                                    if (!displayEmployee.startDate || !displayEmployee.endDate)
                                      return '—';
                                    const start = new Date(displayEmployee.startDate);
                                    const end = new Date(displayEmployee.endDate);
                                    const month = start
                                      .toLocaleString('en-US', { month: 'long' })
                                      .toUpperCase();
                                    return `${month} ${start.getDate()}-${end.getDate()} ${end.getFullYear()}`;
                                  })()}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <Typography sx={{ fontSize: '16px', fontWeight: 'bold', mb: 1, color: accentColor }}>
                                  RENDERED DAYS:
                                </Typography>
                                <Typography sx={{ fontSize: '16px' }}>
                                  {formatRenderedDays(displayEmployee.rh)}
                                </Typography>
                              </Grid>
                            </Grid>
                          </Box>
                        </Box>

                        {/* Salary Section - JO */}
                        <Box sx={{ border: '1px solid black', borderRadius: '3px', mb: 3 }}>
                          <Box sx={{ backgroundColor: '#6D2323', color: 'white', p: 2, textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>
                            SALARY DETAILS
                          </Box>
                          <Box sx={{ p: 3 }}>
                            <Grid container spacing={3}>
                              <Grid item xs={12}>
                                <Typography sx={{ fontSize: '16px', fontWeight: 'bold', mb: 1, color: accentColor }}>
                                  GROSS SALARY:
                                </Typography>
                                <Typography sx={{ fontSize: '16px' }}>
                                  {formatCurrency(displayEmployee.grossSalary)}
                                </Typography>
                              </Grid>
                              <Grid item xs={12}>
                                <Typography sx={{ fontSize: '16px', fontWeight: 'bold', mb: 2, color: accentColor }}>
                                  TOTAL DEDUCTIONS:
                                </Typography>
                                <Box sx={{ pl: 2, mb: 2 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, fontSize: '16px' }}>
                                    <Typography sx={{ fontWeight: 600 }}>SSS:</Typography>
                                    <Typography>{formatCurrency(displayEmployee.sss)}</Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px' }}>
                                    <Typography sx={{ fontWeight: 600 }}>PAGIBIG:</Typography>
                                    <Typography>{formatCurrency(displayEmployee.pagibigFundCont)}</Typography>
                                  </Box>
                                </Box>
                                <Typography sx={{ fontSize: '16px', fontWeight: 'bold' }}>
                                  {formatCurrency(displayEmployee.totalDeductions)}
                                </Typography>
                              </Grid>
                              <Grid item xs={12}>
                                <Box sx={{ border: '1px solid #6d2323', borderRadius: 3, p: 2, textAlign: 'center', background: 'rgba(109, 35, 35, 0.05)' }}>
                                  <Typography sx={{ fontSize: '18px', fontWeight: 'bold', mb: 1, color: accentColor }}>
                                    NET AMOUNT:
                                  </Typography>
                                  <Typography sx={{ fontSize: '20px', fontWeight: 'bold', color: '#6d2323' }}>
                                    {formatCurrency(displayEmployee.netSalary)}
                                  </Typography>
                                </Box>
                              </Grid>
                            </Grid>
                          </Box>
                        </Box>

                        {/* Footer - Same as payslip */}
                        <Box textAlign="center" mt={4} p={3}>
                          <Typography sx={{ fontSize: '16px', fontWeight: 'bold', mb: 2 }}>
                            Certified Correct:
                          </Typography>
                          <Typography sx={{ fontSize: '18px', fontWeight: 'bold', mb: 1 }}>
                            GIOVANNI L. AHUNIN
                          </Typography>
                          <Typography sx={{ fontSize: '14px' }}>
                            Director, Administrative Services
                          </Typography>
                        </Box>
                      </>
                    );
                  }

                  // Regular Employee - Full Detailed Layout
                  return (
                    <>
                      {/* Employee Information Section */}
                      <Box sx={{ border: '1px solid black', borderRadius: '3px', mb: 3 }}>
                        <Box sx={{ backgroundColor: '#6D2323', color: 'white', p: 2, textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>
                          EMPLOYEE INFORMATION
                        </Box>
                        <Box sx={{ p: 3 }}>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <Typography sx={{ fontSize: '16px', fontWeight: 'bold', mb: 1, color: accentColor }}>
                                PERIOD:
                              </Typography>
                              <Typography sx={{ fontSize: '16px', fontWeight: 'bold' }}>
                                {(() => {
                                  if (!displayEmployee.startDate || !displayEmployee.endDate)
                                    return '—';
                                  const start = new Date(displayEmployee.startDate);
                                  const end = new Date(displayEmployee.endDate);
                                  const month = start
                                    .toLocaleString('en-US', { month: 'long' })
                                    .toUpperCase();
                                  return `${month} ${start.getDate()}-${end.getDate()} ${end.getFullYear()}`;
                                })()}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Typography sx={{ fontSize: '16px', fontWeight: 'bold', mb: 1, color: accentColor }}>
                                EMPLOYEE NUMBER:
                              </Typography>
                              <Typography sx={{ fontSize: '16px', color: 'red', fontWeight: 'bold' }}>
                                {displayEmployee.employeeNumber
                                  ? `${parseFloat(displayEmployee.employeeNumber)}`
                                  : ''}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Typography sx={{ fontSize: '16px', fontWeight: 'bold', mb: 1, color: accentColor }}>
                                NAME:
                              </Typography>
                              <Typography sx={{ fontSize: '16px', color: 'red', fontWeight: 'bold' }}>
                                {displayEmployee.name ? `${displayEmployee.name}` : ''}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Box>
                      </Box>

                      {/* Salary Section */}
                      <Box sx={{ border: '1px solid black', borderRadius: '3px', mb: 3 }}>
                        <Box sx={{ backgroundColor: '#6D2323', color: 'white', p: 2, textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>
                          SALARY DETAILS
                        </Box>
                        <Box sx={{ p: 3 }}>
                          <Grid container spacing={3}>
                            <Grid item xs={12} md={4}>
                              <Typography sx={{ fontSize: '16px', fontWeight: 'bold', mb: 1, color: accentColor }}>
                                GROSS SALARY:
                              </Typography>
                              <Typography sx={{ fontSize: '16px' }}>
                                {formatCurrency(displayEmployee.grossSalary)}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <Typography sx={{ fontSize: '16px', fontWeight: 'bold', mb: 1, color: accentColor }}>
                                TOTAL DEDUCTIONS:
                              </Typography>
                              <Typography sx={{ fontSize: '16px' }}>
                                {formatCurrency(displayEmployee.totalDeductions)}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <Box sx={{ border: '1px solid #6d2323', borderRadius: 3, p: 2, textAlign: 'center', background: 'rgba(109, 35, 35, 0.05)' }}>
                                <Typography sx={{ fontSize: '18px', fontWeight: 'bold', mb: 1, color: accentColor }}>
                                  NET SALARY:
                                </Typography>
                                <Typography sx={{ fontSize: '20px', fontWeight: 'bold', color: '#6d2323' }}>
                                  {formatCurrency(displayEmployee.netSalary)}
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>
                      </Box>

                      {/* Deductions Section */}
                      <Box sx={{ border: '1px solid black', borderRadius: '3px', mb: 3 }}>
                        <Box sx={{ backgroundColor: '#6D2323', color: 'white', p: 2, textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>
                          DEDUCTIONS BREAKDOWN
                        </Box>
                        <Box sx={{ p: 3 }}>
                          <Grid container spacing={2}>
                            {[
                              { label: 'Withholding Tax', value: displayEmployee.withholdingTax },
                              { label: 'Life & Retirement', value: displayEmployee.personalLifeRetIns },
                              { label: 'GSIS Salary Loan', value: displayEmployee.gsisSalaryLoan },
                              { label: 'Policy Loan', value: displayEmployee.gsisPolicyLoan },
                              { label: 'Housing Loan', value: displayEmployee.gsisHousingLoan },
                              { label: 'GSIS Arrears', value: displayEmployee.gsisArrears },
                              { label: 'GFAL', value: displayEmployee.gfal },
                              { label: 'CPL', value: displayEmployee.cpl },
                              { label: 'MPL', value: displayEmployee.mpl },
                              { label: 'MPL Lite', value: displayEmployee.mplLite },
                              { label: 'ELA', value: displayEmployee.ela },
                              { label: 'SSS', value: displayEmployee.sss },
                              { label: 'Pag-IBIG', value: displayEmployee.pagibigFundCont },
                              { label: 'PhilHealth', value: displayEmployee.PhilHealthContribution },
                              { label: 'PhilHealth Diff', value: displayEmployee.philhealthDiff },
                              { label: 'Pag-IBIG 2', value: displayEmployee.pagibig2 },
                              { label: 'LBP Loan', value: displayEmployee.lbpLoan },
                              { label: 'MTSLAI', value: displayEmployee.mtslai },
                              { label: 'ECC', value: displayEmployee.ecc },
                              { label: 'To Be Refunded', value: displayEmployee.toBeRefunded },
                              { label: 'FEU', value: displayEmployee.feu },
                              { label: 'ESLAI', value: displayEmployee.eslai },
                              { label: 'ABS', value: displayEmployee.abs },
                            ].map((item, index) => (
                              <Grid item xs={12} sm={6} md={4} key={index}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '1px solid #e0e0e0', pb: 1, mb: 1 }}>
                                  <Typography sx={{ fontWeight: 600 }}>{item.label}:</Typography>
                                  <Typography>{formatCurrency(item.value)}</Typography>
                                </Box>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      </Box>

                      {/* Payment Section */}
                      <Box sx={{ border: '1px solid black', borderRadius: '3px', mb: 3 }}>
                        <Box sx={{ backgroundColor: '#6D2323', color: 'white', p: 2, textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>
                          PAYMENT BREAKDOWN
                        </Box>
                        <Box sx={{ p: 3 }}>
                          <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                              <Typography sx={{ fontSize: '16px', fontWeight: 'bold', mb: 1, color: accentColor }}>
                                1st Quincena:
                              </Typography>
                              <Typography sx={{ fontSize: '16px' }}>
                                {formatCurrency(displayEmployee.pay1st) || '—'}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Typography sx={{ fontSize: '16px', fontWeight: 'bold', mb: 1, color: accentColor }}>
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
                        <Typography sx={{ fontSize: '16px', fontWeight: 'bold', mb: 2 }}>
                          Certified Correct:
                        </Typography>
                        <Typography sx={{ fontSize: '18px', fontWeight: 'bold', mb: 1 }}>
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
        ) : selectedMonth ? (
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
                    fontSize: '2rem',
                    fontWeight: 600,
                    color: accentColor
                  }}
                >
                  <CalendarToday sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h5" color={accentColor} gutterBottom sx={{ fontWeight: 600 }}>
                  No Payslip Found
                </Typography>
                <Typography variant="body1" color={grayColor} sx={{ mb: 3 }}>
                  No payslip records found for <b>{selectedMonth}</b>
                </Typography>
                <Chip 
                  label="Please select a different period"
                  size="medium"
                  sx={{ 
                    bgcolor: 'rgba(109,35,35,0.1)', 
                    color: accentColor,
                    fontWeight: 600,
                    fontSize: '1rem'
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
                    fontSize: '2rem',
                    fontWeight: 600,
                    color: accentColor
                  }}
                >
                  <CalendarToday sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h5" color={accentColor} gutterBottom sx={{ fontWeight: 600 }}>
                  Select Pay Period
                </Typography>
                <Typography variant="body1" color={grayColor}>
                  Please select a month to view payslip
                </Typography>
              </CardContent>
            </GlassCard>
          </Fade>
        ) : null}

        {/* Action Buttons */}
        {displayEmployee && (
          <Fade in timeout={1100}>
            <GlassCard sx={{border: `1px solid ${alpha(accentColor, 0.1)}`}}>
              <CardContent sx={{ p: 5 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <ProfessionalButton
                      variant="contained"
                      fullWidth
                      startIcon={<Download sx={{ fontSize: 28 }} />}
                      onClick={downloadPDF}
                      sx={{
                        py: 3,
                        backgroundColor: accentColor,
                        color: primaryColor,
                        fontSize: '1.2rem',
                        '&:hover': {
                          backgroundColor: accentDark,
                        }
                      }}
                    >
                      Download PDF Document
                    </ProfessionalButton>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <ProfessionalButton
                      variant="contained"
                      fullWidth
                      startIcon={sending ? <CircularProgress size={28} sx={{ color: primaryColor }} /> : <Send sx={{ fontSize: 28 }} />}
                      onClick={sendPayslipViaGmail}
                      disabled={sending}
                      sx={{
                        py: 3,
                        backgroundColor: blackColor,
                        color: primaryColor,
                        fontSize: '1.2rem',
                        '&:hover': {
                          backgroundColor: '#2f2f2f',
                        }
                      }}
                    >
                      {sending ? 'Processing...' : 'Send via Email'}
                    </ProfessionalButton>
                  </Grid>
                </Grid>
              </CardContent>
            </GlassCard>
          </Fade>
        )}
        
        <Dialog
          open={modal.open}
          onClose={() => setModal({ ...modal, open: false })}
          PaperProps={{
            sx: {
              borderRadius: 4,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }
          }}
        >
          <SuccessfulOverlay
            open={modal.open && modal.type === 'success'}
            action={modal.action}
            onClose={() => setModal({ ...modal, open: false })}
          />

          {modal.type === 'error' && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Avatar 
                sx={{ 
                  bgcolor: 'rgba(244, 67, 54, 0.1)', 
                  mx: 'auto', 
                  mb: 2,
                  width: 60, 
                  height: 60,
                  color: '#f44336'
                }}
              >
                <Alert severity="error" sx={{ fontSize: 30 }} />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Error Occurred
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {modal.message || 'An error occurred while processing your request.'}
              </Typography>
            </Box>
          )}
        </Dialog>
      </Box>
    </Box>
  );
});

export default PayslipOverall;