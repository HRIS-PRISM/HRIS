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
  const [virtualScrollTop, setVirtualScrollTop] = useState(0);
  const logScrollRef = useRef(null);

  const SESSION_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
  const LOG_LIST_HEIGHT = 500;
  const LOG_ROW_HEIGHT = 120;
  const LOG_OVERSCAN = 8;

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
    setVirtualScrollTop(0);
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = 0;
    }
  }, [actionFilter, moduleFilter, dateFilter, employeeFilter, isAuthenticated]);



  // Filter logs
  useEffect(() => {
    let filtered = [...auditLogs];

    if (userRole && userRole !== "administrator" && userRole !== "superadmin") {
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
    if (!action) return "#6b7280";
    const actionUpper = action.toUpperCase();
    const colors = {
      // Creation actions - Green shades
      CREATE: "#10b981", // Emerald green
      INSERT: "#059669", // Darker green

      // Modification actions - Blue shades
      UPDATE: "#3b82f6", // Blue
      EDIT: "#2563eb", // Darker blue

      // Deletion actions - Red shades
      DELETE: "#ef4444", // Red
      REMOVE: "#dc2626", // Darker red

      // Authentication actions - Purple shades
      LOGIN: "#8b5cf6", // Purple
      LOGOUT: "#7c3aed", // Darker purple

      // View/Read actions - Cyan shades
      VIEW: "#06b6d4", // Cyan
      SEARCH: "#0891b2", // Darker cyan

      // Export/Report actions - Orange shades
      EXPORT: "#f59e0b", // Orange
      REPORT: "#d97706", // Darker orange

      // Default
      DEFAULT: "#6b7280", // Gray
    };
    return colors[actionUpper] || colors.DEFAULT;
  };

  // ENHANCED: Get action icon for each action type
  const getActionIcon = (action) => {
    if (!action) return <CheckCircleIcon sx={{ fontSize: 16 }} />;
    const actionUpper = action.toUpperCase();
    const icons = {
      CREATE: <AddIcon sx={{ fontSize: 16 }} />,
      INSERT: <AddIcon sx={{ fontSize: 16 }} />,
      UPDATE: <EditIcon sx={{ fontSize: 16 }} />,
      EDIT: <EditIcon sx={{ fontSize: 16 }} />,
      DELETE: <RemoveIcon sx={{ fontSize: 16 }} />,
      REMOVE: <DeleteIcon sx={{ fontSize: 16 }} />,
      LOGIN: <LockOpenIcon sx={{ fontSize: 16 }} />,
      LOGOUT: <LockIcon sx={{ fontSize: 16 }} />,
      VIEW: <VisibilityIcon sx={{ fontSize: 16 }} />,
      SEARCH: <SearchIcon sx={{ fontSize: 16 }} />,
      EXPORT: <FileDownloadIcon sx={{ fontSize: 16 }} />,
      REPORT: <Assessment sx={{ fontSize: 16 }} />,
    };
    return icons[actionUpper] || <CheckCircleIcon sx={{ fontSize: 16 }} />;
  };

  // Format audit log entry with color-coded action
  const formatAuditLog = (log) => {
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
    CREATE: ["ADD", "INSERT", "CREATE", "REGISTER", "SEND", ],
    VIEW: ["VIEW", "OPEN", "READ"],
    SEARCH: ["SEARCH", "FILTER", "FIND"],
    UPDATE: ["UPDATE", "UPDATED", "EDIT", "MODIFY", "CHANGE"],
    DELETE: ["DELETE", "REMOVE", "DESTROY"],
    PRINT: ["PRINT", "EXPORT", "DOWNLOAD"],
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

    return normalized;
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

  const virtualizationRange = useMemo(() => {
    const totalItems = filteredLogs.length;
    if (totalItems === 0) {
      return { startIndex: 0, endIndex: -1 };
    }

    const startIndex = Math.max(
      Math.floor(virtualScrollTop / LOG_ROW_HEIGHT) - LOG_OVERSCAN,
      0
    );
    const endIndex = Math.min(
      totalItems - 1,
      Math.ceil((virtualScrollTop + LOG_LIST_HEIGHT) / LOG_ROW_HEIGHT) +
        LOG_OVERSCAN
    );

    return { startIndex, endIndex };
  }, [filteredLogs.length, virtualScrollTop]);

  const visibleLogs = useMemo(() => {
    if (virtualizationRange.endIndex < virtualizationRange.startIndex) {
      return [];
    }

    return filteredLogs.slice(
      virtualizationRange.startIndex,
      virtualizationRange.endIndex + 1
    );
  }, [filteredLogs, virtualizationRange]);

  const topSpacerHeight = virtualizationRange.startIndex * LOG_ROW_HEIGHT;
  const bottomSpacerHeight =
    Math.max(filteredLogs.length - virtualizationRange.endIndex - 1, 0) *
    LOG_ROW_HEIGHT;


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
                onScroll={(event) =>
                  setVirtualScrollTop(event.currentTarget.scrollTop)
                }
                sx={{
                  height: `${LOG_LIST_HEIGHT}px`,
                  overflowY: "auto",
                  p: 3,
                  "&::-webkit-scrollbar": {
                    width: "8px",
                  },
                  "&::-webkit-scrollbar-track": {
                    background: alpha(settings?.accentColor || "#FEF9E1", 0.2),
                    borderRadius: "4px",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    background: alpha(settings?.primaryColor || "#894444", 0.5),
                    borderRadius: "4px",
                    "&:hover": {
                      background: alpha(
                        settings?.primaryColor || "#894444",
                        0.7
                      ),
                    },
                  },
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
                      const virtualIndex = virtualizationRange.startIndex + index;
                      const actionColor = getActionColor(log.action);

                      return (
                        <Box
                          key={log.id || virtualIndex}
                          sx={{
                            p: 2,
                            mb: 1.5,
                            minHeight: `${LOG_ROW_HEIGHT - 12}px`,
                            backgroundColor: "#f9fafb",
                            borderLeft: `4px solid ${actionColor}`,
                            borderRadius: "8px",
                            fontFamily: "monospace",
                            fontSize: "13px",
                            lineHeight: 1.8,
                            transition: "all 0.2s ease",
                            "&:hover": {
                              backgroundColor: alpha(
                                settings?.accentColor || "#FEF9E1",
                                0.3
                              ),
                              transform: "translateX(4px)",
                              boxShadow: `0 2px 8px ${alpha(actionColor, 0.2)}`,
                            },
                          }}
                        >
                          <Box
                            sx={{
                              color: "#1f2937",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              "& strong": {
                                fontWeight: 600,
                              },
                            }}
                            dangerouslySetInnerHTML={{
                              __html: formatAuditLog(log),
                            }}
                          />
                          <Box
                            sx={{
                              mt: 1,
                              pt: 1,
                              borderTop: "1px solid #e5e7eb",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 1,
                              fontSize: "11px",
                              color: "#6b7280",
                              fontFamily: "sans-serif",
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Chip
                                icon={getActionIcon(log.action)}
                                label={log.action?.toUpperCase() || "UNKNOWN"}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: "10px",
                                  backgroundColor: actionColor,
                                  color: "white",
                                  fontWeight: 600,
                                  "& .MuiChip-icon": {
                                    color: "white",
                                  },
                                }}
                              />
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                }}
                              >
                                <CheckCircleIcon
                                  sx={{ fontSize: 14, color: "#10b981" }}
                                />
                                <Typography sx={{ fontSize: "11px" }}>
                                  Status: Success
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      );
                    })}
                    {bottomSpacerHeight > 0 && (
                      <Box sx={{ height: `${bottomSpacerHeight}px` }} />
                    )}
                  </Box>
                )}
              </Box>

              {/* Footer */}
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
                  backgroundColor: alpha(
                    settings?.accentColor || "#FEF9E1",
                    0.5
                  ),
                }}
              >
                <Typography sx={{ color: "#666", fontSize: "14px" }}>
                  <strong>Total Logs:</strong> {filteredLogs.length}{" "}
                  <span style={{ color: "#999" }}>
                    |{" "}
                    {actionFilter || moduleFilter || dateFilter
                      ? `Showing ${filteredLogs.length} of ${auditLogs.length} entries`
                      : "Showing all entries"}
                  </span>
                </Typography>
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
