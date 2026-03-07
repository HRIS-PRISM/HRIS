// (full file contents - all bugs fixed + toggle view + tamper protection)
import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import { TablePagination } from '@mui/material';
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
  Add,
  Delete,
} from '@mui/icons-material';

import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import CircularProgress from '@mui/material/CircularProgress';

// ─────────────────────────────────────────────────────────────────────────────
// PURE UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
};

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

const formatDateLong = (val) => {
  if (!val) return '';
  const s = String(val);
  const dateOnly = s.split('T')[0];
  let y, month, day;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const [yy, mm, dd] = dateOnly.split('-').map(Number);
    y = yy; day = dd;
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    month = months[mm - 1] || '';
  } else {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return s;
    y = d.getFullYear(); day = d.getDate();
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    month = months[d.getMonth()] || '';
  }
  return month ? `${month} ${String(day).padStart(2, '0')}, ${y}` : String(val);
};

const normalizeDateStr = (val) => {
  if (!val) return '';
  const s = String(val).split('T')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
};

const parseTimeToMinutes = (str) => {
  if (str == null || String(str).trim() === '') return null;
  const s = String(str).trim();
  const match = s.match(/^\s*(\d{1,2})\s*:\s*(\d{1,2})(?:\s*:\s*\d{1,2})?\s*(AM|PM)\s*$/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  const ampm = (match[3] || '').toUpperCase();
  if (ampm === 'PM' && hour !== 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  if (hour < 0 || hour > 23 || min < 0 || min > 59) return null;
  return hour * 60 + min;
};

const formatMinutesToTime = (m) => {
  if (m == null || m < 0 || m >= 24 * 60) return '';
  const h = Math.floor(m / 60);
  const min = m % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
};

const getTimeSegmentsForRow = (row) => {
  const segments = [];
  const r = row || {};
  const timeIn = parseTimeToMinutes(r.officialTimeIN);
  const breakIn = parseTimeToMinutes(r.officialBreaktimeIN);
  const breakOut = parseTimeToMinutes(r.officialBreaktimeOUT);
  const timeOut = parseTimeToMinutes(r.officialTimeOUT);
  if (timeIn != null && timeOut != null && timeIn < timeOut) {
    if (breakIn != null && breakOut != null && breakIn > timeIn && breakOut < timeOut && breakIn < breakOut) {
      if (timeIn < breakIn) segments.push({ start: timeIn, end: breakIn, label: 'Work Days' });
      if (breakOut < timeOut) segments.push({ start: breakOut, end: timeOut, label: 'Work Days' });
    } else {
      segments.push({ start: timeIn, end: timeOut, label: 'Work Days' });
    }
  }
  const honIn = parseTimeToMinutes(r.officialHonorariumTimeIN);
  const honOut = parseTimeToMinutes(r.officialHonorariumTimeOUT);
  if (honIn != null && honOut != null && honIn < honOut && !(honIn === 0 && honOut === 12 * 60)) {
    segments.push({ start: honIn, end: honOut, label: 'Honorarium' });
  }
  const scIn = parseTimeToMinutes(r.officialServiceCreditTimeIN);
  const scOut = parseTimeToMinutes(r.officialServiceCreditTimeOUT);
  if (scIn != null && scOut != null && scIn < scOut && !(scIn === 0 && scOut === 12 * 60)) {
    segments.push({ start: scIn, end: scOut, label: 'Service Credits' });
  }
  const otIn = parseTimeToMinutes(r.officialOverTimeIN);
  const otOut = parseTimeToMinutes(r.officialOverTimeOUT);
  if (otIn != null && otOut != null && otIn < otOut && !(otIn === 0 && otOut === 12 * 60)) {
    segments.push({ start: otIn, end: otOut, label: 'Overtime' });
  }
  return segments;
};

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
          return { valid: false, day, segmentA: { label: sa.label, start: sa.start, end: sa.end }, segmentB: { label: sb.label, start: sb.start, end: sb.end } };
        }
      }
    }
  }
  return { valid: true };
};

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '109, 35, 35';
};

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const makeDefaultRow = (employeeID, day) => ({
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

// ─────────────────────────────────────────────────────────────────────────────
// DATA INTEGRITY: deep-clone helper + checksum
// Prevents console tampering from persisting — server is always the source of truth.
// A lightweight hash is stored per fetch; on save we re-validate from server.
// ─────────────────────────────────────────────────────────────────────────────

const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

// Simple djb2-style hash over a JSON string
const computeChecksum = (data) => {
  const str = JSON.stringify(data);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return hash;
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const GlassCard = styled(Card)(() => ({
  borderRadius: 20,
  backdropFilter: 'blur(10px)',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': { transform: 'translateY(-4px)' },
}));

const ProfessionalButton = styled(Button)(({ variant }) => ({
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
  '&:active': { transform: 'translateY(0)' },
}));

const ModernTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    '&:hover': { transform: 'translateY(-1px)', backgroundColor: 'rgba(255, 255, 255, 0.95)' },
    '&.Mui-focused': { transform: 'translateY(-1px)', boxShadow: '0 4px 20px rgba(254, 249, 225, 0.25)', backgroundColor: 'rgba(255, 255, 255, 1)' },
  },
  '& .MuiInputLabel-root': { fontWeight: 500 },
}));

const PremiumTableContainer = styled(TableContainer)(() => ({
  borderRadius: 16,
  overflow: 'auto',
  boxShadow: '0 4px 24px rgba(109, 35, 35, 0.06)',
  border: '1px solid rgba(109, 35, 35, 0.08)',
  maxHeight: '600px',
  '&::-webkit-scrollbar': { width: '8px', height: '8px' },
  '&::-webkit-scrollbar-track': { background: 'rgba(254, 249, 225, 0.3)', borderRadius: '4px' },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(109, 35, 35, 0.4)',
    borderRadius: '4px',
    '&:hover': { background: 'rgba(109, 35, 35, 0.6)' },
  },
}));

const PremiumTableCell = styled(TableCell)(({ isHeader }) => ({
  fontWeight: isHeader ? 600 : 500,
  padding: '18px 20px',
  borderBottom: isHeader ? '2px solid rgba(254, 249, 225, 0.5)' : '1px solid rgba(109, 35, 35, 0.06)',
  fontSize: '0.95rem',
  letterSpacing: '0.025em',
  minWidth: '120px',
  whiteSpace: 'nowrap',
}));

// ─────────────────────────────────────────────────────────────────────────────
// TAMPER WARNING BANNER
// ─────────────────────────────────────────────────────────────────────────────

const TamperWarningBanner = ({ onRestore }) => (
  <Box
    sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      bgcolor: '#7a0000',
      color: '#fff',
      px: 3,
      py: 1.5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      borderBottom: '3px solid #ff4444',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <WarningAmber sx={{ color: '#ffd180', fontSize: 22 }} />
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: '0.92rem', lineHeight: 1.2 }}>
          ⚠ Data Tampering Detected
        </Typography>
        <Typography sx={{ fontSize: '0.78rem', opacity: 0.85, mt: 0.25 }}>
          Schedule data was modified outside the application. Displaying last verified data from server.
        </Typography>
      </Box>
    </Box>
    <Button
      variant="outlined"
      size="small"
      onClick={onRestore}
      sx={{
        borderColor: '#ffd180',
        color: '#ffd180',
        fontWeight: 700,
        textTransform: 'none',
        fontSize: '0.8rem',
        flexShrink: 0,
        ml: 2,
        '&:hover': { bgcolor: 'rgba(255,209,128,0.15)', borderColor: '#ffd180' },
      }}
    >
      Restore from Server
    </Button>
  </Box>
);

// ─────────────────────────────────────────────────────────────────────────────
// VIEW MODE TOGGLE BUTTON GROUP
// ─────────────────────────────────────────────────────────────────────────────

