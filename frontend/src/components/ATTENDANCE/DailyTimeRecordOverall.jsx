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
  Tune,
  ArrowBack,
  ArrowForward,
  Close,
  Refresh,
  Edit,
  Schedule,
  ExpandMore,
  CheckCircle,
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
  Collapse,
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
  Popover,
  Select,
  Snackbar,
  Switch,
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
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { alpha } from '@mui/material/styles';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
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
import AttendancePunchStatusSidebar from './AttendancePunchStatusSidebar';
import {
  detectUnmountedPunches,
  filterUnmountedIssuesByPeriod,
} from '../../utils/unmountedPunchIssues';
import LoadingOverlay from '../LoadingOverlay';
import useAttendanceWorkflow from '../../hooks/useAttendanceWorkflow';
import AttendanceWorkflowNav from './AttendanceWorkflowNav';
import AttendanceModification from './AttendanceModification';
import OfficialTimeForm from './OfficialTimeForm';
import DtrSavedSummaryPanel from './DtrSavedSummaryPanel';
import AttendanceComputationDrawer from './AttendanceComputationDrawer';
import { readAttendanceWorkflow } from '../../utils/attendanceWorkflow';
import { sortEmployeesByLastName } from '../../utils/sortEmployeesByLastName';
import { resolveDrawerFromComputationModule,
  resolveDrawerFromLateType,
  mismatchComputationSnackbar,
  HUB_COMPUTATION_BUTTONS,
} from '../../utils/attendanceHubFlow';
import {
  fetchDailyLateUndertime,
  fetchDailyLateUndertimeBatch,
  parseHalfDayDatesSet,
  DTR_COMPUTED_LATE_UPDATE_EVENT,
  DTR_COMPUTED_LATE_STORAGE_KEY,
} from '../../utils/dtrLateUndertimeFromOverall';
import { fetchOfficialTimesBatch } from '../../utils/fetchOfficialTimesBatch';
import { fetchEmploymentCategoryRow } from '../../utils/regularPayrollFromAttendance';
import {
  personnelScopeFromEmployment,
  resolveAttendanceModuleFromEmployment,
} from '../../utils/earningsEmpCatRules';
import { computeAndApplyModuleLateUndertime } from '../../utils/computeModuleLateUndertimeForDtr';
import {
  buildReviewByDate,
  parseHalfDayReviewJson,
  MODULE_TYPES,
} from '../../utils/halfDayReview';
import {
  DTR_INDICATOR_OPTIONS,
  defaultDtrIndicatorVisibility,
  isDtrCellWatermarkText,
  formatDtrPdfFileName,
  formatDtrBulkPdfFileName,
} from '../../utils/dtrFormatHelpers';
import DTRTemplate from './DTRTemplate';
import DtrFitPreview from './DtrFitPreview';
import {
  DTRPrintStyles,
  printDtrPdfPages,
  downloadDtrHtmlPages,
} from './DailyTimeRecordPrintable';

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
  { value: 0, label: 'JO Graduate', color: '#F57C00', shortLabel: 'JO Graduate' },
  { value: 1, label: 'JO UnderGrad', color: '#E64A19', shortLabel: 'JO UnderGrad' },
  { value: 2, label: 'Regular Non-Teaching', color: '#2E7D32', shortLabel: 'Non-Teaching' },
  { value: 3, label: 'Regular Teaching (30Hrs)', color: '#1565C0', shortLabel: 'Teaching' },
  { value: 4, label: 'Regular Designated (40Hrs)', color: '#7B1FA2', shortLabel: 'Designated' },
  { value: 5, label: 'Other', color: '#00796B', shortLabel: 'Other' },
];

/**
 * Map an employee's computed attendance module type to the same coarse
 * "personnel scope" bucket used on suspension records (personnel_scope).
 * DTR-DISPLAY ONLY — does not touch late/undertime calculation, which
 * already has its own identical helper in computeModuleLateUndertimeForDtr.js.
 */
const scopeForModuleType = (mod) => {
  if (mod === MODULE_TYPES.NON_TEACHING) return 'non_teaching';
  if (
    mod === MODULE_TYPES.FACULTY_30HRS ||
    mod === MODULE_TYPES.DESIGNATED_40HRS
  ) {
    return 'academic';
  }
  return null;
};

/**
 * Employment classification → personnel_scope when the saved computation
 * module is not loaded yet.
 * Non-Academic → non_teaching. Academic 30/40 Hours → academic.
 * Numeric 0–4 is legacy only; new type-config ids are not 30hrs/designated.
 */
const scopeForEmploymentCategory = (cat, meta = null) =>
  personnelScopeFromEmployment(
    meta || (cat != null && typeof cat === 'object' ? cat : null),
  );

const resolveEmployeeSuspensionScope = (moduleType, employmentCategory, meta = null) => {
  // Prefer the attendance module already saved on this DTR over category,
  // so a stale category cannot paint the wrong suspension scope.
  const fromMod = scopeForModuleType(moduleType);
  if (fromMod) return fromMod;
  return scopeForEmploymentCategory(employmentCategory, meta);
};

const DTR_INDICATOR_STORAGE_KEY = 'hris-dtr-indicator-visibility';

