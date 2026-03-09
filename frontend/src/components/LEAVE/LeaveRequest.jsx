import API_BASE_URL from '../../apiConfig';
import React, {
  useState,
  useEffect,
  useMemo,
  useDeferredValue,
  useRef,
} from 'react';
import axios from 'axios';
import { getAuthHeaders } from '../../utils/auth';
import { useSocket } from '../../contexts/SocketContext';
import {
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Chip,
  Modal,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  Card,
  CardContent,
  Avatar,
  Fade,
  Divider,
  styled,
  alpha,
  TablePagination,
  CircularProgress,
  Backdrop,
  Tooltip,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Snackbar,
  Alert,
  Checkbox,
  FormControlLabel,
  Slide,
} from '@mui/material';
import {
  Add as AddIcon,
  Close,
  EventNote,
  Search as SearchIcon,
  EventAvailable as ReorderIcon,
  Refresh,
  Person as PersonIcon,
  CalendarMonth,
  CheckCircle,
  Cancel as CancelIcon,
  AccessTime,
  Block,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Business as BusinessIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  HowToReg,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  SelectAll as SelectAllIcon,
  DoneAll as DoneAllIcon,
  ThumbDown as ThumbDownIcon,
  HistoryToggleOff,
} from '@mui/icons-material';

import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import LeaveDatePickerModal from './LeaveDatePicker';
import LeaveCredits from './LeaveCredits';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import {
  createThemedCard,
  createThemedButton,
  createThemedTextField,
} from '../../utils/theme';

// Stable themed components
const ThemedCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== 'settings',
})(({ settings = {} }) => createThemedCard(settings));

const ThemedButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'settings',
})(({ settings = {}, variant = 'contained' }) =>
  createThemedButton(settings, variant),
);

const ThemedTextField = styled(TextField, {
  shouldForwardProp: (prop) => prop !== 'settings',
})(({ settings = {} }) => createThemedTextField(settings));

