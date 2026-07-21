import API_BASE_URL from '../../apiConfig';
import React, { useEffect, useState, useMemo } from 'react';
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
  BusinessCenter,
  Info,
  CalendarToday,
  Close,
} from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import TextField from '@mui/material/TextField';
import * as XLSX from 'xlsx';

// ─── Unified Design Tokens (mirrored from PayrollProcessing) ─────────────────
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

// ─── Shimmer keyframes ────────────────────────────────────────────────────────
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

const Bone = ({ w = '100%', h = 14, r = 6, sx = {} }) => (
  <Box
    sx={{
      width: w,
      height: h,
      borderRadius: r,
      background:
        'linear-gradient(90deg, rgba(109,35,35,0.07) 25%, rgba(109,35,35,0.14) 50%, rgba(109,35,35,0.07) 75%)',
      backgroundSize: '800px 100%',
      animation: 'payrollShimmer 1.6s infinite linear',
      flexShrink: 0,
      ...sx,
    }}
  />
);

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

const globalFontSx = {
  '& *': { fontFamily: `${T.font} !important` },
};

const STICKY_STATUS_WIDTH = 120;
const STICKY_ACTIONS_WIDTH = 60;

// ─── Main Component ───────────────────────────────────────────────────────────
const PayrollReleased = () => {
  const { settings } = useSystemSettings();

  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('payroll-released');

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
  const [selectedYear, setSelectedYear] = useState('');
  const [summaryData, setSummaryData] = useState({
    totalReleased: 0,
    totalEmployees: 0,
    totalGrossSalary: 0,
    totalNetSalary: 0,
  });
  const [empCatMap, setEmpCatMap] = useState({});
  const [selectedEmpCat, setSelectedEmpCat] = useState('');

  const employmentCategoryOptions = useMemo(() => {
    const unique = new Map();
    Object.values(empCatMap).forEach((cat) => {
      if (!cat?.label) return;
      if (!unique.has(cat.label)) {
        unique.set(cat.label, {
          label: cat.label,
          colorHex: cat.colorHex || '#757575',
        });
      }
    });
    return Array.from(unique.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [empCatMap]);

  // ── Payroll Month Quick-Filter state ──────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const payrollYearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);
  const payrollMonths = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const [selectedPayrollYear, setSelectedPayrollYear] = useState(currentYear);
  const [selectedPayrollMonth, setSelectedPayrollMonth] = useState(null);
  const [selectedMonthDays, setSelectedMonthDays] = useState(null);

  const yearOptions = [
    { value: '', label: 'All Years' },
    { value: '2024', label: '2024' },
    { value: '2025', label: '2025' },
    { value: '2026', label: '2026' },
  ];

  const getCalendarDays = (year, month1based) =>
    new Date(year, month1based, 0).getDate();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  };

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

  const computeSummary = (rows) => {
    const totalGross = rows.reduce(
      (sum, item) => sum + parseFloat(item.grossSalary || 0),
      0,
    );
    const totalNet = rows.reduce(
      (sum, item) => sum + parseFloat(item.netSalary || 0),
      0,
    );
    return {
      totalReleased: rows.length,
      totalEmployees: rows.length,
      totalGrossSalary: totalGross,
      totalNetSalary: totalNet,
    };
  };

  const applyFilters = (
    department,
    search,
    filterDate,
    year,
    base = releasedData,
    empCat = selectedEmpCat,
  ) => {
    let filtered = [...base];

    if (department) {
      filtered = filtered.filter((r) => r.department === department);
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.name || '').toLowerCase().includes(lowerSearch) ||
          (r.employeeNumber || '').toString().toLowerCase().includes(lowerSearch),
      );
    }

    if (filterDate) {
      filtered = filtered.filter((r) => {
        const startDate = new Date(r.startDate);
        const endDate = new Date(r.endDate);
        const sel = new Date(filterDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        sel.setHours(12, 0, 0, 0);
        return sel >= startDate && sel <= endDate;
      });
    }

    if (year && year !== '') {
      filtered = filtered.filter((r) => {
        if (!r.startDate) return false;
        return new Date(r.startDate).getFullYear().toString() === year;
      });
    }

    if (empCat) {
      filtered = filtered.filter((r) => {
        const cat = empCatMap[r.employeeNumber?.toString()];
        return cat?.label === empCat;
      });
    }

    setFilteredReleasedData(filtered);
    setSummaryData(computeSummary(filtered));
    setPage(0);
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

    let base = [...releasedData];
    if (selectedDepartment) base = base.filter((r) => r.department === selectedDepartment);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      base = base.filter(
        (r) =>
          (r.name || '').toLowerCase().includes(lower) ||
          (r.employeeNumber || '').toString().toLowerCase().includes(lower),
      );
    }
    if (selectedEmpCat) {
      base = base.filter(
        (r) => empCatMap[r.employeeNumber?.toString()]?.label === selectedEmpCat,
      );
    }

    const monthFiltered = base.filter((r) => {
      if (!r.startDate) return false;
      const s = normalizeDateString(r.startDate);
      return s >= rangeStart && s <= rangeEnd;
    });

    setFilteredReleasedData(monthFiltered);
    setSummaryData(computeSummary(monthFiltered));
    setPage(0);
  };

  const handleClearPayrollMonth = () => {
    setSelectedPayrollMonth(null);
    setSelectedMonthDays(null);
    applyFilters(
      selectedDepartment,
      searchTerm,
      selectedDate,
      selectedYear,
      releasedData,
      selectedEmpCat,
    );
  };

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/department-table`, getAuthHeaders());
      setDepartments(response.data);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchEmpCatMap = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`,
        getAuthHeaders(),
      );
      const map = {};
      (Array.isArray(res.data) ? res.data : []).forEach((item) => {
        if (!item.employeeNumber) return;
        const label =
          item.parentGroup && item.typeName
            ? `${item.parentGroup} | ${item.typeName}`
            : item.categoryLabel || '';
        if (label)
          map[item.employeeNumber.toString()] = {
            label,
            colorHex: item.colorHex || '#757575',
            parentGroup: item.parentGroup || '',
            typeName: item.typeName || '',
          };
      });
      setEmpCatMap(map);
    } catch (err) {
      console.error('Error fetching employment categories:', err);
    }
  };

  const fetchReleasedPayroll = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/PayrollReleasedRoute/released-payroll`,
        getAuthHeaders(),
      );
      const data = Array.isArray(res.data) ? res.data : [];
      setReleasedData(data);
      setFilteredReleasedData(data);
      setSummaryData(computeSummary(data));
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
    fetchEmpCatMap();
  });

  useEffect(() => { fetchDepartments(); }, []);
  useEffect(() => { fetchReleasedPayroll(); }, []);
  useEffect(() => { fetchEmpCatMap(); }, []);

  // Update summary when filtered data changes (external)
  useEffect(() => {
    setSummaryData(computeSummary(filteredReleasedData));
  }, [filteredReleasedData]);

  const handleDepartmentChange = (e) => {
    const v = e.target.value;
    setSelectedDepartment(v);
    setSelectedPayrollMonth(null);
    setSelectedMonthDays(null);
    applyFilters(v, searchTerm, selectedDate, selectedYear, releasedData, selectedEmpCat);
  };

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    setSelectedPayrollMonth(null);
    setSelectedMonthDays(null);
    applyFilters(selectedDepartment, term, selectedDate, selectedYear, releasedData, selectedEmpCat);
  };

  const handleDateChange = (e) => {
    const v = e.target.value;
    setSelectedDate(v);
    setSelectedPayrollMonth(null);
    setSelectedMonthDays(null);
    applyFilters(selectedDepartment, searchTerm, v, selectedYear, releasedData, selectedEmpCat);
  };

  const handleYearChange = (e) => {
    const v = e.target.value;
    setSelectedYear(v);
    setSelectedPayrollMonth(null);
    setSelectedMonthDays(null);
    applyFilters(selectedDepartment, searchTerm, selectedDate, v, releasedData, selectedEmpCat);
  };

  const handleEmpCatChange = (e) => {
    const v = e.target.value;
    setSelectedEmpCat(v);
    setSelectedPayrollMonth(null);
    setSelectedMonthDays(null);
    applyFilters(
      selectedDepartment,
      searchTerm,
      selectedDate,
      selectedYear,
      releasedData,
      v,
    );
  };

  const clearAllFilters = () => {
    setSelectedDepartment('');
    setSelectedDate('');
    setSelectedYear('');
    setSelectedEmpCat('');
    setSelectedPayrollMonth(null);
    setSelectedMonthDays(null);
    setFilteredReleasedData(releasedData);
    setSummaryData(computeSummary(releasedData));
    setPage(0);
  };

  const hasActiveFilters =
    selectedDepartment ||
    selectedDate ||
    selectedYear ||
    selectedEmpCat ||
    selectedPayrollMonth !== null;

  const fmt = (v, dec = 2) =>
    (parseFloat(v) || 0).toLocaleString('en-US', {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    });

  const handleSaveToExcel = () => {
    const ws_data = [
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
      Array(56).fill(''),
    ];

    filteredReleasedData.forEach((row, index) => {
      const toNumber = (value) => {
        if (value === null || value === undefined || value === '') return '';
        const num = Number(value);
        if (isNaN(num)) return value;
        return num.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      };

      ws_data.push([
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
        index + 1,
        toNumber(row.rtIns),
        toNumber(row.ec),
        toNumber(row.PhilHealthContribution ?? row.philHealth),
        toNumber(row.pagibigContribution ?? row.pagIbig),
        toNumber(row.pay1stCompute),
        toNumber(row.pay2ndCompute),
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

      ws_data.push(Array(56).fill(''));
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Released Payroll Data');

    const max_width = 20;
    ws['!cols'] = ws_data[0].map((_, i) => ({
      wch: Math.min(
        max_width,
        Math.max(...ws_data.map((row) => row[i]?.toString().length || 0)),
      ),
    }));

    const generateFilename = () => {
      if (filteredReleasedData.length === 0) return 'PayrollReleased.xlsx';
      const firstRecord = filteredReleasedData[0];
      const startDate = new Date(firstRecord.startDate);
      const endDate = new Date(firstRecord.endDate);
      const monthNames = [
        'January','February','March','April','May','June',
        'July','August','September','October','November','December',
      ];
      const startMonth = monthNames[startDate.getMonth()];
      const endMonth = monthNames[endDate.getMonth()];
      const year = startDate.getFullYear();
      if (startDate.getMonth() === endDate.getMonth()) {
        return `PayrollReleased_${startMonth}_${year}.xlsx`;
      }
      return `PayrollReleased_${startMonth}_${endMonth}_${year}.xlsx`;
    };

    XLSX.writeFile(wb, generateFilename());
  };

  // ── Stat cards ───────────────────────────────────────────────────────────
  const statCards = [
    {
      label: 'Total Released',
      value: summaryData.totalReleased,
      icon: CheckCircleIcon,
      color: '#4caf50',
    },
    {
      label: 'Total Employees',
      value: summaryData.totalEmployees,
      icon: PeopleIcon,
      color: T.accent,
    },
    {
      label: 'Total Gross Salary',
      value: `₱${fmt(summaryData.totalGrossSalary)}`,
      icon: TrendingUpIcon,
      color: T.accent,
    },
    {
      label: 'Total Net Salary',
      value: `₱${fmt(summaryData.totalNetSalary)}`,
      icon: TrendingUpIcon,
      color: '#2e7d32',
    },
  ];

  // ── Access loading skeleton ──────────────────────────────────────────────
  if (accessLoading) {
    return (
      <>
        <style>{payrollShimmerKeyframes}</style>
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
          <SectionCard
            sx={{ mb: 2, overflow: 'hidden', animation: 'payrollPulse 2s ease-in-out infinite' }}
          >
            <Box sx={{ p: 3.5, background: T.headerGrad, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 46, height: 46, borderRadius: '50%', bgcolor: alpha(T.accent, 0.14) }} />
              <Box sx={{ flex: 1 }}>
                <Bone w={240} h={16} sx={{ mb: 1 }} />
                <Bone w={330} h={10} />
              </Box>
            </Box>
          </SectionCard>
          <Box sx={{ mb: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4,1fr)' }, gap: 1.5 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <SectionCard key={i} sx={{ animation: `payrollPulse 2s ease-in-out ${i * 0.1}s infinite` }}>
                <Box sx={{ px: 2.5, py: 2.2 }}>
                  <Bone w="42%" h={10} sx={{ mb: 1 }} />
                  <Bone w="65%" h={16} />
                </Box>
              </SectionCard>
            ))}
          </Box>
          <SectionCard sx={{ animation: 'payrollPulse 2s ease-in-out infinite' }}>
            <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: alpha(T.accent, 0.04) }}>
              <Bone w={210} h={14} sx={{ mb: 1 }} />
              <Bone w={170} h={9} />
            </Box>
            <Box sx={{ p: 2.5 }}>
              <Bone h={38} r={10} sx={{ mb: 1.5 }} />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(5,1fr)' }, gap: 1.25, mb: 1.5 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Bone key={i} h={38} r={10} />
                ))}
              </Box>
              <Bone h={250} r={14} />
            </Box>
          </SectionCard>
        </Box>
      </>
    );
  }

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

  return (
    <>
      <style>{payrollShimmerKeyframes}</style>
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
                position: 'absolute', top: -50, right: -50, width: 200, height: 200,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)',
              }}
            />
            <Box
              sx={{
                position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)',
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
              <Payment sx={{ fontSize: 32, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3, fontFamily: T.font }}>
                  Payroll Released
                </Typography>
                <Typography sx={{ fontSize: '0.82rem', color: T.accentMid, fontWeight: 700, opacity: 0.9, fontFamily: T.font }}>
                  Administrative Panel • View and manage all released payroll records
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
              <Chip
                label="Released Records"
                size="small"
                sx={{ bgcolor: alpha(T.accent, 0.12), color: T.accent, fontWeight: 600, fontSize: '0.72rem', fontFamily: T.font }}
              />
              <Tooltip title="Refresh Data">
                <IconButton
                  onClick={() => { fetchDepartments(); fetchReleasedPayroll(); }}
                  sx={{
                    bgcolor: alpha(T.accent, 0.08),
                    border: `1px solid ${T.accentBorder}`,
                    color: T.accent,
                    width: 36, height: 36, borderRadius: 2,
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
        <Box sx={{ mb: 2, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1.5 }}>
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <SectionCard key={stat.label}>
                <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.75 }}>
                  <Box
                    sx={{
                      width: 38, height: 38, borderRadius: 2,
                      bgcolor: alpha(stat.color, 0.1),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    <Icon sx={{ fontSize: 18, color: stat.color }} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        fontSize: typeof stat.value === 'string' ? '1rem' : '1.35rem',
                        color: T.text, lineHeight: 1, fontFamily: T.font,
                      }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography
                      sx={{ fontSize: '0.7rem', color: T.muted, mt: 0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: T.font }}
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
              px: 3.5, py: 1.5,
              borderBottom: `1px solid ${T.divider}`,
              bgcolor: T.accentFaint,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <FilterList sx={{ fontSize: 14, color: T.accent }} />
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.accent, fontFamily: T.font }}>
                Search & Filter
              </Typography>
              {hasActiveFilters && (
                <Box sx={{ px: 1, py: 0.2, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${T.accentBorder}`, borderRadius: '20px' }}>
                  <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: T.accent, fontFamily: T.font }}>
                    {[selectedDepartment, selectedDate, selectedYear, selectedEmpCat, selectedPayrollMonth !== null ? 'month' : ''].filter(Boolean).length} active
                  </Typography>
                </Box>
              )}
            </Box>
            {hasActiveFilters && (
              <AccentButton
                size="small"
                onClick={clearAllFilters}
                startIcon={<Close sx={{ fontSize: 13 }} />}
                sx={{
                  fontSize: '0.72rem', color: '#d32f2f',
                  border: '1px solid rgba(211,47,47,0.3)', px: 1.25, py: 0.3, height: 26,
                  '&:hover': { bgcolor: alpha('#d32f2f', 0.06), transform: 'none' },
                }}
              >
                Clear all
              </AccentButton>
            )}
          </Box>

          <Box sx={{ px: 3.5, py: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {/* Search */}
              <FieldInput
                size="small"
                placeholder="Search by employee name or number…"
                value={searchTerm}
                onChange={handleSearchChange}
                sx={{ minWidth: 220, flex: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: T.faint, fontSize: 18 }} />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Department */}
              <FormControl size="small" sx={{ minWidth: 160, flex: 1 }}>
                <InputLabel sx={{ fontSize: '0.82rem', fontFamily: T.font }}>Department</InputLabel>
                <Select value={selectedDepartment} onChange={handleDepartmentChange} label="Department" sx={filterSelectSx}>
                  <MenuItem value=""><em style={{ fontSize: '0.82rem', fontFamily: T.font }}>All Departments</em></MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.code} sx={{ fontSize: '0.82rem', fontFamily: T.font }}>
                      {dept.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Employment category */}
              <FormControl size="small" sx={{ minWidth: 200, flex: 1.5 }}>
                <InputLabel sx={{ fontSize: '0.82rem', fontFamily: T.font }}>Category</InputLabel>
                <Select
                  value={selectedEmpCat}
                  onChange={handleEmpCatChange}
                  label="Category"
                  sx={filterSelectSx}
                >
                  <MenuItem value="">
                    <em style={{ fontSize: '0.82rem', fontFamily: T.font }}>All Categories</em>
                  </MenuItem>
                  {employmentCategoryOptions.length === 0 ? (
                    <MenuItem
                      disabled
                      sx={{
                        fontSize: '0.82rem',
                        fontStyle: 'italic',
                        color: '#999',
                        fontFamily: T.font,
                      }}
                    >
                      No categories loaded
                    </MenuItem>
                  ) : (
                    employmentCategoryOptions.map((item) => (
                      <MenuItem
                        key={item.label}
                        value={item.label}
                        sx={{ fontSize: '0.82rem', fontFamily: T.font }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: item.colorHex,
                              flexShrink: 0,
                            }}
                          />
                          {item.label}
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              {/* Year */}
              <FormControl size="small" sx={{ minWidth: 110, flex: '0 0 auto' }}>
                <InputLabel sx={{ fontSize: '0.82rem', fontFamily: T.font }}>Year</InputLabel>
                <Select value={selectedYear} onChange={handleYearChange} label="Year" sx={filterSelectSx}>
                  {yearOptions.map((o) => (
                    <MenuItem key={o.value} value={o.value} sx={{ fontSize: '0.82rem', fontFamily: T.font }}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Date */}
              <FieldInput
                type="date"
                size="small"
                label="Search by Date"
                value={selectedDate}
                onChange={handleDateChange}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 165, flex: '0 0 auto' }}
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
                        {payrollMonths[selectedPayrollMonth]} {selectedPayrollYear}
                        {selectedMonthDays !== null && ` · ${selectedMonthDays} days`}
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FormControl size="small" sx={{ minWidth: 90 }}>
                    <Select
                      value={selectedPayrollYear}
                      onChange={(e) => {
                        setSelectedPayrollYear(e.target.value);
                        if (selectedPayrollMonth !== null) {
                          setTimeout(() => handlePayrollMonthClick(selectedPayrollMonth), 0);
                        }
                      }}
                      sx={{ ...filterSelectSx, fontSize: '0.78rem', fontWeight: 700, fontFamily: T.font }}
                    >
                      {payrollYearOptions.map((y) => (
                        <MenuItem key={y} value={y} sx={{ fontSize: '0.8rem', fontFamily: T.font }}>{y}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {selectedPayrollMonth !== null && (
                    <AccentButton
                      size="small"
                      onClick={handleClearPayrollMonth}
                      startIcon={<Close sx={{ fontSize: 12 }} />}
                      sx={{
                        fontSize: '0.7rem', color: '#d32f2f',
                        border: '1px solid rgba(211,47,47,0.3)', px: 1, py: 0.25, height: 26,
                        '&:hover': { bgcolor: alpha('#d32f2f', 0.06), transform: 'none' },
                      }}
                    >
                      Clear month
                    </AccentButton>
                  )}
                </Box>
              </Box>

              <Box
                sx={{
                  p: 1.75, borderRadius: 2, border: `2px dashed ${T.accentBorder}`,
                  bgcolor: T.accentFaint, display: 'flex', flexWrap: 'wrap', gap: 0.75, justifyContent: 'center',
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
                        px: 1.5, py: 0.85, borderRadius: '6px', cursor: 'pointer', userSelect: 'none',
                        bgcolor: isSelected ? T.accent : '#fff',
                        border: `1px solid ${isSelected ? T.accent : T.accentBorder}`,
                        color: isSelected ? '#fff' : T.accent,
                        fontWeight: 700, fontFamily: T.font, letterSpacing: '0.04em',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? `0 2px 8px ${alpha(T.accent, 0.28)}` : 'none',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.2, minWidth: 46,
                        '&:hover': {
                          bgcolor: isSelected ? T.accentDark : T.accentFaint,
                          borderColor: T.accent,
                          boxShadow: `0 2px 8px ${alpha(T.accent, 0.15)}`,
                        },
                      }}
                    >
                      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, fontFamily: T.font, lineHeight: 1, color: 'inherit' }}>
                        {month}
                      </Typography>
                      <Typography sx={{ fontSize: '0.58rem', fontWeight: 600, fontFamily: T.font, lineHeight: 1, color: 'inherit', opacity: isSelected ? 0.85 : 0.5 }}>
                        {days}d
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Active filter chips */}
            {hasActiveFilters && (
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1.5, pt: 1.5, borderTop: `1px dashed ${alpha(T.accent, 0.15)}` }}>
                <Typography sx={{ fontSize: '0.7rem', color: alpha(T.text, 0.5), fontWeight: 600, alignSelf: 'center', mr: 0.25, fontFamily: T.font }}>
                  Active:
                </Typography>
                {selectedDepartment && (
                  <Chip
                    size="small"
                    label={`Dept: ${departments.find((d) => d.code === selectedDepartment)?.description || selectedDepartment}`}
                    onDelete={() => { setSelectedDepartment(''); applyFilters('', searchTerm, selectedDate, selectedYear, releasedData, selectedEmpCat); }}
                    sx={{ height: 22, fontSize: '0.72rem', bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}`, fontFamily: T.font, '& .MuiChip-deleteIcon': { fontSize: 14, color: T.accent } }}
                  />
                )}
                {selectedEmpCat && (
                  <Chip
                    size="small"
                    label={`Category: ${selectedEmpCat}`}
                    onDelete={() => {
                      setSelectedEmpCat('');
                      applyFilters(selectedDepartment, searchTerm, selectedDate, selectedYear, releasedData, '');
                    }}
                    sx={{ height: 22, fontSize: '0.72rem', bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}`, fontFamily: T.font, '& .MuiChip-deleteIcon': { fontSize: 14, color: T.accent } }}
                  />
                )}
                {selectedDate && (
                  <Chip
                    size="small"
                    label={`Date: ${selectedDate}`}
                    onDelete={() => { setSelectedDate(''); applyFilters(selectedDepartment, searchTerm, '', selectedYear, releasedData, selectedEmpCat); }}
                    sx={{ height: 22, fontSize: '0.72rem', bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}`, fontFamily: T.font, '& .MuiChip-deleteIcon': { fontSize: 14, color: T.accent } }}
                  />
                )}
                {selectedYear && (
                  <Chip
                    size="small"
                    label={`Year: ${selectedYear}`}
                    onDelete={() => { setSelectedYear(''); applyFilters(selectedDepartment, searchTerm, selectedDate, '', releasedData, selectedEmpCat); }}
                    sx={{ height: 22, fontSize: '0.72rem', bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}`, fontFamily: T.font, '& .MuiChip-deleteIcon': { fontSize: 14, color: T.accent } }}
                  />
                )}
                {selectedPayrollMonth !== null && (
                  <Chip
                    size="small"
                    label={`Quick: ${payrollMonths[selectedPayrollMonth]} ${selectedPayrollYear}`}
                    onDelete={handleClearPayrollMonth}
                    sx={{ height: 22, fontSize: '0.72rem', bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}`, fontFamily: T.font, '& .MuiChip-deleteIcon': { fontSize: 14, color: T.accent } }}
                  />
                )}
              </Box>
            )}
          </Box>
        </SectionCard>

        {/* ── Error Alert ── */}
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontFamily: T.font }} icon={<Info />}>
            {error}
          </Alert>
        )}

        {/* ── Table ── */}
        <SectionCard
          sx={{
            mb: 2,
            overflow: 'hidden',
            '& .MuiTableHead-root .MuiTableCell-root': { fontSize: '0.78rem !important', fontFamily: `${T.font} !important` },
            '& .MuiTableBody-root .MuiTableCell-root': { fontSize: '0.9rem !important', fontFamily: `${T.font} !important` },
          }}
        >
          {/* Table header bar */}
          <Box
            sx={{
              px: 3.5, py: 2,
              borderBottom: `1px solid ${T.divider}`,
              bgcolor: T.accentFaint,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5,
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: T.text, fontFamily: T.font }}>
                Employee Released Payroll Data
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: T.faint, mt: 0.1, fontFamily: T.font }}>
                Total {filteredReleasedData.length} records · {selectedRows.length} selected
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {selectedRows.length > 0 && (
                <Box sx={{ px: 1.5, py: 0.35, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderRadius: '20px' }}>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: T.accent, fontFamily: T.font }}>
                    {selectedRows.length} selected
                  </Typography>
                </Box>
              )}
              <AccentButton
                variant="outlined"
                size="small"
                startIcon={<Refresh sx={{ fontSize: 14 }} />}
                onClick={() => { fetchDepartments(); fetchReleasedPayroll(); }}
                sx={{
                  fontSize: '0.72rem', px: 1.25, py: 0.35, height: 28,
                  borderColor: T.accentBorder, color: T.accent,
                  '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, transform: 'none' },
                }}
              >
                Refresh
              </AccentButton>
            </Box>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" py={10}>
              <CircularProgress sx={{ color: T.accent }} />
            </Box>
          ) : filteredReleasedData.length === 0 ? (
            <Box
              sx={{
                mx: 3.5, my: 2, py: 7, px: 2,
                border: `1px solid ${T.divider}`, borderRadius: 2,
                bgcolor: '#fff', textAlign: 'center',
              }}
            >
              <Box
                sx={{
                  width: 72, height: 72, borderRadius: '50%',
                  bgcolor: T.accentFaint,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2,
                }}
              >
                <Info sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: T.muted, mb: 0.5, fontFamily: T.font }}>
                No Records Found
              </Typography>
              <Typography sx={{ fontSize: '0.86rem', color: T.faint, fontFamily: T.font }}>
                No released payroll records match your current filters. Try adjusting your filters.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', width: '100%', position: 'relative' }}>
              {/* Scrollable main table */}
              <Box
                sx={{
                  overflowX: 'auto',
                  flex: 1,
                  minWidth: 0,
                  '&::-webkit-scrollbar': { height: 8 },
                  '&::-webkit-scrollbar-track': { background: T.accentFaint, borderRadius: 4 },
                  '&::-webkit-scrollbar-thumb': {
                    background: alpha(T.accent, 0.35), borderRadius: 4,
                    '&:hover': { background: alpha(T.accent, 0.55) },
                  },
                }}
              >
                <TableContainer
                  component={Paper}
                  elevation={0}
                  sx={{ overflowX: 'auto', width: 'max-content', minWidth: '100%', borderRadius: 0 }}
                >
                  <Table sx={{ minWidth: 'max-content', tableLayout: 'auto', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: T.accent }}>
                        <TableCell
                          padding="checkbox"
                          sx={{
                            borderBottom: `2px solid ${alpha('#fff', 0.25)}`,
                            bgcolor: T.accent,
                            py: 1.5,
                            px: 2,
                            height: 56,
                          }}
                        >
                          <Checkbox
                            size="small"
                            sx={{
                              color: '#fff',
                              '&.Mui-checked': { color: '#fff' },
                              '&.MuiCheckbox-indeterminate': { color: '#fff' },
                              p: 0,
                            }}
                            indeterminate={(() => {
                              const pageRows = filteredReleasedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
                              const ids = pageRows.map((r) => r.id);
                              const sel = selectedRows.filter((id) => ids.includes(id));
                              return sel.length > 0 && sel.length < ids.length;
                            })()}
                            checked={(() => {
                              const pageRows = filteredReleasedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
                              const ids = pageRows.map((r) => r.id);
                              return ids.length > 0 && ids.every((id) => selectedRows.includes(id));
                            })()}
                            onChange={(e) => {
                              const pageRows = filteredReleasedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
                              const ids = pageRows.map((r) => r.id);
                              if (e.target.checked) {
                                setSelectedRows((prev) => [...new Set([...prev, ...ids])]);
                              } else {
                                setSelectedRows((prev) => prev.filter((id) => !ids.includes(id)));
                              }
                            }}
                          />
                        </TableCell>
                        {[
                          'No.',
                          'Department',
                          'Employee Number',
                          'Start Date',
                          'End Date',
                          'Name',
                          'Position',
                          'Gross Salary',
                          'Net Salary',
                          'Date Released',
                        ].map((h) => (
                          <TableCell
                            key={h}
                            sx={{
                              borderBottom: `2px solid ${alpha('#fff', 0.25)}`,
                              py: 1.5, px: 2,
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              color: '#fff',
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                              whiteSpace: 'nowrap',
                              bgcolor: T.accent,
                              fontFamily: T.font,
                              height: 56,
                            }}
                          >
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredReleasedData
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((row, index) => (
                          <TableRow
                            key={row.id}
                            sx={{
                              height: 56,
                              bgcolor: index % 2 === 0 ? T.rowEven : T.rowOdd,
                              '&:hover': { bgcolor: `${T.rowHover} !important` },
                              transition: 'background-color 0.12s',
                              borderBottom: `1px solid ${T.divider}`,
                            }}
                          >
                            <TableCell padding="checkbox" sx={{ borderBottom: 'none', py: 1.5, px: 2 }}>
                              <Checkbox
                                size="small"
                                checked={selectedRows.includes(row.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  if (selectedRows.includes(row.id)) {
                                    setSelectedRows((prev) => prev.filter((id) => id !== row.id));
                                  } else {
                                    setSelectedRows((prev) => [...prev, row.id]);
                                  }
                                }}
                                sx={{ color: T.accentBorder, '&.Mui-checked': { color: T.accent }, p: 0 }}
                              />
                            </TableCell>
                            <TableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', color: T.muted, fontFamily: T.font, whiteSpace: 'nowrap', px: 2 }}>
                              {page * rowsPerPage + index + 1}
                            </TableCell>
                            <TableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontFamily: T.font, whiteSpace: 'nowrap', px: 2 }}>
                              {row.department}
                            </TableCell>
                            <TableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap', px: 2 }}>
                              {row.employeeNumber}
                            </TableCell>
                            <TableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontFamily: T.font, whiteSpace: 'nowrap', px: 2 }}>
                              {row.startDate ? row.startDate.split('T')[0] : ''}
                            </TableCell>
                            <TableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontFamily: T.font, whiteSpace: 'nowrap', px: 2 }}>
                              {row.endDate ? row.endDate.split('T')[0] : ''}
                            </TableCell>
                            <TableCell sx={{ borderBottom: 'none', fontSize: '0.82rem', fontWeight: 600, color: T.text, fontFamily: T.font, whiteSpace: 'nowrap', px: 2 }}>
                              {row.name}
                            </TableCell>
                            <TableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontFamily: T.font, whiteSpace: 'nowrap', px: 2 }}>
                              {row.position}
                            </TableCell>
                            <TableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontWeight: 600, fontFamily: T.font, whiteSpace: 'nowrap', px: 2 }}>
                              {row.grossSalary ? fmt(row.grossSalary) : ''}
                            </TableCell>
                            <TableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontWeight: 600, color: '#2e7d32', fontFamily: T.font, whiteSpace: 'nowrap', px: 2 }}>
                              {row.netSalary ? fmt(row.netSalary) : ''}
                            </TableCell>
                            <TableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontFamily: T.font, whiteSpace: 'nowrap', px: 2 }}>
                              {row.dateReleased ? new Date(row.dateReleased).toLocaleDateString() : ''}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* Floating right rail — Status column */}
              <Box
                sx={{
                  width: STICKY_STATUS_WIDTH,
                  minWidth: STICKY_STATUS_WIDTH,
                  flexShrink: 0,
                  position: 'sticky',
                  right: 0,
                  zIndex: 60,
                  borderLeft: `2px solid ${T.accentBorder}`,
                  boxShadow: `-2px 0 10px ${alpha(T.accent, 0.12)}`,
                  bgcolor: alpha(T.accent, 0.02),
                }}
              >
                <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: T.accent }}>
                      <TableCell
                        sx={{
                          borderBottom: `2px solid ${alpha('#fff', 0.25)}`,
                          py: 1.5, px: 1,
                          fontSize: '0.62rem', fontWeight: 700,
                          color: '#fff', textTransform: 'uppercase',
                          letterSpacing: '0.08em', whiteSpace: 'nowrap',
                          bgcolor: T.accent, fontFamily: T.font,
                          height: 56, textAlign: 'center',
                        }}
                      >
                        Status
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredReleasedData
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((row, idx) => (
                        <TableRow
                          key={`status-${row.id}`}
                          sx={{ height: 56, bgcolor: idx % 2 === 0 ? T.rowEven : T.rowOdd, borderBottom: `1px solid ${T.divider}` }}
                        >
                          <TableCell sx={{ borderBottom: 'none', p: 0, textAlign: 'center' }}>
                            <Chip
                              label="Released"
                              size="small"
                              sx={{
                                fontWeight: 700, fontSize: '0.65rem', fontFamily: T.font,
                                bgcolor: alpha('#4caf50', 0.12), color: '#2e7d32',
                                border: `1px solid ${alpha('#4caf50', 0.3)}`,
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          )}

          {/* Pagination */}
          <Box
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderTop: `1px solid ${T.divider}`, px: 3.5, py: 0.5, bgcolor: T.accentFaint,
            }}
          >
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.text, fontFamily: T.font }}>
                Total: {filteredReleasedData.length}
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.accent, fontFamily: T.font }}>
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
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  fontSize: '0.78rem', fontWeight: 600, color: T.muted, fontFamily: T.font,
                },
              }}
            />
          </Box>
        </SectionCard>

        {/* ── Action Buttons ── */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2, mb: 6 }}>
          <AccentButton
            variant="outlined"
            onClick={() => (window.location.href = '/payroll-processed')}
            size="large"
            startIcon={<BusinessCenter sx={{ fontSize: '16px !important' }} />}
            sx={{
              borderColor: T.accentBorder, color: T.accent,
              '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent },
            }}
          >
            View Processed Payroll
          </AccentButton>

          <AccentButton
            variant="outlined"
            startIcon={<SaveIcon sx={{ fontSize: '16px !important' }} />}
            onClick={handleSaveToExcel}
            size="large"
            sx={{
              borderColor: T.accentBorder, color: T.accent,
              '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent },
            }}
          >
            Save to Excel
          </AccentButton>

          <AccentButton
            variant="contained"
            startIcon={<Email sx={{ fontSize: '16px !important' }} />}
            onClick={() => {
              if (selectedRows.length > 0) {
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
              bgcolor: T.accent, color: '#fff',
              boxShadow: `0 4px 14px ${alpha(T.accent, 0.35)}`,
              '&:hover': { bgcolor: T.accentDark },
              '&:disabled': { bgcolor: alpha(T.accent, 0.25), color: alpha('#fff', 0.5) },
            }}
          >
            Distribute Payslips{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
          </AccentButton>
        </Box>

        <LoadingOverlay open={overlayLoading} message="Processing..." />
        <SuccessfulOverlay
          open={successOpen}
          action={successAction}
          onClose={() => setSuccessOpen(false)}
        />
      </Box>
    </>
  );
};

export default PayrollReleased;