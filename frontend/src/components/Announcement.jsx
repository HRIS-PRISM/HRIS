import API_BASE_URL from "../apiConfig";
import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import {
  Button, TextField, Table, TableBody, TableCell,
  TableHead, TableRow, Box, Typography,
  Alert, Card, Fade, Backdrop, CircularProgress, Chip, Tooltip,
  IconButton, styled, alpha, Grid, InputAdornment, Paper,
  ToggleButtonGroup, ToggleButton, Snackbar,
  MenuItem, Select, FormControl, InputLabel,
  Switch, Collapse, LinearProgress,
} from "@mui/material";
import {
  Add as AddIcon, Search as SearchIcon, Close as CloseIcon,
  Image as ImageIcon, Refresh, CheckCircle, Info,
  Event as EventIcon,
  Block as BlockIcon,
  AdminPanelSettings as HrIcon,
  AccessTime as FlexiIcon,
  Announcement as AnnouncementIcon,
  FilterList,
  KeyboardArrowUp,
  CalendarToday,
} from "@mui/icons-material";
import { Zoom, Fab } from "@mui/material";
import usePageAccess from '../hooks/usePageAccess';
import AccessDenied from './AccessDenied';
import SuccessfulOverlay from './SuccessfulOverlay';
import LoadingOverlay from './LoadingOverlay';

// ─── Theme tokens ───────────────────────────────────────────────────────────
const T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  accentMid: '#8B4545',
  accentFaint: 'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover: 'rgba(109,35,35,0.10)',
  rowOdd: 'rgba(109,35,35,0.025)',
  rowHover: 'rgba(109,35,35,0.055)',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#a0a0a0',
  surface: '#ffffff',
  divider: 'rgba(0,0,0,0.08)',
};

// ─── Shimmer keyframes ──────────────────────────────────────────────────────
const shimmerKf = `
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}`;

// ─── Shimmer bone ───────────────────────────────────────────────────────────
const Bone = ({ w = '100%', h = 14, r = 6, sx = {} }) => (
  <Box
    sx={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)',
      backgroundSize: '800px 100%',
      animation: 'shimmer 1.6s infinite linear',
      flexShrink: 0, ...sx,
    }}
  />
);

