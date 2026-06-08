import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
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
  Fade,
  Divider,
  InputAdornment,
  Avatar,
  Tooltip,
  Chip,
} from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
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
  Paid as FactCheckIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh,
  HelpOutline as HelpOutlineIcon,
  ErrorOutline as ErrorOutlineIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

import ReorderIcon from '@mui/icons-material/Reorder';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import AccessDenied from '../AccessDenied';
import usePageAccess from '../../hooks/usePageAccess';
import { useNavigate } from 'react-router-dom';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePayrollRealtimeRefresh from '../../hooks/usePayrollRealtimeRefresh';

// ─── Theme tokens (matching LeaveRequest) ─────────────────────────────────────
const T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  accentMid: '#8B4545',
  accentFaint: 'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover: 'rgba(109,35,35,0.10)',
  headerGrad: 'linear-gradient(180deg,#6d2323 0%,#7e2c2c 100%)',
  rowEven: '#ffffff',
  rowOdd: 'rgba(109,35,35,0.025)',
  rowHover: 'rgba(109,35,35,0.055)',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#a0a0a0',
  surface: '#ffffff',
  divider: 'rgba(0,0,0,0.08)',
};

// ─── Styled primitives ─────────────────────────────────────────────────────────
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
    '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: T.text },
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

// ─── Shimmer ───────────────────────────────────────────────────────────────────
const shimmerKf = `
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}`;

const Bone = ({ w = '100%', h = 14, r = 6, sx = {} }) => (
  <Box
    sx={{
      width: w,
      height: h,
      borderRadius: r,
      background: `linear-gradient(90deg, rgba(109,35,35,0.07) 25%, rgba(109,35,35,0.14) 50%, rgba(109,35,35,0.07) 75%)`,
      backgroundSize: '800px 100%',
      animation: 'shimmer 1.6s infinite linear',
      flexShrink: 0,
      ...sx,
    }}
  />
);

