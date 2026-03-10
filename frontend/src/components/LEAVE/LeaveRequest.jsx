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
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  DoneAll as DoneAllIcon,
  ThumbDown as ThumbDownIcon,
  HistoryToggleOff,
  FilterList as FilterIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';

import SuccessfulOverlay from '../SuccessfulOverlay';
import LeaveDatePickerModal from './LeaveDatePicker';
import LeaveCredits from './LeaveCredits';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import {
  createThemedCard,
  createThemedButton,
  createThemedTextField,
} from '../../utils/theme';

// ─── Styled components (matching LeaveRequestUser) ────────────────────────────

const GlassCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  backdropFilter: 'blur(10px)',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 4px 24px rgba(109,35,35,0.06)',
}));

const ProfessionalButton = styled(Button)(() => ({
  borderRadius: 12,
  fontWeight: 600,
  padding: '10px 20px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  textTransform: 'none',
  fontSize: '0.9rem',
  letterSpacing: '0.025em',
  '&:hover': { transform: 'translateY(-2px)' },
  '&:active': { transform: 'translateY(0)' },
}));

const ModernTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backgroundColor: 'rgba(255,255,255,0.8)',
    '&:hover': { transform: 'translateY(-1px)', backgroundColor: 'rgba(255,255,255,0.95)' },
    '&.Mui-focused': {
      transform: 'translateY(-1px)',
      backgroundColor: '#fff',
      boxShadow: '0 4px 20px rgba(109,35,35,0.12)',
    },
  },
  '& .MuiInputLabel-root': { fontWeight: 500 },
}));

const RecordCard = styled(Card)(() => ({
  borderRadius: 14,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  border: '1px solid rgba(109,35,35,0.08)',
  boxShadow: '0 2px 10px rgba(109,35,35,0.04)',
  '&:hover': {
    boxShadow: '0 8px 24px rgba(109,35,35,0.12)',
    borderColor: 'rgba(109,35,35,0.18)',
    transform: 'translateY(-2px)',
  },
}));

// ─── Shimmer / Wireframe ──────────────────────────────────────────────────────

const lrShimmerKeyframes = `
@keyframes lrShimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes lrPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.6; }
}
`;

const SkeletonBox = ({ width = '100%', height = 16, borderRadius = 8, sx = {} }) => (
  <Box sx={{
    width, height,
    borderRadius: `${borderRadius}px`,
    background: 'linear-gradient(90deg,rgba(109,35,35,0.08) 25%,rgba(109,35,35,0.18) 50%,rgba(109,35,35,0.08) 75%)',
    backgroundSize: '800px 100%',
    animation: 'lrShimmer 1.5s infinite linear',
    flexShrink: 0,
    ...sx,
  }} />
);

