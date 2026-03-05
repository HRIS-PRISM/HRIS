import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Box, Button, Container, TextField, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Card, CardContent, CardHeader, Grid, InputAdornment, Divider, Avatar, IconButton, Tooltip, Badge, Fade, Alert, LinearProgress, alpha, Stack, Chip, useTheme, styled, Breadcrumbs, Link, Skeleton, Backdrop, CircularProgress, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { WorkHistory, Person, CalendarToday, Today, ArrowBackIos, ArrowForwardIos, Clear, SaveAs, Refresh, Home, Assessment, DateRange, FilterList, DateRange as DateRangeIcon, Download, FileDownload } from "@mui/icons-material";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { useNavigate } from 'react-router-dom';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';

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

const PremiumTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: 16,
  overflow: 'hidden',
  boxShadow: '0 4px 24px rgba(109, 35, 35, 0.06)',
  border: '1px solid rgba(109, 35, 35, 0.08)',
}));

const PremiumTableCell = styled(TableCell)(({ theme, isHeader = false, bgColor = null }) => ({
  fontWeight: isHeader ? 600 : 500,
  padding: '14px 16px',
  borderBottom: isHeader ? '2px solid rgba(254, 249, 225, 0.5)' : '1px solid rgba(109, 35, 35, 0.06)',
  fontSize: '0.85rem',
  letterSpacing: '0.025em',
  backgroundColor: bgColor ? bgColor : 'transparent',
  whiteSpace: 'nowrap',
}));

