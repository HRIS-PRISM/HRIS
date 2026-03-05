import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../../contexts/SocketContext';
import {
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Container,
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
  TableContainer,
  useTheme,
  styled,
  Divider,
  Backdrop,
  CircularProgress,
  CardHeader,
  Checkbox,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Info,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Summarize,
  SummarizeOutlined,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Search,
  Person,
  CalendarToday,
  Refresh,
  FilterList,
  Assignment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { useCRUDButtonStyles, useCRUDButtonStylesOutlined } from '../../hooks/useCRUDButtonStyles';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';

// Helper function to convert hex to rgb
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '109, 35, 35';
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

const ProfessionalButton = styled(Button)(({ theme, variant, color = 'primary' }) => ({
  borderRadius: 12,
  fontWeight: 600,
  padding: '12px 24px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  textTransform: 'none',
  fontSize: '0.95rem',
  letterSpacing: '0.025em',
  boxShadow: variant === 'contained' ? '0 4px 14px rgba(254, 249, 225, 0.25)' : 'none',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: variant === 'contained' ? '0 6px 20px rgba(254, 249, 225, 0.35)' : 'none',
  },
  '&:active': {
    transform: 'translateY(0)',
  },
}));

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
  borderBottom: isHeader ? '2px solid rgba(254, 249, 225, 0.5)' : '1px solid rgba(109, 35, 35, 0.06)',
  fontSize: '0.95rem',
  letterSpacing: '0.025em',
  minWidth: '120px', // Ensure minimum width for cells
  whiteSpace: 'nowrap', // Prevent text wrapping
}));

// Styled Modal Component - professional look
const StyledModal = ({
  open,
  onClose,
  title,
  message,
  type = 'info',
  onConfirm,
  showCancel = false,
}) => {
  const getIcon = () => {
    const baseStyles = {
      fontSize: 40,
    };

    switch (type) {
      case 'success':
        return <CheckCircleIcon sx={{ ...baseStyles, color: '#2e7d32' }} />;
      case 'warning':
        return <WarningIcon sx={{ ...baseStyles, color: '#ed6c02' }} />;
      case 'error':
        return <ErrorIcon sx={{ ...baseStyles, color: '#d32f2f' }} />;
      default:
        return <InfoIcon sx={{ ...baseStyles, color: '#1976d2' }} />;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0px 10px 40px rgba(0,0,0,0.18)',
          border: '1px solid rgba(109, 35, 35, 0.12)',
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        sx={{
          px: 3,
          pt: 2.5,
          pb: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          backgroundColor: '#FFFFFF',
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 700, color: '#6D2323', letterSpacing: 0.3 }}
        >
          {title}
        </Typography>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            color: '#6D2323',
            '&:hover': {
              backgroundColor: 'rgba(109, 35, 35, 0.06)',
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          px: 4,
          pt: 3,
          pb: 2,
          backgroundColor: '#FFFFFF',
          minHeight: 320,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
                gap: 2.5,
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
                  backgroundColor: 'rgba(109,35,35,0.06)',
            }}
          >
            {getIcon()}
          </Box>

          <Typography
            sx={{
              color: '#4b1717',
              fontSize: 15,
              whiteSpace: 'pre-line',
              lineHeight: 1.7,
            }}
          >
            {message}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 4,
          py: 3,
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 1.5,
        }}
      >
        {showCancel && (
          <ProfessionalButton
            onClick={onClose}
            variant="outlined"
            sx={{
              width: '100%',
              borderColor: 'rgba(109,35,35,0.6)',
              color: '#6D2323',
              fontWeight: 600,
            }}
          >
            Cancel
          </ProfessionalButton>
        )}
        <ProfessionalButton
          onClick={onConfirm || onClose}
          variant="contained"
          sx={{
            width: '100%',
            bgcolor: '#6D2323',
            color: '#FEF9E1',
            fontWeight: 600,
            '&:hover': {
              bgcolor: '#8B3333',
            },
          }}
        >
          {showCancel ? 'Confirm' : 'OK'}
        </ProfessionalButton>
      </DialogActions>
    </Dialog>
  );
};

