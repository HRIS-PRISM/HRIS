// (full file contents)
import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useCRUDButtonStyles } from '../../hooks/useCRUDButtonStyles';

import {
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Container,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Card,
  CardContent,
  Grid,
  InputAdornment,
  Avatar,
  Tooltip,
  Chip,
  Fade,
  Alert,
  useTheme,
  styled,
  Divider,
  CardHeader,
  Checkbox,
  Autocomplete,
} from '@mui/material';
import {TablePagination} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Close,
  Schedule,
  UploadFile,
  FilterList,
  Person,
  AccessTime,
  CheckCircle,
  EventBusy,
  WarningAmber,
  Visibility,
} from '@mui/icons-material';

import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import CircularProgress from '@mui/material/CircularProgress';

// Show calendar date only; avoid UTC -1 day when API sends ISO (use local date so 08 in DB shows as 08)
const formatDateOnly = (val) => {
  if (!val) return '—';
  const s = String(val);
  const dateOnly = s.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return s;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Format date as "Month DD, YYYY" (e.g. February 03, 2026) for display in view modal
const formatDateLong = (val) => {
  if (!val) return '';
  const s = String(val);
  const dateOnly = s.split('T')[0];
  let y, month, day;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const [yy, mm, dd] = dateOnly.split('-').map(Number);
    y = yy;
    day = dd;
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    month = months[mm - 1] || '';
  } else {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return s;
    y = d.getFullYear();
    day = d.getDate();
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    month = months[d.getMonth()] || '';
  }
  return month ? `${month} ${String(day).padStart(2, '0')}, ${y}` : String(val);
};

// Parse time string "08:00:00 AM" or "5:00 PM" to minutes from midnight (0–1439). Returns null if empty/invalid.
const parseTimeToMinutes = (str) => {
  if (str == null || String(str).trim() === '') return null;
  const s = String(str).trim();
  const match = s.match(
    /^\s*(\d{1,2})\s*:\s*(\d{1,2})(?:\s*:\s*\d{1,2})?\s*(AM|PM)\s*$/i,
  );
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  const ampm = (match[3] || '').toUpperCase();
  if (ampm === 'PM' && hour !== 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  if (hour < 0 || hour > 23 || min < 0 || min > 59) return null;
  return hour * 60 + min;
};

// Format minutes from midnight to display string (e.g. 480 -> "8:00 AM")
const formatMinutesToTime = (m) => {
  if (m == null || m < 0 || m >= 24 * 60) return '';
  const h = Math.floor(m / 60);
  const min = m % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
};

// Get all time segments for one row (one day): work (incl. break), honorarium, service credits, overtime.
// Each segment: { start, end, label }. Only includes segments where start < end and both times valid.
const getTimeSegmentsForRow = (row) => {
  const segments = [];
  const r = row || {};

  // Work days: Time In → Break In, Break Out → Time Out (or single segment Time In → Time Out if no break)
  const timeIn = parseTimeToMinutes(r.officialTimeIN);
  const breakIn = parseTimeToMinutes(r.officialBreaktimeIN);
  const breakOut = parseTimeToMinutes(r.officialBreaktimeOUT);
  const timeOut = parseTimeToMinutes(r.officialTimeOUT);
  if (timeIn != null && timeOut != null && timeIn < timeOut) {
    if (
      breakIn != null &&
      breakOut != null &&
      breakIn > timeIn &&
      breakOut < timeOut &&
      breakIn < breakOut
    ) {
      if (timeIn < breakIn)
        segments.push({ start: timeIn, end: breakIn, label: 'Work Days' });
      if (breakOut < timeOut)
        segments.push({ start: breakOut, end: timeOut, label: 'Work Days' });
    } else {
      segments.push({ start: timeIn, end: timeOut, label: 'Work Days' });
    }
  }

  // Honorarium (skip default "00:00 AM" to "00:00 PM" / midnight-to-noon = not set)
  const honIn = parseTimeToMinutes(r.officialHonorariumTimeIN);
  const honOut = parseTimeToMinutes(r.officialHonorariumTimeOUT);
  if (
    honIn != null &&
    honOut != null &&
    honIn < honOut &&
    !(honIn === 0 && honOut === 12 * 60)
  ) {
    segments.push({ start: honIn, end: honOut, label: 'Honorarium' });
  }

  // Service credits (skip default midnight-to-noon)
  const scIn = parseTimeToMinutes(r.officialServiceCreditTimeIN);
  const scOut = parseTimeToMinutes(r.officialServiceCreditTimeOUT);
  if (
    scIn != null &&
    scOut != null &&
    scIn < scOut &&
    !(scIn === 0 && scOut === 12 * 60)
  ) {
    segments.push({ start: scIn, end: scOut, label: 'Service Credits' });
  }

  // Overtime (skip default "00:00 AM" to "00:00 PM" = 0 to 720)
  const otIn = parseTimeToMinutes(r.officialOverTimeIN);
  const otOut = parseTimeToMinutes(r.officialOverTimeOUT);
  if (
    otIn != null &&
    otOut != null &&
    otIn < otOut &&
    !(otIn === 0 && otOut === 12 * 60)
  ) {
    segments.push({ start: otIn, end: otOut, label: 'Overtime' });
  }

  return segments;
};

// Check if any two time segments overlap on any day. Ranges [a,b) and [c,d) overlap iff a < d && c < b.
const checkTimeOverlaps = (rows) => {
  if (!rows || !Array.isArray(rows)) return { valid: true };
  for (let i = 0; i < rows.length; i++) {
    const segments = getTimeSegmentsForRow(rows[i]);
    const day = rows[i].day || `Day ${i + 1}`;
    for (let a = 0; a < segments.length; a++) {
      for (let b = a + 1; b < segments.length; b++) {
        const sa = segments[a];
        const sb = segments[b];
        if (sa.start < sb.end && sb.start < sa.end) {
          return {
            valid: false,
            day,
            segmentA: { label: sa.label, start: sa.start, end: sa.end },
            segmentB: { label: sb.label, start: sb.start, end: sb.end },
          };
        }
      }
    }
  }
  return { valid: true };
};

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
  }),
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
  borderBottom: isHeader
    ? '2px solid rgba(254, 249, 225, 0.5)'
    : '1px solid rgba(109, 35, 35, 0.06)',
  fontSize: '0.95rem',
  letterSpacing: '0.025em',
  minWidth: '120px', // Ensure minimum width for cells
  whiteSpace: 'nowrap', // Prevent text wrapping
}));

