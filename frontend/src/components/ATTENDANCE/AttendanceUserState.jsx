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
  Container,
  Box,
  Typography,
  Paper,
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
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Fab,
  Zoom,
  alpha,
  styled,
  CardHeader,
  FormControl,
  InputLabel,
  Select,
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
  MoreVert,
  Today,
  ArrowBackIos,
  ArrowForwardIos,
  Clear,
  KeyboardArrowUp,
  KeyboardArrowDown,
  FilterList,
} from '@mui/icons-material';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import CircularProgress from '@mui/material/CircularProgress';

// Helper function to convert hex to rgb
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '109, 35, 35';
};

// Styled components - colors will be applied via sx prop
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

const PremiumTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: 16,
  overflow: 'auto', // Enable both horizontal and vertical scrolling
  boxShadow: '0 4px 24px rgba(109, 35, 35, 0.06)',
  border: '1px solid rgba(109, 35, 35, 0.08)',
  maxHeight: '600px', // Set max height for vertical scrolling
  '&::-webkit-scrollbar': {
    width: '8px',
    height: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'rgba(254, 249, 225, 0.3)',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(109, 35, 35, 0.4)',
    borderRadius: '4px',
    '&:hover': {
      background: 'rgba(109, 35, 35, 0.6)',
    },
  },
}));

const PremiumTableCell = styled(TableCell)(({ theme, isHeader = false }) => ({
  fontWeight: isHeader ? 600 : 500,
  padding: '18px 20px',
  borderBottom: isHeader ? '2px solid rgba(254, 249, 225, 0.5)' : '1px solid rgba(109, 35, 35, 0.06)',
  fontSize: '0.95rem',
  letterSpacing: '0.025em',
  minWidth: '120px', // Ensure minimum width for cells
  whiteSpace: 'nowrap', // Prevent text wrapping
}));

