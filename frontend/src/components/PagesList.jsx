import API_BASE_URL from '../apiConfig';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SuccessfulOverlay from './SuccessfulOverlay';
import {
  Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Box, Alert, TextField, Grid,
  IconButton, Dialog, DialogContent, DialogActions,
  CircularProgress, Tooltip, Avatar, Backdrop,
  alpha, TablePagination, MenuItem, FormControl, Select,
  Checkbox, FormControlLabel, Portal, Card,
  InputAdornment,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Add, Edit, Delete, Save, Cancel, Group, Description, Warning,
  CheckCircle, Person, FilterList, Refresh, SupervisorAccount,
  AdminPanelSettings, Work, Info, Category, Assignment, Assessment,
  Payment, Folder, FolderSpecial, EventNote, Search,
  KeyboardArrowRight, Pages as PagesIcon, Lock, Close,
} from '@mui/icons-material';
import AccessDenied from './AccessDenied';
import axios from 'axios';
import { getComponentInfo } from '../utils/componentMapping';

/* ─────────────────────────────────────────────────────────────────
   GLOBAL CSS
───────────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes shimmer {
    0%   { background-position: -800px 0; }
    100% { background-position:  800px 0; }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.55; }
  }
  * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
  html, body, #root { height: 100%; overflow: hidden; }
`;

/* ─────────────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────────────── */
const T = {
  accent:       '#6d2323',
  accentDark:   '#5a1d1d',
  accentMid:    '#8B4545',
  accentFaint:  'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover:  'rgba(109,35,35,0.10)',
  headerGrad:   'linear-gradient(180deg,#6d2323 0%,#7e2c2c 100%)',
  rowEven:      '#ffffff',
  rowOdd:       'rgba(109,35,35,0.025)',
  rowHover:     'rgba(109,35,35,0.055)',
  text:         '#1a1a1a',
  muted:        '#6b6b6b',
  faint:        '#a0a0a0',
  surface:      '#ffffff',
  divider:      'rgba(0,0,0,0.08)',
};

const BD        = T.accentBorder;
const TXT       = T.text;
const MUTED     = T.muted;
const SUBTLE    = 'rgba(109,35,35,0.03)';
const SIDEBAR_W = 280;

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
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    const payload = JSON.parse(jsonPayload);
    return payload.role || payload.userRole || null;
  } catch { return null; }
};

/* ─────────────────────────────────────────────────────────────────
   STYLED PRIMITIVES
───────────────────────────────────────────────────────────────── */
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: `0.5px solid ${T.accentBorder}`,
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

const Btn = ({ children, danger, outline, sm, fullWidth, startIcon, ...p }) => (
  <AccentButton
    disableElevation
    fullWidth={fullWidth}
    variant={outline ? 'outlined' : 'contained'}
    size={sm ? 'small' : 'medium'}
    startIcon={startIcon}
    sx={{
      fontSize: sm ? '0.78rem' : '0.85rem',
      py: sm ? 0.5 : 0.75,
      px: sm ? 1.5 : 2.25,
      boxShadow: 'none',
      ...(outline
        ? { borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }
        : danger
          ? { bgcolor: '#c62828', color: '#fff', '&:hover': { bgcolor: '#b71c1c' }, '&:disabled': { bgcolor: '#f1f5f9', color: '#94a3b8' } }
          : { bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark, boxShadow: `0 4px 16px ${alpha(T.accent, 0.38)}` }, '&:disabled': { bgcolor: '#d0d0d0 !important', color: '#888 !important', boxShadow: 'none !important', transform: 'none !important' } }),
    }}
    {...p}
  >
    {children}
  </AccentButton>
);

const DlgHeader = ({ icon: Icon, title, onClose }) => (
  <Box sx={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    px: 3.5, py: 2.5, background: T.headerGrad,
    position: 'relative', overflow: 'hidden',
  }}>
    <Box sx={{ position: 'absolute', top: -50, right: -30, width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
      <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon sx={{ fontSize: 16, color: '#fff' }} />
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: '0.93rem', color: '#fff' }}>{title}</Typography>
    </Box>
    <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.75)', p: 0.5, position: 'relative', zIndex: 1, '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.12)' } }}>
      <Close sx={{ fontSize: 16 }} />
    </IconButton>
  </Box>
);

