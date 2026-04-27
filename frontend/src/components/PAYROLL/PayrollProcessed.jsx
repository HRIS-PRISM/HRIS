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
  CalendarToday,
  Close,
  Visibility,
  Compare,
  Edit as EditIcon,
} from '@mui/icons-material';
import {
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Modal,
  Avatar,
  Fade,
  styled,
  Snackbar,
  Checkbox,
  Badge,
  alpha,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import TextField from '@mui/material/TextField';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import PendingIcon from '@mui/icons-material/Pending';

// ─── Unified Design Tokens (matching PayrollProcess) ─────────────────────────
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

const payrollShimmerKeyframes = `
@keyframes payrollShimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes payrollPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.62; }
}
`;

const FROZEN_ROW_HEIGHT = 56;
const STICKY_ACTIONS_WIDTH = 138;

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
    '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: T.text },
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

const globalFontSx = {
  '& *': { fontFamily: `${T.font} !important` },
};

const ExcelTableCell = ({ children, header, ...props }) => (
  <TableCell
    {...props}
    sx={{
      whiteSpace: 'nowrap',
      fontSize: '0.9rem',
      fontFamily: T.font,
      ...props.sx,
    }}
  >
    {children}
  </TableCell>
);

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

const PayrollProcessed = () => {
  const { settings } = useSystemSettings();
  const { hasAccess, loading: accessLoading } = usePageAccess('payroll-processed');

  const [finalizedData, setFinalizedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [confidentialPasswordInput, setConfidentialPasswordInput] = useState('');
  const [openConfidentialPassword, setOpenConfidentialPassword] = useState(false);
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
  const [payrollFormulasData, setPayrollFormulasData] = useState([]);
  const [activePayrollView, setActivePayrollView] = useState('FULL_VIEW');
  const [openViewModal, setOpenViewModal] = useState(false);
  const [viewRow, setViewRow] = useState(null);

  // ── Payroll Month Filter State ──────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const payrollYearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);
  const payrollMonths = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const [selectedPayrollYear, setSelectedPayrollYear] = useState(currentYear);
  const [selectedPayrollMonth, setSelectedPayrollMonth] = useState(null);
  const [selectedMonthDays, setSelectedMonthDays] = useState(null);

  const getCalendarDays = (year, month1based) => new Date(year, month1based, 0).getDate();

  const fetchPayrollFormulasData = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/payroll-formulas`, getAuthHeaders());
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
      <Box sx={{ maxWidth: 320, p: 0.5, fontFamily: T.font }}>
        <Typography variant="body2" sx={{ fontWeight: 700, mb: formulaInfo ? 0.5 : 0, fontFamily: T.font }}>
          {fullName}
        </Typography>
        {formulaInfo && (
          <>
            <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 1, px: 1, py: 0.5, mt: 0.5, wordBreak: 'break-all' }}>
              {formulaInfo.readable}
            </Typography>
            {formulaInfo.description && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.85, fontFamily: T.font }}>
                {formulaInfo.description}
              </Typography>
            )}
          </>
        )}
      </Box>
    );
    return (
      <Tooltip title={tooltipContent} arrow placement="top">
        <span style={{ cursor: 'help', display: 'inline-block' }}>{children}</span>
      </Tooltip>
    );
  };

  const StatusChip = ({ status }) => (
    <Chip
      label={status || 'Processed'}
      size="small"
      sx={{
        fontWeight: 700,
        fontSize: '0.65rem',
        fontFamily: T.font,
        bgcolor: alpha('#4caf50', 0.12),
        color: '#2e7d32',
        border: `1px solid ${alpha('#4caf50', 0.3)}`,
      }}
    />
  );

  const monthOptions = [
    { value: '', label: 'All Months' },
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' }, { value: '04', label: 'April' },
    { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' },
    { value: '09', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ];

  const yearOptions = [
    { value: '', label: 'All Years' },
    { value: '2024', label: '2024' }, { value: '2025', label: '2025' }, { value: '2026', label: '2026' },
  ];

  const normalizeDateString = (dateInput) => {
    try {
      if (!dateInput) return '';
      const d = new Date(dateInput);
      if (Number.isNaN(d.getTime())) return String(dateInput);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (_) { return String(dateInput); }
  };

  const getRecordKey = (record) => {
    const emp = record?.employeeNumber ?? '';
    const start = normalizeDateString(record?.startDate);
    const end = normalizeDateString(record?.endDate);
    return `${emp}-${start}-${end}`;
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  };

  const REGULAR_CATEGORIES = [2, 3, 4, -1];

  const fetchFinalizedPayroll = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/PayrollRoute/payroll-processed`, getAuthHeaders());
      const regularData = (Array.isArray(res.data) ? res.data : []).filter((item) => REGULAR_CATEGORIES.includes(item.employmentCategory));
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
      const res = await axios.get(`${API_BASE_URL}/PayrollReleasedRoute/released-payroll`, getAuthHeaders());
      const releasedKeys = new Set();
      if (Array.isArray(res.data)) res.data.forEach((record) => releasedKeys.add(getRecordKey(record)));
      setReleasedIdSet(releasedKeys);
    } catch (err) { console.error('Error fetching released payroll:', err); }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/department-table`, getAuthHeaders());
      setDepartments(response.data);
    } catch (err) { console.error('Error fetching departments:', err); }
  };

  usePayrollRealtimeRefresh(() => {
    fetchDepartments();
    fetchFinalizedPayroll();
    fetchReleasedPayroll();
    fetchPayrollFormulasData();
  });

  useEffect(() => { fetchDepartments(); }, []);
  useEffect(() => { fetchFinalizedPayroll(); }, []);
  useEffect(() => { fetchReleasedPayroll(); }, []);
  useEffect(() => { fetchPayrollFormulasData(); }, []);

  useEffect(() => {
    if (filteredFinalizedData.length > 0 && releasedIdSet.size > 0) {
      const totalReleased = filteredFinalizedData.filter((record) => releasedIdSet.has(getRecordKey(record))).length;
      setSummaryData((prev) => ({ ...prev, totalReleased }));
    } else if (filteredFinalizedData.length > 0 && releasedIdSet.size === 0) {
      setSummaryData((prev) => ({ ...prev, totalReleased: 0 }));
    }
  }, [filteredFinalizedData, releasedIdSet]);

  const applyFilters = (department, search, filterDate, month, year, baseData = finalizedData) => {
    let filtered = [...baseData];
    if (department) filtered = filtered.filter((r) => r.department === department);
    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter((r) => (r.name || '').toLowerCase().includes(lower) || (r.employeeNumber || '').toString().toLowerCase().includes(lower));
    }
    if (filterDate) {
      filtered = filtered.filter((record) => {
        const startDate = new Date(record.startDate);
        const endDate = new Date(record.endDate);
        const sel = new Date(filterDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        sel.setHours(12, 0, 0, 0);
        return sel >= startDate && sel <= endDate;
      });
    }
    if (month && month !== '') {
      filtered = filtered.filter((r) => {
        if (r.startDate) {
          const d = new Date(r.startDate);
          return String(d.getMonth() + 1).padStart(2, '0') === month;
        }
        return false;
      });
    }
    if (year && year !== '') {
      filtered = filtered.filter((r) => {
        if (r.startDate) return new Date(r.startDate).getFullYear().toString() === year;
        return false;
      });
    }
    setFilteredFinalizedData(filtered);
    setPage(0);
    const totalNet = filtered.reduce((sum, item) => sum + parseFloat(item.netSalary || 0), 0);
    const totalReleasedFiltered = filtered.filter((r) => releasedIdSet.has(getRecordKey(r))).length;
    setSummaryData((prev) => ({
      ...prev,
      totalEmployees: filtered.length,
      processedEmployees: filtered.length,
      totalReleased: totalReleasedFiltered,
      totalNetSalary: totalNet,
    }));
  };

  const handlePayrollMonthClick = (monthIndex) => {
    const year = selectedPayrollYear;
    const month = monthIndex + 1;
    const days = getCalendarDays(year, month);
    const pad = (n) => String(n).padStart(2, '0');
    const rangeStart = `${year}-${pad(month)}-01`;
    const rangeEnd = `${year}-${pad(month)}-${pad(days)}`;
    setSelectedPayrollMonth(monthIndex);
    setSelectedMonthDays(days);
    let base = [...finalizedData];
    if (selectedDepartment) base = base.filter((r) => r.department === selectedDepartment);
    const monthFiltered = base.filter((r) => {
      if (!r.startDate) return false;
      return r.startDate >= rangeStart && r.startDate <= rangeEnd;
    });
    setFilteredFinalizedData(monthFiltered);
    setPage(0);
    const totalNet = monthFiltered.reduce((sum, item) => sum + parseFloat(item.netSalary || 0), 0);
    const totalReleasedFiltered = monthFiltered.filter((r) => releasedIdSet.has(getRecordKey(r))).length;
    setSummaryData((prev) => ({
      ...prev,
      totalEmployees: monthFiltered.length,
      processedEmployees: monthFiltered.length,
      totalReleased: totalReleasedFiltered,
      totalNetSalary: totalNet,
    }));
  };

  const handleClearPayrollMonth = () => {
    setSelectedPayrollMonth(null);
    setSelectedMonthDays(null);
    applyFilters(selectedDepartment, searchTerm, selectedDate, selectedMonth, selectedYear);
  };

  const hasActiveFilters = selectedDepartment || selectedDate || selectedMonth || selectedYear || searchTerm;

  const clearAllFilters = () => {
    setSelectedDepartment('');
    setSelectedDate('');
    setSelectedMonth('');
    setSelectedYear('');
    setSearchTerm('');
    setSelectedPayrollMonth(null);
    setSelectedMonthDays(null);
    setFilteredFinalizedData(finalizedData);
    setPage(0);
  };

  const handleDepartmentChange = (event) => {
    const v = event.target.value;
    setSelectedDepartment(v);
    applyFilters(v, searchTerm, selectedDate, selectedMonth, selectedYear);
  };
  const handleSearchChange = (event) => {
    const term = event.target.value;
    setSearchTerm(term);
    applyFilters(selectedDepartment, term, selectedDate, selectedMonth, selectedYear);
  };
  const handleDateChange = (event) => {
    const v = event.target.value;
    setSelectedDate(v);
    applyFilters(selectedDepartment, searchTerm, v, selectedMonth, selectedYear);
  };
  const handleMonthChange = (event) => {
    const v = event.target.value;
    setSelectedMonth(v);
    applyFilters(selectedDepartment, searchTerm, selectedDate, v, selectedYear);
  };
  const handleYearChange = (event) => {
    const v = event.target.value;
    setSelectedYear(v);
    applyFilters(selectedDepartment, searchTerm, selectedDate, selectedMonth, v);
  };

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDelete = async (rowId) => {
    setOverlayLoading(true);
    try {
      setFinalizedData((prev) => prev.filter((item) => item.id !== rowId));
      setFilteredFinalizedData((prev) => prev.filter((item) => item.id !== rowId));
      await axios.delete(`${API_BASE_URL}/PayrollRoute/payroll-processed/${rowId}`, getAuthHeaders());
      setTimeout(() => {
        setOverlayLoading(false);
        setSuccessAction('delete');
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2500);
      }, 2500);
    } catch (error) {
      console.error('Error deleting payroll data:', error);
      setOverlayLoading(false);
      const res = await axios.get(`${API_BASE_URL}/PayrollRoute/payroll-processed`, getAuthHeaders());
      const regularData = (Array.isArray(res.data) ? res.data : []).filter((item) => REGULAR_CATEGORIES.includes(item.employmentCategory));
      setFinalizedData(regularData);
      setFilteredFinalizedData(regularData);
      alert('Failed to delete record. Please try again.');
    }
  };

  const initiateDelete = (rowOrIds) => {
    if (Array.isArray(rowOrIds)) {
      const hasReleased = rowOrIds.some((id) => {
        const record = filteredFinalizedData.find((item) => item.id === id);
        if (!record) return false;
        return releasedIdSet.has(getRecordKey(record));
      });
      if (hasReleased) { alert('Cannot delete records that are already released.'); return; }
      setSelectedRow({ isBulk: true, ids: rowOrIds });
    } else {
      const key = getRecordKey(rowOrIds);
      if (releasedIdSet.has(key)) { alert('This record is already released and cannot be deleted.'); return; }
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
      const response = await axios.post(
        `${API_BASE_URL}/api/confidential-password/verify`,
        { password: confidentialPasswordInput },
        getAuthHeaders(),
      );
      if (response.data.verified) {
        setOpenConfidentialPassword(false);
        setConfidentialPasswordInput('');
        setOverlayLoading(true);
        try {
          if (selectedRow.isBulk) {
            const deletableIds = selectedRow.ids.filter((id) => {
              const record = filteredFinalizedData.find((item) => item.id === id);
              if (!record) return false;
              return !releasedIdSet.has(getRecordKey(record));
            });
            if (deletableIds.length === 0) { setOverlayLoading(false); alert('All selected records are already released and cannot be deleted.'); return; }
            setFinalizedData((prev) => prev.filter((item) => !deletableIds.includes(item.id)));
            setFilteredFinalizedData((prev) => prev.filter((item) => !deletableIds.includes(item.id)));
            await Promise.all(deletableIds.map((id) => axios.delete(`${API_BASE_URL}/PayrollRoute/payroll-processed/${id}`, getAuthHeaders())));
            setTimeout(() => {
              setOverlayLoading(false);
              setSuccessAction('delete');
              setSuccessOpen(true);
              setTimeout(() => setSuccessOpen(false), 2500);
            }, 2500);
            setSelectedRows([]);
          } else {
            const key = getRecordKey(selectedRow);
            if (releasedIdSet.has(key)) { setOverlayLoading(false); alert('This record is already released and cannot be deleted.'); return; }
            setFinalizedData((prev) => prev.filter((item) => item.id !== selectedRow.id));
            setFilteredFinalizedData((prev) => prev.filter((item) => item.id !== selectedRow.id));
            await axios.delete(
              `${API_BASE_URL}/PayrollRoute/payroll-processed/${selectedRow.id}`,
              { ...getAuthHeaders(), data: { employeeNumber: selectedRow.employeeNumber, name: selectedRow.name } },
            );
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
          alert('Failed to delete record(s). Please try again.');
        } finally { setSelectedRow(null); }
      } else {
        setSnackbarMessage('Password verification failed. Please try again.');
        setSnackbarOpen(true);
        setConfidentialPasswordInput('');
      }
    } catch (error) {
      console.error('Error verifying confidential password:', error);
      setSnackbarMessage(error.response?.data?.error || 'Failed to verify password. Please try again.');
      setSnackbarOpen(true);
      setConfidentialPasswordInput('');
    }
  };

  const handleConfidentialPasswordCancel = () => {
    setOpenConfidentialPassword(false);
    setConfidentialPasswordInput('');
    setSelectedRow(null);
  };

  const handleViewRecord = (row) => {
    setViewRow(row);
    setOpenViewModal(true);
  };

  const handleCloseViewModal = () => {
    setOpenViewModal(false);
    setViewRow(null);
  };

  const handleReleasePayroll = async () => {
    if (selectedRows.length === 0) { alert('Please select payroll records to release.'); return; }
    setOpenReleaseConfirm(false);
    setOverlayLoading(true);
    try {
      const unreleasedSelectedIds = selectedRows.filter((id) => {
        const record = finalizedData.find((item) => item.id === id) || filteredFinalizedData.find((item) => item.id === id);
        if (!record) return false;
        return !releasedIdSet.has(getRecordKey(record));
      });
      if (unreleasedSelectedIds.length === 0) { alert('All selected records are already released.'); setOverlayLoading(false); return; }
      const keysToAdd = unreleasedSelectedIds.map((id) => {
        const record = finalizedData.find((item) => item.id === id) || filteredFinalizedData.find((item) => item.id === id);
        if (!record) return null;
        return getRecordKey(record);
      }).filter(Boolean);
      const response = await axios.post(
        `${API_BASE_URL}/PayrollReleasedRoute/release-payroll`,
        { payrollIds: unreleasedSelectedIds, releasedBy: localStorage.getItem('username') || 'System' },
        getAuthHeaders(),
      );
      if (response.data) {
        setFinalizedData((prev) => prev.filter((item) => !unreleasedSelectedIds.includes(item.id)));
        setFilteredFinalizedData((prev) => prev.filter((item) => !unreleasedSelectedIds.includes(item.id)));
        setReleasedIdSet((prev) => new Set([...(prev instanceof Set ? Array.from(prev) : []), ...keysToAdd]));
        setSelectedRows((prev) => prev.filter((id) => !unreleasedSelectedIds.includes(id)));
        setTimeout(() => {
          setOverlayLoading(false);
          setSuccessAction('release');
          setSuccessOpen(true);
          setTimeout(() => { setSuccessOpen(false); window.location.href = '/payroll-released'; }, 2500);
        }, 2500);
      }
    } catch (error) {
      console.error('Error releasing payroll:', error);
      setOverlayLoading(false);
      alert('Failed to release payroll records. Please try again.');
    }
  };

  const initiateRelease = () => {
    if (selectedRows.length === 0) { alert('Please select payroll records to release.'); return; }
    setOpenReleaseConfirm(true);
  };

  const handleExportToExcel = () => {
    if (filteredFinalizedData.length === 0) { alert('No data to export.'); return; }
    const getMonthName = (dateString) => {
      if (!dateString) return 'Unknown';
      const date = new Date(dateString);
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
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
    const headers = ['No.','Department','Employee Number','Start Date','End Date','Name','Position','Rate NBC 594',"NBC DIFF'L 597",'Increment','Gross Salary','ABS','H','M','Net Salary','Withholding Tax','Total GSIS Deductions','Total Pag-ibig Deductions','PhilHealth','Total Other Deductions','Total Deductions','1st Pay','2nd Pay','RT Ins.','EC','Status'];
    const excelDataArray = [];
    const title = `Payroll Processed - ${monthName} ${year}`;
    excelDataArray.push([title, ...Array(headers.length - 1).fill('')]);
    excelDataArray.push(Array(headers.length).fill(''));
    excelDataArray.push(headers);
    filteredFinalizedData.forEach((row, index) => {
      excelDataArray.push([index + 1, row.department || '', row.employeeNumber || '', row.startDate || '', row.endDate || '', row.name || '', row.position || '', toNumber(row.rateNbc594), toNumber(row.nbcDiffl597), toNumber(row.increment), toNumber(row.grossSalary), toNumber(row.abs), row.h || 0, row.m || 0, toNumber(row.netSalary), toNumber(row.withholdingTax), toNumber(row.totalGsisDeds), toNumber(row.totalPagibigDeds), toNumber(row.PhilHealthContribution), toNumber(row.totalOtherDeds), toNumber(row.totalDeductions), toNumber(row.pay1st), toNumber(row.pay2nd), toNumber(row.rtIns), toNumber(row.ec), row.status || '']);
    });
    const worksheet = XLSX.utils.aoa_to_sheet(excelDataArray);
    const workbook = XLSX.utils.book_new();
    if (!worksheet['!merges']) worksheet['!merges'] = [];
    worksheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } });
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Processed Payroll');
    XLSX.writeFile(workbook, `PayrollProcessed_${monthName}_${year}.xlsx`);
  };

  if (accessLoading) {
    return (
      <>
        <style>{payrollShimmerKeyframes}</style>
        <Box sx={{ py: 4, px: 6, fontFamily: T.font }}>
          <CircularProgress sx={{ color: T.accent }} />
        </Box>
      </>
    );
  }
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

  const computedRows = filteredFinalizedData.map((item) => {
    return {
      ...item,
      netSalary: (parseFloat(item.netSalary) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    };
  });

  const fmt = (v, dec = 2) =>
    (parseFloat(String(v ?? '').replace(/,/g, '')) || 0).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });

  const getLwopDisplay = (row) => {
    const start = row.startDate ? new Date(row.startDate) : null;
    const end = row.endDate ? new Date(row.endDate) : null;
    const validStart = start && !Number.isNaN(start.getTime());
    const validEnd = end && !Number.isNaN(end.getTime());

    let monthLabel = 'N/A';
    let calendarDays = 30;

    if (validStart && validEnd) {
      const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      const from = s <= e ? s : e;
      const to = s <= e ? e : s;
      calendarDays = Math.floor((to - from) / 86400000) + 1;
      monthLabel = to.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    } else {
      const d = validStart ? start : validEnd ? end : null;
      if (d) {
        monthLabel = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
        calendarDays = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      }
    }

    const rate = Number.parseFloat(String(row.rateNbc594 ?? 0).replace(/,/g, ''));
    const rateText = Number.isFinite(rate)
      ? rate.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      : '0.00';
    const lwopValue = calendarDays > 0 && Number.isFinite(rate) ? rate / calendarDays : 0;
    const valueText = Number.isFinite(lwopValue)
      ? lwopValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      : '0.00';

    return {
      valueText,
      formulaText: `${rateText} / ${monthLabel} (${calendarDays} days)`,
    };
  };

  const statCards = [
    { label: 'Total Employees', value: summaryData.totalEmployees, icon: PeopleIcon, color: T.accent },
    { label: 'Processed', value: summaryData.processedEmployees, icon: CheckCircleIcon, color: '#2E7D32' },
    { label: 'Total Released', value: summaryData.totalReleased, icon: TrendingUpIcon, color: T.accent },
    { label: 'Total Net Salary', value: `₱${summaryData.totalNetSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUpIcon, color: T.accent },
  ];

  // ── Table columns per view ──────────────────────────────────────────────────
  const renderTableByView = () => {
    if (filteredFinalizedData.length === 0) return null;

    if (activePayrollView === 'WTAX') {
      return (
        <TableContainer component={Paper} elevation={0} sx={{ overflowX: 'auto', borderRadius: 0, position: 'relative' }}>
          <Table sx={{ minWidth: 1180, tableLayout: 'auto', borderCollapse: 'separate', borderSpacing: 0 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#fff' }}>
                {['NO.', 'NAME (SURNAME, FIRST NAME, M.I.)', 'POSITION', 'EMPLOYEE NO.', 'WTAX', 'LWOP (CALENDAR DAYS)'].map((head) => (
                  <TableCell key={head} rowSpan={2} sx={{ border: `1px solid ${T.divider}`, py: 1.2, px: 1.5, fontSize: '0.65rem', fontWeight: 800, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', bgcolor: '#fff', fontFamily: T.font }}>
                    {head}
                  </TableCell>
                ))}
                <TableCell align="center" colSpan={3} sx={{ border: `1px solid ${T.divider}`, py: 0.9, px: 1.5, fontSize: '0.65rem', fontWeight: 800, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', bgcolor: '#fff', fontFamily: T.font }}>
                  Late / Absences
                </TableCell>
                <TableCell rowSpan={2} align="center" sx={stickyActionsHeaderSx}>Actions</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: '#fff' }}>
                {['H', 'M', 'ABS'].map((head) => (
                  <TableCell key={head} align="center" sx={{ border: `1px solid ${T.divider}`, py: 1.1, px: 1.5, fontSize: '0.62rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', bgcolor: '#fff', fontFamily: T.font }}>
                    {head}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {computedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => {
                const lwopInfo = getLwopDisplay(row);
                return (
                  <TableRow key={row.id} sx={{ bgcolor: index % 2 === 0 ? T.rowEven : T.rowOdd, '&:hover': { bgcolor: `${T.rowHover} !important` }, borderBottom: `1px solid ${T.divider}` }}>
                    <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', color: T.muted }}>{page * rowsPerPage + index + 1}</ExcelTableCell>
                    <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontWeight: 700 }}>{row.name}</ExcelTableCell>
                    <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.position}</ExcelTableCell>
                    <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 700 }}>{row.employeeNumber}</ExcelTableCell>
                    <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontWeight: 700 }}>{fmt(row.withholdingTax)}</ExcelTableCell>
                    <ExcelTableCell sx={{ borderBottom: 'none', whiteSpace: 'nowrap' }}>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, lineHeight: 1.2, fontFamily: T.font }}>
                        {lwopInfo.valueText}
                      </Typography>
                      <Typography sx={{ fontSize: '0.62rem', color: T.faint, lineHeight: 1.2, fontFamily: T.font }}>
                        {lwopInfo.formulaText}
                      </Typography>
                    </ExcelTableCell>
                    <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', textAlign: 'center' }}>{row.h}</ExcelTableCell>
                    <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', textAlign: 'center' }}>{row.m}</ExcelTableCell>
                    <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', textAlign: 'center', fontWeight: 700 }}>{row.abs}</ExcelTableCell>
                    <ExcelTableCell sx={getStickyActionsBodySx(index)}>
                      <ActionButtons row={row} />
                    </ExcelTableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }

    if (activePayrollView === 'PAY') {
      return (
        <TableContainer component={Paper} elevation={0} sx={{ overflowX: 'auto', borderRadius: 0, position: 'relative' }}>
          <Table sx={{ minWidth: 2000, tableLayout: 'auto', borderCollapse: 'separate', borderSpacing: 0 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#fff' }}>
                {['Serial No.', 'Name', 'Position', 'Emp. No.'].map((head) => (
                  <TableCell key={head} rowSpan={2} sx={{ border: `1px solid ${T.divider}`, py: 1.2, px: 1.5, fontSize: '0.65rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', bgcolor: '#fff', fontFamily: T.font }}>
                    {head}
                  </TableCell>
                ))}
                <TableCell align="center" colSpan={3} sx={{ border: `1px solid ${T.divider}`, py: 0.9, px: 1.5, fontSize: '0.65rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap', bgcolor: '#fff', fontFamily: T.font }}>
                  Compensations
                </TableCell>
                <TableCell align="center" colSpan={6} sx={{ border: `1px solid ${T.divider}`, py: 0.9, px: 1.5, fontSize: '0.65rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap', bgcolor: '#fff', fontFamily: T.font }}>
                  Deductions
                </TableCell>
                {['Net Amount Due', '1st Pay', '2nd Pay'].map((head) => (
                  <TableCell key={head} rowSpan={2} sx={{ border: `1px solid ${T.divider}`, py: 1.2, px: 1.5, fontSize: '0.65rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', bgcolor: '#fff', fontFamily: T.font }}>
                    {head}
                  </TableCell>
                ))}
                <TableCell align="center" colSpan={4} sx={{ border: `1px solid ${T.divider}`, py: 0.9, px: 1.5, fontSize: '0.65rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap', bgcolor: '#fff', fontFamily: T.font }}>
                  Government Share
                </TableCell>
                <TableCell rowSpan={2} align="center" sx={stickyActionsHeaderSx}>Actions</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: '#fff' }}>
                {['Gross Salary', 'ABS', 'Net Salary', 'WTAX', 'Total GSIS', 'Total Pag-ibig', 'PhilHealth', 'Total Other', 'Total Deductions', 'RT. INS.', 'EC', 'PHILHEALTH', 'PAG-IBIG'].map((head) => (
                  <TableCell key={head} sx={{ border: `1px solid ${T.divider}`, py: 1.1, px: 1.5, fontSize: '0.62rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', bgcolor: '#fff', fontFamily: T.font }}>
                    {head}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {computedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => (
                <TableRow key={row.id} sx={{ bgcolor: index % 2 === 0 ? T.rowEven : T.rowOdd, '&:hover': { bgcolor: `${T.rowHover} !important` }, borderBottom: `1px solid ${T.divider}` }}>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', color: T.muted }}>{page * rowsPerPage + index + 1}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontWeight: 700 }}>{row.name}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.position}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 700 }}>{row.employeeNumber}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontWeight: 700 }}>{fmt(row.grossSalary)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{fmt(row.abs)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontWeight: 700 }}>{row.netSalary}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{fmt(row.withholdingTax)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{fmt(row.totalGsisDeds)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{fmt(row.totalPagibigDeds)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{fmt(row.PhilHealthContribution)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{fmt(row.totalOtherDeds)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontWeight: 700 }}>{fmt(row.totalDeductions)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontWeight: 700, color: T.accent }}>{row.netSalary}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', color: T.accent, fontWeight: 700 }}>{fmt(row.pay1st)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', color: T.accent, fontWeight: 700 }}>{fmt(row.pay2nd)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{fmt(row.rtIns)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{fmt(row.ec)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{fmt(row.PhilHealthContribution)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{fmt(row.pagibigFundCont)}</ExcelTableCell>
                  <ExcelTableCell sx={getStickyActionsBodySx(index)}>
                    <ActionButtons row={row} />
                  </ExcelTableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }

    if (activePayrollView === 'DEDUCTIONS') {
      return (
        <TableContainer component={Paper} elevation={0} sx={{ overflowX: 'auto', borderRadius: 0, position: 'relative' }}>
          <Table sx={{ minWidth: 2600, tableLayout: 'auto', borderCollapse: 'separate', borderSpacing: 0 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#fff' }}>
                {['Serial No.', 'Name', 'Position', 'Emp. No.', 'WTAX'].map((head) => (
                  <TableCell key={head} rowSpan={2} sx={{ border: `1px solid ${T.divider}`, py: 1.1, px: 1, fontSize: '0.72rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', whiteSpace: 'nowrap', bgcolor: '#fff', fontFamily: T.font }}>
                    {head}
                  </TableCell>
                ))}
                {[{ label: 'GSIS', cols: 10 }, { label: 'PAG-IBIG', cols: 4 }, { label: 'OTHER DEDUCTIONS', cols: 5 }].map(({ label, cols }) => (
                  <TableCell key={label} align="center" colSpan={cols} sx={{ border: `1px solid ${T.divider}`, py: 0.8, px: 1, fontSize: '0.72rem', fontWeight: 900, color: '#1f2937', textTransform: 'uppercase', whiteSpace: 'nowrap', bgcolor: '#e8edf3', fontFamily: T.font }}>
                    {label}
                  </TableCell>
                ))}
                <TableCell rowSpan={2} sx={{ border: `1px solid ${T.divider}`, py: 1.1, px: 1, fontSize: '0.72rem', fontWeight: 800, color: '#334155', whiteSpace: 'nowrap', bgcolor: '#fff', fontFamily: T.font }}>PhilHealth</TableCell>
                <TableCell rowSpan={2} sx={{ border: `1px solid ${T.divider}`, py: 1.1, px: 1, fontSize: '0.72rem', fontWeight: 800, color: '#334155', whiteSpace: 'nowrap', bgcolor: '#fff', fontFamily: T.font }}>Total Deductions</TableCell>
                <TableCell rowSpan={2} align="center" sx={stickyActionsHeaderSx}>Actions</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: '#fff' }}>
                {['Pers. Life Ins.', 'GSIS Arrears', 'Sal. Loan', 'Policy Loan', 'CPL', 'MPL', 'MPL Lite', 'EAL', 'Emerg. Loan', 'Total GSIS', 'Pag-ibig Contri', 'Pag-ibig 2', 'MPL', 'Total Pag-ibig', 'Landbank', 'Earist COOP', 'FEU', 'Liq. Cash', 'Total Other'].map((head) => (
                  <TableCell key={head} sx={{ border: `1px solid ${T.divider}`, py: 1, px: 0.75, fontSize: '0.68rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', whiteSpace: 'nowrap', bgcolor: '#eef2f7', fontFamily: T.font }}>
                    {head}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {computedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => (
                <TableRow key={row.id} sx={{ bgcolor: index % 2 === 0 ? T.rowEven : T.rowOdd, '&:hover': { bgcolor: `${T.rowHover} !important` }, borderBottom: `1px solid ${T.divider}` }}>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem', color: T.muted }}>{page * rowsPerPage + index + 1}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{row.name}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem' }}>{row.position}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 700 }}>{row.employeeNumber}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem' }}>{fmt(row.withholdingTax)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem' }}>{fmt(row.personalLifeRetIns)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem' }}>{fmt(row.gsisArrears)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem' }}>{fmt(row.gsisSalaryLoan)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem' }}>{fmt(row.gsisPolicyLoan)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem' }}>{fmt(row.cpl)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem' }}>{fmt(row.mpl)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem' }}>{fmt(row.mplLite)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem' }}>{fmt(row.eal)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem' }}>{fmt(row.emergencyLoan)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem', fontWeight: 700 }}>{fmt(row.totalGsisDeds)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem' }}>{fmt(row.pagibigFundCont)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem' }}>{fmt(row.pagibig2)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem' }}>{fmt(row.multiPurpLoan)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem', fontWeight: 700 }}>{fmt(row.totalPagibigDeds)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem' }}>{fmt(row.landbankSalaryLoan)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem' }}>{fmt(row.earistCreditCoop)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem' }}>{fmt(row.feu)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem' }}>{fmt(row.liquidatingCash)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem', fontWeight: 700 }}>{fmt(row.totalOtherDeds)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem' }}>{fmt(row.PhilHealthContribution)}</ExcelTableCell>
                  <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem', fontWeight: 800 }}>{fmt(row.totalDeductions)}</ExcelTableCell>
                  <ExcelTableCell sx={getStickyActionsBodySx(index)}>
                    <ActionButtons row={row} />
                  </ExcelTableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }

    // FULL VIEW
    return (
      <Box sx={{ display: 'flex', width: '100%', position: 'relative' }}>
        <Box sx={{ overflowX: 'auto', flex: 1, minWidth: 0, '&::-webkit-scrollbar': { height: 8 }, '&::-webkit-scrollbar-track': { background: T.accentFaint, borderRadius: 4 }, '&::-webkit-scrollbar-thumb': { background: alpha(T.accent, 0.35), borderRadius: 4, '&:hover': { background: alpha(T.accent, 0.55) } } }}>
          <TableContainer component={Paper} elevation={0} sx={{ overflowX: 'auto', width: 'max-content', minWidth: '100%', borderRadius: 0 }}>
            <Table sx={{ minWidth: 'max-content', tableLayout: 'auto', borderCollapse: 'separate', borderSpacing: 0 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(T.accent, 0.03) }}>
                  <TableCell padding="checkbox" sx={{ borderBottom: `2px solid ${T.accentBorder}`, bgcolor: alpha(T.accent, 0.03), py: 1.5, px: 2, height: 80 }}>
                    <Checkbox
                      size="small"
                      sx={{ color: T.accentBorder, '&.Mui-checked': { color: T.accent }, '&.MuiCheckbox-indeterminate': { color: T.accent }, p: 0 }}
                      indeterminate={(() => {
                        const currentPageRows = filteredFinalizedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
                        const selectableIds = currentPageRows.filter((row) => !releasedIdSet.has(getRecordKey(row))).map((row) => row.id);
                        const selectedOnPage = selectedRows.filter((id) => selectableIds.includes(id));
                        return selectedOnPage.length > 0 && selectedOnPage.length < selectableIds.length;
                      })()}
                      checked={(() => {
                        const currentPageRows = filteredFinalizedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
                        const selectableIds = currentPageRows.filter((row) => !releasedIdSet.has(getRecordKey(row))).map((row) => row.id);
                        if (selectableIds.length === 0) return false;
                        return selectableIds.every((id) => selectedRows.includes(id));
                      })()}
                      onChange={(e) => {
                        const currentPageRows = filteredFinalizedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
                        const selectableIds = currentPageRows.filter((row) => !releasedIdSet.has(getRecordKey(row))).map((row) => row.id);
                        if (e.target.checked) setSelectedRows((prev) => [...new Set([...prev, ...selectableIds])]);
                        else setSelectedRows((prev) => prev.filter((id) => !selectableIds.includes(id)));
                      }}
                    />
                  </TableCell>
                  {[
                    ['No.', null, null], ['Department', null, null], ['Employee Number', null, null],
                    ['Start Date', null, null], ['End Date', null, null], ['Name', null, null], ['Position', null, null],
                    ['Rate NBC 594', 'rateNbc594', 'Salary Rate per National Budget Circular 594'],
                    ["NBC DIFF'L 597", 'nbcDiffl597', 'NBC Differential 597 — Salary Adjustment'],
                    ['Increment', 'increment', 'Salary Increment / Step Increment'],
                    ['Gross Salary', 'grossSalary', 'Gross Salary — Total salary before deductions'],
                    ['H', 'h', 'Hours Late / Undertime'],
                    ['M', 'm', 'Minutes Late / Undertime'], ['ABS', 'abs', 'Absence Deductions'],
                    ['Net Salary', 'netSalary', 'Net Salary — Take-home pay after all deductions'],
                    ['Withholding Tax', 'withholdingTax', 'Withholding Tax — BIR income tax withheld'],
                    ['Total GSIS Deds', 'totalGsisDeds', 'Total GSIS Deductions'],
                    ['Total Pag-ibig Deds', 'totalPagibigDeds', 'Total Pag-IBIG Deductions'],
                    ['PhilHealth', 'PhilHealthContribution', 'PhilHealth Contribution'],
                    ['Total Other Deds', 'totalOtherDeds', 'Total Other Deductions'],
                    ['Total Deductions', 'totalDeductions', 'Grand total of all deductions'],
                    ['1st Pay', 'pay1st', '1st Pay — First half salary release amount'],
                    ['2nd Pay', 'pay2nd', '2nd Pay — Second half salary release amount'],
                    ['RT Ins.', 'rtIns', 'Retirement Insurance'], ['EC', 'ec', "Employees' Compensation"],
                    ['Date Submitted', null, null],
                  ].map(([label, key, fullName], i) => (
                    <TableCell key={`th-${i}`} sx={{ borderBottom: `2px solid ${T.accentBorder}`, py: 1.5, px: 2, fontSize: '0.62rem', fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', bgcolor: alpha(T.accent, 0.03), fontFamily: T.font, height: 80 }}>
                      {key && fullName ? <HeaderTooltip fieldKey={key} fullName={fullName}>{label}</HeaderTooltip> : label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {computedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => {
                  const key = getRecordKey(row);
                  const isRowReleased = releasedIdSet.has(key);
                  return (
                    <TableRow
                      key={row.id}
                      sx={{ height: FROZEN_ROW_HEIGHT, bgcolor: index % 2 === 0 ? T.rowEven : T.rowOdd, '&:hover': { bgcolor: `${T.rowHover} !important` }, transition: 'background-color 0.12s', borderBottom: `1px solid ${T.divider}` }}
                    >
                      <TableCell padding="checkbox" sx={{ borderBottom: 'none', py: 1.5, px: 2 }}>
                        <Checkbox
                          size="small"
                          checked={selectedRows.includes(row.id)}
                          disabled={isRowReleased}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (isRowReleased) return;
                            if (selectedRows.includes(row.id)) setSelectedRows((prev) => prev.filter((id) => id !== row.id));
                            else setSelectedRows((prev) => [...prev, row.id]);
                          }}
                          sx={{ color: T.accentBorder, '&.Mui-checked': { color: T.accent }, p: 0 }}
                        />
                      </TableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', color: T.muted }}>{page * rowsPerPage + index + 1}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.department}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 600 }}>{row.employeeNumber}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.startDate}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.endDate}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem', fontWeight: 600, color: T.text }}>{row.name}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.position}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.rateNbc594 ? Number(row.rateNbc594).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.nbcDiffl597 ? Number(row.nbcDiffl597).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.increment ? Number(row.increment).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontWeight: 600 }}>{row.grossSalary ? Number(String(row.grossSalary).replace(/,/g,'')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.h}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.m}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontWeight: 700 }}>{row.abs}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontWeight: 700, color: '#2e7d32' }}>{row.netSalary}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.withholdingTax ? Number(String(row.withholdingTax).replace(/,/g,'')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.totalGsisDeds ? Number(String(row.totalGsisDeds).replace(/,/g,'')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.totalPagibigDeds ? Number(String(row.totalPagibigDeds).replace(/,/g,'')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.PhilHealthContribution ? Number(String(row.PhilHealthContribution).replace(/,/g,'')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.totalOtherDeds ? Number(String(row.totalOtherDeds).replace(/,/g,'')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontWeight: 600 }}>{row.totalDeductions ? Number(String(row.totalDeductions).replace(/,/g,'')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', color: T.accent, fontWeight: 700 }}>{row.pay1st ? Number(String(row.pay1st).replace(/,/g,'')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', color: T.accent, fontWeight: 700 }}>{row.pay2nd ? Number(String(row.pay2nd).replace(/,/g,'')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.rtIns ? Number(String(row.rtIns).replace(/,/g,'')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.ec ? Number(String(row.ec).replace(/,/g,'')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                      <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.dateCreated ? new Date(row.dateCreated).toLocaleString() : ''}</ExcelTableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
        {/* Sticky Actions Column */}
        <Box sx={{ width: `${STICKY_ACTIONS_WIDTH}px`, minWidth: `${STICKY_ACTIONS_WIDTH}px`, flexShrink: 0, position: 'sticky', right: 0, zIndex: 60, borderLeft: `2px solid ${T.accentBorder}`, boxShadow: `-2px 0 10px ${alpha(T.accent, 0.12)}`, bgcolor: alpha(T.accent, 0.02) }}>
          <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ borderBottom: `2px solid ${T.accentBorder}`, py: 1.5, px: 1, fontSize: '0.62rem', fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', bgcolor: alpha(T.accent, 0.03), fontFamily: T.font, height: 80, textAlign: 'center' }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {computedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, idx) => (
                <TableRow key={`actions-${row.id}`} sx={{ height: FROZEN_ROW_HEIGHT, bgcolor: idx % 2 === 0 ? T.rowEven : T.rowOdd, borderBottom: `1px solid ${T.divider}` }}>
                  <TableCell sx={{ borderBottom: 'none', p: 0, textAlign: 'center' }}>
                    <ActionButtons row={row} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Box>
    );
  };

  const ActionButtons = ({ row }) => {
    const isRowReleased = releasedIdSet.has(getRecordKey(row));
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
        <Tooltip title="View Record">
          <IconButton
            size="small"
            onClick={() => handleViewRecord(row)}
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1.5,
              bgcolor: alpha('#2563eb', 0.08),
              color: '#2563eb',
              border: '1px solid rgba(37,99,235,0.3)',
              '&:hover': { bgcolor: '#2563eb', color: '#fff' },
              transition: 'all 0.15s',
            }}
          >
            <Visibility sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete Record">
          <span>
            <IconButton
              size="small"
              onClick={() => initiateDelete(row)}
              disabled={isRowReleased}
              sx={{
                width: 28, height: 28, borderRadius: 1.5,
                bgcolor: isRowReleased ? '#f5f5f5' : alpha('#ef4444', 0.07),
                color: isRowReleased ? '#ccc' : '#ef4444',
                border: '1px solid rgba(239,68,68,0.3)',
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
  };

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
      <style>{payrollShimmerKeyframes}</style>

      {/* ── Page Header ── */}
      <SectionCard sx={{ mb: 2 }}>
        <Box sx={{ px: 4, py: 3, background: T.headerGrad, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
            <Payment sx={{ fontSize: 32, color: T.accent }} />
            <Box>
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3, fontFamily: T.font }}>
                Payroll Processed
              </Typography>
              <Typography sx={{ fontSize: '0.82rem', color: T.accentMid, fontWeight: 700, opacity: 0.9, fontFamily: T.font }}>
                Administrative Panel • View and manage all processed payroll records
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
            <Chip label="Processed Records" size="small" sx={{ bgcolor: alpha(T.accent, 0.12), color: T.accent, fontWeight: 600, fontSize: '0.72rem', fontFamily: T.font }} />
            <Tooltip title="Refresh Data">
              <IconButton onClick={() => window.location.reload()} sx={{ bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, color: T.accent, width: 36, height: 36, borderRadius: 2, '&:hover': { bgcolor: T.accentFaint } }}>
                <Refresh sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </SectionCard>

      {/* ── Stats Strip ── */}
      <Box sx={{ mb: 2, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1.5 }}>
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <SectionCard key={stat.label}>
              <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.75 }}>
                <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: alpha(stat.color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon sx={{ fontSize: 18, color: stat.color }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 900, fontSize: typeof stat.value === 'string' ? '1rem' : '1.35rem', color: T.text, lineHeight: 1, fontFamily: T.font }}>
                    {stat.value}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: T.muted, mt: 0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: T.font }}>
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
        <Box sx={{ px: 3.5, py: 1.5, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <FilterList sx={{ fontSize: 14, color: T.accent }} />
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.accent, fontFamily: T.font }}>Search & Filter</Typography>
            {hasActiveFilters && (
              <Box sx={{ px: 1, py: 0.2, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${T.accentBorder}`, borderRadius: '20px' }}>
                <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: T.accent, fontFamily: T.font }}>
                  {[selectedDepartment, selectedDate, selectedMonth, selectedYear, searchTerm].filter(Boolean).length} active
                </Typography>
              </Box>
            )}
          </Box>
          {hasActiveFilters && (
            <AccentButton size="small" onClick={clearAllFilters} startIcon={<Close sx={{ fontSize: 13 }} />} sx={{ fontSize: '0.72rem', color: '#d32f2f', border: '1px solid rgba(211,47,47,0.3)', px: 1.25, py: 0.3, height: 26, '&:hover': { bgcolor: alpha('#d32f2f', 0.06), transform: 'none' } }}>
              Clear all
            </AccentButton>
          )}
        </Box>

        <Box sx={{ px: 3.5, py: 2.5 }}>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <FieldInput
              size="small"
              placeholder="Search by employee name or number…"
              value={searchTerm}
              onChange={handleSearchChange}
              sx={{ minWidth: 220, flex: 1 }}
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: T.faint, fontSize: 18 }} /></InputAdornment>) }}
            />
            <FormControl size="small" sx={{ minWidth: 160, flex: 1 }}>
              <InputLabel sx={{ fontSize: '0.82rem', fontFamily: T.font }}>Department</InputLabel>
              <Select value={selectedDepartment} onChange={handleDepartmentChange} label="Department" sx={filterSelectSx}>
                <MenuItem value=""><em style={{ fontSize: '0.82rem', fontFamily: T.font }}>All Departments</em></MenuItem>
                {departments.map((dept) => (<MenuItem key={dept.id} value={dept.code} sx={{ fontSize: '0.82rem', fontFamily: T.font }}>{dept.description}</MenuItem>))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130, flex: '0 0 auto' }}>
              <InputLabel sx={{ fontSize: '0.82rem', fontFamily: T.font }}>Month</InputLabel>
              <Select value={selectedMonth} onChange={handleMonthChange} label="Month" sx={filterSelectSx}>
                {monthOptions.map((opt) => (<MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.82rem', fontFamily: T.font }}>{opt.label}</MenuItem>))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 110, flex: '0 0 auto' }}>
              <InputLabel sx={{ fontSize: '0.82rem', fontFamily: T.font }}>Year</InputLabel>
              <Select value={selectedYear} onChange={handleYearChange} label="Year" sx={filterSelectSx}>
                {yearOptions.map((opt) => (<MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.82rem', fontFamily: T.font }}>{opt.label}</MenuItem>))}
              </Select>
            </FormControl>
            <FieldInput
              type="date"
              size="small"
              label="Search by Date"
              value={selectedDate}
              onChange={handleDateChange}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160, flex: '0 0 auto', '& .MuiOutlinedInput-root': { fontFamily: T.font } }}
            />
          </Box>

          {/* ── Payroll Month Quick-Filter ── */}
          <Box sx={{ mt: 2, pt: 2, borderTop: `1px dashed ${alpha(T.accent, 0.15)}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarToday sx={{ fontSize: 13, color: T.accent }} />
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.accent, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: T.font }}>
                  Quick Month Filter
                </Typography>
                {selectedPayrollMonth !== null && (
                  <Box sx={{ px: 1, py: 0.2, borderRadius: '12px', bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: T.accent, fontFamily: T.font }}>
                      {payrollMonths[selectedPayrollMonth]} {selectedPayrollYear}{selectedMonthDays !== null && ` · ${selectedMonthDays} days`}
                    </Typography>
                  </Box>
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FormControl size="small" sx={{ minWidth: 90 }}>
                  <Select
                    value={selectedPayrollYear}
                    onChange={(e) => { setSelectedPayrollYear(e.target.value); if (selectedPayrollMonth !== null) setTimeout(() => handlePayrollMonthClick(selectedPayrollMonth), 0); }}
                    sx={{ ...filterSelectSx, fontSize: '0.78rem', fontWeight: 700, fontFamily: T.font }}
                  >
                    {payrollYearOptions.map((y) => (<MenuItem key={y} value={y} sx={{ fontSize: '0.8rem', fontFamily: T.font }}>{y}</MenuItem>))}
                  </Select>
                </FormControl>
                {selectedPayrollMonth !== null && (
                  <AccentButton size="small" onClick={handleClearPayrollMonth} startIcon={<Close sx={{ fontSize: 12 }} />} sx={{ fontSize: '0.7rem', color: '#d32f2f', border: '1px solid rgba(211,47,47,0.3)', px: 1, py: 0.25, height: 26, '&:hover': { bgcolor: alpha('#d32f2f', 0.06), transform: 'none' } }}>
                    Clear month
                  </AccentButton>
                )}
              </Box>
            </Box>
            <Box sx={{ p: 1.75, borderRadius: 2, border: `2px dashed ${T.accentBorder}`, bgcolor: T.accentFaint, display: 'flex', flexWrap: 'wrap', gap: 0.75, justifyContent: 'center' }}>
              {payrollMonths.map((month, index) => {
                const isSelected = selectedPayrollMonth === index;
                const days = getCalendarDays(selectedPayrollYear, index + 1);
                return (
                  <Box
                    key={month}
                    onClick={() => handlePayrollMonthClick(index)}
                    title={`${month} ${selectedPayrollYear} — ${days} calendar days`}
                    sx={{ px: 1.5, py: 0.85, borderRadius: '6px', cursor: 'pointer', userSelect: 'none', bgcolor: isSelected ? T.accent : '#fff', border: `1px solid ${isSelected ? T.accent : T.accentBorder}`, color: isSelected ? '#fff' : T.accent, fontWeight: 700, fontFamily: T.font, letterSpacing: '0.04em', transition: 'all 0.15s ease', boxShadow: isSelected ? `0 2px 8px ${alpha(T.accent, 0.28)}` : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.2, minWidth: 46, '&:hover': { bgcolor: isSelected ? T.accentDark : T.accentFaint, borderColor: T.accent, boxShadow: `0 2px 8px ${alpha(T.accent, 0.15)}` } }}
                  >
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, fontFamily: T.font, lineHeight: 1, color: 'inherit' }}>{month}</Typography>
                    <Typography sx={{ fontSize: '0.58rem', fontWeight: 600, fontFamily: T.font, lineHeight: 1, color: 'inherit', opacity: isSelected ? 0.85 : 0.5 }}>{days}d</Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1.5, pt: 1.5, borderTop: `1px dashed ${alpha(T.accent, 0.15)}` }}>
              <Typography sx={{ fontSize: '0.7rem', color: alpha(T.text, 0.5), fontWeight: 600, alignSelf: 'center', mr: 0.25, fontFamily: T.font }}>Active:</Typography>
              {selectedDepartment && <Chip size="small" label={`Dept: ${departments.find((d) => d.code === selectedDepartment)?.description || selectedDepartment}`} onDelete={() => { setSelectedDepartment(''); applyFilters('', searchTerm, selectedDate, selectedMonth, selectedYear); }} sx={{ height: 22, fontSize: '0.72rem', bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}`, fontFamily: T.font, '& .MuiChip-deleteIcon': { fontSize: 14, color: T.accent } }} />}
              {selectedMonth && <Chip size="small" label={`Month: ${monthOptions.find((m) => m.value === selectedMonth)?.label}`} onDelete={() => { setSelectedMonth(''); applyFilters(selectedDepartment, searchTerm, selectedDate, '', selectedYear); }} sx={{ height: 22, fontSize: '0.72rem', bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}`, fontFamily: T.font, '& .MuiChip-deleteIcon': { fontSize: 14, color: T.accent } }} />}
              {selectedYear && <Chip size="small" label={`Year: ${selectedYear}`} onDelete={() => { setSelectedYear(''); applyFilters(selectedDepartment, searchTerm, selectedDate, selectedMonth, ''); }} sx={{ height: 22, fontSize: '0.72rem', bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}`, fontFamily: T.font, '& .MuiChip-deleteIcon': { fontSize: 14, color: T.accent } }} />}
              {selectedDate && <Chip size="small" label={`Date: ${selectedDate}`} onDelete={() => { setSelectedDate(''); applyFilters(selectedDepartment, searchTerm, '', selectedMonth, selectedYear); }} sx={{ height: 22, fontSize: '0.72rem', bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}`, fontFamily: T.font, '& .MuiChip-deleteIcon': { fontSize: 14, color: T.accent } }} />}
              {searchTerm && <Chip size="small" label={`Search: ${searchTerm}`} onDelete={() => { setSearchTerm(''); applyFilters(selectedDepartment, '', selectedDate, selectedMonth, selectedYear); }} sx={{ height: 22, fontSize: '0.72rem', bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}`, fontFamily: T.font, '& .MuiChip-deleteIcon': { fontSize: 14, color: T.accent } }} />}
            </Box>
          )}
        </Box>
      </SectionCard>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontFamily: T.font }}>{error}</Alert>}

      {/* ── Table Card ── */}
      <SectionCard sx={{ mb: 2, overflow: 'hidden', '& .MuiTableHead-root .MuiTableCell-root': { fontSize: '0.78rem !important', fontFamily: `${T.font} !important` }, '& .MuiTableBody-root .MuiTableCell-root': { fontSize: '0.9rem !important', fontFamily: `${T.font} !important` } }}>
        {/* Table header bar */}
        <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: T.text, fontFamily: T.font }}>Processed Payroll Data</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: T.faint, mt: 0.1, fontFamily: T.font }}>
              Total {filteredFinalizedData.length} records · {selectedRows.length} selected
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {selectedRows.length > 0 && (
              <Box sx={{ px: 1.5, py: 0.35, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderRadius: '20px' }}>
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: T.accent, fontFamily: T.font }}>{selectedRows.length} selected</Typography>
              </Box>
            )}
            <AccentButton variant="outlined" size="small" startIcon={<Refresh sx={{ fontSize: 14 }} />} onClick={() => window.location.reload()} sx={{ fontSize: '0.72rem', px: 1.25, py: 0.35, height: 28, borderColor: T.accentBorder, color: T.accent, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, transform: 'none' } }}>
              Refresh
            </AccentButton>
            <Tooltip title="Export to Excel">
              <span>
                <IconButton onClick={handleExportToExcel} disabled={filteredFinalizedData.length === 0} sx={{ bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, color: T.accent, width: 36, height: 36, borderRadius: 2, '&:hover': { bgcolor: T.accentFaint }, '&:disabled': { opacity: 0.4 } }}>
                  <CloudUpload sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        {/* View toggle tabs */}
        <Box sx={{ px: 3.5, py: 1.25, borderBottom: `1px solid ${T.divider}`, bgcolor: T.surface }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, minmax(0, 1fr))' }, gap: 1, width: '100%' }}>
            {['FULL VIEW', 'WTAX', 'PAY', 'DEDUCTIONS'].map((label) => {
              const view = label === 'FULL VIEW' ? 'FULL_VIEW' : label;
              const isActive = activePayrollView === view;
              return (
                <AccentButton
                  key={label}
                  fullWidth
                  variant={isActive ? 'contained' : 'outlined'}
                  onClick={() => setActivePayrollView(view)}
                  sx={{ minHeight: 34, fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.04em', borderColor: isActive ? '#475569' : '#cbd5e1', bgcolor: isActive ? '#475569' : '#fff', color: isActive ? '#fff' : '#334155', boxShadow: isActive ? `0 2px 10px ${alpha('#475569', 0.25)}` : 'none', '&:hover': { bgcolor: isActive ? '#334155' : '#f8fafc', borderColor: '#475569', color: isActive ? '#fff' : '#334155', transform: 'none' } }}
                >
                  {label}
                </AccentButton>
              );
            })}
          </Box>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={10}><CircularProgress sx={{ color: T.accent }} /></Box>
        ) : filteredFinalizedData.length === 0 ? (
          <Box sx={{ mx: 3.5, my: 2, py: 7, px: 2, border: `1px solid ${T.divider}`, borderRadius: 2, bgcolor: '#fff', textAlign: 'center' }}>
            <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              <Info sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: T.muted, mb: 0.5, fontFamily: T.font }}>No Records Found</Typography>
            <Typography sx={{ fontSize: '0.86rem', color: T.faint, fontFamily: T.font }}>No finalized payroll records match your current filters.</Typography>
          </Box>
        ) : (
          renderTableByView()
        )}

        {/* Pagination */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${T.divider}`, px: 3.5, py: 0.5, bgcolor: T.accentFaint }}>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.text, fontFamily: T.font }}>Total: {filteredFinalizedData.length}</Typography>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.accent, fontFamily: T.font }}>Selected: {selectedRows.length}</Typography>
          </Box>
          <TablePagination
            component="div"
            count={filteredFinalizedData.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{ '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.78rem', fontWeight: 600, color: T.muted, fontFamily: T.font } }}
          />
        </Box>
      </SectionCard>

      {/* ── Action Buttons ── */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2, mb: 4 }}>
        <AccentButton variant="outlined" onClick={() => (window.location.href = '/payroll-table')} size="large" startIcon={<Pending sx={{ fontSize: '16px !important' }} />} sx={{ borderColor: T.accentBorder, color: T.accent, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent } }}>
          View Pending Payroll
        </AccentButton>
        <AccentButton variant="outlined" onClick={() => (window.location.href = '/payroll-released')} size="large" startIcon={<BusinessCenterIcon sx={{ fontSize: '16px !important' }} />} sx={{ borderColor: T.accentBorder, color: T.accent, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent } }}>
          View Released Payroll
        </AccentButton>
        <AccentButton
          variant="contained"
          startIcon={<PublishIcon sx={{ fontSize: '16px !important' }} />}
          onClick={initiateRelease}
          disabled={selectedRows.length === 0}
          size="large"
          sx={{ bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.3)}`, '&:hover': { bgcolor: T.accentDark }, '&:disabled': { bgcolor: alpha(T.accent, 0.3), color: alpha('#fff', 0.5) } }}
        >
          Release Selected ({selectedRows.length})
        </AccentButton>
      </Box>

      {/* ── Delete Confirm Modal ── */}
      <Modal open={openViewModal} onClose={handleCloseViewModal}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: { xs: '92%', sm: 620 }, maxHeight: '85vh', overflowY: 'auto', bgcolor: T.surface, borderRadius: 3, boxShadow: '0 24px 80px rgba(0,0,0,0.18)', overflowX: 'hidden', border: `2px solid ${T.accentBorder}`, fontFamily: T.font }}>
          <Box sx={{ height: 4, background: `linear-gradient(90deg, ${T.accent} 0%, ${T.accentMid} 100%)` }} />
          <Box sx={{ px: 3, py: 2.5, background: T.headerGrad, display: 'flex', alignItems: 'center', gap: 2, borderBottom: `1px solid ${T.divider}` }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Visibility sx={{ fontSize: 18, color: T.accent }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: T.text, fontSize: '0.95rem', lineHeight: 1.2, fontFamily: T.font }}>Payroll Record Details</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: T.muted, mt: 0.2, fontFamily: T.font }}>Read-only view of the selected payroll row</Typography>
            </Box>
          </Box>

          <Box sx={{ p: 3 }}>
            {viewRow ? (
              <Grid container spacing={1.25}>
                {[
                  ['Employee Number', viewRow.employeeNumber],
                  ['Name', viewRow.name],
                  ['Department', viewRow.department],
                  ['Position', viewRow.position],
                  ['Start Date', viewRow.startDate],
                  ['End Date', viewRow.endDate],
                  ['Gross Salary', fmt(viewRow.grossSalary)],
                  ['Net Salary', fmt(viewRow.netSalary)],
                  ['Withholding Tax', fmt(viewRow.withholdingTax)],
                  ['Total Deductions', fmt(viewRow.totalDeductions)],
                  ['1st Pay', fmt(viewRow.pay1st)],
                  ['2nd Pay', fmt(viewRow.pay2nd)],
                  ['Status', viewRow.status || 'Processed'],
                  ['Date Submitted', viewRow.dateCreated ? new Date(viewRow.dateCreated).toLocaleString() : ''],
                ].map(([label, value]) => (
                  <Grid key={label} item xs={12} sm={6}>
                    <Box sx={{ border: `1px solid ${T.divider}`, borderRadius: 1.5, px: 1.25, py: 0.9, bgcolor: '#fff' }}>
                      <Typography sx={{ fontSize: '0.68rem', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, fontFamily: T.font }}>
                        {label}
                      </Typography>
                      <Typography sx={{ mt: 0.35, fontSize: '0.82rem', color: T.text, fontWeight: 600, wordBreak: 'break-word', fontFamily: T.font }}>
                        {value || '-'}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography sx={{ fontSize: '0.86rem', color: T.muted, fontFamily: T.font }}>
                No record selected.
              </Typography>
            )}

            <Box display="flex" justifyContent="flex-end" mt={2.5}>
              <AccentButton
                variant="outlined"
                onClick={handleCloseViewModal}
                sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}
              >
                Close
              </AccentButton>
            </Box>
          </Box>
        </Box>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal open={openConfirm} onClose={() => setOpenConfirm(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: { xs: '90%', sm: 500 }, bgcolor: T.surface, borderRadius: 3, boxShadow: '0 24px 80px rgba(0,0,0,0.18)', overflow: 'hidden', border: `2px solid ${T.accentBorder}`, fontFamily: T.font }}>
          <Box sx={{ height: 4, background: `linear-gradient(90deg, ${T.accent} 0%, ${T.accentMid} 100%)` }} />
          <Box sx={{ px: 3, py: 2.5, background: T.headerGrad, display: 'flex', alignItems: 'center', gap: 2, borderBottom: `1px solid ${T.divider}` }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DeleteForever sx={{ fontSize: 18, color: T.accent }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: T.text, fontSize: '0.95rem', lineHeight: 1.2, fontFamily: T.font }}>Delete Record Confirmation</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: T.muted, mt: 0.2, fontFamily: T.font }}>This action cannot be undone</Typography>
            </Box>
          </Box>
          <Box sx={{ p: 3 }}>
            <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2, bgcolor: alpha('#ef4444', 0.06), border: `1px solid ${alpha('#ef4444', 0.2)}` }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 0.25, fontFamily: T.font }}>Delete {selectedRow?.isBulk ? `${selectedRow.ids.length} selected records` : 'this record'}</Typography>
              <Typography sx={{ fontSize: '0.78rem', color: T.muted, fontFamily: T.font }}>This action is permanent and cannot be undone.</Typography>
            </Alert>
            <Box display="flex" justifyContent="flex-end" gap={1.25} mt={2}>
              <AccentButton variant="outlined" onClick={() => setOpenConfirm(false)} sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>Cancel</AccentButton>
              <AccentButton variant="contained" onClick={handleConfirm} startIcon={<DeleteForever sx={{ fontSize: '14px !important' }} />} sx={{ fontSize: '0.8rem', bgcolor: '#ef4444', color: '#fff', '&:hover': { bgcolor: '#d32f2f' } }}>Delete</AccentButton>
            </Box>
          </Box>
        </Box>
      </Modal>

      {/* ── Confidential Password Modal ── */}
      <Modal open={openConfidentialPassword} onClose={handleConfidentialPasswordCancel}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: { xs: '90%', sm: 500 }, bgcolor: T.surface, borderRadius: 3, boxShadow: '0 24px 80px rgba(0,0,0,0.18)', overflow: 'hidden', border: `2px solid ${T.accentBorder}`, fontFamily: T.font }}>
          <Box sx={{ height: 4, background: `linear-gradient(90deg, ${T.accent} 0%, ${T.accentMid} 100%)` }} />
          <Box sx={{ px: 3, py: 2.5, background: T.headerGrad, display: 'flex', alignItems: 'center', gap: 2, borderBottom: `1px solid ${T.divider}` }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock sx={{ fontSize: 18, color: T.accent }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: T.text, fontSize: '0.95rem', fontFamily: T.font }}>Authorization Required</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: T.muted, mt: 0.2, fontFamily: T.font }}>Sensitive operation verification</Typography>
            </Box>
          </Box>
          <Box sx={{ p: 3 }}>
            <Typography sx={{ mb: 2.5, color: T.muted, fontSize: '0.875rem', fontFamily: T.font }}>Please enter the authorized password to proceed with the deletion.</Typography>
            <FieldInput autoFocus fullWidth label="Enter Confidential Password" type="password" size="small" value={confidentialPasswordInput} onChange={(e) => setConfidentialPasswordInput(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter') handleConfidentialPasswordSubmit(); }} sx={{ mb: 2.5 }} />
            <Box display="flex" justifyContent="flex-end" gap={1.25}>
              <AccentButton variant="outlined" onClick={handleConfidentialPasswordCancel} sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>Cancel</AccentButton>
              <AccentButton variant="contained" onClick={handleConfidentialPasswordSubmit} startIcon={<Lock sx={{ fontSize: '14px !important' }} />} sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', '&:hover': { bgcolor: T.accentDark } }}>Verify</AccentButton>
            </Box>
          </Box>
        </Box>
      </Modal>

      {/* ── Release Confirm Modal ── */}
      <Modal open={openReleaseConfirm} onClose={() => setOpenReleaseConfirm(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: { xs: '90%', sm: 500 }, bgcolor: T.surface, borderRadius: 3, boxShadow: '0 24px 80px rgba(0,0,0,0.18)', overflow: 'hidden', border: `2px solid ${T.accentBorder}`, fontFamily: T.font }}>
          <Box sx={{ height: 4, background: `linear-gradient(90deg, ${T.accent} 0%, ${T.accentMid} 100%)` }} />
          <Box sx={{ px: 3, py: 2.5, background: T.headerGrad, display: 'flex', alignItems: 'center', gap: 2, borderBottom: `1px solid ${T.divider}` }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CloudUpload sx={{ fontSize: 18, color: T.accent }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: T.text, fontSize: '0.95rem', fontFamily: T.font }}>Release Payroll Records</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: T.muted, mt: 0.2, fontFamily: T.font }}>Move records to released module</Typography>
            </Box>
          </Box>
          <Box sx={{ p: 3 }}>
            <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, '& .MuiAlert-icon': { color: T.accent } }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 0.25, fontFamily: T.font }}>Release {selectedRows.length} Payroll Record{selectedRows.length > 1 ? 's' : ''}</Typography>
              <Typography sx={{ fontSize: '0.78rem', color: T.muted, fontFamily: T.font }}>Records will be moved to <strong>Payroll Released</strong> and will no longer be editable.</Typography>
            </Alert>
            {releaseLoading && <Box sx={{ mt: 2, mb: 2.5, height: '4px', width: '100%', borderRadius: '2px', background: `linear-gradient(90deg, ${T.accent}, ${T.accentMid}, ${T.accent})`, backgroundSize: '200% 100%', animation: 'pulseLine 1.5s linear infinite' }} />}
            <Box display="flex" justifyContent="flex-end" gap={1.25}>
              <AccentButton variant="outlined" onClick={() => setOpenReleaseConfirm(false)} disabled={releaseLoading} sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>Cancel</AccentButton>
              <AccentButton variant="contained" onClick={handleReleasePayroll} disabled={releaseLoading} startIcon={releaseLoading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <CloudUpload sx={{ fontSize: '14px !important' }} />} sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', minWidth: 120, '&:hover': { bgcolor: T.accentDark }, '&:disabled': { bgcolor: '#e0e0e0', color: '#9e9e9e' } }}>
                {releaseLoading ? 'Releasing…' : 'Release'}
              </AccentButton>
            </Box>
          </Box>
        </Box>
      </Modal>

      <style>{`@keyframes pulseLine { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>

      <LoadingOverlay open={overlayLoading || releaseLoading} message={releaseLoading ? 'Releasing...' : 'Processing...'} />
      <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />

      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnackbarOpen(false)} severity="error" sx={{ width: '100%', backgroundColor: '#d32f2f', color: 'white', fontFamily: T.font, '& .MuiAlert-icon': { color: 'white' }, '& .MuiAlert-action': { color: 'white' } }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PayrollProcessed;