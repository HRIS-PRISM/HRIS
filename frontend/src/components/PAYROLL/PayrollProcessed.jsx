import API_BASE_URL from '../../apiConfig';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
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
  Box,
  CircularProgress,
  Alert,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import * as XLSX from 'xlsx';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import usePayrollRealtimeRefresh from '../../hooks/usePayrollRealtimeRefresh';
import {
  CloudUpload,
  DeleteForever,
  Delete as DeleteIcon,
  Email,
  Lock,
  Payment,
  Pending,
  Publish as PublishIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  FilterList,
  Refresh,
  Info,
  Warning,
  Error,
} from '@mui/icons-material';
import {
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  alpha,
  Modal,
  Avatar,
  Fade,
  styled,
  Snackbar,
  Checkbox,
  Badge,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TextField from '@mui/material/TextField';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import PendingIcon from '@mui/icons-material/Pending';

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
  padding: '18px 20px',
  borderBottom: isHeader
    ? '2px solid rgba(254, 249, 225, 0.5)'
    : '1px solid rgba(109, 35, 35, 0.06)',
  fontSize: '0.95rem',
  letterSpacing: '0.025em',
}));

// Custom styled TableCell for Excel-like appearance
const ExcelTableCell = ({ children, header, ...props }) => (
  <TableCell
    {...props}
    sx={{
      border: '1px solid #E0E0E0',
      padding: '8px',
      backgroundColor: header ? '#F5F5F5' : 'inherit',
      fontWeight: header ? 'bold' : 'normal',
      whiteSpace: 'nowrap',
      '&:hover': {
        backgroundColor: header ? '#F5F5F5' : '#F8F8F8',
      },
      ...props.sx,
    }}
  >
    {children}
  </TableCell>
);

