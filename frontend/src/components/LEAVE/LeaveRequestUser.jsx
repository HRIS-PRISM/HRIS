import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Avatar,
  Chip,
  Paper,
  Fade,
  Grid,
  FormControl,
  Tooltip,
  IconButton,
  Backdrop,
  Snackbar,
  Modal,
  styled,
  alpha,
} from '@mui/material';
import {
  EventNote,
  FilterList as FilterIcon,
  EventAvailable as ReorderIcon,
  Person as PersonIcon,
  CalendarMonth as CalendarIcon,
  Refresh,
  AccessTime,
  CheckCircle,
  Block,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Add as AddIcon,
  WarningAmber as WarningIcon,
  AccountBalanceWallet as WalletIcon,
  HistoryToggleOff,
  Close as CloseIcon,
} from '@mui/icons-material';
import { MenuItem, Select, TextField, Card, CardContent } from '@mui/material';
import axios from 'axios';
import { getAuthHeaders } from '../../utils/auth';
import { useSocket } from '../../contexts/SocketContext';
import { jwtDecode } from 'jwt-decode';

import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import LeaveDatePicker from './LeaveDatePicker';
// Removed LeaveCredits import to implement Grid version inline
import { useSystemSettings } from '../../hooks/useSystemSettings';

const GlassCard = styled(Card)(() => ({
  borderRadius: 20,
  overflow: 'hidden',
  transition: 'all 0.3s ease',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
}));
const ProfessionalButton = styled(Button)(() => ({
  borderRadius: 12,
  fontWeight: 600,
  padding: '12px 24px',
  transition: 'all 0.3s ease',
  textTransform: 'none',
  fontSize: '0.95rem',
}));
const ModernTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    fontSize: '0.95rem',
    '& fieldset': { borderColor: 'rgba(0,0,0,0.12)' },
    '&:hover fieldset': { borderColor: 'rgba(0,0,0,0.25)' },
    '&.Mui-focused fieldset': { borderColor: '#6d2323' },
  },
}));
const ModernSelect = styled(Select)(() => ({
  borderRadius: 12,
  backgroundColor: 'rgba(255,255,255,0.9)',
  fontSize: '0.9rem',
}));
const RecordCard = styled(Card)(() => ({
  borderRadius: 16,
  transition: 'all 0.3s ease',
  border: '1px solid rgba(0,0,0,0.08)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  '&:hover': {
    boxShadow: '0 8px 24px rgba(109,35,35,0.12)',
    borderColor: 'rgba(109,35,35,0.15)',
  },
}));
const BalanceCard = styled(Card)(() => ({
  borderRadius: 12,
  padding: '10px',
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.4)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  minHeight: '120px',
  maxHeight: '140px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
}));

