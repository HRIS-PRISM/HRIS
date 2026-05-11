import API_BASE_URL from "../apiConfig";
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders } from "../utils/auth";
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  Alert,
  TextField,
  InputAdornment,
  Chip,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  IconButton,
  Tooltip,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Switch,
  Checkbox,
  Avatar,
  MenuItem,
  Divider,
  LinearProgress,
  Drawer,
  useTheme,
  useMediaQuery,
  CardHeader,
  Stack,
  Fade,
  Backdrop,
  Modal,
  Snackbar,
  Portal,
  ListSubheader,
  ListItemIcon,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab,
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import {
  People,
  Search,
  PersonAdd,
  GroupAdd,
  Email,
  Badge as BadgeIcon,
  Person,
  Visibility,
  Refresh as RefreshIcon,
  AccountCircle,
  Business,
  Security,
  Close,
  Pages,
  Settings,
  FilterList,
  Lock,
  LockOpen,
  AdminPanelSettings,
  SupervisorAccount,
  Work,
  CheckCircle,
  Cancel,
  Info,
  AssignmentInd,
  Key,
  VerifiedUser,
  TrendingUp,
  Shield,
  Assessment,
  Delete as DeleteIcon,
  DeleteForever,
  Edit as EditIcon,
  ErrorOutline,
  Circle,
  Category,
  Assignment,
  Payment,
  Description,
  FolderSpecial,
  Folder,
  ChevronLeft,
  ChevronRight,
  WarningAmberRounded,
  LockReset as LockResetIcon,
  KeyboardArrowUp,
} from "@mui/icons-material";
import SearchIcon from "@mui/icons-material/Search";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import axios from "axios";
import SuccessfulOverlay from "./SuccessfulOverlay";

// ─── Unified Theme Tokens ──────────────────────────────────────────────────────
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

// ─── Styled Primitives ─────────────────────────────────────────────────────────
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

// ─── Shimmer ───────────────────────────────────────────────────────────────────
const shimmerKf = `
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes ulBlink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}
@keyframes ul-fade-up { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
@keyframes umBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes umPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
`;

const Bone = ({ w = '100%', h = 14, r = 6, sx = {} }) => (
  <Box sx={{
    width: w, height: h, borderRadius: r,
    background: 'linear-gradient(90deg, rgba(109,35,35,0.07) 25%, rgba(109,35,35,0.14) 50%, rgba(109,35,35,0.07) 75%)',
    backgroundSize: '800px 100%',
    animation: 'shimmer 1.6s infinite linear',
    flexShrink: 0,
    ...sx,
  }} />
);

// ─── Offline Banner ────────────────────────────────────────────────────────────
const OfflineBanner = ({ visible, retryIn }) => (
  <Fade in={visible} timeout={600} unmountOnExit>
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.5,
      px: 3, py: 1.5, mx: 2, mb: 1.5, borderRadius: 2,
      bgcolor: alpha(T.accent, 0.05), border: `1px solid ${alpha(T.accent, 0.18)}`,
      borderLeft: `4px solid ${alpha(T.accent, 0.45)}`,
    }}>
      <WifiOffIcon sx={{ fontSize: 16, color: alpha(T.accent, 0.5), animation: 'umBounce 2s ease-in-out infinite', flexShrink: 0 }} />
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: alpha(T.accent, 0.75), lineHeight: 1.2 }}>Waiting for connection…</Typography>
        {retryIn > 0 && <Typography sx={{ fontSize: '0.7rem', color: alpha(T.accent, 0.45), mt: 0.3 }}>Retrying in {retryIn}s</Typography>}
      </Box>
      <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: alpha(T.accent, 0.35), animation: 'umPulse 1.8s ease-in-out infinite', flexShrink: 0 }} />
    </Box>
  </Fade>
);

