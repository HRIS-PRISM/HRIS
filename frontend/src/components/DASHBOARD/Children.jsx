import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getAuthHeaders } from '../../utils/auth';
import { useSocket } from '../../contexts/SocketContext';
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
  Avatar,
  Tooltip,
  alpha,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
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
  ChildCare as ChildCareIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Group as GroupIcon,
  FamilyRestroom as FamilyRestroomIcon,
  Refresh,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
} from '@mui/icons-material';

import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import AccessDenied from '../AccessDenied';
import { useNavigate } from 'react-router-dom';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import {
  useCRUDButtonStyles,
  useCRUDButtonStylesOutlined,
} from '../../hooks/useCRUDButtonStyles';
import usePageAccess from '../../hooks/usePageAccess';
import {
  createThemedCard,
  createThemedButton,
  createThemedTextField,
} from '../../utils/theme';

// Stable themed components
const ThemedCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== 'settings',
})(({ settings = {} }) => createThemedCard(settings));

const ThemedButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'settings',
})(({ settings = {}, variant = 'contained' }) =>
  createThemedButton(settings, variant),
);

const ThemedTextField = styled(TextField, {
  shouldForwardProp: (prop) => prop !== 'settings',
})(({ settings = {} }) => createThemedTextField(settings));

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
      <ThemedTextField
        settings={settings}
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

