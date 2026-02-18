import API_BASE_URL from '../../apiConfig';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Backdrop,
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
  Checkbox,
  Grid,
  Card,
  CardContent,
  alpha,
  Fade,
  styled,
  Chip,
  IconButton,
  Tooltip,
  Avatar,
  Badge,
} from '@mui/material';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import usePayrollRealtimeRefresh from '../../hooks/usePayrollRealtimeRefresh';
import {
  Email,
  Payment,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  FilterList,
  Refresh,
  Publish as PublishIcon,
  BusinessCenter,
  Info,
} from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import TextField from '@mui/material/TextField';
import * as XLSX from 'xlsx';

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

// Professional styled components - colors will be applied via sx prop
const GlassCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  backdropFilter: 'blur(10px)',
  overflow: 'hidden',
  transition: 'boxShadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
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

// Professional styled components
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

const PayrollReleased = () => {
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
  // The identifier 'payroll-released' should match the component_identifier in the pages table
  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('payroll-released');
  // ACCESSING END

  const [releasedData, setReleasedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredReleasedData, setFilteredReleasedData] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('');
  const [releasedIdSet, setReleasedIdSet] = useState(new Set());
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [summaryData, setSummaryData] = useState({
    totalReleased: 0,
    totalEmployees: 0,
    totalGrossSalary: 0,
    totalNetSalary: 0,
  });

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
  // Normalize date string to YYYY-MM-DD
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

  const handleDateChange = (event) => {
    const newDate = event.target.value;
    setSelectedDate(newDate);
    applyFilters(selectedDepartment, searchTerm, newDate, selectedMonth, selectedYear);
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
      Math.min(rowsPerPage, filteredReleasedData.length) * rowHeight +
      headerHeight +
      paginationHeight;
    return Math.min(Math.max(contentHeight, minHeight), maxHeight);
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/department-table`,
        getAuthHeaders()
      );
      setDepartments(response.data);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchReleasedPayroll = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/PayrollReleasedRoute/released-payroll`,
        getAuthHeaders()
      );
      const data = Array.isArray(res.data) ? res.data : [];
      setReleasedData(data);
      setFilteredReleasedData(data);
      // Also populate the key set for cross-page disable logic parity
      const keys = new Set();
      data.forEach((record) => keys.add(getRecordKey(record)));
      setReleasedIdSet(keys);

      // Calculate summary data
      const totalGross = data.reduce(
        (sum, item) => sum + parseFloat(item.grossSalary || 0),
        0
      );
      const totalNet = data.reduce(
        (sum, item) => sum + parseFloat(item.netSalary || 0),
        0
      );

      setSummaryData({
        totalReleased: data.length,
        totalEmployees: data.length,
        totalGrossSalary: totalGross,
        totalNetSalary: totalNet,
      });

      setLoading(false);
    } catch (err) {
      console.error('Error fetching released payroll:', err);
      setError('An error occurred while fetching the released payroll.');
      setLoading(false);
    }
  };

  usePayrollRealtimeRefresh(() => {
    fetchDepartments();
    fetchReleasedPayroll();
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchReleasedPayroll();
  }, []);

  // Update summary data when filtered data changes
  useEffect(() => {
    const totalGross = filteredReleasedData.reduce(
      (sum, item) => sum + parseFloat(item.grossSalary || 0),
      0
    );
    const totalNet = filteredReleasedData.reduce(
      (sum, item) => sum + parseFloat(item.netSalary || 0),
      0
    );

    setSummaryData({
      totalReleased: filteredReleasedData.length,
      totalEmployees: filteredReleasedData.length,
      totalGrossSalary: totalGross,
      totalNetSalary: totalNet,
    });
  }, [filteredReleasedData]);

  const handleDepartmentChange = (event) => {
    const selectedDept = event.target.value;
    setSelectedDepartment(selectedDept);
    applyFilters(
      selectedDept,
      searchTerm,
      selectedDate,
      selectedMonth,
      selectedYear
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
      selectedYear
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
      selectedYear
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
      selectedYearValue
    );
  };

  const applyFilters = (department, search, filterDate, month, year) => {
    let filtered = [...releasedData];

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
            .includes(lowerSearch)
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
            '0'
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

    setFilteredReleasedData(filtered);
    setPage(0);
  };

  const handleSaveToExcel = () => {
    // Create worksheet data
    const ws_data = [
      // Header row (56 columns)
      [
        'No.',
        'Department',
        'Employee Number',
        'Start Date',
        'End Date',
        'Name',
        'Position',
        'Rate NBC 584',
        'NBC 594',
        'Rate NBC 594',
        "NBC DIFF'L 597",
        'Increment',
        'Gross Salary',
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
        'No.',
        'RT Ins.',
        'EC',
        'PhilHealth',
        'Pag-Ibig',
        'Pay1st Compute',
        'Pay2nd Compute',
        'No.',
        'Name',
        'Position',
        'Withholding Tax',
        'Personal Life Ret Ins',
        'GSIS Salary Loan',
        'GSIS Policy Loan',
        'gsisArrears',
        'CPL',
        'MPL',
        'EAL',
        'MPL LITE',
        'Emergency Loan (ELA)',
        'Total GSIS Deductions',
        'Pag-ibig Fund Contribution',
        'Pag-ibig 2',
        'Multi-Purpose Loan',
        'Total Pag-Ibig Deduction',
        'PhilHealth',
        'liquidatingCash',
        'LandBank Salary Loan',
        'Earist Credit COOP.',
        'FEU',
        'Total Other Deductions',
        'Total Deductions',
        'Date Submitted',
      ],
      // Empty row after header
      Array(56).fill(''),
    ];

    // Add data rows with empty rows in between
    filteredReleasedData.forEach((row, index) => {
      // Helper function to convert string to number
      const toNumber = (value) => {
        if (value === null || value === undefined || value === '') return '';
        const num = Number(value);
        if (isNaN(num)) return value;
        // Format with thousand separators but keep as number for Excel
        return num.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      };

      // Add data row with numeric values
      ws_data.push([
        // 1-25: basic and totals
        index + 1,
        row.department || '',
        row.employeeNumber || '',
        row.startDate || '',
        row.endDate || '',
        row.name || '',
        row.position || '',
        toNumber(row.rateNbc584),
        toNumber(row.nbc594),
        toNumber(row.rateNbc594),
        toNumber(row.nbcDiffl597),
        toNumber(row.increment),
        toNumber(row.grossSalary),
        toNumber(row.abs),
        toNumber(row.h),
        toNumber(row.m),
        toNumber(row.netSalary),
        toNumber(row.withholdingTax),
        toNumber(row.totalGsisDeds),
        toNumber(row.totalPagibigDeds),
        toNumber(row.PhilHealthContribution ?? row.philHealth),
        toNumber(row.totalOtherDeds),
        toNumber(row.totalDeductions),
        // 26-32: contribution breakdown and computes (if available)
        index + 1,
        toNumber(row.rtIns),
        toNumber(row.ec),
        toNumber(row.PhilHealthContribution ?? row.philHealth),
        toNumber(row.pagibigContribution ?? row.pagIbig),
        toNumber(row.pay1stCompute),
        toNumber(row.pay2ndCompute),
        // 33-58: detailed deductions section
        index + 1,
        row.name || '',
        row.position || '',
        toNumber(row.withholdingTax),
        toNumber(row.personalLifeRetIns),
        toNumber(row.gsisSalaryLoan),
        toNumber(row.gsisPolicyLoan),
        toNumber(row.gsisArrears ?? row.gsisarrears),
        toNumber(row.cpl),
        toNumber(row.mpl),
        toNumber(row.eal),
        toNumber(row.mplLite),
        toNumber(row.emergencyLoanEla ?? row.emergencyLoan),
        toNumber(row.totalGsisDeds),
        toNumber(row.pagibigFundContribution),
        toNumber(row.pagibig2),
        toNumber(row.multiPurposeLoan),
        toNumber(row.totalPagibigDeds),
        toNumber(row.PhilHealthContribution ?? row.philHealth),
        toNumber(row.liquidatingCash),
        toNumber(row.landbankSalaryLoan),
        toNumber(row.earistCreditCoop),
        toNumber(row.feu),
        toNumber(row.totalOtherDeds),
        toNumber(row.totalDeductions),
        row.dateSubmitted
          ? new Date(row.dateSubmitted).toLocaleDateString()
          : row.dateReleased
          ? new Date(row.dateReleased).toLocaleDateString()
          : '',
      ]);

      // Add empty row after each data row
      ws_data.push(Array(56).fill(''));
    });

    // Create workbook and add the worksheet
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Released Payroll Data');

    // Auto-size columns
    const max_width = 20;
    const colWidths = ws_data[0].map((_, i) => {
      return {
        wch: Math.min(
          max_width,
          Math.max(...ws_data.map((row) => row[i]?.toString().length || 0))
        ),
      };
    });
    ws['!cols'] = colWidths;

    const generateFilename = () => {
      if (filteredReleasedData.length === 0) {
        return 'PayrollReleased.xlsx';
      }

      // Get the first record's dates to determine the payroll period
      const firstRecord = filteredReleasedData[0];
      const startDate = new Date(firstRecord.startDate);
      const endDate = new Date(firstRecord.endDate);

      // Get month names
      const monthNames = [
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

      const startMonth = monthNames[startDate.getMonth()];
      const endMonth = monthNames[endDate.getMonth()];
      const year = startDate.getFullYear();

      // If start and end are in the same month
      if (startDate.getMonth() === endDate.getMonth()) {
        return `PayrollReleased_${startMonth}_${year}.xlsx`;
      } else {
        // If spanning across months
        return `PayrollReleased_${startMonth}_${endMonth}_${year}.xlsx`;
      }
    };

    const filename = generateFilename();

    // Save with the generated filename
    XLSX.writeFile(wb, `${filename}`);
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
          <CircularProgress sx={{ color: textPrimaryColor, mb: 2 }} />
          <Typography variant="h6" sx={{ color: textPrimaryColor }}>
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
        message="You do not have permission to access Payroll Released. Contact your administrator to request access."
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
        width: '100vw', // Full viewport width
        mx: 'auto', // Center horizontally
        maxWidth: '100%', // Ensure it doesn't exceed viewport
        overflow: 'hidden', // Prevent horizontal scroll
        position: 'relative',
        left: '50%',
        transform: 'translateX(-50%)', // Center the element
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
                        Payroll Released
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          opacity: 0.8,
                          fontWeight: 400,
                          color: textPrimaryColor,
                        }}
                      >
                        View and manage all released payroll records
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip
                      label="Released Records"
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
                            Total Released
                          </Typography>
                          <Typography
                            variant="h6"
                            fontWeight="bold"
                            sx={{ color: textPrimaryColor }}
                          >
                            {summaryData.totalReleased}
                          </Typography>
                        </Box>
                        <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 32 }} />
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
                            Total Employees
                          </Typography>
                          <Typography
                            variant="h6"
                            fontWeight="bold"
                            sx={{ color: '#4caf50' }}
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
                            Total Gross Salary
                          </Typography>
                          <Typography
                            variant="h6"
                            fontWeight="bold"
                            sx={{ color: textPrimaryColor }}
                          >
                            ₱
                            {summaryData.totalGrossSalary.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Typography>
                        </Box>
                        <TrendingUpIcon sx={{ color: accentColor, fontSize: 32 }} />
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
                            {summaryData.totalNetSalary.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Typography>
                        </Box>
                        <TrendingUpIcon sx={{ color: accentColor, fontSize: 32 }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {/* Loading Backdrop */}
        <Backdrop
          sx={{ color: textSecondaryColor, zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={loading}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress color="inherit" size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 2, color: textSecondaryColor }}>
              Processing department record...
            </Typography>
          </Box>
        </Backdrop>

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
                      '& .MuiInputLabel-root': {
                        color: textPrimaryColor,
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: textPrimaryColor }}>Month</InputLabel>
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
                    <InputLabel sx={{ color: textPrimaryColor }}>Year</InputLabel>
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
              icon={<Info />}
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
                  Released Payroll Data
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
                                indeterminate={(() => {
                                  const currentPageRows = filteredReleasedData.slice(
                                    page * rowsPerPage,
                                    page * rowsPerPage + rowsPerPage
                                  );
                                  const selectableIds = currentPageRows.map((row) => row.id);
                                  const selectedOnPage = selectedRows.filter((id) =>
                                    selectableIds.includes(id)
                                  );
                                  return (
                                    selectedOnPage.length > 0 &&
                                    selectedOnPage.length < selectableIds.length
                                  );
                                })()}
                                checked={(() => {
                                  const currentPageRows = filteredReleasedData.slice(
                                    page * rowsPerPage,
                                    page * rowsPerPage + rowsPerPage
                                  );
                                  const selectableIds = currentPageRows.map((row) => row.id);
                                  if (selectableIds.length === 0) return false;
                                  return selectableIds.every((id) =>
                                    selectedRows.includes(id)
                                  );
                                })()}
                                onChange={(e) => {
                                  const currentPageRows = filteredReleasedData.slice(
                                    page * rowsPerPage,
                                    page * rowsPerPage + rowsPerPage
                                  );
                                  const selectableIds = currentPageRows.map((row) => row.id);
                                  if (e.target.checked) {
                                    setSelectedRows((prev) => [
                                      ...new Set([...prev, ...selectableIds]),
                                    ]);
                                  } else {
                                    setSelectedRows((prev) =>
                                      prev.filter((id) => !selectableIds.includes(id))
                                    );
                                  }
                                }}
                              />
                            </PremiumTableCell>
                            <PremiumTableCell isHeader sx={{ color: textPrimaryColor }}>
                              No.
                            </PremiumTableCell>
                            <PremiumTableCell isHeader sx={{ color: textPrimaryColor }}>
                              Department
                            </PremiumTableCell>
                            <PremiumTableCell isHeader sx={{ color: textPrimaryColor }}>
                              Employee Number
                            </PremiumTableCell>
                            <PremiumTableCell isHeader sx={{ color: textPrimaryColor }}>
                              Start Date
                            </PremiumTableCell>
                            <PremiumTableCell isHeader sx={{ color: textPrimaryColor }}>
                              End Date
                            </PremiumTableCell>
                            <PremiumTableCell isHeader sx={{ color: textPrimaryColor }}>
                              Name
                            </PremiumTableCell>
                            <PremiumTableCell isHeader sx={{ color: textPrimaryColor }}>
                              Position
                            </PremiumTableCell>
                            <PremiumTableCell isHeader sx={{ color: textPrimaryColor }}>
                              Gross Salary
                            </PremiumTableCell>
                            <PremiumTableCell isHeader sx={{ color: textPrimaryColor }}>
                              Net Salary
                            </PremiumTableCell>
                            <PremiumTableCell isHeader sx={{ color: textPrimaryColor }}>
                              Date Released
                            </PremiumTableCell>
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          {filteredReleasedData.length > 0 ? (
                            filteredReleasedData
                              .slice(
                                page * rowsPerPage,
                                page * rowsPerPage + rowsPerPage
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
                                  <PremiumTableCell padding="checkbox">
                                    <Checkbox
                                      checked={selectedRows.includes(row.id)}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        if (selectedRows.includes(row.id)) {
                                          setSelectedRows((prev) =>
                                            prev.filter((id) => id !== row.id)
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
                                  <PremiumTableCell>
                                    {page * rowsPerPage + index + 1}
                                  </PremiumTableCell>
                                  <PremiumTableCell>{row.department}</PremiumTableCell>
                                  <PremiumTableCell>
                                    {row.employeeNumber}
                                  </PremiumTableCell>
                                  <PremiumTableCell>
                                    {row.startDate ? row.startDate.split('T')[0] : ''}
                                  </PremiumTableCell>
                                  <PremiumTableCell>
                                    {row.endDate ? row.endDate.split('T')[0] : ''}
                                  </PremiumTableCell>
                                  <PremiumTableCell>{row.name}</PremiumTableCell>
                                  <PremiumTableCell>{row.position}</PremiumTableCell>
                                  <PremiumTableCell>
                                    {row.grossSalary
                                      ? Number(row.grossSalary).toLocaleString(
                                          'en-US',
                                          {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          }
                                        )
                                      : ''}
                                  </PremiumTableCell>
                                  <PremiumTableCell>
                                    {row.netSalary
                                      ? Number(row.netSalary).toLocaleString(
                                          'en-US',
                                          {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          }
                                        )
                                      : ''}
                                  </PremiumTableCell>
                                  <PremiumTableCell>
                                    {row.dateReleased
                                      ? new Date(
                                          row.dateReleased
                                        ).toLocaleDateString()
                                      : ''}
                                  </PremiumTableCell>
                                </TableRow>
                              ))
                          ) : (
                            <TableRow>
                              <PremiumTableCell
                                colSpan={12}
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
                                    No released payroll records available. Try
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
                      Total Records: {filteredReleasedData.length}
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
                    count={filteredReleasedData.length}
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
              </Box>
            )}
          </GlassCard>
        </Fade>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
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
            startIcon={<BusinessCenter />}
          >
            View Processed Payroll
          </ProfessionalButton>

          <ProfessionalButton
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={handleSaveToExcel}
            size="large"
            sx={{
              borderColor: accentColor,
              color: textPrimaryColor,
              '&:hover': {
                borderColor: accentDark,
                backgroundColor: alpha(accentColor, 0.1),
              },
            }}
          >
            Save to Excel
          </ProfessionalButton>

          <ProfessionalButton
            variant="contained"
            startIcon={<Email />}
            onClick={() => {
              if (selectedRows.length > 0) {
                // Store selected employee numbers in localStorage for distribution page
                const selectedEmployeeNumbers = filteredReleasedData
                  .filter((row) => selectedRows.includes(row.id))
                  .map((row) => row.employeeNumber);
                localStorage.setItem('selectedEmployeeNumbers', JSON.stringify(selectedEmployeeNumbers));
              }
              window.location.href = '/distribution-payslip';
            }}
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
            Distribute Payslips {selectedRows.length > 0 ? `(${selectedRows.length})` : ''}
          </ProfessionalButton>
        </Box>

        <LoadingOverlay open={overlayLoading} message="Processing..." />
        <SuccessfulOverlay
          open={successOpen}
          action={successAction}
          onClose={() => setSuccessOpen(false)}
        />
      </Box>
    </Box>
  );
};

export default PayrollReleased;