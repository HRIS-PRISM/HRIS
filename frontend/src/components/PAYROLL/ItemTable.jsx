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
  Autocomplete,
  Fade,
  Divider,
  Backdrop,
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
  Label as FactCheckIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';

import ReorderIcon from '@mui/icons-material/Reorder';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import AccessDenied from '../AccessDenied';
import usePageAccess from '../../hooks/usePageAccess';
import { useNavigate } from 'react-router-dom';
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
  if (!token) return {};
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  };
};

axios.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) console.error('Auth error:', error.response?.data?.message);
    else if (error.response?.status === 403) console.error('Authorization error');
    return Promise.reject(error);
  }
);

// ── Styled components ─────────────────────────────────────────
const GlassCard = styled(Card)(() => ({
  borderRadius: 20,
  backdropFilter: 'blur(10px)',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': { transform: 'translateY(-4px)' },
}));

const ProfessionalButton = styled(Button)(({ variant }) => ({
  borderRadius: 12,
  fontWeight: 600,
  padding: '12px 24px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  textTransform: 'none',
  fontSize: '0.95rem',
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

// ── Utility: get initials from name ──────────────────────────
const getInitials = (name = '') => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// ── Grade pill label ─────────────────────────────────────────
const gradePillLabel = (salary_grade, step) => {
  const parts = [];
  if (salary_grade) parts.push(`SG ${salary_grade}`);
  if (step) parts.push(`· ${step}`);
  return parts.length ? parts.join(' ') : null;
};

// ── Option B: Avatar grid card ───────────────────────────────
const ItemGridCard = ({ item, employeeNames, accentColor, textPrimaryColor, onClick }) => {
  const name     = employeeNames[item.employeeID] || item.name || `Employee #${item.employeeID || 'N/A'}`;
  const position = item.item_description || item.item_code || 'No Position';
  const grade    = gradePillLabel(item.salary_grade, item.step);
  const initials = getInitials(name);
  const primary  = accentColor || '#6d2323';

  return (
    <Box
      onClick={onClick}
      sx={{
        borderRadius: '10px',
        border: `0.5px solid ${alpha(primary, 0.12)}`,
        backgroundColor: '#fff',
        cursor: 'pointer',
        padding: '12px 14px',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
        '&:hover': {
          borderColor: alpha(primary, 0.45),
          boxShadow: `0 4px 14px ${alpha(primary, 0.08)}`,
          transform: 'translateY(-2px)',
          '& .open-hint': { opacity: 1 },
        },
      }}
    >
      {/* Avatar */}
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: '8px',
          backgroundColor: alpha(primary, 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 700,
          color: primary,
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        {initials}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: '13px', fontWeight: 500, color: textPrimaryColor || '#1a1a1a', mb: '2px', lineHeight: 1.3 }}>
          {name}
        </Typography>
        <Typography noWrap sx={{ fontSize: '11px', color: '#666', mb: '6px', lineHeight: 1.3 }}>
          {position}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Typography sx={{ fontSize: '10px', fontWeight: 700, color: primary }}>
              #{item.employeeID}
            </Typography>
            {grade && (
              <Box sx={{ fontSize: '10px', fontWeight: 600, color: primary, backgroundColor: alpha(primary, 0.07), borderRadius: '4px', px: '6px', py: '2px', lineHeight: 1 }}>
                {grade}
              </Box>
            )}
          </Box>

          {/* Open hint — appears on hover */}
          <Box
            className="open-hint"
            sx={{ display: 'flex', alignItems: 'center', fontSize: '10px', color: '#aaa', opacity: 0, transition: 'opacity 0.15s', userSelect: 'none', gap: '2px' }}
          >
            Open <ChevronRightIcon sx={{ fontSize: 12 }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

// ── Option C: Table-style list row ───────────────────────────
const ItemListRow = ({ item, employeeNames, accentColor, textPrimaryColor, onClick, isHeader = false }) => {
  const primary = accentColor || '#6d2323';

  if (isHeader) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: '14px',
          py: '5px',
          gap: '12px',
          mb: '2px',
        }}
      >
        {['ID', 'Name', 'Position', 'Grade'].map((h, i) => (
          <Typography
            key={h}
            sx={{
              fontSize: '10px',
              fontWeight: 600,
              color: '#aaa',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              flexShrink: 0,
              width: i === 0 ? 56 : i === 1 ? 130 : i === 3 ? 90 : undefined,
              flex: i === 2 ? 1 : undefined,
            }}
          >
            {h}
          </Typography>
        ))}
        <Box sx={{ width: 40, flexShrink: 0 }} />
      </Box>
    );
  }

  const name     = employeeNames[item.employeeID] || item.name || `Employee #${item.employeeID || 'N/A'}`;
  const position = item.item_description || item.item_code || 'No Position';
  const grade    = gradePillLabel(item.salary_grade, item.step);

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: '14px',
        py: '9px',
        gap: '12px',
        borderRadius: '8px',
        border: `0.5px solid ${alpha(primary, 0.1)}`,
        backgroundColor: '#fff',
        cursor: 'pointer',
        mb: '6px',
        transition: 'border-color 0.15s, background 0.15s',
        '&:hover': {
          borderColor: alpha(primary, 0.38),
          backgroundColor: 'rgba(254,249,225,0.35)',
          '& .open-hint': { opacity: 1 },
        },
      }}
    >
      {/* ID */}
      <Typography sx={{ fontSize: '10px', fontWeight: 700, color: primary, width: 56, flexShrink: 0 }}>
        #{item.employeeID}
      </Typography>

      {/* Name */}
      <Typography noWrap sx={{ fontSize: '12px', fontWeight: 500, color: textPrimaryColor || '#1a1a1a', width: 130, flexShrink: 0 }}>
        {name}
      </Typography>

      {/* Position */}
      <Typography noWrap sx={{ fontSize: '11px', color: '#666', flex: 1 }}>
        {position}
      </Typography>

      {/* Grade */}
      <Box sx={{ width: 90, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
        {grade ? (
          <Box sx={{ fontSize: '10px', fontWeight: 600, color: primary, backgroundColor: alpha(primary, 0.07), borderRadius: '4px', px: '6px', py: '2px', lineHeight: 1, whiteSpace: 'nowrap' }}>
            {grade}
          </Box>
        ) : (
          <Typography sx={{ fontSize: '10px', color: '#ccc' }}>—</Typography>
        )}
      </Box>

      {/* Open hint */}
      <Box
        className="open-hint"
        sx={{ width: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: '10px', color: '#aaa', opacity: 0, transition: 'opacity 0.15s', userSelect: 'none', gap: '2px' }}
      >
        Open <ChevronRightIcon sx={{ fontSize: 12 }} />
      </Box>
    </Box>
  );
};