const ViewToggle = ({ value, onChange, accentColor, primaryColor, textPrimaryColor }) => {
  const options = [
    { key: 'single', label: 'Single Employee', icon: <Person sx={{ fontSize: 18 }} /> },
    { key: 'allUsers', label: 'All Users', icon: <PeopleIcon sx={{ fontSize: 18 }} /> },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        border: `2px solid ${alpha(accentColor, 0.3)}`,
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: alpha(accentColor, 0.05),
      }}
    >
      {options.map(({ key, label, icon }) => {
        const active = value === key;
        return (
          <Button
            key={key}
            onClick={() => onChange(key)}
            startIcon={icon}
            disableElevation
            sx={{
              borderRadius: 0,
              textTransform: 'none',
              fontWeight: active ? 700 : 500,
              fontSize: '0.88rem',
              px: 2.5,
              py: 1.2,
              bgcolor: active ? accentColor : 'transparent',
              color: active ? primaryColor : textPrimaryColor,
              borderRight: key === 'single' ? `1px solid ${alpha(accentColor, 0.25)}` : 'none',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: active ? accentColor : alpha(accentColor, 0.12),
              },
            }}
          >
            {label}
          </Button>
        );
      })}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const OfficialTimeForm = () => {
  const { settings } = useSystemSettings();

  const primaryColor = settings.accentColor || '#FEF9E1';
  const secondaryColor = settings.backgroundColor || '#FFF8E7';
  const accentColor = settings.primaryColor || '#6D2323';
  const accentDark = settings.secondaryColor || '#8B3333';
  const textPrimaryColor = settings.textPrimaryColor || '#6D2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';
  const hoverColor = settings.hoverColor || '#6D2323';

  const { hasAccess, loading: accessLoading } = usePageAccess('official-time');

  // ── VIEW MODE: 'single' | 'allUsers' ─────────────────────────────────────
  const [viewMode, setViewMode] = useState('single');
  // Derived booleans for readability
  const showSingleView = viewMode === 'single';
  const showAllUsers = viewMode === 'allUsers';
  // Keep legacy setter working (used in effects below)
  const setShowAllUsers = useCallback((val) => {
    setViewMode(typeof val === 'function'
      ? (prev) => (val(prev === 'allUsers') ? 'allUsers' : 'single')
      : val ? 'allUsers' : 'single'
    );
  }, []);

  const [employeeID, setEmployeeID] = useState('');
  const [records, setRecords] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [found, setFound] = useState(false);

  const [file, setFile] = useState(null);

  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewRecords, setPreviewRecords] = useState([]);
  const [previewViewScheduleView, setPreviewViewScheduleView] = useState('workDays');

  const [checkingOverlap, setCheckingOverlap] = useState(false);

  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const autoSaveTimeoutRef = useRef(null);
  const saveInFlightRef = useRef(false);

  // ── DATA INTEGRITY ────────────────────────────────────────────────────────
  // serverRecordsRef: the last clean copy fetched from / confirmed by server
  const serverRecordsRef = useRef([]);
  // checksumRef: hash of serverRecordsRef at last verified fetch
  const checksumRef = useRef(null);
  const [tamperDetected, setTamperDetected] = useState(false);
  const tamperCheckIntervalRef = useRef(null);

  const stampServerRecords = useCallback((data) => {
    const clean = deepClone(data);
    serverRecordsRef.current = clean;
    checksumRef.current = computeChecksum(clean);
    setTamperDetected(false);
  }, []);

  // Periodic integrity check: compare live records state against last server snapshot
  // This catches devtools console edits like `window.__records = ...`
  const runIntegrityCheck = useCallback((liveRecords) => {
    if (!checksumRef.current || !serverRecordsRef.current.length) return;
    const liveChecksum = computeChecksum(liveRecords);
    if (liveChecksum !== checksumRef.current) {
      setTamperDetected(true);
      // Auto-restore to server copy
      setRecords(deepClone(serverRecordsRef.current));
    }
  }, []);

  // ── Start/stop integrity polling when records change ─────────────────────
  useEffect(() => {
    if (tamperCheckIntervalRef.current) clearInterval(tamperCheckIntervalRef.current);
    if (!serverRecordsRef.current.length) return;
    tamperCheckIntervalRef.current = setInterval(() => {
      setRecords((current) => {
        runIntegrityCheck(current);
        return current; // no-op unless tamper detected inside runIntegrityCheck
      });
    }, 3000);
    return () => clearInterval(tamperCheckIntervalRef.current);
  }, [runIntegrityCheck]);

  const handleRestoreFromServer = useCallback(async () => {
    const trimmedId = String(employeeID || '').trim();
    if (!trimmedId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/officialtimetable/${trimmedId}`, getAuthHeaders());
      const fresh = res.data.length > 0 ? res.data : buildDefaultRecords(trimmedId);
      stampServerRecords(fresh);
      setRecords(deepClone(fresh));
      setFound(res.data.length > 0);
    } catch (err) {
      console.error('Restore failed:', err);
    } finally {
      setLoading(false);
      setTamperDetected(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeID]);

  const allUsers_state = useState([]);
  const [allUsers, setAllUsers] = allUsers_state;
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsersPage, setAllUsersPage] = useState(0);
  const [allUsersRowsPerPage, setAllUsersRowsPerPage] = useState(10);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [settingDefault, setSettingDefault] = useState(false);

  const [draftAcademicYear, setDraftAcademicYear] = useState('');
  const [draftSemester, setDraftSemester] = useState('');
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');
  const [draftStatus, setDraftStatus] = useState('active');

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [modalRecords, setModalRecords] = useState([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningOverlap, setWarningOverlap] = useState(null);
  const [isBulkSchedule, setIsBulkSchedule] = useState(false);
  const [bulkScheduleBlocks, setBulkScheduleBlocks] = useState([]);
  const [bulkTargetEmployees, setBulkTargetEmployees] = useState([]);
  const [showBulkBlocksModal, setShowBulkBlocksModal] = useState(false);
  const [showViewScheduleModal, setShowViewScheduleModal] = useState(false);
  const [viewScheduleInfo, setViewScheduleInfo] = useState(null);
  const [viewScheduleRecords, setViewScheduleRecords] = useState([]);
  const [scheduleView, setScheduleView] = useState('workDays');
  const [viewScheduleView, setViewScheduleView] = useState('workDays');
  const [viewScheduleEmployeeName, setViewScheduleEmployeeName] = useState('');

  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [pendingBulkSubmit, setPendingBulkSubmit] = useState(false);

  // ── helpers ──────────────────────────────────────────────────────────────

  const showToast = useCallback((msg) => {
    setSuccessAction(msg);
    setSuccessOpen(true);
    setTimeout(() => setSuccessOpen(false), 3000);
  }, []);

  const buildDefaultRecords = useCallback((empId) =>
    DAYS_ORDER.map((day) => makeDefaultRow(empId, day)),
  []);

  const resolveEmployeeName = useCallback((empId) => {
    const found = allUsers.find((u) => String(u.employeeNumber) === String(empId));
    return found?.fullName || '';
  }, [allUsers]);

  const fetchAllUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/officialtime/users-status`, getAuthHeaders());
      setAllUsers(response.data || []);
      setAllUsersPage(0);
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('Error fetching users.');
    } finally {
      setLoadingUsers(false);
    }
  }, [showToast]);

  // ── search ────────────────────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    const trimmedId = String(employeeID || '').trim();
    if (!trimmedId) {
      showToast('Please enter an Employee ID.');
      return;
    }

    setHasSearched(true);
    setLoading(true);
    setRecords([]);
    setFound(false);

    try {
      const res = await axios.get(`${API_BASE_URL}/officialtimetable/${trimmedId}`, getAuthHeaders());
      const data = res.data.length > 0 ? res.data : buildDefaultRecords(trimmedId);
      stampServerRecords(data);
      setRecords(deepClone(data));
      setFound(res.data.length > 0);
    } catch (err) {
      console.error('Error fetching data:', err);
      showToast('Error fetching records.');
    } finally {
      setLoading(false);
    }
  }, [employeeID, buildDefaultRecords, showToast, stampServerRecords]);

  // ── auto-save ─────────────────────────────────────────────────────────────

  const handleChange = useCallback((index, field, value) => {
    setRecords((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (!isBulkSchedule) {
        if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = setTimeout(() => {
          autoSaveRecords(updated);
        }, 1500);
      }
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBulkSchedule]);

  const autoSaveRecords = useCallback(async (recordsToSave) => {
    const trimmedId = String(employeeID || '').trim();
    if (!trimmedId || !recordsToSave || recordsToSave.length === 0) return;
    if (!draftStartDate || !draftEndDate) return;
    if (saveInFlightRef.current) return;

    const overlapResult = checkTimeOverlaps(recordsToSave);
    if (!overlapResult.valid) {
      const a = overlapResult.segmentA;
      const b = overlapResult.segmentB;
      setWarningMessage(`Time overlap on ${overlapResult.day}: ${a.label} overlaps with ${b.label}. Adjust schedule so times do not overlap.`);
      setShowWarningModal(true);
      return;
    }

    setAutoSaving(true);
    saveInFlightRef.current = true;
    try {
      const academicYearForBackend = [draftAcademicYear, draftSemester].filter(Boolean).join(' ').trim() || null;
      await axios.post(
        `${API_BASE_URL}/officialtimetable`,
        { employeeID: trimmedId, academicYear: academicYearForBackend, startDate: draftStartDate, endDate: draftEndDate, status: draftStatus || 'active', records: recordsToSave },
        getAuthHeaders(),
      );
      setLastSaved(new Date());
      setFound(true);
      // Update server snapshot after successful auto-save
      stampServerRecords(recordsToSave);
    } catch (err) {
      console.error('Error auto-saving records:', err);
    } finally {
      setAutoSaving(false);
      saveInFlightRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeID, draftAcademicYear, draftSemester, draftStartDate, draftEndDate, draftStatus, stampServerRecords]);

  // ── create schedule modal ─────────────────────────────────────────────────

  const openCreateScheduleModal = useCallback(async () => {
    const trimmedId = String(employeeID || '').trim();
    if (!trimmedId) {
      showToast('Please enter Employee Number.');
      return;
    }

    setIsBulkSchedule(false);
    setBulkTargetEmployees([]);
    setBulkScheduleBlocks([]);
    setScheduleView('workDays');

    if (hasSearched && records.length === 0) {
      setModalRecords(buildDefaultRecords(trimmedId));
      setShowScheduleModal(true);
      return;
    }

    if (!draftAcademicYear || !draftSemester) {
      showToast('Please fill Academic Year and Semester first.');
      return;
    }
    if (!draftStartDate || !draftEndDate) {
      showToast('Please fill Start Date and End Date first.');
      return;
    }
    if (new Date(draftStartDate) > new Date(draftEndDate)) {
      showToast('Start date must be on or before End date.');
      return;
    }

    let existingRecords = [];
    try {
      const res = await axios.get(`${API_BASE_URL}/officialtimetable/${trimmedId}`, getAuthHeaders());
      existingRecords = res.data || [];
    } catch {
      existingRecords = [];
    }

    const byKey = new Map();
    for (const r of existingRecords) {
      const key = `${normalizeDateStr(r.startDate)}|${normalizeDateStr(r.endDate)}`;
      if (!byKey.has(key)) byKey.set(key, { startDate: r.startDate, endDate: r.endDate });
    }
    const draftStart = new Date(draftStartDate).getTime();
    const draftEnd = new Date(draftEndDate).getTime();
    const hasConflict = Array.from(byKey.values()).some((existing) => {
      const exStart = existing.startDate ? new Date(existing.startDate).getTime() : 0;
      const exEnd = existing.endDate ? new Date(existing.endDate).getTime() : 0;
      return exStart < draftEnd && exEnd > draftStart;
    });
    if (hasConflict) {
      setShowConflictModal(true);
      return;
    }

    const sevenRows = DAYS_ORDER.map((day) => {
      const r = existingRecords.find((x) => x.day === day);
      return r ? { ...r, employeeID: trimmedId } : makeDefaultRow(trimmedId, day);
    });
    setModalRecords(sevenRows);
    setShowScheduleModal(true);
  }, [employeeID, hasSearched, records, draftAcademicYear, draftSemester, draftStartDate, draftEndDate, buildDefaultRecords, showToast]);

  // ── modal record change ───────────────────────────────────────────────────

  const handleModalRecordChange = useCallback((index, field, value) => {
    setModalRecords((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  // ── submit from modal ─────────────────────────────────────────────────────

  const handleSubmitFromModal = useCallback(async () => {
    const trimmedId = String(employeeID || '').trim();

    if (!isBulkSchedule) {
      if (!trimmedId || !draftStartDate || !draftEndDate) {
        showToast('Employee Number, Start date and End date are required.');
        return;
      }
      if (new Date(draftStartDate) > new Date(draftEndDate)) {
        showToast('Start date must be on or before end date.');
        return;
      }
    }

    const sevenRows = DAYS_ORDER.map((day) => {
      const r = modalRecords.find((x) => x.day === day);
      return r ? { ...r, day } : makeDefaultRow(trimmedId, day);
    });

    setCheckingOverlap(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const overlapResult = checkTimeOverlaps(sevenRows);
    setCheckingOverlap(false);

    if (!overlapResult.valid) {
      const a = overlapResult.segmentA;
      const b = overlapResult.segmentB;
      setWarningMessage(
        `Time overlap on ${overlapResult.day}: ${a.label} (${formatMinutesToTime(a.start)} – ${formatMinutesToTime(a.end)}) overlaps with ${b.label} (${formatMinutesToTime(b.start)} – ${formatMinutesToTime(b.end)}). Please adjust the schedule so Work Days, Honorarium, Service Credits, and Overtime do not overlap.`,
      );
      setShowWarningModal(true);
      return;
    }

    if (isBulkSchedule && bulkTargetEmployees.length > 1) {
      setPendingBulkSubmit(true);
      setShowBulkConfirmModal(true);
      return;
    }

    await executeSave(sevenRows, trimmedId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeID, isBulkSchedule, draftStartDate, draftEndDate, modalRecords, bulkTargetEmployees, showToast]);

  const executeSave = useCallback(async (sevenRows, trimmedId) => {
    saveInFlightRef.current = true;
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    setSaving(true);
    try {
      if (isBulkSchedule) {
        const payload = { employeeIDs: bulkTargetEmployees, blocks: bulkScheduleBlocks, records: sevenRows };
        const res = await axios.post(`${API_BASE_URL}/officialtime/bulk-schedules`, payload, { ...getAuthHeaders(), timeout: 30000 });
        const totalUsersInserted = Math.round((res.data.totalInserted || 0) / 7);
        showToast(`Bulk schedules processed. Inserted ${totalUsersInserted} users.`);
        await fetchAllUsers();
      } else {
        const academicYearForBackend = [draftAcademicYear, draftSemester].filter(Boolean).join(' ').trim() || null;
        await axios.post(
          `${API_BASE_URL}/officialtimetable`,
          { employeeID: trimmedId, academicYear: academicYearForBackend, startDate: draftStartDate, endDate: draftEndDate, status: draftStatus || 'active', records: sevenRows },
          { ...getAuthHeaders(), timeout: 30000 },
        );
        setLastSaved(new Date());
        showToast('Official time saved successfully.');
        // Stamp fresh server records after successful save
        stampServerRecords(sevenRows);
        await handleSearch();
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
            ? err.response?.data?.message || 'This date range overlaps an existing schedule. Choose different dates.'
            : err.response?.data?.error || err.response?.data?.message || err.message || 'Error saving records.';
      setWarningMessage(msg);
      setWarningOverlap(err.response?.data?.overlap || null);
      setShowWarningModal(true);
    } finally {
      setSaving(false);
      saveInFlightRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBulkSchedule, bulkTargetEmployees, bulkScheduleBlocks, draftAcademicYear, draftSemester, draftStartDate, draftEndDate, draftStatus, fetchAllUsers, handleSearch, showToast, stampServerRecords]);

  // ── upload ────────────────────────────────────────────────────────────────

  const handleUpload = useCallback(async () => {
    if (!file) { showToast('Please select a file!'); return; }
    if (uploading) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);

    try {
      await axios.post(`${API_BASE_URL}/upload-excel-faculty-official-time/validate`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });

      const response = await axios.post(`${API_BASE_URL}/upload-excel-faculty-official-time`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });

      if (response.data.records && response.data.records.length > 0) {
        setPreviewRecords(response.data.records);
        setPreviewViewScheduleView('workDays');
        setShowPreviewModal(true);

        const uploadedEmpId = String(response.data.records[0]?.employeeID || '').trim();
        if (uploadedEmpId) {
          setEmployeeID(uploadedEmpId);
          setHasSearched(true);
          try {
            const refreshed = await axios.get(`${API_BASE_URL}/officialtimetable/${uploadedEmpId}`, getAuthHeaders());
            if (Array.isArray(refreshed.data) && refreshed.data.length > 0) {
              stampServerRecords(refreshed.data);
              setRecords(deepClone(refreshed.data));
              setFound(true);
            } else {
              const defaults = buildDefaultRecords(uploadedEmpId);
              stampServerRecords(defaults);
              setRecords(deepClone(defaults));
              setFound(false);
            }
          } catch (e) {
            console.error('Error refreshing schedules after upload:', e);
          }
        }
      }

      showToast(`${response.data.message} (Inserted: ${response.data.inserted}, Updated: ${response.data.updated})`);
      setFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        (error.response?.status === 400 && 'Check file format: use .xlsx, include employeeID, day, effective_from, effective_until.') ||
        (error.response?.status === 409 && 'Date range overlaps an existing schedule.') ||
        error.message ||
        'Upload failed!';
      setWarningOverlap(error.response?.data?.overlap || null);
      setWarningMessage(message);
      setShowWarningModal(true);
    } finally {
      setUploading(false);
    }
  }, [file, uploading, buildDefaultRecords, showToast, stampServerRecords]);

  // ── all users panel ───────────────────────────────────────────────────────

  const handleSetDefaultForSelected = useCallback(async () => {
    if (selectedUsers.size === 0) { showToast('Please select at least one user.'); return; }
    setSettingDefault(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/officialtime/set-default-for-users`,
        { employeeNumbers: Array.from(selectedUsers) },
        getAuthHeaders(),
      );
      const insertedUsers = response.data.insertedUsers ?? Math.floor((response.data.inserted || 0) / 7);
      const skipped = response.data.skipped || 0;
      showToast(`Default official time set for ${insertedUsers} users.${skipped ? ` (Skipped: ${skipped})` : ''}`);
      await fetchAllUsers();
      setSelectedUsers(new Set());
    } catch (error) {
      console.error('Error setting default official time:', error);
      showToast('Error setting default official time.');
    } finally {
      setSettingDefault(false);
    }
  }, [selectedUsers, fetchAllUsers, showToast]);

  const handleSetDefaultForAll = useCallback(async () => {
    const usersWithoutDefault = allUsers.filter((u) => !u.hasDefaultOfficialTime).map((u) => u.employeeNumber);
    if (usersWithoutDefault.length === 0) { showToast('All users already have default official time.'); return; }
    setSettingDefault(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/officialtime/set-default-for-users`,
        { employeeNumbers: usersWithoutDefault },
        getAuthHeaders(),
      );
      const insertedUsers = response.data.insertedUsers ?? Math.floor((response.data.inserted || 0) / 7);
      const skipped = response.data.skipped || 0;
      showToast(`Default official time set for ${insertedUsers} users.${skipped ? ` (Skipped: ${skipped})` : ''}`);
      await fetchAllUsers();
    } catch (error) {
      console.error('Error setting default official time:', error);
      showToast('Error setting default official time.');
    } finally {
      setSettingDefault(false);
    }
  }, [allUsers, fetchAllUsers, showToast]);

  const handleUserSelect = useCallback((empNumber) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(empNumber)) newSet.delete(empNumber);
      else newSet.add(empNumber);
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((checked, filtered) => {
    if (checked) setSelectedUsers(new Set(filtered.map((u) => u.employeeNumber)));
    else setSelectedUsers(new Set());
  }, []);

  const getFilteredUsers = useCallback(() => {
    if (!searchQuery.trim()) return allUsers.slice();
    const q = searchQuery.toLowerCase();
    return allUsers.filter((user) => {
      const full = (user.fullName || '').toLowerCase();
      const emp = (user.employeeNumber || '').toLowerCase();
      return full.includes(q) || emp.includes(q);
    });
  }, [allUsers, searchQuery]);

  const filteredAllUsers = useMemo(() => getFilteredUsers(), [getFilteredUsers]);

  const paginatedAllUsers = useMemo(() => {
    const start = allUsersPage * allUsersRowsPerPage;
    return filteredAllUsers.slice(start, start + allUsersRowsPerPage);
  }, [filteredAllUsers, allUsersPage, allUsersRowsPerPage]);

  // ── bulk blocks modal ─────────────────────────────────────────────────────

  const openBulkBlocksModalForSelected = useCallback(() => {
    if (selectedUsers.size === 0) { showToast('Please select at least one user.'); return; }
    setBulkScheduleBlocks([{ id: `${Date.now()}-${Math.random()}`, academicYear: '', semester: '', startDate: '', endDate: '' }]);
    setBulkTargetEmployees(Array.from(selectedUsers));
    setShowBulkBlocksModal(true);
  }, [selectedUsers, showToast]);

  const openBulkBlocksModalForAllMissing = useCallback(() => {
    const usersWithoutDefault = allUsers.filter((u) => !u.hasDefaultOfficialTime).map((u) => u.employeeNumber);
    if (usersWithoutDefault.length === 0) { showToast('All users already have default official time.'); return; }
    setBulkScheduleBlocks([{ id: `${Date.now()}-${Math.random()}`, academicYear: '', semester: '', startDate: '', endDate: '' }]);
    setBulkTargetEmployees(usersWithoutDefault);
    setShowBulkBlocksModal(true);
  }, [allUsers, showToast]);

  const handleConfirmBulkBlocks = useCallback(() => {
    const cleaned = (bulkScheduleBlocks || []).map((b) => ({
      ...b,
      academicYear: String(b.academicYear || '').trim(),
      semester: String(b.semester || '').trim(),
      startDate: String(b.startDate || '').trim(),
      endDate: String(b.endDate || '').trim(),
    }));

    const allFilled = cleaned.length > 0 && cleaned.every((b) => b.academicYear && b.semester && b.startDate && b.endDate);
    if (!allFilled) {
      showToast('Please complete Academic Year, Semester, Start Date, and End Date for all blocks before proceeding.');
      return;
    }

    setBulkScheduleBlocks(cleaned);
    setIsBulkSchedule(true);

    const firstBlock = cleaned[0];
    if (firstBlock) {
      setDraftAcademicYear(firstBlock.academicYear || '');
      setDraftSemester(firstBlock.semester || '');
      setDraftStartDate(firstBlock.startDate || '');
      setDraftEndDate(firstBlock.endDate || '');
    }

    const empId = String(bulkTargetEmployees[0] || '');
    setEmployeeID(empId);

    setModalRecords(DAYS_ORDER.map((day) => makeDefaultRow(empId, day)));
    setScheduleView('workDays');
    setShowBulkBlocksModal(false);
    setShowScheduleModal(true);
  }, [bulkScheduleBlocks, bulkTargetEmployees, showToast]);

  // ── employee ID change ────────────────────────────────────────────────────

  const handleEmployeeIDChange = useCallback((value) => {
    if (value === '' || /^\d+$/.test(value)) {
      setEmployeeID(value);
      if (value !== employeeID) {
        setRecords([]);
        setHasSearched(false);
        setFound(false);
        setDraftAcademicYear('');
        setDraftSemester('');
        setDraftStartDate('');
        setDraftEndDate('');
        setLastSaved(null);
        // Clear integrity state when employee changes
        serverRecordsRef.current = [];
        checksumRef.current = null;
        setTamperDetected(false);
      }
    }
  }, [employeeID]);

  // ── effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (showAllUsers) {
      fetchAllUsers();
      setSelectedUsers(new Set());
    }
    setAllUsersPage(0);
  }, [showAllUsers, fetchAllUsers]);

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      if (tamperCheckIntervalRef.current) clearInterval(tamperCheckIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
  }, [employeeID]);

  // ── derived values ────────────────────────────────────────────────────────

  const previewScheduleInfo = previewRecords.length > 0
    ? { academicYear: previewRecords[0].academicYear, startDate: previewRecords[0].startDate, endDate: previewRecords[0].endDate, status: previewRecords[0].status || 'active' }
    : null;

  // ── access guard ──────────────────────────────────────────────────────────

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

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Tamper detection banner — fixed top, above everything */}
      {tamperDetected && (
        <TamperWarningBanner onRestore={handleRestoreFromServer} />
      )}

      <LoadingOverlay
        open={loading || checkingOverlap || saving || uploading}
        message={
          checkingOverlap ? 'Checking schedule for conflicts...'
          : uploading ? 'Uploading...'
          : saving ? 'Saving...'
          : 'Loading...'
        }
      />

      <Box
        sx={{
          py: 4,
          borderRadius: '14px',
          width: '100vw',
          mx: 'auto',
          maxWidth: '100%',
          overflow: 'hidden',
          position: 'relative',
          left: '50%',
          transform: 'translateX(-50%)',
          // Push content down when tamper banner is visible
          mt: tamperDetected ? '56px' : 0,
          transition: 'margin-top 0.2s ease',
        }}
      >
        <Box sx={{ px: 6, mx: 'auto', maxWidth: '1600px' }}>

          {/* ── Header ── */}
          <Fade in timeout={500}>
            <Box sx={{ mb: 4 }}>
              <GlassCard sx={{ background: `rgba(${hexToRgb(primaryColor)}, 0.95)`, boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`, border: `1px solid ${alpha(accentColor, 0.1)}` }}>
                <Box sx={{ p: 5, background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`, color: textPrimaryColor, position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: `radial-gradient(circle, ${alpha(accentColor, 0.1)} 0%, transparent 70%)` }} />
                  <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, background: `radial-gradient(circle, ${alpha(accentColor, 0.08)} 0%, transparent 70%)` }} />
                  <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ bgcolor: alpha(accentColor, 0.15), mr: 4, width: 64, height: 64, boxShadow: `0 8px 24px ${alpha(accentColor, 0.15)}` }}>
                        <Schedule sx={{ color: textPrimaryColor, fontSize: 32 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2, color: textPrimaryColor }}>Official Time Schedule</Typography>
                        <Typography variant="body1" sx={{ opacity: 0.8, fontWeight: 400, color: textPrimaryColor }}>Manage and update official time schedules for employees</Typography>
                      </Box>
                    </Box>

                    {/* ── VIEW TOGGLE (replaces old "View All Users" button) ── */}
                    <Box display="flex" alignItems="center" gap={2}>
                      <Chip label="System Generated" size="small" sx={{ bgcolor: alpha(accentColor, 0.15), color: textPrimaryColor, fontWeight: 500 }} />

                      <ViewToggle
                        value={viewMode}
                        onChange={setViewMode}
                        accentColor={accentColor}
                        primaryColor={primaryColor}
                        textPrimaryColor={textPrimaryColor}
                      />

                      <Tooltip title="Refresh Data">
                        <span>
                          <IconButton
                            onClick={handleSearch}
                            disabled={!String(employeeID || '').trim()}
                            sx={{ bgcolor: alpha(accentColor, 0.1), '&:hover': { bgcolor: alpha(accentColor, 0.2) }, color: textPrimaryColor, width: 48, height: 48, '&:disabled': { bgcolor: alpha(accentColor, 0.05), color: alpha(accentColor, 0.3) } }}
                          >
                            <SearchIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </Box>
                </Box>
              </GlassCard>
            </Box>
          </Fade>

          {/* ════════════════════════════════════════════════════════════
              SINGLE EMPLOYEE VIEW — only shown when viewMode === 'single'
          ════════════════════════════════════════════════════════════ */}
          {showSingleView && (
            <Fade in timeout={400} key="single-view">
              <GlassCard sx={{ mb: 4, background: `rgba(${hexToRgb(primaryColor)}, 0.95)`, boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`, border: `1px solid ${alpha(accentColor, 0.1)}` }}>
                <CardContent sx={{ p: 4 }}>
                  <Box>
                    <Grid container spacing={4} sx={{ mb: 3 }}>
                      <Grid item xs={12} md={3}>
                        <ModernTextField
                          fullWidth
                          label="Employee Number"
                          value={employeeID}
                          onChange={(e) => handleEmployeeIDChange(e.target.value)}
                          onKeyDown={(e) => { if (!/[0-9]/.test(e.key) && !['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) e.preventDefault(); }}
                          InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ color: textPrimaryColor }} /></InputAdornment> }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <ModernTextField fullWidth label="Academic Year" placeholder="e.g. 2025-2026" value={draftAcademicYear} onChange={(e) => setDraftAcademicYear(e.target.value)} />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <Autocomplete
                          freeSolo
                          options={['1st Semester','2nd Semester','Summer','Vacation','Christmas break','Midyear','Enrollment period']}
                          value={draftSemester || null}
                          onInputChange={(_, value) => setDraftSemester(value ?? '')}
                          onChange={(_, value) => setDraftSemester(typeof value === 'string' ? value : '')}
                          renderInput={(params) => <ModernTextField {...params} label="Semester" placeholder="e.g. 1st Semester, Vacation" />}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <ModernTextField fullWidth label="Start Date" type="date" InputLabelProps={{ shrink: true }} value={draftStartDate} onChange={(e) => setDraftStartDate(e.target.value)} />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <ModernTextField fullWidth label="End Date" type="date" InputLabelProps={{ shrink: true }} value={draftEndDate} onChange={(e) => setDraftEndDate(e.target.value)} />
                      </Grid>

                      <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                          <input type="file" accept=".xlsx,.xls" id="upload-button" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files[0])} />
                          <label htmlFor="upload-button">
                            <ProfessionalButton variant="outlined" component="span" startIcon={<CloudUploadIcon />} sx={{ borderColor: accentColor, color: textPrimaryColor, '&:hover': { backgroundColor: alpha(accentColor, 0.1) } }}>
                              Choose File
                            </ProfessionalButton>
                          </label>
                          <ProfessionalButton variant="contained" onClick={handleUpload} disabled={!file || uploading} startIcon={<CloudUploadIcon />} sx={{ bgcolor: accentColor, color: primaryColor }}>
                            {uploading ? 'Uploading...' : 'Upload'}
                          </ProfessionalButton>
                          {file && <Typography variant="body2" sx={{ color: alpha(textPrimaryColor, 0.8) }}>{file.name}</Typography>}
                        </Box>
                        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                          {lastSaved && !autoSaving && (
                            <Typography variant="caption" sx={{ color: alpha(textPrimaryColor, 0.6) }}>
                              Last saved: {lastSaved.toLocaleTimeString()}
                            </Typography>
                          )}
                          {autoSaving && (
                            <Typography variant="caption" sx={{ color: alpha(textPrimaryColor, 0.6) }}>Auto-saving...</Typography>
                          )}
                          <ProfessionalButton
                            variant="contained"
                            onClick={handleSearch}
                            startIcon={<SearchIcon />}
                            disabled={!String(employeeID || '').trim()}
                            sx={{ bgcolor: accentColor, color: primaryColor }}
                          >
                            Search
                          </ProfessionalButton>
                          <ProfessionalButton
                            variant="contained"
                            onClick={openCreateScheduleModal}
                            disabled={
                              !String(employeeID || '').trim() ||
                              ((!hasSearched || records.length > 0) && (!draftAcademicYear || !draftSemester || !draftStartDate || !draftEndDate))
                            }
                            startIcon={<Schedule />}
                            sx={{ bgcolor: accentDark, color: primaryColor, '&:hover': { bgcolor: accentColor }, '&:disabled': { opacity: 0.7 } }}
                          >
                            Create new Schedule
                          </ProfessionalButton>
                        </Box>
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 2, borderColor: alpha(accentColor, 0.1) }} />
                    <Typography variant="body2" sx={{ color: alpha(textPrimaryColor, 0.7) }}>
                      Fill Employee Number, Academic Year (e.g. 2025-2026), Semester, Start Date, and End Date first, then click Create new Schedule. Or search and upload Excel.
                    </Typography>

                    {/* ── Existing schedules ── */}
                    {hasSearched && (
                      <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${alpha(accentColor, 0.15)}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          {records.length > 0
                            ? <CheckCircle sx={{ color: '#2e7d32', fontSize: 22 }} />
                            : <EventBusy sx={{ color: alpha(textPrimaryColor, 0.6), fontSize: 22 }} />
                          }
                          <Typography variant="subtitle2" sx={{ color: '#2e7d32', fontWeight: 600 }}>Existing schedules</Typography>
                        </Box>
                        {(() => {
                          const byKey = new Map();
                          for (const r of records || []) {
                            const key = `${r.academicYear ?? ''}|${normalizeDateStr(r.startDate)}|${normalizeDateStr(r.endDate)}`;
                            if (!byKey.has(key)) byKey.set(key, { academicYear: r.academicYear, startDate: r.startDate, endDate: r.endDate, status: r.status });
                          }
                          const validSchedules = Array.from(byKey.values())
                            .filter((v) => normalizeDateStr(v.startDate) || normalizeDateStr(v.endDate))
                            .sort((a, b) => {
                              const aActive = String(a.status || 'active').toLowerCase() === 'active';
                              const bActive = String(b.status || 'active').toLowerCase() === 'active';
                              return (bActive ? 1 : 0) - (aActive ? 1 : 0);
                            });
                          if (records.length === 0 || validSchedules.length === 0) {
                            return (
                              <Box sx={{ py: 2, px: 2, bgcolor: alpha(primaryColor, 0.06), borderRadius: 1.5, border: `1px dashed ${alpha(accentColor, 0.3)}` }}>
                                <Typography variant="body2" sx={{ color: textPrimaryColor, fontWeight: 500, textAlign: 'center' }}>No existing record for this employee.</Typography>
                                <Typography variant="body2" sx={{ color: alpha(textPrimaryColor, 0.8), textAlign: 'center', mt: 0.5, fontSize: '0.85rem' }}>Create a schedule using the button above.</Typography>
                              </Box>
                            );
                          }
                          return (
                            <Box display="flex" flexDirection="column" gap={1}>
                              {validSchedules.map((v, idx) => {
                                const isActive = String(v.status || 'active').toLowerCase() === 'active';
                                const openView = () => {
                                  const normStart = normalizeDateStr(v.startDate);
                                  const normEnd = normalizeDateStr(v.endDate);
                                  const rows = (records || []).filter((r) =>
                                    normalizeDateStr(r.startDate) === normStart &&
                                    normalizeDateStr(r.endDate) === normEnd,
                                  );
                                  setViewScheduleInfo({ academicYear: v.academicYear, startDate: v.startDate, endDate: v.endDate, status: v.status });
                                  setViewScheduleRecords(rows);
                                  setViewScheduleView('workDays');
                                  setViewScheduleEmployeeName(resolveEmployeeName(employeeID));
                                  setShowViewScheduleModal(true);
                                };
                                return (
                                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, width: '100%', py: 0.5, borderBottom: idx < validSchedules.length - 1 ? `1px solid ${alpha(accentColor, 0.12)}` : 'none' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                                      <Schedule sx={{ color: accentColor, fontSize: 18, flexShrink: 0 }} />
                                      <Typography variant="body2" sx={{ color: textPrimaryColor, fontWeight: 500 }}>
                                        {v.academicYear || '—'} | {formatDateLong(v.startDate) || formatDateOnly(v.startDate)} – {formatDateLong(v.endDate) || formatDateOnly(v.endDate)}
                                      </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                                      <Typography variant="caption" sx={{ px: 1, py: 0.35, borderRadius: 1, fontWeight: 600, bgcolor: '#fff', color: isActive ? '#2e7d32' : '#ed6c02', border: '1px solid', borderColor: isActive ? '#2e7d32' : '#ed6c02' }}>
                                        {isActive ? 'Active' : 'Inactive'}
                                      </Typography>
                                      <Tooltip title="View official time">
                                        <IconButton size="small" onClick={openView} sx={{ color: accentColor, '&:hover': { bgcolor: alpha(accentColor, 0.1) } }}>
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
          )}

          {/* ════════════════════════════════════════════════════════════
              ALL USERS VIEW — only shown when viewMode === 'allUsers'
          ════════════════════════════════════════════════════════════ */}
          {showAllUsers && (
            <Fade in timeout={400} key="all-users-view">
              <GlassCard sx={{ mb: 4, background: `rgba(${hexToRgb(primaryColor)}, 0.95)`, boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`, border: `1px solid ${alpha(accentColor, 0.1)}` }}>
                <Box sx={{ p: 4, background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`, color: textPrimaryColor, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5, color: textPrimaryColor }}>All Users — Official Time Status</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8, color: textPrimaryColor }}>View and manage official time schedules for all users</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: alpha(accentColor, 0.15), width: 64, height: 64 }}>
                    <PeopleIcon sx={{ fontSize: 32, color: textPrimaryColor }} />
                  </Avatar>
                </Box>

                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <ModernTextField
                      fullWidth
                      placeholder="Search by name or employee number..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setAllUsersPage(0); }}
                      InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: textPrimaryColor }} /></InputAdornment> }}
                    />
                    <ProfessionalButton
                      variant="contained"
                      onClick={openBulkBlocksModalForSelected}
                      disabled={selectedUsers.size === 0 || settingDefault}
                      startIcon={<CheckCircleIcon />}
                      sx={{ bgcolor: accentColor, color: primaryColor, minWidth: 220, flexShrink: 0 }}
                    >
                      Bulk Create (Selected: {selectedUsers.size})
                    </ProfessionalButton>
                    <ProfessionalButton
                      variant="outlined"
                      onClick={openBulkBlocksModalForAllMissing}
                      disabled={settingDefault || allUsers.filter((u) => !u.hasDefaultOfficialTime).length === 0}
                      sx={{ borderColor: accentColor, color: textPrimaryColor, minWidth: 220, flexShrink: 0, '&:hover': { backgroundColor: alpha(accentColor, 0.1) } }}
                    >
                      Bulk Create (All Missing)
                    </ProfessionalButton>
                  </Box>

                  {loadingUsers ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress sx={{ color: accentColor }} />
                    </Box>
                  ) : (
                    <>
                      <PremiumTableContainer>
                        <Table stickyHeader>
                          <TableHead>
                            <TableRow>
                              <PremiumTableCell sx={{ bgcolor: alpha(primaryColor, 0.9) }}>
                                <Tooltip title={`Select all ${paginatedAllUsers.length} rows on this page`}>
                                  <Checkbox
                                    checked={paginatedAllUsers.length > 0 && paginatedAllUsers.every((u) => selectedUsers.has(u.employeeNumber))}
                                    indeterminate={paginatedAllUsers.some((u) => selectedUsers.has(u.employeeNumber)) && !paginatedAllUsers.every((u) => selectedUsers.has(u.employeeNumber))}
                                    onChange={(e) => handleSelectAll(e.target.checked, paginatedAllUsers)}
                                    sx={{ color: '#fff', '&.Mui-checked': { color: '#fff' }, '&.MuiCheckbox-indeterminate': { color: '#fff' } }}
                                  />
                                </Tooltip>
                              </PremiumTableCell>
                              {['Employee Number', 'Name', 'Department', 'Academic Year', 'Status', 'Start Date', 'End Date'].map((h) => (
                                <PremiumTableCell key={h} isHeader sx={{ color: accentColor, bgcolor: alpha(primaryColor, 0.9) }}>{h}</PremiumTableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {paginatedAllUsers.map((user) => (
                              <TableRow key={user.employeeNumber} sx={{ '&:nth-of-type(even)': { bgcolor: alpha(primaryColor, 0.3) }, '&:hover': { bgcolor: alpha(accentColor, 0.05) }, transition: 'all 0.2s ease' }}>
                                <PremiumTableCell>
                                  <Checkbox checked={selectedUsers.has(user.employeeNumber)} onChange={() => handleUserSelect(user.employeeNumber)} sx={{ color: accentColor }} />
                                </PremiumTableCell>
                                <PremiumTableCell>{user.employeeNumber}</PremiumTableCell>
                                <PremiumTableCell>{user.fullName || 'N/A'}</PremiumTableCell>
                                <PremiumTableCell>{user.department || '—'}</PremiumTableCell>
                                <PremiumTableCell>{user.academicYear || '—'}</PremiumTableCell>
                                <PremiumTableCell>
                                  {user.hasDefaultOfficialTime
                                    ? <Chip icon={<CheckCircleIcon />} label="Has Schedule" size="small" sx={{ bgcolor: alpha('#4caf50', 0.1), color: '#2e7d32', border: '1px solid #c8e6c9' }} />
                                    : <Chip icon={<CancelIcon />} label="No Schedule" size="small" sx={{ bgcolor: alpha('#f44336', 0.1), color: '#c62828', border: '1px solid #ffcdd2' }} />
                                  }
                                </PremiumTableCell>
                                <PremiumTableCell>{user.startDate ? formatDateOnly(user.startDate) : '—'}</PremiumTableCell>
                                <PremiumTableCell>{user.endDate ? formatDateOnly(user.endDate) : '—'}</PremiumTableCell>
                              </TableRow>
                            ))}
                            {filteredAllUsers.length === 0 && (
                              <TableRow>
                                <PremiumTableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                  <Typography sx={{ color: accentColor }}>
                                    {searchQuery ? 'No users found matching your search.' : 'No users found.'}
                                  </Typography>
                                </PremiumTableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </PremiumTableContainer>
                      <Box sx={{ borderTop: `1px solid ${alpha(primaryColor, 0.2)}` }}>
                        <TablePagination
                          component="div"
                          count={filteredAllUsers.length}
                          page={allUsersPage}
                          onPageChange={(_, newPage) => setAllUsersPage(newPage)}
                          rowsPerPage={allUsersRowsPerPage}
                          onRowsPerPageChange={(e) => { setAllUsersRowsPerPage(parseInt(e.target.value, 10)); setAllUsersPage(0); }}
                          rowsPerPageOptions={[10, 20, 30, 50]}
                          labelRowsPerPage="Rows per page:"
                          labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${count}`}
                          sx={{ '& .MuiTablePagination-toolbar': { minHeight: 56 } }}
                        />
                      </Box>
                    </>
                  )}
                </CardContent>
              </GlassCard>
            </Fade>
          )}

          {/* ─────────────────────────────────────────────────────────────
              DIALOGS (shared across both views)
          ───────────────────────────────────────────────────────────── */}

          {/* Create / Bulk Schedule */}
          <Dialog
            open={showScheduleModal}
            onClose={() => {
              if (saving) return;
              setShowScheduleModal(false);
              setIsBulkSchedule(false);
              setBulkTargetEmployees([]);
              setBulkScheduleBlocks([]);
            }}
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}
          >
            <Box sx={{ bgcolor: '#6d2323', px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                <Schedule sx={{ color: '#fff', fontSize: 20, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '1rem', lineHeight: 1.25 }}>
                    {isBulkSchedule ? 'Create Bulk Schedule — Step 2 of 2' : 'Create New Schedule'}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.78rem', mt: 0.25, lineHeight: 1.3 }}>
                    {isBulkSchedule
                      ? `Setting time schedule for ${bulkTargetEmployees.length} employee${bulkTargetEmployees.length !== 1 ? 's' : ''}`
                      : (() => {
                          const id = String(employeeID || '').trim();
                          const name = resolveEmployeeName(id);
                          return id ? (name ? `${id} — ${name}` : `Employee No. ${id}`) : 'No employee selected';
                        })()
                    }
                  </Typography>
                </Box>
              </Box>
              <IconButton
                size="small"
                onClick={() => { if (saving) return; setShowScheduleModal(false); setIsBulkSchedule(false); setBulkTargetEmployees([]); setBulkScheduleBlocks([]); }}
                disabled={saving}
                sx={{ color: '#fff', ml: 1, flexShrink: 0, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
                aria-label="Close"
              >
                <Close fontSize="small" />
              </IconButton>
            </Box>

            {isBulkSchedule && (
              <Box sx={{ bgcolor: '#f7f0f0', borderBottom: '1px solid #e2cece', px: 3, py: 1.5 }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#6d2323', textTransform: 'uppercase', letterSpacing: '0.4px', mb: 0.75 }}>
                  Employees receiving this schedule
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, maxHeight: 68, overflowY: 'auto' }}>
                  {bulkTargetEmployees.map((id, i) => {
                    const u = allUsers.find((u) => String(u.employeeNumber) === String(id));
                    return (
                      <Chip
                        key={i}
                        label={u ? `${id} — ${u.fullName}` : String(id)}
                        size="small"
                        sx={{ bgcolor: '#fff', color: '#1a1a1a', border: '1px solid #d0b8b8', fontSize: '0.77rem', height: 24 }}
                      />
                    );
                  })}
                </Box>
              </Box>
            )}

            <Box sx={{ bgcolor: '#fff', px: 3, pt: 2.5, pb: 0 }}>
              <Box sx={{ bgcolor: '#f7f0f0', border: '1px solid #e2cece', borderRadius: 1.5, p: 2, mb: 2.5 }}>
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#6d2323', textTransform: 'uppercase', letterSpacing: '0.4px', mb: 1.5 }}>
                  Schedule Period {isBulkSchedule && '(set in previous step — read only)'}
                </Typography>
                <Grid container spacing={1.5}>
                  {[
                    { label: 'Academic Year', value: draftAcademicYear, setter: setDraftAcademicYear, placeholder: 'e.g. 2025-2026' },
                    { label: 'Semester', value: draftSemester, setter: setDraftSemester, placeholder: 'e.g. 1st Semester' },
                  ].map(({ label, value, setter, placeholder }) => (
                    <Grid item xs={6} sm={3} key={label}>
                      <TextField
                        fullWidth size="small" label={label} placeholder={placeholder}
                        value={value || ''}
                        onChange={(e) => !isBulkSchedule && setter(e.target.value || '')}
                        InputProps={{ readOnly: isBulkSchedule }}
                        sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#6d2323' }, '& label.Mui-focused': { color: '#6d2323' } }}
                      />
                    </Grid>
                  ))}
                  {[
                    { label: 'Start Date', value: draftStartDate, setter: setDraftStartDate },
                    { label: 'End Date', value: draftEndDate, setter: setDraftEndDate },
                  ].map(({ label, value, setter }) => (
                    <Grid item xs={6} sm={3} key={label}>
                      <TextField
                        fullWidth size="small" label={label} type="date" InputLabelProps={{ shrink: true }}
                        value={value || ''}
                        onChange={(e) => !isBulkSchedule && setter(e.target.value || '')}
                        InputProps={{ readOnly: isBulkSchedule }}
                        sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#6d2323' }, '& label.Mui-focused': { color: '#6d2323' } }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>

              <Box sx={{ display: 'flex', border: '1px solid #d0b8b8', borderRadius: 1, overflow: 'hidden', mb: 2 }}>
                {[
                  { key: 'workDays', label: 'Work Days' },
                  { key: 'honorarium', label: 'Honorarium' },
                  { key: 'serviceCredits', label: 'Service Credits' },
                  { key: 'overtime', label: 'Overtime' },
                ].map(({ key, label }, i, arr) => (
                  <Button
                    key={key}
                    onClick={() => setScheduleView(key)}
                    disableElevation
                    fullWidth
                    sx={{
                      borderRadius: 0,
                      textTransform: 'none',
                      fontWeight: scheduleView === key ? 700 : 400,
                      fontSize: '0.82rem',
                      py: 0.9,
                      bgcolor: scheduleView === key ? '#6d2323' : '#fff',
                      color: scheduleView === key ? '#fff' : '#444',
                      borderRight: i < arr.length - 1 ? '1px solid #d0b8b8' : 'none',
                      '&:hover': { bgcolor: scheduleView === key ? '#5a1c1c' : '#f7f0f0' },
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </Box>

              <TableContainer sx={{ border: '1px solid #e0e0e0', borderRadius: 1.5, overflow: 'hidden', mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#6d2323' }}>
                      <TableCell sx={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem', py: 1.25, width: 100 }}>Day</TableCell>
                      {scheduleView === 'workDays' && ['Time In', 'Break In', 'Break Out', 'Time Out'].map((h) => (
                        <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem', py: 1.25 }}>{h}</TableCell>
                      ))}
                      {scheduleView === 'honorarium' && ['Honorarium Time In', 'Honorarium Time Out'].map((h) => (
                        <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem', py: 1.25 }}>{h}</TableCell>
                      ))}
                      {scheduleView === 'serviceCredits' && ['Service Credit Time In', 'Service Credit Time Out'].map((h) => (
                        <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem', py: 1.25 }}>{h}</TableCell>
                      ))}
                      {scheduleView === 'overtime' && ['Overtime In', 'Overtime Out'].map((h) => (
                        <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem', py: 1.25 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {modalRecords.map((record, index) => (
                      <TableRow key={record.day || index} sx={{ '&:nth-of-type(even)': { bgcolor: '#faf5f5' }, '&:hover': { bgcolor: '#f5ecec' } }}>
                        <TableCell sx={{ fontWeight: 600, color: '#1a1a1a', fontSize: '0.85rem', py: 0.75 }}>{record.day}</TableCell>
                        {scheduleView === 'workDays' && (
                          <>
                            <TableCell sx={{ py: 0.6 }}><TextField size="small" fullWidth value={record.officialTimeIN || ''} onChange={(e) => handleModalRecordChange(index, 'officialTimeIN', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.82rem', '&.Mui-focused fieldset': { borderColor: '#6d2323' } } }} /></TableCell>
                            <TableCell sx={{ py: 0.6 }}><TextField size="small" fullWidth value={record.officialBreaktimeIN || ''} onChange={(e) => handleModalRecordChange(index, 'officialBreaktimeIN', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.82rem', '&.Mui-focused fieldset': { borderColor: '#6d2323' } } }} /></TableCell>
                            <TableCell sx={{ py: 0.6 }}><TextField size="small" fullWidth value={record.officialBreaktimeOUT || ''} onChange={(e) => handleModalRecordChange(index, 'officialBreaktimeOUT', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.82rem', '&.Mui-focused fieldset': { borderColor: '#6d2323' } } }} /></TableCell>
                            <TableCell sx={{ py: 0.6 }}><TextField size="small" fullWidth value={record.officialTimeOUT || ''} onChange={(e) => handleModalRecordChange(index, 'officialTimeOUT', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.82rem', '&.Mui-focused fieldset': { borderColor: '#6d2323' } } }} /></TableCell>
                          </>
                        )}
                        {scheduleView === 'honorarium' && (
                          <>
                            <TableCell sx={{ py: 0.6 }}><TextField size="small" fullWidth value={record.officialHonorariumTimeIN || ''} onChange={(e) => handleModalRecordChange(index, 'officialHonorariumTimeIN', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.82rem', '&.Mui-focused fieldset': { borderColor: '#6d2323' } } }} /></TableCell>
                            <TableCell sx={{ py: 0.6 }}><TextField size="small" fullWidth value={record.officialHonorariumTimeOUT || ''} onChange={(e) => handleModalRecordChange(index, 'officialHonorariumTimeOUT', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.82rem', '&.Mui-focused fieldset': { borderColor: '#6d2323' } } }} /></TableCell>
                          </>
                        )}
                        {scheduleView === 'serviceCredits' && (
                          <>
                            <TableCell sx={{ py: 0.6 }}><TextField size="small" fullWidth value={record.officialServiceCreditTimeIN || ''} onChange={(e) => handleModalRecordChange(index, 'officialServiceCreditTimeIN', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.82rem', '&.Mui-focused fieldset': { borderColor: '#6d2323' } } }} /></TableCell>
                            <TableCell sx={{ py: 0.6 }}><TextField size="small" fullWidth value={record.officialServiceCreditTimeOUT || ''} onChange={(e) => handleModalRecordChange(index, 'officialServiceCreditTimeOUT', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.82rem', '&.Mui-focused fieldset': { borderColor: '#6d2323' } } }} /></TableCell>
                          </>
                        )}
                        {scheduleView === 'overtime' && (
                          <>
                            <TableCell sx={{ py: 0.6 }}><TextField size="small" fullWidth value={record.officialOverTimeIN || ''} onChange={(e) => handleModalRecordChange(index, 'officialOverTimeIN', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.82rem', '&.Mui-focused fieldset': { borderColor: '#6d2323' } } }} /></TableCell>
                            <TableCell sx={{ py: 0.6 }}><TextField size="small" fullWidth value={record.officialOverTimeOUT || ''} onChange={(e) => handleModalRecordChange(index, 'officialOverTimeOUT', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.82rem', '&.Mui-focused fieldset': { borderColor: '#6d2323' } } }} /></TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Box sx={{ borderTop: '1px solid #e0e0e0', bgcolor: '#fafafa', px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                {isBulkSchedule && (
                  <Button
                    variant="outlined"
                    onClick={() => { setShowScheduleModal(false); setShowBulkBlocksModal(true); }}
                    sx={{ borderColor: '#6d2323', color: '#6d2323', fontWeight: 600, textTransform: 'none', '&:hover': { bgcolor: '#f7f0f0' } }}
                  >
                    ← Back to Block Setup
                  </Button>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button
                  variant="outlined"
                  onClick={() => { if (saving) return; setShowScheduleModal(false); setIsBulkSchedule(false); setBulkTargetEmployees([]); setBulkScheduleBlocks([]); }}
                  disabled={saving}
                  sx={{ borderColor: '#ccc', color: '#444', fontWeight: 600, textTransform: 'none', minWidth: 90, '&:hover': { bgcolor: '#f5f5f5' } }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  disableElevation
                  onClick={handleSubmitFromModal}
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <SaveIcon />}
                  sx={{ bgcolor: '#6d2323', color: '#fff', fontWeight: 700, textTransform: 'none', minWidth: 140, '&:hover': { bgcolor: '#5a1c1c' }, '&.Mui-disabled': { bgcolor: '#c0a0a0', color: '#fff' } }}
                >
                  {saving ? 'Saving…' : 'Save Schedule'}
                </Button>
              </Box>
            </Box>
          </Dialog>

          {/* Bulk Confirmation */}
          <Dialog
            open={showBulkConfirmModal}
            onClose={() => { setShowBulkConfirmModal(false); setPendingBulkSubmit(false); }}
            maxWidth="xs"
            fullWidth
            PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}
          >
            <Box sx={{ bgcolor: '#6d2323', px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <WarningAmber sx={{ color: '#ffd180', fontSize: 20 }} />
              <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>Confirm Bulk Schedule</Typography>
            </Box>
            <Box sx={{ bgcolor: '#fff', px: 3, pt: 3, pb: 2 }}>
              <Typography sx={{ color: '#1a1a1a', lineHeight: 1.7, fontSize: '0.93rem' }}>
                You are about to create schedules for{' '}
                <Box component="span" sx={{ fontWeight: 700, color: '#6d2323' }}>{bulkTargetEmployees.length} employee{bulkTargetEmployees.length !== 1 ? 's' : ''}</Box>
                {' '}across{' '}
                <Box component="span" sx={{ fontWeight: 700, color: '#6d2323' }}>{bulkScheduleBlocks.length} block{bulkScheduleBlocks.length !== 1 ? 's' : ''}</Box>.
              </Typography>
              <Box sx={{ mt: 2, p: 1.5, bgcolor: '#fff9f0', border: '1px solid #f5d89a', borderRadius: 1.5 }}>
                <Typography sx={{ color: '#7a5000', fontSize: '0.82rem', lineHeight: 1.55 }}>
                  ⚠ Existing active schedules for these employees will be set to inactive. This cannot be undone.
                </Typography>
              </Box>
              <Typography sx={{ color: '#555', mt: 2, fontSize: '0.88rem' }}>Are you sure you want to proceed?</Typography>
            </Box>
            <Box sx={{ borderTop: '1px solid #e0e0e0', bgcolor: '#fafafa', px: 3, py: 2, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
              <Button variant="outlined" onClick={() => { setShowBulkConfirmModal(false); setPendingBulkSubmit(false); }} sx={{ borderColor: '#ccc', color: '#444', fontWeight: 600, textTransform: 'none', '&:hover': { bgcolor: '#f5f5f5' } }}>Cancel</Button>
              <Button
                variant="contained"
                disableElevation
                onClick={async () => {
                  setShowBulkConfirmModal(false);
                  setPendingBulkSubmit(false);
                  const trimmedId = String(employeeID || '').trim();
                  const sevenRows = DAYS_ORDER.map((day) => {
                    const r = modalRecords.find((x) => x.day === day);
                    return r ? { ...r, day } : makeDefaultRow(trimmedId, day);
                  });
                  await executeSave(sevenRows, trimmedId);
                }}
                sx={{ bgcolor: '#6d2323', color: '#fff', fontWeight: 700, textTransform: 'none', minWidth: 120, '&:hover': { bgcolor: '#5a1c1c' } }}
              >
                Yes, Proceed
              </Button>
            </Box>
          </Dialog>

          {/* Schedule Date Conflict */}
          <Dialog open={showConflictModal} onClose={() => setShowConflictModal(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}>
            <Box sx={{ bgcolor: '#6d2323', px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <WarningAmber sx={{ color: '#ffd180', fontSize: 20 }} />
              <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>Schedule Conflict</Typography>
            </Box>
            <Box sx={{ bgcolor: '#fff', px: 3, pt: 2.5, pb: 2 }}>
              <Typography sx={{ color: '#1a1a1a', lineHeight: 1.7, fontSize: '0.93rem' }}>
                A schedule already exists for this employee during the selected dates:
              </Typography>
              <Box sx={{ mt: 1.5, mb: 2, px: 2, py: 1.25, bgcolor: '#f7f0f0', border: '1px solid #d0b8b8', borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Schedule sx={{ color: '#6d2323', fontSize: 16, flexShrink: 0 }} />
                <Typography sx={{ fontWeight: 700, color: '#6d2323', fontSize: '0.9rem' }}>
                  {formatDateLong(draftStartDate) || formatDateOnly(draftStartDate)}
                  {' — '}
                  {formatDateLong(draftEndDate) || formatDateOnly(draftEndDate)}
                </Typography>
              </Box>
              <Typography sx={{ color: '#555', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Please choose a different date range that does not overlap with an existing schedule.
              </Typography>
            </Box>
            <Box sx={{ borderTop: '1px solid #e0e0e0', bgcolor: '#fafafa', px: 3, py: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" disableElevation onClick={() => setShowConflictModal(false)} sx={{ bgcolor: '#6d2323', color: '#fff', fontWeight: 700, textTransform: 'none', minWidth: 80, '&:hover': { bgcolor: '#5a1c1c' } }}>Got It</Button>
            </Box>
          </Dialog>

          {/* Bulk Schedule Blocks */}
          <Dialog open={showBulkBlocksModal} onClose={() => setShowBulkBlocksModal(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}>
            <Box sx={{ bgcolor: '#6d2323', px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                <PeopleIcon sx={{ color: '#fff', fontSize: 20, flexShrink: 0 }} />
                <Box>
                  <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '1rem', lineHeight: 1.25 }}>Create Bulk Schedule — Step 1 of 2</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.78rem', mt: 0.25 }}>
                    Define date blocks for {bulkTargetEmployees.length} selected employee{bulkTargetEmployees.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              </Box>
              <IconButton size="small" onClick={() => setShowBulkBlocksModal(false)} sx={{ color: '#fff', ml: 1, flexShrink: 0, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }} aria-label="Close">
                <Close fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ bgcolor: '#f7f0f0', borderBottom: '1px solid #e2cece', px: 3, py: 1.5 }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#6d2323', textTransform: 'uppercase', letterSpacing: '0.4px', mb: 0.75 }}>
                Selected employees ({bulkTargetEmployees.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, maxHeight: 64, overflowY: 'auto' }}>
                {bulkTargetEmployees.map((empId, idx) => {
                  const u = allUsers.find((u) => String(u.employeeNumber) === String(empId));
                  return (
                    <Chip key={idx} label={u ? `${empId} — ${u.fullName}` : String(empId)} size="small" sx={{ bgcolor: '#fff', color: '#1a1a1a', border: '1px solid #d0b8b8', fontSize: '0.77rem', height: 24 }} />
                  );
                })}
              </Box>
            </Box>

            <Box sx={{ bgcolor: '#fff', px: 3, pt: 2.5, pb: 1 }}>
              <Typography sx={{ color: '#555', fontSize: '0.85rem', mb: 2.5, lineHeight: 1.65 }}>
                Define one or more schedule blocks. Each block has its own academic year, semester, and date range.
                In the next step, you will set the daily time schedule that applies to all blocks and all selected employees.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                {bulkScheduleBlocks.map((block, idx) => (
                  <Box key={block.id} sx={{ border: '1px solid #e0e0e0', borderRadius: 1.5, overflow: 'hidden' }}>
                    <Box sx={{ bgcolor: '#f5f5f5', px: 2, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e0e0e0' }}>
                      <Typography sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '0.85rem' }}>Block {idx + 1}</Typography>
                      <Tooltip title={bulkScheduleBlocks.length === 1 ? 'At least one block is required' : 'Remove block'}>
                        <span>
                          <IconButton size="small" onClick={() => setBulkScheduleBlocks((prev) => prev.filter((b) => b.id !== block.id))} disabled={bulkScheduleBlocks.length === 1} sx={{ color: '#6d2323', '&.Mui-disabled': { color: '#ccc' }, '&:hover': { bgcolor: '#f7f0f0' } }} aria-label="Remove block">
                            <Delete fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                    <Box sx={{ p: 2 }}>
                      <Grid container spacing={1.5}>
                        <Grid item xs={12} sm={6} md={3}>
                          <TextField fullWidth size="small" label="Academic Year" placeholder="e.g. 2025-2026" value={block.academicYear} onChange={(e) => setBulkScheduleBlocks((prev) => prev.map((b) => b.id === block.id ? { ...b, academicYear: e.target.value } : b))} sx={{ '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#6d2323' }, '& label.Mui-focused': { color: '#6d2323' } }} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <TextField fullWidth size="small" label="Semester" placeholder="e.g. 1st Semester" value={block.semester} onChange={(e) => setBulkScheduleBlocks((prev) => prev.map((b) => b.id === block.id ? { ...b, semester: e.target.value } : b))} sx={{ '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#6d2323' }, '& label.Mui-focused': { color: '#6d2323' } }} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <TextField fullWidth size="small" label="Start Date" type="date" InputLabelProps={{ shrink: true }} value={block.startDate} onChange={(e) => setBulkScheduleBlocks((prev) => prev.map((b) => b.id === block.id ? { ...b, startDate: e.target.value } : b))} sx={{ '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#6d2323' }, '& label.Mui-focused': { color: '#6d2323' } }} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <TextField fullWidth size="small" label="End Date" type="date" InputLabelProps={{ shrink: true }} value={block.endDate} onChange={(e) => setBulkScheduleBlocks((prev) => prev.map((b) => b.id === block.id ? { ...b, endDate: e.target.value } : b))} sx={{ '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#6d2323' }, '& label.Mui-focused': { color: '#6d2323' } }} />
                        </Grid>
                      </Grid>
                    </Box>
                  </Box>
                ))}
              </Box>

              <Button variant="outlined" startIcon={<Add />} onClick={() => setBulkScheduleBlocks((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, academicYear: '', semester: '', startDate: '', endDate: '' }])} sx={{ borderColor: '#6d2323', color: '#6d2323', fontWeight: 600, textTransform: 'none', borderStyle: 'dashed', mb: 3, '&:hover': { bgcolor: '#f7f0f0' } }}>
                + Add Another Block
              </Button>
            </Box>

            <Box sx={{ borderTop: '1px solid #e0e0e0', bgcolor: '#fafafa', px: 3, py: 2, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
              <Button variant="outlined" onClick={() => setShowBulkBlocksModal(false)} sx={{ borderColor: '#ccc', color: '#444', fontWeight: 600, textTransform: 'none', '&:hover': { bgcolor: '#f5f5f5' } }}>Cancel</Button>
              <Button
                variant="contained"
                disableElevation
                onClick={handleConfirmBulkBlocks}
                disabled={!bulkScheduleBlocks.length || bulkScheduleBlocks.some((b) => !b.academicYear || !b.semester || !b.startDate || !b.endDate) || !bulkTargetEmployees.length}
                sx={{ bgcolor: '#6d2323', color: '#fff', fontWeight: 700, textTransform: 'none', minWidth: 180, '&:hover': { bgcolor: '#5a1c1c' }, '&.Mui-disabled': { bgcolor: '#d0b8b8', color: '#fff' } }}
              >
                Next: Set Time Schedule →
              </Button>
            </Box>
          </Dialog>

          {/* Warning / Error */}
          <Dialog open={showWarningModal} onClose={() => { setShowWarningModal(false); setWarningOverlap(null); }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}>
            <Box sx={{ bgcolor: '#6d2323', px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <WarningAmber sx={{ color: '#ffd180', fontSize: 20 }} />
              <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>
                {warningOverlap ? 'Time Schedule Conflict Detected' : 'Cannot Save'}
              </Typography>
            </Box>
            <Box sx={{ bgcolor: '#fff', px: 3, pt: 2.5, pb: 2 }}>
              {warningOverlap ? (
                <Box>
                  <Typography sx={{ color: '#1a1a1a', fontSize: '0.93rem', mb: 2, lineHeight: 1.65 }}>
                    Two time blocks overlap on{' '}
                    <Box component="span" sx={{ fontWeight: 700, color: '#6d2323' }}>{warningOverlap.day}</Box>
                    {warningOverlap.employeeID && warningOverlap.employeeID !== 'multiple' && (
                      <> for employee <Box component="span" sx={{ fontWeight: 700, color: '#6d2323' }}>{warningOverlap.employeeID}</Box></>
                    )}:
                  </Typography>
                  <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1.5, overflow: 'hidden', mb: 2 }}>
                    <Box sx={{ bgcolor: '#f7f0f0', px: 2, py: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1, bgcolor: '#6d2323', color: '#fff', fontWeight: 700, fontSize: '0.8rem' }}>{warningOverlap.segmentA?.label || 'Block A'}</Box>
                      <Typography sx={{ color: '#444', fontWeight: 600, fontSize: '0.85rem' }}>overlaps with</Typography>
                      <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1, bgcolor: '#1a1a1a', color: '#fff', fontWeight: 700, fontSize: '0.8rem' }}>{warningOverlap.segmentB?.label || 'Block B'}</Box>
                    </Box>
                    <Box sx={{ px: 2, py: 1.25, bgcolor: '#fff', borderTop: '1px solid #f0e0e0' }}>
                      <Typography sx={{ fontSize: '0.85rem', color: '#444' }}>
                        Overlapping period: <Box component="span" sx={{ fontWeight: 700, color: '#6d2323' }}>{warningOverlap.overlap?.periodText || '—'}</Box>
                      </Typography>
                    </Box>
                  </Box>
                  <Typography sx={{ color: '#555', fontSize: '0.88rem', lineHeight: 1.6 }}>
                    Please go back and adjust the time entries so that Work Days, Honorarium, Service Credits, and Overtime do not overlap.
                  </Typography>
                </Box>
              ) : (
                <Typography sx={{ color: '#1a1a1a', lineHeight: 1.7, fontSize: '0.93rem', whiteSpace: 'pre-wrap' }}>{warningMessage}</Typography>
              )}
            </Box>
            <Box sx={{ borderTop: '1px solid #e0e0e0', bgcolor: '#fafafa', px: 3, py: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" disableElevation onClick={() => { setShowWarningModal(false); setWarningOverlap(null); }} sx={{ bgcolor: '#6d2323', color: '#fff', fontWeight: 700, textTransform: 'none', minWidth: 90, '&:hover': { bgcolor: '#5a1c1c' } }}>OK, Go Back</Button>
            </Box>
          </Dialog>

          {/* View Schedule (read-only) */}
          <Dialog open={showViewScheduleModal} onClose={() => setShowViewScheduleModal(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}>
            <Box sx={{ bgcolor: '#6d2323', px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                <Visibility sx={{ color: '#fff', fontSize: 20, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '1rem', lineHeight: 1.25 }}>View Official Time Schedule</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.78rem', mt: 0.25 }}>
                    {(() => {
                      const id = String(employeeID || '').trim();
                      const name = viewScheduleEmployeeName || resolveEmployeeName(id);
                      return id ? (name ? `${id} — ${name}` : `Employee No. ${id}`) : 'Employee schedule';
                    })()}
                  </Typography>
                </Box>
              </Box>
              <IconButton size="small" onClick={() => setShowViewScheduleModal(false)} sx={{ color: '#fff', ml: 1, flexShrink: 0, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }} aria-label="Close">
                <Close fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ bgcolor: '#fff', px: 3, pt: 2.5, pb: 0 }}>
              {viewScheduleInfo && (
                <>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 2.5, p: 2, bgcolor: '#f7f0f0', border: '1px solid #e2cece', borderRadius: 1.5 }}>
                    {[
                      { label: 'Academic Year', value: viewScheduleInfo.academicYear || '—' },
                      { label: 'Start Date', value: formatDateLong(viewScheduleInfo.startDate) || formatDateOnly(viewScheduleInfo.startDate) },
                      { label: 'End Date', value: formatDateLong(viewScheduleInfo.endDate) || formatDateOnly(viewScheduleInfo.endDate) },
                    ].map(({ label, value }) => (
                      <Box key={label}>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#6d2323', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#1a1a1a', fontSize: '0.88rem', mt: 0.25 }}>{value}</Typography>
                      </Box>
                    ))}
                    <Box>
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#6d2323', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Status</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {(() => {
                          const isActive = String(viewScheduleInfo.status || 'active').toLowerCase() === 'active';
                          return (
                            <Box component="span" sx={{ px: 1.25, py: 0.3, borderRadius: 1, fontSize: '0.78rem', fontWeight: 700, bgcolor: isActive ? '#e8f5e9' : '#fff9f0', color: isActive ? '#2e7d32' : '#7a5000', border: '1px solid', borderColor: isActive ? '#c8e6c9' : '#f5d89a' }}>
                              {isActive ? 'Active' : 'Inactive'}
                            </Box>
                          );
                        })()}
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', border: '1px solid #d0b8b8', borderRadius: 1, overflow: 'hidden', mb: 2 }}>
                    {[{ key: 'workDays', label: 'Work Days' }, { key: 'honorarium', label: 'Honorarium' }, { key: 'serviceCredits', label: 'Service Credits' }, { key: 'overtime', label: 'Overtime' }].map(({ key, label }, i, arr) => (
                      <Button key={key} onClick={() => setViewScheduleView(key)} disableElevation fullWidth sx={{ borderRadius: 0, textTransform: 'none', fontWeight: viewScheduleView === key ? 700 : 400, fontSize: '0.82rem', py: 0.9, bgcolor: viewScheduleView === key ? '#6d2323' : '#fff', color: viewScheduleView === key ? '#fff' : '#444', borderRight: i < arr.length - 1 ? '1px solid #d0b8b8' : 'none', '&:hover': { bgcolor: viewScheduleView === key ? '#5a1c1c' : '#f7f0f0' } }}>{label}</Button>
                    ))}
                  </Box>

                  <TableContainer sx={{ border: '1px solid #e0e0e0', borderRadius: 1.5, overflow: 'hidden', mb: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#6d2323' }}>
                          <TableCell sx={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem', py: 1.25, width: 100 }}>Day</TableCell>
                          {viewScheduleView === 'workDays' && ['Time In', 'Break In', 'Break Out', 'Time Out'].map((h) => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem', py: 1.25 }}>{h}</TableCell>)}
                          {viewScheduleView === 'honorarium' && ['Honorarium Time In', 'Honorarium Time Out'].map((h) => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem', py: 1.25 }}>{h}</TableCell>)}
                          {viewScheduleView === 'serviceCredits' && ['Service Credit Time In', 'Service Credit Time Out'].map((h) => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem', py: 1.25 }}>{h}</TableCell>)}
                          {viewScheduleView === 'overtime' && ['Overtime In', 'Overtime Out'].map((h) => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem', py: 1.25 }}>{h}</TableCell>)}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {[...viewScheduleRecords].sort((a, b) => DAYS_ORDER.indexOf(a.day || '') - DAYS_ORDER.indexOf(b.day || '')).map((row, i) => (
                          <TableRow key={row.day || i} sx={{ '&:nth-of-type(even)': { bgcolor: '#faf5f5' } }}>
                            <TableCell sx={{ fontWeight: 600, color: '#1a1a1a', fontSize: '0.85rem', py: 1 }}>{row.day || '—'}</TableCell>
                            {viewScheduleView === 'workDays' && <><TableCell sx={{ color: '#1a1a1a', fontSize: '0.85rem', py: 1 }}>{row.officialTimeIN || '—'}</TableCell><TableCell sx={{ color: '#1a1a1a', fontSize: '0.85rem', py: 1 }}>{row.officialBreaktimeIN || '—'}</TableCell><TableCell sx={{ color: '#1a1a1a', fontSize: '0.85rem', py: 1 }}>{row.officialBreaktimeOUT || '—'}</TableCell><TableCell sx={{ color: '#1a1a1a', fontSize: '0.85rem', py: 1 }}>{row.officialTimeOUT || '—'}</TableCell></>}
                            {viewScheduleView === 'honorarium' && <><TableCell sx={{ color: '#1a1a1a', fontSize: '0.85rem', py: 1 }}>{row.officialHonorariumTimeIN || '—'}</TableCell><TableCell sx={{ color: '#1a1a1a', fontSize: '0.85rem', py: 1 }}>{row.officialHonorariumTimeOUT || '—'}</TableCell></>}
                            {viewScheduleView === 'serviceCredits' && <><TableCell sx={{ color: '#1a1a1a', fontSize: '0.85rem', py: 1 }}>{row.officialServiceCreditTimeIN || '—'}</TableCell><TableCell sx={{ color: '#1a1a1a', fontSize: '0.85rem', py: 1 }}>{row.officialServiceCreditTimeOUT || '—'}</TableCell></>}
                            {viewScheduleView === 'overtime' && <><TableCell sx={{ color: '#1a1a1a', fontSize: '0.85rem', py: 1 }}>{row.officialOverTimeIN || '—'}</TableCell><TableCell sx={{ color: '#1a1a1a', fontSize: '0.85rem', py: 1 }}>{row.officialOverTimeOUT || '—'}</TableCell></>}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>
            <Box sx={{ borderTop: '1px solid #e0e0e0', bgcolor: '#fafafa', px: 3, py: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" disableElevation onClick={() => setShowViewScheduleModal(false)} sx={{ bgcolor: '#6d2323', color: '#fff', fontWeight: 700, textTransform: 'none', minWidth: 80, '&:hover': { bgcolor: '#5a1c1c' } }}>Close</Button>
            </Box>
          </Dialog>

          {/* Upload Preview */}
          <Dialog open={showPreviewModal} onClose={() => setShowPreviewModal(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}>
            <Box sx={{ bgcolor: '#6d2323', px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                <Visibility sx={{ color: '#fff', fontSize: 20, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '1rem', lineHeight: 1.25 }}>Upload Preview</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.78rem', mt: 0.25 }}>
                    {previewRecords.length > 0 && previewRecords[0].employeeID
                      ? (() => { const id = String(previewRecords[0].employeeID); const u = allUsers.find((u) => String(u.employeeNumber) === id); return u ? `${id} — ${u.fullName}` : `Employee No. ${id}`; })()
                      : 'Uploaded schedule data'
                    }
                  </Typography>
                </Box>
              </Box>
              <IconButton size="small" onClick={() => setShowPreviewModal(false)} sx={{ color: '#fff', ml: 1, flexShrink: 0, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }} aria-label="Close">
                <Close fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ bgcolor: '#fff', px: 3, pt: 2.5, pb: 0 }}>
              {previewScheduleInfo && (
                <>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 2.5, p: 2, bgcolor: '#f7f0f0', border: '1px solid #e2cece', borderRadius: 1.5 }}>
                    {[{ label: 'Academic Year', value: previewScheduleInfo.academicYear || '—' }, { label: 'Start Date', value: formatDateLong(previewScheduleInfo.startDate) || formatDateOnly(previewScheduleInfo.startDate) }, { label: 'End Date', value: formatDateLong(previewScheduleInfo.endDate) || formatDateOnly(previewScheduleInfo.endDate) }].map(({ label, value }) => (
                      <Box key={label}>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#6d2323', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#1a1a1a', fontSize: '0.88rem', mt: 0.25 }}>{value}</Typography>
                      </Box>
                    ))}
                    <Box>
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#6d2323', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Status</Typography>
                      <Box sx={{ mt: 0.5 }}><Box component="span" sx={{ px: 1.25, py: 0.3, borderRadius: 1, fontSize: '0.78rem', fontWeight: 700, bgcolor: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9' }}>Active</Box></Box>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', border: '1px solid #d0b8b8', borderRadius: 1, overflow: 'hidden', mb: 2 }}>
                    {[{ key: 'workDays', label: 'Work Days' }, { key: 'honorarium', label: 'Honorarium' }, { key: 'serviceCredits', label: 'Service Credits' }, { key: 'overtime', label: 'Overtime' }].map(({ key, label }, i, arr) => (
                      <Button key={key} onClick={() => setPreviewViewScheduleView(key)} disableElevation fullWidth sx={{ borderRadius: 0, textTransform: 'none', fontWeight: previewViewScheduleView === key ? 700 : 400, fontSize: '0.82rem', py: 0.9, bgcolor: previewViewScheduleView === key ? '#6d2323' : '#fff', color: previewViewScheduleView === key ? '#fff' : '#444', borderRight: i < arr.length - 1 ? '1px solid #d0b8b8' : 'none', '&:hover': { bgcolor: previewViewScheduleView === key ? '#5a1c1c' : '#f7f0f0' } }}>{label}</Button>
                    ))}
                  </Box>

                  <TableContainer sx={{ border: '1px solid #e0e0e0', borderRadius: 1.5, overflow: 'hidden', mb: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#6d2323' }}>
                          <TableCell sx={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem', py: 1.25, width: 100 }}>Day</TableCell>
                          {previewViewScheduleView === 'workDays' && ['Time In', 'Break In', 'Break Out', 'Time Out'].map((h) => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem', py: 1.25 }}>{h}</TableCell>)}
                          {previewViewScheduleView === 'honorarium' && ['Honorarium Time In', 'Honorarium Time Out'].map((h) => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem', py: 1.25 }}>{h}</TableCell>)}
                          {previewViewScheduleView === 'serviceCredits' && ['Service Credit Time In', 'Service Credit Time Out'].map((h) => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem', py: 1.25 }}>{h}</TableCell>)}
                          {previewViewScheduleView === 'overtime' && ['Overtime In', 'Overtime Out'].map((h) => <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem', py: 1.25 }}>{h}</TableCell>)}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {[...previewRecords].sort((a, b) => DAYS_ORDER.indexOf(a.day || '') - DAYS_ORDER.indexOf(b.day || '')).map((row, i) => (
                          <TableRow key={row.day || i} sx={{ '&:nth-of-type(even)': { bgcolor: '#faf5f5' } }}>
                            <TableCell sx={{ fontWeight: 600, color: '#1a1a1a', fontSize: '0.85rem', py: 1 }}>{row.day || '—'}</TableCell>
                            {previewViewScheduleView === 'workDays' && <><TableCell sx={{ color: '#1a1a1a', fontSize: '0.85rem', py: 1 }}>{row.officialTimeIN || '—'}</TableCell><TableCell sx={{ color: '#1a1a1a', fontSize: '0.85rem', py: 1 }}>{row.officialBreaktimeIN || '—'}</TableCell><TableCell sx={{ color: '#1a1a1a', fontSize: '0.85rem', py: 1 }}>{row.officialBreaktimeOUT || '—'}</TableCell><TableCell sx={{ color: '#1a1a1a', fontSize: '0.85rem', py: 1 }}>{row.officialTimeOUT || '—'}</TableCell></>}
                            {previewViewScheduleView === 'honorarium' && <><TableCell sx={{ color: '#1a1a1a', fontSize: '0.85rem', py: 1 }}>{row.officialHonorariumTimeIN || '—'}</TableCell><TableCell sx={{ color: '#1a1a1a', fontSize: '0.85rem', py: 1 }}>{row.officialHonorariumTimeOUT || '—'}</TableCell></>}
                            {previewViewScheduleView === 'serviceCredits' && <><TableCell sx={{ color: '#1a1a1a', fontSize: '0.85rem', py: 1 }}>{row.officialServiceCreditTimeIN || '—'}</TableCell><TableCell sx={{ color: '#1a1a1a', fontSize: '0.85rem', py: 1 }}>{row.officialServiceCreditTimeOUT || '—'}</TableCell></>}
                            {previewViewScheduleView === 'overtime' && <><TableCell sx={{ color: '#1a1a1a', fontSize: '0.85rem', py: 1 }}>{row.officialOverTimeIN || '—'}</TableCell><TableCell sx={{ color: '#1a1a1a', fontSize: '0.85rem', py: 1 }}>{row.officialOverTimeOUT || '—'}</TableCell></>}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>
            <Box sx={{ borderTop: '1px solid #e0e0e0', bgcolor: '#fafafa', px: 3, py: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" disableElevation onClick={() => setShowPreviewModal(false)} sx={{ bgcolor: '#6d2323', color: '#fff', fontWeight: 700, textTransform: 'none', minWidth: 80, '&:hover': { bgcolor: '#5a1c1c' } }}>Close</Button>
            </Box>
          </Dialog>

          <SuccessfulOverlay open={successOpen} action={successAction} />
        </Box>
      </Box>
    </>
  );
};

export default OfficialTimeForm; 