// ─── Wireframe ─────────────────────────────────────────────────────────────────
const Wireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box
      sx={{
        py: { xs: 2, md: 4 },
        mt: { xs: 0, md: -5 },
        width: '100vw',
        maxWidth: '100%',
        position: 'relative',
        left: '63%',
        transform: 'translateX(-61%)',
        px: { xs: 2, sm: 3, md: 6 },
      }}
    >
      {/* Header skeleton */}
      <Box
        sx={{
          mb: 3,
          borderRadius: 3,
          overflow: 'hidden',
          border: `1px solid ${T.accentBorder}`,
          animation: 'blink 2s ease-in-out infinite',
        }}
      >
        <Box
          sx={{
            p: 3.5,
            background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2.5,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.06)' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)', flexShrink: 0 }} />
            <Box sx={{ flex: 1 }}>
              <Bone w={240} h={18} sx={{ mb: 1 }} />
              <Bone w={380} h={11} />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.1)' }} />
          </Box>
        </Box>
      </Box>

      {/* Two-column skeleton */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={4}>
          <Box
            sx={{
              borderRadius: 3,
              border: `1px solid ${T.accentBorder}`,
              bgcolor: '#fff',
              overflow: 'hidden',
              animation: `blink 2s ease-in-out 0s infinite`,
              height: 'calc(100vh - 280px)',
            }}
          >
            <Box sx={{ px: 3.5, py: 2.5, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)' }} />
              <Bone w={180} h={13} />
            </Box>
            <Box sx={{ p: 3.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {[100, 160, 120, 140, 110, 130, 120].map((w, i) => (
                <Box key={i}>
                  <Bone w={w} h={10} sx={{ mb: 1 }} />
                  <Box sx={{ height: 40, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: '#fafafa' }} />
                </Box>
              ))}
            </Box>
          </Box>
        </Grid>
        <Grid item xs={12} lg={8}>
          <Box
            sx={{
              borderRadius: 3,
              border: `1px solid ${T.accentBorder}`,
              bgcolor: '#fff',
              overflow: 'hidden',
              animation: `blink 2s ease-in-out 0.1s infinite`,
              height: 'calc(100vh - 280px)',
            }}
          >
            <Box sx={{ px: 3.5, py: 2.5, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)' }} />
              <Bone w={240} h={13} />
            </Box>
            <Box sx={{ p: 3.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {[200, 160, 180, 140, 150, 170, 130].map((w, i) => (
                <Box key={i}>
                  <Bone w={w} h={10} sx={{ mb: 1 }} />
                  <Box sx={{ height: 40, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: '#fafafa' }} />
                </Box>
              ))}
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  </>
);

// ─── Generic Confirmation Modal ────────────────────────────────────────────────
const ConfirmModal = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmColor = T.accent,
  confirmHoverColor = T.accentDark,
  icon: Icon = HelpOutlineIcon,
  iconColor = T.accent,
  iconBg = T.accentFaint,
  loading = false,
}) => (
  <Modal open={open} onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, zIndex: 1400 }}>
    <Fade in={open}>
      <Box
        sx={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
          bgcolor: T.surface,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -40, right: -30, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon sx={{ fontSize: 17, color: '#fff' }} />
            </Box>
            <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.93rem' }}>{title}</Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.75)', position: 'relative', zIndex: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
        <Box sx={{ px: 3.5, py: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: iconBg, border: `1px solid ${alpha(iconColor, 0.2)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.25 }}>
              <Icon sx={{ fontSize: 18, color: iconColor }} />
            </Box>
            <Typography sx={{ fontSize: '0.875rem', color: T.text, lineHeight: 1.65, pt: 0.5, whiteSpace: 'pre-line' }}>{message}</Typography>
          </Box>
        </Box>
        <Box sx={{ px: 3.5, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: '#f9f9f9', display: 'flex', justifyContent: 'flex-end', gap: 1.25 }}>
          <AccentButton
            onClick={onClose}
            variant="outlined"
            sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}
          >
            Cancel
          </AccentButton>
          <AccentButton
            onClick={onConfirm}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : null}
            sx={{ fontSize: '0.8rem', bgcolor: confirmColor, color: '#fff', boxShadow: `0 2px 10px ${alpha(confirmColor, 0.32)}`, '&:hover': { bgcolor: confirmHoverColor }, '&:disabled': { bgcolor: '#ddd' } }}
          >
            {loading ? 'Processing…' : confirmLabel}
          </AccentButton>
        </Box>
      </Box>
    </Fade>
  </Modal>
);

// ─── Error / Info Modal ────────────────────────────────────────────────────────
const ErrorModal = ({ open, onClose, title, message, icon: Icon = ErrorOutlineIcon, iconColor = '#C62828', iconBg = '#FFEBEE' }) => (
  <Modal open={open} onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, zIndex: 1500 }}>
    <Fade in={open}>
      <Box
        sx={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
          bgcolor: T.surface,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ px: 3.5, py: 2.5, background: `linear-gradient(180deg,${iconColor} 0%,${alpha(iconColor, 0.82)} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -40, right: -30, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon sx={{ fontSize: 17, color: '#fff' }} />
            </Box>
            <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.93rem' }}>{title}</Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.75)', position: 'relative', zIndex: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
        <Box sx={{ px: 3.5, py: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: iconBg, border: `1px solid ${alpha(iconColor, 0.2)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.25 }}>
              <Icon sx={{ fontSize: 18, color: iconColor }} />
            </Box>
            <Typography sx={{ fontSize: '0.875rem', color: T.text, lineHeight: 1.65, pt: 0.5 }}>{message}</Typography>
          </Box>
        </Box>
        <Box sx={{ px: 3.5, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: '#f9f9f9', display: 'flex', justifyContent: 'flex-end' }}>
          <AccentButton
            onClick={onClose}
            variant="contained"
            sx={{ fontSize: '0.8rem', bgcolor: iconColor, color: '#fff', boxShadow: `0 2px 10px ${alpha(iconColor, 0.3)}`, '&:hover': { bgcolor: alpha(iconColor, 0.85) } }}
          >
            Understood
          </AccentButton>
        </Box>
      </Box>
    </Fade>
  </Modal>
);

// ─── Section label used inside form panels ─────────────────────────────────────
const FormSectionLabel = ({ icon: Icon, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
    <Icon sx={{ fontSize: 12, color: alpha(T.accent, 0.45) }} />
    <Typography sx={{
      fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em',
      textTransform: 'uppercase', color: alpha(T.accent, 0.45),
    }}>
      {children}
    </Typography>
  </Box>
);

// ─── Enhanced Auth header helper ───────────────────────────────────────────────
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No authentication token found in localStorage');
    return {};
  }
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  };
};

// ─── Employee Autocomplete Component ──────────────────────────────────────────
const EmployeeAutocomplete = ({
  value,
  onChange,
  placeholder = 'Search employee...',
  required = false,
  disabled = false,
  error = false,
  helperText = '',
  selectedEmployee,
  onEmployeeSelect,
  dropdownDisabled = false,
}) => {
  const [query, setQuery] = useState('');
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (value && !selectedEmployee) {
      fetchEmployeeById(value);
    }
  }, [value]); // eslint-disable-line

  useEffect(() => {
    if (selectedEmployee) {
      setQuery(selectedEmployee.name || '');
    } else if (!value) {
      setQuery('');
    }
  }, [selectedEmployee, value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchEmployees = async (searchQuery) => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/Remittance/employees/search?q=${encodeURIComponent(searchQuery)}`,
        getAuthHeaders()
      );
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllEmployees = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/Remittance/employees/search`, getAuthHeaders());
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployeeById = async (employeeNumber) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/Remittance/employees/${employeeNumber}`, getAuthHeaders());
      const employee = response.data;
      onEmployeeSelect(employee);
      setQuery(employee.name || '');
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error fetching employee by ID:', error);
      }
    }
  };

  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    setQuery(inputValue);
    setShowDropdown(true);

    if (selectedEmployee && inputValue !== selectedEmployee.name) {
      onEmployeeSelect(null);
      onChange('');
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (inputValue.trim().length >= 2) {
        fetchEmployees(inputValue);
      } else if (inputValue.trim().length === 0) {
        fetchAllEmployees();
      } else {
        setEmployees([]);
      }
    }, 300);
  };

  const handleEmployeeSelect = (employee) => {
    onEmployeeSelect(employee);
    setQuery(employee.name);
    setShowDropdown(false);
    onChange(employee.employeeNumber);
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
    if (employees.length === 0 && !isLoading) {
      if (query.length >= 2) fetchEmployees(query);
      else fetchAllEmployees();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') setShowDropdown(false);
  };

  const handleDropdownClick = () => {
    if (!showDropdown) {
      setShowDropdown(true);
      if (employees.length === 0 && !isLoading) fetchAllEmployees();
    } else {
      setShowDropdown(false);
    }
  };

  return (
    <Box sx={{ position: 'relative', width: '100%' }} ref={dropdownRef}>
      <FieldInput
        ref={inputRef}
        value={query}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        error={error}
        helperText={helperText}
        fullWidth
        autoComplete="off"
        size="small"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <PersonIcon sx={{ fontSize: 15, color: T.muted }} />
            </InputAdornment>
          ),
          endAdornment: (
            <IconButton
              onClick={dropdownDisabled ? undefined : handleDropdownClick}
              size="small"
              disabled={dropdownDisabled}
              sx={{ color: T.muted, p: 0.25 }}
            >
              {showDropdown ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          ),
        }}
      />

      {showDropdown && (
        <Paper
          elevation={4}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            maxHeight: 260,
            overflow: 'auto',
            mt: 0.75,
            borderRadius: 2,
            border: `1px solid ${T.accentBorder}`,
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
          }}
        >
          {isLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, gap: 1 }}>
              <CircularProgress size={14} sx={{ color: T.accent }} />
              <Typography sx={{ fontSize: '0.78rem', color: T.muted }}>Loading…</Typography>
            </Box>
          ) : employees.length > 0 ? (
            <List dense disablePadding>
              {employees.map((employee) => (
                <ListItem
                  key={employee.employeeNumber}
                  button
                  onClick={() => handleEmployeeSelect(employee)}
                  sx={{
                    py: 1,
                    px: 1.5,
                    '&:hover': { bgcolor: T.accentHover },
                    borderBottom: `1px solid ${T.divider}`,
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <Avatar sx={{ width: 26, height: 26, bgcolor: alpha(T.accent, 0.12), color: T.accent, fontSize: '0.68rem', fontWeight: 700, mr: 1.25, flexShrink: 0 }}>
                    {(employee.name?.[0] || '?').toUpperCase()}
                  </Avatar>
                  <ListItemText
                    primary={employee.name}
                    secondary={`#${employee.employeeNumber}`}
                    primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600, color: T.text }}
                    secondaryTypographyProps={{ fontSize: '0.7rem', color: T.muted }}
                  />
                </ListItem>
              ))}
            </List>
          ) : query.length >= 2 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.78rem', color: T.faint, fontStyle: 'italic' }}>No employees found matching "{query}"</Typography>
            </Box>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.78rem', color: T.faint, fontStyle: 'italic' }}>
                {employees.length === 0 ? 'No employees available' : 'Type to search or scroll to browse'}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────
