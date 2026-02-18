import API_BASE_URL from '../../apiConfig';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { AccessTime, CalendarToday, SearchOutlined } from '@mui/icons-material';
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
  CircularProgress as MCircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import earistLogo from '../../assets/earistLogo.png';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { alpha } from '@mui/material/styles';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';

// Helper function to convert hex to rgb
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
        result[3],
        16,
      )}`
    : '109, 35, 35';
};

// --- FIXED STYLED COMPONENTS (Removed Transforms to stop movement) ---

const GlassCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  backdropFilter: 'blur(10px)',
  overflow: 'hidden',
  transition: 'box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
}));

const ProfessionalButton = styled(Button)(
  ({ theme, variant, color = 'primary' }) => ({
    borderRadius: 12,
    fontWeight: 600,
    padding: '12px 24px',
    transition: 'box-shadow 0.2s ease-in-out, background-color 0.2s',
    textTransform: 'none',
    fontSize: '0.95rem',
    letterSpacing: '0.025em',
    boxShadow:
      variant === 'contained' ? '0 4px 14px rgba(254, 249, 225, 0.25)' : 'none',
    '&:hover': {
      boxShadow:
        variant === 'contained'
          ? '0 6px 20px rgba(254, 249, 225, 0.35)'
          : 'none',
    },
    '&:active': {
      boxShadow: 'none',
    },
  }),
);

const ModernTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    transition:
      'box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
    },
    '&.Mui-focused': {
      boxShadow: '0 4px 20px rgba(254, 249, 225, 0.25)',
      backgroundColor: 'rgba(255, 255, 255, 1)',
    },
  },
  '& .MuiInputLabel-root': {
    fontWeight: 500,
  },
}));

const DailyTimeRecordServiceCredits = () => {
  const { settings } = useSystemSettings();
  const [personID, setPersonID] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [records, setRecords] = useState([]);
  const [employeeName, setEmployeeName] = useState('');
  const [officialTimes, setOfficialTimes] = useState({});
  const dtrRef = React.useRef(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [suspensions, setSuspensions] = useState([]);

  // Year selector (mirrors DailyTimeRecordOverall / AttendanceState)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  // Use a single constant width (in) for DTR rendering/capture (same as Overall)
  const DTR_WIDTH_IN = '8.7in';

  // Get colors from system settings
  const primaryColor = settings.accentColor || '#FEF9E1';
  const secondaryColor = settings.backgroundColor || '#FFF8E7';
  const accentColor = settings.primaryColor || '#6d2323';
  const accentDark = settings.secondaryColor || '#8B3333';
  const textPrimaryColor = settings.textPrimaryColor || '#6d2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';
  const hoverColor = settings.hoverColor || '#6D2323';

  // ACCESS: page access control
  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('daily-time-record-service-credits');

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
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setPersonID(decoded.employeeNumber);
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
          type: 'SERVICE_CREDIT',
        },
        getAuthHeaders(),
      );

      const data = response.data;

      // Filter to show only records with SERVICE special times
      const serviceRecords = data.filter(record => 
        record.specialType === 'SERVICE' && (record.specialTimeIN || record.specialTimeOUT)
      );

      if (data.length > 0) {
        setRecords(serviceRecords);
        const { firstName, lastName, middleName } = data[0];
        const full = `${firstName || ''} ${middleName ? middleName + ' ' : ''}${
          lastName || ''
        }`.trim();
        setEmployeeName(full || 'Unknown');
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

  const fetchOfficialTimes = async (employeeID) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/officialtimetable/${employeeID}`,
        getAuthHeaders(),
      );

      const data = response.data;

      const officialTimesMap = data.reduce((acc, record) => {
        acc[record.day] = {
          officialTimeIN: record.officialTimeIN,
          officialTimeOUT: record.officialTimeOUT,
          officialBreaktimeIN: record.officialBreaktimeIN,
          officialBreaktimeOUT: record.officialBreaktimeOUT,
          officialHonorariumTimeIN: record.officialHonorariumTimeIN,
          officialHonorariumTimeOUT: record.officialHonorariumTimeOUT,
          officialServiceCreditTimeIN: record.officialServiceCreditTimeIN,
          officialServiceCreditTimeOUT: record.officialServiceCreditTimeOUT,
          officialOverTimeIN: record.officialOverTimeIN,
          officialOverTimeOUT: record.officialOverTimeOUT,
        };
        return acc;
      }, {});

      setOfficialTimes(officialTimesMap);
    } catch (error) {
      console.error('Error fetching official times:', error);
      setOfficialTimes({});
    }
  };

  useEffect(() => {
    if (personID) {
      fetchOfficialTimes(personID);
    }
  }, [personID]);

  // Fetch holidays and suspensions
  useEffect(() => {
    const fetchHolidaysAndSuspensions = async () => {
      try {
        const [holidaysRes, suspensionsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/holiday`, getAuthHeaders()),
          axios.get(`${API_BASE_URL}/api/suspensions`, getAuthHeaders()),
        ]);
        setHolidays(Array.isArray(holidaysRes.data) ? holidaysRes.data : []);
        setSuspensions(
          Array.isArray(suspensionsRes.data) ? suspensionsRes.data : [],
        );
      } catch (err) {
        console.error('Error fetching holidays/suspensions:', err);
        setHolidays([]);
        setSuspensions([]);
      }
    };
    fetchHolidaysAndSuspensions();
  }, []);

  // Automatically refetch records when personID + date range changes so DTR times update "realtime"
  useEffect(() => {
    if (personID && startDate && endDate) {
      fetchRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personID, startDate, endDate]);

  // Capture helpers (mirror Overall behavior)
  const ensureCaptureStyles = (el) => {
    if (!el) return {};
    const orig = {
      backgroundColor: el.style.backgroundColor,
      width: el.style.width,
      visibility: el.style.visibility,
      display: el.style.display,
      position: el.style.position,
      left: el.style.left,
      zIndex: el.style.zIndex,
      opacity: el.style.opacity,
    };
    el.style.backgroundColor = '#ffffff';
    el.style.width = DTR_WIDTH_IN;
    el.style.visibility = 'visible';
    el.style.display = 'block';
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    el.style.zIndex = '10000';
    el.style.opacity = '1';
    return orig;
  };

  const restoreCaptureStyles = (el, orig) => {
    if (!el || !orig) return;
    try {
      el.style.backgroundColor = orig.backgroundColor || '';
      el.style.width = orig.width || '';
      el.style.visibility = orig.visibility || '';
      el.style.display = orig.display || '';
      el.style.position = orig.position || '';
      el.style.left = orig.left || '';
      el.style.zIndex = orig.zIndex || '';
      el.style.opacity = orig.opacity || '';
    } catch (e) {
      /* noop */
    }
  };

  const printPage = async () => {
    if (!dtrRef.current) return;

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'a4',
      });

      // Ensure capture-friendly styles
      const orig = ensureCaptureStyles(dtrRef.current);

      // Wait for styles to apply
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(dtrRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      restoreCaptureStyles(dtrRef.current, orig);

      const imgData = canvas.toDataURL('image/png');

      const dtrWidth = 8;
      const dtrHeight = 9.5;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const xOffset = (pageWidth - dtrWidth) / 2;
      const yOffset = (pageHeight - dtrHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, dtrWidth, dtrHeight);
      pdf.autoPrint();
      const blobUrl = pdf.output('bloburl');
      window.open(blobUrl, '_blank');
    } catch (error) {
      console.error('Error generating print view:', error);
    }
  };

  const downloadPDF = async () => {
    if (!dtrRef.current) return;

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'a4',
      });

      const orig = ensureCaptureStyles(dtrRef.current);

      // Wait for styles to apply
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(dtrRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      restoreCaptureStyles(dtrRef.current, orig);

      const imgData = canvas.toDataURL('image/png');

      const dtrWidth = 8;
      const dtrHeight = 10;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const xOffset = (pageWidth - dtrWidth) / 2;
      const yOffset = (pageHeight - dtrHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, dtrWidth, dtrHeight);
      pdf.save(`DTR-ServiceCredits-${employeeName}-${formatMonth(startDate)}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const formatMonth = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { month: 'long' };
    return date.toLocaleDateString(undefined, options).toUpperCase();
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.replace(/\s+/g, ' ').trim();
  };

  // Helper function to get official times for a specific date
  const getOfficialTimesForDate = (fullDate) => {
    if (!fullDate) return {};
    const date = new Date(fullDate);
    const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayMap = {
      0: 'Sunday',
      1: 'Monday',
      2: 'Tuesday',
      3: 'Wednesday',
      4: 'Thursday',
      5: 'Friday',
      6: 'Saturday',
    };
    const dayName = dayMap[dayIndex];
    return officialTimes[dayName] || {};
  };

  const formatStartDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatEndDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate();
    const year = date.getFullYear();
    return `${day}, ${year}`;
  };

  const formattedStartDate = formatStartDate(startDate);
  const formattedEndDate = formatEndDate(endDate);

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

  // ACCESSING UI states (loading / denied)
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
          <MCircularProgress sx={{ color: '#6d2323', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#6d2323' }}>
            Loading access information...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (hasAccess === false) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Daily Time Record - Service Credits. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }

  // Render header used inside the single-user table (mirrors DailyTimeRecordOverall),
  // but the employee name has its own full-width row (prevents truncation).
  const renderHeader = () => {
    const dataFontSize = '10px';
    return (
      <thead style={{ textAlign: 'center' }}>
        <tr>
          <td
            colSpan="7"
            style={{
              position: 'relative',
              padding: '25px 10px 0px 10px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontWeight: 'bold',
                fontSize: '11px',
                fontFamily: 'Arial, "Times New Roman", serif',
                color: 'black',
                marginBottom: '2px',
              }}
            >
              Republic of the Philippines
            </div>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '3px',
              }}
            >
              <img
                src={earistLogo}
                alt="Logo"
                width="50"
                height="50"
                style={{
                  position: 'absolute',
                  left: '10px',
                }}
              />
              <p
                style={{
                  margin: '0',
                  fontSize: '11.5px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  fontFamily: 'Arial, "Times New Roman", serif',
                  lineHeight: '1.2',
                }}
              >
                EULOGIO "AMANG" RODRIGUEZ <br /> INSTITUTE OF SCIENCE &
                TECHNOLOGY
              </p>
            </div>
          </td>
        </tr>

        <tr>
          <td
            colSpan="7"
            style={{ textAlign: 'center', padding: '0px 5px 2px 5px' }}
          >
            <p
              style={{
                fontSize: '11px',
                fontWeight: 'bold',
                margin: '0',
                fontFamily: 'Arial, serif',
              }}
            >
              Nagtahan, Sampaloc Manila
            </p>
          </td>
        </tr>

        <tr>
          <td colSpan="7" style={{ textAlign: 'center', padding: '2px 5px' }}>
            <p
              style={{
                fontSize: '8px',
                fontWeight: 'bold',
                margin: '0',
                fontFamily: 'Arial, serif',
              }}
            >
              Civil Service Form No. 48
            </p>
          </td>
        </tr>

        <tr>
          <td
            colSpan="7"
            style={{
              textAlign: 'center',
              padding: '2px 5px',
              lineHeight: '1.2',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <h4
                style={{
                  fontFamily: 'Times New Roman, serif',
                  margin: '2px 0',
                  fontWeight: 'bold',
                  fontSize: '16px',
                }}
              >
                DAILY TIME RECORD
              </h4>
              <div
                style={{
                  fontFamily: 'Times New Roman, serif',
                  fontSize: '16px',
                  marginTop: '-2px',
                  fontWeight: 'bold',
                }}
              >
                SERVICE CREDITS
              </div>
            </div>
          </td>
        </tr>

        {/* Employee name section matching DailyTimeRecordOverall.jsx layout */}
        <tr>
          <td
            colSpan="7"
            style={{
              paddingTop: '10px',
              paddingBottom: '5px',
              lineHeight: '1.1',
              verticalAlign: 'top',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                margin: '0 auto',
                fontFamily: 'Arial, serif',
                width: '100%',
                maxWidth: '400px',
                position: 'relative',
              }}
            >
              <div
                style={{
                  borderBottom: '2px solid black',
                  width: '100%',
                  margin: '2px 0 3px 0',
                }}
              />
              {/* Employee Name */}
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  fontFamily: 'Times New Roman',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {employeeName || ''}
              </div>

              {/* Underline */}
              <div
                style={{
                  borderBottom: '2px solid black',
                  width: '100%',
                  margin: '2px 0 3px 0',
                }}
              />

              {/* Label */}
              <div
                style={{
                  fontSize: '9px',
                  textAlign: 'center',
                  fontFamily: 'Times New Roman',
                }}
              >
                NAME
              </div>
            </div>
          </td>
        </tr>

        <tr>
          <td
            colSpan="7"
            style={{ padding: '2px 5px', lineHeight: '1.1', textAlign: 'left' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                paddingLeft: '5px',
                fontFamily: 'Times New Roman, serif',
                fontSize: '10px',
              }}
            >
              <span style={{ marginRight: '6px' }}>Covered Dates:</span>
              <div style={{ minWidth: '220px', flexGrow: 1 }}>
                <div
                  style={{
                    fontWeight: 'bold',
                    textAlign: 'left',
                    fontSize: '10px',
                    fontFamily: 'Times New Roman, serif',
                  }}
                >
                  {formattedStartDate} - {formattedEndDate}
                </div>
              </div>
            </div>
          </td>
        </tr>

        <tr>
          <td
            colSpan="7"
            style={{ padding: '2px 5px', lineHeight: '1.2', textAlign: 'left' }}
          >
            <p
              style={{
                fontSize: '11px',
                margin: '0',
                paddingLeft: '5px',
                fontFamily: 'Times New Roman, serif',
              }}
            >
              For the month of: <b>{startDate ? formatMonth(startDate) : ''}</b>
            </p>
          </td>
        </tr>

        <tr>
          <td
            colSpan="7"
            style={{
              padding: '8px 5px 2px 5px',
              textAlign: 'left',
              fontSize: '10px',
              fontFamily: 'Arial, serif',
              lineHeight: '1.2',
            }}
          >
            Official hours for service credits (arrival and departure)
          </td>
        </tr>

        <tr>
          <td colSpan="7" style={{ padding: '2px 5px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                paddingLeft: '5%',
                height: '14px',
                marginBottom: '0px',
                fontFamily: 'Arial, serif',
                fontSize: '10px',
              }}
            >
              <span style={{ marginRight: '5px' }}>Regular Days:</span>
              <span
                style={{
                  display: 'inline-block',
                  borderBottom: '1.5px solid black',
                  flexGrow: 1,
                  minWidth: '300px',
                  marginBottom: '2px',
                }}
              ></span>
            </div>
          </td>
        </tr>

        {Array.from({ length: 2 }, (_, i) => (
          <tr key={`empty2-${i}`}>
            <td colSpan="7"></td>
          </tr>
        ))}

        <tr>
          <th
            rowSpan="2"
            style={{
              border: '1px solid black',
              fontFamily: 'Arial, serif',
              fontSize: dataFontSize,
            }}
          >
            DAY
          </th>
          <th
            colSpan="2"
            style={{
              border: '1px solid black',
              fontFamily: 'Arial, serif',
              fontSize: dataFontSize,
            }}
          >
            A.M.
          </th>
          <th
            colSpan="2"
            style={{
              border: '1px solid black',
              fontFamily: 'Arial, serif',
              fontSize: dataFontSize,
            }}
          >
            P.M.
          </th>
          <th
            style={{
              border: '1px solid black',
              fontFamily: 'Arial, serif',
              fontSize: dataFontSize,
            }}
          >
            Late
          </th>
          <th
            style={{
              border: '1px solid black',
              fontFamily: 'Arial, serif',
              fontSize: dataFontSize,
            }}
          >
            Undertime
          </th>
        </tr>
        <tr style={{ textAlign: 'center' }}>
          <td
            style={{
              border: '1px solid black',
              fontSize: '9px',
              fontFamily: 'Arial, serif',
            }}
          >
            Arrival
          </td>
          <td
            style={{
              border: '1px solid black',
              fontSize: '9px',
              fontFamily: 'Arial, serif',
              width: 'fit-content',
              whiteSpace: 'nowrap',
            }}
          >
            Departure
          </td>
          <td
            style={{
              border: '1px solid black',
              fontSize: '9px',
              fontFamily: 'Arial, serif',
              width: 'fit-content',
              whiteSpace: 'nowrap',
            }}
          >
            Arrival
          </td>
          <td
            style={{
              border: '1px solid black',
              fontSize: '9px',
              fontFamily: 'Arial, serif',
              width: 'fit-content',
              whiteSpace: 'nowrap',
            }}
          >
            Departure
          </td>
          <td
            style={{
              border: '1px solid black',
              fontSize: '9px',
              fontFamily: 'Arial, serif',
            }}
          >
            Min
          </td>
          <td
            style={{
              border: '1px solid black',
              fontSize: '9px',
              fontFamily: 'Arial, serif',
            }}
          >
            Min
          </td>
        </tr>
      </thead>
    );
  };

  const cellStyle = {
    border: '1px solid black',
    textAlign: 'center',
    padding: '0 1px',
    fontFamily: 'Arial, serif',
    fontSize: '10px',
    height: '16px',
    whiteSpace: 'nowrap',
  };

  // Helper function to check if a date falls within a date range
  const isDateInRange = (date, startDate, endDate) => {
    if (!date) return false;
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(0, 0, 0, 0);

    if (start && end) {
      return checkDate >= start && checkDate <= end;
    } else if (start) {
      return checkDate >= start;
    } else if (end) {
      return checkDate <= end;
    }
    return false;
  };

  // Check if a date is a holiday or suspension and has attendance record
  const getDateIndicator = (dateString, record) => {
    if (!dateString) return null;

    const date = dateString.split('T')[0]; // Get YYYY-MM-DD format

    // Check suspensions first (higher priority)
    const suspension = suspensions.find((s) => {
      const start = s.date_start || s.date;
      const end = s.date_end || s.date;
      return isDateInRange(date, start, end);
    });

    if (suspension) {
      return {
        type: 'suspension',
        label: 'SUSPENSION',
        bgColor: 'rgba(211, 47, 47, 0.2)', // red tint
        textColor: '#000000',
        borderColor: '#d32f2f',
      };
    }

    // Check holidays
    // NOTE: highlight based on the holiday's original date range regardless of its current 'status' (ended or active)
    const holiday = holidays.find((h) => {
      const start = h.date_start || h.date;
      const end = h.date_end || h.date;
      return isDateInRange(date, start, end);
    });

    if (holiday) {
      return {
        type: 'holiday',
        label: 'HOLIDAY',
        bgColor: 'rgba(237, 108, 2, 0.25)', // orange tint
        textColor: '#000000',
        borderColor: '#ed6c02',
      };
    }

    return null;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4, mt: -5 }}>
      <style>{`
        /* Force vertical scrollbar to prevent center-jump when data loads */
        html { overflow-y: scroll; }

        .dtr-responsive-header, .dtr-responsive-cell, .dtr-time-cell {
          width: auto !important;
          max-width: none !important;
        }

        .dtr-time-cell { white-space: nowrap !important; word-break: keep-all !important; }

        table { table-layout: auto !important; }

        @page { size: A4; margin: 0; }

        @media print {
          .no-print { display: none !important; }
          .header, .top-banner, .page-banner, header, footer, .MuiDrawer-root, .MuiAppBar-root { display: none !important; }
          html, body { width: 21cm; height: 29.7cm; margin: 0; padding: 0; background: white; }
          .MuiContainer-root { max-width: 100% !important; width: 21cm !important; margin: 0 auto !important; padding: 0 !important; display: flex !important; justify-content: center !important; align-items: center !important; background: white !important; }
          .MuiPaper-root, .MuiBox-root, .MuiCard-root { background: transparent !important; box-shadow: none !important; margin: 0 !important; }
          .table-container { width: 100% !important; height: auto !important; margin: 0 auto !important; padding: 0 !important; display: block !important; background: transparent !important; }
          .table-wrapper { width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; display: flex !important; justify-content: center !important; align-items: flex-start !important; box-sizing: border-box !important; }
          .table-side-by-side { display: flex !important; flex-direction: row !important; gap: 1.5% !important; width: 100% !important; height: auto !important; }
          .table-side-by-side table { width: 47% !important; border: 1px solid black !important; border-collapse: collapse !important; background: white !important; }
          table td, table th { background: white !important; font-family: Arial, "Times New Roman", serif !important; position: relative !important; overflow: visible !important; }
          table thead div, table thead p, table thead h4 { font-family: Arial, "Times New Roman", serif !important; }
          table td div { position: relative !important; }
          table { page-break-inside: avoid !important; table-layout: fixed !important; }
          .dtr-responsive-header, .dtr-responsive-cell, .dtr-time-cell { width: auto !important; white-space: nowrap !important; word-break: keep-all !important; }
          table tbody tr:last-child td { padding-bottom: 20px !important; }
        }
      `}</style>

      <Box sx={{ px: { xs: 2, sm: 4, md: 6 } }}>
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }} className="no-print">
            <GlassCard
              sx={{
                background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
                boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`,
                border: `1px solid ${alpha(accentColor, 0.1)}`,
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
                    background: `radial-gradient(circle, ${alpha(accentColor, 0.1)} 0%, ${alpha(accentColor, 0)} 70%)`,
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -30,
                    left: '30%',
                    width: 150,
                    height: 150,
                    background: `radial-gradient(circle, ${alpha(accentColor, 0.08)} 0%, ${alpha(accentColor, 0)} 70%)`,
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
                        Filter your service credits DTR records by date
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip
                      label="Service Credits"
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

        <Fade in timeout={700}>
          <GlassCard
            className="no-print"
            sx={{
              mb: 4,
              background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
              boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`,
              border: `1px solid ${alpha(accentColor, 0.1)}`,
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
              {/* Year & Month Selector (align with Overall view) */}
              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      color: textPrimaryColor,
                      fontWeight: 600,
                    }}
                  >
                    Select Month & Year
                  </Typography>
                  <FormControl sx={{ minWidth: 140 }}>
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

                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    justifyContent: 'center',
                  }}
                >
                  {months.map((month, index) => {
                    const isSelected = selectedMonth === index;
                    return (
                      <ProfessionalButton
                        key={month}
                        variant={isSelected ? 'contained' : 'outlined'}
                        size="medium"
                        onClick={() => handleMonthClick(index)}
                        sx={{
                          borderColor: accentColor,
                          backgroundColor: isSelected
                            ? accentColor
                            : 'transparent',
                          color: isSelected
                            ? textSecondaryColor
                            : textPrimaryColor,
                          py: 1.5,
                          fontWeight: 600,
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

        <Fade in timeout={900}>
          <Paper
            elevation={4}
            sx={{
              borderRadius: 2,
              overflowX: 'auto',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              border: '1px solid rgba(109, 35, 35, 0.1)',
              mb: 4,
              width: '100%',
            }}
          >
            <Box sx={{ p: 5, minWidth: 'fit-content' }}>
              <div className="table-container" ref={dtrRef}>
                <div className="table-wrapper">
                  <div
                    style={{
                      display: 'flex',
                      gap: '2%',
                      width: DTR_WIDTH_IN,
                      minWidth: '8.5in',
                      margin: '0 auto',
                      backgroundColor: 'white',
                    }}
                    className="table-side-by-side"
                  >
                    <>
                      {/* Table 1 */}
                      <table
                        style={{
                          border: '1px solid black',
                          borderCollapse: 'collapse',
                          width: '49%',
                          tableLayout: 'fixed',
                        }}
                      >
                        {renderHeader()}
                        <tbody>
                          {Array.from({ length: 31 }, (_, i) => {
                            const day = (i + 1).toString().padStart(2, '0');
                            const record = records.find(
                              (r) => r.date && r.date.endsWith(`-${day}`),
                            );
                            // Construct full date
                            let fullDate = null;
                            if (record?.date) {
                              fullDate = record.date;
                            } else if (startDate) {
                              const [year, month] = startDate.split('-');
                              fullDate = `${year}-${month}-${day}`;
                            } else if (selectedMonth !== null) {
                              const monthNum = String(
                                selectedMonth + 1,
                              ).padStart(2, '0');
                              fullDate = `${selectedYear}-${monthNum}-${day}`;
                            }
                            const indicator = getDateIndicator(
                              fullDate,
                              record,
                            );
                            const officialTmsForDate = getOfficialTimesForDate(fullDate);

                            return (
                              <tr key={i}>
                                <td
                                  style={{
                                    ...cellStyle,
                                    backgroundColor: indicator
                                      ? indicator.bgColor
                                      : 'transparent',
                                  }}
                                >
                                  {day}
                                </td>
                                <td
                                  style={{
                                    ...cellStyle,
                                    backgroundColor: indicator
                                      ? indicator.bgColor
                                      : 'transparent',
                                    position: 'relative',
                                  }}
                                >
                                  {indicator && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: indicator.bgColor,
                                        zIndex: 0,
                                        opacity: 0.3,
                                      }}
                                    />
                                  )}
                                  <span
                                    style={{ position: 'relative', zIndex: 1 }}
                                  >
                                    {formatTime(record?.specialTimeIN || '')}
                                  </span>
                                </td>
                                <td
                                  style={{
                                    ...cellStyle,
                                    backgroundColor: indicator
                                      ? indicator.bgColor
                                      : 'transparent',
                                    position: 'relative',
                                  }}
                                >
                                  {indicator && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: indicator.bgColor,
                                        zIndex: 0,
                                        opacity: 0.3,
                                      }}
                                    />
                                  )}
                                  <span
                                    style={{ position: 'relative', zIndex: 1 }}
                                  >
                                    {''}
                                  </span>
                                </td>
                                <td
                                  style={{
                                    ...cellStyle,
                                    backgroundColor: indicator
                                      ? indicator.bgColor
                                      : 'transparent',
                                    position: 'relative',
                                  }}
                                >
                                  {indicator && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: indicator.bgColor,
                                        zIndex: 0,
                                        opacity: 0.3,
                                      }}
                                    />
                                  )}
                                  <span
                                    style={{ position: 'relative', zIndex: 1 }}
                                  >
                                    {''}
                                  </span>
                                </td>
                                <td
                                  style={{
                                    ...cellStyle,
                                    backgroundColor: indicator
                                      ? indicator.bgColor
                                      : 'transparent',
                                    position: 'relative',
                                  }}
                                >
                                  {indicator && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: indicator.bgColor,
                                        zIndex: 0,
                                        opacity: 0.3,
                                      }}
                                    />
                                  )}
                                  <span
                                    style={{ position: 'relative', zIndex: 1 }}
                                  >
                                    {formatTime(record?.specialTimeOUT || '')}
                                  </span>
                                </td>
                                <td
                                  style={{
                                    ...cellStyle,
                                    backgroundColor: indicator
                                      ? indicator.bgColor
                                      : 'transparent',
                                    position: 'relative',
                                  }}
                                >
                                  {indicator && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: indicator.bgColor,
                                        zIndex: 0,
                                        opacity: 0.3,
                                      }}
                                    />
                                  )}
                                  <span
                                    style={{ position: 'relative', zIndex: 1 }}
                                  >
                                    {''}
                                  </span>
                                </td>
                                <td
                                  style={{
                                    ...cellStyle,
                                    backgroundColor: indicator
                                      ? indicator.bgColor
                                      : 'transparent',
                                    position: 'relative',
                                  }}
                                >
                                  {indicator && (
                                    <>
                                      <div
                                        style={{
                                          position: 'absolute',
                                          top: 0,
                                          left: 0,
                                          right: 0,
                                          bottom: 0,
                                          backgroundColor: indicator.bgColor,
                                          zIndex: 0,
                                          opacity: 0.3,
                                        }}
                                      />
                                      <div
                                        style={{
                                          position: 'absolute',
                                          top: 0,
                                          left: 0,
                                          right: 0,
                                          bottom: 0,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '7px',
                                          fontWeight: 'bold',
                                          color: indicator.textColor,
                                          backgroundColor: indicator.bgColor,
                                          zIndex: 1,
                                          pointerEvents: 'none',
                                          opacity: 0.9,
                                        }}
                                      >
                                        {indicator.label}
                                      </div>
                                    </>
                                  )}
                                  <span
                                    style={{ position: 'relative', zIndex: 2 }}
                                  >
                                    {''}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          <tr>
                            <td colSpan="7" style={{ padding: '10px 5px' }}>
                              <hr
                                style={{
                                  borderTop: '2px solid black',
                                  width: '100%',
                                }}
                              />
                              <p
                                style={{
                                  textAlign: 'justify',
                                  fontSize: '9px',
                                  lineHeight: '1.4',
                                  fontFamily: 'Times New Roman, serif',
                                  margin: '5px 0',
                                }}
                              >
                                I CERTIFY on my honor that the above is a true
                                and correct report
                                <br />
                                of the hours of work performed, record of which
                                was made daily at
                                <br />
                                the time of arrival and at the time of departure
                                from office.
                              </p>
                              <div
                                style={{
                                  width: '50%',
                                  marginLeft: 'auto',
                                  textAlign: 'center',
                                  marginTop: '40px',
                                }}
                              >
                                <hr
                                  style={{
                                    borderTop: '2px solid black',
                                    margin: 0,
                                  }}
                                />
                                <p
                                  style={{
                                    fontSize: '9px',
                                    fontFamily: 'Arial, serif',
                                    margin: '5px 0 0 0',
                                  }}
                                >
                                  Signature
                                </p>
                              </div>
                              <div style={{ width: '100%', marginTop: '15px' }}>
                                <hr
                                  style={{
                                    borderTop: '1px solid black',
                                    width: '100%',
                                    margin: 0,
                                  }}
                                />
                                <hr
                                  style={{
                                    borderTop: '1.5px solid black',
                                    width: '100%',
                                    margin: '2px 0 0 0',
                                  }}
                                />
                                <p
                                  style={{
                                    paddingLeft: '30px',
                                    fontSize: '9px',
                                    fontFamily: 'Arial, serif',
                                    margin: '5px 0 0 0',
                                  }}
                                >
                                  Verified as to prescribed office hours.
                                </p>
                              </div>
                              <div
                                style={{
                                  width: '80%',
                                  marginLeft: 'auto',
                                  marginTop: '15px',
                                  textAlign: 'center',
                                }}
                              >
                                <hr
                                  style={{
                                    borderTop: '2px solid black',
                                    margin: 0,
                                  }}
                                />
                                <p
                                  style={{
                                    fontSize: '9px',
                                    fontFamily: 'Times New Roman, serif',
                                    margin: '2px 0 0 0',
                                  }}
                                >
                                  In-Charge
                                </p>
                                <p
                                  style={{
                                    fontSize: '9px',
                                    fontFamily: 'Arial, serif',
                                    margin: '0',
                                  }}
                                >
                                  (Signature Over Printed Name)
                                </p>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <table
                        style={{
                          border: '1px solid black',
                          borderCollapse: 'collapse',
                          width: '49%',
                          tableLayout: 'fixed',
                        }}
                      >
                        {renderHeader()}
                        <tbody>
                          {Array.from({ length: 31 }, (_, i) => {
                            const day = (i + 1).toString().padStart(2, '0');
                            const record = records.find(
                              (r) => r.date && r.date.endsWith(`-${day}`),
                            );
                            let fullDate = null;
                            if (record?.date) {
                              fullDate = record.date;
                            } else if (startDate) {
                              const [year, month] = startDate.split('-');
                              fullDate = `${year}-${month}-${day}`;
                            } else if (selectedMonth !== null) {
                              const monthNum = String(
                                selectedMonth + 1,
                              ).padStart(2, '0');
                              fullDate = `${selectedYear}-${monthNum}-${day}`;
                            }
                            const indicator = getDateIndicator(
                              fullDate,
                              record,
                            );
                            const officialTmsForDate = getOfficialTimesForDate(fullDate);

                            return (
                              <tr key={i}>
                                <td
                                  style={{
                                    ...cellStyle,
                                    backgroundColor: indicator
                                      ? indicator.bgColor
                                      : 'transparent',
                                  }}
                                >
                                  {day}
                                </td>
                                <td
                                  style={{
                                    ...cellStyle,
                                    backgroundColor: indicator
                                      ? indicator.bgColor
                                      : 'transparent',
                                    position: 'relative',
                                  }}
                                >
                                  {indicator && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: indicator.bgColor,
                                        zIndex: 0,
                                        opacity: 0.3,
                                      }}
                                    />
                                  )}
                                  <span
                                    style={{ position: 'relative', zIndex: 1 }}
                                  >
                                    {formatTime(record?.specialTimeIN || '')}
                                  </span>
                                </td>
                                <td
                                  style={{
                                    ...cellStyle,
                                    backgroundColor: indicator
                                      ? indicator.bgColor
                                      : 'transparent',
                                    position: 'relative',
                                  }}
                                >
                                  {indicator && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: indicator.bgColor,
                                        zIndex: 0,
                                        opacity: 0.3,
                                      }}
                                    />
                                  )}
                                  <span
                                    style={{ position: 'relative', zIndex: 1 }}
                                  >
                                    {''}
                                  </span>
                                </td>
                                <td
                                  style={{
                                    ...cellStyle,
                                    backgroundColor: indicator
                                      ? indicator.bgColor
                                      : 'transparent',
                                    position: 'relative',
                                  }}
                                >
                                  {indicator && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: indicator.bgColor,
                                        zIndex: 0,
                                        opacity: 0.3,
                                      }}
                                    />
                                  )}
                                  <span
                                    style={{ position: 'relative', zIndex: 1 }}
                                  >
                                    {''}
                                  </span>
                                </td>
                                <td
                                  style={{
                                    ...cellStyle,
                                    backgroundColor: indicator
                                      ? indicator.bgColor
                                      : 'transparent',
                                    position: 'relative',
                                  }}
                                >
                                  {indicator && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: indicator.bgColor,
                                        zIndex: 0,
                                        opacity: 0.3,
                                      }}
                                    />
                                  )}
                                  <span
                                    style={{ position: 'relative', zIndex: 1 }}
                                  >
                                    {formatTime(record?.specialTimeOUT || '')}
                                  </span>
                                </td>
                                <td
                                  style={{
                                    ...cellStyle,
                                    backgroundColor: indicator
                                      ? indicator.bgColor
                                      : 'transparent',
                                    position: 'relative',
                                  }}
                                >
                                  {indicator && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: indicator.bgColor,
                                        zIndex: 0,
                                        opacity: 0.3,
                                      }}
                                    />
                                  )}
                                  <span
                                    style={{ position: 'relative', zIndex: 1 }}
                                  >
                                    {''}
                                  </span>
                                </td>
                                <td
                                  style={{
                                    ...cellStyle,
                                    backgroundColor: indicator
                                      ? indicator.bgColor
                                      : 'transparent',
                                    position: 'relative',
                                  }}
                                >
                                  {indicator && (
                                    <>
                                      <div
                                        style={{
                                          position: 'absolute',
                                          top: 0,
                                          left: 0,
                                          right: 0,
                                          bottom: 0,
                                          backgroundColor: indicator.bgColor,
                                          zIndex: 0,
                                          opacity: 0.3,
                                        }}
                                      />
                                      <div
                                        style={{
                                          position: 'absolute',
                                          top: 0,
                                          left: 0,
                                          right: 0,
                                          bottom: 0,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '7px',
                                          fontWeight: 'bold',
                                          color: indicator.textColor,
                                          backgroundColor: indicator.bgColor,
                                          zIndex: 1,
                                          pointerEvents: 'none',
                                          opacity: 0.9,
                                        }}
                                      >
                                        {indicator.label}
                                      </div>
                                    </>
                                  )}
                                  <span
                                    style={{ position: 'relative', zIndex: 2 }}
                                  >
                                    {''}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          <tr>
                            <td colSpan="7" style={{ padding: '10px 5px' }}>
                              <hr
                                style={{
                                  borderTop: '2px solid black',
                                  width: '100%',
                                }}
                              />
                              <p
                                style={{
                                  textAlign: 'justify',
                                  fontSize: '9px',
                                  lineHeight: '1.4',
                                  fontFamily: 'Times New Roman, serif',
                                  margin: '5px 0',
                                }}
                              >
                                I CERTIFY on my honor that the above is a true
                                and correct report
                                <br />
                                of the hours of work performed, record of which
                                was made daily at
                                <br />
                                the time of arrival and at the time of departure
                                from office.
                              </p>
                              <div
                                style={{
                                  width: '50%',
                                  marginLeft: 'auto',
                                  textAlign: 'center',
                                  marginTop: '40px',
                                }}
                              >
                                <hr
                                  style={{
                                    borderTop: '2px solid black',
                                    margin: 0,
                                  }}
                                />
                                <p
                                  style={{
                                    fontSize: '9px',
                                    fontFamily: 'Arial, serif',
                                    margin: '5px 0 0 0',
                                  }}
                                >
                                  Signature
                                </p>
                              </div>
                              <div style={{ width: '100%', marginTop: '15px' }}>
                                <hr
                                  style={{
                                    borderTop: '1px solid black',
                                    width: '100%',
                                    margin: 0,
                                  }}
                                />
                                <hr
                                  style={{
                                    borderTop: '1.5px solid black',
                                    width: '100%',
                                    margin: '2px 0 0 0',
                                  }}
                                />
                                <p
                                  style={{
                                    paddingLeft: '30px',
                                    fontSize: '9px',
                                    fontFamily: 'Arial, serif',
                                    margin: '5px 0 0 0',
                                  }}
                                >
                                  Verified as to prescribed office hours.
                                </p>
                              </div>
                              <div
                                style={{
                                  width: '80%',
                                  marginLeft: 'auto',
                                  marginTop: '15px',
                                  textAlign: 'center',
                                }}
                              >
                                <hr
                                  style={{
                                    borderTop: '2px solid black',
                                    margin: 0,
                                  }}
                                />
                                <p
                                  style={{
                                    fontSize: '9px',
                                    fontFamily: 'Times New Roman, serif',
                                    margin: '2px 0 0 0',
                                  }}
                                >
                                  In-Charge
                                </p>
                                <p
                                  style={{
                                    fontSize: '9px',
                                    fontFamily: 'Arial, serif',
                                    margin: '0',
                                  }}
                                >
                                  (Signature Over Printed Name)
                                </p>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </>
                  </div>
                </div>
              </div>
            </Box>
          </Paper>
        </Fade>

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

export default DailyTimeRecordServiceCredits;