const AttendanceUserState = () => {
  const { settings } = useSystemSettings();
  
  // Get colors from system settings
  const primaryColor = settings.accentColor || '#FEF9E1'; // Cards color
  const secondaryColor = settings.backgroundColor || '#FFF8E7'; // Background
  const accentColor = settings.primaryColor || '#6D2323'; // Primary accent
  const accentDark = settings.secondaryColor || '#8B3333'; // Darker accent
  const textPrimaryColor = settings.textPrimaryColor || '#6D2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';
  const hoverColor = settings.hoverColor || '#6D2323';
  const blackColor = '#1a1a1a';
  const whiteColor = '#FFFFFF';
  const grayColor = '#6c757d';
  const loggedInEmployeeNumber = localStorage.getItem('employeeNumber') || '';
  const today = new Date();
  // Use local date instead of UTC
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const formattedToday = `${year}-${month}-${day}`;

  //ACCESSING
  // Dynamic page access control using component identifier
  // The identifier 'attendance-user-state' should match the component_identifier in the pages table
  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('attendance-user-state');
  // ACCESSING END

  const [personID, setPersonID] = useState(loggedInEmployeeNumber);
  const [startDate, setStartDate] = useState(formattedToday);
  const [endDate, setEndDate] = useState(formattedToday);
  const [records, setRecords] = useState([]);
  const [submittedID, setSubmittedID] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [moreAnchorEl, setMoreAnchorEl] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Year / month selector (mirrors AttendanceState)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  };

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

  const handleMonthClick = (monthIndex) => {
    const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const end = new Date(Date.UTC(selectedYear, monthIndex + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex);
  };

  const handleFilterClick = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const handleMoreClick = (event) => {
    setMoreAnchorEl(event.currentTarget);
  };

  const handleMoreClose = () => {
    setMoreAnchorEl(null);
  };

  const handleRowExpand = (index) => {
    setExpandedRow(expandedRow === index ? null : index);
  };

  const handleSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const handleClearFilters = () => {
    setStartDate(formattedToday);
    setEndDate(formattedToday);
  };

  const fetchRecords = async (showLoading = true) => {
    if (!personID || !startDate || !endDate) return;
    if (showLoading) setLoading(true);
    try {
      console.log('=== FETCH RECORDS DEBUG ===');
      console.log('Selected startDate:', startDate);
      console.log('Selected endDate:', endDate);
      
      const adjustedStartDate = new Date(startDate);
      adjustedStartDate.setDate(adjustedStartDate.getDate() - 1);
      const adjustedStart = adjustedStartDate.toISOString().substring(0, 10);
      
      const adjustedEndDate = new Date(endDate);
      adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
      const adjustedEnd = adjustedEndDate.toISOString().substring(0, 10);
      
      console.log('Adjusted startDate sent to API:', adjustedStart);
      console.log('Adjusted endDate sent to API:', adjustedEnd);
      
      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/attendance`,
        { personID, startDate: adjustedStart, endDate: adjustedEnd },
        getAuthHeaders()
      );
      
      console.log('Raw API response:', response.data);
      
      const filteredData = response.data.filter(record => {
        const dateParts = record.Date.split('/');
        if (dateParts.length === 3) {
          const recordMonth = dateParts[0].padStart(2, '0');
          const recordDay = dateParts[1].padStart(2, '0');
          const recordYear = dateParts[2];
          const recordDate = `${recordYear}-${recordMonth}-${recordDay}`;
          
          console.log(`Checking record: ${recordDate} >= ${startDate} && ${recordDate} <= ${endDate}`);
          
          const isInRange = recordDate >= startDate && recordDate <= endDate;
          console.log(`Record ${recordDate} is in range:`, isInRange);
          
          return isInRange;
        }
        return false;
      });
      
      console.log('Filtered data:', filteredData);
      console.log('=== END DEBUG ===');
      
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

  useEffect(() => {
    fetchRecords();

    // Smart refresh: only when tab is active, every 30 seconds
    const intervalId = setInterval(() => {
      if (!document.hidden) {
        fetchRecords(false); // Don't show loading for auto-refresh
      }
    }, 30000); // 30 seconds

    // Refresh when user returns to the tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchRecords(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [personID, startDate, endDate]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getAttendanceIcon = (state) => {
    switch(state) {
      case 1: return <CheckCircle sx={{ fontSize: 16, color: '#4caf50' }} />;
      case 2: return <AccessTime sx={{ fontSize: 16, color: '#ff9800' }} />;
      case 3: return <AccessTime sx={{ fontSize: 16, color: '#ff9800' }} />;
      case 4: return <CheckCircle sx={{ fontSize: 16, color: '#4caf50' }} />;
      default: return <Cancel sx={{ fontSize: 16, color: '#f44336' }} />;
    }
  };

  const getAttendanceColor = (state) => {
    switch(state) {
      case 1: return '#4caf50';
      case 2: return '#ff9800';
      case 3: return '#ff9800';
      case 4: return '#4caf50';
      default: return '#f44336';
    }
  };

  const getAttendanceLabel = (state) => {
    switch(state) {
      case 1: return 'Time IN';
      case 2: return 'Break OUT';
      case 3: return 'Break IN';
      case 4: return 'Time OUT';
      default: return 'Uncategorized';
    }
  };

  const filteredRecords = records
    .sort((a, b) => {
      const dateA = new Date(a.Date + ' ' + a.Time);
      const dateB = new Date(b.Date + ' ' + b.Time);
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  const filterOpen = Boolean(filterAnchorEl);
  const moreOpen = Boolean(moreAnchorEl);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
  if (hasAccess === false) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Attendance User State. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }
  //ACCESSING END2

  return (
    <Box sx={{ 
      py: 4,
      borderRadius: '14px',
      width: '100vw', // Full viewport width
      mx: 'auto', // Center horizontally
      maxWidth: '100%', // Ensure it doesn't exceed viewport
      overflow: 'hidden', // Prevent horizontal scroll
      position: 'relative',
      left: '50%',
      transform: 'translateX(-50%)', // Center the element
      
    }}>
      {/* Wider Container */}
      <Box sx={{ px: 6, mx: 'auto', maxWidth: '1600px' }}>
        {/* Header */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }}>
            <GlassCard sx={{border: `1px solid ${alpha(accentColor, 0.1)}`}}>
              <Box
                sx={{
                  p: 5,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  color: accentColor,
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
                        boxShadow: '0 8px 24px rgba(109,35,35,0.15)',
                      }}
                    >
                      <EventNote sx={{ color: accentColor, fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2, color: accentColor }}>
                        Attendance Records
                      </Typography>
                      <Typography variant="body1" sx={{ opacity: 0.8, fontWeight: 400, color: accentDark }}>
                        View and manage your attendance history
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip 
                      label="System Generated" 
                      size="small" 
                      sx={{ 
                        bgcolor: 'rgba(109,35,35,0.15)', 
                        color: accentColor,
                        fontWeight: 500,
                        '& .MuiChip-label': { px: 1 }
                      }} 
                    />
                    <Tooltip title="Refresh Data">
                      <IconButton 
                        onClick={() => fetchRecords(true)}
                        sx={{ 
                          bgcolor: 'rgba(109,35,35,0.1)', 
                          '&:hover': { bgcolor: 'rgba(109,35,35,0.2)' },
                          color: accentColor,
                          width: 48,
                          height: 48,
                        }}
                      >
                        <Refresh />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {/* Controls */}
        <Fade in timeout={700}>
          <GlassCard sx={{ mb: 4, border: `1px solid ${alpha(accentColor, 0.1)}` }}>
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={4}>
                <Grid item xs={12} md={4}>
                  <ModernTextField
                    fullWidth
                    label="Employee Number"
                    value={personID}
                    disabled
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person sx={{ color: accentColor }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <ModernTextField
                    fullWidth
                    label="Start Date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarToday sx={{ color: accentColor }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <ModernTextField
                    fullWidth
                    label="End Date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarToday sx={{ color: accentColor }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3, borderColor: 'rgba(109,35,35,0.1)' }} />

              {/* Month & Year Selection - single row, year at end */}
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{
                    color: accentColor,
                    display: 'flex',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <CalendarToday sx={{ mr: 2, fontSize: 24 }} />
                  <b>Month & Year:</b>{' '}
                  <i>(select month and year to search your records)</i>
                </Typography>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(13, minmax(0, 1fr))', // 12 months + Year
                    gap: 1.25,
                    width: '100%',
                    alignItems: 'stretch',
                  }}
                >
                  {months.map((monthLabel, index) => {
                    const isSelected = selectedMonth === index;
                    return (
                      <ProfessionalButton
                        key={monthLabel}
                        variant={isSelected ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => handleMonthClick(index)}
                        sx={{
                          borderColor: accentColor,
                          backgroundColor: isSelected
                            ? accentColor
                            : 'transparent',
                          color: isSelected ? textSecondaryColor : accentColor,
                          width: '100%',
                          minWidth: 0,
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          py: 1,
                          px: 0.5,
                          '&:hover': {
                            backgroundColor: isSelected
                              ? alpha(accentColor, 0.9)
                              : alpha(accentColor, 0.1),
                          },
                        }}
                      >
                        {monthLabel}
                      </ProfessionalButton>
                    );
                  })}
                  {/* Year selector placed at the end of the months row */}
                  <FormControl size="small" sx={{ width: '100%', minWidth: 0 }}>
                    <InputLabel sx={{ fontWeight: 600 }}>Year</InputLabel>
                    <Select
                      value={selectedYear}
                      label="Year"
                      onChange={(e) => setSelectedYear(e.target.value)}
                      sx={{
                        backgroundColor: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: accentColor,
                        },
                        borderRadius: 2,
                        fontWeight: 600,
                      }}
                    >
                      {yearOptions.map((yearOption) => (
                        <MenuItem key={yearOption} value={yearOption}>
                          {yearOption}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>
           
                           {/* Quick Select */}
                           <Box>
                             <Typography
                               variant="h6"
                               gutterBottom
                               sx={{
                                 color: accentColor,
                                 display: "flex",
                                 alignItems: "center",
                               }}
                             >
                               <FilterList sx={{ mr: 2, fontSize: 24 }} />
                               <b>Filters:</b>
                             </Typography>
                             <Box
                               sx={{
                                 display: "flex",
                                 flexWrap: "wrap",
                                 gap: 1,
                               }}
                             >
                               <ProfessionalButton
                                 variant="outlined"
                                 startIcon={<Today />}
                                 onClick={() => {
                                   setStartDate(formattedToday);
                                   setEndDate(formattedToday);
                                 }}
                                 sx={{
                                   fontWeight: "normal",
                                   fontSize: "small",
                                   borderColor: accentColor,
                                   color: accentColor,
                                   "&:hover": {
                                     backgroundColor: alpha(accentColor, 0.1),
                                   },
                                 }}
                               >
                                 TODAY
                               </ProfessionalButton>
                               <ProfessionalButton
                                 variant="outlined"
                                 startIcon={<ArrowBackIos />}
                                 onClick={() => {
                                   const yesterday = new Date(today);
                                   yesterday.setDate(yesterday.getDate() - 1);
                                   const yesterdayFormatted = yesterday
                                     .toISOString()
                                     .substring(0, 10);
                                   setStartDate(yesterdayFormatted);
                                   setEndDate(yesterdayFormatted);
                                 }}
                                 sx={{
                                   fontWeight: "normal",
                                   fontSize: "small",
                                   borderColor: accentColor,
                                   color: accentColor,
                                   "&:hover": { backgroundColor: alpha(accentColor, 0.1) },
                                 }}
                               >
                                 YESTERDAY
                               </ProfessionalButton>
                               <ProfessionalButton
                                 variant="outlined"
                                 onClick={() => {
                                   const lastWeek = new Date(today);
                                   lastWeek.setDate(lastWeek.getDate() - 7);
                                   const lastWeekFormatted = lastWeek
                                     .toISOString()
                                     .substring(0, 10);
                                   setStartDate(lastWeekFormatted);
                                   setEndDate(formattedToday);
                                 }}
                                 sx={{
                                   fontWeight: "normal",
                                   fontSize: "small",
                                   borderColor: accentColor,
                                   color: accentColor,
                                   "&:hover": { backgroundColor: alpha(accentColor, 0.1) },
                                 }}
                               >
                                 LAST 7 DAYS
                                 {
                                   <ArrowForwardIos
                                     sx={{ marginLeft: "10px", fontSize: "large" }}
                                   />
                                 }
                               </ProfessionalButton>
                               <ProfessionalButton
                                 variant="outlined"
                                 onClick={() => {
                                   const fifteenDaysAgo = new Date(today);
                                   fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
                                   const fifteenDaysAgoFormatted = fifteenDaysAgo
                                     .toISOString()
                                     .substring(0, 10);
                                   setStartDate(fifteenDaysAgoFormatted);
                                   setEndDate(formattedToday);
                                 }}
                                 sx={{
                                   fontWeight: "normal",
                                   fontSize: "small",
                                   borderColor: accentColor,
                                   color: accentColor,
                                   "&:hover": { backgroundColor: alpha(accentColor, 0.1) },
                                 }}
                               >
                                 LAST 15 DAYS
                               </ProfessionalButton>
                               <ProfessionalButton
                                 variant="outlined"
                                 startIcon={<Clear />}
                                 onClick={handleClearFilters}
                                 sx={{
                                   fontWeight: "normal",
                                   fontSize: "small",
                                   borderColor: accentColor,
                                   color: accentColor,
                                   "&:hover": { backgroundColor: alpha(accentColor, 0.1) },
                                 }}
                               >
                                 CLEAR ALL
                               </ProfessionalButton>
                             </Box>
                           </Box>
            </CardContent>
          </GlassCard>
        </Fade>

        {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1, bgcolor: alpha(accentColor, 0.1), '& .MuiLinearProgress-bar': { bgcolor: accentColor } }} />}

        {error && (
          <Fade in timeout={300}>
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          </Fade>
        )}

        {/* Results */}
        {submittedID && (
          <Fade in={!loading} timeout={500}>
            <GlassCard sx={{ mb: 4, border: `1px solid ${alpha(accentColor, 0.1)}` }}>
              <Box sx={{ 
                p: 4, 
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`, 
                color: accentColor,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                
              }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8, mb: 1, textTransform: 'uppercase', letterSpacing: '0.1em', color: accentDark }}>
                    Employee Number
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: accentColor }}>
                    {submittedID}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Badge badgeContent={filteredRecords.length} color="secondary" sx={{ '& .MuiBadge-badge': { fontSize: '0.8rem', height: 24, minWidth: 24 } }}>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Records Found
                    </Typography>
                  </Badge>
                  <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.5, color: accentDark }}>
                    {startDate} to {endDate}
                  </Typography>
                </Box>
              </Box>

              <PremiumTableContainer>
                <Table 
                  stickyHeader 
                  sx={{ 
                    minWidth: '800px', // Set minimum width to ensure horizontal scrolling
                  }}
                >
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'rgba(254, 249, 225, 0.7)' }}>
                      <PremiumTableCell isHeader sx={{ color: accentColor, cursor: 'pointer', userSelect: 'none', '&:hover': { bgcolor: alpha(accentColor, 0.05) } }}
                        onClick={handleSort}
                      >
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
                            <Info sx={{ fontSize: 64, color: alpha(accentColor, 0.3), mb: 2 }} />
                            <Typography variant="h5" color={alpha(accentColor, 0.6)} gutterBottom sx={{ fontWeight: 600 }}>
                              No records found
                            </Typography>
                            <Typography variant="body1" color={alpha(accentColor, 0.4)}>
                              Try adjusting your date range
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.map((record, idx) => (
                        <React.Fragment key={idx}>
                          <TableRow 
                            sx={{ 
                              '&:nth-of-type(even)': { bgcolor: alpha(primaryColor, 0.3) },
                              '&:hover': { bgcolor: alpha(accentColor, 0.05) },
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => handleRowExpand(idx)}
                          >
                            <PremiumTableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500, color: blackColor }}>
                                {new Date(record.Date).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </Typography>
                            </PremiumTableCell>
                            <PremiumTableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500, color: blackColor }}>
                                {record.Time}
                              </Typography>
                            </PremiumTableCell>
                            <PremiumTableCell>
                              <Chip
                                icon={getAttendanceIcon(record.AttendanceState)}
                                label={getAttendanceLabel(record.AttendanceState)}
                                size="small"
                                sx={{
                                  bgcolor: alpha(getAttendanceColor(record.AttendanceState), 0.1),
                                  color: getAttendanceColor(record.AttendanceState),
                                  fontWeight: 600,
                                  '& .MuiChip-icon': {
                                    color: getAttendanceColor(record.AttendanceState)
                                  }
                                }}
                              />
                            </PremiumTableCell>
                          </TableRow>
                          {expandedRow === idx && (
                            <TableRow>
                              <TableCell colSpan={3} sx={{ p: 0, bgcolor: alpha(primaryColor, 0.5) }}>
                                <Box sx={{ p: 3 }}>
                                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: blackColor }}>
                                    Record Details
                                  </Typography>
                                  <Grid container spacing={2}>
                                    <Grid item xs={6} md={4}>
                                      <Typography variant="body2" color="text.secondary">
                                        Employee ID
                                      </Typography>
                                      <Typography variant="body1" sx={{ fontWeight: 500, color: blackColor }}>
                                        {record.PersonID}
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={6} md={4}>
                                      <Typography variant="body2" color="text.secondary">
                                        Date
                                      </Typography>
                                      <Typography variant="body1" sx={{ fontWeight: 500, color: blackColor }}>
                                        {record.Date}
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={6} md={4}>
                                      <Typography variant="body2" color="text.secondary">
                                        Time
                                      </Typography>
                                      <Typography variant="body1" sx={{ fontWeight: 500, color: blackColor }}>
                                        {record.Time}
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={6} md={4}>
                                      <Typography variant="body2" color="text.secondary">
                                        Status
                                      </Typography>
                                      <Typography variant="body1" sx={{ fontWeight: 500, color: blackColor }}>
                                        {getAttendanceLabel(record.AttendanceState)}
                                      </Typography>
                                    </Grid>
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

        {/* Scroll to Top Button */}
        <Zoom in={showScrollTop}>
          <Fab
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1000,
              bgcolor: accentColor,
              color: primaryColor,
              '&:hover': {
                bgcolor: accentDark,
              }
            }}
            onClick={scrollToTop}
          >
            <KeyboardArrowUp />
          </Fab>
        </Zoom>
      </Box>
    </Box>
  );
};

export default AttendanceUserState;