import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
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
  FormControl,
  Autocomplete,
  Checkbox,
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
  Label as FactCheckIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh,
  HelpOutline as HelpOutlineIcon,
  ErrorOutline as ErrorOutlineIcon,
  Warning as WarningIcon,
  FilterList as FilterListIcon,
  ChevronRight as ChevronRightIcon,
  WorkOutline as WorkOutlineIcon,
} from '@mui/icons-material';

import ReorderIcon from '@mui/icons-material/Reorder';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import AccessDenied from '../AccessDenied';
import usePageAccess from '../../hooks/usePageAccess';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePayrollRealtimeRefresh from '../../hooks/usePayrollRealtimeRefresh';

// ─── Theme tokens (unified with Remittance) ────────────────────────────────────
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

// ─── Shimmer / Skeleton ────────────────────────────────────────────────────────
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
      width: w, height: h, borderRadius: r,
      background: `linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)`,
      backgroundSize: '800px 100%',
      animation: 'shimmer 1.6s infinite linear',
      flexShrink: 0,
      ...sx,
    }}
  />
);

const Wireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box sx={{ py: { xs: 2, md: 4 }, mt: { xs: 0, md: -5 }, width: '100vw', maxWidth: '100%', position: 'relative', left: '63%', transform: 'translateX(-61%)', px: { xs: 2, sm: 3, md: 6 } }}>
      <Box sx={{ mb: 3, borderRadius: 3, overflow: 'hidden', border: `1px solid ${T.accentBorder}`, animation: 'blink 2s ease-in-out infinite' }}>
        <Box sx={{ p: 3.5, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2.5, position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.06)' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)', flexShrink: 0 }} />
            <Box><Bone w={220} h={18} sx={{ mb: 1 }} /><Bone w={360} h={11} /></Box>
          </Box>
        </Box>
      </Box>
      <Grid container spacing={3}>
        {[4, 8].map((lg, idx) => (
          <Grid item xs={12} lg={lg} key={idx}>
            <Box sx={{ borderRadius: 3, border: `1px solid ${T.accentBorder}`, bgcolor: '#fff', overflow: 'hidden', animation: `blink 2s ease-in-out ${idx * 0.1}s infinite`, height: 'calc(100vh - 280px)' }}>
              <Box sx={{ px: 3.5, py: 2.5, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)' }} />
                <Bone w={lg === 4 ? 160 : 220} h={13} />
              </Box>
              <Box sx={{ p: 3.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {[100, 160, 120, 140, 110, 130].map((w, i) => (
                  <Box key={i}><Bone w={w} h={10} sx={{ mb: 1 }} /><Box sx={{ height: 40, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: '#fafafa' }} /></Box>
                ))}
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  </>
);

// ─── Generic Confirmation Modal ────────────────────────────────────────────────
const ConfirmModal = ({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', confirmColor = T.accent, confirmHoverColor = T.accentDark, icon: Icon = HelpOutlineIcon, iconColor = T.accent, iconBg = T.accentFaint, loading = false }) => (
  <Modal open={open} onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, zIndex: 1400 }}>
    <Fade in={open}>
      <Box sx={{ width: '100%', maxWidth: 420, borderRadius: 3, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', bgcolor: T.surface, display: 'flex', flexDirection: 'column' }}>
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
          <AccentButton onClick={onClose} variant="outlined" sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>Cancel</AccentButton>
          <AccentButton onClick={onConfirm} variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : null}
            sx={{ fontSize: '0.8rem', bgcolor: confirmColor, color: '#fff', boxShadow: `0 2px 10px ${alpha(confirmColor, 0.32)}`, '&:hover': { bgcolor: confirmHoverColor }, '&:disabled': { bgcolor: '#ddd' } }}>
            {loading ? 'Processing…' : confirmLabel}
          </AccentButton>
        </Box>
      </Box>
    </Fade>
  </Modal>
);

// ─── Error Modal ───────────────────────────────────────────────────────────────
const ErrorModal = ({ open, onClose, title, message, icon: Icon = ErrorOutlineIcon, iconColor = '#C62828', iconBg = '#FFEBEE' }) => (
  <Modal open={open} onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, zIndex: 1500 }}>
    <Fade in={open}>
      <Box sx={{ width: '100%', maxWidth: 420, borderRadius: 3, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', bgcolor: T.surface, display: 'flex', flexDirection: 'column' }}>
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
          <AccentButton onClick={onClose} variant="contained" sx={{ fontSize: '0.8rem', bgcolor: iconColor, color: '#fff', boxShadow: `0 2px 10px ${alpha(iconColor, 0.3)}`, '&:hover': { bgcolor: alpha(iconColor, 0.85) } }}>
            Understood
          </AccentButton>
        </Box>
      </Box>
    </Fade>
  </Modal>
);

// ─── Section label ─────────────────────────────────────────────────────────────
const FormSectionLabel = ({ icon: Icon, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
    <Icon sx={{ fontSize: 12, color: alpha(T.accent, 0.45) }} />
    <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: alpha(T.accent, 0.45) }}>
      {children}
    </Typography>
  </Box>
);

// ─── Auth helper ───────────────────────────────────────────────────────────────
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  if (!token) return {};
  return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, withCredentials: true };
};

axios.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) console.error('Auth error:', error.response?.data?.message);
    else if (error.response?.status === 403) console.error('Authorization error');
    return Promise.reject(error);
  }
);

// ─── Helpers ───────────────────────────────────────────────────────────────────
const getInitials = (name = '') => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const gradePillLabel = (salary_grade, step) => {
  const parts = [];
  if (salary_grade) parts.push(`SG ${salary_grade}`);
  if (step) parts.push(`· ${step}`);
  return parts.length ? parts.join(' ') : null;
};

