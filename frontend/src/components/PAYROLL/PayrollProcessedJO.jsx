import API_BASE_URL from '../../apiConfig';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, TablePagination, Paper, Typography,
  Box, CircularProgress, Alert, Button, FormControl,
  InputLabel, Select, MenuItem, InputAdornment,
  Grid, Card, Chip, IconButton, Tooltip, alpha,
  Modal, Avatar, Fade, styled, Snackbar, Checkbox, Slide,
  TextField, Portal,
} from '@mui/material';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import usePayrollRealtimeRefresh from '../../hooks/usePayrollRealtimeRefresh';
import SearchIcon from '@mui/icons-material/Search';
import {
  CloudUpload, DeleteForever, Delete as DeleteIcon,
  Lock, Payment, Pending, Publish as PublishIcon,
  People as PeopleIcon, CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon, FilterList, Refresh,
  Info, Warning, Error, Close,
} from '@mui/icons-material';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';

// ─── Unified Design Tokens (mirrors PayrollJO) ────────────────────────────────
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
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.accent, borderWidth: '1.5px' },
};

const globalFontSx = { '& *': { fontFamily: `${T.font} !important` } };

const stickyActionsHeaderSx = {
  borderBottom: `2px solid ${T.accentBorder}`,
  borderLeft: `2px solid ${T.accentBorder}`,
  py: 1.2, px: 1.5,
  fontSize: '0.65rem', fontWeight: 800, color: T.accent,
  textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
  bgcolor: '#fff', fontFamily: T.font,
  position: 'sticky', right: 0, zIndex: 53,
  boxShadow: `-2px 0 6px ${alpha(T.accent, 0.07)}`,
};

const getStickyActionsBodySx = (index) => ({
  borderBottom: 'none', py: 1.05,
  minWidth: STICKY_ACTIONS_WIDTH,
  position: 'sticky', right: 0, zIndex: 41,
  bgcolor: index % 2 === 0 ? '#ffffff' : '#f9f4f4',
  boxShadow: `-2px 0 6px ${alpha(T.accent, 0.07)}`,
  borderLeft: `2px solid ${T.accentBorder}`,
});

// ── Sub-components ─────────────────────────────────────────────────────────────
const StatusChip = ({ released }) => (
  <Chip
    label={released ? 'Released' : 'Processed'}
    size="small"
    sx={{
      fontWeight: 700, fontSize: '0.65rem', fontFamily: T.font,
      bgcolor: released ? alpha('#4caf50', 0.12) : alpha('#2196f3', 0.12),
      color: released ? '#2e7d32' : '#1565c0',
      border: `1px solid ${released ? alpha('#4caf50', 0.3) : alpha('#2196f3', 0.3)}`,
    }}
  />
);

const ExcelTableCell = ({ children, ...props }) => (
  <TableCell
    {...props}
    sx={{ whiteSpace: 'nowrap', fontSize: '0.82rem', fontFamily: T.font, borderBottom: 'none', ...props.sx }}
  >
    {children}
  </TableCell>
);