const Children = () => {
  const { socket, connected } = useSocket();
  const refreshChildrenRef = useRef(null);
  const { settings } = useSystemSettings();

  const [children, setChildren] = useState([]);
  const [employeeNames, setEmployeeNames] = useState({});
  const [newChild, setNewChild] = useState({
    childrenFirstName: '',
    childrenMiddleName: '',
    childrenLastName: '',
    childrenNameExtension: '',
    dateOfBirth: '',
    person_id: '',
  });
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Modal States
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  // Split View Modal State
  const [employeeChildrenModal, setEmployeeChildrenModal] = useState({
    open: false,
    employeeId: null,
    employeeName: '',
    children: [],
  });
  
  // Detail View State (Right Side)
  const [selectedChild, setSelectedChild] = useState(null);
  const [tempChildData, setTempChildData] = useState(null);
  const [isEditingChild, setIsEditingChild] = useState(false);

  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('');
  const [errors, setErrors] = useState({});
  const [viewMode, setViewMode] = useState('grid');

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const navigate = useNavigate();

  // Stable themed components
  const GlassCard = ThemedCard;
  const ProfessionalButton = ThemedButton;
  const ModernTextField = ThemedTextField;

  // Colors
  const primaryColor = settings.accentColor || '#FEF9E1';
  const secondaryColor = settings.backgroundColor || '#FFF8E7';
  const accentColor = settings.primaryColor || '#6d2323';
  const accentDark =
    settings.secondaryColor || settings.hoverColor || '#8B3333';
  const grayColor = settings.textSecondaryColor || '#6c757d';

  // Access Control
  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('children');

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      const result = await axios.get(
        `${API_BASE_URL}/childrenRoute/children-table`,
        getAuthHeaders(),
      );
      setChildren(result.data);

      const uniqueEmployeeIds = [
        ...new Set(result.data.map((c) => c.person_id).filter(Boolean)),
      ];
      const namesMap = {};

      await Promise.all(
        uniqueEmployeeIds.map(async (id) => {
          try {
            const response = await axios.get(
              `${API_BASE_URL}/Remittance/employees/${id}`,
              getAuthHeaders(),
            );
            namesMap[id] = response.data.name || 'Unknown';
          } catch (error) {
            namesMap[id] = 'Unknown';
          }
        }),
      );

      setEmployeeNames(namesMap);
    } catch (error) {
      console.error('Error fetching children:', error);
      showSnackbar(
        'Failed to fetch children records. Please try again.',
        'error',
      );
    }
  };

  useEffect(() => {
    refreshChildrenRef.current = fetchChildren;
  });

  useEffect(() => {
    if (!socket || !connected) return;
    const handleChanged = () => {
      refreshChildrenRef.current?.();
    };
    socket.on('childrenTableChanged', handleChanged);
    return () => {
      socket.off('childrenTableChanged', handleChanged);
    };
  }, [socket, connected]);

  const groupChildrenByEmployee = () => {
    const grouped = {};
    children.forEach((child) => {
      if (!grouped[child.person_id]) {
        grouped[child.person_id] = {
          employeeId: child.person_id,
          employeeName: employeeNames[child.person_id] || 'Unknown',
          children: [],
        };
      }
      grouped[child.person_id].children.push(child);
    });
    return Object.values(grouped);
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = [
      'childrenFirstName',
      'childrenLastName',
      'dateOfBirth',
      'person_id',
    ];
    requiredFields.forEach((field) => {
      if (!newChild[field] || newChild[field].trim() === '') {
        newErrors[field] = 'This field is required';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdd = async () => {
    if (!validateForm()) {
      showSnackbar('Please fill in all required fields', 'error');
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/childrenRoute/children-table`,
        newChild,
        getAuthHeaders(),
      );
      setNewChild({
        childrenFirstName: '',
        childrenMiddleName: '',
        childrenLastName: '',
        childrenNameExtension: '',
        dateOfBirth: '',
        person_id: '',
      });
      setSelectedEmployee(null);
      setErrors({});
      setTimeout(() => {
        setLoading(false);
        setSuccessAction('adding');
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2000);
      }, 300);
      fetchChildren();
    } catch (err) {
      console.error('Error adding data:', err);
      setLoading(false);
      showSnackbar('Failed to add child record. Please try again.', 'error');
    }
  };

  const handleChange = (field, value) => {
    setNewChild({ ...newChild, [field]: value });
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleEmployeeChange = (employeeNumber) => {
    setNewChild({ ...newChild, person_id: employeeNumber });
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.person_id;
      return newErrors;
    });
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
  };

  // Modal Handlers
  const handleOpenEmployeeChildrenModal = (employeeId, employeeName, children) => {
    setEmployeeChildrenModal({
      open: true,
      employeeId,
      employeeName,
      children,
    });
    // Select first child by default if available
    if (children.length > 0) {
      selectChild(children[0]);
    } else {
      setSelectedChild(null);
      setTempChildData(null);
      setIsEditingChild(false);
    }
  };

  const handleCloseEmployeeChildrenModal = () => {
    setEmployeeChildrenModal({
      open: false,
      employeeId: null,
      employeeName: '',
      children: [],
    });
    setSelectedChild(null);
    setTempChildData(null);
    setIsEditingChild(false);
  };

  const selectChild = (child) => {
    setSelectedChild(child);
    setTempChildData({ ...child });
    setIsEditingChild(false);
  };

  const handleDetailChange = (field, value) => {
    setTempChildData({ ...tempChildData, [field]: value });
  };

  const handleUpdateChild = async () => {
    if (!tempChildData) return;
    
    setLoading(true);
    try {
      await axios.put(
        `${API_BASE_URL}/childrenRoute/children-table/${tempChildData.id}`,
        tempChildData,
        getAuthHeaders(),
      );
      
      // Update local modal state immediately
      const updatedChildren = employeeChildrenModal.children.map(c => 
        c.id === tempChildData.id ? { ...tempChildData } : c
      );
      setEmployeeChildrenModal(prev => ({ ...prev, children: updatedChildren }));
      
      setSelectedChild({ ...tempChildData });
      setIsEditingChild(false);
      
      fetchChildren(); // Refresh global data
      setSuccessAction('edit');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch (err) {
      console.error('Error updating child:', err);
      showSnackbar('Failed to update child record. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChild = async () => {
    if (!selectedChild) return;

    if (!window.confirm('Are you sure you want to delete this child record?')) {
      return;
    }

    setLoading(true);
    try {
      await axios.delete(
        `${API_BASE_URL}/childrenRoute/children-table/${selectedChild.id}`,
        getAuthHeaders(),
      );

      // Update local modal state
      const updatedChildren = employeeChildrenModal.children.filter(c => c.id !== selectedChild.id);
      setEmployeeChildrenModal(prev => ({ ...prev, children: updatedChildren }));

      // Select next available or clear
      if (updatedChildren.length > 0) {
        selectChild(updatedChildren[0]);
      } else {
        setSelectedChild(null);
        setTempChildData(null);
      }

      fetchChildren();
      setSuccessAction('delete');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch (err) {
      console.error('Error deleting child:', err);
      showSnackbar('Failed to delete child record. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setTempChildData({ ...selectedChild });
    setIsEditingChild(false);
  };

  const getAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  // Pagination Logic
  const [searchTerm, setSearchTerm] = useState('');
  const groupedChildren = groupChildrenByEmployee();
  const filteredGroupedChildren = groupedChildren.filter((group) => {
    const employeeName = group.employeeName.toLowerCase();
    const employeeId = group.employeeId?.toString() || '';
    const childrenNames = group.children
      .map((child) =>
        `${child.childrenFirstName} ${child.childrenMiddleName} ${child.childrenLastName}`.toLowerCase(),
      )
      .join(' ');
    const search = searchTerm.toLowerCase();
    return (
      employeeId.includes(search) ||
      employeeName.includes(search) ||
      childrenNames.includes(search)
    );
  });

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Avoid layout shift
  useEffect(() => {
    if (page > 0 && page * rowsPerPage >= filteredGroupedChildren.length) {
      setPage(0);
    }
  }, [filteredGroupedChildren.length, rowsPerPage, page]);

  if (hasAccess === null) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
        message="You do not have permission to access Children Information. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }

  // Pagination calculations
  const totalRows = filteredGroupedChildren.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const startRow = totalRows === 0 ? 0 : page * rowsPerPage + 1;
  const endRow = Math.min((page + 1) * rowsPerPage, totalRows);

  const paginatedData = (() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredGroupedChildren.slice(start, end);
  })();

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
            <GlassCard settings={settings}>
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
                      <FamilyRestroomIcon
                        sx={{ color: accentColor, fontSize: 32 }}
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
                          color: accentColor,
                        }}
                      >
                        Children Information Management
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          opacity: 0.8,
                          fontWeight: 400,
                          color: accentDark,
                        }}
                      >
                        Add and manage children records for employees
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
              Processing child record...
            </Typography>
          </Box>
        </Backdrop>

        {/* Main Content */}
        <Grid container spacing={4}>
          {/* Add New Child Section */}
          <Grid item xs={12} lg={6}>
            <Fade in timeout={700}>
              <GlassCard
                settings={settings}
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
                  <ChildCareIcon sx={{ fontSize: '1.8rem', mr: 2 }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      Add New Child
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                      Fill in the child's information
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
                          value={newChild.person_id}
                          onChange={handleEmployeeChange}
                          selectedEmployee={selectedEmployee}
                          onEmployeeSelect={handleEmployeeSelect}
                          placeholder="Search and select employee..."
                          required
                          error={!!errors.person_id}
                          helperText={errors.person_id || ''}
                          settings={settings}
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
                              backgroundColor: alpha(
                                settings.accentColor ||
                                  settings.backgroundColor ||
                                  '#FEF9E1',
                                0.8,
                              ),
                              border: `1px solid ${alpha(settings.primaryColor || '#6d2323', 0.3)}`,
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
                                  color: settings.textPrimaryColor || '#A31D1D',
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
                              border: `2px dashed ${alpha(settings.primaryColor || '#6d2323', 0.3)}`,
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
                    <ChildCareIcon sx={{ mr: 2, fontSize: 24 }} />
                    {newChild.childrenFirstName || newChild.childrenLastName ? `${newChild.childrenFirstName} ${newChild.childrenMiddleName ? newChild.childrenMiddleName + ' ' : ''}${newChild.childrenLastName}${newChild.childrenNameExtension ? ', ' + newChild.childrenNameExtension : ''}`.trim() : 'Child Details'}
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 500, mb: 1, color: accentColor }}
                      >
                        First Name <span style={{ color: 'red' }}>*</span>
                      </Typography>
                      <ModernTextField
                        value={newChild.childrenFirstName}
                        onChange={(e) =>
                          handleChange('childrenFirstName', e.target.value)
                        }
                        fullWidth
                        size="small"
                        error={!!errors.childrenFirstName}
                        helperText={errors.childrenFirstName || ''}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 500, mb: 1, color: accentColor }}
                      >
                        Middle Name
                      </Typography>
                      <ModernTextField
                        value={newChild.childrenMiddleName}
                        onChange={(e) =>
                          handleChange('childrenMiddleName', e.target.value)
                        }
                        fullWidth
                        size="small"
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 500, mb: 1, color: accentColor }}
                      >
                        Last Name <span style={{ color: 'red' }}>*</span>
                      </Typography>
                      <ModernTextField
                        value={newChild.childrenLastName}
                        onChange={(e) =>
                          handleChange('childrenLastName', e.target.value)
                        }
                        fullWidth
                        size="small"
                        error={!!errors.childrenLastName}
                        helperText={errors.childrenLastName || ''}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 500, mb: 1, color: accentColor }}
                      >
                        Name Extension
                      </Typography>
                      <ModernTextField
                        value={newChild.childrenNameExtension}
                        onChange={(e) =>
                          handleChange('childrenNameExtension', e.target.value)
                        }
                        fullWidth
                        size="small"
                        placeholder="e.g., Jr., Sr., III"
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 500, mb: 1, color: accentColor }}
                      >
                        Date of Birth <span style={{ color: 'red' }}>*</span>
                      </Typography>
                      <ModernTextField
                        type="date"
                        value={newChild.dateOfBirth}
                        onChange={(e) =>
                          handleChange('dateOfBirth', e.target.value)
                        }
                        fullWidth
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        error={!!errors.dateOfBirth}
                        helperText={errors.dateOfBirth || ''}
                      />
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 'auto', pt: 3 }}>
                    <ProfessionalButton
                      onClick={handleAdd}
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
                      Add Child Record
                    </ProfessionalButton>
                  </Box>
                </Box>
              </GlassCard>
            </Fade>
          </Grid>

          {/* Employee Children Records Section */}
          <Grid item xs={12} lg={6}>
            <Fade in timeout={900}>
              <GlassCard
                settings={settings}
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
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FamilyRestroomIcon sx={{ fontSize: '1.8rem', mr: 2 }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        Employee Children Records
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        View and manage children records by employee
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
                      placeholder="Search by Employee ID, Name, or Child Name"
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

                  {/* Scrollable Area */}
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
                        {paginatedData.map((group) => (
                          <Grid
                            item
                            xs={12}
                            sm={6}
                            md={6}
                            lg={6}
                            key={group.employeeId}
                          >
                            <Card
                              onClick={() =>
                                handleOpenEmployeeChildrenModal(
                                  group.employeeId,
                                  group.employeeName,
                                  group.children,
                                )
                              }
                              sx={{
                                cursor: 'pointer',
                                border: `1px solid ${alpha(settings.primaryColor || '#6d2323', 0.15)}`,
                                height: '100%',
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
                                  <FamilyRestroomIcon sx={{ fontSize: 20 }} />
                                </Avatar>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: accentColor,
                                    fontWeight: 'bold',
                                    fontSize: '0.7rem',
                                    lineHeight: 1.2,
                                  }}
                                >
                                  ID: {group.employeeId}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  fontWeight="600"
                                  color="#333"
                                  sx={{ lineHeight: 1.2, fontSize: '0.9rem' }}
                                >
                                  {group.employeeName}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      paginatedData.map((group) => (
                        <Card
                          key={group.employeeId}
                          onClick={() =>
                            handleOpenEmployeeChildrenModal(
                              group.employeeId,
                              group.employeeName,
                              group.children,
                            )
                          }
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
                              <FamilyRestroomIcon
                                sx={{ fontSize: 18, color: accentColor, mr: 1.5 }}
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
                                  ID: {group.employeeId}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  fontWeight="bold"
                                  color="#333"
                                  sx={{ lineHeight: 1.2, fontSize: '0.9rem' }}
                                >
                                  {group.employeeName}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Card>
                      ))
                    )}

                    {paginatedData.length === 0 && (
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

                  {/* Fixed Footer - Pagination */}
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
                            onChange={handleChangeRowsPerPage}
                            sx={{ fontSize: '0.75rem', height: 28 }}
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

        {/* Employee Children Modal - Split View */}
        <Modal
          open={employeeChildrenModal.open}
          onClose={handleCloseEmployeeChildrenModal}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <GlassCard
            settings={settings}
            sx={{
              width: '95%',
              maxWidth: '1200px',
              height: '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header with Gradient and White Text */}
            <Box
              sx={{
                p: 3,
                background: `linear-gradient(135deg, ${settings.secondaryColor || '#6d2323'} 0%, ${settings.deleteButtonHoverColor || '#a31d1d'} 100%)`,
                color: '#ffffff', // Explicitly White as requested
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FamilyRestroomIcon sx={{ fontSize: '1.8rem', mr: 2 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Children of {employeeChildrenModal.employeeName}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    Employee ID: {employeeChildrenModal.employeeId} |{' '}
                    {employeeChildrenModal.children.length}{' '}
                    {employeeChildrenModal.children.length === 1
                      ? 'Child'
                      : 'Children'}
                  </Typography>
                </Box>
              </Box>
              <IconButton
                onClick={handleCloseEmployeeChildrenModal}
                sx={{ color: '#ffffff' }}
              >
                <Close />
              </IconButton>
            </Box>

            {/* Split Body */}
            <Box
              sx={{
                flexGrow: 1,
                display: 'flex',
                overflow: 'hidden',
                backgroundColor: '#fff',
              }}
            >
              {/* Left Panel: List of Children */}
              <Box
                sx={{
                  width: '350px',
                  borderRight: '1px solid rgba(0,0,0,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: '#f9f9f9',
                }}
              >
                <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Children List
                  </Typography>
                </Box>
                <List sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
                  {employeeChildrenModal.children.map((child) => (
                    <ListItem
                      key={child.id}
                      button
                      selected={selectedChild?.id === child.id}
                      onClick={() => selectChild(child)}
                      sx={{
                        borderRadius: 1,
                        mb: 1,
                        border: selectedChild?.id === child.id
                          ? `1px solid ${accentColor}`
                          : '1px solid transparent',
                        backgroundColor: selectedChild?.id === child.id
                          ? alpha(accentColor, 0.1)
                          : 'transparent',
                        '&.Mui-selected': {
                          backgroundColor: alpha(accentColor, 0.1),
                          '&:hover': {
                            backgroundColor: alpha(accentColor, 0.2),
                          },
                        },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight="bold" noWrap>
                            {child.childrenFirstName} {child.childrenLastName}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" noWrap>
                            Age: {getAge(child.dateOfBirth)} yrs
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                  {employeeChildrenModal.children.length === 0 && (
                    <Box p={2} textAlign="center">
                      <Typography variant="body2" color="textSecondary">
                        No children added.
                      </Typography>
                    </Box>
                  )}
                </List>
              </Box>

              {/* Right Panel: Child Details / Edit Form */}
              <Box
                sx={{
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {selectedChild ? (
                  <>
                    <Box
                      sx={{
                        p: 2,
                        borderBottom: '1px solid rgba(0,0,0,0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#fff',
                      }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: accentColor }}>
                        {selectedChild ? `${selectedChild.childrenFirstName} ${selectedChild.childrenMiddleName ? selectedChild.childrenMiddleName + ' ' : ''}${selectedChild.childrenLastName}${selectedChild.childrenNameExtension ? ', ' + selectedChild.childrenNameExtension : ''}`.trim() : 'Child Details'}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        flexGrow: 1,
                        overflowY: 'auto',
                        p: 3,
                      }}
                    >
                      <Grid container spacing={3}>
                        {/* Read Only or Editable Fields */}
                        <Grid item xs={12}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, mb: 1, color: grayColor }}
                          >
                            First Name
                          </Typography>
                          {isEditingChild ? (
                            <ModernTextField
                              value={tempChildData.childrenFirstName}
                              onChange={(e) =>
                                handleDetailChange('childrenFirstName', e.target.value)
                              }
                              fullWidth
                              size="small"
                            />
                          ) : (
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {selectedChild.childrenFirstName}
                            </Typography>
                          )}
                        </Grid>

                        <Grid item xs={12}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, mb: 1, color: grayColor }}
                          >
                            Middle Name
                          </Typography>
                          {isEditingChild ? (
                            <ModernTextField
                              value={tempChildData.childrenMiddleName}
                              onChange={(e) =>
                                handleDetailChange('childrenMiddleName', e.target.value)
                              }
                              fullWidth
                              size="small"
                            />
                          ) : (
                            <Typography variant="body1">
                              {selectedChild.childrenMiddleName || 'N/A'}
                            </Typography>
                          )}
                        </Grid>

                        <Grid item xs={12}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, mb: 1, color: grayColor }}
                          >
                            Last Name
                          </Typography>
                          {isEditingChild ? (
                            <ModernTextField
                              value={tempChildData.childrenLastName}
                              onChange={(e) =>
                                handleDetailChange('childrenLastName', e.target.value)
                              }
                              fullWidth
                              size="small"
                            />
                          ) : (
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {selectedChild.childrenLastName}
                            </Typography>
                          )}
                        </Grid>

                        <Grid item xs={12}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, mb: 1, color: grayColor }}
                          >
                            Name Extension
                          </Typography>
                          {isEditingChild ? (
                            <ModernTextField
                              value={tempChildData.childrenNameExtension}
                              onChange={(e) =>
                                handleDetailChange('childrenNameExtension', e.target.value)
                              }
                              fullWidth
                              size="small"
                            />
                          ) : (
                            <Typography variant="body1">
                              {selectedChild.childrenNameExtension || 'N/A'}
                            </Typography>
                          )}
                        </Grid>

                        <Grid item xs={12}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, mb: 1, color: grayColor }}
                          >
                            Date of Birth
                          </Typography>
                          {isEditingChild ? (
                            <ModernTextField
                              type="date"
                              value={tempChildData.dateOfBirth?.split('T')[0] || ''}
                              onChange={(e) =>
                                handleDetailChange('dateOfBirth', e.target.value)
                              }
                              fullWidth
                              size="small"
                            />
                          ) : (
                            <Typography variant="body1">
                              {selectedChild.dateOfBirth?.split('T')[0] || 'N/A'}
                            </Typography>
                          )}
                        </Grid>
                      </Grid>
                    </Box>

                    {/* Footer Actions */}
                    <Box
                      sx={{
                        p: 2,
                        borderTop: '1px solid rgba(0,0,0,0.1)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 2,
                        backgroundColor: '#fff',
                      }}
                    >
                      {isEditingChild ? (
                        <>
                          <ProfessionalButton
                            onClick={handleCancelEdit}
                            variant="outlined"
                            startIcon={<CancelIcon />}
                            sx={{
                              borderColor: settings.cancelButtonColor || '#6c757d',
                              color: settings.cancelButtonColor || '#6c757d',
                              minWidth: '100px',
                            }}
                          >
                            Cancel
                          </ProfessionalButton>
                          <ProfessionalButton
                            onClick={handleUpdateChild}
                            variant="contained"
                            startIcon={<SaveIcon />}
                            sx={{
                              backgroundColor: accentColor,
                              color: primaryColor,
                              minWidth: '100px',
                              '&:hover': { backgroundColor: accentDark },
                            }}
                          >
                            Save
                          </ProfessionalButton>
                        </>
                      ) : (
                        <>
                          <ProfessionalButton
                            onClick={() => setIsEditingChild(true)}
                            variant="contained"
                            startIcon={<EditIcon />}
                            size="small"
                            sx={{
                              backgroundColor: accentColor,
                              color: primaryColor,
                              minWidth: '100px',
                              mr: 1,
                              '&:hover': { backgroundColor: accentDark },
                            }}
                          >
                            Edit
                          </ProfessionalButton>
                          <ProfessionalButton
                            onClick={handleDeleteChild}
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
                              minWidth: '100px',
                              '&:hover': {
                                backgroundColor: alpha(
                                  settings.deleteButtonColor ||
                                    settings.primaryColor ||
                                    '#6d2323',
                                  0.1,
                                ),
                              },
                            }}
                          >
                            Delete
                          </ProfessionalButton>
                        </>
                      )}
                    </Box>
                  </>
                ) : (
                  <Box
                    sx={{
                      flexGrow: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: grayColor,
                    }}
                  >
                    <Typography variant="h6">
                      Select a child from the list to view details
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
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

export default Children;