import API_BASE_URL from '../../apiConfig';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TablePagination,
  Paper,
  Typography,
  Container,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  TextField,
  InputAdornment,
  Button,
  Modal,
  Grid,
  Checkbox,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  Backdrop,
  AppBar,
  Toolbar,
  Badge,
  styled,
  alpha,
  Fade,
  Avatar,
  Slider,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import usePayrollRealtimeRefresh from '../../hooks/usePayrollRealtimeRefresh';
import SearchIcon from '@mui/icons-material/Search';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ExitToApp,
  Payment,
  BusinessCenter,
  CreditCard,
  Compare,
  Visibility,
  Close,
  EmojiPeople,
  FilterList,
  GetApp,
  CheckCircle,
  Error,
  Warning,
  Info,
  Refresh,
  Dashboard,
  Assessment,
  ZoomIn,
  ZoomOut,
  GridOn,
  FindInPage,
} from '@mui/icons-material';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReceiptIcon from '@mui/icons-material/ReceiptLong';
import CircleIcon from '@mui/icons-material/Circle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteForever from '@mui/icons-material/DeleteForever';

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

// Professional styled components - colors will be applied via sx prop
const GlassCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  backdropFilter: 'blur(10px)',
  overflow: 'hidden',
  transition: 'boxShadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
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

const PremiumTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: 16,
  overflow: 'hidden',
  boxShadow: '0 4px 24px rgba(109, 35, 35, 0.06)',
  border: '1px solid rgba(109, 35, 35, 0.08)',
}));

const PremiumTableCell = styled(TableCell)(({ theme, isHeader = false }) => ({
  fontWeight: isHeader ? 600 : 500,
  paddingTop: '2.1px',
  paddingBottom: '2.1px',
  borderBottom: isHeader
    ? '2px solid rgba(254, 249, 225, 0.5)'
    : '1px solid rgba(109, 35, 35, 0.06)',
  fontSize: '0.95rem',
  letterSpacing: '0.025em',
}));

