import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Grid,
  Modal,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  List,
  ListItem,
  ListItemText,
  Card,
  Typography,
  Fade,
  Avatar,
  Tooltip,
  Button,
  TextField,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Close,
  Search as SearchIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Domain as DomainIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh,
  Group as GroupIcon,
  People as PeopleIcon,
  ChevronRight as ChevronRightIcon,
  ArrowBack as ArrowBackIcon,
  Reorder,
} from '@mui/icons-material';

import AccessDenied from '../AccessDenied';
import usePageAccess from '../../hooks/usePageAccess';
import { styled, alpha } from '@mui/material/styles';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePayrollRealtimeRefresh from '../../hooks/usePayrollRealtimeRefresh';

// ── Theme tokens (mirrors PersonTable) ───────────────────────
const T = {
  accent:       '#6d2323',
  accentDark:   '#5a1d1d',
  accentMid:    '#8B4545',
  accentFaint:  'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover:  'rgba(109,35,35,0.10)',
  headerGrad:   'linear-gradient(180deg,#6d2323 0%,#7e2c2c 100%)',
  rowEven:      '#ffffff',
  rowOdd:       'rgba(109,35,35,0.025)',
  rowHover:     'rgba(109,35,35,0.055)',
  text:         '#1a1a1a',
  muted:        '#6b6b6b',
  faint:        '#a0a0a0',
  surface:      '#ffffff',
  divider:      'rgba(0,0,0,0.08)',
  poppins:      "'Poppins', sans-serif",
};

// ── Auth helper ───────────────────────────────────────────────
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
};

// ── Styled primitives (mirrors PersonTable) ───────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: T.surface,
});

const FieldInput = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8,
    fontSize: '0.875rem',
    backgroundColor: '#fff',
    '& fieldset': { borderColor: T.accentBorder },
    '&:hover fieldset': { borderColor: T.accent },
    '&.Mui-focused fieldset': { borderColor: T.accent, borderWidth: 1.5 },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: T.accent },
});

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.875rem',
  letterSpacing: '0.01em',
  transition: 'all 0.18s ease',
  '&:hover': { transform: 'translateY(-1px)' },
  '&:active': { transform: 'translateY(0)' },
});