// ─────────────────────────────────────────────────────────────────────────────
const PayrollProcessed = () => {
  const { settings } = useSystemSettings();
  const { hasAccess, loading: accessLoading } = usePageAccess('payroll-processed');

  const [finalizedData, setFinalizedData] = useState([]);
  const [filteredFinalizedData, setFilteredFinalizedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('');
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [confidentialPasswordInput, setConfidentialPasswordInput] = useState('');
  const [openConfidentialPassword, setOpenConfidentialPassword] = useState(false);
  const [openReleaseConfirm, setOpenReleaseConfirm] = useState(false);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [releasedIdSet, setReleasedIdSet] = useState(new Set());
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [summaryData, setSummaryData] = useState({
    totalEmployees: 0, processedEmployees: 0, totalReleased: 0, totalNetSalary: 0,
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  };

  const normalizeDateString = (dateInput) => {
    try {
      if (!dateInput) return '';
      const d = new Date(dateInput);
      if (Number.isNaN(d.getTime())) return String(dateInput);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch (_) { return String(dateInput); }
  };

  const getRecordKey = (record) =>
    `${record?.employeeNumber ?? ''}-${normalizeDateString(record?.startDate)}-${normalizeDateString(record?.endDate)}`;

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

  const hasActiveFilters = selectedDepartment || selectedMonth || selectedYear || selectedDate || searchTerm;

  const clearAllFilters = () => {
    setSelectedDepartment(''); setSelectedMonth(''); setSelectedYear('');
    setSelectedDate(''); setSearchTerm('');
    setFilteredFinalizedData(finalizedData);
    setPage(0);
  };

  const applyFilters = (department, search, filterDate, month, year, data = finalizedData) => {
    let filtered = [...data];
    if (department) filtered = filtered.filter((r) => r.department === department);
    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(
        (r) => (r.name || '').toLowerCase().includes(lower) || (r.employeeNumber || '').toString().toLowerCase().includes(lower),
      );
    }
    if (filterDate) {
      filtered = filtered.filter((record) => {
        const s = new Date(record.startDate); s.setHours(0, 0, 0, 0);
        const e = new Date(record.endDate); e.setHours(23, 59, 59, 999);
        const sel = new Date(filterDate); sel.setHours(12, 0, 0, 0);
        return sel >= s && sel <= e;
      });
    }
    if (month) filtered = filtered.filter((r) => r.startDate && String(new Date(r.startDate).getMonth() + 1).padStart(2, '0') === month);
    if (year) filtered = filtered.filter((r) => r.startDate && new Date(r.startDate).getFullYear().toString() === year);
    setFilteredFinalizedData(filtered);
    setPage(0);
  };

  // ── Data fetching ─────────────────────────────────────────────────────────────
  const fetchFinalizedPayroll = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/PayrollRoute/payroll-processed`, getAuthHeaders());
      const joData = res.data.filter((item) => item.employmentCategory === 0);
      setFinalizedData(joData);
      setFilteredFinalizedData(joData);
      const totalNet = joData.reduce((sum, item) => sum + parseFloat(item.netSalary || 0), 0);
      setSummaryData((prev) => ({
        totalEmployees: joData.length, processedEmployees: joData.length,
        totalReleased: prev.totalReleased, totalNetSalary: totalNet,
      }));
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
      if (Array.isArray(res.data)) res.data.forEach((r) => releasedKeys.add(getRecordKey(r)));
      setReleasedIdSet(releasedKeys);
    } catch (err) { console.error('Error fetching released payroll:', err); }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/department-table`, getAuthHeaders());
      setDepartments(res.data);
    } catch (err) { console.error('Error fetching departments:', err); }
  };

  useEffect(() => { fetchDepartments(); fetchFinalizedPayroll(); fetchReleasedPayroll(); }, []);

  usePayrollRealtimeRefresh(() => {
    fetchDepartments(); fetchFinalizedPayroll(); fetchReleasedPayroll();
  });

  useEffect(() => {
    if (finalizedData.length > 0) {
      const totalReleased = finalizedData.filter((r) => releasedIdSet.has(getRecordKey(r))).length;
      setSummaryData((prev) => ({ ...prev, totalReleased }));
    }
  }, [finalizedData, releasedIdSet]);

  // ── Actions ───────────────────────────────────────────────────────────────────
  const initiateDelete = (rowOrIds) => {
    if (Array.isArray(rowOrIds)) {
      const hasReleased = rowOrIds.some((id) => {
        const rec = filteredFinalizedData.find((item) => item.id === id);
        return rec && releasedIdSet.has(getRecordKey(rec));
      });
      if (hasReleased) { alert('Cannot delete records that are already released.'); return; }
      setSelectedRow({ isBulk: true, ids: rowOrIds });
    } else {
      if (releasedIdSet.has(getRecordKey(rowOrIds))) { alert('This record is already released and cannot be deleted.'); return; }
      setSelectedRow(rowOrIds);
    }
    setOpenConfirm(true);
  };

  const handleConfirm = () => { setOpenConfirm(false); setOpenConfidentialPassword(true); };

  const handleConfidentialPasswordSubmit = async () => {
    if (!confidentialPasswordInput) { setSnackbarMessage('Please enter the confidential password.'); setSnackbarOpen(true); return; }
    try {
      const response = await axios.post(`${API_BASE_URL}/api/confidential-password/verify`, { password: confidentialPasswordInput }, getAuthHeaders());
      if (response.data.verified) {
        setOpenConfidentialPassword(false); setConfidentialPasswordInput(''); setOverlayLoading(true);
        try {
          if (selectedRow.isBulk) {
            const deletableIds = selectedRow.ids.filter((id) => {
              const rec = filteredFinalizedData.find((item) => item.id === id);
              return rec && !releasedIdSet.has(getRecordKey(rec));
            });
            if (!deletableIds.length) { setOverlayLoading(false); alert('All selected records are already released.'); return; }
            const recordsToDelete = deletableIds.map((id) => filteredFinalizedData.find((item) => item.id === id)).filter(Boolean);
            setFinalizedData((prev) => prev.filter((item) => !deletableIds.includes(item.id)));
            setFilteredFinalizedData((prev) => prev.filter((item) => !deletableIds.includes(item.id)));
            await Promise.all(deletableIds.map((id) => axios.delete(`${API_BASE_URL}/PayrollRoute/payroll-processed/${id}`, getAuthHeaders())));
            await Promise.all(recordsToDelete.map((rec) => rec.employeeNumber && rec.startDate && rec.endDate
              ? axios.put(`${API_BASE_URL}/PayrollRoute/payroll-with-remittance/${rec.employeeNumber}/${rec.startDate}/${rec.endDate}`, { ...rec, status: 'Unprocessed' }, getAuthHeaders())
              : Promise.resolve()));
            setSelectedRows([]);
          } else {
            setFinalizedData((prev) => prev.filter((item) => item.id !== selectedRow.id));
            setFilteredFinalizedData((prev) => prev.filter((item) => item.id !== selectedRow.id));
            await axios.delete(`${API_BASE_URL}/PayrollRoute/payroll-processed/${selectedRow.id}`, getAuthHeaders());
            if (selectedRow.employeeNumber && selectedRow.startDate && selectedRow.endDate)
              await axios.put(`${API_BASE_URL}/PayrollRoute/payroll-with-remittance/${selectedRow.employeeNumber}/${selectedRow.startDate}/${selectedRow.endDate}`, { ...selectedRow, status: 'Unprocessed' }, getAuthHeaders());
          }
          setTimeout(() => { setOverlayLoading(false); setSuccessAction('delete'); setSuccessOpen(true); setTimeout(() => setSuccessOpen(false), 2500); }, 2500);
        } catch (err) {
          console.error('Error deleting:', err); setOverlayLoading(false); fetchFinalizedPayroll(); alert('Failed to delete record(s).');
        } finally { setSelectedRow(null); }
      } else { setSnackbarMessage('Password verification failed.'); setSnackbarOpen(true); setConfidentialPasswordInput(''); }
    } catch (err) { setSnackbarMessage(err.response?.data?.error || 'Failed to verify password.'); setSnackbarOpen(true); setConfidentialPasswordInput(''); }
  };

  const handleReleasePayroll = async () => {
    if (!selectedRows.length) { alert('Please select records to release.'); return; }
    setOpenReleaseConfirm(false); setOverlayLoading(true);
    try {
      const unreleasedIds = selectedRows.filter((id) => {
        const rec = finalizedData.find((item) => item.id === id) || filteredFinalizedData.find((item) => item.id === id);
        return rec && !releasedIdSet.has(getRecordKey(rec));
      });
      if (!unreleasedIds.length) { alert('All selected records are already released.'); setOverlayLoading(false); return; }
      const keysToAdd = unreleasedIds.map((id) => {
        const rec = finalizedData.find((item) => item.id === id) || filteredFinalizedData.find((item) => item.id === id);
        return rec ? getRecordKey(rec) : null;
      }).filter(Boolean);
      const response = await axios.post(`${API_BASE_URL}/PayrollReleasedRoute/release-payroll`, { payrollIds: unreleasedIds, releasedBy: localStorage.getItem('username') || 'System' }, getAuthHeaders());
      if (response.data) {
        setFinalizedData((prev) => prev.filter((item) => !unreleasedIds.includes(item.id)));
        setFilteredFinalizedData((prev) => prev.filter((item) => !unreleasedIds.includes(item.id)));
        setReleasedIdSet((prev) => new Set([...Array.from(prev), ...keysToAdd]));
        setSelectedRows((prev) => prev.filter((id) => !unreleasedIds.includes(id)));
        setTimeout(() => { setOverlayLoading(false); setSuccessAction('release'); setSuccessOpen(true); setTimeout(() => { setSuccessOpen(false); window.location.href = '/payroll-released'; }, 2500); }, 2500);
      }
    } catch (err) { console.error('Error releasing:', err); setOverlayLoading(false); alert('Failed to release records.'); }
  };

  // ── Access loading skeleton ───────────────────────────────────────────────────
  if (accessLoading) {
    return (
      <Box sx={{ py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, width: '100vw', maxWidth: '100%', position: 'relative', left: '63%', transform: 'translateX(-61%)', px: { xs: 2, sm: 3, md: 6 }, fontFamily: T.font }}>
        <SectionCard sx={{ mb: 2 }}>
          <Box sx={{ p: 3.5, background: T.headerGrad, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 46, height: 46, borderRadius: '50%', bgcolor: alpha(T.accent, 0.14) }} />
            <Box sx={{ flex: 1 }}>
              <Box sx={{ width: 220, height: 16, borderRadius: 6, bgcolor: alpha(T.accent, 0.12), mb: 1 }} />
              <Box sx={{ width: 310, height: 10, borderRadius: 6, bgcolor: alpha(T.accent, 0.08) }} />
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
        message="You do not have permission to access Payroll Processed. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }

  // ── Stat cards ────────────────────────────────────────────────────────────────
  const statCards = [
    { label: 'Total Employees', value: summaryData.totalEmployees, icon: PeopleIcon, color: T.accent },
    { label: 'Processed', value: summaryData.processedEmployees, icon: CheckCircleIcon, color: '#2E7D32' },
    { label: 'Total Released', value: summaryData.totalReleased, icon: PublishIcon, color: '#1565C0' },
    { label: 'Total Net Salary', value: `₱${summaryData.totalNetSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUpIcon, color: T.accent },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 },
        width: '100vw', maxWidth: '100%',
        position: 'relative', left: '63%', transform: 'translateX(-61%)',
        px: { xs: 2, sm: 3, md: 6 },
        fontFamily: T.font, ...globalFontSx,
      }}
    >

      {/* ── Page Header ── */}
      <SectionCard sx={{ mb: 2 }}>
        <Box sx={{ px: 4, py: 3, background: T.headerGrad, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)' }} />
          <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
            <Payment sx={{ fontSize: 32, color: T.accent }} />
            <Box>
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3, fontFamily: T.font }}>
                Payroll Processed
              </Typography>
              <Typography sx={{ fontSize: '0.82rem', color: T.accentMid, fontWeight: 700, opacity: 0.9, fontFamily: T.font }}>
                Administrative Panel • View and manage all processed Job Order payroll records
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
            <Chip label="Job Order" size="small" sx={{ bgcolor: alpha(T.accent, 0.12), color: T.accent, fontWeight: 600, fontSize: '0.72rem', fontFamily: T.font }} />
            <Tooltip title="Refresh Data">
              <IconButton onClick={() => { fetchFinalizedPayroll(); fetchReleasedPayroll(); }} sx={{ bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, color: T.accent, width: 36, height: 36, borderRadius: 2, '&:hover': { bgcolor: T.accentFaint } }}>
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
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.accent, fontFamily: T.font }}>
              Search & Filter
            </Typography>
            {hasActiveFilters && (
              <Box sx={{ px: 1, py: 0.2, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${T.accentBorder}`, borderRadius: '20px' }}>
                <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: T.accent, fontFamily: T.font }}>
                  {[selectedDepartment, selectedStatus, selectedMonth, selectedYear, selectedDate, searchTerm].filter(Boolean).length} active
                </Typography>
              </Box>
            )}
          </Box>
          {hasActiveFilters && (
            <AccentButton
              size="small"
              onClick={clearAllFilters}
              startIcon={<Close sx={{ fontSize: 13 }} />}
              sx={{ fontSize: '0.72rem', color: '#d32f2f', border: '1px solid rgba(211,47,47,0.3)', px: 1.25, py: 0.3, height: 26, '&:hover': { bgcolor: alpha('#d32f2f', 0.06), transform: 'none' } }}
            >
              Clear all
            </AccentButton>
          )}
        </Box>
        <Box sx={{ px: 3.5, py: 2.5 }}>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <FieldInput
              size="small"
              placeholder="Search by name, employee number…"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); applyFilters(selectedDepartment, e.target.value, selectedDate, selectedMonth, selectedYear); }}
              sx={{ minWidth: 220, flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: T.faint, fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 160, flex: 1 }}>
              <InputLabel sx={{ fontSize: '0.82rem', fontFamily: T.font }}>Department</InputLabel>
              <Select value={selectedDepartment} onChange={(e) => { setSelectedDepartment(e.target.value); applyFilters(e.target.value, searchTerm, selectedDate, selectedMonth, selectedYear); }} label="Department" sx={filterSelectSx}>
                <MenuItem value=""><em style={{ fontSize: '0.82rem', fontFamily: T.font }}>All Departments</em></MenuItem>
                {departments.map((dept) => (<MenuItem key={dept.id} value={dept.code} sx={{ fontSize: '0.82rem', fontFamily: T.font }}>{dept.description}</MenuItem>))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130, flex: '0 0 auto' }}>
              <InputLabel sx={{ fontSize: '0.82rem', fontFamily: T.font }}>Month</InputLabel>
              <Select value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); applyFilters(selectedDepartment, searchTerm, selectedDate, e.target.value, selectedYear); }} label="Month" sx={filterSelectSx}>
                {monthOptions.map((opt) => (<MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.82rem', fontFamily: T.font }}>{opt.label}</MenuItem>))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 110, flex: '0 0 auto' }}>
              <InputLabel sx={{ fontSize: '0.82rem', fontFamily: T.font }}>Year</InputLabel>
              <Select value={selectedYear} onChange={(e) => { setSelectedYear(e.target.value); applyFilters(selectedDepartment, searchTerm, selectedDate, selectedMonth, e.target.value); }} label="Year" sx={filterSelectSx}>
                {yearOptions.map((opt) => (<MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.82rem', fontFamily: T.font }}>{opt.label}</MenuItem>))}
              </Select>
            </FormControl>
            <FieldInput
              size="small"
              type="date"
              label="Search by Date"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); applyFilters(selectedDepartment, searchTerm, e.target.value, selectedMonth, selectedYear); }}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 170, flex: '0 0 auto' }}
            />
          </Box>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1.5, pt: 1.5, borderTop: `1px dashed ${alpha(T.accent, 0.15)}` }}>
              <Typography sx={{ fontSize: '0.7rem', color: alpha(T.text, 0.5), fontWeight: 600, alignSelf: 'center', mr: 0.25, fontFamily: T.font }}>Active:</Typography>
              {selectedDepartment && (
                <Chip size="small" label={`Dept: ${departments.find((d) => d.code === selectedDepartment)?.description || selectedDepartment}`}
                  onDelete={() => { setSelectedDepartment(''); applyFilters('', searchTerm, selectedDate, selectedMonth, selectedYear); }}
                  sx={{ height: 22, fontSize: '0.72rem', bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}`, fontFamily: T.font, '& .MuiChip-deleteIcon': { fontSize: 14, color: T.accent } }} />
              )}
              {selectedMonth && (
                <Chip size="small" label={`Month: ${monthOptions.find((m) => m.value === selectedMonth)?.label}`}
                  onDelete={() => { setSelectedMonth(''); applyFilters(selectedDepartment, searchTerm, selectedDate, '', selectedYear); }}
                  sx={{ height: 22, fontSize: '0.72rem', bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}`, fontFamily: T.font, '& .MuiChip-deleteIcon': { fontSize: 14, color: T.accent } }} />
              )}
              {selectedYear && (
                <Chip size="small" label={`Year: ${selectedYear}`}
                  onDelete={() => { setSelectedYear(''); applyFilters(selectedDepartment, searchTerm, selectedDate, selectedMonth, ''); }}
                  sx={{ height: 22, fontSize: '0.72rem', bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}`, fontFamily: T.font, '& .MuiChip-deleteIcon': { fontSize: 14, color: T.accent } }} />
              )}
              {selectedDate && (
                <Chip size="small" label={`Date: ${selectedDate}`}
                  onDelete={() => { setSelectedDate(''); applyFilters(selectedDepartment, searchTerm, '', selectedMonth, selectedYear); }}
                  sx={{ height: 22, fontSize: '0.72rem', bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}`, fontFamily: T.font, '& .MuiChip-deleteIcon': { fontSize: 14, color: T.accent } }} />
              )}
            </Box>
          )}
        </Box>
      </SectionCard>

      {/* ── Error alert ── */}
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontFamily: T.font }} icon={<Error />}>{error}</Alert>}

      {/* ── Table Card ── */}
      <SectionCard sx={{ mb: 2, overflow: 'hidden', '& .MuiTableHead-root .MuiTableCell-root': { fontSize: '0.65rem !important', fontFamily: `${T.font} !important` }, '& .MuiTableBody-root .MuiTableCell-root': { fontSize: '0.82rem !important', fontFamily: `${T.font} !important` } }}>

        {/* Table header bar */}
        <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: T.text, fontFamily: T.font }}>Processed JO Payroll Data</Typography>
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
            <AccentButton variant="outlined" size="small" startIcon={<Refresh sx={{ fontSize: 14 }} />}
              onClick={() => { fetchFinalizedPayroll(); fetchReleasedPayroll(); }}
              sx={{ fontSize: '0.72rem', px: 1.25, py: 0.35, height: 28, borderColor: T.accentBorder, color: T.accent, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, transform: 'none' } }}>
              Refresh
            </AccentButton>
          </Box>
        </Box>

        {/* No records state */}
        {filteredFinalizedData.length === 0 && !loading && (
          <Box sx={{ mx: 3.5, my: 2, py: 7, px: 2, border: `1px solid ${T.divider}`, borderRadius: 2, bgcolor: '#fff', textAlign: 'center' }}>
            <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              <Info sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: T.muted, mb: 0.5, fontFamily: T.font }}>No Records Found</Typography>
            <Typography sx={{ fontSize: '0.86rem', color: T.faint, fontFamily: T.font }}>
              {searchTerm ? 'No matching records found.' : 'No processed job order payroll records available.'}
            </Typography>
          </Box>
        )}

        {/* Table */}
        {(filteredFinalizedData.length > 0 || loading) && (
          <TableContainer component={Paper} elevation={0} sx={{ overflowX: 'auto', borderRadius: 0, position: 'relative' }}>
            <Table sx={{ minWidth: 2200, tableLayout: 'auto', borderCollapse: 'separate', borderSpacing: 0 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#fff' }}>
                  {/* Checkbox */}
                  <TableCell padding="checkbox" sx={{ borderBottom: `2px solid ${T.accentBorder}`, py: 1.5, px: 2, bgcolor: alpha(T.accent, 0.03) }}>
                    <Checkbox
                      size="small"
                      sx={{ color: T.accentBorder, '&.Mui-checked': { color: T.accent }, p: 0 }}
                      indeterminate={(() => {
                        const pageRows = filteredFinalizedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
                        const selectable = pageRows.filter((r) => !releasedIdSet.has(getRecordKey(r)));
                        const selectedOnPage = selectedRows.filter((id) => selectable.some((r) => r.id === id));
                        return selectedOnPage.length > 0 && selectedOnPage.length < selectable.length;
                      })()}
                      checked={(() => {
                        const pageRows = filteredFinalizedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
                        const selectable = pageRows.filter((r) => !releasedIdSet.has(getRecordKey(r)));
                        if (!selectable.length) return false;
                        return selectable.every((r) => selectedRows.includes(r.id));
                      })()}
                      onChange={(e) => {
                        const pageRows = filteredFinalizedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
                        const selectable = pageRows.filter((r) => !releasedIdSet.has(getRecordKey(r)));
                        const ids = selectable.map((r) => r.id);
                        if (e.target.checked) setSelectedRows((prev) => [...new Set([...prev, ...ids])]);
                        else setSelectedRows((prev) => prev.filter((id) => !ids.includes(id)));
                      }}
                    />
                  </TableCell>
                  {['No.', 'Department', 'Employee #', 'Start Date', 'End Date', 'Name', 'Position', 'Gross Salary', 'Rendered Days & Hours', 'ABS', 'H', 'M', 'SSS', 'PAGIBIG', 'Net Salary', 'Date Submitted'].map((label) => (
                    <TableCell key={label} sx={{ borderBottom: `2px solid ${T.accentBorder}`, py: 1.2, px: 1.5, fontSize: '0.65rem', fontWeight: 800, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', bgcolor: alpha(T.accent, 0.03), fontFamily: T.font }}>
                      {label}
                    </TableCell>
                  ))}
                  {/* Sticky status */}
                  <TableCell align="center" sx={{ borderBottom: `2px solid ${T.accentBorder}`, borderLeft: `2px solid ${T.accentBorder}`, py: 1.2, px: 1.5, fontSize: '0.65rem', fontWeight: 800, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', bgcolor: '#fff', fontFamily: T.font, position: 'sticky', right: STICKY_ACTIONS_WIDTH, zIndex: 52, width: 110, minWidth: 110 }}>
                    Status
                  </TableCell>
                  {/* Sticky actions */}
                  <TableCell align="center" sx={stickyActionsHeaderSx}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={20} align="center" sx={{ py: 6 }}>
                      <CircularProgress sx={{ color: T.accent }} />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFinalizedData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row, index) => {
                      const isReleased = releasedIdSet.has(getRecordKey(row));
                      const isSelected = selectedRows.includes(row.id);
                      return (
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
                              checked={isSelected}
                              disabled={isReleased}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (isReleased) return;
                                if (isSelected) setSelectedRows((prev) => prev.filter((id) => id !== row.id));
                                else setSelectedRows((prev) => [...prev, row.id]);
                              }}
                              sx={{ color: T.accentBorder, '&.Mui-checked': { color: T.accent }, p: 0 }}
                            />
                          </TableCell>
                          <ExcelTableCell sx={{ color: T.muted }}>{page * rowsPerPage + index + 1}</ExcelTableCell>
                          <ExcelTableCell>{row.department || '—'}</ExcelTableCell>
                          <ExcelTableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.employeeNumber || '—'}</ExcelTableCell>
                          <ExcelTableCell>{row.startDate || '—'}</ExcelTableCell>
                          <ExcelTableCell>{row.endDate || '—'}</ExcelTableCell>
                          <ExcelTableCell sx={{ fontWeight: 600 }}>{row.name || '—'}</ExcelTableCell>
                          <ExcelTableCell>{row.position || '—'}</ExcelTableCell>
                          <ExcelTableCell sx={{ fontWeight: 700, color: T.accent }}>
                            {row.grossSalary ? Number(row.grossSalary).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                          </ExcelTableCell>
                          <ExcelTableCell>
                            {row.rh ? (() => {
                              const totalHours = Number(row.rh);
                              const days = Math.floor(totalHours / 8);
                              const hours = totalHours % 8;
                              return `${days}d${hours > 0 ? ` ${hours}h` : ''}`;
                            })() : '—'}
                          </ExcelTableCell>
                          <ExcelTableCell sx={{ fontWeight: 700, color: '#d32f2f' }}>
                            {row.abs ? Number(row.abs).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                          </ExcelTableCell>
                          <ExcelTableCell sx={{ textAlign: 'center' }}>{row.h || 0}</ExcelTableCell>
                          <ExcelTableCell sx={{ textAlign: 'center' }}>{row.m || 0}</ExcelTableCell>
                          <ExcelTableCell>{row.sss ? Number(row.sss).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</ExcelTableCell>
                          <ExcelTableCell>{Number(row.pagibig || row.pagibigFundCont || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</ExcelTableCell>
                          <ExcelTableCell sx={{ fontWeight: 800, color: '#2e7d32' }}>
                            {row.netSalary ? Number(row.netSalary).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                          </ExcelTableCell>
                          <ExcelTableCell sx={{ color: T.muted, fontSize: '0.75rem !important' }}>
                            {row.dateCreated ? new Date(row.dateCreated).toLocaleString() : '—'}
                          </ExcelTableCell>
                          {/* Sticky status */}
                          <ExcelTableCell sx={{ borderBottom: 'none', textAlign: 'center', borderLeft: `2px solid ${T.accentBorder}`, position: 'sticky', right: STICKY_ACTIONS_WIDTH, zIndex: 40, width: 110, minWidth: 110, bgcolor: index % 2 === 0 ? '#ffffff' : '#f9f4f4' }}>
                            <StatusChip released={isReleased} />
                          </ExcelTableCell>
                          {/* Sticky actions */}
                          <ExcelTableCell sx={getStickyActionsBodySx(index)}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                              <Tooltip title={isReleased ? 'Cannot delete released records' : 'Delete Record'}>
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled={isReleased}
                                    onClick={() => isSelected ? initiateDelete(selectedRows) : initiateDelete(row)}
                                    sx={{
                                      width: 28, height: 28, borderRadius: 1.5,
                                      bgcolor: isReleased ? '#f5f5f5' : alpha('#ef4444', 0.07),
                                      color: isReleased ? '#ccc' : '#ef4444',
                                      border: `1px solid ${isReleased ? '#e0e0e0' : 'rgba(239,68,68,0.3)'}`,
                                      '&:hover': { bgcolor: '#ef4444', color: '#fff' },
                                      transition: 'all 0.15s',
                                    }}
                                  >
                                    <DeleteIcon sx={{ fontSize: 13 }} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Box>
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${T.divider}`, px: 3.5, py: 0.5, bgcolor: T.accentFaint }}>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.text, fontFamily: T.font }}>Total: {filteredFinalizedData.length}</Typography>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.accent, fontFamily: T.font }}>Selected: {selectedRows.length}</Typography>
          </Box>
          <TablePagination
            component="div" count={filteredFinalizedData.length} page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{ '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.78rem', fontWeight: 600, color: T.muted, fontFamily: T.font } }}
          />
        </Box>
      </SectionCard>

      {/* ── Navigation buttons ── */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mb: 12 }}>
        <AccentButton variant="outlined" onClick={() => (window.location.href = '/payroll-table')}
          startIcon={<Pending sx={{ fontSize: 16 }} />}
          sx={{ borderColor: T.accentBorder, color: T.accent, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent } }}>
          View Pending Payroll
        </AccentButton>
        <AccentButton variant="outlined" onClick={() => (window.location.href = '/payroll-released')}
          startIcon={<BusinessCenterIcon sx={{ fontSize: 16 }} />}
          sx={{ borderColor: T.accentBorder, color: T.accent, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent } }}>
          View Released Payroll
        </AccentButton>
      </Box>

      {/* ── Floating Release Bar ── */}
      <Portal>
        <Box sx={{ position: 'fixed', bottom: { xs: '58px', md: '56px' }, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 1300, pointerEvents: 'none' }}>
          <Slide direction="up" in={selectedRows.length > 0} mountOnEnter unmountOnExit>
            <Box sx={{
              pointerEvents: 'auto',
              width: 'min(720px, calc(100vw - 32px))',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
              px: 2.5, py: 2, borderRadius: '16px 16px 0 0',
              border: `1px solid ${T.accentBorder}`, borderBottom: 'none',
              bgcolor: T.surface, boxShadow: `0 -4px 24px ${alpha(T.accent, 0.12)}`,
            }}>
              <Box sx={{ px: 1.5, py: 0.5, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderRadius: '20px' }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.accent, fontFamily: T.font }}>
                  Selected: {selectedRows.length}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }} />
              <AccentButton
                variant="outlined"
                onClick={() => setSelectedRows([])}
                sx={{ borderColor: T.accentBorder, color: T.muted, fontSize: '0.82rem', px: 2, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}
              >
                Cancel
              </AccentButton>
              <AccentButton
                variant="contained"
                onClick={() => setOpenReleaseConfirm(true)}
                disabled={selectedRows.length === 0}
                startIcon={<PublishIcon sx={{ fontSize: '16px !important' }} />}
                sx={{
                  bgcolor: T.accent, color: '#fff', px: 2.5, fontWeight: 700,
                  boxShadow: `0 4px 14px ${alpha(T.accent, 0.35)}`,
                  '&:hover': { bgcolor: T.accentDark },
                  '&:disabled': { bgcolor: alpha(T.accent, 0.25), color: alpha('#fff', 0.5) },
                }}
              >
                Release Payroll ({selectedRows.length})
              </AccentButton>
            </Box>
          </Slide>
        </Box>
      </Portal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal open={openConfirm} onClose={() => setOpenConfirm(false)}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 480 }, bgcolor: T.surface, borderRadius: 3,
          boxShadow: '0 24px 80px rgba(0,0,0,0.18)', overflow: 'hidden',
          border: `2px solid ${T.accentBorder}`, fontFamily: T.font,
        }}>
          <Box sx={{ height: 4, background: 'linear-gradient(90deg, #d32f2f 0%, #ef5350 100%)' }} />
          <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.divider}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: alpha('#d32f2f', 0.08), border: '1px solid rgba(211,47,47,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DeleteForever sx={{ fontSize: 18, color: '#d32f2f' }} />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontWeight: 700, color: T.text, fontSize: '0.95rem', fontFamily: T.font }}>Delete Payroll Record</Typography>
                  <Chip label="Irreversible" size="small" sx={{ bgcolor: alpha('#d32f2f', 0.1), color: '#d32f2f', fontWeight: 700, fontSize: '0.6rem', height: 18, border: '1px solid rgba(211,47,47,0.2)', fontFamily: T.font }} />
                </Box>
                <Typography sx={{ fontSize: '0.72rem', color: T.muted, mt: 0.2, fontFamily: T.font }}>This action cannot be undone</Typography>
              </Box>
            </Box>
            <IconButton size="small" onClick={() => setOpenConfirm(false)} sx={{ color: T.muted }}><Close sx={{ fontSize: 17 }} /></IconButton>
          </Box>
          <Box sx={{ p: 3 }}>
            <Box sx={{ p: 2, bgcolor: alpha('#d32f2f', 0.05), borderRadius: 2, border: '1px solid rgba(211,47,47,0.15)', borderLeft: '4px solid rgba(211,47,47,0.5)', display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
              <Warning sx={{ fontSize: 15, color: '#d32f2f', opacity: 0.6, mt: 0.2, flexShrink: 0 }} />
              <Typography sx={{ fontSize: '0.82rem', color: alpha(T.text, 0.75), fontWeight: 600, lineHeight: 1.65, fontFamily: T.font }}>
                Delete <strong>{selectedRow?.isBulk ? `${selectedRow.ids.length} selected records` : 'this record'}</strong>? This action will permanently remove the record(s) and cannot be undone.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ px: 3, py: 2.5, borderTop: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', justifyContent: 'flex-end', gap: 1.25 }}>
            <AccentButton variant="outlined" onClick={() => setOpenConfirm(false)}
              sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>
              Cancel
            </AccentButton>
            <AccentButton variant="contained" onClick={handleConfirm}
              startIcon={<DeleteForever sx={{ fontSize: '14px !important' }} />}
              sx={{ fontSize: '0.8rem', bgcolor: '#d32f2f', color: '#fff', boxShadow: '0 2px 10px rgba(211,47,47,0.3)', '&:hover': { bgcolor: '#c62828' } }}>
              Proceed
            </AccentButton>
          </Box>
        </Box>
      </Modal>

      {/* ── Confidential Password Modal ── */}
      <Modal open={openConfidentialPassword} onClose={() => { setOpenConfidentialPassword(false); setConfidentialPasswordInput(''); setSelectedRow(null); }}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 480 }, bgcolor: T.surface, borderRadius: 3,
          boxShadow: '0 24px 80px rgba(0,0,0,0.18)', overflow: 'hidden',
          border: `2px solid ${T.accentBorder}`, fontFamily: T.font,
        }}>
          <Box sx={{ height: 4, background: `linear-gradient(90deg, ${T.accent} 0%, ${T.accentMid} 100%)` }} />
          <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad, display: 'flex', alignItems: 'center', gap: 2, borderBottom: `1px solid ${T.divider}` }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock sx={{ fontSize: 18, color: T.accent }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: T.text, fontSize: '0.95rem', fontFamily: T.font }}>Authorization Required</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: T.muted, mt: 0.2, fontFamily: T.font }}>Enter the confidential password to proceed</Typography>
            </Box>
          </Box>
          <Box sx={{ p: 3 }}>
            <FieldInput
              autoFocus fullWidth size="small" label="Confidential Password" type="password"
              value={confidentialPasswordInput}
              onChange={(e) => setConfidentialPasswordInput(e.target.value)}
              onKeyPress={(e) => { if (e.key === 'Enter') handleConfidentialPasswordSubmit(); }}
            />
          </Box>
          <Box sx={{ px: 3, py: 2.5, borderTop: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', justifyContent: 'flex-end', gap: 1.25 }}>
            <AccentButton variant="outlined" onClick={() => { setOpenConfidentialPassword(false); setConfidentialPasswordInput(''); setSelectedRow(null); }}
              sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>
              Cancel
            </AccentButton>
            <AccentButton variant="contained" onClick={handleConfidentialPasswordSubmit}
              startIcon={<Lock sx={{ fontSize: '14px !important' }} />}
              sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}>
              Verify & Delete
            </AccentButton>
          </Box>
        </Box>
      </Modal>

      {/* ── Release Confirmation Modal ── */}
      <Modal open={openReleaseConfirm} onClose={() => setOpenReleaseConfirm(false)}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 480 }, bgcolor: T.surface, borderRadius: 3,
          boxShadow: '0 24px 80px rgba(0,0,0,0.18)', overflow: 'hidden',
          border: `2px solid ${T.accentBorder}`, fontFamily: T.font,
        }}>
          <Box sx={{ height: 4, background: `linear-gradient(90deg, ${T.accent} 0%, ${T.accentMid} 100%)` }} />
          <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad, display: 'flex', alignItems: 'center', gap: 2, borderBottom: `1px solid ${T.divider}` }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CloudUpload sx={{ fontSize: 18, color: T.accent }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: T.text, fontSize: '0.95rem', fontFamily: T.font }}>Release Payroll Records</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: T.muted, mt: 0.2, fontFamily: T.font }}>Final confirmation required</Typography>
            </Box>
          </Box>
          <Box sx={{ p: 3 }}>
            <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, '& .MuiAlert-icon': { color: T.accent } }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 0.25, color: T.text, fontFamily: T.font }}>
                Release {selectedRows.length} Payroll Record{selectedRows.length > 1 ? 's' : ''}
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', color: T.muted, fontFamily: T.font }}>
                These records will be moved to the Payroll Released module and will no longer be editable.
              </Typography>
            </Alert>
          </Box>
          <Box sx={{ px: 3, py: 2.5, borderTop: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', justifyContent: 'flex-end', gap: 1.25 }}>
            <AccentButton variant="outlined" onClick={() => setOpenReleaseConfirm(false)}
              sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>
              Cancel
            </AccentButton>
            <AccentButton variant="contained" onClick={handleReleasePayroll} disabled={releaseLoading}
              startIcon={releaseLoading ? <CircularProgress size={14} color="inherit" /> : <CloudUpload sx={{ fontSize: '14px !important' }} />}
              sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark }, '&:disabled': { bgcolor: alpha(T.accent, 0.25) } }}>
              {releaseLoading ? 'Releasing…' : 'Confirm Release'}
            </AccentButton>
          </Box>
        </Box>
      </Modal>

      <LoadingOverlay open={overlayLoading || releaseLoading} message={releaseLoading ? 'Releasing payroll records…' : 'Processing…'} />
      <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />

      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnackbarOpen(false)} severity="error" sx={{ width: '100%', bgcolor: '#d32f2f', color: 'white', fontFamily: T.font, '& .MuiAlert-icon, & .MuiAlert-action': { color: 'white' } }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PayrollProcessed;