import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  Alert,
  InputAdornment,
  Card,
  CardContent,
  Avatar,
  Divider,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  History as HistoryIcon,
  CalendarToday as CalendarIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
  MonetizationOn as CommutationIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';

import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const semOrder = (s) => {
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

const daysToHours = (days) => (parseFloat(days) || 0) * 8;
const hoursToDays = (hours) => ((hours || 0) / 8).toString();

const parseHoursToComponents = (hoursLike, hoursPerDay = 8) => {
  const hours = Math.max(0, toNum(hoursLike));
  const totalSeconds = Math.round(hours * 3600);
  const daySeconds = hoursPerDay * 3600;
  const days = Math.floor(totalSeconds / daySeconds);
  let rem = totalSeconds % daySeconds;
  const h = Math.floor(rem / 3600);
  rem %= 3600;
  const m = Math.floor(rem / 60);
  const s = rem % 60;
  return { days, h, m, s };
};

// ─────────────────────────────────────────────
// REMAINING BALANCE DISPLAY COMPONENT
// ─────────────────────────────────────────────
const RemainingBalance = ({ hoursLike, color, alignItems = 'flex-end', largeDays = false }) => {
  const { days, h, m, s } = parseHoursToComponents(hoursLike);
  const dayLabel = days === 1 ? 'day' : 'days';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems }}>
      <Typography sx={{ fontWeight: 800, color: color || 'inherit', fontSize: largeDays ? '1.4rem' : '0.95rem', lineHeight: 1.2 }}>
        {days} {dayLabel}
      </Typography>
      <Typography sx={{ fontWeight: 500, color: color || 'inherit', fontSize: '0.70rem', opacity: 0.75, lineHeight: 1.3 }}>
        &amp; {h}h, {m}m, {s}s
      </Typography>
    </Box>
  );
};

// ─────────────────────────────────────────────
// STYLED HELPERS
// ─────────────────────────────────────────────
const GlassCard = ({ children, sx = {} }) => (
  <Card sx={{
    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
    backdropFilter: 'blur(10px)', borderRadius: 3, border: '1px solid rgba(109, 35, 35, 0.1)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)', transition: 'all 0.3s ease', overflow: 'visible',
    '&:hover': { boxShadow: '0 12px 40px rgba(109, 35, 35, 0.12)' }, ...sx,
  }}>
    {children}
  </Card>
);

