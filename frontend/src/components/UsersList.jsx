import API_BASE_URL from '../apiConfig';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthHeaders } from '../utils/auth';
import {
  Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Box, Alert, TextField, InputAdornment,
  Chip, CircularProgress, Card, CardContent, Grid, IconButton, Tooltip,
  TablePagination, Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, Switch, Checkbox, Avatar, MenuItem,
  Divider, LinearProgress, Drawer, useTheme, useMediaQuery, CardHeader,
  Stack, Fade, Backdrop, styled, alpha, Modal, Snackbar, Portal,
  ListSubheader, ListItemIcon, FormControl, InputLabel, Select,
} from '@mui/material';
import {
  People, Search, PersonAdd, GroupAdd, Email, Badge as BadgeIcon, Person,
  Visibility, Refresh as RefreshIcon, AccountCircle, Business, Security,
  Close, Pages, Settings, FilterList, Lock, LockOpen, AdminPanelSettings,
  SupervisorAccount, Work, CheckCircle, Cancel, Info, AssignmentInd,
  Key, VerifiedUser, TrendingUp, Shield, Assessment, Delete as DeleteIcon,
  DeleteForever, Edit as EditIcon, ErrorOutline, Circle, Category,
  Assignment, Payment, Description, FolderSpecial, Folder, ChevronLeft,
  ChevronRight, WarningAmberRounded, LockReset as LockResetIcon,
} from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import axios from 'axios';
import SuccessfulOverlay from './SuccessfulOverlay';

