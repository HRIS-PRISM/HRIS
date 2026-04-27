import API_BASE_URL from '../apiConfig';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Chip,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  CircularProgress,
  Container,
  Alert,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Avatar,
  Fade,
  Backdrop,
  styled,
  alpha,
  CardHeader,
  Modal,
  Snackbar,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Remove as RemoveIcon,
  LockOpen as LockOpenIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  FileDownload as FileDownloadIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  FilterList,
  Security,
  Warning,
  Error,
  Home,
  Refresh,
  Person,
  AccessTime,
  ViewList,
  SupervisorAccount,
  AdminPanelSettings,
  Work,
  Info,
  Category,
  Assignment,
  Assessment,
  Payment,
  Description as FormIcon,
  Folder,
  FolderSpecial,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@mui/icons-material';
import { getUserInfo } from '../utils/auth';
import usePageAccess from '../hooks/usePageAccess';
import AccessDenied from './AccessDenied';
import { useSocket } from '../contexts/SocketContext';

// Get auth headers function
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
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
        const parsedSettings = JSON.parse(storedSettings);
        if (parsedSettings && typeof parsedSettings === 'object') {
          setSettings(parsedSettings);
        }
      } catch (error) {
        console.error('Error parsing stored settings:', error);
      }
    }

    const fetchSettings = async () => {
      try {
        const url = API_BASE_URL.includes('/api')
          ? `${API_BASE_URL}/system-settings`
          : `${API_BASE_URL}/api/system-settings`;

        const response = await axios.get(url, getAuthHeaders());
        if (response.data && typeof response.data === 'object') {
          setSettings(response.data);
          localStorage.setItem('systemSettings', JSON.stringify(response.data));
        }
      } catch (error) {
        console.error('Error fetching system settings:', error);
      }
    };

    fetchSettings();
  }, []);

  return settings;
};

// ─── Session durations ───────────────────────────────────────────────────────
const SESSION_DURATION_DEFAULT = 10 * 60 * 1000; // 10 minutes (admin / superadmin)
const SESSION_DURATION_TECHNICAL = 30 * 60 * 1000; // 30 minutes (technical)

