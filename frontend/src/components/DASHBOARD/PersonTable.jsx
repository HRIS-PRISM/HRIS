import API_BASE_URL from '../../apiConfig';
import React, { useEffect, useMemo, useState, useRef } from 'react';
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

// Employee Autocomplete Component
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
        `${API_BASE_URL}/Remittance/employees/search?q=${encodeURIComponent(
          searchQuery,
        )}`,
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

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

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
      if (query.length >= 2) {
        fetchEmployees(query);
      } else {
        fetchAllEmployees();
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleDropdownClick = () => {
    if (!showDropdown) {
      setShowDropdown(true);
      if (employees.length === 0 && !isLoading) {
        fetchAllEmployees();
      }
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

const PersonTable = () => {
  const { socket, connected } = useSocket();
  // Get settings from context
  const { settings } = useSystemSettings();

  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [page, setPage] = useState(0);
  // CHANGED: Default rows per page to 20
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('');
  const [errors, setErrors] = useState({});
  const [stepErrors, setStepErrors] = useState({});
  const [viewMode, setViewMode] = useState('grid');
  const [activeStep, setActiveStep] = useState(0);

  //ACCESSING
  // Dynamic page access control using component identifier
  const navigate = useNavigate();
  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('personalinfo');
  // ACCESSING END

  // Create themed styled components using system settings (memoized to avoid remount/focus loss)
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

  // Color scheme from settings (for compatibility)
  const primaryColor = settings.accentColor || '#FEF9E1';
  const secondaryColor = settings.backgroundColor || '#FFF8E7';
  const accentColor = settings.primaryColor || '#6d2323';
  const accentDark =
    settings.secondaryColor || settings.hoverColor || '#8B3333';
  const grayColor = settings.textSecondaryColor || '#6c757d';

  // Stepper state
  const [newPerson, setNewPerson] = useState({
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
  });

  // Modal state for viewing/editing
  const [editPerson, setEditPerson] = useState(null);
  const [originalPerson, setOriginalPerson] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEditEmployee, setSelectedEditEmployee] = useState(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

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

  // Keep latest fetch function for Socket.IO handler
  useEffect(() => {
    fetchPersonsRef.current = fetchPersons;
  });

  // Socket.IO: when anyone updates Personal Info, refresh this page
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
      if (!newPerson[field] || newPerson[field].trim() === '') {
        newErrors[field] = 'This field is required';
      }
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
    const stepRequiredFields = currentStepFields.filter((field) =>
      requiredFields.includes(field),
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
      const newStepErrors = { ...prev };
      delete newStepErrors[activeStep];
      return newStepErrors;
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
      setNewPerson(
        Object.fromEntries(Object.keys(newPerson).map((k) => [k, ''])),
      );
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

  const handleChange = (field, value, isEdit = false) => {
    if (isEdit) {
      setEditPerson({ ...editPerson, [field]: value });
    } else {
      setNewPerson({ ...newPerson, [field]: value });
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
      if (stepErrors[activeStep]) {
        setStepErrors((prev) => {
          const newStepErrors = { ...prev };
          delete newStepErrors[activeStep];
          return newStepErrors;
        });
      }
    }
  };

  const handleEmployeeChange = (employeeNumber) => {
    setNewPerson({ ...newPerson, agencyEmployeeNum: employeeNumber });
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.agencyEmployeeNum;
      return newErrors;
    });
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
  };

  const handleEditEmployeeChange = (employeeNumber) => {
    setEditPerson({ ...editPerson, agencyEmployeeNum: employeeNumber });
  };

  const handleEditEmployeeSelect = (employee) => {
    setSelectedEditEmployee(employee);
  };

  const handleOpenModal = (person) => {
    setEditPerson({ ...person });
    setOriginalPerson({ ...person });
    setSelectedEditEmployee({
      name: `${person.firstName} ${person.lastName}`,
      employeeNumber: person.agencyEmployeeNum,
    });
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

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
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      return;
    }
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const hasChanges = () => {
    if (!editPerson || !originalPerson) return false;

    return (
      editPerson.firstName !== originalPerson.firstName ||
      editPerson.middleName !== originalPerson.middleName ||
      editPerson.lastName !== originalPerson.lastName ||
      editPerson.nameExtension !== originalPerson.nameExtension ||
      editPerson.birthDate !== originalPerson.birthDate ||
      editPerson.placeOfBirth !== originalPerson.placeOfBirth ||
      editPerson.sex !== originalPerson.sex ||
      editPerson.civilStatus !== originalPerson.civilStatus ||
      editPerson.citizenship !== originalPerson.citizenship ||
      editPerson.heightCm !== originalPerson.heightCm ||
      editPerson.weightKg !== originalPerson.weightKg ||
      editPerson.bloodType !== originalPerson.bloodType ||
      editPerson.gsisNum !== originalPerson.gsisNum ||
      editPerson.pagibigNum !== originalPerson.pagibigNum ||
      editPerson.philhealthNum !== originalPerson.philhealthNum ||
      editPerson.sssNum !== originalPerson.sssNum ||
      editPerson.tinNum !== originalPerson.tinNum ||
      editPerson.agencyEmployeeNum !== originalPerson.agencyEmployeeNum ||
      editPerson.permanent_houseBlockLotNum !==
        originalPerson.permanent_houseBlockLotNum ||
      editPerson.permanent_streetName !== originalPerson.permanent_streetName ||
      editPerson.permanent_subdivisionOrVillage !==
        originalPerson.permanent_subdivisionOrVillage ||
      editPerson.permanent_barangay !== originalPerson.permanent_barangay ||
      editPerson.permanent_cityOrMunicipality !==
        originalPerson.permanent_cityOrMunicipality ||
      editPerson.permanent_provinceName !==
        originalPerson.permanent_provinceName ||
      editPerson.permanent_zipcode !== originalPerson.permanent_zipcode ||
      editPerson.residential_houseBlockLotNum !==
        originalPerson.residential_houseBlockLotNum ||
      editPerson.residential_streetName !==
        originalPerson.residential_streetName ||
      editPerson.residential_subdivisionOrVillage !==
        originalPerson.residential_subdivisionOrVillage ||
      editPerson.residential_barangayName !==
        originalPerson.residential_barangayName ||
      editPerson.residential_cityOrMunicipality !==
        originalPerson.residential_cityOrMunicipality ||
      editPerson.residential_provinceName !==
        originalPerson.residential_provinceName ||
      editPerson.residential_zipcode !== originalPerson.residential_zipcode ||
      editPerson.telephone !== originalPerson.telephone ||
      editPerson.mobileNum !== originalPerson.mobileNum ||
      editPerson.emailAddress !== originalPerson.emailAddress ||
      editPerson.spouseFirstName !== originalPerson.spouseFirstName ||
      editPerson.spouseMiddleName !== originalPerson.spouseMiddleName ||
      editPerson.spouseLastName !== originalPerson.spouseLastName ||
      editPerson.spouseNameExtension !== originalPerson.spouseNameExtension ||
      editPerson.spouseOccupation !== originalPerson.spouseOccupation ||
      editPerson.spouseEmployerBusinessName !==
        originalPerson.spouseEmployerBusinessName ||
      editPerson.spouseBusinessAddress !==
        originalPerson.spouseBusinessAddress ||
      editPerson.spouseTelephone !== originalPerson.spouseTelephone ||
      editPerson.fatherFirstName !== originalPerson.fatherFirstName ||
      editPerson.fatherMiddleName !== originalPerson.fatherMiddleName ||
      editPerson.fatherLastName !== originalPerson.fatherLastName ||
      editPerson.fatherNameExtension !== originalPerson.fatherNameExtension ||
      editPerson.motherMaidenFirstName !==
        originalPerson.motherMaidenFirstName ||
      editPerson.motherMaidenMiddleName !==
        originalPerson.motherMaidenMiddleName ||
      editPerson.motherMaidenLastName !== originalPerson.motherMaidenLastName ||
      editPerson.elementaryNameOfSchool !==
        originalPerson.elementaryNameOfSchool ||
      editPerson.elementaryDegree !== originalPerson.elementaryDegree ||
      editPerson.elementaryPeriodFrom !== originalPerson.elementaryPeriodFrom ||
      editPerson.elementaryPeriodTo !== originalPerson.elementaryPeriodTo ||
      editPerson.elementaryHighestAttained !==
        originalPerson.elementaryHighestAttained ||
      editPerson.elementaryYearGraduated !==
        originalPerson.elementaryYearGraduated ||
      editPerson.elementaryScholarshipAcademicHonorsReceived !==
        originalPerson.elementaryScholarshipAcademicHonorsReceived ||
      editPerson.secondaryNameOfSchool !==
        originalPerson.secondaryNameOfSchool ||
      editPerson.secondaryDegree !== originalPerson.secondaryDegree ||
      editPerson.secondaryPeriodFrom !== originalPerson.secondaryPeriodFrom ||
      editPerson.secondaryPeriodTo !== originalPerson.secondaryPeriodTo ||
      editPerson.secondaryHighestAttained !==
        originalPerson.secondaryHighestAttained ||
      editPerson.secondaryYearGraduated !==
        originalPerson.secondaryYearGraduated ||
      editPerson.secondaryScholarshipAcademicHonorsReceived !==
        originalPerson.secondaryScholarshipAcademicHonorsReceived
    );
  };

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
      label: 'Address Information',
      subtitle: 'Your permanent and residential addresses',
      fields: [
        'permanent_houseBlockLotNum',
        'permanent_streetName',
        'permanent_subdivisionOrVillage',
        'permanent_barangay',
        'permanent_cityOrMunicipality',
        'permanent_provinceName',
        'permanent_zipcode',
        'residential_houseBlockLotNum',
        'residential_streetName',
        'residential_subdivisionOrVillage',
        'residential_barangayName',
        'residential_cityOrMunicipality',
        'residential_provinceName',
        'residential_zipcode',
      ],
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

  const renderStepContent = (step) => (
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

        // Field label mapping for user-friendly display
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
          permanent_houseBlockLotNum: 'Permanent Address - House/Block/Lot No.',
          permanent_streetName: 'Permanent Address - Street Name',
          permanent_subdivisionOrVillage:
            'Permanent Address - Subdivision/Village',
          permanent_barangay: 'Permanent Address - Barangay',
          permanent_cityOrMunicipality: 'Permanent Address - City/Municipality',
          permanent_provinceName: 'Permanent Address - Province',
          permanent_zipcode: 'Permanent Address - Zip Code',
          residential_houseBlockLotNum:
            'Residential Address - House/Block/Lot No.',
          residential_streetName: 'Residential Address - Street Name',
          residential_subdivisionOrVillage:
            'Residential Address - Subdivision/Village',
          residential_barangayName: 'Residential Address - Barangay',
          residential_cityOrMunicipality:
            'Residential Address - City/Municipality',
          residential_provinceName: 'Residential Address - Province',
          residential_zipcode: 'Residential Address - Zip Code',
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

        // Render dropdown for specific fields
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
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: hasError ? 'red' : '#6D2323',
                      },
                      '&:hover fieldset': {
                        borderColor: hasError ? 'red' : '#6D2323',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: hasError ? 'red' : '#6D2323',
                      },
                    },
                  }}
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
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: hasError ? 'red' : '#6D2323',
                      },
                      '&:hover fieldset': {
                        borderColor: hasError ? 'red' : '#6D2323',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: hasError ? 'red' : '#6D2323',
                      },
                    },
                  }}
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
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: '#6D2323',
                      },
                      '&:hover fieldset': {
                        borderColor: '#6D2323',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#6D2323',
                      },
                    },
                  }}
                >
                  <MenuItem value="">Select Blood Type</MenuItem>
                  <MenuItem value="A+">A+</MenuItem>
                  <MenuItem value="A-">A-</MenuItem>
                  <MenuItem value="B+">B+</MenuItem>
                  <MenuItem value="B-">B-</MenuItem>
                  <MenuItem value="AB+">AB+</MenuItem>
                  <MenuItem value="AB-">AB-</MenuItem>
                  <MenuItem value="O+">O+</MenuItem>
                  <MenuItem value="O-">O-</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          );
        }

        // Special handling for agencyEmployeeNum field
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

        // Default text field for other fields
        return (
          <Grid item xs={12} sm={6} key={field}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
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
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: hasError ? 'red' : '#6D2323',
                  },
                  '&:hover fieldset': {
                    borderColor: hasError ? 'red' : '#6D2323',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: hasError ? 'red' : '#6D2323',
                  },
                },
              }}
            />
          </Grid>
        );
      })}
    </Grid>
  );

  // ACCESSING 2
  // Loading state

  // Keep pagination state valid when filters/search update the dataset size
  useEffect(() => {
    if (page > 0 && page * rowsPerPage >= filteredData.length) {
      setPage(0);
    }
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
  // Access denied state - Now using the reusable component
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
  //ACCESSING END2

  // Pagination (to avoid lag when rendering large datasets)
  const totalRows = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const startRow = totalRows === 0 ? 0 : page * rowsPerPage + 1;
  const endRow = Math.min((page + 1) * rowsPerPage, totalRows);

  // IMPORTANT: Avoid calling hooks after any conditional early returns.
  // Compute the page slice directly (no extra hooks needed).
  const paginatedData = (() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredData.slice(start, end);
  })();

  const handleRowsPerPageChange = (e) => {
    const next = Number(e.target.value) || 20;
    setRowsPerPage(next);
    setPage(0);
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
        {/* Header */}
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

        {/* Loading Backdrop */}
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

        {/* Main Content */}
        <Grid container spacing={4}>
          {/* Add New Person Section */}
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

          {/* Personal Information Records Section */}
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
                    aria-label="view mode"
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      '& .MuiToggleButton-root': {
                        color: accentColor,
                        borderColor: alpha(
                          settings.primaryColor || '#6d2323',
                          0.5,
                        ),
                        padding: '4px 8px',
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(255, 255, 255, 0.3)',
                          color: accentColor,
                        },
                      },
                    }}
                  >
                    <ToggleButton value="grid" aria-label="grid view">
                      <ViewModuleIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton value="list" aria-label="list view">
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

                  {/* SCROLLABLE AREA */}
                  <Box
                    sx={{
                      flexGrow: 1,
                      overflowY: 'auto',
                      pr: 1,
                      '&::-webkit-scrollbar': {
                        width: '6px',
                      },
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
                                backgroundColor: '#ffffff', // STRICTLY WHITE
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
                                  p: 1.5, // Reduced padding
                                  flexGrow: 1,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  textAlign: 'center',
                                  gap: 0.5, // Reduced gap
                                }}
                              >
                                <Avatar
                                  sx={{
                                    bgcolor: alpha(accentColor, 0.1),
                                    color: accentColor,
                                    width: 36, // Reduced avatar size
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
                          <Box sx={{ p: 1 }}> {/* Reduced padding from 1.5 */}
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <PersonIcon
                                sx={{ fontSize: 18, color: accentColor, mr: 1.5 }} // Reduced icon size and margin
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

                  {/* FIXED FOOTER - Outside Scrollable Area */}
                  <Box
                    sx={{
                      flexShrink: 0,
                      mt: 2,
                      pt: 1.5,
                      borderTop: `1px solid ${alpha(accentColor, 0.15)}`,
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      backgroundColor: '#fff', // Ensure solid bg
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
                      {/* Rows per page */}
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
                            sx={{
                              fontSize: '0.75rem',
                              height: 28,
                            }}
                          >
                            <MenuItem value={20}>20</MenuItem>
                            <MenuItem value={40}>40</MenuItem>
                            <MenuItem value={60}>60</MenuItem>
                            <MenuItem value={80}>80</MenuItem>
                            <MenuItem value={100}>100</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>

                      {/* Total + Pagination */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.75rem',
                            color: accentColor,
                          }}
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

        {/* Edit Modal */}
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
              width: '90%',
              maxWidth: '900px',
              height: '85vh',
              maxHeight: '85vh',
              overflow: 'hidden',
              borderRadius: 2,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {editPerson && (
              <>
                {/* Modal Header */}
                <Box
                  sx={{
                    background: `linear-gradient(135deg, ${settings.secondaryColor || '#6d2323'} 0%, ${settings.deleteButtonHoverColor || '#a31d1d'} 100%)`,
                    color: settings.accentColor || '#FEF9E1',
                    p: 3,
                    borderRadius: '8px 8px 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    flexShrink: 0,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon
                      sx={{
                        fontSize: '1.8rem',
                        mr: 2,
                        color: settings.accentColor || '#FEF9E1',
                      }}
                    />
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 'bold',
                          color: settings.accentColor || '#FEF9E1',
                        }}
                      >
                        {isEditing
                          ? 'Edit Personal Information'
                          : 'Personal Information Details'}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          opacity: 0.9,
                          color: settings.accentColor || '#FEF9E1',
                        }}
                      >
                        {editPerson.firstName} {editPerson.lastName} -{' '}
                        {editPerson.agencyEmployeeNum}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton
                    onClick={handleCloseModal}
                    sx={{ color: settings.accentColor || '#FEF9E1', ml: 1 }}
                  >
                    <Close />
                  </IconButton>
                </Box>

                {/* Scrollable Content Area */}
                <Box
                  sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    minHeight: 0,
                    '&::-webkit-scrollbar': {
                      width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: '#f1f1f1',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: settings.primaryColor || '#6D2323',
                      borderRadius: '4px',
                    },
                  }}
                >
                  <Box sx={{ p: 3 }}>
                    {/* Personal Information Section */}
                    <Accordion
                      defaultExpanded
                      sx={{
                        mb: 2,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        '&:before': { display: 'none' },
                        border: '1px solid #e0e0e0',
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          backgroundColor: '#f8f9fa',
                          '&:hover': { backgroundColor: '#f0f0f0' },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PersonIcon sx={{ color: '#6D2323', mr: 2 }} />
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: 'bold', color: '#6D2323' }}
                          >
                            Personal Information
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <List dense>
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Full Name"
                              secondary={
                                isEditing ? (
                                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                    <TextField
                                      size="small"
                                      label="First Name"
                                      value={editPerson.firstName || ''}
                                      onChange={(e) =>
                                        handleChange(
                                          'firstName',
                                          e.target.value,
                                          true,
                                        )
                                      }
                                      sx={{ flex: 1 }}
                                    />
                                    <TextField
                                      size="small"
                                      label="Middle Name"
                                      value={editPerson.middleName || ''}
                                      onChange={(e) =>
                                        handleChange(
                                          'middleName',
                                          e.target.value,
                                          true,
                                        )
                                      }
                                      sx={{ flex: 1 }}
                                    />
                                    <TextField
                                      size="small"
                                      label="Last Name"
                                      value={editPerson.lastName || ''}
                                      onChange={(e) =>
                                        handleChange(
                                          'lastName',
                                          e.target.value,
                                          true,
                                        )
                                      }
                                      sx={{ flex: 1 }}
                                    />
                                  </Box>
                                ) : (
                                  `${editPerson.firstName || ''} ${
                                    editPerson.middleName || ''
                                  } ${editPerson.lastName || ''}`
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Date of Birth"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    type="date"
                                    value={
                                      editPerson.birthDate?.split('T')[0] || ''
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        'birthDate',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : editPerson.birthDate ? (
                                  new Date(
                                    editPerson.birthDate,
                                  ).toLocaleDateString()
                                ) : (
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Place of Birth"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={editPerson.placeOfBirth || ''}
                                    onChange={(e) =>
                                      handleChange(
                                        'placeOfBirth',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.placeOfBirth || 'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Sex"
                              secondary={
                                isEditing ? (
                                  <FormControl
                                    size="small"
                                    sx={{ mt: 1, width: '100%' }}
                                  >
                                    <Select
                                      value={editPerson.sex || ''}
                                      onChange={(e) =>
                                        handleChange(
                                          'sex',
                                          e.target.value,
                                          true,
                                        )
                                      }
                                    >
                                      <MenuItem value="">Select Sex</MenuItem>
                                      <MenuItem value="Male">Male</MenuItem>
                                      <MenuItem value="Female">Female</MenuItem>
                                      <MenuItem value="Other">Other</MenuItem>
                                    </Select>
                                  </FormControl>
                                ) : (
                                  editPerson.sex || 'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Civil Status"
                              secondary={
                                isEditing ? (
                                  <FormControl
                                    size="small"
                                    sx={{ mt: 1, width: '100%' }}
                                  >
                                    <Select
                                      value={editPerson.civilStatus || ''}
                                      onChange={(e) =>
                                        handleChange(
                                          'civilStatus',
                                          e.target.value,
                                          true,
                                        )
                                      }
                                    >
                                      <MenuItem value="">
                                        Select Civil Status
                                      </MenuItem>
                                      <MenuItem value="Single">Single</MenuItem>
                                      <MenuItem value="Married">
                                        Married
                                      </MenuItem>
                                      <MenuItem value="Widowed">
                                        Widowed
                                      </MenuItem>
                                      <MenuItem value="Separated">
                                        Separated
                                      </MenuItem>
                                      <MenuItem value="Divorced">
                                        Divorced
                                      </MenuItem>
                                    </Select>
                                  </FormControl>
                                ) : (
                                  editPerson.civilStatus || 'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Citizenship"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={editPerson.citizenship || ''}
                                    onChange={(e) =>
                                      handleChange(
                                        'citizenship',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.citizenship || 'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Physical Attributes"
                              secondary={
                                isEditing ? (
                                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                    <TextField
                                      size="small"
                                      label="Height (cm)"
                                      value={editPerson.heightCm || ''}
                                      onChange={(e) =>
                                        handleChange(
                                          'heightCm',
                                          e.target.value,
                                          true,
                                        )
                                      }
                                      sx={{ flex: 1 }}
                                    />
                                    <TextField
                                      size="small"
                                      label="Weight (kg)"
                                      value={editPerson.weightKg || ''}
                                      onChange={(e) =>
                                        handleChange(
                                          'weightKg',
                                          e.target.value,
                                          true,
                                        )
                                      }
                                      sx={{ flex: 1 }}
                                    />
                                    <FormControl size="small" sx={{ flex: 1 }}>
                                      <Select
                                        value={editPerson.bloodType || ''}
                                        onChange={(e) =>
                                          handleChange(
                                            'bloodType',
                                            e.target.value,
                                            true,
                                          )
                                        }
                                        displayEmpty
                                      >
                                        <MenuItem value="">Blood Type</MenuItem>
                                        <MenuItem value="A+">A+</MenuItem>
                                        <MenuItem value="A-">A-</MenuItem>
                                        <MenuItem value="B+">B+</MenuItem>
                                        <MenuItem value="B-">B-</MenuItem>
                                        <MenuItem value="AB+">AB+</MenuItem>
                                        <MenuItem value="AB-">AB-</MenuItem>
                                        <MenuItem value="O+">O+</MenuItem>
                                        <MenuItem value="O-">O-</MenuItem>
                                      </Select>
                                    </FormControl>
                                  </Box>
                                ) : (
                                  `Height: ${
                                    editPerson.heightCm || 'N/A'
                                  } cm, Weight: ${
                                    editPerson.weightKg || 'N/A'
                                  } kg, Blood Type: ${
                                    editPerson.bloodType || 'N/A'
                                  }`
                                )
                              }
                            />
                          </ListItem>
                        </List>
                      </AccordionDetails>
                    </Accordion>

                    {/* Contact Information Section */}
                    <Accordion
                      sx={{
                        mb: 2,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        '&:before': { display: 'none' },
                        border: '1px solid #e0e0e0',
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          backgroundColor: '#f8f9fa',
                          '&:hover': { backgroundColor: '#f0f0f0' },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PersonIcon sx={{ color: '#6D2323', mr: 2 }} />
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: 'bold', color: '#6D2323' }}
                          >
                            Contact Information
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <List dense>
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Telephone Number"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={editPerson.telephone || ''}
                                    onChange={(e) =>
                                      handleChange(
                                        'telephone',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.telephone || 'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Mobile Number"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={editPerson.mobileNum || ''}
                                    onChange={(e) =>
                                      handleChange(
                                        'mobileNum',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.mobileNum || 'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Email Address"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    type="email"
                                    value={editPerson.emailAddress || ''}
                                    onChange={(e) =>
                                      handleChange(
                                        'emailAddress',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.emailAddress || 'Not specified'
                                )
                              }
                            />
                          </ListItem>
                        </List>
                      </AccordionDetails>
                    </Accordion>

                    {/* Government IDs Section */}
                    <Accordion
                      sx={{
                        mb: 2,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        '&:before': { display: 'none' },
                        border: '1px solid #e0e0e0',
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          backgroundColor: '#f8f9fa',
                          '&:hover': { backgroundColor: '#f0f0f0' },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CreditCard sx={{ color: '#6D2323', mr: 2 }} />
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: 'bold', color: '#6D2323' }}
                          >
                            Government IDs
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <List dense>
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Employee Number"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={editPerson.agencyEmployeeNum || ''}
                                    onChange={(e) =>
                                      handleChange(
                                        'agencyEmployeeNum',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                    disabled
                                    helperText="Cannot be changed"
                                  />
                                ) : (
                                  <Box>
                                    <Typography variant="body2">
                                      {editPerson.agencyEmployeeNum ||
                                        'Not specified'}
                                    </Typography>
                                    <Typography variant="caption" color="error">
                                      Contact administrator to change
                                    </Typography>
                                  </Box>
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="GSIS Number"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={editPerson.gsisNum || ''}
                                    onChange={(e) =>
                                      handleChange(
                                        'gsisNum',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.gsisNum || 'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Pag-IBIG Number"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={editPerson.pagibigNum || ''}
                                    onChange={(e) =>
                                      handleChange(
                                        'pagibigNum',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.pagibigNum || 'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="PhilHealth Number"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={editPerson.philhealthNum || ''}
                                    onChange={(e) =>
                                      handleChange(
                                        'philhealthNum',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.philhealthNum || 'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="SSS Number"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={editPerson.sssNum || ''}
                                    onChange={(e) =>
                                      handleChange(
                                        'sssNum',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.sssNum || 'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="TIN Number"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={editPerson.tinNum || ''}
                                    onChange={(e) =>
                                      handleChange(
                                        'tinNum',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.tinNum || 'Not specified'
                                )
                              }
                            />
                          </ListItem>
                        </List>
                      </AccordionDetails>
                    </Accordion>

                    {/* Address Information Section */}
                    <Accordion
                      sx={{
                        mb: 2,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        '&:before': { display: 'none' },
                        border: '1px solid #e0e0e0',
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          backgroundColor: '#f8f9fa',
                          '&:hover': { backgroundColor: '#f0f0f0' },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Home sx={{ color: '#6D2323', mr: 2 }} />
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: 'bold', color: '#6D2323' }}
                          >
                            Address Information
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 'bold', mb: 2, color: '#6D2323' }}
                        >
                          Permanent Address
                        </Typography>
                        <List dense>
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="House/Block/Lot Number"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={
                                      editPerson.permanent_houseBlockLotNum ||
                                      ''
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        'permanent_houseBlockLotNum',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.permanent_houseBlockLotNum ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Street Name"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={
                                      editPerson.permanent_streetName || ''
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        'permanent_streetName',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.permanent_streetName ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Subdivision/Village"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={
                                      editPerson.permanent_subdivisionOrVillage ||
                                      ''
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        'permanent_subdivisionOrVillage',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.permanent_subdivisionOrVillage ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Barangay"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={editPerson.permanent_barangay || ''}
                                    onChange={(e) =>
                                      handleChange(
                                        'permanent_barangay',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.permanent_barangay ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="City/Municipality"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={
                                      editPerson.permanent_cityOrMunicipality ||
                                      ''
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        'permanent_cityOrMunicipality',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.permanent_cityOrMunicipality ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Province"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={
                                      editPerson.permanent_provinceName || ''
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        'permanent_provinceName',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.permanent_provinceName ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Zip Code"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={editPerson.permanent_zipcode || ''}
                                    onChange={(e) =>
                                      handleChange(
                                        'permanent_zipcode',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.permanent_zipcode ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                        </List>

                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 'bold',
                            mb: 2,
                            mt: 3,
                            color: '#6D2323',
                          }}
                        >
                          Residential Address
                        </Typography>
                        <List dense>
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="House/Block/Lot Number"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={
                                      editPerson.residential_houseBlockLotNum ||
                                      ''
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        'residential_houseBlockLotNum',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.residential_houseBlockLotNum ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Street Name"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={
                                      editPerson.residential_streetName || ''
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        'residential_streetName',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.residential_streetName ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Subdivision/Village"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={
                                      editPerson.residential_subdivisionOrVillage ||
                                      ''
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        'residential_subdivisionOrVillage',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.residential_subdivisionOrVillage ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Barangay"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={
                                      editPerson.residential_barangayName || ''
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        'residential_barangayName',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.residential_barangayName ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="City/Municipality"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={
                                      editPerson.residential_cityOrMunicipality ||
                                      ''
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        'residential_cityOrMunicipality',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.residential_cityOrMunicipality ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Province"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={
                                      editPerson.residential_provinceName || ''
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        'residential_provinceName',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.residential_provinceName ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Zip Code"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={editPerson.residential_zipcode || ''}
                                    onChange={(e) =>
                                      handleChange(
                                        'residential_zipcode',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.residential_zipcode ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                        </List>
                      </AccordionDetails>
                    </Accordion>

                    {/* Family Information Section */}
                    <Accordion
                      sx={{
                        mb: 2,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        '&:before': { display: 'none' },
                        border: '1px solid #e0e0e0',
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          backgroundColor: '#f8f9fa',
                          '&:hover': { backgroundColor: '#f0f0f0' },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <FamilyRestroom sx={{ color: '#6D2323', mr: 2 }} />
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: 'bold', color: '#6D2323' }}
                          >
                            Family Information
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 'bold', mb: 2, color: '#6D2323' }}
                        >
                          Spouse Information
                        </Typography>
                        <List dense>
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Full Name"
                              secondary={
                                isEditing ? (
                                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                    <TextField
                                      size="small"
                                      label="First Name"
                                      value={editPerson.spouseFirstName || ''}
                                      onChange={(e) =>
                                        handleChange(
                                          'spouseFirstName',
                                          e.target.value,
                                          true,
                                        )
                                      }
                                      sx={{ flex: 1 }}
                                    />
                                    <TextField
                                      size="small"
                                      label="Middle Name"
                                      value={editPerson.spouseMiddleName || ''}
                                      onChange={(e) =>
                                        handleChange(
                                          'spouseMiddleName',
                                          e.target.value,
                                          true,
                                        )
                                      }
                                      sx={{ flex: 1 }}
                                    />
                                    <TextField
                                      size="small"
                                      label="Last Name"
                                      value={editPerson.spouseLastName || ''}
                                      onChange={(e) =>
                                        handleChange(
                                          'spouseLastName',
                                          e.target.value,
                                          true,
                                        )
                                      }
                                      sx={{ flex: 1 }}
                                    />
                                  </Box>
                                ) : (
                                  `${editPerson.spouseFirstName || ''} ${
                                    editPerson.spouseMiddleName || ''
                                  } ${editPerson.spouseLastName || ''}` ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Occupation"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={editPerson.spouseOccupation || ''}
                                    onChange={(e) =>
                                      handleChange(
                                        'spouseOccupation',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.spouseOccupation || 'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Employer/Business Name"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={
                                      editPerson.spouseEmployerBusinessName ||
                                      ''
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        'spouseEmployerBusinessName',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.spouseEmployerBusinessName ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Business Address"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={
                                      editPerson.spouseBusinessAddress || ''
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        'spouseBusinessAddress',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.spouseBusinessAddress ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Telephone"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={editPerson.spouseTelephone || ''}
                                    onChange={(e) =>
                                      handleChange(
                                        'spouseTelephone',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.spouseTelephone || 'Not specified'
                                )
                              }
                            />
                          </ListItem>
                        </List>

                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 'bold',
                            mb: 2,
                            mt: 3,
                            color: '#6D2323',
                          }}
                        >
                          Parents Information
                        </Typography>
                        <List dense>
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Father's Full Name"
                              secondary={
                                isEditing ? (
                                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                    <TextField
                                      size="small"
                                      label="First Name"
                                      value={editPerson.fatherFirstName || ''}
                                      onChange={(e) =>
                                        handleChange(
                                          'fatherFirstName',
                                          e.target.value,
                                          true,
                                        )
                                      }
                                      sx={{ flex: 1 }}
                                    />
                                    <TextField
                                      size="small"
                                      label="Middle Name"
                                      value={editPerson.fatherMiddleName || ''}
                                      onChange={(e) =>
                                        handleChange(
                                          'fatherMiddleName',
                                          e.target.value,
                                          true,
                                        )
                                      }
                                      sx={{ flex: 1 }}
                                    />
                                    <TextField
                                      size="small"
                                      label="Last Name"
                                      value={editPerson.fatherLastName || ''}
                                      onChange={(e) =>
                                        handleChange(
                                          'fatherLastName',
                                          e.target.value,
                                          true,
                                        )
                                      }
                                      sx={{ flex: 1 }}
                                    />
                                  </Box>
                                ) : (
                                  `${editPerson.fatherFirstName || ''} ${
                                    editPerson.fatherMiddleName || ''
                                  } ${editPerson.fatherLastName || ''}` ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Mother's Maiden Full Name"
                              secondary={
                                isEditing ? (
                                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                    <TextField
                                      size="small"
                                      label="First Name"
                                      value={
                                        editPerson.motherMaidenFirstName || ''
                                      }
                                      onChange={(e) =>
                                        handleChange(
                                          'motherMaidenFirstName',
                                          e.target.value,
                                          true,
                                        )
                                      }
                                      sx={{ flex: 1 }}
                                    />
                                    <TextField
                                      size="small"
                                      label="Middle Name"
                                      value={
                                        editPerson.motherMaidenMiddleName || ''
                                      }
                                      onChange={(e) =>
                                        handleChange(
                                          'motherMaidenMiddleName',
                                          e.target.value,
                                          true,
                                        )
                                      }
                                      sx={{ flex: 1 }}
                                    />
                                    <TextField
                                      size="small"
                                      label="Last Name"
                                      value={
                                        editPerson.motherMaidenLastName || ''
                                      }
                                      onChange={(e) =>
                                        handleChange(
                                          'motherMaidenLastName',
                                          e.target.value,
                                          true,
                                        )
                                      }
                                      sx={{ flex: 1 }}
                                    />
                                  </Box>
                                ) : (
                                  `${editPerson.motherMaidenFirstName || ''} ${
                                    editPerson.motherMaidenMiddleName || ''
                                  } ${editPerson.motherMaidenLastName || ''}` ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                        </List>
                      </AccordionDetails>
                    </Accordion>

                    {/* Educational Background Section */}
                    <Accordion
                      sx={{
                        mb: 2,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        '&:before': { display: 'none' },
                        border: '1px solid #e0e0e0',
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          backgroundColor: '#f8f9fa',
                          '&:hover': { backgroundColor: '#f0f0f0' },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <School sx={{ color: '#6D2323', mr: 2 }} />
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: 'bold', color: '#6D2323' }}
                          >
                            Educational Background
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 'bold', mb: 2, color: '#6D2323' }}
                        >
                          Elementary Education
                        </Typography>
                        <List dense>
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="School Name"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={
                                      editPerson.elementaryNameOfSchool || ''
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        'elementaryNameOfSchool',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.elementaryNameOfSchool ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Degree/Course"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={editPerson.elementaryDegree || ''}
                                    onChange={(e) =>
                                      handleChange(
                                        'elementaryDegree',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.elementaryDegree || 'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Period Attended"
                              secondary={
                                isEditing ? (
                                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                    <TextField
                                      size="small"
                                      label="From"
                                      type="number"
                                      value={
                                        editPerson.elementaryPeriodFrom || ''
                                      }
                                      onChange={(e) =>
                                        handleChange(
                                          'elementaryPeriodFrom',
                                          e.target.value,
                                          true,
                                        )
                                      }
                                      sx={{ flex: 1 }}
                                    />
                                    <TextField
                                      size="small"
                                      label="To"
                                      type="number"
                                      value={
                                        editPerson.elementaryPeriodTo || ''
                                      }
                                      onChange={(e) =>
                                        handleChange(
                                          'elementaryPeriodTo',
                                          e.target.value,
                                          true,
                                        )
                                      }
                                      sx={{ flex: 1 }}
                                    />
                                  </Box>
                                ) : (
                                  `${
                                    editPerson.elementaryPeriodFrom || 'N/A'
                                  } - ${editPerson.elementaryPeriodTo || 'N/A'}`
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Highest Attained"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={
                                      editPerson.elementaryHighestAttained || ''
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        'elementaryHighestAttained',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.elementaryHighestAttained ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Year Graduated"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    type="number"
                                    value={
                                      editPerson.elementaryYearGraduated || ''
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        'elementaryYearGraduated',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.elementaryYearGraduated ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Scholarship/Academic Honors"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    multiline
                                    rows={2}
                                    value={
                                      editPerson.elementaryScholarshipAcademicHonorsReceived ||
                                      ''
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        'elementaryScholarshipAcademicHonorsReceived',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.elementaryScholarshipAcademicHonorsReceived ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                        </List>

                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 'bold',
                            mb: 2,
                            mt: 3,
                            color: '#6D2323',
                          }}
                        >
                          Secondary Education
                        </Typography>
                        <List dense>
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="School Name"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={
                                      editPerson.secondaryNameOfSchool || ''
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        'secondaryNameOfSchool',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.secondaryNameOfSchool ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Degree/Course"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={editPerson.secondaryDegree || ''}
                                    onChange={(e) =>
                                      handleChange(
                                        'secondaryDegree',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.secondaryDegree || 'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Period Attended"
                              secondary={
                                isEditing ? (
                                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                    <TextField
                                      size="small"
                                      label="From"
                                      type="number"
                                      value={
                                        editPerson.secondaryPeriodFrom || ''
                                      }
                                      onChange={(e) =>
                                        handleChange(
                                          'secondaryPeriodFrom',
                                          e.target.value,
                                          true,
                                        )
                                      }
                                      sx={{ flex: 1 }}
                                    />
                                    <TextField
                                      size="small"
                                      label="To"
                                      type="number"
                                      value={editPerson.secondaryPeriodTo || ''}
                                      onChange={(e) =>
                                        handleChange(
                                          'secondaryPeriodTo',
                                          e.target.value,
                                          true,
                                        )
                                      }
                                      sx={{ flex: 1 }}
                                    />
                                  </Box>
                                ) : (
                                  `${editPerson.secondaryPeriodFrom || 'N/A'} - ${
                                    editPerson.secondaryPeriodTo || 'N/A'
                                  }`
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Highest Attained"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    value={
                                      editPerson.secondaryHighestAttained || ''
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        'secondaryHighestAttained',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.secondaryHighestAttained ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Year Graduated"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    type="number"
                                    value={
                                      editPerson.secondaryYearGraduated || ''
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        'secondaryYearGraduated',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.secondaryYearGraduated ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                          <Divider />
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                              primary="Scholarship/Academic Honors"
                              secondary={
                                isEditing ? (
                                  <TextField
                                    size="small"
                                    multiline
                                    rows={2}
                                    value={
                                      editPerson.secondaryScholarshipAcademicHonorsReceived ||
                                      ''
                                    }
                                    onChange={(e) =>
                                      handleChange(
                                        'secondaryScholarshipAcademicHonorsReceived',
                                        e.target.value,
                                        true,
                                      )
                                    }
                                    sx={{ mt: 1, width: '100%' }}
                                  />
                                ) : (
                                  editPerson.secondaryScholarshipAcademicHonorsReceived ||
                                  'Not specified'
                                )
                              }
                            />
                          </ListItem>
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                </Box>

                {/* Bottom Action Bar for Edit/Delete - stays visible while scrolling */}
                <Box
                  sx={{
                    borderTop: `1px solid ${alpha(settings.primaryColor || '#6d2323', 0.2)}`,
                    backgroundColor: '#FFFFFF',
                    px: 3,
                    py: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 10,
                    flexShrink: 0,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {!isEditing ? (
                      <>
                        <Button
                          onClick={() => handleDelete(editPerson.id)}
                          variant="outlined"
                          startIcon={<DeleteIcon />}
                          sx={{
                            borderColor:
                              settings.deleteButtonColor ||
                              settings.primaryColor ||
                              '#6d2323',
                            color:
                              settings.deleteButtonColor ||
                              settings.primaryColor ||
                              '#6d2323',
                            minWidth: '120px',
                            '&:hover': {
                              backgroundColor: alpha(
                                settings.deleteButtonColor ||
                                  settings.primaryColor ||
                                  '#6d2323',
                                0.1,
                              ),
                              borderColor:
                                settings.deleteButtonHoverColor ||
                                settings.hoverColor ||
                                '#a31d1d',
                              color:
                                settings.deleteButtonHoverColor ||
                                settings.hoverColor ||
                                '#a31d1d',
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
                            backgroundColor:
                              settings.updateButtonColor ||
                              settings.primaryColor ||
                              '#6d2323',
                            color: settings.accentColor || '#FEF9E1',
                            minWidth: '120px',
                            '&:hover': {
                              backgroundColor:
                                settings.updateButtonHoverColor ||
                                settings.hoverColor ||
                                '#a31d1d',
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
                            borderColor:
                              settings.cancelButtonColor || '#6c757d',
                            color: settings.cancelButtonColor || '#6c757d',
                            minWidth: '120px',
                            '&:hover': {
                              backgroundColor: alpha(
                                settings.cancelButtonColor || '#6c757d',
                                0.1,
                              ),
                              borderColor:
                                settings.cancelButtonHoverColor || '#5a6268',
                              color:
                                settings.cancelButtonHoverColor || '#5a6268',
                            },
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleUpdate}
                          variant="contained"
                          startIcon={<SaveIcon />}
                          disabled={!hasChanges()}
                          sx={{
                            backgroundColor: hasChanges()
                              ? settings.updateButtonColor ||
                                settings.primaryColor ||
                                '#6d2323'
                              : alpha(settings.primaryColor || '#6d2323', 0.5),
                            color: settings.accentColor || '#FEF9E1',
                            minWidth: '120px',
                            '&:hover': {
                              backgroundColor: hasChanges()
                                ? settings.updateButtonHoverColor ||
                                  settings.hoverColor ||
                                  '#a31d1d'
                                : alpha(
                                    settings.primaryColor || '#6d2323',
                                    0.5,
                                  ),
                            },
                            '&:disabled': {
                              color: alpha(
                                settings.accentColor || '#FEF9E1',
                                0.5,
                              ),
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