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
import LoadingOverlay from '../LoadingOverlay';
import useAttendanceWorkflow from '../../hooks/useAttendanceWorkflow';
import AttendanceWorkflowNav from './AttendanceWorkflowNav';
import AttendanceModification from './AttendanceModification';
import OfficialTimeForm from './OfficialTimeForm';
import DtrSavedSummaryPanel from './DtrSavedSummaryPanel';
import AttendanceComputationDrawer from './AttendanceComputationDrawer';
import { readAttendanceWorkflow } from '../../utils/attendanceWorkflow';
import { sortEmployeesByLastName } from '../../utils/sortEmployeesByLastName';
import {
  resolveDrawerFromComputationModule,
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
import {
  buildReviewByDate,
  parseHalfDayReviewJson,
  MODULE_TYPES,
} from '../../utils/halfDayReview';
import {
  isDtrCellWatermarkText,
  formatDtrPdfFileName,
  formatDtrBulkPdfFileName,
} from '../../utils/dtrFormatHelpers';
import DTRTemplate from './DTRTemplate';
import {
  DTRPrintStyles,
  printDtrHtml,
  printDtrHtmlPages,
  downloadDtrHtml,
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
 * Employment category → personnel_scope when computation_module_type is not
 * yet loaded for this employee/period (common before Save-to-Summary).
 * 3 = Teaching 30hrs, 4 = Designated 40hrs → academic;
 * 0/1 JO + 2 Regular Non-Teaching → non_teaching.
 */
const scopeForEmploymentCategory = (cat) => {
  if (cat == null || cat === '') return null;
  const n = Number(cat);
  if (n === 3 || n === 4) return 'academic';
  if (n === 0 || n === 1 || n === 2) return 'non_teaching';
  return null;
};

const resolveEmployeeSuspensionScope = (moduleType, employmentCategory) => {
  // Prefer the attendance module actually applied on this DTR (badge:
  // "Academic | 40 Hours") over employment category — category can be stale
  // or wrong and was letting Non-Teaching-only suspensions paint on Academic DTRs.
  const fromMod = scopeForModuleType(moduleType);
  if (fromMod) return fromMod;
  return scopeForEmploymentCategory(employmentCategory);
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

/** Employees per attendance API request (by employeeNumbers — no SQL re-rank). */
const ATTENDANCE_CHUNK = 80;
/** Parallel attendance chunk requests while hydrating the table. */
const ATTENDANCE_CONCURRENCY = 8;
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
        const dayText = dayCell.textContent.trim();
        if (!/^\d{1,2}$/.test(dayText)) return;
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
  const fetchRecords = useCallback(async () => {
    setMonthLoading(true);
    // Avoid showing the previous employee's schedule while this fetch is in flight.
    setOfficialTimes({});
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
      refreshHolidaysAndSuspensions();
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
    refreshHolidaysAndSuspensions,
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
        setLoadingAllUsers(false);
      }
      setLoadPhase(
        quiet
          ? `Refreshing attendance (0 / ${empList.length})…`
          : `Loading attendance (0 / ${empList.length})…`,
      );

      const empNums = skeletonUsers.map((u) => u.employeeNumber);
      const empListIds = empList.map((e) => e.personID);

      // Kick off OT / late / print-status while attendance chunks load.
      const secondaryPromise = Promise.all([
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

      const chunks = [];
      for (let i = 0; i < empNums.length; i += ATTENDANCE_CHUNK) {
        chunks.push(empNums.slice(i, i + ATTENDANCE_CHUNK));
      }

      // Accumulate chunk maps; flush to React every other concurrency round.
      let pendingPageMap = new Map();
      let hydrated = 0;
      let flushRound = 0;
      const flushPending = () => {
        if (!pendingPageMap.size) return;
        const pageMap = pendingPageMap;
        pendingPageMap = new Map();
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

        batchRows.flat().forEach((record) => {
          const id = String(record.personID || record.agencyEmployeeNum || '').trim();
          if (!id) return;
          if (!pendingPageMap.has(id)) pendingPageMap.set(id, []);
          pendingPageMap.get(id).push(record);
        });

        hydrated += batch.reduce((n, c) => n + c.length, 0);
        setLoadPhase(
          `${quiet ? 'Refreshing' : 'Loading'} attendance (${Math.min(hydrated, empList.length)} / ${empList.length})…`,
        );

        flushRound += 1;
        // Flush every round for small lists; every 2nd for large ones.
        if (chunks.length <= 2 || flushRound % 2 === 0 || i + ATTENDANCE_CONCURRENCY >= chunks.length) {
          flushPending();
        }
      }

      if (signal.aborted) return;
      flushPending();

      setAllUsersDTR((prev) =>
        prev.map((u) => (u._loading ? { ...u, _loading: false } : u)),
      );
      setLoadPhase('');

      await secondaryPromise;
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
    if (users.length === 1) {
      return formatDtrPdfFileName(users[0], startDate);
    }
    return formatDtrBulkPdfFileName(startDate, resolveBulkPdfFilterLabels());
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

  // ─── Print helpers ──────────────────────────────────────────────────────
  /**
   * Render every selected employee's DTR straight to HTML.
   *
   * Rendering into a detached React root skips layout, rasterising and the
   * mount-one-DTR-at-a-time cycle that html2canvas needed, so a 50-employee
   * batch costs about as much as a single DTR.
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
    const employeeNumbers = users.map((u) => u.employeeNumber);
    await axios.post(
      `${API_BASE_URL}/attendance/api/mark-dtr-printed`,
      {
        employeeNumbers,
        year: new Date(startDate).getFullYear(),
        month: new Date(startDate).getMonth() + 1,
        startDate,
        endDate,
      },
      getAuthHeaders(),
    );
    const printedAt = new Date().toISOString();
    setPrintStatusMap((prev) => {
      const next = new Map(prev);
      employeeNumbers.forEach((n) =>
        next.set(n, { printed_at: printedAt, printed_by: 'current_user' }),
      );
      return next;
    });
  };

  const printPage = async () => {
    if (!dtrRef.current) return;
    if (!verifyIntegrity()) return;
    restoreDOMFromOriginal();
    const singleUser = {
      lastName: selectedEmployee?.lastName,
      firstName: selectedEmployee?.firstName,
      middleName: selectedEmployee?.middleName,
      fullName: employeeName,
    };
    await printDtrHtml(dtrRef.current, {
      title: formatDtrPdfFileName(singleUser, startDate).replace(/\.pdf$/i, ''),
    });
  };

  const downloadPDF = async () => {
    if (!dtrRef.current) return;
    if (!verifyIntegrity()) return;
    restoreDOMFromOriginal();
    const singleUser = {
      lastName: selectedEmployee?.lastName,
      firstName: selectedEmployee?.firstName,
      middleName: selectedEmployee?.middleName,
      fullName: employeeName,
    };
    setPrintingAll(true);
    setPrintingStatus('Preparing PDF download…');
    try {
      await downloadDtrHtml(
        dtrRef.current,
        formatDtrPdfFileName(singleUser, startDate),
      );
    } finally {
      setPrintingStatus('');
      setPrintingAll(false);
    }
  };

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
      // Ensure calendar overlays match Individual DTR (fresh suspensions/holidays).
      const calendar = await refreshHolidaysAndSuspensions({ force: true });
      await new Promise((r) => requestAnimationFrame(r));
      const pages = buildDtrPrintPages(users, calendar);
      if (!pages.length) throw new Error('No DTRs could be prepared.');

      await printDtrHtmlPages(pages, { title: printJobTitle(users) });

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
      const calendar = await refreshHolidaysAndSuspensions({ force: true });
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

  const handleIndividualPrintConfirmed = async (user) => {
    closeConfirm();
    setPreviewUsers([user]);
    setCurrentPreviewIndex(0);

    try {
      await printUsersDtr([user]);
    } catch (error) {
      console.error('Error printing individual DTR:', error);
      showAlert('Print Error', `Error printing DTR: ${error.message}`);
    }
  };

  const handlePrintAllSelected = async () => {
    if (!previewUsers.length) {
      showAlert('No Selection', 'No DTRs to print.');
      return;
    }

    try {
      await printUsersDtr(previewUsers);
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
      await downloadUsersDtr(previewUsers);
    } catch (error) {
      console.error('Error preparing DTRs for download:', error);
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
    return {
      employeeName: nameDisplay,
      records: sourceRecords,
      officialTime: officialTimesForUser,
      showOfficialTimeOnDtr,
      startDate,
      endDate,
      selectedYear,
      selectedMonth,
      holidays: calendarOverrides?.holidays ?? holidays,
      suspensions: calendarOverrides?.suspensions ?? suspensions,
      approvedLeaves: leaves,
      computedLateByDate: computedLateByEmployee[empKey] || {},
      suggestedHalfDayDatesSet: halfDayDatesByEmployee[empKey] || new Set(),
      halfDayReviewByDate: halfDayReviewByEmployee[empKey] || {},
      // Do not invent NON_TEACHING — that hid academic-scoped suspensions when
      // the computation module had not been saved yet for this employee.
      computationModuleType: knownModuleType || undefined,
      employeeScope: resolveEmployeeSuspensionScope(knownModuleType, empCat),
      employmentCategory: empCat,
      ...(resolvedBranch !== undefined ? { employeeBranch: resolvedBranch } : {}),
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
    <div className="table-container">
      <div className="table-wrapper" style={{ position: 'relative' }}>
        {renderDTRTablePair(
          user.records,
          user.fullName,
          String(user.employeeNumber) === String(personID)
            ? officialTimes
            : batchOfficialTimesMap[user.employeeNumber] || {},
          user.employeeNumber,
          user.rawUser?.employmentCategory ?? user.employmentCategory ?? null,
          user.rawUser?.branch ?? user.branch,
        )}
      </div>
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
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Compute &amp; save:
                              </Typography>
                              {appliedLateUtLabel && (
                                <Chip
                                  size="small"
                                  label={`On DTR: ${appliedLateUtLabel}`}
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
                                const isActive =
                                  activeComputationDrawer === btn.drawer ||
                                  moduleDrawer === btn.drawer;
                                const isApplied =
                                  appliedLateUtModuleType === btn.moduleType;
                                const categoryColor =
                                  btn.categoryColor || T.accent;
                                const disabled =
                                  !personID || !hasSearchedSingle;
                                return (
                                  <Tooltip
                                    key={`compute-${btn.drawer}`}
                                    title={
                                      isApplied
                                        ? `${btn.label} late/undertime is on this DTR — open to review or Save to Summary`
                                        : `Open ${btn.label} module to review late/undertime, then Save to Summary`
                                    }
                                    placement="top"
                                  >
                                    <span>
                                      <AccentButton
                                        variant="outlined"
                                        size="small"
                                        disabled={disabled}
                                        startIcon={
                                          <AccessTime
                                            sx={{
                                              fontSize: '15px !important',
                                            }}
                                          />
                                        }
                                        onClick={() =>
                                          openComputationDrawer(btn.drawer)
                                        }
                                        sx={{
                                          height: 32,
                                          fontSize: '0.72rem',
                                          fontWeight: 700,
                                          px: 1.25,
                                          ...((isActive || isApplied)
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
                                className="dtr-print-area"
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
                                      </div>
                                    </div>
                                  </Box>
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