const PayrollJO = () => {
  // System Settings Hook
  const { settings } = useSystemSettings();

  // Get colors from system settings
  const primaryColor = settings.accentColor || '#FEF9E1';
  const secondaryColor = settings.backgroundColor || '#FFF8E7';
  const accentColor = settings.primaryColor || '#6d2323';
  const accentDark = settings.secondaryColor || '#8B3333';
  const textPrimaryColor = settings.textPrimaryColor || '#6d2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';
  const hoverColor = settings.hoverColor || '#6D2323';
  const blackColor = '#1a1a1a';
  const whiteColor = '#FFFFFF';
  const grayColor = '#6c757d';

  //ACCESSING
  // Dynamic page access control using component identifier
  // The identifier 'payroll-jo' should match the component_identifier in the pages table
  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('payroll-jo');
  // ACCESSING END

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [payrollData, setPayrollData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [loadingOverlay, setLoadingOverlay] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('');
  const [openConfirm, setOpenConfirm] = useState(false);
  const [finalizedPayroll, setFinalizedPayroll] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [departments, setDepartments] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [summaryData, setSummaryData] = useState({
    totalEmployees: 0,
    processedEmployees: 0,
    unprocessedEmployees: 0,
    totalGrossAmount: 0,
    totalNetAmount: 0,
  });
  const [editContributionsOpen, setEditContributionsOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [editContributions, setEditContributions] = useState({
    sssContribution: '',
    pagibigContribution: '',
  });
  const [isUpdatingContributions, setIsUpdatingContributions] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);

  // Month options
  const monthOptions = [
    { value: '', label: 'All Months' },
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  // Year options (current year and past 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => ({
    value: (currentYear - i).toString(),
    label: (currentYear - i).toString(),
  }));

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  };

  useEffect(() => {
    fetchPayrollData();
    fetchFinalizedPayroll();
    fetchDepartments(); // Add this line
  }, []);

  usePayrollRealtimeRefresh(() => {
    fetchPayrollData();
    fetchFinalizedPayroll();
    fetchDepartments();
  });

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/PayrollJORoutes/payroll-jo`,
        getAuthHeaders(),
      );

      let payroll = response.data;

      // Cache for official time (since it's the same for each employee)
      const officialTimeCache = {};

      const updatedPayroll = await Promise.all(
        payroll.map(async (row) => {
          try {
            // Fetch attendance records
            const attendanceRes = await axios.post(
              `${API_BASE_URL}/attendance/api/attendance-records`,
              {
                personID: row.employeeNumber,
                startDate: row.startDate,
                endDate: row.endDate,
              },
              getAuthHeaders(),
            );

            const completeAttendance = attendanceRes.data.filter(
              (rec) => rec.timeIN && rec.timeOUT,
            );

            const uniqueDays = [
              ...new Set(
                completeAttendance.map((rec) => {
                  const dateObj = new Date(rec.date);
                  return dateObj.getDate();
                }),
              ),
            ].sort((a, b) => a - b);

            let renderedDays = '';
            if (uniqueDays.length > 0) {
              const monthName = new Date(row.startDate).toLocaleString(
                'en-US',
                {
                  month: 'short',
                },
              );
              renderedDays = `${monthName} ${uniqueDays.join(', ')}`;
            }

            // ✅ Fetch official time from cache or API (only once per employee)
            if (!officialTimeCache[row.employeeNumber]) {
              const officialTimeRes = await axios.get(
                `${API_BASE_URL}/PayrollJORoutes/official-time/${row.employeeNumber}`,
                getAuthHeaders(),
              );
              officialTimeCache[row.employeeNumber] = officialTimeRes.data;
            }

            const { daysCovered, numberOfDays, timeRange } =
              officialTimeCache[row.employeeNumber];

            // Gross Amount computation
            const ratePerDay = row.ratePerDay || 0;
            const grossAmount = (ratePerDay / 8) * row.rh;

            return {
              ...row,
              renderedDays,
              grossAmount,
              days: daysCovered,
              numberOfDays: numberOfDays,
              officialTime: timeRange,
              status: row.status || 0, // Include status
            };
          } catch (err) {
            console.error('Error fetching data for', row.employeeNumber, err);
            return {
              ...row,
              renderedDays: '—',
              grossAmount: 0,
              days: '—',
              numberOfDays: 0,
              officialTime: '—',
              status: row.status || 0, // Include status here too
              pagibigContribution: row.pagibigContribution || 0, // Include pagibigContribution
            };
          }
        }),
      );

      setPayrollData(updatedPayroll);
      setFilteredData(updatedPayroll);
      setError('');

      // Calculate summary data
      const processedCount = updatedPayroll.filter(
        (item) => item.status === 1,
      ).length;

      const totalGross = updatedPayroll.reduce(
        (sum, item) => sum + parseFloat(item.grossAmount || 0),
        0,
      );

      const totalNet = updatedPayroll.reduce(
        (sum, item) =>
          sum +
          parseFloat(
            computeNetAmount(
              item.grossAmount,
              item.ratePerDay,
              item.h,
              item.m,
              item.sssContribution,
              item.pagibigContribution,
            ) || 0,
          ),
        0,
      );

      setSummaryData({
        totalEmployees: updatedPayroll.length,
        processedEmployees: processedCount,
        unprocessedEmployees: updatedPayroll.length - processedCount,
        totalGrossAmount: totalGross,
        totalNetAmount: totalNet,
      });
    } catch (err) {
      console.error('Error fetching payroll data:', err);
      setError('Failed to fetch payroll data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = [...payrollData];

    // Filter by department
    if (selectedDepartment) {
      filtered = filtered.filter(
        (item) => item.department === selectedDepartment,
      );
    }

    // Filter by status
    if (selectedStatus === 'Processed') {
      filtered = filtered.filter((item) => item.status === 1);
    } else if (selectedStatus === 'Unprocessed') {
      filtered = filtered.filter((item) => item.status === 0);
    }

    // Filter by month and year
    if (selectedMonth || selectedYear) {
      filtered = filtered.filter((item) => {
        if (!item.startDate) return false;
        const date = new Date(item.startDate);
        const itemMonth = String(date.getMonth() + 1).padStart(2, '0');
        const itemYear = date.getFullYear().toString();

        const monthMatch = !selectedMonth || itemMonth === selectedMonth;
        const yearMatch = !selectedYear || itemYear === selectedYear;

        return monthMatch && yearMatch;
      });
    }

    // Filter by search term
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter((item) => {
        const name = item.name || '';
        const employeeNumber = item.employeeNumber || '';
        const department = item.department || '';
        return (
          name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employeeNumber.toString().includes(searchTerm) ||
          department.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    setFilteredData(filtered);
    setPage(0);
  }, [
    searchTerm,
    payrollData,
    selectedDepartment,
    selectedStatus,
    selectedMonth,
    selectedYear,
  ]);

  const handleExportToFinalized = async () => {
    if (selectedRows.length === 0) return;

    setProcessing(true);
    setLoadingOverlay(true);

    try {
      const selectedData = payrollData.filter((row) =>
        selectedRows.includes(row.id),
      );

      // This single request now handles both insert AND status update
      const payload = selectedData.map((row) => {
        const grossAmount = parseFloat(row.grossAmount) || 0;
        const h = parseInt(row.h) || 0;
        const m = parseInt(row.m) || 0;
        const s = parseInt(row.s) || 0;
        const sssContribution = parseFloat(row.sssContribution) || 0;
        const pagibigContribution = parseFloat(row.pagibigContribution) || 0;
        const rh = parseFloat(row.rh) || 0;
        const ratePerDay = parseFloat(row.ratePerDay) || 0;

        return {
          employeeNumber: row.employeeNumber,
          department: row.department || '',
          startDate: row.startDate,
          endDate: row.endDate,
          name: row.name || '',
          position: row.position || '',
          grossAmount: grossAmount,
          grossSalary: grossAmount, // Also send as grossSalary for backend compatibility
          h: h,
          m: m,
          s: s,
          netSalary: computeNetAmount(
            grossAmount,
            ratePerDay,
            h,
            m,
            sssContribution,
            pagibigContribution,
          ),
          sssContribution: sssContribution,
          sss: sssContribution, // Also send as sss for backend compatibility
          pagibigContribution: pagibigContribution,
          rh: rh,
          abs: computeTotalDeduction(ratePerDay, h, m),
        };
      });

      await axios.post(
        `${API_BASE_URL}/PayrollJORoutes/export-to-finalized`,
        payload,
        getAuthHeaders(),
      );

      setTimeout(() => {
        setLoadingOverlay(false);
        setSuccessAction('processing payroll');
        setSuccessOpen(true);

        fetchFinalizedPayroll();

        setTimeout(() => {
          setSuccessOpen(false);
          setSelectedRows([]);
          fetchPayrollData(); // Refresh to show updated status
        }, 2000);
      }, 2000);
    } catch (error) {
      console.error('Error exporting payroll:', error);
      setLoadingOverlay(false);
      const errorMessage =
        error.response?.data?.details ||
        error.response?.data?.error ||
        error.message ||
        'Failed to process payroll. Please try again.';
      alert(`Error: ${errorMessage}`);
    } finally {
      setProcessing(false);
      setOpenConfirm(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₱0.00';
    return `${parseFloat(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const computeHourDeduction = (ratePerDay, hours) => {
    if (!ratePerDay || !hours) return 0;
    const ratePerHour = ratePerDay / 8;
    return ratePerHour * hours;
  };

  // ✅ Compute deduction for minutes (based on rate per hour)
  const computeMinuteDeduction = (ratePerDay, minutes) => {
    if (!ratePerDay || !minutes) return 0;
    const ratePerMinute = ratePerDay / 8 / 60;
    return ratePerMinute * minutes;
  };

  const computeTotalDeduction = (ratePerDay, hours, minutes) => {
    const hourDeduction = computeHourDeduction(ratePerDay, hours);
    const minuteDeduction = computeMinuteDeduction(ratePerDay, minutes);
    return hourDeduction + minuteDeduction;
  };

  const computeNetAmount = (
    grossAmount,
    ratePerDay,
    hours,
    minutes,
    sss,
    pagibig,
  ) => {
    const totalDeduction = computeTotalDeduction(ratePerDay, hours, minutes);
    const sssContribution = parseFloat(sss) || 0;
    const pagibigContribution = parseFloat(pagibig) || 0;
    const gross = parseFloat(grossAmount) || 0;

    return gross - totalDeduction - sssContribution - pagibigContribution;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDeleteClick = (row) => {
    // Prevent deleting if status is processed
    if (row.status === 1) {
      return;
    }
    console.log('Delete button clicked for:', row);
    setRecordToDelete(row);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete || !recordToDelete.id) return;

    setIsProcessingDelete(true);

    try {
      await axios.delete(
        `${API_BASE_URL}/PayrollJORoutes/payroll-jo/${recordToDelete.id}`,
        getAuthHeaders(),
      );
      fetchPayrollData();
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
    } catch (err) {
      console.error('Error deleting record:', err);
      alert('Failed to delete record. Please try again.');
    } finally {
      setIsProcessingDelete(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setRecordToDelete(null);
  };

  const handleEditContributionsClick = (row) => {
    // Prevent editing if status is processed
    if (row.status === 1) {
      return;
    }
    setEditingRow(row);
    setEditContributions({
      sssContribution: row.sssContribution || '',
      pagibigContribution: row.pagibigContribution || '',
    });
    setEditContributionsOpen(true);
  };

  const handleEditContributionsClose = () => {
    setEditContributionsOpen(false);
    setEditingRow(null);
    setEditContributions({
      sssContribution: '',
      pagibigContribution: '',
    });
  };

  const handleUpdateContributions = async () => {
    if (!editingRow) return;

    setIsUpdatingContributions(true);
    try {
      await axios.put(
        `${API_BASE_URL}/PayrollJORoutes/payroll-jo/${editingRow.id}/contributions`,
        {
          employeeNumber: editingRow.employeeNumber,
          sssContribution: parseFloat(editContributions.sssContribution) || 0,
          pagibigContribution:
            parseFloat(editContributions.pagibigContribution) || 0,
        },
        getAuthHeaders(),
      );

      // Refresh payroll data to get updated values
      await fetchPayrollData();
      handleEditContributionsClose();
      setSuccessAction('updating contributions');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch (err) {
      console.error('Error updating contributions:', err);
      alert('Failed to update contributions. Please try again.');
    } finally {
      setIsUpdatingContributions(false);
    }
  };

  const handleOpenConfirm = () => {
    if (selectedRows.length === 0) return;
    setOpenConfirm(true);
  };

  const fetchFinalizedPayroll = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/PayrollRoute/payroll-processed`,
        getAuthHeaders(),
      );
      setFinalizedPayroll(res.data);
    } catch (err) {
      console.error('Error fetching finalized JO payroll:', err);
    }
  };

  const handleExportToExcel = () => {
    if (!filteredData || filteredData.length === 0) {
      alert('No data to export.');
      return;
    }

    // Map the filtered data to clean Excel-friendly objects
    const excelData = filteredData.map((row, index) => ({
      'No.': index + 1,
      'Employee #': row.employeeNumber || '',
      Name: row.name || '',
      Designation: row.position || '',
      'Rate/Day': row.ratePerDay || 0,
      Department: row.department || '',
      'Days Covered': row.days || '',
      'No. of Days': row.numberOfDays || '',
      'Official Time': row.officialTime || '',
      Period: row.renderedDays || '',
      'No. of Days (Rendered)': row.rh ? Math.floor(row.rh / 8) : '',
      'No. of Hours (Rendered)': row.rh ? row.rh % 8 : '',
      'Gross Amount': row.grossAmount || 0,
      'Deduction (Hrs)': row.h || 0,
      'Deduction (Mins)': row.m || 0,
      'Total Deduction': computeTotalDeduction(row.ratePerDay, row.h, row.m),
      'SSS Contribution': row.sssContribution || 0,
      'PAGIBIG Contribution': row.pagibigContribution || 0,
      'Net Amount': computeNetAmount(
        row.grossAmount,
        row.ratePerDay,
        row.h,
        row.m,
        row.sssContribution,
        row.pagibigContribution,
      ),
    }));

    // Create a worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll Data');

    // Export file
    XLSX.writeFile(workbook, 'JobOrder_Payroll.xlsx');
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/department-table`,
        getAuthHeaders(),
      );
      setDepartments(response.data);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const handleDepartmentChange = (event) => {
    setSelectedDepartment(event.target.value);
    setPage(0);
  };

  const handleStatusChange = (event) => {
    setSelectedStatus(event.target.value);
    setPage(0);
  };

  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value);
    setPage(0);
  };

  const handleYearChange = (event) => {
    setSelectedYear(event.target.value);
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setIsSearching(true);

    // Clear any existing timeout
    if (window.searchTimeout) {
      clearTimeout(window.searchTimeout);
    }

    // Set new timeout
    window.searchTimeout = setTimeout(() => {
      setIsSearching(false);
    }, 300);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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
  if (!accessLoading && hasAccess !== true) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Payroll Job Order. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }
  //ACCESSING END2

  return (
    <Box
      sx={{
        py: 4,
        borderRadius: '14px',
        width: '100%',
        mx: 'auto',
        maxWidth: '100%',
        overflow: 'hidden',
        position: 'relative',
        left: '50%',
        transform: 'translateX(-50%)',
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
                {/* Decorative elements */}
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
                  mb={3}
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
                      <Payment sx={{ color: textPrimaryColor, fontSize: 32 }} />
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
                        Job Order Payroll
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          opacity: 0.8,
                          fontWeight: 400,
                          color: textPrimaryColor,
                        }}
                      >
                        View and manage employee job order payroll records
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip
                      label="Payroll Management"
                      size="small"
                      sx={{
                        bgcolor: alpha(accentColor, 0.15),
                        color: textPrimaryColor,
                        fontWeight: 500,
                        '& .MuiChip-label': { px: 1 },
                      }}
                    />
                    <Tooltip title="Refresh Data">
                      <IconButton
                        onClick={() => fetchPayrollData()}
                        sx={{
                          bgcolor: alpha(accentColor, 0.1),
                          '&:hover': { bgcolor: alpha(accentColor, 0.2) },
                          color: textPrimaryColor,
                          width: 48,
                          height: 48,
                        }}
                      >
                        <Refresh />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Summary Cards */}
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    flexWrap: 'wrap',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <Card
                    sx={{
                      minWidth: 180,
                      flex: 1,
                      border: `1px solid ${alpha(accentColor, 0.1)}`,
                      background: `rgba(${hexToRgb(whiteColor)}, 0.9)`,
                      boxShadow: `0 4px 16px ${alpha(accentColor, 0.08)}`,
                      '&:hover': {
                        boxShadow: `0 6px 20px ${alpha(accentColor, 0.12)}`,
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{
                              color: textPrimaryColor,
                              opacity: 0.7,
                              fontWeight: 500,
                            }}
                          >
                            Total Employees
                          </Typography>
                          <Typography
                            variant="h6"
                            fontWeight="bold"
                            sx={{ color: textPrimaryColor }}
                          >
                            {summaryData.totalEmployees}
                          </Typography>
                        </Box>
                        <PeopleIcon sx={{ color: accentColor, fontSize: 32 }} />
                      </Box>
                    </CardContent>
                  </Card>

                  <Card
                    sx={{
                      minWidth: 180,
                      flex: 1,
                      border: `1px solid ${alpha(accentColor, 0.1)}`,
                      background: `rgba(${hexToRgb(whiteColor)}, 0.9)`,
                      boxShadow: `0 4px 16px ${alpha(accentColor, 0.08)}`,
                      '&:hover': {
                        boxShadow: `0 6px 20px ${alpha(accentColor, 0.12)}`,
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{
                              color: textPrimaryColor,
                              opacity: 0.7,
                              fontWeight: 500,
                            }}
                          >
                            Processed
                          </Typography>
                          <Typography
                            variant="h6"
                            fontWeight="bold"
                            sx={{ color: '#4caf50' }}
                          >
                            {summaryData.processedEmployees}
                          </Typography>
                        </Box>
                        <CheckCircleIcon
                          sx={{ color: '#4caf50', fontSize: 32 }}
                        />
                      </Box>
                    </CardContent>
                  </Card>

                  <Card
                    sx={{
                      minWidth: 180,
                      flex: 1,
                      border: `1px solid ${alpha(accentColor, 0.1)}`,
                      background: `rgba(${hexToRgb(whiteColor)}, 0.9)`,
                      boxShadow: `0 4px 16px ${alpha(accentColor, 0.08)}`,
                      '&:hover': {
                        boxShadow: `0 6px 20px ${alpha(accentColor, 0.12)}`,
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{
                              color: textPrimaryColor,
                              opacity: 0.7,
                              fontWeight: 500,
                            }}
                          >
                            Unprocessed
                          </Typography>
                          <Typography
                            variant="h6"
                            fontWeight="bold"
                            sx={{ color: '#ff9800' }}
                          >
                            {summaryData.unprocessedEmployees}
                          </Typography>
                        </Box>
                        <PendingIcon sx={{ color: '#ff9800', fontSize: 32 }} />
                      </Box>
                    </CardContent>
                  </Card>

                  <Card
                    sx={{
                      minWidth: 180,
                      flex: 1,
                      border: `1px solid ${alpha(accentColor, 0.1)}`,
                      background: `rgba(${hexToRgb(whiteColor)}, 0.9)`,
                      boxShadow: `0 4px 16px ${alpha(accentColor, 0.08)}`,
                      '&:hover': {
                        boxShadow: `0 6px 20px ${alpha(accentColor, 0.12)}`,
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{
                              color: textPrimaryColor,
                              opacity: 0.7,
                              fontWeight: 500,
                            }}
                          >
                            Total Net Amount
                          </Typography>
                          <Typography
                            variant="h6"
                            fontWeight="bold"
                            sx={{ color: textPrimaryColor }}
                          >
                            ₱
                            {summaryData.totalNetAmount.toLocaleString(
                              'en-US',
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </Typography>
                        </Box>
                        <TrendingUpIcon
                          sx={{ color: accentColor, fontSize: 32 }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {/* Filters Section */}
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
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={3}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <FilterList sx={{ color: textPrimaryColor, fontSize: 24 }} />
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    sx={{ color: textPrimaryColor }}
                  >
                    FILTERS
                  </Typography>
                </Box>

                {/* Export Button */}
                <Box display="flex" alignItems="center" gap={2}>
                  <ProfessionalButton
                    variant="outlined"
                    size="small"
                    startIcon={<GetApp />}
                    onClick={handleExportToExcel}
                    disabled={filteredData.length === 0}
                    sx={{
                      borderColor: accentColor,
                      color: textPrimaryColor,
                      '&:hover': {
                        borderColor: accentDark,
                        backgroundColor: alpha(accentColor, 0.1),
                      },
                      '&:disabled': {
                        borderColor: alpha(accentColor, 0.3),
                        color: alpha(textPrimaryColor, 0.5),
                      },
                    }}
                  >
                    Save to Excel
                  </ProfessionalButton>
                </Box>
              </Box>

              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={2.4}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: textPrimaryColor }}>
                      Department
                    </InputLabel>
                    <Select
                      value={selectedDepartment}
                      onChange={handleDepartmentChange}
                      label="Department"
                      sx={{
                        color: textPrimaryColor,
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
                      <MenuItem value="">
                        <em>All Departments</em>
                      </MenuItem>
                      {departments.map((dept) => (
                        <MenuItem key={dept.id} value={dept.code}>
                          {dept.description}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={2.4}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: textPrimaryColor }}>
                      Status
                    </InputLabel>
                    <Select
                      value={selectedStatus}
                      onChange={handleStatusChange}
                      label="Status"
                      sx={{
                        color: textPrimaryColor,
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
                      <MenuItem value="">
                        <em>All Status</em>
                      </MenuItem>
                      <MenuItem value="Processed">Processed</MenuItem>
                      <MenuItem value="Unprocessed">Unprocessed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={2.4}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: textPrimaryColor }}>
                      Month
                    </InputLabel>
                    <Select
                      value={selectedMonth}
                      onChange={handleMonthChange}
                      label="Month"
                      sx={{
                        color: textPrimaryColor,
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
                      {monthOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={2.4}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: textPrimaryColor }}>
                      Year
                    </InputLabel>
                    <Select
                      value={selectedYear}
                      onChange={handleYearChange}
                      label="Year"
                      sx={{
                        color: textPrimaryColor,
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
                      {yearOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={2.4}>
                  <ModernTextField
                    fullWidth
                    size="small"
                    placeholder="Search employee..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    disabled={isSearching}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon
                            sx={{ color: textPrimaryColor }}
                            fontSize="small"
                          />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: textPrimaryColor,
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: alpha(accentColor, 0.3),
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: alpha(accentColor, 0.5),
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: accentColor,
                        },
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </GlassCard>
        </Fade>

        {/* Alerts */}
        {error && (
          <Fade in timeout={300}>
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 3,
                '& .MuiAlert-message': { fontWeight: 500 },
              }}
              icon={<Error />}
            >
              {error}
            </Alert>
          </Fade>
        )}

        {/* Table View Section */}
        <Fade in timeout={900}>
          <GlassCard
            sx={{
              mb: 4,
              background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
              boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`,
              border: `1px solid ${alpha(accentColor, 0.1)}`,
              overflow: 'visible',
              '&:hover': {
                boxShadow: `0 12px 48px ${alpha(accentColor, 0.15)}`,
              },
            }}
          >
            {/* Table Header */}
            <Box
              sx={{
                p: 4,
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                color: textPrimaryColor,
                borderBottom: `1px solid ${alpha(accentColor, 0.1)}`,
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
                  Payroll Records
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 600, color: textPrimaryColor }}
                >
                  Job Order Payroll Data
                </Typography>
              </Box>
              <Box display="flex" gap={1} alignItems="center">
                <Chip
                  icon={<PeopleIcon />}
                  label={`${selectedRows.length} Selected`}
                  size="small"
                  sx={{
                    bgcolor: alpha(accentColor, 0.15),
                    color: textPrimaryColor,
                    fontWeight: 500,
                  }}
                />
                <Badge badgeContent={selectedRows.length} color="primary">
                  <ProfessionalButton
                    variant="outlined"
                    size="small"
                    startIcon={<Refresh />}
                    onClick={() => fetchPayrollData()}
                    sx={{
                      borderColor: accentColor,
                      color: textPrimaryColor,
                      '&:hover': {
                        borderColor: accentDark,
                        backgroundColor: alpha(accentColor, 0.1),
                      },
                    }}
                  >
                    Refresh
                  </ProfessionalButton>
                </Badge>
              </Box>
            </Box>
            {/* Table with Fixed Status and Actions Columns */}
            <Box sx={{ display: 'flex', width: '100%', position: 'relative' }}>
              {/* Scrollable Table Content */}
              <Box
                sx={{
                  overflowX: 'auto',
                  overflowY: 'visible',
                  flex: 1,
                  minWidth: 0,
                  '&::-webkit-scrollbar': {
                    height: '10px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: alpha(accentColor, 0.1),
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: alpha(accentColor, 0.4),
                    borderRadius: '4px',
                    '&:hover': {
                      background: alpha(accentColor, 0.6),
                    },
                  },
                }}
              >
                <PremiumTableContainer
                  sx={{
                    maxHeight: 600,
                    boxShadow: `0 4px 24px ${alpha(accentColor, 0.06)}`,
                    border: `1px solid ${alpha(accentColor, 0.08)}`,
                    overflowX: 'auto',
                    overflowY: 'visible',
                    width: 'max-content',
                    minWidth: '100%',
                  }}
                >
                  <Table stickyHeader>
                    <TableHead sx={{ bgcolor: alpha(primaryColor, 0.7) }}>
                      <TableRow>
                        <PremiumTableCell
                          padding="checkbox"
                          rowSpan={2}
                          isHeader
                          sx={{ color: textPrimaryColor }}
                        >
                          <Checkbox
                            indeterminate={(() => {
                              const currentPageRows = filteredData.slice(
                                page * rowsPerPage,
                                page * rowsPerPage + rowsPerPage,
                              );
                              // Filter out already finalized rows AND processed rows
                              const selectableRows = currentPageRows.filter(
                                (row) =>
                                  row.status !== 1 && // Exclude processed
                                  !finalizedPayroll.some(
                                    (fp) =>
                                      fp.employeeNumber ===
                                        row.employeeNumber &&
                                      fp.startDate === row.startDate &&
                                      fp.endDate === row.endDate,
                                  ),
                              );
                              const selectedOnPage = selectedRows.filter((id) =>
                                selectableRows.some((row) => row.id === id),
                              );
                              return (
                                selectedOnPage.length > 0 &&
                                selectedOnPage.length < selectableRows.length
                              );
                            })()}
                            checked={(() => {
                              const currentPageRows = filteredData.slice(
                                page * rowsPerPage,
                                page * rowsPerPage + rowsPerPage,
                              );
                              // Filter out already finalized rows AND processed rows
                              const selectableRows = currentPageRows.filter(
                                (row) =>
                                  row.status !== 1 && // Exclude processed
                                  !finalizedPayroll.some(
                                    (fp) =>
                                      fp.employeeNumber ===
                                        row.employeeNumber &&
                                      fp.startDate === row.startDate &&
                                      fp.endDate === row.endDate,
                                  ),
                              );
                              if (selectableRows.length === 0) return false;
                              return selectableRows.every((row) =>
                                selectedRows.includes(row.id),
                              );
                            })()}
                            onChange={(e) => {
                              const currentPageRows = filteredData.slice(
                                page * rowsPerPage,
                                page * rowsPerPage + rowsPerPage,
                              );
                              // Filter out already finalized rows AND processed rows
                              const selectableRows = currentPageRows.filter(
                                (row) =>
                                  row.status !== 1 && // Exclude processed
                                  !finalizedPayroll.some(
                                    (fp) =>
                                      fp.employeeNumber ===
                                        row.employeeNumber &&
                                      fp.startDate === row.startDate &&
                                      fp.endDate === row.endDate,
                                  ),
                              );
                              const currentIds = selectableRows.map(
                                (row) => row.id,
                              );
                              if (e.target.checked) {
                                setSelectedRows((prev) => [
                                  ...new Set([...prev, ...currentIds]),
                                ]);
                              } else {
                                setSelectedRows((prev) =>
                                  prev.filter((id) => !currentIds.includes(id)),
                                );
                              }
                            }}
                          />
                        </PremiumTableCell>

                        <PremiumTableCell
                          rowSpan={2}
                          isHeader
                          sx={{ color: textPrimaryColor }}
                        >
                          No.
                        </PremiumTableCell>
                        <PremiumTableCell
                          rowSpan={2}
                          isHeader
                          sx={{ color: textPrimaryColor }}
                        >
                          Employee #
                        </PremiumTableCell>
                        <PremiumTableCell
                          rowSpan={2}
                          isHeader
                          sx={{ color: textPrimaryColor }}
                        >
                          Name
                        </PremiumTableCell>
                        <PremiumTableCell
                          rowSpan={2}
                          isHeader
                          sx={{ color: textPrimaryColor }}
                        >
                          Designation
                        </PremiumTableCell>
                        <PremiumTableCell
                          rowSpan={2}
                          isHeader
                          sx={{ color: textPrimaryColor }}
                        >
                          Rate/Day
                        </PremiumTableCell>
                        <PremiumTableCell
                          rowSpan={2}
                          isHeader
                          sx={{ color: textPrimaryColor }}
                        >
                          Department
                        </PremiumTableCell>
                        <PremiumTableCell
                          rowSpan={2}
                          isHeader
                          sx={{ color: textPrimaryColor }}
                        >
                          Days Covered
                        </PremiumTableCell>
                        <PremiumTableCell
                          rowSpan={2}
                          isHeader
                          sx={{ color: textPrimaryColor }}
                        >
                          No. Of Days
                        </PremiumTableCell>
                        <PremiumTableCell
                          rowSpan={2}
                          isHeader
                          sx={{
                            color: textPrimaryColor,
                            minWidth: 180,
                            maxWidth: 300,
                          }}
                        >
                          Official Time
                        </PremiumTableCell>
                        <PremiumTableCell
                          rowSpan={2}
                          isHeader
                          align="center"
                          sx={{
                            color: textPrimaryColor,
                            minWidth: 200,
                            maxWidth: 350,
                          }}
                        >
                          Period
                        </PremiumTableCell>
                        <PremiumTableCell
                          rowSpan={2}
                          isHeader
                          sx={{ color: textPrimaryColor }}
                        >
                          No. of Days
                        </PremiumTableCell>
                        <PremiumTableCell
                          rowSpan={2}
                          isHeader
                          sx={{ color: textPrimaryColor }}
                        >
                          No. of Hours
                        </PremiumTableCell>
                        <PremiumTableCell
                          rowSpan={2}
                          isHeader
                          sx={{ color: textPrimaryColor }}
                        >
                          Gross Amount
                        </PremiumTableCell>
                        <PremiumTableCell
                          colSpan={3}
                          isHeader
                          align="center"
                          sx={{ color: textPrimaryColor }}
                        >
                          Deduction
                        </PremiumTableCell>
                        <PremiumTableCell
                          rowSpan={2}
                          isHeader
                          sx={{ color: textPrimaryColor }}
                        >
                          SSS
                        </PremiumTableCell>
                        <PremiumTableCell
                          rowSpan={2}
                          isHeader
                          sx={{ color: textPrimaryColor }}
                        >
                          PAGIBIG
                        </PremiumTableCell>
                        <PremiumTableCell
                          rowSpan={2}
                          isHeader
                          sx={{ color: textPrimaryColor }}
                        >
                          Net Amount
                        </PremiumTableCell>
                      </TableRow>
                      <TableRow>
                        <PremiumTableCell
                          isHeader
                          sx={{ color: textPrimaryColor }}
                        >
                          Hrs
                        </PremiumTableCell>
                        <PremiumTableCell
                          isHeader
                          sx={{ color: textPrimaryColor }}
                        >
                          Mins
                        </PremiumTableCell>
                        <PremiumTableCell
                          isHeader
                          sx={{ color: textPrimaryColor }}
                        >
                          Total Deduction
                        </PremiumTableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={21} align="center" sx={{ py: 4 }}>
                            <CircularProgress sx={{ color: accentColor }} />
                          </TableCell>
                        </TableRow>
                      ) : filteredData.length > 0 ? (
                        filteredData
                          .slice(
                            page * rowsPerPage,
                            page * rowsPerPage + rowsPerPage,
                          )
                          .map((row, index) => (
                            <TableRow
                              key={row.id}
                              sx={{
                                '&:nth-of-type(even)': {
                                  bgcolor: alpha(primaryColor, 0.3),
                                },
                                '&:hover': {
                                  backgroundColor:
                                    alpha(accentColor, 0.05) + ' !important',
                                },
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selectedRows.includes(row.id)}
                                  disabled={finalizedPayroll.some(
                                    (fp) =>
                                      fp.employeeNumber ===
                                        row.employeeNumber &&
                                      fp.startDate === row.startDate &&
                                      fp.endDate === row.endDate,
                                  )}
                                  onChange={(e) => {
                                    const isFinalized = finalizedPayroll.some(
                                      (fp) =>
                                        fp.employeeNumber ===
                                          row.employeeNumber &&
                                        fp.startDate === row.startDate &&
                                        fp.endDate === row.endDate,
                                    );
                                    if (isFinalized) return;
                                    e.stopPropagation();
                                    if (selectedRows.includes(row.id)) {
                                      setSelectedRows((prev) =>
                                        prev.filter((id) => id !== row.id),
                                      );
                                    } else {
                                      setSelectedRows((prev) => [
                                        ...prev,
                                        row.id,
                                      ]);
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                {page * rowsPerPage + index + 1}
                              </TableCell>
                              <TableCell>{row.employeeNumber || '—'}</TableCell>
                              <TableCell>{row.name || '—'}</TableCell>
                              <TableCell>{row.position || '—'}</TableCell>
                              <TableCell>
                                {row.ratePerDay
                                  ? formatCurrency(row.ratePerDay)
                                  : '—'}
                              </TableCell>
                              <TableCell>{row.department || '—'}</TableCell>
                              <TableCell>{row.days || '—'}</TableCell>
                              <TableCell>{row.numberOfDays || '—'}</TableCell>
                              <TableCell>{row.officialTime || '—'}</TableCell>
                              <TableCell> {row.renderedDays || '—'}</TableCell>
                              <TableCell>
                                {row.rh
                                  ? Math.floor(parseFloat(row.rh) / 8)
                                  : '—'}
                              </TableCell>
                              <TableCell>
                                {row.rh ? parseFloat(row.rh) % 8 : '—'}
                              </TableCell>
                              <TableCell>
                                {row.grossAmount
                                  ? formatCurrency(row.grossAmount)
                                  : '—'}
                              </TableCell>
                              <TableCell>{row.h || 0}</TableCell>
                              <TableCell>{row.m || 0}</TableCell>
                              <TableCell
                                sx={{
                                  fontWeight: 'bold',
                                  color: '#6D2323',
                                }}
                              >
                                {formatCurrency(
                                  computeTotalDeduction(
                                    row.ratePerDay,
                                    row.h,
                                    row.m,
                                  ),
                                )}
                              </TableCell>
                              <TableCell>
                                {row.sssContribution
                                  ? formatCurrency(row.sssContribution)
                                  : '—'}
                              </TableCell>
                              <TableCell>
                                {row.pagibigContribution
                                  ? formatCurrency(row.pagibigContribution)
                                  : '—'}
                              </TableCell>
                              <TableCell
                                sx={{ fontWeight: 'bold', color: '#6D2323' }}
                              >
                                {formatCurrency(
                                  computeNetAmount(
                                    row.grossAmount,
                                    row.ratePerDay,
                                    row.h,
                                    row.m,
                                    row.sssContribution,
                                    row.pagibigContribution,
                                  ),
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={22} align="center" sx={{ py: 4 }}>
                            {searchTerm
                              ? 'No matching records found.'
                              : 'No payroll records available.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </PremiumTableContainer>
              </Box>

              {/* Fixed Status Column */}
              <Box
                sx={{
                  width: '130px',
                  minWidth: '130px',
                  borderLeft: `2px solid ${alpha(accentColor, 0.2)}`,
                  backgroundColor: alpha(primaryColor, 0.3),
                  position: 'sticky',
                  right: '120px',
                  zIndex: 1,
                  boxShadow: `-2px 0 5px ${alpha(accentColor, 0.1)}`,
                }}
              >
                <Table
                  size="small"
                  sx={{ tableLayout: 'fixed', width: '100%' }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          backgroundColor: alpha(primaryColor, 0.7),
                          fontWeight: 'bold',
                          textAlign: 'center',
                          borderBottom: `1px solid ${alpha(accentColor, 0.1)}`,
                          padding: '18px 20px',
                          position: 'sticky',
                          zIndex: 2,
                          color: textPrimaryColor,
                        }}
                      >
                        Status
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          sx={{
                            textAlign: 'center',
                            borderBottom: `1px solid ${alpha(
                              accentColor,
                              0.06,
                            )}`,
                            padding: '16px',
                          }}
                        >
                          <CircularProgress size={20} />
                        </TableCell>
                      </TableRow>
                    ) : filteredData.length > 0 ? (
                      filteredData
                        .slice(
                          page * rowsPerPage,
                          page * rowsPerPage + rowsPerPage,
                        )
                        .map((row, index) => {
                          return (
                            <TableRow
                              key={`status-${row.id}`}
                              sx={{
                                '&:nth-of-type(even)': {
                                  bgcolor: alpha(primaryColor, 0.3),
                                },
                                '&:hover': {
                                  backgroundColor:
                                    alpha(accentColor, 0.05) + ' !important',
                                },
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <TableCell
                                sx={{
                                  padding: '16px',
                                  textAlign: 'center',
                                  borderBottom: `1px solid ${alpha(
                                    accentColor,
                                    0.06,
                                  )}`,
                                }}
                              >
                                <Chip
                                  label={
                                    row.status === 1
                                      ? 'Processed'
                                      : 'Unprocessed'
                                  }
                                  size="small"
                                  sx={{
                                    fontWeight: 'bold',
                                    backgroundColor:
                                      row.status === 1 ? '#4caf50' : '#ff9800',
                                    color: 'white',
                                    '&:hover': {
                                      backgroundColor:
                                        row.status === 1
                                          ? '#45a049'
                                          : '#fb8c00',
                                    },
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })
                    ) : (
                      <TableRow>
                        <TableCell
                          sx={{
                            textAlign: 'center',
                            borderBottom: `1px solid ${alpha(
                              accentColor,
                              0.06,
                            )}`,
                            padding: '16px',
                          }}
                        >
                          -
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>

              {/* Fixed Actions Column */}
              <Box
                sx={{
                  width: '120px',
                  minWidth: '120px',
                  borderLeft: `2px solid ${alpha(accentColor, 0.2)}`,
                  backgroundColor: alpha(primaryColor, 0.3),
                  position: 'sticky',
                  right: 0,
                  zIndex: 1,
                  boxShadow: `-2px 0 5px ${alpha(accentColor, 0.1)}`,
                }}
              >
                <Table
                  size="small"
                  sx={{ tableLayout: 'fixed', width: '100%' }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          backgroundColor: alpha(primaryColor, 0.7),
                          fontWeight: 'bold',
                          textAlign: 'center',
                          borderBottom: `1px solid ${alpha(accentColor, 0.1)}`,
                          padding: '18px 20px',
                          position: 'sticky',
                          zIndex: 2,
                          color: textPrimaryColor,
                        }}
                      >
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          sx={{
                            textAlign: 'center',
                            borderBottom: `1px solid ${alpha(
                              accentColor,
                              0.06,
                            )}`,
                            padding: '16px',
                          }}
                        >
                          <CircularProgress size={20} />
                        </TableCell>
                      </TableRow>
                    ) : filteredData.length > 0 ? (
                      filteredData
                        .slice(
                          page * rowsPerPage,
                          page * rowsPerPage + rowsPerPage,
                        )
                        .map((row, index) => {
                          return (
                            <TableRow
                              key={`actions-${row.id}`}
                              sx={{
                                '&:nth-of-type(even)': {
                                  bgcolor: alpha(primaryColor, 0.3),
                                },
                                '&:hover': {
                                  backgroundColor:
                                    alpha(accentColor, 0.05) + ' !important',
                                },
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <TableCell
                                sx={{
                                  padding: '16px',
                                  textAlign: 'center',
                                  borderBottom: `1px solid ${alpha(
                                    accentColor,
                                    0.06,
                                  )}`,
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: 0.5,
                                  }}
                                >
                                  <Tooltip
                                    title={
                                      row.status === 1
                                        ? 'Cannot edit processed records'
                                        : 'Edit Contributions'
                                    }
                                  >
                                    <IconButton
                                      size="small"
                                      disabled={row.status === 1}
                                      sx={{
                                        color:
                                          row.status === 1
                                            ? '#ccc'
                                            : accentColor,
                                        backgroundColor:
                                          row.status === 1
                                            ? '#f5f5f5'
                                            : 'white',
                                        border: `1px solid ${
                                          row.status === 1
                                            ? '#ccc'
                                            : accentColor
                                        }`,
                                        '&:hover': {
                                          backgroundColor:
                                            row.status === 1
                                              ? '#f5f5f5'
                                              : alpha(accentColor, 0.1),
                                        },
                                        padding: '4px',
                                      }}
                                      onClick={() =>
                                        handleEditContributionsClick(row)
                                      }
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip
                                    title={
                                      row.status === 1
                                        ? 'Cannot delete processed records'
                                        : 'Delete'
                                    }
                                  >
                                    <IconButton
                                      size="small"
                                      disabled={row.status === 1}
                                      sx={{
                                        color:
                                          row.status === 1 ? '#ccc' : '#d32f2f',
                                        backgroundColor:
                                          row.status === 1
                                            ? '#f5f5f5'
                                            : 'white',
                                        border: `1px solid ${
                                          row.status === 1 ? '#ccc' : '#d32f2f'
                                        }`,
                                        '&:hover': {
                                          backgroundColor:
                                            row.status === 1
                                              ? '#f5f5f5'
                                              : 'rgba(211, 47, 47, 0.1)',
                                        },
                                        padding: '4px',
                                      }}
                                      onClick={() => handleDeleteClick(row)}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })
                    ) : (
                      <TableRow>
                        <TableCell
                          sx={{
                            textAlign: 'center',
                            borderBottom: `1px solid ${alpha(
                              accentColor,
                              0.06,
                            )}`,
                            padding: '16px',
                          }}
                        >
                          No actions
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Box>
            {/* Table Footer */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: `1px solid ${alpha(accentColor, 0.1)}`,
                px: 4,
                py: 2,
                bgcolor: alpha(primaryColor, 0.5),
              }}
            >
              <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 'bold', color: textPrimaryColor }}
                >
                  Total Records: {filteredData.length}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 'bold', color: textPrimaryColor }}
                >
                  Selected: {selectedRows.length}
                </Typography>
              </Box>
              <TablePagination
                component="div"
                count={filteredData.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[10, 25, 50, 100]}
                sx={{
                  '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows':
                    {
                      color: textPrimaryColor,
                    },
                  '& .MuiIconButton-root': {
                    color: textPrimaryColor,
                  },
                }}
              />
            </Box>
          </GlassCard>
        </Fade>

        {/* Action Buttons */}
        <Box
          sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}
        >
          <ProfessionalButton
            variant="outlined"
            onClick={handleExportToExcel}
            size="large"
            sx={{
              borderColor: accentColor,
              color: textPrimaryColor,
              '&:hover': {
                borderColor: accentDark,
                backgroundColor: alpha(accentColor, 0.1),
              },
            }}
            startIcon={<GetApp />}
          >
            Save as Excel
          </ProfessionalButton>

          <ProfessionalButton
            variant="contained"
            onClick={handleOpenConfirm}
            disabled={
              processing ||
              selectedRows.length === 0 ||
              selectedRows.every((id) => {
                const row = payrollData.find((r) => r.id === id);
                return finalizedPayroll.some(
                  (fp) =>
                    fp.employeeNumber === row?.employeeNumber &&
                    fp.startDate === row?.startDate &&
                    fp.endDate === row?.endDate,
                );
              })
            }
            size="large"
            sx={{
              backgroundColor: accentColor,
              color: textSecondaryColor,
              '&:hover': { backgroundColor: accentDark },
              '&:disabled': {
                backgroundColor: alpha(accentColor, 0.3),
                color: alpha(textSecondaryColor, 0.5),
              },
            }}
            startIcon={<ExitToApp />}
          >
            Export to Payroll Processed ({selectedRows.length})
          </ProfessionalButton>
        </Box>

        {/* Delete Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              border: `2px solid ${accentColor}`,
            },
          }}
        >
          <Box
            sx={{
              p: 3,
              bgcolor: 'white',
              borderBottom: `3px solid ${accentColor}`,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Avatar
              sx={{
                bgcolor: alpha('#d32f2f', 0.1),
                color: '#d32f2f',
                width: 56,
                height: 56,
              }}
            >
              <DeleteForever sx={{ fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 'bold', color: '#333' }}
              >
                Delete Record Confirmation
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                This action cannot be undone
              </Typography>
            </Box>
          </Box>
          <DialogContent sx={{ p: 4 }}>
            <DialogContentText>
              Are you sure you want to delete the payroll record for{' '}
              <strong>{recordToDelete?.name}</strong> (Employee #
              {recordToDelete?.employeeNumber})?
              <br />
              <br />
              This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={handleDeleteCancel}
              variant="outlined"
              sx={{
                color: '#666',
                borderColor: '#666',
                '&:hover': {
                  borderColor: '#444',
                  bgcolor: '#f5f5f5',
                },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={isProcessingDelete}
              variant="contained"
              sx={{
                bgcolor: '#d32f2f',
                '&:hover': { bgcolor: '#c62828' },
              }}
              startIcon={
                isProcessingDelete ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <DeleteForever />
                )
              }
            >
              {isProcessingDelete ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Contributions Dialog */}
        <Dialog
          open={editContributionsOpen}
          onClose={handleEditContributionsClose}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              border: `2px solid ${accentColor}`,
            },
          }}
        >
          <Box
            sx={{
              p: 3,
              bgcolor: 'white',
              borderBottom: `3px solid ${accentColor}`,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Avatar
              sx={{
                bgcolor: alpha(accentColor, 0.1),
                color: accentColor,
                width: 56,
                height: 56,
              }}
            >
              <EditIcon sx={{ fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 'bold', color: '#333' }}
              >
                Edit Contributions
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                {editingRow?.name} (Employee #{editingRow?.employeeNumber})
              </Typography>
            </Box>
          </Box>
          <DialogContent sx={{ p: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 500, mb: 1, color: accentColor }}
                >
                  SSS Contribution
                </Typography>
                <ModernTextField
                  type="number"
                  fullWidth
                  value={editContributions.sssContribution}
                  onChange={(e) =>
                    setEditContributions({
                      ...editContributions,
                      sssContribution: e.target.value,
                    })
                  }
                  inputProps={{ step: '0.01', min: '0' }}
                  placeholder="Enter SSS contribution"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 500, mb: 1, color: accentColor }}
                >
                  PAGIBIG Contribution
                </Typography>
                <ModernTextField
                  type="number"
                  fullWidth
                  value={editContributions.pagibigContribution}
                  onChange={(e) =>
                    setEditContributions({
                      ...editContributions,
                      pagibigContribution: e.target.value,
                    })
                  }
                  inputProps={{ step: '0.01', min: '0' }}
                  placeholder="Enter PAGIBIG contribution"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={handleEditContributionsClose}
              variant="outlined"
              sx={{
                color: '#666',
                borderColor: '#666',
                '&:hover': {
                  borderColor: '#444',
                  bgcolor: '#f5f5f5',
                },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateContributions}
              disabled={isUpdatingContributions}
              variant="contained"
              sx={{
                bgcolor: accentColor,
                '&:hover': { bgcolor: accentDark },
              }}
              startIcon={
                isUpdatingContributions ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <SaveIcon />
                )
              }
            >
              {isUpdatingContributions ? 'Updating...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Confirmation Dialog */}
        <Dialog
          open={openConfirm}
          onClose={() => {
            setOpenConfirm(false);
            setConfirmChecked(false);
          }}
          PaperProps={{
            sx: {
              minWidth: '400px',
              maxWidth: 600,
              borderRadius: 3,
              border: `2px solid ${accentColor}`,
              overflow: 'hidden',
            },
          }}
        >
          <Box
            sx={{
              p: 3,
              bgcolor: 'white',
              borderBottom: `3px solid ${accentColor}`,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Avatar
              sx={{
                bgcolor: alpha(accentColor, 0.1),
                color: accentColor,
                width: 56,
                height: 56,
              }}
            >
              <Payment sx={{ fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 'bold', color: '#333' }}
              >
                Confirm Payroll Export
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                Final confirmation required
              </Typography>
            </Box>
          </Box>
          <DialogContent sx={{ p: 4, bgcolor: 'white' }}>
            <Alert
              severity="info"
              icon={<Info />}
              sx={{
                mb: 3,
                borderRadius: 2,
                bgcolor: alpha(accentColor, 0.05),
                border: `1px solid ${alpha(accentColor, 0.2)}`,
                '& .MuiAlert-icon': {
                  color: accentColor,
                  fontSize: 28,
                },
              }}
            >
              <Typography
                variant="body1"
                sx={{ fontWeight: 600, mb: 1, color: '#333' }}
              >
                Export {selectedRows.length} Payroll Record(s)
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                Please review all selected payroll records before proceeding.
                This action will finalize and export the payroll data.
              </Typography>
            </Alert>

            {/* Confirmation Checkbox */}
            <Box
              sx={{
                p: 2.5,
                bgcolor: '#f9f9f9',
                borderRadius: 2,
                border: `2px solid ${confirmChecked ? accentColor : '#e0e0e0'}`,
                mb: 3,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                transition: 'all 0.2s ease',
                ...(confirmChecked && {
                  bgcolor: alpha(accentColor, 0.05),
                }),
              }}
            >
              <Checkbox
                checked={confirmChecked}
                onChange={(e) => setConfirmChecked(e.target.checked)}
                sx={{
                  color: accentColor,
                  '&.Mui-checked': {
                    color: accentColor,
                  },
                  mt: -0.5,
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 600, color: '#333', mb: 0.5 }}
                >
                  I confirm that I have reviewed all payroll records
                </Typography>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  All information is accurate and ready for export. I understand
                  this action cannot be undone.
                </Typography>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, bgcolor: 'white' }}>
            <Button
              onClick={() => {
                setOpenConfirm(false);
                setConfirmChecked(false);
              }}
              variant="outlined"
              sx={{
                color: accentColor,
                borderColor: accentColor,
                px: 3,
                py: 1.2,
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 2,
                '&:hover': {
                  borderColor: accentDark,
                  backgroundColor: alpha(accentColor, 0.08),
                },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setOpenConfirm(false);
                setConfirmChecked(false);
                handleExportToFinalized();
              }}
              disabled={!confirmChecked}
              variant="contained"
              sx={{
                backgroundColor: accentColor,
                color: 'white',
                px: 4,
                py: 1.2,
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 2,
                minWidth: 140,
                '&:hover': {
                  backgroundColor: accentDark,
                },
                '&:disabled': {
                  backgroundColor: '#e0e0e0',
                  color: '#9e9e9e',
                },
              }}
            >
              Confirm & Export
            </Button>
          </DialogActions>
        </Dialog>

        {/* Loading Overlay */}
        <LoadingOverlay
          open={loadingOverlay || isProcessingDelete || isUpdatingContributions}
          message={
            isProcessingDelete
              ? 'Deleting payroll record...'
              : isUpdatingContributions
                ? 'Updating contributions...'
                : 'Processing payroll records...'
          }
        />

        {/* Success Overlay */}
        <SuccessfulOverlay
          open={successOpen}
          action={successAction}
          onClose={() => setSuccessOpen(false)}
        />
      </Box>
    </Box>
  );
};

export default PayrollJO;