const loadDtrIndicatorVisibility = () => {
  const base = defaultDtrIndicatorVisibility();
  try {
    const raw = localStorage.getItem(DTR_INDICATOR_STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return base;
    DTR_INDICATOR_OPTIONS.forEach(({ key }) => {
      if (typeof parsed[key] === 'boolean') base[key] = parsed[key];
    });
  } catch {
    /* ignore private mode / bad JSON */
  }
  return base;
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

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

const mapEmploymentCategoryRow = (item) => {
  if (!item) return null;
  const label =
    item.parentGroup && item.typeName
      ? `${item.parentGroup} | ${item.typeName}`
      : item.categoryLabel || '';
  const employmentCategory =
    item.employmentCategory != null && item.employmentCategory !== ''
      ? item.employmentCategory
      : null;
  if (!label && employmentCategory == null) return null;
  return {
    label: label || '',
    colorHex: item.colorHex || '#757575',
    employmentCategory,
    typeName: item.typeName || '',
    parentGroup: item.parentGroup || '',
  };
};

/** Bulk print / PDF download — raised with faster chunked capture. */
const BULK_DTR_LIMIT = 100;
/** Employees per attendance API request (by employeeNumbers — no SQL re-rank). */
const ATTENDANCE_CHUNK = 25;
/** Parallel attendance chunk requests while hydrating the table. */
const ATTENDANCE_CONCURRENCY = 3;
/** Background rounds between React flushes — fewer full-list re-renders. */
const BACKGROUND_FLUSH_EVERY = 3;
/** Yield to the browser between background rounds so the table stays clickable. */
const BACKGROUND_YIELD_MS = 16;
/** Quincena / custom range. Filters cell data only; day rows stay 1–31. */
const pad2 = (n) => String(n).padStart(2, '0');
const toYmd = (year, monthIndex, day) =>
  `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
const parseYmd = (value) => {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
};

/** Calendar year/month from YYYY-MM-DD — avoids UTC skew from `new Date('YYYY-MM-DD')`. */
const yearMonthFromYmd = (value) => {
  const p = parseYmd(value);
  if (p) return { year: p.y, month: p.mo };
  const m = String(value || '').match(/^(\d{4})-(\d{2})/);
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
};

/** Always string keys so print status survives reload / DB round-trips. */
const printStatusKey = (empNum) => String(empNum ?? '').trim();

const inferPrintPeriodPreset = (start, end, year, monthIndex) => {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  const a = parseYmd(start);
  const b = parseYmd(end);
  if (!a || !b) return 'full';
  if (
    a.y !== year ||
    b.y !== year ||
    a.mo !== monthIndex + 1 ||
    b.mo !== monthIndex + 1
  ) {
    return 'custom';
  }
  if (a.d === 1 && b.d === last) return 'full';
  if (a.d === 1 && b.d === 15) return 'first';
  if (a.d === 16 && b.d === last) return 'second';
  return 'custom';
};

const printPeriodLabel = (quincena, lastDay = 31, start = '', end = '') => {
  if (quincena === 'first') return '1st Quincena (1–15)';
  if (quincena === 'second') return `2nd Quincena (16–${lastDay})`;
  if (quincena === 'custom') {
    const a = parseYmd(start);
    const b = parseYmd(end);
    if (a && b) return `Custom (${a.d}–${b.d})`;
    return 'Custom range';
  }
  return 'Full Month';
};

const printPeriodDateFieldSx = {
  ...selectSx,
  '& .MuiInputBase-input': {
    py: '6px',
    fontSize: '0.72rem',
    fontFamily: 'inherit',
  },
};

const PrintPeriodDateField = ({ label, value, min, max, onChange }) => (
  <Box sx={{ flex: 1, minWidth: 0 }}>
    <Typography
      sx={{
        fontSize: '0.62rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: alpha(T.accent, 0.45),
        mb: 0.4,
      }}
    >
      {label}:
    </Typography>
    <TextField
      type="date"
      size="small"
      fullWidth
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      InputLabelProps={{ shrink: true }}
      inputProps={{ min: min || undefined, max: max || undefined }}
      sx={printPeriodDateFieldSx}
    />
  </Box>
);

/** Skip holiday/suspension refresh for quiet/recent batch loads. */
const HOLIDAY_CACHE_TTL_MS = 5 * 60 * 1000;

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
  const [indicatorVisibility, setIndicatorVisibility] = useState(
    loadDtrIndicatorVisibility,
  );
  const [indicatorMenuAnchor, setIndicatorMenuAnchor] = useState(null);
  const dtrRef = useRef(null);

  const fetchRecordsRef = useRef(null);
  const fetchAllUsersDTRRef = useRef(null);

  const [allUsersDTR, setAllUsersDTR] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const batchSearchTrimmed = useMemo(() => searchQuery.trim(), [searchQuery]);
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);
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
  /** Monotonic id so aborted batch fetches do not leave loading flags stuck. */
  const batchFetchGenRef = useRef(0);
  /** Last time batch/single data was fully loaded — used to skip tab-focus spam. */
  const lastDataFreshAtRef = useRef(0);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const [holidays, setHolidays] = useState([]);
  const [suspensions, setSuspensions] = useState([]);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [previewUsers, setPreviewUsers] = useState([]);
  const [printingAll, setPrintingAll] = useState(false);
  const [printingStatus, setPrintingStatus] = useState('');

  const [viewMode, setViewMode] = useState('single');
  const [recordFilter, setRecordFilter] = useState('all');
  const [dtrType, setDtrType] = useState('regular');
  const [monthLoading, setMonthLoading] = useState(false);

  const [printStatusFilter, setPrintStatusFilter] = useState('all');
  const [printStatusMap, setPrintStatusMap] = useState(new Map());
  /** Filters punches and marks inside the DTR. Day rows stay 1–31. */
  const [printQuincena, setPrintQuincena] = useState('full');
  const [printRangeStart, setPrintRangeStart] = useState('');
  const [printRangeEnd, setPrintRangeEnd] = useState('');

  const [alertModal, setAlertModal] = useState({
    open: false,
    title: '',
    message: '',
  });
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    user: null,
    bulkUsers: null,
    alreadyPrintedCount: 0,
    alreadyPrintedUsers: [],
  });
  const [railPunchReview, setRailPunchReview] = useState({ issues: [], ready: false });
  const railPunchReviewRef = useRef({ issues: [], ready: false });
  railPunchReviewRef.current = railPunchReview;
  const [reviewFocusToken, setReviewFocusToken] = useState(0);
  const [reviewFocusDate, setReviewFocusDate] = useState('');
  const [reviewFocusRowKey, setReviewFocusRowKey] = useState('');
  const [unmountedPrintDialog, setUnmountedPrintDialog] = useState({
    open: false,
    issues: [],
    pending: null,
  });
  /** Expanded keys: employee `id` or day `id::date`. */
  const [unmountedExpandedIds, setUnmountedExpandedIds] = useState(() => new Set());

  const toggleUnmountedExpand = useCallback((key) => {
    setUnmountedExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  const handlePunchIssuesChange = useCallback((payload) => {
    setRailPunchReview(payload || { issues: [], ready: false });
  }, []);
  const showAlert = (title, message) =>
    setAlertModal({ open: true, title, message });
  const closeAlert = () =>
    setAlertModal({ open: false, title: '', message: '' });
  const showReprintConfirm = (user) =>
    setConfirmModal({
      open: true,
      user,
      bulkUsers: null,
      alreadyPrintedCount: printStatusMap.has(printStatusKey(user?.employeeNumber))
        ? 1
        : 0,
      alreadyPrintedUsers: printStatusMap.has(printStatusKey(user?.employeeNumber))
        ? [user]
        : [],
    });
  const closeConfirm = () =>
    setConfirmModal({
      open: false,
      user: null,
      bulkUsers: null,
      alreadyPrintedCount: 0,
      alreadyPrintedUsers: [],
    });

  const openBulkPreview = (users) => {
    setPreviewUsers(users);
    setCurrentPreviewIndex(0);
    setPreviewModalOpen(true);
  };

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

  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasSearchedSingle, setHasSearchedSingle] = useState(false);
  /** Bumped on each person search so that employee's category is refetched. */
  const [empCatFreshNonce, setEmpCatFreshNonce] = useState(0);
  /** Sliding hub drawer: officialTime | modification | computation modules */
  const [moduleDrawer, setModuleDrawer] = useState(null);
  /** Last opened computation module — kept after drawer closes so Save to Summary stays enabled */
  const [activeComputationDrawer, setActiveComputationDrawer] = useState(null);
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
            const mapped = mapEmploymentCategoryRow(item);
            if (!mapped) return;
            map[String(item.employeeNumber)] = mapped;
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
      setPrintRangeStart(inboundDtrNavState.startDate);
      setPrintRangeEnd(inboundDtrNavState.endDate);
      setPrintQuincena(
        inferPrintPeriodPreset(
          inboundDtrNavState.startDate,
          inboundDtrNavState.endDate,
          sy,
          sm - 1,
        ),
      );
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
    setPrintRangeStart(inboundDtrNavState.startDate);
    setPrintRangeEnd(inboundDtrNavState.endDate);
    setPrintQuincena(
      inferPrintPeriodPreset(
        inboundDtrNavState.startDate,
        inboundDtrNavState.endDate,
        sy,
        sm - 1,
      ),
    );
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
    setPrintRangeStart(payload.startDate || '');
    setPrintRangeEnd(payload.endDate || '');
    if (payload.selectedYear != null) setSelectedYear(payload.selectedYear);
    if (payload.selectedMonth != null) setSelectedMonth(payload.selectedMonth);
    if (payload.startDate && payload.endDate) {
      const [hy, hm] = String(payload.startDate).split('-').map(Number);
      if (Number.isFinite(hy) && Number.isFinite(hm)) {
        setPrintQuincena(
          inferPrintPeriodPreset(payload.startDate, payload.endDate, hy, hm - 1),
        );
      }
    }
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
        // Prefer the day-number label node so partial-suspension captions do not break matching.
        const dayLabelNode = dayCell.querySelector('div');
        const dayText = (dayLabelNode?.textContent || dayCell.textContent || '')
          .trim()
          .match(/^\d{1,2}/)?.[0];
        if (!dayText) return;
        const dayPadded = dayText.padStart(2, '0');
        const record = original.find((r) =>
          String(r?.date || '').includes(`-${dayPadded}`),
        );
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return;
        const timeValues = [
          fmt(record?.timeIN || ''),
          fmt(record?.breaktimeIN || ''),
          fmt(record?.breaktimeOUT || ''),
          fmt(record?.timeOUT || ''),
        ];
        [1, 2, 3, 4].forEach((cellIdx, spanIdx) => {
          const td = cells[cellIdx];
          if (!td) return;
          const span = td.querySelector(':scope > span.dtr-actual-time');
          if (!span) return;
          const current = span.textContent.trim();
          if (!timeValues[spanIdx] && isDtrCellWatermarkText(current)) return;
          if (current !== timeValues[spanIdx]) {
            span.textContent = timeValues[spanIdx];
          }
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
        const target = m.target;
        const isInWatermark = (n) =>
          !!(n && n.closest && n.closest('.dtr-cell-watermark'));
        if (isInWatermark(target)) return false;
        const isActualTimeEl = (node) =>
          !!(node && node.closest && node.closest('.dtr-actual-time'));
        if (m.type === 'characterData') {
          if (target?.classList?.contains('dtr-actual-time')) return true;
          const span = target.parentElement;
          if (isInWatermark(span)) return false;
          return isActualTimeEl(span);
        }
        if (m.type === 'childList') {
          if (isActualTimeEl(target)) return true;
          return (
            target.tagName === 'TD' && target.querySelector('.dtr-actual-time')
          );
        }
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

  // Pause anti-tamper restore while React intentionally re-renders the DTR
  // (official-time / indicator toggles). Otherwise MutationObserver fights
  // React and punch times flicker on holiday/leave/suspension rows.
  useEffect(() => {
    isRestoringRef.current = true;
    if (restoreTimerRef.current) {
      clearTimeout(restoreTimerRef.current);
      restoreTimerRef.current = null;
    }
    const t = setTimeout(() => {
      isRestoringRef.current = false;
    }, 350);
    return () => clearTimeout(t);
  }, [showOfficialTimeOnDtr, dtrType, printQuincena, printRangeStart, printRangeEnd, indicatorVisibility]);

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
        // Merge — page-first OT loads must not wipe later employees.
        setBatchOfficialTimesMap((prev) => ({ ...prev, ...timesMap }));
      } catch (error) {
        console.error('Error in fetchBatchOfficialTimes:', error);
      }
    },
    [],
  );

  const autoLateAttemptedRef = useRef(new Set());
  const lateLoadSettledRef = useRef('');
  const computedLateRef = useRef({});
  const applyingLateRef = useRef(false);
  const lastAutoOpenKeyRef = useRef('');
  const applyLateFromEmploymentCategoryRef = useRef(null);

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
      const incoming = byDate || {};
      const existing = computedLateRef.current[key];
      if (
        Object.keys(incoming).length === 0 &&
        existing &&
        Object.keys(existing).length > 0
      ) {
        lateLoadSettledRef.current = `${key}|${startDate}|${endDate}`;
        return;
      }
      computedLateRef.current = { ...computedLateRef.current, [key]: incoming };
      lateLoadSettledRef.current = `${key}|${startDate}|${endDate}`;
      setComputedLateByEmployee((prev) => ({ ...prev, [key]: incoming }));
      setHalfDayDatesByEmployee((prev) => ({
        ...prev,
        [key]: parseHalfDayDatesSet(halfDayDates),
      }));
      setHalfDayReviewByEmployee((prev) => ({
        ...prev,
        [key]: buildReviewByDate(parseHalfDayReviewJson(half_day_review)),
      }));
      setComputationModuleTypeByEmployee((prev) => {
        // Skip null/unknown — a missing overall row must not become NON_TEACHING
        // for suspension scope filtering (that made Academic markers vanish after load).
        if (!computation_module_type) return prev;
        return {
          ...prev,
          [key]: computation_module_type,
        };
      });
    },
    [startDate, endDate],
  );

  const applyLateFromEmploymentCategory = useCallback(
    async (employeeNumber, { force = false, meta: metaOverride } = {}) => {
      if (!employeeNumber || !startDate || !endDate || dtrType !== 'regular') return;
      const key = String(employeeNumber);
      const attemptKey = `${key}|${startDate}|${endDate}`;
      if (!force && autoLateAttemptedRef.current.has(attemptKey)) return;
      const meta = metaOverride || empCatMap[key];
      const moduleType = resolveAttendanceModuleFromEmployment(meta);
      if (!moduleType) return;
      autoLateAttemptedRef.current.add(attemptKey);
      applyingLateRef.current = true;
      try {
        const applied = await computeAndApplyModuleLateUndertime({
          personID: key,
          startDate,
          endDate,
          moduleType,
        });
        if (!applied?.byDate) return;
        computedLateRef.current = { ...computedLateRef.current, [key]: applied.byDate };
        setComputedLateByEmployee((prev) => ({ ...prev, [key]: applied.byDate }));
        setHalfDayDatesByEmployee((prev) => ({
          ...prev,
          [key]: parseHalfDayDatesSet(applied.halfDayDates),
        }));
        setHalfDayReviewByEmployee((prev) => ({
          ...prev,
          [key]: buildReviewByDate(parseHalfDayReviewJson(applied.half_day_review)),
        }));
        if (applied.computation_module_type) {
          setComputationModuleTypeByEmployee((prev) => ({
            ...prev,
            [key]: applied.computation_module_type,
          }));
        }
      } catch (err) {
        console.warn(
          'Could not fill DTR late/undertime from employment category:',
          err?.message || err,
        );
      } finally {
        applyingLateRef.current = false;
      }
    },
    [startDate, endDate, dtrType, empCatMap],
  );

  applyLateFromEmploymentCategoryRef.current = applyLateFromEmploymentCategory;

  useEffect(() => {
    if (
      viewMode !== 'single' ||
      dtrType !== 'regular' ||
      !hasSearchedSingle ||
      !personID ||
      !startDate ||
      !endDate
    ) {
      return;
    }
    const key = String(personID);
    if (lateLoadSettledRef.current !== `${key}|${startDate}|${endDate}`) return;
    const byDate = computedLateByEmployee[key];
    if (byDate && Object.keys(byDate).length > 0) return;
    if (!empCatMap[key]) return;
    applyLateFromEmploymentCategory(personID);
  }, [
    viewMode,
    dtrType,
    hasSearchedSingle,
    personID,
    startDate,
    endDate,
    computedLateByEmployee,
    empCatMap,
    applyLateFromEmploymentCategory,
  ]);

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

  const expectedModuleType = useMemo(() => {
    if (!hasSearchedSingle || !personID) return null;
    return resolveAttendanceModuleFromEmployment(empCatMap[String(personID)]) || null;
  }, [hasSearchedSingle, personID, empCatMap]);

  const appliedLateUtModuleType = useMemo(() => {
    if (!personID) return null;
    const key = String(personID);
    const byDate = computedLateByEmployee[key];
    if (!byDate || Object.keys(byDate).length === 0) return null;
    return computationModuleTypeByEmployee[key] || null;
  }, [personID, computedLateByEmployee, computationModuleTypeByEmployee]);

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
    (drawerKey, { silent = false } = {}) => {
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
      if (!silent) {
        const clicked = HUB_COMPUTATION_BUTTONS.find((b) => b.drawer === drawerKey);
        if (clicked) {
          const expected = expectedModuleType;
          if (!expected || clicked.moduleType !== expected) {
            setSnackbar({
              open: true,
              message: mismatchComputationSnackbar({
                expectedModuleType: expected,
                clickedLabel: clicked.label,
              }),
              severity: 'warning',
            });
          }
        }
      }
      setActiveComputationDrawer(drawerKey);
      setModuleDrawer(drawerKey);
    },
    [hasOfficialTimeSchedule, expectedModuleType],
  );

  useEffect(() => {
    if (viewMode !== 'single' || !hasSearchedSingle || !personID) return;
    let cancelled = false;
    const key = String(personID);
    (async () => {
      const row = await fetchEmploymentCategoryRow(key, getAuthHeaders);
      if (cancelled) return;
      const mapped = mapEmploymentCategoryRow(row);
      let moduleChanged = false;
      setEmpCatMap((prev) => {
        const prevModule = resolveAttendanceModuleFromEmployment(prev[key]);
        const nextModule = resolveAttendanceModuleFromEmployment(mapped);
        moduleChanged = Boolean(prevModule && nextModule && prevModule !== nextModule);
        if (moduleChanged) {
          autoLateAttemptedRef.current.delete(`${key}|${startDate}|${endDate}`);
        }
        if (!mapped) {
          if (!prev[key]) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return { ...prev, [key]: mapped };
      });
      if (moduleChanged && mapped) {
        void applyLateFromEmploymentCategoryRef.current?.(key, {
          force: true,
          meta: mapped,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    viewMode,
    hasSearchedSingle,
    personID,
    empCatFreshNonce,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    if (viewMode !== 'single' || !hasSearchedSingle || !personID || !startDate || !endDate) {
      return;
    }
    if (dtrType !== 'regular') return;
    if (!hasOfficialTimeSchedule || !expectedModuleType) return;
    const drawer = resolveDrawerFromLateType(expectedModuleType);
    if (!drawer) return;
    const openKey = `${personID}|${startDate}|${endDate}|${expectedModuleType}`;
    if (lastAutoOpenKeyRef.current === openKey) return;
    lastAutoOpenKeyRef.current = openKey;
    openComputationDrawer(drawer, { silent: true });
  }, [
    viewMode,
    hasSearchedSingle,
    personID,
    startDate,
    endDate,
    dtrType,
    hasOfficialTimeSchedule,
    expectedModuleType,
    openComputationDrawer,
  ]);

  const handleSavedToSummary = useCallback(async () => {
    setSummaryRefreshKey((k) => k + 1);
    setActiveComputationDrawer(null);
    setModuleDrawer(null);
    setAttendanceRevision((n) => n + 1);
    if (personID && startDate && endDate) {
      try {
        await Promise.allSettled([
          loadComputedLateForEmployee(personID),
          fetchOfficialTimes(personID, startDate, endDate),
          Promise.resolve(fetchRecordsRef.current?.()),
        ]);
      } catch (err) {
        console.error('Failed to refresh hub after summary save:', err);
      }
    }
    setSnackbar({
      open: true,
      message: 'Attendance summary saved. Totals are now shown below.',
      severity: 'success',
    });
  }, [personID, startDate, endDate, loadComputedLateForEmployee, fetchOfficialTimes]);

  /** Refresh DTR punches / OT / late columns after any hub drawer change. */
  const refreshHubAfterDrawerChange = useCallback(
    async ({ bumpRevision = true, refetchRecords = true } = {}) => {
      if (bumpRevision) setAttendanceRevision((n) => n + 1);
      setSummaryRefreshKey((k) => k + 1);
      if (!personID || !startDate || !endDate) return;
      const jobs = [];
      if (refetchRecords) jobs.push(Promise.resolve(fetchRecordsRef.current?.()));
      else {
        jobs.push(fetchOfficialTimes(personID, startDate, endDate));
        if (dtrType === 'regular') {
          jobs.push(loadComputedLateForEmployee(personID));
        }
      }
      await Promise.allSettled(jobs);
    },
    [
      personID,
      startDate,
      endDate,
      dtrType,
      fetchOfficialTimes,
      loadComputedLateForEmployee,
    ],
  );

  const closeHubDrawer = useCallback(
    (opts) => {
      setModuleDrawer(null);
      void refreshHubAfterDrawerChange(opts);
    },
    [refreshHubAfterDrawerChange],
  );

  const openHubToolFromModule = useCallback((toolKey) => {
    if (toolKey === 'officialTime' || toolKey === 'modification') {
      setModuleDrawer(toolKey);
      return;
    }
    if (COMPUTATION_DRAWER_KEYS.has(toolKey)) {
      setActiveComputationDrawer(toolKey);
      setModuleDrawer(toolKey);
    }
  }, []);

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

  // ─── Static data on mount + refresh helper ─────────────────────────────
  const holidaysCacheAtRef = useRef(0);
  const holidaysRef = useRef(holidays);
  const suspensionsRef = useRef(suspensions);
  holidaysRef.current = holidays;
  suspensionsRef.current = suspensions;

  const refreshHolidaysAndSuspensions = useCallback(async ({ force = false } = {}) => {
    const now = Date.now();
    if (
      !force &&
      holidaysCacheAtRef.current > 0 &&
      now - holidaysCacheAtRef.current < HOLIDAY_CACHE_TTL_MS
    ) {
      return {
        holidays: holidaysRef.current,
        suspensions: suspensionsRef.current,
      };
    }
    try {
      const [hRes, sRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/holiday`, getAuthHeaders()),
        axios.get(`${API_BASE_URL}/api/suspensions`, getAuthHeaders()),
      ]);
      const nextHolidays = Array.isArray(hRes.data) ? hRes.data : [];
      const nextSuspensions = Array.isArray(sRes.data) ? sRes.data : [];
      setHolidays(nextHolidays);
      setSuspensions(nextSuspensions);
      holidaysRef.current = nextHolidays;
      suspensionsRef.current = nextSuspensions;
      holidaysCacheAtRef.current = Date.now();
      return { holidays: nextHolidays, suspensions: nextSuspensions };
    } catch (e) {
      console.error('Error fetching holidays/suspensions:', e);
      return {
        holidays: holidaysRef.current,
        suspensions: suspensionsRef.current,
      };
    }
  }, []);

  useEffect(() => {
    const fetchAllStaticData = async () => {
      try {
        const deptRes = await axios.get(`${API_BASE_URL}/api/department-table`, getAuthHeaders());
        setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
        await refreshHolidaysAndSuspensions();
      } catch (e) {
        console.error('Error fetching static data:', e);
      }
    };
    fetchAllStaticData();
  }, [refreshHolidaysAndSuspensions]);

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
  /** @param {{ quiet?: boolean }} [opts] quiet = no overlay / keep current schedule while refreshing */
  const fetchRecords = useCallback(async (opts = {}) => {
    const quiet = opts?.quiet === true;
    if (!quiet) {
      setMonthLoading(true);
      // Avoid showing the previous employee's schedule while this fetch is in flight.
      setOfficialTimes({});
    }
    try {
      // Always re-pull calendar overlays — suspensions added in Announcements
      // while this page stayed mounted would otherwise stay missing.
      await refreshHolidaysAndSuspensions();
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
      } else if (!quiet) {
        setEmployeeName('No records found');
        setOfficialTimes({});
      }
      if (dtrType === 'regular' && personID && startDate && endDate) {
        loadComputedLateForEmployee(personID);
      }
      lastDataFreshAtRef.current = Date.now();
      return filtered.length;
    } catch (err) {
      console.error('Error fetching records:', err);
      return null;
    } finally {
      if (!quiet) setMonthLoading(false);
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
    refreshHolidaysAndSuspensions,
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
    if (viewMode !== 'multiple' || allUsersDTR.length === 0) return;
    // Re-filter already-loaded raw attendance — no full server refetch.
    setAllUsersDTR((prev) =>
      prev.map((u) => {
        const raw = Array.isArray(u.rawRecords) ? u.rawRecords : u.records || [];
        const filtered = filterByDtrType(raw, dtrType);
        return {
          ...u,
          records: filtered,
          hasRecords: filtered.length > 0,
        };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Keep DTR late/undertime columns in sync when a computation module persists.
  useEffect(() => {
    const handleStorage = (event) => {
      if (event?.key && event.key !== DTR_COMPUTED_LATE_STORAGE_KEY) return;
      if (!personID || !startDate || !endDate) return;
      loadComputedLateForEmployeeRef.current?.(personID);
      setSummaryRefreshKey((k) => k + 1);
    };
    const handleComputedLateUpdated = () => {
      if (applyingLateRef.current) return;
      if (!personID || !startDate || !endDate) return;
      loadComputedLateForEmployeeRef.current?.(personID);
      setSummaryRefreshKey((k) => k + 1);
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener(DTR_COMPUTED_LATE_UPDATE_EVENT, handleComputedLateUpdated);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(
        DTR_COMPUTED_LATE_UPDATE_EVENT,
        handleComputedLateUpdated,
      );
    };
  }, [personID, startDate, endDate]);

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
              next.set(printStatusKey(emp), { printed_at: at, printed_by: by }),
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
          fetchRecordsRef.current?.({ quiet: true });
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

    const handleAdminDashboardUpdated = (payload) => {
      const src = payload?.source;
      if (src === 'suspensions' || src === 'holidays' || src === 'holiday') {
        refreshHolidaysAndSuspensions();
      }
    };
    socket.on('adminDashboardUpdated', handleAdminDashboardUpdated);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      socket.off('attendanceChanged', handleAttendanceChanged);
      socket.off('adminDashboardUpdated', handleAdminDashboardUpdated);
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
    refreshHolidaysAndSuspensions,
  ]);

  // Soft refresh when returning to this tab — never block UI with Processing overlay.
  // Full reloads on every focus were the "always loading" bug (esp. after abort left flags stuck).
  useEffect(() => {
    let hiddenAt = 0;
    const TAB_AWAY_MS = 8000;
    const DATA_FRESH_MS = 60 * 1000;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      if (!hiddenAt || Date.now() - hiddenAt < TAB_AWAY_MS) return;
      const dataIsFresh =
        lastDataFreshAtRef.current > 0 &&
        Date.now() - lastDataFreshAtRef.current < DATA_FRESH_MS;
      // Calendar overlays only on tab return — full quiet rehydrate was the
      // bulk lag/glitch (re-fetched every employee and re-rendered the table).
      refreshHolidaysAndSuspensions();
      if (dataIsFresh) return;
      if (viewMode === 'single') {
        if (hasSearchedSingle && personID && startDate && endDate) {
          fetchRecordsRef.current?.({ quiet: true });
        }
      }
      // Batch mode: keep the loaded table; socket + manual reload handle updates.
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
    refreshHolidaysAndSuspensions,
  ]);

  // ─── Batch fetch ───────────────────────────────────────────────────────
  /** @param {{ quiet?: boolean }} [opts] quiet = refresh without clearing the table / selection / overlay */
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
    const fetchGen = ++batchFetchGenRef.current;
    const isLatest = () => fetchGen === batchFetchGenRef.current;

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
      // Background refresh must never raise the full-screen Processing overlay.
      setLoadingAllUsers(false);
    }
    const cfg = () => ({ ...getAuthHeaders(), signal });
    try {
      // Holidays + employee list in parallel (holiday/suspension uses short TTL cache).
      const [, empRes] = await Promise.all([
        refreshHolidaysAndSuspensions(),
        axios
          .get(`${API_BASE_URL}/attendance/api/dtr-employee-list`, {
            params: { startDate, endDate, skipAudit: '1' },
            ...cfg(),
          })
          .catch((e) => {
            if (!signal.aborted) console.warn('emp list:', e.message);
            return { data: [] };
          }),
      ]);
      if (signal.aborted || !isLatest()) return;

      const empList = empRes.data || [];
      if (empList.length === 0) {
        if (!quiet) {
          setAllUsersDTR([]);
          setBatchOfficialTimesMap({});
          showAlert(
            'No Records Found',
            'No attendance records found for the selected date range.',
          );
        }
        return;
      }

      const skeletonUsers = empList.map((emp) => {
        const empNum = emp.personID;
        const empKey = String(empNum);
        const deptCode = departmentAssignmentsMap[empKey] || '';
        const empCat = empCatMap[empKey]?.employmentCategory;
        const empBranch =
          emp.branch != null && emp.branch !== '' ? Number(emp.branch) : null;
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
          branch: empBranch,
          records: [],
          rawRecords: [],
          hasRecords: false,
          _loading: true,
          rawUser: {
            employeeNumber: empNum,
            firstName: emp.firstName,
            lastName: emp.lastName,
            middleName: emp.middleName,
            departmentCode: deptCode,
            employmentCategory: empCat,
            branch: empBranch,
            registrationStatus: emp.registrationStatus || 'Not Registered',
          },
        };
      });

      if (quiet) {
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
              rawRecords: existing.rawRecords || existing.records || [],
              hasRecords: existing.hasRecords,
              _loading: false,
            };
          });
        });
      } else {
        setAllUsersDTR(skeletonUsers);
        // Drop the full-screen overlay once the list is on screen; row-level
        // `_loading` covers per-employee hydration.
        setLoadingAllUsers(false);
        setLoadPhase(`Loading attendance (0 / ${empList.length})…`);
      }

      const empNums = skeletonUsers.map((u) => u.employeeNumber);
      const empListIds = empList.map((e) => e.personID);

      // Visible page first (same sort as the table) so bulk feels instant.
      const pageSize = Math.max(5, Number(rowsPerPage) || 10);
      const sortedForPage = sortEmployeesByLastName(
        skeletonUsers,
        (u) => u.fullName || u.lastName || u,
      );
      const priorityIds = sortedForPage
        .slice(0, pageSize)
        .map((u) => u.employeeNumber);
      const prioritySet = new Set(priorityIds.map(String));
      const restIds = empNums.filter((id) => !prioritySet.has(String(id)));

      // Print status for everyone (cheap). OT/late for the visible page first.
      const secondaryPromise = Promise.all([
        fetchBatchOfficialTimes(priorityIds, startDate, endDate),
        axios
          .post(
            `${API_BASE_URL}/attendance/api/dtr-print-status`,
            {
              employeeNumbers: empListIds.map((id) => printStatusKey(id)),
              ...yearMonthFromYmd(startDate),
            },
            cfg(),
          )
          .then((psRes) => {
            if (signal.aborted || !isLatest()) return;
            const newMap = new Map();
            (psRes.data || []).forEach((s) => {
              const key = printStatusKey(s.employee_number);
              if (!key) return;
              newMap.set(key, {
                printed_at: s.printed_at,
                printed_by: s.printed_by,
              });
            });
            setPrintStatusMap(newMap);
          }),
        dtrType === 'regular'
          ? loadComputedLateBatch(priorityIds)
          : Promise.resolve(),
      ]).catch((e) => {
        if (!signal.aborted) console.warn('DTR batch secondary load:', e);
      });

      const applyChunkRows = (pageMap) => {
        if (!pageMap.size || !isLatest()) return;
        setAllUsersDTR((prev) =>
          prev.map((user) => {
            const key = String(user.employeeNumber);
            if (!pageMap.has(key)) return user;
            const rows = pageMap.get(key);
            const filtered = filterByDtrType(rows, dtrType);
            return {
              ...user,
              rawRecords: rows,
              records: filtered,
              hasRecords: filtered.length > 0,
              _loading: false,
            };
          }),
        );
      };

      const hydrateEmployeeIds = async (ids, { urgent = false } = {}) => {
        if (!ids.length) return 0;
        const chunks = [];
        for (let i = 0; i < ids.length; i += ATTENDANCE_CHUNK) {
          chunks.push(ids.slice(i, i + ATTENDANCE_CHUNK));
        }
        let pendingPageMap = new Map();
        let hydrated = 0;
        let flushRound = 0;

        const flushPending = () => {
          if (!pendingPageMap.size) return;
          const pageMap = pendingPageMap;
          pendingPageMap = new Map();
          applyChunkRows(pageMap);
        };

        for (let i = 0; i < chunks.length; i += ATTENDANCE_CONCURRENCY) {
          if (signal.aborted || !isLatest()) break;
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
          if (signal.aborted || !isLatest()) return hydrated;

          batchRows.flat().forEach((record) => {
            const id = String(
              record.personID || record.agencyEmployeeNum || '',
            ).trim();
            if (!id) return;
            if (!pendingPageMap.has(id)) pendingPageMap.set(id, []);
            pendingPageMap.get(id).push(record);
          });

          hydrated += batch.reduce((n, c) => n + c.length, 0);
          flushRound += 1;

          const shouldFlush =
            urgent ||
            flushRound === 1 ||
            flushRound % BACKGROUND_FLUSH_EVERY === 0 ||
            i + ATTENDANCE_CONCURRENCY >= chunks.length;
          if (shouldFlush) flushPending();

          if (!quiet && isLatest()) {
            const shown = Math.min(
              priorityIds.length + (urgent ? 0 : hydrated),
              empList.length,
            );
            // hydrated is row count; clamp to employee list size for the label.
            setLoadPhase(
              `Loading attendance (${Math.min(shown || hydrated, empList.length)} / ${empList.length})…`,
            );
          }

          // Let the browser paint between background rounds.
          if (!urgent && i + ATTENDANCE_CONCURRENCY < chunks.length) {
            await new Promise((r) => setTimeout(r, BACKGROUND_YIELD_MS));
          }
        }
        flushPending();
        return hydrated;
      };

      // Phase 1 — visible page only (fast first paint).
      await hydrateEmployeeIds(priorityIds, { urgent: true });
      if (signal.aborted || !isLatest()) return;

      // Quiet / socket refresh: only refresh the visible page so the table
      // does not stutter while hundreds of employees re-hydrate.
      if (!quiet && restIds.length) {
        setLoadPhase(
          `Loading attendance (${priorityIds.length} / ${empList.length})…`,
        );
        // Phase 2 — remaining employees in the background (throttled flushes).
        await hydrateEmployeeIds(restIds, { urgent: false });
        if (!signal.aborted && isLatest()) {
          fetchBatchOfficialTimes(restIds, startDate, endDate).catch(() => {});
          if (dtrType === 'regular') {
            loadComputedLateBatch(restIds).catch(() => {});
          }
        }
      }

      if (signal.aborted || !isLatest()) return;

      setAllUsersDTR((prev) =>
        prev.map((u) => (u._loading ? { ...u, _loading: false } : u)),
      );
      lastDataFreshAtRef.current = Date.now();

      await secondaryPromise;
    } catch (error) {
      if (error?.code === 'ERR_CANCELED' || signal?.aborted) return;
      console.error('fetchAllUsersDTR error:', error);
      if (!quiet && isLatest()) {
        showAlert(
          'Fetch Error',
          error.response?.data?.error || 'Error fetching attendance records.',
        );
        setAllUsersDTR([]);
        setBatchOfficialTimesMap({});
      }
    } finally {
      // Only the latest in-flight request may clear loading — prevents abort
      // races from leaving "Processing…" stuck on tab focus.
      if (isLatest()) {
        setLoadingAllUsers(false);
        setLoadPhase('');
      }
    }
  }, [
    startDate,
    endDate,
    dtrType,
    rowsPerPage,
    fetchBatchOfficialTimes,
    loadComputedLateBatch,
    departmentAssignmentsMap,
    empCatMap,
    refreshHolidaysAndSuspensions,
  ]);

  useEffect(() => {
    if (viewMode === 'multiple' && startDate && endDate) fetchAllUsersDTR();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, viewMode]);

  // ─── Month click ────────────────────────────────────────────────────────
  const handleMonthClick = (idx) => {
    const start = new Date(Date.UTC(selectedYear, idx, 1));
    const end = new Date(Date.UTC(selectedYear, idx + 1, 0));
    const nextStart = start.toISOString().substring(0, 10);
    const nextEnd = end.toISOString().substring(0, 10);
    setStartDate(nextStart);
    setEndDate(nextEnd);
    setPrintRangeStart(nextStart);
    setPrintRangeEnd(nextEnd);
    setPrintQuincena('full');
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

  const printPeriodMonth = useMemo(() => {
    if (selectedMonth != null && Number.isFinite(selectedYear)) {
      return { year: selectedYear, month: selectedMonth };
    }
    if (startDate && /^\d{4}-\d{2}/.test(startDate)) {
      const [y, m] = startDate.split('-').map(Number);
      if (Number.isFinite(y) && Number.isFinite(m)) {
        return { year: y, month: m - 1 };
      }
    }
    return null;
  }, [selectedMonth, selectedYear, startDate]);

  const printPeriodLastDay = useMemo(() => {
    if (!printPeriodMonth) return 31;
    return new Date(printPeriodMonth.year, printPeriodMonth.month + 1, 0).getDate();
  }, [printPeriodMonth]);

  const printPeriodMinDate = printPeriodMonth
    ? toYmd(printPeriodMonth.year, printPeriodMonth.month, 1)
    : '';
  const printPeriodMaxDate = printPeriodMonth
    ? toYmd(printPeriodMonth.year, printPeriodMonth.month, printPeriodLastDay)
    : '';

  const applyPrintDates = useCallback(
    (from, to) => {
      let nextFrom = from || '';
      let nextTo = to || '';
      if (nextFrom && nextTo && nextFrom > nextTo) {
        const swap = nextFrom;
        nextFrom = nextTo;
        nextTo = swap;
      }
      setPrintRangeStart(nextFrom);
      setPrintRangeEnd(nextTo);
      if (printPeriodMonth) {
        setPrintQuincena(
          inferPrintPeriodPreset(
            nextFrom,
            nextTo,
            printPeriodMonth.year,
            printPeriodMonth.month,
          ),
        );
      } else {
        setPrintQuincena(nextFrom && nextTo ? 'custom' : 'full');
      }
    },
    [printPeriodMonth],
  );

  const handlePrintPeriodPreset = (preset) => {
    if (!printPeriodMonth) return;
    const { year, month } = printPeriodMonth;
    const last = printPeriodLastDay;
    if (preset === 'full') applyPrintDates(toYmd(year, month, 1), toYmd(year, month, last));
    else if (preset === 'first') applyPrintDates(toYmd(year, month, 1), toYmd(year, month, 15));
    else if (preset === 'second') applyPrintDates(toYmd(year, month, 16), toYmd(year, month, last));
  };

  const getPrintPeriodDates = useCallback(() => {
    const from = printRangeStart || startDate;
    const to = printRangeEnd || endDate;
    const a = parseYmd(from);
    const b = parseYmd(to);
    if (!a || !b) {
      return { startDate: from, endDate: to, dayFrom: undefined, dayTo: undefined };
    }
    const sameMonth =
      printPeriodMonth &&
      a.y === printPeriodMonth.year &&
      b.y === printPeriodMonth.year &&
      a.mo === printPeriodMonth.month + 1 &&
      b.mo === printPeriodMonth.month + 1;
    if (
      printQuincena === 'full' ||
      (sameMonth && a.d === 1 && b.d === printPeriodLastDay)
    ) {
      return {
        startDate: from,
        endDate: to,
        dayFrom: undefined,
        dayTo: undefined,
      };
    }
    if (sameMonth) {
      const dayFrom = Math.min(a.d, b.d);
      const dayTo = Math.max(a.d, b.d);
      return { startDate: from, endDate: to, dayFrom, dayTo };
    }
    return { startDate: from, endDate: to, dayFrom: a.d, dayTo: b.d };
  }, [
    printRangeStart,
    printRangeEnd,
    printQuincena,
    printPeriodMonth,
    printPeriodLastDay,
    startDate,
    endDate,
  ]);

  const printPeriodCaption = printPeriodLabel(
    printQuincena,
    printPeriodLastDay,
    printRangeStart,
    printRangeEnd,
  );

  const printPeriodPresetOptions = [
    { val: 'full', label: 'Full' },
    { val: 'first', label: '1–15' },
    { val: 'second', label: `16–${printPeriodLastDay}` },
  ];

  const renderPrintPeriodControls = () => (
    <>
      <AttendanceFilterToggleRow
        options={printPeriodPresetOptions}
        value={printQuincena}
        onChange={handlePrintPeriodPreset}
      />
      <AttendanceFilterSectionLabel icon={CalendarToday}>
        Range Picker
      </AttendanceFilterSectionLabel>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '6px', mb: 1.25 }}>
        <PrintPeriodDateField
          label="From"
          value={printRangeStart}
          min={printPeriodMinDate}
          max={printPeriodMaxDate}
          onChange={(value) => applyPrintDates(value, printRangeEnd || value)}
        />
        <PrintPeriodDateField
          label="To"
          value={printRangeEnd}
          min={printPeriodMinDate}
          max={printPeriodMaxDate}
          onChange={(value) => applyPrintDates(printRangeStart || value, value)}
        />
      </Box>
    </>
  );

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
    setEmpCatFreshNonce((n) => n + 1);
    lastAutoOpenKeyRef.current = '';
    await fetchRecords();
  };

  // ─── Selection helpers ─────────────────────────────────────────────────
  const handleUserSelect = (empNum) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      next.has(empNum) ? next.delete(empNum) : next.add(empNum);
      return next;
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const selectable = getFilteredUsers();
      const limited = selectable.slice(0, BULK_DTR_LIMIT);
      setSelectedUsers(new Set(limited.map((u) => u.employeeNumber)));
      if (selectable.length > BULK_DTR_LIMIT)
        showAlert(
          'Selection Limited',
          `Only first ${BULK_DTR_LIMIT} selected. Bulk print limit is ${BULK_DTR_LIMIT} per batch.`,
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
      filtered = filtered.filter((u) =>
        printStatusMap.has(printStatusKey(u.employeeNumber)),
      );
    else if (printStatusFilter === 'unprinted')
      filtered = filtered.filter(
        (u) => !printStatusMap.has(printStatusKey(u.employeeNumber)),
      );
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
    return sortEmployeesByLastName(filtered, (u) => u.fullName || u.lastName || u);
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

  // If the user pages ahead of the background hydrate, pull that page now
  // so bulk never looks stuck/glitchy on empty loading rows.
  const pageNeedsHydrateKey = paginatedUsers
    .filter((u) => u._loading)
    .map((u) => String(u.employeeNumber))
    .join(',');
  useEffect(() => {
    if (viewMode !== 'multiple' || !startDate || !endDate || !pageNeedsHydrateKey) {
      return undefined;
    }
    const needIds = pageNeedsHydrateKey.split(',').filter(Boolean);
    if (!needIds.length) return undefined;
    let cancelled = false;
    const ctrl = new AbortController();
    (async () => {
      try {
        const pageRes = await axios.post(
          `${API_BASE_URL}/attendance/api/view-attendance-all-users-paged`,
          {
            startDate,
            endDate,
            employeeNumbers: needIds,
            skipCount: true,
            skipAudit: true,
          },
          { ...getAuthHeaders(), signal: ctrl.signal },
        );
        if (cancelled) return;
        const byEmp = new Map();
        (pageRes.data?.data || []).forEach((record) => {
          const id = String(
            record.personID || record.agencyEmployeeNum || '',
          ).trim();
          if (!id) return;
          if (!byEmp.has(id)) byEmp.set(id, []);
          byEmp.get(id).push(record);
        });
        if (!byEmp.size) {
          setAllUsersDTR((prev) =>
            prev.map((u) =>
              needIds.includes(String(u.employeeNumber))
                ? { ...u, _loading: false, rawRecords: u.rawRecords || [], records: u.records || [], hasRecords: !!u.records?.length }
                : u,
            ),
          );
          return;
        }
        setAllUsersDTR((prev) =>
          prev.map((user) => {
            const key = String(user.employeeNumber);
            if (!byEmp.has(key)) {
              return needIds.includes(key) ? { ...user, _loading: false } : user;
            }
            const rows = byEmp.get(key);
            const filtered = filterByDtrType(rows, dtrType);
            return {
              ...user,
              rawRecords: rows,
              records: filtered,
              hasRecords: filtered.length > 0,
              _loading: false,
            };
          }),
        );
        fetchBatchOfficialTimes(needIds, startDate, endDate).catch(() => {});
        if (dtrType === 'regular') {
          loadComputedLateBatch(needIds).catch(() => {});
        }
      } catch (e) {
        if (e?.code === 'ERR_CANCELED' || cancelled) return;
        console.warn('Priority page hydrate failed:', e?.message || e);
      }
    })();
    return () => {
      cancelled = true;
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, startDate, endDate, pageNeedsHydrateKey, dtrType]);

  const getCategoryLabel = (id) =>
    EMPLOYMENT_CATEGORY_OPTIONS.find(
      (option) => String(option.value) === String(id),
    )?.label || 'Unknown';
  const getCategoryShortLabel = (id) =>
    EMPLOYMENT_CATEGORY_OPTIONS.find(
      (option) => String(option.value) === String(id),
    )?.shortLabel || getCategoryLabel(id);
  const getCategoryColor = (id) =>
    EMPLOYMENT_CATEGORY_OPTIONS.find(
      (option) => String(option.value) === String(id),
    )?.color || '#757575';

  const resolveBulkPdfFilterLabels = () => ({
    department: departmentFilter || '',
    employmentCategory:
      employmentCategoryFilter !== ''
        ? getCategoryShortLabel(employmentCategoryFilter)
        : '',
  });

  const resolvePdfFileName = (users) => {
    const { startDate: printStart, dayFrom, dayTo } = getPrintPeriodDates();
    const periodSuffix =
      printQuincena === 'first'
        ? ' 1st Quincena'
        : printQuincena === 'second'
          ? ' 2nd Quincena'
          : printQuincena === 'custom'
            ? ` ${printRangeStart} to ${printRangeEnd}`
            : '';
    const base =
      users.length === 1
        ? formatDtrPdfFileName(users[0], printStart || startDate)
        : formatDtrBulkPdfFileName(
            printStart || startDate,
            resolveBulkPdfFilterLabels(),
          );
    return periodSuffix
      ? base.replace(/\.pdf$/i, `${periodSuffix}.pdf`)
      : base;
  };

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
    const count = n === 'all' ? Math.min(BULK_DTR_LIMIT, f.length) : Number(n) || 0;
    setSelectedUsers(new Set(f.slice(0, count).map((u) => u.employeeNumber)));
    setPreviewUsers(f.slice(0, count));
    setCurrentPreviewIndex(0);
  };

  const handleBulkPrint = () => {
    // Use full batch list so search/filters only affect the table view,
    // not which checked employees get printed.
    const toPrint = allUsersDTR.filter((u) =>
      selectedUsers.has(u.employeeNumber),
    );
    if (!toPrint.length) {
      showAlert('No Selection', 'Please select at least one user to print');
      return;
    }
    if (toPrint.length > BULK_DTR_LIMIT) {
      showAlert(
        'Too Many Selected',
        `You selected ${toPrint.length} users. Limit is ${BULK_DTR_LIMIT} per batch.`,
      );
      return;
    }
    const alreadyPrintedUsers = toPrint.filter((u) =>
      printStatusMap.has(printStatusKey(u.employeeNumber)),
    );
    const alreadyPrintedCount = alreadyPrintedUsers.length;
    if (alreadyPrintedCount > 0) {
      setConfirmModal({
        open: true,
        user: null,
        bulkUsers: toPrint,
        alreadyPrintedCount,
        alreadyPrintedUsers,
      });
      return;
    }
    openBulkPreview(toPrint);
  };

  const handlePrevious = () =>
    setCurrentPreviewIndex((p) => (p > 0 ? p - 1 : previewUsers.length - 1));
  const handleNext = () =>
    setCurrentPreviewIndex((p) => (p < previewUsers.length - 1 ? p + 1 : 0));

  // ─── Print helpers ──────────────────────────────────────────────────────
  /**
   * Render every selected employee's DTR straight to HTML.
   *
   * Rendering into a detached React root skips layout, rasterising and the
   * mount-one-DTR-at-a-time cycle that html2canvas needed, so a bulk
   * batch costs about as much as a single DTR for the HTML step.
   */
  const buildDtrPrintPages = (users, calendarOverrides = null) => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const pages = [];

    try {
      users.forEach((user) => {
        const empNum = user.employeeNumber;
        const officialTimesForUser =
          String(empNum) === String(personID)
            ? officialTimes
            : batchOfficialTimesMap[empNum] || {};
        flushSync(() => {
          root.render(
            <DTRTemplate
              {...buildDtrTemplateProps(
                user.records,
                user.fullName,
                officialTimesForUser,
                empNum,
                user.rawUser?.employmentCategory ??
                  user.employmentCategory ??
                  null,
                user.rawUser?.branch ?? user.branch,
                approvedLeaves,
                calendarOverrides,
              )}
            />,
          );
        });
        const html = container.firstElementChild?.outerHTML;
        if (html) pages.push(html);
      });
    } finally {
      root.unmount();
    }

    return pages;
  };

  const printJobTitle = (users) =>
    resolvePdfFileName(users).replace(/\.pdf$/i, '');

  const markDtrsPrinted = async (users) => {
    const employeeNumbers = users.map((u) => printStatusKey(u.employeeNumber));
    const { startDate: printStart, endDate: printEnd } = getPrintPeriodDates();
    const ym = yearMonthFromYmd(printStart || startDate);
    await axios.post(
      `${API_BASE_URL}/attendance/api/mark-dtr-printed`,
      {
        employeeNumbers,
        year: ym.year,
        month: ym.month,
        startDate: printStart || startDate,
        endDate: printEnd || endDate,
      },
      getAuthHeaders(),
    );
    const printedAt = new Date().toISOString();
    setPrintStatusMap((prev) => {
      const next = new Map(prev);
      employeeNumbers.forEach((n) =>
        next.set(printStatusKey(n), {
          printed_at: printedAt,
          printed_by: 'current_user',
        }),
      );
      return next;
    });
  };

  const getSinglePrintUser = () => ({
    employeeNumber: personID,
    records,
    fullName: employeeName,
    lastName: selectedEmployee?.lastName,
    firstName: selectedEmployee?.firstName,
    middleName: selectedEmployee?.middleName,
    rawUser: selectedEmployee,
    employmentCategory: selectedEmployee?.employmentCategory,
    branch:
      selectedEmployee?.branch ?? selectedEmployee?.rawUser?.branch,
  });

  /** Print any set of employees as HTML — one sheet per employee, one job. */
  const printUsersDtr = async (users, { markPrinted = true } = {}) => {
    setPrintingAll(true);
    setPrintingStatus(
      users.length === 1
        ? 'Preparing DTR…'
        : `Preparing ${users.length} DTRs…`,
    );
    setPreviewModalOpen(false);

    try {
      // Skip forced calendar pull when data is still fresh (bulk PDF speed).
      const calendarFresh =
        lastDataFreshAtRef.current > 0 &&
        Date.now() - lastDataFreshAtRef.current < 60_000;
      const calendar = calendarFresh
        ? null
        : await refreshHolidaysAndSuspensions({ force: true });
      await new Promise((r) => requestAnimationFrame(r));
      const pages = buildDtrPrintPages(users, calendar);
      if (!pages.length) throw new Error('No DTRs could be prepared.');

      await printDtrPdfPages(pages, {
        title: printJobTitle(users),
        onProgress: (done, total) => {
          if (done === 1 || done === total || done % 5 === 0) {
            setPrintingStatus(
              total === 1
                ? 'Preparing DTR…'
                : `Preparing DTR ${done} of ${total}…`,
            );
          }
        },
      });

      if (markPrinted) {
        try {
          await markDtrsPrinted(users);
          setSelectedUsers(new Set());
        } catch (e) {
          console.error('Error marking DTRs printed:', e);
        }
      }
    } finally {
      setPrintingStatus('');
      setPrintingAll(false);
    }
  };

  /** Download selected employees as one auto-saved PDF. */
  const downloadUsersDtr = async (users) => {
    setPrintingAll(true);
    setPrintingStatus(
      users.length === 1
        ? 'Preparing PDF download…'
        : `Preparing PDF ${users.length} DTRs…`,
    );
    setPreviewModalOpen(false);

    try {
      const calendarFresh =
        lastDataFreshAtRef.current > 0 &&
        Date.now() - lastDataFreshAtRef.current < 60_000;
      const calendar = calendarFresh
        ? null
        : await refreshHolidaysAndSuspensions({ force: true });
      await new Promise((r) => requestAnimationFrame(r));
      const pages = buildDtrPrintPages(users, calendar);
      if (!pages.length) throw new Error('No DTRs could be prepared.');
      const fileName = resolvePdfFileName(users);
      await downloadDtrHtmlPages(pages, fileName, {
        title: fileName.replace(/\.pdf$/i, ''),
        onProgress: (done, total) => {
          if (done === 1 || done === total || done % 5 === 0) {
            setPrintingStatus(`Building PDF ${done} of ${total}…`);
          }
        },
      });
    } finally {
      setPrintingStatus('');
      setPrintingAll(false);
    }
  };

  const collectUnmountedIssues = async (users) => {
    const period = getPrintPeriodDates();
    const ids = [
      ...new Set(
        (users || [])
          .map((user) => String(user?.employeeNumber || '').trim())
          .filter(Boolean),
      ),
    ];
    const nameById = new Map(
      (users || []).map((user) => [
        String(user?.employeeNumber || '').trim(),
        user?.fullName ||
          [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
          '',
      ]),
    );
    const openId = String(personID || '').trim();
    const rail = railPunchReviewRef.current;
    if (ids.length === 1 && ids[0] === openId && rail.ready) {
      return filterUnmountedIssuesByPeriod(
        rail.issues,
        period.startDate,
        period.endDate,
      ).map((issue) => ({
        ...issue,
        employeeName: nameById.get(openId) || employeeName || openId,
      }));
    }

    const response = await axios.post(
      `${API_BASE_URL}/attendance/api/attendance-raw-batch`,
      {
        personIDs: ids,
        startDate: period.startDate,
        endDate: period.endDate,
      },
      getAuthHeaders(),
    );
    return filterUnmountedIssuesByPeriod(
      detectUnmountedPunches(Array.isArray(response.data) ? response.data : []),
      period.startDate,
      period.endDate,
    ).map((issue) => ({
      ...issue,
      employeeName:
        nameById.get(String(issue.personID)) || String(issue.personID),
    }));
  };

  const runPendingDtrOutput = async (pending) => {
    if (!pending?.users?.length) return;
    if (pending.kind === 'download') {
      await downloadUsersDtr(pending.users);
      return;
    }
    await printUsersDtr(pending.users, { markPrinted: pending.markPrinted !== false });
  };

  const guardUnmountedPrint = async (users, kind, { markPrinted = true } = {}) => {
    if (!users?.length) return;
    try {
      const issues = await collectUnmountedIssues(users);
      if (!issues.length) {
        await runPendingDtrOutput({ users, kind, markPrinted });
        return;
      }
      setUnmountedPrintDialog({
        open: true,
        issues,
        pending: { users, kind, markPrinted },
      });
      setUnmountedExpandedIds(new Set());
    } catch (error) {
      console.error('Unmounted punch check failed:', error);
      showAlert(
        'Punch check failed',
        'Could not verify punches that will be missing from the DTR. Printing was not started.',
      );
    }
  };

  const openPunchStatusForReview = useCallback(
    (issue = null, { focusDay = Boolean(issue) } = {}) => {
      const issues = issue
        ? [issue]
        : unmountedPrintDialog.issues || [];
      const target = issue || issues[0] || null;
      const id = String(
        target?.personID || issues[0]?.personID || personID || '',
      ).trim();
      const name =
        target?.employeeName ||
        issues.find((i) => String(i.personID) === id)?.employeeName ||
        employeeName ||
        '';

      setPreviewModalOpen(false);
      setUnmountedPrintDialog({ open: false, issues: [], pending: null });
      setUnmountedExpandedIds(new Set());

      if (id) {
        if (id !== String(personID || '').trim()) {
          setPersonID(id);
          setEmployeeName(name);
          setSelectedEmployee(null);
          setHasSearchedSingle(true);
          setViewMode('single');
          setTimeout(() => {
            fetchRecordsRef.current?.();
          }, 250);
        } else {
          setViewMode('single');
          setHasSearchedSingle(true);
        }
      }

      setReviewFocusDate(
        focusDay ? String(target?.date || '').trim() : '',
      );
      setReviewFocusRowKey(
        focusDay ? String(target?.rowKey || '').trim() : '',
      );
      setReviewFocusToken((token) => token + 1);
    },
    [unmountedPrintDialog.issues, personID, employeeName],
  );

  const handleReviewUnmountedPunches = () => {
    const issues = unmountedPrintDialog.issues || [];
    const ids = [
      ...new Set(
        issues
          .map((issue) => String(issue.personID || '').trim())
          .filter(Boolean),
      ),
    ];
    if (ids.length === 1) {
      openPunchStatusForReview(null, { focusDay: false });
      return;
    }
    setUnmountedPrintDialog({ open: false, issues: [], pending: null });
    setUnmountedExpandedIds(new Set());
    setSnackbar({
      open: true,
      severity: 'warning',
      message: `${ids.length} employees have punches that will not print. Open each in individual view and correct the status on the right.`,
    });
  };

  const handlePrintDespiteUnmounted = async () => {
    const pending = unmountedPrintDialog.pending;
    setUnmountedPrintDialog({ open: false, issues: [], pending: null });
    setUnmountedExpandedIds(new Set());
    try {
      await runPendingDtrOutput(pending);
    } catch (error) {
      console.error('Error continuing DTR output:', error);
      showAlert(
        pending?.kind === 'download' ? 'Download Error' : 'Print Error',
        error.message || 'Unknown error',
      );
    }
  };

  const handleIndividualPrintConfirmed = async (user) => {
    const wasPrinted = printStatusMap.has(printStatusKey(user?.employeeNumber));
    closeConfirm();
    setPreviewUsers([user]);
    setCurrentPreviewIndex(0);
    if (wasPrinted) {
      setSnackbar({
        open: true,
        message: 'Printing another copy of an already printed DTR.',
        severity: 'info',
      });
    }

    try {
      await guardUnmountedPrint([user], 'print');
    } catch (error) {
      console.error('Error printing individual DTR:', error);
      showAlert('Print Error', `Error printing DTR: ${error.message}`);
    }
  };

  const handleBulkReprintConfirmed = () => {
    const users = confirmModal.bulkUsers || [];
    const count = confirmModal.alreadyPrintedCount || 0;
    closeConfirm();
    if (!users.length) return;
    setSnackbar({
      open: true,
      message:
        count === 1
          ? 'Printing another copy of an already printed DTR.'
          : `Printing another copy — ${count} of ${users.length} DTRs were already printed.`,
      severity: 'info',
    });
    openBulkPreview(users);
  };

  const handlePrintConfirmAction = () => {
    if (confirmModal.bulkUsers?.length) {
      handleBulkReprintConfirmed();
      return;
    }
    if (confirmModal.user) {
      handleIndividualPrintConfirmed(confirmModal.user);
    }
  };

  const handlePrintAllSelected = async () => {
    if (!previewUsers.length) {
      showAlert('No Selection', 'No DTRs to print.');
      return;
    }

    try {
      await guardUnmountedPrint(previewUsers, 'print');
    } catch (error) {
      console.error('Error printing DTRs:', error);
      showAlert('Print Error', `Error: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDownloadAllSelected = async () => {
    if (!previewUsers.length) {
      showAlert('No Selection', 'No DTRs to download.');
      return;
    }

    try {
      await guardUnmountedPrint(previewUsers, 'download');
    } catch (error) {
      console.error('Error preparing DTRs for download:', error);
      showAlert('Download Error', `Error: ${error.message || 'Unknown error'}`);
    }
  };

  const printPage = async () => {
    if (!verifyIntegrity()) return;
    restoreDOMFromOriginal();
    try {
      await guardUnmountedPrint([getSinglePrintUser()], 'print', { markPrinted: false });
    } catch (error) {
      console.error('Error printing DTR:', error);
      showAlert('Print Error', `Error printing DTR: ${error.message}`);
    }
  };

  const downloadPDF = async () => {
    if (!verifyIntegrity()) return;
    restoreDOMFromOriginal();
    try {
      await guardUnmountedPrint([getSinglePrintUser()], 'download', { markPrinted: false });
    } catch (error) {
      console.error('Error preparing DTR for download:', error);
      showAlert('Download Error', `Error: ${error.message || 'Unknown error'}`);
    }
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
    printingAll ||
    singlePrintLoading ||
    (viewMode === 'single' && monthLoading) ||
    (viewMode === 'multiple' && loadingAllUsers) ||
    employeeSearchLoading;

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

  const buildDtrTemplateProps = (
    sourceRecords,
    nameDisplay,
    officialTimesForUser = {},
    employeeNumber = null,
    employmentCategory = null,
    employeeBranch = undefined,
    leaves = approvedLeaves,
    calendarOverrides = null,
  ) => {
    const empKey =
      employeeNumber != null
        ? String(employeeNumber)
        : String(personID || '');
    const knownModuleType = computationModuleTypeByEmployee[empKey] || null;
    const empCat =
      employmentCategory ??
      empCatMap[empKey]?.employmentCategory ??
      selectedEmployee?.employmentCategory ??
      null;
    // Match Individual DTR: only campus-filter when we know the employee's
    // branch. Passing null activates filtering and hides campus-scoped
    // suspensions (Manila/Cavite) that Individual still shows.
    const resolvedBranch =
      employeeBranch === null ||
      employeeBranch === undefined ||
      employeeBranch === ''
        ? undefined
        : Number(employeeBranch);
    const displayPeriod = getPrintPeriodDates();
    const dayInDisplayRange = (value) => {
      if (displayPeriod.dayFrom == null) return true;
      const parsed = parseYmd(value);
      if (!parsed) return true;
      return parsed.d >= displayPeriod.dayFrom && parsed.d <= displayPeriod.dayTo;
    };
    const rangedRecords = (sourceRecords || []).filter((row) =>
      dayInDisplayRange(row?.date),
    );
    const lateMap = computedLateByEmployee[empKey] || {};
    const rangedLate = Object.fromEntries(
      Object.entries(lateMap).filter(([date]) => dayInDisplayRange(date)),
    );
    const rangedHalfDays = new Set(
      [...(halfDayDatesByEmployee[empKey] || [])].filter((date) =>
        dayInDisplayRange(date),
      ),
    );
    const reviewMap = halfDayReviewByEmployee[empKey] || {};
    const rangedReview = Object.fromEntries(
      Object.entries(reviewMap).filter(([date]) => dayInDisplayRange(date)),
    );
    const calendarOverlapsRange = (entry) => {
      if (displayPeriod.dayFrom == null) return true;
      const start = parseYmd(entry?.date_start || entry?.date);
      const end = parseYmd(entry?.date_end || entry?.date) || start;
      if (!start || !end) return true;
      return end.d >= displayPeriod.dayFrom && start.d <= displayPeriod.dayTo;
    };
    const sourceHolidays = calendarOverrides?.holidays ?? holidays;
    const sourceSuspensions = calendarOverrides?.suspensions ?? suspensions;
    return {
      employeeName: nameDisplay,
      records: rangedRecords,
      officialTime: officialTimesForUser,
      showOfficialTimeOnDtr,
      indicatorVisibility,
      startDate: displayPeriod.startDate || startDate,
      endDate: displayPeriod.endDate || endDate,
      selectedYear,
      selectedMonth,
      holidays: sourceHolidays.filter(calendarOverlapsRange),
      suspensions: sourceSuspensions.filter(calendarOverlapsRange),
      approvedLeaves: (leaves || []).filter((leave) =>
        calendarOverlapsRange({
          date_start: leave?.startDate || leave?.date_start || leave?.date,
          date_end: leave?.endDate || leave?.date_end || leave?.date,
        }),
      ),
      computedLateByDate: rangedLate,
      suggestedHalfDayDatesSet: rangedHalfDays,
      halfDayReviewByDate: rangedReview,
      // Do not invent NON_TEACHING — that hid academic-scoped suspensions when
      // the computation module had not been saved yet for this employee.
      computationModuleType: knownModuleType || undefined,
      employeeScope: resolveEmployeeSuspensionScope(
        knownModuleType,
        empCat,
        empCatMap[empKey],
      ),
      employmentCategory: empCat,
      ...(resolvedBranch !== undefined ? { employeeBranch: resolvedBranch } : {}),
      ...(displayPeriod.dayFrom != null
        ? {
            dataDayFrom: displayPeriod.dayFrom,
            dataDayTo: displayPeriod.dayTo,
          }
        : {}),
      formatTime,
      dtrType,
    };
  };

  const renderDTRTablePair = (
    sourceRecords,
    nameDisplay,
    officialTimesForUser = {},
    employeeNumber = null,
    employmentCategory = null,
    employeeBranch = undefined,
  ) => (
    <DTRTemplate
      {...buildDtrTemplateProps(
        sourceRecords,
        nameDisplay,
        officialTimesForUser,
        employeeNumber,
        employmentCategory,
        employeeBranch,
      )}
    />
  );

  const renderDTRForModal = (user) => (
    <div className="table-container" style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <div
        className="table-wrapper"
        style={{ position: 'relative', width: '100%', maxWidth: '100%', minWidth: 0 }}
      >
        <DtrFitPreview>
          <DTRTemplate
            {...buildDtrTemplateProps(
              user.records,
              user.fullName,
              String(user.employeeNumber) === String(personID)
                ? officialTimes
                : batchOfficialTimesMap[user.employeeNumber] || {},
              user.employeeNumber,
              user.rawUser?.employmentCategory ?? user.employmentCategory ?? null,
              user.rawUser?.branch ?? user.branch,
              approvedLeaves,
              null,
            )}
          />
        </DtrFitPreview>
      </div>
    </div>
  );

  const indicatorEnabledCount = DTR_INDICATOR_OPTIONS.filter(
    (opt) => indicatorVisibility[opt.key] !== false,
  ).length;
  const allIndicatorsOn = indicatorEnabledCount === DTR_INDICATOR_OPTIONS.length;
  const noIndicatorsOn = indicatorEnabledCount === 0;
  const indicatorButtonLabel = noIndicatorsOn
    ? 'Indicators off'
    : allIndicatorsOn
      ? 'Indicators'
      : `Indicators (${indicatorEnabledCount})`;

  const persistIndicatorVisibility = (nextOrUpdater) => {
    setIndicatorVisibility((prev) => {
      const next =
        typeof nextOrUpdater === 'function' ? nextOrUpdater(prev) : nextOrUpdater;
      try {
        localStorage.setItem(DTR_INDICATOR_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore private mode / quota */
      }
      return next;
    });
  };

  const renderIndicatorsButton = () => (
    <Tooltip
      title="Show or hide DTR marks. Punch times stay. Print and PDF use the same choices."
      placement="top"
    >
      <span>
        <AccentButton
          variant={allIndicatorsOn ? 'outlined' : 'contained'}
          size="small"
          aria-label="DTR indicators"
          aria-haspopup="true"
          aria-expanded={Boolean(indicatorMenuAnchor) ? 'true' : 'false'}
          startIcon={<Tune sx={{ fontSize: '15px !important' }} />}
          onClick={(e) => setIndicatorMenuAnchor(e.currentTarget)}
          className="no-print"
          sx={{
            height: 32,
            fontSize: '0.75rem',
            fontWeight: 700,
            px: 1.5,
            color: allIndicatorsOn ? T.accent : '#fff',
            bgcolor: allIndicatorsOn ? '#fff' : T.accent,
            borderColor: T.accent,
            boxShadow: allIndicatorsOn ? 'none' : `0 2px 8px ${alpha(T.accent, 0.3)}`,
            '&:hover': {
              bgcolor: allIndicatorsOn ? T.accentFaint : T.accentDark,
              borderColor: T.accent,
            },
          }}
        >
          {indicatorButtonLabel}
        </AccentButton>
      </span>
    </Tooltip>
  );

  const renderIndicatorMenu = () => (
    <Popover
      open={Boolean(indicatorMenuAnchor)}
      anchorEl={indicatorMenuAnchor}
      onClose={() => setIndicatorMenuAnchor(null)}
      anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
      transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      marginThreshold={16}
      className="no-print"
      sx={{ zIndex: (theme) => theme.zIndex.modal + 2 }}
      PaperProps={{
        sx: {
          mb: 0.75,
          borderRadius: 2,
          width: 300,
          maxHeight: 'min(480px, calc(100vh - 120px))',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 28px rgba(0,0,0,0.14)',
          border: `1px solid ${T.accentBorder}`,
        },
      }}
    >
      <Box sx={{ px: 1.75, pt: 1.35, pb: 1.1, flexShrink: 0 }}>
        <Typography
          sx={{
            fontSize: '0.68rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: T.accent,
          }}
        >
          DTR indicators
        </Typography>
        <Typography
          sx={{
            fontSize: '0.7rem',
            color: T.muted,
            mt: 0.45,
            lineHeight: 1.4,
          }}
        >
          Toggle marks on the form. Punch times always stay visible — indicators
          are notes only.
        </Typography>
        <Box
          sx={{
            mt: 1.1,
            px: 1.1,
            py: 0.65,
            borderRadius: 1.5,
            border: `1px solid ${allIndicatorsOn ? T.accent : T.accentBorder}`,
            bgcolor: allIndicatorsOn ? alpha(T.accent, 0.06) : T.accentFaint,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: allIndicatorsOn ? T.accent : T.text,
                lineHeight: 1.2,
              }}
            >
              All indicators
            </Typography>
            <Typography
              sx={{
                fontSize: '0.65rem',
                color: T.muted,
                lineHeight: 1.2,
                mt: 0.15,
              }}
            >
              {allIndicatorsOn
                ? 'All marks shown'
                : noIndicatorsOn
                  ? 'All marks hidden'
                  : `${indicatorEnabledCount} of ${DTR_INDICATOR_OPTIONS.length} on`}
            </Typography>
          </Box>
          <Switch
            size="small"
            checked={allIndicatorsOn}
            onChange={(e) => {
              if (e.target.checked) {
                persistIndicatorVisibility(defaultDtrIndicatorVisibility());
              } else {
                persistIndicatorVisibility(
                  Object.fromEntries(
                    DTR_INDICATOR_OPTIONS.map((opt) => [opt.key, false]),
                  ),
                );
              }
            }}
            inputProps={{ 'aria-label': 'Toggle all DTR indicators' }}
            sx={{
              flexShrink: 0,
              '& .MuiSwitch-switchBase.Mui-checked': { color: T.accent },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                bgcolor: T.accent,
              },
            }}
          />
        </Box>
      </Box>
      <Divider />
      <Box
        sx={{
          py: 0.6,
          px: 0.75,
          overflowY: 'auto',
          flex: 1,
          minHeight: 0,
        }}
      >
        {DTR_INDICATOR_OPTIONS.map((opt) => {
          const checked = indicatorVisibility[opt.key] !== false;
          const toggle = () =>
            persistIndicatorVisibility((prev) => ({
              ...prev,
              [opt.key]: !checked,
            }));
          return (
            <Box
              key={opt.key}
              onClick={toggle}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 0.85,
                py: 0.55,
                borderRadius: 1.25,
                cursor: 'pointer',
                userSelect: 'none',
                bgcolor: checked ? alpha(opt.color, 0.06) : 'transparent',
                '&:hover': { bgcolor: alpha(opt.color, 0.1) },
              }}
            >
              <Checkbox
                size="small"
                checked={checked}
                onChange={(e) => {
                  e.stopPropagation();
                  persistIndicatorVisibility((prev) => ({
                    ...prev,
                    [opt.key]: e.target.checked,
                  }));
                }}
                onClick={(e) => e.stopPropagation()}
                sx={{
                  p: 0.35,
                  color: alpha(opt.color, 0.55),
                  '&.Mui-checked': { color: opt.color },
                }}
              />
              <Box
                sx={{
                  width: 16,
                  height: 12,
                  borderRadius: '2px',
                  bgcolor: opt.bg,
                  border: `1.5px solid ${opt.color}`,
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: T.text,
                  lineHeight: 1.25,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {opt.label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Popover>
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
          setPrintRangeStart('');
          setPrintRangeEnd('');
          setPrintQuincena('full');
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
          setPrintRangeStart('');
          setPrintRangeEnd('');
          setPrintQuincena('full');
          setAllUsersDTR([]);
          setBatchOfficialTimesMap({});
        }}
        onQuickDate={handleQuickDateSelect}
        months={monthsShort}
      />

      <AttendanceFilterSectionLabel icon={CalendarToday}>
        Date Range
      </AttendanceFilterSectionLabel>
      {renderPrintPeriodControls()}
      <Typography
        sx={{
          fontSize: '0.68rem',
          color: T.muted,
          lineHeight: 1.35,
          mt: -0.5,
          mb: 1.25,
          px: 0.25,
        }}
      >
        Days 1–{printPeriodLastDay} stay on the form. From and To only hide
        times and marks outside the chosen quincena or custom range.
        {printQuincena !== 'full' ? ` Showing ${printPeriodCaption}.` : ''}
      </Typography>

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
      {renderIndicatorMenu()}
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
            <DTRPrintStyles />
            <style>{`
              html, body { overflow: hidden; }
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

                {/* RIGHT: Content + punch-status rail */}
                <Grid item xs={12} lg={9} sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 2,
                      width: '100%',
                      maxWidth: '100%',
                      minWidth: 0,
                      ...attendanceMainPanelHeightSx,
                      flexDirection: { xs: 'column', lg: 'row' },
                      minHeight: 0,
                      alignItems: 'stretch',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                      pr: { lg: 0.25 },
                    }}
                  >
                  <SectionCard
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      overflow: 'hidden',
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
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Compute &amp; save:
                              </Typography>
                              {HUB_COMPUTATION_BUTTONS.map((btn) => {
                                const drawerOpen =
                                  activeComputationDrawer === btn.drawer ||
                                  moduleDrawer === btn.drawer;
                                const isOnDtr =
                                  appliedLateUtModuleType === btn.moduleType;
                                const isExpected =
                                  expectedModuleType === btn.moduleType;
                                const categoryColor =
                                  btn.categoryColor || T.accent;
                                const disabled =
                                  !personID || !hasSearchedSingle;
                                return (
                                  <Tooltip
                                    key={`compute-${btn.drawer}`}
                                    title={
                                      isOnDtr
                                        ? `${btn.label} is currently on this DTR — open to review or Save to Summary again`
                                        : isExpected
                                          ? `${btn.label} matches this employee's employment category`
                                          : drawerOpen
                                            ? `${btn.label} panel is open`
                                            : expectedModuleType
                                              ? `This employee is ${HUB_COMPUTATION_BUTTONS.find((b) => b.moduleType === expectedModuleType)?.label || 'a different type'}. Opening ${btn.label} uses a different formula.`
                                              : `No employment category assigned. Opening ${btn.label} will still compute with this formula.`
                                    }
                                    placement="top"
                                  >
                                    <span>
                                      <AccentButton
                                        variant="outlined"
                                        size="small"
                                        disabled={disabled}
                                        aria-pressed={isOnDtr || drawerOpen || isExpected}
                                        startIcon={
                                          isOnDtr || isExpected ? (
                                            <CheckCircle
                                              sx={{
                                                fontSize: '15px !important',
                                              }}
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
                                          openComputationDrawer(btn.drawer)
                                        }
                                        sx={{
                                          height: 32,
                                          fontSize: '0.72rem',
                                          fontWeight: 700,
                                          px: 1.25,
                                          ...(isOnDtr
                                            ? {
                                                bgcolor: categoryColor,
                                                color: '#fff',
                                                borderColor: categoryColor,
                                                borderWidth: 2,
                                                boxShadow: `0 0 0 2px ${alpha(
                                                  categoryColor,
                                                  0.28,
                                                )}, 0 2px 8px ${alpha(
                                                  categoryColor,
                                                  0.35,
                                                )}`,
                                                '&:hover': {
                                                  bgcolor: categoryColor,
                                                  filter: 'brightness(0.92)',
                                                  borderColor: categoryColor,
                                                  borderWidth: 2,
                                                },
                                                '&.Mui-focusVisible': {
                                                  bgcolor: categoryColor,
                                                  borderColor: categoryColor,
                                                },
                                              }
                                            : isExpected || drawerOpen
                                              ? {
                                                  color: categoryColor,
                                                  borderColor: categoryColor,
                                                  borderWidth: 2,
                                                  bgcolor: alpha(
                                                    categoryColor,
                                                    0.16,
                                                  ),
                                                  boxShadow: `inset 0 0 0 1px ${alpha(
                                                    categoryColor,
                                                    0.35,
                                                  )}`,
                                                  '&:hover': {
                                                    bgcolor: alpha(
                                                      categoryColor,
                                                      0.22,
                                                    ),
                                                    borderColor: categoryColor,
                                                    borderWidth: 2,
                                                  },
                                                }
                                              : {
                                                  color: categoryColor,
                                                  borderColor: alpha(
                                                    categoryColor,
                                                    0.35,
                                                  ),
                                                  bgcolor: '#fff',
                                                  '&:hover': {
                                                    bgcolor: alpha(
                                                      categoryColor,
                                                      0.08,
                                                    ),
                                                    borderColor: categoryColor,
                                                  },
                                                }),
                                          '&.Mui-disabled': { opacity: 0.55 },
                                        }}
                                      >
                                        {isOnDtr
                                          ? `Using · ${btn.label}`
                                          : isExpected
                                            ? `Category · ${btn.label}`
                                            : btn.label}
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
                                className="dtr-print-area"
                                sx={{
                                  bgcolor: '#f4f0f0',
                                  p: { xs: 1, sm: 1.5, md: 2 },
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'flex-start',
                                  position: 'relative',
                                  width: '100%',
                                  minWidth: 0,
                                  boxSizing: 'border-box',
                                }}
                              >
                                <Paper
                                  elevation={2}
                                  sx={{
                                    p: { xs: 1, sm: 1.25, md: 1.5 },
                                    borderRadius: '8px',
                                    bgcolor: '#fff',
                                    position: 'relative',
                                    boxSizing: 'border-box',
                                    overflow: 'hidden',
                                    width: '100%',
                                    maxWidth: '100%',
                                    minWidth: 0,
                                    opacity: singlePrintLoading ? 0 : 1,
                                    pointerEvents: singlePrintLoading
                                      ? 'none'
                                      : 'auto',
                                  }}
                                >
                                  <div
                                    className="table-container"
                                    ref={dtrRef}
                                    style={{
                                      width: '100%',
                                      maxWidth: '100%',
                                      minWidth: 0,
                                    }}
                                  >
                                    <div
                                      className="table-wrapper"
                                      style={{
                                        position: 'relative',
                                        width: '100%',
                                        maxWidth: '100%',
                                        minWidth: 0,
                                      }}
                                    >
                                      <DtrFitPreview>
                                        {renderDTRTablePair(
                                          records,
                                          employeeName,
                                          officialTimes,
                                          personID,
                                          selectedEmployee?.employmentCategory ??
                                            empCatMap[String(personID)]
                                              ?.employmentCategory ??
                                            null,
                                          selectedEmployee?.branch != null &&
                                            selectedEmployee?.branch !== ''
                                            ? Number(selectedEmployee.branch)
                                            : selectedEmployee?.rawUser?.branch,
                                        )}
                                      </DtrFitPreview>
                                    </div>
                                  </div>
                                </Paper>
                              </Box>
                            </Fade>
                          )}
                        </Box>

                        {personID && hasSearchedSingle && (
                          <DtrSavedSummaryPanel
                            key={summaryRefreshKey}
                            personID={personID}
                            startDate={startDate}
                            endDate={endDate}
                          />
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
                              {renderIndicatorsButton()}
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
                                {printQuincena !== 'full'
                                  ? ` · ${printPeriodCaption}`
                                  : ''}
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
                              <Tooltip title={`Print this Daily Time Record${printQuincena !== 'full' ? ` — ${printPeriodCaption}` : ''}`} placement="top">
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
                                          periodStart: getPrintPeriodDates().startDate,
                                          periodEnd: getPrintPeriodDates().endDate,
                                          monthLabel: `${buildAuditPeriodLabel({
                                            selectedMonth,
                                            monthNames: monthsShort,
                                            selectedYear,
                                            startDate,
                                            endDate,
                                          })}${printQuincena !== 'full' ? ` · ${printPeriodCaption}` : ''}`,
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
                              <Tooltip title={`Download this DTR as a PDF file${printQuincena !== 'full' ? ` — ${printPeriodCaption}` : ''}`} placement="top">
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
                                          periodStart: getPrintPeriodDates().startDate,
                                          periodEnd: getPrintPeriodDates().endDate,
                                          monthLabel: `${buildAuditPeriodLabel({
                                            selectedMonth,
                                            monthNames: monthsShort,
                                            selectedYear,
                                            startDate,
                                            endDate,
                                          })}${printQuincena !== 'full' ? ` · ${printPeriodCaption}` : ''}`,
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
                              <Box
                                sx={{
                                  px: 1.5,
                                  py: 0.3,
                                  borderRadius: 6,
                                  bgcolor: printQuincena === 'full'
                                    ? 'transparent'
                                    : alpha(T.accent, 0.08),
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
                                  {printPeriodCaption}
                                </Typography>
                              </Box>
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
                                    {[5, 10, 20, 50, 100].map((n) => (
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
                                          const sel = filteredUsers;
                                          const capped = Math.min(
                                            sel.length,
                                            BULK_DTR_LIMIT,
                                          );
                                          return (
                                            capped > 0 &&
                                            selectedUsers.size === capped
                                          );
                                        })()}
                                        indeterminate={(() => {
                                          const capped = Math.min(
                                            filteredUsers.length,
                                            BULK_DTR_LIMIT,
                                          );
                                          return (
                                            selectedUsers.size > 0 &&
                                            selectedUsers.size < capped
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
                                      printStatusKey(user.employeeNumber),
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
                                            disabled={isLoading}
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
                                                  ? 'Print another copy'
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
                                {renderIndicatorsButton()}
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
                                    <MenuItem value={50}>First 50</MenuItem>
                                    <MenuItem value={100}>
                                      First 100 (max)
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
                  </SectionCard>
                  {viewMode === 'single' && (
                    <Box
                      className="no-print"
                      sx={{
                        display: 'flex',
                        flex: { lg: '0 0 320px', xl: '0 0 360px' },
                        width: { xs: '100%', lg: 320, xl: 360 },
                        maxWidth: '100%',
                        minWidth: 0,
                        minHeight: 0,
                        alignSelf: 'stretch',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                      }}
                    >
                      <AttendancePunchStatusSidebar
                        personID={personID}
                        startDate={startDate}
                        endDate={endDate}
                        enabled={Boolean(
                          hasSearchedSingle && personID && startDate && endDate,
                        )}
                        targetUsername={
                          selectedEmployee?.username || employeeName || personID || ''
                        }
                        monthLabel={
                          selectedMonth != null
                            ? `${monthsShort[selectedMonth]} ${selectedYear}`
                            : startDate && endDate
                              ? `${startDate} – ${endDate}`
                              : ''
                        }
                        onIssuesChange={handlePunchIssuesChange}
                        reviewFocusToken={reviewFocusToken}
                        reviewFocusDate={reviewFocusDate}
                        reviewFocusRowKey={reviewFocusRowKey}
                        onStatusUpdated={(info) => {
                          setSnackbar({
                            open: true,
                            message: info?.label
                              ? `Status updated to ${info.label}. Daily record will rebuild.`
                              : 'Punch status updated',
                            severity: 'success',
                          });
                          if (personID && startDate && endDate && hasSearchedSingle) {
                            fetchRecordsRef.current?.();
                          }
                        }}
                      />
                    </Box>
                  )}
                  </Box>
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
                      {printQuincena !== 'full' ? ` · ${printPeriodCaption}` : ''}
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
                      px: 2,
                      py: 1.25,
                      bgcolor: '#fff',
                      borderBottom: `1px solid ${T.divider}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.5,
                      flexWrap: 'wrap',
                      flexShrink: 0,
                    }}
                  >
                    <Box>
                      <Typography
                        sx={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: alpha(T.accent, 0.55),
                          mb: 0.4,
                        }}
                      >
                        Print period
                      </Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>
                        The full day list still prints. Only times outside this range are blank.
                      </Typography>
                    </Box>
                    <Box sx={{ minWidth: 280 }}>
                      {renderPrintPeriodControls()}
                    </Box>
                  </Box>
                )}
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
                          p: { xs: 1, sm: 1.5, md: 2 },
                          bgcolor: 'white',
                          borderRadius: 2,
                          width: '100%',
                          maxWidth: '100%',
                          minWidth: 0,
                          overflow: 'hidden',
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
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                  {renderIndicatorsButton()}
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

            {/* ── Punches that will not print ── */}
            <Dialog
              open={unmountedPrintDialog.open}
              onClose={() => {
                setUnmountedPrintDialog({
                  open: false,
                  issues: [],
                  pending: null,
                });
                setUnmountedExpandedIds(new Set());
              }}
              maxWidth="sm"
              fullWidth
              className="no-print"
              PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
            >
              {(() => {
                const issues = unmountedPrintDialog.issues || [];
                const byEmployee = new Map();
                issues.forEach((issue) => {
                  const id = String(issue.personID || '').trim() || 'unknown';
                  if (!byEmployee.has(id)) {
                    byEmployee.set(id, {
                      personID: id,
                      employeeName: issue.employeeName || id,
                      punches: [],
                    });
                  }
                  byEmployee.get(id).punches.push(issue);
                });
                const groups = [...byEmployee.values()];
                const empCount = groups.length;
                return (
                  <>
                    <Box
                      sx={{
                        px: 2.5,
                        py: 2,
                        bgcolor: '#fdf5f5',
                        borderBottom: `1px solid ${T.divider}`,
                      }}
                    >
                      <Typography
                        sx={{ fontSize: '1rem', fontWeight: 800, color: T.text }}
                      >
                        {issues.length} punch
                        {issues.length === 1 ? '' : 'es'} will not print
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.78rem',
                          color: T.muted,
                          mt: 0.45,
                          lineHeight: 1.45,
                        }}
                      >
                        Across {empCount} employee
                        {empCount === 1 ? '' : 's'}. These taps are uncategorized
                        or an extra click of the same status, so the DTR cell
                        stays blank. Nothing is changed automatically.
                      </Typography>
                      <Chip
                        size="small"
                        label="Uncategorized / not on DTR"
                        sx={{
                          mt: 1.1,
                          height: 22,
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          bgcolor: alpha('#c62828', 0.1),
                          color: '#b71c1c',
                          border: `1px solid ${alpha('#c62828', 0.25)}`,
                        }}
                      />
                    </Box>
                    <DialogContent
                      sx={{
                        px: 2,
                        py: 1.5,
                        maxHeight: 400,
                        ...scrollbarSx,
                      }}
                    >
                      {(() => {
                        const useEmpDropdown = empCount > 1;
                        const showReviewActions = !useEmpDropdown;

                        const groupPunchesByDay = (punches) => {
                          const byDay = new Map();
                          punches.forEach((issue) => {
                            const dayKey =
                              String(issue.date || issue.dateLabel || 'unknown').trim() ||
                              'unknown';
                            if (!byDay.has(dayKey)) {
                              byDay.set(dayKey, {
                                dayKey,
                                dateLabel:
                                  issue.dateLabel || issue.date || dayKey,
                                punches: [],
                              });
                            }
                            byDay.get(dayKey).punches.push(issue);
                          });
                          return [...byDay.values()];
                        };

                        const renderPunchRow = (issue, { withDate = false } = {}) => (
                          <Box
                            key={`${issue.personID}-${issue.rowKey}`}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 1,
                              px: 0.75,
                              py: 0.65,
                              borderRadius: 1.25,
                              '&:not(:last-of-type)': {
                                borderBottom: `1px solid ${T.divider}`,
                              },
                            }}
                          >
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              {withDate ? (
                                <Typography
                                  sx={{
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    color: T.muted,
                                    lineHeight: 1.2,
                                    mb: 0.15,
                                  }}
                                >
                                  {issue.dateLabel || issue.date || '—'}
                                </Typography>
                              ) : null}
                              <Typography
                                sx={{
                                  fontSize: '0.8rem',
                                  fontWeight: 800,
                                  color: T.accent,
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {issue.time || '—'}
                              </Typography>
                            </Box>
                            {showReviewActions ? (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPunchStatusForReview(issue);
                                }}
                                sx={{
                                  flexShrink: 0,
                                  minWidth: 0,
                                  px: 1.1,
                                  py: 0.25,
                                  height: 26,
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  textTransform: 'none',
                                  borderColor: T.accentBorder,
                                  color: T.accent,
                                  bgcolor: '#fff',
                                  '&:hover': {
                                    borderColor: T.accent,
                                    bgcolor: T.accentFaint,
                                  },
                                }}
                              >
                                Review
                              </Button>
                            ) : null}
                          </Box>
                        );

                        const renderPunchTimes = (punches) =>
                          punches.map((issue) =>
                            renderPunchRow(issue, {
                              withDate: !showReviewActions,
                            }),
                          );

                        const renderDaySections = (group, nested) => {
                          const days = groupPunchesByDay(group.punches);
                          const useDayDropdown = days.length > 1;

                          if (!useDayDropdown) {
                            return (
                              <Box sx={{ px: 1.25, py: 0.75 }}>
                                {showReviewActions
                                  ? group.punches.map((issue) =>
                                      renderPunchRow(issue, { withDate: true }),
                                    )
                                  : renderPunchTimes(group.punches)}
                              </Box>
                            );
                          }

                          return (
                            <Box sx={{ px: nested ? 1 : 1.25, py: 0.75 }}>
                              {days.map((day) => {
                                const dayExpandKey = `${group.personID}::${day.dayKey}`;
                                const dayOpen =
                                  unmountedExpandedIds.has(dayExpandKey);
                                return (
                                  <Box
                                    key={dayExpandKey}
                                    sx={{
                                      mb: 0.75,
                                      border: `1px solid ${
                                        dayOpen ? T.accent : T.divider
                                      }`,
                                      borderRadius: 1.5,
                                      overflow: 'hidden',
                                      bgcolor: '#fff',
                                    }}
                                  >
                                    <Box
                                      role="button"
                                      tabIndex={0}
                                      aria-expanded={dayOpen}
                                      onClick={() =>
                                        toggleUnmountedExpand(dayExpandKey)
                                      }
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === 'Enter' ||
                                          e.key === ' '
                                        ) {
                                          e.preventDefault();
                                          toggleUnmountedExpand(dayExpandKey);
                                        }
                                      }}
                                      sx={{
                                        px: 1.25,
                                        py: 0.85,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 1,
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        bgcolor: dayOpen
                                          ? alpha(T.accent, 0.06)
                                          : 'rgba(0,0,0,0.02)',
                                        '&:hover': {
                                          bgcolor: alpha(T.accent, 0.08),
                                        },
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontSize: '0.8rem',
                                          fontWeight: 800,
                                          color: T.text,
                                        }}
                                      >
                                        {day.dateLabel}
                                      </Typography>
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 0.75,
                                        }}
                                      >
                                        <Chip
                                          size="small"
                                          label={`${day.punches.length}`}
                                          sx={{
                                            height: 20,
                                            minWidth: 28,
                                            fontWeight: 700,
                                            fontSize: '0.68rem',
                                            bgcolor: '#fff',
                                            color: T.accent,
                                            border: `1px solid ${T.accentBorder}`,
                                          }}
                                        />
                                        <ExpandMore
                                          sx={{
                                            fontSize: 20,
                                            color: T.accent,
                                            transform: dayOpen
                                              ? 'rotate(180deg)'
                                              : 'none',
                                            transition: 'transform 0.18s ease',
                                          }}
                                        />
                                      </Box>
                                    </Box>
                                    <Collapse
                                      in={dayOpen}
                                      timeout="auto"
                                      unmountOnExit
                                    >
                                      <Box
                                        sx={{
                                          px: 1,
                                          py: 0.5,
                                          borderTop: `1px solid ${T.divider}`,
                                        }}
                                      >
                                        {day.punches.map((issue) =>
                                          showReviewActions
                                            ? renderPunchRow(issue)
                                            : (
                                              <Box
                                                key={`${issue.personID}-${issue.rowKey}`}
                                                sx={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'flex-end',
                                                  px: 0.75,
                                                  py: 0.65,
                                                  '&:not(:last-of-type)': {
                                                    borderBottom: `1px solid ${T.divider}`,
                                                  },
                                                }}
                                              >
                                                <Typography
                                                  sx={{
                                                    fontSize: '0.8rem',
                                                    fontWeight: 800,
                                                    color: T.accent,
                                                    fontVariantNumeric:
                                                      'tabular-nums',
                                                  }}
                                                >
                                                  {issue.time || '—'}
                                                </Typography>
                                              </Box>
                                            ),
                                        )}
                                      </Box>
                                    </Collapse>
                                  </Box>
                                );
                              })}
                            </Box>
                          );
                        };

                        return groups.map((group) => {
                          if (!useEmpDropdown) {
                            // Single employee — no employee dropdown; day dropdowns if many days.
                            return (
                              <Box
                                key={group.personID}
                                sx={{
                                  border: `1px solid ${T.accentBorder}`,
                                  borderRadius: 2,
                                  overflow: 'hidden',
                                  bgcolor: '#fff',
                                }}
                              >
                                <Box
                                  sx={{
                                    px: 1.5,
                                    py: 1,
                                    bgcolor: T.accentFaint,
                                    borderBottom: `1px solid ${T.accentBorder}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 1,
                                  }}
                                >
                                  <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography
                                      sx={{
                                        fontSize: '0.86rem',
                                        fontWeight: 800,
                                        color: T.accent,
                                        lineHeight: 1.25,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {group.employeeName}
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: '0.7rem',
                                        color: T.muted,
                                        fontWeight: 600,
                                        mt: 0.15,
                                      }}
                                    >
                                      #{group.personID}
                                    </Typography>
                                  </Box>
                                  <Chip
                                    size="small"
                                    label={`${group.punches.length} punch${
                                      group.punches.length === 1 ? '' : 'es'
                                    }`}
                                    sx={{
                                      height: 22,
                                      fontWeight: 700,
                                      fontSize: '0.68rem',
                                      bgcolor: '#fff',
                                      color: T.accent,
                                      border: `1px solid ${T.accentBorder}`,
                                      flexShrink: 0,
                                    }}
                                  />
                                </Box>
                                {renderDaySections(group, false)}
                              </Box>
                            );
                          }

                          const expanded = unmountedExpandedIds.has(
                            group.personID,
                          );
                          return (
                            <Box
                              key={group.personID}
                              sx={{
                                mb: 1,
                                border: `1px solid ${
                                  expanded ? T.accent : T.accentBorder
                                }`,
                                borderRadius: 2,
                                overflow: 'hidden',
                                bgcolor: '#fff',
                              }}
                            >
                              <Box
                                role="button"
                                tabIndex={0}
                                aria-expanded={expanded}
                                onClick={() =>
                                  toggleUnmountedExpand(group.personID)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleUnmountedExpand(group.personID);
                                  }
                                }}
                                sx={{
                                  px: 1.5,
                                  py: 1,
                                  bgcolor: expanded
                                    ? alpha(T.accent, 0.08)
                                    : T.accentFaint,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 1,
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                  '&:hover': {
                                    bgcolor: alpha(T.accent, 0.1),
                                  },
                                }}
                              >
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Typography
                                    sx={{
                                      fontSize: '0.86rem',
                                      fontWeight: 800,
                                      color: T.accent,
                                      lineHeight: 1.25,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {group.employeeName}
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontSize: '0.7rem',
                                      color: T.muted,
                                      fontWeight: 600,
                                      mt: 0.15,
                                    }}
                                  >
                                    #{group.personID}
                                  </Typography>
                                </Box>
                                <Chip
                                  size="small"
                                  label={`${group.punches.length} punch${
                                    group.punches.length === 1 ? '' : 'es'
                                  }`}
                                  sx={{
                                    height: 22,
                                    fontWeight: 700,
                                    fontSize: '0.68rem',
                                    bgcolor: '#fff',
                                    color: T.accent,
                                    border: `1px solid ${T.accentBorder}`,
                                    flexShrink: 0,
                                  }}
                                />
                                <ExpandMore
                                  sx={{
                                    fontSize: 22,
                                    color: T.accent,
                                    flexShrink: 0,
                                    transform: expanded
                                      ? 'rotate(180deg)'
                                      : 'rotate(0deg)',
                                    transition: 'transform 0.18s ease',
                                  }}
                                />
                              </Box>
                              <Collapse
                                in={expanded}
                                timeout="auto"
                                unmountOnExit
                              >
                                <Box
                                  sx={{
                                    borderTop: `1px solid ${T.accentBorder}`,
                                  }}
                                >
                                  {renderDaySections(group, true)}
                                </Box>
                              </Collapse>
                            </Box>
                          );
                        });
                      })()}
                    </DialogContent>
                    <Box
                      sx={{
                        px: 2.5,
                        py: 1.75,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 1,
                        borderTop: `1px solid ${T.divider}`,
                      }}
                    >
                      <AccentButton
                        variant="outlined"
                        onClick={handleReviewUnmountedPunches}
                        sx={{
                          borderColor: T.accentBorder,
                          color: T.accent,
                          '&:hover': {
                            bgcolor: T.accentFaint,
                            borderColor: T.accent,
                          },
                        }}
                      >
                        Review punches
                      </AccentButton>
                      <AccentButton
                        variant="contained"
                        onClick={handlePrintDespiteUnmounted}
                        sx={{
                          bgcolor: T.accent,
                          color: '#fff',
                          '&:hover': { bgcolor: T.accentDark },
                        }}
                      >
                        {unmountedPrintDialog.pending?.kind === 'download'
                          ? 'Download anyway'
                          : 'Print anyway'}
                      </AccentButton>
                    </Box>
                  </>
                );
              })()}
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
                {(() => {
                  const isBulk = Boolean(confirmModal.bulkUsers?.length);
                  const alreadyCount = confirmModal.alreadyPrintedCount || 0;
                  const bulkTotal = confirmModal.bulkUsers?.length || 0;
                  const alreadyUsers = confirmModal.alreadyPrintedUsers || [];
                  const isReprint =
                    alreadyCount > 0 ||
                    printStatusMap.has(
                      printStatusKey(confirmModal.user?.employeeNumber),
                    );
                  const title = isBulk
                    ? isReprint
                      ? 'Already printed'
                      : 'Confirm Print Job'
                    : isReprint
                      ? 'Already printed'
                      : 'Confirm Print Job';
                  const message = isBulk
                    ? alreadyCount === bulkTotal
                      ? bulkTotal === 1
                        ? 'This DTR has already been printed. Print another copy?'
                        : `These ${bulkTotal} DTRs have already been printed. Print another copy for each?`
                      : `${alreadyCount} of ${bulkTotal} selected DTRs have already been printed. Print another copy anyway?`
                    : isReprint
                      ? 'This DTR has already been printed. Print another copy?'
                      : 'Verify the details below before printing.';
                  const confirmLabel = isReprint
                    ? 'Print another copy'
                    : 'Print';
                  const nameOf = (u) =>
                    u?.fullName ||
                    [u?.lastName, u?.firstName].filter(Boolean).join(', ') ||
                    u?.devicePersonName ||
                    'Unknown';
                  const listed = alreadyUsers.slice(0, 8);
                  const extra = Math.max(0, alreadyUsers.length - listed.length);
                  return (
                    <>
                      <Typography
                        sx={{
                          fontSize: '1rem',
                          fontWeight: 700,
                          mb: 0.5,
                          color: T.text,
                        }}
                      >
                        {title}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.82rem',
                          color: T.muted,
                          mb: 2,
                          maxWidth: '90%',
                          lineHeight: 1.6,
                        }}
                      >
                        {message}
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
                            {nameOf(confirmModal.user)}
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
                            sx={{
                              display: 'flex',
                              gap: 2,
                              justifyContent: 'center',
                            }}
                          >
                            <Typography
                              sx={{ fontSize: '0.75rem', color: T.muted }}
                            >
                              #{confirmModal.user.employeeNumber}
                            </Typography>
                            <Typography
                              sx={{ fontSize: '0.75rem', color: T.faint }}
                            >
                              |
                            </Typography>
                            <Typography
                              sx={{ fontSize: '0.75rem', color: T.muted }}
                            >
                              {formatMonth(startDate)}
                              {printQuincena !== 'full'
                                ? ` · ${printPeriodCaption}`
                                : ''}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      {isBulk && (
                        <Box
                          sx={{
                            width: '100%',
                            border: `1.5px dashed ${T.accentBorder}`,
                            bgcolor: T.accentFaint,
                            borderRadius: 2,
                            p: 2,
                            mb: 3,
                            textAlign: 'left',
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              color: T.text,
                            }}
                          >
                            {bulkTotal} employee
                            {bulkTotal === 1 ? '' : 's'} selected
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '0.75rem',
                              color: T.muted,
                              mt: 0.35,
                              mb: alreadyUsers.length ? 1.25 : 0,
                            }}
                          >
                            {alreadyCount} already printed ·{' '}
                            {bulkTotal - alreadyCount} not yet printed
                          </Typography>
                          {alreadyUsers.length > 0 && (
                            <Box
                              sx={{
                                maxHeight: 160,
                                overflowY: 'auto',
                                borderTop: `1px solid ${T.accentBorder}`,
                                pt: 1,
                                ...scrollbarSx,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  letterSpacing: '0.06em',
                                  textTransform: 'uppercase',
                                  color: alpha(T.accent, 0.7),
                                  mb: 0.75,
                                }}
                              >
                                Already printed
                              </Typography>
                              {listed.map((u) => (
                                <Box
                                  key={printStatusKey(u.employeeNumber)}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    justifyContent: 'space-between',
                                    gap: 1,
                                    py: 0.35,
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: '0.78rem',
                                      fontWeight: 600,
                                      color: T.text,
                                      minWidth: 0,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {nameOf(u)}
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontSize: '0.72rem',
                                      color: T.muted,
                                      flexShrink: 0,
                                    }}
                                  >
                                    #{u.employeeNumber}
                                  </Typography>
                                </Box>
                              ))}
                              {extra > 0 && (
                                <Typography
                                  sx={{
                                    fontSize: '0.72rem',
                                    color: T.faint,
                                    mt: 0.5,
                                    fontStyle: 'italic',
                                  }}
                                >
                                  and {extra} more…
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Box>
                      )}
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 1.5,
                          justifyContent: 'center',
                        }}
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
                          onClick={handlePrintConfirmAction}
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
                          {confirmLabel}
                        </AccentButton>
                      </Box>
                    </>
                  );
                })()}
              </DialogContent>
            </Dialog>
          </Box>
        </Fade>
      )}

      {/* ── Sliding hub panels (Official Time / Modification / Computation) ── */}
      <Drawer
        anchor="right"
        open={isHubDrawerOpen(moduleDrawer)}
        onClose={() =>
          closeHubDrawer({
            bumpRevision: moduleDrawer === 'officialTime',
            refetchRecords: moduleDrawer !== 'officialTime',
          })
        }
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
              key={`mod-drawer-${personID || 'none'}-${startDate || ''}-${endDate || ''}-r${attendanceRevision}`}
              embedded
              onClose={() => closeHubDrawer({ bumpRevision: false, refetchRecords: true })}
              onRecordsSaved={() => {
                void refreshHubAfterDrawerChange({ bumpRevision: true, refetchRecords: true });
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
              key={`ot-drawer-${personID || 'none'}-${startDate || ''}-${endDate || ''}-r${attendanceRevision}`}
              embedded
              onClose={() =>
                closeHubDrawer({ bumpRevision: true, refetchRecords: false })
              }
              onScheduleSaved={() => {
                void refreshHubAfterDrawerChange({
                  bumpRevision: true,
                  refetchRecords: false,
                });
              }}
              initialContext={{
                employeeNumber: personID || '',
                startDate: startDate || '',
                endDate: endDate || '',
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
            onClose={() =>
              closeHubDrawer({ bumpRevision: false, refetchRecords: true })
            }
            onSavedToSummary={handleSavedToSummary}
            onOpenHubTool={openHubToolFromModule}
          />
        )}
      </Drawer>
    </>
  );
};

export default DailyTimeRecordFaculty;