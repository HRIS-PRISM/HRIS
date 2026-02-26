// Helper to check if a row is processed
const isRowProcessed = (row) => row.status === 'Processed' || row.status === 1;
import API_BASE_URL from '../../apiConfig';
import React, { useEffect, useState, useRef } from 'react';
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
} from '@mui/material';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import { usePayrollFormulas } from '../../hooks/usePayrollFormulas';
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
  position: 'relative', // Fixed position
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

// Simple ExcelTableCell alias (Excel view removed but many cells use this component)
const ExcelTableCell = ({ children, header, ...props }) => (
  <TableCell {...props} sx={{ whiteSpace: 'nowrap', ...props.sx }}>
    {children}
  </TableCell>
);

// (Excel view removed)

const PayrollProcess = () => {
  // System Settings Hook
  const { settings } = useSystemSettings();

  // Get colors from system settings - aligned with Remittances.jsx
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
  // The identifier 'payroll-table' should match the component_identifier in the pages table
  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('payroll-table');
  // ACCESSING END

  // Payroll Formulas Hook
  const { calculatePayroll, loading: formulasLoading } = usePayrollFormulas();

  // [All existing state variables remain the same]
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [isPayrollProcessed, setIsPayrollProcessed] = useState(false);
  const [finalizedPayroll, setFinalizedPayroll] = useState([]);
  const [duplicateEmployeeNumbers, setDuplicateEmployeeNumbers] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [openViewModal, setOpenViewModal] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [summaryData, setSummaryData] = useState({
    totalEmployees: 0,
    processedEmployees: 0,
    unprocessedEmployees: 0,
    totalGrossSalary: 0,
    totalNetSalary: 0,
  });

  // Excel view removed: related state and refs removed

  // New state for bulk save
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [bulkSaveProgress, setBulkSaveProgress] = useState({
    current: 0,
    total: 0,
  });
  const [bulkSaveOpen, setBulkSaveOpen] = useState(false);

  // [All existing functions remain the same]
  const handleView = (rowId) => {
    const row = computedRows.find((item) => item.id === rowId);
    setViewRow(row);
    setOpenViewModal(true);
  };

  const handleCloseView = () => {
    setOpenViewModal(false);
    setViewRow(null);
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

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  };

  const canSubmit = selectedRows.length > 0;

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
      Math.min(rowsPerPage, filteredData.length) * rowHeight +
      headerHeight +
      paginationHeight;
    return Math.min(Math.max(contentHeight, minHeight), maxHeight);
  };

  // Test authentication function
  const testAuth = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/PayrollRoute/test-auth`,
        getAuthHeaders(),
      );
      console.log('Auth test successful:', res.data);
    } catch (error) {
      console.error('Auth test failed:', error.response?.data || error.message);
    }
  };

  const fetchFinalizedPayroll = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/PayrollRoute/finalized-payroll`,
        getAuthHeaders(),
      );
      setFinalizedPayroll(res.data);
    } catch (err) {
      console.error('Error fetching finalized payroll data:', err);
    }
  };

  useEffect(() => {
    fetchFinalizedPayroll();
  }, []);

  const isAlreadyFinalized = filteredData.some((fd) =>
    finalizedPayroll.some(
      (fp) =>
        fp.employeeNumber === fd.employeeNumber &&
        fp.startDate === fd.startDate &&
        fp.endDate === fd.endDate,
    ),
  );

  const computeSummaryForRows = (rows) => {
    const processedEmployees = rows.filter(
      (item) => item.status === 'Processed' || item.status === 1,
    ).length;
    const unprocessedEmployees = rows.filter(
      (item) => item.status !== 'Processed' && item.status !== 1,
    ).length;

    const totalGrossSalary = rows.reduce(
      (sum, item) => sum + parseFloat(item.grossSalary || 0),
      0,
    );
    const totalNetSalary = rows.reduce(
      (sum, item) => sum + parseFloat(item.netSalary || 0),
      0,
    );

    return {
      totalEmployees: rows.length,
      processedEmployees,
      unprocessedEmployees,
      totalGrossSalary,
      totalNetSalary,
    };
  };

  const getFilteredRows = (baseRows, department, status, month, year) => {
    let filtered = [...baseRows];

    // Apply status filter only if explicitly selected
    if (status && status !== '') {
      filtered = filtered.filter((record) => record.status === status);
    }
    // Helper to check if a row is processed
    const isRowProcessed = (row) =>
      row.status === 'Processed' || row.status === 1;

    // Apply department filter
    if (department && department !== '') {
      filtered = filtered.filter((record) => record.department === department);
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

    return filtered;
  };

  const fetchPayrollData = async (searchTerm = '') => {
    try {
      setIsSearching(true);
      const url = searchTerm
        ? `${API_BASE_URL}/PayrollRoute/payroll/search?searchTerm=${searchTerm}`
        : `${API_BASE_URL}/PayrollRoute/payroll-with-remittance`;

      const res = await axios.get(url, getAuthHeaders());
      console.log(res.data);

      // Track duplicates by composite key: Name, EmployeeNumber, Start Date, End Date
      const seen = new Map();
      const duplicates = new Set();

      res.data.forEach((item) => {
        const compositeKey = `${item.name}|${item.employeeNumber}|${item.startDate}|${item.endDate}`;
        if (seen.has(compositeKey)) {
          duplicates.add(compositeKey);
        } else {
          seen.set(compositeKey, item);
        }
      });

      // Normalize data and ensure remittance fields have fallback values
      const normalizedData = res.data.map((item) => {
        // Ensure all remittance fields have fallback values to prevent miscalculations
        const normalizedItem = {
          ...item,
          tevl: Number(item.tevl) || 0,
          // Remittance fields with fallback to 0 if NULL/undefined
          increment: item.increment ?? 0,
          gsisSalaryLoan: item.gsisSalaryLoan ?? 0,
          gsisPolicyLoan: item.gsisPolicyLoan ?? 0,
          gsisArrears: item.gsisArrears ?? 0,
          cpl: item.cpl ?? 0,
          mpl: item.mpl ?? 0,
          eal: item.eal ?? 0,
          mplLite: item.mplLite ?? 0,
          emergencyLoan: item.emergencyLoan ?? 0,
          pagibigFundCont: item.pagibigFundCont ?? 0,
          pagibig2: item.pagibig2 ?? 0,
          multiPurpLoan: item.multiPurpLoan ?? 0,
          liquidatingCash: item.liquidatingCash ?? 0,
          landbankSalaryLoan: item.landbankSalaryLoan ?? 0,
          earistCreditCoop: item.earistCreditCoop ?? 0,
          feu: item.feu ?? 0,
          // Other fields
          h: item.h ?? 0,
          m: item.m ?? 0,
          s: item.s ?? 0,
          withholdingTax: item.withholdingTax ?? 0,
          ec: item.ec ?? 0,
          rateNbc594: item.rateNbc594 ?? 0,
          nbcDiffl597: item.nbcDiffl597 ?? 0,
          status:
            item.status === 'Processed' || item.status === 1
              ? 'Processed'
              : 'Unprocessed',
        };

        // Recalculate all fields using formulas (don't trust pre-computed values from database)
        // This fixes the miscalculation issue where initial data shows wrong values
        const calculatedItem = calculatePayroll(normalizedItem);

        return calculatedItem || normalizedItem;
      });

      setDuplicateEmployeeNumbers([...duplicates]);

      // Keep all data for filtering purposes
      setData(normalizedData);

      // Apply current filters to drive BOTH table and header summary widgets
      const filtered = getFilteredRows(
        normalizedData,
        selectedDepartment,
        selectedStatus,
        selectedMonth,
        selectedYear,
      );
      setFilteredData(filtered);
      setSummaryData(computeSummaryForRows(filtered));
      setIsPayrollProcessed(filtered.length === 0);
      setPage(0);
    } catch (err) {
      console.error('Error fetching payroll data:', err);
      setError('An error occurred while fetching the payroll data.');
    } finally {
      setIsSearching(false);
    }
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

  usePayrollRealtimeRefresh(() => {
    fetchFinalizedPayroll();
    fetchDepartments();
    fetchPayrollData(searchTerm);
  });

  useEffect(() => {
    // Test authentication first
    testAuth();

    fetchPayrollData();
    fetchDepartments();
  }, []);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const handleDepartmentChange = (event) => {
    const selectedDept = event.target.value;
    setSelectedDepartment(selectedDept);
    applyFilters(
      selectedDept,
      searchTerm,
      selectedStatus,
      selectedMonth,
      selectedYear,
    );
  };

  const handleStatusChange = (event) => {
    const selectedStatusValue = event.target.value;
    setSelectedStatus(selectedStatusValue);
    applyFilters(
      selectedDepartment,
      searchTerm,
      selectedStatusValue,
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
      selectedStatus,
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
      selectedStatus,
      selectedMonth,
      selectedYearValue,
    );
  };

  // HANDLE SEARCH IN DEPARTMENT AND SEARCH BUTTON
  const handleSearchChange = (event) => {
    const term = event.target.value;
    setSearchTerm(term);

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // If search term is empty, immediately reload all data
    if (!term.trim()) {
      fetchPayrollData();
      applyFilters(
        selectedDepartment,
        '',
        selectedStatus,
        selectedMonth,
        selectedYear,
      );
      return;
    }

    // Set a new timeout for debounced search (500ms delay)
    const newTimeout = setTimeout(() => {
      console.log('Performing debounced search for:', term);
      fetchPayrollData(term);
    }, 500); // 500ms delay - adjust this value if needed

    setSearchTimeout(newTimeout);
  };

  const applyFilters = (department, search, status, month, year) => {
    const filtered = getFilteredRows(data, department, status, month, year);
    setFilteredData(filtered);
    setSummaryData(computeSummaryForRows(filtered));
    setPage(0);
  };

  const handleSubmitPayroll = async () => {
    try {
      // Step 1: Recalculate all payroll values
      const updatedData = filteredData.map((item) => {
        const calculatedItem = calculatePayroll(item) || item;

        return {
          ...calculatedItem,
          totalGsisDeds: (parseFloat(calculatedItem.totalGsisDeds) || 0).toFixed(2),
          totalPagibigDeds: (parseFloat(calculatedItem.totalPagibigDeds) || 0).toFixed(2),
          totalOtherDeds: (parseFloat(calculatedItem.totalOtherDeds) || 0).toFixed(2),
          grossSalary: (parseFloat(calculatedItem.grossSalary) || 0).toFixed(2),
          abs: (parseFloat(calculatedItem.abs) || 0).toFixed(2),
          netSalary: (parseFloat(calculatedItem.netSalary) || 0).toFixed(2),
          totalDeductions: (parseFloat(calculatedItem.totalDeductions) || 0).toFixed(2),
          PhilHealthContribution: (parseFloat(calculatedItem.PhilHealthContribution) || 0).toFixed(2),
          personalLifeRetIns: (parseFloat(calculatedItem.personalLifeRetIns) || 0).toFixed(2),
          pay1stCompute: (parseFloat(calculatedItem.pay1stCompute) || 0).toFixed(2),
          pay2ndCompute: (parseFloat(calculatedItem.pay2ndCompute) || 0).toFixed(2),
          pay1st: (parseFloat(calculatedItem.pay1st) || 0).toFixed(0),
          pay2nd: (parseFloat(calculatedItem.pay2nd) || 0).toFixed(2),
          rtIns: (parseFloat(calculatedItem.rtIns) || 0).toFixed(2),
          status: 'Processed',
        };
      });

      // Helper functions
      const toInt = (v) => {
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : 0;
      };

      const toSecondsFromHMS = (h, m, s) =>
        toInt(h) * 3600 + toInt(m) * 60 + toInt(s);

      const secondsToHMS = (totalSeconds) => {
        const sec = Math.max(0, totalSeconds);
        const hh = Math.floor(sec / 3600);
        const mm = Math.floor((sec % 3600) / 60);
        const ss = sec % 60;
        const pad = (n) => String(n).padStart(2, '0');

        return {
          h: hh,
          m: mm,
          s: ss,
          text: `${pad(hh)}:${pad(mm)}:${pad(ss)}`,
        };
      };

      const computeVLTimeOffset = (item) => {
        const tevl = toInt(item.tevl) + 10
        const tevlSeconds = toInt(tevl) * 3600;
        const tardySeconds = toSecondsFromHMS(item.h, item.m, item.s);

        const dvltSeconds = Math.min(tevlSeconds, tardySeconds);
        const vlbSeconds = tevlSeconds - dvltSeconds;

        return {
          dvlt: secondsToHMS(dvltSeconds).text,
          vlb: secondsToHMS(vlbSeconds).text,
        };
      };

      // Step 2: Filter selected & not finalized
      const rowsToSubmit = updatedData.filter(
        (item) =>
          selectedRows.includes(item.employeeNumber) &&
          !finalizedPayroll.some(
            (fp) =>
              fp.employeeNumber === item.employeeNumber &&
              fp.startDate === item.startDate &&
              fp.endDate === item.endDate,
          ),
      );

      // Step 3: Prepare clean payload (DO NOT MODIFY h,m,s)
      const processedRowsToSubmit = rowsToSubmit.map((item) => {
        const { dvlt, vlb } = computeVLTimeOffset(item);

        return {
          ...item,

          // KEEP ORIGINAL TIME
          h: toInt(item.h),
          m: toInt(item.m),
          s: toInt(item.s),

          tevl: toInt(item.tevl) + 10,
          dvlt,
          vlb,
          grossSalary: parseFloat(item.grossSalary) || 0,
          abs: parseFloat(item.abs) || 0,
          netSalary: parseFloat(item.netSalary) || 0,
          withholdingTax: parseFloat(item.withholdingTax) || 0,
          personalLifeRetIns: parseFloat(item.personalLifeRetIns) || 0,
          totalGsisDeds: parseFloat(item.totalGsisDeds) || 0,
          totalPagibigDeds: parseFloat(item.totalPagibigDeds) || 0,
          totalOtherDeds: parseFloat(item.totalOtherDeds) || 0,
          totalDeductions: parseFloat(item.totalDeductions) || 0,
          pay1st: parseFloat(item.pay1st) || 0,
          pay2nd: parseFloat(item.pay2nd) || 0,
          pay1stCompute: parseFloat(item.pay1stCompute) || 0,
          pay2ndCompute: parseFloat(item.pay2ndCompute) || 0,
          rtIns: parseFloat(item.rtIns) || 0,
          ec: parseFloat(item.ec) || 0,
          rateNbc584: parseFloat(item.rateNbc584) || 0,
          nbc594: parseFloat(item.nbc594) || 0,
          rateNbc594: parseFloat(item.rateNbc594) || 0,
          nbcDiffl597: parseFloat(item.nbcDiffl597) || 0,
          increment: parseFloat(item.increment) || 0,
          gsisSalaryLoan: parseFloat(item.gsisSalaryLoan) || 0,
          gsisPolicyLoan: parseFloat(item.gsisPolicyLoan) || 0,
          gsisArrears: parseFloat(item.gsisArrears) || 0,
          cpl: parseFloat(item.cpl) || 0,
          mpl: parseFloat(item.mpl) || 0,
          eal: parseFloat(item.eal) || 0,
          mplLite: parseFloat(item.mplLite) || 0,
          emergencyLoan: parseFloat(item.emergencyLoan) || 0,
          pagibigFundCont: parseFloat(item.pagibigFundCont) || 0,
          pagibig2: parseFloat(item.pagibig2) || 0,
          multiPurpLoan: parseFloat(item.multiPurpLoan) || 0,
          liquidatingCash: parseFloat(item.liquidatingCash) || 0,
          landbankSalaryLoan: parseFloat(item.landbankSalaryLoan) || 0,
          earistCreditCoop: parseFloat(item.earistCreditCoop) || 0,
          feu: parseFloat(item.feu) || 0,
          PhilHealthContribution: parseFloat(item.PhilHealthContribution) || 0,
        };
      });

      if (processedRowsToSubmit.length === 0) {
        alert('No payroll records selected for submission.');
        return;
      }

      // Step 4: Update payroll-with-remittance
      for (const item of updatedData) {
        await axios.put(
          `${API_BASE_URL}/PayrollRoute/payroll-with-remittance/${item.employeeNumber}/${item.startDate}/${item.endDate}`,
          item,
          getAuthHeaders(),
        );
      }

      // Step 5: Send to finalized payroll
      await axios.post(
        `${API_BASE_URL}/PayrollRoute/finalized-payroll`,
        processedRowsToSubmit,
        getAuthHeaders(),
      );

    } catch (error) {
      console.error('Error submitting payroll:', error);
      alert(
        error.response?.data?.error ||
          error.message ||
          'An error occurred while submitting payroll.',
      );
    }
  };  

  const handleDelete = async (rowId, employeeNumber) => {
    try {
      await axios.delete(
        `${API_BASE_URL}/PayrollRoute/payroll-with-remittance/${rowId}/${employeeNumber}`,
        getAuthHeaders(),
      );
      const newData = filteredData.filter((item) => item.id !== rowId);
      setFilteredData(newData);

      // Recalculate duplicates by composite key: Name, EmployeeNumber, Start Date, End Date
      const seen = new Map();
      const updatedDuplicates = new Set();

      newData.forEach((item) => {
        const compositeKey = `${item.name}|${item.employeeNumber}|${item.startDate}|${item.endDate}`;
        if (seen.has(compositeKey)) {
          updatedDuplicates.add(compositeKey);
        } else {
          seen.set(compositeKey, item);
        }
      });

      setDuplicateEmployeeNumbers([...updatedDuplicates]);
    } catch (error) {
      console.error('Error deleting payroll data:', error);
    }
  };

  // Handle modal open and close
  const handleModalChange = (e) => {
    const { name, value } = e.target;
    setEditRow((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCancel = () => {
    setOpenModal(false);
    setEditRow(null); // Clear the modal data on cancel
  };

  const handleEdit = (rowId) => {
    const row = computedRows.find((item) => item.id === rowId);
    setEditRow(row);
    setOpenModal(true);
  };

  // THIS IS FOR THE MODAL AND IT RECALCULATES THE VALUE DATA
  const handleSave = async () => {
    setLoading(true);
    try {
      // Ensure remittance fields have fallback values
      const normalizedEditRow = {
        ...editRow,
        h: editRow.h ?? 0,
        m: editRow.m ?? 0,
        increment: editRow.increment ?? 0,
        gsisSalaryLoan: editRow.gsisSalaryLoan ?? 0,
        gsisPolicyLoan: editRow.gsisPolicyLoan ?? 0,
        gsisArrears: editRow.gsisArrears ?? 0,
        cpl: editRow.cpl ?? 0,
        mpl: editRow.mpl ?? 0,
        eal: editRow.eal ?? 0,
        mplLite: editRow.mplLite ?? 0,
        emergencyLoan: editRow.emergencyLoan ?? 0,
        pagibigFundCont: editRow.pagibigFundCont ?? 0,
        pagibig2: editRow.pagibig2 ?? 0,
        multiPurpLoan: editRow.multiPurpLoan ?? 0,
        liquidatingCash: editRow.liquidatingCash ?? 0,
        landbankSalaryLoan: editRow.landbankSalaryLoan ?? 0,
        earistCreditCoop: editRow.earistCreditCoop ?? 0,
        feu: editRow.feu ?? 0,
        withholdingTax: editRow.withholdingTax ?? 0,
        rateNbc594: editRow.rateNbc594 ?? 0,
        nbcDiffl597: editRow.nbcDiffl597 ?? 0,
        ec: editRow.ec ?? 0,
      };

      // Calculate all fields using formulas
      const calculatedRow =
        calculatePayroll(normalizedEditRow) || normalizedEditRow;

      const updatedRow = {
        ...calculatedRow,
        id: editRow.id, // Include the unique ID
        // Ensure all values are numbers (not formatted strings)
        h: parseInt(calculatedRow.h) || 0,
        m: parseInt(calculatedRow.m) || 0,
        grossSalary: parseFloat(calculatedRow.grossSalary) || 0,
        abs: parseFloat(calculatedRow.abs) || 0,
        PhilHealthContribution:
          parseFloat(calculatedRow.PhilHealthContribution) || 0,
        personalLifeRetIns: parseFloat(calculatedRow.personalLifeRetIns) || 0,
        netSalary: parseFloat(calculatedRow.netSalary) || 0,
        totalGsisDeds: parseFloat(calculatedRow.totalGsisDeds) || 0,
        totalPagibigDeds: parseFloat(calculatedRow.totalPagibigDeds) || 0,
        totalOtherDeds: parseFloat(calculatedRow.totalOtherDeds) || 0,
        totalDeductions: parseFloat(calculatedRow.totalDeductions) || 0,
        pay1st: parseFloat(calculatedRow.pay1st) || 0,
        pay2nd: parseFloat(calculatedRow.pay2nd) || 0,
        pay1stCompute: parseFloat(calculatedRow.pay1stCompute) || 0,
        pay2ndCompute: parseFloat(calculatedRow.pay2ndCompute) || 0,
        rtIns: parseFloat(calculatedRow.rtIns) || 0,
      };

      const response = await axios.put(
        `${API_BASE_URL}/PayrollRoute/payroll-with-remittance/${editRow.employeeNumber}/${editRow.startDate}/${editRow.endDate}`,
        updatedRow,
        getAuthHeaders(),
      );

      console.log('Payroll record updated successfully:', response.data);
      setOpenModal(false);

      // Recalculate the updated row using formulas before updating state
      const recalculatedRow = calculatePayroll(updatedRow) || updatedRow;

      setFilteredData((prevData) =>
        prevData.map((item) =>
          item.id === updatedRow.id ? { ...item, ...recalculatedRow } : item,
        ),
      );

      // Also update the main data array
      setData((prevData) =>
        prevData.map((item) =>
          item.id === updatedRow.id ? { ...item, ...recalculatedRow } : item,
        ),
      );

      // Show loading for 2-3 seconds, then success overlay
      setTimeout(() => {
        setLoading(false);
        setSuccessAction('edit');
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2500);
      }, 1000);
    } catch (error) {
      console.error('Error updating payroll:', error);
      setLoading(false);
      setError('Failed to update payroll data.');
    }
  };

  const employeeFields = [
    'employeeNumber',
    'name',
    'position',
    'department',
    'startDate',
    'endDate',
  ];

  const salaryRateandAdjustments = [
    'rateNbc584',
    'nbc594',
    'rateNbc594',
    'nbcDiffl597',
    'increment',
  ];
  
  const SalaryComputation = ['tevl', 'abs', 'h', 'm'];
  
  const MandatoryDeductions = [
    'withholdingTax',
    'totalGsisDeds',
    'totalPagibigDeds',
    'PhilHealthContribution',
    'totalOtherDeds',
    'totalDeductions',
  ];

  const PayrollDisbursement = ['pay1st', 'pay2nd', 'ec'];

  const GsisDeductions = [
    'personalLifeRetIns',
    'gsisSalaryLoan',
    'gsisPolicyLoan',
    'gsisArrears',
    'mpl',
    'eal',
    'cpl',
    'mplLite',
    'emergencyLoan',
  ];

  const PagIbigDeductions = ['pagibigFundCont', 'multiPurpLoan', 'pagibig2'];

  const totalOtherDeductions = [
    'liquidatingCash',
    'earistCreditCoop',
    'feu',
    'landbankSalaryLoan',
  ];

  // COMPUTATION: Use formula-based calculation
  // Data is already calculated in fetchPayrollData, but we format it here for display
  const computedRows = filteredData.map((item) => {
    // Ensure item is recalculated using formulas (in case filters changed data)
    const calculatedItem = calculatePayroll(item) || item;

    // Format numeric values for display
    return {
      ...calculatedItem,
      h: calculatedItem.h || 0,
      m: calculatedItem.m || 0,
      totalGsisDeds: (
        parseFloat(calculatedItem.totalGsisDeds) || 0
      ).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      totalPagibigDeds: (
        parseFloat(calculatedItem.totalPagibigDeds) || 0
      ).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      totalOtherDeds: (
        parseFloat(calculatedItem.totalOtherDeds) || 0
      ).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      grossSalary: (parseFloat(calculatedItem.grossSalary) || 0).toLocaleString(
        'en-US',
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
      ),
      tevl: (parseFloat(calculatedItem.tevl) || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),

      abs: (parseFloat(calculatedItem.abs) || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      netSalary: (parseFloat(calculatedItem.netSalary) || 0).toLocaleString(
        'en-US',
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
      ),
      totalDeductions: (
        parseFloat(calculatedItem.totalDeductions) || 0
      ).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      PhilHealthContribution: (
        parseFloat(calculatedItem.PhilHealthContribution) || 0
      ).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      personalLifeRetIns: (
        parseFloat(calculatedItem.personalLifeRetIns) || 0
      ).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      pay1stCompute: (
        parseFloat(calculatedItem.pay1stCompute) || 0
      ).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      pay2ndCompute: (
        parseFloat(calculatedItem.pay2ndCompute) || 0
      ).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      pay1st: (parseFloat(calculatedItem.pay1st) || 0).toLocaleString('en-US', {
        maximumFractionDigits: 0,
      }),
      pay2nd: (parseFloat(calculatedItem.pay2nd) || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      rtIns: (parseFloat(calculatedItem.rtIns) || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    };
  });

  // Excel view helpers removed

  // Bulk Recalculate and Save All function
  const handleRecalculateAndSaveAll = async () => {
    if (filteredData.length === 0) {
      return;
    }

    setIsBulkSaving(true);
    setBulkSaveProgress({ current: 0, total: filteredData.length });
    setBulkSaveOpen(true);

    const successCount = { count: 0 };
    const errorCount = { count: 0 };
    const errors = [];

    try {
      // Process all filtered data
      for (let i = 0; i < filteredData.length; i++) {
        const item = filteredData[i];

        try {
          // Normalize data
          const normalizedItem = {
            ...item,
            h: item.h ?? 0,
            m: item.m ?? 0,
            increment: item.increment ?? 0,
            gsisSalaryLoan: item.gsisSalaryLoan ?? 0,
            gsisPolicyLoan: item.gsisPolicyLoan ?? 0,
            gsisArrears: item.gsisArrears ?? 0,
            cpl: item.cpl ?? 0,
            mpl: item.mpl ?? 0,
            eal: item.eal ?? 0,
            mplLite: item.mplLite ?? 0,
            emergencyLoan: item.emergencyLoan ?? 0,
            pagibigFundCont: item.pagibigFundCont ?? 0,
            pagibig2: item.pagibig2 ?? 0,
            multiPurpLoan: item.multiPurpLoan ?? 0,
            liquidatingCash: item.liquidatingCash ?? 0,
            landbankSalaryLoan: item.landbankSalaryLoan ?? 0,
            earistCreditCoop: item.earistCreditCoop ?? 0,
            feu: item.feu ?? 0,
            withholdingTax: item.withholdingTax ?? 0,
            rateNbc594: item.rateNbc594 ?? 0,
            nbcDiffl597: item.nbcDiffl597 ?? 0,
            ec: item.ec ?? 0,
          };

          // Calculate all fields using formulas
          const calculatedItem =
            calculatePayroll(normalizedItem) || normalizedItem;

          // Prepare data for database
          const updatedRow = {
            ...calculatedItem,
            id: item.id, // Include the unique ID
            h: parseInt(calculatedItem.h) || 0,
            m: parseInt(calculatedItem.m) || 0,
            grossSalary: parseFloat(calculatedItem.grossSalary) || 0,
            abs: parseFloat(calculatedItem.abs) || 0,
            PhilHealthContribution:
              parseFloat(calculatedItem.PhilHealthContribution) || 0,
            personalLifeRetIns:
              parseFloat(calculatedItem.personalLifeRetIns) || 0,
            netSalary: parseFloat(calculatedItem.netSalary) || 0,
            totalGsisDeds: parseFloat(calculatedItem.totalGsisDeds) || 0,
            totalPagibigDeds: parseFloat(calculatedItem.totalPagibigDeds) || 0,
            totalOtherDeds: parseFloat(calculatedItem.totalOtherDeds) || 0,
            totalDeductions: parseFloat(calculatedItem.totalDeductions) || 0,
            pay1st: parseFloat(calculatedItem.pay1st) || 0,
            pay2nd: parseFloat(calculatedItem.pay2nd) || 0,
            pay1stCompute: parseFloat(calculatedItem.pay1stCompute) || 0,
            pay2ndCompute: parseFloat(calculatedItem.pay2ndCompute) || 0,
            rtIns: parseFloat(calculatedItem.rtIns) || 0,
            withholdingTax: parseFloat(calculatedItem.withholdingTax) || 0,
            ec: parseFloat(calculatedItem.ec) || 0,
            rateNbc594: parseFloat(calculatedItem.rateNbc594) || 0,
            nbcDiffl597: parseFloat(calculatedItem.nbcDiffl597) || 0,
            increment: parseFloat(calculatedItem.increment) || 0,
          };

          // Update database
          if (item.startDate && item.endDate) {
            await axios.put(
              `${API_BASE_URL}/PayrollRoute/payroll-with-remittance/${item.employeeNumber}/${item.startDate}/${item.endDate}`,
              updatedRow,
              getAuthHeaders(),
            );
          } else {
            console.warn(
              'Skipping update: missing startDate/endDate for',
              item.employeeNumber,
            );
          }

          successCount.count++;
          setBulkSaveProgress({ current: i + 1, total: filteredData.length });
        } catch (error) {
          console.error(`Error saving ${item.employeeNumber}:`, error);
          errorCount.count++;
          errors.push(
            `${item.name} (${item.employeeNumber}): ${error.response?.data?.error || error.message}`,
          );
        }
      }

      // Refresh data from database
      await fetchPayrollData();

      setSuccessAction('bulkSave');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2500);
    } catch (error) {
      console.error('Bulk save error:', error);
    } finally {
      setIsBulkSaving(false);
      setTimeout(() => setBulkSaveOpen(false), 1000);
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
  if (!accessLoading && hasAccess !== true) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Payroll Processing. Contact your administrator to request access."
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
                        Payroll Processing
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          opacity: 0.8,
                          fontWeight: 400,
                          color: textPrimaryColor,
                        }}
                      >
                        Manage and process employee payroll records
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

                {/* Excel View removed */}
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
        {duplicateEmployeeNumbers.length > 0 && (
          <Fade in timeout={300}>
            <Alert
              severity="warning"
              sx={{
                mb: 3,
                borderRadius: 3,
                '& .MuiAlert-message': { fontWeight: 500 },
              }}
              icon={<Warning />}
            >
              Duplicate record(s) found:{' '}
              {duplicateEmployeeNumbers
                .map((key) => {
                  const [name, empNum, startDate, endDate] = key.split('|');
                  return `${name} (${empNum}) [${startDate} - ${endDate}]`;
                })
                .join(', ')}
            </Alert>
          </Fade>
        )}

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
                  Employee Payroll Data
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

            {/* Table with Fixed Actions Column */}
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
                    boxShadow: `0 4px 24px ${alpha(accentColor, 0.06)}`,
                    border: `1px solid ${alpha(accentColor, 0.08)}`,
                    overflowX: 'auto',
                    overflowY: 'visible',
                    width: 'max-content',
                    minWidth: '100%',
                  }}
                >
                  <Table sx={{ minWidth: 'max-content', tableLayout: 'auto' }}>
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
                            indeterminate={
                              selectedRows.length > 0 &&
                              selectedRows.length <
                                computedRows.filter(
                                  (row) =>
                                    !finalizedPayroll.some(
                                      (fp) =>
                                        fp.employeeNumber ===
                                          row.employeeNumber &&
                                        fp.startDate === row.startDate &&
                                        fp.endDate === row.endDate,
                                    ),
                                ).length
                            }
                            checked={
                              selectedRows.length ===
                              computedRows.filter(
                                (row) =>
                                  !finalizedPayroll.some(
                                    (fp) =>
                                      fp.employeeNumber ===
                                        row.employeeNumber &&
                                      fp.startDate === row.startDate &&
                                      fp.endDate === row.endDate,
                                  ),
                              ).length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRows(
                                  computedRows
                                    .filter(
                                      (row) =>
                                        !finalizedPayroll.some(
                                          (fp) =>
                                            fp.employeeNumber ===
                                              row.employeeNumber &&
                                            fp.startDate === row.startDate &&
                                            fp.endDate === row.endDate,
                                        ),
                                    )
                                    .map((row) => row.employeeNumber),
                                );
                              } else {
                                setSelectedRows([]);
                              }
                            }}
                          />
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
                          View
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
                          <Tooltip title="Total Earned Vacation Leave" arrow>
                            <b>TEVL</b>
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
                          Net Salary
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
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {filteredData.length > 0 ? (
                        computedRows
                          .slice(
                            page * rowsPerPage,
                            page * rowsPerPage + rowsPerPage,
                          )
                          .map((row, index) => {
                            const isFinalized = finalizedPayroll.some(
                              (fp) =>
                                fp.employeeNumber === row.employeeNumber &&
                                fp.startDate === row.startDate &&
                                fp.endDate === row.endDate,
                            );

                            return (
                              <TableRow
                                key={
                                  row.id ??
                                  `${row.employeeNumber}-${row.startDate}-${row.endDate}`
                                }
                                sx={{
                                  '&:nth-of-type(even)': {
                                    bgcolor: alpha(primaryColor, 0.3),
                                  },
                                  '&:hover': {
                                    backgroundColor:
                                      alpha(accentColor, 0.05) + ' !important',
                                  },
                                  backgroundColor:
                                    duplicateEmployeeNumbers.includes(
                                      `${row.name}|${row.employeeNumber}|${row.startDate}|${row.endDate}`,
                                    )
                                      ? 'rgba(255, 0, 0, 0.1)'
                                      : 'inherit',
                                  transition: 'all 0.2s ease',
                                }}
                              >
                                <PremiumTableCell padding="checkbox">
                                  <Checkbox
                                    checked={selectedRows.includes(
                                      row.employeeNumber,
                                    )}
                                    onChange={() => {
                                      if (
                                        selectedRows.includes(
                                          row.employeeNumber,
                                        )
                                      ) {
                                        setSelectedRows((prev) =>
                                          prev.filter(
                                            (id) => id !== row.employeeNumber,
                                          ),
                                        );
                                      } else {
                                        setSelectedRows((prev) => [
                                          ...prev,
                                          row.employeeNumber,
                                        ]);
                                      }
                                    }}
                                    disabled={isRowProcessed(row)}
                                  />
                                </PremiumTableCell>

                                <ExcelTableCell>
                                  {page * rowsPerPage + index + 1}
                                </ExcelTableCell>
                                <ExcelTableCell>
                                  <Button
                                    onClick={() => handleView(row.id)}
                                    variant="contained"
                                    size="small"
                                    sx={{
                                      bgcolor: '#ffffff',
                                      color: '#FFFFFF',
                                      minWidth: '80px',
                                      border: `1px solid ${accentColor}`,
                                      width: '32px',
                                      height: '32px',
                                      padding: 0,
                                      '&:hover': {
                                        bgcolor: accentColor,
                                        color: textSecondaryColor,
                                      },
                                    }}
                                    title="View Record"
                                  >
                                    <Visibility fontSize="small" />
                                    View
                                  </Button>
                                </ExcelTableCell>
                                <ExcelTableCell>
                                  {row.department}
                                </ExcelTableCell>
                                <ExcelTableCell>
                                  {row.employeeNumber}
                                </ExcelTableCell>
                                <ExcelTableCell>{row.startDate}</ExcelTableCell>
                                <ExcelTableCell>{row.endDate}</ExcelTableCell>
                                <ExcelTableCell>{row.name}</ExcelTableCell>
                                <ExcelTableCell>{row.position}</ExcelTableCell>

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
                                    ? Number(row.nbcDiffl597).toLocaleString(
                                        'en-US',
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        },
                                      )
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
                                  {row.grossSalary}
                                </ExcelTableCell>
                                <ExcelTableCell>
                                  <b>{row.tevl}</b>
                                </ExcelTableCell>

                                <ExcelTableCell>
                                  <b>{row.abs}</b>
                                </ExcelTableCell>
                                <ExcelTableCell>{row.h}</ExcelTableCell>
                                <ExcelTableCell>{row.m}</ExcelTableCell>
                                <ExcelTableCell>{row.netSalary}</ExcelTableCell>
                                <ExcelTableCell>
                                  {row.withholdingTax}
                                </ExcelTableCell>
                                <ExcelTableCell>
                                  {row.totalGsisDeds}
                                </ExcelTableCell>
                                <ExcelTableCell>
                                  {row.totalPagibigDeds}
                                </ExcelTableCell>
                                <ExcelTableCell>
                                  {row.PhilHealthContribution}
                                </ExcelTableCell>
                                <ExcelTableCell>
                                  {row.totalOtherDeds}
                                </ExcelTableCell>
                                <ExcelTableCell>
                                  {row.totalDeductions}
                                </ExcelTableCell>
                                <ExcelTableCell
                                  sx={{ color: 'red', fontWeight: 'bold' }}
                                >
                                  {row.pay1st}
                                </ExcelTableCell>
                                <ExcelTableCell
                                  sx={{ color: 'red', fontWeight: 'bold' }}
                                >
                                  {row.pay2nd}
                                </ExcelTableCell>
                                <ExcelTableCell>{index + 1}</ExcelTableCell>
                                <ExcelTableCell>{row.rtIns}</ExcelTableCell>
                                <ExcelTableCell>{row.ec}</ExcelTableCell>
                                <ExcelTableCell>
                                  {row.PhilHealthContribution}
                                </ExcelTableCell>
                                <ExcelTableCell>
                                  {row.pagibigFundCont}
                                </ExcelTableCell>
                                <ExcelTableCell
                                  sx={{
                                    borderLeft: '2px solid black',
                                    color: 'red',
                                    fontWeight: 'bold',
                                  }}
                                >
                                  {row.pay1stCompute}
                                </ExcelTableCell>
                                <ExcelTableCell
                                  sx={{ color: 'red', fontWeight: 'bold' }}
                                >
                                  {row.pay2ndCompute}
                                </ExcelTableCell>
                                <ExcelTableCell
                                  sx={{ borderLeft: '2px solid black' }}
                                >
                                  {index + 1}
                                </ExcelTableCell>
                                <ExcelTableCell>{row.name}</ExcelTableCell>
                                <ExcelTableCell>{row.position}</ExcelTableCell>
                                <ExcelTableCell>
                                  {row.withholdingTax
                                    ? Number(row.withholdingTax).toLocaleString(
                                        'en-US',
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        },
                                      )
                                    : ''}
                                </ExcelTableCell>
                                <ExcelTableCell>
                                  {row.personalLifeRetIns}
                                </ExcelTableCell>
                                <ExcelTableCell>
                                  {row.gsisSalaryLoan
                                    ? Number(row.gsisSalaryLoan).toLocaleString(
                                        'en-US',
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        },
                                      )
                                    : ''}
                                </ExcelTableCell>
                                <ExcelTableCell>
                                  {row.gsisPolicyLoan
                                    ? Number(row.gsisPolicyLoan).toLocaleString(
                                        'en-US',
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        },
                                      )
                                    : ''}
                                </ExcelTableCell>
                                <ExcelTableCell>
                                  {row.gsisArrears
                                    ? Number(row.gsisArrears).toLocaleString(
                                        'en-US',
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        },
                                      )
                                    : ''}
                                </ExcelTableCell>
                                <ExcelTableCell>
                                  {row.cpl
                                    ? Number(row.cpl).toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })
                                    : ''}
                                </ExcelTableCell>
                                <ExcelTableCell>
                                  {row.mpl
                                    ? Number(row.mpl).toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })
                                    : ''}
                                </ExcelTableCell>
                                <ExcelTableCell>
                                  {row.eal
                                    ? Number(row.eal).toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })
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
                                    ? Number(row.emergencyLoan).toLocaleString(
                                        'en-US',
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        },
                                      )
                                    : ''}
                                </ExcelTableCell>
                                <ExcelTableCell>
                                  {row.totalGsisDeds}
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
                                    ? Number(row.multiPurpLoan).toLocaleString(
                                        'en-US',
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        },
                                      )
                                    : ''}
                                </ExcelTableCell>
                                <ExcelTableCell>
                                  {row.totalPagibigDeds}
                                </ExcelTableCell>
                                <ExcelTableCell>
                                  {row.PhilHealthContribution}
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
                                    ? Number(row.feu).toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })
                                    : ''}
                                </ExcelTableCell>
                                <ExcelTableCell>
                                  {row.totalOtherDeds}
                                </ExcelTableCell>
                                <ExcelTableCell>
                                  {row.totalDeductions}
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
                                No payroll records available. Try adjusting your
                                filters.
                              </Typography>
                            </Box>
                          </PremiumTableCell>
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
                          padding: '8px',
                          position: 'sticky',
                          paddingTop: 3.5,
                          paddingBottom: 3.5,
                          zIndex: 2,
                          color: textPrimaryColor,
                        }}
                      >
                        Status
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredData.length > 0 ? (
                      computedRows
                        .slice(
                          page * rowsPerPage,
                          page * rowsPerPage + rowsPerPage,
                        )
                        .map((row, index) => {
                          const isFinalized = finalizedPayroll.some(
                            (fp) =>
                              fp.employeeNumber === row.employeeNumber &&
                              fp.startDate === row.startDate &&
                              fp.endDate === row.endDate,
                          );

                          return (
                            <TableRow
                              key={
                                row.id
                                  ? `status-${row.id}`
                                  : `status-${row.employeeNumber}-${row.startDate}-${row.endDate}`
                              }
                              sx={{
                                '&:nth-of-type(even)': {
                                  bgcolor: alpha(primaryColor, 0.3),
                                },
                                '&:hover': {
                                  backgroundColor:
                                    alpha(accentColor, 0.05) + ' !important',
                                },
                                backgroundColor:
                                  duplicateEmployeeNumbers.includes(
                                    `${row.name}|${row.employeeNumber}|${row.startDate}|${row.endDate}`,
                                  )
                                    ? 'rgba(255, 0, 0, 0.1)'
                                    : 'inherit',
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
                                  pt: 3.4,
                                  pb: 3.4,
                                }}
                              >
                                <Chip
                                  label={row.status}
                                  size="small"
                                  sx={{
                                    fontWeight: 'bold',
                                    backgroundColor:
                                      row.status === 'Processed'
                                        ? '#4caf50'
                                        : '#ff9800',
                                    color: 'white',
                                    '&:hover': {
                                      backgroundColor:
                                        row.status === 'Processed'
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
                            padding: '8px',
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
                    {filteredData.length > 0 ? (
                      computedRows
                        .slice(
                          page * rowsPerPage,
                          page * rowsPerPage + rowsPerPage,
                        )
                        .map((row, index) => {
                          const isFinalized = finalizedPayroll.some(
                            (fp) =>
                              fp.employeeNumber === row.employeeNumber &&
                              fp.startDate === row.startDate &&
                              fp.endDate === row.endDate,
                          );

                          return (
                            <TableRow
                              key={
                                row.id
                                  ? `actions-${row.id}`
                                  : `actions-${row.employeeNumber}-${row.startDate}-${row.endDate}`
                              }
                              sx={{
                                '&:nth-of-type(even)': {
                                  bgcolor: alpha(primaryColor, 0.3),
                                },
                                '&:hover': {
                                  backgroundColor:
                                    alpha(accentColor, 0.05) + ' !important',
                                },
                                backgroundColor:
                                  duplicateEmployeeNumbers.includes(
                                    `${row.name}|${row.employeeNumber}|${row.startDate}|${row.endDate}`,
                                  )
                                    ? 'rgba(255, 0, 0, 0.1)'
                                    : 'inherit',
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
                                  <Tooltip title="Edit Record">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleEdit(row.id)}
                                      disabled={isRowProcessed(row)}
                                      sx={{
                                        color: isFinalized
                                          ? '#ccc'
                                          : accentColor,
                                        backgroundColor: isFinalized
                                          ? '#f5f5f5'
                                          : 'white',
                                        border: `1px solid ${accentColor}`,
                                        '&:hover': {
                                          backgroundColor: isFinalized
                                            ? '#f5f5f5'
                                            : alpha(accentColor, 0.1),
                                        },
                                        padding: '4px',
                                      }}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete Record">
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        handleDelete(row.id, row.employeeNumber)
                                      }
                                      disabled={isRowProcessed(row)}
                                      sx={{
                                        color: isFinalized ? '#ccc' : '#d32f2f',
                                        backgroundColor: isFinalized
                                          ? '#f5f5f5'
                                          : 'white',
                                        border: '1px solid #d32f2f',
                                        '&:hover': {
                                          backgroundColor: isFinalized
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
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 2,
            mt: 3,
          }}
        >
          <Box sx={{ display: 'flex', gap: 2 }}>
            <ProfessionalButton
              variant="contained"
              onClick={handleRecalculateAndSaveAll}
              disabled={filteredData.length === 0 || isBulkSaving}
              size="large"
              sx={{
                backgroundColor: '#2e7d32',
                color: '#fff',
                '&:hover': { backgroundColor: '#1b5e20' },
                '&:disabled': {
                  backgroundColor: alpha('#2e7d32', 0.3),
                  color: alpha('#fff', 0.5),
                },
              }}
              startIcon={
                isBulkSaving ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <SaveIcon />
                )
              }
            >
              {isBulkSaving
                ? 'Saving...'
                : `Recalculate & Save All (${filteredData.length})`}
            </ProfessionalButton>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <ProfessionalButton
              variant="contained"
              onClick={() => setShowConfirmation(true)}
              disabled={!canSubmit}
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
              Export Payroll Records ({selectedRows.length})
            </ProfessionalButton>

            <ProfessionalButton
              variant="outlined"
              onClick={() => (window.location.href = '/payroll-processed')}
              size="large"
              sx={{
                borderColor: accentColor,
                color: textPrimaryColor,
                '&:hover': {
                  borderColor: accentDark,
                  backgroundColor: alpha(accentColor, 0.1),
                },
              }}
              startIcon={<CreditCard />}
            >
              View Processed Payroll
            </ProfessionalButton>
          </Box>
        </Box>

        {/* [All existing modals remain the same - Edit Modal, View Modal, Confirmation Modal] */}
        <Modal open={openModal} onClose={handleCancel}>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '95vw',
              maxWidth: 1600,
              height: '90vh',
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 24,
              display: 'flex',
              flexDirection: 'column',
              border: `3px solid ${accentColor}`,
            }}
          >
            {editRow && (
              <>
                {/* Header */}
                <Box
                  sx={{
                    p: 3,
                    background: `linear-gradient(135deg, ${settings.secondaryColor || accentColor} 0%, ${settings.deleteButtonHoverColor || accentDark} 100%)`,
                    color: settings.accentColor || textSecondaryColor,
                    borderRadius: '2px 2px 0 0',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    flexShrink: 0,
                  }}
                >
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    sx={{ color: settings.accentColor || textSecondaryColor }}
                  >
                    Edit Payroll Record - {editRow.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      opacity: 0.9,
                      mt: 0.5,
                      fontWeight: 'bold',
                      color: settings.accentColor || textSecondaryColor,
                    }}
                  >
                    Employee Number: {editRow.employeeNumber}
                  </Typography>
                </Box>

                {/* Main Content - Split View */}
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    overflow: 'hidden',
                  }}
                >
                  {/* LEFT SIDE - Original Values (Read-only) */}
                  <Box
                    sx={{
                      width: '50%',
                      p: 3,
                      overflowY: 'auto',
                      bgcolor: '#f8f8f8',
                      borderRight: `2px solid ${accentColor}`,
                      '&::-webkit-scrollbar': { width: '8px' },
                      '&::-webkit-scrollbar-track': { background: '#f1f1f1' },
                      '&::-webkit-scrollbar-thumb': {
                        background: '#888',
                        borderRadius: '4px',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 3,
                      }}
                    >
                      <Compare sx={{ color: accentColor }} />
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        sx={{ color: accentColor }}
                      >
                        Original Values
                      </Typography>
                    </Box>

                    {/* Employee Information */}
                    <Paper sx={{ p: 2, mb: 2, bgcolor: 'white' }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        gutterBottom
                        sx={{ color: accentColor }}
                      >
                        Employee Information
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Employee Number
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.employeeNumber}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Name
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.name}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Position
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.position}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Department
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.department}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Start Date
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.startDate}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            End Date
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.endDate}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>

                    {/* Salary Rate and Adjustments */}
                    <Paper sx={{ p: 2, mb: 2, bgcolor: 'white' }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        gutterBottom
                        sx={{ color: accentColor }}
                      >
                        Salary Rate and Adjustments
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Rate NBC 584
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.rateNbc584 || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            NBC 594
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.nbc594 || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Rate NBC 594
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight="500"
                            sx={{ color: accentColor }}
                          >
                            {editRow.rateNbc594 || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            NBC DIFF'L 597
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.nbcDiffl597 || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Increment
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.increment || '0.00'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>

                    {/* Absent Deductions */}
                    <Paper sx={{ p: 2, mb: 2, bgcolor: 'white' }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        gutterBottom
                        sx={{ color: accentColor }}
                      >
                        Absent Deductions & Leave
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <Tooltip title="Total Earned Vacation Leave" arrow>
                            <Typography variant="caption" color="text.secondary">
                              TEVL
                            </Typography>
                          </Tooltip>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.tevl || '0.00'}
                          </Typography>
                        </Grid>

                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">
                            ABS
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.abs || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">
                            Hours (H)
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.h || '0'}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">
                            Minutes (M)
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.m || '0'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>

                    {/* Payroll Disbursement */}
                    <Paper sx={{ p: 2, mb: 2, bgcolor: 'white' }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        gutterBottom
                        sx={{ color: accentColor }}
                      >
                        Payroll Disbursement
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">
                            1st Pay
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.pay1st || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">
                            2nd Pay
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.pay2nd || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">
                            EC
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.ec || '0.00'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>

                    {/* GSIS Deductions */}
                    <Paper sx={{ p: 2, mb: 2, bgcolor: 'white' }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        gutterBottom
                        sx={{ color: accentColor }}
                      >
                        GSIS Deductions
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Personal Life Ret Ins
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.personalLifeRetIns || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            GSIS Salary Loan
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.gsisSalaryLoan || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            GSIS Policy Loan
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.gsisPolicyLoan || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            GSIS Arrears
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.gsisArrears || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            MPL
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.mpl || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            EAL
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.eal || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            CPL
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.cpl || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            MPL Lite
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.mplLite || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Emergency Loan
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.emergencyLoan || '0.00'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>

                    {/* Pag-IBIG Deductions */}
                    <Paper sx={{ p: 2, mb: 2, bgcolor: 'white' }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        gutterBottom
                        sx={{ color: accentColor }}
                      >
                        Pag-IBIG Deductions
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Pag-ibig Fund Cont
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.pagibigFundCont || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Multi-Purpose Loan
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.multiPurpLoan || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Pag-ibig 2
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.pagibig2 || '0.00'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>

                    {/* Other Deductions */}
                    <Paper sx={{ p: 2, mb: 2, bgcolor: 'white' }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        gutterBottom
                        sx={{ color: accentColor }}
                      >
                        Other Deductions
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Liquidating Cash
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.liquidatingCash || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Earist Credit Coop
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.earistCreditCoop || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            FEU
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.feu || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            LandBank Salary Loan
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.landbankSalaryLoan || '0.00'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>

                    {/* Total Deductions */}
                    <Paper sx={{ p: 2, mb: 2, bgcolor: 'white' }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        gutterBottom
                        sx={{ color: accentColor }}
                      >
                        Total Contributions & Deductions
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Withholding Tax
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.withholdingTax || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Total GSIS Deds
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.totalGsisDeds || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Total Pag-ibig Deds
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.totalPagibigDeds || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            PhilHealth
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.PhilHealthContribution || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Total Other Deds
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {editRow.totalOtherDeds || '0.00'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Total Deductions
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                            sx={{ color: '#d32f2f' }}
                          >
                            {editRow.totalDeductions || '0.00'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Box>

                  {/* RIGHT SIDE - Editable Fields */}
                  <Box
                    sx={{
                      width: '50%',
                      p: 3,
                      overflowY: 'auto',
                      bgcolor: 'white',
                      '&::-webkit-scrollbar': { width: '8px' },
                      '&::-webkit-scrollbar-track': { background: '#f1f1f1' },
                      '&::-webkit-scrollbar-thumb': {
                        background: '#888',
                        borderRadius: '4px',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 3,
                      }}
                    >
                      <EditIcon sx={{ color: accentColor }} />
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        sx={{ color: accentColor }}
                      >
                        Edit Values
                      </Typography>
                    </Box>

                    {/* Employee Information - Editable */}
                    <Paper sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0' }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        gutterBottom
                        sx={{ color: accentColor }}
                      >
                        Employee Information
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Employee Number"
                            name="employeeNumber"
                            value={editRow.employeeNumber || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Name"
                            name="name"
                            value={editRow.name || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Position"
                            name="position"
                            value={editRow.position || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Department</InputLabel>
                            <Select
                              name="department"
                              value={editRow.department || ''}
                              onChange={handleModalChange}
                              label="Department"
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
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Start Date"
                            name="startDate"
                            value={editRow.startDate || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="End Date"
                            name="endDate"
                            value={editRow.endDate || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                      </Grid>
                    </Paper>

                    {/* Salary Rate and Adjustments - Editable */}
                    <Paper sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0' }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        gutterBottom
                        sx={{ color: accentColor }}
                      >
                        Salary Rate and Adjustments
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Rate NBC 584"
                            name="rateNbc584"
                            value={editRow.rateNbc584 || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="NBC 594"
                            name="nbc594"
                            value={editRow.nbc594 || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Rate NBC 594"
                            name="rateNbc594"
                            value={editRow.rateNbc594 || ''}
                            onChange={handleModalChange}
                            disabled
                            size="small"
                            sx={{
                              '& .MuiInputBase-input.Mui-disabled': {
                                WebkitTextFillColor: accentColor,
                                fontWeight: 'bold',
                              },
                            }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="NBC DIFF'L 597"
                            name="nbcDiffl597"
                            value={editRow.nbcDiffl597 || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Increment"
                            name="increment"
                            value={editRow.increment || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                      </Grid>
                    </Paper>

                    {/* Absent Deductions & Leave - Editable */}
                    <Paper sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0' }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        gutterBottom
                        sx={{ color: accentColor }}
                      >
                        Absent Deductions & Leave
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <Tooltip title="Total Earned Vacation Leave" arrow>
                            <TextField
                              fullWidth
                              label="TEVL"
                              name="tevl"
                              value={editRow.tevl || ''}
                              onChange={handleModalChange}
                              size="small"
                            />
                          </Tooltip>
                        </Grid>

                        <Grid item xs={4}>
                          <TextField
                            fullWidth
                            label="ABS"
                            name="abs"
                            value={editRow.abs || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={4}>
                          <TextField
                            fullWidth
                            label="Hours (H)"
                            name="h"
                            value={editRow.h || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={4}>
                          <TextField
                            fullWidth
                            label="Minutes (M)"
                            name="m"
                            value={editRow.m || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                      </Grid>
                    </Paper>

                    {/* Payroll Disbursement - Editable */}
                    <Paper sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0' }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        gutterBottom
                        sx={{ color: accentColor }}
                      >
                        Payroll Disbursement
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <TextField
                            fullWidth
                            label="1st Pay"
                            name="pay1st"
                            value={editRow.pay1st || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={4}>
                          <TextField
                            fullWidth
                            label="2nd Pay"
                            name="pay2nd"
                            value={editRow.pay2nd || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={4}>
                          <TextField
                            fullWidth
                            label="EC"
                            name="ec"
                            value={editRow.ec || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                      </Grid>
                    </Paper>

                    {/* GSIS Deductions - Editable */}
                    <Paper sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0' }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        gutterBottom
                        sx={{ color: accentColor }}
                      >
                        GSIS Deductions
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Personal Life Ret Ins"
                            name="personalLifeRetIns"
                            value={editRow.personalLifeRetIns || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="GSIS Salary Loan"
                            name="gsisSalaryLoan"
                            value={editRow.gsisSalaryLoan || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="GSIS Policy Loan"
                            name="gsisPolicyLoan"
                            value={editRow.gsisPolicyLoan || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="GSIS Arrears"
                            name="gsisArrears"
                            value={editRow.gsisArrears || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="MPL"
                            name="mpl"
                            value={editRow.mpl || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="EAL"
                            name="eal"
                            value={editRow.eal || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="CPL"
                            name="cpl"
                            value={editRow.cpl || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="MPL Lite"
                            name="mplLite"
                            value={editRow.mplLite || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Emergency Loan"
                            name="emergencyLoan"
                            value={editRow.emergencyLoan || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                      </Grid>
                    </Paper>

                    {/* Pag-IBIG Deductions - Editable */}
                    <Paper sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0' }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        gutterBottom
                        sx={{ color: accentColor }}
                      >
                        Pag-IBIG Deductions
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Pag-ibig Fund Cont"
                            name="pagibigFundCont"
                            value={editRow.pagibigFundCont || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Multi-Purpose Loan"
                            name="multiPurpLoan"
                            value={editRow.multiPurpLoan || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Pag-ibig 2"
                            name="pagibig2"
                            value={editRow.pagibig2 || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                      </Grid>
                    </Paper>

                    {/* Other Deductions - Editable */}
                    <Paper sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0' }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        gutterBottom
                        sx={{ color: accentColor }}
                      >
                        Other Deductions
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Liquidating Cash"
                            name="liquidatingCash"
                            value={editRow.liquidatingCash || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Earist Credit Coop"
                            name="earistCreditCoop"
                            value={editRow.earistCreditCoop || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="FEU"
                            name="feu"
                            value={editRow.feu || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="LandBank Salary Loan"
                            name="landbankSalaryLoan"
                            value={editRow.landbankSalaryLoan || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                      </Grid>
                    </Paper>

                    {/* Total Deductions - Editable */}
                    <Paper sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0' }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        gutterBottom
                        sx={{ color: accentColor }}
                      >
                        Total Contributions & Deductions
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Withholding Tax"
                            name="withholdingTax"
                            value={editRow.withholdingTax || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Total GSIS Deds"
                            name="totalGsisDeds"
                            value={editRow.totalGsisDeds || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Total Pag-ibig Deds"
                            name="totalPagibigDeds"
                            value={editRow.totalPagibigDeds || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="PhilHealth"
                            name="PhilHealthContribution"
                            value={editRow.PhilHealthContribution || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Total Other Deds"
                            name="totalOtherDeds"
                            value={editRow.totalOtherDeds || ''}
                            onChange={handleModalChange}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Total Deductions"
                            name="totalDeductions"
                            value={editRow.totalDeductions || ''}
                            onChange={handleModalChange}
                            size="small"
                            sx={{
                              '& .MuiInputBase-input': {
                                fontWeight: 'bold',
                                color: '#d32f2f',
                              },
                            }}
                          />
                        </Grid>
                      </Grid>
                    </Paper>
                  </Box>
                </Box>

                {/* Footer with Action Buttons */}
                <Box
                  sx={{
                    p: 2.5,
                    borderTop: '2px solid #e0e0e0',
                    bgcolor: '#f8f8f8',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    💡 Tip: Compare original values on the left with your edits
                    on the right
                  </Typography>
                  <Box display="flex" gap={2}>
                    <Button
                      variant="outlined"
                      onClick={handleCancel}
                      startIcon={<CancelIcon />}
                      sx={{
                        textTransform: 'none',
                        width: '120px',
                        borderColor: accentColor,
                        color: accentColor,
                        '&:hover': {
                          borderColor: accentColor,
                          bgcolor: alpha(accentColor, 0.04),
                        },
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleSave}
                      startIcon={<SaveIcon />}
                      sx={{
                        textTransform: 'none',
                        width: '120px',
                        backgroundColor: accentColor,
                        color: textSecondaryColor,
                        '&:hover': {
                          backgroundColor: accentDark,
                        },
                      }}
                    >
                      Save
                    </Button>
                  </Box>
                </Box>
              </>
            )}
          </Box>
        </Modal>

        {/*MODAL FOR THE VIEW*/}
        <Modal open={openViewModal} onClose={handleCloseView}>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '50vw',
              maxWidth: 1600,
              height: '90vh',
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 24,
              display: 'flex',
              flexDirection: 'column',
              border: `3px solid ${accentColor}`,
            }}
          >
            {viewRow && (
              <>
                {/* Header */}
                <Box
                  sx={{
                    p: 3,
                    bgcolor: accentColor,
                    color: 'white',
                    borderRadius: '2px 2px 0 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography variant="h5" fontWeight="bold">
                      View Payroll Record - {viewRow.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ opacity: 0.9, mt: 0.5, fontWeight: 'bold' }}
                    >
                      Employee Number: {viewRow.employeeNumber}
                    </Typography>
                  </Box>
                  <Button
                    onClick={handleCloseView}
                    sx={{
                      color: 'white',
                      minWidth: 'auto',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.1)',
                      },
                    }}
                  >
                    <Close />
                  </Button>
                </Box>

                {/* Main Content - Single Column View (Read-only) */}
                <Box
                  sx={{
                    flex: 1,
                    p: 3,
                    overflowY: 'auto',
                    bgcolor: '#f8f8f8',
                    '&::-webkit-scrollbar': { width: '8px' },
                    '&::-webkit-scrollbar-track': { background: '#f1f1f1' },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#888',
                      borderRadius: '4px',
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 3,
                    }}
                  >
                    <PeopleIcon sx={{ color: accentColor }} />
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      sx={{ color: accentColor }}
                    >
                      Employee Payroll Details
                    </Typography>
                  </Box>

                  {/* Employee Information */}
                  <Paper sx={{ p: 2, mb: 2, bgcolor: 'white' }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      gutterBottom
                      sx={{ color: accentColor }}
                    >
                      Employee Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Employee Number
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.employeeNumber}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Name
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.name}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Position
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.position}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Department
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.department}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Start Date
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.startDate}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          End Date
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.endDate}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Salary Rate and Adjustments */}
                  <Paper sx={{ p: 2, mb: 2, bgcolor: 'white' }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      gutterBottom
                      sx={{ color: accentColor }}
                    >
                      Salary Rate and Adjustments
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Rate NBC 584
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.rateNbc584
                            ? Number(viewRow.rateNbc584).toLocaleString(
                                'en-US',
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )
                            : '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          NBC 594
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.nbc594
                            ? Number(viewRow.nbc594).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Rate NBC 594
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          sx={{ color: '#2E7D32' }}
                        >
                          {viewRow.rateNbc594
                            ? Number(viewRow.rateNbc594).toLocaleString(
                                'en-US',
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )
                            : '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          NBC DIFF'L 597
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.nbcDiffl597
                            ? Number(viewRow.nbcDiffl597).toLocaleString(
                                'en-US',
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )
                            : '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Increment
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.increment
                            ? Number(viewRow.increment).toLocaleString(
                                'en-US',
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )
                            : '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Gross Salary
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          sx={{ color: '#2E7D32' }}
                        >
                          {viewRow.grossSalary}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Absent Deductions & Leave */}
                  <Paper sx={{ p: 2, mb: 2, bgcolor: 'white' }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      gutterBottom
                      sx={{ color: accentColor }}
                    >
                      Absent Deductions & Leave
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Tooltip title="Total Earned Vacation Leave" arrow>
                          <Typography variant="caption" color="text.secondary">
                            TEVL
                          </Typography>
                        </Tooltip>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.tevl || '0'}
                        </Typography>
                      </Grid>

                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          ABS
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.abs || '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Hours (H)
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.h || '0'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Minutes (M)
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.m || '0'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Net Salary
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          sx={{ color: '#2E7D32' }}
                        >
                          {viewRow.netSalary}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Payroll Disbursement */}
                  <Paper sx={{ p: 2, mb: 2, bgcolor: 'white' }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      gutterBottom
                      sx={{ color: accentColor }}
                    >
                      Payroll Disbursement
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={3}>
                        <Typography variant="caption" color="text.secondary">
                          1st Pay
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          sx={{ color: 'red' }}
                        >
                          {viewRow.pay1st || '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="caption" color="text.secondary">
                          2nd Pay
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          sx={{ color: 'red' }}
                        >
                          {viewRow.pay2nd || '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="caption" color="text.secondary">
                          EC
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.ec || '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="caption" color="text.secondary">
                          RT Ins.
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.rtIns || '0.00'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* GSIS Deductions */}
                  <Paper sx={{ p: 2, mb: 2, bgcolor: 'white' }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      gutterBottom
                      sx={{ color: accentColor }}
                    >
                      GSIS Deductions
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Personal Life Ret Ins
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.personalLifeRetIns || '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          GSIS Salary Loan
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.gsisSalaryLoan
                            ? Number(viewRow.gsisSalaryLoan).toLocaleString(
                                'en-US',
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )
                            : '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          GSIS Policy Loan
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.gsisPolicyLoan
                            ? Number(viewRow.gsisPolicyLoan).toLocaleString(
                                'en-US',
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )
                            : '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          GSIS Arrears
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.gsisArrears
                            ? Number(viewRow.gsisArrears).toLocaleString(
                                'en-US',
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )
                            : '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          MPL
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.mpl
                            ? Number(viewRow.mpl).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          EAL
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.eal
                            ? Number(viewRow.eal).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          CPL
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.cpl
                            ? Number(viewRow.cpl).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          MPL Lite
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.mplLite
                            ? Number(viewRow.mplLite).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Emergency Loan
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.emergencyLoan
                            ? Number(viewRow.emergencyLoan).toLocaleString(
                                'en-US',
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )
                            : '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Total GSIS Deductions
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          sx={{ color: '#d32f2f' }}
                        >
                          {viewRow.totalGsisDeds || '0.00'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Pag-IBIG Deductions */}
                  <Paper sx={{ p: 2, mb: 2, bgcolor: 'white' }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      gutterBottom
                      sx={{ color: accentColor }}
                    >
                      Pag-IBIG Deductions
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Pag-ibig Fund Cont
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.pagibigFundCont
                            ? Number(viewRow.pagibigFundCont).toLocaleString(
                                'en-US',
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )
                            : '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Multi-Purpose Loan
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.multiPurpLoan
                            ? Number(viewRow.multiPurpLoan).toLocaleString(
                                'en-US',
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )
                            : '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Pag-ibig 2
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.pagibig2
                            ? Number(viewRow.pagibig2).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Total Pag-ibig Deductions
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          sx={{ color: '#d32f2f' }}
                        >
                          {viewRow.totalPagibigDeds || '0.00'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Other Deductions */}
                  <Paper sx={{ p: 2, mb: 2, bgcolor: 'white' }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      gutterBottom
                      sx={{ color: accentColor }}
                    >
                      Other Deductions
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Liquidating Cash
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.liquidatingCash
                            ? Number(viewRow.liquidatingCash).toLocaleString(
                                'en-US',
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )
                            : '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Earist Credit Coop
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.earistCreditCoop
                            ? Number(viewRow.earistCreditCoop).toLocaleString(
                                'en-US',
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )
                            : '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          FEU
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.feu
                            ? Number(viewRow.feu).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          LandBank Salary Loan
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.landbankSalaryLoan
                            ? Number(viewRow.landbankSalaryLoan).toLocaleString(
                                'en-US',
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )
                            : '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Total Other Deductions
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          sx={{ color: '#d32f2f' }}
                        >
                          {viewRow.totalOtherDeds || '0.00'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Total Deductions Summary */}
                  <Paper
                    sx={{
                      p: 2,
                      mb: 2,
                      bgcolor: 'white',
                      border: '2px solid #2E7D32',
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      gutterBottom
                      sx={{ color: accentColor }}
                    >
                      Total Contributions & Deductions Summary
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Withholding Tax
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.withholdingTax
                            ? Number(viewRow.withholdingTax).toLocaleString(
                                'en-US',
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )
                            : '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          PhilHealth
                        </Typography>
                        <Typography variant="body2" fontWeight="500">
                          {viewRow.PhilHealthContribution || '0.00'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Total Deductions
                        </Typography>
                        <Typography
                          variant="body1"
                          fontWeight="bold"
                          sx={{ color: '#d32f2f', fontSize: '1.1rem' }}
                        >
                          {viewRow.totalDeductions || '0.00'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Status */}
                  <Paper sx={{ p: 2, mb: 2, bgcolor: 'white' }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      gutterBottom
                      sx={{ color: accentColor }}
                    >
                      Processing Status
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">
                          Status
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          sx={{
                            color:
                              viewRow.status === 'Processed'
                                ? 'green'
                                : 'orange',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          {viewRow.status === 'Processed' ? (
                            <CheckCircleIcon sx={{ fontSize: 20 }} />
                          ) : (
                            <PendingIcon sx={{ fontSize: 20 }} />
                          )}
                          {viewRow.status}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Box>

                {/* Footer with Close Button */}
                <Box
                  sx={{
                    p: 2.5,
                    borderTop: '2px solid #e0e0e0',
                    bgcolor: '#f8f8f8',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                  }}
                >
                  <Button
                    variant="contained"
                    onClick={handleCloseView}
                    startIcon={<Close />}
                    sx={{
                      textTransform: 'none',
                      width: '120px',
                      backgroundColor: '#6d2323',
                      color: textSecondaryColor,
                      '&:hover': {
                        backgroundColor: '#ffffff',
                        border: `1px solid ${accentColor}`,
                        color: accentColor,
                      },
                    }}
                  >
                    Close
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </Modal>

        <Modal
          open={showConfirmation}
          onClose={() => {
            setShowConfirmation(false);
            setConfirmChecked(false);
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: { xs: '90%', sm: 500 },
              maxWidth: 600,
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

            {/* Content */}
            <Box sx={{ p: 4, bgcolor: 'white' }}>
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
                  border: `2px solid ${
                    confirmChecked ? accentColor : '#e0e0e0'
                  }`,
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
                    All information is accurate and ready for export. I
                    understand this action cannot be undone.
                  </Typography>
                </Box>
              </Box>

              {/* Action Buttons */}
              <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setShowConfirmation(false);
                    setConfirmChecked(false);
                  }}
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
                  variant="contained"
                  disabled={!confirmChecked}
                  onClick={async () => {
                    setShowConfirmation(false);
                    setConfirmChecked(false);
                    setLoading(true);

                    try {
                      await handleSubmitPayroll();
                      setTimeout(() => {
                        setLoading(false);
                        setSuccessAction('export');
                        setSuccessOpen(true);
                        setTimeout(() => {
                          setSuccessOpen(false);
                          window.location.href = '/payroll-processed';
                        }, 1000);
                      }, 1000);
                    } catch (error) {
                      console.error('Error exporting payroll:', error);
                      setLoading(false);
                      alert(
                        'Failed to export payroll records. Please try again.',
                      );
                    }
                  }}
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
              </Box>
            </Box>
          </Box>
        </Modal>

        {/* Loading and Success Overlays */}
        {/* Excel view removed */}

        {/* Bulk Save Progress Dialog */}
        <Modal open={bulkSaveOpen} onClose={() => {}}>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 400,
              bgcolor: 'background.paper',
              borderRadius: 3,
              boxShadow: 24,
              p: 4,
              textAlign: 'center',
              border: `3px solid ${accentColor}`,
            }}
          >
            <Typography
              variant="h5"
              sx={{ mb: 3, fontWeight: 'bold', color: accentColor }}
            >
              Saving Records to Database
            </Typography>
            <Box sx={{ mb: 3 }}>
              <CircularProgress
                size={60}
                thickness={4}
                sx={{ color: accentColor }}
              />
            </Box>
            <Typography variant="h6" sx={{ mb: 2, color: textPrimaryColor }}>
              {bulkSaveProgress.current} / {bulkSaveProgress.total}
            </Typography>
            <Box sx={{ width: '100%', mb: 2 }}>
              <Box
                sx={{
                  width: '100%',
                  height: 20,
                  bgcolor: alpha(accentColor, 0.2),
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    width: `${(bulkSaveProgress.current / bulkSaveProgress.total) * 100}%`,
                    height: '100%',
                    bgcolor: accentColor,
                    transition: 'width 0.3s ease',
                  }}
                />
              </Box>
            </Box>
            <Typography variant="body2" sx={{ color: grayColor }}>
              Please wait while we save all calculated values to the database...
            </Typography>
          </Box>
        </Modal>

        <LoadingOverlay open={loading} message="Processing..." />
        <SuccessfulOverlay
          open={successOpen}
          action={successAction}
          onClose={() => setSuccessOpen(false)}
        />
      </Box>
    </Box>
  );
};

export default PayrollProcess;