// ─── Employee Autocomplete ─────────────────────────────────────────────────────
const EmployeeAutocomplete = memo(({
  value, onChange, placeholder = 'Search employee...', required = false, disabled = false,
  error = false, helperText = '', selectedEmployee, onEmployeeSelect, dropdownDisabled = false,
}) => {
  const [query, setQuery]               = useState('');
  const [employees, setEmployees]       = useState([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => { if (value && !selectedEmployee) fetchEmployeeById(value); }, [value]); // eslint-disable-line
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

  return (
    <Box sx={{ position: 'relative', width: '100%' }} ref={dropdownRef}>
      <FieldInput
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
          startAdornment: <InputAdornment position="start"><PersonIcon sx={{ fontSize: 15, color: T.muted }} /></InputAdornment>,
          endAdornment: (
            <IconButton onClick={dropdownDisabled ? undefined : handleToggle} size="small" disabled={dropdownDisabled} sx={{ color: T.muted, p: 0.25 }}>
              {showDropdown ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          ),
        }}
      />
      {showDropdown && (
        <Paper elevation={4} sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, maxHeight: 260, overflow: 'auto', mt: 0.75, borderRadius: 2, border: `1px solid ${T.accentBorder}`, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 } }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, gap: 1 }}>
              <CircularProgress size={14} sx={{ color: T.accent }} />
              <Typography sx={{ fontSize: '0.78rem', color: T.muted }}>Loading…</Typography>
            </Box>
          ) : employees.length > 0 ? (
            <List dense disablePadding>
              {employees.map((emp) => (
                <ListItem key={emp.employeeNumber} button onClick={() => handleSelect(emp)}
                  sx={{ py: 1, px: 1.5, '&:hover': { bgcolor: T.accentHover }, borderBottom: `1px solid ${T.divider}`, '&:last-child': { borderBottom: 'none' } }}>
                  <Avatar sx={{ width: 26, height: 26, bgcolor: alpha(T.accent, 0.12), color: T.accent, fontSize: '0.68rem', fontWeight: 700, mr: 1.25, flexShrink: 0 }}>
                    {(emp.name?.[0] || '?').toUpperCase()}
                  </Avatar>
                  <ListItemText
                    primary={emp.name}
                    secondary={`#${emp.employeeNumber}`}
                    primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600, color: T.text }}
                    secondaryTypographyProps={{ fontSize: '0.7rem', color: T.muted }}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.78rem', color: T.faint, fontStyle: 'italic' }}>
                {query.length >= 2 ? `No employees found matching "${query}"` : 'Type to search or scroll to browse'}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
});

// ─── Memoized Grid Card ────────────────────────────────────────────────────────
const ItemGridCard = memo(({ item, employeeName, onClick }) => {
  const name     = employeeName || item.name || `Employee #${item.employeeID || 'N/A'}`;
  const position = item.item_description || item.item_code || 'No Position';
  const grade    = gradePillLabel(item.salary_grade, item.step);
  const initials = getInitials(name);

  return (
    <Box
      onClick={onClick}
      sx={{
        width: '100%', display: 'flex', flexDirection: 'column',
        p: 2, borderRadius: 2, cursor: 'pointer', bgcolor: '#fff',
        border: `1px solid ${T.accentBorder}`, transition: 'all 0.13s',
        '&:hover': { bgcolor: T.rowHover, borderColor: T.accent, transform: 'translateY(-1px)', boxShadow: `0 4px 12px ${alpha(T.accent, 0.08)}` },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, mb: 1 }}>
        <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: alpha(T.accent, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: T.accent, flexShrink: 0 }}>
          {initials}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text, lineHeight: 1.2, mb: '2px' }}>{name}</Typography>
          <Typography noWrap sx={{ fontSize: '0.72rem', color: T.muted, lineHeight: 1.3 }}>{position}</Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: T.accent }}>#{item.employeeID}</Typography>
        {grade && (
          <Box sx={{ fontSize: '0.62rem', fontWeight: 600, color: T.accent, bgcolor: alpha(T.accent, 0.07), borderRadius: '4px', px: '5px', py: '2px', lineHeight: 1 }}>{grade}</Box>
        )}
        {!!item.exempt_from_biometrics && (
          <Box sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#2e7d32', bgcolor: 'rgba(46,125,50,0.08)', border: '0.5px solid rgba(46,125,50,0.3)', borderRadius: '4px', px: '5px', py: '2px', lineHeight: 1 }}>AUTO-ATT</Box>
        )}
      </Box>
    </Box>
  );
});

// ─── Memoized List Row ─────────────────────────────────────────────────────────
const ItemListRow = memo(({ item, employeeName, onClick, isOdd }) => {
  const name     = employeeName || item.name || `Employee #${item.employeeID || 'N/A'}`;
  const position = item.item_description || item.item_code || 'No Position';
  const grade    = gradePillLabel(item.salary_grade, item.step);

  return (
    <Box
      onClick={onClick}
      sx={{
        px: 1.5, py: 1.25,
        display: 'grid', gridTemplateColumns: '90px 1fr 150px 90px',
        gap: 1, alignItems: 'center', borderRadius: 1.5, cursor: 'pointer',
        bgcolor: isOdd ? T.rowOdd : T.rowEven,
        border: '1px solid transparent',
        transition: 'background 0.13s ease',
        '&:hover': { bgcolor: T.rowHover },
      }}
    >
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent }}>#{item.employeeID}</Typography>
      <Typography noWrap sx={{ fontSize: '0.82rem', fontWeight: 500, color: T.text }}>{name}</Typography>
      <Typography noWrap sx={{ fontSize: '0.75rem', color: T.muted }}>{position}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {!!item.exempt_from_biometrics && (
          <Box sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#2e7d32', bgcolor: 'rgba(46,125,50,0.08)', border: '0.5px solid rgba(46,125,50,0.3)', borderRadius: '4px', px: '4px', py: '1px', lineHeight: 1 }}>AUTO</Box>
        )}
        {grade ? (
          <Box sx={{ fontSize: '0.62rem', fontWeight: 600, color: T.accent, bgcolor: alpha(T.accent, 0.07), borderRadius: '4px', px: '5px', py: '2px', lineHeight: 1, whiteSpace: 'nowrap' }}>{grade}</Box>
        ) : (
          <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>—</Typography>
        )}
      </Box>
    </Box>
  );
});