const OverallAttendance = () => {
  const { socket, connected } = useSocket();
  const { settings } = useSystemSettings();
  const saveButtonStyles = useCRUDButtonStyles('save');
  const editButtonStyles = useCRUDButtonStyles('edit');
  const deleteButtonStyles = useCRUDButtonStylesOutlined('delete');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const fetchAttendanceDataRef = useRef(null);
  
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
  // The identifier 'attendance-summary' should match the component_identifier in the pages table
  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('attendance-summary');
  
  // Debug logging (remove in production)
  useEffect(() => {
    if (!accessLoading) {
      console.log('AttendanceSummary Access Check:', {
        hasAccess,
        accessLoading,
        accessError,
        identifier: 'attendance-summary'
      });
    }
  }, [hasAccess, accessLoading, accessError]);
  // ACCESSING END

  const [endDate, setEndDate] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [editRecord, setEditRecord] = useState(null);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingJO, setIsSubmittingJO] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRegularConfirm, setShowRegularConfirm] = useState(false);
  const [confirmRegularChecked, setConfirmRegularChecked] = useState(false);
  const [processingOverlay, setProcessingOverlay] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [successOverlay, setSuccessOverlay] = useState(false);
  const [successRedirect, setSuccessRedirect] = useState('');
  const [successAction, setSuccessAction] = useState('send');

  // Modal state
  const [modal, setModal] = useState({
    open: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    showCancel: false,
  });

  const showModal = (title, message, type = 'info', onConfirm = null, showCancel = false) => {
    setModal({
      open: true,
      title,
      message,
      type,
      onConfirm,
      showCancel,
    });
  };

  const closeModal = () => {
    setModal({ ...modal, open: false });
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    console.log(
      'Token from localStorage:',
      token ? 'Token exists' : 'No token found'
    );
    if (token) {
      console.log('Token length:', token.length);
      console.log('Token starts with:', token.substring(0, 20) + '...');
    }
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  };

  useEffect(() => {
    const storedEmployeeNumber = localStorage.getItem('employeeNumber');
    const storedStartDate = localStorage.getItem('startDate');
    const storedEndDate = localStorage.getItem('endDate');

    if (storedEmployeeNumber) setEmployeeNumber(storedEmployeeNumber);
    if (storedStartDate) setStartDate(storedStartDate);
    if (storedEndDate) setEndDate(storedEndDate);
  }, []);

  const fetchAttendanceData = async () => {
    console.log('Sending request with params: ', {
      personID: employeeNumber,
      startDate,
      endDate,
    });

    setLoading(true);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/attendance/api/overall_attendance_record`,
        {
          params: {
            personID: employeeNumber,
            startDate,
            endDate,
          },
          ...getAuthHeaders(),
        }
      );

      if (response.status === 200) {
        setAttendanceData(response.data.data);
      } else {
        console.error('Error: ', response.status);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showModal('Data Retrieval Error', 'Unable to retrieve attendance records. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Keep latest fetch function for Socket.IO handler
  useEffect(() => {
    fetchAttendanceDataRef.current = fetchAttendanceData;
  });

  // Realtime: refresh when attendance data changes
  useEffect(() => {
    if (!socket || !connected) return;

    const handleAttendanceChanged = (payload) => {
      const changedPersonIDs = Array.isArray(payload?.personIDs)
        ? payload.personIDs
        : payload?.personID
          ? [payload.personID]
          : [];

      if (employeeNumber && changedPersonIDs.length > 0 && !changedPersonIDs.includes(employeeNumber)) {
        return;
      }

      if (employeeNumber && startDate && endDate) {
        fetchAttendanceDataRef.current?.();
      }
    };

    socket.on('attendanceChanged', handleAttendanceChanged);
    return () => {
      socket.off('attendanceChanged', handleAttendanceChanged);
    };
  }, [socket, connected, employeeNumber, startDate, endDate]);

  const updateRecord = async () => {
    if (!editRecord || !editRecord.totalRenderedTimeMorning) return;

    try {
      await axios.put(
        `${API_BASE_URL}/attendance/api/overall_attendance_record/${editRecord.id}`,
        editRecord,
        getAuthHeaders()
      );
      
      showModal('Update Successful', 'Record updated successfully.', 'success', () => {
        fetchAttendanceData();
        window.location.reload();
        closeModal();
      });
    } catch (error) {
      console.error('Error updating record:', error);
      showModal('Update Failed', 'Unable to update record.', 'error');
    }

    setEditRecord(null);
  };

  const deleteRecord = async (id, personID) => {
    showModal(
      'Confirm Deletion',
      `Delete attendance record for Employee ${personID}?`,
      'warning',
      async () => {
        try {
          await axios.delete(
            `${API_BASE_URL}/attendance/api/overall_attendance_record/${id}/${personID}`,
            getAuthHeaders()
          );
          fetchAttendanceData();
          showModal('Deleted Successfully', 'Record removed from system.', 'success');
        } catch (error) {
          console.error('Delete failed:', error);
          const status = error.response?.status;
          const message =
            error.response?.data?.message || error.response?.data?.error || 'Error';
          
          if (status === 404) {
            showModal('Not Found', 'Record not found or already deleted.', 'error');
          } else if (status === 401 || status === 403) {
            showModal('Session Expired', 'Please log in again.', 'error');
          } else {
            showModal('Deletion Failed', `${message}`, 'error');
          }
        }
      },
      true
    );
  };

  const submitToPayroll = async () => {
    if (isSubmitting) return;

    if (!attendanceData || attendanceData.length === 0) {
      showModal('No Data', 'No attendance records available.', 'warning');
      return;
    }

    setIsSubmitting(true);
    setProcessingOverlay(true);
    setProcessingMessage('Submitting Regular payroll...');

    try {
      const filteredRecords = [];
      const invalidRecords = [];

      for (const record of attendanceData) {
        const employeeNumber = record.personID || record.employeeNumber;
        const employmentCategory = await fetchEmploymentCategory(employeeNumber);

        if (employmentCategory === null) {
          invalidRecords.push({
            employeeNumber,
            reason: 'Employment category not found in system',
          });
          continue;
        }

        if (employmentCategory === 1) {
          filteredRecords.push(record);
        } else if (employmentCategory === 0) {
          invalidRecords.push({
            employeeNumber,
            reason: 'Job Order (JO)',
          });
        }
      }

      if (invalidRecords.length > 0) {
        const invalidList = invalidRecords
          .map((r) => `${r.employeeNumber}: ${r.reason}`)
          .join('\n');

        if (filteredRecords.length === 0) {
          showModal(
            'Submission Blocked',
            `Employee(s) not eligible for Regular payroll:\n\n${invalidList}\n\nContact HR Department to update employment category.`,
            'warning'
          );
          setProcessingOverlay(false);
          setIsSubmitting(false);
          return;
        }

        showModal(
          'Confirm Submission',
          `${filteredRecords.length} eligible record(s)\n${invalidRecords.length} excluded\n\nProceed with submission?`,
          'warning',
          async () => {
            closeModal();
            await continuePayrollSubmission(filteredRecords);
          },
          true
        );
        setProcessingOverlay(false);
        return;
      }

      await continuePayrollSubmission(filteredRecords);
    } catch (error) {
      console.error('Error submitting to payroll:', error);
      handleSubmissionError(error);
    } finally {
      setProcessingOverlay(false);
      setIsSubmitting(false);
    }
  };

  const continuePayrollSubmission = async (filteredRecords) => {
    try {
      const payload = filteredRecords.map((record) => ({
        employeeNumber: record.personID,
        startDate: record.startDate,
        endDate: record.endDate,
        overallRenderedOfficialTimeTardiness: record.overallRenderedOfficialTimeTardiness,
        department: record.code,
      }));

      const missingFields = payload.filter(
        (record) => !record.employeeNumber || !record.startDate || !record.endDate
      );

      if (missingFields.length > 0) {
        showModal(
          'Validation Error',
          'Required fields missing. Check Employee Number, Start Date, and End Date.',
          'error'
        );
        setProcessingOverlay(false);
        return;
      }

      for (const payloadRecord of payload) {
        const { employeeNumber, startDate, endDate } = payloadRecord;

        try {
          const response = await axios.get(
            `${API_BASE_URL}/PayrollRoute/payroll-with-remittance`,
            {
              ...getAuthHeaders(),
              params: { employeeNumber, startDate, endDate },
            }
          );

          if (response.data.exists) {
            showModal(
              'Duplicate Entry',
              `Payroll entry exists for Employee ${employeeNumber} (${startDate} to ${endDate}).`,
              'warning'
            );
            return;
          }
        } catch (duplicateCheckError) {
          console.error('Error checking for duplicates:', duplicateCheckError);
          showModal('Validation Error', 'Unable to verify existing records.', 'error');
          return;
        }
      }

      const submitResponse = await axios.post(
        `${API_BASE_URL}/PayrollRoute/add-rendered-time`,
        payload,
        getAuthHeaders()
      );

      if (submitResponse.status === 200 || submitResponse.status === 201) {
        setProcessingOverlay(false);
        setSuccessAction('send');
        setSuccessRedirect('/payroll-table');
        setSuccessOverlay(true);
      } else {
        throw new Error(`Unexpected response status: ${submitResponse.status}`);
      }
    } catch (error) {
      handleSubmissionError(error);
    }
  };

  const handleSubmissionError = (error) => {
    if (error.response) {
      const status = error.response.status;
      const message =
        error.response.data?.message ||
        error.response.data?.error ||
        'Server error occurred';

      if (status === 409) {
        showModal('Duplicate Entry', 'Record already exists in payroll.', 'warning');
      } else if (status === 400) {
        showModal('Invalid Data', message, 'error');
      } else {
        showModal('Server Error', `Error ${status}: ${message}`, 'error');
      }
    } else if (error.request) {
      showModal('Network Error', 'Connection failed. Check internet connection.', 'error');
    } else {
      showModal('Submission Error', 'An unexpected error occurred.', 'error');
    }
  };

  const submitPayrollJO = async () => {
    if (isSubmittingJO) return;

    if (!attendanceData || attendanceData.length === 0) {
      showModal('No Data', 'No attendance records available.', 'warning');
      return;
    }

    setIsSubmittingJO(true);
    setProcessingOverlay(true);
    setProcessingMessage('Submitting JO payroll...');

    try {
      const filteredRecords = [];
      const invalidRecords = [];

      for (const record of attendanceData) {
        const employeeNumber = record.personID || record.employeeNumber;
        const employmentCategory = await fetchEmploymentCategory(employeeNumber);

        if (employmentCategory === null) {
          invalidRecords.push({
            employeeNumber,
            reason: 'Employment category not found in system',
          });
          continue;
        }

        if (employmentCategory === 0) {
          filteredRecords.push(record);
        } else if (employmentCategory === 1) {
          invalidRecords.push({
            employeeNumber,
            reason: 'Employment category is Regular',
          });
        }
      }

      if (invalidRecords.length > 0) {
        const invalidList = invalidRecords
          .map((r) => `• Employee ${r.employeeNumber}: ${r.reason}`)
          .join('\n');

        if (filteredRecords.length === 0) {
          showModal(
            'Submission Blocked',
            `Employees not eligible for JO payroll:\n\n${invalidList}\n\nContact HR to update employment status.`,
            'warning'
          );
          setProcessingOverlay(false);
          setIsSubmittingJO(false);
          return;
        }

        showModal(
          'Confirm Submission',
          `${filteredRecords.length} eligible record(s)\n${invalidRecords.length} excluded\n\nProceed with submission?`,
          'warning',
          async () => {
            closeModal();
            await continuePayrollJOSubmission(filteredRecords);
          },
          true
        );
        setProcessingOverlay(false);
        return;
      }

      await continuePayrollJOSubmission(filteredRecords);
    } catch (error) {
      console.error('Error submitting Payroll JO:', error);
      handlePayrollJOError(error);
    } finally {
      setProcessingOverlay(false);
      setIsSubmittingJO(false);
    }
  };

  const continuePayrollJOSubmission = async (filteredRecords) => {
    try {
      const duplicateRecords = [];
      
      for (const record of filteredRecords) {
        const employeeNumber = record.personID || record.employeeNumber;
        const { startDate, endDate } = record;

        try {
          const checkResponse = await axios.get(
            `${API_BASE_URL}/PayrollJORoutes/payroll-jo`,
            {
              ...getAuthHeaders(),
              params: { employeeNumber, startDate, endDate },
            }
          );

          if (checkResponse.data && checkResponse.data.length > 0) {
            duplicateRecords.push({
              employeeNumber,
              startDate,
              endDate,
            });
          }
        } catch (checkError) {
          if (checkError.response?.status === 404) {
            continue;
          }
          console.warn(`Could not check duplicate for ${employeeNumber}:`, checkError);
        }
      }

      if (duplicateRecords.length > 0) {
        const duplicateList = duplicateRecords
          .map((r) => `• Employee ${r.employeeNumber} (${r.startDate} to ${r.endDate})`)
          .join('\n');

        showModal(
          'Duplicate Entries',
          `Records already exist:\n\n${duplicateList}`,
          'warning'
        );
        setProcessingOverlay(false);
        return;
      }

      let successCount = 0;
      let failedRecords = [];

      for (const record of filteredRecords) {
        try {
          let rhHours = 0;
          if (record.overallRenderedOfficialTime) {
            const parts = record.overallRenderedOfficialTime.split(':');
            rhHours = parseInt(parts[0], 10) || 0;
          }

          let h = 0, m = 0, s = 0;
          if (record.overallRenderedOfficialTimeTardiness) {
            const tParts = record.overallRenderedOfficialTimeTardiness.split(':');
            h = parseInt(tParts[0], 10) || 0;
            m = parseInt(tParts[1], 10) || 0;
            s = parseInt(tParts[2], 10) || 0;
          }

          const payload = {
            employeeNumber: record.employeeNumber || record.personID,
            startDate: record.startDate,
            endDate: record.endDate,
            h,
            m,
            s,
            rh: rhHours,
            department: record.code,
          };

          console.log('Submitting JO payload:', payload);

          await axios.post(
            `${API_BASE_URL}/PayrollJORoutes/payroll-jo`,
            payload,
            getAuthHeaders()
          );

          successCount++;
        } catch (recordError) {
          console.error(`Failed to submit record for ${record.personID}:`, recordError);

          const errorMsg =
            recordError.response?.data?.message ||
            recordError.response?.data?.error ||
            'Unknown error';

          failedRecords.push({
            employeeNumber: record.personID || record.employeeNumber,
            error: errorMsg,
          });
        }
      }

      if (failedRecords.length > 0) {
        const failedList = failedRecords
          .map((r) => `• Employee ${r.employeeNumber}: ${r.error}`)
          .join('\n');

        if (successCount > 0) {
          showModal(
            'Partial Success',
            `Submitted: ${successCount}\nFailed: ${failedRecords.length}\n\n${failedList}`,
            'warning'
          );
        } else {
          showModal(
            'Submission Failed',
            `All submissions failed:\n\n${failedList}`,
            'error'
          );
        }
        setProcessingOverlay(false);
      } else {
        setProcessingOverlay(false);
        setSuccessAction('send');
        setSuccessRedirect('/payroll-jo');
        setSuccessOverlay(true);
      }
    } catch (error) {
      handlePayrollJOError(error);
    }
  };

  const handlePayrollJOError = (error) => {
    let errorMessage = 'Payroll JO submission failed.';

    if (error.response) {
      const status = error.response.status;
      const message =
        error.response.data?.message ||
        error.response.data?.error ||
        'Server error occurred';

      if (status === 409) {
        errorMessage = `Duplicate entry: ${message}`;
      } else if (status === 400) {
        errorMessage = `Invalid data: ${message}`;
      } else {
        errorMessage = `Error ${status}: ${message}`;
      }
    } else if (error.request) {
      errorMessage = 'Connection failed. Check internet connection.';
    }

    showModal('Submission Error', errorMessage, 'error');
  };

  const fetchEmploymentCategory = async (employeeNumber) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${employeeNumber}`,
        getAuthHeaders()
      );
      return response.data.employmentCategory;
    } catch (error) {
      console.error('Error fetching employment category:', error);
      return null;
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
  // Check for both false and null (when not loading and no access)
  if (!accessLoading && hasAccess !== true) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Attendance Summary. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }
  //ACCESSING END2

  return (
    <Box sx={{ 
      py: 4,
      borderRadius: '14px',
      width: '100vw', // Full viewport width
      mx: 'auto', // Center horizontally
      maxWidth: '100%', // Ensure it doesn't exceed viewport
      overflow: 'hidden', // Prevent horizontal scroll
      position: 'relative',
      left: '50%',
      transform: 'translateX(-50%)', // Center element
    }}>
      {/* Wider Container */}
      <Box sx={{ px: 6, mx: 'auto', maxWidth: '1600px' }}>
        {/* Header */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }}>
            <GlassCard sx={{
              background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
              boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`,
              border: `1px solid ${alpha(accentColor, 0.1)}`,
              '&:hover': {
                boxShadow: `0 12px 48px ${alpha(accentColor, 0.15)}`,
              },
            }}>
              <Box
                sx={{
                  p: 5,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  color: textPrimaryColor,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Decorative elements */}
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
                
                <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
                  <Box display="flex" alignItems="center">
                    <Avatar 
                      sx={{ 
                        bgcolor: alpha(accentColor, 0.15), 
                        mr: 4, 
                        width: 64, 
                        height: 64,
                        boxShadow: `0 8px 24px ${alpha(accentColor, 0.15)}`
                      }}
                    >
                      <SummarizeOutlined sx={{ fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2, color: textPrimaryColor }}>
                        Overall Attendance Report
                      </Typography>
                      <Typography variant="body1" sx={{ opacity: 0.8, fontWeight: 400, color: textPrimaryColor }}>
                        Generate and review summary of overall attendance records
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
                        '& .MuiChip-label': { px: 1 }
                      }} 
                    />
                    <Tooltip title="Refresh Data">
                      <IconButton 
                        onClick={fetchAttendanceData}
                        disabled={!employeeNumber || !startDate || !endDate}
                        sx={{ 
                          bgcolor: alpha(accentColor, 0.1), 
                          '&:hover': { bgcolor: alpha(accentColor, 0.2) },
                          color: textPrimaryColor,
                          width: 48,
                          height: 48,
                          '&:disabled': { 
                            bgcolor: alpha(accentColor, 0.05),
                            color: alpha(accentColor, 0.3)
                          }
                        }}
                      >
                        <Refresh />
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
          <GlassCard sx={{ 
            mb: 4,
            background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
            boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`,
            border: `1px solid ${alpha(accentColor, 0.1)}`,
            '&:hover': {
              boxShadow: `0 12px 48px ${alpha(accentColor, 0.15)}`,
            },
          }}>
           <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: alpha(primaryColor, 0.8), color: textPrimaryColor }}>
                    <FilterList />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ color: accentDark }}>
                      Configure your attendance record search criteria
                    </Typography>
                  </Box>
                </Box>
              }
              sx={{ 
                bgcolor: alpha(primaryColor, 0.5),
                borderBottom: `1px solid ${alpha(accentColor, 0.1)}`, 
                pb: 2,
                borderBottom: '1px solid rgba(109,35,35,0.1)'
              }}
            />  
            <CardContent sx={{ p: 4 }}>
              <Box component="form">
                <Grid container spacing={4}>
                  <Grid item xs={12} md={4}>
                    <ModernTextField
                      fullWidth
                      label="Employee Number"
                      value={employeeNumber}
                      onChange={(e) => setEmployeeNumber(e.target.value)}
                      required
                      variant="outlined"
                      placeholder="Enter employee ID"
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
                    <ModernTextField
                      fullWidth
                      label="Start Date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarToday sx={{ color: textPrimaryColor }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <ModernTextField
                      fullWidth
                      label="End Date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarToday sx={{ color: textPrimaryColor }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                  <ProfessionalButton
                    variant="contained"
                    onClick={fetchAttendanceData}
                    disabled={!employeeNumber || !startDate || !endDate}
                    sx={{
                      py: 2,
                      px: 6,
                      bgcolor: accentColor,
                      color: primaryColor,
                      fontSize: '1rem',
                      '&:hover': {
                        bgcolor: accentDark,
                      }
                    }}
                  >
                    Fetch Attendance Records
                  </ProfessionalButton>
                </Box>
              </Box>
            </CardContent>
          </GlassCard>
        </Fade>

        {/* Loading Backdrop */}
        <Backdrop
          sx={{ color: accentColor, zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={loading}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress color="inherit" size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 2, color: accentColor }}>
              Fetching attendance records...
            </Typography>
          </Box>
        </Backdrop>

        {/* Results */}
        {attendanceData.length > 0 && (
          <Fade in={!loading} timeout={500}>
            <GlassCard sx={{ mb: 4, border: `1px solid ${alpha(accentColor, 0.1)}` }}>
              <Box sx={{ 
                p: 4, 
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`, 
                color: accentColor,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8, mb: 1, textTransform: 'uppercase', letterSpacing: '0.1em', color: accentDark }}>
                    Attendance Record Summary
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: accentColor }}>
                    {attendanceData.length} Records Found
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                    <Chip 
                      icon={<CalendarToday />}
                      label={`${startDate} to ${endDate}`}
                      size="small"
                      sx={{ 
                        bgcolor: 'rgba(109,35,35,0.15)', 
                        color: accentColor,
                        fontWeight: 500
                      }} 
                    />
                  </Box>
                </Box>
                <Avatar 
                  sx={{ 
                    bgcolor: 'rgba(109,35,35,0.15)', 
                    width: 80, 
                    height: 80,
                    fontSize: '2rem',
                    fontWeight: 600,
                    color: accentColor
                  }}
                >
                  <Summarize />
                </Avatar>
              </Box>

              <PremiumTableContainer>
                <Table 
                  stickyHeader 
                  sx={{ 
                    minWidth: '2000px', // Set minimum width to ensure horizontal scrolling
                  }}
                >
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'rgba(254, 249, 225, 0.7)' }}>
                      <PremiumTableCell isHeader sx={{ color: accentColor }}>Department</PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: accentColor }}>Employee Number</PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: accentColor }}>Start Date</PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: accentColor }}>End Date</PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: accentColor }}>Morning Hours</PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: accentColor }}>Morning Tardiness</PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: accentColor }}>Afternoon Hours</PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: accentColor }}>Afternoon Tardiness</PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: accentColor }}>Honorarium</PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: accentColor }}>Honorarium Tardiness</PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: accentColor }}>Service Credit</PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: accentColor }}>Service Credit Tardiness</PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: accentColor }}>Overtime</PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: accentColor }}>Overtime Tardiness</PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: accentColor }}>Overall Official Rendered Time</PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: accentColor }}>Overall Official Tardiness Time</PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: accentColor }}>Action</PremiumTableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attendanceData.map((record, index) => (
                      <TableRow 
                        key={index}
                        sx={{ 
                          '&:nth-of-type(even)': { bgcolor: 'rgba(254, 249, 225, 0.3)' },
                          '&:hover': { bgcolor: 'rgba(109, 35, 35, 0.05)' },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <PremiumTableCell>{record.code}</PremiumTableCell>
                        <PremiumTableCell>
                          {editRecord && editRecord.id === record.id ? (
                            <ModernTextField 
                              value={editRecord.personID} 
                              onChange={(e) => setEditRecord({ ...editRecord, personID: e.target.value })} 
                              size="small"
                            />
                          ) : (
                            record.personID
                          )}
                        </PremiumTableCell>
                        <PremiumTableCell>
                          {editRecord && editRecord.id === record.id ? (
                            <ModernTextField 
                              value={editRecord.startDate} 
                              onChange={(e) => setEditRecord({ ...editRecord, startDate: e.target.value })} 
                              size="small"
                            />
                          ) : (
                            record.startDate
                          )}
                        </PremiumTableCell>
                        <PremiumTableCell>
                          {editRecord && editRecord.id === record.id ? (
                            <ModernTextField 
                              value={editRecord.endDate} 
                              onChange={(e) => setEditRecord({ ...editRecord, endDate: e.target.value })} 
                              size="small"
                            />
                          ) : (
                            record.endDate
                          )}
                        </PremiumTableCell>
                        <PremiumTableCell>
                          {editRecord && editRecord.id === record.id ? (
                            <ModernTextField 
                              value={editRecord.totalRenderedTimeMorning} 
                              onChange={(e) => setEditRecord({ ...editRecord, totalRenderedTimeMorning: e.target.value })} 
                              size="small"
                            />
                          ) : (
                            record.totalRenderedTimeMorning
                          )}
                        </PremiumTableCell>
                        <PremiumTableCell>
                          {editRecord && editRecord.id === record.id ? (
                            <ModernTextField 
                              value={editRecord.totalRenderedTimeMorningTardiness} 
                              onChange={(e) => setEditRecord({ ...editRecord, totalTardAM: e.target.value })} 
                              size="small"
                            />
                          ) : (
                            record.totalRenderedTimeMorningTardiness
                          )}
                        </PremiumTableCell>
                        <PremiumTableCell>
                          {editRecord && editRecord.id === record.id ? (
                            <ModernTextField 
                              value={editRecord.totalRenderedTimeAfternoon} 
                              onChange={(e) => setEditRecord({ ...editRecord, totalRenderedTimeAfternoon: e.target.value })} 
                              size="small"
                            />
                          ) : (
                            record.totalRenderedTimeAfternoon
                          )}
                        </PremiumTableCell>
                        <PremiumTableCell>
                          {editRecord && editRecord.id === record.id ? (
                            <ModernTextField 
                              value={editRecord.totalRenderedTimeAfternoonTardiness} 
                              onChange={(e) => setEditRecord({ ...editRecord, totalRenderedTimeAfternoonTardiness: e.target.value })} 
                              size="small"
                            />
                          ) : (
                            record.totalRenderedTimeAfternoonTardiness
                          )}
                        </PremiumTableCell>
                        <PremiumTableCell>
                          {editRecord && editRecord.id === record.id ? (
                            <ModernTextField 
                              value={editRecord.totalRenderedHonorarium} 
                              onChange={(e) => setEditRecord({ ...editRecord, totalRenderedHonorarium: e.target.value })} 
                              size="small"
                            />
                          ) : (
                            record.totalRenderedHonorarium
                          )}
                        </PremiumTableCell>
                        <PremiumTableCell>
                          {editRecord && editRecord.id === record.id ? (
                            <ModernTextField 
                              value={editRecord.totalRenderedHonorariumTardiness} 
                              onChange={(e) => setEditRecord({ ...editRecord, TotalTatotalRenderedHonorariumTardinessrdHR: e.target.value })} 
                              size="small"
                            />
                          ) : (
                            record.totalRenderedHonorariumTardiness
                          )}
                        </PremiumTableCell>
                        <PremiumTableCell>
                          {editRecord && editRecord.id === record.id ? (
                            <ModernTextField 
                              value={editRecord.totalRenderedServiceCredit} 
                              onChange={(e) => setEditRecord({ ...editRecord, totalRenderedServiceCredit: e.target.value })} 
                              size="small"
                            />
                          ) : (
                            record.totalRenderedServiceCredit
                          )}
                        </PremiumTableCell>
                        <PremiumTableCell>
                          {editRecord && editRecord.id === record.id ? (
                            <ModernTextField 
                              value={editRecord.totalRenderedServiceCreditTardiness} 
                              onChange={(e) => setEditRecord({ ...editRecord, totalRenderedServiceCreditTardiness: e.target.value })} 
                              size="small"
                            />
                          ) : (
                            record.totalRenderedServiceCreditTardiness
                          )}
                        </PremiumTableCell>
                        <PremiumTableCell>
                          {editRecord && editRecord.id === record.id ? (
                            <ModernTextField 
                              value={editRecord.totalRenderedOvertime} 
                              onChange={(e) => setEditRecord({ ...editRecord, totalRenderedOvertime: e.target.value })} 
                              size="small"
                            />
                          ) : (
                            record.totalRenderedOvertime
                          )}
                        </PremiumTableCell>
                        <PremiumTableCell>
                          {editRecord && editRecord.id === record.id ? (
                            <ModernTextField 
                              value={editRecord.totalRenderedOvertimeTardiness} 
                              onChange={(e) => setEditRecord({ ...editRecord, totalRenderedOvertimeTardiness: e.target.value })} 
                              size="small"
                            />
                          ) : (
                            record.totalRenderedOvertimeTardiness
                          )}
                        </PremiumTableCell>
                        <PremiumTableCell>
                          {editRecord && editRecord.id === record.id ? (
                            <ModernTextField 
                              value={editRecord.overallRenderedOfficialTime} 
                              onChange={(e) => setEditRecord({ ...editRecord, overallRenderedOfficialTime: e.target.value })} 
                              size="small"
                            />
                          ) : (
                            record.overallRenderedOfficialTime
                          )}
                        </PremiumTableCell>
                        <PremiumTableCell>
                          {editRecord && editRecord.id === record.id ? (
                            <ModernTextField 
                              value={editRecord.overallRenderedOfficialTimeTardiness} 
                              onChange={(e) => setEditRecord({ ...editRecord, overallRenderedOfficialTimeTardiness: e.target.value })} 
                              size="small"
                            />
                          ) : (
                            record.overallRenderedOfficialTimeTardiness
                          )}
                        </PremiumTableCell>
                        <PremiumTableCell>
                          {editRecord && editRecord.id === record.id ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <ProfessionalButton 
                                onClick={updateRecord} 
                                variant="contained" 
                                size="small"
                                sx={saveButtonStyles}
                                startIcon={<SaveIcon />}
                              >
                                Save
                              </ProfessionalButton>
                              <ProfessionalButton 
                                onClick={() => setEditRecord(null)} 
                                variant="outlined" 
                                size="small"
                                sx={{ 
                                  borderColor: accentColor,
                                  color: accentColor,
                                  '&:hover': {
                                    backgroundColor: 'rgba(109, 35, 35, 0.1)',
                                  }
                                }} 
                                startIcon={<CancelIcon />}
                              >
                                Cancel
                              </ProfessionalButton>
                            </Box>
                          ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <ProfessionalButton 
                                onClick={() => { setEditRecord(record); }} 
                                variant="contained" 
                                size="small"
                                sx={editButtonStyles}
                                startIcon={<EditIcon />}
                              >
                                Edit
                              </ProfessionalButton>
                              <ProfessionalButton 
                                onClick={() => deleteRecord(record.id, record.personID)} 
                                variant="outlined" 
                                size="small"
                                sx={deleteButtonStyles}
                                startIcon={<DeleteIcon />}
                              >
                                Delete
                              </ProfessionalButton>
                            </Box>
                          )}
                        </PremiumTableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </PremiumTableContainer>
            </GlassCard>
          </Fade>
        )}

        {attendanceData.length === 0 && !loading && (
          <Fade in timeout={500}>
            <GlassCard sx={{ mb: 4 }}>
              <Box sx={{ 
                p: 8, 
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Info sx={{ fontSize: 80, color: 'rgba(109, 35, 35, 0.3)', mb: 3 }} />
                <Typography variant="h5" color="rgba(109, 35, 35, 0.6)" gutterBottom sx={{ fontWeight: 600 }}>
                  No Records Found
                </Typography>
                <Typography variant="body1" color="rgba(109, 35, 35, 0.4)">
                  Try adjusting your date range or search for a different employee
                </Typography>
              </Box>
            </GlassCard>
          </Fade>
        )}

        {/* Action Buttons */}
        {attendanceData.length > 0 && (
          <Fade in timeout={900}>
            <GlassCard sx={{border: `1px solid ${alpha(accentColor, 0.1)}`}}>
              <CardContent sx={{ p: 4 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <ProfessionalButton
                      variant="contained"
                      fullWidth
                      startIcon={<Assignment />}
                      onClick={() => setShowRegularConfirm(true)}
                      disabled={isSubmitting}
                      sx={{
                        py: 2,
                        bgcolor: accentColor,
                        color: primaryColor,
                        fontSize: '1rem',
                        '&:hover': {
                          bgcolor: accentDark,
                        }
                      }}
                    >
                      {isSubmitting ? 'Submitting to Payroll...' : 'Submit Payroll Regular'}
                    </ProfessionalButton>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <ProfessionalButton
                      variant="contained"
                      fullWidth
                      startIcon={<Assignment />}
                      onClick={submitPayrollJO}
                      disabled={isSubmittingJO}
                      sx={{
                        py: 2,
                        bgcolor: accentColor,
                        color: primaryColor,
                        fontSize: '1rem',
                        '&:hover': {
                          bgcolor: accentDark,
                        }
                      }}
                    >
                      {isSubmittingJO ? 'Submitting to Payroll JO...' : 'Submit Payroll JO'}
                    </ProfessionalButton>
                  </Grid>
                </Grid>
              </CardContent>
            </GlassCard>
          </Fade>
        )}

        {/* Modal */}
       {/* Confirmation Modal for Regular Payroll Submission */}
       <Dialog
         open={showRegularConfirm}
         onClose={() => {
           setShowRegularConfirm(false);
           setConfirmRegularChecked(false);
         }}
         maxWidth="sm"
         fullWidth
         PaperProps={{
           sx: {
             borderRadius: 3,
             boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
             border: '2px solid #6D2323',
             overflow: 'hidden',
           },
         }}
       >
         <DialogTitle
           sx={{
             px: 3,
           pt: 2.5,
           pb: 2,
             display: 'flex',
             alignItems: 'center',
             gap: 2,
             borderBottom: '3px solid #6D2323',
             backgroundColor: '#FFFFFF',
           }}
         >
           <Avatar
             sx={{
               bgcolor: 'rgba(109,35,35,0.08)',
               color: '#6D2323',
               width: 52,
               height: 52,
             }}
           >
             <Assignment sx={{ fontSize: 26 }} />
           </Avatar>
           <Box>
             <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#333' }}>
               Confirm Regular Payroll Submission
             </Typography>
             <Typography variant="body2" sx={{ color: '#666' }}>
               Final confirmation required before submitting to Regular payroll.
             </Typography>
           </Box>
         </DialogTitle>

         <DialogContent
           sx={{
             px: 4,
             pt: 5,
             pb: 3,
             backgroundColor: '#FFFFFF',
           }}
         >
           <Alert
             severity="info"
             icon={<InfoIcon />}
             sx={{
              mt: 2,
              mb: 3.5,
               borderRadius: 2,
               bgcolor: 'rgba(109,35,35,0.04)',
               border: '1px solid rgba(109,35,35,0.2)',
               '& .MuiAlert-icon': {
                 color: '#6D2323',
                 fontSize: 24,
               },
             }}
           >
             <Typography
               variant="body1"
               sx={{ fontWeight: 600, mb: 0.5, color: '#333' }}
             >
               {attendanceData.length} record(s) will be validated and submitted.
             </Typography>
             <Typography variant="body2" sx={{ color: '#555' }}>
               Please ensure all attendance records are complete and accurate
               before continuing. This action will forward data to Regular
               payroll processing.
             </Typography>
           </Alert>

           <Box
             sx={{
               p: 2.5,
               bgcolor: '#f9f9f9',
               borderRadius: 2,
               border: `2px solid ${
                 confirmRegularChecked ? '#6D2323' : '#e0e0e0'
               }`,
               display: 'flex',
               alignItems: 'flex-start',
               gap: 1.5,
               transition: 'all 0.2s ease',
               ...(confirmRegularChecked && {
                 bgcolor: 'rgba(109,35,35,0.04)',
               }),
             }}
           >
             <Checkbox
               checked={confirmRegularChecked}
               onChange={(e) => setConfirmRegularChecked(e.target.checked)}
               sx={{
                 color: '#6D2323',
                 '&.Mui-checked': {
                   color: '#6D2323',
                 },
                 mt: -0.5,
               }}
             />
             <Box>
               <Typography
                 variant="body1"
                 sx={{ fontWeight: 600, color: '#333', mb: 0.5 }}
               >
                 I confirm that I have reviewed all Regular payroll records.
               </Typography>
               <Typography variant="body2" sx={{ color: '#666' }}>
                 All information for Regular employees is accurate and ready for
                 submission to payroll. I understand this action cannot be
                 undone.
               </Typography>
             </Box>
           </Box>
         </DialogContent>

         <DialogActions
           sx={{
             px: 4,
             py: 3,
             backgroundColor: '#FFFFFF',
             borderTop: '1px solid rgba(0,0,0,0.06)',
             display: 'flex',
             justifyContent: 'flex-end',
             gap: 1.5,
           }}
         >
           <ProfessionalButton
             variant="outlined"
             onClick={() => {
               setShowRegularConfirm(false);
               setConfirmRegularChecked(false);
             }}
             sx={{
               minWidth: 120,
               borderColor: '#6D2323',
               color: '#6D2323',
               fontWeight: 600,
             }}
           >
             Cancel
           </ProfessionalButton>
           <ProfessionalButton
             variant="contained"
             disabled={!confirmRegularChecked || isSubmitting}
             onClick={async () => {
               setShowRegularConfirm(false);
               setConfirmRegularChecked(false);
               await submitToPayroll();
             }}
             sx={{
               minWidth: 160,
               bgcolor: '#6D2323',
               color: '#FEF9E1',
               fontWeight: 600,
               '&:hover': {
                 bgcolor: '#8B3333',
               },
               '&:disabled': {
                 bgcolor: 'rgba(0,0,0,0.12)',
                 color: 'rgba(0,0,0,0.4)',
               },
             }}
           >
             {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
           </ProfessionalButton>
         </DialogActions>
       </Dialog>

        <StyledModal
          open={modal.open}
          onClose={closeModal}
          title={modal.title}
          message={modal.message}
          type={modal.type}
          onConfirm={modal.onConfirm}
          showCancel={modal.showCancel}
        />

        <LoadingOverlay open={processingOverlay} message={processingMessage || 'Processing...'} />
        <SuccessfulOverlay
          open={successOverlay}
          action={successAction}
          showOkButton
          onClose={() => {
            setSuccessOverlay(false);
            if (successRedirect) {
              navigate(successRedirect);
            }
          }}
        />
      </Box>
    </Box>
  );
};

export default OverallAttendance;