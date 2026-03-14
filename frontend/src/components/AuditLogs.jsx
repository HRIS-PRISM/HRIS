import API_BASE_URL from "../apiConfig";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
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
} from "@mui/material";
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
} from "@mui/icons-material";
import { getUserInfo } from "../utils/auth";
import usePageAccess from '../hooks/usePageAccess';
import AccessDenied from './AccessDenied';
import { useSocket } from '../contexts/SocketContext';

// Get auth headers function
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };
};

// System Settings Hook
const useSystemSettings = () => {
  const [settings, setSettings] = useState({
    primaryColor: "#894444",
    secondaryColor: "#6d2323",
    accentColor: "#FEF9E1",
    textColor: "#FFFFFF",
    textPrimaryColor: "#6D2323",
    textSecondaryColor: "#FEF9E1",
    hoverColor: "#6D2323",
    backgroundColor: "#FFFFFF",
  });

  useEffect(() => {
    const storedSettings = localStorage.getItem("systemSettings");
    if (storedSettings) {
      try {
        const parsedSettings = JSON.parse(storedSettings);
        if (parsedSettings && typeof parsedSettings === "object") {
          setSettings(parsedSettings);
        }
      } catch (error) {
        console.error("Error parsing stored settings:", error);
      }
    }

    const fetchSettings = async () => {
      try {
        const url = API_BASE_URL.includes("/api")
          ? `${API_BASE_URL}/system-settings`
          : `${API_BASE_URL}/api/system-settings`;

        const response = await axios.get(url, getAuthHeaders());
        if (response.data && typeof response.data === "object") {
          setSettings(response.data);
          localStorage.setItem("systemSettings", JSON.stringify(response.data));
        }
      } catch (error) {
        console.error("Error fetching system settings:", error);
      }
    };

    fetchSettings();
  }, []);

  return settings;
};