// ─── Wireframe skeleton ─────────────────────────────────────────────────────
const AnnouncementWireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box sx={{ py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 }, width: '100vw', maxWidth: '100%', position: 'relative', left: '63%', transform: 'translateX(-61%)', px: { xs: 2, sm: 3, md: 6 } }}>
      <Box sx={{ mb: 2, borderRadius: 3, overflow: 'hidden', border: `1px solid ${T.accentBorder}`, animation: 'blink 2s ease-in-out infinite' }}>
        <Box sx={{ px: 4, py: 3, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)' }} />
            <Box><Bone w={240} h={18} sx={{ mb: 1 }} /><Bone w={340} h={11} /></Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 120, height: 28, borderRadius: 10, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }} />
            <Box sx={{ width: 34, height: 34, borderRadius: '50%', bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }} />
          </Box>
        </Box>
      </Box>
      <Grid container spacing={2}>
        {[3, 9].map((lg, idx) => (
          <Grid item xs={12} lg={lg} key={idx}>
            <Box sx={{ borderRadius: 3, border: `1px solid ${T.accentBorder}`, bgcolor: '#fff', overflow: 'hidden', animation: `blink 2s ease-in-out ${idx * 0.1}s infinite`, height: 'calc(100vh - 280px)' }}>
              <Box sx={{ px: 3, py: 1.5, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)' }} />
                <Bone w={lg === 3 ? 140 : 220} h={12} />
              </Box>
              {lg === 3 ? (
                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {[100, 160, 120, 140, 100].map((w, i) => (
                    <Box key={i}><Bone w={w} h={10} sx={{ mb: 1 }} /><Box sx={{ height: 38, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: '#fafafa' }} /></Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ p: 0 }}>
                  <Box sx={{ px: 2.5, py: 1.1, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accent, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
                    {Array.from({ length: 7 }).map((_, i) => <Box key={i} sx={{ height: 9, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.36)' }} />)}
                  </Box>
                  <Box sx={{ px: 2.5, py: 1.2, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Box key={i} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, py: 0.45 }}>
                        {Array.from({ length: 7 }).map((__, j) => <Bone key={j} h={10} />)}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  </>
);

// ─── Auth helpers ───────────────────────────────────────────────────────────
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

// ─── System Settings Hook ───────────────────────────────────────────────────
const useSystemSettings = () => {
  const [settings, setSettings] = useState({ primaryColor: '#894444', secondaryColor: '#6d2323', accentColor: '#FEF9E1', textColor: '#FFFFFF', textPrimaryColor: '#6D2323', textSecondaryColor: '#FEF9E1', hoverColor: '#6D2323', backgroundColor: '#FFFFFF' });
  useEffect(() => {
    const stored = localStorage.getItem('systemSettings');
    if (stored) { try { const p = JSON.parse(stored); if (p && typeof p === 'object') setSettings(p); } catch (e) { console.error(e); } }
    const fetchSettings = async () => {
      try {
        const url = API_BASE_URL.includes('/api') ? `${API_BASE_URL}/system-settings` : `${API_BASE_URL}/api/system-settings`;
        const r = await axios.get(url, getAuthHeaders());
        if (r.data && typeof r.data === 'object') { setSettings(r.data); localStorage.setItem('systemSettings', JSON.stringify(r.data)); }
      } catch (e) { console.error(e); }
    };
    fetchSettings();
  }, []);
  return settings;
};

// ─── Styled components ──────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: '#fff',
});

const FieldInput = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8, fontSize: '0.875rem', backgroundColor: '#fff',
    '& fieldset': { borderColor: T.accentBorder },
    '&:hover fieldset': { borderColor: T.accent },
    '&.Mui-focused fieldset': { borderColor: T.accent, borderWidth: 1.5 },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: T.accent },
});

const scrollbarSx = {
  '&::-webkit-scrollbar': { width: 4 },
  '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
  '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
};

const selectSx = {
  borderRadius: '8px', fontSize: '0.82rem', bgcolor: '#fff',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accent },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.accent, borderWidth: '1.5px' },
};

const compactSelectSx = {
  ...selectSx, fontSize: '0.76rem',
  '& .MuiSelect-select': { py: '5px !important', fontSize: '0.76rem' },
};

const FormSectionLabel = ({ icon: Icon, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
    <Icon sx={{ fontSize: 10, color: alpha(T.accent, 0.45) }} />
    <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: alpha(T.accent, 0.45) }}>
      {children}
    </Typography>
  </Box>
);

// ─── Time helpers ───────────────────────────────────────────────────────────
const toTimeInput = (val) => { if (!val) return ''; return String(val).slice(0, 5); };

// ─── Flexi Schedule Section ─────────────────────────────────────────────────
const FlexiScheduleSection = ({ values, onChange }) => (
  <Box sx={{ mt: 1, p: 2, borderRadius: 2, border: `1.5px dashed ${alpha(T.accent, 0.3)}`, bgcolor: T.accentFaint }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
      <FlexiIcon sx={{ fontSize: 16, color: T.accent }} />
      <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.accent }}>Flexible Schedule Settings</Typography>
    </Box>
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <FieldInput fullWidth size="small" label="Grace Period (hours)" type="number"
          inputProps={{ min: 0.5, max: 8, step: 0.5 }}
          value={values.flexi_hours ?? 2}
          onChange={(e) => onChange('flexi_hours', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FieldInput fullWidth size="small" label="Override Cut-off Time (optional)" type="time"
          value={toTimeInput(values.flexi_custom_time)}
          onChange={(e) => onChange('flexi_custom_time', e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
    </Grid>
    <Typography sx={{ fontSize: '0.68rem', color: alpha(T.accent, 0.65), mt: 1, display: 'block', lineHeight: 1.5 }}>
      Example: Official time 7:00 AM + 2 hrs grace → employees must clock in by <strong>9:00 AM</strong> with no deduction.
    </Typography>
  </Box>
);

// ─── Toggle card ────────────────────────────────────────────────────────────
const ToggleCard = ({ active, color, icon: Icon, title, caption, checked, onToggle, onSwitchChange }) => (
  <Box
    onClick={onToggle}
    sx={{
      display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.5, borderRadius: 2, flex: '1 1 240px',
      border: `1.5px solid ${active ? color : T.accentBorder}`,
      bgcolor: active ? alpha(color, 0.06) : 'transparent',
      transition: 'all 0.2s', cursor: 'pointer',
      '&:hover': { bgcolor: active ? alpha(color, 0.09) : T.accentFaint },
    }}
  >
    <Icon sx={{ fontSize: 18, color: active ? color : alpha(T.accent, 0.4), mt: 0.2 }} />
    <Box sx={{ flex: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: '0.76rem', fontWeight: 700, color: active ? color : T.text }}>{title}</Typography>
        <Switch size="small" checked={!!checked} onChange={(e) => { e.stopPropagation(); onSwitchChange(e.target.checked); }}
          sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: color } }} />
      </Box>
      <Typography sx={{ fontSize: '0.67rem', color: T.muted, lineHeight: 1.4 }}>{caption}</Typography>
    </Box>
  </Box>
);

// ─── Flag badges ────────────────────────────────────────────────────────────
const FlagBadges = ({ item }) => {
  const chips = [];
  const isHrOnly = item.hr_only === true || item.hr_only === 1 || item.hr_only === '1';
  const isFlexi  = item.is_flexi === true  || item.is_flexi  === 1 || item.is_flexi  === '1';

  if (isHrOnly) {
    chips.push(
      <Box key="hr" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, px: 1, py: 0.25, borderRadius: '10px', bgcolor: alpha('#1565c0', 0.10), border: '1px solid #1565c0' }}>
        <HrIcon sx={{ fontSize: 10, color: '#1565c0' }} />
        <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#1565c0' }}>HR Only</Typography>
      </Box>
    );
  }
  if (isFlexi) {
    const label = item.flexi_custom_time
      ? `Flexi ≤ ${toTimeInput(item.flexi_custom_time)}`
      : `Flexi +${item.flexi_hours ?? 2}h`;
    chips.push(
      <Box key="flexi" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, px: 1, py: 0.25, borderRadius: '10px', bgcolor: alpha('#2e7d32', 0.10), border: '1px solid #2e7d32' }}>
        <FlexiIcon sx={{ fontSize: 10, color: '#2e7d32' }} />
        <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#2e7d32' }}>{label}</Typography>
      </Box>
    );
  }

  if (chips.length === 0) {
    return <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>—</Typography>;
  }
  return <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{chips}</Box>;
};

