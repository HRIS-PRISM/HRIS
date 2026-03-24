import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  TextField,
  Button,
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
  CardContent,
  FormControl,
  Select,
  MenuItem,
  Fade,
  Avatar,
  Tooltip,
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
} from '@mui/icons-material';

import AccessDenied from '../AccessDenied';
import { useNavigate } from 'react-router-dom';
import usePageAccess from '../../hooks/usePageAccess';
import { styled, alpha } from '@mui/material/styles';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePayrollRealtimeRefresh from '../../hooks/usePayrollRealtimeRefresh';

// ── Helpers ───────────────────────────────────────────────────
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '109, 35, 35';
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

// ── Styled components ─────────────────────────────────────────
const GlassCard = styled(Paper)(() => ({
  borderRadius: 20,
  backdropFilter: 'blur(10px)',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': { transform: 'translateY(-4px)' },
}));

const ProfessionalButton = styled(Button)(({ variant }) => ({
  borderRadius: 12,
  fontWeight: 600,
  padding: '10px 20px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  textTransform: 'none',
  fontSize: '0.9rem',
  letterSpacing: '0.025em',
  boxShadow: variant === 'contained' ? '0 4px 14px rgba(254,249,225,0.25)' : 'none',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: variant === 'contained' ? '0 6px 20px rgba(254,249,225,0.35)' : 'none',
  },
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
      boxShadow: '0 4px 20px rgba(254,249,225,0.25)',
      backgroundColor: 'rgba(255,255,255,1)',
    },
  },
  '& .MuiInputLabel-root': { fontWeight: 500 },
}));

