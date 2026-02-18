import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
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
  Alert,
  InputAdornment,
  Card,
  CardContent,
  Avatar,
  Divider,
  LinearProgress,
  Autocomplete,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Close,
  EventNote,
  Search as SearchIcon,
  EventAvailable as ReorderIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  AccessTime as TimeIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";

import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';

// Styled components for professional look
const GlassCard = ({ children, sx = {} }) => (
  <Card
    sx={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
      backdropFilter: 'blur(10px)',
      borderRadius: 3,
      border: '1px solid rgba(109, 35, 35, 0.1)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      transition: 'all 0.3s ease',
      '&:hover': {
        boxShadow: '0 12px 40px rgba(109, 35, 35, 0.12)',
        transform: 'translateY(-2px)',
      },
      ...sx,
    }}
  >
    {children}
  </Card>
);

const GradientHeader = ({ icon: Icon, title, subtitle, gradient = 'linear-gradient(135deg, #6D2323 0%, #8B4545 100%)' }) => (
  <Box
    sx={{
      background: gradient,
      color: '#fff',
      p: 2.5,
      borderRadius: '12px 12px 0 0',
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: -30,
        right: -30,
        width: 100,
        height: 100,
        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
        borderRadius: '50%',
      },
    }}
  >
    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 50, height: 50 }}>
      <Icon sx={{ fontSize: 28 }} />
    </Avatar>
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.3 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.9 }}>
        {subtitle}
      </Typography>
    </Box>
  </Box>
);

