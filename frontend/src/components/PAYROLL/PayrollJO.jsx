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
  Chip,
  IconButton,
  Tooltip,
  styled,
  alpha,
  Fade,
  Slide,
  Dialog,
  DialogActions,
  Portal,
} from '@mui/material';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import usePayrollRealtimeRefresh from '../../hooks/usePayrollRealtimeRefresh';
import SearchIcon from '@mui/icons-material/Search';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ExitToApp,
  Payment,
  FilterList,
  GetApp,
  Error,
  Warning,
  Info,
  Refresh,
  Close,
  CalendarToday,
} from '@mui/icons-material';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import DeleteForever from '@mui/icons-material/DeleteForever';

// ─── Unified Design Tokens (mirrors PayrollProcess) ───────────────────────────
const T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  accentMid: '#8B4545',
  accentFaint: 'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover: 'rgba(109,35,35,0.10)',
  headerGrad: 'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)',
  rowEven: '#ffffff',
  rowOdd: 'rgba(109,35,35,0.025)',
  rowHover: 'rgba(109,35,35,0.055)',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#a0a0a0',
  surface: '#ffffff',
  divider: 'rgba(0,0,0,0.08)',
  font: "'Poppins', sans-serif",
};

// ── Row height / sticky widths ────────────────────────────────────────────────
const FROZEN_ROW_HEIGHT = 56;
const STICKY_STATUS_WIDTH = 120;
const STICKY_ACTIONS_WIDTH = 104;

// ─── Styled Primitives ────────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: T.surface,
  fontFamily: T.font,
});

const FieldInput = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8,
    fontSize: '0.875rem',
    backgroundColor: '#fff',
    fontFamily: T.font,
    '& fieldset': { borderColor: T.accentBorder },
    '&:hover fieldset': { borderColor: T.accent },
    '&.Mui-focused fieldset': { borderColor: T.accent, borderWidth: 1.5 },
  },
  '& .MuiInputLabel-root': { fontFamily: T.font },
  '& .MuiInputLabel-root.Mui-focused': { color: T.accent },
});

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.875rem',
  letterSpacing: '0.01em',
  fontFamily: T.font,
  transition: 'all 0.18s ease',
  '&:hover': { transform: 'translateY(-1px)' },
  '&:active': { transform: 'translateY(0)' },
});

const filterSelectSx = {
  borderRadius: 2,
  bgcolor: '#fafafa',
  fontSize: '0.875rem',
  fontFamily: T.font,
  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: T.accent,
    borderWidth: '1.5px',
  },
};

const globalFontSx = { '& *': { fontFamily: `${T.font} !important` } };

// ── Shared sticky header/body cell helpers ─────────────────────────────────────
const stickyStatusHeaderSx = {
  borderBottom: `2px solid ${T.accentBorder}`,
  borderLeft: `2px solid ${T.accentBorder}`,
  py: 1.2,
  px: 1.5,
  fontSize: '0.65rem',
  fontWeight: 800,
  color: T.accent,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
  bgcolor: '#fff',
  fontFamily: T.font,
  position: 'sticky',
  right: STICKY_ACTIONS_WIDTH,
  zIndex: 52,
  width: STICKY_STATUS_WIDTH,
  minWidth: STICKY_STATUS_WIDTH,
};

const stickyActionsHeaderSx = {
  borderBottom: `2px solid ${T.accentBorder}`,
  borderLeft: `2px solid ${T.accentBorder}`,
  py: 1.2,
  px: 1.5,
  fontSize: '0.65rem',
  fontWeight: 800,
  color: T.accent,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
  bgcolor: '#fff',
  fontFamily: T.font,
  position: 'sticky',
  right: 0,
  zIndex: 53,
  boxShadow: `-2px 0 6px ${alpha(T.accent, 0.07)}`,
};

const getStickyStatusBodySx = (index) => ({
  borderBottom: 'none',
  textAlign: 'center',
  borderLeft: `2px solid ${T.accentBorder}`,
  position: 'sticky',
  right: STICKY_ACTIONS_WIDTH,
  zIndex: 40,
  width: STICKY_STATUS_WIDTH,
  minWidth: STICKY_STATUS_WIDTH,
  bgcolor: index % 2 === 0 ? '#ffffff' : '#f9f4f4',
});

const getStickyActionsBodySx = (index) => ({
  borderBottom: 'none',
  py: 1.05,
  minWidth: STICKY_ACTIONS_WIDTH,
  position: 'sticky',
  right: 0,
  zIndex: 41,
  bgcolor: index % 2 === 0 ? '#ffffff' : '#f9f4f4',
  boxShadow: `-2px 0 6px ${alpha(T.accent, 0.07)}`,
  borderLeft: `2px solid ${T.accentBorder}`,
});

// ── Sub-components ─────────────────────────────────────────────────────────────
const StatusChip = ({ status }) => (
  <Chip
    label={status === 1 || status === 'Processed' ? 'Processed' : 'Unprocessed'}
    size="small"
    sx={{
      fontWeight: 700,
      fontSize: '0.65rem',
      fontFamily: T.font,
      bgcolor:
        status === 1 || status === 'Processed'
          ? alpha('#4caf50', 0.12)
          : alpha('#ff9800', 0.12),
      color: status === 1 || status === 'Processed' ? '#2e7d32' : '#e65100',
      border: `1px solid ${
        status === 1 || status === 'Processed'
          ? alpha('#4caf50', 0.3)
          : alpha('#ff9800', 0.3)
      }`,
    }}
  />
);

const ExcelTableCell = ({ children, ...props }) => (
  <TableCell
    {...props}
    sx={{
      whiteSpace: 'nowrap',
      fontSize: '0.82rem',
      fontFamily: T.font,
      ...props.sx,
    }}
  >
    {children}
  </TableCell>
);

