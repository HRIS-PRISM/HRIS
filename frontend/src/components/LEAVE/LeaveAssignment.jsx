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
  alpha,
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
  History as HistoryIcon,
} from '@mui/icons-material';

import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const semOrder = s => {
  if (!s) return 0;
  const l = s.toLowerCase();
  if (l.includes('2nd')) return 2;
  if (l.includes('1st')) return 1;
  return 0;
};

const periodLabel = (year, sem) => {
  if (!year) return 'Unknown period';
  return sem ? `${year} ${sem}` : `${year} Annual`;
};

const getStatusColor = (remaining, total) => {
  if (!total || total === 0) return '#9e9e9e';
  const pct = (remaining / total) * 100;
  if (pct > 50) return '#2e7d32';
  if (pct > 20) return '#ed6c02';
  return '#d32f2f';
};

const getProgressPercent = (remaining, total) => {
  if (!total || total === 0) return 0;
  return Math.max(0, Math.min(100, (remaining / total) * 100));
};

// ─────────────────────────────────────────────
// STYLED HELPERS
// ─────────────────────────────────────────────
const GlassCard = ({ children, sx = {} }) => (
  <Card
    sx={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
      backdropFilter: 'blur(10px)',
      borderRadius: 3,
      border: '1px solid rgba(109, 35, 35, 0.1)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      transition: 'all 0.3s ease',
      overflow: 'visible',
      '&:hover': { boxShadow: '0 12px 40px rgba(109, 35, 35, 0.12)' },
      ...sx,
    }}
  >
    {children}
  </Card>
);

