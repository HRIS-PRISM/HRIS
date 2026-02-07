import API_BASE_URL from '../apiConfig';
import React, { useState, useEffect } from 'react';
import usePageAccess from '../hooks/usePageAccess';
import AccessDenied from './AccessDenied';
import LoadingOverlay from './LoadingOverlay';
import SuccessfulOverlay from './SuccessfulOverlay';
import {
  Container,
  Paper,
  Typography,
  Button,
  Alert,
  Box,
  Chip,
  CircularProgress,
  Grid,
  Fade,
  Divider,
  alpha,
  Zoom,
  Grow,
} from '@mui/material';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import {
  GroupAdd,
  CloudUpload,
  CheckCircleOutline,
  ErrorOutline,
  InfoOutlined,
  FileUpload,
  People,
  ArrowBack,
  AccountBalanceWallet,
  Business,
  AssignmentOutlined,
} from '@mui/icons-material';

const BulkRegister = () => {
  const [users, setUsers] = useState([]);
  const [success, setSuccess] = useState([]);
  const [errors, setErrors] = useState([]);
  const [errMessage, setErrMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
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

  // Email domain restriction state
  const [emailDomainRestricted, setEmailDomainRestricted] = useState(false);

  const navigate = useNavigate();

  // Color scheme matching ViewAttendanceRecord
  const primaryColor = '#6d2323';
  const creamColor = '#FEF9E1';
  const blackColor = '#000000';
  const whiteColor = '#FFFFFF';

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

  // Fetch email domain restriction setting
  useEffect(() => {
    const fetchEmailDomainRestriction = async () => {
      try {
        const token =
          localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(
          `${API_BASE_URL}/email-domain-restriction`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setEmailDomainRestricted(data.setting_value === true);
        }
      } catch (err) {
        console.error('Error fetching email domain restriction:', err);
      }
    };
    fetchEmailDomainRestriction();
  }, []);

  // Dynamic page access control using component identifier
  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('bulk-register');

  // Helper function to map employment category text to ID
  const mapEmploymentCategory = (categoryText) => {
    if (!categoryText) return null;
    
    const categoryLower = categoryText.toString().trim().toLowerCase();
    
    // Map text values to numeric IDs (0-5)
    const categoryMap = {
      // JO categories
      'jo graduate': '0',
      'jo graduated': '0',
      'job order graduate': '0',
      'job order graduated': '0',
      'graduate': '0',
      'graduated': '0',
      
      'jo undergrad': '1',
      'jo undergraduate': '1',
      'job order undergrad': '1',
      'job order undergraduate': '1',
      'undergrad': '1',
      'undergraduate': '1',
      
      // Regular categories
      'regular non-teaching': '2',
      'regular nonteaching': '2',
      'non-teaching': '2',
      'nonteaching': '2',
      
      'regular teaching (30hrs)': '3',
      'regular teaching 30hrs': '3',
      'teaching 30hrs': '3',
      'teaching (30hrs)': '3',
      '30hrs': '3',
      '30 hrs': '3',
      
      'regular designated (40hrs)': '4',
      'regular designated 40hrs': '4',
      'designated 40hrs': '4',
      'designated (40hrs)': '4',
      '40hrs': '4',
      '40 hrs': '4',

      // Custom category
      'other': '5',
      'custom': '5',
    };
    
    return categoryMap[categoryLower] || null;
  };

  // Helper function to validate email
  const validateEmail = (email) => {
    if (!email || typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;
    
    if (emailDomainRestricted) {
      return email.toLowerCase().endsWith('@earist.edu.ph');
    }
    
    return true;
  };

  // Handle file upload and parse Excel
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (worksheet.length === 0) {
          setErrMessage('Excel file is empty.');
          return;
        }

        const firstRow = worksheet[0];
        // Build required fields list dynamically based on field requirements
        const requiredFields = [];
        if (fieldRequirements.firstName) requiredFields.push('firstName');
        if (fieldRequirements.lastName) requiredFields.push('lastName');
        if (fieldRequirements.email) requiredFields.push('email');
        if (fieldRequirements.employeeNumber) requiredFields.push('employeeNumber');
        if (fieldRequirements.employmentCategory) requiredFields.push('employmentCategory');
        if (fieldRequirements.password) requiredFields.push('password');
        if (fieldRequirements.department) requiredFields.push('department');

        const missingFields = requiredFields.filter(
          (field) => !(field in firstRow)
        );

        if (missingFields.length > 0) {
          const optionalFields = [];
          if (!fieldRequirements.firstName) optionalFields.push('firstName');
          if (!fieldRequirements.lastName) optionalFields.push('lastName');
          if (!fieldRequirements.email) optionalFields.push('email');
          if (!fieldRequirements.employeeNumber) optionalFields.push('employeeNumber');
          if (!fieldRequirements.employmentCategory) optionalFields.push('employmentCategory');
          if (!fieldRequirements.password) optionalFields.push('password');
          if (!fieldRequirements.department) optionalFields.push('department');
          optionalFields.push('middleName', 'nameExtension', 'customCategory');

          setErrMessage(
            `Missing required columns: ${missingFields.join(
              ', '
            )}. ${optionalFields.length > 0 ? `Optional columns: ${optionalFields.join(', ')}` : ''}`
          );
          return;
        }

        const processedUsers = worksheet.map((user, index) => {
          // Map employment category text to ID
          let employmentCategoryValue = null;
          
          if (user.employmentCategory) {
            employmentCategoryValue = mapEmploymentCategory(user.employmentCategory);
          }
          
          // If employmentCategory is not required and not provided, leave it as null
          // The backend will set a default value if needed

          // Generate password from lastName if not provided
          let password = user.password?.toString().trim() || '';
          if (!password && user.lastName) {
            // Convert to uppercase and remove all spaces
            password = user.lastName
              .toString()
              .trim()
              .toUpperCase()
              .replace(/\s+/g, '');
          }

          // Process employeeNumber: remove dashes
          let employeeNumber = user.employeeNumber?.toString().trim() || '';
          if (employeeNumber) {
            employeeNumber = employeeNumber.replace(/-/g, '');
          }

          // Process customCategory
          let customCategory = user.customCategory?.toString().trim() || null;

          const processedUser = {
            firstName: user.firstName?.toString().trim() || '',
            middleName: user.middleName?.toString().trim() || null,
            lastName: user.lastName?.toString().trim() || '',
            nameExtension: user.nameExtension?.toString().trim() || null,
            email: user.email?.toString().trim() || '',
            employeeNumber: employeeNumber,
            password: password,
            role: 'staff',
            access_level: 'user',
            department: user.department?.toString().trim() || null,
            customCategory: customCategory,
          };

          // Only include employmentCategory if it has a valid value
          if (['0', '1', '2', '3', '4', '5'].includes(employmentCategoryValue)) {
            processedUser.employmentCategory = employmentCategoryValue;
          } else if (fieldRequirements.employmentCategory) {
            // Required but not provided - will be caught by validation
            processedUser.employmentCategory = null;
          }

          return processedUser;
        });

        const validationErrors = [];
        processedUsers.forEach((user, index) => {
          // Dynamic validation based on field requirements
          const missingFields = [];
          if (fieldRequirements.firstName && !user.firstName) {
            missingFields.push('firstName');
          }
          if (fieldRequirements.lastName && !user.lastName) {
            missingFields.push('lastName');
          }
          if (fieldRequirements.email && !user.email) {
            missingFields.push('email');
          }
          if (fieldRequirements.employeeNumber && !user.employeeNumber) {
            missingFields.push('employeeNumber');
          }
          if (fieldRequirements.password && !user.password) {
            missingFields.push('password');
          }
          if (fieldRequirements.employmentCategory && !user.employmentCategory) {
            missingFields.push('employmentCategory');
          }
          if (fieldRequirements.department && !user.department) {
            missingFields.push('department');
          }

          if (missingFields.length > 0) {
            validationErrors.push(
              `Row ${index + 2}: Missing required fields: ${missingFields.join(', ')}`
            );
          }

          // Validate employmentCategory format if it's provided
          if (user.employmentCategory && !['0', '1', '2', '3', '4', '5'].includes(user.employmentCategory)) {
            validationErrors.push(
              `Row ${index + 2}: Invalid employmentCategory. Must be one of: "JO Graduate", "JO UnderGrad", "Regular Non-Teaching", "Regular Teaching (30Hrs)", "Regular Designated (40Hrs)", "Other"`
            );
          }

          // Validate customCategory when employmentCategory is 5
          if (user.employmentCategory === '5') {
            if (!user.customCategory || user.customCategory.trim() === '') {
              validationErrors.push(
                `Row ${index + 2}: Custom category description is required when employment category is "Other"`
              );
            } else if (user.customCategory.length > 100) {
              validationErrors.push(
                `Row ${index + 2}: Custom category description must not exceed 100 characters`
              );
            }
          }

          // Email domain validation
          if (user.email && !validateEmail(user.email)) {
            if (emailDomainRestricted) {
              validationErrors.push(`Row ${index + 2}: Email must use @earist.edu.ph domain`);
            } else {
              validationErrors.push(`Row ${index + 2}: Invalid email format`);
            }
          }
        });

        if (validationErrors.length > 0) {
          setErrMessage(
            `Validation errors found:\n${validationErrors
              .slice(0, 5)
              .join('\n')}${validationErrors.length > 5 ? '\n...and more' : ''}`
          );
          return;
        }

        setUsers(processedUsers);
        setErrMessage('');
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        setErrMessage(
          'Error parsing Excel file. Please check the file format.'
        );
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Handle register via backend
  const handleRegister = async () => {
    if (users.length === 0) {
      setErrMessage('Please upload an Excel file first.');
      return;
    }

    setIsLoading(true);
    setErrMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/excel-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users }),
      });

      if (!response.ok) {
        // Try to parse error message
        let errorMessage = 'Registration failed.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseErr) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        setErrMessage(errorMessage);
        setIsLoading(false);
        return;
      }

      const result = await response.json();
      setSuccess(result.successful || []);
      setErrors(result.errors || []);
      setIsLoading(false);
      
      // Show success overlay if there are successful registrations
      if (result.successful && result.successful.length > 0) {
        setShowSuccessOverlay(true);
      }
    } catch (err) {
      console.error('Error uploading Excel:', err);
      setIsLoading(false);
      if (err.message.includes('Failed to fetch') || err.message.includes('CORS')) {
        setErrMessage('Cannot connect to server. Please check if the backend server is running and CORS is properly configured.');
      } else {
        setErrMessage(`Something went wrong while uploading: ${err.message}`);
      }
    }
  };

  const handleClearAll = () => {
    setUsers([]);
    setSuccess([]);
    setErrors([]);
    setErrMessage('');
  };

  // Loading state
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
          <CircularProgress sx={{ color: primaryColor, mb: 2 }} />
          <Typography
            variant="h6"
            sx={{ color: primaryColor, fontWeight: 600 }}
          >
            Loading access information...
          </Typography>
        </Box>
      </Container>
    );
  }

  // Access denied state
  if (!hasAccess) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Bulk User Registration. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }

  return (
    <Container
      maxWidth="xl"
      sx={{
        py: 3,
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
      <Grid container spacing={2.5} sx={{ position: 'relative', zIndex: 1 }}>
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
              <Box sx={{ p: 2.5, pt: 3.5 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <Box
                    sx={{
                      bgcolor: 'rgba(109, 35, 35, 0.1)',
                      p: 1.2,
                      borderRadius: 2,
                      display: 'flex',
                      mr: 1.5,
                      boxShadow: '0 2px 8px rgba(109, 35, 35, 0.15)',
                    }}
                  >
                    <InfoOutlined sx={{ color: '#6d2323', fontSize: 24 }} />
                  </Box>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700, color: '#6d2323', fontSize: '1rem' }}
                  >
                    Initial Setup Requirements
                  </Typography>
                </Box>

                <Divider
                  sx={{ mb: 2, borderColor: 'rgba(109, 35, 35, 0.1)' }}
                />

                <Typography
                  variant="body2"
                  sx={{
                    color: '#666',
                    mb: 2,
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                  }}
                >
                  Before registering users, ensure the following tables are
                  properly configured:
                </Typography>

                <Grid container spacing={1.5}>
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
                            p: 1.5,
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
                                mr: 1.5,
                                width: 36,
                                height: 36,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 1.5,
                                bgcolor: 'rgba(109, 35, 35, 0.1)',
                                color: '#6d2323',
                              }}
                            >
                              <item.icon sx={{ fontSize: 20 }} />
                            </Box>
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                  color: '#6d2323',
                                  mb: 0.25,
                                  fontSize: '0.875rem',
                                }}
                              >
                                {item.title}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: '#666',
                                  fontSize: '0.75rem',
                                  lineHeight: 1.3,
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
                              fontSize: '0.7rem',
                              px: 2,
                              py: 0.6,
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
                    mt: 2.5,
                    p: 2,
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
                      p: 0.6,
                      borderRadius: 1,
                      display: 'flex',
                      mt: 0.25,
                    }}
                  >
                    <InfoOutlined sx={{ fontSize: 18, color: '#f57c00' }} />
                  </Box>
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: '#f57c00',
                        mb: 0.5,
                        fontSize: '0.85rem',
                      }}
                    >
                      Important Note
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#666',
                        lineHeight: 1.4,
                        display: 'block',
                        fontSize: '0.75rem',
                      }}
                    >
                      These tables are essential for proper Payroll Management
                      Records. Complete setup before registering users.
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    mt: 2.5,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'rgba(109, 35, 35, 0.05)',
                    borderLeft: '4px solid #6d2323',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      bgcolor: 'rgba(109, 35, 35, 0.1)',
                      p: 0.6,
                      borderRadius: 1,
                      display: 'flex',
                      mt: 0.25,
                    }}
                  >
                    <InfoOutlined sx={{ fontSize: 18, color: '#6d2323' }} />
                  </Box>
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: '#6d2323',
                        mb: 0.5,
                        fontSize: '0.85rem',
                      }}
                    >
                      Excel File Requirements
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#666',
                        lineHeight: 1.4,
                        display: 'block',
                        fontSize: '0.75rem',
                        mb: 0.5,
                      }}
                    >
                      <strong>EmploymentCategory</strong> values:
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#666',
                        lineHeight: 1.4,
                        display: 'block',
                        fontSize: '0.7rem',
                        mb: 0.3,
                      }}
                    >
                      • Job Order: <strong>"JO Graduate"</strong> or <strong>"JO UnderGrad"</strong>
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#666',
                        lineHeight: 1.4,
                        display: 'block',
                        fontSize: '0.7rem',
                        mb: 0.3,
                      }}
                    >
                      • Regular: <strong>"Regular Non-Teaching"</strong>, <strong>"Regular Teaching (30Hrs)"</strong>, or <strong>"Regular Designated (40Hrs)"</strong>
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#666',
                        lineHeight: 1.4,
                        display: 'block',
                        fontSize: '0.7rem',
                        mb: 0.5,
                      }}
                    >
                      • Custom: <strong>"Other"</strong> (requires <strong>customCategory</strong> column)
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#666',
                        lineHeight: 1.4,
                        display: 'block',
                        fontSize: '0.7rem',
                        mb: 0.3,
                      }}
                    >
                      <strong>CustomCategory:</strong> Required when category is "Other" (max 100 chars)
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#666',
                        lineHeight: 1.4,
                        display: 'block',
                        fontSize: '0.7rem',
                        mb: 0.3,
                      }}
                    >
                      <strong>EmployeeNumber:</strong> Accepts alphanumeric with hyphens (e.g., 2013-4410, 2013-4507M)
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#666',
                        lineHeight: 1.4,
                        display: 'block',
                        fontSize: '0.7rem',
                        mb: 0.3,
                      }}
                    >
                      <strong>Password:</strong> Auto-set to last name in CAPS (no spaces)
                    </Typography>
                    {emailDomainRestricted && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: '#666',
                          lineHeight: 1.4,
                          display: 'block',
                          fontSize: '0.7rem',
                        }}
                      >
                        <strong>Email:</strong> Only <strong>@earist.edu.ph</strong> allowed
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Fade>
        </Grid>

        {/* Main Content - Right Side */}
        <Grid item xs={12} lg={8}>
          <Box sx={{ height: '100%' }}>
            <Grow in={true} timeout={600}>
              <Paper
                elevation={0}
                sx={{
                  padding: { xs: 2.5, sm: 3, md: 3.5 },
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
                <Box sx={{ textAlign: 'center', mb: 3, pt: 1.5 }}>
                  <Zoom in={true} timeout={400}>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          bgcolor: 'rgba(109, 35, 35, 0.1)',
                          p: 1.5,
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
                        <GroupAdd sx={{ fontSize: 40, color: '#6d2323' }} />
                      </Box>
                    </Box>
                  </Zoom>
                  <Typography
                    variant="h5"
                    sx={{
                      color: '#6d2323',
                      fontWeight: 800,
                      mb: 0.5,
                      background:
                        'linear-gradient(135deg, #6d2323 0%, #8a4747 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      letterSpacing: '-0.5px',
                    }}
                  >
                    Bulk Users Registration
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#8a4747',
                      fontSize: '0.95rem',
                      fontWeight: 500,
                      maxWidth: 500,
                      mx: 'auto',
                    }}
                  >
                    Register multiple users using Excel file
                  </Typography>
                </Box>

                {/* Error Message */}
                {errMessage && (
                  <Fade in timeout={300}>
                    <Alert
                      icon={<ErrorOutline fontSize="inherit" />}
                      severity="error"
                      sx={{
                        mb: 2.5,
                        backgroundColor: '#fff',
                        color: '#d32f2f',
                        border: '2px solid #d32f2f',
                        borderRadius: 2,
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        boxShadow: '0 4px 12px rgba(211, 47, 47, 0.2)',
                        whiteSpace: 'pre-line',
                        '& .MuiAlert-icon': {
                          color: '#d32f2f',
                        },
                      }}
                      onClose={() => setErrMessage('')}
                    >
                      {errMessage}
                    </Alert>
                  </Fade>
                )}

                {/* Instructions Card */}
                <Fade in timeout={700}>
                  <Box sx={{ mb: 2.5 }}>
                    <Box display="flex" alignItems="center" mb={1.5}>
                      <InfoOutlined
                        sx={{ color: primaryColor, mr: 1, fontSize: 24 }}
                      />
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: blackColor,
                          fontSize: '1rem',
                        }}
                      >
                        Excel File Requirements
                      </Typography>
                    </Box>

                    <Divider
                      sx={{ mb: 1.5, borderColor: 'rgba(109, 35, 35, 0.1)' }}
                    />

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 600,
                            color: blackColor,
                            mb: 0.75,
                            fontSize: '0.875rem',
                          }}
                        >
                          Required Columns:
                        </Typography>
                        <Box
                          sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}
                        >
                          {[
                            { key: 'firstName', label: 'firstName' },
                            { key: 'lastName', label: 'lastName' },
                            { key: 'email', label: 'email' },
                            { key: 'employeeNumber', label: 'employeeNumber' },
                            { key: 'employmentCategory', label: 'employmentCategory' },
                            { key: 'password', label: 'password' },
                            { key: 'department', label: 'department' },
                          ]
                            .filter((field) => fieldRequirements[field.key])
                            .map((field) => (
                              <Chip
                                key={field.key}
                                label={field.label}
                                size="small"
                                sx={{
                                  bgcolor: primaryColor,
                                  color: whiteColor,
                                  fontSize: '0.7rem',
                                  fontWeight: 500,
                                  height: 22,
                                }}
                              />
                            ))}
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 600,
                            color: blackColor,
                            mb: 0.75,
                            fontSize: '0.875rem',
                          }}
                        >
                          Optional Columns:
                        </Typography>
                        <Box
                          sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}
                        >
                          {[
                            { key: 'firstName', label: 'firstName' },
                            { key: 'lastName', label: 'lastName' },
                            { key: 'email', label: 'email' },
                            { key: 'employeeNumber', label: 'employeeNumber' },
                            { key: 'employmentCategory', label: 'employmentCategory' },
                            { key: 'password', label: 'password' },
                            { key: 'department', label: 'department' },
                            { key: 'middleName', label: 'middleName' },
                            { key: 'nameExtension', label: 'nameExtension' },
                            { key: 'customCategory', label: 'customCategory' },
                          ]
                            .filter((field) => !fieldRequirements[field.key])
                            .map((field) => (
                              <Chip
                                key={field.key}
                                label={field.label}
                                size="small"
                                variant="outlined"
                                sx={{
                                  borderColor: primaryColor,
                                  color: primaryColor,
                                  fontSize: '0.7rem',
                                  height: 22,
                                }}
                              />
                            ))}
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Fade>

                {/* Upload Card */}
                <Fade in timeout={900}>
                  <Box sx={{ mb: 2.5 }}>
                    <Box
                      sx={{
                        p: 3,
                        border: `2px dashed ${alpha(primaryColor, 0.3)}`,
                        borderRadius: 3,
                        backgroundColor: alpha(creamColor, 0.3),
                        textAlign: 'center',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          borderColor: primaryColor,
                          backgroundColor: alpha(creamColor, 0.5),
                          transform: 'translateY(-2px)',
                        },
                      }}
                    >
                      <FileUpload
                        sx={{ fontSize: 52, color: primaryColor, mb: 1.5 }}
                      />
                      <Typography
                        variant="h6"
                        sx={{
                          color: blackColor,
                          mb: 1.5,
                          fontWeight: 600,
                          fontSize: '1rem',
                        }}
                      >
                        Upload Excel File
                      </Typography>
                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                        id="file-upload"
                      />
                      <label htmlFor="file-upload">
                        <Button
                          component="span"
                          variant="contained"
                          startIcon={<CloudUpload />}
                          sx={{
                            bgcolor: primaryColor,
                            color: whiteColor,
                            py: 1.2,
                            px: 3.5,
                            fontWeight: 600,
                            borderRadius: 2,
                            fontSize: '0.9rem',
                            '&:hover': {
                              bgcolor: alpha(primaryColor, 0.8),
                              transform: 'translateY(-2px)',
                              boxShadow: '0 4px 12px rgba(109, 35, 35, 0.3)',
                            },
                            transition: 'all 0.2s ease',
                          }}
                        >
                          Choose File
                        </Button>
                      </label>
                    </Box>
                  </Box>
                </Fade>

                {/* Users Loaded Status */}
                {users.length > 0 && (
                  <Fade in timeout={500}>
                    <Box sx={{ mb: 2.5 }}>
                      <Box
                        sx={{
                          p: 2.5,
                          background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
                          color: whiteColor,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderRadius: 3,
                        }}
                      >
                        <Box display="flex" alignItems="center">
                          <People sx={{ fontSize: 28, mr: 1.5 }} />
                          <Box>
                            <Typography variant="caption" sx={{ opacity: 0.9 }}>
                              Users Ready
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {users.length} user{users.length !== 1 ? 's' : ''}{' '}
                              loaded
                            </Typography>
                          </Box>
                        </Box>
                        <CheckCircleOutline
                          sx={{ fontSize: 40, opacity: 0.3 }}
                        />
                      </Box>
                    </Box>
                  </Fade>
                )}

                {/* Action Buttons */}
                <Box
                  sx={{
                    mt: 3,
                    pt: 2.5,
                    borderTop: '2px dashed rgba(109, 35, 35, 0.15)',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 2,
                      flexDirection: { xs: 'column', sm: 'row' },
                    }}
                  >
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<CloudUpload sx={{ fontSize: 22 }} />}
                      onClick={handleRegister}
                      disabled={users.length === 0}
                      sx={{
                        bgcolor: '#6d2323',
                        py: 1.5,
                        fontSize: '0.95rem',
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
                        '&:disabled': {
                          bgcolor: alpha('#6d2323', 0.3),
                          color: alpha(whiteColor, 0.5),
                        },
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      Upload & Register Users
                    </Button>

                    <Button
                      type="button"
                      variant="outlined"
                      fullWidth
                      startIcon={<ArrowBack sx={{ fontSize: 22 }} />}
                      sx={{
                        borderColor: '#6d2323',
                        color: '#6d2323',
                        py: 1.5,
                        fontSize: '0.95rem',
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
                      onClick={() => navigate('/registration')}
                    >
                      Back to User Registration
                    </Button>
                  </Box>
                </Box>

                {/* Success Results */}
                {success.length > 0 && (
                  <Fade in timeout={500}>
                    <Box sx={{ mt: 2.5 }}>
                      <Box
                        sx={{
                          p: 1.5,
                          bgcolor: '#4caf50',
                          color: whiteColor,
                          borderRadius: '12px 12px 0 0',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <CheckCircleOutline sx={{ mr: 1, fontSize: 20 }} />
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 600, fontSize: '0.95rem' }}
                        >
                          Successful Registrations ({success.length})
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          maxHeight: '200px',
                          overflow: 'auto',
                          bgcolor: '#fff',
                          borderRadius: '0 0 12px 12px',
                          p: 1.5,
                        }}
                      >
                        {success.map((user, index) => (
                          <Box
                            key={index}
                            sx={{
                              p: 1.2,
                              mb: 1,
                              borderRadius: 2,
                              bgcolor: alpha('#4caf50', 0.05),
                              display: 'flex',
                              alignItems: 'center',
                              '&:last-child': { mb: 0 },
                            }}
                          >
                            <Chip
                              label={user.employeeNumber}
                              size="small"
                              sx={{
                                mr: 1.5,
                                bgcolor: primaryColor,
                                color: whiteColor,
                                fontWeight: 600,
                                fontSize: '0.75rem',
                              }}
                            />
                            <Typography
                              variant="body2"
                              sx={{ color: blackColor, fontSize: '0.875rem' }}
                            >
                              {user.name}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Fade>
                )}

                {/* Error Results */}
                {errors.length > 0 && (
                  <Fade in timeout={500}>
                    <Box sx={{ mt: 2.5 }}>
                      <Box
                        sx={{
                          p: 1.5,
                          bgcolor: '#f44336',
                          color: whiteColor,
                          borderRadius: '12px 12px 0 0',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <ErrorOutline sx={{ mr: 1, fontSize: 20 }} />
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 600, fontSize: '0.95rem' }}
                        >
                          Registration Errors ({errors.length})
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          maxHeight: '200px',
                          overflow: 'auto',
                          bgcolor: '#fff',
                          borderRadius: '0 0 12px 12px',
                          p: 1.5,
                        }}
                      >
                        {errors.slice(0, 10).map((err, index) => (
                          <Box
                            key={index}
                            sx={{
                              p: 1.2,
                              mb: 1,
                              borderRadius: 2,
                              bgcolor: alpha('#f44336', 0.05),
                              '&:last-child': { mb: 0 },
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ color: blackColor, fontSize: '0.875rem' }}
                            >
                              • {err}
                            </Typography>
                          </Box>
                        ))}
                        {errors.length > 10 && (
                          <Box sx={{ p: 1.2, textAlign: 'center' }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontStyle: 'italic',
                                color: alpha(blackColor, 0.6),
                                fontSize: '0.85rem',
                              }}
                            >
                              ...and {errors.length - 10} more errors
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Fade>
                )}
              </Paper>
            </Grow>
          </Box>
        </Grid>
      </Grid>

      {/* Loading Overlay */}
      <LoadingOverlay 
        open={isLoading} 
        message={`Uploading ${users.length} user${users.length !== 1 ? 's' : ''}...`}
      />

      {/* Success Overlay */}
      <SuccessfulOverlay
        open={showSuccessOverlay}
        action="create"
        onClose={() => setShowSuccessOverlay(false)}
        showOkButton={true}
      />
    </Container>
  );
};

export default BulkRegister;