const EmployeeRemittance = () => {
  const [data, setData] = useState([]);
  const [employeeNames, setEmployeeNames] = useState({});
  const [newRemittance, setNewRemittance] = useState({
    employeeNumber: '',
    liquidatingCash: '',
    gsisSalaryLoan: '',
    gsisPolicyLoan: '',
    gfal: '',
    gsisArrears: '',
    cpl: '',
    mpl: '',
    mplLite: '',
    emergencyLoan: '',
    nbc594: '',
    increment: '',
    sss: '',
    pagibig: '',
    pagibigFundCont: '',
    pagibig2: '',
    multiPurpLoan: '',
    landbankSalaryLoan: '',
    earistCreditCoop: '',
    feu: '',
  });
  const [editRemittance, setEditRemittance] = useState(null);
  const [originalRemittance, setOriginalRemittance] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('');
  const [errors, setErrors] = useState({});
  const [viewMode, setViewMode] = useState('grid');

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEditEmployee, setSelectedEditEmployee] = useState(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [errorModal, setErrorModal] = useState({ open: false, title: '', message: '', iconColor: '#C62828', iconBg: '#FFEBEE', icon: ErrorOutlineIcon });
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmLabel: 'Confirm', confirmColor: T.accent, confirmHoverColor: T.accentDark, icon: HelpOutlineIcon, iconColor: T.accent, iconBg: T.accentFaint, loading: false, onConfirm: () => {} });

  const showError   = (title, message, opts = {}) => setErrorModal({ open: true, title, message, iconColor: '#C62828', iconBg: '#FFEBEE', icon: ErrorOutlineIcon, ...opts });
  const closeError  = () => setErrorModal((p) => ({ ...p, open: false }));
  const showConfirm = (opts) => setConfirmModal({ open: true, title: '', message: '', confirmLabel: 'Confirm', confirmColor: T.accent, confirmHoverColor: T.accentDark, icon: HelpOutlineIcon, iconColor: T.accent, iconBg: T.accentFaint, loading: false, onConfirm: () => {}, ...opts });
  const closeConfirm = () => setConfirmModal((p) => ({ ...p, open: false, loading: false }));

  const showSnackbar = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  const { settings } = useSystemSettings();
  const navigate = useNavigate();

  const { hasAccess, loading: accessLoading, error: accessError } = usePageAccess('remittances');

  useEffect(() => {
    const init = async () => { await fetchRemittances(); setPageLoading(false); };
    init();
  }, []); // eslint-disable-line

  const fetchRemittances = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/Remittance/employee-remittance`, getAuthHeaders());
      setData(res.data);

      const uniqueEmployeeIds = [...new Set(res.data.map((r) => r.employeeNumber).filter(Boolean))];
      const namesMap = {};

      await Promise.all(
        uniqueEmployeeIds.map(async (id) => {
          try {
            const response = await axios.get(`${API_BASE_URL}/Remittance/employees/${id}`, getAuthHeaders());
            namesMap[id] = response.data.name || 'Unknown';
          } catch (error) {
            if (error.response?.status !== 404) {
              console.error(`Error fetching employee ${id}:`, error);
            }
            namesMap[id] = 'Unknown';
          }
        })
      );

      setEmployeeNames(namesMap);
    } catch (err) {
      console.error('Error fetching data:', err);
      showSnackbar('Failed to fetch remittance records. Please try again.', 'error');
    }
  };

  usePayrollRealtimeRefresh(() => { fetchRemittances(); });

  const validateForm = () => {
    const newErrors = {};
    if (!newRemittance.employeeNumber || newRemittance.employeeNumber.trim() === '') {
      newErrors.employeeNumber = 'Employee selection is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdd = async () => {
    if (!validateForm()) {
      showError('Missing Required Fields', 'Please select an employee before submitting.', { icon: WarningIcon, iconColor: '#F57C00', iconBg: '#FFF3E0' });
      return;
    }

    showConfirm({
      title: 'Confirm Add Remittance',
      message: `Add remittance record for Employee #${newRemittance.employeeNumber}?\n\nThis will create a new remittance entry.`,
      confirmLabel: 'Add Record',
      confirmColor: T.accent,
      confirmHoverColor: T.accentDark,
      icon: AddIcon,
      iconColor: T.accent,
      iconBg: T.accentFaint,
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, loading: true }));
        setLoading(true);
        try {
          const filteredRemittance = Object.fromEntries(
            Object.entries(newRemittance).filter(([key, value]) => {
              if (key === 'employeeNumber') return value !== '';
              return value !== '';
            })
          );
          Object.keys(filteredRemittance).forEach((key) => {
            if (key !== 'employeeNumber' && filteredRemittance[key] !== '') {
              filteredRemittance[key] = parseFloat(filteredRemittance[key]) || 0;
            }
          });

          await axios.post(`${API_BASE_URL}/Remittance/employee-remittance`, filteredRemittance, getAuthHeaders());

          setNewRemittance({
            employeeNumber: '', liquidatingCash: '', gsisSalaryLoan: '', gsisPolicyLoan: '',
            gfal: '', gsisArrears: '', cpl: '', mpl: '', mplLite: '', emergencyLoan: '',
            nbc594: '', increment: '', sss: '', pagibig: '', pagibigFundCont: '', pagibig2: '',
            multiPurpLoan: '', landbankSalaryLoan: '', earistCreditCoop: '', feu: '',
          });
          setSelectedEmployee(null);
          setErrors({});
          setSuccessAction('adding');
          setSuccessOpen(true);
          setTimeout(() => setSuccessOpen(false), 2000);
          fetchRemittances();
        } catch (err) {
          console.error('Error adding data:', err);
          if (err.response?.status === 409) {
            showError('Duplicate Record', 'Employee data already exists. This employee already has a remittance record.');
          } else if (err.response?.data?.message) {
            showError('Submission Failed', err.response.data.message);
          } else {
            showError('Submission Failed', 'Failed to add remittance record. Please try again.');
          }
        } finally {
          setLoading(false);
          closeConfirm();
        }
      },
    });
  };

  const handleUpdate = async () => {
    try {
      const updateData = { ...editRemittance };
      Object.keys(updateData).forEach((key) => {
        if (key !== 'employeeNumber' && key !== 'id' && key !== 'name' && key !== 'created_at') {
          updateData[key] = parseFloat(updateData[key]) || 0;
        }
      });

      await axios.put(`${API_BASE_URL}/Remittance/employee-remittance/${editRemittance.id}`, updateData, getAuthHeaders());
      setEditRemittance(null);
      setOriginalRemittance(null);
      setSelectedEditEmployee(null);
      setIsEditing(false);
      fetchRemittances();
      setSuccessAction('edit');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch (err) {
      console.error('Error updating data:', err);
      if (err.response?.data?.message) {
        showError('Update Failed', err.response.data.message);
      } else {
        showError('Update Failed', 'Failed to update remittance record. Please try again.');
      }
    }
  };

  const handleDelete = (id) => {
    showConfirm({
      title: 'Delete Remittance Record',
      message: 'Are you sure you want to permanently delete this remittance record? This action cannot be undone.',
      confirmLabel: 'Delete',
      confirmColor: '#C62828',
      confirmHoverColor: '#B71C1C',
      icon: DeleteIcon,
      iconColor: '#C62828',
      iconBg: '#FFEBEE',
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, loading: true }));
        try {
          await axios.delete(`${API_BASE_URL}/Remittance/employee-remittance/${id}`, getAuthHeaders());
          setEditRemittance(null);
          setOriginalRemittance(null);
          setSelectedEditEmployee(null);
          setIsEditing(false);
          fetchRemittances();
          setSuccessAction('delete');
          setSuccessOpen(true);
          setTimeout(() => setSuccessOpen(false), 2000);
        } catch (err) {
          console.error('Error deleting data:', err);
          if (err.response?.data?.message) {
            showError('Delete Failed', err.response.data.message);
          } else {
            showError('Delete Failed', 'Failed to delete remittance record. Please try again.');
          }
        } finally {
          closeConfirm();
        }
      },
    });
  };

  const handleChange = (field, value, isEdit = false) => {
    if (isEdit) {
      setEditRemittance({ ...editRemittance, [field]: value });
    } else {
      setNewRemittance({ ...newRemittance, [field]: value });
      if (errors[field]) {
        setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
      }
    }
  };

  const handleEmployeeChange = (employeeNumber) => {
    setNewRemittance({ ...newRemittance, employeeNumber });
    setErrors((prev) => { const n = { ...prev }; delete n.employeeNumber; return n; });
  };

  const handleEmployeeSelect = (employee) => { setSelectedEmployee(employee); };

  const handleEditEmployeeChange = (employeeNumber) => { setEditRemittance({ ...editRemittance, employeeNumber }); };
  const handleEditEmployeeSelect = (employee) => { setSelectedEditEmployee(employee); };

  const handleOpenModal = async (remittance) => {
    const employeeName = employeeNames[remittance.employeeNumber] || 'Unknown';
    setEditRemittance({ ...remittance });
    setOriginalRemittance({ ...remittance });
    setSelectedEditEmployee({ name: employeeName, employeeNumber: remittance.employeeNumber });
    setIsEditing(false);
  };

  const handleStartEdit = () => { setIsEditing(true); };

  const handleCancelEdit = () => {
    setEditRemittance({ ...originalRemittance });
    setSelectedEditEmployee({ name: employeeNames[originalRemittance.employeeNumber] || 'Unknown', employeeNumber: originalRemittance.employeeNumber });
    setIsEditing(false);
  };

  const handleCloseModal = () => {
    setEditRemittance(null);
    setOriginalRemittance(null);
    setSelectedEditEmployee(null);
    setIsEditing(false);
  };

  const handleViewModeChange = (event, newMode) => { if (newMode !== null) setViewMode(newMode); };

  const hasChanges = () => {
    if (!editRemittance || !originalRemittance) return false;
    const fields = [
      'employeeNumber', 'liquidatingCash', 'gsisSalaryLoan', 'gsisPolicyLoan', 'gfal',
      'gsisArrears', 'cpl', 'mpl', 'mplLite', 'emergencyLoan', 'nbc594', 'increment',
      'sss', 'pagibig', 'pagibigFundCont', 'pagibig2', 'multiPurpLoan', 'landbankSalaryLoan',
      'earistCreditCoop', 'feu',
    ];
    return fields.some((field) => editRemittance[field] !== originalRemittance[field]);
  };

  const fieldLabels = {
    liquidatingCash: 'Liquidating Cash',
    gsisSalaryLoan: 'GSIS Salary Loan',
    gsisPolicyLoan: 'GSIS Policy Loan',
    gfal: 'GFAL',
    gsisArrears: 'GSIS Arrears',
    cpl: 'CPL',
    mpl: 'MPL',
    mplLite: 'MPL Lite',
    emergencyLoan: 'Emergency Loan',
    nbc594: 'NBC 594',
    increment: 'Increment',
    sss: 'SSS',
    pagibig: 'Pag-IBIG',
    pagibigFundCont: 'Pag-IBIG Fund Cont.',
    pagibig2: 'Pag-IBIG 2',
    multiPurpLoan: 'Multi-Purpose Loan',
    landbankSalaryLoan: 'Landbank Salary Loan',
    earistCreditCoop: 'EARIST Credit Coop',
    feu: 'FEU',
  };

  const getTotalDeductions = (remittance) =>
    Object.keys(fieldLabels).reduce((sum, field) => sum + (parseFloat(remittance[field]) || 0), 0).toFixed(2);

  const filteredData = data.filter((remittance) => {
    const employeeNumber = remittance.employeeNumber?.toString() || '';
    const employeeName = employeeNames[remittance.employeeNumber]?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    return employeeNumber.includes(search) || employeeName.includes(search);
  });

  if (accessLoading) return <Wireframe />;
  if (hasAccess === false) return (
    <AccessDenied
      title="Access Denied"
      message="You do not have permission to access Employee Remittance Information. Contact your administrator to request access."
      returnPath="/admin-home"
      returnButtonText="Return to Home"
    />
  );
  if (pageLoading) return <Wireframe />;

  const canAdd = !loading && !!newRemittance.employeeNumber;

  return (
    <Fade in timeout={400}>
      <Box
        sx={{
          py: { xs: 1, md: 2 },
          mt: { xs: 0, md: -2 },
          mb: { xs: 1, md: 2 },
          width: '100vw',
          maxWidth: '100%',
          position: 'relative',
          left: '63%',
          transform: 'translateX(-61%)',
          px: { xs: 2, sm: 3, md: 6 },
        }}
      >
        <LoadingOverlay open={loading} message="Processing remittance record…" />
        <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />

        <ErrorModal
          open={errorModal.open}
          onClose={closeError}
          title={errorModal.title}
          message={errorModal.message}
          icon={errorModal.icon}
          iconColor={errorModal.iconColor}
          iconBg={errorModal.iconBg}
        />
        <ConfirmModal
          open={confirmModal.open}
          onClose={closeConfirm}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          confirmColor={confirmModal.confirmColor}
          confirmHoverColor={confirmModal.confirmHoverColor}
          icon={confirmModal.icon}
          iconColor={confirmModal.iconColor}
          iconBg={confirmModal.iconBg}
          loading={confirmModal.loading}
        />

        {/* ── Page Header ── */}
        <SectionCard sx={{ mb: 2, overflow: 'hidden' }}>
          <Box
            sx={{
              px: 4, py: 3,
              background: 'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              position: 'relative', overflow: 'hidden',
            }}
          >
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)' }} />
            <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)' }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
              <ReorderIcon sx={{ fontSize: 32, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3 }}>
                  Employee Remittance Management
                </Typography>
                <Typography sx={{ fontSize: '0.82rem', color: T.accentMid, fontWeight: 700, opacity: 0.9 }}>
                  Administrative Panel • Add and manage remittance records for employees
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
              <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                <Typography sx={{ fontSize: '0.8rem', color: T.accent, fontWeight: 700 }}>
                  {data.length} {data.length === 1 ? 'record' : 'records'}
                </Typography>
              </Box>
              <Tooltip title="Refresh Data">
                <IconButton
                  onClick={() => fetchRemittances()}
                  size="small"
                  sx={{
                    bgcolor: alpha(T.accent, 0.08),
                    border: `1px solid ${T.accentBorder}`,
                    color: T.accent,
                    width: 34, height: 34,
                    '&:hover': { bgcolor: alpha(T.accent, 0.15) },
                  }}
                >
                  <Refresh sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </SectionCard>

        {/* ── Two-column layout ── */}
        <Grid container spacing={2}>

          {/* ── LEFT: Add New Remittance ── */}
          <Grid item xs={12} lg={4}>
            <SectionCard sx={{ height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>

              {/* Panel header */}
              <Box sx={{
                px: 3.5, py: 1.25,
                borderBottom: `1px solid ${T.divider}`,
                display: 'flex', alignItems: 'center', gap: 1.5,
                bgcolor: T.accentFaint,
              }}>
                <AddIcon sx={{ fontSize: 15, color: T.accent }} />
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.accent }}>
                  Add New Remittance
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>
                  <Box component="span" sx={{ color: '#c62828' }}>*</Box> required
                </Typography>
              </Box>

              {/* Scrollable body */}
              <Box
                sx={{
                  px: 3.5, py: 3, flexGrow: 1, overflowY: 'auto',
                  display: 'flex', flexDirection: 'column', gap: 0,
                  '&::-webkit-scrollbar': { width: 4 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
                }}
              >
                {/* ── SECTION: Employee ── */}
                <FormSectionLabel icon={PersonIcon}>Employee</FormSectionLabel>

                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.accent, mb: 0.75 }}>
                    Search Employee <Box component="span" sx={{ color: '#c62828' }}>*</Box>
                  </Typography>
                  <EmployeeAutocomplete
                    value={newRemittance.employeeNumber}
                    onChange={handleEmployeeChange}
                    selectedEmployee={selectedEmployee}
                    onEmployeeSelect={handleEmployeeSelect}
                    placeholder="Search name or employee ID…"
                    required
                    error={!!errors.employeeNumber}
                    helperText={errors.employeeNumber || ''}
                  />
                </Box>

                {/* Employee preview pill */}
                {selectedEmployee ? (
                  <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1.25,
                    px: 1.75, py: 1.25, mb: 2.5,
                    borderRadius: 2, bgcolor: T.accentFaint,
                    border: `1px solid ${T.accentBorder}`,
                  }}>
                    <Avatar sx={{ width: 30, height: 30, bgcolor: alpha(T.accent, 0.15), fontSize: '0.78rem', color: T.accent, fontWeight: 700, flexShrink: 0 }}>
                      {(selectedEmployee.name?.[0] || '?').toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text, lineHeight: 1.2 }} noWrap>
                        {selectedEmployee.name}
                      </Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: T.muted }}>
                        #{selectedEmployee.employeeNumber}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1.5px dashed ${T.accentBorder}`, borderRadius: 2,
                    py: 1.5, mb: 2.5, bgcolor: alpha(T.accent, 0.02),
                  }}>
                    <Typography sx={{ fontSize: '0.75rem', color: T.faint, fontStyle: 'italic' }}>
                      No employee selected yet
                    </Typography>
                  </Box>
                )}

                <Divider sx={{ borderColor: T.divider, mb: 2.5 }} />

                {/* ── SECTION: Remittance Details ── */}
                <FormSectionLabel icon={FactCheckIcon}>Remittance Details</FormSectionLabel>

                <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
                  {Object.keys(fieldLabels).map((field) => (
                    <Grid item xs={12} sm={6} key={field}>
                      <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: T.accent, mb: 0.5 }}>
                        {fieldLabels[field]}
                      </Typography>
                      <FieldInput
                        type="number"
                        value={newRemittance[field]}
                        onChange={(e) => handleChange(field, e.target.value)}
                        fullWidth
                        size="small"
                        inputProps={{ step: '0.01', min: '0' }}
                        placeholder="0.00"
                      />
                    </Grid>
                  ))}
                </Grid>

                {/* Submit */}
                <Box sx={{ mt: 'auto' }}>
                  <AccentButton
                    onClick={handleAdd}
                    variant="contained"
                    fullWidth
                    startIcon={<AddIcon sx={{ fontSize: '16px !important' }} />}
                    disabled={!canAdd}
                    sx={{
                      height: 42, bgcolor: canAdd ? T.accent : '#d0d0d0', color: canAdd ? '#fff' : '#888',
                      boxShadow: canAdd ? `0 2px 10px ${alpha(T.accent, 0.32)}` : 'none',
                      '&:hover': { bgcolor: canAdd ? T.accentDark : '#d0d0d0' },
                      '&:disabled': { bgcolor: '#d0d0d0 !important', color: '#888 !important', boxShadow: 'none !important', transform: 'none !important' },
                    }}
                  >
                    {loading ? 'Submitting…' : 'Add Remittance Record'}
                  </AccentButton>
                </Box>
              </Box>
            </SectionCard>
          </Grid>

          {/* ── RIGHT: Records ── */}
          <Grid item xs={12} lg={8}>
            <SectionCard sx={{ height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>

              {/* Records header / toolbar */}
              <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint }}>

                {/* Title row */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <ReorderIcon sx={{ fontSize: 17, color: T.accent }} />
                    <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: T.text }}>
                      Remittance Records
                    </Typography>
                  </Box>
                  <ToggleButtonGroup
                    value={viewMode} exclusive onChange={handleViewModeChange} size="small"
                    sx={{ '& .MuiToggleButton-root': { px: 1, py: 0.35, border: `1px solid ${T.accentBorder}`, color: T.muted, '&.Mui-selected': { bgcolor: T.accentFaint, color: T.accent } } }}
                  >
                    <ToggleButton value="grid"><ViewModuleIcon sx={{ fontSize: 14 }} /></ToggleButton>
                    <ToggleButton value="list"><ViewListIcon sx={{ fontSize: 14 }} /></ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {/* Search */}
                <FieldInput
                  size="small"
                  placeholder="Search by name or employee ID…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 15, color: T.muted }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {/* Records list */}
              <Box
                sx={{
                  flexGrow: 1, overflowY: 'auto', p: 2,
                  '&::-webkit-scrollbar': { width: 4 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
                }}
              >
                {filteredData.length === 0 ? (
                  <Box sx={{ py: 10, textAlign: 'center' }}>
                    <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                      <FactCheckIcon sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                    </Box>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>
                      {data.length === 0 ? 'No remittance records yet' : 'No records match your search'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>
                      {data.length === 0 ? 'Use the form on the left to add a record.' : 'Try a different search term.'}
                    </Typography>
                  </Box>
                ) : viewMode === 'grid' ? (
                  <Grid container spacing={1.5} alignItems="stretch">
                    {filteredData.map((remittance) => (
                      <Grid item xs={12} sm={3} key={remittance.id} sx={{ display: 'flex' }}>
                        <Box
                          onClick={() => handleOpenModal(remittance)}
                          sx={{
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            p: 2, borderRadius: 2, cursor: 'pointer',
                            bgcolor: '#fff',
                            border: `1px solid ${T.accentBorder}`,
                            position: 'relative', transition: 'all 0.13s',
                            '&:hover': { bgcolor: T.rowHover, borderColor: T.accent },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                            <PersonIcon sx={{ fontSize: 12, color: T.faint }} />
                            <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>{remittance.employeeNumber}</Typography>
                          </Box>
                          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text, mb: 0.25 }} noWrap>
                            {employeeNames[remittance.employeeNumber] || 'Loading…'}
                          </Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: T.muted, mb: 1, flexGrow: 1 }}>
                            Total Deductions:{' '}
                            <Box component="span" sx={{ fontWeight: 700, color: T.accent }}>
                              {getTotalDeductions(remittance)}
                            </Box>
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <FactCheckIcon sx={{ fontSize: 11, color: T.faint }} />
                            <Typography sx={{ fontSize: '0.7rem', color: T.muted }}>
                              {Object.keys(fieldLabels).filter((f) => parseFloat(remittance[f]) > 0).length} active field(s)
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <>
                    <Box
                      sx={{
                        px: 1.5, py: 1,
                        display: 'grid', gridTemplateColumns: '110px 1fr 130px',
                        gap: 1, alignItems: 'center',
                        bgcolor: alpha(T.accent, 0.04), borderRadius: 1.5, mb: 1,
                      }}
                    >
                      {['Emp. No', 'Employee', 'Total Deductions'].map((col) => (
                        <Typography key={col} sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                          {col}
                        </Typography>
                      ))}
                    </Box>
                    {filteredData.map((remittance, idx) => (
                      <Box
                        key={remittance.id}
                        onClick={() => handleOpenModal(remittance)}
                        sx={{
                          px: 1.5, py: 1.25,
                          display: 'grid', gridTemplateColumns: '110px 1fr 130px',
                          gap: 1, alignItems: 'center', borderRadius: 1.5, cursor: 'pointer',
                          bgcolor: idx % 2 === 0 ? T.rowEven : T.rowOdd,
                          border: '1px solid transparent',
                          transition: 'background 0.13s ease',
                          '&:hover': { bgcolor: T.rowHover },
                        }}
                      >
                        <Typography sx={{ fontSize: '0.75rem', color: T.muted }}>{remittance.employeeNumber}</Typography>
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 500, color: T.text }} noWrap>
                          {employeeNames[remittance.employeeNumber] || 'Loading…'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ px: 1, py: 0.2, borderRadius: 1, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                            <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: T.accent }}>
                              {getTotalDeductions(remittance)}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </>
                )}
              </Box>
            </SectionCard>
          </Grid>
        </Grid>

        {/* ── Edit / View Modal ── */}
        {/* CHANGED: maxWidth 700 → 920 for wider modal */}
        <Modal open={!!editRemittance} onClose={handleCloseModal} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
          <Fade in={!!editRemittance}>
            <Box
              sx={{
                width: '100%', maxWidth: 920, maxHeight: '90vh',
                borderRadius: 3, overflow: 'hidden',
                boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
                bgcolor: T.surface, display: 'flex', flexDirection: 'column',
              }}
            >
              {editRemittance && (
                <>
                  {/* Modal header */}
                  <Box
                    sx={{
                      px: 3.5, py: 2.5, background: T.headerGrad,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      position: 'relative', overflow: 'hidden', flexShrink: 0,
                    }}
                  >
                    <Box sx={{ position: 'absolute', top: -50, right: -30, width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FactCheckIcon sx={{ fontSize: 18, color: '#fff' }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', lineHeight: 1.2, mb: 0.3 }}>
                          {isEditing ? 'Edit Remittance Record' : 'Remittance Details'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.68)' }}>
                            #{editRemittance.employeeNumber} • {selectedEditEmployee?.name || employeeNames[editRemittance.employeeNumber] || '—'}
                          </Typography>
                          {!isEditing && <Chip label="View mode" size="small" sx={{ height: 16, fontSize: '0.62rem', bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }} />}
                          {isEditing && <Chip label="Editing" size="small" sx={{ height: 16, fontSize: '0.62rem', bgcolor: 'rgba(255,200,0,0.22)', color: '#ffe082', fontWeight: 600 }} />}
                        </Box>
                      </Box>
                    </Box>
                    <IconButton onClick={handleCloseModal} size="small" sx={{ color: 'rgba(255,255,255,0.75)', position: 'relative', zIndex: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
                      <Close sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Box>

                  {/* Modal body */}
                  <Box
                    sx={{
                      px: 3.5, py: 3, overflowY: 'auto', flexGrow: 1,
                      '&::-webkit-scrollbar': { width: 4 },
                      '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
                    }}
                  >
                    {/* ── Employee section — always read-only ── */}
                    <FormSectionLabel icon={PersonIcon}>Employee Information</FormSectionLabel>

                    <Box
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 2,
                        px: 2.5, py: 2, mb: 2.5,
                        borderRadius: 2, bgcolor: T.accentFaint,
                        border: `1px solid ${T.accentBorder}`,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 44, height: 44,
                          bgcolor: alpha(T.accent, 0.15),
                          fontSize: '1rem', color: T.accent,
                          fontWeight: 700, flexShrink: 0,
                        }}
                      >
                        {(selectedEditEmployee?.name?.[0] || '?').toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: T.text, lineHeight: 1.2 }} noWrap>
                          {selectedEditEmployee?.name || employeeNames[editRemittance.employeeNumber] || '—'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: T.muted, mt: 0.25 }}>
                          Employee No. #{editRemittance.employeeNumber}
                        </Typography>
                      </Box>
                      <Chip
                        icon={<PersonIcon sx={{ fontSize: '13px !important' }} />}
                        label="Non-editable"
                        size="small"
                        sx={{
                          height: 22, fontSize: '0.65rem',
                          bgcolor: alpha(T.accent, 0.08),
                          color: T.accentMid,
                          border: `1px solid ${T.accentBorder}`,
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      />
                    </Box>

                    <Divider sx={{ borderColor: T.divider, mb: 2.5 }} />

                    {/* ── Remittance details — 3 columns ── */}
                    <FormSectionLabel icon={FactCheckIcon}>Remittance Details</FormSectionLabel>

                    {/* CHANGED: sm={6} → sm={4} for 3-column layout */}
                    <Grid container spacing={2}>
                      {Object.keys(fieldLabels).map((field) => (
                        <Grid item xs={12} sm={4} key={field}>
                          <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: T.accent, mb: 0.5 }}>
                            {fieldLabels[field]}
                          </Typography>
                          {isEditing ? (
                            <FieldInput
                              type="number"
                              value={editRemittance[field] || ''}
                              onChange={(e) => handleChange(field, e.target.value, true)}
                              fullWidth
                              size="small"
                              inputProps={{ step: '0.01', min: '0' }}
                              placeholder="0.00"
                            />
                          ) : (
                            <Box sx={{
                              px: 1.5, py: 1,
                              bgcolor: T.accentFaint, borderRadius: 2,
                              border: `1px solid ${T.accentBorder}`,
                            }}>
                              <Typography sx={{ fontSize: '0.82rem', color: T.text }}>
                                {editRemittance[field] || '0.00'}
                              </Typography>
                            </Box>
                          )}
                        </Grid>
                      ))}
                    </Grid>

                    {/* Total summary */}
                    <Box sx={{ mt: 3, p: 2.5, bgcolor: T.accentFaint, borderRadius: 2, border: `1px solid ${T.accentBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.accent }}>Total Deductions</Typography>
                      <Typography sx={{ fontSize: '1rem', fontWeight: 900, color: T.accent }}>
                        {getTotalDeductions(editRemittance)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Modal footer */}
                  <Box sx={{ px: 3.5, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: '#f9f9f9', display: 'flex', justifyContent: 'flex-end', gap: 1.25, flexShrink: 0 }}>
                    {!isEditing ? (
                      <>
                        <AccentButton
                          onClick={() => handleDelete(editRemittance.id)}
                          variant="outlined"
                          startIcon={<DeleteIcon sx={{ fontSize: '14px !important' }} />}
                          sx={{ fontSize: '0.8rem', borderColor: '#e57373', color: '#c62828', '&:hover': { bgcolor: 'rgba(198,40,40,0.04)', borderColor: '#c62828', transform: 'none' } }}
                        >
                          Delete
                        </AccentButton>
                        <AccentButton
                          onClick={handleStartEdit}
                          variant="contained"
                          startIcon={<EditIcon sx={{ fontSize: '14px !important' }} />}
                          sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}
                        >
                          Edit Record
                        </AccentButton>
                      </>
                    ) : (
                      <>
                        <AccentButton
                          onClick={handleCancelEdit}
                          variant="outlined"
                          startIcon={<CancelIcon sx={{ fontSize: '14px !important' }} />}
                          sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}
                        >
                          Cancel
                        </AccentButton>
                        <AccentButton
                          onClick={handleUpdate}
                          disabled={!hasChanges()}
                          variant="contained"
                          startIcon={<SaveIcon sx={{ fontSize: '14px !important' }} />}
                          sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}
                        >
                          Save Changes
                        </AccentButton>
                      </>
                    )}
                  </Box>
                </>
              )}
            </Box>
          </Fade>
        </Modal>

        {/* ── Snackbar ── */}
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

export default EmployeeRemittance;