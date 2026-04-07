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
  Slide,
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

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '109, 35, 35';
};

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
    '&:active': { transform: 'translateY(0)' },
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
  '& .MuiInputLabel-root': { fontWeight: 500 },
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
  const { settings } = useSystemSettings();

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

  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('payroll-jo');

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
  const [payrollFormulasData, setPayrollFormulasData] = useState([]);

  const fetchPayrollFormulasData = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/payroll-formulas`,
        getAuthHeaders(),
      );
      setPayrollFormulasData(res.data);
    } catch (err) {
      console.error('Error fetching payroll formulas for tooltips:', err);
    }
  };

  const getFormulaTooltip = (key) => {
    const formula = payrollFormulasData.find((f) => f.formula_key === key);
    if (!formula) return null;
    const expr = formula.formula_expression || '';
    const readable = expr
      .replace(/parseFloat\(item\.(\w+)\s*\|\|\s*0\)/g, '$1')
      .replace(/parseFloat\(([^)]+)\)/g, '$1')
      .replace(/item\.(\w+)/g, '$1')
      .replace(/\s*\|\|\s*0/g, '')
      .replace(/Math\.floor/g, 'Floor')
      .replace(/Math\.ceil/g, 'Ceil')
      .replace(/Math\.round/g, 'Round')
      .replace(/\s+/g, ' ')
      .trim();
    return { readable, description: formula.description || '' };
  };

  const HeaderTooltip = ({ fieldKey, fullName, children }) => {
    const formulaInfo = fieldKey ? getFormulaTooltip(fieldKey) : null;
    const tooltipContent = (
      <Box sx={{ maxWidth: 320, p: 0.5 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, mb: formulaInfo ? 0.5 : 0 }}
        >
          {fullName}
        </Typography>
        {formulaInfo && (
          <>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                fontFamily: 'monospace',
                bgcolor: 'rgba(255,255,255,0.15)',
                borderRadius: 1,
                px: 1,
                py: 0.5,
                mt: 0.5,
                wordBreak: 'break-all',
              }}
            >
              {formulaInfo.readable}
            </Typography>
            {formulaInfo.description && (
              <Typography
                variant="caption"
                sx={{ display: 'block', mt: 0.5, opacity: 0.85 }}
              >
                {formulaInfo.description}
              </Typography>
            )}
          </>
        )}
      </Box>
    );
    return (
      <Tooltip title={tooltipContent} arrow placement="top">
        <span style={{ cursor: 'help', display: 'inline-block' }}>
          {children}
        </span>
      </Tooltip>
    );
  };

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
    fetchDepartments();
    fetchPayrollFormulasData();
  }, []);

  usePayrollRealtimeRefresh(() => {
    fetchPayrollData();
    fetchFinalizedPayroll();
    fetchDepartments();
    fetchPayrollFormulasData();
  });

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/PayrollJORoutes/payroll-jo`,
        getAuthHeaders(),
      );

      let payroll = response.data;
      const officialTimeCache = {};

      const updatedPayroll = await Promise.all(
        payroll.map(async (row) => {
          try {
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
                { month: 'short' },
              );
              renderedDays = `${monthName} ${uniqueDays.join(', ')}`;
            }

            if (!officialTimeCache[row.employeeNumber]) {
              const officialTimeRes = await axios.get(
                `${API_BASE_URL}/PayrollJORoutes/official-time/${row.employeeNumber}`,
                getAuthHeaders(),
              );
              officialTimeCache[row.employeeNumber] = officialTimeRes.data;
            }

            const { daysCovered, numberOfDays, timeRange } =
              officialTimeCache[row.employeeNumber];
            const ratePerDay = row.ratePerDay || 0;
            const grossAmount = (ratePerDay / 8) * row.rh;

            return {
              ...row,
              renderedDays,
              grossAmount,
              days: daysCovered,
              numberOfDays,
              officialTime: timeRange,
              status: row.status || 0,
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
              status: row.status || 0,
              pagibigContribution: row.pagibigContribution || 0,
            };
          }
        }),
      );

      setPayrollData(updatedPayroll);
      setFilteredData(updatedPayroll);
      setError('');

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

    if (selectedDepartment) {
      filtered = filtered.filter(
        (item) => item.department === selectedDepartment,
      );
    }

    if (selectedStatus === 'Processed') {
      filtered = filtered.filter((item) => item.status === 1);
    } else if (selectedStatus === 'Unprocessed') {
      filtered = filtered.filter((item) => item.status === 0);
    }

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
          grossSalary: grossAmount,
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
          sss: sssContribution,
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
      setLoadingOverlay(false);
      setSuccessAction('processing payroll');
      setSuccessOpen(true);
      fetchFinalizedPayroll();
      setSelectedRows([]);
      fetchPayrollData();
      setTimeout(() => setSuccessOpen(false), 1500);
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
    return `${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const computeHourDeduction = (ratePerDay, hours) => {
    if (!ratePerDay || !hours) return 0;
    return (ratePerDay / 8) * hours;
  };

  const computeMinuteDeduction = (ratePerDay, minutes) => {
    if (!ratePerDay || !minutes) return 0;
    return (ratePerDay / 8 / 60) * minutes;
  };

  const computeTotalDeduction = (ratePerDay, hours, minutes) => {
    return (
      computeHourDeduction(ratePerDay, hours) +
      computeMinuteDeduction(ratePerDay, minutes)
    );
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
    if (row.status === 1) return;
    setRecordToDelete(row);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete || !recordToDelete.id) return;
    setIsProcessingDelete(true);
    try {
      const deletedId = recordToDelete.id;
      await axios.delete(
        `${API_BASE_URL}/PayrollJORoutes/payroll-jo/${deletedId}`,
        getAuthHeaders(),
      );

      setPayrollData((prev) => prev.filter((row) => row.id !== deletedId));
      setSelectedRows((prev) => prev.filter((id) => id !== deletedId));
      setDeleteDialogOpen(false);
      setRecordToDelete(null);

      // Keep the UI responsive by syncing in the background.
      fetchPayrollData();
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
    if (row.status === 1) return;
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
    setEditContributions({ sssContribution: '', pagibigContribution: '' });
  };

  const handleUpdateContributions = async () => {
    if (!editingRow) return;
    setIsUpdatingContributions(true);
    try {
      const updatedSSS = parseFloat(editContributions.sssContribution) || 0;
      const updatedPagibig = parseFloat(editContributions.pagibigContribution) || 0;

      await axios.put(
        `${API_BASE_URL}/PayrollJORoutes/payroll-jo/${editingRow.id}/contributions`,
        {
          employeeNumber: editingRow.employeeNumber,
          sssContribution: updatedSSS,
          pagibigContribution: updatedPagibig,
        },
        getAuthHeaders(),
      );

      setPayrollData((prev) =>
        prev.map((row) =>
          row.id === editingRow.id
            ? {
                ...row,
                sssContribution: updatedSSS,
                pagibigContribution: updatedPagibig,
              }
            : row,
        ),
      );

      handleEditContributionsClose();
      setSuccessAction('updating contributions');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);

      // Keep data accurate without blocking the UI overlay.
      fetchPayrollData();
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

  const handleClearSelection = () => {
    setSelectedRows([]);
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
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll Data');
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
    if (window.searchTimeout) clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => setIsSearching(false), 300);
  };

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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

  return (
    // ✅ FIXED: removed overflow:"hidden" and transform/left that broke position:fixed
    <Box
      sx={{
        py: 4,
        borderRadius: '14px',
        width: '100%',
        mx: 'auto',
        maxWidth: '100%',
      }}
    >
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
                  {[
                    {
                      label: 'Total Employees',
                      value: summaryData.totalEmployees,
                      color: textPrimaryColor,
                      icon: (
                        <PeopleIcon sx={{ color: accentColor, fontSize: 32 }} />
                      ),
                    },
                    {
                      label: 'Processed',
                      value: summaryData.processedEmployees,
                      color: '#4caf50',
                      icon: (
                        <CheckCircleIcon
                          sx={{ color: '#4caf50', fontSize: 32 }}
                        />
                      ),
                    },
                    {
                      label: 'Unprocessed',
                      value: summaryData.unprocessedEmployees,
                      color: '#ff9800',
                      icon: (
                        <PendingIcon sx={{ color: '#ff9800', fontSize: 32 }} />
                      ),
                    },
                    {
                      label: 'Total Net Amount',
                      value: `₱${summaryData.totalNetAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      color: textPrimaryColor,
                      icon: (
                        <TrendingUpIcon
                          sx={{ color: accentColor, fontSize: 32 }}
                        />
                      ),
                    },
                  ].map((card) => (
                    <Card
                      key={card.label}
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
                      <CardContent
                        sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}
                      >
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
                              {card.label}
                            </Typography>
                            <Typography
                              variant="h6"
                              fontWeight="bold"
                              sx={{ color: card.color }}
                            >
                              {card.value}
                            </Typography>
                          </Box>
                          {card.icon}
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
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
                      {monthOptions.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
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
                      {yearOptions.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
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

        {/* Table Section */}
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
              {/* Scrollable Table */}
              <Box
                sx={{
                  overflowX: 'auto',
                  overflowY: 'visible',
                  flex: 1,
                  minWidth: 0,
                  '&::-webkit-scrollbar': { height: '10px' },
                  '&::-webkit-scrollbar-track': {
                    background: alpha(accentColor, 0.1),
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: alpha(accentColor, 0.4),
                    borderRadius: '4px',
                    '&:hover': { background: alpha(accentColor, 0.6) },
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
                              const selectableRows = currentPageRows.filter(
                                (row) =>
                                  row.status !== 1 &&
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
                              const selectableRows = currentPageRows.filter(
                                (row) =>
                                  row.status !== 1 &&
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
                              const selectableRows = currentPageRows.filter(
                                (row) =>
                                  row.status !== 1 &&
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
                          <HeaderTooltip
                            fieldKey={null}
                            fullName="Rate Per Day — Daily rate of the employee"
                          >
                            Rate/Day
                          </HeaderTooltip>
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
                          <HeaderTooltip
                            fieldKey="grossSalary"
                            fullName="Gross Amount — Total salary before deductions"
                          >
                            Gross Amount
                          </HeaderTooltip>
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
                          <HeaderTooltip
                            fieldKey={null}
                            fullName="SSS — Social Security System monthly contribution"
                          >
                            SSS
                          </HeaderTooltip>
                        </PremiumTableCell>
                        <PremiumTableCell
                          rowSpan={2}
                          isHeader
                          sx={{ color: textPrimaryColor }}
                        >
                          <HeaderTooltip
                            fieldKey="pagibigFundCont"
                            fullName="PAGIBIG — Pag-IBIG Fund monthly housing contribution"
                          >
                            PAGIBIG
                          </HeaderTooltip>
                        </PremiumTableCell>
                        <PremiumTableCell
                          rowSpan={2}
                          isHeader
                          sx={{ color: textPrimaryColor }}
                        >
                          <HeaderTooltip
                            fieldKey="netSalary"
                            fullName="Net Amount — Take-home pay after all deductions"
                          >
                            <b>Net Amount</b>
                          </HeaderTooltip>
                        </PremiumTableCell>
                      </TableRow>
                      <TableRow>
                        <PremiumTableCell
                          isHeader
                          sx={{ color: textPrimaryColor }}
                        >
                          <HeaderTooltip
                            fieldKey="h"
                            fullName="Hours Late / Undertime"
                          >
                            Hrs
                          </HeaderTooltip>
                        </PremiumTableCell>
                        <PremiumTableCell
                          isHeader
                          sx={{ color: textPrimaryColor }}
                        >
                          <HeaderTooltip
                            fieldKey="m"
                            fullName="Minutes Late / Undertime"
                          >
                            Mins
                          </HeaderTooltip>
                        </PremiumTableCell>
                        <PremiumTableCell
                          isHeader
                          sx={{ color: textPrimaryColor }}
                        >
                          <HeaderTooltip
                            fieldKey="abs"
                            fullName="Total Deduction — Combined deduction from hours and minutes late"
                          >
                            Total Deduction
                          </HeaderTooltip>
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
                              <TableCell>{row.renderedDays || '—'}</TableCell>
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
                                sx={{ fontWeight: 'bold', color: '#6D2323' }}
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
                            borderBottom: `1px solid ${alpha(accentColor, 0.06)}`,
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
                        .map((row) => (
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
                                borderBottom: `1px solid ${alpha(accentColor, 0.06)}`,
                              }}
                            >
                              <Chip
                                label={
                                  row.status === 1 ? 'Processed' : 'Unprocessed'
                                }
                                size="small"
                                sx={{
                                  fontWeight: 'bold',
                                  backgroundColor:
                                    row.status === 1 ? '#4caf50' : '#ff9800',
                                  color: 'white',
                                  '&:hover': {
                                    backgroundColor:
                                      row.status === 1 ? '#45a049' : '#fb8c00',
                                  },
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell
                          sx={{
                            textAlign: 'center',
                            borderBottom: `1px solid ${alpha(accentColor, 0.06)}`,
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
                            borderBottom: `1px solid ${alpha(accentColor, 0.06)}`,
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
                        .map((row) => (
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
                                borderBottom: `1px solid ${alpha(accentColor, 0.06)}`,
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
                                        row.status === 1 ? '#ccc' : accentColor,
                                      backgroundColor:
                                        row.status === 1 ? '#f5f5f5' : 'white',
                                      border: `1px solid ${row.status === 1 ? '#ccc' : accentColor}`,
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
                                        row.status === 1 ? '#f5f5f5' : 'white',
                                      border: `1px solid ${row.status === 1 ? '#ccc' : '#d32f2f'}`,
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
                        ))
                    ) : (
                      <TableRow>
                        <TableCell
                          sx={{
                            textAlign: 'center',
                            borderBottom: `1px solid ${alpha(accentColor, 0.06)}`,
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
                    { color: textPrimaryColor },
                  '& .MuiIconButton-root': { color: textPrimaryColor },
                }}
              />
            </Box>
          </GlassCard>
        </Fade>

        {/* ✅ FIXED: Floating Action Bar — centered and always visible */}
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 1300,
            pointerEvents: 'none',
          }}
        >
          <Slide
            direction="up"
            in={selectedRows.length > 0}
            mountOnEnter
            unmountOnExit
          >
            <Box
              sx={{
                pointerEvents: 'auto',
                width: 'min(760px, calc(100vw - 32px))',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 1.5,
                flexWrap: 'wrap',
                px: 2.5,
                py: 2,
                borderRadius: '16px 16px 0 0',
                border: `1px solid ${alpha(accentColor, 0.12)}`,
                borderBottom: 'none',
                bgcolor: '#ffffff',
                boxShadow: `0 -4px 24px ${alpha(accentColor, 0.1)}`,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  color: textPrimaryColor,
                  px: 2,
                  py: 1,
                  borderRadius: 999,
                  bgcolor: alpha(accentColor, 0.07),
                  border: `1px solid ${alpha(accentColor, 0.15)}`,
                }}
              >
                Selected: {selectedRows.length}
              </Typography>

              <Box sx={{ flex: 1 }} />

              <ProfessionalButton
                variant="outlined"
                onClick={handleClearSelection}
                size="large"
                sx={{
                  borderColor: alpha(accentColor, 0.3),
                  color: textPrimaryColor,
                  bgcolor: 'rgba(255,255,255,0.9)',
                  px: 2.2,
                  py: 1,
                  borderRadius: '12px',
                  '&:hover': {
                    borderColor: accentColor,
                    bgcolor: 'rgba(255,255,255,0.94)',
                  },
                }}
              >
                Cancel
              </ProfessionalButton>

              <Fab
                variant="extended"
                onClick={handleOpenConfirm}
                disabled={
                  processing ||
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
                sx={{
                  bgcolor: accentColor,
                  color: textSecondaryColor,
                  px: 2.4,
                  py: 0.2,
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: '12px',
                  boxShadow: `0 8px 20px ${alpha(accentColor, 0.35)}`,
                  '&:hover': {
                    bgcolor: accentDark,
                    boxShadow: `0 12px 26px ${alpha(accentColor, 0.42)}`,
                  },
                  '&:disabled': {
                    bgcolor: alpha(accentColor, 0.25),
                    color: alpha(textSecondaryColor, 0.5),
                  },
                }}
              >
                <ExitToApp sx={{ mr: 1 }} />
                Export Payroll Records
              </Fab>
            </Box>
          </Slide>
        </Box>

        {/* Delete Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: `0 32px 80px ${alpha(accentColor, 0.25)}, 0 8px 24px ${alpha(accentColor, 0.12)}`,
              border: `1px solid ${alpha(accentColor, 0.14)}`,
              bgcolor: primaryColor,
            },
          }}
        >
          <Box
            sx={{
              px: 4,
              pt: 4,
              pb: 3.5,
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
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
                borderRadius: '50%',
                background: `radial-gradient(circle, ${alpha('#d32f2f', 0.1)} 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: -30,
                left: '25%',
                width: 150,
                height: 150,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${alpha('#d32f2f', 0.07)} 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}
            />
            <IconButton
              size="small"
              onClick={handleDeleteCancel}
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 2,
                color: textPrimaryColor,
                opacity: 0.45,
                '&:hover': { opacity: 1, bgcolor: alpha('#d32f2f', 0.1) },
              }}
            >
              <Close fontSize="small" />
            </IconButton>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2.5,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Avatar
                sx={{
                  bgcolor: alpha('#d32f2f', 0.15),
                  width: 60,
                  height: 60,
                  boxShadow: `0 8px 24px ${alpha('#d32f2f', 0.18)}`,
                  border: `2px solid ${alpha('#d32f2f', 0.1)}`,
                }}
              >
                <DeleteForever sx={{ fontSize: 28, color: '#d32f2f' }} />
              </Avatar>
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    mb: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: '1.2rem',
                      color: textPrimaryColor,
                      lineHeight: 1.2,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Delete Payroll Record
                  </Typography>
                  <Chip
                    label="Irreversible"
                    size="small"
                    sx={{
                      bgcolor: alpha('#d32f2f', 0.1),
                      color: '#d32f2f',
                      fontWeight: 700,
                      fontSize: '0.65rem',
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                      height: 20,
                      borderRadius: '6px',
                      border: `1px solid ${alpha('#d32f2f', 0.2)}`,
                    }}
                  />
                </Box>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    color: alpha(textPrimaryColor, 0.5),
                    fontWeight: 500,
                  }}
                >
                  {new Date().toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box
            sx={{
              px: 4,
              py: 3,
              bgcolor: alpha(primaryColor, 0.6),
              borderTop: `1px solid ${alpha(accentColor, 0.08)}`,
              borderBottom: `1px solid ${alpha(accentColor, 0.08)}`,
            }}
          >
            <Typography
              sx={{
                fontSize: '0.9rem',
                color: alpha(textPrimaryColor, 0.8),
                lineHeight: 1.8,
                fontWeight: 500,
                mb: 2,
              }}
            >
              The following payroll record will be permanently removed from the
              system.
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                mb: 2,
                px: 2,
                py: 1.5,
                borderRadius: '12px',
                bgcolor: 'rgba(255,255,255,0.75)',
                border: `1px solid ${alpha(accentColor, 0.1)}`,
                boxShadow: `0 2px 8px ${alpha(accentColor, 0.06)}`,
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '8px',
                  flexShrink: 0,
                  bgcolor: alpha('#d32f2f', 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <DeleteForever sx={{ fontSize: 18, color: '#d32f2f' }} />
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    color: alpha(textPrimaryColor, 0.5),
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Employee Record
                </Typography>
                <Typography
                  sx={{
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: textPrimaryColor,
                    lineHeight: 1.2,
                  }}
                >
                  {recordToDelete?.name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    color: alpha(textPrimaryColor, 0.55),
                    fontWeight: 500,
                  }}
                >
                  Employee #{recordToDelete?.employeeNumber}
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                mt: 1.5,
                px: 2,
                py: 1.5,
                borderRadius: '12px',
                bgcolor: alpha('#d32f2f', 0.06),
                border: `1px solid ${alpha('#d32f2f', 0.14)}`,
                borderLeft: `4px solid ${alpha('#d32f2f', 0.5)}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.25,
              }}
            >
              <Warning
                sx={{
                  fontSize: 15,
                  color: '#d32f2f',
                  opacity: 0.6,
                  mt: 0.2,
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  fontSize: '0.82rem',
                  color: alpha(textPrimaryColor, 0.75),
                  fontWeight: 600,
                  lineHeight: 1.65,
                }}
              >
                This action is permanent and cannot be undone. The record will
                be removed from all payroll reports.
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              px: 4,
              py: 2.5,
              bgcolor: alpha(primaryColor, 0.8),
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <ProfessionalButton
              onClick={handleDeleteCancel}
              variant="outlined"
              sx={{
                borderColor: alpha(accentColor, 0.3),
                color: textPrimaryColor,
                bgcolor: 'rgba(255,255,255,0.6)',
                '&:hover': {
                  borderColor: accentColor,
                  bgcolor: 'rgba(255,255,255,0.9)',
                },
              }}
            >
              Cancel
            </ProfessionalButton>
            <ProfessionalButton
              onClick={handleDeleteConfirm}
              disabled={isProcessingDelete}
              variant="contained"
              sx={{
                bgcolor: '#d32f2f',
                color: '#fff',
                boxShadow: `0 4px 16px ${alpha('#d32f2f', 0.4)}`,
                '&:hover': {
                  bgcolor: '#c62828',
                  boxShadow: `0 6px 20px ${alpha('#d32f2f', 0.5)}`,
                },
                '&:disabled': {
                  bgcolor: alpha('#d32f2f', 0.25),
                  color: 'rgba(255,255,255,0.5)',
                },
              }}
              startIcon={
                isProcessingDelete ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <DeleteForever />
                )
              }
            >
              {isProcessingDelete ? 'Deleting…' : 'Confirm Delete'}
            </ProfessionalButton>
          </Box>
        </Dialog>

        {/* Edit Contributions Dialog */}
        <Dialog
          open={editContributionsOpen}
          onClose={handleEditContributionsClose}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: `0 32px 80px ${alpha(accentColor, 0.25)}, 0 8px 24px ${alpha(accentColor, 0.12)}`,
              border: `1px solid ${alpha(accentColor, 0.14)}`,
              bgcolor: primaryColor,
            },
          }}
        >
          <Box
            sx={{
              px: 4,
              pt: 4,
              pb: 3.5,
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
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
                borderRadius: '50%',
                background: `radial-gradient(circle, ${alpha(accentColor, 0.1)} 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: -30,
                left: '25%',
                width: 150,
                height: 150,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${alpha(accentColor, 0.07)} 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}
            />
            <IconButton
              size="small"
              onClick={handleEditContributionsClose}
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 2,
                color: textPrimaryColor,
                opacity: 0.45,
                '&:hover': { opacity: 1, bgcolor: alpha(accentColor, 0.1) },
              }}
            >
              <Close fontSize="small" />
            </IconButton>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2.5,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Avatar
                sx={{
                  bgcolor: alpha(accentColor, 0.14),
                  width: 60,
                  height: 60,
                  boxShadow: `0 8px 24px ${alpha(accentColor, 0.18)}`,
                  border: `2px solid ${alpha(accentColor, 0.1)}`,
                }}
              >
                <EditIcon sx={{ fontSize: 28, color: accentColor }} />
              </Avatar>
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    mb: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: '1.2rem',
                      color: textPrimaryColor,
                      lineHeight: 1.2,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Edit Contributions
                  </Typography>
                  <Chip
                    label="Editable"
                    size="small"
                    sx={{
                      bgcolor: alpha(accentColor, 0.1),
                      color: accentColor,
                      fontWeight: 700,
                      fontSize: '0.65rem',
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                      height: 20,
                      borderRadius: '6px',
                      border: `1px solid ${alpha(accentColor, 0.2)}`,
                    }}
                  />
                </Box>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    color: alpha(textPrimaryColor, 0.5),
                    fontWeight: 500,
                  }}
                >
                  {editingRow?.name} — Employee #{editingRow?.employeeNumber}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box
            sx={{
              px: 4,
              py: 3,
              bgcolor: alpha(primaryColor, 0.6),
              borderTop: `1px solid ${alpha(accentColor, 0.08)}`,
              borderBottom: `1px solid ${alpha(accentColor, 0.08)}`,
            }}
          >
            <Typography
              sx={{
                fontSize: '0.9rem',
                color: alpha(textPrimaryColor, 0.8),
                lineHeight: 1.8,
                fontWeight: 500,
                mb: 2.5,
              }}
            >
              Update the monthly government contribution amounts for this
              employee.
            </Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    mb: 1,
                    color: textPrimaryColor,
                    fontSize: '0.82rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
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
                  placeholder="0.00"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255,255,255,0.85)',
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    mb: 1,
                    color: textPrimaryColor,
                    fontSize: '0.82rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
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
                  placeholder="0.00"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255,255,255,0.85)',
                    },
                  }}
                />
              </Grid>
            </Grid>
          </Box>
          <Box
            sx={{
              px: 4,
              py: 2.5,
              bgcolor: alpha(primaryColor, 0.8),
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <ProfessionalButton
              onClick={handleEditContributionsClose}
              variant="outlined"
              sx={{
                borderColor: alpha(accentColor, 0.3),
                color: textPrimaryColor,
                bgcolor: 'rgba(255,255,255,0.6)',
                '&:hover': {
                  borderColor: accentColor,
                  bgcolor: 'rgba(255,255,255,0.9)',
                },
              }}
            >
              Cancel
            </ProfessionalButton>
            <ProfessionalButton
              onClick={handleUpdateContributions}
              disabled={isUpdatingContributions}
              variant="contained"
              sx={{
                bgcolor: accentColor,
                color: primaryColor,
                boxShadow: `0 4px 16px ${alpha(accentColor, 0.4)}`,
                '&:hover': {
                  bgcolor: accentDark,
                  boxShadow: `0 6px 20px ${alpha(accentColor, 0.5)}`,
                },
                '&:disabled': {
                  bgcolor: alpha(accentColor, 0.25),
                  color: alpha(primaryColor, 0.5),
                },
              }}
              startIcon={
                isUpdatingContributions ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <SaveIcon />
                )
              }
            >
              {isUpdatingContributions ? 'Saving…' : 'Save Changes'}
            </ProfessionalButton>
          </Box>
        </Dialog>

        {/* Confirmation Dialog */}
        <Dialog
          open={openConfirm}
          onClose={() => {
            setOpenConfirm(false);
            setConfirmChecked(false);
          }}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: `0 32px 80px ${alpha(accentColor, 0.25)}, 0 8px 24px ${alpha(accentColor, 0.12)}`,
              border: `1px solid ${alpha(accentColor, 0.14)}`,
              bgcolor: primaryColor,
            },
          }}
        >
          <Box
            sx={{
              px: 4,
              pt: 4,
              pb: 3.5,
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
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
                borderRadius: '50%',
                background: `radial-gradient(circle, ${alpha(accentColor, 0.1)} 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: -30,
                left: '25%',
                width: 150,
                height: 150,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${alpha(accentColor, 0.07)} 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}
            />
            <IconButton
              size="small"
              onClick={() => {
                setOpenConfirm(false);
                setConfirmChecked(false);
              }}
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 2,
                color: textPrimaryColor,
                opacity: 0.45,
                '&:hover': { opacity: 1, bgcolor: alpha(accentColor, 0.1) },
              }}
            >
              <Close fontSize="small" />
            </IconButton>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2.5,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Avatar
                sx={{
                  bgcolor: alpha(accentColor, 0.14),
                  width: 60,
                  height: 60,
                  boxShadow: `0 8px 24px ${alpha(accentColor, 0.18)}`,
                  border: `2px solid ${alpha(accentColor, 0.1)}`,
                }}
              >
                <Payment sx={{ fontSize: 28, color: accentColor }} />
              </Avatar>
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    mb: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: '1.2rem',
                      color: textPrimaryColor,
                      lineHeight: 1.2,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Export to Payroll Processed
                  </Typography>
                  <Chip
                    label="Confirmation"
                    size="small"
                    sx={{
                      bgcolor: alpha(accentColor, 0.1),
                      color: accentColor,
                      fontWeight: 700,
                      fontSize: '0.65rem',
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                      height: 20,
                      borderRadius: '6px',
                      border: `1px solid ${alpha(accentColor, 0.2)}`,
                    }}
                  />
                </Box>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    color: alpha(textPrimaryColor, 0.5),
                    fontWeight: 500,
                  }}
                >
                  {new Date().toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box
            sx={{
              px: 4,
              py: 3,
              bgcolor: alpha(primaryColor, 0.6),
              borderTop: `1px solid ${alpha(accentColor, 0.08)}`,
              borderBottom: `1px solid ${alpha(accentColor, 0.08)}`,
            }}
          >
            <Typography
              sx={{
                fontSize: '0.9rem',
                color: alpha(textPrimaryColor, 0.8),
                lineHeight: 1.8,
                fontWeight: 500,
                mb: 2,
              }}
            >
              The following records are pending export to Payroll Processed.
              Verify all entries are accurate before proceeding.
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                mb: 2,
                px: 2,
                py: 1.5,
                borderRadius: '12px',
                bgcolor: 'rgba(255,255,255,0.75)',
                border: `1px solid ${alpha(accentColor, 0.1)}`,
                boxShadow: `0 2px 8px ${alpha(accentColor, 0.06)}`,
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '8px',
                  flexShrink: 0,
                  bgcolor: alpha(accentColor, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Payment sx={{ fontSize: 18, color: accentColor }} />
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    color: alpha(textPrimaryColor, 0.5),
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Records for Export
                </Typography>
                <Typography
                  sx={{
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: textPrimaryColor,
                    lineHeight: 1.2,
                  }}
                >
                  {selectedRows.length}{' '}
                  {selectedRows.length === 1 ? 'Record' : 'Records'} — Job Order
                  Payroll
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                p: 2.5,
                borderRadius: '12px',
                border: `2px solid ${confirmChecked ? accentColor : alpha(accentColor, 0.15)}`,
                bgcolor: confirmChecked
                  ? alpha(accentColor, 0.05)
                  : 'rgba(255,255,255,0.5)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
              onClick={() => setConfirmChecked((p) => !p)}
            >
              <Checkbox
                checked={confirmChecked}
                onChange={(e) => setConfirmChecked(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                sx={{
                  color: alpha(accentColor, 0.4),
                  '&.Mui-checked': { color: accentColor },
                  mt: -0.5,
                  p: 0.5,
                }}
              />
              <Box>
                <Typography
                  sx={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: textPrimaryColor,
                    mb: 0.4,
                    lineHeight: 1.3,
                  }}
                >
                  I confirm all records have been reviewed and are accurate.
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    color: alpha(textPrimaryColor, 0.55),
                    fontWeight: 500,
                    lineHeight: 1.6,
                  }}
                >
                  This action will finalize and export the selected records to
                  payroll processing and cannot be undone.
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box
            sx={{
              px: 4,
              py: 2.5,
              bgcolor: alpha(primaryColor, 0.8),
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <ProfessionalButton
              onClick={() => {
                setOpenConfirm(false);
                setConfirmChecked(false);
              }}
              variant="outlined"
              sx={{
                borderColor: alpha(accentColor, 0.3),
                color: textPrimaryColor,
                bgcolor: 'rgba(255,255,255,0.6)',
                '&:hover': {
                  borderColor: accentColor,
                  bgcolor: 'rgba(255,255,255,0.9)',
                },
              }}
            >
              Cancel
            </ProfessionalButton>
            <ProfessionalButton
              onClick={() => {
                setOpenConfirm(false);
                setConfirmChecked(false);
                handleExportToFinalized();
              }}
              disabled={!confirmChecked}
              variant="contained"
              sx={{
                bgcolor: accentColor,
                color: primaryColor,
                boxShadow: `0 4px 16px ${alpha(accentColor, 0.4)}`,
                '&:hover': {
                  bgcolor: accentDark,
                  boxShadow: `0 6px 20px ${alpha(accentColor, 0.5)}`,
                },
                '&:disabled': {
                  bgcolor: alpha(accentColor, 0.25),
                  color: alpha(primaryColor, 0.5),
                },
              }}
            >
              Confirm & Export
            </ProfessionalButton>
          </Box>
        </Dialog>

        {/* Loading Overlay */}
        <LoadingOverlay
          open={loadingOverlay}
          message={'Processing payroll records...'}
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
