import API_BASE_URL from '../../apiConfig';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { useSocket } from '../../contexts/SocketContext';
import { jwtDecode } from 'jwt-decode';
import {
  AccessTime,
  CalendarToday,
  SearchOutlined,
  ArrowBack,
  ArrowForward,
  Close,
  Circle,
} from '@mui/icons-material';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { Stack, Divider } from '@mui/material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Fade,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  styled,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  CircularProgress as MCircularProgress,
} from '@mui/material';
import { LinearProgress } from '@mui/material';
import earistLogo from '../../assets/earistLogo.png';
import hrisLogo from '../../assets/hrisLogo.png';
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

const generateHash = (data) => {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).toUpperCase();
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

// Shared colgroup matching DailyTimeRecord.jsx exactly
const DTRColGroup = () => (
  <colgroup>
    <col style={{ width: '8%' }} />
    <col style={{ width: '16%' }} />
    <col style={{ width: '16%' }} />
    <col style={{ width: '16%' }} />
    <col style={{ width: '16%' }} />
    <col style={{ width: '14%' }} />
    <col style={{ width: '14%' }} />
  </colgroup>
);

const DailyTimeRecordFaculty = () => {
  const { socket, connected } = useSocket();
  const { settings } = useSystemSettings();
  const [personID, setPersonID] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [records, setRecords] = useState([]);
  const [employeeName, setEmployeeName] = useState('');
  const [officialTimes, setOfficialTimes] = useState({});
  const dtrRef = React.useRef(null);

  const fetchRecordsRef = useRef(null);
  const fetchAllUsersDTRRef = useRef(null);

  // Bulk printing states
  const [allUsersDTR, setAllUsersDTR] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  // Replace surnameFilter with a free-text search query
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);
  const bulkDTRRefs = React.useRef({});

  // ── Anti-tamper state ──────────────────────────────────────────────────────
  const [originalRecords, setOriginalRecords] = useState([]);
  const [recordsHash, setRecordsHash] = useState('');
  const [fetchedAt, setFetchedAt] = useState(null);
  const [integrityStatus, setIntegrityStatus] = useState('none');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // ── Anti-tamper refs ───────────────────────────────────────────────────────
  const observerRef = useRef(null);
  const restoreTimerRef = useRef(null);
  const originalRecordsRef = useRef([]);
  const isRestoringRef = useRef(false);
  const formatTimeRef = useRef(null);

  // Year / month selector (added like AttendanceDevice)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);

  const [holidays, setHolidays] = useState([]);
  const [suspensions, setSuspensions] = useState([]);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  // Modal states for carousel preview
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [previewUsers, setPreviewUsers] = useState([]);

  // Hide visible popup preview during printing
  const [printingAll, setPrintingAll] = useState(false);
  const [printingStatus, setPrintingStatus] = useState('');

  // View mode state: 'single' or 'multiple'
  const [viewMode, setViewMode] = useState('single');

  // Record filter: 'all' | 'has' | 'no'
  const [recordFilter, setRecordFilter] = useState('all');

  // DTR Type state: 'regular' | 'honorarium' | 'service-credit' | 'overtime'
  const [dtrType, setDtrType] = useState('regular');

  // Print tracking states
  const [printStatusFilter, setPrintStatusFilter] = useState('all'); // 'all' | 'printed' | 'unprinted'
  const [printStatusMap, setPrintStatusMap] = useState(new Map()); // Map<employeeNumber, printInfo>

  // Modal states for alerts and confirmations
  const [alertModal, setAlertModal] = useState({
    open: false,
    title: '',
    message: '',
  });
  const [confirmModal, setConfirmModal] = useState({ open: false, user: null });

  // Helper functions for modals
  const showAlert = (title, message) => {
    setAlertModal({ open: true, title, message });
  };

  const closeAlert = () => {
    setAlertModal({ open: false, title: '', message: '' });
  };

  const showReprintConfirm = (user) => {
    setConfirmModal({ open: true, user });
  };

  const closeConfirm = () => {
    setConfirmModal({ open: false, user: null });
  };

  // Get colors from system settings
  const primaryColor = settings.accentColor || '#FEF9E1';
  const secondaryColor = settings.backgroundColor || '#FFF8E7';
  const accentColor = settings.primaryColor || '#6d2323';
  const accentDark = settings.secondaryColor || '#8B3333';
  const textPrimaryColor = settings.textPrimaryColor || '#6d2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';
  const hoverColor = settings.hoverColor || '#6D2323';

  // Department and Employment Category filters
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [employmentCategoryFilter, setEmploymentCategoryFilter] = useState('');
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState('');
  const [departments, setDepartments] = useState([]);
  const [employmentCategories, setEmploymentCategories] = useState([]);
  const [approvedLeaves, setApprovedLeaves] = useState([]);

  // Add this state near your other single-user states
  const [singlePrintLoading, setSinglePrintLoading] = useState(false);
  const [singlePrintStatus, setSinglePrintStatus] = useState('');

  // ACCESS: page access control
  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('daily-time-record-faculty');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  };

  // Employee Number field is empty by default for searching any employee

  // Use a single constant width (in) for DTR rendering/capture so all variants match
  const DTR_WIDTH_IN = '8.7in'; // match main DailyTimeRecord table width

  /**
   * Formats a user's name to "SURNAME, Firstname M." (clean)
   * Accepts user objects from both /users and attendance responses.
   */
  const formatFullName = (user = {}) => {
    const last = (
      user.lastName ||
      user.surname ||
      user.familyName ||
      ''
    ).trim();
    const first = (user.firstName || user.givenName || '').trim();
    const middleRaw = (user.middleName || user.middleInitial || '').trim();

    const capitalize = (s) =>
      s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

    let middle = '';
    if (middleRaw) {
      // Use only initial if middle name is longer
      const initial = middleRaw.charAt(0).toUpperCase();
      middle = `${initial}.`;
    }

    const lastPart = last ? last.toUpperCase() : '';
    const firstPart = first ? capitalize(first) : '';
    const full = `${lastPart}${lastPart && firstPart ? ', ' : ''}${firstPart}${
      middle ? ' ' + middle : ''
    }`.trim();

    // Fallback to any available fullName or employee displayName
    if (!full) {
      return user.fullName || user.displayName || 'Unknown';
    }
    return full;
  };

  // ── DOM restore logic ──────────────────────────────────────────────────────
  const restoreDOMFromOriginal = useCallback(() => {
    if (!dtrRef.current) return;
    const original = originalRecordsRef.current;
    if (!original || original.length === 0) return;
    isRestoringRef.current = true;
    const fmt = formatTimeRef.current || ((s) => s || '');
    const tbodies = dtrRef.current.querySelectorAll('tbody');
    tbodies.forEach((tbody) => {
      const rows = tbody.querySelectorAll('tr');
      rows.forEach((row) => {
        const dayCell = row.querySelector('td:first-child');
        if (!dayCell) return;
        const dayText = dayCell.textContent.trim();
        if (!/^\d{2}$/.test(dayText)) return;
        const record = original.find((r) => {
          const d = (r.date || '').split('T')[0].split('-')[2];
          return d === dayText;
        });
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return;
        const timeValues = [
          fmt(record?.timeIN     || ''),
          fmt(record?.breaktimeIN  || ''),
          fmt(record?.breaktimeOUT || ''),
          fmt(record?.timeOUT    || ''),
        ];
        [1, 2, 3, 4].forEach((cellIdx, spanIdx) => {
          const span = cells[cellIdx]?.querySelector('span');
          if (span && span.textContent.trim() !== timeValues[spanIdx]) {
            span.textContent = timeValues[spanIdx];
          }
        });
      });
    });
    setTimeout(() => { isRestoringRef.current = false; }, 50);
  }, []);

  const startObserver = useCallback(() => {
    if (!dtrRef.current) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new MutationObserver((mutations) => {
      if (isRestoringRef.current) return;
      const isTimeTamper = mutations.some((m) => {
        if (m.type === 'characterData') { const span = m.target.parentElement; return span && span.tagName === 'SPAN'; }
        if (m.type === 'childList') return m.target.tagName === 'TD' || m.target.tagName === 'SPAN';
        return false;
      });
      if (!isTimeTamper) return;
      if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);
      restoreTimerRef.current = setTimeout(() => { restoreDOMFromOriginal(); }, 300);
    });
    observerRef.current.observe(dtrRef.current, { subtree: true, childList: true, characterData: true });
  }, [restoreDOMFromOriginal]);

  const stopObserver = useCallback(() => {
    if (observerRef.current) { observerRef.current.disconnect(); observerRef.current = null; }
    if (restoreTimerRef.current) { clearTimeout(restoreTimerRef.current); restoreTimerRef.current = null; }
  }, []);

  useEffect(() => {
    if (originalRecords.length > 0 && dtrRef.current) {
      const t = setTimeout(() => startObserver(), 100);
      return () => { clearTimeout(t); stopObserver(); };
    } else { stopObserver(); }
  }, [originalRecords, startObserver, stopObserver]);

  useEffect(() => () => stopObserver(), [stopObserver]);

  // ── Integrity verification ─────────────────────────────────────────────────
  const verifyIntegrity = () => {
    if (!fetchedAt || originalRecords.length === 0) {
      setSnackbar({ open: true, message: 'No DTR data loaded. Please search first.', severity: 'warning' });
      return false;
    }
    const ageMs = Date.now() - new Date(fetchedAt).getTime();
    if (ageMs > 30 * 60 * 1000) {
      setIntegrityStatus('warn');
      setSnackbar({ open: true, message: 'DTR data is older than 30 minutes. Please search again to get fresh data.', severity: 'warning' });
      return false;
    }
    const currentHash = generateHash(records);
    if (currentHash !== recordsHash) {
      setIntegrityStatus('warn');
      setSnackbar({ open: true, message: 'Data integrity check failed. The records may have been modified. Please reload.', severity: 'error' });
      return false;
    }
    setIntegrityStatus('ok');
    return true;
  };

  /**
   * Fetches the official working hours for a specific employee
   */
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
        };
        return acc;
      }, {});

      setOfficialTimes(officialTimesMap);
    } catch (error) {
      console.error('Error fetching official times:', error);
      setOfficialTimes({});
    }
  };

  const fetchApprovedLeaves = async (empID) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/leaveRoute/leave_request`,
        getAuthHeaders(),
      );
      // Filter only HR Approved (status === 2) for this employee
      const hrApproved = response.data.filter(
        (req) =>
          String(req.status) === '2' &&
          String(req.employeeNumber) === String(empID),
      );
      setApprovedLeaves(hrApproved);
    } catch (err) {
      console.error('Error fetching approved leaves:', err);
      setApprovedLeaves([]);
    }
  };

  useEffect(() => {
    if (personID) {
      fetchOfficialTimes(personID);
      fetchApprovedLeaves(personID);
    }
  }, [personID]);

  // Fetch departments and employment categories for filters
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        // Fetch departments
        const deptResponse = await axios.get(
          `${API_BASE_URL}/api/department-table`,
          getAuthHeaders(),
        );
        setDepartments(
          Array.isArray(deptResponse.data) ? deptResponse.data : [],
        );

        // Fetch employment categories (unique categories from all users)
        const catResponse = await axios.get(
          `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`,
          getAuthHeaders(),
        );

        // Get unique employment category IDs
        const uniqueCategories = Array.isArray(catResponse.data)
          ? [...new Set(catResponse.data.map((cat) => cat.employmentCategory))]
          : [];

        setEmploymentCategories(uniqueCategories);
      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    };

    fetchFilters();
  }, []);

  // Fetch holidays and suspensions (for row highlighting)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        getAuthHeaders(),
      );

      const data = response.data;
      console.log('📊 Fetched raw data:', data.length, 'records');
      console.log('🔍 DTR Type:', dtrType);
      console.log('📝 Sample record:', data[0]);

      // Debug: Check for overtime records
      const overtimeRecords = data.filter((r) => r.specialType === 'OVERTIME');
      console.log('🔍 TOTAL OVERTIME RECORDS IN DATA:', overtimeRecords.length);
      if (overtimeRecords.length > 0) {
        console.log('🔍 First overtime record:', overtimeRecords[0]);
      }

      // Filter records based on selected DTR type
      let filteredRecords = data;
      if (dtrType === 'regular') {
        // Show records that have regular times (timeIN or timeOUT)
        filteredRecords = data.filter(
          (record) => record.timeIN || record.timeOUT,
        );
        console.log(
          '✅ Regular filter: ',
          filteredRecords.length,
          'records with timeIN/timeOUT',
        );
      } else if (dtrType === 'service-credit') {
        // Show only records with SERVICE special times
        filteredRecords = data.filter(
          (record) =>
            record.specialType === 'SERVICE' &&
            (record.specialTimeIN || record.specialTimeOUT),
        );
        console.log(
          '✅ Service Credit filter:',
          filteredRecords.length,
          'records with SERVICE type',
        );
      } else if (dtrType === 'honorarium') {
        // Show only records with HONORARIUM special times
        filteredRecords = data.filter(
          (record) =>
            record.specialType === 'HONORARIUM' &&
            (record.specialTimeIN || record.specialTimeOUT),
        );
        console.log(
          '✅ Honorarium filter:',
          filteredRecords.length,
          'records with HONORARIUM type',
        );
      } else if (dtrType === 'overtime') {
        // Show only records with OVERTIME special times
        filteredRecords = data.filter(
          (record) =>
            record.specialType === 'OVERTIME' &&
            (record.specialTimeIN || record.specialTimeOUT),
        );
        console.log(
          '✅ Overtime filter:',
          filteredRecords.length,
          'records with OVERTIME type',
        );
      }

      // Set records based on filtering
      setRecords(filteredRecords);
      console.log('💾 Set records state:', filteredRecords.length);

      // ── Integrity capture ──────────────────────────────────────────────────
      if (filteredRecords.length > 0) {
        stopObserver();
        const immutable = Object.freeze(JSON.parse(JSON.stringify(filteredRecords)));
        setOriginalRecords(immutable);
        originalRecordsRef.current = immutable;
        const hash = generateHash(filteredRecords);
        setRecordsHash(hash);
        setFetchedAt(new Date().toISOString());
        setIntegrityStatus('ok');
      } else {
        stopObserver();
        setOriginalRecords([]);
        originalRecordsRef.current = [];
        setRecordsHash('');
        setFetchedAt(null);
        setIntegrityStatus('none');
      }

      // Set employee name if we have any data returned from API
      if (data.length > 0) {
        const { firstName, lastName, middleName } = data[0];
        setEmployeeName(formatFullName({ firstName, lastName, middleName }));
        await fetchOfficialTimes(personID);
      } else {
        setEmployeeName('No records found');
        setOfficialTimes({});
      }
    } catch (err) {
      console.error('❌ Error fetching records:', err);
    }
  };

  // Automatically refetch records when personID, date range, DTR type, or view mode changes
  useEffect(() => {
    if (viewMode === 'single' && personID && startDate && endDate) {
      fetchRecords();
    }
  }, [personID, startDate, endDate, dtrType, viewMode]);

  // Automatically refetch all users data when DTR type changes (for multiple view)
  useEffect(() => {
    if (viewMode === 'multiple' && allUsersDTR.length > 0) {
      fetchAllUsersDTR();
    }
  }, [dtrType]);

  // Keep latest fetch functions for Socket.IO handler
  useEffect(() => {
    fetchRecordsRef.current = fetchRecords;
    fetchAllUsersDTRRef.current = fetchAllUsersDTR;
  });

  // Realtime: refresh when attendance data changes
  useEffect(() => {
    if (!socket || !connected) return;

    let debounceTimer = null;

    const handleAttendanceChanged = (payload) => {
      const action = payload?.action;

      // Special-case: DTR print status changes should NOT trigger heavy DTR re-fetches.
      if (action === 'dtr-printed') {
        const printedEmployees = Array.isArray(payload?.employeeNumbers)
          ? payload.employeeNumbers
          : [];

        if (
          viewMode === 'single' &&
          personID &&
          printedEmployees.length > 0 &&
          !printedEmployees.includes(personID)
        ) {
          return;
        }

        if (printedEmployees.length > 0) {
          setPrintStatusMap((prev) => {
            const next = new Map(prev);
            const printedAt =
              typeof payload?.printed_at === 'string'
                ? payload.printed_at
                : new Date().toISOString();
            const printedBy =
              payload?.printedBy || payload?.printed_by || 'system';

            printedEmployees.forEach((emp) => {
              next.set(emp, { printed_at: printedAt, printed_by: printedBy });
            });
            return next;
          });
        }
        return;
      }

      const changedPersonIDs = Array.isArray(payload?.personIDs)
        ? payload.personIDs
        : payload?.personID
          ? [payload.personID]
          : [];
      const isBulkChange = action === 'bulk-auto-sync';

      if (viewMode === 'single') {
        if (changedPersonIDs.length === 0 && !isBulkChange) return;

        if (
          personID &&
          changedPersonIDs.length > 0 &&
          !changedPersonIDs.includes(personID)
        ) {
          return;
        }

        if (personID && startDate && endDate) {
          fetchRecordsRef.current?.();
        }
        return;
      }

      // viewMode === 'multiple'
      if (!startDate || !endDate) return;
      if (allUsersDTR.length === 0) return;
      if (changedPersonIDs.length === 0 && !isBulkChange) return;

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchAllUsersDTRRef.current?.();
      }, 300);
    };

    socket.on('attendanceChanged', handleAttendanceChanged);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      socket.off('attendanceChanged', handleAttendanceChanged);
    };
  }, [
    socket,
    connected,
    viewMode,
    personID,
    startDate,
    endDate,
    allUsersDTR.length,
  ]);

  // Fetch all users and their DTR data - Optimized for large datasets
  const fetchAllUsersDTR = async () => {
    if (!startDate || !endDate) {
      showAlert('Date Required', 'Please select start date and end date first');
      return;
    }

    setLoadingAllUsers(true);
    setPrintingStatus('Loading Daily Time Records…');

    try {
      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/view-attendance-all-users`,
        {
          startDate,
          endDate,
        },
        getAuthHeaders(),
      );

      const allRecords = response.data || [];

      console.log(
        '📊 Fetched attendance records:',
        allRecords.length,
        'total records',
      );
      console.log('🔍 DTR Type for All Users:', dtrType);

      const overtimeRecords = allRecords.filter(
        (r) => r.specialType === 'OVERTIME',
      );
      console.log(
        '🔍 TOTAL OVERTIME RECORDS IN ALL USERS DATA:',
        overtimeRecords.length,
      );
      if (overtimeRecords.length > 0) {
        console.log(
          '🔍 First overtime record in all users:',
          overtimeRecords[0],
        );
      }

      if (allRecords.length === 0) {
        setAllUsersDTR([]);
        setLoadingAllUsers(false);
        setPrintingStatus('');
        showAlert(
          'No Records Found',
          'No attendance records found in the database for the selected date range. Records must be saved from the attendance device before viewing DTR.',
        );
        return;
      }

      // Group records by personID/employeeNumber
      const userRecordsMap = new Map();

      allRecords.forEach((record) => {
        const employeeNumber = record.personID || record.agencyEmployeeNum;
        const registrationStatus =
          record.registrationStatus || 'Not Registered';
        const displayName =
          record.firstName && record.lastName
            ? formatFullName({
                firstName: record.firstName,
                lastName: record.lastName,
                middleName: record.middleName,
              })
            : record.devicePersonName || employeeNumber;

        if (!userRecordsMap.has(employeeNumber)) {
          userRecordsMap.set(employeeNumber, {
            employeeNumber,
            firstName: record.firstName || '',
            lastName: record.lastName || '',
            middleName: record.middleName || '',
            fullName: displayName,
            devicePersonName: record.devicePersonName || '',
            registrationStatus: registrationStatus,
            records: [],
            rawUser: {
              employeeNumber,
              firstName: record.firstName,
              lastName: record.lastName,
              middleName: record.middleName,
              department: record.department,
              departmentCode: record.departmentCode,
              employmentCategory: undefined,
              registrationStatus: registrationStatus,
            },
          });
        }

        userRecordsMap.get(employeeNumber).records.push(record);
      });

      const allUserData = Array.from(userRecordsMap.values());

      // Fetch employment categories and merge into each user
      try {
        setPrintingStatus('Loading employment categories...');
        const catResponse = await axios.get(
          `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`,
          getAuthHeaders(),
        );

        const catMap = new Map();
        if (Array.isArray(catResponse.data)) {
          catResponse.data.forEach((cat) => {
            catMap.set(String(cat.employeeNumber), cat.employmentCategory);
          });
        }

        allUserData.forEach((user) => {
          const empCat = catMap.get(String(user.employeeNumber));
          if (empCat !== undefined) {
            user.rawUser.employmentCategory = empCat;
            user.employmentCategory = empCat;
          }
        });

        console.log(
          '✅ Employment categories merged for',
          catMap.size,
          'employees',
        );
      } catch (catErr) {
        console.error(
          'Error fetching employment categories for merge:',
          catErr,
        );
      }

      // Apply DTR type filtering per user
      const allUserDataFiltered = allUserData.map((user) => {
        let filteredRecords = user.records;

        if (dtrType === 'regular') {
          filteredRecords = user.records.filter(
            (record) => record.timeIN || record.timeOUT,
          );
        } else if (dtrType === 'service-credit') {
          filteredRecords = user.records.filter(
            (record) =>
              record.specialType === 'SERVICE' &&
              (record.specialTimeIN || record.specialTimeOUT),
          );
        } else if (dtrType === 'honorarium') {
          filteredRecords = user.records.filter(
            (record) =>
              record.specialType === 'HONORARIUM' &&
              (record.specialTimeIN || record.specialTimeOUT),
          );
        } else if (dtrType === 'overtime') {
          filteredRecords = user.records.filter(
            (record) =>
              record.specialType === 'OVERTIME' &&
              (record.specialTimeIN || record.specialTimeOUT),
          );
        }

        return {
          ...user,
          records: filteredRecords,
          hasRecords: filteredRecords.length > 0,
        };
      });

      // Sort by last name
      allUserDataFiltered.sort((a, b) => {
        const lastNameA = (a.lastName || '').toUpperCase();
        const lastNameB = (b.lastName || '').toUpperCase();
        if (!lastNameA && !lastNameB)
          return a.fullName.localeCompare(b.fullName);
        return lastNameA.localeCompare(lastNameB);
      });

      console.log(
        '✅ Grouped into',
        allUserDataFiltered.length,
        'users with attendance records',
      );

      setAllUsersDTR(allUserDataFiltered);

      // Fetch print status for all loaded users
      try {
        const year = new Date(startDate).getFullYear();
        const month = new Date(startDate).getMonth() + 1;
        const employeeNumbers = allUserDataFiltered.map(
          (user) => user.employeeNumber,
        );

        if (employeeNumbers.length > 0) {
          setPrintingStatus('Loading print status...');
          const printStatusResponse = await axios.post(
            `${API_BASE_URL}/attendance/api/dtr-print-status`,
            { employeeNumbers, year, month },
            getAuthHeaders(),
          );

          const printStatusData = printStatusResponse.data || [];
          const newPrintStatusMap = new Map();
          printStatusData.forEach((status) => {
            newPrintStatusMap.set(status.employee_number, {
              printed_at: status.printed_at,
              printed_by: status.printed_by,
            });
          });
          setPrintStatusMap(newPrintStatusMap);
        }
      } catch (error) {
        console.error('Error fetching print status:', error);
      }

      setSelectedUsers(new Set());
      setCurrentPage(1);
      setPrintingStatus('');
    } catch (error) {
      console.error('❌ Error fetching attendance records:', error);
      showAlert(
        'Fetch Error',
        error.response?.data?.error ||
          'Error fetching attendance records. Please ensure records have been saved from the attendance device.',
      );
      setPrintingStatus('');
      setAllUsersDTR([]);
    } finally {
      setLoadingAllUsers(false);
    }
  };

  // Selection helpers
  const handleUserSelect = (employeeNumber) => {
    if (printStatusMap.has(employeeNumber)) {
      return;
    }

    setSelectedUsers((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(employeeNumber)) {
        newSelected.delete(employeeNumber);
      } else {
        newSelected.add(employeeNumber);
      }
      return newSelected;
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const filtered = getFilteredUsers();
      const selectableUsers = filtered.filter(
        (user) => !printStatusMap.has(user.employeeNumber),
      );
      const limitedFiltered = selectableUsers.slice(0, 50);
      setSelectedUsers(
        new Set(limitedFiltered.map((user) => user.employeeNumber)),
      );

      if (selectableUsers.length > 50) {
        showAlert(
          'Selection Limited',
          `Only the first 50 users were selected (out of ${selectableUsers.length} selectable users). Bulk printing is limited to 50 users per batch for better performance.`,
        );
      }
    } else {
      setSelectedUsers(new Set());
    }
  };

  // New filter: free-text search that filters by name or employee number
  const getFilteredUsers = () => {
    let filtered = allUsersDTR.slice();

    if (recordFilter === 'has') {
      filtered = filtered.filter((u) => u.records && u.records.length > 0);
    } else if (recordFilter === 'no') {
      filtered = filtered.filter((u) => !u.records || u.records.length === 0);
    }

    if (printStatusFilter === 'printed') {
      filtered = filtered.filter((u) => printStatusMap.has(u.employeeNumber));
    } else if (printStatusFilter === 'unprinted') {
      filtered = filtered.filter((u) => !printStatusMap.has(u.employeeNumber));
    }

    if (departmentFilter) {
      filtered = filtered.filter((u) => {
        const userDept = u.rawUser?.departmentCode || u.departmentCode || '';
        return userDept === departmentFilter;
      });
    }

    if (employmentCategoryFilter !== '') {
      filtered = filtered.filter((u) => {
        const userCategory =
          u.rawUser?.employmentCategory ?? u.employmentCategory ?? null;
        return (
          userCategory !== null &&
          userCategory === parseInt(employmentCategoryFilter)
        );
      });
    }

    if (registrationStatusFilter) {
      filtered = filtered.filter((u) => {
        const status = u.registrationStatus || 'Not Registered';
        return status === registrationStatusFilter;
      });
    }

    if (dtrType !== 'regular') {
      filtered = filtered.filter((u) => {
        if (!u.records || u.records.length === 0) return false;

        const isValidTime = (timeValue) => {
          if (!timeValue) return false;
          const trimmed = String(timeValue).trim();
          if (trimmed === '') return false;
          if (trimmed === '00:00:00 AM' || trimmed === '00:00:00 PM')
            return false;
          if (trimmed === '12:00:00 AM') return false;
          return true;
        };

        return u.records.some((record) => {
          if (dtrType === 'honorarium') {
            const hasHonorarium =
              record.specialType === 'HONORARIUM' &&
              isValidTime(record.specialTimeIN) &&
              isValidTime(record.specialTimeOUT);
            return hasHonorarium;
          } else if (dtrType === 'service-credit') {
            const hasService =
              record.specialType === 'SERVICE' &&
              isValidTime(record.specialTimeIN) &&
              isValidTime(record.specialTimeOUT);
            return hasService;
          } else if (dtrType === 'overtime') {
            return (
              record.specialType === 'OVERTIME' &&
              isValidTime(record.specialTimeIN) &&
              isValidTime(record.specialTimeOUT)
            );
          }
          return false;
        });
      });
    }

    if (!searchQuery || searchQuery.trim() === '') return filtered;
    const q = searchQuery.trim().toLowerCase();
    return filtered.filter((user) => {
      const full = (
        user.fullName || `${user.firstName || ''} ${user.lastName || ''}`
      ).toLowerCase();
      const last = (user.lastName || '').toLowerCase();
      const emp = (user.employeeNumber || '').toLowerCase();
      return full.includes(q) || last.includes(q) || emp.includes(q);
    });
  };

  // Pagination / scroller states for the records table
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredUsers = getFilteredUsers();
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * rowsPerPage,
    (currentPage - 1) * rowsPerPage + rowsPerPage,
  );

  // Helper to get employment category label
  const getCategoryLabel = (categoryId) => {
    const labels = {
      0: 'JO Graduate',
      1: 'JO UnderGrad',
      2: 'Regular Non-Teaching',
      3: 'Regular Teaching (30Hrs)',
      4: 'Regular Designated (40Hrs)',
      5: 'Other',
    };
    return labels[categoryId] || 'Unknown';
  };

  // Get registration status counts
  const getRegistrationStatusCounts = () => {
    const counts = {
      Registered: 0,
      'Not Registered': 0,
    };
    allUsersDTR.forEach((u) => {
      const status = u.registrationStatus || 'Not Registered';
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });
    return counts;
  };

  const registrationStatusCounts = getRegistrationStatusCounts();

  // Helper to get employment category color (Legend Logic)
  const getCategoryColor = (catId) => {
    switch (parseInt(catId)) {
      case 0:
        return '#F57C00';
      case 1:
        return '#E64A19';
      case 2:
        return '#2E7D32';
      case 3:
        return '#1565C0';
      case 4:
        return '#7B1FA2';
      case 5:
        return '#00796B';
      default:
        return '#757575';
    }
  };

  // helper to change page safely
  const goToPage = (page) => {
    const p = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(p);
  };

  // Auto-select helper for "first N" behavior
  const handleAutoSelectFirstN = (n) => {
    const filtered = getFilteredUsers();
    if (!filtered || filtered.length === 0) {
      setSelectedUsers(new Set());
      return;
    }
    const count = n === 'all' ? Math.min(50, filtered.length) : Number(n) || 0;
    const toSelect = filtered.slice(0, count).map((u) => u.employeeNumber);
    setSelectedUsers(new Set(toSelect));
    const toPreview = filtered.slice(0, count);
    setPreviewUsers(toPreview);
    setCurrentPreviewIndex(0);
  };

  // Bulk print flow
  const handleBulkPrint = () => {
    const filtered = getFilteredUsers();
    const toPrint = filtered.filter((u) => selectedUsers.has(u.employeeNumber));
    if (toPrint.length === 0) {
      showAlert('No Selection', 'Please select at least one user to print');
      return;
    }
    if (toPrint.length > 50) {
      showAlert(
        'Too Many Selected',
        `You have selected ${toPrint.length} users. Please limit to 50 users per print batch for better performance. You can print in multiple batches.`,
      );
      return;
    }
    setPreviewUsers(toPrint);
    setCurrentPreviewIndex(0);
    setPreviewModalOpen(true);
  };

  const handlePrevious = () =>
    setCurrentPreviewIndex((p) => (p > 0 ? p - 1 : previewUsers.length - 1));
  const handleNext = () =>
    setCurrentPreviewIndex((p) => (p < previewUsers.length - 1 ? p + 1 : 0));

  // Individual print for already-printed records (called after confirmation)
  const handleIndividualPrintConfirmed = async (user) => {
    closeConfirm();
    const wasModalOpen = previewModalOpen;

    try {
      setPrintingAll(true);
      setPrintingStatus(
        `Preparing DTR for ${user.firstName} ${user.lastName}...`,
      );

      setPreviewUsers([user]);
      setCurrentPreviewIndex(0);
      setPreviewModalOpen(true);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const ref = bulkDTRRefs.current[user.employeeNumber];
      if (!ref) {
        throw new Error(
          'DTR element not found. The record may not be loaded yet. Please try again.',
        );
      }

      const orig = ensureCaptureStyles(ref);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const capturedCanvas = await html2canvas(ref, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      restoreCaptureStyles(ref, orig);

      if (
        !capturedCanvas ||
        capturedCanvas.width === 0 ||
        capturedCanvas.height === 0
      ) {
        throw new Error('Failed to capture DTR. Please try again.');
      }

      const imgData = capturedCanvas.toDataURL('image/png');

      if (!imgData || imgData === 'data:,') {
        throw new Error('Failed to generate image data. Please try again.');
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'a4',
      });

      const dtrWidth = 8;
      const dtrHeight = 9.5;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const xOffset = (pageWidth - dtrWidth) / 2;
      const yOffset = (pageHeight - dtrHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, dtrWidth, dtrHeight);
      pdf.autoPrint();

      const year = new Date(startDate).getFullYear();
      const month = new Date(startDate).getMonth() + 1;

      await axios.post(
        `${API_BASE_URL}/attendance/api/mark-dtr-printed`,
        {
          employeeNumbers: [user.employeeNumber],
          year,
          month,
          startDate,
          endDate,
        },
        getAuthHeaders(),
      );

      const newMap = new Map(printStatusMap);
      newMap.set(user.employeeNumber, {
        printed_at: new Date().toISOString(),
        printed_by: 'current_user',
      });
      setPrintStatusMap(newMap);

      const blobUrl = pdf.output('bloburl');
      window.open(blobUrl, '_blank');
    } catch (error) {
      console.error('Error printing individual DTR:', error);
      showAlert('Print Error', `Error printing DTR: ${error.message}`);
    } finally {
      setPrintingStatus('');
      setPrintingAll(false);
      if (!wasModalOpen) {
        setPreviewModalOpen(false);
      }
    }
  };

  // --- Single user print & download ---
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
    if (!verifyIntegrity()) return;
    restoreDOMFromOriginal();
    await new Promise((r) => setTimeout(r, 80));

    setSinglePrintLoading(true);
    setSinglePrintStatus('Preparing DTR for printing...');

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'a4',
      });

      const orig = ensureCaptureStyles(dtrRef.current);

      setSinglePrintStatus('Capturing DTR layout...');
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(dtrRef.current, {
        scale: 2,
        useCORS: true,
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

      setSinglePrintStatus('Opening print dialog...');
      pdf.autoPrint();
      const blobUrl = pdf.output('bloburl');
      window.open(blobUrl, '_blank');
    } catch (error) {
      console.error('Error generating print view:', error);
    } finally {
      setSinglePrintLoading(false);
      setSinglePrintStatus('');
    }
  };

  const downloadPDF = async () => {
    if (!dtrRef.current) return;
    if (!verifyIntegrity()) return;
    restoreDOMFromOriginal();
    await new Promise((r) => setTimeout(r, 80));

    setSinglePrintLoading(true);
    setSinglePrintStatus('Preparing DTR for download...');

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'a4',
      });

      const orig = ensureCaptureStyles(dtrRef.current);

      setSinglePrintStatus('Capturing DTR layout...');
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(dtrRef.current, {
        scale: 2,
        useCORS: true,
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

      setSinglePrintStatus('Saving PDF...');
      pdf.save(`DTR-${employeeName}-${formatMonth(startDate)}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setSinglePrintLoading(false);
      setSinglePrintStatus('');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
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

  // ── Update formatTimeRef when formatTime changes ────────────────────────────
  useEffect(() => {
    formatTimeRef.current = formatTime;
  }, [formatTime]);

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

  const isApprovedLeaveDate = (dateString) => {
    if (!dateString || approvedLeaves.length === 0) return false;
    const checkDate = dateString.split('T')[0];
    return approvedLeaves.some((req) => {
      const dates = Array.isArray(req.leave_date)
        ? req.leave_date
        : String(req.leave_date)
            .split(',')
            .map((d) => d.trim());
      return dates.some((d) => d.split('T')[0] === checkDate);
    });
  };

  const getDateIndicator = (dateString) => {
    if (!dateString) return null;
    const date = String(dateString).split('T')[0];

    if (isApprovedLeaveDate(date)) {
      return {
        type: 'leave',
        label: 'ON LEAVE',
        bgColor: 'rgba(46, 125, 50, 0.2)',
        textColor: '#000000',
        borderColor: '#2e7d32',
      };
    }

    const suspension = suspensions.find((s) => {
      const start = s.date_start || s.date;
      const end = s.date_end || s.date;
      return isDateInRange(date, start, end);
    });

    if (suspension) {
      return {
        type: 'suspension',
        label: 'SUSPENSION',
        bgColor: 'rgba(211, 47, 47, 0.2)',
        textColor: '#000000',
        borderColor: '#d32f2f',
      };
    }

    const holiday = holidays.find((h) => {
      const start = h.date_start || h.date;
      const end = h.date_end || h.date;
      return isDateInRange(date, start, end);
    });

    if (holiday) {
      return {
        type: 'holiday',
        label: 'HOLIDAY',
        bgColor: 'rgba(237, 108, 2, 0.25)',
        textColor: '#000000',
        borderColor: '#ed6c02',
      };
    }

    return null;
  };

  // Helper to highlight matched text in user names
  const highlightMatch = (text, q) => {
    if (!q || !text) return text;
    const lower = text.toLowerCase();
    const qLower = q.toLowerCase();
    const idx = lower.indexOf(qLower);
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + q.length);
    const after = text.slice(idx + q.length);
    return (
      <span>
        {before}
        <span
          style={{
            backgroundColor: '#ffeb3b',
            color: '#000',
            padding: '0 3px',
            borderRadius: 2,
          }}
        >
          {match}
        </span>
        {after}
      </span>
    );
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
        message="You do not have permission to access Daily Time Record. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }

  // Helper: visible modal DTR (keeps current layout)...
  const renderDTRForModal = (user) => {
    const dataFontSize = '10px';
    const rowHeight = '16px';

    const renderHeader = (type = dtrType) => (
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
            {type === 'service-credit' ? (
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
            ) : (
              <h4
                style={{
                  fontFamily: 'Times New Roman, serif',
                  textAlign: 'center',
                  margin: '2px 0',
                  fontWeight: 'bold',
                  fontSize: '16px',
                }}
              >
                {type === 'honorarium'
                  ? 'DAILY TIME RECORD - HONORARIUM'
                  : type === 'overtime'
                    ? 'DAILY TIME RECORD - OVERTIME'
                    : 'DAILY TIME RECORD'}
              </h4>
            )}
          </td>
        </tr>
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
                {user.fullName}
              </div>
              <div
                style={{
                  borderBottom: '2px solid black',
                  width: '100%',
                  margin: '2px 0 3px 0',
                }}
              />
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
            style={{
              padding: '2px 5px',
              lineHeight: '1.2',
              textAlign: 'left',
            }}
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
            Official hours for arrival (regular day) and departure
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
          <td colSpan="7" style={{ padding: '2px 5px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                paddingLeft: '5%',
                height: '20px',
                fontFamily: 'Arial, serif',
                fontSize: '10px',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ marginRight: '5px' }}>Saturdays:</span>
              <span
                style={{
                  display: 'inline-block',
                  borderBottom: '1.5px solid black',
                  flexGrow: 1,
                  minWidth: '318px',
                  marginBottom: '2px',
                }}
              ></span>
            </div>
          </td>
        </tr>

        {Array.from({ length: 2 }, (_, i) => (
          <tr key={`empty3-${i}`}>
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

    const cellStyle = {
      border: '1px solid black',
      textAlign: 'center',
      padding: '0 1px',
      fontFamily: 'Arial, serif',
      fontSize: '10px',
      height: rowHeight,
      whiteSpace: 'nowrap',
    };

    const getRenderedTimeData = (record, type) => {
      if (!record) return { hours: '', minutes: '' };
      if (type === 'regular') {
        return { hours: '', minutes: record.minutes || '' };
      }
      const minutes = record.minutes || 0;
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return {
        hours: hours > 0 ? String(hours) : '',
        minutes: remainingMinutes > 0 ? String(remainingMinutes) : '',
      };
    };

    const getTimeFields = (record, type) => {
      if (!record)
        return {
          timeIN: '',
          timeOUT: '',
        };

      switch (type) {
        case 'honorarium':
        case 'service-credit':
        case 'overtime':
          return {
            timeIN: record.specialTimeIN || '',
            timeOUT: record.specialTimeOUT || '',
          };
        default:
          return {
            timeIN: record.timeIN || '',
            breaktimeIN: record.breaktimeIN || '',
            breaktimeOUT: record.breaktimeOUT || '',
            timeOUT: record.timeOUT || '',
          };
      }
    };

    return (
      <div className="table-container">
        <div className="table-wrapper" style={{ position: 'relative' }}>
          {/* Watermark */}
          <img
            src={hrisLogo}
            alt="Watermark"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: 0.07,
              width: '80%',
              maxWidth: '600px',
              pointerEvents: 'none',
              userSelect: 'none',
              zIndex: 0,
            }}
          />
          <div
            style={{
              display: 'flex',
              gap: '2%',
              width: '8.7in',
              minWidth: '8.5in',
              margin: '0 auto',
              backgroundColor: 'white',
              position: 'relative',
              zIndex: 1,
            }}
            className="table-side-by-side"
          >
            {/* ================= TABLE 1 ================= */}
            <table
              style={{
                position: 'relative',
                border: '1px solid black',
                borderCollapse: 'collapse',
                width: '49%',
                tableLayout: 'fixed',
              }}
              className="print-visble"
            >
              <DTRColGroup />
              {renderHeader()}
              <tbody>
                {Array.from({ length: 31 }, (_, i) => {
                  const day = (i + 1).toString().padStart(2, '0');
                  const record = user.records.find((r) =>
                    r.date.endsWith(`-${day}`),
                  );

                  let fullDate = null;
                  if (record?.date) {
                    fullDate = record.date;
                  } else if (startDate) {
                    const [year, month] = startDate.split('-');
                    fullDate = `${year}-${month}-${day}`;
                  } else if (selectedMonth !== null) {
                    const monthNum = String(selectedMonth + 1).padStart(2, '0');
                    fullDate = `${selectedYear}-${monthNum}-${day}`;
                  }

                  const indicator = getDateIndicator(fullDate);
                  const timeFields = getTimeFields(record, dtrType);
                  const renderedTime = getRenderedTimeData(record, dtrType);

                  return (
                    <tr key={i}>
                      <td
                        style={{
                          ...cellStyle,
                          backgroundColor: indicator
                            ? indicator.bgColor
                            : 'transparent',
                          position: 'relative',
                        }}
                      >
                        <div style={{ fontWeight: 'bold', fontSize: '10px' }}>
                          {day}
                        </div>
                        {indicator && (
                          <div
                            style={{
                              fontSize: '6px',
                              fontWeight: 'bold',
                              color: indicator.textColor,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              opacity: 0.8,
                              lineHeight: 1,
                            }}
                          >
                            {indicator.label}
                          </div>
                        )}
                      </td>

                      {dtrType === 'regular' ? (
                        <>
                          <td
                            style={{
                              ...cellStyle,
                              backgroundColor: indicator
                                ? indicator.bgColor
                                : 'transparent',
                            }}
                          >
                            <span>{formatTime(timeFields.timeIN)}</span>
                          </td>
                          <td
                            style={{
                              ...cellStyle,
                              backgroundColor: indicator
                                ? indicator.bgColor
                                : 'transparent',
                            }}
                          >
                            <span>{formatTime(timeFields.breaktimeIN)}</span>
                          </td>
                          <td
                            style={{
                              ...cellStyle,
                              backgroundColor: indicator
                                ? indicator.bgColor
                                : 'transparent',
                            }}
                          >
                            <span>{formatTime(timeFields.breaktimeOUT)}</span>
                          </td>
                          <td
                            style={{
                              ...cellStyle,
                              backgroundColor: indicator
                                ? indicator.bgColor
                                : 'transparent',
                            }}
                          >
                            <span>{formatTime(timeFields.timeOUT)}</span>
                          </td>
                          <td
                            style={{
                              ...cellStyle,
                              backgroundColor: indicator
                                ? indicator.bgColor
                                : 'transparent',
                            }}
                          >
                            <span>{record?.minutes || ''}</span>
                          </td>
                          <td
                            style={{
                              ...cellStyle,
                              backgroundColor: indicator
                                ? indicator.bgColor
                                : 'transparent',
                            }}
                          >
                            <span>{record?.minutes || ''}</span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td
                            style={{
                              ...cellStyle,
                              backgroundColor: indicator
                                ? indicator.bgColor
                                : 'transparent',
                            }}
                          >
                            <span>{formatTime(timeFields.timeIN)}</span>
                          </td>
                          <td
                            style={{
                              ...cellStyle,
                              backgroundColor: indicator
                                ? indicator.bgColor
                                : 'transparent',
                            }}
                          >
                            <span></span>
                          </td>
                          <td
                            style={{
                              ...cellStyle,
                              backgroundColor: indicator
                                ? indicator.bgColor
                                : 'transparent',
                            }}
                          >
                            <span></span>
                          </td>
                          <td
                            style={{
                              ...cellStyle,
                              backgroundColor: indicator
                                ? indicator.bgColor
                                : 'transparent',
                            }}
                          >
                            <span>{formatTime(timeFields.timeOUT)}</span>
                          </td>
                          <td
                            style={{
                              ...cellStyle,
                              backgroundColor: indicator
                                ? indicator.bgColor
                                : 'transparent',
                            }}
                          >
                            <span></span>
                          </td>
                          <td
                            style={{
                              ...cellStyle,
                              backgroundColor: indicator
                                ? indicator.bgColor
                                : 'transparent',
                            }}
                          >
                            <span></span>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan="7" style={{ padding: '10px 5px' }}>
                    <hr
                      style={{ borderTop: '2px solid black', width: '100%' }}
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
                      I CERTIFY on my honor that the above is a true and correct
                      report
                      <br />
                      of the hours of work performed, record of which was made
                      daily at
                      <br />
                      the time of arrival and at the time of departure from
                      office.
                    </p>
                    <div
                      style={{
                        width: '50%',
                        marginLeft: 'auto',
                        textAlign: 'center',
                        marginTop: '40px',
                      }}
                    >
                      <hr style={{ borderTop: '2px solid black', margin: 0 }} />
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
                      <hr style={{ borderTop: '2px solid black', margin: 0 }} />
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

            {/* ================= TABLE 2 ================= */}
            <table
              style={{
                position: 'relative',
                border: '1px solid black',
                borderCollapse: 'collapse',
                width: '49%',
                tableLayout: 'fixed',
              }}
              className="print-visble"
            >
              <DTRColGroup />
              {renderHeader()}
              <tbody>
                {Array.from({ length: 31 }, (_, i) => {
                  const day = (i + 1).toString().padStart(2, '0');
                  const record = user.records.find((r) =>
                    r.date.endsWith(`-${day}`),
                  );

                  let fullDate = null;
                  if (record?.date) {
                    fullDate = record.date;
                  } else if (startDate) {
                    const [year, month] = startDate.split('-');
                    fullDate = `${year}-${month}-${day}`;
                  } else if (selectedMonth !== null) {
                    const monthNum = String(selectedMonth + 1).padStart(2, '0');
                    fullDate = `${selectedYear}-${monthNum}-${day}`;
                  }

                  const indicator = getDateIndicator(fullDate);
                  const timeFields = getTimeFields(record, dtrType);
                  const renderedTime = getRenderedTimeData(record, dtrType);

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
                      {dtrType === 'regular' ? (
                        <>
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
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    fontSize: '7px',
                                    fontWeight: 'bold',
                                    color: indicator.textColor,
                                    whiteSpace: 'nowrap',
                                    pointerEvents: 'none',
                                    zIndex: 1,
                                    opacity: 0.5,
                                  }}
                                >
                                  {indicator.label}
                                </div>
                              </>
                            )}
                            <span style={{ position: 'relative', zIndex: 2 }}>
                              {formatTime(timeFields.timeIN)}
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
                            <span style={{ position: 'relative', zIndex: 1 }}>
                              {formatTime(timeFields.breaktimeIN)}
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
                            <span style={{ position: 'relative', zIndex: 1 }}>
                              {formatTime(timeFields.breaktimeOUT)}
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
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    fontSize: '7px',
                                    fontWeight: 'bold',
                                    color: indicator.textColor,
                                    whiteSpace: 'nowrap',
                                    pointerEvents: 'none',
                                    zIndex: 1,
                                    opacity: 0.5,
                                  }}
                                >
                                  {indicator.label}
                                </div>
                              </>
                            )}
                            <span style={{ position: 'relative', zIndex: 2 }}>
                              {formatTime(timeFields.timeOUT)}
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
                            <span style={{ position: 'relative', zIndex: 1 }}>
                              {record?.minutes || ''}
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
                            <span style={{ position: 'relative', zIndex: 2 }}>
                              {record?.minutes || ''}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
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
                            <span style={{ position: 'relative', zIndex: 1 }}>
                              {formatTime(timeFields.timeIN)}
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
                            ></span>
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
                            ></span>
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
                            <span style={{ position: 'relative', zIndex: 1 }}>
                              {formatTime(timeFields.timeOUT)}
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
                            ></span>
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
                            ></span>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan="7" style={{ padding: '10px 5px' }}>
                    <hr
                      style={{ borderTop: '2px solid black', width: '100%' }}
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
                      I CERTIFY on my honor that the above is a true and correct
                      report
                      <br />
                      of the hours of work performed, record of which was made
                      daily at
                      <br />
                      the time of arrival and at the time of departure from
                      office.
                    </p>
                    <div
                      style={{
                        width: '50%',
                        marginLeft: 'auto',
                        textAlign: 'center',
                        marginTop: '40px',
                      }}
                    >
                      <hr style={{ borderTop: '2px solid black', margin: 0 }} />
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
                      <hr style={{ borderTop: '2px solid black', margin: 0 }} />
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
          </div>
        </div>
      </div>
    );
  };

  // Hidden print-ready DTR (off-screen) for bulk printing
  const renderUserDTRTable = (user) => {
    return (
      <div
        ref={(el) => {
          if (el) bulkDTRRefs.current[user.employeeNumber] = el;
        }}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '0',
          visibility: 'hidden',
          width: DTR_WIDTH_IN,
          color: 'black',
        }}
        className="bulk-dtr-print"
      >
        {renderDTRForModal(user)}
      </div>
    );
  };

  // Simple handler for printing selected DTRs
  const handlePrintAllSelected = async () => {
    if (previewUsers.length === 0) {
      showAlert('No Selection', 'No DTRs to print. Please select users first.');
      return;
    }

    try {
      setPrintingAll(true);
      setPrintingStatus('Preparing DTRs for printing...');

      await new Promise((resolve) => setTimeout(resolve, 500));

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'a4',
      });

      const dtrWidth = 8;
      const dtrHeight = 9.5;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const xOffset = (pageWidth - dtrWidth) / 2;
      const yOffset = (pageHeight - dtrHeight) / 2;

      let successCount = 0;

      for (let i = 0; i < previewUsers.length; i++) {
        const user = previewUsers[i];
        const ref = bulkDTRRefs.current[user.employeeNumber];

        setPrintingStatus(
          `Capturing DTR ${i + 1} of ${previewUsers.length}...`,
        );

        if (!ref) {
          console.warn(`No ref found for ${user.employeeNumber}`);
          continue;
        }

        try {
          const orig = ensureCaptureStyles(ref);
          await new Promise((resolve) => setTimeout(resolve, 50));

          const canvas = await html2canvas(ref, {
            scale: 2,
            useCORS: true,
            logging: false,
          });

          restoreCaptureStyles(ref, orig);

          if (!canvas || canvas.width === 0 || canvas.height === 0) {
            console.error(`Invalid canvas for ${user.employeeNumber}:`, {
              width: canvas?.width,
              height: canvas?.height,
            });
            continue;
          }

          const imgData = canvas.toDataURL('image/png');

          if (!imgData || imgData === 'data:,') {
            console.error(`Invalid image data for ${user.employeeNumber}`);
            continue;
          }

          if (successCount > 0) {
            pdf.addPage();
          }

          pdf.addImage(imgData, 'PNG', xOffset, yOffset, dtrWidth, dtrHeight);
          successCount++;

          console.log(
            `Successfully captured DTR for ${user.fullName} (${successCount}/${previewUsers.length})`,
          );
        } catch (error) {
          console.error(
            `Error capturing DTR for ${user.employeeNumber}:`,
            error,
          );
          try {
            restoreCaptureStyles(ref, {});
          } catch (e) {
            // Ignore
          }
        }
      }

      console.log(
        `Total captured: ${successCount} out of ${previewUsers.length}`,
      );

      if (successCount === 0) {
        throw new Error(
          'No DTRs were successfully captured. Please try again or contact support.',
        );
      }

      setPrintingStatus('Opening print preview...');
      pdf.autoPrint();
      const blobUrl = pdf.output('bloburl');
      window.open(blobUrl, '_blank');

      try {
        const year = new Date(startDate).getFullYear();
        const month = new Date(startDate).getMonth() + 1;
        const employeeNumbers = previewUsers.map((user) => user.employeeNumber);

        await axios.post(
          `${API_BASE_URL}/attendance/api/mark-dtr-printed`,
          { employeeNumbers, year, month, startDate, endDate },
          getAuthHeaders(),
        );

        const newMap = new Map(printStatusMap);
        employeeNumbers.forEach((empNum) => {
          newMap.set(empNum, {
            printed_at: new Date().toISOString(),
            printed_by: 'current_user',
          });
        });
        setPrintStatusMap(newMap);
        setSelectedUsers(new Set());
      } catch (error) {
        console.error('Error marking DTRs as printed:', error);
      }
    } catch (error) {
      console.error('Error printing DTRs:', error);
      showAlert(
        'Print Error',
        `Error printing DTRs: ${error.message || 'Unknown error'}`,
      );
    } finally {
      setPrintingStatus('');
      setPrintingAll(false);
      setPreviewModalOpen(false);
    }
  };

  // Simple handler for downloading selected DTRs as PDF
  const handleDownloadAllSelected = async () => {
    if (previewUsers.length === 0) {
      showAlert(
        'No Selection',
        'No DTRs to download. Please select users first.',
      );
      return;
    }

    try {
      setPrintingAll(true);
      setPrintingStatus('Preparing DTRs for download...');

      await new Promise((resolve) => setTimeout(resolve, 500));

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'a4',
      });

      const dtrWidth = 8;
      const dtrHeight = 10;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const xOffset = (pageWidth - dtrWidth) / 2;
      const yOffset = (pageHeight - dtrHeight) / 2;

      let successCount = 0;

      for (let i = 0; i < previewUsers.length; i++) {
        const user = previewUsers[i];
        const ref = bulkDTRRefs.current[user.employeeNumber];

        setPrintingStatus(
          `Capturing DTR ${i + 1} of ${previewUsers.length}...`,
        );

        if (!ref) {
          console.warn(`No ref found for ${user.employeeNumber}`);
          continue;
        }

        try {
          const orig = ensureCaptureStyles(ref);
          await new Promise((resolve) => setTimeout(resolve, 50));

          const canvas = await html2canvas(ref, {
            scale: 2,
            useCORS: true,
            logging: false,
          });

          restoreCaptureStyles(ref, orig);

          if (!canvas || canvas.width === 0 || canvas.height === 0) {
            console.error(`Invalid canvas for ${user.employeeNumber}:`, {
              width: canvas?.width,
              height: canvas?.height,
            });
            continue;
          }

          const imgData = canvas.toDataURL('image/png');

          if (!imgData || imgData === 'data:,') {
            console.error(`Invalid image data for ${user.employeeNumber}`);
            continue;
          }

          if (successCount > 0) {
            pdf.addPage();
          }

          pdf.addImage(imgData, 'PNG', xOffset, yOffset, dtrWidth, dtrHeight);
          successCount++;

          console.log(
            `Successfully captured DTR for ${user.fullName} (${successCount}/${previewUsers.length})`,
          );
        } catch (error) {
          console.error(
            `Error capturing DTR for ${user.employeeNumber}:`,
            error,
          );
          try {
            restoreCaptureStyles(ref, {});
          } catch (e) {
            // Ignore
          }
        }
      }

      console.log(
        `Total captured: ${successCount} out of ${previewUsers.length}`,
      );

      if (successCount === 0) {
        throw new Error(
          'No DTRs were successfully captured. Please try again or contact support.',
        );
      }

      setPrintingStatus('Saving PDF...');
      const fileName = `DTR-AllUsers-${formatMonth(startDate)}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error downloading DTRs:', error);
      showAlert(
        'Download Error',
        `Error downloading DTRs: ${error.message || 'Unknown error'}`,
      );
    } finally {
      setPrintingStatus('');
      setPrintingAll(false);
      setPreviewModalOpen(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4, mt: -5 }}>
      {/* Fixed Status Overlay at Top of Screen - Shows during printing/downloading/loading */}
      {(printingAll || loadingAllUsers || singlePrintLoading) && (
        <Dialog
          open={
            printingAll ||
            loadingAllUsers ||
            singlePrintLoading ||
            !!printingStatus ||
            !!singlePrintStatus
          }
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              backgroundColor: '#ffffff',
              boxShadow: '0 10px 50px rgba(0,0,0,0.12)',
              overflow: 'hidden',
            },
          }}
        >
          <Box
            sx={{
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 2,
            }}
          >
            <MCircularProgress
              size={52}
              thickness={4}
              sx={{ color: accentColor }}
            />
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: '#111', lineHeight: 1.3 }}
            >
              {loadingAllUsers
                ? 'Loading DTR Records'
                : singlePrintLoading
                  ? singlePrintStatus || 'Preparing DTR...'
                  : printingStatus || 'Preparing DTRs...'}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: '#777', maxWidth: 280, lineHeight: 1.6 }}
            >
              {loadingAllUsers
                ? 'Fetching attendance data for all employees. This may take a moment.'
                : singlePrintLoading
                  ? 'Your DTR is being captured and compiled. Please wait.'
                  : 'DTRs are being captured and compiled into a PDF. A new tab will open when ready.'}
            </Typography>
            <Box sx={{ width: '100%', mt: 1 }}>
              <LinearProgress
                sx={{
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: alpha(accentColor, 0.12),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    backgroundColor: accentColor,
                  },
                }}
              />
            </Box>
          </Box>
        </Dialog>
      )}

      <style>
        {`
          html { overflow-y: scroll; }
          .dtr-responsive-header,.dtr-responsive-cell,.dtr-time-cell{width:auto!important;max-width:none!important;}
          .dtr-time-cell{white-space:nowrap!important;word-break:keep-all!important;}
          table{table-layout:auto!important;}
          @page{size:A4;margin:0;}
          @media print{
            .no-print{display:none!important;}
            .header,.top-banner,.page-banner,header,footer,.MuiDrawer-root,.MuiAppBar-root{display:none!important;}
            html,body{width:21cm;height:29.7cm;margin:0;padding:0;background:white;}
            .MuiContainer-root{max-width:100%!important;width:21cm!important;margin:0 auto!important;padding:0!important;display:flex!important;justify-content:center!important;align-items:center!important;background:white!important;}
            .MuiPaper-root,.MuiBox-root,.MuiCard-root{background:transparent!important;box-shadow:none!important;margin:0!important;}
            .table-container{width:100%!important;height:auto!important;margin:0 auto!important;padding:0!important;display:block!important;background:transparent!important;}
            .table-wrapper{width:100%!important;height:auto!important;margin:0!important;padding:0!important;display:flex!important;justify-content:center!important;align-items:flex-start!important;box-sizing:border-box!important;}
            .table-side-by-side{display:flex!important;flex-direction:row!important;gap:1.5%!important;width:100%!important;height:auto!important;}
            .table-side-by-side table{width:47%!important;border:1px solid black!important;border-collapse:collapse!important;background:white!important;}
            table td,table th{background:white!important;font-family:Arial,"Times New Roman",serif!important;position:relative!important;}
            table thead div,table thead p,table thead h4{font-family:Arial,"Times New Roman",serif!important;}
            table td div{position:relative!important;}
            table{page-break-inside:avoid!important;table-layout:fixed!important;}
            .dtr-responsive-header,.dtr-responsive-cell,.dtr-time-cell{width:auto!important;white-space:nowrap!important;word-break:keep-all!important;}
            table tbody tr:last-child td{padding-bottom:20px!important;}
            .bulk-dtr-print{display:none!important;}
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
                  p: 10,
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
                          mb: 0.25,
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
                justifyContent: 'space-between',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CalendarToday sx={{ fontSize: '1.8rem', mr: 2 }} />
                <Box>
                  <Typography variant="h7" sx={{ opacity: 0.9 }}>
                    Select date range to view records
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: alpha(accentColor, 0.12),
                  borderRadius: '50px',
                  padding: '4px',
                  gap: 0,
                }}
              >
                <ProfessionalButton
                  variant="text"
                  onClick={() => setViewMode('single')}
                  sx={{
                    borderRadius: '50px',
                    px: 2.5,
                    py: 0.75,
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    backgroundColor:
                      viewMode === 'single' ? accentColor : 'transparent',
                    color:
                      viewMode === 'single'
                        ? textSecondaryColor
                        : textPrimaryColor,
                    boxShadow:
                      viewMode === 'single'
                        ? `0 2px 8px ${alpha(accentColor, 0.4)}`
                        : 'none',
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      backgroundColor:
                        viewMode === 'single'
                          ? accentColor
                          : alpha(accentColor, 0.08),
                      boxShadow:
                        viewMode === 'single'
                          ? `0 2px 8px ${alpha(accentColor, 0.4)}`
                          : 'none',
                    },
                    minWidth: '130px',
                    textTransform: 'none',
                  }}
                >
                  Individual DTR
                </ProfessionalButton>
                <ProfessionalButton
                  variant="text"
                  onClick={() => setViewMode('multiple')}
                  sx={{
                    borderRadius: '50px',
                    px: 2.5,
                    py: 0.75,
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    backgroundColor:
                      viewMode === 'multiple' ? accentColor : 'transparent',
                    color:
                      viewMode === 'multiple'
                        ? textSecondaryColor
                        : textPrimaryColor,
                    boxShadow:
                      viewMode === 'multiple'
                        ? `0 2px 8px ${alpha(accentColor, 0.4)}`
                        : 'none',
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      backgroundColor:
                        viewMode === 'multiple'
                          ? accentColor
                          : alpha(accentColor, 0.08),
                      boxShadow:
                        viewMode === 'multiple'
                          ? `0 2px 8px ${alpha(accentColor, 0.4)}`
                          : 'none',
                    },
                    minWidth: '130px',
                    textTransform: 'none',
                  }}
                >
                  Batch Printing
                </ProfessionalButton>
              </Box>
            </Box>

            <Box sx={{ p: 4 }}>
              {/* Month Buttons + Year Selector */}
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  mb: 3,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <FormControl sx={{ minWidth: 140 }}>
                  <InputLabel sx={{ fontWeight: 600 }}>Year</InputLabel>
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
                    }}
                  >
                    {yearOptions.map((y) => (
                      <MenuItem key={y} value={y}>
                        {y}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {months.map((month, index) => {
                  const isSelected = selectedMonth === index;
                  return (
                    <ProfessionalButton
                      key={month}
                      variant={isSelected ? 'contained' : 'outlined'}
                      size="medium"
                      onClick={() => handleMonthClick(index)}
                      sx={{
                        borderColor: isSelected ? accentColor : accentColor,
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

              {/* DTR Type Selector */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  mb: 3,
                  alignItems: 'center',
                }}
              >
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 600, color: textPrimaryColor }}
                >
                  Select DTR Type
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                  }}
                >
                  <ProfessionalButton
                    variant={dtrType === 'regular' ? 'contained' : 'outlined'}
                    onClick={() => setDtrType('regular')}
                    sx={{
                      backgroundColor:
                        dtrType === 'regular' ? accentColor : 'transparent',
                      color:
                        dtrType === 'regular'
                          ? textSecondaryColor
                          : textPrimaryColor,
                      borderColor: accentColor,
                      '&:hover': {
                        backgroundColor:
                          dtrType === 'regular'
                            ? hoverColor
                            : alpha(accentColor, 0.1),
                        borderColor: accentColor,
                      },
                      py: 1,
                      px: 2.5,
                    }}
                  >
                    Regular
                  </ProfessionalButton>
                  <ProfessionalButton
                    variant={
                      dtrType === 'honorarium' ? 'contained' : 'outlined'
                    }
                    onClick={() => setDtrType('honorarium')}
                    sx={{
                      backgroundColor:
                        dtrType === 'honorarium' ? accentColor : 'transparent',
                      color:
                        dtrType === 'honorarium'
                          ? textSecondaryColor
                          : textPrimaryColor,
                      borderColor: accentColor,
                      '&:hover': {
                        backgroundColor:
                          dtrType === 'honorarium'
                            ? hoverColor
                            : alpha(accentColor, 0.1),
                        borderColor: accentColor,
                      },
                      py: 1,
                      px: 2.5,
                    }}
                  >
                    Honorarium
                  </ProfessionalButton>
                  <ProfessionalButton
                    variant={
                      dtrType === 'service-credit' ? 'contained' : 'outlined'
                    }
                    onClick={() => setDtrType('service-credit')}
                    sx={{
                      backgroundColor:
                        dtrType === 'service-credit'
                          ? accentColor
                          : 'transparent',
                      color:
                        dtrType === 'service-credit'
                          ? textSecondaryColor
                          : textPrimaryColor,
                      borderColor: accentColor,
                      '&:hover': {
                        backgroundColor:
                          dtrType === 'service-credit'
                            ? hoverColor
                            : alpha(accentColor, 0.1),
                        borderColor: accentColor,
                      },
                      py: 1,
                      px: 2.5,
                    }}
                  >
                    Service Credit
                  </ProfessionalButton>
                  <ProfessionalButton
                    variant={dtrType === 'overtime' ? 'contained' : 'outlined'}
                    onClick={() => setDtrType('overtime')}
                    sx={{
                      backgroundColor:
                        dtrType === 'overtime' ? accentColor : 'transparent',
                      color:
                        dtrType === 'overtime'
                          ? textSecondaryColor
                          : textPrimaryColor,
                      borderColor: accentColor,
                      '&:hover': {
                        backgroundColor:
                          dtrType === 'overtime'
                            ? hoverColor
                            : alpha(accentColor, 0.1),
                        borderColor: accentColor,
                      },
                      py: 1,
                      px: 2.5,
                    }}
                  >
                    Overtime
                  </ProfessionalButton>
                </Box>
              </Box>

              {/* Show Employee Number, Date fields, and Search button only in Single User mode */}
              {viewMode === 'single' && (
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
                      onChange={(e) => setPersonID(e.target.value)}
                      variant="outlined"
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
              )}
            </Box>
          </GlassCard>
        </Fade>

        {/* All Users DTR List Section - Show when viewMode is 'multiple' */}
        {viewMode === 'multiple' && (
          <Fade in timeout={1000}>
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
              {/* Header: title + Load button only */}
              <Box
                sx={{
                  p: 4,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  color: textPrimaryColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: textPrimaryColor }}
                >
                  All Users DTR List
                </Typography>
                <ProfessionalButton
                  variant="contained"
                  onClick={fetchAllUsersDTR}
                  disabled={loadingAllUsers || !startDate || !endDate}
                  startIcon={
                    loadingAllUsers ? (
                      <MCircularProgress size={20} />
                    ) : (
                      <AccessTime />
                    )
                  }
                  sx={{
                    backgroundColor: accentColor,
                    color: textSecondaryColor,
                    '&:hover': { backgroundColor: hoverColor },
                    '&:disabled': {
                      backgroundColor: alpha(accentColor, 0.5),
                      color: alpha(textSecondaryColor, 0.5),
                    },
                  }}
                >
                  {loadingAllUsers ? 'Loading...' : 'Load All Users DTR'}
                </ProfessionalButton>
              </Box>

              <Box sx={{ p: 4 }}>
                {allUsersDTR.length > 0 ? (
                  <>
                    {/* Print Status chips + Period badge */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 2,
                        mb: 3,
                      }}
                    >
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            mb: 1,
                            color: textPrimaryColor,
                            fontSize: '0.9rem',
                          }}
                        >
                          Print Status:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {['all', 'printed', 'unprinted'].map((val) => (
                            <Chip
                              key={val}
                              label={val.charAt(0).toUpperCase() + val.slice(1)}
                              onClick={() => setPrintStatusFilter(val)}
                              color={
                                printStatusFilter === val
                                  ? 'primary'
                                  : 'default'
                              }
                              sx={{
                                fontWeight:
                                  printStatusFilter === val ? 700 : 400,
                                cursor: 'pointer',
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                      {startDate && (
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 1,
                            backgroundColor: '#000000',
                            color: '#ffffff',
                            borderRadius: 2,
                            px: 2,
                            py: 0.75,
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            letterSpacing: '0.02em',
                            userSelect: 'none',
                          }}
                        >
                          <CalendarToday
                            sx={{ fontSize: 16, color: '#ffffff' }}
                          />
                          {formatMonth(startDate)}{' '}
                          {new Date(startDate).getFullYear()}
                        </Box>
                      )}
                    </Box>

                    {/* Search & Filters — two rows */}
                    <Box sx={{ mb: 3 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          mb: 1.5,
                          color: textPrimaryColor,
                          fontSize: '0.9rem',
                        }}
                      >
                        Search & Filters:
                      </Typography>
                      {/* Row 1 */}
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 2,
                          flexWrap: 'wrap',
                          mb: 2,
                        }}
                      >
                        <TextField
                          label="Search users"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchOutlined />
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            minWidth: 260,
                            flex: 1,
                            backgroundColor: 'white',
                          }}
                        />
                        <FormControl
                          sx={{ minWidth: 150, backgroundColor: 'white' }}
                        >
                          <InputLabel>Records</InputLabel>
                          <Select
                            value={recordFilter}
                            label="Records"
                            onChange={(e) => {
                              setRecordFilter(e.target.value);
                              setCurrentPage(1);
                            }}
                          >
                            <MenuItem value="all">All</MenuItem>
                            <MenuItem value="has">Has Records</MenuItem>
                            <MenuItem value="no">No Records</MenuItem>
                          </Select>
                        </FormControl>
                        <FormControl
                          sx={{ minWidth: 170, backgroundColor: 'white' }}
                        >
                          <InputLabel>Department</InputLabel>
                          <Select
                            value={departmentFilter}
                            label="Department"
                            onChange={(e) => {
                              setDepartmentFilter(e.target.value);
                              setCurrentPage(1);
                            }}
                          >
                            <MenuItem value="">All Departments</MenuItem>
                            {departments.map((dept) => (
                              <MenuItem key={dept.code} value={dept.code}>
                                {dept.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                      {/* Row 2 */}
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 2,
                          flexWrap: 'wrap',
                          alignItems: 'center',
                        }}
                      >
                        <FormControl
                          sx={{ minWidth: 190, backgroundColor: 'white' }}
                        >
                          <InputLabel>Employment Category</InputLabel>
                          <Select
                            value={employmentCategoryFilter}
                            label="Employment Category"
                            onChange={(e) => {
                              setEmploymentCategoryFilter(e.target.value);
                              setCurrentPage(1);
                            }}
                          >
                            <MenuItem value="">All Categories</MenuItem>
                            {employmentCategories.map((catId) => (
                              <MenuItem key={catId} value={catId}>
                                {getCategoryLabel(catId)}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl
                          sx={{ minWidth: 210, backgroundColor: 'white' }}
                        >
                          <InputLabel>Registration Status</InputLabel>
                          <Select
                            value={registrationStatusFilter}
                            label="Registration Status"
                            onChange={(e) => {
                              setRegistrationStatusFilter(e.target.value);
                              setCurrentPage(1);
                            }}
                          >
                            <MenuItem value="">All Status</MenuItem>
                            <MenuItem value="Registered">
                              🟢 Registered –{' '}
                              {registrationStatusCounts['Registered']}
                            </MenuItem>
                            <MenuItem value="Not Registered">
                              🟠 Not Registered –{' '}
                              {registrationStatusCounts['Not Registered']}
                            </MenuItem>
                          </Select>
                        </FormControl>
                        <FormControl
                          sx={{ minWidth: 120, backgroundColor: 'white' }}
                        >
                          <InputLabel>Rows</InputLabel>
                          <Select
                            value={rowsPerPage}
                            label="Rows"
                            onChange={(e) => {
                              setRowsPerPage(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                          >
                            <MenuItem value={10}>10</MenuItem>
                            <MenuItem value={20}>20</MenuItem>
                            <MenuItem value={50}>50</MenuItem>
                            <MenuItem value={100}>100</MenuItem>
                          </Select>
                        </FormControl>
                        {/* Pagination pinned right */}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            ml: 'auto',
                          }}
                        >
                          <ProfessionalButton
                            variant="outlined"
                            onClick={() => goToPage(1)}
                            disabled={currentPage === 1}
                            size="small"
                            sx={{ py: 1, px: 2, minWidth: 'auto' }}
                          >
                            First
                          </ProfessionalButton>
                          <ProfessionalButton
                            variant="outlined"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            size="small"
                            sx={{ py: 1, px: 2, minWidth: 'auto' }}
                          >
                            Prev
                          </ProfessionalButton>
                          <Typography
                            sx={{
                              minWidth: 48,
                              textAlign: 'center',
                              fontSize: '0.85rem',
                            }}
                          >
                            {currentPage} / {totalPages}
                          </Typography>
                          <ProfessionalButton
                            variant="outlined"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            size="small"
                            sx={{ py: 1, px: 2, minWidth: 'auto' }}
                          >
                            Next
                          </ProfessionalButton>
                          <ProfessionalButton
                            variant="outlined"
                            onClick={() => goToPage(totalPages)}
                            disabled={currentPage === totalPages}
                            size="small"
                            sx={{ py: 1, px: 2, minWidth: 'auto' }}
                          >
                            Last
                          </ProfessionalButton>
                        </Box>
                      </Box>
                    </Box>

                    {/* Table */}
                    <Box
                      sx={{
                        maxHeight: 360,
                        overflow: 'auto',
                        borderRadius: 1,
                        width: '100%',
                      }}
                    >
                      <Table
                        stickyHeader
                        sx={{ tableLayout: 'fixed', width: '100%' }}
                      >
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={(() => {
                                  const filtered = getFilteredUsers();
                                  const selectableCount = filtered.filter(
                                    (u) =>
                                      !printStatusMap.has(u.employeeNumber),
                                  ).length;
                                  return (
                                    selectedUsers.size === selectableCount &&
                                    selectableCount > 0
                                  );
                                })()}
                                indeterminate={(() => {
                                  const filtered = getFilteredUsers();
                                  const selectableCount = filtered.filter(
                                    (u) =>
                                      !printStatusMap.has(u.employeeNumber),
                                  ).length;
                                  return (
                                    selectedUsers.size > 0 &&
                                    selectedUsers.size < selectableCount
                                  );
                                })()}
                                onChange={(e) =>
                                  handleSelectAll(e.target.checked)
                                }
                                sx={{
                                  color: '#ffffff',
                                  '&.Mui-checked': { color: '#ffffff' },
                                  '&.MuiCheckbox-indeterminate': {
                                    color: '#ffffff',
                                  },
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ minWidth: 120, color: '#ffffff' }}>
                              Employee Number
                            </TableCell>
                            <TableCell
                              sx={{
                                minWidth: 200,
                                maxWidth: 250,
                                color: '#ffffff',
                              }}
                            >
                              Full Name
                            </TableCell>
                            <TableCell
                              sx={{
                                minWidth: 120,
                                maxWidth: 180,
                                color: '#ffffff',
                              }}
                            >
                              Department
                            </TableCell>
                            <TableCell sx={{ minWidth: 180, color: '#ffffff' }}>
                              Employment Category
                            </TableCell>
                            <TableCell sx={{ minWidth: 180, color: '#ffffff' }}>
                              Registration Status
                            </TableCell>
                            <TableCell sx={{ minWidth: 120, color: '#ffffff' }}>
                              Print Status
                            </TableCell>
                            <TableCell sx={{ minWidth: 80, color: '#ffffff' }}>
                              Actions
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {paginatedUsers.map((user) => (
                            <TableRow key={user.employeeNumber}>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selectedUsers.has(
                                    user.employeeNumber,
                                  )}
                                  onChange={() =>
                                    handleUserSelect(user.employeeNumber)
                                  }
                                  disabled={printStatusMap.has(
                                    user.employeeNumber,
                                  )}
                                />
                              </TableCell>
                              <TableCell>{user.employeeNumber}</TableCell>
                              <TableCell
                                sx={{
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {searchQuery
                                  ? highlightMatch(
                                      user.fullName || '',
                                      searchQuery,
                                    )
                                  : user.fullName}
                              </TableCell>
                              <TableCell
                                sx={{
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {user.rawUser?.departmentCode ||
                                  user.departmentCode ||
                                  'N/A'}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={getCategoryLabel(
                                    user.rawUser?.employmentCategory ??
                                      user.employmentCategory ??
                                      null,
                                  )}
                                  size="small"
                                  sx={{
                                    backgroundColor: alpha(
                                      getCategoryColor(
                                        user.rawUser?.employmentCategory ??
                                          user.employmentCategory ??
                                          null,
                                      ),
                                      0.1,
                                    ),
                                    color: getCategoryColor(
                                      user.rawUser?.employmentCategory ??
                                        user.employmentCategory ??
                                        null,
                                    ),
                                    border: `1px solid ${getCategoryColor(user.rawUser?.employmentCategory ?? user.employmentCategory ?? null)}`,
                                    fontWeight: '600',
                                    fontSize: '0.75rem',
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={
                                    user.registrationStatus === 'Registered'
                                      ? '🟢 Registered'
                                      : '🟠 Not Registered'
                                  }
                                  size="small"
                                  color={
                                    user.registrationStatus === 'Registered'
                                      ? 'success'
                                      : 'warning'
                                  }
                                  sx={{
                                    fontWeight: '600',
                                    fontSize: '0.75rem',
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                {printStatusMap.has(user.employeeNumber) ? (
                                  <Chip
                                    label="Printed"
                                    size="small"
                                    color="success"
                                    sx={{ fontSize: '0.75rem' }}
                                  />
                                ) : (
                                  <Chip
                                    label="Not Printed"
                                    size="small"
                                    color="default"
                                    sx={{ fontSize: '0.75rem' }}
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  onClick={() => showReprintConfirm(user)}
                                  sx={{ color: accentColor }}
                                  title={
                                    printStatusMap.has(user.employeeNumber)
                                      ? 'Re-print this DTR'
                                      : 'Print this DTR'
                                  }
                                >
                                  <PrintIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {paginatedUsers.length === 0 && (
                        <Box
                          sx={{
                            textAlign: 'center',
                            py: 8,
                            color: textPrimaryColor,
                          }}
                        >
                          <Typography variant="h6" sx={{ mb: 2 }}>
                            No Attendance Records Found
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.7 }}>
                            {allUsersDTR.length === 0
                              ? 'No attendance records exist for the selected date range.'
                              : 'No users match the current filters.'}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Action bar: Bulk print + Print-first selector + footer info */}
                    <Box
                      sx={{
                        mt: 0,
                        px: 2,
                        py: 1.5,
                        backgroundColor: alpha(accentColor, 0.05),
                        borderTop: `2px solid ${alpha(accentColor, 0.2)}`,
                        borderRadius: '0 0 8px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 2,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          flexWrap: 'wrap',
                        }}
                      >
                        {/* Print-first quick selector */}
                        <FormControl
                          sx={{ minWidth: 150, backgroundColor: 'white' }}
                        >
                          <Select
                            value={''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'none') return;
                              if (val === 'all') handleAutoSelectFirstN('all');
                              else handleAutoSelectFirstN(Number(val));
                            }}
                            displayEmpty
                            renderValue={() => 'Quick select…'}
                            size="small"
                          >
                            <MenuItem value="none">
                              <em>Choose</em>
                            </MenuItem>
                            <MenuItem value={10}>First 10</MenuItem>
                            <MenuItem value={20}>First 20</MenuItem>
                            <MenuItem value={50}>First 50 (Max)</MenuItem>
                          </Select>
                        </FormControl>

                        <ProfessionalButton
                          variant="contained"
                          onClick={handleBulkPrint}
                          disabled={selectedUsers.size === 0}
                          startIcon={<PrintIcon />}
                          sx={{
                            backgroundColor:
                              selectedUsers.size > 0
                                ? accentColor
                                : alpha(accentColor, 0.4),
                            color: textSecondaryColor,
                            '&:hover': { backgroundColor: hoverColor },
                          }}
                        >
                          Bulk Print ({selectedUsers.size})
                        </ProfessionalButton>
                      </Box>

                      {/* Footer info + Legend FAB */}
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.25,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ color: textPrimaryColor, fontSize: '0.8rem' }}
                          >
                            Showing{' '}
                            {Math.min(
                              filteredUsers.length,
                              (currentPage - 1) * rowsPerPage + 1,
                            )}
                            –
                            {Math.min(
                              filteredUsers.length,
                              currentPage * rowsPerPage,
                            )}{' '}
                            of {filteredUsers.length} users
                          </Typography>
                        </Box>

                        <Tooltip
                          title={
                            <Box sx={{ p: 0.5 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 700,
                                  display: 'block',
                                  mb: 0.5,
                                }}
                              >
                                Employment Category Legend
                              </Typography>
                              {[0, 1, 2, 3, 4, 5].map((id) => (
                                <Box
                                  key={id}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    mb: 0.25,
                                  }}
                                >
                                  <Circle
                                    sx={{
                                      fontSize: 8,
                                      color: getCategoryColor(id),
                                    }}
                                  />
                                  <Typography variant="caption">
                                    {getCategoryLabel(id)}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          }
                          placement="top-end"
                          arrow
                        >
                          <IconButton
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              backgroundColor: accentColor,
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: '1rem',
                              flexShrink: 0,
                              '&:hover': {
                                backgroundColor: hoverColor,
                                transform: 'scale(1.1)',
                              },
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                color: '#fff',
                                lineHeight: 1,
                              }}
                            >
                              ?
                            </Typography>
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </>
                ) : (
                  <Box
                    sx={{
                      textAlign: 'center',
                      py: 4,
                      color: textPrimaryColor,
                      opacity: 0.7,
                    }}
                  >
                    <Typography variant="body1">
                      Click "Load All Users DTR" to fetch all users' DTR data
                    </Typography>
                  </Box>
                )}
              </Box>
            </GlassCard>
          </Fade>
        )}

        {/* Records Table - Two Tables Side by Side - Show when viewMode is 'single' */}
        {viewMode === 'single' && (
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
                  <div
                    className="table-wrapper"
                    style={{ position: 'relative' }}
                  >
                    {/* Watermark */}
                    <img
                      src={hrisLogo}
                      alt="Watermark"
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        opacity: 0.07,
                        width: '80%',
                        maxWidth: '600px',
                        pointerEvents: 'none',
                        userSelect: 'none',
                        zIndex: 0,
                      }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        gap: '2%',
                        width: '8.7in',
                        minWidth: '8.5in',
                        margin: '0 auto',
                        backgroundColor: 'white',
                        position: 'relative',
                        zIndex: 1,
                      }}
                      className="table-side-by-side"
                    >
                      {(() => {
                        const dataFontSize = '10px';
                        const rowHeight = '16px';

                        const getRenderedTimeData = (record, type) => {
                          if (!record) return { hours: '', minutes: '' };
                          if (type === 'regular') {
                            return { hours: '', minutes: record.minutes || '' };
                          }
                          const minutes = record.minutes || 0;
                          const hours = Math.floor(minutes / 60);
                          const remainingMinutes = minutes % 60;
                          return {
                            hours: hours > 0 ? String(hours) : '',
                            minutes:
                              remainingMinutes > 0
                                ? String(remainingMinutes)
                                : '',
                          };
                        };

                        const getTimeFields = (record, type) => {
                          if (!record)
                            return {
                              timeIN: '',
                              breaktimeIN: '',
                              breaktimeOUT: '',
                              timeOUT: '',
                            };

                          switch (type) {
                            case 'honorarium':
                            case 'service-credit':
                            case 'overtime':
                              return {
                                timeIN: record.specialTimeIN || '',
                                breaktimeIN: '',
                                breaktimeOUT: '',
                                timeOUT: record.specialTimeOUT || '',
                              };
                            default:
                              return {
                                timeIN: record.timeIN || '',
                                breaktimeIN: record.breaktimeIN || '',
                                breaktimeOUT: record.breaktimeOUT || '',
                                timeOUT: record.timeOUT || '',
                              };
                          }
                        };

                        const renderHeader = () => (
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
                                    fontFamily:
                                      'Arial, "Times New Roman", serif',
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
                                      fontFamily:
                                        'Arial, "Times New Roman", serif',
                                      lineHeight: '1.2',
                                    }}
                                  >
                                    EULOGIO "AMANG" RODRIGUEZ <br /> INSTITUTE
                                    OF SCIENCE & TECHNOLOGY
                                  </p>
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td
                                colSpan="7"
                                style={{
                                  textAlign: 'center',
                                  padding: '0px 5px 2px 5px',
                                }}
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
                              <td
                                colSpan="7"
                                style={{
                                  textAlign: 'center',
                                  padding: '2px 5px',
                                }}
                              >
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
                                {dtrType === 'service-credit' ? (
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
                                ) : (
                                  <h4
                                    style={{
                                      fontFamily: 'Times New Roman, serif',
                                      textAlign: 'center',
                                      margin: '2px 0',
                                      fontWeight: 'bold',
                                      fontSize: '16px',
                                    }}
                                  >
                                    {dtrType === 'honorarium'
                                      ? 'DAILY TIME RECORD - HONORARIUM'
                                      : dtrType === 'overtime'
                                        ? 'DAILY TIME RECORD - OVERTIME'
                                        : 'DAILY TIME RECORD'}
                                  </h4>
                                )}
                              </td>
                            </tr>
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
                                    {employeeName}
                                  </div>
                                  <div
                                    style={{
                                      borderBottom: '2px solid black',
                                      width: '100%',
                                      margin: '2px 0 3px 0',
                                    }}
                                  />
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
                                style={{
                                  padding: '2px 5px',
                                  lineHeight: '1.1',
                                  textAlign: 'left',
                                }}
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
                                  <span style={{ marginRight: '6px' }}>
                                    Covered Dates:
                                  </span>
                                  <div
                                    style={{ minWidth: '220px', flexGrow: 1 }}
                                  >
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
                                style={{
                                  padding: '2px 5px',
                                  lineHeight: '1.2',
                                  textAlign: 'left',
                                }}
                              >
                                <p
                                  style={{
                                    fontSize: '11px',
                                    margin: '0',
                                    paddingLeft: '5px',
                                    fontFamily: 'Times New Roman, serif',
                                  }}
                                >
                                  For the month of:{' '}
                                  <b>
                                    {startDate ? formatMonth(startDate) : ''}
                                  </b>
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
                                Official hours for arrival (regular day) and
                                departure
                              </td>
                            </tr>
                            {Array.from({ length: 6 }, (_, i) => (
                              <tr key={`empty1-${i}`}>
                                <td colSpan="7"></td>
                              </tr>
                            ))}
                            <tr>
                              <td colSpan="7" style={{ padding: '2px 5px' }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    paddingLeft: '5%',
                                    height: '12px',
                                    marginBottom: '0px',
                                    fontFamily: 'Arial, serif',
                                    fontSize: '10px',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  <span style={{ marginRight: '5px' }}>
                                    Regular Days:
                                  </span>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      borderBottom: '1.5px solid black',
                                      flexGrow: 1,
                                      minWidth: '310px',
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
                              <td colSpan="7" style={{ padding: '2px 5px' }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    paddingLeft: '5%',
                                    height: '20px',
                                    fontFamily: 'Arial, serif',
                                    fontSize: '10px',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  <span style={{ marginRight: '5px' }}>
                                    Saturdays:
                                  </span>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      borderBottom: '1.5px solid black',
                                      flexGrow: 1,
                                      minWidth: '318px',
                                      marginBottom: '2px',
                                    }}
                                  ></span>
                                </div>
                              </td>
                            </tr>
                            {Array.from({ length: 2 }, (_, i) => (
                              <tr key={`empty3-${i}`}>
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
                                Arrival
                              </td>
                              <td
                                style={{
                                  border: '1px solid black',
                                  fontSize: '9px',
                                  fontFamily: 'Arial, serif',
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

                        const cellStyle = {
                          border: '1px solid black',
                          textAlign: 'center',
                          padding: '0 2px',
                          fontFamily: 'Arial, serif',
                          fontSize: dataFontSize,
                          height: rowHeight,
                          whiteSpace: 'nowrap',
                        };

                        return (
                          <>
                            {/* ================= TABLE 1 ================= */}
                            <table
                              style={{
                                position: 'relative',
                                border: '1px solid black',
                                borderCollapse: 'collapse',
                                width: '49%',
                                tableLayout: 'fixed',
                              }}
                              className="print-visble"
                            >
                              <DTRColGroup />
                              {renderHeader()}
                              <tbody>
                                {Array.from({ length: 31 }, (_, i) => {
                                  const day = (i + 1)
                                    .toString()
                                    .padStart(2, '0');
                                  const record = records.find((r) =>
                                    r.date.endsWith(`-${day}`),
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

                                  const indicator = getDateIndicator(fullDate);
                                  const timeFields = getTimeFields(
                                    record,
                                    dtrType,
                                  );
                                  const renderedTime = getRenderedTimeData(
                                    record,
                                    dtrType,
                                  );

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
                                              top: '50%',
                                              left: '50%',
                                              transform:
                                                'translate(-50%, -50%)',
                                              fontSize: '7px',
                                              fontWeight: 'bold',
                                              color: 'rgba(0, 0, 0, 0.25)',
                                              whiteSpace: 'nowrap',
                                              pointerEvents: 'none',
                                              zIndex: 0,
                                            }}
                                          >
                                            {indicator.label}
                                          </div>
                                        )}
                                        <span
                                          style={{
                                            position: 'relative',
                                            zIndex: 1,
                                          }}
                                        >
                                          {formatTime(timeFields.timeIN)}
                                        </span>
                                      </td>
                                      <td
                                        style={{
                                          ...cellStyle,
                                          backgroundColor: indicator
                                            ? indicator.bgColor
                                            : 'transparent',
                                        }}
                                      >
                                        {formatTime(timeFields.breaktimeIN)}
                                      </td>
                                      <td
                                        style={{
                                          ...cellStyle,
                                          backgroundColor: indicator
                                            ? indicator.bgColor
                                            : 'transparent',
                                        }}
                                      >
                                        {formatTime(timeFields.breaktimeOUT)}
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
                                              top: '50%',
                                              left: '50%',
                                              transform:
                                                'translate(-50%, -50%)',
                                              fontSize: '7px',
                                              fontWeight: 'bold',
                                              color: 'rgba(0, 0, 0, 0.25)',
                                              whiteSpace: 'nowrap',
                                              pointerEvents: 'none',
                                              zIndex: 0,
                                            }}
                                          >
                                            {indicator.label}
                                          </div>
                                        )}
                                        <span
                                          style={{
                                            position: 'relative',
                                            zIndex: 1,
                                          }}
                                        >
                                          {formatTime(timeFields.timeOUT)}
                                        </span>
                                      </td>
                                      <td
                                        style={{
                                          ...cellStyle,
                                          backgroundColor: indicator
                                            ? indicator.bgColor
                                            : 'transparent',
                                        }}
                                      >
                                        {renderedTime.minutes}
                                      </td>
                                      <td
                                        style={{
                                          ...cellStyle,
                                          backgroundColor: indicator
                                            ? indicator.bgColor
                                            : 'transparent',
                                        }}
                                      >
                                        {renderedTime.minutes}
                                      </td>
                                    </tr>
                                  );
                                })}
                                <tr>
                                  <td
                                    colSpan="7"
                                    style={{ padding: '10px 5px' }}
                                  >
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
                                      I CERTIFY on my honor that the above is a
                                      true and correct report
                                      <br />
                                      of the hours of work performed, record of
                                      which was made daily at
                                      <br />
                                      the time of arrival and at the time of
                                      departure from office.
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
                                    <div
                                      style={{
                                        width: '100%',
                                        marginTop: '15px',
                                      }}
                                    >
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

                            {/* ================= TABLE 2 ================= */}
                            <table
                              style={{
                                position: 'relative',
                                border: '1px solid black',
                                borderCollapse: 'collapse',
                                width: '49%',
                                tableLayout: 'fixed',
                              }}
                              className="print-visble"
                            >
                              <DTRColGroup />
                              {renderHeader()}
                              <tbody>
                                {Array.from({ length: 31 }, (_, i) => {
                                  const day = (i + 1)
                                    .toString()
                                    .padStart(2, '0');
                                  const record = records.find((r) =>
                                    r.date.endsWith(`-${day}`),
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

                                  const indicator = getDateIndicator(fullDate);
                                  const timeFields = getTimeFields(
                                    record,
                                    dtrType,
                                  );
                                  const renderedTime = getRenderedTimeData(
                                    record,
                                    dtrType,
                                  );

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
                                              top: '50%',
                                              left: '50%',
                                              transform:
                                                'translate(-50%, -50%)',
                                              fontSize: '7px',
                                              fontWeight: 'bold',
                                              color: 'rgba(0, 0, 0, 0.25)',
                                              whiteSpace: 'nowrap',
                                              pointerEvents: 'none',
                                              zIndex: 0,
                                            }}
                                          >
                                            {indicator.label}
                                          </div>
                                        )}
                                        <span
                                          style={{
                                            position: 'relative',
                                            zIndex: 1,
                                          }}
                                        >
                                          {formatTime(timeFields.timeIN)}
                                        </span>
                                      </td>
                                      <td
                                        style={{
                                          ...cellStyle,
                                          backgroundColor: indicator
                                            ? indicator.bgColor
                                            : 'transparent',
                                        }}
                                      >
                                        {formatTime(timeFields.breaktimeIN)}
                                      </td>
                                      <td
                                        style={{
                                          ...cellStyle,
                                          backgroundColor: indicator
                                            ? indicator.bgColor
                                            : 'transparent',
                                        }}
                                      >
                                        {formatTime(timeFields.breaktimeOUT)}
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
                                              top: '50%',
                                              left: '50%',
                                              transform:
                                                'translate(-50%, -50%)',
                                              fontSize: '7px',
                                              fontWeight: 'bold',
                                              color: 'rgba(0, 0, 0, 0.25)',
                                              whiteSpace: 'nowrap',
                                              pointerEvents: 'none',
                                              zIndex: 0,
                                            }}
                                          >
                                            {indicator.label}
                                          </div>
                                        )}
                                        <span
                                          style={{
                                            position: 'relative',
                                            zIndex: 1,
                                          }}
                                        >
                                          {formatTime(timeFields.timeOUT)}
                                        </span>
                                      </td>
                                      <td
                                        style={{
                                          ...cellStyle,
                                          backgroundColor: indicator
                                            ? indicator.bgColor
                                            : 'transparent',
                                        }}
                                      >
                                        {renderedTime.minutes}
                                      </td>
                                      <td
                                        style={{
                                          ...cellStyle,
                                          backgroundColor: indicator
                                            ? indicator.bgColor
                                            : 'transparent',
                                        }}
                                      >
                                        {renderedTime.minutes}
                                      </td>
                                    </tr>
                                  );
                                })}
                                <tr>
                                  <td
                                    colSpan="7"
                                    style={{ padding: '10px 5px' }}
                                  >
                                    <hr
                                      style={{
                                        borderTop: '2px solid black',
                                        width: '100%',
                                      }}
                                    />
                                    <p
                                      style={{
                                        textAlign: 'justify',
                                        fontSize: '10px',
                                        lineHeight: '1.4',
                                        fontFamily: 'Times New Roman, serif',
                                        margin: '5px 0',
                                      }}
                                    >
                                      I CERTIFY on my honor that the above is a
                                      true and correct report
                                      <br />
                                      of the hours of work performed, record of
                                      which was made daily at
                                      <br />
                                      the time of arrival and at the time of
                                      departure from office.
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
                                    <div
                                      style={{
                                        width: '100%',
                                        marginTop: '15px',
                                      }}
                                    >
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
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </Box>
            </Paper>
          </Fade>
        )}

        {/* FAB buttons for single user - Show when viewMode is 'single' */}
        {viewMode === 'single' && (
          <Box className="no-print" sx={{ position: 'fixed', bottom: 60, right: 24, display: 'flex', flexDirection: 'row', gap: 1.5, zIndex: 1300, alignItems: 'center' }}>
            <Tooltip placement="top" title={
              <Box sx={{ p: 0.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em' }}>LEGEND</Typography>
                {[{ label: 'Holiday', bg: 'rgba(237,108,2,0.25)', border: '#ed6c02' }, { label: 'Suspension', bg: 'rgba(211,47,47,0.2)', border: '#d32f2f' }, { label: 'On Leave', bg: 'rgba(46,125,50,0.2)', border: '#2e7d32' }].map(({ label, bg, border }) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 28, height: 16, backgroundColor: bg, border: `1.5px solid ${border}`, borderRadius: '3px', flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 500 }}>{label}</Typography>
                  </Box>
                ))}
              </Box>
            } arrow componentsProps={{ tooltip: { sx: { bgcolor: 'white', color: '#333', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: '1px solid #e0e0e0', borderRadius: '10px', p: 1.5 } }, arrow: { sx: { color: 'white' } } }}>
              <IconButton sx={{ backgroundColor: '#ffffff', color: '#6D2323', width: 52, height: 52, border: '1px solid #e0e0e0', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', transition: 'all 0.2s ease', fontSize: '18px', fontWeight: 700, '&:hover': { backgroundColor: '#f5f5f5', transform: 'translateY(-2px)' } }}>?</IconButton>
            </Tooltip>
            <Tooltip title="Print DTR" placement="top">
              <IconButton onClick={printPage} sx={{ backgroundColor: '#ffffff', color: '#6D2323', width: 52, height: 52, border: '1px solid #e0e0e0', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', transition: 'all 0.2s ease', '&:hover':{ backgroundColor: '#f5f5f5', transform: 'translateY(-2px)' } }}><PrintIcon /></IconButton>
            </Tooltip>
            <Tooltip title="Download PDF" placement="top">
              <IconButton onClick={downloadPDF} sx={{ backgroundColor: '#ffffff', color: '#A31D1D', width: 52, height: 52, border: '1px solid #e0e0e0', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', transition: 'all 0.2s ease', '&:hover':{ backgroundColor: '#f5f5f5', transform: 'translateY(-2px)' } }}><PictureAsPdfIcon /></IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Bulk Print Preview Modal */}
        <Dialog
          open={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          maxWidth="lg"
          fullWidth
          sx={{
            '& .MuiDialog-container': { overflow: 'hidden' },
            '& .MuiDialog-paper': { margin: 2 },
          }}
          PaperProps={{
            sx: {
              borderRadius: 4,
              overflow: 'hidden',
              visibility: printingAll ? 'hidden' : 'visible',
              pointerEvents: printingAll ? 'none' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
            },
          }}
        >
          {/* Header */}
          <Box
            sx={{
              px: 3,
              py: 2,
              background: `linear-gradient(135deg, ${accentColor} 0%, ${accentDark} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, color: '#fff', lineHeight: 1.2 }}
              >
                DTR Preview
              </Typography>
              {previewUsers[currentPreviewIndex] && (
                <Typography
                  variant="caption"
                  sx={{ color: 'rgba(255,255,255,0.75)' }}
                >
                  {previewUsers[currentPreviewIndex].fullName}
                  {startDate &&
                    ` · ${formatMonth(startDate)} ${new Date(startDate).getFullYear()}`}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {previewUsers.length > 1 && !printingAll && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderRadius: '20px',
                    px: 1.5,
                    py: 0.5,
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={handlePrevious}
                    sx={{
                      color: '#fff',
                      p: 0.25,
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                    }}
                  >
                    <ArrowBack sx={{ fontSize: 18 }} />
                  </IconButton>
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#fff',
                      fontWeight: 600,
                      minWidth: 48,
                      textAlign: 'center',
                    }}
                  >
                    {currentPreviewIndex + 1} of {previewUsers.length}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={handleNext}
                    sx={{
                      color: '#fff',
                      p: 0.25,
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                    }}
                  >
                    <ArrowForward sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              )}
              <IconButton
                onClick={() => setPreviewModalOpen(false)}
                size="small"
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  width: 30,
                  height: 30,
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.25)' },
                }}
              >
                <Close sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Box>

          {/* Body */}
          <DialogContent
            sx={{
              p: 0,
              flex: 1,
              overflow: 'hidden',
              backgroundColor: '#f0f0f0',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {!printingAll && (
              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  p: 2,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                }}
              >
                {previewUsers[currentPreviewIndex] && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      backgroundColor: 'white',
                      borderRadius: 2,
                      width: 'fit-content',
                      maxWidth: '100%',
                      border: '1px solid #e0e0e0',
                      '& .table-container': {
                        width: '100%',
                        overflow: 'visible',
                      },
                      '& .table-wrapper': {
                        position: 'relative',
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                      },
                    }}
                  >
                    {renderDTRForModal(previewUsers[currentPreviewIndex])}
                  </Paper>
                )}
              </Box>
            )}

            {/* Hidden off-screen DTR refs for html2canvas */}
            <Box
              sx={{
                position: 'absolute',
                left: '-9999px',
                top: 0,
                width: 0,
                height: 0,
                overflow: 'hidden',
              }}
            >
              {previewUsers.map((user) => renderUserDTRTable(user))}
            </Box>
          </DialogContent>

          {/* Footer Action Bar */}
          <Box
            sx={{
              px: 3,
              py: 1.5,
              backgroundColor: '#fff',
              borderTop: `2px solid ${alpha(accentColor, 0.15)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <ProfessionalButton
                variant="contained"
                onClick={handlePrintAllSelected}
                startIcon={<PrintIcon />}
                sx={{
                  backgroundColor: accentColor,
                  color: '#fff',
                  borderRadius: '50px',
                  px: 3,
                  py: 1,
                  '&:hover': { backgroundColor: hoverColor },
                }}
              >
                Print All
                <Box
                  component="span"
                  sx={{
                    ml: 1,
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    borderRadius: '20px',
                    px: 1,
                    py: 0.25,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {previewUsers.length}
                </Box>
              </ProfessionalButton>
              <ProfessionalButton
                variant="outlined"
                onClick={handleDownloadAllSelected}
                startIcon={<PrintIcon />}
                sx={{
                  borderColor: accentColor,
                  color: accentColor,
                  borderRadius: '50px',
                  borderWidth: 2,
                  px: 3,
                  py: 1,
                  '&:hover': {
                    borderColor: hoverColor,
                    backgroundColor: alpha(accentColor, 0.05),
                    borderWidth: 2,
                  },
                }}
              >
                Download PDF
                <Box
                  component="span"
                  sx={{
                    ml: 1,
                    backgroundColor: alpha(accentColor, 0.1),
                    borderRadius: '20px',
                    px: 1,
                    py: 0.25,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: accentColor,
                  }}
                >
                  {previewUsers.length}
                </Box>
              </ProfessionalButton>
            </Box>
            <ProfessionalButton
              variant="text"
              onClick={() => setPreviewModalOpen(false)}
              sx={{
                color: 'text.secondary',
                borderRadius: '50px',
                px: 3,
                '&:hover': { backgroundColor: alpha('#000', 0.05) },
              }}
            >
              Close
            </ProfessionalButton>
          </Box>
        </Dialog>

        {/* Alert Modal */}
        <Dialog
          open={alertModal.open}
          onClose={closeAlert}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle
            sx={{
              backgroundColor: primaryColor,
              color: textPrimaryColor,
              fontWeight: 700,
            }}
          >
            {alertModal.title}
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Typography variant="body1">{alertModal.message}</Typography>
          </DialogContent>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <ProfessionalButton
              variant="contained"
              onClick={closeAlert}
              sx={{
                backgroundColor: accentColor,
                color: textSecondaryColor,
                '&:hover': { backgroundColor: hoverColor },
              }}
            >
              OK
            </ProfessionalButton>
          </Box>
        </Dialog>

        {/* Re-print Confirmation Modal */}
        <Dialog
          open={confirmModal.open}
          onClose={closeConfirm}
          maxWidth="sm"
          fullWidth
          sx={{
            '& .MuiDialog-scrollPaper': { alignItems: 'center' },
            '& .MuiDialog-container': { overflow: 'hidden' },
          }}
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0px 10px 30px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              margin: 2,
            },
          }}
        >
          <DialogContent
            sx={{
              textAlign: 'center',
              py: 4,
              px: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              overflowX: 'hidden',
              overflowY: 'hidden',
            }}
          >
            <Box
              sx={{
                mb: 2,
                color: accentColor,
                backgroundColor: alpha(accentColor, 0.05),
                p: 2,
                borderRadius: '12px',
              }}
            >
              <PrintIcon sx={{ fontSize: 40 }} />
            </Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, mb: 0.5, color: textPrimaryColor }}
            >
              {printStatusMap.has(confirmModal.user?.employeeNumber)
                ? 'Re-print DTR?'
                : 'Confirm Print Job'}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', mb: 3, maxWidth: '85%' }}
            >
              {printStatusMap.has(confirmModal.user?.employeeNumber)
                ? 'This record was printed previously. Would you like to generate a new copy?'
                : 'Please verify the details below before printing.'}
            </Typography>
            {confirmModal.user && (
              <Box
                sx={{
                  width: '100%',
                  border: '1px dashed',
                  borderColor: 'divider',
                  backgroundColor: 'background.paper',
                  borderRadius: 2,
                  p: 2.5,
                  mb: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  alignItems: 'center',
                }}
              >
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {confirmModal.user.fullName ||
                    `${confirmModal.user.firstName} ${confirmModal.user.lastName}`}
                </Typography>
                <Box
                  sx={{
                    width: '40px',
                    height: '3px',
                    backgroundColor: accentColor,
                    borderRadius: '2px',
                  }}
                />
                <Stack
                  direction="row"
                  spacing={2}
                  divider={<Divider orientation="vertical" flexItem />}
                >
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {confirmModal.user.employeeNumber}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {formatMonth(startDate)}
                  </Typography>
                </Stack>
              </Box>
            )}
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                width: '100%',
                justifyContent: 'center',
              }}
            >
              <ProfessionalButton
                variant="outlined"
                onClick={closeConfirm}
                sx={{
                  borderRadius: '50px',
                  px: 3,
                  borderColor: 'divider',
                  color: 'text.primary',
                  borderWidth: 2,
                  '&:hover': {
                    borderColor: accentColor,
                    backgroundColor: 'transparent',
                    color: accentColor,
                  },
                }}
              >
                Cancel
              </ProfessionalButton>
              <ProfessionalButton
                variant="contained"
                onClick={() =>
                  confirmModal.user &&
                  handleIndividualPrintConfirmed(confirmModal.user)
                }
                startIcon={<PrintIcon />}
                sx={{
                  borderRadius: '50px',
                  px: 4,
                  py: 1,
                  backgroundColor: accentColor,
                  boxShadow: `0 4px 14px 0 ${alpha(accentColor, 0.39)}`,
                  color: textSecondaryColor,
                  '&:hover': {
                    backgroundColor: hoverColor,
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                Print
              </ProfessionalButton>
            </Box>
          </DialogContent>
        </Dialog>
      </Box>

      {/* ── Integrity Status Snackbar ────────────────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default DailyTimeRecordFaculty;