const OfficialTimeForm = () => {
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

  //ACCESSING
  // Dynamic page access control using component identifier
  // The identifier 'official-time' should match the component_identifier in the pages table
  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('official-time');
  // ACCESSING END

  const [employeeID, setemployeeID] = useState('');
  const [records, setRecords] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState(false);

  const [file, setFile] = useState(null);

  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewRecords, setPreviewRecords] = useState([]);
  const [previewViewScheduleView, setPreviewViewScheduleView] =
    useState('workDays');

  // Checking schedule for time overlaps before save
  const [checkingOverlap, setCheckingOverlap] = useState(false);

  // Auto-save states
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const autoSaveTimeoutRef = useRef(null);

  // All users view states
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsersPage, setAllUsersPage] = useState(0);
  const [allUsersRowsPerPage, setAllUsersRowsPerPage] = useState(10);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [settingDefault, setSettingDefault] = useState(false);

  // Academic Year + Semester on main form (used to derive startDate/endDate for new schedule)
  const [draftAcademicYear, setDraftAcademicYear] = useState('');
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');
  const [draftStatus, setDraftStatus] = useState('active');

  // Create new Schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [modalRecords, setModalRecords] = useState([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningOverlap, setWarningOverlap] = useState(null); // structured overlap info from backend validation
  const [isBulkSchedule, setIsBulkSchedule] = useState(false);
  const [bulkScheduleBlocks, setBulkScheduleBlocks] = useState([]);
  const [bulkTargetEmployees, setBulkTargetEmployees] = useState([]);
  const [showBulkBlocksModal, setShowBulkBlocksModal] = useState(false);
  const [showViewScheduleModal, setShowViewScheduleModal] = useState(false);
  const [viewScheduleInfo, setViewScheduleInfo] = useState(null);
  const [viewScheduleRecords, setViewScheduleRecords] = useState([]);
  const [viewScheduleView, setViewScheduleView] = useState('workDays'); // workDays | honorarium | serviceCredits | overtime
  const [viewScheduleEmployeeName, setViewScheduleEmployeeName] = useState('');

  // School Year Activator Level state
  const [schoolYearInfo, setSchoolYearInfo] = useState({
    yearLevel: '',
    semester: '',
    status: 'Active',
  });

  // Schedule table view: 'workDays' | 'honorarium' | 'serviceCredits' | 'overtime'
  const [scheduleView, setScheduleView] = useState('workDays');

  // Derive startDate and endDate from Academic Year (e.g. "2025-2026") + Semester
  const deriveDatesFromAcademicYearAndSemester = (academicYear, semester) => {
    const match = String(academicYear || '')
      .trim()
      .match(/^(\d{4})\s*-\s*(\d{4})$/);
    if (!match || !semester) return { startDate: '', endDate: '' };
    const startYear = parseInt(match[1], 10);
    const endYear = parseInt(match[2], 10);
    const sem = String(semester).toLowerCase();
    if (sem.includes('1st') || sem === '1') {
      return { startDate: `${startYear}-08-01`, endDate: `${endYear}-01-31` };
    }
    if (sem.includes('2nd') || sem === '2') {
      return { startDate: `${endYear}-02-01`, endDate: `${endYear}-07-31` };
    }
    if (sem.includes('summer')) {
      return { startDate: `${endYear}-04-01`, endDate: `${endYear}-05-31` };
    }
    return { startDate: `${startYear}-08-01`, endDate: `${endYear}-07-31` };
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  };

  const defaultRecords = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ].map((day) => ({
    employeeID,
    day,
    officialTimeIN: '08:00:00 AM',
    officialBreaktimeIN: '00:00:00 AM',
    officialBreaktimeOUT: '00:00:00 PM',
    officialTimeOUT: '05:00:00 PM',
    officialHonorariumTimeIN: '00:00:00 AM',
    officialHonorariumTimeOUT: '00:00:00 PM',
    officialServiceCreditTimeIN: '00:00:00 AM',
    officialServiceCreditTimeOUT: '00:00:00 AM',
    officialOverTimeIN: '00:00:00 AM',
    officialOverTimeOUT: '00:00:00 PM',
    breaktime: '',
  }));

  // Fetch School Year Activator Level for an employee
  const fetchSchoolYearInfo = async (empId) => {
    if (!empId) return;

    try {
      const res = await axios.get(
        `${API_BASE_URL}/officialtime/school-year/${empId}`,
        getAuthHeaders(),
      );

      if (res.data) {
        setSchoolYearInfo({
          yearLevel: res.data.year_level || '',
          semester: res.data.semester || '',
          status: res.data.status || 'Active',
        });
      } else {
        setSchoolYearInfo({
          yearLevel: '',
          semester: '',
          status: 'Active',
        });
      }
    } catch (err) {
      // 404 = no record; use defaults. Do not block or spam console
      if (err.response?.status === 404) {
        setSchoolYearInfo({ yearLevel: '', semester: '', status: 'Active' });
        return;
      }
      console.error('Error fetching school year activator info:', err);
    }
  };

  // Save / update School Year Activator Level for an employee
  const saveSchoolYearInfo = async (empId) => {
    if (!empId) return;

    try {
      await axios.post(
        `${API_BASE_URL}/officialtime/school-year`,
        {
          employeeID: empId,
          yearLevel: schoolYearInfo.yearLevel,
          semester: schoolYearInfo.semester,
          status: schoolYearInfo.status,
        },
        getAuthHeaders(),
      );
    } catch (err) {
      console.error('Error saving school year activator info:', err);
      // Optional: surface a non-blocking message if needed
    }
  };

  const handleSearch = () => {
    if (!employeeID) {
      setSuccessAction('Please enter an Employee ID.');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      return;
    }

    setHasSearched(true);
    setLoading(true);
    axios
      .get(`${API_BASE_URL}/officialtimetable/${employeeID}`, getAuthHeaders())
      .then((res) => {
        setLoading(false);
        if (res.data.length > 0) {
          setRecords(res.data);
          setFound(true);
        } else {
          setRecords(defaultRecords);
          setFound(false);
        }

        fetchSchoolYearInfo(employeeID);
      })
      .catch((err) => {
        console.error('Error fetching data:', err);
        setLoading(false);
        setSuccessAction('Error fetching records.');
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2000);
      });
  };

  const handleChange = (index, field, value) => {
    const updatedRecords = [...records];
    updatedRecords[index][field] = value;
    setRecords(updatedRecords);

    // Auto-save with debouncing (1.5 seconds delay)
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSaveRecords(updatedRecords);
    }, 1500);
  };

  const autoSaveRecords = async (recordsToSave) => {
    if (!employeeID || !recordsToSave || recordsToSave.length === 0) {
      return;
    }
    if (!draftStartDate || !draftEndDate) {
      return;
    }

    const overlapResult = checkTimeOverlaps(recordsToSave);
    if (!overlapResult.valid) {
      const a = overlapResult.segmentA;
      const b = overlapResult.segmentB;
      const msg = `Time overlap on ${overlapResult.day}: ${a.label} overlaps with ${b.label}. Adjust schedule so times do not overlap.`;
      setWarningMessage(msg);
      setShowWarningModal(true);
      return;
    }

    setAutoSaving(true);
    try {
      const academicYearForBackend =
        [draftAcademicYear, schoolYearInfo.semester]
          .filter(Boolean)
          .join(' ')
          .trim() || null;
      await axios.post(
        `${API_BASE_URL}/officialtimetable`,
        {
          employeeID,
          academicYear: academicYearForBackend,
          startDate: draftStartDate,
          endDate: draftEndDate,
          status: draftStatus || 'active',
          records: recordsToSave,
        },
        getAuthHeaders(),
      );
      setLastSaved(new Date());
      setFound(true);
    } catch (err) {
      console.error('Error auto-saving records:', err);
    } finally {
      setAutoSaving(false);
    }
  };

  const openCreateScheduleModal = () => {
    if (!employeeID) {
      setSuccessAction('Please enter Employee Number.');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      return;
    }
    // When no existing records, open modal immediately so user can fill period and schedule in the modal
    if (hasSearched && records.length === 0) {
      const daysOrder = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ];
      const defaultRow = (day) => ({
        employeeID,
        day,
        officialTimeIN: '08:00:00 AM',
        officialBreaktimeIN: '00:00:00 AM',
        officialBreaktimeOUT: '00:00:00 PM',
        officialTimeOUT: '05:00:00 PM',
        officialHonorariumTimeIN: '00:00:00 AM',
        officialHonorariumTimeOUT: '00:00:00 PM',
        officialServiceCreditTimeIN: '00:00:00 AM',
        officialServiceCreditTimeOUT: '00:00:00 AM',
        officialOverTimeIN: '00:00:00 AM',
        officialOverTimeOUT: '00:00:00 PM',
        breaktime: '',
      });
      setModalRecords(daysOrder.map((day) => defaultRow(day)));
      setShowScheduleModal(true);
      return;
    }
    if (!draftAcademicYear || !schoolYearInfo.semester) {
      setSuccessAction('Please fill Academic Year and Semester first.');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      return;
    }
    if (!draftStartDate || !draftEndDate) {
      setSuccessAction('Please fill Start Date and End Date first.');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      return;
    }
    if (new Date(draftStartDate) > new Date(draftEndDate)) {
      setSuccessAction('Start date must be on or before End date.');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      return;
    }
    // Fetch existing schedules and check for conflict: any overlapping date range = block (regardless of academic year/semester)
    const checkAndOpenModal = (existingRecords) => {
      const byKey = new Map();
      for (const r of existingRecords || []) {
        const key = `${r.academicYear ?? ''}|${r.startDate ?? ''}|${r.endDate ?? ''}`;
        if (!byKey.has(key))
          byKey.set(key, {
            academicYear: r.academicYear,
            startDate: r.startDate,
            endDate: r.endDate,
          });
      }
      const draftStart = new Date(draftStartDate).getTime();
      const draftEnd = new Date(draftEndDate).getTime();
      const hasConflict = Array.from(byKey.values()).some((existing) => {
        const exStart = existing.startDate
          ? new Date(existing.startDate).getTime()
          : 0;
        const exEnd = existing.endDate
          ? new Date(existing.endDate).getTime()
          : 0;
        return exStart <= draftEnd && exEnd >= draftStart;
      });
      if (hasConflict) {
        setShowConflictModal(true);
        return;
      }
      const daysOrder = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ];
      const defaultRow = (day) => ({
        employeeID,
        day,
        officialTimeIN: '08:00:00 AM',
        officialBreaktimeIN: '00:00:00 AM',
        officialBreaktimeOUT: '00:00:00 PM',
        officialTimeOUT: '05:00:00 PM',
        officialHonorariumTimeIN: '00:00:00 AM',
        officialHonorariumTimeOUT: '00:00:00 PM',
        officialServiceCreditTimeIN: '00:00:00 AM',
        officialServiceCreditTimeOUT: '00:00:00 AM',
        officialOverTimeIN: '00:00:00 AM',
        officialOverTimeOUT: '00:00:00 PM',
        breaktime: '',
      });
      const sevenRows = daysOrder.map((day) => {
        const r = (existingRecords || []).find((x) => x.day === day);
        return r ? { ...r, employeeID } : defaultRow(day);
      });
      setModalRecords(sevenRows);
      setShowScheduleModal(true);
    };
    axios
      .get(`${API_BASE_URL}/officialtimetable/${employeeID}`, getAuthHeaders())
      .then((res) => checkAndOpenModal(res.data || []))
      .catch(() => checkAndOpenModal(records));
  };

  const handleModalRecordChange = (index, field, value) => {
    const updated = [...modalRecords];
    updated[index] = { ...updated[index], [field]: value };
    setModalRecords(updated);
  };

  const handleSubmitFromModal = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // For bulk mode, we skip the single-employee required fields; for single mode, enforce them.
    if (!isBulkSchedule) {
      if (!employeeID || !draftStartDate || !draftEndDate) {
        setSuccessAction(
          'Employee Number, Start date and End date are required.',
        );
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2000);
        return;
      }
      if (new Date(draftStartDate) > new Date(draftEndDate)) {
        setSuccessAction('Start date must be on or before end date.');
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2000);
        return;
      }
    }

    const daysOrder = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    const sevenRows = daysOrder.map((day) => {
      const r = modalRecords.find((x) => x.day === day);
      return r
        ? { ...r, day }
        : {
            employeeID,
            day,
            officialTimeIN: '08:00:00 AM',
            officialBreaktimeIN: '00:00:00 AM',
            officialBreaktimeOUT: '00:00:00 PM',
            officialTimeOUT: '05:00:00 PM',
            officialHonorariumTimeIN: '00:00:00 AM',
            officialHonorariumTimeOUT: '00:00:00 PM',
            officialServiceCreditTimeIN: '00:00:00 AM',
            officialServiceCreditTimeOUT: '00:00:00 AM',
            officialOverTimeIN: '00:00:00 AM',
            officialOverTimeOUT: '00:00:00 PM',
            breaktime: '',
          };
    });

    // Show checking overlay, then run time-overlap check before saving
    setCheckingOverlap(true);
    await new Promise((resolve) => setTimeout(resolve, 400));

    const overlapResult = checkTimeOverlaps(sevenRows);
    setCheckingOverlap(false);

    if (!overlapResult.valid) {
      const a = overlapResult.segmentA;
      const b = overlapResult.segmentB;
      const msg = `Time overlap on ${overlapResult.day}: ${a.label} (${formatMinutesToTime(a.start)} – ${formatMinutesToTime(a.end)}) overlaps with ${b.label} (${formatMinutesToTime(b.start)} – ${formatMinutesToTime(b.end)}). Please adjust the schedule so Work Days, Honorarium, Service Credits, and Overtime do not overlap.`;
      setWarningMessage(msg);
      setShowWarningModal(true);
      return;
    }

    setLoading(true);
    try {
      if (isBulkSchedule) {
        const payload = {
          employeeIDs: bulkTargetEmployees,
          blocks: bulkScheduleBlocks,
          records: sevenRows,
        };
        const res = await axios.post(
          `${API_BASE_URL}/officialtime/bulk-schedules`,
          payload,
          {
            ...getAuthHeaders(),
            timeout: 30000,
          },
        );
        const totalUsersInserted = Math.round(
          (res.data.totalInserted || 0) / 7,
        );
        setSuccessAction(
          `Bulk schedules processed. Inserted ${totalUsersInserted} users. Check summary for details.`,
        );
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 3000);
        await fetchAllUsers();
      } else {
        const academicYearForBackend =
          [draftAcademicYear, schoolYearInfo.semester]
            .filter(Boolean)
            .join(' ')
            .trim() || null;
        await axios.post(
          `${API_BASE_URL}/officialtimetable`,
          {
            employeeID,
            academicYear: academicYearForBackend,
            startDate: draftStartDate,
            endDate: draftEndDate,
            status: draftStatus || 'active',
            records: sevenRows,
          },
          { ...getAuthHeaders(), timeout: 30000 },
        );
        saveSchoolYearInfo(employeeID).catch(() => {});
        setLastSaved(new Date());
        setSuccessAction('Official time saved successfully.');
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2000);
        handleSearch();
      }
      setShowScheduleModal(false);
      setIsBulkSchedule(false);
      setBulkScheduleBlocks([]);
      setBulkTargetEmployees([]);
    } catch (err) {
      console.error('Error saving data:', err);
      const msg =
        err.code === 'ECONNABORTED' || err.message?.includes('timeout')
          ? 'Request timed out. Please try again.'
          : err.response?.status === 409
            ? err.response?.data?.message ||
              'This date range overlaps an existing schedule. Choose different dates.'
            : err.response?.data?.error ||
              err.response?.data?.message ||
              err.message ||
              'Error saving records.';
      setWarningMessage(msg);
      setWarningOverlap(err.response?.data?.overlap || null);
      setShowWarningModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    handleSubmitFromModal(e);
  };

  // Fetch all users with official time status
  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/officialtime/users-status`,
        getAuthHeaders(),
      );
      setAllUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setSuccessAction('Error fetching users.');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Set default official time for selected users
  const handleSetDefaultForSelected = async () => {
    if (selectedUsers.size === 0) {
      setSuccessAction('Please select at least one user.');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      return;
    }

    setSettingDefault(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/officialtime/set-default-for-users`,
        { employeeNumbers: Array.from(selectedUsers) },
        getAuthHeaders(),
      );

      const insertedUsers =
        response.data.insertedUsers ??
        Math.floor((response.data.inserted || 0) / 7);
      const skipped = response.data.skipped || 0;
      setSuccessAction(
        `Default official time set for ${insertedUsers} users successfully.${skipped ? ` (Skipped: ${skipped} users already have official time)` : ''}`,
      );
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);

      // Refresh users list
      await fetchAllUsers();
      setSelectedUsers(new Set());
    } catch (error) {
      console.error('Error setting default official time:', error);
      setSuccessAction('Error setting default official time.');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } finally {
      setSettingDefault(false);
    }
  };

  // Set default for all users without official time
  const handleSetDefaultForAll = async () => {
    const usersWithoutDefault = allUsers
      .filter((u) => !u.hasDefaultOfficialTime)
      .map((u) => u.employeeNumber);

    if (usersWithoutDefault.length === 0) {
      setSuccessAction('All users already have default official time.');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      return;
    }

    setSettingDefault(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/officialtime/set-default-for-users`,
        { employeeNumbers: usersWithoutDefault },
        getAuthHeaders(),
      );

      const insertedUsers =
        response.data.insertedUsers ??
        Math.floor((response.data.inserted || 0) / 7);
      const skipped = response.data.skipped || 0;
      setSuccessAction(
        `Default official time set for ${insertedUsers} users successfully.${skipped ? ` (Skipped: ${skipped} users already have official time)` : ''}`,
      );
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);

      // Refresh users list
      await fetchAllUsers();
    } catch (error) {
      console.error('Error setting default official time:', error);
      setSuccessAction('Error setting default official time.');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } finally {
      setSettingDefault(false);
    }
  };

  const handleUserSelect = (employeeNumber) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(employeeNumber)) {
        newSet.delete(employeeNumber);
      } else {
        newSet.add(employeeNumber);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked) => {
    const filtered = getFilteredUsers();
    if (checked) {
      setSelectedUsers(new Set(filtered.map((u) => u.employeeNumber)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const getFilteredUsers = () => {
    let filtered = allUsers.slice();

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((user) => {
        const full = (user.fullName || '').toLowerCase();
        const emp = (user.employeeNumber || '').toLowerCase();
        return full.includes(q) || emp.includes(q);
      });
    }

    return filtered;
  };

  const filteredAllUsers = useMemo(() => getFilteredUsers(), [allUsers, searchQuery]);

  const paginatedAllUsers = useMemo(() => {
    const start = allUsersPage * allUsersRowsPerPage;
    return filteredAllUsers.slice(start, start + allUsersRowsPerPage);
  }, [filteredAllUsers, allUsersPage, allUsersRowsPerPage]);

  useEffect(() => {
    if (showAllUsers) {
      fetchAllUsers();
    }
  }, [showAllUsers]);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const previewScheduleInfo =
    previewRecords.length > 0
      ? {
          academicYear: previewRecords[0].academicYear,
          startDate: previewRecords[0].startDate,
          endDate: previewRecords[0].endDate,
          status: previewRecords[0].status || 'active',
        }
      : null;

  const handleUpload = async () => {
    if (!file) {
      setSuccessAction('Please select a file!');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      // Pre-validate: block upload if there is any overlap (date range or time segments)
      await axios.post(
        `${API_BASE_URL}/upload-excel-faculty-official-time/validate`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
        },
      );

      const response = await axios.post(
        `${API_BASE_URL}/upload-excel-faculty-official-time`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
        },
      );
      setLoading(false);

      // Display uploaded records in modal if they exist
      if (response.data.records && response.data.records.length > 0) {
        setPreviewRecords(response.data.records);
        setPreviewViewScheduleView('workDays');
        setShowPreviewModal(true);

        // Refresh the schedules list for the first uploaded employee so the UI matches DB immediately
        const uploadedEmpId = String(
          response.data.records[0]?.employeeID || '',
        ).trim();
        if (uploadedEmpId) {
          setemployeeID(uploadedEmpId);
          setHasSearched(true);
          try {
            const refreshed = await axios.get(
              `${API_BASE_URL}/officialtimetable/${uploadedEmpId}`,
              getAuthHeaders(),
            );
            if (Array.isArray(refreshed.data) && refreshed.data.length > 0) {
              setRecords(refreshed.data);
              setFound(true);
            } else {
              setRecords(defaultRecords);
              setFound(false);
            }
            fetchSchoolYearInfo(uploadedEmpId);
          } catch (e) {
            console.error('Error refreshing schedules after upload:', e);
          }
        }
      }

      setSuccessAction(
        `${response.data.message} (Inserted: ${response.data.inserted}, Updated: ${response.data.updated})`,
      );
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);

      // Clear file selection
      setFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      setLoading(false);
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        (error.response?.status === 400 &&
          'Check file format: use .xlsx, include employeeID, day, effective_from, effective_until.') ||
        (error.response?.status === 409 &&
          'Date range overlaps an existing schedule.') ||
        error.message ||
        'Upload failed!';
      setWarningOverlap(error.response?.data?.overlap || null);
      setWarningMessage(message);
      setShowWarningModal(true);
    }
  };

  const openBulkBlocksModalForSelected = () => {
    if (selectedUsers.size === 0) {
      setSuccessAction('Please select at least one user.');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      return;
    }
    setBulkScheduleBlocks([
      {
        id: Date.now(),
        academicYear: '',
        semester: '',
        startDate: '',
        endDate: '',
      },
    ]);
    setBulkTargetEmployees(Array.from(selectedUsers));
    setShowBulkBlocksModal(true);
  };

  const openBulkBlocksModalForAllMissing = () => {
    const usersWithoutDefault = allUsers
      .filter((u) => !u.hasDefaultOfficialTime)
      .map((u) => u.employeeNumber);
    if (usersWithoutDefault.length === 0) {
      setSuccessAction('All users already have default official time.');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      return;
    }
    setBulkScheduleBlocks([
      {
        id: Date.now(),
        academicYear: '',
        semester: '',
        startDate: '',
        endDate: '',
      },
    ]);
    setBulkTargetEmployees(usersWithoutDefault);
    setShowBulkBlocksModal(true);
  };

  const handleConfirmBulkBlocks = () => {
    const cleaned = (bulkScheduleBlocks || []).map((b) => ({
      ...b,
      academicYear: String(b.academicYear || '').trim(),
      semester: String(b.semester || '').trim(),
      startDate: String(b.startDate || '').trim(),
      endDate: String(b.endDate || '').trim(),
    }));

    const hasBlock = cleaned.length > 0;
    const allFilled =
      hasBlock &&
      cleaned.every(
        (b) => b.academicYear && b.semester && b.startDate && b.endDate,
      );
    if (!hasBlock || !allFilled) {
      setSuccessAction(
        'Please complete Academic Year, Semester, Start Date, and End Date for all blocks before proceeding.',
      );
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);
      return;
    }

    // Save the cleaned blocks and mark bulk mode
    setBulkScheduleBlocks(cleaned);
    setIsBulkSchedule(true);

    // Pre-fill schedule period fields from the first block (so the schedule modal "already has it inputted")
    const firstBlock = cleaned[0] || null;
    if (firstBlock) {
      setDraftAcademicYear(firstBlock.academicYear || '');
      setSchoolYearInfo((prev) => ({
        ...prev,
        semester: firstBlock.semester || prev.semester,
      }));
      setDraftStartDate(firstBlock.startDate || '');
      setDraftEndDate(firstBlock.endDate || '');
    }

    // Use the first target employee (if any) to pre-select the employee field for the schedule modal
    const empId = String(bulkTargetEmployees[0] || '');
    setemployeeID(empId);

    // Prepare modalRecords (Monday - Sunday) so the schedule modal has the rows ready
    const daysOrder = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    const defaultRow = (day) => ({
      employeeID: empId,
      day,
      officialTimeIN: '08:00:00 AM',
      officialBreaktimeIN: '00:00:00 AM',
      officialBreaktimeOUT: '00:00:00 PM',
      officialTimeOUT: '05:00:00 PM',
      officialHonorariumTimeIN: '00:00:00 AM',
      officialHonorariumTimeOUT: '00:00:00 PM',
      officialServiceCreditTimeIN: '00:00:00 AM',
      officialServiceCreditTimeOUT: '00:00:00 AM',
      officialOverTimeIN: '00:00:00 AM',
      officialOverTimeOUT: '00:00:00 PM',
      breaktime: '',
    });
    const sevenRows = daysOrder.map((day) => defaultRow(day));
    setModalRecords(sevenRows);

    // Move to the next step: close bulk block modal and open schedule modal
    setShowBulkBlocksModal(false);
    setShowScheduleModal(true);
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
        message="You do not have permission to access Official Time Form. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }
  //ACCESSING END2

  return (
    <>
      {/* LoadingOverlay - checking for conflicts or saving */}
      <LoadingOverlay
        open={loading || checkingOverlap}
        message={
          checkingOverlap ? 'Checking schedule for conflicts...' : 'Saving...'
        }
      />

      <Box
        sx={{
          py: 4,
          borderRadius: '14px',
          width: '100vw', // Full viewport width
          mx: 'auto', // Center horizontally
          maxWidth: '100%', // Ensure it doesn't exceed viewport
          overflow: 'hidden', // Prevent horizontal scroll
          position: 'relative',
          left: '50%',
          transform: 'translateX(-50%)', // Center the element
        }}
      >
        {/* Wider Container */}
        <Box sx={{ px: 6, mx: 'auto', maxWidth: '1600px' }}>
          {/* Header */}
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
                        <Schedule
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
                          Official Time Schedule
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{
                            opacity: 0.8,
                            fontWeight: 400,
                            color: textPrimaryColor,
                          }}
                        >
                          Manage and update official time schedules for
                          employees
                        </Typography>
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Chip
                        label="System Generated"
                        size="small"
                        sx={{
                          bgcolor: alpha(accentColor, 0.15),
                          color: textPrimaryColor,
                          fontWeight: 500,
                          '& .MuiChip-label': { px: 1 },
                        }}
                      />
                      <ProfessionalButton
                        variant={showAllUsers ? 'contained' : 'outlined'}
                        onClick={() => {
                          setShowAllUsers(!showAllUsers);
                          if (!showAllUsers) {
                            fetchAllUsers();
                          }
                        }}
                        startIcon={<PeopleIcon />}
                        sx={{
                          bgcolor: showAllUsers ? accentColor : 'transparent',
                          color: showAllUsers ? primaryColor : textPrimaryColor,
                          borderColor: accentColor,
                          '&:hover': {
                            bgcolor: showAllUsers
                              ? accentDark
                              : alpha(accentColor, 0.1),
                          },
                        }}
                      >
                        {showAllUsers ? 'Hide All Users' : 'View All Users'}
                      </ProfessionalButton>
                      <Tooltip title="Refresh Data">
                        <IconButton
                          onClick={handleSearch}
                          disabled={!employeeID}
                          sx={{
                            bgcolor: alpha(accentColor, 0.1),
                            '&:hover': { bgcolor: alpha(accentColor, 0.2) },
                            color: textPrimaryColor,
                            width: 48,
                            height: 48,
                            '&:disabled': {
                              bgcolor: alpha(accentColor, 0.05),
                              color: alpha(accentColor, 0.3),
                            },
                          }}
                        >
                          <SearchIcon />
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
            <GlassCard
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
              <CardContent sx={{ p: 4 }}>
                <Box component="form">
                  <Grid container spacing={4} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={3}>
                      <ModernTextField
                        fullWidth
                        label="Employee Number"
                        value={employeeID}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d+$/.test(value)) {
                            setemployeeID(value);
                          }
                        }}
                        onKeyPress={(e) => {
                          if (!/[0-9]/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Person sx={{ color: textPrimaryColor }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                      <ModernTextField
                        fullWidth
                        label="Academic Year"
                        placeholder="e.g. 2025-2026"
                        value={draftAcademicYear}
                        onChange={(e) => setDraftAcademicYear(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                      <Autocomplete
                        freeSolo
                        options={[
                          '1st Semester',
                          '2nd Semester',
                          'Summer',
                          'Vacation',
                          'Christmas break',
                          'Midyear',
                          'Enrollment period',
                        ]}
                        value={schoolYearInfo.semester || null}
                        onInputChange={(_, value) =>
                          setSchoolYearInfo((prev) => ({
                            ...prev,
                            semester: value ?? '',
                          }))
                        }
                        onChange={(_, value) =>
                          setSchoolYearInfo((prev) => ({
                            ...prev,
                            semester:
                              (typeof value === 'string' ? value : '') || '',
                          }))
                        }
                        renderInput={(params) => (
                          <ModernTextField
                            {...params}
                            label="Semester"
                            placeholder="e.g. 1st Semester, Vacation"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                      <ModernTextField
                        fullWidth
                        label="Start Date"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        value={draftStartDate}
                        onChange={(e) => setDraftStartDate(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                      <ModernTextField
                        fullWidth
                        label="End Date"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        value={draftEndDate}
                        onChange={(e) => setDraftEndDate(e.target.value)}
                      />
                    </Grid>
                    {/* Row 2: Choose File (left) | Search + Create new Schedule (right) */}
                    <Grid
                      item
                      xs={12}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 2,
                      }}
                    >
                      <Box
                        display="flex"
                        gap={2}
                        alignItems="center"
                        flexWrap="wrap"
                      >
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          id="upload-button"
                          style={{ display: 'none' }}
                          onChange={(e) => setFile(e.target.files[0])}
                        />
                        <label htmlFor="upload-button">
                          <ProfessionalButton
                            variant="outlined"
                            component="span"
                            startIcon={<CloudUploadIcon />}
                            sx={{
                              borderColor: accentColor,
                              color: textPrimaryColor,
                              '&:hover': {
                                backgroundColor: alpha(accentColor, 0.1),
                              },
                            }}
                          >
                            Choose File
                          </ProfessionalButton>
                        </label>
                        <ProfessionalButton
                          variant="contained"
                          onClick={handleUpload}
                          disabled={!file}
                          startIcon={<CloudUploadIcon />}
                          sx={{ bgcolor: accentColor, color: primaryColor }}
                        >
                          Upload
                        </ProfessionalButton>
                        {file && (
                          <Typography
                            variant="body2"
                            sx={{ color: alpha(textPrimaryColor, 0.8) }}
                          >
                            {file.name}
                          </Typography>
                        )}
                      </Box>
                      <Box
                        display="flex"
                        gap={2}
                        alignItems="center"
                        flexWrap="wrap"
                      >
                        <ProfessionalButton
                          variant="contained"
                          onClick={handleSearch}
                          startIcon={<SearchIcon />}
                          disabled={!employeeID}
                          sx={{ bgcolor: accentColor, color: primaryColor }}
                        >
                          Search
                        </ProfessionalButton>
                        <ProfessionalButton
                          variant="contained"
                          onClick={openCreateScheduleModal}
                          disabled={
                            !employeeID ||
                            ((!hasSearched || records.length > 0) &&
                              (!draftAcademicYear ||
                                !schoolYearInfo.semester ||
                                !draftStartDate ||
                                !draftEndDate))
                          }
                          startIcon={<Schedule />}
                          sx={{
                            bgcolor: accentDark,
                            color: primaryColor,
                            '&:hover': { bgcolor: accentColor },
                            '&:disabled': { opacity: 0.7 },
                          }}
                        >
                          Create new Schedule
                        </ProfessionalButton>
                      </Box>
                    </Grid>
                  </Grid>
                  <Divider
                    sx={{ my: 2, borderColor: alpha(accentColor, 0.1) }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ color: alpha(textPrimaryColor, 0.7) }}
                  >
                    Fill Employee Number, Academic Year (e.g. 2025-2026),
                    Semester, Start Date, and End Date first, then click Create
                    new Schedule to add a schedule in the pop-up modal. Or
                    search and upload Excel.
                  </Typography>

                  {/* Existing schedules inside GlassCard */}
                  {hasSearched && (
                    <Box
                      sx={{
                        mt: 3,
                        pt: 2,
                        borderTop: `1px solid ${alpha(accentColor, 0.15)}`,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 1.5,
                        }}
                      >
                        {records.length > 0 ? (
                          <CheckCircle
                            sx={{ color: '#2e7d32', fontSize: 22 }}
                          />
                        ) : (
                          <EventBusy
                            sx={{
                              color: alpha(textPrimaryColor, 0.6),
                              fontSize: 22,
                            }}
                          />
                        )}
                        <Typography
                          variant="subtitle2"
                          sx={{ color: '#2e7d32', fontWeight: 600 }}
                        >
                          Existing schedules
                        </Typography>
                      </Box>
                      {(() => {
                        const byKey = new Map();
                        for (const r of records || []) {
                          const key = `${r.academicYear ?? ''}|${r.startDate ?? ''}|${r.endDate ?? ''}`;
                          if (!byKey.has(key))
                            byKey.set(key, {
                              academicYear: r.academicYear,
                              startDate: r.startDate,
                              endDate: r.endDate,
                              status: r.status,
                            });
                        }
                        const validSchedules = Array.from(byKey.values())
                          .filter(
                            (v) =>
                              (v.startDate && String(v.startDate).trim()) ||
                              (v.endDate && String(v.endDate).trim()),
                          )
                          .sort((a, b) => {
                            const aActive =
                              String(a.status || 'active').toLowerCase() ===
                              'active';
                            const bActive =
                              String(b.status || 'active').toLowerCase() ===
                              'active';
                            return (bActive ? 1 : 0) - (aActive ? 1 : 0);
                          });
                        if (
                          records.length === 0 ||
                          validSchedules.length === 0
                        ) {
                          return (
                            <Box
                              sx={{
                                py: 2,
                                px: 2,
                                bgcolor: alpha(primaryColor, 0.06),
                                borderRadius: 1.5,
                                border: `1px dashed ${alpha(accentColor, 0.3)}`,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  color: textPrimaryColor,
                                  fontWeight: 500,
                                  textAlign: 'center',
                                }}
                              >
                                No existing record for this employee.
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: alpha(textPrimaryColor, 0.8),
                                  textAlign: 'center',
                                  mt: 0.5,
                                  fontSize: '0.85rem',
                                }}
                              >
                                Create a schedule using the button above.
                              </Typography>
                            </Box>
                          );
                        }
                        return (
                          <Box display="flex" flexDirection="column" gap={1}>
                            {validSchedules.map((v, idx) => {
                              const isActive =
                                String(v.status || 'active').toLowerCase() ===
                                'active';
                              const openView = () => {
                                const rows = (records || []).filter(
                                  (r) =>
                                    String(r.startDate || '') ===
                                      String(v.startDate || '') &&
                                    String(r.endDate || '') ===
                                      String(v.endDate || ''),
                                );
                                setViewScheduleInfo({
                                  academicYear: v.academicYear,
                                  startDate: v.startDate,
                                  endDate: v.endDate,
                                  status: v.status,
                                });
                                setViewScheduleRecords(rows);
                                setViewScheduleView('workDays');
                                const foundUser = allUsers.find(
                                  (u) =>
                                    String(u.employeeNumber) ===
                                    String(employeeID),
                                );
                                setViewScheduleEmployeeName(
                                  foundUser?.fullName || '',
                                );
                                setShowViewScheduleModal(true);
                              };
                              return (
                                <Box
                                  key={idx}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 2,
                                    width: '100%',
                                    py: 0.5,
                                    borderBottom:
                                      idx < validSchedules.length - 1
                                        ? `1px solid ${alpha(accentColor, 0.12)}`
                                        : 'none',
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 1,
                                      minWidth: 0,
                                      flex: 1,
                                    }}
                                  >
                                    <Schedule
                                      sx={{
                                        color: accentColor,
                                        fontSize: 18,
                                        flexShrink: 0,
                                      }}
                                    />
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        color: textPrimaryColor,
                                        fontWeight: 500,
                                      }}
                                    >
                                      {v.academicYear || '—'} |{' '}
                                      {formatDateLong(v.startDate) ||
                                        formatDateOnly(v.startDate)}{' '}
                                      –{' '}
                                      {formatDateLong(v.endDate) ||
                                        formatDateOnly(v.endDate)}
                                    </Typography>
                                  </Box>
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 1,
                                      flexShrink: 0,
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        px: 1,
                                        py: 0.35,
                                        borderRadius: 1,
                                        fontWeight: 600,
                                        bgcolor: '#fff',
                                        color: isActive ? '#2e7d32' : '#ed6c02',
                                        border: '1px solid',
                                        borderColor: isActive
                                          ? '#2e7d32'
                                          : '#ed6c02',
                                      }}
                                    >
                                      {isActive ? 'Active' : 'Inactive'}
                                    </Typography>
                                    <Tooltip title="View official time">
                                      <IconButton
                                        size="small"
                                        onClick={openView}
                                        sx={{
                                          color: accentColor,
                                          '&:hover': {
                                            bgcolor: alpha(accentColor, 0.1),
                                          },
                                        }}
                                      >
                                        <Visibility fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </Box>
                              );
                            })}
                          </Box>
                        );
                      })()}
                    </Box>
                  )}
                </Box>
              </CardContent>
            </GlassCard>
          </Fade>

          {/* Create new Schedule modal */}
          <Dialog
            open={showScheduleModal}
            onClose={() => setShowScheduleModal(false)}
            maxWidth="md"
            fullWidth
            PaperProps={{
              sx: { borderRadius: 2, border: `2px solid ${accentColor}` },
            }}
          >
            <DialogTitle
              sx={{
                bgcolor: accentColor,
                color: primaryColor,
                fontWeight: 700,
                pt: 1.5,
                px: 2,
                pb: 1.25,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 700, color: primaryColor }}>
                    Create new Schedule
                  </Typography>
                  {/* Show selected employees when bulk mode */}
                  {isBulkSchedule ? (
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 1,
                        mt: 1,
                        alignItems: 'center',
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ color: primaryColor, fontWeight: 600 }}
                      >
                        Selected ({bulkTargetEmployees.length}):
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 0.5,
                          overflowX: 'auto',
                          py: 0.5,
                        }}
                      >
                        {bulkTargetEmployees &&
                        bulkTargetEmployees.length > 0 ? (
                          bulkTargetEmployees.map((id, idx) => (
                            <Chip
                              key={idx}
                              label={String(id)}
                              size="small"
                              sx={{
                                bgcolor: alpha(primaryColor, 0.12),
                                color: primaryColor,
                                border: `1px solid ${alpha(accentColor, 0.12)}`,
                                mr: 0.5,
                                fontWeight: 600,
                              }}
                            />
                          ))
                        ) : (
                          <Typography
                            variant="caption"
                            sx={{ color: primaryColor }}
                          >
                            —
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ) : (
                    <Typography
                      variant="caption"
                      sx={{ color: primaryColor, fontWeight: 600, mt: 0.75 }}
                    >
                      Employee: {employeeID || '—'}
                    </Typography>
                  )}
                </Box>

                <IconButton
                  size="small"
                  onClick={() => {
                    // Close schedule modal; keep bulk state intact (user can go back)
                    setShowScheduleModal(false);
                  }}
                  sx={{
                    color: primaryColor,
                    border: `1px solid ${alpha(primaryColor, 0.12)}`,
                  }}
                  aria-label="Close"
                >
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent
              sx={{
                bgcolor: secondaryColor,
                pt: 2,
                pb: 2,
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box
                sx={{
                  py: 2,
                  px: 2,
                  mb: 2,
                  bgcolor: alpha(primaryColor, 0.2),
                  borderRadius: 2,
                  border: `1px solid ${alpha(accentColor, 0.2)}`,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 600, color: textPrimaryColor, mb: 1.5 }}
                >
                  Schedule period
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <ModernTextField
                      fullWidth
                      size="small"
                      label="Academic Year"
                      value={draftAcademicYear || ''}
                      onChange={(e) =>
                        setDraftAcademicYear(e.target.value || '')
                      }
                      InputProps={{
                        readOnly: !!draftAcademicYear && isBulkSchedule,
                      }}
                      placeholder="e.g. 2025-2026"
                      sx={{
                        '& .MuiInputBase-input': { color: textPrimaryColor },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <ModernTextField
                      fullWidth
                      size="small"
                      label="Semester"
                      value={schoolYearInfo.semester || ''}
                      onChange={(e) =>
                        setSchoolYearInfo((prev) => ({
                          ...prev,
                          semester: e.target.value || '',
                        }))
                      }
                      InputProps={{
                        readOnly: !!draftAcademicYear && isBulkSchedule,
                      }}
                      placeholder="e.g. 1st Sem"
                      sx={{
                        '& .MuiInputBase-input': { color: textPrimaryColor },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <ModernTextField
                      fullWidth
                      size="small"
                      label="Start Date"
                      type="date"
                      value={draftStartDate || ''}
                      onChange={(e) => setDraftStartDate(e.target.value || '')}
                      InputProps={{
                        readOnly: !!draftAcademicYear && isBulkSchedule,
                      }}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiInputBase-input': { color: textPrimaryColor },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <ModernTextField
                      fullWidth
                      size="small"
                      label="End Date"
                      type="date"
                      value={draftEndDate || ''}
                      onChange={(e) => setDraftEndDate(e.target.value || '')}
                      InputProps={{
                        readOnly: !!draftAcademicYear && isBulkSchedule,
                      }}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiInputBase-input': { color: textPrimaryColor },
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ display: 'flex', width: '100%', gap: 0, mb: 2 }}>
                {['workDays', 'honorarium', 'serviceCredits', 'overtime'].map(
                  (view) => (
                    <Button
                      key={view}
                      variant={scheduleView === view ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setScheduleView(view)}
                      fullWidth
                      sx={{
                        flex: 1,
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: 0,
                        '&:first-of-type': {
                          borderTopLeftRadius: 8,
                          borderBottomLeftRadius: 8,
                        },
                        '&:last-of-type': {
                          borderTopRightRadius: 8,
                          borderBottomRightRadius: 8,
                        },
                        bgcolor:
                          scheduleView === view ? accentColor : 'transparent',
                        color:
                          scheduleView === view ? primaryColor : accentColor,
                        borderColor: accentColor,
                        '&:hover': {
                          bgcolor:
                            scheduleView === view
                              ? accentDark
                              : alpha(accentColor, 0.1),
                        },
                      }}
                    >
                      {view === 'workDays' && 'Work Days'}
                      {view === 'honorarium' && 'Honorarium'}
                      {view === 'serviceCredits' && 'Service Credits'}
                      {view === 'overtime' && 'Overtime'}
                    </Button>
                  ),
                )}
              </Box>

              <Typography
                variant="subtitle2"
                sx={{ mb: 1, fontWeight: 600, color: textPrimaryColor }}
              >
                {scheduleView === 'workDays' && 'Work schedule (7 days)'}
                {scheduleView === 'honorarium' && 'Honorarium schedule'}
                {scheduleView === 'serviceCredits' &&
                  'Service Credits schedule'}
                {scheduleView === 'overtime' && 'Overtime schedule'}
              </Typography>
              <TableContainer sx={{ overflow: 'visible', flexShrink: 0 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: alpha(primaryColor, 0.7) }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: accentColor }}>
                        Day
                      </TableCell>
                      {scheduleView === 'workDays' &&
                        ['Time In', 'Break In', 'Break Out', 'Time Out'].map(
                          (h, i) => (
                            <TableCell
                              key={i}
                              sx={{ fontWeight: 600, color: accentColor }}
                            >
                              {h}
                            </TableCell>
                          ),
                        )}
                      {scheduleView === 'honorarium' &&
                        ['Honorarium Time In', 'Honorarium Time Out'].map(
                          (h, i) => (
                            <TableCell
                              key={i}
                              sx={{ fontWeight: 600, color: accentColor }}
                            >
                              {h}
                            </TableCell>
                          ),
                        )}
                      {scheduleView === 'serviceCredits' &&
                        [
                          'Service Credit Time In',
                          'Service Credit Time Out',
                        ].map((h, i) => (
                          <TableCell
                            key={i}
                            sx={{ fontWeight: 600, color: accentColor }}
                          >
                            {h}
                          </TableCell>
                        ))}
                      {scheduleView === 'overtime' &&
                        ['Over-Time In', 'Over-Time Out'].map((h, i) => (
                          <TableCell
                            key={i}
                            sx={{ fontWeight: 600, color: accentColor }}
                          >
                            {h}
                          </TableCell>
                        ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {modalRecords.map((record, index) => (
                      <TableRow
                        key={record.day || index}
                        sx={{
                          '&:nth-of-type(even)': {
                            bgcolor: alpha(primaryColor, 0.2),
                          },
                        }}
                      >
                        <TableCell>
                          <ModernTextField
                            size="small"
                            fullWidth
                            value={record.day}
                            InputProps={{ readOnly: true }}
                          />
                        </TableCell>
                        {scheduleView === 'workDays' && (
                          <>
                            <TableCell>
                              <ModernTextField
                                size="small"
                                fullWidth
                                value={record.officialTimeIN || ''}
                                onChange={(e) =>
                                  handleModalRecordChange(
                                    index,
                                    'officialTimeIN',
                                    e.target.value,
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <ModernTextField
                                size="small"
                                fullWidth
                                value={record.officialBreaktimeIN || ''}
                                onChange={(e) =>
                                  handleModalRecordChange(
                                    index,
                                    'officialBreaktimeIN',
                                    e.target.value,
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <ModernTextField
                                size="small"
                                fullWidth
                                value={record.officialBreaktimeOUT || ''}
                                onChange={(e) =>
                                  handleModalRecordChange(
                                    index,
                                    'officialBreaktimeOUT',
                                    e.target.value,
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <ModernTextField
                                size="small"
                                fullWidth
                                value={record.officialTimeOUT || ''}
                                onChange={(e) =>
                                  handleModalRecordChange(
                                    index,
                                    'officialTimeOUT',
                                    e.target.value,
                                  )
                                }
                              />
                            </TableCell>
                          </>
                        )}
                        {scheduleView === 'honorarium' && (
                          <>
                            <TableCell>
                              <ModernTextField
                                size="small"
                                fullWidth
                                value={record.officialHonorariumTimeIN || ''}
                                onChange={(e) =>
                                  handleModalRecordChange(
                                    index,
                                    'officialHonorariumTimeIN',
                                    e.target.value,
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <ModernTextField
                                size="small"
                                fullWidth
                                value={record.officialHonorariumTimeOUT || ''}
                                onChange={(e) =>
                                  handleModalRecordChange(
                                    index,
                                    'officialHonorariumTimeOUT',
                                    e.target.value,
                                  )
                                }
                              />
                            </TableCell>
                          </>
                        )}
                        {scheduleView === 'serviceCredits' && (
                          <>
                            <TableCell>
                              <ModernTextField
                                size="small"
                                fullWidth
                                value={record.officialServiceCreditTimeIN || ''}
                                onChange={(e) =>
                                  handleModalRecordChange(
                                    index,
                                    'officialServiceCreditTimeIN',
                                    e.target.value,
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <ModernTextField
                                size="small"
                                fullWidth
                                value={
                                  record.officialServiceCreditTimeOUT || ''
                                }
                                onChange={(e) =>
                                  handleModalRecordChange(
                                    index,
                                    'officialServiceCreditTimeOUT',
                                    e.target.value,
                                  )
                                }
                              />
                            </TableCell>
                          </>
                        )}
                        {scheduleView === 'overtime' && (
                          <>
                            <TableCell>
                              <ModernTextField
                                size="small"
                                fullWidth
                                value={record.officialOverTimeIN || ''}
                                onChange={(e) =>
                                  handleModalRecordChange(
                                    index,
                                    'officialOverTimeIN',
                                    e.target.value,
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <ModernTextField
                                size="small"
                                fullWidth
                                value={record.officialOverTimeOUT || ''}
                                onChange={(e) =>
                                  handleModalRecordChange(
                                    index,
                                    'officialOverTimeOUT',
                                    e.target.value,
                                  )
                                }
                              />
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
            <DialogActions sx={{ bgcolor: primaryColor, px: 3, py: 2, gap: 2 }}>
              {isBulkSchedule && (
                <ProfessionalButton
                  variant="outlined"
                  onClick={() => {
                    // allow going back to edit bulk blocks (preserve state)
                    setShowScheduleModal(false);
                    setShowBulkBlocksModal(true);
                  }}
                  sx={{ borderColor: accentColor, color: textPrimaryColor }}
                >
                  Back
                </ProfessionalButton>
              )}
              <ProfessionalButton
                variant="outlined"
                onClick={() => setShowScheduleModal(false)}
                sx={{ borderColor: accentColor, color: textPrimaryColor }}
              >
                Cancel
              </ProfessionalButton>
              <ProfessionalButton
                variant="contained"
                onClick={(e) => handleSubmitFromModal(e)}
                startIcon={<SaveIcon />}
                sx={{ bgcolor: accentColor, color: primaryColor }}
              >
                Save schedule
              </ProfessionalButton>
            </DialogActions>
          </Dialog>

          {/* Conflict: schedule range already exists */}
          <Dialog
            open={showConflictModal}
            onClose={() => setShowConflictModal(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}
          >
            <DialogTitle
              sx={{
                bgcolor: alpha(accentColor, 0.15),
                color: accentColor,
                fontWeight: 700,
                py: 2,
                px: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <WarningAmber sx={{ fontSize: 28 }} />
              Schedule already exists
            </DialogTitle>
            <DialogContent
              sx={{ bgcolor: secondaryColor, pt: 3, pb: 3, px: 3 }}
            >
              <Box sx={{ mt: 2.5 }}>
                <Typography sx={{ color: '#000', mb: 1.5, lineHeight: 1.6 }}>
                  The selected date range already has an official time for this
                  employee.
                </Typography>
                <Box
                  sx={{
                    bgcolor: alpha(accentColor, 0.08),
                    borderRadius: 1.5,
                    px: 2,
                    py: 1.5,
                    border: `1px solid ${alpha(accentColor, 0.2)}`,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: '#c62828', fontWeight: 600 }}
                  >
                    {formatDateOnly(draftStartDate)} –{' '}
                    {formatDateOnly(draftEndDate)}
                  </Typography>
                </Box>
                <Typography sx={{ color: '#000', mt: 1.5, fontSize: '0.9rem' }}>
                  Please choose different dates to create a new schedule.
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions
              sx={{
                bgcolor: alpha(primaryColor, 0.04),
                px: 3,
                py: 1.5,
                borderTop: `1px solid ${alpha(accentColor, 0.15)}`,
              }}
            >
              <ProfessionalButton
                variant="contained"
                onClick={() => setShowConflictModal(false)}
                sx={{
                  bgcolor: '#fff',
                  color: '#000',
                  minWidth: 100,
                  border: '1px solid #ccc',
                  '&:hover': { bgcolor: '#f5f5f5' },
                }}
              >
                OK
              </ProfessionalButton>
            </DialogActions>
          </Dialog>

          {/* Bulk blocks modal (for selecting multiple academic year / semester / date ranges) */}
          <Dialog
            open={showBulkBlocksModal}
            onClose={() => setShowBulkBlocksModal(false)}
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}
          >
            <DialogTitle
              sx={{
                bgcolor: alpha(accentColor, 0.15),
                color: accentColor,
                fontWeight: 700,
                px: 3,
                py: 1.5,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, color: accentColor }}>
                    Bulk Schedule Blocks
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      mt: 1,
                      alignItems: 'center',
                      minWidth: 0,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: accentColor, fontWeight: 600 }}
                    >
                      Selected ({bulkTargetEmployees.length}):
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 0.5,
                        overflowX: 'auto',
                        py: 0.5,
                      }}
                    >
                      {bulkTargetEmployees && bulkTargetEmployees.length > 0 ? (
                        bulkTargetEmployees.map((id, idx) => (
                          <Chip
                            key={idx}
                            label={String(id)}
                            size="small"
                            sx={{
                              bgcolor: alpha(accentColor, 0.08),
                              color: accentColor,
                              border: `1px solid ${alpha(accentColor, 0.12)}`,
                              mr: 0.5,
                              fontWeight: 600,
                            }}
                          />
                        ))
                      ) : (
                        <Typography
                          variant="caption"
                          sx={{ color: accentColor }}
                        >
                          —
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>

                <IconButton
                  size="small"
                  onClick={() => setShowBulkBlocksModal(false)}
                  sx={{ color: accentColor }}
                  aria-label="Close"
                >
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent
              sx={{ bgcolor: secondaryColor, pt: 3, pb: 2, px: 3 }}
            >
              <Typography sx={{ color: '#000', mb: 2 }}>
                Add one or more schedule blocks (Academic Year, Semester, Start
                Date, End Date). These blocks will be applied to all selected
                employees using the times you set in the Create Schedule modal.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {bulkScheduleBlocks.map((block, idx) => (
                  <Card
                    key={block.id}
                    variant="outlined"
                    sx={{ p: 2, borderColor: alpha(accentColor, 0.3) }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1,
                      }}
                    >
                      <Typography sx={{ fontWeight: 700, color: '#000' }}>
                        Block {idx + 1}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setBulkScheduleBlocks((prev) =>
                            prev.filter((b) => b.id !== block.id),
                          )
                        }
                        disabled={bulkScheduleBlocks.length === 1}
                        sx={{ color: '#d32f2f' }}
                      >
                        <Close />
                      </IconButton>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <ModernTextField
                          fullWidth
                          label="Academic Year"
                          placeholder="e.g. 2026-2027"
                          value={block.academicYear}
                          onChange={(e) =>
                            setBulkScheduleBlocks((prev) =>
                              prev.map((b) =>
                                b.id === block.id
                                  ? { ...b, academicYear: e.target.value }
                                  : b,
                              ),
                            )
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <ModernTextField
                          fullWidth
                          label="Semester"
                          placeholder="e.g. 1st Semester"
                          value={block.semester}
                          onChange={(e) =>
                            setBulkScheduleBlocks((prev) =>
                              prev.map((b) =>
                                b.id === block.id
                                  ? { ...b, semester: e.target.value }
                                  : b,
                              ),
                            )
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <ModernTextField
                          fullWidth
                          label="Start Date"
                          type="date"
                          InputLabelProps={{ shrink: true }}
                          value={block.startDate}
                          onChange={(e) =>
                            setBulkScheduleBlocks((prev) =>
                              prev.map((b) =>
                                b.id === block.id
                                  ? { ...b, startDate: e.target.value }
                                  : b,
                              ),
                            )
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <ModernTextField
                          fullWidth
                          label="End Date"
                          type="date"
                          InputLabelProps={{ shrink: true }}
                          value={block.endDate}
                          onChange={(e) =>
                            setBulkScheduleBlocks((prev) =>
                              prev.map((b) =>
                                b.id === block.id
                                  ? { ...b, endDate: e.target.value }
                                  : b,
                              ),
                            )
                          }
                        />
                      </Grid>
                    </Grid>
                  </Card>
                ))}
                <ProfessionalButton
                  variant="outlined"
                  onClick={() =>
                    setBulkScheduleBlocks((prev) => [
                      ...prev,
                      {
                        id: Date.now(),
                        academicYear: '',
                        semester: '',
                        startDate: '',
                        endDate: '',
                      },
                    ])
                  }
                  sx={{
                    borderColor: accentColor,
                    color: accentColor,
                    alignSelf: 'flex-start',
                  }}
                >
                  Add another block
                </ProfessionalButton>
                {(!bulkTargetEmployees || bulkTargetEmployees.length === 0) && (
                  <Typography sx={{ color: '#d32f2f', fontWeight: 600 }}>
                    Select at least one employee before proceeding.
                  </Typography>
                )}
              </Box>
            </DialogContent>
            <DialogActions
              sx={{
                bgcolor: alpha(primaryColor, 0.04),
                px: 3,
                py: 1.5,
                borderTop: `1px solid ${alpha(accentColor, 0.15)}`,
              }}
            >
              <ProfessionalButton
                variant="text"
                onClick={() => setShowBulkBlocksModal(false)}
                sx={{ color: '#000', minWidth: 100 }}
              >
                Cancel
              </ProfessionalButton>
              <ProfessionalButton
                variant="contained"
                onClick={handleConfirmBulkBlocks}
                disabled={
                  !bulkScheduleBlocks.length ||
                  bulkScheduleBlocks.some(
                    (b) =>
                      !b.academicYear ||
                      !b.semester ||
                      !b.startDate ||
                      !b.endDate,
                  ) ||
                  !bulkTargetEmployees.length
                }
                sx={{
                  bgcolor: accentColor,
                  color: primaryColor,
                  minWidth: 160,
                }}
              >
                Proceed to Create Schedule
              </ProfessionalButton>
            </DialogActions>
          </Dialog>

          {/* Warning: time overlap or save error */}
          <Dialog
            open={showWarningModal}
            onClose={() => {
              setShowWarningModal(false);
              setWarningOverlap(null);
            }}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}
          >
            <DialogTitle
              sx={{
                bgcolor: alpha(accentColor, 0.15),
                color: accentColor,
                fontWeight: 700,
                py: 2,
                px: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <WarningAmber sx={{ fontSize: 28 }} />
              Warning
            </DialogTitle>
            <DialogContent
              sx={{ bgcolor: secondaryColor, pt: 3, pb: 3, px: 3 }}
            >
              <Box sx={{ mt: 2.5 }}>
                {warningOverlap ? (
                  <Box>
                    <Typography
                      sx={{
                        color: '#000',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        fontWeight: 700,
                      }}
                    >
                      Schedule conflict detected on {warningOverlap.day} for
                      Employee {warningOverlap.employeeID}:
                    </Typography>

                    <Box
                      sx={{
                        mt: 1.5,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.25,
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={warningOverlap.segmentA?.label || 'Segment A'}
                          sx={{
                            bgcolor: alpha('#d32f2f', 0.15),
                            border: '1px solid',
                            borderColor: alpha('#d32f2f', 0.35),
                            color: '#000',
                            fontWeight: 700,
                          }}
                        />
                        <Typography
                          sx={{
                            alignSelf: 'center',
                            fontWeight: 700,
                            color: '#000',
                          }}
                        >
                          overlaps with
                        </Typography>
                        <Chip
                          label={warningOverlap.segmentB?.label || 'Segment B'}
                          sx={{
                            bgcolor: alpha('#d32f2f', 0.15),
                            border: '1px solid',
                            borderColor: alpha('#d32f2f', 0.35),
                            color: '#000',
                            fontWeight: 700,
                          }}
                        />
                      </Box>

                      <Typography sx={{ color: '#000', lineHeight: 1.6 }}>
                        Overlapping time:&nbsp;
                        <Box
                          component="span"
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            bgcolor: alpha('#ed6c02', 0.2),
                            border: `1px solid ${alpha('#ed6c02', 0.5)}`,
                            fontWeight: 800,
                          }}
                        >
                          {warningOverlap.overlap?.periodText || '—'}
                        </Box>
                      </Typography>

                      <Typography sx={{ color: '#000', lineHeight: 1.6 }}>
                        Please revise the schedule to remove the conflict.
                      </Typography>
                    </Box>

                    {/* Keep the original message for debugging/details */}
                    <Box sx={{ mt: 2 }}>
                      <Typography
                        sx={{
                          color: alpha('#000', 0.7),
                          fontSize: '0.85rem',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {warningMessage}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Typography
                    sx={{
                      color: '#000',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {warningMessage}
                  </Typography>
                )}
              </Box>
            </DialogContent>
            <DialogActions
              sx={{
                bgcolor: alpha(primaryColor, 0.04),
                px: 3,
                py: 1.5,
                borderTop: `1px solid ${alpha(accentColor, 0.15)}`,
              }}
            >
              <ProfessionalButton
                variant="contained"
                onClick={() => {
                  setShowWarningModal(false);
                  setWarningOverlap(null);
                }}
                sx={{
                  bgcolor: '#fff',
                  color: '#000',
                  minWidth: 100,
                  border: '1px solid #ccc',
                  '&:hover': { bgcolor: '#f5f5f5' },
                }}
              >
                OK
              </ProfessionalButton>
            </DialogActions>
          </Dialog>

          {/* View official time modal */}
          <Dialog
            open={showViewScheduleModal}
            onClose={() => setShowViewScheduleModal(false)}
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}
          >
            <DialogTitle
              sx={{
                bgcolor: alpha(accentColor, 0.15),
                color: accentColor,
                fontWeight: 700,
                px: 3,
                py: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <Visibility />
                <Box>
                  <Typography
                    component="span"
                    variant="h6"
                    sx={{ display: 'block' }}
                  >
                    Official time
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#000',
                      fontWeight: 500,
                      fontSize: '0.8rem',
                      mt: 0.25,
                    }}
                  >
                    Employee No: {employeeID || '—'}{' '}
                    {viewScheduleEmployeeName
                      ? ` · ${viewScheduleEmployeeName}`
                      : ''}
                  </Typography>
                </Box>
              </Box>
              <IconButton
                size="small"
                onClick={() => setShowViewScheduleModal(false)}
                sx={{
                  color: accentColor,
                  '&:hover': { bgcolor: alpha(accentColor, 0.15) },
                }}
                aria-label="Close"
              >
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent
              sx={{
                bgcolor: secondaryColor,
                pt: 4,
                pb: 2,
                px: 3,
                overflow: 'visible',
              }}
            >
              {viewScheduleInfo && (
                <>
                  <Box
                    sx={{
                      mb: 2,
                      mt: 0.5,
                      p: 1.5,
                      bgcolor: alpha(primaryColor, 0.08),
                      borderRadius: 1.5,
                      border: `1px solid ${alpha(accentColor, 0.2)}`,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: '#000', fontWeight: 600, mb: 0.75 }}
                    >
                      Academic Year: {viewScheduleInfo.academicYear || '—'}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: '#000', fontWeight: 500, mb: 0.75 }}
                    >
                      Start Date: {formatDateOnly(viewScheduleInfo.startDate)}
                      {formatDateLong(viewScheduleInfo.startDate) && (
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{ color: '#666', fontWeight: 400, ml: 0.5 }}
                        >
                          ({formatDateLong(viewScheduleInfo.startDate)})
                        </Typography>
                      )}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: '#000', fontWeight: 500, mb: 0.75 }}
                    >
                      End Date: {formatDateOnly(viewScheduleInfo.endDate)}
                      {formatDateLong(viewScheduleInfo.endDate) && (
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{ color: '#666', fontWeight: 400, ml: 0.5 }}
                        >
                          ({formatDateLong(viewScheduleInfo.endDate)})
                        </Typography>
                      )}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color:
                          String(
                            viewScheduleInfo.status || 'active',
                          ).toLowerCase() === 'active'
                            ? '#2e7d32'
                            : '#000',
                      }}
                    >
                      Status: {String(viewScheduleInfo.status || 'active')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0, mb: 2 }}>
                    {[
                      'workDays',
                      'honorarium',
                      'serviceCredits',
                      'overtime',
                    ].map((view) => (
                      <Button
                        key={view}
                        variant={
                          viewScheduleView === view ? 'contained' : 'outlined'
                        }
                        size="small"
                        onClick={() => setViewScheduleView(view)}
                        fullWidth
                        sx={{
                          flex: 1,
                          textTransform: 'none',
                          fontWeight: 600,
                          borderRadius: 0,
                          '&:first-of-type': {
                            borderTopLeftRadius: 8,
                            borderBottomLeftRadius: 8,
                          },
                          '&:last-of-type': {
                            borderTopRightRadius: 8,
                            borderBottomRightRadius: 8,
                          },
                          bgcolor:
                            viewScheduleView === view
                              ? accentColor
                              : 'transparent',
                          color:
                            viewScheduleView === view
                              ? primaryColor
                              : accentColor,
                          borderColor: accentColor,
                          '&:hover': {
                            bgcolor:
                              viewScheduleView === view
                                ? accentDark
                                : alpha(accentColor, 0.1),
                          },
                        }}
                      >
                        {view === 'workDays' && 'Work Days'}
                        {view === 'honorarium' && 'Honorarium'}
                        {view === 'serviceCredits' && 'Service Credits'}
                        {view === 'overtime' && 'Overtime'}
                      </Button>
                    ))}
                  </Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1, fontWeight: 600, color: '#000' }}
                  >
                    {viewScheduleView === 'workDays' &&
                      'Work schedule (7 days)'}
                    {viewScheduleView === 'honorarium' && 'Honorarium schedule'}
                    {viewScheduleView === 'serviceCredits' &&
                      'Service Credits schedule'}
                    {viewScheduleView === 'overtime' && 'Overtime schedule'}
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: alpha(primaryColor, 0.5) }}>
                          <TableCell sx={{ fontWeight: 600, color: '#000' }}>
                            Day
                          </TableCell>
                          {viewScheduleView === 'workDays' &&
                            [
                              'Time In',
                              'Break In',
                              'Break Out',
                              'Time Out',
                            ].map((h, i) => (
                              <TableCell
                                key={i}
                                sx={{ fontWeight: 600, color: '#000' }}
                              >
                                {h}
                              </TableCell>
                            ))}
                          {viewScheduleView === 'honorarium' &&
                            ['Honorarium Time In', 'Honorarium Time Out'].map(
                              (h, i) => (
                                <TableCell
                                  key={i}
                                  sx={{ fontWeight: 600, color: '#000' }}
                                >
                                  {h}
                                </TableCell>
                              ),
                            )}
                          {viewScheduleView === 'serviceCredits' &&
                            [
                              'Service Credit Time In',
                              'Service Credit Time Out',
                            ].map((h, i) => (
                              <TableCell
                                key={i}
                                sx={{ fontWeight: 600, color: '#000' }}
                              >
                                {h}
                              </TableCell>
                            ))}
                          {viewScheduleView === 'overtime' &&
                            ['Over-Time In', 'Over-Time Out'].map((h, i) => (
                              <TableCell
                                key={i}
                                sx={{ fontWeight: 600, color: '#000' }}
                              >
                                {h}
                              </TableCell>
                            ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {viewScheduleRecords
                          .sort(
                            (a, b) =>
                              [
                                'Monday',
                                'Tuesday',
                                'Wednesday',
                                'Thursday',
                                'Friday',
                                'Saturday',
                                'Sunday',
                              ].indexOf(a.day || '') -
                              [
                                'Monday',
                                'Tuesday',
                                'Wednesday',
                                'Thursday',
                                'Friday',
                                'Saturday',
                                'Sunday',
                              ].indexOf(b.day || ''),
                          )
                          .map((row, i) => (
                            <TableRow
                              key={row.day || i}
                              sx={{
                                '&:nth-of-type(even)': {
                                  bgcolor: alpha(primaryColor, 0.06),
                                },
                              }}
                            >
                              <TableCell
                                sx={{ color: '#000', fontWeight: 500 }}
                              >
                                {row.day || '—'}
                              </TableCell>
                              {viewScheduleView === 'workDays' && (
                                <>
                                  <TableCell sx={{ color: '#000' }}>
                                    {row.officialTimeIN || '—'}
                                  </TableCell>
                                  <TableCell sx={{ color: '#000' }}>
                                    {row.officialBreaktimeIN || '—'}
                                  </TableCell>
                                  <TableCell sx={{ color: '#000' }}>
                                    {row.officialBreaktimeOUT || '—'}
                                  </TableCell>
                                  <TableCell sx={{ color: '#000' }}>
                                    {row.officialTimeOUT || '—'}
                                  </TableCell>
                                </>
                              )}
                              {viewScheduleView === 'honorarium' && (
                                <>
                                  <TableCell sx={{ color: '#000' }}>
                                    {row.officialHonorariumTimeIN || '—'}
                                  </TableCell>
                                  <TableCell sx={{ color: '#000' }}>
                                    {row.officialHonorariumTimeOUT || '—'}
                                  </TableCell>
                                </>
                              )}
                              {viewScheduleView === 'serviceCredits' && (
                                <>
                                  <TableCell sx={{ color: '#000' }}>
                                    {row.officialServiceCreditTimeIN || '—'}
                                  </TableCell>
                                  <TableCell sx={{ color: '#000' }}>
                                    {row.officialServiceCreditTimeOUT || '—'}
                                  </TableCell>
                                </>
                              )}
                              {viewScheduleView === 'overtime' && (
                                <>
                                  <TableCell sx={{ color: '#000' }}>
                                    {row.officialOverTimeIN || '—'}
                                  </TableCell>
                                  <TableCell sx={{ color: '#000' }}>
                                    {row.officialOverTimeOUT || '—'}
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </DialogContent>
            <DialogActions
              sx={{
                bgcolor: alpha(primaryColor, 0.04),
                px: 3,
                py: 1.5,
                borderTop: `1px solid ${alpha(accentColor, 0.15)}`,
              }}
            >
              <ProfessionalButton
                variant="contained"
                onClick={() => setShowViewScheduleModal(false)}
                sx={{ bgcolor: accentColor, color: primaryColor, minWidth: 80 }}
              >
                Close
              </ProfessionalButton>
            </DialogActions>
          </Dialog>

          {/* Legacy Results card removed - schedule is in modal */}
          {false && records.length > 0 && (
            <Fade in={!loading} timeout={500}>
              <GlassCard
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
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{
                        opacity: 0.8,
                        mb: 0.5,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: accentDark,
                      }}
                    >
                      Time Schedule for Employee Number
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 600, mb: 1, color: accentColor }}
                    >
                      {employeeID}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mt: 2,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Chip
                        icon={<AccessTime />}
                        label={found ? 'Existing Schedule' : 'New Schedule'}
                        size="small"
                        sx={{
                          bgcolor: alpha(accentColor, 0.15),
                          color: textPrimaryColor,
                          fontWeight: 500,
                        }}
                      />
                      <Divider
                        orientation="vertical"
                        flexItem
                        sx={{ borderColor: alpha(accentColor, 0.3) }}
                      />
                      <Button
                        variant={
                          scheduleView === 'workDays' ? 'contained' : 'outlined'
                        }
                        size="small"
                        onClick={() => setScheduleView('workDays')}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          bgcolor:
                            scheduleView === 'workDays'
                              ? accentColor
                              : 'transparent',
                          color:
                            scheduleView === 'workDays'
                              ? primaryColor
                              : accentColor,
                          borderColor: accentColor,
                          '&:hover': {
                            bgcolor:
                              scheduleView === 'workDays'
                                ? accentDark
                                : alpha(accentColor, 0.1),
                          },
                        }}
                      >
                        Work Days
                      </Button>
                      <Button
                        variant={
                          scheduleView === 'honorarium'
                            ? 'contained'
                            : 'outlined'
                        }
                        size="small"
                        onClick={() => setScheduleView('honorarium')}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          bgcolor:
                            scheduleView === 'honorarium'
                              ? accentColor
                              : 'transparent',
                          color:
                            scheduleView === 'honorarium'
                              ? primaryColor
                              : accentColor,
                          borderColor: accentColor,
                          '&:hover': {
                            bgcolor:
                              scheduleView === 'honorarium'
                                ? accentDark
                                : alpha(accentColor, 0.1),
                          },
                        }}
                      >
                        Honorarium
                      </Button>
                      <Button
                        variant={
                          scheduleView === 'serviceCredits'
                            ? 'contained'
                            : 'outlined'
                        }
                        size="small"
                        onClick={() => setScheduleView('serviceCredits')}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          bgcolor:
                            scheduleView === 'serviceCredits'
                              ? accentColor
                              : 'transparent',
                          color:
                            scheduleView === 'serviceCredits'
                              ? primaryColor
                              : accentColor,
                          borderColor: accentColor,
                          '&:hover': {
                            bgcolor:
                              scheduleView === 'serviceCredits'
                                ? accentDark
                                : alpha(accentColor, 0.1),
                          },
                        }}
                      >
                        Service Credits
                      </Button>
                      <Button
                        variant={
                          scheduleView === 'overtime' ? 'contained' : 'outlined'
                        }
                        size="small"
                        onClick={() => setScheduleView('overtime')}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          bgcolor:
                            scheduleView === 'overtime'
                              ? accentColor
                              : 'transparent',
                          color:
                            scheduleView === 'overtime'
                              ? primaryColor
                              : accentColor,
                          borderColor: accentColor,
                          '&:hover': {
                            bgcolor:
                              scheduleView === 'overtime'
                                ? accentDark
                                : alpha(accentColor, 0.1),
                          },
                        }}
                      >
                        OverTime
                      </Button>
                    </Box>
                  </Box>
                  <Avatar
                    sx={{
                      bgcolor: alpha(accentColor, 0.15),
                      width: 80,
                      height: 80,
                      fontSize: '2rem',
                      fontWeight: 600,
                      color: textPrimaryColor,
                    }}
                  >
                    <Schedule />
                  </Avatar>
                </Box>

                <Box component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={6} md={3}>
                      <ModernTextField
                        fullWidth
                        size="small"
                        label="Academic Year"
                        placeholder="e.g. 2025-2026"
                        value={draftAcademicYear}
                        onChange={(e) => setDraftAcademicYear(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <ModernTextField
                        fullWidth
                        size="small"
                        label="Start Date"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        value={draftStartDate}
                        onChange={(e) => setDraftStartDate(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <ModernTextField
                        fullWidth
                        size="small"
                        label="End Date"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        value={draftEndDate}
                        onChange={(e) => setDraftEndDate(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <ModernTextField
                        fullWidth
                        size="small"
                        label="Status"
                        select
                        SelectProps={{ native: true }}
                        value={draftStatus}
                        onChange={(e) => setDraftStatus(e.target.value)}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </ModernTextField>
                    </Grid>
                  </Grid>
                  <PremiumTableContainer>
                    <Table
                      stickyHeader
                      sx={{
                        minWidth:
                          scheduleView === 'workDays' ? '900px' : '700px',
                      }}
                    >
                      <TableHead sx={{ bgcolor: alpha(primaryColor, 0.7) }}>
                        <TableRow>
                          {scheduleView === 'workDays' &&
                            [
                              'Employee Number',
                              'Day',
                              'Time In',
                              'Break In',
                              'Break Out',
                              'Time Out',
                            ].map((header, i) => (
                              <PremiumTableCell
                                key={i}
                                isHeader
                                sx={{ color: accentColor }}
                              >
                                {header}
                              </PremiumTableCell>
                            ))}
                          {scheduleView === 'honorarium' &&
                            [
                              'Employee Number',
                              'Day',
                              'Honorarium Time In',
                              'Honorarium Time Out',
                            ].map((header, i) => (
                              <PremiumTableCell
                                key={i}
                                isHeader
                                sx={{ color: accentColor }}
                              >
                                {header}
                              </PremiumTableCell>
                            ))}
                          {scheduleView === 'serviceCredits' &&
                            [
                              'Employee Number',
                              'Day',
                              'Service Credit Time In',
                              'Service Credit Time Out',
                            ].map((header, i) => (
                              <PremiumTableCell
                                key={i}
                                isHeader
                                sx={{ color: accentColor }}
                              >
                                {header}
                              </PremiumTableCell>
                            ))}
                          {scheduleView === 'overtime' &&
                            [
                              'Employee Number',
                              'Day',
                              'Over-Time In',
                              'Over-Time Out',
                            ].map((header, i) => (
                              <PremiumTableCell
                                key={i}
                                isHeader
                                sx={{ color: accentColor }}
                              >
                                {header}
                              </PremiumTableCell>
                            ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {records.map((record, index) => (
                          <TableRow
                            key={index}
                            sx={{
                              '&:nth-of-type(even)': {
                                bgcolor: alpha(primaryColor, 0.3),
                              },
                              '&:hover': { bgcolor: alpha(accentColor, 0.05) },
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {scheduleView === 'workDays' && (
                              <>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.employeeID}
                                    InputProps={{ readOnly: true }}
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.day}
                                    InputProps={{ readOnly: true }}
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.officialTimeIN}
                                    onChange={(e) =>
                                      handleChange(
                                        index,
                                        'officialTimeIN',
                                        e.target.value,
                                      )
                                    }
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.officialBreaktimeIN}
                                    onChange={(e) =>
                                      handleChange(
                                        index,
                                        'officialBreaktimeIN',
                                        e.target.value,
                                      )
                                    }
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.officialBreaktimeOUT}
                                    onChange={(e) =>
                                      handleChange(
                                        index,
                                        'officialBreaktimeOUT',
                                        e.target.value,
                                      )
                                    }
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.officialTimeOUT}
                                    onChange={(e) =>
                                      handleChange(
                                        index,
                                        'officialTimeOUT',
                                        e.target.value,
                                      )
                                    }
                                  />
                                </PremiumTableCell>
                              </>
                            )}
                            {scheduleView === 'honorarium' && (
                              <>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.employeeID}
                                    InputProps={{ readOnly: true }}
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.day}
                                    InputProps={{ readOnly: true }}
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.officialHonorariumTimeIN}
                                    onChange={(e) =>
                                      handleChange(
                                        index,
                                        'officialHonorariumTimeIN',
                                        e.target.value,
                                      )
                                    }
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.officialHonorariumTimeOUT}
                                    onChange={(e) =>
                                      handleChange(
                                        index,
                                        'officialHonorariumTimeOUT',
                                        e.target.value,
                                      )
                                    }
                                  />
                                </PremiumTableCell>
                              </>
                            )}
                            {scheduleView === 'serviceCredits' && (
                              <>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.employeeID}
                                    InputProps={{ readOnly: true }}
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.day}
                                    InputProps={{ readOnly: true }}
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.officialServiceCreditTimeIN}
                                    onChange={(e) =>
                                      handleChange(
                                        index,
                                        'officialServiceCreditTimeIN',
                                        e.target.value,
                                      )
                                    }
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.officialServiceCreditTimeOUT}
                                    onChange={(e) =>
                                      handleChange(
                                        index,
                                        'officialServiceCreditTimeOUT',
                                        e.target.value,
                                      )
                                    }
                                  />
                                </PremiumTableCell>
                              </>
                            )}
                            {scheduleView === 'overtime' && (
                              <>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.employeeID}
                                    InputProps={{ readOnly: true }}
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.day}
                                    InputProps={{ readOnly: true }}
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.officialOverTimeIN}
                                    onChange={(e) =>
                                      handleChange(
                                        index,
                                        'officialOverTimeIN',
                                        e.target.value,
                                      )
                                    }
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.officialOverTimeOUT}
                                    onChange={(e) =>
                                      handleChange(
                                        index,
                                        'officialOverTimeOUT',
                                        e.target.value,
                                      )
                                    }
                                  />
                                </PremiumTableCell>
                              </>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </PremiumTableContainer>

                  <Box
                    sx={{
                      mt: 3,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {autoSaving && (
                        <Chip
                          icon={<CircularProgress size={16} />}
                          label="Auto-saving..."
                          size="small"
                          sx={{
                            bgcolor: alpha(accentColor, 0.1),
                            color: accentColor,
                          }}
                        />
                      )}
                      {lastSaved && !autoSaving && (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label={`Saved at ${lastSaved.toLocaleTimeString()}`}
                          size="small"
                          sx={{
                            bgcolor: alpha('#4caf50', 0.1),
                            color: '#4caf50',
                          }}
                        />
                      )}
                    </Box>
                    <ProfessionalButton
                      type="submit"
                      variant="contained"
                      startIcon={<SaveIcon />}
                      sx={{
                        py: 2,
                        px: 6,
                        fontSize: '1rem',
                        bgcolor: accentColor,
                        color: primaryColor,
                        '&:hover': { bgcolor: accentDark },
                      }}
                    >
                      {found ? 'Update' : 'Save'}
                    </ProfessionalButton>
                  </Box>
                </Box>
              </GlassCard>
            </Fade>
          )}

          {/* All Users View */}
          {showAllUsers && (
            <Fade in timeout={500}>
              <GlassCard
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
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 600, mb: 0.5, color: textPrimaryColor }}
                    >
                      All Users - Official Time Status
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ opacity: 0.8, color: textPrimaryColor }}
                    >
                      View and manage default official time for all users
                    </Typography>
                  </Box>
                  <Avatar
                    sx={{
                      bgcolor: alpha(accentColor, 0.15),
                      width: 64,
                      height: 64,
                    }}
                  >
                    <PeopleIcon
                      sx={{ fontSize: 32, color: textPrimaryColor }}
                    />
                  </Avatar>
                </Box>

                <CardContent sx={{ p: 4 }}>
                  {/* Search and Actions */}
                  <Box
                    sx={{
                      mb: 3,
                      display: 'flex',
                      gap: 2,
                      alignItems: 'center',
                    }}
                  >
                    <ModernTextField
                      fullWidth
                      placeholder="Search by name or employee number..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setAllUsersPage(0);
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: textPrimaryColor }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                    <ProfessionalButton
                      variant="contained"
                      onClick={openBulkBlocksModalForSelected}
                      disabled={selectedUsers.size === 0 || settingDefault}
                      startIcon={<CheckCircleIcon />}
                      sx={{
                        bgcolor: accentColor,
                        color: primaryColor,
                        minWidth: 220,
                      }}
                    >
                      Bulk Create (Selected: {selectedUsers.size})
                    </ProfessionalButton>
                    <ProfessionalButton
                      variant="outlined"
                      onClick={openBulkBlocksModalForAllMissing}
                      disabled={
                        settingDefault ||
                        allUsers.filter((u) => !u.hasDefaultOfficialTime)
                          .length === 0
                      }
                      sx={{
                        borderColor: accentColor,
                        color: textPrimaryColor,
                        minWidth: 220,
                        '&:hover': {
                          backgroundColor: alpha(accentColor, 0.1),
                        },
                      }}
                    >
                      Bulk Create (All Missing)
                    </ProfessionalButton>
                  </Box>

                  {/* Users Table */}
                  {loadingUsers ? (
                    <Box
                      sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
                    >
                      <CircularProgress sx={{ color: accentColor }} />
                    </Box>
                  ) : (
                    < >
                    <PremiumTableContainer>
                      <Table stickyHeader>
                        <TableHead sx={{ bgcolor: alpha(primaryColor, 0.7) }}>
                          <TableRow>
                            <PremiumTableCell>
                              <Checkbox
                                checked={
                                  filteredAllUsers.length > 0 &&
                                  filteredAllUsers.every((u) =>
                                    selectedUsers.has(u.employeeNumber),
                                  )
                                }
                                indeterminate={
                                  filteredAllUsers.some((u) =>
                                    selectedUsers.has(u.employeeNumber),
                                  ) &&
                                  !filteredAllUsers.every((u) =>
                                    selectedUsers.has(u.employeeNumber),
                                  )
                                }
                                onChange={(e) =>
                                  handleSelectAll(e.target.checked)
                                }
                                sx={{ 
    color: 'white',
    '&.Mui-checked': {
      color: 'white',
    },
    '&.MuiCheckbox-indeterminate': {
      color: 'white',
    }
  }}
                              />
                            </PremiumTableCell>

                            <PremiumTableCell
                              isHeader
                              sx={{ color: accentColor }}
                            >
                              Employee Number
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: accentColor }}
                            >
                              Name
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: accentColor }}
                            >
                              Department
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: accentColor }}
                            >
                              academicYear
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: accentColor }}
                            >
                              Status
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: accentColor }}
                            >
                              startDate
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: accentColor }}
                            >
                              endDate
                            </PremiumTableCell>
                          </TableRow>
                        </TableHead>

                        {/* ... inside TableBody (replace current row rendering) ... */}
                        <TableBody>
                          {paginatedAllUsers.map((user) => (
                            <TableRow
                              key={user.employeeNumber}
                              sx={{
                                '&:nth-of-type(even)': {
                                  bgcolor: alpha(primaryColor, 0.3),
                                },
                                '&:hover': {
                                  bgcolor: alpha(accentColor, 0.05),
                                },
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <PremiumTableCell>
                                <Checkbox
                                  checked={selectedUsers.has(
                                    user.employeeNumber,
                                  )}
                                  onChange={() =>
                                    handleUserSelect(user.employeeNumber)
                                  }
                                  sx={{ color: accentColor }}
                                />
                              </PremiumTableCell>

                              <PremiumTableCell>
                                {user.employeeNumber}
                              </PremiumTableCell>

                              <PremiumTableCell>
                                {user.fullName || 'N/A'}
                              </PremiumTableCell>

                              <PremiumTableCell>
                                {user.department || '—'}
                              </PremiumTableCell>

                              <PremiumTableCell>
                                {user.academicYear || '—'}
                              </PremiumTableCell>

                              <PremiumTableCell>
                                {user.hasDefaultOfficialTime ? (
                                  <Chip
                                    icon={<CheckCircleIcon />}
                                    label="Default"
                                    size="small"
                                    sx={{
                                      bgcolor: alpha('#4caf50', 0.1),
                                      color: '#4caf50',
                                    }}
                                  />
                                ) : (
                                  <Chip
                                    icon={<CancelIcon />}
                                    label="No Default"
                                    size="small"
                                    sx={{
                                      bgcolor: alpha('#f44336', 0.1),
                                      color: '#f44336',
                                    }}
                                  />
                                )}
                              </PremiumTableCell>

                              <PremiumTableCell>
                                {user.startDate
                                  ? formatDateOnly(user.startDate)
                                  : '—'}
                              </PremiumTableCell>

                              <PremiumTableCell>
                                {user.endDate
                                  ? formatDateOnly(user.endDate)
                                  : '—'}
                              </PremiumTableCell>
                            </TableRow>
                          ))}
                          {getFilteredUsers().length === 0 && (
                            <TableRow>
                              <PremiumTableCell
                                colSpan={8}
                                align="center"
                                sx={{ py: 4 }}
                              >
                                <Typography sx={{ color: accentDark }}>
                                  {searchQuery
                                    ? 'No users found matching your search.'
                                    : 'No users found.'}
                                </Typography>
                              </PremiumTableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </PremiumTableContainer>
                    <Box
                      sx={{
                        position: 'sticky',
                        bottom: 0,
                        zIndex: 15,
                        bgcolor: 'background.paper',
                        borderTop: `1px solid ${alpha(primaryColor, 0.2)}`,
                      }}
                    >
                      <TablePagination
                        component="div"
                        count={filteredAllUsers.length}
                        page={allUsersPage}
                        onPageChange={(event, newPage) => setAllUsersPage(newPage)}
                        rowsPerPage={allUsersRowsPerPage}
                        onRowsPerPageChange={(event) => {
                          setAllUsersRowsPerPage(parseInt(event.target.value, 10));
                          setAllUsersPage(0);
                        }}
                        rowsPerPageOptions={[10, 20, 30, 50]}
                        labelRowsPerPage="Rows per page:"
                        labelDisplayedRows={({ from, to, count }) =>
                          `${from}-${to} of ${count} (Total: ${count})`
                        }
                        sx={{
                          '& .MuiTablePagination-toolbar': {
                            minHeight: 56,
                          },
                        }}
                      />
                    </Box>
                    </>
                  )}
                </CardContent>
              </GlassCard>
            </Fade>
          )}

          {/* Upload preview modal - inline to avoid re-mount flash */}
          <Dialog
            open={showPreviewModal}
            onClose={() => setShowPreviewModal(false)}
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}
          >
            <DialogTitle
              sx={{
                bgcolor: alpha(accentColor, 0.15),
                color: accentColor,
                fontWeight: 700,
                px: 3,
                py: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <Visibility />
                <Box>
                  <Typography
                    component="span"
                    variant="h6"
                    sx={{ display: 'block' }}
                  >
                    Uploaded schedule
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#000',
                      fontWeight: 500,
                      fontSize: '0.8rem',
                      mt: 0.25,
                    }}
                  >
                    {previewRecords.length > 0 && previewRecords[0].employeeID
                      ? `Employee No: ${previewRecords[0].employeeID}`
                      : 'Preview'}
                  </Typography>
                </Box>
              </Box>
              <IconButton
                size="small"
                onClick={() => setShowPreviewModal(false)}
                sx={{
                  color: accentColor,
                  '&:hover': { bgcolor: alpha(accentColor, 0.15) },
                }}
                aria-label="Close"
              >
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent
              sx={{
                bgcolor: secondaryColor,
                pt: 4,
                pb: 2,
                px: 3,
                overflow: 'visible',
              }}
            >
              {previewScheduleInfo && (
                <>
                  <Box
                    sx={{
                      mb: 2,
                      mt: 0.5,
                      p: 1.5,
                      bgcolor: alpha(primaryColor, 0.08),
                      borderRadius: 1.5,
                      border: `1px solid ${alpha(accentColor, 0.2)}`,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: '#000', fontWeight: 600, mb: 0.75 }}
                    >
                      Academic Year: {previewScheduleInfo.academicYear || '—'}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: '#000', fontWeight: 500, mb: 0.75 }}
                    >
                      Start Date:{' '}
                      {formatDateOnly(previewScheduleInfo.startDate)}
                      {formatDateLong(previewScheduleInfo.startDate) && (
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{ color: '#666', fontWeight: 400, ml: 0.5 }}
                        >
                          ({formatDateLong(previewScheduleInfo.startDate)})
                        </Typography>
                      )}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: '#000', fontWeight: 500, mb: 0.75 }}
                    >
                      End Date: {formatDateOnly(previewScheduleInfo.endDate)}
                      {formatDateLong(previewScheduleInfo.endDate) && (
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{ color: '#666', fontWeight: 400, ml: 0.5 }}
                        >
                          ({formatDateLong(previewScheduleInfo.endDate)})
                        </Typography>
                      )}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color:
                          String(
                            previewScheduleInfo.status || 'active',
                          ).toLowerCase() === 'active'
                            ? '#2e7d32'
                            : '#000',
                      }}
                    >
                      Status: {String(previewScheduleInfo.status || 'active')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0, mb: 2 }}>
                    {[
                      'workDays',
                      'honorarium',
                      'serviceCredits',
                      'overtime',
                    ].map((view) => (
                      <Button
                        key={view}
                        variant={
                          previewViewScheduleView === view
                            ? 'contained'
                            : 'outlined'
                        }
                        size="small"
                        onClick={() => setPreviewViewScheduleView(view)}
                        fullWidth
                        sx={{
                          flex: 1,
                          textTransform: 'none',
                          fontWeight: 600,
                          borderRadius: 0,
                          '&:first-of-type': {
                            borderTopLeftRadius: 8,
                            borderBottomLeftRadius: 8,
                          },
                          '&:last-of-type': {
                            borderTopRightRadius: 8,
                            borderBottomRightRadius: 8,
                          },
                          bgcolor:
                            previewViewScheduleView === view
                              ? accentColor
                              : 'transparent',
                          color:
                            previewViewScheduleView === view
                              ? primaryColor
                              : accentColor,
                          borderColor: accentColor,
                          '&:hover': {
                            bgcolor:
                              previewViewScheduleView === view
                                ? accentDark
                                : alpha(accentColor, 0.1),
                          },
                        }}
                      >
                        {view === 'workDays' && 'Work Days'}
                        {view === 'honorarium' && 'Honorarium'}
                        {view === 'serviceCredits' && 'Service Credits'}
                        {view === 'overtime' && 'Overtime'}
                      </Button>
                    ))}
                  </Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1, fontWeight: 600, color: '#000' }}
                  >
                    {previewViewScheduleView === 'workDays' &&
                      'Work schedule (7 days)'}
                    {previewViewScheduleView === 'honorarium' &&
                      'Honorarium schedule'}
                    {previewViewScheduleView === 'serviceCredits' &&
                      'Service Credits schedule'}
                    {previewViewScheduleView === 'overtime' &&
                      'Overtime schedule'}
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: alpha(primaryColor, 0.5) }}>
                          <TableCell sx={{ fontWeight: 600, color: '#000' }}>
                            Day
                          </TableCell>
                          {previewViewScheduleView === 'workDays' &&
                            [
                              'Time In',
                              'Break In',
                              'Break Out',
                              'Time Out',
                            ].map((h, i) => (
                              <TableCell
                                key={i}
                                sx={{ fontWeight: 600, color: '#000' }}
                              >
                                {h}
                              </TableCell>
                            ))}
                          {previewViewScheduleView === 'honorarium' &&
                            ['Honorarium Time In', 'Honorarium Time Out'].map(
                              (h, i) => (
                                <TableCell
                                  key={i}
                                  sx={{ fontWeight: 600, color: '#000' }}
                                >
                                  {h}
                                </TableCell>
                              ),
                            )}
                          {previewViewScheduleView === 'serviceCredits' &&
                            [
                              'Service Credit Time In',
                              'Service Credit Time Out',
                            ].map((h, i) => (
                              <TableCell
                                key={i}
                                sx={{ fontWeight: 600, color: '#000' }}
                              >
                                {h}
                              </TableCell>
                            ))}
                          {previewViewScheduleView === 'overtime' &&
                            ['Over-Time In', 'Over-Time Out'].map((h, i) => (
                              <TableCell
                                key={i}
                                sx={{ fontWeight: 600, color: '#000' }}
                              >
                                {h}
                              </TableCell>
                            ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {[...previewRecords]
                          .sort(
                            (a, b) =>
                              [
                                'Monday',
                                'Tuesday',
                                'Wednesday',
                                'Thursday',
                                'Friday',
                                'Saturday',
                                'Sunday',
                              ].indexOf(a.day || '') -
                              [
                                'Monday',
                                'Tuesday',
                                'Wednesday',
                                'Thursday',
                                'Friday',
                                'Saturday',
                                'Sunday',
                              ].indexOf(b.day || ''),
                          )
                          .map((row, i) => (
                            <TableRow
                              key={row.day || i}
                              sx={{
                                '&:nth-of-type(even)': {
                                  bgcolor: alpha(primaryColor, 0.06),
                                },
                              }}
                            >
                              <TableCell
                                sx={{ color: '#000', fontWeight: 500 }}
                              >
                                {row.day || '—'}
                              </TableCell>
                              {previewViewScheduleView === 'workDays' && (
                                <>
                                  <TableCell sx={{ color: '#000' }}>
                                    {row.officialTimeIN || '—'}
                                  </TableCell>
                                  <TableCell sx={{ color: '#000' }}>
                                    {row.officialBreaktimeIN || '—'}
                                  </TableCell>
                                  <TableCell sx={{ color: '#000' }}>
                                    {row.officialBreaktimeOUT || '—'}
                                  </TableCell>
                                  <TableCell sx={{ color: '#000' }}>
                                    {row.officialTimeOUT || '—'}
                                  </TableCell>
                                </>
                              )}
                              {previewViewScheduleView === 'honorarium' && (
                                <>
                                  <TableCell sx={{ color: '#000' }}>
                                    {row.officialHonorariumTimeIN || '—'}
                                  </TableCell>
                                  <TableCell sx={{ color: '#000' }}>
                                    {row.officialHonorariumTimeOUT || '—'}
                                  </TableCell>
                                </>
                              )}
                              {previewViewScheduleView === 'serviceCredits' && (
                                <>
                                  <TableCell sx={{ color: '#000' }}>
                                    {row.officialServiceCreditTimeIN || '—'}
                                  </TableCell>
                                  <TableCell sx={{ color: '#000' }}>
                                    {row.officialServiceCreditTimeOUT || '—'}
                                  </TableCell>
                                </>
                              )}
                              {previewViewScheduleView === 'overtime' && (
                                <>
                                  <TableCell sx={{ color: '#000' }}>
                                    {row.officialOverTimeIN || '—'}
                                  </TableCell>
                                  <TableCell sx={{ color: '#000' }}>
                                    {row.officialOverTimeOUT || '—'}
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </DialogContent>
            <DialogActions
              sx={{
                bgcolor: alpha(primaryColor, 0.04),
                px: 3,
                py: 1.5,
                borderTop: `1px solid ${alpha(accentColor, 0.15)}`,
              }}
            >
              <ProfessionalButton
                variant="contained"
                onClick={() => setShowPreviewModal(false)}
                sx={{ bgcolor: accentColor, color: primaryColor, minWidth: 80 }}
              >
                Close
              </ProfessionalButton>
            </DialogActions>
          </Dialog>

          {/* Success Overlay */}
          <SuccessfulOverlay open={successOpen} action={successAction} />
        </Box>
      </Box>
    </>
  );
};

export default OfficialTimeForm;
