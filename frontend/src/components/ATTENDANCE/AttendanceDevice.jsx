import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../../contexts/SocketContext';
import {
  Box,
  TextField,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Container,
  Card,
  CardContent,
  Grid,
  InputAdornment,
  Divider,
  Avatar,
  IconButton,
  Tooltip,
  Fade,
  Alert,
  alpha,
  CardHeader,
  Chip,
  styled,
  Backdrop,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Snackbar,
  Dialog,
} from '@mui/material';
import {
  Search,
  Person,
  CalendarToday,
  Today,
  ArrowBackIos,
  ArrowForwardIos,
  Clear,
  Send,
  Refresh,
  Info,
  Assignment,
  FilterList,
  NavigateNext,
  Print as PrintIcon,
  People,
  CheckCircle,
  ArrowBack, // ADD THIS
  ArrowForward, // ADD THIS
  SearchOutlined, // ADD THIS
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import AccessDenied from '../AccessDenied';
import usePageAccess from '../../hooks/usePageAccess';

const GlassCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  backdropFilter: 'blur(10px)',
  overflow: 'hidden',
  transition: 'box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
}));

const ProfessionalButton = styled(Button)(({ theme }) => ({
  borderRadius: 12,
  fontWeight: 600,
  padding: '12px 24px',
  transition: 'box-shadow 0.2s ease-in-out, background-color 0.2s',
  textTransform: 'none',
  fontSize: '0.95rem',
  letterSpacing: '0.025em',
}));

const ModernTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    transition:
      'box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  '& .MuiInputLabel-root': {
    fontWeight: 500,
  },
}));

const PremiumTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: 16,
  overflow: 'hidden',
  boxShadow: '0 4px 24px rgba(109, 35, 35, 0.06)',
  border: '1px solid rgba(109, 35, 35, 0.08)',
}));

const PremiumTableCell = styled(TableCell)(({ theme, isHeader = false }) => ({
  fontWeight: isHeader ? 600 : 500,
  padding: '18px 20px',
  borderBottom: isHeader
    ? '2px solid rgba(254, 249, 225, 0.5)'
    : '1px solid rgba(109, 35, 35, 0.06)',
  fontSize: '0.95rem',
  letterSpacing: '0.025em',
}));

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '109, 35, 35';
};

const formatTime = (time) => {
  if (!time) return 'N/A';
  if (time.includes('AM') || time.includes('PM')) {
    const [hour, minute, second] = time.split(/[: ]/);
    const paddedHour = hour.padStart(2, '0');
    return `${paddedHour}:${minute}:${second} ${time.slice(-2)}`;
  }
  const [hour, minute, second] = time.split(':');
  const hour24 = parseInt(hour, 10);
  const hour12 = hour24 % 12 || 12;
  const ampm = hour24 < 12 ? 'AM' : 'PM';
  return `${String(hour12).padStart(2, '0')}:${minute}:${second} ${ampm}`;
};

const getDayOfWeek = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

