import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useCRUDButtonStyles } from '../../hooks/useCRUDButtonStyles';

import {
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Container,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Card,
  CardContent,
  Grid,
  InputAdornment,
  Avatar,
  Tooltip,
  Chip,
  Fade,
  Alert,
  useTheme,
  styled,
  Divider,
  CardHeader,
  Checkbox,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Close,
  Schedule,
  UploadFile,
  FilterList,
  Person,
  AccessTime,
} from '@mui/icons-material';

import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import CircularProgress from '@mui/material/CircularProgress';

// Helper function to convert hex to rgb
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
        result[3],
        16
      )}`
    : '109, 35, 35';
};

// Styled components - colors will be applied via sx prop
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
  })
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

const PremiumTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: 16,
  overflow: 'auto', // Enable both horizontal and vertical scrolling
  boxShadow: '0 4px 24px rgba(109, 35, 35, 0.06)',
  border: '1px solid rgba(109, 35, 35, 0.08)',
  maxHeight: '600px', // Set max height for vertical scrolling
  '&::-webkit-scrollbar': {
    width: '8px',
    height: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'rgba(254, 249, 225, 0.3)',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(109, 35, 35, 0.4)',
    borderRadius: '4px',
    '&:hover': {
      background: 'rgba(109, 35, 35, 0.6)',
    },
  },
}));

const PremiumTableCell = styled(TableCell)(({ theme, isHeader = false }) => ({
  fontWeight: isHeader ? 600 : 500,
  padding: '18px 20px',
  borderBottom: isHeader
    ? '2px solid rgba(254, 249, 225, 0.5)'
    : '1px solid rgba(109, 35, 35, 0.06)',
  fontSize: '0.95rem',
  letterSpacing: '0.025em',
  minWidth: '120px', // Ensure minimum width for cells
  whiteSpace: 'nowrap', // Prevent text wrapping
}));

const OfficialTimeForm = () => {
  const { settings } = useSystemSettings();

  // Get colors from system settings
  const primaryColor = settings.accentColor || '#FEF9E1'; // Cards color
  const secondaryColor = settings.backgroundColor || '#FFF8E7'; // Background
  const accentColor = settings.primaryColor || '#6D2323'; // Primary accent
  const accentDark = settings.secondaryColor || '#8B3333'; // Darker accent
  const textPrimaryColor = settings.textPrimaryColor || '#6D2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';
  const hoverColor = settings.hoverColor || '#6D2323';
  const blackColor = '#1a1a1a';
  const whiteColor = '#FFFFFF';
  const grayColor = '#6c757d';

  //ACCESSING
  // Dynamic page access control using component identifier
  // The identifier 'official-time' should match the component_identifier in the pages table
  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('official-time');
  // ACCESSING END

  const [employeeID, setemployeeID] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState(false);

  const [file, setFile] = useState(null);

  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewRecords, setPreviewRecords] = useState([]);

  // Auto-save states
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const autoSaveTimeoutRef = useRef(null);

  // All users view states
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [settingDefault, setSettingDefault] = useState(false);

  // Schedule table view: 'workDays' | 'honorarium' | 'serviceCredits' | 'overtime'
  const [scheduleView, setScheduleView] = useState('workDays');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  };

  const defaultRecords = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ].map((day) => ({
    employeeID,
    day,
    officialTimeIN: '08:00:00 AM',
    officialBreaktimeIN: '00:00:00 AM',
    officialBreaktimeOUT: '00:00:00 PM',
    officialTimeOUT: '05:00:00 PM',
    officialHonorariumTimeIN: '00:00:00 AM',
    officialHonorariumTimeOUT: '00:00:00 PM',
    officialServiceCreditTimeIN: '00:00:00 AM',
    officialServiceCreditTimeOUT: '00:00:00 AM',
    officialOverTimeIN: '00:00:00 AM',
    officialOverTimeOUT: '00:00:00 PM',
    breaktime: '',
  }));

  const handleSearch = () => {
    if (!employeeID) {
      setSuccessAction('Please enter an Employee ID.');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      return;
    }

    setLoading(true);
    axios
      .get(`${API_BASE_URL}/officialtimetable/${employeeID}`, getAuthHeaders())
      .then((res) => {
        setLoading(false);
        if (res.data.length > 0) {
          setRecords(res.data);
          setFound(true);
        } else {
          setRecords(defaultRecords);
          setFound(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching data:', err);
        setLoading(false);
        setSuccessAction('Error fetching records.');
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2000);
      });
  };

  const handleChange = (index, field, value) => {
    const updatedRecords = [...records];
    updatedRecords[index][field] = value;
    setRecords(updatedRecords);

    // Auto-save with debouncing (1.5 seconds delay)
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSaveRecords(updatedRecords);
    }, 1500);
  };

  const autoSaveRecords = async (recordsToSave) => {
    if (!employeeID || !recordsToSave || recordsToSave.length === 0) {
      return;
    }

    setAutoSaving(true);
    try {
      await axios.post(
        `${API_BASE_URL}/officialtimetable`,
        {
          employeeID,
          records: recordsToSave,
        },
        getAuthHeaders()
      );
      setLastSaved(new Date());
      setFound(true); // Mark as found since we've saved
    } catch (err) {
      console.error('Error auto-saving records:', err);
      // Don't show error to user for auto-save failures
    } finally {
      setAutoSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!employeeID) {
      setSuccessAction('Please enter a valid Employee ID.');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      return;
    }

    // Clear any pending auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    setLoading(true);
    axios
      .post(
        `${API_BASE_URL}/officialtimetable`,
        {
          employeeID,
          records,
        },
        getAuthHeaders()
      )
      .then((res) => {
        setLoading(false);
        setLastSaved(new Date());
        setSuccessAction(found ? 'Updated Successfully' : 'Saved Successfully');
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2000);
      })
      .catch((err) => {
        console.error('Error saving data:', err);
        setLoading(false);
        setSuccessAction('Error saving records.');
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2000);
      });
  };

  // Fetch all users with official time status
  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/officialtime/users-status`,
        getAuthHeaders()
      );
      setAllUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setSuccessAction('Error fetching users.');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Set default official time for selected users
  const handleSetDefaultForSelected = async () => {
    if (selectedUsers.size === 0) {
      setSuccessAction('Please select at least one user.');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      return;
    }

    setSettingDefault(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/officialtime/set-default-for-users`,
        { employeeNumbers: Array.from(selectedUsers) },
        getAuthHeaders()
      );

      setSuccessAction(
        `Default official time set for ${response.data.inserted || 0} users successfully.`
      );
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);

      // Refresh users list
      await fetchAllUsers();
      setSelectedUsers(new Set());
    } catch (error) {
      console.error('Error setting default official time:', error);
      setSuccessAction('Error setting default official time.');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } finally {
      setSettingDefault(false);
    }
  };

  // Set default for all users without official time
  const handleSetDefaultForAll = async () => {
    const usersWithoutDefault = allUsers
      .filter((u) => !u.hasDefaultOfficialTime)
      .map((u) => u.employeeNumber);

    if (usersWithoutDefault.length === 0) {
      setSuccessAction('All users already have default official time.');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      return;
    }

    setSettingDefault(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/officialtime/set-default-for-users`,
        { employeeNumbers: usersWithoutDefault },
        getAuthHeaders()
      );

      setSuccessAction(
        `Default official time set for ${response.data.inserted || 0} users successfully.`
      );
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);

      // Refresh users list
      await fetchAllUsers();
    } catch (error) {
      console.error('Error setting default official time:', error);
      setSuccessAction('Error setting default official time.');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } finally {
      setSettingDefault(false);
    }
  };

  const handleUserSelect = (employeeNumber) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(employeeNumber)) {
        newSet.delete(employeeNumber);
      } else {
        newSet.add(employeeNumber);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked) => {
    const filtered = getFilteredUsers();
    if (checked) {
      setSelectedUsers(new Set(filtered.map((u) => u.employeeNumber)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const getFilteredUsers = () => {
    let filtered = allUsers.slice();

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((user) => {
        const full = (user.fullName || '').toLowerCase();
        const emp = (user.employeeNumber || '').toLowerCase();
        return full.includes(q) || emp.includes(q);
      });
    }

    return filtered;
  };

  useEffect(() => {
    if (showAllUsers) {
      fetchAllUsers();
    }
  }, [showAllUsers]);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const PreviewModal = () => (
    <Dialog
      open={showPreviewModal}
      onClose={() => setShowPreviewModal(false)}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          border: '3px solid #6D2323',
        },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: '#6D2323',
          color: '#FEF9E1',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
        }}
      >
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          Uploaded Records Preview
        </Typography>
        <IconButton
          onClick={() => setShowPreviewModal(false)}
          sx={{
            color: '#FEF9E1',
            '&:hover': {
              backgroundColor: 'rgba(254, 249, 225, 0.1)',
            },
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <PremiumTableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(254, 249, 225, 0.7)' }}>
              {[
                'Employee Number',
                'Day',
                'Time In',
                'Break In',
                'Break Out',
                'Time Out',
                'Honorarium Time In',
                'Honorarium Time Out',
                'Service Credit Time In',
                'Service Credit Time Out',
                'Over-Time In',
                'Over-Time Out',
              ].map((header, i) => (
                <PremiumTableCell key={i} isHeader sx={{ color: accentColor }}>
                  {header}
                </PremiumTableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {previewRecords.map((record, index) => (
              <TableRow
                key={index}
                sx={{
                  '&:nth-of-type(even)': {
                    bgcolor: 'rgba(254, 249, 225, 0.3)',
                  },
                  '&:hover': { bgcolor: 'rgba(109, 35, 35, 0.05)' },
                  transition: 'all 0.2s ease',
                }}
              >
                <PremiumTableCell>{record.employeeID}</PremiumTableCell>
                <PremiumTableCell>{record.day}</PremiumTableCell>
                <PremiumTableCell>{record.officialTimeIN}</PremiumTableCell>
                <PremiumTableCell>
                  {record.officialBreaktimeIN}
                </PremiumTableCell>
                <PremiumTableCell>
                  {record.officialBreaktimeOUT}
                </PremiumTableCell>
                <PremiumTableCell>{record.officialTimeOUT}</PremiumTableCell>
                <PremiumTableCell>
                  {record.officialHonorariumTimeIN}
                </PremiumTableCell>
                <PremiumTableCell>
                  {record.officialHonorariumTimeOUT}
                </PremiumTableCell>
                <PremiumTableCell>
                  {record.officialServiceCreditTimeIN}
                </PremiumTableCell>
                <PremiumTableCell>
                  {record.officialServiceCreditTimeOUT}
                </PremiumTableCell>
                <PremiumTableCell>{record.officialOverTimeIN}</PremiumTableCell>
                <PremiumTableCell>
                  {record.officialOverTimeOUT}
                </PremiumTableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </PremiumTableContainer>
      <DialogActions
        sx={{
          backgroundColor: '#FEF9E1',
          padding: '16px 24px',
          justifyContent: 'center',
        }}
      >
        <ProfessionalButton
          onClick={() => setShowPreviewModal(false)}
          variant="contained"
          sx={{
            backgroundColor: accentColor,
            color: primaryColor,
            '&:hover': {
              backgroundColor: accentDark,
            },
          }}
        >
          Close
        </ProfessionalButton>
      </DialogActions>
    </Dialog>
  );

  const handleUpload = async () => {
    if (!file) {
      setSuccessAction('Please select a file!');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/upload-excel-faculty-official-time`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
        }
      );
      setLoading(false);

      // Display uploaded records in modal if they exist
      if (response.data.records && response.data.records.length > 0) {
        setPreviewRecords(response.data.records);
        setShowPreviewModal(true);
      }

      setSuccessAction(
        `${response.data.message} (Inserted: ${response.data.inserted}, Updated: ${response.data.updated})`
      );
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);

      // Clear file selection
      setFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      setLoading(false);
      setSuccessAction('Upload failed!');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    }
  };

  // ACCESSING 2
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
          <CircularProgress sx={{ color: '#6d2323', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#6d2323' }}>
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
        message="You do not have permission to access Official Time Form. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }
  //ACCESSING END2

  return (
    <>
      {/* LoadingOverlay - Now outside everything to cover full page */}
      <LoadingOverlay open={loading} message="Processing..." />

      <Box
        sx={{
          py: 4,
          borderRadius: '14px',
          width: '100vw', // Full viewport width
          mx: 'auto', // Center horizontally
          maxWidth: '100%', // Ensure it doesn't exceed viewport
          overflow: 'hidden', // Prevent horizontal scroll
          position: 'relative',
          left: '50%',
          transform: 'translateX(-50%)', // Center the element
        }}
      >
        {/* Wider Container */}
        <Box sx={{ px: 6, mx: 'auto', maxWidth: '1600px' }}>
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
                      background: `radial-gradient(circle, ${alpha(accentColor, 0.1)} 0%, ${alpha(accentColor, 0)} 70%)`,
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -30,
                      left: '30%',
                      width: 150,
                      height: 150,
                      background: `radial-gradient(circle, ${alpha(accentColor, 0.08)} 0%, ${alpha(accentColor, 0)} 70%)`,
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
                        <Schedule sx={{ color: textPrimaryColor, fontSize: 32 }} />
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
                          Official Time Schedule
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{
                            opacity: 0.8,
                            fontWeight: 400,
                            color: textPrimaryColor,
                          }}
                        >
                          Manage and update official time schedules for
                          employees
                        </Typography>
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Chip
                        label="System Generated"
                        size="small"
                        sx={{
                          bgcolor: alpha(accentColor, 0.15),
                          color: textPrimaryColor,
                          fontWeight: 500,
                          '& .MuiChip-label': { px: 1 },
                        }}
                      />
                      <ProfessionalButton
                        variant={showAllUsers ? 'contained' : 'outlined'}
                        onClick={() => {
                          setShowAllUsers(!showAllUsers);
                          if (!showAllUsers) {
                            fetchAllUsers();
                          }
                        }}
                        startIcon={<PeopleIcon />}
                        sx={{
                          bgcolor: showAllUsers ? accentColor : 'transparent',
                          color: showAllUsers ? primaryColor : textPrimaryColor,
                          borderColor: accentColor,
                          '&:hover': {
                            bgcolor: showAllUsers ? accentDark : alpha(accentColor, 0.1),
                          },
                        }}
                      >
                        {showAllUsers ? 'Hide All Users' : 'View All Users'}
                      </ProfessionalButton>
                      <Tooltip title="Refresh Data">
                        <IconButton
                          onClick={handleSearch}
                          disabled={!employeeID}
                          sx={{
                            bgcolor: alpha(accentColor, 0.1),
                            '&:hover': { bgcolor: alpha(accentColor, 0.2) },
                            color: textPrimaryColor,
                            width: 48,
                            height: 48,
                            '&:disabled': {
                              bgcolor: alpha(accentColor, 0.05),
                              color: alpha(accentColor, 0.3),
                            },
                          }}
                        >
                          <SearchIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Box>
              </GlassCard>
            </Box>
          </Fade>

          {/* Controls */}
          <Fade in timeout={700}>
            <GlassCard
              sx={{
                mb: 4,
                background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
                boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`,
                border: `1px solid ${alpha(accentColor, 0.1)}`,
                '&:hover': {
                  boxShadow: `0 12px 48px ${alpha(accentColor, 0.15)}`,
                },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box component="form">
                  <Grid container spacing={4} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={4}>
                      <ModernTextField
                        fullWidth
                        label="Employee Number"
                        value={employeeID}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d+$/.test(value)) {
                            setemployeeID(value);
                          }
                        }}
                        onKeyPress={(e) => {
                          if (!/[0-9]/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Person sx={{ color: textPrimaryColor }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box display="flex" gap={2} alignItems="flex-end">
                        <ProfessionalButton
                          variant="contained"
                          onClick={handleSearch}
                          startIcon={<SearchIcon />}
                          disabled={!employeeID}
                          sx={{
                            bgcolor: accentColor,
                            color: primaryColor,
                          }}
                        >
                          Search
                        </ProfessionalButton>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          id="upload-button"
                          style={{ display: 'none' }}
                          onChange={(e) => setFile(e.target.files[0])}
                        />
                        <label htmlFor="upload-button">
                          <ProfessionalButton
                            variant="outlined"
                            component="span"
                            startIcon={<CloudUploadIcon />}
                            sx={{
                              borderColor: accentColor,
                              color: textPrimaryColor,
                              '&:hover': {
                                backgroundColor: alpha(accentColor, 0.1),
                              },
                            }}
                          >
                            Choose File
                          </ProfessionalButton>
                        </label>
                        <ProfessionalButton
                          variant="contained"
                          onClick={handleUpload}
                          disabled={!file}
                          startIcon={<CloudUploadIcon />}
                          sx={{
                            bgcolor: accentColor,
                            color: primaryColor,
                          }}
                        >
                          Upload
                        </ProfessionalButton>
                        {file && (
                          <Typography variant="body2" sx={{ color: alpha(textPrimaryColor, 0.8) }}>
                            {file.name}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                  <Divider sx={{ my: 2, borderColor: alpha(accentColor, 0.1) }} />
                  <Typography
                    variant="body2"
                    sx={{ color: alpha(textPrimaryColor, 0.7) }}
                  >
                    Search for employee by number or upload Excel file with time schedules
                  </Typography>
                </Box>
              </CardContent>
            </GlassCard>
          </Fade>

          {/* Results */}
          {records.length > 0 && (
            <Fade in={!loading} timeout={500}>
              <GlassCard
                sx={{
                  mb: 4,
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
                    p: 4,
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    color: textPrimaryColor,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{
                        opacity: 0.8,
                        mb: 0.5,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: accentDark,
                      }}
                    >
                      Time Schedule for Employee Number
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 600, mb: 1, color: accentColor }}
                    >
                      {employeeID}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mt: 2,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Chip
                        icon={<AccessTime />}
                        label={found ? 'Existing Schedule' : 'New Schedule'}
                        size="small"
                        sx={{
                          bgcolor: alpha(accentColor, 0.15),
                          color: textPrimaryColor,
                          fontWeight: 500,
                        }}
                      />
                      <Divider orientation="vertical" flexItem sx={{ borderColor: alpha(accentColor, 0.3) }} />
                      <Button
                        variant={scheduleView === 'workDays' ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setScheduleView('workDays')}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          bgcolor: scheduleView === 'workDays' ? accentColor : 'transparent',
                          color: scheduleView === 'workDays' ? primaryColor : accentColor,
                          borderColor: accentColor,
                          '&:hover': {
                            bgcolor: scheduleView === 'workDays' ? accentDark : alpha(accentColor, 0.1),
                          },
                        }}
                      >
                        Work Days
                      </Button>
                      <Button
                        variant={scheduleView === 'honorarium' ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setScheduleView('honorarium')}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          bgcolor: scheduleView === 'honorarium' ? accentColor : 'transparent',
                          color: scheduleView === 'honorarium' ? primaryColor : accentColor,
                          borderColor: accentColor,
                          '&:hover': {
                            bgcolor: scheduleView === 'honorarium' ? accentDark : alpha(accentColor, 0.1),
                          },
                        }}
                      >
                        Honorarium
                      </Button>
                      <Button
                        variant={scheduleView === 'serviceCredits' ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setScheduleView('serviceCredits')}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          bgcolor: scheduleView === 'serviceCredits' ? accentColor : 'transparent',
                          color: scheduleView === 'serviceCredits' ? primaryColor : accentColor,
                          borderColor: accentColor,
                          '&:hover': {
                            bgcolor: scheduleView === 'serviceCredits' ? accentDark : alpha(accentColor, 0.1),
                          },
                        }}
                      >
                        Service Credits
                      </Button>
                      <Button
                        variant={scheduleView === 'overtime' ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setScheduleView('overtime')}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          bgcolor: scheduleView === 'overtime' ? accentColor : 'transparent',
                          color: scheduleView === 'overtime' ? primaryColor : accentColor,
                          borderColor: accentColor,
                          '&:hover': {
                            bgcolor: scheduleView === 'overtime' ? accentDark : alpha(accentColor, 0.1),
                          },
                        }}
                      >
                        OverTime
                      </Button>
                    </Box>
                  </Box>
                  <Avatar
                    sx={{
                      bgcolor: alpha(accentColor, 0.15),
                      width: 80,
                      height: 80,
                      fontSize: '2rem',
                      fontWeight: 600,
                      color: textPrimaryColor,
                    }}
                  >
                    <Schedule />
                  </Avatar>
                </Box>

                <Box component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
                  <PremiumTableContainer>
                    <Table
                      stickyHeader
                      sx={{
                        minWidth: scheduleView === 'workDays' ? '900px' : '700px',
                      }}
                    >
                      <TableHead sx={{ bgcolor: alpha(primaryColor, 0.7) }}>
                        <TableRow>
                          {scheduleView === 'workDays' &&
                            ['Employee Number', 'Day', 'Time In', 'Break In', 'Break Out', 'Time Out'].map((header, i) => (
                              <PremiumTableCell key={i} isHeader sx={{ color: accentColor }}>
                                {header}
                              </PremiumTableCell>
                            ))}
                          {scheduleView === 'honorarium' &&
                            ['Employee Number', 'Day', 'Honorarium Time In', 'Honorarium Time Out'].map((header, i) => (
                              <PremiumTableCell key={i} isHeader sx={{ color: accentColor }}>
                                {header}
                              </PremiumTableCell>
                            ))}
                          {scheduleView === 'serviceCredits' &&
                            ['Employee Number', 'Day', 'Service Credit Time In', 'Service Credit Time Out'].map((header, i) => (
                              <PremiumTableCell key={i} isHeader sx={{ color: accentColor }}>
                                {header}
                              </PremiumTableCell>
                            ))}
                          {scheduleView === 'overtime' &&
                            ['Employee Number', 'Day', 'Over-Time In', 'Over-Time Out'].map((header, i) => (
                              <PremiumTableCell key={i} isHeader sx={{ color: accentColor }}>
                                {header}
                              </PremiumTableCell>
                            ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {records.map((record, index) => (
                          <TableRow
                            key={index}
                            sx={{
                              '&:nth-of-type(even)': {
                                bgcolor: alpha(primaryColor, 0.3),
                              },
                              '&:hover': { bgcolor: alpha(accentColor, 0.05) },
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {scheduleView === 'workDays' && (
                              <>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.employeeID}
                                    InputProps={{ readOnly: true }}
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.day}
                                    InputProps={{ readOnly: true }}
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.officialTimeIN}
                                    onChange={(e) => handleChange(index, 'officialTimeIN', e.target.value)}
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.officialBreaktimeIN}
                                    onChange={(e) => handleChange(index, 'officialBreaktimeIN', e.target.value)}
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.officialBreaktimeOUT}
                                    onChange={(e) => handleChange(index, 'officialBreaktimeOUT', e.target.value)}
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.officialTimeOUT}
                                    onChange={(e) => handleChange(index, 'officialTimeOUT', e.target.value)}
                                  />
                                </PremiumTableCell>
                              </>
                            )}
                            {scheduleView === 'honorarium' && (
                              <>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.employeeID}
                                    InputProps={{ readOnly: true }}
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.day}
                                    InputProps={{ readOnly: true }}
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.officialHonorariumTimeIN}
                                    onChange={(e) => handleChange(index, 'officialHonorariumTimeIN', e.target.value)}
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.officialHonorariumTimeOUT}
                                    onChange={(e) => handleChange(index, 'officialHonorariumTimeOUT', e.target.value)}
                                  />
                                </PremiumTableCell>
                              </>
                            )}
                            {scheduleView === 'serviceCredits' && (
                              <>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.employeeID}
                                    InputProps={{ readOnly: true }}
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.day}
                                    InputProps={{ readOnly: true }}
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.officialServiceCreditTimeIN}
                                    onChange={(e) => handleChange(index, 'officialServiceCreditTimeIN', e.target.value)}
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.officialServiceCreditTimeOUT}
                                    onChange={(e) => handleChange(index, 'officialServiceCreditTimeOUT', e.target.value)}
                                  />
                                </PremiumTableCell>
                              </>
                            )}
                            {scheduleView === 'overtime' && (
                              <>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.employeeID}
                                    InputProps={{ readOnly: true }}
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.day}
                                    InputProps={{ readOnly: true }}
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.officialOverTimeIN}
                                    onChange={(e) => handleChange(index, 'officialOverTimeIN', e.target.value)}
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  <ModernTextField
                                    variant="outlined"
                                    size="small"
                                    value={record.officialOverTimeOUT}
                                    onChange={(e) => handleChange(index, 'officialOverTimeOUT', e.target.value)}
                                  />
                                </PremiumTableCell>
                              </>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </PremiumTableContainer>

                  <Box
                    sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {autoSaving && (
                        <Chip
                          icon={<CircularProgress size={16} />}
                          label="Auto-saving..."
                          size="small"
                          sx={{
                            bgcolor: alpha(accentColor, 0.1),
                            color: accentColor,
                          }}
                        />
                      )}
                      {lastSaved && !autoSaving && (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label={`Saved at ${lastSaved.toLocaleTimeString()}`}
                          size="small"
                          sx={{
                            bgcolor: alpha('#4caf50', 0.1),
                            color: '#4caf50',
                          }}
                        />
                      )}
                    </Box>
                    <ProfessionalButton
                      type="submit"
                      variant="contained"
                      startIcon={<SaveIcon />}
                      sx={{
                        py: 2,
                        px: 6,
                        fontSize: '1rem',
                        bgcolor: accentColor,
                        color: primaryColor,
                        '&:hover': { bgcolor: accentDark },
                      }}
                    >
                      {found ? 'Update' : 'Save'}
                    </ProfessionalButton>
                  </Box>
                </Box>
              </GlassCard>
            </Fade>
          )}

          {/* All Users View */}
          {showAllUsers && (
            <Fade in timeout={500}>
              <GlassCard
                sx={{
                  mb: 4,
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
                    p: 4,
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    color: textPrimaryColor,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 600, mb: 0.5, color: textPrimaryColor }}
                    >
                      All Users - Official Time Status
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ opacity: 0.8, color: textPrimaryColor }}
                    >
                      View and manage default official time for all users
                    </Typography>
                  </Box>
                  <Avatar
                    sx={{
                      bgcolor: alpha(accentColor, 0.15),
                      width: 64,
                      height: 64,
                    }}
                  >
                    <PeopleIcon sx={{ fontSize: 32, color: textPrimaryColor }} />
                  </Avatar>
                </Box>

                <CardContent sx={{ p: 4 }}>
                  {/* Search and Actions */}
                  <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                    <ModernTextField
                      fullWidth
                      placeholder="Search by name or employee number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: textPrimaryColor }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                    <ProfessionalButton
                      variant="contained"
                      onClick={handleSetDefaultForSelected}
                      disabled={selectedUsers.size === 0 || settingDefault}
                      startIcon={<CheckCircleIcon />}
                      sx={{
                        bgcolor: accentColor,
                        color: primaryColor,
                        minWidth: 200,
                      }}
                    >
                      Set Default for Selected ({selectedUsers.size})
                    </ProfessionalButton>
                    <ProfessionalButton
                      variant="outlined"
                      onClick={handleSetDefaultForAll}
                      disabled={
                        settingDefault ||
                        allUsers.filter((u) => !u.hasDefaultOfficialTime).length === 0
                      }
                      sx={{
                        borderColor: accentColor,
                        color: textPrimaryColor,
                        minWidth: 200,
                        '&:hover': {
                          backgroundColor: alpha(accentColor, 0.1),
                        },
                      }}
                    >
                      Set Default for All Missing
                    </ProfessionalButton>
                  </Box>

                  {/* Users Table */}
                  {loadingUsers ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress sx={{ color: accentColor }} />
                    </Box>
                  ) : (
                    <PremiumTableContainer>
                      <Table stickyHeader>
                        <TableHead sx={{ bgcolor: alpha(primaryColor, 0.7) }}>
                          <TableRow>
                            <PremiumTableCell>
                              <Checkbox
                                checked={
                                  getFilteredUsers().length > 0 &&
                                  getFilteredUsers().every((u) =>
                                    selectedUsers.has(u.employeeNumber)
                                  )
                                }
                                indeterminate={
                                  getFilteredUsers().some((u) =>
                                    selectedUsers.has(u.employeeNumber)
                                  ) &&
                                  !getFilteredUsers().every((u) =>
                                    selectedUsers.has(u.employeeNumber)
                                  )
                                }
                                onChange={(e) => handleSelectAll(e.target.checked)}
                                sx={{ color: accentColor }}
                              />
                            </PremiumTableCell>
                            <PremiumTableCell isHeader sx={{ color: accentColor }}>
                              Employee Number
                            </PremiumTableCell>
                            <PremiumTableCell isHeader sx={{ color: accentColor }}>
                              Name
                            </PremiumTableCell>
                            <PremiumTableCell isHeader sx={{ color: accentColor }}>
                              Status
                            </PremiumTableCell>
                            <PremiumTableCell isHeader sx={{ color: accentColor }}>
                              Days Count
                            </PremiumTableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {getFilteredUsers().map((user) => (
                            <TableRow
                              key={user.employeeNumber}
                              sx={{
                                '&:nth-of-type(even)': {
                                  bgcolor: alpha(primaryColor, 0.3),
                                },
                                '&:hover': { bgcolor: alpha(accentColor, 0.05) },
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <PremiumTableCell>
                                <Checkbox
                                  checked={selectedUsers.has(user.employeeNumber)}
                                  onChange={() => handleUserSelect(user.employeeNumber)}
                                  sx={{ color: accentColor }}
                                />
                              </PremiumTableCell>
                              <PremiumTableCell>
                                {user.employeeNumber}
                              </PremiumTableCell>
                              <PremiumTableCell>
                                {user.fullName || 'N/A'}
                              </PremiumTableCell>
                              <PremiumTableCell>
                                {user.hasDefaultOfficialTime ? (
                                  <Chip
                                    icon={<CheckCircleIcon />}
                                    label="Default"
                                    size="small"
                                    sx={{
                                      bgcolor: alpha('#4caf50', 0.1),
                                      color: '#4caf50',
                                    }}
                                  />
                                ) : (
                                  <Chip
                                    icon={<CancelIcon />}
                                    label="No Default"
                                    size="small"
                                    sx={{
                                      bgcolor: alpha('#f44336', 0.1),
                                      color: '#f44336',
                                    }}
                                  />
                                )}
                              </PremiumTableCell>
                              <PremiumTableCell>
                                {user.officialTimeDaysCount}/7
                              </PremiumTableCell>
                            </TableRow>
                          ))}
                          {getFilteredUsers().length === 0 && (
                            <TableRow>
                              <PremiumTableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                <Typography sx={{ color: accentDark }}>
                                  {searchQuery
                                    ? 'No users found matching your search.'
                                    : 'No users found.'}
                                </Typography>
                              </PremiumTableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </PremiumTableContainer>
                  )}
                </CardContent>
              </GlassCard>
            </Fade>
          )}

          {/* Modal */}
          <PreviewModal />

          {/* Success Overlay */}
          <SuccessfulOverlay open={successOpen} action={successAction} />
        </Box>
      </Box>
    </>
  );
};

export default OfficialTimeForm;