const LeaveRequestUser = () => {
  const { socket, connected } = useSocket();
  const refreshRef = useRef(null);

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [assignments, setAssignments] = useState([]); 

  const [newLeaveRequest, setNewLeaveRequest] = useState({
    leave_code: '',
    leave_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [personID, setPersonID] = useState('');
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [transactionLogsModalOpen, setTransactionLogsModalOpen] = useState(false);
  const [transactionLogs, setTransactionLogs] = useState([]);
  const [transactionLogsLoading, setTransactionLogsLoading] = useState(false);
  const [transactionLogsError, setTransactionLogsError] = useState('');
  const [selectedDates, setSelectedDates] = useState([]);

  const [balanceAlertOpen, setBalanceAlertOpen] = useState(false);
  const [balanceAlertDetail, setBalanceAlertDetail] = useState('');
  // Snackbar for unavailable dates
  const [unavailableDatesAlertOpen, setUnavailableDatesAlertOpen] = useState(false);
  const [unavailableDatesAlertDetail, setUnavailableDatesAlertDetail] = useState('');

  const { settings } = useSystemSettings();
  const primaryColor = settings.accentColor || '#FEF9E1';
  const secondaryColor = settings.backgroundColor || '#FFF8E7';
  const accentColor = settings.primaryColor || '#6d2323';
  const accentDark = settings.secondaryColor || '#8B3333';
  const textPrimaryColor = settings.textPrimaryColor || '#6d2323';

  // Helper to format date as "February 26, 2026"
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isSickLeave = () => {
    const t = leaveTypes.find(
      (x) => x.leave_code === newLeaveRequest.leave_code,
    );
    if (!t) return false;
    return (
      (t.leave_code || '').toLowerCase().includes('sl') ||
      (t.leave_code || '').toLowerCase().includes('sick') ||
      (t.leave_description || '').toLowerCase().includes('sick')
    );
  };

  // Computed: Grouped balances for Grid View
  const groupedBalances = useMemo(() => {
    const map = {};
    assignments.forEach((a) => {
      const code = a.leave_code;
      const desc = leaveTypes.find((lt) => lt.leave_code === code)?.leave_description || code;
      if (!map[code]) {
        map[code] = { code, description: desc, totalHours: 0 };
      }
      map[code].totalHours += parseFloat(a.remaining_hours || 0);
    });
    return Object.values(map).map((b) => ({
      ...b,
      totalDays: (b.totalHours / 8).toFixed(1),
    }));
  }, [assignments, leaveTypes]);

  const getAllocatedRemainingDays = () => {
    if (!newLeaveRequest.leave_code || !assignments.length) return null;
    const allocated = assignments
      .filter(
        (a) =>
          a.leave_code === newLeaveRequest.leave_code &&
          (a.carried_forward_hours === null ||
            Number(a.carried_forward_hours) === 0),
      )
      .sort((a, b) => {
        if (b.period_year !== a.period_year)
          return b.period_year - a.period_year;
        const semVal = (s) => {
          if (!s) return 0;
          if (s.includes('2nd')) return 2;
          if (s.includes('1st')) return 1;
          return 0;
        };
        return semVal(b.period_semester) - semVal(a.period_semester);
      })[0];
    if (!allocated) return null;
    return (parseFloat(allocated.remaining_hours) || 0) / 8;
  };

  const months = [
    { value: '', label: 'All Months' },
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: '0', label: 'Pending' },
    { value: '1', label: 'Immediate Supervisor Approved' },
    { value: '2', label: 'HR Approved' },
    { value: '3', label: 'Denied' },
    { value: '4', label: 'Cancelled' },
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        setPersonID(jwtDecode(token).employeeNumber);
      } catch (e) {
        console.error('Error decoding token:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (personID) {
      fetchLeaveRequests();
      fetchLeaveTypes();
      fetchAssignments();
    }
  }, [personID]);

  useEffect(() => {
    refreshRef.current = fetchLeaveRequests;
  });

  useEffect(() => {
    if (!socket || !connected) return;
    const handleReq = () => {
      refreshRef.current?.();
      fetchAssignments();
    };
    const handleAssign = () => fetchAssignments();
    socket.on('leaveRequestChanged', handleReq);
    socket.on('leaveAssignmentChanged', handleAssign);
    return () => {
      socket.off('leaveRequestChanged', handleReq);
      socket.off('leaveAssignmentChanged', handleAssign);
    };
  }, [socket, connected]);

  const fetchLeaveRequests = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/leaveRoute/leave_request/${personID}`,
        getAuthHeaders(),
      );
      setLeaveRequests(res.data);
    } catch (e) {
      console.error('Error fetching leave requests:', e);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/leaveRoute/leave_table`,
        getAuthHeaders(),
      );
      setLeaveTypes(res.data);
    } catch (e) {
      console.error('Error fetching leave types:', e);
    }
  };

  const fetchAssignments = async () => {
    if (!personID) return;
    try {
      const res = await axios.get(
        `${API_BASE_URL}/leaveRoute/leave_assignment`,
        getAuthHeaders(),
      );
      const mine = (Array.isArray(res.data) ? res.data : []).filter(
        (a) => a.employeeNumber?.toString() === personID?.toString(),
      );
      setAssignments(mine);
    } catch (e) {
      console.error('Error fetching assignments:', e);
    }
  };

  const fetchTransactionLogs = async () => {
    if (!personID) return;
    setTransactionLogsLoading(true);
    setTransactionLogsError('');
    try {
      const res = await axios.get(
        `${API_BASE_URL}/leaveRoute/leave_request/transactions/${personID}`,
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
  }, [transactionLogsModalOpen, personID]);

  const handleAdd = async () => {
    if (!newLeaveRequest.leave_code) {
      alert('Please select a leave type.');
      return;
    }
    if (!selectedDates.length) {
      alert('Please pick at least one leave date.');
      return;
    }

    // Check for unavailable (HR-approved) dates
    const unavailableDates = selectedDates.filter(date =>
      leaveRequests.some(req => {
        const reqDates = (req.leave_date || '').split(',').map(s => s.trim());
        return reqDates.includes(date) && String(req.status) === '2';
      })
    );
    if (unavailableDates.length > 0) {
      setUnavailableDatesAlertDetail(
        `One or more selected dates are unavailable due to existing HR-approved leave. Please change your selection.`
      );
      setUnavailableDatesAlertOpen(true);
      return;
    }

    const remainingDays = getAllocatedRemainingDays();
    if (remainingDays !== null && selectedDates.length > remainingDays) {
      const typeName =
        leaveTypes.find((t) => t.leave_code === newLeaveRequest.leave_code)
          ?.leave_description || newLeaveRequest.leave_code;
      setBalanceAlertDetail(
        `You are requesting ${selectedDates.length} day(s) of "${typeName}" but only have ${remainingDays.toFixed(1)} allocated day(s) remaining.`,
      );
      setBalanceAlertOpen(true);
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/leaveRoute/leave_request`,
        {
          employeeNumber: personID,
          leave_code: newLeaveRequest.leave_code,
          leave_dates: selectedDates,
          status: '0',
        },
        getAuthHeaders(),
      );

      setSuccessAction('Leave Request Submitted Successfully');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);

      await fetchLeaveRequests();
      await fetchAssignments();
      setNewLeaveRequest({ leave_code: '', leave_date: '' });
      setSelectedDates([]);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message;
      if (err.response?.status === 400) {
        const detail = err.response?.data?.detail || errMsg;
        setBalanceAlertDetail(detail);
        setBalanceAlertOpen(true);
      } else {
        alert('Error submitting leave request: ' + errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setNewLeaveRequest((prev) => ({ ...prev, [field]: value }));
    if (field === 'leave_code') {
      setSelectedDates([]);
      // Debug logs for leave type selection
      console.log('Selected leave_code:', value);
      console.log('Assignments:', assignments);
      console.log('LeaveTypes:', leaveTypes);
    }
  };

  const getLeaveTypeInfo = (leaveCode) =>
    leaveTypes.find((t) => t.leave_code === leaveCode) || {
      leave_description: leaveCode,
    };

  const filteredLeaveRequests = useMemo(() => {
    return leaveRequests
      .filter((request) => {
        if (monthFilter) {
          const m = String(
            new Date(request.leave_date).getMonth() + 1,
          ).padStart(2, '0');
          if (m !== monthFilter) return false;
        }
        if (leaveTypeFilter && request.leave_code !== leaveTypeFilter)
          return false;
        if (statusFilter && String(request.status) !== statusFilter)
          return false;
        return true;
      })
      .sort((a, b) => new Date(b.leave_date) - new Date(a.leave_date));
  }, [leaveRequests, monthFilter, leaveTypeFilter, statusFilter]);

  const handleCancelRequest = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?'))
      return;
    try {
      const req = leaveRequests.find((r) => r.id === id);
      await axios.put(
        `${API_BASE_URL}/leaveRoute/leave_request/${id}`,
        {
          employeeNumber: req.employeeNumber,
          leave_code: req.leave_code,
          leave_date: req.leave_date,
          status: 4,
        },
        getAuthHeaders(),
      );
      setSuccessAction('Request Cancelled Successfully');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      await fetchLeaveRequests();
      await fetchAssignments();
    } catch (err) {
      alert(
        'Error cancelling request: ' +
          (err.response?.data?.error || err.message),
      );
    }
  };

  const getStatusInfo = (status) =>
    ({
      0: {
        label: 'Pending',
        sublabel: '',
        color: '#F57C00',
        bg: '#FFF8E1',
        icon: AccessTime,
      },
      1: {
        label: 'Immediate Supervisor Approved',
        sublabel: 'Pending HR',
        color: '#1565C0',
        bg: '#E3F2FD',
        icon: CheckCircle,
      },
      2: {
        label: 'HR Approved',
        sublabel: '',
        color: '#2E7D32',
        bg: '#E8F5E9',
        icon: CheckCircle,
      },
      3: {
        label: 'Denied',
        sublabel: '',
        color: '#C62828',
        bg: '#FFEBEE',
        icon: Block,
      },
      4: {
        label: 'Cancelled',
        sublabel: '',
        color: '#757575',
        bg: '#FAFAFA',
        icon: CancelIcon,
      },
    })[String(status)] || {
      label: 'Unknown',
      sublabel: '',
      color: '#757575',
      bg: '#FAFAFA',
      icon: AccessTime,
    };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    const s = Array.isArray(d) ? d[0] : d.split(',')[0].trim();
    const [y, m, day] = s.split('-');
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
      highlights.push({ pattern: /\bapprove\b/gi, color: '#1565C0' }); // blue
    } else if (lower.includes('hr') && lower.includes('approve')) {
      highlights.push({ pattern: /\bapprove\b/gi, color: '#2E7D32' }); // green
    } else if (lower.includes('rejected')) {
      highlights.push({ pattern: /\brejected\b/gi, color: '#C62828' }); // red
    } else if (lower.includes('requested')) {
      highlights.push({ pattern: /\brequested\b/gi, color: '#D4A017' }); // yellow
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
              <Box component="span" key={`hl-${idx}-${partIdx}-${i}`} sx={{ color, fontWeight: 700 }}>
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

  const remainingDays = getAllocatedRemainingDays();
  const isOverBalance = remainingDays !== null && selectedDates.length > remainingDays;

  // Inline error states for UI
  const [inlineLeaveTypeError, setInlineLeaveTypeError] = React.useState('');
  const [inlineSelectedDatesError, setInlineSelectedDatesError] = React.useState('');

  React.useEffect(() => {
    // Reset errors
    setInlineLeaveTypeError('');
    setInlineSelectedDatesError('');
    if (newLeaveRequest.leave_code) {
      // Find all assignments for this leave type
      const hasAllocation = assignments.some(
        (a) => a.leave_code === newLeaveRequest.leave_code && parseFloat(a.allocated_hours || 0) > 0
      );
      // Find balance for selected leave type from groupedBalances
      const selectedBalance = groupedBalances.find(
        (b) => b.code === newLeaveRequest.leave_code
      );
      const totalDays = selectedBalance ? parseFloat(selectedBalance.totalDays) : 0;
      if (!hasAllocation) {
        const leaveTypeName =
          leaveTypes.find((t) => t.leave_code === newLeaveRequest.leave_code)?.leave_description || newLeaveRequest.leave_code;
        setInlineLeaveTypeError(
          `This request cannot be processed due to insufficient leave balance.`
        );
      }
      // Over-balance error
      if (
        remainingDays !== null &&
        selectedDates.length > remainingDays
      ) {
        setInlineSelectedDatesError(
          `You requested ${selectedDates.length} day(s) but only have ${remainingDays.toFixed(1)} allocated day(s) remaining.`
        );
      }
    }
  }, [newLeaveRequest.leave_code, groupedBalances, remainingDays, selectedDates, leaveTypes]);

  return (
    <Box
      sx={{
        py: 4,
        mt: -5,
        maxWidth: '1800px',
        mx: 'auto',
        overflow: 'hidden',
        px: { xs: 2, sm: 3, md: 6 },
      }}
    >
      <Backdrop
        sx={{ color: primaryColor, zIndex: (t) => t.zIndex.drawer + 1 }}
        open={loading}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="inherit" size={60} thickness={4} />
          <Typography variant="h6" sx={{ mt: 2, color: primaryColor }}>
            Submitting...
          </Typography>
        </Box>
      </Backdrop>
      <SuccessfulOverlay
        open={successOpen}
        action={successAction}
        onClose={() => setSuccessOpen(false)}
      />
      {/* Snackbar for unavailable dates (bottom right) */}
      <Snackbar
        open={unavailableDatesAlertOpen}
        onClose={() => setUnavailableDatesAlertOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        autoHideDuration={5000}
        sx={{
          zIndex: 9999,
          mb: { xs: 8, sm: 10, md: 12 }, // push up above footer
        }}
      >
        <Alert
          severity="error"
          onClose={() => setUnavailableDatesAlertOpen(false)}
          icon={<WarningIcon fontSize="inherit" />}
          sx={{
            width: '100%',
            maxWidth: 420,
            borderRadius: 3,
            background: '#C62828',
            color: '#fff',
            boxShadow: '0 8px 32px rgba(198,40,40,0.18)',
            border: '1.5px solid #C62828',
            '& .MuiAlert-message': { width: '100%' },
            '& .MuiTypography-root': { color: '#fff' },
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 0.5 }}>
            Unavailable Leave Date(s)
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.95 }}>
            {unavailableDatesAlertDetail}
          </Typography>
        </Alert>
      </Snackbar>

      {/* Removed: Instant balance error snackbar (handled in LeaveDatePicker) */}
      {/* Existing balance alert for backend errors */}
      <Snackbar
        open={balanceAlertOpen}
        onClose={() => setBalanceAlertOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ top: { xs: 32, sm: 48 }, zIndex: 9999 }}
      >
        <Alert
          severity="error"
          onClose={() => setBalanceAlertOpen(false)}
          icon={<WarningIcon fontSize="inherit" />}
          sx={{
            width: '100%',
            maxWidth: 520,
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(198,40,40,0.25)',
            border: '1.5px solid rgba(198,40,40,0.3)',
            '& .MuiAlert-message': { width: '100%' },
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 0.5 }}>
            Insufficient Leave Balance
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {balanceAlertDetail}
          </Typography>
        </Alert>
      </Snackbar>

      {/* Header */}
      <Fade in timeout={500}>
        <Box sx={{ mb: 4 }}>
          <GlassCard>
            <Box
              sx={{
                p: 5,
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                position: 'relative',
                overflow: 'hidden',
                border: '2px solid #6D2323',
                borderRadius: 0,
                boxShadow: '0 4px 24px rgba(109, 35, 35, 0.06)',
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
                      bgcolor: alpha(accentColor, 0.15),
                      mr: 4,
                      width: 64,
                      height: 64,
                    }}
                  >
                    <EventNote sx={{ color: textPrimaryColor, fontSize: 32 }} />
                  </Avatar>
                  <Box>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 700, color: textPrimaryColor }}
                    >
                      Employee Leave Request
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ opacity: 0.8, color: accentDark }}
                    >
                      Submit and view your leave requests
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Tooltip title="Refresh Data">
                    <IconButton
                      onClick={() => window.location.reload()}
                      sx={{
                        bgcolor: 'rgba(109,35,35,0.1)',
                        '&:hover': { bgcolor: 'rgba(109,35,35,0.2)' },
                        color: accentColor,
                        width: 48,
                        mr: 2,
                        height: 48,
                      }}
                    >
                      <Refresh />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title=" Transaction Logs">
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
                      <HistoryToggleOff />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          </GlassCard>
        </Box>
      </Fade>

      {/* Full Width Leave Balance Section (Grid View) */}
      <Fade in timeout={600}>
        <Box sx={{ mb: 4 }}>
          <GlassCard>
            <Box
              sx={{
                p: 3,
                pl: 4,
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                color: accentColor,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <WalletIcon sx={{ fontSize: '1.5rem', mr: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Your Leave Balances
              </Typography>
            </Box>
            <Box sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.4)' }}>
              {groupedBalances.length === 0 ? (
                <Typography align="center" sx={{ py: 4, color: '#666' }}>
                  No balance information available.
                </Typography>
              ) : (
                <Grid container spacing={1}>
                  {groupedBalances.map((balance) => {
                    // Find max days for this leave type
                    const maxAssignment = assignments
                      .filter(a => a.leave_code === balance.code)
                      .reduce((max, a) => {
                        const days = parseFloat(a.allocated_hours || 0) / 8;
                        return days > max ? days : max;
                      }, 0);
                    return (
                      <Grid item xs={12} sm={6} md={4} lg={2} key={balance.code}>
                        <BalanceCard>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: accentColor }}>
                              {balance.description} ({balance.code})
                            </Typography>
                          </Box>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: textPrimaryColor, mb: 0.2, fontSize: '1.2rem' }}>
                            {balance.totalDays} out of {maxAssignment.toFixed(1)}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#666', fontSize: '0.9rem', mb: 1 }}>
                            Days
                          </Typography>
                          <Box sx={{ mt: 0.5, height: 3, width: '100%', bgcolor: '#e0e0e0', borderRadius: 2 }}>
                            <Box 
                              sx={{ 
                                height: '100%', 
                                width: `${maxAssignment > 0 ? Math.min(100, (balance.totalDays / maxAssignment) * 100) : 0}%`,
                                bgcolor: '#2E7D32', // Green
                                borderRadius: 2 
                              }} 
                            />
                          </Box>
                        </BalanceCard>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </Box>
          </GlassCard>
        </Box>
      </Fade>

      {/* Two Column Row: Form | Records */}
      <Grid container spacing={4}>
        {/* Left Column: Submit Form */}
        <Grid item xs={12} lg={6}>
          <Fade in timeout={700}>
            <GlassCard
              sx={{ height: '100%', border: `1px solid ${alpha(accentColor, 0.1)}` }}
            >
              <Box
                sx={{
                  p: 4,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  color: accentColor,
                  display: 'flex',
                  alignItems: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <PersonIcon sx={{ fontSize: '1.8rem', mr: 2 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Submit New Leave Request
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    Fill in the details to request leave
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ p: 4 }}>
                <Grid container spacing={2}>
                  {/* Row 1: Employee Number */}
                  <Grid item xs={12}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, mb: 1, color: accentColor }}
                    >
                      Employee Number
                    </Typography>
                    <ModernTextField
                      value={personID}
                      disabled
                      fullWidth
                      size="small"
                      sx={{
                        '& .MuiInputBase-input.Mui-disabled': {
                          WebkitTextFillColor: '#000',
                        },
                      }}
                    />
                  </Grid>

                  {/* Row 2: Leave Type */}
                  <Grid item xs={12}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, mb: 1, color: accentColor }}
                    >
                      Leave Type *
                    </Typography>
                    <FormControl fullWidth size="small">
                      <ModernSelect
                        value={newLeaveRequest.leave_code}
                        onChange={(e) =>
                          handleChange('leave_code', e.target.value)
                        }
                        displayEmpty
                      >
                        <MenuItem value="">
                          <em>Select Leave Type</em>
                        </MenuItem>
                        {leaveTypes.map((type) => (
                          <MenuItem key={type.id} value={type.leave_code}>
                            ({type.leave_code}) - {type.leave_description}
                          </MenuItem>
                        ))}
                      </ModernSelect>
                    </FormControl>
                    {inlineLeaveTypeError && (
                      <Box sx={{ mt: 1 }}>
                        <Alert severity="error" icon={<WarningIcon fontSize="inherit" />} sx={{ fontSize: '0.95rem', py: 0.5, px: 2, borderRadius: 2, background: 'rgba(198,40,40,0.06)' }}>
                          {inlineLeaveTypeError}
                        </Alert>
                      </Box>
                    )}
                  </Grid>

                  {/* ── Balance indicator ── */}
                  {newLeaveRequest.leave_code && remainingDays !== null && isOverBalance && (
                    <Grid item xs={12}>
                      <Box
                        sx={{
                          px: 2,
                          py: 1.5,
                          borderRadius: 2,
                          bgcolor: 'rgba(198,40,40,0.06)',
                          border: '1.5px solid rgba(198,40,40,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                        }}
                      >
                        <WarningIcon
                          sx={{
                            color: '#C62828',
                            fontSize: 20,
                            flexShrink: 0,
                          }}
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: '#C62828',
                            flex: 1,
                          }}
                        >
                          {`Insufficient balance — you have ${remainingDays.toFixed(1)} day(s) but selected ${selectedDates.length}.`}
                        </Typography>
                      </Box>
                    </Grid>
                  )}

                  {/* Row 3: Leave Dates */}
                  <Grid item xs={12}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, mb: 1, color: accentColor }}
                    >
                      Leave Date(s) *
                    </Typography>
                    <ProfessionalButton
                      variant="outlined"
                      onClick={() => setDateModalOpen(true)}
                      startIcon={<CalendarIcon />}
                      sx={{
                        width: '100%',
                        height: 48, // Slightly taller for better clickability
                        border: `1.5px solid ${isOverBalance ? '#C62828' : accentColor}`,
                        color: isOverBalance ? '#C62828' : accentColor,
                        justifyContent: 'flex-start', // Align text left
                      }}
                      disabled={remainingDays === 0}
                    >
                      {selectedDates.length > 0
                        ? `${selectedDates.length} date(s) selected`
                        : 'Pick Leave Dates'}
                    </ProfessionalButton>

                    <LeaveDatePicker
                      open={dateModalOpen}
                      onClose={() => {
                        setNewLeaveRequest((prev) => ({
                          ...prev,
                          leave_date: selectedDates.join(','),
                        }));
                        setDateModalOpen(false);
                      }}
                      selectedDates={selectedDates}
                      setSelectedDates={setSelectedDates}
                      accentColor={accentColor}
                      accentDark={accentDark}
                      primaryColor={primaryColor}
                      secondaryColor={secondaryColor}
                      allowPastDates={isSickLeave()}
                      leaveType={newLeaveRequest.leave_code}
                      leaveRequests={leaveRequests}
                      maxSelectableDates={remainingDays}
                    />
                    {isSickLeave() && (
                      <Typography
                        variant="caption"
                        sx={{ color: '#1565C0', mt: 0.5, display: 'block' }}
                      >
                        * Past dates allowed for sick leave
                      </Typography>
                    )}
                  </Grid>

                  {/* Row 4: Selected Dates */}
                  <Grid item xs={12}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, mb: 1, color: 'accentColor' }}
                    >
                      Selected Dates
                    </Typography>
                    <Box
                      sx={{
                        minHeight: 48,
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 1,
                        p: 2,
                        border: `1px solid ${alpha(isOverBalance ? '#C62828' : accentColor, 0.2)}`,
                        borderRadius: 2,
                        backgroundColor: 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {selectedDates.length > 0 ? (
                        selectedDates.map((date) => {
                          // Check if this date is already HR-approved in leaveRequests
                          const isHRApproved = leaveRequests.some(
                            (req) => {
                              // leave_date can be comma-separated, so check if date is included
                              const reqDates = (req.leave_date || '').split(',').map(s => s.trim());
                              return reqDates.includes(date) && String(req.status) === '2';
                            }
                          );
                          const chip = (
                            <Chip
                              key={date}
                              label={formatDateDisplay(date)}
                              onDelete={
                                isHRApproved
                                  ? undefined
                                  : () =>
                                      setSelectedDates((prev) =>
                                        prev.filter((d) => d !== date),
                                      )
                              }
                              sx={{
                                bgcolor: isHRApproved ? 'rgba(198,40,40,0.12)' : 'rgba(46,125,50,0.15)',
                                color: isHRApproved ? '#C62828' : '#2E7D32',
                                fontSize: '0.85rem',
                                height: 32,
                                cursor: isHRApproved ? 'not-allowed' : 'pointer',
                                opacity: isHRApproved ? 0.7 : 1,
                              }}
                              disabled={isHRApproved}
                            />
                          );
                          return isHRApproved ? (
                            <Tooltip
                              key={date}
                              title={
                                'This date is unavailable. An HR-approved leave has already been scheduled.'
                              }
                              arrow
                            >
                              <span>{chip}</span>
                            </Tooltip>
                          ) : (
                            chip
                          );
                        })
                      ) : (
                        <Typography variant="body2" sx={{ color: '#999', fontStyle: 'italic' }}>
                          No dates selected
                        </Typography>
                      )}
                    </Box>
                    {/* Over-balance warning now shown in LeaveDatePicker only */}
                  </Grid>

                {/* Submit button */}
                <ProfessionalButton
                  onClick={handleAdd}
                  variant="contained"
                  startIcon={isOverBalance ? <WarningIcon /> : <AddIcon />}
                  fullWidth
                  disabled={isOverBalance || remainingDays === 0}
                  sx={{
                    mt: 2,
                    py: 1.2,
                    fontSize: '1rem',
                    backgroundColor: isOverBalance || remainingDays === 0 ? '#ccc' : accentColor,
                    color: isOverBalance || remainingDays === 0 ? '#666' : primaryColor,
                    '&:hover': {
                      backgroundColor: isOverBalance || remainingDays === 0 ? '#ccc' : accentDark,
                    },
                    '&:disabled': {
                      backgroundColor: '#ccc !important',
                      color: '#666 !important',
                    },
                  }}
                >
                  {remainingDays === 0
                    ? 'No Balance — Cannot Submit'
                    : isOverBalance
                    ? 'Insufficient Balance — Cannot Submit'
                    : 'Submit Leave Request'}
                </ProfessionalButton>
                {/* End of form inner Grid is below */}
              </Grid>
            </Box>
          </GlassCard>
        </Fade>
      </Grid>

      {/* Right Column: Records */}
      <Grid item xs={12} lg={6}>
          <Fade in timeout={900}>
            <GlassCard
              sx={{ height: '100%', border: `1px solid ${alpha(accentColor, 0.1)}`, display: 'flex', flexDirection: 'column' }}
            >
              <Box
                sx={{
                  p: 4,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  color: accentColor,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  flexWrap="wrap"
                  gap={2}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ReorderIcon sx={{ fontSize: '1.8rem', mr: 2 }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        My Leave Request Records
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        {filteredLeaveRequests.length} record(s)
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FilterIcon sx={{ fontSize: 20, color: accentColor }} />
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: accentColor }}
                      >
                        Filter:
                      </Typography>
                    </Box>
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                      <ModernSelect
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        displayEmpty
                        renderValue={(v) =>
                          v ? months.find((m) => m.value === v)?.label : 'Month'
                        }
                      >
                        {months.map((m) => (
                          <MenuItem key={m.value} value={m.value}>
                            {m.label}
                          </MenuItem>
                        ))}
                      </ModernSelect>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <ModernSelect
                        value={leaveTypeFilter}
                        onChange={(e) => setLeaveTypeFilter(e.target.value)}
                        displayEmpty
                        renderValue={(v) => v || 'Leave Type'}
                      >
                        <MenuItem value="">
                          <em>All Types</em>
                        </MenuItem>
                        {leaveTypes.map((t) => (
                          <MenuItem key={t.id} value={t.leave_code}>
                            {t.leave_code}
                          </MenuItem>
                        ))}
                      </ModernSelect>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                      <ModernSelect
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        displayEmpty
                        renderValue={(v) =>
                          v
                            ? statusOptions.find((s) => s.value === v)?.label
                            : 'Status'
                        }
                      >
                        {statusOptions.map((s) => (
                          <MenuItem key={s.value} value={s.value}>
                            {s.label}
                          </MenuItem>
                        ))}
                      </ModernSelect>
                    </FormControl>
                  </Box>
                </Box>
              </Box>

              <Box
                sx={{
                  p: 4,
                  flexGrow: 1,
                  maxHeight: 340,
                  overflowY: 'auto',
                  '&::-webkit-scrollbar': { width: 6 },
                  '&::-webkit-scrollbar-track': {
                    background: '#f1f1f1',
                    borderRadius: 3,
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: accentColor,
                    borderRadius: 3,
                  },
                }}
              >
                {filteredLeaveRequests.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <EventNote
                      sx={{
                        fontSize: 48,
                        color: alpha(accentColor, 0.25),
                        mb: 2,
                      }}
                    />
                    <Typography
                      variant="h6"
                      sx={{ color: accentColor, fontWeight: 600 }}
                    >
                      No Leave Requests Found
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#666', mt: 1 }}>
                      {monthFilter || leaveTypeFilter || statusFilter
                        ? 'Try adjusting your filters'
                        : 'Submit your first request using the form'}
                    </Typography>
                  </Box>
                ) : (
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
                  >
                    {filteredLeaveRequests.map((leaveRequest) => {
                      const typeInfo = getLeaveTypeInfo(
                        leaveRequest.leave_code,
                      );
                      const statusInfo = getStatusInfo(leaveRequest.status);
                      const canCancel = String(leaveRequest.status) === '0';
                      const StatusIcon = statusInfo.icon;
                      return (
                        <RecordCard key={leaveRequest.id}>
                          <CardContent sx={{ p: 3 }}>
                            <Grid container spacing={3} alignItems="center">
                              <Grid item xs={12} md={3}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: '#666',
                                    display: 'block',
                                    mb: 1,
                                  }}
                                >
                                  Leave Type
                                </Typography>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                  }}
                                >
                                  <EventNote
                                    sx={{ fontSize: 18, color: accentColor }}
                                  />
                                  <Typography
                                    variant="body1"
                                    sx={{ fontWeight: 600, color: accentColor }}
                                  >
                                    {typeInfo.leave_code ||
                                      leaveRequest.leave_code}
                                  </Typography>
                                </Box>
                                <Typography
                                  variant="caption"
                                  sx={{ color: '#666' }}
                                >
                                  {typeInfo.leave_description}
                                </Typography>
                              </Grid>
                              <Grid item xs={6} md={2}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: '#666',
                                    display: 'block',
                                    mb: 1,
                                  }}
                                >
                                  Leave Date
                                </Typography>
                                <Typography
                                  variant="body1"
                                  sx={{ fontWeight: 600 }}
                                >
                                  {formatDate(leaveRequest.leave_date)}
                                </Typography>
                              </Grid>
                              <Grid item xs={6} md={3}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: '#666',
                                    display: 'block',
                                    mb: 1,
                                  }}
                                >
                                  Submitted
                                </Typography>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                  }}
                                >
                                  <ScheduleIcon
                                    sx={{ fontSize: 16, color: '#888' }}
                                  />
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 500 }}
                                  >
                                    {formatDateTime(
                                      leaveRequest.createdAt ||
                                        leaveRequest.dateSubmitted,
                                    )}
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={6} md={2}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: '#666',
                                    display: 'block',
                                    mb: 1,
                                  }}
                                >
                                  Status
                                </Typography>
                                <Box
                                  sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    px: 2,
                                    py: 0.75,
                                    borderRadius: 2,
                                    bgcolor: statusInfo.bg,
                                    border: `1px solid ${alpha(statusInfo.color, 0.2)}`,
                                  }}
                                >
                                  <StatusIcon
                                    sx={{
                                      fontSize: 16,
                                      color: statusInfo.color,
                                    }}
                                  />
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: 600,
                                      color: statusInfo.color,
                                    }}
                                  >
                                    {statusInfo.label}
                                  </Typography>
                                </Box>
                                {statusInfo.sublabel && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: '#888',
                                      display: 'block',
                                      mt: 0.5,
                                    }}
                                  >
                                    {statusInfo.sublabel}
                                  </Typography>
                                )}
                              </Grid>
                              <Grid item xs={6} md={2}>
                                {canCancel && (
                                  <ProfessionalButton
                                    size="small"
                                    variant="outlined"
                                    onClick={() =>
                                      handleCancelRequest(leaveRequest.id)
                                    }
                                    sx={{
                                      color: '#C62828',
                                      borderColor: alpha('#C62828', 0.3),
                                      '&:hover': {
                                        backgroundColor: alpha('#C62828', 0.08),
                                        borderColor: '#C62828',
                                      },
                                    }}
                                  >
                                    Cancel Request
                                  </ProfessionalButton>
                                )}
                              </Grid>
                            </Grid>
                          </CardContent>
                        </RecordCard>
                      );
                    })}
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
              width: { xs: '92%', sm: '85%', md: 760 },
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
                <CloseIcon />
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
                          key={`log-${log.id}`}
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
    </Box>
  );
};

export default LeaveRequestUser;