const AttendanceModuleFaculty = () => {
  const { settings } = useSystemSettings();
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [attendanceData, setAttendanceData] = useState([]);
  const navigate = useNavigate();
  const theme = useTheme();

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
  // The identifier 'attendance-module-faculty-40hrs' should match the component_identifier in the pages table
  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('attendance-module-faculty-40hrs');
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

  useEffect(() => {
    const storedEmployeeNumber = localStorage.getItem('employeeNumber');
    const storedStartDate = localStorage.getItem('startDate');
    const storedEndDate = localStorage.getItem('endDate');

    if (storedEmployeeNumber) setEmployeeNumber(storedEmployeeNumber);
    if (storedStartDate) setStartDate(storedStartDate);
    if (storedEndDate) setEndDate(storedEndDate);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    localStorage.setItem('employeeNumber', employeeNumber);
    localStorage.setItem('startDate', startDate);
    localStorage.setItem('endDate', endDate);

    try {
      const response = await axios.get(`${API_BASE_URL}/attendance/api/attendance`, {
        params: {
          personId: employeeNumber,
          startDate,
          endDate,
        },
        ...getAuthHeaders(),
      });

      const processedData = response.data.map((row) => {
        const { timeIN, timeOUT, breaktimeIN, breaktimeOUT, officialBreaktimeIN, officialBreaktimeOUT, officialTimeIN, officialTimeOUT, officialHonorariumTimeIN, officialHonorariumTimeOUT, officialServiceCreditTimeIN, officialServiceCreditTimeOUT, officialOverTimeIN, officialOverTimeOUT } = row;

        const defaultTime = "132:00:00 AM";
        // Parse the times for comparison
        const parsedDefaultTime = dayjs(`2024-01-01 ${defaultTime}`, "YYYY-MM-DD hh:mm:ss A");

        const parsedTimeIN = dayjs(`2024-01-01 ${timeIN}`, "YYYY-MM-DD hh:mm:ss A"); // Example date
        const parsedTimeOUT = dayjs(`2024-01-01 ${timeOUT}`, "YYYY-MM-DD hh:mm:ss A");
        const parsedBreaktimeIN = dayjs(`2024-01-01 ${breaktimeIN}`, "YYYY-MM-DD hh:mm:ss A"); // Example date
        const parsedBreaktimeOUT = dayjs(`2024-01-01 ${breaktimeOUT}`, "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialBreaktimeIN = dayjs(`2024-01-01 ${officialBreaktimeIN}`, "YYYY-MM-DD hh:mm:ss A"); // Example date
        const parsedOfficialBreaktimeOUT = dayjs(`2024-01-01 ${officialBreaktimeOUT}`, "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialTimeIN = dayjs(`2024-01-01 ${officialTimeIN}`, "YYYY-MM-DD hh:mm:ss A"); // Example date
        const parsedOfficialTimeOUT = dayjs(`2024-01-01 ${officialTimeOUT}`, "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialHonorariumTimeIN = dayjs(`2024-01-01 ${officialHonorariumTimeIN}`, "YYYY-MM-DD hh:mm:ss A"); // Example date
        const parsedOfficialHonorariumTimeOUT = dayjs(`2024-01-01 ${officialHonorariumTimeOUT}`, "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialServiceCreditTimeIN = dayjs(`2024-01-01 ${officialServiceCreditTimeIN}`, "YYYY-MM-DD hh:mm:ss A"); // Example date
        const parsedOfficialServiceCreditTimeOUT = dayjs(`2024-01-01 ${officialServiceCreditTimeOUT}`, "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialOverTimeIN = dayjs(`2024-01-01 ${officialOverTimeIN}`, "YYYY-MM-DD hh:mm:ss A"); // Example date
        const parsedOfficialOverTimeOUT = dayjs(`2024-01-01 ${officialOverTimeOUT}`, "YYYY-MM-DD hh:mm:ss A");

        const OfficialTimeMorning = parsedTimeIN.isBefore(parsedOfficialTimeIN) ? parsedOfficialTimeIN.format("hh:mm:ss A") : parsedTimeIN.format("hh:mm:ss A");

        const OfficialTimeAfternoon = parsedTimeOUT.isAfter(parsedOfficialTimeOUT) ? parsedOfficialTimeOUT.format("hh:mm:ss A") : parsedTimeOUT.format("hh:mm:ss A");

        const HonorariumTimeIN = parsedTimeIN.isBefore(parsedOfficialHonorariumTimeIN) ? parsedOfficialHonorariumTimeIN.format("hh:mm:ss A") : parsedTimeIN.format("hh:mm:ss A");

        const HonorariumTimeOUT = parsedTimeOUT.isAfter(parsedOfficialHonorariumTimeOUT) ? parsedOfficialHonorariumTimeOUT.format("hh:mm:ss A") : parsedTimeOUT.format("hh:mm:ss A");

        const ServiceCreditTimeIN = parsedTimeIN.isBefore(parsedOfficialServiceCreditTimeIN) ? parsedOfficialServiceCreditTimeIN.format("hh:mm:ss A") : parsedTimeIN.format("hh:mm:ss A");

        const ServiceCreditTimeOUT = parsedTimeOUT.isAfter(parsedOfficialServiceCreditTimeOUT) ? parsedOfficialServiceCreditTimeOUT.format("hh:mm:ss A") : parsedTimeOUT.format("hh:mm:ss A");

        const OverTimeIN = parsedTimeIN.isBefore(parsedOfficialOverTimeIN) ? parsedOfficialOverTimeIN.format("hh:mm:ss A") : parsedTimeIN.format("hh:mm:ss A");

        const OverTimeOUT = parsedTimeOUT.isAfter(parsedOfficialOverTimeOUT) ? parsedOfficialOverTimeOUT.format("hh:mm:ss A") : parsedTimeOUT.format("hh:mm:ss A");

        const OfficialBreakAM = parsedBreaktimeIN.isAfter(parsedOfficialBreaktimeIN) ? parsedOfficialBreaktimeIN.format("hh:mm:ss A") : parsedBreaktimeIN.format("hh:mm:ss A");

        const OfficialBreakPM = parsedBreaktimeOUT.isAfter(parsedOfficialBreaktimeOUT) ? parsedBreaktimeOUT.format("hh:mm:ss A") : parsedOfficialBreaktimeOUT.format("hh:mm:ss A");

        // start faculty render AM --------------------------------------------------------

        // rendered time
        // Convert time strings to Date objects
        const startDateFacultyAM = new Date(`01/01/2000 ${timeIN}`);
        const endDateFacultyAM = new Date(`01/01/2000 ${officialBreaktimeIN}`);
        const startOfficialTimeFacultyAM = new Date(`01/01/2000 ${officialTimeIN}`);
        const endOfficialTimeFacultyAM = new Date(`01/01/2000 ${officialBreaktimeIN}`);

        const defaultTimeFacultyAM = "00:00:00 AM";
        const midnightFacultyAM = new Date(`01/01/2000 ${defaultTimeFacultyAM}`);

        const timeinfacultyAM = startDateFacultyAM > endOfficialTimeFacultyAM ? midnightFacultyAM : startDateFacultyAM < startOfficialTimeFacultyAM ? startOfficialTimeFacultyAM : startDateFacultyAM;
        const timeoutfacultyAM = timeinfacultyAM === midnightFacultyAM ? midnightFacultyAM : endDateFacultyAM;

        // Calculate difference in milliseconds
        const diffMsAM = timeoutfacultyAM - timeinfacultyAM;

        // Convert milliseconds to hours, minutes, seconds
        const hoursFacultyAM = Math.floor(diffMsAM / (1000 * 60 * 60));
        const minutesFacultyAM = Math.floor((diffMsAM % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyAM = Math.floor((diffMsAM % (1000 * 60)) / 1000);

        // Format output as HH:MM:SS RENDERERED TIME
        const formattedFacultyRenderedTimeAM = [String(hoursFacultyAM).padStart(2, "0"), String(minutesFacultyAM).padStart(2, "0"), String(secondsFacultyAM).padStart(2, "0")].join(":");

        //end rendered time

        //  max rendered time

        // Calculate difference in milliseconds MAX RENDERED TIME
        const diffMsAMFacultyAM = endOfficialTimeFacultyAM - startOfficialTimeFacultyAM;

        // Convert milliseconds to hours, minutes, seconds
        const hoursFacultyMRTAM = Math.floor(diffMsAMFacultyAM / (1000 * 60 * 60));
        const minutesFacultyMRTAM = Math.floor((diffMsAMFacultyAM % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyMRTAM = Math.floor((diffMsAMFacultyAM % (1000 * 60)) / 1000);

        // Format output as HH:MM:SS
        const formattedFacultyMaxRenderedTimeAM = [String(hoursFacultyMRTAM).padStart(2, "0"), String(minutesFacultyMRTAM).padStart(2, "0"), String(secondsFacultyMRTAM).padStart(2, "0")].join(":");

        // Calculate difference in milliseconds MAX RENDERED TIME

        const tardFinalformattedFacultyRenderedTimeAM = new Date(`01/01/2000 ${formattedFacultyRenderedTimeAM}`);
        const tardFinalformattedFacultyMaxRenderedTimeAM = new Date(`01/01/2000 ${formattedFacultyMaxRenderedTimeAM}`);

        const finalcalcFacultyAM = tardFinalformattedFacultyMaxRenderedTimeAM - tardFinalformattedFacultyRenderedTimeAM;

        // Convert milliseconds to hours, minutes, seconds
        const hoursfinalcalcFacultyAM = Math.floor(finalcalcFacultyAM / (1000 * 60 * 60));
        const minutesfinalcalcFacultyAM = Math.floor((finalcalcFacultyAM % (1000 * 60 * 60)) / (1000 * 60));
        const secondsfinalcalcFacultyAM = Math.floor((finalcalcFacultyAM % (1000 * 60)) / 1000);

        // Format output as HH:MM:SS
        const formattedfinalcalcFacultyAM = [String(hoursfinalcalcFacultyAM).padStart(2, "0"), String(minutesfinalcalcFacultyAM).padStart(2, "0"), String(secondsfinalcalcFacultyAM).padStart(2, "0")].join(":");

        // // end max rendered time

        // END faculty render AM --------------------------------------------------------

        // start faculty render PM --------------------------------------------------------

        // rendered time
        // Convert time strings to Date objects
        const startDateFacultyPM = new Date(`01/01/2000 ${officialBreaktimeOUT}`);
        const endDateFacultyPM = new Date(`01/01/2000 ${timeOUT}`);
        const startOfficialTimeFacultyPM = new Date(`01/01/2000 ${officialBreaktimeOUT}`);
        const endOfficialTimeFacultyPM = new Date(`01/01/2000 ${officialTimeOUT}`);

        const defaultTimeFacultyPM = "00:00:00 PM";
        const midnightFacultyPM = new Date(`01/01/2000 ${defaultTimeFacultyPM}`);
        const timeoutfacultyPM = endDateFacultyPM < startOfficialTimeFacultyPM ? midnightFacultyPM : endDateFacultyPM > endOfficialTimeFacultyPM ? endOfficialTimeFacultyPM : endDateFacultyPM;
        const timeinfacultyPM = timeoutfacultyPM === midnightFacultyPM ? midnightFacultyPM : startDateFacultyPM;

        // Calculate difference in milliseconds
        const diffMsPM = timeoutfacultyPM - timeinfacultyPM;

        // Convert milliseconds to hours, minutes, seconds
        const hoursFacultyPM = Math.floor(diffMsPM / (1000 * 60 * 60));
        const minutesFacultyPM = Math.floor((diffMsPM % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyPM = Math.floor((diffMsPM % (1000 * 60)) / 1000);

        // Format output as HH:MM:SS RENDERERED TIME
        const formattedFacultyRenderedTimePM = [String(hoursFacultyPM).padStart(2, "0"), String(minutesFacultyPM).padStart(2, "0"), String(secondsFacultyPM).padStart(2, "0")].join(":");

        //end rendered time

        //  max rendered time

        // Calculate difference in milliseconds MAX RENDERED TIME
        const diffMsPMFacultyPM = endOfficialTimeFacultyPM - startOfficialTimeFacultyPM;

        // Convert milliseconds to hours, minutes, seconds
        const hoursFacultyMRTPM = Math.floor(diffMsPMFacultyPM / (1000 * 60 * 60));
        const minutesFacultyMRTPM = Math.floor((diffMsPMFacultyPM % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyMRTPM = Math.floor((diffMsPMFacultyPM % (1000 * 60)) / 1000);

        // Format output as HH:MM:SS
        const formattedFacultyMaxRenderedTimePM = [String(hoursFacultyMRTPM).padStart(2, "0"), String(minutesFacultyMRTPM).padStart(2, "0"), String(secondsFacultyMRTPM).padStart(2, "0")].join(":");

        // Calculate difference in milliseconds MAX RENDERED TIME

        const tardFinalformattedFacultyRenderedTimePM = new Date(`01/01/2000 ${formattedFacultyRenderedTimePM}`);
        const tardFinalformattedFacultyMaxRenderedTimePM = new Date(`01/01/2000 ${formattedFacultyMaxRenderedTimePM}`);

        const finalcalcFacultyPM = tardFinalformattedFacultyMaxRenderedTimePM - tardFinalformattedFacultyRenderedTimePM;

        // Convert milliseconds to hours, minutes, seconds
        const hoursfinalcalcFacultyPM = Math.floor(finalcalcFacultyPM / (1000 * 60 * 60));
        const minutesfinalcalcFacultyPM = Math.floor((finalcalcFacultyPM % (1000 * 60 * 60)) / (1000 * 60));
        const secondsfinalcalcFacultyPM = Math.floor((finalcalcFacultyPM % (1000 * 60)) / 1000);

        // Format output as HH:MM:SS
        const formattedfinalcalcFacultyPM = [String(hoursfinalcalcFacultyPM).padStart(2, "0"), String(minutesfinalcalcFacultyPM).padStart(2, "0"), String(secondsfinalcalcFacultyPM).padStart(2, "0")].join(":");

        // // end max rendered time
        // END faculty render PM --------------------------------------------------------

        // HN ------------------------------------------------------------------------------

        // rendered time
        // Convert time strings to Date objects
        const startDateFacultyHN = new Date(`01/01/2000 ${timeIN}`);
        const endDateFacultyHN = new Date(`01/01/2000 ${timeOUT}`);
        const startOfficialTimeFacultyHN = new Date(`01/01/2000 ${officialHonorariumTimeIN}`);
        const endOfficialTimeFacultyHN = new Date(`01/01/2000 ${officialHonorariumTimeOUT}`);

        const defaultTimeFacultyHN = "00:00:00 AM";
        const midnightFacultyHN = new Date(`01/01/2000 ${defaultTimeFacultyHN}`);

        const timeinfacultyHN = endDateFacultyHN < startOfficialTimeFacultyHN ? midnightFacultyHN : startDateFacultyHN > endOfficialTimeFacultyHN ? midnightFacultyHN : startDateFacultyHN < startOfficialTimeFacultyHN ? startOfficialTimeFacultyHN : startDateFacultyHN;
        const timeoutfacultyHN = timeinfacultyHN === midnightFacultyHN ? midnightFacultyHN : endDateFacultyHN < startOfficialTimeFacultyHN ? midnightFacultyHN : endDateFacultyHN < endOfficialTimeFacultyHN ? endDateFacultyHN : endOfficialTimeFacultyHN;

        // Calculate difference in milliseconds
        const diffMsHN = timeoutfacultyHN - timeinfacultyHN;

        // Convert milliseconds to hours, minutes, seconds
        const hoursFacultyHN = Math.floor(diffMsHN / (1000 * 60 * 60));
        const minutesFacultyHN = Math.floor((diffMsHN % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyHN = Math.floor((diffMsHN % (1000 * 60)) / 1000);

        // Format output as HH:MM:SS RENDERERED TIME
        const formattedFacultyRenderedTimeHN = [String(hoursFacultyHN).padStart(2, "0"), String(minutesFacultyHN).padStart(2, "0"), String(secondsFacultyHN).padStart(2, "0")].join(":");

        //end rendered time

        //  max rendered time

        // Calculate difference in milliseconds MAX RENDERED TIME
        const diffMsFacultyHN = endOfficialTimeFacultyHN - startOfficialTimeFacultyHN;

        // Convert milliseconds to hours, minutes, seconds
        const hoursFacultyMRTHN = Math.floor(diffMsFacultyHN / (1000 * 60 * 60));
        const minutesFacultyMRTHN = Math.floor((diffMsFacultyHN % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyMRTHN = Math.floor((diffMsFacultyHN % (1000 * 60)) / 1000);

        // Format output as HH:MM:SS
        const formattedFacultyMaxRenderedTimeHN = [String(hoursFacultyMRTHN).padStart(2, "0"), String(minutesFacultyMRTHN).padStart(2, "0"), String(secondsFacultyMRTHN).padStart(2, "0")].join(":");

        // Calculate difference in milliseconds MAX RENDERED TIME

        const tardFinalformattedFacultyRenderedTimeHN = new Date(`01/01/2000 ${formattedFacultyRenderedTimeHN}`);
        const tardFinalformattedFacultyMaxRenderedTimeHN = new Date(`01/01/2000 ${formattedFacultyMaxRenderedTimeHN}`);

        const finalcalcFacultyHN = tardFinalformattedFacultyMaxRenderedTimeHN - tardFinalformattedFacultyRenderedTimeHN;

        // Convert milliseconds to hours, minutes, seconds
        const hoursfinalcalcFacultyHN = Math.floor(finalcalcFacultyHN / (1000 * 60 * 60));
        const minutesfinalcalcFacultyHN = Math.floor((finalcalcFacultyHN % (1000 * 60 * 60)) / (1000 * 60));
        const secondsfinalcalcFacultyHN = Math.floor((finalcalcFacultyHN % (1000 * 60)) / 1000);

        // Format output as HH:MM:SS
        const formattedfinalcalcFacultyHN = [String(hoursfinalcalcFacultyHN).padStart(2, "0"), String(minutesfinalcalcFacultyHN).padStart(2, "0"), String(secondsfinalcalcFacultyHN).padStart(2, "0")].join(":");

        // // end max rendered time
        //HN END-----------------------------------------------------------------------------

        // SC ------------------------------------------------------------------------------

        // rendered time
        // Convert time strings to Date objects
        const startDateFacultySC = new Date(`01/01/2000 ${timeIN}`);
        const endDateFacultySC = new Date(`01/01/2000 ${timeOUT}`);
        const startOfficialTimeFacultySC = new Date(`01/01/2000 ${officialServiceCreditTimeIN}`);
        const endOfficialTimeFacultySC = new Date(`01/01/2000 ${officialServiceCreditTimeOUT}`);

        const defaultTimeFacultySC = "00:00:00 AM";
        const midnightFacultySC = new Date(`01/01/2000 ${defaultTimeFacultySC}`);

        const timeinfacultySC = endDateFacultySC < startOfficialTimeFacultySC ? midnightFacultySC : startDateFacultySC > endOfficialTimeFacultySC ? midnightFacultySC : startDateFacultySC < startOfficialTimeFacultySC ? startOfficialTimeFacultySC : startDateFacultySC;
        const timeoutfacultySC = timeinfacultySC === midnightFacultySC ? midnightFacultySC : endDateFacultySC < startOfficialTimeFacultySC ? midnightFacultySC : endDateFacultySC < endOfficialTimeFacultySC ? endDateFacultySC : endOfficialTimeFacultySC;

        // Calculate difference in milliseconds
        const diffMsSC = timeoutfacultySC - timeinfacultySC;

        // Convert milliseconds to hours, minutes, seconds
        const hoursFacultySC = Math.floor(diffMsSC / (1000 * 60 * 60));
        const minutesFacultySC = Math.floor((diffMsSC % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultySC = Math.floor((diffMsSC % (1000 * 60)) / 1000);

        // Format output as HH:MM:SS RENDERERED TIME
        const formattedFacultyRenderedTimeSC = [String(hoursFacultySC).padStart(2, "0"), String(minutesFacultySC).padStart(2, "0"), String(secondsFacultySC).padStart(2, "0")].join(":");

        //end rendered time

        //  max rendered time

        // Calculate difference in milliseconds MAX RENDERED TIME
        const diffMsFacultySC = endOfficialTimeFacultySC - startOfficialTimeFacultySC;

        // Convert milliseconds to hours, minutes, seconds
        const hoursFacultyMRTSC = Math.floor(diffMsFacultySC / (1000 * 60 * 60));
        const minutesFacultyMRTSC = Math.floor((diffMsFacultySC % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyMRTSC = Math.floor((diffMsFacultySC % (1000 * 60)) / 1000);

        // Format output as HH:MM:SS
        const formattedFacultyMaxRenderedTimeSC = [String(hoursFacultyMRTSC).padStart(2, "0"), String(minutesFacultyMRTSC).padStart(2, "0"), String(secondsFacultyMRTSC).padStart(2, "0")].join(":");

        // Calculate difference in milliseconds MAX RENDERED TIME

        const tardFinalformattedFacultyRenderedTimeSC = new Date(`01/01/2000 ${formattedFacultyRenderedTimeSC}`);
        const tardFinalformattedFacultyMaxRenderedTimeSC = new Date(`01/01/2000 ${formattedFacultyMaxRenderedTimeSC}`);

        const finalcalcFacultySC = tardFinalformattedFacultyMaxRenderedTimeSC - tardFinalformattedFacultyRenderedTimeSC;

        // Convert milliseconds to hours, minutes, seconds
        const hoursfinalcalcFacultySC = Math.floor(finalcalcFacultySC / (1000 * 60 * 60));
        const minutesfinalcalcFacultySC = Math.floor((finalcalcFacultySC % (1000 * 60 * 60)) / (1000 * 60));
        const secondsfinalcalcFacultySC = Math.floor((finalcalcFacultySC % (1000 * 60)) / 1000);

        // Format output as HH:MM:SS
        const formattedfinalcalcFacultySC = [String(hoursfinalcalcFacultySC).padStart(2, "0"), String(minutesfinalcalcFacultySC).padStart(2, "0"), String(secondsfinalcalcFacultySC).padStart(2, "0")].join(":");

        // // end max rendered time
        //SC END-----------------------------------------------------------------------------

        // OT ------------------------------------------------------------------------------

        // rendered time
        // Convert time strings to Date objects
        const startDateFacultyOT = new Date(`01/01/2000 ${timeIN}`);
        const endDateFacultyOT = new Date(`01/01/2000 ${timeOUT}`);
        const startOfficialTimeFacultyOT = new Date(`01/01/2000 ${officialOverTimeIN}`);
        const endOfficialTimeFacultyOT = new Date(`01/01/2000 ${officialOverTimeOUT}`);

        const defaultTimeFacultyOT = "00:00:00 AM";
        const midnightFacultyOT = new Date(`01/01/2000 ${defaultTimeFacultyOT}`);

        const timeinfacultyOT = endDateFacultyOT < startOfficialTimeFacultyOT ? midnightFacultyOT : startDateFacultyOT > endOfficialTimeFacultyOT ? midnightFacultyOT : startDateFacultyOT < startOfficialTimeFacultyOT ? startOfficialTimeFacultyOT : startDateFacultyOT;
        const timeoutfacultyOT = timeinfacultyOT === midnightFacultyOT ? midnightFacultyOT : endDateFacultyOT < startOfficialTimeFacultyOT ? midnightFacultyOT : endDateFacultyOT < endOfficialTimeFacultyOT ? endDateFacultyOT : endOfficialTimeFacultyOT;

        // Calculate difference in milliseconds
        const diffMsOT = timeoutfacultyOT - timeinfacultyOT;

        // Convert milliseconds to hours, minutes, seconds
        const hoursFacultyOT = Math.floor(diffMsOT / (1000 * 60 * 60));
        const minutesFacultyOT = Math.floor((diffMsOT % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyOT = Math.floor((diffMsOT % (1000 * 60)) / 1000);

        // Format output as HH:MM:SS RENDERERED TIME
        const formattedFacultyRenderedTimeOT = [String(hoursFacultyOT).padStart(2, "0"), String(minutesFacultyOT).padStart(2, "0"), String(secondsFacultyOT).padStart(2, "0")].join(":");

        //end rendered time

        //  max rendered time

        // Calculate difference in milliseconds MAX RENDERED TIME
        const diffMsFacultyOT = endOfficialTimeFacultyOT - startOfficialTimeFacultyOT;

        // Convert milliseconds to hours, minutes, seconds
        const hoursFacultyMRTOT = Math.floor(diffMsFacultyOT / (1000 * 60 * 60));
        const minutesFacultyMRTOT = Math.floor((diffMsFacultyOT % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyMRTOT = Math.floor((diffMsFacultyOT % (1000 * 60)) / 1000);

        // Format output as HH:MM:SS
        const formattedFacultyMaxRenderedTimeOT = [String(hoursFacultyMRTOT).padStart(2, "0"), String(minutesFacultyMRTOT).padStart(2, "0"), String(secondsFacultyMRTOT).padStart(2, "0")].join(":");

        // Calculate difference in milliseconds MAX RENDERED TIME

        const tardFinalformattedFacultyRenderedTimeOT = new Date(`01/01/2000 ${formattedFacultyRenderedTimeOT}`);
        const tardFinalformattedFacultyMaxRenderedTimeOT = new Date(`01/01/2000 ${formattedFacultyMaxRenderedTimeOT}`);

        const finalcalcFacultyOT = tardFinalformattedFacultyMaxRenderedTimeOT - tardFinalformattedFacultyRenderedTimeOT;

        // Convert milliseconds to hours, minutes, seconds
        const hoursfinalcalcFacultyOT = Math.floor(finalcalcFacultyOT / (1000 * 60 * 60));
        const minutesfinalcalcFacultyOT = Math.floor((finalcalcFacultyOT % (1000 * 60 * 60)) / (1000 * 60));
        const secondsfinalcalcFacultyOT = Math.floor((finalcalcFacultyOT % (1000 * 60)) / 1000);

        // Format output as HH:MM:SS
        const formattedfinalcalcFacultyOT = [String(hoursfinalcalcFacultyOT).padStart(2, "0"), String(minutesfinalcalcFacultyOT).padStart(2, "0"), String(secondsfinalcalcFacultyOT).padStart(2, "0")].join(":");

        // // end max rendered time
        //OT END-----------------------------------------------------------------------------

        return {
          ...row,
          HonorariumTimeIN,
          HonorariumTimeOUT,
          ServiceCreditTimeIN,
          ServiceCreditTimeOUT,
          OverTimeIN,
          OverTimeOUT,
          officialTimeIN,
          officialTimeOUT,
          officialHonorariumTimeIN,
          officialHonorariumTimeOUT,
          officialServiceCreditTimeIN,
          officialServiceCreditTimeOUT,
          officialOverTimeIN,
          officialOverTimeOUT,
          OfficialTimeMorning,
          OfficialTimeAfternoon,

          timeIN,
          timeOUT,
          OfficialBreakAM,
          OfficialBreakPM,
          breaktimeIN,
          breaktimeOUT,

          // midnightFaculty,
          // finalcalcFaculty,

          // formattedfinalcalcFaculty,
          // formattedFacultyRenderedTime,
          formattedfinalcalcFacultyAM,
          formattedFacultyMaxRenderedTimeAM,
          finalcalcFacultyAM,
          formattedFacultyRenderedTimeAM,

          formattedFacultyRenderedTimePM,
          formattedfinalcalcFacultyPM,
          formattedFacultyMaxRenderedTimePM,
          finalcalcFacultyPM,

          // formattedFacultyMaxRenderedTime,

          formattedfinalcalcFacultyHN,
          formattedFacultyRenderedTimeHN,

          formattedFacultyMaxRenderedTimeHN,

          formattedfinalcalcFacultySC,
          formattedFacultyRenderedTimeSC,

          formattedFacultyMaxRenderedTimeSC,

          formattedfinalcalcFacultyOT,
          formattedFacultyRenderedTimeOT,

          formattedFacultyMaxRenderedTimeOT,
        };
      });

      setAttendanceData(processedData);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    }
  };

  const saveOverallAttendance = async () => {
    // 🔍 1) check for duplicates first ─────────────────────────────
    try {
      const dup = await axios.get(
        `${API_BASE_URL}/attendance/api/overall_attendance_record`,
        { params: { personID: employeeNumber, startDate, endDate }, ...getAuthHeaders() }
      );
      if (dup.data?.data?.length) {
        alert(
          `Record for Employee Number ${employeeNumber} covering ${startDate}–${endDate} already exists. Please check Overall Attendance to manage.`
        );
        // Still navigate even if duplicate exists
        navigate('/attendance_summary');
        return;
      }
    } catch (e) {
      console.error("Duplicate‑check failed:", e);
      alert("Could not verify duplicates. Saving aborted.");
      return;
    }
    console.log("Employee Number:", employeeNumber);
    const record = {
      personID: employeeNumber,
      startDate,
      endDate,

      totalRenderedTimeMorning: calculateTotalRenderedTimeAM(),
      totalRenderedTimeMorningTardiness: calculateTotalRenderedTimeTardinessAM(),

      totalRenderedTimeAfternoon: calculateTotalRenderedTimePM(),
      totalRenderedTimeAfternoonTardiness: calculateTotalRenderedTimeTardinessPM(),

      totalRenderedHonorarium: calculateTotalRenderedTimeHN(),
      totalRenderedHonorariumTardiness: calculateTotalRenderedTimeTardinessHN(),

      totalRenderedServiceCredit: calculateTotalRenderedTimeSC(),
      totalRenderedServiceCreditTardiness: calculateTotalRenderedTimeTardinessSC(),

      totalRenderedOvertime: calculateTotalRenderedTimeOT(),
      totalRenderedOvertimeTardiness: calculateTotalRenderedTimeTardinessOT(),

      overallRenderedOfficialTime: totalRenderedDay,
      overallRenderedOfficialTimeTardiness: totalTardinessDay,
    };

    try {
      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/overall_attendance`,
        record,
        getAuthHeaders()
      );
      alert(response.data.message || "Attendance record saved successfully!");
      navigate('/attendance_summary');
    } catch (error) {
      console.error("Error saving overall attendance:", error);
      alert("Failed to save attendance record.");
    }
  };

  // TIME IN AND TIME OUT AM--------------------------------------------------------------------------------------
  const calculateTotalRenderedTimeAM = () => {
    if (!attendanceData || attendanceData.length === 0) {
      return "00:00:00"; // Handle empty data gracefully
    }

    let totalSeconds = 0;

    attendanceData.forEach((row) => {
      const facultyRenderedTimeAM = !row.officialTimeIN || !row.breaktimeIN || row.formattedFacultyRenderedTimeAM === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimeAM;

      const [hours, minutes, seconds] = facultyRenderedTimeAM.split(":").map(Number);
      totalSeconds += hours * 3600 + minutes * 60 + seconds;
    });

    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
    const totalSecs = totalSeconds % 60;

    //const OverAll = `${String(totalHours).padStart(2, "0")}:${String(totalMinutes).padStart(2, "0")}:${String(totalSecs).padStart(2, "0")}`;

    // return `${String(totalHours).padStart(2, "0")}:${String(totalMinutes).padStart(2, "0")}:${String(totalSecs).padStart(2, "0")}`;

    // Return computed time
    const overallTimeAM = `${String(totalHours).padStart(2, "0")}:${String(totalMinutes).padStart(2, "0")}:${String(totalSecs).padStart(2, "0")}`;
    return overallTimeAM;
  };

  const calculateTotalRenderedTimeTardinessAM = () => {
    let totalSeconds = 0;

    attendanceData.forEach((row) => {
      const facultyRenderedTimeTardinessAM = !row.officialTimeIN || !row.breaktimeIN || row.formattedfinalcalcFacultyAM === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimeAM : row.formattedfinalcalcFacultyAM;

      const [hours, minutes, seconds] = facultyRenderedTimeTardinessAM.split(":").map(Number);
      totalSeconds += hours * 3600 + minutes * 60 + seconds;
    });

    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
    const totalSecs = totalSeconds % 60;

    return `${String(totalHours).padStart(2, "0")}:${String(totalMinutes).padStart(2, "0")}:${String(totalSecs).padStart(2, "0")}`;
  };
  // TIME IN AND TIME OUT END AM --------------------------------------------------------------------------------------

  // TIME IN AND TIME OUT PM --------------------------------------------------------------------------------------
  const calculateTotalRenderedTimePM = () => {
    if (!attendanceData || attendanceData.length === 0) {
      return "00:00:00"; // Handle empty data gracefully
    }

    let totalSeconds = 0;

    attendanceData.forEach((row) => {
      const facultyRenderedTimePM = !row.officialBreaktimeOUT || !row.timeOUT || row.formattedFacultyRenderedTimePM === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimePM;

      const [hours, minutes, seconds] = facultyRenderedTimePM.split(":").map(Number);
      totalSeconds += hours * 3600 + minutes * 60 + seconds;
    });

    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
    const totalSecs = totalSeconds % 60;

    //const OverAll = `${String(totalHours).padStart(2, "0")}:${String(totalMinutes).padStart(2, "0")}:${String(totalSecs).padStart(2, "0")}`;

    // return `${String(totalHours).padStart(2, "0")}:${String(totalMinutes).padStart(2, "0")}:${String(totalSecs).padStart(2, "0")}`;

    // Return computed time
    const overallTimePM = `${String(totalHours).padStart(2, "0")}:${String(totalMinutes).padStart(2, "0")}:${String(totalSecs).padStart(2, "0")}`;
    return overallTimePM;
  };

  const calculateTotalRenderedTimeTardinessPM = () => {
    let totalSeconds = 0;

    attendanceData.forEach((row) => {
      const facultyRenderedTimeTardinessPM = !row.officialBreaktimeOUT || !row.timeOUT || row.formattedfinalcalcFacultyPM === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimePM : row.formattedfinalcalcFacultyPM;

      const [hours, minutes, seconds] = facultyRenderedTimeTardinessPM.split(":").map(Number);
      totalSeconds += hours * 3600 + minutes * 60 + seconds;
    });

    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
    const totalSecs = totalSeconds % 60;

    return `${String(totalHours).padStart(2, "0")}:${String(totalMinutes).padStart(2, "0")}:${String(totalSecs).padStart(2, "0")}`;
  };
  // TIME IN AND TIME OUT END PM --------------------------------------------------------------------------------------

  //--------------------------------------------

  const totalRenderedDay = (() => {
    const amTime = calculateTotalRenderedTimeAM();
    const pmTime = calculateTotalRenderedTimePM();

    const [amHours, amMinutes, amSeconds] = amTime.split(":").map(Number);
    const [pmHours, pmMinutes, pmSeconds] = pmTime.split(":").map(Number);

    let totalSeconds = amSeconds + pmSeconds;
    let totalMinutes = amMinutes + pmMinutes + Math.floor(totalSeconds / 60);
    let totalHours = amHours + pmHours + Math.floor(totalMinutes / 60);

    totalSeconds = totalSeconds % 60;
    totalMinutes = totalMinutes % 60;

    return `${String(totalHours).padStart(2, "0")}:${String(totalMinutes).padStart(2, "0")}:${String(totalSeconds).padStart(2, "0")}`;
  })();

  const totalTardinessDay = (() => {
    const amTime = calculateTotalRenderedTimeTardinessAM();
    const pmTime = calculateTotalRenderedTimeTardinessPM();

    const [amHours, amMinutes, amSeconds] = amTime.split(":").map(Number);
    const [pmHours, pmMinutes, pmSeconds] = pmTime.split(":").map(Number);

    let totalSeconds = amSeconds + pmSeconds;
    let totalMinutes = amMinutes + pmMinutes + Math.floor(totalSeconds / 60);
    let totalHours = amHours + pmHours + Math.floor(totalMinutes / 60);

    totalSeconds = totalSeconds % 60;
    totalMinutes = totalMinutes % 60;

    return `${String(totalHours).padStart(2, "0")}:${String(totalMinutes).padStart(2, "0")}:${String(totalSeconds).padStart(2, "0")}`;
  })();

  // TIME IN AND TIME OUT HONORARUIM
  const calculateTotalRenderedTimeHN = () => {
    let totalSeconds = 0;

    attendanceData.forEach((row) => {
      const facultyRenderedTimeHN = !row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeHN === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimeHN;

      const [hours, minutes, seconds] = facultyRenderedTimeHN.split(":").map(Number);
      totalSeconds += hours * 3600 + minutes * 60 + seconds;
    });

    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
    const totalSecs = totalSeconds % 60;

    return `${String(totalHours).padStart(2, "0")}:${String(totalMinutes).padStart(2, "0")}:${String(totalSecs).padStart(2, "0")}`;
  };

  const calculateTotalRenderedTimeTardinessHN = () => {
    let totalSeconds = 0;

    attendanceData.forEach((row) => {
      const facultyRenderedTimeTardinessHN = !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyHN === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimeHN : row.formattedfinalcalcFacultyHN;

      const [hours, minutes, seconds] = facultyRenderedTimeTardinessHN.split(":").map(Number);
      totalSeconds += hours * 3600 + minutes * 60 + seconds;
    });

    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
    const totalSecs = totalSeconds % 60;

    return `${String(totalHours).padStart(2, "0")}:${String(totalMinutes).padStart(2, "0")}:${String(totalSecs).padStart(2, "0")}`;
  };
  // TIME IN AND TIME OUT END HONORARIUM

  // TIME IN AND TIME OUT ServiceCredit
  const calculateTotalRenderedTimeSC = () => {
    let totalSeconds = 0;

    attendanceData.forEach((row) => {
      const facultyRenderedTimeSC = !row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeSC === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimeSC;

      const [hours, minutes, seconds] = facultyRenderedTimeSC.split(":").map(Number);
      totalSeconds += hours * 3600 + minutes * 60 + seconds;
    });

    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
    const totalSecs = totalSeconds % 60;

    return `${String(totalHours).padStart(2, "0")}:${String(totalMinutes).padStart(2, "0")}:${String(totalSecs).padStart(2, "0")}`;
  };

  const calculateTotalRenderedTimeTardinessSC = () => {
    let totalSeconds = 0;

    attendanceData.forEach((row) => {
      const facultyRenderedTimeTardinessSC = !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultySC === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimeSC : row.formattedfinalcalcFacultySC;

      const [hours, minutes, seconds] = facultyRenderedTimeTardinessSC.split(":").map(Number);
      totalSeconds += hours * 3600 + minutes * 60 + seconds;
    });

    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
    const totalSecs = totalSeconds % 60;

    return `${String(totalHours).padStart(2, "0")}:${String(totalMinutes).padStart(2, "0")}:${String(totalSecs).padStart(2, "0")}`;
  };
  // TIME IN AND TIME OUT END Service Credit

  // TIME IN AND TIME OUT OverTime
  const calculateTotalRenderedTimeOT = () => {
    let totalSeconds = 0;

    attendanceData.forEach((row) => {
      const facultyRenderedTimeOT = !row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeOT === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimeOT;

      const [hours, minutes, seconds] = facultyRenderedTimeOT.split(":").map(Number);
      totalSeconds += hours * 3600 + minutes * 60 + seconds;
    });

    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
    const totalSecs = totalSeconds % 60;

    return `${String(totalHours).padStart(2, "0")}:${String(totalMinutes).padStart(2, "0")}:${String(totalSecs).padStart(2, "0")}`;
  };

  const calculateTotalRenderedTimeTardinessOT = () => {
    let totalSeconds = 0;

    attendanceData.forEach((row) => {
      const facultyRenderedTimeTardinessOT = !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyOT === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimeOT : row.formattedfinalcalcFacultyOT;

      const [hours, minutes, seconds] = facultyRenderedTimeTardinessOT.split(":").map(Number);
      totalSeconds += hours * 3600 + minutes * 60 + seconds;
    });

    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
    const totalSecs = totalSeconds % 60;

    return `${String(totalHours).padStart(2, "0")}:${String(totalMinutes).padStart(2, "0")}:${String(totalSecs).padStart(2, "0")}`;
  };
  // TIME IN AND TIME OUT END OverTime

  const currentYear = new Date().getFullYear();
  const months = [
     "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
  ];

 // Add this state with your other useState declarations
const [selectedMonth, setSelectedMonth] = useState(null);
const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

// Generate year options (current year ± 5 years)
const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

const handleMonthClick = (monthIndex) => {
  const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
  const end = new Date(Date.UTC(selectedYear, monthIndex + 1, 0)); // last day of month

  // format as YYYY-MM-DD (ISO format expected by <TextField type="date" />)
  const formattedStart = start.toISOString().substring(0, 10);
  const formattedEnd = end.toISOString().substring(0, 10);

  setStartDate(formattedStart);
  setEndDate(formattedEnd);
  setSelectedMonth(monthIndex); // Track selected month
};

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(attendanceData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `Attendance_${employeeNumber}_${startDate}_${endDate}.xlsx`);
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
        message="You do not have permission to access Attendance Module for Faculty (40 hours/Designated). Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }
  //ACCESSING END2

  return (
    <Box sx={{ 
      py: 4,
      borderRadius: '14px'
    }}>
      {/* Wider Container */}
      <Container maxWidth="xl" sx={{ px: 4 }}>
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
                        boxShadow: '0 8px 24px rgba(109,35,35,0.15)'
                      }}
                    >
                      <WorkHistory sx={{ fontSize: 32, color: accentColor }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2, color: accentColor }}>
                        Attendance Records for Designated (40hrs)
                      </Typography>
                      <Typography variant="body1" sx={{ opacity: 0.8, fontWeight: 400, color: accentDark }}>
                        Generate and review all attendance records of designated employees
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip 
                      label="Designated (40hrs)" 
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
                        onClick={handleSubmit}
                        disabled={!employeeNumber || !startDate || !endDate}
                        sx={{ 
                          bgcolor: 'rgba(109,35,35,0.1)', 
                          '&:hover': { bgcolor: 'rgba(109,35,35,0.2)' },
                          color: accentColor,
                          width: 48,
                          height: 48,
                          '&:disabled': { 
                            bgcolor: 'rgba(109,35,35,0.05)',
                            color: 'rgba(109,35,35,0.3)'
                          }
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
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: alpha(primaryColor, 0.8), color: accentColor }}>
                    <FilterList />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ color: accentDark }}>
                        Configure your attendance record criteria
                    </Typography>
                  </Box>
                </Box>
              }
              sx={{ 
                bgcolor: alpha(primaryColor, 0.5), 
                pb: 2,
                borderBottom: '1px solid rgba(109,35,35,0.1)'
              }}
            />
            <CardContent sx={{ p: 4 }}>
              <Box component="form">
                <Grid container spacing={4}>
                  <Grid item xs={12} md={4}>
                    <ModernTextField
                      fullWidth
                      label="Employee Number"
                      value={employeeNumber}
                      onChange={(e) => setEmployeeNumber(e.target.value)}
                      required
                      variant="outlined"
                      placeholder="Enter employee ID"
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
                      required
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
                      required
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

                <Divider sx={{ my: 4, borderColor: 'rgba(109,35,35,0.1)' }} />

               {/* Month Selection */}
<Box sx={{ mb: 4 }}>
  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: accentColor, display: 'flex', alignItems: 'center', mb: 3 }}>
    <DateRange sx={{ mr: 2, fontSize: 24 }} />
    FILTERS:
  </Typography>
  <Box sx={{ 
    display: 'grid', 
    gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(6, 1fr)', md: 'repeat(13, 1fr)' },
    gap: 1.5 
  }}>
    {months.map((month, index) => (
      <ProfessionalButton
        key={month}
        variant={selectedMonth === index ? "contained" : "outlined"}
        size="small"
        onClick={() => handleMonthClick(index)}
        sx={{
          borderColor: accentColor,
          color: selectedMonth === index ? '#FFFFFF' : accentColor,
          backgroundColor: selectedMonth === index ? accentColor : 'transparent',
          minWidth: 'auto',
          fontSize: '0.875rem',
          fontWeight: selectedMonth === index ? 700 : 500,
          py: 1,
          transition: 'all 0.3s ease',
          boxShadow: selectedMonth === index ? `0 4px 12px ${alpha(accentColor, 0.3)}` : 'none',
          '&:hover': {
            backgroundColor: selectedMonth === index 
              ? alpha(accentColor, 0.85) 
              : alpha(accentColor, 0.1),
            transform: 'translateY(-2px)',
            boxShadow: selectedMonth === index 
              ? `0 6px 16px ${alpha(accentColor, 0.4)}` 
              : `0 2px 8px ${alpha(accentColor, 0.15)}`,
          }
        }}
      >
        {month}
      </ProfessionalButton>
    ))}
    <FormControl size="small" sx={{ minWidth: 100 }}>
      <InputLabel sx={{ fontWeight: 600, color: accentColor }}>Year</InputLabel>
      <Select
        value={selectedYear}
        onChange={(e) => setSelectedYear(e.target.value)}
        label="Year"
        sx={{
          backgroundColor: 'white',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: accentColor,
          },
          borderRadius: 2,
          fontWeight: 600,
          color: accentColor,
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: accentDark,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: accentColor,
            borderWidth: 2,
          },
        }}
      >
        {yearOptions.map((year) => (
          <MenuItem key={year} value={year}>
            {year}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  </Box>
</Box>
                {/* Generate Button */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <ProfessionalButton
                    variant="contained"
                    startIcon={<Refresh />}
                    onClick={handleSubmit}
                    disabled={!employeeNumber || !startDate || !endDate}
                    sx={{
                      py: 1.5,
                      px: 4,
                      bgcolor: accentColor,
                      color: primaryColor,
                      fontSize: '1rem',
                      '&:hover': {
                        bgcolor: accentDark,
                      }
                    }}
                  >
                    Search Records
                  </ProfessionalButton>
                </Box>
              </Box>
            </CardContent>
          </GlassCard>
        </Fade>

        {/* Results */}
        {attendanceData.length > 0 && (
          <Fade in timeout={500}>
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
                    Designated (40hrs) Attendance Records
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: accentColor }}>
                    {employeeNumber}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                    <Chip 
                      icon={<WorkHistory />}
                      label={`${attendanceData.length} Records`}
                      size="small"
                      sx={{ 
                        bgcolor: 'rgba(109,35,35,0.15)', 
                        color: accentColor,
                        fontWeight: 500
                      }} 
                    />
                    <Typography variant="body2" sx={{ opacity: 0.8, color: accentDark }}>
                      {startDate} to {endDate}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
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
                    <WorkHistory />
                  </Avatar>
                </Box>
              </Box>

              {/* Full Table with All Columns */}
              <PremiumTableContainer sx={{ mt: 3 }}>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table sx={{ minWidth: 1800 }}>
                    <TableHead sx={{ bgcolor: alpha(primaryColor, 0.7) }}>
                      <TableRow>
                        <PremiumTableCell isHeader sx={{ color: accentColor, minWidth: "150px" }}>Date</PremiumTableCell>
                        <PremiumTableCell isHeader bgColor={alpha(primaryColor, 0.5)} sx={{ color: accentColor, minWidth: "100px" }}>Day</PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: accentColor, minWidth: "150px" }}>Time IN</PremiumTableCell>
                        <PremiumTableCell isHeader bgColor={alpha(primaryColor, 0.5)} sx={{ color: accentColor, minWidth: "120px" }}>Official Time IN</PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: accentColor, minWidth: "150px" }}>Breaktime IN</PremiumTableCell>
                        <PremiumTableCell isHeader bgColor={alpha(primaryColor, 0.5)} sx={{ color: accentColor, minWidth: "120px" }}>Official Breaktime IN</PremiumTableCell>
                        <PremiumTableCell isHeader bgColor={alpha(accentColor, 0.2)} sx={{ color: accentColor, minWidth: "100px" }}>Official Time (MORNING) Rendered Time</PremiumTableCell>
                        <PremiumTableCell isHeader bgColor={alpha(accentColor, 0.3)} sx={{ color: accentColor, minWidth: "100px" }}>Tardiness (MORNING)</PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: accentColor, minWidth: "120px" }}>Breaktime OUT</PremiumTableCell>
                        <PremiumTableCell isHeader bgColor={alpha(primaryColor, 0.5)} sx={{ color: accentColor, minWidth: "120px" }}>Official Breaktime OUT</PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: accentColor, minWidth: "120px" }}>Time OUT</PremiumTableCell>
                        <PremiumTableCell isHeader bgColor={alpha(primaryColor, 0.5)} sx={{ color: accentColor, minWidth: "120px" }}>Official Time OUT</PremiumTableCell>
                        <PremiumTableCell isHeader bgColor={alpha(accentColor, 0.2)} sx={{ color: accentColor, minWidth: "100px" }}>Official Time (AFTERNOON) Rendered Time</PremiumTableCell>
                        <PremiumTableCell isHeader bgColor={alpha(accentColor, 0.3)} sx={{ color: accentColor, minWidth: "100px" }}>TARDINESS (AFTERNOON)</PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: accentColor, minWidth: "140px" }}>Honorarium Time IN</PremiumTableCell>
                        <PremiumTableCell isHeader bgColor={alpha(primaryColor, 0.5)} sx={{ color: accentColor, minWidth: "120px" }}>OFFICIAL Honorarium Time IN</PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: accentColor, minWidth: "150px" }}>Honorarium Time OUT</PremiumTableCell>
                        <PremiumTableCell isHeader bgColor={alpha(primaryColor, 0.5)} sx={{ color: accentColor, minWidth: "120px" }}>OFFICIAL Honorarium Time OUT</PremiumTableCell>
                        <PremiumTableCell isHeader bgColor={alpha(accentColor, 0.2)} sx={{ color: accentColor, minWidth: "100px" }}>Honorarium Rendered Time</PremiumTableCell>
                        <PremiumTableCell isHeader bgColor={alpha(accentColor, 0.3)} sx={{ color: accentColor, minWidth: "100px" }}>TARDINESS (HONORARIUM)</PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: accentColor, minWidth: "160px" }}>Service Credit Time IN</PremiumTableCell>
                        <PremiumTableCell isHeader bgColor={alpha(primaryColor, 0.5)} sx={{ color: accentColor, minWidth: "120px" }}>OFFICIAL Service Credit Time IN</PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: accentColor, minWidth: "170px" }}>Service Credit Time OUT</PremiumTableCell>
                        <PremiumTableCell isHeader bgColor={alpha(primaryColor, 0.5)} sx={{ color: accentColor, minWidth: "120px" }}>OFFICIAL Service Credit Time OUT</PremiumTableCell>
                        <PremiumTableCell isHeader bgColor={alpha(accentColor, 0.2)} sx={{ color: accentColor, minWidth: "100px" }}>Service Credit Rendered Time</PremiumTableCell>
                        <PremiumTableCell isHeader bgColor={alpha(accentColor, 0.3)} sx={{ color: accentColor, minWidth: "100px" }}>TARDINESS (SERVICE CREDIT)</PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: accentColor, minWidth: "130px" }}>Overtime Time IN</PremiumTableCell>
                        <PremiumTableCell isHeader bgColor={alpha(primaryColor, 0.5)} sx={{ color: accentColor, minWidth: "120px" }}>OFFICIAL Overtime Time IN</PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: accentColor, minWidth: "140px" }}>Overtime Time OUT</PremiumTableCell>
                        <PremiumTableCell isHeader bgColor={alpha(primaryColor, 0.5)} sx={{ color: accentColor, minWidth: "120px" }}>OFFICIAL Overtime Time OUT</PremiumTableCell>
                        <PremiumTableCell isHeader bgColor={alpha(accentColor, 0.2)} sx={{ color: accentColor, minWidth: "100px" }}>Overtime Rendered Time</PremiumTableCell>
                        <PremiumTableCell isHeader bgColor={alpha(accentColor, 0.3)} sx={{ color: accentColor, minWidth: "100px" }}>TARDINESS (OVERTIME)</PremiumTableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {attendanceData.map((row, index) => (
                        <TableRow 
                          key={index}
                          sx={{ 
                            '&:nth-of-type(even)': { bgcolor: alpha(primaryColor, 0.3) },
                            '&:hover': { bgcolor: alpha(accentColor, 0.05) },
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <PremiumTableCell sx={{ fontWeight: "bold", textAlign: "center" }}>{row.date}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(primaryColor, 0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>{row.day}</PremiumTableCell>
                          <PremiumTableCell>{row.timeIN}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(primaryColor, 0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>{row.officialTimeIN}</PremiumTableCell>
                          <PremiumTableCell>{row.breaktimeIN}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(primaryColor, 0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>{row.officialBreaktimeIN}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(accentColor, 0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {!row.officialTimeIN || !row.breaktimeIN || row.formattedFacultyRenderedTimeAM === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimeAM}
                          </PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(accentColor, 0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {!row.officialTimeIN || !row.breaktimeIN || row.formattedfinalcalcFacultyAM === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimeAM : row.formattedfinalcalcFacultyAM}
                          </PremiumTableCell>
                          <PremiumTableCell>{row.breaktimeOUT}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(primaryColor, 0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>{row.officialBreaktimeOUT}</PremiumTableCell>
                          <PremiumTableCell>{row.timeOUT}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(primaryColor, 0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>{row.officialTimeOUT}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(accentColor, 0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {!row.officialBreaktimeOUT || !row.timeOUT || row.formattedFacultyRenderedTimePM === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimePM}
                          </PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(accentColor, 0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {!row.officialBreaktimeOUT || !row.timeOUT || row.formattedfinalcalcFacultyPM === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimePM : row.formattedfinalcalcFacultyPM}
                          </PremiumTableCell>
                          <PremiumTableCell>{row.officialHonorariumTimeIN === "00:00:00 AM" ? "N/A" : row.timeIN}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(primaryColor, 0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {row.officialHonorariumTimeIN === "00:00:00 AM" ? "N/A" : row.officialHonorariumTimeIN}
                          </PremiumTableCell>
                          <PremiumTableCell>{row.officialHonorariumTimeOUT === "00:00:00 AM" ? "N/A" : row.timeOUT}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(primaryColor, 0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {row.officialHonorariumTimeOUT === "00:00:00 AM" ? "N/A" : row.officialHonorariumTimeOUT}
                          </PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(accentColor, 0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {!row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeHN === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimeHN}
                          </PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(accentColor, 0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {!row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyHN === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimeHN : row.formattedfinalcalcFacultyHN}
                          </PremiumTableCell>
                          <PremiumTableCell>{row.officialServiceCreditTimeIN === "00:00:00 AM" ? "N/A" : row.timeIN}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(primaryColor, 0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {row.officialServiceCreditTimeIN === "00:00:00 AM" ? "N/A" : row.officialServiceCreditTimeIN}
                          </PremiumTableCell>
                          <PremiumTableCell>{row.officialServiceCreditTimeOUT === "00:00:00 AM" ? "N/A" : row.timeOUT}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(primaryColor, 0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {row.officialServiceCreditTimeOUT === "00:00:00 AM" ? "N/A" : row.officialServiceCreditTimeOUT}
                          </PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(accentColor, 0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {!row.officialTimeSC || !row.timeOUT || row.formattedFacultyRenderedTimeSC === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimeSC}
                          </PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(accentColor, 0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {!row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultySC === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimeSC : row.formattedfinalcalcFacultySC}
                          </PremiumTableCell>
                          <PremiumTableCell>{row.officialOverTimeIN === "00:00:00 AM" ? "N/A" : row.timeIN}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(primaryColor, 0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {row.officialOverTimeIN === "00:00:00 AM" ? "N/A" : row.officialOverTimeIN}
                          </PremiumTableCell>
                          <PremiumTableCell>{row.officialOverTimeOUT === "00:00:00 AM" ? "N/A" : row.timeOUT}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(primaryColor, 0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {row.officialOverTimeOUT === "00:00:00 AM" ? "N/A" : row.officialOverTimeOUT}
                          </PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(accentColor, 0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {!row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeOT === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimeOT}
                          </PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(accentColor, 0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {!row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyOT === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimeOT : row.formattedfinalcalcFacultyOT}
                          </PremiumTableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <PremiumTableCell colSpan={6} sx={{ fontWeight: "bold", textAlign: "right" }}>
                          Total Rendered Time (Morning):
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={1} bgColor={alpha(accentColor, 0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                          {calculateTotalRenderedTimeAM()}
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={1} bgColor={alpha(accentColor, 0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                          {calculateTotalRenderedTimeTardinessAM()}
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={4} sx={{ fontWeight: "bold", textAlign: "right" }}>
                          Total Rendered Time (Afternoon):
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={1} bgColor={alpha(accentColor, 0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                          {calculateTotalRenderedTimePM()}
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={1} bgColor={alpha(accentColor, 0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                          {calculateTotalRenderedTimeTardinessPM()}
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={4} sx={{ fontWeight: "bold", textAlign: "right" }}>
                          Total Rendered Time (Honorarium):
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={1} bgColor={alpha(accentColor, 0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                          {calculateTotalRenderedTimeHN()}
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={1} bgColor={alpha(accentColor, 0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                          {calculateTotalRenderedTimeTardinessHN()}
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={4} sx={{ fontWeight: "bold", textAlign: "right" }}>
                          Total Rendered Time (Service Credit):
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={1} bgColor={alpha(accentColor, 0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                          {calculateTotalRenderedTimeSC()}
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={1} bgColor={alpha(accentColor, 0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                          {calculateTotalRenderedTimeTardinessSC()}
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={4} sx={{ fontWeight: "bold", textAlign: "right" }}>
                          Total Rendered Time (Overtime):
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={1} bgColor={alpha(accentColor, 0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                          {calculateTotalRenderedTimeOT()}
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={1} bgColor={alpha(accentColor, 0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                          {calculateTotalRenderedTimeTardinessOT()}
                        </PremiumTableCell>
                      </TableRow>
                      <TableRow>
                        <PremiumTableCell colSpan={2} sx={{ fontWeight: "bold", textAlign: "right" }}>
                          Overall Rendered Time {startDate} to {endDate}:
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={3} bgColor={alpha(primaryColor, 0.5)} sx={{ fontWeight: "bold", textAlign: "left" }}>
                          {totalRenderedDay}
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={2} sx={{ fontWeight: "bold", textAlign: "right" }}>
                          Overall Tardiness Official Time {startDate} to {endDate}:
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={2} bgColor={alpha(accentColor, 0.3)} sx={{ fontWeight: "bold", textAlign: "left" }}>
                          {totalTardinessDay}
                        </PremiumTableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Box>
              </PremiumTableContainer>
            </GlassCard>
          </Fade>
        )}

        {/* Save Button */}
        {attendanceData.length > 0 && (
          <Fade in timeout={900}>
            <GlassCard sx={{border: `1px solid ${alpha(accentColor, 0.1)}`}}>
              <CardContent sx={{ p: 4 }}>
                <ProfessionalButton
                  variant="contained"
                  fullWidth
                  startIcon={<SaveAs />}
                  onClick={saveOverallAttendance}
                  sx={{
                    py: 2,
                    bgcolor: accentColor,
                    color: primaryColor,
                    fontSize: '1rem',
                    '&:hover': {
                      bgcolor: accentDark,
                    }
                  }}
                >
                  Save Record
                </ProfessionalButton>
              </CardContent>
            </GlassCard>
          </Fade>
        )}
      </Container>
    </Box>
  );
};

export default AttendanceModuleFaculty;