// ─── Wireframe Skeleton ────────────────────────────────────────────────────────
const UsersListWireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box sx={{
      py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 },
      width: '100vw', maxWidth: '100%',
      position: 'relative', left: '63%', transform: 'translateX(-61%)',
      px: { xs: 2, sm: 3, md: 6 },
    }}>
      <Box sx={{ mb: 2, borderRadius: 3, overflow: 'hidden', border: `1px solid ${T.accentBorder}`, animation: 'ulBlink 2s ease-in-out infinite' }}>
        <Box sx={{ p: 3.5, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)', flexShrink: 0 }} />
            <Box><Bone w={200} h={18} sx={{ mb: 1 }} /><Bone w={320} h={11} /></Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}><Bone w={100} h={32} r={8} /><Bone w={160} h={32} r={8} /></Box>
        </Box>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 2, mb: 2 }}>
        {[1,2,3,4,5].map(i => (
          <Box key={i} sx={{ borderRadius: 3, border: `1px solid ${T.accentBorder}`, bgcolor: '#fff', p: 2.5, animation: `ulBlink 2s ease-in-out ${i*0.08}s infinite` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(109,35,35,0.08)' }} />
              <Box><Bone w={40} h={20} sx={{ mb: 0.75 }} /><Bone w={70} h={10} /></Box>
            </Box>
          </Box>
        ))}
      </Box>
      <Box sx={{ borderRadius: 3, border: `1px solid ${T.accentBorder}`, bgcolor: '#fff', overflow: 'hidden', animation: 'ulBlink 2s ease-in-out 0.2s infinite', height: 'calc(100vh - 320px)' }}>
        <Box sx={{ px: 3.5, py: 2.5, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint }}>
          <Bone w={180} h={13} />
        </Box>
        <Box sx={{ p: 3.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1,2,3,4,5].map(i => (
            <Box key={i} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Bone w={36} h={36} r="50%" />
              <Box sx={{ flex: 1 }}><Bone w="50%" h={12} sx={{ mb: 0.75 }} /><Bone w="30%" h={10} /></Box>
              <Bone w={80} h={22} r={11} />
              <Bone w={100} h={22} r={11} />
              <Bone w={70} h={28} r={6} />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  </>
);

// ─── Helpers ───────────────────────────────────────────────────────────────────
const getUserRole = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(atob(base64).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
    return JSON.parse(jsonPayload).role || JSON.parse(jsonPayload).userRole || null;
  } catch { return null; }
};

const useSystemSettings = () => {
  const [settings, setSettings] = useState(() => {
    try {
      const s = localStorage.getItem("systemSettings");
      if (s) { const p = JSON.parse(s); if (p && typeof p === "object") return p; }
    } catch {}
    return { primaryColor: "#894444", secondaryColor: "#6d2323", accentColor: "#FEF9E1", textColor: "#FFFFFF", textPrimaryColor: "#6D2323", textSecondaryColor: "#FEF9E1", hoverColor: "#6D2323", backgroundColor: "#FFFFFF" };
  });
  useEffect(() => {
    (async () => {
      try {
        const url = API_BASE_URL.includes("/api") ? `${API_BASE_URL}/system-settings` : `${API_BASE_URL}/api/system-settings`;
        const r = await axios.get(url);
        if (r.data && typeof r.data === "object") { setSettings(r.data); localStorage.setItem("systemSettings", JSON.stringify(r.data)); }
      } catch {}
    })();
  }, []);
  return settings;
};

const getEmploymentCategoryInfo = (category, customCategory) => {
  switch (parseInt(category)) {
    case 0: return { label: "JO - Graduate",         color: "#F57C00", bgcolor: alpha("#F57C00", 0.1), icon: <Circle sx={{ fontSize: 12 }} /> };
    case 1: return { label: "JO - UnderGrad",         color: "#E64A19", bgcolor: alpha("#E64A19", 0.1), icon: <Circle sx={{ fontSize: 12 }} /> };
    case 2: return { label: "Regular - Non-Teaching", color: "#2E7D32", bgcolor: alpha("#2E7D32", 0.1), icon: <Circle sx={{ fontSize: 12 }} /> };
    case 3: return { label: "Teaching (30Hrs)",        color: "#1565C0", bgcolor: alpha("#1565C0", 0.1), icon: <Circle sx={{ fontSize: 12 }} /> };
    case 4: return { label: "Designated (40Hrs)",      color: "#7B1FA2", bgcolor: alpha("#7B1FA2", 0.1), icon: <Circle sx={{ fontSize: 12 }} /> };
    case 5: return { label: customCategory ? `Other (${String(customCategory).trim()})` : "Other (specify)", color: "#455A64", bgcolor: alpha("#455A64", 0.1), icon: <Circle sx={{ fontSize: 12 }} /> };
    default: return { label: "Not Set", color: "#757575", bgcolor: alpha("#757575", 0.1), icon: <Circle sx={{ fontSize: 12 }} /> };
  }
};

const getCategoryDisplayFromMap = (empCatEntry) => {
  if (!empCatEntry) return null;
  const color = empCatEntry.colorHex || "#757575";
  return {
    label:  empCatEntry.label,
    color,
    bgcolor: alpha(color, 0.1),
    icon:   <Circle sx={{ fontSize: 12 }} />,
  };
};

const getDescriptionColor = (description, settings) => {
  const p = settings?.primaryColor || "#894444";
  const s = settings?.secondaryColor || "#6d2323";
  switch (description?.toLowerCase()) {
    case "general":                return { sx: { bgcolor: alpha(p, 0.15), color: p }, icon: <Category /> };
    case "system administration":  return { sx: { bgcolor: alpha(p, 0.15), color: p }, icon: <Category /> };
    case "registration":           return { sx: { bgcolor: alpha(s, 0.15), color: s }, icon: <Assignment /> };
    case "information management": return { sx: { bgcolor: alpha(p, 0.1),  color: p }, icon: <Info /> };
    case "attendance management":  return { sx: { bgcolor: alpha(p, 0.12), color: p }, icon: <Assessment /> };
    case "payroll management":     return { sx: { bgcolor: alpha(s, 0.12), color: s }, icon: <Payment /> };
    case "form":                   return { sx: { bgcolor: alpha(p, 0.08), color: p }, icon: <Description /> };
    case "pages management":       return { sx: { bgcolor: alpha(p, 0.18), color: p }, icon: <FolderSpecial /> };
    case "personal data sheets":   return { sx: { bgcolor: alpha(s, 0.18), color: s }, icon: <Folder /> };
    default:                       return { sx: { bgcolor: alpha(p, 0.1),  color: p }, icon: <Description /> };
  }
};

const RETRY_DELAYS = [2, 4, 8, 15, 30];

const ModalHeader = ({ icon: Icon, title, subtitle, onClose }) => (
  <Box sx={{
    px: 3.5, py: 2.5, background: T.headerGrad,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    position: 'relative', overflow: 'hidden', flexShrink: 0,
  }}>
    <Box sx={{ position: 'absolute', top: -40, right: -30, width: 160, height: 160, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
      <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon sx={{ fontSize: 18, color: '#fff' }} />
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', lineHeight: 1.2 }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.68)', mt: 0.2 }}>{subtitle}</Typography>}
      </Box>
    </Box>
    {onClose && (
      <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.75)', position: 'relative', zIndex: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
        <Close sx={{ fontSize: 17 }} />
      </IconButton>
    )}
  </Box>
);

const DialogAccentBar = () => (
  <Box sx={{ height: 4, background: `linear-gradient(90deg, ${T.accent} 0%, ${T.accentMid} 60%, ${alpha(T.accent, 0.4)} 100%)` }} />
);

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
const UsersList = () => {
  const detectedRole = getUserRole();
  const isTechnicalUser = detectedRole === "technical";

  const [moduleAuthorized, setModuleAuthorized]             = useState(isTechnicalUser);
  const [confidentialPasswordInput, setConfidentialPasswordInput] = useState("");
  const [openConfidentialPassword, setOpenConfidentialPassword] = useState(!isTechnicalUser);
  const [passwordLoading, setPasswordLoading]               = useState(false);
  const [snackbarOpen, setSnackbarOpen]                     = useState(false);
  const [snackbarMessage, setSnackbarMessage]               = useState("");
  const [userRole, setUserRole]                             = useState(detectedRole);
  const [roleChecked, setRoleChecked]                       = useState(true);
  const [users, setUsers]                                   = useState([]);
  const [filteredUsers, setFilteredUsers]                   = useState([]);
  const [loading, setLoading]                               = useState(false);
  const [searchTerm, setSearchTerm]                         = useState("");
  const [error, setError]                                   = useState("");
  const [page, setPage]                                     = useState(0);
  const [rowsPerPage, setRowsPerPage]                       = useState(10);
  const [refreshing, setRefreshing]                         = useState(false);
  const [offline, setOffline]                               = useState(false);
  const [retryIn, setRetryIn]                               = useState(0);
  const retryTimerRef   = useRef(null);
  const countdownRef    = useRef(null);
  const retryAttemptRef = useRef(0);
  const mountedRef      = useRef(true);
  const [selectedEmployeeNumbers, setSelectedEmployeeNumbers] = useState([]);
  const [bulkCategoryDialog, setBulkCategoryDialog]         = useState(false);
  const [bulkEmploymentCategory, setBulkEmploymentCategory] = useState("");
  const [bulkEditLoading, setBulkEditLoading]               = useState(false);
  const [pageAccessDialog, setPageAccessDialog]             = useState(false);
  const [selectedUser, setSelectedUser]                     = useState(null);
  const [pages, setPages]                                   = useState([]);
  const [pageAccess, setPageAccess]                         = useState({});
  const [pageAccessLoading, setPageAccessLoading]           = useState(false);
  const [roleFilter, setRoleFilter]                         = useState("");
  const [accessChangeInProgress, setAccessChangeInProgress] = useState({});
  const [activeAccessCategory, setActiveAccessCategory]     = useState(null);
  const [detailsDrawerOpen, setDetailsDrawerOpen]           = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState(null);
  const [successOpen, setSuccessOpen]                       = useState(false);
  const [successAction, setSuccessAction]                   = useState("");
  const [activeTab, setActiveTab]                           = useState("info");
  const [animatedValue, setAnimatedValue]                   = useState(0);
  const [roleChangeDialog, setRoleChangeDialog]             = useState(false);
  const [pendingRoleChange, setPendingRoleChange]           = useState(null);
  const [roleChangeLoading, setRoleChangeLoading]           = useState(false);
  const [editDialog, setEditDialog]                         = useState(false);
  const [userToEdit, setUserToEdit]                         = useState(null);
  const [editedEmployeeNumber, setEditedEmployeeNumber]     = useState("");
  const [editedFirstName, setEditedFirstName]               = useState("");
  const [editedMiddleName, setEditedMiddleName]             = useState("");
  const [editedLastName, setEditedLastName]                 = useState("");
  const [editedNameExtension, setEditedNameExtension]       = useState("");
  const [editedEmail, setEditedEmail]                       = useState("");
  const [editedEmploymentCategory, setEditedEmploymentCategory] = useState("");
  const [editedCustomCategory, setEditedCustomCategory]     = useState("");
  const [editLoading, setEditLoading]                       = useState(false);
  const [deleteDialog, setDeleteDialog]                     = useState(false);
  const [userToDelete, setUserToDelete]                     = useState(null);
  const [deleteLoading, setDeleteLoading]                   = useState(false);
  const [grantingRole, setGrantingRole]                     = useState(null);
  const [confirmRole, setConfirmRole]                       = useState(null);
  const [grantSuccessDialog, setGrantSuccessDialog]         = useState(null);
  const roleGrantColors = {
    staff:         { color: "#0F766E", bgcolor: alpha("#0F766E", 0.08) },
    administrator: { color: "#9333EA", bgcolor: alpha("#9333EA", 0.08) },
    superadmin:    { color: "#C2410C", bgcolor: alpha("#C2410C", 0.08) },
  };
  const [categoryFilter, setCategoryFilter]     = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [tableTab, setTableTab]                 = useState(0);
  const [pwMgmtOpen, setPwMgmtOpen]             = useState(false);
  const [pwUsers, setPwUsers]                   = useState([]);
  const [pwFilteredUsers, setPwFilteredUsers]   = useState([]);
  const [pwLoading, setPwLoading]               = useState(false);
  const [pwSearchTerm, setPwSearchTerm]         = useState("");
  const [pwResetting, setPwResetting]           = useState({});
  const [pwErrMessage, setPwErrMessage]         = useState("");
  const [pwSuccessOpen, setPwSuccessOpen]       = useState(false);
  const [pwSuccessAction, setPwSuccessAction]   = useState("");
  const [pwPage, setPwPage]                     = useState(0);
  const [pwRowsPerPage, setPwRowsPerPage]       = useState(10);
  const [pwNavSection, setPwNavSection]         = useState("all");

  const [empCatMap, setEmpCatMap]       = useState({});
  const [typeConfigs, setTypeConfigs]   = useState([]);

  // ─── Scroll-to-top state ───────────────────────────────────────────────────
  const [showScrollTop, setShowScrollTop] = useState(false);

  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const settings = useSystemSettings();

  const isSuperAdmin = userRole === "superadmin" || userRole === "technical";
  const isTechnical  = userRole === "technical";

  const p  = settings?.primaryColor    || "#894444";
  const s  = settings?.secondaryColor  || "#6d2323";
  const ac = settings?.accentColor     || "#FEF9E1";
  const tp = settings?.textPrimaryColor || "#6D2323";

  // ─── Scroll-to-top effect ──────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const EnterpriseCard = useMemo(() => styled(Card)(() => ({
    borderRadius: 12,
    background: '#ffffff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
    border: `1px solid ${alpha(p, 0.1)}`,
    overflow: 'hidden',
    transition: 'box-shadow 0.2s ease',
    '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.09)' },
  })), [p]);

  const CleanTextField = useMemo(() => styled(TextField)(() => ({
    '& .MuiOutlinedInput-root': {
      borderRadius: 8,
      backgroundColor: '#fafafa',
      fontSize: '0.875rem',
      transition: 'all 0.15s ease',
      '& fieldset': { borderColor: '#e5e7eb' },
      '&:hover': { backgroundColor: '#f5f5f5' },
      '&:hover fieldset': { borderColor: alpha(p, 0.35) },
      '&.Mui-focused': { backgroundColor: '#fff', boxShadow: `0 0 0 3px ${alpha(p, 0.12)}` },
      '&.Mui-focused fieldset': { borderColor: p, borderWidth: '1.5px' },
    },
    '& .MuiInputLabel-root': { fontWeight: 500, fontSize: '0.82rem' },
  })), [p]);

  const SharpTableContainer = useMemo(() => styled(TableContainer)(() => ({
    borderRadius: 0,
    overflow: 'hidden',
    border: 'none',
  })), [p]);

  // ─── UPDATED: uniqueDepartments now exposes { code, description } ──────────
  const uniqueDepartments = useMemo(() => {
    const seen = new Map();
    users.forEach((u) => {
      if (u.departmentCode && !seen.has(u.departmentCode)) {
        seen.set(u.departmentCode, u.departmentDescription || u.departmentCode);
      }
    });
    return Array.from(seen.entries())
      .map(([code, description]) => ({ code, description }))
      .sort((a, b) => a.description.localeCompare(b.description));
  }, [users]);

  const properUsers     = useMemo(() => users.filter((u) => u.fullName && u.fullName.trim() !== "" && u.fullName !== "Username"), [users]);
  const incompleteUsers = useMemo(() => users.filter((u) => !u.fullName || u.fullName.trim() === "" || u.fullName === "Username"), [users]);

  // ─── PW modal derived ──────────────────────────────────────────────────────
  const pwProperUsers     = useMemo(() => pwUsers.filter((u) => u.fullName && u.fullName.trim() !== ""), [pwUsers]);
  const pwIncompleteUsers = useMemo(() => pwUsers.filter((u) => !u.fullName || u.fullName.trim() === ""), [pwUsers]);
  const pwSourceUsers     = useMemo(() => {
    if (pwNavSection === "accounts")   return pwProperUsers;
    if (pwNavSection === "incomplete") return pwIncompleteUsers;
    return pwUsers;
  }, [pwNavSection, pwUsers, pwProperUsers, pwIncompleteUsers]);

  useEffect(() => {
    const term   = pwSearchTerm.toLowerCase().trim();
    const result = !term ? pwSourceUsers : pwSourceUsers.filter((u) =>
      (u.fullName || "").toLowerCase().includes(term) ||
      (u.email    || "").toLowerCase().includes(term) ||
      String(u.employeeNumber || "").includes(term));
    setPwFilteredUsers(result);
    setPwPage(0);
  }, [pwSearchTerm, pwSourceUsers]);

  const fetchPwUsers = useCallback(async () => {
    setPwLoading(true); setPwErrMessage("");
    try {
      const res  = await fetch(`${API_BASE_URL}/users/search`, { method: "GET", headers: getAuthHeaders().headers });
      if (!res.ok) { const e = await res.json().catch(() => ({})); setPwErrMessage(e.error || "Failed to fetch users"); setPwUsers([]); return; }
      const data = await res.json();
      setPwUsers(Array.isArray(data) ? data : []);
    } catch { setPwErrMessage("Something went wrong while fetching users."); setPwUsers([]); }
    finally { setPwLoading(false); }
  }, []);

  const handleResetPassword = async (employeeNumber) => {
    setPwResetting((prev) => ({ ...prev, [employeeNumber]: true })); setPwErrMessage("");
    try {
      const res  = await fetch(`${API_BASE_URL}/users/reset-password`, { method: "POST", headers: { ...getAuthHeaders().headers, "Content-Type": "application/json" }, body: JSON.stringify({ employeeNumber }) });
      const data = await res.json();
      if (res.ok) { setPwSuccessAction("reset"); setPwSuccessOpen(true); }
      else { setPwErrMessage(data.error || "Failed to reset password"); }
    } catch { setPwErrMessage("Something went wrong while resetting password."); }
    finally { setPwResetting((prev) => ({ ...prev, [employeeNumber]: false })); }
  };

  const openPwMgmt  = useCallback(() => { setPwMgmtOpen(true); setPwSearchTerm(""); setPwNavSection("all"); setPwPage(0); setPwErrMessage(""); setPwSuccessOpen(false); fetchPwUsers(); }, [fetchPwUsers]);
  const closePwMgmt = useCallback(() => { setPwMgmtOpen(false); setPwErrMessage(""); setPwSuccessOpen(false); }, []);

  const pwPaginatedUsers = pwFilteredUsers.slice(pwPage * pwRowsPerPage, pwPage * pwRowsPerPage + pwRowsPerPage);
  const pwNavCount = (key) => { if (key === "all") return pwUsers.length; if (key === "accounts") return pwProperUsers.length; if (key === "incomplete") return pwIncompleteUsers.length; return 0; };

  const getPwRoleStyle = (role = "") => {
    switch ((role || "").toLowerCase()) {
      case "superadmin":    return { color: T.accent,    bg: T.accentFaint           };
      case "administrator": return { color: T.accentMid, bg: 'rgba(139,69,69,0.08)' };
      case "technical":     return { color: '#1565C0',   bg: '#E3F2FD'              };
      case "staff":         return { color: '#2E7D32',   bg: '#E8F5E9'              };
      default:              return { color: T.muted,     bg: 'rgba(0,0,0,0.05)'     };
    }
  };

  // ─── Auth ──────────────────────────────────────────────────────────────────
  const handleModuleAuthorization = async () => {
    if (!confidentialPasswordInput) { setSnackbarMessage("Please enter an authorized password."); setSnackbarOpen(true); return; }
    setPasswordLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/confidential-password/verify`, { password: confidentialPasswordInput }, getAuthHeaders());
      if (response.data.verified) { setModuleAuthorized(true); setOpenConfidentialPassword(false); setConfidentialPasswordInput(""); fetchUsers(); }
      else { setSnackbarMessage("Password verification failed. Please try again."); setSnackbarOpen(true); setConfidentialPasswordInput(""); }
    } catch (err) { setSnackbarMessage(err.response?.data?.error || "Failed to verify password."); setSnackbarOpen(true); setConfidentialPasswordInput(""); }
    finally { setPasswordLoading(false); }
  };
  const handleModuleAccessCancel = () => navigate("/admin-home");

  const clearRetryTimers = useCallback(() => { if (retryTimerRef.current) clearTimeout(retryTimerRef.current); if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  const fetchEmpCatMap = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const r = await axios.get(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const map = {};
      (Array.isArray(r.data) ? r.data : []).forEach((item) => {
        if (!item.employeeNumber) return;
        let label = "";
        let colorHex = "#757575";
        if (item.parentGroup && item.typeName) {
          label = `${item.parentGroup} | ${item.typeName}`;
          colorHex = item.colorHex || "#757575";
        } else if (item.customCategory && item.customCategory.trim()) {
          label = `Other (${item.customCategory.trim()})`;
        } else if (item.categoryLabel && item.categoryLabel !== "Unassigned") {
          label = item.categoryLabel;
        }
        if (label) {
          map[String(item.employeeNumber)] = { label, colorHex };
        }
      });
      setEmpCatMap(map);
    } catch {}
  }, []);

  const fetchTypeConfigs = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const r = await axios.get(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-type-config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const configs = Array.isArray(r.data) ? r.data : r.data?.flat || [];
      setTypeConfigs(configs);
    } catch {}
  }, []);

  const doFetchUsers = useCallback(async () => {
    const authHeaders = getAuthHeaders();
    const [usersResp, personsResp, empCatsResp, deptAssignResp] = await Promise.all([
      fetch(`${API_BASE_URL}/users`,                                                    { method: "GET", ...authHeaders }),
      fetch(`${API_BASE_URL}/personalinfo/person_table`,                                { method: "GET", ...authHeaders }),
      fetch(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`,             { method: "GET", ...authHeaders }),
      fetch(`${API_BASE_URL}/api/department-assignment`,                                { method: "GET", ...authHeaders }),
    ]);

    if (!usersResp.ok) { const err = await usersResp.json().catch(() => ({})); throw new Error(err.error || "Failed to fetch users"); }

    const usersDataRaw      = await usersResp.json();
    const personsDataRaw    = await personsResp.json().catch(() => []);
    const empCatsDataRaw    = empCatsResp?.ok    ? await empCatsResp.json().catch(() => [])    : [];
    const deptAssignDataRaw = deptAssignResp?.ok ? await deptAssignResp.json().catch(() => []) : [];

    const usersArray      = Array.isArray(usersDataRaw)      ? usersDataRaw      : usersDataRaw.users      || usersDataRaw.data      || [];
    const personsArray    = Array.isArray(personsDataRaw)    ? personsDataRaw    : personsDataRaw.persons   || personsDataRaw.data    || [];
    const empCatsArray    = Array.isArray(empCatsDataRaw)    ? empCatsDataRaw    : empCatsDataRaw.data      || empCatsDataRaw.records || [];
    const deptAssignArray = Array.isArray(deptAssignDataRaw) ? deptAssignDataRaw : deptAssignDataRaw.data   || [];

    const newEmpCatMap = {};
    (empCatsArray || []).forEach((item) => {
      if (!item.employeeNumber) return;
      let label = "";
      let colorHex = "#757575";
      if (item.parentGroup && item.typeName) {
        label = `${item.parentGroup} | ${item.typeName}`;
        colorHex = item.colorHex || "#757575";
      } else if (item.customCategory && item.customCategory.trim()) {
        label = `Other (${item.customCategory.trim()})`;
      } else if (item.categoryLabel && item.categoryLabel !== "Unassigned") {
        label = item.categoryLabel;
      }
      if (label) {
        newEmpCatMap[String(item.employeeNumber)] = { label, colorHex };
      }
    });
    setEmpCatMap(newEmpCatMap);

    const empCatsMap = (empCatsArray || []).reduce((acc, row) => {
      const key = String(row.employeeNumber ?? row.employee_number ?? "");
      if (key) acc[key] = row;
      return acc;
    }, {});

    const deptAssignMap = {};
    (deptAssignArray || []).forEach((a) => {
      if (!a.employeeNumber) return;
      deptAssignMap[String(a.employeeNumber)] = {
        code:        a.code        || null,
        description: a.name        || a.description || null,
      };
    });

    return (usersArray || []).map((user) => {
      const person     = (personsArray || []).find((p) => String(p.agencyEmployeeNum) === String(user.employeeNumber));
      const empCatRow  = empCatsMap[String(user.employeeNumber)] || null;
      const deptAssign = deptAssignMap[String(user.employeeNumber)] || null;

      const fullName = person
        ? `${person.firstName || ""} ${person.middleName || ""} ${person.lastName || ""} ${person.nameExtension || ""}`.trim()
        : user.fullName || user.username || `${user.firstName || ""} ${user.lastName || ""}`.trim();

      const avatar = person?.profile_picture
        ? `${API_BASE_URL}${person.profile_picture}`
        : user.avatar
          ? String(user.avatar).startsWith("http") ? user.avatar : `${API_BASE_URL}${user.avatar}`
          : null;

      return {
        ...user,
        fullName: fullName || "Username",
        avatar: avatar || null,
        personData: person || {},
        employmentCategory: empCatRow?.employmentCategory !== undefined && empCatRow?.employmentCategory !== null
          ? empCatRow.employmentCategory
          : user.employmentCategory !== undefined ? user.employmentCategory : null,
        customCategory: empCatRow?.customCategory ?? empCatRow?.custom_category ?? user.customCategory ?? user.custom_category ?? null,
        empCatLabel:  empCatRow ? (empCatRow.parentGroup && empCatRow.typeName ? `${empCatRow.parentGroup} | ${empCatRow.typeName}` : empCatRow.categoryLabel || null) : null,
        empCatColor:  empCatRow?.colorHex || null,
        departmentCode:        deptAssign?.code        ?? user.departmentCode        ?? null,
        departmentDescription: deptAssign?.description ?? user.departmentDescription ?? null,
      };
    });
  }, []);

  const fetchUsers = useCallback(async (isManualRefresh = false, attemptNum = 0) => {
    clearRetryTimers();
    if (!isManualRefresh && attemptNum === 0) setLoading(true);
    if (isManualRefresh) setRefreshing(true);
    try {
      const merged = await doFetchUsers();
      if (!mountedRef.current) return;
      setUsers(merged); setFilteredUsers(merged); setLoading(false); setRefreshing(false); setOffline(false); setRetryIn(0); retryAttemptRef.current = 0; setError("");
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
      retryTimerRef.current   = setTimeout(() => { if (mountedRef.current) fetchUsers(false, attemptNum + 1); }, delaySeconds * 1000);
    }
  }, [doFetchUsers, clearRetryTimers, users.length]); // eslint-disable-line

  useEffect(() => { mountedRef.current = true; if (isTechnicalUser) { fetchUsers(); fetchTypeConfigs(); } return () => { mountedRef.current = false; clearRetryTimers(); }; }, []); // eslint-disable-line
  useEffect(() => { const h = () => { if (mountedRef.current && offline) { clearRetryTimers(); fetchUsers(false, 0); } }; window.addEventListener("online", h); return () => window.removeEventListener("online", h); }, [offline, fetchUsers, clearRetryTimers]);
  useEffect(() => { if (moduleAuthorized && !isTechnicalUser) { fetchUsers(); fetchTypeConfigs(); } }, [moduleAuthorized]); // eslint-disable-line

  useEffect(() => {
    const sourceUsers = tableTab === 0 ? properUsers : incompleteUsers;
    const filtered    = sourceUsers.filter((user) => {
      const matchesSearch = (user.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(user.employeeNumber || "").includes(searchTerm) ||
        (user.role || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter
        ? (user.role || "").toLowerCase() === roleFilter.toLowerCase()
        : true;

      const matchesCategory = categoryFilter !== ''
        ? (() => {
            const [filterType, filterValue] = categoryFilter.split('||');
            const entry = empCatMap[String(user.employeeNumber)];
            if (!entry) return false;

            if (filterType === 'group') {
              const groupItems = typeConfigs.filter((t) => t.parentGroup === filterValue);
              return groupItems.some((t) => {
                const label = t.parentGroup && t.typeName
                  ? `${t.parentGroup} | ${t.typeName}`
                  : t.typeName || '';
                return entry.label === label;
              });
            }

            const matched = typeConfigs.find((t) => String(t.id) === filterValue);
            if (!matched) return false;
            const matchLabel = matched.parentGroup && matched.typeName
              ? `${matched.parentGroup} | ${matched.typeName}`
              : matched.typeName || '';
            return entry.label === matchLabel;
          })()
        : true;

      // ─── Filter still uses departmentCode as key ───────────────────────────
      const matchesDepartment = departmentFilter !== ""
        ? (user.departmentCode || "") === departmentFilter
        : true;

      return matchesSearch && matchesRole && matchesCategory && matchesDepartment;
    });
    setFilteredUsers(filtered);
    setPage(0);
  }, [searchTerm, roleFilter, categoryFilter, departmentFilter, users, tableTab, properUsers, incompleteUsers, empCatMap, typeConfigs]);

  // ─── Page access handlers ──────────────────────────────────────────────────
  const fetchUserPageAccess = async (user) => {
    try {
      const authHeaders    = getAuthHeaders();
      const accessResponse = await fetch(`${API_BASE_URL}/page_access/${user.employeeNumber}`, { method: "GET", ...authHeaders });
      if (accessResponse.ok) {
        const accessDataRaw = await accessResponse.json();
        const accessData    = Array.isArray(accessDataRaw) ? accessDataRaw : accessDataRaw.data || [];
        const accessMap     = (accessData || []).reduce((acc, curr) => { const privilege = String(curr.page_privilege || "0"); acc[curr.page_id] = privilege !== "0" && privilege !== ""; return acc; }, {});
        const pagesResponse = await fetch(`${API_BASE_URL}/pages`, { method: "GET", ...authHeaders });
        if (pagesResponse.ok) {
          let pagesData      = await pagesResponse.json();
          pagesData          = Array.isArray(pagesData) ? pagesData : pagesData.pages || pagesData.data || [];
          pagesData          = (pagesData || []).sort((a, b) => (a.id || 0) - (b.id || 0));
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
      const authHeaders   = getAuthHeaders();
      const pagesResponse = await fetch(`${API_BASE_URL}/pages`, { method: "GET", ...authHeaders });
      if (pagesResponse.ok) {
        let pagesData = await pagesResponse.json();
        pagesData     = Array.isArray(pagesData) ? pagesData : pagesData.pages || pagesData.data || [];
        pagesData     = (pagesData || []).sort((a, b) => (a.id || 0) - (b.id || 0));
        setPages(pagesData);
        const accessResponse = await fetch(`${API_BASE_URL}/page_access/${user.employeeNumber}`, { method: "GET", ...authHeaders });
        if (accessResponse.ok) {
          const accessDataRaw = await accessResponse.json();
          const accessData    = Array.isArray(accessDataRaw) ? accessDataRaw : accessDataRaw.data || [];
          const accessMap     = (accessData || []).reduce((acc, curr) => { const privilege = String(curr.page_privilege || "0"); acc[curr.page_id] = privilege !== "0" && privilege !== ""; return acc; }, {});
          setPageAccess(accessMap);
          if (pagesData.length > 0) {
            const grouped = pagesData.reduce((acc, page) => { const desc = page.page_description || "Uncategorized"; acc[desc] = true; return acc; }, {});
            const order   = ["General","System Administration","Registration","Information Management","Attendance Management","Payroll Management","Form","Pages Management","Personal Data Sheets","Uncategorized"];
            const descriptions = Object.keys(grouped).sort((a, b) => { const ia = order.indexOf(a); const ib = order.indexOf(b); if (ia !== -1 && ib !== -1) return ia - ib; if (ia !== -1) return -1; if (ib !== -1) return 1; return a.localeCompare(b); });
            setActiveAccessCategory(descriptions[0] || "General");
          }
        } else { setPageAccess({}); }
      } else { setPages([]); }
    } catch { setError("Failed to load page access data"); }
    finally { setPageAccessLoading(false); }
  };

  const handleTogglePageAccess = async (pageId, currentAccess) => {
    const newAccess = !currentAccess;
    setAccessChangeInProgress((prev) => ({ ...prev, [pageId]: true }));
    try {
      const authHeaders = getAuthHeaders();
      if (currentAccess === false) {
        const existingAccessResponse = await fetch(`${API_BASE_URL}/page_access/${selectedUser.employeeNumber}`, { method: "GET", ...authHeaders });
        if (existingAccessResponse.ok) {
          const existingAccess = await existingAccessResponse.json();
          const existingRecord = (existingAccess || []).find((access) => access.page_id === pageId);
          if (!existingRecord) { await fetch(`${API_BASE_URL}/page_access`,                                          { method: "POST", ...authHeaders, body: JSON.stringify({ employeeNumber: selectedUser.employeeNumber, page_id: pageId, page_privilege: newAccess ? "1" : "0" }) }); }
          else                 { await fetch(`${API_BASE_URL}/page_access/${selectedUser.employeeNumber}/${pageId}`, { method: "PUT",  ...authHeaders, body: JSON.stringify({ page_privilege: newAccess ? "1" : "0" }) }); }
        }
      } else { await fetch(`${API_BASE_URL}/page_access/${selectedUser.employeeNumber}/${pageId}`, { method: "PUT", ...authHeaders, body: JSON.stringify({ page_privilege: newAccess ? "1" : "0" }) }); }
      setPageAccess((prev) => ({ ...prev, [pageId]: newAccess }));
      window.dispatchEvent(new Event("pageAccessUpdated"));
    } catch { setError("Network error while updating page access"); }
    finally { setAccessChangeInProgress((prev) => ({ ...prev, [pageId]: false })); }
  };

  const isPageAuthorizedForRole = (page, role) => {
    const roleKey = String(role || "").trim();
    if (!roleKey) return false;
    const allowed = String(page?.page_group || "")
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);
    return allowed.includes(roleKey);
  };

  const closePageAccessDialog = () => { window.dispatchEvent(new Event("pageAccessUpdated")); setPageAccessDialog(false); setSelectedUser(null); setPages([]); setPageAccess({}); setActiveAccessCategory(null); };
  const openUserDetails  = (user) => { setSelectedUserForDetails(user); setDetailsDrawerOpen(true); setAnimatedValue(0); fetchUserPageAccess(user); };
  const closeUserDetails = () => { setDetailsDrawerOpen(false); setSelectedUserForDetails(null); setActiveTab("info"); setAnimatedValue(0); };

  const handleRoleChange = (user, newRole) => { if (user.role === newRole) return; setPendingRoleChange({ user, oldRole: user.role, newRole }); setRoleChangeDialog(true); };
  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return;
    setRoleChangeLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      const response    = await fetch(`${API_BASE_URL}/users/${pendingRoleChange.user.employeeNumber}/role`, { method: "PUT", ...authHeaders, body: JSON.stringify({ role: pendingRoleChange.newRole }) });
      if (!response.ok) { const e = await response.json().catch(() => ({})); setError(e.error || "Failed to update user role"); setRoleChangeDialog(false); setPendingRoleChange(null); setRoleChangeLoading(false); return; }
      setUsers((prev)         => prev.map((u) => u.employeeNumber === pendingRoleChange.user.employeeNumber ? { ...u, role: pendingRoleChange.newRole } : u));
      setFilteredUsers((prev) => prev.map((u) => u.employeeNumber === pendingRoleChange.user.employeeNumber ? { ...u, role: pendingRoleChange.newRole } : u));
      setSuccessAction("edit"); setSuccessOpen(true); setRoleChangeDialog(false); setPendingRoleChange(null);
    } catch { setError("Network error while updating user role"); }
    finally { setRoleChangeLoading(false); }
  };

  const handleEditUser = (user) => {
    setUserToEdit(user);
    setEditedEmployeeNumber(user.employeeNumber);
    setEditedFirstName(user.firstName || "");
    setEditedMiddleName(user.middleName || "");
    setEditedLastName(user.lastName || "");
    setEditedNameExtension(user.nameExtension || "");
    setEditedEmail(user.email || "");
    const dynamicEntry = empCatMap[String(user.employeeNumber)];
    let resolvedCategoryId = "";
    if (dynamicEntry) {
      const matched = typeConfigs.find((t) => {
        const label = t.parentGroup && t.typeName ? `${t.parentGroup} | ${t.typeName}` : t.typeName || "";
        return label === dynamicEntry.label;
      });
      if (matched) resolvedCategoryId = String(matched.id);
    }
    setEditedEmploymentCategory(resolvedCategoryId);
    setEditedCustomCategory(user.customCategory || user.custom_category || "");
    setEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editedEmployeeNumber || !editedFirstName || !editedLastName) { setError("Employee Number, First Name, and Last Name are required"); return; }
    setEditLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      if (editedEmployeeNumber !== userToEdit.employeeNumber) { const r = await fetch(`${API_BASE_URL}/users/${userToEdit.employeeNumber}/employee-number`, { method: "PUT", ...authHeaders, body: JSON.stringify({ newEmployeeNumber: editedEmployeeNumber }) }); if (!r.ok) { const e = await r.json().catch(() => ({})); setError(e.error || "Failed to update employee number"); setEditLoading(false); return; } }
      const r2 = await fetch(`${API_BASE_URL}/personalinfo/person/${editedEmployeeNumber}`, { method: "PUT", ...authHeaders, body: JSON.stringify({ firstName: editedFirstName, middleName: editedMiddleName || null, lastName: editedLastName, nameExtension: editedNameExtension || null }) });
      if (!r2.ok) { const e = await r2.json().catch(() => ({})); setError(e.error || "Failed to update user name"); setEditLoading(false); return; }
      const currentEmail = (userToEdit.email || "").trim(); const newEmail = (editedEmail || "").trim();
      if (newEmail !== currentEmail) { const r3 = await fetch(`${API_BASE_URL}/users/${editedEmployeeNumber}/email`, { method: "PUT", ...authHeaders, body: JSON.stringify({ email: newEmail || null }) }); if (!r3.ok) { const e = await r3.json().catch(() => ({})); setError(e.error || "Failed to update email"); setEditLoading(false); return; } }
      const newCategory = editedEmploymentCategory;
      if (newCategory !== "") {
        const categoryId = parseInt(newCategory, 10);
        const checkResponse = await fetch(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${editedEmployeeNumber}`, { method: "GET", ...authHeaders });
        if (checkResponse.ok) {
          const categoryData = await checkResponse.json();
          await fetch(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${categoryData.id}`, { method: "PUT", ...authHeaders, body: JSON.stringify({ employeeNumber: editedEmployeeNumber, employmentCategory: categoryId, customCategory: "" }) });
        } else {
          await fetch(`${API_BASE_URL}/EmploymentCategoryRoutes/employee-category`, { method: "POST", ...authHeaders, body: JSON.stringify({ employeeNumber: editedEmployeeNumber, employmentCategory: categoryId, customCategory: "" }) });
        }
      }
      await fetchUsers(); setSuccessAction("edit"); setSuccessOpen(true); setEditDialog(false); setUserToEdit(null);
    } catch { setError("Network error while updating user"); }
    finally { setEditLoading(false); }
  };

  const toggleSelectEmployee       = (n) => setSelectedEmployeeNumbers((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]);
  const isEmployeeSelected         = (n) => selectedEmployeeNumbers.includes(n);
  const isAllCurrentPageSelected   = (cur) => cur?.length > 0 && cur.every((u) => selectedEmployeeNumbers.includes(u.employeeNumber));
  const isSomeCurrentPageSelected  = (cur) => { const any = cur?.some((u) => selectedEmployeeNumbers.includes(u.employeeNumber)); const all = cur?.every((u) => selectedEmployeeNumbers.includes(u.employeeNumber)); return any && !all; };
  const toggleSelectAllCurrentPage = (cur) => { if (!cur?.length) return; if (isAllCurrentPageSelected(cur)) { const set = new Set(cur.map((u) => u.employeeNumber)); setSelectedEmployeeNumbers((prev) => prev.filter((n) => !set.has(n))); } else { setSelectedEmployeeNumbers((prev) => { const set = new Set(prev); cur.forEach((u) => set.add(u.employeeNumber)); return Array.from(set); }); } };
  const openBulkCategoryEdit  = () => { if (!selectedEmployeeNumbers.length) { setSnackbarMessage("Please select at least 1 employee."); setSnackbarOpen(true); return; } setBulkEmploymentCategory(""); setBulkCategoryDialog(true); };
  const closeBulkCategoryEdit = () => { setBulkCategoryDialog(false); setBulkEmploymentCategory(""); };
  const handleSaveBulkCategoryEdit = async () => {
    if (bulkEmploymentCategory === "" || bulkEmploymentCategory === null) { setError("Please select an employment category to apply."); return; }
    if (!selectedEmployeeNumbers.length) { setError("No employees selected."); return; }
    setBulkEditLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      const categoryId = parseInt(bulkEmploymentCategory, 10);
      for (const empNo of [...selectedEmployeeNumbers]) {
        const checkResponse = await fetch(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${empNo}`, { method: "GET", ...authHeaders });
        if (checkResponse.ok) {
          const categoryData = await checkResponse.json();
          await fetch(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${categoryData.id}`, {
            method: "PUT", ...authHeaders,
            body: JSON.stringify({ employeeNumber: empNo, employmentCategory: categoryId, customCategory: "" }),
          });
        } else {
          await fetch(`${API_BASE_URL}/EmploymentCategoryRoutes/employee-category`, {
            method: "POST", ...authHeaders,
            body: JSON.stringify({ employeeNumber: empNo, employmentCategory: categoryId, customCategory: "" }),
          });
        }
      }
      await fetchUsers(); setSuccessAction("bulk-edit"); setSuccessOpen(true); setSelectedEmployeeNumbers([]); setBulkCategoryDialog(false);
    } catch (err) { setError(err?.message || "Network error while bulk updating employment category"); }
    finally { setBulkEditLoading(false); }
  };

  const handleDeleteUser   = (user) => { setUserToDelete(user); setDeleteDialog(true); };
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      const response    = await fetch(`${API_BASE_URL}/users/${userToDelete.employeeNumber}`, { method: "DELETE", ...authHeaders });
      if (!response.ok) { const e = await response.json().catch(() => ({})); setError(e.error || "Failed to delete user"); setDeleteLoading(false); return; }
      await fetchUsers(); setSuccessAction("delete"); setSuccessOpen(true); setDeleteDialog(false); setUserToDelete(null);
    } catch { setError("Network error while deleting user"); }
    finally { setDeleteLoading(false); }
  };

  const handleGrantRoleAccess = async (role) => {
    setGrantingRole(role);
    try {
      const authHeaders = getAuthHeaders();
      const response    = await fetch(`${API_BASE_URL}/users/grant-role-access/${role}`, { method: "POST", ...authHeaders });
      const result      = await response.json();
      if (!response.ok) { setError(result.error || `Failed to grant access for role: ${role}`); return; }
      setGrantSuccessDialog({ role, usersProcessed: result.usersProcessed, pagesGranted: result.pagesGranted });
      await fetchUsers();
    } catch { setError("Network error while granting role access"); }
    finally { setGrantingRole(null); }
  };

  const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const formatDate     = (d) => { if (!d) return "N/A"; return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); };
  const getRoleColor   = (role = "") => {
    switch ((role || "").toLowerCase()) {
      case "superadmin":    return { sx: { bgcolor: alpha(p, 0.15), color: p }, icon: <SupervisorAccount /> };
      case "administrator": return { sx: { bgcolor: alpha(s, 0.15), color: s }, icon: <AdminPanelSettings /> };
      case "technical":     return { sx: { bgcolor: alpha(p, 0.15), color: p }, icon: <SupervisorAccount /> };
      case "staff":         return { sx: { bgcolor: alpha(p, 0.1),  color: p }, icon: <Work /> };
      default:              return { sx: { bgcolor: alpha(p, 0.1),  color: p }, icon: <Person /> };
    }
  };
  const getInitials = (n) => { if (!n) return "U"; const parts = n.trim().split(" ").filter(Boolean); if (parts.length === 1) return parts[0][0].toUpperCase(); return (parts[0][0] + parts[1][0]).toUpperCase(); };

  const resolveCategoryDisplay = useCallback((user) => {
    const dynamicEntry = empCatMap[String(user.employeeNumber)];
    if (dynamicEntry) {
      return getCategoryDisplayFromMap(dynamicEntry);
    }
    return getEmploymentCategoryInfo(user.employmentCategory, user.customCategory || user.custom_category);
  }, [empCatMap]);

  const groupedTypeConfigs = useMemo(() => {
    const g = {};
    typeConfigs.filter((t) => t.isActive !== false).forEach((t) => {
      if (!g[t.parentGroup]) g[t.parentGroup] = [];
      g[t.parentGroup].push(t);
    });
    return g;
  }, [typeConfigs]);

  // ─── Guards ────────────────────────────────────────────────────────────────
  if (!moduleAuthorized) {
    return (
      <Modal open={openConfidentialPassword} onClose={handleModuleAccessCancel} disableEscapeKeyDown>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: { xs: '90%', sm: 460 }, borderRadius: 3, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.18)', bgcolor: T.surface }}>
          <Box sx={{ height: 4, background: `linear-gradient(90deg, ${T.accent} 0%, ${T.accentMid} 100%)` }} />
          <Box sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock sx={{ color: T.accent, fontSize: 24 }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: T.text, lineHeight: 1.2 }}>Access Required</Typography>
                <Typography sx={{ fontSize: '0.78rem', color: T.muted, mt: 0.25 }}>User Management · Restricted Module</Typography>
              </Box>
            </Box>
            <Box sx={{ p: 2.5, mb: 3, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderRadius: 2 }}>
              <Typography sx={{ fontSize: '0.82rem', color: T.text, lineHeight: 1.6 }}>Enter the authorized password to access this module. This action will be logged.</Typography>
            </Box>
            <FieldInput autoFocus margin="dense" label="Authorized Password" type="password" fullWidth value={confidentialPasswordInput} onChange={(e) => setConfidentialPasswordInput(e.target.value)} onKeyPress={(e) => { if (e.key === "Enter") handleModuleAuthorization(); }} disabled={passwordLoading} size="small" sx={{ mb: 3 }} />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
              <AccentButton onClick={handleModuleAccessCancel} variant="outlined" disabled={passwordLoading} sx={{ fontSize: '0.82rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>Cancel</AccentButton>
              <AccentButton onClick={handleModuleAuthorization} variant="contained" disabled={passwordLoading} startIcon={passwordLoading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <Lock sx={{ fontSize: 15 }} />}
                sx={{ fontSize: '0.82rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 4px 14px ${alpha(T.accent, 0.35)}`, '&:hover': { bgcolor: T.accentDark }, '&:disabled': { bgcolor: '#ddd' } }}>
                {passwordLoading ? 'Verifying…' : 'Access Module'}
              </AccentButton>
            </Box>
          </Box>
        </Box>
      </Modal>
    );
  }

  if (loading && !refreshing) return <UsersListWireframe />;

  /* ═══════════════════════════════════════════════════════════════
     MAIN RENDER
  ═══════════════════════════════════════════════════════════════ */
  return (
    <Box sx={{
      py: { xs: 1, md: 2 },
      mt: { xs: 0, md: -2 },
      mb: { xs: 1, md: 2 },
      width: '100vw', maxWidth: '100%',
      position: 'relative', left: '63%', transform: 'translateX(-61%)',
      px: { xs: 2, sm: 3, md: 6 },
    }}>
      <style>{shimmerKf}</style>
      <Portal>
        <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />
      </Portal>

      {/* ── Page Header ── */}
      <SectionCard sx={{ mb: 2 }}>
        <Box sx={{
          px: 4, py: 3,
          background: 'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative', overflow: 'hidden',
        }}>
          <Box sx={{ position: 'absolute', top: -50, right: -50,   width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)' }} />
          <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
            <People sx={{ fontSize: 32, color: T.accent }} />
            <Box>
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3 }}>Users Management</Typography>
              <Typography sx={{ fontSize: '0.82rem', color: T.accentMid, fontWeight: 700, opacity: 0.9 }}>Administrative Panel • Accounts · Roles · Page Permissions</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
            <AccentButton variant="contained" startIcon={<LockResetIcon sx={{ fontSize: '15px !important' }} />} onClick={openPwMgmt}
                sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}>
              Password Management
            </AccentButton>
            {isTechnical && (
              <AccentButton variant="contained" startIcon={<Pages sx={{ fontSize: '15px !important' }} />} onClick={() => navigate("/pages-list")}
                sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}>
                Page Management
              </AccentButton>
            )}
          </Box>
        </Box>
      </SectionCard>

      {/* ── Stats Strip ── */}
      <Box sx={{ mb: 2, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 1.5 }}>
        {[
          { icon: AccountCircle,      value: users.length,                                    label: 'Total Users',      accent: T.accent    },
          { icon: SupervisorAccount,  value: users.filter((u) => u.role === 'superadmin').length, label: 'Superadmins',  accent: T.accent    },
          { icon: AdminPanelSettings, value: users.filter((u) => u.role === 'administrator').length, label: 'Admins',   accent: T.accentMid },
          { icon: Work,               value: users.filter((u) => u.role === 'staff').length,   label: 'Staff Members',   accent: T.muted     },
          { icon: Visibility,         value: filteredUsers.length,                              label: 'Filtered Results',accent: T.muted     },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <SectionCard key={i}>
              <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.75 }}>
                <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: alpha(stat.accent, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon sx={{ fontSize: 18, color: stat.accent }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 900, fontSize: '1.35rem', color: T.text, lineHeight: 1 }}>{stat.value}</Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: T.muted, mt: 0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stat.label}</Typography>
                </Box>
              </Box>
            </SectionCard>
          );
        })}
      </Box>

      {/* ── Search & Filter ── */}
      <SectionCard sx={{ mb: 2 }}>
        <Box sx={{ px: 3.5, py: 1.5, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <FilterList sx={{ fontSize: 14, color: T.accent }} />
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.accent }}>Search & Filter</Typography>
          {categoryFilter && (() => {
            const [filterType, filterValue] = categoryFilter.split('||');
            let label = '';
            if (filterType === 'group') {
              label = `All: ${filterValue}`;
            } else {
              const cfg = typeConfigs.find((t) => String(t.id) === filterValue);
              label = cfg ? `${cfg.parentGroup} | ${cfg.typeName}` : filterValue;
            }
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.3, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${T.accentBorder}`, borderRadius: '20px' }}>
                <Circle sx={{ fontSize: 7, color: T.accent }} />
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: T.accent }}>{label}</Typography>
                <IconButton size="small" onClick={() => { setCategoryFilter(''); setPage(0); }} sx={{ p: 0, ml: 0.25, color: T.accent, '&:hover': { bgcolor: 'transparent' } }}>
                  <Close sx={{ fontSize: 11 }} />
                </IconButton>
              </Box>
            );
          })()}
        </Box>
        <Box sx={{ px: 3.5, py: 2.5 }}>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid item xs={12} md={4}>
              <FieldInput fullWidth label="Search Users" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Name, email, employee number or role" size="small"
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: T.faint, fontSize: 16 }} /></InputAdornment> }} />
            </Grid>
            <Grid item xs={6} md={2}>
              <CleanTextField select fullWidth label="Filter by Role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} size="small">
                <MenuItem value="">All Roles</MenuItem>
                <MenuItem value="Superadmin">Superadmin</MenuItem>
                <MenuItem value="Administrator">Administrator</MenuItem>
                <MenuItem value="Technical">Technical</MenuItem>
                <MenuItem value="Staff">Staff</MenuItem>
              </CleanTextField>
            </Grid>

            <Grid item xs={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel shrink sx={{ fontSize: '0.82rem' }}>Employment Category</InputLabel>
                <Select
                  value={categoryFilter}
                  label="Employment Category"
                  onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
                  displayEmpty
                  sx={{
                    borderRadius: 2, bgcolor: '#fafafa', fontSize: '0.875rem',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.accent },
                    '& .MuiSelect-select': { display: 'flex', alignItems: 'center', gap: 0.75 },
                  }}
                  renderValue={(val) => {
                    if (!val) return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Circle sx={{ fontSize: 9, color: T.faint }} />
                        <Typography sx={{ fontSize: '0.8rem', color: T.faint }}>All Categories</Typography>
                      </Box>
                    );
                    const [filterType, filterValue] = val.split('||');
                    if (filterType === 'group') return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Circle sx={{ fontSize: 9, color: T.accent }} />
                        <Typography sx={{ fontSize: '0.8rem', color: T.accent, fontWeight: 700 }}>All: {filterValue}</Typography>
                      </Box>
                    );
                    const cfg = typeConfigs.find((t) => String(t.id) === filterValue);
                    return cfg ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Circle sx={{ fontSize: 9, color: cfg.colorHex }} />
                        <Typography sx={{ fontSize: '0.8rem', color: T.text, fontWeight: 600 }} noWrap>{cfg.parentGroup} | {cfg.typeName}</Typography>
                      </Box>
                    ) : <Typography sx={{ fontSize: '0.8rem' }}>{filterValue}</Typography>;
                  }}
                >
                  <MenuItem value="">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Circle sx={{ fontSize: 8, color: T.faint }} />
                      <Typography sx={{ fontSize: '0.83rem', color: T.muted }}>All Categories</Typography>
                    </Box>
                  </MenuItem>

                  {Object.entries(groupedTypeConfigs).flatMap(([group, items]) => [
                    <ListSubheader
                      key={`hdr-${group}`}
                      sx={{
                        fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em',
                        textTransform: 'uppercase', color: alpha(T.accent, 0.55),
                        lineHeight: '2em', bgcolor: T.accentFaint,
                        display: 'flex', alignItems: 'center', gap: 0.75,
                      }}
                    >
                      <Circle sx={{ fontSize: 7 }} /> {group}
                    </ListSubheader>,

                    <MenuItem key={`group-all-${group}`} value={`group||${group}`} sx={{ py: 0.75, pl: 2.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: alpha(T.accent, 0.35), flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.78rem', color: T.accent, fontStyle: 'italic', fontWeight: 600 }}>
                          All in {group}
                        </Typography>
                      </Box>
                    </MenuItem>,

                    ...items.map((item) => (
                      <MenuItem key={item.id} value={`type||${String(item.id)}`} sx={{ py: 0.75, pl: 3.5 }}>
                        <ListItemIcon sx={{ minWidth: 26 }}>
                          <Circle sx={{ fontSize: 8, color: item.colorHex }} />
                        </ListItemIcon>
                        <Typography sx={{ fontSize: '0.875rem' }}>{item.typeName}</Typography>
                      </MenuItem>
                    )),
                  ])}
                </Select>
              </FormControl>
            </Grid>

            {/* ── UPDATED: Department filter — value=code, label=description ── */}
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: '0.82rem' }}>Department</InputLabel>
                <Select
                  value={departmentFilter}
                  label="Department"
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  sx={{
                    borderRadius: 2, bgcolor: '#fafafa', fontSize: '0.875rem',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.accent },
                  }}
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {uniqueDepartments.map(({ code, description }) => (
                    <MenuItem key={code} value={code}>{description}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      </SectionCard>

      {/* ── Users Table ── */}
      <SectionCard sx={{ overflow: 'hidden' }}>

        <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: T.text }}>Registered Users</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: T.faint, mt: 0.1 }}>
              {searchTerm || roleFilter || categoryFilter !== "" || departmentFilter !== "" ? `Showing ${filteredUsers.length} of ${tableTab === 0 ? properUsers.length : incompleteUsers.length}` : `Total ${users.length} registered users`}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.4, bgcolor: T.surface, border: `1px solid ${T.divider}`, borderRadius: 1.5 }}>
              <VerifiedUser sx={{ fontSize: 11, color: T.faint }} />
              <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Grant Default Access:</Typography>
            </Box>
            {["staff", "administrator", "superadmin"].map((role) => (
              <Tooltip key={role} title={`Grant default access to all ${role} users`}>
                <AccentButton variant="outlined" size="small"
                  startIcon={grantingRole === role ? <CircularProgress size={11} sx={{ color: roleGrantColors[role].color }} /> : null}
                  onClick={() => setConfirmRole(role)} disabled={grantingRole !== null}
                  sx={{ fontSize: '0.68rem', px: 1.25, py: 0.35, height: 26, borderColor: alpha(roleGrantColors[role].color, 0.35), color: roleGrantColors[role].color, bgcolor: roleGrantColors[role].bgcolor, '&:hover': { bgcolor: alpha(roleGrantColors[role].color, 0.15), borderColor: roleGrantColors[role].color, transform: 'none' } }}>
                  {grantingRole === role ? '…' : role.charAt(0).toUpperCase() + role.slice(1)}
                </AccentButton>
              </Tooltip>
            ))}
            {isTechnical && (
              <Tooltip title="Bulk Edit Employment Category">
                <AccentButton variant="outlined" size="small" startIcon={<Category sx={{ fontSize: 13 }} />} onClick={openBulkCategoryEdit} disabled={selectedEmployeeNumbers.length === 0}
                  sx={{ fontSize: '0.68rem', px: 1.25, py: 0.35, height: 26, borderColor: T.accentBorder, color: T.accent, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, transform: 'none' }, '&:disabled': { opacity: 0.45 } }}>
                  Bulk Edit ({selectedEmployeeNumbers.length})
                </AccentButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        <Box sx={{ px: 3.5, borderBottom: `1px solid ${T.divider}`, display: 'flex' }}>
          {[
            { label: 'Accounts',            count: properUsers.length,     color: '#2E7D32', icon: <CheckCircle sx={{ fontSize: 13 }} />         },
            { label: 'Incomplete Accounts', count: incompleteUsers.length, color: '#F57C00', icon: <WarningAmberRounded sx={{ fontSize: 13 }} /> },
          ].map((tab, idx) => (
            <Box key={idx} onClick={() => { setTableTab(idx); setPage(0); setSearchTerm(""); }}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 1.75, cursor: 'pointer', borderBottom: tableTab === idx ? `2.5px solid ${T.accent}` : '2.5px solid transparent', color: tableTab === idx ? T.accent : T.muted, fontWeight: tableTab === idx ? 700 : 500, fontSize: '0.82rem', transition: 'all 0.15s', '&:hover': { color: T.accent } }}>
              {tab.icon}
              <span>{tab.label}</span>
              <Box sx={{ px: 0.9, py: 0.1, bgcolor: tableTab === idx ? T.accentFaint : 'rgba(0,0,0,0.05)', borderRadius: '20px' }}>
                <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: tableTab === idx ? T.accent : T.faint }}>{tab.count}</Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {tableTab === 1 && incompleteUsers.length > 0 && (
          <Box sx={{ px: 3.5, py: 1.25, bgcolor: '#FFF8E1', borderBottom: `1px solid rgba(245,124,0,0.18)`, display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningAmberRounded sx={{ fontSize: 13, color: '#F57C00', flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.72rem', color: '#7c4300', fontStyle: 'italic' }}>These accounts are missing a full name. Use the edit action to link them to an employee record.</Typography>
          </Box>
        )}

        <OfflineBanner visible={offline} retryIn={retryIn} />

        <SharpTableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <TableRow>
                <TableCell sx={{ borderBottom: `2px solid ${T.accentBorder}`, py: 1.5, px: 2, width: 48, bgcolor: alpha(T.accent, 0.03) }}>
                  <Checkbox checked={isAllCurrentPageSelected(paginatedUsers)} indeterminate={isSomeCurrentPageSelected(paginatedUsers)} onChange={() => toggleSelectAllCurrentPage(paginatedUsers)}
                    sx={{ color: T.faint, '&.Mui-checked': { color: T.accent }, '&.MuiCheckbox-indeterminate': { color: T.accent }, p: 0 }} size="small" />
                </TableCell>
                {["Emp. No.", "Full Name", "Email", "Role", "Employment Category", "Department", "Page Access", ...(isTechnical ? ["Actions"] : [])].map((h) => (
                  <TableCell key={h} sx={{ borderBottom: `2px solid ${T.accentBorder}`, py: 1.5, px: 2, fontSize: '0.62rem', fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', bgcolor: alpha(T.accent, 0.03), textAlign: ["Page Access", "Actions"].includes(h) ? 'center' : 'left' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedUsers.length > 0 ? paginatedUsers.map((user, idx) => {
                const categoryInfo = resolveCategoryDisplay(user);
                const isIncomplete = tableTab === 1;
                return (
                  <TableRow key={user.employeeNumber} sx={{ bgcolor: idx % 2 === 0 ? T.rowEven : T.rowOdd, '&:hover': { bgcolor: T.rowHover }, transition: 'background-color 0.12s', borderBottom: `1px solid ${T.divider}` }}>
                    <TableCell sx={{ py: 1.5, px: 2, borderBottom: 'none' }}>
                      <Checkbox checked={isEmployeeSelected(user.employeeNumber)} onChange={() => toggleSelectEmployee(user.employeeNumber)} sx={{ color: T.accentBorder, '&.Mui-checked': { color: T.accent }, p: 0 }} size="small" />
                    </TableCell>
                    <TableCell sx={{ py: 1.5, px: 2, borderBottom: 'none' }}>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: T.text, fontFamily: 'monospace' }}>{user.employeeNumber}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5, px: 2, borderBottom: 'none' }}>
                      {isIncomplete ? (
                        <Box>
                          <Typography sx={{ fontSize: '0.8rem', fontStyle: 'italic', color: T.faint }}>No name on record</Typography>
                          <Box sx={{ display: 'inline-flex', mt: 0.25, px: 1, py: 0.1, bgcolor: '#FFF3E0', border: '1px solid rgba(245,124,0,0.25)', borderRadius: '20px' }}>
                            <Typography sx={{ fontSize: '0.58rem', fontWeight: 800, color: '#F57C00' }}>MISSING</Typography>
                          </Box>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar src={user.avatar || ""} alt={user.fullName} sx={{ width: 34, height: 34, bgcolor: alpha(T.accent, 0.12), color: T.accent, fontWeight: 700, fontSize: '0.78rem', border: `2px solid ${T.accentBorder}` }}>
                            {!user.avatar && getInitials(user.fullName)}
                          </Avatar>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: T.text }}>{user.fullName}</Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell sx={{ py: 1.5, px: 2, borderBottom: 'none' }}>
                      <Box sx={{ px: 1.25, py: 0.35, bgcolor: T.accentFaint, borderRadius: 1.5, border: `1px solid ${T.accentBorder}`, display: 'inline-block', maxWidth: 220 }}>
                        <Typography sx={{ fontSize: '0.72rem', color: T.muted, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email || "—"}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1.5, px: 2, borderBottom: 'none' }}>
                      {user.role === "technical" ? (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.5, py: 0.4, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderRadius: '20px' }}>
                          <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: T.accent }}>TECHNICAL</Typography>
                        </Box>
                      ) : (
                        <Select value={user.role || "staff"} onChange={(e) => handleRoleChange(user, e.target.value)} size="small"
                          sx={{ minWidth: 140, borderRadius: 1.5, bgcolor: '#fafafa', fontSize: '0.82rem', '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accent }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.accent } }}>
                          <MenuItem value="superadmin"    sx={{ fontSize: '0.82rem' }}>Superadmin</MenuItem>
                          <MenuItem value="administrator" sx={{ fontSize: '0.82rem' }}>Administrator</MenuItem>
                          <MenuItem value="staff"         sx={{ fontSize: '0.82rem' }}>Staff</MenuItem>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell sx={{ py: 1.5, px: 2, borderBottom: 'none' }}>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.4, bgcolor: categoryInfo.bgcolor, border: `1px solid ${alpha(categoryInfo.color, 0.3)}`, borderRadius: '20px' }}>
                        <Circle sx={{ fontSize: 7, color: categoryInfo.color }} />
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: categoryInfo.color, whiteSpace: 'nowrap' }}>{categoryInfo.label}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1.5, px: 2, borderBottom: 'none' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Business sx={{ fontSize: 13, color: T.faint }} />
                        <Typography sx={{ fontSize: '0.78rem', color: T.muted }}>{user.departmentDescription || user.departmentCode || "—"}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1.5, px: 2, borderBottom: 'none', textAlign: 'center' }}>
                      <AccentButton variant="outlined" size="small" startIcon={<Security sx={{ fontSize: 13 }} />} onClick={() => handlePageAccessClick(user)}
                        sx={{ fontSize: '0.72rem', px: 1.25, py: 0.35, height: 28, borderColor: T.accentBorder, color: T.accent, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, transform: 'none' } }}>
                        Manage
                      </AccentButton>
                    </TableCell>
                    {isTechnical && (
                      <TableCell sx={{ py: 1.5, px: 2, borderBottom: 'none', textAlign: 'center' }}>
                        <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'center' }}>
                          <Tooltip title="Edit User">
                            <IconButton size="small" onClick={() => handleEditUser(user)} sx={{ width: 30, height: 30, borderRadius: 1.5, bgcolor: T.accentFaint, color: T.accent, '&:hover': { bgcolor: T.accent, color: '#fff' }, transition: 'all 0.15s' }}>
                              <EditIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete User">
                            <IconButton size="small" onClick={() => handleDeleteUser(user)} sx={{ width: 30, height: 30, borderRadius: 1.5, bgcolor: alpha('#ef4444', 0.07), color: '#ef4444', '&:hover': { bgcolor: '#ef4444', color: '#fff' }, transition: 'all 0.15s' }}>
                              <DeleteIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={isTechnical ? 9 : 8} sx={{ textAlign: 'center', py: 10, border: 'none' }}>
                    <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                      <Info sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: T.muted, mb: 0.5 }}>{tableTab === 1 ? 'No Incomplete Accounts' : 'No Users Found'}</Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>Try adjusting your filters</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </SharpTableContainer>

        {filteredUsers.length > 0 && (
          <Box sx={{ px: 2, py: 0.5, borderTop: `1px solid ${T.divider}` }}>
            <TablePagination component="div" count={filteredUsers.length} page={page} onPageChange={(_, np) => setPage(np)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} rowsPerPageOptions={[5, 10, 25, 50, 100]}
              sx={{ '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.78rem', fontWeight: 600 } }} />
          </Box>
        )}
      </SectionCard>

      {/* ── Error overlay ── */}
      {error && (
        <Backdrop open sx={{ zIndex: 9999, backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setError("")}>
          <Fade in timeout={300}>
            <Box onClick={(e) => e.stopPropagation()} sx={{ minWidth: 400, maxWidth: 600 }}>
              <Alert severity="error" icon={<Cancel />} onClose={() => setError("")} sx={{ borderRadius: 3, boxShadow: '0 12px 48px rgba(0,0,0,0.4)', fontSize: '1rem', p: 3 }}>{error}</Alert>
            </Box>
          </Fade>
        </Backdrop>
      )}

      {/* ════════════════════════════════════════════════════════════
          PASSWORD MANAGEMENT MODAL
      ════════════════════════════════════════════════════════════ */}
      <Dialog open={pwMgmtOpen} onClose={closePwMgmt} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, bgcolor: '#f9f5f5', height: '90vh', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}>

        <ModalHeader icon={LockResetIcon} title="Password Management" subtitle={`${pwUsers.length} users registered • Resets password to surname (ALL CAPS)`} onClose={closePwMgmt} />

        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', p: 2.5, gap: 2, minHeight: 0 }}>

          <Box sx={{ display: 'flex', gap: 1.25, flexShrink: 0 }}>
            {[
              { label: `${pwUsers.length} total`,             color: T.accent  },
              { label: `${pwProperUsers.length} complete`,    color: '#2E7D32' },
              { label: `${pwIncompleteUsers.length} missing`, color: '#F57C00' },
            ].map(({ label, color }) => (
              <Box key={label} sx={{ px: 2, py: 0.6, borderRadius: 6, bgcolor: alpha(color, 0.1), border: `1px solid ${alpha(color, 0.22)}` }}>
                <Typography sx={{ fontSize: '0.75rem', color, fontWeight: 700 }}>{label}</Typography>
              </Box>
            ))}
            <Box sx={{ flex: 1 }} />
            <Tooltip title="Refresh Users">
              <IconButton onClick={fetchPwUsers} disabled={pwLoading} sx={{ width: 32, height: 32, border: `1px solid ${T.accentBorder}`, borderRadius: 2, bgcolor: '#fff', '&:hover': { borderColor: T.accent, color: T.accent } }}>
                {pwLoading ? <CircularProgress size={13} sx={{ color: T.accent }} /> : <RefreshIcon sx={{ fontSize: 15 }} />}
              </IconButton>
            </Tooltip>
          </Box>

          {pwErrMessage  && <Fade in><Alert severity="error"   icon={<Cancel />}       onClose={() => setPwErrMessage("")}  sx={{ borderRadius: 2, flexShrink: 0 }}>{pwErrMessage}</Alert></Fade>}
          {pwSuccessOpen && <Fade in><Alert severity="success" icon={<CheckCircle />}  onClose={() => setPwSuccessOpen(false)} sx={{ borderRadius: 2, flexShrink: 0 }}>Password has been reset successfully.</Alert></Fade>}

          <SectionCard sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

            <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <LockResetIcon sx={{ fontSize: 14, color: T.accent }} />
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: T.text }}>Account Records</Typography>
                  {pwNavSection === 'incomplete' && pwIncompleteUsers.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.25, bgcolor: '#FFF3E0', border: '1px solid rgba(245,124,0,0.3)', borderRadius: 20 }}>
                      <WarningAmberRounded sx={{ fontSize: 10, color: '#F57C00' }} />
                      <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#F57C00' }}>{pwIncompleteUsers.length} missing</Typography>
                    </Box>
                  )}
                </Box>
                <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>{pwFilteredUsers.length} of {pwSourceUsers.length} shown</Typography>
              </Box>

              <Tabs value={pwNavSection} onChange={(_, v) => { setPwNavSection(v); setPwSearchTerm(""); setPwPage(0); }}
                sx={{ mb: 1.5, minHeight: 30, '& .MuiTabs-indicator': { backgroundColor: T.accent, height: 2.5, borderRadius: '2px 2px 0 0' } }}>
                {[
                  { key: 'all',        label: 'All',        count: pwUsers.length           },
                  { key: 'accounts',   label: 'Complete',   count: pwProperUsers.length     },
                  { key: 'incomplete', label: 'Incomplete', count: pwIncompleteUsers.length },
                ].map((t) => (
                  <Tab key={t.key} value={t.key}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <span>{t.label}</span>
                        <Box sx={{ px: 0.8, py: 0.1, borderRadius: '20px', bgcolor: pwNavSection === t.key ? alpha(T.accent, 0.12) : 'rgba(0,0,0,0.06)' }}>
                          <Typography sx={{ fontSize: '0.58rem', fontWeight: 900, color: pwNavSection === t.key ? T.accent : T.faint }}>{t.count}</Typography>
                        </Box>
                      </Box>
                    }
                    sx={{ minHeight: 30, py: 0.4, px: 1.25, fontSize: '0.72rem', fontWeight: 600, textTransform: 'none', color: T.muted, '&.Mui-selected': { color: T.accent, fontWeight: 700 }, '&:hover': { color: T.accent, bgcolor: T.accentFaint }, transition: 'all 0.15s' }}
                  />
                ))}
              </Tabs>

              <FieldInput fullWidth size="small" placeholder="Search by name, email, or employee number…" value={pwSearchTerm} onChange={(e) => setPwSearchTerm(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 15, color: T.muted }} /></InputAdornment> }} />
            </Box>

            {pwNavSection === 'incomplete' && pwIncompleteUsers.length > 0 && (
              <Box sx={{ px: 3, py: 1.1, bgcolor: '#FFF8E1', borderBottom: `1px solid rgba(245,124,0,0.18)`, display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                <WarningAmberRounded sx={{ fontSize: 13, color: '#F57C00', flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.7rem', color: '#7c4300', fontStyle: 'italic' }}>
                  These accounts are missing a full name. They can still have their password reset, but should be updated in employee records.
                </Typography>
              </Box>
            )}

            <Box sx={{ flex: 1, overflowY: 'auto', '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 } }}>
              <Table sx={{ minWidth: 600 }} stickyHeader>
                <TableHead>
                  <TableRow>
                    {['Emp. No', 'Full Name', 'Email', 'Role', 'Action'].map((h, i) => (
                      <TableCell key={h} sx={{ fontSize: '0.62rem', fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `2px solid ${T.accentBorder}`, bgcolor: alpha(T.accent, 0.03), py: 1.5, px: 2.5, whiteSpace: 'nowrap', textAlign: i === 4 ? 'center' : 'left' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pwLoading && pwUsers.length === 0 ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <TableRow key={idx} sx={{ bgcolor: idx % 2 === 0 ? T.rowEven : T.rowOdd, borderBottom: `1px solid ${T.divider}` }}>
                        <TableCell sx={{ px: 2.5, py: 1.75 }}><Bone w={64} h={13} r={4} /></TableCell>
                        <TableCell sx={{ px: 2.5, py: 1.75 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><Bone w={36} h={36} r="50%" /><Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}><Bone w={110 + (idx % 3) * 20} h={13} r={4} /><Bone w={60} h={10} r={10} /></Box></Box></TableCell>
                        <TableCell sx={{ px: 2.5, py: 1.75 }}><Bone w={140} h={13} r={4} /></TableCell>
                        <TableCell sx={{ px: 2.5, py: 1.75 }}><Bone w={72} h={22} r={11} /></TableCell>
                        <TableCell sx={{ px: 2.5, py: 1.75, textAlign: 'center' }}><Box sx={{ display: 'flex', justifyContent: 'center' }}><Bone w={72} h={28} r={6} /></Box></TableCell>
                      </TableRow>
                    ))
                  ) : pwPaginatedUsers.length > 0 ? pwPaginatedUsers.map((user, idx) => {
                    const isIncomplete = !user.fullName?.trim();
                    const roleStyle    = getPwRoleStyle(user.role);
                    return (
                      <TableRow key={user.employeeNumber} sx={{ bgcolor: idx % 2 === 0 ? T.rowEven : T.rowOdd, '&:hover': { bgcolor: T.rowHover }, transition: 'background-color 0.12s', borderBottom: `1px solid ${T.divider}` }}>
                        <TableCell sx={{ px: 2.5, py: 1.75 }}>
                          <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: T.muted, fontFamily: 'monospace' }}>#{user.employeeNumber}</Typography>
                        </TableCell>
                        <TableCell sx={{ px: 2.5, py: 1.75 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 34, height: 34, fontSize: '0.75rem', fontWeight: 700, bgcolor: isIncomplete ? alpha('#F57C00', 0.15) : alpha(T.accent, 0.12), color: isIncomplete ? '#F57C00' : T.accent, border: `2px solid ${isIncomplete ? alpha('#F57C00', 0.2) : T.accentBorder}` }}>
                              {isIncomplete ? '?' : getInitials(user.fullName)}
                            </Avatar>
                            {isIncomplete ? (
                              <Box>
                                <Typography sx={{ fontSize: '0.8rem', fontStyle: 'italic', color: T.faint }}>No name on record</Typography>
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', mt: 0.25, px: 1, py: 0.15, bgcolor: '#FFF3E0', border: '1px solid rgba(245,124,0,0.25)', borderRadius: 10 }}>
                                  <Typography sx={{ fontSize: '0.58rem', fontWeight: 900, color: '#F57C00' }}>MISSING</Typography>
                                </Box>
                              </Box>
                            ) : (
                              <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text }}>{user.fullName}</Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ px: 2.5, py: 1.75 }}>
                          <Box sx={{ px: 1.25, py: 0.35, bgcolor: T.accentFaint, borderRadius: 1.5, border: `1px solid ${T.accentBorder}`, display: 'inline-block', maxWidth: 200 }}>
                            <Typography sx={{ fontSize: '0.72rem', color: T.muted, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email || 'N/A'}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ px: 2.5, py: 1.75 }}>
                          <Chip label={(user.role || 'N/A').toUpperCase()} size="small" sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700, bgcolor: roleStyle.bg, color: roleStyle.color, border: `1px solid ${alpha(roleStyle.color, 0.25)}`, borderRadius: '4px' }} />
                        </TableCell>
                        <TableCell sx={{ px: 2.5, py: 1.75, textAlign: 'center' }}>
                          <AccentButton variant="contained" size="small" disabled={pwResetting[user.employeeNumber] || !user.email} onClick={() => handleResetPassword(user.employeeNumber)}
                            startIcon={pwResetting[user.employeeNumber] ? <CircularProgress size={11} sx={{ color: '#fff' }} /> : <LockResetIcon sx={{ fontSize: '13px !important' }} />}
                            sx={{ fontSize: '0.72rem', px: 1.5, height: 28, bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 8px ${alpha(T.accent, 0.28)}`, '&:hover': { bgcolor: T.accentDark }, '&:disabled': { bgcolor: '#ddd !important', color: '#999 !important', boxShadow: 'none !important', transform: 'none !important' } }}>
                            {pwResetting[user.employeeNumber] ? 'Resetting…' : 'Reset'}
                          </AccentButton>
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ textAlign: 'center', py: 8, border: 'none' }}>
                        <Box sx={{ width: 60, height: 60, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                          <LockResetIcon sx={{ fontSize: 28, color: alpha(T.accent, 0.3) }} />
                        </Box>
                        <Typography sx={{ fontWeight: 700, color: T.muted, fontSize: '0.88rem', mb: 0.5 }}>{pwNavSection === 'incomplete' ? 'No Incomplete Accounts' : 'No Users Found'}</Typography>
                        <Typography sx={{ color: T.faint, fontSize: '0.78rem' }}>{pwSearchTerm ? 'Try adjusting your search' : pwNavSection === 'incomplete' ? 'All accounts have a full name on record' : 'No users available'}</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>

            {pwFilteredUsers.length > 0 && (
              <Box sx={{ px: 2, py: 0.5, borderTop: `1px solid ${T.divider}`, flexShrink: 0 }}>
                <TablePagination component="div" count={pwFilteredUsers.length} page={pwPage} onPageChange={(_, np) => setPwPage(np)} rowsPerPage={pwRowsPerPage} onRowsPerPageChange={(e) => { setPwRowsPerPage(parseInt(e.target.value, 10)); setPwPage(0); }} rowsPerPageOptions={[5, 10, 25, 50]}
                  sx={{ '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.78rem', fontWeight: 600 } }} />
              </Box>
            )}
          </SectionCard>
        </Box>
      </Dialog>

      {/* ── Grant confirm dialog ── */}
      <Dialog open={confirmRole !== null} onClose={() => setConfirmRole(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <DialogAccentBar />
        <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: `1px solid ${T.divider}` }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><VerifiedUser sx={{ fontSize: 18, color: T.accent }} /></Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Confirm Access Grant</Typography>
        </Box>
        <Box sx={{ px: 3, py: 2.5 }}>
          <Typography sx={{ fontSize: '0.875rem', mb: 2, lineHeight: 1.65, color: T.text }}>
            Grant default page access to all{" "}
            {confirmRole && <Box component="span" sx={{ fontWeight: 700, px: 1.25, py: 0.3, borderRadius: 1.5, bgcolor: T.accentFaint, color: T.accent, display: 'inline-block', ml: 0.5 }}>{confirmRole.charAt(0).toUpperCase() + confirmRole.slice(1)}</Box>}{" "}
            users?
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.25, px: 3, pb: 2.5 }}>
          <AccentButton onClick={() => setConfirmRole(null)} variant="outlined" sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>Cancel</AccentButton>
          <AccentButton variant="contained" onClick={() => { handleGrantRoleAccess(confirmRole); setConfirmRole(null); }} disabled={grantingRole !== null}
            sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}>
            {grantingRole === confirmRole ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : 'Confirm'}
          </AccentButton>
        </Box>
      </Dialog>

      {/* ── Grant success dialog ── */}
      <Dialog open={!!grantSuccessDialog} onClose={() => setGrantSuccessDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <DialogAccentBar />
        <Box sx={{ px: 4, py: 4, textAlign: 'center' }}>
          <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}><CheckCircle sx={{ fontSize: 26, color: T.accent }} /></Box>
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: T.text, mb: 0.5 }}>Access Granted</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: T.muted }}>Default pages successfully assigned</Typography>
        </Box>
        <Box sx={{ px: 3.5, pb: 3 }}>
          {[
            { label: 'Role',          value: grantSuccessDialog?.role?.charAt(0).toUpperCase() + grantSuccessDialog?.role?.slice(1), pill: true },
            { label: 'Users updated', value: `${grantSuccessDialog?.usersProcessed} users` },
            { label: 'Pages granted', value: `${grantSuccessDialog?.pagesGranted} pages` },
          ].map(({ label, value, pill }) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderRadius: 2, mb: 1 }}>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: T.muted }}>{label}</Typography>
              {pill ? (
                <Chip label={value} size="small" sx={{ bgcolor: roleGrantColors[grantSuccessDialog?.role]?.bgcolor, color: roleGrantColors[grantSuccessDialog?.role]?.color, fontWeight: 700, fontSize: '0.72rem' }} />
              ) : (
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text }}>{value}</Typography>
              )}
            </Box>
          ))}
          <AccentButton fullWidth variant="contained" onClick={() => setGrantSuccessDialog(null)} sx={{ mt: 1.5, bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}>Done</AccentButton>
        </Box>
      </Dialog>

      {/* ── Page Access Dialog ── */}
      <Dialog open={pageAccessDialog} onClose={closePageAccessDialog} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3, bgcolor: '#f7f8fa', height: '90vh', maxHeight: 800, overflow: 'hidden' } }}>
        <ModalHeader icon={Security} title="Page Access Management" subtitle={selectedUser ? `${selectedUser.fullName} · #${selectedUser.employeeNumber}` : ''} onClose={closePageAccessDialog} />
        <DialogContent sx={{ p: 0, display: 'flex', overflow: 'hidden', flex: 1 }}>
          {selectedUser && (
            <Box sx={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
              {/* Left sidebar */}
              <Box sx={{ width: 270, flexShrink: 0, bgcolor: T.surface, borderRight: `1px solid ${T.divider}`, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Avatar src={selectedUser.avatar || ""} alt={selectedUser.fullName} sx={{ bgcolor: T.accent, width: 36, height: 36, fontWeight: 700, fontSize: '0.82rem', border: `2px solid ${T.accentBorder}` }}>{!selectedUser.avatar && getInitials(selectedUser.fullName)}</Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedUser.fullName}</Typography>
                      <Typography sx={{ fontSize: '0.67rem', color: T.faint }}>#{selectedUser.employeeNumber} · {selectedUser.role}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ px: 1.5, py: 0.85, bgcolor: T.accentFaint, borderRadius: 1.5, border: `1px solid ${T.accentBorder}` }}>
                    <Typography sx={{ fontSize: '0.52rem', color: alpha(T.accent, 0.45), textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.2 }}>Current Section</Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: T.accent }}>{activeAccessCategory || 'Select a category'}</Typography>
                  </Box>
                </Box>
                <Box sx={{ flex: 1, overflowY: 'auto', py: 1, '&::-webkit-scrollbar': { width: 3 }, '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                  {!pageAccessLoading && pages.length > 0 && (() => {
                    const groupedPages = pages.reduce((acc, page) => { const desc = page.page_description || "Uncategorized"; if (!acc[desc]) acc[desc] = []; acc[desc].push(page); return acc; }, {});
                    const order        = ["General","System Administration","Registration","Information Management","Attendance Management","Payroll Management","Form","Pages Management","Personal Data Sheets","Uncategorized"];
                    const sortedDescs  = Object.keys(groupedPages).sort((a, b) => { const ia = order.indexOf(a); const ib = order.indexOf(b); if (ia !== -1 && ib !== -1) return ia - ib; if (ia !== -1) return -1; if (ib !== -1) return 1; return a.localeCompare(b); });
                    const categoryIcons = { General: <Category sx={{ fontSize: 13 }} />, "System Administration": <Settings sx={{ fontSize: 13 }} />, Registration: <Assignment sx={{ fontSize: 13 }} />, "Information Management": <Info sx={{ fontSize: 13 }} />, "Attendance Management": <Assessment sx={{ fontSize: 13 }} />, "Payroll Management": <Payment sx={{ fontSize: 13 }} />, Form: <Description sx={{ fontSize: 13 }} />, "Pages Management": <Pages sx={{ fontSize: 13 }} />, "Personal Data Sheets": <Folder sx={{ fontSize: 13 }} />, Uncategorized: <FolderSpecial sx={{ fontSize: 13 }} /> };
                    return sortedDescs.map((desc) => {
                      const isActive       = activeAccessCategory === desc;
                      const pagesInGroup   = groupedPages[desc] || [];
                      const eligiblePages  = pagesInGroup.filter((pg) => isPageAuthorizedForRole(pg, selectedUser?.role));
                      const enabledInGroup = eligiblePages.filter((pg) => pageAccess[pg.id]).length;
                      const allEnabled     = enabledInGroup === eligiblePages.length && eligiblePages.length > 0;
                      return (
                        <Box key={desc} onClick={() => setActiveAccessCategory(desc)} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 3, py: 1, cursor: 'pointer', borderLeft: isActive ? `3px solid ${T.accent}` : '3px solid transparent', bgcolor: isActive ? T.accentFaint : 'transparent', transition: 'all 0.15s', '&:hover': { bgcolor: isActive ? T.accentFaint : T.accentHover } }}>
                          <Box sx={{ color: isActive ? T.accent : T.faint, flexShrink: 0 }}>{categoryIcons[desc] || <FolderSpecial sx={{ fontSize: 13 }} />}</Box>
                          <Typography sx={{ fontSize: '0.8rem', fontWeight: isActive ? 700 : 500, color: isActive ? T.accent : T.muted, flex: 1 }}>{desc}</Typography>
                          <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: allEnabled ? '#16a34a' : isActive ? T.accent : T.faint }}>{enabledInGroup}/{eligiblePages.length}</Typography>
                          {isActive && <ChevronRight sx={{ fontSize: 12, color: alpha(T.accent, 0.35) }} />}
                        </Box>
                      );
                    });
                  })()}
                </Box>
                <Box sx={{ px: 3, py: 1.75, borderTop: `1px solid ${T.divider}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: T.accentFaint }}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: T.text }}>Toggle All</Typography>
                  <Switch size="small" checked={!pageAccessLoading && pages.length > 0 && (() => { const eligible = pages.filter((pg) => isPageAuthorizedForRole(pg, selectedUser?.role)); return eligible.length > 0 && eligible.every((pg) => pageAccess[pg.id] === true); })()} onChange={(e) => { const enableAll = e.target.checked; const eligible = pages.filter((pg) => isPageAuthorizedForRole(pg, selectedUser?.role)); eligible.forEach((page) => { if (pageAccess[page.id] !== enableAll) handleTogglePageAccess(page.id, !enableAll); }); }} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#16a34a' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#16a34a' } }} />
                </Box>
              </Box>
              {/* Center panel */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', bgcolor: '#f7f8fa' }}>
                {pageAccessLoading ? (
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box sx={{ textAlign: 'center' }}><CircularProgress sx={{ color: T.accent, mb: 2 }} /><Typography sx={{ fontSize: '0.85rem', color: T.muted, fontWeight: 600 }}>Loading page access…</Typography></Box>
                  </Box>
                ) : !activeAccessCategory ? (
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box sx={{ textAlign: 'center', px: 4 }}><Security sx={{ fontSize: 48, color: alpha(T.accent, 0.12), mb: 1.5 }} /><Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: T.muted }}>Select a Category</Typography></Box>
                  </Box>
                ) : (() => {
                  const groupedPages  = pages.reduce((acc, page) => { const desc = page.page_description || "Uncategorized"; if (!acc[desc]) acc[desc] = []; acc[desc].push(page); return acc; }, {});
                  const pagesInGroup  = groupedPages[activeAccessCategory] || [];
                  const descInfo      = getDescriptionColor(activeAccessCategory, settings);
                  const eligiblePages = pagesInGroup.filter((pg) => isPageAuthorizedForRole(pg, selectedUser?.role));
                  const enabledCount  = eligiblePages.filter((pg) => pageAccess[pg.id]).length;
                  return (
                    <Fade in={!!activeAccessCategory} timeout={250} key={activeAccessCategory}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Box sx={{ px: 3.5, py: 2.5, bgcolor: T.surface, borderBottom: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: descInfo.sx.bgcolor, width: 36, height: 36 }}>{React.cloneElement(descInfo.icon, { sx: { color: descInfo.sx.color, fontSize: 17 } })}</Avatar>
                            <Box><Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: T.text }}>{activeAccessCategory}</Typography><Typography sx={{ fontSize: '0.68rem', color: T.faint }}>{enabledCount} of {eligiblePages.length} enabled</Typography></Box>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: T.muted }}>Toggle All</Typography>
                            <Switch size="small" checked={enabledCount === eligiblePages.length && eligiblePages.length > 0} onChange={(e) => { const enableAll = e.target.checked; eligiblePages.forEach((page) => { if (pageAccess[page.id] !== enableAll) handleTogglePageAccess(page.id, !enableAll); }); }} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#16a34a' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#16a34a' } }} />
                          </Box>
                        </Box>
                        <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {pagesInGroup.map((page) => {
                              const userRoleInPageGroup = isPageAuthorizedForRole(page, selectedUser?.role);
                              const isEnabled = userRoleInPageGroup && !!pageAccess[page.id];
                              return (
                                <Box key={page.id} sx={{ display: 'flex', alignItems: 'center', px: 3, py: 1.75, bgcolor: T.surface, border: `1px solid ${T.accentBorder}`, borderRadius: 2, '&:hover': { boxShadow: `0 2px 8px rgba(0,0,0,0.06)` }, transition: 'box-shadow 0.15s' }}>
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: T.text, mb: 0.25 }}>{page.page_name}</Typography>
                                    <Typography sx={{ fontSize: '0.67rem', color: T.faint }}>ID: {page.id}{page.page_url && ` · ${page.page_url}`}</Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                                    {accessChangeInProgress[page.id] ? <CircularProgress size={18} sx={{ color: T.accent }} /> : (
                                      <>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.35, borderRadius: '20px', bgcolor: isEnabled ? alpha('#16a34a', 0.08) : userRoleInPageGroup ? alpha('#6b7280', 0.07) : alpha('#ef4444', 0.07), border: `1px solid ${isEnabled ? alpha('#16a34a', 0.25) : userRoleInPageGroup ? alpha('#9ca3af', 0.2) : alpha('#ef4444', 0.25)}` }}>
                                          {isEnabled ? <LockOpen sx={{ fontSize: 10, color: '#16a34a' }} /> : <Lock sx={{ fontSize: 10, color: userRoleInPageGroup ? '#9ca3af' : '#ef4444' }} />}
                                          <Typography sx={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: isEnabled ? '#16a34a' : userRoleInPageGroup ? '#9ca3af' : '#ef4444' }}>{isEnabled ? 'Enabled' : userRoleInPageGroup ? 'Disabled' : 'Not Authorized'}</Typography>
                                        </Box>
                                        <Tooltip title={userRoleInPageGroup ? '' : `Not available for ${selectedUser?.role}`}>
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
              {/* Right accessible pages */}
              <Box sx={{ width: 220, flexShrink: 0, bgcolor: T.surface, borderLeft: `2px dashed ${alpha('#16a34a', 0.3)}`, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${alpha('#16a34a', 0.1)}`, bgcolor: alpha('#16a34a', 0.04), flexShrink: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.4 }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#16a34a', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Accessible Pages</Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.7rem', color: T.muted, pl: 2.25 }}>{!pageAccessLoading && pages.length > 0 ? (() => { const eligible = pages.filter((pg) => isPageAuthorizedForRole(pg, selectedUser?.role)); const enabled = eligible.filter((pg) => pageAccess[pg.id]).length; return `${enabled} of ${eligible.length} total`; })() : '—'}</Typography>
                </Box>
                <Box sx={{ flex: 1, overflowY: 'auto', py: 1.5, '&::-webkit-scrollbar': { width: 3 }, '&::-webkit-scrollbar-thumb': { bgcolor: alpha('#16a34a', 0.2), borderRadius: 2 } }}>
                  {pages.filter((pg) => isPageAuthorizedForRole(pg, selectedUser?.role) && pageAccess[pg.id]).length > 0 ? (
                    <Box sx={{ px: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {pages.filter((pg) => isPageAuthorizedForRole(pg, selectedUser?.role) && pageAccess[pg.id]).map((page) => {
                        const isInActiveCategory = activeAccessCategory && (page.page_description || "Uncategorized") === activeAccessCategory;
                        return (
                          <Box key={page.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.75, borderRadius: 1.5, bgcolor: isInActiveCategory ? alpha('#16a34a', 0.1) : alpha('#16a34a', 0.04), border: `1px solid ${isInActiveCategory ? alpha('#16a34a', 0.25) : alpha('#16a34a', 0.1)}`, transition: 'all 0.15s' }}>
                            <CheckCircle sx={{ fontSize: 10, color: '#16a34a', flexShrink: 0, opacity: isInActiveCategory ? 1 : 0.6 }} />
                            <Typography sx={{ fontSize: '0.72rem', fontWeight: isInActiveCategory ? 700 : 500, color: isInActiveCategory ? '#15803d' : T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.page_name}</Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  ) : (
                    <Box sx={{ py: 5, textAlign: 'center', px: 2 }}>
                      <Lock sx={{ fontSize: 22, color: alpha('#16a34a', 0.15), mb: 1 }} />
                      <Typography sx={{ fontSize: '0.75rem', color: T.faint, fontWeight: 600 }}>No pages granted yet</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1.5, borderTop: `1px solid ${T.divider}`, bgcolor: T.surface, flexShrink: 0 }}>
          <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: '0.72rem', color: T.faint }}>Changes are saved automatically.</Typography></Box>
          <AccentButton onClick={closePageAccessDialog} variant="outlined" sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>Cancel</AccentButton>
          <AccentButton variant="contained" startIcon={<CheckCircle sx={{ fontSize: 15 }} />}
            onClick={() => { window.dispatchEvent(new CustomEvent("pageAccessUpdated", { detail: { employeeNumber: selectedUser?.employeeNumber } })); setSuccessAction("edit"); setSuccessOpen(true); closePageAccessDialog(); }}
            sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}>
            Save & Close
          </AccentButton>
        </DialogActions>
      </Dialog>

      {/* ── User Details Drawer ── */}
      <Drawer anchor="right" open={detailsDrawerOpen} onClose={closeUserDetails} PaperProps={{ sx: { width: isMobile ? '100%' : '500px', bgcolor: '#f7f8fa' } }}>
        {selectedUserForDetails && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ height: 4, background: `linear-gradient(90deg, ${T.accent} 0%, ${T.accentMid} 100%)` }} />
            <Box sx={{ px: 3.5, py: 3, bgcolor: T.surface, borderBottom: `1px solid ${T.divider}` }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar src={selectedUserForDetails.avatar || ""} alt={selectedUserForDetails.fullName} sx={{ width: 58, height: 58, bgcolor: alpha(T.accent, 0.12), color: T.accent, fontWeight: 700, fontSize: '1.25rem', border: `3px solid ${T.accentBorder}` }}>{!selectedUserForDetails.avatar && getInitials(selectedUserForDetails.fullName)}</Avatar>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: T.text, lineHeight: 1.2 }}>{selectedUserForDetails.fullName}</Typography>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', mt: 0.5, px: 1.25, py: 0.25, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderRadius: '20px' }}>
                      <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.accent }}>{(selectedUserForDetails.role || "").toUpperCase()}</Typography>
                    </Box>
                  </Box>
                </Box>
                <IconButton onClick={closeUserDetails} sx={{ color: T.muted, '&:hover': { bgcolor: T.accentFaint } }}><Close /></IconButton>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', bgcolor: T.surface, borderBottom: `1px solid ${T.divider}` }}>
              {['info', 'access'].map((tab) => (
                <Box key={tab} onClick={() => setActiveTab(tab)} sx={{ flex: 1, p: 1.75, textAlign: 'center', cursor: 'pointer', borderBottom: activeTab === tab ? `2.5px solid ${T.accent}` : '2.5px solid transparent', color: activeTab === tab ? T.accent : T.muted, fontWeight: activeTab === tab ? 700 : 500, fontSize: '0.82rem', '&:hover': { bgcolor: T.accentFaint }, transition: 'all 0.15s' }}>
                  {tab === 'info' ? <><Info sx={{ mr: 0.75, fontSize: 15, verticalAlign: 'middle' }} />Information</> : <><Key sx={{ mr: 0.75, fontSize: 15, verticalAlign: 'middle' }} />Page Access</>}
                </Box>
              ))}
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
              {activeTab === 'info' && (
                <Stack spacing={2}>
                  <SectionCard>
                    <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <AssignmentInd sx={{ fontSize: 14, color: T.accent }} />
                      <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: T.accent }}>Personal Information</Typography>
                    </Box>
                    <Box sx={{ p: 2.5 }}>
                      <Stack spacing={1.75}>
                        {[
                          { label: 'Full Name',       value: selectedUserForDetails.fullName        },
                          { label: 'Employee Number', value: `#${selectedUserForDetails.employeeNumber}` },
                          { label: 'Email Address',   value: selectedUserForDetails.email           },
                          { label: 'Last Login',      value: formatDate(selectedUserForDetails.lastLogin) },
                        ].map(({ label, value }) => (
                          <Box key={label} sx={{ pb: 1.5, borderBottom: `1px solid ${T.divider}` }}>
                            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.35 }}>{label}</Typography>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: T.text, fontFamily: label === 'Email Address' ? 'monospace' : undefined }}>{value || '—'}</Typography>
                          </Box>
                        ))}
                        <Box sx={{ pb: 1.5, borderBottom: `1px solid ${T.divider}` }}>
                          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.5 }}>Role</Typography>
                          <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.35, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderRadius: '20px' }}>
                            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: T.accent }}>{(selectedUserForDetails.role || "").toUpperCase()}</Typography>
                          </Box>
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.5 }}>Employment Category</Typography>
                          {(() => {
                            const info = resolveCategoryDisplay(selectedUserForDetails);
                            return (
                              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.35, bgcolor: info.bgcolor, border: `1px solid ${alpha(info.color, 0.3)}`, borderRadius: '20px' }}>
                                <Circle sx={{ fontSize: 7, color: info.color }} />
                                <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: info.color }}>{info.label}</Typography>
                              </Box>
                            );
                          })()}
                        </Box>
                      </Stack>
                    </Box>
                  </SectionCard>
                </Stack>
              )}
              {activeTab === 'access' && (
                <Stack spacing={2}>
                  <SectionCard>
                    <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <TrendingUp sx={{ fontSize: 14, color: T.accent }} />
                      <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: T.accent }}>Page Access Summary</Typography>
                    </Box>
                    <Box sx={{ p: 2.5, textAlign: 'center' }}>
                      <Typography sx={{ fontWeight: 900, fontSize: '3rem', color: T.accent, lineHeight: 1 }}>{selectedUserForDetails.accessiblePages?.length || 0}</Typography>
                      <Typography sx={{ fontSize: '0.78rem', color: T.muted, mt: 0.5, mb: 2.5 }}>of {selectedUserForDetails.totalPages || 0} pages accessible</Typography>
                      <LinearProgress variant="determinate" value={animatedValue} sx={{ height: 8, borderRadius: 4, bgcolor: T.accentFaint, '& .MuiLinearProgress-bar': { bgcolor: T.accent, borderRadius: 4 } }} />
                      <Typography sx={{ fontSize: '0.68rem', color: T.faint, mt: 0.75, textAlign: 'right' }}>{Math.round(animatedValue)}% access</Typography>
                    </Box>
                  </SectionCard>
                </Stack>
              )}
            </Box>
            <Box sx={{ p: 3, borderTop: `1px solid ${T.divider}`, bgcolor: T.surface }}>
              <AccentButton fullWidth variant="contained" startIcon={<Security sx={{ fontSize: 16 }} />} onClick={() => { closeUserDetails(); handlePageAccessClick(selectedUserForDetails); }}
                sx={{ bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}>
                Manage Page Access
              </AccentButton>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* ── Role Change Dialog ── */}
      <Dialog open={roleChangeDialog} onClose={() => { setRoleChangeDialog(false); setPendingRoleChange(null); }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <DialogAccentBar />
        <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: `1px solid ${T.divider}` }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><VerifiedUser sx={{ fontSize: 18, color: T.accent }} /></Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Confirm Role Change</Typography>
        </Box>
        <DialogContent sx={{ p: 3 }}>
          {pendingRoleChange && (
            <>
              <Box sx={{ mb: 2.5, p: 2.5, borderRadius: 2, border: `1px solid ${T.divider}`, bgcolor: T.accentFaint }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: alpha(T.accent, 0.12), color: T.accent, width: 44, height: 44, fontWeight: 700 }}>{getInitials(pendingRoleChange.user.fullName)}</Avatar>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: T.text }}>{pendingRoleChange.user.fullName}</Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: T.muted, mt: 0.2 }}>#{pendingRoleChange.user.employeeNumber}</Typography>
                  </Box>
                </Box>
              </Box>
              <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }} icon={<Info />}>This role change will be logged in the audit trail.</Alert>
              <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: T.muted, mb: 1.25 }}>Role Change Details</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ px: 1.5, py: 0.4, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderRadius: '20px' }}><Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: T.accent }}>{(pendingRoleChange.oldRole || "").toUpperCase()}</Typography></Box>
                  <Typography sx={{ color: T.faint, fontWeight: 700 }}>→</Typography>
                  <Box sx={{ px: 1.5, py: 0.4, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderRadius: '20px' }}><Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: T.accentMid }}>{(pendingRoleChange.newRole || "").toUpperCase()}</Typography></Box>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2.5, gap: 1.25, borderTop: `1px solid ${T.divider}` }}>
          <AccentButton onClick={() => { setRoleChangeDialog(false); setPendingRoleChange(null); }} disabled={roleChangeLoading} variant="outlined" sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>Cancel</AccentButton>
          <AccentButton onClick={confirmRoleChange} variant="contained" disabled={roleChangeLoading} startIcon={roleChangeLoading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <CheckCircle sx={{ fontSize: 14 }} />}
            sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}>
            {roleChangeLoading ? 'Updating…' : 'Confirm Change'}
          </AccentButton>
        </DialogActions>
      </Dialog>

      {/* ── Edit User Dialog ── */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <DialogAccentBar />
        <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: `1px solid ${T.divider}` }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EditIcon sx={{ fontSize: 18, color: T.accent }} /></Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Edit User Information</Typography>
            {userToEdit && <Typography sx={{ fontSize: '0.72rem', color: T.muted, mt: 0.1 }}>#{userToEdit.employeeNumber}</Typography>}
          </Box>
        </Box>
        <DialogContent sx={{ p: 3 }}>
          {userToEdit && (
            <>
              <Box sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${T.divider}`, bgcolor: T.accentFaint, mb: 2.5 }}>
                <FieldInput fullWidth label="Employee Number" value={editedEmployeeNumber} onChange={(e) => setEditedEmployeeNumber(e.target.value)} sx={{ mb: 2 }} required size="small" />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}><FieldInput fullWidth label="First Name"       value={editedFirstName}      onChange={(e) => setEditedFirstName(e.target.value)}      required size="small" /></Grid>
                  <Grid item xs={12} sm={6}><FieldInput fullWidth label="Middle Name"      value={editedMiddleName}     onChange={(e) => setEditedMiddleName(e.target.value)}     size="small" /></Grid>
                  <Grid item xs={12} sm={6}><FieldInput fullWidth label="Last Name"        value={editedLastName}       onChange={(e) => setEditedLastName(e.target.value)}       required size="small" /></Grid>
                  <Grid item xs={12} sm={6}><FieldInput fullWidth label="Name Extension"   value={editedNameExtension}  onChange={(e) => setEditedNameExtension(e.target.value)}  size="small" /></Grid>
                </Grid>
                <FieldInput fullWidth label="Email" type="email" value={editedEmail} onChange={(e) => setEditedEmail(e.target.value)} sx={{ mt: 2 }} size="small" />
                <FormControl fullWidth sx={{ mt: 2 }} size="small">
                  <InputLabel shrink sx={{ fontSize: '0.82rem' }}>Employment Category</InputLabel>
                  {typeConfigs.length === 0 ? (
                    <Box sx={{ p: 2.5, textAlign: 'center', border: `1.5px dashed ${T.accentBorder}`, borderRadius: 2, bgcolor: alpha(T.accent, 0.02), mt: 1 }}>
                      <Typography sx={{ fontSize: '0.78rem', color: T.muted }}>No employment types configured yet.</Typography>
                    </Box>
                  ) : (
                    <Select
                      value={editedEmploymentCategory}
                      label="Employment Category"
                      onChange={(e) => setEditedEmploymentCategory(e.target.value)}
                      displayEmpty
                      sx={{ borderRadius: 2, bgcolor: '#fff', fontSize: '0.875rem', '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.accent } }}
                      renderValue={(val) => {
                        if (!val) return <Typography sx={{ color: T.faint, fontSize: '0.875rem' }}>Select a category…</Typography>;
                        const found = typeConfigs.find((t) => String(t.id) === String(val));
                        if (!found) return val;
                        return (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Circle sx={{ fontSize: 8, color: found.colorHex }} />
                            <Typography sx={{ fontSize: '0.875rem' }}>{found.parentGroup} | {found.typeName}</Typography>
                          </Box>
                        );
                      }}
                    >
                      <MenuItem value="" disabled>
                        <Typography sx={{ color: T.faint, fontSize: '0.875rem' }}>Select a category…</Typography>
                      </MenuItem>
                      {(() => {
                        const grouped = {};
                        typeConfigs.filter((t) => t.isActive !== false).forEach((t) => {
                          if (!grouped[t.parentGroup]) grouped[t.parentGroup] = [];
                          grouped[t.parentGroup].push(t);
                        });
                        return Object.entries(grouped).flatMap(([group, items]) => [
                          <ListSubheader key={`hdr-${group}`} sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: alpha(T.accent, 0.55), lineHeight: '2em', bgcolor: T.accentFaint }}>
                            {group}
                          </ListSubheader>,
                          ...items.map((item) => (
                            <MenuItem key={item.id} value={String(item.id)} sx={{ py: 1, display: 'flex', alignItems: 'center' }}>
                              <ListItemIcon sx={{ minWidth: 26, display: 'flex', alignItems: 'center' }}>
                                <Circle sx={{ fontSize: 8, color: item.colorHex }} />
                              </ListItemIcon>
                              <Typography sx={{ fontSize: '0.875rem' }}>{item.typeName}</Typography>
                            </MenuItem>
                          )),
                        ]);
                      })()}
                    </Select>
                  )}
                </FormControl>
                {editedEmploymentCategory && (() => {
                  const cfg = typeConfigs.find((t) => String(t.id) === String(editedEmploymentCategory));
                  return cfg ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, px: 1.5, py: 1, borderRadius: 2, bgcolor: alpha(cfg.colorHex, 0.06), border: `1px solid ${alpha(cfg.colorHex, 0.2)}` }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cfg.colorHex, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: cfg.colorHex }}>
                        {cfg.parentGroup} | {cfg.typeName}
                      </Typography>
                    </Box>
                  ) : null;
                })()}
              </Box>
              <Alert severity="info" sx={{ borderRadius: 2 }} icon={<Info />}>Changes will be reflected across all modules and records.</Alert>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2.5, gap: 1.25, borderTop: `1px solid ${T.divider}` }}>
          <AccentButton onClick={() => setEditDialog(false)} disabled={editLoading} variant="outlined" sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>Cancel</AccentButton>
          <AccentButton onClick={handleSaveEdit} variant="contained" disabled={editLoading} startIcon={editLoading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <CheckCircle sx={{ fontSize: 14 }} />}
            sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}>
            {editLoading ? 'Saving…' : 'Save Changes'}
          </AccentButton>
        </DialogActions>
      </Dialog>

      {/* ── Bulk Category Dialog ── */}
      <Dialog open={bulkCategoryDialog} onClose={closeBulkCategoryEdit} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <DialogAccentBar />
        <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: `1px solid ${T.divider}` }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Category sx={{ fontSize: 18, color: T.accent }} /></Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Bulk Edit Employment Category</Typography>
          </Box>
          <Box sx={{ px: 1.5, py: 0.35, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderRadius: '20px' }}>
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: T.accent }}>{selectedEmployeeNumbers.length} selected</Typography>
          </Box>
        </Box>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ mb: 2.5, p: 2, borderRadius: 2, border: `1px solid ${T.divider}`, bgcolor: T.accentFaint }}>
            <Typography sx={{ fontSize: '0.82rem', color: T.muted }}>This will apply the selected category to all selected employees.</Typography>
          </Box>
          {typeConfigs.length === 0 ? (
            <Box sx={{ p: 2.5, textAlign: 'center', border: `1.5px dashed ${T.accentBorder}`, borderRadius: 2, bgcolor: alpha(T.accent, 0.02) }}>
              <Typography sx={{ fontSize: '0.78rem', color: T.muted }}>No employment types configured yet. Set them up in Employment Category Management.</Typography>
            </Box>
          ) : (
            <FormControl fullWidth size="small">
              <Select
                value={bulkEmploymentCategory}
                label="Employment Category"
                onChange={(e) => setBulkEmploymentCategory(e.target.value)}
                displayEmpty
                sx={{ borderRadius: 2, bgcolor: '#fafafa', fontSize: '0.875rem', '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.accent } }}
                renderValue={(val) => {
                  if (!val) return <Typography sx={{ color: T.faint, fontSize: '0.875rem' }}>Select a category…</Typography>;
                  const found = typeConfigs.find((t) => String(t.id) === String(val));
                  if (!found) return val;
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Circle sx={{ fontSize: 8, color: found.colorHex }} />
                      <Typography sx={{ fontSize: '0.875rem' }}>{found.parentGroup} | {found.typeName}</Typography>
                    </Box>
                  );
                }}
              >
                <MenuItem value="" disabled>
                  <Typography sx={{ color: T.faint, fontSize: '0.875rem' }}>Select a category…</Typography>
                </MenuItem>
                {(() => {
                  const grouped = {};
                  typeConfigs.filter((t) => t.isActive !== false).forEach((t) => {
                    if (!grouped[t.parentGroup]) grouped[t.parentGroup] = [];
                    grouped[t.parentGroup].push(t);
                  });
                  return Object.entries(grouped).flatMap(([group, items]) => [
                    <ListSubheader key={`hdr-${group}`} sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: alpha(T.accent, 0.55), lineHeight: '2em', bgcolor: T.accentFaint }}>
                      {group}
                    </ListSubheader>,
                    ...items.map((item) => (
                      <MenuItem key={item.id} value={String(item.id)} sx={{ py: 1, display: 'flex', alignItems: 'center' }}>
                        <ListItemIcon sx={{ minWidth: 26, display: 'flex', alignItems: 'center' }}>
                          <Circle sx={{ fontSize: 8, color: item.colorHex }} />
                        </ListItemIcon>
                        <Typography sx={{ fontSize: '0.875rem' }}>{item.typeName}</Typography>
                      </MenuItem>
                    )),
                  ]);
                })()}
              </Select>
            </FormControl>
          )}
          {bulkEmploymentCategory && (() => {
            const cfg = typeConfigs.find((t) => String(t.id) === String(bulkEmploymentCategory));
            return cfg ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, px: 1.5, py: 1, borderRadius: 2, bgcolor: alpha(cfg.colorHex, 0.06), border: `1px solid ${alpha(cfg.colorHex, 0.2)}` }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cfg.colorHex, flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: cfg.colorHex }}>
                  {cfg.parentGroup} | {cfg.typeName}
                </Typography>
              </Box>
            ) : null;
          })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2.5, gap: 1.25, borderTop: `1px solid ${T.divider}` }}>
          <AccentButton onClick={closeBulkCategoryEdit} startIcon={<Close sx={{ fontSize: 14 }} />} disabled={bulkEditLoading} variant="outlined" sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>Cancel</AccentButton>
          <AccentButton onClick={handleSaveBulkCategoryEdit} variant="contained" disabled={bulkEditLoading} startIcon={bulkEditLoading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <CheckCircle sx={{ fontSize: 14 }} />}
            sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}>
            {bulkEditLoading ? 'Saving…' : 'Apply to Selected'}
          </AccentButton>
        </DialogActions>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <Box sx={{ height: 4, bgcolor: '#ef4444' }} />
        <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: `1px solid ${T.divider}` }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: alpha('#ef4444', 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center' }}><DeleteIcon sx={{ fontSize: 18, color: '#ef4444' }} /></Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Confirm Delete User</Typography>
        </Box>
        <DialogContent sx={{ p: 3 }}>
          {userToDelete && (
            <>
              <Box sx={{ mb: 2.5, p: 2.5, borderRadius: 2, border: `1px solid ${alpha('#ef4444', 0.15)}`, bgcolor: alpha('#ef4444', 0.03) }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: alpha('#ef4444', 0.1), color: '#ef4444', width: 44, height: 44, fontWeight: 700 }}>{getInitials(userToDelete.fullName)}</Avatar>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: T.text }}>{userToDelete.fullName}</Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: T.muted, mt: 0.2 }}>#{userToDelete.employeeNumber}</Typography>
                  </Box>
                </Box>
              </Box>
              <Alert severity="warning" sx={{ borderRadius: 2 }} icon={<ErrorOutline />}>
                <Typography sx={{ fontWeight: 600, mb: 0.5, fontSize: '0.875rem' }}>This action cannot be undone!</Typography>
                <Typography sx={{ fontSize: '0.8rem' }}>Deleting this user will permanently remove their account and all associated data.</Typography>
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2.5, gap: 1.25, borderTop: `1px solid ${T.divider}` }}>
          <AccentButton onClick={() => setDeleteDialog(false)} disabled={deleteLoading} variant="outlined" sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>Cancel</AccentButton>
          <AccentButton onClick={handleConfirmDelete} variant="contained" disabled={deleteLoading} startIcon={deleteLoading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <DeleteForever sx={{ fontSize: 14 }} />}
            sx={{ fontSize: '0.8rem', bgcolor: '#ef4444', color: '#fff', boxShadow: '0 2px 10px rgba(239,68,68,0.3)', '&:hover': { bgcolor: '#dc2626' }, '&:disabled': { bgcolor: '#ddd' } }}>
            {deleteLoading ? 'Deleting…' : 'Delete User'}
          </AccentButton>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnackbarOpen(false)} severity="error" sx={{ borderRadius: 2 }}>{snackbarMessage}</Alert>
      </Snackbar>

      {/* ════════════════════════════════════════════════════════════
          SCROLL TO TOP BUTTON
      ════════════════════════════════════════════════════════════ */}
      <Fade in={showScrollTop} timeout={300}>
        <Tooltip title="Back to top" placement="left">
          <Box
            onClick={scrollToTop}
            sx={{
              position: 'fixed',
              bottom: 5,
              right: 33,
              zIndex: 9999,
              width: 35,
              height: 35,
              borderRadius: '12px',
              bgcolor: T.accent,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: '1.5px solid rgba(255,255,255,0.15)',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: T.accentDark,
                transform: 'translateY(-3px)',
                boxShadow: `0 8px 28px ${alpha(T.accent, 0.5)}`,
              },
              '&:active': {
                transform: 'translateY(-1px)',
              },
            }}
          >
            <KeyboardArrowUp sx={{ fontSize: 25 }} />
          </Box>
        </Tooltip>
      </Fade>

    </Box>
  );
};

export default UsersList;