const PayrollProcessed = () => {
  // System Settings Hook
  const { settings } = useSystemSettings();

  // Get colors from system settings - aligned with PayrollProcessing.jsx
  const primaryColor = settings.accentColor || '#FEF9E1'; // Cards color
  const secondaryColor = settings.backgroundColor || '#FFF8E7'; // Background
  const accentColor = settings.primaryColor || '#6d2323'; // Primary accent
  const accentDark = settings.secondaryColor || '#8B3333'; // Darker accent
  const textPrimaryColor = settings.textPrimaryColor || '#6d2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';
  const hoverColor = settings.hoverColor || '#6D2323';
  const blackColor = '#1a1a1a';
  const whiteColor = '#FFFFFF';
  const grayColor = '#6c757d';

  //ACCESSING
  // Dynamic page access control using component identifier
  // The identifier 'payroll-processed' should match the component_identifier in the pages table
  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('payroll-processed');
  // ACCESSING END

  const [finalizedData, setFinalizedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [confidentialPasswordInput, setConfidentialPasswordInput] =
    useState('');
  const [openConfidentialPassword, setOpenConfidentialPassword] =
    useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredFinalizedData, setFilteredFinalizedData] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('');
  const [openReleaseConfirm, setOpenReleaseConfirm] = useState(false);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [releasedIdSet, setReleasedIdSet] = useState(new Set());
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [summaryData, setSummaryData] = useState({
    totalEmployees: 0,
    processedEmployees: 0,
    totalReleased: 0,
    totalNetSalary: 0,
  });
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleExportToExcel = () => {
    if (filteredFinalizedData.length === 0) {
      alert('No data to export.');
      return;
    }

    const getMonthName = (dateString) => {
      if (!dateString) return 'Unknown';
      const date = new Date(dateString);
      const months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      return months[date.getMonth()];
    };

    const getYear = (dateString) => {
      if (!dateString) return new Date().getFullYear();
      return new Date(dateString).getFullYear();
    };

    const firstDate = filteredFinalizedData[0]?.startDate;
    const monthName = getMonthName(firstDate);
    const year = getYear(firstDate);

    const toNumber = (value) => {
      if (value === null || value === undefined || value === '') return '';
      const cleaned = String(value).replace(/[₱,\s]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? value : num;
    };

    const headers = [
      'No.',
      'Department',
      'Employee Number',
      'Start Date',
      'End Date',
      'Name',
      'Position',
      'Rate NBC 594',
      "NBC DIFF'L 597",
      'Increment',
      'Gross Salary',
      'TEVL',
      'DVLT',
      'VLB',
      'ABS',
      'H',
      'M',
      'Net Salary',
      'Withholding Tax',
      'Total GSIS Deductions',
      'Total Pag-ibig Deductions',
      'PhilHealth',
      'Total Other Deductions',
      'Total Deductions',
      '1st Pay',
      '2nd Pay',
      'RT Ins.',
      'EC',
      'Status',
    ];

    const excelDataArray = [];
    const title = `Payroll Processed - ${monthName} ${year}`;
    const titleRow = [title, ...Array(headers.length - 1).fill('')];
    excelDataArray.push(titleRow);
    excelDataArray.push(Array(headers.length).fill(''));
    excelDataArray.push(headers);

    filteredFinalizedData.forEach((row, index) => {
      excelDataArray.push([
        index + 1,
        row.department || '',
        row.employeeNumber || '',
        row.startDate || '',
        row.endDate || '',
        row.name || '',
        row.position || '',
        toNumber(row.rateNbc594),
        toNumber(row.nbcDiffl597),
        toNumber(row.increment),
        toNumber(row.grossSalary),
        toNumber(row.tevl),
        toNumber(row.dvlt),
        toNumber(row.vlb),
        toNumber(row.abs),
        row.h || 0,
        row.m || 0,
        toNumber(row.netSalary),
        toNumber(row.withholdingTax),
        toNumber(row.totalGsisDeds),
        toNumber(row.totalPagibigDeds),
        toNumber(row.PhilHealthContribution),
        toNumber(row.totalOtherDeds),
        toNumber(row.totalDeductions),
        toNumber(row.pay1st),
        toNumber(row.pay2nd),
        toNumber(row.rtIns),
        toNumber(row.ec),
        row.status || '',
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(excelDataArray);
    const workbook = XLSX.utils.book_new();

    if (!worksheet['!merges']) worksheet['!merges'] = [];
    worksheet['!merges'].push({
      s: { r: 0, c: 0 },
      e: { r: 0, c: headers.length - 1 },
    });

    const colWidths = headers.map((header, idx) => {
      const headerLength = header.length;
      const titleLength = idx === 0 ? title.length : 0;
      const dataLengths = filteredFinalizedData.map((row, rowIdx) => {
        let value = '';
        if (idx === 0) value = String(rowIdx + 1);
        else if (idx === 1) value = String(row.department || '');
        else if (idx === 2) value = String(row.employeeNumber || '');
        else if (idx === 3) value = String(row.startDate || '');
        else if (idx === 4) value = String(row.endDate || '');
        else if (idx === 5) value = String(row.name || '');
        else if (idx === 6) value = String(row.position || '');
        else if (idx === 7) value = String(toNumber(row.rateNbc594) || '');
        else if (idx === 8) value = String(toNumber(row.nbcDiffl597) || '');
        else if (idx === 9) value = String(toNumber(row.increment) || '');
        else if (idx === 10) value = String(toNumber(row.grossSalary) || '');
        else if (idx === 11) value = String(toNumber(row.tevl) || '');
        else if (idx === 12) value = String(toNumber(row.dvlt) || '');
        else if (idx === 13) value = String(toNumber(row.vlb) || '');
        else if (idx === 14) value = String(toNumber(row.abs) || '');
        else if (idx === 15) value = String(row.h || '');
        else if (idx === 16) value = String(row.m || '');
        else if (idx === 17) value = String(toNumber(row.netSalary) || '');
        else if (idx === 18) value = String(toNumber(row.withholdingTax) || '');
        else if (idx === 19) value = String(toNumber(row.totalGsisDeds) || '');
        else if (idx === 20)
          value = String(toNumber(row.totalPagibigDeds) || '');
        else if (idx === 21)
          value = String(toNumber(row.PhilHealthContribution) || '');
        else if (idx === 22) value = String(toNumber(row.totalOtherDeds) || '');
        else if (idx === 23)
          value = String(toNumber(row.totalDeductions) || '');
        else if (idx === 24) value = String(toNumber(row.pay1st) || '');
        else if (idx === 25) value = String(toNumber(row.pay2nd) || '');
        else if (idx === 26) value = String(toNumber(row.rtIns) || '');
        else if (idx === 27) value = String(toNumber(row.ec) || '');
        else if (idx === 28) value = String(row.status || '');
        return value.length;
      });
      const maxLength = Math.max(headerLength, titleLength, ...dataLengths);
      return { wch: Math.min(Math.max(maxLength + 2, 10), 30) };
    });
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Processed Payroll');

    const filename = `PayrollProcessed_${monthName}_${year}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  // Month options for filtering
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

  // Year options for filtering
  const yearOptions = [
    { value: '', label: 'All Years' },
    { value: '2024', label: '2024' },
    { value: '2025', label: '2025' },
    { value: '2026', label: '2026' },
  ];

  // Normalize a date string to YYYY-MM-DD for reliable key comparison
  const normalizeDateString = (dateInput) => {
    try {
      if (!dateInput) return '';
      const d = new Date(dateInput);
      if (Number.isNaN(d.getTime())) return String(dateInput);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (_) {
      return String(dateInput);
    }
  };

  // Build a consistent composite key for a payroll record
  const getRecordKey = (record) => {
    const emp = record?.employeeNumber ?? '';
    const start = normalizeDateString(record?.startDate);
    const end = normalizeDateString(record?.endDate);
    return `${emp}-${start}-${end}`;
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    console.log(
      'Token from localStorage:',
      token ? 'Token exists' : 'No token found',
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

  const handleDateChange = (event) => {
    const newDate = event.target.value;
    setSelectedDate(newDate);
    applyFilters(
      selectedDepartment,
      searchTerm,
      newDate,
      selectedMonth,
      selectedYear,
    );
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getTableHeight = () => {
    const rowHeight = 53;
    const headerHeight = 56;
    const paginationHeight = 52;
    const minHeight = 300;
    const maxHeight = 600;

    const contentHeight =
      Math.min(rowsPerPage, filteredFinalizedData.length) * rowHeight +
      headerHeight +
      paginationHeight;
    return Math.min(Math.max(contentHeight, minHeight), maxHeight);
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

  const fetchFinalizedPayroll = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/PayrollRoute/payroll-processed`,
        getAuthHeaders(),
      );

      // Filter for Regular employees only (employmentCategory = 1)
      // employmentCategory: 0 = Job Order, 1 = Regular, -1 = Not set
      const regularData = res.data.filter(
        (item) => item.employmentCategory === 1,
      );

      setFinalizedData(regularData);
      setFilteredFinalizedData(regularData);

      setLoading(false);
    } catch (err) {
      console.error('Error fetching finalized payroll:', err);
      setError('An error occurred while fetching the finalized payroll.');
      setLoading(false);
    }
  };

  const fetchReleasedPayroll = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/PayrollReleasedRoute/released-payroll`,
        getAuthHeaders(),
      );
      // Build a set of composite keys to uniquely identify released records
      const releasedKeys = new Set();
      if (Array.isArray(res.data)) {
        res.data.forEach((record) => {
          const key = getRecordKey(record);
          releasedKeys.add(key);
        });
      }
      setReleasedIdSet(releasedKeys);
    } catch (err) {
      console.error('Error fetching released payroll for disable logic:', err);
    }
  };

  usePayrollRealtimeRefresh(() => {
    fetchDepartments();
    fetchFinalizedPayroll();
    fetchReleasedPayroll();
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchFinalizedPayroll();
  }, []);

  // Fetch released payroll IDs to disable delete on those records
  useEffect(() => {
    fetchReleasedPayroll();
  }, []);

  // Calculate total released count
  useEffect(() => {
    if (filteredFinalizedData.length > 0 && releasedIdSet.size > 0) {
      const totalReleased = filteredFinalizedData.filter((record) => {
        const key = getRecordKey(record);
        return releasedIdSet.has(key);
      }).length;

      setSummaryData((prev) => ({
        ...prev,
        totalReleased,
      }));
    } else if (filteredFinalizedData.length > 0 && releasedIdSet.size === 0) {
      setSummaryData((prev) => ({
        ...prev,
        totalReleased: 0,
      }));
    }
  }, [filteredFinalizedData, releasedIdSet]);

  const handleDepartmentChange = (event) => {
    const selectedDept = event.target.value;
    setSelectedDepartment(selectedDept);
    applyFilters(
      selectedDept,
      searchTerm,
      selectedDate,
      selectedMonth,
      selectedYear,
    );
  };

  const handleSearchChange = (event) => {
    const term = event.target.value;
    setSearchTerm(term);
    applyFilters(
      selectedDepartment,
      term,
      selectedDate,
      selectedMonth,
      selectedYear,
    );
  };

  const handleMonthChange = (event) => {
    const selectedMonthValue = event.target.value;
    setSelectedMonth(selectedMonthValue);
    applyFilters(
      selectedDepartment,
      searchTerm,
      selectedDate,
      selectedMonthValue,
      selectedYear,
    );
  };

  const handleYearChange = (event) => {
    const selectedYearValue = event.target.value;
    setSelectedYear(selectedYearValue);
    applyFilters(
      selectedDepartment,
      searchTerm,
      selectedDate,
      selectedMonth,
      selectedYearValue,
    );
  };

  const applyFilters = (department, search, filterDate, month, year) => {
    let filtered = [...finalizedData];

    if (department) {
      filtered = filtered.filter((record) => record.department === department);
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          (record.name || '').toLowerCase().includes(lowerSearch) ||
          (record.employeeNumber || '')
            .toString()
            .toLowerCase()
            .includes(lowerSearch),
      );
    }

    // Filter by date - check if the selected date falls within the payroll period
    if (filterDate) {
      filtered = filtered.filter((record) => {
        const startDate = new Date(record.startDate);
        const endDate = new Date(record.endDate);
        const selectedDate = new Date(filterDate);

        // Set time to start/end of day to ensure proper comparison
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        selectedDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues

        // Check if the selected date falls within the payroll period
        return selectedDate >= startDate && selectedDate <= endDate;
      });
    }

    // Apply month filter based on startDate
    if (month && month !== '') {
      filtered = filtered.filter((record) => {
        if (record.startDate) {
          const recordDate = new Date(record.startDate);
          const recordMonth = String(recordDate.getMonth() + 1).padStart(
            2,
            '0',
          );
          return recordMonth === month;
        }
        return false;
      });
    }

    // Apply year filter based on startDate
    if (year && year !== '') {
      filtered = filtered.filter((record) => {
        if (record.startDate) {
          const recordDate = new Date(record.startDate);
          const recordYear = recordDate.getFullYear().toString();
          return recordYear === year;
        }
        return false;
      });
    }

    setFilteredFinalizedData(filtered);
    setPage(0);

    // Recompute summary based on filtered data, similar to PayrollProcessing
    const totalNet = filtered.reduce(
      (sum, item) => sum + parseFloat(item.netSalary || 0),
      0,
    );

    // totalReleased is kept in sync by useEffect below, but also restrict to current filter
    const totalReleasedFiltered = filtered.filter((record) =>
      releasedIdSet.has(getRecordKey(record)),
    ).length;

    setSummaryData((prev) => ({
      ...prev,
      totalEmployees: filtered.length,
      processedEmployees: filtered.length,
      totalReleased: totalReleasedFiltered,
      totalNetSalary: totalNet,
    }));
  };

  const handleDelete = async (rowId) => {
    setOverlayLoading(true);
    try {
      // Find the record to be deleted
      const recordToDelete = finalizedData.find((item) => item.id === rowId);

      // First update UI immediately
      setFinalizedData((prev) => prev.filter((item) => item.id !== rowId));
      setFilteredFinalizedData((prev) =>
        prev.filter((item) => item.id !== rowId),
      );

      // Delete from payroll-processed
      await axios.delete(
        `${API_BASE_URL}/PayrollRoute/payroll-processed/${rowId}`,
        getAuthHeaders(),
      );

      // Show loading for 2-3 seconds, then success overlay
      setTimeout(() => {
        setOverlayLoading(false);
        setSuccessAction('delete');
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2500);
      }, 2500);
    } catch (error) {
      console.error('Error deleting payroll data:', error);
      setOverlayLoading(false);
      // If API call fails, revert the UI changes
      const res = await axios.get(
        `${API_BASE_URL}/PayrollRoute/payroll-processed`,
        getAuthHeaders(),
      );
      // Filter for Regular employees only
      const regularData = res.data.filter(
        (item) => item.employmentCategory === 1,
      );
      setFinalizedData(regularData);
      setFilteredFinalizedData((prev) => {
        // Reapply current filters
        let filtered = res.data;
        if (selectedDepartment) {
          filtered = filtered.filter(
            (record) => record.department === selectedDepartment,
          );
        }
        if (searchTerm) {
          const lowerSearch = searchTerm.toLowerCase();
          filtered = filtered.filter(
            (record) =>
              (record.name || '').toLowerCase().includes(lowerSearch) ||
              (record.employeeNumber || '')
                .toString()
                .toLowerCase()
                .includes(lowerSearch),
          );
        }
        return filtered;
      });
      alert('Failed to delete record. Please try again.');
    }
  };

  const initiateDelete = (rowOrIds) => {
    if (Array.isArray(rowOrIds)) {
      // Bulk delete mode - check if any selected record is already released
      const hasReleased = rowOrIds.some((id) => {
        const record = filteredFinalizedData.find((item) => item.id === id);
        if (!record) return false;
        const key = getRecordKey(record);
        return releasedIdSet.has(key);
      });

      if (hasReleased) {
        alert('Cannot delete records that are already released.');
        return;
      }
      // Bulk delete mode
      setSelectedRow({ isBulk: true, ids: rowOrIds });
    } else {
      // Single row delete - check if the record is already released
      const key = getRecordKey(rowOrIds);
      if (releasedIdSet.has(key)) {
        alert('This record is already released and cannot be deleted.');
        return;
      }
      setSelectedRow(rowOrIds);
    }
    setOpenConfirm(true);
  };

  const handleConfirm = () => {
    setOpenConfirm(false);
    setOpenConfidentialPassword(true);
  };

  const handleConfidentialPasswordSubmit = async () => {
    if (!confidentialPasswordInput) {
      setSnackbarMessage('Please enter the confidential password.');
      setSnackbarOpen(true);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/confidential-password/verify`,
        { password: confidentialPasswordInput },
        getAuthHeaders(),
      );

      if (response.data.verified) {
        // Password verified, proceed with deletion
        setOpenConfidentialPassword(false);
        setConfidentialPasswordInput('');
        setOverlayLoading(true);

        try {
          if (selectedRow.isBulk) {
            // Guard again in case state changed - filter out released records
            const deletableIds = selectedRow.ids.filter((id) => {
              const record = filteredFinalizedData.find(
                (item) => item.id === id,
              );
              if (!record) return false;
              const key = getRecordKey(record);
              return !releasedIdSet.has(key);
            });

            if (deletableIds.length === 0) {
              setOverlayLoading(false);
              alert(
                'All selected records are already released and cannot be deleted.',
              );
              return;
            }
            // Bulk delete
            setFinalizedData((prev) =>
              prev.filter((item) => !deletableIds.includes(item.id)),
            );
            setFilteredFinalizedData((prev) =>
              prev.filter((item) => !deletableIds.includes(item.id)),
            );

            // Delete from payroll-processed
            await Promise.all(
              deletableIds.map((id) =>
                axios.delete(
                  `${API_BASE_URL}/PayrollRoute/payroll-processed/${id}`,
                  getAuthHeaders(),
                ),
              ),
            );

            // Show loading for 2-3 seconds, then success overlay
            setTimeout(() => {
              setOverlayLoading(false);
              setSuccessAction('delete');
              setSuccessOpen(true);
              setTimeout(() => setSuccessOpen(false), 2500);
            }, 2500);
            setSelectedRows([]);
          } else {
            // Single delete - check again if the record is released
            const key = getRecordKey(selectedRow);
            if (releasedIdSet.has(key)) {
              setOverlayLoading(false);
              alert('This record is already released and cannot be deleted.');
              return;
            }

            // Single delete (existing logic)
            setFinalizedData((prev) =>
              prev.filter((item) => item.id !== selectedRow.id),
            );
            setFilteredFinalizedData((prev) =>
              prev.filter((item) => item.id !== selectedRow.id),
            );

            // Delete from payroll-processed
            await axios.delete(
              `${API_BASE_URL}/PayrollRoute/payroll-processed/${selectedRow.id}`,
              {
                ...getAuthHeaders(),
                data: {
                  employeeNumber: selectedRow.employeeNumber,
                  name: selectedRow.name,
                },
              },
            );

            // Show loading for 2-3 seconds, then success overlay
            setTimeout(() => {
              setOverlayLoading(false);
              setSuccessAction('delete');
              setSuccessOpen(true);
              setTimeout(() => setSuccessOpen(false), 2500);
            }, 2500);
          }
        } catch (error) {
          console.error('Error deleting record:', error);
          setOverlayLoading(false);
          // Revert UI changes on error
          const res = await axios.get(
            `${API_BASE_URL}/PayrollRoute/payroll-processed`,
            getAuthHeaders(),
          );
          // Filter for Regular employees only
          const regularData = res.data.filter(
            (item) => item.employmentCategory === 1,
          );
          setFinalizedData(regularData);
          applyFilters(selectedDepartment, searchTerm, selectedDate);
          alert('Failed to delete record(s). Please try again.');
        } finally {
          setSelectedRow(null);
        }
      } else {
        setSnackbarMessage('Password verification failed. Please try again.');
        setSnackbarOpen(true);
        setConfidentialPasswordInput('');
      }
    } catch (error) {
      console.error('Error verifying confidential password:', error);
      setSnackbarMessage(
        error.response?.data?.error ||
          'Failed to verify password. Please try again.',
      );
      setSnackbarOpen(true);
      setConfidentialPasswordInput('');
    }
  };

  const handleConfidentialPasswordCancel = () => {
    setOpenConfidentialPassword(false);
    setConfidentialPasswordInput('');
    setSelectedRow(null);
  };

  const handleReleasePayroll = async () => {
    if (selectedRows.length === 0) {
      alert('Please select payroll records to release.');
      return;
    }

    // Close the confirmation dialog first
    setOpenReleaseConfirm(false);

    // Start loading overlay
    setOverlayLoading(true);

    try {
      // Filter out any already released selections to prevent duplicates
      const unreleasedSelectedIds = selectedRows.filter((id) => {
        const record =
          finalizedData.find((item) => item.id === id) ||
          filteredFinalizedData.find((item) => item.id === id);
        if (!record) return false;
        const key = getRecordKey(record);
        return !releasedIdSet.has(key);
      });

      if (unreleasedSelectedIds.length === 0) {
        alert('All selected records are already released.');
        setOverlayLoading(false);
        return;
      }

      // Compute the composite keys for selected rows BEFORE mutating state
      const keysToAdd = unreleasedSelectedIds
        .map((id) => {
          const record =
            finalizedData.find((item) => item.id === id) ||
            filteredFinalizedData.find((item) => item.id === id);
          if (!record) return null;
          return getRecordKey(record);
        })
        .filter(Boolean);

      const response = await axios.post(
        `${API_BASE_URL}/PayrollReleasedRoute/release-payroll`,
        {
          payrollIds: unreleasedSelectedIds,
          releasedBy: localStorage.getItem('username') || 'System',
        },
        getAuthHeaders(),
      );

      if (response.data) {
        // Remove released records from the current view
        setFinalizedData((prev) =>
          prev.filter((item) => !unreleasedSelectedIds.includes(item.id)),
        );
        setFilteredFinalizedData((prev) =>
          prev.filter((item) => !unreleasedSelectedIds.includes(item.id)),
        );

        // Mark these composite keys as released to immediately disable any related actions
        setReleasedIdSet(
          (prev) =>
            new Set([
              ...(prev instanceof Set ? Array.from(prev) : []),
              ...keysToAdd,
            ]),
        );

        // Remove only the ones we released from selection; keep others if any
        setSelectedRows((prev) =>
          prev.filter((id) => !unreleasedSelectedIds.includes(id)),
        );

        // Show loading for 2-3 seconds, then success overlay, then navigate
        setTimeout(() => {
          setOverlayLoading(false);
          setSuccessAction('release');
          setSuccessOpen(true);

          // Navigate to payroll-released after success overlay is shown
          setTimeout(() => {
            setSuccessOpen(false);
            window.location.href = '/payroll-released';
          }, 2500);
        }, 2500);
      }
    } catch (error) {
      console.error('Error releasing payroll:', error);
      setOverlayLoading(false);
      alert('Failed to release payroll records. Please try again.');
    }
  };

  const initiateRelease = () => {
    if (selectedRows.length === 0) {
      alert('Please select payroll records to release.');
      return;
    }
    setOpenReleaseConfirm(true);
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
        message="You do not have permission to access Payroll Processed. Contact your administrator to request access."
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
      {/* Container with fixed width */}
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
                        Payroll Processed
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          opacity: 0.8,
                          fontWeight: 400,
                          color: textPrimaryColor,
                        }}
                      >
                        View and manage all processed payroll records
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip
                      label="Processed Records"
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
                        onClick={() => window.location.reload()}
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
                            Total Released
                          </Typography>
                          <Typography
                            variant="h6"
                            fontWeight="bold"
                            sx={{ color: textPrimaryColor }}
                          >
                            {summaryData.totalReleased.toLocaleString('en-US')}
                          </Typography>
                        </Box>
                        <TrendingUpIcon
                          sx={{ color: accentColor, fontSize: 32 }}
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
                            Total Net Salary
                          </Typography>
                          <Typography
                            variant="h6"
                            fontWeight="bold"
                            sx={{ color: textPrimaryColor }}
                          >
                            ₱
                            {summaryData.totalNetSalary.toLocaleString(
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
              </Box>

              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={2}>
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

                <Grid item xs={12} sm={6} md={2}>
                  <ModernTextField
                    type="date"
                    fullWidth
                    size="small"
                    label="Search by Date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    InputLabelProps={{
                      shrink: true,
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

                <Grid item xs={12} sm={6} md={2}>
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

                <Grid item xs={12} sm={6} md={2}>
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

                <Grid item xs={12} sm={6} md={2}>
                  <ModernTextField
                    fullWidth
                    size="small"
                    placeholder="Search employee..."
                    value={searchTerm}
                    onChange={handleSearchChange}
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
                  Processed Payroll Data
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
                    onClick={() => window.location.reload()}
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

            {loading ? (
              <Box display="flex" justifyContent="center" py={10}>
                <CircularProgress />
              </Box>
            ) : (
              <Box>
                {/* Table with Fixed Actions Column */}
                <Box
                  sx={{ display: 'flex', width: '100%', position: 'relative' }}
                >
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
                        boxShadow: `0 4px 24px ${alpha(accentColor, 0.06)}`,
                        border: `1px solid ${alpha(accentColor, 0.08)}`,
                        overflowX: 'auto',
                        overflowY: 'visible',
                        width: 'max-content',
                        minWidth: '100%',
                      }}
                    >
                      <Table
                        sx={{ minWidth: 'max-content', tableLayout: 'auto' }}
                      >
                        <TableHead sx={{ bgcolor: alpha(primaryColor, 0.7) }}>
                          <TableRow>
                            <PremiumTableCell
                              padding="checkbox"
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              <Checkbox
                                sx={{
                                  color: 'white',
                                  '&.Mui-checked': {
                                    color: 'white',
                                  },
                                  '&:hover': {
                                    color: '#F5F5F5',
                                  },
                                  '&.MuiCheckbox-indeterminate': {
                                    color: 'white',
                                  },
                                }}
                                indeterminate={(() => {
                                  const currentPageRows =
                                    filteredFinalizedData.slice(
                                      page * rowsPerPage,
                                      page * rowsPerPage + rowsPerPage,
                                    );
                                  const selectableIds = currentPageRows
                                    .filter(
                                      (row) =>
                                        !releasedIdSet.has(getRecordKey(row)),
                                    )
                                    .map((row) => row.id);
                                  const selectedOnPage = selectedRows.filter(
                                    (id) => selectableIds.includes(id),
                                  );
                                  return (
                                    selectedOnPage.length > 0 &&
                                    selectedOnPage.length < selectableIds.length
                                  );
                                })()}
                                checked={(() => {
                                  const currentPageRows =
                                    filteredFinalizedData.slice(
                                      page * rowsPerPage,
                                      page * rowsPerPage + rowsPerPage,
                                    );
                                  const selectableIds = currentPageRows
                                    .filter(
                                      (row) =>
                                        !releasedIdSet.has(getRecordKey(row)),
                                    )
                                    .map((row) => row.id);
                                  if (selectableIds.length === 0) return false;
                                  return selectableIds.every((id) =>
                                    selectedRows.includes(id),
                                  );
                                })()}
                                onChange={(e) => {
                                  const currentPageRows =
                                    filteredFinalizedData.slice(
                                      page * rowsPerPage,
                                      page * rowsPerPage + rowsPerPage,
                                    );
                                  const selectableIds = currentPageRows
                                    .filter(
                                      (row) =>
                                        !releasedIdSet.has(getRecordKey(row)),
                                    )
                                    .map((row) => row.id);
                                  if (e.target.checked) {
                                    setSelectedRows((prev) => [
                                      ...new Set([...prev, ...selectableIds]),
                                    ]);
                                  } else {
                                    setSelectedRows((prev) =>
                                      prev.filter(
                                        (id) => !selectableIds.includes(id),
                                      ),
                                    );
                                  }
                                }}
                              />
                            </PremiumTableCell>

                            {/* Header Cells - Directly in the same TableRow */}
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              No.
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
                              Employee Number
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Start Date
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              End Date
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Name
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Position
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Rate NBC 584
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              NBC 594
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Rate NBC 594
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              NBC DIFF'L 597
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Increment
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Gross Salary
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              <Tooltip
                                title="Total Earned Vacation Leave"
                                arrow
                              >
                                TEVL
                              </Tooltip>
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              <Tooltip
                                title="Deducted Vacation Leave Tardiness"
                                arrow
                              >
                                DVLT
                              </Tooltip>
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              <Tooltip title="Vacation Leave Balance" arrow>
                                VLB
                              </Tooltip>
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              <b>ABS</b>
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              H
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              M
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              SSS
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              <b>Net Salary</b>
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Withholding Tax
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              <b>Total GSIS Deductions</b>
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              <b>Total Pag-ibig Deductions</b>
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              PhilHealth
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              <b>Total Other Deductions</b>
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              <b>Total Deductions</b>
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              1st Pay
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              2nd Pay
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              No.
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              RT Ins.
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              EC
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              PhilHealth
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Pag-Ibig
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{
                                color: textPrimaryColor,
                                borderLeft: '2px solid black',
                              }}
                            >
                              Pay1st Compute
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Pay2nd Compute
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{
                                color: textPrimaryColor,
                                borderLeft: '2px solid black',
                              }}
                            >
                              No.
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Name
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Position
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Withholding Tax
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Personal Life Ret Ins
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              GSIS Salary Loan
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              GSIS Policy Loan
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              gsisArrears
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              CPL
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              MPL
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              EAL
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              MPL LITE
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Emergency Loan (ELA)
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Total GSIS Deductions
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Pag-ibig Fund Contribution
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Pag-ibig 2
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Multi-Purpose Loan
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Total Pag-Ibig Deduction
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              PhilHealth
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              liquidatingCash
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              LandBank Salary Loan
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Earist Credit COOP.
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              FEU
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Total Other Deductions
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Total Deductions
                            </PremiumTableCell>
                            <PremiumTableCell
                              isHeader
                              sx={{ color: textPrimaryColor }}
                            >
                              Date Submitted
                            </PremiumTableCell>
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          {filteredFinalizedData.length > 0 ? (
                            filteredFinalizedData
                              .slice(
                                page * rowsPerPage,
                                page * rowsPerPage + rowsPerPage,
                              )
                              .map((row, index) => {
                                const key = getRecordKey(row);
                                const isRowReleased = releasedIdSet.has(key);
                                const isSelected = selectedRows.includes(
                                  row.id,
                                );
                                const shouldDisable = isSelected
                                  ? selectedRows.some((id) => {
                                      const selectedRecord =
                                        filteredFinalizedData.find(
                                          (item) => item.id === id,
                                        );
                                      if (!selectedRecord) return false;
                                      const selectedKey =
                                        getRecordKey(selectedRecord);
                                      return releasedIdSet.has(selectedKey);
                                    })
                                  : isRowReleased;

                                return (
                                  <TableRow
                                    key={row.id}
                                    sx={{
                                      '&:nth-of-type(even)': {
                                        bgcolor: alpha(primaryColor, 0.3),
                                      },
                                      '&:hover': {
                                        backgroundColor:
                                          alpha(accentColor, 0.05) +
                                          ' !important',
                                      },
                                      transition: 'all 0.2s ease',
                                    }}
                                  >
                                    <PremiumTableCell padding="checkbox">
                                      <Checkbox
                                        checked={selectedRows.includes(row.id)}
                                        disabled={releasedIdSet.has(
                                          getRecordKey(row),
                                        )}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          if (
                                            releasedIdSet.has(getRecordKey(row))
                                          )
                                            return;
                                          if (selectedRows.includes(row.id)) {
                                            setSelectedRows((prev) =>
                                              prev.filter(
                                                (id) => id !== row.id,
                                              ),
                                            );
                                          } else {
                                            setSelectedRows((prev) => [
                                              ...prev,
                                              row.id,
                                            ]);
                                          }
                                        }}
                                      />
                                    </PremiumTableCell>
                                    <ExcelTableCell>
                                      {page * rowsPerPage + index + 1}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.department}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.employeeNumber}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.startDate}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.endDate}
                                    </ExcelTableCell>
                                    <ExcelTableCell>{row.name}</ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.position}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.rateNbc584
                                        ? Number(row.rateNbc584).toLocaleString(
                                            'en-US',
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            },
                                          )
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.nbc594
                                        ? Number(row.nbc594).toLocaleString(
                                            'en-US',
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            },
                                          )
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.rateNbc594
                                        ? Number(row.rateNbc594).toLocaleString(
                                            'en-US',
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            },
                                          )
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.nbcDiffl597
                                        ? Number(
                                            row.nbcDiffl597,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.increment
                                        ? Number(row.increment).toLocaleString(
                                            'en-US',
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            },
                                          )
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.grossSalary
                                        ? Number(
                                            row.grossSalary,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    {/* Rendered days removed in processed view (JO-only) */}
                                    <ExcelTableCell>{row.tevl}</ExcelTableCell>
                                    <ExcelTableCell>{row.dvlt}</ExcelTableCell>
                                    <ExcelTableCell>{row.vlb}</ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.abs
                                        ? Number(row.abs).toLocaleString(
                                            'en-US',
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            },
                                          )
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>{row.h}</ExcelTableCell>
                                    <ExcelTableCell>{row.m}</ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.sss
                                        ? Number(row.sss).toLocaleString(
                                            'en-US',
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            },
                                          )
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell
                                      sx={{
                                        color: 'green',
                                        fontWeight: 'bold',
                                      }}
                                    >
                                      {parseFloat(row.netSalary || 0)
                                        ? Number(row.netSalary).toLocaleString(
                                            'en-US',
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            },
                                          )
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.withholdingTax
                                        ? Number(
                                            row.withholdingTax,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.totalGsisDeds
                                        ? Number(
                                            row.totalGsisDeds,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.totalPagibigDeds
                                        ? Number(
                                            row.totalPagibigDeds,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.PhilHealthContribution
                                        ? Number(
                                            row.PhilHealthContribution,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.totalOtherDeds
                                        ? Number(
                                            row.totalOtherDeds,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.totalDeductions
                                        ? Number(
                                            row.totalDeductions,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell
                                      sx={{ color: 'red', fontWeight: 'bold' }}
                                    >
                                      {row.pay1st
                                        ? Number(row.pay1st).toLocaleString(
                                            'en-US',
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            },
                                          )
                                        : ''}{' '}
                                    </ExcelTableCell>
                                    <ExcelTableCell
                                      sx={{ color: 'red', fontWeight: 'bold' }}
                                    >
                                      {row.pay2nd
                                        ? Number(row.pay2nd).toLocaleString(
                                            'en-US',
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            },
                                          )
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>{index + 1}</ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.rtIns
                                        ? Number(row.rtIns).toLocaleString(
                                            'en-US',
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            },
                                          )
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.ec
                                        ? Number(row.ec).toLocaleString(
                                            'en-US',
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            },
                                          )
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.PhilHealthContribution
                                        ? Number(
                                            row.PhilHealthContribution,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.pagibigFundCont
                                        ? Number(
                                            row.pagibigFundCont,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell
                                      sx={{
                                        borderLeft: '2px solid black',
                                        color: 'red',
                                        fontWeight: 'bold',
                                      }}
                                    >
                                      {row.pay1stCompute
                                        ? Number(
                                            row.pay1stCompute,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell
                                      sx={{ color: 'red', fontWeight: 'bold' }}
                                    >
                                      {row.pay2ndCompute
                                        ? Number(
                                            row.pay2ndCompute,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell
                                      sx={{ borderLeft: '2px solid black' }}
                                    >
                                      {index + 1}
                                    </ExcelTableCell>
                                    <ExcelTableCell>{row.name}</ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.position}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.withholdingTax
                                        ? Number(
                                            row.withholdingTax,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.personalLifeRetIns
                                        ? Number(
                                            row.personalLifeRetIns,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.gsisSalaryLoan
                                        ? Number(
                                            row.gsisSalaryLoan,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.gsisPolicyLoan
                                        ? Number(
                                            row.gsisPolicyLoan,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.gsisArrears
                                        ? Number(
                                            row.gsisArrears,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.cpl
                                        ? Number(row.cpl).toLocaleString(
                                            'en-US',
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            },
                                          )
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.mpl
                                        ? Number(row.mpl).toLocaleString(
                                            'en-US',
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            },
                                          )
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.eal
                                        ? Number(row.eal).toLocaleString(
                                            'en-US',
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            },
                                          )
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.mplLite
                                        ? Number(row.mplLite).toLocaleString(
                                            'en-US',
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            },
                                          )
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.emergencyLoan
                                        ? Number(
                                            row.emergencyLoan,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.totalGsisDeds
                                        ? Number(
                                            row.totalGsisDeds,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.pagibigFundCont
                                        ? Number(
                                            row.pagibigFundCont,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.pagibig2
                                        ? Number(row.pagibig2).toLocaleString(
                                            'en-US',
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            },
                                          )
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.multiPurpLoan
                                        ? Number(
                                            row.multiPurpLoan,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.totalPagibigDeds
                                        ? Number(
                                            row.totalPagibigDeds,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.PhilHealthContribution
                                        ? Number(
                                            row.PhilHealthContribution,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.liquidatingCash
                                        ? Number(
                                            row.liquidatingCash,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.landbankSalaryLoan
                                        ? Number(
                                            row.landbankSalaryLoan,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.earistCreditCoop
                                        ? Number(
                                            row.earistCreditCoop,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.feu
                                        ? Number(row.feu).toLocaleString(
                                            'en-US',
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            },
                                          )
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.totalOtherDeds
                                        ? Number(
                                            row.totalOtherDeds,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {row.totalDeductions
                                        ? Number(
                                            row.totalDeductions,
                                          ).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ''}
                                    </ExcelTableCell>
                                    <ExcelTableCell>
                                      {new Date(
                                        row.dateCreated,
                                      ).toLocaleString()}
                                    </ExcelTableCell>
                                  </TableRow>
                                );
                              })
                          ) : (
                            <TableRow>
                              <PremiumTableCell
                                colSpan={50}
                                align="center"
                                sx={{ py: 8 }}
                              >
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
                                    sx={{
                                      color: alpha(accentColor, 0.6),
                                      fontWeight: 600,
                                    }}
                                    gutterBottom
                                  >
                                    No Records Found
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    sx={{ color: alpha(accentColor, 0.4) }}
                                  >
                                    No finalized payroll records available. Try
                                    adjusting your filters.
                                  </Typography>
                                </Box>
                              </PremiumTableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </PremiumTableContainer>
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
                              padding: '8px',
                              position: 'sticky',
                              paddingTop: 3.5,
                              paddingBottom: 3.5,
                              zIndex: 2,
                              color: textPrimaryColor,
                            }}
                          >
                            Actions
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredFinalizedData.length > 0 ? (
                          filteredFinalizedData
                            .slice(
                              page * rowsPerPage,
                              page * rowsPerPage + rowsPerPage,
                            )
                            .map((row, index) => {
                              const key = getRecordKey(row);
                              const isRowReleased = releasedIdSet.has(key);
                              const isSelected = selectedRows.includes(row.id);
                              const shouldDisable = isRowReleased;

                              return (
                                <TableRow
                                  key={`actions-${row.id}`}
                                  sx={{
                                    '&:nth-of-type(even)': {
                                      bgcolor: alpha(primaryColor, 0.3),
                                    },
                                    '&:hover': {
                                      backgroundColor:
                                        alpha(accentColor, 0.05) +
                                        ' !important',
                                    },
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  <TableCell
                                    sx={{
                                      padding: '8px',
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
                                        paddingTop: 2,
                                        paddingBottom: 2,
                                      }}
                                    >
                                      <Tooltip title="Delete Record">
                                        <IconButton
                                          size="small"
                                          onClick={() => {
                                            if (isSelected) {
                                              initiateDelete(selectedRows);
                                            } else {
                                              initiateDelete(row);
                                            }
                                          }}
                                          disabled={shouldDisable}
                                          sx={{
                                            color: shouldDisable
                                              ? '#ccc'
                                              : '#d32f2f',
                                            backgroundColor: shouldDisable
                                              ? '#f5f5f5'
                                              : 'white',
                                            border: '1px solid #d32f2f',
                                            '&:hover': {
                                              backgroundColor: shouldDisable
                                                ? '#f5f5f5'
                                                : 'rgba(211, 47, 47, 0.1)',
                                            },
                                            padding: '4px',
                                          }}
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
                                padding: '8px',
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
                      Total Records: {filteredFinalizedData.length}
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
                    count={filteredFinalizedData.length}
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
                  <Tooltip title="Save current view to Excel">
                    <IconButton
                      onClick={handleExportToExcel}
                      sx={{
                        bgcolor: alpha(accentColor, 0.1),
                        '&:hover': { bgcolor: alpha(accentColor, 0.2) },
                        color: textPrimaryColor,
                        width: 48,
                        height: 48,
                      }}
                      disabled={filteredFinalizedData.length === 0}
                    >
                      <CloudUpload />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            )}
          </GlassCard>
        </Fade>

        {/* Action Buttons */}
        <Box
          sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}
        >
          <ProfessionalButton
            variant="outlined"
            onClick={() => (window.location.href = '/payroll-table')}
            size="large"
            sx={{
              borderColor: accentColor,
              color: textPrimaryColor,
              '&:hover': {
                borderColor: accentDark,
                backgroundColor: alpha(accentColor, 0.1),
              },
            }}
            startIcon={<Pending />}
          >
            View Pending Payroll
          </ProfessionalButton>

          <ProfessionalButton
            variant="outlined"
            onClick={() => (window.location.href = '/payroll-released')}
            size="large"
            sx={{
              borderColor: accentColor,
              color: textPrimaryColor,
              '&:hover': {
                borderColor: accentDark,
                backgroundColor: alpha(accentColor, 0.1),
              },
            }}
            startIcon={<BusinessCenterIcon />}
          >
            View Released Payroll
          </ProfessionalButton>

          <ProfessionalButton
            variant="contained"
            startIcon={<PublishIcon />}
            onClick={initiateRelease}
            disabled={selectedRows.length === 0}
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
          >
            Release Selected ({selectedRows.length})
          </ProfessionalButton>
        </Box>

        <Modal
          open={openConfirm}
          onClose={() => setOpenConfirm(false)}
          BackdropProps={{
            sx: {
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1300,
            },
          }}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1300,
          }}
        >
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: { xs: '90%', sm: 500 },
              maxWidth: 900,
              bgcolor: 'white',
              borderRadius: 3,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              border: `2px solid ${accentColor}`,
              zIndex: 1301,
            }}
          >
            {/* Clean White Header with Accent */}
            <Box
              sx={{
                p: 3,
                background: `linear-gradient(135deg, ${settings.secondaryColor || accentColor} 0%, ${settings.deleteButtonHoverColor || accentDark} 100%)`,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                position: 'sticky',
                top: 0,
                zIndex: 10,
                flexShrink: 0,
              }}
            >
              <Avatar
                sx={{
                  bgcolor: alpha(
                    settings.accentColor || textSecondaryColor,
                    0.2,
                  ),
                  color: settings.accentColor || textSecondaryColor,
                  width: 56,
                  height: 56,
                }}
              >
                <DeleteForever sx={{ fontSize: 28 }} />
              </Avatar>
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 'bold',
                    color: settings.accentColor || textSecondaryColor,
                  }}
                >
                  Delete Record Confirmation
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: settings.accentColor || textSecondaryColor,
                    opacity: 0.9,
                  }}
                >
                  This action cannot be undone
                </Typography>
              </Box>
            </Box>

            {/* Content */}
            <Box sx={{ p: 4, bgcolor: 'white' }}>
              <Alert
                severity="warning"
                icon={<DeleteForever />}
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
                  Delete{' '}
                  {selectedRow?.isBulk
                    ? `${selectedRow.ids.length} selected records`
                    : 'this record'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Please confirm that you want to delete{' '}
                  <strong>
                    {selectedRow?.isBulk
                      ? `${selectedRow.ids.length} selected records`
                      : 'this record'}
                  </strong>
                  . This action cannot be undone.
                </Typography>
              </Alert>

              {/* Action Buttons */}
              <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
                <Button
                  variant="outlined"
                  onClick={() => setOpenConfirm(false)}
                  sx={{
                    color: settings.cancelButtonColor || accentColor,
                    borderColor: settings.cancelButtonColor || accentColor,
                    px: 3,
                    py: 1.2,
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: 2,
                    minWidth: 120,
                    '&:hover': {
                      borderColor:
                        settings.cancelButtonHoverColor || accentDark,
                      backgroundColor: alpha(
                        settings.cancelButtonColor || accentColor,
                        0.08,
                      ),
                    },
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleConfirm}
                  sx={{
                    backgroundColor:
                      settings.deleteButtonColor ||
                      settings.primaryColor ||
                      accentColor,
                    color: settings.accentColor || 'white',
                    px: 4,
                    py: 1.2,
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: 2,
                    minWidth: 120,
                    '&:hover': {
                      backgroundColor:
                        settings.deleteButtonHoverColor ||
                        settings.hoverColor ||
                        accentDark,
                    },
                  }}
                  startIcon={<DeleteForever />}
                >
                  Delete
                </Button>
              </Box>
            </Box>
          </Box>
        </Modal>

        {/* CONFIDENTIAL PASSWORD MODAL */}
        <Modal
          open={openConfidentialPassword}
          onClose={handleConfidentialPasswordCancel}
        >
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: { xs: '90%', sm: 500 },
              maxWidth: 900,
              bgcolor: 'white',
              borderRadius: 3,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              border: `2px solid ${accentColor}`,
            }}
          >
            {/* Clean White Header with Accent */}
            <Box
              sx={{
                p: 3,
                background: `linear-gradient(135deg, ${settings.secondaryColor || accentColor} 0%, ${settings.deleteButtonHoverColor || accentDark} 100%)`,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                position: 'sticky',
                top: 0,
                zIndex: 10,
                flexShrink: 0,
              }}
            >
              <Avatar
                sx={{
                  bgcolor: alpha(
                    settings.accentColor || textSecondaryColor,
                    0.2,
                  ),
                  color: settings.accentColor || textSecondaryColor,
                  width: 56,
                  height: 56,
                }}
              >
                <Lock sx={{ fontSize: 28 }} />
              </Avatar>
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 'bold',
                    color: settings.accentColor || textSecondaryColor,
                  }}
                >
                  Authorization Required
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: settings.accentColor || textSecondaryColor,
                    opacity: 0.9,
                  }}
                >
                  Sensitive operation verification
                </Typography>
              </Box>
            </Box>

            {/* Content */}
            <Box sx={{ p: 4, bgcolor: 'white' }}>
              <Typography variant="body1" sx={{ mb: 3, color: '#666' }}>
                This is a sensitive operation. Please enter the authorized
                password to proceed with the deletion.
              </Typography>

              <TextField
                autoFocus
                margin="dense"
                label="Enter Confidential Password"
                type="password"
                fullWidth
                variant="outlined"
                value={confidentialPasswordInput}
                onChange={(e) => setConfidentialPasswordInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleConfidentialPasswordSubmit();
                  }
                }}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              {/* Action Buttons */}
              <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
                <Button
                  onClick={handleConfidentialPasswordCancel}
                  variant="outlined"
                  sx={{
                    color: settings.cancelButtonColor || accentColor,
                    borderColor: settings.cancelButtonColor || accentColor,
                    px: 3,
                    py: 1.2,
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: 2,
                    minWidth: 120,
                    '&:hover': {
                      borderColor:
                        settings.cancelButtonHoverColor || accentDark,
                      backgroundColor: alpha(
                        settings.cancelButtonColor || accentColor,
                        0.08,
                      ),
                    },
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfidentialPasswordSubmit}
                  variant="contained"
                  sx={{
                    backgroundColor:
                      settings.updateButtonColor ||
                      settings.primaryColor ||
                      accentColor,
                    color: settings.accentColor || 'white',
                    px: 4,
                    py: 1.2,
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: 2,
                    minWidth: 120,
                    '&:hover': {
                      backgroundColor:
                        settings.updateButtonHoverColor ||
                        settings.hoverColor ||
                        accentDark,
                    },
                  }}
                  startIcon={<Lock />}
                >
                  Verify
                </Button>
              </Box>
            </Box>
          </Box>
        </Modal>

        {/* RELEASE PAYROLL RECORDS MODAL */}
        <Modal
          open={openReleaseConfirm}
          onClose={() => setOpenReleaseConfirm(false)}
        >
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: { xs: '90%', sm: 500 },
              maxWidth: 900,
              bgcolor: 'white',
              borderRadius: 3,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              border: `2px solid ${accentColor}`,
            }}
          >
            {/* Clean White Header with Accent */}
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
                <CloudUpload sx={{ fontSize: 28 }} />
              </Avatar>
              <Box>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 'bold', color: '#333' }}
                >
                  Release Payroll Records
                </Typography>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Move records to released module
                </Typography>
              </Box>
            </Box>

            {/* Content */}
            <Box sx={{ p: 4, bgcolor: 'white' }}>
              <Alert
                severity="info"
                icon={<CloudUpload />}
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
                  Release {selectedRows.length} Payroll Record
                  {selectedRows.length > 1 ? 's' : ''}
                </Typography>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Please confirm that you want to release{' '}
                  <strong>{selectedRows.length}</strong> selected payroll record
                  {selectedRows.length > 1 ? 's' : ''}. This action will move
                  them to the <strong>Payroll Released</strong> module, and they
                  will no longer be editable.
                </Typography>
              </Alert>

              {/* OPTIONAL: subtle pulse line loader when releasing */}
              {releaseLoading && (
                <Box
                  sx={{
                    mt: 2,
                    mb: 3,
                    height: '4px',
                    width: '100%',
                    borderRadius: '2px',
                    background: `linear-gradient(90deg, ${accentColor}, ${textPrimaryColor}, ${accentColor})`,
                    backgroundSize: '200% 100%',
                    animation: 'pulseLine 1.5s linear infinite',
                  }}
                />
              )}

              {/* Action Buttons */}
              <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
                <Button
                  onClick={() => setOpenReleaseConfirm(false)}
                  variant="outlined"
                  disabled={releaseLoading}
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
                  onClick={handleReleasePayroll}
                  variant="contained"
                  disabled={releaseLoading}
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
                  startIcon={
                    releaseLoading ? (
                      <CircularProgress size={18} sx={{ color: 'white' }} />
                    ) : (
                      <CloudUpload />
                    )
                  }
                >
                  {releaseLoading ? 'Releasing...' : 'Release'}
                </Button>
              </Box>
            </Box>
          </Box>
        </Modal>

        {/* 🔥 Add keyframes for the pulse line effect */}
        <style>
          {`
    @keyframes pulseLine {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `}
        </style>

        {/* Loading and Success Overlays */}
        <LoadingOverlay
          open={overlayLoading || releaseLoading}
          message={releaseLoading ? 'Releasing...' : 'Processing...'}
        />
        <SuccessfulOverlay
          open={successOpen}
          action={successAction}
          onClose={() => setSuccessOpen(false)}
        />

        {/* Snackbar for password errors */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{
            '& .MuiSnackbarContent-root': {
              backgroundColor: '#d32f2f',
              color: 'white',
              fontWeight: 600,
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(211, 47, 47, 0.3)',
            },
          }}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity="error"
            sx={{
              width: '100%',
              backgroundColor: '#d32f2f',
              color: 'white',
              '& .MuiAlert-icon': {
                color: 'white',
              },
              '& .MuiAlert-action': {
                color: 'white',
              },
            }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default PayrollProcessed;