// ── Department Code Autocomplete ──────────────────────────────
const DeptCodeAutocomplete = ({ value, onChange, departmentCodes, placeholder = 'Type or select department code…', disabled = false }) => {
  const [query, setQuery]               = useState(value || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef                     = useRef(null);

  // Sync external value → local query
  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = departmentCodes.filter((c) =>
    c.toLowerCase().includes(query.toLowerCase()),
  );

  const handleInputChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    onChange(v);
    setShowDropdown(true);
  };

  const handleSelect = (code) => {
    setQuery(code);
    onChange(code);
    setShowDropdown(false);
  };

  return (
    <Box sx={{ position: 'relative', width: '100%' }} ref={dropdownRef}>
      <FieldInput
        value={query}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        onKeyDown={(e) => e.key === 'Escape' && setShowDropdown(false)}
        placeholder={placeholder}
        disabled={disabled}
        fullWidth
        autoComplete="off"
        size="small"
        InputProps={{
          startAdornment: <DomainIcon sx={{ color: T.muted, mr: 1, fontSize: 15 }} />,
          endAdornment: (
            <IconButton
              size="small"
              sx={{ color: T.muted }}
              onClick={() => setShowDropdown((p) => !p)}
              disabled={disabled}
            >
              {showDropdown ? <ExpandLessIcon sx={{ fontSize: 15 }} /> : <ExpandMoreIcon sx={{ fontSize: 15 }} />}
            </IconButton>
          ),
        }}
      />
      {showDropdown && !disabled && (
        <Paper
          elevation={4}
          sx={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            zIndex: 1300, maxHeight: 220, overflow: 'auto', mt: 0.75,
            borderRadius: 2, border: `1px solid ${T.accentBorder}`,
          }}
        >
          {filtered.length > 0 ? (
            <List dense disablePadding>
              {filtered.map((code) => (
                <ListItem
                  key={code}
                  button
                  onClick={() => handleSelect(code)}
                  sx={{
                    py: 0.9, px: 1.5,
                    '&:hover': { bgcolor: T.accentFaint },
                    borderBottom: `1px solid ${T.divider}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DomainIcon sx={{ fontSize: 14, color: T.accent }} />
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: T.text }}>
                      {code}
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.8rem', color: T.faint, fontStyle: 'italic' }}>
                {query ? `No match for "${query}" — you can still use it` : 'No department codes found'}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

// ── Employee Autocomplete (PersonTable style) ─────────────────
const EmployeeAutocomplete = ({
  value, onChange, placeholder = 'Search employee…',
  required = false, disabled = false,
  error = false, helperText = '',
  selectedEmployee, onEmployeeSelect,
}) => {
  const [query, setQuery]               = useState('');
  const [employees, setEmployees]       = useState([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef                     = useRef(null);
  const dropdownRef                     = useRef(null);

  useEffect(() => { if (value && !selectedEmployee) fetchById(value); }, [value]); // eslint-disable-line
  useEffect(() => {
    if (selectedEmployee) setQuery(selectedEmployee.name || '');
    else if (!value) setQuery('');
  }, [selectedEmployee, value]);
  useEffect(() => {
    const h = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const search = async (q) => {
    setIsLoading(true);
    try {
      const r = await axios.get(`${API_BASE_URL}/Remittance/employees/search?q=${encodeURIComponent(q)}`, getAuthHeaders());
      setEmployees(r.data);
    } catch { setEmployees([]); } finally { setIsLoading(false); }
  };
  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const r = await axios.get(`${API_BASE_URL}/Remittance/employees/search`, getAuthHeaders());
      setEmployees(r.data);
    } catch { setEmployees([]); } finally { setIsLoading(false); }
  };
  const fetchById = async (num) => {
    try {
      const r = await axios.get(`${API_BASE_URL}/Remittance/employees/${num}`, getAuthHeaders());
      onEmployeeSelect(r.data);
      setQuery(r.data.name || '');
    } catch { /* silent */ }
  };

  const handleInputChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    setShowDropdown(true);
    if (selectedEmployee && v !== selectedEmployee.name) { onEmployeeSelect(null); onChange(''); }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (v.trim().length >= 2) search(v);
      else if (v.trim().length === 0) fetchAll();
      else setEmployees([]);
    }, 300);
  };

  return (
    <Box sx={{ position: 'relative', width: '100%' }} ref={dropdownRef}>
      <FieldInput
        value={query}
        onChange={handleInputChange}
        onFocus={() => { setShowDropdown(true); if (!employees.length && !isLoading) { query.length >= 2 ? search(query) : fetchAll(); } }}
        onKeyDown={(e) => e.key === 'Escape' && setShowDropdown(false)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        error={error}
        helperText={helperText}
        fullWidth
        autoComplete="off"
        size="small"
        InputProps={{
          startAdornment: <PersonIcon sx={{ color: T.muted, mr: 1, fontSize: 15 }} />,
          endAdornment: (
            <IconButton
              onClick={() => { if (!showDropdown) { setShowDropdown(true); if (!employees.length && !isLoading) fetchAll(); } else setShowDropdown(false); }}
              size="small" sx={{ color: T.muted }}
            >
              {showDropdown ? <ExpandLessIcon sx={{ fontSize: 15 }} /> : <ExpandMoreIcon sx={{ fontSize: 15 }} />}
            </IconButton>
          ),
        }}
      />
      {showDropdown && (
        <Paper elevation={4} sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1400, maxHeight: 260, overflow: 'auto', mt: 0.75, borderRadius: 2, border: `1px solid ${T.accentBorder}` }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, gap: 1 }}>
              <CircularProgress size={16} sx={{ color: T.accent }} />
              <Typography sx={{ fontSize: '0.8rem', color: T.muted }}>Loading…</Typography>
            </Box>
          ) : employees.length > 0 ? (
            <List dense disablePadding>
              {employees.map((emp) => (
                <ListItem
                  key={emp.employeeNumber}
                  button
                  onClick={() => { onEmployeeSelect(emp); setQuery(emp.name); setShowDropdown(false); onChange(emp.employeeNumber); }}
                  sx={{ py: 1, px: 1.5, '&:hover': { bgcolor: T.accentFaint }, borderBottom: `1px solid ${T.divider}` }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 28, height: 28, fontSize: '0.72rem', bgcolor: T.accent, color: '#fff', fontWeight: 700 }}>
                      {emp.name?.charAt(0)?.toUpperCase() || '?'}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text }}>{emp.name}</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>#{emp.employeeNumber}</Typography>
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.8rem', color: T.faint, fontStyle: 'italic' }}>
                {query.length >= 2 ? `No employees found for "${query}"` : 'Type to search or scroll to browse'}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

// ── Department card / row (PersonTable-styled) ────────────────
const DeptCard = ({ department, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      p: 2, borderRadius: 2, cursor: 'pointer', bgcolor: '#fff',
      border: `1px solid ${T.accentBorder}`,
      transition: 'all 0.13s',
      '&:hover': {
        bgcolor: T.rowHover,
        borderColor: T.accent,
        transform: 'translateY(-2px)',
        boxShadow: `0 4px 14px ${alpha(T.accent, 0.1)}`,
      },
      display: 'flex', flexDirection: 'column', height: '100%',
    }}
  >
    <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(T.accent, 0.12), color: T.accent, fontSize: '0.78rem', fontWeight: 700, mb: 0.75 }}>
      <DomainIcon sx={{ fontSize: 16 }} />
    </Avatar>
    <Typography sx={{ fontSize: '0.72rem', color: T.faint, mb: 0.25 }}>Code</Typography>
    <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text, lineHeight: 1.2 }} noWrap>
      {department.code}
    </Typography>
    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.3, borderRadius: 6, bgcolor: alpha(T.accent, 0.08), width: 'fit-content' }}>
      <PeopleIcon sx={{ fontSize: 11, color: T.accent }} />
      <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: T.accent }}>
        {department.employees.length} {department.employees.length === 1 ? 'employee' : 'employees'}
      </Typography>
    </Box>
  </Box>
);

const DeptRow = ({ department, index, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      px: 1.5, py: 1.25,
      display: 'grid', gridTemplateColumns: '1fr auto',
      gap: 1, alignItems: 'center',
      borderRadius: 1.5, cursor: 'pointer',
      bgcolor: index % 2 === 0 ? T.rowEven : T.rowOdd,
      border: '1px solid transparent',
      transition: 'background 0.13s ease',
      '&:hover': { bgcolor: T.rowHover },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <DomainIcon sx={{ fontSize: 15, color: T.accent }} />
      <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: T.text }} noWrap>{department.code}</Typography>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.3, borderRadius: 6, bgcolor: alpha(T.accent, 0.08) }}>
      <PeopleIcon sx={{ fontSize: 11, color: T.accent }} />
      <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: T.accent }}>{department.employees.length}</Typography>
    </Box>
  </Box>
);

// ── Main Component ────────────────────────────────────────────
const DepartmentAssignment = () => {
  const { settings } = useSystemSettings();

  const [data, setData]                         = useState([]);
  const [departmentData, setDepartmentData]     = useState([]);
  const [newAssignment, setNewAssignment]       = useState({ code: '', employeeNumber: '' });
  const [searchTerm, setSearchTerm]             = useState('');
  const [departmentCodes, setDepartmentCodes]   = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [viewMode, setViewMode]                 = useState('grid');
  const [snackbar, setSnackbar]                 = useState({ open: false, message: '', severity: 'success' });
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Modal state
  const [modalOpen, setModalOpen]                                 = useState(false);
  const [selectedDepartment, setSelectedDepartment]               = useState(null);
  const [departmentEmployeeDetails, setDepartmentEmployeeDetails] = useState({});
  const [modalView, setModalView]                                 = useState('list');
  const [editAssignment, setEditAssignment]                       = useState(null);
  const [originalAssignment, setOriginalAssignment]               = useState(null);
  const [selectedEditEmployee, setSelectedEditEmployee]           = useState(null);

  const showSnackbar = (msg, sev = 'success') => setSnackbar({ open: true, message: msg, severity: sev });

  const { hasAccess, loading: accessLoading } = usePageAccess('department-assignment');

  useEffect(() => { fetchAssignments(); fetchDepartmentCodes(); }, []);

  useEffect(() => {
    const grouped = data.reduce((acc, a) => {
      const code = a.code || 'Unassigned';
      if (!acc[code]) acc[code] = { code, employees: [] };
      acc[code].employees.push(a);
      return acc;
    }, {});
    setDepartmentData(Object.values(grouped));
  }, [data]);

  const fetchAssignments = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/api/department-assignment`, getAuthHeaders());
      setData(Array.isArray(r.data) ? r.data : []);
    } catch { showSnackbar('Failed to fetch department assignments.', 'error'); }
  };

  const fetchDepartmentCodes = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/api/department-table`, getAuthHeaders());
      setDepartmentCodes(r.data.map((i) => i.code));
    } catch { /* silent */ }
  };

  usePayrollRealtimeRefresh(() => { fetchAssignments(); fetchDepartmentCodes(); });

  // ── CRUD ─────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!newAssignment.employeeNumber?.trim()) { showSnackbar('Please select an employee', 'error'); return; }
    setLoading(true);
    try {
      const payload = Object.fromEntries(Object.entries(newAssignment).filter(([, v]) => v !== ''));
      await axios.post(`${API_BASE_URL}/api/department-assignment`, payload, getAuthHeaders());
      setNewAssignment({ code: '', employeeNumber: '' });
      setSelectedEmployee(null);
      showSnackbar('Employee assigned to department successfully!');
      fetchAssignments();
    } catch { showSnackbar('Failed to add department assignment.', 'error'); }
    finally { setLoading(false); }
  };

  const handleUpdate = async () => {
    try {
      await axios.put(`${API_BASE_URL}/api/department-assignment/${editAssignment.id}`, editAssignment, getAuthHeaders());
      showSnackbar('Department assignment updated successfully!');
      await fetchAssignments();
      const res = await axios.get(`${API_BASE_URL}/api/department-assignment`, getAuthHeaders());
      const all = Array.isArray(res.data) ? res.data : [];
      if (selectedDepartment) {
        const refreshed = all.filter((a) => a.code === selectedDepartment.code);
        setSelectedDepartment({ ...selectedDepartment, employees: refreshed });
      }
      goBackToList();
    } catch { showSnackbar('Failed to update department assignment.', 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/department-assignment/${id}`, getAuthHeaders());
      showSnackbar('Department assignment deleted successfully!');
      await fetchAssignments();
      if (selectedDepartment) {
        const updated = selectedDepartment.employees.filter((e) => e.id !== id);
        setSelectedDepartment({ ...selectedDepartment, employees: updated });
        if (modalView === 'edit') goBackToList();
      }
    } catch { showSnackbar('Failed to delete department assignment.', 'error'); }
  };

  // ── Modal controls ────────────────────────────────────────
  const handleOpenDepartmentModal = async (department) => {
    setSelectedDepartment(department);
    setModalView('list');
    setModalOpen(true);
    const map = {};
    await Promise.all(
      department.employees.map(async (a) => {
        if (!a.employeeNumber) return;
        try {
          const r = await axios.get(`${API_BASE_URL}/Remittance/employees/${a.employeeNumber}`, getAuthHeaders());
          map[a.employeeNumber] = r.data;
        } catch {
          map[a.employeeNumber] = { employeeNumber: a.employeeNumber, name: a.name || 'Unknown Employee' };
        }
      }),
    );
    setDepartmentEmployeeDetails(map);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalView('list');
    setEditAssignment(null);
    setOriginalAssignment(null);
    setSelectedEditEmployee(null);
    setSelectedDepartment(null);
    setDepartmentEmployeeDetails({});
  };

  const goToEdit = async (assignment) => {
    setEditAssignment({ ...assignment });
    setOriginalAssignment({ ...assignment });
    setModalView('edit');
    if (assignment.employeeNumber) {
      try {
        const r = await axios.get(`${API_BASE_URL}/Remittance/employees/${assignment.employeeNumber}`, getAuthHeaders());
        setSelectedEditEmployee(r.data);
      } catch { setSelectedEditEmployee(null); }
    }
  };

  const goBackToList = () => {
    setModalView('list');
    setEditAssignment(null);
    setOriginalAssignment(null);
    setSelectedEditEmployee(null);
  };

  const hasChanges = () => {
    if (!editAssignment || !originalAssignment) return false;
    return (
      editAssignment.code !== originalAssignment.code ||
      editAssignment.employeeNumber !== originalAssignment.employeeNumber
    );
  };

  // ── Access guard ──────────────────────────────────────────
  if (accessLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
        <CircularProgress sx={{ color: T.accent, mb: 2 }} />
        <Typography sx={{ color: T.accent }}>Loading access information…</Typography>
      </Box>
    );
  }
  if (hasAccess === false) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Department Assignment."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }

  const filteredDepartmentData = departmentData.filter((d) =>
    (d.code?.toLowerCase() || '').includes(searchTerm.toLowerCase()),
  );

  return (
    <Fade in timeout={400}>
      <Box sx={{
        py: { xs: 1, md: 2 },
        mt: { xs: 0, md: -2 },
        mb: { xs: 1, md: 2 },
        width: '100vw',
        maxWidth: '100%',
        position: 'relative',
        left: '63%',
        transform: 'translateX(-61%)',
        px: { xs: 2, sm: 3, md: 6 },
      }}>

        {/* ── Page Header ── */}
        <SectionCard sx={{ mb: 2, overflow: 'hidden' }}>
          <Box sx={{
            px: 4, py: 3,
            background: 'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'relative', overflow: 'hidden',
          }}>
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)' }} />
            <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)' }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
              <DomainIcon sx={{ fontSize: 32, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3 }}>
                  Department Assignment Management
                </Typography>
                <Typography sx={{ fontSize: '0.82rem', color: T.accentMid, fontWeight: 700, opacity: 0.9 }}>
                  Administrative Panel • Assign and manage employee department records
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
              <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                <Typography sx={{ fontSize: '0.8rem', color: T.accent, fontWeight: 700 }}>
                  {data.length} {data.length === 1 ? 'assignment' : 'assignments'}
                </Typography>
              </Box>
              <Tooltip title="Refresh Data">
                <IconButton onClick={() => { fetchAssignments(); fetchDepartmentCodes(); }} sx={{ bgcolor: alpha(T.accent, 0.08), color: T.accent, width: 36, height: 36, '&:hover': { bgcolor: alpha(T.accent, 0.15) } }}>
                  <Refresh sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </SectionCard>

        {/* ── Two-column layout ── */}
        <Grid container spacing={2}>

          {/* LEFT: Add Assignment */}
          <Grid item xs={12} lg={5}>
            <SectionCard sx={{ height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>

              {/* Panel header */}
              <Box sx={{ px: 3.5, py: 1.25, borderBottom: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: T.accentFaint, flexShrink: 0 }}>
                <AddIcon sx={{ fontSize: 15, color: T.accent }} />
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.accent }}>
                  Assign Employee to Department
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>
                  <Box component="span" sx={{ color: '#c62828' }}>*</Box> required
                </Typography>
              </Box>

              {/* Form */}
              <Box sx={{
                px: 3, py: 2,
                flexGrow: 1,
                overflowY: 'auto',
                '&::-webkit-scrollbar': { width: 4 },
                '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
              }}>
                <Grid container spacing={2}>

                  {/* Department Code */}
                  <Grid item xs={12}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.accent, mb: 0.75 }}>
                      Department Code
                    </Typography>
                    <DeptCodeAutocomplete
                      value={newAssignment.code}
                      onChange={(val) => setNewAssignment({ ...newAssignment, code: val })}
                      departmentCodes={departmentCodes}
                    />
                  </Grid>

                  {/* Employee */}
                  <Grid item xs={12}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.accent, mb: 0.75 }}>
                      Search Employee <Box component="span" sx={{ color: '#c62828' }}>*</Box>
                    </Typography>
                    <EmployeeAutocomplete
                      value={newAssignment.employeeNumber}
                      onChange={(num) => setNewAssignment({ ...newAssignment, employeeNumber: num })}
                      selectedEmployee={selectedEmployee}
                      onEmployeeSelect={setSelectedEmployee}
                      placeholder="Search and select employee…"
                      required
                    />
                  </Grid>

                  {/* Selected employee preview */}
                  <Grid item xs={12}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.accent, mb: 0.75 }}>
                      Selected Employee
                    </Typography>
                    {selectedEmployee ? (
                      <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        p: '10px 14px', borderRadius: 2,
                        border: `1px solid ${alpha(T.accent, 0.25)}`,
                        bgcolor: T.accentFaint,
                      }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: T.accent, color: '#fff', fontSize: '0.78rem', fontWeight: 700 }}>
                          {selectedEmployee.name?.charAt(0)?.toUpperCase() || '?'}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: T.text, lineHeight: 1.2 }}>
                            {selectedEmployee.name}
                          </Typography>
                          <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>
                            #{selectedEmployee.employeeNumber}
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        minHeight: 52, borderRadius: 2,
                        border: `1.5px dashed ${alpha(T.accent, 0.22)}`,
                        bgcolor: 'rgba(0,0,0,0.02)',
                      }}>
                        <Typography sx={{ fontSize: '0.8rem', color: T.faint, fontStyle: 'italic' }}>
                          No employee selected
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </Box>

              {/* Footer */}
              <Box sx={{
                px: 3, py: 1.5,
                borderTop: `1px solid ${T.divider}`,
                bgcolor: T.accentFaint,
                flexShrink: 0,
              }}>
                <AccentButton
                  onClick={handleAdd}
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <AddIcon sx={{ fontSize: '16px !important' }} />}
                  fullWidth
                  disabled={loading}
                  sx={{
                    height: 38, bgcolor: T.accent, color: '#fff',
                    boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`,
                    '&:hover': { bgcolor: T.accentDark },
                  }}
                >
                  {loading ? 'Assigning…' : 'Assign Employee'}
                </AccentButton>
              </Box>
            </SectionCard>
          </Grid>

          {/* RIGHT: Department Records */}
          <Grid item xs={12} lg={7}>
            <SectionCard sx={{ height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>

              {/* Records header */}
              <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Reorder sx={{ fontSize: 17, color: T.accent }} />
                    <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: T.text }}>
                      Department Records
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Box sx={{ px: 1.5, py: 0.4, borderRadius: 6, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${alpha(T.accent, 0.15)}` }}>
                      <Typography sx={{ fontSize: '0.72rem', color: T.accent, fontWeight: 700 }}>
                        {filteredDepartmentData.length} departments
                      </Typography>
                    </Box>
                    <ToggleButtonGroup
                      value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small"
                      sx={{
                        '& .MuiToggleButton-root': {
                          px: 1, py: 0.35,
                          border: `1px solid ${T.accentBorder}`,
                          color: T.muted,
                          '&.Mui-selected': { bgcolor: T.accentFaint, color: T.accent },
                        },
                      }}
                    >
                      <ToggleButton value="grid"><ViewModuleIcon sx={{ fontSize: 14 }} /></ToggleButton>
                      <ToggleButton value="list"><ViewListIcon sx={{ fontSize: 14 }} /></ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                </Box>
                <FieldInput
                  size="small"
                  placeholder="Search by department code…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  fullWidth
                  InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 15, color: T.muted, mr: 0.5 }} /> }}
                />
              </Box>

              {/* Records content */}
              <Box sx={{
                flexGrow: 1, overflowY: 'auto', p: 2,
                '&::-webkit-scrollbar': { width: 4 },
                '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
              }}>
                {filteredDepartmentData.length === 0 ? (
                  <Box sx={{ py: 10, textAlign: 'center' }}>
                    <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                      <DomainIcon sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                    </Box>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>
                      {data.length === 0 ? 'No assignments yet' : 'No departments match your search'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>
                      {data.length === 0 ? 'Use the form on the left to assign employees.' : 'Try a different search term.'}
                    </Typography>
                  </Box>
                ) : viewMode === 'grid' ? (
                  <Grid container spacing={1.5} alignItems="stretch">
                    {filteredDepartmentData.map((dept) => (
                      <Grid item xs={12} sm={4} md={2} key={dept.code} sx={{ display: 'flex' }}>
                        <DeptCard department={dept} onClick={() => handleOpenDepartmentModal(dept)} />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <>
                    <Box sx={{
                      px: 1.5, py: 1,
                      display: 'grid', gridTemplateColumns: '1fr auto',
                      gap: 1, alignItems: 'center',
                      bgcolor: alpha(T.accent, 0.04), borderRadius: 1.5, mb: 1,
                    }}>
                      {['Department Code', 'Employees'].map((col) => (
                        <Typography key={col} sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                          {col}
                        </Typography>
                      ))}
                    </Box>
                    {filteredDepartmentData.map((dept, i) => (
                      <DeptRow key={dept.code} department={dept} index={i} onClick={() => handleOpenDepartmentModal(dept)} />
                    ))}
                  </>
                )}
              </Box>
            </SectionCard>
          </Grid>
        </Grid>

        {/* ── Department Modal ── */}
        <Modal open={modalOpen} onClose={handleCloseModal} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Fade in={modalOpen}>
            <Box sx={{
              width: 520, maxHeight: '72vh',
              display: 'flex', flexDirection: 'column',
              borderRadius: 3, overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
              outline: 'none', bgcolor: T.surface,
            }}>
              {selectedDepartment && (
                <>
                  {/* Modal header */}
                  <Box sx={{
                    px: 2.5, py: 1.8,
                    background: T.headerGrad,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexShrink: 0,
                  }}>
                    {modalView === 'list' ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <DomainIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.85)' }} />
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#fff', lineHeight: 1.2 }}>
                            {selectedDepartment.code}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
                            {selectedDepartment.employees.length} {selectedDepartment.employees.length === 1 ? 'employee' : 'employees'}
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccentButton
                          onClick={goBackToList}
                          startIcon={<ArrowBackIcon sx={{ fontSize: '13px !important' }} />}
                          sx={{
                            color: 'rgba(255,255,255,0.85)', fontSize: 11, px: 1, py: 0.3,
                            borderRadius: 1.5, minWidth: 0,
                            bgcolor: 'rgba(255,255,255,0.12)',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.22)', transform: 'none' },
                          }}
                        >
                          Back
                        </AccentButton>
                        <Box sx={{ width: 1, height: 20, bgcolor: 'rgba(255,255,255,0.25)', mx: 0.5 }} />
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#fff', lineHeight: 1.2 }}>Edit Assignment</Typography>
                          {selectedEditEmployee && (
                            <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>{selectedEditEmployee.name}</Typography>
                          )}
                        </Box>
                      </Box>
                    )}
                    <IconButton onClick={handleCloseModal} size="small"
                      sx={{ color: 'rgba(255,255,255,0.75)', bgcolor: 'rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' }, width: 28, height: 28 }}>
                      <Close sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Box>

                  {/* Sliding panels */}
                  <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
                    <Box sx={{
                      display: 'flex', width: '200%', height: '100%',
                      transform: modalView === 'edit' ? 'translateX(-50%)' : 'translateX(0)',
                      transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}>

                      {/* Panel 1: Employee grid */}
                      <Box sx={{
                        width: '50%', height: '100%', overflowY: 'auto', p: 2,
                        '&::-webkit-scrollbar': { width: 4 },
                        '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
                      }}>
                        {selectedDepartment.employees.length === 0 ? (
                          <Box sx={{ textAlign: 'center', py: 6 }}>
                            <PeopleIcon sx={{ fontSize: 36, color: alpha(T.accent, 0.18), mb: 1 }} />
                            <Typography sx={{ color: T.text, fontWeight: 700, mb: 0.5, fontSize: 14 }}>No Employees</Typography>
                            <Typography sx={{ color: T.faint, fontSize: 12 }}>This department has no assigned employees yet</Typography>
                          </Box>
                        ) : (
                          <Grid container spacing={1.2}>
                            {selectedDepartment.employees.map((emp) => (
                              <Grid item xs={6} key={emp.id}>
                                <Box sx={{
                                  p: '10px 12px', borderRadius: 2, bgcolor: '#fff',
                                  border: `1px solid ${T.accentBorder}`,
                                  transition: 'border-color 0.13s, box-shadow 0.13s',
                                  '&:hover': { borderColor: T.accent, boxShadow: `0 2px 8px ${alpha(T.accent, 0.08)}` },
                                }}>
                                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, mb: 0.2 }}>
                                    #{emp.employeeNumber}
                                  </Typography>
                                  <Typography noWrap sx={{ fontSize: '0.82rem', fontWeight: 600, color: T.text, mb: 1 }}>
                                    {departmentEmployeeDetails[emp.employeeNumber]?.name || emp.name || 'No Name'}
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 0.75 }}>
                                    <IconButton size="small" onClick={() => goToEdit(emp)}
                                      sx={{ color: T.accent, bgcolor: T.accentFaint, '&:hover': { bgcolor: T.accentHover }, borderRadius: '6px', width: 26, height: 26 }}>
                                      <EditIcon sx={{ fontSize: 13 }} />
                                    </IconButton>
                                    <IconButton size="small" onClick={() => handleDelete(emp.id)}
                                      sx={{ color: '#c62828', bgcolor: 'rgba(198,40,40,0.06)', '&:hover': { bgcolor: 'rgba(198,40,40,0.14)' }, borderRadius: '6px', width: 26, height: 26 }}>
                                      <DeleteIcon sx={{ fontSize: 13 }} />
                                    </IconButton>
                                  </Box>
                                </Box>
                              </Grid>
                            ))}
                          </Grid>
                        )}
                      </Box>

                      {/* Panel 2: Edit form */}
                      <Box sx={{ width: '50%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <Box sx={{
                          flex: 1, overflowY: 'auto', p: 2.5,
                          '&::-webkit-scrollbar': { width: 4 },
                          '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
                        }}>
                          {editAssignment && (
                            <Grid container spacing={2}>
                              <Grid item xs={12}>
                                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.accent, mb: 0.75 }}>Department Code</Typography>
                                <DeptCodeAutocomplete
                                  value={editAssignment.code || ''}
                                  onChange={(val) => setEditAssignment((p) => ({ ...p, code: val }))}
                                  departmentCodes={departmentCodes}
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.accent, mb: 0.75 }}>Search Employee</Typography>
                                <EmployeeAutocomplete
                                  value={editAssignment.employeeNumber || ''}
                                  onChange={(num) => setEditAssignment((p) => ({ ...p, employeeNumber: num }))}
                                  selectedEmployee={selectedEditEmployee}
                                  onEmployeeSelect={setSelectedEditEmployee}
                                  placeholder="Search and select employee…"
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.accent, mb: 0.75 }}>Selected Employee</Typography>
                                {selectedEditEmployee ? (
                                  <Box sx={{
                                    display: 'flex', alignItems: 'center', gap: 1.5,
                                    p: '10px 14px', borderRadius: 2,
                                    border: `1px solid ${alpha(T.accent, 0.25)}`,
                                    bgcolor: T.accentFaint,
                                  }}>
                                    <Avatar sx={{ width: 28, height: 28, bgcolor: T.accent, color: '#fff', fontSize: '0.72rem', fontWeight: 700 }}>
                                      {selectedEditEmployee.name?.charAt(0)?.toUpperCase() || '?'}
                                    </Avatar>
                                    <Box>
                                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text, lineHeight: 1.2 }}>{selectedEditEmployee.name}</Typography>
                                      <Typography sx={{ fontSize: '0.7rem', color: T.muted }}>#{editAssignment.employeeNumber}</Typography>
                                    </Box>
                                  </Box>
                                ) : (
                                  <Box sx={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    minHeight: 44, borderRadius: 2,
                                    border: `1.5px dashed ${alpha(T.accent, 0.22)}`,
                                    bgcolor: 'rgba(0,0,0,0.02)',
                                  }}>
                                    <Typography sx={{ fontSize: '0.8rem', color: T.faint, fontStyle: 'italic' }}>No employee selected</Typography>
                                  </Box>
                                )}
                              </Grid>
                            </Grid>
                          )}
                        </Box>

                        {/* Sticky footer */}
                        <Box sx={{
                          borderTop: `1px solid ${T.divider}`,
                          px: 2.5, py: 1.8,
                          display: 'flex', gap: 1, justifyContent: 'flex-end',
                          bgcolor: '#f9f9f9', flexShrink: 0,
                        }}>
                          <AccentButton
                            onClick={goBackToList}
                            variant="outlined"
                            startIcon={<CancelIcon sx={{ fontSize: '14px !important' }} />}
                            sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}
                          >
                            Cancel
                          </AccentButton>
                          <AccentButton
                            onClick={handleUpdate}
                            variant="contained"
                            startIcon={<SaveIcon sx={{ fontSize: '14px !important' }} />}
                            disabled={!hasChanges()}
                            sx={{
                              fontSize: '0.8rem',
                              bgcolor: '#639922', color: '#fff',
                              boxShadow: '0 2px 10px rgba(99,153,34,0.32)',
                              '&:hover': { bgcolor: '#3B6D11' },
                              '&:disabled': { bgcolor: '#b9c7a5 !important', color: '#fff !important' },
                            }}
                          >
                            Save
                          </AccentButton>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </>
              )}
            </Box>
          </Fade>
        </Modal>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Fade>
  );
};

export default DepartmentAssignment;