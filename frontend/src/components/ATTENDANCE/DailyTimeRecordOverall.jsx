import API_BASE_URL from '../../apiConfig';
import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import {
  AccessTime,
  CalendarToday,
  SearchOutlined,
  ArrowBack,
  ArrowForward,
  Close,
  Refresh,
  Edit,
  Schedule,
  Assignment,
} from '@mui/icons-material';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { Stack, Divider, Grid } from '@mui/material';
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Dialog,
  DialogContent,
  Drawer,
  Fade,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
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
  List,
  ListItemButton,
  Typography,
  Avatar,
  CircularProgress,
} from '@mui/material';
import { Male as MaleIcon, Female as FemaleIcon } from '@mui/icons-material';
import { DeptBadge, EmpCatBadge } from '../LEAVE/EARNINGS/RecordsList';
import earistLogo from '../../assets/earistLogo.png';
import hrisLogo from '../../assets/hrisLogo.png';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { alpha } from '@mui/material/styles';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import usePageAccess from '../../hooks/usePageAccess';
import {
  buildAuditPeriodLabel,
  employeeDisplayName,
  logDtrOverallSearch,
  logAttendanceModuleAction,
  ATTENDANCE_AUDIT_MODULES,
} from '../../utils/moduleEmployeeSearchAudit';
import AccessDenied from '../AccessDenied';
import {
  AttendanceFilterHeader,
  AttendanceFilterSectionLabel,
  AttendanceFilterDateControls,
  AttendanceFilterToggleRow,
  applyQuickDateRange,
  filterPanelScrollSx,
  filterSidebarCardSx,
  attendanceMainPanelHeightSx,
  ATTENDANCE_COMPACT_PAGE_SX,
  MONTHS_SHORT,
  AttendanceEmployeeSearchSection,
  useAttendanceCompactPage,
} from './attendanceFilterLayout';
import AttendanceEmployeeSearchField from './AttendanceEmployeeSearchField';
import LoadingOverlay from '../LoadingOverlay';
import useAttendanceWorkflow from '../../hooks/useAttendanceWorkflow';
import AttendanceWorkflowNav from './AttendanceWorkflowNav';
import AttendanceModification from './AttendanceModification';
import OfficialTimeForm from './OfficialTimeForm';
import DtrSavedSummaryPanel from './DtrSavedSummaryPanel';
import AttendanceComputationDrawer from './AttendanceComputationDrawer';
import { readAttendanceWorkflow } from '../../utils/attendanceWorkflow';
import {
  resolveDrawerFromComputationModule,
  HUB_COMPUTATION_BUTTONS,
} from '../../utils/attendanceHubFlow';
import {
  fetchDailyLateUndertime,
  fetchDailyLateUndertimeBatch,
  formatLateUndertimeDisplay,
  resolveDtrLateUndertimeDisplay,
  isDtrDateScheduledByOfficialTime,
  isDtrHalfDayLateUndertimePending,
  parseHalfDayDatesSet,
  getDayNameFromYmd,
} from '../../utils/dtrLateUndertimeFromOverall';
import { fetchOfficialTimesBatch } from '../../utils/fetchOfficialTimesBatch';
import { computeAndApplyModuleLateUndertime } from '../../utils/computeModuleLateUndertimeForDtr';
import {
  buildReviewByDate,
  parseHalfDayReviewJson,
  MODULE_TYPES,
  getRowHalfDayUiStatus,
  getDtrHalfDayIndicator,
  getDtrAbsentIndicator,
  isDtrAbsentRow,
  resolveDtrRowIndicator,
  resolveDtrRowTint,
} from '../../utils/halfDayReview';
import {
  DTR_WIDTH_IN,
  DTR_WM_INLINE_STYLE,
  DTR_NON_WORKING_DAY_LABEL,
  DTR_ABSENT_LABEL,
  dtrTimeValueEmpty,
  isDtrCellWatermarkText,
  isDtrNonWorkingDayRow,
  getDtrUnscheduledWeekdayBanner,
  resolveDtrAmPmCellText,
  formatDtrPdfFileName,
  formatDtrBulkPdfFileName,
  openPdfBlobForPrint,
  formatDtrLeaveLabel,
  findApprovedLeaveForDate,
  isDtrCalendarBannerRow,
} from '../../utils/dtrFormatHelpers';
const COMPUTATION_DRAWER_KEYS = new Set([
  'nonTeaching',
  'faculty30',
  'facultyDesignated',
]);

const isHubDrawerOpen = (drawer) =>
  drawer === 'modification' ||
  drawer === 'officialTime' ||
  COMPUTATION_DRAWER_KEYS.has(drawer);

// ─── Theme tokens ──────────────────────────────────────────────────────────
const T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  accentMid: '#8B4545',
  accentFaint: 'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover: 'rgba(109,35,35,0.10)',
  headerGrad: 'linear-gradient(180deg,#6d2323 0%,#7e2c2c 100%)',
  rowEven: '#ffffff',
  rowOdd: 'rgba(109,35,35,0.025)',
  rowHover: 'rgba(109,35,35,0.055)',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#a0a0a0',
  surface: '#ffffff',
  divider: 'rgba(0,0,0,0.08)',
};

const EMPLOYMENT_CATEGORY_OPTIONS = [
  { value: 0, label: 'JO Graduate', color: '#F57C00' },
  { value: 1, label: 'JO UnderGrad', color: '#E64A19' },
  { value: 2, label: 'Regular Non-Teaching', color: '#2E7D32' },
  { value: 3, label: 'Regular Teaching (30Hrs)', color: '#1565C0' },
  { value: 4, label: 'Regular Designated (40Hrs)', color: '#7B1FA2' },
  { value: 5, label: 'Other', color: '#00796B' },
];

// ─── Official-time helpers (ported from DailyTimeRecord) ──────────────────
const REGULAR_WEEKDAY_KEYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
];
const REGULAR_DAY_ABBREV = {
  Monday: 'M',
  Tuesday: 'T',
  Wednesday: 'W',
  Thursday: 'Th',
  Friday: 'F',
};

const formatOfficialClock = (timeString, formatTimeFn) => {
  const s = formatTimeFn(timeString || '');
  if (!s) return '';
  const m = s.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (m) {
    const h = String(parseInt(m[1], 10)).padStart(2, '0');
    return `${h}:${m[2]} ${m[3].toUpperCase()}`;
  }
  return s;
};

const buildOfficialTwoSegment = (sched, formatTimeFn) => {
  if (!sched) return '';
  const tIn = formatOfficialClock(sched.officialTimeIN, formatTimeFn);
  const brOut = formatOfficialClock(sched.officialBreaktimeOUT, formatTimeFn);
  const brIn = formatOfficialClock(sched.officialBreaktimeIN, formatTimeFn);
  const tOut = formatOfficialClock(sched.officialTimeOUT, formatTimeFn);
  if (tIn && brOut && brIn && tOut)
    return `${tIn} to ${brOut} : ${brIn} to ${tOut}`;
  if (tIn && tOut) return `${tIn} to ${tOut}`;
  return '';
};

const formatRegularDayRangeLabel = (startDay, endDay) => {
  const a = REGULAR_DAY_ABBREV[startDay];
  const b = REGULAR_DAY_ABBREV[endDay];
  if (!a || !b) return '';
  if (startDay === endDay) return a;
  return `${a} - ${b}`;
};

const buildRegularDaysOfficialLines = (officialTimesMap, formatTimeFn) => {
  const lines = [];
  let runStart = -1,
    runEnd = -1,
    runSeg = '';
  const flush = () => {
    if (runStart < 0) return;
    const label = formatRegularDayRangeLabel(
      REGULAR_WEEKDAY_KEYS[runStart],
      REGULAR_WEEKDAY_KEYS[runEnd],
    );
    if (label && runSeg) lines.push(`${label} ${runSeg}`);
    runStart = -1;
  };
  for (let i = 0; i < REGULAR_WEEKDAY_KEYS.length; i++) {
    const day = REGULAR_WEEKDAY_KEYS[i];
    const seg = buildOfficialTwoSegment(officialTimesMap[day], formatTimeFn);
    if (!seg) {
      flush();
      continue;
    }
    if (runStart < 0) {
      runStart = i;
      runEnd = i;
      runSeg = seg;
    } else if (seg === runSeg && runEnd === i - 1) {
      runEnd = i;
    } else {
      flush();
      runStart = i;
      runEnd = i;
      runSeg = seg;
    }
  }
  flush();
  return lines;
};

// ─── Styled components ────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: T.surface,
});

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.875rem',
  letterSpacing: '0.01em',
  transition: 'all 0.18s ease',
  '&:hover': { transform: 'translateY(-1px)' },
  '&:active': { transform: 'translateY(0)' },
});

const FieldInput = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8,
    fontSize: '0.875rem',
    backgroundColor: '#fff',
    '& fieldset': { borderColor: T.accentBorder },
    '&:hover fieldset': { borderColor: T.accent },
    '&.Mui-focused fieldset': { borderColor: T.accent, borderWidth: 1.5 },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: T.accent },
});

const FormSectionLabel = ({ icon: Icon, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
    <Icon sx={{ fontSize: 12, color: alpha(T.accent, 0.45) }} />
    <Typography
      sx={{
        fontSize: '0.68rem',
        fontWeight: 700,
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        color: alpha(T.accent, 0.45),
      }}
    >
      {children}
    </Typography>
  </Box>
);

const getEmployeeIdentifier = (emp) => {
  if (!emp || typeof emp !== 'object') return '';
  const raw =
    emp.personID ?? emp.PersonID ?? emp.employeeNum ??
    emp.employeeNumber ?? emp.agencyEmployeeNum ?? '';
  return String(raw).trim();
};

const toProfileEmployee = (emp) => {
  if (!emp) return null;
  const num = getEmployeeIdentifier(emp);
  return { ...emp, employeeNumber: num };
};

const buildDisplayName = (e) => {
  const last = (e?.lastName || '').trim();
  const first = (e?.firstName || '').trim();
  const mid = (e?.middleName || '').trim();
  if (!last && !first) {
    const raw = String(e?.name || e?.fullName || '').trim();
    if (!raw) {
      const num = getEmployeeIdentifier(e);
      return num ? `#${num}` : '';
    }
    if (raw.includes(',')) return raw;
    return raw;
  }
  return last
    ? `${last.toUpperCase()}, ${[first, mid].filter(Boolean).join(' ')}`
    : [first, mid].filter(Boolean).join(' ');
};

const getEmployeeInitials = (e) => {
  const last = e?.lastName?.[0];
  const first = e?.firstName?.[0];
  if (last || first) {
    return `${last || ''}${first || ''}`.toUpperCase() || '?';
  }
  const nm = String(e?.name || e?.fullName || '').trim();
  if (!nm) return '?';
  const parts = nm.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return nm[0]?.toUpperCase() || '?';
};

const GenderBadge = ({ gender }) => {
  if (!gender) return null;
  const isMale = String(gender).trim().toLowerCase() === 'male';
  return (
    <Chip
      size="small"
      icon={
        isMale ? (
          <MaleIcon style={{ fontSize: 11, color: '#1565C0' }} />
        ) : (
          <FemaleIcon style={{ fontSize: 11, color: '#c2185b' }} />
        )
      }
      label={gender}
      sx={{
        height: 18,
        fontSize: '0.6rem',
        fontWeight: 800,
        letterSpacing: 0.3,
        bgcolor: isMale ? 'rgba(21,101,192,0.08)' : 'rgba(194,24,91,0.08)',
        color: isMale ? '#1565C0' : '#c2185b',
        border: `1px solid ${isMale ? 'rgba(21,101,192,0.25)' : 'rgba(194,24,91,0.25)'}`,
        borderRadius: '4px',
      }}
    />
  );
};

const EmployeeProfileRow = ({
  employee,
  deptMap = {},
  empCatMap = {},
  sexMap = {},
  avatarSize = 30,
}) => {
  if (!employee) return null;
  const num = getEmployeeIdentifier(employee);
  const initials = getEmployeeInitials(employee);
  const name = buildDisplayName(employee);
  const dc = deptMap[num];
  const ec = empCatMap[num];
  const gender = sexMap[num] || employee.sex || employee.gender;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
      <Avatar
        sx={{
          width: avatarSize,
          height: avatarSize,
          bgcolor: T.accent,
          fontSize: avatarSize <= 30 ? '0.65rem' : '0.8rem',
          fontWeight: 800,
          borderRadius: avatarSize <= 30 ? '4px' : '8px',
          flexShrink: 0,
        }}
      >
        {initials}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: avatarSize <= 30 ? '0.78rem' : '0.84rem',
            color: T.text,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mt: 0.2 }}>
          <Typography sx={{ fontSize: '0.68rem', color: T.muted, fontWeight: 600 }}>
            #{num}
          </Typography>
          {gender && <GenderBadge gender={gender} />}
          {dc && <DeptBadge code={dc} />}
          {ec && <EmpCatBadge label={ec.label} colorHex={ec.colorHex} />}
        </Box>
      </Box>
    </Box>
  );
};

const EmployeeProfileCard = ({
  employee,
  deptMap = {},
  empCatMap = {},
  sexMap = {},
  loading = false,
}) => {
  if (!employee) return null;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        px: 1.25,
        py: 1,
        borderRadius: 2,
        border: `1px solid ${T.accentBorder}`,
        bgcolor: '#fafafa',
      }}
    >
      <EmployeeProfileRow
        employee={employee}
        deptMap={deptMap}
        empCatMap={empCatMap}
        sexMap={sexMap}
        avatarSize={44}
      />
      {loading && (
        <CircularProgress size={14} sx={{ color: T.accent, flexShrink: 0 }} />
      )}
    </Box>
  );
};

const scrollbarSx = {
  '&::-webkit-scrollbar': { width: 4 },
  '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
  '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
};

const selectSx = {
  borderRadius: '8px',
  fontSize: '0.82rem',
  bgcolor: '#fff',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accent },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: T.accent,
    borderWidth: '1.5px',
  },
};

const generateHash = (data) => {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).toUpperCase();
};

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

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

/** Employees per attendance API request (by employeeNumbers — no SQL re-rank). */
const ATTENDANCE_CHUNK = 60;
/** Parallel attendance chunk requests while hydrating the table. */
const ATTENDANCE_CONCURRENCY = 6;

/** YYYY-MM-DD as a Philippines calendar day */
const toPhCalendarYmd = (value) => {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
  }
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const y = parts.find((p) => p.type === 'year')?.value;
    const mo = parts.find((p) => p.type === 'month')?.value;
    const da = parts.find((p) => p.type === 'day')?.value;
    if (y && mo && da) return `${y}-${mo}-${da}`;
  } catch {
    /* ignore */
  }
  return s.split('T')[0];
};

const normRecordYmd = (dateVal) => toPhCalendarYmd(dateVal);

const recordMatchesDay = (record, dayPadded) => {
  const ymd = normRecordYmd(record?.date);
  if (!ymd || dayPadded.length !== 2) return false;
  return ymd.endsWith(`-${dayPadded}`);
};

