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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
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
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';

import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';

// Styled components for professional look
const GlassCard = ({ children, sx = {} }) => (
  <Card
    sx={{
      background:
        'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
      backdropFilter: 'blur(10px)',
      borderRadius: 3,
      border: '1px solid rgba(109, 35, 35, 0.1)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      transition: 'all 0.3s ease',
      overflow: 'visible',
      '&:hover': {
        boxShadow: '0 12px 40px rgba(109, 35, 35, 0.12)',
      },
      ...sx,
    }}
  >
    {children}
  </Card>
);

const GradientHeader = ({
  icon: Icon,
  title,
  subtitle,
  gradient = 'linear-gradient(135deg, #6D2323 0%, #8B4545 100%)',
}) => (
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
        background:
          'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
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
    employeeNumber: '',
    total_hours: '',
    carried_forward_hours: '0',
    allocated_hours: '',
    period_year: new Date().getFullYear().toString(),
    period_semester: '',
  });
  const [editAssignment, setEditAssignment] = useState(null);
  const [originalAssignment, setOriginalAssignment] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('');
  const [error, setError] = useState('');
  const [carryForwardSuggestion, setCarryForwardSuggestion] = useState(null);
  const [isCarryForwardAutoSuggested, setIsCarryForwardAutoSuggested] =
    useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedLeaveHistory, setSelectedLeaveHistory] = useState(null);
  const [employeeCurrentBalances, setEmployeeCurrentBalances] = useState([]);
  const [employeeLeavesModalOpen, setEmployeeLeavesModalOpen] = useState(false);
  const [selectedEmployeeLeaves, setSelectedEmployeeLeaves] = useState(null);
  const [selectedLeaveTypeInModal, setSelectedLeaveTypeInModal] =
    useState(null);

  useEffect(() => {
    fetchAssignments();
    fetchLeaveTypes();
    fetchEmployees();
  }, []);

  // Auto-fetch carry forward suggestion when employee and leave type are selected
  useEffect(() => {
    const fetchCarryForwardSuggestion = async () => {
      if (selectedEmployee?.employeeNumber && newAssignment.leave_code) {
        try {
          console.log(
            `Fetching carry forward for Employee: ${selectedEmployee.employeeNumber}, Leave: ${newAssignment.leave_code}`,
          );
          const res = await axios.get(
            `${API_BASE_URL}/leaveRoute/leave_assignment/calculate-carryforward/${selectedEmployee.employeeNumber}/${newAssignment.leave_code}`,
          );

          console.log('Carry forward suggestion response:', res.data);
          setCarryForwardSuggestion(res.data);

          // Auto-populate carried_forward_hours if there's a suggestion
          if (res.data.hasHistory && res.data.suggestedCarryForward > 0) {
            const carriedForward = res.data.suggestedCarryForward;

            // Update only carried_forward_hours
            // Total will be calculated by the existing auto-calculation logic
            setNewAssignment((prev) => {
              const allocated = parseFloat(prev.allocated_hours) || 0;
              return {
                ...prev,
                carried_forward_hours: carriedForward.toString(),
                total_hours: (carriedForward + allocated).toString(),
              };
            });
            setIsCarryForwardAutoSuggested(true);
          } else {
            // No history or no unused hours - reset carried forward to 0
            setNewAssignment((prev) => {
              const allocated = parseFloat(prev.allocated_hours) || 0;
              return {
                ...prev,
                carried_forward_hours: '0',
                total_hours: allocated.toString(),
              };
            });
            setIsCarryForwardAutoSuggested(false);
          }
        } catch (error) {
          console.error('Error fetching carry forward suggestion:', error);
          setCarryForwardSuggestion(null);
          setIsCarryForwardAutoSuggested(false);
        }
      } else {
        // Reset if employee or leave code not selected
        setCarryForwardSuggestion(null);
        setIsCarryForwardAutoSuggested(false);
      }
    };

    fetchCarryForwardSuggestion();
  }, [selectedEmployee, newAssignment.leave_code]);

  // Fetch employee's current leave balances when selecting employee
  useEffect(() => {
    const fetchEmployeeBalances = async () => {
      if (selectedEmployee?.employeeNumber) {
        try {
          const employeeAssignments = assignments.filter(
            (a) =>
              a.employeeNumber?.toString() ===
              selectedEmployee.employeeNumber?.toString(),
          );

          // Group by leave type and calculate totals
          const balancesByType = {};
          employeeAssignments.forEach((assignment) => {
            const leaveCode = assignment.leave_code;
            if (!balancesByType[leaveCode]) {
              balancesByType[leaveCode] = {
                leave_code: leaveCode,
                leave_description:
                  getLeaveTypeInfo(leaveCode).leave_description,
                total_remaining: 0,
                total_used: 0,
                total_allocated: 0,
                periods: [],
              };
            }
            balancesByType[leaveCode].total_remaining +=
              assignment.remaining_hours || 0;
            balancesByType[leaveCode].total_used += assignment.used_hours || 0;
            balancesByType[leaveCode].total_allocated +=
              assignment.total_hours || 0;
            balancesByType[leaveCode].periods.push({
              year: assignment.period_year,
              semester: assignment.period_semester,
              remaining: assignment.remaining_hours,
            });
          });

          setEmployeeCurrentBalances(Object.values(balancesByType));
        } catch (error) {
          console.error('Error fetching employee balances:', error);
          setEmployeeCurrentBalances([]);
        }
      } else {
        setEmployeeCurrentBalances([]);
      }
    };

    fetchEmployeeBalances();
  }, [selectedEmployee, assignments]);

  const fetchAssignments = async () => {
    try {
      console.log('[fetchAssignments] Starting fetch...');
      const res = await axios.get(
        `${API_BASE_URL}/leaveRoute/leave_assignment`,
      );
      const assignmentsData = Array.isArray(res.data) ? res.data : [];
      console.log(
        '[fetchAssignments] Fetched ' + assignmentsData.length + ' assignments',
      );
      console.log(
        '[fetchAssignments] First few assignments:',
        assignmentsData.slice(0, 3),
      );
      setAssignments(assignmentsData);
      setError('');
    } catch (error) {
      console.error('[fetchAssignments] Error fetching assignments:', error);
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
          Authorization: `Bearer ${token}`,
        },
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
      console.log(
        'All users with roles:',
        usersData.map((u) => ({
          employeeNumber: u.employeeNumber,
          name: u.fullName || `${u.firstName} ${u.lastName}`,
          role: u.role,
        })),
      );

      // Don't filter - show ALL users including admins
      // Users can be found by employeeNumber or name
      setEmployees(usersData);
      console.log(`Loaded ${usersData.length} employees`);
    } catch (error) {
      console.error(
        'Error fetching users:',
        error.response?.data || error.message,
      );
      setEmployees([]);
    }
  };

  const isDuplicateAssignment = (
    employeeNumber,
    leaveCode,
    periodYear,
    periodSemester,
    excludeId = null,
  ) => {
    return assignments.some(
      (assignment) =>
        assignment.employeeNumber?.toString() === employeeNumber?.toString() &&
        assignment.leave_code === leaveCode &&
        assignment.period_year?.toString() === periodYear?.toString() &&
        String(assignment.period_semester || '') ===
          String(periodSemester || '') &&
        assignment.id !== excludeId,
    );
  };

  const handleAdd = async () => {
    const employeeNumber = selectedEmployee?.employeeNumber?.toString().trim();
    const leaveCode = newAssignment.leave_code;
    const totalHours = newAssignment.total_hours;

    if (!employeeNumber || !leaveCode) {
      setError('Please select an employee and leave type');
      return;
    }

    if (!totalHours || parseFloat(totalHours) < 0) {
      setError('Please enter valid leave hours (must be 0 or greater)');
      return;
    }

    if (
      isDuplicateAssignment(
        employeeNumber,
        leaveCode,
        newAssignment.period_year,
        newAssignment.period_semester,
      )
    ) {
      setError(
        'This employee already has an assignment for this leave type and period',
      );
      return;
    }

    setLoading(true);
    try {
      const payload = {
        leave_code: leaveCode,
        employeeNumber: employeeNumber,
        total_hours: parseFloat(totalHours),
        carried_forward_hours:
          parseFloat(newAssignment.carried_forward_hours) || 0,
        allocated_hours:
          parseFloat(newAssignment.allocated_hours) || parseFloat(totalHours),
        period_year:
          parseInt(newAssignment.period_year) || new Date().getFullYear(),
        period_semester: newAssignment.period_semester || null,
      };

      console.log('Creating leave assignment with payload:', payload);

      await axios.post(`${API_BASE_URL}/leaveRoute/leave_assignment`, payload);

      setSelectedEmployee(null);
      setNewAssignment({
        leave_code: '',
        employeeNumber: '',
        total_hours: '',
        carried_forward_hours: '0',
        allocated_hours: '',
        period_year: new Date().getFullYear().toString(),
        period_semester: '',
      });

      setTimeout(() => {
        setLoading(false);
        setSuccessAction('adding');
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2000);
      }, 300);

      await fetchAssignments();
    } catch (error) {
      console.error('Error adding assignment:', error);
      setError(
        'Error adding assignment: ' +
          (error.response?.data?.error || error.message),
      );
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    const assignmentId = editAssignment?.id;
    const employeeNumber = editAssignment.employeeNumber?.toString().trim();
    const leaveCode = editAssignment.leave_code;

    console.log('[handleUpdate] Starting edit with ID:', assignmentId);
    console.log('[handleUpdate] Current editAssignment:', editAssignment);

    if (!assignmentId) {
      console.error(
        '[handleUpdate] CRITICAL: No ID found in editAssignment!',
        editAssignment,
      );
      setError(
        'Error: Assignment ID is missing. Please close and reopen the form.',
      );
      return;
    }

    if (!employeeNumber || !leaveCode) {
      setError('Please fill in all required fields');
      return;
    }

    if (
      isDuplicateAssignment(
        employeeNumber,
        leaveCode,
        editAssignment.period_year,
        editAssignment.period_semester,
        editAssignment.id,
      )
    ) {
      setError(
        'This employee already has an assignment for this leave type and period',
      );
      return;
    }

    try {
      const payload = {
        leave_code: leaveCode,
        employeeNumber: employeeNumber,
        total_hours: parseFloat(editAssignment.total_hours) || 0,
        remaining_hours: parseFloat(editAssignment.remaining_hours) || 0,
        carried_forward_hours:
          parseFloat(editAssignment.carried_forward_hours) || 0,
        allocated_hours:
          parseFloat(editAssignment.allocated_hours) ||
          parseFloat(editAssignment.total_hours) ||
          0,
        period_year:
          parseInt(editAssignment.period_year) || new Date().getFullYear(),
        period_semester: editAssignment.period_semester || null,
      };

      console.log(
        '[handleUpdate] Sending PUT request to /leaveRoute/leave_assignment/' +
          assignmentId,
      );
      console.log(
        '[handleUpdate] Full API URL:',
        `${API_BASE_URL}/leaveRoute/leave_assignment/${assignmentId}`,
      );
      console.log(
        '[handleUpdate] FULL Payload:',
        JSON.stringify(payload, null, 2),
      );

      const response = await axios.put(
        `${API_BASE_URL}/leaveRoute/leave_assignment/${assignmentId}`,
        payload,
      );

      console.log('[handleUpdate] PUT response status:', response.status);
      console.log('[handleUpdate] PUT response data:', response.data);
      console.log(
        '[handleUpdate] Update successful, refreshing assignments...',
      );

      setEditAssignment(null);
      setOriginalAssignment(null);
      setIsEditing(false);
      setError('');

      console.log(
        '[handleUpdate] Calling fetchAssignments() to refresh data...',
      );
      await fetchAssignments();

      console.log(
        '[handleUpdate] Assignments refreshed, showing success message',
      );
      setSuccessAction('edit');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch (error) {
      console.error('[handleUpdate] ❌ ERROR CAUGHT:', error);
      console.error('[handleUpdate] Error message:', error.message);
      console.error(
        '[handleUpdate] Error response status:',
        error.response?.status,
      );
      console.error(
        '[handleUpdate] Error response data:',
        error.response?.data,
      );
      console.error('[handleUpdate] Error config:', error.config);
      setError(
        'Error updating assignment: ' +
          (error.response?.data?.error || error.message),
      );
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

      setSuccessAction('delete');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch (error) {
      console.error('Error deleting assignment:', error);
      setError(
        'Error deleting assignment: ' +
          (error.response?.data?.error || error.message),
      );
    }
  };

  const handleOpenModal = (assignment) => {
    console.log(
      '[handleOpenModal] Opening edit modal with assignment:',
      assignment,
    );
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

  const handleBackToPeriods = () => {
    console.log(
      '[handleBackToPeriods] Closing edit modal, returning to periods view',
    );
    setEditAssignment(null);
    setOriginalAssignment(null);
    setIsEditing(false);
    setError('');
    // Keep selectedLeaveTypeInModal open so periods view remains visible
  };

  const handleCloseModal = () => {
    console.log('[handleCloseModal] Completely closing all modals');
    setEditAssignment(null);
    setOriginalAssignment(null);
    setIsEditing(false);
    setError('');
    setEmployeeLeavesModalOpen(false);
    setSelectedEmployeeLeaves(null);
    setSelectedLeaveTypeInModal(null);
  };

  const getLeaveTypeInfo = (leaveCode) => {
    const leaveType = leaveTypes.find((type) => type.leave_code === leaveCode);
    return (
      leaveType || {
        leave_description: leaveCode || 'Unknown',
        leave_hours: 'N/A',
      }
    );
  };

  const getEmployeeInfo = (empNum) => {
    const emp = employees.find(
      (e) => e.employeeNumber?.toString() === empNum?.toString(),
    );
    return emp || { fullName: empNum || 'Unknown' };
  };

  // Filter assignments for display
  const filteredAssignments = assignments.filter((assignment) => {
    const employeeName = assignment.fullName?.toLowerCase() || '';
    const employeeNumber =
      assignment.employeeNumber?.toString().toLowerCase() || '';
    const leaveCode = assignment.leave_code?.toString().toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    return (
      employeeName.includes(search) ||
      employeeNumber.includes(search) ||
      leaveCode.includes(search)
    );
  });

  // Group assignments by employee
  const groupedByEmployee = filteredAssignments.reduce((acc, assignment) => {
    const empNum = assignment.employeeNumber?.toString() || 'Unknown';
    if (!acc[empNum]) {
      // Look up employee info from employees array
      const employeeInfo = getEmployeeInfo(empNum);
      acc[empNum] = {
        employeeNumber: empNum,
        fullName: employeeInfo.fullName || empNum,
        firstName: employeeInfo.firstName,
        lastName: employeeInfo.lastName,
        leaveTypes: {}, // Will store unique leave types with all their periods
      };
    }

    // Group by leave_code under each employee
    const leaveCode = assignment.leave_code;
    if (!acc[empNum].leaveTypes[leaveCode]) {
      acc[empNum].leaveTypes[leaveCode] = {
        leave_code: leaveCode,
        periods: [], // All assignment periods for this leave type
      };
    }

    acc[empNum].leaveTypes[leaveCode].periods.push(assignment);
    return acc;
  }, {});

  // Convert to array and sort by employee name
  const employeeGroups = Object.values(groupedByEmployee)
    .map((emp) => ({
      ...emp,
      leaveTypes: Object.values(emp.leaveTypes), // Convert leave types object to array
    }))
    .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));

  // Calculate total stats for a leave type (across all periods)
  const getLeaveTypeStats = (periods) => {
    return periods.reduce(
      (stats, period) => ({
        totalHours: stats.totalHours + (period.total_hours || 0),
        usedHours: stats.usedHours + (period.used_hours || 0),
        remainingHours: stats.remainingHours + (period.remaining_hours || 0),
      }),
      { totalHours: 0, usedHours: 0, remainingHours: 0 },
    );
  };

  // Open history modal for a specific leave type
  const handleOpenHistory = (employeeInfo, leaveType) => {
    setSelectedLeaveHistory({
      employee: employeeInfo,
      leaveType: leaveType,
      periods: leaveType.periods.sort((a, b) => {
        // Sort by year desc, then semester desc
        if (a.period_year !== b.period_year)
          return b.period_year - a.period_year;
        const semesterOrder = { '2nd': 2, '1st': 1, '': 0 };
        return (
          (semesterOrder[b.period_semester] || 0) -
          (semesterOrder[a.period_semester] || 0)
        );
      }),
    });
    setHistoryModalOpen(true);
  };

  const handleCloseHistory = () => {
    setHistoryModalOpen(false);
    setSelectedLeaveHistory(null);
  };

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
    <Box
      sx={{
        py: { xs: 2, md: 4 },
        mt: { xs: 0, md: -5 },
        width: '100%',
        maxWidth: '100%',
        mx: 'auto',
        px: { xs: 2, sm: 3, md: 4 },
      }}
    >
      {/* Loading Overlay */}
      <LoadingOverlay open={loading} message="Processing leave assignment..." />

      {/* Success Overlay */}
      <SuccessfulOverlay
        open={successOpen}
        action={successAction}
        onClose={() => setSuccessOpen(false)}
      />

      {/* Hero Header Section */}
      <GlassCard sx={{ mb: 4 }}>
        <Box
          sx={{
            p: 5,
            background: `linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)`,
            color: '#6d2323',
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
            position="relative"
            zIndex={1}
          >
            <Avatar
              sx={{
                bgcolor: 'rgba(109,35,35,0.15)',
                mr: 4,
                width: 64,
                height: 64,
                boxShadow: '0 8px 24px rgba(109,35,35,0.15)',
              }}
            >
              <EventNote sx={{ color: '#6d2323', fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 700,
                  mb: 1,
                  lineHeight: 1.2,
                  color: '#6d2323',
                }}
              >
                Leave Assignment Management
              </Typography>
              <Typography
                variant="body1"
                sx={{ opacity: 0.8, fontWeight: 400, color: '#8B3333' }}
              >
                Administrative Panel • Assign leave types and manage employee
                leave credits
              </Typography>
            </Box>
          </Box>
        </Box>
      </GlassCard>

      {/* Add Assignment Section */}
      <GlassCard sx={{ mb: 4 }}>
        <Box
          sx={{
            p: 4,
            background: `linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)`,
            color: '#6d2323',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
        >
          <EventNote sx={{ fontSize: '1.8rem', mr: 2 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Assign Leave to Employee
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Select an employee and assign leave type with designated hours
            </Typography>
          </Box>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3} alignItems="flex-start">
            <Grid item xs={12} md={4}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}
              >
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
                  const empName =
                    option.fullName ||
                    `${option.firstName || ''} ${option.lastName || ''}`.trim();
                  return `${empName} (${option.employeeNumber})`;
                }}
                filterOptions={(options, { inputValue }) => {
                  const search = inputValue.toLowerCase().trim();
                  return options.filter((option) => {
                    const empName = (
                      option.fullName ||
                      `${option.firstName || ''} ${option.lastName || ''}`
                    ).toLowerCase();
                    const empNum = (option.employeeNumber || '')
                      .toString()
                      .toLowerCase();
                    return empName.includes(search) || empNum.includes(search);
                  });
                }}
                isOptionEqualToValue={(option, value) =>
                  option.employeeNumber === value.employeeNumber
                }
                noOptionsText="No employees found"
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  const empName =
                    option.fullName ||
                    `${option.firstName || ''} ${option.lastName || ''}`.trim();
                  const initials =
                    `${option.firstName?.[0] || ''}${option.lastName?.[0] || ''}`.toUpperCase() ||
                    '?';
                  return (
                    <li key={key} {...otherProps}>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                      >
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: '#6d2323',
                            fontSize: '0.8rem',
                          }}
                        >
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
                        '&.Mui-focused fieldset': {
                          borderColor: '#6d2323',
                          borderWidth: 2,
                        },
                      },
                    }}
                  />
                )}
                sx={{ width: '100%' }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}
              >
                Leave Type *
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={newAssignment.leave_code || ''}
                  onChange={(e) => {
                    setNewAssignment({
                      ...newAssignment,
                      leave_code: e.target.value,
                    });
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
                    <MenuItem
                      key={type.id || type.leave_code}
                      value={type.leave_code}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                        }}
                      >
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
                            ml: 1,
                          }}
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Alert
                severity="info"
                icon={<EventNote />}
                sx={{
                  borderRadius: 2,
                  backgroundColor: 'rgba(109, 35, 35, 0.05)',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, mb: 0.5, color: '#6d2323' }}
                >
                  Leave Accumulation & Carried Balance
                </Typography>
                <Typography variant="caption" sx={{ color: '#666' }}>
                  Track previous balance separately from new allocation. Total
                  Hours = Carried Balance + Allocated Hours
                </Typography>
              </Alert>
            </Grid>

            {/* Show carry forward suggestion details */}
            {newAssignment.leave_code && carryForwardSuggestion && (
              <Grid item xs={12}>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor:
                      carryForwardSuggestion.suggestedCarryForward > 0
                        ? 'rgba(46, 125, 50, 0.05)'
                        : 'rgba(109, 35, 35, 0.03)',
                    border: `1px solid ${carryForwardSuggestion.suggestedCarryForward > 0 ? 'rgba(46, 125, 50, 0.2)' : 'rgba(109, 35, 35, 0.1)'}`,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 1,
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        color: '#6d2323',
                        fontSize: '0.9rem',
                      }}
                    >
                      {newAssignment.leave_code} - Previous Period Balance
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 1.5,
                        alignItems: 'center',
                      }}
                    >
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 700,
                            color:
                              carryForwardSuggestion.suggestedCarryForward > 0
                                ? '#2e7d32'
                                : '#666',
                            fontSize: '1.1rem',
                          }}
                        >
                          {(
                            carryForwardSuggestion.suggestedCarryForward / 8
                          ).toFixed(1)}
                          d
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: '#888', fontSize: '0.65rem' }}
                        >
                          remaining
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ color: '#666', display: 'block' }}
                  >
                    {carryForwardSuggestion.previousPeriod?.year}{' '}
                    {carryForwardSuggestion.previousPeriod?.semester ||
                      'Annual'}{' '}
                    • Used:{' '}
                    {carryForwardSuggestion.previousPeriod?.used_hours || 0}h •
                    {carryForwardSuggestion.suggestedCarryForward > 0 && (
                      <span style={{ fontWeight: 600, color: '#2E7D32' }}>
                        Auto-filled below
                      </span>
                    )}
                  </Typography>
                </Box>
              </Grid>
            )}

            <Grid item xs={12} md={3}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  mb: 1,
                  color: '#6d2323',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                Carried Balance Hours
                {isCarryForwardAutoSuggested && (
                  <Chip
                    label="Auto"
                    size="small"
                    icon={<CheckCircleIcon />}
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      bgcolor: 'rgba(46, 125, 50, 0.1)',
                      color: '#2E7D32',
                      '& .MuiChip-icon': { fontSize: 14, color: '#2E7D32' },
                    }}
                  />
                )}
              </Typography>
              <TextField
                type="number"
                value={newAssignment.carried_forward_hours}
                onChange={(e) => {
                  const carriedForward = parseFloat(e.target.value) || 0;
                  const allocated =
                    parseFloat(newAssignment.allocated_hours) || 0;
                  setNewAssignment({
                    ...newAssignment,
                    carried_forward_hours: e.target.value,
                    total_hours: (carriedForward + allocated).toString(),
                  });
                  // Mark as manually edited (no longer auto-suggested)
                  setIsCarryForwardAutoSuggested(false);
                  setError('');
                }}
                placeholder="Previous balance..."
                fullWidth
                size="medium"
                inputProps={{ min: 0, step: 8 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TimeIcon sx={{ color: '#2E7D32' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography variant="caption" sx={{ color: '#888' }}>
                        {(parseFloat(newAssignment.carried_forward_hours) ||
                          0) / 8}{' '}
                        days
                      </Typography>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '& fieldset': {
                      borderColor: isCarryForwardAutoSuggested
                        ? 'rgba(46, 125, 50, 0.5)'
                        : 'rgba(46, 125, 50, 0.3)',
                      borderWidth: isCarryForwardAutoSuggested ? 2 : 1,
                    },
                    '&:hover fieldset': { borderColor: '#2E7D32' },
                    '&.Mui-focused fieldset': {
                      borderColor: '#2E7D32',
                      borderWidth: 2,
                    },
                    backgroundColor: isCarryForwardAutoSuggested
                      ? 'rgba(46, 125, 50, 0.03)'
                      : 'transparent',
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: isCarryForwardAutoSuggested ? '#2E7D32' : '#666',
                  mt: 0.5,
                  display: 'block',
                  fontWeight: isCarryForwardAutoSuggested ? 600 : 500,
                }}
              >
                {carryForwardSuggestion?.hasHistory ? (
                  isCarryForwardAutoSuggested ? (
                    <>
                      ✓ Auto-calculated from{' '}
                      {carryForwardSuggestion.previousPeriod?.year}{' '}
                      {carryForwardSuggestion.previousPeriod?.semester || ''}
                    </>
                  ) : (
                    <>
                      Manually edited (was{' '}
                      {carryForwardSuggestion.suggestedCarryForward} hrs)
                    </>
                  )
                ) : (
                  'Unused hours from previous period'
                )}
              </Typography>
            </Grid>

            <Grid item xs={12} md={3}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}
              >
                New Allocation Hours
              </Typography>
              <TextField
                type="number"
                value={newAssignment.allocated_hours}
                onChange={(e) => {
                  const carriedForward =
                    parseFloat(newAssignment.carried_forward_hours) || 0;
                  const allocated = parseFloat(e.target.value) || 0;
                  setNewAssignment({
                    ...newAssignment,
                    allocated_hours: e.target.value,
                    total_hours: (carriedForward + allocated).toString(),
                  });
                  setError('');
                }}
                placeholder="New hours for this period..."
                fullWidth
                size="medium"
                inputProps={{ min: 0, step: 8 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TimeIcon sx={{ color: '#1976d2' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography variant="caption" sx={{ color: '#888' }}>
                        {(parseFloat(newAssignment.allocated_hours) || 0) / 8}{' '}
                        days
                      </Typography>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '& fieldset': { borderColor: 'rgba(25, 118, 210, 0.3)' },
                    '&:hover fieldset': { borderColor: '#1976d2' },
                    '&.Mui-focused fieldset': {
                      borderColor: '#1976d2',
                      borderWidth: 2,
                    },
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: '#1976d2',
                  mt: 0.5,
                  display: 'block',
                  fontWeight: 500,
                }}
              >
                Fresh allocation for current period
              </Typography>
            </Grid>

            <Grid item xs={12} md={2}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}
              >
                Period Year
              </Typography>
              <TextField
                type="number"
                value={newAssignment.period_year}
                onChange={(e) => {
                  setNewAssignment({
                    ...newAssignment,
                    period_year: e.target.value,
                  });
                }}
                placeholder="Year..."
                fullWidth
                size="medium"
                inputProps={{ min: 2020, max: 2030 }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '& fieldset': { borderColor: 'rgba(109, 35, 35, 0.2)' },
                    '&:hover fieldset': { borderColor: '#6d2323' },
                    '&.Mui-focused fieldset': {
                      borderColor: '#6d2323',
                      borderWidth: 2,
                    },
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{ color: '#888', mt: 0.5, display: 'block' }}
              >
                e.g., 2024, 2025
              </Typography>
            </Grid>

            <Grid item xs={12} md={2}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}
              >
                Semester (Optional)
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={newAssignment.period_semester || ''}
                  onChange={(e) =>
                    setNewAssignment({
                      ...newAssignment,
                      period_semester: e.target.value,
                    })
                  }
                  displayEmpty
                  size="medium"
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
                    <em>Annual</em>
                  </MenuItem>
                  <MenuItem value="1st semester">1st Semester</MenuItem>
                  <MenuItem value="2nd semester">2nd Semester</MenuItem>
                </Select>
              </FormControl>
              <Typography
                variant="caption"
                sx={{ color: '#888', mt: 0.5, display: 'block' }}
              >
                Leave blank for annual
              </Typography>
            </Grid>

            <Grid item xs={12} md={2}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}
              >
                Total Hours *
              </Typography>
              <TextField
                type="number"
                value={newAssignment.total_hours}
                InputProps={{
                  readOnly: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <TimeIcon sx={{ color: '#6d2323' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Chip
                        label={`${(parseFloat(newAssignment.total_hours) || 0) / 8} days`}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(109,35,35,0.1)',
                          color: '#6d2323',
                          fontWeight: 700,
                          fontSize: '0.7rem',
                        }}
                      />
                    </InputAdornment>
                  ),
                }}
                fullWidth
                size="medium"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: '#f5f5f5',
                    '& fieldset': { borderColor: 'rgba(109, 35, 35, 0.2)' },
                  },
                  '& .MuiInputBase-input': {
                    fontWeight: 700,
                    color: '#6d2323',
                    fontSize: '1.1rem',
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: '#6d2323',
                  mt: 0.5,
                  display: 'block',
                  fontWeight: 600,
                }}
              >
                Auto-calculated sum
              </Typography>
            </Grid>

            <Grid item xs={12} md={2}>
              <Button
                onClick={handleAdd}
                variant="contained"
                fullWidth
                size="large"
                startIcon={<AddIcon />}
                disabled={
                  loading ||
                  !selectedEmployee ||
                  !newAssignment.leave_code ||
                  !newAssignment.total_hours
                }
                sx={{
                  mt: 3,
                  height: 50,
                  borderRadius: 2,
                  backgroundColor:
                    loading ||
                    !selectedEmployee ||
                    !newAssignment.leave_code ||
                    !newAssignment.total_hours
                      ? '#cccccc'
                      : '#6D2323',
                  color:
                    loading ||
                    !selectedEmployee ||
                    !newAssignment.leave_code ||
                    !newAssignment.total_hours
                      ? '#666666'
                      : '#FFFFFF',
                  fontWeight: 600,
                  boxShadow:
                    loading ||
                    !selectedEmployee ||
                    !newAssignment.leave_code ||
                    !newAssignment.total_hours
                      ? 'none'
                      : '0 4px 12px rgba(109, 35, 35, 0.3)',
                  '&:hover': {
                    backgroundColor:
                      loading ||
                      !selectedEmployee ||
                      !newAssignment.leave_code ||
                      !newAssignment.total_hours
                        ? '#cccccc'
                        : '#5a1d1d',
                    boxShadow:
                      loading ||
                      !selectedEmployee ||
                      !newAssignment.leave_code ||
                      !newAssignment.total_hours
                        ? 'none'
                        : '0 6px 16px rgba(109, 35, 35, 0.4)',
                  },
                  '&:disabled': {
                    backgroundColor: '#cccccc !important',
                    color: '#666666 !important',
                    boxShadow: 'none !important',
                  },
                }}
              >
                {loading ? 'Adding...' : 'Assign'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </GlassCard>

      {/* Records Section */}
      <GlassCard sx={{ mb: { xs: 6, md: 10 }, overflow: 'visible' }}>
        <Box
          sx={{
            p: 4,
            background: `linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)`,
            color: '#6d2323',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: 'rgba(109,35,35,0.15)',
                width: 56,
                height: 56,
                boxShadow: '0 4px 12px rgba(109,35,35,0.15)',
              }}
            >
              <ReorderIcon sx={{ fontSize: 28, color: '#6d2323' }} />
            </Avatar>
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: '#6d2323' }}
              >
                Leave Assignment Records
              </Typography>
              <Typography
                variant="body2"
                sx={{ opacity: 0.8, color: '#8B3333' }}
              >
                {employeeGroups.length}{' '}
                {employeeGroups.length === 1 ? 'employee' : 'employees'} •{' '}
                {filteredAssignments.length}{' '}
                {filteredAssignments.length === 1
                  ? 'assignment'
                  : 'assignments'}
              </Typography>
            </Box>
          </Box>

          <TextField
            size="small"
            variant="outlined"
            placeholder="Search by name or employee number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              minWidth: 300,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: '#fff',
                '& fieldset': { borderColor: 'rgba(109, 35, 35, 0.2)' },
                '&:hover fieldset': { borderColor: '#6d2323' },
                '&.Mui-focused fieldset': { borderColor: '#6d2323' },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#6d2323' }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <CardContent sx={{ p: 4, overflow: 'visible' }}>
          {filteredAssignments.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  bgcolor: 'rgba(109, 35, 35, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <EventNote
                  sx={{ fontSize: 56, color: 'rgba(109, 35, 35, 0.3)' }}
                />
              </Box>
              <Typography
                variant="h6"
                sx={{ color: '#6D2323', fontWeight: 700, mb: 1 }}
              >
                {assignments.length === 0
                  ? 'No Leave Assignments Found'
                  : 'No Matching Records'}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: '#888', maxWidth: 400, mx: 'auto' }}
              >
                {assignments.length === 0
                  ? 'Get started by assigning leave types to employees using the form above.'
                  : "Try adjusting your search criteria to find what you're looking for."}
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {employeeGroups.map((employeeGroup) => {
                // Calculate aggregate stats across ALL periods for this employee
                const allPeriods = employeeGroup.leaveTypes.flatMap(
                  (lt) => lt.periods,
                );
                const totalHours = allPeriods.reduce(
                  (sum, p) => sum + (p.total_hours || 0),
                  0,
                );
                const usedHours = allPeriods.reduce(
                  (sum, p) => sum + (p.used_hours || 0),
                  0,
                );
                const remainingHours = allPeriods.reduce(
                  (sum, p) => sum + (p.remaining_hours || 0),
                  0,
                );
                const overallColor = getStatusColor(remainingHours, totalHours);

                return (
                  <Grid
                    item
                    xs={12}
                    sm={6}
                    md={4}
                    lg={3}
                    key={employeeGroup.employeeNumber}
                  >
                    <Box
                      onClick={() => {
                        setSelectedEmployeeLeaves(employeeGroup);
                        setSelectedLeaveTypeInModal(null);
                        setEmployeeLeavesModalOpen(true);
                      }}
                      sx={{
                        border: '1px solid rgba(109, 35, 35, 0.15)',
                        borderRadius: 3,
                        p: 2.5,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        background:
                          'linear-gradient(135deg, #FFFFFF 0%, #FEFEFE 100%)',
                        minHeight: 220,
                        display: 'flex',
                        flexDirection: 'column',
                        cursor: 'pointer',
                        '&:hover': {
                          boxShadow: '0 12px 32px rgba(109, 35, 35, 0.18)',
                          borderColor: '#6d2323',
                          transform: 'translateY(-4px)',
                        },
                      }}
                    >
                      {/* Employee Header */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          mb: 2,
                        }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: '#6d2323',
                            width: 48,
                            height: 48,
                            boxShadow: '0 4px 12px rgba(109,35,35,0.25)',
                          }}
                        >
                          <Typography
                            sx={{
                              fontWeight: 700,
                              fontSize: '1rem',
                              color: '#FFFFFF',
                            }}
                          >
                            {employeeGroup.firstName?.[0] || 'U'}
                            {employeeGroup.lastName?.[0] || 'U'}
                          </Typography>
                        </Avatar>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: 700,
                              color: '#6d2323',
                              fontSize: '0.95rem',
                              lineHeight: 1.3,
                              mb: 0.3,
                            }}
                          >
                            {employeeGroup.fullName}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#888',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          >
                            #{employeeGroup.employeeNumber}
                          </Typography>
                        </Box>
                      </Box>

                      <Divider
                        sx={{ mb: 2, borderColor: 'rgba(109,35,35,0.1)' }}
                      />

                      {/* Overall Quick Stats */}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-around',
                          mb: 2,
                          py: 1.5,
                          bgcolor: 'rgba(109, 35, 35, 0.02)',
                          borderRadius: 2,
                        }}
                      >
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 700,
                              color: '#6d2323',
                              fontSize: '1.1rem',
                            }}
                          >
                            {(totalHours / 8).toFixed(1)}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: '#888', fontSize: '0.65rem' }}
                          >
                            Total
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 700,
                              color: '#ed6c02',
                              fontSize: '1.1rem',
                            }}
                          >
                            {(usedHours / 8).toFixed(1)}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: '#888', fontSize: '0.65rem' }}
                          >
                            Used
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 700,
                              color: overallColor,
                              fontSize: '1.1rem',
                            }}
                          >
                            {(remainingHours / 8).toFixed(1)}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: '#888', fontSize: '0.65rem' }}
                          >
                            Left
                          </Typography>
                        </Box>
                      </Box>

                      {/* Leave Types with Days Left - Button Style */}
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#888',
                            fontWeight: 600,
                            mb: 1,
                            display: 'block',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            fontSize: '0.65rem',
                          }}
                        >
                          📋 Leave Credits
                        </Typography>
                        <Box
                          sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}
                        >
                          {employeeGroup.leaveTypes.map((leaveType) => {
                            const stats = getLeaveTypeStats(leaveType.periods);
                            const statusColor = getStatusColor(
                              stats.remainingHours,
                              stats.totalHours,
                            );
                            const daysRemaining = (
                              stats.remainingHours / 8
                            ).toFixed(1);

                            return (
                              <Chip
                                key={leaveType.leave_code}
                                label={`${leaveType.leave_code}: ${daysRemaining}d`}
                                size="small"
                                sx={{
                                  bgcolor: `${statusColor}15`,
                                  color: statusColor,
                                  borderColor: statusColor,
                                  border: `1px solid ${statusColor}50`,
                                  fontWeight: 700,
                                  height: 26,
                                  fontSize: '0.75rem',
                                  '&:hover': {
                                    bgcolor: statusColor,
                                    color: '#fff',
                                  },
                                }}
                              />
                            );
                          })}
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </CardContent>
      </GlassCard>

      {/* Employee Leaves Modal - Shows all leave types for selected employee */}
      <Modal
        open={employeeLeavesModalOpen}
        onClose={() => {
          setEmployeeLeavesModalOpen(false);
          setSelectedEmployeeLeaves(null);
          setSelectedLeaveTypeInModal(null);
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Box
          sx={{
            backgroundColor: '#fff',
            borderRadius: 4,
            width: '90%',
            maxWidth: '700px',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}
        >
          {selectedEmployeeLeaves && !selectedLeaveTypeInModal && (
            <>
              {/* Employee Leaves Modal Header */}
              <Box
                sx={{
                  background:
                    'linear-gradient(135deg, #6D2323 0%, #8B4545 100%)',
                  color: '#ffffff',
                  p: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: -40,
                    right: -40,
                    width: 160,
                    height: 160,
                    background:
                      'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
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
                  <Avatar
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      width: 64,
                      height: 64,
                    }}
                  >
                    <PersonIcon sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {selectedEmployeeLeaves.fullName}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Employee ID: {selectedEmployeeLeaves.employeeNumber}
                    </Typography>
                    <Chip
                      label={`${selectedEmployeeLeaves.leaveTypes.length} Leave Type${selectedEmployeeLeaves.leaveTypes.length !== 1 ? 's' : ''}`}
                      size="small"
                      sx={{
                        mt: 1,
                        bgcolor: 'rgba(255,255,255,0.25)',
                        color: '#FFFFFF',
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <Button
                    onClick={() => {
                      setEmployeeLeavesModalOpen(false);
                      setSelectedEmployeeLeaves(null);
                    }}
                    variant="outlined"
                    size="small"
                    startIcon={<ChevronLeftIcon />}
                    sx={{
                      color: '#fff',
                      borderColor: 'rgba(255,255,255,0.4)',
                      fontWeight: 600,
                      textTransform: 'none',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.15)',
                        borderColor: '#fff',
                      },
                    }}
                  >
                    Back
                  </Button>
                  <IconButton
                    onClick={() => {
                      setEmployeeLeavesModalOpen(false);
                      setSelectedEmployeeLeaves(null);
                    }}
                    sx={{ color: '#fff', position: 'relative', zIndex: 1 }}
                  >
                    <Close />
                  </IconButton>
                </Box>
              </Box>

              {/* Leave Types List */}
              <Box sx={{ p: 4 }}>
                <Grid container spacing={2}>
                  {selectedEmployeeLeaves.leaveTypes.map((leaveType) => {
                    const stats = getLeaveTypeStats(leaveType.periods);
                    const statusColor = getStatusColor(
                      stats.remainingHours,
                      stats.totalHours,
                    );

                    return (
                      <Grid item xs={12} sm={6} key={leaveType.leave_code}>
                        <Box
                          onClick={() => setSelectedLeaveTypeInModal(leaveType)}
                          sx={{
                            p: 2.5,
                            borderRadius: 2.5,
                            border: `1.5px solid ${statusColor}40`,
                            bgcolor: 'rgba(109, 35, 35, 0.02)',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            '&:hover': {
                              borderColor: statusColor,
                              bgcolor: `${statusColor}10`,
                              transform: 'translateY(-2px)',
                              boxShadow: `0 4px 16px ${statusColor}30`,
                            },
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 2,
                              mb: 1.5,
                            }}
                          >
                            <Avatar
                              sx={{
                                bgcolor: statusColor,
                                width: 48,
                                height: 48,
                                boxShadow: `0 4px 12px ${statusColor}40`,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontWeight: 700,
                                  fontSize: '0.85rem',
                                  color: '#fff',
                                }}
                              >
                                {leaveType.leave_code}
                              </Typography>
                            </Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography
                                sx={{
                                  fontWeight: 700,
                                  color: '#6d2323',
                                  mb: 0.5,
                                }}
                              >
                                {leaveType.leave_code}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: '#888' }}
                              >
                                {leaveType.periods.length} period
                                {leaveType.periods.length !== 1 ? 's' : ''}
                              </Typography>
                            </Box>
                          </Box>

                          <Divider
                            sx={{ my: 1.5, borderColor: 'rgba(109,35,35,0.1)' }}
                          />

                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <Box>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: '#888',
                                  display: 'block',
                                  mb: 0.5,
                                }}
                              >
                                Days Remaining
                              </Typography>
                              <Typography
                                sx={{
                                  fontWeight: 700,
                                  color: statusColor,
                                  fontSize: '1.3rem',
                                }}
                              >
                                {(stats.remainingHours / 8).toFixed(1)}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: '#888',
                                  display: 'block',
                                  mb: 0.5,
                                }}
                              >
                                Total / Used
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 600,
                                  color: '#666',
                                  display: 'block',
                                }}
                              >
                                {(stats.totalHours / 8).toFixed(1)} /{' '}
                                {(stats.usedHours / 8).toFixed(1)}
                              </Typography>
                            </Box>
                          </Box>

                          <Box
                            sx={{
                              mt: 1.5,
                              pt: 1.5,
                              borderTop: '1px solid rgba(109,35,35,0.1)',
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#888',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                              }}
                            >
                              <ChevronRightIcon sx={{ fontSize: 14 }} />
                              Click to view all periods
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            </>
          )}

          {selectedEmployeeLeaves && selectedLeaveTypeInModal && (
            <>
              {/* Leave Type Periods Modal Header */}
              <Box
                sx={{
                  background:
                    'linear-gradient(135deg, #6D2323 0%, #8B4545 100%)',
                  color: '#ffffff',
                  p: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: -40,
                    right: -40,
                    width: 160,
                    height: 160,
                    background:
                      'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
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
                  <Avatar
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      width: 56,
                      height: 56,
                    }}
                  >
                    <EventNote sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {selectedLeaveTypeInModal.leave_code} - Periods
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      {selectedEmployeeLeaves.fullName}
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <Button
                    onClick={() => setSelectedLeaveTypeInModal(null)}
                    variant="outlined"
                    size="small"
                    startIcon={<ChevronLeftIcon />}
                    sx={{
                      color: '#fff',
                      borderColor: 'rgba(255,255,255,0.4)',
                      fontWeight: 600,
                      textTransform: 'none',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.15)',
                        borderColor: '#fff',
                      },
                    }}
                  >
                    Back to Leave Types
                  </Button>
                </Box>
              </Box>

              {/* Periods List */}
              <Box sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {selectedLeaveTypeInModal.periods
                    .sort((a, b) => {
                      if (b.period_year !== a.period_year)
                        return b.period_year - a.period_year;
                      const semesterOrder = { '2nd': 2, '1st': 1, null: 0 };
                      return (
                        (semesterOrder[b.period_semester] || 0) -
                        (semesterOrder[a.period_semester] || 0)
                      );
                    })
                    .map((period, index) => {
                      const statusColor = getStatusColor(
                        period.remaining_hours,
                        period.total_hours,
                      );
                      const isLatest = index === 0;
                      const isCarryForward = period.carried_forward_hours > 0;

                      return (
                        <Box
                          key={period.id}
                          onClick={() => {
                            handleOpenModal(period);
                          }}
                          sx={{
                            p: 2.5,
                            borderRadius: 2,
                            border: isLatest
                              ? '2px solid #6d2323'
                              : '1px solid rgba(109, 35, 35, 0.15)',
                            bgcolor: isLatest
                              ? 'rgba(109, 35, 35, 0.03)'
                              : '#fff',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            position: 'relative',
                            '&:hover': {
                              borderColor: '#6d2323',
                              boxShadow: '0 6px 20px rgba(109, 35, 35, 0.15)',
                              transform: 'translateX(4px)',
                            },
                          }}
                        >
                          {isLatest && (
                            <Chip
                              label="Latest"
                              size="small"
                              sx={{
                                position: 'absolute',
                                top: 12,
                                right: 12,
                                bgcolor: '#6d2323',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                height: 24,
                              }}
                            />
                          )}

                          {/* Period Header */}
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              mb: 1.5,
                            }}
                          >
                            <Box
                              sx={{
                                p: 1,
                                borderRadius: 1.5,
                                bgcolor: `${statusColor}20`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Typography
                                sx={{
                                  fontWeight: 700,
                                  color: statusColor,
                                  fontSize: '0.9rem',
                                }}
                              >
                                {period.period_year}
                                {period.period_semester
                                  ? ` ${period.period_semester}`
                                  : ''}
                              </Typography>
                            </Box>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography
                                sx={{
                                  fontWeight: 600,
                                  color: '#6d2323',
                                  mb: 0.3,
                                }}
                              >
                                {period.period_year}
                                {period.period_semester
                                  ? ` ${period.period_semester}`
                                  : ' Annual'}
                              </Typography>
                              {isCarryForward && (
                                <Chip
                                  size="small"
                                  label={`↻ Carried Balance: ${(period.carried_forward_hours / 8).toFixed(1)}d`}
                                  sx={{
                                    height: 20,
                                    fontSize: '0.65rem',
                                    bgcolor: 'rgba(46, 125, 50, 0.15)',
                                    color: '#2E7D32',
                                    fontWeight: 600,
                                  }}
                                />
                              )}
                            </Box>
                          </Box>

                          {/* Compact Stats */}
                          <Grid container spacing={1}>
                            <Grid item xs={3}>
                              <Box
                                sx={{
                                  textAlign: 'center',
                                  p: 1,
                                  borderRadius: 1,
                                  bgcolor: 'rgba(109, 35, 35, 0.05)',
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: '#888',
                                    display: 'block',
                                    mb: 0.3,
                                    fontSize: '0.6rem',
                                  }}
                                >
                                  Allocated
                                </Typography>
                                <Typography
                                  sx={{
                                    fontWeight: 700,
                                    color: '#6d2323',
                                    fontSize: '0.9rem',
                                  }}
                                >
                                  {((period.allocated_hours || 0) / 8).toFixed(
                                    1,
                                  )}
                                  d
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={3}>
                              <Box
                                sx={{
                                  textAlign: 'center',
                                  p: 1,
                                  borderRadius: 1,
                                  bgcolor: 'rgba(237, 108, 2, 0.05)',
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: '#888',
                                    display: 'block',
                                    mb: 0.3,
                                    fontSize: '0.6rem',
                                  }}
                                >
                                  Used
                                </Typography>
                                <Typography
                                  sx={{
                                    fontWeight: 700,
                                    color: '#ed6c02',
                                    fontSize: '0.9rem',
                                  }}
                                >
                                  {((period.used_hours || 0) / 8).toFixed(1)}d
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={3}>
                              <Box
                                sx={{
                                  textAlign: 'center',
                                  p: 1,
                                  borderRadius: 1,
                                  bgcolor: `${statusColor}15`,
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: '#888',
                                    display: 'block',
                                    mb: 0.3,
                                    fontSize: '0.6rem',
                                  }}
                                >
                                  Left
                                </Typography>
                                <Typography
                                  sx={{
                                    fontWeight: 700,
                                    color: statusColor,
                                    fontSize: '0.9rem',
                                  }}
                                >
                                  {((period.remaining_hours || 0) / 8).toFixed(
                                    1,
                                  )}
                                  d
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={3}>
                              <Box
                                sx={{
                                  textAlign: 'center',
                                  p: 1,
                                  borderRadius: 1,
                                  bgcolor: 'rgba(46, 125, 50, 0.05)',
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: '#888',
                                    display: 'block',
                                    mb: 0.3,
                                    fontSize: '0.6rem',
                                  }}
                                >
                                  Total
                                </Typography>
                                <Typography
                                  sx={{
                                    fontWeight: 700,
                                    color: '#2E7D32',
                                    fontSize: '0.9rem',
                                  }}
                                >
                                  {((period.total_hours || 0) / 8).toFixed(1)}d
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>

                          <Box
                            sx={{
                              mt: 1.5,
                              pt: 1.5,
                              borderTop: '1px solid rgba(109,35,35,0.1)',
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#888',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                              }}
                            >
                              <EditIcon sx={{ fontSize: 14 }} />
                              Click to edit
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Modal>

      {/* Edit Assignment Modal */}
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
                  background:
                    'linear-gradient(135deg, #6D2323 0%, #8B4545 100%)',
                  color: '#ffffff',
                  p: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      width: 48,
                      height: 48,
                    }}
                  >
                    <EditIcon sx={{ fontSize: 24 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {isEditing
                        ? 'Edit Leave Assignment'
                        : 'Assignment Details'}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {editAssignment.fullName || editAssignment.employeeNumber}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconButton
                    onClick={handleBackToPeriods}
                    sx={{ color: '#fff' }}
                    title="Back to Periods"
                  >
                    <ChevronLeftIcon />
                  </IconButton>
                  <IconButton
                    onClick={handleCloseModal}
                    sx={{ color: '#fff' }}
                    title="Close"
                  >
                    <Close />
                  </IconButton>
                </Box>
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
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}
                    >
                      Employee Number
                    </Typography>
                    <TextField
                      value={editAssignment.employeeNumber || ''}
                      onChange={(e) =>
                        setEditAssignment({
                          ...editAssignment,
                          employeeNumber: e.target.value,
                        })
                      }
                      fullWidth
                      size="medium"
                      variant={isEditing ? 'outlined' : 'standard'}
                      InputProps={{
                        readOnly: !isEditing,
                        disableUnderline: !isEditing,
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2 },
                        '& .MuiInputBase-input': { color: '#000' },
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}
                    >
                      Leave Type
                    </Typography>
                    {isEditing ? (
                      <FormControl fullWidth>
                        <Select
                          value={editAssignment.leave_code || ''}
                          onChange={(e) =>
                            setEditAssignment({
                              ...editAssignment,
                              leave_code: e.target.value,
                            })
                          }
                          displayEmpty
                          sx={{
                            borderRadius: 2,
                          }}
                        >
                          <MenuItem value="">
                            <em>Select Leave Type</em>
                          </MenuItem>
                          {leaveTypes.map((type) => (
                            <MenuItem
                              key={type.id || type.leave_code}
                              value={type.leave_code}
                            >
                              {type.leave_code} - {type.leave_description}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : (
                      <TextField
                        value={`${editAssignment.leave_code || ''} - ${getLeaveTypeInfo(editAssignment.leave_code).leave_description}`}
                        fullWidth
                        size="medium"
                        variant="standard"
                        InputProps={{
                          readOnly: true,
                          disableUnderline: true,
                        }}
                        sx={{
                          '& .MuiInputBase-input': { color: '#000' },
                        }}
                      />
                    )}
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}
                    >
                      Total Hours
                    </Typography>
                    <TextField
                      type="number"
                      value={editAssignment.total_hours || 0}
                      fullWidth
                      variant="standard"
                      InputProps={{
                        readOnly: true,
                        disableUnderline: true,
                        endAdornment: (
                          <InputAdornment position="end">hrs</InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiInputBase-input': { color: '#000' },
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}
                    >
                      Used Hours
                    </Typography>
                    <TextField
                      type="number"
                      value={editAssignment.used_hours || 0}
                      fullWidth
                      variant="standard"
                      InputProps={{
                        readOnly: true,
                        disableUnderline: true,
                        endAdornment: (
                          <InputAdornment position="end">hrs</InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiInputBase-input': { color: '#000' },
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}
                    >
                      Remaining Hours
                    </Typography>
                    <TextField
                      type="number"
                      value={editAssignment.remaining_hours || ''}
                      onChange={(e) =>
                        setEditAssignment({
                          ...editAssignment,
                          remaining_hours: parseFloat(e.target.value) || 0,
                        })
                      }
                      fullWidth
                      size="medium"
                      variant={isEditing ? 'outlined' : 'standard'}
                      inputProps={{ min: 0, step: 1 }}
                      InputProps={{
                        readOnly: !isEditing,
                        disableUnderline: !isEditing,
                        endAdornment: (
                          <InputAdornment position="end">hrs</InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2 },
                        '& .MuiInputBase-input': { color: '#000' },
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }}>
                      <Chip
                        label="Carried Balance & Allocation"
                        size="small"
                        sx={{
                          bgcolor: 'rgba(109,35,35,0.1)',
                          color: '#6d2323',
                          fontWeight: 600,
                        }}
                      />
                    </Divider>
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 1, color: '#2E7D32' }}
                    >
                      Carried Balance Hours
                    </Typography>
                    <TextField
                      type="number"
                      value={editAssignment.carried_forward_hours || 0}
                      onChange={(e) => {
                        const carriedForward = parseFloat(e.target.value) || 0;
                        const allocated =
                          parseFloat(editAssignment.allocated_hours) || 0;
                        setEditAssignment({
                          ...editAssignment,
                          carried_forward_hours: carriedForward,
                          total_hours: carriedForward + allocated,
                        });
                      }}
                      fullWidth
                      size="medium"
                      variant={isEditing ? 'outlined' : 'standard'}
                      inputProps={{ min: 0, step: 8 }}
                      InputProps={{
                        readOnly: !isEditing,
                        disableUnderline: !isEditing,
                        endAdornment: (
                          <InputAdornment position="end">
                            {(
                              (editAssignment.carried_forward_hours || 0) / 8
                            ).toFixed(1)}{' '}
                            days
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2 },
                        '& .MuiInputBase-input': {
                          color: '#2E7D32',
                          fontWeight: 600,
                        },
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 1, color: '#1976d2' }}
                    >
                      Allocated Hours
                    </Typography>
                    <TextField
                      type="number"
                      value={editAssignment.allocated_hours || 0}
                      onChange={(e) => {
                        const carriedForward =
                          parseFloat(editAssignment.carried_forward_hours) || 0;
                        const allocated = parseFloat(e.target.value) || 0;
                        setEditAssignment({
                          ...editAssignment,
                          allocated_hours: allocated,
                          total_hours: carriedForward + allocated,
                        });
                      }}
                      fullWidth
                      size="medium"
                      variant={isEditing ? 'outlined' : 'standard'}
                      inputProps={{ min: 0, step: 8 }}
                      InputProps={{
                        readOnly: !isEditing,
                        disableUnderline: !isEditing,
                        endAdornment: (
                          <InputAdornment position="end">
                            {(
                              (editAssignment.allocated_hours || 0) / 8
                            ).toFixed(1)}{' '}
                            days
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2 },
                        '& .MuiInputBase-input': {
                          color: '#1976d2',
                          fontWeight: 600,
                        },
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}
                    >
                      Period Year
                    </Typography>
                    <TextField
                      type="number"
                      value={editAssignment.period_year || 2026}
                      onChange={(e) =>
                        setEditAssignment({
                          ...editAssignment,
                          period_year: parseInt(e.target.value),
                        })
                      }
                      fullWidth
                      size="medium"
                      variant={isEditing ? 'outlined' : 'standard'}
                      inputProps={{ min: 2020, max: 2035 }}
                      InputProps={{
                        readOnly: !isEditing,
                        disableUnderline: !isEditing,
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2 },
                        '& .MuiInputBase-input': { color: '#000' },
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}
                    >
                      Period Semester
                    </Typography>
                    {isEditing ? (
                      <FormControl fullWidth>
                        <Select
                          value={editAssignment.period_semester || ''}
                          onChange={(e) =>
                            setEditAssignment({
                              ...editAssignment,
                              period_semester: e.target.value,
                            })
                          }
                          displayEmpty
                          sx={{
                            borderRadius: 2,
                          }}
                        >
                          <MenuItem value="">
                            <em>Annual</em>
                          </MenuItem>
                          <MenuItem value="1st semester">1st Semester</MenuItem>
                          <MenuItem value="2nd semester">2nd Semester</MenuItem>
                        </Select>
                      </FormControl>
                    ) : (
                      <TextField
                        value={editAssignment.period_semester || 'Annual'}
                        fullWidth
                        size="medium"
                        variant="standard"
                        InputProps={{
                          readOnly: true,
                          disableUnderline: true,
                        }}
                        sx={{
                          '& .MuiInputBase-input': { color: '#000' },
                        }}
                      />
                    )}
                  </Grid>

                  {/* Days Summary */}
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'rgba(109, 35, 35, 0.05)',
                        border: '1px solid rgba(109, 35, 35, 0.1)',
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 600, mb: 1.5, color: '#6d2323' }}
                      >
                        Days Summary (8 hours = 1 day)
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <Typography
                            variant="h5"
                            sx={{ fontWeight: 700, color: '#6d2323' }}
                          >
                            {((editAssignment.total_hours || 0) / 8).toFixed(1)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#666' }}>
                            Total Days
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography
                            variant="h5"
                            sx={{ fontWeight: 700, color: '#ed6c02' }}
                          >
                            {((editAssignment.used_hours || 0) / 8).toFixed(1)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#666' }}>
                            Used Days
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography
                            variant="h5"
                            sx={{
                              fontWeight: 700,
                              color: getStatusColor(
                                editAssignment.remaining_hours,
                                editAssignment.total_hours,
                              ),
                            }}
                          >
                            {(
                              (editAssignment.remaining_hours || 0) / 8
                            ).toFixed(1)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#666' }}>
                            Remaining Days
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </Grid>
                </Grid>

                {/* Action Buttons */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    mt: 4,
                    gap: 2,
                  }}
                >
                  {!isEditing ? (
                    <>
                      <Button
                        onClick={() => handleDelete(editAssignment.id)}
                        variant="outlined"
                        startIcon={<DeleteIcon />}
                        sx={{
                          borderColor: '#d32f2f',
                          color: '#d32f2f',
                          borderRadius: 2,
                          px: 3,
                          '&:hover': {
                            bgcolor: 'rgba(211, 47, 47, 0.08)',
                            borderColor: '#c62828',
                          },
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
                          color: '#FFFFFF',
                          borderRadius: 2,
                          px: 3,
                          boxShadow: '0 4px 12px rgba(109, 35, 35, 0.3)',
                          '&:hover': {
                            bgcolor: '#5a1d1d',
                            boxShadow: '0 6px 16px rgba(109, 35, 35, 0.4)',
                          },
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
                            bgcolor: 'rgba(109, 35, 35, 0.05)',
                          },
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
                          color: '#FFFFFF',
                          borderRadius: 2,
                          px: 3,
                          boxShadow: '0 4px 12px rgba(109, 35, 35, 0.3)',
                          '&:hover': {
                            bgcolor: '#5a1d1d',
                            boxShadow: '0 6px 16px rgba(109, 35, 35, 0.4)',
                          },
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

      {/* History Modal - Shows all periods for a leave type */}
      <Modal
        open={historyModalOpen}
        onClose={handleCloseHistory}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Box
          sx={{
            backgroundColor: '#fff',
            borderRadius: 4,
            width: '90%',
            maxWidth: '800px',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}
        >
          {selectedLeaveHistory && (
            <>
              {/* History Modal Header */}
              <Box
                sx={{
                  background:
                    'linear-gradient(135deg, #6D2323 0%, #8B4545 100%)',
                  color: '#ffffff',
                  p: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: -40,
                    right: -40,
                    width: 160,
                    height: 160,
                    background:
                      'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
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
                  <Avatar
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      width: 64,
                      height: 64,
                    }}
                  >
                    <EventNote sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {selectedLeaveHistory.leaveType.leave_code} - Leave
                      History
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      {selectedLeaveHistory.employee.fullName} (
                      {selectedLeaveHistory.employee.employeeNumber})
                    </Typography>
                    <Chip
                      label={`${selectedLeaveHistory.periods.length} ${selectedLeaveHistory.periods.length === 1 ? 'Period' : 'Periods'}`}
                      size="small"
                      sx={{
                        mt: 1,
                        bgcolor: 'rgba(255,255,255,0.25)',
                        color: '#FFFFFF',
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                </Box>
                <IconButton
                  onClick={handleCloseHistory}
                  sx={{ color: '#fff', position: 'relative', zIndex: 1 }}
                >
                  <Close />
                </IconButton>
              </Box>

              {/* History Content */}
              <Box sx={{ p: 4 }}>
                <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                  <Typography variant="body2">
                    <strong>History Overview:</strong> View all assignment
                    periods for this leave type. Click on any period to edit its
                    details.
                  </Typography>
                </Alert>

                {/* Periods Timeline */}
                <Box>
                  {selectedLeaveHistory.periods.map((period, index) => {
                    const leaveTypeInfo = getLeaveTypeInfo(period.leave_code);
                    const progressPercent = getProgressPercent(
                      period.remaining_hours,
                      period.total_hours,
                    );
                    const statusColor = getStatusColor(
                      period.remaining_hours,
                      period.total_hours,
                    );
                    const isLatest = index === 0; // First item is latest (sorted desc)

                    return (
                      <Box
                        key={period.id}
                        onClick={() => {
                          setEmployeeLeavesModalOpen(true);
                          setSelectedEmployeeLeaves({
                            ...selectedLeaveHistory.employee,
                            leaveTypes: [selectedLeaveHistory.leaveType],
                          });
                          setSelectedLeaveTypeInModal(
                            selectedLeaveHistory.leaveType,
                          );
                          handleCloseHistory();
                          handleOpenModal(period);
                        }}
                        sx={{
                          mb: 2,
                          p: 3,
                          borderRadius: 3,
                          border: isLatest
                            ? '2px solid #6d2323'
                            : '1px solid rgba(109, 35, 35, 0.15)',
                          bgcolor: isLatest
                            ? 'rgba(109, 35, 35, 0.02)'
                            : '#fff',
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                          position: 'relative',
                          '&:hover': {
                            borderColor: '#6d2323',
                            boxShadow: '0 6px 20px rgba(109, 35, 35, 0.15)',
                            transform: 'translateX(4px)',
                          },
                          '&:last-child': { mb: 0 },
                        }}
                      >
                        {/* Latest Badge */}
                        {isLatest && (
                          <Chip
                            label="Latest"
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: 12,
                              right: 12,
                              bgcolor: '#6d2323',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              height: 24,
                            }}
                          />
                        )}

                        {/* Period Header */}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            mb: 2,
                          }}
                        >
                          <Avatar
                            sx={{
                              bgcolor: statusColor,
                              width: 48,
                              height: 48,
                              boxShadow: `0 4px 12px ${statusColor}40`,
                            }}
                          >
                            <TimeIcon sx={{ fontSize: 24 }} />
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 700,
                                color: '#6d2323',
                                mb: 0.5,
                              }}
                            >
                              {period.period_year}
                              {period.period_semester
                                ? ` - ${period.period_semester} Semester`
                                : ' (Annual)'}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666' }}>
                              {leaveTypeInfo.leave_description}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Breakdown Info */}
                        {period.carried_forward_hours > 0 && (
                          <Alert
                            severity="success"
                            sx={{ mb: 2, borderRadius: 2, py: 0.5 }}
                          >
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 600 }}
                            >
                              Carried Balance:{' '}
                              {(period.carried_forward_hours / 8).toFixed(1)}{' '}
                              days from previous period
                            </Typography>
                          </Alert>
                        )}

                        {/* Progress Bar */}
                        <Box sx={{ mb: 2 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              mb: 1,
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 600, color: '#666' }}
                            >
                              Usage Progress
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 700, color: statusColor }}
                            >
                              {progressPercent.toFixed(0)}% Remaining
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={progressPercent}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              bgcolor: 'rgba(0,0,0,0.08)',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 4,
                                bgcolor: statusColor,
                              },
                            }}
                          />
                        </Box>

                        {/* Stats Grid */}
                        <Grid container spacing={2}>
                          <Grid item xs={3}>
                            <Box
                              sx={{
                                textAlign: 'center',
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: 'rgba(109, 35, 35, 0.05)',
                              }}
                            >
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 700,
                                  color: '#6d2323',
                                  mb: 0.5,
                                }}
                              >
                                {((period.total_hours || 0) / 8).toFixed(1)}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: '#888', fontWeight: 600 }}
                              >
                                Total Days
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={3}>
                            <Box
                              sx={{
                                textAlign: 'center',
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: 'rgba(237, 108, 2, 0.05)',
                              }}
                            >
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 700,
                                  color: '#ed6c02',
                                  mb: 0.5,
                                }}
                              >
                                {((period.used_hours || 0) / 8).toFixed(1)}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: '#888', fontWeight: 600 }}
                              >
                                Used Days
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={3}>
                            <Box
                              sx={{
                                textAlign: 'center',
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: `${statusColor}15`,
                              }}
                            >
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 700,
                                  color: statusColor,
                                  mb: 0.5,
                                }}
                              >
                                {((period.remaining_hours || 0) / 8).toFixed(1)}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: '#888', fontWeight: 600 }}
                              >
                                Left
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={3}>
                            <Box
                              sx={{
                                textAlign: 'center',
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: 'rgba(46, 125, 50, 0.05)',
                              }}
                            >
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 700,
                                  color: '#2E7D32',
                                  mb: 0.5,
                                }}
                              >
                                {((period.allocated_hours || 0) / 8).toFixed(1)}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: '#888', fontWeight: 600 }}
                              >
                                Allocated
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>

                        {/* Edit Hint */}
                        <Box
                          sx={{
                            mt: 2,
                            pt: 2,
                            borderTop: '1px solid rgba(109,35,35,0.1)',
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#888',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                            }}
                          >
                            <EditIcon sx={{ fontSize: 14 }} />
                            Click to edit this period
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Modal>
    </Box>
  );
};

export default LeaveAssignment;
