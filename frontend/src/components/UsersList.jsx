import API_BASE_URL from '../apiConfig';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthHeaders } from '../utils/auth';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  Alert,
  TextField,
  InputAdornment,
  Chip,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  IconButton,
  Tooltip,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Switch,
  Checkbox,
  Avatar,
  MenuItem,
  Divider,
  LinearProgress,
  Fab,
  Drawer,
  useTheme,
  useMediaQuery,
  CardHeader,
  Stack,
  Fade,
  Backdrop,
  styled,
  alpha,
  Modal,
  Snackbar,
  Portal,
  ListSubheader,
  ListItemIcon,
  FormControl,
  InputLabel,
  Select,
  Skeleton,
} from '@mui/material';
import {
  People,
  Search,
  PersonAdd,
  GroupAdd,
  Email,
  Badge as BadgeIcon,
  Person,
  Visibility,
  Refresh,
  AccountCircle,
  Business,
  Security,
  Close,
  Pages,
  Settings,
  FilterList,
  Lock,
  LockOpen,
  AdminPanelSettings,
  SupervisorAccount,
  Work,
  CheckCircle,
  Cancel,
  Info,
  AssignmentInd,
  AccessTime,
  Key,
  VerifiedUser,
  TrendingUp,
  Shield,
  Home,
  Assessment,
  Delete as DeleteIcon,
  DeleteForever,
  Edit as EditIcon,
  ErrorOutline,
  Circle,
  WorkOutline,
  Category,
  Assignment,
  Payment,
  Description,
  FolderSpecial,
  Folder,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import axios from 'axios';
import SuccessfulOverlay from './SuccessfulOverlay';

// Get user role from token
const getUserRole = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    const payload = JSON.parse(jsonPayload);
    return payload.role || payload.userRole || null;
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
};

// System Settings Hook
const useSystemSettings = () => {
  const [settings, setSettings] = useState({
    primaryColor: '#894444',
    secondaryColor: '#6d2323',
    accentColor: '#FEF9E1',
    textColor: '#FFFFFF',
    textPrimaryColor: '#6D2323',
    textSecondaryColor: '#FEF9E1',
    hoverColor: '#6D2323',
    backgroundColor: '#FFFFFF',
  });

  useEffect(() => {
    const storedSettings = localStorage.getItem('systemSettings');
    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings);
        if (parsed && typeof parsed === 'object') setSettings(parsed);
      } catch (e) {
        console.error('Error parsing stored settings:', e);
      }
    }
    const fetchSettings = async () => {
      try {
        const url = API_BASE_URL.includes('/api')
          ? `${API_BASE_URL}/system-settings`
          : `${API_BASE_URL}/api/system-settings`;
        const response = await axios.get(url);
        if (response.data && typeof response.data === 'object') {
          setSettings(response.data);
          localStorage.setItem('systemSettings', JSON.stringify(response.data));
        }
      } catch (e) {
        console.error('Error fetching system settings:', e);
      }
    };
    fetchSettings();
  }, []);

  return settings;
};

const getEmploymentCategoryInfo = (category, customCategory) => {
  const catNum = parseInt(category);
  switch (catNum) {
    case 0:
      return {
        label: 'JO - Graduate',
        color: '#F57C00',
        bgcolor: alpha('#F57C00', 0.1),
        icon: <Circle sx={{ fontSize: 12 }} />,
      };
    case 1:
      return {
        label: 'JO - UnderGrad',
        color: '#E64A19',
        bgcolor: alpha('#E64A19', 0.1),
        icon: <Circle sx={{ fontSize: 12 }} />,
      };
    case 2:
      return {
        label: 'Regular - Non-Teaching',
        color: '#2E7D32',
        bgcolor: alpha('#2E7D32', 0.1),
        icon: <Circle sx={{ fontSize: 12 }} />,
      };
    case 3:
      return {
        label: 'Teaching (30Hrs)',
        color: '#1565C0',
        bgcolor: alpha('#1565C0', 0.1),
        icon: <Circle sx={{ fontSize: 12 }} />,
      };
    case 4:
      return {
        label: 'Designated (40Hrs)',
        color: '#7B1FA2',
        bgcolor: alpha('#7B1FA2', 0.1),
        icon: <Circle sx={{ fontSize: 12 }} />,
      };
    case 5:
      return {
        label: customCategory
          ? `Other (${String(customCategory).trim()})`
          : 'Other (specify)',
        color: '#455A64',
        bgcolor: alpha('#455A64', 0.1),
        icon: <Circle sx={{ fontSize: 12 }} />,
      };
    default:
      return {
        label: 'Not Set',
        color: '#757575',
        bgcolor: alpha('#757575', 0.1),
        icon: <Circle sx={{ fontSize: 12 }} />,
      };
  }
};

const getDescriptionColor = (description, settings) => {
  const p = settings?.primaryColor || '#894444';
  const s = settings?.secondaryColor || '#6d2323';
  switch (description?.toLowerCase()) {
    case 'general':
      return { sx: { bgcolor: alpha(p, 0.15), color: p }, icon: <Category /> };
    case 'system administration':
      return { sx: { bgcolor: alpha(p, 0.15), color: p }, icon: <Category /> };
    case 'registration':
      return {
        sx: { bgcolor: alpha(s, 0.15), color: s },
        icon: <Assignment />,
      };
    case 'information management':
      return { sx: { bgcolor: alpha(p, 0.1), color: p }, icon: <Info /> };
    case 'attendance management':
      return {
        sx: { bgcolor: alpha(p, 0.12), color: p },
        icon: <Assessment />,
      };
    case 'payroll management':
      return { sx: { bgcolor: alpha(s, 0.12), color: s }, icon: <Payment /> };
    case 'form':
      return {
        sx: { bgcolor: alpha(p, 0.08), color: p },
        icon: <Description />,
      };
    case 'pages management':
      return {
        sx: { bgcolor: alpha(p, 0.18), color: p },
        icon: <FolderSpecial />,
      };
    case 'personal data sheets':
      return { sx: { bgcolor: alpha(s, 0.18), color: s }, icon: <Folder /> };
    default:
      return {
        sx: { bgcolor: alpha(p, 0.1), color: p },
        icon: <Description />,
      };
  }
};

// ── Internet-proof retry config ────────────────────────────────────────────
// Same strategy as Facebook/Twitter PWA:
// Never flash an error on the first failure — silently retry with exponential
// back-off and show only a quiet inline banner inside the skeleton.
const RETRY_DELAYS = [2, 4, 8, 15, 30]; // seconds between attempts

// ── Quiet offline banner shown INSIDE the skeleton card ───────────────────
const OfflineBanner = ({ visible, retryIn, primaryColor }) => {
  const p = primaryColor || '#894444';
  return (
    <Fade in={visible} timeout={600} unmountOnExit>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2.5,
        py: 1.5,
        mb: 3,
        mx: 6,
        borderRadius: 3,
        bgcolor: alpha(p, 0.05),
        border: `1px solid ${alpha(p, 0.18)}`,
        borderLeft: `4px solid ${alpha(p, 0.45)}`,
      }}>
        <WifiOffIcon sx={{
          fontSize: 18,
          color: alpha(p, 0.5),
          animation: 'umBounce 2s ease-in-out infinite',
          flexShrink: 0,
          '@keyframes umBounce': {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-3px)' },
          },
        }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: alpha(p, 0.75), lineHeight: 1.2 }}>
            Waiting for connection…
          </Typography>
          {retryIn > 0 && (
            <Typography sx={{ fontSize: '0.72rem', color: alpha(p, 0.45), mt: 0.3 }}>
              Retrying in {retryIn}s
            </Typography>
          )}
        </Box>
        <Box sx={{
          width: 8, height: 8, borderRadius: '50%',
          bgcolor: alpha(p, 0.35),
          animation: 'umPulse 1.8s ease-in-out infinite',
          flexShrink: 0,
          '@keyframes umPulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.3 },
          },
        }} />
      </Box>
    </Fade>
  );
};