// ─── Main Component ────────────────────────────────────────────────────────
const DailyTimeRecordFaculty = ({
  pageAccessIdentifier = 'daily-time-record-faculty',
  accessDeniedMessage = 'You do not have permission to access Daily Time Record.',
  accessDeniedReturnPath = '/admin-home',
} = {}) => {
  const location = useLocation();
  const { socket, connected } = useSocket();
  const { settings } = useSystemSettings();

  const [personID, setPersonID] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [records, setRecords] = useState([]);
  const [employeeName, setEmployeeName] = useState('');
  const [officialTimes, setOfficialTimes] = useState({});
  const [batchOfficialTimesMap, setBatchOfficialTimesMap] = useState({});
  const [computedLateByEmployee, setComputedLateByEmployee] = useState({});
  const [halfDayDatesByEmployee, setHalfDayDatesByEmployee] = useState({});
  const [halfDayReviewByEmployee, setHalfDayReviewByEmployee] = useState({});
  const [computationModuleTypeByEmployee, setComputationModuleTypeByEmployee] =
    useState({});
  const [showOfficialTimeOnDtr, setShowOfficialTimeOnDtr] = useState(false);
  const dtrRef = useRef(null);

  const fetchRecordsRef = useRef(null);
  const fetchAllUsersDTRRef = useRef(null);

  const [allUsersDTR, setAllUsersDTR] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const batchSearchTrimmed = useMemo(() => searchQuery.trim(), [searchQuery]);
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);
  const bulkDTRRefs = useRef({});
  const [loadPhase, setLoadPhase] = useState('');

  const [originalRecords, setOriginalRecords] = useState([]);
  const [recordsHash, setRecordsHash] = useState('');
  const [fetchedAt, setFetchedAt] = useState(null);
  const [integrityStatus, setIntegrityStatus] = useState('none');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  const observerRef = useRef(null);
  const restoreTimerRef = useRef(null);
  const originalRecordsRef = useRef([]);
  const isRestoringRef = useRef(false);
  const formatTimeRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const [holidays, setHolidays] = useState([]);
  const [suspensions, setSuspensions] = useState([]);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [previewUsers, setPreviewUsers] = useState([]);
  /** Only one off-screen DTR at a time for capture (avoids mounting N tables on Bulk Print). */
  const [captureUser, setCaptureUser] = useState(null);
  const [printingAll, setPrintingAll] = useState(false);
  const [printingStatus, setPrintingStatus] = useState('');

  const [viewMode, setViewMode] = useState('single');
  const [recordFilter, setRecordFilter] = useState('all');
  const [dtrType, setDtrType] = useState('regular');
  const [monthLoading, setMonthLoading] = useState(false);

  const [printStatusFilter, setPrintStatusFilter] = useState('all');
  const [printStatusMap, setPrintStatusMap] = useState(new Map());

  const [alertModal, setAlertModal] = useState({
    open: false,
    title: '',
    message: '',
  });
  const [confirmModal, setConfirmModal] = useState({ open: false, user: null });
  const showAlert = (title, message) =>
    setAlertModal({ open: true, title, message });
  const closeAlert = () =>
    setAlertModal({ open: false, title: '', message: '' });
  const showReprintConfirm = (user) => setConfirmModal({ open: true, user });
  const closeConfirm = () => setConfirmModal({ open: false, user: null });

  const [departmentFilter, setDepartmentFilter] = useState('');
  const [employmentCategoryFilter, setEmploymentCategoryFilter] = useState('');
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState('');
  const [departments, setDepartments] = useState([]);
  const [approvedLeaves, setApprovedLeaves] = useState([]);

  const [singlePrintLoading, setSinglePrintLoading] = useState(false);
  const [singlePrintStatus, setSinglePrintStatus] = useState('');
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);
  const [departmentAssignmentsMap, setDepartmentAssignmentsMap] = useState({});
  const [empCatMap, setEmpCatMap] = useState({});
  const [sexMap, setSexMap] = useState({});

  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasSearchedSingle, setHasSearchedSingle] = useState(false);
  /** Sliding hub drawer: officialTime | modification | computation modules */
  const [moduleDrawer, setModuleDrawer] = useState(null);
  /** Last opened computation module — kept after drawer closes so Save to Summary stays enabled */
  const [activeComputationDrawer, setActiveComputationDrawer] = useState(null);
  const [lateComputeLoading, setLateComputeLoading] = useState(null);
  const [computationSaveSignal, setComputationSaveSignal] = useState(0);
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);
  /** Bumped after Attendance Modification saves so computation modules remount + refetch. */
  const [attendanceRevision, setAttendanceRevision] = useState(0);

  const { hasAccess, loading: accessLoading } = usePageAccess(pageAccessIdentifier);

  useEffect(() => {
    if (accessLoading || hasAccess === false) return;
    let cancelled = false;
    (async () => {
      try {
        const [assignRes, empCatRes, personsRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/api/department-assignment`, getAuthHeaders()),
          axios.get(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`, getAuthHeaders()),
          axios.get(`${API_BASE_URL}/personalinfo/person_table`, getAuthHeaders()),
        ]);
        if (cancelled) return;
        if (assignRes.status === 'fulfilled') {
          const map = {};
          (Array.isArray(assignRes.value.data) ? assignRes.value.data : []).forEach((a) => {
            if (!a?.employeeNumber) return;
            map[String(a.employeeNumber)] = a.code || '';
          });
          setDepartmentAssignmentsMap(map);
        }
        if (empCatRes.status === 'fulfilled') {
          const map = {};
          (Array.isArray(empCatRes.value.data) ? empCatRes.value.data : []).forEach((item) => {
            if (!item.employeeNumber) return;
            const label =
              item.parentGroup && item.typeName
                ? `${item.parentGroup} | ${item.typeName}`
                : item.categoryLabel || '';
            const employmentCategory =
              item.employmentCategory != null && item.employmentCategory !== ''
                ? item.employmentCategory
                : null;
            if (!label && employmentCategory == null) return;
            map[String(item.employeeNumber)] = {
              label: label || '',
              colorHex: item.colorHex || '#757575',
              employmentCategory,
              typeName: item.typeName || '',
              parentGroup: item.parentGroup || '',
            };
          });
          setEmpCatMap(map);
        }
        if (personsRes.status === 'fulfilled') {
          const list = Array.isArray(personsRes.value.data)
            ? personsRes.value.data
            : personsRes.value.data?.data || [];
          const gMap = {};
          list.forEach((p) => {
            const num = p.agencyEmployeeNum?.toString() || p.employeeNumber?.toString();
            if (num && p.sex) gMap[num] = p.sex;
          });
          setSexMap(gMap);
        }
      } catch (err) {
        console.error('Error loading employee reference data:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessLoading, hasAccess]);

  const monthsShort = MONTHS_SHORT;
  const months = MONTHS_SHORT;

  const inboundDtrNavState = useMemo(() => {
    const st = location.state;
    if (!st || typeof st !== 'object') return null;
    const { startDate: sd, endDate: ed } = st;
    if (!sd || !ed) return null;
    if (st.isBulk && Array.isArray(st.users) && st.users.length > 0) {
      return { kind: 'bulk', startDate: sd, endDate: ed, users: st.users };
    }
    const emp = st.employeeNumber ?? st.personID;
    if (emp == null || String(emp).trim() === '') return null;
    return {
      kind: 'single',
      employeeNumber: String(emp).trim(),
      fullName: st.fullName || '',
      startDate: sd,
      endDate: ed,
    };
  }, [location.state]);

  const dtrNavHydrateSigRef = useRef('');

  useLayoutEffect(() => {
    if (!inboundDtrNavState) return;
    const sig = JSON.stringify(inboundDtrNavState);
    if (dtrNavHydrateSigRef.current === sig) return;
    dtrNavHydrateSigRef.current = sig;
    const [sy, sm] = inboundDtrNavState.startDate.split('-').map(Number);
    if (!Number.isFinite(sy) || !Number.isFinite(sm)) return;
    if (inboundDtrNavState.kind === 'bulk') {
      setViewMode('multiple');
      setSelectedYear(sy);
      setSelectedMonth(sm - 1);
      setStartDate(inboundDtrNavState.startDate);
      setEndDate(inboundDtrNavState.endDate);
      setHasSearchedSingle(false);
      const nums = new Set(
        inboundDtrNavState.users
          .map((u) => String(u.employeeNumber ?? u.PersonID ?? '').trim())
          .filter(Boolean),
      );
      setSelectedUsers(nums);
      return;
    }
    setViewMode('single');
    setSelectedYear(sy);
    setSelectedMonth(sm - 1);
    setPersonID(inboundDtrNavState.employeeNumber);
    if (inboundDtrNavState.fullName)
      setEmployeeName(inboundDtrNavState.fullName);
    setStartDate(inboundDtrNavState.startDate);
    setEndDate(inboundDtrNavState.endDate);
    setHasSearchedSingle(true);
  }, [inboundDtrNavState]);

  useEffect(() => {
    const mod = location.state?.openComputationModule;
    if (!mod || !personID || !hasSearchedSingle) return;
    const drawer = resolveDrawerFromComputationModule(mod);
    if (drawer) {
      setActiveComputationDrawer(drawer);
      setModuleDrawer(drawer);
    }
  }, [location.state, personID, hasSearchedSingle]);

  useEffect(() => {
    const st = location.state;
    if (st && typeof st === 'object' && st.startDate && st.endDate) {
      if (st.isBulk && Array.isArray(st.users) && st.users.length > 0) return;
      const emp = st.employeeNumber ?? st.personID;
      if (emp != null && String(emp).trim() !== '') return;
    }
    const wf = readAttendanceWorkflow();
    if (wf.employeeNumber && wf.startDate && wf.endDate) return;
    setPersonID('');
    setStartDate('');
    setEndDate('');
    setSelectedMonth(null);
    setHasSearchedSingle(false);
    setRecords([]);
    setOriginalRecords([]);
    originalRecordsRef.current = [];
    setRecordsHash('');
    setFetchedAt(null);
    setIntegrityStatus('none');
    setEmployeeName('');
    setOfficialTimes({});
    setApprovedLeaves([]);
    setMonthLoading(false);
    setAllUsersDTR([]);
    setBatchOfficialTimesMap({});
    setComputedLateByEmployee({});
    setHalfDayDatesByEmployee({});
    setSelectedUsers(new Set());
    setSearchQuery('');
    setRecordFilter('all');
    setPrintStatusFilter('all');
    setDepartmentFilter('');
    setEmploymentCategoryFilter('');
    setRegistrationStatusFilter('');
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWorkflowHydrate = useCallback((payload) => {
    setViewMode('single');
    setPersonID(payload.employeeNumber);
    if (payload.fullName) setEmployeeName(payload.fullName);
    setStartDate(payload.startDate);
    setEndDate(payload.endDate);
    if (payload.selectedYear != null) setSelectedYear(payload.selectedYear);
    if (payload.selectedMonth != null) setSelectedMonth(payload.selectedMonth);
    setHasSearchedSingle(true);
  }, []);

  const {
    prevStep,
    nextStep,
    goPrevious,
    goNext,
  } = useAttendanceWorkflow('dtr', {
    employeeNumber: personID,
    fullName: employeeName,
    startDate,
    endDate,
    onHydrate: handleWorkflowHydrate,
  });

  const handleHubNext = useCallback(() => {
    goNext();
  }, [goNext]);

  useAttendanceCompactPage();

  // ─── Format helpers ────────────────────────────────────────────────────
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
    const middle = middleRaw ? `${middleRaw.charAt(0).toUpperCase()}.` : '';
    const lastPart = last ? last.toUpperCase() : '';
    const firstPart = first ? capitalize(first) : '';
    return (
      `${lastPart}${lastPart && firstPart ? ', ' : ''}${firstPart}${middle ? ' ' + middle : ''}`.trim() ||
      user.fullName ||
      user.displayName ||
      'Unknown'
    );
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const normalized = String(timeString).replace(/\s+/g, ' ').trim();
    return normalized.replace(/^(\d{1,2}:\d{2}):\d{2}(\s?[AP]M)?$/i, '$1$2');
  };

  const MONTHS_LONG = [
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
  const MONTHS_UPPER = [
    'JANUARY',
    'FEBRUARY',
    'MARCH',
    'APRIL',
    'MAY',
    'JUNE',
    'JULY',
    'AUGUST',
    'SEPTEMBER',
    'OCTOBER',
    'NOVEMBER',
    'DECEMBER',
  ];
  const formatMonth = (dateString) => {
    if (!dateString) return '';
    const m = parseInt(dateString.split('T')[0].split('-')[1]) - 1;
    return MONTHS_UPPER[m] || '';
  };
  const formatStartDate = (dateString) => {
    if (!dateString) return '';
    const [, m, d] = dateString.split('T')[0].split('-');
    return `${MONTHS_LONG[parseInt(m) - 1]} ${parseInt(d)}`;
  };
  const formatEndDate = (dateString) => {
    if (!dateString) return '';
    const [y, , d] = dateString.split('T')[0].split('-');
    return `${parseInt(d)}, ${y}`;
  };

  const formattedStartDate = formatStartDate(startDate);
  const formattedEndDate = formatEndDate(endDate);

  useEffect(() => {
    formatTimeRef.current = formatTime;
  }, []);

  // ─── Anti-tamper DOM restore ───────────────────────────────────────────
  const restoreDOMFromOriginal = useCallback(() => {
    if (!dtrRef.current) return;
    const original = originalRecordsRef.current;
    if (!original || original.length === 0) return;
    isRestoringRef.current = true;
    const fmt = formatTimeRef.current || ((s) => s || '');
    const tbodies = dtrRef.current.querySelectorAll('tbody');
    tbodies.forEach((tbody) => {
      tbody.querySelectorAll('tr').forEach((row) => {
        const dayCell = row.querySelector('td:first-child');
        if (!dayCell) return;
        const dayText = dayCell.textContent.trim();
        if (!/^\d{2}$/.test(dayText)) return;
        const record = original.find(
          (r) => (r.date || '').split('T')[0].split('-')[2] === dayText,
        );
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return;
        [
          fmt(record?.timeIN || ''),
          fmt(record?.breaktimeIN || ''),
          fmt(record?.breaktimeOUT || ''),
          fmt(record?.timeOUT || ''),
        ].forEach((val, idx) => {
          const span = cells[idx + 1]?.querySelector('span');
          if (!span) return;
          const current = span.textContent.trim();
          if (!val && isDtrCellWatermarkText(current)) return;
          if (current !== val) span.textContent = val;
        });
      });
    });
    setTimeout(() => {
      isRestoringRef.current = false;
    }, 50);
  }, []);

  const startObserver = useCallback(() => {
    if (!dtrRef.current) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new MutationObserver((mutations) => {
      if (isRestoringRef.current) return;
      const isTimeTamper = mutations.some((m) => {
        if (m.type === 'characterData') {
          const s = m.target.parentElement;
          return s && s.tagName === 'SPAN';
        }
        if (m.type === 'childList')
          return m.target.tagName === 'TD' || m.target.tagName === 'SPAN';
        return false;
      });
      if (!isTimeTamper) return;
      if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);
      restoreTimerRef.current = setTimeout(() => restoreDOMFromOriginal(), 300);
    });
    observerRef.current.observe(dtrRef.current, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  }, [restoreDOMFromOriginal]);

  const stopObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (restoreTimerRef.current) {
      clearTimeout(restoreTimerRef.current);
      restoreTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (originalRecords.length > 0 && dtrRef.current) {
      const t = setTimeout(() => startObserver(), 100);
      return () => {
        clearTimeout(t);
        stopObserver();
      };
    } else stopObserver();
  }, [originalRecords, startObserver, stopObserver]);

  useEffect(() => () => stopObserver(), [stopObserver]);

  // ─── Integrity verification ────────────────────────────────────────────
  const verifyIntegrity = () => {
    if (!fetchedAt || originalRecords.length === 0) {
      setSnackbar({
        open: true,
        message: 'No DTR data loaded. Please search first.',
        severity: 'warning',
      });
      return false;
    }
    if (Date.now() - new Date(fetchedAt).getTime() > 30 * 60 * 1000) {
      setIntegrityStatus('warn');
      setSnackbar({
        open: true,
        message: 'DTR data is older than 30 minutes. Please search again.',
        severity: 'warning',
      });
      return false;
    }
    if (generateHash(records) !== recordsHash) {
      setIntegrityStatus('warn');
      setSnackbar({
        open: true,
        message: 'Data integrity check failed. Records may have been modified.',
        severity: 'error',
      });
      return false;
    }
    setIntegrityStatus('ok');
    return true;
  };

  // ─── Secondary data helpers ────────────────────────────────────────────
  const fetchOfficialTimes = useCallback(
    async (employeeID, periodStart, periodEnd) => {
      try {
        const timesMap = await fetchOfficialTimesBatch(
          [employeeID],
          periodStart,
          periodEnd,
          getAuthHeaders,
        );
        const cleanMap = timesMap[employeeID] || timesMap[String(employeeID)] || {};
        setOfficialTimes(cleanMap);
      } catch (err) {
        console.error('Error fetching official times:', err);
        setOfficialTimes({});
      }
    },
    [],
  );

  const fetchApprovedLeaves = useCallback(async (empID) => {
    try {
      const r = await axios.get(
        `${API_BASE_URL}/leaveRoute/leave_request`,
        getAuthHeaders(),
      );
      setApprovedLeaves(
        r.data.filter(
          (req) =>
            String(req.status) === '2' &&
            String(req.employeeNumber) === String(empID),
        ),
      );
    } catch {
      setApprovedLeaves([]);
    }
  }, []);

  // ─── Fetch official times for batch users ──────────────────────────────
  const fetchBatchOfficialTimes = useCallback(
    async (employeeNumbers, periodStart, periodEnd) => {
      if (!employeeNumbers || employeeNumbers.length === 0) return;
      try {
        const timesMap = await fetchOfficialTimesBatch(
          employeeNumbers,
          periodStart,
          periodEnd,
          getAuthHeaders,
        );
        setBatchOfficialTimesMap(timesMap);
      } catch (error) {
        console.error('Error in fetchBatchOfficialTimes:', error);
        setBatchOfficialTimesMap({});
      }
    },
    [],
  );

  const loadComputedLateForEmployee = useCallback(
    async (employeeNumber) => {
      if (!employeeNumber || !startDate || !endDate) return;
      const {
        byDate,
        halfDayDates,
        half_day_review,
        computation_module_type,
      } = await fetchDailyLateUndertime(employeeNumber, startDate, endDate);
      const key = String(employeeNumber);
      setComputedLateByEmployee((prev) => ({ ...prev, [key]: byDate }));
      setHalfDayDatesByEmployee((prev) => ({
        ...prev,
        [key]: parseHalfDayDatesSet(halfDayDates),
      }));
      setHalfDayReviewByEmployee((prev) => ({
        ...prev,
        [key]: buildReviewByDate(parseHalfDayReviewJson(half_day_review)),
      }));
      setComputationModuleTypeByEmployee((prev) => ({
        ...prev,
        [key]: computation_module_type || MODULE_TYPES.NON_TEACHING,
      }));
    },
    [startDate, endDate],
  );

  const hasOfficialTimeSchedule = useMemo(() => {
    const ot = officialTimes || {};
    return Object.values(ot).some(
      (sched) =>
        sched?.officialTimeIN &&
        sched?.officialTimeOUT &&
        String(sched.officialTimeIN).trim() !== '00:00:00 AM' &&
        String(sched.officialTimeOUT).trim() !== '00:00:00 PM',
    );
  }, [officialTimes]);

  const appliedLateUtModuleType = useMemo(() => {
    if (!personID) return null;
    const key = String(personID);
    const byDate = computedLateByEmployee[key];
    if (!byDate || Object.keys(byDate).length === 0) return null;
    return computationModuleTypeByEmployee[key] || null;
  }, [personID, computedLateByEmployee, computationModuleTypeByEmployee]);

  const appliedLateUtLabel = useMemo(() => {
    if (!appliedLateUtModuleType) return null;
    return (
      HUB_COMPUTATION_BUTTONS.find((b) => b.moduleType === appliedLateUtModuleType)
        ?.label || null
    );
  }, [appliedLateUtModuleType]);

  const appliedLateUtColor = useMemo(() => {
    if (!appliedLateUtModuleType) return T.accent;
    return (
      HUB_COMPUTATION_BUTTONS.find((b) => b.moduleType === appliedLateUtModuleType)
        ?.categoryColor || T.accent
    );
  }, [appliedLateUtModuleType]);

  const hubDrawerInitialContext = useMemo(
    () => ({
      employeeNumber: personID || '',
      startDate: startDate || '',
      endDate: endDate || '',
      selectedYear,
      selectedMonth,
      fullName: employeeName || selectedEmployee?.fullName || '',
      employee: selectedEmployee || (personID
        ? {
            employeeNumber: personID,
            name: employeeName || '',
            fullName: employeeName || '',
          }
        : null),
    }),
    [
      personID,
      startDate,
      endDate,
      selectedYear,
      selectedMonth,
      employeeName,
      selectedEmployee,
    ],
  );

  const openComputationDrawer = useCallback(
    (drawerKey) => {
      if (!drawerKey || !COMPUTATION_DRAWER_KEYS.has(drawerKey)) return;
      if (!hasOfficialTimeSchedule) {
        setSnackbar({
          open: true,
          message:
            'No Official Time schedule found. Open Official Time to set it up first.',
          severity: 'warning',
        });
        setModuleDrawer('officialTime');
        return;
      }
      setActiveComputationDrawer(drawerKey);
      setModuleDrawer(drawerKey);
    },
    [hasOfficialTimeSchedule],
  );

  const handleSavedToSummary = useCallback(async () => {
    setSummaryRefreshKey((k) => k + 1);
    setActiveComputationDrawer(null);
    setModuleDrawer(null);
    if (personID) {
      try {
        await loadComputedLateForEmployee(personID);
      } catch (err) {
        console.error('Failed to refresh late/undertime after summary save:', err);
      }
    }
    setSnackbar({
      open: true,
      message: 'Attendance summary saved. Totals are now shown below.',
      severity: 'success',
    });
  }, [personID, loadComputedLateForEmployee]);

  const applyModuleLateUndertime = useCallback(
    async (moduleType) => {
      if (!moduleType) return;
      if (!personID || !startDate || !endDate) {
        setSnackbar({
          open: true,
          message: 'Select an employee and month first.',
          severity: 'warning',
        });
        return;
      }
      if (!hasSearchedSingle) {
        setSnackbar({
          open: true,
          message: 'Load the DTR for this employee first.',
          severity: 'warning',
        });
        return;
      }
      if (!hasOfficialTimeSchedule) {
        setSnackbar({
          open: true,
          message:
            'No Official Time schedule found. Open Official Time to set it up first.',
          severity: 'warning',
        });
        setModuleDrawer('officialTime');
        return;
      }
      setLateComputeLoading(moduleType);
      try {
        const result = await computeAndApplyModuleLateUndertime({
          personID,
          startDate,
          endDate,
          moduleType,
        });
        const key = String(personID);
        setComputedLateByEmployee((prev) => ({
          ...prev,
          [key]: result.byDate || {},
        }));
        setHalfDayDatesByEmployee((prev) => ({
          ...prev,
          [key]: parseHalfDayDatesSet(result.halfDayDates),
        }));
        setHalfDayReviewByEmployee((prev) => ({
          ...prev,
          [key]: buildReviewByDate(
            parseHalfDayReviewJson(result.half_day_review),
          ),
        }));
        setComputationModuleTypeByEmployee((prev) => ({
          ...prev,
          [key]: result.computation_module_type || moduleType,
        }));
        const label =
          HUB_COMPUTATION_BUTTONS.find((b) => b.moduleType === moduleType)
            ?.label || 'Module';
        setSnackbar({
          open: true,
          message: `${label} late/undertime applied to DTR.`,
          severity: 'success',
        });
      } catch (err) {
        console.error('Module late/undertime compute failed:', err);
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to apply late/undertime.';
        setSnackbar({ open: true, message: msg, severity: 'error' });
        if (/official time|no matching official/i.test(String(msg))) {
          setModuleDrawer('officialTime');
        }
      } finally {
        setLateComputeLoading(null);
      }
    },
    [
      personID,
      startDate,
      endDate,
      hasSearchedSingle,
      hasOfficialTimeSchedule,
    ],
  );

  const loadComputedLateBatch = useCallback(
    async (employeeNumbers) => {
      if (!startDate || !endDate || !employeeNumbers?.length) return;
      const {
        byEmployee,
        halfDayDatesByEmployee: halfByEmp,
        halfDayReviewByEmployee: reviewByEmp,
        computationModuleTypeByEmployee: modByEmp,
      } = await fetchDailyLateUndertimeBatch(
        employeeNumbers,
        startDate,
        endDate,
      );
      const halfSets = {};
      Object.entries(halfByEmp || {}).forEach(([emp, str]) => {
        halfSets[emp] = parseHalfDayDatesSet(str);
      });
      setComputedLateByEmployee((prev) => ({ ...prev, ...byEmployee }));
      setHalfDayDatesByEmployee((prev) => ({ ...prev, ...halfSets }));
      setHalfDayReviewByEmployee((prev) => ({ ...prev, ...reviewByEmp }));
      setComputationModuleTypeByEmployee((prev) => ({ ...prev, ...modByEmp }));
    },
    [startDate, endDate],
  );

  // ─── Static data on mount ──────────────────────────────────────────────
  useEffect(() => {
    const fetchAllStaticData = async () => {
      try {
        const deptRes = await axios.get(`${API_BASE_URL}/api/department-table`, getAuthHeaders());
        setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
        const [hRes, sRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/holiday`, getAuthHeaders()),
          axios.get(`${API_BASE_URL}/api/suspensions`, getAuthHeaders()),
        ]);
        setHolidays(Array.isArray(hRes.data) ? hRes.data : []);
        setSuspensions(Array.isArray(sRes.data) ? sRes.data : []);
      } catch (e) {
        console.error('Error fetching static data:', e);
      }
    };
    fetchAllStaticData();
  }, []);

  const filterByDtrType = (data, type) => {
    if (type === 'regular') return data.filter((r) => r.timeIN || r.timeOUT);
    if (type === 'service-credit')
      return data.filter(
        (r) =>
          r.specialType === 'SERVICE' && (r.specialTimeIN || r.specialTimeOUT),
      );
    if (type === 'honorarium')
      return data.filter(
        (r) =>
          r.specialType === 'HONORARIUM' &&
          (r.specialTimeIN || r.specialTimeOUT),
      );
    if (type === 'overtime')
      return data.filter(
        (r) =>
          r.specialType === 'OVERTIME' && (r.specialTimeIN || r.specialTimeOUT),
      );
    return data;
  };

  // ─── Single user fetch ─────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setMonthLoading(true);
    try {
      const r = await axios.post(
        `${API_BASE_URL}/attendance/api/view-attendance`,
        { personID, startDate, endDate },
        getAuthHeaders(),
      );
      const data = r.data;
      const filtered = filterByDtrType(data, dtrType);
      setRecords(filtered);
      if (filtered.length > 0) {
        stopObserver();
        const immutable = Object.freeze(JSON.parse(JSON.stringify(filtered)));
        setOriginalRecords(immutable);
        originalRecordsRef.current = immutable;
        setRecordsHash(generateHash(filtered));
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
      if (data.length > 0) {
        const { firstName, lastName, middleName } = data[0];
        setEmployeeName(formatFullName({ firstName, lastName, middleName }));
        fetchOfficialTimes(personID, startDate, endDate);
        fetchApprovedLeaves(personID).catch(() => {});
      } else {
        setEmployeeName('No records found');
        setOfficialTimes({});
      }
      if (dtrType === 'regular' && personID && startDate && endDate) {
        loadComputedLateForEmployee(personID);
      }
      return filtered.length;
    } catch (err) {
      console.error('Error fetching records:', err);
      return null;
    } finally {
      setMonthLoading(false);
    }
  }, [
    personID,
    startDate,
    endDate,
    dtrType,
    stopObserver,
    fetchOfficialTimes,
    fetchApprovedLeaves,
    loadComputedLateForEmployee,
  ]);

  useEffect(() => {
    if (
      viewMode === 'single' &&
      hasSearchedSingle &&
      personID &&
      startDate &&
      endDate
    )
      fetchRecords();
  }, [
    dtrType,
    viewMode,
    hasSearchedSingle,
    personID,
    startDate,
    endDate,
    fetchRecords,
  ]);

  useEffect(() => {
    if (viewMode === 'multiple' && allUsersDTR.length > 0) fetchAllUsersDTR();
  }, [dtrType]);

  useEffect(() => {
    fetchRecordsRef.current = fetchRecords;
    fetchAllUsersDTRRef.current = fetchAllUsersDTR;
  });

  const loadComputedLateForEmployeeRef = useRef(loadComputedLateForEmployee);
  const loadComputedLateBatchRef = useRef(loadComputedLateBatch);
  useEffect(() => {
    loadComputedLateForEmployeeRef.current = loadComputedLateForEmployee;
    loadComputedLateBatchRef.current = loadComputedLateBatch;
  });

  // ─── Socket realtime ───────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !connected) return;
    let debounceTimer = null;

    const matchesCurrentEmployee = (changedIDs) => {
      const currentPersonID =
        personID != null && personID !== '' ? String(personID) : '';
      if (!currentPersonID || changedIDs.length === 0) return changedIDs.length === 0;
      return changedIDs.includes(currentPersonID);
    };

    const refreshComputedLate = (changedIDs) => {
      if (viewMode === 'single') {
        if (!hasSearchedSingle || !personID || !startDate || !endDate) return;
        if (changedIDs.length > 0 && !matchesCurrentEmployee(changedIDs)) return;
        loadComputedLateForEmployeeRef.current?.(personID);
        setSummaryRefreshKey((k) => k + 1);
        return;
      }
      if (!startDate || !endDate || allUsersDTR.length === 0) return;
      const targets =
        changedIDs.length > 0
          ? changedIDs
          : allUsersDTR.map((u) => u.employeeNumber).filter(Boolean);
      if (targets.length === 0) return;
      loadComputedLateBatchRef.current?.(targets);
      setSummaryRefreshKey((k) => k + 1);
    };

    const handleAttendanceChanged = (payload) => {
      const action = payload?.action;
      if (
        action === 'leaves-fetched' ||
        action === 'holidays-fetched' ||
        action === 'suspensions-fetched'
      ) {
        return;
      }

      const changedIDs = Array.isArray(payload?.personIDs)
        ? payload.personIDs.map((id) => String(id))
        : payload?.personID != null
          ? [String(payload.personID)]
          : [];

      // Computation modules (Non-Teaching / 30hrs / Designated) save late/UT here.
      // Must refresh DTR late columns — do not treat as noise.
      if (
        action === 'overall-daily-late-updated' ||
        action === 'overall-daily-late-created' ||
        action === 'overall-updated' ||
        action === 'overall-created'
      ) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => refreshComputedLate(changedIDs), 200);
        return;
      }

      if (payload?.light) return;

      if (action === 'dtr-printed') {
        const printed = Array.isArray(payload?.employeeNumbers)
          ? payload.employeeNumbers
          : [];
        if (printed.length > 0) {
          setPrintStatusMap((prev) => {
            const next = new Map(prev);
            const at =
              typeof payload?.printed_at === 'string'
                ? payload.printed_at
                : new Date().toISOString();
            const by = payload?.printedBy || payload?.printed_by || 'system';
            printed.forEach((emp) =>
              next.set(emp, { printed_at: at, printed_by: by }),
            );
            return next;
          });
        }
        return;
      }

      const isBulk = action === 'bulk-auto-sync';
      const currentPersonID =
        personID != null && personID !== '' ? String(personID) : '';
      if (viewMode === 'single') {
        if (changedIDs.length === 0 && !isBulk) return;
        if (
          currentPersonID &&
          changedIDs.length > 0 &&
          !changedIDs.includes(currentPersonID)
        )
          return;
        if (hasSearchedSingle && personID && startDate && endDate)
          fetchRecordsRef.current?.();
        return;
      }
      if (!startDate || !endDate || allUsersDTR.length === 0) return;
      if (changedIDs.length === 0 && !isBulk) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(
        () => fetchAllUsersDTRRef.current?.({ quiet: true }),
        1500,
      );
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
    hasSearchedSingle,
  ]);

  // Refetch when user returns to this tab (missed socket while elsewhere)
  useEffect(() => {
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      // Ignore quick alt-tab flicker; only refresh after being away briefly
      if (!hiddenAt || Date.now() - hiddenAt < 2000) return;
      if (viewMode === 'single') {
        if (hasSearchedSingle && personID && startDate && endDate) {
          fetchRecordsRef.current?.();
        }
        return;
      }
      if (startDate && endDate && allUsersDTR.length > 0) {
        // Keep the table visible — background refresh only
        fetchAllUsersDTRRef.current?.({ quiet: true });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [
    viewMode,
    personID,
    startDate,
    endDate,
    allUsersDTR.length,
    hasSearchedSingle,
  ]);

  // ─── Batch fetch ───────────────────────────────────────────────────────
  /** @param {{ quiet?: boolean }} [opts] quiet = refresh without clearing the table / selection */
  const fetchAllUsersDTR = useCallback(async (opts = {}) => {
    const quiet = opts?.quiet === true;
    if (!startDate || !endDate) {
      if (!quiet) {
        showAlert('Date Required', 'Please select start date and end date first');
      }
      return;
    }
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;
    if (!quiet) {
      setLoadingAllUsers(true);
      setLoadPhase('Loading employee list…');
      setAllUsersDTR([]);
      setBatchOfficialTimesMap({});
      setComputedLateByEmployee({});
      setHalfDayDatesByEmployee({});
      setSelectedUsers(new Set());
      setCurrentPage(1);
    } else {
      setLoadPhase('Refreshing…');
    }
    const cfg = () => ({ ...getAuthHeaders(), signal });
    try {
      // Names only first — dept/category come from maps already loaded on mount.
      const empRes = await axios
        .get(`${API_BASE_URL}/attendance/api/dtr-employee-list`, {
          params: { startDate, endDate, skipAudit: '1' },
          ...cfg(),
        })
        .catch((e) => {
          if (!signal.aborted) console.warn('emp list:', e.message);
          return { data: [] };
        });
      if (signal.aborted) return;

      const empList = empRes.data || [];
      if (empList.length === 0) {
        if (!quiet) {
          setAllUsersDTR([]);
          setBatchOfficialTimesMap({});
          setLoadingAllUsers(false);
          setLoadPhase('');
          showAlert(
            'No Records Found',
            'No attendance records found for the selected date range.',
          );
        } else {
          setLoadPhase('');
        }
        return;
      }

      const skeletonUsers = empList.map((emp) => {
        const empNum = emp.personID;
        const empKey = String(empNum);
        const deptCode = departmentAssignmentsMap[empKey] || '';
        const empCat = empCatMap[empKey]?.employmentCategory;
        const displayName =
          emp.firstName && emp.lastName
            ? formatFullName({
                firstName: emp.firstName,
                lastName: emp.lastName,
                middleName: emp.middleName,
              })
            : emp.devicePersonName || String(empNum);
        return {
          employeeNumber: empNum,
          firstName: emp.firstName || '',
          lastName: emp.lastName || '',
          middleName: emp.middleName || '',
          fullName: displayName,
          devicePersonName: emp.devicePersonName || '',
          registrationStatus: emp.registrationStatus || 'Not Registered',
          departmentCode: deptCode,
          employmentCategory: empCat,
          records: [],
          hasRecords: false,
          _loading: true,
          rawUser: {
            employeeNumber: empNum,
            firstName: emp.firstName,
            lastName: emp.lastName,
            middleName: emp.middleName,
            departmentCode: deptCode,
            employmentCategory: empCat,
            registrationStatus: emp.registrationStatus || 'Not Registered',
          },
        };
      });

      if (quiet) {
        // Keep existing rows/records on screen; replace only as chunks arrive
        setAllUsersDTR((prev) => {
          const prevById = new Map(
            prev.map((u) => [String(u.employeeNumber), u]),
          );
          return skeletonUsers.map((u) => {
            const existing = prevById.get(String(u.employeeNumber));
            if (!existing) return u;
            return {
              ...u,
              records: existing.records || [],
              hasRecords: existing.hasRecords,
              _loading: false,
            };
          });
        });
      } else {
        setAllUsersDTR(skeletonUsers);
        setLoadingAllUsers(false);
      }
      setLoadPhase(
        quiet
          ? `Refreshing attendance (0 / ${empList.length})…`
          : `Loading attendance (0 / ${empList.length})…`,
      );

      const empNums = skeletonUsers.map((u) => u.employeeNumber);
      const chunks = [];
      for (let i = 0; i < empNums.length; i += ATTENDANCE_CHUNK) {
        chunks.push(empNums.slice(i, i + ATTENDANCE_CHUNK));
      }

      let hydrated = 0;
      for (let i = 0; i < chunks.length; i += ATTENDANCE_CONCURRENCY) {
        if (signal.aborted) break;
        const batch = chunks.slice(i, i + ATTENDANCE_CONCURRENCY);
        const batchRows = await Promise.all(
          batch.map(async (chunk) => {
            if (signal.aborted) return [];
            try {
              const pageRes = await axios.post(
                `${API_BASE_URL}/attendance/api/view-attendance-all-users-paged`,
                {
                  startDate,
                  endDate,
                  employeeNumbers: chunk,
                  skipCount: true,
                  skipAudit: true,
                },
                cfg(),
              );
              return pageRes.data?.data || [];
            } catch (e) {
              if (!signal.aborted)
                console.error('Attendance chunk fetch failed:', e.message);
              return [];
            }
          }),
        );
        if (signal.aborted) return;

        const pageMap = new Map();
        batchRows.flat().forEach((record) => {
          const id = String(record.personID || record.agencyEmployeeNum || '').trim();
          if (!id) return;
          if (!pageMap.has(id)) pageMap.set(id, []);
          pageMap.get(id).push(record);
        });

        hydrated += batch.reduce((n, c) => n + c.length, 0);
        setLoadPhase(
          `${quiet ? 'Refreshing' : 'Loading'} attendance (${Math.min(hydrated, empList.length)} / ${empList.length})…`,
        );

        setAllUsersDTR((prev) =>
          prev.map((user) => {
            const key = String(user.employeeNumber);
            if (!pageMap.has(key)) return user;
            const rows = pageMap.get(key);
            const filtered = filterByDtrType(rows, dtrType);
            return {
              ...user,
              records: filtered,
              hasRecords: filtered.length > 0,
              _loading: false,
            };
          }),
        );
      }

      if (signal.aborted) return;

      setAllUsersDTR((prev) =>
        prev.map((u) => (u._loading ? { ...u, _loading: false } : u)),
      );
      setLoadPhase('');

      const empListIds = empList.map((e) => e.personID);

      // Secondary data — after names are visible (official time, print status, late)
      Promise.all([
        fetchBatchOfficialTimes(empNums, startDate, endDate),
        axios
          .post(
            `${API_BASE_URL}/attendance/api/dtr-print-status`,
            {
              employeeNumbers: empListIds,
              year: new Date(startDate).getFullYear(),
              month: new Date(startDate).getMonth() + 1,
            },
            cfg(),
          )
          .then((psRes) => {
            if (signal.aborted) return;
            const newMap = new Map();
            (psRes.data || []).forEach((s) =>
              newMap.set(s.employee_number, {
                printed_at: s.printed_at,
                printed_by: s.printed_by,
              }),
            );
            setPrintStatusMap(newMap);
          }),
        dtrType === 'regular'
          ? loadComputedLateBatch(empNums)
          : Promise.resolve(),
      ]).catch((e) => {
        if (!signal.aborted) console.warn('DTR batch secondary load:', e);
      });
    } catch (error) {
      if (error?.code === 'ERR_CANCELED' || signal?.aborted) return;
      console.error('fetchAllUsersDTR error:', error);
      if (!quiet) {
        showAlert(
          'Fetch Error',
          error.response?.data?.error || 'Error fetching attendance records.',
        );
        setAllUsersDTR([]);
        setBatchOfficialTimesMap({});
      } else {
        setLoadPhase('');
      }
    } finally {
      if (!signal?.aborted) {
        setLoadingAllUsers(false);
      }
    }
  }, [
    startDate,
    endDate,
    dtrType,
    fetchBatchOfficialTimes,
    loadComputedLateBatch,
    departmentAssignmentsMap,
    empCatMap,
  ]);

  useEffect(() => {
    if (viewMode === 'multiple' && startDate && endDate) fetchAllUsersDTR();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, viewMode]);

  // ─── Month click ────────────────────────────────────────────────────────
  const handleMonthClick = (idx) => {
    const start = new Date(Date.UTC(selectedYear, idx, 1));
    const end = new Date(Date.UTC(selectedYear, idx + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(idx);
    if (viewMode === 'single') {
      setHasSearchedSingle(false);
      setRecords([]);
      setEmployeeName('');
      setMonthLoading(false);
    }
  };

  const handleQuickDateSelect = (value) => {
    applyQuickDateRange(value, setStartDate, setEndDate, setSelectedMonth);
    if (viewMode === 'single') {
      setHasSearchedSingle(false);
      setRecords([]);
      setEmployeeName('');
    }
  };

  const handleSingleSearch = async () => {
    if (!personID || !startDate || !endDate) {
      setHasSearchedSingle(false);
      setRecords([]);
      showAlert(
        'Missing Required Fields',
        'Please enter an employee number and select a month before searching.',
      );
      return;
    }
    setHasSearchedSingle(true);
    await fetchRecords();
  };

  // ─── Selection helpers ─────────────────────────────────────────────────
  const handleUserSelect = (empNum) => {
    if (printStatusMap.has(empNum)) return;
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      next.has(empNum) ? next.delete(empNum) : next.add(empNum);
      return next;
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const selectable = getFilteredUsers().filter(
        (u) => !printStatusMap.has(u.employeeNumber),
      );
      const limited = selectable.slice(0, 50);
      setSelectedUsers(new Set(limited.map((u) => u.employeeNumber)));
      if (selectable.length > 50)
        showAlert(
          'Selection Limited',
          `Only first 50 selected. Bulk print limit is 50 per batch.`,
        );
    } else {
      setSelectedUsers(new Set());
    }
  };

  const getFilteredUsers = useCallback(() => {
    let filtered = allUsersDTR.slice();
    if (recordFilter === 'has')
      filtered = filtered.filter((u) => u.records?.length > 0 && !u._loading);
    else if (recordFilter === 'no')
      filtered = filtered.filter((u) => !u.records?.length && !u._loading);
    if (printStatusFilter === 'printed')
      filtered = filtered.filter((u) => printStatusMap.has(u.employeeNumber));
    else if (printStatusFilter === 'unprinted')
      filtered = filtered.filter((u) => !printStatusMap.has(u.employeeNumber));
    if (departmentFilter)
      filtered = filtered.filter(
        (u) =>
          (u.departmentCode || u.rawUser?.departmentCode || '') ===
          departmentFilter,
      );
    if (employmentCategoryFilter !== '')
      filtered = filtered.filter((u) => {
        const cat =
          u.rawUser?.employmentCategory ?? u.employmentCategory ?? null;
        return cat !== null && cat === parseInt(employmentCategoryFilter);
      });
    if (registrationStatusFilter)
      filtered = filtered.filter(
        (u) =>
          (u.registrationStatus || 'Not Registered') ===
          registrationStatusFilter,
      );
    if (dtrType !== 'regular') {
      const isValid = (t) => {
        if (!t) return false;
        const s = String(t).trim();
        return (
          s && s !== '00:00:00 AM' && s !== '00:00:00 PM' && s !== '12:00:00 AM'
        );
      };
      filtered = filtered.filter((u) =>
        u.records?.some((r) => {
          if (dtrType === 'honorarium')
            return (
              r.specialType === 'HONORARIUM' &&
              isValid(r.specialTimeIN) &&
              isValid(r.specialTimeOUT)
            );
          if (dtrType === 'service-credit')
            return (
              r.specialType === 'SERVICE' &&
              isValid(r.specialTimeIN) &&
              isValid(r.specialTimeOUT)
            );
          if (dtrType === 'overtime')
            return (
              r.specialType === 'OVERTIME' &&
              isValid(r.specialTimeIN) &&
              isValid(r.specialTimeOUT)
            );
          return false;
        }),
      );
    }
    if (batchSearchTrimmed) {
      const q = batchSearchTrimmed.toLowerCase();
      filtered = filtered.filter((u) => {
        const full = (
          u.fullName || `${u.firstName || ''} ${u.lastName || ''}`
        ).toLowerCase();
        const emp = String(u.employeeNumber || '').toLowerCase();
        const device = (u.devicePersonName || '').toLowerCase();
        return full.includes(q) || emp.includes(q) || device.includes(q);
      });
    }
    return filtered;
  }, [
    allUsersDTR,
    recordFilter,
    printStatusFilter,
    printStatusMap,
    departmentFilter,
    employmentCategoryFilter,
    registrationStatusFilter,
    dtrType,
    batchSearchTrimmed,
  ]);

  const filteredUsers = getFilteredUsers();
  const totalPageCount = Math.max(
    1,
    Math.ceil(filteredUsers.length / rowsPerPage),
  );
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );
  const goToPage = (p) =>
    setCurrentPage(Math.min(Math.max(1, p), totalPageCount));

  const getCategoryLabel = (id) =>
    EMPLOYMENT_CATEGORY_OPTIONS.find(
      (option) => String(option.value) === String(id),
    )?.label || 'Unknown';
  const getCategoryColor = (id) =>
    EMPLOYMENT_CATEGORY_OPTIONS.find(
      (option) => String(option.value) === String(id),
    )?.color || '#757575';

  const getRegistrationStatusCounts = () => {
    const c = { Registered: 0, 'Not Registered': 0 };
    allUsersDTR.forEach((u) => {
      const s = u.registrationStatus || 'Not Registered';
      if (c[s] !== undefined) c[s]++;
    });
    return c;
  };
  const registrationStatusCounts = getRegistrationStatusCounts();

  const handleAutoSelectFirstN = (n) => {
    const f = getFilteredUsers();
    if (!f.length) {
      setSelectedUsers(new Set());
      return;
    }
    const count = n === 'all' ? Math.min(50, f.length) : Number(n) || 0;
    setSelectedUsers(new Set(f.slice(0, count).map((u) => u.employeeNumber)));
    setPreviewUsers(f.slice(0, count));
    setCurrentPreviewIndex(0);
  };

  const handleBulkPrint = () => {
    const toPrint = filteredUsers.filter((u) =>
      selectedUsers.has(u.employeeNumber),
    );
    if (!toPrint.length) {
      showAlert('No Selection', 'Please select at least one user to print');
      return;
    }
    if (toPrint.length > 50) {
      showAlert(
        'Too Many Selected',
        `You selected ${toPrint.length} users. Limit is 50 per batch.`,
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

  // ─── Capture helpers ────────────────────────────────────────────────────
  const getSingleDtrPdfUser = useCallback(() => {
    if (selectedEmployee) {
      return {
        firstName: selectedEmployee.firstName,
        lastName: selectedEmployee.lastName,
        middleName: selectedEmployee.middleName,
        fullName: selectedEmployee.fullName,
      };
    }
    if (records[0]) {
      const r = records[0];
      return {
        firstName: r.firstName,
        lastName: r.lastName,
        middleName: r.middleName,
      };
    }
    return { fullName: employeeName };
  }, [selectedEmployee, records, employeeName]);

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

  /** Capture without moving visible on-page DTR — clones off-screen for live view */
  const captureDtrElement = async (el, scale = 2) => {
    if (!el) throw new Error('DTR element not found');

    const isOffScreenBulk = el.classList?.contains('bulk-dtr-print');
    let captureTarget = el;
    let tempClone = null;
    let orig = null;

    if (!isOffScreenBulk) {
      tempClone = el.cloneNode(true);
      tempClone.style.position = 'fixed';
      tempClone.style.left = '-9999px';
      tempClone.style.top = '0';
      tempClone.style.width = DTR_WIDTH_IN;
      tempClone.style.visibility = 'visible';
      tempClone.style.display = 'block';
      tempClone.style.backgroundColor = '#ffffff';
      tempClone.style.zIndex = '-1';
      tempClone.style.opacity = '1';
      document.body.appendChild(tempClone);
      captureTarget = tempClone;
    } else {
      orig = ensureCaptureStyles(el);
    }

    try {
      await new Promise((r) => requestAnimationFrame(r));
      const canvas = await html2canvas(captureTarget, {
        scale,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      return canvas;
    } finally {
      if (tempClone) tempClone.remove();
      else restoreCaptureStyles(el, orig);
    }
  };

  /** Mount a single off-screen DTR, wait for ref, capture, then unmount. */
  const mountAndCaptureUserDtr = async (user, scale = 2) => {
    if (!user?.employeeNumber) throw new Error('Invalid user for DTR capture');
    setCaptureUser(user);
    await new Promise((r) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setTimeout(r, 40));
      });
    });

    const empKey = String(user.employeeNumber);
    const started = Date.now();
    let ref = bulkDTRRefs.current[empKey];
    while (!ref && Date.now() - started < 8000) {
      await new Promise((r) => setTimeout(r, 30));
      ref = bulkDTRRefs.current[empKey];
    }
    if (!ref) throw new Error(`DTR element not found for ${empKey}`);

    try {
      return await captureDtrElement(ref, scale);
    } finally {
      setCaptureUser(null);
      delete bulkDTRRefs.current[empKey];
      await new Promise((r) => setTimeout(r, 0));
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
      setSinglePrintStatus('Capturing DTR layout...');
      await new Promise((r) => setTimeout(r, 50));
      const canvas = await captureDtrElement(dtrRef.current, 2);
      const imgData = canvas.toDataURL('image/png');
      const dtrW = 8,
        dtrH = 9.5,
        pw = pdf.internal.pageSize.getWidth(),
        ph = pdf.internal.pageSize.getHeight();
      pdf.addImage(
        imgData,
        'PNG',
        (pw - dtrW) / 2,
        (ph - dtrH) / 2,
        dtrW,
        dtrH,
      );
      pdf.autoPrint();
      openPdfBlobForPrint(
        pdf,
        formatDtrPdfFileName(getSingleDtrPdfUser(), startDate),
      );
    } catch (e) {
      console.error('Error generating print view:', e);
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
      await new Promise((r) => setTimeout(r, 50));
      const canvas = await captureDtrElement(dtrRef.current, 2);
      const imgData = canvas.toDataURL('image/png');
      const dtrW = 8,
        dtrH = 10,
        pw = pdf.internal.pageSize.getWidth(),
        ph = pdf.internal.pageSize.getHeight();
      pdf.addImage(
        imgData,
        'PNG',
        (pw - dtrW) / 2,
        (ph - dtrH) / 2,
        dtrW,
        dtrH,
      );
      pdf.save(formatDtrPdfFileName(getSingleDtrPdfUser(), startDate));
    } catch (e) {
      console.error('Error generating PDF:', e);
    } finally {
      setSinglePrintLoading(false);
      setSinglePrintStatus('');
    }
  };

  const handleIndividualPrintConfirmed = async (user) => {
    closeConfirm();

    try {
      setPrintingAll(true);
      setPrintingStatus(
        `Preparing DTR for ${user.firstName} ${user.lastName}...`,
      );
      setPreviewUsers([user]);
      setCurrentPreviewIndex(0);
      setPreviewModalOpen(false);
      setPrintingStatus('Capturing DTR layout...');
      const canvas = await mountAndCaptureUserDtr(user, 2);
      if (!canvas || canvas.width === 0)
        throw new Error('Failed to capture DTR.');
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      if (!imgData || imgData === 'data:,')
        throw new Error('Failed to generate image.');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'a4',
      });
      const dtrW = 8,
        dtrH = 9.5,
        pw = pdf.internal.pageSize.getWidth(),
        ph = pdf.internal.pageSize.getHeight();
      pdf.addImage(
        imgData,
        'JPEG',
        (pw - dtrW) / 2,
        (ph - dtrH) / 2,
        dtrW,
        dtrH,
      );
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
      openPdfBlobForPrint(pdf, formatDtrPdfFileName(user, startDate));
    } catch (error) {
      console.error('Error printing individual DTR:', error);
      showAlert('Print Error', `Error printing DTR: ${error.message}`);
    } finally {
      setCaptureUser(null);
      setPrintingStatus('');
      setPrintingAll(false);
    }
  };

  const handlePrintAllSelected = async () => {
    if (!previewUsers.length) {
      showAlert('No Selection', 'No DTRs to print.');
      return;
    }

    try {
      setPrintingAll(true);
      setPrintingStatus('Preparing DTRs for printing...');
      setPreviewModalOpen(false);
      await new Promise((r) => requestAnimationFrame(r));
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'a4',
      });
      const dtrW = 8,
        dtrH = 9.5,
        pw = pdf.internal.pageSize.getWidth(),
        ph = pdf.internal.pageSize.getHeight();
      const captureScale =
        previewUsers.length >= 40 ? 1.0 : previewUsers.length >= 20 ? 1.2 : 1.5;
      let successCount = 0;
      for (let i = 0; i < previewUsers.length; i++) {
        const user = previewUsers[i];
        if (i === 0 || (i + 1) % 5 === 0 || i === previewUsers.length - 1) {
          setPrintingStatus(
            `Capturing DTR ${i + 1} of ${previewUsers.length}...`,
          );
        }
        try {
          const canvas = await mountAndCaptureUserDtr(user, captureScale);
          if (!canvas || canvas.width === 0) continue;
          const imgData = canvas.toDataURL('image/jpeg', 0.82);
          if (!imgData || imgData === 'data:,') continue;
          if (successCount > 0) pdf.addPage();
          pdf.addImage(
            imgData,
            'JPEG',
            (pw - dtrW) / 2,
            (ph - dtrH) / 2,
            dtrW,
            dtrH,
          );
          successCount++;
        } catch (e) {
          console.error(`Error capturing ${user.employeeNumber}:`, e);
        }
        if ((i + 1) % 4 === 0) await new Promise((r) => setTimeout(r, 0));
      }
      if (successCount === 0)
        throw new Error('No DTRs were successfully captured.');
      const bulkPdfName =
        previewUsers.length === 1
          ? formatDtrPdfFileName(previewUsers[0], startDate)
          : formatDtrBulkPdfFileName(startDate);
      pdf.autoPrint();
      openPdfBlobForPrint(pdf, bulkPdfName);
      try {
        const year = new Date(startDate).getFullYear();
        const month = new Date(startDate).getMonth() + 1;
        const empNums = previewUsers.map((u) => u.employeeNumber);
        await axios.post(
          `${API_BASE_URL}/attendance/api/mark-dtr-printed`,
          { employeeNumbers: empNums, year, month, startDate, endDate },
          getAuthHeaders(),
        );
        const newMap = new Map(printStatusMap);
        empNums.forEach((n) =>
          newMap.set(n, {
            printed_at: new Date().toISOString(),
            printed_by: 'current_user',
          }),
        );
        setPrintStatusMap(newMap);
        setSelectedUsers(new Set());
      } catch (e) {
        console.error('Error marking DTRs printed:', e);
      }
    } catch (error) {
      console.error('Error printing DTRs:', error);
      showAlert('Print Error', `Error: ${error.message || 'Unknown error'}`);
    } finally {
      setCaptureUser(null);
      setPrintingStatus('');
      setPrintingAll(false);
    }
  };

  const handleDownloadAllSelected = async () => {
    if (!previewUsers.length) {
      showAlert('No Selection', 'No DTRs to download.');
      return;
    }

    try {
      setPrintingAll(true);
      setPrintingStatus('Preparing DTRs for download...');
      setPreviewModalOpen(false);
      await new Promise((r) => requestAnimationFrame(r));
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'a4',
      });
      const dtrW = 8,
        dtrH = 10,
        pw = pdf.internal.pageSize.getWidth(),
        ph = pdf.internal.pageSize.getHeight();
      const captureScale =
        previewUsers.length >= 40 ? 1.0 : previewUsers.length >= 20 ? 1.2 : 1.5;
      let successCount = 0;
      for (let i = 0; i < previewUsers.length; i++) {
        const user = previewUsers[i];
        if (i === 0 || (i + 1) % 5 === 0 || i === previewUsers.length - 1) {
          setPrintingStatus(
            `Capturing DTR ${i + 1} of ${previewUsers.length}...`,
          );
        }
        try {
          const canvas = await mountAndCaptureUserDtr(user, captureScale);
          if (!canvas || canvas.width === 0) continue;
          const imgData = canvas.toDataURL('image/jpeg', 0.82);
          if (!imgData || imgData === 'data:,') continue;
          if (successCount > 0) pdf.addPage();
          pdf.addImage(
            imgData,
            'JPEG',
            (pw - dtrW) / 2,
            (ph - dtrH) / 2,
            dtrW,
            dtrH,
          );
          successCount++;
        } catch (e) {
          console.error(`Error capturing ${user.employeeNumber}:`, e);
        }
        if ((i + 1) % 4 === 0) await new Promise((r) => setTimeout(r, 0));
      }
      if (successCount === 0)
        throw new Error('No DTRs were successfully captured.');
      const bulkPdfName =
        previewUsers.length === 1
          ? formatDtrPdfFileName(previewUsers[0], startDate)
          : formatDtrBulkPdfFileName(startDate);
      pdf.save(bulkPdfName);
    } catch (error) {
      showAlert('Download Error', `Error: ${error.message || 'Unknown error'}`);
    } finally {
      setCaptureUser(null);
      setPrintingStatus('');
      setPrintingAll(false);
    }
  };

  // ─── Date indicator helpers ────────────────────────────────────────────
  const isApprovedLeaveDate = (dateString) => {
    if (!dateString || !approvedLeaves.length) return false;
    const check = toPhCalendarYmd(dateString);
    if (!check) return false;
    return approvedLeaves.some((req) => {
      const dates = Array.isArray(req.leave_date)
        ? req.leave_date
        : String(req.leave_date)
            .split(',')
            .map((d) => d.trim());
      return dates.some((d) => toPhCalendarYmd(d) === check);
    });
  };

  const isDateInRange = (date, s, e) => {
    if (!date) return false;
    const d = toPhCalendarYmd(date);
    if (!d) return false;
    const st = s != null && s !== '' ? toPhCalendarYmd(s) : null;
    const en = e != null && e !== '' ? toPhCalendarYmd(e) : null;
    if (st && en) return d >= st && d <= en;
    if (st) return d >= st;
    if (en) return d <= en;
    return false;
  };

  const getDateIndicator = (dateString) => {
    if (!dateString) return null;
    const date = toPhCalendarYmd(dateString);
    if (!date) return null;
    const leaveReq = findApprovedLeaveForDate(date, approvedLeaves);
    if (leaveReq)
      return {
        type: 'leave',
        label: formatDtrLeaveLabel(leaveReq),
        bgColor: 'rgba(46,125,50,0.2)',
        textColor: '#000',
        borderColor: '#2e7d32',
      };
    const susp = suspensions.find((s) =>
      isDateInRange(date, s.date_start || s.date, s.date_end || s.date),
    );
    if (susp)
      return {
        type: 'suspension',
        label: 'SUSPENSION',
        bgColor: 'rgba(211,47,47,0.2)',
        textColor: '#000',
        borderColor: '#d32f2f',
      };
    const hol = holidays.find((h) =>
      isDateInRange(date, h.date_start || h.date, h.date_end || h.date),
    );
    if (hol)
      return {
        type: 'holiday',
        label: 'HOLIDAY',
        bgColor: 'rgba(237,108,2,0.25)',
        textColor: '#000',
        borderColor: '#ed6c02',
      };
    return null;
  };

  const highlightMatch = (text, q) => {
    const needle = String(q || '').trim();
    if (!needle || !text) return text;
    const lower = text.toLowerCase();
    const idx = lower.indexOf(needle.toLowerCase());
    if (idx === -1) return text;
    return (
      <span>
        {text.slice(0, idx)}
        <span
          style={{
            backgroundColor: '#ffeb3b',
            color: '#000',
            padding: '0 2px',
            borderRadius: 2,
            fontWeight: 700,
          }}
        >
          {text.slice(idx, idx + needle.length)}
        </span>
        {text.slice(idx + needle.length)}
      </span>
    );
  };

  // ─── Access guards ─────────────────────────────────────────────────────
  if (!accessLoading && hasAccess === false) {
    return (
      <AccessDenied
        title="Access Denied"
        message={accessDeniedMessage}
        returnPath={accessDeniedReturnPath}
        returnButtonText="Return to Home"
      />
    );
  }

  const loadingOverlayOpen =
    accessLoading ||
    employeeSearchLoading ||
    (viewMode === 'single' && monthLoading) ||
    (viewMode === 'multiple' && loadingAllUsers) ||
    printingAll ||
    singlePrintLoading;

  const loadingOverlayMessage = (() => {
    if (accessLoading) return 'Checking access…';
    if (singlePrintLoading) return singlePrintStatus || 'Preparing DTR…';
    if (printingAll) return printingStatus || 'Preparing DTRs…';
    if (viewMode === 'single' && monthLoading)
      return selectedMonth !== null
        ? `Loading DTR — ${monthsShort[selectedMonth]}…`
        : 'Loading DTR — Fetching records…';
    if (viewMode === 'multiple' && loadingAllUsers)
      return loadPhase ? `Batch load — ${loadPhase}` : 'Batch load — Loading…';
    if (employeeSearchLoading) return 'Searching employees…';
    return 'Processing…';
  })();

  // ─── DTR table renderers ───────────────────────────────────────────────
  const getTimeFields = (record, type) => {
    if (!record)
      return { timeIN: '', breaktimeIN: '', breaktimeOUT: '', timeOUT: '' };
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

  const getRenderedTimeData = (record, type) => {
    if (!record) return { hours: '', minutes: '' };
    if (type === 'regular') {
      return {
        hours:
          record.hours != null && record.hours !== ''
            ? String(record.hours)
            : '',
        minutes:
          record.minutes != null && record.minutes !== ''
            ? String(record.minutes)
            : '',
      };
    }
    const mins = Number(record.minutes) || 0;
    return {
      hours: mins >= 60 ? String(Math.floor(mins / 60)) : '',
      minutes: mins % 60 > 0 ? String(mins % 60) : '',
    };
  };

  // ─── DTR header renderer — accepts officialTimesForUser ───────────────
  const renderDTRHeader = (
    nameDisplay,
    type = dtrType,
    officialTimesForUser = {},
  ) => {
    const fs = '10px';

    const regularDaysLines = showOfficialTimeOnDtr
      ? buildRegularDaysOfficialLines(officialTimesForUser, formatTime)
      : [];
    const saturdayOfficialText = showOfficialTimeOnDtr
      ? buildOfficialTwoSegment(officialTimesForUser.Saturday, formatTime)
      : '';
    const regularBlockMinH =
      showOfficialTimeOnDtr && regularDaysLines.length > 0
        ? 14 + Math.max(0, regularDaysLines.length - 1) * 16
        : 14;

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
                fontFamily: 'Arial,"Times New Roman",serif',
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
                style={{ position: 'absolute', left: '10px' }}
              />
              <p
                style={{
                  margin: '0',
                  fontSize: '11.5px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  fontFamily: 'Arial,"Times New Roman",serif',
                  lineHeight: '1.2',
                }}
              >
                EULOGIO "AMANG" RODRIGUEZ <br /> INSTITUTE OF SCIENCE &amp;
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
                fontFamily: 'Arial,serif',
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
                fontFamily: 'Arial,serif',
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
                    fontFamily: 'Times New Roman,serif',
                    margin: '2px 0',
                    fontWeight: 'bold',
                    fontSize: '16px',
                  }}
                >
                  DAILY TIME RECORD
                </h4>
                <div
                  style={{
                    fontFamily: 'Times New Roman,serif',
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
                  fontFamily: 'Times New Roman,serif',
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
                fontFamily: 'Arial,serif',
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
                {nameDisplay}
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
                fontFamily: 'Times New Roman,serif',
                fontSize: '10px',
              }}
            >
              <span style={{ marginRight: '6px' }}>Covered Dates:</span>
              <div
                style={{
                  fontWeight: 'bold',
                  textAlign: 'left',
                  fontSize: '10px',
                  fontFamily: 'Times New Roman,serif',
                }}
              >
                {formattedStartDate} - {formattedEndDate}
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
                fontFamily: 'Times New Roman,serif',
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
              fontFamily: 'Arial,serif',
              lineHeight: '1.2',
            }}
          >
            Official hours for arrival (regular day) and departure
          </td>
        </tr>
        {Array.from({ length: 6 }, (_, i) => (
          <tr key={`e1-${i}`}>
            <td colSpan="7"></td>
          </tr>
        ))}

        {/* Regular Days row — dynamic when showOfficialTimeOnDtr is on */}
        <tr>
          <td colSpan="7" style={{ padding: '2px 5px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                paddingLeft: '5%',
                minHeight: regularBlockMinH,
                fontFamily: 'Arial,serif',
                fontSize: '10px',
              }}
            >
              <span
                style={{ marginRight: '5px', flexShrink: 0, lineHeight: 1.2 }}
              >
                Regular Days:
              </span>
              <span
                style={{
                  display: 'inline-block',
                  borderBottom: '1.5px solid black',
                  flexGrow: 1,
                  minWidth: '300px',
                  marginBottom: '2px',
                  paddingLeft: '4px',
                  paddingBottom: '1px',
                  fontSize: regularDaysLines.length > 0 ? '9px' : '10px',
                  lineHeight: 1.35,
                  textAlign: 'left',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                }}
              >
                {regularDaysLines.map((line, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 ? <br /> : null}
                    {line}
                  </React.Fragment>
                ))}
              </span>
            </div>
          </td>
        </tr>
        {Array.from({ length: 2 }, (_, i) => (
          <tr key={`e2-${i}`}>
            <td colSpan="7"></td>
          </tr>
        ))}

        {/* Saturdays row — dynamic when showOfficialTimeOnDtr is on */}
        <tr>
          <td colSpan="7" style={{ padding: '2px 5px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                paddingLeft: '5%',
                minHeight:
                  showOfficialTimeOnDtr && saturdayOfficialText ? 26 : 20,
                fontFamily: 'Arial,serif',
                fontSize: '10px',
              }}
            >
              <span
                style={{ marginRight: '5px', flexShrink: 0, lineHeight: 1.2 }}
              >
                Saturdays:
              </span>
              <span
                style={{
                  display: 'inline-block',
                  borderBottom: '1.5px solid black',
                  flexGrow: 1,
                  minWidth: '318px',
                  marginBottom: '2px',
                  paddingLeft: '4px',
                  paddingBottom: '1px',
                  fontSize: saturdayOfficialText ? '9px' : '10px',
                  lineHeight: 1.25,
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                }}
              >
                {saturdayOfficialText}
              </span>
            </div>
          </td>
        </tr>
        {Array.from({ length: 2 }, (_, i) => (
          <tr key={`e3-${i}`}>
            <td colSpan="7"></td>
          </tr>
        ))}

        <tr>
          <th
            rowSpan="2"
            style={{
              border: '1px solid black',
              fontFamily: 'Arial,serif',
              fontSize: fs,
            }}
          >
            DAY
          </th>
          <th
            colSpan="2"
            style={{
              border: '1px solid black',
              fontFamily: 'Arial,serif',
              fontSize: fs,
            }}
          >
            A.M.
          </th>
          <th
            colSpan="2"
            style={{
              border: '1px solid black',
              fontFamily: 'Arial,serif',
              fontSize: fs,
            }}
          >
            P.M.
          </th>
          <th
            style={{
              border: '1px solid black',
              fontFamily: 'Arial,serif',
              fontSize: fs,
            }}
          >
            Late
          </th>
          <th
            style={{
              border: '1px solid black',
              fontFamily: 'Arial,serif',
              fontSize: fs,
            }}
          >
            Undertime
          </th>
        </tr>
        <tr style={{ textAlign: 'center' }}>
          {['Arrival', 'Departure', 'Arrival', 'Departure', 'Min', 'Min'].map(
            (lbl, i) => (
              <td
                key={i}
                style={{
                  border: '1px solid black',
                  fontSize: '9px',
                  fontFamily: 'Arial,serif',
                }}
              >
                {lbl}
              </td>
            ),
          )}
        </tr>
      </thead>
    );
  };

  const renderDTRFooter = () => (
    <tr>
      <td colSpan="7" style={{ padding: '10px 5px' }}>
        <hr style={{ borderTop: '2px solid black', width: '100%' }} />
        <p
          style={{
            textAlign: 'justify',
            fontSize: '9px',
            lineHeight: '1.4',
            fontFamily: 'Times New Roman,serif',
            margin: '5px 0',
          }}
        >
          I CERTIFY on my honor that the above is a true and correct report
          <br />
          of the hours of work performed, record of which was made daily at
          <br />
          the time of arrival and at the time of departure from office.
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
              fontFamily: 'Arial,serif',
              margin: '5px 0 0 0',
            }}
          >
            Signature
          </p>
        </div>
        <div style={{ width: '100%', marginTop: '15px' }}>
          <hr
            style={{ borderTop: '1px solid black', width: '100%', margin: 0 }}
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
              fontFamily: 'Arial,serif',
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
              fontFamily: 'Times New Roman,serif',
              margin: '2px 0 0 0',
            }}
          >
            In-Charge
          </p>
          <p
            style={{ fontSize: '9px', fontFamily: 'Arial,serif', margin: '0' }}
          >
            (Signature Over Printed Name)
          </p>
        </div>
      </td>
    </tr>
  );

  const cellStyle = {
    border: '1px solid black',
    textAlign: 'center',
    padding: '0 1px',
    fontFamily: 'Arial,serif',
    fontSize: '10px',
    height: '16px',
    whiteSpace: 'nowrap',
  };

  const daysInSelectedMonth = (() => {
    if (selectedMonth == null || !Number.isFinite(selectedYear)) return 31;
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  })();

  const dtrRawEmpty = dtrTimeValueEmpty;

  const renderDtrAmPmWatermarkCell = (
    rawVal,
    displayText,
    rowTint,
    indicator,
    colKey,
  ) => {
    const { text, isWatermark } = resolveDtrAmPmCellText(
      rawVal,
      displayText,
      indicator,
    );
    return (
      <td
        key={colKey}
        style={{
          ...cellStyle,
          backgroundColor: rowTint,
          verticalAlign: 'middle',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        <span style={isWatermark ? DTR_WM_INLINE_STYLE : undefined}>{text}</span>
      </td>
    );
  };

  const renderDTRRows = (
    sourceRecords,
    type,
    employeeNumber = null,
    officialTimesForUser = {},
  ) =>
    Array.from({ length: daysInSelectedMonth }, (_, i) => {
      const day = (i + 1).toString().padStart(2, '0');
      const record = sourceRecords.find((r) => recordMatchesDay(r, day));
      let fullDate = null;
      if (record?.date) fullDate = normRecordYmd(record.date);
      else if (startDate) {
        const [y, m] = startDate.split('-');
        fullDate = `${y}-${m}-${day}`;
      } else if (selectedMonth !== null) {
        fullDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${day}`;
      }
      const dateIndicator = getDateIndicator(fullDate);
      const tf = getTimeFields(record, type);
      const rt = getRenderedTimeData(record, type);
      const empKey =
        employeeNumber != null
          ? String(employeeNumber)
          : String(personID || '');
      const moduleType =
        computationModuleTypeByEmployee[empKey] ||
        MODULE_TYPES.NON_TEACHING;
      const isNotScheduledDay = !isDtrDateScheduledByOfficialTime({
        record,
        officialTimesByDay: officialTimesForUser,
        fullDate,
      });
      const dayName = getDayNameFromYmd(fullDate);
      const dayOfficial =
        (dayName && officialTimesForUser?.[dayName]) || {};
      const rowForStatus = {
        ...(record || {}),
        ...dayOfficial,
        date: fullDate || record?.date,
        timeIN: tf.timeIN,
        breaktimeIN: tf.breaktimeIN,
        breaktimeOUT: tf.breaktimeOUT,
        timeOUT: tf.timeOUT,
      };
      const hasPeriodRecords =
        Array.isArray(sourceRecords) && sourceRecords.length > 0;
      // Scheduled workday + no punches on DTR = absent (only when period has data)
      const rowIsAbsent =
        type === 'regular' &&
        isDtrAbsentRow({
          record: rowForStatus,
          dateIndicator,
          isNotScheduledDay,
          moduleType,
          hasPeriodRecords,
        });
      const halfUi =
        type === 'regular' && !dateIndicator && !rowIsAbsent
          ? getRowHalfDayUiStatus(
              rowForStatus,
              halfDayReviewByEmployee[empKey] || {},
              moduleType,
            )
          : null;
      const halfDayIndicator = halfUi ? getDtrHalfDayIndicator(halfUi) : null;
      const absentIndicator = rowIsAbsent ? getDtrAbsentIndicator() : null;
      const indicator = resolveDtrRowIndicator(dateIndicator, {
        absentIndicator,
        halfDayIndicator,
      });
      const rowTint = resolveDtrRowTint(dateIndicator, {
        absentIndicator,
        halfDayIndicator,
        suggestedHalfDay: halfUi === 'suggested',
      });
      const computed =
        empKey && fullDate
          ? computedLateByEmployee[empKey]?.[fullDate] || null
          : null;
      const isExcludedDay =
        dateIndicator?.type === 'holiday' ||
        dateIndicator?.type === 'suspension' ||
        dateIndicator?.type === 'leave';
      const hasIncompletePunch = Boolean(
        record &&
        ((dtrRawEmpty(record?.timeIN) && !dtrRawEmpty(record?.timeOUT)) ||
          (!dtrRawEmpty(record?.timeIN) && dtrRawEmpty(record?.timeOUT))),
      );
      const isPendingHalfDay = isDtrHalfDayLateUndertimePending({
        record,
        fullDate,
        reviewByDate: halfDayReviewByEmployee[empKey] || {},
        moduleType,
      });
      const { lateDisplay, undertimeDisplay } =
        type !== 'regular'
          ? { lateDisplay: '', undertimeDisplay: '' }
          : resolveDtrLateUndertimeDisplay({
              computed,
              record: {
                ...record,
                hours: record?.hours || rt.hours,
                minutes: record?.minutes || rt.minutes,
              },
              isExcludedDay,
              hasIncompletePunch,
              isNotScheduledDay,
              isPendingHalfDay,
            });
      const isNonWorkingDayRow = isDtrNonWorkingDayRow({
        isNotScheduledDay,
        indicator: dateIndicator,
        timeFields: tf,
        hasPeriodRecords,
        fullDate,
        dayName,
      });
      const unscheduledWeekdayLabel = getDtrUnscheduledWeekdayBanner({
        isNotScheduledDay,
        indicator: dateIndicator,
        timeFields: tf,
        hasPeriodRecords,
        fullDate,
        dayName,
      });
      const nonWorkingRowTint =
        isNonWorkingDayRow || unscheduledWeekdayLabel
          ? 'rgba(128, 128, 128, 0.06)'
          : rowTint;
      if (isDtrCalendarBannerRow(dateIndicator)) {
        return (
          <tr key={i}>
            <td
              style={{
                ...cellStyle,
                backgroundColor: rowTint,
                position: 'relative',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{day}</div>
            </td>
            <td
              colSpan={6}
              style={{
                ...cellStyle,
                backgroundColor: rowTint,
                textAlign: 'center',
                verticalAlign: 'middle',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <span style={DTR_WM_INLINE_STYLE}>{dateIndicator.label}</span>
            </td>
          </tr>
        );
      }
      if (isNonWorkingDayRow) {
        return (
          <tr key={i}>
            <td
              style={{
                ...cellStyle,
                backgroundColor: nonWorkingRowTint,
                position: 'relative',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{day}</div>
            </td>
            <td
              colSpan={6}
              style={{
                ...cellStyle,
                backgroundColor: nonWorkingRowTint,
                textAlign: 'center',
                verticalAlign: 'middle',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <span style={DTR_WM_INLINE_STYLE}>{DTR_NON_WORKING_DAY_LABEL}</span>
            </td>
          </tr>
        );
      }
      if (unscheduledWeekdayLabel) {
        return (
          <tr key={i}>
            <td
              style={{
                ...cellStyle,
                backgroundColor: nonWorkingRowTint,
                position: 'relative',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{day}</div>
            </td>
            <td
              colSpan={6}
              style={{
                ...cellStyle,
                backgroundColor: nonWorkingRowTint,
                textAlign: 'center',
                verticalAlign: 'middle',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <span style={DTR_WM_INLINE_STYLE}>{unscheduledWeekdayLabel}</span>
            </td>
          </tr>
        );
      }
      if (type === 'regular' && rowIsAbsent) {
        return (
          <tr key={i}>
            <td
              style={{
                ...cellStyle,
                backgroundColor: rowTint,
                position: 'relative',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{day}</div>
            </td>
            <td
              colSpan={6}
              style={{
                ...cellStyle,
                backgroundColor: rowTint,
                textAlign: 'center',
                verticalAlign: 'middle',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <span style={DTR_WM_INLINE_STYLE}>{DTR_ABSENT_LABEL}</span>
            </td>
          </tr>
        );
      }
      return (
        <tr key={i}>
          <td
            style={{
              ...cellStyle,
              backgroundColor: rowTint,
              position: 'relative',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{day}</div>
          </td>
          {type === 'regular' ? (
            <>
              {renderDtrAmPmWatermarkCell(
                tf.timeIN,
                formatTime(tf.timeIN || ''),
                rowTint,
                indicator,
                `r-${i}-0`,
              )}
              {renderDtrAmPmWatermarkCell(
                tf.breaktimeIN,
                formatTime(tf.breaktimeIN || ''),
                rowTint,
                indicator,
                `r-${i}-1`,
              )}
              {renderDtrAmPmWatermarkCell(
                tf.breaktimeOUT,
                formatTime(tf.breaktimeOUT || ''),
                rowTint,
                indicator,
                `r-${i}-2`,
              )}
              {renderDtrAmPmWatermarkCell(
                tf.timeOUT,
                formatTime(tf.timeOUT || ''),
                rowTint,
                indicator,
                `r-${i}-3`,
              )}
              <td
                style={{
                  ...cellStyle,
                  backgroundColor: rowTint,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              >
                <span>{lateDisplay}</span>
              </td>
              <td
                style={{
                  ...cellStyle,
                  backgroundColor: rowTint,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              >
                <span>{undertimeDisplay}</span>
              </td>
            </>
          ) : (
            <>
              {renderDtrAmPmWatermarkCell(
                tf.timeIN,
                formatTime(tf.timeIN || ''),
                rowTint,
                indicator,
                `o-${i}-0`,
              )}
              {renderDtrAmPmWatermarkCell(
                null,
                '',
                rowTint,
                indicator,
                `o-${i}-1`,
              )}
              {renderDtrAmPmWatermarkCell(
                null,
                '',
                rowTint,
                indicator,
                `o-${i}-2`,
              )}
              {renderDtrAmPmWatermarkCell(
                tf.timeOUT,
                formatTime(tf.timeOUT || ''),
                rowTint,
                indicator,
                `o-${i}-3`,
              )}
              <td
                style={{
                  ...cellStyle,
                  backgroundColor: rowTint,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              >
                <span></span>
              </td>
              <td
                style={{
                  ...cellStyle,
                  backgroundColor: rowTint,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              >
                <span></span>
              </td>
            </>
          )}
        </tr>
      );
    });

  const renderDTRTablePair = (
    sourceRecords,
    nameDisplay,
    officialTimesForUser = {},
    employeeNumber = null,
  ) => (
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
      {[0, 1].map((tIdx) => (
        <table
          key={tIdx}
          style={{
            position: 'relative',
            border: '1px solid black',
            borderCollapse: 'collapse',
            width: '49%',
            tableLayout: 'fixed',
          }}
          className="print-visible"
        >
          <DTRColGroup />
          {renderDTRHeader(nameDisplay, dtrType, officialTimesForUser)}
          <tbody>
            {renderDTRRows(
              sourceRecords,
              dtrType,
              employeeNumber,
              officialTimesForUser,
            )}
            {renderDTRFooter()}
          </tbody>
        </table>
      ))}
    </div>
  );

  const renderDTRForModal = (user) => (
    <div className="table-container">
      <div className="table-wrapper" style={{ position: 'relative' }}>
        <img
          src={hrisLogo}
          alt="Watermark"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            opacity: 0.07,
            width: '80%',
            maxWidth: '600px',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0,
          }}
        />
        {renderDTRTablePair(
          user.records,
          user.fullName,
          String(user.employeeNumber) === String(personID)
            ? officialTimes
            : batchOfficialTimesMap[user.employeeNumber] || {},
          user.employeeNumber,
        )}
      </div>
    </div>
  );

  const renderUserDTRTable = (user) => (
    <div
      key={user.employeeNumber}
      ref={(el) => {
        const key = String(user.employeeNumber);
        if (el) bulkDTRRefs.current[key] = el;
        else delete bulkDTRRefs.current[key];
      }}
      style={{
        position: 'absolute',
        left: '-9999px',
        top: '0',
        opacity: 0,
        width: DTR_WIDTH_IN,
        color: 'black',
      }}
      className="bulk-dtr-print"
    >
      {renderDTRForModal(user)}
    </div>
  );

  // ─── Left panel ────────────────────────────────────────────────────────
  const displayEmployee = useMemo(() => {
    if (selectedEmployee) return toProfileEmployee(selectedEmployee);
    const id = String(personID || '').trim();
    if (!id) return null;
    if (employeeName) {
      return { employeeNumber: id, name: employeeName, fullName: employeeName };
    }
    return { employeeNumber: id, name: '' };
  }, [selectedEmployee, personID, employeeName]);

  const renderLeftPanelContent = () => (
    <Box sx={filterPanelScrollSx}>
      <AttendanceFilterSectionLabel icon={AccessTime}>View Mode</AttendanceFilterSectionLabel>
      <AttendanceFilterToggleRow
        options={[
          { val: 'single', label: 'Individual DTR' },
          { val: 'multiple', label: 'Batch Printing' },
        ]}
        value={viewMode}
        onChange={setViewMode}
      />

      <AttendanceFilterSectionLabel icon={PrintIcon}>DTR Type</AttendanceFilterSectionLabel>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '3px',
          mb: 1.25,
        }}
      >
        {[
          { val: 'regular', label: 'Regular' },
          { val: 'honorarium', label: 'Honorarium' },
          { val: 'service-credit', label: 'Service Credit' },
          { val: 'overtime', label: 'Overtime' },
        ].map(({ val, label }) => {
          const isActive = dtrType === val;
          return (
            <Box
              key={val}
              onClick={() => setDtrType(val)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 1,
                py: 0.45,
                borderRadius: '6px',
                cursor: 'pointer',
                border: `1px solid ${isActive ? T.accent : 'transparent'}`,
                bgcolor: isActive ? T.accent : 'transparent',
                transition: 'all 0.14s ease',
                minHeight: 26,
                '&:hover': isActive
                  ? {}
                  : {
                      bgcolor: T.accentFaint,
                      border: `1px solid ${T.accentBorder}`,
                    },
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.68rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#fff' : T.text,
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {label}
              </Typography>
              {isActive && (
                <Box
                  sx={{
                    width: 3,
                    height: 3,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.7)',
                    flexShrink: 0,
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>

      {viewMode === 'single' && (
        <Box sx={{ mb: 1.25 }}>
          <AttendanceEmployeeSearchSection selected={Boolean(displayEmployee)}>
            <AttendanceEmployeeSearchField
              searchApi="users"
              value={personID}
              selectedEmployee={selectedEmployee}
              onLoadingChange={setEmployeeSearchLoading}
              onSelectEmployee={(emp, num) => {
                if (emp) {
                  setSelectedEmployee(emp);
                  setPersonID(num || '');
                  return;
                }
                setPersonID(num || '');
                if (!num) {
                  setSelectedEmployee(null);
                  setHasSearchedSingle(false);
                  setRecords([]);
                  setEmployeeName('');
                }
              }}
              onClear={() => {
                setPersonID('');
                setSelectedEmployee(null);
                setHasSearchedSingle(false);
                setRecords([]);
                setEmployeeName('');
              }}
              deptMap={departmentAssignmentsMap}
              empCatMap={empCatMap}
              sexMap={sexMap}
            />
          </AttendanceEmployeeSearchSection>
          {displayEmployee && (
            <Box sx={{ mb: 0.75 }}>
              <EmployeeProfileCard
                employee={displayEmployee}
                deptMap={departmentAssignmentsMap}
                empCatMap={empCatMap}
                sexMap={sexMap}
                loading={employeeSearchLoading || monthLoading}
              />
            </Box>
          )}
        </Box>
      )}

      <AttendanceFilterDateControls
        selectedYear={selectedYear}
        onYearChange={(e) => {
          setSelectedYear(parseInt(e.target.value));
          setSelectedMonth(null);
          setHasSearchedSingle(false);
          setRecords([]);
          setEmployeeName('');
          setSnackbar({
            open: true,
            message: 'Year changed — select month and click Search to load records.',
            severity: 'info',
          });
        }}
        yearOptions={yearOptions}
        selectedMonth={selectedMonth}
        onMonthClick={handleMonthClick}
        onMonthClear={() => {
          setSelectedMonth(null);
          setHasSearchedSingle(false);
          setRecords([]);
          setEmployeeName('');
          setStartDate('');
          setEndDate('');
          setAllUsersDTR([]);
          setBatchOfficialTimesMap({});
        }}
        onQuickDate={handleQuickDateSelect}
        months={monthsShort}
      />

      {/* ── Show official time checkbox ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          mt: 2,
          mb: 0.5,
          px: 1,
          py: 0.75,
          borderRadius: '8px',
          border: `1px solid ${showOfficialTimeOnDtr ? T.accent : T.accentBorder}`,
          bgcolor: showOfficialTimeOnDtr
            ? alpha(T.accent, 0.06)
            : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          '&:hover': {
            bgcolor: alpha(T.accent, 0.05),
            border: `1px solid ${T.accent}`,
          },
        }}
        onClick={() => setShowOfficialTimeOnDtr((v) => !v)}
        className="no-print"
      >
        <Checkbox
          size="small"
          checked={showOfficialTimeOnDtr}
          onChange={(e) => {
            e.stopPropagation();
            setShowOfficialTimeOnDtr(e.target.checked);
          }}
          sx={{
            p: 0,
            color: alpha(T.accent, 0.5),
            '&.Mui-checked': { color: T.accent },
          }}
        />
        <Typography
          sx={{
            fontSize: '0.78rem',
            fontWeight: 600,
            color: showOfficialTimeOnDtr ? T.accent : T.text,
            lineHeight: 1.3,
            userSelect: 'none',
          }}
        >
          Show official time on DTR
        </Typography>
      </Box>

      {viewMode === 'multiple' && (
        <Box
          sx={{
            mt: 2,
            mb: 2.5,
            p: 1.5,
            borderRadius: 2,
            bgcolor: T.accentFaint,
            border: `1px solid ${T.accentBorder}`,
          }}
        >
          <Typography
            sx={{
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: alpha(T.accent, 0.6),
              mb: 0.5,
            }}
          >
            Batch Summary
          </Typography>
          <Typography
            sx={{
              fontSize: '0.9rem',
              fontWeight: 800,
              color: T.text,
              lineHeight: 1.3,
            }}
          >
            {loadingAllUsers
              ? '—'
              : `${filteredUsers.length} ${filteredUsers.length === 1 ? 'employee' : 'employees'} found`}
          </Typography>
          {!loadingAllUsers && (
            <Typography sx={{ fontSize: '0.75rem', color: T.muted, mt: 0.4 }}>
              Use the filters on the right to narrow the batch before printing.
            </Typography>
          )}
        </Box>
      )}

      {/* Individual-only: employee number field */}
      {viewMode === 'single' && (
        <Box sx={{ mt: 2.5 }}>
          <AccentButton
            variant="contained"
            fullWidth
            onClick={() => {
              try {
                logDtrOverallSearch({
                  targetEmployeeNumber: String(personID).trim() || '#all-users',
                  targetUsername:
                    selectedEmployee?.username || String(personID).trim(),
                  periodStart: startDate,
                  periodEnd: endDate,
                  monthLabel: buildAuditPeriodLabel({
                    selectedMonth,
                    monthNames: monthsShort,
                    selectedYear,
                    startDate,
                    endDate,
                  }),
                  recordsCount: null,
                });
              } catch (e) {
                console.error('Audit log failed', e);
              }
              handleSingleSearch();
            }}
            startIcon={<SearchOutlined sx={{ fontSize: '16px !important' }} />}
            sx={{
              bgcolor: T.accent,
              color: '#fff',
              boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`,
              '&:hover': { bgcolor: T.accentDark },
            }}
          >
            Search
          </AccentButton>
        </Box>
      )}
    </Box>
  );

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <>
      <LoadingOverlay
        open={loadingOverlayOpen}
        message={loadingOverlayMessage}
        showDelayMs={printingAll || singlePrintLoading ? 0 : 150}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      {!accessLoading && (
        <Fade in timeout={500}>
          <Box>
            <style>{`
              html, body { overflow: hidden; }
              @page { size: A4; margin: 0; }
              @media print {
                .no-print { display: none !important; }
                .header,.top-banner,header,footer,.MuiDrawer-root,.MuiAppBar-root { display: none !important; }
                html,body { width: 21cm; height: 29.7cm; margin: 0; padding: 0; background: white; }
                .MuiContainer-root { max-width: 100% !important; width: 21cm !important; margin: 0 auto !important; padding: 0 !important; background: white !important; }
                .table-container { width: 100% !important; display: block !important; background: transparent !important; }
                .table-wrapper { display: flex !important; justify-content: center !important; }
                .table-side-by-side { display: flex !important; flex-direction: row !important; gap: 1.5% !important; width: 100% !important; }
                .table-side-by-side table { width: 47% !important; border: 1px solid black !important; border-collapse: collapse !important; background: white !important; }
                table { page-break-inside: avoid !important; table-layout: fixed !important; }
                table td, table th { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                .bulk-dtr-print { display: none !important; }
              }
            `}</style>

            <Box sx={ATTENDANCE_COMPACT_PAGE_SX}>
              {/* ── Page Header ── */}
              <SectionCard
                className="no-print"
                sx={{ mb: 2, overflow: 'hidden' }}
              >
                <Box
                  sx={{
                    px: 4,
                    py: 3,
                    background:
                      'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
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
                      borderRadius: '50%',
                      background:
                        'radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -30,
                      left: '30%',
                      width: 150,
                      height: 150,
                      borderRadius: '50%',
                      background:
                        'radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)',
                    }}
                  />
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <AccessTime sx={{ fontSize: 32, color: T.accent }} />
                    <Box>
                      <Typography
                        sx={{
                          fontSize: '1.25rem',
                          fontWeight: 900,
                          color: T.accent,
                          lineHeight: 1.2,
                          mb: 0.3,
                        }}
                      >
                        Daily Time Record
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.82rem',
                          color: T.accentMid,
                          fontWeight: 700,
                          opacity: 0.9,
                        }}
                      >
                        Central hub — Device → DTR → Summary. Use Modification
                        only when punch data needs editing.
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <AttendanceWorkflowNav
                      inline
                      prevStep={prevStep}
                      nextStep={nextStep}
                      onPrevious={goPrevious}
                      onNext={handleHubNext}
                    />
                    {viewMode === 'multiple' && allUsersDTR.length > 0 && (
                      <Box
                        sx={{
                          px: 2.5,
                          py: 0.75,
                          borderRadius: 6,
                          bgcolor: alpha(T.accent, 0.1),
                          border: `1px solid ${alpha(T.accent, 0.2)}`,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.8rem',
                            color: T.accent,
                            fontWeight: 700,
                          }}
                        >
                          {allUsersDTR.length} employees
                        </Typography>
                      </Box>
                    )}
                    {viewMode === 'single' && records.length > 0 && (
                      <Box
                        sx={{
                          px: 2.5,
                          py: 0.75,
                          borderRadius: 6,
                          bgcolor: alpha(T.accent, 0.1),
                          border: `1px solid ${alpha(T.accent, 0.2)}`,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.8rem',
                            color: T.accent,
                            fontWeight: 700,
                          }}
                        >
                          {records.length} records
                        </Typography>
                      </Box>
                    )}
                    <Tooltip title="Refresh Page">
                      <IconButton
                        onClick={() => window.location.reload()}
                        sx={{
                          bgcolor: alpha(T.accent, 0.08),
                          color: T.accent,
                          width: 36,
                          height: 36,
                          '&:hover': { bgcolor: alpha(T.accent, 0.15) },
                        }}
                      >
                        <Refresh sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </SectionCard>

              {/* ── Two-column layout ── */}
              <Grid container spacing={2}>
                {/* LEFT: Sidebar */}
                <Grid item xs={12} lg={3} className="no-print">
                  <SectionCard sx={filterSidebarCardSx}>
                    <AttendanceFilterHeader />
                    {renderLeftPanelContent()}
                  </SectionCard>
                </Grid>

                {/* RIGHT: Content */}
                <Grid item xs={12} lg={9}>
                  <SectionCard
                    sx={{
                      ...attendanceMainPanelHeightSx,
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                    }}
                  >
                    {/* ── INDIVIDUAL DTR VIEW ── */}
                    {viewMode === 'single' && (
                      <>
                        <Box
                          sx={{
                            px: 3.5,
                            py: 2,
                            borderBottom: `1px solid ${T.divider}`,
                            bgcolor: T.accentFaint,
                            flexShrink: 0,
                          }}
                          className="no-print"
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                              }}
                            >
                              <AccessTime
                                sx={{ fontSize: 15, color: T.accent }}
                              />
                              <Typography
                                sx={{
                                  fontSize: '0.88rem',
                                  fontWeight: 700,
                                  color: T.text,
                                }}
                              >
                                DTR Preview
                              </Typography>
                              {selectedMonth !== null && employeeName && (
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: 4,
                                      height: 4,
                                      borderRadius: '50%',
                                      bgcolor: T.faint,
                                    }}
                                  />
                                  <Typography
                                    sx={{
                                      fontSize: '0.78rem',
                                      color: T.muted,
                                      fontWeight: 500,
                                    }}
                                  >
                                    {employeeName}
                                  </Typography>
                                  <Box
                                    sx={{
                                      fontSize: '0.65rem',
                                      fontWeight: 700,
                                      color: T.accent,
                                      bgcolor: alpha(T.accent, 0.08),
                                      border: `1px solid ${T.accentBorder}`,
                                      borderRadius: '5px',
                                      px: '6px',
                                      py: '2px',
                                    }}
                                  >
                                    {monthsShort[selectedMonth]}
                                  </Box>
                                </Box>
                              )}
                            </Box>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                flexShrink: 0,
                                flexWrap: 'wrap',
                                justifyContent: 'flex-end',
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: '0.7rem',
                                  color: T.faint,
                                  display: { xs: 'none', lg: 'block' },
                                }}
                              >
                                Hub tools:
                              </Typography>
                              <Tooltip
                                title="Open Official Time Schedule without leaving this page"
                                placement="top"
                              >
                                <span>
                                  <AccentButton
                                    variant="contained"
                                    size="small"
                                    startIcon={
                                      <Schedule
                                        sx={{ fontSize: '15px !important' }}
                                      />
                                    }
                                    onClick={() =>
                                      setModuleDrawer('officialTime')
                                    }
                                    sx={{
                                      height: 32,
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      px: 1.5,
                                      bgcolor: T.accent,
                                      color: '#fff',
                                      boxShadow: `0 2px 8px ${alpha(T.accent, 0.3)}`,
                                      '&:hover': { bgcolor: T.accentDark },
                                    }}
                                  >
                                    Official Time
                                  </AccentButton>
                                </span>
                              </Tooltip>
                              <Tooltip
                                title="Edit punch times when device data needs correction (optional step)"
                                placement="top"
                              >
                                <span>
                                  <AccentButton
                                    variant="contained"
                                    size="small"
                                    startIcon={
                                      <Edit sx={{ fontSize: '15px !important' }} />
                                    }
                                    onClick={() =>
                                      setModuleDrawer('modification')
                                    }
                                    sx={{
                                      height: 32,
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      px: 1.5,
                                      bgcolor: T.accent,
                                      color: '#fff',
                                      boxShadow: `0 2px 8px ${alpha(T.accent, 0.3)}`,
                                      '&:hover': { bgcolor: T.accentDark },
                                    }}
                                  >
                                    Modification
                                  </AccentButton>
                                </span>
                              </Tooltip>
                              <Divider
                                orientation="vertical"
                                flexItem
                                sx={{
                                  mx: 0.25,
                                  borderColor: T.accentBorder,
                                  display: { xs: 'none', md: 'block' },
                                }}
                              />
                              <Typography
                                sx={{
                                  fontSize: '0.7rem',
                                  color: T.faint,
                                  display: { xs: 'none', lg: 'block' },
                                }}
                              >
                                Apply Late/UT:
                              </Typography>
                              {appliedLateUtLabel && (
                                <Chip
                                  size="small"
                                  label={`Applied: ${appliedLateUtLabel}`}
                                  sx={{
                                    height: 22,
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    bgcolor: appliedLateUtColor,
                                    color: '#fff',
                                    display: { xs: 'none', md: 'inline-flex' },
                                  }}
                                />
                              )}
                              {HUB_COMPUTATION_BUTTONS.map((btn) => {
                                const isLoading =
                                  lateComputeLoading === btn.moduleType;
                                const isApplied =
                                  appliedLateUtModuleType === btn.moduleType;
                                const categoryColor =
                                  btn.categoryColor || T.accent;
                                const disabled =
                                  !personID ||
                                  !hasSearchedSingle ||
                                  Boolean(lateComputeLoading);
                                return (
                                  <Tooltip
                                    key={`apply-${btn.drawer}`}
                                    title={
                                      isApplied
                                        ? `${btn.label} — currently applied to DTR late/undertime`
                                        : btn.applyTip
                                    }
                                    placement="top"
                                  >
                                    <span>
                                      <AccentButton
                                        variant="outlined"
                                        size="small"
                                        disabled={disabled}
                                        startIcon={
                                          isLoading ? (
                                            <CircularProgress
                                              size={14}
                                              sx={{ color: 'inherit' }}
                                            />
                                          ) : (
                                            <AccessTime
                                              sx={{
                                                fontSize: '15px !important',
                                              }}
                                            />
                                          )
                                        }
                                        onClick={() =>
                                          applyModuleLateUndertime(
                                            btn.moduleType,
                                          )
                                        }
                                        sx={{
                                          height: 32,
                                          fontSize: '0.72rem',
                                          fontWeight: 700,
                                          px: 1.25,
                                          ...(isApplied
                                            ? {
                                                bgcolor: categoryColor,
                                                color: '#fff',
                                                borderColor: categoryColor,
                                                boxShadow: `0 2px 8px ${alpha(categoryColor, 0.35)}`,
                                                '&:hover': {
                                                  bgcolor: categoryColor,
                                                  filter: 'brightness(0.92)',
                                                  borderColor: categoryColor,
                                                },
                                                '&.Mui-focusVisible': {
                                                  bgcolor: categoryColor,
                                                  borderColor: categoryColor,
                                                },
                                              }
                                            : {
                                                color: categoryColor,
                                                borderColor: alpha(
                                                  categoryColor,
                                                  0.45,
                                                ),
                                                bgcolor: alpha(
                                                  categoryColor,
                                                  0.1,
                                                ),
                                                '&:hover': {
                                                  bgcolor: alpha(
                                                    categoryColor,
                                                    0.18,
                                                  ),
                                                  borderColor: categoryColor,
                                                },
                                              }),
                                          '&.Mui-disabled': { opacity: 0.55 },
                                        }}
                                      >
                                        {btn.label}
                                      </AccentButton>
                                    </span>
                                  </Tooltip>
                                );
                              })}
                            </Box>
                          </Box>
                        </Box>

                        {personID && hasSearchedSingle && !hasOfficialTimeSchedule && (
                          <Alert
                            severity="warning"
                            sx={{ mx: 2, mt: 1.5, borderRadius: 2, fontSize: '0.78rem' }}
                            action={
                              <Button
                                color="inherit"
                                size="small"
                                onClick={() => setModuleDrawer('officialTime')}
                                sx={{ fontWeight: 700, textTransform: 'none' }}
                              >
                                Open Official Time
                              </Button>
                            }
                          >
                            No Official Time schedule for this employee/period.
                            Set official time before computation or late/undertime.
                          </Alert>
                        )}

                        <Box
                          sx={{
                            flexGrow: 1,
                            overflowY: 'auto',
                            position: 'relative',
                            ...scrollbarSx,
                          }}
                        >
                          {selectedMonth === null ||
                          !personID ||
                          !hasSearchedSingle ? (
                            <Box sx={{ py: 10, textAlign: 'center' }}>
                              <Box
                                sx={{
                                  width: 72,
                                  height: 72,
                                  borderRadius: '50%',
                                  bgcolor: T.accentFaint,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  mx: 'auto',
                                  mb: 2,
                                }}
                              >
                                <CalendarToday
                                  sx={{
                                    fontSize: 32,
                                    color: alpha(T.accent, 0.3),
                                  }}
                                />
                              </Box>
                              <Typography
                                sx={{
                                  fontSize: '0.9rem',
                                  fontWeight: 600,
                                  color: T.muted,
                                  mb: 0.5,
                                }}
                              >
                                Select a DTR Period
                              </Typography>
                              <Typography
                                sx={{ fontSize: '0.78rem', color: T.faint }}
                              >
                                {!personID
                                  ? 'Enter an employee number and select a month from the left panel.'
                                  : !hasSearchedSingle
                                    ? 'Click Search to load records for the selected month.'
                                    : 'Choose a month from the left panel to view the DTR.'}
                              </Typography>
                            </Box>
                          ) : (
                            <Fade in timeout={250}>
                              <Box
                                sx={{
                                  bgcolor: '#f4f0f0',
                                  p: 2.5,
                                  display: 'flex',
                                  justifyContent: 'center',
                                  position: 'relative',
                                }}
                              >
                                <Paper
                                  elevation={2}
                                  sx={{
                                    p: 2,
                                    borderRadius: '8px',
                                    bgcolor: '#fff',
                                    position: 'relative',
                                    boxSizing: 'border-box',
                                    overflowX: 'auto',
                                    width: '100%',
                                    opacity: singlePrintLoading ? 0 : 1,
                                    pointerEvents: singlePrintLoading
                                      ? 'none'
                                      : 'auto',
                                  }}
                                >
                                  <Box sx={{ overflowX: 'auto' }}>
                                    <div
                                      className="table-container"
                                      ref={dtrRef}
                                    >
                                      <div
                                        className="table-wrapper"
                                        style={{ position: 'relative' }}
                                      >
                                        <img
                                          src={hrisLogo}
                                          alt="Watermark"
                                          style={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%,-50%)',
                                            opacity: 0.07,
                                            width: '80%',
                                            maxWidth: '600px',
                                            pointerEvents: 'none',
                                            userSelect: 'none',
                                            zIndex: 0,
                                          }}
                                        />
                                        {renderDTRTablePair(
                                          records,
                                          employeeName,
                                          officialTimes,
                                          personID,
                                        )}
                                      </div>
                                    </div>
                                  </Box>
                                </Paper>
                              </Box>
                            </Fade>
                          )}
                        </Box>

                        {personID && hasSearchedSingle && (
                          <Box
                            className="no-print"
                            sx={{
                              px: 2,
                              pt: 1.5,
                              pb: 0.5,
                              flexShrink: 0,
                              borderTop: `1px solid ${T.divider}`,
                            }}
                          >
                            <DtrSavedSummaryPanel
                              key={summaryRefreshKey}
                              personID={personID}
                              startDate={startDate}
                              endDate={endDate}
                              computationButtons={HUB_COMPUTATION_BUTTONS}
                              onOpenComputation={openComputationDrawer}
                              activeDrawer={activeComputationDrawer}
                            />
                          </Box>
                        )}

                        {selectedMonth !== null && records.length > 0 && (
                          <Box
                            className="no-print"
                            sx={{
                              px: 3.5,
                              py: 1.25,
                              borderTop: `1px solid ${T.divider}`,
                              bgcolor: T.accentFaint,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 1.5,
                              flexShrink: 0,
                              flexWrap: 'wrap',
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.25,
                                minWidth: 0,
                                flex: 1,
                              }}
                            >
                              <Tooltip
                                placement="top"
                                title={
                                  <Box
                                    sx={{
                                      p: 0.5,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 1,
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontWeight: 700,
                                        fontSize: '11px',
                                        letterSpacing: '0.05em',
                                      }}
                                    >
                                      LEGEND
                                    </Typography>
                                    {[
                                      {
                                        label: 'Holiday',
                                        bg: 'rgba(237,108,2,0.25)',
                                        border: '#ed6c02',
                                      },
                                      {
                                        label: 'Suspension',
                                        bg: 'rgba(211,47,47,0.2)',
                                        border: '#d32f2f',
                                      },
                                      {
                                        label: 'On Leave',
                                        bg: 'rgba(46,125,50,0.2)',
                                        border: '#2e7d32',
                                      },
                                    ].map(({ label, bg, border }) => (
                                      <Box
                                        key={label}
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 1,
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            width: 28,
                                            height: 16,
                                            backgroundColor: bg,
                                            border: `1.5px solid ${border}`,
                                            borderRadius: '3px',
                                            flexShrink: 0,
                                          }}
                                        />
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            fontSize: '11px',
                                            fontWeight: 500,
                                          }}
                                        >
                                          {label}
                                        </Typography>
                                      </Box>
                                    ))}
                                  </Box>
                                }
                                arrow
                                componentsProps={{
                                  tooltip: {
                                    sx: {
                                      bgcolor: 'white',
                                      color: '#333',
                                      boxShadow:
                                        '0 4px 20px rgba(0,0,0,0.15)',
                                      border: '1px solid #e0e0e0',
                                      borderRadius: '10px',
                                      p: 1.5,
                                    },
                                  },
                                  arrow: { sx: { color: 'white' } },
                                }}
                              >
                                <AccentButton
                                  variant="contained"
                                  size="small"
                                  aria-label="Color legend"
                                  sx={{
                                    minWidth: 32,
                                    width: 32,
                                    height: 32,
                                    p: 0,
                                    fontSize: '0.85rem',
                                    fontWeight: 800,
                                    bgcolor: T.accent,
                                    color: '#fff',
                                    boxShadow: `0 2px 8px ${alpha(T.accent, 0.3)}`,
                                    '&:hover': { bgcolor: T.accentDark },
                                  }}
                                >
                                  ?
                                </AccentButton>
                              </Tooltip>
                              <PictureAsPdfIcon
                                sx={{
                                  fontSize: 13,
                                  color: alpha(T.accent, 0.45),
                                  flexShrink: 0,
                                }}
                              />
                              <Typography
                                sx={{ fontSize: '0.7rem', color: T.faint }}
                              >
                                Download generates a PDF of the DTR for{' '}
                                {employeeName} — {monthsShort[selectedMonth]}{' '}
                                {selectedYear}
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
                              <Tooltip title="Print this Daily Time Record" placement="top">
                                <span>
                                  <AccentButton
                                    variant="contained"
                                    size="small"
                                    aria-label="Print DTR"
                                    startIcon={
                                      <PrintIcon
                                        sx={{ fontSize: '15px !important' }}
                                      />
                                    }
                                    onClick={() => {
                                      try {
                                        logAttendanceModuleAction({
                                          module:
                                            ATTENDANCE_AUDIT_MODULES.DTR_OVERALL,
                                          auditButton: 'Print',
                                          targetEmployeeNumber:
                                            String(personID) || '#all-users',
                                          targetEmployeeName:
                                            employeeName || null,
                                          targetUsername:
                                            selectedEmployee?.username || null,
                                          periodStart: startDate,
                                          periodEnd: endDate,
                                          monthLabel: buildAuditPeriodLabel({
                                            selectedMonth,
                                            monthNames: monthsShort,
                                            selectedYear,
                                            startDate,
                                            endDate,
                                          }),
                                          auditEvent: 'dtr_overall_print',
                                        });
                                      } catch (e) {
                                        console.error('Audit log failed', e);
                                      }
                                      printPage();
                                    }}
                                    sx={{
                                      height: 32,
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      px: 1.5,
                                      bgcolor: T.accent,
                                      color: '#fff',
                                      boxShadow: `0 2px 8px ${alpha(T.accent, 0.3)}`,
                                      '&:hover': { bgcolor: T.accentDark },
                                    }}
                                  >
                                    Print DTR
                                  </AccentButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Download this DTR as a PDF file" placement="top">
                                <span>
                                  <AccentButton
                                    variant="contained"
                                    size="small"
                                    startIcon={
                                      <PictureAsPdfIcon
                                        sx={{ fontSize: '15px !important' }}
                                      />
                                    }
                                    onClick={() => {
                                      try {
                                        logAttendanceModuleAction({
                                          module:
                                            ATTENDANCE_AUDIT_MODULES.DTR_OVERALL,
                                          auditButton: 'Download PDF',
                                          targetEmployeeNumber:
                                            String(personID) || '#all-users',
                                          targetEmployeeName:
                                            employeeName || null,
                                          targetUsername:
                                            selectedEmployee?.username || null,
                                          periodStart: startDate,
                                          periodEnd: endDate,
                                          monthLabel: buildAuditPeriodLabel({
                                            selectedMonth,
                                            monthNames: monthsShort,
                                            selectedYear,
                                            startDate,
                                            endDate,
                                          }),
                                          auditEvent: 'dtr_overall_download',
                                        });
                                      } catch (e) {
                                        console.error('Audit log failed', e);
                                      }
                                      downloadPDF();
                                    }}
                                    sx={{
                                      height: 32,
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      px: 1.5,
                                      bgcolor: T.accent,
                                      color: '#fff',
                                      boxShadow: `0 2px 8px ${alpha(T.accent, 0.3)}`,
                                      '&:hover': { bgcolor: T.accentDark },
                                    }}
                                  >
                                    Download PDF
                                  </AccentButton>
                                </span>
                              </Tooltip>
                            </Box>
                          </Box>
                        )}
                      </>
                    )}

                    {/* ── BATCH PRINTING VIEW ── */}
                    {viewMode === 'multiple' && (
                      <>
                        <Box
                          sx={{
                            px: 3.5,
                            py: 2,
                            borderBottom: `1px solid ${T.divider}`,
                            bgcolor: T.accentFaint,
                            flexShrink: 0,
                          }}
                          className="no-print"
                        >
                          <Box
                            sx={{
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
                              }}
                            >
                              <PrintIcon
                                sx={{ fontSize: 15, color: T.accent }}
                              />
                              <Typography
                                sx={{
                                  fontSize: '0.88rem',
                                  fontWeight: 700,
                                  color: T.text,
                                }}
                              >
                                Batch Printing
                              </Typography>
                              {allUsersDTR.length > 0 && (
                                <Box
                                  sx={{
                                    px: 1.5,
                                    py: 0.3,
                                    borderRadius: 6,
                                    bgcolor: alpha(T.accent, 0.08),
                                    border: `1px solid ${T.accentBorder}`,
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: '0.7rem',
                                      color: T.accent,
                                      fontWeight: 700,
                                    }}
                                  >
                                    {filteredUsers.length} users
                                  </Typography>
                                </Box>
                              )}
                              {!!loadPhase && !loadingAllUsers && (
                                <Typography
                                  sx={{
                                    fontSize: '0.72rem',
                                    color: T.muted,
                                    fontWeight: 600,
                                  }}
                                >
                                  {loadPhase}
                                </Typography>
                              )}
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip
                                title="Reload all users DTR"
                                placement="top"
                              >
                                <IconButton
                                  size="small"
                                  onClick={fetchAllUsersDTR}
                                  disabled={
                                    loadingAllUsers || !startDate || !endDate
                                  }
                                  sx={{
                                    bgcolor: alpha(T.accent, 0.08),
                                    border: `1px solid ${T.accentBorder}`,
                                    color: T.accent,
                                    width: 32,
                                    height: 32,
                                    '&:hover': {
                                      bgcolor: alpha(T.accent, 0.15),
                                    },
                                    '&:disabled': { opacity: 0.4 },
                                  }}
                                >
                                  <Refresh sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                              {selectedUsers.size > 0 && (
                                <AccentButton
                                  variant="contained"
                                  size="small"
                                  startIcon={
                                    <PrintIcon
                                      sx={{ fontSize: '13px !important' }}
                                    />
                                  }
                                  onClick={handleBulkPrint}
                                  sx={{
                                    fontSize: '0.78rem',
                                    bgcolor: T.accent,
                                    color: '#fff',
                                    boxShadow: `0 2px 8px ${alpha(T.accent, 0.3)}`,
                                    '&:hover': { bgcolor: T.accentDark },
                                  }}
                                >
                                  Bulk Print ({selectedUsers.size})
                                </AccentButton>
                              )}
                            </Box>
                          </Box>
                        </Box>

                        {allUsersDTR.length > 0 ? (
                          <>
                            {/* Filters bar */}
                            <Box
                              sx={{
                                px: 3,
                                py: 1.5,
                                borderBottom: `1px solid ${T.divider}`,
                                bgcolor: alpha(T.accent, 0.02),
                                flexShrink: 0,
                              }}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  gap: 1,
                                  flexWrap: 'wrap',
                                  mb: 1,
                                }}
                              >
                                <FieldInput
                                  size="small"
                                  placeholder="Search by name or employee number…"
                                  value={searchQuery}
                                  onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                  }}
                                  sx={{ flex: 1, minWidth: 200 }}
                                  InputProps={{
                                    startAdornment: (
                                      <InputAdornment position="start">
                                        <SearchOutlined
                                          sx={{ fontSize: 16, color: T.muted }}
                                        />
                                      </InputAdornment>
                                    ),
                                    endAdornment: searchQuery ? (
                                      <InputAdornment position="end">
                                        <IconButton
                                          size="small"
                                          onClick={() => {
                                            setSearchQuery('');
                                            setCurrentPage(1);
                                          }}
                                          sx={{ p: 0.25 }}
                                        >
                                          <Close
                                            sx={{
                                              fontSize: 16,
                                              color: T.faint,
                                            }}
                                          />
                                        </IconButton>
                                      </InputAdornment>
                                    ) : null,
                                  }}
                                />
                                <FormControl
                                  size="small"
                                  sx={{ minWidth: 130 }}
                                >
                                  <Select
                                    value={recordFilter}
                                    onChange={(e) => {
                                      setRecordFilter(e.target.value);
                                      setCurrentPage(1);
                                    }}
                                    sx={selectSx}
                                    displayEmpty
                                  >
                                    <MenuItem
                                      value="all"
                                      sx={{ fontSize: '0.82rem' }}
                                    >
                                      All Records
                                    </MenuItem>
                                    <MenuItem
                                      value="has"
                                      sx={{ fontSize: '0.82rem' }}
                                    >
                                      Has Records
                                    </MenuItem>
                                    <MenuItem
                                      value="no"
                                      sx={{ fontSize: '0.82rem' }}
                                    >
                                      No Records
                                    </MenuItem>
                                  </Select>
                                </FormControl>
                                <FormControl
                                  size="small"
                                  sx={{ minWidth: 140 }}
                                >
                                  <Select
                                    value={departmentFilter}
                                    onChange={(e) => {
                                      setDepartmentFilter(e.target.value);
                                      setCurrentPage(1);
                                    }}
                                    sx={selectSx}
                                    displayEmpty
                                    renderValue={(v) => v || 'All Depts'}
                                  >
                                    <MenuItem
                                      value=""
                                      sx={{ fontSize: '0.82rem' }}
                                    >
                                      All Departments
                                    </MenuItem>
                                    {departments.map((d) => (
                                      <MenuItem
                                        key={d.code}
                                        value={d.code}
                                        sx={{ fontSize: '0.82rem' }}
                                      >
                                        {d.code}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                                <FormControl
                                  size="small"
                                  sx={{ minWidth: 160 }}
                                >
                                  <Select
                                    value={employmentCategoryFilter}
                                    onChange={(e) => {
                                      setEmploymentCategoryFilter(
                                        e.target.value,
                                      );
                                      setCurrentPage(1);
                                    }}
                                    sx={selectSx}
                                    displayEmpty
                                    renderValue={(v) =>
                                      v !== ''
                                        ? getCategoryLabel(v)
                                        : 'All Categories'
                                    }
                                  >
                                    <MenuItem
                                      value=""
                                      sx={{ fontSize: '0.82rem' }}
                                    >
                                      All Categories
                                    </MenuItem>
                                    {EMPLOYMENT_CATEGORY_OPTIONS.map(
                                      (option) => (
                                        <MenuItem
                                          key={option.value}
                                          value={option.value}
                                          sx={{ fontSize: '0.82rem' }}
                                        >
                                          {option.label}
                                        </MenuItem>
                                      ),
                                    )}
                                  </Select>
                                </FormControl>
                              </Box>
                              <Box
                                sx={{
                                  display: 'flex',
                                  gap: 1,
                                  flexWrap: 'wrap',
                                  alignItems: 'center',
                                }}
                              >
                                <Box sx={{ display: 'flex', gap: 0.75 }}>
                                  {['all', 'printed', 'unprinted'].map(
                                    (val) => (
                                      <Box
                                        key={val}
                                        onClick={() => {
                                          setPrintStatusFilter(val);
                                          setCurrentPage(1);
                                        }}
                                        sx={{
                                          px: 1.5,
                                          py: 0.4,
                                          borderRadius: '20px',
                                          cursor: 'pointer',
                                          fontSize: '0.75rem',
                                          fontWeight: 600,
                                          bgcolor:
                                            printStatusFilter === val
                                              ? T.accent
                                              : alpha(T.accent, 0.07),
                                          color:
                                            printStatusFilter === val
                                              ? '#fff'
                                              : T.accent,
                                          border: `1px solid ${printStatusFilter === val ? T.accent : T.accentBorder}`,
                                          transition: 'all 0.15s',
                                        }}
                                      >
                                        {val.charAt(0).toUpperCase() +
                                          val.slice(1)}
                                      </Box>
                                    ),
                                  )}
                                </Box>
                                <FormControl
                                  size="small"
                                  sx={{ minWidth: 160 }}
                                >
                                  <Select
                                    value={registrationStatusFilter}
                                    onChange={(e) => {
                                      setRegistrationStatusFilter(
                                        e.target.value,
                                      );
                                      setCurrentPage(1);
                                    }}
                                    sx={selectSx}
                                    displayEmpty
                                    renderValue={(v) => v || 'All Status'}
                                  >
                                    <MenuItem
                                      value=""
                                      sx={{ fontSize: '0.82rem' }}
                                    >
                                      All Status
                                    </MenuItem>
                                    <MenuItem
                                      value="Registered"
                                      sx={{ fontSize: '0.82rem' }}
                                    >
                                      🟢 Registered (
                                      {registrationStatusCounts['Registered']})
                                    </MenuItem>
                                    <MenuItem
                                      value="Not Registered"
                                      sx={{ fontSize: '0.82rem' }}
                                    >
                                      🟠 Not Registered (
                                      {
                                        registrationStatusCounts[
                                          'Not Registered'
                                        ]
                                      }
                                      )
                                    </MenuItem>
                                  </Select>
                                </FormControl>
                                <FormControl size="small" sx={{ minWidth: 80 }}>
                                  <Select
                                    value={rowsPerPage}
                                    onChange={(e) => {
                                      setRowsPerPage(Number(e.target.value));
                                      setCurrentPage(1);
                                    }}
                                    sx={selectSx}
                                  >
                                    {[10, 20, 50, 100].map((n) => (
                                      <MenuItem
                                        key={n}
                                        value={n}
                                        sx={{ fontSize: '0.82rem' }}
                                      >
                                        {n} rows
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    ml: 'auto',
                                  }}
                                >
                                  {[
                                    {
                                      label: '«',
                                      fn: () => goToPage(1),
                                      dis: currentPage === 1,
                                    },
                                    {
                                      label: '‹',
                                      fn: () => goToPage(currentPage - 1),
                                      dis: currentPage === 1,
                                    },
                                  ].map(({ label, fn, dis }) => (
                                    <IconButton
                                      key={label}
                                      size="small"
                                      onClick={fn}
                                      disabled={dis}
                                      sx={{
                                        width: 28,
                                        height: 28,
                                        color: T.accent,
                                        border: `1px solid ${T.accentBorder}`,
                                        borderRadius: '6px',
                                        '&:disabled': { opacity: 0.35 },
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontSize: '0.8rem',
                                          lineHeight: 1,
                                        }}
                                      >
                                        {label}
                                      </Typography>
                                    </IconButton>
                                  ))}
                                  <Typography
                                    sx={{
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      color: T.muted,
                                      minWidth: 60,
                                      textAlign: 'center',
                                    }}
                                  >
                                    {currentPage} / {totalPageCount}
                                  </Typography>
                                  {[
                                    {
                                      label: '›',
                                      fn: () => goToPage(currentPage + 1),
                                      dis: currentPage === totalPageCount,
                                    },
                                    {
                                      label: '»',
                                      fn: () => goToPage(totalPageCount),
                                      dis: currentPage === totalPageCount,
                                    },
                                  ].map(({ label, fn, dis }) => (
                                    <IconButton
                                      key={label}
                                      size="small"
                                      onClick={fn}
                                      disabled={dis}
                                      sx={{
                                        width: 28,
                                        height: 28,
                                        color: T.accent,
                                        border: `1px solid ${T.accentBorder}`,
                                        borderRadius: '6px',
                                        '&:disabled': { opacity: 0.35 },
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontSize: '0.8rem',
                                          lineHeight: 1,
                                        }}
                                      >
                                        {label}
                                      </Typography>
                                    </IconButton>
                                  ))}
                                </Box>
                              </Box>
                            </Box>

                            {/* Table */}
                            <Box
                              sx={{
                                flexGrow: 1,
                                overflowY: 'auto',
                                overflowX: 'auto',
                                ...scrollbarSx,
                              }}
                            >
                              <Table
                                stickyHeader
                                sx={{
                                  tableLayout: 'fixed',
                                  width: '100%',
                                  minWidth: 800,
                                }}
                              >
                                <TableHead>
                                  <TableRow
                                    sx={{
                                      '& .MuiTableCell-head': {
                                        bgcolor: T.accent,
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: '0.75rem',
                                        py: 1.25,
                                      },
                                    }}
                                  >
                                    <TableCell
                                      padding="checkbox"
                                      sx={{ width: 48 }}
                                    >
                                      <Checkbox
                                        checked={(() => {
                                          const sel = filteredUsers.filter(
                                            (u) =>
                                              !printStatusMap.has(
                                                u.employeeNumber,
                                              ),
                                          );
                                          return (
                                            sel.length > 0 &&
                                            selectedUsers.size === sel.length
                                          );
                                        })()}
                                        indeterminate={(() => {
                                          const sel = filteredUsers.filter(
                                            (u) =>
                                              !printStatusMap.has(
                                                u.employeeNumber,
                                              ),
                                          ).length;
                                          return (
                                            selectedUsers.size > 0 &&
                                            selectedUsers.size < sel
                                          );
                                        })()}
                                        onChange={(e) =>
                                          handleSelectAll(e.target.checked)
                                        }
                                        sx={{
                                          color: '#fff',
                                          '&.Mui-checked': { color: '#fff' },
                                          '&.MuiCheckbox-indeterminate': {
                                            color: '#fff',
                                          },
                                        }}
                                      />
                                    </TableCell>
                                    {[
                                      'Emp. No.',
                                      'Full Name',
                                      'Department',
                                      'Category',
                                      'Registration',
                                      'Print Status',
                                      'Action',
                                    ].map((h) => (
                                      <TableCell
                                        key={h}
                                        sx={{
                                          minWidth:
                                            h === 'Full Name' ? 200 : 80,
                                        }}
                                      >
                                        {h}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {paginatedUsers.map((user, idx) => {
                                    const isPrinted = printStatusMap.has(
                                      user.employeeNumber,
                                    );
                                    const isSelected = selectedUsers.has(
                                      user.employeeNumber,
                                    );
                                    const isLoading = user._loading;
                                    const deptCode =
                                      user.departmentCode ||
                                      user.rawUser?.departmentCode ||
                                      'N/A';
                                    return (
                                      <TableRow
                                        key={user.employeeNumber}
                                        sx={{
                                          bgcolor: isSelected
                                            ? alpha(T.accent, 0.06)
                                            : idx % 2 === 0
                                              ? T.rowEven
                                              : T.rowOdd,
                                          '&:hover': { bgcolor: T.rowHover },
                                          transition: 'background 0.1s',
                                        }}
                                      >
                                        <TableCell padding="checkbox">
                                          <Checkbox
                                            checked={isSelected}
                                            onChange={() =>
                                              handleUserSelect(
                                                user.employeeNumber,
                                              )
                                            }
                                            disabled={isPrinted || isLoading}
                                            sx={{
                                              '&.Mui-checked': {
                                                color: T.accent,
                                              },
                                            }}
                                          />
                                        </TableCell>
                                        <TableCell
                                          sx={{
                                            fontSize: '0.78rem',
                                            color: T.muted,
                                            fontWeight: 600,
                                          }}
                                        >
                                          {isLoading
                                            ? '—'
                                            : `#${user.employeeNumber}`}
                                        </TableCell>
                                        <TableCell
                                          sx={{
                                            fontSize: '0.82rem',
                                            fontWeight: 600,
                                            color: T.text,
                                            maxWidth: 220,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          {isLoading
                                            ? '—'
                                            : batchSearchTrimmed
                                              ? highlightMatch(
                                                  user.fullName || '',
                                                  batchSearchTrimmed,
                                                )
                                              : user.fullName}
                                        </TableCell>
                                        <TableCell>
                                          {isLoading ? (
                                            '—'
                                          ) : deptCode !== 'N/A' ? (
                                            <Box
                                              sx={{
                                                px: 1.2,
                                                py: 0.3,
                                                borderRadius: 1,
                                                bgcolor: alpha(T.accent, 0.07),
                                                border: `1px solid ${T.accentBorder}`,
                                                display: 'inline-block',
                                              }}
                                            >
                                              <Typography
                                                sx={{
                                                  fontSize: '0.72rem',
                                                  fontWeight: 700,
                                                  color: T.accent,
                                                }}
                                              >
                                                {deptCode}
                                              </Typography>
                                            </Box>
                                          ) : (
                                            <Typography
                                              sx={{
                                                fontSize: '0.72rem',
                                                color: T.faint,
                                                fontStyle: 'italic',
                                              }}
                                            >
                                              N/A
                                            </Typography>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {isLoading ? (
                                            '—'
                                          ) : (
                                            <Chip
                                              label={getCategoryLabel(
                                                user.rawUser
                                                  ?.employmentCategory ??
                                                  user.employmentCategory ??
                                                  null,
                                              )}
                                              size="small"
                                              sx={{
                                                bgcolor: alpha(
                                                  getCategoryColor(
                                                    user.rawUser
                                                      ?.employmentCategory ??
                                                      user.employmentCategory,
                                                  ),
                                                  0.1,
                                                ),
                                                color: getCategoryColor(
                                                  user.rawUser
                                                    ?.employmentCategory ??
                                                    user.employmentCategory,
                                                ),
                                                border: `1px solid ${getCategoryColor(user.rawUser?.employmentCategory ?? user.employmentCategory)}`,
                                                fontWeight: 600,
                                                fontSize: '0.68rem',
                                                height: 20,
                                              }}
                                            />
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {isLoading ? (
                                            '—'
                                          ) : (
                                            <Chip
                                              label={
                                                user.registrationStatus ===
                                                'Registered'
                                                  ? '🟢 Registered'
                                                  : '🟠 Not Registered'
                                              }
                                              size="small"
                                              color={
                                                user.registrationStatus ===
                                                'Registered'
                                                  ? 'success'
                                                  : 'warning'
                                              }
                                              sx={{
                                                fontWeight: 600,
                                                fontSize: '0.68rem',
                                                height: 20,
                                              }}
                                            />
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {isLoading ? (
                                            '—'
                                          ) : isPrinted ? (
                                            <Chip
                                              label="Printed"
                                              size="small"
                                              color="success"
                                              sx={{
                                                fontSize: '0.68rem',
                                                height: 20,
                                                fontWeight: 600,
                                              }}
                                            />
                                          ) : (
                                            <Chip
                                              label="Unprinted"
                                              size="small"
                                              sx={{
                                                fontSize: '0.68rem',
                                                height: 20,
                                                bgcolor: alpha('#757575', 0.1),
                                                color: '#757575',
                                                border: '1px solid #bdbdbd',
                                              }}
                                            />
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {isLoading ? (
                                            '—'
                                          ) : (
                                            <Tooltip
                                              title={
                                                isPrinted
                                                  ? 'Re-print DTR'
                                                  : 'Print DTR'
                                              }
                                            >
                                              <IconButton
                                                size="small"
                                                onClick={() =>
                                                  showReprintConfirm(user)
                                                }
                                                sx={{
                                                  color: T.accent,
                                                  bgcolor: T.accentFaint,
                                                  '&:hover': {
                                                    bgcolor: T.accentHover,
                                                  },
                                                  borderRadius: '6px',
                                                  width: 28,
                                                  height: 28,
                                                }}
                                              >
                                                <PrintIcon
                                                  sx={{ fontSize: 14 }}
                                                />
                                              </IconButton>
                                            </Tooltip>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                              {paginatedUsers.length === 0 && (
                                <Box sx={{ py: 8, textAlign: 'center' }}>
                                  <Typography
                                    sx={{
                                      fontSize: '0.9rem',
                                      fontWeight: 600,
                                      color: T.muted,
                                      mb: 0.5,
                                    }}
                                  >
                                    {allUsersDTR.length === 0
                                      ? 'No attendance records'
                                      : 'No users match your filters'}
                                  </Typography>
                                  <Typography
                                    sx={{ fontSize: '0.78rem', color: T.faint }}
                                  >
                                    {allUsersDTR.length === 0
                                      ? 'Select a month to auto-load records.'
                                      : 'Try adjusting the search or filters.'}
                                  </Typography>
                                </Box>
                              )}
                            </Box>

                            {/* Action bar footer */}
                            <Box
                              className="no-print"
                              sx={{
                                px: 3,
                                py: 1.25,
                                borderTop: `1px solid ${T.divider}`,
                                bgcolor: T.accentFaint,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 1.5,
                                flexShrink: 0,
                              }}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1.5,
                                  flexWrap: 'wrap',
                                }}
                              >
                                <FormControl
                                  size="small"
                                  sx={{ minWidth: 130, bgcolor: '#fff' }}
                                >
                                  <Select
                                    value=""
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      if (v === 'none') return;
                                      v === 'all'
                                        ? handleAutoSelectFirstN('all')
                                        : handleAutoSelectFirstN(Number(v));
                                    }}
                                    displayEmpty
                                    renderValue={() => 'Quick select…'}
                                    sx={selectSx}
                                  >
                                    <MenuItem value="none">
                                      <em>Choose</em>
                                    </MenuItem>
                                    <MenuItem value={10}>First 10</MenuItem>
                                    <MenuItem value={20}>First 20</MenuItem>
                                    <MenuItem value={50}>
                                      First 50 (max)
                                    </MenuItem>
                                  </Select>
                                </FormControl>
                                <AccentButton
                                  variant="contained"
                                  onClick={handleBulkPrint}
                                  disabled={selectedUsers.size === 0}
                                  startIcon={
                                    <PrintIcon
                                      sx={{ fontSize: '16px !important' }}
                                    />
                                  }
                                  sx={{
                                    bgcolor:
                                      selectedUsers.size > 0
                                        ? T.accent
                                        : alpha(T.accent, 0.35),
                                    color: '#fff',
                                    boxShadow:
                                      selectedUsers.size > 0
                                        ? `0 2px 10px ${alpha(T.accent, 0.32)}`
                                        : 'none',
                                    '&:hover': { bgcolor: T.accentDark },
                                  }}
                                >
                                  Bulk Print ({selectedUsers.size})
                                </AccentButton>
                              </Box>
                              <Typography
                                sx={{ fontSize: '0.75rem', color: T.muted }}
                              >
                                {filteredUsers.length > 0
                                  ? `Showing ${Math.min(filteredUsers.length, (currentPage - 1) * rowsPerPage + 1)}–${Math.min(filteredUsers.length, currentPage * rowsPerPage)} of ${filteredUsers.length}`
                                  : '0 users'}
                              </Typography>
                            </Box>
                          </>
                        ) : (
                          <Box
                            sx={{
                              flexGrow: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Box
                              sx={{
                                width: 72,
                                height: 72,
                                borderRadius: '50%',
                                bgcolor: T.accentFaint,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 2,
                              }}
                            >
                              <PrintIcon
                                sx={{
                                  fontSize: 32,
                                  color: alpha(T.accent, 0.3),
                                }}
                              />
                            </Box>
                            <Typography
                              sx={{
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                color: T.muted,
                                mb: 0.5,
                              }}
                            >
                              {loadingAllUsers
                                ? '—'
                                : !startDate || !endDate
                                  ? 'Select a month first'
                                  : 'No records loaded'}
                            </Typography>
                            <Typography
                              sx={{ fontSize: '0.78rem', color: T.faint }}
                            >
                              {!startDate || !endDate
                                ? 'Pick a year and month from the left panel — data loads automatically.'
                                : 'Click the reload button in the toolbar to fetch records.'}
                            </Typography>
                          </Box>
                        )}
                      </>
                    )}

                    {/* Single off-screen DTR — mounted only while capturing */}
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
                      {captureUser ? renderUserDTRTable(captureUser) : null}
                    </Box>
                  </SectionCard>
                </Grid>
              </Grid>
            </Box>

            {/* ── Bulk Print Preview Modal ── */}
            <Dialog
              open={previewModalOpen}
              onClose={() => setPreviewModalOpen(false)}
              maxWidth="lg"
              fullWidth
              PaperProps={{
                sx: {
                  borderRadius: 3,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '90vh',
                },
              }}
            >
              <Box
                sx={{
                  px: 3,
                  py: 2,
                  background: T.headerGrad,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: '#fff',
                      lineHeight: 1.2,
                    }}
                  >
                    DTR Preview
                  </Typography>
                  {previewUsers[currentPreviewIndex] && (
                    <Typography
                      sx={{
                        fontSize: '0.72rem',
                        color: 'rgba(255,255,255,0.75)',
                      }}
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
                        gap: 0.75,
                        bgcolor: 'rgba(255,255,255,0.15)',
                        borderRadius: '20px',
                        px: 1.5,
                        py: 0.5,
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={handlePrevious}
                        sx={{ color: '#fff', p: 0.25 }}
                      >
                        <ArrowBack sx={{ fontSize: 16 }} />
                      </IconButton>
                      <Typography
                        sx={{
                          color: '#fff',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          minWidth: 48,
                          textAlign: 'center',
                        }}
                      >
                        {currentPreviewIndex + 1} of {previewUsers.length}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={handleNext}
                        sx={{ color: '#fff', p: 0.25 }}
                      >
                        <ArrowForward sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  )}
                  <IconButton
                    onClick={() => setPreviewModalOpen(false)}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.15)',
                      color: '#fff',
                      width: 28,
                      height: 28,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                    }}
                  >
                    <Close sx={{ fontSize: 15 }} />
                  </IconButton>
                </Box>
              </Box>
              <DialogContent
                sx={{
                  p: 0,
                  flex: 1,
                  overflow: 'hidden',
                  bgcolor: '#f0f0f0',
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
                      ...scrollbarSx,
                    }}
                  >
                    {previewUsers[currentPreviewIndex] && (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          bgcolor: 'white',
                          borderRadius: 2,
                          width: 'fit-content',
                          maxWidth: '100%',
                          border: `1px solid ${T.accentBorder}`,
                        }}
                      >
                        {renderDTRForModal(previewUsers[currentPreviewIndex])}
                      </Paper>
                    )}
                  </Box>
                )}
              </DialogContent>
              <Box
                sx={{
                  px: 3,
                  py: 1.5,
                  bgcolor: '#fff',
                  borderTop: `1px solid ${T.divider}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <AccentButton
                    variant="contained"
                    onClick={handlePrintAllSelected}
                    startIcon={
                      <PrintIcon sx={{ fontSize: '16px !important' }} />
                    }
                    sx={{
                      bgcolor: T.accent,
                      color: '#fff',
                      boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`,
                      '&:hover': { bgcolor: T.accentDark },
                    }}
                  >
                    Print All
                    <Box
                      component="span"
                      sx={{
                        ml: 1,
                        bgcolor: 'rgba(255,255,255,0.25)',
                        borderRadius: '20px',
                        px: 1,
                        py: 0.2,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                      }}
                    >
                      {previewUsers.length}
                    </Box>
                  </AccentButton>
                  <AccentButton
                    variant="outlined"
                    onClick={handleDownloadAllSelected}
                    startIcon={
                      <PictureAsPdfIcon sx={{ fontSize: '16px !important' }} />
                    }
                    sx={{
                      borderColor: T.accentBorder,
                      color: T.accent,
                      '&:hover': {
                        bgcolor: T.accentFaint,
                        borderColor: T.accent,
                      },
                    }}
                  >
                    Download PDF
                    <Box
                      component="span"
                      sx={{
                        ml: 1,
                        bgcolor: T.accentFaint,
                        borderRadius: '20px',
                        px: 1,
                        py: 0.2,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: T.accent,
                      }}
                    >
                      {previewUsers.length}
                    </Box>
                  </AccentButton>
                </Box>
                <AccentButton
                  variant="text"
                  onClick={() => setPreviewModalOpen(false)}
                  sx={{
                    color: T.muted,
                    '&:hover': {
                      bgcolor: alpha('#000', 0.04),
                      transform: 'none',
                    },
                    '&:active': { transform: 'none' },
                  }}
                >
                  Close
                </AccentButton>
              </Box>
            </Dialog>

            {/* ── Alert Modal ── */}
            <Dialog
              open={alertModal.open}
              onClose={closeAlert}
              maxWidth="xs"
              fullWidth
              PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
            >
              <Box
                sx={{
                  px: 3,
                  py: 2,
                  background: T.headerGrad,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography
                  sx={{ fontWeight: 700, color: '#fff', fontSize: '0.92rem' }}
                >
                  {alertModal.title}
                </Typography>
                <IconButton
                  size="small"
                  onClick={closeAlert}
                  sx={{
                    color: 'rgba(255,255,255,0.75)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                  }}
                >
                  <Close sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
              <Box sx={{ p: 3 }}>
                <Typography
                  sx={{ fontSize: '0.85rem', color: T.text, lineHeight: 1.6 }}
                >
                  {alertModal.message}
                </Typography>
              </Box>
              <Box
                sx={{
                  px: 3,
                  pb: 2.5,
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <AccentButton
                  variant="contained"
                  onClick={closeAlert}
                  sx={{
                    bgcolor: T.accent,
                    color: '#fff',
                    boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`,
                    '&:hover': { bgcolor: T.accentDark },
                  }}
                >
                  OK
                </AccentButton>
              </Box>
            </Dialog>

            {/* ── Re-print Confirmation Modal ── */}
            <Dialog
              open={confirmModal.open}
              onClose={closeConfirm}
              maxWidth="xs"
              fullWidth
              PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
            >
              <DialogContent
                sx={{
                  textAlign: 'center',
                  py: 4,
                  px: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <Box
                  sx={{
                    mb: 2,
                    color: T.accent,
                    bgcolor: T.accentFaint,
                    p: 2,
                    borderRadius: '12px',
                  }}
                >
                  <PrintIcon sx={{ fontSize: 36 }} />
                </Box>
                <Typography
                  sx={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    mb: 0.5,
                    color: T.text,
                  }}
                >
                  {printStatusMap.has(confirmModal.user?.employeeNumber)
                    ? 'Re-print DTR?'
                    : 'Confirm Print Job'}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.82rem',
                    color: T.muted,
                    mb: 3,
                    maxWidth: '85%',
                    lineHeight: 1.6,
                  }}
                >
                  {printStatusMap.has(confirmModal.user?.employeeNumber)
                    ? 'This record was printed previously. Generate a new copy?'
                    : 'Verify the details below before printing.'}
                </Typography>
                {confirmModal.user && (
                  <Box
                    sx={{
                      width: '100%',
                      border: `1.5px dashed ${T.accentBorder}`,
                      bgcolor: T.accentFaint,
                      borderRadius: 2,
                      p: 2.5,
                      mb: 3,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        color: T.text,
                        mb: 1,
                      }}
                    >
                      {confirmModal.user.fullName ||
                        `${confirmModal.user.firstName} ${confirmModal.user.lastName}`}
                    </Typography>
                    <Box
                      sx={{
                        width: 40,
                        height: 3,
                        bgcolor: T.accent,
                        borderRadius: 2,
                        mx: 'auto',
                        mb: 1,
                      }}
                    />
                    <Box
                      sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}
                    >
                      <Typography sx={{ fontSize: '0.75rem', color: T.muted }}>
                        #{confirmModal.user.employeeNumber}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: T.faint }}>
                        |
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: T.muted }}>
                        {formatMonth(startDate)}
                      </Typography>
                    </Box>
                  </Box>
                )}
                <Box
                  sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}
                >
                  <AccentButton
                    variant="outlined"
                    onClick={closeConfirm}
                    sx={{
                      borderColor: T.accentBorder,
                      color: T.muted,
                      '&:hover': {
                        borderColor: T.accent,
                        color: T.accent,
                        bgcolor: T.accentFaint,
                      },
                    }}
                  >
                    Cancel
                  </AccentButton>
                  <AccentButton
                    variant="contained"
                    onClick={() =>
                      confirmModal.user &&
                      handleIndividualPrintConfirmed(confirmModal.user)
                    }
                    startIcon={
                      <PrintIcon sx={{ fontSize: '16px !important' }} />
                    }
                    sx={{
                      bgcolor: T.accent,
                      color: '#fff',
                      boxShadow: `0 4px 14px ${alpha(T.accent, 0.35)}`,
                      '&:hover': { bgcolor: T.accentDark },
                    }}
                  >
                    Print
                  </AccentButton>
                </Box>
              </DialogContent>
            </Dialog>
          </Box>
        </Fade>
      )}

      {/* ── Sliding hub panels (Official Time / Modification / Computation) ── */}
      <Drawer
        anchor="right"
        open={isHubDrawerOpen(moduleDrawer)}
        onClose={() => setModuleDrawer(null)}
        className="no-print"
        ModalProps={{ keepMounted: false }}
        // Keep below AppBar/footer (1201); inset paper so chrome does not clip content
        sx={{ zIndex: 1200 }}
        PaperProps={{
          sx: {
            top: { xs: 0, sm: '62px' },
            bottom: { xs: 0, sm: '48px' },
            height: { xs: '100%', sm: 'auto' },
            maxHeight: { xs: '100dvh', sm: 'calc(100dvh - 110px)' },
            // Explicit width — without this, temporary Drawer sizes to content and
            // the records table collapses, leaving only a cramped filter column.
            width: { xs: '100%', sm: '90vw' },
            maxWidth: { xs: '100vw', sm: 1480 },
            minWidth: { sm: 960 },
            borderRadius: { xs: 0, sm: '14px 0 0 14px' },
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: '#f7f8fa',
            boxShadow: `-12px 0 40px ${alpha('#000', 0.22)}`,
            borderLeft: `1px solid ${alpha(T.accent, 0.12)}`,
          },
        }}
        SlideProps={{ timeout: 320 }}
      >
        {moduleDrawer === 'modification' && (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <AttendanceModification
              key={`mod-drawer-${personID || 'none'}-${startDate || ''}-${endDate || ''}`}
              embedded
              onClose={() => setModuleDrawer(null)}
              onRecordsSaved={() => {
                setAttendanceRevision((n) => n + 1);
                fetchRecordsRef.current?.();
              }}
              initialContext={{
                employeeNumber: personID || '',
                startDate: startDate || '',
                endDate: endDate || '',
                selectedYear,
                selectedMonth,
                employee: selectedEmployee || (personID
                  ? {
                      employeeNumber: personID,
                      name: employeeName || '',
                      fullName: employeeName || '',
                    }
                  : null),
              }}
            />
          </Box>
        )}
        {moduleDrawer === 'officialTime' && (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <OfficialTimeForm
              key={`ot-drawer-${personID || 'none'}`}
              embedded
              onClose={() => setModuleDrawer(null)}
              initialContext={{
                employeeNumber: personID || '',
                employee: selectedEmployee || (personID
                  ? {
                      employeeNumber: personID,
                      name: employeeName || '',
                      fullName: employeeName || '',
                    }
                  : null),
              }}
            />
          </Box>
        )}
        {COMPUTATION_DRAWER_KEYS.has(moduleDrawer) && (
          <AttendanceComputationDrawer
            drawerKey={moduleDrawer}
            initialContext={hubDrawerInitialContext}
            saveSignal={computationSaveSignal}
            refreshEpoch={attendanceRevision}
            onClose={() => setModuleDrawer(null)}
            onSavedToSummary={handleSavedToSummary}
          />
        )}
      </Drawer>
    </>
  );
};

export default DailyTimeRecordFaculty;
