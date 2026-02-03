import API_BASE_URL from '../apiConfig';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthHeaders } from '../utils/auth';
import usePageAccess from '../hooks/usePageAccess';
import {
  Alert,
  TextField,
  Button,
  Container,
  Paper,
  Typography,
  Grid,
  InputAdornment,
  Box,
  CircularProgress,
  Fade,
  Grow,
  Zoom,
  IconButton,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Divider,
  ListSubheader,
  ListItemIcon,
} from '@mui/material';
import {
  PersonOutline,
  EmailOutlined,
  BadgeOutlined,
  LockOutlined,
  PersonAddAlt1,
  GroupAdd,
  CheckCircleOutline,
  ErrorOutline,
  CheckCircle,
  Close,
  WorkOutline,
  InfoOutlined,
  AccountBalanceWallet,
  Business,
  AssignmentOutlined,
  Circle,
} from '@mui/icons-material';

import AccessDenied from './AccessDenied';

const Registration = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    nameExtension: '',
    email: '',
    employeeNumber: '',
    password: '',
    employmentCategory: '',
    department: '',
  });

  const [errMessage, setErrorMessage] = useState();
  const [successMessage, setSuccessMessage] = useState('');
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [completedSteps, setCompletedSteps] = useState({
    remittance: false,
    department: false,
    itemTable: false,
  });

  // Field requirements state
  const [fieldRequirements, setFieldRequirements] = useState({
    firstName: true,
    lastName: true,
    email: true,
    employeeNumber: true,
    employmentCategory: true,
    password: true,
    middleName: false,
    nameExtension: false,
    department: false,
  });

  // Department codes state
  const [departmentCodes, setDepartmentCodes] = useState([]);

  const navigate = useNavigate();

  // Load completed steps from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('setupCompletedSteps');
    if (saved) {
      setCompletedSteps(JSON.parse(saved));
    }
  }, []);

  // Fetch field requirements from system settings
  useEffect(() => {
    const fetchFieldRequirements = async () => {
      try {
        const token =
          localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(
          `${API_BASE_URL}/api/system-settings/registration_field_requirements`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          if (data && data.setting_value) {
            try {
              const requirements = JSON.parse(data.setting_value);
              setFieldRequirements(requirements);
            } catch (parseErr) {
              console.error('Error parsing field requirements:', parseErr);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching field requirements:', err);
        // Use defaults if fetch fails
      }
    };
    fetchFieldRequirements();
  }, []);

  // Fetch department codes
  useEffect(() => {
    const fetchDepartmentCodes = async () => {
      try {
        const token =
          localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(
          `${API_BASE_URL}/api/department-table`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setDepartmentCodes(data.map((item) => item.code));
        }
      } catch (err) {
        console.error('Error fetching department codes:', err);
      }
    };
    fetchDepartmentCodes();
  }, []);

  const handleNavigateToSetup = (page) => {
    setShowSetupModal(false);
    navigate(page);
  };

  const markStepComplete = (step) => {
    const updated = { ...completedSteps, [step]: true };
    setCompletedSteps(updated);
    localStorage.setItem('setupCompletedSteps', JSON.stringify(updated));
  };

  // Dynamic page access control using component identifier
  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('registration');

  // Check if setup modal should be shown
  useEffect(() => {
    if (hasAccess === true) {
      setShowSetupModal(true);
    }
  }, [hasAccess]);

  const handleChanges = (e) => {
    const { name, value } = e.target;

    // Update form data
    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: name === 'employmentCategory' ? Number(value) : value,
      };

      // If lastName is being updated, also update to password
      if (name === 'lastName') {
        // Convert to uppercase and remove all spaces
        newData.password = value.toUpperCase().replace(/\s+/g, '');
      }

      return newData;
    });
  };

  const isValidName = (name) => {
    if (!name || name.trim().length === 0) return false;
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) return false;
    if (!/^[a-zA-Z\s'-]+$/.test(trimmedName)) return false;
    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const {
      firstName,
      lastName,
      email,
      employeeNumber,
      password,
      employmentCategory,
      department,
    } = formData;

    // Dynamic validation based on field requirements
    const missingFields = [];
    if (fieldRequirements.firstName && !firstName) {
      missingFields.push('First Name');
    }
    if (fieldRequirements.lastName && !lastName) {
      missingFields.push('Last Name');
    }
    if (fieldRequirements.email && !email) {
      missingFields.push('Email');
    }
    if (fieldRequirements.employeeNumber && !employeeNumber) {
      missingFields.push('Employee Number');
    }
    if (fieldRequirements.password && !password) {
      missingFields.push('Password');
    }
    if (
      fieldRequirements.employmentCategory &&
      employmentCategory === ''
    ) {
      missingFields.push('Employment Category');
    }
    if (fieldRequirements.department && !department) {
      missingFields.push('Department');
    }

    if (missingFields.length > 0) {
      setErrorMessage(
        `Please fill all required fields: ${missingFields.join(', ')}.`
      );
      setSuccessMessage('');
      return;
    }

    if (!isValidName(firstName)) {
      setErrorMessage(
        'Please enter a valid first name (2-50 characters, letters only).'
      );
      setSuccessMessage('');
      return;
    }

    if (!isValidName(lastName)) {
      setErrorMessage(
        'Please enter a valid last name (2-50 characters, letters only).'
      );
      setSuccessMessage('');
      return;
    }

    if (formData.middleName && !isValidName(formData.middleName)) {
      setErrorMessage(
        'Please enter a valid middle name (2-50 characters, letters only).'
      );
      setSuccessMessage('');
      return;
    }

    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        ...authHeaders,
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccessMessage(
          'User registered successfully! Login Information have been sent to their email.'
        );
        setErrorMessage('');
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
        setFormData({
          firstName: '',
          middleName: '',
          lastName: '',
          nameExtension: '',
          email: '',
          employeeNumber: '',
          password: '',
          employmentCategory: '',
          department: '',
        });
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.error || 'Registration failed. Try again.');
        setSuccessMessage('');
      }
    } catch (err) {
      console.error('Registration Error', err);
      setErrorMessage('Something went wrong.');
      setSuccessMessage('');
    }
  };

  const handleSetupLater = () => {
    setShowSetupModal(false);
  };

  // Loading state
  if (accessLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <CircularProgress
            sx={{
              color: '#6d2323',
              mb: 2,
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              },
            }}
            size={60}
            thickness={4}
          />
          <Typography variant="h6" sx={{ color: '#6d2323', fontWeight: 600 }}>
            Loading access information...
          </Typography>
        </Box>
      </Container>
    );
  }

  // Access denied state
  if (hasAccess === false) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access View Attendance Records. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }

  return (
    <Container
      maxWidth="xl"
      sx={{
        py: 4,
        px: { xs: 2, sm: 3, md: 4 },
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'radial-gradient(circle at 20% 50%, rgba(109, 35, 35, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(245, 230, 230, 0.4) 0%, transparent 50%)',
          pointerEvents: 'none',
        },
      }}
    >
      <Grid container spacing={3} sx={{ position: 'relative', zIndex: 1 }}>
        {/* Setup Information Card - Left Side */}
        <Grid item xs={12} lg={4}>
          <Fade in={true} timeout={700}>
            <Paper
              elevation={0}
              sx={{
                height: '100%',
                borderRadius: 3,
                border: '2px solid #f5e6e6',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(109, 35, 35, 0.12)',
                background: 'linear-gradient(135deg, #ffffff 0%, #fffef9 100%)',
                position: 'relative',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 12px 48px rgba(109, 35, 35, 0.18)',
                  transform: 'translateY(-4px)',
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background:
                    'linear-gradient(90deg, #6d2323 0%, #8a4747 50%, #6d2323 100%)',
                },
              }}
            >
              <Box sx={{ p: 3, pt: 4 }}>
                <Box display="flex" alignItems="center" mb={2.5}>
                  <Box
                    sx={{
                      bgcolor: 'rgba(109, 35, 35, 0.1)',
                      p: 1.5,
                      borderRadius: 2,
                      display: 'flex',
                      mr: 2,
                      boxShadow: '0 2px 8px rgba(109, 35, 35, 0.15)',
                    }}
                  >
                    <InfoOutlined sx={{ color: '#6d2323', fontSize: 28 }} />
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: '#6d2323' }}
                  >
                    Initial Setup Requirements
                  </Typography>
                </Box>

                <Divider
                  sx={{ mb: 2.5, borderColor: 'rgba(109, 35, 35, 0.1)' }}
                />

                <Typography
                  variant="body2"
                  sx={{
                    color: '#666',
                    mb: 3,
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                  }}
                >
                  Before registering users, ensure following tables are
                  properly configured:
                </Typography>

                <Grid container spacing={2}>
                  {[
                    {
                      title: 'Remittances',
                      desc: 'Configure employee remittance settings',
                      route: '/remittance-table',
                      icon: AccountBalanceWallet,
                    },
                    {
                      title: 'Department Assignment',
                      desc: 'Set up department designations',
                      route: '/department-assignment',
                      icon: Business,
                    },
                    {
                      title: 'Item Table',
                      desc: 'Configure Plantilla items',
                      route: '/item-table',
                      icon: AssignmentOutlined,
                    },
                  ].map((item, idx) => (
                    <Grid item xs={12} key={idx}>
                      <Fade in={true} timeout={900 + idx * 200}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 2,
                            borderRadius: 2,
                            bgcolor: 'rgba(109, 35, 35, 0.03)',
                            border: '1px solid rgba(109, 35, 35, 0.1)',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: 'rgba(109, 35, 35, 0.06)',
                              borderColor: 'rgba(109, 35, 35, 0.3)',
                              transform: 'translateX(4px)',
                              boxShadow: '0 4px 12px rgba(109, 35, 35, 0.12)',
                            },
                          }}
                          onClick={() => navigate(item.route)}
                        >
                          <Box display="flex" alignItems="center" flex={1}>
                            <Box
                              sx={{
                                mr: 2,
                                width: 40,
                                height: 40,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 1.5,
                                bgcolor: 'rgba(109, 35, 35, 0.1)',
                                color: '#6d2323',
                              }}
                            >
                              <item.icon sx={{ fontSize: 24 }} />
                            </Box>
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                  color: '#6d2323',
                                  mb: 0.25,
                                  fontSize: '0.95rem',
                                }}
                              >
                                {item.title}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: '#666',
                                  fontSize: '0.8rem',
                                  lineHeight: 1.4,
                                }}
                              >
                                {item.desc}
                              </Typography>
                            </Box>
                          </Box>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(item.route);
                            }}
                            sx={{
                              bgcolor: '#6d2323',
                              color: '#fff',
                              textTransform: 'none',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              px: 2.5,
                              py: 0.75,
                              whiteSpace: 'nowrap',
                              borderRadius: 1.5,
                              boxShadow: '0 2px 8px rgba(109, 35, 35, 0.25)',
                              '&:hover': {
                                bgcolor: '#5a1e1e',
                                boxShadow: '0 4px 12px rgba(109, 35, 35, 0.35)',
                                transform: 'translateY(-2px)',
                              },
                              transition: 'all 0.2s ease',
                            }}
                          >
                            Configure
                          </Button>
                        </Box>
                      </Fade>
                    </Grid>
                  ))}
                </Grid>

                <Box
                  sx={{
                    mt: 3,
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: 'rgba(255, 193, 7, 0.08)',
                    borderLeft: '4px solid #ffc107',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      bgcolor: 'rgba(255, 193, 7, 0.2)',
                      p: 0.75,
                      borderRadius: 1,
                      display: 'flex',
                      mt: 0.25,
                    }}
                  >
                    <InfoOutlined sx={{ fontSize: 20, color: '#f57c00' }} />
                  </Box>
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: '#f57c00',
                        mb: 0.5,
                        fontSize: '0.9rem',
                      }}
                    >
                      Important Note
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#666',
                        lineHeight: 1.5,
                        display: 'block',
                      }}
                    >
                      These tables are essential for proper Payroll Management
                      Records. Complete setup before registering users.
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Fade>
        </Grid>

        {/* Registration Form - Right Side */}
        <Grid item xs={12} lg={8}>
          <Box sx={{ height: '100%' }}>
            <Grow in={true} timeout={600}>
              <Paper
                elevation={0}
                sx={{
                  padding: { xs: 3, sm: 4, md: 5 },
                  borderRadius: 3,
                  border: '2px solid #f5e6e6',
                  background:
                    'linear-gradient(135deg, #ffffff 0%, #fffef9 100%)',
                  boxShadow: '0 8px 32px rgba(109, 35, 35, 0.12)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 12px 48px rgba(109, 35, 35, 0.18)',
                    transform: 'translateY(-4px)',
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background:
                      'linear-gradient(90deg, #6d2323 0%, #8a4747 50%, #6d2323 100%)',
                  },
                }}
              >
                {/* Header */}
                <Box sx={{ textAlign: 'center', mb: 4, pt: 2 }}>
                  <Zoom in={true} timeout={400}>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{
                          bgcolor: 'rgba(109, 35, 35, 0.1)',
                          p: 2,
                          borderRadius: 3,
                          display: 'flex',
                          boxShadow: '0 4px 16px rgba(109, 35, 35, 0.2)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'scale(1.05) rotate(5deg)',
                            boxShadow: '0 8px 24px rgba(109, 35, 35, 0.3)',
                          },
                        }}
                      >
                        <PersonAddAlt1
                          sx={{ fontSize: 48, color: '#6d2323' }}
                        />
                      </Box>
                    </Box>
                  </Zoom>
                  <Typography
                    variant="h4"
                    sx={{
                      color: '#6d2323',
                      fontWeight: 800,
                      mb: 1,
                      background:
                        'linear-gradient(135deg, #6d2323 0%, #8a4747 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      letterSpacing: '-0.5px',
                    }}
                  >
                    Single Registration
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: '#8a4747',
                      fontSize: '1rem',
                      fontWeight: 500,
                      maxWidth: 500,
                      mx: 'auto',
                    }}
                  >
                    Register users one at a time with complete details
                  </Typography>
                </Box>

                {/* Alert Messages */}
                {errMessage && (
                  <Fade in={true}>
                    <Alert
                      icon={<ErrorOutline fontSize="inherit" />}
                      sx={{
                        mb: 3,
                        backgroundColor: '#fff',
                        color: '#d32f2f',
                        border: '2px solid #d32f2f',
                        borderRadius: 2,
                        fontWeight: 500,
                        fontSize: '0.95rem',
                        boxShadow: '0 4px 12px rgba(211, 47, 47, 0.2)',
                        '& .MuiAlert-icon': {
                          color: '#d32f2f',
                        },
                      }}
                      severity="error"
                    >
                      {errMessage}
                    </Alert>
                  </Fade>
                )}
                {successMessage && (
                  <Fade in={true}>
                    <Alert
                      icon={<CheckCircleOutline fontSize="inherit" />}
                      sx={{
                        mb: 3,
                        backgroundColor: '#fff',
                        color: '#2e7d32',
                        border: '2px solid #2e7d32',
                        borderRadius: 2,
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        boxShadow: '0 4px 12px rgba(46, 125, 50, 0.2)',
                        '& .MuiAlert-icon': {
                          color: '#2e7d32',
                        },
                      }}
                      severity="success"
                    >
                      {successMessage}
                    </Alert>
                  </Fade>
                )}

                <form onSubmit={handleRegister}>
                  <Box sx={{ mb: 2.5 }}>
                    <Grid container spacing={2.5}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          name="firstName"
                          label={`First Name${fieldRequirements.firstName ? ' *' : ''}`}
                          type="text"
                          fullWidth
                          value={formData.firstName}
                          onChange={handleChanges}
                          onFocus={() => setFocusedField('firstName')}
                          onBlur={() => setFocusedField(null)}
                          InputLabelProps={{
                            required: false,
                            sx: { fontWeight: 600 },
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PersonOutline
                                  sx={{
                                    color:
                                      focusedField === 'firstName'
                                        ? '#6d2323'
                                        : '#8a4747',
                                    transition: 'color 0.3s ease',
                                  }}
                                />
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#8a4747',
                                borderWidth: 2,
                              },
                              '&.Mui-focused': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(109, 35, 35, 0.15)',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6d2323',
                                borderWidth: 2,
                              },
                            },
                            '& .MuiInputLabel-root.Mui-focused': {
                              color: '#6d2323',
                              fontWeight: 700,
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          name="middleName"
                          label="Middle Name"
                          type="text"
                          fullWidth
                          value={formData.middleName}
                          onChange={handleChanges}
                          onFocus={() => setFocusedField('middleName')}
                          onBlur={() => setFocusedField(null)}
                          InputLabelProps={{
                            required: false,
                            sx: { fontWeight: 600 },
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PersonOutline
                                  sx={{
                                    color:
                                      focusedField === 'middleName'
                                        ? '#6d2323'
                                        : '#8a4747',
                                    transition: 'color 0.3s ease',
                                  }}
                                />
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#8a4747',
                                borderWidth: 2,
                              },
                              '&.Mui-focused': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(109, 35, 35, 0.15)',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6d2323',
                                borderWidth: 2,
                              },
                            },
                            '& .MuiInputLabel-root.Mui-focused': {
                              color: '#6d2323',
                              fontWeight: 700,
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          name="lastName"
                          label={`Last Name${fieldRequirements.lastName ? ' *' : ''}`}
                          type="text"
                          fullWidth
                          value={formData.lastName}
                          onChange={handleChanges}
                          onFocus={() => setFocusedField('lastName')}
                          onBlur={() => setFocusedField(null)}
                          InputLabelProps={{
                            required: false,
                            sx: { fontWeight: 600 },
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PersonOutline
                                  sx={{
                                    color:
                                      focusedField === 'lastName'
                                        ? '#6d2323'
                                        : '#8a4747',
                                    transition: 'color 0.3s ease',
                                  }}
                                />
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#8a4747',
                                borderWidth: 2,
                              },
                              '&.Mui-focused': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(109, 35, 35, 0.15)',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6d2323',
                                borderWidth: 2,
                              },
                            },
                            '& .MuiInputLabel-root.Mui-focused': {
                              color: '#6d2323',
                              fontWeight: 700,
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          name="nameExtension"
                          label="Name Extension"
                          type="text"
                          fullWidth
                          value={formData.nameExtension}
                          onChange={handleChanges}
                          onFocus={() => setFocusedField('nameExtension')}
                          onBlur={() => setFocusedField(null)}
                          InputLabelProps={{
                            required: false,
                            sx: { fontWeight: 600 },
                          }}
                          placeholder="Jr., Sr., III, etc."
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PersonOutline
                                  sx={{
                                    color:
                                      focusedField === 'nameExtension'
                                        ? '#6d2323'
                                        : '#8a4747',
                                    transition: 'color 0.3s ease',
                                  }}
                                />
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#8a4747',
                                borderWidth: 2,
                              },
                              '&.Mui-focused': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(109, 35, 35, 0.15)',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6d2323',
                                borderWidth: 2,
                              },
                            },
                            '& .MuiInputLabel-root.Mui-focused': {
                              color: '#6d2323',
                              fontWeight: 700,
                            },
                          }}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          name="email"
                          label={`Email Address${fieldRequirements.email ? ' *' : ''}`}
                          type="email"
                          fullWidth
                          value={formData.email}
                          onChange={handleChanges}
                          onFocus={() => setFocusedField('email')}
                          onBlur={() => setFocusedField(null)}
                          InputLabelProps={{
                            required: false,
                            sx: { fontWeight: 600 },
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <EmailOutlined
                                  sx={{
                                    color:
                                      focusedField === 'email'
                                        ? '#6d2323'
                                        : '#8a4747',
                                    transition: 'color 0.3s ease',
                                  }}
                                />
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#8a4747',
                                borderWidth: 2,
                              },
                              '&.Mui-focused': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(109, 35, 35, 0.15)',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6d2323',
                                borderWidth: 2,
                              },
                            },
                            '& .MuiInputLabel-root.Mui-focused': {
                              color: '#6d2323',
                              fontWeight: 700,
                            },
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Box>

                  <Box sx={{ mb: 2.5 }}>
                    <Grid container spacing={2.5}>
                      <Grid item xs={12} sm={6}>
                        <FormControl
                          fullWidth
                          variant="outlined"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#8a4747',
                                borderWidth: 2,
                              },
                              '&.Mui-focused': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(109, 35, 35, 0.15)',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6d2323',
                                borderWidth: 2,
                              },
                            },
                            '& .MuiInputLabel-root.Mui-focused': {
                              color: '#6d2323',
                              fontWeight: 700,
                            },
                          }}
                        >
                          <InputLabel
                            id="employmentCategory-label"
                            sx={{
                              fontWeight: 600,
                            }}
                          >
                            {`Employment Category${fieldRequirements.employmentCategory ? ' *' : ''}`}
                          </InputLabel>

                          <Select
                            labelId="employmentCategory-label"
                            name="employmentCategory"
                            value={formData.employmentCategory}
                            label={`Employment Category${fieldRequirements.employmentCategory ? ' *' : ''}`}
                            onChange={handleChanges}
                            onFocus={() =>
                              setFocusedField('employmentCategory')
                            }
                            onBlur={() => setFocusedField(null)}
                            displayEmpty // This is key prop!
                            startAdornment={
                              <InputAdornment position="start">
                                <WorkOutline
                                  sx={{
                                    color:
                                      focusedField === 'employmentCategory'
                                        ? '#6d2323'
                                        : '#8a4747',
                                    transition: 'color 0.3s ease',
                                  }}
                                />
                              </InputAdornment>
                            }
                          >
                            <MenuItem value="" disabled>
                              <em>Select Employment Category</em>
                            </MenuItem>
                            
                            <ListSubheader>Job Order (JO)</ListSubheader>
                            <MenuItem value={0}>
                              <ListItemIcon sx={{ minWidth: 30 }}>
                                <Circle sx={{ fontSize: 12, color: '#F57C00' }} />
                              </ListItemIcon>
                              Graduate
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
                              Teaching (Designated)
                            </MenuItem>
                            <MenuItem value={4}>
                              <ListItemIcon sx={{ minWidth: 30 }}>
                                <Circle sx={{ fontSize: 12, color: '#7B1FA2' }} />
                              </ListItemIcon>
                              30Hrs
                            </MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      {/* Employee Number */}
                      <Grid item xs={12} sm={6}>
                        <TextField
                          name="employeeNumber"
                          label={`Employee Number${fieldRequirements.employeeNumber ? ' *' : ''}`}
                          type="text"
                          fullWidth
                          value={formData.employeeNumber}
                          onChange={handleChanges}
                          onFocus={() => setFocusedField('employeeNumber')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="e.g., 2013-4410 or 2013-4507M"
                          helperText="Accepts alphanumeric characters with hyphens (e.g., 2013-4410, 2013-4507M)"
                          InputLabelProps={{
                            required: false,
                            sx: { fontWeight: 600 },
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <BadgeOutlined
                                  sx={{
                                    color:
                                      focusedField === 'employeeNumber'
                                        ? '#6d2323'
                                        : '#8a4747',
                                    transition: 'color 0.3s ease',
                                  }}
                                />
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#8a4747',
                                borderWidth: 2,
                              },
                              '&.Mui-focused': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(109, 35, 35, 0.15)',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6d2323',
                                borderWidth: 2,
                              },
                            },
                            '& .MuiInputLabel-root.Mui-focused': {
                              color: '#6d2323',
                              fontWeight: 700,
                            },
                          }}
                        />
                      </Grid>

                      {/* Password */}
                      <Grid item xs={12} sm={6}>
                        <TextField
                          name="password"
                          label={`Password${fieldRequirements.password ? ' *' : ''}`}
                          type="text" // Changed from "password" to "text" to make it visible
                          fullWidth
                          value={formData.password}
                          InputProps={{
                            readOnly: true, // Made to field read-only
                            startAdornment: (
                              <InputAdornment position="start">
                                <LockOutlined
                                  sx={{
                                    color:
                                      focusedField === 'password'
                                        ? '#6d2323'
                                        : '#8a4747',
                                    transition: 'color 0.3s ease',
                                  }}
                                />
                              </InputAdornment>
                            ),
                          }}
                          InputLabelProps={{
                            required: false,
                            sx: { fontWeight: 600 },
                          }}
                          helperText="Password is automatically set to last name in all caps with no spaces"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#8a4747',
                                borderWidth: 2,
                              },
                              '&.Mui-focused': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(109, 35, 35, 0.15)',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6d2323',
                                borderWidth: 2,
                              },
                            },
                            '& .MuiInputBase-input.Mui-disabled': {
                              WebkitTextFillColor: '#6d2323',
                              cursor: 'not-allowed',
                            },
                          }}
                        />
                      </Grid>

                      {/* Department */}
                      <Grid item xs={12} sm={6}>
                        <FormControl
                          fullWidth
                          variant="outlined"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#8a4747',
                                borderWidth: 2,
                              },
                              '&.Mui-focused': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(109, 35, 35, 0.15)',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6d2323',
                                borderWidth: 2,
                              },
                            },
                            '& .MuiInputLabel-root.Mui-focused': {
                              color: '#6d2323',
                              fontWeight: 700,
                            },
                          }}
                        >
                          <InputLabel
                            id="department-label"
                            sx={{
                              fontWeight: 600,
                            }}
                          >
                            {`Department${fieldRequirements.department ? ' *' : ''}`}
                          </InputLabel>

                          <Select
                            labelId="department-label"
                            name="department"
                            value={formData.department}
                            label={`Department${fieldRequirements.department ? ' *' : ''}`}
                            onChange={handleChanges}
                            onFocus={() =>
                              setFocusedField('department')
                            }
                            onBlur={() => setFocusedField(null)}
                            displayEmpty
                            startAdornment={
                              <InputAdornment position="start">
                                <Business
                                  sx={{
                                    color:
                                      focusedField === 'department'
                                        ? '#6d2323'
                                        : '#8a4747',
                                    transition: 'color 0.3s ease',
                                  }}
                                />
                              </InputAdornment>
                            }
                          >
                            <MenuItem value="" disabled>
                              <em>Select Department</em>
                            </MenuItem>
                            {departmentCodes.map((code, index) => (
                              <MenuItem key={index} value={code}>
                                {code}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Box>

                  <Box
                    sx={{
                      mt: 4,
                      pt: 3,
                      borderTop: '2px dashed rgba(109, 35, 35, 0.15)',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 2.5,
                        flexDirection: { xs: 'column', sm: 'row' },
                      }}
                    >
                      <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        startIcon={<PersonAddAlt1 sx={{ fontSize: 24 }} />}
                        sx={{
                          bgcolor: '#6d2323',
                          py: 2,
                          fontSize: '1.05rem',
                          fontWeight: 700,
                          borderRadius: 2,
                          textTransform: 'none',
                          boxShadow: '0 4px 20px rgba(109, 35, 35, 0.3)',
                          position: 'relative',
                          overflow: 'hidden',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: '-100%',
                            width: '100%',
                            height: '100%',
                            background:
                              'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                            transition: 'left 0.6s ease',
                          },
                          '&:hover::before': {
                            left: '100%',
                          },
                          '&:hover': {
                            bgcolor: '#5a1e1e',
                            transform: 'translateY(-3px)',
                            boxShadow: '0 8px 32px rgba(109, 35, 35, 0.45)',
                          },
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      >
                        Register User
                      </Button>

                      <Button
                        type="button"
                        variant="outlined"
                        fullWidth
                        startIcon={<GroupAdd sx={{ fontSize: 24 }} />}
                        sx={{
                          borderColor: '#6d2323',
                          color: '#6d2323',
                          py: 2,
                          fontSize: '1.05rem',
                          fontWeight: 700,
                          borderRadius: 2,
                          borderWidth: 2,
                          textTransform: 'none',
                          position: 'relative',
                          overflow: 'hidden',
                          '&:hover': {
                            borderColor: '#5a1e1e',
                            borderWidth: 2,
                            bgcolor: 'rgba(109, 35, 35, 0.08)',
                            transform: 'translateY(-3px)',
                            boxShadow: '0 8px 32px rgba(109, 35, 35, 0.25)',
                          },
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                        onClick={() => navigate('/bulk-register')}
                      >
                        Bulk Registration
                      </Button>
                    </Box>
                  </Box>
                </form>
              </Paper>
            </Grow>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Registration;