// ─────────────────────────────────────────────
// DAYS INPUT FIELD
// ─────────────────────────────────────────────
const DaysInputField = ({
  label, value, onChange, color = '#6d2323', bgColor = 'transparent',
  borderColor, helperText, isAutoFilled = false, disabled = false, readOnly = false,
}) => {
  const hours = daysToHours(value);
  const bc = borderColor || (isAutoFilled ? 'rgba(46,125,50,0.5)' : `${color}30`);
  return (
    <Box>
      <TextField
        type="number" value={value} onChange={(e) => onChange(e.target.value)}
        label={label} fullWidth size="medium" disabled={disabled}
        InputProps={{
          readOnly,
          startAdornment: <InputAdornment position="start"><CalendarIcon sx={{ color, fontSize: 20 }} /></InputAdornment>,
          endAdornment: <InputAdornment position="end"><Typography variant="caption" sx={{ color: '#888', fontWeight: 600, whiteSpace: 'nowrap' }}>= {hours} hrs</Typography></InputAdornment>,
        }}
        inputProps={{ min: 0, step: 0.5 }}
        variant={readOnly ? 'standard' : 'outlined'}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2, backgroundColor: isAutoFilled ? 'rgba(46,125,50,0.03)' : bgColor,
            '& fieldset': { borderColor: bc, borderWidth: isAutoFilled ? 2 : 1 },
            '&:hover fieldset': { borderColor: color },
            '&.Mui-focused fieldset': { borderColor: color, borderWidth: 2 },
          },
          '& .MuiInputBase-input': { color, fontWeight: 600 },
          '& .MuiInputLabel-root': { color },
          '& .MuiInputLabel-root.Mui-focused': { color },
          ...(readOnly && { '& .MuiInputBase-input': { color: '#333', fontWeight: 600 } }),
        }}
      />
      {helperText && (
        <Typography variant="caption" sx={{ color: isAutoFilled ? '#2E7D32' : '#888', mt: 0.5, display: 'block', fontWeight: isAutoFilled ? 600 : 400 }}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────
// CARRY FORWARD SUMMARY PANEL
// (Now reads from commutation records too)
// ─────────────────────────────────────────────
const CarryForwardSummary = ({ leaveCode, employeeAssignments, commutedDays }) => {
  if (!leaveCode || !employeeAssignments?.length) return null;

  const allRows = employeeAssignments.filter((a) => a.leave_code === leaveCode);
  if (!allRows.length) return null;

  const sorted = [...allRows].sort((a, b) => {
    const yearDiff = (b.period_year || 0) - (a.period_year || 0);
    if (yearDiff !== 0) return yearDiff;
    return semOrder(b.period_semester) - semOrder(a.period_semester);
  });

  const totalRemainingHours = sorted.reduce((s, r) => s + toNum(r.remaining_hours), 0);
  const hasCommuted = toNum(commutedDays) > 0;
  const effectiveCarryDays = hasCommuted ? toNum(commutedDays) : totalRemainingHours / 8;
  const hasBalance = effectiveCarryDays > 0;

  return (
    <Box sx={{ border: '1px solid rgba(109, 35, 35, 0.12)', borderRadius: 2, overflow: 'hidden', bgcolor: '#fafafa' }}>
      <Box sx={{ px: 2.5, py: 1.5, bgcolor: 'rgba(109, 35, 35, 0.05)', borderBottom: '1px solid rgba(109, 35, 35, 0.08)', display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <HistoryIcon sx={{ fontSize: 16, color: '#6d2323' }} />
        <Typography sx={{ fontWeight: 700, color: '#6d2323', fontSize: '0.82rem', letterSpacing: 0.2 }}>
          Leave History — {leaveCode}
        </Typography>
        <Typography sx={{ color: '#999', fontSize: '0.75rem', ml: 0.5 }}>
          ({sorted.length} {sorted.length === 1 ? 'period' : 'periods'} on record)
        </Typography>
        {hasCommuted && (
          <Chip label="Has Commutation" size="small" icon={<CommutationIcon style={{ fontSize: 12 }} />}
            sx={{ ml: 'auto', height: 22, fontSize: '0.65rem', bgcolor: 'rgba(109,35,35,0.1)', color: '#6d2323', fontWeight: 700 }} />
        )}
      </Box>

      <Box sx={{ px: 2.5, py: 1.75 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 160, overflowY: 'auto', pr: 1 }}>
        {sorted.map((row, idx) => {
          const remHrs = toNum(row.remaining_hours);
          const usedHrs = toNum(row.used_hours);
          const totalHrs = toNum(row.total_hours);
          const remDays = remHrs / 8;
          const usedDays = usedHrs / 8;
          const totalDays = totalHrs / 8;
          const pct = totalDays > 0 ? Math.min((remDays / totalDays) * 100, 100) : 0;
          const barColor = getStatusColor(remHrs, totalHrs);
          const label = periodLabel(row.period_year, row.period_semester);
          const isLatest = idx === 0;
          const isCommuted = remHrs === 0 && toNum(row.used_hours) === totalHrs && hasCommuted && isLatest;

          return (
            <Box key={row.id} sx={{ py: 0.6, borderBottom: idx < sorted.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontWeight: 600, color: '#2c2c2c', fontSize: '0.78rem' }}>{label}</Typography>
                  {isLatest && (
                    <Box sx={{ px: 1, py: 0.2, borderRadius: 1, bgcolor: 'rgba(109,35,35,0.07)', border: '1px solid rgba(109,35,35,0.15)' }}>
                      <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#6d2323', letterSpacing: 0.3 }}>MOST RECENT</Typography>
                    </Box>
                  )}
                  {isCommuted && (
                    <Chip label="COMMUTED" size="small" icon={<CommutationIcon style={{ fontSize: 11 }} />}
                      sx={{ height: 20, fontSize: '0.62rem', bgcolor: 'rgba(109,35,35,0.12)', color: '#6d2323', fontWeight: 700 }} />
                  )}
                </Box>
                {remHrs <= 0 ? (
                  <Typography sx={{ fontWeight: 700, color: barColor, fontSize: '0.82rem' }}>No balance left</Typography>
                ) : (
                  <RemainingBalance hoursLike={remHrs} color={barColor} alignItems="flex-end" />
                )}
              </Box>

              <Box sx={{ position: 'relative', height: 6, bgcolor: 'rgba(0,0,0,0.07)', borderRadius: 4, overflow: 'hidden', mb: 0.5 }}>
                <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, bgcolor: barColor, borderRadius: 4, transition: 'width 0.4s ease' }} />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '0.68rem', color: '#888' }}>
                  {remHrs <= 0 ? (isCommuted ? 'Commuted to carry-forward' : 'Fully used') : `${remDays.toFixed(1)} days available`}
                </Typography>
                <Typography sx={{ fontSize: '0.68rem', color: '#aaa' }}>
                  {usedDays.toFixed(1)} used · {totalDays.toFixed(1)} total
                </Typography>
              </Box>
            </Box>
          );
        })}
        </Box>
      </Box>

      <Box sx={{
        px: 2.5, py: 1.75,
        bgcolor: hasBalance ? (hasCommuted ? 'rgba(109,35,35,0.04)' : 'rgba(46,125,50,0.04)') : 'rgba(0,0,0,0.02)',
        borderTop: `1px solid ${hasBalance ? (hasCommuted ? 'rgba(109,35,35,0.14)' : 'rgba(46,125,50,0.14)') : 'rgba(0,0,0,0.06)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
      }}>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: hasBalance ? (hasCommuted ? '#6d2323' : '#2E7D32') : '#888', mb: 0.25 }}>
            {hasBalance
              ? hasCommuted
                ? 'Carried balance sourced from commutation record.'
                : 'Unused leave days will be carried over.'
              : 'No unused leave days to carry over.'}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: '#777' }}>
            {hasBalance
              ? 'The "Carried Balance" field below has been filled in automatically.'
              : 'The employee has used all of their allocated leave for previous periods.'}
          </Typography>
        </Box>
        {hasBalance && (
          <Box sx={{
            flexShrink: 0, textAlign: 'center', px: 2.5, py: 1,
            bgcolor: hasCommuted ? 'rgba(109,35,35,0.09)' : 'rgba(46,125,50,0.09)',
            border: `1px solid ${hasCommuted ? 'rgba(109,35,35,0.2)' : 'rgba(46,125,50,0.2)'}`,
            borderRadius: 2,
          }}>
            <Typography sx={{ fontWeight: 800, color: hasCommuted ? '#6d2323' : '#2E7D32', fontSize: '1.5rem', lineHeight: 1 }}>
              {effectiveCarryDays.toFixed(1)}
            </Typography>
            <Typography sx={{ fontSize: '0.68rem', color: hasCommuted ? '#8B4545' : '#4a9d55', fontWeight: 600, mt: 0.25 }}>days to carry forward</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────
// COMMUTE CONFIRM DIALOG
// ─────────────────────────────────────────────
const CommuteDialog = ({ open, period, onClose, onConfirm, loading }) => {
  const remainingDays = toNum(period?.remaining_hours) / 8;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ background: 'linear-gradient(135deg,#6D2323 0%,#8B4545 100%)', color: '#fff', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40 }}>
          <CommutationIcon />
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Commute Leave Balance</Typography>
          <Typography variant="caption" sx={{ opacity: 0.85 }}>This action cannot be undone</Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            You are about to commute the remaining leave balance for this period.
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            The remaining hours will be transferred to the Leave Commutation module and this assignment's remaining hours will be zeroed out.
          </Typography>
        </Alert>

        <Box sx={{ bgcolor: 'rgba(109,35,35,0.04)', border: '1px solid rgba(109,35,35,0.12)', borderRadius: 2, p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#6d2323', mb: 1.5 }}>Summary</Typography>
          {[
            ['Employee',        period?.fullName || period?.employeeNumber],
            ['Leave Code',      period?.leave_code],
            ['Period',          periodLabel(period?.period_year, period?.period_semester)],
            ['Days to Commute', `${remainingDays.toFixed(2)} days (${toNum(period?.remaining_hours).toFixed(2)} hrs)`],
          ].map(([label, value]) => (
            <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <Typography variant="caption" sx={{ color: '#888', fontWeight: 600 }}>{label}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#333' }}>{value}</Typography>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderColor: '#6d2323', color: '#6d2323', borderRadius: 2 }}>Cancel</Button>
        <Button
          onClick={onConfirm} variant="contained" disabled={loading} startIcon={<CommutationIcon />}
          sx={{ bgcolor: '#6d2323', color: '#fff', borderRadius: 2, '&:hover': { bgcolor: '#5a1d1d' }, fontWeight: 700 }}
        >
          {loading ? 'Processing…' : 'Confirm Commutation'}
        </Button>
      </DialogActions>
    </Dialog>
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
    leave_code: '', employeeNumber: '', total_hours: '',
    carried_forward_days: '0', allocated_days: '',
    period_year: new Date().getFullYear().toString(),
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
  const [employeeLeavesModalOpen, setEmployeeLeavesModalOpen] = useState(false);
  const [selectedEmployeeLeaves, setSelectedEmployeeLeaves] = useState(null);
  const [selectedLeaveTypeInModal, setSelectedLeaveTypeInModal] = useState(null);
  const [employeeAssignments, setEmployeeAssignments] = useState([]);
  const [editCarriedDays, setEditCarriedDays] = useState('0');
  const [editAllocatedDays, setEditAllocatedDays] = useState('0');

  // ─── Commutation state ───────────────────────
  const [commuteDialogOpen, setCommuteDialogOpen] = useState(false);
  const [commutePeriod, setCommutePeriod] = useState(null);
  const [commuteLoading, setCommuteLoading] = useState(false);
  const [commuteSuccess, setCommuteSuccess] = useState('');

  // Commuted days per employee+leaveCode (for new assignment carried balance)
  const [commutationMap, setCommutationMap] = useState({});

  useEffect(() => {
    fetchAssignments();
    fetchLeaveTypes();
    fetchEmployees();
    fetchAllCommutations();
  }, []);

  // ─── Auto-fill carried_forward_days from COMMUTATION (not raw remaining) ───
  useEffect(() => {
    if (!selectedEmployee?.employeeNumber || !newAssignment.leave_code) {
      setIsCarryForwardAutoSuggested(false);
      setNewAssignment((prev) => ({ ...prev, carried_forward_days: '0' }));
      return;
    }

    const empNum = selectedEmployee.employeeNumber?.toString();
    const lc = newAssignment.leave_code;
    const mapKey = `${empNum}_${lc}`;
    const empAssignments = assignments.filter((a) => a.employeeNumber?.toString() === empNum);
    setEmployeeAssignments(empAssignments);

    const leaveRows = empAssignments.filter((a) => a.leave_code === lc);
    if (!leaveRows.length) {
      setIsCarryForwardAutoSuggested(false);
      setNewAssignment((prev) => ({ ...prev, carried_forward_days: '0' }));
      return;
    }

    // ► Priority: use commuted days if available, else raw remaining
    const commutedDays = toNum(commutationMap[mapKey]);
    if (commutedDays > 0) {
      setNewAssignment((prev) => ({ ...prev, carried_forward_days: commutedDays.toString() }));
      setIsCarryForwardAutoSuggested(true);
    } else {
      const totalRemainingHours = leaveRows.reduce((s, r) => s + toNum(r.remaining_hours), 0);
      const totalRemainingDays = totalRemainingHours / 8;
      setNewAssignment((prev) => ({ ...prev, carried_forward_days: totalRemainingDays.toString() }));
      setIsCarryForwardAutoSuggested(totalRemainingDays > 0);
    }
  }, [selectedEmployee, newAssignment.leave_code, assignments, commutationMap]);

  useEffect(() => {
    if (!selectedEmployee?.employeeNumber) { setEmployeeAssignments([]); return; }
    setEmployeeAssignments(assignments.filter((a) => a.employeeNumber?.toString() === selectedEmployee.employeeNumber?.toString()));
  }, [selectedEmployee, assignments]);

  const fetchAssignments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/leaveRoute/leave_assignment`);
      setAssignments(Array.isArray(res.data) ? res.data : []);
      setError('');
    } catch (error) {
      setAssignments([]);
      setError('Failed to fetch assignments');
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/leaveRoute/leave_table`);
      setLeaveTypes(Array.isArray(res.data) ? res.data : []);
    } catch { setLeaveTypes([]); }
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
    } catch { setEmployees([]); }
  };

  // Build a map: "empNum_leaveCode" → total commuted days (pending+approved)
  const fetchAllCommutations = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/commutationRoute/leave_commutation`);
      const records = Array.isArray(res.data) ? res.data : [];
      const map = {};
      records
        .filter((r) => r.status === 0 || r.status === 1)  // pending or approved
        .forEach((r) => {
          const key = `${r.employeeNumber}_${r.leave_code}`;
          map[key] = (map[key] || 0) + toNum(r.commuted_days);
        });
      setCommutationMap(map);
    } catch { /* non-fatal */ }
  };
  // ─── Commute action ──────────────────────────────────────
  const openCommuteDialog = (period) => {
    setCommutePeriod(period);
    setCommuteDialogOpen(true);
    setCommuteSuccess('');
  };

  const handleCommute = async () => {
    if (!commutePeriod) return;
    setCommuteLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/commutationRoute/leave_commutation/commute/${commutePeriod.id}`,
        { commuted_by: token ? 'admin' : null },
      );
      setCommuteDialogOpen(false);
      setCommuteLoading(false);
      setCommuteSuccess(`Successfully commuted ${(toNum(commutePeriod.remaining_hours) / 8).toFixed(2)} days.`);
      await fetchAssignments();
      await fetchAllCommutations();

      // Refresh modal data if open
      if (selectedEmployeeLeaves) {
        const updated = await axios.get(`${API_BASE_URL}/leaveRoute/leave_assignment`);
        const all = Array.isArray(updated.data) ? updated.data : [];
        const empData = all.filter((a) => a.employeeNumber?.toString() === selectedEmployeeLeaves.employeeNumber?.toString());
        const grouped = empData.reduce((acc, a) => {
          if (!acc[a.leave_code]) acc[a.leave_code] = { leave_code: a.leave_code, periods: [] };
          acc[a.leave_code].periods.push(a);
          return acc;
        }, {});
        setSelectedEmployeeLeaves((prev) => ({ ...prev, leaveTypes: Object.values(grouped) }));
        if (selectedLeaveTypeInModal) {
          const refreshedLT = grouped[selectedLeaveTypeInModal.leave_code];
          if (refreshedLT) setSelectedLeaveTypeInModal(refreshedLT);
        }
      }
      if (editAssignment) {
        setEditAssignment((prev) => ({ ...prev, remaining_hours: 0, used_hours: prev.total_hours }));
      }
      setTimeout(() => setCommuteSuccess(''), 4000);
    } catch (e) {
      setCommuteLoading(false);
      setError('Commutation failed: ' + (e.response?.data?.error || e.message));
    }
  };

  // ─── CRUD ────────────────────────────────────────────────
  const handleAdd = async () => {
    const employeeNumber = selectedEmployee?.employeeNumber?.toString().trim();
    const leaveCode = newAssignment.leave_code;
    const carriedHours = daysToHours(newAssignment.carried_forward_days);
    const allocatedHours = daysToHours(newAssignment.allocated_days);

    if (!employeeNumber || !leaveCode) { setError('Please select an employee and leave type'); return; }
    if (!allocatedHours || allocatedHours <= 0) { setError('Please enter valid allocation days (must be greater than 0)'); return; }
    if (isDuplicateAssignment(employeeNumber, leaveCode, newAssignment.period_year)) {
      setError('This employee already has an assignment for this leave type and period'); return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/leaveRoute/leave_assignment`, {
        leave_code: leaveCode, employeeNumber,
        total_hours: allocatedHours, carried_forward_hours: carriedHours,
        allocated_hours: allocatedHours,
        period_year: parseInt(newAssignment.period_year) || new Date().getFullYear(),
        period_semester: null,
      });
      setSelectedEmployee(null);
      setNewAssignment({ leave_code: '', employeeNumber: '', total_hours: '', carried_forward_days: '0', allocated_days: '', period_year: new Date().getFullYear().toString() });
      setIsCarryForwardAutoSuggested(false);
      await fetchAssignments();
      await fetchAllCommutations();
      setTimeout(() => {
        setLoading(false);
        setSuccessAction('adding');
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2000);
      }, 300);
    } catch (error) {
      setError('Error adding assignment: ' + (error.response?.data?.error || error.message));
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    const assignmentId = editAssignment?.id;
    const employeeNumber = editAssignment.employeeNumber?.toString().trim();
    const leaveCode = editAssignment.leave_code;
    const carriedHours = daysToHours(editCarriedDays);
    const allocatedHours = daysToHours(editAllocatedDays);

    if (!assignmentId) { setError('Error: Assignment ID is missing.'); return; }
    if (!employeeNumber || !leaveCode) { setError('Please fill in all required fields'); return; }
    if (isDuplicateAssignment(employeeNumber, leaveCode, editAssignment.period_year, editAssignment.id)) {
      setError('This employee already has an assignment for this leave type and period'); return;
    }

    try {
      await axios.put(`${API_BASE_URL}/leaveRoute/leave_assignment/${assignmentId}`, {
        leave_code: leaveCode, employeeNumber,
        total_hours: allocatedHours,
        remaining_hours: parseFloat(editAssignment.remaining_hours) || 0,
        carried_forward_hours: carriedHours, allocated_hours: allocatedHours,
        period_year: parseInt(editAssignment.period_year) || new Date().getFullYear(),
        period_semester: null,
      });
      setEditAssignment(null); setOriginalAssignment(null); setIsEditing(false); setError('');
      await fetchAssignments();
      setSuccessAction('edit'); setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
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
      setSuccessAction('delete'); setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch (error) {
      setError('Error deleting assignment: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleOpenModal = (assignment) => {
    setEditAssignment({ ...assignment });
    setOriginalAssignment({ ...assignment });
    setEditCarriedDays(hoursToDays(assignment.carried_forward_hours));
    setEditAllocatedDays(hoursToDays(assignment.allocated_hours));
    setIsEditing(false); setError('');
  };

  const handleStartEdit = () => { setIsEditing(true); setError(''); };
  const handleCancelEdit = () => {
    setEditAssignment({ ...originalAssignment });
    setEditCarriedDays(hoursToDays(originalAssignment.carried_forward_hours));
    setEditAllocatedDays(hoursToDays(originalAssignment.allocated_hours));
    setIsEditing(false); setError('');
  };
  const handleBackToPeriods = () => { setEditAssignment(null); setOriginalAssignment(null); setIsEditing(false); setError(''); };
  const handleCloseModal = () => {
    setEditAssignment(null); setOriginalAssignment(null); setIsEditing(false); setError('');
    setEmployeeLeavesModalOpen(false); setSelectedEmployeeLeaves(null); setSelectedLeaveTypeInModal(null);
  };

  const getLeaveTypeInfo = (leaveCode) =>
    leaveTypes.find((t) => t.leave_code === leaveCode) || { leave_description: leaveCode || 'Unknown', leave_hours: 'N/A' };
  const getEmployeeInfo = (empNum) =>
    employees.find((e) => e.employeeNumber?.toString() === empNum?.toString()) || { fullName: empNum || 'Unknown' };

  const filteredAssignments = assignments.filter((a) => {
    const search = searchTerm.toLowerCase();
    return (
      (a.fullName?.toLowerCase() || '').includes(search) ||
      (a.employeeNumber?.toString().toLowerCase() || '').includes(search) ||
      (a.leave_code?.toString().toLowerCase() || '').includes(search)
    );
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
    .map((emp) => ({ ...emp, leaveTypes: Object.values(emp.leaveTypes) }))
    .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));

  const getLeaveTypeStats = (periods) =>
    periods.reduce(
      (s, p) => ({ totalHours: s.totalHours + toNum(p.total_hours), usedHours: s.usedHours + toNum(p.used_hours), remainingHours: s.remainingHours + toNum(p.remaining_hours) }),
      { totalHours: 0, usedHours: 0, remainingHours: 0 }
    );

  const selectedLeaveAssignments = newAssignment.leave_code
    ? employeeAssignments.filter((a) => a.leave_code === newAssignment.leave_code)
    : [];

  const mapKey = selectedEmployee ? `${selectedEmployee.employeeNumber}_${newAssignment.leave_code}` : '';
  const commutedDaysForNew = toNum(commutationMap[mapKey]);

  const carriedHoursNew = daysToHours(newAssignment.carried_forward_days);
  const allocatedHoursNew = daysToHours(newAssignment.allocated_days);
  const totalHoursNew = allocatedHoursNew;
  const totalDaysNew = totalHoursNew / 8;
  const editTotalHours = daysToHours(editAllocatedDays);

  // Can only commute if remaining > 0
  const canCommute = (period) => toNum(period?.remaining_hours) > 0;

  return (
    <Box sx={{ py: { xs: 2, md: 4 }, mt: { xs: 0, md: -5 }, width: '100%', maxWidth: '100%', mx: 'auto', px: { xs: 2, sm: 3, md: 4 } }}>
      <LoadingOverlay open={loading} message="Processing leave assignment..." />
      <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />

      {/* Commute Confirm Dialog */}
      <CommuteDialog
        open={commuteDialogOpen}
        period={commutePeriod}
        onClose={() => setCommuteDialogOpen(false)}
        onConfirm={handleCommute}
        loading={commuteLoading}
      />

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
            <Typography variant="caption" sx={{ opacity: 0.9 }}>Select an employee and assign leave type with designated days</Typography>
          </Box>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
          {commuteSuccess && <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 3, borderRadius: 2 }}>{commuteSuccess}</Alert>}

          <Grid container spacing={3} alignItems="flex-start">
            {/* Employee Select */}
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>Select Employee *</Typography>
              <Autocomplete
                value={selectedEmployee}
                onChange={(e, v) => {
                  setSelectedEmployee(v); setError('');
                  setNewAssignment((prev) => ({ ...prev, leave_code: '', carried_forward_days: '0', total_hours: '', allocated_days: '' }));
                }}
                options={employees}
                getOptionLabel={(o) => `${o.fullName || `${o.firstName || ''} ${o.lastName || ''}`.trim()} (${o.employeeNumber})`}
                filterOptions={(options, { inputValue }) => {
                  const s = inputValue.toLowerCase().trim();
                  return options.filter(
                    (o) =>
                      (o.fullName || `${o.firstName || ''} ${o.lastName || ''}`).toLowerCase().includes(s) ||
                      (o.employeeNumber || '').toString().toLowerCase().includes(s)
                  );
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
                renderInput={(params) => (
                  <TextField
                    {...params} placeholder="Type employee name or number..." size="medium"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <><InputAdornment position="start"><PersonIcon sx={{ color: '#6d2323' }} /></InputAdornment>{params.InputProps.startAdornment}</>
                      ),
                    }}
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
                  value={newAssignment.leave_code || ''} displayEmpty size="medium"
                  onChange={(e) => { setNewAssignment((prev) => ({ ...prev, leave_code: e.target.value })); setError(''); }}
                  startAdornment={<InputAdornment position="start" sx={{ ml: 1 }}><WorkIcon sx={{ color: '#6d2323' }} /></InputAdornment>}
                  sx={{ borderRadius: 2, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(109,35,35,0.2)' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6d2323' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6d2323', borderWidth: 2 } }}
                >
                  <MenuItem value=""><em>Choose a leave type...</em></MenuItem>
                  {leaveTypes.map((type) => (
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

            {/* Carry Forward Summary */}
            {selectedEmployee && newAssignment.leave_code && (
              <Grid item xs={12}>
                {selectedLeaveAssignments.length > 0 ? (
                  <CarryForwardSummary
                    leaveCode={newAssignment.leave_code}
                    employeeAssignments={employeeAssignments}
                    commutedDays={commutedDaysForNew}
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

            {/* Carried Balance Days */}
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#2E7D32', display: 'flex', alignItems: 'center', gap: 1 }}>
                Carried Balance Days
                <Chip
                  label={commutedDaysForNew > 0 ? 'From Commutation' : 'Info only'}
                  size="small"
                  icon={commutedDaysForNew > 0 ? <CommutationIcon style={{ fontSize: 12 }} /> : undefined}
                  sx={{ height: 20, fontSize: '0.65rem', bgcolor: commutedDaysForNew > 0 ? 'rgba(109,35,35,0.1)' : 'rgba(46,125,50,0.1)', color: commutedDaysForNew > 0 ? '#6d2323' : '#2E7D32' }}
                />
              </Typography>
              <Box sx={{ borderRadius: 2, border: `1px solid ${commutedDaysForNew > 0 ? 'rgba(109,35,35,0.3)' : 'rgba(46,125,50,0.3)'}`, bgcolor: commutedDaysForNew > 0 ? 'rgba(109,35,35,0.04)' : 'rgba(46,125,50,0.04)', px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 56 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {commutedDaysForNew > 0 ? <CommutationIcon sx={{ color: '#6d2323', fontSize: 20 }} /> : <CalendarIcon sx={{ color: '#2E7D32', fontSize: 20 }} />}
                  <Typography sx={{ fontWeight: 700, color: commutedDaysForNew > 0 ? '#6d2323' : '#2E7D32', fontSize: '1.1rem' }}>
                    {parseFloat(newAssignment.carried_forward_days) || 0} days
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#888' }}>= {carriedHoursNew} hrs</Typography>
              </Box>
              <Typography variant="caption" sx={{ color: commutedDaysForNew > 0 ? '#6d2323' : '#2E7D32', mt: 0.5, display: 'block', fontWeight: 600 }}>
                {commutedDaysForNew > 0 ? 'Auto-filled from commutation record' : 'From previous periods — not added to total'}
              </Typography>
            </Grid>

            {/* New Allocation Days */}
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>New Allocation Days</Typography>
              <DaysInputField
                value={newAssignment.allocated_days}
                onChange={(days) => { setNewAssignment((prev) => ({ ...prev, allocated_days: days })); setError(''); }}
                color="#1976d2"
              />
              <Typography variant="caption" sx={{ color: '#1976d2', mt: 0.5, display: 'block', fontWeight: 500 }}>
                Fresh allocation for current period
              </Typography>
            </Grid>

            {/* Period Year */}
            <Grid item xs={12} md={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>Period Year</Typography>
              <TextField
                type="number" value={newAssignment.period_year}
                onChange={(e) => setNewAssignment((prev) => ({ ...prev, period_year: e.target.value }))}
                placeholder="Year..." fullWidth size="medium" inputProps={{ min: 2020, max: 2030 }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, '& fieldset': { borderColor: 'rgba(109,35,35,0.2)' }, '&:hover fieldset': { borderColor: '#6d2323' }, '&.Mui-focused fieldset': { borderColor: '#6d2323', borderWidth: 2 } } }}
              />
              <Typography variant="caption" sx={{ color: '#888', mt: 0.5, display: 'block' }}>e.g., 2024, 2025</Typography>
            </Grid>

            {/* New Total */}
            <Grid item xs={12} md={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>New Total *</Typography>
              <Box sx={{ borderRadius: 2, border: '2px solid rgba(109,35,35,0.3)', bgcolor: '#f5f5f5', px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 0.25, minHeight: 56, justifyContent: 'center' }}>
                <Typography sx={{ fontWeight: 800, color: '#6d2323', fontSize: '1.25rem', lineHeight: 1 }}>
                  {totalDaysNew % 1 === 0 ? totalDaysNew : totalDaysNew.toFixed(1)} days
                </Typography>
                <Typography variant="caption" sx={{ color: '#999', fontWeight: 500 }}>= {totalHoursNew} hours</Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#6d2323', mt: 0.5, display: 'block', fontWeight: 600 }}>
                Allocation only (excl. carry-over)
              </Typography>
            </Grid>

            {/* Assign Button */}
            <Grid item xs={12} md={2}>
              <Button
                onClick={handleAdd} variant="contained" fullWidth size="large" startIcon={<AddIcon />}
                disabled={loading || !selectedEmployee || !newAssignment.leave_code || !allocatedHoursNew}
                sx={{
                  mt: 3, height: 50, borderRadius: 2, fontWeight: 600,
                  backgroundColor: !selectedEmployee || !newAssignment.leave_code || !allocatedHoursNew ? '#cccccc' : '#6D2323',
                  color: !selectedEmployee || !newAssignment.leave_code || !allocatedHoursNew ? '#666' : '#FFF',
                  boxShadow: !selectedEmployee || !newAssignment.leave_code || !allocatedHoursNew ? 'none' : '0 4px 12px rgba(109,35,35,0.3)',
                  '&:hover': { backgroundColor: !selectedEmployee || !newAssignment.leave_code || !allocatedHoursNew ? '#cccccc' : '#5a1d1d' },
                  '&:disabled': { backgroundColor: '#cccccc !important', color: '#666 !important' },
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
            <Avatar sx={{ bgcolor: 'rgba(109,35,35,0.15)', width: 56, height: 56 }}>
              <ReorderIcon sx={{ fontSize: 28, color: '#6d2323' }} />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#6d2323' }}>Leave Assignment Records</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, color: '#8B3333' }}>
                {employeeGroups.length} {employeeGroups.length === 1 ? 'employee' : 'employees'} · {filteredAssignments.length} {filteredAssignments.length === 1 ? 'assignment' : 'assignments'}
              </Typography>
            </Box>
          </Box>
          <TextField
            size="small" variant="outlined" placeholder="Search by name or employee number..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 300, '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff', '& fieldset': { borderColor: 'rgba(109,35,35,0.2)' }, '&:hover fieldset': { borderColor: '#6d2323' }, '&.Mui-focused fieldset': { borderColor: '#6d2323' } } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#6d2323' }} /></InputAdornment> }}
          />
        </Box>

        <CardContent sx={{ p: 4, overflow: 'visible' }}>
          {filteredAssignments.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <EventNote sx={{ fontSize: 56, color: 'rgba(109,35,35,0.3)', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#6D2323', fontWeight: 700, mb: 1 }}>
                {assignments.length === 0 ? 'No Leave Assignments Found' : 'No Matching Records'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#888', maxWidth: 400, mx: 'auto' }}>
                {assignments.length === 0 ? 'Get started by assigning leave types to employees using the form above.' : 'Try adjusting your search criteria.'}
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {employeeGroups.map((employeeGroup) => {
                const allPeriods = employeeGroup.leaveTypes.flatMap((lt) => lt.periods);
                const totalHours = allPeriods.reduce((s, p) => s + toNum(p.total_hours), 0);
                const usedHours = allPeriods.reduce((s, p) => s + toNum(p.used_hours), 0);
                const remainingHours = allPeriods.reduce((s, p) => s + toNum(p.remaining_hours), 0);
                const overallColor = getStatusColor(remainingHours, totalHours);

                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={employeeGroup.employeeNumber}>
                    <Box
                      onClick={() => { setSelectedEmployeeLeaves(employeeGroup); setSelectedLeaveTypeInModal(null); setEmployeeLeavesModalOpen(true); }}
                      sx={{ border: '1px solid rgba(109,35,35,0.15)', borderRadius: 3, p: 2.5, transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', background: 'linear-gradient(135deg,#FFFFFF 0%,#FEFEFE 100%)', minHeight: 220, display: 'flex', flexDirection: 'column', cursor: 'pointer', '&:hover': { boxShadow: '0 12px 32px rgba(109,35,35,0.18)', borderColor: '#6d2323', transform: 'translateY(-4px)' } }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Avatar sx={{ bgcolor: '#6d2323', width: 48, height: 48 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#FFFFFF' }}>
                            {employeeGroup.firstName?.[0] || 'U'}{employeeGroup.lastName?.[0] || 'U'}
                          </Typography>
                        </Avatar>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#6d2323', fontSize: '0.95rem', lineHeight: 1.3, mb: 0.3 }}>
                            {employeeGroup.fullName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, fontSize: '0.75rem' }}>
                            #{employeeGroup.employeeNumber}
                          </Typography>
                        </Box>
                      </Box>

                      <Divider sx={{ mb: 2, borderColor: 'rgba(109,35,35,0.1)' }} />

                      <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 2, py: 1.5, bgcolor: 'rgba(109,35,35,0.02)', borderRadius: 2, alignItems: 'flex-start' }}>
                        {[
                          [(totalHours / 8).toFixed(1), '#6d2323', 'Total'],
                          [(usedHours / 8).toFixed(1), '#ed6c02', 'Used'],
                        ].map(([val, color, label]) => (
                          <Box key={label} sx={{ textAlign: 'center' }}>
                            <Typography variant="body1" sx={{ fontWeight: 700, color, fontSize: '1.1rem' }}>{val}</Typography>
                            <Typography variant="caption" sx={{ color: '#888', fontSize: '0.65rem' }}>{label}</Typography>
                          </Box>
                        ))}
                        <Box sx={{ textAlign: 'center' }}>
                          <RemainingBalance hoursLike={remainingHours} color={overallColor} alignItems="center" />
                          <Typography variant="caption" sx={{ color: '#888', fontSize: '0.65rem' }}>Left</Typography>
                        </Box>
                      </Box>

                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem' }}>
                          📋 Leave Credits
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                          {employeeGroup.leaveTypes.map((lt) => {
                            const stats = getLeaveTypeStats(lt.periods);
                            const mapKey = `${employeeGroup.employeeNumber}_${lt.leave_code}`;
                            const commutedDays = toNum(commutationMap[mapKey]);
                            const displayDays = commutedDays > 0
                              ? commutedDays
                              : stats.remainingHours / 8;
                            const isFromCommutation = commutedDays > 0;
                            const sc = isFromCommutation ? '#6d2323' : getStatusColor(stats.remainingHours, stats.totalHours);
                            return (
                              <Box
                                key={lt.leave_code}
                                title={isFromCommutation ? 'Carried balance from commutation' : 'Remaining balance'}
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.4, bgcolor: `${sc}15`, border: `1px solid ${sc}50`, borderRadius: '16px', px: 1, height: 26, cursor: 'default', transition: 'all 0.2s', '&:hover': { bgcolor: sc }, '&:hover .chip-text': { color: '#fff' }, '&:hover .chip-dot': { bgcolor: '#fff' } }}
                              >
                                {/* Colored dot indicator */}
                                {isFromCommutation && (
                                  <Box
                                    className="chip-dot"
                                    sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: sc, flexShrink: 0, transition: 'background-color 0.2s', boxShadow: `0 0 0 1.5px ${sc}60` }}
                                  />
                                )}
                                <Typography
                                  className="chip-text"
                                  sx={{ fontWeight: 700, fontSize: '0.75rem', color: sc, lineHeight: 1, transition: 'color 0.2s' }}
                                >
                                  {lt.leave_code}: {displayDays.toFixed(1)}d
                                </Typography>
                              </Box>
                            );
                          })}
                        </Box>
                        {employeeGroup.leaveTypes.some((lt) => toNum(commutationMap[`${employeeGroup.employeeNumber}_${lt.leave_code}`]) > 0) && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#6d2323', flexShrink: 0 }} />
                            <Typography variant="caption" sx={{ color: '#6d2323', fontSize: '0.6rem', fontWeight: 600 }}>
                              Carried balance from commutation
                            </Typography>
                          </Box>
                        )}
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
      <Modal
        open={employeeLeavesModalOpen}
        onClose={() => { setEmployeeLeavesModalOpen(false); setSelectedEmployeeLeaves(null); setSelectedLeaveTypeInModal(null); }}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}
      >
        <Box sx={{ backgroundColor: '#fff', borderRadius: 4, width: '90%', maxWidth: '700px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
          {selectedEmployeeLeaves && !selectedLeaveTypeInModal && (
            <>
              <Box sx={{ background: 'linear-gradient(135deg,#6D2323 0%,#8B4545 100%)', color: '#fff', p: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'radial-gradient(circle,rgba(255,255,255,0.1) 0%,transparent 70%)' }} />
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
                  {selectedEmployeeLeaves.leaveTypes.map((lt) => {
                    const stats = getLeaveTypeStats(lt.periods);
                    const sc = getStatusColor(stats.remainingHours, stats.totalHours);
                    return (
                      <Grid item xs={12} sm={6} key={lt.leave_code}>
                        <Box
                          onClick={() => setSelectedLeaveTypeInModal(lt)}
                          sx={{ p: 2.5, borderRadius: 2.5, border: `1.5px solid ${sc}40`, bgcolor: 'rgba(109,35,35,0.02)', cursor: 'pointer', transition: 'all 0.3s', '&:hover': { borderColor: sc, bgcolor: `${sc}10`, transform: 'translateY(-2px)', boxShadow: `0 4px 16px ${sc}30` } }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1.5 }}>
                            <Avatar sx={{ bgcolor: sc, width: 48, height: 48 }}><Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>{lt.leave_code}</Typography></Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography sx={{ fontWeight: 700, color: '#6d2323', mb: 0.5 }}>{lt.leave_code}</Typography>
                              <Typography variant="caption" sx={{ color: '#888' }}>{lt.periods.length} period{lt.periods.length !== 1 ? 's' : ''}</Typography>
                            </Box>
                          </Box>
                          <Divider sx={{ my: 1.5, borderColor: 'rgba(109,35,35,0.1)' }} />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                              <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 0.5 }}>Remaining Balance</Typography>
                              <RemainingBalance hoursLike={stats.remainingHours} color={sc} alignItems="flex-start" />
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 0.5 }}>Total / Used (days)</Typography>
                              <Typography variant="caption" sx={{ fontWeight: 600, color: '#666', display: 'block' }}>
                                {(stats.totalHours / 8).toFixed(1)} / {(stats.usedHours / 8).toFixed(1)}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(109,35,35,0.1)' }}>
                            <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <ChevronRightIcon sx={{ fontSize: 14 }} /> Click to view all periods
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
              <Box sx={{ background: 'linear-gradient(135deg,#6D2323 0%,#8B4545 100%)', color: '#fff', p: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'radial-gradient(circle,rgba(255,255,255,0.1) 0%,transparent 70%)' }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, position: 'relative', zIndex: 1 }}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}><EventNote sx={{ fontSize: 28 }} /></Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>{selectedLeaveTypeInModal.leave_code} - Periods</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>{selectedEmployeeLeaves.fullName}</Typography>
                  </Box>
                </Box>
                <Button onClick={() => setSelectedLeaveTypeInModal(null)} variant="outlined" size="small" startIcon={<ChevronLeftIcon />} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'none', position: 'relative', zIndex: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)', borderColor: '#fff' } }}>
                  Back to Leave Types
                </Button>
              </Box>

              <Box sx={{ p: 4 }}>
                {commuteSuccess && (
                  <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 2, borderRadius: 2 }}>{commuteSuccess}</Alert>
                )}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[...selectedLeaveTypeInModal.periods]
                    .sort((a, b) => {
                      if (b.period_year !== a.period_year) return b.period_year - a.period_year;
                      return semOrder(b.period_semester) - semOrder(a.period_semester);
                    })
                    .map((period, index) => {
                      const sc = getStatusColor(period.remaining_hours, period.total_hours);
                      const isLatest = index === 0;
                      const isCommuted = toNum(period.remaining_hours) === 0;
                      return (
                        <Box key={period.id} sx={{ borderRadius: 2, border: isLatest ? '2px solid #6d2323' : '1px solid rgba(109,35,35,0.15)', bgcolor: isLatest ? 'rgba(109,35,35,0.03)' : '#fff', position: 'relative', overflow: 'hidden' }}>
                          {isLatest && <Chip label="Latest" size="small" sx={{ position: 'absolute', top: 12, right: 12, bgcolor: '#6d2323', color: '#fff', fontWeight: 700, fontSize: '0.7rem', height: 24 }} />}

                          {/* Period info - clickable to edit */}
                          <Box
                            onClick={() => handleOpenModal(period)}
                            sx={{ p: 2.5, cursor: 'pointer', transition: 'all 0.3s', '&:hover': { bgcolor: 'rgba(109,35,35,0.04)' } }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: `${sc}20` }}>
                                <Typography sx={{ fontWeight: 700, color: sc, fontSize: '0.9rem' }}>
                                  {period.period_year}{period.period_semester ? ` ${period.period_semester}` : ''}
                                </Typography>
                              </Box>
                              <Box sx={{ flexGrow: 1 }}>
                                <Typography sx={{ fontWeight: 600, color: '#6d2323', mb: 0.3 }}>
                                  {period.period_year}{period.period_semester ? ` ${period.period_semester}` : ' Annual'}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                                  {isCommuted && (
                                    <Chip size="small" icon={<CommutationIcon style={{ fontSize: 11 }} />} label="Commuted" sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'rgba(109,35,35,0.12)', color: '#6d2323', fontWeight: 600 }} />
                                  )}
                                </Box>
                              </Box>
                            </Box>

                            {/* 5-column stats row: Allocated | Used | Left | Total | Carried Balance */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) 1.15fr', gap: 1 }}>
                              {[
                                ['Allocated', toNum(period.allocated_hours) / 8, '#6d2323', 'rgba(109,35,35,0.05)'],
                                ['Used',      toNum(period.used_hours) / 8,      '#ed6c02', 'rgba(237,108,2,0.05)'],
                                ['Left',      toNum(period.remaining_hours) / 8, sc,        `${sc}15`],
                                ['Total',     toNum(period.total_hours) / 8,     '#2E7D32', 'rgba(46,125,50,0.05)'],
                              ].map(([label, val, color, bg]) => (
                                <Box key={label} sx={{ textAlign: 'center', p: 1, borderRadius: 1, bgcolor: bg }}>
                                  <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 0.3, fontSize: '0.6rem' }}>{label}</Typography>
                                  <Typography sx={{ fontWeight: 700, color, fontSize: '0.9rem' }}>{Number(val).toFixed(1)}d</Typography>
                                </Box>
                              ))}

                              {/* Carried Balance — always visible */}
                              <Box sx={{
                                textAlign: 'center', p: 1, borderRadius: 1,
                                bgcolor: toNum(period.carried_forward_hours) > 0 ? 'rgba(46,125,50,0.08)' : 'rgba(0,0,0,0.03)',
                                border: toNum(period.carried_forward_hours) > 0 ? '1.5px solid rgba(46,125,50,0.3)' : '1.5px dashed rgba(0,0,0,0.12)',
                              }}>
                                <Typography variant="caption" sx={{
                                  color: toNum(period.carried_forward_hours) > 0 ? '#2E7D32' : '#aaa',
                                  display: 'block', mb: 0.3, fontSize: '0.6rem', fontWeight: 700,
                                }}>
                                  Carried
                                </Typography>
                                <Typography sx={{
                                  fontWeight: 800,
                                  color: toNum(period.carried_forward_hours) > 0 ? '#2E7D32' : '#bbb',
                                  fontSize: '0.9rem',
                                }}>
                                  {(toNum(period.carried_forward_hours) / 8).toFixed(1)}d
                                </Typography>
                                {toNum(period.carried_forward_hours) > 0 && (
                                  <Typography sx={{ fontSize: '0.55rem', color: '#4a9d55', fontWeight: 600, lineHeight: 1, mt: 0.25 }}>
                                    {toNum(period.carried_forward_hours).toFixed(1)} hrs
                                  </Typography>
                                )}
                              </Box>
                            </Box>

                            <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(109,35,35,0.1)' }}>
                              <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <EditIcon sx={{ fontSize: 14 }} /> Click to edit this period
                              </Typography>
                            </Box>
                          </Box>

                          {/* ══ COMMUTE BUTTON ══ */}
                          <Box
                            sx={{
                              borderTop: '1px solid rgba(109,35,35,0.1)',
                              px: 2.5, py: 1.5,
                              bgcolor: canCommute(period) ? 'rgba(109,35,35,0.02)' : 'rgba(0,0,0,0.02)',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}
                          >
                            <Box>
                              <Typography variant="caption" sx={{ color: '#888', fontWeight: 600 }}>
                                {canCommute(period)
                                  ? `${(toNum(period.remaining_hours) / 8).toFixed(2)} days available to commute`
                                  : 'No remaining hours — already commuted or fully used'}
                              </Typography>
                            </Box>
                            <Button
                              onClick={(e) => { e.stopPropagation(); openCommuteDialog({ ...period, fullName: selectedEmployeeLeaves.fullName }); }}
                              disabled={!canCommute(period)}
                              variant={canCommute(period) ? 'contained' : 'outlined'}
                              size="small"
                              startIcon={<CommutationIcon />}
                              sx={{
                                borderRadius: 2, fontWeight: 700, fontSize: '0.75rem',
                                bgcolor: canCommute(period) ? '#6d2323' : 'transparent',
                                color: canCommute(period) ? '#fff' : '#aaa',
                                borderColor: canCommute(period) ? '#6d2323' : '#ccc',
                                '&:hover': { bgcolor: canCommute(period) ? '#5a1d1d' : 'transparent' },
                                '&:disabled': { bgcolor: '#f5f5f5 !important', color: '#ccc !important', borderColor: '#eee !important' },
                              }}
                            >
                              {canCommute(period) ? 'Commute Leave' : 'Already Commuted'}
                            </Button>
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
              <Box sx={{ background: 'linear-gradient(135deg,#6D2323 0%,#8B4545 100%)', color: '#fff', p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                    <TextField value={editAssignment.employeeNumber || ''} onChange={(e) => setEditAssignment({ ...editAssignment, employeeNumber: e.target.value })}
                      fullWidth size="medium" variant={isEditing ? 'outlined' : 'standard'} InputProps={{ readOnly: !isEditing, disableUnderline: !isEditing }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 }, '& .MuiInputBase-input': { color: '#000' } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>Leave Type</Typography>
                    {isEditing ? (
                      <FormControl fullWidth>
                        <Select value={editAssignment.leave_code || ''} onChange={(e) => setEditAssignment({ ...editAssignment, leave_code: e.target.value })} displayEmpty sx={{ borderRadius: 2 }}>
                          <MenuItem value=""><em>Select Leave Type</em></MenuItem>
                          {leaveTypes.map((t) => <MenuItem key={t.id || t.leave_code} value={t.leave_code}>{t.leave_code} - {t.leave_description}</MenuItem>)}
                        </Select>
                      </FormControl>
                    ) : (
                      <TextField value={`${editAssignment.leave_code || ''} - ${getLeaveTypeInfo(editAssignment.leave_code).leave_description}`} fullWidth size="medium" variant="standard" InputProps={{ readOnly: true, disableUnderline: true }} sx={{ '& .MuiInputBase-input': { color: '#000' } }} />
                    )}
                  </Grid>

                  {[['Total Hours', toNum(editAssignment.total_hours)], ['Used Hours', toNum(editAssignment.used_hours)]].map(([label, val]) => (
                    <Grid item xs={12} sm={4} key={label}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>{label}</Typography>
                      <TextField type="number" value={val} fullWidth variant="standard" InputProps={{ readOnly: true, disableUnderline: true, endAdornment: <InputAdornment position="end">hrs</InputAdornment> }} sx={{ '& .MuiInputBase-input': { color: '#000' } }} />
                    </Grid>
                  ))}

                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>Remaining Hours</Typography>
                    <TextField type="number" value={toNum(editAssignment.remaining_hours)}
                      onChange={(e) => setEditAssignment({ ...editAssignment, remaining_hours: parseFloat(e.target.value) || 0 })}
                      fullWidth size="medium" variant={isEditing ? 'outlined' : 'standard'} inputProps={{ min: 0, step: 1 }}
                      InputProps={{ readOnly: !isEditing, disableUnderline: !isEditing, endAdornment: <InputAdornment position="end">hrs</InputAdornment> }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 }, '& .MuiInputBase-input': { color: '#000' } }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Alert severity="info" sx={{ borderRadius: 2, backgroundColor: 'rgba(109,35,35,0.04)', border: '1px solid rgba(109,35,35,0.12)' }}>
                      <Typography variant="caption" sx={{ color: '#555', fontWeight: 600, display: 'block', mb: 0.5 }}>Remaining Balance</Typography>
                      <RemainingBalance hoursLike={toNum(editAssignment.remaining_hours)} color={getStatusColor(toNum(editAssignment.remaining_hours), toNum(editAssignment.total_hours))} alignItems="flex-start" largeDays />
                    </Alert>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }}>
                      <Chip label="Carried Balance & Allocation" size="small" sx={{ bgcolor: 'rgba(109,35,35,0.1)', color: '#6d2323', fontWeight: 600 }} />
                    </Divider>
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#2E7D32', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      Carried Balance Days
                      <Chip label="Info only" size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(46,125,50,0.1)', color: '#2E7D32' }} />
                    </Typography>
                    <Box sx={{ borderRadius: 2, border: '1px solid rgba(46,125,50,0.3)', bgcolor: 'rgba(46,125,50,0.04)', px: 2, py: 1.25, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                      <Typography sx={{ fontWeight: 700, color: '#2E7D32', fontSize: '1rem' }}>{parseFloat(editCarriedDays) || 0} days</Typography>
                      <Typography variant="caption" sx={{ color: '#888' }}>= {daysToHours(editCarriedDays)} hrs</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#2E7D32', mt: 0.5, display: 'block', fontWeight: 600, fontSize: '0.68rem' }}>Not added to total</Typography>
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1976d2' }}>Allocated Days</Typography>
                    {isEditing ? (
                      <DaysInputField value={editAllocatedDays} onChange={(days) => setEditAllocatedDays(days)} color="#1976d2" />
                    ) : (
                      <Box sx={{ py: 1 }}>
                        <Typography sx={{ fontWeight: 700, color: '#1976d2', fontSize: '1.1rem' }}>{parseFloat(editAllocatedDays) || 0} days</Typography>
                        <Typography variant="caption" sx={{ color: '#888' }}>= {daysToHours(editAllocatedDays)} hrs</Typography>
                      </Box>
                    )}
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>Period Year</Typography>
                    <TextField type="number" value={editAssignment.period_year || 2026}
                      onChange={(e) => setEditAssignment({ ...editAssignment, period_year: parseInt(e.target.value) })}
                      fullWidth size="medium" variant={isEditing ? 'outlined' : 'standard'} inputProps={{ min: 2020, max: 2035 }}
                      InputProps={{ readOnly: !isEditing, disableUnderline: !isEditing }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 }, '& .MuiInputBase-input': { color: '#000' } }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(109,35,35,0.05)', border: '1px solid rgba(109,35,35,0.1)' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#6d2323' }}>Days Summary (1 day = 8 hours)</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: '#6d2323' }}>
                            {Number(isEditing ? editTotalHours / 8 : toNum(editAssignment.total_hours) / 8).toFixed(1)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#666' }}>Total Days</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: '#ed6c02' }}>
                            {Number(toNum(editAssignment.used_hours) / 8).toFixed(1)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#666' }}>Used Days</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <RemainingBalance hoursLike={toNum(editAssignment.remaining_hours)} color={getStatusColor(toNum(editAssignment.remaining_hours), toNum(editAssignment.total_hours))} alignItems="flex-start" largeDays />
                          <Typography variant="caption" sx={{ color: '#666' }}>Remaining Balance</Typography>
                        </Grid>
                      </Grid>
                      {isEditing && (
                        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(109,35,35,0.1)' }}>
                          <Typography variant="caption" sx={{ color: '#888' }}>
                            New Allocation: <strong style={{ color: '#6d2323' }}>{parseFloat(editAllocatedDays) || 0}d ({editTotalHours} hrs)</strong>
                            &nbsp;·&nbsp; Carried balance (<strong style={{ color: '#2E7D32' }}>{parseFloat(editCarriedDays) || 0}d</strong>) is separate.
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Grid>
                </Grid>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, gap: 2 }}>
                  {!isEditing ? (
                    <>
                      <Button onClick={() => handleDelete(editAssignment.id)} variant="outlined" startIcon={<DeleteIcon />} sx={{ borderColor: '#d32f2f', color: '#d32f2f', borderRadius: 2, px: 3 }}>Delete</Button>
                      <Button onClick={handleStartEdit} variant="contained" startIcon={<EditIcon />} sx={{ bgcolor: '#6D2323', color: '#FFF', borderRadius: 2, px: 3, '&:hover': { bgcolor: '#5a1d1d' } }}>Edit</Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={handleCancelEdit} variant="outlined" startIcon={<CancelIcon />} sx={{ color: '#6d2323', borderColor: '#6d2323', borderRadius: 2, px: 3 }}>Cancel</Button>
                      <Button onClick={handleUpdate} variant="contained" startIcon={<SaveIcon />} sx={{ bgcolor: '#6D2323', color: '#FFF', borderRadius: 2, px: 3, '&:hover': { bgcolor: '#5a1d1d' } }}>Save Changes</Button>
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