const AuditLogs = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [toast, setToast] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sessionTimer, setSessionTimer] = useState(600); // will be overridden per role
  const [sessionWarningShown, setSessionWarningShown] = useState(false);
  const [sessionWarningOpen, setSessionWarningOpen] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [expandedOfficialDetails, setExpandedOfficialDetails] = useState({});
  const [resolvedEmployeeNames, setResolvedEmployeeNames] = useState({});
  const LOGS_PER_PAGE = 10;
  const logScrollRef = useRef(null);

  const LOG_LIST_HEIGHT = 500;

  const settings = useSystemSettings();
  const { socket, connected } = useSocket();

  // ── Derived: is the current user a technical role? ─────────────────────────
  const isTechnical = userRole === 'technical';

  // ── Per-role session duration (ms) ────────────────────────────────────────
  const SESSION_DURATION = isTechnical
    ? SESSION_DURATION_TECHNICAL
    : SESSION_DURATION_DEFAULT;

  //ACCESSING
  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('audit-logs');

  const canBypassPageAccess =
    userRole === 'superadmin' || userRole === 'technical';
  const canAdminAccessByPage =
    userRole === 'administrator' && hasAccess === true;
  const canAccessAuditModule = canBypassPageAccess || canAdminAccessByPage;
  // ACCESSING END

  // Memoized styled components
  const GlassCard = useMemo(
    () =>
      styled(Card)(({ theme }) => ({
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
      styled(Button)(({ theme, variant }) => ({
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
        '&:active': {
          transform: 'translateY(0)',
        },
      })),
    [settings],
  );

  const ModernTextField = useMemo(
    () =>
      styled(TextField)(({ theme }) => ({
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
            boxShadow: `0 4px 20px ${settings?.primaryColor || '#894444'}40`,
            backgroundColor: 'rgba(255, 255, 255, 1)',
          },
        },
        '& .MuiInputLabel-root': {
          fontWeight: 500,
        },
      })),
    [settings],
  );

  // Session management
  const isSessionValid = () => {
    const sessionData = sessionStorage.getItem('auditLogsSession');
    if (!sessionData) return false;

    try {
      const { timestamp, role } = JSON.parse(sessionData);
      const now = Date.now();
      const sessionAge = now - timestamp;
      // Honour whichever duration was used when the session was originally created
      const duration =
        role === 'technical'
          ? SESSION_DURATION_TECHNICAL
          : SESSION_DURATION_DEFAULT;
      return sessionAge < duration;
    } catch (error) {
      return false;
    }
  };

  const storeSession = (role) => {
    const sessionData = {
      timestamp: Date.now(),
      authenticated: true,
      role: role || 'default',
    };
    sessionStorage.setItem('auditLogsSession', JSON.stringify(sessionData));
  };

  const clearSession = () => {
    sessionStorage.removeItem('auditLogsSession');
    setIsAuthenticated(false);
    setPasswordDialogOpen(true);
  };

  // Format timer display
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get timer color based on remaining time
  const getTimerColor = (seconds) => {
    if (seconds < 120) return '#ef4444'; // Red - less than 2 mins
    if (seconds < 300) return '#f59e0b'; // Orange - less than 5 mins
    return '#10b981'; // Green - more than 5 mins
  };

  // Get current user
  useEffect(() => {
    const userInfo = getUserInfo();
    if (userInfo) {
      setCurrentUser(userInfo);
      setUserRole(userInfo.role);
    }
  }, []);

  // ── Auto-authenticate technical users; check session for everyone else ─────
  useEffect(() => {
    if (userRole === null) return; // wait until role is known

    if (userRole === 'technical') {
      // Technical users skip the password gate entirely
      if (!isAuthenticated) {
        storeSession('technical');
        setIsAuthenticated(true);
        setPasswordDialogOpen(false);
        setSessionTimer(SESSION_DURATION_TECHNICAL / 1000);
      }
      setLoading(false);
      return;
    }

    // For all other roles, check the existing session
    if (isSessionValid()) {
      setIsAuthenticated(true);
      setPasswordDialogOpen(false);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [userRole]); // eslint-disable-line react-hooks/exhaustive-deps

  // Session timer countdown
  useEffect(() => {
    if (!isAuthenticated) return;

    // Initialise the timer from the stored session so it survives page refreshes
    const sessionData = sessionStorage.getItem('auditLogsSession');
    if (sessionData) {
      try {
        const { timestamp, role } = JSON.parse(sessionData);
        const duration =
          role === 'technical'
            ? SESSION_DURATION_TECHNICAL
            : SESSION_DURATION_DEFAULT;
        const remaining = duration - (Date.now() - timestamp);
        setSessionTimer(Math.max(0, Math.floor(remaining / 1000)));
      } catch (_) {}
    }

    const interval = setInterval(() => {
      const sd = sessionStorage.getItem('auditLogsSession');
      if (!sd) {
        clearSession();
        return;
      }

      try {
        const { timestamp, role } = JSON.parse(sd);
        const duration =
          role === 'technical'
            ? SESSION_DURATION_TECHNICAL
            : SESSION_DURATION_DEFAULT;
        const remaining = duration - (Date.now() - timestamp);

        if (remaining <= 0) {
          clearSession();
          setToast({
            message: 'Session expired. Please re-authenticate.',
            type: 'error',
          });
        } else {
          const secondsRemaining = Math.floor(remaining / 1000);
          setSessionTimer(secondsRemaining);

          // Show warning when 2 minutes remaining and warning hasn't been shown yet
          if (secondsRemaining <= 120 && !sessionWarningShown) {
            setSessionWarningOpen(true);
            setSessionWarningShown(true);
          }
        }
      } catch (error) {
        clearSession();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, sessionWarningShown]);

  // Real-time: listen for new audit log entries via WebSocket
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleNewAuditLog = (newLog) => {
      setAuditLogs((prev) => {
        if (prev.some((l) => l.id === newLog.id)) return prev;
        return [newLog, ...prev];
      });
    };

    socket.on('auditLogCreated', handleNewAuditLog);
    return () => socket.off('auditLogCreated', handleNewAuditLog);
  }, [socket, isAuthenticated]);

  // Load audit logs
  const loadAuditLogs = async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/audit-logs`,
        getAuthHeaders(),
      );

      if (response.data && Array.isArray(response.data)) {
        // Avoid "double" entries: transaction_table messages are mirrored into audit_log
        // under `leave_transaction`. Those are already visible in the Transaction Logs UIs,
        // so we hide them in the Audit Logs page to keep one audit entry per action.
        setAuditLogs(
          response.data.filter(
            (log) => String(log?.table_name || '').toLowerCase() !== 'leave_transaction',
          ),
        );
      } else {
        setAuditLogs([]);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
      setAuditLogs([]);
      setToast({ message: 'Failed to load audit logs', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAuditLogs();
    }
  }, [isAuthenticated]);

  const parseAuditDetailsSafe = (raw) => {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    if (typeof raw !== 'string') return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  };

  const getActorEmployeeNumber = (log) => {
    const details = parseAuditDetailsSafe(log?.details_json);
    return details?.actor_employeeNumber || log?.employeeNumber || null;
  };

  const getTargetEmployeeNumber = (log) => {
    const details = parseAuditDetailsSafe(log?.details_json);
    const payload = details?.payload || {};
    return (
      details?.target_employeeNumber ||
      payload?.employeeNumber ||
      payload?.employee_number ||
      log?.targetEmployeeNumber ||
      null
    );
  };

  const getResolvedEmployeeName = (employeeNumber) => {
    if (!employeeNumber) return '';
    const key = String(employeeNumber);
    return resolvedEmployeeNames[key] || '';
  };

  useEffect(() => {
    if (!isAuthenticated || !Array.isArray(auditLogs) || auditLogs.length === 0) {
      return;
    }

    const employeeIds = new Set();
    auditLogs.forEach((log) => {
      const actorEmpNum = getActorEmployeeNumber(log);
      const targetEmpNum = getTargetEmployeeNumber(log);
      if (actorEmpNum) employeeIds.add(String(actorEmpNum));
      if (targetEmpNum) employeeIds.add(String(targetEmpNum));
    });

    const unresolved = [...employeeIds].filter(
      (id) => !resolvedEmployeeNames[id],
    );
    if (!unresolved.length) return;

    let cancelled = false;

    (async () => {
      const fetchedNames = {};
      await Promise.all(
        unresolved.map(async (empNum) => {
          try {
            const res = await axios.get(
              `${API_BASE_URL}/personalinfo/person_table/${empNum}`,
              getAuthHeaders(),
            );
            const firstName = res.data?.firstName || '';
            const middleName = res.data?.middleName || '';
            const lastName = res.data?.lastName || '';
            const middleInitial = middleName ? `${middleName.charAt(0)}.` : '';
            const formatted = `${lastName}, ${firstName} ${middleInitial}`
              .replace(/\s+/g, ' ')
              .trim();
            if (formatted) fetchedNames[empNum] = formatted;
          } catch (e) {
            // keep empty on failed lookup
          }
        }),
      );

      if (!cancelled && Object.keys(fetchedNames).length) {
        setResolvedEmployeeNames((prev) => ({ ...prev, ...fetchedNames }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [auditLogs, isAuthenticated]);

  useEffect(() => {
    setAuditPage(1);
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = 0;
    }
  }, [actionFilter, moduleFilter, dateFilter, employeeFilter, isAuthenticated]);

  // Filter logs
  useEffect(() => {
    let filtered = [...auditLogs];

    if (
      userRole &&
      userRole !== 'administrator' &&
      userRole !== 'superadmin' &&
      userRole !== 'technical'
    ) {
      filtered = filtered.filter(
        (log) => log.employeeNumber === currentUser?.employeeNumber,
      );
    }

    if (employeeFilter) {
      filtered = filtered.filter((log) =>
        log.employeeNumber
          ?.toLowerCase()
          .includes(employeeFilter.toLowerCase()),
      );
    }

    if (actionFilter) {
      filtered = filtered.filter(
        (log) => normalizeAction(log.action) === actionFilter,
      );
    }

    if (moduleFilter) {
      filtered = filtered.filter(
        (log) => log.table_name?.toLowerCase() === moduleFilter.toLowerCase(),
      );
    }

    if (dateFilter) {
      filtered = filtered.filter((log) => {
        if (!log.timestamp) return false;
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];
        return logDate === dateFilter;
      });
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp || 0);
      const dateB = new Date(b.timestamp || 0);
      return dateB - dateA;
    });

    setFilteredLogs(filtered);
  }, [
    actionFilter,
    moduleFilter,
    dateFilter,
    employeeFilter,
    auditLogs,
    userRole,
    currentUser,
  ]);

  // Reset to page 1 whenever filteredLogs change
  useEffect(() => {
    setAuditPage(1);
  }, [filteredLogs.length]);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Handle password submit - verify confidential password
  const handlePasswordSubmit = async () => {
    if (!passwordInput) {
      setPasswordError('Please enter an authorized password.');
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/confidential-password/verify`,
        { password: passwordInput },
        getAuthHeaders(),
      );

      if (response.data.verified) {
        setPasswordError('');
        setPasswordDialogOpen(false);
        setIsAuthenticated(true);
        storeSession(userRole);
        setToast();
        setPasswordInput('');
      } else {
        setPasswordError('Incorrect password. Please try again.');
        setPasswordInput('');
      }
    } catch (error) {
      console.error('Error verifying authorized password:', error);
      setPasswordError(
        error.response?.data?.error ||
          'Failed to verify password. Please try again.',
      );
      setPasswordInput('');
    }
  };

  const handleCloseDialog = () => {
    setPasswordDialogOpen(false);
    navigate(-1);
  };

  // Handle session warning close
  const handleSessionWarningClose = () => {
    setSessionWarningOpen(false);
  };

  // ENHANCED: Get action color with distinct colors for each action type
  const getActionColor = (action) => {
    if (!action) return '#10b981';
    const a = action.toUpperCase();
    if (['DELETE', 'REMOVE', 'DESTROY'].some((k) => a.includes(k)))
      return '#ef4444';
    if (['RESTORE', 'REVERS'].some((k) => a.includes(k))) return '#ec4899';
    if (['DEDUCT', 'TARDINESS'].some((k) => a.includes(k))) return '#f97316';
    if (a.includes('ASSIGN')) return '#6366f1';
    if (a.includes('TEVL')) return '#f59e0b';
    if (a.includes('VL BALANCE')) return '#0d9488';
    if (['UPDATE', 'EDIT', 'MODIFY', 'CHANGE'].some((k) => a.includes(k)))
      return '#3b82f6';
    if (['VIEW', 'OPEN', 'READ'].some((k) => a.includes(k))) return '#06b6d4';
    if (a.includes('LOGOUT')) return '#7c3aed';
    if (a.includes('LOGIN')) return '#8b5cf6';
    return '#10b981';
  };

  // ENHANCED: Get action icon for each action type
  const getActionIcon = (action) => {
    if (!action) return <AddIcon sx={{ fontSize: 16 }} />;
    const a = action.toUpperCase();
    if (['DELETE', 'REMOVE', 'DESTROY'].some((k) => a.includes(k)))
      return <DeleteIcon sx={{ fontSize: 16 }} />;
    if (['RESTORE', 'REVERS'].some((k) => a.includes(k)))
      return <RefreshIcon sx={{ fontSize: 16 }} />;
    if (['DEDUCT', 'TARDINESS'].some((k) => a.includes(k)))
      return <RemoveIcon sx={{ fontSize: 16 }} />;
    if (a.includes('ASSIGN')) return <Assignment sx={{ fontSize: 16 }} />;
    if (a.includes('TEVL')) return <AddIcon sx={{ fontSize: 16 }} />;
    if (a.includes('VL BALANCE')) return <Assessment sx={{ fontSize: 16 }} />;
    if (['UPDATE', 'EDIT', 'MODIFY', 'CHANGE'].some((k) => a.includes(k)))
      return <EditIcon sx={{ fontSize: 16 }} />;
    if (['VIEW', 'OPEN', 'READ'].some((k) => a.includes(k)))
      return <VisibilityIcon sx={{ fontSize: 16 }} />;
    if (a.includes('LOGOUT')) return <LockIcon sx={{ fontSize: 16 }} />;
    if (a.includes('LOGIN')) return <LockOpenIcon sx={{ fontSize: 16 }} />;
    return <AddIcon sx={{ fontSize: 16 }} />;
  };

  // Format audit log entry with color-coded action
  const formatAuditLog = (log) => {
    if (log.table_name === 'leave_transaction' || log._isTransaction) {
      const ts = log.timestamp ? new Date(log.timestamp) : null;
      const formattedTime =
        ts && !isNaN(ts)
          ? `${ts.toLocaleDateString()} ${ts.toLocaleTimeString()}`
          : 'No Date';
      const safeMessage = (log.action || log.message || 'No message')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `[${formattedTime}] - <strong>Employee ${log.employeeNumber || 'Unknown'}</strong>: ${safeMessage}`;
    }

    const timestamp = new Date(log.timestamp);
    const formattedTime = `${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`;
    const employeeNumber = log.employeeNumber || 'Unknown';
    const action = log.action?.toUpperCase() || 'UNKNOWN';
    const actionColor = getActionColor(log.action);
    const module = log.table_name?.toUpperCase() || 'UNKNOWN';
    const recordId = log.record_id ? ` #${log.record_id}` : '';
    const targetEmployee = log.targetEmployeeNumber
      ? ` (Target: ${log.targetEmployeeNumber})`
      : '';

    let logString = `[${formattedTime}] - `;
    logString += `<strong>Employee ${employeeNumber}</strong> `;
    logString += `performed <strong style="color: ${actionColor};">${action}</strong> `;
    logString += `on <strong>${module}${recordId}</strong>${targetEmployee}.`;

    return logString;
  };

  // Export audit log
  const handleExportLog = () => {
    let csv =
      'Timestamp,Employee Number,Action,Table Name,Record ID,Target Employee\n';

    filteredLogs.forEach((log) => {
      const timestamp = new Date(
        log.timestamp || log.created_at,
      ).toLocaleString();
      csv += `"${timestamp}","${log.employeeNumber || 'Unknown'}","${
        log.action || 'N/A'
      }","${log.table_name || 'N/A'}","${log.record_id || 'N/A'}","${
        log.targetEmployeeNumber || 'N/A'
      }"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    setToast({});
  };

  // Refresh logs
  const handleRefresh = () => {
    setRefreshing(true);
    loadAuditLogs();
    setToast({});
  };

  // Store first the action needed to normalize
  const ACTION_MAP = {
    DELETED: ['DELETE', 'REMOVE', 'DESTROY'],
    REVERSED: ['RESTORE', 'REVERS'],
    DEDUCTED: ['DEDUCT', 'TARDINESS'],
    'ASSIGNED LEAVE': ['ASSIGN'],
    TEVL: ['TEVL'],
    'VL BALANCE': ['VL BALANCE'],
    UPDATE: ['UPDATE', 'EDIT', 'MODIFY', 'CHANGE'],
    VIEW: ['VIEW', 'OPEN', 'READ'],
    CREATE: ['ADD', 'INSERT', 'CREATE', 'REGISTER'],
  };

  // Normalize first the action before putting on map
  const normalizeAction = (action) => {
    if (typeof action !== 'string') return null;
    const normalized = action.trim().toUpperCase();
    if (!normalized) return null;

    for (const [mainAction, keywords] of Object.entries(ACTION_MAP)) {
      if (keywords.some((keyword) => normalized.includes(keyword))) {
        return mainAction;
      }
    }

    return null;
  };

  // Get unique actions for filter
  const getUniqueActions = () => {
    return [
      ...new Set(
        auditLogs.map((log) => normalizeAction(log.action)).filter(Boolean),
      ),
    ].sort();
  };

  // Get unique modules for filter
  const getUniqueModules = () => {
    const modules = [
      ...new Set(auditLogs.map((log) => log.table_name).filter(Boolean)),
    ];
    return modules.sort();
  };

  // Format module name
  const formatModuleName = (tableName) => {
    if (!tableName) return '';
    return tableName.toUpperCase().replace(/[\s\-]+/g, '_');
  };

  const toSimpleName = (name) => {
    const raw = String(name || '').trim();
    if (!raw) return '';
    if (raw.includes(',')) {
      const [last, rest] = raw.split(',');
      const firstToken = (rest || '').trim().split(/\s+/).filter(Boolean)[0] || '';
      const lastToken = (last || '').trim();
      return `${firstToken} ${lastToken}`.trim();
    }
    return raw;
  };

  const getLeaveTypeLabel = (code) => {
    const c = String(code || '').trim().toUpperCase();
    if (!c) return '';
    const map = {
      VL: 'Vacation Leave',
      SL: 'Sick Leave',
      SPL: 'Special Privilege Leave',
      ML: 'Maternity Leave',
      PL: 'Paternity Leave',
      FL: 'Force Leave',
    };
    return map[c] || c;
  };

  const parseEarningsTxMessage = (message) => {
    const raw = String(message || '').trim();
    if (!raw) return null;
    const rx =
      /^(.*?)\s+(created|approved|rejected|deleted)\s+(leave earnings|service credit earnings|CTO earnings)(?:\s+\(([-\d.]+)\s*hrs\))?(?:\s+\[([^\]]+)\])?(?:\s+for\s+(\d{4}-\d{2}))?\s+for\s+(.*?)$/i;
    const m = raw.match(rx);
    if (!m) return null;
    return {
      actorRaw: m[1]?.trim() || '',
      action: (m[2] || '').toLowerCase(),
      earningType: (m[3] || '').toLowerCase(),
      hours: m[4] != null ? Number(m[4]) : null,
      leaveCode: m[5] ? String(m[5]).toUpperCase() : '',
      period: m[6] || '',
      targetRaw: m[7]?.trim() || '',
    };
  };

  const getEarningsDisplayMeta = (log) => {
    const details = parseAuditDetailsSafe(log?.details_json) || {};
    const payload = details?.payload || {};
    const txParsed =
      String(log?.table_name || '').toLowerCase() === 'leave_transaction'
        ? parseEarningsTxMessage(log?.action || log?.message || '')
        : null;

    const actorEmp = getActorEmployeeNumber(log) || 'unknown';
    const targetEmp = getTargetEmployeeNumber(log) || 'unknown';
    const actorResolved = getResolvedEmployeeName(actorEmp);
    const targetResolved = getResolvedEmployeeName(targetEmp);

    const actorNameFromTx = txParsed?.actorRaw
      ? txParsed.actorRaw.replace(/\(\s*\d+\s*\)\s*$/i, '').trim()
      : '';
    const targetNameFromTx = txParsed?.targetRaw
      ? txParsed.targetRaw.replace(/\(\s*\d+\s*\)\s*$/i, '').trim()
      : '';

    const actorName = toSimpleName(actorResolved || actorNameFromTx);
    const targetName = toSimpleName(targetResolved || targetNameFromTx);

    const action = txParsed?.action || String(log?.action || '').toLowerCase().split(' ')[0] || 'updated';
    const earningTypeRaw =
      txParsed?.earningType ||
      (String(log?.table_name || '').toLowerCase().startsWith('earnings_')
        ? `${String(log.table_name).replace(/^earnings_/i, '')} earnings`
        : 'earnings');
    const earningType = earningTypeRaw.toLowerCase();

    const leaveCode = (
      txParsed?.leaveCode ||
      payload?.leave_code ||
      ''
    )
      .toString()
      .toUpperCase();

    const periodRaw =
      txParsed?.period ||
      (payload?.period_year && payload?.period_month
        ? `${payload.period_year}-${String(payload.period_month).padStart(2, '0')}`
        : '');

    const hoursRaw =
      txParsed?.hours ??
      payload?.earned_hours ??
      payload?.earnedHrs ??
      null;
    const hours = Number(hoursRaw);

    return {
      action,
      earningType,
      leaveCode,
      period: periodRaw,
      hours: Number.isFinite(hours) ? hours : null,
      actorName,
      targetName,
      actorEmp,
      targetEmp,
    };
  };

  const buildActionBadgeLabel = (log) => {
    const table = String(log?.table_name || '').toLowerCase();
    const isEarningsLike =
      table.startsWith('earnings_') ||
      (table === 'leave_transaction' &&
        /(?:leave|service credit|cto)\s+earnings/i.test(
          String(log?.action || log?.message || ''),
        ));
    if (!isEarningsLike) return log.action?.toUpperCase() || 'UNKNOWN';

    const meta = getEarningsDisplayMeta(log);
    const typeUpper = meta.earningType
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
    const codePart = meta.leaveCode ? ` (${meta.leaveCode})` : '';
    return `${meta.action.toUpperCase()} ${typeUpper.toUpperCase()}${codePart}`;
  };

  // Build a clean readable sentence for each audit log entry
  const buildLogDescription = (log) => {
    const tableNameLower = String(log?.table_name || '').toLowerCase();
    const isEarningsModule = tableNameLower.startsWith('earnings_');
    const isEarningsTransaction =
      tableNameLower === 'leave_transaction' &&
      /(?:leave|service credit|cto)\s+earnings/i.test(
        String(log?.action || log?.message || ''),
      );

    if (isEarningsModule || isEarningsTransaction) {
      const meta = getEarningsDisplayMeta(log);
      const hoursText =
        meta.hours !== null ? ` total of ${meta.hours} hours ` : ' ';
      const periodText = meta.period ? ` for ${meta.period}` : '';

      if (meta.earningType.includes('leave earnings') && meta.leaveCode) {
        const leaveLabel = getLeaveTypeLabel(meta.leaveCode);
        return `${meta.actorName || `Employee #${meta.actorEmp}`} ${meta.action} an earning${hoursText}for ${leaveLabel} (${meta.leaveCode})${periodText} for ${meta.targetName || `employee #${meta.targetEmp}`}.`;
      }

      const typeLabel = meta.earningType
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
      return `${meta.actorName || `Employee #${meta.actorEmp}`} ${meta.action} ${typeLabel}${hoursText}${periodText} for ${meta.targetName || `employee #${meta.targetEmp}`}.`;
    }

    // Leave balance adjustments (show before/after balance)
    const tableLower = String(log?.table_name || '').toLowerCase();
    const actionLower = String(log?.action || '').toLowerCase();
    if (tableLower === 'leave_assignment' && actionLower.includes('auto-adjust leave balance')) {
      const actorEmpNum = getActorEmployeeNumber(log);
      const targetEmpNum = getTargetEmployeeNumber(log);
      const actorName = getResolvedEmployeeName(actorEmpNum);
      const targetName = getResolvedEmployeeName(targetEmpNum);

      const details = parseAuditDetailsSafe(log?.details_json) || {};
      const beforeRem = Number(details?.before?.remaining_hours);
      const afterRem = Number(details?.after?.remaining_hours);
      const beforeUsed = Number(details?.before?.used_hours);
      const afterUsed = Number(details?.after?.used_hours);
      const leaveCode = String(details?.leave_code || '').toUpperCase();

      const fmt = (n) => (Number.isFinite(n) ? n.toFixed(3) : '—');
      const fmtDays = (n) =>
        Number.isFinite(n) ? (n / 8).toFixed(3) : '—';

      const who = actorEmpNum
        ? `${actorName ? `${actorName} ` : ''}(#${actorEmpNum})`
        : 'Unknown user';
      const target = targetEmpNum
        ? `${targetName ? `${targetName} ` : ''}employee #${targetEmpNum}`
        : 'employee';

      const remLine = `Remaining${leaveCode ? ` [${leaveCode}]` : ''}: ${fmt(beforeRem)} → ${fmt(afterRem)} hrs (${fmtDays(beforeRem)} → ${fmtDays(afterRem)} day(s))`;
      const usedLine = `Used: ${fmt(beforeUsed)} → ${fmt(afterUsed)} hrs`;

      return `${who} adjusted ${target}'s leave balance. ${remLine}. ${usedLine}.`;
    }

    if (isEarningsModule) {
      // fallback kept for safety; branch above handles earnings
      return 'Earnings activity logged.';
    }

    const actorEmpNum = getActorEmployeeNumber(log);
    const targetEmpNum = getTargetEmployeeNumber(log);
    const actorName = getResolvedEmployeeName(actorEmpNum);
    const targetName = getResolvedEmployeeName(targetEmpNum);
    const actor = actorEmpNum
      ? `${actorName ? `${actorName} ` : ''}(#${actorEmpNum})`
      : 'Unknown user';
    const action = log.action?.toLowerCase() || 'performed an action';
    const module = log.table_name
      ? formatModuleName(log.table_name)
      : 'the system';
    const targetHint = targetEmpNum
      ? ` on ${targetName ? `${targetName} ` : ''}employee #${targetEmpNum}`
      : '';
    return `${actor} performed ${action} on ${module}${targetHint}.`;
  };

  const isOfficialTimeModule = (tableName) => {
    const t = String(tableName || '').toLowerCase();
    return (
      t.includes('official time') ||
      t.includes('official_time') ||
      t.includes('officialtime')
    );
  };

  const parseAuditDetails = (raw) => {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    if (typeof raw !== 'string') return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  };

  const getOfficialTimeAuditSnapshot = (log) => {
    if (!isOfficialTimeModule(log?.table_name)) return null;
    const details = parseAuditDetails(log?.details_json);
    if (!details || typeof details !== 'object') return null;

    if (Array.isArray(details.records) && details.records.length > 0) {
      return details;
    }

    if (Array.isArray(details.schedules) && details.schedules.length > 0) {
      const flattenedRecords = details.schedules.flatMap((schedule) => {
        const list = Array.isArray(schedule?.records) ? schedule.records : [];
        return list.map((r) => ({
          ...r,
          employeeID:
            r?.employeeID ||
            schedule?.employeeID ||
            details?.employeeID ||
            null,
          startDate: r?.startDate || schedule?.startDate || details?.startDate,
          endDate: r?.endDate || schedule?.endDate || details?.endDate,
          academicYear:
            r?.academicYear || schedule?.academicYear || details?.academicYear,
        }));
      });
      if (flattenedRecords.length > 0) {
        return { ...details, records: flattenedRecords };
      }
    }

    return null;
  };

  const toggleOfficialDetails = (rowKey) => {
    setExpandedOfficialDetails((prev) => ({
      ...prev,
      [rowKey]: !prev[rowKey],
    }));
  };

  const totalPages = Math.max(
    1,
    Math.ceil(filteredLogs.length / LOGS_PER_PAGE),
  );
  const pagedLogs = filteredLogs.slice(
    (auditPage - 1) * LOGS_PER_PAGE,
    auditPage * LOGS_PER_PAGE,
  );

  const virtualizationRange = { startIndex: 0, endIndex: -1 };
  const visibleLogs = pagedLogs;
  const topSpacerHeight = 0;
  const bottomSpacerHeight = 0;

  // ACCESSING 2
  if (accessLoading || userRole === null) {
    // Shimmer keyframe injected once via a <style> tag
    const shimmerCSS = `
      @keyframes auditShimmer {
        0%   { background-position: -800px 0; }
        100% { background-position:  800px 0; }
      }
    `;

    const shimmerBg = {
      background:
        'linear-gradient(90deg, #f0e6e6 25%, #faf0f0 50%, #f0e6e6 75%)',
      backgroundSize: '800px 100%',
      animation: 'auditShimmer 1.6s infinite linear',
      borderRadius: 2,
    };

    // Reusable shimmer bar
    const ShimmerBar = ({ width = '100%', height = 14, sx = {} }) => (
      <Box sx={{ width, height, ...shimmerBg, ...sx }} />
    );

    // A single fake log-row skeleton
    const SkeletonRow = ({ delay = 0 }) => (
      <Box
        sx={{
          bgcolor: '#fff',
          border: '1px solid #f3e8e8',
          borderLeft: '4px solid #e8d0d0',
          borderRadius: 2,
          p: 2.5,
          mb: 1.5,
          opacity: 0,
          animation: `fadeInRow 0.4s ease forwards`,
          animationDelay: `${delay}s`,
          '@keyframes fadeInRow': {
            from: { opacity: 0, transform: 'translateY(6px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        {/* Row 1: action badge + timestamp */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            mb: 1.5,
            alignItems: 'center',
          }}
        >
          <ShimmerBar width={90} height={22} sx={{ borderRadius: '6px' }} />
          <ShimmerBar width={140} height={12} sx={{ borderRadius: 1 }} />
        </Box>
        {/* Row 2: actor chip */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
          <ShimmerBar width={160} height={38} sx={{ borderRadius: '8px' }} />
        </Box>
        {/* Row 3: description line */}
        <ShimmerBar width="85%" height={13} sx={{ mb: 0.75 }} />
        <ShimmerBar width="55%" height={13} />
      </Box>
    );

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
        <style>{shimmerCSS}</style>
        <Box sx={{ px: 6, mx: 'auto', maxWidth: '1600px' }}>
          {/* ── Header card skeleton ── */}
          <Box
            sx={{
              borderRadius: '20px',
              border: '1px solid #f0e0e0',
              overflow: 'hidden',
              mb: 4,
              boxShadow: '0 8px 40px #89444414',
            }}
          >
            <Box
              sx={{
                p: 5,
                bgcolor: '#fef9f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                {/* Avatar circle */}
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    ...shimmerBg,
                    flexShrink: 0,
                  }}
                />
                <Box>
                  <ShimmerBar
                    width={220}
                    height={22}
                    sx={{ mb: 1.5, borderRadius: 2 }}
                  />
                  <ShimmerBar
                    width={320}
                    height={13}
                    sx={{ borderRadius: 1 }}
                  />
                </Box>
              </Box>
              {/* Right chips + buttons */}
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <ShimmerBar
                  width={72}
                  height={28}
                  sx={{ borderRadius: '14px' }}
                />
                <ShimmerBar
                  width={72}
                  height={28}
                  sx={{ borderRadius: '14px' }}
                />
                <ShimmerBar
                  width={48}
                  height={48}
                  sx={{ borderRadius: '12px' }}
                />
                <ShimmerBar
                  width={100}
                  height={44}
                  sx={{ borderRadius: '12px' }}
                />
              </Box>
            </Box>
          </Box>

          {/* ── Filter card skeleton ── */}
          <Box
            sx={{
              borderRadius: '20px',
              border: '1px solid #f0e0e0',
              overflow: 'hidden',
              mb: 4,
              boxShadow: '0 8px 40px #89444414',
            }}
          >
            {/* Card header */}
            <Box
              sx={{
                px: 4,
                py: 3,
                bgcolor: '#fdf5f5',
                borderBottom: '1px solid #f5e8e8',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  ...shimmerBg,
                  flexShrink: 0,
                }}
              />
              <Box>
                <ShimmerBar
                  width={160}
                  height={18}
                  sx={{ mb: 1, borderRadius: 2 }}
                />
                <ShimmerBar width={260} height={12} sx={{ borderRadius: 1 }} />
              </Box>
            </Box>
            {/* 4-column filter row */}
            <Box
              sx={{
                p: 4,
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 3,
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <ShimmerBar
                  key={i}
                  width="100%"
                  height={56}
                  sx={{ borderRadius: '12px' }}
                />
              ))}
            </Box>
          </Box>

          {/* ── Log list card skeleton ── */}
          <Box
            sx={{
              borderRadius: '20px',
              border: '1px solid #f0e0e0',
              overflow: 'hidden',
              boxShadow: '0 8px 40px #89444414',
            }}
          >
            {/* List header */}
            <Box
              sx={{
                px: 4,
                py: 3,
                bgcolor: '#fdf5f5',
                borderBottom: '1px solid #f5e8e8',
              }}
            >
              <ShimmerBar
                width={200}
                height={18}
                sx={{ mb: 1, borderRadius: 2 }}
              />
              <ShimmerBar width={280} height={12} sx={{ borderRadius: 1 }} />
            </Box>

            {/* Skeleton rows */}
            <Box sx={{ p: 3 }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <SkeletonRow key={i} delay={i * 0.07} />
              ))}
            </Box>

            {/* Footer pagination */}
            <Box
              sx={{
                px: 3,
                py: 2,
                borderTop: '1px solid #f0e0e0',
                bgcolor: '#fdf9f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <ShimmerBar width={200} height={14} sx={{ borderRadius: 1 }} />
              <Box sx={{ display: 'flex', gap: 0.75 }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <ShimmerBar
                    key={i}
                    width={30}
                    height={30}
                    sx={{ borderRadius: '8px' }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }
  if (userRole && !accessLoading && !canAccessAuditModule) {
    return (
      <AccessDenied
        title="Access Denied"
        message="Only superadmin and technical roles can open this page by default. Administrator access requires explicit page access permission."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }
  //ACCESSING END2

  // Show password dialog ONLY for non-technical unauthenticated users
  if (!isAuthenticated && !isTechnical) {
    return (
      <Modal
        open={passwordDialogOpen}
        onClose={handleCloseDialog}
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
            border: `2px solid ${settings?.primaryColor || '#894444'}`,
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 3,
              bgcolor: 'white',
              borderBottom: `3px solid ${settings?.primaryColor || '#894444'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Avatar
              sx={{
                bgcolor: alpha(settings?.primaryColor || '#894444', 0.1),
                color: settings?.primaryColor || '#894444',
                width: 56,
                height: 56,
              }}
            >
              <LockIcon sx={{ fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 'bold', color: '#333' }}
              >
                Audit Logs Access
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                This module requires authorization
              </Typography>
            </Box>
          </Box>

          {/* Content */}
          <Box sx={{ p: 4, bgcolor: 'white' }}>
            <Alert
              severity="info"
              icon={<Security />}
              sx={{
                mb: 3,
                borderRadius: 2,
                bgcolor: alpha(settings?.primaryColor || '#894444', 0.05),
                border: `1px solid ${alpha(settings?.primaryColor || '#894444', 0.2)}`,
                '& .MuiAlert-icon': {
                  color: settings?.primaryColor || '#894444',
                  fontSize: 28,
                },
              }}
            >
              <Typography
                variant="body1"
                sx={{ fontWeight: 600, mb: 2, color: '#333' }}
              >
                Access Control Notice
              </Typography>
              <Box sx={{ pl: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#666',
                    mb: 1,
                    display: 'flex',
                    alignItems: 'flex-start',
                  }}
                >
                  <Box
                    component="span"
                    sx={{ mr: 1, color: settings?.primaryColor || '#894444' }}
                  >
                    •
                  </Box>
                  <Box>
                    Access to this module is restricted to authorized personnel
                    only
                  </Box>
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#666',
                    mb: 1,
                    display: 'flex',
                    alignItems: 'flex-start',
                  }}
                >
                  <Box
                    component="span"
                    sx={{ mr: 1, color: settings?.primaryColor || '#894444' }}
                  >
                    •
                  </Box>
                  <Box>
                    For security compliance, sessions are limited to 10 minutes
                  </Box>
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#666',
                    display: 'flex',
                    alignItems: 'flex-start',
                  }}
                >
                  <Box
                    component="span"
                    sx={{ mr: 1, color: settings?.primaryColor || '#894444' }}
                  >
                    •
                  </Box>
                  <Box>
                    Re-authentication will be required upon session expiration
                  </Box>
                </Typography>
              </Box>
            </Alert>

            <TextField
              autoFocus
              margin="dense"
              label="Enter Authorized Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              variant="outlined"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setPasswordError('');
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handlePasswordSubmit();
                }
              }}
              error={!!passwordError}
              helperText={passwordError}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />

            {/* Action Buttons */}
            <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
              <Button
                onClick={handleCloseDialog}
                variant="outlined"
                sx={{
                  color: settings?.primaryColor || '#894444',
                  borderColor: settings?.primaryColor || '#894444',
                  px: 3,
                  py: 1.2,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 2,
                  '&:hover': {
                    borderColor: settings?.secondaryColor || '#6d2323',
                    backgroundColor: alpha(
                      settings?.primaryColor || '#894444',
                      0.08,
                    ),
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePasswordSubmit}
                variant="contained"
                sx={{
                  backgroundColor: settings?.primaryColor || '#894444',
                  color: 'white',
                  px: 4,
                  py: 1.2,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 2,
                  minWidth: 140,
                  '&:hover': {
                    backgroundColor: settings?.secondaryColor || '#6d2323',
                  },
                }}
                startIcon={<LockIcon />}
              >
                Access
              </Button>
            </Box>
          </Box>
        </Box>
      </Modal>
    );
  }

  const isAdmin =
    userRole === 'administrator' || canBypassPageAccess;
  const pageTitle = isAdmin ? 'Audit Trail (All Users)' : 'My Activity Log';

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
        {/* Header */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }}>
            <GlassCard>
              <Box
                sx={{
                  p: 5,
                  background: `linear-gradient(135deg, ${
                    settings?.accentColor || '#FEF9E1'
                  } 0%, ${alpha(
                    settings?.accentColor || '#FEF9E1',
                    0.9,
                  )} 100%)`,
                  color: settings?.primaryColor || '#894444',
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
                      settings?.primaryColor || '#894444',
                      0.1,
                    )} 0%, ${alpha(
                      settings?.primaryColor || '#894444',
                      0,
                    )} 70%)`,
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
                      settings?.primaryColor || '#894444',
                      0.08,
                    )} 0%, ${alpha(
                      settings?.primaryColor || '#894444',
                      0,
                    )} 70%)`,
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
                        bgcolor: alpha(
                          settings?.primaryColor || '#894444',
                          0.15,
                        ),
                        mr: 4,
                        width: 64,
                        height: 64,
                        boxShadow: `0 8px 24px ${alpha(
                          settings?.primaryColor || '#894444',
                          0.15,
                        )}`,
                      }}
                    >
                      <Security
                        sx={{
                          fontSize: 32,
                          color: settings?.primaryColor || '#894444',
                        }}
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
                          color: settings?.primaryColor || '#894444',
                        }}
                      >
                        {pageTitle}
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          opacity: 0.8,
                          fontWeight: 400,
                          color: settings?.textPrimaryColor || '#6D2323',
                        }}
                      >
                        {isAdmin
                          ? 'System-wide activity tracking and security monitoring'
                          : 'Your personal activity history and access logs'}
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip
                      label={`${filteredLogs.length} Logs`}
                      size="small"
                      sx={{
                        bgcolor: alpha(
                          settings?.primaryColor || '#894444',
                          0.15,
                        ),
                        color: settings?.primaryColor || '#894444',
                        fontWeight: 500,
                        '& .MuiChip-label': { px: 1 },
                      }}
                    />

                    {/* Session Timer — shown for all roles; label clarifies the duration */}
                    <Tooltip
                      title={
                        <Box>
                          <Typography variant="body2">
                            Session expires in {formatTimer(sessionTimer)}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ display: 'block', mt: 0.5 }}
                          >
                            {isTechnical
                              ? 'Technical accounts have a 30-minute session'
                              : 'For security purposes, access to audit logs is limited to 10-minute sessions'}
                          </Typography>
                        </Box>
                      }
                      placement="bottom"
                      arrow
                    >
                      <Chip
                        icon={<LockIcon sx={{ fontSize: 16 }} />}
                        label={formatTimer(sessionTimer)}
                        size="small"
                        sx={{
                          bgcolor: alpha(getTimerColor(sessionTimer), 0.15),
                          color: getTimerColor(sessionTimer),
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          border: `2px solid ${alpha(getTimerColor(sessionTimer), 0.3)}`,
                          '& .MuiChip-label': { px: 1.5 },
                          '& .MuiChip-icon': {
                            color: getTimerColor(sessionTimer),
                            animation:
                              sessionTimer < 120 ? 'pulse 1s infinite' : 'none',
                          },
                          '@keyframes pulse': {
                            '0%, 100%': { opacity: 1 },
                            '50%': { opacity: 0.5 },
                          },
                          cursor: 'pointer',
                        }}
                      />
                    </Tooltip>

                    <Tooltip title="Refresh Logs">
                      <IconButton
                        onClick={handleRefresh}
                        disabled={loading}
                        sx={{
                          bgcolor: alpha(
                            settings?.primaryColor || '#894444',
                            0.1,
                          ),
                          '&:hover': {
                            bgcolor: alpha(
                              settings?.primaryColor || '#894444',
                              0.2,
                            ),
                          },
                          color: settings?.primaryColor || '#894444',
                          width: 48,
                          height: 48,
                          '&:disabled': {
                            bgcolor: alpha(
                              settings?.primaryColor || '#894444',
                              0.05,
                            ),
                            color: alpha(
                              settings?.primaryColor || '#894444',
                              0.3,
                            ),
                          },
                        }}
                      >
                        {loading ? (
                          <CircularProgress
                            size={24}
                            sx={{ color: settings?.primaryColor || '#894444' }}
                          />
                        ) : (
                          <RefreshIcon />
                        )}
                      </IconButton>
                    </Tooltip>

                    {isAdmin && (
                      <ProfessionalButton
                        variant="contained"
                        startIcon={<FileDownloadIcon />}
                        onClick={handleExportLog}
                        sx={{
                          bgcolor: settings?.primaryColor || '#894444',
                          color: settings?.accentColor || '#FEF9E1',
                          '&:hover': {
                            bgcolor: settings?.secondaryColor || '#6d2323',
                          },
                        }}
                      >
                        Export
                      </ProfessionalButton>
                    )}
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {/* Toast Messages */}
        {toast && toast.type === 'success' && (
          <Backdrop
            open={true}
            sx={{
              zIndex: 9999,
              backdropFilter: 'blur(8px)',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}
            onClick={() => setToast(null)}
          >
            <Fade in timeout={300}>
              <Box
                onClick={(e) => e.stopPropagation()}
                sx={{
                  position: 'relative',
                  minWidth: '400px',
                  maxWidth: '600px',
                }}
              >
                <Alert
                  severity="success"
                  sx={{
                    borderRadius: 4,
                    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.4)',
                    fontSize: '1.1rem',
                    p: 3,
                    '& .MuiAlert-message': { fontWeight: 500 },
                    '& .MuiAlert-icon': { fontSize: '2rem' },
                  }}
                  icon={<CheckCircleIcon />}
                  onClose={() => setToast(null)}
                >
                  {toast.message}
                </Alert>
              </Box>
            </Fade>
          </Backdrop>
        )}
        {toast && toast.type === 'error' && (
          <Backdrop
            open={true}
            sx={{
              zIndex: 9999,
              backdropFilter: 'blur(8px)',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}
            onClick={() => setToast(null)}
          >
            <Fade in timeout={300}>
              <Box
                onClick={(e) => e.stopPropagation()}
                sx={{
                  position: 'relative',
                  minWidth: '400px',
                  maxWidth: '600px',
                }}
              >
                <Alert
                  severity="error"
                  sx={{
                    borderRadius: 4,
                    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.4)',
                    fontSize: '1.1rem',
                    p: 3,
                    '& .MuiAlert-message': { fontWeight: 500 },
                    '& .MuiAlert-icon': { fontSize: '2rem' },
                  }}
                  icon={<Error />}
                  onClose={() => setToast(null)}
                >
                  {toast.message}
                </Alert>
              </Box>
            </Fade>
          </Backdrop>
        )}

        {/* Search & Filter */}
        <Fade in timeout={700}>
          <GlassCard sx={{ mb: 4 }}>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: alpha(settings?.accentColor || '#FEF9E1', 0.8),
                      color: settings?.textPrimaryColor || '#6D2323',
                    }}
                  >
                    <FilterList />
                  </Avatar>
                  <Box>
                    <Typography
                      variant="h5"
                      component="div"
                      sx={{
                        fontWeight: 600,
                        color: settings?.textPrimaryColor || '#6D2323',
                      }}
                    >
                      Search & Filter
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ color: settings?.textPrimaryColor || '#6D2323' }}
                    >
                      Find and filter audit logs by various criteria
                    </Typography>
                  </Box>
                </Box>
              }
              sx={{
                bgcolor: alpha(settings?.accentColor || '#FEF9E1', 0.5),
                pb: 2,
                borderBottom: `1px solid ${alpha(
                  settings?.primaryColor || '#894444',
                  0.1,
                )}`,
              }}
            />
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <ModernTextField
                    fullWidth
                    label="Search Employee Number"
                    placeholder="e.g. 2024-001"
                    value={employeeFilter}
                    onChange={(e) => setEmployeeFilter(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon
                            sx={{
                              color: settings?.primaryColor || '#894444',
                              fontSize: 20,
                            }}
                          />
                        </InputAdornment>
                      ),
                      endAdornment: employeeFilter ? (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setEmployeeFilter('')}
                          >
                            <CloseIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <ModernTextField
                    select
                    fullWidth
                    label="All Actions"
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                  >
                    <MenuItem value="">All Actions</MenuItem>
                    {getUniqueActions().map((action) => (
                      <MenuItem key={action} value={action}>
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          {getActionIcon(action)}
                          <span
                            style={{
                              color: getActionColor(action),
                              fontWeight: 600,
                            }}
                          >
                            {action}
                          </span>
                        </Box>
                      </MenuItem>
                    ))}
                  </ModernTextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <ModernTextField
                    select
                    fullWidth
                    label="All Modules"
                    value={moduleFilter}
                    onChange={(e) => setModuleFilter(e.target.value)}
                  >
                    <MenuItem value="">All Modules</MenuItem>
                    {getUniqueModules().map((module) => (
                      <MenuItem key={module} value={module}>
                        {formatModuleName(module)}
                      </MenuItem>
                    ))}
                  </ModernTextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <ModernTextField
                    type="date"
                    fullWidth
                    label="Filter by Date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </GlassCard>
        </Fade>

        {/* Loading Backdrop */}
        <Backdrop
          sx={{
            color: settings?.accentColor || '#FEF9E1',
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
          open={loading && !refreshing}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress color="inherit" size={60} thickness={4} />
            <Typography
              variant="h6"
              sx={{ mt: 2, color: settings?.accentColor || '#FEF9E1' }}
            >
              Loading audit logs...
            </Typography>
          </Box>
        </Backdrop>

        {/* Audit Log Entries */}
        {!loading && (
          <Fade in timeout={900}>
            <GlassCard>
              <Box
                sx={{
                  p: 3,
                  background: `linear-gradient(135deg, ${
                    settings?.accentColor || '#FEF9E1'
                  } 0%, ${alpha(
                    settings?.accentColor || '#FEF9E1',
                    0.9,
                  )} 100%)`,
                  color: settings?.primaryColor || '#894444',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: `1px solid ${alpha(
                    settings?.primaryColor || '#894444',
                    0.1,
                  )}`,
                }}
              >
                <Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      color: settings?.primaryColor || '#894444',
                    }}
                  >
                    {isAdmin ? 'System Activity Log' : 'My Activity History'}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      opacity: 0.8,
                      color: settings?.textPrimaryColor || '#6D2323',
                    }}
                  >
                    {actionFilter || moduleFilter || dateFilter
                      ? `Showing ${filteredLogs.length} of ${auditLogs.length} logs matching filters`
                      : `Total: ${auditLogs.length} registered logs`}
                  </Typography>
                </Box>
              </Box>

              {/* Scrollable container for log entries */}
              <Box
                ref={logScrollRef}
                sx={{
                  minHeight: `${LOG_LIST_HEIGHT}px`,
                  overflowY: 'auto',
                  p: 3,
                  '&::-webkit-scrollbar': { width: '8px' },
                  '&::-webkit-scrollbar-track': {
                    background: alpha(settings?.accentColor || '#FEF9E1', 0.2),
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: alpha(settings?.primaryColor || '#894444', 0.5),
                    borderRadius: '4px',
                    '&:hover': {
                      background: alpha(
                        settings?.primaryColor || '#894444',
                        0.7,
                      ),
                    },
                  },
                }}
              >
                {filteredLogs.length === 0 ? (
                  <Box
                    sx={{
                      textAlign: 'center',
                      py: 8,
                      color: '#666',
                    }}
                  >
                    <Info
                      sx={{
                        fontSize: 80,
                        color: alpha(settings?.primaryColor || '#894444', 0.3),
                        mb: 3,
                      }}
                    />
                    <Typography
                      variant="h6"
                      sx={{ mb: 1, color: settings?.primaryColor || '#894444' }}
                    >
                      No audit logs found
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: alpha(settings?.primaryColor || '#894444', 0.6),
                      }}
                    >
                      {isAdmin
                        ? 'System activities will be logged here'
                        : 'Your activities will be logged here'}
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    {topSpacerHeight > 0 && (
                      <Box sx={{ height: `${topSpacerHeight}px` }} />
                    )}
                    {visibleLogs.map((log, index) => {
                      const virtualIndex = index;
                      const rowKey =
                        log.id ||
                        `${virtualIndex}-${log.timestamp || 'no-time'}`;
                      const actionColor = getActionColor(log.action);
                      const actionBg = alpha(actionColor, 0.1);
                      const officialSnapshot =
                        getOfficialTimeAuditSnapshot(log);
                      const hasOfficialSnapshot =
                        officialSnapshot &&
                        Array.isArray(officialSnapshot.records) &&
                        officialSnapshot.records.length > 0;
                      const isOfficialExpanded =
                        !!expandedOfficialDetails[rowKey];

                      const ts = log.timestamp ? new Date(log.timestamp) : null;
                      const timeLabel =
                        ts && !isNaN(ts)
                          ? `${ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • ${ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                          : null;

                      const actorEmpNum = getActorEmployeeNumber(log);
                      const targetEmpNum = getTargetEmployeeNumber(log);
                      const actorName =
                        log.actorName || getResolvedEmployeeName(actorEmpNum);
                      const targetName =
                        log.targetName || getResolvedEmployeeName(targetEmpNum);
                      const description = buildLogDescription(log);

                      return (
                        <Box
                          key={rowKey}
                          sx={{
                            bgcolor: '#fff',
                            border: `1px solid ${alpha(actionColor, 0.18)}`,
                            borderLeft: `4px solid ${actionColor}`,
                            borderRadius: 2,
                            p: 2.5,
                            mb: 1.5,
                            boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                            transition: 'box-shadow 0.2s ease',
                            '&:hover': {
                              boxShadow: `0 4px 16px ${alpha(actionColor, 0.12)}`,
                            },
                          }}
                        >
                          {/* Row 1: WHAT + WHEN */}
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              mb: 1.25,
                              flexWrap: 'wrap',
                              gap: 1,
                            }}
                          >
                            <Box
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.6,
                                px: 1.25,
                                py: 0.35,
                                borderRadius: '6px',
                                bgcolor: actionBg,
                                border: `1px solid ${alpha(actionColor, 0.2)}`,
                              }}
                            >
                              {React.cloneElement(getActionIcon(log.action), {
                                sx: { fontSize: 13, color: actionColor },
                              })}
                              <Typography
                                sx={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: actionColor,
                                  lineHeight: 1,
                                }}
                              >
                                {buildActionBadgeLabel(log)}
                              </Typography>
                            </Box>
                            {timeLabel && (
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                }}
                              >
                                <AccessTime
                                  sx={{ fontSize: 12, color: '#c0c0c0' }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ color: '#b0b0b0', fontSize: '0.72rem' }}
                                >
                                  {timeLabel}
                                </Typography>
                              </Box>
                            )}
                          </Box>

                          {/* Row 2: WHO */}
                          <Box
                            sx={{
                              display: 'flex',
                              gap: 1.5,
                              mb: 1.25,
                              flexWrap: 'wrap',
                            }}
                          >
                            {actorEmpNum && (
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.75,
                                  px: 1.25,
                                  py: 0.6,
                                  bgcolor: alpha(
                                    settings?.primaryColor || '#894444',
                                    0.06,
                                  ),
                                  borderRadius: '8px',
                                  border: `1px solid ${alpha(settings?.primaryColor || '#894444', 0.15)}`,
                                }}
                              >
                                <Person
                                  sx={{
                                    fontSize: 14,
                                    color: settings?.primaryColor || '#894444',
                                  }}
                                />
                                <Box>
                                  <Typography
                                    sx={{
                                      fontSize: '0.62rem',
                                      color: '#aaa',
                                      lineHeight: 1,
                                      mb: 0.2,
                                      fontWeight: 600,
                                      letterSpacing: '0.04em',
                                    }}
                                  >
                                    PERFORMED BY
                                  </Typography>
                                  {actorName && (
                                    <Typography
                                      sx={{
                                        fontSize: '0.82rem',
                                        fontWeight: 700,
                                        color:
                                          settings?.primaryColor || '#894444',
                                        lineHeight: 1.2,
                                      }}
                                    >
                                      {actorName}
                                    </Typography>
                                  )}
                                  <Typography
                                    sx={{
                                      fontSize: '0.68rem',
                                      color: '#888',
                                      lineHeight: 1,
                                      mt: actorName ? 0.2 : 0,
                                    }}
                                  >
                                    #{actorEmpNum}
                                  </Typography>
                                </Box>
                              </Box>
                            )}

                            {targetEmpNum && (
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.75,
                                  px: 1.25,
                                  py: 0.6,
                                  bgcolor: alpha('#1565C0', 0.05),
                                  borderRadius: '8px',
                                  border: '1px solid rgba(21,101,192,0.15)',
                                  ml: 'auto',
                                }}
                              >
                                <Person
                                  sx={{ fontSize: 14, color: '#1565C0' }}
                                />
                                <Box>
                                  <Typography
                                    sx={{
                                      fontSize: '0.62rem',
                                      color: '#aaa',
                                      lineHeight: 1,
                                      mb: 0.2,
                                      fontWeight: 600,
                                      letterSpacing: '0.04em',
                                    }}
                                  >
                                    EMPLOYEE
                                  </Typography>
                                  {targetName && (
                                    <Typography
                                      sx={{
                                        fontSize: '0.82rem',
                                        fontWeight: 700,
                                        color: '#1565C0',
                                        lineHeight: 1.2,
                                      }}
                                    >
                                      {targetName}
                                    </Typography>
                                  )}
                                  <Typography
                                    sx={{
                                      fontSize: '0.68rem',
                                      color: '#888',
                                      lineHeight: 1,
                                      mt: targetName ? 0.2 : 0,
                                    }}
                                  >
                                    #{targetEmpNum}
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                          </Box>

                          {/* Row 3: Clean sentence */}
                          <Typography
                            sx={{
                              fontSize: '0.85rem',
                              color: '#444',
                              lineHeight: 1.65,
                              fontWeight: 400,
                            }}
                          >
                            {description}
                          </Typography>

                          {hasOfficialSnapshot && (
                            <Box sx={{ mt: 1.5 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => toggleOfficialDetails(rowKey)}
                                startIcon={
                                  isOfficialExpanded ? (
                                    <KeyboardArrowUp sx={{ fontSize: 16 }} />
                                  ) : (
                                    <KeyboardArrowDown sx={{ fontSize: 16 }} />
                                  )
                                }
                                sx={{
                                  textTransform: 'none',
                                  fontWeight: 700,
                                  borderColor: alpha(
                                    settings?.primaryColor || '#894444',
                                    0.3,
                                  ),
                                  color: settings?.primaryColor || '#894444',
                                  fontSize: '0.75rem',
                                  py: 0.35,
                                  px: 1,
                                }}
                              >
                                {isOfficialExpanded
                                  ? 'Hide official time schedule record'
                                  : 'View official time schedule record'}
                              </Button>

                              {isOfficialExpanded && (
                                <Box
                                  sx={{
                                    mt: 1.2,
                                    borderRadius: 1.5,
                                    border: `1px solid ${alpha(settings?.primaryColor || '#894444', 0.2)}`,
                                    bgcolor: alpha(
                                      settings?.accentColor || '#FEF9E1',
                                      0.45,
                                    ),
                                    p: 1.25,
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      color: alpha(
                                        settings?.primaryColor || '#894444',
                                        0.85,
                                      ),
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.03em',
                                      mb: 0.75,
                                    }}
                                  >
                                    Official Time Schedule Snapshot (Stored in
                                    Audit)
                                  </Typography>

                                  <Typography
                                    sx={{
                                      fontSize: '0.74rem',
                                      color: '#555',
                                      mb: 0.75,
                                    }}
                                  >
                                    Employee: #
                                    {officialSnapshot.employeeID ||
                                      log.targetEmployeeNumber ||
                                      'N/A'}
                                    {officialSnapshot.startDate
                                      ? ` | Start: ${officialSnapshot.startDate}`
                                      : ''}
                                    {officialSnapshot.endDate
                                      ? ` | End: ${officialSnapshot.endDate}`
                                      : ''}
                                    {officialSnapshot.academicYear
                                      ? ` | Academic Year: ${officialSnapshot.academicYear}`
                                      : ''}
                                  </Typography>

                                  <Box sx={{ overflowX: 'auto' }}>
                                    <Box
                                      sx={{
                                        minWidth: 860,
                                        border: '1px solid rgba(0,0,0,0.08)',
                                        borderRadius: 1,
                                        bgcolor: '#fff',
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          display: 'grid',
                                          gridTemplateColumns:
                                            '120px repeat(4, 120px) 150px 150px 150px',
                                          px: 1,
                                          py: 0.7,
                                          bgcolor: alpha(
                                            settings?.primaryColor || '#894444',
                                            0.08,
                                          ),
                                          borderBottom:
                                            '1px solid rgba(0,0,0,0.08)',
                                          fontSize: '0.7rem',
                                          fontWeight: 700,
                                          color:
                                            settings?.primaryColor || '#894444',
                                        }}
                                      >
                                        <Box>DAY</Box>
                                        <Box>TIME IN</Box>
                                        <Box>BREAK IN</Box>
                                        <Box>BREAK OUT</Box>
                                        <Box>TIME OUT</Box>
                                        <Box>HONORARIUM</Box>
                                        <Box>SERVICE CREDIT</Box>
                                        <Box>OVERTIME</Box>
                                      </Box>

                                      {officialSnapshot.records.map(
                                        (r, idx2) => {
                                          const honorarium = `${r.officialHonorariumTimeIN || '-'} -> ${
                                            r.officialHonorariumTimeOUT || '-'
                                          }`;
                                          const serviceCredit = `${
                                            r.officialServiceCreditTimeIN || '-'
                                          } -> ${r.officialServiceCreditTimeOUT || '-'}`;
                                          const overtime = `${r.officialOverTimeIN || '-'} -> ${
                                            r.officialOverTimeOUT || '-'
                                          }`;

                                          return (
                                            <Box
                                              key={`${rowKey}-record-${idx2}`}
                                              sx={{
                                                display: 'grid',
                                                gridTemplateColumns:
                                                  '120px repeat(4, 120px) 150px 150px 150px',
                                                px: 1,
                                                py: 0.65,
                                                borderBottom:
                                                  idx2 <
                                                  officialSnapshot.records
                                                    .length -
                                                    1
                                                    ? '1px solid rgba(0,0,0,0.05)'
                                                    : 'none',
                                                fontSize: '0.72rem',
                                                color: '#333',
                                                bgcolor:
                                                  idx2 % 2 === 0
                                                    ? '#fff'
                                                    : '#fafafa',
                                                fontFamily: 'monospace',
                                              }}
                                            >
                                              <Box
                                                sx={{
                                                  fontFamily: 'inherit',
                                                  fontWeight: 700,
                                                }}
                                              >
                                                {r.day || '-'}
                                              </Box>
                                              <Box>
                                                {r.officialTimeIN || '-'}
                                              </Box>
                                              <Box>
                                                {r.officialBreaktimeIN || '-'}
                                              </Box>
                                              <Box>
                                                {r.officialBreaktimeOUT || '-'}
                                              </Box>
                                              <Box>
                                                {r.officialTimeOUT || '-'}
                                              </Box>
                                              <Box>{honorarium}</Box>
                                              <Box>{serviceCredit}</Box>
                                              <Box>{overtime}</Box>
                                            </Box>
                                          );
                                        },
                                      )}
                                    </Box>
                                  </Box>

                                  {officialSnapshot.truncated && (
                                    <Typography
                                      sx={{
                                        fontSize: '0.72rem',
                                        color: '#b25c00',
                                        mt: 0.8,
                                      }}
                                    >
                                      Snapshot truncated in audit storage.
                                    </Typography>
                                  )}
                                </Box>
                              )}
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                    {bottomSpacerHeight > 0 && (
                      <Box sx={{ height: `${bottomSpacerHeight}px` }} />
                    )}
                  </Box>
                )}
              </Box>

              {/* Footer with pagination */}
              <Box
                sx={{
                  mt: 0,
                  pt: 2,
                  pb: 2,
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  px: 3,
                  flexWrap: 'wrap',
                  gap: 2,
                  backgroundColor: alpha(
                    settings?.accentColor || '#FEF9E1',
                    0.5,
                  ),
                }}
              >
                <Typography sx={{ color: '#666', fontSize: '14px' }}>
                  <strong>Total Logs:</strong> {filteredLogs.length}{' '}
                  <span style={{ color: '#999' }}>
                    | Showing{' '}
                    {filteredLogs.length === 0
                      ? 0
                      : (auditPage - 1) * LOGS_PER_PAGE + 1}
                    –{Math.min(auditPage * LOGS_PER_PAGE, filteredLogs.length)}{' '}
                    of {filteredLogs.length}
                  </span>
                </Typography>

                {/* Pagination controls */}
                {totalPages > 1 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      disabled={auditPage === 1}
                      onClick={() => {
                        setAuditPage((p) => p - 1);
                        logScrollRef.current?.scrollTo({
                          top: 0,
                          behavior: 'smooth',
                        });
                      }}
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: '8px',
                        border: `1px solid ${alpha(settings?.primaryColor || '#894444', auditPage === 1 ? 0.1 : 0.25)}`,
                        color:
                          auditPage === 1
                            ? '#ccc'
                            : settings?.primaryColor || '#894444',
                        '&:hover': {
                          bgcolor: alpha(
                            settings?.primaryColor || '#894444',
                            0.06,
                          ),
                        },
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          fontSize: '1rem',
                          lineHeight: 1,
                          fontWeight: 600,
                        }}
                      >
                        ‹
                      </Box>
                    </IconButton>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === totalPages ||
                          Math.abs(p - auditPage) <= 2,
                      )
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, idx) =>
                        item === '...' ? (
                          <Typography
                            key={`ellipsis-${idx}`}
                            sx={{ px: 0.5, color: '#aaa', fontSize: '0.85rem' }}
                          >
                            …
                          </Typography>
                        ) : (
                          <IconButton
                            key={item}
                            size="small"
                            onClick={() => {
                              setAuditPage(item);
                              logScrollRef.current?.scrollTo({
                                top: 0,
                                behavior: 'smooth',
                              });
                            }}
                            sx={{
                              width: 30,
                              height: 30,
                              borderRadius: '8px',
                              fontSize: '0.78rem',
                              fontWeight: item === auditPage ? 700 : 400,
                              bgcolor:
                                item === auditPage
                                  ? settings?.primaryColor || '#894444'
                                  : 'transparent',
                              color: item === auditPage ? '#fff' : '#666',
                              border: `1px solid ${item === auditPage ? settings?.primaryColor || '#894444' : alpha(settings?.primaryColor || '#894444', 0.15)}`,
                              '&:hover': {
                                bgcolor:
                                  item === auditPage
                                    ? settings?.primaryColor || '#894444'
                                    : alpha(
                                        settings?.primaryColor || '#894444',
                                        0.06,
                                      ),
                              },
                            }}
                          >
                            {item}
                          </IconButton>
                        ),
                      )}

                    <IconButton
                      size="small"
                      disabled={auditPage === totalPages}
                      onClick={() => {
                        setAuditPage((p) => p + 1);
                        logScrollRef.current?.scrollTo({
                          top: 0,
                          behavior: 'smooth',
                        });
                      }}
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: '8px',
                        border: `1px solid ${alpha(settings?.primaryColor || '#894444', auditPage === totalPages ? 0.1 : 0.25)}`,
                        color:
                          auditPage === totalPages
                            ? '#ccc'
                            : settings?.primaryColor || '#894444',
                        '&:hover': {
                          bgcolor: alpha(
                            settings?.primaryColor || '#894444',
                            0.06,
                          ),
                        },
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          fontSize: '1rem',
                          lineHeight: 1,
                          fontWeight: 600,
                        }}
                      >
                        ›
                      </Box>
                    </IconButton>
                  </Box>
                )}
              </Box>
            </GlassCard>
          </Fade>
        )}
      </Box>

      {/* Session Warning Modal */}
      <Modal
        open={sessionWarningOpen}
        onClose={handleSessionWarningClose}
        disableEscapeKeyDown={false}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: 450 },
            maxWidth: 500,
            bgcolor: 'white',
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            overflow: 'hidden',
            border: `2px solid ${getTimerColor(sessionTimer)}`,
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 3,
              bgcolor: alpha(getTimerColor(sessionTimer), 0.1),
              borderBottom: `3px solid ${getTimerColor(sessionTimer)}`,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Avatar
              sx={{
                bgcolor: alpha(getTimerColor(sessionTimer), 0.2),
                color: getTimerColor(sessionTimer),
                width: 56,
                height: 56,
              }}
            >
              <Warning sx={{ fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 'bold', color: '#333' }}
              >
                Session Expiring Soon
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                Your access to audit logs will expire shortly
              </Typography>
            </Box>
          </Box>

          {/* Content */}
          <Box sx={{ p: 4, bgcolor: 'white' }}>
            <Alert
              severity="warning"
              icon={<Warning />}
              sx={{
                mb: 3,
                borderRadius: 2,
                bgcolor: alpha(getTimerColor(sessionTimer), 0.05),
                border: `1px solid ${alpha(getTimerColor(sessionTimer), 0.2)}`,
                '& .MuiAlert-icon': {
                  color: getTimerColor(sessionTimer),
                  fontSize: 28,
                },
              }}
            >
              <Typography
                variant="body1"
                sx={{ fontWeight: 600, mb: 1, color: '#333' }}
              >
                Time Remaining: {formatTimer(sessionTimer)}
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                For security purposes, your session will automatically expire.
                You will need to re-authenticate to continue accessing the audit
                logs.
              </Typography>
            </Alert>

            <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
              <Button
                onClick={handleSessionWarningClose}
                variant="contained"
                sx={{
                  backgroundColor: getTimerColor(sessionTimer),
                  color: 'white',
                  px: 4,
                  py: 1.2,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 2,
                  minWidth: 100,
                  '&:hover': {
                    backgroundColor: alpha(getTimerColor(sessionTimer), 0.8),
                  },
                }}
              >
                OK
              </Button>
            </Box>
          </Box>
        </Box>
      </Modal>

      {/* Fixed bottom-right session timer (shown after warning triggers) */}
      {sessionWarningShown && (
        <Fade in timeout={300}>
          <Box
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 9999,
            }}
          >
            <Chip
              icon={<LockIcon sx={{ fontSize: 16 }} />}
              label={formatTimer(sessionTimer)}
              size="medium"
              sx={{
                bgcolor: alpha(getTimerColor(sessionTimer), 0.9),
                color: 'white',
                fontWeight: 600,
                fontSize: '1rem',
                border: `2px solid ${getTimerColor(sessionTimer)}`,
                '& .MuiChip-label': { px: 1.5 },
                '& .MuiChip-icon': {
                  color: 'white',
                  animation: sessionTimer < 60 ? 'pulse 1s infinite' : 'none',
                },
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                },
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
            />
          </Box>
        </Fade>
      )}
    </Box>
  );
};

export default AuditLogs;
