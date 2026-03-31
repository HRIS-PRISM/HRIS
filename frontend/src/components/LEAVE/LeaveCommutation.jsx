import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Typography,
  Box,
  Card,
  Modal,
  IconButton,
  TextField,
  Button,
  Grid,
  Divider,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  Chip,
  Tooltip,
  Fade,
  CircularProgress,
  Avatar,
  TablePagination,
} from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import {
  MonetizationOn as CommutationIcon,
  Search as SearchIcon,
  Close,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  History as HistoryIcon,
  AccessTime as ClockIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  TableRows as TableRowsIcon,
  ErrorOutline as ErrorOutlineIcon,
} from '@mui/icons-material';

import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';

// ─── Theme tokens (identical to LeaveRequest) ──────────────────────────────────
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

// ─── Styled primitives (same as LeaveRequest) ──────────────────────────────────
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

// ─── Shimmer ───────────────────────────────────────────────────────────────────
const shimmerKf = `
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}`;

const Bone = ({ w = '100%', h = 14, r = 6, sx = {} }) => (
  <Box
    sx={{
      width: w, height: h, borderRadius: r,
      background: `linear-gradient(90deg, rgba(109,35,35,0.07) 25%, rgba(109,35,35,0.14) 50%, rgba(109,35,35,0.07) 75%)`,
      backgroundSize: '800px 100%',
      animation: 'shimmer 1.6s infinite linear',
      flexShrink: 0,
      ...sx,
    }}
  />
);

// ─── Wireframe ─────────────────────────────────────────────────────────────────
const Wireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box sx={{ py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, width: '100vw', maxWidth: '100%', position: 'relative', left: '63%', transform: 'translateX(-61%)', px: { xs: 2, sm: 3, md: 6 } }}>
      {/* Header */}
      <Box sx={{ mb: 2, borderRadius: 3, overflow: 'hidden', border: `1px solid ${T.accentBorder}`, animation: 'blink 2s ease-in-out infinite' }}>
        <Box sx={{ p: 3.5, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2.5, position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.06)' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)', flexShrink: 0 }} />
            <Box><Bone w={220} h={18} sx={{ mb: 1 }} /><Bone w={360} h={11} /></Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}><Bone w={80} h={28} r={8} /><Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.1)' }} /></Box>
        </Box>
      </Box>
      {/* Stats */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {[0,1,2,3].map(i => (
          <Grid item xs={6} md={3} key={i}>
            <Box sx={{ borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: '#fff', p: 2, display: 'flex', alignItems: 'center', gap: 1.75, animation: `blink 2s ease-in-out ${i*0.08}s infinite` }}>
              <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.1)', flexShrink: 0 }} />
              <Box sx={{ flexGrow: 1 }}><Bone w={48} h={18} sx={{ mb: 0.75 }} /><Bone w={80} h={9} /></Box>
            </Box>
          </Grid>
        ))}
      </Grid>
      {/* Table */}
      <Box sx={{ borderRadius: 3, border: `1px solid ${T.accentBorder}`, bgcolor: '#fff', overflow: 'hidden', animation: 'blink 2s ease-in-out 0.2s infinite', height: 'calc(100vh - 380px)' }}>
        <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Bone w={180} h={13} />
          <Box sx={{ display: 'flex', gap: 1.5 }}><Bone w={200} h={32} r={8} /><Bone w={130} h={32} r={8} /></Box>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '2.4fr 0.9fr 0.9fr 1.2fr 1fr', gap: 2, px: 3.5, py: 1, bgcolor: alpha(T.accent, 0.04), borderBottom: `1px solid ${T.divider}` }}>
          {[80,70,60,100,60].map((w,i) => <Bone key={i} w={w} h={9} />)}
        </Box>
        {[...Array(7)].map((_, i) => (
          <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '2.4fr 0.9fr 0.9fr 1.2fr 1fr', gap: 2, px: 3.5, py: 1.5, alignItems: 'center', borderBottom: i < 6 ? `1px solid ${T.divider}` : 'none', bgcolor: i%2===0 ? T.rowEven : T.rowOdd, animation: `blink 2s ease-in-out ${i*0.06}s infinite` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}><Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(109,35,35,0.12)', flexShrink: 0 }} /><Box><Bone w={120} h={12} sx={{ mb: 0.5 }} /><Bone w={64} h={9} /></Box></Box>
            <Box sx={{ width: 46, height: 20, borderRadius: 1, bgcolor: 'rgba(109,35,35,0.08)' }} />
            <Bone w={60} h={11} />
            <Box><Bone w={88} h={14} sx={{ mb: 0.4 }} /><Bone w={54} h={9} /></Box>
            <Box><Bone w={72} h={11} sx={{ mb: 0.4 }} /><Bone w={50} h={9} /></Box>
          </Box>
        ))}
      </Box>
    </Box>
  </>
);

