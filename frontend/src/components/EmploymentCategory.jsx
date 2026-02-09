import API_BASE_URL from '../apiConfig';
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useDeferredValue,
} from 'react';
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
  Fade,
  Divider,
  Backdrop,
  styled,
  alpha,
  Avatar,
  Tooltip,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  ListSubheader,
  ListItemIcon,
  TablePagination,
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
  Category as CategoryIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh,
  Work as WorkIcon,
  Circle,
} from '@mui/icons-material';

import ReorderIcon from '@mui/icons-material/Reorder';
import LoadingOverlay from './LoadingOverlay';
import SuccessfulOverlay from './SuccessfulOverlay';
import { useSystemSettings } from '../hooks/useSystemSettings';

// Helper function to convert hex to rgb
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
        result[3],
        16,
      )}`
    : '109, 35, 35';
};

// Professional styled components
const GlassCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  backdropFilter: 'blur(10px)',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-4px)',
  },
}));

const ProfessionalButton = styled(Button)(
  ({ theme, variant, color = 'primary' }) => ({
    borderRadius: 12,
    fontWeight: 600,
    padding: '12px 24px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    textTransform: 'none',
    fontSize: '0.95rem',
    letterSpacing: '0.025em',
    boxShadow:
      variant === 'contained' ? '0 4px 14px rgba(254, 249, 225, 0.25)' : 'none',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow:
        variant === 'contained'
          ? '0 6px 20px rgba(254, 249, 225, 0.35)'
          : 'none',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  }),
);

const ModernTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    '&:hover': {
      transform: 'translateY(-1px)',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
    },
    '&.Mui-focused': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 20px rgba(254, 249, 225, 0.25)',
      backgroundColor: 'rgba(255, 255, 255, 1)',
    },
  },
  '& .MuiInputLabel-root': {
    fontWeight: 500,
  },
}));

const ModernSelect = styled(Select)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    '&:hover': {
      transform: 'translateY(-1px)',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
    },
    '&.Mui-focused': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 20px rgba(254, 249, 225, 0.25)',
      backgroundColor: 'rgba(255, 255, 255, 1)',
    },
  },
}));

// Enhanced Auth header helper
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
  accentColor = '#6D2323',
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
          startAdornment: <PersonIcon sx={{ color: accentColor, mr: 1 }} />,
          endAdornment: (
            <IconButton
              onClick={dropdownDisabled ? undefined : handleDropdownClick}
              size="small"
              disabled={dropdownDisabled}
              sx={{ color: accentColor }}
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
                      backgroundColor: '#f5f5f5',
                    },
                  }}
                >
                  <ListItemText
                    primary={employee.name}
                    secondary={`#${employee.employeeNumber}`}
                    primaryTypographyProps={{ fontWeight: 'bold' }}
                    secondaryTypographyProps={{ color: '#666' }}
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