const ViewAttendanceRecord = () => {
  const { socket, connected } = useSocket();
  const { settings } = useSystemSettings();
  const [personID, setPersonID] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [records, setRecords] = useState([]);
  const [personName, setPersonName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [snackbarCountdown, setSnackbarCountdown] = useState(6);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // New states for users list
  const [allUsersDTR, setAllUsersDTR] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [surnameFilter, setSurnameFilter] = useState('All');
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);
  const [viewMode, setViewMode] = useState('single');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Department filter (All Users)
  const [departments, setDepartments] = useState([]);
  const [departmentAssignmentsMap, setDepartmentAssignmentsMap] = useState({});
  const [departmentCodeFilter, setDepartmentCodeFilter] = useState('');
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  // Pagination states
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordFilter, setRecordFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRecordsRef = useRef(null);
  const fetchAllUsersDTRRef = useRef(null);

  // Filter and pagination logic
  const getFilteredUsers = () => {
    let filtered = allUsersDTR.slice();

    // Apply record filter first
    if (recordFilter === 'has') {
      filtered = filtered.filter((u) => u.records && u.records.length > 0);
    } else if (recordFilter === 'no') {
      filtered = filtered.filter((u) => !u.records || u.records.length === 0);
    }

    // Apply department filter
    if (departmentCodeFilter) {
      filtered = filtered.filter((u) => {
        const deptCode = departmentAssignmentsMap?.[u.employeeNumber] || '';
        if (departmentCodeFilter === '__UNASSIGNED__') return !deptCode;
        return deptCode === departmentCodeFilter;
      });
    }

    if (!searchQuery || searchQuery.trim() === '') return filtered;
    const q = searchQuery.trim().toLowerCase();
    return filtered.filter((user) => {
      const full = (user.fullName || '').toLowerCase();
      const last = (user.lastName || '').toLowerCase();
      const emp = (user.employeeNumber || '').toLowerCase();
      return full.includes(q) || last.includes(q) || emp.includes(q);
    });
  };

  const filteredUsers = getFilteredUsers();
  const selectedCountInFiltered = filteredUsers.reduce((count, user) => {
    return selectedUsers.has(user.employeeNumber) ? count + 1 : count;
  }, 0);
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  const goToPage = (page) => {
    const p = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(p);
  };

  const highlightMatch = (text, q) => {
    if (!q || !text) return text;
    const lower = text.toLowerCase();
    const qLower = q.toLowerCase();
    const idx = lower.indexOf(qLower);
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + q.length);
    const after = text.slice(idx + q.length);
    return (
      <span>
        {before}
        <span
          style={{
            backgroundColor: '#ffeb3b', // yellow highlight for search/filter matches
            color: '#000',
            padding: '0 3px',
            borderRadius: 2,
          }}
        >
          {match}
        </span>
        {after}
      </span>
    );
  };

  const navigate = useNavigate();

  const primaryColor = settings.accentColor || '#FEF9E1';
  const secondaryColor = settings.backgroundColor || '#FFF8E7';
  const accentColor = settings.primaryColor || '#6d2323';
  const accentDark = settings.secondaryColor || '#8B3333';
  const textPrimaryColor = settings.textPrimaryColor || '#6d2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';
  const hoverColor = settings.hoverColor || '#6D2323';

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const formattedToday = `${year}-${month}-${day}`;

  const [selectedMonth, setSelectedMonth] = useState(null);

  const { hasAccess, loading: accessLoading } =
    usePageAccess('view-attendance');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  };

  const fetchDepartmentsAndAssignments = async () => {
    setLoadingDepartments(true);
    try {
      const [deptResponse, assignmentResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/department-table`, getAuthHeaders()),
        axios.get(`${API_BASE_URL}/api/department-assignment`, getAuthHeaders()),
      ]);

      const deptList = Array.isArray(deptResponse.data) ? deptResponse.data : [];
      deptList.sort((a, b) =>
        String(a?.code || '').localeCompare(String(b?.code || '')),
      );
      setDepartments(deptList);

      const assignments = Array.isArray(assignmentResponse.data)
        ? assignmentResponse.data
        : [];
      const map = {};
      assignments.forEach((a) => {
        if (!a?.employeeNumber) return;
        map[String(a.employeeNumber)] = a.code || '';
      });
      setDepartmentAssignmentsMap(map);
    } catch (error) {
      console.error('Error fetching departments/assignments:', error);
      // Keep UI usable even if this fails
      setDepartments([]);
      setDepartmentAssignmentsMap({});
      showSnackbar('Failed to load departments for filtering', 'warning');
    } finally {
      setLoadingDepartments(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
    setSnackbarCountdown(6);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Countdown timer for snackbar
  useEffect(() => {
    let timer;
    if (snackbar.open && snackbarCountdown > 0) {
      timer = setInterval(() => {
        setSnackbarCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [snackbar.open, snackbarCountdown]);

  // Load departments + assignments when switching to All Users mode
  useEffect(() => {
    if (viewMode !== 'multiple') return;
    fetchDepartmentsAndAssignments();
  }, [viewMode]);

  const fetchRecords = async (showLoading = true) => {
    if (!personID || !startDate || !endDate) return;
    if (showLoading) setLoading(true);
    setError('');

    try {
      // This endpoint now auto-saves records
      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/all-attendance`,
        { personID, startDate, endDate },
        getAuthHeaders(),
      );

      const responseData = response.data;

      const records = Array.isArray(responseData) ? responseData : [];
      setRecords(records);

      if (records.length > 0) {
        setPersonName(records[0].PersonName);
        showSnackbar(
          `Loaded ${records.length} records and auto-saved to database`,
          'success',
        );
      } else {
        setPersonName('');
        showSnackbar('No records found for this period', 'info');
      }
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      setError('Failed to fetch attendance records. Please try again.');
      showSnackbar('Failed to fetch attendance records', 'error');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Replace the fetchAllUsersDTR function with this improved version:

  const fetchAllUsersDTR = async () => {
    if (!startDate || !endDate) {
      showSnackbar('Please select start date and end date first', 'warning');
      return;
    }

    setLoadingAllUsers(true);
    try {
      // CHANGED: Fetch ALL users from device (not just registered users)
      const usersResponse = await axios.get(
        `${API_BASE_URL}/attendance/api/all-device-users`,
        getAuthHeaders(),
      );

      let users = usersResponse.data || [];

      // If a department is selected, apply it BEFORE fetching DTR (performance + "before sending")
      if (
        departmentCodeFilter &&
        Object.keys(departmentAssignmentsMap || {}).length === 0 &&
        !loadingDepartments
      ) {
        // Ensure we have assignments map available
        await fetchDepartmentsAndAssignments();
      }

      if (departmentCodeFilter) {
        const deptMap = departmentAssignmentsMap || {};
        users = users.filter((u) => {
          const empNo = String(u?.PersonID ?? '');
          const deptCode = deptMap[empNo] || '';
          if (departmentCodeFilter === '__UNASSIGNED__') return !deptCode;
          return deptCode === departmentCodeFilter;
        });
      }

      showSnackbar(`Found ${users.length} users in device records`, 'info');

      // Fetch DTR for each user
      const dtrPromises = users.map(async (user) => {
        try {
          const dtrResponse = await axios.post(
            `${API_BASE_URL}/attendance/api/all-attendance`,
            { personID: user.PersonID, startDate, endDate },
            getAuthHeaders(),
          );

          const dtrData = Array.isArray(dtrResponse.data) ? dtrResponse.data : [];

          return {
            employeeNumber: user.PersonID,
            firstName: user.PersonName ? user.PersonName.split(' ')[0] : '',
            lastName: user.PersonName
              ? user.PersonName.split(' ').slice(1).join(' ')
              : '',
            fullName: user.PersonName || user.PersonID,
            records: dtrData,
            hasRecords: dtrData.length > 0,
          };
        } catch (error) {
          console.error(`Error fetching DTR for ${user.PersonID}:`, error);
          return {
            employeeNumber: user.PersonID,
            firstName: user.PersonName ? user.PersonName.split(' ')[0] : '',
            lastName: user.PersonName
              ? user.PersonName.split(' ').slice(1).join(' ')
              : '',
            fullName: user.PersonName || user.PersonID,
            records: [],
            hasRecords: false,
          };
        }
      });

      const allDTRData = await Promise.all(dtrPromises);

      // Sort by last name
      allDTRData.sort((a, b) => {
        const lastNameA = (a.lastName || '').toUpperCase();
        const lastNameB = (b.lastName || '').toUpperCase();
        return lastNameA.localeCompare(lastNameB);
      });

      setAllUsersDTR(allDTRData);

      const totalRecords = allDTRData.reduce(
        (sum, user) => sum + user.records.length,
        0,
      );
      const usersWithRecords = allDTRData.filter((u) => u.hasRecords).length;

      // Show success message
      showSnackbar(
        `Loaded ${allDTRData.length} employees (${usersWithRecords} with records, ${totalRecords} total records auto-saved)`,
        'success',
      );

      // Show success modal if records were saved
      if (totalRecords > 0) {
        setModalMessage(
          `Successfully auto-saved ${totalRecords} attendance records for ${usersWithRecords} employees to the database. You can now view or print their DTR.`
        );
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error fetching all users DTR:', error);
      showSnackbar(
        'Error fetching users DTR data: ' +
          (error.response?.data?.error || error.message),
        'error',
      );
    } finally {
      setLoadingAllUsers(false);
    }
  };

  // Keep latest fetch functions for Socket.IO handler
  useEffect(() => {
    fetchRecordsRef.current = fetchRecords;
    fetchAllUsersDTRRef.current = fetchAllUsersDTR;
  });

  // Realtime: refresh when attendance data changes
  useEffect(() => {
    if (!socket || !connected) return;

    let debounceTimer = null;

    const handleAttendanceChanged = (payload) => {
      const changedPersonIDs = Array.isArray(payload?.personIDs)
        ? payload.personIDs
        : payload?.personID
          ? [payload.personID]
          : [];

      if (viewMode === 'single') {
        if (personID && changedPersonIDs.length > 0 && !changedPersonIDs.includes(personID)) {
          return;
        }
        if (personID && startDate && endDate) {
          fetchRecordsRef.current?.(false);
        }
        return;
      }

      // viewMode === 'multiple'
      if (!startDate || !endDate) return;
      if (allUsersDTR.length === 0) return; // avoid heavy refresh unless list is loaded

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchAllUsersDTRRef.current?.();
      }, 300);
    };

    socket.on('attendanceChanged', handleAttendanceChanged);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      socket.off('attendanceChanged', handleAttendanceChanged);
    };
  }, [socket, connected, viewMode, personID, startDate, endDate, allUsersDTR.length]);

  // ADD: New function for bulk auto-save all users at once
  const handleBulkAutoSave = async () => {
    if (!startDate || !endDate) {
      showSnackbar('Please select start date and end date first', 'warning');
      return;
    }

    setLoadingAllUsers(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/bulk-auto-save`,
        { startDate, endDate },
        getAuthHeaders(),
      );

      if (response.data.success) {
        showSnackbar(response.data.message, 'success');
        // Refresh the list
        fetchAllUsersDTR();
      }
    } catch (error) {
      console.error('Error bulk auto-saving:', error);
      showSnackbar(
        'Error auto-saving records: ' +
          (error.response?.data?.error || error.message),
        'error',
      );
    } finally {
      setLoadingAllUsers(false);
    }
  };
  const handleSendToDTR = async () => {
    if (!personID || !startDate || !endDate) {
      showSnackbar('Please fill in all fields first', 'warning');
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/send-to-dtr`,
        { personID, startDate, endDate },
        getAuthHeaders(),
      );

      if (response.data.success) {
        showSnackbar(response.data.message, 'success');
        // Navigate to DTR module
        navigate('/daily_time_record_faculty', {
          state: {
            employeeNumber: personID,
            fullName: personName,
            startDate,
            endDate,
          },
        });
      }
    } catch (error) {
      console.error('Error sending to DTR:', error);
      showSnackbar(
        error.response?.data?.message || 'Failed to view to DTR',
        'error',
      );
    }
  };

  const handleBulkSendToDTR = async () => {
    const filtered = getFilteredUsers();
    const selected = filtered.filter((user) =>
      selectedUsers.has(user.employeeNumber),
    );

    if (selected.length === 0) {
      showSnackbar('Please select at least one user', 'warning');
      return;
    }

    try {
      const userIDs = selected.map((user) => user.employeeNumber);
      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/bulk-send-to-dtr`,
        { userIDs, startDate, endDate },
        getAuthHeaders(),
      );

      if (response.data.success) {
        showSnackbar(response.data.message, 'success');
        // Navigate to DTR module with bulk data
        navigate('/daily_time_record_faculty', {
          state: {
            users: selected,
            startDate,
            endDate,
            isBulk: true,
          },
        });
      }
    } catch (error) {
      console.error('Error bulk sending to DTR:', error);
      showSnackbar(
        error.response?.data?.message || 'Failed to view DTR',
        'error',
      );
    }
  };

  const handleUserSelect = (employeeNumber) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(employeeNumber)) {
      newSelected.delete(employeeNumber);
    } else {
      newSelected.add(employeeNumber);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const filtered = getFilteredUsers();
      setSelectedUsers(new Set(filtered.map((user) => user.employeeNumber)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const getSurnameInitials = () => {
    const initials = new Set();
    allUsersDTR.forEach((user) => {
      const lastName = (user.lastName || '').toUpperCase();
      if (lastName.length > 0) initials.add(lastName[0]);
    });
    return Array.from(initials).sort();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    fetchRecords(true);
  };

  useEffect(() => {
    if (personID && startDate && endDate) {
      fetchRecords(false);
    }
  }, [startDate, endDate]);

  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];

  // Generate year options (current year ± 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const handleMonthClick = (monthIndex) => {
    const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const end = new Date(Date.UTC(selectedYear, monthIndex + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex); // Add this line
  };

  const handleClearFilters = () => {
    setPersonID('');
    setStartDate('');
    setEndDate('');
    setRecords([]);
    setPersonName('');
    setError('');
    setAllUsersDTR([]);
    setSelectedUsers(new Set());
    setDepartmentCodeFilter('');
    setSelectedMonth(null); // Add this line
  };

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

  if (hasAccess === false) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Device Attendance Records."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }

  return (
    <Box
      sx={{
        py: 4,
        width: '100vw',
        mx: 'auto',
        maxWidth: '100%',
        overflow: 'hidden',
        position: 'relative',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      <Box sx={{ px: 6, mx: 'auto', maxWidth: '1600px' }}>
        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{
              width: '100%',
              backgroundColor:
                snackbar.severity === 'success' ? '#4caf50' : undefined,
              color: snackbar.severity === 'success' ? '#ffffff' : undefined,
              fontWeight: 600,
              '& .MuiAlert-icon': {
                color: snackbar.severity === 'success' ? '#ffffff' : undefined,
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>{snackbar.message}</span>
              {snackbar.open && snackbarCountdown > 0 && (
                <Chip
                  label={`${snackbarCountdown}s`}
                  size="small"
                  sx={{
                    backgroundColor:
                      snackbar.severity === 'success'
                        ? 'rgba(255, 255, 255, 0.3)'
                        : undefined,
                    color:
                      snackbar.severity === 'success' ? '#ffffff' : undefined,
                    fontWeight: 700,
                  }}
                />
              )}
            </Box>
          </Alert>
        </Snackbar>

        {/* Success Modal */}
        <Dialog
          open={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              boxShadow: `0 8px 40px ${alpha(accentColor, 0.2)}`,
            },
          }}
        >
          <Box
            sx={{
              p: 4,
              textAlign: 'center',
              background: `linear-gradient(135deg, ${alpha(
                primaryColor,
                0.3
              )} 0%, ${alpha(secondaryColor, 0.5)} 100%)`,
            }}
          >
            <Avatar
              sx={{
                width: 80,
                height: 80,
                margin: '0 auto 20px',
                backgroundColor: '#4caf50',
              }}
            >
              <CheckCircle sx={{ fontSize: 48, color: '#ffffff' }} />
            </Avatar>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: textPrimaryColor,
                mb: 2,
              }}
            >
              Records Auto-Saved Successfully!
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: alpha(textPrimaryColor, 0.8),
                mb: 4,
                lineHeight: 1.6,
              }}
            >
              {modalMessage}
            </Typography>
            <ProfessionalButton
              variant="contained"
              onClick={() => setShowSuccessModal(false)}
              sx={{
                backgroundColor: accentColor,
                color: textSecondaryColor,
                px: 6,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 700,
                '&:hover': {
                  backgroundColor: accentDark,
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              OK
            </ProfessionalButton>
          </Box>
        </Dialog>

        {/* Header */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }}>
            <GlassCard
              sx={{
                background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
                boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`,
                border: `1px solid ${alpha(accentColor, 0.1)}`,
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <Box display="flex" alignItems="center">
                    <Avatar
                      sx={{
                        bgcolor: alpha(accentColor, 0.15),
                        mr: 4,
                        width: 64,
                        height: 64,
                      }}
                    >
                      <Search sx={{ color: textPrimaryColor, fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography
                        variant="h4"
                        component="h1"
                        sx={{ fontWeight: 700, mb: 1, color: textPrimaryColor }}
                      >
                        Device Attendance Records
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ opacity: 0.8, color: textPrimaryColor }}
                      >
                        Auto-saved records from biometric devices - ready for
                        DTR
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip
                      icon={<CheckCircle />}
                      label="Auto-Save Enabled"
                      size="small"
                      sx={{
                        bgcolor: alpha('#4caf50', 0.2),
                        color: '#2e7d32',
                        fontWeight: 600,
                      }}
                    />
                    <Box display="flex" gap={1}>
                      <ProfessionalButton
                        variant={
                          viewMode === 'single' ? 'contained' : 'outlined'
                        }
                        onClick={() => setViewMode('single')}
                        sx={{
                          backgroundColor:
                            viewMode === 'single' ? accentColor : 'transparent',
                          color:
                            viewMode === 'single'
                              ? textSecondaryColor
                              : textPrimaryColor,
                          borderColor: accentColor,
                          py: 0.75,
                          px: 2,
                        }}
                      >
                        Single User
                      </ProfessionalButton>
                      <ProfessionalButton
                        variant={
                          viewMode === 'multiple' ? 'contained' : 'outlined'
                        }
                        onClick={() => setViewMode('multiple')}
                        sx={{
                          backgroundColor:
                            viewMode === 'multiple'
                              ? accentColor
                              : 'transparent',
                          color:
                            viewMode === 'multiple'
                              ? textSecondaryColor
                              : textPrimaryColor,
                          borderColor: accentColor,
                          py: 0.75,
                          px: 2,
                        }}
                      >
                        All Users
                      </ProfessionalButton>
                    </Box>
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
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box component="form" onSubmit={handleSubmit}>
                {viewMode === 'single' && (
                  <Grid container spacing={4} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={4}>
                      <ModernTextField
                        fullWidth
                        label="Employee Number"
                        value={personID}
                        onChange={(e) => setPersonID(e.target.value)}
                        required
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
                )}

                {viewMode === 'multiple' && (
                  <Grid container spacing={4} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={6}>
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
                    <Grid item xs={12} md={6}>
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
                )}
                <Divider sx={{ my: 3, borderColor: alpha(accentColor, 0.1) }} />

                {/* Quick Date Selection Section */}
                <Box sx={{ mb: 4 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: textPrimaryColor,
                      display: 'flex',
                      alignItems: 'center',
                      mb: 2,
                    }}
                  >
                    <FilterList sx={{ mr: 2 }} />
                    Quick Date Selection
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: alpha(textPrimaryColor, 0.7), mb: 2 }}
                  >
                    Click any option below to automatically set the date range:
                  </Typography>

                  {/* Department Filter (All Users) */}
                  {viewMode === 'multiple' && (
                    <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      <FormControl
                        sx={{ minWidth: 320, backgroundColor: 'white' }}
                        disabled={loadingDepartments}
                      >
                        <InputLabel>Department</InputLabel>
                        <Select
                          value={departmentCodeFilter}
                          label="Department"
                          onChange={(e) => {
                            setDepartmentCodeFilter(e.target.value);
                            setCurrentPage(1);
                          }}
                        >
                          <MenuItem value="">All Departments</MenuItem>
                          <MenuItem value="__UNASSIGNED__">Unassigned</MenuItem>
                          {departments.map((d) => (
                            <MenuItem key={d.id ?? d.code} value={d.code}>
                              {d.code}
                              {d.description ? ` - ${d.description}` : ''}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <ProfessionalButton
                        variant="outlined"
                        onClick={fetchDepartmentsAndAssignments}
                        disabled={loadingDepartments}
                        startIcon={
                          loadingDepartments ? (
                            <CircularProgress size={18} />
                          ) : (
                            <Refresh />
                          )
                        }
                        sx={{ borderColor: accentColor, color: textPrimaryColor }}
                      >
                        Refresh Departments
                      </ProfessionalButton>
                    </Box>
                  )}

                  {/* Quick Filters Row */}
                  <Box
                    sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}
                  >
                    <ProfessionalButton
                      variant="outlined"
                      startIcon={<Today />}
                      onClick={() => {
                        setStartDate(formattedToday);
                        setEndDate(formattedToday);
                      }}
                      sx={{ borderColor: accentColor, color: textPrimaryColor }}
                    >
                      Today
                    </ProfessionalButton>
                    <ProfessionalButton
                      variant="outlined"
                      startIcon={<ArrowBackIos />}
                      onClick={() => {
                        const yesterday = new Date(today);
                        yesterday.setDate(yesterday.getDate() - 1);
                        setStartDate(yesterday.toISOString().substring(0, 10));
                        setEndDate(yesterday.toISOString().substring(0, 10));
                      }}
                      sx={{ borderColor: accentColor, color: textPrimaryColor }}
                    >
                      Yesterday
                    </ProfessionalButton>
                    <ProfessionalButton
                      variant="outlined"
                      onClick={() => {
                        const lastWeek = new Date(today);
                        lastWeek.setDate(lastWeek.getDate() - 7);
                        setStartDate(lastWeek.toISOString().substring(0, 10));
                        setEndDate(formattedToday);
                      }}
                      sx={{ borderColor: accentColor, color: textPrimaryColor }}
                    >
                      Last 7 Days
                    </ProfessionalButton>
                    <ProfessionalButton
                      variant="outlined"
                      onClick={() => {
                        const days15 = new Date(today);
                        days15.setDate(days15.getDate() - 15);
                        setStartDate(days15.toISOString().substring(0, 10));
                        setEndDate(formattedToday);
                      }}
                      sx={{ borderColor: accentColor, color: textPrimaryColor }}
                    >
                      Last 15 Days
                    </ProfessionalButton>
                    <ProfessionalButton
                      variant="outlined"
                      onClick={() => {
                        const lastMonth = new Date(today);
                        lastMonth.setMonth(lastMonth.getMonth() - 1);
                        setStartDate(lastMonth.toISOString().substring(0, 10));
                        setEndDate(formattedToday);
                      }}
                      sx={{ borderColor: accentColor, color: textPrimaryColor }}
                    >
                      Last 30 Days
                    </ProfessionalButton>
                  </Box>

                  {/* Month Selection */}
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      border: `2px dashed ${alpha(accentColor, 0.2)}`,
                      backgroundColor: alpha(primaryColor, 0.3),
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 2,
                      }}
                    >
                      <Box>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            color: textPrimaryColor,
                            fontWeight: 600,
                            mb: 0.5,
                          }}
                        >
                          Select Entire Month
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: alpha(textPrimaryColor, 0.7) }}
                        >
                          Choose a year, then click any month to view records
                          for that entire month
                        </Typography>
                      </Box>
                      <FormControl sx={{ minWidth: 140 }}>
                        <InputLabel sx={{ fontWeight: 600 }}>Year</InputLabel>
                        <Select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          label="Year"
                          sx={{
                            backgroundColor: 'white',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: accentColor,
                            },
                            borderRadius: 2,
                            fontWeight: 600,
                          }}
                        >
                          {yearOptions.map((year) => (
                            <MenuItem key={year} value={year}>
                              {year}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: 'repeat(3, 1fr)',
                          sm: 'repeat(4, 1fr)',
                          md: 'repeat(6, 1fr)',
                        },
                        gap: 1.5,
                      }}
                    >
                      {months.map((month, index) => {
                        const isSelected = selectedMonth === index;
                        return (
                          <ProfessionalButton
                            key={month}
                            variant={isSelected ? 'contained' : 'outlined'}
                            size="medium"
                            onClick={() => handleMonthClick(index)}
                            sx={{
                              borderColor: isSelected
                                ? accentColor
                                : accentColor,
                              backgroundColor: isSelected
                                ? accentColor
                                : 'transparent',
                              color: isSelected
                                ? textSecondaryColor
                                : textPrimaryColor,
                              py: 1.5,
                              fontWeight: 600,
                              '&:hover': {
                                backgroundColor: isSelected
                                  ? accentDark
                                  : alpha(accentColor, 0.1),
                                borderWidth: 2,
                              },
                              transition: 'all 0.3s ease',
                              boxShadow: isSelected
                                ? `0 4px 12px ${alpha(accentColor, 0.3)}`
                                : 'none',
                            }}
                          >
                            {month}
                          </ProfessionalButton>
                        );
                      })}
                    </Box>
                  </Box>
                </Box>

                {/* Clear Button */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <ProfessionalButton
                    variant="outlined"
                    startIcon={<Clear />}
                    onClick={handleClearFilters}
                    sx={{
                      borderColor: '#d32f2f',
                      color: '#d32f2f',
                      '&:hover': {
                        borderColor: '#b71c1c',
                        backgroundColor: alpha('#d32f2f', 0.05),
                      },
                    }}
                  >
                    Clear All Filters
                  </ProfessionalButton>
                </Box>
              </Box>
            </CardContent>
          </GlassCard>
        </Fade>

        {/* All Users DTR List */}
        {viewMode === 'multiple' && (
          <Fade in timeout={1000}>
            <GlassCard
              sx={{
                mb: 4,
                background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
                boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`,
              }}
            >
              <Box
                sx={{
                  p: 4,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  color: textPrimaryColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: textPrimaryColor }}
                >
                  All Users DTR List (Auto-Saved)
                </Typography>
                <Box display="flex" gap={2} flexWrap="wrap">
                  <ProfessionalButton
                    variant="contained"
                    onClick={fetchAllUsersDTR}
                    disabled={loadingAllUsers || !startDate || !endDate}
                    startIcon={
                      loadingAllUsers ? (
                        <CircularProgress size={20} />
                      ) : (
                        <People />
                      )
                    }
                    sx={{
                      backgroundColor: accentColor,
                      color: textSecondaryColor,
                    }}
                  >
                    {loadingAllUsers ? 'Loading...' : 'Load All Users'}
                  </ProfessionalButton>
                  {allUsersDTR.length > 0 && (
                    <ProfessionalButton
                      variant="contained"
                      onClick={handleBulkSendToDTR}
                      disabled={selectedCountInFiltered === 0}
                      startIcon={<Send />}
                      sx={{
                        backgroundColor: '#4caf50',
                        color: '#ffffff',
                        '&:hover': { backgroundColor: '#45a049' },
                      }}
                    >
                      View DTR ({selectedCountInFiltered})
                    </ProfessionalButton>
                  )}
                </Box>
              </Box>

              <Box sx={{ p: 4 }}>
                {allUsersDTR.length > 0 ? (
                  <>
                    {/* Toolbar with filters */}
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 2,
                        mb: 3,
                        flexWrap: 'wrap',
                        alignItems: 'center',
                      }}
                    >
                      {/* Search Box */}
                      <TextField
                        label="Search users"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchOutlined />
                            </InputAdornment>
                          ),
                        }}
                        sx={{ minWidth: 300, backgroundColor: 'white' }}
                      />

                      {/* Records Filter */}
                      <FormControl
                        sx={{ minWidth: 160, backgroundColor: 'white' }}
                      >
                        <InputLabel>Records</InputLabel>
                        <Select
                          value={recordFilter}
                          label="Records"
                          onChange={(e) => {
                            setRecordFilter(e.target.value);
                            setCurrentPage(1);
                          }}
                        >
                          <MenuItem value="all">All</MenuItem>
                          <MenuItem value="has">Has Records</MenuItem>
                          <MenuItem value="no">No Records</MenuItem>
                        </Select>
                      </FormControl>

                      {/* Select All Button */}
                      <ProfessionalButton
                        variant="outlined"
                        onClick={() =>
                          handleSelectAll(
                            selectedCountInFiltered !== filteredUsers.length,
                          )
                        }
                        sx={{ borderColor: accentColor, color: accentColor }}
                      >
                        {selectedCountInFiltered === filteredUsers.length
                          ? 'Deselect All'
                          : 'Select All'}
                      </ProfessionalButton>

                      {/* Rows Per Page */}
                      <FormControl
                        sx={{ minWidth: 140, backgroundColor: 'white' }}
                      >
                        <InputLabel>Rows</InputLabel>
                        <Select
                          value={rowsPerPage}
                          label="Rows"
                          onChange={(e) => {
                            setRowsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                        >
                          <MenuItem value={10}>10</MenuItem>
                          <MenuItem value={20}>20</MenuItem>
                          <MenuItem value={50}>50</MenuItem>
                          <MenuItem value={100}>100</MenuItem>
                        </Select>
                      </FormControl>

                      {/* Compact Pagination */}
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <IconButton
                          onClick={() => goToPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          sx={{ bgcolor: 'white' }}
                        >
                          <ArrowBack />
                        </IconButton>
                        <Typography sx={{ minWidth: 36, textAlign: 'center' }}>
                          {currentPage} / {totalPages}
                        </Typography>
                        <IconButton
                          onClick={() => goToPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          sx={{ bgcolor: 'white' }}
                        >
                          <ArrowForward />
                        </IconButton>
                      </Box>
                    </Box>

                    {/* Table */}
                    <PremiumTableContainer
                      sx={{
                        boxShadow: `0 4px 24px ${alpha(accentColor, 0.06)}`,
                        maxHeight: 400,
                      }}
                    >
                      <Table sx={{ minWidth: 800 }} stickyHeader>
                        <TableHead sx={{ bgcolor: alpha(primaryColor, 0.7) }}>
                          <TableRow>
                            <PremiumTableCell isHeader>
                              <Checkbox
                                checked={
                                  selectedCountInFiltered === filteredUsers.length &&
                                  filteredUsers.length > 0
                                }
                                indeterminate={
                                  selectedCountInFiltered > 0 &&
                                  selectedCountInFiltered < filteredUsers.length
                                }
                                onChange={(e) =>
                                  handleSelectAll(e.target.checked)
                                }
                              />
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Employee Number
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Department
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Full Name
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Last Name
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Records Count
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Status
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Action
                            </PremiumTableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {paginatedUsers.map((user) => (
                            <TableRow
                              key={user.employeeNumber}
                              sx={{
                                '&:nth-of-type(even)': {
                                  bgcolor: alpha(primaryColor, 0.3),
                                },
                                '&:hover': {
                                  bgcolor: alpha(accentColor, 0.05),
                                },
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <PremiumTableCell>
                                <Checkbox
                                  checked={selectedUsers.has(
                                    user.employeeNumber,
                                  )}
                                  onChange={() =>
                                    handleUserSelect(user.employeeNumber)
                                  }
                                />
                              </PremiumTableCell>
                              <PremiumTableCell>
                                {user.employeeNumber}
                              </PremiumTableCell>
                              <PremiumTableCell>
                                {(() => {
                                  const dept =
                                    departmentAssignmentsMap?.[
                                      user.employeeNumber
                                    ] || '';
                                  return dept ? (
                                    <Chip label={dept} size="small" />
                                  ) : (
                                    <Chip
                                      label="Unassigned"
                                      size="small"
                                      variant="outlined"
                                    />
                                  );
                                })()}
                              </PremiumTableCell>
                              <PremiumTableCell>
                                {searchQuery
                                  ? highlightMatch(user.fullName, searchQuery)
                                  : user.fullName}
                              </PremiumTableCell>
                              <PremiumTableCell>
                                {user.lastName}
                              </PremiumTableCell>
                              <PremiumTableCell>
                                {user.records.length}
                              </PremiumTableCell>
                              <PremiumTableCell>
                                <Chip
                                  label={
                                    user.records.length > 0
                                      ? 'Auto-Saved'
                                      : 'No Records'
                                  }
                                  color={
                                    user.records.length > 0
                                      ? 'success'
                                      : 'default'
                                  }
                                  size="small"
                                  icon={
                                    user.records.length > 0 ? (
                                      <CheckCircle />
                                    ) : undefined
                                  }
                                />
                              </PremiumTableCell>
                              <PremiumTableCell>
                                <ProfessionalButton
                                  variant="contained"
                                  size="small"
                                  startIcon={<Send />}
                                  onClick={() => {
                                    navigate('/daily_time_record_faculty', {
                                      state: {
                                        employeeNumber: user.employeeNumber,
                                        fullName: user.fullName,
                                        startDate,
                                        endDate,
                                      },
                                    });
                                  }}
                                  disabled={user.records.length === 0}
                                  sx={{
                                    backgroundColor: '#4caf50',
                                    color: '#ffffff',
                                    py: 0.5,
                                    px: 1.5,
                                    '&:hover': { backgroundColor: '#45a049' },
                                    '&:disabled': {
                                      backgroundColor: alpha('#4caf50', 0.3),
                                      color: alpha('#ffffff', 0.5),
                                    },
                                  }}
                                >
                                  View DTR
                                </ProfessionalButton>
                              </PremiumTableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </PremiumTableContainer>

                    {/* Bottom Pagination */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mt: 2,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ color: textPrimaryColor }}
                      >
                        Showing{' '}
                        {Math.min(
                          filteredUsers.length,
                          (currentPage - 1) * rowsPerPage + 1,
                        )}{' '}
                        -{' '}
                        {Math.min(
                          filteredUsers.length,
                          currentPage * rowsPerPage,
                        )}{' '}
                        of {filteredUsers.length} users
                      </Typography>
                      <Box
                        sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
                      >
                        <ProfessionalButton
                          variant="outlined"
                          onClick={() => goToPage(1)}
                          disabled={currentPage === 1}
                        >
                          First
                        </ProfessionalButton>
                        <ProfessionalButton
                          variant="outlined"
                          onClick={() => goToPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Prev
                        </ProfessionalButton>
                        <ProfessionalButton
                          variant="outlined"
                          onClick={() => goToPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </ProfessionalButton>
                        <ProfessionalButton
                          variant="outlined"
                          onClick={() => goToPage(totalPages)}
                          disabled={currentPage === totalPages}
                        >
                          Last
                        </ProfessionalButton>
                      </Box>
                    </Box>
                  </>
                ) : (
                  <Box
                    sx={{
                      textAlign: 'center',
                      py: 4,
                      color: textPrimaryColor,
                      opacity: 0.7,
                    }}
                  >
                    <Typography variant="body1">
                      Click "Load All Users" to fetch and auto-save all users'
                      DTR data
                    </Typography>
                  </Box>
                )}
              </Box>
            </GlassCard>
          </Fade>
        )}

        {/* Loading Backdrop */}
        <Backdrop
          sx={{
            color: textSecondaryColor,
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
          open={loading}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress color="inherit" size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 2, color: textSecondaryColor }}>
              Fetching and auto-saving records...
            </Typography>
          </Box>
        </Backdrop>

        {error && (
          <Fade in timeout={300}>
            <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
              {error}
            </Alert>
          </Fade>
        )}

        {/* Single User Results */}
        {viewMode === 'single' && personName && (
          <Fade in={!loading} timeout={500}>
            <GlassCard
              sx={{
                mb: 4,
                background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
                boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`,
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
                      mb: 1,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: textPrimaryColor,
                    }}
                  >
                    Device Record Summary (Auto-Saved)
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 600, mb: 1, color: textPrimaryColor }}
                  >
                    {personName}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      mt: 2,
                    }}
                  >
                    <Chip
                      icon={<Assignment />}
                      label={`${records.length} Records`}
                      size="small"
                      sx={{
                        bgcolor: alpha(accentColor, 0.15),
                        color: textPrimaryColor,
                        fontWeight: 500,
                      }}
                    />
                    <Chip
                      icon={<CheckCircle />}
                      label="Auto-Saved"
                      size="small"
                      sx={{
                        bgcolor: alpha('#4caf50', 0.2),
                        color: '#2e7d32',
                        fontWeight: 500,
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{ opacity: 0.8, color: textPrimaryColor }}
                    >
                      {startDate} to {endDate}
                    </Typography>
                  </Box>
                </Box>
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="flex-end"
                  gap={2}
                >
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
                    {personName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()}
                  </Avatar>
                  <ProfessionalButton
                    variant="contained"
                    startIcon={<Send />}
                    onClick={handleSendToDTR}
                    disabled={records.length === 0}
                    sx={{
                      backgroundColor: '#4caf50',
                      color: '#ffffff',
                      py: 1.5,
                      px: 3,
                      '&:hover': { backgroundColor: '#45a049' },
                    }}
                  >
                    View DTR Module
                  </ProfessionalButton>
                </Box>
              </Box>

              <PremiumTableContainer
                sx={{ boxShadow: `0 4px 24px ${alpha(accentColor, 0.06)}` }}
              >
                <Table sx={{ minWidth: 800 }}>
                  <TableHead sx={{ bgcolor: alpha(primaryColor, 0.7) }}>
                    <TableRow>
                      <PremiumTableCell
                        isHeader
                        sx={{ color: textPrimaryColor }}
                      >
                        Employee ID
                      </PremiumTableCell>
                      <PremiumTableCell
                        isHeader
                        sx={{ color: textPrimaryColor }}
                      >
                        Date
                      </PremiumTableCell>
                      <PremiumTableCell
                        isHeader
                        sx={{ color: textPrimaryColor }}
                      >
                        Day
                      </PremiumTableCell>
                      <PremiumTableCell
                        isHeader
                        sx={{ color: textPrimaryColor }}
                      >
                        Time IN
                      </PremiumTableCell>
                      <PremiumTableCell
                        isHeader
                        sx={{ color: textPrimaryColor }}
                      >
                        Break IN
                      </PremiumTableCell>
                      <PremiumTableCell
                        isHeader
                        sx={{ color: textPrimaryColor }}
                      >
                        Break OUT
                      </PremiumTableCell>
                      <PremiumTableCell
                        isHeader
                        sx={{ color: textPrimaryColor }}
                      >
                        Time OUT
                      </PremiumTableCell>
                      <PremiumTableCell
                        isHeader
                        sx={{ color: textPrimaryColor }}
                      >
                        Special Type
                      </PremiumTableCell>
                      <PremiumTableCell
                        isHeader
                        sx={{ color: textPrimaryColor }}
                      >
                        Special Time IN
                      </PremiumTableCell>
                      <PremiumTableCell
                        isHeader
                        sx={{ color: textPrimaryColor }}
                      >
                        Special Time OUT
                      </PremiumTableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Info
                              sx={{
                                fontSize: 80,
                                color: alpha(accentColor, 0.3),
                                mb: 3,
                              }}
                            />
                            <Typography
                              variant="h5"
                              color={alpha(accentColor, 0.6)}
                              gutterBottom
                              sx={{ fontWeight: 600 }}
                            >
                              No Records Found
                            </Typography>
                            <Typography
                              variant="body1"
                              color={alpha(accentColor, 0.4)}
                            >
                              Try adjusting your date range or search for a
                              different employee
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      records.map((record, index) => {
                        // Determine special type based on Time5/Time6
                        let specialTypeBadge = null;
                        const hasSpecialTime = record.Time5 || record.Time6;

                        if (hasSpecialTime) {
                          // If we have specialType from backend, use it
                          const type = record.specialType || 'UNCATEGORIZED';
                          const typeLabels = {
                            HONORARIUM: 'Honorarium',
                            SERVICE: 'Service Credit',
                            OVERTIME: 'Overtime',
                            UNCATEGORIZED: 'Uncategorized',
                          };
                          const colors = {
                            HONORARIUM: { bg: '#4CAF50', text: '#fff' },
                            SERVICE: { bg: '#2196F3', text: '#fff' },
                            OVERTIME: { bg: '#FF9800', text: '#fff' },
                            UNCATEGORIZED: { bg: '#9E9E9E', text: '#fff' },
                          };
                          const label = typeLabels[type] || 'Uncategorized';
                          const badgeColor = colors[type] || colors.UNCATEGORIZED;

                          specialTypeBadge = (
                            <Chip
                              label={label}
                              size="small"
                              sx={{
                                bgcolor: badgeColor.bg,
                                color: badgeColor.text,
                                fontWeight: 600,
                                fontSize: '0.75rem',
                              }}
                            />
                          );
                        }

                        return (
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
                            <PremiumTableCell>{record.PersonID}</PremiumTableCell>
                            <PremiumTableCell>{record.Date}</PremiumTableCell>
                            <PremiumTableCell>
                              {getDayOfWeek(record.Date)}
                            </PremiumTableCell>
                            <PremiumTableCell>
                              {formatTime(record.Time1)}
                            </PremiumTableCell>
                            <PremiumTableCell>
                              {formatTime(record.Time3)}
                            </PremiumTableCell>
                            <PremiumTableCell>
                              {formatTime(record.Time2)}
                            </PremiumTableCell>
                            <PremiumTableCell>
                              {formatTime(record.Time4)}
                            </PremiumTableCell>
                            <PremiumTableCell>
                              {specialTypeBadge || '-'}
                            </PremiumTableCell>
                            <PremiumTableCell>
                              {record.Time5 ? formatTime(record.Time5) : '-'}
                            </PremiumTableCell>
                            <PremiumTableCell>
                              {record.Time6 ? formatTime(record.Time6) : '-'}
                            </PremiumTableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </PremiumTableContainer>
            </GlassCard>
          </Fade>
        )}
      </Box>
    </Box>
  );
};

export default ViewAttendanceRecord;
