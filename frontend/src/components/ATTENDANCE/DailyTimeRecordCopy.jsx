import API_BASE_URL from '../../apiConfig';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import useAttendanceRealtimeRefresh from '../../hooks/useAttendanceRealtimeRefresh';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import {
  AccessTime,
  CalendarToday,
  Print,
  SaveOutlined,
  Search,
  SearchOutlined,
} from '@mui/icons-material';
import PrintIcon from '@mui/icons-material/Print';
import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Container,
  Fade,
  IconButton,
  Paper,
  styled,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import earistLogo from '../../assets/earistLogo.jpg';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { alpha } from '@mui/material/styles';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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

const DailyTimeRecord = () => {
  const { settings } = useSystemSettings();
  const [personID, setPersonID] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [records, setRecords] = useState([]);
  const [employeeName, setEmployeeName] = useState('');
  const [officialTimes, setOfficialTimes] = useState({});
  const dtrRef = React.useRef(null);

  // Get colors from system settings
  const primaryColor = settings.accentColor || '#FEF9E1'; // Cards color
  const secondaryColor = settings.backgroundColor || '#FFF8E7'; // Background
  const accentColor = settings.primaryColor || '#6d2323'; // Primary accent
  const accentDark = settings.secondaryColor || '#8B3333'; // Darker accent
  const textPrimaryColor = settings.textPrimaryColor || '#6d2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';
  const hoverColor = settings.hoverColor || '#6D2323';
  const grayColor = '#6c757d';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  };

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

  const fetchRecords = async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/view-attendance`,
        {
          personID,
          startDate,
          endDate,
        },
        getAuthHeaders()
      );

      const data = response.data;

      if (data.length > 0) {
        // Set the records
        setRecords(data);

        // Extract and set the employee name from the first record
        const { firstName, lastName } = data[0];
        setEmployeeName(`${firstName} ${lastName}`);

        // Fetch official times separately using the personID
        await fetchOfficialTimes(personID);
      } else {
        setRecords([]);
        setEmployeeName('No records found');
        setOfficialTimes({});
      }
    } catch (err) {
      console.error(err);
    }
  };

  // New function to fetch official times
  const fetchOfficialTimes = async (employeeID) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/officialtimetable/${employeeID}`,
        getAuthHeaders() // ✅ Pass token headers
      );

      const data = response.data;

      // Map the official times by day
      const officialTimesMap = data.reduce((acc, record) => {
        acc[record.day] = {
          officialTimeIN: record.officialTimeIN,
          officialTimeOUT: record.officialTimeOUT,
          officialBreaktimeIN: record.officialBreaktimeIN,
          officialBreaktimeOUT: record.officialBreaktimeOUT,
        };
        return acc;
      }, {});

      setOfficialTimes(officialTimesMap);
    } catch (error) {
      console.error('Error fetching official times:', error);
      setOfficialTimes({});
    }
  };

  const fetchRecordsRef = useRef(fetchRecords);
  useEffect(() => {
    fetchRecordsRef.current = fetchRecords;
  });

  useAttendanceRealtimeRefresh(
    useCallback(() => {
      if (!personID || !startDate || !endDate) return;
      fetchRecordsRef.current();
    }, [personID, startDate, endDate]),
    {
      personId: personID,
      startDate,
      endDate,
      requireDateRange: true,
      matchMode: 'strict',
    },
  );

  // Also fetch official times when personID changes (on component mount)
  useEffect(() => {
    if (personID) {
      fetchOfficialTimes(personID);
    }
  }, [personID]);

  // Original print function for browser printing
  const printPage = () => {
    const elementsToHide = document.querySelectorAll('.no-print');
    const sidebar = document.querySelector('.MuiDrawer-root');
    const header = document.querySelector('.header');

    if (sidebar) sidebar.style.display = 'none';
    if (header) header.style.display = 'none';

    elementsToHide.forEach((el) => (el.style.display = 'none'));
    window.print();
    elementsToHide.forEach((el) => (el.style.display = ''));
    if (sidebar) sidebar.style.display = '';
    if (header) header.style.display = '';
  };

  // New function for PDF download
  const downloadPDF = async () => {
    if (!dtrRef.current) return;

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'a4',
      });

      // Convert the DTR to canvas (NO forced width/height)
      const canvas = await html2canvas(dtrRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');

      // Fixed DTR size (DO NOT CHANGE — this prevents distortion)
      const dtrWidth = 7;
      const dtrHeight = 7.5;

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Center baseline
      const baselineX = (pageWidth - dtrWidth) / 2;
      const yOffset = (pageHeight - dtrHeight) / 2;

      // 👉 MODIFY THIS VALUE ONLY (move a little left, without cutting)
      const adjustLeft = 0.2;
      // Example:
      // -0.5 = slight left
      // -1 = more left
      // +0.5 = slight right
      // +1 = more right

      const xOffset = baselineX + adjustLeft;

      // Add image with FIXED size (no squeeze)
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, dtrWidth, dtrHeight);

      pdf.save(`DTR-${employeeName}-${formatMonth(startDate)}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  };

  const formatMonth = (dateString) => {
    const date = new Date(dateString);
    const options = { month: 'long' }; // Only include the month name
    return date.toLocaleDateString(undefined, options).toUpperCase();
  };

  // Format time to ensure it's on one line (e.g., "09:22:49 AM")
  const formatTime = (timeString) => {
    if (!timeString) return '';
    // Remove extra whitespace and newlines, ensure AM/PM is on same line
    return timeString.replace(/\s+/g, ' ').trim();
  };

  const currentYear = new Date().getFullYear();
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
    const year = new Date().getFullYear();
    const start = new Date(Date.UTC(year, monthIndex, 1));
    const end = new Date(Date.UTC(year, monthIndex + 1, 0));

    const formattedStart = start.toISOString().substring(0, 10);
    const formattedEnd = end.toISOString().substring(0, 10);

    setStartDate(formattedStart);
    setEndDate(formattedEnd);
  };

  // Function to format the start date (Month DayNumber)
  const formatStartDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { month: 'long', day: 'numeric' }; // e.g., October 1
    return date.toLocaleDateString('en-US', options);
  };

  // Function to format the end date (DayNumber, Year)
  const formatEndDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate(); // Get the day number
    const year = date.getFullYear(); // Get the year
    return `${day}, ${year}`; // Format as "DayNumber, Year"
  };

  const formattedStartDate = formatStartDate(startDate);
  const formattedEndDate = formatEndDate(endDate);

  return (
    <Container maxWidth="xl" sx={{ py: 4, mt: -5 }}>
      <style>
        {`
          /* Frontend responsive styles (NOT for print) */
          .dtr-responsive-header,
          .dtr-responsive-cell,
          .dtr-time-cell {
            width: auto !important;
            max-width: none !important;
          }

          .dtr-time-cell {
            white-space: nowrap !important;
            word-break: keep-all !important;
          }

          table {
            table-layout: auto !important;
          }

          @page {
            size: A4;
            margin: 0;
          }

          @media print {
            /* Hide everything except DTR tables */
            .no-print {
              display: none !important;
            }

            /* Hide navigation and UI elements */
            .header,
            .top-banner,
            .page-banner,
            header,
            footer,
            .MuiDrawer-root,
            .MuiAppBar-root {
              display: none !important;
            }

            /* Page setup */
            html, body {
              width: 21cm;
              height: 29.7cm;
              margin: 0;
              padding: 0;
              background: white;
            }

            /* Container - center content on A4 */
            .MuiContainer-root {
              max-width: 100% !important;
              width: 21cm !important;
              margin: 0 auto !important;
              padding: 0 !important;
              display: flex !important;
              justify-content: center !important;
              align-items: center !important;
              background: white !important;
            }

            /* Remove all backgrounds */
            .MuiPaper-root,
            .MuiBox-root,
            .MuiCard-root {
              background: transparent !important;
              box-shadow: none !important;
              margin: 0 !important;
            }

            /* DTR Table Container - two tables side by side */
            .table-container {
              width: 100% !important;
              height: auto !important;
              margin: 0 auto !important;
              padding: 0 !important;
              display: block !important;
              background: transparent !important;
            }

            .table-wrapper {
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              display: flex !important;
              justify-content: center !important;
              align-items: flex-start !important;
              box-sizing: border-box !important;
            }

            .table-side-by-side {
              display: flex !important;
              flex-direction: row !important;
              gap: 1.5% !important;
              width: 100% !important;
              height: auto !important;
            }

            .table-side-by-side table {
              width: 47% !important;
              border: 1px solid black !important;
              border-collapse: collapse !important;
              background: white !important;
            }

            /* Table cells - white background for readability */
            table td,
            table th {
              background: white !important;
              font-family: Arial, "Times New Roman", serif !important;
              position: relative !important;
            }

            /* Ensure proper font for header text */
            table thead div,
            table thead p,
            table thead h4 {
              font-family: Arial, "Times New Roman", serif !important;
            }

            /* Fix overlapping content in official times section */
            table td div {
              position: relative !important;
            }

            /* Prevent page breaks */
            table {
              page-break-inside: avoid !important;
              table-layout: fixed !important;
            }

            /* Fixed widths for print/PDF */
            .dtr-responsive-header,
            .dtr-responsive-cell,
            .dtr-time-cell {
              width: auto !important;
              white-space: nowrap !important;
              word-break: keep-all !important;
            }

            /* Ensure proper spacing at bottom */
            table tbody tr:last-child td {
              padding-bottom: 20px !important;
            }
          }
        `}
      </style>

      <Box sx={{ px: { xs: 2, sm: 4, md: 6 } }}>
        {/* Header */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }} className="no-print">
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
                <Box
                  sx={{
                    position: 'absolute',
                    top: -50,
                    right: -50,
                    width: 200,
                    height: 200,
                    background: `radial-gradient(circle, ${alpha(
                      accentColor,
                      0.1
                    )} 0%, ${alpha(accentColor, 0)} 70%)`,
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -30,
                    left: '30%',
                    width: 150,
                    height: 150,
                    background: `radial-gradient(circle, ${alpha(
                      accentColor,
                      0.08
                    )} 0%, ${alpha(accentColor, 0)} 70%)`,
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
                        bgcolor: alpha(accentColor, 0.15),
                        mr: 4,
                        width: 64,
                        height: 64,
                        boxShadow: `0 8px 24px ${alpha(accentColor, 0.15)}`,
                      }}
                    >
                      <AccessTime
                        sx={{ color: textPrimaryColor, fontSize: 32 }}
                      />
                    </Avatar>
                    <Box>
                      <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                          fontWeight: 700,
                          mb: 1,
                          lineHeight: 1.2,
                          color: textPrimaryColor,
                        }}
                      >
                        Daily Time Record
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          opacity: 0.8,
                          fontWeight: 400,
                          color: textPrimaryColor,
                        }}
                      >
                        Filter your DTR records by date
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip
                      label="Faculty Records"
                      size="small"
                      sx={{
                        bgcolor: alpha(accentColor, 0.15),
                        color: textPrimaryColor,
                        fontWeight: 500,
                        '& .MuiChip-label': { px: 1 },
                      }}
                    />
                    <Tooltip title="Refresh Data">
                      <IconButton
                        onClick={() => window.location.reload()}
                        sx={{
                          bgcolor: alpha(accentColor, 0.1),
                          '&:hover': { bgcolor: alpha(accentColor, 0.2) },
                          color: textPrimaryColor,
                          width: 48,
                          height: 48,
                        }}
                      >
                        <AccessTime sx={{ fontSize: 24 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {/* Search Section */}
        <Fade in timeout={700}>
          <GlassCard
            className="no-print"
            sx={{
              mb: 4,
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
                p: 4,
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                color: textPrimaryColor,
                display: 'flex',
                alignItems: 'center',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              }}
            >
              <CalendarToday sx={{ fontSize: '1.8rem', mr: 2 }} />
              <Box>
                <Typography variant="h7" sx={{ opacity: 0.9 }}>
                  Select date range to view records
                </Typography>
              </Box>
            </Box>

            <Box sx={{ p: 4 }}>
              {/* Month Buttons */}
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  mb: 3,
                  justifyContent: 'center',
                }}
              >
                {months.map((month, index) => (
                  <ProfessionalButton
                    key={month}
                    variant="contained"
                    onClick={() => handleMonthClick(index)}
                    sx={{
                      backgroundColor: accentColor,
                      color: textSecondaryColor,
                      '&:hover': { backgroundColor: hoverColor },
                      py: 0.5,
                      px: 1.5,
                      fontSize: '0.8rem',
                    }}
                  >
                    {month}
                  </ProfessionalButton>
                ))}
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  alignItems: 'flex-end',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                <Box sx={{ minWidth: 225 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, mb: 1, color: textPrimaryColor }}
                  >
                    Employee Number
                  </Typography>
                  <ModernTextField
                    value={personID}
                    variant="outlined"
                    disabled
                    fullWidth
                  />
                </Box>

                <Box sx={{ minWidth: 225 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, mb: 1, color: textPrimaryColor }}
                  >
                    Start Date
                  </Typography>
                  <ModernTextField
                    label="Start Date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Box>

                <Box sx={{ minWidth: 225 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, mb: 1, color: textPrimaryColor }}
                  >
                    End Date
                  </Typography>
                  <ModernTextField
                    label="End Date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Box>

                <ProfessionalButton
                  variant="contained"
                  onClick={fetchRecords}
                  startIcon={<SearchOutlined />}
                  sx={{
                    backgroundColor: accentColor,
                    color: textSecondaryColor,
                    '&:hover': { backgroundColor: hoverColor },
                    py: 1.5,
                    px: 3,
                  }}
                >
                  Search
                </ProfessionalButton>
              </Box>
            </Box>
          </GlassCard>
        </Fade>

        {/* Records Table - Two Tables Side by Side */}
        <Fade in timeout={900}>
          <Paper
            elevation={4}
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              border: '1px solid rgba(109, 35, 35, 0.1)',
              mb: 4,
              width: '100%',
            }}
          >
            <Box sx={{ p: 5, overflowX: 'auto' }}>
              <div className="table-container" ref={dtrRef}>
                <div className="table-wrapper">
                  <div
                    style={{
                      display: 'flex',
                      gap: '1.5%',
                      justifyContent: 'center',
                    }}
                    className="table-side-by-side"
                  >
                    {/* First Table */}
                    <table
                      style={{
                        border: '1px solid black',
                        borderCollapse: 'collapse',
                        width: '47%',
                      }}
                      className="print-visble"
                    >
                      <thead
                        style={{ textAlign: 'center', position: 'relative' }}
                      >
                        <tr>
                          <div
                            style={{
                              position: 'absolute',
                              top: '1.5rem',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              fontWeight: 'bold',
                              fontSize: '13px',
                              fontFamily: 'Arial, "Times New Roman", serif',
                            }}
                          >
                            Republic of the Philippines
                          </div>

                          <td
                            colSpan="1"
                            style={{
                              position: 'relative',
                              padding: '0',
                              lineHeight: '0',
                              height: '0px',
                              textAlign: 'right',
                              marginRight: '0',
                            }}
                          >
                            <img
                              src={earistLogo}
                              alt="EARIST Logo"
                              width="55"
                              height="55"
                              style={{
                                position: 'absolute',
                                marginTop: '-14%',
                                left: '60%',
                              }}
                            />
                          </td>
                          <td colSpan="3">
                            <p
                              style={{
                                marginTop: '15%',
                                fontSize: '15px',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                marginLeft: '20%',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              EULOGIO "AMANG" RODRIGUEZ <br /> INSTITUTE OF
                              SCIENCE & TECHNOLOGY
                            </p>
                          </td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                        </tr>
                        <tr>
                          <td colSpan="9">
                            <p
                              style={{
                                fontSize: '14px',
                                fontWeight: 'bold',
                                lineHeight: '0',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              Nagtahan, Sampaloc Manila
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="9">
                            <p
                              style={{
                                fontSize: '12px',
                                fontWeight: 'bold',
                                lineHeight: '0',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              Civil Service Form No. 48
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td
                            colSpan="9"
                            style={{ padding: '2', lineHeight: '0' }}
                          >
                            <h4
                              style={{
                                fontFamily: 'Arial, "Times New Roman", serif',
                                textAlign: 'center',
                                marginTop: '15px',
                                fontWeight: 'bold',
                                fontSize: '20px',
                              }}
                            >
                              DAILY TIME RECORD
                            </h4>
                          </td>
                        </tr>
                        <tr style={{ position: 'relative' }}>
                          <td
                            colSpan="3"
                            style={{ padding: '2', lineHeight: '0' }}
                          >
                            <p
                              style={{
                                fontSize: '15px',
                                margin: '0',
                                height: '20px',
                                textAlign: 'left',
                                padding: '0 1rem',
                                marginTop: '6%',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              NAME: <b>{employeeName}</b>
                            </p>
                          </td>
                          <td></td>
                        </tr>
                        <tr>
                          <td
                            colSpan="5"
                            style={{ padding: '2', lineHeight: '0' }}
                          >
                            <p
                              style={{
                                fontSize: '15px',
                                margin: '0',
                                height: '10px',
                                paddingLeft: '1rem',
                                textAlign: 'Left',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              Covered Dates:{' '}
                              <b>
                                {formattedStartDate} - {formattedEndDate}
                              </b>
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td
                            colSpan="3"
                            style={{
                              padding: '2',
                              lineHeight: '2',
                              textAlign: 'left',
                            }}
                          >
                            <p
                              style={{
                                fontSize: '15px',
                                margin: '0',
                                paddingLeft: '1rem',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              For the month of:{' '}
                              <b>{startDate ? formatMonth(startDate) : ''}</b>
                            </p>
                          </td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                        </tr>
                        <tr>
                          <td
                            style={{
                              fontSize: '15px',
                              margin: '0',
                              height: '10px',
                              position: 'absolute',
                              paddingLeft: '1rem',
                              textAlign: 'left',
                              fontFamily: 'Arial, "Times New Roman", serif',
                            }}
                          >
                            Official hours for arrival (regular day) and
                            departure
                          </td>
                        </tr>

                        {/* Empty rows for spacing */}
                        {Array.from({ length: 15 }, (_, i) => (
                          <tr key={`empty1-${i}`}>
                            <td colSpan="3"></td>
                            <td></td>
                            <td></td>
                            <td></td>
                          </tr>
                        ))}

                        <tr style={{ position: 'relative' }}>
                          <td></td>
                          <td></td>
                          <td
                            style={{
                              position: 'absolute',
                              display: 'flex',
                              flexDirection: 'column',
                              right: '50%',
                              gap: '1px',
                              paddingBottom: '5rem',
                              fontFamily: 'Arial, "Times New Roman", serif',
                            }}
                          >
                            Regular days M-TH
                          </td>
                          <td></td>
                          <td></td>
                          <td
                            style={{
                              position: 'absolute',
                              display: 'flex',
                              flexDirection: 'column',
                              right: '5%',
                              gap: '1px',
                              paddingBottom: '2rem',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '15px',
                                fontWeight: 'bold',
                                margin: '0',
                                height: '10px',
                                textAlign: 'Left',
                                fontSize: '0.8rem',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              M -{' '}
                              {officialTimes['Monday']?.officialTimeIN ||
                                '00:00:00'}{' '}
                              -{' '}
                              {officialTimes['Monday']?.officialTimeOUT ||
                                '00:00:00'}
                            </div>

                            <div
                              style={{
                                fontSize: '15px',
                                fontWeight: 'bold',
                                margin: '0',
                                height: '10px',
                                textAlign: 'left',
                                fontSize: '0.8rem',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              T -{' '}
                              {officialTimes['Tuesday']?.officialTimeIN ||
                                '00:00:00'}{' '}
                              -{' '}
                              {officialTimes['Tuesday']?.officialTimeOUT ||
                                '00:00:00'}
                            </div>

                            <div
                              style={{
                                fontSize: '15px',
                                fontWeight: 'bold',
                                margin: '0',
                                height: '10px',
                                textAlign: 'Left',
                                fontSize: '0.8rem',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              W -{' '}
                              {officialTimes['Wednesday']?.officialTimeIN ||
                                '00:00:00'}{' '}
                              -{' '}
                              {officialTimes['Wednesday']?.officialTimeOUT ||
                                '00:00:00'}
                            </div>
                            <div
                              style={{
                                fontSize: '15px',
                                fontWeight: 'bold',
                                margin: '0',
                                height: '10px',
                                textAlign: 'left',
                                fontSize: '0.8rem',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              TH -{' '}
                              {officialTimes['Thursday']?.officialTimeIN ||
                                '00:00:00'}{' '}
                              -{' '}
                              {officialTimes['Thursday']?.officialTimeOUT ||
                                '00:00:00'}
                            </div>
                            <div
                              style={{
                                fontSize: '15px',
                                fontWeight: 'bold',
                                margin: '0',
                                height: '10px',
                                textAlign: 'Left',
                                fontSize: '0.8rem',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              F -{' '}
                              {officialTimes['Friday']?.officialTimeIN ||
                                '00:00:00'}{' '}
                              -{' '}
                              {officialTimes['Friday']?.officialTimeOUT ||
                                '00:00:00'}
                            </div>
                            <div
                              style={{
                                fontSize: '15px',
                                fontWeight: 'bold',
                                margin: '0',
                                height: '10px',
                                textAlign: 'Left',
                                fontSize: '0.8rem',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              SAT -{' '}
                              {officialTimes['Saturday']?.officialTimeIN ||
                                '00:00:00'}{' '}
                              -{' '}
                              {officialTimes['Saturday']?.officialTimeOUT ||
                                '00:00:00'}
                            </div>
                            <div
                              style={{
                                fontSize: '15px',
                                fontWeight: 'bold',
                                margin: '0',
                                height: '10px',
                                textAlign: 'Left',
                                fontSize: '0.8rem',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              SUN -{' '}
                              {officialTimes['Sunday']?.officialTimeIN ||
                                '00:00:00'}{' '}
                              -{' '}
                              {officialTimes['Sunday']?.officialTimeOUT ||
                                '00:00:00'}
                            </div>
                          </td>
                          <td></td>
                          <td></td>
                        </tr>

                        {/* Empty rows for spacing */}
                        {Array.from({ length: 10 }, (_, i) => (
                          <tr key={`empty2-${i}`}>
                            <td colSpan="3"></td>
                            <td></td>
                            <td></td>
                            <td></td>
                          </tr>
                        ))}

                        <tr>
                          <td
                            colSpan="3"
                            style={{
                              position: 'absolute',
                              display: 'flex',
                              justifyContent: 'left',
                              flexDirection: 'column',
                              right: '58.2%',
                              gap: '1px',
                              paddingBottom: '5rem',
                              fontFamily: 'Arial, "Times New Roman", serif',
                            }}
                          >
                            Saturdays
                          </td>
                          <td></td>
                          <td></td>
                        </tr>

                        {/* Empty rows for spacing */}
                        {Array.from({ length: 50 }, (_, i) => (
                          <tr key={`empty3-${i}`}>
                            <td colSpan="3"></td>
                            <td></td>
                            <td></td>
                            <td></td>
                          </tr>
                        ))}
                      </thead>
                      <tr>
                        <th
                          rowSpan="2"
                          style={{
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            border: '1px solid black',
                            fontFamily: 'Arial, "Times New Roman", serif',
                          }}
                          className="dtr-responsive-header"
                        >
                          DAY
                        </th>
                        <th
                          colSpan="2"
                          style={{
                            border: '1px solid black',
                            fontFamily: 'Arial, "Times New Roman", serif',
                          }}
                          className="dtr-responsive-header"
                        >
                          A.M.
                        </th>
                        <th
                          colSpan="2"
                          style={{
                            border: '1px solid black',
                            fontFamily: 'Arial, "Times New Roman", serif',
                          }}
                          className="dtr-responsive-header"
                        >
                          P.M.
                        </th>
                        <th
                          style={{
                            border: '1px solid black',
                            fontFamily: 'Arial, "Times New Roman", serif',
                          }}
                          className="dtr-responsive-header"
                        >
                          Late
                        </th>
                        <th
                          style={{
                            border: '1px solid black',
                            fontFamily: 'Arial, "Times New Roman", serif',
                          }}
                          className="dtr-responsive-header"
                        >
                          Undertime
                        </th>
                      </tr>
                      <tr style={{ textAlign: 'center' }}>
                        <td
                          style={{
                            border: '1px solid black',
                            whiteSpace: 'nowrap',
                            fontFamily: 'Arial, "Times New Roman", serif',
                          }}
                          className="dtr-responsive-cell"
                        >
                          Arrival
                        </td>
                        <td
                          style={{
                            border: '1px solid black',
                            whiteSpace: 'nowrap',
                            fontFamily: 'Arial, "Times New Roman", serif',
                          }}
                          className="dtr-responsive-cell"
                        >
                          Departure
                        </td>
                        <td
                          style={{
                            border: '1px solid black',
                            whiteSpace: 'nowrap',
                            fontFamily: 'Arial, "Times New Roman", serif',
                          }}
                          className="dtr-responsive-cell"
                        >
                          Arrival
                        </td>
                        <td
                          style={{
                            border: '1px solid black',
                            whiteSpace: 'nowrap',
                            fontFamily: 'Arial, "Times New Roman", serif',
                          }}
                          className="dtr-responsive-cell"
                        >
                          Departure
                        </td>
                        <td
                          style={{
                            border: '1px solid black',
                            whiteSpace: 'nowrap',
                            fontFamily: 'Arial, "Times New Roman", serif',
                          }}
                          className="dtr-responsive-cell"
                        >
                          Minutes
                        </td>
                        <td
                          style={{
                            border: '1px solid black',
                            whiteSpace: 'nowrap',
                            fontFamily: 'Arial, "Times New Roman", serif',
                          }}
                          className="dtr-responsive-cell"
                        >
                          Minutes
                        </td>
                      </tr>

                      <tbody>
                        {Array.from({ length: 31 }, (_, i) => {
                          const day = (i + 1).toString().padStart(2, '0');
                          const record = records.find((r) =>
                            r.date.endsWith(`-${day}`)
                          );

                          return (
                            <tr key={i}>
                              <td
                                style={{
                                  border: '1px solid black',
                                  textAlign: 'center',
                                  padding: '4px 8px',
                                  fontFamily: 'Arial, "Times New Roman", serif',
                                }}
                                className="dtr-responsive-cell"
                              >
                                {day}
                              </td>
                              <td
                                style={{
                                  border: '1px solid black',
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                  padding: '4px 8px',
                                  fontFamily: 'Arial, "Times New Roman", serif',
                                }}
                                className="dtr-time-cell"
                              >
                                {formatTime(record?.timeIN || '')}
                              </td>
                              <td
                                style={{
                                  border: '1px solid black',
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                  padding: '4px 8px',
                                  fontFamily: 'Arial, "Times New Roman", serif',
                                }}
                                className="dtr-time-cell"
                              >
                                {formatTime(record?.breaktimeIN || '')}
                              </td>
                              <td
                                style={{
                                  border: '1px solid black',
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                  padding: '4px 8px',
                                  fontFamily: 'Arial, "Times New Roman", serif',
                                }}
                                className="dtr-time-cell"
                              >
                                {formatTime(record?.breaktimeOUT || '')}
                              </td>
                              <td
                                style={{
                                  border: '1px solid black',
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                  padding: '4px 8px',
                                  fontFamily: 'Arial, "Times New Roman", serif',
                                }}
                                className="dtr-time-cell"
                              >
                                {formatTime(record?.timeOUT || '')}
                              </td>
                              <td
                                style={{
                                  border: '1px solid black',
                                  textAlign: 'center',
                                  padding: '4px 8px',
                                  whiteSpace: 'nowrap',
                                  fontFamily: 'Arial, "Times New Roman", serif',
                                }}
                                className="dtr-responsive-cell"
                              >
                                {record?.minutes || ''}
                              </td>
                              <td
                                style={{
                                  border: '1px solid black',
                                  textAlign: 'center',
                                  padding: '4px 8px',
                                  whiteSpace: 'nowrap',
                                  fontFamily: 'Arial, "Times New Roman", serif',
                                }}
                                className="dtr-responsive-cell"
                              >
                                {record?.minutes || ''}
                              </td>
                            </tr>
                          );
                        })}
                        <tr>
                          <td
                            colSpan="9"
                            style={{ padding: '20px 10px 10px 10px' }}
                          >
                            <div>
                              <hr
                                style={{
                                  borderTop: '3px solid black',
                                  width: '98%',
                                  margin: '0 auto',
                                }}
                              />
                              <p
                                style={{
                                  textAlign: 'justify',
                                  width: '95%',
                                  margin: '10px auto 0 auto',
                                  fontSize: '11px',
                                  lineHeight: '1.4',
                                  fontFamily: 'Arial, "Times New Roman", serif',
                                }}
                              >
                                I certify on my honor that the above is a true
                                and correct report of the hours of work
                                performed, record of which was made daily at the
                                time of arrival and departure from office.
                              </p>
                              <hr
                                style={{
                                  borderTop: '1px double black',
                                  width: '94%',
                                  margin: '15px auto 0 auto',
                                }}
                              />
                              <p
                                style={{
                                  textAlign: 'center',
                                  marginTop: '10px',
                                  fontSize: '11px',
                                  fontFamily: 'Arial, "Times New Roman", serif',
                                }}
                              >
                                Verified as to prescribe office hours.
                              </p>
                              <hr
                                style={{
                                  borderTop: '1px solid black',
                                  width: '94%',
                                  margin: '10px auto 0 auto',
                                  marginBottom: '10px',
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Second Table - Duplicate */}
                    <table
                      style={{
                        border: '1px solid black',
                        borderCollapse: 'collapse',
                        width: '47%',
                      }}
                      className="print-visble"
                    >
                      <thead
                        style={{ textAlign: 'center', position: 'relative' }}
                      >
                        <tr>
                          <div
                            style={{
                              position: 'absolute',
                              top: '1.5rem',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              fontWeight: 'bold',
                              fontSize: '13px',
                              fontFamily: 'Arial, "Times New Roman", serif',
                            }}
                          >
                            Republic of the Philippines
                          </div>

                          <td
                            colSpan="1"
                            style={{
                              position: 'relative',
                              padding: '0',
                              lineHeight: '0',
                              height: '0px',
                              textAlign: 'right',
                              marginRight: '0',
                            }}
                          >
                            <img
                              src={earistLogo}
                              alt="EARIST Logo"
                              width="55"
                              height="55"
                              style={{
                                position: 'absolute',
                                marginTop: '-14%',
                                left: '60%',
                              }}
                            />
                          </td>
                          <td colSpan="3">
                            <p
                              style={{
                                marginTop: '15%',
                                fontSize: '15px',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                marginLeft: '23%',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              EULOGIO "AMANG" RODRIGUEZ <br /> INSTITUTE OF
                              SCIENCE & TECHNOLOGY
                            </p>
                          </td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                        </tr>
                        <tr>
                          <td colSpan="9">
                            <p
                              style={{
                                fontSize: '14px',
                                fontWeight: 'bold',
                                lineHeight: '0',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              Nagtahan, Sampaloc Manila
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="9">
                            <p
                              style={{
                                fontSize: '12px',
                                fontWeight: 'bold',
                                lineHeight: '0',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              Civil Service Form No. 48
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td
                            colSpan="9"
                            style={{ padding: '2', lineHeight: '0' }}
                          >
                            <h4
                              style={{
                                fontFamily: 'Arial, "Times New Roman", serif',
                                textAlign: 'center',
                                marginTop: '15px',
                                fontWeight: 'bold',
                                fontSize: '20px',
                              }}
                            >
                              DAILY TIME RECORD
                            </h4>
                          </td>
                        </tr>
                        <tr style={{ position: 'relative' }}>
                          <td
                            colSpan="3"
                            style={{ padding: '2', lineHeight: '0' }}
                          >
                            <p
                              style={{
                                fontSize: '15px',
                                margin: '0',
                                height: '20px',
                                textAlign: 'left',
                                padding: '0 1rem',
                                marginTop: '6%',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              NAME: <b>{employeeName}</b>
                            </p>
                          </td>
                          <td></td>
                        </tr>
                        <tr>
                          <td
                            colSpan="5"
                            style={{ padding: '2', lineHeight: '0' }}
                          >
                            <p
                              style={{
                                fontSize: '15px',
                                margin: '0',
                                height: '10px',
                                paddingLeft: '1rem',
                                textAlign: 'Left',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              Covered Dates:{' '}
                              <b>
                                {formattedStartDate} - {formattedEndDate}
                              </b>
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td
                            colSpan="3"
                            style={{
                              padding: '2',
                              lineHeight: '2',
                              textAlign: 'left',
                            }}
                          >
                            <p
                              style={{
                                fontSize: '15px',
                                margin: '0',
                                paddingLeft: '1rem',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              For the month of:{' '}
                              <b>{startDate ? formatMonth(startDate) : ''}</b>
                            </p>
                          </td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                        </tr>
                        <tr>
                          <td
                            style={{
                              fontSize: '15px',
                              margin: '0',
                              height: '10px',
                              position: 'absolute',
                              paddingLeft: '1rem',
                              textAlign: 'left',
                              fontFamily: 'Arial, "Times New Roman", serif',
                            }}
                          >
                            Official hours for arrival (regular day) and
                            departure
                          </td>
                        </tr>

                        {/* Empty rows for spacing */}
                        {Array.from({ length: 15 }, (_, i) => (
                          <tr key={`empty1-${i}`}>
                            <td colSpan="3"></td>
                            <td></td>
                            <td></td>
                            <td></td>
                          </tr>
                        ))}

                        <tr style={{ position: 'relative' }}>
                          <td></td>
                          <td></td>
                          <td
                            style={{
                              position: 'absolute',
                              display: 'flex',
                              flexDirection: 'column',
                              right: '50%',
                              gap: '1px',
                              paddingBottom: '5rem',
                              fontFamily: 'Arial, "Times New Roman", serif',
                            }}
                          >
                            Regular days M-TH
                          </td>
                          <td></td>
                          <td></td>
                          <td
                            style={{
                              position: 'absolute',
                              display: 'flex',
                              flexDirection: 'column',
                              right: '5%',
                              gap: '1px',
                              paddingBottom: '2rem',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '15px',
                                fontWeight: 'bold',
                                margin: '0',
                                height: '10px',
                                textAlign: 'Left',
                                fontSize: '0.8rem',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              M -{' '}
                              {officialTimes['Monday']?.officialTimeIN ||
                                '00:00:00'}{' '}
                              -{' '}
                              {officialTimes['Monday']?.officialTimeOUT ||
                                '00:00:00'}
                            </div>

                            <div
                              style={{
                                fontSize: '15px',
                                fontWeight: 'bold',
                                margin: '0',
                                height: '10px',
                                textAlign: 'left',
                                fontSize: '0.8rem',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              T -{' '}
                              {officialTimes['Tuesday']?.officialTimeIN ||
                                '00:00:00'}{' '}
                              -{' '}
                              {officialTimes['Tuesday']?.officialTimeOUT ||
                                '00:00:00'}
                            </div>

                            <div
                              style={{
                                fontSize: '15px',
                                fontWeight: 'bold',
                                margin: '0',
                                height: '10px',
                                textAlign: 'Left',
                                fontSize: '0.8rem',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              W -{' '}
                              {officialTimes['Wednesday']?.officialTimeIN ||
                                '00:00:00'}{' '}
                              -{' '}
                              {officialTimes['Wednesday']?.officialTimeOUT ||
                                '00:00:00'}
                            </div>
                            <div
                              style={{
                                fontSize: '15px',
                                fontWeight: 'bold',
                                margin: '0',
                                height: '10px',
                                textAlign: 'left',
                                fontSize: '0.8rem',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              TH -{' '}
                              {officialTimes['Thursday']?.officialTimeIN ||
                                '00:00:00'}{' '}
                              -{' '}
                              {officialTimes['Thursday']?.officialTimeOUT ||
                                '00:00:00'}
                            </div>
                            <div
                              style={{
                                fontSize: '15px',
                                fontWeight: 'bold',
                                margin: '0',
                                height: '10px',
                                textAlign: 'Left',
                                fontSize: '0.8rem',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              F -{' '}
                              {officialTimes['Friday']?.officialTimeIN ||
                                '00:00:00'}{' '}
                              -{' '}
                              {officialTimes['Friday']?.officialTimeOUT ||
                                '00:00:00'}
                            </div>
                            <div
                              style={{
                                fontSize: '15px',
                                fontWeight: 'bold',
                                margin: '0',
                                height: '10px',
                                textAlign: 'Left',
                                fontSize: '0.8rem',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              SAT -{' '}
                              {officialTimes['Saturday']?.officialTimeIN ||
                                '00:00:00'}{' '}
                              -{' '}
                              {officialTimes['Saturday']?.officialTimeOUT ||
                                '00:00:00'}
                            </div>
                            <div
                              style={{
                                fontSize: '15px',
                                fontWeight: 'bold',
                                margin: '0',
                                height: '10px',
                                textAlign: 'Left',
                                fontSize: '0.8rem',
                                fontFamily: 'Arial, "Times New Roman", serif',
                              }}
                            >
                              SUN -{' '}
                              {officialTimes['Sunday']?.officialTimeIN ||
                                '00:00:00'}{' '}
                              -{' '}
                              {officialTimes['Sunday']?.officialTimeOUT ||
                                '00:00:00'}
                            </div>
                          </td>
                          <td></td>
                          <td></td>
                        </tr>

                        {/* Empty rows for spacing */}
                        {Array.from({ length: 10 }, (_, i) => (
                          <tr key={`empty2-${i}`}>
                            <td colSpan="3"></td>
                            <td></td>
                            <td></td>
                            <td></td>
                          </tr>
                        ))}

                        <tr>
                          <td
                            colSpan="3"
                            style={{
                              position: 'absolute',
                              display: 'flex',
                              justifyContent: 'left',
                              flexDirection: 'column',
                              right: '58.2%',
                              gap: '1px',
                              paddingBottom: '5rem',
                              fontFamily: 'Arial, "Times New Roman", serif',
                            }}
                          >
                            Saturdays
                          </td>
                          <td></td>
                          <td></td>
                        </tr>

                        {/* Empty rows for spacing */}
                        {Array.from({ length: 50 }, (_, i) => (
                          <tr key={`empty3-${i}`}>
                            <td colSpan="3"></td>
                            <td></td>
                            <td></td>
                            <td></td>
                          </tr>
                        ))}
                      </thead>
                      <tr>
                        <th
                          rowSpan="2"
                          style={{
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            border: '1px solid black',
                            fontFamily: 'Arial, "Times New Roman", serif',
                          }}
                          className="dtr-responsive-header"
                        >
                          DAY
                        </th>
                        <th
                          colSpan="2"
                          style={{
                            border: '1px solid black',
                            fontFamily: 'Arial, "Times New Roman", serif',
                          }}
                          className="dtr-responsive-header"
                        >
                          A.M.
                        </th>
                        <th
                          colSpan="2"
                          style={{
                            border: '1px solid black',
                            fontFamily: 'Arial, "Times New Roman", serif',
                          }}
                          className="dtr-responsive-header"
                        >
                          P.M.
                        </th>
                        <th
                          style={{
                            border: '1px solid black',
                            fontFamily: 'Arial, "Times New Roman", serif',
                          }}
                          className="dtr-responsive-header"
                        >
                          Late
                        </th>
                        <th
                          style={{
                            border: '1px solid black',
                            fontFamily: 'Arial, "Times New Roman", serif',
                          }}
                          className="dtr-responsive-header"
                        >
                          Undertime
                        </th>
                      </tr>
                      <tr style={{ textAlign: 'center' }}>
                        <td
                          style={{
                            border: '1px solid black',
                            whiteSpace: 'nowrap',
                            fontFamily: 'Arial, "Times New Roman", serif',
                          }}
                          className="dtr-responsive-cell"
                        >
                          Arrival
                        </td>
                        <td
                          style={{
                            border: '1px solid black',
                            whiteSpace: 'nowrap',
                            fontFamily: 'Arial, "Times New Roman", serif',
                          }}
                          className="dtr-responsive-cell"
                        >
                          Departure
                        </td>
                        <td
                          style={{
                            border: '1px solid black',
                            whiteSpace: 'nowrap',
                            fontFamily: 'Arial, "Times New Roman", serif',
                          }}
                          className="dtr-responsive-cell"
                        >
                          Arrival
                        </td>
                        <td
                          style={{
                            border: '1px solid black',
                            whiteSpace: 'nowrap',
                            fontFamily: 'Arial, "Times New Roman", serif',
                          }}
                          className="dtr-responsive-cell"
                        >
                          Departure
                        </td>
                        <td
                          style={{
                            border: '1px solid black',
                            whiteSpace: 'nowrap',
                            fontFamily: 'Arial, "Times New Roman", serif',
                          }}
                          className="dtr-responsive-cell"
                        >
                          Hours
                        </td>
                        <td
                          style={{
                            border: '1px solid black',
                            whiteSpace: 'nowrap',
                            fontFamily: 'Arial, "Times New Roman", serif',
                          }}
                          className="dtr-responsive-cell"
                        >
                          Minutes
                        </td>
                      </tr>

                      <tbody>
                        {Array.from({ length: 31 }, (_, i) => {
                          const day = (i + 1).toString().padStart(2, '0');
                          const record = records.find((r) =>
                            r.date.endsWith(`-${day}`)
                          );

                          return (
                            <tr key={i}>
                              <td
                                style={{
                                  border: '1px solid black',
                                  textAlign: 'center',
                                  padding: '4px 8px',
                                  fontFamily: 'Arial, "Times New Roman", serif',
                                }}
                                className="dtr-responsive-cell"
                              >
                                {day}
                              </td>
                              <td
                                style={{
                                  border: '1px solid black',
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                  padding: '4px 8px',
                                  fontFamily: 'Arial, "Times New Roman", serif',
                                }}
                                className="dtr-time-cell"
                              >
                                {formatTime(record?.timeIN || '')}
                              </td>
                              <td
                                style={{
                                  border: '1px solid black',
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                  padding: '4px 8px',
                                  fontFamily: 'Arial, "Times New Roman", serif',
                                }}
                                className="dtr-time-cell"
                              >
                                {formatTime(record?.breaktimeIN || '')}
                              </td>
                              <td
                                style={{
                                  border: '1px solid black',
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                  padding: '4px 8px',
                                  fontFamily: 'Arial, "Times New Roman", serif',
                                }}
                                className="dtr-time-cell"
                              >
                                {formatTime(record?.breaktimeOUT || '')}
                              </td>
                              <td
                                style={{
                                  border: '1px solid black',
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                  padding: '4px 8px',
                                  fontFamily: 'Arial, "Times New Roman", serif',
                                }}
                                className="dtr-time-cell"
                              >
                                {formatTime(record?.timeOUT || '')}
                              </td>
                              <td
                                style={{
                                  border: '1px solid black',
                                  textAlign: 'center',
                                  padding: '4px 8px',
                                  whiteSpace: 'nowrap',
                                  fontFamily: 'Arial, "Times New Roman", serif',
                                }}
                                className="dtr-responsive-cell"
                              >
                                {record?.hours || ''}
                              </td>
                              <td
                                style={{
                                  border: '1px solid black',
                                  textAlign: 'center',
                                  padding: '4px 8px',
                                  whiteSpace: 'nowrap',
                                  fontFamily: 'Arial, "Times New Roman", serif',
                                }}
                                className="dtr-responsive-cell"
                              >
                                {record?.minutes || ''}
                              </td>
                            </tr>
                          );
                        })}
                        <tr>
                          <td
                            colSpan="9"
                            style={{ padding: '20px 10px 10px 10px' }}
                          >
                            <div>
                              <hr
                                style={{
                                  borderTop: '3px solid black',
                                  width: '98%',
                                  margin: '0 auto',
                                }}
                              />
                              <p
                                style={{
                                  textAlign: 'justify',
                                  width: '95%',
                                  margin: '10px auto 0 auto',
                                  fontSize: '11px',
                                  lineHeight: '1.4',
                                  fontFamily: 'Arial, "Times New Roman", serif',
                                }}
                              >
                                I certify on my honor that the above is a true
                                and correct report of the hours of work
                                performed, record of which was made daily at the
                                time of arrival and departure from office.
                              </p>
                              <hr
                                style={{
                                  borderTop: '1px double black',
                                  width: '94%',
                                  margin: '15px auto 0 auto',
                                }}
                              />
                              <p
                                style={{
                                  textAlign: 'center',
                                  marginTop: '10px',
                                  fontSize: '11px',
                                  fontFamily: 'Arial, "Times New Roman", serif',
                                }}
                              >
                                Verified as to prescribe office hours.
                              </p>
                              <hr
                                style={{
                                  borderTop: '1px solid black',
                                  width: '94%',
                                  margin: '10px auto 0 auto',
                                  marginBottom: '10px',
                                  marginRight: '20px',
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </Box>
          </Paper>
        </Fade>

        {/* Print and Download Buttons */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 2,
            mt: 2,
            mb: 4,
          }}
        >
          <ProfessionalButton
            variant="contained"
            onClick={printPage}
            startIcon={<PrintIcon />}
            className="no-print"
            sx={{
              backgroundColor: accentColor,
              color: textSecondaryColor,
              '&:hover': { backgroundColor: accentDark },
              py: 1.5,
              px: 4,
            }}
          >
            Print
          </ProfessionalButton>
          <ProfessionalButton
            variant="contained"
            onClick={downloadPDF}
            startIcon={<PrintIcon />}
            className="no-print"
            sx={{
              backgroundColor: accentColor,
              color: textSecondaryColor,
              '&:hover': { backgroundColor: accentDark },
              py: 1.5,
              px: 4,
            }}
          >
            Download PDF
          </ProfessionalButton>
        </Box>
      </Box>
    </Container>
  );
};

export default DailyTimeRecord;
