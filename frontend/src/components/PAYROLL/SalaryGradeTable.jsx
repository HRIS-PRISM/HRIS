import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
  Typography, Box, Grid, Chip, Paper, Fade, Divider,
  styled, alpha, Avatar, Tooltip, IconButton,
  FormControl, Select, MenuItem, CircularProgress,
  TablePagination, Dialog, DialogTitle, DialogContent,
  DialogActions, LinearProgress, TextField, InputAdornment,
  Card, List, ListItem, Snackbar, Alert, Modal, ListSubheader,
  ToggleButton, ToggleButtonGroup, Collapse, Button,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Save as SaveIcon, Cancel as CancelIcon,
  Search as SearchIcon, Refresh,
  Upload as UploadIcon, Download as DownloadIcon,
  CheckCircle as CheckCircleIcon, Error as ErrorIcon,
  Upgrade as UpgradeIcon,
  FilterList as FilterListIcon,
  ClearAll as ClearAllIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Shortcut as ShortcutIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  WarningAmber as WarningIcon,
  TableChart as TableChartIcon,
  Close,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import usePayrollRealtimeRefresh from '../../hooks/usePayrollRealtimeRefresh';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';

// ─── Theme tokens (mirrors EmploymentCategoryManagement) ──────────────────────
const T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  accentMid: '#8B4545',
  accentFaint: 'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover: 'rgba(109,35,35,0.10)',
  headerGrad: 'linear-gradient(180deg,#6d2323 0%,#7e2c2c 100%)',
  rowEven: '#ffffff',
  rowOdd: 'rgba(109,35,35,0.025)',
  rowHover: 'rgba(109,35,35,0.055)',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#a0a0a0',
  surface: '#ffffff',
  divider: 'rgba(0,0,0,0.08)',
};

// ─── Shimmer ──────────────────────────────────────────────────────────────────
const shimmerKeyframes = `
@keyframes sgtShimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes sgtPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.60; }
}
`;

const Bone = ({ w = '100%', h = 14, r = 6, sx = {} }) => (
  <Box sx={{
    width: w, height: h, borderRadius: r,
    background: `linear-gradient(90deg, rgba(109,35,35,0.07) 25%, rgba(109,35,35,0.14) 50%, rgba(109,35,35,0.07) 75%)`,
    backgroundSize: '800px 100%',
    animation: 'sgtShimmer 1.6s infinite linear',
    flexShrink: 0, ...sx,
  }} />
);