/* ─────────────────────────────────────────────────────────────────
   PASSWORD MODAL — PagesList design tokens
───────────────────────────────────────────────────────────────── */
const PW_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
  @keyframes pw-pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(109,35,35,0.4); }
    70%  { box-shadow: 0 0 0 8px rgba(109,35,35,0); }
    100% { box-shadow: 0 0 0 0 rgba(109,35,35,0); }
  }
  @keyframes pw-banner-slide {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pw-section-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .pw-mono { font-family: 'IBM Plex Mono', monospace !important; }
`;

const PW_P      = '#6D2323';
const PW_S      = '#8B4545';
const PW_PANEL  = '#ffffff';
const PW_BD     = '#e2e4e8';
const PW_TXT    = '#111827';
const PW_MUTED  = '#6b7280';
const PW_SUBTLE = '#f7f8fa';
const PW_SIDEBAR_W = 220;

/* Flat card — no hover transform */
const PwFlatCard = ({ children, sx = {} }) => (
  <Box sx={{
    background: PW_PANEL, borderRadius: 3,
    border: `1px solid ${alpha(PW_P, 0.09)}`,
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    overflow: 'hidden', ...sx,
  }}>
    {children}
  </Box>
);

const PwCardBanner = () => (
  <Box sx={{ height: 6, background: `linear-gradient(90deg, ${PW_P} 0%, ${PW_S} 60%, ${alpha(PW_P, 0.4)} 100%)` }} />
);

const PwSectionHeader = ({ icon: Icon, title, subtitle, action }) => (
  <Box sx={{
    px: 4, py: 3,
    background: 'linear-gradient(135deg,#ffffff 0%,#f6f6f6 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 2, flexWrap: 'wrap', borderBottom: `1px solid ${PW_BD}`,
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Avatar sx={{ bgcolor: alpha(PW_P, 0.1), width: 44, height: 44, boxShadow: `0 4px 16px ${alpha(PW_P, 0.12)}` }}>
        <Icon sx={{ color: PW_P, fontSize: 22 }} />
      </Avatar>
      <Box>
        <Typography sx={{ fontWeight: 900, fontSize: '0.95rem', color: PW_P, lineHeight: 1.2 }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: '0.74rem', color: PW_MUTED, fontWeight: 600, mt: 0.2 }}>{subtitle}</Typography>}
      </Box>
    </Box>
    {action && <Box>{action}</Box>}
  </Box>
);

const PwBtn = ({ children, outline, sm, startIcon, disabled, onClick, sx: sxProp = {} }) => (
  <Button
    disableElevation variant={outline ? 'outlined' : 'contained'}
    startIcon={startIcon} disabled={disabled} onClick={onClick}
    sx={{
      borderRadius: 2, textTransform: 'none', fontWeight: 700,
      fontSize: sm ? '0.78rem' : '0.875rem',
      py: sm ? 0.75 : 1, px: sm ? 1.75 : 2.5,
      boxShadow: outline ? 'none' : `0 4px 12px ${alpha(PW_P, 0.28)}`,
      ...(outline
        ? { borderColor: alpha(PW_P, 0.45), color: PW_P, '&:hover': { borderColor: PW_P, bgcolor: alpha(PW_P, 0.04) } }
        : { bgcolor: PW_P, color: '#fff', '&:hover': { bgcolor: '#4a1515' }, '&:disabled': { bgcolor: '#e5e7eb', color: '#9ca3af', boxShadow: 'none' } }),
      ...sxProp,
    }}
  >
    {children}
  </Button>
);

const PW_INPUT = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px', bgcolor: '#f4f5f7', fontSize: '0.875rem',
    transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
    '& fieldset': { borderColor: 'transparent', borderWidth: '1.5px' },
    '&:hover': { bgcolor: '#eef0f3' },
    '&:hover fieldset': { borderColor: alpha(PW_P, 0.22) },
    '&.Mui-focused': { bgcolor: '#fff', boxShadow: `0 0 0 2px ${alpha(PW_P, 0.18)}` },
    '&.Mui-focused fieldset': { borderColor: PW_P, borderWidth: '1.5px' },
  },
  '& .MuiInputBase-input': { py: '9px', px: '12px', fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" },
};

/* ─────────────────────────────────────────────────────────────────
   SHIMMER + WIREFRAME (unchanged)
───────────────────────────────────────────────────────────────── */
const shimmerKeyframes = `
@keyframes ulShimmer { 0% { background-position: -800px 0; } 100% { background-position: 800px 0; } }
@keyframes ulPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.60; } }
@keyframes umBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes umPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
`;

const ULShim = ({ width = '100%', height = 16, borderRadius = 8, sx = {}, light = false }) => (
  <Box sx={{
    width, height, borderRadius: `${borderRadius}px`, flexShrink: 0,
    background: light
      ? 'linear-gradient(90deg,rgba(255,255,255,0.22) 25%,rgba(255,255,255,0.42) 50%,rgba(255,255,255,0.22) 75%)'
      : 'linear-gradient(90deg,rgba(137,68,68,0.08) 25%,rgba(137,68,68,0.20) 50%,rgba(137,68,68,0.08) 75%)',
    backgroundSize: '800px 100%', animation: 'ulShimmer 1.5s infinite linear', ...sx,
  }} />
);

const OfflineBanner = ({ visible, retryIn, primaryColor }) => {
  const p = primaryColor || '#894444';
  return (
    <Fade in={visible} timeout={600} unmountOnExit>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.5, mb: 3, mx: 6, borderRadius: 3, bgcolor: alpha(p, 0.05), border: `1px solid ${alpha(p, 0.18)}`, borderLeft: `4px solid ${alpha(p, 0.45)}` }}>
        <WifiOffIcon sx={{ fontSize: 18, color: alpha(p, 0.5), animation: 'umBounce 2s ease-in-out infinite', flexShrink: 0 }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: alpha(p, 0.75), lineHeight: 1.2 }}>Waiting for connection…</Typography>
          {retryIn > 0 && <Typography sx={{ fontSize: '0.72rem', color: alpha(p, 0.45), mt: 0.3 }}>Retrying in {retryIn}s</Typography>}
        </Box>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: alpha(p, 0.35), animation: 'umPulse 1.8s ease-in-out infinite', flexShrink: 0 }} />
      </Box>
    </Fade>
  );
};

const UsersListWireframe = ({ settings, offline, retryIn }) => {
  const p = settings?.primaryColor || '#894444';
  const ac = settings?.accentColor || '#FEF9E1';
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <Box sx={{ py: 4, width: '100vw', mx: 'auto', maxWidth: '100%', overflow: 'hidden', position: 'relative', left: '50%', transform: 'translateX(-50%)', minHeight: '92vh' }}>
        <Box sx={{ px: 6, mx: 'auto', maxWidth: '1600px' }}>
          <Box sx={{ mb: 4, borderRadius: 20, overflow: 'hidden', background: `${ac}F2`, border: `1px solid ${alpha(p, 0.1)}`, animation: 'ulPulse 2.2s ease-in-out infinite' }}>
            <Box sx={{ p: 5, background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: alpha(p, 0.12) }} />
                  <Box><ULShim width={220} height={26} borderRadius={6} sx={{ mb: 1 }} /><ULShim width={340} height={14} borderRadius={4} /></Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <ULShim width={80} height={28} borderRadius={14} />
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: alpha(p, 0.1) }} />
                  <ULShim width={170} height={44} borderRadius={12} />
                  <ULShim width={160} height={44} borderRadius={12} />
                </Box>
              </Box>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CircularProgress sx={{ color: p }} size={40} />
            <Typography sx={{ color: p, mt: 2, fontWeight: 600 }}>Loading users…</Typography>
          </Box>
        </Box>
      </Box>
    </>
  );
};

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */
const getUserRole = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(jsonPayload).role || JSON.parse(jsonPayload).userRole || null;
  } catch { return null; }
};

const useSystemSettings = () => {
  const [settings, setSettings] = useState(() => {
    try { const s = localStorage.getItem('systemSettings'); if (s) { const p = JSON.parse(s); if (p && typeof p === 'object') return p; } } catch {}
    return { primaryColor: '#894444', secondaryColor: '#6d2323', accentColor: '#FEF9E1', textColor: '#FFFFFF', textPrimaryColor: '#6D2323', textSecondaryColor: '#FEF9E1', hoverColor: '#6D2323', backgroundColor: '#FFFFFF' };
  });
  useEffect(() => {
    (async () => {
      try {
        const url = API_BASE_URL.includes('/api') ? `${API_BASE_URL}/system-settings` : `${API_BASE_URL}/api/system-settings`;
        const r = await axios.get(url);
        if (r.data && typeof r.data === 'object') { setSettings(r.data); localStorage.setItem('systemSettings', JSON.stringify(r.data)); }
      } catch {}
    })();
  }, []);
  return settings;
};

const getEmploymentCategoryInfo = (category, customCategory) => {
  switch (parseInt(category)) {
    case 0: return { label: 'JO - Graduate',         color: '#F57C00', bgcolor: alpha('#F57C00', 0.1), icon: <Circle sx={{ fontSize: 12 }} /> };
    case 1: return { label: 'JO - UnderGrad',         color: '#E64A19', bgcolor: alpha('#E64A19', 0.1), icon: <Circle sx={{ fontSize: 12 }} /> };
    case 2: return { label: 'Regular - Non-Teaching', color: '#2E7D32', bgcolor: alpha('#2E7D32', 0.1), icon: <Circle sx={{ fontSize: 12 }} /> };
    case 3: return { label: 'Teaching (30Hrs)',        color: '#1565C0', bgcolor: alpha('#1565C0', 0.1), icon: <Circle sx={{ fontSize: 12 }} /> };
    case 4: return { label: 'Designated (40Hrs)',      color: '#7B1FA2', bgcolor: alpha('#7B1FA2', 0.1), icon: <Circle sx={{ fontSize: 12 }} /> };
    case 5: return { label: customCategory ? `Other (${String(customCategory).trim()})` : 'Other (specify)', color: '#455A64', bgcolor: alpha('#455A64', 0.1), icon: <Circle sx={{ fontSize: 12 }} /> };
    default: return { label: 'Not Set', color: '#757575', bgcolor: alpha('#757575', 0.1), icon: <Circle sx={{ fontSize: 12 }} /> };
  }
};

const getDescriptionColor = (description, settings) => {
  const p = settings?.primaryColor || '#894444';
  const s = settings?.secondaryColor || '#6d2323';
  switch (description?.toLowerCase()) {
    case 'general':                return { sx: { bgcolor: alpha(p, 0.15), color: p }, icon: <Category /> };
    case 'system administration': return { sx: { bgcolor: alpha(p, 0.15), color: p }, icon: <Category /> };
    case 'registration':          return { sx: { bgcolor: alpha(s, 0.15), color: s }, icon: <Assignment /> };
    case 'information management':return { sx: { bgcolor: alpha(p, 0.1),  color: p }, icon: <Info /> };
    case 'attendance management': return { sx: { bgcolor: alpha(p, 0.12), color: p }, icon: <Assessment /> };
    case 'payroll management':    return { sx: { bgcolor: alpha(s, 0.12), color: s }, icon: <Payment /> };
    case 'form':                  return { sx: { bgcolor: alpha(p, 0.08), color: p }, icon: <Description /> };
    case 'pages management':      return { sx: { bgcolor: alpha(p, 0.18), color: p }, icon: <FolderSpecial /> };
    case 'personal data sheets':  return { sx: { bgcolor: alpha(s, 0.18), color: s }, icon: <Folder /> };
    default:                      return { sx: { bgcolor: alpha(p, 0.1),  color: p }, icon: <Description /> };
  }
};

const RETRY_DELAYS = [2, 4, 8, 15, 30];

/* ─────────────────────────────────────────────────────────────────
   PW SIDEBAR NAV
───────────────────────────────────────────────────────────────── */
const PW_NAV = [
  { key: 'all',        label: 'All Accounts',       icon: Person },
  { key: 'accounts',   label: 'Complete Accounts',  icon: CheckCircle },
  { key: 'incomplete', label: 'Incomplete Accounts', icon: WarningAmberRounded },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
const UsersList = () => {
  const detectedRole = getUserRole();
  const isTechnicalUser = detectedRole === 'technical';

  /* ── Module auth ── */
  const [moduleAuthorized, setModuleAuthorized]                   = useState(isTechnicalUser);
  const [confidentialPasswordInput, setConfidentialPasswordInput] = useState('');
  const [openConfidentialPassword, setOpenConfidentialPassword]   = useState(!isTechnicalUser);
  const [passwordLoading, setPasswordLoading]                     = useState(false);
  const [snackbarOpen, setSnackbarOpen]                           = useState(false);
  const [snackbarMessage, setSnackbarMessage]                     = useState('');
  const [userRole, setUserRole]                                   = useState(detectedRole);
  const [roleChecked, setRoleChecked]                             = useState(true);

  /* ── User list ── */
  const [users, setUsers]                 = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading]             = useState(false);
  const [searchTerm, setSearchTerm]       = useState('');
  const [error, setError]                 = useState('');
  const [page, setPage]                   = useState(0);
  const [rowsPerPage, setRowsPerPage]     = useState(10);
  const [refreshing, setRefreshing]       = useState(false);

  /* ── Offline ── */
  const [offline, setOffline] = useState(false);
  const [retryIn, setRetryIn] = useState(0);
  const retryTimerRef         = useRef(null);
  const countdownRef          = useRef(null);
  const retryAttemptRef       = useRef(0);
  const mountedRef            = useRef(true);

  /* ── Bulk category ── */
  const [selectedEmployeeNumbers, setSelectedEmployeeNumbers] = useState([]);
  const [bulkCategoryDialog, setBulkCategoryDialog]           = useState(false);
  const [bulkEmploymentCategory, setBulkEmploymentCategory]   = useState('');
  const [bulkCustomCategory, setBulkCustomCategory]           = useState('');
  const [bulkEditLoading, setBulkEditLoading]                 = useState(false);

  /* ── Page access ── */
  const [pageAccessDialog, setPageAccessDialog]             = useState(false);
  const [selectedUser, setSelectedUser]                     = useState(null);
  const [pages, setPages]                                   = useState([]);
  const [pageAccess, setPageAccess]                         = useState({});
  const [pageAccessLoading, setPageAccessLoading]           = useState(false);
  const [roleFilter, setRoleFilter]                         = useState('');
  const [accessChangeInProgress, setAccessChangeInProgress] = useState({});
  const [activeAccessCategory, setActiveAccessCategory]     = useState(null);

  /* ── User details ── */
  const [detailsDrawerOpen, setDetailsDrawerOpen]           = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState(null);
  const [successOpen, setSuccessOpen]                       = useState(false);
  const [successAction, setSuccessAction]                   = useState('');
  const [activeTab, setActiveTab]                           = useState('info');
  const [animatedValue, setAnimatedValue]                   = useState(0);

  /* ── Role change ── */
  const [roleChangeDialog, setRoleChangeDialog] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState(null);
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);

  /* ── Edit user ── */
  const [editDialog, setEditDialog]                             = useState(false);
  const [userToEdit, setUserToEdit]                             = useState(null);
  const [editedEmployeeNumber, setEditedEmployeeNumber]         = useState('');
  const [editedFirstName, setEditedFirstName]                   = useState('');
  const [editedMiddleName, setEditedMiddleName]                 = useState('');
  const [editedLastName, setEditedLastName]                     = useState('');
  const [editedNameExtension, setEditedNameExtension]           = useState('');
  const [editedEmail, setEditedEmail]                           = useState('');
  const [editedEmploymentCategory, setEditedEmploymentCategory] = useState('');
  const [editedCustomCategory, setEditedCustomCategory]         = useState('');
  const [editLoading, setEditLoading]                           = useState(false);

  /* ── Delete user ── */
  const [deleteDialog, setDeleteDialog]   = useState(false);
  const [userToDelete, setUserToDelete]   = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* ── Grant role ── */
  const [grantingRole, setGrantingRole]         = useState(null);
  const [confirmRole, setConfirmRole]           = useState(null);
  const [grantSuccessDialog, setGrantSuccessDialog] = useState(null);
  const roleGrantColors = {
    staff:         { color: '#0F766E', bgcolor: alpha('#0F766E', 0.08) },
    administrator: { color: '#9333EA', bgcolor: alpha('#9333EA', 0.08) },
    superadmin:    { color: '#C2410C', bgcolor: alpha('#C2410C', 0.08) },
  };

  /* ── Filters ── */
  const [categoryFilter, setCategoryFilter]     = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [tableTab, setTableTab]                 = useState(0);

  /* ══════════════════════════════════════════════════════════════
     PASSWORD MANAGEMENT MODAL STATE
  ══════════════════════════════════════════════════════════════ */
  const [pwMgmtOpen, setPwMgmtOpen]           = useState(false);
  const [pwUsers, setPwUsers]                 = useState([]);
  const [pwFilteredUsers, setPwFilteredUsers] = useState([]);
  const [pwLoading, setPwLoading]             = useState(false);
  const [pwSearchTerm, setPwSearchTerm]       = useState('');
  const [pwResetting, setPwResetting]         = useState({});
  const [pwErrMessage, setPwErrMessage]       = useState('');
  const [pwSuccessOpen, setPwSuccessOpen]     = useState(false);
  const [pwSuccessAction, setPwSuccessAction] = useState('');
  const [pwPage, setPwPage]                   = useState(0);
  const [pwRowsPerPage, setPwRowsPerPage]     = useState(10);
  /* Sidebar nav replaces tabs: 'all' | 'accounts' | 'incomplete' */
  const [pwNavSection, setPwNavSection]       = useState('all');

  /* ── Theme ── */
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const settings = useSystemSettings();

  const isSuperAdmin = userRole === 'superadmin' || userRole === 'technical';
  const isTechnical  = userRole === 'technical';

  const p  = settings?.primaryColor     || '#894444';
  const s  = settings?.secondaryColor   || '#6d2323';
  const ac = settings?.accentColor      || '#FEF9E1';
  const tp = settings?.textPrimaryColor || '#6D2323';

  /* ── Styled components (main list) ── */
  const GlassCard = useMemo(() => styled(Card)(() => ({
    borderRadius: 20, background: `${ac}F2`, backdropFilter: 'blur(10px)',
    boxShadow: `0 8px 40px ${p}14`, border: `1px solid ${p}1A`, overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': { boxShadow: `0 12px 48px ${p}26`, transform: 'translateY(-4px)' },
  })), [p, ac]);

  const ProfessionalButton = useMemo(() => styled(Button)(({ variant: v }) => ({
    borderRadius: 12, fontWeight: 600, padding: '12px 24px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', textTransform: 'none',
    fontSize: '0.95rem', letterSpacing: '0.025em',
    boxShadow: v === 'contained' ? `0 4px 14px ${p}40` : 'none',
    '&:hover': { transform: 'translateY(-2px)', boxShadow: v === 'contained' ? `0 6px 20px ${p}59` : 'none' },
    '&:active': { transform: 'translateY(0)' },
  })), [p]);

  const ModernTextField = useMemo(() => styled(TextField)(() => ({
    '& .MuiOutlinedInput-root': {
      borderRadius: 12, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', backgroundColor: 'rgba(255,255,255,0.8)',
      '&:hover': { transform: 'translateY(-1px)', backgroundColor: 'rgba(255,255,255,0.95)' },
      '&.Mui-focused': { transform: 'translateY(-1px)', boxShadow: `0 4px 20px ${p}40`, backgroundColor: 'rgba(255,255,255,1)' },
    },
    '& .MuiInputLabel-root': { fontWeight: 500 },
  })), [p]);

  const PremiumTableContainer = useMemo(() => styled(TableContainer)(() => ({
    borderRadius: 16, overflow: 'hidden',
    boxShadow: `0 4px 24px ${p}0F`, border: `1px solid ${p}14`,
  })), [p]);

  const PremiumTableCell = useMemo(() => styled(TableCell)(({ isHeader = false }) => ({
    fontWeight: isHeader ? 600 : 500, padding: '18px 20px',
    borderBottom: isHeader ? `2px solid ${p}4D` : `1px solid ${p}0F`,
    fontSize: '0.95rem', letterSpacing: '0.025em',
  })), [p]);

  const uniqueDepartments = useMemo(() => {
    const depts = new Set(users.map((u) => u.departmentCode).filter(Boolean));
    return Array.from(depts).sort();
  }, [users]);

  /* ── Derived user sets ── */
  const properUsers     = useMemo(() => users.filter((u) => u.fullName && u.fullName.trim() !== '' && u.fullName !== 'Username'), [users]);
  const incompleteUsers = useMemo(() => users.filter((u) => !u.fullName || u.fullName.trim() === '' || u.fullName === 'Username'), [users]);

  /* ══════════════════════════════════════════════════════════════
     PASSWORD MANAGEMENT LOGIC
  ══════════════════════════════════════════════════════════════ */
  const pwProperUsers     = useMemo(() => pwUsers.filter((u) => u.fullName && u.fullName.trim() !== ''), [pwUsers]);
  const pwIncompleteUsers = useMemo(() => pwUsers.filter((u) => !u.fullName || u.fullName.trim() === ''), [pwUsers]);

  const pwSourceUsers = useMemo(() => {
    if (pwNavSection === 'accounts')   return pwProperUsers;
    if (pwNavSection === 'incomplete') return pwIncompleteUsers;
    return pwUsers;
  }, [pwNavSection, pwUsers, pwProperUsers, pwIncompleteUsers]);

  useEffect(() => {
    const term = pwSearchTerm.toLowerCase().trim();
    const result = !term ? pwSourceUsers : pwSourceUsers.filter((u) =>
      (u.fullName || '').toLowerCase().includes(term) ||
      (u.email    || '').toLowerCase().includes(term) ||
      String(u.employeeNumber || '').includes(term)
    );
    setPwFilteredUsers(result);
    setPwPage(0);
  }, [pwSearchTerm, pwSourceUsers]);

  const fetchPwUsers = useCallback(async () => {
    setPwLoading(true); setPwErrMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/users/search`, { method: 'GET', headers: getAuthHeaders().headers });
      if (!res.ok) { const e = await res.json().catch(() => ({})); setPwErrMessage(e.error || 'Failed to fetch users'); setPwUsers([]); return; }
      const data = await res.json();
      setPwUsers(Array.isArray(data) ? data : []);
    } catch { setPwErrMessage('Something went wrong while fetching users.'); setPwUsers([]); }
    finally { setPwLoading(false); }
  }, []);

  const handleResetPassword = async (employeeNumber) => {
    setPwResetting((prev) => ({ ...prev, [employeeNumber]: true }));
    setPwErrMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/users/reset-password`, {
        method: 'POST',
        headers: { ...getAuthHeaders().headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeNumber }),
      });
      const data = await res.json();
      if (res.ok) { setPwSuccessAction('reset'); setPwSuccessOpen(true); }
      else { setPwErrMessage(data.error || 'Failed to reset password'); }
    } catch { setPwErrMessage('Something went wrong while resetting password.'); }
    finally { setPwResetting((prev) => ({ ...prev, [employeeNumber]: false })); }
  };

  const openPwMgmt = useCallback(() => {
    setPwMgmtOpen(true); setPwSearchTerm(''); setPwNavSection('all');
    setPwPage(0); setPwErrMessage(''); setPwSuccessOpen(false);
    fetchPwUsers();
  }, [fetchPwUsers]);

  const closePwMgmt = useCallback(() => {
    setPwMgmtOpen(false); setPwErrMessage(''); setPwSuccessOpen(false);
  }, []);

  const pwPaginatedUsers = pwFilteredUsers.slice(pwPage * pwRowsPerPage, pwPage * pwRowsPerPage + pwRowsPerPage);

  const pwNavCount = (key) => {
    if (key === 'all')        return pwUsers.length;
    if (key === 'accounts')   return pwProperUsers.length;
    if (key === 'incomplete') return pwIncompleteUsers.length;
    return 0;
  };

  /* ── Role badge for pw modal ── */
  const getPwRoleBadge = (role = '') => {
    switch ((role || '').toLowerCase()) {
      case 'superadmin':    return { color: PW_P };
      case 'administrator': return { color: PW_S };
      case 'technical':     return { color: '#2563eb' };
      case 'staff':         return { color: '#047857' };
      default:              return { color: PW_MUTED };
    }
  };

  /* ─────────────────────────────────────────────────────────────
     MAIN DATA FETCHING
  ───────────────────────────────────────────────────────────── */
  const handleModuleAuthorization = async () => {
    if (!confidentialPasswordInput) { setSnackbarMessage('Please enter an authorized password.'); setSnackbarOpen(true); return; }
    setPasswordLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/confidential-password/verify`, { password: confidentialPasswordInput }, getAuthHeaders());
      if (response.data.verified) { setModuleAuthorized(true); setOpenConfidentialPassword(false); setConfidentialPasswordInput(''); fetchUsers(); }
      else { setSnackbarMessage('Password verification failed. Please try again.'); setSnackbarOpen(true); setConfidentialPasswordInput(''); }
    } catch (err) { setSnackbarMessage(err.response?.data?.error || 'Failed to verify password.'); setSnackbarOpen(true); setConfidentialPasswordInput(''); }
    finally { setPasswordLoading(false); }
  };

  const handleModuleAccessCancel = () => navigate('/admin-home');

  const clearRetryTimers = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    if (countdownRef.current)  clearInterval(countdownRef.current);
  }, []);

  const doFetchUsers = useCallback(async () => {
    const authHeaders = getAuthHeaders();
    const [usersResp, personsResp, empCatsResp] = await Promise.all([
      fetch(`${API_BASE_URL}/users`, { method: 'GET', ...authHeaders }),
      fetch(`${API_BASE_URL}/personalinfo/person_table`, { method: 'GET', ...authHeaders }),
      fetch(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`, { method: 'GET', ...authHeaders }),
    ]);
    if (!usersResp.ok) { const err = await usersResp.json().catch(() => ({})); throw new Error(err.error || 'Failed to fetch users'); }
    const usersDataRaw   = await usersResp.json();
    const personsDataRaw = await personsResp.json().catch(() => []);
    const empCatsDataRaw = empCatsResp?.ok ? await empCatsResp.json().catch(() => []) : [];
    const usersArray   = Array.isArray(usersDataRaw)   ? usersDataRaw   : usersDataRaw.users   || usersDataRaw.data   || [];
    const personsArray = Array.isArray(personsDataRaw) ? personsDataRaw : personsDataRaw.persons || personsDataRaw.data || [];
    const empCatsArray = Array.isArray(empCatsDataRaw) ? empCatsDataRaw : empCatsDataRaw.data   || empCatsDataRaw.records || [];
    const empCatsMap = (empCatsArray || []).reduce((acc, row) => { const key = String(row.employeeNumber ?? row.employee_number ?? ''); if (key) acc[key] = row; return acc; }, {});
    return (usersArray || []).map((user) => {
      const person    = (personsArray || []).find((p) => String(p.agencyEmployeeNum) === String(user.employeeNumber));
      const empCatRow = empCatsMap[String(user.employeeNumber)] || null;
      const fullName  = person ? `${person.firstName || ''} ${person.middleName || ''} ${person.lastName || ''} ${person.nameExtension || ''}`.trim() : user.fullName || user.username || `${user.firstName || ''} ${user.lastName || ''}`.trim();
      const avatar = person?.profile_picture ? `${API_BASE_URL}${person.profile_picture}` : user.avatar ? String(user.avatar).startsWith('http') ? user.avatar : `${API_BASE_URL}${user.avatar}` : null;
      return {
        ...user, fullName: fullName || 'Username', avatar: avatar || null, personData: person || {},
        employmentCategory: empCatRow?.employmentCategory !== undefined && empCatRow?.employmentCategory !== null ? empCatRow.employmentCategory : user.employmentCategory !== undefined ? user.employmentCategory : null,
        customCategory: empCatRow?.customCategory ?? empCatRow?.custom_category ?? user.customCategory ?? user.custom_category ?? null,
        departmentCode: user.departmentCode || null, departmentDescription: user.departmentDescription || null,
      };
    });
  }, []); // eslint-disable-line

  const fetchUsers = useCallback(async (isManualRefresh = false, attemptNum = 0) => {
    clearRetryTimers();
    if (!isManualRefresh && attemptNum === 0) setLoading(true);
    if (isManualRefresh) setRefreshing(true);
    try {
      const merged = await doFetchUsers();
      if (!mountedRef.current) return;
      setUsers(merged); setFilteredUsers(merged); setLoading(false); setRefreshing(false);
      setOffline(false); setRetryIn(0); retryAttemptRef.current = 0; setError('');
    } catch (err) {
      if (!mountedRef.current) return;
      setRefreshing(false);
      if (users.length === 0) setLoading(true); else setLoading(false);
      if (attemptNum > 0 || users.length === 0) setOffline(true);
      const delaySeconds = RETRY_DELAYS[Math.min(attemptNum, RETRY_DELAYS.length - 1)];
      setRetryIn(delaySeconds);
      let remaining = delaySeconds;
      countdownRef.current = setInterval(() => { remaining -= 1; if (mountedRef.current) setRetryIn(remaining); if (remaining <= 0) clearInterval(countdownRef.current); }, 1000);
      retryAttemptRef.current = attemptNum + 1;
      retryTimerRef.current = setTimeout(() => { if (mountedRef.current) fetchUsers(false, attemptNum + 1); }, delaySeconds * 1000);
    }
  }, [doFetchUsers, clearRetryTimers, users.length]); // eslint-disable-line

  useEffect(() => { mountedRef.current = true; if (isTechnicalUser) fetchUsers(); return () => { mountedRef.current = false; clearRetryTimers(); }; }, []); // eslint-disable-line
  useEffect(() => { const h = () => { if (mountedRef.current && offline) { clearRetryTimers(); fetchUsers(false, 0); } }; window.addEventListener('online', h); return () => window.removeEventListener('online', h); }, [offline, fetchUsers, clearRetryTimers]);
  useEffect(() => { if (moduleAuthorized && !isTechnicalUser) fetchUsers(); }, [moduleAuthorized]); // eslint-disable-line

  useEffect(() => {
    const sourceUsers = tableTab === 0 ? properUsers : incompleteUsers;
    const filtered = sourceUsers.filter((user) => {
      const matchesSearch     = (user.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(user.employeeNumber || '').includes(searchTerm) || (user.role || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole       = roleFilter       ? (user.role || '').toLowerCase() === roleFilter.toLowerCase() : true;
      const matchesCategory   = categoryFilter !== '' ? String(user.employmentCategory) === String(categoryFilter) : true;
      const matchesDepartment = departmentFilter !== '' ? (user.departmentCode || '') === departmentFilter : true;
      return matchesSearch && matchesRole && matchesCategory && matchesDepartment;
    });
    setFilteredUsers(filtered); setPage(0);
  }, [searchTerm, roleFilter, categoryFilter, departmentFilter, users, tableTab, properUsers, incompleteUsers]);

  /* ─────────────────────────────────────────────────────────────
     PAGE ACCESS
  ───────────────────────────────────────────────────────────── */
  const fetchUserPageAccess = async (user) => {
    try {
      const authHeaders = getAuthHeaders();
      const accessResponse = await fetch(`${API_BASE_URL}/page_access/${user.employeeNumber}`, { method: 'GET', ...authHeaders });
      if (accessResponse.ok) {
        const accessDataRaw = await accessResponse.json();
        const accessData = Array.isArray(accessDataRaw) ? accessDataRaw : accessDataRaw.data || [];
        const accessMap = (accessData || []).reduce((acc, curr) => { const privilege = String(curr.page_privilege || '0'); acc[curr.page_id] = privilege !== '0' && privilege !== ''; return acc; }, {});
        const pagesResponse = await fetch(`${API_BASE_URL}/pages`, { method: 'GET', ...authHeaders });
        if (pagesResponse.ok) {
          let pagesData = await pagesResponse.json();
          pagesData = Array.isArray(pagesData) ? pagesData : pagesData.pages || pagesData.data || [];
          pagesData = (pagesData || []).sort((a, b) => (a.id || 0) - (b.id || 0));
          const accessiblePages = pagesData.filter((page) => accessMap[page.id] === true);
          setSelectedUserForDetails((prev) => ({ ...prev, accessiblePages, totalPages: pagesData.length, hasAccess: accessiblePages.length > 0 }));
          const percentage = pagesData.length > 0 ? (accessiblePages.length / pagesData.length) * 100 : 0;
          let current = 0; const increment = percentage / 20;
          const timer = setInterval(() => { current += increment; if (current >= percentage) { current = percentage; clearInterval(timer); } setAnimatedValue(current); }, 50);
        }
      }
    } catch {}
  };

  const handlePageAccessClick = async (user) => {
    setSelectedUser(user); setPageAccessLoading(true); setPageAccessDialog(true); setActiveAccessCategory(null);
    try {
      const authHeaders = getAuthHeaders();
      const pagesResponse = await fetch(`${API_BASE_URL}/pages`, { method: 'GET', ...authHeaders });
      if (pagesResponse.ok) {
        let pagesData = await pagesResponse.json();
        pagesData = Array.isArray(pagesData) ? pagesData : pagesData.pages || pagesData.data || [];
        pagesData = (pagesData || []).sort((a, b) => (a.id || 0) - (b.id || 0));
        setPages(pagesData);
        const accessResponse = await fetch(`${API_BASE_URL}/page_access/${user.employeeNumber}`, { method: 'GET', ...authHeaders });
        if (accessResponse.ok) {
          const accessDataRaw = await accessResponse.json();
          const accessData = Array.isArray(accessDataRaw) ? accessDataRaw : accessDataRaw.data || [];
          const accessMap = (accessData || []).reduce((acc, curr) => { const privilege = String(curr.page_privilege || '0'); acc[curr.page_id] = privilege !== '0' && privilege !== ''; return acc; }, {});
          setPageAccess(accessMap);
          if (pagesData.length > 0) {
            const grouped = pagesData.reduce((acc, page) => { const desc = page.page_description || 'Uncategorized'; acc[desc] = true; return acc; }, {});
            const order = ['General','System Administration','Registration','Information Management','Attendance Management','Payroll Management','Form','Pages Management','Personal Data Sheets','Uncategorized'];
            const descriptions = Object.keys(grouped).sort((a, b) => { const ia = order.indexOf(a); const ib = order.indexOf(b); if (ia !== -1 && ib !== -1) return ia - ib; if (ia !== -1) return -1; if (ib !== -1) return 1; return a.localeCompare(b); });
            setActiveAccessCategory(descriptions[0] || 'General');
          }
        } else { setPageAccess({}); }
      } else { setPages([]); }
    } catch { setError('Failed to load page access data'); }
    finally { setPageAccessLoading(false); }
  };

  const handleTogglePageAccess = async (pageId, currentAccess) => {
    const newAccess = !currentAccess;
    setAccessChangeInProgress((prev) => ({ ...prev, [pageId]: true }));
    try {
      const authHeaders = getAuthHeaders();
      if (currentAccess === false) {
        const existingAccessResponse = await fetch(`${API_BASE_URL}/page_access/${selectedUser.employeeNumber}`, { method: 'GET', ...authHeaders });
        if (existingAccessResponse.ok) {
          const existingAccess = await existingAccessResponse.json();
          const existingRecord = (existingAccess || []).find((access) => access.page_id === pageId);
          if (!existingRecord) {
            await fetch(`${API_BASE_URL}/page_access`, { method: 'POST', ...authHeaders, body: JSON.stringify({ employeeNumber: selectedUser.employeeNumber, page_id: pageId, page_privilege: newAccess ? '1' : '0' }) });
          } else {
            await fetch(`${API_BASE_URL}/page_access/${selectedUser.employeeNumber}/${pageId}`, { method: 'PUT', ...authHeaders, body: JSON.stringify({ page_privilege: newAccess ? '1' : '0' }) });
          }
        }
      } else {
        await fetch(`${API_BASE_URL}/page_access/${selectedUser.employeeNumber}/${pageId}`, { method: 'PUT', ...authHeaders, body: JSON.stringify({ page_privilege: newAccess ? '1' : '0' }) });
      }
      setPageAccess((prev) => ({ ...prev, [pageId]: newAccess }));
      window.dispatchEvent(new Event('pageAccessUpdated'));
    } catch { setError('Network error while updating page access'); }
    finally { setAccessChangeInProgress((prev) => ({ ...prev, [pageId]: false })); }
  };

  const closePageAccessDialog = () => { window.dispatchEvent(new Event('pageAccessUpdated')); setPageAccessDialog(false); setSelectedUser(null); setPages([]); setPageAccess({}); setActiveAccessCategory(null); };
  const openUserDetails  = (user) => { setSelectedUserForDetails(user); setDetailsDrawerOpen(true); setAnimatedValue(0); fetchUserPageAccess(user); };
  const closeUserDetails = () => { setDetailsDrawerOpen(false); setSelectedUserForDetails(null); setActiveTab('info'); setAnimatedValue(0); };
  const handleRoleChange = (user, newRole) => { if (user.role === newRole) return; setPendingRoleChange({ user, oldRole: user.role, newRole }); setRoleChangeDialog(true); };

  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return;
    setRoleChangeLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/users/${pendingRoleChange.user.employeeNumber}/role`, { method: 'PUT', ...authHeaders, body: JSON.stringify({ role: pendingRoleChange.newRole }) });
      if (!response.ok) { const e = await response.json().catch(() => ({})); setError(e.error || 'Failed to update user role'); setRoleChangeDialog(false); setPendingRoleChange(null); setRoleChangeLoading(false); return; }
      setUsers((prev) => prev.map((u) => u.employeeNumber === pendingRoleChange.user.employeeNumber ? { ...u, role: pendingRoleChange.newRole } : u));
      setFilteredUsers((prev) => prev.map((u) => u.employeeNumber === pendingRoleChange.user.employeeNumber ? { ...u, role: pendingRoleChange.newRole } : u));
      setSuccessAction('edit'); setSuccessOpen(true); setRoleChangeDialog(false); setPendingRoleChange(null);
    } catch { setError('Network error while updating user role'); }
    finally { setRoleChangeLoading(false); }
  };

  const handleEditUser = (user) => {
    setUserToEdit(user); setEditedEmployeeNumber(user.employeeNumber); setEditedFirstName(user.firstName || '');
    setEditedMiddleName(user.middleName || ''); setEditedLastName(user.lastName || ''); setEditedNameExtension(user.nameExtension || '');
    setEditedEmail(user.email || ''); setEditedEmploymentCategory(user.employmentCategory !== undefined && user.employmentCategory !== null ? user.employmentCategory : '');
    setEditedCustomCategory(user.customCategory || user.custom_category || ''); setEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editedEmployeeNumber || !editedFirstName || !editedLastName) { setError('Employee Number, First Name, and Last Name are required'); return; }
    if (parseInt(editedEmploymentCategory) === 5 && !String(editedCustomCategory || '').trim()) { setError('Please enter a custom category description for Other (specify)'); return; }
    setEditLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      if (editedEmployeeNumber !== userToEdit.employeeNumber) {
        const r = await fetch(`${API_BASE_URL}/users/${userToEdit.employeeNumber}/employee-number`, { method: 'PUT', ...authHeaders, body: JSON.stringify({ newEmployeeNumber: editedEmployeeNumber }) });
        if (!r.ok) { const e = await r.json().catch(() => ({})); setError(e.error || 'Failed to update employee number'); setEditLoading(false); return; }
      }
      const r2 = await fetch(`${API_BASE_URL}/personalinfo/person/${editedEmployeeNumber}`, { method: 'PUT', ...authHeaders, body: JSON.stringify({ firstName: editedFirstName, middleName: editedMiddleName || null, lastName: editedLastName, nameExtension: editedNameExtension || null }) });
      if (!r2.ok) { const e = await r2.json().catch(() => ({})); setError(e.error || 'Failed to update user name'); setEditLoading(false); return; }
      const currentEmail = (userToEdit.email || '').trim(); const newEmail = (editedEmail || '').trim();
      if (newEmail !== currentEmail) {
        const r3 = await fetch(`${API_BASE_URL}/users/${editedEmployeeNumber}/email`, { method: 'PUT', ...authHeaders, body: JSON.stringify({ email: newEmail || null }) });
        if (!r3.ok) { const e = await r3.json().catch(() => ({})); setError(e.error || 'Failed to update email'); setEditLoading(false); return; }
      }
      const currentCategory = userToEdit.employmentCategory; const newCategory = editedEmploymentCategory;
      if (newCategory !== currentCategory && newCategory !== '') {
        const checkResponse = await fetch(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${editedEmployeeNumber}`, { method: 'GET', ...authHeaders });
        if (checkResponse.ok) {
          const categoryData = await checkResponse.json();
          await fetch(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${categoryData.id}`, { method: 'PUT', ...authHeaders, body: JSON.stringify({ employeeNumber: editedEmployeeNumber, employmentCategory: parseInt(newCategory), customCategory: parseInt(newCategory) === 5 ? String(editedCustomCategory || '').trim() : '' }) });
        } else {
          await fetch(`${API_BASE_URL}/EmploymentCategoryRoutes/employee-category`, { method: 'POST', ...authHeaders, body: JSON.stringify({ employeeNumber: editedEmployeeNumber, employmentCategory: parseInt(newCategory), customCategory: parseInt(newCategory) === 5 ? String(editedCustomCategory || '').trim() : '' }) });
        }
      }
      await fetchUsers(); setSuccessAction('edit'); setSuccessOpen(true); setEditDialog(false); setUserToEdit(null);
    } catch { setError('Network error while updating user'); }
    finally { setEditLoading(false); }
  };

  const toggleSelectEmployee       = (n) => setSelectedEmployeeNumbers((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]);
  const isEmployeeSelected         = (n) => selectedEmployeeNumbers.includes(n);
  const isAllCurrentPageSelected   = (cur) => cur?.length > 0 && cur.every((u) => selectedEmployeeNumbers.includes(u.employeeNumber));
  const isSomeCurrentPageSelected  = (cur) => { const any = cur?.some((u) => selectedEmployeeNumbers.includes(u.employeeNumber)); const all = cur?.every((u) => selectedEmployeeNumbers.includes(u.employeeNumber)); return any && !all; };
  const toggleSelectAllCurrentPage = (cur) => {
    if (!cur?.length) return;
    if (isAllCurrentPageSelected(cur)) { const set = new Set(cur.map((u) => u.employeeNumber)); setSelectedEmployeeNumbers((prev) => prev.filter((n) => !set.has(n))); }
    else { setSelectedEmployeeNumbers((prev) => { const set = new Set(prev); cur.forEach((u) => set.add(u.employeeNumber)); return Array.from(set); }); }
  };
  const openBulkCategoryEdit  = () => { if (!selectedEmployeeNumbers.length) { setSnackbarMessage('Please select at least 1 employee.'); setSnackbarOpen(true); return; } setBulkEmploymentCategory(''); setBulkCustomCategory(''); setBulkCategoryDialog(true); };
  const closeBulkCategoryEdit = () => { setBulkCategoryDialog(false); setBulkEmploymentCategory(''); setBulkCustomCategory(''); };

  const handleSaveBulkCategoryEdit = async () => {
    if (bulkEmploymentCategory === '' || bulkEmploymentCategory === null) { setError('Please select an employment category to apply.'); return; }
    if (parseInt(bulkEmploymentCategory) === 5 && !String(bulkCustomCategory || '').trim()) { setError('Please enter a custom category description for Other (specify)'); return; }
    if (!selectedEmployeeNumbers.length) { setError('No employees selected.'); return; }
    setBulkEditLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      for (const empNo of [...selectedEmployeeNumbers]) {
        const checkResponse = await fetch(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${empNo}`, { method: 'GET', ...authHeaders });
        if (checkResponse.ok) {
          const categoryData = await checkResponse.json();
          await fetch(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${categoryData.id}`, { method: 'PUT', ...authHeaders, body: JSON.stringify({ employeeNumber: empNo, employmentCategory: parseInt(bulkEmploymentCategory), customCategory: parseInt(bulkEmploymentCategory) === 5 ? String(bulkCustomCategory || '').trim() : '' }) });
        } else {
          await fetch(`${API_BASE_URL}/EmploymentCategoryRoutes/employee-category`, { method: 'POST', ...authHeaders, body: JSON.stringify({ employeeNumber: empNo, employmentCategory: parseInt(bulkEmploymentCategory), customCategory: parseInt(bulkEmploymentCategory) === 5 ? String(bulkCustomCategory || '').trim() : '' }) });
        }
      }
      await fetchUsers(); setSuccessAction('bulk-edit'); setSuccessOpen(true); setSelectedEmployeeNumbers([]); setBulkCategoryDialog(false);
    } catch (err) { setError(err?.message || 'Network error while bulk updating employment category'); }
    finally { setBulkEditLoading(false); }
  };

  const handleDeleteUser    = (user) => { setUserToDelete(user); setDeleteDialog(true); };
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/users/${userToDelete.employeeNumber}`, { method: 'DELETE', ...authHeaders });
      if (!response.ok) { const e = await response.json().catch(() => ({})); setError(e.error || 'Failed to delete user'); setDeleteLoading(false); return; }
      await fetchUsers(); setSuccessAction('delete'); setSuccessOpen(true); setDeleteDialog(false); setUserToDelete(null);
    } catch { setError('Network error while deleting user'); }
    finally { setDeleteLoading(false); }
  };

  const handleGrantRoleAccess = async (role) => {
    setGrantingRole(role);
    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/users/grant-role-access/${role}`, { method: 'POST', ...authHeaders });
      const result = await response.json();
      if (!response.ok) { setError(result.error || `Failed to grant access for role: ${role}`); return; }
      setGrantSuccessDialog({ role, usersProcessed: result.usersProcessed, pagesGranted: result.pagesGranted });
      await fetchUsers();
    } catch { setError('Network error while granting role access'); }
    finally { setGrantingRole(null); }
  };

  const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const formatDate = (d) => { if (!d) return 'N/A'; return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  const getRoleColor = (role = '') => {
    switch ((role || '').toLowerCase()) {
      case 'superadmin':    return { sx: { bgcolor: alpha(p, 0.15), color: p }, icon: <SupervisorAccount /> };
      case 'administrator': return { sx: { bgcolor: alpha(s, 0.15), color: s }, icon: <AdminPanelSettings /> };
      case 'technical':     return { sx: { bgcolor: alpha(p, 0.15), color: p }, icon: <SupervisorAccount /> };
      case 'staff':         return { sx: { bgcolor: alpha(p, 0.1),  color: p }, icon: <Work /> };
      default:              return { sx: { bgcolor: alpha(p, 0.1),  color: p }, icon: <Person /> };
    }
  };
  const getInitials = (n) => { if (!n) return 'U'; const parts = n.trim().split(' ').filter(Boolean); if (parts.length === 1) return parts[0][0].toUpperCase(); return (parts[0][0] + parts[1][0]).toUpperCase(); };

  /* ─────────────────────────────────────────────────────────────
     GUARDS
  ───────────────────────────────────────────────────────────── */
  if (!moduleAuthorized) {
    return (
      <Modal open={openConfidentialPassword} onClose={handleModuleAccessCancel} disableEscapeKeyDown>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: { xs: '90%', sm: 500 }, bgcolor: 'white', borderRadius: 3, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden', border: `2px solid ${p}` }}>
          <Box sx={{ p: 3, bgcolor: 'white', borderBottom: `3px solid ${p}`, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: alpha(p, 0.1), color: p, width: 56, height: 56 }}><Lock sx={{ fontSize: 28 }} /></Avatar>
            <Box><Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333' }}>User Management Access</Typography><Typography variant="body2" sx={{ color: '#666' }}>This module requires authorization</Typography></Box>
          </Box>
          <Box sx={{ p: 4 }}>
            <Alert severity="info" sx={{ mb: 3, borderRadius: 2, bgcolor: alpha(p, 0.05), border: `1px solid ${alpha(p, 0.2)}` }}>
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>Restricted Access</Typography>
              <Typography variant="body2">Enter the authorized password to access User Management.</Typography>
            </Alert>
            <TextField autoFocus margin="dense" label="Enter Authorized Password" type="password" fullWidth variant="outlined" value={confidentialPasswordInput} onChange={(e) => setConfidentialPasswordInput(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter') handleModuleAuthorization(); }} disabled={passwordLoading} sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button onClick={handleModuleAccessCancel} variant="outlined" disabled={passwordLoading} sx={{ color: p, borderColor: p, px: 3, py: 1.2, fontWeight: 600, textTransform: 'none', borderRadius: 2 }}>Cancel</Button>
              <Button onClick={handleModuleAuthorization} variant="contained" disabled={passwordLoading} sx={{ backgroundColor: p, color: 'white', px: 4, py: 1.2, fontWeight: 600, textTransform: 'none', borderRadius: 2, minWidth: 140, '&:hover': { backgroundColor: s } }} startIcon={passwordLoading ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <Lock />}>
                {passwordLoading ? 'Verifying...' : 'Access'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Modal>
    );
  }

  if (loading && !refreshing) return <UsersListWireframe settings={settings} offline={offline} retryIn={retryIn} />;

  /* ─────────────────────────────────────────────────────────────
     MAIN RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    <Box sx={{ py: 4, width: '100vw', mx: 'auto', maxWidth: '100%', overflow: 'hidden', position: 'relative', left: '50%', transform: 'translateX(-50%)', minHeight: '92vh' }}>
      <style>{shimmerKeyframes}</style>
      <Box sx={{ px: 6, mx: 'auto', maxWidth: '1600px' }}>

        {/* ── Header ── */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }}>
            <GlassCard>
              <Box sx={{ p: 3, background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)`, position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, background: `radial-gradient(circle, ${alpha(p, 0.1)} 0%, transparent 70%)` }} />
                <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{ bgcolor: alpha(p, 0.15), mr: 3, width: 48, height: 48, boxShadow: `0 6px 16px ${alpha(p, 0.15)}` }}><People sx={{ fontSize: 24, color: p }} /></Avatar>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: p }}>User Management</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8, color: tp }}>Manage user accounts, roles, and page access permissions</Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip label={`${users.length} Users`} size="small" sx={{ bgcolor: alpha(p, 0.15), color: p, fontWeight: 500 }} />
                    <Tooltip title="Refresh Users">
                      <IconButton onClick={() => fetchUsers(true)} disabled={loading} sx={{ bgcolor: alpha(p, 0.1), color: p, width: 44, height: 44, '&:hover': { bgcolor: alpha(p, 0.2) } }}>
                        {refreshing ? <CircularProgress size={22} sx={{ color: p }} /> : <RefreshIcon />}
                      </IconButton>
                    </Tooltip>
                    <ProfessionalButton variant="contained" startIcon={<LockResetIcon />} onClick={openPwMgmt} sx={{ bgcolor: p, color: ac, '&:hover': { bgcolor: s }, fontSize: '0.9rem', py: 1.25, px: 2 }}>
                      Password Management
                    </ProfessionalButton>
                    {isTechnical && (
                      <ProfessionalButton variant="contained" startIcon={<Pages />} onClick={() => navigate('/pages-list')} sx={{ bgcolor: p, color: ac, '&:hover': { bgcolor: s }, fontSize: '0.9rem', py: 1.25, px: 2 }}>
                        Page Management
                      </ProfessionalButton>
                    )}
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        <Portal><SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} /></Portal>

        {error && (
          <Backdrop open sx={{ zIndex: 9999, backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setError('')}>
            <Fade in timeout={300}><Box onClick={(e) => e.stopPropagation()} sx={{ minWidth: 400, maxWidth: 600 }}><Alert severity="error" icon={<Cancel />} onClose={() => setError('')} sx={{ borderRadius: 4, boxShadow: '0 12px 48px rgba(0,0,0,0.4)', fontSize: '1.1rem', p: 3 }}>{error}</Alert></Box></Fade>
          </Backdrop>
        )}

        {/* ── Stats ── */}
        <Fade in timeout={700}>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {[
              { icon: <AccountCircle sx={{ fontSize: 32, color: tp, mb: 0.5 }} />, value: users.length,                                      label: 'Total Users' },
              { icon: <SupervisorAccount sx={{ fontSize: 32, color: tp, mb: 0.5 }} />, value: users.filter((u) => u.role === 'superadmin').length, label: 'Superadmins' },
              { icon: <AdminPanelSettings sx={{ fontSize: 32, color: tp, mb: 0.5 }} />, value: users.filter((u) => u.role === 'administrator').length, label: 'Administrators' },
              { icon: <Work sx={{ fontSize: 32, color: tp, mb: 0.5 }} />, value: users.filter((u) => u.role === 'staff').length,              label: 'Staff Members' },
              { icon: <Visibility sx={{ fontSize: 32, color: tp, mb: 0.5 }} />, value: filteredUsers.length,                                  label: 'Filtered Results' },
            ].map((stat, i) => (
              <Grid key={i} item xs={12} sm={6} md sx={{ minWidth: 0, flex: '1 1 0%' }}>
                <GlassCard><CardContent sx={{ textAlign: 'center', p: 2 }}>{stat.icon}<Typography variant="h6" sx={{ color: tp, fontWeight: 700, mt: 0.5 }}>{stat.value}</Typography><Typography variant="body2" sx={{ color: tp }}>{stat.label}</Typography></CardContent></GlassCard>
              </Grid>
            ))}
          </Grid>
        </Fade>

        {/* ── Search & Filter ── */}
        <Fade in timeout={900}>
          <GlassCard sx={{ mb: 4 }}>
            <CardHeader
              title={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><Avatar sx={{ width: 32, height: 32, bgcolor: alpha(ac, 0.8), color: tp }}><FilterList sx={{ fontSize: 20 }} /></Avatar><Box><Typography variant="subtitle1" sx={{ fontWeight: 600, color: tp }}>Search & Filter</Typography><Typography variant="body2" sx={{ color: tp, fontSize: '0.75rem' }}>Find and filter users by various criteria</Typography></Box></Box>}
              sx={{ bgcolor: alpha(ac, 0.5), pb: 1.5, borderBottom: `1px solid ${alpha(p, 0.1)}` }}
            />
            <CardContent sx={{ p: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}><ModernTextField fullWidth label="Search Users" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Name, email, employee number, or role" InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: tp, fontSize: 18 }} /></InputAdornment> }} size="small" /></Grid>
                <Grid item xs={6} md={2}><ModernTextField select fullWidth label="Filter by Role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} size="small"><MenuItem value="">All Roles</MenuItem><MenuItem value="Superadmin">Superadmin</MenuItem><MenuItem value="Administrator">Administrator</MenuItem><MenuItem value="Technical">Technical</MenuItem><MenuItem value="Staff">Staff</MenuItem></ModernTextField></Grid>
                <Grid item xs={6} md={3}><FormControl fullWidth size="small"><InputLabel sx={{ fontWeight: 500, fontSize: '0.75rem' }}>Filter by Employment Category</InputLabel><Select value={categoryFilter} label="Filter by Employment Category" onChange={(e) => setCategoryFilter(e.target.value)} sx={{ borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.85)', fontSize: '0.75rem' }}><MenuItem value="">All Categories</MenuItem><ListSubheader sx={{ fontSize: '0.7rem' }}>Job Order (JO)</ListSubheader><MenuItem value="0"><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 10, color: '#F57C00' }} /></ListItemIcon>Graduate</MenuItem><MenuItem value="1"><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 10, color: '#E64A19' }} /></ListItemIcon>UnderGrad</MenuItem><ListSubheader sx={{ fontSize: '0.7rem' }}>Regular</ListSubheader><MenuItem value="2"><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 10, color: '#2E7D32' }} /></ListItemIcon>Non-Teaching</MenuItem><MenuItem value="3"><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 10, color: '#1565C0' }} /></ListItemIcon>Teaching (30Hrs)</MenuItem><MenuItem value="4"><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 10, color: '#7B1FA2' }} /></ListItemIcon>Designated (40Hrs)</MenuItem><ListSubheader sx={{ fontSize: '0.7rem' }}>Custom</ListSubheader><MenuItem value="5"><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 10, color: '#00796B' }} /></ListItemIcon>Other (specify)</MenuItem></Select></FormControl></Grid>
                <Grid item xs={12} md={3}><FormControl fullWidth size="small"><InputLabel sx={{ fontWeight: 500, fontSize: '0.75rem' }}>Filter by Department</InputLabel><Select value={departmentFilter} label="Filter by Department" onChange={(e) => setDepartmentFilter(e.target.value)} sx={{ borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.85)', fontSize: '0.75rem' }}><MenuItem value="">All Departments</MenuItem>{uniqueDepartments.map((code) => <MenuItem key={code} value={code}>{code}</MenuItem>)}</Select></FormControl></Grid>
              </Grid>
            </CardContent>
          </GlassCard>
        </Fade>

        {/* ── Users Table ── */}
        <Fade in timeout={1100}>
          <GlassCard>
            <OfflineBanner visible={offline} retryIn={retryIn} primaryColor={p} />
            <Box sx={{ p: 2, background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${alpha(p, 0.1)}`, flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ minWidth: 0, mr: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: p }}>Registered Users</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, color: tp }}>{searchTerm || roleFilter || categoryFilter !== '' || departmentFilter !== '' ? `Showing ${filteredUsers.length} of ${tableTab === 0 ? properUsers.length : incompleteUsers.length} users` : `Total: ${users.length} registered users`}</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" justifyContent="flex-end">
                {incompleteUsers.length > 0 && <Chip icon={<WarningAmberRounded sx={{ fontSize: 14 }} />} label={`${incompleteUsers.length} incomplete`} size="small" sx={{ bgcolor: alpha('#f59e0b', 0.15), color: '#b45309', fontWeight: 600, border: `1px solid ${alpha('#f59e0b', 0.3)}`, height: 22, fontSize: '0.65rem' }} />}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mr: 0.5 }}><VerifiedUser sx={{ fontSize: 12, color: alpha(p, 0.4) }} /><Typography sx={{ fontSize: '0.66rem', fontWeight: 700, color: alpha(p, 0.4), textTransform: 'uppercase', letterSpacing: '0.09em' }}>Grant Default Access:</Typography></Box>
                {['staff', 'administrator', 'superadmin'].map((role) => (
                  <Tooltip key={role} title={`Grant default page access to all ${role} users`}>
                    <ProfessionalButton variant="outlined" startIcon={grantingRole === role ? <CircularProgress size={14} sx={{ color: roleGrantColors[role].color }} /> : null} onClick={() => setConfirmRole(role)} disabled={grantingRole !== null} sx={{ borderColor: roleGrantColors[role].color, color: roleGrantColors[role].color, bgcolor: roleGrantColors[role].bgcolor, fontSize: '0.72rem', px: 1, minWidth: 'auto', '&:hover': { bgcolor: alpha(roleGrantColors[role].color, 0.18) } }}>
                      {grantingRole === role ? 'Granting...' : `Grant ${role.charAt(0).toUpperCase() + role.slice(1)}`}
                    </ProfessionalButton>
                  </Tooltip>
                ))}
                {isTechnical && <Tooltip title="Bulk Edit Employment Category"><ProfessionalButton variant="outlined" startIcon={<Category sx={{ fontSize: 14 }} />} onClick={openBulkCategoryEdit} disabled={selectedEmployeeNumbers.length === 0} sx={{ borderColor: p, color: p, fontSize: '0.72rem', px: 1, minWidth: 'auto' }}>Bulk Edit ({selectedEmployeeNumbers.length})</ProfessionalButton></Tooltip>}
              </Box>
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: `1px solid ${alpha(p, 0.1)}`, bgcolor: alpha(ac, 0.4) }}>
              <Box sx={{ display: 'flex', px: 2 }}>
                {[{ label: 'Accounts', count: properUsers.length, color: '#16a34a', icon: <CheckCircle sx={{ fontSize: 16 }} /> }, { label: 'Incomplete Accounts', count: incompleteUsers.length, color: '#d97706', icon: <WarningAmberRounded sx={{ fontSize: 16 }} /> }].map((tab, idx) => (
                  <Box key={idx} onClick={() => { setTableTab(idx); setPage(0); setSearchTerm(''); }} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, cursor: 'pointer', borderBottom: tableTab === idx ? `3px solid ${p}` : '3px solid transparent', color: tableTab === idx ? p : alpha(tp, 0.5), fontWeight: tableTab === idx ? 700 : 600, fontSize: '0.85rem', transition: 'all 0.15s ease', '&:hover': { color: p } }}>
                    {tab.icon}<span>{tab.label}</span>
                    <Box sx={{ px: 0.75, py: 0.1, bgcolor: `${tab.color}33`, borderRadius: '20px' }}><Typography sx={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.68rem', fontWeight: 700, color: tab.color }}>{tab.count}</Typography></Box>
                  </Box>
                ))}
              </Box>
            </Box>

            {tableTab === 1 && incompleteUsers.length > 0 && (
              <Box sx={{ px: 3, py: 1.5, bgcolor: alpha('#f59e0b', 0.06), borderBottom: `1px solid ${alpha('#f59e0b', 0.2)}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningAmberRounded sx={{ fontSize: 15, color: '#d97706', flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.75rem', color: '#92400e' }}>These accounts are missing a full name. Use the edit action to link them to an employee record.</Typography>
              </Box>
            )}

            <PremiumTableContainer component={Paper} elevation={0}>
              <Table sx={{ minWidth: 800 }}>
                <TableHead sx={{ bgcolor: alpha(ac, 0.7) }}>
                  <TableRow>
                    <PremiumTableCell isHeader sx={{ color: tp, width: 10 }}><Checkbox checked={isAllCurrentPageSelected(paginatedUsers)} indeterminate={isSomeCurrentPageSelected(paginatedUsers)} onChange={() => toggleSelectAllCurrentPage(paginatedUsers)} sx={{ color: '#FFFFFF', '&.Mui-checked': { color: '#FFFFFF' } }} /></PremiumTableCell>
                    <PremiumTableCell isHeader sx={{ color: tp }}>Emp. No.</PremiumTableCell>
                    <PremiumTableCell isHeader sx={{ color: tp }}>Full Name</PremiumTableCell>
                    <PremiumTableCell isHeader sx={{ color: tp }}>Email</PremiumTableCell>
                    <PremiumTableCell isHeader sx={{ color: tp }}>Role</PremiumTableCell>
                    <PremiumTableCell isHeader sx={{ color: tp }}>Employment Category</PremiumTableCell>
                    <PremiumTableCell isHeader sx={{ color: tp }}>Department</PremiumTableCell>
                    <PremiumTableCell isHeader sx={{ color: tp, textAlign: 'center' }}>Page Access</PremiumTableCell>
                    {isTechnical && <PremiumTableCell isHeader sx={{ color: tp, textAlign: 'center' }}>Actions</PremiumTableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedUsers.length > 0 ? paginatedUsers.map((user) => {
                    const categoryInfo = getEmploymentCategoryInfo(user.employmentCategory, user.customCategory || user.custom_category);
                    const isIncomplete = tableTab === 1;
                    return (
                      <TableRow key={user.employeeNumber} sx={{ '&:nth-of-type(even)': { bgcolor: alpha(ac, 0.3) }, '&:hover': { bgcolor: alpha(p, 0.05) }, transition: 'all 0.2s ease' }}>
                        <PremiumTableCell><Checkbox checked={isEmployeeSelected(user.employeeNumber)} onChange={() => toggleSelectEmployee(user.employeeNumber)} sx={{ color: p, '&.Mui-checked': { color: p } }} /></PremiumTableCell>
                        <PremiumTableCell sx={{ fontWeight: 600, color: tp }}>{user.employeeNumber}</PremiumTableCell>
                        <PremiumTableCell>
                          {isIncomplete ? <Box><Typography variant="body2" sx={{ fontStyle: 'italic', color: alpha(tp, 0.4) }}>No name on record</Typography><Chip label="Missing" size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: alpha('#f59e0b', 0.12), color: '#d97706', mt: 0.25 }} /></Box> : <Typography variant="body1" sx={{ fontWeight: 600, color: tp }}>{user.fullName}</Typography>}
                        </PremiumTableCell>
                        <PremiumTableCell sx={{ color: tp }}>{user.email}</PremiumTableCell>
                        <PremiumTableCell>
                          {user.role === 'technical' ? (
                            <Chip size="small" label="Technical" icon={getRoleColor('technical').icon} sx={{ ...getRoleColor('technical').sx, fontWeight: 600, pointerEvents: 'none' }} />
                          ) : (
                            <ModernTextField select value={user.role || 'staff'} onChange={(e) => handleRoleChange(user, e.target.value)} size="small" sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.9)' } }}>
                              <MenuItem value="superadmin">Superadmin</MenuItem>
                              <MenuItem value="administrator">Administrator</MenuItem>
                              <MenuItem value="staff">Staff</MenuItem>
                            </ModernTextField>
                          )}
                        </PremiumTableCell>
                        <PremiumTableCell><Chip size="small" label={categoryInfo.label} icon={categoryInfo.icon} sx={{ color: categoryInfo.color, bgcolor: categoryInfo.bgcolor, border: `1px solid ${categoryInfo.color}`, fontWeight: 600, fontSize: '0.75rem' }} /></PremiumTableCell>
                        <PremiumTableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Business sx={{ color: tp, fontSize: 18 }} /><Typography variant="body2" sx={{ fontWeight: 500, color: tp }}>{user.departmentDescription || user.departmentCode || '-'}</Typography></Box></PremiumTableCell>
                        <PremiumTableCell sx={{ textAlign: 'center' }}><ProfessionalButton onClick={() => handlePageAccessClick(user)} startIcon={<Security />} size="small" variant="contained" sx={{ bgcolor: p, color: ac, '&:hover': { bgcolor: s } }}>Manage</ProfessionalButton></PremiumTableCell>
                        {isTechnical && <PremiumTableCell sx={{ textAlign: 'center' }}><Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}><Tooltip title="Edit User"><IconButton size="small" onClick={() => handleEditUser(user)} sx={{ bgcolor: alpha(p, 0.1), color: p, '&:hover': { bgcolor: p, color: ac } }}><EditIcon fontSize="small" /></IconButton></Tooltip><Tooltip title="Delete User"><IconButton size="small" onClick={() => handleDeleteUser(user)} sx={{ bgcolor: alpha('#d32f2f', 0.1), color: '#d32f2f', '&:hover': { bgcolor: '#d32f2f', color: 'white' } }}><DeleteIcon fontSize="small" /></IconButton></Tooltip></Box></PremiumTableCell>}
                      </TableRow>
                    );
                  }) : (
                    <TableRow><TableCell colSpan={isTechnical ? 9 : 8} sx={{ textAlign: 'center', py: 8, border: 'none' }}><Info sx={{ fontSize: 80, color: alpha(p, 0.3), mb: 3 }} /><Typography variant="h5" color={alpha(p, 0.6)} sx={{ fontWeight: 600 }}>{tableTab === 1 ? 'No Incomplete Accounts' : 'No Users Found'}</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </PremiumTableContainer>
            {filteredUsers.length > 0 && <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}><TablePagination component="div" count={filteredUsers.length} page={page} onPageChange={(_, np) => setPage(np)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} rowsPerPageOptions={[5, 10, 25, 50, 100]} sx={{ '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { color: tp, fontWeight: 600 } }} /></Box>}
          </GlassCard>
        </Fade>


        {/* ════════════════════════════════════════════════════════════════
            PASSWORD MANAGEMENT MODAL — PagesList design system
        ════════════════════════════════════════════════════════════════ */}
        <Dialog
          open={pwMgmtOpen}
          onClose={closePwMgmt}
          maxWidth="xl"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              bgcolor: PW_SUBTLE,
              height: '90vh',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'row',
              fontFamily: "'IBM Plex Sans', sans-serif",
            },
          }}
        >
          <style>{PW_CSS}</style>

          {/* ── MAIN CONTENT ── */}
          <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', p: 3.5, gap: 2.5, minWidth: 0, pr: `${PW_SIDEBAR_W + 16}px` }}>

            {/* Breadcrumb */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', animation: 'pw-banner-slide 0.4s ease', flexShrink: 0 }}>
              <Typography className="pw-mono" sx={{ fontSize: '0.7rem', color: PW_MUTED }}>System</Typography>
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: PW_BD }} />
              <Typography className="pw-mono" sx={{ fontSize: '0.7rem', color: PW_P, fontWeight: 700 }}>Password Management</Typography>
              <Box sx={{ flex: 1 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.75, bgcolor: PW_PANEL, border: `1px solid ${PW_BD}`, borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#22c55e', animation: 'pw-pulse-ring 2s infinite', flexShrink: 0 }} />
                <Typography className="pw-mono" sx={{ fontSize: '0.67rem', color: PW_MUTED }}>{pwUsers.length} users registered</Typography>
              </Box>
              <Tooltip title="Close">
                <IconButton onClick={closePwMgmt} size="small" sx={{ bgcolor: alpha(PW_P, 0.08), color: PW_P, borderRadius: 1.5, '&:hover': { bgcolor: alpha(PW_P, 0.15) } }}>
                  <Close sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Hero Card */}
            <PwFlatCard sx={{ animation: 'pw-section-in 0.4s ease', flexShrink: 0 }}>
              <PwCardBanner />
              <Box sx={{ px: 4, py: 3, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                <Avatar sx={{ width: 64, height: 64, bgcolor: alpha(PW_P, 0.1), border: `4px solid ${PW_PANEL}`, boxShadow: `0 6px 20px ${alpha(PW_P, 0.22)}` }}>
                  <LockResetIcon sx={{ color: PW_P, fontSize: 32 }} />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 160 }}>
                  <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', color: PW_P, lineHeight: 1.15, mb: 0.5, letterSpacing: '-0.01em' }}>Password Management</Typography>
                  <Typography className="pw-mono" sx={{ fontSize: '0.76rem', color: PW_MUTED, fontWeight: 600, mb: 1.25 }}>
                    Resets a user's password to their surname (ALL CAPS)
                  </Typography>
                  {/* Mini stats pills */}
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Total',      value: pwUsers.length,          color: PW_P },
                      { label: 'Complete',   value: pwProperUsers.length,    color: '#16a34a' },
                      { label: 'Incomplete', value: pwIncompleteUsers.length, color: '#d97706' },
                    ].map(({ label, value, color }) => (
                      <Box key={label} sx={{ px: 1.75, py: 0.6, bgcolor: alpha(color, 0.07), border: `1px solid ${alpha(color, 0.2)}`, borderRadius: '20px', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Typography className="pw-mono" sx={{ fontWeight: 900, fontSize: '0.82rem', color, lineHeight: 1 }}>{value}</Typography>
                        <Typography className="pw-mono" sx={{ fontSize: '0.58rem', color: alpha(color, 0.7), textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Tooltip title="Refresh Users">
                  <IconButton onClick={fetchPwUsers} disabled={pwLoading} sx={{ width: 38, height: 38, border: `1px solid ${PW_BD}`, borderRadius: 1.5, bgcolor: PW_PANEL, '&:hover': { borderColor: PW_P, color: PW_P }, '&:disabled': { opacity: 0.5 } }}>
                    {pwLoading ? <CircularProgress size={16} sx={{ color: PW_P }} /> : <RefreshIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                </Tooltip>
              </Box>
            </PwFlatCard>

            {/* Error / Success alerts */}
            {pwErrMessage && (
              <Fade in timeout={250}>
                <Alert severity="error" icon={<Cancel />} onClose={() => setPwErrMessage('')} sx={{ borderRadius: 2, fontWeight: 500, flexShrink: 0 }}>{pwErrMessage}</Alert>
              </Fade>
            )}
            {pwSuccessOpen && (
              <Fade in timeout={250}>
                <Alert severity="success" icon={<CheckCircle />} onClose={() => setPwSuccessOpen(false)} sx={{ borderRadius: 2, fontWeight: 500, flexShrink: 0 }}>
                  Password has been reset successfully.
                </Alert>
              </Fade>
            )}

            {/* Search */}
            <PwFlatCard sx={{ animation: 'pw-section-in 0.35s ease 0.05s both', flexShrink: 0 }}>
              <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${PW_BD}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ bgcolor: alpha(PW_P, 0.1), width: 34, height: 34 }}><Search sx={{ color: PW_P, fontSize: 18 }} /></Avatar>
                <Typography sx={{ fontWeight: 900, fontSize: '0.85rem', color: PW_P }}>Search Users</Typography>
              </Box>
              <Box sx={{ px: 3, py: 2.5 }}>
                <TextField
                  fullWidth size="small"
                  placeholder="Search by name, email, or employee number…"
                  value={pwSearchTerm}
                  onChange={(e) => setPwSearchTerm(e.target.value)}
                  sx={PW_INPUT}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: alpha(PW_P, 0.4), fontSize: 18 }} /></InputAdornment> }}
                />
              </Box>
            </PwFlatCard>

            {/* Table Card */}
            <PwFlatCard sx={{ animation: 'pw-section-in 0.35s ease 0.1s both', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

              <PwSectionHeader
                icon={pwNavSection === 'incomplete' ? WarningAmberRounded : pwNavSection === 'accounts' ? CheckCircle : Person}
                title={pwNavSection === 'all' ? 'All Accounts' : pwNavSection === 'accounts' ? 'Complete Accounts' : 'Incomplete Accounts'}
                subtitle={
                  pwSearchTerm
                    ? `${pwFilteredUsers.length} of ${pwSourceUsers.length} users matching "${pwSearchTerm}"`
                    : `${pwFilteredUsers.length} user${pwFilteredUsers.length !== 1 ? 's' : ''} shown`
                }
                action={
                  pwIncompleteUsers.length > 0 && pwNavSection !== 'accounts' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.5, bgcolor: alpha('#f59e0b', 0.08), border: `1px solid ${alpha('#f59e0b', 0.25)}`, borderRadius: '20px' }}>
                      <WarningAmberRounded sx={{ fontSize: 13, color: '#d97706' }} />
                      <Typography className="pw-mono" sx={{ fontSize: '0.63rem', fontWeight: 900, color: '#d97706' }}>{pwIncompleteUsers.length} incomplete</Typography>
                    </Box>
                  ) : null
                }
              />

              {/* Incomplete notice */}
              {pwNavSection === 'incomplete' && pwIncompleteUsers.length > 0 && (
                <Box sx={{ px: 3, py: 1.25, bgcolor: alpha('#f59e0b', 0.05), borderBottom: `1px solid ${alpha('#f59e0b', 0.18)}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningAmberRounded sx={{ fontSize: 13, color: '#d97706', flexShrink: 0 }} />
                  <Typography className="pw-mono" sx={{ fontSize: '0.65rem', color: '#92400e' }}>These accounts are missing a full name. They can still have their password reset, but should be updated in employee records.</Typography>
                </Box>
              )}

              {/* Loading */}
              {pwLoading && pwUsers.length === 0 ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1.5 }}>
                  <CircularProgress sx={{ color: PW_P }} size={36} />
                  <Typography sx={{ color: PW_MUTED, fontWeight: 600, fontSize: '0.875rem' }}>Loading users…</Typography>
                </Box>
              ) : (
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                  <Table sx={{ minWidth: 700 }} stickyHeader>
                    <TableHead>
                      <TableRow sx={{ bgcolor: PW_SUBTLE }}>
                        {['Employee #', 'Full Name', 'Email', 'Role', 'Action'].map((h, i) => (
                          <TableCell key={h} sx={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.6rem', fontWeight: 700, color: alpha(PW_P, 0.5), textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: `2px solid ${alpha(PW_P, 0.12)}`, py: 1.5, px: 2.5, whiteSpace: 'nowrap', textAlign: i === 4 ? 'center' : 'left', bgcolor: PW_SUBTLE }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pwPaginatedUsers.length > 0 ? pwPaginatedUsers.map((user) => {
                        const isIncomplete = !user.fullName?.trim();
                        const roleBadge = getPwRoleBadge(user.role);
                        return (
                          <TableRow key={user.employeeNumber} sx={{ '&:nth-of-type(even)': { bgcolor: alpha(PW_P, 0.018) }, '&:hover': { bgcolor: alpha(PW_P, 0.04) }, transition: 'background-color 0.15s ease', borderBottom: `1px solid ${alpha(PW_P, 0.06)}` }}>
                            <TableCell sx={{ px: 2.5, py: 1.75 }}>
                              <Typography className="pw-mono" sx={{ fontSize: '0.74rem', color: alpha(PW_P, 0.55), fontWeight: 600 }}>#{user.employeeNumber}</Typography>
                            </TableCell>
                            <TableCell sx={{ px: 2.5, py: 1.75 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar src={user.avatar || ''} alt={user.fullName} sx={{ width: 38, height: 38, bgcolor: isIncomplete ? alpha('#f59e0b', 0.18) : alpha(PW_P, 0.12), color: isIncomplete ? '#d97706' : PW_P, fontWeight: 700, fontSize: '0.82rem', border: `2px solid ${PW_PANEL}`, boxShadow: `0 2px 8px ${alpha(PW_P, 0.12)}` }}>
                                  {!user.avatar && (isIncomplete ? '?' : getInitials(user.fullName))}
                                </Avatar>
                                {isIncomplete ? (
                                  <Box>
                                    <Typography sx={{ fontStyle: 'italic', color: alpha(PW_TXT, 0.35), fontSize: '0.82rem' }}>No name on record</Typography>
                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', mt: 0.25, px: 1, py: 0.15, bgcolor: alpha('#f59e0b', 0.1), border: `1px solid ${alpha('#f59e0b', 0.25)}`, borderRadius: '20px' }}>
                                      <Typography className="pw-mono" sx={{ fontSize: '0.58rem', fontWeight: 900, color: '#d97706' }}>MISSING</Typography>
                                    </Box>
                                  </Box>
                                ) : (
                                  <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: PW_TXT }}>{user.fullName}</Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ px: 2.5, py: 1.75 }}>
                              <Typography className="pw-mono" sx={{ fontSize: '0.72rem', color: PW_MUTED, bgcolor: PW_SUBTLE, px: 1, py: 0.4, borderRadius: 1, display: 'inline-block', border: `1px solid ${PW_BD}` }}>
                                {user.email || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ px: 2.5, py: 1.75 }}>
                              <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.25, py: 0.35, bgcolor: alpha(roleBadge.color, 0.08), border: `1px solid ${alpha(roleBadge.color, 0.22)}`, borderRadius: '20px' }}>
                                <Typography className="pw-mono" sx={{ fontSize: '0.65rem', fontWeight: 900, color: roleBadge.color }}>{(user.role || 'N/A').toUpperCase()}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ px: 2.5, py: 1.75, textAlign: 'center' }}>
                              <PwBtn
                                sm
                                disabled={pwResetting[user.employeeNumber] || !user.email}
                                onClick={() => handleResetPassword(user.employeeNumber)}
                                startIcon={pwResetting[user.employeeNumber] ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : <LockResetIcon sx={{ fontSize: '14px !important' }} />}
                              >
                                {pwResetting[user.employeeNumber] ? 'Resetting…' : 'Reset'}
                              </PwBtn>
                            </TableCell>
                          </TableRow>
                        );
                      }) : (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ textAlign: 'center', py: 8, border: 'none' }}>
                            <LockResetIcon sx={{ fontSize: 52, color: alpha(PW_P, 0.18), mb: 1.5, display: 'block', mx: 'auto' }} />
                            <Typography sx={{ fontWeight: 700, color: alpha(PW_P, 0.5), fontSize: '0.92rem', mb: 0.5 }}>
                              {pwNavSection === 'incomplete' ? 'No Incomplete Accounts' : 'No Users Found'}
                            </Typography>
                            <Typography sx={{ color: PW_MUTED, fontSize: '0.8rem' }}>
                              {pwSearchTerm ? 'Try adjusting your search' : pwNavSection === 'incomplete' ? 'All accounts have a full name on record' : 'No users available'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
              )}

              {pwFilteredUsers.length > 0 && (
                <Box sx={{ px: 2, py: 1, borderTop: `1px solid ${PW_BD}`, display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                  <TablePagination
                    component="div"
                    count={pwFilteredUsers.length}
                    page={pwPage}
                    onPageChange={(_, np) => setPwPage(np)}
                    rowsPerPage={pwRowsPerPage}
                    onRowsPerPageChange={(e) => { setPwRowsPerPage(parseInt(e.target.value, 10)); setPwPage(0); }}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    sx={{ '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.7rem', color: PW_MUTED } }}
                  />
                </Box>
              )}
            </PwFlatCard>
          </Box>

          {/* ── RIGHT SIDEBAR ── */}
          <Box sx={{
            width: PW_SIDEBAR_W, bgcolor: PW_PANEL,
            borderLeft: `2px solid ${alpha(PW_P, 0.28)}`,
            boxShadow: `-3px 0 18px ${alpha(PW_P, 0.05)}`,
            display: 'flex', flexDirection: 'column',
            position: 'absolute', right: 0, top: 0, height: '100%',
            overflowY: 'auto', zIndex: 1,
          }}>
            {/* Sidebar header */}
            <Box sx={{ px: 2.5, py: 2.5, borderBottom: `1px solid ${alpha(PW_P, 0.1)}`, display: 'flex', alignItems: 'center', gap: 1.75, flexShrink: 0, background: `linear-gradient(135deg,${alpha(PW_P, 0.07)} 0%,${alpha(PW_P, 0.01)} 100%)` }}>
              <Box sx={{ width: 34, height: 34, bgcolor: PW_P, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1.5, flexShrink: 0, boxShadow: `0 4px 12px ${alpha(PW_P, 0.4)}` }}>
                <LockResetIcon sx={{ fontSize: 17, color: '#fff' }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 900, fontSize: '0.84rem', color: PW_P, lineHeight: 1.2 }}>Password Mgmt</Typography>
                <Typography className="pw-mono" sx={{ fontSize: '0.54rem', color: alpha(PW_P, 0.4), letterSpacing: '0.08em', textTransform: 'uppercase' }}>User Admin</Typography>
              </Box>
            </Box>

            {/* Stats mini */}
            <Box sx={{ mx: 2, my: 1.75, p: 1.75, bgcolor: alpha(PW_P, 0.04), borderRadius: 2, border: `1px solid ${alpha(PW_P, 0.1)}`, flexShrink: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                {[
                  { label: 'Total',      value: pwUsers.length,             color: PW_P },
                  { label: 'OK',         value: pwProperUsers.length,       color: '#16a34a' },
                  { label: 'Missing',    value: pwIncompleteUsers.length,   color: '#d97706' },
                ].map(({ label, value, color }) => (
                  <Box key={label} sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', color, lineHeight: 1 }}>{value}</Typography>
                    <Typography className="pw-mono" sx={{ fontSize: '0.54rem', color: PW_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Active filter badge */}
            <Box sx={{ mx: 2, mb: 1.5, px: 1.75, py: 1.1, bgcolor: alpha(PW_P, 0.06), borderRadius: 1.5, border: `1px solid ${alpha(PW_P, 0.16)}`, flexShrink: 0 }}>
              <Typography className="pw-mono" sx={{ fontSize: '0.53rem', color: alpha(PW_P, 0.45), textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.3 }}>Active Filter</Typography>
              <Typography sx={{ fontWeight: 900, fontSize: '0.78rem', color: PW_P }}>
                {pwNavSection === 'all' ? 'All Accounts' : pwNavSection === 'accounts' ? 'Complete Accounts' : 'Incomplete Accounts'}
              </Typography>
            </Box>

            {/* Nav label */}
            <Typography className="pw-mono" sx={{ fontSize: '0.53rem', fontWeight: 700, color: alpha(PW_P, 0.32), letterSpacing: '0.14em', textTransform: 'uppercase', px: 2.5, pb: 0.75, pt: 0.25 }}>
              Filter by Type
            </Typography>

            {/* Nav items */}
            <Box sx={{ flex: 1 }}>
              {PW_NAV.map(({ key, label, icon: Icon }) => {
                const active = pwNavSection === key;
                const count  = pwNavCount(key);
                return (
                  <Box key={key} onClick={() => { setPwNavSection(key); setPwSearchTerm(''); setPwPage(0); }}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.2, cursor: 'pointer', borderLeft: active ? `3px solid ${PW_P}` : '3px solid transparent', bgcolor: active ? alpha(PW_P, 0.09) : 'transparent', transition: 'all 0.14s ease', '&:hover': { bgcolor: active ? alpha(PW_P, 0.09) : alpha(PW_P, 0.04) } }}>
                    <Icon sx={{ fontSize: 15, color: active ? PW_P : alpha(PW_P, 0.35), flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: active ? 700 : 500, color: active ? PW_P : PW_MUTED, flex: 1 }}>{label}</Typography>
                    {count > 0 && (
                      <Box sx={{ px: 1, py: 0.1, bgcolor: active ? alpha(PW_P, 0.15) : alpha(PW_P, 0.07), borderRadius: '20px' }}>
                        <Typography className="pw-mono" sx={{ fontSize: '0.58rem', fontWeight: 900, color: active ? PW_P : PW_MUTED }}>{count}</Typography>
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>

            {/* Sidebar footer */}
            <Box sx={{ px: 2.5, py: 1.75, borderTop: `1px solid ${alpha(PW_P, 0.08)}`, flexShrink: 0, bgcolor: alpha(PW_P, 0.013) }}>
              <Typography className="pw-mono" sx={{ fontSize: '0.58rem', color: alpha(PW_P, 0.4) }}>Password Mgmt · HRIS System</Typography>
            </Box>
          </Box>
        </Dialog>
        {/* ════════════════ END PASSWORD MANAGEMENT MODAL ════════════════ */}


        {/* ── Grant confirm dialog ── */}
        <Dialog open={confirmRole !== null} onClose={() => setConfirmRole(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}>
          <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, backgroundColor: alpha(p, 0.06), borderBottom: '1px solid', borderColor: 'divider' }}>
            <VerifiedUser sx={{ fontSize: 20, color: alpha(p, 0.9) }} />
            <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>Confirm Access Grant</Typography>
          </Box>
          <Box sx={{ px: 3, pt: 2 }}>
            <Typography sx={{ fontSize: '0.86rem', mb: 1.5, lineHeight: 1.6 }}>You are about to grant default page access to all{' '}{confirmRole && <Box component="span" sx={{ fontWeight: 700, px: 1, py: 0.3, borderRadius: 2, background: `linear-gradient(90deg, ${alpha(p, 0.12)}, ${alpha(p, 0.05)})`, color: p, display: 'inline-block', ml: 0.5 }}>{confirmRole.charAt(0).toUpperCase() + confirmRole.slice(1)}</Box>}{' '}users.</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.2, px: 3, pb: 2 }}>
            <Button onClick={() => setConfirmRole(null)} sx={{ textTransform: 'none', fontSize: '0.76rem', color: 'text.secondary', px: 2.2, py: 0.6, borderRadius: 2 }}>Cancel</Button>
            <Button variant="contained" disableElevation onClick={() => { handleGrantRoleAccess(confirmRole); setConfirmRole(null); }} disabled={grantingRole !== null} sx={{ textTransform: 'none', fontSize: '0.76rem', px: 2.2, py: 0.6, borderRadius: 2, backgroundColor: p, color: '#fff', '&:hover': { backgroundColor: s } }}>
              {grantingRole === confirmRole ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Confirm'}
            </Button>
          </Box>
        </Dialog>

        <Dialog open={!!grantSuccessDialog} onClose={() => setGrantSuccessDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden', p: 0 } }}>
          <Box sx={{ bgcolor: alpha(p, 0.08), px: 4, pt: 4, pb: 3.5, textAlign: 'center' }}>
            <Box sx={{ width: 60, height: 60, borderRadius: '50%', bgcolor: alpha(p, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}><CheckCircle sx={{ fontSize: 32, color: p }} /></Box>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: tp, mb: 0.5 }}>Access Granted</Typography>
            <Typography sx={{ fontSize: '0.8rem', color: alpha(tp, 0.55) }}>Default pages successfully assigned</Typography>
          </Box>
          <Box sx={{ px: 3.5, pt: 3, pb: 3.5 }}>
            {[{ label: 'Role', value: grantSuccessDialog?.role?.charAt(0).toUpperCase() + grantSuccessDialog?.role?.slice(1), pill: true }, { label: 'Users updated', value: `${grantSuccessDialog?.usersProcessed} users` }, { label: 'Pages granted', value: `${grantSuccessDialog?.pagesGranted} pages` }].map(({ label, value, pill }) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, bgcolor: alpha(p, 0.08), border: `1px solid ${alpha(p, 0.12)}`, borderRadius: 2.5, mb: 1.25 }}>
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: tp }}>{label}</Typography>
                {pill ? <Chip label={value} size="small" sx={{ bgcolor: roleGrantColors[grantSuccessDialog?.role]?.bgcolor, color: roleGrantColors[grantSuccessDialog?.role]?.color, fontWeight: 700, fontSize: '0.75rem' }} /> : <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: tp }}>{value}</Typography>}
              </Box>
            ))}
            <Button fullWidth variant="contained" onClick={() => setGrantSuccessDialog(null)} sx={{ mt: 1.5, py: 1.5, borderRadius: 2.5, fontWeight: 700, bgcolor: p, color: ac, '&:hover': { bgcolor: s } }}>Done</Button>
          </Box>
        </Dialog>

        {/* ── Page Access Dialog ── */}
        <Dialog open={pageAccessDialog} onClose={closePageAccessDialog} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 4, bgcolor: '#f7f8fa', height: '90vh', maxHeight: 800, overflow: 'hidden' } }}>
          <DialogTitle sx={{ background: `linear-gradient(135deg, ${p} 0%, ${s} 100%)`, color: ac, display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3, fontWeight: 700, flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><Security sx={{ fontSize: 30 }} />Page Access Management</Box>
            <IconButton onClick={closePageAccessDialog} sx={{ color: ac }}><Close /></IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 0, display: 'flex', overflow: 'hidden', flex: 1 }}>
            {selectedUser && (
              <Box sx={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
                {/* Left category sidebar */}
                <Box sx={{ width: 270, flexShrink: 0, bgcolor: '#ffffff', borderRight: `2px solid ${alpha(p, 0.12)}`, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                  <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${alpha(p, 0.1)}`, background: `linear-gradient(135deg, ${alpha(p, 0.07)} 0%, ${alpha(p, 0.02)} 100%)`, flexShrink: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <Avatar src={selectedUser.avatar || ''} alt={selectedUser.fullName} sx={{ bgcolor: p, width: 40, height: 40, fontWeight: 700, fontSize: '0.9rem', border: '2px solid #fff', boxShadow: `0 4px 12px ${alpha(p, 0.2)}` }}>{!selectedUser.avatar && getInitials(selectedUser.fullName)}</Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: tp, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedUser.fullName}</Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: alpha(tp, 0.6), fontFamily: 'monospace' }}>#{selectedUser.employeeNumber} · {selectedUser.role}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ px: 2, py: 1, bgcolor: alpha(p, 0.06), borderRadius: 1.5, border: `1px solid ${alpha(p, 0.15)}` }}>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: '0.55rem', color: alpha(p, 0.5), textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.25 }}>Current Section</Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.78rem', color: p }}>{activeAccessCategory || 'Select a category'}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ flex: 1, overflowY: 'auto', py: 1, '&::-webkit-scrollbar': { width: 3 }, '&::-webkit-scrollbar-thumb': { bgcolor: alpha(p, 0.2), borderRadius: 2 } }}>
                    {!pageAccessLoading && pages.length > 0 && (() => {
                      const groupedPages = pages.reduce((acc, page) => { const desc = page.page_description || 'Uncategorized'; if (!acc[desc]) acc[desc] = []; acc[desc].push(page); return acc; }, {});
                      const order = ['General','System Administration','Registration','Information Management','Attendance Management','Payroll Management','Form','Pages Management','Personal Data Sheets','Uncategorized'];
                      const sortedDescs = Object.keys(groupedPages).sort((a, b) => { const ia = order.indexOf(a); const ib = order.indexOf(b); if (ia !== -1 && ib !== -1) return ia - ib; if (ia !== -1) return -1; if (ib !== -1) return 1; return a.localeCompare(b); });
                      const categoryIcons = { General: <Category sx={{ fontSize: 15 }} />, 'System Administration': <Settings sx={{ fontSize: 15 }} />, Registration: <Assignment sx={{ fontSize: 15 }} />, 'Information Management': <Info sx={{ fontSize: 15 }} />, 'Attendance Management': <Assessment sx={{ fontSize: 15 }} />, 'Payroll Management': <Payment sx={{ fontSize: 15 }} />, Form: <Description sx={{ fontSize: 15 }} />, 'Pages Management': <Pages sx={{ fontSize: 15 }} />, 'Personal Data Sheets': <Folder sx={{ fontSize: 15 }} />, Uncategorized: <FolderSpecial sx={{ fontSize: 15 }} /> };
                      return sortedDescs.map((desc) => {
                        const isActive = activeAccessCategory === desc;
                        const pagesInGroup = groupedPages[desc] || [];
                        const enabledInGroup = pagesInGroup.filter((pg) => pageAccess[pg.id]).length;
                        const allEnabled = enabledInGroup === pagesInGroup.length && pagesInGroup.length > 0;
                        return (
                          <Box key={desc} onClick={() => setActiveAccessCategory(desc)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 1.25, cursor: 'pointer', borderLeft: isActive ? `3px solid ${p}` : '3px solid transparent', bgcolor: isActive ? alpha(p, 0.1) : 'transparent', transition: 'all 0.15s ease', '&:hover': { bgcolor: isActive ? alpha(p, 0.1) : alpha(p, 0.04) } }}>
                            <Box sx={{ color: isActive ? p : alpha(p, 0.35), flexShrink: 0 }}>{categoryIcons[desc] || <FolderSpecial sx={{ fontSize: 15 }} />}</Box>
                            <Typography sx={{ fontSize: '0.82rem', fontWeight: isActive ? 700 : 500, color: isActive ? p : '#6b7280', flex: 1 }}>{desc}</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography sx={{ fontFamily: 'monospace', fontSize: '0.62rem', fontWeight: 700, color: allEnabled ? '#16a34a' : isActive ? p : '#9ca3af' }}>{enabledInGroup}/{pagesInGroup.length}</Typography>
                              {isActive && <ChevronRight sx={{ fontSize: 13, color: alpha(p, 0.4) }} />}
                            </Box>
                          </Box>
                        );
                      });
                    })()}
                  </Box>
                  <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${alpha(p, 0.1)}`, flexShrink: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: tp }}>Toggle All Pages</Typography>
                      <Switch size="small" checked={!pageAccessLoading && pages.length > 0 && Object.values(pageAccess).every((v) => v === true)} onChange={(e) => { const enableAll = e.target.checked; pages.forEach((page) => { if (pageAccess[page.id] !== enableAll) handleTogglePageAccess(page.id, !enableAll); }); }} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#16a34a' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#16a34a' } }} />
                    </Box>
                  </Box>
                </Box>

                {/* Center pages panel */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', bgcolor: '#f7f8fa' }}>
                  {pageAccessLoading ? (
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Box sx={{ textAlign: 'center' }}><CircularProgress sx={{ color: p, mb: 2 }} /><Typography sx={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>Loading page access...</Typography></Box></Box>
                  ) : !activeAccessCategory ? (
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Box sx={{ textAlign: 'center', px: 4 }}><Security sx={{ fontSize: 56, color: alpha(p, 0.15), mb: 2 }} /><Typography sx={{ fontWeight: 700, fontSize: '1rem', color: tp }}>Select a Category</Typography></Box></Box>
                  ) : (() => {
                    const groupedPages = pages.reduce((acc, page) => { const desc = page.page_description || 'Uncategorized'; if (!acc[desc]) acc[desc] = []; acc[desc].push(page); return acc; }, {});
                    const pagesInGroup = groupedPages[activeAccessCategory] || [];
                    const descInfo = getDescriptionColor(activeAccessCategory, settings);
                    const enabledCount = pagesInGroup.filter((pg) => pageAccess[pg.id]).length;
                    return (
                      <Fade in={!!activeAccessCategory} timeout={250} key={activeAccessCategory}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                          <Box sx={{ px: 4, py: 2.5, background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)', borderBottom: `1px solid ${alpha(p, 0.1)}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar sx={{ bgcolor: descInfo.sx.bgcolor, width: 42, height: 42 }}>{React.cloneElement(descInfo.icon, { sx: { color: descInfo.sx.color, fontSize: 20 } })}</Avatar>
                              <Box><Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: tp }}>{activeAccessCategory}</Typography><Typography sx={{ fontSize: '0.7rem', color: '#9ca3af', fontFamily: 'monospace' }}>{enabledCount} of {pagesInGroup.length} enabled</Typography></Box>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: tp }}>Toggle Current</Typography>
                              <Switch size="small" checked={enabledCount === pagesInGroup.length && pagesInGroup.length > 0} onChange={(e) => { const enableAll = e.target.checked; pagesInGroup.forEach((page) => { if (pageAccess[page.id] !== enableAll) handleTogglePageAccess(page.id, !enableAll); }); }} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#16a34a' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#16a34a' } }} />
                            </Box>
                          </Box>
                          <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: alpha(p, 0.2), borderRadius: 2 } }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {pagesInGroup.map((page) => {
                                const userRoleInPageGroup = page.page_group ? page.page_group.split(',').map((g) => g.trim()).includes(selectedUser?.role) : false;
                                const isEnabled = userRoleInPageGroup && !!pageAccess[page.id];
                                return (
                                  <Box key={page.id} sx={{ display: 'flex', alignItems: 'center', px: 3, py: 2, bgcolor: '#ffffff', border: `1px solid ${alpha(p, 0.08)}`, borderRadius: 2, '&:hover': { boxShadow: `0 4px 12px ${alpha(p, 0.1)}` }, transition: 'box-shadow 0.2s' }}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: tp, mb: 0.25 }}>{page.page_name}</Typography>
                                      <Typography sx={{ fontSize: '0.68rem', color: '#9ca3af', fontFamily: 'monospace' }}>ID: {page.id}{page.page_url && ` · ${page.page_url}`}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                                      {accessChangeInProgress[page.id] ? <CircularProgress size={20} sx={{ color: p }} /> : (
                                        <>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, px: 1.5, py: 0.5, borderRadius: '20px', bgcolor: isEnabled ? alpha('#16a34a', 0.1) : userRoleInPageGroup ? alpha('#6b7280', 0.08) : alpha('#ef4444', 0.08), border: `1px solid ${isEnabled ? alpha('#16a34a', 0.3) : userRoleInPageGroup ? alpha('#9ca3af', 0.25) : alpha('#ef4444', 0.3)}` }}>
                                            {isEnabled ? <LockOpen sx={{ fontSize: 11, color: '#16a34a' }} /> : <Lock sx={{ fontSize: 11, color: userRoleInPageGroup ? '#9ca3af' : '#ef4444' }} />}
                                            <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase', color: isEnabled ? '#16a34a' : userRoleInPageGroup ? '#9ca3af' : '#ef4444' }}>{isEnabled ? 'Enabled' : userRoleInPageGroup ? 'Disabled' : 'Not Authorized'}</Typography>
                                          </Box>
                                          <Tooltip title={userRoleInPageGroup ? '' : `Not available for ${selectedUser?.role} - configure in Page Management`}>
                                            <Switch checked={isEnabled} disabled={!userRoleInPageGroup} onChange={() => handleTogglePageAccess(page.id, isEnabled)} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#16a34a' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#16a34a' } }} />
                                          </Tooltip>
                                        </>
                                      )}
                                    </Box>
                                  </Box>
                                );
                              })}
                            </Box>
                          </Box>
                        </Box>
                      </Fade>
                    );
                  })()}
                </Box>

                {/* Right accessible pages panel */}
                <Box sx={{ width: 240, flexShrink: 0, bgcolor: '#ffffff', borderLeft: `3px dashed ${alpha('#16a34a', 0.4)}`, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                  <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${alpha('#16a34a', 0.12)}`, background: `linear-gradient(135deg, ${alpha('#16a34a', 0.07)} 0%, ${alpha('#16a34a', 0.02)} 100%)`, flexShrink: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#16a34a', boxShadow: '0 0 0 3px rgba(22,163,74,0.2)', flexShrink: 0 }} />
                      <Typography sx={{ fontFamily: 'monospace', fontSize: '0.55rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Accessible Pages</Typography>
                    </Box>
                    <Typography sx={{ fontSize: '0.72rem', color: '#6b7280', pl: 2.25 }}>{!pageAccessLoading && pages.length > 0 ? `${pages.filter((pg) => pageAccess[pg.id]).length} of ${pages.length} total` : '—'}</Typography>
                  </Box>
                  <Box sx={{ flex: 1, overflowY: 'auto', py: 1.5, '&::-webkit-scrollbar': { width: 3 }, '&::-webkit-scrollbar-thumb': { bgcolor: alpha('#16a34a', 0.2), borderRadius: 2 } }}>
                    {pages.filter((pg) => pageAccess[pg.id]).length > 0 ? (
                      <Box sx={{ px: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {pages.filter((pg) => pageAccess[pg.id]).map((page) => {
                          const isInActiveCategory = activeAccessCategory && (page.page_description || 'Uncategorized') === activeAccessCategory;
                          return (
                            <Box key={page.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.9, borderRadius: 1.5, bgcolor: isInActiveCategory ? alpha('#16a34a', 0.1) : alpha('#16a34a', 0.04), border: `1px solid ${isInActiveCategory ? alpha('#16a34a', 0.3) : alpha('#16a34a', 0.1)}`, transition: 'all 0.2s' }}>
                              <CheckCircle sx={{ fontSize: 12, color: '#16a34a', flexShrink: 0, opacity: isInActiveCategory ? 1 : 0.6 }} />
                              <Typography sx={{ fontSize: '0.72rem', fontWeight: isInActiveCategory ? 700 : 500, color: isInActiveCategory ? '#15803d' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.page_name}</Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    ) : (
                      <Box sx={{ py: 5, textAlign: 'center', px: 2 }}><Lock sx={{ fontSize: 28, color: alpha('#16a34a', 0.15), mb: 1 }} /><Typography sx={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600 }}>No pages granted yet</Typography></Box>
                    )}
                  </Box>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 2, borderTop: `1px solid ${alpha(p, 0.1)}`, bgcolor: '#ffffff', flexShrink: 0 }}>
            <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 }}>Changes are saved automatically.</Typography></Box>
            <ProfessionalButton onClick={closePageAccessDialog} variant="outlined" sx={{ borderColor: p, color: p, '&:hover': { borderColor: s, bgcolor: alpha(p, 0.05) } }}>Cancel</ProfessionalButton>
            <ProfessionalButton variant="contained" startIcon={<CheckCircle />} onClick={() => { window.dispatchEvent(new CustomEvent('pageAccessUpdated', { detail: { employeeNumber: selectedUser?.employeeNumber } })); setSuccessAction('edit'); setSuccessOpen(true); closePageAccessDialog(); }} sx={{ bgcolor: p, color: ac, '&:hover': { bgcolor: s } }}>Save & Close</ProfessionalButton>
          </DialogActions>
        </Dialog>

        {/* ── User Details Drawer ── */}
        <Drawer anchor="right" open={detailsDrawerOpen} onClose={closeUserDetails} PaperProps={{ sx: { width: isMobile ? '100%' : '520px', bgcolor: ac } }}>
          {selectedUserForDetails && (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 4, background: `linear-gradient(135deg, ${p} 0%, ${s} 100%)`, color: ac }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar src={selectedUserForDetails.avatar || ''} alt={selectedUserForDetails.fullName} sx={{ width: 80, height: 80, bgcolor: ac, color: p, fontWeight: 700, fontSize: '2rem', border: '4px solid rgba(255,255,255,0.8)', boxShadow: '0 8px 20px rgba(0,0,0,0.3)' }}>{!selectedUserForDetails.avatar && getInitials(selectedUserForDetails.fullName)}</Avatar>
                    <Box><Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>{selectedUserForDetails.fullName}</Typography><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{getRoleColor(selectedUserForDetails.role).icon}<Typography variant="body2">{selectedUserForDetails.role}</Typography></Box></Box>
                  </Box>
                  <IconButton onClick={closeUserDetails} sx={{ color: ac }}><Close /></IconButton>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', bgcolor: settings?.backgroundColor || '#FFFFFF', borderBottom: `2px solid ${alpha(p, 0.1)}` }}>
                {['info', 'access'].map((tab) => (
                  <Box key={tab} onClick={() => setActiveTab(tab)} sx={{ flex: 1, p: 2, textAlign: 'center', cursor: 'pointer', borderBottom: activeTab === tab ? `3px solid ${p}` : 'none', color: activeTab === tab ? p : tp, fontWeight: activeTab === tab ? 600 : 500, '&:hover': { bgcolor: alpha(p, 0.05) } }}>
                    {tab === 'info' ? <><Info sx={{ mr: 1, verticalAlign: 'middle' }} />Information</> : <><Key sx={{ mr: 1, verticalAlign: 'middle' }} />Page Access</>}
                  </Box>
                ))}
              </Box>
              <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                {activeTab === 'info' && (
                  <Stack spacing={3}>
                    <GlassCard>
                      <CardHeader title={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><AssignmentInd sx={{ color: p }} /><Typography variant="h6" sx={{ fontWeight: 600, color: tp }}>Personal Information</Typography></Box>} sx={{ bgcolor: alpha(p, 0.05) }} />
                      <CardContent>
                        <Stack spacing={2}>
                          {[{ label: 'Full Name', value: selectedUserForDetails.fullName }, { label: 'Employee Number', value: selectedUserForDetails.employeeNumber }, { label: 'Email Address', value: selectedUserForDetails.email }, { label: 'Last Login', value: formatDate(selectedUserForDetails.lastLogin) }].map(({ label, value }) => (
                            <Box key={label}><Typography variant="caption" sx={{ color: tp }}>{label}</Typography><Typography variant="body1" sx={{ fontWeight: 600, color: tp }}>{value}</Typography></Box>
                          ))}
                          <Box><Typography variant="caption" sx={{ color: tp }}>Role</Typography><Box sx={{ mt: 1 }}><Chip label={selectedUserForDetails.role} icon={getRoleColor(selectedUserForDetails.role).icon} sx={{ ...getRoleColor(selectedUserForDetails.role).sx, fontWeight: 600 }} /></Box></Box>
                          <Box><Typography variant="caption" sx={{ color: tp }}>Employment Category</Typography><Box sx={{ mt: 1 }}>{(() => { const info = getEmploymentCategoryInfo(selectedUserForDetails.employmentCategory, selectedUserForDetails.customCategory); return <Chip label={info.label} icon={info.icon} sx={{ color: info.color, bgcolor: info.bgcolor, border: `1px solid ${info.color}`, fontWeight: 600 }} />; })()}</Box></Box>
                        </Stack>
                      </CardContent>
                    </GlassCard>
                  </Stack>
                )}
                {activeTab === 'access' && (
                  <Stack spacing={3}>
                    <GlassCard>
                      <CardHeader title={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><TrendingUp sx={{ color: p }} /><Typography variant="h6" sx={{ fontWeight: 600, color: tp }}>Page Access Summary</Typography></Box>} sx={{ bgcolor: alpha(p, 0.05) }} />
                      <CardContent>
                        <Box sx={{ textAlign: 'center', mb: 3 }}><Typography variant="h2" sx={{ color: p, fontWeight: 700 }}>{selectedUserForDetails.accessiblePages?.length || 0}</Typography><Typography variant="body2" sx={{ color: tp }}>of {selectedUserForDetails.totalPages || 0} pages accessible</Typography></Box>
                        <LinearProgress variant="determinate" value={animatedValue} sx={{ height: 10, borderRadius: 5, bgcolor: alpha(p, 0.1), '& .MuiLinearProgress-bar': { bgcolor: p } }} />
                      </CardContent>
                    </GlassCard>
                  </Stack>
                )}
              </Box>
              <Box sx={{ p: 3, borderTop: `1px solid ${alpha(p, 0.1)}` }}>
                <ProfessionalButton variant="contained" fullWidth startIcon={<Security />} onClick={() => { closeUserDetails(); handlePageAccessClick(selectedUserForDetails); }} sx={{ bgcolor: p, color: ac, py: 1.5, '&:hover': { bgcolor: s } }}>Manage Page Access</ProfessionalButton>
              </Box>
            </Box>
          )}
        </Drawer>

        {/* ── Role Change Dialog ── */}
        <Dialog open={roleChangeDialog} onClose={() => { setRoleChangeDialog(false); setPendingRoleChange(null); }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4, bgcolor: ac } }}>
          <DialogTitle sx={{ background: `linear-gradient(135deg, ${p} 0%, ${s} 100%)`, color: ac, display: 'flex', alignItems: 'center', gap: 2, p: 3, fontWeight: 700 }}><VerifiedUser sx={{ fontSize: 30 }} />Confirm Role Change</DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            {pendingRoleChange && (
              <>
                <Box sx={{ mb: 3, p: 3, borderRadius: 3, border: `1px solid ${alpha(p, 0.2)}`, bgcolor: alpha(ac, 0.5) }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: p, width: 64, height: 64, fontWeight: 700, fontSize: '1.2rem' }}>{getInitials(pendingRoleChange.user.fullName)}</Avatar>
                    <Box><Typography variant="h6" sx={{ fontWeight: 700, color: tp }}>{pendingRoleChange.user.fullName}</Typography><Typography variant="body2" sx={{ color: tp, mt: 1 }}>Employee: <strong>{pendingRoleChange.user.employeeNumber}</strong></Typography></Box>
                  </Box>
                </Box>
                <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }} icon={<Info />}>You are about to change the user's role. This action will be logged in the audit trail.</Alert>
                <Box sx={{ p: 3, borderRadius: 2, bgcolor: alpha(p, 0.05), border: `1px solid ${alpha(p, 0.1)}` }}>
                  <Typography variant="body1" sx={{ mb: 2, fontWeight: 600, color: tp }}>Role Change Details:</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip label={pendingRoleChange.oldRole.toUpperCase()} size="small" sx={{ ...getRoleColor(pendingRoleChange.oldRole).sx, fontWeight: 600 }} />
                    <Typography sx={{ color: tp }}>→</Typography>
                    <Chip label={pendingRoleChange.newRole.toUpperCase()} size="small" sx={{ ...getRoleColor(pendingRoleChange.newRole).sx, fontWeight: 600 }} />
                  </Box>
                </Box>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 2 }}>
            <ProfessionalButton onClick={() => { setRoleChangeDialog(false); setPendingRoleChange(null); }} variant="outlined" disabled={roleChangeLoading} sx={{ borderColor: p, color: p }}>Cancel</ProfessionalButton>
            <ProfessionalButton onClick={confirmRoleChange} variant="contained" disabled={roleChangeLoading} startIcon={roleChangeLoading ? <CircularProgress size={20} /> : <CheckCircle />} sx={{ bgcolor: p, color: ac, '&:hover': { bgcolor: s } }}>{roleChangeLoading ? 'Updating...' : 'Confirm Change'}</ProfessionalButton>
          </DialogActions>
        </Dialog>

        {/* ── Edit User Dialog ── */}
        <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4, bgcolor: ac } }}>
          <DialogTitle sx={{ background: `linear-gradient(135deg, ${p} 0%, ${s} 100%)`, color: ac, p: 3, fontWeight: 700 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><EditIcon sx={{ fontSize: 30 }} />Edit User Information</Box>
            {userToEdit && <Typography variant="body2" sx={{ fontWeight: 500, opacity: 0.95, pl: 5.5 }}>Editing: <strong>{userToEdit.employeeNumber}</strong></Typography>}
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            {userToEdit && (
              <>
                <Box sx={{ mb: 3, mt: 2, p: 3, borderRadius: 3, border: `1px solid ${alpha(p, 0.2)}`, bgcolor: alpha(ac, 0.5) }}>
                  <ModernTextField fullWidth label="Employee Number" value={editedEmployeeNumber} onChange={(e) => setEditedEmployeeNumber(e.target.value)} sx={{ mb: 2 }} required />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}><ModernTextField fullWidth label="First Name" value={editedFirstName} onChange={(e) => setEditedFirstName(e.target.value)} required /></Grid>
                    <Grid item xs={12} sm={6}><ModernTextField fullWidth label="Middle Name" value={editedMiddleName} onChange={(e) => setEditedMiddleName(e.target.value)} /></Grid>
                    <Grid item xs={12} sm={6}><ModernTextField fullWidth label="Last Name" value={editedLastName} onChange={(e) => setEditedLastName(e.target.value)} required /></Grid>
                    <Grid item xs={12} sm={6}><ModernTextField fullWidth label="Name Extension" value={editedNameExtension} onChange={(e) => setEditedNameExtension(e.target.value)} /></Grid>
                  </Grid>
                  <ModernTextField fullWidth label="Email" type="email" value={editedEmail} onChange={(e) => setEditedEmail(e.target.value)} sx={{ mt: 2 }} />
                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Employment Category</InputLabel>
                    <Select value={editedEmploymentCategory} label="Employment Category" onChange={(e) => { setEditedEmploymentCategory(e.target.value); if (parseInt(e.target.value) !== 5) setEditedCustomCategory(''); }} sx={{ borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.8)' }}>
                      <ListSubheader>Job Order (JO)</ListSubheader>
                      <MenuItem value={0}><ListItemIcon sx={{ minWidth: 30 }}><Circle sx={{ fontSize: 12, color: '#F57C00' }} /></ListItemIcon>Graduate</MenuItem>
                      <MenuItem value={1}><ListItemIcon sx={{ minWidth: 30 }}><Circle sx={{ fontSize: 12, color: '#E64A19' }} /></ListItemIcon>UnderGrad</MenuItem>
                      <ListSubheader>Regular</ListSubheader>
                      <MenuItem value={2}><ListItemIcon sx={{ minWidth: 30 }}><Circle sx={{ fontSize: 12, color: '#2E7D32' }} /></ListItemIcon>Non-Teaching</MenuItem>
                      <MenuItem value={3}><ListItemIcon sx={{ minWidth: 30 }}><Circle sx={{ fontSize: 12, color: '#1565C0' }} /></ListItemIcon>Teaching (30Hrs)</MenuItem>
                      <MenuItem value={4}><ListItemIcon sx={{ minWidth: 30 }}><Circle sx={{ fontSize: 12, color: '#7B1FA2' }} /></ListItemIcon>Designated (40Hrs)</MenuItem>
                      <ListSubheader>Custom</ListSubheader>
                      <MenuItem value={5}><ListItemIcon sx={{ minWidth: 30 }}><Circle sx={{ fontSize: 12, color: '#00796B' }} /></ListItemIcon>Other (specify)</MenuItem>
                    </Select>
                  </FormControl>
                  {parseInt(editedEmploymentCategory) === 5 && <Fade in><ModernTextField fullWidth label="Custom Category Description *" value={editedCustomCategory} onChange={(e) => setEditedCustomCategory(e.target.value)} sx={{ mt: 2 }} required /></Fade>}
                </Box>
                <Alert severity="info" sx={{ borderRadius: 2 }} icon={<Info />}>Changes will be reflected across all modules and records.</Alert>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 2 }}>
            <ProfessionalButton onClick={() => setEditDialog(false)} variant="outlined" disabled={editLoading} sx={{ borderColor: p, color: p }}>Cancel</ProfessionalButton>
            <ProfessionalButton onClick={handleSaveEdit} variant="contained" disabled={editLoading} startIcon={editLoading ? <CircularProgress size={20} /> : <CheckCircle />} sx={{ bgcolor: p, color: ac, '&:hover': { bgcolor: s } }}>{editLoading ? 'Saving...' : 'Save Changes'}</ProfessionalButton>
          </DialogActions>
        </Dialog>

        {/* ── Bulk Category Dialog ── */}
        <Dialog open={bulkCategoryDialog} onClose={closeBulkCategoryEdit} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4, bgcolor: ac } }}>
          <DialogTitle sx={{ background: `linear-gradient(135deg, ${p} 0%, ${s} 100%)`, color: ac, display: 'flex', alignItems: 'center', gap: 2, p: 3, fontWeight: 700 }}>
            <Category sx={{ fontSize: 30 }} />Bulk Edit Employment Category
            <Box sx={{ ml: 'auto' }}><Chip label={`${selectedEmployeeNumbers.length} selected`} sx={{ bgcolor: alpha(ac, 0.2), color: ac, fontWeight: 700 }} /></Box>
          </DialogTitle>
          <DialogContent sx={{ p: 4, pt: 3 }}>
            <Box sx={{ mb: 3, p: 2, borderRadius: 3, border: `1px solid ${alpha(p, 0.18)}`, bgcolor: alpha(ac, 0.55) }}>
              <Typography variant="body2" sx={{ color: tp, fontWeight: 600 }}>This will apply the selected employment category to all selected employees.</Typography>
            </Box>
            <FormControl fullWidth>
              <InputLabel>Employment Category</InputLabel>
              <Select value={bulkEmploymentCategory} label="Employment Category" onChange={(e) => { setBulkEmploymentCategory(e.target.value); if (parseInt(e.target.value) !== 5) setBulkCustomCategory(''); }} sx={{ borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.9)' }}>
                <ListSubheader>Job Order (JO)</ListSubheader>
                <MenuItem value={0}><ListItemIcon sx={{ minWidth: 30 }}><Circle sx={{ fontSize: 12, color: '#F57C00' }} /></ListItemIcon>Graduate</MenuItem>
                <MenuItem value={1}><ListItemIcon sx={{ minWidth: 30 }}><Circle sx={{ fontSize: 12, color: '#E64A19' }} /></ListItemIcon>UnderGrad</MenuItem>
                <ListSubheader>Regular</ListSubheader>
                <MenuItem value={2}><ListItemIcon sx={{ minWidth: 30 }}><Circle sx={{ fontSize: 12, color: '#2E7D32' }} /></ListItemIcon>Non-Teaching</MenuItem>
                <MenuItem value={3}><ListItemIcon sx={{ minWidth: 30 }}><Circle sx={{ fontSize: 12, color: '#1565C0' }} /></ListItemIcon>Teaching (30Hrs)</MenuItem>
                <MenuItem value={4}><ListItemIcon sx={{ minWidth: 30 }}><Circle sx={{ fontSize: 12, color: '#7B1FA2' }} /></ListItemIcon>Designated (40Hrs)</MenuItem>
                <ListSubheader>Custom</ListSubheader>
                <MenuItem value={5}><ListItemIcon sx={{ minWidth: 30 }}><Circle sx={{ fontSize: 12, color: '#00796B' }} /></ListItemIcon>Other (specify)</MenuItem>
              </Select>
            </FormControl>
            {parseInt(bulkEmploymentCategory) === 5 && <Fade in><ModernTextField fullWidth label="Custom Category Description *" value={bulkCustomCategory} onChange={(e) => setBulkCustomCategory(e.target.value)} sx={{ mt: 2 }} required /></Fade>}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <ProfessionalButton onClick={closeBulkCategoryEdit} variant="outlined" startIcon={<Close />} disabled={bulkEditLoading} sx={{ borderColor: p, color: p }}>Cancel</ProfessionalButton>
            <ProfessionalButton onClick={handleSaveBulkCategoryEdit} variant="contained" disabled={bulkEditLoading} startIcon={bulkEditLoading ? <CircularProgress size={20} /> : <CheckCircle />} sx={{ bgcolor: p, color: ac, '&:hover': { bgcolor: s } }}>{bulkEditLoading ? 'Saving...' : 'Apply to Selected'}</ProfessionalButton>
          </DialogActions>
        </Dialog>

        {/* ── Delete Dialog ── */}
        <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4, bgcolor: ac } }}>
          <DialogTitle sx={{ background: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)', color: 'white', display: 'flex', alignItems: 'center', gap: 2, p: 3, fontWeight: 700 }}><DeleteIcon sx={{ fontSize: 30 }} />Confirm Delete User</DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            {userToDelete && (
              <>
                <Box sx={{ mb: 3, p: 3, borderRadius: 3, border: '1px solid rgba(211,47,47,0.2)', bgcolor: 'rgba(211,47,47,0.05)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: '#d32f2f', width: 64, height: 64, fontWeight: 700, fontSize: '1.2rem', border: '3px solid #fff' }}>{getInitials(userToDelete.fullName)}</Avatar>
                    <Box><Typography variant="h6" sx={{ fontWeight: 700, color: tp }}>{userToDelete.fullName}</Typography><Typography variant="body2" sx={{ color: tp, mt: 1 }}>Employee: <strong>{userToDelete.employeeNumber}</strong></Typography></Box>
                  </Box>
                </Box>
                <Alert severity="warning" sx={{ borderRadius: 2 }} icon={<ErrorOutline />}>
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>Warning: This action cannot be undone!</Typography>
                  <Typography variant="body2">Deleting this user will permanently remove their account and all associated data.</Typography>
                </Alert>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 2 }}>
            <ProfessionalButton onClick={() => setDeleteDialog(false)} variant="outlined" disabled={deleteLoading} sx={{ borderColor: '#666', color: '#666' }}>Cancel</ProfessionalButton>
            <ProfessionalButton onClick={handleConfirmDelete} variant="contained" disabled={deleteLoading} startIcon={deleteLoading ? <CircularProgress size={20} /> : <DeleteForever />} sx={{ bgcolor: '#d32f2f', color: 'white', '&:hover': { bgcolor: '#b71c1c' } }}>{deleteLoading ? 'Deleting...' : 'Delete User'}</ProfessionalButton>
          </DialogActions>
        </Dialog>

        {/* ── Snackbar ── */}
        <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert onClose={() => setSnackbarOpen(false)} severity="error" sx={{ bgcolor: '#d32f2f', color: 'white', '& .MuiAlert-icon': { color: 'white' } }}>{snackbarMessage}</Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default UsersList;