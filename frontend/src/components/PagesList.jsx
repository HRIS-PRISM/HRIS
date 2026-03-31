import API_BASE_URL from '../apiConfig';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import SuccessfulOverlay from './SuccessfulOverlay';
import {
  Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Box, Alert, TextField, Grid,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Chip, Tooltip, Avatar, Backdrop,
  alpha, TablePagination, MenuItem, FormControl, Select,
  FormHelperText, Checkbox, FormControlLabel, Portal, Paper,
  InputAdornment,
} from '@mui/material';
import {
  Add, Edit, Delete, Save, Cancel, Group, Description, Warning,
  CheckCircle, Error, Person, FilterList, Refresh, SupervisorAccount,
  AdminPanelSettings, Work, Info, Category, Assignment, Assessment,
  Payment, Folder, FolderSpecial, EventNote, Search,
  KeyboardArrowRight, Pages as PagesIcon, Lock,
} from '@mui/icons-material';
import AccessDenied from './AccessDenied';
import axios from 'axios';
import { getComponentInfo } from '../utils/componentMapping';

/* ─────────────────────────────────────────────────────────────────
   GLOBAL CSS — matches Profile exactly
───────────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes sectionIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes bannerSlide {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -900px 0; }
    100% { background-position:  900px 0; }
  }
  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(109,35,35,0.4); }
    70%  { box-shadow: 0 0 0 8px rgba(109,35,35,0); }
    100% { box-shadow: 0 0 0 0 rgba(109,35,35,0); }
  }
  * { font-family: 'IBM Plex Sans', sans-serif; box-sizing: border-box; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #f0f0f0; }
  ::-webkit-scrollbar-thumb { background: rgba(109,35,35,0.25); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(109,35,35,0.5); }
`;

/* ─────────────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────────────── */
const P      = '#6D2323';
const S      = '#8B4545';
const P_DARK = '#4a1515';
const PANEL  = '#ffffff';
const BD     = '#e2e4e8';
const TXT    = '#111827';
const MUTED  = '#6b7280';
const SUBTLE = '#f7f8fa';
const SIDEBAR_W = 260;

/* ─────────────────────────────────────────────────────────────────
   AUTH UTILS
───────────────────────────────────────────────────────────────── */
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
};

const getUserRole = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    const payload = JSON.parse(jsonPayload);
    return payload.role || payload.userRole || null;
  } catch { return null; }
};