const SgtWireframe = () => (
  <>
    <style>{shimmerKeyframes}</style>
    <Box sx={{ py: { xs: 2, md: 4 }, mt: { xs: 0, md: -5 }, width: '100vw', maxWidth: '100%', position: 'relative', left: '63%', transform: 'translateX(-61%)', px: { xs: 2, sm: 3, md: 6 } }}>
      <Box sx={{ mb: 3, borderRadius: 3, overflow: 'hidden', border: `1px solid ${T.accentBorder}`, animation: 'sgtPulse 2s ease-in-out infinite' }}>
        <Box sx={{ p: 3.5, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)' }} />
          <Box sx={{ flex: 1 }}>
            <Bone w={200} h={18} sx={{ mb: 1 }} />
            <Bone w={340} h={11} />
          </Box>
        </Box>
      </Box>
      <Box sx={{ borderRadius: 3, border: `1px solid ${T.accentBorder}`, bgcolor: '#fff', height: 'calc(100vh - 280px)', animation: 'sgtPulse 2s ease-in-out infinite' }}>
        <Box sx={{ p: 3.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {[180, 220, 160, 200, 140].map((w, i) => (
            <Box key={i}><Bone w={w} h={10} sx={{ mb: 1 }} /><Box sx={{ height: 40, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: '#fafafa' }} /></Box>
          ))}
        </Box>
      </Box>
    </Box>
  </>
);

// ─── Styled primitives ────────────────────────────────────────────────────────
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

const selectSx = {
  borderRadius: '8px',
  fontSize: '0.875rem',
  bgcolor: '#fff',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accent },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.accent, borderWidth: '1.5px' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

function generateYearOptions() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 2020; i <= currentYear + 10; i++) years.push(i);
  return years;
}

function generateSGOptions() {
  const options = [];
  for (let i = 1; i <= 33; i++) options.push(i.toString());
  options.push('Job Order(Graduated)');
  options.push('Job Order(Undergraduate)');
  return options;
}

const formatNumber = (val) => {
  if (!val && val !== 0) return '—';
  const num = parseFloat(val.toString().replace(/,/g, ''));
  if (isNaN(num)) return val;
  return num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ─── Main Component ───────────────────────────────────────────────────────────
const SalaryGradeTable = () => {
  const [salaryGrades, setSalaryGrades] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  const [newRecord, setNewRecord] = useState({
    effectivityDate: new Date().getFullYear().toString(),
    sg_number: '',
    step1: '', step2: '', step3: '', step4: '',
    step5: '', step6: '', step7: '', step8: '',
  });

  const [editRecord, setEditRecord] = useState(null);
  const [originalRecord, setOriginalRecord] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [searchFilters, setSearchFilters] = useState({ effectivityDate: '', sg_number: '', stepValue: '' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [viewMode, setViewMode] = useState('table');

  // Import state
  const [importDialog, setImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // Template download dialog
  const [templateDialog, setTemplateDialog] = useState(false);
  const [templateYear, setTemplateYear] = useState(new Date().getFullYear().toString());

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('create');

  const navigate = useNavigate();
  const { settings } = useSystemSettings();
  const { hasAccess, loading: accessLoading } = usePageAccess('salary-grade');

  const showSnackbar = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });

  // ── Fetch ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchSalaryGrades().finally(() => setPageLoading(false));
  }, []);

  const fetchSalaryGrades = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/SalaryGradeTable/salary-grade`, getAuthHeaders());
      setSalaryGrades(res.data);
    } catch (err) {
      showSnackbar('Failed to fetch salary grades.', 'error');
      if (err.response?.status === 401 || err.response?.status === 403) alert('Session expired. Please login again.');
    } finally {
      setLoading(false);
    }
  };

  usePayrollRealtimeRefresh(() => { fetchSalaryGrades(); });

  // ── Filtered + paginated ─────────────────────────────────────────────────
  const filteredGrades = useMemo(() => {
    const { effectivityDate, sg_number, stepValue } = searchFilters;
    return salaryGrades.filter(r => {
      if (effectivityDate && r.effectivityDate !== effectivityDate) return false;
      if (sg_number && r.sg_number !== sg_number) return false;
      if (stepValue) {
        const q = stepValue.toLowerCase().trim();
        if (![...Array(8)].some((_, i) => (r[`step${i + 1}`] ?? '').toString().toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [salaryGrades, searchFilters]);

  useEffect(() => { setPage(0); }, [searchFilters]);

  const paginatedGrades = useMemo(
    () => filteredGrades.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredGrades, page, rowsPerPage]
  );

  const hasActiveFilters = searchFilters.effectivityDate || searchFilters.sg_number || searchFilters.stepValue;
  const clearFilters = () => { setSearchFilters({ effectivityDate: '', sg_number: '', stepValue: '' }); setPage(0); };

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const addSalaryGrade = async () => {
    if (!newRecord.sg_number) { showSnackbar('Please select a salary grade number.', 'error'); return; }
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/SalaryGradeTable/salary-grade`, newRecord, getAuthHeaders());
      setNewRecord({
        effectivityDate: new Date().getFullYear().toString(),
        sg_number: '',
        step1: '', step2: '', step3: '', step4: '',
        step5: '', step6: '', step7: '', step8: '',
      });
      await fetchSalaryGrades();
      setSuccessAction('create');
      setSuccessOpen(true);
    } catch (err) {
      showSnackbar('Failed to add salary grade.', 'error');
    } finally { setLoading(false); }
  };

  const updateSalaryGrade = async () => {
    if (!editRecord) return;
    try {
      await axios.put(`${API_BASE_URL}/SalaryGradeTable/salary-grade/${editRecord.id}`, editRecord, getAuthHeaders());
      setEditRecord(null); setOriginalRecord(null); setIsEditing(false);
      await fetchSalaryGrades();
      setSuccessAction('edit');
      setSuccessOpen(true);
    } catch (err) {
      showSnackbar('Failed to update salary grade.', 'error');
    }
  };

  const deleteSalaryGrade = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/SalaryGradeTable/salary-grade/${id}`, getAuthHeaders());
      setEditRecord(null); setOriginalRecord(null); setIsEditing(false); setDeleteConfirmId(null);
      await fetchSalaryGrades();
      setSuccessAction('delete');
      setSuccessOpen(true);
    } catch (err) {
      showSnackbar('Failed to delete salary grade.', 'error');
    }
  };

  const handleOpenModal = (record) => {
    setEditRecord({ ...record });
    setOriginalRecord({ ...record });
    setIsEditing(false);
    setDeleteConfirmId(null);
  };

  const hasChanges = () => {
    if (!editRecord || !originalRecord) return false;
    return JSON.stringify(editRecord) !== JSON.stringify(originalRecord);
  };

  // ── Highlight ────────────────────────────────────────────────────────────
  const highlightText = (text, query) => {
    if (!query) return text;
    const str = (text ?? '').toString();
    const parts = str.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <span key={i} style={{ backgroundColor: 'rgba(109,35,35,0.18)', borderRadius: 2 }}>{part}</span>
        : part
    );
  };

  // ── CSV Template Download ────────────────────────────────────────────────
  const downloadTemplate = () => {
    const header = 'effectivityDate,sg_number,step1,step2,step3,step4,step5,step6,step7,step8';
    const rows = generateSGOptions().map(sg => `${templateYear},${sg},0,0,0,0,0,0,0,0`).join('\n');
    const blob = new Blob([header + '\n' + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salary_grade_template_${templateYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setTemplateDialog(false);
  };

  // ── CSV / XLSX Import ────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);

    try {
      let csvText;
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        csvText = XLSX.utils.sheet_to_csv(ws);
      } else {
        csvText = await file.text();
      }

      const csvBlob = new Blob([csvText], { type: 'text/csv' });
      const csvFile = new File([csvBlob], 'import.csv', { type: 'text/csv' });
      const formData = new FormData();
      formData.append('file', csvFile);

      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_BASE_URL}/SalaryGradeTable/salary-grade/bulk-import`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );
      setImportResult({ success: true, message: `Successfully imported ${res.data.imported} records!` });
      fetchSalaryGrades();
    } catch (err) {
      setImportResult({ success: false, message: err.response?.data || 'Import failed. Please check your file format.' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Access control ───────────────────────────────────────────────────────
  if (accessLoading || pageLoading) return <SgtWireframe />;
  if (!accessLoading && hasAccess !== true) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Salary Grade Table."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <Fade in timeout={400}>
        <Box sx={{
          py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 },
          width: '100vw', maxWidth: '100%',
          position: 'relative', left: '63%', transform: 'translateX(-61%)',
          px: { xs: 2, sm: 3, md: 6 },
        }}>

          {/* ── Page Header ── */}
          <SectionCard sx={{ mb: 2, overflow: 'hidden' }}>
            <Box sx={{
              px: 4, py: 3,
              background: 'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              position: 'relative', overflow: 'hidden',
            }}>
              <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)' }} />
              <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)' }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
                <UpgradeIcon sx={{ fontSize: 32, color: T.accent }} />
                <Box>
                  <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3 }}>
                    Tranche Salary Management
                  </Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: T.accentMid, fontWeight: 700, opacity: 0.9 }}>
                    Salary Grade Table • For Civilian Personnel of National Government
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
                <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                  <Typography sx={{ fontSize: '0.8rem', color: T.accent, fontWeight: 700 }}>
                    {salaryGrades.length} {salaryGrades.length === 1 ? 'record' : 'records'}
                  </Typography>
                </Box>
                                {/* Template download */}
                      <Tooltip title="Download CSV template for a specific year">
                        <AccentButton
                          variant="outlined"
                          size="small"
                                                    startIcon={<UploadIcon sx={{ fontSize: '14px !important' }} />}

                          onClick={() => setTemplateDialog(true)}
                                        sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}>
                        
                          Export Template
                        </AccentButton>
                      </Tooltip>

                      {/* Import */}
                      <Tooltip title="Import salary grades from CSV or Excel">
                        <AccentButton
                          variant="outlined"
                          size="small"
                          startIcon={<DownloadIcon sx={{ fontSize: '14px !important' }} />}
                          onClick={() => { setImportResult(null); setImportDialog(true); }}
                                        sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}>
                        
                          Import SG Tranche
                        </AccentButton>
                      </Tooltip>
                <Tooltip title="Refresh data">
                  <IconButton onClick={fetchSalaryGrades} sx={{ bgcolor: alpha(T.accent, 0.08), color: T.accent, width: 36, height: 36, '&:hover': { bgcolor: alpha(T.accent, 0.15) } }}>
                    <Refresh sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </SectionCard>

          {/* ── Main Layout ── */}
          <Grid container spacing={2}>

            {/* ── LEFT: Add Form ── */}
            <Grid item xs={12} lg={3}>
              <SectionCard sx={{ height: 'calc(100vh - 270px)', display: 'flex', flexDirection: 'column' }}>
                {/* Panel header */}
                <Box sx={{ px: 3, py: 1.5, borderBottom: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: T.accentFaint, flexShrink: 0 }}>
                  <AddIcon sx={{ fontSize: 15, color: T.accent }} />
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.accent }}>Add New Salary Grade</Typography>
                  <Box sx={{ flex: 1 }} />
                  <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>
                    <Box component="span" sx={{ color: '#c62828' }}>*</Box> required
                  </Typography>
                </Box>

                <Box sx={{
                  px: 3, py: 2.5, flexGrow: 1, overflowY: 'auto',
                  display: 'flex', flexDirection: 'column', gap: 2,
                  '&::-webkit-scrollbar': { width: 4 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
                }}>
                  {/* Effectivity Date */}
                  <Box>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.accent, mb: 0.75 }}>
                      Effectivity Year <Box component="span" sx={{ color: '#c62828' }}>*</Box>
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={newRecord.effectivityDate}
                        onChange={(e) => setNewRecord(r => ({ ...r, effectivityDate: e.target.value }))}
                        sx={selectSx}
                      >
                        {generateYearOptions().map(y => (
                          <MenuItem key={y} value={y.toString()}>{y}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  {/* SG Number */}
                  <Box>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.accent, mb: 0.75 }}>
                      Salary Grade <Box component="span" sx={{ color: '#c62828' }}>*</Box>
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={newRecord.sg_number}
                        onChange={(e) => setNewRecord(r => ({ ...r, sg_number: e.target.value }))}
                        displayEmpty
                        sx={selectSx}
                        MenuProps={{ PaperProps: { sx: { maxHeight: 280 } } }}
                      >
                        <MenuItem value="" disabled>
                          <Typography sx={{ color: T.faint, fontSize: '0.875rem' }}>Select grade…</Typography>
                        </MenuItem>
                        <ListSubheader sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: alpha(T.accent, 0.55), lineHeight: '2em', bgcolor: T.accentFaint }}>
                          SG 1–33
                        </ListSubheader>
                        {Array.from({ length: 33 }, (_, i) => (
                          <MenuItem key={i + 1} value={(i + 1).toString()}>{i + 1}</MenuItem>
                        ))}
                        <ListSubheader sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: alpha(T.accent, 0.55), lineHeight: '2em', bgcolor: T.accentFaint }}>
                          Job Order
                        </ListSubheader>
                        <MenuItem value="Job Order(Graduated)">Job Order (Graduated)</MenuItem>
                        <MenuItem value="Job Order(Undergraduate)">Job Order (Undergraduate)</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  <Divider sx={{ borderColor: T.divider }} />

                  {/* Steps */}
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Step Amounts
                  </Typography>
                  <Grid container spacing={1.5}>
                    {[...Array(8)].map((_, i) => (
                      <Grid item xs={6} key={i}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>Step {i + 1}</Typography>
                        <FieldInput
                          fullWidth
                          size="small"
                          value={newRecord[`step${i + 1}`]}
                          onChange={(e) => setNewRecord(r => ({ ...r, [`step${i + 1}`]: e.target.value }))}
                          placeholder="0.00"
                        />
                      </Grid>
                    ))}
                  </Grid>

                  <Box sx={{ mt: 'auto', pt: 1 }}>
                    <AccentButton
                      onClick={addSalaryGrade}
                      variant="contained"
                      fullWidth
                      disabled={loading || !newRecord.sg_number}
                      startIcon={loading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <AddIcon sx={{ fontSize: '16px !important' }} />}
                      sx={{
                        height: 42,
                        bgcolor: newRecord.sg_number ? T.accent : '#d0d0d0',
                        color: newRecord.sg_number ? '#fff' : '#888',
                        boxShadow: newRecord.sg_number ? `0 2px 10px ${alpha(T.accent, 0.32)}` : 'none',
                        '&:hover': { bgcolor: newRecord.sg_number ? T.accentDark : '#d0d0d0' },
                        '&:disabled': { bgcolor: '#d0d0d0 !important', color: '#888 !important', boxShadow: 'none !important', transform: 'none !important' },
                      }}
                    >
                      {loading ? 'Adding…' : 'Add Salary Grade'}
                    </AccentButton>
                  </Box>
                </Box>
              </SectionCard>
            </Grid>

            {/* ── RIGHT: Table / Records ── */}
            <Grid item xs={12} lg={9}>
              <SectionCard sx={{ height: 'calc(100vh - 270px)', display: 'flex', flexDirection: 'column' }}>

                {/* Toolbar */}
                <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <TableChartIcon sx={{ fontSize: 17, color: T.accent }} />
                      <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: T.text }}>Salary Grade Records</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      {hasActiveFilters && (
                        <Chip
                          label={`${filteredGrades.length} result${filteredGrades.length !== 1 ? 's' : ''}`}
                          size="small"
                          sx={{ height: 20, fontSize: '0.7rem', bgcolor: alpha(T.accent, 0.1), color: T.accent, fontWeight: 700 }}
                        />
                      )}
                      {!hasActiveFilters && (
                        <Box sx={{ px: 1.5, py: 0.4, borderRadius: 6, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${alpha(T.accent, 0.15)}` }}>
                          <Typography sx={{ fontSize: '0.72rem', color: T.accent, fontWeight: 700 }}>{filteredGrades.length} records</Typography>
                        </Box>
                      )}

                      {/* Navigate to Item Table */}
                      <Tooltip title="Insert to item table">
                        <AccentButton
                          variant="contained"
                          size="small"
                          startIcon={<ShortcutIcon sx={{ fontSize: '14px !important' }} />}
                          onClick={() => navigate('/item-table')}
                          sx={{ height: 30, fontSize: '0.75rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 8px ${alpha(T.accent, 0.3)}`, '&:hover': { bgcolor: T.accentDark } }}
                        >
                          Item Table
                        </AccentButton>
                      </Tooltip>

                      <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={(_, v) => v && setViewMode(v)}
                        size="small"
                        sx={{ '& .MuiToggleButton-root': { px: 1, py: 0.35, border: `1px solid ${T.accentBorder}`, color: T.muted, '&.Mui-selected': { bgcolor: T.accentFaint, color: T.accent } } }}
                      >
                        <ToggleButton value="table"><ViewListIcon sx={{ fontSize: 14 }} /></ToggleButton>
                        <ToggleButton value="grid"><ViewModuleIcon sx={{ fontSize: 14 }} /></ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                  </Box>

                  {/* Filter row */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <FilterListIcon sx={{ fontSize: 15, color: T.muted }} />

                    {/* Year filter */}
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={searchFilters.effectivityDate}
                        onChange={(e) => setSearchFilters(f => ({ ...f, effectivityDate: e.target.value }))}
                        displayEmpty
                        sx={{ ...selectSx, height: 32, fontSize: '0.78rem' }}
                      >
                        <MenuItem value=""><Typography sx={{ color: T.faint, fontSize: '0.78rem' }}>All Years</Typography></MenuItem>
                        {generateYearOptions().map(y => (
                          <MenuItem key={y} value={y.toString()} sx={{ fontSize: '0.82rem' }}>{y}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* SG filter */}
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <Select
                        value={searchFilters.sg_number}
                        onChange={(e) => setSearchFilters(f => ({ ...f, sg_number: e.target.value }))}
                        displayEmpty
                        sx={{ ...selectSx, height: 32, fontSize: '0.78rem' }}
                        MenuProps={{ PaperProps: { sx: { maxHeight: 280 } } }}
                      >
                        <MenuItem value=""><Typography sx={{ color: T.faint, fontSize: '0.78rem' }}>All Grades</Typography></MenuItem>
                        {generateSGOptions().map(sg => (
                          <MenuItem key={sg} value={sg} sx={{ fontSize: '0.82rem' }}>{sg}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Step value search */}
                    <FieldInput
                      size="small"
                      placeholder="Search step value…"
                      value={searchFilters.stepValue}
                      onChange={(e) => setSearchFilters(f => ({ ...f, stepValue: e.target.value }))}
                      sx={{ width: 180, '& .MuiOutlinedInput-root': { height: 32, fontSize: '0.78rem' } }}
                      InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 14, color: T.muted, mr: 0.5 }} /> }}
                    />

                    {hasActiveFilters && (
                      <Tooltip title="Clear all filters">
                        <IconButton
                          size="small"
                          onClick={clearFilters}
                          sx={{ color: T.muted, p: 0.5, '&:hover': { color: T.accent, bgcolor: T.accentFaint } }}
                        >
                          <ClearAllIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>

                {/* Records area */}
                <Box sx={{
                  flexGrow: 1, overflowY: 'auto',
                  '&::-webkit-scrollbar': { width: 4 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
                }}>
                  {paginatedGrades.length === 0 ? (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                      <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                        <TableChartIcon sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                      </Box>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>
                        {salaryGrades.length === 0 ? 'No records yet' : 'No records match your filters'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>
                        {salaryGrades.length === 0 ? 'Use the form on the left to add a salary grade.' : 'Try adjusting or clearing your filters.'}
                      </Typography>
                    </Box>
                  ) : viewMode === 'table' ? (
                    // ── Table view ──
                    <Box sx={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ background: 'rgba(109,35,35,0.04)' }}>
                            {['Year', 'SG', 'Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5', 'Step 6', 'Step 7', 'Step 8', ''].map((col, i) => (
                              <th key={i} style={{
                                padding: '10px 12px',
                                textAlign: i >= 2 && i <= 9 ? 'right' : 'left',
                                fontSize: '0.65rem', fontWeight: 700,
                                letterSpacing: '0.07em', textTransform: 'uppercase',
                                color: alpha(T.accent, 0.65),
                                borderBottom: `1px solid ${T.divider}`,
                                whiteSpace: 'nowrap',
                              }}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedGrades.map((record, idx) => (
                            <tr
                              key={record.id}
                              onClick={() => handleOpenModal(record)}
                              style={{
                                backgroundColor: idx % 2 === 0 ? T.rowEven : T.rowOdd,
                                cursor: 'pointer',
                                transition: 'background 0.13s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = T.rowHover}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? T.rowEven : T.rowOdd}
                            >
                              <td style={{ padding: '10px 12px', borderBottom: `1px solid ${T.divider}`, whiteSpace: 'nowrap' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: T.accent, flexShrink: 0 }} />
                                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: T.text }}>
                                    {highlightText(record.effectivityDate, searchFilters.effectivityDate)}
                                  </Typography>
                                </Box>
                              </td>
                              <td style={{ padding: '10px 12px', borderBottom: `1px solid ${T.divider}` }}>
                                <Chip
                                  label={record.sg_number}
                                  size="small"
                                  sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, color: T.accent, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${alpha(T.accent, 0.2)}`, borderRadius: '4px', '& .MuiChip-label': { px: 0.75 } }}
                                />
                              </td>
                              {[...Array(8)].map((_, i) => (
                                <td key={i} style={{ padding: '10px 12px', textAlign: 'right', borderBottom: `1px solid ${T.divider}`, whiteSpace: 'nowrap' }}>
                                  <Typography sx={{ fontSize: '0.78rem', color: T.text, fontFamily: 'monospace' }}>
                                    {highlightText(formatNumber(record[`step${i + 1}`]), searchFilters.stepValue)}
                                  </Typography>
                                </td>
                              ))}
                              <td style={{ padding: '10px 8px', borderBottom: `1px solid ${T.divider}` }}>
                                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                  <Tooltip title="Edit">
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenModal(record); }} sx={{ color: T.accent, p: 0.5, '&:hover': { bgcolor: T.accentFaint } }}>
                                      <EditIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenModal(record); setDeleteConfirmId(record.id); }} sx={{ color: '#c62828', p: 0.5, '&:hover': { bgcolor: 'rgba(198,40,40,0.07)' } }}>
                                      <DeleteIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Box>
                  ) : (
                    // ── Grid view ──
                    <Box sx={{ p: 2 }}>
                      <Grid container spacing={1.5}>
                        {paginatedGrades.map(record => (
                          <Grid item xs={12} sm={6} md={4} lg={3} key={record.id}>
                            <Box
                              onClick={() => handleOpenModal(record)}
                              sx={{
                                p: 2, borderRadius: 2, cursor: 'pointer',
                                bgcolor: '#fff', border: `1px solid ${T.accentBorder}`,
                                transition: 'all 0.13s',
                                '&:hover': { bgcolor: T.rowHover, borderColor: T.accent, transform: 'translateY(-2px)', boxShadow: `0 4px 14px ${alpha(T.accent, 0.1)}` },
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Chip
                                  label={`SG ${record.sg_number}`}
                                  size="small"
                                  sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, color: T.accent, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${alpha(T.accent, 0.2)}`, borderRadius: '4px' }}
                                />
                                <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>{record.effectivityDate}</Typography>
                              </Box>
                              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                                {[...Array(8)].map((_, i) => (
                                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography sx={{ fontSize: '0.65rem', color: T.faint }}>S{i + 1}</Typography>
                                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: T.text, fontFamily: 'monospace' }}>
                                      {formatNumber(record[`step${i + 1}`])}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
                </Box>

                {/* Pagination */}
                {filteredGrades.length > 0 && (
                  <Box sx={{ px: 2, py: 0.5, borderTop: `1px solid ${T.divider}`, flexShrink: 0 }}>
                    <TablePagination
                      component="div"
                      count={filteredGrades.length}
                      page={page}
                      onPageChange={(_, newPage) => setPage(newPage)}
                      rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                      rowsPerPageOptions={[10, 20, 50, 100]}
                      sx={{ '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.78rem', fontWeight: 600 } }}
                    />
                  </Box>
                )}
              </SectionCard>
            </Grid>
          </Grid>

          {/* ── Edit / View Modal ── */}
          <Modal
            open={!!editRecord}
            onClose={() => { setEditRecord(null); setOriginalRecord(null); setIsEditing(false); setDeleteConfirmId(null); }}
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}
          >
            <Fade in={!!editRecord}>
              <Box sx={{
                width: '100%', maxWidth: 560,
                maxHeight: '90vh', borderRadius: 3,
                overflow: 'hidden',
                boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
                bgcolor: T.surface,
                display: 'flex', flexDirection: 'column',
              }}>
                {editRecord && (
                  <>
                    {/* Modal header */}
                    <Box sx={{
                      px: 3.5, py: 2.5,
                      background: T.headerGrad,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      position: 'relative', overflow: 'hidden', flexShrink: 0,
                    }}>
                      <Box sx={{ position: 'absolute', top: -40, right: -30, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
                        <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <TableChartIcon sx={{ fontSize: 18, color: '#fff' }} />
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', lineHeight: 1.2, mb: 0.3 }}>
                            {isEditing ? 'Edit Salary Grade' : 'Salary Grade Details'}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.68)' }}>
                              SG {editRecord.sg_number} • {editRecord.effectivityDate}
                            </Typography>
                            {!isEditing && <Chip label="View mode" size="small" sx={{ height: 16, fontSize: '0.62rem', bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }} />}
                            {isEditing && <Chip label="Editing" size="small" sx={{ height: 16, fontSize: '0.62rem', bgcolor: 'rgba(255,200,0,0.22)', color: '#ffe082', fontWeight: 600 }} />}
                          </Box>
                        </Box>
                      </Box>
                      <IconButton
                        onClick={() => { setEditRecord(null); setOriginalRecord(null); setIsEditing(false); setDeleteConfirmId(null); }}
                        size="small"
                        sx={{ color: 'rgba(255,255,255,0.75)', position: 'relative', zIndex: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
                      >
                        <Close sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Box>

                    {/* Modal body */}
                    <Box sx={{
                      px: 3.5, py: 3, overflowY: 'auto', flexGrow: 1,
                      '&::-webkit-scrollbar': { width: 4 },
                      '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
                    }}>
                      <Grid container spacing={2}>
                        {/* Year */}
                        <Grid item xs={6}>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.accent, mb: 0.75 }}>Effectivity Year</Typography>
                          {isEditing ? (
                            <FormControl fullWidth size="small">
                              <Select
                                value={editRecord.effectivityDate}
                                onChange={(e) => setEditRecord(r => ({ ...r, effectivityDate: e.target.value }))}
                                sx={selectSx}
                              >
                                {generateYearOptions().map(y => <MenuItem key={y} value={y.toString()}>{y}</MenuItem>)}
                              </Select>
                            </FormControl>
                          ) : (
                            <Box sx={{ p: 1.5, bgcolor: T.accentFaint, borderRadius: 2, border: `1px solid ${T.accentBorder}` }}>
                              <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: T.accent }}>{editRecord.effectivityDate}</Typography>
                            </Box>
                          )}
                        </Grid>

                        {/* SG Number */}
                        <Grid item xs={6}>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.accent, mb: 0.75 }}>Salary Grade</Typography>
                          {isEditing ? (
                            <FormControl fullWidth size="small">
                              <Select
                                value={editRecord.sg_number}
                                onChange={(e) => setEditRecord(r => ({ ...r, sg_number: e.target.value }))}
                                sx={selectSx}
                                MenuProps={{ PaperProps: { sx: { maxHeight: 280 } } }}
                              >
                                {generateSGOptions().map(sg => <MenuItem key={sg} value={sg}>{sg}</MenuItem>)}
                              </Select>
                            </FormControl>
                          ) : (
                            <Box sx={{ p: 1.5, bgcolor: T.accentFaint, borderRadius: 2, border: `1px solid ${T.accentBorder}` }}>
                              <Chip label={`SG ${editRecord.sg_number}`} size="small" sx={{ height: 22, fontSize: '0.78rem', fontWeight: 700, color: T.accent, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.25)}`, borderRadius: '4px' }} />
                            </Box>
                          )}
                        </Grid>

                        <Grid item xs={12}>
                          <Divider sx={{ borderColor: T.divider, mb: 1 }} />
                          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 1.5 }}>
                            Step Amounts
                          </Typography>
                          <Grid container spacing={1.5}>
                            {[...Array(8)].map((_, i) => (
                              <Grid item xs={6} sm={3} key={i}>
                                <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>Step {i + 1}</Typography>
                                {isEditing ? (
                                  <FieldInput
                                    fullWidth size="small"
                                    value={editRecord[`step${i + 1}`]}
                                    onChange={(e) => setEditRecord(r => ({ ...r, [`step${i + 1}`]: e.target.value }))}
                                  />
                                ) : (
                                  <Box sx={{ p: 1, bgcolor: T.accentFaint, borderRadius: 1.5, border: `1px solid ${T.accentBorder}`, textAlign: 'right' }}>
                                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: T.text, fontFamily: 'monospace' }}>
                                      {formatNumber(editRecord[`step${i + 1}`])}
                                    </Typography>
                                  </Box>
                                )}
                              </Grid>
                            ))}
                          </Grid>
                        </Grid>
                      </Grid>

                      {/* Delete confirm inline */}
                      {deleteConfirmId === editRecord.id && (
                        <Box sx={{ mt: 2.5, p: 2, borderRadius: 2, bgcolor: 'rgba(198,40,40,0.05)', border: '1px solid rgba(198,40,40,0.2)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <WarningIcon sx={{ fontSize: 18, color: '#c62828' }} />
                          <Typography sx={{ fontSize: '0.78rem', color: '#c62828', flex: 1 }}>
                            Delete SG <strong>{editRecord.sg_number} ({editRecord.effectivityDate})</strong>? This cannot be undone.
                          </Typography>
                          <AccentButton onClick={() => deleteSalaryGrade(editRecord.id)} variant="contained" size="small" sx={{ fontSize: '0.72rem', height: 28, bgcolor: '#c62828', color: '#fff', '&:hover': { bgcolor: '#b71c1c' } }}>
                            Confirm
                          </AccentButton>
                          <AccentButton onClick={() => setDeleteConfirmId(null)} variant="outlined" size="small" sx={{ fontSize: '0.72rem', height: 28, borderColor: T.accentBorder, color: T.muted }}>
                            Cancel
                          </AccentButton>
                        </Box>
                      )}
                    </Box>

                    {/* Modal footer */}
                    <Box sx={{ px: 3.5, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: '#f9f9f9', display: 'flex', justifyContent: 'flex-end', gap: 1.25, flexShrink: 0 }}>
                      {!isEditing ? (
                        <>
                          <AccentButton
                            onClick={() => setDeleteConfirmId(editRecord.id)}
                            variant="outlined"
                            startIcon={<DeleteIcon sx={{ fontSize: '14px !important' }} />}
                            sx={{ fontSize: '0.8rem', borderColor: '#e57373', color: '#c62828', '&:hover': { bgcolor: 'rgba(198,40,40,0.04)', borderColor: '#c62828', transform: 'none' } }}
                          >
                            Delete
                          </AccentButton>
                          <AccentButton
                            onClick={() => setIsEditing(true)}
                            variant="contained"
                            startIcon={<EditIcon sx={{ fontSize: '14px !important' }} />}
                            sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}
                          >
                            Edit Record
                          </AccentButton>
                        </>
                      ) : (
                        <>
                          <AccentButton
                            onClick={() => { setEditRecord({ ...originalRecord }); setIsEditing(false); }}
                            variant="outlined"
                            startIcon={<CancelIcon sx={{ fontSize: '14px !important' }} />}
                            sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}
                          >
                            Cancel
                          </AccentButton>
                          <AccentButton
                            onClick={updateSalaryGrade}
                            disabled={!hasChanges()}
                            variant="contained"
                            startIcon={<SaveIcon sx={{ fontSize: '14px !important' }} />}
                            sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}
                          >
                            Save Changes
                          </AccentButton>
                        </>
                      )}
                    </Box>
                  </>
                )}
              </Box>
            </Fade>
          </Modal>

          {/* ── Template Year Picker Dialog ── */}
          <Dialog
            open={templateDialog}
            onClose={() => setTemplateDialog(false)}
            maxWidth="xs" fullWidth
            PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
          >
            <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <DownloadIcon sx={{ color: '#fff', fontSize: 20 }} />
              <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>Download CSV Template</Typography>
            </Box>
            <DialogContent sx={{ pt: 3 }}>
              <Typography sx={{ fontSize: '0.8rem', color: T.muted, mb: 2 }}>
                Select the effectivity year. All 35 SG rows will be pre-filled with that year and zero step amounts.
              </Typography>
              <FormControl fullWidth size="small">
                <Select value={templateYear} onChange={(e) => setTemplateYear(e.target.value)} sx={selectSx}>
                  {generateYearOptions().map(y => <MenuItem key={y} value={y.toString()}>{y}</MenuItem>)}
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
              <AccentButton onClick={() => setTemplateDialog(false)} variant="outlined" sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted }}>Cancel</AccentButton>
              <AccentButton onClick={downloadTemplate} variant="contained" startIcon={<DownloadIcon sx={{ fontSize: '14px !important' }} />} sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', '&:hover': { bgcolor: T.accentDark } }}>
                Download
              </AccentButton>
            </DialogActions>
          </Dialog>

          {/* ── Import Dialog ── */}
          <Dialog
            open={importDialog}
            onClose={() => !importing && setImportDialog(false)}
            maxWidth="sm" fullWidth
            PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
          >
            <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <UploadIcon sx={{ color: '#fff', fontSize: 20 }} />
              <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>Import Salary Grades</Typography>
            </Box>
            <DialogContent sx={{ pt: 3 }}>
              <Box sx={{ mb: 3, p: 2.5, bgcolor: T.accentFaint, borderRadius: 2, border: `1px solid ${T.accentBorder}` }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.accent, mb: 1 }}>How to use</Typography>
                <Typography sx={{ fontSize: '0.78rem', color: T.muted, lineHeight: 1.8 }}>
                  1. Click <strong>Template</strong> in the toolbar to download a pre-filled CSV for your target year.<br />
                  2. Open in Excel or Google Sheets and fill in the step amounts.<br />
                  3. Save as <strong>.csv</strong> or <strong>.xlsx</strong> and upload below.
                </Typography>
              </Box>

              <Box sx={{ mb: 2.5 }}>
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: T.accent, mb: 0.75 }}>Required columns</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {['effectivityDate', 'sg_number', 'step1–step8'].map(col => (
                    <Chip key={col} label={col} size="small" sx={{ height: 20, fontSize: '0.65rem', fontFamily: 'monospace', bgcolor: alpha(T.accent, 0.08), color: T.accent, fontWeight: 600 }} />
                  ))}
                </Box>
                <Typography sx={{ fontSize: '0.7rem', color: T.faint, mt: 0.75 }}>
                  Accepted formats: <strong>.csv</strong>, <strong>.xlsx</strong>, <strong>.xls</strong>
                </Typography>
              </Box>

              {importing && (
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: '0.78rem', color: T.accent, mb: 1 }}>Importing records…</Typography>
                  <LinearProgress sx={{ borderRadius: 4, bgcolor: alpha(T.accent, 0.1), '& .MuiLinearProgress-bar': { bgcolor: T.accent } }} />
                </Box>
              )}

              {importResult && (
                <Box sx={{
                  p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5,
                  bgcolor: importResult.success ? alpha('#2e7d32', 0.07) : alpha('#c62828', 0.07),
                  border: `1px solid ${importResult.success ? alpha('#2e7d32', 0.2) : alpha('#c62828', 0.2)}`,
                }}>
                  {importResult.success
                    ? <CheckCircleIcon sx={{ color: '#2e7d32', fontSize: 18 }} />
                    : <ErrorIcon sx={{ color: '#c62828', fontSize: 18 }} />
                  }
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: importResult.success ? '#2e7d32' : '#c62828' }}>
                    {importResult.message}
                  </Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
              <AccentButton onClick={() => setImportDialog(false)} disabled={importing} variant="outlined" sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted }}>Close</AccentButton>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />
              <AccentButton
                variant="contained"
                disabled={importing}
                startIcon={<UploadIcon sx={{ fontSize: '14px !important' }} />}
                onClick={() => fileInputRef.current?.click()}
                sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', '&:hover': { bgcolor: T.accentDark } }}
              >
                {importing ? 'Importing…' : 'Choose File & Import'}
              </AccentButton>
            </DialogActions>
          </Dialog>

          <LoadingOverlay
            open={loading || importing}
            message={importing ? 'Importing salary grades…' : 'Processing…'}
          />
          <SuccessfulOverlay
            open={successOpen}
            action={successAction}
            onClose={() => setSuccessOpen(false)}
          />

          {/* ── Snackbar ── */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={3000}
            onClose={() => setSnackbar(s => ({ ...s, open: false }))}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }}>
              {snackbar.message}
            </Alert>
          </Snackbar>

        </Box>
      </Fade>
    </>
  );
};

export default SalaryGradeTable;