// ─── Helper ────────────────────────────────────────────────────────────────────
const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// ─── Error Modal (same pattern as LeaveRequest) ────────────────────────────────
const ErrorModal = ({ open, onClose, title, message, icon: Icon = ErrorOutlineIcon, iconColor = '#C62828', iconBg = '#FFEBEE' }) => (
  <Modal open={open} onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, zIndex: 1500 }}>
    <Fade in={open}>
      <Box sx={{ width: '100%', maxWidth: 420, borderRadius: 3, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', bgcolor: T.surface, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ px: 3.5, py: 2.5, background: `linear-gradient(180deg,${iconColor} 0%,${alpha(iconColor, 0.82)} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -40, right: -30, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon sx={{ fontSize: 17, color: '#fff' }} />
            </Box>
            <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.93rem' }}>{title}</Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.75)', position: 'relative', zIndex: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
        <Box sx={{ px: 3.5, py: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: iconBg, border: `1px solid ${alpha(iconColor, 0.2)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.25 }}>
              <Icon sx={{ fontSize: 18, color: iconColor }} />
            </Box>
            <Typography sx={{ fontSize: '0.875rem', color: T.text, lineHeight: 1.65, pt: 0.5 }}>{message}</Typography>
          </Box>
        </Box>
        <Box sx={{ px: 3.5, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: '#f9f9f9', display: 'flex', justifyContent: 'flex-end' }}>
          <AccentButton onClick={onClose} variant="contained" sx={{ fontSize: '0.8rem', bgcolor: iconColor, color: '#fff', boxShadow: `0 2px 10px ${alpha(iconColor, 0.3)}`, '&:hover': { bgcolor: alpha(iconColor, 0.85) } }}>
            Understood
          </AccentButton>
        </Box>
      </Box>
    </Fade>
  </Modal>
);

// ─── Main component ────────────────────────────────────────────────────────────
const LeaveCommutation = () => {
  const { hasAccess, loading: accessLoading } = usePageAccess('leave-commutation');

  const [records, setRecords]               = useState([]);
  const [searchTerm, setSearchTerm]         = useState('');
  const [filterLeave, setFilterLeave]       = useState('all');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isEditing, setIsEditing]           = useState(false);
  const [editApprovedBy, setEditApprovedBy] = useState('');
  const [editRemarks, setEditRemarks]       = useState('');
  const [pageLoading, setPageLoading]       = useState(true);
  const [page, setPage]                     = useState(0);
  const [rowsPerPage, setRowsPerPage]       = useState(12);
  const [saveLoading, setSaveLoading]       = useState(false);

  const [errorModal, setErrorModal] = useState({ open: false, title: '', message: '' });
  const showError  = (title, message) => setErrorModal({ open: true, title, message });
  const closeError = () => setErrorModal(p => ({ ...p, open: false }));

  const fetchRecords = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/commutationRoute/leave_commutation`);
      setRecords(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Fetch commutation records:', e);
      setRecords([]);
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);
  useEffect(() => { setPage(0); }, [searchTerm, filterLeave]);

  const leaveCodes = [...new Set(records.map(r => r.leave_code))].filter(Boolean).sort();

  const filtered = records.filter(r => {
    const s = searchTerm.toLowerCase();
    const matchSearch =
      (r.fullName?.toLowerCase() || '').includes(s) ||
      (r.employeeNumber?.toString() || '').includes(s) ||
      (r.leave_code?.toLowerCase() || '').includes(s);
    const matchLeave = filterLeave === 'all' || r.leave_code === filterLeave;
    return matchSearch && matchLeave;
  });

  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const stats = {
    total:      records.length,
    employees:  new Set(records.map(r => r.employeeNumber)).size,
    totalDays:  records.reduce((s, r) => s + toNum(r.commuted_days), 0),
    totalHours: records.reduce((s, r) => s + toNum(r.commuted_hours), 0),
  };

  const openRecord = (rec) => {
    setSelectedRecord(rec);
    setEditApprovedBy(rec.approved_by || '');
    setEditRemarks(rec.remarks || '');
    setIsEditing(false);
  };

  const handleUpdate = async () => {
    if (!selectedRecord) return;
    setSaveLoading(true);
    try {
      await axios.put(
        `${API_BASE_URL}/commutationRoute/leave_commutation/${selectedRecord.id}`,
        { approved_by: editApprovedBy, remarks: editRemarks },
      );
      setIsEditing(false);
      await fetchRecords();
      const res = await axios.get(`${API_BASE_URL}/commutationRoute/leave_commutation`);
      const updated = (res.data || []).find(r => r.id === selectedRecord.id);
      if (updated) setSelectedRecord(updated);
    } catch (e) {
      showError('Update Failed', e.response?.data?.error || e.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this commutation record? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_BASE_URL}/commutationRoute/leave_commutation/${id}`);
      setSelectedRecord(null);
      await fetchRecords();
    } catch (e) {
      showError('Delete Failed', e.response?.data?.error || e.message);
    }
  };

  const handleClose = () => { setSelectedRecord(null); setIsEditing(false); };

  if (accessLoading) return <Wireframe />;
  if (!hasAccess)    return <AccessDenied />;
  if (pageLoading)   return <Wireframe />;

  return (
    <Fade in timeout={400}>
      <Box
        sx={{
          py: { xs: 1, md: 2 },
          mt: { xs: 0, md: -2 },
          mb: { xs: 1, md: 2 },
          width: '100vw',
          maxWidth: '100%',
          position: 'relative',
          left: '63%',
          transform: 'translateX(-61%)',
          px: { xs: 2, sm: 3, md: 6 },
        }}
      >
        <ErrorModal
          open={errorModal.open}
          onClose={closeError}
          title={errorModal.title}
          message={errorModal.message}
        />

        {/* ── Page Header ── */}
        <SectionCard sx={{ mb: 2, overflow: 'hidden' }}>
          <Box
            sx={{
              px: 4, py: 4,
              background: 'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              position: 'relative', overflow: 'hidden',
            }}
          >
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)' }} />
            <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)' }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
              <CommutationIcon sx={{ fontSize: 32, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3 }}>
                  Leave Commutation
                </Typography>
                <Typography sx={{ fontSize: '0.82rem', color: T.accentMid, fontWeight: 700, opacity: 0.9 }}>
                  Administrative Panel • Manage commuted leave hours converted from remaining balances
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
              <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                <Typography sx={{ fontSize: '0.8rem', color: T.accent, fontWeight: 700 }}>
                  {records.length} {records.length === 1 ? 'record' : 'records'}
                </Typography>
              </Box>
              <Tooltip title="Refresh data">
                <IconButton onClick={fetchRecords} size="small" sx={{ color: T.accent, bgcolor: alpha(T.accent, 0.1), '&:hover': { bgcolor: alpha(T.accent, 0.18) } }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </SectionCard>

        {/* ── Stats Row ── */}
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {[
            { label: 'Total Records',  value: stats.total,                 color: T.accent,  Icon: HistoryIcon  },
            { label: 'Employees',      value: stats.employees,             color: '#1565C0', Icon: PersonIcon   },
            { label: 'Days Commuted',  value: stats.totalDays.toFixed(2),  color: '#2E7D32', Icon: CalendarIcon },
            { label: 'Hours Commuted', value: stats.totalHours.toFixed(2), color: '#ED6C02', Icon: ClockIcon    },
          ].map(({ label, value, color, Icon }) => (
            <Grid item xs={6} md={3} key={label}>
              <SectionCard>
                <Box sx={{ px: 2.5, py: 1.75, display: 'flex', alignItems: 'center', gap: 1.75 }}>
                  <Box
                    sx={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      bgcolor: alpha(color, 0.1), border: `1px solid ${alpha(color, 0.2)}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon sx={{ fontSize: 18, color }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 900, color, fontSize: '1.25rem', lineHeight: 1.1 }}>
                      {value}
                    </Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: T.muted, fontWeight: 600 }}>{label}</Typography>
                  </Box>
                </Box>
              </SectionCard>
            </Grid>
          ))}
        </Grid>

        {/* ── Records Table Card ── */}
        <SectionCard sx={{ height: 'calc(100vh - 380px)', display: 'flex', flexDirection: 'column' }}>
          {/* Toolbar */}
          <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <TableRowsIcon sx={{ fontSize: 17, color: T.accent }} />
                <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: T.text }}>
                  Commutation Records
                </Typography>
                <Box sx={{ px: 1.5, py: 0.3, borderRadius: 4, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}` }}>
                  <Typography sx={{ fontSize: '0.7rem', color: T.accent, fontWeight: 700 }}>
                    {filtered.length} of {records.length}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <FieldInput
                size="small"
                placeholder="Search by name or employee ID…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                sx={{ flexGrow: 1, minWidth: 200 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 15, color: T.muted }} />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select
                  value={filterLeave}
                  onChange={e => { setFilterLeave(e.target.value); setPage(0); }}
                  displayEmpty
                  sx={selectSx}
                  renderValue={v =>
                    v === 'all'
                      ? <Typography sx={{ fontSize: '0.875rem', color: T.faint }}>All Types</Typography>
                      : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ px: 1, py: 0.2, borderRadius: 1, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                            <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: T.accent }}>{v}</Typography>
                          </Box>
                        </Box>
                      )
                  }
                >
                  <MenuItem value="all">All Types</MenuItem>
                  {leaveCodes.map(lc => (
                    <MenuItem key={lc} value={lc}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ px: 1, py: 0.2, borderRadius: 1, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                          <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: T.accent }}>{lc}</Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Column headers */}
          <Box
            sx={{
              px: 3.5, py: 1,
              display: 'grid', gridTemplateColumns: '2.4fr 0.9fr 0.9fr 1.2fr 1fr',
              gap: 2, alignItems: 'center',
              bgcolor: alpha(T.accent, 0.04),
              borderBottom: `1px solid ${T.divider}`,
              flexShrink: 0,
            }}
          >
            {['Employee', 'Leave Code', 'Period', 'Days / Hours', 'Date'].map(col => (
              <Typography key={col} sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {col}
              </Typography>
            ))}
          </Box>

          {/* Rows */}
          <Box
            sx={{
              flexGrow: 1, overflowY: 'auto',
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
            }}
          >
            {paged.length === 0 ? (
              <Box sx={{ py: 10, textAlign: 'center' }}>
                <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                  <CommutationIcon sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                </Box>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>
                  {records.length === 0 ? 'No commutation records yet' : 'No records match your search'}
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>
                  {records.length === 0
                    ? 'Records will appear here once leave is commuted from the Leave Assignment module.'
                    : 'Try adjusting your search or filter.'}
                </Typography>
              </Box>
            ) : (
              paged.map((rec, idx) => (
                <Box
                  key={rec.id}
                  onClick={() => openRecord(rec)}
                  sx={{
                    px: 3.5, py: 1.5,
                    display: 'grid', gridTemplateColumns: '2.4fr 0.9fr 0.9fr 1.2fr 1fr',
                    gap: 2, alignItems: 'center',
                    cursor: 'pointer',
                    bgcolor: idx % 2 === 0 ? T.rowEven : T.rowOdd,
                    borderBottom: `1px solid ${T.divider}`,
                    transition: 'background 0.13s ease',
                    '&:hover': { bgcolor: T.rowHover },
                  }}
                >
                  {/* Employee */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <Avatar
                      sx={{
                        width: 32, height: 32, fontSize: '0.72rem', fontWeight: 700,
                        bgcolor: T.accent, color: '#fff', borderRadius: '8px', flexShrink: 0,
                      }}
                    >
                      {((rec.firstName?.[0] || rec.fullName?.[0] || '?') + (rec.lastName?.[0] || '')).toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text, lineHeight: 1.25 }} noWrap>
                        {rec.fullName || rec.employeeNumber}
                      </Typography>
                      <Typography sx={{ fontSize: '0.68rem', color: T.faint, fontWeight: 600 }}>
                        #{rec.employeeNumber}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Leave Code */}
                  <Box>
                    <Box sx={{ px: 1, py: 0.2, borderRadius: 1, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: 'inline-block' }}>
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: T.accent }}>{rec.leave_code}</Typography>
                    </Box>
                  </Box>

                  {/* Period */}
                  <Typography sx={{ fontSize: '0.8rem', color: T.muted, fontWeight: 600 }}>
                    {rec.period_year}{rec.period_semester ? ` ${rec.period_semester}` : ''}
                  </Typography>

                  {/* Days / Hours */}
                  <Box>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: T.accent, lineHeight: 1.2 }}>
                      {toNum(rec.commuted_days).toFixed(2)} days
                    </Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: T.faint, fontWeight: 600 }}>
                      {toNum(rec.commuted_hours).toFixed(2)} hrs
                    </Typography>
                  </Box>

                  {/* Date */}
                  <Box>
                    <Typography sx={{ fontSize: '0.78rem', color: T.muted, fontWeight: 600 }}>
                      {rec.commuted_at_fmt?.split(' ')[0] || '—'}
                    </Typography>
                    {rec.commuted_by && (
                      <Typography sx={{ fontSize: '0.68rem', color: T.faint }}>
                        by {rec.commuted_by}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))
            )}
          </Box>

          {/* Pagination */}
          {filtered.length > 0 && (
            <Box sx={{ px: 2, py: 0.5, borderTop: `1px solid ${T.divider}`, flexShrink: 0 }}>
              <TablePagination
                component="div"
                count={filtered.length}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
                rowsPerPageOptions={[12, 24, 48]}
                sx={{ '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.78rem', fontWeight: 600 } }}
              />
            </Box>
          )}
        </SectionCard>

        {/* ── Detail / Edit Modal ── */}
        <Modal open={!!selectedRecord} onClose={handleClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
          <Fade in={!!selectedRecord}>
            <Box
              sx={{
                width: '100%', maxWidth: 560, maxHeight: '90vh',
                borderRadius: 3, overflow: 'hidden',
                boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
                bgcolor: T.surface, display: 'flex', flexDirection: 'column',
              }}
            >
              {selectedRecord && (
                <>
                  {/* Modal Header */}
                  <Box
                    sx={{
                      px: 3.5, py: 2.5, background: T.headerGrad,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      position: 'relative', overflow: 'hidden', flexShrink: 0,
                    }}
                  >
                    <Box sx={{ position: 'absolute', top: -50, right: -30, width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CommutationIcon sx={{ fontSize: 18, color: '#fff' }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', lineHeight: 1.2, mb: 0.3 }}>
                          {isEditing ? 'Edit Commutation Record' : 'Commutation Record Details'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.68)' }}>
                            #{selectedRecord.employeeNumber} • {selectedRecord.fullName || '—'}
                          </Typography>
                          {isEditing
                            ? <Chip label="Editing" size="small" sx={{ height: 16, fontSize: '0.62rem', bgcolor: 'rgba(255,200,0,0.22)', color: '#ffe082', fontWeight: 600 }} />
                            : <Chip label="View mode" size="small" sx={{ height: 16, fontSize: '0.62rem', bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }} />
                          }
                        </Box>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, position: 'relative', zIndex: 1 }}>
                      {!isEditing && (
                        <>
                          <Tooltip title="Edit remarks / approved by">
                            <IconButton onClick={() => setIsEditing(true)} size="small" sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete record">
                            <IconButton onClick={() => handleDelete(selectedRecord.id)} size="small" sx={{ color: '#ffcdd2', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <IconButton onClick={handleClose} size="small" sx={{ color: 'rgba(255,255,255,0.75)', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
                        <Close sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Modal body */}
                  <Box
                    sx={{
                      px: 3.5, py: 3, overflowY: 'auto', flexGrow: 1,
                      '&::-webkit-scrollbar': { width: 4 },
                      '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
                    }}
                  >
                    {/* Commuted summary highlight */}
                    <Box
                      sx={{
                        mb: 2.5, p: 2.5, borderRadius: 2,
                        background: `linear-gradient(135deg,${T.accentFaint} 0%,rgba(109,35,35,0.02) 100%)`,
                        border: `1px solid ${T.accentBorder}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.25 }}>
                          Total Commuted
                        </Typography>
                        <Typography sx={{ fontWeight: 900, color: T.accent, fontSize: '2rem', lineHeight: 1 }}>
                          {toNum(selectedRecord.commuted_days).toFixed(2)}
                          <Box component="span" sx={{ fontSize: '1rem', fontWeight: 700, ml: 0.75 }}>days</Box>
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: T.faint, fontWeight: 600, mt: 0.25 }}>
                          {toNum(selectedRecord.commuted_hours).toFixed(2)} hours
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.5 }}>
                          Period
                        </Typography>
                        <Typography sx={{ fontWeight: 900, color: T.text, fontSize: '1.1rem' }}>
                          {selectedRecord.period_year}
                          {selectedRecord.period_semester ? ` ${selectedRecord.period_semester}` : ' Annual'}
                        </Typography>
                        <Box sx={{ mt: 0.75, px: 1.25, py: 0.3, borderRadius: 1, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: 'inline-block' }}>
                          <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: T.accent }}>{selectedRecord.leave_code}</Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Details rows */}
                    <Box sx={{ mb: 2.5, p: 2, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: T.accent, mb: 1.25 }}>Commutation Details</Typography>
                      {[
                        ['Employee #', `#${selectedRecord.employeeNumber}`],
                        ['Full Name', selectedRecord.fullName || '—'],
                        ['Leave Code', selectedRecord.leave_code],
                        ['Leave Type', selectedRecord.leave_description || '—'],
                        ['Commuted On', selectedRecord.commuted_at_fmt || '—'],
                        ['Commuted By', selectedRecord.commuted_by || '—'],
                      ].map(([label, value]) => (
                        <Box
                          key={label}
                          sx={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            py: 0.6, borderBottom: `1px solid ${T.divider}`,
                            '&:last-child': { borderBottom: 'none', pb: 0 },
                          }}
                        >
                          <Typography sx={{ fontSize: '0.73rem', color: T.faint, fontWeight: 700 }}>{label}</Typography>
                          <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.text }}>{value}</Typography>
                        </Box>
                      ))}
                    </Box>

                    <Divider sx={{ mb: 2.5, borderColor: T.divider }}>
                      <Chip
                        label="Notes & Approval"
                        size="small"
                        sx={{ height: 18, fontSize: '0.68rem', bgcolor: T.accentFaint, color: T.accent, fontWeight: 700, border: `1px solid ${T.accentBorder}` }}
                      />
                    </Divider>

                    {/* Editable fields */}
                    {isEditing ? (
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.accent, mb: 0.75 }}>Approved By</Typography>
                          <FieldInput
                            value={editApprovedBy}
                            onChange={e => setEditApprovedBy(e.target.value)}
                            fullWidth size="small"
                            placeholder="Enter approver name…"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.accent, mb: 0.75 }}>Remarks</Typography>
                          <FieldInput
                            value={editRemarks}
                            onChange={e => setEditRemarks(e.target.value)}
                            fullWidth size="small" multiline rows={3}
                            placeholder="Enter remarks…"
                          />
                        </Grid>
                      </Grid>
                    ) : (
                      <Box sx={{ p: 2, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                        {[
                          ['Approved By', selectedRecord.approved_by || '—'],
                          ['Remarks', selectedRecord.remarks || '—'],
                        ].map(([label, value]) => (
                          <Box
                            key={label}
                            sx={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                              py: 0.6, borderBottom: `1px solid ${T.divider}`,
                              '&:last-child': { borderBottom: 'none', pb: 0 },
                            }}
                          >
                            <Typography sx={{ fontSize: '0.73rem', color: T.faint, fontWeight: 700, flexShrink: 0, mr: 2 }}>{label}</Typography>
                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.text, textAlign: 'right' }}>{value}</Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>

                  {/* Modal footer */}
                  <Box
                    sx={{
                      px: 3.5, py: 2, borderTop: `1px solid ${T.divider}`,
                      bgcolor: '#f9f9f9', display: 'flex', justifyContent: 'flex-end',
                      gap: 1.25, flexShrink: 0,
                    }}
                  >
                    {isEditing ? (
                      <>
                        <AccentButton
                          onClick={() => setIsEditing(false)}
                          variant="outlined"
                          startIcon={<CancelIcon sx={{ fontSize: '14px !important' }} />}
                          sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}
                        >
                          Cancel
                        </AccentButton>
                        <AccentButton
                          onClick={handleUpdate}
                          variant="contained"
                          disabled={saveLoading}
                          startIcon={saveLoading ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <SaveIcon sx={{ fontSize: '14px !important' }} />}
                          sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}
                        >
                          {saveLoading ? 'Saving…' : 'Save Changes'}
                        </AccentButton>
                      </>
                    ) : (
                      <AccentButton
                        onClick={handleClose}
                        variant="outlined"
                        sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}
                      >
                        Close
                      </AccentButton>
                    )}
                  </Box>
                </>
              )}
            </Box>
          </Fade>
        </Modal>
      </Box>
    </Fade>
  );
};

export default LeaveCommutation;