const EmploymentCategoryManagement = () => {
  const [employmentCategories, setEmploymentCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);

  useEffect(() => {
    setPage(0);
  }, [deferredSearchTerm]);
  const [editRecord, setEditRecord] = useState(null);
  const [originalRecord, setOriginalRecord] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newRecord, setNewRecord] = useState({
    employeeNumber: '',
    employmentCategory: 0,
    customCategory: '',
  });
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(24);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEditEmployee, setSelectedEditEmployee] = useState(null);
  const [errors, setErrors] = useState({});

  const { settings } = useSystemSettings();

  // Get colors from system settings
  const primaryColor = settings.accentColor || '#FEF9E1';
  const secondaryColor = settings.backgroundColor || '#FFF8E7';
  const accentColor = settings.primaryColor || '#6d2323';
  const accentDark = settings.secondaryColor || '#8B3333';
  const textPrimaryColor = settings.textPrimaryColor || '#6d2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';
  const hoverColor = settings.hoverColor || '#6D2323';
  const grayColor = '#6c757d';

  // COLOR LEGEND: Map each ID to a unique professional color
  const getCategoryStyle = (catId) => {
    switch (parseInt(catId)) {
      case 0:
        return '#F57C00'; // JO Graduate
      case 1:
        return '#E64A19'; // JO UnderGrad
      case 2:
        return '#2E7D32'; // Regular Non-Teaching
      case 3:
        return '#1565C0'; // Regular Teaching (30Hrs)
      case 4:
        return '#7B1FA2'; // Regular Designated (40Hrs)
      case 5:
        return '#00796B'; // Other (Custom)
      default:
        return '#757575';
    }
  };

  useEffect(() => {
    fetchEmploymentCategories();
  }, []);

  // Fetch all employment categories
  const fetchEmploymentCategories = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`,
        getAuthHeaders(),
      );
      setEmploymentCategories(response.data);
    } catch (error) {
      console.error('Error fetching employment categories:', error);
      showSnackbar('Failed to fetch employment categories.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Create new employment category
  const handleCreate = async () => {
    if (!newRecord.employeeNumber) {
      showSnackbar('Please select an employee', 'error');
      setErrors({ employeeNumber: 'Employee selection is required' });
      return;
    }

    if (
      newRecord.employmentCategory === 5 &&
      !newRecord.customCategory.trim()
    ) {
      showSnackbar('Please enter a custom category description', 'error');
      setErrors({ customCategory: 'Custom category is required for "Other"' });
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`,
        newRecord,
        getAuthHeaders(),
      );
      setNewRecord({
        employeeNumber: '',
        employmentCategory: 0,
        customCategory: '',
      });
      setSelectedEmployee(null);
      setErrors({});
      setTimeout(() => {
        setLoading(false);
        setSuccessAction('adding');
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2000);
      }, 300);
      fetchEmploymentCategories();
    } catch (error) {
      console.error('Error creating employment category:', error);
      const errorMsg =
        error.response?.data?.error || 'Failed to create employment category.';
      showSnackbar(errorMsg, 'error');
      setLoading(false);
    }
  };

  // Update employment category
  const handleUpdate = async () => {
    if (!editRecord || !editRecord.employeeNumber) {
      showSnackbar('Employee number is required.', 'error');
      return;
    }

    if (
      editRecord.employmentCategory === 5 &&
      !editRecord.customCategory?.trim()
    ) {
      showSnackbar('Please enter a custom category description', 'error');
      return;
    }

    try {
      await axios.put(
        `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${editRecord.id}`,
        {
          employeeNumber: editRecord.employeeNumber,
          employmentCategory: editRecord.employmentCategory,
          customCategory: editRecord.customCategory || '',
        },
        getAuthHeaders(),
      );
      setEditRecord(null);
      setOriginalRecord(null);
      setSelectedEditEmployee(null);
      setIsEditing(false);
      fetchEmploymentCategories();
      setSuccessAction('edit');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch (error) {
      console.error('Error updating employment category:', error);
      const errorMsg =
        error.response?.data?.error || 'Failed to update employment category.';
      showSnackbar(errorMsg, 'error');
    }
  };

  // Delete employment category
  const handleDelete = async (id) => {
    try {
      await axios.delete(
        `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${id}`,
        getAuthHeaders(),
      );
      setEditRecord(null);
      setOriginalRecord(null);
      setSelectedEditEmployee(null);
      setIsEditing(false);
      fetchEmploymentCategories();
      setSuccessAction('delete');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch (error) {
      console.error('Error deleting employment category:', error);
      showSnackbar('Failed to delete employment category.', 'error');
    }
  };

  const handleChange = (field, value) => {
    setNewRecord({ ...newRecord, [field]: value });
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleEmployeeChange = (employeeNumber) => {
    setNewRecord({ ...newRecord, employeeNumber });
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.employeeNumber;
      return newErrors;
    });
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
  };

  const handleEditEmployeeChange = (employeeNumber) => {
    setEditRecord({ ...editRecord, employeeNumber });
  };

  const handleEditEmployeeSelect = (employee) => {
    setSelectedEditEmployee(employee);
  };

  const handleOpenModal = async (record) => {
    setEditRecord({ ...record });
    setOriginalRecord({ ...record });

    // Fetch employee details
    try {
      const response = await axios.get(
        `${API_BASE_URL}/Remittance/employees/${record.employeeNumber}`,
        getAuthHeaders(),
      );
      setSelectedEditEmployee({
        name: response.data.name,
        employeeNumber: record.employeeNumber,
      });
    } catch (error) {
      setSelectedEditEmployee({
        name: record.employeeName || 'Unknown',
        employeeNumber: record.employeeNumber,
      });
    }
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditRecord({ ...originalRecord });
    setSelectedEditEmployee({
      name: originalRecord.employeeName || 'Unknown',
      employeeNumber: originalRecord.employeeNumber,
    });
    setIsEditing(false);
  };

  const handleCloseModal = () => {
    setEditRecord(null);
    setOriginalRecord(null);
    setSelectedEditEmployee(null);
    setIsEditing(false);
  };

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const hasChanges = () => {
    if (!editRecord || !originalRecord) return false;
    return (
      editRecord.employeeNumber !== originalRecord.employeeNumber ||
      editRecord.employmentCategory !== originalRecord.employmentCategory ||
      editRecord.customCategory !== originalRecord.customCategory
    );
  };

  const filteredData = useMemo(() => {
    const search = (deferredSearchTerm || '').toString().toLowerCase().trim();
    if (!search) return employmentCategories;
    return employmentCategories.filter((record) => {
      const employeeNumber = record.employeeNumber?.toString() || '';
      const employeeName = record.employeeName?.toLowerCase() || '';
      const categoryLabel = record.categoryLabel?.toLowerCase() || '';
      return (
        employeeNumber.includes(search) ||
        employeeName.includes(search) ||
        categoryLabel.includes(search)
      );
    });
  }, [employmentCategories, deferredSearchTerm]);

  const pagedData = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  return (
    <Box
      sx={{
        py: 4,
        mt: -5,
        width: '1600px',
        mx: 'auto',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 6 }}>
        {/* Header */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }}>
            <GlassCard
              sx={{
                background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
                boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`,
                border: `1px solid ${alpha(accentColor, 0.1)}`,
                '&:hover': {
                  boxShadow: `0 12px 48px ${alpha(accentColor, 0.15)}`,
                },
              }}
            >
              <Box
                sx={{
                  p: 5,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  color: textPrimaryColor,
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
                    background: `radial-gradient(circle, ${alpha(
                      accentColor,
                      0.1,
                    )} 0%, ${alpha(accentColor, 0)} 70%)`,
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -30,
                    left: '30%',
                    width: 150,
                    height: 150,
                    background: `radial-gradient(circle, ${alpha(
                      accentColor,
                      0.08,
                    )} 0%, ${alpha(accentColor, 0)} 70%)`,
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
                        bgcolor: alpha(accentColor, 0.15),
                        mr: 4,
                        width: 64,
                        height: 64,
                        boxShadow: `0 8px 24px ${alpha(accentColor, 0.15)}`,
                      }}
                    >
                      <CategoryIcon
                        sx={{ color: textPrimaryColor, fontSize: 32 }}
                      />
                    </Avatar>
                    <Box>
                      <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                          fontWeight: 700,
                          mb: 1,
                          lineHeight: 1.2,
                          color: textPrimaryColor,
                        }}
                      >
                        Employment Category Management
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          opacity: 0.8,
                          fontWeight: 400,
                          color: accentDark,
                        }}
                      >
                        Manage employee employment categories
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
              Processing employment category...
            </Typography>
          </Box>
        </Backdrop>

        {/* Main Content */}
        <Grid container spacing={4}>
          {/* Add New Category Section */}
          <Grid item xs={12} lg={6}>
            <Fade in timeout={700}>
              <GlassCard
                sx={{
                  height: 'calc(100vh - 200px)',
                  display: 'flex',
                  flexDirection: 'column',
                  border: `1px solid ${alpha(accentColor, 0.1)}`,
                }}
              >
                <Box
                  sx={{
                    p: 4,
                    position: 'sticky',
                    top: 0,
                    zIndex: 1200,
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    color: accentColor,
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <CategoryIcon sx={{ fontSize: '1.8rem', mr: 2 }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      Add New Category
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                      Assign employment category to employee
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
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 600,
                        mb: 2,
                        color: accentColor,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <PersonIcon sx={{ mr: 2, fontSize: 24 }} />
                      Employee Information{' '}
                      <span
                        style={{
                          marginLeft: '12px',
                          fontWeight: 400,
                          opacity: 0.7,
                          color: 'red',
                        }}
                      >
                        *
                      </span>
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500, mb: 1, color: accentColor }}
                        >
                          Search Employee
                        </Typography>
                        <EmployeeAutocomplete
                          value={newRecord.employeeNumber}
                          onChange={handleEmployeeChange}
                          selectedEmployee={selectedEmployee}
                          onEmployeeSelect={handleEmployeeSelect}
                          placeholder="Search and select employee..."
                          required
                          error={!!errors.employeeNumber}
                          helperText={errors.employeeNumber || ''}
                          accentColor={accentColor}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500, mb: 1, color: accentColor }}
                        >
                          Selected Employee
                        </Typography>
                        {selectedEmployee ? (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              backgroundColor: 'rgba(254, 249, 225, 0.8)',
                              border: '1px solid rgba(109, 35, 35, 0.3)',
                              borderRadius: 2,
                              paddingLeft: '10px',
                              gap: 1.5,
                            }}
                          >
                            <PersonIcon
                              sx={{ color: accentColor, fontSize: 20 }}
                            />
                            <Box
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                flex: 1,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 'bold',
                                  color: accentColor,
                                  fontSize: '14px',
                                  lineHeight: 1.2,
                                }}
                              >
                                {selectedEmployee.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: grayColor,
                                  fontSize: '12px',
                                  lineHeight: 1.2,
                                }}
                              >
                                ID: {selectedEmployee.employeeNumber}
                              </Typography>
                            </Box>
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: 'rgba(0, 0, 0, 0.05)',
                              border: '2px dashed rgba(109, 35, 35, 0.3)',
                              borderRadius: 2,
                              minHeight: '30px',
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                color: grayColor,
                                fontStyle: 'italic',
                                fontSize: '14px',
                              }}
                            >
                              No employee selected
                            </Typography>
                          </Box>
                        )}
                      </Grid>
                    </Grid>
                  </Box>

                  <Divider sx={{ my: 3, borderColor: 'rgba(109,35,35,0.1)' }} />

                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      mb: 3,
                      color: accentColor,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <WorkIcon sx={{ mr: 2, fontSize: 24 }} />
                    Employment Category
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 500, mb: 1, color: accentColor }}
                      >
                        Category Type
                      </Typography>
                      <FormControl fullWidth size="small">
                        <ModernSelect
                          value={newRecord.employmentCategory}
                          onChange={(e) =>
                            handleChange('employmentCategory', e.target.value)
                          }
                          sx={{
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: alpha(accentColor, 0.3),
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: alpha(accentColor, 0.5),
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: accentColor,
                            },
                          }}
                        >
                          <ListSubheader>Job Order (JO)</ListSubheader>
                          <MenuItem value={0}>
                            <ListItemIcon sx={{ minWidth: 30 }}>
                              <Circle sx={{ fontSize: 12, color: '#F57C00' }} />
                            </ListItemIcon>
                            Graduated
                          </MenuItem>
                          <MenuItem value={1}>
                            <ListItemIcon sx={{ minWidth: 30 }}>
                              <Circle sx={{ fontSize: 12, color: '#E64A19' }} />
                            </ListItemIcon>
                            UnderGrad
                          </MenuItem>

                          <ListSubheader>Regular</ListSubheader>
                          <MenuItem value={2}>
                            <ListItemIcon sx={{ minWidth: 30 }}>
                              <Circle sx={{ fontSize: 12, color: '#2E7D32' }} />
                            </ListItemIcon>
                            Non-Teaching
                          </MenuItem>
                          <MenuItem value={3}>
                            <ListItemIcon sx={{ minWidth: 30 }}>
                              <Circle sx={{ fontSize: 12, color: '#1565C0' }} />
                            </ListItemIcon>
                            Teaching (30Hrs)
                          </MenuItem>
                          <MenuItem value={4}>
                            <ListItemIcon sx={{ minWidth: 30 }}>
                              <Circle sx={{ fontSize: 12, color: '#7B1FA2' }} />
                            </ListItemIcon>
                            Designated (40Hrs)
                          </MenuItem>

                          <ListSubheader>Custom</ListSubheader>
                          <MenuItem value={5}>
                            <ListItemIcon sx={{ minWidth: 30 }}>
                              <Circle sx={{ fontSize: 12, color: '#00796B' }} />
                            </ListItemIcon>
                            Other (specify)
                          </MenuItem>
                        </ModernSelect>
                      </FormControl>
                    </Grid>

                    {/* Custom Category Field - Only shows when "Other" is selected */}
                    {newRecord.employmentCategory === 5 && (
                      <Grid item xs={12}>
                        <Fade in>
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 500,
                                mb: 1,
                                color: accentColor,
                              }}
                            >
                              Custom Category Description{' '}
                              <span style={{ color: 'red' }}>*</span>
                            </Typography>
                            <ModernTextField
                              value={newRecord.customCategory}
                              onChange={(e) =>
                                handleChange('customCategory', e.target.value)
                              }
                              placeholder="e.g., Part-timer, OJT, Consultant..."
                              fullWidth
                              size="small"
                              error={!!errors.customCategory}
                              helperText={
                                errors.customCategory || 'Max 100 characters'
                              }
                              inputProps={{ maxLength: 100 }}
                            />
                          </Box>
                        </Fade>
                      </Grid>
                    )}
                  </Grid>

                  <Box sx={{ mt: 'auto', pt: 3 }}>
                    <ProfessionalButton
                      onClick={handleCreate}
                      variant="contained"
                      startIcon={<AddIcon />}
                      fullWidth
                      sx={{
                        backgroundColor: accentColor,
                        color: primaryColor,
                        py: 1.5,
                        fontSize: '1rem',
                        '&:hover': {
                          backgroundColor: accentDark,
                        },
                      }}
                    >
                      Add Employment Category
                    </ProfessionalButton>
                  </Box>
                </Box>
              </GlassCard>
            </Fade>
          </Grid>

          {/* Records Section */}
          <Grid item xs={12} lg={6}>
            <Fade in timeout={900}>
              <GlassCard
                sx={{
                  height: 'calc(100vh - 200px)',
                  display: 'flex',
                  flexDirection: 'column',
                  border: `1px solid ${alpha(accentColor, 0.1)}`,
                  overflow: 'visible',
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
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ReorderIcon sx={{ fontSize: '1.8rem', mr: 2 }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        Employment Category Records
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
                        borderColor: 'rgba(109, 35, 35, 0.5)',
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
                  }}
                >
                  <Box sx={{ mb: 3 }}>
                    <ModernTextField
                      size="small"
                      variant="outlined"
                      placeholder="Search by Employee ID, Name, or Category"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
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
                      <Grid container spacing={2}>
                        {pagedData.map((record) => (
                          <Grid item xs={12} sm={6} md={4} key={record.id}>
                            <Card
                              onClick={() => handleOpenModal(record)}
                              sx={{
                                cursor: 'pointer',
                                border: '1px solid rgba(109, 35, 35, 0.1)',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                '&:hover': {
                                  borderColor: accentColor,
                                  transform: 'translateY(-2px)',
                                  transition: 'all 0.2s ease',
                                  boxShadow: '0 4px 8px rgba(109,35,35,0.15)',
                                },
                              }}
                            >
                              <CardContent
                                sx={{
                                  p: 2,
                                  flexGrow: 1,
                                  display: 'flex',
                                  flexDirection: 'column',
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    mb: 1,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: accentColor,
                                      px: 0.5,
                                      py: 0.2,
                                      borderRadius: 0.5,
                                      fontSize: '0.7rem',
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    {record.employeeNumber}
                                  </Typography>
                                </Box>

                                <Typography
                                  variant="body2"
                                  fontWeight="bold"
                                  color="#333"
                                  mb={0.5}
                                  noWrap
                                >
                                  {record.employeeName || 'Loading...'}
                                </Typography>

                                <Box
                                  sx={{
                                    display: 'flex',
                                    justifyContent: 'flex-start',
                                    mt: 1,
                                  }}
                                >
                                  <Chip
                                    label={record.categoryLabel}
                                    variant="outlined"
                                    size="small"
                                    sx={{
                                      color: getCategoryStyle(
                                        record.employmentCategory,
                                      ),
                                      borderColor: getCategoryStyle(
                                        record.employmentCategory,
                                      ),
                                      fontWeight: '600',
                                      fontSize: '0.75rem',
                                      '&:hover': {
                                        backgroundColor: alpha(
                                          getCategoryStyle(
                                            record.employmentCategory,
                                          ),
                                          0.04,
                                        ),
                                      },
                                    }}
                                  />
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      pagedData.map((record) => (
                        <Card
                          key={record.id}
                          onClick={() => handleOpenModal(record)}
                          sx={{
                            cursor: 'pointer',
                            border: '1px solid rgba(109, 35, 35, 0.1)',
                            mb: 1,
                            '&:hover': {
                              borderColor: accentColor,
                              backgroundColor: 'rgba(254, 249, 225, 0.3)',
                            },
                          }}
                        >
                          <Box sx={{ p: 2 }}>
                            <Box
                              sx={{ display: 'flex', alignItems: 'flex-start' }}
                            >
                              <Box sx={{ flexGrow: 1 }}>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    mb: 0.5,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: accentColor,
                                      px: 0.5,
                                      py: 0.2,
                                      borderRadius: 0.5,
                                      fontSize: '0.7rem',
                                      fontWeight: 'bold',
                                      mr: 1,
                                    }}
                                  >
                                    {record.employeeNumber}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    fontWeight="bold"
                                    color="#333"
                                  >
                                    {record.employeeName || 'Loading...'}
                                  </Typography>
                                </Box>

                                <Chip
                                  label={record.categoryLabel}
                                  variant="outlined"
                                  size="small"
                                  sx={{
                                    color: getCategoryStyle(
                                      record.employmentCategory,
                                    ),
                                    borderColor: getCategoryStyle(
                                      record.employmentCategory,
                                    ),
                                    fontWeight: '600',
                                    fontSize: '0.75rem',
                                    '&:hover': {
                                      backgroundColor: alpha(
                                        getCategoryStyle(
                                          record.employmentCategory,
                                        ),
                                        0.04,
                                      ),
                                    },
                                  }}
                                />
                              </Box>
                            </Box>
                          </Box>
                        </Card>
                      ))
                    )}

                    {/* Sticky pagination so "Rows per page" is always visible while scrolling */}
                    <Box
                      sx={{
                        position: 'sticky',
                        bottom: 0,
                        zIndex: 5,
                        mt: 2,
                        pt: 1,
                        pb: 1,
                        backgroundColor: '#fff',
                        borderTop: `1px solid ${alpha(accentColor, 0.12)}`,
                        boxShadow: '0 -8px 18px rgba(0,0,0,0.06)',
                      }}
                    >
                      <TablePagination
                        component="div"
                        count={filteredData.length}
                        page={page}
                        onPageChange={(e, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => {
                          setRowsPerPage(parseInt(e.target.value, 10));
                          setPage(0);
                        }}
                        rowsPerPageOptions={[12, 24, 48, 96]}
                      />
                    </Box>

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
                </Box>
              </GlassCard>
            </Fade>
          </Grid>
        </Grid>

        {/* Edit Modal */}
        <Modal
          open={!!editRecord}
          onClose={handleCloseModal}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <GlassCard
            sx={{
              width: '90%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {editRecord && (
              <>
                <Box
                  sx={{
                    p: 4,
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    color: accentColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {isEditing
                      ? 'Edit Employment Category'
                      : 'Employment Category Details'}
                  </Typography>
                  <IconButton
                    onClick={handleCloseModal}
                    sx={{ color: accentColor }}
                  >
                    <Close />
                  </IconButton>
                </Box>

                <Box sx={{ p: 4 }}>
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 600,
                        mb: 2,
                        color: accentColor,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <PersonIcon sx={{ mr: 2, fontSize: 24 }} />
                      Employee Information
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500, mb: 1, color: accentColor }}
                        >
                          Search Employee
                        </Typography>
                        <EmployeeAutocomplete
                          value={editRecord?.employeeNumber || ''}
                          onChange={
                            isEditing ? handleEditEmployeeChange : () => {}
                          }
                          selectedEmployee={selectedEditEmployee}
                          onEmployeeSelect={
                            isEditing ? handleEditEmployeeSelect : () => {}
                          }
                          placeholder="Search and select employee..."
                          required
                          disabled={!isEditing}
                          dropdownDisabled={!isEditing}
                          accentColor={accentColor}
                        />
                        {!isEditing && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: grayColor,
                              fontStyle: 'italic',
                              display: 'block',
                              mt: 0.5,
                            }}
                          >
                            Contact administrator for assistance.
                          </Typography>
                        )}
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500, mb: 1, color: accentColor }}
                        >
                          Selected Employee
                        </Typography>
                        {selectedEditEmployee ? (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              backgroundColor: 'rgba(254, 249, 225, 0.8)',
                              border: '1px solid rgba(109, 35, 35, 0.3)',
                              borderRadius: 2,
                              padding: '12px',
                              gap: 1.5,
                            }}
                          >
                            <PersonIcon
                              sx={{ color: accentColor, fontSize: 20 }}
                            />
                            <Box
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                flex: 1,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 'bold',
                                  color: accentColor,
                                  fontSize: '14px',
                                  lineHeight: 1.2,
                                }}
                              >
                                {selectedEditEmployee.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: grayColor,
                                  fontSize: '12px',
                                  lineHeight: 1.2,
                                }}
                              >
                                ID: {selectedEditEmployee.employeeNumber}
                              </Typography>
                            </Box>
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: 'rgba(0, 0, 0, 0.05)',
                              border: '2px dashed rgba(109, 35, 35, 0.3)',
                              borderRadius: 2,
                              padding: '12px',
                              minHeight: '48px',
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                color: grayColor,
                                fontStyle: 'italic',
                                fontSize: '14px',
                              }}
                            >
                              No employee selected
                            </Typography>
                          </Box>
                        )}
                      </Grid>
                    </Grid>
                  </Box>

                  <Divider sx={{ my: 3, borderColor: 'rgba(109,35,35,0.1)' }} />

                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      mb: 3,
                      color: accentColor,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <WorkIcon sx={{ mr: 2, fontSize: 24 }} />
                    Employment Category
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      {isEditing ? (
                        <>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 500, mb: 1, color: accentColor }}
                          >
                            Category Type
                          </Typography>
                          <FormControl fullWidth size="small">
                            <ModernSelect
                              value={editRecord.employmentCategory}
                              onChange={(e) =>
                                setEditRecord({
                                  ...editRecord,
                                  employmentCategory: e.target.value,
                                  customCategory:
                                    e.target.value === 5
                                      ? editRecord.customCategory
                                      : '',
                                })
                              }
                              sx={{
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: alpha(accentColor, 0.3),
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: alpha(accentColor, 0.5),
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline':
                                  {
                                    borderColor: accentColor,
                                  },
                              }}
                            >
                              <ListSubheader>Job Order (JO)</ListSubheader>
                              <MenuItem value={0}>
                                <ListItemIcon sx={{ minWidth: 30 }}>
                                  <Circle
                                    sx={{ fontSize: 12, color: '#F57C00' }}
                                  />
                                </ListItemIcon>
                                Graduated
                              </MenuItem>
                              <MenuItem value={1}>
                                <ListItemIcon sx={{ minWidth: 30 }}>
                                  <Circle
                                    sx={{ fontSize: 12, color: '#E64A19' }}
                                  />
                                </ListItemIcon>
                                UnderGrad
                              </MenuItem>

                              <ListSubheader>Regular</ListSubheader>
                              <MenuItem value={2}>
                                <ListItemIcon sx={{ minWidth: 30 }}>
                                  <Circle
                                    sx={{ fontSize: 12, color: '#2E7D32' }}
                                  />
                                </ListItemIcon>
                                Non-Teaching
                              </MenuItem>
                              <MenuItem value={3}>
                                <ListItemIcon sx={{ minWidth: 30 }}>
                                  <Circle
                                    sx={{ fontSize: 12, color: '#1565C0' }}
                                  />
                                </ListItemIcon>
                                Teaching (30Hrs)
                              </MenuItem>
                              <MenuItem value={4}>
                                <ListItemIcon sx={{ minWidth: 30 }}>
                                  <Circle
                                    sx={{ fontSize: 12, color: '#7B1FA2' }}
                                  />
                                </ListItemIcon>
                                Designated (40Hrs)
                              </MenuItem>

                              <ListSubheader>Custom</ListSubheader>
                              <MenuItem value={5}>
                                <ListItemIcon sx={{ minWidth: 30 }}>
                                  <Circle
                                    sx={{ fontSize: 12, color: '#00796B' }}
                                  />
                                </ListItemIcon>
                                Other (specify)
                              </MenuItem>
                            </ModernSelect>
                          </FormControl>
                        </>
                      ) : (
                        <Box
                          sx={{
                            p: 1.5,
                            bgcolor: 'transparent',
                            borderRadius: 1,
                            border: `1px solid ${getCategoryStyle(editRecord.employmentCategory)}`,
                            display: 'flex',
                            alignItems: 'center',
                            color: getCategoryStyle(
                              editRecord.employmentCategory,
                            ),
                          }}
                        >
                          <WorkIcon sx={{ mr: 1 }} />
                          <Typography variant="body2" fontWeight="bold">
                            {editRecord.categoryLabel}
                          </Typography>
                        </Box>
                      )}
                    </Grid>

                    {/* Custom Category Field in Edit Mode */}
                    {isEditing && editRecord.employmentCategory === 5 && (
                      <Grid item xs={12}>
                        <Fade in>
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 500,
                                mb: 1,
                                color: accentColor,
                              }}
                            >
                              Custom Category Description{' '}
                              <span style={{ color: 'red' }}>*</span>
                            </Typography>
                            <ModernTextField
                              value={editRecord.customCategory || ''}
                              onChange={(e) =>
                                setEditRecord({
                                  ...editRecord,
                                  customCategory: e.target.value,
                                })
                              }
                              placeholder="e.g., Part-timer, OJT, Consultant..."
                              fullWidth
                              size="small"
                              helperText="Max 100 characters"
                              inputProps={{ maxLength: 100 }}
                            />
                          </Box>
                        </Fade>
                      </Grid>
                    )}
                  </Grid>

                  <Box
                    sx={{
                      display: 'flex',
                      gap: 2,
                      mt: 4,
                      justifyContent: 'flex-end',
                    }}
                  >
                    {!isEditing ? (
                      <>
                        <ProfessionalButton
                          onClick={() => handleDelete(editRecord.id)}
                          variant="outlined"
                          startIcon={<DeleteIcon />}
                          sx={{
                            color: '#d32f2f',
                            borderColor: '#d32f2f',
                            '&:hover': {
                              backgroundColor: '#d32f2f',
                              color: '#fff',
                            },
                          }}
                        >
                          Delete
                        </ProfessionalButton>
                        <ProfessionalButton
                          onClick={handleStartEdit}
                          variant="contained"
                          startIcon={<EditIcon />}
                          sx={{
                            backgroundColor: accentColor,
                            color: primaryColor,
                            '&:hover': { backgroundColor: accentDark },
                          }}
                        >
                          Edit
                        </ProfessionalButton>
                      </>
                    ) : (
                      <>
                        <ProfessionalButton
                          onClick={handleCancelEdit}
                          variant="outlined"
                          startIcon={<CancelIcon />}
                          sx={{
                            color: grayColor,
                            borderColor: grayColor,
                            '&:hover': {
                              backgroundColor: 'rgba(108, 117, 125, 0.1)',
                            },
                          }}
                        >
                          Cancel
                        </ProfessionalButton>
                        <ProfessionalButton
                          onClick={handleUpdate}
                          variant="contained"
                          startIcon={<SaveIcon />}
                          disabled={!hasChanges()}
                          sx={{
                            backgroundColor: hasChanges()
                              ? accentColor
                              : grayColor,
                            color: primaryColor,
                            '&:hover': {
                              backgroundColor: hasChanges()
                                ? accentDark
                                : grayColor,
                            },
                            '&:disabled': {
                              backgroundColor: grayColor,
                              color: '#999',
                            },
                          }}
                        >
                          Save
                        </ProfessionalButton>
                      </>
                    )}
                  </Box>
                </Box>
              </>
            )}
          </GlassCard>
        </Modal>

        <SuccessfulOverlay
          open={successOpen}
          action={successAction}
          onClose={() => setSuccessOpen(false)}
        />

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

export default EmploymentCategoryManagement;


