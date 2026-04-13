import API_BASE_URL from '../../apiConfig';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import {
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  TablePagination, Paper, Typography, Container, Alert, Select,
  MenuItem, FormControl, InputLabel, Box, TextField, InputAdornment,
  Button, Modal, Grid, Checkbox, CircularProgress, Card, CardContent,
  Chip, IconButton, Tooltip, Divider, Backdrop, AppBar, Toolbar,
  Badge, styled, alpha, Fade, Avatar, Slider, Fab, Slide, ListSubheader,
} from '@mui/material';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import { usePayrollFormulas } from '../../hooks/usePayrollFormulas';
import AccessDenied from '../AccessDenied';
import usePayrollRealtimeRefresh from '../../hooks/usePayrollRealtimeRefresh';
import SearchIcon from '@mui/icons-material/Search';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Save as SaveIcon, Cancel as CancelIcon, ExitToApp, Payment,
  BusinessCenter, CreditCard, Compare, Visibility, Close,
  EmojiPeople, FilterList, GetApp, CheckCircle, Error, Warning,
  Info, Refresh, Dashboard, Assessment, ZoomIn, ZoomOut, GridOn, FindInPage,
} from '@mui/icons-material';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import WorkIcon from '@mui/icons-material/Work';

const isRowProcessed = (row) => row.status === 'Processed' || row.status === 1;

// ─── Unified Design Tokens (matches UsersList) ────────────────────────────────
const T = {
  accent:       '#6d2323',
  accentDark:   '#5a1d1d',
  accentMid:    '#8B4545',
  accentFaint:  'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover:  'rgba(109,35,35,0.10)',
  headerGrad:   'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)',
  rowEven:      '#ffffff',
  rowOdd:       'rgba(109,35,35,0.025)',
  rowHover:     'rgba(109,35,35,0.055)',
  text:         '#1a1a1a',
  muted:        '#6b6b6b',
  faint:        '#a0a0a0',
  surface:      '#ffffff',
  divider:      'rgba(0,0,0,0.08)',
};

// ─── Styled Primitives (matches UsersList) ────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: T.surface,
});

const FieldInput = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8,
    fontSize: '0.875rem',
    backgroundColor: '#fff',
    '& fieldset': { borderColor: T.accentBorder },
    '&:hover fieldset': { borderColor: T.accent },
    '&.Mui-focused fieldset': { borderColor: T.accent, borderWidth: 1.5 },
    '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: T.text },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: T.accent },
});

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.875rem',
  letterSpacing: '0.01em',
  transition: 'all 0.18s ease',
  '&:hover': { transform: 'translateY(-1px)' },
  '&:active': { transform: 'translateY(0)' },
});

const filterSelectSx = {
  borderRadius: 2,
  bgcolor: '#fafafa',
  fontSize: '0.875rem',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.accent, borderWidth: '1.5px' },
};

const ExcelTableCell = ({ children, header, ...props }) => (
  <TableCell {...props} sx={{ whiteSpace: 'nowrap', fontSize: '0.82rem', ...props.sx }}>
    {children}
  </TableCell>
);