const FL = ({ children, req }) => (
  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.accent, mb: 0.75, display: 'block' }}>
    {children}{req && <Box component="span" sx={{ color: '#c62828', ml: 0.25 }}>*</Box>}
  </Typography>
);

const selectSx = {
  borderRadius: '8px', fontSize: '0.875rem', bgcolor: '#fff',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accent },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.accent, borderWidth: '1.5px' },
};

/* ─────────────────────────────────────────────────────────────────
   NAV SECTIONS
───────────────────────────────────────────────────────────────── */
const NAV = [
  { key: 'all',                      label: 'All Pages',          icon: PagesIcon },
  { key: 'General',                  label: 'General',            icon: Category },
  { key: 'System Administration',    label: 'System Admin',       icon: AdminPanelSettings },
  { key: 'Registration',             label: 'Registration',       icon: Assignment },
  { key: 'Information Management',   label: 'Info Management',    icon: Info },
  { key: 'Attendance Management',    label: 'Attendance Mgmt',    icon: Assessment },
  { key: 'Payroll Management',       label: 'Payroll Mgmt',       icon: Payment },
  { key: 'Leave Management',         label: 'Leave Mgmt',         icon: EventNote },
  { key: 'Form',                     label: 'Forms',              icon: Description },
  { key: 'Pages Management',         label: 'Pages Mgmt',         icon: FolderSpecial },
  { key: 'Personal Data Sheets',     label: 'Personal Data',      icon: Folder },
];

const descriptionOptions = [
  'General', 'System Administration', 'Registration', 'Information Management',
  'Attendance Management', 'Payroll Management', 'Leave Management',
  'Form', 'Pages Management', 'Personal Data Sheets',
];

const accessGroupOptions = ['superadmin', 'administrator', 'technical', 'staff'];

/* ─────────────────────────────────────────────────────────────────
   BADGE HELPERS
───────────────────────────────────────────────────────────────── */
const getGroupColor = (group) => {
  switch (group?.toLowerCase()) {
    case 'superadmin':    return T.accent;
    case 'administrator': return T.accentMid;
    case 'technical':     return '#2563eb';
    case 'staff':         return '#047857';
    default:              return MUTED;
  }
};

const getDescriptionBadge = (desc) => {
  const map = {
    'general':                { icon: <Category sx={{ fontSize: 11 }} />,           color: T.accent },
    'system administration':  { icon: <AdminPanelSettings sx={{ fontSize: 11 }} />, color: T.accent },
    'registration':           { icon: <Assignment sx={{ fontSize: 11 }} />,          color: T.accentMid },
    'information management': { icon: <Info sx={{ fontSize: 11 }} />,                color: T.accent },
    'attendance management':  { icon: <Assessment sx={{ fontSize: 11 }} />,          color: T.accent },
    'payroll management':     { icon: <Payment sx={{ fontSize: 11 }} />,             color: T.accentMid },
    'leave management':       { icon: <EventNote sx={{ fontSize: 11 }} />,           color: T.accent },
    'form':                   { icon: <Description sx={{ fontSize: 11 }} />,         color: T.accent },
    'pages management':       { icon: <FolderSpecial sx={{ fontSize: 11 }} />,       color: T.accent },
    'personal data sheets':   { icon: <Folder sx={{ fontSize: 11 }} />,             color: T.accentMid },
  };
  return map[desc?.toLowerCase()] || { icon: <Description sx={{ fontSize: 11 }} />, color: MUTED };
};

