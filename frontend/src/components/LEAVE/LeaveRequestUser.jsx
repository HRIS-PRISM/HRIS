import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { getAuthHeaders } from '../../utils/auth';
import { useSocket } from '../../contexts/SocketContext';
import { jwtDecode } from 'jwt-decode';
import {
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Chip,
  Select,
  MenuItem,
  FormControl,
  Card,
  CardContent,
  Avatar,
  Tooltip,
  Fade,
  styled,
  alpha,
  IconButton,
  CircularProgress,
  Backdrop,
} from "@mui/material";
import {
  Add as AddIcon,
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
} from "@mui/icons-material";

import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import LeaveDatePickerModal from './LeaveDatePicker';
import LeaveCredits from './LeaveCredits';
import { useSystemSettings } from '../../hooks/useSystemSettings';

// Professional styled components
const GlassCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  overflow: 'hidden',
  transition: 'all 0.3s ease',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
}));

const ProfessionalButton = styled(Button)(({ theme }) => ({
  borderRadius: 12,
  fontWeight: 600,
  padding: '12px 24px',
  transition: 'all 0.3s ease',
  textTransform: 'none',
  fontSize: '0.95rem',
}));

const ModernTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    fontSize: '0.95rem',
    '& fieldset': { borderColor: 'rgba(0,0,0,0.12)' },
    '&:hover fieldset': { borderColor: 'rgba(0,0,0,0.25)' },
    '&.Mui-focused fieldset': { borderColor: '#6d2323' },
  },
}));

const ModernSelect = styled(Select)(({ theme }) => ({
  borderRadius: 12,
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  fontSize: '0.9rem',
  '& .MuiSelect-select': { py: 1.5 },
}));

const RecordCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  transition: 'all 0.3s ease',
  border: '1px solid rgba(0,0,0,0.08)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  '&:hover': {
    boxShadow: '0 8px 24px rgba(109,35,35,0.12)',
    borderColor: 'rgba(109,35,35,0.15)',
  },
}));

