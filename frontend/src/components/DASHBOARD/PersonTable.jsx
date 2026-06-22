import API_BASE_URL from '../../apiConfig';
import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import axios from 'axios';
import { getAuthHeaders } from '../../utils/auth';
import { useSocket } from '../../contexts/SocketContext';
import {
  Button,
  Box,
  TextField,
  Container,
  Grid,
  Typography,
  Chip,
  Modal,
  IconButton,
  Paper,
  CircularProgress,
  FormHelperText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  InputAdornment,
  Fade,
  Backdrop,
  styled,
  Avatar,
  Tooltip,
  alpha,
  TablePagination,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Close,
  Person as PersonIcon,
  Search as SearchIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Reorder,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  FactCheck as FactCheckIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CreditCard,
  Home,
  FamilyRestroom,
  School,
  Refresh,
} from '@mui/icons-material';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import AccessDenied from '../AccessDenied';
import { useNavigate } from 'react-router-dom';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import DashboardModuleAuditLogs from './DashboardModuleAuditLogs';

// ─── Theme tokens ────────────────────────────────────────────
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
  poppins: "'Poppins', sans-serif",
};

const STEP_OK = '#2e7d32';

// ─── Styled primitives ────────────────────────────────────────
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

const selectSx = {
  borderRadius: '8px',
  fontSize: '0.875rem',
  bgcolor: '#fff',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accent },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: T.accent,
    borderWidth: '1.5px',
  },
};

// ─── Shimmer keyframes ────────────────────────────────────────
const shimmerKeyframes = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');