/* ─────────────────────────────────────────────────────────────────
   SKELETON
───────────────────────────────────────────────────────────────── */
const Bone = ({ w = '100%', h = 14, r = 6, sx = {} }) => (
  <Box sx={{
    width: w, height: h, borderRadius: r, flexShrink: 0,
    background: `linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)`,
    backgroundSize: '800px 100%',
    animation: 'shimmer 1.6s infinite linear',
    ...sx,
  }} />
);

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────── */
const PagesList = () => {
  const [pages, setPages]                     = useState([]);
  const [filteredPages, setFilteredPages]     = useState([]);
  const [activeSection, setActiveSection]     = useState('all');
  const [currentPageId, setCurrentPageId]     = useState(null);
  const [pageDescription, setPageDescription] = useState('');
  const [pageGroups, setPageGroups]           = useState([]);
  const [pageName, setPageName]               = useState('');
  const [pageUrl, setPageUrl]                 = useState('');
  const [componentIdentifier, setComponentIdentifier] = useState('');
  const [loading, setLoading]                 = useState(false);
  const [initialLoading, setInitialLoading]   = useState(true);
  const [deleteDialog, setDeleteDialog]       = useState(false);
  const [deletePageId, setDeletePageId]       = useState(null);
  const [editDialog, setEditDialog]           = useState(false);
  const [successOpen, setSuccessOpen]         = useState(false);
  const [successAction, setSuccessAction]     = useState('');
  const [errorMessage, setErrorMessage]       = useState('');
  const [searchTerm, setSearchTerm]           = useState('');
  const [page, setPage]                       = useState(0);
  const [rowsPerPage, setRowsPerPage]         = useState(10);
  const [addDialog, setAddDialog]             = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [userRole, setUserRole]               = useState(null);
  const [roleChecked, setRoleChecked]         = useState(false);
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
      if (res.ok) {
        const data = await res.json();
        const sorted = data.sort((a, b) => a.id - b.id);
        setPages(sorted); setFilteredPages(sorted);
      } else {
        const err = await res.json(); setErrorMessage(err.error || 'Failed to fetch pages');
      }
    } catch { setErrorMessage('Error fetching pages'); }
    finally { setLoading(false); setInitialLoading(false); }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!pageName.trim() || !pageDescription.trim() || pageGroups.length === 0) {
      setErrorMessage('Page name, description, and at least one access group are required'); return;
    }
    setLoading(true); setErrorMessage('');
    const pageData = {
      page_name: pageName.trim(), page_description: pageDescription.trim(),
      page_url: pageUrl.trim() || null, page_group: pageGroups.join(','),
      component_identifier: componentIdentifier.trim() || null,
    };
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

  const resetForm = () => {
    setCurrentPageId(null); setPageName(''); setPageDescription('');
    setPageUrl(''); setComponentIdentifier(''); setPageGroups([]);
  };
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

  /* ── Form fields (shared Add / Edit) ── */
  const renderFormFields = () => (
    <Box>
      <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: alpha(T.accent, 0.45), mb: 2 }}>Page Details</Typography>
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <FL req>Page Name</FL>
          <FieldInput fullWidth size="small" value={pageName} onChange={e => setPageName(e.target.value)} placeholder="e.g., dashboard, users, reports" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FL req>Page Description</FL>
          <FormControl fullWidth size="small">
            <Select value={pageDescription} onChange={e => setPageDescription(e.target.value)} sx={selectSx} displayEmpty>
              <MenuItem value=""><em style={{ color: '#9ca3af' }}>— Select —</em></MenuItem>
              {descriptionOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FL>Page URL</FL>
          <FieldInput fullWidth size="small" value={pageUrl} onChange={e => setPageUrl(e.target.value)} placeholder="e.g., /dashboard, /users" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FL>Component Identifier</FL>
          <FieldInput fullWidth size="small" value={componentIdentifier} onChange={e => setComponentIdentifier(e.target.value)}
            placeholder="e.g., pds1, registration"
            InputProps={{
              endAdornment: componentIdentifier
                ? (getComponentInfo(componentIdentifier)
                  ? <CheckCircle sx={{ color: '#16a34a', fontSize: 16 }} />
                  : <Warning sx={{ color: '#d97706', fontSize: 16 }} />)
                : null,
            }}
          />
          <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', color: MUTED, mt: 0.5 }}>
            {componentIdentifier && getComponentInfo(componentIdentifier)
              ? `✓ Connected: ${getComponentInfo(componentIdentifier).componentName}`
              : componentIdentifier ? '⚠ No mapping found'
              : 'Optional unique identifier for dynamic access'}
          </Typography>
        </Grid>
      </Grid>

      <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: alpha(T.accent, 0.45), mt: 3, mb: 2 }}>Access Groups</Typography>
      <FL req>Roles that receive this page on Grant</FL>
      <FormControl fullWidth size="small">
        <Select multiple value={pageGroups} onChange={e => setPageGroups(e.target.value)} sx={selectSx}
          renderValue={selected => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map(v => (
                <Box key={v} sx={{ px: 1.25, py: 0.2, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${alpha(T.accent, 0.2)}`, borderRadius: '20px' }}>
                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.accent }}>{v.toUpperCase()}</Typography>
                </Box>
              ))}
            </Box>
          )}
        >
          {accessGroupOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
        </Select>
      </FormControl>
      <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', color: MUTED, mt: 0.75 }}>
        Roles selected here will receive this page when "Grant Role Access" is triggered in User Management.
      </Typography>
    </Box>
  );

  /* ─────────────────────────────────────────────────────────────
     GUARDS
  ───────────────────────────────────────────────────────────── */
  if (!roleChecked || initialLoading) return (
    <Box sx={{ minHeight: '100vh' }}>
      <style>{GLOBAL_CSS}</style>
      <Box sx={{ width: SIDEBAR_W, bgcolor: '#fff', borderLeft: `1px solid ${BD}`, position: 'fixed', right: 0, top: 0, height: '100vh', zIndex: 1200, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', gap: 2, animation: 'blink 2s ease-in-out infinite' }}>
          <Box sx={{ width: 30, height: 30, borderRadius: 1, bgcolor: alpha(T.accent, 0.12), flexShrink: 0 }} />
          <Box sx={{ flex: 1 }}><Bone w="55%" h={11} r={4} sx={{ mb: 0.5 }} /><Bone w="38%" h={8} r={3} /></Box>
        </Box>
        {[60, 48, 70, 42, 55, 38, 65, 50].map((w, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 1.25, animation: `blink 2s ease-in-out ${i * 0.07}s infinite` }}>
            <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: alpha(T.accent, 0.07), flexShrink: 0 }} />
            <Bone w={`${w}%`} h={10} r={3} />
          </Box>
        ))}
      </Box>
      <Box sx={{
        width: '100vw', maxWidth: '100%',
        position: 'relative', left: '63%', transform: 'translateX(-61%)',
        boxSizing: 'border-box',
        pl: { xs: 2, sm: 3, md: 6 },
        pr: { xs: `${SIDEBAR_W + 16}px`, md: `${SIDEBAR_W + 24}px` },
        py: { xs: 2, md: 4 },
      }}>
        <Box sx={{ mb: 2, borderRadius: 3, overflow: 'hidden', border: `1px solid ${BD}`, animation: 'blink 2s ease-in-out infinite' }}>
          <Box sx={{ p: 3.5, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', gap: 2.5 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: alpha(T.accent, 0.12), flexShrink: 0 }} />
            <Box><Bone w={200} h={18} sx={{ mb: 1 }} /><Bone w={340} h={11} /></Box>
          </Box>
        </Box>
        <Box sx={{ borderRadius: 3, border: `1px solid ${BD}`, bgcolor: '#fff', overflow: 'hidden', animation: 'blink 2s ease-in-out 0.12s infinite' }}>
          <Box sx={{ p: 3.5 }}>{[0,1,2,3,4].map(i => <Box key={i} sx={{ height: 48, borderRadius: 1, bgcolor: i % 2 === 0 ? SUBTLE : 'transparent', mb: 1, border: `1px solid ${BD}` }} />)}</Box>
        </Box>
      </Box>
    </Box>
  );

  if (!isSuperAdmin) return (
    <AccessDenied title="Access Required" message="Page Management is restricted to Technical users only." returnPath="/users-list" returnButtonText="Return to User Management" />
  );

  /* ─────────────────────────────────────────────────────────────
     MAIN RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    <Box sx={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
      <style>{GLOBAL_CSS}</style>

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

      {/* ══ MAIN CONTENT ══ */}
      <Box sx={{
        width: '100vw', maxWidth: '100%',
        position: 'relative', left: '65%', transform: 'translateX(-67%)',
        boxSizing: 'border-box',
        pl: { xs: 2, sm: 3, md: 6 },
        pr: { xs: `${SIDEBAR_W + 16}px`, md: `${SIDEBAR_W - 65}px` },
        py: { xs: 2, md: 2 },
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 143px)',
        overflow: 'hidden',
      }}>

        {/* ── Hero with action buttons ── */}
        <SectionCard sx={{ mb: 1.5, flexShrink: 0, overflow: 'hidden' }}>
          <Box sx={{
            px: 4, py: 1.5, // ← reduced from 2.5 to recover vertical space
            background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'relative', overflow: 'hidden',
          }}>
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.1) 0%,transparent 70%)' }} />
            <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)' }} />

            {/* Left: icon + title */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, position: 'relative', zIndex: 1 }}>
              <PagesIcon sx={{ fontSize: 28, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.2 }}>
                  Page Management
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', color: T.accentMid, fontWeight: 600, opacity: 0.9 }}>
                  Access Groups control which roles receive pages on Grant
                </Typography>
              </Box>
            </Box>

            {/* Right: stats pill + action buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, position: 'relative', zIndex: 1 }}>
              {/* Stats pill */}
              <Box sx={{ px: 2, py: 0.6, borderRadius: 6, bgcolor: alpha(T.accent, 0.09), border: `1px solid ${alpha(T.accent, 0.18)}` }}>
                <Typography sx={{ fontSize: '0.78rem', color: T.accent, fontWeight: 700 }}>
                  {searchTerm
                    ? `${filteredPages.length} / ${pages.length} pages`
                    : `${filteredPages.length} page${filteredPages.length !== 1 ? 's' : ''}`}
                </Typography>
              </Box>

              {/* Refresh */}
              <Tooltip title="Refresh pages">
                <IconButton
                  onClick={() => fetchPages()}
                  disabled={loading}
                  size="small"
                  sx={{
                    width: 34, height: 34,
                    bgcolor: alpha(T.accent, 0.08),
                    border: `1px solid ${alpha(T.accent, 0.18)}`,
                    borderRadius: 1.5, color: T.accent,
                    '&:hover': { bgcolor: alpha(T.accent, 0.14) },
                  }}
                >
                  {loading
                    ? <CircularProgress size={14} sx={{ color: T.accent }} />
                    : <Refresh sx={{ fontSize: 16 }} />}
                </IconButton>
              </Tooltip>

              {/* User Access */}
              <AccentButton
                size="small"
                variant="contained"
                startIcon={<Group sx={{ fontSize: 14 }} />}
                onClick={() => navigate('/users-list')}
                 sx={{
                  fontSize: '0.78rem',
                  bgcolor: T.accent, color: '#fff',
                  boxShadow: `0 2px 8px ${alpha(T.accent, 0.3)}`,
                  '&:hover': { bgcolor: T.accentDark },
                }}
              >
                User Access
              </AccentButton>

              {/* Add Page */}
              <AccentButton
                size="small"
                variant="contained"
                startIcon={<Add sx={{ fontSize: 14 }} />}
                onClick={() => setAddDialog(true)}
                sx={{
                  fontSize: '0.78rem',
                  bgcolor: T.accent, color: '#fff',
                  boxShadow: `0 2px 8px ${alpha(T.accent, 0.3)}`,
                  '&:hover': { bgcolor: T.accentDark },
                }}
              >
                Add Page
              </AccentButton>
            </Box>
          </Box>
        </SectionCard>

        {/* ── Records Card (fills remaining height, table scrolls inside) ── */}
        <SectionCard sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Search row */}
          <Box sx={{ px: 3, py: 1, borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', gap: 2, bgcolor: SUBTLE, flexShrink: 0 }}>
            <Search sx={{ color: alpha(T.accent, 0.4), fontSize: 17, flexShrink: 0 }} />
            <FieldInput
              fullWidth size="small"
              placeholder="Search by name, description, URL, or ID…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
            />
          </Box>

          {/* Scrollable table area — fills card, scrolls when rows overflow */}
          <Box sx={{ flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'auto' }}>
            {loading && !pages.length ? (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <Box sx={{ width: 32, height: 32, border: `2px solid ${alpha(T.accent, 0.15)}`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.7s linear infinite', mx: 'auto', mb: 2 }} />
                <Typography sx={{ color: MUTED, fontWeight: 500, fontSize: '0.84rem' }}>Loading pages…</Typography>
              </Box>
            ) : (
              <Table sx={{ minWidth: 860 }} stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {['ID', 'Page Name', 'Section', 'URL', 'Component', 'Access Groups', 'Actions'].map((h, i) => (
                      <TableCell key={h} sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '0.6rem', fontWeight: 700,
                        color: alpha(T.accent, 0.5),
                        textTransform: 'uppercase', letterSpacing: '0.1em',
                        borderBottom: `2px solid ${alpha(T.accent, 0.12)}`,
                        bgcolor: '#fafafa',
                        py: 0.75, px: 2, whiteSpace: 'nowrap',
                        textAlign: i === 6 ? 'center' : 'left',
                      }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedPages.length > 0 ? paginatedPages.map((pg) => {
                    const badge = getDescriptionBadge(pg.page_description);
                    return (
                      <TableRow key={pg.id} sx={{
                        '&:nth-of-type(even)': { bgcolor: T.rowOdd },
                        '&:hover': { bgcolor: T.rowHover },
                        transition: 'background-color 0.12s ease',
                        borderBottom: `1px solid ${alpha(T.accent, 0.06)}`,
                        height: `calc((100vh - 390px) / ${paginatedPages.length})`,
                      }}>
                        {/* ID */}
                        <TableCell sx={{ px: 2, py: 1.15 }}>
                          <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: alpha(T.accent, 0.45), fontWeight: 600 }}>#{pg.id}</Typography>
                        </TableCell>
                        {/* Page Name */}
                        <TableCell sx={{ px: 2, py: 1.15 }}>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.82rem', color: TXT }}>{pg.page_name}</Typography>
                        </TableCell>
                        {/* Section */}
                        <TableCell sx={{ px: 2, py: 1.15 }}>
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, px: 1.25, py: 0.2, bgcolor: alpha(badge.color, 0.07), border: `1px solid ${alpha(badge.color, 0.18)}`, borderRadius: '20px' }}>
                            <Box sx={{ color: badge.color }}>{badge.icon}</Box>
                            <Typography sx={{ fontSize: '0.66rem', fontWeight: 600, color: badge.color, whiteSpace: 'nowrap' }}>{pg.page_description}</Typography>
                          </Box>
                        </TableCell>
                        {/* URL */}
                        <TableCell sx={{ px: 2, py: 1.15 }}>
                          <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: MUTED, bgcolor: SUBTLE, px: 0.75, py: 0.15, borderRadius: 1, display: 'inline-block', border: `1px solid ${BD}` }}>
                            {pg.page_url || 'N/A'}
                          </Typography>
                        </TableCell>
                        {/* Component */}
                        <TableCell sx={{ px: 2, py: 1.15 }}>
                          {pg.component_identifier ? (
                            <Tooltip title={getComponentInfo(pg.component_identifier) ? `${getComponentInfo(pg.component_identifier).componentName} · ${getComponentInfo(pg.component_identifier).routePath}` : 'No component mapping found'} arrow>
                              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, px: 1.1, py: 0.15, bgcolor: getComponentInfo(pg.component_identifier) ? alpha('#16a34a', 0.07) : alpha('#d97706', 0.07), border: `1px solid ${getComponentInfo(pg.component_identifier) ? alpha('#16a34a', 0.22) : alpha('#d97706', 0.22)}`, borderRadius: '20px', cursor: 'help' }}>
                                {getComponentInfo(pg.component_identifier)
                                  ? <CheckCircle sx={{ fontSize: 10, color: '#16a34a' }} />
                                  : <Warning sx={{ fontSize: 10, color: '#d97706' }} />}
                                <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.66rem', fontWeight: 600, color: getComponentInfo(pg.component_identifier) ? '#16a34a' : '#d97706' }}>{pg.component_identifier}</Typography>
                              </Box>
                            </Tooltip>
                          ) : (
                            <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.66rem', color: alpha(MUTED, 0.5), fontStyle: 'italic' }}>—</Typography>
                          )}
                        </TableCell>
                        {/* Access Groups */}
                        <TableCell sx={{ px: 2, py: 1.15, maxWidth: 200 }}>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                            {pg.page_group ? pg.page_group.split(',').map((g, i) => {
                              const gc = getGroupColor(g.trim());
                              return (
                                <Box key={i} sx={{ px: 1.1, py: 0.05, border: `1px solid ${alpha(gc, 0.28)}`, borderRadius: '20px', bgcolor: alpha(gc, 0.05) }}>
                                  <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: gc }}>{g.trim().toUpperCase()}</Typography>
                                </Box>
                              );
                            }) : <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.63rem', color: alpha(MUTED, 0.5), fontStyle: 'italic' }}>none</Typography>}
                          </Box>
                        </TableCell>
                        {/* Actions */}
                        <TableCell sx={{ px: 2, py: 1.15, textAlign: 'center' }}>
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <Tooltip title="Edit">
                              <IconButton onClick={() => handleEdit(pg)} size="small" sx={{ width: 26, height: 26, border: `1px solid ${alpha(T.accent, 0.18)}`, borderRadius: 1.5, color: T.accent, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent } }}>
                                <Edit sx={{ fontSize: 11 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton onClick={() => handleDeleteConfirm(pg.id)} size="small" sx={{ width: 26, height: 26, border: `1px solid ${alpha('#c62828', 0.18)}`, borderRadius: 1.5, color: '#c62828', '&:hover': { bgcolor: 'rgba(198,40,40,0.05)', borderColor: '#c62828' } }}>
                                <Delete sx={{ fontSize: 11 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', py: 8 }}>
                        <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                          <PagesIcon sx={{ fontSize: 30, color: alpha(T.accent, 0.3) }} />
                        </Box>
                        <Typography sx={{ fontWeight: 600, color: alpha(T.accent, 0.5), fontSize: '0.9rem', mb: 0.4 }}>No Pages Found</Typography>
                        <Typography sx={{ color: MUTED, fontSize: '0.8rem' }}>{searchTerm ? 'Try adjusting your search' : 'No pages registered yet'}</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Box>

          {/* Pagination pinned at bottom of card */}
          {filteredPages.length > 0 && (
            <Box sx={{ px: 3, py: 0, borderTop: `1px solid ${BD}`, display: 'flex', justifyContent: 'flex-end', bgcolor: '#fafafa', flexShrink: 0 }}>
              <TablePagination
                component="div"
                count={filteredPages.length}
                page={page}
                onPageChange={(_, np) => setPage(np)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[5, 10, 25, 50]}
                sx={{
                  '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                    fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: MUTED,
                  },
                  '& .MuiTablePagination-toolbar': { minHeight: 36, py: 0 }, // ← compact toolbar
                }}
              />
            </Box>
          )}
        </SectionCard>
      </Box>

      {/* ══ RIGHT SIDEBAR ══ */}
      <Box sx={{
        width: SIDEBAR_W, bgcolor: '#fff',
        borderLeft: `1px solid ${BD}`,
        display: 'flex', flexDirection: 'column',
        position: 'fixed', right: 0, top: 0, height: '100vh',
        overflowY: 'auto', zIndex: 1200,
      }}>
        {/* Header */}
        <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <Box sx={{ width: 30, height: 30, bgcolor: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1, flexShrink: 0 }}>
            <PagesIcon sx={{ fontSize: 16, color: '#fff' }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: TXT, lineHeight: 1.2 }}>Page Management</Typography>
            <Typography sx={{ fontSize: '0.62rem', color: MUTED, letterSpacing: '0.03em' }}>System Configuration</Typography>
          </Box>
        </Box>

        {/* Stats */}
        <Box sx={{ mx: 2.5, my: 2, p: 2, bgcolor: T.accentFaint, borderRadius: 2, border: `1px solid ${BD}`, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            {[
              { label: 'Total',    value: pages.length },
              { label: 'Filtered', value: filteredPages.length },
              { label: 'Sections', value: descriptionOptions.length },
            ].map(({ label, value }) => (
              <Box key={label} sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontWeight: 900, fontSize: '1.3rem', color: T.accent, lineHeight: 1 }}>{value}</Typography>
                <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.57rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Active filter badge */}
        <Box sx={{ mx: 2.5, mb: 1.5, px: 2, py: 1.25, bgcolor: T.accentFaint, borderRadius: 1.5, border: `1px solid ${BD}`, flexShrink: 0 }}>
          <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.56rem', color: alpha(T.accent, 0.45), textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.3 }}>Active Filter</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: T.accent }}>{activeSection === 'all' ? 'All Pages' : activeSection}</Typography>
        </Box>

        {/* Nav */}
        <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.56rem', fontWeight: 700, color: alpha(T.accent, 0.32), letterSpacing: '0.14em', textTransform: 'uppercase', px: 3, pb: 0.75, pt: 0.5 }}>
          Filter by Section
        </Typography>
        <Box sx={{ flex: 1 }}>
          {NAV.map(({ key, label, icon: Icon }) => {
            const active = activeSection === key;
            const count = key === 'all' ? pages.length : pages.filter(p => p.page_description === key).length;
            return (
              <Box key={key} onClick={() => setActiveSection(key)} sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                px: 3, py: 1.15, cursor: 'pointer', mx: 1,
                borderRadius: '0 6px 6px 0',
                bgcolor: active ? alpha(T.accent, 0.07) : 'transparent',
                transition: 'all 0.12s ease',
                '&:hover': { bgcolor: active ? alpha(T.accent, 0.07) : alpha(T.accent, 0.03) },
              }}>
                <Icon sx={{ fontSize: 15, color: active ? T.accent : MUTED, flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.84rem', fontWeight: active ? 600 : 400, color: active ? TXT : MUTED, flex: 1 }}>{label}</Typography>
                {count > 0 && (
                  <Box sx={{ px: 1, py: 0.1, bgcolor: active ? alpha(T.accent, 0.12) : alpha(T.accent, 0.06), borderRadius: '20px' }}>
                    <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', fontWeight: 700, color: active ? T.accent : MUTED }}>{count}</Typography>
                  </Box>
                )}
                {active && <KeyboardArrowRight sx={{ fontSize: 13, color: alpha(T.accent, 0.4) }} />}
              </Box>
            );
          })}
        </Box>

        {/* Footer */}
        <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${BD}`, flexShrink: 0 }}>
          <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: alpha(T.accent, 0.4) }}>Page Management · HRIS System</Typography>
        </Box>
      </Box>

      {/* ══ ADD DIALOG ══ */}
      <Dialog open={addDialog} onClose={cancelAdd} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <DlgHeader icon={Add} title="Add New Page" onClose={cancelAdd} />
        <DialogContent sx={{ pt: 3, px: 3.5, overflowY: 'auto', maxHeight: '65vh' }}>
          {renderFormFields()}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${BD}`, gap: 1, bgcolor: '#f9f9f9' }}>
          <Btn outline onClick={cancelAdd}>Cancel</Btn>
          <Btn onClick={handleSubmit} disabled={loading} startIcon={loading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <Save sx={{ fontSize: 15 }} />}>
            {loading ? 'Creating…' : 'Create Page'}
          </Btn>
        </DialogActions>
      </Dialog>

      {/* ══ EDIT DIALOG ══ */}
      <Dialog open={editDialog} onClose={cancelEdit} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <DlgHeader icon={Edit} title="Edit Page" onClose={cancelEdit} />
        <DialogContent sx={{ pt: 3, px: 3.5, overflowY: 'auto', maxHeight: '65vh' }}>
          {renderFormFields()}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${BD}`, gap: 1, bgcolor: '#f9f9f9' }}>
          <Btn outline onClick={cancelEdit}>Cancel</Btn>
          <Btn onClick={handleSubmit} disabled={loading} startIcon={loading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <Save sx={{ fontSize: 15 }} />}>
            {loading ? 'Updating…' : 'Update Page'}
          </Btn>
        </DialogActions>
      </Dialog>

      {/* ══ DELETE DIALOG ══ */}
      <Dialog open={deleteDialog} onClose={() => { setDeleteDialog(false); setDeleteConfirmed(false); }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <DlgHeader icon={Warning} title="Confirm Deletion" onClose={() => { setDeleteDialog(false); setDeleteConfirmed(false); }} />
        <DialogContent sx={{ pt: 3, px: 3.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', mb: 3 }}>
            <Box sx={{ width: 60, height: 60, borderRadius: '50%', bgcolor: 'rgba(198,40,40,0.07)', border: `2px solid ${alpha('#c62828', 0.15)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <Delete sx={{ fontSize: 28, color: '#c62828' }} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.93rem', color: TXT, mb: 0.75 }}>Are you sure you want to delete this page?</Typography>
            <Typography sx={{ fontSize: '0.82rem', color: MUTED, lineHeight: 1.65 }}>
              This action cannot be undone. Deleting this page will permanently remove it and revoke all associated user access permissions.
            </Typography>
          </Box>
          <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: T.accentFaint, border: `2px solid ${deleteConfirmed ? T.accent : BD}`, transition: 'all 0.2s ease' }}>
            <FormControlLabel
              control={<Checkbox checked={deleteConfirmed} onChange={e => setDeleteConfirmed(e.target.checked)} size="small" sx={{ color: BD, '&.Mui-checked': { color: T.accent } }} />}
              label={<Typography sx={{ fontSize: '0.875rem', fontWeight: deleteConfirmed ? 600 : 400, color: TXT }}>I understand this action cannot be undone</Typography>}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${BD}`, gap: 1, bgcolor: '#f9f9f9' }}>
          <Btn outline fullWidth onClick={() => { setDeleteDialog(false); setDeleteConfirmed(false); }}>Cancel</Btn>
          <Btn danger fullWidth disabled={loading || !deleteConfirmed}
            onClick={handleDelete}
            startIcon={loading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <Delete sx={{ fontSize: 14 }} />}>
            {loading ? 'Deleting…' : 'Delete Page'}
          </Btn>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PagesList;