const AuditLogs = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [actionFilter, setActionFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [toast, setToast] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(true);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [sessionTimer, setSessionTimer] = useState(600); // 10 minutes in seconds
  const [sessionWarningShown, setSessionWarningShown] = useState(false);
  const [sessionWarningOpen, setSessionWarningOpen] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [expandedOfficialDetails, setExpandedOfficialDetails] = useState({});
  const LOGS_PER_PAGE = 10;
  const logScrollRef = useRef(null);

  const SESSION_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
  const LOG_LIST_HEIGHT = 500;

  const settings = useSystemSettings();
  const { socket, connected } = useSocket();

    //ACCESSING
    // Dynamic page access control using component identifier
    // The identifier 'philhealth' should match the component_identifier in the pages table
    const {
      hasAccess,
      loading: accessLoading,
      error: accessError,
    } = usePageAccess('audit-logs');
    // ACCESSING END


  // Memoized styled components
  const GlassCard = useMemo(
    () =>
      styled(Card)(({ theme }) => ({
        borderRadius: 20,
        background: `${settings?.accentColor || "#FEF9E1"}F2`,
        backdropFilter: "blur(10px)",
        boxShadow: `0 8px 40px ${settings?.primaryColor || "#894444"}14`,
        border: `1px solid ${settings?.primaryColor || "#894444"}1A`,
        overflow: "hidden",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          boxShadow: `0 12px 48px ${settings?.primaryColor || "#894444"}26`,
          transform: "translateY(-4px)",
        },
      })),
    [settings]
  );

  const ProfessionalButton = useMemo(
    () =>
      styled(Button)(({ theme, variant }) => ({
        borderRadius: 12,
        fontWeight: 600,
        padding: "12px 24px",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        textTransform: "none",
        fontSize: "0.95rem",
        letterSpacing: "0.025em",
        boxShadow:
          variant === "contained"
            ? `0 4px 14px ${settings?.primaryColor || "#894444"}40`
            : "none",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow:
            variant === "contained"
              ? `0 6px 20px ${settings?.primaryColor || "#894444"}59`
              : "none",
        },
        "&:active": {
          transform: "translateY(0)",
        },
      })),
    [settings]
  );

  const ModernTextField = useMemo(
    () =>
      styled(TextField)(({ theme }) => ({
        "& .MuiOutlinedInput-root": {
          borderRadius: 12,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          "&:hover": {
            transform: "translateY(-1px)",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
          },
          "&.Mui-focused": {
            transform: "translateY(-1px)",
            boxShadow: `0 4px 20px ${settings?.primaryColor || "#894444"}40`,
            backgroundColor: "rgba(255, 255, 255, 1)",
          },
        },
        "& .MuiInputLabel-root": {
          fontWeight: 500,
        },
      })),
    [settings]
  );

  // Session management
  const isSessionValid = () => {
    const sessionData = sessionStorage.getItem("auditLogsSession");
    if (!sessionData) return false;

    try {
      const { timestamp } = JSON.parse(sessionData);
      const now = Date.now();
      const sessionAge = now - timestamp;
      return sessionAge < SESSION_DURATION;
    } catch (error) {
      return false;
    }
  };

  const storeSession = () => {
    const sessionData = {
      timestamp: Date.now(),
      authenticated: true,
    };
    sessionStorage.setItem("auditLogsSession", JSON.stringify(sessionData));
  };

  const clearSession = () => {
    sessionStorage.removeItem("auditLogsSession");
    setIsAuthenticated(false);
    setPasswordDialogOpen(true);
  };

  // Format timer display
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get timer color based on remaining time
  const getTimerColor = (seconds) => {
    if (seconds < 120) return "#ef4444"; // Red - less than 2 mins
    if (seconds < 300) return "#f59e0b"; // Orange - less than 5 mins
    return "#10b981"; // Green - more than 5 mins
  };

  // Get current user
  useEffect(() => {
    const userInfo = getUserInfo();
    if (userInfo) {
      setCurrentUser(userInfo);
      setUserRole(userInfo.role);
    }
  }, []);

  // Check session on mount
  useEffect(() => {
    if (isSessionValid()) {
      setIsAuthenticated(true);
      setPasswordDialogOpen(false);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  // Session timer countdown
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const sessionData = sessionStorage.getItem("auditLogsSession");
      if (!sessionData) {
        clearSession();
        return;
      }

      try {
        const { timestamp } = JSON.parse(sessionData);
        const now = Date.now();
        const elapsed = now - timestamp;
        const remaining = SESSION_DURATION - elapsed;

        if (remaining <= 0) {
          clearSession();
          setToast({
            message: "Session expired. Please re-authenticate.",
            type: "error",
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
        // Deduplicate by id in case both role-room and personal-room deliver the same event
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
        getAuthHeaders()
      );

      if (response.data && Array.isArray(response.data)) {
        setAuditLogs(response.data);
      } else {
        setAuditLogs([]);
      }
    } catch (error) {
      console.error("Error loading audit logs:", error);
      setAuditLogs([]);
      setToast({ message: "Failed to load audit logs", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAuditLogs();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    setAuditPage(1);
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = 0;
    }
  }, [actionFilter, moduleFilter, dateFilter, employeeFilter, isAuthenticated]);



  // Filter logs
  useEffect(() => {
    let filtered = [...auditLogs];

    if (userRole && userRole !== "administrator" && userRole !== "superadmin" && userRole !== "technical") {
      filtered = filtered.filter(
        (log) => log.employeeNumber === currentUser?.employeeNumber
      );
    }

    if (employeeFilter) {
      filtered = filtered.filter((log) =>
        log.employeeNumber?.toLowerCase().includes(employeeFilter.toLowerCase())
      );
    }

    if (actionFilter) {
      filtered = filtered.filter((log) =>
        normalizeAction(log.action) === actionFilter
      );
    }

    if (moduleFilter) {
      filtered = filtered.filter((log) =>
        log.table_name?.toLowerCase() === moduleFilter.toLowerCase()
      );
    }

    if (dateFilter) {
      filtered = filtered.filter((log) => {
        if (!log.timestamp) return false;
        const logDate = new Date(log.timestamp).toISOString().split("T")[0];
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
      setPasswordError("Please enter an authorized password.");
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/confidential-password/verify`,
        { password: passwordInput },
        getAuthHeaders()
      );

      if (response.data.verified) {
        setPasswordError("");
        setPasswordDialogOpen(false);
        setIsAuthenticated(true);
        storeSession();
        setToast(); //{ message: "Access granted", type: "success" }
        setPasswordInput("");
      } else {
        setPasswordError("Incorrect password. Please try again.");
        setPasswordInput("");
      }
    } catch (error) {
      console.error("Error verifying authorized password:", error);
      setPasswordError(
        error.response?.data?.error ||
          "Failed to verify password. Please try again."
      );
      setPasswordInput("");
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
    if (!action) return "#10b981";
    const a = action.toUpperCase();
    if (['DELETE','REMOVE','DESTROY'].some((k) => a.includes(k)))       return "#ef4444"; // red
    if (['RESTORE','REVERS'].some((k) => a.includes(k)))                return "#ec4899"; // rose
    if (['DEDUCT','TARDINESS'].some((k) => a.includes(k)))              return "#f97316"; // orange
    if (a.includes('ASSIGN'))                                           return "#6366f1"; // indigo
    if (a.includes('TEVL'))                                             return "#f59e0b"; // amber
    if (a.includes('VL BALANCE'))                                       return "#0d9488"; // teal
    if (['UPDATE','EDIT','MODIFY','CHANGE'].some((k) => a.includes(k))) return "#3b82f6"; // blue
    if (['VIEW','OPEN','READ'].some((k) => a.includes(k)))              return "#06b6d4"; // cyan
    if (a.includes('LOGOUT'))                                           return "#7c3aed"; // purple
    if (a.includes('LOGIN'))                                            return "#8b5cf6"; // light purple
    return "#10b981"; // green — CREATE / ADD / etc.
  };

  // ENHANCED: Get action icon for each action type
  const getActionIcon = (action) => {
    if (!action) return <AddIcon sx={{ fontSize: 16 }} />;
    const a = action.toUpperCase();
    if (['DELETE','REMOVE','DESTROY'].some((k) => a.includes(k)))       return <DeleteIcon sx={{ fontSize: 16 }} />;
    if (['RESTORE','REVERS'].some((k) => a.includes(k)))                return <RefreshIcon sx={{ fontSize: 16 }} />;
    if (['DEDUCT','TARDINESS'].some((k) => a.includes(k)))              return <RemoveIcon sx={{ fontSize: 16 }} />;
    if (a.includes('ASSIGN'))                                           return <Assignment sx={{ fontSize: 16 }} />;
    if (a.includes('TEVL'))                                             return <AddIcon sx={{ fontSize: 16 }} />;
    if (a.includes('VL BALANCE'))                                       return <Assessment sx={{ fontSize: 16 }} />;
    if (['UPDATE','EDIT','MODIFY','CHANGE'].some((k) => a.includes(k))) return <EditIcon sx={{ fontSize: 16 }} />;
    if (['VIEW','OPEN','READ'].some((k) => a.includes(k)))              return <VisibilityIcon sx={{ fontSize: 16 }} />;
    if (a.includes('LOGOUT'))                                           return <LockIcon sx={{ fontSize: 16 }} />;
    if (a.includes('LOGIN'))                                            return <LockOpenIcon sx={{ fontSize: 16 }} />;
    return <AddIcon sx={{ fontSize: 16 }} />;
  };

  // Format audit log entry with color-coded action
  const formatAuditLog = (log) => {
    if (log.table_name === 'leave_transaction' || log._isTransaction) {
      const ts = log.timestamp ? new Date(log.timestamp) : null;
      const formattedTime =
        ts && !isNaN(ts)
          ? `${ts.toLocaleDateString()} ${ts.toLocaleTimeString()}`
          : "No Date";
      const safeMessage = (log.action || log.message || "No message")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `[${formattedTime}] - <strong>Employee ${log.employeeNumber || "Unknown"}</strong>: ${safeMessage}`;
    }

    const timestamp = new Date(log.timestamp);
    const formattedTime = `${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`;
    const employeeNumber = log.employeeNumber || "Unknown";
    const action = log.action?.toUpperCase() || "UNKNOWN";
    const actionColor = getActionColor(log.action);
    const module = log.table_name?.toUpperCase() || "UNKNOWN";
    const recordId = log.record_id ? ` #${log.record_id}` : "";
    const targetEmployee = log.targetEmployeeNumber
      ? ` (Target: ${log.targetEmployeeNumber})`
      : "";

    let logString = `[${formattedTime}] - `;
    logString += `<strong>Employee ${employeeNumber}</strong> `;
    logString += `performed <strong style="color: ${actionColor};">${action}</strong> `;
    logString += `on <strong>${module}${recordId}</strong>${targetEmployee}.`;

    return logString;
  };

  // Export audit log
  const handleExportLog = () => {
    let csv =
      "Timestamp,Employee Number,Action,Table Name,Record ID,Target Employee\n";

    filteredLogs.forEach((log) => {
      const timestamp = new Date(
        log.timestamp || log.created_at
      ).toLocaleString();
      csv += `"${timestamp}","${log.employeeNumber || "Unknown"}","${
        log.action || "N/A"
      }","${log.table_name || "N/A"}","${log.record_id || "N/A"}","${
        log.targetEmployeeNumber || "N/A"
      }"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().split("T")[0]}.csv`;
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
    DELETED:          ["DELETE", "REMOVE", "DESTROY"],
    REVERSED:         ["RESTORE", "REVERS"],
    DEDUCTED:         ["DEDUCT", "TARDINESS"],
    "ASSIGNED LEAVE": ["ASSIGN"],
    TEVL:             ["TEVL"],
    "VL BALANCE":     ["VL BALANCE"],
    UPDATE:           ["UPDATE", "EDIT", "MODIFY", "CHANGE"],
    VIEW:             ["VIEW", "OPEN", "READ"],
    CREATE:           ["ADD", "INSERT", "CREATE", "REGISTER"],
  };

  // Normalize first the action before putting on map
  const normalizeAction = (action) => {
    if (typeof action !== "string") return null;
    

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
        auditLogs
          .map((log) => normalizeAction(log.action))
          .filter(Boolean)
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

  // Format module name to match how it appears in log entries (e.g. "audit-logs" → "AUDIT_LOGS")
  const formatModuleName = (tableName) => {
    if (!tableName) return "";
    return tableName.toUpperCase().replace(/[\s\-]+/g, "_");
  };

  // Build a clean readable sentence for each audit log entry
  const buildLogDescription = (log) => {
    const actor = log.employeeNumber ? `Employee #${log.employeeNumber}` : 'Unknown user';
    const action = log.action?.toLowerCase() || 'performed an action';
    const module = log.table_name ? formatModuleName(log.table_name) : 'the system';
    const recordHint = log.record_id ? ` (Record #${log.record_id})` : '';
    const targetHint = log.targetEmployeeNumber ? ` on employee #${log.targetEmployeeNumber}` : '';
    return `${actor} performed ${action} on ${module}${recordHint}${targetHint}.`;
  };

  const isOfficialTimeModule = (tableName) => {
    const t = String(tableName || "").toLowerCase();
    return (
      t.includes("official time") ||
      t.includes("official_time") ||
      t.includes("officialtime")
    );
  };

  const parseAuditDetails = (raw) => {
    if (!raw) return null;
    if (typeof raw === "object") return raw;
    if (typeof raw !== "string") return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  };

  const getOfficialTimeAuditSnapshot = (log) => {
    if (!isOfficialTimeModule(log?.table_name)) return null;
    const details = parseAuditDetails(log?.details_json);
    if (!details || typeof details !== "object") return null;

    if (Array.isArray(details.records) && details.records.length > 0) {
      return details;
    }

    // Excel uploads store grouped schedules; flatten for a single audit preview table.
    if (Array.isArray(details.schedules) && details.schedules.length > 0) {
      const flattenedRecords = details.schedules.flatMap((schedule) => {
        const list = Array.isArray(schedule?.records) ? schedule.records : [];
        return list.map((r) => ({
          ...r,
          employeeID:
            r?.employeeID || schedule?.employeeID || details?.employeeID || null,
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

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / LOGS_PER_PAGE));
  const pagedLogs = filteredLogs.slice((auditPage - 1) * LOGS_PER_PAGE, auditPage * LOGS_PER_PAGE);

  const virtualizationRange = { startIndex: 0, endIndex: -1 }; // kept to avoid ref errors
  const visibleLogs = pagedLogs;
  const topSpacerHeight = 0;
  const bottomSpacerHeight = 0;


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
    if (!accessLoading && hasAccess !== true) {
      return (
        <AccessDenied
          title="Access Denied"
          message="You do not have permission to access PhilHealth Table. Contact your administrator to request access."
          returnPath="/admin-home"
          returnButtonText="Return to Home"
        />
      );
    }
    //ACCESSING END2


  // Show password dialog if not authenticated
  if (!isAuthenticated) {
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
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333' }}>
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
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 2, color: '#333' }}>
                Access Control Notice
              </Typography>
              <Box sx={{ pl: 1 }}>
                <Typography variant="body2" sx={{ color: '#666', mb: 1, display: 'flex', alignItems: 'flex-start' }}>
                  <Box component="span" sx={{ mr: 1, color: settings?.primaryColor || '#894444' }}>•</Box>
                  <Box>Access to this module is restricted to authorized personnel only</Box>
                </Typography>
                <Typography variant="body2" sx={{ color: '#666', mb: 1, display: 'flex', alignItems: 'flex-start' }}>
                  <Box component="span" sx={{ mr: 1, color: settings?.primaryColor || '#894444' }}>•</Box>
                  <Box>For security compliance, sessions are limited to 10 minutes</Box>
                </Typography>
                <Typography variant="body2" sx={{ color: '#666', display: 'flex', alignItems: 'flex-start' }}>
                  <Box component="span" sx={{ mr: 1, color: settings?.primaryColor || '#894444' }}>•</Box>
                  <Box>Re-authentication will be required upon session expiration</Box>
                </Typography>
              </Box>
            </Alert>

            <TextField
              autoFocus
              margin="dense"
              label="Enter Authorized Password"
              type={showPassword ? "text" : "password"}
              fullWidth
              variant="outlined"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setPasswordError("");
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
                    backgroundColor: alpha(settings?.primaryColor || '#894444', 0.08),
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

  const isAdmin = userRole === "administrator" || userRole === "superadmin" || userRole === "technical";
  const pageTitle = isAdmin ? "Audit Trail (All Users)" : "My Activity Log";

  return (
    <Box
      sx={{
        py: 4,
        borderRadius: "14px",
        width: "100vw",
        mx: "auto",
        maxWidth: "100%",
        overflow: "hidden",
        position: "relative",
        left: "50%",
        transform: "translateX(-50%)",
        minHeight: "92vh",
      }}
    >
      <Box sx={{ px: 6, mx: "auto", maxWidth: "1600px" }}>
        {/* Header */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }}>
            <GlassCard>
              <Box
                sx={{
                  p: 5,
                  background: `linear-gradient(135deg, ${
                    settings?.accentColor || "#FEF9E1"
                  } 0%, ${alpha(
                    settings?.accentColor || "#FEF9E1",
                    0.9
                  )} 100%)`,
                  color: settings?.primaryColor || "#894444",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    top: -50,
                    right: -50,
                    width: 200,
                    height: 200,
                    background: `radial-gradient(circle, ${alpha(
                      settings?.primaryColor || "#894444",
                      0.1
                    )} 0%, ${alpha(
                      settings?.primaryColor || "#894444",
                      0
                    )} 70%)`,
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    bottom: -30,
                    left: "30%",
                    width: 150,
                    height: 150,
                    background: `radial-gradient(circle, ${alpha(
                      settings?.primaryColor || "#894444",
                      0.08
                    )} 0%, ${alpha(
                      settings?.primaryColor || "#894444",
                      0
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
                          settings?.primaryColor || "#894444",
                          0.15
                        ),
                        mr: 4,
                        width: 64,
                        height: 64,
                        boxShadow: `0 8px 24px ${alpha(
                          settings?.primaryColor || "#894444",
                          0.15
                        )}`,
                      }}
                    >
                      <Security
                        sx={{
                          fontSize: 32,
                          color: settings?.primaryColor || "#894444",
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
                          color: settings?.primaryColor || "#894444",
                        }}
                      >
                        {pageTitle}
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          opacity: 0.8,
                          fontWeight: 400,
                          color: settings?.textPrimaryColor || "#6D2323",
                        }}
                      >
                        {isAdmin
                          ? "System-wide activity tracking and security monitoring"
                          : "Your personal activity history and access logs"}
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip
                      label={`${filteredLogs.length} Logs`}
                      size="small"
                      sx={{
                        bgcolor: alpha(
                          settings?.primaryColor || "#894444",
                          0.15
                        ),
                        color: settings?.primaryColor || "#894444",
                        fontWeight: 500,
                        "& .MuiChip-label": { px: 1 },
                      }}
                    />

                    {/* Session Timer with Enhanced Tooltip */}
                    <Tooltip
                      title={
                        <Box>
                          <Typography variant="body2">Session expires in {formatTimer(sessionTimer)}</Typography>
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                            For security purposes, access to audit logs is limited to 10-minute sessions
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
                          fontSize: "0.9rem",
                          border: `2px solid ${alpha(getTimerColor(sessionTimer), 0.3)}`,
                          "& .MuiChip-label": { px: 1.5 },
                          "& .MuiChip-icon": {
                            color: getTimerColor(sessionTimer),
                            animation: sessionTimer < 120 ? "pulse 1s infinite" : "none",
                          },
                          "@keyframes pulse": {
                            "0%, 100%": { opacity: 1 },
                            "50%": { opacity: 0.5 },
                          },
                          cursor: "pointer"
                        }}
                      />
                    </Tooltip>

                    <Tooltip title="Refresh Logs">
                      <IconButton
                        onClick={handleRefresh}
                        disabled={loading}
                        sx={{
                          bgcolor: alpha(
                            settings?.primaryColor || "#894444",
                            0.1
                          ),
                          "&:hover": {
                            bgcolor: alpha(
                              settings?.primaryColor || "#894444",
                              0.2
                            ),
                          },
                          color: settings?.primaryColor || "#894444",
                          width: 48,
                          height: 48,
                          "&:disabled": {
                            bgcolor: alpha(
                              settings?.primaryColor || "#894444",
                              0.05
                            ),
                            color: alpha(
                              settings?.primaryColor || "#894444",
                              0.3
                            ),
                          },
                        }}
                      >
                        {loading ? (
                          <CircularProgress
                            size={24}
                            sx={{ color: settings?.primaryColor || "#894444" }}
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
                          bgcolor: settings?.primaryColor || "#894444",
                          color: settings?.accentColor || "#FEF9E1",
                          "&:hover": {
                            bgcolor: settings?.secondaryColor || "#6d2323",
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
        {toast && toast.type === "success" && (
          <Backdrop
            open={true}
            sx={{
              zIndex: 9999,
              backdropFilter: "blur(8px)",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            }}
            onClick={() => setToast(null)}
          >
            <Fade in timeout={300}>
              <Box
                onClick={(e) => e.stopPropagation()}
                sx={{
                  position: "relative",
                  minWidth: "400px",
                  maxWidth: "600px",
                }}
              >
                <Alert
                  severity="success"
                  sx={{
                    borderRadius: 4,
                    boxShadow: "0 12px 48px rgba(0, 0, 0, 0.4)",
                    fontSize: "1.1rem",
                    p: 3,
                    "& .MuiAlert-message": { fontWeight: 500 },
                    "& .MuiAlert-icon": { fontSize: "2rem" },
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
        {toast && toast.type === "error" && (
          <Backdrop
            open={true}
            sx={{
              zIndex: 9999,
              backdropFilter: "blur(8px)",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            }}
            onClick={() => setToast(null)}
          >
            <Fade in timeout={300}>
              <Box
                onClick={(e) => e.stopPropagation()}
                sx={{
                  position: "relative",
                  minWidth: "400px",
                  maxWidth: "600px",
                }}
              >
                <Alert
                  severity="error"
                  sx={{
                    borderRadius: 4,
                    boxShadow: "0 12px 48px rgba(0, 0, 0, 0.4)",
                    fontSize: "1.1rem",
                    p: 3,
                    "& .MuiAlert-message": { fontWeight: 500 },
                    "& .MuiAlert-icon": { fontSize: "2rem" },
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
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: alpha(settings?.accentColor || "#FEF9E1", 0.8),
                      color: settings?.textPrimaryColor || "#6D2323",
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
                        color: settings?.textPrimaryColor || "#6D2323",
                      }}
                    >
                      Search & Filter
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ color: settings?.textPrimaryColor || "#6D2323" }}
                    >
                      Find and filter audit logs by various criteria
                    </Typography>
                  </Box>
                </Box>
              }
              sx={{
                bgcolor: alpha(settings?.accentColor || "#FEF9E1", 0.5),
                pb: 2,
                borderBottom: `1px solid ${alpha(
                  settings?.primaryColor || "#894444",
                  0.1
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
                          <SearchIcon sx={{ color: settings?.primaryColor || "#894444", fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: employeeFilter ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setEmployeeFilter("")}>
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
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
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
            color: settings?.accentColor || "#FEF9E1",
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
          open={loading && !refreshing}
        >
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress color="inherit" size={60} thickness={4} />
            <Typography
              variant="h6"
              sx={{ mt: 2, color: settings?.accentColor || "#FEF9E1" }}
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
                    settings?.accentColor || "#FEF9E1"
                  } 0%, ${alpha(
                    settings?.accentColor || "#FEF9E1",
                    0.9
                  )} 100%)`,
                  color: settings?.primaryColor || "#894444",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: `1px solid ${alpha(
                    settings?.primaryColor || "#894444",
                    0.1
                  )}`,
                }}
              >
                <Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      color: settings?.primaryColor || "#894444",
                    }}
                  >
                    {isAdmin ? "System Activity Log" : "My Activity History"}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      opacity: 0.8,
                      color: settings?.textPrimaryColor || "#6D2323",
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
                  overflowY: "auto",
                  p: 3,
                  "&::-webkit-scrollbar": { width: "8px" },
                  "&::-webkit-scrollbar-track": { background: alpha(settings?.accentColor || "#FEF9E1", 0.2), borderRadius: "4px" },
                  "&::-webkit-scrollbar-thumb": { background: alpha(settings?.primaryColor || "#894444", 0.5), borderRadius: "4px", "&:hover": { background: alpha(settings?.primaryColor || "#894444", 0.7) } },
                }}
              >
                {filteredLogs.length === 0 ? (
                  <Box
                    sx={{
                      textAlign: "center",
                      py: 8,
                      color: "#666",
                    }}
                  >
                    <Info
                      sx={{
                        fontSize: 80,
                        color: alpha(settings?.primaryColor || "#894444", 0.3),
                        mb: 3,
                      }}
                    />
                    <Typography
                      variant="h6"
                      sx={{ mb: 1, color: settings?.primaryColor || "#894444" }}
                    >
                      No audit logs found
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: alpha(settings?.primaryColor || "#894444", 0.6),
                      }}
                    >
                      {isAdmin
                        ? "System activities will be logged here"
                        : "Your activities will be logged here"}
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    {topSpacerHeight > 0 && (
                      <Box sx={{ height: `${topSpacerHeight}px` }} />
                    )}
                    {visibleLogs.map((log, index) => {
                      const virtualIndex = index;
                      const rowKey = log.id || `${virtualIndex}-${log.timestamp || "no-time"}`;
                      const actionColor = getActionColor(log.action);
                      const actionBg = alpha(actionColor, 0.1);
                      const officialSnapshot = getOfficialTimeAuditSnapshot(log);
                      const hasOfficialSnapshot =
                        officialSnapshot &&
                        Array.isArray(officialSnapshot.records) &&
                        officialSnapshot.records.length > 0;
                      const isOfficialExpanded = !!expandedOfficialDetails[rowKey];

                      const ts = log.timestamp ? new Date(log.timestamp) : null;
                      const timeLabel = ts && !isNaN(ts)
                        ? `${ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • ${ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                        : null;

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
                            '&:hover': { boxShadow: `0 4px 16px ${alpha(actionColor, 0.12)}` },
                          }}
                        >
                          {/* Row 1: WHAT + WHEN */}
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25, flexWrap: 'wrap', gap: 1 }}>
                            <Box sx={{
                              display: 'inline-flex', alignItems: 'center', gap: 0.6,
                              px: 1.25, py: 0.35, borderRadius: '6px',
                              bgcolor: actionBg, border: `1px solid ${alpha(actionColor, 0.2)}`,
                            }}>
                              {React.cloneElement(getActionIcon(log.action), { sx: { fontSize: 13, color: actionColor } })}
                              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: actionColor, lineHeight: 1 }}>
                                {log.action?.toUpperCase() || 'UNKNOWN'}
                              </Typography>
                            </Box>
                            {timeLabel && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <AccessTime sx={{ fontSize: 12, color: '#c0c0c0' }} />
                                <Typography variant="caption" sx={{ color: '#b0b0b0', fontSize: '0.72rem' }}>
                                  {timeLabel}
                                </Typography>
                              </Box>
                            )}
                          </Box>

                          {/* Row 2: WHO */}
                          <Box sx={{ display: 'flex', gap: 1.5, mb: 1.25, flexWrap: 'wrap' }}>
                            {log.employeeNumber && (
                              <Box sx={{
                                display: 'flex', alignItems: 'center', gap: 0.75,
                                px: 1.25, py: 0.6,
                                bgcolor: alpha(settings?.primaryColor || '#894444', 0.06),
                                borderRadius: '8px',
                                border: `1px solid ${alpha(settings?.primaryColor || '#894444', 0.15)}`,
                              }}>
                                <Person sx={{ fontSize: 14, color: settings?.primaryColor || '#894444' }} />
                                <Box>
                                  <Typography sx={{ fontSize: '0.62rem', color: '#aaa', lineHeight: 1, mb: 0.2, fontWeight: 600, letterSpacing: '0.04em' }}>
                                    PERFORMED BY
                                  </Typography>
                                  {log.actorName && (
                                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: settings?.primaryColor || '#894444', lineHeight: 1.2 }}>
                                      {log.actorName}
                                    </Typography>
                                  )}
                                  <Typography sx={{ fontSize: '0.68rem', color: '#888', lineHeight: 1, mt: log.actorName ? 0.2 : 0 }}>
                                    #{log.employeeNumber}
                                  </Typography>
                                </Box>
                              </Box>
                            )}

                            {log.targetEmployeeNumber && (
                              <Box sx={{
                                display: 'flex', alignItems: 'center', gap: 0.75,
                                px: 1.25, py: 0.6,
                                bgcolor: alpha('#1565C0', 0.05),
                                borderRadius: '8px',
                                border: '1px solid rgba(21,101,192,0.15)',
                                ml: 'auto',
                              }}>
                                <Person sx={{ fontSize: 14, color: '#1565C0' }} />
                                <Box>
                                  <Typography sx={{ fontSize: '0.62rem', color: '#aaa', lineHeight: 1, mb: 0.2, fontWeight: 600, letterSpacing: '0.04em' }}>
                                    EMPLOYEE
                                  </Typography>
                                  {log.targetName && (
                                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#1565C0', lineHeight: 1.2 }}>
                                      {log.targetName}
                                    </Typography>
                                  )}
                                  <Typography sx={{ fontSize: '0.68rem', color: '#888', lineHeight: 1, mt: log.targetName ? 0.2 : 0 }}>
                                    #{log.targetEmployeeNumber}
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                          </Box>

                          {/* Row 3: Clean sentence */}
                          <Typography sx={{ fontSize: '0.85rem', color: '#444', lineHeight: 1.65, fontWeight: 400 }}>
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
                                  textTransform: "none",
                                  fontWeight: 700,
                                  borderColor: alpha(settings?.primaryColor || "#894444", 0.3),
                                  color: settings?.primaryColor || "#894444",
                                  fontSize: "0.75rem",
                                  py: 0.35,
                                  px: 1,
                                }}
                              >
                                {isOfficialExpanded
                                  ? "Hide official time schedule record"
                                  : "View official time schedule record"}
                              </Button>

                              {isOfficialExpanded && (
                                <Box
                                  sx={{
                                    mt: 1.2,
                                    borderRadius: 1.5,
                                    border: `1px solid ${alpha(settings?.primaryColor || "#894444", 0.2)}`,
                                    bgcolor: alpha(settings?.accentColor || "#FEF9E1", 0.45),
                                    p: 1.25,
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                      color: alpha(settings?.primaryColor || "#894444", 0.85),
                                      textTransform: "uppercase",
                                      letterSpacing: "0.03em",
                                      mb: 0.75,
                                    }}
                                  >
                                    Official Time Schedule Snapshot (Stored in Audit)
                                  </Typography>

                                  <Typography sx={{ fontSize: "0.74rem", color: "#555", mb: 0.75 }}>
                                    Employee: #{officialSnapshot.employeeID || log.targetEmployeeNumber || "N/A"}
                                    {officialSnapshot.startDate ? ` | Start: ${officialSnapshot.startDate}` : ""}
                                    {officialSnapshot.endDate ? ` | End: ${officialSnapshot.endDate}` : ""}
                                    {officialSnapshot.academicYear
                                      ? ` | Academic Year: ${officialSnapshot.academicYear}`
                                      : ""}
                                  </Typography>

                                  <Box sx={{ overflowX: "auto" }}>
                                    <Box
                                      sx={{
                                        minWidth: 860,
                                        border: "1px solid rgba(0,0,0,0.08)",
                                        borderRadius: 1,
                                        bgcolor: "#fff",
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          display: "grid",
                                          gridTemplateColumns:
                                            "120px repeat(4, 120px) 150px 150px 150px",
                                          px: 1,
                                          py: 0.7,
                                          bgcolor: alpha(settings?.primaryColor || "#894444", 0.08),
                                          borderBottom: "1px solid rgba(0,0,0,0.08)",
                                          fontSize: "0.7rem",
                                          fontWeight: 700,
                                          color: settings?.primaryColor || "#894444",
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

                                      {officialSnapshot.records.map((r, idx2) => {
                                        const honorarium = `${r.officialHonorariumTimeIN || "-"} -> ${
                                          r.officialHonorariumTimeOUT || "-"
                                        }`;
                                        const serviceCredit = `${
                                          r.officialServiceCreditTimeIN || "-"
                                        } -> ${r.officialServiceCreditTimeOUT || "-"}`;
                                        const overtime = `${r.officialOverTimeIN || "-"} -> ${
                                          r.officialOverTimeOUT || "-"
                                        }`;

                                        return (
                                          <Box
                                            key={`${rowKey}-record-${idx2}`}
                                            sx={{
                                              display: "grid",
                                              gridTemplateColumns:
                                                "120px repeat(4, 120px) 150px 150px 150px",
                                              px: 1,
                                              py: 0.65,
                                              borderBottom:
                                                idx2 < officialSnapshot.records.length - 1
                                                  ? "1px solid rgba(0,0,0,0.05)"
                                                  : "none",
                                              fontSize: "0.72rem",
                                              color: "#333",
                                              bgcolor: idx2 % 2 === 0 ? "#fff" : "#fafafa",
                                              fontFamily: "monospace",
                                            }}
                                          >
                                            <Box sx={{ fontFamily: "inherit", fontWeight: 700 }}>
                                              {r.day || "-"}
                                            </Box>
                                            <Box>{r.officialTimeIN || "-"}</Box>
                                            <Box>{r.officialBreaktimeIN || "-"}</Box>
                                            <Box>{r.officialBreaktimeOUT || "-"}</Box>
                                            <Box>{r.officialTimeOUT || "-"}</Box>
                                            <Box>{honorarium}</Box>
                                            <Box>{serviceCredit}</Box>
                                            <Box>{overtime}</Box>
                                          </Box>
                                        );
                                      })}
                                    </Box>
                                  </Box>

                                  {officialSnapshot.truncated && (
                                    <Typography sx={{ fontSize: "0.72rem", color: "#b25c00", mt: 0.8 }}>
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
                  borderTop: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  px: 3,
                  flexWrap: "wrap",
                  gap: 2,
                  backgroundColor: alpha(settings?.accentColor || "#FEF9E1", 0.5),
                }}
              >
                <Typography sx={{ color: "#666", fontSize: "14px" }}>
                  <strong>Total Logs:</strong> {filteredLogs.length}{" "}
                  <span style={{ color: "#999" }}>
                    | Showing {filteredLogs.length === 0 ? 0 : (auditPage - 1) * LOGS_PER_PAGE + 1}–{Math.min(auditPage * LOGS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length}
                  </span>
                </Typography>

                {/* Pagination controls */}
                {totalPages > 1 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      disabled={auditPage === 1}
                      onClick={() => { setAuditPage((p) => p - 1); logScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      sx={{
                        width: 30, height: 30, borderRadius: '8px',
                        border: `1px solid ${alpha(settings?.primaryColor || '#894444', auditPage === 1 ? 0.1 : 0.25)}`,
                        color: auditPage === 1 ? '#ccc' : settings?.primaryColor || '#894444',
                        '&:hover': { bgcolor: alpha(settings?.primaryColor || '#894444', 0.06) },
                      }}
                    >
                      <Box component="span" sx={{ fontSize: '1rem', lineHeight: 1, fontWeight: 600 }}>‹</Box>
                    </IconButton>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - auditPage) <= 2)
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, idx) =>
                        item === '...' ? (
                          <Typography key={`ellipsis-${idx}`} sx={{ px: 0.5, color: '#aaa', fontSize: '0.85rem' }}>…</Typography>
                        ) : (
                          <IconButton
                            key={item}
                            size="small"
                            onClick={() => { setAuditPage(item); logScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            sx={{
                              width: 30, height: 30, borderRadius: '8px',
                              fontSize: '0.78rem',
                              fontWeight: item === auditPage ? 700 : 400,
                              bgcolor: item === auditPage ? (settings?.primaryColor || '#894444') : 'transparent',
                              color: item === auditPage ? '#fff' : '#666',
                              border: `1px solid ${item === auditPage ? (settings?.primaryColor || '#894444') : alpha(settings?.primaryColor || '#894444', 0.15)}`,
                              '&:hover': { bgcolor: item === auditPage ? (settings?.primaryColor || '#894444') : alpha(settings?.primaryColor || '#894444', 0.06) },
                            }}
                          >
                            {item}
                          </IconButton>
                        )
                      )
                    }

                    <IconButton
                      size="small"
                      disabled={auditPage === totalPages}
                      onClick={() => { setAuditPage((p) => p + 1); logScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      sx={{
                        width: 30, height: 30, borderRadius: '8px',
                        border: `1px solid ${alpha(settings?.primaryColor || '#894444', auditPage === totalPages ? 0.1 : 0.25)}`,
                        color: auditPage === totalPages ? '#ccc' : settings?.primaryColor || '#894444',
                        '&:hover': { bgcolor: alpha(settings?.primaryColor || '#894444', 0.06) },
                      }}
                    >
                      <Box component="span" sx={{ fontSize: '1rem', lineHeight: 1, fontWeight: 600 }}>›</Box>
                    </IconButton>
                  </Box>
                )}
              </Box>
            </GlassCard>
          </Fade>
        )}
      </Box>

      {/* Session Warning Modal - Pop-up when 2 minutes remaining */}
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
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333' }}>
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
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 1, color: '#333' }}>
                Time Remaining: {formatTimer(sessionTimer)}
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                For security purposes, your session will automatically expire. 
                You will need to re-authenticate to continue accessing the audit logs.
              </Typography>
            </Alert>

            {/* Action Buttons */}
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

      {/* Session Timer Indicator - Fixed Position in Bottom Right */}
      {sessionWarningShown && (
        <Fade in timeout={300}>
          <Box
            sx={{
              position: "fixed",
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
                color: "white",
                fontWeight: 600,
                fontSize: "1rem",
                border: `2px solid ${getTimerColor(sessionTimer)}`,
                "& .MuiChip-label": { px: 1.5 },
                "& .MuiChip-icon": {
                  color: "white",
                  animation: sessionTimer < 60 ? "pulse 1s infinite" : "none",
                },
                "@keyframes pulse": {
                  "0%, 100%": { opacity: 1 },
                  "50%": { opacity: 0.5 },
                },
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              }}
            />
          </Box>
        </Fade>
      )}
    </Box>
  );
};

export default AuditLogs;