const LeaveRequest = () => {
  const { socket, connected } = useSocket();
  const refreshRef = useRef(null);

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employeeNames, setEmployeeNames] = useState({});
  const [newRequest, setNewRequest] = useState({
    employeeNumber: '',
    leave_code: '',
    leave_date: '',
    status: '0',
  });
  const [editRequest, setEditRequest] = useState(null);
  const [originalRequest, setOriginalRequest] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('');
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [statusFilter, setStatusFilter] = useState('all');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [transactionLogsModalOpen, setTransactionLogsModalOpen] = useState(false);
  const [transactionLogs, setTransactionLogs] = useState([]);
  const [transactionLogsLoading, setTransactionLogsLoading] = useState(false);
  const [transactionLogsError, setTransactionLogsError] = useState('');

  const { settings } = useSystemSettings();

  // Use stable themed components
  const GlassCard = ThemedCard;
  const ProfessionalButton = ThemedButton;
  const ModernTextField = ThemedTextField;

  // Get colors from system settings
  const primaryColor = settings.accentColor || '#FEF9E1';
  const secondaryColor = settings.backgroundColor || '#FFF8E7';
  const accentColor = settings.primaryColor || '#6d2323';
  const accentDark = settings.secondaryColor || '#8B3333';
  const textPrimaryColor = settings.textPrimaryColor || '#6d2323';
  const grayColor = settings.textSecondaryColor || '#6c757d';

  // Status Configuration
  const statusOptions = [
    {
      value: '0',
      label: 'Pending Review',
      short: 'Pending',
      color: '#F57C00',
      bg: '#FFF3E0',
      icon: AccessTime,
    },
    {
      value: '1',
      label: 'Immediate Supervisor Approved',
      short: 'Immediate Supervisor Approved',
      color: '#1565C0',
      bg: '#E3F2FD',
      icon: CheckCircle,
    },
    {
      value: '2',
      label: 'HR Approved',
      short: 'HR Approved',
      color: '#2E7D32',
      bg: '#E8F5E9',
      icon: CheckCircle,
    },
    {
      value: '3',
      label: 'Denied',
      short: 'Denied',
      color: '#C62828',
      bg: '#FFEBEE',
      icon: Block,
    },
    {
      value: '4',
      label: 'Cancelled',
      short: 'Cancelled',
      color: '#757575',
      bg: '#F5F5F5',
      icon: CancelIcon,
    },
  ];

  const isSickLeave = (code) => {
    const t = leaveTypes.find((x) => x.leave_code === code);
    if (!t) return false;
    return (
      (t.leave_code || '').toLowerCase().includes('sl') ||
      (t.leave_description || '').toLowerCase().includes('sick')
    );
  };

  useEffect(() => {
    setPage(0);
  }, [deferredSearch, statusFilter, leaveTypeFilter]);
  useEffect(() => {
    fetchAll();
  }, []);

  // Keep latest fetch function for Socket.IO handler
  useEffect(() => {
    refreshRef.current = fetchAll;
  });

  // Realtime: refresh when anyone changes leave request records
  useEffect(() => {
    if (!socket || !connected) return;

    const handleChanged = () => {
      refreshRef.current?.();
    };

    socket.on('leaveRequestChanged', handleChanged);
    return () => {
      socket.off('leaveRequestChanged', handleChanged);
    };
  }, [socket, connected]);

  const fetchAll = async () => {
    try {
      const [reqRes, typeRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/leaveRoute/leave_request`, getAuthHeaders()),
        axios.get(`${API_BASE_URL}/leaveRoute/leave_table`, getAuthHeaders()),
      ]);
      setLeaveRequests(reqRes.data);
      setLeaveTypes(typeRes.data);

      const names = {};
      const empNums = [...new Set(reqRes.data.map((r) => r.employeeNumber))];
      await Promise.all(
        empNums.map(async (emp) => {
          try {
            const res = await axios.get(
              `${API_BASE_URL}/personalinfo/person_table/${emp}`,
              getAuthHeaders(),
            );
            names[emp] =
              [res.data.firstName, res.data.lastName]
                .filter(Boolean)
                .join(' ') || 'Unknown';
          } catch {
            names[emp] = 'Unknown';
          }
        }),
      );
      setEmployeeNames(names);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = async () => {
    if (
      !newRequest.employeeNumber ||
      !newRequest.leave_code ||
      !newRequest.leave_date
    ) {
      alert('Please fill all required fields');
      return;
    }

    // Validate: check if employee has enough allocated hours for this leave type
    const employeeAssignments =
      Object.values(employeeNames).length > 0
        ? Object.keys(employeeNames).filter(
            (emp) => emp === newRequest.employeeNumber,
          )
        : [];

    // Count leave dates (8 hours per day)
    const leaveDates = Array.isArray(newRequest.leave_date)
      ? newRequest.leave_date
      : newRequest.leave_date.split(',').filter((d) => d.trim());
    const hoursRequested = leaveDates.length * 8;

    // Find the leave assignment for this employee and leave type
    const creditsRes = await axios.get(
      `${API_BASE_URL}/leaveRoute/leave_assignment`,
      getAuthHeaders(),
    );
    const assignment = creditsRes.data?.assignments || [];
    const leaveAssignment = assignment.find(
      (a) =>
        a.employeeNumber?.toString() ===
          newRequest.employeeNumber?.toString() &&
        a.leave_code === newRequest.leave_code,
    );

    if (leaveAssignment) {
      const allocatedHours = parseFloat(leaveAssignment.allocated_hours) || 0;
      const usedHours = parseFloat(leaveAssignment.used_hours) || 0;
      const availableHours = allocatedHours - usedHours;

      if (availableHours < hoursRequested) {
        alert(
          `Insufficient allocated hours. ` +
            `Requested: ${(hoursRequested / 8).toFixed(1)} days, ` +
            `Available: ${(availableHours / 8).toFixed(1)} days`,
        );
        return;
      }
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/leaveRoute/leave_request`,
        {
          employeeNumber: newRequest.employeeNumber,
          leave_code: newRequest.leave_code,
          leave_dates: [newRequest.leave_date],
          status: Number(newRequest.status),
        },
        getAuthHeaders(),
      );
      setNewRequest({
        employeeNumber: '',
        leave_code: '',
        leave_date: '',
        status: '0',
      });
      setSelectedDates([]);
      setSuccessAction('adding');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      fetchAll();
    } catch (e) {
      alert('Error adding request');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      await axios.put(
        `${API_BASE_URL}/leaveRoute/leave_request/${editRequest.id}`,
        {
          employeeNumber: editRequest.employeeNumber,
          leave_code: editRequest.leave_code,
          leave_date: editRequest.leave_date,
          status: Number(editRequest.status),
        },
        getAuthHeaders(),
      );
      setEditRequest(null);
      setOriginalRequest(null);
      setIsEditing(false);
      setSuccessAction('edit');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      fetchAll();
    } catch {
      alert('Error updating request');
    }
  };

  const handleDelete = async (id, status) => {
    if (String(status) === '4') {
      alert('Cannot delete cancelled request');
      return;
    }
    if (!window.confirm('Delete this leave request?')) return;
    try {
      await axios.delete(
        `${API_BASE_URL}/leaveRoute/leave_request/${id}`,
        getAuthHeaders(),
      );
      closeModal();
      setSuccessAction('delete');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      fetchAll();
    } catch {
      alert('Error deleting request');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this leave request?')) return;
    try {
      const r = leaveRequests.find((x) => x.id === id);
      await axios.put(
        `${API_BASE_URL}/leaveRoute/leave_request/${id}`,
        { ...r, status: 4 },
        getAuthHeaders(),
      );
      closeModal();
      setSuccessAction('cancel');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      fetchAll();
    } catch {
      alert('Error cancelling request');
    }
  };

  const closeModal = () => {
    setEditRequest(null);
    setOriginalRequest(null);
    setIsEditing(false);
  };

  const hasChanges = () => {
    if (!editRequest || !originalRequest) return false;
    return (
      editRequest.employeeNumber !== originalRequest.employeeNumber ||
      editRequest.leave_code !== originalRequest.leave_code ||
      editRequest.leave_date !== originalRequest.leave_date ||
      editRequest.status !== originalRequest.status
    );
  };

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    setSelectedRequests([]);
  };

  const handleSelectRequest = (id) => {
    if (selectedRequests.includes(id)) {
      setSelectedRequests(selectedRequests.filter((reqId) => reqId !== id));
    } else {
      setSelectedRequests([...selectedRequests, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedRequests.length === paged.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(paged.map((req) => req.id));
    }
  };

  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedRequests.length === 0) {
      alert('Please select at least one request');
      return;
    }

    const statusLabel =
      statusOptions.find((o) => o.value === String(newStatus))?.label ||
      'Unknown';
    const confirmed = window.confirm(
      `Are you sure you want to update ${selectedRequests.length} request(s) to "${statusLabel}"?`,
    );
    if (!confirmed) return;

    setBulkLoading(true);
    try {
      await axios.put(
        `${API_BASE_URL}/leaveRoute/leave_request/bulk-update`,
        { ids: selectedRequests, status: newStatus },
        getAuthHeaders(),
      );
      setSuccessAction('bulk');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      setSelectedRequests([]);
      setSelectMode(false);
      fetchAll();
    } catch (error) {
      alert(
        'Error updating requests: ' +
          (error.response?.data?.error || error.message),
      );
    } finally {
      setBulkLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let data = leaveRequests;
    if (statusFilter !== 'all')
      data = data.filter((r) => String(r.status) === statusFilter);
    if (leaveTypeFilter !== 'all')
      data = data.filter((r) => r.leave_code === leaveTypeFilter);
    const s = (deferredSearch || '').toLowerCase().trim();
    if (s)
      data = data.filter(
        (r) =>
          (employeeNames[r.employeeNumber] || '').toLowerCase().includes(s) ||
          (r.employeeNumber || '').toLowerCase().includes(s),
      );
    return data;
  }, [
    leaveRequests,
    deferredSearch,
    employeeNames,
    statusFilter,
    leaveTypeFilter,
  ]);

  const paged = filtered.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );
  const counts = {
    all: leaveRequests.length,
    0: leaveRequests.filter((r) => String(r.status) === '0').length,
    1: leaveRequests.filter((r) => String(r.status) === '1').length,
    2: leaveRequests.filter((r) => String(r.status) === '2').length,
    3: leaveRequests.filter((r) => String(r.status) === '3').length,
  };

  const getStatus = (v) =>
    statusOptions.find((o) => o.value === String(v)) || statusOptions[0];
  const getType = (c) =>
    leaveTypes.find((t) => t.leave_code === c) || { leave_description: c };
  const formatDate = (d) => {
    if (!d) return 'N/A';
    const s = Array.isArray(d) ? d[0] : d.split(',')[0];
    const [y, m, day] = s.trim().split('-');
    return new Date(y, m - 1, day).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTransactionMessage = (message) => {
    const safeMessage = message || 'No message';
    const lower = safeMessage.toLowerCase();

    const highlights = [];
    if (lower.includes('immediate supervisor')) {
      highlights.push({ pattern: /immediate supervisor/gi, color: '#1565C0' });
      highlights.push({ pattern: /\bapprove\b/gi, color: '#1565C0' });
    } else if (lower.includes('hr') && lower.includes('approve')) {
      highlights.push({ pattern: /\bhr\b/gi, color: '#2E7D32' });
      highlights.push({ pattern: /\bapprove\b/gi, color: '#2E7D32' });
    } else if (lower.includes('rejected')) {
      highlights.push({ pattern: /\brejected\b/gi, color: '#C62828' });
    } else if (lower.includes('requested')) {
      highlights.push({ pattern: /\brequested\b/gi, color: '#D4A017' });
    }

    if (!highlights.length) return safeMessage;

    let rendered = [safeMessage];
    highlights.forEach(({ pattern, color }, idx) => {
      rendered = rendered.flatMap((part, partIdx) => {
        if (typeof part !== 'string') return [part];
        const chunks = part.split(pattern);
        const matches = part.match(pattern) || [];
        if (!matches.length) return [part];

        const out = [];
        chunks.forEach((chunk, i) => {
          if (chunk) out.push(chunk);
          if (i < matches.length) {
            out.push(
              <Box
                component="span"
                key={`admin-hl-${idx}-${partIdx}-${i}`}
                sx={{ color, fontWeight: 700 }}
              >
                {matches[i]}
              </Box>,
            );
          }
        });
        return out;
      });
    });

    return <>{rendered}</>;
  };

  const fetchTransactionLogs = async () => {
    setTransactionLogsLoading(true);
    setTransactionLogsError('');
    try {
      const res = await axios.get(
        `${API_BASE_URL}/leaveRoute/leave_request/transactions`,
        getAuthHeaders(),
      );
      setTransactionLogs(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Error fetching transaction logs:', e);
      setTransactionLogsError('Failed to load transaction logs.');
      setTransactionLogs([]);
    } finally {
      setTransactionLogsLoading(false);
    }
  };

  useEffect(() => {
    if (transactionLogsModalOpen) {
      fetchTransactionLogs();
    }
  }, [transactionLogsModalOpen]);

  return (
    <Box
      sx={{
        py: { xs: 2, md: 4 },
        mt: { xs: 0, md: -5 },
        width: '100%',
        maxWidth: '1600px',
        mx: 'auto',
        overflowX: 'hidden',
      }}
    >
      <Box sx={{ px: { xs: 2, sm: 3, md: 6 } }}>
        {/* Loading Backdrop */}
        <Backdrop
          sx={{
            color: primaryColor,
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
          open={loading}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress color="inherit" size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 2, color: primaryColor }}>
              Processing leave request...
            </Typography>
          </Box>
        </Backdrop>

        <SuccessfulOverlay
          open={successOpen}
          action={successAction}
          onClose={() => setSuccessOpen(false)}
        />

        {/* Header */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }}>
            <GlassCard settings={settings}>
              <Box
                sx={{
                  p: 5,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  color: accentColor,
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
                    background:
                      'radial-gradient(circle, rgba(109,35,35,0.1) 0%, rgba(109,35,35,0) 70%)',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -30,
                    left: '30%',
                    width: 150,
                    height: 150,
                    background:
                      'radial-gradient(circle, rgba(109,35,35,0.08) 0%, rgba(109,35,35,0) 70%)',
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
                        bgcolor: 'rgba(109,35,35,0.15)',
                        mr: 4,
                        width: 64,
                        height: 64,
                        boxShadow: '0 8px 24px rgba(109,35,35,0.15)',
                      }}
                    >
                      <BusinessIcon sx={{ color: accentColor, fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                          fontWeight: 700,
                          mb: 1,
                          lineHeight: 1.2,
                          color: accentColor,
                        }}
                      >
                        Leave Request Management
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          opacity: 0.8,
                          fontWeight: 400,
                          color: accentDark,
                        }}
                      >
                        Administrative Panel • Submit and manage employee leave
                        requests
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Tooltip title="Refresh Data">
                      <IconButton
                        onClick={() => window.location.reload()}
                        sx={{
                          bgcolor: 'rgba(109,35,35,0.1)',
                          '&:hover': { bgcolor: 'rgba(109,35,35,0.2)' },
                          color: accentColor,
                          width: 48,
                          height: 48,
                        }}
                      >
                        <Refresh sx={{ fontSize: 24 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Transaction Logs">
                      <IconButton
                        onClick={() => setTransactionLogsModalOpen(true)}
                        sx={{
                          bgcolor: 'rgba(109,35,35,0.1)',
                          '&:hover': { bgcolor: 'rgba(109,35,35,0.2)' },
                          color: accentColor,
                          width: 48,
                          height: 48,
                        }}
                      >
                        <HistoryToggleOff sx={{ fontSize: 24 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {/* Main Content */}
        <Grid container spacing={4}>
          {/* Add New Request Section */}
          <Grid item xs={12} lg={6}>
            <Fade in timeout={700}>
              <GlassCard
                settings={settings}
                sx={{
                  height: 'calc(100vh - 200px)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box
                  sx={{
                    p: 4,
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    color: accentColor,
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <EventNote sx={{ fontSize: '1.8rem', mr: 2 }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      Add New Leave Request
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                      Create a new leave request entry
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    p: 4,
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto',
                  }}
                >
                  {/* Employee Information Section */}
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 600,
                        mb: 2,
                        color: accentColor,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <PersonIcon sx={{ mr: 2, fontSize: 24 }} />
                      Employee Information{' '}
                      <span
                        style={{
                          marginLeft: '12px',
                          fontWeight: 400,
                          opacity: 0.7,
                          color: 'red',
                        }}
                      >
                        *
                      </span>
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500, mb: 1, color: accentColor }}
                        >
                          Employee Number
                        </Typography>
                        <ModernTextField
                          settings={settings}
                          value={newRequest.employeeNumber}
                          onChange={(e) =>
                            setNewRequest({
                              ...newRequest,
                              employeeNumber: e.target.value,
                            })
                          }
                          fullWidth
                          size="small"
                          placeholder="Enter employee ID"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PersonIcon
                                  sx={{ color: accentColor, fontSize: 20 }}
                                />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Box>

                  <Divider sx={{ my: 3, borderColor: 'rgba(109,35,35,0.1)' }} />

                  {/* Leave Details Section */}
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      mb: 3,
                      color: accentColor,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <EventNote sx={{ mr: 2, fontSize: 24 }} />
                    Leave Details
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 500, mb: 1, color: accentColor }}
                      >
                        Leave Type <span style={{ color: 'red' }}>*</span>
                      </Typography>
                      <FormControl fullWidth size="small">
                        <ModernTextField
                          settings={settings}
                          select
                          value={newRequest.leave_code}
                          onChange={(e) => {
                            setNewRequest({
                              ...newRequest,
                              leave_code: e.target.value,
                            });
                            setSelectedDates([]);
                          }}
                          displayEmpty
                          SelectProps={{
                            displayEmpty: true,
                            renderValue: (value) =>
                              value ? (
                                `${value} - ${leaveTypes.find((t) => t.leave_code === value)?.leave_description || ''}`
                              ) : (
                                <em>Select Leave Type</em>
                              ),
                          }}
                        >
                          <MenuItem value="">
                            <em>Select Leave Type</em>
                          </MenuItem>
                          {leaveTypes.map((t) => (
                            <MenuItem key={t.id} value={t.leave_code}>
                              {t.leave_code} - {t.leave_description}
                            </MenuItem>
                          ))}
                        </ModernTextField>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 500, mb: 1, color: accentColor }}
                      >
                        Leave Date(s) <span style={{ color: 'red' }}>*</span>
                      </Typography>
                      <ProfessionalButton
                        settings={settings}
                        variant="outlined"
                        onClick={() => setDateModalOpen(true)}
                        startIcon={<CalendarMonth />}
                        sx={{
                          width: '100%',
                          height: 40,
                          justifyContent: 'flex-start',
                        }}
                      >
                        {selectedDates.length > 0
                          ? `${selectedDates.length} date(s) selected`
                          : 'Select Leave Dates'}
                      </ProfessionalButton>
                      {isSickLeave(newRequest.leave_code) && (
                        <Typography
                          variant="caption"
                          sx={{ color: '#1565C0', mt: 1, display: 'block' }}
                        >
                          ℹ Past dates allowed for sick leave
                        </Typography>
                      )}
                      <LeaveDatePickerModal
                        open={dateModalOpen}
                        onClose={() => {
                          setNewRequest({
                            ...newRequest,
                            leave_date: selectedDates.join(','),
                          });
                          setDateModalOpen(false);
                        }}
                        selectedDates={selectedDates}
                        setSelectedDates={setSelectedDates}
                        accentColor={accentColor}
                        accentDark={accentDark}
                        primaryColor={primaryColor}
                        secondaryColor={secondaryColor}
                        allowPastDates={isSickLeave(newRequest.leave_code)}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 500, mb: 1, color: accentColor }}
                      >
                        Initial Status
                      </Typography>
                      <FormControl fullWidth size="small">
                        <ModernTextField
                          settings={settings}
                          select
                          value={newRequest.status}
                          onChange={(e) =>
                            setNewRequest({
                              ...newRequest,
                              status: e.target.value,
                            })
                          }
                          SelectProps={{
                            renderValue: (value) => {
                              const opt = statusOptions.find(
                                (o) => o.value === value,
                              );
                              return opt?.label || 'Select Status';
                            },
                          }}
                        >
                          {statusOptions.slice(0, 2).map((o) => (
                            <MenuItem key={o.value} value={o.value}>
                              {o.label}
                            </MenuItem>
                          ))}
                        </ModernTextField>
                      </FormControl>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 'auto', pt: 3 }}>
                    <ProfessionalButton
                      onClick={handleAdd}
                      settings={settings}
                      variant="contained"
                      startIcon={<AddIcon />}
                      fullWidth
                      sx={{
                        backgroundColor: accentColor,
                        color: primaryColor,
                        py: 1.5,
                        fontSize: '1rem',
                        '&:hover': {
                          backgroundColor: accentDark,
                        },
                      }}
                    >
                      Add Leave Request
                    </ProfessionalButton>
                  </Box>
                </Box>
              </GlassCard>
            </Fade>
          </Grid>

          {/* Records Section */}
          <Grid item xs={12} lg={6}>
            <Fade in timeout={900}>
              <GlassCard
                settings={settings}
                sx={{
                  height: 'calc(100vh - 200px)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box
                  sx={{
                    p: 4,
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    color: accentColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ReorderIcon sx={{ fontSize: '1.8rem', mr: 2 }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        Leave Request Records
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        Click on a record to view and manage details
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip
                      title={
                        selectMode
                          ? 'Exit Selection Mode'
                          : 'Select Multiple Requests'
                      }
                    >
                      <Button
                        onClick={toggleSelectMode}
                        size="small"
                        variant={selectMode ? 'contained' : 'outlined'}
                        startIcon={
                          selectMode ? (
                            <CheckBoxIcon />
                          ) : (
                            <CheckBoxOutlineBlankIcon />
                          )
                        }
                        sx={{
                          color: selectMode ? primaryColor : accentColor,
                          backgroundColor: selectMode
                            ? accentColor
                            : 'transparent',
                          borderColor: selectMode
                            ? accentColor
                            : 'rgba(109, 35, 35, 0.5)',
                          '&:hover': {
                            backgroundColor: selectMode
                              ? accentDark
                              : 'rgba(109, 35, 35, 0.08)',
                            borderColor: accentColor,
                          },
                        }}
                      >
                        {selectMode ? 'Cancel' : 'Select'}
                      </Button>
                    </Tooltip>

                    <ToggleButtonGroup
                      value={viewMode}
                      exclusive
                      onChange={handleViewModeChange}
                      aria-label="view mode"
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        '& .MuiToggleButton-root': {
                          color: accentColor,
                          borderColor: 'rgba(109, 35, 35, 0.5)',
                          padding: '4px 8px',
                          '&.Mui-selected': {
                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                            color: accentColor,
                          },
                        },
                      }}
                    >
                      <ToggleButton value="grid" aria-label="grid view">
                        <ViewModuleIcon fontSize="small" />
                      </ToggleButton>
                      <ToggleButton value="list" aria-label="list view">
                        <ViewListIcon fontSize="small" />
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                </Box>

                <Box
                  sx={{
                    p: 4,
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  {/* Search and Leave Type Filter Row */}
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 2,
                      mb: 3,
                      alignItems: 'center',
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <ModernTextField
                        settings={settings}
                        size="small"
                        placeholder="Search by employee name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon
                                sx={{ color: accentColor, fontSize: 20 }}
                              />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Box>
                    <FormControl sx={{ minWidth: 200 }} size="small">
                      <ModernTextField
                        settings={settings}
                        select
                        value={leaveTypeFilter}
                        onChange={(e) => {
                          setLeaveTypeFilter(e.target.value);
                          setPage(0);
                        }}
                        label="Leave Type"
                        variant="outlined"
                      >
                        <MenuItem value="all">All Leave Types</MenuItem>
                        {leaveTypes.map((type) => (
                          <MenuItem
                            key={type.leave_code}
                            value={type.leave_code}
                          >
                            {type.leave_code} - {type.leave_description}
                          </MenuItem>
                        ))}
                      </ModernTextField>
                    </FormControl>
                  </Box>

                  {/* Status Filter Chips */}
                  <Box
                    sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}
                  >
                    {[
                      {
                        label: `All (${counts.all})`,
                        value: 'all',
                        color: accentColor,
                      },
                      {
                        label: `Pending (${counts['0']})`,
                        value: '0',
                        color: '#F57C00',
                      },
                      {
                        label: `Immediate Supervisor (${counts['1']})`,
                        value: '1',
                        color: '#1565C0',
                      },
                      {
                        label: `HR (${counts['2']})`,
                        value: '2',
                        color: '#2E7D32',
                      },
                      {
                        label: `Denied (${counts['3']})`,
                        value: '3',
                        color: '#C62828',
                      },
                    ].map((f) => (
                      <Chip
                        key={f.value}
                        label={f.label}
                        onClick={() => setStatusFilter(f.value)}
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          height: 28,
                          border: `1px solid ${f.color}`,
                          bgcolor:
                            statusFilter === f.value ? f.color : 'transparent',
                          color: statusFilter === f.value ? '#fff' : f.color,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor:
                              statusFilter === f.value
                                ? f.color
                                : alpha(f.color, 0.08),
                          },
                        }}
                      />
                    ))}
                  </Box>

                  {/* Records List */}
                  <Box
                    sx={{
                      flexGrow: 1,
                      overflowY: 'auto',
                      pr: 1,
                      '&::-webkit-scrollbar': {
                        width: '6px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: '#f1f1f1',
                        borderRadius: '3px',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: accentColor,
                        borderRadius: '3px',
                      },
                    }}
                  >
                    {paged.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 8 }}>
                        <EventNote
                          sx={{ fontSize: 56, color: '#e0e0e0', mb: 2 }}
                        />
                        <Typography
                          variant="h6"
                          sx={{ color: accentColor, fontWeight: 'bold', mb: 1 }}
                        >
                          No Records Found
                        </Typography>
                        <Typography variant="body2" sx={{ color: grayColor }}>
                          {searchTerm ||
                          statusFilter !== 'all' ||
                          leaveTypeFilter !== 'all'
                            ? 'Try adjusting your search or filter'
                            : 'Add your first leave request'}
                        </Typography>
                      </Box>
                    ) : viewMode === 'grid' ? (
                      <Grid container spacing={2}>
                        {paged.map((req) => {
                          const status = getStatus(req.status);
                          const type = getType(req.leave_code);
                          const isCancelled = String(req.status) === '4';
                          const StatusIcon = status.icon;
                          const isSelected = selectedRequests.includes(req.id);

                          return (
                            <Grid item xs={12} sm={6} key={req.id}>
                              <Card
                                onClick={(e) => {
                                  if (selectMode && !isCancelled) {
                                    e.stopPropagation();
                                    handleSelectRequest(req.id);
                                  } else if (!isCancelled && !selectMode) {
                                    setEditRequest({ ...req });
                                    setOriginalRequest({ ...req });
                                    setIsEditing(false);
                                  }
                                }}
                                sx={{
                                  cursor: isCancelled ? 'default' : 'pointer',
                                  opacity: isCancelled ? 0.65 : 1,
                                  border: isSelected
                                    ? `2px solid ${accentColor}`
                                    : '1px solid rgba(109, 35, 35, 0.1)',
                                  height: '100%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  position: 'relative',
                                  backgroundColor: isSelected
                                    ? 'rgba(109, 35, 35, 0.05)'
                                    : 'white',
                                  '&:hover': isCancelled
                                    ? {}
                                    : {
                                        borderColor: accentColor,
                                        transform: 'translateY(-2px)',
                                        transition: 'all 0.2s ease',
                                        boxShadow:
                                          '0 4px 8px rgba(109,35,35,0.15)',
                                      },
                                }}
                              >
                                {selectMode && !isCancelled && (
                                  <Checkbox
                                    checked={isSelected}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleSelectRequest(req.id);
                                    }}
                                    sx={{
                                      position: 'absolute',
                                      top: 8,
                                      right: 8,
                                      zIndex: 10,
                                      color: accentColor,
                                      '&.Mui-checked': {
                                        color: accentColor,
                                      },
                                    }}
                                  />
                                )}
                                <CardContent
                                  sx={{
                                    p: 2,
                                    flexGrow: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      mb: 1,
                                    }}
                                  >
                                    <PersonIcon
                                      sx={{
                                        fontSize: 18,
                                        color: accentColor,
                                        mr: 0.5,
                                      }}
                                    />
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: accentColor,
                                        px: 0.5,
                                        py: 0.2,
                                        borderRadius: 0.5,
                                        fontSize: '0.7rem',
                                        fontWeight: 'bold',
                                      }}
                                    >
                                      #{req.employeeNumber}
                                    </Typography>
                                  </Box>

                                  <Typography
                                    variant="body2"
                                    fontWeight="bold"
                                    color="#333"
                                    mb={0.5}
                                    noWrap
                                  >
                                    {employeeNames[req.employeeNumber] ||
                                      'Loading...'}
                                  </Typography>

                                  <Typography
                                    variant="body2"
                                    fontWeight="bold"
                                    color="#333"
                                    mb={1}
                                    sx={{ flexGrow: 1 }}
                                  >
                                    {type.leave_description || req.leave_code}
                                  </Typography>

                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      color="#000"
                                      fontSize="0.75rem"
                                    >
                                      {formatDate(req.leave_date)}
                                    </Typography>
                                    <Chip
                                      icon={
                                        <StatusIcon sx={{ fontSize: 14 }} />
                                      }
                                      label={status.short}
                                      size="small"
                                      sx={{
                                        bgcolor: status.bg,
                                        color: status.color,
                                        fontWeight: 600,
                                        fontSize: '0.65rem',
                                        height: 22,
                                        '& .MuiChip-icon': {
                                          color: status.color,
                                        },
                                      }}
                                    />
                                  </Box>
                                </CardContent>
                              </Card>
                            </Grid>
                          );
                        })}
                      </Grid>
                    ) : (
                      paged.map((req) => {
                        const status = getStatus(req.status);
                        const type = getType(req.leave_code);
                        const isCancelled = String(req.status) === '4';
                        const StatusIcon = status.icon;
                        const isSelected = selectedRequests.includes(req.id);

                        return (
                          <Card
                            key={req.id}
                            onClick={(e) => {
                              if (selectMode && !isCancelled) {
                                e.stopPropagation();
                                handleSelectRequest(req.id);
                              } else if (!isCancelled && !selectMode) {
                                setEditRequest({ ...req });
                                setOriginalRequest({ ...req });
                                setIsEditing(false);
                              }
                            }}
                            sx={{
                              cursor: isCancelled ? 'default' : 'pointer',
                              opacity: isCancelled ? 0.65 : 1,
                              border: isSelected
                                ? `2px solid ${accentColor}`
                                : '1px solid rgba(109, 35, 35, 0.1)',
                              mb: 1,
                              backgroundColor: isSelected
                                ? 'rgba(109, 35, 35, 0.05)'
                                : 'white',
                              '&:hover': isCancelled
                                ? {}
                                : {
                                    borderColor: accentColor,
                                    backgroundColor: isSelected
                                      ? 'rgba(109, 35, 35, 0.08)'
                                      : 'rgba(254, 249, 225, 0.3)',
                                  },
                            }}
                          >
                            <Box sx={{ p: 2 }}>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                }}
                              >
                                {selectMode && !isCancelled && (
                                  <Checkbox
                                    checked={isSelected}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleSelectRequest(req.id);
                                    }}
                                    sx={{
                                      mr: 1,
                                      color: accentColor,
                                      '&.Mui-checked': {
                                        color: accentColor,
                                      },
                                    }}
                                  />
                                )}

                                <Box sx={{ mr: 1.5, mt: 0.2 }}>
                                  <PersonIcon
                                    sx={{ fontSize: 20, color: accentColor }}
                                  />
                                </Box>

                                <Box sx={{ flexGrow: 1 }}>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: accentColor,
                                      fontSize: '0.7rem',
                                      fontWeight: 'bold',
                                      display: 'block',
                                      mb: 0.5,
                                    }}
                                  >
                                    #{req.employeeNumber}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    fontWeight="bold"
                                    color="#333"
                                    sx={{ mb: 0.5 }}
                                  >
                                    {employeeNames[req.employeeNumber] ||
                                      'Loading...'}
                                  </Typography>

                                  <Typography
                                    variant="body2"
                                    fontWeight="bold"
                                    color="#333"
                                    sx={{ mb: 0.5 }}
                                  >
                                    {type.leave_description || req.leave_code}
                                  </Typography>

                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 1,
                                    }}
                                  >
                                    <CalendarMonth
                                      sx={{ fontSize: 14, color: '#000' }}
                                    />
                                    <Typography
                                      variant="caption"
                                      color="#000"
                                      fontSize="0.75rem"
                                    >
                                      {formatDate(req.leave_date)}
                                    </Typography>
                                    <Chip
                                      icon={
                                        <StatusIcon sx={{ fontSize: 14 }} />
                                      }
                                      label={status.short}
                                      size="small"
                                      sx={{
                                        bgcolor: status.bg,
                                        color: status.color,
                                        fontWeight: 600,
                                        fontSize: '0.65rem',
                                        height: 22,
                                        ml: 'auto',
                                        '& .MuiChip-icon': {
                                          color: status.color,
                                        },
                                      }}
                                    />
                                  </Box>
                                </Box>
                              </Box>
                            </Box>
                          </Card>
                        );
                      })
                    )}
                  </Box>

                  {/* Bulk Action Toolbar */}
                  {selectMode && (
                    <Slide
                      direction="up"
                      in={selectMode}
                      mountOnEnter
                      unmountOnExit
                    >
                      <Paper
                        elevation={4}
                        sx={{
                          position: 'sticky',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          p: 2,
                          backgroundColor: primaryColor,
                          borderTop: `2px solid ${accentColor}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 2,
                          flexWrap: 'wrap',
                          zIndex: 100,
                        }}
                      >
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                        >
                          <Checkbox
                            checked={
                              selectedRequests.length === paged.length &&
                              paged.length > 0
                            }
                            indeterminate={
                              selectedRequests.length > 0 &&
                              selectedRequests.length < paged.length
                            }
                            onChange={handleSelectAll}
                            sx={{
                              color: accentColor,
                              '&.Mui-checked, &.MuiCheckbox-indeterminate': {
                                color: accentColor,
                              },
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, color: accentColor }}
                          >
                            {selectedRequests.length === 0
                              ? 'Select items'
                              : `${selectedRequests.length} item${selectedRequests.length > 1 ? 's' : ''} selected`}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Tooltip title="Approve as Immediate Supervisor">
                            <Button
                              onClick={() => handleBulkStatusUpdate(1)}
                              disabled={
                                selectedRequests.length === 0 || bulkLoading
                              }
                              variant="contained"
                              size="small"
                              startIcon={
                                bulkLoading ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <CheckCircle />
                                )
                              }
                              sx={{
                                backgroundColor: '#1565C0',
                                color: '#fff',
                                '&:hover': { backgroundColor: '#0D47A1' },
                                '&:disabled': { backgroundColor: '#ccc' },
                              }}
                            >
                              Immediate Supervisor
                            </Button>
                          </Tooltip>

                          <Tooltip title="Approve as HR">
                            <Button
                              onClick={() => handleBulkStatusUpdate(2)}
                              disabled={
                                selectedRequests.length === 0 || bulkLoading
                              }
                              variant="contained"
                              size="small"
                              startIcon={
                                bulkLoading ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <DoneAllIcon />
                                )
                              }
                              sx={{
                                backgroundColor: '#2E7D32',
                                color: '#fff',
                                '&:hover': { backgroundColor: '#1B5E20' },
                                '&:disabled': { backgroundColor: '#ccc' },
                              }}
                            >
                              HR Approve
                            </Button>
                          </Tooltip>

                          <Tooltip title="Deny Requests">
                            <Button
                              onClick={() => handleBulkStatusUpdate(3)}
                              disabled={
                                selectedRequests.length === 0 || bulkLoading
                              }
                              variant="contained"
                              size="small"
                              startIcon={
                                bulkLoading ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <ThumbDownIcon />
                                )
                              }
                              sx={{
                                backgroundColor: '#C62828',
                                color: '#fff',
                                '&:hover': { backgroundColor: '#B71C1C' },
                                '&:disabled': { backgroundColor: '#ccc' },
                              }}
                            >
                              Deny
                            </Button>
                          </Tooltip>
                        </Box>
                      </Paper>
                    </Slide>
                  )}

                  {/* Pagination */}
                  {filtered.length > 0 && (
                    <Box
                      sx={{
                        pt: 2,
                        mt: 2,
                        borderTop: `1px solid rgba(109,35,35,0.1)`,
                      }}
                    >
                      <TablePagination
                        component="div"
                        count={filtered.length}
                        page={page}
                        onPageChange={(e, p) => setPage(p)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => {
                          setRowsPerPage(+e.target.value);
                          setPage(0);
                        }}
                        rowsPerPageOptions={[8, 16, 24]}
                        sx={{
                          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows':
                            {
                              fontWeight: 600,
                              fontSize: '0.85rem',
                            },
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </GlassCard>
            </Fade>
          </Grid>
        </Grid>

        <Modal
          open={transactionLogsModalOpen}
          onClose={() => setTransactionLogsModalOpen(false)}
        >
          <Fade in={transactionLogsModalOpen}>
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: { xs: '92%', sm: '85%', md: 820 },
                maxHeight: '85vh',
                bgcolor: primaryColor,
                border: `1px solid ${alpha(accentColor, 0.2)}`,
                boxShadow: `0 24px 64px ${alpha(accentColor, 0.3)}`,
                borderRadius: 3,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box
                sx={{
                  p: 2.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: `1px solid ${alpha(accentColor, 0.15)}`,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, color: accentColor }}>
                  Transaction Logs
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setTransactionLogsModalOpen(false)}
                  sx={{
                    color: accentColor,
                    '&:hover': { backgroundColor: alpha(accentColor, 0.08) },
                  }}
                >
                  <Close />
                </IconButton>
              </Box>

              <Box sx={{ p: 3, overflowY: 'auto' }}>
                {transactionLogsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={28} sx={{ color: accentColor }} />
                  </Box>
                ) : transactionLogsError ? (
                  <Typography variant="body2" sx={{ color: '#C62828' }}>
                    {transactionLogsError}
                  </Typography>
                ) : transactionLogs.length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    No transaction logs available.
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {transactionLogs.map((log) => {
                      const loggedAt =
                        log.created_at ||
                        log.createdAt ||
                        log.date_created ||
                        log.timestamp;
                      return (
                        <Paper
                          key={`admin-log-${log.id}`}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            border: `1px solid ${alpha(accentColor, 0.12)}`,
                            background: '#fff',
                          }}
                        >
                          <Typography sx={{ fontWeight: 600, color: '#333', fontSize: '0.95rem' }}>
                            {renderTransactionMessage(log.message)}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'inline-flex',
                              mt: 1,
                              color: '#777',
                            }}
                          >
                            {loggedAt ? formatDateTime(loggedAt) : 'No timestamp'}
                          </Typography>
                        </Paper>
                      );
                    })}
                  </Box>
                )}
              </Box>
            </Box>
          </Fade>
        </Modal>

        {/* Edit Modal */}
        <Modal
          open={!!editRequest}
          onClose={closeModal}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <GlassCard
            settings={settings}
            sx={{
              width: '90%',
              maxWidth: '700px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {editRequest && (
              <>
                {/* Modal Header */}
                <Box
                  sx={{
                    p: 3,
                    background: `linear-gradient(135deg, ${settings.secondaryColor || accentDark} 0%, ${settings.deleteButtonHoverColor || accentColor} 100%)`,
                    color: settings.accentColor || '#FEF9E1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    flexShrink: 0,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 'bold',
                      color: settings.accentColor || '#FEF9E1',
                    }}
                  >
                    {isEditing ? 'Edit Leave Request' : 'Leave Request Details'}
                  </Typography>
                  <IconButton
                    onClick={closeModal}
                    sx={{ color: settings.accentColor || '#FEF9E1' }}
                  >
                    <Close />
                  </IconButton>
                </Box>

                <Box
                  sx={{
                    p: 4,
                    flexGrow: 1,
                    overflowY: 'auto',
                    minHeight: 0,
                    '&::-webkit-scrollbar': {
                      width: '6px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: '#f1f1f1',
                      borderRadius: '3px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: settings.primaryColor || accentColor,
                      borderRadius: '3px',
                    },
                  }}
                >
                  {/* HR Approved lock notice */}
                  {String(editRequest.status) === '2' && (
                    <Alert
                      severity="info"
                      sx={{
                        mb: 3,
                        backgroundColor: '#E3F2FD',
                        borderColor: '#1565C0',
                        color: '#0D47A1',
                        '& .MuiAlert-icon': { color: '#1565C0' },
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        🔒 This request has been HR Approved and cannot be
                        edited or deleted.
                      </Typography>
                    </Alert>
                  )}

                  {/* Employee Information Section */}
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 600,
                        mb: 2,
                        color: accentColor,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <PersonIcon sx={{ mr: 2, fontSize: 24 }} />
                      Employee Information
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500, mb: 1, color: accentColor }}
                        >
                          Employee Number
                        </Typography>
                        {isEditing && String(editRequest.status) !== '2' ? (
                          <ModernTextField
                            settings={settings}
                            value={editRequest.employeeNumber}
                            onChange={(e) =>
                              setEditRequest({
                                ...editRequest,
                                employeeNumber: e.target.value,
                              })
                            }
                            fullWidth
                            size="small"
                          />
                        ) : (
                          <Box
                            sx={{
                              p: 1.5,
                              bgcolor: 'rgba(254, 249, 225, 0.5)',
                              borderRadius: 1,
                              border: '1px solid rgba(109, 35, 35, 0.2)',
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 'bold', color: accentColor }}
                            >
                              #{editRequest.employeeNumber}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: grayColor }}
                            >
                              {employeeNames[editRequest.employeeNumber]}
                            </Typography>
                          </Box>
                        )}
                      </Grid>

                      <Grid item xs={6}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500, mb: 1, color: accentColor }}
                        >
                          Leave Type
                        </Typography>
                        {isEditing && String(editRequest.status) !== '2' ? (
                          <FormControl fullWidth size="small">
                            <ModernTextField
                              settings={settings}
                              select
                              value={editRequest.leave_code}
                              onChange={(e) =>
                                setEditRequest({
                                  ...editRequest,
                                  leave_code: e.target.value,
                                })
                              }
                              SelectProps={{
                                displayEmpty: true,
                                renderValue: (value) =>
                                  value ? (
                                    `${value} - ${leaveTypes.find((t) => t.leave_code === value)?.leave_description || ''}`
                                  ) : (
                                    <em>Select Type</em>
                                  ),
                              }}
                            >
                              <MenuItem value="">
                                <em>Select Type</em>
                              </MenuItem>
                              {leaveTypes.map((t) => (
                                <MenuItem key={t.id} value={t.leave_code}>
                                  {t.leave_code} - {t.leave_description}
                                </MenuItem>
                              ))}
                            </ModernTextField>
                          </FormControl>
                        ) : (
                          <Box
                            sx={{
                              p: 1.5,
                              bgcolor: 'rgba(254, 249, 225, 0.5)',
                              borderRadius: 1,
                              border: '1px solid rgba(109, 35, 35, 0.2)',
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 'bold', color: '#333' }}
                            >
                              {
                                getType(editRequest.leave_code)
                                  .leave_description
                              }
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: grayColor }}
                            >
                              Code: {editRequest.leave_code}
                            </Typography>
                          </Box>
                        )}
                      </Grid>
                    </Grid>
                  </Box>

                  <Divider sx={{ my: 3, borderColor: 'rgba(109,35,35,0.1)' }} />

                  {/* Leave Details Section */}
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      mb: 3,
                      color: accentColor,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <EventNote sx={{ mr: 2, fontSize: 24 }} />
                    Leave Details
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 500, mb: 1, color: accentColor }}
                      >
                        Leave Date
                      </Typography>
                      {isEditing && String(editRequest.status) !== '2' ? (
                        <ModernTextField
                          settings={settings}
                          type="date"
                          value={editRequest.leave_date?.split(',')[0] || ''}
                          onChange={(e) =>
                            setEditRequest({
                              ...editRequest,
                              leave_date: e.target.value,
                            })
                          }
                          fullWidth
                          size="small"
                        />
                      ) : (
                        <Box
                          sx={{
                            p: 1.5,
                            bgcolor: 'rgba(254, 249, 225, 0.5)',
                            borderRadius: 1,
                            border: '1px solid rgba(109, 35, 35, 0.2)',
                          }}
                        >
                          <Typography variant="body2">
                            {formatDate(editRequest.leave_date)}
                          </Typography>
                        </Box>
                      )}
                    </Grid>

                    <Grid item xs={6}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 500, mb: 1, color: accentColor }}
                      >
                        Status
                      </Typography>
                      <FormControl fullWidth size="small">
                        <ModernTextField
                          settings={settings}
                          select
                          value={String(editRequest.status)}
                          onChange={async (e) => {
                            const s = e.target.value;
                            setEditRequest({ ...editRequest, status: s });
                            if (!isEditing) {
                              try {
                                await axios.put(
                                  `${API_BASE_URL}/leaveRoute/leave_request/${editRequest.id}`,
                                  { ...editRequest, status: +s },
                                  getAuthHeaders(),
                                );
                                closeModal();
                                setSuccessAction('status');
                                setSuccessOpen(true);
                                setTimeout(() => setSuccessOpen(false), 2000);
                                fetchAll();
                              } catch {
                                alert('Error updating status');
                              }
                            }
                          }}
                          disabled={
                            isEditing || String(editRequest.status) === '2'
                          }
                          SelectProps={{
                            renderValue: (value) => {
                              const opt = statusOptions.find(
                                (o) => o.value === value,
                              );
                              const Icon = opt?.icon;
                              return (
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                  }}
                                >
                                  {Icon && (
                                    <Icon
                                      sx={{ fontSize: 18, color: opt.color }}
                                    />
                                  )}
                                  <Typography
                                    sx={{ fontWeight: 600, color: opt?.color }}
                                  >
                                    {opt?.label}
                                  </Typography>
                                </Box>
                              );
                            },
                          }}
                        >
                          {statusOptions.map((o) => (
                            <MenuItem
                              key={o.value}
                              value={o.value}
                              sx={{ py: 1.5 }}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1.5,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    bgcolor: o.color,
                                  }}
                                />
                                <Typography sx={{ fontWeight: 500 }}>
                                  {o.label}
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </ModernTextField>
                      </FormControl>
                    </Grid>
                  </Grid>

                  {/* Leave Balance */}
                  <Box
                    sx={{
                      mt: 3,
                      p: 2.5,
                      bgcolor: 'rgba(254, 249, 225, 0.5)',
                      borderRadius: 1,
                      border: '1px solid rgba(109, 35, 35, 0.2)',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, mb: 1.5, color: accentColor }}
                    >
                      Employee Leave Balance
                    </Typography>
                    <LeaveCredits
                      personID={editRequest.employeeNumber}
                      compact
                      accentColor={accentColor}
                    />
                  </Box>
                </Box>

                {/* Bottom Action Bar */}
                <Box
                  sx={{
                    borderTop: `1px solid ${alpha(settings.primaryColor || '#6d2323', 0.2)}`,
                    backgroundColor: '#FFFFFF',
                    px: 3,
                    py: 2,
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 2,
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 10,
                    flexShrink: 0,
                  }}
                >
                  {!isEditing ? (
                    <>
                      <ProfessionalButton
                        onClick={() => handleCancel(editRequest.id)}
                        disabled={['2', '3', '4'].includes(
                          String(editRequest.status),
                        )}
                        settings={settings}
                        variant="outlined"
                        sx={{
                          borderColor: '#F57C00',
                          color: '#F57C00',
                          minWidth: '120px',
                          '&:hover': {
                            backgroundColor: alpha('#F57C00', 0.1),
                          },
                          '&:disabled': {
                            borderColor: '#ccc',
                            color: '#ccc',
                          },
                        }}
                      >
                        Cancel Request
                      </ProfessionalButton>
                      <ProfessionalButton
                        onClick={() =>
                          handleDelete(editRequest.id, editRequest.status)
                        }
                        disabled={['2', '4'].includes(
                          String(editRequest.status),
                        )}
                        startIcon={<DeleteIcon />}
                        settings={settings}
                        variant="outlined"
                        sx={{
                          borderColor:
                            settings.deleteButtonColor || accentColor,
                          color: settings.deleteButtonColor || accentColor,
                          minWidth: '120px',
                          '&:hover': {
                            backgroundColor: alpha(
                              settings.deleteButtonColor || accentColor,
                              0.1,
                            ),
                            borderColor:
                              settings.deleteButtonHoverColor || accentDark,
                            color:
                              settings.deleteButtonHoverColor || accentDark,
                          },
                          '&:disabled': {
                            borderColor: '#ccc',
                            color: '#ccc',
                          },
                        }}
                        title={
                          String(editRequest.status) === '2'
                            ? 'Cannot delete HR approved requests'
                            : 'Delete this request'
                        }
                      >
                        Delete
                      </ProfessionalButton>
                      <ProfessionalButton
                        onClick={() => setIsEditing(true)}
                        disabled={['2', '4'].includes(
                          String(editRequest.status),
                        )}
                        startIcon={<EditIcon />}
                        settings={settings}
                        variant="contained"
                        sx={{
                          backgroundColor:
                            settings.updateButtonColor || accentColor,
                          color: settings.accentColor || '#FEF9E1',
                          minWidth: '120px',
                          '&:hover': {
                            backgroundColor:
                              settings.updateButtonHoverColor || accentDark,
                          },
                          '&:disabled': {
                            backgroundColor: '#ddd',
                          },
                        }}
                        title={
                          String(editRequest.status) === '2'
                            ? 'Cannot edit HR approved requests'
                            : 'Edit this request'
                        }
                      >
                        Edit
                      </ProfessionalButton>
                    </>
                  ) : (
                    <>
                      <ProfessionalButton
                        onClick={() => {
                          setEditRequest({ ...originalRequest });
                          setIsEditing(false);
                        }}
                        startIcon={<CancelIcon />}
                        settings={settings}
                        variant="outlined"
                        sx={{
                          borderColor: settings.cancelButtonColor || '#6c757d',
                          color: settings.cancelButtonColor || '#6c757d',
                          minWidth: '120px',
                          '&:hover': {
                            backgroundColor: alpha(
                              settings.cancelButtonColor || '#6c757d',
                              0.1,
                            ),
                          },
                        }}
                      >
                        Cancel
                      </ProfessionalButton>
                      <ProfessionalButton
                        onClick={handleUpdate}
                        startIcon={<SaveIcon />}
                        disabled={!hasChanges()}
                        settings={settings}
                        variant="contained"
                        sx={{
                          backgroundColor: hasChanges()
                            ? settings.updateButtonColor || accentColor
                            : alpha(settings.primaryColor || accentColor, 0.5),
                          color: settings.accentColor || '#FEF9E1',
                          minWidth: '120px',
                          '&:hover': {
                            backgroundColor: hasChanges()
                              ? settings.updateButtonHoverColor || accentDark
                              : alpha(
                                  settings.primaryColor || accentColor,
                                  0.5,
                                ),
                          },
                          '&:disabled': {
                            color: alpha(
                              settings.accentColor || '#FEF9E1',
                              0.5,
                            ),
                          },
                        }}
                      >
                        Save
                      </ProfessionalButton>
                    </>
                  )}
                </Box>
              </>
            )}
          </GlassCard>
        </Modal>
      </Box>
    </Box>
  );
};

export default LeaveRequest;