@keyframes ptShimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes ptPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.60; }
}
`;

const Bone = ({ w = '100%', h = 14, r = 6, sx = {} }) => (
  <Box
    sx={{
      width: w,
      height: h,
      borderRadius: r,
      background:
        'linear-gradient(90deg, rgba(109,35,35,0.07) 25%, rgba(109,35,35,0.14) 50%, rgba(109,35,35,0.07) 75%)',
      backgroundSize: '800px 100%',
      animation: 'ptShimmer 1.6s infinite linear',
      flexShrink: 0,
      ...sx,
    }}
  />
);

const PersonTableWireframe = () => (
  <>
    <style>{shimmerKeyframes}</style>
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
      <Box
        sx={{
          mb: 3,
          borderRadius: 3,
          overflow: 'hidden',
          border: `1px solid ${T.accentBorder}`,
          animation: 'ptPulse 2s ease-in-out infinite',
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
          <Box
            sx={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 180,
              height: 180,
              borderRadius: '50%',
              bgcolor: 'rgba(109,35,35,0.06)',
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                bgcolor: 'rgba(109,35,35,0.12)',
                flexShrink: 0,
              }}
            />
            <Box sx={{ flex: 1 }}>
              <Bone w={260} h={18} sx={{ mb: 1 }} />
              <Bone w={420} h={11} />
            </Box>
          </Box>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: 'rgba(109,35,35,0.1)',
            }}
          />
        </Box>
      </Box>

      <Grid container spacing={3}>
        {[0, 1].map((col) => (
          <Grid item xs={12} lg={col === 0 ? 4 : 8} key={col}>
            <Box
              sx={{
                borderRadius: 3,
                border: `1px solid ${T.accentBorder}`,
                bgcolor: '#fff',
                overflow: 'hidden',
                animation: `ptPulse 2s ease-in-out ${col * 0.1}s infinite`,
                height: 'calc(100vh - 280px)',
              }}
            >
              <Box
                sx={{
                  px: 3.5,
                  py: 1.25,
                  borderBottom: `1px solid ${T.divider}`,
                  bgcolor: T.accentFaint,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: 15,
                    height: 15,
                    borderRadius: '50%',
                    bgcolor: 'rgba(109,35,35,0.12)',
                  }}
                />
                <Bone w={col === 0 ? 180 : 240} h={13} />
              </Box>
              <Box
                sx={{ p: 3.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}
              >
                {(col === 0
                  ? [120, 180, 130, 155, 110, 145, 170]
                  : [200, 120, 230, 160, 190]
                ).map((w, i) => (
                  <Box key={i}>
                    <Bone w={w} h={10} sx={{ mb: 1 }} />
                    <Box
                      sx={{
                        height: 40,
                        borderRadius: 2,
                        border: `1px solid ${T.accentBorder}`,
                        bgcolor: '#fafafa',
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  </>
);

// ─── Field label sx (modal view mode) ────────────────────────
const fieldLabelSx = {
  fontSize: '0.68rem',
  fontWeight: 700,
  color: alpha(T.accent, 0.45),
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  mb: 0.5,
  fontFamily: T.poppins,
};

const fieldValueSx = {
  fontSize: '0.82rem',
  color: T.text,
  p: '8px 12px',
  border: `1px solid ${T.accentBorder}`,
  borderRadius: '8px',
  backgroundColor: T.accentFaint,
  minHeight: 36,
  display: 'flex',
  alignItems: 'center',
  lineHeight: 1.4,
  fontFamily: T.poppins,
};

// ─── Modal Typography sx helper ──────────────────────────────
const modalTypoSx = (overrides = {}) => ({
  fontFamily: T.poppins,
  ...overrides,
});

// ============================================================
// PSGC API base URL
// ============================================================
const PSGC_BASE = 'https://psgc.cloud/api';

const DROPDOWN_MENU_PROPS = {
  PaperProps: { style: { maxHeight: 240, overflowY: 'auto' } },
  anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
  transformOrigin: { vertical: 'top', horizontal: 'left' },
  disablePortal: false,
};

// ============================================================
// PhilippineAddressSelector Component
// ============================================================
const PhilippineAddressSelector = ({
  prefix,
  values,
  onChange,
  disabled = false,
  showSameAsCheck = false,
  residentialValues = null,
}) => {
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  const [selRegionCode, setSelRegionCode] = useState('');
  const [selProvinceCode, setSelProvinceCode] = useState('');
  const [selCityCode, setSelCityCode] = useState('');
  const [sameAsResidential, setSameAsResidential] = useState(false);

  const barangayField =
    prefix === 'permanent' ? `${prefix}_barangay` : `${prefix}_barangayName`;
  const f = (name) => `${prefix}_${name}`;

  useEffect(() => {
    setLoadingRegions(true);
    axios
      .get(`${PSGC_BASE}/regions`)
      .then((r) => setRegions(Array.isArray(r.data) ? r.data : []))
      .catch(() => setRegions([]))
      .finally(() => setLoadingRegions(false));
  }, []);

  const handleSameAsResidential = (checked) => {
    setSameAsResidential(checked);
    if (checked && residentialValues) {
      onChange(
        'permanent_houseBlockLotNum',
        residentialValues.residential_houseBlockLotNum || '',
      );
      onChange(
        'permanent_streetName',
        residentialValues.residential_streetName || '',
      );
      onChange(
        'permanent_subdivisionOrVillage',
        residentialValues.residential_subdivisionOrVillage || '',
      );
      onChange(
        'permanent_zipcode',
        residentialValues.residential_zipcode || '',
      );
      onChange(
        'permanent_provinceName',
        residentialValues.residential_provinceName || '',
      );
      onChange(
        'permanent_cityOrMunicipality',
        residentialValues.residential_cityOrMunicipality || '',
      );
      onChange(
        'permanent_barangay',
        residentialValues.residential_barangayName || '',
      );
      setSelRegionCode('');
      setSelProvinceCode('');
      setSelCityCode('');
      setProvinces([]);
      setCities([]);
      setBarangays([]);
    }
  };

  const handleRegionChange = async (code) => {
    setSelRegionCode(code);
    setSelProvinceCode('');
    setSelCityCode('');
    setProvinces([]);
    setCities([]);
    setBarangays([]);
    onChange(f('provinceName'), '');
    onChange(f('cityOrMunicipality'), '');
    onChange(barangayField, '');
    if (!code) return;
    setLoadingProvinces(true);
    try {
      const r = await axios.get(`${PSGC_BASE}/regions/${code}/provinces`);
      const data = Array.isArray(r.data) ? r.data : [];
      if (data.length > 0) {
        setProvinces(data);
      } else {
        setLoadingCities(true);
        const r2 = await axios.get(
          `${PSGC_BASE}/regions/${code}/cities-municipalities`,
        );
        setCities(Array.isArray(r2.data) ? r2.data : []);
        setLoadingCities(false);
      }
    } catch {
      try {
        setLoadingCities(true);
        const r2 = await axios.get(
          `${PSGC_BASE}/regions/${code}/cities-municipalities`,
        );
        setCities(Array.isArray(r2.data) ? r2.data : []);
      } catch {
        setCities([]);
      } finally {
        setLoadingCities(false);
      }
    } finally {
      setLoadingProvinces(false);
    }
  };

  const handleProvinceChange = async (code, name) => {
    setSelProvinceCode(code);
    setSelCityCode('');
    setCities([]);
    setBarangays([]);
    onChange(f('provinceName'), name);
    onChange(f('cityOrMunicipality'), '');
    onChange(barangayField, '');
    if (!code) return;
    setLoadingCities(true);
    try {
      const r = await axios.get(
        `${PSGC_BASE}/provinces/${code}/cities-municipalities`,
      );
      setCities(Array.isArray(r.data) ? r.data : []);
    } catch {
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const handleCityChange = async (code, name) => {
    setSelCityCode(code);
    setBarangays([]);
    onChange(f('cityOrMunicipality'), name);
    onChange(barangayField, '');
    if (!code) return;
    setLoadingBarangays(true);
    try {
      const r = await axios.get(
        `${PSGC_BASE}/cities-municipalities/${code}/barangays`,
      );
      setBarangays(Array.isArray(r.data) ? r.data : []);
    } catch {
      setBarangays([]);
    } finally {
      setLoadingBarangays(false);
    }
  };

  const handleBarangayChange = (name) => onChange(barangayField, name);

  const isLocked = disabled || sameAsResidential;

  const dropdownSelectSx = {
    ...selectSx,
    '& .MuiSelect-select': { fontSize: '0.82rem', py: '8px' },
  };

  return (
    <Grid container spacing={2}>
      {showSameAsCheck && (
        <Grid item xs={12}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 1,
              borderRadius: 1.5,
              border: `1px dashed ${alpha(T.accent, 0.35)}`,
              backgroundColor: T.accentFaint,
              cursor: 'pointer',
              userSelect: 'none',
              width: 'fit-content',
            }}
            onClick={() => handleSameAsResidential(!sameAsResidential)}
          >
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: '4px',
                border: `2px solid ${T.accent}`,
                backgroundColor: sameAsResidential ? T.accent : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background-color 0.15s',
              }}
            >
              {sameAsResidential && (
                <Box
                  component="span"
                  sx={{
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    lineHeight: 1,
                  }}
                >
                  ✓
                </Box>
              )}
            </Box>
            <Typography
              sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.accent }}
            >
              Same as Residential Address
            </Typography>
          </Box>
        </Grid>
      )}

      {[
        { label: 'House/Block/Lot No.', field: f('houseBlockLotNum') },
        { label: 'Street Name', field: f('streetName') },
        { label: 'Subdivision / Village', field: f('subdivisionOrVillage') },
        { label: 'Zip Code', field: f('zipcode') },
      ].map(({ label, field }) => (
        <Grid item xs={12} sm={6} key={field}>
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: T.accent,
              mb: 0.75,
            }}
          >
            {label}
          </Typography>
          <FieldInput
            size="small"
            fullWidth
            disabled={isLocked}
            value={values[field] || ''}
            onChange={(e) => onChange(field, e.target.value)}
          />
        </Grid>
      ))}

      {/* Region */}
      <Grid item xs={12} sm={6}>
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: T.accent,
            mb: 0.75,
          }}
        >
          Region
        </Typography>
        <FormControl fullWidth size="small">
          <Select
            value={selRegionCode}
            onChange={(e) => handleRegionChange(e.target.value)}
            disabled={isLocked || loadingRegions}
            displayEmpty
            sx={dropdownSelectSx}
            MenuProps={DROPDOWN_MENU_PROPS}
            renderValue={(v) => {
              if (!v)
                return (
                  <em style={{ color: T.faint, fontSize: '0.82rem' }}>
                    Select Region
                  </em>
                );
              const found = regions.find((r) => r.code === v);
              return found ? found.name : v;
            }}
          >
            <MenuItem value="">
              <em>Select Region</em>
            </MenuItem>
            {loadingRegions ? (
              <MenuItem disabled>
                <CircularProgress size={12} sx={{ mr: 1 }} />
                Loading…
              </MenuItem>
            ) : (
              regions.map((r) => (
                <MenuItem
                  key={r.code}
                  value={r.code}
                  sx={{ fontSize: '0.82rem' }}
                >
                  {r.name}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      </Grid>

      {/* Province */}
      <Grid item xs={12} sm={6}>
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: T.accent,
            mb: 0.75,
          }}
        >
          Province
        </Typography>
        <FormControl fullWidth size="small">
          <Select
            value={selProvinceCode}
            onChange={(e) => {
              const found = provinces.find((p) => p.code === e.target.value);
              handleProvinceChange(e.target.value, found ? found.name : '');
            }}
            disabled={isLocked || loadingProvinces || !selRegionCode}
            displayEmpty
            sx={dropdownSelectSx}
            MenuProps={DROPDOWN_MENU_PROPS}
            renderValue={(v) => {
              if (!v) {
                const saved = values[f('provinceName')];
                return saved ? (
                  <span style={{ fontSize: '0.82rem' }}>{saved}</span>
                ) : (
                  <em style={{ color: T.faint, fontSize: '0.82rem' }}>
                    Select Province
                  </em>
                );
              }
              const found = provinces.find((p) => p.code === v);
              return found ? found.name : v;
            }}
          >
            <MenuItem value="">
              <em>Select Province</em>
            </MenuItem>
            {loadingProvinces ? (
              <MenuItem disabled>
                <CircularProgress size={12} sx={{ mr: 1 }} />
                Loading…
              </MenuItem>
            ) : (
              provinces.map((p) => (
                <MenuItem
                  key={p.code}
                  value={p.code}
                  sx={{ fontSize: '0.82rem' }}
                >
                  {p.name}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      </Grid>

      {/* City/Municipality */}
      <Grid item xs={12} sm={6}>
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: T.accent,
            mb: 0.75,
          }}
        >
          City / Municipality
        </Typography>
        <FormControl fullWidth size="small">
          <Select
            value={selCityCode}
            onChange={(e) => {
              const found = cities.find((c) => c.code === e.target.value);
              handleCityChange(e.target.value, found ? found.name : '');
            }}
            disabled={isLocked || loadingCities || !selRegionCode}
            displayEmpty
            sx={dropdownSelectSx}
            MenuProps={DROPDOWN_MENU_PROPS}
            renderValue={(v) => {
              if (!v) {
                const saved = values[f('cityOrMunicipality')];
                return saved ? (
                  <span style={{ fontSize: '0.82rem' }}>{saved}</span>
                ) : (
                  <em style={{ color: T.faint, fontSize: '0.82rem' }}>
                    Select City/Municipality
                  </em>
                );
              }
              const found = cities.find((c) => c.code === v);
              return found ? found.name : v;
            }}
          >
            <MenuItem value="">
              <em>Select City/Municipality</em>
            </MenuItem>
            {loadingCities ? (
              <MenuItem disabled>
                <CircularProgress size={12} sx={{ mr: 1 }} />
                Loading…
              </MenuItem>
            ) : (
              cities.map((c) => (
                <MenuItem
                  key={c.code}
                  value={c.code}
                  sx={{ fontSize: '0.82rem' }}
                >
                  {c.name}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      </Grid>

      {/* Barangay */}
      <Grid item xs={12} sm={6}>
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: T.accent,
            mb: 0.75,
          }}
        >
          Barangay
        </Typography>
        <FormControl fullWidth size="small">
          <Select
            value={values[barangayField] || ''}
            onChange={(e) => handleBarangayChange(e.target.value)}
            disabled={isLocked || loadingBarangays || !selCityCode}
            displayEmpty
            sx={dropdownSelectSx}
            MenuProps={DROPDOWN_MENU_PROPS}
            renderValue={(v) =>
              v || (
                <em style={{ color: T.faint, fontSize: '0.82rem' }}>
                  Select Barangay
                </em>
              )
            }
          >
            <MenuItem value="">
              <em>Select Barangay</em>
            </MenuItem>
            {loadingBarangays ? (
              <MenuItem disabled>
                <CircularProgress size={12} sx={{ mr: 1 }} />
                Loading…
              </MenuItem>
            ) : (
              barangays.map((b) => (
                <MenuItem
                  key={b.code}
                  value={b.name}
                  sx={{ fontSize: '0.82rem' }}
                >
                  {b.name}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );
};

// ============================================================
// Employee Autocomplete Component
// ============================================================
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
  const formatEmployeeName = (emp) => {
    if (!emp) return '';
    if (emp.name) return emp.name;

    const lastName = String(emp.lastName || '').trim();
    const firstName = String(emp.firstName || '').trim();
    const middleName = String(emp.middleName || '').trim();
    const nameExtension = String(emp.nameExtension || '').trim();
    const middleInitial = middleName ? `${middleName.charAt(0).toUpperCase()}.` : '';

    return [lastName, firstName, middleInitial, nameExtension]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const normalizeEmployee = (emp) => ({
    ...emp,
    name: formatEmployeeName(emp),
  });

  const [query, setQuery] = useState('');
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (value && !selectedEmployee) fetchEmployeeById(value);
  }, [value]); // eslint-disable-line

  useEffect(() => {
    if (selectedEmployee) setQuery(formatEmployeeName(selectedEmployee) || '');
    else if (!value) setQuery('');
  }, [selectedEmployee, value]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchEmployees = async (q) => {
    setIsLoading(true);
    try {
      const r = await axios.get(
        `${API_BASE_URL}/Remittance/employees/search?q=${encodeURIComponent(q)}`,
        getAuthHeaders(),
      );
        setEmployees((Array.isArray(r.data) ? r.data : []).map(normalizeEmployee));
    } catch {
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllEmployees = async () => {
    setIsLoading(true);
    try {
      const r = await axios.get(
        `${API_BASE_URL}/Remittance/employees/search`,
        getAuthHeaders(),
      );
        setEmployees((Array.isArray(r.data) ? r.data : []).map(normalizeEmployee));
    } catch {
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployeeById = async (empNum) => {
    try {
      const r = await axios.get(
        `${API_BASE_URL}/Remittance/employees/${empNum}`,
        getAuthHeaders(),
      );
        const employee = normalizeEmployee(r.data);
        onEmployeeSelect(employee);
        setQuery(employee.name || '');
    } catch (err) {
      if (err.response?.status !== 404) console.error(err);
    }
  };

  const handleInputChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    setShowDropdown(true);
    if (selectedEmployee && v !== formatEmployeeName(selectedEmployee)) {
      onEmployeeSelect(null);
      onChange('');
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (v.trim().length >= 2) fetchEmployees(v);
      else if (v.trim().length === 0) fetchAllEmployees();
      else setEmployees([]);
    }, 300);
  };

  return (
    <Box sx={{ position: 'relative', width: '100%' }} ref={dropdownRef}>
      <FieldInput
        value={query}
        onChange={handleInputChange}
        onFocus={() => {
          setShowDropdown(true);
          if (!employees.length && !isLoading) {
            query.length >= 2 ? fetchEmployees(query) : fetchAllEmployees();
          }
        }}
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
          startAdornment: (
            <PersonIcon sx={{ color: T.muted, mr: 1, fontSize: 15 }} />
          ),
          endAdornment: (
            <IconButton
              onClick={
                dropdownDisabled
                  ? undefined
                  : () => {
                      if (!showDropdown) {
                        setShowDropdown(true);
                        if (!employees.length && !isLoading)
                          fetchAllEmployees();
                      } else setShowDropdown(false);
                    }
              }
              size="small"
              disabled={dropdownDisabled}
              sx={{ color: T.muted }}
            >
              {showDropdown ? (
                <ExpandLessIcon sx={{ fontSize: 15 }} />
              ) : (
                <ExpandMoreIcon sx={{ fontSize: 15 }} />
              )}
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
            zIndex: 1300,
            maxHeight: 280,
            overflow: 'auto',
            mt: 0.75,
            borderRadius: 2,
            border: `1px solid ${T.accentBorder}`,
          }}
        >
          {isLoading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                p: 2,
                gap: 1,
              }}
            >
              <CircularProgress size={16} sx={{ color: T.accent }} />
              <Typography sx={{ fontSize: '0.8rem', color: T.muted }}>
                Loading…
              </Typography>
            </Box>
          ) : employees.length > 0 ? (
            <List dense disablePadding>
              {employees.map((emp) => (
                <ListItem
                  key={emp.employeeNumber}
                  button
                  onClick={() => {
                    onEmployeeSelect(emp);
                    setQuery(formatEmployeeName(emp));
                    setShowDropdown(false);
                    onChange(emp.employeeNumber);
                  }}
                  sx={{
                    py: 1,
                    px: 1.5,
                    '&:hover': { bgcolor: T.accentFaint },
                    borderBottom: `1px solid ${T.divider}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                      sx={{
                        width: 28,
                        height: 28,
                        fontSize: '0.72rem',
                        bgcolor: T.accent,
                        color: '#fff',
                        fontWeight: 700,
                      }}
                    >
                      {emp.name?.charAt(0)?.toUpperCase() || '?'}
                    </Avatar>
                    <Box>
                      <Typography
                        sx={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: T.text,
                        }}
                      >
                          {formatEmployeeName(emp) || 'Unknown'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>
                        #{emp.employeeNumber}
                      </Typography>
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography
                sx={{ fontSize: '0.8rem', color: T.faint, fontStyle: 'italic' }}
              >
                {query.length >= 2
                  ? `No employees found for "${query}"`
                  : 'Type to search or scroll to browse'}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

// ============================================================
// Main PersonTable Component
// ============================================================
const PersonTable = () => {
  const { socket, connected } = useSocket();
  const { settings } = useSystemSettings();

  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(24);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('');
  const [errors, setErrors] = useState({});
  const [stepErrors, setStepErrors] = useState({});
  const [checkedSteps, setCheckedSteps] = useState({});
  const [viewMode, setViewMode] = useState('grid');
  const [activeStep, setActiveStep] = useState(0);

  const navigate = useNavigate();
  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('personalinfo');

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const showSnackbar = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });

  const emptyPerson = {
    firstName: '',
    middleName: '',
    lastName: '',
    nameExtension: '',
    birthDate: '',
    placeOfBirth: '',
    sex: '',
    civilStatus: '',
    citizenship: '',
    heightCm: '',
    weightKg: '',
    bloodType: '',
    gsisNum: '',
    pagibigNum: '',
    philhealthNum: '',
    sssNum: '',
    tinNum: '',
    agencyEmployeeNum: '',
    permanent_houseBlockLotNum: '',
    permanent_streetName: '',
    permanent_subdivisionOrVillage: '',
    permanent_barangay: '',
    permanent_cityOrMunicipality: '',
    permanent_provinceName: '',
    permanent_zipcode: '',
    residential_houseBlockLotNum: '',
    residential_streetName: '',
    residential_subdivisionOrVillage: '',
    residential_barangayName: '',
    residential_cityOrMunicipality: '',
    residential_provinceName: '',
    residential_zipcode: '',
    telephone: '',
    mobileNum: '',
    emailAddress: '',
    spouseFirstName: '',
    spouseMiddleName: '',
    spouseLastName: '',
    spouseNameExtension: '',
    spouseOccupation: '',
    spouseEmployerBusinessName: '',
    spouseBusinessAddress: '',
    spouseTelephone: '',
    fatherFirstName: '',
    fatherMiddleName: '',
    fatherLastName: '',
    fatherNameExtension: '',
    motherMaidenFirstName: '',
    motherMaidenMiddleName: '',
    motherMaidenLastName: '',
    elementaryNameOfSchool: '',
    elementaryDegree: '',
    elementaryPeriodFrom: '',
    elementaryPeriodTo: '',
    elementaryHighestAttained: '',
    elementaryYearGraduated: '',
    elementaryScholarshipAcademicHonorsReceived: '',
    secondaryNameOfSchool: '',
    secondaryDegree: '',
    secondaryPeriodFrom: '',
    secondaryPeriodTo: '',
    secondaryHighestAttained: '',
    secondaryYearGraduated: '',
    secondaryScholarshipAcademicHonorsReceived: '',
  };

  const [newPerson, setNewPerson] = useState({ ...emptyPerson });
  const [editPerson, setEditPerson] = useState(null);
  const [originalPerson, setOriginalPerson] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [modalTab, setModalTab] = useState('personal');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEditEmployee, setSelectedEditEmployee] = useState(null);

  const fetchPersonsRef = useRef(null);

  useEffect(() => {
    fetchPersons().finally(() => setPageLoading(false));
  }, []);

  // ── Alphabetical sort by lastName ─────────────────────────
  useEffect(() => {
    const query = searchQuery.toLowerCase();
    setFilteredData(
      data
        .filter(
          (p) =>
            p.firstName?.toLowerCase().includes(query) ||
            p.lastName?.toLowerCase().includes(query) ||
            p.agencyEmployeeNum?.toLowerCase().includes(query),
        )
        .sort((a, b) =>
          (a.lastName || '').localeCompare(b.lastName || '', undefined, {
            sensitivity: 'base',
          }),
        ),
    );
  }, [searchQuery, data]);

  const fetchPersons = async () => {
    try {
      const r = await axios.get(
        `${API_BASE_URL}/personalinfo/person_table`,
        getAuthHeaders(),
      );
      setData(r.data);
      setFilteredData(r.data);
    } catch (e) {
      console.error('Failed to fetch data:', e);
    }
  };

  useEffect(() => {
    fetchPersonsRef.current = fetchPersons;
  });

  useEffect(() => {
    if (!socket || !connected) return;
    const handler = () => fetchPersonsRef.current?.();
    socket.on('personalInfoChanged', handler);
    return () => socket.off('personalInfoChanged', handler);
  }, [socket, connected]);

  const steps = [
    {
      label: 'Personal Information',
      subtitle: 'Basic details about yourself',
      fields: [
        'firstName',
        'middleName',
        'lastName',
        'nameExtension',
        'birthDate',
        'placeOfBirth',
        'sex',
        'civilStatus',
        'citizenship',
        'heightCm',
        'weightKg',
        'bloodType',
        'mobileNum',
        'telephone',
        'emailAddress',
      ],
    },
    {
      label: 'Government ID Information',
      subtitle: 'Your government identification numbers',
      fields: [
        'gsisNum',
        'pagibigNum',
        'philhealthNum',
        'sssNum',
        'tinNum',
        'agencyEmployeeNum',
      ],
    },
    {
      label: 'Residential Address',
      subtitle: 'Your current residential address',
      fields: ['residential_address'],
      isAddress: true,
      addressPrefix: 'residential',
    },
    {
      label: 'Permanent Address',
      subtitle: 'Your permanent address — tick below if same as residential',
      fields: ['permanent_address'],
      isAddress: true,
      addressPrefix: 'permanent',
      isSameAsResidential: true,
    },
    {
      label: 'Spouse Information',
      subtitle: 'Information about your spouse',
      fields: [
        'spouseFirstName',
        'spouseMiddleName',
        'spouseLastName',
        'spouseNameExtension',
        'spouseOccupation',
        'spouseEmployerBusinessName',
        'spouseBusinessAddress',
        'spouseTelephone',
      ],
    },
    {
      label: "Parents' Information",
      subtitle: 'Information about your parents',
      fields: [
        'fatherFirstName',
        'fatherMiddleName',
        'fatherLastName',
        'fatherNameExtension',
        'motherMaidenFirstName',
        'motherMaidenMiddleName',
        'motherMaidenLastName',
      ],
    },
    {
      label: 'Educational Background',
      subtitle: 'Elementary and secondary education',
      fields: [
        'elementaryNameOfSchool',
        'elementaryDegree',
        'elementaryPeriodFrom',
        'elementaryPeriodTo',
        'elementaryHighestAttained',
        'elementaryYearGraduated',
        'elementaryScholarshipAcademicHonorsReceived',
        'secondaryNameOfSchool',
        'secondaryDegree',
        'secondaryPeriodFrom',
        'secondaryPeriodTo',
        'secondaryHighestAttained',
        'secondaryYearGraduated',
        'secondaryScholarshipAcademicHonorsReceived',
      ],
    },
  ];

  const fieldLabels = {
    firstName: 'First Name',
    middleName: 'Middle Name',
    lastName: 'Last Name',
    nameExtension: 'Name Extension (Jr., Sr., etc.)',
    birthDate: 'Date of Birth',
    placeOfBirth: 'Place of Birth',
    sex: 'Sex',
    civilStatus: 'Civil Status',
    citizenship: 'Citizenship',
    heightCm: 'Height (cm)',
    weightKg: 'Weight (kg)',
    bloodType: 'Blood Type',
    gsisNum: 'GSIS Number',
    pagibigNum: 'Pag-IBIG Number',
    philhealthNum: 'PhilHealth Number',
    sssNum: 'SSS Number',
    tinNum: 'TIN Number',
    agencyEmployeeNum: 'Employee Number',
    telephone: 'Telephone Number',
    mobileNum: 'Mobile Number',
    emailAddress: 'Email Address',
    spouseFirstName: "Spouse's First Name",
    spouseMiddleName: "Spouse's Middle Name",
    spouseLastName: "Spouse's Last Name",
    spouseNameExtension: "Spouse's Name Extension",
    spouseOccupation: "Spouse's Occupation",
    spouseEmployerBusinessName: "Spouse's Employer/Business Name",
    spouseBusinessAddress: "Spouse's Business Address",
    spouseTelephone: "Spouse's Telephone",
    fatherFirstName: "Father's First Name",
    fatherMiddleName: "Father's Middle Name",
    fatherLastName: "Father's Last Name",
    fatherNameExtension: "Father's Name Extension",
    motherMaidenFirstName: "Mother's Maiden First Name",
    motherMaidenMiddleName: "Mother's Maiden Middle Name",
    motherMaidenLastName: "Mother's Maiden Last Name",
    elementaryNameOfSchool: 'Elementary School Name',
    elementaryDegree: 'Elementary Degree',
    elementaryPeriodFrom: 'Elementary Period From',
    elementaryPeriodTo: 'Elementary Period To',
    elementaryHighestAttained: 'Elementary Highest Attained',
    elementaryYearGraduated: 'Elementary Year Graduated',
    elementaryScholarshipAcademicHonorsReceived:
      'Elementary Scholarship/Academic Honors',
    secondaryNameOfSchool: 'Secondary School Name',
    secondaryDegree: 'Secondary Degree',
    secondaryPeriodFrom: 'Secondary Period From',
    secondaryPeriodTo: 'Secondary Period To',
    secondaryHighestAttained: 'Secondary Highest Attained',
    secondaryYearGraduated: 'Secondary Year Graduated',
    secondaryScholarshipAcademicHonorsReceived:
      'Secondary Scholarship/Academic Honors',
  };

  const requiredFields = [
    'firstName',
    'lastName',
    'birthDate',
    'sex',
    'civilStatus',
    'citizenship',
    'agencyEmployeeNum',
  ];

  const validateForm = () => {
    const newErrors = {};
    requiredFields.forEach((field) => {
      if (!newPerson[field] || newPerson[field].trim() === '')
        newErrors[field] = 'This field is required';
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCurrentStep = () => {
    const stepReqFields = steps[activeStep].fields.filter((f) =>
      requiredFields.includes(f),
    );
    const newErrors = {};
    let hasError = false;
    stepReqFields.forEach((field) => {
      if (!newPerson[field] || newPerson[field].trim() === '') {
        newErrors[field] = 'This field is required';
        hasError = true;
      }
    });
    if (hasError) {
      setErrors(newErrors);
      setStepErrors({ [activeStep]: true });
      setCheckedSteps((prev) => {
        const n = { ...prev };
        delete n[activeStep];
        return n;
      });
      showSnackbar(
        'Please fill in all required fields before proceeding',
        'error',
      );
      return false;
    }
    setStepErrors((prev) => {
      const n = { ...prev };
      delete n[activeStep];
      return n;
    });
    setCheckedSteps((prev) => ({ ...prev, [activeStep]: true }));
    return true;
  };

  const handleAdd = async () => {
    if (!validateForm()) {
      showSnackbar('Please fill in all required fields', 'error');
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/personalinfo/person_table`,
        newPerson,
        getAuthHeaders(),
      );
      setNewPerson({ ...emptyPerson });
      setActiveStep(0);
      setErrors({});
      setStepErrors({});
      setCheckedSteps({});
      setSelectedEmployee(null);
      setTimeout(() => {
        setLoading(false);
        setSuccessAction('adding');
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2000);
      }, 300);
      fetchPersons();
    } catch (error) {
      console.error('Error adding person:', error);
      setLoading(false);
      showSnackbar(
        'Failed to add Personal Information. Employee Number needs to be setup. Please try again.',
        'error',
      );
    }
  };

  const handleUpdate = async () => {
    try {
      await axios.put(
        `${API_BASE_URL}/personalinfo/person_table/${editPerson.id}`,
        editPerson,
        getAuthHeaders(),
      );
      setEditPerson(null);
      setOriginalPerson(null);
      setSelectedEditEmployee(null);
      setIsEditing(false);
      fetchPersons();
      setSuccessAction('edit');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch {
      showSnackbar('Failed to update person. Please try again.', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(
        `${API_BASE_URL}/personalinfo/person_table/${id}`,
        getAuthHeaders(),
      );
      setEditPerson(null);
      setOriginalPerson(null);
      setSelectedEditEmployee(null);
      setIsEditing(false);
      fetchPersons();
      setSuccessAction('delete');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch {
      showSnackbar('Failed to delete person. Please try again.', 'error');
    }
  };

  const handleChange = (field, value, isEdit = false) => {
    if (isEdit) {
      setEditPerson((prev) => ({ ...prev, [field]: value }));
    } else {
      setNewPerson((prev) => ({ ...prev, [field]: value }));
      if (errors[field])
        setErrors((prev) => {
          const n = { ...prev };
          delete n[field];
          return n;
        });
    }
  };

  const handleAddAddressChange = useCallback((field, value) => {
    setNewPerson((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleEditAddressChange = useCallback((field, value) => {
    setEditPerson((prev) => (prev ? { ...prev, [field]: value } : prev));
  }, []);

  const handleOpenModal = (person) => {
    setEditPerson({ ...person });
    setOriginalPerson({ ...person });
    setModalTab('personal');
    setSelectedEditEmployee({
      name: `${person.firstName} ${person.lastName}`,
      employeeNumber: person.agencyEmployeeNum,
    });
    setIsEditing(false);
  };

  const hasChanges = () => {
    if (!editPerson || !originalPerson) return false;
    return JSON.stringify(editPerson) !== JSON.stringify(originalPerson);
  };

  const getDisplayValue = (value) => {
    const str = `${value ?? ''}`.trim();
    return str || '—';
  };

  useEffect(() => {
    if (page > 0 && page * rowsPerPage >= filteredData.length) setPage(0);
  }, [filteredData.length, page, rowsPerPage]);

  if (hasAccess === null) return <PersonTableWireframe />;
  if (hasAccess === false) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Personal Information Management."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }

  if (pageLoading) return <PersonTableWireframe />;

  const paginatedData = filteredData.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage,
  );

  // ── Render active step content ────────────────────────────
  const renderStepContent = (step) => {
    if (step.isAddress) {
      return (
        <Box sx={{ mt: 1 }}>
          <PhilippineAddressSelector
            prefix={step.addressPrefix}
            values={newPerson}
            onChange={handleAddAddressChange}
            showSameAsCheck={!!step.isSameAsResidential}
            residentialValues={step.isSameAsResidential ? newPerson : null}
          />
        </Box>
      );
    }

    return (
      <Grid container spacing={2}>
        {step.fields.map((field) => {
          const isRequired = requiredFields.includes(field);
          const hasError = errors[field];

          if (field === 'sex')
            return (
              <Grid item xs={12} sm={6} key={field}>
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: T.accent,
                    mb: 0.75,
                  }}
                >
                  {fieldLabels[field]}
                  {isRequired && <span style={{ color: '#c62828' }}> *</span>}
                </Typography>
                <FormControl fullWidth size="small" error={!!hasError}>
                  <Select
                    value={newPerson[field]}
                    onChange={(e) => handleChange(field, e.target.value)}
                    sx={selectSx}
                  >
                    <MenuItem value="">Select Sex</MenuItem>
                    {['Male', 'Female', 'Other'].map((v) => (
                      <MenuItem key={v} value={v} sx={{ fontSize: '0.82rem' }}>
                        {v}
                      </MenuItem>
                    ))}
                  </Select>
                  {hasError && <FormHelperText>{hasError}</FormHelperText>}
                </FormControl>
              </Grid>
            );

          if (field === 'civilStatus')
            return (
              <Grid item xs={12} sm={6} key={field}>
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: T.accent,
                    mb: 0.75,
                  }}
                >
                  {fieldLabels[field]}
                  {isRequired && <span style={{ color: '#c62828' }}> *</span>}
                </Typography>
                <FormControl fullWidth size="small" error={!!hasError}>
                  <Select
                    value={newPerson[field]}
                    onChange={(e) => handleChange(field, e.target.value)}
                    sx={selectSx}
                  >
                    <MenuItem value="">Select Civil Status</MenuItem>
                    {[
                      'Single',
                      'Married',
                      'Widowed',
                      'Separated',
                      'Divorced',
                    ].map((v) => (
                      <MenuItem key={v} value={v} sx={{ fontSize: '0.82rem' }}>
                        {v}
                      </MenuItem>
                    ))}
                  </Select>
                  {hasError && <FormHelperText>{hasError}</FormHelperText>}
                </FormControl>
              </Grid>
            );

          if (field === 'bloodType')
            return (
              <Grid item xs={12} sm={6} key={field}>
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: T.accent,
                    mb: 0.75,
                  }}
                >
                  {fieldLabels[field]}
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={newPerson[field]}
                    onChange={(e) => handleChange(field, e.target.value)}
                    sx={selectSx}
                  >
                    <MenuItem value="">Select Blood Type</MenuItem>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(
                      (bt) => (
                        <MenuItem
                          key={bt}
                          value={bt}
                          sx={{ fontSize: '0.82rem' }}
                        >
                          {bt}
                        </MenuItem>
                      ),
                    )}
                  </Select>
                </FormControl>
              </Grid>
            );

          if (field === 'agencyEmployeeNum')
            return (
              <Grid item xs={12} sm={6} key={field}>
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: T.accent,
                    mb: 0.75,
                  }}
                >
                  {fieldLabels[field]}
                  {isRequired && <span style={{ color: '#c62828' }}> *</span>}
                </Typography>
                <EmployeeAutocomplete
                  value={newPerson[field]}
                  onChange={(val) => {
                    setNewPerson((p) => ({ ...p, agencyEmployeeNum: val }));
                    setErrors((prev) => {
                      const n = { ...prev };
                      delete n.agencyEmployeeNum;
                      return n;
                    });
                  }}
                  selectedEmployee={selectedEmployee}
                  onEmployeeSelect={setSelectedEmployee}
                  placeholder="Search and select employee..."
                  required
                  error={!!hasError}
                  helperText={hasError || ''}
                />
              </Grid>
            );

          return (
            <Grid item xs={12} sm={6} key={field}>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: T.accent,
                  mb: 0.75,
                }}
              >
                {fieldLabels[field]}
                {isRequired && <span style={{ color: '#c62828' }}> *</span>}
              </Typography>
              <FieldInput
                value={newPerson[field]}
                onChange={(e) => handleChange(field, e.target.value)}
                fullWidth
                size="small"
                type={
                  field.includes('Date') ||
                  field.includes('From') ||
                  field.includes('To') ||
                  field.includes('Graduated')
                    ? 'date'
                    : 'text'
                }
                error={!!hasError}
                helperText={hasError || ''}
              />
            </Grid>
          );
        })}
      </Grid>
    );
  };

  // ── renderModalField ──────────────────────────────────────
  const renderModalField = (
    label,
    field,
    { type = 'text', full = false, options = null } = {},
  ) => {
    const value = editPerson?.[field] ?? '';
    return (
      <Box sx={{ gridColumn: full ? '1 / -1' : 'auto' }}>
        <Typography sx={fieldLabelSx}>{label}</Typography>
        {isEditing ? (
          options ? (
            <FormControl fullWidth size="small">
              <Select
                value={value}
                onChange={(e) => handleChange(field, e.target.value, true)}
                sx={{
                  ...selectSx,
                  fontFamily: T.poppins,
                  '& .MuiSelect-select': {
                    fontSize: '0.82rem',
                    py: '8px',
                    fontFamily: T.poppins,
                  },
                }}
              >
                <MenuItem value="" sx={{ fontFamily: T.poppins }}>
                  Select
                </MenuItem>
                {options.map((opt) => (
                  <MenuItem
                    key={opt}
                    value={opt}
                    sx={{ fontSize: '0.82rem', fontFamily: T.poppins }}
                  >
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <FieldInput
              fullWidth
              size="small"
              type={type}
              value={value}
              onChange={(e) => handleChange(field, e.target.value, true)}
              inputProps={{
                style: { fontFamily: T.poppins, fontSize: '0.82rem' },
              }}
            />
          )
        ) : (
          <Box sx={fieldValueSx}>{getDisplayValue(value)}</Box>
        )}
      </Box>
    );
  };

  return (
    <>
      <style>{shimmerKeyframes}</style>
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
          <LoadingOverlay
            open={loading}
            message="Processing personal information record…"
          />
          <SuccessfulOverlay
            open={successOpen}
            action={successAction}
            onClose={() => setSuccessOpen(false)}
          />

          {/* ── Page Header ── */}
          <SectionCard sx={{ mb: 2, overflow: 'hidden' }}>
            <Box
              sx={{
                px: 4,
                py: 3,
                background: 'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)',
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
                  top: -50,
                  right: -50,
                  width: 200,
                  height: 200,
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -30,
                  left: '30%',
                  width: 150,
                  height: 150,
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)',
                }}
              />
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <PersonIcon sx={{ fontSize: 32, color: T.accent }} />
                <Box>
                  <Typography
                    sx={{
                      fontSize: '1.25rem',
                      fontWeight: 900,
                      color: T.accent,
                      lineHeight: 1.2,
                      mb: 0.3,
                    }}
                  >
                    Personal Information Management
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.82rem',
                      color: T.accentMid,
                      fontWeight: 700,
                      opacity: 0.9,
                    }}
                  >
                    Administrative Panel • Add and manage personal information
                    records
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <Box
                  sx={{
                    px: 2.5,
                    py: 0.75,
                    borderRadius: 6,
                    bgcolor: alpha(T.accent, 0.1),
                    border: `1px solid ${alpha(T.accent, 0.2)}`,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.8rem',
                      color: T.accent,
                      fontWeight: 700,
                    }}
                  >
                    {data.length} {data.length === 1 ? 'record' : 'records'}
                  </Typography>
                </Box>
                <DashboardModuleAuditLogs tableName="person_table" moduleLabel="Personal Information" />
                <Tooltip title="Refresh Data">
                  <IconButton
                    onClick={fetchPersons}
                    sx={{
                      bgcolor: alpha(T.accent, 0.08),
                      color: T.accent,
                      width: 36,
                      height: 36,
                      '&:hover': { bgcolor: alpha(T.accent, 0.15) },
                    }}
                  >
                    <Refresh sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </SectionCard>

          {/* ── Two-column layout ── */}
          <Grid container spacing={2}>
            {/* ── LEFT: Add New Person ── */}
            <Grid item xs={12} lg={5}>
              <SectionCard
                sx={{
                  height: 'calc(100vh - 280px)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Panel header */}
                <Box
                  sx={{
                    px: 3.5,
                    py: 1.25,
                    borderBottom: `1px solid ${T.divider}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    bgcolor: T.accentFaint,
                    flexShrink: 0,
                  }}
                >
                  <AddIcon sx={{ fontSize: 15, color: T.accent }} />
                  <Typography
                    sx={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: T.accent,
                    }}
                  >
                    Add New Personal Information
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>
                    <Box component="span" sx={{ color: '#c62828' }}>
                      *
                    </Box>{' '}
                    required
                  </Typography>
                </Box>

                {/* Step indicator bar */}
                <Box
                  sx={{
                    px: 2,
                    py: 1.25,
                    borderBottom: `1px solid ${T.divider}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0,
                    flexShrink: 0,
                    overflowX: 'auto',
                    '&::-webkit-scrollbar': { display: 'none' },
                  }}
                >
                  {steps.map((step, index) => {
                    const isCompleted = index < activeStep;
                    const isActive = index === activeStep;
                    const hasError = stepErrors[index];
                    const isChecked = checkedSteps[index] && !hasError;
                    return (
                      <React.Fragment key={step.label}>
                        <Box
                          onClick={() => setActiveStep(index)}
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'pointer',
                            px: 0.75,
                            py: 0.5,
                            borderRadius: 1.5,
                            transition: 'background 0.13s',
                            flexShrink: 0,
                            '&:hover': { bgcolor: T.accentFaint },
                          }}
                        >
                          <Box
                            sx={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              bgcolor: hasError
                                ? '#c62828'
                                : isChecked
                                  ? STEP_OK
                                  : isActive
                                    ? T.accent
                                    : alpha(T.accent, 0.15),
                              color:
                                isChecked || isActive || hasError
                                  ? '#fff'
                                  : T.muted,
                              mb: 0.4,
                              transition: 'all 0.15s',
                            }}
                          >
                            {isChecked ? '✓' : index + 1}
                          </Box>
                          <Typography
                            sx={{
                              fontSize: '0.58rem',
                              fontWeight: isActive ? 700 : 500,
                              color: hasError
                                ? '#c62828'
                                : isChecked
                                  ? STEP_OK
                                : isActive
                                  ? T.accent
                                  : isCompleted
                                    ? T.muted
                                    : T.faint,
                              whiteSpace: 'nowrap',
                              lineHeight: 1.2,
                              textAlign: 'center',
                            }}
                          >
                            {step.label.split(' ')[0]}
                          </Typography>
                        </Box>
                        {index < steps.length - 1 && (
                          <Box
                            sx={{
                              flex: 1,
                              height: '1px',
                              minWidth: 4,
                              bgcolor:
                                checkedSteps[index]
                                  ? STEP_OK
                                  : index < activeStep
                                    ? T.accent
                                    : T.accentBorder,
                              opacity: 0.5,
                              mb: 1.5,
                            }}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </Box>

                {/* Active step title */}
                <Box sx={{ px: 3, pt: 1.5, pb: 0.25, flexShrink: 0 }}>
                  <Typography
                    sx={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: T.text,
                      lineHeight: 1.3,
                    }}
                  >
                    {steps[activeStep].label}
                  </Typography>
                  <Typography
                    sx={{ fontSize: '0.72rem', color: T.faint, mt: 0.2 }}
                  >
                    {steps[activeStep].subtitle}
                  </Typography>
                </Box>

                {/* Scrollable form content */}
                <Box
                  sx={{
                    px: 3,
                    py: 1.5,
                    flexGrow: 1,
                    overflowY: 'auto',
                    '&::-webkit-scrollbar': { width: 4 },
                    '&::-webkit-scrollbar-thumb': {
                      bgcolor: T.accentBorder,
                      borderRadius: 2,
                    },
                  }}
                >
                  {renderStepContent(steps[activeStep])}
                </Box>

                {/* Navigation buttons */}
                <Box
                  sx={{
                    px: 3,
                    py: 1.5,
                    borderTop: `1px solid ${T.divider}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flexShrink: 0,
                    bgcolor: T.accentFaint,
                  }}
                >
                  {activeStep === steps.length - 1 ? (
                    <AccentButton
                      onClick={handleAdd}
                      variant="contained"
                      startIcon={
                        <AddIcon sx={{ fontSize: '16px !important' }} />
                      }
                      sx={{
                        height: 36,
                        bgcolor: T.accent,
                        color: '#fff',
                        boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`,
                        '&:hover': { bgcolor: T.accentDark },
                      }}
                    >
                      Add Person
                    </AccentButton>
                  ) : (
                    <AccentButton
                      onClick={() => {
                        if (validateCurrentStep()) setActiveStep((s) => s + 1);
                      }}
                      variant="contained"
                      endIcon={
                        <NextIcon sx={{ fontSize: '16px !important' }} />
                      }
                      sx={{
                        height: 36,
                        bgcolor: T.accent,
                        color: '#fff',
                        boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`,
                        '&:hover': { bgcolor: T.accentDark },
                      }}
                    >
                      Next
                    </AccentButton>
                  )}
                  <AccentButton
                    onClick={() => setActiveStep((s) => s - 1)}
                    disabled={activeStep === 0}
                    variant="outlined"
                    startIcon={
                      <PrevIcon sx={{ fontSize: '16px !important' }} />
                    }
                    sx={{
                      height: 36,
                      borderColor: T.accentBorder,
                      color: T.muted,
                      '&:hover': {
                        bgcolor: T.accentFaint,
                        borderColor: T.accent,
                        color: T.accent,
                      },
                    }}
                  >
                    Back
                  </AccentButton>
                  <Box sx={{ flex: 1 }} />
                  <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>
                    Step {activeStep + 1} of {steps.length}
                  </Typography>
                </Box>
              </SectionCard>
            </Grid>

            {/* ── RIGHT: Records Panel ── */}
            <Grid item xs={12} lg={7}>
              <SectionCard
                sx={{
                  height: 'calc(100vh - 280px)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Records header / toolbar */}
                <Box
                  sx={{
                    px: 3.5,
                    py: 2,
                    borderBottom: `1px solid ${T.divider}`,
                    bgcolor: T.accentFaint,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 1.5,
                    }}
                  >
                    <Box
                      sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                    >
                      <Reorder sx={{ fontSize: 17, color: T.accent }} />
                      <Typography
                        sx={{
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          color: T.text,
                        }}
                      >
                        Personal Information Records
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Box
                        sx={{
                          px: 1.5,
                          py: 0.4,
                          borderRadius: 6,
                          bgcolor: alpha(T.accent, 0.08),
                          border: `1px solid ${alpha(T.accent, 0.15)}`,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.72rem',
                            color: T.accent,
                            fontWeight: 700,
                          }}
                        >
                          {filteredData.length} records
                        </Typography>
                      </Box>
                      <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={(_, v) => v && setViewMode(v)}
                        size="small"
                        sx={{
                          '& .MuiToggleButton-root': {
                            px: 1,
                            py: 0.35,
                            border: `1px solid ${T.accentBorder}`,
                            color: T.muted,
                            '&.Mui-selected': {
                              bgcolor: T.accentFaint,
                              color: T.accent,
                            },
                          },
                        }}
                      >
                        <ToggleButton value="grid">
                          <ViewModuleIcon sx={{ fontSize: 14 }} />
                        </ToggleButton>
                        <ToggleButton value="list">
                          <ViewListIcon sx={{ fontSize: 14 }} />
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                  </Box>
                  <FieldInput
                    size="small"
                    placeholder="Search by employee number or name…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <SearchIcon
                          sx={{ fontSize: 15, color: T.muted, mr: 0.5 }}
                        />
                      ),
                    }}
                  />
                </Box>

                {/* Records list */}
                <Box
                  sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    p: 2,
                    '&::-webkit-scrollbar': { width: 4 },
                    '&::-webkit-scrollbar-thumb': {
                      bgcolor: T.accentBorder,
                      borderRadius: 2,
                    },
                  }}
                >
                  {paginatedData.length === 0 ? (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                      <Box
                        sx={{
                          width: 72,
                          height: 72,
                          borderRadius: '50%',
                          bgcolor: T.accentFaint,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 2,
                        }}
                      >
                        <PersonIcon
                          sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }}
                        />
                      </Box>
                      <Typography
                        sx={{
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          color: T.muted,
                          mb: 0.5,
                        }}
                      >
                        {data.length === 0
                          ? 'No records yet'
                          : 'No records match your search'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>
                        {data.length === 0
                          ? 'Use the form on the left to add a record.'
                          : 'Try a different search term.'}
                      </Typography>
                    </Box>
                  ) : viewMode === 'grid' ? (
                    <Grid container spacing={1.5} alignItems="stretch">
                      {paginatedData.map((person) => (
                        <Grid
                          item
                          xs={12}
                          sm={4}
                          md={3}
                          key={person.id}
                          sx={{ display: 'flex' }}
                        >
                          <Box
                            onClick={() => handleOpenModal(person)}
                            sx={{
                              width: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              p: 2,
                              borderRadius: 2,
                              cursor: 'pointer',
                              bgcolor: '#fff',
                              border: `1px solid ${T.accentBorder}`,
                              transition: 'all 0.13s',
                              '&:hover': {
                                bgcolor: T.rowHover,
                                borderColor: T.accent,
                                transform: 'translateY(-2px)',
                                boxShadow: `0 4px 14px ${alpha(T.accent, 0.1)}`,
                              },
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                bgcolor: alpha(T.accent, 0.12),
                                color: T.accent,
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                mb: 0.75,
                              }}
                            >
                              {`${person.firstName?.[0] || ''}${person.lastName?.[0] || ''}`}
                            </Avatar>
                            <Typography
                              sx={{
                                fontSize: '0.7rem',
                                color: T.faint,
                                mb: 0.25,
                              }}
                            >
                              #{person.agencyEmployeeNum}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                color: T.text,
                                lineHeight: 1.2,
                              }}
                              noWrap
                            >
                              {person.firstName} {person.lastName}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <>
                      <Box
                        sx={{
                          px: 1.5,
                          py: 1,
                          display: 'grid',
                          gridTemplateColumns: '110px 1fr',
                          gap: 1,
                          alignItems: 'center',
                          bgcolor: alpha(T.accent, 0.04),
                          borderRadius: 1.5,
                          mb: 1,
                        }}
                      >
                        {['Emp. No', 'Employee Name'].map((col) => (
                          <Typography
                            key={col}
                            sx={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              color: T.accent,
                              textTransform: 'uppercase',
                              letterSpacing: '0.07em',
                            }}
                          >
                            {col}
                          </Typography>
                        ))}
                      </Box>
                      {paginatedData.map((person, idx) => (
                        <Box
                          key={person.id}
                          onClick={() => handleOpenModal(person)}
                          sx={{
                            px: 1.5,
                            py: 1.25,
                            display: 'grid',
                            gridTemplateColumns: '110px 1fr',
                            gap: 1,
                            alignItems: 'center',
                            borderRadius: 1.5,
                            cursor: 'pointer',
                            bgcolor: idx % 2 === 0 ? T.rowEven : T.rowOdd,
                            border: '1px solid transparent',
                            transition: 'background 0.13s ease',
                            '&:hover': { bgcolor: T.rowHover },
                          }}
                        >
                          <Typography
                            sx={{ fontSize: '0.75rem', color: T.muted }}
                          >
                            #{person.agencyEmployeeNum}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '0.82rem',
                              fontWeight: 500,
                              color: T.text,
                            }}
                            noWrap
                          >
                            {person.firstName} {person.lastName}
                          </Typography>
                        </Box>
                      ))}
                    </>
                  )}
                </Box>

                {/* Pagination */}
                {filteredData.length > 0 && (
                  <Box
                    sx={{ px: 2, py: 0.5, borderTop: `1px solid ${T.divider}` }}
                  >
                    <TablePagination
                      component="div"
                      count={filteredData.length}
                      page={page}
                      onPageChange={(_, newPage) => setPage(newPage)}
                      rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                      }}
                      rowsPerPageOptions={[12, 24, 48, 96]}
                      sx={{
                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows':
                          { fontSize: '0.78rem', fontWeight: 600 },
                      }}
                    />
                  </Box>
                )}
              </SectionCard>
            </Grid>
          </Grid>

          <SuccessfulOverlay
            open={successOpen}
            action={successAction}
            onClose={() => setSuccessOpen(false)}
          />

          {/* ── Edit / View Modal ── */}
          <Modal
            open={!!editPerson}
            onClose={() => {
              setEditPerson(null);
              setOriginalPerson(null);
              setSelectedEditEmployee(null);
              setIsEditing(false);
              setModalTab('personal');
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 2,
            }}
          >
            <Fade in={!!editPerson}>
              <Box
                sx={{
                  width: '100%',
                  maxWidth: 980,
                  height: 580,
                  maxHeight: '90vh',
                  borderRadius: 3,
                  overflow: 'hidden',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
                  bgcolor: T.surface,
                  display: 'flex',
                  flexDirection: 'row',
                  fontFamily: T.poppins,
                }}
              >
                {editPerson && (
                  <>
                    {/* LEFT SIDEBAR */}
                    <Box
                      sx={{
                        width: 210,
                        flexShrink: 0,
                        borderRight: `1px solid ${T.divider}`,
                        bgcolor: T.surface,
                        display: 'flex',
                        flexDirection: 'column',
                        fontFamily: T.poppins,
                      }}
                    >
                      <Box
                        sx={{
                          p: '18px 16px 14px',
                          borderBottom: `1px solid ${T.divider}`,
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 48,
                            height: 48,
                            mb: 1,
                            bgcolor: T.accent,
                            color: '#fff',
                            fontSize: '16px',
                            fontWeight: 700,
                            fontFamily: T.poppins,
                          }}
                        >
                          {`${editPerson.firstName?.[0] || ''}${editPerson.lastName?.[0] || ''}`}
                        </Avatar>
                        <Typography
                          sx={{
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            color: T.text,
                            lineHeight: 1.3,
                            fontFamily: T.poppins,
                          }}
                        >
                          {`${editPerson.firstName || ''} ${editPerson.lastName || ''}`.trim() ||
                            'Unnamed Employee'}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.72rem',
                            color: T.muted,
                            mt: 0.2,
                            fontFamily: T.poppins,
                          }}
                        >
                          {editPerson.agencyEmployeeNum || 'No Employee Number'}
                        </Typography>
                        <Box
                          sx={{
                            mt: 1,
                            border: `1px solid ${T.accentBorder}`,
                            borderRadius: '20px',
                            px: 1,
                            py: 0.3,
                            width: 'fit-content',
                            bgcolor: T.accentFaint,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: '0.68rem',
                              color: '#3B6D11',
                              fontWeight: 600,
                              fontFamily: T.poppins,
                            }}
                          >
                            Active
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
                        {[
                          {
                            key: 'personal',
                            label: 'Personal info',
                            icon: <PersonIcon sx={{ fontSize: 14 }} />,
                          },
                          {
                            key: 'govids',
                            label: 'Government IDs',
                            icon: <CreditCard sx={{ fontSize: 14 }} />,
                          },
                          {
                            key: 'address',
                            label: 'Address',
                            icon: <Home sx={{ fontSize: 14 }} />,
                          },
                          {
                            key: 'family',
                            label: 'Family',
                            icon: <FamilyRestroom sx={{ fontSize: 14 }} />,
                          },
                          {
                            key: 'education',
                            label: 'Education',
                            icon: <School sx={{ fontSize: 14 }} />,
                          },
                        ].map((item) => (
                          <Box
                            key={item.key}
                            onClick={() => {
                              setModalTab(item.key);
                              setIsEditing(false);
                            }}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.2,
                              px: 2,
                              py: 0.9,
                              cursor: 'pointer',
                              color: modalTab === item.key ? T.accent : T.muted,
                              borderLeft:
                                modalTab === item.key
                                  ? `2px solid ${T.accent}`
                                  : '2px solid transparent',
                              bgcolor:
                                modalTab === item.key
                                  ? T.accentFaint
                                  : 'transparent',
                              fontWeight: modalTab === item.key ? 700 : 400,
                              transition: 'all 0.12s',
                              '&:hover': {
                                bgcolor: T.accentFaint,
                                color: T.accent,
                              },
                            }}
                          >
                            {item.icon}
                            <Typography
                              sx={{
                                fontSize: '0.8rem',
                                fontWeight: 'inherit',
                                color: 'inherit',
                                fontFamily: T.poppins,
                              }}
                            >
                              {item.label}
                            </Typography>
                          </Box>
                        ))}
                      </Box>

                      <Box sx={{ p: 1.5, borderTop: `1px solid ${T.divider}` }}>
                        <Typography
                          sx={{
                            fontSize: '0.68rem',
                            color: T.faint,
                            fontFamily: T.poppins,
                          }}
                        >
                          Last updated
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.72rem',
                            color: T.muted,
                            fontFamily: T.poppins,
                          }}
                        >
                          {new Date().toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Typography>
                      </Box>
                    </Box>

                    {/* RIGHT CONTENT AREA */}
                    <Box
                      sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: 0,
                        bgcolor: T.surface,
                        fontFamily: T.poppins,
                      }}
                    >
                      {/* Content header */}
                      <Box
                        sx={{
                          px: 3.5,
                          py: 2.5,
                          background: T.headerGrad,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          position: 'relative',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            top: -40,
                            right: -30,
                            width: 140,
                            height: 140,
                            borderRadius: '50%',
                            bgcolor: 'rgba(255,255,255,0.04)',
                          }}
                        />
                        <Box sx={{ position: 'relative', zIndex: 1 }}>
                          <Typography
                            sx={{
                              fontSize: '0.95rem',
                              fontWeight: 700,
                              color: '#fff',
                              lineHeight: 1.2,
                              mb: 0.3,
                              fontFamily: T.poppins,
                            }}
                          >
                            {modalTab === 'personal' && 'Personal information'}
                            {modalTab === 'govids' && 'Government IDs'}
                            {modalTab === 'address' && 'Address'}
                            {modalTab === 'family' && 'Family'}
                            {modalTab === 'education' && 'Education'}
                          </Typography>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.75,
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: '0.72rem',
                                color: 'rgba(255,255,255,0.68)',
                                fontFamily: T.poppins,
                              }}
                            >
                              {modalTab === 'personal' &&
                                'Basic details and contact'}
                              {modalTab === 'govids' &&
                                'Identification numbers'}
                              {modalTab === 'address' &&
                                'Residential and permanent'}
                              {modalTab === 'family' && 'Spouse and parents'}
                              {modalTab === 'education' &&
                                'Elementary and secondary'}
                            </Typography>
                            {!isEditing && (
                              <Chip
                                label="View mode"
                                size="small"
                                sx={{
                                  height: 16,
                                  fontSize: '0.62rem',
                                  bgcolor: 'rgba(255,255,255,0.1)',
                                  color: 'rgba(255,255,255,0.7)',
                                  fontWeight: 500,
                                  fontFamily: T.poppins,
                                }}
                              />
                            )}
                            {isEditing && (
                              <Chip
                                label="Editing"
                                size="small"
                                sx={{
                                  height: 16,
                                  fontSize: '0.62rem',
                                  bgcolor: 'rgba(255,200,0,0.22)',
                                  color: '#ffe082',
                                  fontWeight: 600,
                                  fontFamily: T.poppins,
                                }}
                              />
                            )}
                          </Box>
                        </Box>
                        <IconButton
                          onClick={() => {
                            setEditPerson(null);
                            setOriginalPerson(null);
                            setSelectedEditEmployee(null);
                            setIsEditing(false);
                            setModalTab('personal');
                          }}
                          size="small"
                          sx={{
                            color: 'rgba(255,255,255,0.75)',
                            position: 'relative',
                            zIndex: 1,
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                          }}
                        >
                          <Close sx={{ fontSize: 17 }} />
                        </IconButton>
                      </Box>

                      {/* Scrollable content */}
                      <Box
                        sx={{
                          flex: 1,
                          overflowY: 'auto',
                          p: '20px 24px',
                          fontFamily: T.poppins,
                          '&::-webkit-scrollbar': { width: 4 },
                          '&::-webkit-scrollbar-thumb': {
                            bgcolor: T.accentBorder,
                            borderRadius: 2,
                          },
                        }}
                      >
                        {modalTab === 'personal' && (
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 2,
                            }}
                          >
                            {renderModalField('First name', 'firstName')}
                            {renderModalField('Last name', 'lastName')}
                            {renderModalField('Middle name', 'middleName')}
                            {renderModalField(
                              'Name extension',
                              'nameExtension',
                            )}
                            {renderModalField('Date of birth', 'birthDate', {
                              type: 'date',
                            })}
                            {renderModalField('Place of birth', 'placeOfBirth')}
                            {renderModalField('Sex', 'sex', {
                              options: ['Male', 'Female', 'Other'],
                            })}
                            {renderModalField('Civil status', 'civilStatus', {
                              options: [
                                'Single',
                                'Married',
                                'Widowed',
                                'Separated',
                                'Divorced',
                              ],
                            })}
                            {renderModalField('Citizenship', 'citizenship')}
                            {renderModalField('Blood type', 'bloodType', {
                              options: [
                                'A+',
                                'A-',
                                'B+',
                                'B-',
                                'AB+',
                                'AB-',
                                'O+',
                                'O-',
                              ],
                            })}
                            {renderModalField('Mobile number', 'mobileNum')}
                            {renderModalField('Telephone', 'telephone')}
                            {renderModalField('Email address', 'emailAddress', {
                              full: true,
                            })}
                            {renderModalField('Height (cm)', 'heightCm')}
                            {renderModalField('Weight (kg)', 'weightKg')}
                          </Box>
                        )}

                        {modalTab === 'govids' && (
                          <Box>
                            {[
                              ['Employee number', 'agencyEmployeeNum'],
                              ['GSIS', 'gsisNum'],
                              ['Pag-IBIG', 'pagibigNum'],
                              ['PhilHealth', 'philhealthNum'],
                              ['SSS', 'sssNum'],
                              ['TIN', 'tinNum'],
                            ].map(([label, field]) => (
                              <Box
                                key={field}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  p: '8px 12px',
                                  border: `1px solid ${T.accentBorder}`,
                                  borderRadius: '8px',
                                  mb: 1,
                                  bgcolor: T.accentFaint,
                                  gap: 2,
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: '0.72rem',
                                    color: T.muted,
                                    fontWeight: 700,
                                    fontFamily: T.poppins,
                                  }}
                                >
                                  {label}
                                </Typography>
                                {isEditing && field !== 'agencyEmployeeNum' ? (
                                  <FieldInput
                                    size="small"
                                    value={editPerson[field] || ''}
                                    onChange={(e) =>
                                      handleChange(field, e.target.value, true)
                                    }
                                    sx={{ minWidth: 220 }}
                                    inputProps={{
                                      style: {
                                        fontFamily: T.poppins,
                                        fontSize: '0.82rem',
                                      },
                                    }}
                                  />
                                ) : (
                                  <Typography
                                    sx={{
                                      fontSize: '0.82rem',
                                      color: T.text,
                                      fontWeight:
                                        field === 'agencyEmployeeNum'
                                          ? 700
                                          : 400,
                                      fontFamily: T.poppins,
                                    }}
                                  >
                                    {getDisplayValue(editPerson[field])}
                                  </Typography>
                                )}
                              </Box>
                            ))}
                            <Box
                              sx={{
                                mt: 1.5,
                                p: '8px 12px',
                                border: `1px solid ${T.accentBorder}`,
                                borderRadius: '8px',
                                bgcolor: T.accentFaint,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: '0.72rem',
                                  color: T.faint,
                                  fontFamily: T.poppins,
                                }}
                              >
                                Employee number cannot be changed. Contact
                                administrator for corrections.
                              </Typography>
                            </Box>
                          </Box>
                        )}

                        {modalTab === 'address' && (
                          <Box>
                            <Box
                              sx={{
                                mb: 1.5,
                                p: '14px 16px',
                                border: `1px solid ${T.accentBorder}`,
                                borderRadius: '10px',
                                bgcolor: T.accentFaint,
                              }}
                            >
                              <Typography sx={{ ...fieldLabelSx, mb: 1 }}>
                                Residential address
                              </Typography>
                              {isEditing ? (
                                <PhilippineAddressSelector
                                  prefix="residential"
                                  values={editPerson}
                                  onChange={handleEditAddressChange}
                                />
                              ) : (
                                <Typography
                                  sx={{
                                    fontSize: '0.82rem',
                                    color: T.text,
                                    lineHeight: 1.7,
                                    fontFamily: T.poppins,
                                  }}
                                >
                                  {`${getDisplayValue(editPerson.residential_houseBlockLotNum)} ${getDisplayValue(editPerson.residential_streetName)}`}
                                  <br />
                                  {`${getDisplayValue(editPerson.residential_subdivisionOrVillage)}, ${getDisplayValue(editPerson.residential_barangayName)}`}
                                  <br />
                                  {`${getDisplayValue(editPerson.residential_cityOrMunicipality)}, ${getDisplayValue(editPerson.residential_provinceName)}`}
                                  <br />
                                  {`ZIP ${getDisplayValue(editPerson.residential_zipcode)}`}
                                </Typography>
                              )}
                            </Box>
                            <Box
                              sx={{
                                p: '14px 16px',
                                border: `1px solid ${T.accentBorder}`,
                                borderRadius: '10px',
                                bgcolor: T.accentFaint,
                              }}
                            >
                              <Typography sx={{ ...fieldLabelSx, mb: 1 }}>
                                Permanent address
                              </Typography>
                              {isEditing ? (
                                <PhilippineAddressSelector
                                  prefix="permanent"
                                  values={editPerson}
                                  onChange={handleEditAddressChange}
                                  showSameAsCheck
                                  residentialValues={editPerson}
                                />
                              ) : (
                                <Typography
                                  sx={{
                                    fontSize: '0.82rem',
                                    color: T.text,
                                    lineHeight: 1.7,
                                    fontFamily: T.poppins,
                                  }}
                                >
                                  {`${getDisplayValue(editPerson.permanent_houseBlockLotNum)} ${getDisplayValue(editPerson.permanent_streetName)}`}
                                  <br />
                                  {`${getDisplayValue(editPerson.permanent_subdivisionOrVillage)}, ${getDisplayValue(editPerson.permanent_barangay)}`}
                                  <br />
                                  {`${getDisplayValue(editPerson.permanent_cityOrMunicipality)}, ${getDisplayValue(editPerson.permanent_provinceName)}`}
                                  <br />
                                  {`ZIP ${getDisplayValue(editPerson.permanent_zipcode)}`}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        )}

                        {modalTab === 'family' && (
                          <Box>
                            {[
                              {
                                title: 'Spouse',
                                fields: [
                                  ['First name', 'spouseFirstName'],
                                  ['Last name', 'spouseLastName'],
                                  ['Middle name', 'spouseMiddleName'],
                                  ['Name extension', 'spouseNameExtension'],
                                  ['Occupation', 'spouseOccupation'],
                                  ['Employer', 'spouseEmployerBusinessName'],
                                  {
                                    label: 'Business address',
                                    field: 'spouseBusinessAddress',
                                    full: true,
                                  },
                                  {
                                    label: 'Telephone',
                                    field: 'spouseTelephone',
                                    full: true,
                                  },
                                ],
                              },
                              {
                                title: 'Father',
                                fields: [
                                  ['First name', 'fatherFirstName'],
                                  ['Last name', 'fatherLastName'],
                                  ['Middle name', 'fatherMiddleName'],
                                  ['Name extension', 'fatherNameExtension'],
                                ],
                              },
                              {
                                title: 'Mother',
                                fields: [
                                  [
                                    'Maiden first name',
                                    'motherMaidenFirstName',
                                  ],
                                  ['Maiden last name', 'motherMaidenLastName'],
                                  {
                                    label: 'Maiden middle name',
                                    field: 'motherMaidenMiddleName',
                                    full: true,
                                  },
                                ],
                              },
                            ].map(({ title, fields }) => (
                              <Box key={title} sx={{ mb: 2.5 }}>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    mb: 1.5,
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      color: T.accent,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.07em',
                                      fontFamily: T.poppins,
                                    }}
                                  >
                                    {title}
                                  </Typography>
                                  <Box
                                    sx={{
                                      height: 1,
                                      flex: 1,
                                      bgcolor: T.divider,
                                    }}
                                  />
                                </Box>
                                <Box
                                  sx={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: 2,
                                  }}
                                >
                                  {fields.map((f) => {
                                    if (Array.isArray(f))
                                      return renderModalField(f[0], f[1]);
                                    return renderModalField(f.label, f.field, {
                                      full: f.full,
                                    });
                                  })}
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        )}

                        {modalTab === 'education' && (
                          <Box>
                            {[
                              {
                                title: 'Elementary',
                                fields: [
                                  {
                                    label: 'School name',
                                    field: 'elementaryNameOfSchool',
                                    full: true,
                                  },
                                  ['Period from', 'elementaryPeriodFrom'],
                                  ['Period to', 'elementaryPeriodTo'],
                                  ['Year graduated', 'elementaryYearGraduated'],
                                  {
                                    label: 'Honors received',
                                    field:
                                      'elementaryScholarshipAcademicHonorsReceived',
                                    full: true,
                                  },
                                ],
                              },
                              {
                                title: 'Secondary',
                                fields: [
                                  {
                                    label: 'School name',
                                    field: 'secondaryNameOfSchool',
                                    full: true,
                                  },
                                  ['Period from', 'secondaryPeriodFrom'],
                                  ['Period to', 'secondaryPeriodTo'],
                                  ['Year graduated', 'secondaryYearGraduated'],
                                  {
                                    label: 'Honors received',
                                    field:
                                      'secondaryScholarshipAcademicHonorsReceived',
                                    full: true,
                                  },
                                ],
                              },
                            ].map(({ title, fields }) => (
                              <Box key={title} sx={{ mb: 2.5 }}>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    mb: 1.5,
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      color: T.accent,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.07em',
                                      fontFamily: T.poppins,
                                    }}
                                  >
                                    {title}
                                  </Typography>
                                  <Box
                                    sx={{
                                      height: 1,
                                      flex: 1,
                                      bgcolor: T.divider,
                                    }}
                                  />
                                </Box>
                                <Box
                                  sx={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: 2,
                                  }}
                                >
                                  {fields.map((f) => {
                                    if (Array.isArray(f))
                                      return renderModalField(f[0], f[1]);
                                    return renderModalField(f.label, f.field, {
                                      full: f.full,
                                    });
                                  })}
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>

                      {/* ACTION BAR */}
                      <Box
                        sx={{
                          px: 3.5,
                          py: 2,
                          borderTop: `1px solid ${T.divider}`,
                          bgcolor: '#f9f9f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexShrink: 0,
                          fontFamily: T.poppins,
                        }}
                      >
                        <AccentButton
                          onClick={() => handleDelete(editPerson.id)}
                          variant="outlined"
                          startIcon={
                            <DeleteIcon sx={{ fontSize: '14px !important' }} />
                          }
                          sx={{
                            fontSize: '0.8rem',
                            fontFamily: T.poppins,
                            borderColor: '#e57373',
                            color: '#c62828',
                            '&:hover': {
                              bgcolor: 'rgba(198,40,40,0.04)',
                              borderColor: '#c62828',
                              transform: 'none',
                            },
                          }}
                        >
                          Delete record
                        </AccentButton>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {isEditing && (
                            <AccentButton
                              onClick={() => {
                                setEditPerson({ ...originalPerson });
                                setSelectedEditEmployee({
                                  name: `${originalPerson.firstName} ${originalPerson.lastName}`,
                                  employeeNumber:
                                    originalPerson.agencyEmployeeNum,
                                });
                                setIsEditing(false);
                              }}
                              variant="outlined"
                              startIcon={
                                <CancelIcon
                                  sx={{ fontSize: '14px !important' }}
                                />
                              }
                              sx={{
                                fontSize: '0.8rem',
                                fontFamily: T.poppins,
                                borderColor: T.accentBorder,
                                color: T.muted,
                                '&:hover': {
                                  bgcolor: T.accentFaint,
                                  borderColor: T.accent,
                                  color: T.accent,
                                },
                              }}
                            >
                              Cancel
                            </AccentButton>
                          )}
                          {!isEditing ? (
                            <AccentButton
                              onClick={() => setIsEditing(true)}
                              variant="contained"
                              startIcon={
                                <EditIcon
                                  sx={{ fontSize: '14px !important' }}
                                />
                              }
                              sx={{
                                fontSize: '0.8rem',
                                fontFamily: T.poppins,
                                bgcolor: T.accent,
                                color: '#fff',
                                boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`,
                                '&:hover': { bgcolor: T.accentDark },
                              }}
                            >
                              Edit
                            </AccentButton>
                          ) : (
                            <AccentButton
                              onClick={handleUpdate}
                              disabled={!hasChanges()}
                              variant="contained"
                              startIcon={
                                <SaveIcon
                                  sx={{ fontSize: '14px !important' }}
                                />
                              }
                              sx={{
                                fontSize: '0.8rem',
                                fontFamily: T.poppins,
                                bgcolor: '#639922',
                                color: '#fff',
                                boxShadow: '0 2px 10px rgba(99,153,34,0.32)',
                                '&:hover': { bgcolor: '#3B6D11' },
                                '&:disabled': {
                                  bgcolor: '#b9c7a5 !important',
                                  color: '#fff !important',
                                },
                              }}
                            >
                              Save changes
                            </AccentButton>
                          )}
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
            <Alert
              onClose={() => setSnackbar({ ...snackbar, open: false })}
              severity={snackbar.severity}
              sx={{ width: '100%', borderRadius: 2 }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Box>
      </Fade>
    </>
  );
};

export default PersonTable;