/* ─────────────────────────────────────────────────────────────────
   SHARED ATOMS — mirrors Profile atoms
───────────────────────────────────────────────────────────────── */
const GlassCard = ({ children, sx = {} }) => (
  <Box sx={{ background: PANEL, borderRadius: 3, border: `1px solid ${alpha(P, 0.09)}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden', ...sx }}>{children}</Box>
);

const CardBanner = () => (
  <Box sx={{ height: 6, background: `linear-gradient(90deg, ${P} 0%, ${S} 60%, ${alpha(P, 0.4)} 100%)` }} />
);

const SectionHeader = ({ icon: Icon, title, subtitle, action }) => (
  <Box sx={{ px: 4, py: 3, background: 'linear-gradient(135deg,#ffffff 0%,#f6f6f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', borderBottom: `1px solid ${BD}` }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Avatar sx={{ bgcolor: alpha(P, 0.1), width: 52, height: 52, boxShadow: `0 4px 16px ${alpha(P, 0.12)}` }}>
        <Icon sx={{ color: P, fontSize: 26 }} />
      </Avatar>
      <Box>
        <Typography sx={{ fontWeight: 900, fontSize: '1rem', color: P, lineHeight: 1.2 }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: '0.78rem', color: MUTED, fontWeight: 600, mt: 0.2 }}>{subtitle}</Typography>}
      </Box>
    </Box>
    {action && <Box>{action}</Box>}
  </Box>
);

const Btn = ({ children, danger, outline, sm, fullWidth, startIcon, ...p }) => (
  <Button disableElevation fullWidth={fullWidth} variant={outline ? 'outlined' : 'contained'}
    startIcon={startIcon}
    sx={{
      borderRadius: 2, textTransform: 'none', fontWeight: 700,
      fontSize: sm ? '0.78rem' : '0.875rem',
      py: sm ? 0.75 : 1.1, px: sm ? 2 : 3,
      boxShadow: outline ? 'none' : `0 4px 12px ${alpha(P, 0.28)}`,
      ...(outline
        ? { borderColor: alpha(P, 0.45), color: P, '&:hover': { borderColor: P, bgcolor: alpha(P, 0.04) } }
        : danger
          ? { bgcolor: '#b91c1c', color: '#fff', '&:hover': { bgcolor: '#991b1b' }, '&:disabled': { bgcolor: '#e5e7eb', color: '#9ca3af', boxShadow: 'none' } }
          : { bgcolor: P, color: '#fff', '&:hover': { bgcolor: P_DARK }, '&:disabled': { bgcolor: '#e5e7eb', color: '#9ca3af', boxShadow: 'none' } }),
    }} {...p}>{children}
  </Button>
);

/* Field label — matches Profile's FL */
const FL = ({ children, req }) => (
  <Typography component="label" sx={{ fontSize: '0.68rem', fontWeight: 700, color: alpha(TXT, 0.5), mb: 0.55, display: 'flex', alignItems: 'center', gap: 0.4, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1 }}>
    {children}{req && <span style={{ color: '#c0392b', marginLeft: 2, fontSize: '0.62rem' }}>*</span>}
  </Typography>
);

/* Input chrome — identical to Profile */
const INPUT_CHROME = {
  borderRadius: '8px', bgcolor: '#f4f5f7', fontSize: '0.875rem', color: TXT,
  transition: 'background-color 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
  '& fieldset': { borderColor: 'transparent', borderWidth: '1.5px', transition: 'border-color 0.15s ease' },
  '&:hover': { bgcolor: '#eef0f3' },
  '&:hover fieldset': { borderColor: alpha(P, 0.22) },
  '&.Mui-focused': { bgcolor: '#ffffff', boxShadow: `0 0 0 2px ${alpha(P, 0.18)}, inset 0 1px 3px rgba(0,0,0,0.04)` },
  '&.Mui-focused fieldset': { borderColor: P, borderWidth: '1.5px' },
};

const FX = { '& .MuiOutlinedInput-root': INPUT_CHROME, '& .MuiInputBase-input': { py: '9px', px: '12px', fontWeight: 500 } };

const SELECT_SX = {
  borderRadius: '8px', bgcolor: '#f4f5f7', fontSize: '0.875rem', fontWeight: 500,
  transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent', borderWidth: '1.5px' },
  '&:hover': { bgcolor: '#eef0f3' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(P, 0.22) },
  '&.Mui-focused': { bgcolor: '#ffffff', boxShadow: `0 0 0 2px ${alpha(P, 0.18)}, inset 0 1px 3px rgba(0,0,0,0.04)` },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: P, borderWidth: '1.5px' },
  '& .MuiSelect-select': { py: '9px', px: '12px' },
};

const Div = ({ label }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', my: 3 }}>
    <Box sx={{ width: 24, height: 3, bgcolor: P, borderRadius: 2, mr: 1.5, flexShrink: 0 }} />
    <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', fontWeight: 700, color: P, textTransform: 'uppercase', letterSpacing: '0.14em', mr: 1.5 }}>{label}</Typography>
    <Box sx={{ flex: 1, height: '1px', bgcolor: alpha(P, 0.12) }} />
  </Box>
);

/* ─────────────────────────────────────────────────────────────────
   NAV SECTIONS — for sidebar
───────────────────────────────────────────────────────────────── */
const NAV = [
  { key: 'all',        label: 'All Pages',          icon: PagesIcon },
  { key: 'General',   label: 'General',             icon: Category },
  { key: 'System Administration', label: 'System Administration', icon: AdminPanelSettings },
  { key: 'Registration',          label: 'Registration',          icon: Assignment },
  { key: 'Information Management', label: 'Info Management',      icon: Info },
  { key: 'Attendance Management',  label: 'Attendance Mgmt',      icon: Assessment },
  { key: 'Payroll Management',     label: 'Payroll Mgmt',         icon: Payment },
  { key: 'Leave Management',       label: 'Leave Mgmt',           icon: EventNote },
  { key: 'Form',                   label: 'Forms',                icon: Description },
  { key: 'Pages Management',       label: 'Pages Mgmt',           icon: FolderSpecial },
  { key: 'Personal Data Sheets',   label: 'Personal Data',        icon: Folder },
];

const descriptionOptions = [
  'General', 'System Administration', 'Registration', 'Information Management',
  'Attendance Management', 'Payroll Management', 'Leave Management',
  'Form', 'Pages Management', 'Personal Data Sheets',
];

const accessGroupOptions = ['superadmin', 'administrator', 'technical', 'staff'];

/* ─────────────────────────────────────────────────────────────────
   GROUP / DESC HELPERS
───────────────────────────────────────────────────────────────── */
const getGroupColor = (group) => {
  switch (group?.toLowerCase()) {
    case 'superadmin':    return { color: P };
    case 'administrator': return { color: S };
    case 'technical':     return { color: '#2563eb' };
    case 'staff':         return { color: '#047857' };
    default:              return { color: MUTED };
  }
};

const getDescriptionBadge = (desc) => {
  const map = {
    'general': { icon: <Category sx={{ fontSize: 12 }} />, color: P },
    'system administration': { icon: <AdminPanelSettings sx={{ fontSize: 12 }} />, color: P },
    'registration': { icon: <Assignment sx={{ fontSize: 12 }} />, color: S },
    'information management': { icon: <Info sx={{ fontSize: 12 }} />, color: P },
    'attendance management': { icon: <Assessment sx={{ fontSize: 12 }} />, color: P },
    'payroll management': { icon: <Payment sx={{ fontSize: 12 }} />, color: S },
    'leave management': { icon: <EventNote sx={{ fontSize: 12 }} />, color: P },
    'form': { icon: <Description sx={{ fontSize: 12 }} />, color: P },
    'pages management': { icon: <FolderSpecial sx={{ fontSize: 12 }} />, color: P },
    'personal data sheets': { icon: <Folder sx={{ fontSize: 12 }} />, color: S },
  };
  return map[desc?.toLowerCase()] || { icon: <Description sx={{ fontSize: 12 }} />, color: MUTED };
};

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────── */
const PagesList = () => {
  const [pages, setPages]                   = useState([]);
  const [filteredPages, setFilteredPages]   = useState([]);
  const [activeSection, setActiveSection]   = useState('all');
  const [currentPageId, setCurrentPageId]   = useState(null);
  const [pageDescription, setPageDescription] = useState('');
  const [pageGroups, setPageGroups]         = useState([]);
  const [pageName, setPageName]             = useState('');
  const [pageUrl, setPageUrl]               = useState('');
  const [componentIdentifier, setComponentIdentifier] = useState('');
  const [loading, setLoading]               = useState(false);
  const [deleteDialog, setDeleteDialog]     = useState(false);
  const [deletePageId, setDeletePageId]     = useState(null);
  const [editDialog, setEditDialog]         = useState(false);
  const [successOpen, setSuccessOpen]       = useState(false);
  const [successAction, setSuccessAction]   = useState('');
  const [errorMessage, setErrorMessage]     = useState('');
  const [searchTerm, setSearchTerm]         = useState('');
  const [page, setPage]                     = useState(0);
  const [rowsPerPage, setRowsPerPage]       = useState(10);
  const [addDialog, setAddDialog]           = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [userRole, setUserRole]             = useState(null);
  const [roleChecked, setRoleChecked]       = useState(false);
  const navigate = useNavigate();

  useEffect(() => { const role = getUserRole(); setUserRole(role); setRoleChecked(true); }, []);
  const isSuperAdmin = userRole === 'superadmin' || userRole === 'technical';
  useEffect(() => { if (isSuperAdmin && roleChecked) fetchPages(); }, [isSuperAdmin, roleChecked]);

  useEffect(() => {
    const filtered = pages.filter(pg => {
      const matchSearch =
        (pg.page_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pg.page_description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pg.page_url || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(pg.id || '').includes(searchTerm);
      const matchSection = activeSection === 'all' ? true : (pg.page_description || '') === activeSection;
      return matchSearch && matchSection;
    });
    setFilteredPages(filtered);
    setPage(0);
  }, [searchTerm, activeSection, pages]);

  const fetchPages = async () => {
    setLoading(true); setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/pages`, { method: 'GET', ...getAuthHeaders() });
      if (res.ok) { const data = await res.json(); const sorted = data.sort((a, b) => a.id - b.id); setPages(sorted); setFilteredPages(sorted); }
      else { const err = await res.json(); setErrorMessage(err.error || 'Failed to fetch pages'); }
    } catch { setErrorMessage('Error fetching pages'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!pageName.trim() || !pageDescription.trim() || pageGroups.length === 0) { setErrorMessage('Page name, description, and at least one access group are required'); return; }
    setLoading(true); setErrorMessage('');
    const pageData = { page_name: pageName.trim(), page_description: pageDescription.trim(), page_url: pageUrl.trim() || null, page_group: pageGroups.join(','), component_identifier: componentIdentifier.trim() || null };
    try {
      const url = currentPageId ? `${API_BASE_URL}/pages/${currentPageId}` : `${API_BASE_URL}/pages`;
      const method = currentPageId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, ...getAuthHeaders(), body: JSON.stringify(pageData) });
      const data = await res.json();
      if (res.ok) {
        setSuccessAction(currentPageId ? 'edit' : 'create'); setSuccessOpen(true);
        await fetchPages();
        currentPageId ? setEditDialog(false) : setAddDialog(false);
        resetForm();
      } else { setErrorMessage(data.error || `Failed to ${currentPageId ? 'update' : 'create'} page`); }
    } catch { setErrorMessage('Network error occurred'); }
    finally { setLoading(false); }
  };

  const resetForm = () => { setCurrentPageId(null); setPageName(''); setPageDescription(''); setPageUrl(''); setComponentIdentifier(''); setPageGroups([]); };
  const cancelEdit = () => { resetForm(); setEditDialog(false); setErrorMessage(''); };
  const cancelAdd  = () => { resetForm(); setAddDialog(false);  setErrorMessage(''); };

  const handleEdit = (pg) => {
    setCurrentPageId(pg.id); setPageName(pg.page_name || ''); setPageDescription(pg.page_description || '');
    setComponentIdentifier(pg.component_identifier || ''); setPageUrl(pg.page_url || '');
    setPageGroups(pg.page_group ? pg.page_group.split(',').map(g => g.trim()) : []);
    setEditDialog(true); setErrorMessage('');
  };

  const handleDeleteConfirm = (id) => { setDeletePageId(id); setDeleteConfirmed(false); setDeleteDialog(true); };
  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pages/${deletePageId}`, { method: 'DELETE', ...getAuthHeaders() });
      if (res.ok) { setSuccessAction('delete'); setSuccessOpen(true); await fetchPages(); }
      else { const err = await res.json(); setErrorMessage(err.error || 'Failed to delete page'); }
    } catch { setErrorMessage('Error deleting page'); }
    finally { setLoading(false); setDeleteDialog(false); setDeletePageId(null); setDeleteConfirmed(false); }
  };

  const paginatedPages = filteredPages.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const currentNav = NAV.find(n => n.key === activeSection) || NAV[0];

  /* ── Form fields (shared Add / Edit) ── */
  const renderFormFields = () => (
    <Box>
      <Div label="Page Details" />
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <FL req>Page Name</FL>
          <TextField fullWidth size="small" sx={{ ...FX, mb: 2 }} value={pageName} onChange={e => setPageName(e.target.value)} placeholder="e.g., dashboard, users, reports" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FL req>Page Description</FL>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <Select value={pageDescription} onChange={e => setPageDescription(e.target.value)} sx={SELECT_SX} displayEmpty>
              <MenuItem value=""><em style={{ color: '#9ca3af' }}>— Select —</em></MenuItem>
              {descriptionOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FL>Page URL</FL>
          <TextField fullWidth size="small" sx={{ ...FX, mb: 2 }} value={pageUrl} onChange={e => setPageUrl(e.target.value)} placeholder="e.g., /dashboard, /users" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FL>Component Identifier</FL>
          <TextField fullWidth size="small" sx={{ ...FX, mb: 1 }} value={componentIdentifier} onChange={e => setComponentIdentifier(e.target.value)} placeholder="e.g., pds1, registration"
            InputProps={{ endAdornment: componentIdentifier ? (getComponentInfo(componentIdentifier) ? <CheckCircle sx={{ color: '#16a34a', fontSize: 16 }} /> : <Warning sx={{ color: '#d97706', fontSize: 16 }} />) : null }}
          />
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: MUTED, mb: 2 }}>
            {componentIdentifier && getComponentInfo(componentIdentifier) ? `✓ Connected: ${getComponentInfo(componentIdentifier).componentName}` : componentIdentifier ? '⚠ No mapping found' : 'Optional unique identifier for dynamic access'}
          </Typography>
        </Grid>
      </Grid>
      <Div label="Access Groups" />
      <Box sx={{ mb: 1 }}>
        <FL req>Roles that receive this page on Grant</FL>
        <FormControl fullWidth size="small" sx={{ mt: 0.5 }}>
          <Select multiple value={pageGroups} onChange={e => setPageGroups(e.target.value)} sx={SELECT_SX}
            renderValue={selected => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map(v => (
                  <Box key={v} sx={{ px: 1.25, py: 0.2, bgcolor: alpha(P, 0.1), border: `1px solid ${alpha(P, 0.22)}`, borderRadius: '20px' }}>
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 900, color: P }}>{v.toUpperCase()}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          >
            {accessGroupOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
        <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: MUTED, mt: 0.75 }}>
          Roles selected here will receive this page when "Grant Role Access" is triggered in User Management.
        </Typography>
      </Box>
    </Box>
  );

  /* ─────────────────────────────────────────────────────────────
     GUARDS
  ───────────────────────────────────────────────────────────── */
  if (!roleChecked) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
      <CircularProgress sx={{ color: P, mb: 2 }} />
      <Typography sx={{ color: P, fontWeight: 600 }}>Verifying access permissions…</Typography>
    </Box>
  );

  if (!isSuperAdmin) return (
    <AccessDenied title="Access Required" message="Page Management is restricted to Technical users only." returnPath="/users-list" returnButtonText="Return to User Management" />
  );

  /* ─────────────────────────────────────────────────────────────
     MAIN RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    <Box sx={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <style>{GLOBAL_CSS}</style>

      {/* ══ MAIN CONTENT ══ */}
      <Box sx={{
        width: '100vw', maxWidth: '100%', position: 'relative',
        left: '63%', transform: 'translateX(-61%)',
        pl: { xs: 2, sm: 3, md: 6 }, pr: `${SIDEBAR_W + 16}px`,
        py: { xs: 2, md: 4 },
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}>

        {/* ── Success overlay ── */}
        <Portal>
          <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />
        </Portal>

        {/* ── Error backdrop ── */}
        <Backdrop open={!!errorMessage} sx={{ zIndex: 9999, backdropFilter: 'blur(8px)', bgcolor: 'rgba(0,0,0,0.5)' }} onClick={() => setErrorMessage('')}>
          <Box onClick={e => e.stopPropagation()} sx={{ minWidth: 400, maxWidth: 560 }}>
            {errorMessage && (
              <Alert severity="error" sx={{ borderRadius: 3, boxShadow: '0 12px 48px rgba(0,0,0,0.4)', fontSize: '1rem', p: 3, '& .MuiAlert-message': { fontWeight: 600 } }} onClose={() => setErrorMessage('')}>
                {errorMessage}
              </Alert>
            )}
          </Box>
        </Backdrop>

        {/* ── Breadcrumb ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3.5, flexWrap: 'wrap', animation: 'bannerSlide 0.4s ease' }}>
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: MUTED }}>System</Typography>
          <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: BD }} />
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: P, fontWeight: 700 }}>Page Management</Typography>
          <Box sx={{ flex: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.75, bgcolor: PANEL, border: `1px solid ${BD}`, borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#22c55e', animation: 'pulse-ring 2s infinite', flexShrink: 0 }} />
            <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.67rem', color: MUTED }}>{pages.length} pages registered</Typography>
          </Box>
        </Box>

        {/* ── HERO CARD ── */}
        <GlassCard sx={{ mb: 3, animation: 'sectionIn 0.4s ease' }}>
          <Box sx={{ px: { xs: 3, md: 5 }, py: { xs: 3, md: 4 }, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 180 }}>
              <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.4rem', md: '1.75rem' }, color: P, lineHeight: 1.15, mb: 0.5, letterSpacing: '-0.01em' }}>Page Management</Typography>
              <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', color: MUTED, fontWeight: 600, mb: 1.5 }}>
                Access Groups control which roles receive pages on Grant
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {['superadmin', 'administrator', 'technical', 'staff'].map(role => (
                  <Box key={role} sx={{ px: 1.5, py: 0.3, bgcolor: alpha(P, 0.07), border: `1px solid ${alpha(P, 0.18)}`, borderRadius: '20px' }}>
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 900, color: P }}>{role}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
              <Tooltip title="Refresh pages">
                <IconButton onClick={() => fetchPages()} disabled={loading} sx={{ width: 38, height: 38, border: `1px solid ${BD}`, borderRadius: 1.5, bgcolor: PANEL, '&:hover': { borderColor: P, color: P } }}>
                  {loading ? <CircularProgress size={16} sx={{ color: P }} /> : <Refresh sx={{ fontSize: 17 }} />}
                </IconButton>
              </Tooltip>
              <Btn startIcon={<Group sx={{ fontSize: 15 }} />} onClick={() => navigate('/users-list')}>User Access</Btn>
              <Btn startIcon={<Add sx={{ fontSize: 15 }} />} onClick={() => setAddDialog(true)}>Add Page</Btn>
            </Box>
          </Box>
        </GlassCard>

        {/* ── SEARCH ── */}
        <GlassCard sx={{ mb: 3, animation: 'sectionIn 0.35s ease 0.05s both' }}>
          <Box sx={{ px: 4, py: 2.5, borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: alpha(P, 0.1), width: 36, height: 36 }}><FilterList sx={{ color: P, fontSize: 18 }} /></Avatar>
            <Typography sx={{ fontWeight: 900, fontSize: '0.88rem', color: P }}>Search Pages</Typography>
          </Box>
          <Box sx={{ px: 4, py: 3 }}>
            <TextField fullWidth size="small"
              placeholder="Search by name, description, URL, or ID…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              sx={FX}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: alpha(P, 0.4), fontSize: 18 }} /></InputAdornment> }}
            />
          </Box>
        </GlassCard>

        {/* ── PAGES TABLE ── */}
        {loading && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CircularProgress sx={{ color: P }} size={40} />
            <Typography sx={{ color: MUTED, mt: 2, fontWeight: 600 }}>Loading pages…</Typography>
          </Box>
        )}
        <Box sx={{ animation: !loading ? 'fadeIn 0.4s ease' : 'none', display: loading ? 'none' : undefined }}>
          <GlassCard sx={{ animation: 'sectionIn 0.35s ease 0.1s both' }}>
              <SectionHeader
                icon={currentNav.icon}
                title={activeSection === 'all' ? 'All Pages' : activeSection}
                subtitle={searchTerm ? `${filteredPages.length} of ${pages.length} pages · "${searchTerm}"` : `${filteredPages.length} page${filteredPages.length !== 1 ? 's' : ''} in this section`}
              />

              <Box sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 900 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: SUBTLE }}>
                      {['ID', 'Page Name', 'Page Group', 'URL', 'Component', 'Access Groups', 'Actions'].map((h, i) => (
                        <TableCell key={h} sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', fontWeight: 700, color: alpha(P, 0.5), textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: `2px solid ${alpha(P, 0.12)}`, py: 1.75, px: 2.5, whiteSpace: 'nowrap', textAlign: i === 6 ? 'center' : 'left' }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedPages.length > 0 ? paginatedPages.map((pg, idx) => {
                      const badge = getDescriptionBadge(pg.page_description);
                      return (
                        <TableRow key={pg.id} sx={{ '&:nth-of-type(even)': { bgcolor: alpha(P, 0.018) }, '&:hover': { bgcolor: alpha(P, 0.04) }, transition: 'background-color 0.15s ease', borderBottom: `1px solid ${alpha(P, 0.06)}` }}>
                          {/* ID */}
                          <TableCell sx={{ px: 2.5, py: 2 }}>
                            <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: alpha(P, 0.45), fontWeight: 600 }}>#{pg.id}</Typography>
                          </TableCell>
                          {/* Name */}
                          <TableCell sx={{ px: 2.5, py: 2 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: TXT }}>{pg.page_name}</Typography>
                          </TableCell>
                          {/* Description */}
                          <TableCell sx={{ px: 2.5, py: 2 }}>
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.5, bgcolor: alpha(badge.color, 0.08), border: `1px solid ${alpha(badge.color, 0.2)}`, borderRadius: '20px' }}>
                              <Box sx={{ color: badge.color }}>{badge.icon}</Box>
                              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: badge.color, whiteSpace: 'nowrap' }}>{pg.page_description}</Typography>
                            </Box>
                          </TableCell>
                          {/* URL */}
                          <TableCell sx={{ px: 2.5, py: 2 }}>
                            <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: MUTED, bgcolor: SUBTLE, px: 1, py: 0.4, borderRadius: 1, display: 'inline-block', border: `1px solid ${BD}` }}>
                              {pg.page_url || 'N/A'}
                            </Typography>
                          </TableCell>
                          {/* Component */}
                          <TableCell sx={{ px: 2.5, py: 2 }}>
                            {pg.component_identifier ? (
                              <Tooltip title={getComponentInfo(pg.component_identifier) ? `${getComponentInfo(pg.component_identifier).componentName} · ${getComponentInfo(pg.component_identifier).routePath}` : 'No component mapping found'} arrow>
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.4, bgcolor: getComponentInfo(pg.component_identifier) ? alpha('#16a34a', 0.08) : alpha('#d97706', 0.08), border: `1px solid ${getComponentInfo(pg.component_identifier) ? alpha('#16a34a', 0.25) : alpha('#d97706', 0.25)}`, borderRadius: '20px', cursor: 'help' }}>
                                  {getComponentInfo(pg.component_identifier)
                                    ? <CheckCircle sx={{ fontSize: 11, color: '#16a34a' }} />
                                    : <Warning sx={{ fontSize: 11, color: '#d97706' }} />}
                                  <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', fontWeight: 700, color: getComponentInfo(pg.component_identifier) ? '#16a34a' : '#d97706' }}>{pg.component_identifier}</Typography>
                                </Box>
                              </Tooltip>
                            ) : (
                              <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: alpha(MUTED, 0.5), fontStyle: 'italic' }}>—</Typography>
                            )}
                          </TableCell>
                          {/* Access Groups */}
                          <TableCell sx={{ px: 2.5, py: 2, maxWidth: 220 }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {pg.page_group ? pg.page_group.split(',').map((g, i) => {
                                const gc = getGroupColor(g.trim());
                                return (
                                  <Box key={i} sx={{ px: 1.25, py: 0.2, border: `1px solid ${alpha(gc.color, 0.3)}`, borderRadius: '20px', bgcolor: alpha(gc.color, 0.06) }}>
                                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 900, color: gc.color }}>{g.trim().toUpperCase()}</Typography>
                                  </Box>
                                );
                              }) : <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: alpha(MUTED, 0.5), fontStyle: 'italic' }}>none</Typography>}
                            </Box>
                          </TableCell>
                          {/* Actions */}
                          <TableCell sx={{ px: 2.5, py: 2, textAlign: 'center' }}>
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                              <Tooltip title="Edit">
                                <IconButton onClick={() => handleEdit(pg)} size="small" sx={{ width: 32, height: 32, border: `1px solid ${alpha(P, 0.2)}`, borderRadius: 1.5, color: P, '&:hover': { bgcolor: alpha(P, 0.08), borderColor: P } }}>
                                  <Edit sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton onClick={() => handleDeleteConfirm(pg.id)} size="small" sx={{ width: 32, height: 32, border: `1px solid ${alpha('#b91c1c', 0.2)}`, borderRadius: 1.5, color: '#b91c1c', '&:hover': { bgcolor: alpha('#b91c1c', 0.08), borderColor: '#b91c1c' } }}>
                                  <Delete sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    }) : (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 8 }}>
                          <PagesIcon sx={{ fontSize: 56, color: alpha(P, 0.2), mb: 2, display: 'block', mx: 'auto' }} />
                          <Typography sx={{ fontWeight: 700, color: alpha(P, 0.5), fontSize: '0.95rem', mb: 0.5 }}>No Pages Found</Typography>
                          <Typography sx={{ color: MUTED, fontSize: '0.82rem' }}>{searchTerm ? 'Try adjusting your search' : 'No pages registered yet'}</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>

              {filteredPages.length > 0 && (
                <Box sx={{ px: 3, py: 1.5, borderTop: `1px solid ${BD}`, display: 'flex', justifyContent: 'flex-end' }}>
                  <TablePagination
                    component="div"
                    count={filteredPages.length}
                    page={page}
                    onPageChange={(_, np) => setPage(np)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    sx={{ '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: MUTED } }}
                  />
                </Box>
              )}
            </GlassCard>
        </Box>
      </Box>

      {/* ══ RIGHT SIDEBAR ══ */}
      <Box sx={{
        width: SIDEBAR_W, bgcolor: PANEL, borderLeft: `2px solid ${alpha(P, 0.28)}`,
        boxShadow: `-3px 0 18px ${alpha(P, 0.05)}`, display: 'flex', flexDirection: 'column',
        position: 'fixed', right: 0, top: 0, height: '100vh', overflowY: 'auto', zIndex: 1200,
      }}>
        {/* Sidebar header */}
        <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${alpha(P, 0.1)}`, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, background: `linear-gradient(135deg,${alpha(P, 0.07)} 0%,${alpha(P, 0.01)} 100%)` }}>
          <Box sx={{ width: 36, height: 36, bgcolor: P, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1.5, flexShrink: 0, boxShadow: `0 4px 12px ${alpha(P, 0.4)}` }}>
            <PagesIcon sx={{ fontSize: 18, color: '#fff' }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: '0.88rem', color: P, lineHeight: 1.2 }}>Page Management</Typography>
            <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.57rem', color: alpha(P, 0.4), letterSpacing: '0.08em', textTransform: 'uppercase' }}>System Configuration</Typography>
          </Box>
        </Box>

        {/* Stats mini */}
        <Box sx={{ mx: 2.5, my: 2, p: 2, bgcolor: alpha(P, 0.04), borderRadius: 2, border: `1px solid ${alpha(P, 0.1)}`, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 900, fontSize: '1.3rem', color: P, lineHeight: 1 }}>{pages.length}</Typography>
              <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.57rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 900, fontSize: '1.3rem', color: P, lineHeight: 1 }}>{filteredPages.length}</Typography>
              <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.57rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Filtered</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 900, fontSize: '1.3rem', color: P, lineHeight: 1 }}>{descriptionOptions.length}</Typography>
              <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.57rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sections</Typography>
            </Box>
          </Box>
        </Box>

        {/* Active section badge */}
        <Box sx={{ mx: 2.5, mb: 1.5, px: 2, py: 1.25, bgcolor: alpha(P, 0.06), borderRadius: 1.5, border: `1px solid ${alpha(P, 0.16)}`, flexShrink: 0 }}>
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.56rem', color: alpha(P, 0.45), textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.3 }}>Active Filter</Typography>
          <Typography sx={{ fontWeight: 900, fontSize: '0.8rem', color: P }}>{activeSection === 'all' ? 'All Pages' : activeSection}</Typography>
        </Box>

        {/* Nav */}
        <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.56rem', fontWeight: 700, color: alpha(P, 0.32), letterSpacing: '0.14em', textTransform: 'uppercase', px: 3, pb: 0.75, pt: 0.5 }}>Filter by Section</Typography>
        <Box sx={{ flex: 1 }}>
          {NAV.map(({ key, label, icon: Icon }) => {
            const active = activeSection === key;
            const count = key === 'all' ? pages.length : pages.filter(p => p.page_description === key).length;
            return (
              <Box key={key} onClick={() => setActiveSection(key)} sx={{ display: 'flex', alignItems: 'center', gap: 1.75, px: 3, py: 1.25, cursor: 'pointer', borderLeft: active ? `3px solid ${P}` : '3px solid transparent', bgcolor: active ? alpha(P, 0.09) : 'transparent', transition: 'all 0.14s ease', '&:hover': { bgcolor: active ? alpha(P, 0.09) : alpha(P, 0.04) } }}>
                <Icon sx={{ fontSize: 15, color: active ? P : alpha(P, 0.35), flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.84rem', fontWeight: active ? 700 : 500, color: active ? P : MUTED, flex: 1 }}>{label}</Typography>
                {count > 0 && <Box sx={{ px: 1, py: 0.1, bgcolor: active ? alpha(P, 0.15) : alpha(P, 0.07), borderRadius: '20px' }}><Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', fontWeight: 900, color: active ? P : MUTED }}>{count}</Typography></Box>}
                {active && <KeyboardArrowRight sx={{ fontSize: 13, color: alpha(P, 0.4) }} />}
              </Box>
            );
          })}
        </Box>

        {/* Footer */}
        <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${alpha(P, 0.08)}`, flexShrink: 0, bgcolor: alpha(P, 0.013) }}>
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: alpha(P, 0.4) }}>Page Management · HRIS System</Typography>
        </Box>
      </Box>

      {/* ══ ADD DIALOG ══ */}
      <Dialog open={addDialog} onClose={cancelAdd} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, bgcolor: '#f7f8fa', overflow: 'hidden' } }}>
        <Box sx={{ px: 3, py: 2.5, background: `linear-gradient(135deg, ${P} 0%, ${S} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 38, height: 38 }}><Add sx={{ fontSize: 18, color: '#fff' }} /></Avatar>
            <Typography sx={{ fontWeight: 900, fontSize: '0.95rem', color: '#fff' }}>Add New Page</Typography>
          </Box>
          <IconButton onClick={cancelAdd} sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } }}><Cancel sx={{ fontSize: 17 }} /></IconButton>
        </Box>
        <Box sx={{ px: 4, py: 3, overflowY: 'auto', maxHeight: '65vh' }}>{renderFormFields()}</Box>
        <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${BD}`, display: 'flex', justifyContent: 'flex-end', gap: 1.25, bgcolor: PANEL, boxShadow: '0 -2px 8px rgba(0,0,0,0.05)' }}>
          <Btn outline onClick={cancelAdd}>Cancel</Btn>
          <Btn onClick={handleSubmit} disabled={loading} startIcon={loading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <Save sx={{ fontSize: 15 }} />}>{loading ? 'Creating…' : 'Create Page'}</Btn>
        </Box>
      </Dialog>

      {/* ══ EDIT DIALOG ══ */}
      <Dialog open={editDialog} onClose={cancelEdit} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, bgcolor: '#f7f8fa', overflow: 'hidden' } }}>
        <Box sx={{ px: 3, py: 2.5, background: `linear-gradient(135deg, ${P} 0%, ${S} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 38, height: 38 }}><Edit sx={{ fontSize: 18, color: '#fff' }} /></Avatar>
            <Typography sx={{ fontWeight: 900, fontSize: '0.95rem', color: '#fff' }}>Edit Page</Typography>
          </Box>
          <IconButton onClick={cancelEdit} sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } }}><Cancel sx={{ fontSize: 17 }} /></IconButton>
        </Box>
        <Box sx={{ px: 4, py: 3, overflowY: 'auto', maxHeight: '65vh' }}>{renderFormFields()}</Box>
        <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${BD}`, display: 'flex', justifyContent: 'flex-end', gap: 1.25, bgcolor: PANEL, boxShadow: '0 -2px 8px rgba(0,0,0,0.05)' }}>
          <Btn outline onClick={cancelEdit}>Cancel</Btn>
          <Btn onClick={handleSubmit} disabled={loading} startIcon={loading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <Save sx={{ fontSize: 15 }} />}>{loading ? 'Updating…' : 'Update Page'}</Btn>
        </Box>
      </Dialog>

      {/* ══ DELETE DIALOG ══ */}
      <Dialog open={deleteDialog} onClose={() => { setDeleteDialog(false); setDeleteConfirmed(false); }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, bgcolor: '#f7f8fa', overflow: 'hidden' } }}>
        <Box sx={{ px: 3, py: 2.5, background: `linear-gradient(135deg, ${P} 0%, ${S} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 38, height: 38 }}><Warning sx={{ fontSize: 18, color: '#fff' }} /></Avatar>
            <Box>
              <Typography sx={{ fontWeight: 900, fontSize: '0.95rem', color: '#fff' }}>Confirm Deletion</Typography>
              <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>This action requires confirmation</Typography>
            </Box>
          </Box>
          <IconButton onClick={() => { setDeleteDialog(false); setDeleteConfirmed(false); }} sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } }}><Cancel sx={{ fontSize: 17 }} /></IconButton>
        </Box>

        <Box sx={{ px: 4, py: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', mb: 3 }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: alpha('#b91c1c', 0.08), border: `2px solid ${alpha('#b91c1c', 0.15)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5 }}>
              <Delete sx={{ fontSize: 30, color: '#b91c1c' }} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: TXT, mb: 1 }}>Are you sure you want to delete this page?</Typography>
            <Typography sx={{ fontSize: '0.82rem', color: MUTED, lineHeight: 1.65 }}>This action cannot be undone. Deleting this page will permanently remove it and revoke all associated user access permissions.</Typography>
          </Box>
          <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: alpha(P, 0.04), border: `2px solid ${deleteConfirmed ? P : alpha(P, 0.15)}`, transition: 'all 0.2s ease' }}>
            <FormControlLabel
              control={<Checkbox checked={deleteConfirmed} onChange={e => setDeleteConfirmed(e.target.checked)} sx={{ color: P, '&.Mui-checked': { color: P } }} />}
              label={<Typography sx={{ fontSize: '0.875rem', fontWeight: deleteConfirmed ? 700 : 500, color: TXT }}>I understand this action cannot be undone</Typography>}
            />
          </Box>
        </Box>

        <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${BD}`, display: 'flex', gap: 1.25, bgcolor: PANEL }}>
          <Btn outline fullWidth onClick={() => { setDeleteDialog(false); setDeleteConfirmed(false); }}>Cancel</Btn>
          <Btn danger fullWidth disabled={loading || !deleteConfirmed}
            startIcon={loading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <Delete sx={{ fontSize: 14 }} />}>
            {loading ? 'Deleting…' : 'Delete Page'}
          </Btn>
        </Box>
      </Dialog>
    </Box>
  );
};

export default PagesList;