const LeaveRequestWireframe = ({
  accentColor = '#6d2323',
  primaryColor = '#FEF9E1',
  secondaryColor = '#FFF8E7',
}) => (
  <>
    <style>{lrShimmerKeyframes}</style>
    {/* Same outer wrapper as real page */}
    <Box sx={{ py: 4, mt: -5, width: '100vw', maxWidth: '100%', position: 'relative', left: '50%', transform: 'translateX(-50%)' }}>
      <Box sx={{ px: { xs: 2, sm: 3, md: 6 }, mx: 'auto', maxWidth: '1800px' }}>

        {/* ── Header skeleton ── */}
        <Box sx={{ mb: 4, borderRadius: '20px', overflow: 'hidden', border: `1px solid ${alpha(accentColor, 0.1)}`, animation: 'lrPulse 2s ease-in-out infinite' }}>
          <Box sx={{ p: 5, background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`, position: 'relative', overflow: 'hidden' }}>
            {/* radial decorations */}
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', bgcolor: alpha(accentColor, 0.06) }} />
            <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', bgcolor: alpha(accentColor, 0.04) }} />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {/* avatar */}
                <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: alpha(accentColor, 0.12), mr: 4, flexShrink: 0 }} />
                <Box>
                  <SkeletonBox width={290} height={28} borderRadius={6} sx={{ mb: 1.5 }} />
                  <SkeletonBox width={370} height={14} borderRadius={4} />
                </Box>
              </Box>
              {/* right: chip + refresh icon + Transaction Logs button */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <SkeletonBox width={90} height={24} borderRadius={12} />
                <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: alpha(accentColor, 0.10) }} />
                <Box sx={{ width: 158, height: 48, borderRadius: '12px', bgcolor: alpha(accentColor, 0.10) }} />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ── Two-column skeleton ── */}
        <Grid container spacing={4}>

          {/* Left: Form */}
          <Grid item xs={12} lg={6}>
            <Box sx={{ borderRadius: '20px', overflow: 'hidden', border: `1px solid ${alpha(accentColor, 0.1)}`, animation: 'lrPulse 2s ease-in-out 0.08s infinite', height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
              {/* panel header */}
              <Box sx={{ p: 4, background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`, display: 'flex', alignItems: 'center', gap: 2, borderBottom: `1px solid ${alpha(accentColor, 0.08)}`, flexShrink: 0 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: alpha(accentColor, 0.12), flexShrink: 0 }} />
                <Box>
                  <SkeletonBox width={200} height={16} borderRadius={4} sx={{ mb: 0.75 }} />
                  <SkeletonBox width={175} height={11} borderRadius={3} />
                </Box>
              </Box>
              {/* form body */}
              <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1 }}>
                {/* Section: Employee Information */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '4px', bgcolor: alpha(accentColor, 0.15) }} />
                  <SkeletonBox width={180} height={14} borderRadius={4} />
                </Box>
                {/* Employee number field */}
                <Box>
                  <SkeletonBox width={130} height={11} borderRadius={3} sx={{ mb: 1 }} />
                  <Box sx={{ height: 44, borderRadius: '12px', border: `1px solid ${alpha(accentColor, 0.15)}`, bgcolor: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', px: 2, gap: 1 }}>
                    <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: alpha(accentColor, 0.15), flexShrink: 0 }} />
                    <SkeletonBox width="55%" height={12} borderRadius={3} />
                  </Box>
                </Box>
                {/* Divider */}
                <Box sx={{ height: 1, bgcolor: alpha(accentColor, 0.1) }} />
                {/* Section: Leave Details */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '4px', bgcolor: alpha(accentColor, 0.15) }} />
                  <SkeletonBox width={110} height={14} borderRadius={4} />
                </Box>
                {/* Leave Type field */}
                <Box>
                  <SkeletonBox width={75} height={11} borderRadius={3} sx={{ mb: 1 }} />
                  <Box sx={{ height: 44, borderRadius: '12px', border: `1px solid ${alpha(accentColor, 0.15)}`, bgcolor: 'rgba(255,255,255,0.8)' }} />
                </Box>
                {/* Leave Date(s) — button style */}
                <Box>
                  <SkeletonBox width={100} height={11} borderRadius={3} sx={{ mb: 1 }} />
                  <Box sx={{ height: 44, borderRadius: '12px', border: `1.5px solid ${alpha(accentColor, 0.3)}`, bgcolor: alpha(accentColor, 0.04), display: 'flex', alignItems: 'center', px: 2, gap: 1.5 }}>
                    <Box sx={{ width: 20, height: 20, borderRadius: '4px', bgcolor: alpha(accentColor, 0.15) }} />
                    <SkeletonBox width={130} height={12} borderRadius={3} />
                  </Box>
                </Box>
                {/* Initial Status field */}
                <Box>
                  <SkeletonBox width={90} height={11} borderRadius={3} sx={{ mb: 1 }} />
                  <Box sx={{ height: 44, borderRadius: '12px', border: `1px solid ${alpha(accentColor, 0.15)}`, bgcolor: 'rgba(255,255,255,0.8)' }} />
                </Box>
                {/* Submit button — pushed to bottom */}
                <Box sx={{ mt: 'auto', pt: 1 }}>
                  <Box sx={{ height: 52, borderRadius: '12px', bgcolor: alpha(accentColor, 0.2) }} />
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* Right: Records */}
          <Grid item xs={12} lg={6}>
            <Box sx={{ borderRadius: '20px', overflow: 'hidden', border: `1px solid ${alpha(accentColor, 0.1)}`, animation: 'lrPulse 2s ease-in-out 0.13s infinite', height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
              {/* panel header — full gradient section */}
              <Box sx={{ p: 4, background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`, borderBottom: `1px solid ${alpha(accentColor, 0.08)}`, flexShrink: 0 }}>
                {/* title row + Select/View toggle */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: alpha(accentColor, 0.12), flexShrink: 0 }} />
                    <Box>
                      <SkeletonBox width={195} height={16} borderRadius={4} sx={{ mb: 0.75 }} />
                      <SkeletonBox width={210} height={11} borderRadius={3} />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Box sx={{ width: 82, height: 34, borderRadius: '12px', border: `1px solid ${alpha(accentColor, 0.25)}`, bgcolor: 'rgba(255,255,255,0.7)' }} />
                    <Box sx={{ width: 72, height: 34, borderRadius: '10px', border: `1px solid ${alpha(accentColor, 0.2)}`, bgcolor: 'rgba(255,255,255,0.7)' }} />
                  </Box>
                </Box>
                {/* Search + leave type filter */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box sx={{ flex: 1, height: 40, borderRadius: '12px', border: `1px solid ${alpha(accentColor, 0.15)}`, bgcolor: 'rgba(255,255,255,0.8)' }} />
                  <Box sx={{ width: 170, height: 40, borderRadius: '12px', border: `1px solid ${alpha(accentColor, 0.15)}`, bgcolor: 'rgba(255,255,255,0.8)' }} />
                </Box>
                {/* Status filter chips */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {[72, 100, 110, 72, 82].map((w, i) => (
                    <Box key={i} sx={{ width: w, height: 28, borderRadius: '14px', border: `1px solid ${alpha(accentColor, 0.2)}`, bgcolor: i === 0 ? alpha(accentColor, 0.15) : 'transparent', animation: `lrPulse 2s ease-in-out ${i * 0.06}s infinite` }} />
                  ))}
                </Box>
              </Box>

              {/* Record cards */}
              <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}>
                {[...Array(4)].map((_, i) => (
                  <Box key={i} sx={{ borderRadius: '14px', border: `1px solid ${alpha(accentColor, 0.08)}`, p: 2.5, bgcolor: '#fff', animation: `lrPulse 2s ease-in-out ${i * 0.07}s infinite` }}>
                    {/* employee number row */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                      <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: alpha(accentColor, 0.15) }} />
                      <SkeletonBox width={70} height={10} borderRadius={3} />
                    </Box>
                    {/* name + leave type */}
                    <SkeletonBox width="60%" height={13} borderRadius={3} sx={{ mb: 0.5 }} />
                    <SkeletonBox width="45%" height={11} borderRadius={3} sx={{ mb: 1.5 }} />
                    {/* date + status chip row */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <SkeletonBox width={90} height={11} borderRadius={3} />
                      <Box sx={{
                        width: 100, height: 22, borderRadius: '11px',
                        bgcolor: i === 0 ? alpha('#F57C00', 0.15) : i === 1 ? alpha('#1565C0', 0.12) : i === 2 ? alpha('#2E7D32', 0.12) : alpha('#C62828', 0.1),
                      }} />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Grid>

        </Grid>
      </Box>
    </Box>
  </>
);

// ─── LeaveRequest ─────────────────────────────────────────────────────────────

const LeaveRequest = () => {
  const { socket, connected } = useSocket();
  const refreshRef = useRef(null);

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employeeNames, setEmployeeNames] = useState({});
  const [newRequest, setNewRequest] = useState({ employeeNumber: '', leave_code: '', leave_date: '', status: '0' });
  const [editRequest, setEditRequest] = useState(null);
  const [originalRequest, setOriginalRequest] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
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

  const primaryColor    = settings.accentColor      || '#FEF9E1';
  const secondaryColor  = settings.backgroundColor  || '#FFF8E7';
  const accentColor     = settings.primaryColor     || '#6d2323';
  const accentDark      = settings.secondaryColor   || '#8B3333';
  const textPrimaryColor = settings.textPrimaryColor || '#6d2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';
  const grayColor       = settings.textSecondaryColor || '#6c757d';

  const statusOptions = [
    { value: '0', label: 'Pending Review',                   short: 'Pending',                      color: '#F57C00', bg: '#FFF3E0', icon: AccessTime    },
    { value: '1', label: 'Immediate Supervisor Approved',    short: 'Supervisor Approved',           color: '#1565C0', bg: '#E3F2FD', icon: CheckCircle   },
    { value: '2', label: 'HR Approved',                      short: 'HR Approved',                   color: '#2E7D32', bg: '#E8F5E9', icon: CheckCircle   },
    { value: '3', label: 'Denied',                           short: 'Denied',                        color: '#C62828', bg: '#FFEBEE', icon: Block         },
    { value: '4', label: 'Cancelled',                        short: 'Cancelled',                     color: '#757575', bg: '#F5F5F5', icon: CancelIcon    },
  ];

  const isSickLeave = (code) => {
    const t = leaveTypes.find((x) => x.leave_code === code);
    if (!t) return false;
    return (t.leave_code || '').toLowerCase().includes('sl') || (t.leave_description || '').toLowerCase().includes('sick');
  };

  useEffect(() => { setPage(0); }, [deferredSearch, statusFilter, leaveTypeFilter]);

  useEffect(() => {
    const init = async () => {
      await fetchAll();
      setPageLoading(false);
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refreshRef.current = fetchAll; });

  useEffect(() => {
    if (!socket || !connected) return;
    const handleChanged = () => refreshRef.current?.();
    socket.on('leaveRequestChanged', handleChanged);
    return () => socket.off('leaveRequestChanged', handleChanged);
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
      await Promise.all(empNums.map(async (emp) => {
        try {
          const res = await axios.get(`${API_BASE_URL}/personalinfo/person_table/${emp}`, getAuthHeaders());
          names[emp] = [res.data.firstName, res.data.lastName].filter(Boolean).join(' ') || 'Unknown';
        } catch { names[emp] = 'Unknown'; }
      }));
      setEmployeeNames(names);
    } catch (e) { console.error(e); }
  };

  const handleAdd = async () => {
    if (!newRequest.employeeNumber || !newRequest.leave_code || !newRequest.leave_date) {
      alert('Please fill all required fields'); return;
    }
    const leaveDates = Array.isArray(newRequest.leave_date) ? newRequest.leave_date : newRequest.leave_date.split(',').filter((d) => d.trim());
    const hoursRequested = leaveDates.length * 8;
    const creditsRes = await axios.get(`${API_BASE_URL}/leaveRoute/leave_assignment`, getAuthHeaders());
    const assignment = creditsRes.data?.assignments || [];
    const leaveAssignment = assignment.find((a) => a.employeeNumber?.toString() === newRequest.employeeNumber?.toString() && a.leave_code === newRequest.leave_code);
    if (leaveAssignment) {
      const available = (parseFloat(leaveAssignment.allocated_hours) || 0) - (parseFloat(leaveAssignment.used_hours) || 0);
      if (available < hoursRequested) { alert(`Insufficient allocated hours. Requested: ${(hoursRequested / 8).toFixed(1)} days, Available: ${(available / 8).toFixed(1)} days`); return; }
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/leaveRoute/leave_request`, { employeeNumber: newRequest.employeeNumber, leave_code: newRequest.leave_code, leave_dates: [newRequest.leave_date], status: Number(newRequest.status) }, getAuthHeaders());
      setNewRequest({ employeeNumber: '', leave_code: '', leave_date: '', status: '0' });
      setSelectedDates([]);
      setSuccessAction('adding'); setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      fetchAll();
    } catch { alert('Error adding request'); } finally { setLoading(false); }
  };

  const handleUpdate = async () => {
    try {
      await axios.put(`${API_BASE_URL}/leaveRoute/leave_request/${editRequest.id}`, { employeeNumber: editRequest.employeeNumber, leave_code: editRequest.leave_code, leave_date: editRequest.leave_date, status: Number(editRequest.status) }, getAuthHeaders());
      closeModal();
      setSuccessAction('edit'); setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      fetchAll();
    } catch { alert('Error updating request'); }
  };

  const handleDelete = async (id, status) => {
    if (String(status) === '4') { alert('Cannot delete cancelled request'); return; }
    if (!window.confirm('Delete this leave request?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/leaveRoute/leave_request/${id}`, getAuthHeaders());
      closeModal();
      setSuccessAction('delete'); setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      fetchAll();
    } catch { alert('Error deleting request'); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this leave request?')) return;
    try {
      const r = leaveRequests.find((x) => x.id === id);
      await axios.put(`${API_BASE_URL}/leaveRoute/leave_request/${id}`, { ...r, status: 4 }, getAuthHeaders());
      closeModal();
      setSuccessAction('cancel'); setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      fetchAll();
    } catch { alert('Error cancelling request'); }
  };

  const closeModal = () => { setEditRequest(null); setOriginalRequest(null); setIsEditing(false); };
  const hasChanges = () => {
    if (!editRequest || !originalRequest) return false;
    return editRequest.employeeNumber !== originalRequest.employeeNumber || editRequest.leave_code !== originalRequest.leave_code || editRequest.leave_date !== originalRequest.leave_date || editRequest.status !== originalRequest.status;
  };

  const handleViewModeChange = (event, newMode) => { if (newMode !== null) setViewMode(newMode); };
  const toggleSelectMode = () => { setSelectMode(!selectMode); setSelectedRequests([]); };
  const handleSelectRequest = (id) => setSelectedRequests((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);
  const handleSelectAll = () => setSelectedRequests(selectedRequests.length === paged.length ? [] : paged.map((r) => r.id));

  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedRequests.length === 0) { alert('Please select at least one request'); return; }
    const statusLabel = statusOptions.find((o) => o.value === String(newStatus))?.label || 'Unknown';
    if (!window.confirm(`Update ${selectedRequests.length} request(s) to "${statusLabel}"?`)) return;
    setBulkLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/leaveRoute/leave_request/bulk-update`, { ids: selectedRequests, status: newStatus }, getAuthHeaders());
      setSuccessAction('bulk'); setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      setSelectedRequests([]); setSelectMode(false); fetchAll();
    } catch (error) { alert('Error updating requests: ' + (error.response?.data?.error || error.message)); }
    finally { setBulkLoading(false); }
  };

  const filtered = useMemo(() => {
    let data = leaveRequests;
    if (statusFilter !== 'all') data = data.filter((r) => String(r.status) === statusFilter);
    if (leaveTypeFilter !== 'all') data = data.filter((r) => r.leave_code === leaveTypeFilter);
    const s = (deferredSearch || '').toLowerCase().trim();
    if (s) data = data.filter((r) => (employeeNames[r.employeeNumber] || '').toLowerCase().includes(s) || (r.employeeNumber || '').toLowerCase().includes(s));
    return data;
  }, [leaveRequests, deferredSearch, employeeNames, statusFilter, leaveTypeFilter]);

  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const counts = { all: leaveRequests.length, 0: leaveRequests.filter((r) => String(r.status) === '0').length, 1: leaveRequests.filter((r) => String(r.status) === '1').length, 2: leaveRequests.filter((r) => String(r.status) === '2').length, 3: leaveRequests.filter((r) => String(r.status) === '3').length };

  const getStatus = (v) => statusOptions.find((o) => o.value === String(v)) || statusOptions[0];
  const getType = (c) => leaveTypes.find((t) => t.leave_code === c) || { leave_description: c };
  const formatDate = (d) => {
    if (!d) return 'N/A';
    const s = Array.isArray(d) ? d[0] : d.split(',')[0];
    const [y, m, day] = s.trim().split('-');
    return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const formatDateTime = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderTransactionMessage = (message) => {
    const safeMessage = message || 'No message';
    const lower = safeMessage.toLowerCase();
    const highlights = [];
    if (lower.includes('immediate supervisor')) { highlights.push({ pattern: /immediate supervisor/gi, color: '#1565C0' }); highlights.push({ pattern: /\bapprove\b/gi, color: '#1565C0' }); }
    else if (lower.includes('hr') && lower.includes('approve')) { highlights.push({ pattern: /\bhr\b/gi, color: '#2E7D32' }); highlights.push({ pattern: /\bapprove\b/gi, color: '#2E7D32' }); }
    else if (lower.includes('rejected')) highlights.push({ pattern: /\brejected\b/gi, color: '#C62828' });
    else if (lower.includes('requested')) highlights.push({ pattern: /\brequested\b/gi, color: '#D4A017' });
    if (!highlights.length) return safeMessage;
    let rendered = [safeMessage];
    highlights.forEach(({ pattern, color }, idx) => {
      rendered = rendered.flatMap((part, partIdx) => {
        if (typeof part !== 'string') return [part];
        const chunks = part.split(pattern); const matches = part.match(pattern) || [];
        if (!matches.length) return [part];
        const out = [];
        chunks.forEach((chunk, i) => { if (chunk) out.push(chunk); if (i < matches.length) out.push(<Box component="span" key={`hl-${idx}-${partIdx}-${i}`} sx={{ color, fontWeight: 700 }}>{matches[i]}</Box>); });
        return out;
      });
    });
    return <>{rendered}</>;
  };

  const fetchTransactionLogs = async () => {
    setTransactionLogsLoading(true); setTransactionLogsError('');
    try {
      const res = await axios.get(`${API_BASE_URL}/leaveRoute/leave_request/transactions`, getAuthHeaders());
      setTransactionLogs(Array.isArray(res.data) ? res.data : []);
    } catch (e) { console.error(e); setTransactionLogsError('Failed to load transaction logs.'); setTransactionLogs([]); }
    finally { setTransactionLogsLoading(false); }
  };

  useEffect(() => { if (transactionLogsModalOpen) fetchTransactionLogs(); }, [transactionLogsModalOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Wireframe ─────────────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <LeaveRequestWireframe
        accentColor={accentColor}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />
    );
  }

  return (
    <Fade in timeout={500}>
      <Box sx={{ py: { xs: 2, md: 4 }, mt: { xs: 0, md: -5 }, width: '100%', maxWidth: '1600px', mx: 'auto', overflowX: 'hidden' }}>
        <Box sx={{ px: { xs: 2, sm: 3, md: 6 } }}>

          <Backdrop sx={{ color: primaryColor, zIndex: (t) => t.zIndex.drawer + 1 }} open={loading}>
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress color="inherit" size={60} thickness={4} />
              <Typography variant="h6" sx={{ mt: 2, color: primaryColor }}>Processing leave request...</Typography>
            </Box>
          </Backdrop>

          <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />

          {/* ── Header ── */}
          <Fade in timeout={500}>
            <Box sx={{ mb: 4 }}>
              <GlassCard sx={{ border: `1px solid ${alpha(accentColor, 0.1)}` }}>
                <Box sx={{ p: 5, background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`, color: accentColor, position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: 'radial-gradient(circle, rgba(109,35,35,0.1) 0%, rgba(109,35,35,0) 70%)' }} />
                  <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, background: 'radial-gradient(circle, rgba(109,35,35,0.08) 0%, rgba(109,35,35,0) 70%)' }} />
                  <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ bgcolor: alpha(accentColor, 0.15), mr: 4, width: 64, height: 64, boxShadow: `0 8px 24px ${alpha(accentColor, 0.15)}` }}>
                        <BusinessIcon sx={{ color: accentColor, fontSize: 32 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2, color: accentColor }}>
                          Leave Request Management
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.8, fontWeight: 400, color: accentDark }}>
                          Administrative Panel • Submit and manage employee leave requests
                        </Typography>
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Button
                        onClick={() => setTransactionLogsModalOpen(true)}
                        startIcon={<HistoryToggleOff />}
                        sx={{ bgcolor: alpha(accentColor, 0.1), '&:hover': { bgcolor: alpha(accentColor, 0.2) }, color: accentColor, borderRadius: 3, px: 2, py: 1, fontWeight: 600, fontSize: '0.85rem', textTransform: 'none', whiteSpace: 'nowrap' }}
                      >
                        Transaction Logs
                      </Button>
                       <Tooltip title="Refresh Data">
                        <IconButton onClick={() => fetchAll()} sx={{ bgcolor: alpha(accentColor, 0.1), '&:hover': { bgcolor: alpha(accentColor, 0.2) }, color: accentColor, width: 48, height: 48 }}>
                          <Refresh />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Box>
              </GlassCard>
            </Box>
          </Fade>

          {/* ── Two-column layout ── */}
          <Grid container spacing={4}>

            {/* Left: Add New Request */}
            <Grid item xs={12} lg={6}>
              <Fade in timeout={700}>
                <GlassCard sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', border: `1px solid ${alpha(accentColor, 0.1)}` }}>
                  <Box sx={{ p: 4, background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`, display: 'flex', alignItems: 'center', borderBottom: `1px solid ${alpha(accentColor, 0.08)}` }}>
                    <Avatar sx={{ bgcolor: alpha(accentColor, 0.12), width: 40, height: 40, mr: 2 }}>
                      <EventNote sx={{ color: accentColor, fontSize: 22 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: accentColor, lineHeight: 1.2 }}>Add New Leave Request</Typography>
                      <Typography variant="caption" sx={{ color: accentDark, opacity: 0.8 }}>Create a new leave request entry</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ p: 4, flexGrow: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', '&::-webkit-scrollbar': { width: 6 }, '&::-webkit-scrollbar-track': { background: alpha(primaryColor, 0.5), borderRadius: 3 }, '&::-webkit-scrollbar-thumb': { background: alpha(accentColor, 0.3), borderRadius: 3 } }}>

                    {/* Employee Information */}
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
                        <PersonIcon sx={{ color: accentColor, fontSize: 20, mr: 1.5 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: accentColor, fontSize: '1rem' }}>
                          Employee Information
                          <Box component="span" sx={{ color: '#C62828', ml: 1, fontWeight: 400 }}>*</Box>
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: accentColor }}>Employee Number</Typography>
                      <ModernTextField
                        value={newRequest.employeeNumber}
                        onChange={(e) => setNewRequest({ ...newRequest, employeeNumber: e.target.value })}
                        fullWidth size="small" placeholder="Enter employee ID"
                        InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon sx={{ color: accentColor, fontSize: 20 }} /></InputAdornment> }}
                      />
                    </Box>

                    <Divider sx={{ my: 2, borderColor: alpha(accentColor, 0.1) }} />

                    {/* Leave Details */}
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
                        <EventNote sx={{ color: accentColor, fontSize: 20, mr: 1.5 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: accentColor, fontSize: '1rem' }}>Leave Details</Typography>
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: accentColor }}>
                            Leave Type <Box component="span" sx={{ color: '#C62828' }}>*</Box>
                          </Typography>
                          <ModernTextField
                            select fullWidth size="small"
                            value={newRequest.leave_code}
                            onChange={(e) => { setNewRequest({ ...newRequest, leave_code: e.target.value }); setSelectedDates([]); }}
                            SelectProps={{
                              displayEmpty: true,
                              renderValue: (value) => value ? `${value} — ${leaveTypes.find((t) => t.leave_code === value)?.leave_description || ''}` : <em style={{ color: '#aaa' }}>Select Leave Type</em>,
                            }}
                          >
                            <MenuItem value=""><em>Select Leave Type</em></MenuItem>
                            {leaveTypes.map((t) => (
                              <MenuItem key={t.id} value={t.leave_code}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Chip label={t.leave_code} size="small" sx={{ bgcolor: alpha(accentColor, 0.1), color: accentColor, fontWeight: 700, fontSize: '0.7rem', height: 20 }} />
                                  <Typography variant="body2">{t.leave_description}</Typography>
                                </Box>
                              </MenuItem>
                            ))}
                          </ModernTextField>
                        </Grid>

                        <Grid item xs={12}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: accentColor }}>
                            Leave Date(s) <Box component="span" sx={{ color: '#C62828' }}>*</Box>
                          </Typography>
                          <ProfessionalButton
                            variant="outlined" onClick={() => setDateModalOpen(true)} startIcon={<CalendarMonth />} fullWidth
                            sx={{ height: 44, border: `1.5px solid ${accentColor}`, color: accentColor, justifyContent: 'flex-start', bgcolor: alpha(accentColor, 0.04), '&:hover': { bgcolor: alpha(accentColor, 0.08), border: `1.5px solid ${accentColor}` } }}
                          >
                            {selectedDates.length > 0 ? `${selectedDates.length} date(s) selected` : 'Select Leave Dates'}
                          </ProfessionalButton>
                          {isSickLeave(newRequest.leave_code) && (
                            <Typography variant="caption" sx={{ color: '#1565C0', mt: 0.5, display: 'block', fontStyle: 'italic' }}>* Past dates allowed for sick leave</Typography>
                          )}
                          <LeaveDatePickerModal
                            open={dateModalOpen}
                            onClose={() => { setNewRequest({ ...newRequest, leave_date: selectedDates.join(',') }); setDateModalOpen(false); }}
                            selectedDates={selectedDates} setSelectedDates={setSelectedDates}
                            accentColor={accentColor} accentDark={accentDark} primaryColor={primaryColor} secondaryColor={secondaryColor}
                            allowPastDates={isSickLeave(newRequest.leave_code)}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: accentColor }}>Initial Status</Typography>
                          <ModernTextField
                            select fullWidth size="small"
                            value={newRequest.status}
                            onChange={(e) => setNewRequest({ ...newRequest, status: e.target.value })}
                            SelectProps={{ renderValue: (value) => statusOptions.find((o) => o.value === value)?.label || 'Select Status' }}
                          >
                            {statusOptions.slice(0, 2).map((o) => (
                              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                            ))}
                          </ModernTextField>
                        </Grid>
                      </Grid>
                    </Box>

                    <Box sx={{ mt: 'auto', pt: 2 }}>
                      <ProfessionalButton
                        onClick={handleAdd} variant="contained" startIcon={<AddIcon />} fullWidth
                        sx={{ py: 1.5, fontSize: '1rem', backgroundColor: accentColor, color: textSecondaryColor, boxShadow: `0 4px 14px ${alpha(accentColor, 0.35)}`, '&:hover': { backgroundColor: accentDark, boxShadow: `0 6px 20px ${alpha(accentColor, 0.45)}` } }}
                      >
                        Add Leave Request
                      </ProfessionalButton>
                    </Box>
                  </Box>
                </GlassCard>
              </Fade>
            </Grid>

            {/* Right: Records */}
            <Grid item xs={12} lg={6}>
              <Fade in timeout={900}>
                <GlassCard sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', border: `1px solid ${alpha(accentColor, 0.1)}` }}>

                  {/* Records header */}
                  <Box sx={{ p: 4, background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`, borderBottom: `1px solid ${alpha(accentColor, 0.08)}` }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2.5}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: alpha(accentColor, 0.12), width: 40, height: 40, mr: 2 }}>
                          <ReorderIcon sx={{ color: accentColor, fontSize: 22 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: accentColor, lineHeight: 1.2 }}>Leave Request Records</Typography>
                          <Typography variant="caption" sx={{ color: accentDark, opacity: 0.8 }}>Click a record to view and manage details</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title={selectMode ? 'Exit Selection Mode' : 'Select Multiple'}>
                          <Button
                            onClick={toggleSelectMode} size="small"
                            variant={selectMode ? 'contained' : 'outlined'}
                            startIcon={selectMode ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
                            sx={{
                              color: selectMode ? textSecondaryColor : accentColor,
                              backgroundColor: selectMode ? accentColor : 'transparent',
                              borderColor: alpha(accentColor, 0.4), borderRadius: 3,
                              textTransform: 'none', fontWeight: 600, fontSize: '0.8rem',
                              '&:hover': { backgroundColor: selectMode ? accentDark : alpha(accentColor, 0.08), borderColor: accentColor },
                            }}
                          >
                            {selectMode ? 'Cancel' : 'Select'}
                          </Button>
                        </Tooltip>
                        <ToggleButtonGroup value={viewMode} exclusive onChange={handleViewModeChange} size="small"
                          sx={{ bgcolor: alpha(accentColor, 0.06), borderRadius: 2, '& .MuiToggleButton-root': { color: accentColor, borderColor: alpha(accentColor, 0.2), px: 1.5, '&.Mui-selected': { bgcolor: alpha(accentColor, 0.15), color: accentColor } } }}>
                          <ToggleButton value="grid"><ViewModuleIcon fontSize="small" /></ToggleButton>
                          <ToggleButton value="list"><ViewListIcon fontSize="small" /></ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                    </Box>

                    {/* Search + leave type filter */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <ModernTextField
                        size="small" placeholder="Search by name or employee ID..." value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)} sx={{ flex: 1 }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: accentColor, fontSize: 20 }} /></InputAdornment> }}
                      />
                      <ModernTextField
                        select size="small" value={leaveTypeFilter}
                        onChange={(e) => { setLeaveTypeFilter(e.target.value); setPage(0); }}
                        sx={{ minWidth: 170 }}
                        SelectProps={{ renderValue: (v) => v === 'all' ? 'All Types' : v }}
                      >
                        <MenuItem value="all">All Leave Types</MenuItem>
                        {leaveTypes.map((type) => (
                          <MenuItem key={type.leave_code} value={type.leave_code}>{type.leave_code} — {type.leave_description}</MenuItem>
                        ))}
                      </ModernTextField>
                    </Box>

                    {/* Status filter chips */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {[
                        { label: `All (${counts.all})`, value: 'all', color: accentColor },
                        { label: `Pending (${counts['0']})`, value: '0', color: '#F57C00' },
                        { label: `Supervisor (${counts['1']})`, value: '1', color: '#1565C0' },
                        { label: `HR (${counts['2']})`, value: '2', color: '#2E7D32' },
                        { label: `Denied (${counts['3']})`, value: '3', color: '#C62828' },
                      ].map((f) => (
                        <Chip key={f.value} label={f.label} onClick={() => setStatusFilter(f.value)}
                          sx={{ fontSize: '0.75rem', fontWeight: 600, height: 28, border: `1px solid ${f.color}`, bgcolor: statusFilter === f.value ? f.color : 'transparent', color: statusFilter === f.value ? '#fff' : f.color, cursor: 'pointer', transition: 'all 0.2s ease', '&:hover': { bgcolor: statusFilter === f.value ? f.color : alpha(f.color, 0.08) } }}
                        />
                      ))}
                    </Box>
                  </Box>

                  {/* Records list */}
                  <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3, '&::-webkit-scrollbar': { width: 6 }, '&::-webkit-scrollbar-track': { background: alpha(primaryColor, 0.5), borderRadius: 3 }, '&::-webkit-scrollbar-thumb': { background: alpha(accentColor, 0.4), borderRadius: 3, '&:hover': { background: accentColor } } }}>
                    {paged.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 8 }}>
                        <EventNote sx={{ fontSize: 56, color: alpha(accentColor, 0.2), mb: 2 }} />
                        <Typography variant="h6" sx={{ color: alpha(accentColor, 0.6), fontWeight: 600 }}>No Records Found</Typography>
                        <Typography variant="body2" sx={{ color: '#999', mt: 1 }}>
                          {searchTerm || statusFilter !== 'all' || leaveTypeFilter !== 'all' ? 'Try adjusting your search or filter' : 'Add your first leave request'}
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
                              <RecordCard
                                onClick={(e) => {
                                  if (selectMode && !isCancelled) { e.stopPropagation(); handleSelectRequest(req.id); }
                                  else if (!isCancelled && !selectMode) { setEditRequest({ ...req }); setOriginalRequest({ ...req }); setIsEditing(false); }
                                }}
                                sx={{ cursor: isCancelled ? 'default' : 'pointer', opacity: isCancelled ? 0.6 : 1, border: isSelected ? `2px solid ${accentColor}` : `1px solid ${alpha(accentColor, 0.08)}`, bgcolor: isSelected ? alpha(accentColor, 0.04) : '#fff', position: 'relative' }}
                              >
                                {selectMode && !isCancelled && (
                                  <Checkbox checked={isSelected} onChange={(e) => { e.stopPropagation(); handleSelectRequest(req.id); }}
                                    sx={{ position: 'absolute', top: 6, right: 6, zIndex: 10, color: accentColor, '&.Mui-checked': { color: accentColor } }} />
                                )}
                                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                                    <PersonIcon sx={{ fontSize: 14, color: accentColor }} />
                                    <Typography variant="caption" sx={{ color: accentColor, fontWeight: 700, fontSize: '0.72rem' }}>#{req.employeeNumber}</Typography>
                                  </Box>
                                  <Typography variant="body2" fontWeight={700} color="#222" sx={{ mb: 0.25 }} noWrap>{employeeNames[req.employeeNumber] || 'Loading...'}</Typography>
                                  <Typography variant="body2" color="#555" sx={{ mb: 1.5, fontSize: '0.82rem' }}>{type.leave_description || req.leave_code}</Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography variant="caption" color="#777" sx={{ fontSize: '0.75rem' }}>{formatDate(req.leave_date)}</Typography>
                                    <Chip icon={<StatusIcon sx={{ fontSize: 13 }} />} label={status.short} size="small"
                                      sx={{ bgcolor: status.bg, color: status.color, fontWeight: 600, fontSize: '0.68rem', height: 22, '& .MuiChip-icon': { color: status.color } }} />
                                  </Box>
                                </CardContent>
                              </RecordCard>
                            </Grid>
                          );
                        })}
                      </Grid>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {paged.map((req) => {
                          const status = getStatus(req.status);
                          const type = getType(req.leave_code);
                          const isCancelled = String(req.status) === '4';
                          const StatusIcon = status.icon;
                          const isSelected = selectedRequests.includes(req.id);
                          return (
                            <RecordCard key={req.id}
                              onClick={(e) => {
                                if (selectMode && !isCancelled) { e.stopPropagation(); handleSelectRequest(req.id); }
                                else if (!isCancelled && !selectMode) { setEditRequest({ ...req }); setOriginalRequest({ ...req }); setIsEditing(false); }
                              }}
                              sx={{ cursor: isCancelled ? 'default' : 'pointer', opacity: isCancelled ? 0.6 : 1, border: isSelected ? `2px solid ${accentColor}` : `1px solid ${alpha(accentColor, 0.08)}`, bgcolor: isSelected ? alpha(accentColor, 0.04) : '#fff' }}
                            >
                              <Box sx={{ p: 2.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                  {selectMode && !isCancelled && (
                                    <Checkbox checked={isSelected} onChange={(e) => { e.stopPropagation(); handleSelectRequest(req.id); }}
                                      sx={{ p: 0, mt: 0.25, color: accentColor, '&.Mui-checked': { color: accentColor } }} />
                                  )}
                                  <PersonIcon sx={{ fontSize: 18, color: accentColor, mt: 0.25, flexShrink: 0 }} />
                                  <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="caption" sx={{ color: accentColor, fontSize: '0.7rem', fontWeight: 700 }}>#{req.employeeNumber}</Typography>
                                    <Typography variant="body2" fontWeight={700} color="#222" sx={{ mt: 0.25 }}>{employeeNames[req.employeeNumber] || 'Loading...'}</Typography>
                                    <Typography variant="body2" color="#666" sx={{ fontSize: '0.82rem', mb: 0.75 }}>{type.leave_description || req.leave_code}</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <CalendarMonth sx={{ fontSize: 13, color: '#aaa' }} />
                                      <Typography variant="caption" color="#666" fontSize="0.75rem">{formatDate(req.leave_date)}</Typography>
                                      <Chip icon={<StatusIcon sx={{ fontSize: 13 }} />} label={status.short} size="small"
                                        sx={{ bgcolor: status.bg, color: status.color, fontWeight: 600, fontSize: '0.68rem', height: 22, ml: 'auto', '& .MuiChip-icon': { color: status.color } }} />
                                    </Box>
                                  </Box>
                                </Box>
                              </Box>
                            </RecordCard>
                          );
                        })}
                      </Box>
                    )}
                  </Box>

                  {/* Bulk action toolbar */}
                  {selectMode && (
                    <Slide direction="up" in={selectMode} mountOnEnter unmountOnExit>
                      <Paper elevation={4} sx={{ p: 2, bgcolor: primaryColor, borderTop: `2px solid ${accentColor}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Checkbox checked={selectedRequests.length === paged.length && paged.length > 0} indeterminate={selectedRequests.length > 0 && selectedRequests.length < paged.length} onChange={handleSelectAll}
                            sx={{ color: accentColor, '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: accentColor } }} />
                          <Typography variant="body2" sx={{ fontWeight: 600, color: accentColor }}>
                            {selectedRequests.length === 0 ? 'Select items' : `${selectedRequests.length} item${selectedRequests.length > 1 ? 's' : ''} selected`}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Button onClick={() => handleBulkStatusUpdate(1)} disabled={selectedRequests.length === 0 || bulkLoading} variant="contained" size="small"
                            startIcon={bulkLoading ? <CircularProgress size={14} /> : <CheckCircle />}
                            sx={{ bgcolor: '#1565C0', color: '#fff', borderRadius: 2, textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: '#0D47A1' }, '&:disabled': { bgcolor: '#ccc' } }}>
                            Supervisor
                          </Button>
                          <Button onClick={() => handleBulkStatusUpdate(2)} disabled={selectedRequests.length === 0 || bulkLoading} variant="contained" size="small"
                            startIcon={bulkLoading ? <CircularProgress size={14} /> : <DoneAllIcon />}
                            sx={{ bgcolor: '#2E7D32', color: '#fff', borderRadius: 2, textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: '#1B5E20' }, '&:disabled': { bgcolor: '#ccc' } }}>
                            HR Approve
                          </Button>
                          <Button onClick={() => handleBulkStatusUpdate(3)} disabled={selectedRequests.length === 0 || bulkLoading} variant="contained" size="small"
                            startIcon={bulkLoading ? <CircularProgress size={14} /> : <ThumbDownIcon />}
                            sx={{ bgcolor: '#C62828', color: '#fff', borderRadius: 2, textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: '#B71C1C' }, '&:disabled': { bgcolor: '#ccc' } }}>
                            Deny
                          </Button>
                        </Box>
                      </Paper>
                    </Slide>
                  )}

                  {/* Pagination */}
                  {filtered.length > 0 && (
                    <Box sx={{ px: 3, py: 1.5, borderTop: `1px solid ${alpha(accentColor, 0.08)}` }}>
                      <TablePagination
                        component="div" count={filtered.length} page={page}
                        onPageChange={(e, p) => setPage(p)} rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => { setRowsPerPage(+e.target.value); setPage(0); }}
                        rowsPerPageOptions={[8, 16, 24]}
                        sx={{ '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontWeight: 600, fontSize: '0.85rem' } }}
                      />
                    </Box>
                  )}
                </GlassCard>
              </Fade>
            </Grid>
          </Grid>

          {/* ── Transaction Logs Modal ── */}
          <Modal open={transactionLogsModalOpen} onClose={() => setTransactionLogsModalOpen(false)}>
            <Fade in={transactionLogsModalOpen}>
              <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: { xs: '92%', sm: '85%', md: 820 }, maxHeight: '85vh', bgcolor: primaryColor, border: `1px solid ${alpha(accentColor, 0.15)}`, boxShadow: `0 24px 64px ${alpha(accentColor, 0.25)}`, borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${alpha(accentColor, 0.12)}`, background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: alpha(accentColor, 0.12), width: 36, height: 36 }}>
                      <HistoryToggleOff sx={{ color: accentColor, fontSize: 20 }} />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: accentColor }}>Transaction Logs</Typography>
                  </Box>
                  <IconButton size="small" onClick={() => setTransactionLogsModalOpen(false)} sx={{ color: accentColor, '&:hover': { bgcolor: alpha(accentColor, 0.08) } }}>
                    <Close />
                  </IconButton>
                </Box>
                <Box sx={{ p: 3, overflowY: 'auto', '&::-webkit-scrollbar': { width: 6 }, '&::-webkit-scrollbar-track': { background: alpha(primaryColor, 0.5), borderRadius: 3 }, '&::-webkit-scrollbar-thumb': { background: alpha(accentColor, 0.3), borderRadius: 3 } }}>
                  {transactionLogsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} sx={{ color: accentColor }} /></Box>
                  ) : transactionLogsError ? (
                    <Alert severity="error" sx={{ borderRadius: 2 }}>{transactionLogsError}</Alert>
                  ) : transactionLogs.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <HistoryToggleOff sx={{ fontSize: 48, color: alpha(accentColor, 0.2), mb: 2 }} />
                      <Typography variant="body2" sx={{ color: '#666' }}>No transaction logs available.</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {transactionLogs.map((log) => {
                        const loggedAt = log.created_at || log.createdAt || log.date_created || log.timestamp;
                        return (
                          <Paper key={`admin-log-${log.id}`} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha(accentColor, 0.1)}`, bgcolor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <Typography sx={{ fontWeight: 600, color: '#333', fontSize: '0.9rem' }}>{renderTransactionMessage(log.message)}</Typography>
                            <Divider sx={{ my: 1, borderColor: alpha(accentColor, 0.08) }} />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <ScheduleIcon sx={{ fontSize: 13, color: '#aaa' }} />
                              <Typography variant="caption" sx={{ color: '#999' }}>{loggedAt ? formatDateTime(loggedAt) : 'No timestamp'}</Typography>
                            </Box>
                          </Paper>
                        );
                      })}
                    </Box>
                  )}
                </Box>
              </Box>
            </Fade>
          </Modal>

          {/* ── Edit / View Modal ── */}
          <Modal open={!!editRequest} onClose={closeModal} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GlassCard sx={{ width: '90%', maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: `1px solid ${alpha(accentColor, 0.15)}` }}>
              {editRequest && (
                <>
                  {/* Modal header */}
                  <Box sx={{ p: 3, background: `linear-gradient(135deg, ${accentDark} 0%, ${accentColor} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: alpha('#fff', 0.15), width: 36, height: 36 }}>
                        <EventNote sx={{ color: textSecondaryColor, fontSize: 20 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: textSecondaryColor, lineHeight: 1.2 }}>
                          {isEditing ? 'Edit Leave Request' : 'Leave Request Details'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: alpha(textSecondaryColor, 0.75) }}>
                          #{editRequest.employeeNumber} • {employeeNames[editRequest.employeeNumber] || '—'}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton onClick={closeModal} sx={{ color: textSecondaryColor, '&:hover': { bgcolor: alpha('#fff', 0.1) } }}>
                      <Close />
                    </IconButton>
                  </Box>

                  <Box sx={{ p: 4, flexGrow: 1, overflowY: 'auto', minHeight: 0, '&::-webkit-scrollbar': { width: 6 }, '&::-webkit-scrollbar-track': { background: alpha(primaryColor, 0.5), borderRadius: 3 }, '&::-webkit-scrollbar-thumb': { background: alpha(accentColor, 0.3), borderRadius: 3 } }}>
                    {/* HR Approved lock notice */}
                    {String(editRequest.status) === '2' && (
                      <Alert severity="info" sx={{ mb: 3, bgcolor: '#E3F2FD', borderColor: '#1565C0', color: '#0D47A1', borderRadius: 2, '& .MuiAlert-icon': { color: '#1565C0' } }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>🔒 This request has been HR Approved and cannot be edited or deleted.</Typography>
                      </Alert>
                    )}

                    {/* Employee Information */}
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <PersonIcon sx={{ color: accentColor, fontSize: 20, mr: 1.5 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: accentColor, fontSize: '1rem' }}>Employee Information</Typography>
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: accentColor }}>Employee Number</Typography>
                          {isEditing && String(editRequest.status) !== '2' ? (
                            <ModernTextField value={editRequest.employeeNumber} onChange={(e) => setEditRequest({ ...editRequest, employeeNumber: e.target.value })} fullWidth size="small" />
                          ) : (
                            <Box sx={{ p: 1.5, bgcolor: alpha(primaryColor, 0.6), borderRadius: 2, border: `1px solid ${alpha(accentColor, 0.15)}` }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: accentColor }}>#{editRequest.employeeNumber}</Typography>
                              <Typography variant="caption" sx={{ color: '#666' }}>{employeeNames[editRequest.employeeNumber]}</Typography>
                            </Box>
                          )}
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: accentColor }}>Leave Type</Typography>
                          {isEditing && String(editRequest.status) !== '2' ? (
                            <ModernTextField select fullWidth size="small" value={editRequest.leave_code} onChange={(e) => setEditRequest({ ...editRequest, leave_code: e.target.value })}
                              SelectProps={{ displayEmpty: true, renderValue: (v) => v ? `${v} — ${leaveTypes.find((t) => t.leave_code === v)?.leave_description || ''}` : <em>Select Type</em> }}>
                              <MenuItem value=""><em>Select Type</em></MenuItem>
                              {leaveTypes.map((t) => <MenuItem key={t.id} value={t.leave_code}>{t.leave_code} — {t.leave_description}</MenuItem>)}
                            </ModernTextField>
                          ) : (
                            <Box sx={{ p: 1.5, bgcolor: alpha(primaryColor, 0.6), borderRadius: 2, border: `1px solid ${alpha(accentColor, 0.15)}` }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#333' }}>{getType(editRequest.leave_code).leave_description}</Typography>
                              <Typography variant="caption" sx={{ color: '#666' }}>Code: {editRequest.leave_code}</Typography>
                            </Box>
                          )}
                        </Grid>
                      </Grid>
                    </Box>

                    <Divider sx={{ my: 2.5, borderColor: alpha(accentColor, 0.1) }} />

                    {/* Leave Details */}
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <EventNote sx={{ color: accentColor, fontSize: 20, mr: 1.5 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: accentColor, fontSize: '1rem' }}>Leave Details</Typography>
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: accentColor }}>Leave Date</Typography>
                          {isEditing && String(editRequest.status) !== '2' ? (
                            <ModernTextField type="date" value={editRequest.leave_date?.split(',')[0] || ''} onChange={(e) => setEditRequest({ ...editRequest, leave_date: e.target.value })} fullWidth size="small" />
                          ) : (
                            <Box sx={{ p: 1.5, bgcolor: alpha(primaryColor, 0.6), borderRadius: 2, border: `1px solid ${alpha(accentColor, 0.15)}` }}>
                              <Typography variant="body2">{formatDate(editRequest.leave_date)}</Typography>
                            </Box>
                          )}
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: accentColor }}>Status</Typography>
                          <ModernTextField
                            select fullWidth size="small" value={String(editRequest.status)}
                            onChange={async (e) => {
                              const s = e.target.value;
                              setEditRequest({ ...editRequest, status: s });
                              if (!isEditing) {
                                try {
                                  await axios.put(`${API_BASE_URL}/leaveRoute/leave_request/${editRequest.id}`, { ...editRequest, status: +s }, getAuthHeaders());
                                  closeModal(); setSuccessAction('status'); setSuccessOpen(true);
                                  setTimeout(() => setSuccessOpen(false), 2000); fetchAll();
                                } catch { alert('Error updating status'); }
                              }
                            }}
                            disabled={isEditing || String(editRequest.status) === '2'}
                            SelectProps={{
                              renderValue: (value) => {
                                const opt = statusOptions.find((o) => o.value === value);
                                const Icon = opt?.icon;
                                return (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {Icon && <Icon sx={{ fontSize: 16, color: opt.color }} />}
                                    <Typography sx={{ fontWeight: 600, color: opt?.color, fontSize: '0.9rem' }}>{opt?.label}</Typography>
                                  </Box>
                                );
                              },
                            }}
                          >
                            {statusOptions.map((o) => (
                              <MenuItem key={o.value} value={o.value} sx={{ py: 1.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: o.color }} />
                                  <Typography sx={{ fontWeight: 500 }}>{o.label}</Typography>
                                </Box>
                              </MenuItem>
                            ))}
                          </ModernTextField>
                        </Grid>
                      </Grid>
                    </Box>

                    {/* Leave Balance */}
                    <Box sx={{ mt: 2, p: 2.5, bgcolor: alpha(primaryColor, 0.6), borderRadius: 2, border: `1px solid ${alpha(accentColor, 0.12)}` }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5, color: accentColor }}>Employee Leave Balance</Typography>
                      <LeaveCredits personID={editRequest.employeeNumber} compact accentColor={accentColor} />
                    </Box>
                  </Box>

                  {/* Bottom Action Bar */}
                  <Box sx={{ borderTop: `1px solid ${alpha(accentColor, 0.12)}`, bgcolor: '#fff', px: 3, py: 2, display: 'flex', justifyContent: 'flex-end', gap: 2, flexShrink: 0 }}>
                    {!isEditing ? (
                      <>
                        <ProfessionalButton onClick={() => handleCancel(editRequest.id)} disabled={['2', '3', '4'].includes(String(editRequest.status))} variant="outlined"
                          sx={{ borderColor: '#F57C00', color: '#F57C00', '&:hover': { bgcolor: alpha('#F57C00', 0.08) }, '&:disabled': { borderColor: '#ccc', color: '#ccc' } }}>
                          Cancel Request
                        </ProfessionalButton>
                        <ProfessionalButton onClick={() => handleDelete(editRequest.id, editRequest.status)} disabled={['2', '4'].includes(String(editRequest.status))} startIcon={<DeleteIcon />} variant="outlined"
                          sx={{ borderColor: accentColor, color: accentColor, '&:hover': { bgcolor: alpha(accentColor, 0.08), borderColor: accentDark, color: accentDark }, '&:disabled': { borderColor: '#ccc', color: '#ccc' } }}>
                          Delete
                        </ProfessionalButton>
                        <ProfessionalButton onClick={() => setIsEditing(true)} disabled={['2', '4'].includes(String(editRequest.status))} startIcon={<EditIcon />} variant="contained"
                          sx={{ bgcolor: accentColor, color: textSecondaryColor, '&:hover': { bgcolor: accentDark }, '&:disabled': { bgcolor: '#ddd' } }}>
                          Edit
                        </ProfessionalButton>
                      </>
                    ) : (
                      <>
                        <ProfessionalButton onClick={() => { setEditRequest({ ...originalRequest }); setIsEditing(false); }} startIcon={<CancelIcon />} variant="outlined"
                          sx={{ borderColor: '#6c757d', color: '#6c757d', '&:hover': { bgcolor: alpha('#6c757d', 0.08) } }}>
                          Cancel
                        </ProfessionalButton>
                        <ProfessionalButton onClick={handleUpdate} startIcon={<SaveIcon />} disabled={!hasChanges()} variant="contained"
                          sx={{ bgcolor: hasChanges() ? accentColor : alpha(accentColor, 0.4), color: textSecondaryColor, '&:hover': { bgcolor: hasChanges() ? accentDark : alpha(accentColor, 0.4) }, '&:disabled': { color: alpha(textSecondaryColor, 0.5) } }}>
                          Save Changes
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
    </Fade>
  );
};

export default LeaveRequest;