// ── Accent dept card (grid, main panel) ──────────────────────
const AccentDeptCard = ({ department, settings, accentColor, textPrimaryColor, textSecondaryColor, onClick }) => {
  const primary = settings.primaryColor || accentColor || '#6d2323';
  const txtPri  = settings.textPrimaryColor   || textPrimaryColor   || '#6d2323';
  const txtSec  = settings.textSecondaryColor || textSecondaryColor || '#888';

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        borderRadius: '12px',
        border: `0.5px solid ${alpha(primary, 0.15)}`,
        overflow: 'hidden',
        cursor: 'pointer',
        backgroundColor: 'rgba(255,255,255,0.85)',
        height: '100%',
        transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
        '&:hover': {
          borderColor: alpha(primary, 0.5),
          boxShadow: `0 4px 16px ${alpha(primary, 0.1)}`,
          transform: 'translateY(-2px)',
          '& .accent-bar': { opacity: 1 },
          '& .open-label': { color: primary },
        },
      }}
    >
      <Box className="accent-bar" sx={{ width: '4px', flexShrink: 0, backgroundColor: primary, opacity: 0.7, transition: 'opacity 0.18s' }} />
      <Box sx={{ p: '14px 14px 12px', flex: 1, minWidth: 0 }}>
        {/* Code row — no bold, no "Department" label beneath */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: '10px' }}>
          <DomainIcon sx={{ fontSize: 15, color: primary, flexShrink: 0 }} />
          <Typography noWrap sx={{ fontSize: '13px', fontWeight: 400, color: txtPri, lineHeight: 1.3 }}>
            {department.code}
          </Typography>
        </Box>

        {/* Footer */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: alpha(primary, 0.08), borderRadius: '4px', px: '8px', py: '3px' }}>
            <PeopleIcon sx={{ fontSize: 12, color: primary }} />
            <Typography sx={{ fontSize: '11px', fontWeight: 600, color: primary, lineHeight: 1 }}>
              {department.employees.length} {department.employees.length === 1 ? 'employee' : 'employees'}
            </Typography>
          </Box>
          <Box className="open-label" sx={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', color: txtSec, fontWeight: 500, transition: 'color 0.15s', userSelect: 'none' }}>
            Open <ChevronRightIcon sx={{ fontSize: 14 }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

// ── Accent dept row (list, main panel) ───────────────────────
const AccentDeptRow = ({ department, settings, accentColor, textPrimaryColor, textSecondaryColor, onClick }) => {
  const primary = settings.primaryColor || accentColor || '#6d2323';
  const txtPri  = settings.textPrimaryColor   || textPrimaryColor   || '#333';
  const txtSec  = settings.textSecondaryColor || textSecondaryColor || '#666';
  const bg      = settings.accentColor || settings.backgroundColor  || '#FEF9E1';

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        borderRadius: '10px',
        border: `0.5px solid ${alpha(primary, 0.12)}`,
        overflow: 'hidden',
        cursor: 'pointer',
        backgroundColor: 'rgba(255,255,255,0.85)',
        mb: 1,
        transition: 'border-color 0.15s, background 0.15s',
        '&:hover': {
          borderColor: alpha(primary, 0.45),
          backgroundColor: alpha(bg, 0.4),
          '& .accent-bar': { opacity: 1 },
          '& .open-label': { color: primary },
        },
      }}
    >
      <Box className="accent-bar" sx={{ width: '4px', flexShrink: 0, backgroundColor: primary, opacity: 0.5, transition: 'opacity 0.15s' }} />
      <Box sx={{ flex: 1, px: 2, py: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DomainIcon sx={{ fontSize: 18, color: primary }} />
          <Typography sx={{ fontSize: '13px', fontWeight: 400, color: txtPri, lineHeight: 1.2 }}>
            {department.code}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: alpha(primary, 0.08), borderRadius: '4px', px: '8px', py: '3px' }}>
            <PeopleIcon sx={{ fontSize: 12, color: primary }} />
            <Typography sx={{ fontSize: '11px', fontWeight: 600, color: primary }}>{department.employees.length}</Typography>
          </Box>
          <Box className="open-label" sx={{ display: 'flex', alignItems: 'center', fontSize: '11px', color: txtSec, fontWeight: 500, transition: 'color 0.15s', userSelect: 'none' }}>
            <ChevronRightIcon sx={{ fontSize: 16 }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

// ── Employee Autocomplete ─────────────────────────────────────
const EmployeeAutocomplete = ({ value, onChange, placeholder = 'Search employee...', required = false, disabled = false, error = false, helperText = '', selectedEmployee, onEmployeeSelect, settings = {} }) => {
  const [query, setQuery]               = useState('');
  const [employees, setEmployees]       = useState([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => { if (value && !selectedEmployee) fetchEmployeeById(value); }, [value]);
  useEffect(() => {
    if (selectedEmployee) setQuery(selectedEmployee.name || '');
    else if (!value) setQuery('');
  }, [selectedEmployee, value]);
  useEffect(() => {
    const handle = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const fetchEmployees = async (q) => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/Remittance/employees/search?q=${encodeURIComponent(q)}`, getAuthHeaders());
      setEmployees(res.data);
    } catch { setEmployees([]); } finally { setIsLoading(false); }
  };
  const fetchAllEmployees = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/Remittance/employees/search`, getAuthHeaders());
      setEmployees(res.data);
    } catch { setEmployees([]); } finally { setIsLoading(false); }
  };
  const fetchEmployeeById = async (num) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/Remittance/employees/${num}`, getAuthHeaders());
      onEmployeeSelect(res.data);
      setQuery(res.data.name || '');
    } catch { /* silent */ }
  };

  const handleInputChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    setShowDropdown(true);
    if (selectedEmployee && v !== selectedEmployee.name) { onEmployeeSelect(null); onChange(''); }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (v.trim().length >= 2) fetchEmployees(v);
      else if (v.trim().length === 0) fetchAllEmployees();
      else setEmployees([]);
    }, 300);
  };
  const handleSelect = (emp) => { onEmployeeSelect(emp); setQuery(emp.name); setShowDropdown(false); onChange(emp.employeeNumber); };
  const handleFocus  = () => { setShowDropdown(true); if (!employees.length && !isLoading) { query.length >= 2 ? fetchEmployees(query) : fetchAllEmployees(); } };
  const handleToggle = () => { if (!showDropdown) { setShowDropdown(true); if (!employees.length && !isLoading) fetchAllEmployees(); } else setShowDropdown(false); };

  const primary = settings?.textPrimaryColor || settings?.primaryColor || '#6D2323';

  return (
    <Box sx={{ position: 'relative', width: '100%' }} ref={dropdownRef}>
      <ModernTextField
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={(e) => { if (e.key === 'Escape') setShowDropdown(false); }}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        error={error}
        helperText={helperText}
        fullWidth
        autoComplete="off"
        size="small"
        InputProps={{
          startAdornment: <PersonIcon sx={{ color: primary, mr: 1 }} />,
          endAdornment: (
            <IconButton onClick={handleToggle} size="small" sx={{ color: primary }}>
              {showDropdown ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          ),
        }}
      />
      {showDropdown && (
        <Paper elevation={3} sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1400, maxHeight: 240, overflow: 'auto', mt: 1, borderRadius: 2 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={18} /><Typography variant="body2" sx={{ ml: 1 }}>Loading...</Typography>
            </Box>
          ) : employees.length > 0 ? (
            <List dense>
              {employees.map((emp) => (
                <ListItem key={emp.employeeNumber} button onClick={() => handleSelect(emp)}
                  sx={{ '&:hover': { backgroundColor: alpha(settings?.accentColor || '#FEF9E1', 0.3) } }}>
                  <ListItemText
                    primary={emp.name}
                    secondary={`#${emp.employeeNumber}`}
                    primaryTypographyProps={{ fontWeight: 'bold', color: settings?.textPrimaryColor || '#6D2323' }}
                    secondaryTypographyProps={{ color: '#a31d1d', fontWeight: 700, fontSize: '0.9rem' }}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                {query.length >= 2 ? `No employees found matching "${query}"` : 'Type to search or scroll to browse'}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

// ── Main Component ────────────────────────────────────────────
const DepartmentAssignment = () => {
  const { settings } = useSystemSettings();

  const primaryColor       = settings.accentColor        || '#FEF9E1';
  const secondaryColor     = settings.backgroundColor    || '#FFF8E7';
  const accentColor        = settings.primaryColor       || '#6d2323';
  const accentDark         = settings.secondaryColor     || '#8B3333';
  const textPrimaryColor   = settings.textPrimaryColor   || '#6d2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';

  const [data, setData]                         = useState([]);
  const [departmentData, setDepartmentData]     = useState([]);
  const [newAssignment, setNewAssignment]       = useState({ code: '', name: '', employeeNumber: '' });
  const [searchTerm, setSearchTerm]             = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [departmentCodes, setDepartmentCodes]   = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [viewMode, setViewMode]                 = useState('grid');
  const [snackbar, setSnackbar]                 = useState({ open: false, message: '', severity: 'success' });
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Single modal state
  const [modalOpen, setModalOpen]                                 = useState(false);
  const [selectedDepartment, setSelectedDepartment]               = useState(null);
  const [departmentEmployeeDetails, setDepartmentEmployeeDetails] = useState({});
  const [modalView, setModalView]                                 = useState('list');
  const [editAssignment, setEditAssignment]                       = useState(null);
  const [originalAssignment, setOriginalAssignment]               = useState(null);
  const [selectedEditEmployee, setSelectedEditEmployee]           = useState(null);

  const showSnackbar = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

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
      const res = await axios.get(`${API_BASE_URL}/api/department-assignment`, getAuthHeaders());
      setData(Array.isArray(res.data) ? res.data : []);
    } catch { showSnackbar('Failed to fetch department assignments.', 'error'); }
  };

  const fetchDepartmentCodes = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/department-table`, getAuthHeaders());
      setDepartmentCodes(res.data.map((i) => i.code));
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
      setNewAssignment({ code: '', name: '', employeeNumber: '' });
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
          const res = await axios.get(`${API_BASE_URL}/Remittance/employees/${a.employeeNumber}`, getAuthHeaders());
          map[a.employeeNumber] = res.data;
        } catch {
          map[a.employeeNumber] = { employeeNumber: a.employeeNumber, name: a.name || 'Unknown Employee' };
        }
      })
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
        const res = await axios.get(`${API_BASE_URL}/Remittance/employees/${assignment.employeeNumber}`, getAuthHeaders());
        setSelectedEditEmployee(res.data);
      } catch { setSelectedEditEmployee(null); }
    }
  };

  const goBackToList = () => {
    setModalView('list');
    setEditAssignment(null);
    setOriginalAssignment(null);
    setSelectedEditEmployee(null);
  };

  const handleEditChange = (field, value) => setEditAssignment((prev) => ({ ...prev, [field]: value }));

  const hasChanges = () => {
    if (!editAssignment || !originalAssignment) return false;
    return (
      editAssignment.code !== originalAssignment.code ||
      editAssignment.name !== originalAssignment.name ||
      editAssignment.employeeNumber !== originalAssignment.employeeNumber
    );
  };

  // ── Access guard ──────────────────────────────────────────
  if (accessLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress sx={{ color: textPrimaryColor, mb: 2 }} />
          <Typography variant="h6" sx={{ color: textPrimaryColor }}>Loading access information...</Typography>
        </Box>
      </Container>
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

  const filteredDepartmentData = departmentData.filter((d) => {
    const code = d.code?.toLowerCase() || '';
    if (departmentFilter && code !== departmentFilter) return false;
    return code.includes(searchTerm.toLowerCase());
  });

  const selectSx = {
    borderRadius: 12,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backgroundColor: 'rgba(255,255,255,0.8)',
    '&:hover': { transform: 'translateY(-1px)', backgroundColor: 'rgba(255,255,255,0.95)' },
    '&.Mui-focused': {
      transform: 'translateY(-1px)',
      boxShadow: `0 4px 20px ${alpha(settings.accentColor || '#FEF9E1', 0.25)}`,
      backgroundColor: 'rgba(255,255,255,1)',
      '& fieldset': { borderColor: settings.primaryColor || accentColor, borderWidth: '1.5px' },
    },
    '& fieldset': { borderColor: settings.primaryColor || accentColor, borderWidth: '1.5px' },
  };

  return (
    <Box sx={{ py: 4, mt: -5, width: '1600px', mx: 'auto', overflow: 'hidden' }}>
      <Box sx={{ px: 6 }}>

        {/* ── Header ─────────────────────────────────────── */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }}>
            <GlassCard sx={{ background: `rgba(${hexToRgb(primaryColor)}, 0.95)`, boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`, border: `1px solid ${alpha(accentColor, 0.1)}` }}>
              <Box sx={{ p: 5, background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`, color: textPrimaryColor, position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: `radial-gradient(circle, ${alpha(accentColor, 0.1)} 0%, transparent 70%)` }} />
                <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, background: `radial-gradient(circle, ${alpha(accentColor, 0.08)} 0%, transparent 70%)` }} />
                <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{ bgcolor: alpha(accentColor, 0.15), mr: 4, width: 64, height: 64, boxShadow: `0 8px 24px ${alpha(accentColor, 0.15)}` }}>
                      <DomainIcon sx={{ color: textPrimaryColor, fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2, color: textPrimaryColor }}>
                        Department Assignment Management
                      </Typography>
                      <Typography variant="body1" sx={{ opacity: 0.8, fontWeight: 400, color: settings.secondaryColor || accentDark }}>
                        View departments and their assigned employees
                      </Typography>
                    </Box>
                  </Box>
                  <Tooltip title="Refresh Data">
                    <IconButton onClick={() => window.location.reload()} sx={{ bgcolor: alpha(accentColor, 0.1), '&:hover': { bgcolor: alpha(accentColor, 0.2) }, color: textPrimaryColor, width: 48, height: 48 }}>
                      <Refresh sx={{ fontSize: 24 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {/* ── Main Grid ──────────────────────────────────── */}
        <Grid container spacing={4}>

          {/* Add Assignment Panel */}
          <Grid item xs={12} lg={6}>
            <Fade in timeout={700}>
              <GlassCard sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', border: `1px solid ${alpha(accentColor, 0.1)}` }}>
                <Box sx={{ p: 4, background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`, color: textPrimaryColor, display: 'flex', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <DomainIcon sx={{ fontSize: '1.8rem', mr: 2 }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Assign Employee to Department</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>Fill in assignment information</Typography>
                  </Box>
                </Box>

                <Box sx={{ p: 4, flexGrow: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: textPrimaryColor, display: 'flex', alignItems: 'center' }}>
                    <PersonIcon sx={{ mr: 2, fontSize: 24, color: accentColor }} />
                    Assignment Information
                    <span style={{ marginLeft: 12, fontWeight: 400, opacity: 0.7, color: 'red' }}>*</span>
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: textPrimaryColor }}>Department Code</Typography>
                      <FormControl fullWidth>
                        <Select value={newAssignment.code} onChange={(e) => setNewAssignment({ ...newAssignment, code: e.target.value })} displayEmpty size="small" sx={{ '& .MuiOutlinedInput-root': selectSx }}>
                          <MenuItem value="">Select Department</MenuItem>
                          {departmentCodes.map((c, i) => <MenuItem key={i} value={c}>{c}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: textPrimaryColor }}>Search Employee</Typography>
                      <EmployeeAutocomplete
                        value={newAssignment.employeeNumber}
                        onChange={(num) => setNewAssignment({ ...newAssignment, employeeNumber: num })}
                        selectedEmployee={selectedEmployee}
                        onEmployeeSelect={setSelectedEmployee}
                        placeholder="Search and select employee..."
                        required
                        settings={settings}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: textPrimaryColor }}>Selected Employee</Typography>
                      {selectedEmployee ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', backgroundColor: alpha(settings.accentColor || '#FEF9E1', 0.8), border: `1px solid ${alpha(accentColor, 0.3)}`, borderRadius: 2, px: 1.5, py: 1, gap: 1.5 }}>
                          <PersonIcon sx={{ color: accentColor, fontSize: 20 }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: textPrimaryColor, fontSize: 14, lineHeight: 1.2 }}>{selectedEmployee.name}</Typography>
                            <Typography variant="caption" sx={{ color: '#0a3d1d', fontSize: 14, fontWeight: 700 }}>#{selectedEmployee.employeeNumber}</Typography>
                          </Box>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)', border: '2px dashed rgba(109,35,35,0.3)', borderRadius: 2, minHeight: 40 }}>
                          <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic', fontSize: 14 }}>No employee selected</Typography>
                        </Box>
                      )}
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 'auto', pt: 3 }}>
                    <ProfessionalButton
                      onClick={handleAdd}
                      variant="contained"
                      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
                      fullWidth
                      disabled={loading}
                      sx={{ py: 1.5, fontSize: '1rem', backgroundColor: settings.updateButtonColor || accentColor, color: settings.accentColor || '#FEF9E1', '&:hover': { backgroundColor: settings.updateButtonHoverColor || settings.hoverColor || '#a31d1d' } }}
                    >
                      Assign Employee
                    </ProfessionalButton>
                  </Box>
                </Box>
              </GlassCard>
            </Fade>
          </Grid>

          {/* Department Records Panel */}
          <Grid item xs={12} lg={6}>
            <Fade in timeout={900}>
              <GlassCard sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', border: `1px solid ${alpha(accentColor, 0.1)}` }}>
                <Box sx={{ p: 4, background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`, color: textPrimaryColor, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <GroupIcon sx={{ fontSize: '1.8rem', mr: 2 }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Departments</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>View departments and their employees</Typography>
                    </Box>
                  </Box>
                  <ToggleButtonGroup value={viewMode} exclusive onChange={(_, m) => { if (m) setViewMode(m); }} size="small"
                    sx={{ backgroundColor: 'rgba(255,255,255,0.2)', '& .MuiToggleButton-root': { color: textPrimaryColor, borderColor: 'rgba(109,35,35,0.5)', padding: '4px 8px', '&.Mui-selected': { backgroundColor: 'rgba(255,255,255,0.3)', color: textPrimaryColor } } }}>
                    <ToggleButton value="grid"><ViewModuleIcon fontSize="small" /></ToggleButton>
                    <ToggleButton value="list"><ViewListIcon fontSize="small" /></ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                <Box sx={{ p: 4, flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
                    <ModernTextField size="small" placeholder="Search by Department Code" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} fullWidth
                      InputProps={{ startAdornment: <SearchIcon sx={{ color: accentColor, mr: 1 }} /> }} />
                    <FormControl sx={{ minWidth: 150 }}>
                      <Select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} displayEmpty size="small" sx={{ '& .MuiOutlinedInput-root': selectSx }}>
                        <MenuItem value="">All Departments</MenuItem>
                        {departmentCodes.map((c, i) => <MenuItem key={i} value={c}>{c}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1, '&::-webkit-scrollbar': { width: 6 }, '&::-webkit-scrollbar-track': { background: '#f1f1f1', borderRadius: 3 }, '&::-webkit-scrollbar-thumb': { background: accentColor, borderRadius: 3 } }}>
                    {viewMode === 'grid' ? (
                      <Grid container spacing={1.5}>
                        {filteredDepartmentData.map((dept) => (
                          <Grid item xs={12} sm={6} md={4} key={dept.code}>
                            <AccentDeptCard department={dept} settings={settings} accentColor={accentColor} textPrimaryColor={textPrimaryColor} textSecondaryColor={textSecondaryColor} onClick={() => handleOpenDepartmentModal(dept)} />
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      filteredDepartmentData.map((dept) => (
                        <AccentDeptRow key={dept.code} department={dept} settings={settings} accentColor={accentColor} textPrimaryColor={textPrimaryColor} textSecondaryColor={textSecondaryColor} onClick={() => handleOpenDepartmentModal(dept)} />
                      ))
                    )}
                    {filteredDepartmentData.length === 0 && (
                      <Box textAlign="center" py={4}>
                        <Typography variant="h6" sx={{ color: textPrimaryColor, fontWeight: 'bold', mb: 1 }}>No Departments Found</Typography>
                        <Typography variant="body2" sx={{ color: '#666' }}>Try adjusting your search criteria or department filter</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </GlassCard>
            </Fade>
          </Grid>
        </Grid>

        {/* ── SINGLE MODAL — sliding panels ──────────────── */}
        <Modal open={modalOpen} onClose={handleCloseModal} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box
            sx={{
              width: '520px',
              maxHeight: '68vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '14px',
              overflow: 'hidden',
              boxShadow: '0 16px 48px rgba(0,0,0,0.22)',
              outline: 'none',
              bgcolor: 'background.paper',
            }}
          >
            {selectedDepartment && (
              <>
                {/* Modal header */}
                <Box
                  sx={{
                    px: 2.5,
                    py: 1.8,
                    background: `linear-gradient(135deg, ${settings.secondaryColor || '#6d2323'} 0%, ${settings.deleteButtonHoverColor || '#a31d1d'} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                  }}
                >
                  {modalView === 'list' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                      <DomainIcon sx={{ fontSize: 20, color: settings.accentColor || '#FEF9E1' }} />
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: 14, color: settings.accentColor || '#FEF9E1', lineHeight: 1.2 }}>
                          {selectedDepartment.code}
                        </Typography>
                        <Typography sx={{ fontSize: 11, opacity: 0.8, color: settings.accentColor || '#FEF9E1' }}>
                          {selectedDepartment.employees.length} {selectedDepartment.employees.length === 1 ? 'employee' : 'employees'}
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Button
                        onClick={goBackToList}
                        startIcon={<ArrowBackIcon sx={{ fontSize: '13px !important' }} />}
                        sx={{ color: settings.accentColor || '#FEF9E1', textTransform: 'none', fontWeight: 500, fontSize: 11, px: 1, py: 0.3, borderRadius: 1.5, minWidth: 0, backgroundColor: 'rgba(255,255,255,0.12)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.22)' } }}
                      >
                        Back
                      </Button>
                      <Box sx={{ width: '1px', height: 20, bgcolor: 'rgba(255,255,255,0.25)', mx: 0.5 }} />
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: 14, color: settings.accentColor || '#FEF9E1', lineHeight: 1.2 }}>Edit Assignment</Typography>
                        {selectedEditEmployee && (
                          <Typography sx={{ fontSize: 11, opacity: 0.8, color: settings.accentColor || '#FEF9E1' }}>
                            {selectedEditEmployee.name}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}

                  <IconButton onClick={handleCloseModal} size="small"
                    sx={{ color: settings.accentColor || '#FEF9E1', bgcolor: 'rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' }, width: 28, height: 28 }}>
                    <Close sx={{ fontSize: 15 }} />
                  </IconButton>
                </Box>

                {/* Sliding panels container */}
                <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      width: '200%',
                      height: '100%',
                      transform: modalView === 'edit' ? 'translateX(-50%)' : 'translateX(0)',
                      transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >

                    {/* PANEL 1: Employee grid */}
                    <Box
                      sx={{
                        width: '50%',
                        height: '100%',
                        overflowY: 'auto',
                        p: 2,
                        '&::-webkit-scrollbar': { width: 4 },
                        '&::-webkit-scrollbar-track': { background: '#f5f5f5', borderRadius: 2 },
                        '&::-webkit-scrollbar-thumb': { background: alpha(accentColor, 0.35), borderRadius: 2 },
                      }}
                    >
                      {selectedDepartment.employees.length === 0 ? (
                        <Box textAlign="center" py={5}>
                          <PeopleIcon sx={{ fontSize: 36, color: alpha(accentColor, 0.18), mb: 1 }} />
                          <Typography sx={{ color: textPrimaryColor, fontWeight: 700, mb: 0.5, fontSize: 14 }}>No Employees</Typography>
                          <Typography sx={{ color: '#999', fontSize: 12 }}>This department has no assigned employees yet</Typography>
                        </Box>
                      ) : (
                        <Grid container spacing={1.2}>
                          {selectedDepartment.employees.map((emp) => (
                            <Grid item xs={6} key={emp.id}>
                              <Box
                                sx={{
                                  display: 'flex',
                                  borderRadius: '8px',
                                  border: `0.5px solid ${alpha(accentColor, 0.12)}`,
                                  overflow: 'hidden',
                                  backgroundColor: '#fff',
                                  transition: 'border-color 0.15s, box-shadow 0.15s',
                                  '&:hover': { borderColor: alpha(accentColor, 0.32), boxShadow: `0 2px 8px ${alpha(accentColor, 0.07)}` },
                                }}
                              >
                                <Box sx={{ width: 3, flexShrink: 0, bgcolor: accentColor, opacity: 0.5 }} />
                                <Box sx={{ p: '9px 10px', flex: 1, minWidth: 0 }}>
                                  <Typography sx={{ fontSize: '10px', fontWeight: 700, color: accentColor, mb: '2px', lineHeight: 1 }}>
                                    #{emp.employeeNumber}
                                  </Typography>
                                  <Typography noWrap sx={{ fontSize: '12px', fontWeight: 400, color: textPrimaryColor, mb: '8px', lineHeight: 1.3 }}>
                                    {departmentEmployeeDetails[emp.employeeNumber]?.name || emp.name || 'No Name'}
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <IconButton size="small" onClick={() => goToEdit(emp)}
                                      sx={{ color: settings.updateButtonColor || accentColor, bgcolor: alpha(accentColor, 0.07), '&:hover': { bgcolor: alpha(accentColor, 0.15) }, borderRadius: '5px', width: 24, height: 24 }}>
                                      <EditIcon sx={{ fontSize: 12 }} />
                                    </IconButton>
                                    <IconButton size="small" onClick={() => handleDelete(emp.id)}
                                      sx={{ color: settings.deleteButtonColor || '#c0392b', bgcolor: alpha('#c0392b', 0.07), '&:hover': { bgcolor: alpha('#c0392b', 0.15) }, borderRadius: '5px', width: 24, height: 24 }}>
                                      <DeleteIcon sx={{ fontSize: 12 }} />
                                    </IconButton>
                                  </Box>
                                </Box>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      )}
                    </Box>

                    {/* PANEL 2: Edit form */}
                    <Box sx={{ width: '50%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-track': { background: '#f5f5f5', borderRadius: 2 }, '&::-webkit-scrollbar-thumb': { background: alpha(accentColor, 0.35), borderRadius: 2 } }}>
                        {editAssignment && (
                          <Grid container spacing={2}>
                            <Grid item xs={12}>
                              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: textPrimaryColor, fontSize: 12 }}>Department Code</Typography>
                              <FormControl fullWidth>
                                <Select value={editAssignment.code || ''} onChange={(e) => handleEditChange('code', e.target.value)} size="small" sx={{ '& .MuiOutlinedInput-root': selectSx }}>
                                  <MenuItem value="">Select Department</MenuItem>
                                  {departmentCodes.map((c, i) => <MenuItem key={i} value={c}>{c}</MenuItem>)}
                                </Select>
                              </FormControl>
                            </Grid>

                            <Grid item xs={12}>
                              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: textPrimaryColor, fontSize: 12 }}>Search Employee</Typography>
                              <EmployeeAutocomplete
                                value={editAssignment.employeeNumber || ''}
                                onChange={(num) => handleEditChange('employeeNumber', num)}
                                selectedEmployee={selectedEditEmployee}
                                onEmployeeSelect={setSelectedEditEmployee}
                                placeholder="Search and select employee..."
                                settings={settings}
                              />
                            </Grid>

                            <Grid item xs={12}>
                              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: textPrimaryColor, fontSize: 12 }}>Selected Employee</Typography>
                              {selectedEditEmployee ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', backgroundColor: alpha(settings.accentColor || '#FEF9E1', 0.8), border: `1px solid ${alpha(accentColor, 0.3)}`, borderRadius: 2, px: 1.5, py: 0.8, gap: 1.2 }}>
                                  <PersonIcon sx={{ color: accentColor, fontSize: 17 }} />
                                  <Box>
                                    <Typography sx={{ fontWeight: 700, color: textPrimaryColor, fontSize: 13, lineHeight: 1.2 }}>{selectedEditEmployee.name}</Typography>
                                    <Typography sx={{ color: '#0a3d1d', fontSize: 11, fontWeight: 700 }}>#{editAssignment.employeeNumber}</Typography>
                                  </Box>
                                </Box>
                              ) : (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.04)', border: '1.5px dashed rgba(109,35,35,0.22)', borderRadius: 2, minHeight: 36 }}>
                                  <Typography sx={{ color: '#aaa', fontStyle: 'italic', fontSize: 12 }}>No employee selected</Typography>
                                </Box>
                              )}
                            </Grid>
                          </Grid>
                        )}
                      </Box>

                      {/* Sticky footer */}
                      <Box sx={{ borderTop: `1px solid ${alpha(accentColor, 0.1)}`, px: 2.5, py: 1.8, display: 'flex', gap: 1, justifyContent: 'flex-end', bgcolor: 'background.paper', flexShrink: 0 }}>
                          
                        <ProfessionalButton
                          onClick={goBackToList}
                          variant="outlined"
                          startIcon={<CancelIcon sx={{ fontSize: '16px !important' }} />}
                          sx={{ borderColor: '#6c757d', color: '#6c757d', minWidth: 80, py: '7px', '&:hover': { backgroundColor: alpha('#6c757d', 0.06), borderColor: '#5a6268', color: '#5a6268' } }}
                        >
                          Cancel
                        </ProfessionalButton>
                        <ProfessionalButton
                          onClick={handleUpdate}
                          variant="contained"
                          startIcon={<SaveIcon sx={{ fontSize: '16px !important' }} />}
                          disabled={!hasChanges()}
                          sx={{ minWidth: 80, py: '7px', backgroundColor: hasChanges() ? (settings.updateButtonColor || accentColor) : alpha(accentColor, 0.35), color: settings.accentColor || '#FEF9E1', '&:hover': { backgroundColor: hasChanges() ? (settings.updateButtonHoverColor || '#a31d1d') : alpha(accentColor, 0.35) }, '&:disabled': { color: alpha(settings.accentColor || '#FEF9E1', 0.5) } }}
                        >
                          Save
                        </ProfessionalButton>
                      </Box>
                    </Box>

                  </Box>
                </Box>
              </>
            )}
          </Box>
        </Modal>

        {/* ── Snackbar ────────────────────────────────────── */}
        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>

      </Box>
    </Box>
  );
};

export default DepartmentAssignment;