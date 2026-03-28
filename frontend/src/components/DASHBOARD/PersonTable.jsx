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
  Stepper,
  Step,
  StepLabel,
  StepContent,
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
import {
  createThemedCard,
  createThemedButton,
  createThemedTextField,
} from '../../utils/theme';

// ============================================================
// PSGC API base URL
// ============================================================
const PSGC_BASE = 'https://psgc.cloud/api';

// Shared MenuProps for all PSGC Select dropdowns
// — prevents the dropdown from covering the page header
// — adds a scrollbar when items overflow
const DROPDOWN_MENU_PROPS = {
  PaperProps: {
    style: {
      maxHeight: 240, // ~6 items visible, rest scrollable
      overflowY: 'auto',
    },
  },
  // Render the popover below the trigger, not over it
  anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
  transformOrigin: { vertical: 'top', horizontal: 'left' },
  // Keep it inside the viewport
  disablePortal: false,
};

// ============================================================
// PhilippineAddressSelector Component
// Cascading dropdowns: Region → Province → City/Municipality → Barangay
// props:
//   prefix            – 'permanent' | 'residential'
//   values            – full form object (newPerson / editPerson)
//   onChange          – (fieldName, value) => void
//   disabled          – lock all fields
//   settings          – theme settings object
//   showSameAsCheck   – show "Same as Residential" checkbox (permanent only)
//   residentialValues – source values to copy when checkbox ticked
// ============================================================
const PhilippineAddressSelector = ({
  prefix,
  values,
  onChange,
  disabled = false,
  settings = {},
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

  // "Same as Residential" checkbox state (only used when prefix === 'permanent')
  const [sameAsResidential, setSameAsResidential] = useState(false);

  const accentColor = settings.primaryColor || '#6D2323';

  // permanent → permanent_barangay  |  residential → residential_barangayName
  const barangayField =
    prefix === 'permanent' ? `${prefix}_barangay` : `${prefix}_barangayName`;
  const f = (name) => `${prefix}_${name}`;

  // ── Load regions once ──────────────────────────────────────
  useEffect(() => {
    setLoadingRegions(true);
    axios
      .get(`${PSGC_BASE}/regions`)
      .then((r) => setRegions(Array.isArray(r.data) ? r.data : []))
      .catch(() => setRegions([]))
      .finally(() => setLoadingRegions(false));
  }, []);

  // ── "Same as Residential" handler ─────────────────────────
  const handleSameAsResidential = (checked) => {
    setSameAsResidential(checked);
    if (checked && residentialValues) {
      // Map residential field names → permanent field names
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
      // Reset internal PSGC codes — names are now filled in directly
      setSelRegionCode('');
      setSelProvinceCode('');
      setSelCityCode('');
      setProvinces([]);
      setCities([]);
      setBarangays([]);
    }
  };

  // ── Cascade handlers ───────────────────────────────────────
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

  // ── Shared field sx ────────────────────────────────────────
  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      '& fieldset': { borderColor: accentColor },
      '&:hover fieldset': { borderColor: accentColor },
      '&.Mui-focused fieldset': { borderColor: accentColor },
    },
  };

  const isLocked = disabled || sameAsResidential;

  return (
    <Grid container spacing={2}>
      {/* ── "Same as Residential" checkbox (permanent only) ── */}
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
              border: `1px dashed ${alpha(accentColor, 0.4)}`,
              backgroundColor: alpha(accentColor, 0.04),
              cursor: 'pointer',
              userSelect: 'none',
              width: 'fit-content',
            }}
            onClick={() => handleSameAsResidential(!sameAsResidential)}
          >
            <Box
              sx={{
                width: 18,
                height: 18,
                borderRadius: '4px',
                border: `2px solid ${accentColor}`,
                backgroundColor: sameAsResidential
                  ? accentColor
                  : 'transparent',
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
                    fontSize: '11px',
                    fontWeight: 'bold',
                    lineHeight: 1,
                  }}
                >
                  ✓
                </Box>
              )}
            </Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: accentColor }}
            >
              Same as Residential Address
            </Typography>
          </Box>
        </Grid>
      )}

      {/* House / Block / Lot No. */}
      <Grid item xs={12} sm={6}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          House/Block/Lot No.
        </Typography>
        <TextField
          size="small"
          fullWidth
          disabled={isLocked}
          value={values[f('houseBlockLotNum')] || ''}
          onChange={(e) => onChange(f('houseBlockLotNum'), e.target.value)}
          sx={fieldSx}
        />
      </Grid>

      {/* Street Name */}
      <Grid item xs={12} sm={6}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          Street Name
        </Typography>
        <TextField
          size="small"
          fullWidth
          disabled={isLocked}
          value={values[f('streetName')] || ''}
          onChange={(e) => onChange(f('streetName'), e.target.value)}
          sx={fieldSx}
        />
      </Grid>

      {/* Subdivision / Village */}
      <Grid item xs={12} sm={6}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          Subdivision / Village
        </Typography>
        <TextField
          size="small"
          fullWidth
          disabled={isLocked}
          value={values[f('subdivisionOrVillage')] || ''}
          onChange={(e) => onChange(f('subdivisionOrVillage'), e.target.value)}
          sx={fieldSx}
        />
      </Grid>

      {/* Zip Code */}
      <Grid item xs={12} sm={6}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          Zip Code
        </Typography>
        <TextField
          size="small"
          fullWidth
          disabled={isLocked}
          value={values[f('zipcode')] || ''}
          onChange={(e) => onChange(f('zipcode'), e.target.value)}
          sx={fieldSx}
        />
      </Grid>

      {/* Region */}
      <Grid item xs={12} sm={6}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          Region
        </Typography>
        <FormControl fullWidth size="small" sx={fieldSx}>
          <Select
            value={selRegionCode}
            onChange={(e) => handleRegionChange(e.target.value)}
            disabled={isLocked || loadingRegions}
            displayEmpty
            MenuProps={DROPDOWN_MENU_PROPS}
            renderValue={(v) => {
              if (!v) return <em style={{ color: '#aaa' }}>Select Region</em>;
              const found = regions.find((r) => r.code === v);
              return found ? found.name : v;
            }}
          >
            <MenuItem value="">
              <em>Select Region</em>
            </MenuItem>
            {loadingRegions ? (
              <MenuItem disabled>
                <CircularProgress size={14} sx={{ mr: 1 }} />
                Loading…
              </MenuItem>
            ) : (
              regions.map((r) => (
                <MenuItem key={r.code} value={r.code}>
                  {r.name}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      </Grid>

      {/* Province */}
      <Grid item xs={12} sm={6}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          Province
        </Typography>
        <FormControl fullWidth size="small" sx={fieldSx}>
          <Select
            value={selProvinceCode}
            onChange={(e) => {
              const found = provinces.find((p) => p.code === e.target.value);
              handleProvinceChange(e.target.value, found ? found.name : '');
            }}
            disabled={isLocked || loadingProvinces || !selRegionCode}
            displayEmpty
            MenuProps={DROPDOWN_MENU_PROPS}
            renderValue={(v) => {
              if (!v) {
                const saved = values[f('provinceName')];
                return saved ? (
                  <span>{saved}</span>
                ) : (
                  <em style={{ color: '#aaa' }}>Select Province</em>
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
                <CircularProgress size={14} sx={{ mr: 1 }} />
                Loading…
              </MenuItem>
            ) : (
              provinces.map((p) => (
                <MenuItem key={p.code} value={p.code}>
                  {p.name}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      </Grid>

      {/* City / Municipality */}
      <Grid item xs={12} sm={6}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          City / Municipality
        </Typography>
        <FormControl fullWidth size="small" sx={fieldSx}>
          <Select
            value={selCityCode}
            onChange={(e) => {
              const found = cities.find((c) => c.code === e.target.value);
              handleCityChange(e.target.value, found ? found.name : '');
            }}
            disabled={isLocked || loadingCities || !selRegionCode}
            displayEmpty
            MenuProps={DROPDOWN_MENU_PROPS}
            renderValue={(v) => {
              if (!v) {
                const saved = values[f('cityOrMunicipality')];
                return saved ? (
                  <span>{saved}</span>
                ) : (
                  <em style={{ color: '#aaa' }}>Select City/Municipality</em>
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
                <CircularProgress size={14} sx={{ mr: 1 }} />
                Loading…
              </MenuItem>
            ) : (
              cities.map((c) => (
                <MenuItem key={c.code} value={c.code}>
                  {c.name}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      </Grid>

      {/* Barangay */}
      <Grid item xs={12} sm={6}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          Barangay
        </Typography>
        <FormControl fullWidth size="small" sx={fieldSx}>
          <Select
            value={values[barangayField] || ''}
            onChange={(e) => handleBarangayChange(e.target.value)}
            disabled={isLocked || loadingBarangays || !selCityCode}
            displayEmpty
            MenuProps={DROPDOWN_MENU_PROPS}
            renderValue={(v) =>
              v || <em style={{ color: '#aaa' }}>Select Barangay</em>
            }
          >
            <MenuItem value="">
              <em>Select Barangay</em>
            </MenuItem>
            {loadingBarangays ? (
              <MenuItem disabled>
                <CircularProgress size={14} sx={{ mr: 1 }} />
                Loading…
              </MenuItem>
            ) : (
              barangays.map((b) => (
                <MenuItem key={b.code} value={b.name}>
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
// Employee Autocomplete Component (unchanged)
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
  settings = {},
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
  }, [value]);

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
        getAuthHeaders(),
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
      const response = await axios.get(
        `${API_BASE_URL}/Remittance/employees/search`,
        getAuthHeaders(),
      );
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
      const response = await axios.get(
        `${API_BASE_URL}/Remittance/employees/${employeeNumber}`,
        getAuthHeaders(),
      );
      const employee = response.data;
      onEmployeeSelect(employee);
      setQuery(employee.name || '');
    } catch (error) {
      console.error('Error fetching employee by ID:', error);
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

  const ModernTextField = useMemo(
    () => styled(TextField)(() => createThemedTextField(settings)),
    [settings],
  );

  return (
    <Box sx={{ position: 'relative', width: '100%' }} ref={dropdownRef}>
      <ModernTextField
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
            <PersonIcon
              sx={{
                color:
                  settings.textPrimaryColor ||
                  settings.primaryColor ||
                  '#6D2323',
                mr: 1,
              }}
            />
          ),
          endAdornment: (
            <IconButton
              onClick={dropdownDisabled ? undefined : handleDropdownClick}
              size="small"
              disabled={dropdownDisabled}
              sx={{
                color:
                  settings.textPrimaryColor ||
                  settings.primaryColor ||
                  '#6D2323',
              }}
            >
              {showDropdown ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          ),
        }}
      />

      {showDropdown && (
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            maxHeight: 300,
            overflow: 'auto',
            mt: 1,
            borderRadius: 2,
          }}
        >
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" sx={{ ml: 1 }}>
                Loading...
              </Typography>
            </Box>
          ) : employees.length > 0 ? (
            <List dense>
              {employees.map((employee) => (
                <ListItem
                  key={employee.employeeNumber}
                  button
                  onClick={() => handleEmployeeSelect(employee)}
                  sx={{
                    '&:hover': {
                      backgroundColor: alpha(
                        settings.accentColor ||
                          settings.backgroundColor ||
                          '#FEF9E1',
                        0.3,
                      ),
                    },
                  }}
                >
                  <ListItemText
                    primary={employee.name}
                    secondary={`#${employee.employeeNumber}`}
                    primaryTypographyProps={{
                      fontWeight: 'bold',
                      color: settings.textPrimaryColor || '#6D2323',
                    }}
                    secondaryTypographyProps={{
                      color: settings.textSecondaryColor || '#666',
                    }}
                  />
                </ListItem>
              ))}
            </List>
          ) : query.length >= 2 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                No employees found matching "{query}"
              </Typography>
            </Box>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                {employees.length === 0
                  ? 'No employees available'
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
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('');
  const [errors, setErrors] = useState({});
  const [stepErrors, setStepErrors] = useState({});
  const [viewMode, setViewMode] = useState('grid');
  const [activeStep, setActiveStep] = useState(0);

  const navigate = useNavigate();
  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('personalinfo');

  const GlassCard = useMemo(
    () => styled(Card)(() => createThemedCard(settings)),
    [settings],
  );
  const ProfessionalButton = useMemo(
    () =>
      styled(Button)(({ variant = 'contained' }) =>
        createThemedButton(settings, variant),
      ),
    [settings],
  );
  const ModernTextField = useMemo(
    () => styled(TextField)(() => createThemedTextField(settings)),
    [settings],
  );

  const primaryColor = settings.accentColor || '#FEF9E1';
  const secondaryColor = settings.backgroundColor || '#FFF8E7';
  const accentColor = settings.primaryColor || '#6d2323';
  const accentDark =
    settings.secondaryColor || settings.hoverColor || '#8B3333';
  const grayColor = settings.textSecondaryColor || '#6c757d';

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

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const showSnackbar = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });

  const fetchPersonsRef = useRef(null);

  useEffect(() => {
    fetchPersons();
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = data.filter(
      (person) =>
        person.firstName?.toLowerCase().includes(query) ||
        person.lastName?.toLowerCase().includes(query) ||
        person.agencyEmployeeNum?.toLowerCase().includes(query),
    );
    setFilteredData(filtered);
  }, [searchQuery, data]);

  const fetchPersons = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/personalinfo/person_table`,
        getAuthHeaders(),
      );
      setData(response.data);
      setFilteredData(response.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  useEffect(() => {
    fetchPersonsRef.current = fetchPersons;
  });

  useEffect(() => {
    if (!socket || !connected) return;
    const handlePersonalInfoChanged = () => {
      fetchPersonsRef.current?.();
    };
    socket.on('personalInfoChanged', handlePersonalInfoChanged);
    return () => {
      socket.off('personalInfoChanged', handlePersonalInfoChanged);
    };
  }, [socket, connected]);

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = [
      'firstName',
      'lastName',
      'birthDate',
      'sex',
      'civilStatus',
      'citizenship',
    ];
    requiredFields.forEach((field) => {
      if (!newPerson[field] || newPerson[field].trim() === '')
        newErrors[field] = 'This field is required';
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCurrentStep = () => {
    const currentStepFields = steps[activeStep].fields;
    const requiredFields = [
      'firstName',
      'lastName',
      'birthDate',
      'sex',
      'civilStatus',
      'citizenship',
      'agencyEmployeeNum',
    ];
    const stepRequiredFields = currentStepFields.filter((f) =>
      requiredFields.includes(f),
    );
    const newErrors = {};
    let hasError = false;
    stepRequiredFields.forEach((field) => {
      if (!newPerson[field] || newPerson[field].trim() === '') {
        newErrors[field] = 'This field is required';
        hasError = true;
      }
    });
    if (hasError) {
      setErrors(newErrors);
      setStepErrors({ [activeStep]: true });
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
    } catch (error) {
      console.error('Error updating person:', error);
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
    } catch (error) {
      console.error('Error deleting person:', error);
      showSnackbar('Failed to delete person. Please try again.', 'error');
    }
  };

  // Generic field change handler
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
      if (stepErrors[activeStep])
        setStepErrors((prev) => {
          const n = { ...prev };
          delete n[activeStep];
          return n;
        });
    }
  };

  // Convenience wrappers for the address selector used in Add form
  const handleAddAddressChange = useCallback((field, value) => {
    setNewPerson((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Convenience wrappers for the address selector used in Edit modal
  const handleEditAddressChange = useCallback((field, value) => {
    setEditPerson((prev) => (prev ? { ...prev, [field]: value } : prev));
  }, []);

  const handleEmployeeChange = (employeeNumber) => {
    setNewPerson((p) => ({ ...p, agencyEmployeeNum: employeeNumber }));
    setErrors((prev) => {
      const n = { ...prev };
      delete n.agencyEmployeeNum;
      return n;
    });
  };
  const handleEmployeeSelect = (employee) => setSelectedEmployee(employee);
  const handleEditEmployeeChange = (employeeNumber) =>
    setEditPerson((p) => ({ ...p, agencyEmployeeNum: employeeNumber }));
  const handleEditEmployeeSelect = (employee) =>
    setSelectedEditEmployee(employee);

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

  const handleStartEdit = () => setIsEditing(true);
  const handleCancelEdit = () => {
    setEditPerson({ ...originalPerson });
    setSelectedEditEmployee({
      name: `${originalPerson.firstName} ${originalPerson.lastName}`,
      employeeNumber: originalPerson.agencyEmployeeNum,
    });
    setIsEditing(false);
  };
  const handleCloseModal = () => {
    setEditPerson(null);
    setOriginalPerson(null);
    setSelectedEditEmployee(null);
    setIsEditing(false);
    setModalTab('personal');
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setActiveStep((s) => s + 1);
  };
  const handleBack = () => setActiveStep((s) => s - 1);
  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) setViewMode(newMode);
  };

  const hasChanges = () => {
    if (!editPerson || !originalPerson) return false;
    return JSON.stringify(editPerson) !== JSON.stringify(originalPerson);
  };

  // ── Steps definition ────────────────────────────────────────
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
      disabledFields: ['agencyEmployeeNum'],
    },
    {
      label: 'Residential Address',
      subtitle: 'Your current residential address (cascading dropdowns)',
      fields: ['residential_address'], // sentinel
      isAddress: true,
      addressPrefix: 'residential',
    },
    {
      label: 'Permanent Address',
      subtitle: 'Your permanent address — tick below if same as residential',
      fields: ['permanent_address'], // sentinel — rendered specially below
      isAddress: true,
      addressPrefix: 'permanent',
      isSameAsResidential: true, // triggers checkbox in renderStepContent
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
      subtitle: 'Your elementary and secondary education',
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

  // ── Render stepper step content ────────────────────────────
  const renderStepContent = (step) => {
    // Address steps → delegate to PhilippineAddressSelector
    if (step.isAddress) {
      return (
        <Box sx={{ mt: 2 }}>
          <PhilippineAddressSelector
            prefix={step.addressPrefix}
            values={newPerson}
            onChange={handleAddAddressChange}
            settings={settings}
            showSameAsCheck={!!step.isSameAsResidential}
            residentialValues={step.isSameAsResidential ? newPerson : null}
          />
        </Box>
      );
    }

    return (
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {step.fields.map((field) => {
          const requiredFields = [
            'firstName',
            'lastName',
            'birthDate',
            'sex',
            'civilStatus',
            'citizenship',
            'agencyEmployeeNum',
          ];
          const isRequired = requiredFields.includes(field);
          const hasError = errors[field];

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

          const selectSx = {
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: hasError ? 'red' : '#6D2323' },
              '&:hover fieldset': { borderColor: hasError ? 'red' : '#6D2323' },
              '&.Mui-focused fieldset': {
                borderColor: hasError ? 'red' : '#6D2323',
              },
            },
          };

          if (field === 'sex') {
            return (
              <Grid item xs={12} sm={6} key={field}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 'bold', mb: 1 }}
                >
                  {fieldLabels[field]}
                  {isRequired && <span style={{ color: 'red' }}> *</span>}
                </Typography>
                <FormControl fullWidth error={!!hasError}>
                  <Select
                    value={newPerson[field]}
                    onChange={(e) => handleChange(field, e.target.value)}
                    sx={selectSx}
                  >
                    <MenuItem value="">Select Sex</MenuItem>
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                  {hasError && <FormHelperText>{hasError}</FormHelperText>}
                </FormControl>
              </Grid>
            );
          }

          if (field === 'civilStatus') {
            return (
              <Grid item xs={12} sm={6} key={field}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 'bold', mb: 1 }}
                >
                  {fieldLabels[field]}
                  {isRequired && <span style={{ color: 'red' }}> *</span>}
                </Typography>
                <FormControl fullWidth error={!!hasError}>
                  <Select
                    value={newPerson[field]}
                    onChange={(e) => handleChange(field, e.target.value)}
                    sx={selectSx}
                  >
                    <MenuItem value="">Select Civil Status</MenuItem>
                    <MenuItem value="Single">Single</MenuItem>
                    <MenuItem value="Married">Married</MenuItem>
                    <MenuItem value="Widowed">Widowed</MenuItem>
                    <MenuItem value="Separated">Separated</MenuItem>
                    <MenuItem value="Divorced">Divorced</MenuItem>
                  </Select>
                  {hasError && <FormHelperText>{hasError}</FormHelperText>}
                </FormControl>
              </Grid>
            );
          }

          if (field === 'bloodType') {
            return (
              <Grid item xs={12} sm={6} key={field}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 'bold', mb: 1 }}
                >
                  {fieldLabels[field]}
                </Typography>
                <FormControl fullWidth>
                  <Select
                    value={newPerson[field]}
                    onChange={(e) => handleChange(field, e.target.value)}
                    sx={selectSx}
                  >
                    <MenuItem value="">Select Blood Type</MenuItem>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(
                      (bt) => (
                        <MenuItem key={bt} value={bt}>
                          {bt}
                        </MenuItem>
                      ),
                    )}
                  </Select>
                </FormControl>
              </Grid>
            );
          }

          if (field === 'agencyEmployeeNum') {
            return (
              <Grid item xs={12} sm={6} key={field}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 'bold', mb: 1 }}
                >
                  {fieldLabels[field]}
                  {isRequired && <span style={{ color: 'red' }}> *</span>}
                </Typography>
                <EmployeeAutocomplete
                  value={newPerson[field]}
                  onChange={handleEmployeeChange}
                  selectedEmployee={selectedEmployee}
                  onEmployeeSelect={handleEmployeeSelect}
                  placeholder="Search and select employee..."
                  required
                  error={!!hasError}
                  helperText={hasError || ''}
                  settings={settings}
                />
              </Grid>
            );
          }

          return (
            <Grid item xs={12} sm={6} key={field}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 'bold', mb: 1 }}
              >
                {fieldLabels[field]}
                {isRequired && <span style={{ color: 'red' }}> *</span>}
              </Typography>
              <TextField
                value={newPerson[field]}
                onChange={(e) => handleChange(field, e.target.value)}
                fullWidth
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
                sx={selectSx}
              />
            </Grid>
          );
        })}
      </Grid>
    );
  };

  // Keep pagination valid
  useEffect(() => {
    if (page > 0 && page * rowsPerPage >= filteredData.length) setPage(0);
  }, [filteredData.length, page, rowsPerPage]);

  if (hasAccess === null) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <CircularProgress sx={{ color: accentColor, mb: 2 }} />
          <Typography variant="h6" sx={{ color: accentColor }}>
            Loading access information...
          </Typography>
        </Box>
      </Container>
    );
  }
  if (hasAccess === false) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Personal Information Management. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }

  const totalRows = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const startRow = totalRows === 0 ? 0 : page * rowsPerPage + 1;
  const endRow = Math.min((page + 1) * rowsPerPage, totalRows);
  const paginatedData = (() => {
    const s = page * rowsPerPage;
    return filteredData.slice(s, s + rowsPerPage);
  })();
  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(Number(e.target.value) || 20);
    setPage(0);
  };

  // ── Edit modal helpers ─────────────────────────────────────
  const getDisplayValue = (value) => {
    const str = `${value ?? ''}`.trim();
    return str || '—';
  };

  const fieldLabelSx = {
    fontSize: '11px',
    fontWeight: 600,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    mb: 0.4,
  };

  const fieldValueSx = {
    fontSize: '13px',
    color: '#111',
    p: '7px 10px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    backgroundColor: '#FFFFFF',
    minHeight: 36,
    display: 'flex',
    alignItems: 'center',
    lineHeight: 1.4,
  };

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
                  backgroundColor: '#FFFFFF',
                  '& .MuiSelect-select': { fontSize: '13px', py: '8px' },
                }}
              >
                <MenuItem value="">Select</MenuItem>
                {options.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <TextField
              fullWidth
              size="small"
              type={type}
              value={value}
              onChange={(e) => handleChange(field, e.target.value, true)}
              sx={{
                '& .MuiInputBase-input': { fontSize: '13px', py: '8px' },
                backgroundColor: '#FFFFFF',
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
    <Box
      sx={{
        py: { xs: 2, md: 4 },
        mt: { xs: 0, md: -5 },
        width: '100%',
        maxWidth: '1600px',
        mx: 'auto',
        overflowX: 'hidden',
      }}
    >
      <Box sx={{ px: { xs: 2, sm: 3, md: 6 } }}>
        {/* ── Header ─────────────────────────────────────────── */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }}>
            <GlassCard>
              <Box
                sx={{
                  p: 5,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  color: accentColor,
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
                  justifyContent="space-between"
                  position="relative"
                  zIndex={1}
                >
                  <Box display="flex" alignItems="center">
                    <Avatar
                      sx={{
                        bgcolor: 'rgba(109,35,35,0.15)',
                        mr: 4,
                        width: 64,
                        height: 64,
                        boxShadow: '0 8px 24px rgba(109,35,35,0.15)',
                      }}
                    >
                      <PersonIcon sx={{ color: accentColor, fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                          fontWeight: 700,
                          mb: 1,
                          lineHeight: 1.2,
                          color: accentColor,
                        }}
                      >
                        Personal Information Management
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          opacity: 0.8,
                          fontWeight: 400,
                          color: accentDark,
                        }}
                      >
                        Add and manage personal information records
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Tooltip title="Refresh Data">
                      <IconButton
                        onClick={() => window.location.reload()}
                        sx={{
                          bgcolor: 'rgba(109,35,35,0.1)',
                          '&:hover': { bgcolor: 'rgba(109,35,35,0.2)' },
                          color: accentColor,
                          width: 48,
                          height: 48,
                        }}
                      >
                        <Refresh sx={{ fontSize: 24 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {/* ── Loading Backdrop ───────────────────────────────── */}
        <Backdrop
          sx={{
            color: primaryColor,
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
          open={loading}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress color="inherit" size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 2, color: primaryColor }}>
              Processing personal information record...
            </Typography>
          </Box>
        </Backdrop>

        {/* ── Main Content ───────────────────────────────────── */}
        <Grid container spacing={4}>
          {/* Add New Person */}
          <Grid item xs={12} lg={6}>
            <Fade in timeout={700}>
              <GlassCard
                sx={{
                  height: 'calc(100vh - 200px)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box
                  sx={{
                    p: 4,
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    color: accentColor,
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <PersonIcon sx={{ fontSize: '1.8rem', mr: 2 }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      Add New Personal Information
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                      Fill in the personal information details
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    p: 4,
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto',
                  }}
                >
                  <Stepper activeStep={activeStep} orientation="vertical">
                    {steps.map((step, index) => (
                      <Step key={step.label}>
                        <StepLabel
                          error={stepErrors[index]}
                          sx={{
                            '& .MuiStepLabel-iconContainer': {
                              color: stepErrors[index] ? 'red' : undefined,
                            },
                          }}
                        >
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {step.label}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#666' }}>
                            {step.subtitle}
                          </Typography>
                        </StepLabel>
                        <StepContent>
                          {renderStepContent(step)}
                          <Box sx={{ mb: 2, mt: 3 }}>
                            <div>
                              {index === steps.length - 1 ? (
                                <ProfessionalButton
                                  variant="contained"
                                  onClick={handleAdd}
                                  startIcon={<AddIcon />}
                                  sx={{
                                    mr: 1,
                                    backgroundColor: accentColor,
                                    color: primaryColor,
                                    '&:hover': { backgroundColor: accentDark },
                                    width: '80%',
                                  }}
                                >
                                  Add Person
                                </ProfessionalButton>
                              ) : (
                                <ProfessionalButton
                                  variant="contained"
                                  onClick={handleNext}
                                  sx={{
                                    mr: 1,
                                    backgroundColor: accentColor,
                                    color: primaryColor,
                                    '&:hover': { backgroundColor: accentDark },
                                  }}
                                  endIcon={<NextIcon />}
                                >
                                  Next
                                </ProfessionalButton>
                              )}
                              <ProfessionalButton
                                variant="outlined"
                                disabled={index === 0}
                                onClick={handleBack}
                                sx={{
                                  mr: 1,
                                  borderColor: accentColor,
                                  color: accentColor,
                                }}
                                startIcon={<PrevIcon />}
                              >
                                Back
                              </ProfessionalButton>
                            </div>
                          </Box>
                        </StepContent>
                      </Step>
                    ))}
                  </Stepper>
                </Box>
              </GlassCard>
            </Fade>
          </Grid>

          {/* Records Panel */}
          <Grid item xs={12} lg={6}>
            <Fade in timeout={900}>
              <GlassCard
                sx={{
                  height: 'calc(100vh - 200px)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box
                  sx={{
                    p: 4,
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    color: accentColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    flexShrink: 0,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Reorder sx={{ fontSize: '1.8rem', mr: 2 }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        Personal Information Records
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        View and manage existing records
                      </Typography>
                    </Box>
                  </Box>
                  <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={handleViewModeChange}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      '& .MuiToggleButton-root': {
                        color: accentColor,
                        borderColor: alpha(
                          settings.primaryColor || '#6d2323',
                          0.5,
                        ),
                        padding: '4px 8px',
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(255,255,255,0.3)',
                          color: accentColor,
                        },
                      },
                    }}
                  >
                    <ToggleButton value="grid">
                      <ViewModuleIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton value="list">
                      <ViewListIcon fontSize="small" />
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                <Box
                  sx={{
                    p: 4,
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    pt: 2,
                  }}
                >
                  <Box sx={{ mb: 2, flexShrink: 0 }}>
                    <ModernTextField
                      size="small"
                      variant="outlined"
                      placeholder="Search by Employee Number or Name"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <SearchIcon sx={{ color: accentColor, mr: 1 }} />
                        ),
                      }}
                    />
                  </Box>

                  <Box
                    sx={{
                      flexGrow: 1,
                      overflowY: 'auto',
                      pr: 1,
                      '&::-webkit-scrollbar': { width: '6px' },
                      '&::-webkit-scrollbar-track': {
                        background: '#f1f1f1',
                        borderRadius: '3px',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: accentColor,
                        borderRadius: '3px',
                      },
                    }}
                  >
                    {viewMode === 'grid' ? (
                      <Grid container spacing={1.5}>
                        {paginatedData.map((person) => (
                          <Grid
                            item
                            xs={12}
                            sm={6}
                            md={6}
                            lg={6}
                            key={person.id}
                          >
                            <Card
                              onClick={() => handleOpenModal(person)}
                              sx={{
                                cursor: 'pointer',
                                border: `1px solid ${alpha(settings.primaryColor || '#6d2323', 0.15)}`,
                                height: '100%',
                                borderRadius: 2,
                                backgroundColor: '#ffffff',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  borderColor: accentColor,
                                  transform: 'translateY(-4px)',
                                  boxShadow: '0 8px 16px rgba(109,35,35,0.1)',
                                },
                              }}
                            >
                              <CardContent
                                sx={{
                                  p: 1.5,
                                  flexGrow: 1,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  textAlign: 'center',
                                  gap: 0.5,
                                }}
                              >
                                <Avatar
                                  sx={{
                                    bgcolor: alpha(accentColor, 0.1),
                                    color: accentColor,
                                    width: 36,
                                    height: 36,
                                  }}
                                >
                                  <PersonIcon sx={{ fontSize: 20 }} />
                                </Avatar>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: accentColor,
                                    fontWeight: 'bold',
                                    fontSize: '0.7rem',
                                    letterSpacing: 0.5,
                                    lineHeight: 1.2,
                                  }}
                                >
                                  {person.agencyEmployeeNum}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  fontWeight="600"
                                  color="#333"
                                  sx={{ lineHeight: 1.2, fontSize: '0.9rem' }}
                                >
                                  {person.firstName} {person.lastName}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      paginatedData.map((person) => (
                        <Card
                          key={person.id}
                          onClick={() => handleOpenModal(person)}
                          sx={{
                            cursor: 'pointer',
                            border: '1px solid rgba(109, 35, 35, 0.1)',
                            mb: 1,
                            backgroundColor: '#fff',
                            '&:hover': {
                              borderColor: accentColor,
                              backgroundColor: alpha(
                                settings.accentColor ||
                                  settings.backgroundColor ||
                                  '#FEF9E1',
                                0.2,
                              ),
                            },
                          }}
                        >
                          <Box sx={{ p: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <PersonIcon
                                sx={{
                                  fontSize: 18,
                                  color: accentColor,
                                  mr: 1.5,
                                }}
                              />
                              <Box sx={{ flexGrow: 1 }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: accentColor,
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold',
                                    lineHeight: 1.1,
                                  }}
                                >
                                  {person.agencyEmployeeNum}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  fontWeight="bold"
                                  color="#333"
                                  sx={{ lineHeight: 1.2, fontSize: '0.9rem' }}
                                >
                                  {person.firstName} {person.lastName}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Card>
                      ))
                    )}

                    {filteredData.length === 0 && (
                      <Box textAlign="center" py={4}>
                        <Typography
                          variant="h6"
                          color={accentColor}
                          fontWeight="bold"
                          sx={{ mb: 1 }}
                        >
                          No Records Found
                        </Typography>
                        <Typography variant="body2" color={grayColor}>
                          Try adjusting your search criteria
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Pagination Footer */}
                  <Box
                    sx={{
                      flexShrink: 0,
                      mt: 2,
                      pt: 1.5,
                      borderTop: `1px solid ${alpha(accentColor, 0.15)}`,
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      backgroundColor: '#fff',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 0.5,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.75rem',
                            color: accentColor,
                            fontWeight: 600,
                          }}
                        >
                          Rows per page:
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 70 }}>
                          <Select
                            value={rowsPerPage}
                            onChange={handleRowsPerPageChange}
                            sx={{ fontSize: '0.75rem', height: 28 }}
                          >
                            {[20, 40, 60, 80, 100].map((n) => (
                              <MenuItem key={n} value={n}>
                                {n}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <Typography
                          sx={{ fontSize: '0.75rem', color: accentColor }}
                        >
                          {startRow}-{endRow} of {totalRows}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                          disabled={page <= 0}
                          sx={{ color: accentColor, p: 0.5 }}
                        >
                          <PrevIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() =>
                            setPage((p) => Math.min(totalPages - 1, p + 1))
                          }
                          disabled={page >= totalPages - 1}
                          sx={{ color: accentColor, p: 0.5 }}
                        >
                          <NextIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </GlassCard>
            </Fade>
          </Grid>
        </Grid>

        <SuccessfulOverlay
          open={successOpen}
          action={successAction}
          onClose={() => setSuccessOpen(false)}
        />

        {/* ── Edit / View Modal ──────────────────────────────── */}
        <Modal
          open={!!editPerson}
          onClose={handleCloseModal}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Paper
            sx={{
              width: '92%',
              maxWidth: '980px',
              height: '580px',
              maxHeight: '90vh',
              overflow: 'hidden',
              borderRadius: '14px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'row',
              backgroundColor: '#FFFFFF',
            }}
          >
            {editPerson && (
              <>
                {/* LEFT SIDEBAR */}
                <Box
                  sx={{
                    width: 220,
                    flexShrink: 0,
                    borderRight: '1px solid #e0e0e0',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Box sx={{ p: '20px 16px 16px', borderBottom: '1px solid #e0e0e0' }}>
                    <Avatar
                      sx={{
                        width: 52,
                        height: 52,
                        mb: 1,
                        backgroundColor: '#6D2323',
                        color: '#FEF9E1',
                        fontSize: '18px',
                      }}
                    >
                      {`${editPerson.firstName?.[0] || ''}${editPerson.lastName?.[0] || ''}`}
                    </Avatar>
                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111', lineHeight: 1.3 }}>
                      {`${editPerson.firstName || ''} ${editPerson.lastName || ''}`.trim() || 'Unnamed Employee'}
                    </Typography>
                    <Typography sx={{ fontSize: '11px', color: '#666', mt: 0.2 }}>
                      {editPerson.agencyEmployeeNum || 'No Employee Number'}
                    </Typography>
                    <Box sx={{ mt: 1, border: '1px solid #e0e0e0', borderRadius: '20px', px: 1, py: 0.4, width: 'fit-content', backgroundColor: '#FFFFFF' }}>
                      <Typography sx={{ fontSize: '11px', color: '#3B6D11' }}>Active</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ flex: 1, overflowY: 'auto', p: '8px 0', backgroundColor: '#FFFFFF' }}>
                    {[
                      { key: 'personal', label: 'Personal info', icon: <PersonIcon sx={{ fontSize: 16 }} /> },
                      { key: 'govids', label: 'Government IDs', icon: <CreditCard sx={{ fontSize: 16 }} /> },
                      { key: 'address', label: 'Address', icon: <Home sx={{ fontSize: 16 }} /> },
                      { key: 'family', label: 'Family', icon: <FamilyRestroom sx={{ fontSize: 16 }} /> },
                      { key: 'education', label: 'Education', icon: <School sx={{ fontSize: 16 }} /> },
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
                          py: 1,
                          cursor: 'pointer',
                          fontSize: '13px',
                          color: modalTab === item.key ? '#6D2323' : '#666',
                          borderLeft: modalTab === item.key ? '2px solid #6D2323' : '2px solid transparent',
                          backgroundColor: '#FFFFFF',
                          fontWeight: modalTab === item.key ? 600 : 400,
                          '&:hover': { backgroundColor: '#FFFFFF' },
                        }}
                      >
                        {item.icon}
                        <Typography sx={{ fontSize: '13px' }}>{item.label}</Typography>
                      </Box>
                    ))}
                  </Box>

                  <Box sx={{ p: 1.5, borderTop: '1px solid #e0e0e0', backgroundColor: '#FFFFFF' }}>
                    <Typography sx={{ fontSize: '11px', color: '#666' }}>Last updated</Typography>
                    <Typography sx={{ fontSize: '12px', color: '#666' }}>
                      {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
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
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <Box
                    sx={{
                      p: '16px 24px',
                      borderBottom: '1px solid #e0e0e0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexShrink: 0,
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>
                        {modalTab === 'personal' && 'Personal information'}
                        {modalTab === 'govids' && 'Government IDs'}
                        {modalTab === 'address' && 'Address'}
                        {modalTab === 'family' && 'Family'}
                        {modalTab === 'education' && 'Education'}
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: '#666', mt: 0.2 }}>
                        {modalTab === 'personal' && 'Basic details and contact'}
                        {modalTab === 'govids' && 'Identification numbers'}
                        {modalTab === 'address' && 'Residential and permanent'}
                        {modalTab === 'family' && 'Spouse and parents'}
                        {modalTab === 'education' && 'Elementary and secondary'}
                      </Typography>
                    </Box>
                    <IconButton
                      onClick={handleCloseModal}
                      sx={{ width: 28, height: 28, borderRadius: '6px', border: '1px solid #e0e0e0', color: '#666', backgroundColor: '#FFFFFF' }}
                    >
                      <Close sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>

                  <Box
                    sx={{
                      flex: 1,
                      overflowY: 'auto',
                      p: '20px 24px',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    {modalTab === 'personal' && (
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        {renderModalField('First name', 'firstName')}
                        {renderModalField('Last name', 'lastName')}
                        {renderModalField('Middle name', 'middleName')}
                        {renderModalField('Name extension', 'nameExtension')}
                        {renderModalField('Date of birth', 'birthDate', { type: 'date' })}
                        {renderModalField('Place of birth', 'placeOfBirth')}
                        {renderModalField('Sex', 'sex', { options: ['Male', 'Female', 'Other'] })}
                        {renderModalField('Civil status', 'civilStatus', { options: ['Single', 'Married', 'Widowed', 'Separated', 'Divorced'] })}
                        {renderModalField('Citizenship', 'citizenship')}
                        {renderModalField('Blood type', 'bloodType', { options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] })}
                        {renderModalField('Mobile number', 'mobileNum')}
                        {renderModalField('Telephone', 'telephone')}
                        {renderModalField('Email address', 'emailAddress', { full: true })}
                        {renderModalField('Height', 'heightCm')}
                        {renderModalField('Weight', 'weightKg')}
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
                              border: '1px solid #e0e0e0',
                              borderRadius: '8px',
                              mb: 1,
                              backgroundColor: '#FFFFFF',
                              gap: 2,
                            }}
                          >
                            <Typography sx={{ fontSize: '11px', color: '#666', fontWeight: 600 }}>
                              {label}
                            </Typography>
                            {isEditing && field !== 'agencyEmployeeNum' ? (
                              <TextField
                                size="small"
                                value={editPerson[field] || ''}
                                onChange={(e) => handleChange(field, e.target.value, true)}
                                sx={{
                                  minWidth: 220,
                                  '& .MuiInputBase-input': { fontSize: '13px', py: '6px' },
                                  backgroundColor: '#FFFFFF',
                                }}
                              />
                            ) : (
                              <Typography sx={{ fontSize: '13px', color: '#111' }}>
                                {getDisplayValue(editPerson[field])}
                              </Typography>
                            )}
                          </Box>
                        ))}
                        <Box sx={{ mt: 1.5, p: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#FFFFFF' }}>
                          <Typography sx={{ fontSize: '12px', color: '#666' }}>
                            Employee number cannot be changed. Contact administrator for corrections.
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {modalTab === 'address' && (
                      <Box>
                        <Box sx={{ mb: 1.2, p: '12px 14px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#FFFFFF' }}>
                          <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.8 }}>
                            Residential address
                          </Typography>
                          {isEditing ? (
                            <PhilippineAddressSelector
                              prefix="residential"
                              values={editPerson}
                              onChange={handleEditAddressChange}
                              settings={settings}
                            />
                          ) : (
                            <Typography sx={{ fontSize: '13px', color: '#111', lineHeight: 1.6 }}>
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

                        <Box sx={{ p: '12px 14px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#FFFFFF' }}>
                          <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.8 }}>
                            Permanent address
                          </Typography>
                          {isEditing ? (
                            <PhilippineAddressSelector
                              prefix="permanent"
                              values={editPerson}
                              onChange={handleEditAddressChange}
                              settings={settings}
                              showSameAsCheck
                              residentialValues={editPerson}
                            />
                          ) : (
                            <Typography sx={{ fontSize: '13px', color: '#111', lineHeight: 1.6 }}>
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
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#6D2323', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Spouse
                            </Typography>
                            <Box sx={{ height: 1, flex: 1, backgroundColor: '#e0e0e0' }} />
                          </Box>
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            {renderModalField('First name', 'spouseFirstName')}
                            {renderModalField('Last name', 'spouseLastName')}
                            {renderModalField('Middle name', 'spouseMiddleName')}
                            {renderModalField('Name extension', 'spouseNameExtension')}
                            {renderModalField('Occupation', 'spouseOccupation')}
                            {renderModalField('Employer', 'spouseEmployerBusinessName')}
                            {renderModalField('Business address', 'spouseBusinessAddress', { full: true })}
                            {renderModalField('Telephone', 'spouseTelephone', { full: true })}
                          </Box>
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#6D2323', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Father
                            </Typography>
                            <Box sx={{ height: 1, flex: 1, backgroundColor: '#e0e0e0' }} />
                          </Box>
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            {renderModalField('First name', 'fatherFirstName')}
                            {renderModalField('Last name', 'fatherLastName')}
                            {renderModalField('Middle name', 'fatherMiddleName')}
                            {renderModalField('Name extension', 'fatherNameExtension')}
                          </Box>
                        </Box>

                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#6D2323', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Mother
                            </Typography>
                            <Box sx={{ height: 1, flex: 1, backgroundColor: '#e0e0e0' }} />
                          </Box>
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            {renderModalField('Maiden first name', 'motherMaidenFirstName')}
                            {renderModalField('Maiden last name', 'motherMaidenLastName')}
                            {renderModalField('Maiden middle name', 'motherMaidenMiddleName', { full: true })}
                          </Box>
                        </Box>
                      </Box>
                    )}

                    {modalTab === 'education' && (
                      <Box>
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#6D2323', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Elementary
                            </Typography>
                            <Box sx={{ height: 1, flex: 1, backgroundColor: '#e0e0e0' }} />
                          </Box>
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            {renderModalField('School name', 'elementaryNameOfSchool', { full: true })}
                            {renderModalField('Period from', 'elementaryPeriodFrom')}
                            {renderModalField('Period to', 'elementaryPeriodTo')}
                            {renderModalField('Year graduated', 'elementaryYearGraduated')}
                            {renderModalField('Honors received', 'elementaryScholarshipAcademicHonorsReceived', { full: true })}
                          </Box>
                        </Box>

                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#6D2323', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Secondary
                            </Typography>
                            <Box sx={{ height: 1, flex: 1, backgroundColor: '#e0e0e0' }} />
                          </Box>
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            {renderModalField('School name', 'secondaryNameOfSchool', { full: true })}
                            {renderModalField('Period from', 'secondaryPeriodFrom')}
                            {renderModalField('Period to', 'secondaryPeriodTo')}
                            {renderModalField('Year graduated', 'secondaryYearGraduated')}
                            {renderModalField('Honors received', 'secondaryScholarshipAcademicHonorsReceived', { full: true })}
                          </Box>
                        </Box>
                      </Box>
                    )}
                  </Box>

                  {/* ACTION BAR */}
                  <Box
                    sx={{
                      p: '12px 24px',
                      borderTop: '1px solid #e0e0e0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexShrink: 0,
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <Button
                      onClick={() => handleDelete(editPerson.id)}
                      variant="outlined"
                      startIcon={<DeleteIcon />}
                      sx={{
                        fontSize: '13px',
                        px: 1.8,
                        py: 0.7,
                        borderRadius: '8px',
                        textTransform: 'none',
                        borderColor: '#A32D2D55',
                        color: '#A32D2D',
                        backgroundColor: '#FFFFFF',
                        '&:hover': { backgroundColor: '#FFFFFF', borderColor: '#A32D2D' },
                      }}
                    >
                      Delete record
                    </Button>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {isEditing && (
                        <Button
                          onClick={handleCancelEdit}
                          variant="outlined"
                          startIcon={<CancelIcon />}
                          sx={{
                            fontSize: '13px',
                            px: 1.8,
                            py: 0.7,
                            borderRadius: '8px',
                            textTransform: 'none',
                            borderColor: '#c8c8c8',
                            color: '#666',
                            backgroundColor: '#FFFFFF',
                            '&:hover': { backgroundColor: '#FFFFFF' },
                          }}
                        >
                          Cancel
                        </Button>
                      )}

                      {!isEditing ? (
                        <Button
                          onClick={handleStartEdit}
                          variant="contained"
                          startIcon={<EditIcon />}
                          sx={{
                            fontSize: '13px',
                            px: 1.8,
                            py: 0.7,
                            borderRadius: '8px',
                            textTransform: 'none',
                            backgroundColor: '#6D2323',
                            color: '#FEF9E1',
                            '&:hover': { backgroundColor: '#8B3333' },
                          }}
                        >
                          Edit
                        </Button>
                      ) : (
                        <Button
                          onClick={handleUpdate}
                          variant="contained"
                          startIcon={<SaveIcon />}
                          disabled={!hasChanges()}
                          sx={{
                            fontSize: '13px',
                            px: 1.8,
                            py: 0.7,
                            borderRadius: '8px',
                            textTransform: 'none',
                            backgroundColor: '#639922',
                            color: '#FFFFFF',
                            '&:hover': { backgroundColor: '#3B6D11' },
                            '&:disabled': { backgroundColor: '#b9c7a5', color: '#FFFFFF' },
                          }}
                        >
                          Save changes
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Box>
              </>
            )}
          </Paper>
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
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default PersonTable;