// ─── Biometrics Exemption Toggle ───────────────────────────────────────────────
const ExemptionToggle = memo(({ value, onChange, disabled = false }) => (
  <Box
    onClick={disabled ? undefined : () => onChange(value ? 0 : 1)}
    sx={{
      display: 'flex', alignItems: 'center', gap: 1,
      px: 1.5, py: 1,
      bgcolor: value ? alpha(T.accent, 0.06) : 'rgba(0,0,0,0.02)',
      border: `1px solid ${value ? alpha(T.accent, 0.3) : T.accentBorder}`,
      borderRadius: 2, cursor: disabled ? 'default' : 'pointer',
      transition: 'all 0.2s', userSelect: 'none',
    }}
  >
    <Checkbox
      checked={!!value}
      onChange={(e) => { if (!disabled) onChange(e.target.checked ? 1 : 0); }}
      disabled={disabled}
      sx={{ color: T.accent, p: 0 }}
      onClick={(e) => e.stopPropagation()}
    />
    <Box>
      <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: T.accent, lineHeight: 1.2 }}>Exempt from biometrics</Typography>
      <Typography sx={{ fontSize: '0.7rem', color: T.muted, lineHeight: 1.2 }}>Attendance auto-filled from official schedule</Typography>
    </Box>
  </Box>
));