// ── Employee Autocomplete ─────────────────────────────────────
const EmployeeAutocomplete = ({ value, onChange, placeholder = 'Search employee...', required = false, disabled = false, error = false, helperText = '', selectedEmployee, onEmployeeSelect, dropdownDisabled = false, settings = {} }) => {
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
            <IconButton onClick={dropdownDisabled ? undefined : handleToggle} size="small" disabled={dropdownDisabled} sx={{ color: primary }}>
              {showDropdown ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          ),
        }}
      />
      {showDropdown && (
        <Paper elevation={3} sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1300, maxHeight: 300, overflow: 'auto', mt: 1, borderRadius: 2 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={20} /><Typography variant="body2" sx={{ ml: 1 }}>Loading...</Typography>
            </Box>
          ) : employees.length > 0 ? (
            <List dense>
              {employees.map((emp) => (
                <ListItem key={emp.employeeNumber} button onClick={() => handleSelect(emp)}
                  sx={{ '&:hover': { backgroundColor: alpha(settings?.accentColor || '#FEF9E1', 0.3) } }}>
                  <ListItemText
                    primary={emp.name}
                    secondary={`#${emp.employeeNumber}`}
                    primaryTypographyProps={{ sx: { fontWeight: 700, color: settings?.textPrimaryColor || '#6D2323' } }}
                    secondaryTypographyProps={{ sx: { color: '#a31d1d', fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.1 } }}
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
const ItemTable = () => {
  const [data, setData]                         = useState([]);
  const [employeeNames, setEmployeeNames]       = useState({});
  const [salaryGrades, setSalaryGrades]         = useState([]);
  const [salaryGradeOptions, setSalaryGradeOptions]       = useState([]);
  const [effectivityDateOptions, setEffectivityDateOptions] = useState([]);
  const [newItem, setNewItem]                   = useState({ item_description: '', employeeID: '', name: '', item_code: '', salary_grade: '', step: '', effectivityDate: '' });
  const [editItem, setEditItem]                 = useState(null);
  const [originalItem, setOriginalItem]         = useState(null);
  const [isEditing, setIsEditing]               = useState(false);
  const [searchTerm, setSearchTerm]             = useState('');
  const [loading, setLoading]                   = useState(false);
  const [successOpen, setSuccessOpen]           = useState(false);
  const [successAction, setSuccessAction]       = useState('');
  const [errors, setErrors]                     = useState({});
  const [viewMode, setViewMode]                 = useState('grid');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEditEmployee, setSelectedEditEmployee] = useState(null);
  const [snackbar, setSnackbar]                 = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  const { settings } = useSystemSettings();

  const primaryColor       = settings.accentColor        || '#FEF9E1';
  const secondaryColor     = settings.backgroundColor    || '#FFF8E7';
  const accentColor        = settings.primaryColor       || '#6d2323';
  const accentDark         = settings.secondaryColor     || '#8B3333';
  const textPrimaryColor   = settings.textPrimaryColor   || '#6d2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';
  const grayColor          = '#6c757d';

  const { hasAccess, loading: accessLoading } = usePageAccess('item-table');

  const dropdownPopperProps = { placement: 'bottom', modifiers: [{ name: 'flip', enabled: false }] };

  useEffect(() => { fetchItems(); fetchSalaryGrades(); }, []);

  const fetchSalaryGrades = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/SalaryGradeTable/salary-grade`, getAuthHeaders());
      setSalaryGrades(res.data);

      const uniqueSGNumbers = [...new Set(
        res.data.map((r) => {
          const sg = String(r.sg_number || '').trim();
          if (sg.toLowerCase().includes('job order')) {
            if (sg.toLowerCase().includes('graduated') || sg.toLowerCase().includes('grad')) return 'Job Order(Graduated)';
            if (sg.toLowerCase().includes('undergraduate') || sg.toLowerCase().includes('undergrad')) return 'Job Order(Undergraduate)';
          }
          if (sg === 'JO GRAD') return 'Job Order(Graduated)';
          if (sg === 'JO UNDERGRAD') return 'Job Order(Undergraduate)';
          return sg;
        }).filter((sg) => sg !== null && sg !== undefined && sg !== '')
      )].sort((a, b) => {
        const aIsNum = !isNaN(a) && a !== '', bIsNum = !isNaN(b) && b !== '';
        if (aIsNum && bIsNum) return parseInt(a) - parseInt(b);
        if (aIsNum) return -1;
        if (bIsNum) return 1;
        const aIsJO = a.toLowerCase().includes('job order'), bIsJO = b.toLowerCase().includes('job order');
        if (aIsJO && bIsJO) return a.localeCompare(b);
        if (aIsJO) return 1;
        if (bIsJO) return -1;
        return a.localeCompare(b);
      });
      setSalaryGradeOptions(uniqueSGNumbers);

      const uniqueYears = [...new Set(res.data.map((r) => String(r.effectivityDate || '').trim()).filter((y) => y !== ''))].sort((a, b) => parseInt(b) - parseInt(a));
      setEffectivityDateOptions(uniqueYears);
    } catch {
      const defaultOptions = [...Array.from({ length: 33 }, (_, i) => `${i + 1}`), 'Job Order(Graduated)', 'Job Order(Undergraduate)'];
      setSalaryGradeOptions(defaultOptions);
      const currentYear = new Date().getFullYear();
      setEffectivityDateOptions(Array.from({ length: 10 }, (_, i) => String(currentYear - i)));
    }
  };

  const fetchItems = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/item-table`, getAuthHeaders());
      setData(res.data || []);

      const uniqueIds = [...new Set((res.data || []).map((item) => item.employeeID).filter(Boolean))];
      const namesMap = {};
      await Promise.all(
        uniqueIds.map(async (id) => {
          try {
            const r = await axios.get(`${API_BASE_URL}/Remittance/employees/${id}`, getAuthHeaders());
            namesMap[id] = r.data.name || 'Unknown';
          } catch { namesMap[id] = 'Unknown'; }
        })
      );
      setEmployeeNames(namesMap);
    } catch { showSnackbar('Failed to fetch item records. Please try again.', 'error'); }
  };

  usePayrollRealtimeRefresh(() => { fetchSalaryGrades(); fetchItems(); });

  const validateForm = () => {
    const newErrors = {};
    if (!newItem.item_description?.trim()) newErrors.item_description = 'This field is required';
    const employeeID = newItem.employeeID || selectedEmployee?.employeeNumber;
    if (!employeeID?.trim()) newErrors.employeeID = 'This field is required';
    const name = newItem.name || selectedEmployee?.name;
    if (!name?.trim()) newErrors.name = 'This field is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdd = async () => {
    if (!validateForm()) {
      const fieldNames = { item_description: 'Position', employeeID: 'Employee', name: 'Employee Name' };
      const missing = Object.keys(errors).map((f) => fieldNames[f] || f).join(', ');
      showSnackbar(`Please fill in: ${missing}`, 'error');
      return;
    }
    setLoading(true);
    try {
      const itemData = {
        item_description: newItem.item_description || '',
        employeeID: newItem.employeeID || selectedEmployee?.employeeNumber || '',
        name: newItem.name || selectedEmployee?.name || '',
        item_code: newItem.item_code || '',
        salary_grade: newItem.salary_grade || '',
        step: newItem.step || '',
        effectivityDate: newItem.effectivityDate || '',
      };
      await axios.post(`${API_BASE_URL}/api/item-table`, itemData, getAuthHeaders());
      setNewItem({ item_description: '', employeeID: '', name: '', item_code: '', salary_grade: '', step: '', effectivityDate: '' });
      setSelectedEmployee(null);
      setErrors({});
      setTimeout(() => {
        setLoading(false);
        setSuccessAction('adding');
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2000);
      }, 300);
      fetchItems();
    } catch { setLoading(false); showSnackbar('Failed to add item record.', 'error'); }
  };

  const handleUpdate = async () => {
    try {
      await axios.put(`${API_BASE_URL}/api/item-table/${editItem.id}`, editItem, getAuthHeaders());
      setEditItem(null); setOriginalItem(null); setSelectedEditEmployee(null); setIsEditing(false);
      fetchItems();
      setSuccessAction('edit'); setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch { showSnackbar('Failed to update item record.', 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/item-table/${id}`, getAuthHeaders());
      setEditItem(null); setOriginalItem(null); setSelectedEditEmployee(null); setIsEditing(false);
      fetchItems();
      setSuccessAction('delete'); setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch { showSnackbar('Failed to delete item record.', 'error'); }
  };

  const handleChange = (field, value, isEdit = false) => {
    if (isEdit) setEditItem((prev) => ({ ...prev, [field]: value }));
    else {
      setNewItem((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
    }
  };

  const handleEmployeeChange     = (num) => { setNewItem((p) => ({ ...p, employeeID: num || '' })); setErrors((p) => { const e = { ...p }; delete e.employeeID; return e; }); };
  const handleEmployeeSelect     = (emp) => { setSelectedEmployee(emp); setNewItem((p) => ({ ...p, employeeID: emp.employeeNumber || '', name: emp.name || '' })); setErrors((p) => { const e = { ...p }; delete e.employeeID; delete e.name; return e; }); };
  const handleEditEmployeeChange = (num) => setEditItem({ ...editItem, employeeID: num });
  const handleEditEmployeeSelect = (emp) => { setSelectedEditEmployee(emp); setEditItem({ ...editItem, employeeID: emp.employeeNumber, name: emp.name }); };

  const handleOpenModal = (item) => {
    const employeeName = employeeNames[item.employeeID] || item.name || 'Unknown';
    setEditItem({ ...item });
    setOriginalItem({ ...item });
    setSelectedEditEmployee({ name: employeeName, employeeNumber: item.employeeID });
    setIsEditing(false);
  };

  const handleCloseModal  = () => { setEditItem(null); setOriginalItem(null); setSelectedEditEmployee(null); setIsEditing(false); };
  const handleStartEdit   = () => setIsEditing(true);
  const handleCancelEdit  = () => { setEditItem({ ...originalItem }); setSelectedEditEmployee({ name: employeeNames[originalItem.employeeID] || originalItem.name || 'Unknown', employeeNumber: originalItem.employeeID }); setIsEditing(false); };

  const hasChanges = () => {
    if (!editItem || !originalItem) return false;
    return ['item_description', 'employeeID', 'name', 'item_code', 'salary_grade', 'step', 'effectivityDate'].some((k) => editItem[k] !== originalItem[k]);
  };

  const stepOptions = [...Array(8)].map((_, i) => `step${i + 1}`);

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
        message="You do not have permission to access Item Information. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }

  const filteredData = data.filter((item) => {
    const id   = item.employeeID?.toString() || '';
    const name = item.name?.toLowerCase() || '';
    const pos  = item.item_description?.toLowerCase() || '';
    const s    = searchTerm.toLowerCase();
    return id.includes(s) || name.includes(s) || pos.includes(s);
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
                      <FactCheckIcon sx={{ color: textPrimaryColor, fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2, color: textPrimaryColor }}>
                        Item Information Management
                      </Typography>
                      <Typography variant="body1" sx={{ opacity: 0.8, fontWeight: 400, color: accentDark }}>
                        Add and manage item records for employees
                      </Typography>
                    </Box>
                  </Box>
                  <Tooltip title="Refresh Data">
                    <IconButton onClick={() => window.location.reload()} sx={{ bgcolor: alpha(accentColor, 0.1), '&:hover': { bgcolor: alpha(accentColor, 0.2) }, color: accentColor, width: 48, height: 48 }}>
                      <Refresh sx={{ fontSize: 24 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {/* Loading Backdrop */}
        <Backdrop sx={{ color: primaryColor, zIndex: (t) => t.zIndex.drawer + 1 }} open={loading}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress color="inherit" size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 2, color: primaryColor }}>Processing item record...</Typography>
          </Box>
        </Backdrop>

        {/* ── Main Grid ──────────────────────────────────── */}
        <Grid container spacing={4}>

          {/* Add New Item */}
          <Grid item xs={12} lg={6}>
            <Fade in timeout={700}>
              <GlassCard sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', border: `1px solid ${alpha(accentColor, 0.1)}`, overflow: 'visible' }}>
                <Box sx={{ p: 4, background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`, color: accentColor, display: 'flex', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderRadius: '20px 20px 0 0' }}>
                  <FactCheckIcon sx={{ fontSize: '1.8rem', mr: 2 }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Add New Item</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>Fill in item information</Typography>
                  </Box>
                </Box>

                <Box sx={{ p: 4, flexGrow: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'visible' }}>
                  <Box sx={{ mb: 3 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>Search Employee</Typography>
                        <EmployeeAutocomplete
                          value={newItem.employeeID}
                          onChange={handleEmployeeChange}
                          selectedEmployee={selectedEmployee}
                          onEmployeeSelect={handleEmployeeSelect}
                          placeholder="Search and select employee..."
                          required
                          error={!!errors.employeeID}
                          helperText={errors.employeeID || ''}
                          settings={settings}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>Selected Employee</Typography>
                        {selectedEmployee ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', backgroundColor: alpha(settings.accentColor || '#FEF9E1', 0.8), border: `1px solid ${alpha(settings.primaryColor || '#6d2323', 0.3)}`, borderRadius: 2, px: 1.5, py: 1, gap: 1.5 }}>
                            <PersonIcon sx={{ color: settings.primaryColor || accentColor, fontSize: 20 }} />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', color: settings.textPrimaryColor || accentColor, fontSize: 14, lineHeight: 1.2 }}>{selectedEmployee.name}</Typography>
                              <Typography variant="caption" sx={{ color: '#a31d1d', fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>#{selectedEmployee.employeeNumber}</Typography>
                            </Box>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)', border: '2px dashed rgba(109,35,35,0.3)', borderRadius: 2, minHeight: 36 }}>
                            <Typography variant="body2" sx={{ color: grayColor, fontStyle: 'italic', fontSize: 14 }}>No employee selected</Typography>
                          </Box>
                        )}
                      </Grid>
                    </Grid>
                  </Box>

                  <Divider sx={{ my: 3, borderColor: 'rgba(109,35,35,0.1)' }} />

                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: accentColor, display: 'flex', alignItems: 'center' }}>
                    <FactCheckIcon sx={{ mr: 2, fontSize: 24 }} />
                    Item Details
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>
                        Position <span style={{ marginLeft: 12, fontWeight: 400, opacity: 0.7, color: 'red' }}>*</span>
                      </Typography>
                      <ModernTextField value={newItem.item_description} onChange={(e) => handleChange('item_description', e.target.value)} fullWidth size="small" error={!!errors.item_description} helperText={errors.item_description || ''} />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>Item Code</Typography>
                      <ModernTextField value={newItem.item_code} onChange={(e) => handleChange('item_code', e.target.value)} fullWidth size="small" />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>Salary Grade</Typography>
                      <FormControl fullWidth>
                        <Autocomplete freeSolo options={salaryGradeOptions} value={newItem.salary_grade || null} componentsProps={{ popper: dropdownPopperProps }}
                          onChange={(_, v) => handleChange('salary_grade', v !== null && v !== undefined ? String(v) : '')}
                          onInputChange={(_, v, r) => { if (r === 'input') handleChange('salary_grade', v || ''); else if (r === 'clear') handleChange('salary_grade', ''); }}
                          renderInput={(params) => <ModernTextField {...params} size="small" />}
                        />
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>Step</Typography>
                      <FormControl fullWidth>
                        <Autocomplete freeSolo options={stepOptions} value={newItem.step || null} componentsProps={{ popper: dropdownPopperProps }}
                          onChange={(_, v) => handleChange('step', v || '')}
                          onInputChange={(_, v, r) => { if (r === 'input') handleChange('step', v); }}
                          renderInput={(params) => <ModernTextField {...params} size="small" />}
                        />
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>Effectivity Date (Year)</Typography>
                      <FormControl fullWidth>
                        <Autocomplete freeSolo options={effectivityDateOptions} value={newItem.effectivityDate || null} componentsProps={{ popper: dropdownPopperProps }}
                          onChange={(_, v) => handleChange('effectivityDate', v !== null && v !== undefined ? String(v) : '')}
                          onInputChange={(_, v, r) => { if (r === 'input') handleChange('effectivityDate', v || ''); else if (r === 'clear') handleChange('effectivityDate', ''); }}
                          renderInput={(params) => <ModernTextField {...params} size="small" placeholder="YYYY" />}
                        />
                      </FormControl>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 'auto', pt: 3 }}>
                    <ProfessionalButton onClick={handleAdd} variant="contained" startIcon={<AddIcon />} fullWidth
                      sx={{ py: 1.5, fontSize: '1rem', backgroundColor: settings.updateButtonColor || settings.primaryColor || '#6d2323', color: settings.accentColor || '#FEF9E1', '&:hover': { backgroundColor: settings.updateButtonHoverColor || settings.hoverColor || '#a31d1d' } }}>
                      Add Item Record
                    </ProfessionalButton>
                  </Box>
                </Box>
              </GlassCard>
            </Fade>
          </Grid>

          {/* Item Records */}
          <Grid item xs={12} lg={6}>
            <Fade in timeout={900}>
              <GlassCard sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', border: `1px solid ${alpha(accentColor, 0.1)}` }}>
                <Box sx={{ p: 4, background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`, color: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderRadius: '20px 20px 0 0' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ReorderIcon sx={{ fontSize: '1.8rem', mr: 2 }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Item Records</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>View and manage existing records</Typography>
                    </Box>
                  </Box>
                  <ToggleButtonGroup value={viewMode} exclusive onChange={(_, m) => { if (m) setViewMode(m); }} size="small"
                    sx={{ backgroundColor: 'rgba(255,255,255,0.2)', '& .MuiToggleButton-root': { color: accentColor, borderColor: 'rgba(109,35,35,0.5)', padding: '4px 8px', '&.Mui-selected': { backgroundColor: 'rgba(255,255,255,0.3)', color: accentColor } } }}>
                    <ToggleButton value="grid"><ViewModuleIcon fontSize="small" /></ToggleButton>
                    <ToggleButton value="list"><ViewListIcon fontSize="small" /></ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                <Box sx={{ p: 4, flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <Box sx={{ mb: 3 }}>
                    <ModernTextField size="small" placeholder="Search by Employee ID, Name, or Position" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} fullWidth
                      InputProps={{ startAdornment: <SearchIcon sx={{ color: accentColor, mr: 1 }} /> }} />
                  </Box>

                  <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1, '&::-webkit-scrollbar': { width: 6 }, '&::-webkit-scrollbar-track': { background: '#f1f1f1', borderRadius: 3 }, '&::-webkit-scrollbar-thumb': { background: accentColor, borderRadius: 3 } }}>

                    {/* ── GRID: Option B — avatar + 2-col ── */}
                    {viewMode === 'grid' ? (
                      <Grid container spacing={1.5}>
                        {filteredData.map((item) => (
                          <Grid item xs={12} sm={6} key={item.id}>
                            <ItemGridCard
                              item={item}
                              employeeNames={employeeNames}
                              accentColor={accentColor}
                              textPrimaryColor={textPrimaryColor}
                              onClick={() => handleOpenModal(item)}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      /* ── LIST: Option C — table rows ── */
                      <>
                        {filteredData.length > 0 && (
                          <ItemListRow isHeader accentColor={accentColor} textPrimaryColor={textPrimaryColor} employeeNames={employeeNames} item={{}} onClick={() => {}} />
                        )}
                        {filteredData.map((item) => (
                          <ItemListRow
                            key={item.id}
                            item={item}
                            employeeNames={employeeNames}
                            accentColor={accentColor}
                            textPrimaryColor={textPrimaryColor}
                            onClick={() => handleOpenModal(item)}
                          />
                        ))}
                      </>
                    )}

                    {filteredData.length === 0 && (
                      <Box textAlign="center" py={4}>
                        <Typography variant="h6" sx={{ color: accentColor, fontWeight: 'bold', mb: 1 }}>No Records Found</Typography>
                        <Typography variant="body2" sx={{ color: grayColor }}>Try adjusting your search criteria</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </GlassCard>
            </Fade>
          </Grid>
        </Grid>

        {/* ── Edit Modal ──────────────────────────────────── */}
        <Modal open={!!editItem} onClose={handleCloseModal} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GlassCard sx={{ width: '90%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {editItem && (
              <>
                <Box
                  sx={{
                    p: 3,
                    background: `linear-gradient(135deg, ${settings.secondaryColor || '#6d2323'} 0%, ${settings.deleteButtonHoverColor || '#a31d1d'} 100%)`,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    flexShrink: 0,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <FactCheckIcon sx={{ fontSize: 24, color: '#fff' }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#fff', lineHeight: 1.1 }}>{isEditing ? 'Edit Item Information' : 'Item Information'}</Typography>
                      <Typography variant="body2" sx={{ color: '#fff', opacity: 0.9, lineHeight: 1.1 }}>View and manage item details</Typography>
                    </Box>
                  </Box>
                  <IconButton onClick={handleCloseModal} sx={{ color: '#fff' }}><Close /></IconButton>
                </Box>

                <Box sx={{ p: 4, flexGrow: 1, overflowY: 'auto', minHeight: 0, '&::-webkit-scrollbar': { width: 6 }, '&::-webkit-scrollbar-track': { background: '#f1f1f1', borderRadius: 3 }, '&::-webkit-scrollbar-thumb': { background: settings.primaryColor || accentColor, borderRadius: 3 } }}>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>Search Employee</Typography>
                      <EmployeeAutocomplete
                        value={editItem?.employeeID || ''}
                        onChange={isEditing ? handleEditEmployeeChange : () => {}}
                        selectedEmployee={selectedEditEmployee}
                        onEmployeeSelect={isEditing ? handleEditEmployeeSelect : () => {}}
                        placeholder="Search and select employee..."
                        required
                        disabled={!isEditing}
                        dropdownDisabled={!isEditing}
                        settings={settings}
                      />
                      {!isEditing && <Typography variant="caption" sx={{ color: grayColor, fontStyle: 'italic', display: 'block', mt: 0.5 }}>Contact administrator for assistance.</Typography>}
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>Selected Employee</Typography>
                      {selectedEditEmployee ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', backgroundColor: alpha(settings.accentColor || '#FEF9E1', 0.8), border: `1px solid ${alpha(settings.primaryColor || '#6d2323', 0.3)}`, borderRadius: 2, p: '12px', gap: 1.5 }}>
                          <PersonIcon sx={{ color: settings.primaryColor || accentColor, fontSize: 20 }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: settings.textPrimaryColor || accentColor, fontSize: 14, lineHeight: 1.2 }}>{selectedEditEmployee.name}</Typography>
                            <Typography variant="caption" sx={{ color: '#a31d1d', fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>#{selectedEditEmployee.employeeNumber}</Typography>
                          </Box>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)', border: '2px dashed rgba(109,35,35,0.3)', borderRadius: 2, minHeight: 36 }}>
                          <Typography variant="body2" sx={{ color: grayColor, fontStyle: 'italic', fontSize: 14 }}>No employee selected</Typography>
                        </Box>
                      )}
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 3, borderColor: 'rgba(109,35,35,0.1)' }} />

                  <Grid container spacing={2}>
                    {/* Position */}
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>Position</Typography>
                      {isEditing ? (
                        <ModernTextField value={editItem.item_description} onChange={(e) => handleChange('item_description', e.target.value, true)} fullWidth size="small" />
                      ) : (
                        <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.85)', borderRadius: 1, border: '1px solid rgba(109,35,35,0.2)' }}>
                          <Typography variant="body2">{editItem.item_description || 'N/A'}</Typography>
                        </Box>
                      )}
                    </Grid>

                    {/* Item Code */}
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>Item Code</Typography>
                      {isEditing ? (
                        <ModernTextField value={editItem.item_code} onChange={(e) => handleChange('item_code', e.target.value, true)} fullWidth size="small" />
                      ) : (
                        <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.85)', borderRadius: 1, border: '1px solid rgba(109,35,35,0.2)' }}>
                          <Typography variant="body2">{editItem.item_code || 'N/A'}</Typography>
                        </Box>
                      )}
                    </Grid>

                    {/* Salary Grade */}
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>Salary Grade</Typography>
                      {isEditing ? (
                        <FormControl fullWidth>
                          <Autocomplete freeSolo options={salaryGradeOptions} value={editItem.salary_grade || null} componentsProps={{ popper: dropdownPopperProps }}
                            onChange={(_, v) => handleChange('salary_grade', v !== null && v !== undefined ? String(v) : '', true)}
                            onInputChange={(_, v, r) => { if (r === 'input') handleChange('salary_grade', v || '', true); else if (r === 'clear') handleChange('salary_grade', '', true); }}
                            renderInput={(params) => <ModernTextField {...params} size="small" />}
                          />
                        </FormControl>
                      ) : (
                        <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.85)', borderRadius: 1, border: '1px solid rgba(109,35,35,0.2)' }}>
                          <Typography variant="body2">{editItem.salary_grade || 'N/A'}</Typography>
                        </Box>
                      )}
                    </Grid>

                    {/* Step */}
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>Step</Typography>
                      {isEditing ? (
                        <FormControl fullWidth>
                          <Autocomplete freeSolo options={stepOptions} value={editItem.step || null} componentsProps={{ popper: dropdownPopperProps }}
                            onChange={(_, v) => handleChange('step', v || '', true)}
                            onInputChange={(_, v, r) => { if (r === 'input') handleChange('step', v, true); }}
                            renderInput={(params) => <ModernTextField {...params} size="small" />}
                          />
                        </FormControl>
                      ) : (
                        <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.85)', borderRadius: 1, border: '1px solid rgba(109,35,35,0.2)' }}>
                          <Typography variant="body2">{editItem.step || 'N/A'}</Typography>
                        </Box>
                      )}
                    </Grid>

                    {/* Effectivity Date */}
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>Effectivity Date (Year)</Typography>
                      {isEditing ? (
                        <FormControl fullWidth>
                          <Autocomplete freeSolo options={effectivityDateOptions} value={editItem.effectivityDate || null} componentsProps={{ popper: dropdownPopperProps }}
                            onChange={(_, v) => handleChange('effectivityDate', v !== null && v !== undefined ? String(v) : '', true)}
                            onInputChange={(_, v, r) => { if (r === 'input') handleChange('effectivityDate', v || '', true); else if (r === 'clear') handleChange('effectivityDate', '', true); }}
                            renderInput={(params) => <ModernTextField {...params} size="small" placeholder="YYYY" />}
                          />
                        </FormControl>
                      ) : (
                        <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.85)', borderRadius: 1, border: '1px solid rgba(109,35,35,0.2)' }}>
                          <Typography variant="body2">{editItem.effectivityDate || 'N/A'}</Typography>
                        </Box>
                      )}
                    </Grid>
                  </Grid>
                </Box>

                {/* Bottom action bar */}
                <Box sx={{ borderTop: `1px solid ${alpha(settings.primaryColor || '#6d2323', 0.2)}`, backgroundColor: '#fff', px: 3, py: 2, display: 'flex', justifyContent: 'flex-end', gap: 2, position: 'sticky', bottom: 0, zIndex: 10, flexShrink: 0 }}>
                  {!isEditing ? (
                    <>
                      <ProfessionalButton onClick={() => handleDelete(editItem.id)} variant="outlined" startIcon={<DeleteIcon />}
                        sx={{ borderColor: settings.deleteButtonColor || settings.primaryColor || '#6d2323', color: settings.deleteButtonColor || settings.primaryColor || '#6d2323', minWidth: 120, '&:hover': { backgroundColor: alpha(settings.deleteButtonColor || '#6d2323', 0.1), borderColor: settings.deleteButtonHoverColor || '#a31d1d', color: settings.deleteButtonHoverColor || '#a31d1d' } }}>
                        Delete
                      </ProfessionalButton>
                      <ProfessionalButton onClick={handleStartEdit} variant="contained" startIcon={<EditIcon />}
                        sx={{ backgroundColor: settings.updateButtonColor || settings.primaryColor || '#6d2323', color: settings.accentColor || '#FEF9E1', minWidth: 120, '&:hover': { backgroundColor: settings.updateButtonHoverColor || settings.hoverColor || '#a31d1d' } }}>
                        Edit
                      </ProfessionalButton>
                    </>
                  ) : (
                    <>
                      <ProfessionalButton onClick={handleCancelEdit} variant="outlined" startIcon={<CancelIcon />}
                        sx={{ borderColor: settings.cancelButtonColor || '#6c757d', color: settings.cancelButtonColor || '#6c757d', minWidth: 120, '&:hover': { backgroundColor: alpha('#6c757d', 0.1), borderColor: '#5a6268', color: '#5a6268' } }}>
                        Cancel
                      </ProfessionalButton>
                      <ProfessionalButton onClick={handleUpdate} variant="contained" startIcon={<SaveIcon />} disabled={!hasChanges()}
                        sx={{ backgroundColor: hasChanges() ? (settings.updateButtonColor || accentColor) : alpha(accentColor, 0.5), color: settings.accentColor || '#FEF9E1', minWidth: 120, '&:hover': { backgroundColor: hasChanges() ? (settings.updateButtonHoverColor || '#a31d1d') : alpha(accentColor, 0.5) }, '&:disabled': { color: alpha(settings.accentColor || '#FEF9E1', 0.5) } }}>
                        Save
                      </ProfessionalButton>
                    </>
                  )}
                </Box>
              </>
            )}
          </GlassCard>
        </Modal>

        <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />

        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>

      </Box>
    </Box>
  );
};

export default ItemTable;