const LeaveRequestUser = () => {
  const { socket, connected } = useSocket();
  const refreshRef = useRef(null);
  
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [newLeaveRequest, setNewLeaveRequest] = useState({
    leave_code: '',
    leave_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState("");
  const [monthFilter, setMonthFilter] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [personID, setPersonID] = useState('');
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]);

  const { settings } = useSystemSettings();

  const primaryColor = settings.accentColor || '#FEF9E1';
  const secondaryColor = settings.backgroundColor || '#FFF8E7';
  const accentColor = settings.primaryColor || '#6d2323';
  const accentDark = settings.secondaryColor || '#8B3333';
  const textPrimaryColor = settings.textPrimaryColor || '#6d2323';

  // Check if selected leave type is sick leave
  const isSickLeave = () => {
    const selectedType = leaveTypes.find(t => t.leave_code === newLeaveRequest.leave_code);
    if (!selectedType) return false;
    const desc = selectedType.leave_description?.toLowerCase() || '';
    const code = selectedType.leave_code?.toLowerCase() || '';
    return code.includes('sl') || code.includes('sick') || desc.includes('sick');
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
    { value: '1', label: 'Manager Approved' },
    { value: '2', label: 'HR Approved' },
    { value: '3', label: 'Denied' },
    { value: '4', label: 'Cancelled' },
  ];

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setPersonID(decoded.employeeNumber);
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (personID) {
      fetchLeaveRequests();
      fetchLeaveTypes();
    }
  }, [personID]);

  // Keep latest fetch function for Socket.IO handler
  useEffect(() => {
    refreshRef.current = fetchLeaveRequests;
  });

  // Realtime: refresh when anyone changes leave request records
  useEffect(() => {
    if (!socket || !connected) return;
    const handleChanged = () => refreshRef.current?.();
    socket.on('leaveRequestChanged', handleChanged);
    return () => socket.off('leaveRequestChanged', handleChanged);
  }, [socket, connected]);

  const fetchLeaveRequests = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/leaveRoute/leave_request/${personID}`, getAuthHeaders());
      setLeaveRequests(res.data);
    } catch (error) {
      console.error("Error fetching leave requests:", error);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/leaveRoute/leave_table`, getAuthHeaders());
      setLeaveTypes(res.data);
    } catch (error) {
      console.error('Error fetching leave types:', error);
    }
  };

  const handleAdd = async () => {
    if (!newLeaveRequest.leave_code) {
      alert("Please select a leave type.");
      return;
    }
    if (selectedDates.length === 0) {
      alert("Please pick at least one leave date.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        employeeNumber: personID,
        leave_code: newLeaveRequest.leave_code,
        leave_dates: selectedDates,
        status: "0",
      };

      await axios.post(`${API_BASE_URL}/leaveRoute/leave_request`, payload, getAuthHeaders());

      setSuccessAction("Leave Request Submitted Successfully");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);

      await fetchLeaveRequests();
      setNewLeaveRequest({ leave_code: "", leave_date: "" });
      setSelectedDates([]);
    } catch (err) {
      console.error("Error:", err.response?.data || err);
      alert("Error submitting leave request: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setNewLeaveRequest({ ...newLeaveRequest, [field]: value });
    if (field === 'leave_code') {
      setSelectedDates([]);
    }
  };

  const getLeaveTypeInfo = (leaveCode) => {
    return leaveTypes.find(type => type.leave_code === leaveCode) || { leave_description: leaveCode };
  };

  // Filter by month, leave type, and status
  const filteredLeaveRequests = useMemo(() => {
    return leaveRequests.filter((request) => {
      if (monthFilter) {
        const requestDate = new Date(request.leave_date);
        const requestMonth = String(requestDate.getMonth() + 1).padStart(2, '0');
        if (requestMonth !== monthFilter) return false;
      }
      if (leaveTypeFilter && request.leave_code !== leaveTypeFilter) {
        return false;
      }
      if (statusFilter && String(request.status) !== statusFilter) {
        return false;
      }
      return true;
    }).sort((a, b) => new Date(b.leave_date) - new Date(a.leave_date));
  }, [leaveRequests, monthFilter, leaveTypeFilter, statusFilter]);

  const handleCancelRequest = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) return;

    try {
      const requestToCancel = leaveRequests.find(req => req.id === id);
      await axios.put(`${API_BASE_URL}/leaveRoute/leave_request/${id}`, {
        employeeNumber: requestToCancel.employeeNumber,
        leave_code: requestToCancel.leave_code,
        leave_date: requestToCancel.leave_date,
        status: 4,
      }, getAuthHeaders());
      
      setSuccessAction("Request Cancelled Successfully");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      await fetchLeaveRequests();
    } catch (err) {
      alert("Error cancelling request: " + (err.response?.data?.error || err.message));
    }
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      '0': { label: "Pending", color: '#F57C00', bg: '#FFF8E1', icon: AccessTime },
      '1': { label: "Manager Approved", sublabel: "Pending HR", color: '#1565C0', bg: '#E3F2FD', icon: CheckCircle },
      '2': { label: "HR Approved", color: '#2E7D32', bg: '#E8F5E9', icon: CheckCircle },
      '3': { label: "Denied", color: '#C62828', bg: '#FFEBEE', icon: Block },
      '4': { label: "Cancelled", color: '#757575', bg: '#FAFAFA', icon: CancelIcon },
    };
    return statusMap[String(status)] || { label: "Unknown", color: '#757575', bg: '#FAFAFA', icon: AccessTime };
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    const dateStr = Array.isArray(d) ? d[0] : d.split(',')[0].trim();
    const [year, month, day] = dateStr.split('-');
    return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatDateTime = (d) => {
    if (!d) return 'N/A';
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Box sx={{ py: 4, mt: -5, maxWidth: '1800px', mx: 'auto', overflow: 'hidden', px: { xs: 2, sm: 3, md: 6 } }}>
      <Backdrop sx={{ color: primaryColor, zIndex: (theme) => theme.zIndex.drawer + 1 }} open={loading}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="inherit" size={60} thickness={4} />
          <Typography variant="h6" sx={{ mt: 2, color: primaryColor }}>Submitting...</Typography>
        </Box>
      </Backdrop>
      <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />

      {/* Header */}
      <Fade in timeout={500}>
        <Box sx={{ mb: 4 }}>
          <GlassCard>
            <Box sx={{ 
              p: 5, 
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`, 
              color: textPrimaryColor,
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Decorative Elements */}
              <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: 'radial-gradient(circle, rgba(109,35,35,0.1) 0%, rgba(109,35,35,0) 70%)' }} />
              <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, background: 'radial-gradient(circle, rgba(109,35,35,0.08) 0%, rgba(109,35,35,0) 70%)' }} />
              
              <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ bgcolor: alpha(accentColor, 0.15), mr: 4, width: 64, height: 64, boxShadow: `0 8px 24px ${alpha(accentColor, 0.15)}` }}>
                    <EventNote sx={{ color: textPrimaryColor, fontSize: 32 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: textPrimaryColor }}>
                      Employee Leave Request
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.8, color: accentDark }}>
                      Submit and view your leave requests
                    </Typography>
                  </Box>
                </Box>
                <Tooltip title="Refresh Data">
                  <IconButton onClick={() => window.location.reload()} sx={{ bgcolor: 'rgba(109,35,35,0.1)', '&:hover': { bgcolor: 'rgba(109,35,35,0.2)' }, color: accentColor, width: 48, height: 48 }}>
                    <Refresh />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </GlassCard>
        </Box>
      </Fade>

      {/* Main Content */}
      <Grid container spacing={4}>
        {/* Left Column */}
        <Grid item xs={12} lg={8}>
          {/* Form Section */}
          <Fade in timeout={700}>
            <GlassCard sx={{ mb: 4, border: `1px solid ${alpha(accentColor, 0.1)}` }}>
              <Box sx={{ p: 4, background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`, color: accentColor, display: 'flex', alignItems: 'center', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
                <PersonIcon sx={{ fontSize: '1.8rem', mr: 2 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Submit New Leave Request</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>Fill in the details to request leave</Typography>
                </Box>
              </Box>

              <Box sx={{ p: 4 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>Employee Number</Typography>
                    <ModernTextField value={personID} disabled fullWidth size="small" sx={{ "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: "#000" } }} />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>Leave Type *</Typography>
                    <FormControl fullWidth size="small">
                      <ModernSelect value={newLeaveRequest.leave_code} onChange={(e) => handleChange('leave_code', e.target.value)} displayEmpty>
                        <MenuItem value=""><em>Select Leave Type</em></MenuItem>
                        {leaveTypes.map((type) => (
                          <MenuItem key={type.id} value={type.leave_code}>
                            ({type.leave_code}) - {type.leave_description}
                          </MenuItem>
                        ))}
                      </ModernSelect>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>Leave Date(s) *</Typography>
                    <ProfessionalButton variant="outlined" onClick={() => setDateModalOpen(true)} startIcon={<CalendarIcon />} sx={{ width: '100%', height: 44, border: `1.5px solid ${accentColor}`, color: accentColor }}>
                      {selectedDates.length > 0 ? `${selectedDates.length} date(s) selected` : 'Pick Leave Dates'}
                    </ProfessionalButton>

                    <LeaveDatePickerModal
                      open={dateModalOpen}
                      onClose={() => {
                        setNewLeaveRequest({ ...newLeaveRequest, leave_date: selectedDates.join(",") });
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
                    />
                    
                    {isSickLeave() && (
                      <Typography variant="caption" sx={{ color: '#1565C0', mt: 0.5, display: 'block' }}>
                        * Past dates allowed for sick leave
                      </Typography>
                    )}
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>Selected Dates</Typography>
                    <Box sx={{ minHeight: 44, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, p: 1.5, border: `1px solid ${alpha(accentColor, 0.2)}`, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.5)' }}>
                      {selectedDates.length > 0 ? (
                        selectedDates.map(date => (
                          <Chip key={date} label={date} size="small" onDelete={() => setSelectedDates(prev => prev.filter(d => d !== date))} sx={{ backgroundColor: alpha(accentColor, 0.1), color: accentColor, fontSize: '0.75rem', height: 28 }} />
                        ))
                      ) : (
                        <Typography variant="caption" sx={{ color: '#999' }}>No dates selected</Typography>
                      )}
                    </Box>
                  </Grid>
                </Grid>

                <ProfessionalButton onClick={handleAdd} variant="contained" startIcon={<AddIcon />} fullWidth sx={{ mt: 3, backgroundColor: accentColor, color: primaryColor, py: 1.5, fontSize: '1rem', '&:hover': { backgroundColor: accentDark } }}>
                  Submit Leave Request
                </ProfessionalButton>
              </Box>
            </GlassCard>
          </Fade>

          {/* Records Section */}
          <Fade in timeout={900}>
            <GlassCard sx={{ border: `1px solid ${alpha(accentColor, 0.1)}` }}>
              <Box sx={{ p: 4, background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`, color: accentColor, boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ReorderIcon sx={{ fontSize: '1.8rem', mr: 2 }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>My Leave Request Records</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>{filteredLeaveRequests.length} record(s)</Typography>
                    </Box>
                  </Box>
                  
                  {/* Filters */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FilterIcon sx={{ fontSize: 20, color: accentColor }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: accentColor }}>Filter:</Typography>
                    </Box>
                    
                    {/* Month Filter */}
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                      <ModernSelect 
                        value={monthFilter} 
                        onChange={(e) => setMonthFilter(e.target.value)}
                        displayEmpty
                        renderValue={(value) => value ? months.find(m => m.value === value)?.label : 'Month'}
                      >
                        {months.map((month) => (
                          <MenuItem key={month.value} value={month.value}>{month.label}</MenuItem>
                        ))}
                      </ModernSelect>
                    </FormControl>
                    
                    {/* Leave Type Filter */}
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <ModernSelect 
                        value={leaveTypeFilter} 
                        onChange={(e) => setLeaveTypeFilter(e.target.value)}
                        displayEmpty
                        renderValue={(value) => value ? value : 'Leave Type'}
                      >
                        <MenuItem value=""><em>All Types</em></MenuItem>
                        {leaveTypes.map((type) => (
                          <MenuItem key={type.id} value={type.leave_code}>{type.leave_code}</MenuItem>
                        ))}
                      </ModernSelect>
                    </FormControl>

                    {/* Status Filter */}
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                      <ModernSelect 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value)}
                        displayEmpty
                        renderValue={(value) => value ? statusOptions.find(s => s.value === value)?.label : 'Status'}
                      >
                        {statusOptions.map((status) => (
                          <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
                        ))}
                      </ModernSelect>
                    </FormControl>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ p: 4, maxHeight: '500px', overflowY: 'auto', '&::-webkit-scrollbar': { width: '6px' }, '&::-webkit-scrollbar-track': { background: '#f1f1f1', borderRadius: '3px' }, '&::-webkit-scrollbar-thumb': { background: accentColor, borderRadius: '3px' } }}>
                {filteredLeaveRequests.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <EventNote sx={{ fontSize: 48, color: alpha(accentColor, 0.25), mb: 2 }} />
                    <Typography variant="h6" sx={{ color: accentColor, fontWeight: 600 }}>No Leave Requests Found</Typography>
                    <Typography variant="body2" sx={{ color: '#666', mt: 1 }}>
                      {monthFilter || leaveTypeFilter || statusFilter ? 'Try adjusting your filters' : 'Submit your first request above'}
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {filteredLeaveRequests.map((leaveRequest) => {
                      const leaveTypeInfo = getLeaveTypeInfo(leaveRequest.leave_code);
                      const statusInfo = getStatusInfo(leaveRequest.status);
                      const canCancel = String(leaveRequest.status) === '0';
                      const StatusIcon = statusInfo.icon;
                      
                      return (
                        <RecordCard key={leaveRequest.id}>
                          <CardContent sx={{ p: 3 }}>
                            <Grid container spacing={3} alignItems="center">
                              {/* Leave Type */}
                              <Grid item xs={12} md={3}>
                                <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1 }}>Leave Type</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <EventNote sx={{ fontSize: 18, color: accentColor }} />
                                  <Typography variant="body1" sx={{ fontWeight: 600, color: accentColor }}>
                                    {leaveTypeInfo.leave_code || leaveRequest.leave_code}
                                  </Typography>
                                </Box>
                                <Typography variant="caption" sx={{ color: '#666' }}>
                                  {leaveTypeInfo.leave_description}
                                </Typography>
                              </Grid>

                              {/* Leave Date */}
                              <Grid item xs={6} md={2}>
                                <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1 }}>Leave Date</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                  {formatDate(leaveRequest.leave_date)}
                                </Typography>
                              </Grid>

                              {/* Submitted */}
                              <Grid item xs={6} md={3}>
                                <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1 }}>Submitted</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <ScheduleIcon sx={{ fontSize: 16, color: '#888' }} />
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {formatDateTime(leaveRequest.createdAt || leaveRequest.dateSubmitted)}
                                  </Typography>
                                </Box>
                              </Grid>

                              {/* Status */}
                              <Grid item xs={6} md={2}>
                                <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1 }}>Status</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 2, py: 0.75, borderRadius: 2, bgcolor: statusInfo.bg, border: `1px solid ${alpha(statusInfo.color, 0.2)}` }}>
                                    <StatusIcon sx={{ fontSize: 16, color: statusInfo.color }} />
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: statusInfo.color }}>
                                      {statusInfo.label}
                                    </Typography>
                                  </Box>
                                </Box>
                                {statusInfo.sublabel && (
                                  <Typography variant="caption" sx={{ color: '#888', display: 'block', mt: 0.5 }}>
                                    {statusInfo.sublabel}
                                  </Typography>
                                )}
                              </Grid>

                              {/* Actions */}
                              <Grid item xs={6} md={2}>
                                {canCancel && (
                                  <ProfessionalButton size="small" variant="outlined" onClick={() => handleCancelRequest(leaveRequest.id)} sx={{ color: '#C62828', borderColor: alpha('#C62828', 0.3), '&:hover': { backgroundColor: alpha('#C62828', 0.08), borderColor: '#C62828' } }}>
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

        {/* Right Column - Leave Credits */}
        <Grid item xs={12} lg={4}>
          <Fade in timeout={800}>
            <Box sx={{ position: 'sticky', top: 20 }}>
              <LeaveCredits 
                personID={personID} 
                accentColor={accentColor} 
                accentDark={accentDark} 
                primaryColor={primaryColor} 
                secondaryColor={secondaryColor} 
              />
            </Box>
          </Fade>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LeaveRequestUser;