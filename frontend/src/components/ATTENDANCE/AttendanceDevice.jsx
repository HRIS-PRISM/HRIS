import API_BASE_URL from '../../apiConfig';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Container,
  Card,
  CardContent,
  Grid,
  InputAdornment,
  Divider,
  Avatar,
  IconButton,
  Fade,
  Alert,
  alpha,
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
  LinearProgress,
} from '@mui/material';
import {
  Search,
  Person,
  CalendarToday,
  Today,
  ArrowBackIos,
  Clear,
  Send,
  Refresh,
  Info,
  Assignment,
  FilterList,
  People,
  CheckCircle,
  ArrowBack,
  ArrowForward,
  SearchOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import AccessDenied from '../AccessDenied';
import usePageAccess from '../../hooks/usePageAccess';

const GlassCard = styled(Card)(() => ({
  borderRadius: 20,
  backdropFilter: 'blur(10px)',
  overflow: 'hidden',
  transition: 'box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
}));

const ProfessionalButton = styled(Button)(() => ({
  borderRadius: 12,
  fontWeight: 600,
  padding: '12px 24px',
  transition: 'box-shadow 0.2s ease-in-out, background-color 0.2s',
  textTransform: 'none',
  fontSize: '0.95rem',
  letterSpacing: '0.025em',
}));

const ModernTextField = styled(TextField)(() => ({
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

const PremiumTableContainer = styled(TableContainer)(() => ({
  borderRadius: 16,
  overflowX: 'auto',
  boxShadow: '0 4px 24px rgba(109, 35, 35, 0.06)',
  border: '1px solid rgba(109, 35, 35, 0.08)',
}));

const PremiumTableCell = styled(TableCell)(({ isHeader = false }) => ({
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
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
        result[3],
        16,
      )}`
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

// Full name formatter for "Lastname, Firstname Middlename/MI Extension"
const formatFullName = (fullName) => {
  if (!fullName) return '';
  const cleaned = String(fullName).trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';

  const parts = cleaned.split(' ');
  const suffixes = new Set(['JR', 'JR.', 'SR', 'SR.', 'II', 'III', 'IV', 'V']);

  let suffix = '';
  const lastTokenUpper = parts[parts.length - 1]?.toUpperCase();
  if (suffixes.has(lastTokenUpper)) suffix = parts.pop();

  if (parts.length === 1) return suffix ? `${parts[0]} ${suffix}` : parts[0];

  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  const middleParts = parts.slice(1, parts.length - 1);

  const middleFormatted = middleParts
    .map((m) => {
      const mm = String(m).replace(/\./g, '');
      if (mm.length === 1) return `${mm.toUpperCase()}.`;
      return m;
    })
    .join(' ');

  const base = `${lastName}, ${firstName}${
    middleFormatted ? ` ${middleFormatted}` : ''
  }`;
  return suffix ? `${base} ${suffix}` : base;
};

// ✅ highlight fix: trims query so clearing removes highlight
const highlightMatch = (text, q) => {
  const query = (q || '').trim();
  if (!query || !text) return text;

  const s = String(text);
  const lower = s.toLowerCase();
  const qLower = query.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx === -1) return text;

  const before = s.slice(0, idx);
  const match = s.slice(idx, idx + query.length);
  const after = s.slice(idx + query.length);

  return (
    <span>
      {before}
      <span
        style={{
          backgroundColor: '#ffeb3b',
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

const ViewAttendanceRecord = () => {
  const { socket, connected } = useSocket();
  const { settings } = useSystemSettings();
  const navigate = useNavigate();

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

  // All Users
  const [allUsersDTR, setAllUsersDTR] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);
  const [viewMode, setViewMode] = useState('single');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);

  // Department filter
  const [departments, setDepartments] = useState([]);
  const [departmentAssignmentsMap, setDepartmentAssignmentsMap] = useState({});
  const [departmentCodeFilter, setDepartmentCodeFilter] = useState('');
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  // Pagination + filters
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordFilter, setRecordFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ✅ Debounced search (reduces lag while typing)
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => clearTimeout(t);
  }, [searchQuery]);
  const trimmedSearch = debouncedSearch.trim();

  // ✅ Progress loading screen for Load All Users (NO NAMES)
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressDone, setProgressDone] = useState(0);

  const fetchRecordsRef = useRef(null);
  const fetchAllUsersDTRRef = useRef(null);

  const { hasAccess, loading: accessLoading } = usePageAccess('view-attendance');

  const primaryColor = settings.accentColor || '#FEF9E1';
  const secondaryColor = settings.backgroundColor || '#FFF8E7';
  const accentColor = settings.primaryColor || '#6d2323';
  const accentDark = settings.secondaryColor || '#8B3333';
  const textPrimaryColor = settings.textPrimaryColor || '#6d2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';

  const today = new Date();
  const formattedToday = `${today.getFullYear()}-${String(
    today.getMonth() + 1,
  ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
    setSnackbarCountdown(6);
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  useEffect(() => {
    let timer;
    if (snackbar.open && snackbarCountdown > 0) {
      timer = setInterval(() => {
        setSnackbarCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [snackbar.open, snackbarCountdown]);

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
    } catch (err) {
      console.error('Error fetching departments/assignments:', err);
      setDepartments([]);
      setDepartmentAssignmentsMap({});
      showSnackbar('Failed to load departments for filtering', 'warning');
    } finally {
      setLoadingDepartments(false);
    }
  };

  useEffect(() => {
    if (viewMode !== 'multiple') return;
    fetchDepartmentsAndAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // ✅ MEMO: filtered list (fast)
  const filteredUsers = useMemo(() => {
    let filtered = allUsersDTR.slice();

    if (recordFilter === 'has') {
      filtered = filtered.filter((u) => (u.recordsCount || 0) > 0);
    } else if (recordFilter === 'no') {
      filtered = filtered.filter((u) => (u.recordsCount || 0) === 0);
    }

    if (departmentCodeFilter) {
      filtered = filtered.filter((u) => {
        const deptCode = departmentAssignmentsMap?.[u.employeeNumber] || '';
        if (departmentCodeFilter === '__UNASSIGNED__') return !deptCode;
        return deptCode === departmentCodeFilter;
      });
    }

    if (!trimmedSearch) return filtered;

    const q = trimmedSearch.toLowerCase();
    return filtered.filter((user) => {
      const full = (user.fullName || '').toLowerCase();
      const last = (user.lastName || '').toLowerCase();
      const emp = (user.employeeNumber || '').toLowerCase();
      return full.includes(q) || last.includes(q) || emp.includes(q);
    });
  }, [
    allUsersDTR,
    recordFilter,
    departmentCodeFilter,
    departmentAssignmentsMap,
    trimmedSearch,
  ]);

  const selectedCountInFiltered = useMemo(() => {
    let count = 0;
    for (const u of filteredUsers) if (selectedUsers.has(u.employeeNumber)) count++;
    return count;
  }, [filteredUsers, selectedUsers]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage)),
    [filteredUsers.length, rowsPerPage],
  );

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredUsers.slice(start, start + rowsPerPage);
  }, [filteredUsers, currentPage, rowsPerPage]);

  const goToPage = (page) => {
    const p = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(p);
  };

  const fetchRecords = async (showLoading = true) => {
    if (!personID || !startDate || !endDate) return;
    if (showLoading) setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/all-attendance`,
        { personID, startDate, endDate },
        getAuthHeaders(),
      );

      const recs = Array.isArray(response.data) ? response.data : [];
      setRecords(recs);

      if (recs.length > 0) {
        setPersonName(recs[0].PersonName);
        showSnackbar(
          `Loaded ${recs.length} records and auto-saved to database`,
          'success',
        );
      } else {
        setPersonName('');
        showSnackbar('No records found for this period', 'info');
      }
    } catch (err) {
      console.error('Error fetching attendance records:', err);
      setError('Failed to fetch attendance records. Please try again.');
      showSnackbar('Failed to fetch attendance records', 'error');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // ✅ Load All Users with progress screen (no employee names shown)
  const fetchAllUsersDTR = async () => {
    if (!startDate || !endDate) {
      showSnackbar('Please select start date and end date first', 'warning');
      return;
    }

    setLoadingAllUsers(true);

    // open loading screen
    setProgressOpen(true);
    setProgressDone(0);
    setProgressTotal(0);

    try {
      const usersResponse = await axios.get(
        `${API_BASE_URL}/attendance/api/all-device-users`,
        getAuthHeaders(),
      );

      let users = usersResponse.data || [];

      if (
        departmentCodeFilter &&
        Object.keys(departmentAssignmentsMap || {}).length === 0 &&
        !loadingDepartments
      ) {
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

      setProgressTotal(users.length);
      setProgressDone(0);

      const dtrPromises = users.map(async (user) => {
        const empNo = user?.PersonID;
        const displayName = user?.PersonName || empNo || 'Unknown';

        try {
          const dtrResponse = await axios.post(
            `${API_BASE_URL}/attendance/api/all-attendance`,
            { personID: empNo, startDate, endDate },
            getAuthHeaders(),
          );

          const dtrData = Array.isArray(dtrResponse.data) ? dtrResponse.data : [];

          // ✅ keep list light (count only)
          return {
            employeeNumber: empNo,
            firstName: displayName ? displayName.split(' ')[0] : '',
            lastName: displayName
              ? displayName.split(' ').slice(1).join(' ')
              : '',
            fullName: displayName,
            recordsCount: dtrData.length,
            hasRecords: dtrData.length > 0,
          };
        } catch (err) {
          console.error(`Error fetching DTR for ${empNo}:`, err);
          return {
            employeeNumber: empNo,
            firstName: displayName ? displayName.split(' ')[0] : '',
            lastName: displayName
              ? displayName.split(' ').slice(1).join(' ')
              : '',
            fullName: displayName,
            recordsCount: 0,
            hasRecords: false,
          };
        } finally {
          setProgressDone((prev) => prev + 1);
        }
      });

      const allDTRData = await Promise.all(dtrPromises);

      allDTRData.sort((a, b) => {
        const lastNameA = (a.lastName || '').toUpperCase();
        const lastNameB = (b.lastName || '').toUpperCase();
        return lastNameA.localeCompare(lastNameB);
      });

      setAllUsersDTR(allDTRData);

      const totalRecords = allDTRData.reduce(
        (sum, u) => sum + (u.recordsCount || 0),
        0,
      );
      const usersWithRecords = allDTRData.filter((u) => u.hasRecords).length;

      showSnackbar(
        `Loaded ${allDTRData.length} employees (${usersWithRecords} with records, ${totalRecords} total records auto-saved)`,
        'success',
      );

      if (totalRecords > 0) {
        setModalMessage(
          `Successfully auto-saved ${totalRecords} attendance records for ${usersWithRecords} employees to the database. You can now view or print their DTR.`,
        );
        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error('Error fetching all users DTR:', err);
      showSnackbar(
        'Error fetching users DTR data: ' +
          (err.response?.data?.error || err.message),
        'error',
      );
    } finally {
      setLoadingAllUsers(false);
      setTimeout(() => setProgressOpen(false), 250);
    }
  };

  useEffect(() => {
    fetchRecordsRef.current = fetchRecords;
    fetchAllUsersDTRRef.current = fetchAllUsersDTR;
  });

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
        if (
          personID &&
          changedPersonIDs.length > 0 &&
          !changedPersonIDs.includes(personID)
        ) {
          return;
        }
        if (personID && startDate && endDate) {
          fetchRecordsRef.current?.(false);
        }
        return;
      }

      if (!startDate || !endDate) return;
      if (allUsersDTR.length === 0) return;

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
  }, [
    socket,
    connected,
    viewMode,
    personID,
    startDate,
    endDate,
    allUsersDTR.length,
  ]);

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
        navigate('/daily_time_record_faculty', {
          state: {
            employeeNumber: personID,
            fullName: personName,
            startDate,
            endDate,
          },
        });
      }
    } catch (err) {
      console.error('Error sending to DTR:', err);
      showSnackbar(err.response?.data?.message || 'Failed to view to DTR', 'error');
    }
  };

  const handleBulkSendToDTR = async () => {
    const selected = filteredUsers.filter((u) =>
      selectedUsers.has(u.employeeNumber),
    );

    if (selected.length === 0) {
      showSnackbar('Please select at least one user', 'warning');
      return;
    }

    try {
      const userIDs = selected.map((u) => u.employeeNumber);
      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/bulk-send-to-dtr`,
        { userIDs, startDate, endDate },
        getAuthHeaders(),
      );

      if (response.data.success) {
        showSnackbar(response.data.message, 'success');
        navigate('/daily_time_record_faculty', {
          state: { users: selected, startDate, endDate, isBulk: true },
        });
      }
    } catch (err) {
      console.error('Error bulk sending to DTR:', err);
      showSnackbar(err.response?.data?.message || 'Failed to view DTR', 'error');
    }
  };

  const handleUserSelect = (employeeNumber) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(employeeNumber)) next.delete(employeeNumber);
      else next.add(employeeNumber);
      return next;
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.employeeNumber)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    fetchRecords(true);
  };

  useEffect(() => {
    if (personID && startDate && endDate) fetchRecords(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const handleMonthClick = (monthIndex) => {
    const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const end = new Date(Date.UTC(selectedYear, monthIndex + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex);
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
    setSelectedMonth(null);
    setSearchQuery('');
    setCurrentPage(1);
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

  const allUsersTableMaxHeight = 520;

  // ✅ progress % for loading screen
  const pct =
    progressTotal > 0
      ? Math.min(100, Math.round((progressDone / progressTotal) * 100))
      : 0;

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

        {/* ✅ Loading Screen (Progress) — white bg, green bar, moving icon, NO NAMES */}
        <Dialog
          open={progressOpen}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              p: 0,
              backgroundColor: '#ffffff',
              boxShadow: `0 10px 50px ${alpha(accentColor, 0.12)}`,
              overflow: 'hidden',
            },
          }}
        >
          <Box
            sx={{
              p: 4,
              minHeight: 320,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              gap: 2,
            }}
          >
            {(() => {
              const total = progressTotal || 0;
              const done = progressDone || 0;
              const pct =
                total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

              return (
                <>
                  {/* ✅ Title */}
                  <Typography
                    sx={{
                      fontWeight: 900,
                      fontSize: '1.4rem',
                      color: '#111',
                      mb: 0.5,
                    }}
                  >
                    Loading All Users
                  </Typography>

                  {/* ✅ Big Spinner Center */}
                  <CircularProgress
                    size={90}
                    thickness={4.2}
                    sx={{ color: '#2e7d32', my: 1 }}
                  />

                  {/* ✅ Big Percentage */}
                  <Typography
                    sx={{
                      fontWeight: 1000,
                      fontSize: '1.5rem',
                      lineHeight: 1,
                      color: '#2e7d32',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {pct}%
                  </Typography>

                  {/* ✅ Green Progress Line */}
                  <Box sx={{ width: '100%', maxWidth: 420, mt: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{
                        height: 14,
                        borderRadius: 99,
                        backgroundColor: '#eeeeee',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 99,
                          backgroundColor: '#2e7d32',
                        },
                      }}
                    />
                  </Box>

                  {/* ✅ Processed counter */}
                  <Typography
                    variant="body2"
                    sx={{ color: '#444', fontWeight: 700, mt: 1 }}
                  >
                    {done} / {total} processed
                  </Typography>

                  <Typography variant="caption" sx={{ color: '#666' }}>
                    Please wait while records are being fetched and auto-saved...
                  </Typography>
                </>
              );
            })()}
          </Box>
        </Dialog>

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
                0.3,
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
                    background: `radial-gradient(circle, ${alpha(
                      accentColor,
                      0.1,
                    )} 0%, ${alpha(accentColor, 0)} 70%)`,
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
                        Auto-saved records from biometric devices - ready for DTR
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
                        variant={viewMode === 'single' ? 'contained' : 'outlined'}
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

                {/* Quick Date Selection */}
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

                  {/* Department Filter (All Users) */}
                  {viewMode === 'multiple' && (
                    <Box
                      sx={{
                        mb: 3,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 2,
                      }}
                    >
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
                        sx={{
                          borderColor: accentColor,
                          color: textPrimaryColor,
                        }}
                      >
                        Refresh Departments
                      </ProfessionalButton>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
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
                          Choose a year, then click any month to set the range
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
                          {yearOptions.map((y) => (
                            <MenuItem key={y} value={y}>
                              {y}
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
                      {months.map((m, index) => {
                        const isSelected = selectedMonth === index;
                        return (
                          <ProfessionalButton
                            key={m}
                            variant={isSelected ? 'contained' : 'outlined'}
                            size="medium"
                            onClick={() => handleMonthClick(index)}
                            sx={{
                              borderColor: accentColor,
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
                            {m}
                          </ProfessionalButton>
                        );
                      })}
                    </Box>
                  </Box>
                </Box>

                {/* Clear Button + Snackbar below it */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
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

                  {/* ✅ Snackbar moved here — visible right below Clear All Filters, no scrolling needed */}
                  <Snackbar
                    open={snackbar.open}
                    autoHideDuration={6000}
                    onClose={handleCloseSnackbar}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    sx={{
                      position: 'relative',
                      top: 'unset !important',
                      left: 'unset !important',
                      right: 'unset !important',
                      bottom: 'unset !important',
                      transform: 'none !important',
                      width: '400px',
                    }}
                  >
                    <Alert
                      onClose={handleCloseSnackbar}
                      severity={snackbar.severity}
                      sx={{
                        width: '10  0%',
                        backgroundColor:
                          snackbar.severity === 'success' ? '#4caf50' : undefined,
                        color: snackbar.severity === 'success' ? '#ffffff' : undefined,
                        fontWeight: 600,
                        '& .MuiAlert-icon': {
                          color:
                            snackbar.severity === 'success' ? '#ffffff' : undefined,
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
                </Box>
              </Box>
            </CardContent>
          </GlassCard>
        </Fade>

        {/* All Users */}
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
                    {/* Toolbar */}
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 2,
                        mb: 3,
                        flexWrap: 'wrap',
                        alignItems: 'center',
                      }}
                    >
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
                          endAdornment: searchQuery ? (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSearchQuery('');
                                  setCurrentPage(1);
                                }}
                              >
                                <Clear />
                              </IconButton>
                            </InputAdornment>
                          ) : null,
                        }}
                        sx={{ minWidth: 300, backgroundColor: 'white' }}
                      />

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
                    </Box>

                    {/* Table */}
                    <PremiumTableContainer
                      sx={{
                        boxShadow: `0 4px 24px ${alpha(accentColor, 0.06)}`,
                        maxHeight: allUsersTableMaxHeight,
                        overflowY: 'auto',
                      }}
                    >
                      <Table sx={{ minWidth: 800 }} stickyHeader>
                        <TableHead sx={{ bgcolor: alpha(primaryColor, 0.7) }}>
                          <TableRow>
                            <PremiumTableCell isHeader>
                              <Checkbox
                                checked={
                                  selectedCountInFiltered ===
                                    filteredUsers.length &&
                                  filteredUsers.length > 0
                                }
                                indeterminate={
                                  selectedCountInFiltered > 0 &&
                                  selectedCountInFiltered < filteredUsers.length
                                }
                                onChange={(e) =>
                                  handleSelectAll(e.target.checked)
                                }
                                sx={{
                                  color: 'rgba(255,255,255,0.7)',
                                  '&.Mui-checked': { color: '#ffffff' },
                                  '&.MuiCheckbox-indeterminate': { color: '#ffffff' },
                                }}
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
                                {trimmedSearch
                                  ? highlightMatch(
                                      formatFullName(user.fullName),
                                      trimmedSearch,
                                    )
                                  : formatFullName(user.fullName)}
                              </PremiumTableCell>

                              <PremiumTableCell>
                                {user.recordsCount || 0}
                              </PremiumTableCell>

                              <PremiumTableCell>
                                <Chip
                                  label={
                                    user.hasRecords ? 'Auto-Saved' : 'No Records'
                                  }
                                  color={user.hasRecords ? 'success' : 'default'}
                                  size="small"
                                  icon={user.hasRecords ? <CheckCircle /> : undefined}
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
                                  disabled={!user.hasRecords}
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

                    {/* Bottom pagination */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mt: 2,
                        gap: 2,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ color: textPrimaryColor }}
                      >
                        Showing{' '}
                        {filteredUsers.length === 0
                          ? 0
                          : Math.min(
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

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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

        {/* Loading Backdrop (single-user fetching) */}
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
                      <PremiumTableCell isHeader sx={{ color: textPrimaryColor }}>
                        Employee ID
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: textPrimaryColor }}>
                        Date
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: textPrimaryColor }}>
                        Day
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: textPrimaryColor }}>
                        Time IN
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: textPrimaryColor }}>
                        Break IN
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: textPrimaryColor }}>
                        Break OUT
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: textPrimaryColor }}>
                        Time OUT
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: textPrimaryColor }}>
                        Special Type
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: textPrimaryColor }}>
                        Special Time IN
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: textPrimaryColor }}>
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
                              Try adjusting your date range or search for a different employee
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      records.map((record, index) => {
                        let specialTypeBadge = null;
                        const hasSpecialTime = record.Time5 || record.Time6;

                        if (hasSpecialTime) {
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
                            <PremiumTableCell>{formatTime(record.Time1)}</PremiumTableCell>
                            <PremiumTableCell>{formatTime(record.Time3)}</PremiumTableCell>
                            <PremiumTableCell>{formatTime(record.Time2)}</PremiumTableCell>
                            <PremiumTableCell>{formatTime(record.Time4)}</PremiumTableCell>
                            <PremiumTableCell>{specialTypeBadge || '-'}</PremiumTableCell>
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