const LeaveAssignment = () => {
  const [assignments, setAssignments] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [newAssignment, setNewAssignment] = useState({
    leave_code: '',
    employeeNumber: ''
  });
  const [editAssignment, setEditAssignment] = useState(null);
  const [originalAssignment, setOriginalAssignment] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState("");
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAssignments();
    fetchLeaveTypes();
    fetchEmployees();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/leaveRoute/leave_assignment`);
      const assignmentsData = Array.isArray(res.data) ? res.data : [];
      setAssignments(assignmentsData);
      setError('');
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setAssignments([]);
      setError('Failed to fetch assignments');
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/leaveRoute/leave_table`);
      const leaveTypesData = Array.isArray(res.data) ? res.data : [];
      setLeaveTypes(leaveTypesData);
    } catch (error) {
      console.error('Error fetching leave types:', error);
      setLeaveTypes([]);
    }
  };

  const fetchEmployees = async () => {
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No auth token found');
        setEmployees([]);
        return;
      }
      
      // Use existing /users endpoint with auth token
      console.log('Fetching users from /users endpoint...');
      const res = await axios.get(`${API_BASE_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Full Users response:', res.data);
      let usersData = [];
      if (Array.isArray(res.data)) {
        usersData = res.data;
      } else if (res.data && Array.isArray(res.data.users)) {
        usersData = res.data.users;
      } else if (res.data && Array.isArray(res.data.data)) {
        usersData = res.data.data;
      }
      
      // Log all users to see their roles
      console.log('All users with roles:', usersData.map(u => ({ 
        employeeNumber: u.employeeNumber, 
        name: u.fullName || `${u.firstName} ${u.lastName}`,
        role: u.role 
      })));
      
      // Don't filter - show ALL users including admins
      // Users can be found by employeeNumber or name
      setEmployees(usersData);
      console.log(`Loaded ${usersData.length} employees`);
    } catch (error) {
      console.error('Error fetching users:', error.response?.data || error.message);
      setEmployees([]);
    }
  };

  const isDuplicateAssignment = (employeeNumber, leaveCode, excludeId = null) => {
    return assignments.some(assignment => 
      assignment.employeeNumber?.toString() === employeeNumber?.toString() && 
      assignment.leave_code === leaveCode &&
      assignment.id !== excludeId
    );
  };

  const handleAdd = async () => {
    const employeeNumber = selectedEmployee?.employeeNumber?.toString().trim();
    const leaveCode = newAssignment.leave_code;

    if (!employeeNumber || !leaveCode) {
      setError('Please select an employee and leave type');
      return;
    }

    if (isDuplicateAssignment(employeeNumber, leaveCode)) {
      setError('This employee already has an assignment for this leave type');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        leave_code: leaveCode,
        employeeNumber: employeeNumber
      };
      
      await axios.post(`${API_BASE_URL}/leaveRoute/leave_assignment`, payload);
      
      setSelectedEmployee(null);
      setNewAssignment({
        leave_code: '',
        employeeNumber: ''
      });
      
      setTimeout(() => {
        setLoading(false);
        setSuccessAction("adding");
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2000);
      }, 300);
      
      await fetchAssignments();
    } catch (error) {
      console.error('Error adding assignment:', error);
      setError('Error adding assignment: ' + (error.response?.data?.error || error.message));
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    const employeeNumber = editAssignment.employeeNumber?.toString().trim();
    const leaveCode = editAssignment.leave_code;

    if (!employeeNumber || !leaveCode) {
      setError('Please fill in all required fields');
      return;
    }

    if (isDuplicateAssignment(employeeNumber, leaveCode, editAssignment.id)) {
      setError('This employee already has an assignment for this leave type');
      return;
    }

    try {
      const payload = {
        leave_code: leaveCode,
        employeeNumber: employeeNumber,
        remaining_hours: parseFloat(editAssignment.remaining_hours) || 0
      };
      
      await axios.put(`${API_BASE_URL}/leaveRoute/leave_assignment/${editAssignment.id}`, payload);
      
      setEditAssignment(null);
      setOriginalAssignment(null);
      setIsEditing(false);
      setError('');
      
      await fetchAssignments();
      
      setSuccessAction("edit");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch (error) {
      console.error('Error updating assignment:', error);
      setError('Error updating assignment: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) {
      return;
    }
    
    try {
      await axios.delete(`${API_BASE_URL}/leaveRoute/leave_assignment/${id}`);
      
      setEditAssignment(null);
      setOriginalAssignment(null);
      setIsEditing(false);
      setError('');
      
      await fetchAssignments();
      
      setSuccessAction("delete");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch (error) {
      console.error('Error deleting assignment:', error);
      setError('Error deleting assignment: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleOpenModal = (assignment) => {
    setEditAssignment({ ...assignment });
    setOriginalAssignment({ ...assignment });
    setIsEditing(false);
    setError('');
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setError('');
  };

  const handleCancelEdit = () => {
    setEditAssignment({ ...originalAssignment });
    setIsEditing(false);
    setError('');
  };

  const handleCloseModal = () => {
    setEditAssignment(null);
    setOriginalAssignment(null);
    setIsEditing(false);
    setError('');
  };

  const getLeaveTypeInfo = (leaveCode) => {
    const leaveType = leaveTypes.find(type => type.leave_code === leaveCode);
    return leaveType || { 
      leave_description: leaveCode || 'Unknown', 
      leave_hours: 'N/A' 
    };
  };

  const getEmployeeInfo = (empNum) => {
    const emp = employees.find(e => e.employeeNumber?.toString() === empNum?.toString());
    return emp || { fullName: empNum || 'Unknown' };
  };

  // Filter assignments for display
  const filteredAssignments = assignments.filter((assignment) => {
    const employeeName = assignment.fullName?.toLowerCase() || "";
    const employeeNumber = assignment.employeeNumber?.toString().toLowerCase() || "";
    const leaveCode = assignment.leave_code?.toString().toLowerCase() || "";
    const search = searchTerm.toLowerCase();
    return employeeName.includes(search) || employeeNumber.includes(search) || leaveCode.includes(search);
  });

  // Calculate progress percentage
  const getProgressPercent = (remaining, total) => {
    if (!total || total === 0) return 0;
    return Math.max(0, Math.min(100, (remaining / total) * 100));
  };

  // Get status color based on remaining balance
  const getStatusColor = (remaining, total) => {
    if (!total || total === 0) return '#9e9e9e';
    const percent = (remaining / total) * 100;
    if (percent > 50) return '#2e7d32';
    if (percent > 20) return '#ed6c02';
    return '#d32f2f';
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Loading Overlay */}
      <LoadingOverlay open={loading} message="Processing leave assignment..." />
      
      {/* Success Overlay */}
      <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />

      {/* Add Assignment Section */}
      <GlassCard sx={{ mb: 4 }}>
        <GradientHeader 
          icon={EventNote} 
          title="Employee Leave Assignment" 
          subtitle="Assign leave types and manage employee leave credits"
        />
        <CardContent sx={{ p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>
                Select Employee *
              </Typography>
              <Autocomplete
                value={selectedEmployee}
                onChange={(event, newValue) => {
                  setSelectedEmployee(newValue);
                  setError('');
                }}
                options={employees}
                getOptionLabel={(option) => {
                  const empName = option.fullName || `${option.firstName || ''} ${option.lastName || ''}`.trim();
                  return `${empName} (${option.employeeNumber})`;
                }}
                filterOptions={(options, { inputValue }) => {
                  const search = inputValue.toLowerCase().trim();
                  return options.filter((option) => {
                    const empName = (option.fullName || `${option.firstName || ''} ${option.lastName || ''}`).toLowerCase();
                    const empNum = (option.employeeNumber || '').toString().toLowerCase();
                    return empName.includes(search) || empNum.includes(search);
                  });
                }}
                isOptionEqualToValue={(option, value) => option.employeeNumber === value.employeeNumber}
                noOptionsText="No employees found"
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  const empName = option.fullName || `${option.firstName || ''} ${option.lastName || ''}`.trim();
                  const initials = `${option.firstName?.[0] || ''}${option.lastName?.[0] || ''}`.toUpperCase() || '?';
                  return (
                    <li key={key} {...otherProps}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#6d2323', fontSize: '0.8rem' }}>
                          {initials}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {empName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#888' }}>
                            {option.employeeNumber}
                          </Typography>
                        </Box>
                      </Box>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Type employee name or number..."
                    size="medium"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <PersonIcon sx={{ color: '#6d2323' }} />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '& fieldset': { borderColor: 'rgba(109, 35, 35, 0.2)' },
                        '&:hover fieldset': { borderColor: '#6d2323' },
                        '&.Mui-focused fieldset': { borderColor: '#6d2323', borderWidth: 2 },
                      },
                    }}
                  />
                )}
                sx={{ width: '100%' }}
              />
            </Grid>

            <Grid item xs={12} md={5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>
                Leave Type *
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={newAssignment.leave_code || ''}
                  onChange={(e) => {
                    setNewAssignment({ ...newAssignment, leave_code: e.target.value });
                    setError('');
                  }}
                  displayEmpty
                  size="medium"
                  startAdornment={
                    <InputAdornment position="start" sx={{ ml: 1 }}>
                      <WorkIcon sx={{ color: '#6d2323' }} />
                    </InputAdornment>
                  }
                  sx={{
                    borderRadius: 2,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(109, 35, 35, 0.2)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#6d2323',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#6d2323',
                      borderWidth: 2,
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>Choose a leave type...</em>
                  </MenuItem>
                  {leaveTypes.map((type) => (
                    <MenuItem key={type.id || type.leave_code} value={type.leave_code}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {type.leave_code} - {type.leave_description}
                          </Typography>
                        </Box>
                        <Chip 
                          label={`${(type.leave_hours || 0) / 8} days`}
                          size="small"
                          sx={{ 
                            bgcolor: 'rgba(109, 35, 35, 0.1)', 
                            color: '#6d2323',
                            fontWeight: 600,
                            ml: 1
                          }}
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <Button
                onClick={handleAdd}
                variant="contained"
                fullWidth
                size="large"
                startIcon={<AddIcon />}
                disabled={loading || !selectedEmployee || !newAssignment.leave_code}
                sx={{
                  mt: 3,
                  height: 50,
                  borderRadius: 2,
                  backgroundColor: '#6D2323',
                  color: '#FEF9E1',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(109, 35, 35, 0.3)',
                  '&:hover': { 
                    backgroundColor: '#5a1d1d',
                    boxShadow: '0 6px 16px rgba(109, 35, 35, 0.4)',
                  },
                  '&:disabled': { 
                    backgroundColor: '#ccc',
                    boxShadow: 'none'
                  }
                }}
              >
                {loading ? 'Adding...' : 'Assign'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </GlassCard>

      {/* Records Section */}
      <GlassCard>
        <Box
          sx={{
            p: 2.5,
            borderRadius: '12px 12px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid rgba(109, 35, 35, 0.1)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(109, 35, 35, 0.1)', width: 50, height: 50 }}>
              <ReorderIcon sx={{ fontSize: 28, color: '#6d2323' }} />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#6d2323' }}>
                Leave Assignment Records
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                {filteredAssignments.length} employee leave assignments
              </Typography>
            </Box>
          </Box>

          {/* Search Box */}
          <TextField
            size="small"
            variant="outlined"
            placeholder="Search by name or employee number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              width: 300,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '& fieldset': { borderColor: 'rgba(109, 35, 35, 0.2)' },
                '&:hover fieldset': { borderColor: '#6d2323' },
                '&.Mui-focused fieldset': { borderColor: '#6d2323' },
              },
            }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: '#6d2323', mr: 1 }} />,
            }}
          />
        </Box>

        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2}>
            {filteredAssignments.map((assignment) => {
              const leaveTypeInfo = getLeaveTypeInfo(assignment.leave_code);
              const progressPercent = getProgressPercent(assignment.remaining_hours, assignment.total_hours);
              const statusColor = getStatusColor(assignment.remaining_hours, assignment.total_hours);
              
              return (
                <Grid item xs={12} sm={6} lg={4} key={assignment.id}>
                  <Box
                    onClick={() => handleOpenModal(assignment)}
                    sx={{
                      border: '1px solid rgba(109, 35, 35, 0.1)',
                      borderRadius: 3,
                      p: 2.5,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      background: 'linear-gradient(135deg, #fff 0%, #fafafa 100%)',
                      height: '100%',
                      minHeight: 180,
                      display: 'flex',
                      flexDirection: 'column',
                      '&:hover': { 
                        boxShadow: '0 8px 24px rgba(109, 35, 35, 0.15)',
                        borderColor: '#6d2323',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    {/* Header Row */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: '#6d2323', width: 40, height: 40 }}>
                          {assignment.firstName?.[0]}{assignment.lastName?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#333' }}>
                            {assignment.fullName || assignment.employeeNumber}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#888' }}>
                            {assignment.employeeNumber}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={assignment.leave_code}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(109, 35, 35, 0.1)',
                          color: '#6d2323',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      />
                    </Box>

                    {/* Leave Type Info */}
                    <Typography variant="body2" sx={{ color: '#666', mb: 1.5 }}>
                      {leaveTypeInfo.leave_description}
                    </Typography>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Progress Bar */}
                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#666' }}>
                          Balance Progress
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: statusColor }}>
                          {progressPercent.toFixed(0)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={progressPercent}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: 'rgba(0,0,0,0.05)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            bgcolor: statusColor,
                          },
                        }}
                      />
                    </Box>

                    {/* Stats Row */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 'auto', pt: 1 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#6d2323' }}>
                          {(assignment.total_hours || 0) / 8}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#888' }}>Total</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#ed6c02' }}>
                          {(assignment.used_hours || 0) / 8}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#888' }}>Used</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: statusColor }}>
                          {(assignment.remaining_hours || 0) / 8}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#888' }}>Remaining</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              );
            })}
            
            {filteredAssignments.length === 0 && (
              <Grid item xs={12}>
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <EventNote sx={{ fontSize: 60, color: 'rgba(109, 35, 35, 0.2)', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: '#6D2323', fontWeight: 600 }}>
                    {assignments.length === 0 ? 'No assignments found' : 'No matching records'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#888' }}>
                    {assignments.length === 0 ? 'Create your first assignment above!' : 'Try adjusting your search criteria'}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </GlassCard>

      {/* Modal */}
      <Modal
        open={!!editAssignment}
        onClose={handleCloseModal}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            backgroundColor: '#fff',
            borderRadius: 4,
            width: '90%',
            maxWidth: '600px',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}
        >
          {editAssignment && (
            <>
              {/* Modal Header */}
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #6D2323 0%, #8B4545 100%)',
                  color: '#ffffff',
                  p: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                    <EditIcon sx={{ fontSize: 24 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {isEditing ? 'Edit Leave Assignment' : 'Assignment Details'}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {editAssignment.fullName || editAssignment.employeeNumber}
                    </Typography>
                  </Box>
                </Box>
                <IconButton onClick={handleCloseModal} sx={{ color: '#fff' }}>
                  <Close />
                </IconButton>
              </Box>

              {/* Modal Content */}
              <Box sx={{ p: 3 }}>
                {error && (
                  <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                    {error}
                  </Alert>
                )}

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>
                      Employee Number
                    </Typography>
                    <TextField
                      value={editAssignment.employeeNumber || ''}
                      onChange={(e) =>
                        setEditAssignment({ ...editAssignment, employeeNumber: e.target.value })
                      }
                      fullWidth
                      disabled={!isEditing}
                      size="medium"
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2 },
                        '& .MuiInputBase-input.Mui-disabled': {
                          WebkitTextFillColor: '#000',
                        }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>
                      Leave Type
                    </Typography>
                    <FormControl fullWidth disabled={!isEditing}>
                      <Select
                        value={editAssignment.leave_code || ''}
                        onChange={(e) =>
                          setEditAssignment({ ...editAssignment, leave_code: e.target.value })
                        }
                        displayEmpty
                        sx={{
                          borderRadius: 2,
                          '& .MuiSelect-select.Mui-disabled': {
                            WebkitTextFillColor: '#000',
                          }
                        }}
                      >
                        <MenuItem value="">
                          <em>Select Leave Type</em>
                        </MenuItem>
                        {leaveTypes.map((type) => (
                          <MenuItem key={type.id || type.leave_code} value={type.leave_code}>
                            {type.leave_code} - {type.leave_description}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>
                      Total Hours
                    </Typography>
                    <TextField
                      type="number"
                      value={editAssignment.total_hours || 0}
                      disabled
                      fullWidth
                      InputProps={{
                        endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2 },
                        '& .MuiInputBase-input.Mui-disabled': {
                          WebkitTextFillColor: '#000',
                        }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>
                      Used Hours
                    </Typography>
                    <TextField
                      type="number"
                      value={editAssignment.used_hours || 0}
                      disabled
                      fullWidth
                      InputProps={{
                        endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2 },
                        '& .MuiInputBase-input.Mui-disabled': {
                          WebkitTextFillColor: '#000',
                        }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>
                      Remaining Hours
                    </Typography>
                    <TextField
                      type="number"
                      value={editAssignment.remaining_hours || ''}
                      onChange={(e) =>
                        setEditAssignment({ ...editAssignment, remaining_hours: parseFloat(e.target.value) || 0 })
                      }
                      fullWidth
                      disabled={!isEditing}
                      inputProps={{ min: 0, step: 1 }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2 },
                        '& .MuiInputBase-input.Mui-disabled': {
                          WebkitTextFillColor: '#000',
                        }
                      }}
                    />
                  </Grid>

                  {/* Days Summary */}
                  <Grid item xs={12}>
                    <Box 
                      sx={{ 
                        p: 2, 
                        borderRadius: 2, 
                        bgcolor: 'rgba(109, 35, 35, 0.05)',
                        border: '1px solid rgba(109, 35, 35, 0.1)'
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#6d2323' }}>
                        Days Summary (8 hours = 1 day)
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: '#6d2323' }}>
                            {((editAssignment.total_hours || 0) / 8).toFixed(1)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#666' }}>Total Days</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: '#ed6c02' }}>
                            {((editAssignment.used_hours || 0) / 8).toFixed(1)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#666' }}>Used Days</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography 
                            variant="h5" 
                            sx={{ 
                              fontWeight: 700, 
                              color: getStatusColor(editAssignment.remaining_hours, editAssignment.total_hours)
                            }}
                          >
                            {((editAssignment.remaining_hours || 0) / 8).toFixed(1)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#666' }}>Remaining Days</Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </Grid>
                </Grid>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, gap: 2 }}>
                  {!isEditing ? (
                    <>
                      <Button
                        onClick={() => handleDelete(editAssignment.id)}
                        variant="contained"
                        startIcon={<DeleteIcon />}
                        sx={{
                          bgcolor: '#333',
                          color: '#fff',
                          borderRadius: 2,
                          px: 3,
                          '&:hover': { bgcolor: '#111' }
                        }}
                      >
                        Delete
                      </Button>
                      <Button
                        onClick={handleStartEdit}
                        variant="contained"
                        startIcon={<EditIcon />}
                        sx={{ 
                          bgcolor: '#6D2323', 
                          color: '#FEF9E1',
                          borderRadius: 2,
                          px: 3,
                          '&:hover': { bgcolor: '#5a1d1d' }
                        }}
                      >
                        Edit
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handleCancelEdit}
                        variant="outlined"
                        startIcon={<CancelIcon />}
                        sx={{
                          color: '#6d2323',
                          borderColor: '#6d2323',
                          borderRadius: 2,
                          px: 3,
                          '&:hover': { 
                            borderColor: '#6d2323',
                            bgcolor: 'rgba(109, 35, 35, 0.05)'
                          }
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUpdate}
                        variant="contained"
                        startIcon={<SaveIcon />}
                        sx={{ 
                          bgcolor: '#6D2323', 
                          color: '#FEF9E1',
                          borderRadius: 2,
                          px: 3,
                          '&:hover': { bgcolor: '#5a1d1d' }
                        }}
                      >
                        Save Changes
                      </Button>
                    </>
                  )}
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Modal>
    </Container>
  );
};

export default LeaveAssignment;