// ─── Main Component ────────────────────────────────────────────────────────────
const ItemTable = () => {
  const [data, setData]                         = useState([]);
  const [employeeNames, setEmployeeNames]       = useState({});
  const [salaryGrades, setSalaryGrades]         = useState([]);
  const [salaryGradeOptions, setSalaryGradeOptions]       = useState([]);
  const [effectivityDateOptions, setEffectivityDateOptions] = useState([]);
  const [newItem, setNewItem]                   = useState({
    item_description: '', employeeID: '', name: '', item_code: '',
    salary_grade: '', step: '', effectivityDate: '', exempt_from_biometrics: 0,
  });
  const [editItem, setEditItem]                 = useState(null);
  const [originalItem, setOriginalItem]         = useState(null);
  const [isEditing, setIsEditing]               = useState(false);
  const [searchTerm, setSearchTerm]             = useState('');
  const [filterPosition, setFilterPosition]     = useState(null);
  const [loading, setLoading]                   = useState(false);
  const [pageLoading, setPageLoading]           = useState(true);
  const [successOpen, setSuccessOpen]           = useState(false);
  const [successAction, setSuccessAction]       = useState('');
  const [errors, setErrors]                     = useState({});
  const [viewMode, setViewMode]                 = useState('grid');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEditEmployee, setSelectedEditEmployee] = useState(null);
  const [snackbar, setSnackbar]                 = useState({ open: false, message: '', severity: 'success' });
  const [errorModal, setErrorModal]             = useState({ open: false, title: '', message: '', iconColor: '#C62828', iconBg: '#FFEBEE', icon: ErrorOutlineIcon });
  const [confirmModal, setConfirmModal]         = useState({ open: false, title: '', message: '', confirmLabel: 'Confirm', confirmColor: T.accent, confirmHoverColor: T.accentDark, icon: HelpOutlineIcon, iconColor: T.accent, iconBg: T.accentFaint, loading: false, onConfirm: () => {} });

  const showError    = useCallback((title, message, opts = {}) => setErrorModal({ open: true, title, message, iconColor: '#C62828', iconBg: '#FFEBEE', icon: ErrorOutlineIcon, ...opts }), []);
  const closeError   = useCallback(() => setErrorModal((p) => ({ ...p, open: false })), []);
  const showConfirm  = useCallback((opts) => setConfirmModal({ open: true, title: '', message: '', confirmLabel: 'Confirm', confirmColor: T.accent, confirmHoverColor: T.accentDark, icon: HelpOutlineIcon, iconColor: T.accent, iconBg: T.accentFaint, loading: false, onConfirm: () => {}, ...opts }), []);
  const closeConfirm = useCallback(() => setConfirmModal((p) => ({ ...p, open: false, loading: false })), []);
  const showSnackbar = useCallback((message, severity = 'success') => setSnackbar({ open: true, message, severity }), []);

  const { hasAccess, loading: accessLoading } = usePageAccess('item-table');
  const { settings } = useSystemSettings();

  const dropdownPopperProps = useMemo(() => ({ placement: 'bottom', modifiers: [{ name: 'flip', enabled: false }] }), []);
  const stepOptions         = useMemo(() => [...Array(8)].map((_, i) => `step${i + 1}`), []);

  useEffect(() => {
    const init = async () => { await Promise.all([fetchItems(), fetchSalaryGrades()]); setPageLoading(false); };
    init();
  }, []); // eslint-disable-line

  const fetchSalaryGrades = useCallback(async () => {
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
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/item-table`, getAuthHeaders());
      const items = res.data || [];
      setData(items);

      // Batch-fetch employee names for unique IDs not yet loaded
      const uniqueIds = [...new Set(items.map((item) => item.employeeID).filter(Boolean))];
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
  }, [showSnackbar]);

  usePayrollRealtimeRefresh(() => { fetchSalaryGrades(); fetchItems(); });

  // ─── Memoised derived data ─────────────────────────────────────────────────
  const uniquePositions = useMemo(
    () => [...new Set(data.map((d) => d.item_description).filter(Boolean))].sort(),
    [data]
  );

  const filteredData = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    return data.filter((item) => {
      const matchSearch = !s
        || (item.employeeID?.toString() || '').includes(s)
        || (item.name?.toLowerCase() || '').includes(s)
        || (item.item_description?.toLowerCase() || '').includes(s)
        || (employeeNames[item.employeeID]?.toLowerCase() || '').includes(s);
      const matchPosition = !filterPosition || item.item_description === filterPosition;
      return matchSearch && matchPosition;
    });
  }, [data, employeeNames, searchTerm, filterPosition]);

  // ─── Validate ──────────────────────────────────────────────────────────────
  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!newItem.item_description?.trim()) newErrors.item_description = 'This field is required';
    if (!(newItem.employeeID || selectedEmployee?.employeeNumber)?.trim()) newErrors.employeeID = 'This field is required';
    if (!(newItem.name || selectedEmployee?.name)?.trim()) newErrors.name = 'This field is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [newItem, selectedEmployee]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleAdd = useCallback(async () => {
    if (!validateForm()) {
      showError('Missing Required Fields', 'Please select an employee and fill in the position before submitting.', { icon: WarningIcon, iconColor: '#F57C00', iconBg: '#FFF3E0' });
      return;
    }
    showConfirm({
      title: 'Confirm Add Item',
      message: `Add item record for Employee #${newItem.employeeID || selectedEmployee?.employeeNumber}?\n\nThis will create a new item entry.`,
      confirmLabel: 'Add Record',
      icon: AddIcon,
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, loading: true }));
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
            exempt_from_biometrics: newItem.exempt_from_biometrics ? 1 : 0,
          };
          await axios.post(`${API_BASE_URL}/api/item-table`, itemData, getAuthHeaders());
          setNewItem({ item_description: '', employeeID: '', name: '', item_code: '', salary_grade: '', step: '', effectivityDate: '', exempt_from_biometrics: 0 });
          setSelectedEmployee(null);
          setErrors({});
          setSuccessAction('adding');
          setSuccessOpen(true);
          setTimeout(() => setSuccessOpen(false), 2000);
          fetchItems();
        } catch { showError('Submission Failed', 'Failed to add item record. Please try again.'); } finally {
          setLoading(false);
          closeConfirm();
        }
      },
    });
  }, [newItem, selectedEmployee, validateForm, showConfirm, showError, closeConfirm, fetchItems]);

  const handleUpdate = useCallback(async () => {
    try {
      await axios.put(`${API_BASE_URL}/api/item-table/${editItem.id}`, editItem, getAuthHeaders());
      setEditItem(null); setOriginalItem(null); setSelectedEditEmployee(null); setIsEditing(false);
      fetchItems();
      setSuccessAction('edit'); setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch { showError('Update Failed', 'Failed to update item record. Please try again.'); }
  }, [editItem, fetchItems, showError]);

  const handleDelete = useCallback((id) => {
    showConfirm({
      title: 'Delete Item Record',
      message: 'Are you sure you want to permanently delete this item record? This action cannot be undone.',
      confirmLabel: 'Delete',
      confirmColor: '#C62828',
      confirmHoverColor: '#B71C1C',
      icon: DeleteIcon,
      iconColor: '#C62828',
      iconBg: '#FFEBEE',
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, loading: true }));
        try {
          await axios.delete(`${API_BASE_URL}/api/item-table/${id}`, getAuthHeaders());
          setEditItem(null); setOriginalItem(null); setSelectedEditEmployee(null); setIsEditing(false);
          fetchItems();
          setSuccessAction('delete'); setSuccessOpen(true);
          setTimeout(() => setSuccessOpen(false), 2000);
        } catch { showError('Delete Failed', 'Failed to delete item record. Please try again.'); } finally { closeConfirm(); }
      },
    });
  }, [showConfirm, closeConfirm, fetchItems, showError]);

  const handleChange = useCallback((field, value, isEdit = false) => {
    if (isEdit) setEditItem((prev) => ({ ...prev, [field]: value }));
    else {
      setNewItem((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
    }
  }, [errors]);

  const handleEmployeeChange     = useCallback((num) => { setNewItem((p) => ({ ...p, employeeID: num || '' })); setErrors((p) => { const e = { ...p }; delete e.employeeID; return e; }); }, []);
  const handleEmployeeSelect     = useCallback((emp) => { setSelectedEmployee(emp); setNewItem((p) => ({ ...p, employeeID: emp?.employeeNumber || '', name: emp?.name || '' })); setErrors((p) => { const e = { ...p }; delete e.employeeID; delete e.name; return e; }); }, []);
  const handleEditEmployeeChange = useCallback((num) => setEditItem((p) => ({ ...p, employeeID: num })), []);
  const handleEditEmployeeSelect = useCallback((emp) => { setSelectedEditEmployee(emp); setEditItem((p) => ({ ...p, employeeID: emp?.employeeNumber, name: emp?.name })); }, []);

  const handleOpenModal = useCallback((item) => {
    const employeeName = employeeNames[item.employeeID] || item.name || 'Unknown';
    setEditItem({ ...item });
    setOriginalItem({ ...item });
    setSelectedEditEmployee({ name: employeeName, employeeNumber: item.employeeID });
    setIsEditing(false);
  }, [employeeNames]);

  const handleCloseModal = useCallback(() => { setEditItem(null); setOriginalItem(null); setSelectedEditEmployee(null); setIsEditing(false); }, []);
  const handleStartEdit  = useCallback(() => setIsEditing(true), []);
  const handleCancelEdit = useCallback(() => {
    setEditItem({ ...originalItem });
    setSelectedEditEmployee({ name: employeeNames[originalItem.employeeID] || originalItem.name || 'Unknown', employeeNumber: originalItem.employeeID });
    setIsEditing(false);
  }, [originalItem, employeeNames]);

  const hasChanges = useCallback(() => {
    if (!editItem || !originalItem) return false;
    return ['item_description', 'employeeID', 'name', 'item_code', 'salary_grade', 'step', 'effectivityDate', 'exempt_from_biometrics'].some((k) => editItem[k] !== originalItem[k]);
  }, [editItem, originalItem]);

  // ─── Access guards ─────────────────────────────────────────────────────────
  if (accessLoading) return <Wireframe />;
  if (hasAccess === false) return (
    <AccessDenied
      title="Access Denied"
      message="You do not have permission to access Item Information. Contact your administrator to request access."
      returnPath="/admin-home"
      returnButtonText="Return to Home"
    />
  );
  if (pageLoading) return <Wireframe />;

  const canAdd = !loading && !!newItem.item_description?.trim() && !!(newItem.employeeID || selectedEmployee?.employeeNumber);

  // ─── Autocomplete field styling (unified with FieldInput) ─────────────────
  const autocompleteSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 8, fontSize: '0.875rem', backgroundColor: '#fff',
      '& fieldset': { borderColor: T.accentBorder },
      '&:hover fieldset': { borderColor: T.accent },
      '&.Mui-focused fieldset': { borderColor: T.accent, borderWidth: 1.5 },
    },
  };

  return (
    <Fade in timeout={400}>
      <Box sx={{ py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 }, width: '100vw', maxWidth: '100%', position: 'relative', left: '63%', transform: 'translateX(-61%)', px: { xs: 2, sm: 3, md: 6 } }}>
        <LoadingOverlay open={loading} message="Processing item record…" />
        <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />

        <ErrorModal open={errorModal.open} onClose={closeError} title={errorModal.title} message={errorModal.message} icon={errorModal.icon} iconColor={errorModal.iconColor} iconBg={errorModal.iconBg} />
        <ConfirmModal open={confirmModal.open} onClose={closeConfirm} onConfirm={confirmModal.onConfirm} title={confirmModal.title} message={confirmModal.message} confirmLabel={confirmModal.confirmLabel} confirmColor={confirmModal.confirmColor} confirmHoverColor={confirmModal.confirmHoverColor} icon={confirmModal.icon} iconColor={confirmModal.iconColor} iconBg={confirmModal.iconBg} loading={confirmModal.loading} />

        {/* ── Page Header ── */}
        <SectionCard sx={{ mb: 2, overflow: 'hidden' }}>
          <Box sx={{ px: 4, py: 3, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)' }} />
            <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)' }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
              <WorkOutlineIcon sx={{ fontSize: 32, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3 }}>Item Information Management</Typography>
                <Typography sx={{ fontSize: '0.82rem', color: T.accentMid, fontWeight: 700, opacity: 0.9 }}>Administrative Panel • Add and manage item records for employees</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
              <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                <Typography sx={{ fontSize: '0.8rem', color: T.accent, fontWeight: 700 }}>{data.length} {data.length === 1 ? 'record' : 'records'}</Typography>
              </Box>
              <Tooltip title="Refresh Data">
                <IconButton onClick={fetchItems} size="small" sx={{ bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, color: T.accent, width: 34, height: 34, '&:hover': { bgcolor: alpha(T.accent, 0.15) } }}>
                  <Refresh sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </SectionCard>

        {/* ── Two-column layout ── */}
        <Grid container spacing={2}>

          {/* ── LEFT: Add New Item ── */}
          <Grid item xs={12} lg={4}>
            <SectionCard sx={{ height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ px: 3.5, py: 1.25, borderBottom: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: T.accentFaint }}>
                <AddIcon sx={{ fontSize: 15, color: T.accent }} />
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.accent }}>Add New Item</Typography>
                <Box sx={{ flex: 1 }} />
                <Typography sx={{ fontSize: '0.72rem', color: T.faint }}><Box component="span" sx={{ color: '#c62828' }}>*</Box> required</Typography>
              </Box>

              <Box sx={{ px: 3.5, py: 3, flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 } }}>

                {/* Employee Section */}
                <FormSectionLabel icon={PersonIcon}>Employee</FormSectionLabel>
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.accent, mb: 0.75 }}>
                    Search Employee <Box component="span" sx={{ color: '#c62828' }}>*</Box>
                  </Typography>
                  <EmployeeAutocomplete
                    value={newItem.employeeID}
                    onChange={handleEmployeeChange}
                    selectedEmployee={selectedEmployee}
                    onEmployeeSelect={handleEmployeeSelect}
                    placeholder="Search name or employee ID…"
                    required
                    error={!!errors.employeeID}
                    helperText={errors.employeeID || ''}
                  />
                </Box>

                {selectedEmployee ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1.75, py: 1.25, mb: 2.5, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                    <Avatar sx={{ width: 30, height: 30, bgcolor: alpha(T.accent, 0.15), fontSize: '0.78rem', color: T.accent, fontWeight: 700, flexShrink: 0 }}>
                      {(selectedEmployee.name?.[0] || '?').toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text, lineHeight: 1.2 }} noWrap>{selectedEmployee.name}</Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: T.muted }}>#{selectedEmployee.employeeNumber}</Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px dashed ${T.accentBorder}`, borderRadius: 2, py: 1.5, mb: 2.5, bgcolor: alpha(T.accent, 0.02) }}>
                    <Typography sx={{ fontSize: '0.75rem', color: T.faint, fontStyle: 'italic' }}>No employee selected yet</Typography>
                  </Box>
                )}

                <Divider sx={{ borderColor: T.divider, mb: 2.5 }} />

                {/* Item Details Section */}
                <FormSectionLabel icon={WorkOutlineIcon}>Item Details</FormSectionLabel>

                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  {/* Position */}
                  <Grid item xs={12}>
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: T.accent, mb: 0.5 }}>
                      Position <Box component="span" sx={{ color: '#c62828' }}>*</Box>
                    </Typography>
                    <FieldInput
                      value={newItem.item_description}
                      onChange={(e) => handleChange('item_description', e.target.value)}
                      fullWidth size="small"
                      error={!!errors.item_description}
                      helperText={errors.item_description || ''}
                    />
                  </Grid>

                  {/* Item Code */}
                  <Grid item xs={12} sm={6}>
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: T.accent, mb: 0.5 }}>Item Code</Typography>
                    <FieldInput value={newItem.item_code} onChange={(e) => handleChange('item_code', e.target.value)} fullWidth size="small" />
                  </Grid>

                  {/* Salary Grade */}
                  <Grid item xs={12} sm={6}>
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: T.accent, mb: 0.5 }}>Salary Grade</Typography>
                    <FormControl fullWidth>
                      <Autocomplete
                        freeSolo options={salaryGradeOptions} value={newItem.salary_grade || null}
                        componentsProps={{ popper: dropdownPopperProps }}
                        onChange={(_, v) => handleChange('salary_grade', v !== null && v !== undefined ? String(v) : '')}
                        onInputChange={(_, v, r) => { if (r === 'input') handleChange('salary_grade', v || ''); else if (r === 'clear') handleChange('salary_grade', ''); }}
                        renderInput={(params) => <TextField {...params} size="small" sx={autocompleteSx} />}
                      />
                    </FormControl>
                  </Grid>

                  {/* Step */}
                  <Grid item xs={12} sm={6}>
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: T.accent, mb: 0.5 }}>Step</Typography>
                    <FormControl fullWidth>
                      <Autocomplete
                        freeSolo options={stepOptions} value={newItem.step || null}
                        componentsProps={{ popper: dropdownPopperProps }}
                        onChange={(_, v) => handleChange('step', v || '')}
                        onInputChange={(_, v, r) => { if (r === 'input') handleChange('step', v); }}
                        renderInput={(params) => <TextField {...params} size="small" sx={autocompleteSx} />}
                      />
                    </FormControl>
                  </Grid>

                  {/* Effectivity Date */}
                  <Grid item xs={12} sm={6}>
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: T.accent, mb: 0.5 }}>Effectivity Date (Year)</Typography>
                    <FormControl fullWidth>
                      <Autocomplete
                        freeSolo options={effectivityDateOptions} value={newItem.effectivityDate || null}
                        componentsProps={{ popper: dropdownPopperProps }}
                        onChange={(_, v) => handleChange('effectivityDate', v !== null && v !== undefined ? String(v) : '')}
                        onInputChange={(_, v, r) => { if (r === 'input') handleChange('effectivityDate', v || ''); else if (r === 'clear') handleChange('effectivityDate', ''); }}
                        renderInput={(params) => <TextField {...params} size="small" placeholder="YYYY" sx={autocompleteSx} />}
                      />
                    </FormControl>
                  </Grid>

                  {/* Biometrics */}
                  <Grid item xs={12}>
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: T.accent, mb: 0.5 }}>Biometrics Exemption</Typography>
                    <ExemptionToggle value={newItem.exempt_from_biometrics} onChange={(v) => handleChange('exempt_from_biometrics', v)} />
                  </Grid>
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
                      height: 42,
                      bgcolor: canAdd ? T.accent : '#d0d0d0',
                      color: canAdd ? '#fff' : '#888',
                      boxShadow: canAdd ? `0 2px 10px ${alpha(T.accent, 0.32)}` : 'none',
                      '&:hover': { bgcolor: canAdd ? T.accentDark : '#d0d0d0' },
                      '&:disabled': { bgcolor: '#d0d0d0 !important', color: '#888 !important', boxShadow: 'none !important', transform: 'none !important' },
                    }}
                  >
                    {loading ? 'Submitting…' : 'Add Item Record'}
                  </AccentButton>
                </Box>
              </Box>
            </SectionCard>
          </Grid>

          {/* ── RIGHT: Records ── */}
          <Grid item xs={12} lg={8}>
            <SectionCard sx={{ height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>

              {/* Toolbar */}
              <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <ReorderIcon sx={{ fontSize: 17, color: T.accent }} />
                    <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: T.text }}>Item Records</Typography>
                    {filteredData.length !== data.length && (
                      <Chip label={`${filteredData.length} of ${data.length}`} size="small" sx={{ height: 18, fontSize: '0.62rem', bgcolor: alpha(T.accent, 0.1), color: T.accent, fontWeight: 700 }} />
                    )}
                  </Box>
                  <ToggleButtonGroup value={viewMode} exclusive onChange={(_, m) => { if (m) setViewMode(m); }} size="small"
                    sx={{ '& .MuiToggleButton-root': { px: 1, py: 0.35, border: `1px solid ${T.accentBorder}`, color: T.muted, '&.Mui-selected': { bgcolor: T.accentFaint, color: T.accent } } }}>
                    <ToggleButton value="grid"><ViewModuleIcon sx={{ fontSize: 14 }} /></ToggleButton>
                    <ToggleButton value="list"><ViewListIcon sx={{ fontSize: 14 }} /></ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {/* Search + Position filter row */}
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={7}>
                    <FieldInput
                      size="small" fullWidth
                      placeholder="Search by name, ID, or position…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 15, color: T.muted }} /></InputAdornment> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <Autocomplete
                      options={uniquePositions}
                      value={filterPosition}
                      onChange={(_, v) => setFilterPosition(v)}
                      renderInput={(params) => (
                        <TextField
                          {...params} size="small" placeholder="Filter by position…"
                          sx={autocompleteSx}
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: <InputAdornment position="start"><FilterListIcon sx={{ fontSize: 15, color: T.muted }} /></InputAdornment>,
                          }}
                        />
                      )}
                      clearOnEscape
                      componentsProps={{ popper: dropdownPopperProps }}
                    />
                  </Grid>
                </Grid>

                {/* Active position filter chip */}
                {filterPosition && (
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography sx={{ fontSize: '0.7rem', color: T.muted }}>Filtered by:</Typography>
                    <Chip
                      label={filterPosition}
                      size="small"
                      onDelete={() => setFilterPosition(null)}
                      sx={{ height: 20, fontSize: '0.68rem', bgcolor: alpha(T.accent, 0.1), color: T.accent, fontWeight: 600, border: `1px solid ${T.accentBorder}`, '& .MuiChip-deleteIcon': { fontSize: 14, color: T.accentMid } }}
                    />
                  </Box>
                )}
              </Box>

              {/* Records list */}
              <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                {filteredData.length === 0 ? (
                  <Box sx={{ py: 10, textAlign: 'center' }}>
                    <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                      <WorkOutlineIcon sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                    </Box>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>
                      {data.length === 0 ? 'No item records yet' : 'No records match your filters'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>
                      {data.length === 0 ? 'Use the form on the left to add a record.' : 'Try adjusting your search or position filter.'}
                    </Typography>
                  </Box>
                ) : viewMode === 'grid' ? (
                  <Grid container spacing={1.5} alignItems="stretch">
                    {filteredData.map((item) => (
                      <Grid item xs={12} sm={3} key={item.id} sx={{ display: 'flex' }}>
                        <ItemGridCard item={item} employeeName={employeeNames[item.employeeID]} onClick={() => handleOpenModal(item)} />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <>
                    {/* List header */}
                    <Box sx={{ px: 1.5, py: 1, display: 'grid', gridTemplateColumns: '90px 1fr 150px 90px', gap: 1, alignItems: 'center', bgcolor: alpha(T.accent, 0.04), borderRadius: 1.5, mb: 1 }}>
                      {['Emp. No', 'Employee', 'Position', 'Grade'].map((col) => (
                        <Typography key={col} sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{col}</Typography>
                      ))}
                    </Box>
                    {filteredData.map((item, idx) => (
                      <ItemListRow key={item.id} item={item} employeeName={employeeNames[item.employeeID]} onClick={() => handleOpenModal(item)} isOdd={idx % 2 !== 0} />
                    ))}
                  </>
                )}
              </Box>
            </SectionCard>
          </Grid>
        </Grid>

        {/* ── Edit / View Modal ── */}
        <Modal open={!!editItem} onClose={handleCloseModal} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
          <Fade in={!!editItem}>
            <Box sx={{ width: '100%', maxWidth: 920, maxHeight: '90vh', borderRadius: 3, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', bgcolor: T.surface, display: 'flex', flexDirection: 'column' }}>
              {editItem && (
                <>
                  {/* Modal header */}
                  <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                    <Box sx={{ position: 'absolute', top: -50, right: -30, width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <WorkOutlineIcon sx={{ fontSize: 18, color: '#fff' }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', lineHeight: 1.2, mb: 0.3 }}>
                          {isEditing ? 'Edit Item Record' : 'Item Details'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.68)' }}>
                            #{editItem.employeeID} • {selectedEditEmployee?.name || employeeNames[editItem.employeeID] || '—'}
                          </Typography>
                          {!isEditing && <Chip label="View mode" size="small" sx={{ height: 16, fontSize: '0.62rem', bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }} />}
                          {isEditing  && <Chip label="Editing"   size="small" sx={{ height: 16, fontSize: '0.62rem', bgcolor: 'rgba(255,200,0,0.22)', color: '#ffe082', fontWeight: 600 }} />}
                        </Box>
                      </Box>
                    </Box>
                    <IconButton onClick={handleCloseModal} size="small" sx={{ color: 'rgba(255,255,255,0.75)', position: 'relative', zIndex: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
                      <Close sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Box>

                  {/* Modal body */}
                  <Box sx={{ px: 3.5, py: 3, overflowY: 'auto', flexGrow: 1, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 } }}>

                    {/* Employee info */}
                    <FormSectionLabel icon={PersonIcon}>Employee Information</FormSectionLabel>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 2, mb: 2.5, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                      <Avatar sx={{ width: 44, height: 44, bgcolor: alpha(T.accent, 0.15), fontSize: '1rem', color: T.accent, fontWeight: 700, flexShrink: 0 }}>
                        {(selectedEditEmployee?.name?.[0] || '?').toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: T.text, lineHeight: 1.2 }} noWrap>
                          {selectedEditEmployee?.name || employeeNames[editItem.employeeID] || '—'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: T.muted, mt: 0.25 }}>Employee No. #{editItem.employeeID}</Typography>
                      </Box>
                      {isEditing ? (
                        <Box sx={{ minWidth: 220 }}>
                          <EmployeeAutocomplete
                            value={editItem.employeeID || ''}
                            onChange={handleEditEmployeeChange}
                            selectedEmployee={selectedEditEmployee}
                            onEmployeeSelect={handleEditEmployeeSelect}
                            placeholder="Change employee…"
                            required
                          />
                        </Box>
                      ) : (
                        <Chip icon={<PersonIcon sx={{ fontSize: '13px !important' }} />} label="Non-editable" size="small"
                          sx={{ height: 22, fontSize: '0.65rem', bgcolor: alpha(T.accent, 0.08), color: T.accentMid, border: `1px solid ${T.accentBorder}`, fontWeight: 600, flexShrink: 0 }} />
                      )}
                    </Box>

                    <Divider sx={{ borderColor: T.divider, mb: 2.5 }} />

                    {/* Item details — 3-col grid */}
                    <FormSectionLabel icon={WorkOutlineIcon}>Item Details</FormSectionLabel>
                    <Grid container spacing={2}>

                      {/* Position — full width */}
                      <Grid item xs={12}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: T.accent, mb: 0.5 }}>Position</Typography>
                        {isEditing ? (
                          <FieldInput value={editItem.item_description} onChange={(e) => handleChange('item_description', e.target.value, true)} fullWidth size="small" />
                        ) : (
                          <Box sx={{ px: 1.5, py: 1, bgcolor: T.accentFaint, borderRadius: 2, border: `1px solid ${T.accentBorder}` }}>
                            <Typography sx={{ fontSize: '0.82rem', color: T.text }}>{editItem.item_description || '—'}</Typography>
                          </Box>
                        )}
                      </Grid>

                      {/* Item Code */}
                      <Grid item xs={12} sm={4}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: T.accent, mb: 0.5 }}>Item Code</Typography>
                        {isEditing ? (
                          <FieldInput value={editItem.item_code} onChange={(e) => handleChange('item_code', e.target.value, true)} fullWidth size="small" />
                        ) : (
                          <Box sx={{ px: 1.5, py: 1, bgcolor: T.accentFaint, borderRadius: 2, border: `1px solid ${T.accentBorder}` }}>
                            <Typography sx={{ fontSize: '0.82rem', color: T.text }}>{editItem.item_code || '—'}</Typography>
                          </Box>
                        )}
                      </Grid>

                      {/* Salary Grade */}
                      <Grid item xs={12} sm={4}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: T.accent, mb: 0.5 }}>Salary Grade</Typography>
                        {isEditing ? (
                          <FormControl fullWidth>
                            <Autocomplete
                              freeSolo options={salaryGradeOptions} value={editItem.salary_grade || null}
                              componentsProps={{ popper: dropdownPopperProps }}
                              onChange={(_, v) => handleChange('salary_grade', v !== null && v !== undefined ? String(v) : '', true)}
                              onInputChange={(_, v, r) => { if (r === 'input') handleChange('salary_grade', v || '', true); else if (r === 'clear') handleChange('salary_grade', '', true); }}
                              renderInput={(params) => <TextField {...params} size="small" sx={autocompleteSx} />}
                            />
                          </FormControl>
                        ) : (
                          <Box sx={{ px: 1.5, py: 1, bgcolor: T.accentFaint, borderRadius: 2, border: `1px solid ${T.accentBorder}` }}>
                            <Typography sx={{ fontSize: '0.82rem', color: T.text }}>{editItem.salary_grade || '—'}</Typography>
                          </Box>
                        )}
                      </Grid>

                      {/* Step */}
                      <Grid item xs={12} sm={4}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: T.accent, mb: 0.5 }}>Step</Typography>
                        {isEditing ? (
                          <FormControl fullWidth>
                            <Autocomplete
                              freeSolo options={stepOptions} value={editItem.step || null}
                              componentsProps={{ popper: dropdownPopperProps }}
                              onChange={(_, v) => handleChange('step', v || '', true)}
                              onInputChange={(_, v, r) => { if (r === 'input') handleChange('step', v, true); }}
                              renderInput={(params) => <TextField {...params} size="small" sx={autocompleteSx} />}
                            />
                          </FormControl>
                        ) : (
                          <Box sx={{ px: 1.5, py: 1, bgcolor: T.accentFaint, borderRadius: 2, border: `1px solid ${T.accentBorder}` }}>
                            <Typography sx={{ fontSize: '0.82rem', color: T.text }}>{editItem.step || '—'}</Typography>
                          </Box>
                        )}
                      </Grid>

                      {/* Effectivity Date */}
                      <Grid item xs={12} sm={4}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: T.accent, mb: 0.5 }}>Effectivity Date (Year)</Typography>
                        {isEditing ? (
                          <FormControl fullWidth>
                            <Autocomplete
                              freeSolo options={effectivityDateOptions} value={editItem.effectivityDate || null}
                              componentsProps={{ popper: dropdownPopperProps }}
                              onChange={(_, v) => handleChange('effectivityDate', v !== null && v !== undefined ? String(v) : '', true)}
                              onInputChange={(_, v, r) => { if (r === 'input') handleChange('effectivityDate', v || '', true); else if (r === 'clear') handleChange('effectivityDate', '', true); }}
                              renderInput={(params) => <TextField {...params} size="small" placeholder="YYYY" sx={autocompleteSx} />}
                            />
                          </FormControl>
                        ) : (
                          <Box sx={{ px: 1.5, py: 1, bgcolor: T.accentFaint, borderRadius: 2, border: `1px solid ${T.accentBorder}` }}>
                            <Typography sx={{ fontSize: '0.82rem', color: T.text }}>{editItem.effectivityDate || '—'}</Typography>
                          </Box>
                        )}
                      </Grid>

                      {/* Biometrics exemption */}
                      <Grid item xs={12} sm={8}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: T.accent, mb: 0.5 }}>Biometrics Exemption</Typography>
                        {isEditing ? (
                          <ExemptionToggle value={editItem.exempt_from_biometrics} onChange={(v) => handleChange('exempt_from_biometrics', v, true)} />
                        ) : (
                          <Box sx={{ px: 1.5, py: 1, bgcolor: T.accentFaint, borderRadius: 2, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: editItem.exempt_from_biometrics ? '#2e7d32' : '#bbb' }} />
                            {editItem.exempt_from_biometrics ? (
                              <Typography sx={{ fontSize: '0.82rem', color: '#2e7d32', fontWeight: 600 }}>Exempt — attendance auto-filled from official schedule</Typography>
                            ) : (
                              <Typography sx={{ fontSize: '0.82rem', color: T.muted }}>Not exempt — uses biometric device</Typography>
                            )}
                          </Box>
                        )}
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Modal footer */}
                  <Box sx={{ px: 3.5, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: '#f9f9f9', display: 'flex', justifyContent: 'flex-end', gap: 1.25, flexShrink: 0 }}>
                    {!isEditing ? (
                      <>
                        <AccentButton
                          onClick={() => handleDelete(editItem.id)}
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
        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert onClose={() => setSnackbar((p) => ({ ...p, open: false }))} severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Fade>
  );
};

export default ItemTable;