const PayrollJO = () => {
  const { settings } = useSystemSettings();

  const { hasAccess, loading: accessLoading } = usePageAccess('payroll-jo');

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
  const [selectedYear, setSelectedYear] = useState('');
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

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
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
  const payrollYearOptions = Array.from(
    { length: 7 },
    (_, i) => currentYear - 3 + i,
  );
  const payrollMonths = [
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
  const [selectedPayrollYear, setSelectedPayrollYear] = useState(currentYear);
  const [selectedPayrollMonth, setSelectedPayrollMonth] = useState(null);
  const [selectedMonthDays, setSelectedMonthDays] = useState(null);

  const computeHourDeduction = (ratePerDay, hours) =>
    !ratePerDay || !hours ? 0 : (ratePerDay / 8) * hours;
  const computeMinuteDeduction = (ratePerDay, minutes) =>
    !ratePerDay || !minutes ? 0 : (ratePerDay / 8 / 60) * minutes;
  const computeTotalDeduction = (ratePerDay, hours, minutes) =>
    computeHourDeduction(ratePerDay, hours) +
    computeMinuteDeduction(ratePerDay, minutes);
  const computeNetAmount = (
    grossAmount,
    ratePerDay,
    hours,
    minutes,
    sss,
    pagibig,
  ) => {
    const totalDeduction = computeTotalDeduction(ratePerDay, hours, minutes);
    return (
      (parseFloat(grossAmount) || 0) -
      totalDeduction -
      (parseFloat(sss) || 0) -
      (parseFloat(pagibig) || 0)
    );
  };
  const formatCurrency = (amount) =>
    !amount
      ? '0.00'
      : parseFloat(amount).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  const fmt = (v, dec = 2) =>
    (parseFloat(v) || 0).toLocaleString('en-US', {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    });

  const fetchPayrollFormulasData = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/payroll-formulas`,
        getAuthHeaders(),
      );
      setPayrollFormulasData(res.data);
    } catch (err) {
      console.error('Error fetching payroll formulas:', err);
    }
  };

  // ── Data fetching ─────────────────────────────────────────────────────────────
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
                completeAttendance.map((rec) => new Date(rec.date).getDate()),
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

  // ── Filtering ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let filtered = [...payrollData];
    if (selectedDepartment)
      filtered = filtered.filter(
        (item) => item.department === selectedDepartment,
      );
    if (selectedStatus === 'Processed')
      filtered = filtered.filter((item) => item.status === 1);
    else if (selectedStatus === 'Unprocessed')
      filtered = filtered.filter((item) => item.status === 0);
    if (selectedMonth || selectedYear) {
      filtered = filtered.filter((item) => {
        if (!item.startDate) return false;
        const date = new Date(item.startDate);
        const itemMonth = String(date.getMonth() + 1).padStart(2, '0');
        const itemYear = date.getFullYear().toString();
        return (
          (!selectedMonth || itemMonth === selectedMonth) &&
          (!selectedYear || itemYear === selectedYear)
        );
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

  const hasActiveFilters =
    selectedDepartment || selectedStatus || selectedMonth || selectedYear;

  const getCalendarDays = (year, monthIndex1Based) =>
    new Date(year, monthIndex1Based, 0).getDate();

  const handlePayrollMonthClick = (monthIndex) => {
    const monthValue = String(monthIndex + 1).padStart(2, '0');
    const days = getCalendarDays(selectedPayrollYear, monthIndex + 1);
    setSelectedPayrollMonth(monthIndex);
    setSelectedMonthDays(days);
    setSelectedMonth(monthValue);
    setSelectedYear(String(selectedPayrollYear));
  };

  const handleClearPayrollMonth = () => {
    setSelectedPayrollMonth(null);
    setSelectedMonthDays(null);
    setSelectedMonth('');
    setSelectedYear('');
  };

  const clearAllFilters = () => {
    setSelectedDepartment('');
    setSelectedStatus('');
    setSelectedMonth('');
    setSelectedYear('');
    setSelectedPayrollMonth(null);
    setSelectedMonthDays(null);
    setSelectedPayrollYear(currentYear);
  };

  // ── Actions ───────────────────────────────────────────────────────────────────
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
          grossAmount,
          grossSalary: grossAmount,
          h,
          m,
          s,
          netSalary: computeNetAmount(
            grossAmount,
            ratePerDay,
            h,
            m,
            sssContribution,
            pagibigContribution,
          ),
          sssContribution,
          sss: sssContribution,
          pagibigContribution,
          rh,
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
      alert(
        error.response?.data?.details ||
          error.response?.data?.error ||
          error.message ||
          'Failed to process payroll. Please try again.',
      );
    } finally {
      setProcessing(false);
      setOpenConfirm(false);
    }
  };

  const handleDeleteClick = (row) => {
    if (row.status === 1) return;
    setRecordToDelete(row);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete?.id) return;
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
      fetchPayrollData();
    } catch (err) {
      console.error('Error deleting record:', err);
      alert('Failed to delete record. Please try again.');
    } finally {
      setIsProcessingDelete(false);
    }
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

  const handleUpdateContributions = async () => {
    if (!editingRow) return;
    setIsUpdatingContributions(true);
    try {
      const updatedSSS = parseFloat(editContributions.sssContribution) || 0;
      const updatedPagibig =
        parseFloat(editContributions.pagibigContribution) || 0;
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
      setEditContributionsOpen(false);
      setEditingRow(null);
      setEditContributions({ sssContribution: '', pagibigContribution: '' });
      setSuccessAction('updating contributions');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      fetchPayrollData();
    } catch (err) {
      console.error('Error updating contributions:', err);
      alert('Failed to update contributions. Please try again.');
    } finally {
      setIsUpdatingContributions(false);
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

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // ── Access loading skeleton ───────────────────────────────────────────────────
  if (accessLoading) {
    return (
      <Box
        sx={{
          py: { xs: 1, md: 2 },
          mt: { xs: 0, md: -2 },
          width: '100vw',
          maxWidth: '100%',
          position: 'relative',
          left: '63%',
          transform: 'translateX(-61%)',
          px: { xs: 2, sm: 3, md: 6 },
          fontFamily: T.font,
        }}
      >
        <SectionCard sx={{ mb: 2 }}>
          <Box
            sx={{
              p: 3.5,
              background: T.headerGrad,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                bgcolor: alpha(T.accent, 0.14),
              }}
            />
            <Box sx={{ flex: 1 }}>
              <Box
                sx={{
                  width: 220,
                  height: 16,
                  borderRadius: 6,
                  bgcolor: alpha(T.accent, 0.12),
                  mb: 1,
                }}
              />
              <Box
                sx={{
                  width: 310,
                  height: 10,
                  borderRadius: 6,
                  bgcolor: alpha(T.accent, 0.08),
                }}
              />
            </Box>
          </Box>
        </SectionCard>
      </Box>
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

  // ── Stat cards ────────────────────────────────────────────────────────────────
  const statCards = [
    {
      label: 'Total Employees',
      value: summaryData.totalEmployees,
      icon: PeopleIcon,
      color: T.accent,
    },
    {
      label: 'Processed',
      value: summaryData.processedEmployees,
      icon: CheckCircleIcon,
      color: '#2E7D32',
    },
    {
      label: 'Unprocessed',
      value: summaryData.unprocessedEmployees,
      icon: PendingIcon,
      color: '#E65100',
    },
    {
      label: 'Total Net Amount',
      value: `₱${summaryData.totalNetAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUpIcon,
      color: T.accent,
    },
  ];

  // ── Action buttons per table row ──────────────────────────────────────────────
  const ActionButtons = ({ row }) => (
    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
      <Tooltip
        title={
          row.status === 1
            ? 'Cannot edit processed records'
            : 'Edit Contributions'
        }
      >
        <span>
          <IconButton
            size="small"
            disabled={row.status === 1}
            onClick={() => handleEditContributionsClick(row)}
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1.5,
              bgcolor: row.status === 1 ? '#f5f5f5' : T.accentFaint,
              color: row.status === 1 ? '#ccc' : T.accent,
              border: `1px solid ${row.status === 1 ? '#e0e0e0' : T.accentBorder}`,
              '&:hover': { bgcolor: T.accent, color: '#fff' },
              transition: 'all 0.15s',
            }}
          >
            <EditIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip
        title={
          row.status === 1 ? 'Cannot delete processed records' : 'Delete Record'
        }
      >
        <span>
          <IconButton
            size="small"
            disabled={row.status === 1}
            onClick={() => handleDeleteClick(row)}
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1.5,
              bgcolor: row.status === 1 ? '#f5f5f5' : alpha('#ef4444', 0.07),
              color: row.status === 1 ? '#ccc' : '#ef4444',
              border: `1px solid ${row.status === 1 ? '#e0e0e0' : 'rgba(239,68,68,0.3)'}`,
              '&:hover': { bgcolor: '#ef4444', color: '#fff' },
              transition: 'all 0.15s',
            }}
          >
            <DeleteIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        py: { xs: 1, md: 2 },
        mt: { xs: 0, md: -2 },
        width: '100vw',
        maxWidth: '100%',
        position: 'relative',
        left: '63%',
        transform: 'translateX(-61%)',
        px: { xs: 2, sm: 3, md: 6 },
        fontFamily: T.font,
        ...globalFontSx,
      }}
    >
      {/* ── Page Header ── */}
      <SectionCard sx={{ mb: 2 }}>
        <Box
          sx={{
            px: 4,
            py: 3,
            background: T.headerGrad,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
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
              background:
                'radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: -30,
              left: '30%',
              width: 150,
              height: 150,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)',
            }}
          />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Payment sx={{ fontSize: 32, color: T.accent }} />
            <Box>
              <Typography
                sx={{
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  color: T.accent,
                  lineHeight: 1.2,
                  mb: 0.3,
                  fontFamily: T.font,
                }}
              >
                Job Order Payroll
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.82rem',
                  color: T.accentMid,
                  fontWeight: 700,
                  opacity: 0.9,
                  fontFamily: T.font,
                }}
              >
                Administrative Panel • Manage and process Job Order employee
                payroll records
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Chip
              label="Job Order"
              size="small"
              sx={{
                bgcolor: alpha(T.accent, 0.12),
                color: T.accent,
                fontWeight: 600,
                fontSize: '0.72rem',
                fontFamily: T.font,
              }}
            />
            <Tooltip title="Refresh Data">
              <IconButton
                onClick={() => fetchPayrollData()}
                sx={{
                  bgcolor: alpha(T.accent, 0.08),
                  border: `1px solid ${T.accentBorder}`,
                  color: T.accent,
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  '&:hover': { bgcolor: T.accentFaint },
                }}
              >
                <Refresh sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </SectionCard>

      {/* ── Stats Strip ── */}
      <Box
        sx={{
          mb: 2,
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          gap: 1.5,
        }}
      >
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <SectionCard key={stat.label}>
              <Box
                sx={{
                  px: 2.5,
                  py: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.75,
                }}
              >
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: 2,
                    bgcolor: alpha(stat.color, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon sx={{ fontSize: 18, color: stat.color }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: 900,
                      fontSize:
                        typeof stat.value === 'string' ? '1rem' : '1.35rem',
                      color: T.text,
                      lineHeight: 1,
                      fontFamily: T.font,
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.7rem',
                      color: T.muted,
                      mt: 0.3,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontFamily: T.font,
                    }}
                  >
                    {stat.label}
                  </Typography>
                </Box>
              </Box>
            </SectionCard>
          );
        })}
      </Box>

      {/* ── Filters ── */}
      <SectionCard sx={{ mb: 2 }}>
        <Box
          sx={{
            px: 3.5,
            py: 1.5,
            borderBottom: `1px solid ${T.divider}`,
            bgcolor: T.accentFaint,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <FilterList sx={{ fontSize: 14, color: T.accent }} />
            <Typography
              sx={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: T.accent,
                fontFamily: T.font,
              }}
            >
              Search & Filter
            </Typography>
            {hasActiveFilters && (
              <Box
                sx={{
                  px: 1,
                  py: 0.2,
                  bgcolor: alpha(T.accent, 0.1),
                  border: `1px solid ${T.accentBorder}`,
                  borderRadius: '20px',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    color: T.accent,
                    fontFamily: T.font,
                  }}
                >
                  {
                    [
                      selectedDepartment,
                      selectedStatus,
                      selectedMonth,
                      selectedYear,
                    ].filter(Boolean).length
                  }{' '}
                  active
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <AccentButton
              size="small"
              variant="outlined"
              onClick={handleExportToExcel}
              disabled={filteredData.length === 0}
              startIcon={<GetApp sx={{ fontSize: 14 }} />}
              sx={{
                fontSize: '0.72rem',
                px: 1.25,
                py: 0.3,
                height: 26,
                borderColor: T.accentBorder,
                color: T.accent,
                '&:hover': {
                  bgcolor: T.accentFaint,
                  borderColor: T.accent,
                  transform: 'none',
                },
              }}
            >
              Export Excel
            </AccentButton>
            {hasActiveFilters && (
              <AccentButton
                size="small"
                onClick={clearAllFilters}
                startIcon={<Close sx={{ fontSize: 13 }} />}
                sx={{
                  fontSize: '0.72rem',
                  color: '#d32f2f',
                  border: '1px solid rgba(211,47,47,0.3)',
                  px: 1.25,
                  py: 0.3,
                  height: 26,
                  '&:hover': {
                    bgcolor: alpha('#d32f2f', 0.06),
                    transform: 'none',
                  },
                }}
              >
                Clear all
              </AccentButton>
            )}
          </Box>
        </Box>
        <Box sx={{ px: 3.5, py: 2.5 }}>
          <Box
            sx={{
              display: 'flex',
              gap: 1.5,
              flexWrap: 'wrap',
              alignItems: 'flex-end',
            }}
          >
            <FieldInput
              size="small"
              placeholder="Search by name, employee number, department…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsSearching(true);
                if (window.joSearchTimeout)
                  clearTimeout(window.joSearchTimeout);
                window.joSearchTimeout = setTimeout(
                  () => setIsSearching(false),
                  300,
                );
              }}
              disabled={isSearching}
              sx={{ minWidth: 220, flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {isSearching ? (
                      <CircularProgress size={16} sx={{ color: T.accent }} />
                    ) : (
                      <SearchIcon sx={{ color: T.faint, fontSize: 18 }} />
                    )}
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 160, flex: 1 }}>
              <InputLabel sx={{ fontSize: '0.82rem', fontFamily: T.font }}>
                Department
              </InputLabel>
              <Select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                label="Department"
                sx={filterSelectSx}
              >
                <MenuItem value="">
                  <em style={{ fontSize: '0.82rem', fontFamily: T.font }}>
                    All Departments
                  </em>
                </MenuItem>
                {departments.map((dept) => (
                  <MenuItem
                    key={dept.id}
                    value={dept.code}
                    sx={{ fontSize: '0.82rem', fontFamily: T.font }}
                  >
                    {dept.description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130, flex: '0 0 auto' }}>
              <InputLabel sx={{ fontSize: '0.82rem', fontFamily: T.font }}>
                Status
              </InputLabel>
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                label="Status"
                sx={filterSelectSx}
              >
                <MenuItem value="">
                  <em style={{ fontSize: '0.82rem', fontFamily: T.font }}>
                    All Status
                  </em>
                </MenuItem>
                <MenuItem
                  value="Processed"
                  sx={{ fontSize: '0.82rem', fontFamily: T.font }}
                >
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: '#4caf50',
                      }}
                    />
                    Processed
                  </Box>
                </MenuItem>
                <MenuItem
                  value="Unprocessed"
                  sx={{ fontSize: '0.82rem', fontFamily: T.font }}
                >
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: '#ff9800',
                      }}
                    />
                    Unprocessed
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* ── Payroll Month Quick-Filter ── */}
          <Box
            sx={{
              mt: 2,
              pt: 2,
              borderTop: `1px dashed ${alpha(T.accent, 0.15)}`,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1.5,
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarToday sx={{ fontSize: 13, color: T.accent }} />
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: T.accent,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    fontFamily: T.font,
                  }}
                >
                  Quick Month Filter
                </Typography>
                {selectedPayrollMonth !== null && (
                  <Box
                    sx={{
                      px: 1,
                      py: 0.2,
                      borderRadius: '12px',
                      bgcolor: T.accentFaint,
                      border: `1px solid ${T.accentBorder}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        color: T.accent,
                        fontFamily: T.font,
                      }}
                    >
                      {payrollMonths[selectedPayrollMonth]}{' '}
                      {selectedPayrollYear}
                      {selectedMonthDays !== null &&
                        ` · ${selectedMonthDays} days`}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FormControl size="small" sx={{ minWidth: 90 }}>
                  <Select
                    value={selectedPayrollYear}
                    onChange={(e) => {
                      const nextYear = e.target.value;
                      setSelectedPayrollYear(nextYear);
                      if (selectedPayrollMonth !== null) {
                        const days = getCalendarDays(
                          nextYear,
                          selectedPayrollMonth + 1,
                        );
                        setSelectedMonthDays(days);
                        setSelectedYear(String(nextYear));
                      }
                    }}
                    sx={{
                      ...filterSelectSx,
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      fontFamily: T.font,
                    }}
                  >
                    {payrollYearOptions.map((y) => (
                      <MenuItem
                        key={y}
                        value={y}
                        sx={{ fontSize: '0.8rem', fontFamily: T.font }}
                      >
                        {y}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {selectedPayrollMonth !== null && (
                  <AccentButton
                    size="small"
                    onClick={handleClearPayrollMonth}
                    startIcon={<Close sx={{ fontSize: 12 }} />}
                    sx={{
                      fontSize: '0.7rem',
                      color: '#d32f2f',
                      border: '1px solid rgba(211,47,47,0.3)',
                      px: 1,
                      py: 0.25,
                      height: 26,
                      '&:hover': {
                        bgcolor: alpha('#d32f2f', 0.06),
                        transform: 'none',
                      },
                    }}
                  >
                    Clear month
                  </AccentButton>
                )}
              </Box>
            </Box>

            <Box
              sx={{
                p: 1.75,
                borderRadius: 2,
                border: `2px dashed ${T.accentBorder}`,
                bgcolor: T.accentFaint,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.75,
                justifyContent: 'center',
              }}
            >
              {payrollMonths.map((month, index) => {
                const isSelected = selectedPayrollMonth === index;
                const days = getCalendarDays(selectedPayrollYear, index + 1);
                return (
                  <Box
                    key={month}
                    onClick={() => handlePayrollMonthClick(index)}
                    title={`${month} ${selectedPayrollYear} — ${days} calendar days`}
                    sx={{
                      px: 1.5,
                      py: 0.85,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      bgcolor: isSelected ? T.accent : '#fff',
                      border: `1px solid ${isSelected ? T.accent : T.accentBorder}`,
                      color: isSelected ? '#fff' : T.accent,
                      fontWeight: 700,
                      fontFamily: T.font,
                      letterSpacing: '0.04em',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected
                        ? `0 2px 8px ${alpha(T.accent, 0.28)}`
                        : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 0.2,
                      minWidth: 46,
                      '&:hover': {
                        bgcolor: isSelected ? T.accentDark : T.accentFaint,
                        borderColor: T.accent,
                        boxShadow: `0 2px 8px ${alpha(T.accent, 0.15)}`,
                      },
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        fontFamily: T.font,
                        lineHeight: 1,
                        color: 'inherit',
                      }}
                    >
                      {month}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.58rem',
                        fontWeight: 600,
                        fontFamily: T.font,
                        lineHeight: 1,
                        color: 'inherit',
                        opacity: isSelected ? 0.85 : 0.5,
                      }}
                    >
                      {days}d
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <Box
              sx={{
                display: 'flex',
                gap: 0.75,
                flexWrap: 'wrap',
                mt: 1.5,
                pt: 1.5,
                borderTop: `1px dashed ${alpha(T.accent, 0.15)}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  color: alpha(T.text, 0.5),
                  fontWeight: 600,
                  alignSelf: 'center',
                  mr: 0.25,
                  fontFamily: T.font,
                }}
              >
                Active:
              </Typography>
              {selectedDepartment && (
                <Chip
                  size="small"
                  label={`Dept: ${departments.find((d) => d.code === selectedDepartment)?.description || selectedDepartment}`}
                  onDelete={() => setSelectedDepartment('')}
                  sx={{
                    height: 22,
                    fontSize: '0.72rem',
                    bgcolor: T.accentFaint,
                    color: T.accent,
                    border: `1px solid ${T.accentBorder}`,
                    fontFamily: T.font,
                    '& .MuiChip-deleteIcon': { fontSize: 14, color: T.accent },
                  }}
                />
              )}
              {selectedStatus && (
                <Chip
                  size="small"
                  label={`Status: ${selectedStatus}`}
                  onDelete={() => setSelectedStatus('')}
                  sx={{
                    height: 22,
                    fontSize: '0.72rem',
                    fontFamily: T.font,
                    bgcolor:
                      selectedStatus === 'Processed'
                        ? alpha('#4caf50', 0.1)
                        : alpha('#ff9800', 0.1),
                    color:
                      selectedStatus === 'Processed' ? '#2e7d32' : '#e65100',
                    '& .MuiChip-deleteIcon': { fontSize: 14 },
                  }}
                />
              )}
              {selectedMonth && (
                <Chip
                  size="small"
                  label={`Month: ${monthOptions.find((m) => m.value === selectedMonth)?.label}`}
                  onDelete={() => setSelectedMonth('')}
                  sx={{
                    height: 22,
                    fontSize: '0.72rem',
                    bgcolor: T.accentFaint,
                    color: T.accent,
                    border: `1px solid ${T.accentBorder}`,
                    fontFamily: T.font,
                    '& .MuiChip-deleteIcon': { fontSize: 14, color: T.accent },
                  }}
                />
              )}
              {selectedYear && (
                <Chip
                  size="small"
                  label={`Year: ${selectedYear}`}
                  onDelete={() => setSelectedYear('')}
                  sx={{
                    height: 22,
                    fontSize: '0.72rem',
                    bgcolor: T.accentFaint,
                    color: T.accent,
                    border: `1px solid ${T.accentBorder}`,
                    fontFamily: T.font,
                    '& .MuiChip-deleteIcon': { fontSize: 14, color: T.accent },
                  }}
                />
              )}
            </Box>
          )}
        </Box>
      </SectionCard>

      {/* ── Error alert ── */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: 2, fontFamily: T.font }}
          icon={<Error />}
        >
          {error}
        </Alert>
      )}

      {/* ── Table Card ── */}
      <SectionCard
        sx={{
          mb: 2,
          overflow: 'hidden',
          '& .MuiTableHead-root .MuiTableCell-root': {
            fontSize: '0.65rem !important',
            fontFamily: `${T.font} !important`,
          },
          '& .MuiTableBody-root .MuiTableCell-root': {
            fontSize: '0.82rem !important',
            fontFamily: `${T.font} !important`,
          },
        }}
      >
        {/* Table header bar */}
        <Box
          sx={{
            px: 3.5,
            py: 2,
            borderBottom: `1px solid ${T.divider}`,
            bgcolor: T.accentFaint,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: '0.88rem',
                color: T.text,
                fontFamily: T.font,
              }}
            >
              Job Order Payroll Data
            </Typography>
            <Typography
              sx={{
                fontSize: '0.72rem',
                color: T.faint,
                mt: 0.1,
                fontFamily: T.font,
              }}
            >
              Total {filteredData.length} records · {selectedRows.length}{' '}
              selected
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {selectedRows.length > 0 && (
              <Box
                sx={{
                  px: 1.5,
                  py: 0.35,
                  bgcolor: T.accentFaint,
                  border: `1px solid ${T.accentBorder}`,
                  borderRadius: '20px',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: T.accent,
                    fontFamily: T.font,
                  }}
                >
                  {selectedRows.length} selected
                </Typography>
              </Box>
            )}
            <AccentButton
              variant="outlined"
              size="small"
              startIcon={<Refresh sx={{ fontSize: 14 }} />}
              onClick={() => fetchPayrollData()}
              sx={{
                fontSize: '0.72rem',
                px: 1.25,
                py: 0.35,
                height: 28,
                borderColor: T.accentBorder,
                color: T.accent,
                '&:hover': {
                  bgcolor: T.accentFaint,
                  borderColor: T.accent,
                  transform: 'none',
                },
              }}
            >
              Refresh
            </AccentButton>
          </Box>
        </Box>

        {/* No records state */}
        {filteredData.length === 0 && !loading && (
          <Box
            sx={{
              mx: 3.5,
              my: 2,
              py: 7,
              px: 2,
              border: `1px solid ${T.divider}`,
              borderRadius: 2,
              bgcolor: '#fff',
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                bgcolor: T.accentFaint,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <Info sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
            </Box>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: '1rem',
                color: T.muted,
                mb: 0.5,
                fontFamily: T.font,
              }}
            >
              No Records Found
            </Typography>
            <Typography
              sx={{ fontSize: '0.86rem', color: T.faint, fontFamily: T.font }}
            >
              {searchTerm
                ? 'No matching records found.'
                : 'No job order payroll records available.'}
            </Typography>
          </Box>
        )}

        {/* Table */}
        {(filteredData.length > 0 || loading) && (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{ overflowX: 'auto', borderRadius: 0, position: 'relative' }}
          >
            <Table
              sx={{
                minWidth: 2400,
                tableLayout: 'auto',
                borderCollapse: 'separate',
                borderSpacing: 0,
              }}
            >
              <TableHead>
                {/* Row 1 */}
                <TableRow sx={{ bgcolor: '#fff' }}>
                  <TableCell
                    padding="checkbox"
                    rowSpan={2}
                    sx={{
                      borderBottom: `2px solid ${T.accentBorder}`,
                      py: 1.5,
                      px: 2,
                      bgcolor: alpha(T.accent, 0.03),
                    }}
                  >
                    <Checkbox
                      size="small"
                      sx={{
                        color: T.accentBorder,
                        '&.Mui-checked': { color: T.accent },
                        p: 0,
                      }}
                      indeterminate={(() => {
                        const pageRows = filteredData.slice(
                          page * rowsPerPage,
                          page * rowsPerPage + rowsPerPage,
                        );
                        const selectable = pageRows.filter(
                          (row) =>
                            row.status !== 1 &&
                            !finalizedPayroll.some(
                              (fp) =>
                                fp.employeeNumber === row.employeeNumber &&
                                fp.startDate === row.startDate &&
                                fp.endDate === row.endDate,
                            ),
                        );
                        const selectedOnPage = selectedRows.filter((id) =>
                          selectable.some((row) => row.id === id),
                        );
                        return (
                          selectedOnPage.length > 0 &&
                          selectedOnPage.length < selectable.length
                        );
                      })()}
                      checked={(() => {
                        const pageRows = filteredData.slice(
                          page * rowsPerPage,
                          page * rowsPerPage + rowsPerPage,
                        );
                        const selectable = pageRows.filter(
                          (row) =>
                            row.status !== 1 &&
                            !finalizedPayroll.some(
                              (fp) =>
                                fp.employeeNumber === row.employeeNumber &&
                                fp.startDate === row.startDate &&
                                fp.endDate === row.endDate,
                            ),
                        );
                        if (selectable.length === 0) return false;
                        return selectable.every((row) =>
                          selectedRows.includes(row.id),
                        );
                      })()}
                      onChange={(e) => {
                        const pageRows = filteredData.slice(
                          page * rowsPerPage,
                          page * rowsPerPage + rowsPerPage,
                        );
                        const selectable = pageRows.filter(
                          (row) =>
                            row.status !== 1 &&
                            !finalizedPayroll.some(
                              (fp) =>
                                fp.employeeNumber === row.employeeNumber &&
                                fp.startDate === row.startDate &&
                                fp.endDate === row.endDate,
                            ),
                        );
                        const ids = selectable.map((row) => row.id);
                        if (e.target.checked)
                          setSelectedRows((prev) => [
                            ...new Set([...prev, ...ids]),
                          ]);
                        else
                          setSelectedRows((prev) =>
                            prev.filter((id) => !ids.includes(id)),
                          );
                      }}
                    />
                  </TableCell>
                  {[
                    ['No.', null],
                    ['Employee #', null],
                    ['Name', null],
                    ['Designation', null],
                    ['Rate/Day', null],
                    ['Department', null],
                    ['Days Covered', null],
                    ['No. of Days', null],
                    ['Official Time', null],
                  ].map(([label]) => (
                    <TableCell
                      key={label}
                      rowSpan={2}
                      sx={{
                        borderBottom: `2px solid ${T.accentBorder}`,
                        py: 1.2,
                        px: 1.5,
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        color: T.accent,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        whiteSpace: 'nowrap',
                        bgcolor: alpha(T.accent, 0.03),
                        fontFamily: T.font,
                      }}
                    >
                      {label}
                    </TableCell>
                  ))}
                  <TableCell
                    align="center"
                    colSpan={2}
                    sx={{
                      borderBottom: `2px solid ${T.accentBorder}`,
                      borderLeft: `1px solid ${T.divider}`,
                      py: 1.2,
                      px: 1.5,
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      color: T.accent,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      whiteSpace: 'nowrap',
                      bgcolor: alpha(T.accent, 0.03),
                      fontFamily: T.font,
                    }}
                  >
                    Period Rendered
                  </TableCell>
                  <TableCell
                    rowSpan={2}
                    sx={{
                      borderBottom: `2px solid ${T.accentBorder}`,
                      py: 1.2,
                      px: 1.5,
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      color: T.accent,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      whiteSpace: 'nowrap',
                      bgcolor: alpha(T.accent, 0.03),
                      fontFamily: T.font,
                    }}
                  >
                    Gross Amount
                  </TableCell>
                  <TableCell
                    align="center"
                    colSpan={3}
                    sx={{
                      borderBottom: `2px solid ${T.accentBorder}`,
                      py: 1.2,
                      px: 1.5,
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      color: T.accent,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      whiteSpace: 'nowrap',
                      bgcolor: alpha(T.accent, 0.03),
                      fontFamily: T.font,
                    }}
                  >
                    Deductions
                  </TableCell>
                  {['SSS', 'PAGIBIG', 'Net Amount'].map((h) => (
                    <TableCell
                      key={h}
                      rowSpan={2}
                      sx={{
                        borderBottom: `2px solid ${T.accentBorder}`,
                        py: 1.2,
                        px: 1.5,
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        color: T.accent,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        whiteSpace: 'nowrap',
                        bgcolor: alpha(T.accent, 0.03),
                        fontFamily: T.font,
                      }}
                    >
                      {h}
                    </TableCell>
                  ))}
                  <TableCell
                    rowSpan={2}
                    align="center"
                    sx={stickyStatusHeaderSx}
                  >
                    Status
                  </TableCell>
                  <TableCell
                    rowSpan={2}
                    align="center"
                    sx={stickyActionsHeaderSx}
                  >
                    Actions
                  </TableCell>
                </TableRow>
                {/* Row 2 */}
                <TableRow sx={{ bgcolor: '#fff' }}>
                  {['Period', 'Date/s'].map((h) => (
                    <TableCell
                      key={h}
                      sx={{
                        borderBottom: `2px solid ${T.accentBorder}`,
                        py: 1.1,
                        px: 1.5,
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        color: '#334155',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        whiteSpace: 'nowrap',
                        bgcolor: '#fff',
                        fontFamily: T.font,
                      }}
                    >
                      {h}
                    </TableCell>
                  ))}
                  {['Hrs', 'Mins', 'Total Deduction'].map((h) => (
                    <TableCell
                      key={h}
                      align="center"
                      sx={{
                        borderBottom: `2px solid ${T.accentBorder}`,
                        py: 1.1,
                        px: 1.5,
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        color: '#334155',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        whiteSpace: 'nowrap',
                        bgcolor: '#fff',
                        fontFamily: T.font,
                      }}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={24} align="center" sx={{ py: 6 }}>
                      <CircularProgress sx={{ color: T.accent }} />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row, index) => {
                      const isFinalized = finalizedPayroll.some(
                        (fp) =>
                          fp.employeeNumber === row.employeeNumber &&
                          fp.startDate === row.startDate &&
                          fp.endDate === row.endDate,
                      );
                      const totalDeduction = computeTotalDeduction(
                        row.ratePerDay,
                        row.h,
                        row.m,
                      );
                      const netAmount = computeNetAmount(
                        row.grossAmount,
                        row.ratePerDay,
                        row.h,
                        row.m,
                        row.sssContribution,
                        row.pagibigContribution,
                      );
                      return (
                        <TableRow
                          key={row.id}
                          sx={{
                            height: FROZEN_ROW_HEIGHT,
                            bgcolor: index % 2 === 0 ? T.rowEven : T.rowOdd,
                            '&:hover': { bgcolor: `${T.rowHover} !important` },
                            transition: 'background-color 0.12s',
                            borderBottom: `1px solid ${T.divider}`,
                          }}
                        >
                          <TableCell
                            padding="checkbox"
                            sx={{ borderBottom: 'none', py: 1.5, px: 2 }}
                          >
                            <Checkbox
                              size="small"
                              checked={selectedRows.includes(row.id)}
                              disabled={isFinalized}
                              onChange={(e) => {
                                if (isFinalized) return;
                                e.stopPropagation();
                                if (selectedRows.includes(row.id))
                                  setSelectedRows((prev) =>
                                    prev.filter((id) => id !== row.id),
                                  );
                                else
                                  setSelectedRows((prev) => [...prev, row.id]);
                              }}
                              sx={{
                                color: T.accentBorder,
                                '&.Mui-checked': { color: T.accent },
                                p: 0,
                              }}
                            />
                          </TableCell>
                          <ExcelTableCell
                            sx={{ borderBottom: 'none', color: T.muted }}
                          >
                            {page * rowsPerPage + index + 1}
                          </ExcelTableCell>
                          <ExcelTableCell
                            sx={{
                              borderBottom: 'none',
                              fontFamily: 'monospace',
                              fontWeight: 600,
                            }}
                          >
                            {row.employeeNumber || '—'}
                          </ExcelTableCell>
                          <ExcelTableCell
                            sx={{ borderBottom: 'none', fontWeight: 600 }}
                          >
                            {row.name || '—'}
                          </ExcelTableCell>
                          <ExcelTableCell sx={{ borderBottom: 'none' }}>
                            {row.position || '—'}
                          </ExcelTableCell>
                          <ExcelTableCell sx={{ borderBottom: 'none' }}>
                            {row.ratePerDay
                              ? formatCurrency(row.ratePerDay)
                              : '—'}
                          </ExcelTableCell>
                          <ExcelTableCell sx={{ borderBottom: 'none' }}>
                            {row.department || '—'}
                          </ExcelTableCell>
                          <ExcelTableCell sx={{ borderBottom: 'none' }}>
                            {row.days || '—'}
                          </ExcelTableCell>
                          <ExcelTableCell
                            sx={{ borderBottom: 'none', textAlign: 'center' }}
                          >
                            {row.numberOfDays || '—'}
                          </ExcelTableCell>
                          <ExcelTableCell
                            sx={{ borderBottom: 'none', minWidth: 160 }}
                          >
                            {row.officialTime || '—'}
                          </ExcelTableCell>
                          <ExcelTableCell
                            sx={{ borderBottom: 'none', minWidth: 90 }}
                          >
                            {row.rh ? (
                              <Box>
                                <Typography
                                  sx={{
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    fontFamily: T.font,
                                    lineHeight: 1.2,
                                  }}
                                >
                                  {Math.floor(parseFloat(row.rh) / 8)}d{' '}
                                  {parseFloat(row.rh) % 8}h
                                </Typography>
                              </Box>
                            ) : (
                              '—'
                            )}
                          </ExcelTableCell>
                          <ExcelTableCell
                            sx={{ borderBottom: 'none', minWidth: 180 }}
                          >
                            {row.renderedDays || '—'}
                          </ExcelTableCell>
                          <ExcelTableCell
                            sx={{
                              borderBottom: 'none',
                              fontWeight: 700,
                              color: T.accent,
                            }}
                          >
                            {row.grossAmount
                              ? formatCurrency(row.grossAmount)
                              : '—'}
                          </ExcelTableCell>
                          <ExcelTableCell
                            sx={{ borderBottom: 'none', textAlign: 'center' }}
                          >
                            {row.h || 0}
                          </ExcelTableCell>
                          <ExcelTableCell
                            sx={{ borderBottom: 'none', textAlign: 'center' }}
                          >
                            {row.m || 0}
                          </ExcelTableCell>
                          <ExcelTableCell
                            sx={{
                              borderBottom: 'none',
                              fontWeight: 700,
                              color: '#d32f2f',
                            }}
                          >
                            {fmt(totalDeduction)}
                          </ExcelTableCell>
                          <ExcelTableCell sx={{ borderBottom: 'none' }}>
                            {row.sssContribution
                              ? formatCurrency(row.sssContribution)
                              : '—'}
                          </ExcelTableCell>
                          <ExcelTableCell sx={{ borderBottom: 'none' }}>
                            {row.pagibigContribution
                              ? formatCurrency(row.pagibigContribution)
                              : '—'}
                          </ExcelTableCell>
                          <ExcelTableCell
                            sx={{
                              borderBottom: 'none',
                              fontWeight: 800,
                              color: '#2e7d32',
                            }}
                          >
                            {fmt(netAmount)}
                          </ExcelTableCell>
                          {/* Sticky status */}
                          <ExcelTableCell sx={getStickyStatusBodySx(index)}>
                            <StatusChip status={row.status} />
                          </ExcelTableCell>
                          {/* Sticky actions */}
                          <ExcelTableCell sx={getStickyActionsBodySx(index)}>
                            <ActionButtons row={row} />
                          </ExcelTableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Pagination */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: `1px solid ${T.divider}`,
            px: 3.5,
            py: 0.5,
            bgcolor: T.accentFaint,
          }}
        >
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Typography
              sx={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: T.text,
                fontFamily: T.font,
              }}
            >
              Total: {filteredData.length}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: T.accent,
                fontFamily: T.font,
              }}
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
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: T.muted,
                  fontFamily: T.font,
                },
            }}
          />
        </Box>
      </SectionCard>

      {/* ── Bottom spacing ── */}
      <Box sx={{ mb: 12 }} />

      {/* ── Floating Export Bar ── */}
      <Portal>
        <Box
          sx={{
            position: 'fixed',
            bottom: { xs: '58px', md: '56px' },
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
                width: 'min(720px, calc(100vw - 32px))',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 1.5,
                flexWrap: 'wrap',
                px: 2.5,
                py: 2,
                borderRadius: '16px 16px 0 0',
                border: `1px solid ${T.accentBorder}`,
                borderBottom: 'none',
                bgcolor: T.surface,
                boxShadow: `0 -4px 24px ${alpha(T.accent, 0.12)}`,
              }}
            >
              <Box
                sx={{
                  px: 1.5,
                  py: 0.5,
                  bgcolor: T.accentFaint,
                  border: `1px solid ${T.accentBorder}`,
                  borderRadius: '20px',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: T.accent,
                    fontFamily: T.font,
                  }}
                >
                  Selected: {selectedRows.length}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }} />
              <AccentButton
                variant="outlined"
                onClick={() => setSelectedRows([])}
                sx={{
                  borderColor: T.accentBorder,
                  color: T.muted,
                  fontSize: '0.82rem',
                  px: 2,
                  '&:hover': {
                    bgcolor: T.accentFaint,
                    borderColor: T.accent,
                    color: T.accent,
                  },
                }}
              >
                Cancel
              </AccentButton>
              <AccentButton
                variant="contained"
                onClick={() => setOpenConfirm(true)}
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
                startIcon={<ExitToApp sx={{ fontSize: '16px !important' }} />}
                sx={{
                  bgcolor: T.accent,
                  color: '#fff',
                  px: 2.5,
                  fontWeight: 700,
                  boxShadow: `0 4px 14px ${alpha(T.accent, 0.35)}`,
                  '&:hover': { bgcolor: T.accentDark },
                  '&:disabled': {
                    bgcolor: alpha(T.accent, 0.25),
                    color: alpha('#fff', 0.5),
                  },
                }}
              >
                Export Payroll Records
              </AccentButton>
            </Box>
          </Slide>
        </Box>
      </Portal>

      {/* ── Edit Contributions Modal ── */}
      <Modal
        open={editContributionsOpen}
        onClose={() => {
          setEditContributionsOpen(false);
          setEditingRow(null);
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: 480 },
            bgcolor: '#f7f8fa',
            borderRadius: 3,
            boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
            overflow: 'hidden',
            border: `2px solid ${T.accentBorder}`,
            fontFamily: T.font,
          }}
        >
          <Box
            sx={{
              height: 4,
              background: `linear-gradient(90deg, ${T.accent} 0%, ${T.accentMid} 100%)`,
            }}
          />
          <Box
            sx={{
              px: 3.5,
              py: 2.5,
              background: T.headerGrad,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${T.divider}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2,
                  bgcolor: T.accentFaint,
                  border: `1px solid ${T.accentBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <EditIcon sx={{ fontSize: 18, color: T.accent }} />
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontWeight: 700,
                    color: T.text,
                    fontSize: '0.95rem',
                    fontFamily: T.font,
                  }}
                >
                  Edit Contributions
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.72rem',
                    color: T.muted,
                    mt: 0.2,
                    fontFamily: T.font,
                  }}
                >
                  {editingRow?.name} — Employee #{editingRow?.employeeNumber}
                </Typography>
              </Box>
            </Box>
            <IconButton
              size="small"
              onClick={() => {
                setEditContributionsOpen(false);
                setEditingRow(null);
              }}
              sx={{ color: T.muted }}
            >
              <Close sx={{ fontSize: 17 }} />
            </IconButton>
          </Box>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FieldInput
                  fullWidth
                  size="small"
                  label="SSS Contribution"
                  type="number"
                  value={editContributions.sssContribution}
                  onChange={(e) =>
                    setEditContributions({
                      ...editContributions,
                      sssContribution: e.target.value,
                    })
                  }
                  inputProps={{ step: '0.01', min: '0' }}
                />
              </Grid>
              <Grid item xs={12}>
                <FieldInput
                  fullWidth
                  size="small"
                  label="PAGIBIG Contribution"
                  type="number"
                  value={editContributions.pagibigContribution}
                  onChange={(e) =>
                    setEditContributions({
                      ...editContributions,
                      pagibigContribution: e.target.value,
                    })
                  }
                  inputProps={{ step: '0.01', min: '0' }}
                />
              </Grid>
            </Grid>
          </Box>
          <Box
            sx={{
              px: 3,
              py: 2.5,
              borderTop: `1px solid ${T.divider}`,
              bgcolor: T.accentFaint,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 1.25,
            }}
          >
            <AccentButton
              variant="outlined"
              onClick={() => {
                setEditContributionsOpen(false);
                setEditingRow(null);
              }}
              sx={{
                fontSize: '0.8rem',
                borderColor: T.accentBorder,
                color: T.muted,
                '&:hover': {
                  bgcolor: T.accentFaint,
                  borderColor: T.accent,
                  color: T.accent,
                },
              }}
            >
              Cancel
            </AccentButton>
            <AccentButton
              variant="contained"
              onClick={handleUpdateContributions}
              disabled={isUpdatingContributions}
              startIcon={
                isUpdatingContributions ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <SaveIcon sx={{ fontSize: '14px !important' }} />
                )
              }
              sx={{
                fontSize: '0.8rem',
                bgcolor: T.accent,
                color: '#fff',
                boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`,
                '&:hover': { bgcolor: T.accentDark },
              }}
            >
              {isUpdatingContributions ? 'Saving…' : 'Save Changes'}
            </AccentButton>
          </Box>
        </Box>
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setRecordToDelete(null);
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: 480 },
            bgcolor: T.surface,
            borderRadius: 3,
            boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
            overflow: 'hidden',
            border: `2px solid ${T.accentBorder}`,
            fontFamily: T.font,
          }}
        >
          <Box
            sx={{
              height: 4,
              background: 'linear-gradient(90deg, #d32f2f 0%, #ef5350 100%)',
            }}
          />
          <Box
            sx={{
              px: 3.5,
              py: 2.5,
              background: T.headerGrad,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${T.divider}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2,
                  bgcolor: alpha('#d32f2f', 0.08),
                  border: '1px solid rgba(211,47,47,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <DeleteForever sx={{ fontSize: 18, color: '#d32f2f' }} />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: T.text,
                      fontSize: '0.95rem',
                      fontFamily: T.font,
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
                      fontSize: '0.6rem',
                      height: 18,
                      border: '1px solid rgba(211,47,47,0.2)',
                      fontFamily: T.font,
                    }}
                  />
                </Box>
                <Typography
                  sx={{
                    fontSize: '0.72rem',
                    color: T.muted,
                    mt: 0.2,
                    fontFamily: T.font,
                  }}
                >
                  This action cannot be undone
                </Typography>
              </Box>
            </Box>
            <IconButton
              size="small"
              onClick={() => {
                setDeleteDialogOpen(false);
                setRecordToDelete(null);
              }}
              sx={{ color: T.muted }}
            >
              <Close sx={{ fontSize: 17 }} />
            </IconButton>
          </Box>
          <Box sx={{ p: 3 }}>
            <Box
              sx={{
                p: 2,
                bgcolor: T.accentFaint,
                borderRadius: 2,
                border: `1px solid ${T.accentBorder}`,
                mb: 2,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.68rem',
                  color: T.faint,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontFamily: T.font,
                }}
              >
                Employee Record
              </Typography>
              <Typography
                sx={{
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: T.text,
                  fontFamily: T.font,
                }}
              >
                {recordToDelete?.name}
              </Typography>
              <Typography
                sx={{ fontSize: '0.78rem', color: T.muted, fontFamily: T.font }}
              >
                Employee #{recordToDelete?.employeeNumber}
              </Typography>
            </Box>
            <Box
              sx={{
                p: 2,
                bgcolor: alpha('#d32f2f', 0.05),
                borderRadius: 2,
                border: '1px solid rgba(211,47,47,0.15)',
                borderLeft: '4px solid rgba(211,47,47,0.5)',
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
                  color: alpha(T.text, 0.75),
                  fontWeight: 600,
                  lineHeight: 1.65,
                  fontFamily: T.font,
                }}
              >
                This record will be permanently removed from all payroll
                reports.
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              px: 3,
              py: 2.5,
              borderTop: `1px solid ${T.divider}`,
              bgcolor: T.accentFaint,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 1.25,
            }}
          >
            <AccentButton
              variant="outlined"
              onClick={() => {
                setDeleteDialogOpen(false);
                setRecordToDelete(null);
              }}
              sx={{
                fontSize: '0.8rem',
                borderColor: T.accentBorder,
                color: T.muted,
                '&:hover': {
                  bgcolor: T.accentFaint,
                  borderColor: T.accent,
                  color: T.accent,
                },
              }}
            >
              Cancel
            </AccentButton>
            <AccentButton
              variant="contained"
              onClick={handleDeleteConfirm}
              disabled={isProcessingDelete}
              startIcon={
                isProcessingDelete ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <DeleteForever sx={{ fontSize: '14px !important' }} />
                )
              }
              sx={{
                fontSize: '0.8rem',
                bgcolor: '#d32f2f',
                color: '#fff',
                boxShadow: '0 2px 10px rgba(211,47,47,0.3)',
                '&:hover': { bgcolor: '#c62828' },
                '&:disabled': { bgcolor: alpha('#d32f2f', 0.25) },
              }}
            >
              {isProcessingDelete ? 'Deleting…' : 'Confirm Delete'}
            </AccentButton>
          </Box>
        </Box>
      </Modal>

      {/* ── Export Confirmation Modal ── */}
      <Modal
        open={openConfirm}
        onClose={() => {
          setOpenConfirm(false);
          setConfirmChecked(false);
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: 480 },
            bgcolor: T.surface,
            borderRadius: 3,
            boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
            overflow: 'hidden',
            border: `2px solid ${T.accentBorder}`,
            fontFamily: T.font,
          }}
        >
          <Box
            sx={{
              height: 4,
              background: `linear-gradient(90deg, ${T.accent} 0%, ${T.accentMid} 100%)`,
            }}
          />
          <Box
            sx={{
              px: 3.5,
              py: 2.5,
              background: T.headerGrad,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              borderBottom: `1px solid ${T.divider}`,
            }}
          >
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                bgcolor: T.accentFaint,
                border: `1px solid ${T.accentBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Payment sx={{ fontSize: 18, color: T.accent }} />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontWeight: 700,
                  color: T.text,
                  fontSize: '0.95rem',
                  lineHeight: 1.2,
                  fontFamily: T.font,
                }}
              >
                Confirm Export to Payroll Processed
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.72rem',
                  color: T.muted,
                  mt: 0.2,
                  fontFamily: T.font,
                }}
              >
                Final confirmation required
              </Typography>
            </Box>
          </Box>
          <Box sx={{ p: 3 }}>
            <Alert
              severity="info"
              sx={{
                mb: 2.5,
                borderRadius: 2,
                bgcolor: T.accentFaint,
                border: `1px solid ${T.accentBorder}`,
                '& .MuiAlert-icon': { color: T.accent },
              }}
            >
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  mb: 0.25,
                  color: T.text,
                  fontFamily: T.font,
                }}
              >
                Export {selectedRows.length} Payroll Record(s)
              </Typography>
              <Typography
                sx={{ fontSize: '0.78rem', color: T.muted, fontFamily: T.font }}
              >
                Please review all selected records before proceeding.
              </Typography>
            </Alert>
            <Box
              onClick={() => setConfirmChecked((p) => !p)}
              sx={{
                p: 2.5,
                bgcolor: T.accentFaint,
                borderRadius: 2,
                border: `2px solid ${confirmChecked ? T.accent : T.divider}`,
                mb: 2.5,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
            >
              <Checkbox
                checked={confirmChecked}
                onChange={(e) => setConfirmChecked(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                sx={{
                  color: T.accentBorder,
                  '&.Mui-checked': { color: T.accent },
                  mt: -0.5,
                  p: 0,
                }}
              />
              <Box>
                <Typography
                  sx={{
                    fontWeight: 600,
                    color: T.text,
                    fontSize: '0.875rem',
                    mb: 0.5,
                    fontFamily: T.font,
                  }}
                >
                  I confirm that all selected records have been reviewed
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    color: T.muted,
                    fontFamily: T.font,
                  }}
                >
                  This will finalize and export the selected records to payroll
                  processing and cannot be undone.
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.25 }}
            >
              <AccentButton
                variant="outlined"
                onClick={() => {
                  setOpenConfirm(false);
                  setConfirmChecked(false);
                }}
                sx={{
                  fontSize: '0.8rem',
                  borderColor: T.accentBorder,
                  color: T.muted,
                  '&:hover': {
                    bgcolor: T.accentFaint,
                    borderColor: T.accent,
                    color: T.accent,
                  },
                }}
              >
                Cancel
              </AccentButton>
              <AccentButton
                variant="contained"
                disabled={!confirmChecked}
                onClick={() => {
                  setOpenConfirm(false);
                  setConfirmChecked(false);
                  handleExportToFinalized();
                }}
                sx={{
                  fontSize: '0.8rem',
                  bgcolor: T.accent,
                  color: '#fff',
                  boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`,
                  '&:hover': { bgcolor: T.accentDark },
                  '&:disabled': { bgcolor: '#e0e0e0', color: '#9e9e9e' },
                }}
              >
                Confirm & Export
              </AccentButton>
            </Box>
          </Box>
        </Box>
      </Modal>

      <LoadingOverlay
        open={loadingOverlay}
        message="Processing payroll records…"
      />
      <SuccessfulOverlay
        open={successOpen}
        action={successAction}
        onClose={() => setSuccessOpen(false)}
      />
    </Box>
  );
};

export default PayrollJO;