const PayrollProcess = () => {
  const { settings } = useSystemSettings();

  const { hasAccess, loading: accessLoading, error: accessError } = usePageAccess('payroll-table');
  const { calculatePayroll, loading: formulasLoading } = usePayrollFormulas();

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
    totalEmployees: 0, processedEmployees: 0, unprocessedEmployees: 0,
    totalGrossSalary: 0, totalNetSalary: 0,
  });
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [bulkSaveProgress, setBulkSaveProgress] = useState({ current: 0, total: 0 });
  const [bulkSaveOpen, setBulkSaveOpen] = useState(false);
  const [payrollFormulasData, setPayrollFormulasData] = useState([]);
  const [empCatMap, setEmpCatMap] = useState({});
  const [selectedEmpCat, setSelectedEmpCat] = useState('');

  const groupedEmpCats = useMemo(() => {
    const g = {};
    Object.values(empCatMap).forEach(({ parentGroup, typeName, colorHex }) => {
      if (!parentGroup) return;
      if (!g[parentGroup]) g[parentGroup] = [];
      const key = `${parentGroup}|${typeName}`;
      if (!g[parentGroup].find((i) => i.key === key)) g[parentGroup].push({ key, typeName, colorHex });
    });
    return g;
  }, [empCatMap]);

  const fetchPayrollFormulasData = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/payroll-formulas`, getAuthHeaders());
      setPayrollFormulasData(res.data);
    } catch (err) { console.error('Error fetching payroll formulas:', err); }
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
      .replace(/Math\.floor/g, 'Floor').replace(/Math\.ceil/g, 'Ceil').replace(/Math\.round/g, 'Round')
      .replace(/\s+/g, ' ').trim();
    return { readable, description: formula.description || '' };
  };

  const HeaderTooltip = ({ fieldKey, fullName, children }) => {
    const formulaInfo = getFormulaTooltip(fieldKey);
    const tooltipContent = (
      <Box sx={{ maxWidth: 320, p: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, mb: formulaInfo ? 0.5 : 0 }}>{fullName}</Typography>
        {formulaInfo && (
          <>
            <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 1, px: 1, py: 0.5, mt: 0.5, wordBreak: 'break-all' }}>
              {formulaInfo.readable}
            </Typography>
            {formulaInfo.description && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.85 }}>{formulaInfo.description}</Typography>
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

  const handleView = (rowId) => { const row = computedRows.find((item) => item.id === rowId); setViewRow(row); setOpenViewModal(true); };
  const handleCloseView = () => { setOpenViewModal(false); setViewRow(null); };

  const monthOptions = [
    { value: '', label: 'All Months' }, { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' }, { value: '04', label: 'April' }, { value: '05', label: 'May' },
    { value: '06', label: 'June' }, { value: '07', label: 'July' }, { value: '08', label: 'August' },
    { value: '09', label: 'September' }, { value: '10', label: 'October' }, { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];
  const yearOptions = [
    { value: '', label: 'All Years' }, { value: '2024', label: '2024' },
    { value: '2025', label: '2025' }, { value: '2026', label: '2026' },
  ];

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  };

  const canSubmit = selectedRows.length > 0;
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); };

  const testAuth = async () => {
    try { await axios.get(`${API_BASE_URL}/PayrollRoute/test-auth`, getAuthHeaders()); }
    catch (error) { console.error('Auth test failed:', error.response?.data || error.message); }
  };

  const fetchFinalizedPayroll = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/PayrollRoute/payroll-processed`, getAuthHeaders());
      setFinalizedPayroll(res.data);
    } catch (err) { console.error('Error fetching finalized payroll:', err); }
  };

  useEffect(() => { fetchFinalizedPayroll(); }, []);

  const fetchEmpCatMap = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`, getAuthHeaders());
      const map = {};
      (Array.isArray(res.data) ? res.data : []).forEach((item) => {
        if (!item.employeeNumber) return;
        const label = item.parentGroup && item.typeName ? `${item.parentGroup} | ${item.typeName}` : item.categoryLabel || '';
        if (label) map[item.employeeNumber.toString()] = { label, colorHex: item.colorHex || '#757575', parentGroup: item.parentGroup || '', typeName: item.typeName || '' };
      });
      setEmpCatMap(map);
    } catch (err) { console.error('Error fetching employment categories:', err); }
  };

  const computeSummaryForRows = (rows) => {
    const processedEmployees = rows.filter((item) => item.status === 'Processed' || item.status === 1).length;
    const unprocessedEmployees = rows.filter((item) => item.status !== 'Processed' && item.status !== 1).length;
    const totalGrossSalary = rows.reduce((sum, item) => sum + parseFloat(item.grossSalary || 0), 0);
    const totalNetSalary = rows.reduce((sum, item) => sum + parseFloat(item.netSalary || 0), 0);
    return { totalEmployees: rows.length, processedEmployees, unprocessedEmployees, totalGrossSalary, totalNetSalary };
  };

  const getFilteredRows = (baseRows, department, status, month, year) => {
    let filtered = [...baseRows];
    if (status && status !== '') filtered = filtered.filter((r) => r.status === status);
    if (department && department !== '') filtered = filtered.filter((r) => r.department === department);
    if (month && month !== '') filtered = filtered.filter((r) => r.startDate ? String(new Date(r.startDate).getMonth() + 1).padStart(2, '0') === month : false);
    if (year && year !== '') filtered = filtered.filter((r) => r.startDate ? new Date(r.startDate).getFullYear().toString() === year : false);
    return filtered;
  };

  const applyFilters = (department, search, status, month, year, empCat = selectedEmpCat) => {
    let filtered = getFilteredRows(data, department, status, month, year);
    if (empCat) {
      filtered = filtered.filter((record) => {
        const cat = empCatMap[record.employeeNumber?.toString()];
        if (!cat) return false;
        const [filterType, filterValue] = empCat.split('||');
        if (filterType === 'group') return cat.parentGroup === filterValue;
        return `${cat.parentGroup}|${cat.typeName}` === filterValue;
      });
    }
    setFilteredData(filtered);
    setSummaryData(computeSummaryForRows(filtered));
    setIsPayrollProcessed(filtered.length === 0);
    setPage(0);
  };

  const fetchPayrollData = async (searchTermParam = '') => {
    try {
      setIsSearching(true);
      const url = searchTermParam
        ? `${API_BASE_URL}/PayrollRoute/payroll/search?searchTerm=${searchTermParam}`
        : `${API_BASE_URL}/PayrollRoute/payroll-with-remittance`;
      const res = await axios.get(url, getAuthHeaders());
      const seen = new Map(); const duplicates = new Set();
      res.data.forEach((item) => {
        const key = `${item.name}|${item.employeeNumber}|${item.startDate}|${item.endDate}`;
        if (seen.has(key)) duplicates.add(key); else seen.set(key, item);
      });
      const normalizedData = res.data.map((item) => {
        const n = {
          ...item,
          tevl: Number(item.tevl) || 0, increment: item.increment ?? 0,
          gsisSalaryLoan: item.gsisSalaryLoan ?? 0, gsisPolicyLoan: item.gsisPolicyLoan ?? 0,
          gsisArrears: item.gsisArrears ?? 0, cpl: item.cpl ?? 0, mpl: item.mpl ?? 0,
          eal: item.eal ?? 0, mplLite: item.mplLite ?? 0, emergencyLoan: item.emergencyLoan ?? 0,
          pagibigFundCont: item.pagibigFundCont ?? 0, pagibig2: item.pagibig2 ?? 0,
          multiPurpLoan: item.multiPurpLoan ?? 0, liquidatingCash: item.liquidatingCash ?? 0,
          landbankSalaryLoan: item.landbankSalaryLoan ?? 0, earistCreditCoop: item.earistCreditCoop ?? 0,
          feu: item.feu ?? 0, h: item.h ?? 0, m: item.m ?? 0, s: item.s ?? 0,
          withholdingTax: item.withholdingTax ?? 0, ec: item.ec ?? 0,
          rateNbc594: item.rateNbc594 ?? 0, nbcDiffl597: item.nbcDiffl597 ?? 0,
          status: item.status === 'Processed' || item.status === 1 ? 'Processed' : 'Unprocessed',
        };
        return calculatePayroll(n) || n;
      });
      setDuplicateEmployeeNumbers([...duplicates]);
      setData(normalizedData);
      let baseFiltered = getFilteredRows(normalizedData, selectedDepartment, selectedStatus, selectedMonth, selectedYear);
      if (selectedEmpCat) {
        baseFiltered = baseFiltered.filter((record) => {
          const cat = empCatMap[record.employeeNumber?.toString()];
          if (!cat) return false;
          const [filterType, filterValue] = selectedEmpCat.split('||');
          if (filterType === 'group') return cat.parentGroup === filterValue;
          return `${cat.parentGroup}|${cat.typeName}` === filterValue;
        });
      }
      setFilteredData(baseFiltered);
      setSummaryData(computeSummaryForRows(baseFiltered));
      setIsPayrollProcessed(baseFiltered.length === 0);
      setPage(0);
    } catch (err) {
      console.error('Error fetching payroll data:', err);
      setError('An error occurred while fetching the payroll data.');
    } finally { setIsSearching(false); }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/department-table`, getAuthHeaders());
      setDepartments(response.data);
    } catch (err) { console.error('Error fetching departments:', err); }
  };

  usePayrollRealtimeRefresh(() => {
    fetchFinalizedPayroll(); fetchDepartments();
    fetchPayrollData(searchTerm); fetchPayrollFormulasData(); fetchEmpCatMap();
  });

  useEffect(() => { testAuth(); fetchPayrollData(); fetchDepartments(); fetchPayrollFormulasData(); fetchEmpCatMap(); }, []);
  useEffect(() => { return () => { if (searchTimeout) clearTimeout(searchTimeout); }; }, [searchTimeout]);

  const handleDepartmentChange = (e) => { const v = e.target.value; setSelectedDepartment(v); applyFilters(v, searchTerm, selectedStatus, selectedMonth, selectedYear); };
  const handleStatusChange = (e) => { const v = e.target.value; setSelectedStatus(v); applyFilters(selectedDepartment, searchTerm, v, selectedMonth, selectedYear); };
  const handleMonthChange = (e) => { const v = e.target.value; setSelectedMonth(v); applyFilters(selectedDepartment, searchTerm, selectedStatus, v, selectedYear); };
  const handleYearChange = (e) => { const v = e.target.value; setSelectedYear(v); applyFilters(selectedDepartment, searchTerm, selectedStatus, selectedMonth, v); };
  const handleEmpCatChange = (e) => { const v = e.target.value; setSelectedEmpCat(v); applyFilters(selectedDepartment, searchTerm, selectedStatus, selectedMonth, selectedYear, v); };
  const handleSearchChange = (e) => {
    const term = e.target.value; setSearchTerm(term);
    if (searchTimeout) clearTimeout(searchTimeout);
    if (!term.trim()) { fetchPayrollData(); applyFilters(selectedDepartment, '', selectedStatus, selectedMonth, selectedYear); return; }
    const t = setTimeout(() => fetchPayrollData(term), 500); setSearchTimeout(t);
  };

  const clearAllFilters = () => {
    setSelectedDepartment(''); setSelectedStatus(''); setSelectedMonth(''); setSelectedYear(''); setSelectedEmpCat('');
    applyFilters('', searchTerm, '', '', '', '');
  };
  const hasActiveFilters = selectedDepartment || selectedStatus || selectedMonth || selectedYear || selectedEmpCat;

  const handleSubmitPayroll = async () => {
    try {
      const updatedData = filteredData.map((item) => {
        const c = calculatePayroll(item) || item;
        return {
          ...c,
          totalGsisDeds: (parseFloat(c.totalGsisDeds) || 0).toFixed(2),
          totalPagibigDeds: (parseFloat(c.totalPagibigDeds) || 0).toFixed(2),
          totalOtherDeds: (parseFloat(c.totalOtherDeds) || 0).toFixed(2),
          grossSalary: (parseFloat(c.grossSalary) || 0).toFixed(2),
          abs: (parseFloat(c.abs) || 0).toFixed(2),
          netSalary: (parseFloat(c.netSalary) || 0).toFixed(2),
          totalDeductions: (parseFloat(c.totalDeductions) || 0).toFixed(2),
          PhilHealthContribution: (parseFloat(c.PhilHealthContribution) || 0).toFixed(2),
          personalLifeRetIns: (parseFloat(c.personalLifeRetIns) || 0).toFixed(2),
          pay1stCompute: (parseFloat(c.pay1stCompute) || 0).toFixed(2),
          pay2ndCompute: (parseFloat(c.pay2ndCompute) || 0).toFixed(2),
          pay1st: (parseFloat(c.pay1st) || 0).toFixed(0),
          pay2nd: (parseFloat(c.pay2nd) || 0).toFixed(2),
          rtIns: (parseFloat(c.rtIns) || 0).toFixed(2),
          status: 'Processed',
        };
      });
      const toInt = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : 0; };
      const toSecondsFromHMS = (h, m, s) => toInt(h) * 3600 + toInt(m) * 60 + toInt(s);
      const secondsToHMS = (totalSeconds) => {
        const sec = Math.max(0, totalSeconds);
        const hh = Math.floor(sec / 3600); const mm = Math.floor((sec % 3600) / 60); const ss = sec % 60;
        const pad = (n) => String(n).padStart(2, '0');
        return { h: hh, m: mm, s: ss, text: `${pad(hh)}:${pad(mm)}:${pad(ss)}` };
      };
      const computeVLTimeOffset = (item) => {
        const tevl = toInt(item.tevl) + 10;
        const tevlSeconds = toInt(tevl) * 3600;
        const tardySeconds = toSecondsFromHMS(item.h, item.m, item.s);
        const dvltSeconds = Math.min(tevlSeconds, tardySeconds);
        const vlbSeconds = tevlSeconds - dvltSeconds;
        return { dvlt: secondsToHMS(dvltSeconds).text, vlb: secondsToHMS(vlbSeconds).text };
      };
      const rowsToSubmit = updatedData.filter((item) =>
        selectedRows.includes(`${item.employeeNumber}|${item.startDate}|${item.endDate}`) &&
        !finalizedPayroll.some((fp) => fp.employeeNumber === item.employeeNumber && fp.startDate === item.startDate && fp.endDate === item.endDate)
      );
      const processedRowsToSubmit = rowsToSubmit.map((item) => {
        const { dvlt, vlb } = computeVLTimeOffset(item);
        return {
          ...item, h: toInt(item.h), m: toInt(item.m), s: toInt(item.s),
          tevl: toInt(item.tevl) + 10, dvlt, vlb,
          grossSalary: parseFloat(item.grossSalary) || 0, abs: parseFloat(item.abs) || 0,
          netSalary: parseFloat(item.netSalary) || 0, withholdingTax: parseFloat(item.withholdingTax) || 0,
          personalLifeRetIns: parseFloat(item.personalLifeRetIns) || 0,
          totalGsisDeds: parseFloat(item.totalGsisDeds) || 0, totalPagibigDeds: parseFloat(item.totalPagibigDeds) || 0,
          totalOtherDeds: parseFloat(item.totalOtherDeds) || 0, totalDeductions: parseFloat(item.totalDeductions) || 0,
          pay1st: parseFloat(item.pay1st) || 0, pay2nd: parseFloat(item.pay2nd) || 0,
          pay1stCompute: parseFloat(item.pay1stCompute) || 0, pay2ndCompute: parseFloat(item.pay2ndCompute) || 0,
          rtIns: parseFloat(item.rtIns) || 0, ec: parseFloat(item.ec) || 0,
          rateNbc584: parseFloat(item.rateNbc584) || 0, nbc594: parseFloat(item.nbc594) || 0,
          rateNbc594: parseFloat(item.rateNbc594) || 0, nbcDiffl597: parseFloat(item.nbcDiffl597) || 0,
          increment: parseFloat(item.increment) || 0, gsisSalaryLoan: parseFloat(item.gsisSalaryLoan) || 0,
          gsisPolicyLoan: parseFloat(item.gsisPolicyLoan) || 0, gsisArrears: parseFloat(item.gsisArrears) || 0,
          cpl: parseFloat(item.cpl) || 0, mpl: parseFloat(item.mpl) || 0, eal: parseFloat(item.eal) || 0,
          mplLite: parseFloat(item.mplLite) || 0, emergencyLoan: parseFloat(item.emergencyLoan) || 0,
          pagibigFundCont: parseFloat(item.pagibigFundCont) || 0, pagibig2: parseFloat(item.pagibig2) || 0,
          multiPurpLoan: parseFloat(item.multiPurpLoan) || 0, liquidatingCash: parseFloat(item.liquidatingCash) || 0,
          landbankSalaryLoan: parseFloat(item.landbankSalaryLoan) || 0, earistCreditCoop: parseFloat(item.earistCreditCoop) || 0,
          feu: parseFloat(item.feu) || 0, PhilHealthContribution: parseFloat(item.PhilHealthContribution) || 0,
        };
      });
      if (processedRowsToSubmit.length === 0) { alert('No payroll records selected for submission.'); return; }
      for (const item of updatedData) {
        await axios.put(`${API_BASE_URL}/PayrollRoute/payroll-with-remittance/${item.employeeNumber}/${item.startDate}/${item.endDate}`, item, getAuthHeaders());
      }
      await axios.post(`${API_BASE_URL}/PayrollRoute/payroll-processed`, processedRowsToSubmit, getAuthHeaders());
    } catch (error) {
      console.error('Error submitting payroll:', error);
      alert(error.response?.data?.error || error.message || 'An error occurred while submitting payroll.');
    }
  };

  const handleDelete = async (rowId, employeeNumber) => {
    try {
      await axios.delete(`${API_BASE_URL}/PayrollRoute/payroll-with-remittance/${rowId}/${employeeNumber}`, getAuthHeaders());
      const newData = filteredData.filter((item) => item.id !== rowId);
      setFilteredData(newData);
      const seen = new Map(); const updatedDuplicates = new Set();
      newData.forEach((item) => {
        const key = `${item.name}|${item.employeeNumber}|${item.startDate}|${item.endDate}`;
        if (seen.has(key)) updatedDuplicates.add(key); else seen.set(key, item);
      });
      setDuplicateEmployeeNumbers([...updatedDuplicates]);
    } catch (error) { console.error('Error deleting payroll data:', error); }
  };

  const handleModalChange = (e) => { const { name, value } = e.target; setEditRow((prev) => ({ ...prev, [name]: value })); };
  const handleCancel = () => { setOpenModal(false); setEditRow(null); };
  const handleEdit = (rowId) => { const row = computedRows.find((item) => item.id === rowId); setEditRow(row); setOpenModal(true); };

  const handleSave = async () => {
    setLoading(true);
    try {
      const n = {
        ...editRow, h: editRow.h ?? 0, m: editRow.m ?? 0, increment: editRow.increment ?? 0,
        gsisSalaryLoan: editRow.gsisSalaryLoan ?? 0, gsisPolicyLoan: editRow.gsisPolicyLoan ?? 0,
        gsisArrears: editRow.gsisArrears ?? 0, cpl: editRow.cpl ?? 0, mpl: editRow.mpl ?? 0,
        eal: editRow.eal ?? 0, mplLite: editRow.mplLite ?? 0, emergencyLoan: editRow.emergencyLoan ?? 0,
        pagibigFundCont: editRow.pagibigFundCont ?? 0, pagibig2: editRow.pagibig2 ?? 0,
        multiPurpLoan: editRow.multiPurpLoan ?? 0, liquidatingCash: editRow.liquidatingCash ?? 0,
        landbankSalaryLoan: editRow.landbankSalaryLoan ?? 0, earistCreditCoop: editRow.earistCreditCoop ?? 0,
        feu: editRow.feu ?? 0, withholdingTax: editRow.withholdingTax ?? 0,
        rateNbc594: editRow.rateNbc594 ?? 0, nbcDiffl597: editRow.nbcDiffl597 ?? 0, ec: editRow.ec ?? 0,
      };
      const c = calculatePayroll(n) || n;
      const updatedRow = {
        ...c, id: editRow.id, h: parseInt(c.h) || 0, m: parseInt(c.m) || 0,
        grossSalary: parseFloat(c.grossSalary) || 0, abs: parseFloat(c.abs) || 0,
        PhilHealthContribution: parseFloat(c.PhilHealthContribution) || 0,
        personalLifeRetIns: parseFloat(c.personalLifeRetIns) || 0,
        netSalary: parseFloat(c.netSalary) || 0, totalGsisDeds: parseFloat(c.totalGsisDeds) || 0,
        totalPagibigDeds: parseFloat(c.totalPagibigDeds) || 0, totalOtherDeds: parseFloat(c.totalOtherDeds) || 0,
        totalDeductions: parseFloat(c.totalDeductions) || 0, pay1st: parseFloat(c.pay1st) || 0,
        pay2nd: parseFloat(c.pay2nd) || 0, pay1stCompute: parseFloat(c.pay1stCompute) || 0,
        pay2ndCompute: parseFloat(c.pay2ndCompute) || 0, rtIns: parseFloat(c.rtIns) || 0,
      };
      await axios.put(`${API_BASE_URL}/PayrollRoute/payroll-with-remittance/${editRow.employeeNumber}/${editRow.startDate}/${editRow.endDate}`, updatedRow, getAuthHeaders());
      setOpenModal(false);
      const r = calculatePayroll(updatedRow) || updatedRow;
      setFilteredData((prev) => prev.map((item) => item.id === updatedRow.id ? { ...item, ...r } : item));
      setData((prev) => prev.map((item) => item.id === updatedRow.id ? { ...item, ...r } : item));
      setTimeout(() => { setLoading(false); setSuccessAction('edit'); setSuccessOpen(true); setTimeout(() => setSuccessOpen(false), 2500); }, 1000);
    } catch (error) { console.error('Error updating payroll:', error); setLoading(false); setError('Failed to update payroll data.'); }
  };

  const fmt = (v, dec = 2) => (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });

  const computedRows = filteredData.map((item) => {
    const c = calculatePayroll(item) || item;
    return {
      ...c, h: c.h || 0, m: c.m || 0,
      totalGsisDeds: fmt(c.totalGsisDeds), totalPagibigDeds: fmt(c.totalPagibigDeds),
      totalOtherDeds: fmt(c.totalOtherDeds), grossSalary: fmt(c.grossSalary),
      tevl: fmt(c.tevl), abs: fmt(c.abs), netSalary: fmt(c.netSalary),
      totalDeductions: fmt(c.totalDeductions), PhilHealthContribution: fmt(c.PhilHealthContribution),
      personalLifeRetIns: fmt(c.personalLifeRetIns), pay1stCompute: fmt(c.pay1stCompute),
      pay2ndCompute: fmt(c.pay2ndCompute), pay1st: fmt(c.pay1st, 0), pay2nd: fmt(c.pay2nd),
      rtIns: fmt(c.rtIns),
    };
  });

  const handleRecalculateAndSaveAll = async () => {
    if (filteredData.length === 0) return;
    setIsBulkSaving(true); setBulkSaveProgress({ current: 0, total: filteredData.length }); setBulkSaveOpen(true);
    try {
      for (let i = 0; i < filteredData.length; i++) {
        const item = filteredData[i];
        try {
          const n = {
            ...item, h: item.h ?? 0, m: item.m ?? 0, increment: item.increment ?? 0,
            gsisSalaryLoan: item.gsisSalaryLoan ?? 0, gsisPolicyLoan: item.gsisPolicyLoan ?? 0,
            gsisArrears: item.gsisArrears ?? 0, cpl: item.cpl ?? 0, mpl: item.mpl ?? 0,
            eal: item.eal ?? 0, mplLite: item.mplLite ?? 0, emergencyLoan: item.emergencyLoan ?? 0,
            pagibigFundCont: item.pagibigFundCont ?? 0, pagibig2: item.pagibig2 ?? 0,
            multiPurpLoan: item.multiPurpLoan ?? 0, liquidatingCash: item.liquidatingCash ?? 0,
            landbankSalaryLoan: item.landbankSalaryLoan ?? 0, earistCreditCoop: item.earistCreditCoop ?? 0,
            feu: item.feu ?? 0, withholdingTax: item.withholdingTax ?? 0,
            rateNbc594: item.rateNbc594 ?? 0, nbcDiffl597: item.nbcDiffl597 ?? 0, ec: item.ec ?? 0,
          };
          const c = calculatePayroll(n) || n;
          const updatedRow = {
            ...c, id: item.id, h: parseInt(c.h) || 0, m: parseInt(c.m) || 0,
            grossSalary: parseFloat(c.grossSalary) || 0, abs: parseFloat(c.abs) || 0,
            PhilHealthContribution: parseFloat(c.PhilHealthContribution) || 0,
            personalLifeRetIns: parseFloat(c.personalLifeRetIns) || 0,
            netSalary: parseFloat(c.netSalary) || 0, totalGsisDeds: parseFloat(c.totalGsisDeds) || 0,
            totalPagibigDeds: parseFloat(c.totalPagibigDeds) || 0, totalOtherDeds: parseFloat(c.totalOtherDeds) || 0,
            totalDeductions: parseFloat(c.totalDeductions) || 0, pay1st: parseFloat(c.pay1st) || 0,
            pay2nd: parseFloat(c.pay2nd) || 0, pay1stCompute: parseFloat(c.pay1stCompute) || 0,
            pay2ndCompute: parseFloat(c.pay2ndCompute) || 0, rtIns: parseFloat(c.rtIns) || 0,
            withholdingTax: parseFloat(c.withholdingTax) || 0, ec: parseFloat(c.ec) || 0,
            rateNbc594: parseFloat(c.rateNbc594) || 0, nbcDiffl597: parseFloat(c.nbcDiffl597) || 0,
            increment: parseFloat(c.increment) || 0,
          };
          if (item.startDate && item.endDate) {
            await axios.put(`${API_BASE_URL}/PayrollRoute/payroll-with-remittance/${item.employeeNumber}/${item.startDate}/${item.endDate}`, updatedRow, getAuthHeaders());
          }
          setBulkSaveProgress({ current: i + 1, total: filteredData.length });
        } catch (error) { console.error(`Error saving ${item.employeeNumber}:`, error); }
      }
      await fetchPayrollData();
      setSuccessAction('bulkSave'); setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2500);
    } catch (error) { console.error('Bulk save error:', error); }
    finally { setIsBulkSaving(false); setTimeout(() => setBulkSaveOpen(false), 1000); }
  };

  if (accessLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
        <CircularProgress sx={{ color: T.accent, mb: 2 }} />
        <Typography variant="h6" sx={{ color: T.accent }}>Loading access information…</Typography>
      </Box>
    );
  }
  if (!accessLoading && hasAccess !== true) {
    return <AccessDenied title="Access Denied" message="You do not have permission to access Payroll Processing." returnPath="/admin-home" returnButtonText="Return to Home" />;
  }

  const empCatFilterLabel = () => {
    if (!selectedEmpCat) return null;
    const [filterType, filterValue] = selectedEmpCat.split('||');
    if (filterType === 'group') return `Category Group: ${filterValue}`;
    const [pg, tn] = filterValue.split('|');
    return `Category: ${tn || filterValue}`;
  };

  const statCards = [
    { label: 'Total Employees', value: summaryData.totalEmployees, icon: PeopleIcon, color: T.accent },
    { label: 'Processed', value: summaryData.processedEmployees, icon: CheckCircleIcon, color: '#2E7D32' },
    { label: 'Unprocessed', value: summaryData.unprocessedEmployees, icon: PendingIcon, color: '#E65100' },
    { label: 'Total Net Salary', value: `₱${summaryData.totalNetSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUpIcon, color: T.accent },
  ];

  return (
    <Box sx={{ py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, width: '100vw', maxWidth: '100%', position: 'relative', left: '63%', transform: 'translateX(-61%)', px: { xs: 2, sm: 3, md: 6 } }}>

      {/* ── Page Header ── */}
      <SectionCard sx={{ mb: 2 }}>
        <Box sx={{ px: 4, py: 3, background: T.headerGrad, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)' }} />
          <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
            <Payment sx={{ fontSize: 32, color: T.accent }} />
            <Box>
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3 }}>Payroll Processing</Typography>
              <Typography sx={{ fontSize: '0.82rem', color: T.accentMid, fontWeight: 700, opacity: 0.9 }}>Administrative Panel • Manage and process employee payroll records</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
            <Chip label="Payroll Management" size="small" sx={{ bgcolor: alpha(T.accent, 0.12), color: T.accent, fontWeight: 600, fontSize: '0.72rem' }} />
            <Tooltip title="Refresh Data">
              <IconButton onClick={() => fetchPayrollData()} sx={{ bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, color: T.accent, width: 36, height: 36, borderRadius: 2, '&:hover': { bgcolor: T.accentFaint } }}>
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
                  <Typography sx={{ fontWeight: 900, fontSize: typeof stat.value === 'string' ? '1rem' : '1.35rem', color: T.text, lineHeight: 1 }}>{stat.value}</Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: T.muted, mt: 0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stat.label}</Typography>
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
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.accent }}>Search & Filter</Typography>
            {hasActiveFilters && (
              <Box sx={{ px: 1, py: 0.2, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${T.accentBorder}`, borderRadius: '20px' }}>
                <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: T.accent }}>
                  {[selectedDepartment, selectedStatus, selectedMonth, selectedYear, selectedEmpCat].filter(Boolean).length} active
                </Typography>
              </Box>
            )}
          </Box>
          {hasActiveFilters && (
            <AccentButton size="small" onClick={clearAllFilters} startIcon={<Close sx={{ fontSize: 13 }} />}
              sx={{ fontSize: '0.72rem', color: '#d32f2f', border: '1px solid rgba(211,47,47,0.3)', px: 1.25, py: 0.3, height: 26, '&:hover': { bgcolor: alpha('#d32f2f', 0.06), transform: 'none' } }}>
              Clear all
            </AccentButton>
          )}
        </Box>

        <Box sx={{ px: 3.5, py: 2.5 }}>
          {/* Search */}
          <FieldInput fullWidth size="small" placeholder="Search by employee name or number…" value={searchTerm} onChange={handleSearchChange} disabled={isSearching} sx={{ mb: 2 }}
            InputProps={{ startAdornment: (
              <InputAdornment position="start">
                {isSearching ? <CircularProgress size={16} sx={{ color: T.accent }} /> : <SearchIcon sx={{ color: T.faint, fontSize: 18 }} />}
              </InputAdornment>
            )}} />

          {/* Dropdowns */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {/* Department */}
            <FormControl size="small" sx={{ minWidth: 160, flex: 1 }}>
              <InputLabel sx={{ fontSize: '0.82rem' }}>Department</InputLabel>
              <Select value={selectedDepartment} onChange={handleDepartmentChange} label="Department" sx={filterSelectSx}>
                <MenuItem value=""><em style={{ fontSize: '0.82rem' }}>All Departments</em></MenuItem>
                {departments.map((dept) => <MenuItem key={dept.id} value={dept.code} sx={{ fontSize: '0.82rem' }}>{dept.description}</MenuItem>)}
              </Select>
            </FormControl>

            {/* Status */}
            <FormControl size="small" sx={{ minWidth: 130, flex: '0 0 auto' }}>
              <InputLabel sx={{ fontSize: '0.82rem' }}>Status</InputLabel>
              <Select value={selectedStatus} onChange={handleStatusChange} label="Status" sx={filterSelectSx}>
                <MenuItem value=""><em style={{ fontSize: '0.82rem' }}>All Status</em></MenuItem>
                <MenuItem value="Processed" sx={{ fontSize: '0.82rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4caf50' }} />Processed</Box>
                </MenuItem>
                <MenuItem value="Unprocessed" sx={{ fontSize: '0.82rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ff9800' }} />Unprocessed</Box>
                </MenuItem>
              </Select>
            </FormControl>

            {/* Month */}
            <FormControl size="small" sx={{ minWidth: 120, flex: '0 0 auto' }}>
              <InputLabel sx={{ fontSize: '0.82rem' }}>Month</InputLabel>
              <Select value={selectedMonth} onChange={handleMonthChange} label="Month" sx={filterSelectSx}>
                {monthOptions.map((o) => <MenuItem key={o.value} value={o.value} sx={{ fontSize: '0.82rem' }}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>

            {/* Year */}
            <FormControl size="small" sx={{ minWidth: 100, flex: '0 0 auto' }}>
              <InputLabel sx={{ fontSize: '0.82rem' }}>Year</InputLabel>
              <Select value={selectedYear} onChange={handleYearChange} label="Year" sx={filterSelectSx}>
                {yearOptions.map((o) => <MenuItem key={o.value} value={o.value} sx={{ fontSize: '0.82rem' }}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>

            {/* Employment Category */}
            <FormControl size="small" sx={{ minWidth: 200, flex: 1.5 }}>
              <InputLabel sx={{ fontSize: '0.82rem' }}>Category</InputLabel>
              <Select value={selectedEmpCat} onChange={handleEmpCatChange} label="Category" sx={filterSelectSx}
                renderValue={(val) => {
                  if (!val) return <em style={{ fontSize: '0.82rem', color: T.faint }}>All Categories</em>;
                  const [filterType, filterValue] = val.split('||');
                  if (filterType === 'group') return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <WorkIcon sx={{ fontSize: 13, color: T.accent }} />
                      <Typography sx={{ fontSize: '0.82rem', color: T.accent, fontWeight: 600 }}>All {filterValue}</Typography>
                    </Box>
                  );
                  const [pg, tn] = filterValue.split('|');
                  const sample = Object.values(empCatMap).find((c) => c.parentGroup === pg && c.typeName === tn);
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: sample?.colorHex || '#757575', flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '0.82rem', color: T.text, fontWeight: 600 }}>{tn}</Typography>
                    </Box>
                  );
                }}>
                <MenuItem value=""><em style={{ fontSize: '0.82rem' }}>All Categories</em></MenuItem>
                {Object.keys(groupedEmpCats).length === 0
                  ? <MenuItem disabled sx={{ fontSize: '0.82rem', fontStyle: 'italic', color: '#999' }}>No categories loaded</MenuItem>
                  : Object.entries(groupedEmpCats).flatMap(([group, items]) => [
                    <ListSubheader key={`gh-${group}`} sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: alpha(T.accent, 0.6), lineHeight: '2.2em', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <WorkIcon sx={{ fontSize: 11 }} />{group}
                    </ListSubheader>,
                    <MenuItem key={`group-all-${group}`} value={`group||${group}`} sx={{ fontSize: '0.82rem', pl: 2.5, py: 0.75 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: alpha(T.accent, 0.35) }} /><em>All in {group}</em>
                      </Box>
                    </MenuItem>,
                    ...items.map((item) => (
                      <MenuItem key={item.key} value={`type||${item.key}`} sx={{ fontSize: '0.82rem', pl: 3.5, py: 0.75 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.colorHex, flexShrink: 0 }} />{item.typeName}
                        </Box>
                      </MenuItem>
                    )),
                  ])
                }
              </Select>
            </FormControl>
          </Box>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1.5, pt: 1.5, borderTop: `1px dashed ${alpha(T.accent, 0.15)}` }}>
              <Typography sx={{ fontSize: '0.7rem', color: alpha(T.text, 0.5), fontWeight: 600, alignSelf: 'center', mr: 0.25 }}>Active:</Typography>
              {selectedDepartment && (
                <Chip size="small" label={`Dept: ${departments.find((d) => d.code === selectedDepartment)?.description || selectedDepartment}`}
                  onDelete={() => { setSelectedDepartment(''); applyFilters('', searchTerm, selectedStatus, selectedMonth, selectedYear); }}
                  sx={{ height: 22, fontSize: '0.72rem', bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}`, '& .MuiChip-deleteIcon': { fontSize: 14, color: T.accent } }} />
              )}
              {selectedStatus && (
                <Chip size="small" label={`Status: ${selectedStatus}`}
                  onDelete={() => { setSelectedStatus(''); applyFilters(selectedDepartment, searchTerm, '', selectedMonth, selectedYear); }}
                  sx={{ height: 22, fontSize: '0.72rem', bgcolor: selectedStatus === 'Processed' ? alpha('#4caf50', 0.1) : alpha('#ff9800', 0.1), color: selectedStatus === 'Processed' ? '#2e7d32' : '#e65100', '& .MuiChip-deleteIcon': { fontSize: 14 } }} />
              )}
              {selectedMonth && (
                <Chip size="small" label={`Month: ${monthOptions.find((m) => m.value === selectedMonth)?.label}`}
                  onDelete={() => { setSelectedMonth(''); applyFilters(selectedDepartment, searchTerm, selectedStatus, '', selectedYear); }}
                  sx={{ height: 22, fontSize: '0.72rem', bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}`, '& .MuiChip-deleteIcon': { fontSize: 14, color: T.accent } }} />
              )}
              {selectedYear && (
                <Chip size="small" label={`Year: ${selectedYear}`}
                  onDelete={() => { setSelectedYear(''); applyFilters(selectedDepartment, searchTerm, selectedStatus, selectedMonth, ''); }}
                  sx={{ height: 22, fontSize: '0.72rem', bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}`, '& .MuiChip-deleteIcon': { fontSize: 14, color: T.accent } }} />
              )}
              {selectedEmpCat && (
                <Chip size="small" label={empCatFilterLabel()}
                  onDelete={() => { setSelectedEmpCat(''); applyFilters(selectedDepartment, searchTerm, selectedStatus, selectedMonth, selectedYear, ''); }}
                  sx={{ height: 22, fontSize: '0.72rem', bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}`, '& .MuiChip-deleteIcon': { fontSize: 14, color: T.accent } }} />
              )}
            </Box>
          )}
        </Box>
      </SectionCard>

      {/* ── Alerts ── */}
      {duplicateEmployeeNumbers.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }} icon={<Warning />}>
          Duplicate record(s) found: {duplicateEmployeeNumbers.map((key) => { const [name, empNum, startDate, endDate] = key.split('|'); return `${name} (${empNum}) [${startDate} – ${endDate}]`; }).join(', ')}
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} icon={<Error />}>{error}</Alert>}

      {/* ── Table ── */}
      <SectionCard sx={{ mb: 2, overflow: 'hidden' }}>
        {/* Table header bar */}
        <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: T.text }}>Employee Payroll Data</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: T.faint, mt: 0.1 }}>
              Total {filteredData.length} records · {selectedRows.length} selected
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {selectedRows.length > 0 && (
              <Box sx={{ px: 1.5, py: 0.35, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderRadius: '20px' }}>
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: T.accent }}>{selectedRows.length} selected</Typography>
              </Box>
            )}
            <AccentButton variant="outlined" size="small" startIcon={<Refresh sx={{ fontSize: 14 }} />} onClick={() => fetchPayrollData()}
              sx={{ fontSize: '0.72rem', px: 1.25, py: 0.35, height: 28, borderColor: T.accentBorder, color: T.accent, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, transform: 'none' } }}>
              Refresh
            </AccentButton>
          </Box>
        </Box>

        {/* Scrollable table + frozen columns */}
        <Box sx={{ display: 'flex', width: '100%', position: 'relative' }}>
          <Box sx={{ overflowX: 'auto', flex: 1, minWidth: 0, '&::-webkit-scrollbar': { height: 8 }, '&::-webkit-scrollbar-track': { background: T.accentFaint, borderRadius: 4 }, '&::-webkit-scrollbar-thumb': { background: alpha(T.accent, 0.35), borderRadius: 4, '&:hover': { background: alpha(T.accent, 0.55) } } }}>
            <TableContainer component={Paper} elevation={0} sx={{ overflowX: 'auto', width: 'max-content', minWidth: '100%', borderRadius: 0 }}>
              <Table sx={{ minWidth: 'max-content', tableLayout: 'auto' }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(T.accent, 0.03) }}>
                    <TableCell padding="checkbox" sx={{ borderBottom: `2px solid ${T.accentBorder}`, bgcolor: alpha(T.accent, 0.03), py: 1.5 }}>
                      <Checkbox size="small" sx={{ color: T.accentBorder, '&.Mui-checked': { color: T.accent }, '&.MuiCheckbox-indeterminate': { color: T.accent }, p: 0 }}
                        indeterminate={selectedRows.length > 0 && selectedRows.length < computedRows.filter((row) => !finalizedPayroll.some((fp) => fp.employeeNumber === row.employeeNumber && fp.startDate === row.startDate && fp.endDate === row.endDate)).length}
                        checked={selectedRows.length > 0 && selectedRows.length === computedRows.filter((row) => !finalizedPayroll.some((fp) => fp.employeeNumber === row.employeeNumber && fp.startDate === row.startDate && fp.endDate === row.endDate)).length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedRows(computedRows.filter((row) => !finalizedPayroll.some((fp) => fp.employeeNumber === row.employeeNumber && fp.startDate === row.startDate && fp.endDate === row.endDate)).map((row) => `${row.employeeNumber}|${row.startDate}|${row.endDate}`));
                          else setSelectedRows([]);
                        }} />
                    </TableCell>
                    {[
                      ['No.', null, null], ['Department', null, null], ['Employee Number', null, null],
                      ['Start Date', null, null], ['End Date', null, null], ['Name', null, null], ['Position', null, null],
                      ['Rate NBC 594', 'rateNbc594', 'Salary Rate per National Budget Circular 594'],
                      ['NBC DIFF\'L 597', 'nbcDiffl597', 'NBC Differential 597 — Salary Adjustment'],
                      ['Increment', 'increment', 'Salary Increment / Step Increment'],
                      ['Gross Salary', 'grossSalary', 'Gross Salary — Total salary before any deductions'],
                      ['TEVL', 'tevl', 'Total Earned Vacation Leave (hrs / days)'],
                      ['H', 'h', 'Hours Late / Undertime'], ['M', 'm', 'Minutes Late / Undertime'],
                      ['ABS', 'abs', 'Absence Deductions — Amount deducted for absences'],
                      ['Net Salary', 'netSalary', 'Net Salary — Take-home pay after all deductions'],
                      ['Withholding Tax', 'withholdingTax', 'Withholding Tax — BIR income tax withheld'],
                      ['Total GSIS Deductions', 'totalGsisDeds', 'Total GSIS Deductions'],
                      ['Total Pag-ibig Deductions', 'totalPagibigDeds', 'Total Pag-IBIG Deductions'],
                      ['PhilHealth', 'PhilHealthContribution', 'PhilHealth Contribution'],
                      ['Total Other Deductions', 'totalOtherDeds', 'Total Other Deductions'],
                      ['Total Deductions', 'totalDeductions', 'Total Deductions — Grand total of all deductions'],
                      ['1st Pay', 'pay1st', '1st Pay — First half salary release amount'],
                      ['2nd Pay', 'pay2nd', '2nd Pay — Second half salary release amount'],
                      ['No.', null, null], ['RT Ins.', 'rtIns', 'Retirement Insurance — GSIS retirement and insurance premium'],
                      ['EC', 'ec', 'Employees\' Compensation — EC program contribution'],
                      ['PhilHealth', 'PhilHealthContribution', 'PhilHealth Contribution'],
                      ['Pag-Ibig', 'pagibigFundCont', 'Pag-IBIG Fund Contribution'],
                    ].map(([label, key, fullName], i) => (
                      <TableCell key={`th-${i}-${label}`} sx={{ borderBottom: `2px solid ${T.accentBorder}`, py: 1.5, px: 2, fontSize: '0.62rem', fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', bgcolor: alpha(T.accent, 0.03), ...(label === 'Pay1st Compute' || label === 'Pay2nd Compute' ? { borderLeft: '2px solid rgba(0,0,0,0.15)' } : {}) }}>
                      {key && fullName ? <HeaderTooltip fieldKey={key} fullName={fullName}>{label}</HeaderTooltip> : label}
                    </TableCell>
                    ))}
                    <TableCell sx={{ borderBottom: `2px solid ${T.accentBorder}`, borderLeft: '2px solid rgba(0,0,0,0.15)', py: 1.5, px: 2, fontSize: '0.62rem', fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', bgcolor: alpha(T.accent, 0.03) }}>
                      <HeaderTooltip fieldKey="pay1stCompute" fullName="1st Pay Computed Amount">Pay1st Compute</HeaderTooltip>
                    </TableCell>
                    <TableCell sx={{ borderBottom: `2px solid ${T.accentBorder}`, py: 1.5, px: 2, fontSize: '0.62rem', fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', bgcolor: alpha(T.accent, 0.03) }}>
                      <HeaderTooltip fieldKey="pay2ndCompute" fullName="2nd Pay Computed Amount">Pay2nd Compute</HeaderTooltip>
                    </TableCell>
                    {['No.', 'Name', 'Position', 'Withholding Tax', 'Personal Life Ret Ins', 'GSIS Salary Loan', 'GSIS Policy Loan', 'gsisArrears', 'CPL', 'MPL', 'EAL', 'MPL LITE', 'Emergency Loan (ELA)', 'Total GSIS Deductions', 'Pag-ibig Fund Contribution', 'Pag-ibig 2', 'Multi-Purpose Loan', 'Total Pag-Ibig Deduction', 'PhilHealth', 'liquidatingCash', 'LandBank Salary Loan', 'Earist Credit COOP.', 'FEU', 'Total Other Deductions', 'Total Deductions'].map((h, i) => (
                      <TableCell key={`th2-${i}-${h}`} sx={{ borderBottom: `2px solid ${T.accentBorder}`, ...(i === 0 ? { borderLeft: '2px solid rgba(0,0,0,0.15)' } : {}), py: 1.5, px: 2, fontSize: '0.62rem', fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', bgcolor: alpha(T.accent, 0.03) }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredData.length > 0 ? computedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => {
                    const isDuplicate = duplicateEmployeeNumbers.includes(`${row.name}|${row.employeeNumber}|${row.startDate}|${row.endDate}`);
                    const tevlRaw = parseFloat(String(row.tevl).replace(/,/g, '')) || 0;
                    const tevlDays = (tevlRaw / 8).toFixed(3);
                    return (
                      <TableRow key={row.id ?? `${row.employeeNumber}-${row.startDate}-${row.endDate}`}
                        sx={{ bgcolor: isDuplicate ? 'rgba(255,0,0,0.05)' : index % 2 === 0 ? T.rowEven : T.rowOdd, '&:hover': { bgcolor: `${T.rowHover} !important` }, transition: 'background-color 0.12s', borderBottom: `1px solid ${T.divider}` }}>
                        <TableCell padding="checkbox" sx={{ borderBottom: 'none', py: 1.5 }}>
                          <Checkbox size="small" checked={selectedRows.includes(`${row.employeeNumber}|${row.startDate}|${row.endDate}`)}
                            onChange={() => { const k = `${row.employeeNumber}|${row.startDate}|${row.endDate}`; if (selectedRows.includes(k)) setSelectedRows((prev) => prev.filter((id) => id !== k)); else setSelectedRows((prev) => [...prev, k]); }}
                            disabled={isRowProcessed(row)} sx={{ color: T.accentBorder, '&.Mui-checked': { color: T.accent }, p: 0 }} />
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
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontWeight: 600 }}>{row.grossSalary}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none' }}>
                          <Typography sx={{ fontSize: '0.78rem', fontWeight: 700 }}>{row.tevl}</Typography>
                          <Typography sx={{ fontSize: '0.62rem', color: T.faint, whiteSpace: 'nowrap' }}>({tevlDays} days)</Typography>
                        </ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.h}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.m}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontWeight: 700 }}>{row.abs}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontWeight: 600 }}>{row.netSalary}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.withholdingTax}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.totalGsisDeds}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.totalPagibigDeds}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.PhilHealthContribution}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.totalOtherDeds}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontWeight: 600 }}>{row.totalDeductions}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', color: T.accent, fontWeight: 700 }}>{row.pay1st}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', color: T.accent, fontWeight: 700 }}>{row.pay2nd}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', color: T.muted }}>{index + 1}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.rtIns}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.ec}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.PhilHealthContribution}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.pagibigFundCont}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', borderLeft: '2px solid rgba(0,0,0,0.12)', fontSize: '0.78rem', color: T.accent, fontWeight: 700 }}>{row.pay1stCompute}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', color: T.accent, fontWeight: 700 }}>{row.pay2ndCompute}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', borderLeft: '2px solid rgba(0,0,0,0.12)', fontSize: '0.78rem', color: T.muted }}>{index + 1}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.82rem', fontWeight: 600 }}>{row.name}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.position}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.withholdingTax ? Number(row.withholdingTax).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.personalLifeRetIns}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.gsisSalaryLoan ? Number(row.gsisSalaryLoan).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.gsisPolicyLoan ? Number(row.gsisPolicyLoan).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.gsisArrears ? Number(row.gsisArrears).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.cpl ? Number(row.cpl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.mpl ? Number(row.mpl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.eal ? Number(row.eal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.mplLite ? Number(row.mplLite).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.emergencyLoan ? Number(row.emergencyLoan).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontWeight: 600 }}>{row.totalGsisDeds}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.pagibigFundCont ? Number(row.pagibigFundCont).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.pagibig2 ? Number(row.pagibig2).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.multiPurpLoan ? Number(row.multiPurpLoan).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontWeight: 600 }}>{row.totalPagibigDeds}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.PhilHealthContribution}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.liquidatingCash ? Number(row.liquidatingCash).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.landbankSalaryLoan ? Number(row.landbankSalaryLoan).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.earistCreditCoop ? Number(row.earistCreditCoop).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem' }}>{row.feu ? Number(row.feu).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontWeight: 600 }}>{row.totalOtherDeds}</ExcelTableCell>
                        <ExcelTableCell sx={{ borderBottom: 'none', fontSize: '0.78rem', fontWeight: 600 }}>{row.totalDeductions}</ExcelTableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={60} sx={{ textAlign: 'center', py: 10, border: 'none' }}>
                        <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                          <Info sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                        </Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: T.muted, mb: 0.5 }}>No Records Found</Typography>
                        <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>No payroll records match your current filters.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Frozen: Status column */}
          <Box sx={{ width: 120, minWidth: 120, borderLeft: `2px solid ${T.accentBorder}`, bgcolor: alpha(T.accent, 0.02), position: 'sticky', right: 120, zIndex: 1, boxShadow: `-2px 0 6px ${alpha(T.accent, 0.07)}` }}>
            <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: alpha(T.accent, 0.03), fontWeight: 700, fontSize: '0.62rem', color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', borderBottom: `2px solid ${T.accentBorder}`, py: 1.5, px: 1 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.length > 0 ? computedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, idx) => (
                  <TableRow key={`status-${row.id ?? `${row.employeeNumber}-${row.startDate}-${row.endDate}`}`}
                    sx={{ bgcolor: idx % 2 === 0 ? T.rowEven : T.rowOdd, borderBottom: `1px solid ${T.divider}` }}>
                    <TableCell sx={{ textAlign: 'center', borderBottom: 'none', py: 1.75, px: 1 }}>
                      <Chip label={row.status} size="small" sx={{ fontWeight: 700, fontSize: '0.65rem', bgcolor: row.status === 'Processed' ? alpha('#4caf50', 0.12) : alpha('#ff9800', 0.12), color: row.status === 'Processed' ? '#2e7d32' : '#e65100', border: `1px solid ${row.status === 'Processed' ? alpha('#4caf50', 0.3) : alpha('#ff9800', 0.3)}` }} />
                    </TableCell>
                  </TableRow>
                )) : <TableRow><TableCell sx={{ textAlign: 'center', py: 1.5, color: T.faint, fontSize: '0.75rem' }}>—</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Box>

          {/* Frozen: Actions column */}
          <Box sx={{ width: 116, minWidth: 116, borderLeft: `2px solid ${T.accentBorder}`, bgcolor: alpha(T.accent, 0.02), position: 'sticky', right: 0, zIndex: 1, boxShadow: `-2px 0 6px ${alpha(T.accent, 0.07)}` }}>
            <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: alpha(T.accent, 0.03), fontWeight: 700, fontSize: '0.62rem', color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', borderBottom: `2px solid ${T.accentBorder}`, py: 1.5, px: 1 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.length > 0 ? computedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, idx) => (
                  <TableRow key={`actions-${row.id ?? `${row.employeeNumber}-${row.startDate}-${row.endDate}`}`}
                    sx={{ bgcolor: idx % 2 === 0 ? T.rowEven : T.rowOdd, borderBottom: `1px solid ${T.divider}` }}>
                    <TableCell sx={{ textAlign: 'center', borderBottom: 'none', py: 1.25, px: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="View Record">
                          <IconButton size="small" onClick={() => handleView(row.id)} sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}`, '&:hover': { bgcolor: T.accent, color: '#fff' }, transition: 'all 0.15s' }}>
                            <Visibility sx={{ fontSize: 13 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Record">
                          <IconButton size="small" onClick={() => handleEdit(row.id)} disabled={isRowProcessed(row)} sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: isRowProcessed(row) ? '#f5f5f5' : T.accentFaint, color: isRowProcessed(row) ? '#ccc' : T.accent, border: `1px solid ${T.accentBorder}`, '&:hover': { bgcolor: T.accent, color: '#fff' }, transition: 'all 0.15s' }}>
                            <EditIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Record">
                          <IconButton size="small" onClick={() => handleDelete(row.id, row.employeeNumber)} disabled={isRowProcessed(row)} sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: isRowProcessed(row) ? '#f5f5f5' : alpha('#ef4444', 0.07), color: isRowProcessed(row) ? '#ccc' : '#ef4444', border: '1px solid rgba(239,68,68,0.3)', '&:hover': { bgcolor: '#ef4444', color: '#fff' }, transition: 'all 0.15s' }}>
                            <DeleteIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                )) : <TableRow><TableCell sx={{ textAlign: 'center', py: 1.5, color: T.faint, fontSize: '0.75rem' }}>—</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Box>
        </Box>

        {/* Pagination */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${T.divider}`, px: 3.5, py: 0.5, bgcolor: T.accentFaint }}>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.text }}>Total: {filteredData.length}</Typography>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.accent }}>Selected: {selectedRows.length}</Typography>
          </Box>
          <TablePagination component="div" count={filteredData.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{ '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.78rem', fontWeight: 600, color: T.muted } }} />
        </Box>
      </SectionCard>

      {/* ── Action Buttons ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 2 }}>
        <AccentButton variant="contained" onClick={handleRecalculateAndSaveAll} disabled={filteredData.length === 0 || isBulkSaving} size="large"
          startIcon={isBulkSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon sx={{ fontSize: '16px !important' }} />}
          sx={{ bgcolor: '#2e7d32', color: '#fff', boxShadow: '0 2px 10px rgba(46,125,50,0.3)', '&:hover': { bgcolor: '#1b5e20' }, '&:disabled': { bgcolor: alpha('#2e7d32', 0.3), color: alpha('#fff', 0.5) } }}>
          {isBulkSaving ? `Saving… ${bulkSaveProgress.current}/${bulkSaveProgress.total}` : `Recalculate & Save All (${filteredData.length})`}
        </AccentButton>
        <AccentButton variant="outlined" onClick={() => (window.location.href = '/payroll-processed')} size="large" startIcon={<CreditCard sx={{ fontSize: '16px !important' }} />}
          sx={{ borderColor: T.accentBorder, color: T.accent, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent } }}>
          View Processed Payroll
        </AccentButton>
      </Box>

      {/* ── Floating Export Bar ── */}
      <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 1300, pointerEvents: 'none' }}>
        <Slide direction="up" in={selectedRows.length > 0} mountOnEnter unmountOnExit>
          <Box sx={{
            pointerEvents: 'auto', width: 'min(720px, calc(100vw - 32px))',
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
            px: 2.5, py: 2, borderRadius: '16px 16px 0 0', border: `1px solid ${T.accentBorder}`, borderBottom: 'none',
            bgcolor: T.surface, boxShadow: `0 -4px 24px ${alpha(T.accent, 0.12)}`,
          }}>
            <Box sx={{ px: 1.5, py: 0.5, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderRadius: '20px' }}>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.accent }}>Selected: {selectedRows.length}</Typography>
            </Box>
            <Box sx={{ flex: 1 }} />
            <AccentButton variant="outlined" onClick={() => setSelectedRows([])}
              sx={{ borderColor: T.accentBorder, color: T.muted, fontSize: '0.82rem', px: 2, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>
              Cancel
            </AccentButton>
            <AccentButton variant="contained" onClick={() => setShowConfirmation(true)} disabled={!canSubmit} startIcon={<ExitToApp sx={{ fontSize: '16px !important' }} />}
              sx={{ bgcolor: T.accent, color: '#fff', px: 2.5, fontWeight: 700, boxShadow: `0 4px 14px ${alpha(T.accent, 0.35)}`, '&:hover': { bgcolor: T.accentDark }, '&:disabled': { bgcolor: alpha(T.accent, 0.25), color: alpha('#fff', 0.5) } }}>
              Export Payroll Records
            </AccentButton>
          </Box>
        </Slide>
      </Box>

      {/* ── Edit Modal ── */}
      <Modal open={openModal} onClose={handleCancel}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '95vw', maxWidth: 1600, height: '90vh', bgcolor: '#f7f8fa', borderRadius: 3, boxShadow: '0 24px 80px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: `2px solid ${T.accentBorder}` }}>
          {editRow && (
            <>
              <Box sx={{ height: 4, background: `linear-gradient(90deg, ${T.accent} 0%, ${T.accentMid} 100%)` }} />
              <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.divider}`, flexShrink: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EditIcon sx={{ fontSize: 18, color: T.accent }} /></Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700, color: T.text, fontSize: '0.95rem', lineHeight: 1.2 }}>Edit Payroll Record — {editRow.name}</Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: T.muted, mt: 0.2 }}>Employee #{editRow.employeeNumber}</Typography>
                  </Box>
                </Box>
              </Box>
              <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* LEFT: Original values */}
                <Box sx={{ width: '50%', p: 3, overflowY: 'auto', bgcolor: '#f7f8fa', borderRight: `1px solid ${T.divider}`, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                    <Compare sx={{ color: T.accent, fontSize: 16 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: T.accent }}>Original Values</Typography>
                  </Box>
                  {[
                    { title: 'Employee Information', fields: [{ label: 'Employee Number', value: editRow.employeeNumber }, { label: 'Name', value: editRow.name }, { label: 'Position', value: editRow.position }, { label: 'Department', value: editRow.department }, { label: 'Start Date', value: editRow.startDate }, { label: 'End Date', value: editRow.endDate }] },
                    { title: 'Salary Rate and Adjustments', fields: [{ label: 'Rate NBC 584', value: editRow.rateNbc584 || '0.00' }, { label: 'NBC 594', value: editRow.nbc594 || '0.00' }, { label: 'Rate NBC 594', value: editRow.rateNbc594 || '0.00', highlight: true }, { label: "NBC DIFF'L 597", value: editRow.nbcDiffl597 || '0.00' }, { label: 'Increment', value: editRow.increment || '0.00' }, { label: 'Gross Salary', value: editRow.grossSalary || '0.00', highlight: true }] },
                    { title: 'Absent Deductions & Leave', fields: [{ label: 'TEVL', value: editRow.tevl || '0.00' }, { label: 'ABS', value: editRow.abs || '0.00' }, { label: 'Hours (H)', value: editRow.h || '0' }, { label: 'Minutes (M)', value: editRow.m || '0' }] },
                    { title: 'Payroll Disbursement', fields: [{ label: '1st Pay', value: editRow.pay1st || '0.00' }, { label: '2nd Pay', value: editRow.pay2nd || '0.00' }, { label: 'EC', value: editRow.ec || '0.00' }] },
                    { title: 'GSIS Deductions', fields: [{ label: 'Personal Life Ret Ins', value: editRow.personalLifeRetIns || '0.00' }, { label: 'GSIS Salary Loan', value: editRow.gsisSalaryLoan || '0.00' }, { label: 'GSIS Policy Loan', value: editRow.gsisPolicyLoan || '0.00' }, { label: 'GSIS Arrears', value: editRow.gsisArrears || '0.00' }, { label: 'MPL', value: editRow.mpl || '0.00' }, { label: 'EAL', value: editRow.eal || '0.00' }, { label: 'CPL', value: editRow.cpl || '0.00' }, { label: 'MPL Lite', value: editRow.mplLite || '0.00' }, { label: 'Emergency Loan', value: editRow.emergencyLoan || '0.00' }] },
                    { title: 'Pag-IBIG Deductions', fields: [{ label: 'Pag-ibig Fund Cont', value: editRow.pagibigFundCont || '0.00' }, { label: 'Multi-Purpose Loan', value: editRow.multiPurpLoan || '0.00' }, { label: 'Pag-ibig 2', value: editRow.pagibig2 || '0.00' }] },
                    { title: 'Other Deductions', fields: [{ label: 'Liquidating Cash', value: editRow.liquidatingCash || '0.00' }, { label: 'Earist Credit Coop', value: editRow.earistCreditCoop || '0.00' }, { label: 'FEU', value: editRow.feu || '0.00' }, { label: 'LandBank Salary Loan', value: editRow.landbankSalaryLoan || '0.00' }] },
                    { title: 'Total Contributions & Deductions', fields: [{ label: 'Withholding Tax', value: editRow.withholdingTax || '0.00' }, { label: 'Total GSIS Deds', value: editRow.totalGsisDeds || '0.00' }, { label: 'Total Pag-ibig Deds', value: editRow.totalPagibigDeds || '0.00' }, { label: 'PhilHealth', value: editRow.PhilHealthContribution || '0.00' }, { label: 'Total Other Deds', value: editRow.totalOtherDeds || '0.00' }, { label: 'Total Deductions', value: editRow.totalDeductions || '0.00', bold: true, red: true }] },
                  ].map((section) => (
                    <Paper key={section.title} sx={{ p: 2, mb: 1.5, bgcolor: T.surface, borderRadius: 2, border: `1px solid ${T.divider}` }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 1.25, color: T.accent }}>{section.title}</Typography>
                      <Grid container spacing={1.5}>
                        {section.fields.map((field) => (
                          <Grid item xs={6} key={field.label}>
                            <Typography sx={{ fontSize: '0.62rem', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{field.label}</Typography>
                            <Typography sx={{ fontSize: '0.82rem', fontWeight: field.bold ? 700 : 500, color: field.red ? '#d32f2f' : field.highlight ? T.accent : T.text }}>{field.value}</Typography>
                          </Grid>
                        ))}
                      </Grid>
                    </Paper>
                  ))}
                </Box>

                {/* RIGHT: Editable fields */}
                <Box sx={{ width: '50%', p: 3, overflowY: 'auto', bgcolor: T.surface, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                    <EditIcon sx={{ color: T.accent, fontSize: 16 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: T.accent }}>Edit Values</Typography>
                  </Box>
                  {[
                    { title: 'Employee Information', content: (
                      <Grid container spacing={1.5}>
                        <Grid item xs={6}><FieldInput fullWidth label="Employee Number" name="employeeNumber" value={editRow.employeeNumber || ''} onChange={handleModalChange} size="small" /></Grid>
                        <Grid item xs={6}><FieldInput fullWidth label="Name" name="name" value={editRow.name || ''} onChange={handleModalChange} size="small" /></Grid>
                        <Grid item xs={6}><FieldInput fullWidth label="Position" name="position" value={editRow.position || ''} onChange={handleModalChange} size="small" /></Grid>
                        <Grid item xs={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Department</InputLabel>
                            <Select name="department" value={editRow.department || ''} onChange={handleModalChange} label="Department" sx={filterSelectSx}>
                              <MenuItem value=""><em>All Departments</em></MenuItem>
                              {departments.map((dept) => <MenuItem key={dept.id} value={dept.code}>{dept.description}</MenuItem>)}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={6}><FieldInput fullWidth label="Start Date" name="startDate" value={editRow.startDate || ''} onChange={handleModalChange} size="small" /></Grid>
                        <Grid item xs={6}><FieldInput fullWidth label="End Date" name="endDate" value={editRow.endDate || ''} onChange={handleModalChange} size="small" /></Grid>
                      </Grid>
                    )},
                    { title: 'Salary Rate and Adjustments', content: (
                      <Grid container spacing={1.5}>
                        <Grid item xs={6}><FieldInput fullWidth label="Rate NBC 584" name="rateNbc584" value={editRow.rateNbc584 || ''} onChange={handleModalChange} size="small" /></Grid>
                        <Grid item xs={6}><FieldInput fullWidth label="NBC 594" name="nbc594" value={editRow.nbc594 || ''} onChange={handleModalChange} size="small" /></Grid>
                        <Grid item xs={6}><FieldInput fullWidth label="Rate NBC 594" name="rateNbc594" value={editRow.rateNbc594 || ''} onChange={handleModalChange} disabled size="small" sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: T.accent, fontWeight: 700 } }} /></Grid>
                        <Grid item xs={6}><FieldInput fullWidth label="NBC DIFF'L 597" name="nbcDiffl597" value={editRow.nbcDiffl597 || ''} onChange={handleModalChange} size="small" /></Grid>
                        <Grid item xs={6}><FieldInput fullWidth label="Increment" name="increment" value={editRow.increment || ''} onChange={handleModalChange} size="small" /></Grid>
                        <Grid item xs={6}><FieldInput fullWidth label="Gross Salary" name="grossSalary" value={editRow.grossSalary || ''} disabled size="small" helperText="Auto-calculated on save" sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#2E7D32', fontWeight: 700 } }} /></Grid>
                      </Grid>
                    )},
                    { title: 'Absent Deductions & Leave', content: (
                      <Grid container spacing={1.5}>
                        <Grid item xs={4}><FieldInput fullWidth label="TEVL" name="tevl" value={editRow.tevl || ''} onChange={handleModalChange} size="small" /></Grid>
                        <Grid item xs={4}><FieldInput fullWidth label="ABS" name="abs" value={editRow.abs || ''} onChange={handleModalChange} size="small" /></Grid>
                        <Grid item xs={4}><FieldInput fullWidth label="Hours (H)" name="h" value={editRow.h || ''} onChange={handleModalChange} size="small" /></Grid>
                        <Grid item xs={4}><FieldInput fullWidth label="Minutes (M)" name="m" value={editRow.m || ''} onChange={handleModalChange} size="small" /></Grid>
                      </Grid>
                    )},
                    { title: 'Payroll Disbursement', content: (
                      <Grid container spacing={1.5}>
                        <Grid item xs={4}><FieldInput fullWidth label="1st Pay" name="pay1st" value={editRow.pay1st || ''} onChange={handleModalChange} size="small" /></Grid>
                        <Grid item xs={4}><FieldInput fullWidth label="2nd Pay" name="pay2nd" value={editRow.pay2nd || ''} onChange={handleModalChange} size="small" /></Grid>
                        <Grid item xs={4}><FieldInput fullWidth label="EC" name="ec" value={editRow.ec || ''} onChange={handleModalChange} size="small" /></Grid>
                      </Grid>
                    )},
                    { title: 'GSIS Deductions', content: (
                      <Grid container spacing={1.5}>
                        {[['Personal Life Ret Ins','personalLifeRetIns'],['GSIS Salary Loan','gsisSalaryLoan'],['GSIS Policy Loan','gsisPolicyLoan'],['GSIS Arrears','gsisArrears'],['MPL','mpl'],['EAL','eal'],['CPL','cpl'],['MPL Lite','mplLite'],['Emergency Loan','emergencyLoan']].map(([label,name]) => (
                          <Grid item xs={6} key={name}><FieldInput fullWidth label={label} name={name} value={editRow[name] || ''} onChange={handleModalChange} size="small" /></Grid>
                        ))}
                      </Grid>
                    )},
                    { title: 'Pag-IBIG Deductions', content: (
                      <Grid container spacing={1.5}>
                        {[['Pag-ibig Fund Cont','pagibigFundCont'],['Multi-Purpose Loan','multiPurpLoan'],['Pag-ibig 2','pagibig2']].map(([label,name]) => (
                          <Grid item xs={6} key={name}><FieldInput fullWidth label={label} name={name} value={editRow[name] || ''} onChange={handleModalChange} size="small" /></Grid>
                        ))}
                      </Grid>
                    )},
                    { title: 'Other Deductions', content: (
                      <Grid container spacing={1.5}>
                        {[['Liquidating Cash','liquidatingCash'],['Earist Credit Coop','earistCreditCoop'],['FEU','feu'],['LandBank Salary Loan','landbankSalaryLoan']].map(([label,name]) => (
                          <Grid item xs={6} key={name}><FieldInput fullWidth label={label} name={name} value={editRow[name] || ''} onChange={handleModalChange} size="small" /></Grid>
                        ))}
                      </Grid>
                    )},
                    { title: 'Total Contributions & Deductions', content: (
                      <Grid container spacing={1.5}>
                        {[['Withholding Tax','withholdingTax'],['Total GSIS Deds','totalGsisDeds'],['Total Pag-ibig Deds','totalPagibigDeds'],['PhilHealth','PhilHealthContribution'],['Total Other Deds','totalOtherDeds'],['Total Deductions','totalDeductions']].map(([label,name]) => (
                          <Grid item xs={6} key={name}>
                            <FieldInput fullWidth label={label} name={name} value={editRow[name] || ''} onChange={handleModalChange} size="small"
                              sx={name === 'totalDeductions' ? { '& .MuiInputBase-input': { fontWeight: 700, color: '#d32f2f' } } : {}} />
                          </Grid>
                        ))}
                      </Grid>
                    )},
                  ].map((section) => (
                    <Paper key={section.title} sx={{ p: 2, mb: 1.5, borderRadius: 2, border: `1px solid ${T.divider}` }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 1.25, color: T.accent }}>{section.title}</Typography>
                      {section.content}
                    </Paper>
                  ))}
                </Box>
              </Box>

              <Box sx={{ px: 3, py: 2.5, borderTop: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <Typography sx={{ fontSize: '0.75rem', color: T.muted }}>💡 Compare original values (left) with your edits (right)</Typography>
                <Box sx={{ display: 'flex', gap: 1.25 }}>
                  <AccentButton variant="outlined" onClick={handleCancel} startIcon={<CancelIcon sx={{ fontSize: '14px !important' }} />}
                    sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>Cancel</AccentButton>
                  <AccentButton variant="contained" onClick={handleSave} startIcon={<SaveIcon sx={{ fontSize: '14px !important' }} />}
                    sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}>Save</AccentButton>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Modal>

      {/* ── View Modal ── */}
      <Modal open={openViewModal} onClose={handleCloseView}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '50vw', maxWidth: 900, height: '90vh', bgcolor: '#f7f8fa', borderRadius: 3, boxShadow: '0 24px 80px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: `2px solid ${T.accentBorder}` }}>
          {viewRow && (
            <>
              <Box sx={{ height: 4, background: `linear-gradient(90deg, ${T.accent} 0%, ${T.accentMid} 100%)` }} />
              <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.divider}`, flexShrink: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Visibility sx={{ fontSize: 18, color: T.accent }} /></Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700, color: T.text, fontSize: '0.95rem' }}>View Payroll Record — {viewRow.name}</Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: T.muted, mt: 0.2 }}>Employee #{viewRow.employeeNumber}</Typography>
                  </Box>
                </Box>
                <IconButton onClick={handleCloseView} size="small" sx={{ color: T.muted, '&:hover': { bgcolor: T.accentFaint } }}><Close sx={{ fontSize: 17 }} /></IconButton>
              </Box>
              <Box sx={{ flex: 1, p: 3, overflowY: 'auto', '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                {[
                  { title: 'Employee Information', fields: [{ label: 'Employee Number', value: viewRow.employeeNumber }, { label: 'Name', value: viewRow.name }, { label: 'Position', value: viewRow.position }, { label: 'Department', value: viewRow.department }, { label: 'Start Date', value: viewRow.startDate }, { label: 'End Date', value: viewRow.endDate }], cols: 4 },
                  { title: 'Salary Rate and Adjustments', fields: [{ label: 'Rate NBC 584', value: viewRow.rateNbc584 }, { label: 'NBC 594', value: viewRow.nbc594 }, { label: 'Rate NBC 594', value: viewRow.rateNbc594, green: true }, { label: "NBC DIFF'L 597", value: viewRow.nbcDiffl597 }, { label: 'Increment', value: viewRow.increment }, { label: 'Gross Salary', value: viewRow.grossSalary, green: true }], cols: 4 },
                  { title: 'Absent Deductions & Leave', fields: [{ label: 'TEVL', value: viewRow.tevl }, { label: 'ABS', value: viewRow.abs }, { label: 'Hours (H)', value: viewRow.h }, { label: 'Minutes (M)', value: viewRow.m }, { label: 'Net Salary', value: viewRow.netSalary, green: true }], cols: 4 },
                  { title: 'Payroll Disbursement', fields: [{ label: '1st Pay', value: viewRow.pay1st, red: true }, { label: '2nd Pay', value: viewRow.pay2nd, red: true }, { label: 'EC', value: viewRow.ec }, { label: 'RT Ins.', value: viewRow.rtIns }], cols: 3 },
                  { title: 'GSIS Deductions', fields: [{ label: 'Personal Life Ret Ins', value: viewRow.personalLifeRetIns }, { label: 'GSIS Salary Loan', value: viewRow.gsisSalaryLoan }, { label: 'GSIS Policy Loan', value: viewRow.gsisPolicyLoan }, { label: 'GSIS Arrears', value: viewRow.gsisArrears }, { label: 'MPL', value: viewRow.mpl }, { label: 'EAL', value: viewRow.eal }, { label: 'CPL', value: viewRow.cpl }, { label: 'MPL Lite', value: viewRow.mplLite }, { label: 'Emergency Loan', value: viewRow.emergencyLoan }, { label: 'Total GSIS Deductions', value: viewRow.totalGsisDeds, red: true }], cols: 4 },
                  { title: 'Pag-IBIG Deductions', fields: [{ label: 'Pag-ibig Fund Cont', value: viewRow.pagibigFundCont }, { label: 'Multi-Purpose Loan', value: viewRow.multiPurpLoan }, { label: 'Pag-ibig 2', value: viewRow.pagibig2 }, { label: 'Total Pag-ibig Deductions', value: viewRow.totalPagibigDeds, red: true }], cols: 4 },
                  { title: 'Other Deductions', fields: [{ label: 'Liquidating Cash', value: viewRow.liquidatingCash }, { label: 'Earist Credit Coop', value: viewRow.earistCreditCoop }, { label: 'FEU', value: viewRow.feu }, { label: 'LandBank Salary Loan', value: viewRow.landbankSalaryLoan }, { label: 'Total Other Deductions', value: viewRow.totalOtherDeds, red: true }], cols: 4 },
                  { title: 'Total Contributions & Deductions', fields: [{ label: 'Withholding Tax', value: viewRow.withholdingTax }, { label: 'PhilHealth', value: viewRow.PhilHealthContribution }, { label: 'Total Deductions', value: viewRow.totalDeductions, big: true }], cols: 4, highlight: true },
                ].map((section) => (
                  <Paper key={section.title} sx={{ p: 2, mb: 1.5, bgcolor: T.surface, borderRadius: 2, border: section.highlight ? `2px solid ${alpha('#2E7D32', 0.3)}` : `1px solid ${T.divider}` }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 1.25, color: T.accent }}>{section.title}</Typography>
                    <Grid container spacing={1.5}>
                      {section.fields.map((f) => (
                        <Grid item xs={section.cols || 4} key={f.label}>
                          <Typography sx={{ fontSize: '0.62rem', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</Typography>
                          <Typography sx={{ fontSize: f.big ? '1rem' : '0.82rem', fontWeight: f.red || f.green || f.big ? 700 : 500, color: f.red ? '#d32f2f' : f.green ? '#2E7D32' : T.text }}>
                            {f.value ? (typeof f.value === 'string' ? f.value : Number(f.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : '0.00'}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                ))}
                <Paper sx={{ p: 2, mb: 1.5, bgcolor: T.surface, borderRadius: 2, border: `1px solid ${T.divider}` }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 1, color: T.accent }}>Processing Status</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {viewRow.status === 'Processed' ? <CheckCircleIcon sx={{ fontSize: 18, color: '#2e7d32' }} /> : <PendingIcon sx={{ fontSize: 18, color: '#e65100' }} />}
                    <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: viewRow.status === 'Processed' ? '#2e7d32' : '#e65100' }}>{viewRow.status}</Typography>
                  </Box>
                </Paper>
              </Box>
              <Box sx={{ px: 3, py: 2.5, borderTop: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                <AccentButton variant="contained" onClick={handleCloseView} startIcon={<Close sx={{ fontSize: '14px !important' }} />}
                  sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', '&:hover': { bgcolor: T.accentDark } }}>Close</AccentButton>
              </Box>
            </>
          )}
        </Box>
      </Modal>

      {/* ── Confirmation Modal ── */}
      <Modal open={showConfirmation} onClose={() => { setShowConfirmation(false); setConfirmChecked(false); }}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: { xs: '90%', sm: 480 }, bgcolor: T.surface, borderRadius: 3, boxShadow: '0 24px 80px rgba(0,0,0,0.18)', overflow: 'hidden', border: `2px solid ${T.accentBorder}` }}>
          <Box sx={{ height: 4, background: `linear-gradient(90deg, ${T.accent} 0%, ${T.accentMid} 100%)` }} />
          <Box sx={{ px: 3, py: 2.5, background: T.headerGrad, display: 'flex', alignItems: 'center', gap: 2, borderBottom: `1px solid ${T.divider}` }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Payment sx={{ fontSize: 18, color: T.accent }} /></Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: T.text, fontSize: '0.95rem', lineHeight: 1.2 }}>Confirm Payroll Export</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: T.muted, mt: 0.2 }}>Final confirmation required</Typography>
            </Box>
          </Box>
          <Box sx={{ p: 3 }}>
            <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, '& .MuiAlert-icon': { color: T.accent } }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 0.25, color: T.text }}>Export {selectedRows.length} Payroll Record(s)</Typography>
              <Typography sx={{ fontSize: '0.78rem', color: T.muted }}>Please review all selected payroll records before proceeding.</Typography>
            </Alert>
            <Box sx={{ p: 2.5, bgcolor: T.accentFaint, borderRadius: 2, border: `2px solid ${confirmChecked ? T.accent : T.divider}`, mb: 2.5, display: 'flex', alignItems: 'flex-start', gap: 2, transition: 'all 0.2s ease' }}>
              <Checkbox checked={confirmChecked} onChange={(e) => setConfirmChecked(e.target.checked)} sx={{ color: T.accentBorder, '&.Mui-checked': { color: T.accent }, mt: -0.5, p: 0 }} />
              <Box>
                <Typography sx={{ fontWeight: 600, color: T.text, fontSize: '0.875rem', mb: 0.5 }}>I confirm that I have reviewed all payroll records</Typography>
                <Typography sx={{ fontSize: '0.78rem', color: T.muted }}>All information is accurate and ready for export. This action cannot be undone.</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.25 }}>
              <AccentButton variant="outlined" onClick={() => { setShowConfirmation(false); setConfirmChecked(false); }}
                sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>Cancel</AccentButton>
              <AccentButton variant="contained" disabled={!confirmChecked}
                onClick={async () => {
                  setShowConfirmation(false); setConfirmChecked(false); setLoading(true);
                  try {
                    await handleSubmitPayroll();
                    setTimeout(() => { setLoading(false); setSuccessAction('export'); setSuccessOpen(true); setTimeout(() => { setSuccessOpen(false); window.location.href = '/payroll-processed'; }, 1000); }, 1000);
                  } catch (error) { console.error('Error exporting payroll:', error); setLoading(false); alert('Failed to export payroll records. Please try again.'); }
                }}
                sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark }, '&:disabled': { bgcolor: '#e0e0e0', color: '#9e9e9e' } }}>
                Confirm & Export
              </AccentButton>
            </Box>
          </Box>
        </Box>
      </Modal>

      {/* ── Bulk Save Progress Modal ── */}
      <Modal open={bulkSaveOpen} onClose={() => {}}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 380, bgcolor: T.surface, borderRadius: 3, boxShadow: '0 24px 80px rgba(0,0,0,0.18)', p: 4, textAlign: 'center', border: `2px solid ${T.accentBorder}`, overflow: 'hidden' }}>
          <Box sx={{ height: 4, background: `linear-gradient(90deg, ${T.accent} 0%, ${T.accentMid} 100%)`, position: 'absolute', top: 0, left: 0, right: 0 }} />
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: T.text, mb: 2.5, mt: 1 }}>Saving Records to Database</Typography>
          <Box sx={{ mb: 2.5 }}><CircularProgress size={52} thickness={4} sx={{ color: T.accent }} /></Box>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: T.text, mb: 1.5 }}>{bulkSaveProgress.current} / {bulkSaveProgress.total}</Typography>
          <Box sx={{ width: '100%', height: 8, bgcolor: T.accentFaint, borderRadius: 4, overflow: 'hidden', mb: 1.5 }}>
            <Box sx={{ width: `${bulkSaveProgress.total > 0 ? (bulkSaveProgress.current / bulkSaveProgress.total) * 100 : 0}%`, height: '100%', bgcolor: T.accent, borderRadius: 4, transition: 'width 0.3s ease' }} />
          </Box>
          <Typography sx={{ fontSize: '0.75rem', color: T.faint }}>Please wait while we save all calculated values to the database…</Typography>
        </Box>
      </Modal>

      <LoadingOverlay open={loading} message="Processing…" />
      <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />
    </Box>
  );
};

export default PayrollProcess;