// ─────────────────────────────────────────────
// CARRY FORWARD SUMMARY PANEL
// ─────────────────────────────────────────────
const CarryForwardSummary = ({ leaveCode, employeeAssignments }) => {
  if (!leaveCode || !employeeAssignments?.length) return null;

  const allRows = employeeAssignments.filter(a => a.leave_code === leaveCode);
  if (!allRows.length) return null;

  const sorted = [...allRows].sort((a, b) => {
    const yearDiff = (b.period_year || 0) - (a.period_year || 0);
    if (yearDiff !== 0) return yearDiff;
    return semOrder(b.period_semester) - semOrder(a.period_semester);
  });

  const totalRemainingDays = sorted.reduce((s, r) => s + (r.remaining_hours || 0), 0) / 8;
  const hasBalance = totalRemainingDays > 0;

  return (
    <Box sx={{
      border: '1px solid rgba(109, 35, 35, 0.12)',
      borderRadius: 2,
      overflow: 'hidden',
      bgcolor: '#fafafa',
    }}>

      {/* ── Header ── */}
      <Box sx={{
        px: 2.5, py: 1.5,
        bgcolor: 'rgba(109, 35, 35, 0.05)',
        borderBottom: '1px solid rgba(109, 35, 35, 0.08)',
        display: 'flex', alignItems: 'center', gap: 1.25,
      }}>
        <HistoryIcon sx={{ fontSize: 16, color: '#6d2323' }} />
        <Typography sx={{ fontWeight: 700, color: '#6d2323', fontSize: '0.82rem', letterSpacing: 0.2 }}>
          Leave History — {leaveCode}
        </Typography>
        <Typography sx={{ color: '#999', fontSize: '0.75rem', ml: 0.5 }}>
          ({sorted.length} {sorted.length === 1 ? 'period' : 'periods'} on record)
        </Typography>
      </Box>

      {/* ── Period rows ── */}
      <Box sx={{ px: 2.5, py: 1.75, display: 'flex', flexDirection: 'column', gap: 0 }}>
        {sorted.map((row, idx) => {
          const isLatest  = idx === 0;
          const remDays   = (row.remaining_hours || 0) / 8;
          const usedDays  = (row.used_hours      || 0) / 8;
          const totalDays = (row.total_hours     || 0) / 8;
          const pct       = totalDays > 0 ? Math.min((remDays / totalDays) * 100, 100) : 0;
          const barColor  = getStatusColor(row.remaining_hours, row.total_hours);
          const label     = periodLabel(row.period_year, row.period_semester);

          // Human-readable status phrase
          const statusPhrase = remDays <= 0
            ? 'Fully used'
            : remDays === totalDays
            ? 'Not yet used'
            : `${remDays.toFixed(1)} of ${totalDays.toFixed(1)} days still available`;

          return (
            <Box key={row.id} sx={{ py: 1.5, borderBottom: idx < sorted.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>

              {/* Top row: period name + status badge */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontWeight: 600, color: '#2c2c2c', fontSize: '0.83rem' }}>
                    {label}
                  </Typography>
                  {isLatest && (
                    <Box sx={{
                      px: 1, py: 0.2, borderRadius: 1,
                      bgcolor: 'rgba(109,35,35,0.07)',
                      border: '1px solid rgba(109,35,35,0.15)',
                    }}>
                      <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#6d2323', letterSpacing: 0.3 }}>
                        MOST RECENT
                      </Typography>
                    </Box>
                  )}
                </Box>
                {/* Remaining callout — the most important number */}
                <Typography sx={{
                  fontWeight: 700,
                  color: barColor,
                  fontSize: '0.88rem',
                }}>
                  {remDays <= 0 ? 'No balance left' : `${remDays.toFixed(1)} days left`}
                </Typography>
              </Box>

              {/* Progress bar — visual at a glance */}
              <Box sx={{ position: 'relative', height: 8, bgcolor: 'rgba(0,0,0,0.07)', borderRadius: 4, overflow: 'hidden', mb: 0.75 }}>
                <Box sx={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${pct}%`,
                  bgcolor: barColor,
                  borderRadius: 4,
                  transition: 'width 0.4s ease',
                }} />
              </Box>

              {/* Bottom row: plain sentence + used/total breakdown */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '0.72rem', color: '#888' }}>
                  {statusPhrase}
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: '#aaa' }}>
                  {usedDays.toFixed(1)} used &nbsp;·&nbsp; {totalDays.toFixed(1)} total
                </Typography>
              </Box>

            </Box>
          );
        })}
      </Box>

      {/* ── Footer summary ── */}
      <Box sx={{
        px: 2.5, py: 1.75,
        bgcolor: hasBalance ? 'rgba(46,125,50,0.04)' : 'rgba(0,0,0,0.02)',
        borderTop: `1px solid ${hasBalance ? 'rgba(46,125,50,0.14)' : 'rgba(0,0,0,0.06)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
      }}>
        {/* Left: plain-English explanation */}
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: hasBalance ? '#2E7D32' : '#888', mb: 0.25 }}>
            {hasBalance
              ? 'Unused leave days will be carried over.'
              : 'No unused leave days to carry over.'}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: '#777' }}>
            {hasBalance
              ? 'The "Carried Balance" field below has been filled in automatically.'
              : 'The employee has used all of their allocated leave for previous periods.'}
          </Typography>
        </Box>

        {/* Right: the single number that matters */}
        {hasBalance && (
          <Box sx={{
            flexShrink: 0,
            textAlign: 'center',
            px: 2.5, py: 1,
            bgcolor: 'rgba(46,125,50,0.09)',
            border: '1px solid rgba(46,125,50,0.2)',
            borderRadius: 2,
          }}>
            <Typography sx={{ fontWeight: 800, color: '#2E7D32', fontSize: '1.5rem', lineHeight: 1 }}>
              {totalRemainingDays.toFixed(1)}
            </Typography>
            <Typography sx={{ fontSize: '0.68rem', color: '#4a9d55', fontWeight: 600, mt: 0.25 }}>
              days to carry forward
            </Typography>
          </Box>
        )}
      </Box>

    </Box>
  );
};


// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
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
  const [isCarryForwardAutoSuggested, setIsCarryForwardAutoSuggested] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedLeaveHistory, setSelectedLeaveHistory] = useState(null);
  const [employeeCurrentBalances, setEmployeeCurrentBalances] = useState([]);
  const [employeeLeavesModalOpen, setEmployeeLeavesModalOpen] = useState(false);
  const [selectedEmployeeLeaves, setSelectedEmployeeLeaves] = useState(null);
  const [selectedLeaveTypeInModal, setSelectedLeaveTypeInModal] = useState(null);

  // All assignments for the currently selected employee
  const [employeeAssignments, setEmployeeAssignments] = useState([]);

  useEffect(() => {
    fetchAssignments();
    fetchLeaveTypes();
    fetchEmployees();
  }, []);

  // When employee or leave type changes, compute carry-forward from ALL previous periods
  useEffect(() => {
    if (!selectedEmployee?.employeeNumber || !newAssignment.leave_code) {
      setIsCarryForwardAutoSuggested(false);
      setNewAssignment(prev => ({ ...prev, carried_forward_hours: '0', total_hours: (parseFloat(prev.allocated_hours) || 0).toString() }));
      return;
    }

    // Filter assignments for this employee
    const empAssignments = assignments.filter(
      a => a.employeeNumber?.toString() === selectedEmployee.employeeNumber?.toString()
    );
    setEmployeeAssignments(empAssignments);

    // Get all rows for the chosen leave code
    const leaveRows = empAssignments.filter(a => a.leave_code === newAssignment.leave_code);

    if (!leaveRows.length) {
      setIsCarryForwardAutoSuggested(false);
      setNewAssignment(prev => ({
        ...prev,
        carried_forward_hours: '0',
        total_hours: (parseFloat(prev.allocated_hours) || 0).toString(),
      }));
      return;
    }

    // Sum ALL previous periods' remaining_hours as carry forward
    const totalCarryForwardHours = leaveRows.reduce((sum, r) => sum + (r.remaining_hours || 0), 0);
    const allocated = parseFloat(newAssignment.allocated_hours) || 0;

    setNewAssignment(prev => ({
      ...prev,
      carried_forward_hours: totalCarryForwardHours.toString(),
      total_hours: allocated.toString(),
    }));
    setIsCarryForwardAutoSuggested(totalCarryForwardHours > 0);

  }, [selectedEmployee, newAssignment.leave_code, assignments]);

  // Keep employeeAssignments in sync when employee changes (even without leave code)
  useEffect(() => {
    if (!selectedEmployee?.employeeNumber) {
      setEmployeeAssignments([]);
      return;
    }
    setEmployeeAssignments(
      assignments.filter(a => a.employeeNumber?.toString() === selectedEmployee.employeeNumber?.toString())
    );
  }, [selectedEmployee, assignments]);

  const fetchAssignments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/leaveRoute/leave_assignment`);
      setAssignments(Array.isArray(res.data) ? res.data : []);
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
      setLeaveTypes(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      setLeaveTypes([]);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setEmployees([]); return; }
      const res = await axios.get(`${API_BASE_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
      let usersData = [];
      if (Array.isArray(res.data)) usersData = res.data;
      else if (res.data?.users) usersData = res.data.users;
      else if (res.data?.data) usersData = res.data.data;
      setEmployees(usersData);
    } catch (error) {
      setEmployees([]);
    }
  };

  const isDuplicateAssignment = (employeeNumber, leaveCode, periodYear, periodSemester, excludeId = null) => {
    return assignments.some(a =>
      a.employeeNumber?.toString() === employeeNumber?.toString() &&
      a.leave_code === leaveCode &&
      a.period_year?.toString() === periodYear?.toString() &&
      String(a.period_semester || '') === String(periodSemester || '') &&
      a.id !== excludeId
    );
  };

  const handleAdd = async () => {
    const employeeNumber = selectedEmployee?.employeeNumber?.toString().trim();
    const leaveCode = newAssignment.leave_code;
    const totalHours = newAssignment.total_hours;

    if (!employeeNumber || !leaveCode) { setError('Please select an employee and leave type'); return; }
    if (!totalHours || parseFloat(totalHours) < 0) { setError('Please enter valid leave hours (must be 0 or greater)'); return; }
    if (isDuplicateAssignment(employeeNumber, leaveCode, newAssignment.period_year, newAssignment.period_semester)) {
      setError('This employee already has an assignment for this leave type and period'); return;
    }

    setLoading(true);
    try {
      const payload = {
        leave_code: leaveCode,
        employeeNumber,
        total_hours: parseFloat(totalHours),
        carried_forward_hours: parseFloat(newAssignment.carried_forward_hours) || 0,
        allocated_hours: parseFloat(newAssignment.allocated_hours) || parseFloat(totalHours),
        period_year: parseInt(newAssignment.period_year) || new Date().getFullYear(),
        period_semester: newAssignment.period_semester || null,
      };

      await axios.post(`${API_BASE_URL}/leaveRoute/leave_assignment`, payload);

      setSelectedEmployee(null);
      setNewAssignment({
        leave_code: '', employeeNumber: '', total_hours: '',
        carried_forward_hours: '0', allocated_hours: '',
        period_year: new Date().getFullYear().toString(), period_semester: '',
      });
      setIsCarryForwardAutoSuggested(false);

      await fetchAssignments();
      setTimeout(() => { setLoading(false); setSuccessAction('adding'); setSuccessOpen(true); setTimeout(() => setSuccessOpen(false), 2000); }, 300);
    } catch (error) {
      setError('Error adding assignment: ' + (error.response?.data?.error || error.message));
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    const assignmentId = editAssignment?.id;
    const employeeNumber = editAssignment.employeeNumber?.toString().trim();
    const leaveCode = editAssignment.leave_code;

    if (!assignmentId) { setError('Error: Assignment ID is missing.'); return; }
    if (!employeeNumber || !leaveCode) { setError('Please fill in all required fields'); return; }
    if (isDuplicateAssignment(employeeNumber, leaveCode, editAssignment.period_year, editAssignment.period_semester, editAssignment.id)) {
      setError('This employee already has an assignment for this leave type and period'); return;
    }

    try {
      const payload = {
        leave_code: leaveCode, employeeNumber,
        total_hours: parseFloat(editAssignment.total_hours) || 0,
        remaining_hours: parseFloat(editAssignment.remaining_hours) || 0,
        carried_forward_hours: parseFloat(editAssignment.carried_forward_hours) || 0,
        allocated_hours: parseFloat(editAssignment.allocated_hours) || parseFloat(editAssignment.total_hours) || 0,
        period_year: parseInt(editAssignment.period_year) || new Date().getFullYear(),
        period_semester: editAssignment.period_semester || null,
      };

      await axios.put(`${API_BASE_URL}/leaveRoute/leave_assignment/${assignmentId}`, payload);

      setEditAssignment(null); setOriginalAssignment(null); setIsEditing(false); setError('');
      await fetchAssignments();
      setSuccessAction('edit'); setSuccessOpen(true); setTimeout(() => setSuccessOpen(false), 2000);
    } catch (error) {
      setError('Error updating assignment: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/leaveRoute/leave_assignment/${id}`);
      setEditAssignment(null); setOriginalAssignment(null); setIsEditing(false); setError('');
      setEmployeeLeavesModalOpen(false); setSelectedEmployeeLeaves(null); setSelectedLeaveTypeInModal(null);
      await fetchAssignments();
      setSuccessAction('delete'); setSuccessOpen(true); setTimeout(() => setSuccessOpen(false), 2000);
    } catch (error) {
      setError('Error deleting assignment: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleOpenModal = (assignment) => {
    setEditAssignment({ ...assignment }); setOriginalAssignment({ ...assignment });
    setIsEditing(false); setError('');
  };
  const handleStartEdit = () => { setIsEditing(true); setError(''); };
  const handleCancelEdit = () => { setEditAssignment({ ...originalAssignment }); setIsEditing(false); setError(''); };
  const handleBackToPeriods = () => { setEditAssignment(null); setOriginalAssignment(null); setIsEditing(false); setError(''); };
  const handleCloseModal = () => {
    setEditAssignment(null); setOriginalAssignment(null); setIsEditing(false); setError('');
    setEmployeeLeavesModalOpen(false); setSelectedEmployeeLeaves(null); setSelectedLeaveTypeInModal(null);
  };

  const getLeaveTypeInfo = (leaveCode) => {
    return leaveTypes.find(t => t.leave_code === leaveCode) || { leave_description: leaveCode || 'Unknown', leave_hours: 'N/A' };
  };
  const getEmployeeInfo = (empNum) => {
    return employees.find(e => e.employeeNumber?.toString() === empNum?.toString()) || { fullName: empNum || 'Unknown' };
  };

  const filteredAssignments = assignments.filter(a => {
    const search = searchTerm.toLowerCase();
    return (a.fullName?.toLowerCase() || '').includes(search) ||
      (a.employeeNumber?.toString().toLowerCase() || '').includes(search) ||
      (a.leave_code?.toString().toLowerCase() || '').includes(search);
  });

  const groupedByEmployee = filteredAssignments.reduce((acc, a) => {
    const empNum = a.employeeNumber?.toString() || 'Unknown';
    if (!acc[empNum]) {
      const info = getEmployeeInfo(empNum);
      acc[empNum] = { employeeNumber: empNum, fullName: info.fullName || empNum, firstName: info.firstName, lastName: info.lastName, leaveTypes: {} };
    }
    const lc = a.leave_code;
    if (!acc[empNum].leaveTypes[lc]) acc[empNum].leaveTypes[lc] = { leave_code: lc, periods: [] };
    acc[empNum].leaveTypes[lc].periods.push(a);
    return acc;
  }, {});

  const employeeGroups = Object.values(groupedByEmployee)
    .map(emp => ({ ...emp, leaveTypes: Object.values(emp.leaveTypes) }))
    .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));

  const getLeaveTypeStats = (periods) => periods.reduce(
    (s, p) => ({ totalHours: s.totalHours + (p.total_hours || 0), usedHours: s.usedHours + (p.used_hours || 0), remainingHours: s.remainingHours + (p.remaining_hours || 0) }),
    { totalHours: 0, usedHours: 0, remainingHours: 0 }
  );

  const handleCloseHistory = () => { setHistoryModalOpen(false); setSelectedLeaveHistory(null); };

  // ── Computed values for the currently selected leave code in the add form
  const selectedLeaveAssignments = newAssignment.leave_code
    ? employeeAssignments.filter(a => a.leave_code === newAssignment.leave_code)
    : [];

  return (
    <Box sx={{ py: { xs: 2, md: 4 }, mt: { xs: 0, md: -5 }, width: '100%', maxWidth: '100%', mx: 'auto', px: { xs: 2, sm: 3, md: 4 } }}>
      <LoadingOverlay open={loading} message="Processing leave assignment..." />
      <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />

      {/* Hero Header */}
      <GlassCard sx={{ mb: 4 }}>
        <Box sx={{ p: 5, background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)', color: '#6d2323', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: 'radial-gradient(circle, rgba(109,35,35,0.1) 0%, rgba(109,35,35,0) 70%)' }} />
          <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, background: 'radial-gradient(circle, rgba(109,35,35,0.08) 0%, rgba(109,35,35,0) 70%)' }} />
          <Box display="flex" alignItems="center" position="relative" zIndex={1}>
            <Avatar sx={{ bgcolor: 'rgba(109,35,35,0.15)', mr: 4, width: 64, height: 64, boxShadow: '0 8px 24px rgba(109,35,35,0.15)' }}>
              <EventNote sx={{ color: '#6d2323', fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2, color: '#6d2323' }}>
                Leave Assignment Management
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.8, fontWeight: 400, color: '#8B3333' }}>
                Administrative Panel • Assign leave types and manage employee leave credits
              </Typography>
            </Box>
          </Box>
        </Box>
      </GlassCard>

      {/* Add Assignment Section */}
      <GlassCard sx={{ mb: 4 }}>
        <Box sx={{ p: 4, background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)', color: '#6d2323', display: 'flex', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <EventNote sx={{ fontSize: '1.8rem', mr: 2 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Assign Leave to Employee</Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>Select an employee and assign leave type with designated hours</Typography>
          </Box>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

          <Grid container spacing={3} alignItems="flex-start">
            {/* Employee Select */}
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>Select Employee *</Typography>
              <Autocomplete
                value={selectedEmployee}
                onChange={(e, v) => { setSelectedEmployee(v); setError(''); setNewAssignment(prev => ({ ...prev, leave_code: '', carried_forward_hours: '0', total_hours: '', allocated_hours: '' })); }}
                options={employees}
                getOptionLabel={o => `${o.fullName || `${o.firstName || ''} ${o.lastName || ''}`.trim()} (${o.employeeNumber})`}
                filterOptions={(options, { inputValue }) => {
                  const s = inputValue.toLowerCase().trim();
                  return options.filter(o => (o.fullName || `${o.firstName || ''} ${o.lastName || ''}`).toLowerCase().includes(s) || (o.employeeNumber || '').toString().toLowerCase().includes(s));
                }}
                isOptionEqualToValue={(o, v) => o.employeeNumber === v.employeeNumber}
                noOptionsText="No employees found"
                renderOption={(props, option) => {
                  const { key, ...rest } = props;
                  const name = option.fullName || `${option.firstName || ''} ${option.lastName || ''}`.trim();
                  const initials = `${option.firstName?.[0] || ''}${option.lastName?.[0] || ''}`.toUpperCase() || '?';
                  return (
                    <li key={key} {...rest}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#6d2323', fontSize: '0.8rem' }}>{initials}</Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{name}</Typography>
                          <Typography variant="caption" sx={{ color: '#888' }}>{option.employeeNumber}</Typography>
                        </Box>
                      </Box>
                    </li>
                  );
                }}
                renderInput={params => (
                  <TextField {...params} placeholder="Type employee name or number..." size="medium"
                    InputProps={{ ...params.InputProps, startAdornment: (<><InputAdornment position="start"><PersonIcon sx={{ color: '#6d2323' }} /></InputAdornment>{params.InputProps.startAdornment}</>) }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, '& fieldset': { borderColor: 'rgba(109,35,35,0.2)' }, '&:hover fieldset': { borderColor: '#6d2323' }, '&.Mui-focused fieldset': { borderColor: '#6d2323', borderWidth: 2 } } }}
                  />
                )}
                sx={{ width: '100%' }}
              />
            </Grid>

            {/* Leave Type Select */}
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>Leave Type *</Typography>
              <FormControl fullWidth>
                <Select
                  value={newAssignment.leave_code || ''}
                  onChange={e => { setNewAssignment(prev => ({ ...prev, leave_code: e.target.value })); setError(''); }}
                  displayEmpty size="medium"
                  startAdornment={<InputAdornment position="start" sx={{ ml: 1 }}><WorkIcon sx={{ color: '#6d2323' }} /></InputAdornment>}
                  sx={{ borderRadius: 2, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(109,35,35,0.2)' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6d2323' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6d2323', borderWidth: 2 } }}
                >
                  <MenuItem value=""><em>Choose a leave type...</em></MenuItem>
                  {leaveTypes.map(type => (
                    <MenuItem key={type.id || type.leave_code} value={type.leave_code}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{type.leave_code} - {type.leave_description}</Typography>
                        <Chip label={`${(type.leave_hours || 0) / 8} days`} size="small" sx={{ bgcolor: 'rgba(109,35,35,0.1)', color: '#6d2323', fontWeight: 600, ml: 1 }} />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* ── CARRY FORWARD SUMMARY (full width) ── */}
            {selectedEmployee && newAssignment.leave_code && (
              <Grid item xs={12}>
                {selectedLeaveAssignments.length > 0 ? (
                  <CarryForwardSummary
                    leaveCode={newAssignment.leave_code}
                    employeeAssignments={employeeAssignments}
                    currentPeriodYear={newAssignment.period_year}
                    currentPeriodSemester={newAssignment.period_semester}
                  />
                ) : (
                  <Alert severity="info" icon={<EventNote />} sx={{ borderRadius: 2, backgroundColor: 'rgba(109,35,35,0.04)', border: '1px solid rgba(109,35,35,0.12)' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#6d2323' }}>No previous assignments found</Typography>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      This is the first time <strong>{newAssignment.leave_code}</strong> is being assigned to this employee. No carry-forward balance.
                    </Typography>
                  </Alert>
                )}
              </Grid>
            )}

            {/* ── CARRIED BALANCE HOURS ── */}
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323', display: 'flex', alignItems: 'center', gap: 1 }}>
                Carried Balance Hours
                {isCarryForwardAutoSuggested && (
                  <Chip label="Auto" size="small" icon={<CheckCircleIcon />} sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'rgba(46,125,50,0.1)', color: '#2E7D32', '& .MuiChip-icon': { fontSize: 14, color: '#2E7D32' } }} />
                )}
              </Typography>
              <TextField
                type="number"
                value={newAssignment.carried_forward_hours}
                onChange={e => {
                  const cf = parseFloat(e.target.value) || 0;
                  const al = parseFloat(newAssignment.allocated_hours) || 0;
                  setNewAssignment(prev => ({ ...prev, carried_forward_hours: e.target.value, total_hours: (cf + al).toString() }));
                  setIsCarryForwardAutoSuggested(false);
                  setError('');
                }}
                placeholder="Previous balance..."
                fullWidth size="medium"
                inputProps={{ min: 0, step: 8 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><TimeIcon sx={{ color: '#2E7D32' }} /></InputAdornment>,
                  endAdornment: <InputAdornment position="end"><Typography variant="caption" sx={{ color: '#888' }}>{((parseFloat(newAssignment.carried_forward_hours) || 0) / 8).toFixed(1)} days</Typography></InputAdornment>,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '& fieldset': { borderColor: isCarryForwardAutoSuggested ? 'rgba(46,125,50,0.5)' : 'rgba(46,125,50,0.3)', borderWidth: isCarryForwardAutoSuggested ? 2 : 1 },
                    '&:hover fieldset': { borderColor: '#2E7D32' },
                    '&.Mui-focused fieldset': { borderColor: '#2E7D32', borderWidth: 2 },
                    backgroundColor: isCarryForwardAutoSuggested ? 'rgba(46,125,50,0.03)' : 'transparent',
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: isCarryForwardAutoSuggested ? '#2E7D32' : '#666', mt: 0.5, display: 'block', fontWeight: isCarryForwardAutoSuggested ? 600 : 500 }}>
                {isCarryForwardAutoSuggested
                  ? `✓ Auto-filled from ${selectedLeaveAssignments.length} previous period${selectedLeaveAssignments.length !== 1 ? 's' : ''}`
                  : 'Manually set (auto-fill overridden)'}
              </Typography>
            </Grid>

            {/* NEW ALLOCATION HOURS */}
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>New Allocation Hours</Typography>
              <TextField
                type="number"
                value={newAssignment.allocated_hours}
                onChange={e => {
                  const al = parseFloat(e.target.value) || 0;
                  setNewAssignment(prev => ({ ...prev, allocated_hours: e.target.value, total_hours: al.toString() }));
                  setError('');
                }}
                placeholder="New hours for this period..."
                fullWidth size="medium"
                inputProps={{ min: 0, step: 8 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><TimeIcon sx={{ color: '#1976d2' }} /></InputAdornment>,
                  endAdornment: <InputAdornment position="end"><Typography variant="caption" sx={{ color: '#888' }}>{((parseFloat(newAssignment.allocated_hours) || 0) / 8).toFixed(1)} days</Typography></InputAdornment>,
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, '& fieldset': { borderColor: 'rgba(25,118,210,0.3)' }, '&:hover fieldset': { borderColor: '#1976d2' }, '&.Mui-focused fieldset': { borderColor: '#1976d2', borderWidth: 2 } } }}
              />
              <Typography variant="caption" sx={{ color: '#1976d2', mt: 0.5, display: 'block', fontWeight: 500 }}>Fresh allocation for current period</Typography>
            </Grid>

            {/* PERIOD YEAR */}
            <Grid item xs={12} md={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>Period Year</Typography>
              <TextField
                type="number" value={newAssignment.period_year}
                onChange={e => setNewAssignment(prev => ({ ...prev, period_year: e.target.value }))}
                placeholder="Year..." fullWidth size="medium"
                inputProps={{ min: 2020, max: 2030 }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, '& fieldset': { borderColor: 'rgba(109,35,35,0.2)' }, '&:hover fieldset': { borderColor: '#6d2323' }, '&.Mui-focused fieldset': { borderColor: '#6d2323', borderWidth: 2 } } }}
              />
              <Typography variant="caption" sx={{ color: '#888', mt: 0.5, display: 'block' }}>e.g., 2024, 2025</Typography>
            </Grid>

            {/* SEMESTER */}
            <Grid item xs={12} md={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>Semester (Optional)</Typography>
              <FormControl fullWidth>
                <Select
                  value={newAssignment.period_semester || ''} displayEmpty size="medium"
                  onChange={e => setNewAssignment(prev => ({ ...prev, period_semester: e.target.value }))}
                  sx={{ borderRadius: 2, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(109,35,35,0.2)' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6d2323' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6d2323', borderWidth: 2 } }}
                >
                  <MenuItem value=""><em>Annual</em></MenuItem>
                  <MenuItem value="1st semester">1st Semester</MenuItem>
                  <MenuItem value="2nd semester">2nd Semester</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" sx={{ color: '#888', mt: 0.5, display: 'block' }}>Leave blank for annual</Typography>
            </Grid>

            {/* TOTAL HOURS (read-only) */}
            <Grid item xs={12} md={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>Total Hours *</Typography>
              <TextField
                type="number" value={newAssignment.total_hours} fullWidth size="medium"
                InputProps={{
                  readOnly: true,
                  startAdornment: <InputAdornment position="start"><TimeIcon sx={{ color: '#6d2323' }} /></InputAdornment>,
                  endAdornment: <InputAdornment position="end"><Chip label={`${(parseFloat(newAssignment.total_hours) || 0) / 8} days`} size="small" sx={{ bgcolor: 'rgba(109,35,35,0.1)', color: '#6d2323', fontWeight: 700, fontSize: '0.7rem' }} /></InputAdornment>,
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#f5f5f5', '& fieldset': { borderColor: 'rgba(109,35,35,0.2)' } }, '& .MuiInputBase-input': { fontWeight: 700, color: '#6d2323', fontSize: '1.1rem' } }}
              />
              <Typography variant="caption" sx={{ color: '#6d2323', mt: 0.5, display: 'block', fontWeight: 600 }}>Current period allocation only</Typography>
            </Grid>

            {/* ASSIGN BUTTON */}
            <Grid item xs={12} md={2}>
              <Button
                onClick={handleAdd} variant="contained" fullWidth size="large" startIcon={<AddIcon />}
                disabled={loading || !selectedEmployee || !newAssignment.leave_code || !newAssignment.total_hours}
                sx={{
                  mt: 3, height: 50, borderRadius: 2, fontWeight: 600,
                  backgroundColor: (!selectedEmployee || !newAssignment.leave_code || !newAssignment.total_hours) ? '#cccccc' : '#6D2323',
                  color: (!selectedEmployee || !newAssignment.leave_code || !newAssignment.total_hours) ? '#666' : '#FFF',
                  boxShadow: (!selectedEmployee || !newAssignment.leave_code || !newAssignment.total_hours) ? 'none' : '0 4px 12px rgba(109,35,35,0.3)',
                  '&:hover': { backgroundColor: (!selectedEmployee || !newAssignment.leave_code || !newAssignment.total_hours) ? '#cccccc' : '#5a1d1d' },
                  '&:disabled': { backgroundColor: '#cccccc !important', color: '#666 !important', boxShadow: 'none !important' },
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
        <Box sx={{ p: 4, background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)', color: '#6d2323', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(109,35,35,0.15)', width: 56, height: 56, boxShadow: '0 4px 12px rgba(109,35,35,0.15)' }}>
              <ReorderIcon sx={{ fontSize: 28, color: '#6d2323' }} />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#6d2323' }}>Leave Assignment Records</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, color: '#8B3333' }}>
                {employeeGroups.length} {employeeGroups.length === 1 ? 'employee' : 'employees'} • {filteredAssignments.length} {filteredAssignments.length === 1 ? 'assignment' : 'assignments'}
              </Typography>
            </Box>
          </Box>
          <TextField
            size="small" variant="outlined" placeholder="Search by name or employee number..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            sx={{ minWidth: 300, '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff', '& fieldset': { borderColor: 'rgba(109,35,35,0.2)' }, '&:hover fieldset': { borderColor: '#6d2323' }, '&.Mui-focused fieldset': { borderColor: '#6d2323' } } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#6d2323' }} /></InputAdornment> }}
          />
        </Box>

        <CardContent sx={{ p: 4, overflow: 'visible' }}>
          {filteredAssignments.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <Box sx={{ width: 120, height: 120, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
                <EventNote sx={{ fontSize: 56, color: 'rgba(109,35,35,0.3)' }} />
              </Box>
              <Typography variant="h6" sx={{ color: '#6D2323', fontWeight: 700, mb: 1 }}>{assignments.length === 0 ? 'No Leave Assignments Found' : 'No Matching Records'}</Typography>
              <Typography variant="body2" sx={{ color: '#888', maxWidth: 400, mx: 'auto' }}>
                {assignments.length === 0 ? 'Get started by assigning leave types to employees using the form above.' : "Try adjusting your search criteria."}
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {employeeGroups.map(employeeGroup => {
                const allPeriods = employeeGroup.leaveTypes.flatMap(lt => lt.periods);
                const totalHours = allPeriods.reduce((s, p) => s + (p.total_hours || 0), 0);
                const usedHours = allPeriods.reduce((s, p) => s + (p.used_hours || 0), 0);
                const remainingHours = allPeriods.reduce((s, p) => s + (p.remaining_hours || 0), 0);
                const overallColor = getStatusColor(remainingHours, totalHours);

                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={employeeGroup.employeeNumber}>
                    <Box
                      onClick={() => { setSelectedEmployeeLeaves(employeeGroup); setSelectedLeaveTypeInModal(null); setEmployeeLeavesModalOpen(true); }}
                      sx={{ border: '1px solid rgba(109,35,35,0.15)', borderRadius: 3, p: 2.5, transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', background: 'linear-gradient(135deg, #FFFFFF 0%, #FEFEFE 100%)', minHeight: 220, display: 'flex', flexDirection: 'column', cursor: 'pointer', '&:hover': { boxShadow: '0 12px 32px rgba(109,35,35,0.18)', borderColor: '#6d2323', transform: 'translateY(-4px)' } }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Avatar sx={{ bgcolor: '#6d2323', width: 48, height: 48, boxShadow: '0 4px 12px rgba(109,35,35,0.25)' }}>
                          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#FFFFFF' }}>{employeeGroup.firstName?.[0] || 'U'}{employeeGroup.lastName?.[0] || 'U'}</Typography>
                        </Avatar>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#6d2323', fontSize: '0.95rem', lineHeight: 1.3, mb: 0.3 }}>{employeeGroup.fullName}</Typography>
                          <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, fontSize: '0.75rem' }}>#{employeeGroup.employeeNumber}</Typography>
                        </Box>
                      </Box>
                      <Divider sx={{ mb: 2, borderColor: 'rgba(109,35,35,0.1)' }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 2, py: 1.5, bgcolor: 'rgba(109,35,35,0.02)', borderRadius: 2 }}>
                        {[['Total', (totalHours / 8).toFixed(1), '#6d2323'], ['Used', (usedHours / 8).toFixed(1), '#ed6c02'], ['Left', (remainingHours / 8).toFixed(1), overallColor]].map(([label, val, color]) => (
                          <Box key={label} sx={{ textAlign: 'center' }}>
                            <Typography variant="body1" sx={{ fontWeight: 700, color, fontSize: '1.1rem' }}>{val}</Typography>
                            <Typography variant="caption" sx={{ color: '#888', fontSize: '0.65rem' }}>{label}</Typography>
                          </Box>
                        ))}
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem' }}>📋 Leave Credits</Typography>
                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                          {employeeGroup.leaveTypes.map(lt => {
                            const stats = getLeaveTypeStats(lt.periods);
                            const sc = getStatusColor(stats.remainingHours, stats.totalHours);
                            return (
                              <Chip key={lt.leave_code} label={`${lt.leave_code}: ${(stats.remainingHours / 8).toFixed(1)}d`} size="small"
                                sx={{ bgcolor: `${sc}15`, color: sc, border: `1px solid ${sc}50`, fontWeight: 700, height: 26, fontSize: '0.75rem', '&:hover': { bgcolor: sc, color: '#fff' } }}
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

      {/* Employee Leaves Modal */}
      <Modal open={employeeLeavesModalOpen} onClose={() => { setEmployeeLeavesModalOpen(false); setSelectedEmployeeLeaves(null); setSelectedLeaveTypeInModal(null); }} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Box sx={{ backgroundColor: '#fff', borderRadius: 4, width: '90%', maxWidth: '700px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
          {selectedEmployeeLeaves && !selectedLeaveTypeInModal && (
            <>
              <Box sx={{ background: 'linear-gradient(135deg, #6D2323 0%, #8B4545 100%)', color: '#fff', p: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)' }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, position: 'relative', zIndex: 1 }}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 64, height: 64 }}><PersonIcon sx={{ fontSize: 32 }} /></Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>{selectedEmployeeLeaves.fullName}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Employee ID: {selectedEmployeeLeaves.employeeNumber}</Typography>
                    <Chip label={`${selectedEmployeeLeaves.leaveTypes.length} Leave Type${selectedEmployeeLeaves.leaveTypes.length !== 1 ? 's' : ''}`} size="small" sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.25)', color: '#fff', fontWeight: 600 }} />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, position: 'relative', zIndex: 1 }}>
                  <Button onClick={() => { setEmployeeLeavesModalOpen(false); setSelectedEmployeeLeaves(null); }} variant="outlined" size="small" startIcon={<ChevronLeftIcon />} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'none', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)', borderColor: '#fff' } }}>Back</Button>
                  <IconButton onClick={() => { setEmployeeLeavesModalOpen(false); setSelectedEmployeeLeaves(null); }} sx={{ color: '#fff' }}><Close /></IconButton>
                </Box>
              </Box>
              <Box sx={{ p: 4 }}>
                <Grid container spacing={2}>
                  {selectedEmployeeLeaves.leaveTypes.map(lt => {
                    const stats = getLeaveTypeStats(lt.periods);
                    const sc = getStatusColor(stats.remainingHours, stats.totalHours);
                    return (
                      <Grid item xs={12} sm={6} key={lt.leave_code}>
                        <Box onClick={() => setSelectedLeaveTypeInModal(lt)} sx={{ p: 2.5, borderRadius: 2.5, border: `1.5px solid ${sc}40`, bgcolor: 'rgba(109,35,35,0.02)', cursor: 'pointer', transition: 'all 0.3s', '&:hover': { borderColor: sc, bgcolor: `${sc}10`, transform: 'translateY(-2px)', boxShadow: `0 4px 16px ${sc}30` } }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1.5 }}>
                            <Avatar sx={{ bgcolor: sc, width: 48, height: 48, boxShadow: `0 4px 12px ${sc}40` }}><Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>{lt.leave_code}</Typography></Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography sx={{ fontWeight: 700, color: '#6d2323', mb: 0.5 }}>{lt.leave_code}</Typography>
                              <Typography variant="caption" sx={{ color: '#888' }}>{lt.periods.length} period{lt.periods.length !== 1 ? 's' : ''}</Typography>
                            </Box>
                          </Box>
                          <Divider sx={{ my: 1.5, borderColor: 'rgba(109,35,35,0.1)' }} />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                              <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 0.5 }}>Days Remaining</Typography>
                              <Typography sx={{ fontWeight: 700, color: sc, fontSize: '1.3rem' }}>{(stats.remainingHours / 8).toFixed(1)}</Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 0.5 }}>Total / Used</Typography>
                              <Typography variant="caption" sx={{ fontWeight: 600, color: '#666', display: 'block' }}>{(stats.totalHours / 8).toFixed(1)} / {(stats.usedHours / 8).toFixed(1)}</Typography>
                            </Box>
                          </Box>
                          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(109,35,35,0.1)' }}>
                            <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}><ChevronRightIcon sx={{ fontSize: 14 }} />Click to view all periods</Typography>
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
              <Box sx={{ background: 'linear-gradient(135deg, #6D2323 0%, #8B4545 100%)', color: '#fff', p: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)' }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, position: 'relative', zIndex: 1 }}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}><EventNote sx={{ fontSize: 28 }} /></Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>{selectedLeaveTypeInModal.leave_code} - Periods</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>{selectedEmployeeLeaves.fullName}</Typography>
                  </Box>
                </Box>
                <Button onClick={() => setSelectedLeaveTypeInModal(null)} variant="outlined" size="small" startIcon={<ChevronLeftIcon />} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'none', position: 'relative', zIndex: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)', borderColor: '#fff' } }}>Back to Leave Types</Button>
              </Box>
              <Box sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[...selectedLeaveTypeInModal.periods].sort((a, b) => {
                    if (b.period_year !== a.period_year) return b.period_year - a.period_year;
                    return semOrder(b.period_semester) - semOrder(a.period_semester);
                  }).map((period, index) => {
                    const sc = getStatusColor(period.remaining_hours, period.total_hours);
                    const isLatest = index === 0;
                    return (
                      <Box key={period.id} onClick={() => handleOpenModal(period)} sx={{ p: 2.5, borderRadius: 2, border: isLatest ? '2px solid #6d2323' : '1px solid rgba(109,35,35,0.15)', bgcolor: isLatest ? 'rgba(109,35,35,0.03)' : '#fff', cursor: 'pointer', transition: 'all 0.3s', position: 'relative', '&:hover': { borderColor: '#6d2323', boxShadow: '0 6px 20px rgba(109,35,35,0.15)', transform: 'translateX(4px)' } }}>
                        {isLatest && <Chip label="Latest" size="small" sx={{ position: 'absolute', top: 12, right: 12, bgcolor: '#6d2323', color: '#fff', fontWeight: 700, fontSize: '0.7rem', height: 24 }} />}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                          <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: `${sc}20` }}>
                            <Typography sx={{ fontWeight: 700, color: sc, fontSize: '0.9rem' }}>{period.period_year}{period.period_semester ? ` ${period.period_semester}` : ''}</Typography>
                          </Box>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography sx={{ fontWeight: 600, color: '#6d2323', mb: 0.3 }}>{period.period_year}{period.period_semester ? ` ${period.period_semester}` : ' Annual'}</Typography>
                            {period.carried_forward_hours > 0 && <Chip size="small" label={`↻ Carried: ${(period.carried_forward_hours / 8).toFixed(1)}d`} sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'rgba(46,125,50,0.15)', color: '#2E7D32', fontWeight: 600 }} />}
                          </Box>
                        </Box>
                        <Grid container spacing={1}>
                          {[['Allocated', (period.allocated_hours || 0) / 8, '#6d2323', 'rgba(109,35,35,0.05)'], ['Used', (period.used_hours || 0) / 8, '#ed6c02', 'rgba(237,108,2,0.05)'], ['Left', (period.remaining_hours || 0) / 8, sc, `${sc}15`], ['Total', (period.total_hours || 0) / 8, '#2E7D32', 'rgba(46,125,50,0.05)']].map(([label, val, color, bg]) => (
                            <Grid item xs={3} key={label}>
                              <Box sx={{ textAlign: 'center', p: 1, borderRadius: 1, bgcolor: bg }}>
                                <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 0.3, fontSize: '0.6rem' }}>{label}</Typography>
                                <Typography sx={{ fontWeight: 700, color, fontSize: '0.9rem' }}>{val.toFixed(1)}d</Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(109,35,35,0.1)' }}>
                          <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}><EditIcon sx={{ fontSize: 14 }} />Click to edit</Typography>
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
      <Modal open={!!editAssignment} onClose={handleCloseModal} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ backgroundColor: '#fff', borderRadius: 4, width: '90%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
          {editAssignment && (
            <>
              <Box sx={{ background: 'linear-gradient(135deg, #6D2323 0%, #8B4545 100%)', color: '#fff', p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}><EditIcon sx={{ fontSize: 24 }} /></Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{isEditing ? 'Edit Leave Assignment' : 'Assignment Details'}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>{editAssignment.fullName || editAssignment.employeeNumber}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconButton onClick={handleBackToPeriods} sx={{ color: '#fff' }} title="Back to Periods"><ChevronLeftIcon /></IconButton>
                  <IconButton onClick={handleCloseModal} sx={{ color: '#fff' }}><Close /></IconButton>
                </Box>
              </Box>
              <Box sx={{ p: 3 }}>
                {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>Employee Number</Typography>
                    <TextField value={editAssignment.employeeNumber || ''} onChange={e => setEditAssignment({ ...editAssignment, employeeNumber: e.target.value })} fullWidth size="medium" variant={isEditing ? 'outlined' : 'standard'} InputProps={{ readOnly: !isEditing, disableUnderline: !isEditing }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 }, '& .MuiInputBase-input': { color: '#000' } }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>Leave Type</Typography>
                    {isEditing ? (
                      <FormControl fullWidth><Select value={editAssignment.leave_code || ''} onChange={e => setEditAssignment({ ...editAssignment, leave_code: e.target.value })} displayEmpty sx={{ borderRadius: 2 }}>
                        <MenuItem value=""><em>Select Leave Type</em></MenuItem>
                        {leaveTypes.map(t => <MenuItem key={t.id || t.leave_code} value={t.leave_code}>{t.leave_code} - {t.leave_description}</MenuItem>)}
                      </Select></FormControl>
                    ) : (
                      <TextField value={`${editAssignment.leave_code || ''} - ${getLeaveTypeInfo(editAssignment.leave_code).leave_description}`} fullWidth size="medium" variant="standard" InputProps={{ readOnly: true, disableUnderline: true }} sx={{ '& .MuiInputBase-input': { color: '#000' } }} />
                    )}
                  </Grid>
                  {[['Total Hours', 'total_hours', false], ['Used Hours', 'used_hours', false]].map(([label, field, editable]) => (
                    <Grid item xs={12} sm={4} key={field}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>{label}</Typography>
                      <TextField type="number" value={editAssignment[field] || 0} fullWidth variant="standard" InputProps={{ readOnly: true, disableUnderline: true, endAdornment: <InputAdornment position="end">hrs</InputAdornment> }} sx={{ '& .MuiInputBase-input': { color: '#000' } }} />
                    </Grid>
                  ))}
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>Remaining Hours</Typography>
                    <TextField type="number" value={editAssignment.remaining_hours || ''} onChange={e => setEditAssignment({ ...editAssignment, remaining_hours: parseFloat(e.target.value) || 0 })} fullWidth size="medium" variant={isEditing ? 'outlined' : 'standard'} inputProps={{ min: 0, step: 1 }} InputProps={{ readOnly: !isEditing, disableUnderline: !isEditing, endAdornment: <InputAdornment position="end">hrs</InputAdornment> }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 }, '& .MuiInputBase-input': { color: '#000' } }} />
                  </Grid>
                  <Grid item xs={12}><Divider sx={{ my: 1 }}><Chip label="Carried Balance & Allocation" size="small" sx={{ bgcolor: 'rgba(109,35,35,0.1)', color: '#6d2323', fontWeight: 600 }} /></Divider></Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#2E7D32' }}>Carried Balance Hours</Typography>
                    <TextField type="number" value={editAssignment.carried_forward_hours || 0} onChange={e => { const cf = parseFloat(e.target.value) || 0; const al = parseFloat(editAssignment.allocated_hours) || 0; setEditAssignment({ ...editAssignment, carried_forward_hours: cf, total_hours: cf + al }); }} fullWidth size="medium" variant={isEditing ? 'outlined' : 'standard'} inputProps={{ min: 0, step: 8 }} InputProps={{ readOnly: !isEditing, disableUnderline: !isEditing, endAdornment: <InputAdornment position="end">{((editAssignment.carried_forward_hours || 0) / 8).toFixed(1)} days</InputAdornment> }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 }, '& .MuiInputBase-input': { color: '#2E7D32', fontWeight: 600 } }} />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1976d2' }}>Allocated Hours</Typography>
                    <TextField type="number" value={editAssignment.allocated_hours || 0} onChange={e => { const al = parseFloat(e.target.value) || 0; setEditAssignment({ ...editAssignment, allocated_hours: al, total_hours: al }); }} fullWidth size="medium" variant={isEditing ? 'outlined' : 'standard'} inputProps={{ min: 0, step: 8 }} InputProps={{ readOnly: !isEditing, disableUnderline: !isEditing, endAdornment: <InputAdornment position="end">{((editAssignment.allocated_hours || 0) / 8).toFixed(1)} days</InputAdornment> }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 }, '& .MuiInputBase-input': { color: '#1976d2', fontWeight: 600 } }} />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>Period Year</Typography>
                    <TextField type="number" value={editAssignment.period_year || 2026} onChange={e => setEditAssignment({ ...editAssignment, period_year: parseInt(e.target.value) })} fullWidth size="medium" variant={isEditing ? 'outlined' : 'standard'} inputProps={{ min: 2020, max: 2035 }} InputProps={{ readOnly: !isEditing, disableUnderline: !isEditing }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 }, '& .MuiInputBase-input': { color: '#000' } }} />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>Period Semester</Typography>
                    {isEditing ? (
                      <FormControl fullWidth><Select value={editAssignment.period_semester || ''} onChange={e => setEditAssignment({ ...editAssignment, period_semester: e.target.value })} displayEmpty sx={{ borderRadius: 2 }}>
                        <MenuItem value=""><em>Annual</em></MenuItem>
                        <MenuItem value="1st semester">1st Semester</MenuItem>
                        <MenuItem value="2nd semester">2nd Semester</MenuItem>
                      </Select></FormControl>
                    ) : (
                      <TextField value={editAssignment.period_semester || 'Annual'} fullWidth size="medium" variant="standard" InputProps={{ readOnly: true, disableUnderline: true }} sx={{ '& .MuiInputBase-input': { color: '#000' } }} />
                    )}
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(109,35,35,0.05)', border: '1px solid rgba(109,35,35,0.1)' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#6d2323' }}>Days Summary (8 hours = 1 day)</Typography>
                      <Grid container spacing={2}>
                        {[['Total Days', 'total_hours', '#6d2323'], ['Used Days', 'used_hours', '#ed6c02'], ['Remaining Days', 'remaining_hours', getStatusColor(editAssignment.remaining_hours, editAssignment.total_hours)]].map(([label, field, color]) => (
                          <Grid item xs={4} key={field}>
                            <Typography variant="h5" sx={{ fontWeight: 700, color }}>{((editAssignment[field] || 0) / 8).toFixed(1)}</Typography>
                            <Typography variant="caption" sx={{ color: '#666' }}>{label}</Typography>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, gap: 2 }}>
                  {!isEditing ? (
                    <>
                      <Button onClick={() => handleDelete(editAssignment.id)} variant="outlined" startIcon={<DeleteIcon />} sx={{ borderColor: '#d32f2f', color: '#d32f2f', borderRadius: 2, px: 3, '&:hover': { bgcolor: 'rgba(211,47,47,0.08)', borderColor: '#c62828' } }}>Delete</Button>
                      <Button onClick={handleStartEdit} variant="contained" startIcon={<EditIcon />} sx={{ bgcolor: '#6D2323', color: '#FFF', borderRadius: 2, px: 3, boxShadow: '0 4px 12px rgba(109,35,35,0.3)', '&:hover': { bgcolor: '#5a1d1d' } }}>Edit</Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={handleCancelEdit} variant="outlined" startIcon={<CancelIcon />} sx={{ color: '#6d2323', borderColor: '#6d2323', borderRadius: 2, px: 3 }}>Cancel</Button>
                      <Button onClick={handleUpdate} variant="contained" startIcon={<SaveIcon />} sx={{ bgcolor: '#6D2323', color: '#FFF', borderRadius: 2, px: 3, boxShadow: '0 4px 12px rgba(109,35,35,0.3)', '&:hover': { bgcolor: '#5a1d1d' } }}>Save Changes</Button>
                    </>
                  )}
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