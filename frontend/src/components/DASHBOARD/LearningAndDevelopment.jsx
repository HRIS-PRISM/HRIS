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
  ListItemIcon,
  Card,
  CardContent,
  Fade,
  Divider,
  Backdrop,
  styled,
  Avatar,
  Tooltip,
} from "@mui/material";
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
  Lightbulb as LightbulbIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh,
  CalendarToday,
} from "@mui/icons-material";

import ReorderIcon from '@mui/icons-material/Reorder';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import AccessDenied from '../AccessDenied';
import usePageAccess from '../../hooks/usePageAccess';
import { useNavigate } from "react-router-dom";
import { useSystemSettings } from '../../hooks/useSystemSettings';
import {
  createThemedCard,
  createThemedButton,
  createThemedTextField,
} from '../../utils/theme';
import { alpha } from '@mui/material';

// Stable themed components (avoid recreating styled components on every render)
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
      const response = await axios.get(
        `${API_BASE_URL}/Remittance/employees/search`,
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

  const fetchEmployeeById = async (employeeNumber) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/Remittance/employees/${employeeNumber}`,
        getAuthHeaders()
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
          startAdornment: <PersonIcon sx={{ color: settings.textPrimaryColor || settings.primaryColor || '#6D2323', mr: 1 }} />,
          endAdornment: (
            <IconButton
              onClick={dropdownDisabled ? undefined : handleDropdownClick}
              size="small"
              disabled={dropdownDisabled}
              sx={{ color: settings.textPrimaryColor || settings.primaryColor || '#6D2323' }}
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
                      backgroundColor: alpha(settings.accentColor || settings.backgroundColor || '#FEF9E1', 0.3),
                    },
                  }}
                >
                  <ListItemText
                    primary={employee.name}
                    secondary={`#${employee.employeeNumber}`}
                    primaryTypographyProps={{ fontWeight: 'bold', color: settings.textPrimaryColor || '#6D2323' }}
                    secondaryTypographyProps={{ color: settings.textSecondaryColor || '#666' }}
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

const LearningAndDevelopment = () => {
  const { socket, connected } = useSocket();
  const refreshLearningRef = useRef(null);
  const [data, setData] = useState([]);
  const [employeeNames, setEmployeeNames] = useState({});
  const [newLearning, setNewLearning] = useState({
    titleOfProgram: '',
    dateFrom: '',
    dateTo: '',
    numberOfHours: '',
    typeOfLearningDevelopment: '',
    conductedSponsored: '',
    person_id: '',
  });
  const [editLearning, setEditLearning] = useState(null);
  const [originalLearning, setOriginalLearning] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState("");
  const [errors, setErrors] = useState({});
  const [viewMode, setViewMode] = useState('grid');
  
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEditEmployee, setSelectedEditEmployee] = useState(null);
  const [employeeRecordsModal, setEmployeeRecordsModal] = useState({
    open: false,
    employeeId: null,
    employeeName: '',
    records: []
  });
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const navigate = useNavigate();
  
  const { settings } = useSystemSettings();
  
  // Use stable themed components
  const GlassCard = ThemedCard;
  const ProfessionalButton = ThemedButton;
  const ModernTextField = ThemedTextField;
  
  // Get colors from system settings
  const primaryColor = settings.accentColor || '#FEF9E1'; // Cards color
  const secondaryColor = settings.backgroundColor || '#FFF8E7'; // Background
  const accentColor = settings.primaryColor || '#6d2323'; // Primary accent
  const accentDark = settings.secondaryColor || '#8B3333'; // Darker accent
  const textPrimaryColor = settings.textPrimaryColor || '#6d2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';
  const hoverColor = settings.hoverColor || '#6D2323';
  const grayColor = settings.textSecondaryColor || '#6c757d';
  
  // Dynamic page access control using component identifier
  const { hasAccess, loading: accessLoading, error: accessError } = usePageAccess('learningdev');

  useEffect(() => {
    fetchLearning();
  }, []);

  const fetchLearning = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/learning_and_development_table`, getAuthHeaders());
      setData(res.data);
      
      // Fetch employee names for all records
      const uniqueEmployeeIds = [...new Set(res.data.map(c => c.person_id).filter(Boolean))];
      const namesMap = {};
      
      await Promise.all(
        uniqueEmployeeIds.map(async (id) => {
          try {
            const response = await axios.get(
              `${API_BASE_URL}/Remittance/employees/${id}`,
              getAuthHeaders()
            );
            namesMap[id] = response.data.name || 'Unknown';
          } catch (error) {
            namesMap[id] = 'Unknown';
          }
        })
      );
      
      setEmployeeNames(namesMap);
    } catch (err) {
      console.error('Error fetching data:', err);
      showSnackbar('Failed to fetch learning records. Please try again.', 'error');
    }
  };

  // Keep latest fetch function for Socket.IO handler
  useEffect(() => {
    refreshLearningRef.current = fetchLearning;
  });

  // Realtime: refresh when anyone changes learning records
  useEffect(() => {
    if (!socket || !connected) return;

    const handleChanged = () => {
      refreshLearningRef.current?.();
    };

    socket.on('learningChanged', handleChanged);
    return () => {
      socket.off('learningChanged', handleChanged);
    };
  }, [socket, connected]);

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = ['titleOfProgram', 'dateFrom', 'dateTo', 'person_id'];
    
    requiredFields.forEach(field => {
      if (!newLearning[field] || newLearning[field].trim() === '') {
        newErrors[field] = 'This field is required';
      }
    });
    
    // Validate date logic
    if (newLearning.dateFrom && newLearning.dateTo) {
      if (new Date(newLearning.dateFrom) > new Date(newLearning.dateTo)) {
        newErrors.dateTo = 'End date must be after start date';
      }
    }
    
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
      await axios.post(`${API_BASE_URL}/learning_and_development_table`, newLearning, getAuthHeaders());
      setNewLearning({
        titleOfProgram: '',
        dateFrom: '',
        dateTo: '',
        numberOfHours: '',
        typeOfLearningDevelopment: '',
        conductedSponsored: '',
        person_id: '',
      });
      setSelectedEmployee(null);
      setErrors({});
      setTimeout(() => {     
        setLoading(false);  
        setSuccessAction("adding");
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2000);
      }, 300);  
      fetchLearning();
    } catch (err) {
      console.error('Error adding data:', err);
      setLoading(false);
      showSnackbar('Failed to add learning record. Please try again.', 'error');
    }
  };

  const handleUpdate = async () => {
    try {
      await axios.put(`${API_BASE_URL}/learning_and_development_table/${editLearning.id}`, editLearning, getAuthHeaders());
      setEditLearning(null);
      setOriginalLearning(null);
      setSelectedEditEmployee(null);
      setIsEditing(false);
      fetchLearning();
      setSuccessAction("edit");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch (err) {
      console.error('Error updating data:', err);
      showSnackbar('Failed to update learning record. Please try again.', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/learning_and_development_table/${id}`, getAuthHeaders());
      setEditLearning(null);
      setOriginalLearning(null);
      setSelectedEditEmployee(null);
      setIsEditing(false);
      fetchLearning();
      setSuccessAction("delete");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch (err) {
      console.error('Error deleting data:', err);
      showSnackbar('Failed to delete learning record. Please try again.', 'error');
    }
  };

  const handleChange = (field, value, isEdit = false) => {
    if (isEdit) {
      setEditLearning({ ...editLearning, [field]: value });
    } else {
      setNewLearning({ ...newLearning, [field]: value });
      if (errors[field]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    }
  };

  const handleEmployeeChange = (employeeNumber) => {
    setNewLearning({ ...newLearning, person_id: employeeNumber });
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.person_id;
      return newErrors;
    });
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
  };

  const handleEditEmployeeChange = (employeeNumber) => {
    setEditLearning({ ...editLearning, person_id: employeeNumber });
  };

  const handleEditEmployeeSelect = (employee) => {
    setSelectedEditEmployee(employee);
  };

  const handleOpenModal = async (learning) => {
    const employeeName = employeeNames[learning.person_id] || 'Unknown';
    
    setEditLearning({ ...learning });
    setOriginalLearning({ ...learning });
    setSelectedEditEmployee({
      name: employeeName,
      employeeNumber: learning.person_id,
    });
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditLearning({ ...originalLearning });
    setSelectedEditEmployee({
      name: employeeNames[originalLearning.person_id] || 'Unknown',
      employeeNumber: originalLearning.person_id,
    });
    setIsEditing(false);
  };

  const handleCloseModal = () => {
    setEditLearning(null);
    setOriginalLearning(null);
    setSelectedEditEmployee(null);
    setIsEditing(false);
  };

  const handleOpenEmployeeRecordsModal = (employeeId, employeeName, records) => {
    setEmployeeRecordsModal({
      open: true,
      employeeId,
      employeeName,
      records
    });
  };

  const handleCloseEmployeeRecordsModal = () => {
    setEmployeeRecordsModal({
      open: false,
      employeeId: null,
      employeeName: '',
      records: []
    });
  };

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const hasChanges = () => {
    if (!editLearning || !originalLearning) return false;
    
    return (
      editLearning.titleOfProgram !== originalLearning.titleOfProgram ||
      editLearning.dateFrom !== originalLearning.dateFrom ||
      editLearning.dateTo !== originalLearning.dateTo ||
      editLearning.numberOfHours !== originalLearning.numberOfHours ||
      editLearning.typeOfLearningDevelopment !== originalLearning.typeOfLearningDevelopment ||
      editLearning.conductedSponsored !== originalLearning.conductedSponsored ||
      editLearning.person_id !== originalLearning.person_id
    );
  };

  if (accessLoading) {
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
        message="You do not have permission to access Learning and Development Information. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }

  const filteredData = data.filter((learning) => {
    const programTitle = learning.titleOfProgram?.toLowerCase() || "";
    const personId = learning.person_id?.toString() || "";
    const employeeName = employeeNames[learning.person_id]?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();
    return personId.includes(search) || programTitle.includes(search) || employeeName.includes(search);
  });

  const groupedData = (() => {
    const grouped = {};
    data.forEach((item) => {
      if (!grouped[item.person_id]) {
        grouped[item.person_id] = {
          employeeId: item.person_id,
          employeeName: employeeNames[item.person_id] || 'Unknown',
          records: []
        };
      }
      grouped[item.person_id].records.push(item);
    });
    return Object.values(grouped);
  })();

  const filteredGroupedData = groupedData.filter((group) => {
    const employeeName = (group.employeeName || '').toLowerCase();
    const employeeId = (group.employeeId || '').toString();
    const recordText = group.records
      .map((r) => (r.titleOfProgram || '').toLowerCase())
      .join(' ');
    const search = searchTerm.toLowerCase();
    return employeeId.includes(search) || employeeName.includes(search) || recordText.includes(search);
  });

  return (
    <Box sx={{ 
      py: { xs: 2, md: 4 },
      mt: { xs: 0, md: -5 },
      width: '100%',
      maxWidth: '1600px',
      mx: 'auto',
      overflowX: 'hidden',
    }}>
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
                    background: 'radial-gradient(circle, rgba(109,35,35,0.1) 0%, rgba(109,35,35,0) 70%)',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -30,
                    left: '30%',
                    width: 150,
                    height: 150,
                    background: 'radial-gradient(circle, rgba(109,35,35,0.08) 0%, rgba(109,35,35,0) 70%)',
                  }}
                />
                
                <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
                  <Box display="flex" alignItems="center">
                    <Avatar 
                      sx={{ 
                        bgcolor: 'rgba(109,35,35,0.15)', 
                        mr: 4, 
                        width: 64,
                        height: 64,
                        boxShadow: '0 8px 24px rgba(109,35,35,0.15)'
                      }}
                    >
                      <LightbulbIcon sx={{color: accentColor, fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2, color: accentColor }}>
                        Learning and Development Management
                      </Typography>
                      <Typography variant="body1" sx={{ opacity: 0.8, fontWeight: 400, color: accentDark }}>
                        Add and manage learning and development Seminars, Interventions, and Training programs attended by employees.
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
          sx={{ color: primaryColor, zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={loading}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress color="inherit" size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 2, color: primaryColor }}>
              Processing learning record...
            </Typography>
          </Box>
        </Backdrop>

        {/* Main Content */}
        <Grid container spacing={4}>
          {/* Add New Learning Section */}
          <Grid item xs={12} lg={6}>
            <Fade in timeout={700}>
              <GlassCard settings={settings} sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
                <Box
                  sx={{
                    p: 4,
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    color: accentColor,
                    display: "flex",
                    alignItems: "center",
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <LightbulbIcon sx={{ fontSize: "1.8rem", mr: 2 }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      Add New Program 
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                      Fill in the program information 
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ 
                  p: 4, 
                  flexGrow: 1, 
                  display: 'flex', 
                  flexDirection: 'column',
                  overflowY: 'auto'
                }}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: accentColor, display: 'flex', alignItems: 'center' }}>
                      <PersonIcon sx={{ mr: 2, fontSize: 24 }} />
                      Employee Information <span style={{ marginLeft: '12px', fontWeight: 400, opacity: 0.7, color: 'red' }}>*</span>
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>
                          Search Employee
                        </Typography>
                        <EmployeeAutocomplete
                          value={newLearning.person_id}
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
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>
                          Selected Employee
                        </Typography>
                        {selectedEmployee ? (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              backgroundColor: alpha(settings.accentColor || settings.backgroundColor || '#FEF9E1', 0.8),
                              border: `1px solid ${alpha(settings.primaryColor || '#6d2323', 0.3)}`,
                              borderRadius: 2,
                              paddingLeft: '10px',
                              gap: 1.5,
                            }}
                          >
                            <PersonIcon sx={{ color: accentColor, fontSize: 20 }} />
                            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
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

                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: accentColor, display: 'flex', alignItems: 'center' }}>
                    <LightbulbIcon sx={{ mr: 2, fontSize: 24 }} />
                    Program Details
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>
                        Title of Program <span style={{ color: 'red' }}>*</span>
                      </Typography>
                      <ModernTextField
                        value={newLearning.titleOfProgram}
                        onChange={(e) => handleChange("titleOfProgram", e.target.value)}
                        fullWidth
                        size="small"
                        error={!!errors.titleOfProgram}
                        helperText={errors.titleOfProgram || ''}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>
                        Date From <span style={{ color: 'red' }}>*</span>
                      </Typography>
                      <ModernTextField
                        type="date"
                        value={newLearning.dateFrom}
                        onChange={(e) => handleChange("dateFrom", e.target.value)}
                        fullWidth
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        error={!!errors.dateFrom}
                        helperText={errors.dateFrom || ''}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>
                        Date To <span style={{ color: 'red' }}>*</span>
                      </Typography>
                      <ModernTextField
                        type="date"
                        value={newLearning.dateTo}
                        onChange={(e) => handleChange("dateTo", e.target.value)}
                        fullWidth
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        error={!!errors.dateTo}
                        helperText={errors.dateTo || ''}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>
                        Number of Hours
                      </Typography>
                      <ModernTextField
                        value={newLearning.numberOfHours}
                        onChange={(e) => handleChange("numberOfHours", e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>
                        Type of Learning Development
                      </Typography>
                      <ModernTextField
                        value={newLearning.typeOfLearningDevelopment}
                        onChange={(e) => handleChange("typeOfLearningDevelopment", e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>
                        Conducted/Sponsored
                      </Typography>
                      <ModernTextField
                        value={newLearning.conductedSponsored}
                        onChange={(e) => handleChange("conductedSponsored", e.target.value)}
                        fullWidth
                        size="small"
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
                        "&:hover": { 
                          backgroundColor: accentDark,
                        },
                      }}
                    >
                      Add Program
                    </ProfessionalButton>
                  </Box>
                </Box>
              </GlassCard>
            </Fade>
          </Grid>

          {/* Learning Records Section */}
          <Grid item xs={12} lg={6}>
            <Fade in timeout={900}>
              <GlassCard settings={settings} sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
                <Box
                  sx={{
                    p: 4,
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    color: accentColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <LightbulbIcon sx={{ fontSize: "1.8rem", mr: 2 }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        Programs
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        View and manage existing programs
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
                          color: accentColor
                        },
                      }
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

                <Box sx={{ 
                  p: 4, 
                  flexGrow: 1, 
                  display: 'flex', 
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}>
                  <Box sx={{ mb: 3 }}>
                    <ModernTextField
                      size="small"
                      variant="outlined"
                      placeholder="Search by Employee ID, Name, or Program"
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
                        {filteredGroupedData.map((group) => (
                          <Grid item xs={12} sm={6} md={4} key={group.employeeId}>
                            <Card
                              onClick={() =>
                                handleOpenEmployeeRecordsModal(
                                  group.employeeId,
                                  group.employeeName,
                                  group.records
                                )
                              }
                              sx={{
                                cursor: "pointer",
                                border: "1px solid rgba(109, 35, 35, 0.1)",
                                height: "100%",
                                display: 'flex',
                                flexDirection: 'column',
                                "&:hover": { 
                                  borderColor: accentColor,
                                  transform: 'translateY(-2px)',
                                  transition: 'all 0.2s ease',
                                  boxShadow: '0 4px 8px rgba(109,35,35,0.15)'
                                },
                              }}
                            >
                              <CardContent sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                  <LightbulbIcon sx={{ fontSize: 18, color: accentColor, mr: 0.5 }} />
                                  <Typography variant="caption" sx={{ 
                                    color: accentColor, 
                                    px: 0.5, 
                                    py: 0.2, 
                                    borderRadius: 0.5,
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold'
                                  }}>
                                    ID: {group.employeeId}
                                  </Typography>
                                </Box>
                                
                                <Typography variant="body2" fontWeight="bold" color="#333" mb={0.5} noWrap>
                                  {group.employeeName}
                                </Typography>
                                
                                <Typography variant="body2" color="#555" sx={{ flexGrow: 1 }}>
                                  {group.records.length} {group.records.length === 1 ? 'Program' : 'Programs'}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      filteredGroupedData.map((group) => (
                        <Card
                          key={group.employeeId}
                          onClick={() =>
                            handleOpenEmployeeRecordsModal(
                              group.employeeId,
                              group.employeeName,
                              group.records
                            )
                          }
                          sx={{
                            cursor: "pointer",
                            border: "1px solid rgba(109, 35, 35, 0.1)",
                            mb: 1,
                            "&:hover": { 
                              borderColor: accentColor,
                              backgroundColor: 'rgba(254, 249, 225, 0.3)'
                            },
                          }}
                        >
                          <Box sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                              <Box sx={{ mr: 1.5, mt: 0.2 }}>
                                <LightbulbIcon sx={{ fontSize: 20, color: accentColor }} />
                              </Box>
                              
                              <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="caption" sx={{ 
                                  color: accentColor,
                                  fontSize: '0.7rem',
                                  fontWeight: 'bold',
                                  display: 'block',
                                  mb: 0.5
                                }}>
                                  ID: {group.employeeId}
                                </Typography>
                                <Typography variant="body2" fontWeight="bold" color="#333" sx={{ mb: 0.5 }}>
                                  {group.employeeName}
                                </Typography>
                                
                                <Typography variant="body2" color="#555">
                                  {group.records.length} {group.records.length === 1 ? 'Program' : 'Programs'}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Card>
                      ))
                    )}
                    
                    {filteredGroupedData.length === 0 && (
                      <Box textAlign="center" py={4}>
                        <Typography variant="h6" color={accentColor} fontWeight="bold" sx={{ mb: 1 }}>
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

        {/* Employee Programs Modal */}
        <Modal
          open={employeeRecordsModal.open}
          onClose={handleCloseEmployeeRecordsModal}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <GlassCard
            settings={settings}
            sx={{
              width: "90%",
              maxWidth: "900px",
              maxHeight: "90vh",
              overflowY: 'auto',
            }}
          >
            <Box
              sx={{
                p: 4,
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                color: accentColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <LightbulbIcon sx={{ fontSize: "1.8rem", mr: 2 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Programs of {employeeRecordsModal.employeeName}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    Employee ID: {employeeRecordsModal.employeeId} | {employeeRecordsModal.records.length} {employeeRecordsModal.records.length === 1 ? 'Program' : 'Programs'}
                  </Typography>
                </Box>
              </Box>
              <IconButton onClick={handleCloseEmployeeRecordsModal} sx={{ color: accentColor }}>
                <Close />
              </IconButton>
            </Box>

            <Box sx={{ p: 4 }}>
              {employeeRecordsModal.records.length > 0 ? (
                <Grid container spacing={2}>
                  {employeeRecordsModal.records.map((learning) => (
                    <Grid item xs={12} sm={6} md={4} key={learning.id}>
                      <Card
                        onClick={() => handleOpenModal(learning)}
                        sx={{
                          cursor: "pointer",
                          border: "1px solid rgba(109, 35, 35, 0.1)",
                          height: "100%",
                          display: 'flex',
                          flexDirection: 'column',
                          "&:hover": { 
                            borderColor: accentColor,
                            transform: 'translateY(-2px)',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 4px 8px rgba(109,35,35,0.15)'
                          },
                        }}
                      >
                        <CardContent sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" fontWeight="bold" color="#333" mb={0.5} noWrap>
                            {learning.titleOfProgram || 'No Program'}
                          </Typography>
                          
                          <Typography variant="body2" color="#555" mb={0.5}>
                            {learning.typeOfLearningDevelopment || '—'}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexWrap: 'nowrap', overflow: 'hidden' }}>
                            <CalendarToday sx={{ fontSize: 12, color: '#000', mr: 0.25, flexShrink: 0 }} />
                            <Typography variant="caption" color="#000" fontSize="0.7rem" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {learning.dateFrom?.split('T')[0] || learning.dateFrom || '----'}
                            </Typography>
                            <Typography variant="caption" color="#000" fontSize="0.7rem" sx={{ mx: 0.25, flexShrink: 0 }}>
                              to
                            </Typography>
                            <CalendarToday sx={{ fontSize: 12, color: '#000', mr: 0.25, flexShrink: 0 }} />
                            <Typography variant="caption" color="#000" fontSize="0.7rem" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {learning.dateTo?.split('T')[0] || learning.dateTo || '----'}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box textAlign="center" py={4}>
                  <Typography variant="h6" color={accentColor} fontWeight="bold" sx={{ mb: 1 }}>
                    No Records Found
                  </Typography>
                  <Typography variant="body2" color={grayColor}>
                    This employee doesn't have any learning records yet.
                  </Typography>
                </Box>
              )}
            </Box>
          </GlassCard>
        </Modal>

        {/* Edit Learning Modal */}
        <Modal
          open={!!editLearning}
          onClose={handleCloseModal}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <GlassCard
            settings={settings}
            sx={{
              width: "90%",
              maxWidth: "900px",
              maxHeight: "90vh",
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {editLearning && (
              <>
                <Box
                  sx={{
                    p: 3,
                    background: `linear-gradient(135deg, ${settings.secondaryColor || '#6d2323'} 0%, ${settings.deleteButtonHoverColor || '#a31d1d'} 100%)`,
                    color: settings.accentColor || '#FEF9E1',
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    flexShrink: 0,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: settings.accentColor || '#FEF9E1' }}>
                    {isEditing ? "Edit Program" : "Program Details"}
                  </Typography>
                  <IconButton onClick={handleCloseModal} sx={{ color: settings.accentColor || '#FEF9E1' }}>
                    <Close />
                  </IconButton>
                </Box>

                <Box sx={{ 
                  p: 4, 
                  flexGrow: 1, 
                  overflowY: 'auto',
                  minHeight: 0,
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: '#f1f1f1',
                    borderRadius: '3px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: settings.primaryColor || accentColor,
                    borderRadius: '3px',
                  },
                }}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: accentColor, display: 'flex', alignItems: 'center' }}>
                      <PersonIcon sx={{ mr: 2, fontSize: 24 }} />
                      Employee Information
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>
                          Search Employee
                        </Typography>
                        <EmployeeAutocomplete
                          value={editLearning?.person_id || ''}
                          onChange={isEditing ? handleEditEmployeeChange : () => {}}
                          selectedEmployee={selectedEditEmployee}
                          onEmployeeSelect={isEditing ? handleEditEmployeeSelect : () => {}}
                          placeholder="Search and select employee..."
                          required
                          disabled={!isEditing}
                          dropdownDisabled={!isEditing}
                          settings={settings}
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
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>
                          Selected Employee
                        </Typography>
                        {selectedEditEmployee ? (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              backgroundColor: alpha(settings.accentColor || settings.backgroundColor || '#FEF9E1', 0.8),
                              border: `1px solid ${alpha(settings.primaryColor || '#6d2323', 0.3)}`,
                              borderRadius: 2,
                              padding: '12px',
                              gap: 1.5,
                            }}
                          >
                            <PersonIcon sx={{ color: accentColor, fontSize: 20 }} />
                            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
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
                                  color: settings.textPrimaryColor || '#A31D1D',
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

                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: accentColor, display: 'flex', alignItems: 'center' }}>
                    <LightbulbIcon sx={{ mr: 2, fontSize: 24 }} />
                    Program Details
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>
                        Title of Program
                      </Typography>
                      {isEditing ? (
                        <ModernTextField
                          value={editLearning.titleOfProgram}
                          onChange={(e) => handleChange("titleOfProgram", e.target.value, true)}
                          fullWidth
                          size="small"
                        />
                      ) : (
                        <Box sx={{ 
                          p: 1.5, 
                          bgcolor: 'rgba(254, 249, 225, 0.5)', 
                          borderRadius: 1,
                          border: '1px solid rgba(109, 35, 35, 0.2)'
                        }}>
                          <Typography variant="body2">
                            {editLearning.titleOfProgram}
                          </Typography>
                        </Box>
                      )}
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>
                        Date From
                      </Typography>
                      {isEditing ? (
                        <ModernTextField
                          type="date"
                          value={editLearning.dateFrom?.split('T')[0] || ''}
                          onChange={(e) => handleChange("dateFrom", e.target.value, true)}
                          fullWidth
                          size="small"
                        />
                      ) : (
                        <Box sx={{ 
                          p: 1.5, 
                          bgcolor: 'rgba(254, 249, 225, 0.5)', 
                          borderRadius: 1,
                          border: '1px solid rgba(109, 35, 35, 0.2)'
                        }}>
                          <Typography variant="body2">
                            {editLearning.dateFrom?.split('T')[0] || 'N/A'}
                          </Typography>
                        </Box>
                      )}
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>
                        Date To
                      </Typography>
                      {isEditing ? (
                        <ModernTextField
                          type="date"
                          value={editLearning.dateTo?.split('T')[0] || ''}
                          onChange={(e) => handleChange("dateTo", e.target.value, true)}
                          fullWidth
                          size="small"
                        />
                      ) : (
                        <Box sx={{ 
                          p: 1.5, 
                          bgcolor: 'rgba(254, 249, 225, 0.5)', 
                          borderRadius: 1,
                          border: '1px solid rgba(109, 35, 35, 0.2)'
                        }}>
                          <Typography variant="body2">
                            {editLearning.dateTo?.split('T')[0] || 'N/A'}
                          </Typography>
                        </Box>
                      )}
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>
                        Number of Hours
                      </Typography>
                      {isEditing ? (
                        <ModernTextField
                          value={editLearning.numberOfHours}
                          onChange={(e) => handleChange("numberOfHours", e.target.value, true)}
                          fullWidth
                          size="small"
                        />
                      ) : (
                        <Box sx={{ 
                          p: 1.5, 
                          bgcolor: 'rgba(254, 249, 225, 0.5)', 
                          borderRadius: 1,
                          border: '1px solid rgba(109, 35, 35, 0.2)'
                        }}>
                          <Typography variant="body2">
                            {editLearning.numberOfHours || 'N/A'}
                          </Typography>
                        </Box>
                      )}
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>
                        Type of Learning Development
                      </Typography>
                      {isEditing ? (
                        <ModernTextField
                          value={editLearning.typeOfLearningDevelopment}
                          onChange={(e) => handleChange("typeOfLearningDevelopment", e.target.value, true)}
                          fullWidth
                          size="small"
                        />
                      ) : (
                        <Box sx={{ 
                          p: 1.5, 
                          bgcolor: 'rgba(254, 249, 225, 0.5)', 
                          borderRadius: 1,
                          border: '1px solid rgba(109, 35, 35, 0.2)'
                        }}>
                          <Typography variant="body2">
                            {editLearning.typeOfLearningDevelopment || 'N/A'}
                          </Typography>
                        </Box>
                      )}
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>
                        Conducted/Sponsored
                      </Typography>
                      {isEditing ? (
                        <ModernTextField
                          value={editLearning.conductedSponsored}
                          onChange={(e) => handleChange("conductedSponsored", e.target.value, true)}
                          fullWidth
                          size="small"
                        />
                      ) : (
                        <Box sx={{ 
                          p: 1.5, 
                          bgcolor: 'rgba(254, 249, 225, 0.5)', 
                          borderRadius: 1,
                          border: '1px solid rgba(109, 35, 35, 0.2)'
                        }}>
                          <Typography variant="body2">
                            {editLearning.conductedSponsored || 'N/A'}
                          </Typography>
                        </Box>
                      )}
                    </Grid>
                  </Grid>

                </Box>

                {/* Bottom action bar */}
                <Box
                  sx={{
                    borderTop: `1px solid ${alpha(settings.primaryColor || '#6d2323', 0.2)}`,
                    backgroundColor: '#FFFFFF',
                    px: 3,
                    py: 2,
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 2,
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 10,
                    flexShrink: 0,
                  }}
                >
                  {!isEditing ? (
                    <>
                      <ProfessionalButton
                        onClick={() => handleDelete(editLearning.id)}
                        variant="outlined"
                        startIcon={<DeleteIcon />}
                        sx={{
                          borderColor: settings.deleteButtonColor || settings.primaryColor || '#6d2323',
                          color: settings.deleteButtonColor || settings.primaryColor || '#6d2323',
                          minWidth: '120px',
                          '&:hover': {
                            backgroundColor: alpha(settings.deleteButtonColor || settings.primaryColor || '#6d2323', 0.1),
                            borderColor: settings.deleteButtonHoverColor || settings.hoverColor || '#a31d1d',
                            color: settings.deleteButtonHoverColor || settings.hoverColor || '#a31d1d',
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
                          backgroundColor: settings.updateButtonColor || settings.primaryColor || '#6d2323',
                          color: settings.accentColor || '#FEF9E1',
                          minWidth: '120px',
                          '&:hover': {
                            backgroundColor: settings.updateButtonHoverColor || settings.hoverColor || '#a31d1d',
                          },
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
                          borderColor: settings.cancelButtonColor || '#6c757d',
                          color: settings.cancelButtonColor || '#6c757d',
                          minWidth: '120px',
                          '&:hover': {
                            backgroundColor: alpha(settings.cancelButtonColor || '#6c757d', 0.1),
                            borderColor: settings.cancelButtonHoverColor || '#5a6268',
                            color: settings.cancelButtonHoverColor || '#5a6268',
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
                            ? (settings.updateButtonColor || settings.primaryColor || '#6d2323')
                            : alpha(settings.primaryColor || '#6d2323', 0.5),
                          color: settings.accentColor || '#FEF9E1',
                          minWidth: '120px',
                          '&:hover': {
                            backgroundColor: hasChanges() 
                              ? (settings.updateButtonHoverColor || settings.hoverColor || '#a31d1d')
                              : alpha(settings.primaryColor || '#6d2323', 0.5),
                          },
                          '&:disabled': {
                            color: alpha(settings.accentColor || '#FEF9E1', 0.5),
                          },
                        }}
                      >
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

export default LearningAndDevelopment;