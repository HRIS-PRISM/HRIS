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
import logo from '../../assets/logo.png';
import hrisLogo from '../../assets/hrisLogo.png';
import SuccessfulOverlay from '../SuccessfulOverlay';
import { Refresh, Download } from '@mui/icons-material';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import usePayrollRealtimeRefresh from '../../hooks/usePayrollRealtimeRefresh';

// Helper function to convert hex to rgb
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
        result[3],
        16
      )}`
    : '109, 35, 35';
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

const ProfessionalButton = styled(Button)(
  ({ theme, variant, color = 'primary' }) => ({
    borderRadius: 12,
    fontWeight: 600,
    padding: '8px 16px', // Reduced padding slightly
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    textTransform: 'none',
    fontSize: '0.85rem', // Smaller font
    letterSpacing: '0.025em',
    boxShadow:
      variant === 'contained' ? '0 4px 14px rgba(254, 249, 225, 0.25)' : 'none',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow:
        variant === 'contained'
          ? '0 6px 20px rgba(254, 249, 225, 0.35)'
          : 'none',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  })
);

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

  const [search, setSearch] = useState(''); // search input
  const [hasSearched, setHasSearched] = useState(false); // flag if search was done
  const [selectedMonth, setSelectedMonth] = useState(null); // which month is selected
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // which year is selected
  const [filteredPayroll, setFilteredPayroll] = useState([]); // search r
  const [personID, setPersonID] = useState('');
  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];
  
  // Generate years (current year +/- 5)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

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
  // The identifier 'payslip' should match the component_identifier in the pages table
  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('payslip');
  // ACCESSING END

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    console.log(
      'Token from localStorage:',
      token ? 'Token exists' : 'No token found'
    );
    if (token) {
      console.log('Token length:', token.length);
      console.log('Token starts with:', token.substring(0, 20) + '...');
    }
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  };

  const fetchPayrollData = async () => {
    if (!personID) return;
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE_URL}/PayrollReleasedRoute/released-payroll-detailed`,
        getAuthHeaders()
      );
      setAllPayroll(res.data); // ✅ just store everything
      setDisplayEmployee(null); // ✅ don't auto-display until month is chosen
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

  useEffect(() => {
    // Retrieve and decode the token from local storage
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setPersonID(decoded.employeeNumber); // Set the employeeNumber in state
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (!employee) {
      fetchPayrollData();
    }
  }, [employee, personID]);

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

  // Download PDF - EXACT COPY from PayslipOverall
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
    const payslipWidth = (pageWidth - 2 * margin - 2 * gap) / 3; // Divide remaining width by 3
    const payslipHeight = pageHeight - 2 * margin; // Use full height with margins

    const positions = [
      margin, // First payslip position
      margin + payslipWidth + gap, // Second payslip position
      margin + 2 * payslipWidth + 2 * gap, // Third payslip position
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
    const period = formatPeriod(
      displayEmployee.startDate,
      displayEmployee.endDate
    );
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

  // For Search
  const handleSearch = () => {
    if (!search.trim()) return;

    const result = allPayroll.filter(
      (emp) =>
        emp.employeeNumber.toString().includes(search.trim()) ||
        emp.name.toLowerCase().includes(search.trim().toLowerCase())
    );

    if (result.length > 0) {
      setFilteredPayroll(result);
      setDisplayEmployee(result[0]); // ✅ show first search match
      setHasSearched(true);
    } else {
      setFilteredPayroll([]);
      setDisplayEmployee(null); // clear display
      setSelectedMonth(null); // ✅ reset month filter
      setHasSearched(true);
    }
  };

  // For Clear / Reset
  const clearSearch = () => {
    setSearch('');
    setHasSearched(false);
    setSelectedMonth(null);
    setSelectedYear(new Date().getFullYear());
    setFilteredPayroll([]);

    if (employee) {
      setDisplayEmployee(employee);
    } else if (allPayroll.length > 0) {
      setDisplayEmployee(allPayroll[0]);
    } else {
      setDisplayEmployee(null);
    }
  };

  // Month filter
  const handleMonthSelect = (monthIndex) => {
    setSelectedMonth(monthIndex);

    const result = allPayroll.filter((emp) => {
      if (!emp.startDate) return false;
      const empDate = new Date(emp.startDate);
      const empMonth = empDate.getMonth();
      const empYear = empDate.getFullYear();
      return (
        emp.employeeNumber?.toString() === personID.toString() &&
        empMonth === monthIndex &&
        empYear === selectedYear
      );
    });

    setFilteredPayroll(result);
    setDisplayEmployee(result.length > 0 ? result[0] : null);
    setHasSearched(true);
  };

  // Year filter
  const handleYearChange = (year) => {
    setSelectedYear(year);
    
    // If a month is already selected, re-filter with new year
    if (selectedMonth !== null) {
      const result = allPayroll.filter((emp) => {
        if (!emp.startDate) return false;
        const empDate = new Date(emp.startDate);
        const empMonth = empDate.getMonth();
        const empYear = empDate.getFullYear();
        return (
          emp.employeeNumber?.toString() === personID.toString() &&
          empMonth === selectedMonth &&
          empYear === year
        );
      });

      setFilteredPayroll(result);
      setDisplayEmployee(result.length > 0 ? result[0] : null);
    }
  };

  // Helper functions for formatting
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
        message="You do not have permission to access Payslip. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }
  //ACCESSING END2

  return (
    <Box
      sx={{
        py: 4,
        pt: -10,
        width: '1200px', // Reduced width for better readability
        mx: 'auto', // Center horizontally
        overflow: 'hidden', // Prevent horizontal scroll on main container
      }}
    >
      {/* Header - Full Width */}
      <Fade in timeout={500}>
        <Box sx={{ mb: 3, px: 6 }}>
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
                p: 3, // Reduced padding from 5
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
                      mr: 3, // Reduced from 4
                      width: 48, // Reduced from 64
                      height: 48,
                      boxShadow: '0 8px 24px rgba(109,35,35,0.15)',
                    }}
                  >
                    <WorkIcon sx={{ color: accentColor, fontSize: 24 }} /> {/* Reduced */}
                  </Avatar>
                  <Box>
                    <Typography
                      variant="h5" // Reduced from h4
                      component="h1"
                      sx={{
                        fontWeight: 700,
                        mb: 0.5, // Reduced from 1
                        lineHeight: 1.2,
                        color: accentColor,
                      }}
                    >
                      Employee Payslip Record
                    </Typography>
                    <Typography
                      variant="body2" // Reduced from body1
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
                        width: 40, // Reduced from 48
                        height: 40,
                      }}
                    >
                      <Refresh sx={{ fontSize: 20 }} /> {/* Reduced */}
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          </GlassCard>
        </Box>
      </Fade>

      {/* Container with fixed width */}
      <Box sx={{ px: 6 }}>

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

        {/* Controls Section at Top */}
        <Fade in timeout={700}>
          <Box sx={{ mb: 3 }}> {/* Reduced mb from 4 */}
            <GlassCard
              sx={{
                border: `1px solid ${alpha(accentColor, 0.1)}`,
              }}
            >
              <CardContent sx={{ p: 3 }}> {/* Reduced p from 5 */}
                <Grid container spacing={2} alignItems="center"> {/* Reduced spacing from 4 */}
                  {/* Employee Number */}
                  <Grid item xs={12} md={6}>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 600, mb: 1, color: accentColor }} 
                    >
                      Employee Information
                    </Typography>
                    <ModernTextField
                      fullWidth
                      label="Employee Number"
                      value={personID}
                      disabled
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search
                              sx={{ color: textPrimaryColor, fontSize: 24 }}
                            />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiInputBase-input': {
                          fontSize: '1rem', // Reduced from 1.2rem
                          py: 1.5, // Reduced from 2.5
                          fontWeight: 500,
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '0.9rem', // Reduced from 1.1rem
                        },
                      }}
                    />
                  </Grid>

                  {/* Download Button */}
                  <Grid item xs={12} md={6}>
                    {displayEmployee && (
                      <Box>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 600, mb: 1, color: accentColor }}
                        >
                          Actions
                        </Typography>
                        <ProfessionalButton
                          variant="contained"
                          fullWidth
                          startIcon={
                            sending ? (
                              <CircularProgress
                                size={20}
                                sx={{ color: primaryColor }}
                              />
                            ) : (
                              <Download sx={{ fontSize: 20 }} />
                            )
                          }
                          onClick={downloadPDF}
                          disabled={sending}
                          sx={{
                            py: 2, // Reduced from 3
                            backgroundColor: accentColor,
                            color: primaryColor,
                            fontSize: '1rem', // Reduced from 1.2rem
                            '&:hover': {
                              backgroundColor: accentDark,
                            },
                          }}
                        >
                          {sending ? 'Processing...' : 'Download PDF Document'}
                        </ProfessionalButton>
                      </Box>
                    )}
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3, borderColor: 'rgba(109,35,35,0.1)' }} /> {/* Reduced my */}

                {/* UPDATED: Month and Year Selection */}
                <Box>
                  {/* Header Row: Label + Year Dropdown */}
                  <Box
                    sx={{
                      mb: 1, // Reduced from 2  
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      justifyContent: 'space-between',
                      gap: 2,
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{
                        color: accentColor,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '0.95rem'
                      }}
                    >
                      <Search sx={{ mr: 1, fontSize: 20 }} /> {/* Reduced mr and fontSize */}
                      Filter By Year & Month:
                    </Typography>
                    
                    <FormControl sx={{ minWidth: 120 }}> {/* Reduced minWidth */}
                      <InputLabel sx={{ fontWeight: 600, fontSize: '0.9rem' }}>Year</InputLabel>
                      <Select
                        value={selectedYear}
                        label="Year"
                        onChange={(e) => handleYearChange(e.target.value)}
                        sx={{
                          backgroundColor: 'white',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: accentColor,
                          },
                          borderRadius: 2,
                          fontWeight: 600,
                          color: accentColor,
                          height: 40, // Fixed height for consistency
                        }}
                      >
                        {years.map((yearOption) => (
                          <MenuItem key={yearOption} value={yearOption}>
                            {yearOption}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  {/* Month Buttons Row: One line only */}
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'nowrap', // FORCE ONE LINE
                      overflowX: 'auto',  // Enable scrolling
                      gap: 0.5, // Reduced from 1
                      alignItems: 'center',
                      pb: 1, // Space for scrollbar
                      // Optional: Hide scrollbar for cleaner look but keep functionality
                      '&::-webkit-scrollbar': {
                        height: '6px',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor: alpha(accentColor, 0.3),
                        borderRadius: '4px',
                      },
                    }}
                  >
                    {months.map((month, index) => {
                      const isSelected = selectedMonth === index;
                      return (
                        <ProfessionalButton
                          key={month}
                          variant={isSelected ? 'contained' : 'outlined'}
                          size="small"
                          onClick={() => handleMonthSelect(index)}
                          sx={{
                            borderColor: accentColor,
                            backgroundColor: isSelected
                              ? accentColor
                              : 'transparent',
                            color: isSelected
                              ? textSecondaryColor
                              : accentColor,
                            minWidth: '84px', // Reduced from 77px
                            flexShrink: 0,
                            fontSize: '0.75rem', // Reduced from 0.85rem
                            fontWeight: 600,
                            py: 1, // Reduced from 1.5
                            px: 1.5, // Reduced from 2
                            '&:hover': {
                              backgroundColor: isSelected
                                ? accentDark
                                : alpha(accentColor, 0.1),
                              borderWidth: 2,
                            },
                            transition: 'all 0.3s ease',
                            boxShadow: isSelected
                              ? `0 4px 12px ${alpha(accentColor, 0.3)}`
                              : 'none',
                          }}
                        >
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

        {/* Payslip Display at Bottom */}
        <Grid container spacing={2}> {/* Reduced spacing from 4 */}
          <Grid item xs={12}>
            {/* Payslip Display - EXACT COPY from PayslipOverall but COMPACTED */}
            {displayEmployee ? (
              <Fade in timeout={900}>
                <GlassCard
                  sx={{
                    mb: 2, // Reduced mb from 4
                    border: `1px solid ${alpha(accentColor, 0.1)}`,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Box
                    sx={{
                      p: 2, // Reduced from 4
                      background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                      color: accentColor,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          opacity: 0.8,
                          mb: 0.5, // Reduced from 1
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          color: accentDark,
                          fontSize: '0.75rem',
                        }}
                      >
                        Employee Payslip Record
                      </Typography>
                      <Typography
                        variant="h5" // Reduced from h4
                        sx={{ fontWeight: 600, mb: 0.5, color: accentColor, fontSize: '1.25rem' }}
                      >
                        {displayEmployee.name}
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1, // Reduced from 2
                          mt: 1, // Reduced from 2
                        }}
                      >
                        <Chip
                          label={`ID: ${displayEmployee.employeeNumber}`}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(109,35,35,0.15)',
                            color: accentColor,
                            fontWeight: 500,
                            height: 24, // Compact size
                            fontSize: '0.75rem',
                          }}
                        />
                        <Chip
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
                            height: 24,
                            fontSize: '0.75rem',
                          }}
                        />
                      </Box>
                    </Box>
                    <Avatar
                      sx={{
                        bgcolor: 'rgba(109,35,35,0.15)',
                        width: 56, // Reduced from 80
                        height: 56,
                        fontSize: '1.5rem', // Reduced from 2rem
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

                  <Paper
                    ref={payslipRef}
                    elevation={6}
                    sx={{
                      p: 2, // Reduced from 5
                      mt: 1, // Reduced from 3
                      borderRadius: 1,
                      backgroundColor: '#fff',
                      fontFamily: '"Poppins", sans-serif',
                      position: 'relative',
                      overflow: 'hidden',
                      width: '100%',
                      maxWidth: '100%',
                      margin: '0 auto',
                      fontSize: '0.85rem', // Reduced from 1rem - base font size
                      boxSizing: 'border-box',
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
                        width: '80%', // Reduced from 100%
                        pointerEvents: 'none',
                        userSelect: 'none',
                      }}
                    />

                    {/* Header */}
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      mb={1} // Reduced from 3
                      sx={{
                        background:
                          'linear-gradient(to right, #6d2323, #a31d1d)',
                        borderRadius: '3px',
                        p: 1, // Reduced from 2
                      }}
                    >
                      <Box>
                        <img
                          src={logo}
                          alt="Logo"
                          style={{ width: '50px', marginLeft: '10px' }} // Reduced from 80px
                        />
                      </Box>
                      <Box textAlign="center" flex={1} sx={{ color: 'white' }}>
                        <Typography
                          variant="caption" // Reduced from h5
                          sx={{ fontStyle: 'italic', fontSize: '10px', lineHeight: 1.2 }}
                        >
                          Republic of the Philippines
                        </Typography>
                        <Typography
                          variant="body1" // Reduced from h4
                          fontWeight="bold"
                          sx={{ fontSize: '12px', lineHeight: 1.2 }} // Reduced from 18px
                        >
                          EULOGIO "AMANG" RODRIGUEZ INSTITUTE OF SCIENCE AND
                          TECHNOLOGY
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: '10px' }}> {/* Reduced from h6/14px */}
                          Nagtahan, Sampaloc Manila
                        </Typography>
                      </Box>
                      <Box>
                        <img
                          src={hrisLogo}
                          alt="HRIS Logo"
                          style={{ width: '60px' }} // Reduced from 100px
                        />
                      </Box>
                    </Box>

                    {/* Check if JO Employee - Render Simplified Layout */}
                    {(() => {
                      const employmentCategory =
                        displayEmployee.employmentCategory ?? -1;
                      const isJO = employmentCategory === 0;

                      if (isJO) {
                        // Simplified JO Payslip Layout
                        return (
                          <>
                            {/* Employee Information Section - JO */}
                            <Box
                              sx={{
                                border: '1px solid black',
                                borderRadius: '3px',
                                mb: 1.5, // Reduced from 3
                              }}
                            >
                              <Box
                                sx={{
                                  backgroundColor: '#6D2323',
                                  color: 'white',
                                  p: 0.5, // Reduced from 2
                                  textAlign: 'center',
                                  fontWeight: 'bold',
                                  fontSize: '11px', // Reduced from 18px
                                }}
                              >
                                EMPLOYEE INFORMATION
                              </Box>
                              <Box sx={{ p: 1 }}> {/* Reduced from 3 */}
                                <Grid container spacing={1}> {/* Reduced from 2 */}
                                  <Grid item xs={12} md={6}>
                                    <Typography
                                      sx={{
                                        fontSize: '10px', // Reduced from 16px
                                        fontWeight: 'bold',
                                        mb: 0.25, // Reduced from 1
                                        color: accentColor,
                                      }}
                                    >
                                      EMPLOYEE NUMBER:
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: '11px', // Reduced from 16px
                                        color: 'red',
                                        fontWeight: 'bold',
                                      }}
                                    >
                                      {displayEmployee.employeeNumber
                                        ? `${parseFloat(
                                            displayEmployee.employeeNumber
                                          )}`
                                        : '—'}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <Typography
                                      sx={{
                                        fontSize: '10px', 
                                        fontWeight: 'bold',
                                        mb: 0.25,
                                        color: accentColor,
                                      }}
                                    >
                                      NAME:
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: '11px',
                                        color: 'red',
                                        fontWeight: 'bold',
                                      }}
                                    >
                                      {displayEmployee.name
                                        ? `${displayEmployee.name}`
                                        : '—'}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <Typography
                                      sx={{
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        mb: 0.25,
                                        color: accentColor,
                                      }}
                                    >
                                      PERIOD:
                                    </Typography>
                                    <Typography sx={{ fontSize: '11px' }}>
                                      {(() => {
                                        if (
                                          !displayEmployee.startDate ||
                                          !displayEmployee.endDate
                                        )
                                          return '—';
                                        const start = new Date(
                                          displayEmployee.startDate
                                        );
                                        const end = new Date(
                                          displayEmployee.endDate
                                        );
                                        const month = start
                                          .toLocaleString('en-US', {
                                            month: 'long',
                                          })
                                          .toUpperCase();
                                        return `${month} ${start.getDate()}-${end.getDate()} ${end.getFullYear()}`;
                                      })() || '—'}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <Typography
                                      sx={{
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        mb: 0.25,
                                        color: accentColor,
                                      }}
                                    >
                                      RENDERED DAYS:
                                    </Typography>
                                    <Typography sx={{ fontSize: '11px' }}>
                                      {formatRenderedDays(displayEmployee.rh) ||
                                        '—'}
                                    </Typography>
                                  </Grid>
                                </Grid>
                              </Box>
                            </Box>

                            {/* Salary Section - JO */}
                            <Box
                              sx={{
                                border: '1px solid black',
                                borderRadius: '3px',
                                mb: 1.5,
                              }}
                            >
                              <Box
                                sx={{
                                  backgroundColor: '#6D2323',
                                  color: 'white',
                                  p: 0.5,
                                  textAlign: 'center',
                                  fontWeight: 'bold',
                                  fontSize: '11px',
                                }}
                              >
                                SALARY DETAILS
                              </Box>
                              <Box sx={{ p: 1 }}>
                                <Grid container spacing={1}>
                                  <Grid item xs={12}>
                                    <Typography
                                      sx={{
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        mb: 0.25,
                                        color: accentColor,
                                      }}
                                    >
                                      GROSS SALARY:
                                    </Typography>
                                    <Typography sx={{ fontSize: '11px' }}>
                                      {formatCurrency(
                                        displayEmployee.grossSalary
                                      ) || '—'}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12}>
                                    <Typography
                                      sx={{
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        mb: 0.5, // Reduced from 2
                                        color: accentColor,
                                      }}
                                    >
                                      TOTAL DEDUCTIONS:
                                    </Typography>
                                    <Box sx={{ pl: 1, mb: 0.5 }}> {/* Reduced spacing */}
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          mb: 0.25, // Reduced from 1.5
                                          fontSize: '11px',
                                        }}
                                      >
                                        <Typography sx={{ fontWeight: 600, fontSize: '10px' }}>
                                          SSS:
                                        </Typography>
                                        <Typography sx={{ fontSize: '11px' }}>
                                          {formatCurrency(
                                            displayEmployee.sss
                                          ) || '—'}
                                        </Typography>
                                      </Box>
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          fontSize: '11px',
                                        }}
                                      >
                                        <Typography sx={{ fontWeight: 600, fontSize: '10px' }}>
                                          PAGIBIG:
                                        </Typography>
                                        <Typography sx={{ fontSize: '11px' }}>
                                          {formatCurrency(
                                            displayEmployee.pagibigFundCont
                                          ) || '—'}
                                        </Typography>
                                      </Box>
                                    </Box>
                                    <Typography
                                      sx={{
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                      }}
                                    >
                                      {formatCurrency(
                                        displayEmployee.totalDeductions
                                      ) || '—'}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12}>
                                    <Box
                                      sx={{
                                        border: '1px solid #6d2323',
                                        borderRadius: 2,
                                        p: 1,
                                        textAlign: 'center',
                                        background: 'rgba(109, 35, 35, 0.05)',
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontSize: '11px', // Reduced from 18px
                                          fontWeight: 'bold',
                                          mb: 0.25, // Reduced from 1
                                          color: accentColor,
                                        }}
                                      >
                                        NET AMOUNT:
                                      </Typography>
                                      <Typography
                                        sx={{
                                          fontSize: '14px', // Reduced from 20px
                                          fontWeight: 'bold',
                                          color: '#6d2323',
                                        }}
                                      >
                                        {formatCurrency(
                                          displayEmployee.netSalary
                                        ) || '—'}
                                      </Typography>
                                    </Box>
                                  </Grid>
                                </Grid>
                              </Box>
                            </Box>

                            {/* Footer - Same as payslip */}
                            <Box textAlign="center" mt={2} p={1}> {/* Reduced mt/p */}
                              <Typography
                                sx={{
                                  fontSize: '11px', // Reduced from 16px
                                  fontWeight: 'bold',
                                  mb: 0.5, // Reduced from 2
                                }}
                              >
                                Certified Correct:
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: '12px', // Reduced from 18px
                                  fontWeight: 'bold',
                                  mb: 0.25, // Reduced from 1
                                }}
                              >
                                GIOVANNI L. AHUNIN
                              </Typography>
                              <Typography sx={{ fontSize: '10px' }}> {/* Reduced from 14px */}
                                Director, Administrative Services
                              </Typography>
                            </Box>
                          </>
                        );
                      }

                      // Regular Employee - Full Detailed Layout (COMPACTED)
                      return (
                        <>
                          {/* Employee Information Section */}
                          <Box
                            sx={{
                              border: '1px solid black',
                              borderRadius: '3px',
                              mb: 1.5,
                            }}
                          >
                            <Box
                              sx={{
                                backgroundColor: '#6D2323',
                                color: 'white',
                                p: 0.5,
                                textAlign: 'center',
                                fontWeight: 'bold',
                                fontSize: '11px',
                              }}
                            >
                              EMPLOYEE INFORMATION
                            </Box>
                            <Box sx={{ p: 1 }}>
                              <Grid container spacing={1}>
                                <Grid item xs={12} md={6}>
                                  <Typography
                                    sx={{
                                      fontSize: '10px',
                                      fontWeight: 'bold',
                                      mb: 0.25,
                                      color: accentColor,
                                    }}
                                  >
                                    PERIOD:
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    {(() => {
                                      if (
                                        !displayEmployee.startDate ||
                                        !displayEmployee.endDate
                                      )
                                        return '—';
                                      const start = new Date(
                                        displayEmployee.startDate
                                      );
                                      const end = new Date(
                                        displayEmployee.endDate
                                      );
                                      const month = start
                                        .toLocaleString('en-US', {
                                          month: 'long',
                                        })
                                        .toUpperCase();
                                      return `${month} ${start.getDate()}-${end.getDate()} ${end.getFullYear()}`;
                                    })() || '—'}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <Typography
                                    sx={{
                                      fontSize: '10px',
                                      fontWeight: 'bold',
                                      mb: 0.25,
                                      color: accentColor,
                                    }}
                                  >
                                    EMPLOYEE NUMBER:
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontSize: '11px',
                                      color: 'red',
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    {displayEmployee.employeeNumber
                                      ? `${parseFloat(
                                          displayEmployee.employeeNumber
                                        )}`
                                      : '—'}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <Typography
                                    sx={{
                                      fontSize: '10px',
                                      fontWeight: 'bold',
                                      mb: 0.25,
                                      color: accentColor,
                                    }}
                                  >
                                    NAME:
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontSize: '11px',
                                      color: 'red',
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    {displayEmployee.name
                                      ? `${displayEmployee.name}`
                                      : '—'}
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
                              mb: 1.5,
                            }}
                          >
                            <Box
                              sx={{
                                backgroundColor: '#6D2323',
                                color: 'white',
                                p: 0.5,
                                textAlign: 'center',
                                fontWeight: 'bold',
                                fontSize: '11px',
                              }}
                            >
                              SALARY DETAILS
                            </Box>
                            <Box sx={{ p: 1 }}>
                              <Grid container spacing={1}>
                                <Grid item xs={12} md={4}>
                                  <Typography
                                    sx={{
                                      fontSize: '10px',
                                      fontWeight: 'bold',
                                      mb: 0.25,
                                      color: accentColor,
                                    }}
                                  >
                                    GROSS SALARY:
                                  </Typography>
                                  <Typography sx={{ fontSize: '11px' }}>
                                    {formatCurrency(
                                      displayEmployee.grossSalary
                                    ) || '—'}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                  <Typography
                                    sx={{
                                      fontSize: '10px',
                                      fontWeight: 'bold',
                                      mb: 0.25,
                                      color: accentColor,
                                    }}
                                  >
                                    TOTAL DEDUCTIONS:
                                  </Typography>
                                  <Typography sx={{ fontSize: '11px' }}>
                                    {formatCurrency(
                                      displayEmployee.totalDeductions
                                    ) || '—'}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                  <Box
                                    sx={{
                                      border: '1px solid #6d2323',
                                      borderRadius: 2,
                                      p: 1,
                                      textAlign: 'center',
                                      background: 'rgba(109, 35, 35, 0.05)',
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        mb: 0.25,
                                        color: accentColor,
                                      }}
                                    >
                                      NET SALARY:
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        color: '#6d2323',
                                      }}
                                    >
                                      {formatCurrency(
                                        displayEmployee.netSalary
                                      ) || '—'}
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
                              mb: 1.5,
                            }}
                          >
                            <Box
                              sx={{
                                backgroundColor: '#6D2323',
                                color: 'white',
                                p: 0.5,
                                textAlign: 'center',
                                fontWeight: 'bold',
                                fontSize: '11px',
                              }}
                            >
                              DEDUCTIONS BREAKDOWN
                            </Box>
                            <Box sx={{ p: 1 }}>
                              <Grid container spacing={0.5}> {/* Tightened spacing heavily */}
                                {(() => {
                                  const allDeductions = [
                                    {
                                      label: 'Withholding Tax',
                                      value: displayEmployee.withholdingTax,
                                      key: 'withholdingTax',
                                    },
                                    {
                                      label: 'Life & Retirement',
                                      value: displayEmployee.personalLifeRetIns,
                                      key: 'personalLifeRetIns',
                                    },
                                    {
                                      label: 'GSIS Salary Loan',
                                      value: displayEmployee.gsisSalaryLoan,
                                      key: 'gsisSalaryLoan',
                                    },
                                    {
                                      label: 'Policy Loan',
                                      value: displayEmployee.gsisPolicyLoan,
                                      key: 'gsisPolicyLoan',
                                    },
                                    {
                                      label: 'Housing Loan',
                                      value: displayEmployee.gsisHousingLoan,
                                      key: 'gsisHousingLoan',
                                    },
                                    {
                                      label: 'GSIS Arrears',
                                      value: displayEmployee.gsisArrears,
                                      key: 'gsisArrears',
                                    },
                                    {
                                      label: 'GFAL',
                                      value: displayEmployee.gfal,
                                      key: 'gfal',
                                    },
                                    {
                                      label: 'CPL',
                                      value: displayEmployee.cpl,
                                      key: 'cpl',
                                    },
                                    {
                                      label: 'MPL',
                                      value: displayEmployee.mpl,
                                      key: 'mpl',
                                    },
                                    {
                                      label: 'MPL Lite',
                                      value: displayEmployee.mplLite,
                                      key: 'mplLite',
                                    },
                                    {
                                      label: 'ELA',
                                      value: displayEmployee.ela,
                                      key: 'ela',
                                    },
                                    {
                                      label: 'SSS',
                                      value: displayEmployee.sss,
                                      key: 'sss',
                                    },
                                    {
                                      label: 'Pag-IBIG',
                                      value: displayEmployee.pagibigFundCont,
                                      key: 'pagibigFundCont',
                                    },
                                    {
                                      label: 'PhilHealth',
                                      value:
                                        displayEmployee.PhilHealthContribution,
                                      key: 'PhilHealthContribution',
                                    },
                                    {
                                      label: 'PhilHealth Diff',
                                      value: displayEmployee.philhealthDiff,
                                      key: 'philhealthDiff',
                                    },
                                    {
                                      label: 'Pag-IBIG 2',
                                      value: displayEmployee.pagibig2,
                                      key: 'pagibig2',
                                    },
                                    {
                                      label: 'LBP Loan',
                                      value: displayEmployee.lbpLoan,
                                      key: 'lbpLoan',
                                    },
                                    {
                                      label: 'MTSLAI',
                                      value: displayEmployee.mtslai,
                                      key: 'mtslai',
                                    },
                                    {
                                      label: 'ECC',
                                      value: displayEmployee.ecc,
                                      key: 'ecc',
                                    },
                                    {
                                      label: 'To Be Refunded',
                                      value: displayEmployee.toBeRefunded,
                                      key: 'toBeRefunded',
                                    },
                                    {
                                      label: 'FEU',
                                      value: displayEmployee.feu,
                                      key: 'feu',
                                    },
                                    {
                                      label: 'ESLAI',
                                      value: displayEmployee.eslai,
                                      key: 'eslai',
                                    },
                                    {
                                      label: 'ABS',
                                      value: displayEmployee.abs,
                                      key: 'abs',
                                    },
                                  ];

                                  return allDeductions
                                    .filter((item) => {
                                      const numValue = parseFloat(item.value);
                                      return (
                                        !isNaN(numValue) &&
                                        numValue !== 0 &&
                                        numValue !== null &&
                                        numValue !== undefined &&
                                        item.value !== ''
                                      );
                                    })
                                    .map((item, index) => (
                                      <Grid
                                        item
                                        xs={12}
                                        sm={6}
                                        md={4}
                                        key={index}
                                      >
                                        <Box
                                          sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '10px', // Reduced from 14px
                                            borderBottom: '1px solid #e0e0e0',
                                            pb: 0.25, // Reduced from 1
                                            mb: 0.25, // Reduced from 1
                                          }}
                                        >
                                          <Typography sx={{ fontWeight: 600, fontSize: '10px' }}>
                                            {item.label}:
                                          </Typography>
                                          <Typography sx={{ fontSize: '11px' }}>
                                            {formatCurrency(item.value) || '—'}
                                          </Typography>
                                        </Box>
                                      </Grid>
                                    ));
                                })()}
                              </Grid>
                            </Box>
                          </Box>

                          {/* Payment Section */}
                          <Box
                            sx={{
                              border: '1px solid black',
                              borderRadius: '3px',
                              mb: 1.5,
                            }}
                          >
                            <Box
                              sx={{
                                backgroundColor: '#6D2323',
                                color: 'white',
                                p: 0.5,
                                textAlign: 'center',
                                fontWeight: 'bold',
                                fontSize: '11px',
                              }}
                            >
                              PAYMENT BREAKDOWN
                            </Box>
                            <Box sx={{ p: 1 }}>
                              <Grid container spacing={1}>
                                <Grid item xs={12} md={6}>
                                  <Typography
                                    sx={{
                                      fontSize: '10px',
                                      fontWeight: 'bold',
                                      mb: 0.25,
                                      color: accentColor,
                                    }}
                                  >
                                    1st Quincena:
                                  </Typography>
                                  <Typography sx={{ fontSize: '11px' }}>
                                    {formatCurrency(displayEmployee.pay1st)}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <Typography
                                    sx={{
                                      fontSize: '10px',
                                      fontWeight: 'bold',
                                      mb: 0.25,
                                      color: accentColor,
                                    }}
                                  >
                                    2nd Quincena:
                                  </Typography>
                                  <Typography sx={{ fontSize: '11px' }}>
                                    {formatCurrency(displayEmployee.pay2nd)}
                                  </Typography>
                                </Grid>
                              </Grid>
                            </Box>
                          </Box>

                          {/* Footer - Same as payslip */}
                          <Box textAlign="center" mt={2} p={1}>
                            <Typography
                              sx={{
                                fontSize: '11px',
                                fontWeight: 'bold',
                                mb: 0.5,
                              }}
                            >
                              Certified Correct:
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '12px',
                                fontWeight: 'bold',
                                mb: 0.25,
                              }}
                            >
                              GIOVANNI L. AHUNIN
                            </Typography>
                            <Typography sx={{ fontSize: '10px' }}>
                              Director, Administrative Services
                            </Typography>
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

        <Dialog
          open={modal.open}
          onClose={() => setModal({ ...modal, open: false })}
          PaperProps={{
            sx: {
              borderRadius: 4,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            },
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
                  color: '#f44336',
                }}
              >
                <Alert severity="error" sx={{ fontSize: 30 }} />
              </Avatar>
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