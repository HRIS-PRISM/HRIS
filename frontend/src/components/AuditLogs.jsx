import API_BASE_URL from '../apiConfig';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  alpha,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  Backdrop,
  InputAdornment,
  Dialog,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Home,
  History,
  Search as SearchIcon,
  Close as CloseIcon,
  Security,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Warning,
} from '@mui/icons-material';
import { getUserInfo } from '../utils/auth';
import usePageAccess from '../hooks/usePageAccess';
import AccessDenied from './AccessDenied';
import { useSocket } from '../contexts/SocketContext';
import { buildDashboardAuditSentence } from '../utils/dashboardAuditFormat';

/* ── Design tokens (aligned with PagesList / AdminActionTrail) ── */
const T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  accentMid: '#8B4545',
  accentFaint: 'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  rowOdd: 'rgba(109,35,35,0.025)',
  rowHover: 'rgba(109,35,35,0.055)',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#a0a0a0',
  surface: '#ffffff',
  headerGrad: 'linear-gradient(135deg,#6d2323 0%,#5a1d1d 100%)',
};

const BD = T.accentBorder;
const SUBTLE = 'rgba(109,35,35,0.03)';

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
`;

const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: `0.5px solid ${T.accentBorder}`,
  overflow: 'hidden',
  background: T.surface,
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

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
};

// ─── Session durations ───────────────────────────────────────────────────────
const SESSION_DURATION_DEFAULT = 10 * 60 * 1000; // 10 minutes (admin / superadmin)
const SESSION_DURATION_TECHNICAL = 30 * 60 * 1000; // 30 minutes (technical)

/** Home dashboard chart APIs — not real module visits; hide from audit trail. */
const DASHBOARD_BACKGROUND_VIEW_TABLES = new Set([
  'dashboard_stats',
  'attendance_overview',
  'department_distribution',
  'leave_stats',
  'recent_activities',
  'payroll_summary',
  'monthly_attendance',
  'employee_growth',
  'employee_stats',
]);

const shouldShowAuditLogEntry = (log) => {
  const table = String(log?.table_name || '').toLowerCase();
  if (table === 'leave_transaction') return false;
  const action = String(log?.action || '').toLowerCase();
  if (action === 'view' && DASHBOARD_BACKGROUND_VIEW_TABLES.has(table)) {
    return false;
  }
  // Autocomplete typing against users API — not a real module action
  if (table === 'users' && action.includes('search')) {
    return false;
  }
  // Calendar data fetches (holidays / leaves / suspensions) — not user actions
  if (
    (table === 'holidays' || table === 'suspensions' || table === 'leaves') &&
    action === 'view'
  ) {
    return false;
  }
  // Legacy attendance module fetch without button details
  if (
    table.includes('attendance module') &&
    action.includes('viewed attendance records')
  ) {
    return false;
  }
  // Background overall row lookup (Non-Teaching / DTR persist) — not Summary search
  if (
    (table === 'attendance summary' || table.includes('attendance_summary')) &&
    action.includes('search overall attendance record')
  ) {
    const details = log?.details_json;
    if (!details) return false;
    try {
      const parsed =
        typeof details === 'object' ? details : JSON.parse(details);
      if (!parsed?.button) return false;
    } catch {
      return false;
    }
  }
  // Legacy per-day device auto-save rows (replaced by one audit per fetch)
  if (
    table === 'attendance device' &&
    (action.includes('auto-saved') || action.includes('auto-updated'))
  ) {
    const details = log?.details_json;
    if (!details) return false;
    try {
      const parsed =
        typeof details === 'object' ? details : JSON.parse(details);
      if (!parsed?.button) return false;
    } catch {
      return false;
    }
  }
  // Legacy Official Time API audits (replaced by button audits from Official Time UI)
  if (table.includes('official time') || table.includes('official_time')) {
    const details = log?.details_json;
    let parsed = null;
    if (details) {
      try {
        parsed = typeof details === 'object' ? details : JSON.parse(details);
      } catch {
        parsed = null;
      }
    }
    if (!parsed?.button) {
      if (
        action === 'view' ||
        action.includes('add official') ||
        action.includes('edit official')
      ) {
        return false;
      }
    }
  }
  // Incidental official-time GET while typing in DTR / other modules (not Official Time UI)
  if (
    (table.includes('official time') || table.includes('official_time')) &&
    action === 'view'
  ) {
    const details = log?.details_json;
    let parsed = null;
    if (details) {
      try {
        parsed = typeof details === 'object' ? details : JSON.parse(details);
      } catch {
        parsed = null;
      }
    }
    if (parsed?.source === 'view-db') return false;
    const targetEmp = String(
      parsed?.employeeID ||
        log?.targetEmployeeNumber ||
        '',
    ).trim();
    if (targetEmp.length > 0 && targetEmp.length < 6) return false;
  }
  // Legacy Attendance State search (replaced by Fetch Records button audit)
  if (table.includes('attendance state') && action.includes('searched attendance record state')) {
    const details = log?.details_json;
    let parsed = null;
    if (details) {
      try {
        parsed = typeof details === 'object' ? details : JSON.parse(details);
      } catch {
        parsed = null;
      }
    }
    if (!parsed?.button) return false;
  }
  // Legacy per-row Attendance Modification saves (replaced by one save audit)
  if (table.includes('attendance modification')) {
    const details = log?.details_json;
    let parsed = null;
    if (details) {
      try {
        parsed = typeof details === 'object' ? details : JSON.parse(details);
      } catch {
        parsed = null;
      }
    }
    if (!parsed?.button) return false;
  }
  return true;
};

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
  APPROVED: ['APPROVE'],
  APPLIED: ['APPLIED'],
  REJECTED: ['REJECT'],
};

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

const formatTimestamp = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return `${d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} · ${d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

const formatModuleName = (tableName) => {
  if (!tableName) return '—';
  return String(tableName)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const parseAuditDetailsSafe = (raw) => {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const buildLogDescription = (log) => {
  const details = parseAuditDetailsSafe(log?.details_json) || {};
  const txMsg =
    typeof details.transaction_message === 'string' &&
    details.transaction_message.trim();
  if (txMsg) return txMsg;
  if (details.module_type === 'dashboard') {
    return buildDashboardAuditSentence(log);
  }
  const action = log?.action || 'Action';
  const module = formatModuleName(log?.table_name);
  const target = log?.targetEmployeeNumber
    ? ` (Target: ${log.targetEmployeeNumber})`
    : '';
  return `${action} on ${module}${target}`;
};

const getActionColor = (action) => {
  if (!action) return T.accent;
  const a = action.toUpperCase();
  if (['DELETE', 'REMOVE', 'DESTROY'].some((k) => a.includes(k)))
    return '#c62828';
  if (a.includes('REJECT')) return '#b91c1c';
  if (['RESTORE', 'REVERS'].some((k) => a.includes(k))) return '#ec4899';
  if (['DEDUCT', 'TARDINESS'].some((k) => a.includes(k))) return '#f97316';
  if (a.includes('ASSIGN')) return '#6366f1';
  if (['UPDATE', 'EDIT', 'MODIFY', 'CHANGE'].some((k) => a.includes(k)))
    return '#1565c0';
  if (['VIEW', 'OPEN', 'READ'].some((k) => a.includes(k))) return '#00838f';
  if (['CREATE', 'ADD', 'INSERT', 'REGISTER'].some((k) => a.includes(k)))
    return '#2e7d32';
  return T.accent;
};

const formatTimer = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getTimerColor = (seconds) => {
  if (seconds < 120) return '#ef4444';
  if (seconds < 300) return '#f59e0b';
  return '#10b981';
};

const headCellSx = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '0.6rem',
  fontWeight: 700,
  color: alpha(T.accent, 0.5),
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  borderBottom: `2px solid ${alpha(T.accent, 0.12)}`,
  bgcolor: '#fafafa',
  py: 0.75,
  px: 2,
  whiteSpace: 'nowrap',
};

const AuditLogs = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [sessionTimer, setSessionTimer] = useState(600);
  const [sessionWarningShown, setSessionWarningShown] = useState(false);
  const [sessionWarningOpen, setSessionWarningOpen] = useState(false);

  const isTechnical = userRole === 'technical';

  const {
    hasAccess,
    loading: accessLoading,
  } = usePageAccess('audit-logs');

  const canBypassPageAccess =
    userRole === 'superadmin' || userRole === 'technical';
  const canAdminAccessByPage =
    (userRole === 'administrator' || userRole === 'admin') &&
    hasAccess === true;
  const canAccessAuditModule = canBypassPageAccess || canAdminAccessByPage;

  const isAdmin =
    userRole === 'administrator' ||
    userRole === 'admin' ||
    canBypassPageAccess;
  const pageTitle = isAdmin ? 'Audit Trail (All Users)' : 'My Activity Log';

  const isSessionValid = () => {
    const sessionData = sessionStorage.getItem('auditLogsSession');
    if (!sessionData) return false;

    try {
      const { timestamp, role } = JSON.parse(sessionData);
      const now = Date.now();
      const sessionAge = now - timestamp;
      const duration =
        role === 'technical'
          ? SESSION_DURATION_TECHNICAL
          : SESSION_DURATION_DEFAULT;
      return sessionAge < duration;
    } catch {
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

  const clearSession = useCallback(() => {
    sessionStorage.removeItem('auditLogsSession');
    setIsAuthenticated(false);
    setPasswordDialogOpen(true);
    setSessionWarningShown(false);
  }, []);

  useEffect(() => {
    const userInfo = getUserInfo();
    if (userInfo) {
      setCurrentUser(userInfo);
      setUserRole(userInfo.role);
    }
  }, []);

  useEffect(() => {
    if (userRole === null) return;

    if (userRole === 'technical') {
      if (!isAuthenticated) {
        storeSession('technical');
        setIsAuthenticated(true);
        setPasswordDialogOpen(false);
        setSessionTimer(SESSION_DURATION_TECHNICAL / 1000);
      }
      setLoading(false);
      return;
    }

    if (isSessionValid()) {
      setIsAuthenticated(true);
      setPasswordDialogOpen(false);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [userRole]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAuthenticated) return;

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
      } catch {
        /* ignore */
      }
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

          if (secondsRemaining <= 120 && !sessionWarningShown) {
            setSessionWarningOpen(true);
            setSessionWarningShown(true);
          }
        }
      } catch {
        clearSession();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, sessionWarningShown, clearSession]);

  const loadAuditLogs = useCallback(
    async (isRefresh = false) => {
      if (!isAuthenticated) return;

      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const response = await axios.get(
          `${API_BASE_URL}/audit-logs`,
          getAuthHeaders(),
        );

        if (response.data && Array.isArray(response.data)) {
          setAuditLogs(response.data.filter(shouldShowAuditLogEntry));
        } else {
          setAuditLogs([]);
        }
      } catch (error) {
        console.error('Error loading audit logs:', error);
        setAuditLogs([]);
        setToast({ message: 'Failed to load audit logs', type: 'error' });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAuthenticated],
  );

  useEffect(() => {
    if (isAuthenticated) {
      loadAuditLogs();
    }
  }, [isAuthenticated, loadAuditLogs]);

  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleNewAuditLog = (newLog) => {
      if (!shouldShowAuditLogEntry(newLog)) return;
      setAuditLogs((prev) => {
        if (prev.some((l) => l.id === newLog.id)) return prev;
        return [newLog, ...prev];
      });
    };

    socket.on('auditLogCreated', handleNewAuditLog);
    return () => socket.off('auditLogCreated', handleNewAuditLog);
  }, [socket, isAuthenticated]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    setPage(0);
  }, [actionFilter, moduleFilter, dateFilter, employeeFilter]);

  const uniqueActions = useMemo(
    () =>
      [
        ...new Set(
          auditLogs.map((log) => normalizeAction(log.action)).filter(Boolean),
        ),
      ].sort((a, b) => String(a).localeCompare(String(b))),
    [auditLogs],
  );

  const uniqueModules = useMemo(
    () =>
      [...new Set(auditLogs.map((l) => l.table_name).filter(Boolean))].sort(
        (a, b) => String(a).localeCompare(String(b)),
      ),
    [auditLogs],
  );

  const filteredLogs = useMemo(() => {
    let filtered = [...auditLogs];

    if (
      userRole &&
      userRole !== 'administrator' &&
      userRole !== 'admin' &&
      userRole !== 'superadmin' &&
      userRole !== 'technical'
    ) {
      filtered = filtered.filter(
        (log) => log.employeeNumber === currentUser?.employeeNumber,
      );
    }

    if (employeeFilter) {
      const q = employeeFilter.toLowerCase().trim();
      if (q) {
        filtered = filtered.filter((log) => {
          const actorCol = String(log.employeeNumber || '').toLowerCase();
          const targetCol = String(log.targetEmployeeNumber || '').toLowerCase();
          return actorCol.includes(q) || targetCol.includes(q);
        });
      }
    }

    if (actionFilter) {
      filtered = filtered.filter(
        (log) => normalizeAction(log.action) === actionFilter,
      );
    }

    if (moduleFilter) {
      filtered = filtered.filter(
        (log) =>
          log.table_name?.toLowerCase() === moduleFilter.toLowerCase(),
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

    return filtered;
  }, [
    auditLogs,
    userRole,
    currentUser,
    employeeFilter,
    actionFilter,
    moduleFilter,
    dateFilter,
  ]);

  const pagedLogs = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredLogs.slice(start, start + rowsPerPage);
  }, [filteredLogs, page, rowsPerPage]);

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
        setSessionWarningShown(false);
        setToast({
          message: 'Access granted. Your session has started.',
          type: 'success',
        });
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

  const handleExport = () => {
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
    setToast({ message: 'Export downloaded', type: 'success' });
  };

  const handleRefresh = () => {
    loadAuditLogs(true);
    setToast({ message: 'Logs refreshed', type: 'success' });
  };

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

  if (!userRole || accessLoading || (loading && !isAuthenticated)) {
    return (
      <Box
        sx={{
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={28} sx={{ color: T.accent }} />
      </Box>
    );
  }

  if (!isAuthenticated && !isTechnical) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <Dialog
          open={passwordDialogOpen}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              overflow: 'hidden',
              border: `1px solid ${T.accentBorder}`,
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
              gap: 2,
            }}
          >
            <LockIcon sx={{ fontSize: 28, color: '#fff' }} />
            <Box>
              <Typography
                sx={{ fontWeight: 800, color: '#fff', fontSize: '1.05rem' }}
              >
                Audit Logs Access
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', color: alpha('#fff', 0.85) }}>
                This module requires authorization
              </Typography>
            </Box>
          </Box>

          <DialogContent sx={{ px: 3, pt: 2.5, pb: 1 }}>
            <Alert
              severity="info"
              icon={<Security />}
              sx={{
                mb: 2.5,
                borderRadius: 2,
                bgcolor: T.accentFaint,
                border: `1px solid ${T.accentBorder}`,
                '& .MuiAlert-icon': { color: T.accent },
              }}
            >
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', mb: 1 }}>
                Access Control Notice
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', color: T.muted, mb: 0.5 }}>
                • Access is restricted to authorized personnel only
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', color: T.muted, mb: 0.5 }}>
                • Sessions are limited to 10 minutes for security compliance
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', color: T.muted }}>
                • Re-authentication is required upon session expiration
              </Typography>
            </Alert>

            <FieldInput
              autoFocus
              fullWidth
              label="Enter Authorized Password"
              type={showPassword ? 'text' : 'password'}
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setPasswordError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePasswordSubmit();
              }}
              error={!!passwordError}
              helperText={passwordError}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                    >
                      {showPassword ? (
                        <VisibilityOffIcon sx={{ fontSize: 18 }} />
                      ) : (
                        <VisibilityIcon sx={{ fontSize: 18 }} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
            <Button
              onClick={handleCloseDialog}
              variant="outlined"
              sx={{
                borderColor: T.accentBorder,
                color: T.accent,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Cancel
            </Button>
            <AccentButton
              variant="contained"
              startIcon={<LockIcon sx={{ fontSize: 16 }} />}
              onClick={handlePasswordSubmit}
              sx={{
                bgcolor: T.accent,
                color: '#fff',
                '&:hover': { bgcolor: T.accentDark },
              }}
            >
              Access
            </AccentButton>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  return (
    <Box
      sx={{
        // UsersList shell, with a bit more right inset so it isn't edge-flush
        py: { xs: 1, md: 2 },
        mt: { xs: 0, md: -2 },
        mb: { xs: 1, md: 2 },
        width: '100vw',
        maxWidth: 'none',
        position: 'relative',
        left: '63%',
        transform: 'translateX(-61%)',
        pl: { xs: 2, sm: 3, md: 5 },
        pr: { xs: 3, sm: 5, md: 10 },
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 160px)',
      }}
    >
      <style>{GLOBAL_CSS}</style>

      <Backdrop
        open={!!toast}
        sx={{ zIndex: 9999, backdropFilter: 'blur(8px)', bgcolor: 'rgba(0,0,0,0.5)' }}
        onClick={() => setToast(null)}
      >
        <Box onClick={(e) => e.stopPropagation()} sx={{ minWidth: 360, maxWidth: 520 }}>
          {toast && (
            <Alert
              severity={toast.type === 'error' ? 'error' : 'success'}
              sx={{
                borderRadius: 3,
                boxShadow: '0 12px 48px rgba(0,0,0,0.4)',
                fontSize: '1rem',
                p: 2.5,
                '& .MuiAlert-message': { fontWeight: 600 },
              }}
              onClose={() => setToast(null)}
            >
              {toast.message}
            </Alert>
          )}
        </Box>
      </Backdrop>

      <Dialog
        open={sessionWarningOpen}
        onClose={() => setSessionWarningOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            border: `2px solid ${getTimerColor(sessionTimer)}`,
          },
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2,
            bgcolor: alpha(getTimerColor(sessionTimer), 0.1),
            borderBottom: `3px solid ${getTimerColor(sessionTimer)}`,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Warning sx={{ fontSize: 28, color: getTimerColor(sessionTimer) }} />
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: T.text }}>
              Session Expiring Soon
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: T.muted }}>
              Your access to audit logs will expire shortly
            </Typography>
          </Box>
        </Box>
        <DialogContent sx={{ pt: 2.5 }}>
          <Alert
            severity="warning"
            icon={<Warning />}
            sx={{
              borderRadius: 2,
              bgcolor: alpha(getTimerColor(sessionTimer), 0.05),
              border: `1px solid ${alpha(getTimerColor(sessionTimer), 0.2)}`,
            }}
          >
            <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
              Time Remaining: {formatTimer(sessionTimer)}
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: T.muted }}>
              For security purposes, your session will automatically expire.
              {isTechnical
                ? ' Technical accounts have a 30-minute session.'
                : ' Access is limited to 10-minute sessions.'}
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AccentButton
            variant="contained"
            onClick={() => setSessionWarningOpen(false)}
            sx={{
              bgcolor: getTimerColor(sessionTimer),
              color: '#fff',
              '&:hover': { bgcolor: getTimerColor(sessionTimer), opacity: 0.9 },
            }}
          >
            Continue
          </AccentButton>
        </DialogActions>
      </Dialog>

      {/* Hero */}
      <SectionCard sx={{ mb: 1.5, flexShrink: 0, width: '100%' }}>
        <Box
          sx={{
            px: 4,
            py: 1.5,
            background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            flexWrap: 'wrap',
            gap: 1.5,
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
                  'radial-gradient(circle,rgba(109,35,35,0.1) 0%,transparent 70%)',
              }}
            />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2.5,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Security sx={{ fontSize: 28, color: T.accent }} />
              <Box>
                <Typography
                  sx={{
                    fontSize: '1.1rem',
                    fontWeight: 900,
                    color: T.accent,
                    lineHeight: 1.2,
                    mb: 0.2,
                  }}
                >
                  {pageTitle}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    color: T.accentMid,
                    fontWeight: 600,
                    opacity: 0.9,
                  }}
                >
                  {isAdmin
                    ? 'System-wide activity tracking and security monitoring'
                    : 'Your personal activity history and access logs'}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                position: 'relative',
                zIndex: 1,
                flexWrap: 'wrap',
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 0.6,
                  borderRadius: 6,
                  bgcolor: alpha(T.accent, 0.09),
                  border: `1px solid ${alpha(T.accent, 0.18)}`,
                }}
              >
                <Typography
                  sx={{ fontSize: '0.78rem', color: T.accent, fontWeight: 700 }}
                >
                  {filteredLogs.length} log
                  {filteredLogs.length !== 1 ? 's' : ''}
                </Typography>
              </Box>

              <Tooltip
                title={
                  isTechnical
                    ? 'Technical accounts have a 30-minute session'
                    : 'Access to audit logs is limited to 10-minute sessions'
                }
              >
                <Chip
                  icon={<LockIcon sx={{ fontSize: '14px !important' }} />}
                  label={formatTimer(sessionTimer)}
                  size="small"
                  sx={{
                    height: 28,
                    bgcolor: alpha(getTimerColor(sessionTimer), 0.12),
                    color: getTimerColor(sessionTimer),
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    border: `1px solid ${alpha(getTimerColor(sessionTimer), 0.25)}`,
                    '& .MuiChip-icon': {
                      color: getTimerColor(sessionTimer),
                      animation:
                        sessionTimer <= 120 ? 'pulse 1s infinite' : 'none',
                    },
                  }}
                />
              </Tooltip>

              <Tooltip title="Home">
                <IconButton
                  size="small"
                  onClick={() => navigate('/admin-home')}
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: alpha(T.accent, 0.08),
                    border: `1px solid ${alpha(T.accent, 0.18)}`,
                    borderRadius: 1.5,
                    color: T.accent,
                    '&:hover': { bgcolor: alpha(T.accent, 0.14) },
                  }}
                >
                  <Home sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Refresh">
                <IconButton
                  size="small"
                  onClick={handleRefresh}
                  disabled={loading || refreshing}
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: alpha(T.accent, 0.08),
                    border: `1px solid ${alpha(T.accent, 0.18)}`,
                    borderRadius: 1.5,
                    color: T.accent,
                    '&:hover': { bgcolor: alpha(T.accent, 0.14) },
                  }}
                >
                  {loading || refreshing ? (
                    <CircularProgress size={14} sx={{ color: T.accent }} />
                  ) : (
                    <RefreshIcon sx={{ fontSize: 16 }} />
                  )}
                </IconButton>
              </Tooltip>

              {isAdmin && (
                <AccentButton
                  size="small"
                  variant="contained"
                  startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                  onClick={handleExport}
                  sx={{
                    fontSize: '0.78rem',
                    bgcolor: T.accent,
                    color: '#fff',
                    boxShadow: `0 2px 8px ${alpha(T.accent, 0.3)}`,
                    '&:hover': { bgcolor: T.accentDark },
                  }}
                >
                  Export
                </AccentButton>
              )}
            </Box>
          </Box>
        </SectionCard>

        {/* Records */}
        <SectionCard
          sx={{
            width: '100%',
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              px: 2.5,
              py: 1.25,
              borderBottom: `1px solid ${BD}`,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              bgcolor: SUBTLE,
              flexShrink: 0,
              flexWrap: 'wrap',
            }}
          >
            <SearchIcon
              sx={{ color: alpha(T.accent, 0.4), fontSize: 17, flexShrink: 0 }}
            />
            <FieldInput
              size="small"
              placeholder="Search employee #…"
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              sx={{ minWidth: 160, flex: 1, '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
              InputProps={{
                endAdornment: employeeFilter ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setEmployeeFilter('')}>
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
            <FieldInput
              select
              size="small"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
            >
              <MenuItem value="">All Actions</MenuItem>
              {uniqueActions.map((a) => (
                <MenuItem key={a} value={a}>
                  {a}
                </MenuItem>
              ))}
            </FieldInput>
            <FieldInput
              select
              size="small"
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
            >
              <MenuItem value="">All Modules</MenuItem>
              {uniqueModules.map((m) => (
                <MenuItem key={m} value={m}>
                  {formatModuleName(m)}
                </MenuItem>
              ))}
            </FieldInput>
            <FieldInput
              type="date"
              size="small"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
            />
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {loading && !auditLogs.length ? (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    border: `2px solid ${alpha(T.accent, 0.15)}`,
                    borderTopColor: T.accent,
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                    mx: 'auto',
                    mb: 2,
                  }}
                />
                <Typography
                  sx={{ color: T.muted, fontWeight: 500, fontSize: '0.84rem' }}
                >
                  Loading audit logs…
                </Typography>
              </Box>
            ) : (
              <Table stickyHeader size="small" sx={{ width: '100%', minWidth: 960 }}>
                <TableHead>
                  <TableRow>
                    {['When', 'Employee', 'Action', 'Module', 'Target', 'Description'].map(
                      (h) => (
                        <TableCell key={h} sx={headCellSx}>
                          {h}
                        </TableCell>
                      ),
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                        <History
                          sx={{
                            fontSize: 40,
                            color: alpha(T.accent, 0.25),
                            mb: 1,
                          }}
                        />
                        <Typography
                          sx={{
                            fontWeight: 600,
                            color: T.accent,
                            fontSize: '0.9rem',
                          }}
                        >
                          No audit logs found
                        </Typography>
                        <Typography
                          sx={{ color: T.muted, fontSize: '0.78rem', mt: 0.5 }}
                        >
                          {isAdmin
                            ? 'System activities will be logged here'
                            : 'Your activities will be logged here'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedLogs.map((log) => {
                      const actionColor = getActionColor(log.action);
                      const description = buildLogDescription(log);
                      return (
                        <TableRow
                          key={log.id || `${log.timestamp}-${log.employeeNumber}`}
                          sx={{
                            '&:nth-of-type(even)': { bgcolor: T.rowOdd },
                            '&:hover': { bgcolor: T.rowHover },
                            transition: 'background-color 0.12s ease',
                            borderBottom: `1px solid ${alpha(T.accent, 0.06)}`,
                          }}
                        >
                          <TableCell sx={{ px: 2, py: 1.1, whiteSpace: 'nowrap' }}>
                            <Typography
                              sx={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '0.7rem',
                                color: T.muted,
                                fontWeight: 500,
                              }}
                            >
                              {formatTimestamp(log.timestamp)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ px: 2, py: 1.1 }}>
                            <Typography
                              sx={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: T.text,
                              }}
                            >
                              #{log.employeeNumber || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ px: 2, py: 1.1 }}>
                            <Box
                              sx={{
                                display: 'inline-flex',
                                px: 1,
                                py: 0.2,
                                borderRadius: '20px',
                                bgcolor: alpha(actionColor, 0.08),
                                border: `1px solid ${alpha(actionColor, 0.2)}`,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  color: actionColor,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {String(log.action || '—').toUpperCase()}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ px: 2, py: 1.1 }}>
                            <Typography
                              sx={{ fontSize: '0.78rem', color: T.text, fontWeight: 500 }}
                            >
                              {formatModuleName(log.table_name)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ px: 2, py: 1.1 }}>
                            <Typography
                              sx={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '0.72rem',
                                color: T.muted,
                              }}
                            >
                              {log.targetEmployeeNumber || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ px: 2, py: 1.1, maxWidth: 320 }}>
                            <Typography
                              sx={{
                                fontSize: '0.75rem',
                                color: T.muted,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={description}
                            >
                              {description}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </Box>

          <TablePagination
            component="div"
            count={filteredLogs.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{
              flexShrink: 0,
              borderTop: `1px solid ${BD}`,
              bgcolor: SUBTLE,
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows':
                {
                  fontSize: '0.78rem',
                  color: T.muted,
                },
            }}
          />
        </SectionCard>
    </Box>
  );
};

export default AuditLogs;