const UsersList = () => {
  // ── Determine role BEFORE any state initialization ──
  const detectedRole = getUserRole();
  const isTechnicalUser = detectedRole === 'technical';

  // Module Access State
  // Technical users bypass the password modal entirely
  const [moduleAuthorized, setModuleAuthorized] = useState(isTechnicalUser);
  const [confidentialPasswordInput, setConfidentialPasswordInput] =
    useState('');
  const [openConfidentialPassword, setOpenConfidentialPassword] =
    useState(!isTechnicalUser);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [userRole, setUserRole] = useState(detectedRole);
  const [roleChecked, setRoleChecked] = useState(true);

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [refreshing, setRefreshing] = useState(false);

  // ── Internet-proof fetch state ─────────────────────────────────────────
  const [offline, setOffline]   = useState(false);
  const [retryIn, setRetryIn]   = useState(0);
  const retryTimerRef           = useRef(null);
  const countdownRef            = useRef(null);
  const retryAttemptRef         = useRef(0);
  const mountedRef              = useRef(true);

  // Bulk Employment Category Edit
  const [selectedEmployeeNumbers, setSelectedEmployeeNumbers] = useState([]);
  const [bulkCategoryDialog, setBulkCategoryDialog] = useState(false);
  const [bulkEmploymentCategory, setBulkEmploymentCategory] = useState('');
  const [bulkCustomCategory, setBulkCustomCategory] = useState('');
  const [bulkEditLoading, setBulkEditLoading] = useState(false);

  // Page Access Management States
  const [pageAccessDialog, setPageAccessDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pages, setPages] = useState([]);
  const [pageAccess, setPageAccess] = useState({});
  const [pageAccessLoading, setPageAccessLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');
  const [accessChangeInProgress, setAccessChangeInProgress] = useState({});
  const [activeAccessCategory, setActiveAccessCategory] = useState(null);

  // Additional UI States
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('');
  const [activeTab, setActiveTab] = useState('info');
  const [animatedValue, setAnimatedValue] = useState(0);
  const [roleChangeDialog, setRoleChangeDialog] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState(null);
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);

  // Edit User States
  const [editDialog, setEditDialog] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [editedEmployeeNumber, setEditedEmployeeNumber] = useState('');
  const [editedFirstName, setEditedFirstName] = useState('');
  const [editedMiddleName, setEditedMiddleName] = useState('');
  const [editedLastName, setEditedLastName] = useState('');
  const [editedNameExtension, setEditedNameExtension] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [editedEmploymentCategory, setEditedEmploymentCategory] = useState('');
  const [editedCustomCategory, setEditedCustomCategory] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Delete User States
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── UPDATED: Single grant state that tracks which role is currently granting ──
  const [grantingRole, setGrantingRole] = useState(null);

  // Filter States
  const [categoryFilter, setCategoryFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const settings = useSystemSettings();

  const isSuperAdmin = userRole === 'superadmin' || userRole === 'technical';
  const isTechnical = userRole === 'technical';

  // ── Styled components ──
  const GlassCard = useMemo(
    () =>
      styled(Card)(() => ({
        borderRadius: 20,
        background: `${settings?.accentColor || '#FEF9E1'}F2`,
        backdropFilter: 'blur(10px)',
        boxShadow: `0 8px 40px ${settings?.primaryColor || '#894444'}14`,
        border: `1px solid ${settings?.primaryColor || '#894444'}1A`,
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: `0 12px 48px ${settings?.primaryColor || '#894444'}26`,
          transform: 'translateY(-4px)',
        },
      })),
    [settings],
  );

  const ProfessionalButton = useMemo(
    () =>
      styled(Button)(({ variant }) => ({
        borderRadius: 12,
        fontWeight: 600,
        padding: '12px 24px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        textTransform: 'none',
        fontSize: '0.95rem',
        letterSpacing: '0.025em',
        boxShadow:
          variant === 'contained'
            ? `0 4px 14px ${settings?.primaryColor || '#894444'}40`
            : 'none',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow:
            variant === 'contained'
              ? `0 6px 20px ${settings?.primaryColor || '#894444'}59`
              : 'none',
        },
        '&:active': { transform: 'translateY(0)' },
      })),
    [settings],
  );

  const ModernTextField = useMemo(
    () =>
      styled(TextField)(() => ({
        '& .MuiOutlinedInput-root': {
          borderRadius: 12,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          backgroundColor: 'rgba(255,255,255,0.8)',
          '&:hover': {
            transform: 'translateY(-1px)',
            backgroundColor: 'rgba(255,255,255,0.95)',
          },
          '&.Mui-focused': {
            transform: 'translateY(-1px)',
            boxShadow: `0 4px 20px ${settings?.primaryColor || '#894444'}40`,
            backgroundColor: 'rgba(255,255,255,1)',
          },
        },
        '& .MuiInputLabel-root': { fontWeight: 500 },
      })),
    [settings],
  );

  const PremiumTableContainer = useMemo(
    () =>
      styled(TableContainer)(() => ({
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: `0 4px 24px ${settings?.primaryColor || '#894444'}0F`,
        border: `1px solid ${settings?.primaryColor || '#894444'}14`,
      })),
    [settings],
  );

  const PremiumTableCell = useMemo(
    () =>
      styled(TableCell)(({ isHeader = false }) => ({
        fontWeight: isHeader ? 600 : 500,
        padding: '18px 20px',
        borderBottom: isHeader
          ? `2px solid ${settings?.primaryColor || '#894444'}4D`
          : `1px solid ${settings?.primaryColor || '#894444'}0F`,
        fontSize: '0.95rem',
        letterSpacing: '0.025em',
      })),
    [settings],
  );

  const uniqueDepartments = useMemo(() => {
    const depts = new Set(users.map((u) => u.departmentCode).filter(Boolean));
    return Array.from(depts).sort();
  }, [users]);

  const p = settings?.primaryColor || '#894444';
  const s = settings?.secondaryColor || '#6d2323';
  const ac = settings?.accentColor || '#FEF9E1';
  const tp = settings?.textPrimaryColor || '#6D2323';

  // Module authorization (only used for non-technical users)
  const handleModuleAuthorization = async () => {
    if (!confidentialPasswordInput) {
      setSnackbarMessage('Please enter an authorized password.');
      setSnackbarOpen(true);
      return;
    }
    setPasswordLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/confidential-password/verify`,
        { password: confidentialPasswordInput },
        getAuthHeaders(),
      );
      if (response.data.verified) {
        setModuleAuthorized(true);
        setOpenConfidentialPassword(false);
        setConfidentialPasswordInput('');
        fetchUsers();
      } else {
        setSnackbarMessage('Password verification failed. Please try again.');
        setSnackbarOpen(true);
        setConfidentialPasswordInput('');
      }
    } catch (error) {
      console.error('Error verifying authorized password:', error);
      setSnackbarMessage(
        error.response?.data?.error ||
          'Failed to verify password. Please try again.',
      );
      setSnackbarOpen(true);
      setConfidentialPasswordInput('');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleModuleAccessCancel = () => navigate('/admin-home');

  // ── Clear all retry timers ────────────────────────────────────────────
  const clearRetryTimers = useCallback(() => {
    if (retryTimerRef.current)  clearTimeout(retryTimerRef.current);
    if (countdownRef.current)   clearInterval(countdownRef.current);
  }, []);

  // ── Core data fetcher (throws on failure so retry logic can catch it) ──
  const doFetchUsers = useCallback(async () => {
    const authHeaders = getAuthHeaders();
    const [usersResp, personsResp, empCatsResp] = await Promise.all([
      fetch(`${API_BASE_URL}/users`, { method: 'GET', ...authHeaders }),
      fetch(`${API_BASE_URL}/personalinfo/person_table`, { method: 'GET', ...authHeaders }),
      fetch(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`, { method: 'GET', ...authHeaders }),
    ]);

    if (!usersResp.ok) {
      const err = await usersResp.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch users');
    }

    const usersDataRaw   = await usersResp.json();
    const personsDataRaw = await personsResp.json().catch(() => []);
    const empCatsDataRaw = empCatsResp?.ok ? await empCatsResp.json().catch(() => []) : [];

    const usersArray   = Array.isArray(usersDataRaw)   ? usersDataRaw   : usersDataRaw.users   || usersDataRaw.data   || [];
    const personsArray = Array.isArray(personsDataRaw) ? personsDataRaw : personsDataRaw.persons || personsDataRaw.data || [];
    const empCatsArray = Array.isArray(empCatsDataRaw) ? empCatsDataRaw : empCatsDataRaw.data   || empCatsDataRaw.records || [];

    const empCatsMap = (empCatsArray || []).reduce((acc, row) => {
      const key = String(row.employeeNumber ?? row.employee_number ?? '');
      if (key) acc[key] = row;
      return acc;
    }, {});

    return (usersArray || []).map((user) => {
      const person    = (personsArray || []).find((p) => String(p.agencyEmployeeNum) === String(user.employeeNumber));
      const empCatRow = empCatsMap[String(user.employeeNumber)] || null;
      const fullName  = person
        ? `${person.firstName || ''} ${person.middleName || ''} ${person.lastName || ''} ${person.nameExtension || ''}`.trim()
        : user.fullName || user.username || `${user.firstName || ''} ${user.lastName || ''}`.trim();
      const avatar = person?.profile_picture
        ? `${API_BASE_URL}${person.profile_picture}`
        : user.avatar
          ? String(user.avatar).startsWith('http') ? user.avatar : `${API_BASE_URL}${user.avatar}`
          : null;
      return {
        ...user,
        fullName: fullName || 'Username',
        avatar:   avatar   || null,
        personData: person || {},
        employmentCategory:
          empCatRow?.employmentCategory !== undefined && empCatRow?.employmentCategory !== null
            ? empCatRow.employmentCategory
            : user.employmentCategory !== undefined && user.employmentCategory !== null
              ? user.employmentCategory
              : null,
        customCategory:
          empCatRow?.customCategory ?? empCatRow?.custom_category ??
          user.customCategory ?? user.custom_category ?? null,
        departmentCode:        user.departmentCode        || null,
        departmentDescription: user.departmentDescription || null,
      };
    });
  }, []); // eslint-disable-line

  // ── Internet-proof fetchUsers — retries silently, never shows an error
  //    on a network failure. Shows only a quiet inline banner.
  //    isManualRefresh=true skips the skeleton and just spins the header icon.
  const fetchUsers = useCallback(async (isManualRefresh = false, attemptNum = 0) => {
    clearRetryTimers();

    if (!isManualRefresh && attemptNum === 0) {
      setLoading(true);
    }
    if (isManualRefresh) setRefreshing(true);

    try {
      const merged = await doFetchUsers();
      if (!mountedRef.current) return;

      setUsers(merged);
      setFilteredUsers(merged);
      setLoading(false);
      setRefreshing(false);
      setOffline(false);
      setRetryIn(0);
      retryAttemptRef.current = 0;
      setError(''); // clear any previous mutation errors
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('fetchUsers error (attempt', attemptNum, '):', err);

      setRefreshing(false);

      // Only show the skeleton (loading=true) if we have no data yet
      if (users.length === 0) setLoading(true);
      else setLoading(false); // keep showing stale data

      // Show the quiet offline banner (but not on the very first attempt —
      // give one silent try before telling the user anything)
      if (attemptNum > 0 || users.length === 0) setOffline(true);

      const delaySeconds = RETRY_DELAYS[Math.min(attemptNum, RETRY_DELAYS.length - 1)];
      setRetryIn(delaySeconds);

      // Live countdown
      let remaining = delaySeconds;
      countdownRef.current = setInterval(() => {
        remaining -= 1;
        if (mountedRef.current) setRetryIn(remaining);
        if (remaining <= 0) clearInterval(countdownRef.current);
      }, 1000);

      // Schedule retry
      retryAttemptRef.current = attemptNum + 1;
      retryTimerRef.current = setTimeout(() => {
        if (mountedRef.current) fetchUsers(false, attemptNum + 1);
      }, delaySeconds * 1000);
    }
  }, [doFetchUsers, clearRetryTimers, users.length]); // eslint-disable-line

  // ── Mount / unmount: kick off fetch, clean up timers on leave ────────
  useEffect(() => {
    mountedRef.current = true;
    if (isTechnicalUser) fetchUsers();
    return () => {
      mountedRef.current = false;
      clearRetryTimers();
    };
  }, []); // eslint-disable-line

  // ── Re-fetch instantly when browser regains connectivity ──────────────
  useEffect(() => {
    const handleOnline = () => {
      if (mountedRef.current && offline) {
        clearRetryTimers();
        fetchUsers(false, 0);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [offline, fetchUsers, clearRetryTimers]);

  const fetchUserPageAccess = async (user) => {
    try {
      const authHeaders = getAuthHeaders();
      const accessResponse = await fetch(
        `${API_BASE_URL}/page_access/${user.employeeNumber}`,
        { method: 'GET', ...authHeaders },
      );
      if (accessResponse.ok) {
        const accessDataRaw = await accessResponse.json();
        const accessData = Array.isArray(accessDataRaw)
          ? accessDataRaw
          : accessDataRaw.data || [];
        const accessMap = (accessData || []).reduce((acc, curr) => {
          const privilege = String(curr.page_privilege || '0');
          acc[curr.page_id] = privilege !== '0' && privilege !== '';
          return acc;
        }, {});
        const pagesResponse = await fetch(`${API_BASE_URL}/pages`, {
          method: 'GET',
          ...authHeaders,
        });
        if (pagesResponse.ok) {
          let pagesData = await pagesResponse.json();
          pagesData = Array.isArray(pagesData)
            ? pagesData
            : pagesData.pages || pagesData.data || [];
          pagesData = (pagesData || []).sort(
            (a, b) => (a.id || 0) - (b.id || 0),
          );
          const accessiblePages = pagesData.filter(
            (page) => accessMap[page.id] === true,
          );
          setSelectedUserForDetails((prev) => ({
            ...prev,
            accessiblePages,
            totalPages: pagesData.length,
            hasAccess: accessiblePages.length > 0,
          }));
          const percentage =
            pagesData.length > 0
              ? (accessiblePages.length / pagesData.length) * 100
              : 0;
          let current = 0;
          const increment = percentage / 20;
          const timer = setInterval(() => {
            current += increment;
            if (current >= percentage) {
              current = percentage;
              clearInterval(timer);
            }
            setAnimatedValue(current);
          }, 50);
        }
      }
    } catch (err) {
      console.error('Error fetching user page access:', err);
    }
  };

  const handlePageAccessClick = async (user) => {
    setSelectedUser(user);
    setPageAccessLoading(true);
    setPageAccessDialog(true);
    setActiveAccessCategory(null);
    try {
      const authHeaders = getAuthHeaders();
      const pagesResponse = await fetch(`${API_BASE_URL}/pages`, {
        method: 'GET',
        ...authHeaders,
      });
      if (pagesResponse.ok) {
        let pagesData = await pagesResponse.json();
        pagesData = Array.isArray(pagesData)
          ? pagesData
          : pagesData.pages || pagesData.data || [];
        pagesData = (pagesData || []).sort((a, b) => (a.id || 0) - (b.id || 0));
        setPages(pagesData);
        const accessResponse = await fetch(
          `${API_BASE_URL}/page_access/${user.employeeNumber}`,
          { method: 'GET', ...authHeaders },
        );
        if (accessResponse.ok) {
          const accessDataRaw = await accessResponse.json();
          const accessData = Array.isArray(accessDataRaw)
            ? accessDataRaw
            : accessDataRaw.data || [];
          const accessMap = (accessData || []).reduce((acc, curr) => {
            const privilege = String(curr.page_privilege || '0');
            acc[curr.page_id] = privilege !== '0' && privilege !== '';
            return acc;
          }, {});
          setPageAccess(accessMap);
          if (pagesData.length > 0) {
            const grouped = pagesData.reduce((acc, page) => {
              const desc = page.page_description || 'Uncategorized';
              acc[desc] = true;
              return acc;
            }, {});
            const order = [
              'General',
              'System Administration',
              'Registration',
              'Information Management',
              'Attendance Management',
              'Payroll Management',
              'Form',
              'Pages Management',
              'Personal Data Sheets',
              'Uncategorized',
            ];
            const descriptions = Object.keys(grouped).sort((a, b) => {
              const ia = order.indexOf(a);
              const ib = order.indexOf(b);
              if (ia !== -1 && ib !== -1) return ia - ib;
              if (ia !== -1) return -1;
              if (ib !== -1) return 1;
              return a.localeCompare(b);
            });
            setActiveAccessCategory(descriptions[0] || 'General');
          }
        } else {
          setPageAccess({});
        }
      } else {
        setPages([]);
      }
    } catch (err) {
      console.error('Error fetching page access data:', err);
      setError('Failed to load page access data');
    } finally {
      setPageAccessLoading(false);
    }
  };

  const handleTogglePageAccess = async (pageId, currentAccess) => {
    const newAccess = !currentAccess;
    setAccessChangeInProgress((prev) => ({ ...prev, [pageId]: true }));
    try {
      const authHeaders = getAuthHeaders();
      if (currentAccess === false) {
        const existingAccessResponse = await fetch(
          `${API_BASE_URL}/page_access/${selectedUser.employeeNumber}`,
          { method: 'GET', ...authHeaders },
        );
        if (existingAccessResponse.ok) {
          const existingAccess = await existingAccessResponse.json();
          const existingRecord = (existingAccess || []).find(
            (access) => access.page_id === pageId,
          );
          if (!existingRecord) {
            const createResponse = await fetch(`${API_BASE_URL}/page_access`, {
              method: 'POST',
              ...authHeaders,
              body: JSON.stringify({
                employeeNumber: selectedUser.employeeNumber,
                page_id: pageId,
                page_privilege: newAccess ? '1' : '0',
              }),
            });
            if (!createResponse.ok) {
              const e = await createResponse.json().catch(() => ({}));
              setError(
                `Failed to create page access: ${e.error || 'Unknown error'}`,
              );
              setAccessChangeInProgress((prev) => ({
                ...prev,
                [pageId]: false,
              }));
              return;
            }
          } else {
            const updateResponse = await fetch(
              `${API_BASE_URL}/page_access/${selectedUser.employeeNumber}/${pageId}`,
              {
                method: 'PUT',
                ...authHeaders,
                body: JSON.stringify({ page_privilege: newAccess ? '1' : '0' }),
              },
            );
            if (!updateResponse.ok) {
              const e = await updateResponse.json().catch(() => ({}));
              setError(
                `Failed to update page access: ${e.error || 'Unknown error'}`,
              );
              setAccessChangeInProgress((prev) => ({
                ...prev,
                [pageId]: false,
              }));
              return;
            }
          }
        }
      } else {
        const updateResponse = await fetch(
          `${API_BASE_URL}/page_access/${selectedUser.employeeNumber}/${pageId}`,
          {
            method: 'PUT',
            ...authHeaders,
            body: JSON.stringify({ page_privilege: newAccess ? '1' : '0' }),
          },
        );
        if (!updateResponse.ok) {
          const e = await updateResponse.json().catch(() => ({}));
          setError(
            `Failed to update page access: ${e.error || 'Unknown error'}`,
          );
          setAccessChangeInProgress((prev) => ({ ...prev, [pageId]: false }));
          return;
        }
      }
      setPageAccess((prev) => ({ ...prev, [pageId]: newAccess }));
      window.dispatchEvent(new Event('pageAccessUpdated'));
    } catch (err) {
      console.error('Error updating page access:', err);
      setError('Network error occurred while updating page access');
    } finally {
      setAccessChangeInProgress((prev) => ({ ...prev, [pageId]: false }));
    }
  };

  const closePageAccessDialog = () => {
    window.dispatchEvent(new Event('pageAccessUpdated'));
    setPageAccessDialog(false);
    setSelectedUser(null);
    setPages([]);
    setPageAccess({});
    setActiveAccessCategory(null);
  };

  const openUserDetails = (user) => {
    setSelectedUserForDetails(user);
    setDetailsDrawerOpen(true);
    setAnimatedValue(0);
    fetchUserPageAccess(user);
  };

  const closeUserDetails = () => {
    setDetailsDrawerOpen(false);
    setSelectedUserForDetails(null);
    setActiveTab('info');
    setAnimatedValue(0);
  };

  const handleRoleChange = (user, newRole) => {
    if (user.role === newRole) return;
    setPendingRoleChange({ user, oldRole: user.role, newRole });
    setRoleChangeDialog(true);
  };

  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return;
    setRoleChangeLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/users/${pendingRoleChange.user.employeeNumber}/role`,
        {
          method: 'PUT',
          ...authHeaders,
          body: JSON.stringify({ role: pendingRoleChange.newRole }),
        },
      );
      if (!response.ok) {
        const e = await response.json().catch(() => ({}));
        setError(e.error || 'Failed to update user role');
        setRoleChangeDialog(false);
        setPendingRoleChange(null);
        setRoleChangeLoading(false);
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.employeeNumber === pendingRoleChange.user.employeeNumber
            ? { ...u, role: pendingRoleChange.newRole }
            : u,
        ),
      );
      setFilteredUsers((prev) =>
        prev.map((u) =>
          u.employeeNumber === pendingRoleChange.user.employeeNumber
            ? { ...u, role: pendingRoleChange.newRole }
            : u,
        ),
      );
      setSuccessAction('edit');
      setSuccessOpen(true);
      setRoleChangeDialog(false);
      setPendingRoleChange(null);
    } catch (err) {
      console.error('Error updating user role:', err);
      setError('Network error occurred while updating user role');
    } finally {
      setRoleChangeLoading(false);
    }
  };

  const cancelRoleChange = () => {
    setRoleChangeDialog(false);
    setPendingRoleChange(null);
  };

  const handleEditUser = (user) => {
    setUserToEdit(user);
    setEditedEmployeeNumber(user.employeeNumber);
    setEditedFirstName(user.firstName || '');
    setEditedMiddleName(user.middleName || '');
    setEditedLastName(user.lastName || '');
    setEditedNameExtension(user.nameExtension || '');
    setEditedEmail(user.email || '');
    setEditedEmploymentCategory(
      user.employmentCategory !== undefined && user.employmentCategory !== null
        ? user.employmentCategory
        : '',
    );
    setEditedCustomCategory(user.customCategory || user.custom_category || '');
    setEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editedEmployeeNumber || !editedFirstName || !editedLastName) {
      setError('Employee Number, First Name, and Last Name are required');
      return;
    }
    if (
      parseInt(editedEmploymentCategory) === 5 &&
      !String(editedCustomCategory || '').trim()
    ) {
      setError(
        'Please enter a custom category description for Other (specify)',
      );
      return;
    }
    setEditLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      if (editedEmployeeNumber !== userToEdit.employeeNumber) {
        const r = await fetch(
          `${API_BASE_URL}/users/${userToEdit.employeeNumber}/employee-number`,
          {
            method: 'PUT',
            ...authHeaders,
            body: JSON.stringify({ newEmployeeNumber: editedEmployeeNumber }),
          },
        );
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          setError(e.error || 'Failed to update employee number');
          setEditLoading(false);
          return;
        }
      }
      const r2 = await fetch(
        `${API_BASE_URL}/personalinfo/person/${editedEmployeeNumber}`,
        {
          method: 'PUT',
          ...authHeaders,
          body: JSON.stringify({
            firstName: editedFirstName,
            middleName: editedMiddleName || null,
            lastName: editedLastName,
            nameExtension: editedNameExtension || null,
          }),
        },
      );
      if (!r2.ok) {
        const e = await r2.json().catch(() => ({}));
        setError(e.error || 'Failed to update user name');
        setEditLoading(false);
        return;
      }
      const currentEmail = (userToEdit.email || '').trim();
      const newEmail = (editedEmail || '').trim();
      if (newEmail !== currentEmail) {
        const r3 = await fetch(
          `${API_BASE_URL}/users/${editedEmployeeNumber}/email`,
          {
            method: 'PUT',
            ...authHeaders,
            body: JSON.stringify({ email: newEmail || null }),
          },
        );
        if (!r3.ok) {
          const e = await r3.json().catch(() => ({}));
          setError(e.error || 'Failed to update email');
          setEditLoading(false);
          return;
        }
      }
      const currentCategory = userToEdit.employmentCategory;
      const newCategory = editedEmploymentCategory;
      if (newCategory !== currentCategory && newCategory !== '') {
        const checkResponse = await fetch(
          `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${editedEmployeeNumber}`,
          { method: 'GET', ...authHeaders },
        );
        if (checkResponse.ok) {
          const categoryData = await checkResponse.json();
          const r4 = await fetch(
            `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${categoryData.id}`,
            {
              method: 'PUT',
              ...authHeaders,
              body: JSON.stringify({
                employeeNumber: editedEmployeeNumber,
                employmentCategory: parseInt(newCategory),
                customCategory:
                  parseInt(newCategory) === 5
                    ? String(editedCustomCategory || '').trim()
                    : '',
              }),
            },
          );
          if (!r4.ok) {
            const e = await r4.json().catch(() => ({}));
            setError(e.error || 'Failed to update employment category');
            setEditLoading(false);
            return;
          }
        } else {
          const r4 = await fetch(
            `${API_BASE_URL}/EmploymentCategoryRoutes/employee-category`,
            {
              method: 'POST',
              ...authHeaders,
              body: JSON.stringify({
                employeeNumber: editedEmployeeNumber,
                employmentCategory: parseInt(newCategory),
                customCategory:
                  parseInt(newCategory) === 5
                    ? String(editedCustomCategory || '').trim()
                    : '',
              }),
            },
          );
          if (!r4.ok) {
            const e = await r4.json().catch(() => ({}));
            setError(e.error || 'Failed to create employment category');
            setEditLoading(false);
            return;
          }
        }
      }
      await fetchUsers();
      setSuccessAction('edit');
      setSuccessOpen(true);
      setEditDialog(false);
      setUserToEdit(null);
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Network error occurred while updating user');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditDialog(false);
    setUserToEdit(null);
  };

  // Bulk category edit handlers
  const toggleSelectEmployee = (employeeNumber) =>
    setSelectedEmployeeNumbers((prev) =>
      prev.includes(employeeNumber)
        ? prev.filter((n) => n !== employeeNumber)
        : [...prev, employeeNumber],
    );
  const isEmployeeSelected = (employeeNumber) =>
    selectedEmployeeNumbers.includes(employeeNumber);
  const isAllCurrentPageSelected = (currentPageUsers) =>
    currentPageUsers?.length > 0 &&
    currentPageUsers.every((u) =>
      selectedEmployeeNumbers.includes(u.employeeNumber),
    );
  const isSomeCurrentPageSelected = (currentPageUsers) => {
    const any = currentPageUsers?.some((u) =>
      selectedEmployeeNumbers.includes(u.employeeNumber),
    );
    const all = currentPageUsers?.every((u) =>
      selectedEmployeeNumbers.includes(u.employeeNumber),
    );
    return any && !all;
  };
  const toggleSelectAllCurrentPage = (currentPageUsers) => {
    if (!currentPageUsers?.length) return;
    if (isAllCurrentPageSelected(currentPageUsers)) {
      const set = new Set(currentPageUsers.map((u) => u.employeeNumber));
      setSelectedEmployeeNumbers((prev) => prev.filter((n) => !set.has(n)));
    } else {
      setSelectedEmployeeNumbers((prev) => {
        const set = new Set(prev);
        currentPageUsers.forEach((u) => set.add(u.employeeNumber));
        return Array.from(set);
      });
    }
  };
  const openBulkCategoryEdit = () => {
    if (!selectedEmployeeNumbers.length) {
      setSnackbarMessage('Please select at least 1 employee.');
      setSnackbarOpen(true);
      return;
    }
    setBulkEmploymentCategory('');
    setBulkCustomCategory('');
    setBulkCategoryDialog(true);
  };
  const closeBulkCategoryEdit = () => {
    setBulkCategoryDialog(false);
    setBulkEmploymentCategory('');
    setBulkCustomCategory('');
  };
  const handleSaveBulkCategoryEdit = async () => {
    if (bulkEmploymentCategory === '' || bulkEmploymentCategory === null) {
      setError('Please select an employment category to apply.');
      return;
    }
    if (
      parseInt(bulkEmploymentCategory) === 5 &&
      !String(bulkCustomCategory || '').trim()
    ) {
      setError(
        'Please enter a custom category description for Other (specify)',
      );
      return;
    }
    if (!selectedEmployeeNumbers.length) {
      setError('No employees selected.');
      return;
    }
    setBulkEditLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      for (const empNo of [...selectedEmployeeNumbers]) {
        const checkResponse = await fetch(
          `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${empNo}`,
          { method: 'GET', ...authHeaders },
        );
        if (checkResponse.ok) {
          const categoryData = await checkResponse.json();
          const r = await fetch(
            `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${categoryData.id}`,
            {
              method: 'PUT',
              ...authHeaders,
              body: JSON.stringify({
                employeeNumber: empNo,
                employmentCategory: parseInt(bulkEmploymentCategory),
                customCategory:
                  parseInt(bulkEmploymentCategory) === 5
                    ? String(bulkCustomCategory || '').trim()
                    : '',
              }),
            },
          );
          if (!r.ok) {
            const e = await r.json().catch(() => ({}));
            throw new Error(e.error || `Failed updating ${empNo}`);
          }
        } else {
          const r = await fetch(
            `${API_BASE_URL}/EmploymentCategoryRoutes/employee-category`,
            {
              method: 'POST',
              ...authHeaders,
              body: JSON.stringify({
                employeeNumber: empNo,
                employmentCategory: parseInt(bulkEmploymentCategory),
                customCategory:
                  parseInt(bulkEmploymentCategory) === 5
                    ? String(bulkCustomCategory || '').trim()
                    : '',
              }),
            },
          );
          if (!r.ok) {
            const e = await r.json().catch(() => ({}));
            throw new Error(e.error || `Failed creating ${empNo}`);
          }
        }
      }
      await fetchUsers();
      setSuccessAction('bulk-edit');
      setSuccessOpen(true);
      setSelectedEmployeeNumbers([]);
      setBulkCategoryDialog(false);
      setBulkEmploymentCategory('');
      setBulkCustomCategory('');
    } catch (err) {
      console.error('Error bulk updating employment category:', err);
      setError(
        err?.message ||
          'Network error occurred while bulk updating employment category',
      );
    } finally {
      setBulkEditLoading(false);
    }
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setDeleteDialog(true);
  };
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/users/${userToDelete.employeeNumber}`,
        { method: 'DELETE', ...authHeaders },
      );
      if (!response.ok) {
        const e = await response.json().catch(() => ({}));
        setError(e.error || 'Failed to delete user');
        setDeleteLoading(false);
        return;
      }
      await fetchUsers();
      setSuccessAction('delete');
      setSuccessOpen(true);
      setDeleteDialog(false);
      setUserToDelete(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Network error occurred while deleting user');
    } finally {
      setDeleteLoading(false);
    }
  };
  const handleCancelDelete = () => {
    setDeleteDialog(false);
    setUserToDelete(null);
  };

  const handleGrantRoleAccess = async (role) => {
    const confirmGrant = window.confirm(
      `This will grant default page access to ALL existing "${role}" users based on the Access Groups configured in Page Management.\n\nContinue?`,
    );
    if (!confirmGrant) return;

    setGrantingRole(role);
    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/users/grant-role-access/${role}`,
        { method: 'POST', ...authHeaders },
      );
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || `Failed to grant access for role: ${role}`);
        return;
      }

      setSuccessAction('grant-access');
      setSuccessOpen(true);

      alert(
        `✅ Default access granted for role: ${role}\n\n` +
          `Users Processed: ${result.usersProcessed}\n` +
          `Pages Granted: ${result.pagesGranted}\n` +
          `Successful Operations: ${result.successfulOperations}\n` +
          `Failed Operations: ${result.failedOperations}`,
      );

      await fetchUsers();
    } catch (err) {
      console.error('Error granting role access:', err);
      setError('Network error occurred while granting role access');
    } finally {
      setGrantingRole(null);
    }
  };

  useEffect(() => {
    // Only trigger fetch via this effect for non-technical users
    // (technical users already fetch on mount via the isTechnicalUser useEffect above)
    if (moduleAuthorized && !isTechnicalUser) fetchUsers();
  }, [moduleAuthorized]);

  useEffect(() => {
    const filtered = users.filter((user) => {
      const matchesSearch =
        (user.fullName || '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(user.employeeNumber || '').includes(searchTerm) ||
        (user.role || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter
        ? (user.role || '').toLowerCase() === roleFilter.toLowerCase()
        : true;
      const matchesCategory =
        categoryFilter !== ''
          ? String(user.employmentCategory) === String(categoryFilter)
          : true;
      const matchesDepartment =
        departmentFilter !== ''
          ? (user.departmentCode || '') === departmentFilter
          : true;
      return (
        matchesSearch && matchesRole && matchesCategory && matchesDepartment
      );
    });
    setFilteredUsers(filtered);
    setPage(0);
  }, [searchTerm, roleFilter, categoryFilter, departmentFilter, users]);

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleColor = (role = '') => {
    switch ((role || '').toLowerCase()) {
      case 'superadmin':
        return {
          sx: { bgcolor: alpha(p, 0.15), color: p },
          icon: <SupervisorAccount />,
        };
      case 'administrator':
        return {
          sx: { bgcolor: alpha(s, 0.15), color: s },
          icon: <AdminPanelSettings />,
        };
      case 'technical':
        return {
          sx: { bgcolor: alpha(p, 0.15), color: p },
          icon: <SupervisorAccount />,
        };
      case 'staff':
        return { sx: { bgcolor: alpha(p, 0.1), color: p }, icon: <Work /> };
      default:
        return { sx: { bgcolor: alpha(p, 0.1), color: p }, icon: <Person /> };
    }
  };

  const paginatedUsers = filteredUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  const getInitials = (nameOrUsername) => {
    if (!nameOrUsername) return 'U';
    const parts = nameOrUsername.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  // ── Password modal — skipped entirely for technical role ──
  if (!moduleAuthorized) {
    return (
      <Modal
        open={openConfidentialPassword}
        onClose={handleModuleAccessCancel}
        disableEscapeKeyDown
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: 500 },
            maxWidth: 600,
            bgcolor: 'white',
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            overflow: 'hidden',
            border: `2px solid ${p}`,
          }}
        >
          <Box
            sx={{
              p: 3,
              bgcolor: 'white',
              borderBottom: `3px solid ${p}`,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Avatar
              sx={{ bgcolor: alpha(p, 0.1), color: p, width: 56, height: 56 }}
            >
              <Lock sx={{ fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 'bold', color: '#333' }}
              >
                User Management Access
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                This module requires authorization
              </Typography>
            </Box>
          </Box>
          <Box sx={{ p: 4, bgcolor: 'white' }}>
            <Alert
              severity="info"
              icon={<Security />}
              sx={{
                mb: 3,
                borderRadius: 2,
                bgcolor: alpha(p, 0.05),
                border: `1px solid ${alpha(p, 0.2)}`,
                '& .MuiAlert-icon': { color: p, fontSize: 28 },
              }}
            >
              <Typography
                variant="body1"
                sx={{ fontWeight: 600, mb: 1, color: '#333' }}
              >
                Restricted Access
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                The User Management contains sensitive information and requires
                authorized access. Please enter authorized password to proceed.
              </Typography>
            </Alert>
            <TextField
              autoFocus
              margin="dense"
              label="Enter Authorized Password"
              type="password"
              fullWidth
              variant="outlined"
              value={confidentialPasswordInput}
              onChange={(e) => setConfidentialPasswordInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleModuleAuthorization();
              }}
              disabled={passwordLoading}
              sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
              <Button
                onClick={handleModuleAccessCancel}
                variant="outlined"
                disabled={passwordLoading}
                sx={{
                  color: p,
                  borderColor: p,
                  px: 3,
                  py: 1.2,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 2,
                  '&:hover': {
                    borderColor: s,
                    backgroundColor: alpha(p, 0.08),
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleModuleAuthorization}
                variant="contained"
                disabled={passwordLoading}
                sx={{
                  backgroundColor: p,
                  color: 'white',
                  px: 4,
                  py: 1.2,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 2,
                  minWidth: 140,
                  '&:hover': { backgroundColor: s },
                  '&:disabled': { backgroundColor: alpha(p, 0.5) },
                }}
                startIcon={
                  passwordLoading ? (
                    <CircularProgress size={18} sx={{ color: 'white' }} />
                  ) : (
                    <Lock />
                  )
                }
              >
                {passwordLoading ? 'Verifying...' : 'Access'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Modal>
    );
  }

  return (
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
        minHeight: '92vh',
      }}
    >
      <Box sx={{ px: 6, mx: 'auto', maxWidth: '1600px' }}>
        {/* ── Header ── */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }}>
            <GlassCard>
              <Box
                sx={{
                  p: 5,
                  background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)`,
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
                    background: `radial-gradient(circle, ${alpha(p, 0.1)} 0%, transparent 70%)`,
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -30,
                    left: '30%',
                    width: 150,
                    height: 150,
                    background: `radial-gradient(circle, ${alpha(p, 0.08)} 0%, transparent 70%)`,
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
                        bgcolor: alpha(p, 0.15),
                        mr: 4,
                        width: 64,
                        height: 64,
                        boxShadow: `0 8px 24px ${alpha(p, 0.15)}`,
                      }}
                    >
                      <People sx={{ fontSize: 32, color: p }} />
                    </Avatar>
                    <Box>
                      <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                          fontWeight: 700,
                          mb: 1,
                          lineHeight: 1.2,
                          color: p,
                        }}
                      >
                        User Management
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ opacity: 0.8, fontWeight: 400, color: tp }}
                      >
                        Manage user accounts, roles, and page access permissions
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip
                      label={`${users.length} Users`}
                      size="small"
                      sx={{
                        bgcolor: alpha(p, 0.15),
                        color: p,
                        fontWeight: 500,
                        '& .MuiChip-label': { px: 1 },
                      }}
                    />
                    <Tooltip title="Refresh Users">
                      <IconButton
                        onClick={() => fetchUsers(true)}
                        disabled={loading}
                        sx={{
                          bgcolor: alpha(p, 0.1),
                          '&:hover': { bgcolor: alpha(p, 0.2) },
                          color: p,
                          width: 48,
                          height: 48,
                          '&:disabled': {
                            bgcolor: alpha(p, 0.05),
                            color: alpha(p, 0.3),
                          },
                        }}
                      >
                        {loading ? (
                          <CircularProgress size={24} sx={{ color: p }} />
                        ) : (
                          <Refresh />
                        )}
                      </IconButton>
                    </Tooltip>
                    <ProfessionalButton
                      variant="contained"
                      startIcon={<PersonAdd />}
                      onClick={() => navigate('/registration')}
                      sx={{ bgcolor: p, color: ac, '&:hover': { bgcolor: s } }}
                    >
                      Single Registration
                    </ProfessionalButton>
                    {isTechnical && (
                      <ProfessionalButton
                        variant="contained"
                        startIcon={<Pages />}
                        onClick={() => navigate('/pages-list')}
                        sx={{
                          bgcolor: p,
                          color: ac,
                          '&:hover': { bgcolor: s },
                        }}
                      >
                        Page Management
                      </ProfessionalButton>
                    )}
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {/* ── Success Overlay ── */}
        <Portal>
          <SuccessfulOverlay
            open={successOpen}
            action={successAction}
            onClose={() => setSuccessOpen(false)}
          />
        </Portal>

        {/* ── Error Alert ── */}
        {error && (
          <Backdrop
            open
            sx={{
              zIndex: 9999,
              backdropFilter: 'blur(8px)',
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}
            onClick={() => setError('')}
          >
            <Fade in timeout={300}>
              <Box
                onClick={(e) => e.stopPropagation()}
                sx={{ minWidth: '400px', maxWidth: '600px' }}
              >
                <Alert
                  severity="error"
                  sx={{
                    borderRadius: 4,
                    boxShadow: '0 12px 48px rgba(0,0,0,0.4)',
                    fontSize: '1.1rem',
                    p: 3,
                    '& .MuiAlert-message': { fontWeight: 500 },
                    '& .MuiAlert-icon': { fontSize: '2rem' },
                  }}
                  icon={<Cancel />}
                  onClose={() => setError('')}
                >
                  {error}
                </Alert>
              </Box>
            </Fade>
          </Backdrop>
        )}

        {/* ── Stats Cards ── */}
        <Fade in timeout={700}>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[
              {
                icon: <AccountCircle sx={{ fontSize: 44, color: tp, mb: 1 }} />,
                value: users.length,
                label: 'Total Users',
              },
              {
                icon: (
                  <SupervisorAccount sx={{ fontSize: 44, color: tp, mb: 1 }} />
                ),
                value: users.filter((u) => u.role === 'superadmin').length,
                label: 'Superadmins',
              },
              {
                icon: (
                  <AdminPanelSettings sx={{ fontSize: 44, color: tp, mb: 1 }} />
                ),
                value: users.filter((u) => u.role === 'administrator').length,
                label: 'Administrators',
              },
              {
                icon: <Work sx={{ fontSize: 44, color: tp, mb: 1 }} />,
                value: users.filter((u) => u.role === 'staff').length,
                label: 'Staff Members',
              },
              {
                icon: <Visibility sx={{ fontSize: 44, color: tp, mb: 1 }} />,
                value: filteredUsers.length,
                label: 'Filtered Results',
              },
            ].map((stat, i) => (
              <Grid
                key={i}
                item
                xs={12}
                sm={6}
                md
                sx={{ minWidth: 0, flex: '1 1 0%' }}
              >
                <GlassCard>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    {stat.icon}
                    <Typography
                      variant="h5"
                      sx={{ color: tp, fontWeight: 700 }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" sx={{ color: tp }}>
                      {stat.label}
                    </Typography>
                  </CardContent>
                </GlassCard>
              </Grid>
            ))}
          </Grid>
        </Fade>

        {/* ── Search & Filter ── */}
        <Fade in timeout={900}>
          <GlassCard sx={{ mb: 4 }}>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: alpha(ac, 0.8), color: tp }}>
                    <FilterList />
                  </Avatar>
                  <Box>
                    <Typography
                      variant="h5"
                      component="div"
                      sx={{ fontWeight: 600, color: tp }}
                    >
                      Search & Filter
                    </Typography>
                    <Typography variant="body2" sx={{ color: tp }}>
                      Find and filter users by various criteria
                    </Typography>
                  </Box>
                </Box>
              }
              sx={{
                bgcolor: alpha(ac, 0.5),
                pb: 2,
                borderBottom: `1px solid ${alpha(p, 0.1)}`,
              }}
            />
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <ModernTextField
                    fullWidth
                    label="Search Users"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, email, employee number, or role"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: tp }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <ModernTextField
                    select
                    fullWidth
                    label="Filter by Role"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <MenuItem value="">All Roles</MenuItem>
                    <MenuItem value="Superadmin">Superadmin</MenuItem>
                    <MenuItem value="Administrator">Administrator</MenuItem>
                    <MenuItem value="Technical">Technical</MenuItem>
                    <MenuItem value="Staff">Staff</MenuItem>
                  </ModernTextField>
                </Grid>
                <Grid item xs={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ fontWeight: 500 }}>
                      Filter by Employment Category
                    </InputLabel>
                    <Select
                      value={categoryFilter}
                      label="Filter by Employment Category"
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      sx={{
                        borderRadius: 3,
                        backgroundColor: 'rgba(255,255,255,0.8)',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderRadius: 3,
                        },
                      }}
                    >
                      <MenuItem value="">All Categories</MenuItem>
                      <ListSubheader>Job Order (JO)</ListSubheader>
                      <MenuItem value="0">
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <Circle sx={{ fontSize: 12, color: '#F57C00' }} />
                        </ListItemIcon>
                        Graduate
                      </MenuItem>
                      <MenuItem value="1">
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <Circle sx={{ fontSize: 12, color: '#E64A19' }} />
                        </ListItemIcon>
                        UnderGrad
                      </MenuItem>
                      <ListSubheader>Regular</ListSubheader>
                      <MenuItem value="2">
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <Circle sx={{ fontSize: 12, color: '#2E7D32' }} />
                        </ListItemIcon>
                        Non-Teaching
                      </MenuItem>
                      <MenuItem value="3">
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <Circle sx={{ fontSize: 12, color: '#1565C0' }} />
                        </ListItemIcon>
                        Teaching (30Hrs)
                      </MenuItem>
                      <MenuItem value="4">
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <Circle sx={{ fontSize: 12, color: '#7B1FA2' }} />
                        </ListItemIcon>
                        Designated (40Hrs)
                      </MenuItem>
                      <ListSubheader>Custom</ListSubheader>
                      <MenuItem value="5">
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <Circle sx={{ fontSize: 12, color: '#00796B' }} />
                        </ListItemIcon>
                        Other (specify)
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ fontWeight: 500 }}>
                      Filter by Department
                    </InputLabel>
                    <Select
                      value={departmentFilter}
                      label="Filter by Department"
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      sx={{
                        borderRadius: 3,
                        backgroundColor: 'rgba(255,255,255,0.8)',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderRadius: 3,
                        },
                      }}
                    >
                      <MenuItem value="">All Departments</MenuItem>
                      {uniqueDepartments.map((code) => (
                        <MenuItem key={code} value={code}>
                          {code}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </GlassCard>
        </Fade>

        {/* ── Skeleton Wireframe (shown while loading, not refreshing) ── */}
        {loading && !refreshing && (
          <Fade in timeout={300}>
            <GlassCard>
              {/* ── Quiet offline banner lives inside the skeleton ── */}
              <OfflineBanner visible={offline} retryIn={retryIn} primaryColor={p} />

              {/* skeleton header bar */}
              <Box
                sx={{
                  p: 3,
                  background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: `1px solid ${alpha(p, 0.1)}`,
                }}
              >
                <Box>
                  <Skeleton animation="wave" variant="text" width={180} height={32} sx={{ bgcolor: alpha(p, 0.12), borderRadius: 1 }} />
                  <Skeleton animation="wave" variant="text" width={120} height={20} sx={{ bgcolor: alpha(p, 0.08), borderRadius: 1, mt: 0.5 }} />
                </Box>
                <Box display="flex" gap={2}>
                  {[140, 160, 170].map((w, i) => (
                    <Skeleton key={i} variant="rounded" width={w} height={42} sx={{ bgcolor: alpha(p, 0.1), borderRadius: 3 }} />
                  ))}
                </Box>
              </Box>

              {/* skeleton table */}
              <Box sx={{ p: 0 }}>
                {/* thead row */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '56px 110px 1fr 1fr 140px 180px 140px 120px',
                    gap: 0,
                    px: 2.5,
                    py: 2,
                    bgcolor: alpha(ac, 0.7),
                    borderBottom: `2px solid ${alpha(p, 0.12)}`,
                  }}
                >
                  {[40, 80, 120, 140, 100, 150, 110, 90].map((w, i) => (
                    <Box key={i} sx={{ px: 1 }}>
                      <Skeleton animation="wave" variant="text" width={w} height={18} sx={{ bgcolor: alpha(p, 0.15), borderRadius: 1 }} />
                    </Box>
                  ))}
                </Box>

                {/* tbody rows */}
                {Array.from({ length: 8 }).map((_, rowIdx) => (
                  <Box
                    key={rowIdx}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '56px 110px 1fr 1fr 140px 180px 140px 120px',
                      gap: 0,
                      px: 2.5,
                      py: 1.5,
                      bgcolor: rowIdx % 2 === 0 ? 'transparent' : alpha(ac, 0.25),
                      borderBottom: `1px solid ${alpha(p, 0.06)}`,
                      alignItems: 'center',
                    }}
                  >
                    {/* checkbox */}
                    <Box sx={{ px: 1 }}>
                      <Skeleton animation="wave" variant="rounded" width={20} height={20} sx={{ bgcolor: alpha(p, 0.1), borderRadius: 0.5 }} />
                    </Box>
                    {/* employee # */}
                    <Box sx={{ px: 1 }}>
                      <Skeleton animation="wave" variant="text" width={70} height={20} sx={{ bgcolor: alpha(p, 0.1), borderRadius: 1 }} />
                    </Box>
                    {/* full name with avatar */}
                    <Box sx={{ px: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Skeleton animation="wave" variant="circular" width={44} height={44} sx={{ bgcolor: alpha(p, 0.12), flexShrink: 0 }} />
                      <Box sx={{ flex: 1 }}>
                        <Skeleton animation="wave" variant="text" width={`${55 + (rowIdx % 3) * 20}%`} height={18} sx={{ bgcolor: alpha(p, 0.1), borderRadius: 1 }} />
                        <Skeleton animation="wave" variant="text" width="40%" height={14} sx={{ bgcolor: alpha(p, 0.07), borderRadius: 1, mt: 0.4 }} />
                      </Box>
                    </Box>
                    {/* email */}
                    <Box sx={{ px: 1 }}>
                      <Skeleton animation="wave" variant="text" width={`${50 + (rowIdx % 4) * 12}%`} height={18} sx={{ bgcolor: alpha(p, 0.09), borderRadius: 1 }} />
                    </Box>
                    {/* role chip */}
                    <Box sx={{ px: 1 }}>
                      <Skeleton animation="wave" variant="rounded" width={110} height={34} sx={{ bgcolor: alpha(p, 0.1), borderRadius: 2 }} />
                    </Box>
                    {/* employment category chip */}
                    <Box sx={{ px: 1 }}>
                      <Skeleton animation="wave" variant="rounded" width={140} height={26} sx={{ bgcolor: alpha(p, 0.09), borderRadius: 3 }} />
                    </Box>
                    {/* department */}
                    <Box sx={{ px: 1 }}>
                      <Skeleton animation="wave" variant="text" width={90} height={18} sx={{ bgcolor: alpha(p, 0.09), borderRadius: 1 }} />
                    </Box>
                    {/* manage button */}
                    <Box sx={{ px: 1 }}>
                      <Skeleton animation="wave" variant="rounded" width={90} height={34} sx={{ bgcolor: alpha(p, 0.12), borderRadius: 3 }} />
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* skeleton pagination */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2, p: 2, pr: 3 }}>
                <Skeleton animation="wave" variant="text" width={120} height={20} sx={{ bgcolor: alpha(p, 0.08), borderRadius: 1 }} />
                <Skeleton animation="wave" variant="text" width={80} height={20} sx={{ bgcolor: alpha(p, 0.08), borderRadius: 1 }} />
                <Skeleton animation="wave" variant="rounded" width={72} height={32} sx={{ bgcolor: alpha(p, 0.1), borderRadius: 2 }} />
              </Box>
            </GlassCard>
          </Fade>
        )}

        {/* ── Users Table ── */}
        {!loading && (
          <Fade in timeout={1100}>
            <GlassCard>
              {/* Quiet offline banner — shown if connection drops after data loaded */}
              <OfflineBanner visible={offline} retryIn={retryIn} primaryColor={p} />
              <Box
                sx={{
                  p: 3,
                  background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: `1px solid ${alpha(p, 0.1)}`,
                }}
              >
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: p }}>
                    Registered Users
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8, color: tp }}>
                    {searchTerm ||
                    roleFilter ||
                    categoryFilter !== '' ||
                    departmentFilter !== ''
                      ? `Showing ${filteredUsers.length} of ${users.length} users`
                      : `Total: ${users.length} registered users`}
                  </Typography>
                </Box>
                <Box
                  display="flex"
                  alignItems="center"
                  gap={2}
                  flexWrap="wrap"
                  justifyContent="flex-end"
                >
                  {['staff', 'administrator', 'superadmin'].map((role) => (
                    <Tooltip
                      key={role}
                      title={`Grant default page access to all ${role} users (based on Access Groups in Page Management)`}
                    >
                      <ProfessionalButton
                        variant="outlined"
                        startIcon={
                          grantingRole === role ? (
                            <CircularProgress size={16} sx={{ color: p }} />
                          ) : (
                            <LockOpen />
                          )
                        }
                        onClick={() => handleGrantRoleAccess(role)}
                        disabled={grantingRole !== null}
                        sx={{
                          borderColor: p,
                          color: p,
                          '&:hover': { bgcolor: alpha(p, 0.1), borderColor: s },
                          '&.Mui-disabled': {
                            borderColor: alpha(p, 0.35),
                            color: alpha(p, 0.6),
                          },
                        }}
                      >
                        {grantingRole === role
                          ? 'Granting...'
                          : `Grant ${role.charAt(0).toUpperCase() + role.slice(1)} Access`}
                      </ProfessionalButton>
                    </Tooltip>
                  ))}
                  {isTechnical && (
                    <Tooltip title="Bulk Edit Employment Category">
                      <ProfessionalButton
                        variant="outlined"
                        startIcon={<Category />}
                        onClick={openBulkCategoryEdit}
                        disabled={selectedEmployeeNumbers.length === 0}
                        sx={{
                          borderColor: p,
                          color: p,
                          '&:hover': { bgcolor: alpha(p, 0.1), borderColor: s },
                          '&.Mui-disabled': {
                            borderColor: alpha(p, 0.35),
                            color: alpha(p, 0.6),
                          },
                        }}
                      >
                        Bulk Edit Category ({selectedEmployeeNumbers.length})
                      </ProfessionalButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>

              <PremiumTableContainer component={Paper} elevation={0}>
                <Table sx={{ minWidth: 800 }}>
                  <TableHead sx={{ bgcolor: alpha(ac, 0.7) }}>
                    <TableRow>
                      <PremiumTableCell isHeader sx={{ color: tp, width: 60 }}>
                        <Checkbox
                          checked={isAllCurrentPageSelected(paginatedUsers)}
                          indeterminate={isSomeCurrentPageSelected(
                            paginatedUsers,
                          )}
                          onChange={() =>
                            toggleSelectAllCurrentPage(paginatedUsers)
                          }
                          sx={{ color: p, '&.Mui-checked': { color: p } }}
                        />
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: tp }}>
                        <BadgeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Employee #
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: tp }}>
                        <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Full Name
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: tp }}>
                        <Email sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Email
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: tp }}>
                        <Business sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Role
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: tp }}>
                        <WorkOutline sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Employment Category
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: tp }}>
                        <Business sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Department
                      </PremiumTableCell>
                      <PremiumTableCell
                        isHeader
                        sx={{ color: tp, textAlign: 'center' }}
                      >
                        <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Page Access
                      </PremiumTableCell>
                      {isTechnical && (
                        <PremiumTableCell
                          isHeader
                          sx={{ color: tp, textAlign: 'center' }}
                        >
                          <Settings sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Actions
                        </PremiumTableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedUsers.length > 0 ? (
                      paginatedUsers.map((user) => {
                        const categoryInfo = getEmploymentCategoryInfo(
                          user.employmentCategory,
                          user.customCategory || user.custom_category,
                        );
                        return (
                          <TableRow
                            key={user.employeeNumber}
                            sx={{
                              '&:nth-of-type(even)': {
                                bgcolor: alpha(ac, 0.3),
                              },
                              '&:hover': { bgcolor: alpha(p, 0.05) },
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <PremiumTableCell>
                              <Checkbox
                                checked={isEmployeeSelected(
                                  user.employeeNumber,
                                )}
                                onChange={() =>
                                  toggleSelectEmployee(user.employeeNumber)
                                }
                                sx={{ color: p, '&.Mui-checked': { color: p } }}
                              />
                            </PremiumTableCell>
                            <PremiumTableCell
                              sx={{ fontWeight: 600, color: tp }}
                            >
                              {user.employeeNumber}
                            </PremiumTableCell>
                            <PremiumTableCell>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 2,
                                }}
                              >
                                <Avatar
                                  src={user.avatar || ''}
                                  alt={user.fullName}
                                  sx={{
                                    width: 48,
                                    height: 48,
                                    bgcolor: p,
                                    color: ac,
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    boxShadow: `0 4px 12px ${alpha(p, 0.2)}`,
                                    border: '2px solid #fff',
                                  }}
                                >
                                  {!user.avatar && getInitials(user.fullName)}
                                </Avatar>
                                <Box>
                                  <Typography
                                    variant="body1"
                                    sx={{ fontWeight: 600, color: tp }}
                                  >
                                    {user.fullName}
                                  </Typography>
                                  {user.nameExtension && (
                                    <Typography
                                      variant="caption"
                                      sx={{ color: tp }}
                                    >
                                      ({user.nameExtension})
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            </PremiumTableCell>
                            <PremiumTableCell sx={{ color: tp }}>
                              {user.email}
                            </PremiumTableCell>
                            <PremiumTableCell>
                              {user.role === 'technical' ? (
                                <Chip
                                  size="small"
                                  label="Technical"
                                  icon={getRoleColor('technical').icon}
                                  sx={{
                                    ...getRoleColor('technical').sx,
                                    fontWeight: 600,
                                    pointerEvents: 'none',
                                  }}
                                />
                              ) : (
                                <ModernTextField
                                  select
                                  value={user.role || 'staff'}
                                  onChange={(e) =>
                                    handleRoleChange(user, e.target.value)
                                  }
                                  size="small"
                                  sx={{
                                    minWidth: 150,
                                    '& .MuiOutlinedInput-root': {
                                      bgcolor: 'rgba(255,255,255,0.9)',
                                    },
                                  }}
                                >
                                  <MenuItem value="superadmin">
                                    Superadmin
                                  </MenuItem>
                                  <MenuItem value="administrator">
                                    Administrator
                                  </MenuItem>
                                  <MenuItem value="staff">Staff</MenuItem>
                                </ModernTextField>
                              )}
                            </PremiumTableCell>
                            <PremiumTableCell>
                              <Chip
                                size="small"
                                label={categoryInfo.label}
                                icon={categoryInfo.icon}
                                sx={{
                                  color: categoryInfo.color,
                                  bgcolor: categoryInfo.bgcolor,
                                  border: `1px solid ${categoryInfo.color}`,
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                }}
                              />
                            </PremiumTableCell>
                            <PremiumTableCell>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                }}
                              >
                                <Business sx={{ color: tp, fontSize: 18 }} />
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 500, color: tp }}
                                >
                                  {user.departmentDescription ||
                                    user.departmentCode ||
                                    '-'}
                                </Typography>
                              </Box>
                            </PremiumTableCell>
                            <PremiumTableCell sx={{ textAlign: 'center' }}>
                              <ProfessionalButton
                                onClick={() => handlePageAccessClick(user)}
                                startIcon={<Security />}
                                size="small"
                                variant="contained"
                                sx={{
                                  bgcolor: p,
                                  color: ac,
                                  '&:hover': { bgcolor: s },
                                }}
                              >
                                Manage
                              </ProfessionalButton>
                            </PremiumTableCell>
                            {isTechnical && (
                              <PremiumTableCell sx={{ textAlign: 'center' }}>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    gap: 1,
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Tooltip title="Edit User" arrow>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleEditUser(user)}
                                      sx={{
                                        bgcolor: alpha(p, 0.1),
                                        color: p,
                                        '&:hover': { bgcolor: p, color: ac },
                                      }}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete User" arrow>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDeleteUser(user)}
                                      sx={{
                                        bgcolor: alpha('#d32f2f', 0.1),
                                        color: '#d32f2f',
                                        '&:hover': {
                                          bgcolor: '#d32f2f',
                                          color: 'white',
                                        },
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </PremiumTableCell>
                            )}
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={isTechnical ? 9 : 8}
                          sx={{ textAlign: 'center', py: 8 }}
                        >
                          <Info
                            sx={{ fontSize: 80, color: alpha(p, 0.3), mb: 3 }}
                          />
                          <Typography
                            variant="h5"
                            color={alpha(p, 0.6)}
                            gutterBottom
                            sx={{ fontWeight: 600 }}
                          >
                            No Users Found
                          </Typography>
                          <Typography variant="body1" color={alpha(p, 0.4)}>
                            {searchTerm ||
                            roleFilter ||
                            categoryFilter !== '' ||
                            departmentFilter !== ''
                              ? 'Try adjusting your search criteria'
                              : 'No users registered yet'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </PremiumTableContainer>

              {filteredUsers.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
                  <TablePagination
                    component="div"
                    count={filteredUsers.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 10, 25, 50, 100]}
                    sx={{
                      '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows':
                        { color: tp, fontWeight: 600 },
                    }}
                  />
                </Box>
              )}
            </GlassCard>
          </Fade>
        )}

        {/* ── Page Access Dialog ── */}
        <Dialog
          open={pageAccessDialog}
          onClose={closePageAccessDialog}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              bgcolor: '#f7f8fa',
              height: '90vh',
              maxHeight: 800,
              overflow: 'hidden',
            },
          }}
        >
          <DialogTitle
            sx={{
              background: `linear-gradient(135deg, ${p} 0%, ${s} 100%)`,
              color: ac,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 3,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Security sx={{ fontSize: 30 }} />
              Page Access Management
            </Box>
            <IconButton onClick={closePageAccessDialog} sx={{ color: ac }}>
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent
            sx={{ p: 0, display: 'flex', overflow: 'hidden', flex: 1 }}
          >
            {selectedUser && (
              <Box
                sx={{
                  display: 'flex',
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden',
                }}
              >
                {/* Left sidebar */}
                <Box
                  sx={{
                    width: 270,
                    flexShrink: 0,
                    bgcolor: '#ffffff',
                    borderRight: `2px solid ${alpha(p, 0.12)}`,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      px: 3,
                      py: 2.5,
                      borderBottom: `1px solid ${alpha(p, 0.1)}`,
                      background: `linear-gradient(135deg, ${alpha(p, 0.07)} 0%, ${alpha(p, 0.02)} 100%)`,
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        mb: 1.5,
                      }}
                    >
                      <Avatar
                        src={selectedUser.avatar || ''}
                        alt={selectedUser.fullName}
                        sx={{
                          bgcolor: p,
                          width: 40,
                          height: 40,
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          border: '2px solid #fff',
                          boxShadow: `0 4px 12px ${alpha(p, 0.2)}`,
                        }}
                      >
                        {!selectedUser.avatar &&
                          getInitials(selectedUser.fullName)}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            color: tp,
                            lineHeight: 1.2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {selectedUser.fullName}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.7rem',
                            color: alpha(tp, 0.6),
                            fontFamily: 'monospace',
                          }}
                        >
                          #{selectedUser.employeeNumber} · {selectedUser.role}
                        </Typography>
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        px: 2,
                        py: 1,
                        bgcolor: alpha(p, 0.06),
                        borderRadius: 1.5,
                        border: `1px solid ${alpha(p, 0.15)}`,
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.55rem',
                          color: alpha(p, 0.5),
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          mb: 0.25,
                        }}
                      >
                        Current Section
                      </Typography>
                      <Typography
                        sx={{ fontWeight: 700, fontSize: '0.78rem', color: p }}
                      >
                        {activeAccessCategory || 'Select a category'}
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      flex: 1,
                      overflowY: 'auto',
                      py: 1,
                      '&::-webkit-scrollbar': { width: 3 },
                      '&::-webkit-scrollbar-thumb': {
                        bgcolor: alpha(p, 0.2),
                        borderRadius: 2,
                      },
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.55rem',
                        fontWeight: 700,
                        color: alpha(p, 0.35),
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        px: 3,
                        pb: 0.75,
                        pt: 0.5,
                      }}
                    >
                      Categories
                    </Typography>
                    {!pageAccessLoading &&
                      pages.length > 0 &&
                      (() => {
                        const groupedPages = pages.reduce((acc, page) => {
                          const desc = page.page_description || 'Uncategorized';
                          if (!acc[desc]) acc[desc] = [];
                          acc[desc].push(page);
                          return acc;
                        }, {});
                        const order = [
                          'General',
                          'System Administration',
                          'Registration',
                          'Information Management',
                          'Attendance Management',
                          'Payroll Management',
                          'Form',
                          'Pages Management',
                          'Personal Data Sheets',
                          'Uncategorized',
                        ];
                        const sortedDescs = Object.keys(groupedPages).sort(
                          (a, b) => {
                            const ia = order.indexOf(a);
                            const ib = order.indexOf(b);
                            if (ia !== -1 && ib !== -1) return ia - ib;
                            if (ia !== -1) return -1;
                            if (ib !== -1) return 1;
                            return a.localeCompare(b);
                          },
                        );
                        const categoryIcons = {
                          General: <Category sx={{ fontSize: 15 }} />,
                          'System Administration': (
                            <Settings sx={{ fontSize: 15 }} />
                          ),
                          Registration: <Assignment sx={{ fontSize: 15 }} />,
                          'Information Management': (
                            <Info sx={{ fontSize: 15 }} />
                          ),
                          'Attendance Management': (
                            <Assessment sx={{ fontSize: 15 }} />
                          ),
                          'Payroll Management': (
                            <Payment sx={{ fontSize: 15 }} />
                          ),
                          Form: <Description sx={{ fontSize: 15 }} />,
                          'Pages Management': <Pages sx={{ fontSize: 15 }} />,
                          'Personal Data Sheets': (
                            <Folder sx={{ fontSize: 15 }} />
                          ),
                          Uncategorized: (
                            <FolderSpecial sx={{ fontSize: 15 }} />
                          ),
                        };
                        return sortedDescs.map((desc) => {
                          const isActive = activeAccessCategory === desc;
                          const pagesInGroup = groupedPages[desc] || [];
                          const enabledInGroup = pagesInGroup.filter(
                            (pg) => pageAccess[pg.id],
                          ).length;
                          const allEnabled =
                            enabledInGroup === pagesInGroup.length &&
                            pagesInGroup.length > 0;
                          return (
                            <Box
                              key={desc}
                              onClick={() => setActiveAccessCategory(desc)}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                px: 3,
                                py: 1.25,
                                cursor: 'pointer',
                                borderLeft: isActive
                                  ? `3px solid ${p}`
                                  : '3px solid transparent',
                                bgcolor: isActive
                                  ? alpha(p, 0.1)
                                  : 'transparent',
                                transition: 'all 0.15s ease',
                                '&:hover': {
                                  bgcolor: isActive
                                    ? alpha(p, 0.1)
                                    : alpha(p, 0.04),
                                },
                              }}
                            >
                              <Box
                                sx={{
                                  color: isActive ? p : alpha(p, 0.35),
                                  flexShrink: 0,
                                }}
                              >
                                {categoryIcons[desc] || (
                                  <FolderSpecial sx={{ fontSize: 15 }} />
                                )}
                              </Box>
                              <Typography
                                sx={{
                                  fontSize: '0.82rem',
                                  fontWeight: isActive ? 700 : 500,
                                  color: isActive ? p : '#6b7280',
                                  flex: 1,
                                }}
                              >
                                {desc}
                              </Typography>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.62rem',
                                    fontWeight: 700,
                                    color: allEnabled
                                      ? '#16a34a'
                                      : isActive
                                        ? p
                                        : '#9ca3af',
                                  }}
                                >
                                  {enabledInGroup}/{pagesInGroup.length}
                                </Typography>
                                {isActive && (
                                  <ChevronRight
                                    sx={{ fontSize: 13, color: alpha(p, 0.4) }}
                                  />
                                )}
                              </Box>
                            </Box>
                          );
                        });
                      })()}
                  </Box>
                  <Box
                    sx={{
                      px: 3,
                      py: 2,
                      borderTop: `1px solid ${alpha(p, 0.1)}`,
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Typography
                        sx={{ fontSize: '0.78rem', fontWeight: 700, color: tp }}
                      >
                        Toggle All Pages
                      </Typography>
                      <Switch
                        size="small"
                        checked={
                          !pageAccessLoading &&
                          pages.length > 0 &&
                          Object.values(pageAccess).every((v) => v === true)
                        }
                        onChange={(e) => {
                          const enableAll = e.target.checked;
                          pages.forEach((page) => {
                            if (pageAccess[page.id] !== enableAll)
                              handleTogglePageAccess(page.id, !enableAll);
                          });
                        }}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: '#16a34a',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track':
                            { backgroundColor: '#16a34a' },
                          '& .MuiSwitch-switchBase:not(.Mui-checked)': {
                            color: '#9ca3af',
                          },
                          '& .MuiSwitch-switchBase:not(.Mui-checked) + .MuiSwitch-track':
                            { backgroundColor: '#d1d5db' },
                        }}
                      />
                    </Box>
                  </Box>
                </Box>

                {/* Center pages panel */}
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    overflow: 'hidden',
                    bgcolor: '#f7f8fa',
                  }}
                >
                  {pageAccessLoading ? (
                    <Box
                      sx={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Box sx={{ textAlign: 'center' }}>
                        <CircularProgress sx={{ color: p, mb: 2 }} />
                        <Typography
                          sx={{
                            fontSize: '0.85rem',
                            color: '#6b7280',
                            fontWeight: 600,
                          }}
                        >
                          Loading page access...
                        </Typography>
                      </Box>
                    </Box>
                  ) : !activeAccessCategory ? (
                    <Box
                      sx={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Box sx={{ textAlign: 'center', px: 4 }}>
                        <Security
                          sx={{ fontSize: 56, color: alpha(p, 0.15), mb: 2 }}
                        />
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: '1rem',
                            color: tp,
                            mb: 0.75,
                          }}
                        >
                          Select a Category
                        </Typography>
                        <Typography
                          sx={{ fontSize: '0.85rem', color: '#9ca3af' }}
                        >
                          Choose a category from the left panel to manage page
                          access
                        </Typography>
                      </Box>
                    </Box>
                  ) : pages.length === 0 ? (
                    <Box
                      sx={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography sx={{ color: '#9ca3af', fontWeight: 600 }}>
                        No pages found in system.
                      </Typography>
                    </Box>
                  ) : (
                    (() => {
                      const groupedPages = pages.reduce((acc, page) => {
                        const desc = page.page_description || 'Uncategorized';
                        if (!acc[desc]) acc[desc] = [];
                        acc[desc].push(page);
                        return acc;
                      }, {});
                      const pagesInGroup =
                        groupedPages[activeAccessCategory] || [];
                      const descInfo = getDescriptionColor(
                        activeAccessCategory,
                        settings,
                      );
                      const enabledCount = pagesInGroup.filter(
                        (pg) => pageAccess[pg.id],
                      ).length;
                      return (
                        <Fade
                          in={!!activeAccessCategory}
                          timeout={250}
                          key={activeAccessCategory}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              height: '100%',
                            }}
                          >
                            <Box
                              sx={{
                                px: 4,
                                py: 2.5,
                                background:
                                  'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
                                borderBottom: `1px solid ${alpha(p, 0.1)}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                                flexShrink: 0,
                              }}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 2,
                                }}
                              >
                                <Avatar
                                  sx={{
                                    bgcolor: descInfo.sx.bgcolor,
                                    width: 42,
                                    height: 42,
                                  }}
                                >
                                  {React.cloneElement(descInfo.icon, {
                                    sx: {
                                      color: descInfo.sx.color,
                                      fontSize: 20,
                                    },
                                  })}
                                </Avatar>
                                <Box>
                                  <Typography
                                    sx={{
                                      fontWeight: 700,
                                      fontSize: '0.95rem',
                                      color: tp,
                                      lineHeight: 1.2,
                                    }}
                                  >
                                    {activeAccessCategory}
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontSize: '0.7rem',
                                      color: '#9ca3af',
                                      fontFamily: 'monospace',
                                    }}
                                  >
                                    {enabledCount} of {pagesInGroup.length}{' '}
                                    pages enabled
                                  </Typography>
                                </Box>
                              </Box>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1.5,
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    color: tp,
                                  }}
                                >
                                  Toggle Current Pages
                                </Typography>
                                <Switch
                                  size="small"
                                  checked={
                                    enabledCount === pagesInGroup.length &&
                                    pagesInGroup.length > 0
                                  }
                                  onChange={(e) => {
                                    const enableAll = e.target.checked;
                                    pagesInGroup.forEach((page) => {
                                      if (pageAccess[page.id] !== enableAll)
                                        handleTogglePageAccess(
                                          page.id,
                                          !enableAll,
                                        );
                                    });
                                  }}
                                  sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': {
                                      color: '#16a34a',
                                    },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track':
                                      { backgroundColor: '#16a34a' },
                                    '& .MuiSwitch-switchBase:not(.Mui-checked)':
                                      { color: '#9ca3af' },
                                    '& .MuiSwitch-switchBase:not(.Mui-checked) + .MuiSwitch-track':
                                      { backgroundColor: '#d1d5db' },
                                  }}
                                />
                              </Box>
                            </Box>
                            <Box
                              sx={{
                                flex: 1,
                                overflowY: 'auto',
                                p: 2.5,
                                '&::-webkit-scrollbar': { width: 4 },
                                '&::-webkit-scrollbar-thumb': {
                                  bgcolor: alpha(p, 0.2),
                                  borderRadius: 2,
                                },
                              }}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 1,
                                }}
                              >
                                {pagesInGroup.map((page) => {
                                  const userRoleInPageGroup = page.page_group
                                    ? page.page_group
                                        .split(',')
                                        .map((g) => g.trim())
                                        .includes(selectedUser?.role)
                                    : false;

                                  const isEnabled =
                                    userRoleInPageGroup &&
                                    !!pageAccess[page.id];
                                  return (
                                    <Box
                                      key={page.id}
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        px: 3,
                                        py: 2,
                                        bgcolor: '#ffffff',
                                        border: `1px solid ${alpha(p, 0.08)}`,
                                        borderRadius: 2,
                                        transition: 'box-shadow 0.2s ease',
                                        '&:hover': {
                                          boxShadow: `0 4px 12px ${alpha(p, 0.1)}`,
                                        },
                                      }}
                                    >
                                      <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography
                                          sx={{
                                            fontWeight: 600,
                                            fontSize: '0.88rem',
                                            color: tp,
                                            mb: 0.25,
                                          }}
                                        >
                                          {page.page_name}
                                        </Typography>
                                        <Typography
                                          sx={{
                                            fontSize: '0.68rem',
                                            color: '#9ca3af',
                                            fontFamily: 'monospace',
                                          }}
                                        >
                                          ID: {page.id}
                                          {page.page_url &&
                                            ` · ${page.page_url}`}
                                        </Typography>
                                      </Box>
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 1.5,
                                          flexShrink: 0,
                                        }}
                                      >
                                        {accessChangeInProgress[page.id] ? (
                                          <CircularProgress
                                            size={20}
                                            sx={{ color: p }}
                                          />
                                        ) : (
                                          <>
                                            <Box
                                              sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.6,
                                                px: 1.5,
                                                py: 0.5,
                                                borderRadius: '20px',
                                                bgcolor: isEnabled
                                                  ? alpha('#16a34a', 0.1)
                                                  : userRoleInPageGroup
                                                    ? alpha('#6b7280', 0.08)
                                                    : alpha('#ef4444', 0.08),
                                                border: `1px solid ${isEnabled ? alpha('#16a34a', 0.3) : userRoleInPageGroup ? alpha('#9ca3af', 0.25) : alpha('#ef4444', 0.3)}`,
                                                transition: 'all 0.2s ease',
                                              }}
                                            >
                                              {isEnabled ? (
                                                <LockOpen
                                                  sx={{
                                                    fontSize: 11,
                                                    color: '#16a34a',
                                                  }}
                                                />
                                              ) : userRoleInPageGroup ? (
                                                <Lock
                                                  sx={{
                                                    fontSize: 11,
                                                    color: '#9ca3af',
                                                  }}
                                                />
                                              ) : (
                                                <Lock
                                                  sx={{
                                                    fontSize: 11,
                                                    color: '#ef4444',
                                                  }}
                                                />
                                              )}
                                              <Typography
                                                sx={{
                                                  fontSize: '0.6rem',
                                                  fontWeight: 800,
                                                  fontFamily: 'monospace',
                                                  letterSpacing: '0.1em',
                                                  textTransform: 'uppercase',
                                                  color: isEnabled
                                                    ? '#16a34a'
                                                    : userRoleInPageGroup
                                                      ? '#9ca3af'
                                                      : '#ef4444',
                                                  transition: 'color 0.2s',
                                                }}
                                              >
                                                {isEnabled
                                                  ? 'Enabled'
                                                  : userRoleInPageGroup
                                                    ? 'Disabled'
                                                    : 'Not Authorized'}
                                              </Typography>
                                            </Box>
                                            <Tooltip
                                              title={
                                                userRoleInPageGroup
                                                  ? ''
                                                  : `Not available for ${selectedUser?.role || 'this role'} - configure in Page Management`
                                              }
                                            >
                                              <Switch
                                                checked={isEnabled}
                                                disabled={!userRoleInPageGroup}
                                                onChange={() =>
                                                  handleTogglePageAccess(
                                                    page.id,
                                                    isEnabled,
                                                  )
                                                }
                                                sx={{
                                                  '& .MuiSwitch-switchBase.Mui-checked':
                                                    { color: '#16a34a' },
                                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track':
                                                    {
                                                      backgroundColor:
                                                        '#16a34a',
                                                    },
                                                  '& .MuiSwitch-switchBase:not(.Mui-checked)':
                                                    {
                                                      color: userRoleInPageGroup
                                                        ? '#9ca3af'
                                                        : '#ccc',
                                                    },
                                                  '& .MuiSwitch-switchBase:not(.Mui-checked) + .MuiSwitch-track':
                                                    {
                                                      backgroundColor:
                                                        userRoleInPageGroup
                                                          ? '#d1d5db'
                                                          : '#e5e7eb',
                                                    },
                                                  '& .Mui-disabled': {
                                                    opacity: 0.5,
                                                  },
                                                }}
                                              />
                                            </Tooltip>
                                          </>
                                        )}
                                      </Box>
                                    </Box>
                                  );
                                })}
                              </Box>
                            </Box>
                          </Box>
                        </Fade>
                      );
                    })()
                  )}
                </Box>

                {/* Right accessible pages panel */}
                <Box
                  sx={{
                    width: 240,
                    flexShrink: 0,
                    bgcolor: '#ffffff',
                    borderLeft: `3px dashed ${alpha('#16a34a', 0.4)}`,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    overflow: 'hidden',
                    boxShadow: `inset 4px 0 16px ${alpha('#16a34a', 0.04)}`,
                  }}
                >
                  <Box
                    sx={{
                      px: 2.5,
                      py: 2,
                      borderBottom: `1px solid ${alpha('#16a34a', 0.12)}`,
                      background: `linear-gradient(135deg, ${alpha('#16a34a', 0.07)} 0%, ${alpha('#16a34a', 0.02)} 100%)`,
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 0.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: '#16a34a',
                          boxShadow: '0 0 0 3px rgba(22,163,74,0.2)',
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.55rem',
                          fontWeight: 700,
                          color: '#16a34a',
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                        }}
                      >
                        Accessible Pages
                      </Typography>
                    </Box>
                    <Typography
                      sx={{ fontSize: '0.72rem', color: '#6b7280', pl: 2.25 }}
                    >
                      {!pageAccessLoading && pages.length > 0
                        ? `${pages.filter((pg) => pageAccess[pg.id]).length} of ${pages.length} total`
                        : '—'}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      flex: 1,
                      overflowY: 'auto',
                      py: 1.5,
                      '&::-webkit-scrollbar': { width: 3 },
                      '&::-webkit-scrollbar-thumb': {
                        bgcolor: alpha('#16a34a', 0.2),
                        borderRadius: 2,
                      },
                    }}
                  >
                    {pageAccessLoading ? (
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          py: 4,
                        }}
                      >
                        <CircularProgress size={20} sx={{ color: '#16a34a' }} />
                      </Box>
                    ) : pages.filter((pg) => pageAccess[pg.id]).length > 0 ? (
                      <Box
                        sx={{
                          px: 1.5,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.5,
                        }}
                      >
                        {pages
                          .filter((pg) => pageAccess[pg.id])
                          .map((page) => {
                            const isInActiveCategory =
                              activeAccessCategory &&
                              (page.page_description || 'Uncategorized') ===
                                activeAccessCategory;
                            return (
                              <Box
                                key={page.id}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  px: 1.5,
                                  py: 0.9,
                                  borderRadius: 1.5,
                                  bgcolor: isInActiveCategory
                                    ? alpha('#16a34a', 0.1)
                                    : alpha('#16a34a', 0.04),
                                  border: `1px solid ${isInActiveCategory ? alpha('#16a34a', 0.3) : alpha('#16a34a', 0.1)}`,
                                  transition: 'all 0.2s ease',
                                }}
                              >
                                <CheckCircle
                                  sx={{
                                    fontSize: 12,
                                    color: '#16a34a',
                                    flexShrink: 0,
                                    opacity: isInActiveCategory ? 1 : 0.6,
                                  }}
                                />
                                <Typography
                                  sx={{
                                    fontSize: '0.72rem',
                                    fontWeight: isInActiveCategory ? 700 : 500,
                                    color: isInActiveCategory
                                      ? '#15803d'
                                      : '#374151',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  {page.page_name}
                                </Typography>
                              </Box>
                            );
                          })}
                      </Box>
                    ) : (
                      <Box sx={{ py: 5, textAlign: 'center', px: 2 }}>
                        <Lock
                          sx={{
                            fontSize: 28,
                            color: alpha('#16a34a', 0.15),
                            mb: 1,
                          }}
                        />
                        <Typography
                          sx={{
                            fontSize: '0.75rem',
                            color: '#9ca3af',
                            fontWeight: 600,
                          }}
                        >
                          No pages granted yet
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Box
                    sx={{
                      px: 2.5,
                      py: 1.75,
                      borderTop: `1px solid ${alpha('#16a34a', 0.12)}`,
                      flexShrink: 0,
                      bgcolor: alpha('#16a34a', 0.03),
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.6rem',
                        color: '#9ca3af',
                        textAlign: 'center',
                      }}
                    >
                      Highlighted = current category
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions
            sx={{
              p: 3,
              gap: 2,
              borderTop: `1px solid ${alpha(p, 0.1)}`,
              bgcolor: '#ffffff',
              flexShrink: 0,
            }}
          >
            <Box
              sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <CheckCircle sx={{ fontSize: 16, color: alpha(p, 0.5) }} />
              <Typography
                sx={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 }}
              >
                Changes are saved automatically. Click "Save & Close" to apply
                to sidebar.
              </Typography>
            </Box>
            <ProfessionalButton
              onClick={closePageAccessDialog}
              variant="outlined"
              sx={{
                borderColor: p,
                color: p,
                '&:hover': { borderColor: s, bgcolor: alpha(p, 0.05) },
              }}
            >
              Cancel
            </ProfessionalButton>
            <ProfessionalButton
              variant="contained"
              startIcon={<CheckCircle />}
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('pageAccessUpdated', {
                    detail: { employeeNumber: selectedUser?.employeeNumber },
                  }),
                );
                setSuccessAction('edit');
                setSuccessOpen(true);
                closePageAccessDialog();
              }}
              sx={{ bgcolor: p, color: ac, '&:hover': { bgcolor: s } }}
            >
              Save & Close
            </ProfessionalButton>
          </DialogActions>
        </Dialog>

        {/* ── User Details Drawer ── */}
        <Drawer
          anchor="right"
          open={detailsDrawerOpen}
          onClose={closeUserDetails}
          PaperProps={{
            sx: { width: isMobile ? '100%' : '520px', bgcolor: ac },
          }}
        >
          {selectedUserForDetails && (
            <Box
              sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              <Box
                sx={{
                  p: 4,
                  background: `linear-gradient(135deg, ${p} 0%, ${s} 100%)`,
                  color: ac,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      src={selectedUserForDetails.avatar || ''}
                      alt={selectedUserForDetails.fullName}
                      sx={{
                        width: 80,
                        height: 80,
                        bgcolor: ac,
                        color: p,
                        fontWeight: 700,
                        fontSize: '2rem',
                        border: '4px solid rgba(255,255,255,0.8)',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                      }}
                    >
                      {!selectedUserForDetails.avatar &&
                        getInitials(selectedUserForDetails.fullName)}
                    </Avatar>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                        {selectedUserForDetails.fullName}
                      </Typography>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        {getRoleColor(selectedUserForDetails.role).icon}
                        <Typography variant="body2">
                          {selectedUserForDetails.role}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <IconButton onClick={closeUserDetails} sx={{ color: ac }}>
                    <Close />
                  </IconButton>
                </Box>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  bgcolor: settings?.backgroundColor || '#FFFFFF',
                  borderBottom: `2px solid ${alpha(p, 0.1)}`,
                }}
              >
                {['info', 'access'].map((tab) => (
                  <Box
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    sx={{
                      flex: 1,
                      p: 2,
                      textAlign: 'center',
                      cursor: 'pointer',
                      borderBottom:
                        activeTab === tab ? `3px solid ${p}` : 'none',
                      color: activeTab === tab ? p : tp,
                      fontWeight: activeTab === tab ? 600 : 500,
                      '&:hover': { bgcolor: alpha(p, 0.05) },
                    }}
                  >
                    {tab === 'info' ? (
                      <>
                        <Info sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Information
                      </>
                    ) : (
                      <>
                        <Key sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Page Access
                      </>
                    )}
                  </Box>
                ))}
              </Box>
              <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                {activeTab === 'info' && (
                  <Stack spacing={3}>
                    <GlassCard>
                      <CardHeader
                        title={
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <AssignmentInd sx={{ color: p }} />
                            <Typography
                              variant="h6"
                              sx={{ fontWeight: 600, color: tp }}
                            >
                              Personal Information
                            </Typography>
                          </Box>
                        }
                        sx={{ bgcolor: alpha(p, 0.05) }}
                      />
                      <CardContent>
                        <Stack spacing={2}>
                          {[
                            {
                              label: 'Full Name',
                              value: selectedUserForDetails.fullName,
                            },
                            {
                              label: 'Employee Number',
                              value: selectedUserForDetails.employeeNumber,
                            },
                            {
                              label: 'Email Address',
                              value: selectedUserForDetails.email,
                            },
                            {
                              label: 'Last Login',
                              value: formatDate(
                                selectedUserForDetails.lastLogin,
                              ),
                            },
                          ].map(({ label, value }) => (
                            <Box key={label}>
                              <Typography variant="caption" sx={{ color: tp }}>
                                {label}
                              </Typography>
                              <Typography
                                variant="body1"
                                sx={{ fontWeight: 600, color: tp }}
                              >
                                {value}
                              </Typography>
                            </Box>
                          ))}
                          <Box>
                            <Typography variant="caption" sx={{ color: tp }}>
                              Role
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              <Chip
                                label={selectedUserForDetails.role}
                                icon={
                                  getRoleColor(selectedUserForDetails.role).icon
                                }
                                sx={{
                                  ...getRoleColor(selectedUserForDetails.role)
                                    .sx,
                                  fontWeight: 600,
                                }}
                              />
                            </Box>
                          </Box>
                          <Box>
                            <Typography variant="caption" sx={{ color: tp }}>
                              Employment Category
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              {(() => {
                                const info = getEmploymentCategoryInfo(
                                  selectedUserForDetails.employmentCategory,
                                  selectedUserForDetails.customCategory ||
                                    selectedUserForDetails.custom_category,
                                );
                                return (
                                  <Chip
                                    label={info.label}
                                    icon={info.icon}
                                    sx={{
                                      color: info.color,
                                      bgcolor: info.bgcolor,
                                      border: `1px solid ${info.color}`,
                                      fontWeight: 600,
                                    }}
                                  />
                                );
                              })()}
                            </Box>
                          </Box>
                          <Box>
                            <Typography variant="caption" sx={{ color: tp }}>
                              Department
                            </Typography>
                            <Box
                              sx={{
                                mt: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              <Business sx={{ color: tp, fontSize: 18 }} />
                              <Typography
                                variant="body1"
                                sx={{ fontWeight: 600, color: tp }}
                              >
                                {selectedUserForDetails.departmentDescription ||
                                  selectedUserForDetails.departmentCode ||
                                  'Unassigned'}
                              </Typography>
                            </Box>
                          </Box>
                        </Stack>
                      </CardContent>
                    </GlassCard>
                  </Stack>
                )}
                {activeTab === 'access' && (
                  <Stack spacing={3}>
                    <GlassCard>
                      <CardHeader
                        title={
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <TrendingUp sx={{ color: p }} />
                            <Typography
                              variant="h6"
                              sx={{ fontWeight: 600, color: tp }}
                            >
                              Page Access Summary
                            </Typography>
                          </Box>
                        }
                        sx={{ bgcolor: alpha(p, 0.05) }}
                      />
                      <CardContent>
                        <Box sx={{ textAlign: 'center', mb: 3 }}>
                          <Typography
                            variant="h2"
                            sx={{ color: p, fontWeight: 700 }}
                          >
                            {selectedUserForDetails.accessiblePages?.length ||
                              0}
                          </Typography>
                          <Typography variant="body2" sx={{ color: tp }}>
                            of {selectedUserForDetails.totalPages || 0} pages
                            accessible
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={animatedValue}
                          sx={{
                            height: 10,
                            borderRadius: 5,
                            bgcolor: alpha(p, 0.1),
                            '& .MuiLinearProgress-bar': { bgcolor: p },
                          }}
                        />
                      </CardContent>
                    </GlassCard>
                    <GlassCard>
                      <CardHeader
                        title={
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Shield sx={{ color: p }} />
                            <Typography
                              variant="h6"
                              sx={{ fontWeight: 600, color: tp }}
                            >
                              Accessible Pages
                            </Typography>
                          </Box>
                        }
                        sx={{ bgcolor: alpha(p, 0.05) }}
                      />
                      <CardContent>
                        {selectedUserForDetails.accessiblePages?.length > 0 ? (
                          <Stack spacing={1}>
                            {selectedUserForDetails.accessiblePages.map(
                              (pg) => (
                                <Box
                                  key={pg.id}
                                  sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: alpha(p, 0.05),
                                    border: `1px solid ${alpha(p, 0.1)}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                  }}
                                >
                                  <CheckCircle sx={{ color: p }} />
                                  <Box sx={{ flex: 1 }}>
                                    <Typography
                                      variant="body1"
                                      sx={{ fontWeight: 600, color: tp }}
                                    >
                                      {pg.page_name}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      sx={{ color: tp }}
                                    >
                                      ID: {pg.id}
                                    </Typography>
                                  </Box>
                                </Box>
                              ),
                            )}
                          </Stack>
                        ) : (
                          <Box sx={{ textAlign: 'center', p: 4 }}>
                            <Cancel
                              sx={{ fontSize: 60, color: alpha(p, 0.3), mb: 2 }}
                            />
                            <Typography variant="body1" sx={{ color: tp }}>
                              No page access granted
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </GlassCard>
                  </Stack>
                )}
              </Box>
              <Box sx={{ p: 3, borderTop: `1px solid ${alpha(p, 0.1)}` }}>
                <ProfessionalButton
                  variant="contained"
                  fullWidth
                  startIcon={<Security />}
                  onClick={() => {
                    closeUserDetails();
                    handlePageAccessClick(selectedUserForDetails);
                  }}
                  sx={{
                    bgcolor: p,
                    color: ac,
                    py: 1.5,
                    '&:hover': { bgcolor: s },
                  }}
                >
                  Manage Page Access
                </ProfessionalButton>
              </Box>
            </Box>
          )}
        </Drawer>

        {/* ── Role Change Dialog ── */}
        <Dialog
          open={roleChangeDialog}
          onClose={cancelRoleChange}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 4, bgcolor: ac } }}
        >
          <DialogTitle
            sx={{
              background: `linear-gradient(135deg, ${p} 0%, ${s} 100%)`,
              color: ac,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 3,
              fontWeight: 700,
            }}
          >
            <VerifiedUser sx={{ fontSize: 30 }} />
            Confirm Role Change
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            {pendingRoleChange && (
              <>
                <Box
                  sx={{
                    mb: 3,
                    p: 3,
                    borderRadius: 3,
                    border: `1px solid ${alpha(p, 0.2)}`,
                    bgcolor: alpha(ac, 0.5),
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      src={pendingRoleChange.user.avatar || ''}
                      sx={{
                        bgcolor: p,
                        width: 64,
                        height: 64,
                        fontWeight: 700,
                        fontSize: '1.2rem',
                        border: '3px solid #fff',
                        boxShadow: `0 4px 12px ${alpha(p, 0.2)}`,
                      }}
                    >
                      {!pendingRoleChange.user.avatar &&
                        getInitials(pendingRoleChange.user.fullName)}
                    </Avatar>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 700, color: tp }}
                      >
                        {pendingRoleChange.user.fullName}
                      </Typography>
                      <Typography variant="body2" sx={{ color: tp, mt: 1 }}>
                        Employee:{' '}
                        <strong>{pendingRoleChange.user.employeeNumber}</strong>
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Alert
                  severity="warning"
                  sx={{
                    mb: 3,
                    borderRadius: 2,
                    '& .MuiAlert-message': { fontWeight: 500 },
                  }}
                  icon={<Info />}
                >
                  You are about to change the user's role. This action will be
                  logged in the audit trail.
                </Alert>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    bgcolor: alpha(p, 0.05),
                    border: `1px solid ${alpha(p, 0.1)}`,
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ mb: 2, fontWeight: 600, color: tp }}
                  >
                    Role Change Details:
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Chip
                      label={pendingRoleChange.oldRole.toUpperCase()}
                      size="small"
                      icon={getRoleColor(pendingRoleChange.oldRole).icon}
                      sx={{
                        ...getRoleColor(pendingRoleChange.oldRole).sx,
                        fontWeight: 600,
                      }}
                    />
                    <Typography sx={{ color: tp }}>→</Typography>
                    <Chip
                      label={pendingRoleChange.newRole.toUpperCase()}
                      size="small"
                      icon={getRoleColor(pendingRoleChange.newRole).icon}
                      sx={{
                        ...getRoleColor(pendingRoleChange.newRole).sx,
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                </Box>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 2 }}>
            <ProfessionalButton
              onClick={cancelRoleChange}
              variant="outlined"
              disabled={roleChangeLoading}
              sx={{
                borderColor: p,
                color: p,
                '&:hover': { borderColor: s, bgcolor: alpha(p, 0.05) },
              }}
            >
              Cancel
            </ProfessionalButton>
            <ProfessionalButton
              onClick={confirmRoleChange}
              variant="contained"
              disabled={roleChangeLoading}
              startIcon={
                roleChangeLoading ? (
                  <CircularProgress size={20} />
                ) : (
                  <CheckCircle />
                )
              }
              sx={{
                bgcolor: p,
                color: ac,
                '&:hover': { bgcolor: s },
                '&:disabled': { bgcolor: alpha(p, 0.5) },
              }}
            >
              {roleChangeLoading ? 'Updating...' : 'Confirm Change'}
            </ProfessionalButton>
          </DialogActions>
        </Dialog>

        {/* ── Edit User Dialog ── */}
        <Dialog
          open={editDialog}
          onClose={handleCancelEdit}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 4, bgcolor: ac } }}
        >
          <DialogTitle
            sx={{
              background: `linear-gradient(135deg, ${p} 0%, ${s} 100%)`,
              color: ac,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 0.5,
              p: 3,
              fontWeight: 700,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <EditIcon sx={{ fontSize: 30 }} />
              Edit User Information
            </Box>
            {userToEdit && (
              <Typography
                variant="body2"
                sx={{ fontWeight: 500, opacity: 0.95, pl: 5.5 }}
              >
                Editing: <strong>{userToEdit.employeeNumber}</strong> —{' '}
                {[
                  userToEdit.firstName,
                  userToEdit.middleName,
                  userToEdit.lastName,
                ]
                  .filter(Boolean)
                  .join(' ')}
                {userToEdit.nameExtension ? ` ${userToEdit.nameExtension}` : ''}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            {userToEdit && (
              <>
                <Box
                  sx={{
                    mb: 3,
                    mt: 2,
                    p: 3,
                    borderRadius: 3,
                    border: `1px solid ${alpha(p, 0.2)}`,
                    bgcolor: alpha(ac, 0.5),
                  }}
                >
                  <ModernTextField
                    fullWidth
                    label="Employee Number"
                    value={editedEmployeeNumber}
                    onChange={(e) => setEditedEmployeeNumber(e.target.value)}
                    sx={{ mb: 2 }}
                    required
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <ModernTextField
                        fullWidth
                        label="First Name"
                        value={editedFirstName}
                        onChange={(e) => setEditedFirstName(e.target.value)}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <ModernTextField
                        fullWidth
                        label="Middle Name"
                        value={editedMiddleName}
                        onChange={(e) => setEditedMiddleName(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <ModernTextField
                        fullWidth
                        label="Last Name"
                        value={editedLastName}
                        onChange={(e) => setEditedLastName(e.target.value)}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <ModernTextField
                        fullWidth
                        label="Name Extension (Jr., Sr., III)"
                        value={editedNameExtension}
                        onChange={(e) => setEditedNameExtension(e.target.value)}
                      />
                    </Grid>
                  </Grid>
                  <ModernTextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    sx={{ mt: 2 }}
                    placeholder="Can be left empty to remove"
                  />
                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel sx={{ fontWeight: 500 }}>
                      Employment Category
                    </InputLabel>
                    <Select
                      value={editedEmploymentCategory}
                      label="Employment Category"
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditedEmploymentCategory(val);
                        if (parseInt(val) !== 5) setEditedCustomCategory('');
                      }}
                      sx={{
                        borderRadius: 3,
                        backgroundColor: 'rgba(255,255,255,0.8)',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderRadius: 3,
                        },
                      }}
                    >
                      <ListSubheader>Job Order (JO)</ListSubheader>
                      <MenuItem value={0}>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <Circle sx={{ fontSize: 12, color: '#F57C00' }} />
                        </ListItemIcon>
                        Graduate
                      </MenuItem>
                      <MenuItem value={1}>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <Circle sx={{ fontSize: 12, color: '#E64A19' }} />
                        </ListItemIcon>
                        UnderGrad
                      </MenuItem>
                      <ListSubheader>Regular</ListSubheader>
                      <MenuItem value={2}>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <Circle sx={{ fontSize: 12, color: '#2E7D32' }} />
                        </ListItemIcon>
                        Non-Teaching
                      </MenuItem>
                      <MenuItem value={3}>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <Circle sx={{ fontSize: 12, color: '#1565C0' }} />
                        </ListItemIcon>
                        Teaching (30Hrs)
                      </MenuItem>
                      <MenuItem value={4}>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <Circle sx={{ fontSize: 12, color: '#7B1FA2' }} />
                        </ListItemIcon>
                        Designated (40Hrs)
                      </MenuItem>
                      <ListSubheader>Custom</ListSubheader>
                      <MenuItem value={5}>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <Circle sx={{ fontSize: 12, color: '#00796B' }} />
                        </ListItemIcon>
                        Other (specify)
                      </MenuItem>
                    </Select>
                  </FormControl>
                  {parseInt(editedEmploymentCategory) === 5 && (
                    <Fade in>
                      <ModernTextField
                        fullWidth
                        label="Custom Category Description *"
                        value={editedCustomCategory}
                        onChange={(e) =>
                          setEditedCustomCategory(e.target.value)
                        }
                        sx={{ mt: 2 }}
                        placeholder="e.g., Part-timer, OJT, Consultant..."
                        inputProps={{ maxLength: 100 }}
                        helperText="Max 100 characters - describe the employment type"
                        required
                      />
                    </Fade>
                  )}
                </Box>
                <Alert
                  severity="info"
                  sx={{
                    borderRadius: 2,
                    '& .MuiAlert-message': { fontWeight: 500 },
                  }}
                  icon={<Info />}
                >
                  Changes will be reflected across all modules and records.
                </Alert>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 2 }}>
            <ProfessionalButton
              onClick={handleCancelEdit}
              variant="outlined"
              disabled={editLoading}
              sx={{
                borderColor: p,
                color: p,
                '&:hover': { borderColor: s, bgcolor: alpha(p, 0.05) },
              }}
            >
              Cancel
            </ProfessionalButton>
            <ProfessionalButton
              onClick={handleSaveEdit}
              variant="contained"
              disabled={editLoading}
              startIcon={
                editLoading ? <CircularProgress size={20} /> : <CheckCircle />
              }
              sx={{
                bgcolor: p,
                color: ac,
                '&:hover': { bgcolor: s },
                '&:disabled': { bgcolor: alpha(p, 0.5) },
              }}
            >
              {editLoading ? 'Saving...' : 'Save Changes'}
            </ProfessionalButton>
          </DialogActions>
        </Dialog>

        {/* ── Bulk Category Dialog ── */}
        <Dialog
          open={bulkCategoryDialog}
          onClose={closeBulkCategoryEdit}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 4, bgcolor: ac } }}
        >
          <DialogTitle
            sx={{
              background: `linear-gradient(135deg, ${p} 0%, ${s} 100%)`,
              color: ac,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 3,
              fontWeight: 700,
            }}
          >
            <Category sx={{ fontSize: 30 }} />
            Bulk Edit Employment Category
            <Box sx={{ ml: 'auto' }}>
              <Chip
                label={`${selectedEmployeeNumbers.length} selected`}
                sx={{ bgcolor: alpha(ac, 0.2), color: ac, fontWeight: 700 }}
              />
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 4, pt: 3 }}>
            <Box
              sx={{
                mb: 3,
                p: 2,
                borderRadius: 3,
                border: `1px solid ${alpha(p, 0.18)}`,
                bgcolor: alpha(ac, 0.55),
              }}
            >
              <Typography variant="body2" sx={{ color: tp, fontWeight: 600 }}>
                This will apply the selected employment category to all selected
                employees.
              </Typography>
            </Box>
            <Typography
              variant="caption"
              sx={{ color: tp, fontWeight: 700, letterSpacing: 0.4 }}
            >
              Selected Employee Numbers
            </Typography>
            <Box
              sx={{
                mt: 1,
                maxHeight: 180,
                overflow: 'auto',
                p: 2,
                borderRadius: 3,
                border: `1px solid ${alpha(p, 0.2)}`,
                bgcolor: 'rgba(255,255,255,0.7)',
              }}
            >
              {selectedEmployeeNumbers.length === 0 ? (
                <Typography variant="body2" sx={{ color: tp }}>
                  None selected
                </Typography>
              ) : (
                <List dense disablePadding>
                  {selectedEmployeeNumbers.map((empNo) => {
                    const u = users.find(
                      (x) => String(x.employeeNumber) === String(empNo),
                    );
                    return (
                      <ListItem key={empNo} sx={{ py: 0.5 }} disableGutters>
                        <ListItemText
                          primary={
                            <Typography
                              variant="body2"
                              sx={{ color: tp, fontWeight: 600 }}
                            >
                              {empNo} - {u?.fullName || 'Unknown'}
                            </Typography>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Box>
            <Divider sx={{ my: 3, borderColor: alpha(p, 0.15) }} />
            <Typography
              variant="caption"
              sx={{ color: tp, fontWeight: 700, letterSpacing: 0.4 }}
            >
              Employment Category Change
            </Typography>
            <Box
              sx={{
                mt: 1,
                p: 2,
                borderRadius: 3,
                border: `1px solid ${alpha(p, 0.2)}`,
                bgcolor: 'rgba(255,255,255,0.7)',
              }}
            >
              <FormControl fullWidth>
                <InputLabel sx={{ fontWeight: 600, color: tp }}>
                  Employment Category
                </InputLabel>
                <Select
                  value={bulkEmploymentCategory}
                  label="Employment Category"
                  onChange={(e) => {
                    const val = e.target.value;
                    setBulkEmploymentCategory(val);
                    if (parseInt(val) !== 5) setBulkCustomCategory('');
                  }}
                  sx={{
                    borderRadius: 3,
                    backgroundColor: 'rgba(255,255,255,0.9)',
                  }}
                >
                  <ListSubheader>Job Order (JO)</ListSubheader>
                  <MenuItem value={0}>
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <Circle sx={{ fontSize: 12, color: '#F57C00' }} />
                    </ListItemIcon>
                    Graduate
                  </MenuItem>
                  <MenuItem value={1}>
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <Circle sx={{ fontSize: 12, color: '#E64A19' }} />
                    </ListItemIcon>
                    UnderGrad
                  </MenuItem>
                  <ListSubheader>Regular</ListSubheader>
                  <MenuItem value={2}>
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <Circle sx={{ fontSize: 12, color: '#2E7D32' }} />
                    </ListItemIcon>
                    Non-Teaching
                  </MenuItem>
                  <MenuItem value={3}>
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <Circle sx={{ fontSize: 12, color: '#1565C0' }} />
                    </ListItemIcon>
                    Teaching (30Hrs)
                  </MenuItem>
                  <MenuItem value={4}>
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <Circle sx={{ fontSize: 12, color: '#7B1FA2' }} />
                    </ListItemIcon>
                    Designated (40Hrs)
                  </MenuItem>
                  <ListSubheader>Custom</ListSubheader>
                  <MenuItem value={5}>
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <Circle sx={{ fontSize: 12, color: '#00796B' }} />
                    </ListItemIcon>
                    Other (specify)
                  </MenuItem>
                </Select>
              </FormControl>
              {parseInt(bulkEmploymentCategory) === 5 && (
                <Fade in>
                  <ModernTextField
                    fullWidth
                    label="Custom Category Description *"
                    value={bulkCustomCategory}
                    onChange={(e) => setBulkCustomCategory(e.target.value)}
                    sx={{ mt: 2 }}
                    placeholder="e.g., Part-timer, OJT, Consultant..."
                    inputProps={{ maxLength: 100 }}
                    helperText="Max 100 characters"
                    required
                  />
                </Fade>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <ProfessionalButton
              onClick={closeBulkCategoryEdit}
              variant="outlined"
              startIcon={<Close />}
              disabled={bulkEditLoading}
              sx={{
                borderColor: p,
                color: p,
                '&:hover': { bgcolor: alpha(p, 0.1), borderColor: s },
              }}
            >
              Cancel
            </ProfessionalButton>
            <ProfessionalButton
              onClick={handleSaveBulkCategoryEdit}
              variant="contained"
              disabled={bulkEditLoading}
              startIcon={
                bulkEditLoading ? (
                  <CircularProgress size={20} />
                ) : (
                  <CheckCircle />
                )
              }
              sx={{
                bgcolor: p,
                color: ac,
                '&:hover': { bgcolor: s },
                '&:disabled': { bgcolor: alpha(p, 0.5) },
              }}
            >
              {bulkEditLoading ? 'Saving...' : 'Apply to Selected'}
            </ProfessionalButton>
          </DialogActions>
        </Dialog>

        {/* ── Delete User Dialog ── */}
        <Dialog
          open={deleteDialog}
          onClose={handleCancelDelete}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 4, bgcolor: ac } }}
        >
          <DialogTitle
            sx={{
              background: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 3,
              fontWeight: 700,
            }}
          >
            <DeleteIcon sx={{ fontSize: 30 }} />
            Confirm Delete User
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            {userToDelete && (
              <>
                <Box
                  sx={{
                    mb: 3,
                    p: 3,
                    borderRadius: 3,
                    border: '1px solid rgba(211,47,47,0.2)',
                    bgcolor: 'rgba(211,47,47,0.05)',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Avatar
                      src={userToDelete.avatar || ''}
                      sx={{
                        bgcolor: '#d32f2f',
                        width: 64,
                        height: 64,
                        fontWeight: 700,
                        fontSize: '1.2rem',
                        border: '3px solid #fff',
                        boxShadow: '0 4px 12px rgba(211,47,47,0.2)',
                      }}
                    >
                      {!userToDelete.avatar &&
                        getInitials(userToDelete.fullName)}
                    </Avatar>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 700, color: tp }}
                      >
                        {userToDelete.fullName}
                      </Typography>
                      <Typography variant="body2" sx={{ color: tp, mt: 1 }}>
                        Employee: <strong>{userToDelete.employeeNumber}</strong>
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Alert
                  severity="warning"
                  sx={{
                    borderRadius: 2,
                    '& .MuiAlert-message': { fontWeight: 500 },
                  }}
                  icon={<ErrorOutline />}
                >
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                    Warning: This action cannot be undone!
                  </Typography>
                  <Typography variant="body2">
                    Deleting this user will permanently remove their account and
                    all associated data from the system.
                  </Typography>
                </Alert>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 2 }}>
            <ProfessionalButton
              onClick={handleCancelDelete}
              variant="outlined"
              disabled={deleteLoading}
              sx={{
                borderColor: '#666',
                color: '#666',
                '&:hover': { borderColor: '#333', bgcolor: 'rgba(0,0,0,0.05)' },
              }}
            >
              Cancel
            </ProfessionalButton>
            <ProfessionalButton
              onClick={handleConfirmDelete}
              variant="contained"
              disabled={deleteLoading}
              startIcon={
                deleteLoading ? (
                  <CircularProgress size={20} />
                ) : (
                  <DeleteForever />
                )
              }
              sx={{
                bgcolor: '#d32f2f',
                color: 'white',
                '&:hover': { bgcolor: '#b71c1c' },
                '&:disabled': { bgcolor: 'rgba(211,47,47,0.5)' },
              }}
            >
              {deleteLoading ? 'Deleting...' : 'Delete User'}
            </ProfessionalButton>
          </DialogActions>
        </Dialog>

        {/* ── Snackbar ── */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity="error"
            sx={{
              width: '100%',
              backgroundColor: '#d32f2f',
              color: 'white',
              '& .MuiAlert-icon': { color: 'white' },
              '& .MuiAlert-action': { color: 'white' },
            }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default UsersList;