// ─── Type config ────────────────────────────────────────────────────────────
const getTypeConfig = (item) => {
  if (item.isSuspension) return { label: 'Suspension', icon: <BlockIcon sx={{ fontSize: 10 }} />, bg: alpha('#d32f2f', 0.10), color: '#b71c1c', border: '1px solid #d32f2f' };
  if (item.isHoliday)    return { label: 'Holiday',    icon: <EventIcon sx={{ fontSize: 10 }} />, bg: alpha('#ed6c02', 0.12), color: '#e65100', border: '1px solid #ed6c02' };
  return { label: 'Announcement', icon: <AnnouncementIcon sx={{ fontSize: 10 }} />, bg: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}` };
};

// ─── Main Component ─────────────────────────────────────────────────────────
const AnnouncementForm = () => {
  const settings = useSystemSettings();
  const { hasAccess, loading: accessLoading } = usePageAccess('announcement');

  // ── Data state ────────────────────────────────────────────────────────────
  const [announcements, setAnnouncements]   = useState([]);
  const [holidays, setHolidays]             = useState([]);
  const [suspensions, setSuspensions]       = useState([]);
  const [loading, setLoading]               = useState(false);
  const [pageLoading, setPageLoading]       = useState(true);

  // ── Create form state ─────────────────────────────────────────────────────
  const emptyAnn  = { title: '', about: '', date_start: '', date_end: '', image: null, hr_only: false, is_flexi: false, flexi_hours: 2, flexi_custom_time: '' };
  const emptySusp = { title: '', about: '', date_start: '', date_end: '', reason: '', image: null, hr_only: false, is_flexi: false, flexi_hours: 2, flexi_custom_time: '' };
  const emptyHol  = { title: '', about: '', date_start: '', date_end: '', status: 'Active', image: null };

  const [newAnnouncement, setNewAnnouncement] = useState(emptyAnn);
  const [newSuspension,   setNewSuspension]   = useState(emptySusp);
  const [newHoliday,      setNewHoliday]      = useState(emptyHol);
  const [createFormType,  setCreateFormType]  = useState('announcement');

  // ── UI state ──────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]       = useState('');
  const [typeFilter, setTypeFilter]         = useState('all');
  const [error, setError]                   = useState('');
  const [snackbar, setSnackbar]             = useState({ open: false, message: '', severity: 'error' });
  const [successOpen, setSuccessOpen]       = useState(false);
  const [showScrollTop, setShowScrollTop]   = useState(false);
  const [formExpanded, setFormExpanded]     = useState(true);

  const showSnackbar = (msg, sev = 'error') => setSnackbar({ open: true, message: msg, severity: sev });

  useEffect(() => { if (!accessLoading) setPageLoading(false); }, [accessLoading]);
  useEffect(() => {
    const h = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [annRes, holRes, suspRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/announcements`, getAuthHeaders()),
        axios.get(`${API_BASE_URL}/holiday`, getAuthHeaders()),
        axios.get(`${API_BASE_URL}/api/suspensions`, getAuthHeaders()),
      ]);
      setAnnouncements(Array.isArray(annRes.data)  ? annRes.data  : []);
      setHolidays(     Array.isArray(holRes.data)  ? holRes.data  : []);
      setSuspensions(  Array.isArray(suspRes.data) ? suspRes.data : []);
      showSnackbar('Records loaded successfully', 'success');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch records. Please try again.');
    } finally { setLoading(false); }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const buildFormData = (src) => {
    const fd = new FormData();
    fd.append('title',    src.title);
    fd.append('about',    src.about || '');
    fd.append('date_start', src.date_start);
    fd.append('date_end',   src.date_end);
    fd.append('hr_only',  src.hr_only  ? 'true' : 'false');
    fd.append('is_flexi', src.is_flexi ? 'true' : 'false');
    if (src.is_flexi) {
      fd.append('flexi_hours', src.flexi_hours ?? 2);
      if (src.flexi_custom_time) fd.append('flexi_custom_time', src.flexi_custom_time);
    }
    if (src.image) fd.append('image', src.image);
    return fd;
  };

  const handleAdd = async () => {
    const { title, about, date_start, date_end } = newAnnouncement;
    if (!title || !about || !date_start || !date_end) { showSnackbar('Please fill in Title, About, and Date Range.'); return; }
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/announcements`, buildFormData(newAnnouncement), { headers: { 'Content-Type': 'multipart/form-data', ...getAuthHeaders().headers } });
      setNewAnnouncement(emptyAnn);
      setSuccessOpen(true);
      fetchAll();
    } catch (e) { showSnackbar('Failed to add announcement.'); }
    finally { setLoading(false); }
  };

  const handleAddSuspension = async () => {
    const { title, date_start, date_end } = newSuspension;
    if (!title || !date_start || !date_end) { showSnackbar('Please fill in Title and Date Range.'); return; }
    setLoading(true);
    try {
      const fd = buildFormData({ ...newSuspension, about: newSuspension.about || '' });
      fd.append('reason', newSuspension.reason || '');
      await axios.post(`${API_BASE_URL}/api/suspensions`, fd, { headers: { 'Content-Type': 'multipart/form-data', ...getAuthHeaders().headers } });
      setNewSuspension(emptySusp);
      setSuccessOpen(true);
      fetchAll();
    } catch (e) { showSnackbar('Failed to add suspension.'); }
    finally { setLoading(false); }
  };

  const handleAddHoliday = async () => {
    const { title, date_start, date_end, status } = newHoliday;
    if (!title || !date_start || !date_end || !status) { showSnackbar('Please fill in Title, Date Range, and Status.'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('title', title); fd.append('about', newHoliday.about || '');
      fd.append('date_start', date_start); fd.append('date_end', date_end);
      fd.append('status', status);
      if (newHoliday.image) fd.append('image', newHoliday.image);
      await axios.post(`${API_BASE_URL}/holiday`, fd, { headers: { 'Content-Type': 'multipart/form-data', ...getAuthHeaders().headers } });
      setNewHoliday(emptyHol);
      setSuccessOpen(true);
      fetchAll();
    } catch (e) { showSnackbar('Failed to add holiday.'); }
    finally { setLoading(false); }
  };

  const handleFileChange = (setter) => (e) => {
    const { name, value, files, type, checked } = e.target;
    if (name === 'image') setter((p) => ({ ...p, image: files[0] }));
    else if (type === 'checkbox') setter((p) => ({ ...p, [name]: checked }));
    else setter((p) => ({ ...p, [name]: value }));
  };

  const getImageUrl = (image) => {
    if (!image) return '';
    if (image instanceof File) return URL.createObjectURL(image);
    if (typeof image === 'string') {
      if (image.startsWith('http')) return image;
      if (image.startsWith('/uploads')) return `${API_BASE_URL}${image}`;
    }
    return image;
  };

  const formatDateRange = (start, end) => {
    if (!start && !end) return '—';
    const fmt = (d) => { try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return d; } };
    const s = fmt(start), e = fmt(end);
    return s === e ? s : `${s} – ${e}`;
  };

  const isEnded = (item) => {
    if (item.isHoliday && (item.status || '').toLowerCase() === 'inactive') return true;
    const end = item.date_end || item.date;
    if (!end) return false;
    const today = new Date(); today.setHours(0,0,0,0);
    const endD = new Date(end); endD.setHours(0,0,0,0);
    return today > endD;
  };

  // ── Combined items ────────────────────────────────────────────────────────
  const allHolidaysMapped = holidays.map((h) => ({
    id: `holiday-${h.id}`, _rawId: h.id,
    title: h.title || h.description || '', about: h.about || 'Official holiday.',
    date_start: h.date_start || h.date, date_end: h.date_end || h.date,
    date: h.date_start || h.date_end || h.date, image: h.image || null,
    status: h.status || 'Active', isHoliday: true,
  }));

  const suspensionsMapped = (suspensions || []).map((s) => ({
    id: `suspension-${s.id}`, _rawId: s.id,
    title: s.title || '', about: s.about || '',
    date_start: s.date_start || s.date, date_end: s.date_end || s.date,
    date: s.date_start || s.date_end || s.date, image: s.image || null,
    isHoliday: false, isSuspension: true,
    hr_only: s.hr_only, is_flexi: s.is_flexi,
    flexi_hours: s.flexi_hours, flexi_custom_time: s.flexi_custom_time,
  }));

  const combinedItems = [
    ...allHolidaysMapped,
    ...suspensionsMapped,
    ...announcements.map((a) => ({ ...a, date_start: a.date_start || a.date, date_end: a.date_end || a.date, isHoliday: false, isSuspension: !!a.isSuspension })),
  ].sort((a, b) => new Date(b.date_start || b.date) - new Date(a.date_start || a.date));

  const filteredItems = useMemo(() => {
    let f = combinedItems;
    if (typeFilter === 'holiday')           f = f.filter((i) => i.isHoliday);
    else if (typeFilter === 'announcement') f = f.filter((i) => !i.isHoliday && !i.isSuspension);
    else if (typeFilter === 'suspension')   f = f.filter((i) => i.isSuspension);
    else if (typeFilter === 'hr_only')      f = f.filter((i) => i.hr_only === true || i.hr_only === 1);
    else if (typeFilter === 'flexi')        f = f.filter((i) => i.is_flexi === true || i.is_flexi === 1);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      f = f.filter((i) => (i.title || '').toLowerCase().includes(q) || (i.about || '').toLowerCase().includes(q));
    }
    return f;
  }, [combinedItems, typeFilter, searchQuery]);

  // ── Summary counts ────────────────────────────────────────────────────────
  const activeCount = combinedItems.filter((i) => !isEnded(i)).length;
  const totalCount  = combinedItems.length;

  // ── Left panel renderer — now contains the CREATE FORM ───────────────────
  const renderLeftPanel = () => {
    const isAnn  = createFormType === 'announcement';
    const isSusp = createFormType === 'suspension';
    const isHol  = createFormType === 'holiday';

    const src      = isAnn ? newAnnouncement : isSusp ? newSuspension : newHoliday;
    const setSrc   = isAnn ? setNewAnnouncement : isSusp ? setNewSuspension : setNewHoliday;
    const onChange = handleFileChange(setSrc);
    const onFlexiChange = (field, val) => setSrc((p) => ({ ...p, [field]: val }));
    const onSubmit = isAnn ? handleAdd : isSusp ? handleAddSuspension : handleAddHoliday;
    const submitLabel = isAnn ? 'Add Announcement' : isSusp ? 'Add Suspension' : 'Add Holiday';

    return (
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

        {/* Form type selector — horizontal */}
        <Box>
          <FormSectionLabel icon={AddIcon}>Create Type</FormSectionLabel>
          <ToggleButtonGroup
            value={createFormType} exclusive
            onChange={(_, v) => { if (v) setCreateFormType(v); }}
            fullWidth
            sx={{
              '& .MuiToggleButton-root': {
                flex: 1, gap: 0.5, py: 0.6, px: 0.75,
                fontSize: '0.7rem', fontWeight: 600, borderColor: T.accentBorder,
                color: T.muted, textTransform: 'none',
                '&.Mui-selected': { bgcolor: T.accentFaint, color: T.accent, borderColor: T.accent },
              },
            }}
          >
            <ToggleButton value="announcement"><AnnouncementIcon sx={{ fontSize: 12 }} />&nbsp;Ann.</ToggleButton>
            <ToggleButton value="suspension"><BlockIcon sx={{ fontSize: 12 }} />&nbsp;Susp.</ToggleButton>
            <ToggleButton value="holiday"><EventIcon sx={{ fontSize: 12 }} />&nbsp;Holiday</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Title */}
        <Box>
          <FormSectionLabel icon={AddIcon}>Title *</FormSectionLabel>
          <FieldInput fullWidth size="small" name="title" value={src.title} onChange={onChange} placeholder="Enter title…" />
        </Box>

        {/* Reason (suspension only) */}
        {isSusp && (
          <Box>
            <FormSectionLabel icon={Info}>Reason / Type</FormSectionLabel>
            <FieldInput fullWidth size="small" name="reason" value={src.reason} onChange={onChange} placeholder="e.g. Typhoon Signal No. 2" />
          </Box>
        )}

        {/* Date range — side by side */}
        <Box>
          <FormSectionLabel icon={CalendarToday}>Date Range *</FormSectionLabel>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <FieldInput fullWidth size="small" label="Start" name="date_start" type="date" value={src.date_start} onChange={onChange} InputLabelProps={{ shrink: true }} />
            <FieldInput fullWidth size="small" label="End" name="date_end" type="date" value={src.date_end} onChange={onChange} InputLabelProps={{ shrink: true }} />
          </Box>
        </Box>

        {/* Status (holiday only) */}
        {isHol && (
          <Box>
            <FormSectionLabel icon={Info}>Status</FormSectionLabel>
            <FormControl fullWidth size="small">
              <Select name="status" value={src.status} onChange={onChange} sx={compactSelectSx}>
                <MenuItem value="Active"   sx={{ fontSize: '0.82rem' }}>Active</MenuItem>
                <MenuItem value="Inactive" sx={{ fontSize: '0.82rem' }}>Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}

        {/* About */}
        <Box>
          <FormSectionLabel icon={AnnouncementIcon}>{isAnn ? 'About *' : isHol ? 'About' : 'Details / Description'}</FormSectionLabel>
          <FieldInput fullWidth size="small" name="about" value={src.about} onChange={onChange} multiline rows={isHol ? 1 : 2} placeholder="Enter description…" />
        </Box>

        {/* Visibility flags (ann + susp only) */}
{isAnn && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
              <HrIcon sx={{ fontSize: 10, color: alpha(T.accent, 0.45) }} />
              <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: alpha(T.accent, 0.45) }}>
                Visibility &amp; Schedule
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              {/* HR Only */}
              <Box onClick={() => setSrc((p) => ({ ...p, hr_only: !p.hr_only }))}
                sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.3, px: 1, py: 0.85, borderRadius: 2, border: `1.5px solid ${src.hr_only ? '#1565c0' : T.accentBorder}`, bgcolor: src.hr_only ? alpha('#1565c0', 0.07) : 'transparent', cursor: 'pointer', transition: 'all 0.15s', '&:hover': { bgcolor: src.hr_only ? alpha('#1565c0', 0.10) : T.accentFaint } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: src.hr_only ? '#1565c0' : T.text, lineHeight: 1.2 }}>HR Only</Typography>
                  <Switch size="small" checked={!!src.hr_only}
                    onChange={(e) => { e.stopPropagation(); setSrc((p) => ({ ...p, hr_only: e.target.checked })); }}
                    sx={{ p: 0, ml: 0.5, '& .MuiSwitch-switchBase.Mui-checked': { color: '#1565c0' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#1565c0' } }} />
                </Box>
                <Typography sx={{ fontSize: '0.58rem', color: T.muted, lineHeight: 1.3 }}>HR staff visibility</Typography>
              </Box>
              {/* Flexi */}
              <Box onClick={() => setSrc((p) => ({ ...p, is_flexi: !p.is_flexi }))}
                sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.3, px: 1, py: 0.85, borderRadius: 2, border: `1.5px solid ${src.is_flexi ? '#2e7d32' : T.accentBorder}`, bgcolor: src.is_flexi ? alpha('#2e7d32', 0.07) : 'transparent', cursor: 'pointer', transition: 'all 0.15s', '&:hover': { bgcolor: src.is_flexi ? alpha('#2e7d32', 0.10) : T.accentFaint } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: src.is_flexi ? '#2e7d32' : T.text, lineHeight: 1.2 }}>Flexi Schedule</Typography>
                  <Switch size="small" checked={!!src.is_flexi}
                    onChange={(e) => { e.stopPropagation(); setSrc((p) => ({ ...p, is_flexi: e.target.checked })); }}
                    sx={{ p: 0, ml: 0.5, '& .MuiSwitch-switchBase.Mui-checked': { color: '#2e7d32' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#2e7d32' } }} />
                </Box>
                <Typography sx={{ fontSize: '0.58rem', color: T.muted, lineHeight: 1.3 }}>Grace period applies</Typography>
              </Box>
            </Box>
            <Collapse in={!!src.is_flexi} timeout={300}>
              <FlexiScheduleSection values={src} onChange={onFlexiChange} />
            </Collapse>
          </Box>
        )}

        {/* Image upload */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" component="label" size="small"
            startIcon={<ImageIcon sx={{ fontSize: 14 }} />}
            sx={{ borderRadius: '6px', textTransform: 'none', fontSize: '0.74rem', fontWeight: 600, borderColor: T.accentBorder, color: T.accent, py: 0.5, '&:hover': { borderColor: T.accent, bgcolor: T.accentFaint } }}
          >
            {src.image ? 'Change Image' : 'Upload Image'}
            <input type="file" hidden name="image" accept="image/*" onChange={onChange} />
          </Button>
          {src.image && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <img src={getImageUrl(src.image)} alt="preview" style={{ maxWidth: 60, maxHeight: 36, borderRadius: 4, border: `1px solid ${T.accentBorder}` }} />
              <Typography sx={{ fontSize: '0.68rem', color: T.muted, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {src.image instanceof File ? src.image.name : 'Image attached'}
              </Typography>
              <IconButton size="small" onClick={() => setSrc((p) => ({ ...p, image: null }))} sx={{ p: 0.2 }}>
                <CloseIcon sx={{ fontSize: 12, color: T.faint }} />
              </IconButton>
            </Box>
          )}
        </Box>

        {/* Submit */}
        <Button variant="contained" fullWidth onClick={onSubmit} disabled={loading}
          startIcon={loading ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <AddIcon sx={{ fontSize: '14px !important' }} />}
          sx={{ borderRadius: '6px', textTransform: 'none', fontWeight: 700, fontSize: '0.82rem', py: 0.75, bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.3)}`, '&:hover': { bgcolor: T.accentDark }, '&:disabled': { opacity: 0.5 } }}
        >
          {loading ? 'Saving…' : submitLabel}
        </Button>
      </Box>
    );
  };

  // ── Search / Filter / Legend panel — now shown above the records table ────
  const renderFilterPanel = () => (
    <Box sx={{ px: 3, py: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end', borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0 }}>

      {/* Search */}
      <Box sx={{ flex: '1 1 200px', minWidth: 160 }}>
        <FormSectionLabel icon={SearchIcon}>Search</FormSectionLabel>
        <FieldInput
          fullWidth size="small" placeholder="Search title or about…"
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 14, color: T.faint }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Type filter */}
      <Box sx={{ flex: '1 1 160px', minWidth: 140 }}>
        <FormSectionLabel icon={FilterList}>Filter by Type</FormSectionLabel>
        <FormControl fullWidth size="small">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} sx={compactSelectSx}>
            <MenuItem value="all"          sx={{ fontSize: '0.76rem' }}>All Types</MenuItem>
            <MenuItem value="announcement" sx={{ fontSize: '0.76rem' }}>Announcements</MenuItem>
            <MenuItem value="suspension"   sx={{ fontSize: '0.76rem' }}>Suspensions</MenuItem>
            <MenuItem value="holiday"      sx={{ fontSize: '0.76rem' }}>Holidays</MenuItem>
            <MenuItem value="hr_only"      sx={{ fontSize: '0.76rem' }}>HR Only</MenuItem>
            <MenuItem value="flexi"        sx={{ fontSize: '0.76rem' }}>Flexi</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Legend */}
      <Box sx={{ flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', pb: 0.25 }}>
        {[
          { icon: <HrIcon sx={{ fontSize: 10, color: '#1565c0' }} />, label: 'HR Only', desc: 'HR staff only' },
          { icon: <FlexiIcon sx={{ fontSize: 10, color: '#2e7d32' }} />, label: 'Flexi', desc: 'Grace period' },
        ].map(({ icon, label, desc }) => (
          <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {icon}
            <Typography sx={{ fontSize: '0.67rem', fontWeight: 700, color: T.text }}>{label}</Typography>
            <Typography sx={{ fontSize: '0.62rem', color: T.muted }}>— {desc}</Typography>
          </Box>
        ))}
      </Box>

    </Box>
  );

  // ── Guards ────────────────────────────────────────────────────────────────
  if (pageLoading || accessLoading) return <AnnouncementWireframe />;
  if (hasAccess === false) return (
    <AccessDenied title="Access Denied" message="You do not have permission to access Announcement Management." returnPath="/admin-home" returnButtonText="Return to Home" />
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Fade in timeout={400}>
      <Box>
        <style>{shimmerKf}</style>

        {/* Snackbar */}
        <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setSnackbar((p) => ({ ...p, open: false }))} severity={snackbar.severity} variant="filled" sx={{ width: '100%', fontWeight: 600 }}>
            {snackbar.message}
          </Alert>
        </Snackbar>

        {createPortal(
          <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} sx={{ zIndex: 9998 }}>
            <Alert severity="error" onClose={() => setError('')} sx={{ width: '100%' }}>{error}</Alert>
          </Snackbar>,
          document.body
        )}

        <Box sx={{ py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 }, width: '100vw', maxWidth: '100%', position: 'relative', left: '63%', transform: 'translateX(-61%)', px: { xs: 2, sm: 3, md: 6 } }}>

          {/* ── Page Header ── */}
          <SectionCard sx={{ mb: 2, overflow: 'hidden' }}>
            <Box sx={{ px: 4, py: 3, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle,${alpha(T.accent, 0.10)} 0%,transparent 70%)` }} />
              <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: `radial-gradient(circle,${alpha(T.accent, 0.07)} 0%,transparent 70%)` }} />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
                <AnnouncementIcon sx={{ fontSize: 32, color: T.accent }} />
                <Box>
                  <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3 }}>
                    Announcement Management
                  </Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: T.accentMid, fontWeight: 700, opacity: 0.9 }}>
                    Administrative Panel • Announcements, Suspensions &amp; Holidays
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
                <Box sx={{ px: 2, py: 0.6, borderRadius: 5, bgcolor: alpha('#4caf50', 0.12), border: '1px solid rgba(76,175,80,0.25)' }}>
                  <Typography sx={{ fontSize: '0.72rem', color: '#2e7d32', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CheckCircle sx={{ fontSize: 12 }} /> {activeCount} Active
                  </Typography>
                </Box>
                <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                  <Typography sx={{ fontSize: '0.8rem', color: T.accent, fontWeight: 700 }}>{totalCount} records</Typography>
                </Box>
                <Tooltip title="Refresh">
                  <IconButton onClick={fetchAll} disabled={loading}
                    sx={{ bgcolor: alpha(T.accent, 0.08), color: T.accent, width: 36, height: 36, '&:hover': { bgcolor: alpha(T.accent, 0.15) } }}
                  >
                    {loading ? <CircularProgress size={18} sx={{ color: T.accent }} /> : <Refresh sx={{ fontSize: 18 }} />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </SectionCard>

          {/* ── Two-column layout ── */}
          <Grid container spacing={2}>

            {/* LEFT: Sidebar */}
            <Grid item xs={12} lg={3}>
              <SectionCard sx={{ height: { xs: 'auto', lg: 'calc(100vh - 280px)' }, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Box sx={{ px: 2, py: 1, borderBottom: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', gap: 1, bgcolor: T.accentFaint, flexShrink: 0 }}>
                  {createFormType === 'announcement' && <AnnouncementIcon sx={{ fontSize: 13, color: T.accent }} />}
                  {createFormType === 'suspension'   && <BlockIcon sx={{ fontSize: 13, color: '#b71c1c' }} />}
                  {createFormType === 'holiday'      && <EventIcon sx={{ fontSize: 13, color: '#e65100' }} />}
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.accent }}>
                    {createFormType === 'announcement' ? 'Create Announcement' : createFormType === 'suspension' ? 'Create Suspension' : 'Create Holiday'}
                  </Typography>
                </Box>
                <Box sx={{ flexGrow: 1, overflowY: 'auto', ...scrollbarSx }}>
                  {renderLeftPanel()}
                </Box>
              </SectionCard>
            </Grid>

            {/* RIGHT: Create form + Records table */}
            <Grid item xs={12} lg={9}>
              <SectionCard sx={{ height: { xs: 'auto', lg: 'calc(100vh - 280px)' }, display: 'flex', flexDirection: 'column', position: 'relative' }}>

                {/* ── SEARCH / FILTER / LEGEND ── */}
                {renderFilterPanel()}

                {/* ── RECORDS TABLE ── */}
                {/* Table toolbar */}
                <Box sx={{ px: 3, py: 1.5, borderTop: `1px solid ${T.divider}`, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <FilterList sx={{ fontSize: 15, color: T.accent }} />
                      <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: T.text }}>Records</Typography>
                      <Box sx={{ px: 1.5, py: 0.3, borderRadius: 6, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}` }}>
                        <Typography sx={{ fontSize: '0.7rem', color: T.accent, fontWeight: 700 }}>{filteredItems.length} shown</Typography>
                      </Box>
                    </Box>
                    <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>
                      {announcements.length} ann · {suspensions.length} susp · {holidays.length} hol
                    </Typography>
                  </Box>
                  {loading && <LinearProgress sx={{ mt: 1, height: 2, borderRadius: 1, bgcolor: alpha(T.accent, 0.1), '& .MuiLinearProgress-bar': { bgcolor: T.accent } }} />}
                </Box>

                {/* Table */}
                <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'auto', ...scrollbarSx }}>
                  {/* Column headers */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '0.5fr 1fr 1.2fr 1.8fr 1.3fr 1.1fr', px: 2.5, py: 1.25, bgcolor: T.accent, gap: 1, position: 'sticky', top: 0, zIndex: 2, minWidth: 700 }}>
                    {['#', 'TYPE', 'TITLE', 'ABOUT', 'DATE RANGE', 'FLAGS'].map((h) => (
                      <Typography key={h} sx={{ color: '#fff', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.07em' }}>{h}</Typography>
                    ))}
                  </Box>

                  {filteredItems.length === 0 ? (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                      <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                        <Info sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                      </Box>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>No records found</Typography>
                      <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>Try adjusting the filter or search query.</Typography>
                    </Box>
                  ) : (
                    <Fade in timeout={250}>
                      <Box sx={{ overflowX: 'auto' }}>
                        {filteredItems.map((item, index) => {
                          const ended = isEnded(item);
                          const typeConf = getTypeConfig(item);

                          return (
                            <Box key={item.id}
                              sx={{
                                display: 'grid', gridTemplateColumns: '0.5fr 1fr 1.2fr 1.8fr 1.3fr 1.1fr',
                                px: 2.5, py: 1.5, gap: 1, alignItems: 'center', minWidth: 700,
                                bgcolor: index % 2 === 0 ? '#fff' : T.rowOdd,
                                borderBottom: `1px solid ${T.divider}`,
                                transition: 'background 0.12s',
                                '&:hover': { bgcolor: T.rowHover },
                                '&:last-child': { borderBottom: 'none' },
                                opacity: ended ? 0.65 : 1,
                              }}
                            >
                              {/* # */}
                              <Typography sx={{ fontSize: '0.75rem', color: T.faint, fontWeight: 500 }}>{index + 1}</Typography>

                              {/* Type */}
                              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, px: 1, py: 0.3, borderRadius: '10px', bgcolor: typeConf.bg, border: typeConf.border, width: 'fit-content' }}>
                                {typeConf.icon}
                                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: typeConf.color }}>{typeConf.label}</Typography>
                              </Box>

                              {/* Title */}
                              <Box>
                                <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: T.text, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                                  {item.title || '—'}
                                </Typography>
                                <Box sx={{
                                  display: 'inline-flex', alignItems: 'center', gap: 0.4, px: 0.75, py: 0.2, borderRadius: '8px', mt: 0.4,
                                  bgcolor: ended ? alpha('#9e9e9e', 0.12) : alpha('#4caf50', 0.10),
                                  border: `1px solid ${ended ? '#9e9e9e' : '#4caf50'}`,
                                }}>
                                  {!ended && <CheckCircle sx={{ fontSize: 9, color: '#4caf50' }} />}
                                  <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: ended ? '#757575' : '#2e7d32' }}>
                                    {ended ? 'Ended' : 'Active'}
                                  </Typography>
                                </Box>
                              </Box>

                              {/* About */}
                              <Typography sx={{ fontSize: '0.76rem', color: T.muted, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>
                                {item.about || '—'}
                              </Typography>

                              {/* Date Range */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarToday sx={{ fontSize: 10, color: T.faint, flexShrink: 0 }} />
                                <Typography sx={{ fontSize: '0.74rem', color: T.text, lineHeight: 1.3 }}>
                                  {formatDateRange(item.date_start, item.date_end) || '—'}
                                </Typography>
                              </Box>

                              {/* Flags */}
                              <FlagBadges item={item} />
                            </Box>
                          );
                        })}
                      </Box>
                    </Fade>
                  )}
                </Box>

                {/* Footer legend */}
                <Box sx={{ px: 3, py: 1.25, borderTop: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2.5, flexShrink: 0 }}>
                  {[
                    { icon: <CheckCircle sx={{ fontSize: 13, color: '#4caf50' }} />, label: 'Active = within date range' },
                    { icon: <HrIcon sx={{ fontSize: 13, color: '#1565c0' }} />,      label: 'HR Only = restricted visibility' },
                    { icon: <FlexiIcon sx={{ fontSize: 13, color: '#2e7d32' }} />,   label: 'Flexi = grace period for Non-Teaching' },
                    { icon: <BlockIcon sx={{ fontSize: 13, color: '#b71c1c' }} />,   label: 'Suspension = work-day cancelled' },
                  ].map((item, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                      {item.icon}
                      <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>{item.label}</Typography>
                    </Box>
                  ))}
                </Box>

              </SectionCard>
            </Grid>
          </Grid>
        </Box>

        {/* Scroll to top FAB */}
        <Zoom in={showScrollTop}>
          <Fab size="small"
            sx={{ position: 'fixed', bottom: 24, right: 45, zIndex: 1000, bgcolor: T.accent, color: '#fff', '&:hover': { bgcolor: T.accentDark }, boxShadow: `0 4px 14px ${alpha(T.accent, 0.35)}` }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <KeyboardArrowUp />
          </Fab>
        </Zoom>

        {/* Overlays */}
        <LoadingOverlay open={loading} message="Processing announcement data…" />
        <SuccessfulOverlay open={successOpen} onClose={() => setSuccessOpen(false)} message="Record saved successfully" />
      </Box>
    </Fade>
  );
};

export default AnnouncementForm;