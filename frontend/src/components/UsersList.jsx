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
  styled,
  alpha,
  Modal,
  Snackbar,
  Portal,
  ListSubheader,
  ListItemIcon,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
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
} from "@mui/icons-material";
import SearchIcon from "@mui/icons-material/Search";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import axios from "axios";
import SuccessfulOverlay from "./SuccessfulOverlay";

/* ─────────────────────────────────────────────────────────────────
   PASSWORD MODAL — design tokens
───────────────────────────────────────────────────────────────── */
const PW_CSS = `
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
  .pw-mono { font-family: Arial, sans-serif !important; }
`;

/* Global font injection */
const GLOBAL_CSS = `
  @keyframes ul-fade-up { from { opacity:0; transform:translateY(12px);} to { opacity:1; transform:translateY(0);} }
  @keyframes ul-shimmer { 0%{background-position:-800px 0} 100%{background-position:800px 0} }
  @keyframes ul-pulse   { 0%,100%{opacity:1} 50%{opacity:.55} }
  @keyframes ul-bounce  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
  @keyframes ul-dot-pulse { 0%,100%{opacity:1} 50%{opacity:.25} }
`;

const PW_P = "#6D2323";
const PW_S = "#8B4545";
const PW_PANEL = "#ffffff";
const PW_BD = "#e2e4e8";
const PW_TXT = "#111827";
const PW_MUTED = "#6b7280";
const PW_SUBTLE = "#f7f8fa";
const PW_SIDEBAR_W = 220;

/* ── PW modal sub-components ── */
const PwFlatCard = ({ children, sx = {} }) => (
  <Box sx={{ background: PW_PANEL, borderRadius: 3, border: `1px solid ${alpha(PW_P, 0.09)}`, boxShadow: "0 4px 24px rgba(0,0,0,0.06)", overflow: "hidden", ...sx }}>
    {children}
  </Box>
);
const PwCardBanner = () => (
  <Box sx={{ height: 6, background: `linear-gradient(90deg, ${PW_P} 0%, ${PW_S} 60%, ${alpha(PW_P, 0.4)} 100%)` }} />
);
const PwSectionHeader = ({ icon: Icon, title, subtitle, action }) => (
  <Box sx={{ px: 4, py: 3, background: "linear-gradient(135deg,#ffffff 0%,#f6f6f6 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap", borderBottom: `1px solid ${PW_BD}` }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      <Avatar sx={{ bgcolor: alpha(PW_P, 0.1), width: 44, height: 44, boxShadow: `0 4px 16px ${alpha(PW_P, 0.12)}` }}>
        <Icon sx={{ color: PW_P, fontSize: 22 }} />
      </Avatar>
      <Box>
        <Typography sx={{ fontWeight: 900, fontSize: "0.95rem", color: PW_P, lineHeight: 1.2, fontFamily: "Arial, sans-serif" }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: "0.74rem", color: PW_MUTED, fontWeight: 600, mt: 0.2, fontFamily: "Arial, sans-serif" }}>{subtitle}</Typography>}
      </Box>
    </Box>
    {action && <Box>{action}</Box>}
  </Box>
);
const PwBtn = ({ children, outline, sm, startIcon, disabled, onClick, sx: sxProp = {} }) => (
  <Button disableElevation variant={outline ? "outlined" : "contained"} startIcon={startIcon} disabled={disabled} onClick={onClick}
    sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, fontSize: sm ? "0.78rem" : "0.875rem", py: sm ? 0.75 : 1, px: sm ? 1.75 : 2.5, fontFamily: "Arial, sans-serif", boxShadow: outline ? "none" : `0 4px 12px ${alpha(PW_P, 0.28)}`, ...(outline ? { borderColor: alpha(PW_P, 0.45), color: PW_P, "&:hover": { borderColor: PW_P, bgcolor: alpha(PW_P, 0.04) } } : { bgcolor: PW_P, color: "#fff", "&:hover": { bgcolor: "#4a1515" }, "&:disabled": { bgcolor: "#e5e7eb", color: "#9ca3af", boxShadow: "none" } }), ...sxProp }}>
    {children}
  </Button>
);
const PW_INPUT = {
  "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#f4f5f7", fontSize: "0.875rem", transition: "background-color 0.15s ease, box-shadow 0.15s ease", "& fieldset": { borderColor: "transparent", borderWidth: "1.5px" }, "&:hover": { bgcolor: "#eef0f3" }, "&:hover fieldset": { borderColor: alpha(PW_P, 0.22) }, "&.Mui-focused": { bgcolor: "#fff", boxShadow: `0 0 0 2px ${alpha(PW_P, 0.18)}` }, "&.Mui-focused fieldset": { borderColor: PW_P, borderWidth: "1.5px" } },
  "& .MuiInputBase-input": { py: "9px", px: "12px", fontWeight: 500, fontFamily: "Arial, sans-serif" },
};

/* ── Shimmer ── */
const shimmerKeyframes = `
@keyframes ulShimmer { 0% { background-position: -800px 0; } 100% { background-position: 800px 0; } }
@keyframes ulPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.60; } }
@keyframes umBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes umPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
`;

const ULShim = ({ width = "100%", height = 16, borderRadius = 8, sx = {}, light = false }) => (
  <Box sx={{ width, height, borderRadius: `${borderRadius}px`, flexShrink: 0, background: light ? "linear-gradient(90deg,rgba(255,255,255,0.22) 25%,rgba(255,255,255,0.42) 50%,rgba(255,255,255,0.22) 75%)" : "linear-gradient(90deg,rgba(137,68,68,0.08) 25%,rgba(137,68,68,0.20) 50%,rgba(137,68,68,0.08) 75%)", backgroundSize: "800px 100%", animation: "ulShimmer 1.5s infinite linear", ...sx }} />
);

const OfflineBanner = ({ visible, retryIn, primaryColor }) => {
  const p = primaryColor || "#894444";
  return (
    <Fade in={visible} timeout={600} unmountOnExit>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, py: 1.5, mb: 3, mx: 6, borderRadius: 3, bgcolor: alpha(p, 0.05), border: `1px solid ${alpha(p, 0.18)}`, borderLeft: `4px solid ${alpha(p, 0.45)}` }}>
        <WifiOffIcon sx={{ fontSize: 18, color: alpha(p, 0.5), animation: "umBounce 2s ease-in-out infinite", flexShrink: 0 }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: alpha(p, 0.75), lineHeight: 1.2, fontFamily: "Arial, sans-serif" }}>Waiting for connection…</Typography>
          {retryIn > 0 && <Typography sx={{ fontSize: "0.72rem", color: alpha(p, 0.45), mt: 0.3, fontFamily: "Arial, sans-serif" }}>Retrying in {retryIn}s</Typography>}
        </Box>
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: alpha(p, 0.35), animation: "umPulse 1.8s ease-in-out infinite", flexShrink: 0 }} />
      </Box>
    </Fade>
  );
};

const UsersListWireframe = ({ settings, offline, retryIn }) => {
  const p = settings?.primaryColor || "#894444";
  const ac = settings?.accentColor || "#FEF9E1";
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <Box sx={{ py: 4, width: "100vw", mx: "auto", maxWidth: "100%", overflow: "hidden", position: "relative", left: "50%", transform: "translateX(-50%)", minHeight: "92vh" }}>
        <Box sx={{ px: 6, mx: "auto", maxWidth: "1600px" }}>
          <Box sx={{ mb: 4, borderRadius: 20, overflow: "hidden", background: `${ac}F2`, border: `1px solid ${alpha(p, 0.1)}`, animation: "ulPulse 2.2s ease-in-out infinite" }}>
            <Box sx={{ p: 5, background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)` }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: alpha(p, 0.12) }} />
                  <Box><ULShim width={220} height={26} borderRadius={6} sx={{ mb: 1 }} /><ULShim width={340} height={14} borderRadius={4} /></Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <ULShim width={80} height={28} borderRadius={14} />
                  <Box sx={{ width: 48, height: 48, borderRadius: "50%", bgcolor: alpha(p, 0.1) }} />
                  <ULShim width={170} height={44} borderRadius={12} />
                  <ULShim width={160} height={44} borderRadius={12} />
                </Box>
              </Box>
            </Box>
          </Box>
          <Box sx={{ textAlign: "center", py: 8 }}>
            <CircularProgress sx={{ color: p }} size={40} />
            <Typography sx={{ color: p, mt: 2, fontWeight: 600, fontFamily: "Arial, sans-serif" }}>Loading users…</Typography>
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
    case 0: return { label: "JO - Graduate", color: "#F57C00", bgcolor: alpha("#F57C00", 0.1), icon: <Circle sx={{ fontSize: 12 }} /> };
    case 1: return { label: "JO - UnderGrad", color: "#E64A19", bgcolor: alpha("#E64A19", 0.1), icon: <Circle sx={{ fontSize: 12 }} /> };
    case 2: return { label: "Regular - Non-Teaching", color: "#2E7D32", bgcolor: alpha("#2E7D32", 0.1), icon: <Circle sx={{ fontSize: 12 }} /> };
    case 3: return { label: "Teaching (30Hrs)", color: "#1565C0", bgcolor: alpha("#1565C0", 0.1), icon: <Circle sx={{ fontSize: 12 }} /> };
    case 4: return { label: "Designated (40Hrs)", color: "#7B1FA2", bgcolor: alpha("#7B1FA2", 0.1), icon: <Circle sx={{ fontSize: 12 }} /> };
    case 5: return { label: customCategory ? `Other (${String(customCategory).trim()})` : "Other (specify)", color: "#455A64", bgcolor: alpha("#455A64", 0.1), icon: <Circle sx={{ fontSize: 12 }} /> };
    default: return { label: "Not Set", color: "#757575", bgcolor: alpha("#757575", 0.1), icon: <Circle sx={{ fontSize: 12 }} /> };
  }
};

const getDescriptionColor = (description, settings) => {
  const p = settings?.primaryColor || "#894444";
  const s = settings?.secondaryColor || "#6d2323";
  switch (description?.toLowerCase()) {
    case "general": return { sx: { bgcolor: alpha(p, 0.15), color: p }, icon: <Category /> };
    case "system administration": return { sx: { bgcolor: alpha(p, 0.15), color: p }, icon: <Category /> };
    case "registration": return { sx: { bgcolor: alpha(s, 0.15), color: s }, icon: <Assignment /> };
    case "information management": return { sx: { bgcolor: alpha(p, 0.1), color: p }, icon: <Info /> };
    case "attendance management": return { sx: { bgcolor: alpha(p, 0.12), color: p }, icon: <Assessment /> };
    case "payroll management": return { sx: { bgcolor: alpha(s, 0.12), color: s }, icon: <Payment /> };
    case "form": return { sx: { bgcolor: alpha(p, 0.08), color: p }, icon: <Description /> };
    case "pages management": return { sx: { bgcolor: alpha(p, 0.18), color: p }, icon: <FolderSpecial /> };
    case "personal data sheets": return { sx: { bgcolor: alpha(s, 0.18), color: s }, icon: <Folder /> };
    default: return { sx: { bgcolor: alpha(p, 0.1), color: p }, icon: <Description /> };
  }
};

const RETRY_DELAYS = [2, 4, 8, 15, 30];

const PW_NAV = [
  { key: "all", label: "All Accounts", icon: Person },
  { key: "accounts", label: "Complete Accounts", icon: CheckCircle },
  { key: "incomplete", label: "Incomplete Accounts", icon: WarningAmberRounded },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
const UsersList = () => {
  const detectedRole = getUserRole();
  const isTechnicalUser = detectedRole === "technical";

  const [moduleAuthorized, setModuleAuthorized] = useState(isTechnicalUser);
  const [confidentialPasswordInput, setConfidentialPasswordInput] = useState("");
  const [openConfidentialPassword, setOpenConfidentialPassword] = useState(!isTechnicalUser);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [userRole, setUserRole] = useState(detectedRole);
  const [roleChecked, setRoleChecked] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [retryIn, setRetryIn] = useState(0);
  const retryTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const retryAttemptRef = useRef(0);
  const mountedRef = useRef(true);
  const [selectedEmployeeNumbers, setSelectedEmployeeNumbers] = useState([]);
  const [bulkCategoryDialog, setBulkCategoryDialog] = useState(false);
  const [bulkEmploymentCategory, setBulkEmploymentCategory] = useState("");
  const [bulkCustomCategory, setBulkCustomCategory] = useState("");
  const [bulkEditLoading, setBulkEditLoading] = useState(false);
  const [pageAccessDialog, setPageAccessDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pages, setPages] = useState([]);
  const [pageAccess, setPageAccess] = useState({});
  const [pageAccessLoading, setPageAccessLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState("");
  const [accessChangeInProgress, setAccessChangeInProgress] = useState({});
  const [activeAccessCategory, setActiveAccessCategory] = useState(null);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState("");
  const [activeTab, setActiveTab] = useState("info");
  const [animatedValue, setAnimatedValue] = useState(0);
  const [roleChangeDialog, setRoleChangeDialog] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState(null);
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [editedEmployeeNumber, setEditedEmployeeNumber] = useState("");
  const [editedFirstName, setEditedFirstName] = useState("");
  const [editedMiddleName, setEditedMiddleName] = useState("");
  const [editedLastName, setEditedLastName] = useState("");
  const [editedNameExtension, setEditedNameExtension] = useState("");
  const [editedEmail, setEditedEmail] = useState("");
  const [editedEmploymentCategory, setEditedEmploymentCategory] = useState("");
  const [editedCustomCategory, setEditedCustomCategory] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [grantingRole, setGrantingRole] = useState(null);
  const [confirmRole, setConfirmRole] = useState(null);
  const [grantSuccessDialog, setGrantSuccessDialog] = useState(null);
  const roleGrantColors = {
    staff: { color: "#0F766E", bgcolor: alpha("#0F766E", 0.08) },
    administrator: { color: "#9333EA", bgcolor: alpha("#9333EA", 0.08) },
    superadmin: { color: "#C2410C", bgcolor: alpha("#C2410C", 0.08) },
  };
  const [categoryFilter, setCategoryFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [tableTab, setTableTab] = useState(0);
  const [pwMgmtOpen, setPwMgmtOpen] = useState(false);
  const [pwUsers, setPwUsers] = useState([]);
  const [pwFilteredUsers, setPwFilteredUsers] = useState([]);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSearchTerm, setPwSearchTerm] = useState("");
  const [pwResetting, setPwResetting] = useState({});
  const [pwErrMessage, setPwErrMessage] = useState("");
  const [pwSuccessOpen, setPwSuccessOpen] = useState(false);
  const [pwSuccessAction, setPwSuccessAction] = useState("");
  const [pwPage, setPwPage] = useState(0);
  const [pwRowsPerPage, setPwRowsPerPage] = useState(10);
  const [pwNavSection, setPwNavSection] = useState("all");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const settings = useSystemSettings();

  const isSuperAdmin = userRole === "superadmin" || userRole === "technical";
  const isTechnical = userRole === "technical";

  const p = settings?.primaryColor || "#894444";
  const s = settings?.secondaryColor || "#6d2323";
  const ac = settings?.accentColor || "#FEF9E1";
  const tp = settings?.textPrimaryColor || "#6D2323";

  /* ── Styled components ── */
  const EnterpriseCard = useMemo(() => styled(Card)(() => ({
    borderRadius: 12,
    background: "#ffffff",
    boxShadow: `0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)`,
    border: `1px solid ${alpha(p, 0.1)}`,
    overflow: "hidden",
    transition: "box-shadow 0.2s ease",
    "&:hover": { boxShadow: `0 4px 20px rgba(0,0,0,0.09)` },
    fontFamily: "Arial, sans-serif",
  })), [p]);

  const ActionButton = useMemo(() => styled(Button)(({ variant: v }) => ({
    borderRadius: 8,
    fontWeight: 600,
    padding: "9px 20px",
    transition: "all 0.18s ease",
    textTransform: "none",
    fontSize: "0.875rem",
    letterSpacing: "0.01em",
    fontFamily: "Arial, sans-serif",
    boxShadow: "none",
    "&:hover": { boxShadow: "none", transform: "translateY(-1px)" },
    "&:active": { transform: "translateY(0)" },
  })), [p]);

  const CleanTextField = useMemo(() => styled(TextField)(() => ({
    "& .MuiOutlinedInput-root": {
      borderRadius: 8,
      backgroundColor: "#fafafa",
      fontSize: "0.875rem",
      fontFamily: "Arial, sans-serif",
      transition: "all 0.15s ease",
      "& fieldset": { borderColor: "#e5e7eb" },
      "&:hover": { backgroundColor: "#f5f5f5" },
      "&:hover fieldset": { borderColor: alpha(p, 0.35) },
      "&.Mui-focused": { backgroundColor: "#fff", boxShadow: `0 0 0 3px ${alpha(p, 0.12)}` },
      "&.Mui-focused fieldset": { borderColor: p, borderWidth: "1.5px" },
    },
    "& .MuiInputLabel-root": { fontWeight: 500, fontSize: "0.82rem", fontFamily: "Arial, sans-serif" },
    "& .MuiInputBase-input": { fontFamily: "Arial, sans-serif" },
  })), [p]);

  const SharpTableContainer = useMemo(() => styled(TableContainer)(() => ({
    borderRadius: 0,
    overflow: "hidden",
    border: "none",
  })), [p]);

  const uniqueDepartments = useMemo(() => {
    const depts = new Set(users.map((u) => u.departmentCode).filter(Boolean));
    return Array.from(depts).sort();
  }, [users]);

  const properUsers = useMemo(() => users.filter((u) => u.fullName && u.fullName.trim() !== "" && u.fullName !== "Username"), [users]);
  const incompleteUsers = useMemo(() => users.filter((u) => !u.fullName || u.fullName.trim() === "" || u.fullName === "Username"), [users]);

  /* ── PW modal derived ── */
  const pwProperUsers = useMemo(() => pwUsers.filter((u) => u.fullName && u.fullName.trim() !== ""), [pwUsers]);
  const pwIncompleteUsers = useMemo(() => pwUsers.filter((u) => !u.fullName || u.fullName.trim() === ""), [pwUsers]);
  const pwSourceUsers = useMemo(() => {
    if (pwNavSection === "accounts") return pwProperUsers;
    if (pwNavSection === "incomplete") return pwIncompleteUsers;
    return pwUsers;
  }, [pwNavSection, pwUsers, pwProperUsers, pwIncompleteUsers]);

  useEffect(() => {
    const term = pwSearchTerm.toLowerCase().trim();
    const result = !term ? pwSourceUsers : pwSourceUsers.filter((u) => (u.fullName || "").toLowerCase().includes(term) || (u.email || "").toLowerCase().includes(term) || String(u.employeeNumber || "").includes(term));
    setPwFilteredUsers(result);
    setPwPage(0);
  }, [pwSearchTerm, pwSourceUsers]);

  const fetchPwUsers = useCallback(async () => {
    setPwLoading(true); setPwErrMessage("");
    try {
      const res = await fetch(`${API_BASE_URL}/users/search`, { method: "GET", headers: getAuthHeaders().headers });
      if (!res.ok) { const e = await res.json().catch(() => ({})); setPwErrMessage(e.error || "Failed to fetch users"); setPwUsers([]); return; }
      const data = await res.json();
      setPwUsers(Array.isArray(data) ? data : []);
    } catch { setPwErrMessage("Something went wrong while fetching users."); setPwUsers([]); }
    finally { setPwLoading(false); }
  }, []);

  const handleResetPassword = async (employeeNumber) => {
    setPwResetting((prev) => ({ ...prev, [employeeNumber]: true })); setPwErrMessage("");
    try {
      const res = await fetch(`${API_BASE_URL}/users/reset-password`, { method: "POST", headers: { ...getAuthHeaders().headers, "Content-Type": "application/json" }, body: JSON.stringify({ employeeNumber }) });
      const data = await res.json();
      if (res.ok) { setPwSuccessAction("reset"); setPwSuccessOpen(true); }
      else { setPwErrMessage(data.error || "Failed to reset password"); }
    } catch { setPwErrMessage("Something went wrong while resetting password."); }
    finally { setPwResetting((prev) => ({ ...prev, [employeeNumber]: false })); }
  };

  const openPwMgmt = useCallback(() => { setPwMgmtOpen(true); setPwSearchTerm(""); setPwNavSection("all"); setPwPage(0); setPwErrMessage(""); setPwSuccessOpen(false); fetchPwUsers(); }, [fetchPwUsers]);
  const closePwMgmt = useCallback(() => { setPwMgmtOpen(false); setPwErrMessage(""); setPwSuccessOpen(false); }, []);

  const pwPaginatedUsers = pwFilteredUsers.slice(pwPage * pwRowsPerPage, pwPage * pwRowsPerPage + pwRowsPerPage);
  const pwNavCount = (key) => { if (key === "all") return pwUsers.length; if (key === "accounts") return pwProperUsers.length; if (key === "incomplete") return pwIncompleteUsers.length; return 0; };
  const getPwRoleBadge = (role = "") => {
    switch ((role || "").toLowerCase()) {
      case "superadmin": return { color: PW_P };
      case "administrator": return { color: PW_S };
      case "technical": return { color: "#2563eb" };
      case "staff": return { color: "#047857" };
      default: return { color: PW_MUTED };
    }
  };

  /* ── Auth ── */
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

  const doFetchUsers = useCallback(async () => {
    const authHeaders = getAuthHeaders();
    const [usersResp, personsResp, empCatsResp] = await Promise.all([
      fetch(`${API_BASE_URL}/users`, { method: "GET", ...authHeaders }),
      fetch(`${API_BASE_URL}/personalinfo/person_table`, { method: "GET", ...authHeaders }),
      fetch(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`, { method: "GET", ...authHeaders }),
    ]);
    if (!usersResp.ok) { const err = await usersResp.json().catch(() => ({})); throw new Error(err.error || "Failed to fetch users"); }
    const usersDataRaw = await usersResp.json();
    const personsDataRaw = await personsResp.json().catch(() => []);
    const empCatsDataRaw = empCatsResp?.ok ? await empCatsResp.json().catch(() => []) : [];
    const usersArray = Array.isArray(usersDataRaw) ? usersDataRaw : usersDataRaw.users || usersDataRaw.data || [];
    const personsArray = Array.isArray(personsDataRaw) ? personsDataRaw : personsDataRaw.persons || personsDataRaw.data || [];
    const empCatsArray = Array.isArray(empCatsDataRaw) ? empCatsDataRaw : empCatsDataRaw.data || empCatsDataRaw.records || [];
    const empCatsMap = (empCatsArray || []).reduce((acc, row) => { const key = String(row.employeeNumber ?? row.employee_number ?? ""); if (key) acc[key] = row; return acc; }, {});
    return (usersArray || []).map((user) => {
      const person = (personsArray || []).find((p) => String(p.agencyEmployeeNum) === String(user.employeeNumber));
      const empCatRow = empCatsMap[String(user.employeeNumber)] || null;
      const fullName = person ? `${person.firstName || ""} ${person.middleName || ""} ${person.lastName || ""} ${person.nameExtension || ""}`.trim() : user.fullName || user.username || `${user.firstName || ""} ${user.lastName || ""}`.trim();
      const avatar = person?.profile_picture ? `${API_BASE_URL}${person.profile_picture}` : user.avatar ? String(user.avatar).startsWith("http") ? user.avatar : `${API_BASE_URL}${user.avatar}` : null;
      return { ...user, fullName: fullName || "Username", avatar: avatar || null, personData: person || {}, employmentCategory: empCatRow?.employmentCategory !== undefined && empCatRow?.employmentCategory !== null ? empCatRow.employmentCategory : user.employmentCategory !== undefined ? user.employmentCategory : null, customCategory: empCatRow?.customCategory ?? empCatRow?.custom_category ?? user.customCategory ?? user.custom_category ?? null, departmentCode: user.departmentCode || null, departmentDescription: user.departmentDescription || null };
    });
  }, []); // eslint-disable-line

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
      retryTimerRef.current = setTimeout(() => { if (mountedRef.current) fetchUsers(false, attemptNum + 1); }, delaySeconds * 1000);
    }
  }, [doFetchUsers, clearRetryTimers, users.length]); // eslint-disable-line

  useEffect(() => { mountedRef.current = true; if (isTechnicalUser) fetchUsers(); return () => { mountedRef.current = false; clearRetryTimers(); }; }, []); // eslint-disable-line
  useEffect(() => { const h = () => { if (mountedRef.current && offline) { clearRetryTimers(); fetchUsers(false, 0); } }; window.addEventListener("online", h); return () => window.removeEventListener("online", h); }, [offline, fetchUsers, clearRetryTimers]);
  useEffect(() => { if (moduleAuthorized && !isTechnicalUser) fetchUsers(); }, [moduleAuthorized]); // eslint-disable-line

  useEffect(() => {
    const sourceUsers = tableTab === 0 ? properUsers : incompleteUsers;
    const filtered = sourceUsers.filter((user) => {
      const matchesSearch = (user.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) || (user.email || "").toLowerCase().includes(searchTerm.toLowerCase()) || String(user.employeeNumber || "").includes(searchTerm) || (user.role || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter ? (user.role || "").toLowerCase() === roleFilter.toLowerCase() : true;
      const matchesCategory = categoryFilter !== "" ? String(user.employmentCategory) === String(categoryFilter) : true;
      const matchesDepartment = departmentFilter !== "" ? (user.departmentCode || "") === departmentFilter : true;
      return matchesSearch && matchesRole && matchesCategory && matchesDepartment;
    });
    setFilteredUsers(filtered); setPage(0);
  }, [searchTerm, roleFilter, categoryFilter, departmentFilter, users, tableTab, properUsers, incompleteUsers]);

  /* ── Page access handlers ── */
  const fetchUserPageAccess = async (user) => {
    try {
      const authHeaders = getAuthHeaders();
      const accessResponse = await fetch(`${API_BASE_URL}/page_access/${user.employeeNumber}`, { method: "GET", ...authHeaders });
      if (accessResponse.ok) {
        const accessDataRaw = await accessResponse.json();
        const accessData = Array.isArray(accessDataRaw) ? accessDataRaw : accessDataRaw.data || [];
        const accessMap = (accessData || []).reduce((acc, curr) => { const privilege = String(curr.page_privilege || "0"); acc[curr.page_id] = privilege !== "0" && privilege !== ""; return acc; }, {});
        const pagesResponse = await fetch(`${API_BASE_URL}/pages`, { method: "GET", ...authHeaders });
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
      const pagesResponse = await fetch(`${API_BASE_URL}/pages`, { method: "GET", ...authHeaders });
      if (pagesResponse.ok) {
        let pagesData = await pagesResponse.json();
        pagesData = Array.isArray(pagesData) ? pagesData : pagesData.pages || pagesData.data || [];
        pagesData = (pagesData || []).sort((a, b) => (a.id || 0) - (b.id || 0));
        setPages(pagesData);
        const accessResponse = await fetch(`${API_BASE_URL}/page_access/${user.employeeNumber}`, { method: "GET", ...authHeaders });
        if (accessResponse.ok) {
          const accessDataRaw = await accessResponse.json();
          const accessData = Array.isArray(accessDataRaw) ? accessDataRaw : accessDataRaw.data || [];
          const accessMap = (accessData || []).reduce((acc, curr) => { const privilege = String(curr.page_privilege || "0"); acc[curr.page_id] = privilege !== "0" && privilege !== ""; return acc; }, {});
          setPageAccess(accessMap);
          if (pagesData.length > 0) {
            const grouped = pagesData.reduce((acc, page) => { const desc = page.page_description || "Uncategorized"; acc[desc] = true; return acc; }, {});
            const order = ["General","System Administration","Registration","Information Management","Attendance Management","Payroll Management","Form","Pages Management","Personal Data Sheets","Uncategorized"];
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
          if (!existingRecord) { await fetch(`${API_BASE_URL}/page_access`, { method: "POST", ...authHeaders, body: JSON.stringify({ employeeNumber: selectedUser.employeeNumber, page_id: pageId, page_privilege: newAccess ? "1" : "0" }) }); }
          else { await fetch(`${API_BASE_URL}/page_access/${selectedUser.employeeNumber}/${pageId}`, { method: "PUT", ...authHeaders, body: JSON.stringify({ page_privilege: newAccess ? "1" : "0" }) }); }
        }
      } else { await fetch(`${API_BASE_URL}/page_access/${selectedUser.employeeNumber}/${pageId}`, { method: "PUT", ...authHeaders, body: JSON.stringify({ page_privilege: newAccess ? "1" : "0" }) }); }
      setPageAccess((prev) => ({ ...prev, [pageId]: newAccess }));
      window.dispatchEvent(new Event("pageAccessUpdated"));
    } catch { setError("Network error while updating page access"); }
    finally { setAccessChangeInProgress((prev) => ({ ...prev, [pageId]: false })); }
  };

  const closePageAccessDialog = () => { window.dispatchEvent(new Event("pageAccessUpdated")); setPageAccessDialog(false); setSelectedUser(null); setPages([]); setPageAccess({}); setActiveAccessCategory(null); };
  const openUserDetails = (user) => { setSelectedUserForDetails(user); setDetailsDrawerOpen(true); setAnimatedValue(0); fetchUserPageAccess(user); };
  const closeUserDetails = () => { setDetailsDrawerOpen(false); setSelectedUserForDetails(null); setActiveTab("info"); setAnimatedValue(0); };

  const handleRoleChange = (user, newRole) => { if (user.role === newRole) return; setPendingRoleChange({ user, oldRole: user.role, newRole }); setRoleChangeDialog(true); };
  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return;
    setRoleChangeLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/users/${pendingRoleChange.user.employeeNumber}/role`, { method: "PUT", ...authHeaders, body: JSON.stringify({ role: pendingRoleChange.newRole }) });
      if (!response.ok) { const e = await response.json().catch(() => ({})); setError(e.error || "Failed to update user role"); setRoleChangeDialog(false); setPendingRoleChange(null); setRoleChangeLoading(false); return; }
      setUsers((prev) => prev.map((u) => u.employeeNumber === pendingRoleChange.user.employeeNumber ? { ...u, role: pendingRoleChange.newRole } : u));
      setFilteredUsers((prev) => prev.map((u) => u.employeeNumber === pendingRoleChange.user.employeeNumber ? { ...u, role: pendingRoleChange.newRole } : u));
      setSuccessAction("edit"); setSuccessOpen(true); setRoleChangeDialog(false); setPendingRoleChange(null);
    } catch { setError("Network error while updating user role"); }
    finally { setRoleChangeLoading(false); }
  };

  const handleEditUser = (user) => { setUserToEdit(user); setEditedEmployeeNumber(user.employeeNumber); setEditedFirstName(user.firstName || ""); setEditedMiddleName(user.middleName || ""); setEditedLastName(user.lastName || ""); setEditedNameExtension(user.nameExtension || ""); setEditedEmail(user.email || ""); setEditedEmploymentCategory(user.employmentCategory !== undefined && user.employmentCategory !== null ? user.employmentCategory : ""); setEditedCustomCategory(user.customCategory || user.custom_category || ""); setEditDialog(true); };
  const handleSaveEdit = async () => {
    if (!editedEmployeeNumber || !editedFirstName || !editedLastName) { setError("Employee Number, First Name, and Last Name are required"); return; }
    if (parseInt(editedEmploymentCategory) === 5 && !String(editedCustomCategory || "").trim()) { setError("Please enter a custom category description for Other (specify)"); return; }
    setEditLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      if (editedEmployeeNumber !== userToEdit.employeeNumber) { const r = await fetch(`${API_BASE_URL}/users/${userToEdit.employeeNumber}/employee-number`, { method: "PUT", ...authHeaders, body: JSON.stringify({ newEmployeeNumber: editedEmployeeNumber }) }); if (!r.ok) { const e = await r.json().catch(() => ({})); setError(e.error || "Failed to update employee number"); setEditLoading(false); return; } }
      const r2 = await fetch(`${API_BASE_URL}/personalinfo/person/${editedEmployeeNumber}`, { method: "PUT", ...authHeaders, body: JSON.stringify({ firstName: editedFirstName, middleName: editedMiddleName || null, lastName: editedLastName, nameExtension: editedNameExtension || null }) });
      if (!r2.ok) { const e = await r2.json().catch(() => ({})); setError(e.error || "Failed to update user name"); setEditLoading(false); return; }
      const currentEmail = (userToEdit.email || "").trim(); const newEmail = (editedEmail || "").trim();
      if (newEmail !== currentEmail) { const r3 = await fetch(`${API_BASE_URL}/users/${editedEmployeeNumber}/email`, { method: "PUT", ...authHeaders, body: JSON.stringify({ email: newEmail || null }) }); if (!r3.ok) { const e = await r3.json().catch(() => ({})); setError(e.error || "Failed to update email"); setEditLoading(false); return; } }
      const currentCategory = userToEdit.employmentCategory; const newCategory = editedEmploymentCategory;
      if (newCategory !== currentCategory && newCategory !== "") {
        const checkResponse = await fetch(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${editedEmployeeNumber}`, { method: "GET", ...authHeaders });
        if (checkResponse.ok) { const categoryData = await checkResponse.json(); await fetch(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${categoryData.id}`, { method: "PUT", ...authHeaders, body: JSON.stringify({ employeeNumber: editedEmployeeNumber, employmentCategory: parseInt(newCategory), customCategory: parseInt(newCategory) === 5 ? String(editedCustomCategory || "").trim() : "" }) }); }
        else { await fetch(`${API_BASE_URL}/EmploymentCategoryRoutes/employee-category`, { method: "POST", ...authHeaders, body: JSON.stringify({ employeeNumber: editedEmployeeNumber, employmentCategory: parseInt(newCategory), customCategory: parseInt(newCategory) === 5 ? String(editedCustomCategory || "").trim() : "" }) }); }
      }
      await fetchUsers(); setSuccessAction("edit"); setSuccessOpen(true); setEditDialog(false); setUserToEdit(null);
    } catch { setError("Network error while updating user"); }
    finally { setEditLoading(false); }
  };

  const toggleSelectEmployee = (n) => setSelectedEmployeeNumbers((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]);
  const isEmployeeSelected = (n) => selectedEmployeeNumbers.includes(n);
  const isAllCurrentPageSelected = (cur) => cur?.length > 0 && cur.every((u) => selectedEmployeeNumbers.includes(u.employeeNumber));
  const isSomeCurrentPageSelected = (cur) => { const any = cur?.some((u) => selectedEmployeeNumbers.includes(u.employeeNumber)); const all = cur?.every((u) => selectedEmployeeNumbers.includes(u.employeeNumber)); return any && !all; };
  const toggleSelectAllCurrentPage = (cur) => { if (!cur?.length) return; if (isAllCurrentPageSelected(cur)) { const set = new Set(cur.map((u) => u.employeeNumber)); setSelectedEmployeeNumbers((prev) => prev.filter((n) => !set.has(n))); } else { setSelectedEmployeeNumbers((prev) => { const set = new Set(prev); cur.forEach((u) => set.add(u.employeeNumber)); return Array.from(set); }); } };
  const openBulkCategoryEdit = () => { if (!selectedEmployeeNumbers.length) { setSnackbarMessage("Please select at least 1 employee."); setSnackbarOpen(true); return; } setBulkEmploymentCategory(""); setBulkCustomCategory(""); setBulkCategoryDialog(true); };
  const closeBulkCategoryEdit = () => { setBulkCategoryDialog(false); setBulkEmploymentCategory(""); setBulkCustomCategory(""); };
  const handleSaveBulkCategoryEdit = async () => {
    if (bulkEmploymentCategory === "" || bulkEmploymentCategory === null) { setError("Please select an employment category to apply."); return; }
    if (parseInt(bulkEmploymentCategory) === 5 && !String(bulkCustomCategory || "").trim()) { setError("Please enter a custom category description for Other (specify)"); return; }
    if (!selectedEmployeeNumbers.length) { setError("No employees selected."); return; }
    setBulkEditLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      for (const empNo of [...selectedEmployeeNumbers]) {
        const checkResponse = await fetch(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${empNo}`, { method: "GET", ...authHeaders });
        if (checkResponse.ok) { const categoryData = await checkResponse.json(); await fetch(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${categoryData.id}`, { method: "PUT", ...authHeaders, body: JSON.stringify({ employeeNumber: empNo, employmentCategory: parseInt(bulkEmploymentCategory), customCategory: parseInt(bulkEmploymentCategory) === 5 ? String(bulkCustomCategory || "").trim() : "" }) }); }
        else { await fetch(`${API_BASE_URL}/EmploymentCategoryRoutes/employee-category`, { method: "POST", ...authHeaders, body: JSON.stringify({ employeeNumber: empNo, employmentCategory: parseInt(bulkEmploymentCategory), customCategory: parseInt(bulkEmploymentCategory) === 5 ? String(bulkCustomCategory || "").trim() : "" }) }); }
      }
      await fetchUsers(); setSuccessAction("bulk-edit"); setSuccessOpen(true); setSelectedEmployeeNumbers([]); setBulkCategoryDialog(false);
    } catch (err) { setError(err?.message || "Network error while bulk updating employment category"); }
    finally { setBulkEditLoading(false); }
  };

  const handleDeleteUser = (user) => { setUserToDelete(user); setDeleteDialog(true); };
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/users/${userToDelete.employeeNumber}`, { method: "DELETE", ...authHeaders });
      if (!response.ok) { const e = await response.json().catch(() => ({})); setError(e.error || "Failed to delete user"); setDeleteLoading(false); return; }
      await fetchUsers(); setSuccessAction("delete"); setSuccessOpen(true); setDeleteDialog(false); setUserToDelete(null);
    } catch { setError("Network error while deleting user"); }
    finally { setDeleteLoading(false); }
  };

  const handleGrantRoleAccess = async (role) => {
    setGrantingRole(role);
    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/users/grant-role-access/${role}`, { method: "POST", ...authHeaders });
      const result = await response.json();
      if (!response.ok) { setError(result.error || `Failed to grant access for role: ${role}`); return; }
      setGrantSuccessDialog({ role, usersProcessed: result.usersProcessed, pagesGranted: result.pagesGranted });
      await fetchUsers();
    } catch { setError("Network error while granting role access"); }
    finally { setGrantingRole(null); }
  };

  const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const formatDate = (d) => { if (!d) return "N/A"; return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); };
  const getRoleColor = (role = "") => {
    switch ((role || "").toLowerCase()) {
      case "superadmin": return { sx: { bgcolor: alpha(p, 0.15), color: p }, icon: <SupervisorAccount /> };
      case "administrator": return { sx: { bgcolor: alpha(s, 0.15), color: s }, icon: <AdminPanelSettings /> };
      case "technical": return { sx: { bgcolor: alpha(p, 0.15), color: p }, icon: <SupervisorAccount /> };
      case "staff": return { sx: { bgcolor: alpha(p, 0.1), color: p }, icon: <Work /> };
      default: return { sx: { bgcolor: alpha(p, 0.1), color: p }, icon: <Person /> };
    }
  };
  const getInitials = (n) => { if (!n) return "U"; const parts = n.trim().split(" ").filter(Boolean); if (parts.length === 1) return parts[0][0].toUpperCase(); return (parts[0][0] + parts[1][0]).toUpperCase(); };

  /* ── Guards ── */
  if (!moduleAuthorized) {
    return (
      <Modal open={openConfidentialPassword} onClose={handleModuleAccessCancel} disableEscapeKeyDown>
        <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: { xs: "90%", sm: 460 }, bgcolor: "white", borderRadius: 3, boxShadow: "0 24px 80px rgba(0,0,0,0.18)", overflow: "hidden", fontFamily: "Arial, sans-serif" }}>
          <Box sx={{ height: 5, background: `linear-gradient(90deg, ${p} 0%, ${s} 100%)` }} />
          <Box sx={{ p: 4 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
              <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: alpha(p, 0.1), display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Lock sx={{ color: p, fontSize: 24 }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: "1.15rem", color: "#111", lineHeight: 1.2, fontFamily: "Arial, sans-serif" }}>Access Required</Typography>
                <Typography sx={{ fontSize: "0.78rem", color: "#6b7280", mt: 0.25, fontFamily: "Arial, sans-serif" }}>User Management · Restricted Module</Typography>
              </Box>
            </Box>
            <Box sx={{ p: 2.5, mb: 3, bgcolor: alpha(p, 0.04), border: `1px solid ${alpha(p, 0.12)}`, borderRadius: 2 }}>
              <Typography sx={{ fontSize: "0.82rem", color: "#374151", lineHeight: 1.6, fontFamily: "Arial, sans-serif" }}>Enter the authorized password to access this module. This action will be logged.</Typography>
            </Box>
            <TextField autoFocus margin="dense" label="Authorized Password" type="password" fullWidth variant="outlined" value={confidentialPasswordInput} onChange={(e) => setConfidentialPasswordInput(e.target.value)} onKeyPress={(e) => { if (e.key === "Enter") handleModuleAuthorization(); }} disabled={passwordLoading}
              sx={{ mb: 3, "& .MuiOutlinedInput-root": { borderRadius: 2, fontFamily: "Arial, sans-serif" } }} />
            <Box display="flex" justifyContent="flex-end" gap={1.5}>
              <Button onClick={handleModuleAccessCancel} variant="outlined" disabled={passwordLoading} sx={{ color: "#6b7280", borderColor: "#e5e7eb", px: 3, fontWeight: 600, textTransform: "none", borderRadius: 2, fontFamily: "Arial, sans-serif", "&:hover": { borderColor: "#d1d5db", bgcolor: "#f9fafb" } }}>Cancel</Button>
              <Button onClick={handleModuleAuthorization} variant="contained" disabled={passwordLoading} sx={{ backgroundColor: p, color: "white", px: 4, fontWeight: 600, textTransform: "none", borderRadius: 2, minWidth: 130, fontFamily: "Arial, sans-serif", boxShadow: `0 4px 14px ${alpha(p, 0.35)}`, "&:hover": { backgroundColor: s, boxShadow: `0 6px 18px ${alpha(p, 0.4)}` } }}
                startIcon={passwordLoading ? <CircularProgress size={16} sx={{ color: "white" }} /> : <Lock sx={{ fontSize: 16 }} />}>
                {passwordLoading ? "Verifying…" : "Access Module"}
              </Button>
            </Box>
          </Box>
        </Box>
      </Modal>
    );
  }

  if (loading && !refreshing) return <UsersListWireframe settings={settings} offline={offline} retryIn={retryIn} />;

  /* ═══════════════════════════════════════════════════════════════
     MAIN RENDER
  ═══════════════════════════════════════════════════════════════ */
  return (
    <Box sx={{ py: 4, width: "100vw", mx: "auto", maxWidth: "100%", overflow: "hidden", position: "relative", left: "50%", transform: "translateX(-50%)", minHeight: "92vh", fontFamily: "Arial, sans-serif" }}>
      <style>{GLOBAL_CSS}</style>
      <Box sx={{ px: { xs: 2, md: 4, lg: 6 }, mx: "auto", maxWidth: "1600px" }}>

        {/* ══ HEADER ══ */}
        <Box sx={{ mb: 3, animation: "ul-fade-up 0.4s ease" }}>
          <Box sx={{ borderRadius: 3, overflow: "hidden", bgcolor: "#fff", border: `1px solid ${alpha(p, 0.1)}`, boxShadow: `0 2px 12px rgba(0,0,0,0.05)` }}>
            <Box sx={{ height: 4}} />
            <Box sx={{ px: 4, py: 3, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
                <Box sx={{ width: 46, height: 46, borderRadius: 2, background: `linear-gradient(135deg, ${p} 0%, ${s} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 14px ${alpha(p, 0.3)}` }}>
                  <People sx={{ fontSize: 24, color: "#fff" }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: "1.3rem", color: "#111", lineHeight: 1.2, fontFamily: "Arial, sans-serif" }}>Users Management</Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "#6b7280", mt: 0.15, fontFamily: "Arial, sans-serif" }}>Accounts · Roles · Page Permissions</Typography>
                </Box>
              
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Tooltip title="Refresh Users">
                  <IconButton onClick={() => fetchUsers(true)} disabled={loading} sx={{ width: 40, height: 40, border: `1px solid ${alpha(p, 0.15)}`, borderRadius: 2, bgcolor: "#fff", color: p, "&:hover": { bgcolor: alpha(p, 0.05), borderColor: p } }}>
                    {refreshing ? <CircularProgress size={18} sx={{ color: p }} /> : <RefreshIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                </Tooltip>
                <Button variant="outlined" startIcon={<LockResetIcon sx={{ fontSize: 17 }} />} onClick={openPwMgmt}
                  sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, fontSize: "0.845rem", px: 2.5, py: 1, borderColor: alpha(p, 0.35), color: p, fontFamily: "Arial, sans-serif", "&:hover": { borderColor: p, bgcolor: alpha(p, 0.04) }, boxShadow: "none" }}>
                  Password Management
                </Button>
                {isTechnical && (
                  <Button variant="contained" startIcon={<Pages sx={{ fontSize: 17 }} />} onClick={() => navigate("/pages-list")}
                    sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, fontSize: "0.845rem", px: 2.5, py: 1, bgcolor: p, color: "#fff", fontFamily: "Arial, sans-serif", boxShadow: `0 4px 14px ${alpha(p, 0.3)}`, "&:hover": { bgcolor: s, boxShadow: `0 6px 18px ${alpha(p, 0.38)}` } }}>
                    Page Management
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ══ STATS STRIP ══ */}
        <Box sx={{ mb: 3, display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 2, animation: "ul-fade-up 0.45s ease 0.05s both" }}>
          {[
            { icon: AccountCircle, value: users.length, label: "Total Users", accent: p },
            { icon: SupervisorAccount, value: users.filter((u) => u.role === "superadmin").length, label: "Superadmins", accent: p },
            { icon: AdminPanelSettings, value: users.filter((u) => u.role === "administrator").length, label: "Administrators", accent: s },
            { icon: Work, value: users.filter((u) => u.role === "staff").length, label: "Staff Members", accent: "#374151" },
            { icon: Visibility, value: filteredUsers.length, label: "Filtered Results", accent: "#374151" },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Box key={i} sx={{ bgcolor: "#fff", borderRadius: 2.5, border: `1px solid ${alpha(p, 0.08)}`, p: 2.5, display: "flex", alignItems: "center", gap: 2, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", transition: "box-shadow 0.18s", "&:hover": { boxShadow: "0 4px 16px rgba(0,0,0,0.08)" } }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha(stat.accent, 0.1), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon sx={{ fontSize: 20, color: stat.accent }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.4rem", color: "#111", lineHeight: 1, fontFamily: "Arial, sans-serif" }}>{stat.value}</Typography>
                  <Typography sx={{ fontSize: "0.72rem", color: "#6b7280", mt: 0.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "Arial, sans-serif" }}>{stat.label}</Typography>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* ══ SEARCH & FILTER ══ */}
        <Box sx={{ mb: 3, bgcolor: "#fff", borderRadius: 2.5, border: `1px solid ${alpha(p, 0.08)}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", animation: "ul-fade-up 0.45s ease 0.1s both" }}>
          <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${alpha(p, 0.07)}`, display: "flex", alignItems: "center", gap: 1.5 }}>
            <FilterList sx={{ fontSize: 18, color: p }} />
            <Typography sx={{ fontWeight: 600, fontSize: "0.875rem", color: "#111", fontFamily: "Arial, sans-serif" }}>Search & Filter</Typography>
          </Box>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <CleanTextField fullWidth label="Search Users" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Name, email, employee number or role" size="small"
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: "#9ca3af", fontSize: 17 }} /></InputAdornment> }} />
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
                  <InputLabel sx={{ fontWeight: 500, fontSize: "0.82rem", fontFamily: "Arial, sans-serif" }}>Employment Category</InputLabel>
                  <Select value={categoryFilter} label="Employment Category" onChange={(e) => setCategoryFilter(e.target.value)} sx={{ borderRadius: 2, backgroundColor: "#fafafa", fontSize: "0.875rem", fontFamily: "Arial, sans-serif" }}>
                    <MenuItem value="">All Categories</MenuItem>
                    <ListSubheader sx={{ fontSize: "0.7rem" }}>Job Order (JO)</ListSubheader>
                    <MenuItem value="0"><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 10, color: "#F57C00" }} /></ListItemIcon>Graduate</MenuItem>
                    <MenuItem value="1"><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 10, color: "#E64A19" }} /></ListItemIcon>UnderGrad</MenuItem>
                    <ListSubheader sx={{ fontSize: "0.7rem" }}>Regular</ListSubheader>
                    <MenuItem value="2"><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 10, color: "#2E7D32" }} /></ListItemIcon>Non-Teaching</MenuItem>
                    <MenuItem value="3"><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 10, color: "#1565C0" }} /></ListItemIcon>Teaching (30Hrs)</MenuItem>
                    <MenuItem value="4"><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 10, color: "#7B1FA2" }} /></ListItemIcon>Designated (40Hrs)</MenuItem>
                    <ListSubheader sx={{ fontSize: "0.7rem" }}>Custom</ListSubheader>
                    <MenuItem value="5"><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 10, color: "#00796B" }} /></ListItemIcon>Other (specify)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontWeight: 500, fontSize: "0.82rem", fontFamily: "Arial, sans-serif" }}>Department</InputLabel>
                  <Select value={departmentFilter} label="Department" onChange={(e) => setDepartmentFilter(e.target.value)} sx={{ borderRadius: 2, backgroundColor: "#fafafa", fontSize: "0.875rem", fontFamily: "Arial, sans-serif" }}>
                    <MenuItem value="">All Departments</MenuItem>
                    {uniqueDepartments.map((code) => <MenuItem key={code} value={code}>{code}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </Box>

        {/* ══ USERS TABLE ══ */}
        <Box sx={{ bgcolor: "#fff", borderRadius: 2.5, border: `1px solid ${alpha(p, 0.08)}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", animation: "ul-fade-up 0.45s ease 0.15s both" }}>

          {/* Table header bar */}
          <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${alpha(p, 0.07)}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#111", fontFamily: "Arial, sans-serif" }}>Registered Users</Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "#6b7280", mt: 0.15, fontFamily: "Arial, sans-serif" }}>
                {searchTerm || roleFilter || categoryFilter !== "" || departmentFilter !== "" ? `Showing ${filteredUsers.length} of ${tableTab === 0 ? properUsers.length : incompleteUsers.length}` : `Total ${users.length} registered users`}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1.5, py: 0.5, bgcolor: "#f9fafb", border: `1px solid #e5e7eb`, borderRadius: 1.5 }}>
                <VerifiedUser sx={{ fontSize: 12, color: "#9ca3af" }} />
                <Typography sx={{ fontSize: "0.63rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "Arial, sans-serif" }}>Grant Default Access:</Typography>
              </Box>
              {["staff", "administrator", "superadmin"].map((role) => (
                <Tooltip key={role} title={`Grant default access to all ${role} users`}>
                  <Button variant="outlined" size="small" startIcon={grantingRole === role ? <CircularProgress size={12} sx={{ color: roleGrantColors[role].color }} /> : null}
                    onClick={() => setConfirmRole(role)} disabled={grantingRole !== null}
                    sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, fontSize: "0.72rem", px: 1.5, py: 0.5, borderColor: alpha(roleGrantColors[role].color, 0.35), color: roleGrantColors[role].color, bgcolor: roleGrantColors[role].bgcolor, fontFamily: "Arial, sans-serif", boxShadow: "none", "&:hover": { bgcolor: alpha(roleGrantColors[role].color, 0.15), borderColor: roleGrantColors[role].color } }}>
                    {grantingRole === role ? "…" : role.charAt(0).toUpperCase() + role.slice(1)}
                  </Button>
                </Tooltip>
              ))}
              {isTechnical && (
                <Tooltip title="Bulk Edit Employment Category">
                  <Button variant="outlined" size="small" startIcon={<Category sx={{ fontSize: 14 }} />} onClick={openBulkCategoryEdit} disabled={selectedEmployeeNumbers.length === 0}
                    sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, fontSize: "0.72rem", px: 1.5, py: 0.5, borderColor: alpha(p, 0.3), color: p, fontFamily: "Arial, sans-serif", boxShadow: "none", "&:hover": { bgcolor: alpha(p, 0.05), borderColor: p }, "&:disabled": { opacity: 0.45 } }}>
                    Bulk Edit ({selectedEmployeeNumbers.length})
                  </Button>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Tabs */}
          <Box sx={{ px: 3, borderBottom: `1px solid ${alpha(p, 0.07)}`, display: "flex" }}>
            {[
              { label: "Accounts", count: properUsers.length, color: "#16a34a", icon: <CheckCircle sx={{ fontSize: 14 }} /> },
              { label: "Incomplete Accounts", count: incompleteUsers.length, color: "#d97706", icon: <WarningAmberRounded sx={{ fontSize: 14 }} /> },
            ].map((tab, idx) => (
              <Box key={idx} onClick={() => { setTableTab(idx); setPage(0); setSearchTerm(""); }}
                sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.5, py: 1.75, cursor: "pointer", borderBottom: tableTab === idx ? `2.5px solid ${p}` : "2.5px solid transparent", color: tableTab === idx ? p : "#6b7280", fontWeight: tableTab === idx ? 700 : 500, fontSize: "0.83rem", transition: "all 0.15s", "&:hover": { color: p }, fontFamily: "Arial, sans-serif" }}>
                {tab.icon}
                <span>{tab.label}</span>
                <Box sx={{ px: 1, py: 0.15, bgcolor: `${tab.color}22`, borderRadius: "20px" }}>
                  <Typography sx={{ fontFamily: "Arial, sans-serif", fontSize: "0.65rem", fontWeight: 700, color: tab.color }}>{tab.count}</Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {tableTab === 1 && incompleteUsers.length > 0 && (
            <Box sx={{ px: 3, py: 1.25, bgcolor: alpha("#f59e0b", 0.05), borderBottom: `1px solid ${alpha("#f59e0b", 0.15)}`, display: "flex", alignItems: "center", gap: 1 }}>
              <WarningAmberRounded sx={{ fontSize: 14, color: "#d97706", flexShrink: 0 }} />
              <Typography sx={{ fontSize: "0.75rem", color: "#92400e", fontFamily: "Arial, sans-serif" }}>These accounts are missing a full name. Use the edit action to link them to an employee record.</Typography>
            </Box>
          )}

          <OfflineBanner visible={offline} retryIn={retryIn} primaryColor={p} />

          <SharpTableContainer component={Paper} elevation={0}>
            <Table sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "#fafafa" }}>
                  <TableCell sx={{ borderBottom: `1px solid ${alpha(p, 0.1)}`, py: 1.5, px: 2, width: 48 }}>
                    <Checkbox checked={isAllCurrentPageSelected(paginatedUsers)} indeterminate={isSomeCurrentPageSelected(paginatedUsers)} onChange={() => toggleSelectAllCurrentPage(paginatedUsers)} sx={{ color: "white", "&.Mui-checked": { color: "white" }, "&.MuiCheckbox-indeterminate": { color: p }, p: 0 }} size="small" />
                  </TableCell>
                  {["Emp. No.", "Full Name", "Email", "Role", "Employment Category", "Department", "Page Access", ...(isTechnical ? ["Actions"] : [])].map((h) => (
                    <TableCell key={h} sx={{ borderBottom: `1px solid ${alpha(p, 0.1)}`, py: 1.5, px: 2, fontFamily: "Arial, sans-serif", fontSize: "0.62rem", fontWeight: 700, color: alpha(p, 0.55), textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap", textAlign: ["Page Access", "Actions"].includes(h) ? "center" : "left" }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedUsers.length > 0 ? paginatedUsers.map((user, idx) => {
                  const categoryInfo = getEmploymentCategoryInfo(user.employmentCategory, user.customCategory || user.custom_category);
                  const isIncomplete = tableTab === 1;
                  return (
                    <TableRow key={user.employeeNumber} sx={{ "&:nth-of-type(even)": { bgcolor: "#fafafa" }, "&:hover": { bgcolor: alpha(p, 0.03) }, transition: "background-color 0.12s", borderBottom: `1px solid ${alpha(p, 0.06)}` }}>
                      <TableCell sx={{ py: 1.5, px: 2, borderBottom: "none" }}>
                        <Checkbox checked={isEmployeeSelected(user.employeeNumber)} onChange={() => toggleSelectEmployee(user.employeeNumber)} sx={{ color: alpha(p, 0.3), "&.Mui-checked": { color: p }, p: 0 }} size="small" />
                      </TableCell>
                      <TableCell sx={{ py: 1.5, px: 2, borderBottom: "none" }}>
                        <Typography sx={{ fontFamily: "Arial, sans-serif", fontSize: "0.78rem", fontWeight: 600, color: "#000000" }}>{user.employeeNumber}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5, px: 2, borderBottom: "none" }}>
                        {isIncomplete ? (
                          <Box>
                            <Typography sx={{ fontSize: "0.82rem", fontStyle: "italic", color: "#9ca3af", fontFamily: "Arial, sans-serif" }}>No name on record</Typography>
                            <Box sx={{ display: "inline-flex", mt: 0.25, px: 1, py: 0.1, bgcolor: alpha("#f59e0b", 0.1), border: `1px solid ${alpha("#f59e0b", 0.25)}`, borderRadius: "20px" }}>
                              <Typography sx={{ fontFamily: "Arial, sans-serif", fontSize: "0.58rem", fontWeight: 800, color: "#d97706" }}>MISSING</Typography>
                            </Box>
                          </Box>
                        ) : (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Avatar src={user.avatar || ""} alt={user.fullName} sx={{ width: 34, height: 34, bgcolor: alpha(p, 0.12), color: p, fontWeight: 700, fontSize: "0.78rem", border: `2px solid ${alpha(p, 0.1)}` }}>
                              {!user.avatar && getInitials(user.fullName)}
                            </Avatar>
                            <Typography sx={{ fontWeight: 600, fontSize: "0.875rem", color: "#111", fontFamily: "Arial, sans-serif" }}>{user.fullName}</Typography>
                          </Box>
                        )}
                      </TableCell>
                      {/* EMAIL — IBM Plex Mono only here */}
                      <TableCell sx={{ py: 1.5, px: 2, borderBottom: "none" }}>
                        <Typography sx={{ fontSize: "0.8rem", color: "#4b5563", fontFamily: "'IBM Plex Mono', monospace" }}>{user.email || "—"}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5, px: 2, borderBottom: "none" }}>
                        {user.role === "technical" ? (
                          <Box sx={{ display: "inline-flex", alignItems: "center", px: 1.5, py: 0.5, bgcolor: alpha(p, 0.08), border: `1px solid ${alpha(p, 0.2)}`, borderRadius: "20px" }}>
                            <Typography sx={{ fontFamily: "Arial, sans-serif", fontSize: "0.65rem", fontWeight: 800, color: p }}>TECHNICAL</Typography>
                          </Box>
                        ) : (
                          <Select value={user.role || "staff"} onChange={(e) => handleRoleChange(user, e.target.value)} size="small"
                            sx={{ minWidth: 140, borderRadius: 1.5, bgcolor: "#fafafa", fontSize: "0.82rem", fontFamily: "Arial, sans-serif", "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e5e7eb" }, "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: alpha(p, 0.35) }, "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: p } }}>
                            <MenuItem value="superadmin" sx={{ fontSize: "0.82rem", fontFamily: "Arial, sans-serif" }}>Superadmin</MenuItem>
                            <MenuItem value="administrator" sx={{ fontSize: "0.82rem", fontFamily: "Arial, sans-serif" }}>Administrator</MenuItem>
                            <MenuItem value="staff" sx={{ fontSize: "0.82rem", fontFamily: "Arial, sans-serif" }}>Staff</MenuItem>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.5, px: 2, borderBottom: "none" }}>
                        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, px: 1.5, py: 0.5, bgcolor: categoryInfo.bgcolor, border: `1px solid ${alpha(categoryInfo.color, 0.3)}`, borderRadius: "20px" }}>
                          <Circle sx={{ fontSize: 7, color: categoryInfo.color }} />
                          <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, color: categoryInfo.color, whiteSpace: "nowrap", fontFamily: "Arial, sans-serif" }}>{categoryInfo.label}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1.5, px: 2, borderBottom: "none" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Business sx={{ fontSize: 14, color: "#9ca3af" }} />
                          <Typography sx={{ fontSize: "0.8rem", color: "#4b5563", fontFamily: "Arial, sans-serif" }}>{user.departmentDescription || user.departmentCode || "—"}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1.5, px: 2, borderBottom: "none", textAlign: "center" }}>
                        <Button variant="outlined" size="small" startIcon={<Security sx={{ fontSize: 14 }} />} onClick={() => handlePageAccessClick(user)}
                          sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, fontSize: "0.75rem", px: 1.75, py: 0.6, borderColor: alpha(p, 0.3), color: p, fontFamily: "Arial, sans-serif", boxShadow: "none", "&:hover": { bgcolor: alpha(p, 0.05), borderColor: p } }}>
                          Manage
                        </Button>
                      </TableCell>
                      {isTechnical && (
                        <TableCell sx={{ py: 1.5, px: 2, borderBottom: "none", textAlign: "center" }}>
                          <Box sx={{ display: "flex", gap: 0.75, justifyContent: "center" }}>
                            <Tooltip title="Edit User">
                              <IconButton size="small" onClick={() => handleEditUser(user)} sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: alpha(p, 0.07), color: p, "&:hover": { bgcolor: p, color: "#fff" }, transition: "all 0.15s" }}>
                                <EditIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete User">
                              <IconButton size="small" onClick={() => handleDeleteUser(user)} sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: alpha("#ef4444", 0.07), color: "#ef4444", "&:hover": { bgcolor: "#ef4444", color: "#fff" }, transition: "all 0.15s" }}>
                                <DeleteIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={isTechnical ? 9 : 8} sx={{ textAlign: "center", py: 10, border: "none" }}>
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
                        <Box sx={{ width: 56, height: 56, borderRadius: 3, bgcolor: alpha(p, 0.07), display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Info sx={{ fontSize: 28, color: alpha(p, 0.3) }} />
                        </Box>
                        <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#6b7280", fontFamily: "Arial, sans-serif" }}>{tableTab === 1 ? "No Incomplete Accounts" : "No Users Found"}</Typography>
                        <Typography sx={{ fontSize: "0.8rem", color: "#9ca3af", fontFamily: "Arial, sans-serif" }}>Try adjusting your filters</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </SharpTableContainer>

          {filteredUsers.length > 0 && (
            <Box sx={{ px: 2, py: 1, borderTop: `1px solid ${alpha(p, 0.07)}`, display: "flex", justifyContent: "flex-end" }}>
              <TablePagination component="div" count={filteredUsers.length} page={page} onPageChange={(_, np) => setPage(np)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} rowsPerPageOptions={[5, 10, 25, 50, 100]}
                sx={{ "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontFamily: "Arial, sans-serif", fontSize: "0.7rem", color: "#6b7280" } }} />
            </Box>
          )}
        </Box>

        <Portal>
          <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />
        </Portal>

        {error && (
          <Backdrop open sx={{ zIndex: 9999, backdropFilter: "blur(8px)", backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setError("")}>
            <Fade in timeout={300}>
              <Box onClick={(e) => e.stopPropagation()} sx={{ minWidth: 400, maxWidth: 600 }}>
                <Alert severity="error" icon={<Cancel />} onClose={() => setError("")} sx={{ borderRadius: 3, boxShadow: "0 12px 48px rgba(0,0,0,0.4)", fontSize: "1rem", p: 3 }}>{error}</Alert>
              </Box>
            </Fade>
          </Backdrop>
        )}

        {/* ════════════════════════════════════════════════════════════════
            PASSWORD MANAGEMENT MODAL
        ════════════════════════════════════════════════════════════════ */}
        <Dialog open={pwMgmtOpen} onClose={closePwMgmt} maxWidth="xl" fullWidth PaperProps={{ sx: { borderRadius: 3, bgcolor: PW_SUBTLE, height: "90vh", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "row", fontFamily: "Arial, sans-serif" } }}>
          <style>{PW_CSS}</style>
          <Box sx={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", p: 3.5, gap: 2.5, minWidth: 0, pr: `${PW_SIDEBAR_W + 16}px` }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", animation: "pw-banner-slide 0.4s ease", flexShrink: 0 }}>
              <Typography sx={{ fontSize: "0.7rem", color: PW_MUTED, fontFamily: "Arial, sans-serif" }}>System</Typography>
              <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: PW_BD }} />
              <Typography sx={{ fontSize: "0.7rem", color: PW_P, fontWeight: 700, fontFamily: "Arial, sans-serif" }}>Password Management</Typography>
              <Box sx={{ flex: 1 }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 0.75, bgcolor: PW_PANEL, border: `1px solid ${PW_BD}`, borderRadius: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#22c55e", animation: "pw-pulse-ring 2s infinite", flexShrink: 0 }} />
                <Typography sx={{ fontSize: "0.67rem", color: PW_MUTED, fontFamily: "Arial, sans-serif" }}>{pwUsers.length} users registered</Typography>
              </Box>
              <Tooltip title="Close"><IconButton onClick={closePwMgmt} size="small" sx={{ bgcolor: alpha(PW_P, 0.08), color: PW_P, borderRadius: 1.5, "&:hover": { bgcolor: alpha(PW_P, 0.15) } }}><Close sx={{ fontSize: 18 }} /></IconButton></Tooltip>
            </Box>
            <PwFlatCard sx={{ animation: "pw-section-in 0.4s ease", flexShrink: 0 }}>
              <PwCardBanner />
              <Box sx={{ px: 4, py: 3, display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
                <Avatar sx={{ width: 64, height: 64, bgcolor: alpha(PW_P, 0.1), border: `4px solid ${PW_PANEL}`, boxShadow: `0 6px 20px ${alpha(PW_P, 0.22)}` }}>
                  <LockResetIcon sx={{ color: PW_P, fontSize: 32 }} />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 160 }}>
                  <Typography sx={{ fontWeight: 900, fontSize: "1.5rem", color: PW_P, lineHeight: 1.15, mb: 0.5, letterSpacing: "-0.01em", fontFamily: "Arial, sans-serif" }}>Password Management</Typography>
                  <Typography sx={{ fontSize: "0.76rem", color: PW_MUTED, fontWeight: 600, mb: 1.25, fontFamily: "Arial, sans-serif" }}>Resets a user's password to their surname (ALL CAPS)</Typography>
                  <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                    {[{ label: "Total", value: pwUsers.length, color: PW_P }, { label: "Complete", value: pwProperUsers.length, color: "#16a34a" }, { label: "Incomplete", value: pwIncompleteUsers.length, color: "#d97706" }].map(({ label, value, color }) => (
                      <Box key={label} sx={{ px: 1.75, py: 0.6, bgcolor: alpha(color, 0.07), border: `1px solid ${alpha(color, 0.2)}`, borderRadius: "20px", display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Typography sx={{ fontWeight: 900, fontSize: "0.82rem", color, lineHeight: 1, fontFamily: "Arial, sans-serif" }}>{value}</Typography>
                        <Typography sx={{ fontSize: "0.58rem", color: alpha(color, 0.7), textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "Arial, sans-serif" }}>{label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Tooltip title="Refresh Users"><IconButton onClick={fetchPwUsers} disabled={pwLoading} sx={{ width: 38, height: 38, border: `1px solid ${PW_BD}`, borderRadius: 1.5, bgcolor: PW_PANEL, "&:hover": { borderColor: PW_P, color: PW_P }, "&:disabled": { opacity: 0.5 } }}>{pwLoading ? <CircularProgress size={16} sx={{ color: PW_P }} /> : <RefreshIcon sx={{ fontSize: 18 }} />}</IconButton></Tooltip>
              </Box>
            </PwFlatCard>
            {pwErrMessage && <Fade in timeout={250}><Alert severity="error" icon={<Cancel />} onClose={() => setPwErrMessage("")} sx={{ borderRadius: 2, fontWeight: 500, flexShrink: 0 }}>{pwErrMessage}</Alert></Fade>}
            {pwSuccessOpen && <Fade in timeout={250}><Alert severity="success" icon={<CheckCircle />} onClose={() => setPwSuccessOpen(false)} sx={{ borderRadius: 2, fontWeight: 500, flexShrink: 0 }}>Password has been reset successfully.</Alert></Fade>}
            <PwFlatCard sx={{ animation: "pw-section-in 0.35s ease 0.05s both", flexShrink: 0 }}>
              <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${PW_BD}`, display: "flex", alignItems: "center", gap: 1.5 }}>
                <Avatar sx={{ bgcolor: alpha(PW_P, 0.1), width: 34, height: 34 }}><Search sx={{ color: PW_P, fontSize: 18 }} /></Avatar>
                <Typography sx={{ fontWeight: 900, fontSize: "0.85rem", color: PW_P, fontFamily: "Arial, sans-serif" }}>Search Users</Typography>
              </Box>
              <Box sx={{ px: 3, py: 2.5 }}>
                <TextField fullWidth size="small" placeholder="Search by name, email, or employee number…" value={pwSearchTerm} onChange={(e) => setPwSearchTerm(e.target.value)} sx={PW_INPUT} InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: alpha(PW_P, 0.4), fontSize: 18 }} /></InputAdornment> }} />
              </Box>
            </PwFlatCard>
            <PwFlatCard sx={{ animation: "pw-section-in 0.35s ease 0.1s both", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <PwSectionHeader icon={pwNavSection === "incomplete" ? WarningAmberRounded : pwNavSection === "accounts" ? CheckCircle : Person} title={pwNavSection === "all" ? "All Accounts" : pwNavSection === "accounts" ? "Complete Accounts" : "Incomplete Accounts"} subtitle={pwSearchTerm ? `${pwFilteredUsers.length} of ${pwSourceUsers.length} users matching "${pwSearchTerm}"` : `${pwFilteredUsers.length} user${pwFilteredUsers.length !== 1 ? "s" : ""} shown`}
                action={pwIncompleteUsers.length > 0 && pwNavSection !== "accounts" ? (<Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.5, py: 0.5, bgcolor: alpha("#f59e0b", 0.08), border: `1px solid ${alpha("#f59e0b", 0.25)}`, borderRadius: "20px" }}><WarningAmberRounded sx={{ fontSize: 13, color: "#d97706" }} /><Typography sx={{ fontSize: "0.63rem", fontWeight: 900, color: "#d97706", fontFamily: "Arial, sans-serif" }}>{pwIncompleteUsers.length} incomplete</Typography></Box>) : null} />
              {pwNavSection === "incomplete" && pwIncompleteUsers.length > 0 && (
                <Box sx={{ px: 3, py: 1.25, bgcolor: alpha("#f59e0b", 0.05), borderBottom: `1px solid ${alpha("#f59e0b", 0.18)}`, display: "flex", alignItems: "center", gap: 1 }}>
                  <WarningAmberRounded sx={{ fontSize: 13, color: "#d97706", flexShrink: 0 }} />
                  <Typography sx={{ fontSize: "0.65rem", color: "#92400e", fontFamily: "Arial, sans-serif" }}>These accounts are missing a full name. They can still have their password reset, but should be updated in employee records.</Typography>
                </Box>
              )}
              {pwLoading && pwUsers.length === 0 ? (
                <Box sx={{ flex: 1, overflow: "auto" }}>
                  <Table sx={{ minWidth: 700 }} stickyHeader>
                    <TableHead>
                      <TableRow sx={{ bgcolor: PW_SUBTLE }}>
                        {["Employee #","Full Name","Email","Role","Action"].map((h, i) => (
                          <TableCell key={h} sx={{ fontFamily: "Arial, sans-serif", fontSize: "0.6rem", fontWeight: 700, color: alpha(PW_P, 0.5), textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: `2px solid ${alpha(PW_P, 0.12)}`, py: 1.5, px: 2.5, whiteSpace: "nowrap", textAlign: i === 4 ? "center" : "left", bgcolor: PW_SUBTLE }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Array.from({ length: 7 }).map((_, idx) => (
                        <TableRow key={idx} sx={{ "&:nth-of-type(even)": { bgcolor: alpha(PW_P, 0.018) }, borderBottom: `1px solid ${alpha(PW_P, 0.06)}` }}>
                          <TableCell sx={{ px: 2.5, py: 1.75 }}><ULShim width={64} height={13} borderRadius={4} /></TableCell>
                          <TableCell sx={{ px: 2.5, py: 1.75 }}><Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}><Box sx={{ width: 38, height: 38, borderRadius: "50%", bgcolor: alpha(PW_P, 0.08), flexShrink: 0 }} /><Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}><ULShim width={110 + (idx % 3) * 20} height={13} borderRadius={4} /><ULShim width={60} height={10} borderRadius={10} /></Box></Box></TableCell>
                          <TableCell sx={{ px: 2.5, py: 1.75 }}><ULShim width={140 + (idx % 2) * 30} height={13} borderRadius={4} /></TableCell>
                          <TableCell sx={{ px: 2.5, py: 1.75 }}><ULShim width={72} height={22} borderRadius={11} /></TableCell>
                          <TableCell sx={{ px: 2.5, py: 1.75, textAlign: "center" }}><Box sx={{ display: "flex", justifyContent: "center" }}><ULShim width={72} height={30} borderRadius={6} /></Box></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              ) : (
                <Box sx={{ flex: 1, overflow: "auto" }}>
                  <Table sx={{ minWidth: 700 }} stickyHeader>
                    <TableHead>
                      <TableRow sx={{ bgcolor: PW_SUBTLE }}>
                        {["Employee #","Full Name","Email","Role","Action"].map((h, i) => (
                          <TableCell key={h} sx={{ fontFamily: "Arial, sans-serif", fontSize: "0.6rem", fontWeight: 700, color: alpha(PW_P, 0.5), textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: `2px solid ${alpha(PW_P, 0.12)}`, py: 1.5, px: 2.5, whiteSpace: "nowrap", textAlign: i === 4 ? "center" : "left", bgcolor: PW_SUBTLE }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pwPaginatedUsers.length > 0 ? pwPaginatedUsers.map((user) => {
                        const isIncomplete = !user.fullName?.trim();
                        const roleBadge = getPwRoleBadge(user.role);
                        return (
                          <TableRow key={user.employeeNumber} sx={{ "&:nth-of-type(even)": { bgcolor: alpha(PW_P, 0.018) }, "&:hover": { bgcolor: alpha(PW_P, 0.04) }, transition: "background-color 0.15s ease", borderBottom: `1px solid ${alpha(PW_P, 0.06)}` }}>
                            <TableCell sx={{ px: 2.5, py: 1.75 }}><Typography sx={{ fontSize: "0.74rem", color: alpha(PW_P, 0.55), fontWeight: 600, fontFamily: "Arial, sans-serif" }}>#{user.employeeNumber}</Typography></TableCell>
                            <TableCell sx={{ px: 2.5, py: 1.75 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                <Avatar src={user.avatar || ""} alt={user.fullName} sx={{ width: 38, height: 38, bgcolor: isIncomplete ? alpha("#f59e0b", 0.18) : alpha(PW_P, 0.12), color: isIncomplete ? "#d97706" : PW_P, fontWeight: 700, fontSize: "0.82rem", border: `2px solid ${PW_PANEL}`, boxShadow: `0 2px 8px ${alpha(PW_P, 0.12)}` }}>
                                  {!user.avatar && (isIncomplete ? "?" : getInitials(user.fullName))}
                                </Avatar>
                                {isIncomplete ? (
                                  <Box>
                                    <Typography sx={{ fontStyle: "italic", color: alpha(PW_TXT, 0.35), fontSize: "0.82rem", fontFamily: "Arial, sans-serif" }}>No name on record</Typography>
                                    <Box sx={{ display: "inline-flex", alignItems: "center", mt: 0.25, px: 1, py: 0.15, bgcolor: alpha("#f59e0b", 0.1), border: `1px solid ${alpha("#f59e0b", 0.25)}`, borderRadius: "20px" }}><Typography sx={{ fontSize: "0.58rem", fontWeight: 900, color: "#d97706", fontFamily: "Arial, sans-serif" }}>MISSING</Typography></Box>
                                  </Box>
                                ) : <Typography sx={{ fontWeight: 700, fontSize: "0.875rem", color: PW_TXT, fontFamily: "Arial, sans-serif" }}>{user.fullName}</Typography>}
                              </Box>
                            </TableCell>
                            {/* EMAIL in PW modal — IBM Plex Mono */}
                            <TableCell sx={{ px: 2.5, py: 1.75 }}>
                              <Typography sx={{ fontSize: "0.72rem", color: PW_MUTED, bgcolor: PW_SUBTLE, px: 1, py: 0.4, borderRadius: 1, display: "inline-block", border: `1px solid ${PW_BD}`, fontFamily: "'IBM Plex Mono', monospace" }}>{user.email || "N/A"}</Typography>
                            </TableCell>
                            <TableCell sx={{ px: 2.5, py: 1.75 }}><Box sx={{ display: "inline-flex", alignItems: "center", px: 1.25, py: 0.35, bgcolor: alpha(roleBadge.color, 0.08), border: `1px solid ${alpha(roleBadge.color, 0.22)}`, borderRadius: "20px" }}><Typography sx={{ fontSize: "0.65rem", fontWeight: 900, color: roleBadge.color, fontFamily: "Arial, sans-serif" }}>{(user.role || "N/A").toUpperCase()}</Typography></Box></TableCell>
                            <TableCell sx={{ px: 2.5, py: 1.75, textAlign: "center" }}>
                              <PwBtn sm disabled={pwResetting[user.employeeNumber] || !user.email} onClick={() => handleResetPassword(user.employeeNumber)} startIcon={pwResetting[user.employeeNumber] ? <CircularProgress size={13} sx={{ color: "#fff" }} /> : <LockResetIcon sx={{ fontSize: "14px !important" }} />}>
                                {pwResetting[user.employeeNumber] ? "Resetting…" : "Reset"}
                              </PwBtn>
                            </TableCell>
                          </TableRow>
                        );
                      }) : (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ textAlign: "center", py: 8, border: "none" }}>
                            <LockResetIcon sx={{ fontSize: 52, color: alpha(PW_P, 0.18), mb: 1.5, display: "block", mx: "auto" }} />
                            <Typography sx={{ fontWeight: 700, color: alpha(PW_P, 0.5), fontSize: "0.92rem", mb: 0.5, fontFamily: "Arial, sans-serif" }}>{pwNavSection === "incomplete" ? "No Incomplete Accounts" : "No Users Found"}</Typography>
                            <Typography sx={{ color: PW_MUTED, fontSize: "0.8rem", fontFamily: "Arial, sans-serif" }}>{pwSearchTerm ? "Try adjusting your search" : pwNavSection === "incomplete" ? "All accounts have a full name on record" : "No users available"}</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
              )}
              {pwFilteredUsers.length > 0 && (
                <Box sx={{ px: 2, py: 1, borderTop: `1px solid ${PW_BD}`, display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
                  <TablePagination component="div" count={pwFilteredUsers.length} page={pwPage} onPageChange={(_, np) => setPwPage(np)} rowsPerPage={pwRowsPerPage} onRowsPerPageChange={(e) => { setPwRowsPerPage(parseInt(e.target.value, 10)); setPwPage(0); }} rowsPerPageOptions={[5, 10, 25, 50]} sx={{ "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontFamily: "Arial, sans-serif", fontSize: "0.7rem", color: PW_MUTED } }} />
                </Box>
              )}
            </PwFlatCard>
          </Box>
          {/* Sidebar */}
          <Box sx={{ width: PW_SIDEBAR_W, bgcolor: PW_PANEL, borderLeft: `2px solid ${alpha(PW_P, 0.28)}`, boxShadow: `-3px 0 18px ${alpha(PW_P, 0.05)}`, display: "flex", flexDirection: "column", position: "absolute", right: 0, top: 0, height: "100%", overflowY: "auto", zIndex: 1 }}>
            <Box sx={{ px: 2.5, py: 2.5, borderBottom: `1px solid ${alpha(PW_P, 0.1)}`, display: "flex", alignItems: "center", gap: 1.75, flexShrink: 0, background: `linear-gradient(135deg,${alpha(PW_P, 0.07)} 0%,${alpha(PW_P, 0.01)} 100%)` }}>
              <Box sx={{ width: 34, height: 34, bgcolor: PW_P, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 1.5, flexShrink: 0, boxShadow: `0 4px 12px ${alpha(PW_P, 0.4)}` }}><LockResetIcon sx={{ fontSize: 17, color: "#fff" }} /></Box>
              <Box><Typography sx={{ fontWeight: 900, fontSize: "0.84rem", color: PW_P, lineHeight: 1.2, fontFamily: "Arial, sans-serif" }}>Password Mgmt</Typography><Typography sx={{ fontSize: "0.54rem", color: alpha(PW_P, 0.4), letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Arial, sans-serif" }}>User Admin</Typography></Box>
            </Box>
            <Box sx={{ mx: 2, my: 1.75, p: 1.75, bgcolor: alpha(PW_P, 0.04), borderRadius: 2, border: `1px solid ${alpha(PW_P, 0.1)}`, flexShrink: 0 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                {[{ label: "Total", value: pwUsers.length, color: PW_P }, { label: "OK", value: pwProperUsers.length, color: "#16a34a" }, { label: "Missing", value: pwIncompleteUsers.length, color: "#d97706" }].map(({ label, value, color }) => (
                  <Box key={label} sx={{ textAlign: "center" }}><Typography sx={{ fontWeight: 900, fontSize: "1.2rem", color, lineHeight: 1, fontFamily: "Arial, sans-serif" }}>{value}</Typography><Typography sx={{ fontSize: "0.54rem", color: PW_MUTED, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "Arial, sans-serif" }}>{label}</Typography></Box>
                ))}
              </Box>
            </Box>
            <Box sx={{ mx: 2, mb: 1.5, px: 1.75, py: 1.1, bgcolor: alpha(PW_P, 0.06), borderRadius: 1.5, border: `1px solid ${alpha(PW_P, 0.16)}`, flexShrink: 0 }}>
              <Typography sx={{ fontSize: "0.53rem", color: alpha(PW_P, 0.45), textTransform: "uppercase", letterSpacing: "0.1em", mb: 0.3, fontFamily: "Arial, sans-serif" }}>Active Filter</Typography>
              <Typography sx={{ fontWeight: 900, fontSize: "0.78rem", color: PW_P, fontFamily: "Arial, sans-serif" }}>{pwNavSection === "all" ? "All Accounts" : pwNavSection === "accounts" ? "Complete Accounts" : "Incomplete Accounts"}</Typography>
            </Box>
            <Typography sx={{ fontSize: "0.53rem", fontWeight: 700, color: alpha(PW_P, 0.32), letterSpacing: "0.14em", textTransform: "uppercase", px: 2.5, pb: 0.75, pt: 0.25, fontFamily: "Arial, sans-serif" }}>Filter by Type</Typography>
            <Box sx={{ flex: 1 }}>
              {PW_NAV.map(({ key, label, icon: Icon }) => {
                const active = pwNavSection === key;
                const count = pwNavCount(key);
                return (
                  <Box key={key} onClick={() => { setPwNavSection(key); setPwSearchTerm(""); setPwPage(0); }} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, py: 1.2, cursor: "pointer", borderLeft: active ? `3px solid ${PW_P}` : "3px solid transparent", bgcolor: active ? alpha(PW_P, 0.09) : "transparent", transition: "all 0.14s ease", "&:hover": { bgcolor: active ? alpha(PW_P, 0.09) : alpha(PW_P, 0.04) } }}>
                    <Icon sx={{ fontSize: 15, color: active ? PW_P : alpha(PW_P, 0.35), flexShrink: 0 }} />
                    <Typography sx={{ fontSize: "0.82rem", fontWeight: active ? 700 : 500, color: active ? PW_P : PW_MUTED, flex: 1, fontFamily: "Arial, sans-serif" }}>{label}</Typography>
                    {count > 0 && <Box sx={{ px: 1, py: 0.1, bgcolor: active ? alpha(PW_P, 0.15) : alpha(PW_P, 0.07), borderRadius: "20px" }}><Typography sx={{ fontSize: "0.58rem", fontWeight: 900, color: active ? PW_P : PW_MUTED, fontFamily: "Arial, sans-serif" }}>{count}</Typography></Box>}
                  </Box>
                );
              })}
            </Box>
            <Box sx={{ px: 2.5, py: 1.75, borderTop: `1px solid ${alpha(PW_P, 0.08)}`, flexShrink: 0, bgcolor: alpha(PW_P, 0.013) }}>
              <Typography sx={{ fontSize: "0.58rem", color: alpha(PW_P, 0.4), fontFamily: "Arial, sans-serif" }}>Password Mgmt · HRIS System</Typography>
            </Box>
          </Box>
        </Dialog>

        {/* ── Grant confirm dialog ── */}
        <Dialog open={confirmRole !== null} onClose={() => setConfirmRole(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", fontFamily: "Arial, sans-serif" } }}>
          <Box sx={{ height: 4, background: `linear-gradient(90deg, ${p} 0%, ${s} 100%)` }} />
          <Box sx={{ px: 3, py: 2.5, display: "flex", alignItems: "center", gap: 1.5, borderBottom: `1px solid #f0f0f0` }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: alpha(p, 0.08), display: "flex", alignItems: "center", justifyContent: "center" }}><VerifiedUser sx={{ fontSize: 18, color: p }} /></Box>
            <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", fontFamily: "Arial, sans-serif" }}>Confirm Access Grant</Typography>
          </Box>
          <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
            <Typography sx={{ fontSize: "0.875rem", mb: 2, lineHeight: 1.65, color: "#374151", fontFamily: "Arial, sans-serif" }}>
              Grant default page access to all{" "}
              {confirmRole && <Box component="span" sx={{ fontWeight: 700, px: 1.25, py: 0.3, borderRadius: 1.5, bgcolor: alpha(p, 0.1), color: p, display: "inline-block", ml: 0.5 }}>{confirmRole.charAt(0).toUpperCase() + confirmRole.slice(1)}</Box>}{" "}
              users?
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.25, px: 3, pb: 2.5 }}>
            <Button onClick={() => setConfirmRole(null)} sx={{ textTransform: "none", fontSize: "0.82rem", color: "#6b7280", px: 2.5, py: 0.75, borderRadius: 2, fontFamily: "Arial, sans-serif" }}>Cancel</Button>
            <Button variant="contained" disableElevation onClick={() => { handleGrantRoleAccess(confirmRole); setConfirmRole(null); }} disabled={grantingRole !== null} sx={{ textTransform: "none", fontSize: "0.82rem", px: 2.5, py: 0.75, borderRadius: 2, bgcolor: p, color: "#fff", fontFamily: "Arial, sans-serif", boxShadow: `0 4px 14px ${alpha(p, 0.3)}`, "&:hover": { bgcolor: s } }}>
              {grantingRole === confirmRole ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "Confirm"}
            </Button>
          </Box>
        </Dialog>

        <Dialog open={!!grantSuccessDialog} onClose={() => setGrantSuccessDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", p: 0, fontFamily: "Arial, sans-serif" } }}>
          <Box sx={{ height: 4, background: `linear-gradient(90deg, ${p} 0%, ${s} 100%)` }} />
          <Box sx={{ bgcolor: alpha(p, 0.05), px: 4, pt: 4, pb: 3.5, textAlign: "center" }}>
            <Box sx={{ width: 56, height: 56, borderRadius: 3, bgcolor: alpha(p, 0.1), display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}><CheckCircle sx={{ fontSize: 28, color: p }} /></Box>
            <Typography sx={{ fontSize: "1.05rem", fontWeight: 700, color: "#111", mb: 0.5, fontFamily: "Arial, sans-serif" }}>Access Granted</Typography>
            <Typography sx={{ fontSize: "0.78rem", color: "#6b7280", fontFamily: "Arial, sans-serif" }}>Default pages successfully assigned</Typography>
          </Box>
          <Box sx={{ px: 3.5, pt: 3, pb: 3.5 }}>
            {[{ label: "Role", value: grantSuccessDialog?.role?.charAt(0).toUpperCase() + grantSuccessDialog?.role?.slice(1), pill: true }, { label: "Users updated", value: `${grantSuccessDialog?.usersProcessed} users` }, { label: "Pages granted", value: `${grantSuccessDialog?.pagesGranted} pages` }].map(({ label, value, pill }) => (
              <Box key={label} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, bgcolor: alpha(p, 0.04), border: `1px solid ${alpha(p, 0.1)}`, borderRadius: 2, mb: 1.25 }}>
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151", fontFamily: "Arial, sans-serif" }}>{label}</Typography>
                {pill ? <Chip label={value} size="small" sx={{ bgcolor: roleGrantColors[grantSuccessDialog?.role]?.bgcolor, color: roleGrantColors[grantSuccessDialog?.role]?.color, fontWeight: 700, fontSize: "0.75rem" }} /> : <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#111", fontFamily: "Arial, sans-serif" }}>{value}</Typography>}
              </Box>
            ))}
            <Button fullWidth variant="contained" onClick={() => setGrantSuccessDialog(null)} sx={{ mt: 1.5, py: 1.25, borderRadius: 2.5, fontWeight: 700, bgcolor: p, color: "#fff", textTransform: "none", fontFamily: "Arial, sans-serif", boxShadow: `0 4px 14px ${alpha(p, 0.3)}`, "&:hover": { bgcolor: s } }}>Done</Button>
          </Box>
        </Dialog>

        {/* ── Page Access Dialog ── */}
        <Dialog open={pageAccessDialog} onClose={closePageAccessDialog} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3, bgcolor: "#f7f8fa", height: "90vh", maxHeight: 800, overflow: "hidden", fontFamily: "Arial, sans-serif" } }}>
          <Box sx={{ height: 4, background: `linear-gradient(90deg, ${p} 0%, ${s} 100%)`, flexShrink: 0 }} />
          <DialogTitle sx={{ bgcolor: "#fff", color: "#111", display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, py: 2, fontFamily: "Arial, sans-serif", borderBottom: `1px solid #f0f0f0`, flexShrink: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, background: `linear-gradient(135deg, ${p}, ${s})`, display: "flex", alignItems: "center", justifyContent: "center" }}><Security sx={{ fontSize: 20, color: "#fff" }} /></Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#111", fontFamily: "Arial, sans-serif" }}>Page Access Management</Typography>
                {selectedUser && <Typography sx={{ fontSize: "0.72rem", color: "#6b7280", mt: 0.1, fontFamily: "Arial, sans-serif" }}>{selectedUser.fullName} · #{selectedUser.employeeNumber}</Typography>}
              </Box>
            </Box>
            <IconButton onClick={closePageAccessDialog} sx={{ color: "#6b7280", "&:hover": { bgcolor: "#f5f5f5" } }}><Close /></IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 0, display: "flex", overflow: "hidden", flex: 1 }}>
            {selectedUser && (
              <Box sx={{ display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>
                {/* Left sidebar */}
                <Box sx={{ width: 270, flexShrink: 0, bgcolor: "#ffffff", borderRight: `1px solid #f0f0f0`, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                  <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid #f5f5f5`, background: "#fafafa", flexShrink: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                      <Avatar src={selectedUser.avatar || ""} alt={selectedUser.fullName} sx={{ bgcolor: p, width: 38, height: 38, fontWeight: 700, fontSize: "0.85rem", border: "2px solid #fff", boxShadow: `0 2px 8px ${alpha(p, 0.2)}` }}>{!selectedUser.avatar && getInitials(selectedUser.fullName)}</Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "Arial, sans-serif" }}>{selectedUser.fullName}</Typography>
                        <Typography sx={{ fontSize: "0.67rem", color: "#9ca3af", fontFamily: "Arial, sans-serif" }}>#{selectedUser.employeeNumber} · {selectedUser.role}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ px: 1.75, py: 1, bgcolor: alpha(p, 0.05), borderRadius: 1.5, border: `1px solid ${alpha(p, 0.1)}` }}>
                      <Typography sx={{ fontFamily: "Arial, sans-serif", fontSize: "0.52rem", color: alpha(p, 0.45), textTransform: "uppercase", letterSpacing: "0.1em", mb: 0.2 }}>Current Section</Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.75rem", color: p, fontFamily: "Arial, sans-serif" }}>{activeAccessCategory || "Select a category"}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ flex: 1, overflowY: "auto", py: 1, "&::-webkit-scrollbar": { width: 3 }, "&::-webkit-scrollbar-thumb": { bgcolor: alpha(p, 0.2), borderRadius: 2 } }}>
                    {!pageAccessLoading && pages.length > 0 && (() => {
                      const groupedPages = pages.reduce((acc, page) => { const desc = page.page_description || "Uncategorized"; if (!acc[desc]) acc[desc] = []; acc[desc].push(page); return acc; }, {});
                      const order = ["General","System Administration","Registration","Information Management","Attendance Management","Payroll Management","Form","Pages Management","Personal Data Sheets","Uncategorized"];
                      const sortedDescs = Object.keys(groupedPages).sort((a, b) => { const ia = order.indexOf(a); const ib = order.indexOf(b); if (ia !== -1 && ib !== -1) return ia - ib; if (ia !== -1) return -1; if (ib !== -1) return 1; return a.localeCompare(b); });
                      const categoryIcons = { General: <Category sx={{ fontSize: 14 }} />, "System Administration": <Settings sx={{ fontSize: 14 }} />, Registration: <Assignment sx={{ fontSize: 14 }} />, "Information Management": <Info sx={{ fontSize: 14 }} />, "Attendance Management": <Assessment sx={{ fontSize: 14 }} />, "Payroll Management": <Payment sx={{ fontSize: 14 }} />, Form: <Description sx={{ fontSize: 14 }} />, "Pages Management": <Pages sx={{ fontSize: 14 }} />, "Personal Data Sheets": <Folder sx={{ fontSize: 14 }} />, Uncategorized: <FolderSpecial sx={{ fontSize: 14 }} /> };
                      return sortedDescs.map((desc) => {
                        const isActive = activeAccessCategory === desc;
                        const pagesInGroup = groupedPages[desc] || [];
                        const enabledInGroup = pagesInGroup.filter((pg) => pageAccess[pg.id]).length;
                        const allEnabled = enabledInGroup === pagesInGroup.length && pagesInGroup.length > 0;
                        return (
                          <Box key={desc} onClick={() => setActiveAccessCategory(desc)} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 3, py: 1.1, cursor: "pointer", borderLeft: isActive ? `3px solid ${p}` : "3px solid transparent", bgcolor: isActive ? alpha(p, 0.06) : "transparent", transition: "all 0.15s", "&:hover": { bgcolor: isActive ? alpha(p, 0.06) : alpha(p, 0.03) } }}>
                            <Box sx={{ color: isActive ? p : alpha(p, 0.3), flexShrink: 0 }}>{categoryIcons[desc] || <FolderSpecial sx={{ fontSize: 14 }} />}</Box>
                            <Typography sx={{ fontSize: "0.8rem", fontWeight: isActive ? 700 : 500, color: isActive ? p : "#6b7280", flex: 1, fontFamily: "Arial, sans-serif" }}>{desc}</Typography>
                            <Typography sx={{ fontFamily: "Arial, sans-serif", fontSize: "0.62rem", fontWeight: 700, color: allEnabled ? "#16a34a" : isActive ? p : "#9ca3af" }}>{enabledInGroup}/{pagesInGroup.length}</Typography>
                            {isActive && <ChevronRight sx={{ fontSize: 13, color: alpha(p, 0.35) }} />}
                          </Box>
                        );
                      });
                    })()}
                  </Box>
                  <Box sx={{ px: 3, py: 2, borderTop: `1px solid #f5f5f5`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", fontFamily: "Arial, sans-serif" }}>Toggle All</Typography>
                    <Switch size="small" checked={!pageAccessLoading && pages.length > 0 && Object.values(pageAccess).every((v) => v === true)} onChange={(e) => { const enableAll = e.target.checked; pages.forEach((page) => { if (pageAccess[page.id] !== enableAll) handleTogglePageAccess(page.id, !enableAll); }); }} sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#16a34a" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#16a34a" } }} />
                  </Box>
                </Box>
                {/* Center panel */}
                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", bgcolor: "#f7f8fa" }}>
                  {pageAccessLoading ? (
                    <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><Box sx={{ textAlign: "center" }}><CircularProgress sx={{ color: p, mb: 2 }} /><Typography sx={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 600, fontFamily: "Arial, sans-serif" }}>Loading page access...</Typography></Box></Box>
                  ) : !activeAccessCategory ? (
                    <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><Box sx={{ textAlign: "center", px: 4 }}><Security sx={{ fontSize: 48, color: alpha(p, 0.12), mb: 1.5 }} /><Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#374151", fontFamily: "Arial, sans-serif" }}>Select a Category</Typography></Box></Box>
                  ) : (() => {
                    const groupedPages = pages.reduce((acc, page) => { const desc = page.page_description || "Uncategorized"; if (!acc[desc]) acc[desc] = []; acc[desc].push(page); return acc; }, {});
                    const pagesInGroup = groupedPages[activeAccessCategory] || [];
                    const descInfo = getDescriptionColor(activeAccessCategory, settings);
                    const enabledCount = pagesInGroup.filter((pg) => pageAccess[pg.id]).length;
                    return (
                      <Fade in={!!activeAccessCategory} timeout={250} key={activeAccessCategory}>
                        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                          <Box sx={{ px: 3.5, py: 2.5, background: "#fff", borderBottom: `1px solid #f0f0f0`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <Avatar sx={{ bgcolor: descInfo.sx.bgcolor, width: 38, height: 38 }}>{React.cloneElement(descInfo.icon, { sx: { color: descInfo.sx.color, fontSize: 18 } })}</Avatar>
                              <Box><Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#111", fontFamily: "Arial, sans-serif" }}>{activeAccessCategory}</Typography><Typography sx={{ fontSize: "0.68rem", color: "#9ca3af", fontFamily: "Arial, sans-serif" }}>{enabledCount} of {pagesInGroup.length} enabled</Typography></Box>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                              <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", fontFamily: "Arial, sans-serif" }}>Toggle All</Typography>
                              <Switch size="small" checked={enabledCount === pagesInGroup.length && pagesInGroup.length > 0} onChange={(e) => { const enableAll = e.target.checked; pagesInGroup.forEach((page) => { if (pageAccess[page.id] !== enableAll) handleTogglePageAccess(page.id, !enableAll); }); }} sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#16a34a" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#16a34a" } }} />
                            </Box>
                          </Box>
                          <Box sx={{ flex: 1, overflowY: "auto", p: 2.5, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: alpha(p, 0.2), borderRadius: 2 } }}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                              {pagesInGroup.map((page) => {
                                const userRoleInPageGroup = page.page_group ? page.page_group.split(",").map((g) => g.trim()).includes(selectedUser?.role) : false;
                                const isEnabled = userRoleInPageGroup && !!pageAccess[page.id];
                                return (
                                  <Box key={page.id} sx={{ display: "flex", alignItems: "center", px: 3, py: 1.75, bgcolor: "#ffffff", border: `1px solid ${alpha(p, 0.07)}`, borderRadius: 2, "&:hover": { boxShadow: `0 2px 8px rgba(0,0,0,0.06)` }, transition: "box-shadow 0.15s" }}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Typography sx={{ fontWeight: 600, fontSize: "0.875rem", color: "#111", mb: 0.25, fontFamily: "Arial, sans-serif" }}>{page.page_name}</Typography>
                                      <Typography sx={{ fontSize: "0.67rem", color: "#9ca3af", fontFamily: "Arial, sans-serif" }}>ID: {page.id}{page.page_url && ` · ${page.page_url}`}</Typography>
                                    </Box>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
                                      {accessChangeInProgress[page.id] ? <CircularProgress size={18} sx={{ color: p }} /> : (
                                        <>
                                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, px: 1.25, py: 0.4, borderRadius: "20px", bgcolor: isEnabled ? alpha("#16a34a", 0.08) : userRoleInPageGroup ? alpha("#6b7280", 0.07) : alpha("#ef4444", 0.07), border: `1px solid ${isEnabled ? alpha("#16a34a", 0.25) : userRoleInPageGroup ? alpha("#9ca3af", 0.2) : alpha("#ef4444", 0.25)}` }}>
                                            {isEnabled ? <LockOpen sx={{ fontSize: 10, color: "#16a34a" }} /> : <Lock sx={{ fontSize: 10, color: userRoleInPageGroup ? "#9ca3af" : "#ef4444" }} />}
                                            <Typography sx={{ fontSize: "0.58rem", fontWeight: 800, fontFamily: "Arial, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", color: isEnabled ? "#16a34a" : userRoleInPageGroup ? "#9ca3af" : "#ef4444" }}>{isEnabled ? "Enabled" : userRoleInPageGroup ? "Disabled" : "Not Authorized"}</Typography>
                                          </Box>
                                          <Tooltip title={userRoleInPageGroup ? "" : `Not available for ${selectedUser?.role}`}>
                                            <Switch checked={isEnabled} disabled={!userRoleInPageGroup} onChange={() => handleTogglePageAccess(page.id, isEnabled)} sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#16a34a" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#16a34a" } }} />
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
                <Box sx={{ width: 230, flexShrink: 0, bgcolor: "#ffffff", borderLeft: `2px dashed ${alpha("#16a34a", 0.3)}`, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                  <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${alpha("#16a34a", 0.1)}`, background: alpha("#16a34a", 0.04), flexShrink: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.4 }}>
                      <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#16a34a", flexShrink: 0 }} />
                      <Typography sx={{ fontFamily: "Arial, sans-serif", fontSize: "0.55rem", fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.1em" }}>Accessible Pages</Typography>
                    </Box>
                    <Typography sx={{ fontSize: "0.7rem", color: "#6b7280", pl: 2.25, fontFamily: "Arial, sans-serif" }}>{!pageAccessLoading && pages.length > 0 ? `${pages.filter((pg) => pageAccess[pg.id]).length} of ${pages.length} total` : "—"}</Typography>
                  </Box>
                  <Box sx={{ flex: 1, overflowY: "auto", py: 1.5, "&::-webkit-scrollbar": { width: 3 }, "&::-webkit-scrollbar-thumb": { bgcolor: alpha("#16a34a", 0.2), borderRadius: 2 } }}>
                    {pages.filter((pg) => pageAccess[pg.id]).length > 0 ? (
                      <Box sx={{ px: 1.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
                        {pages.filter((pg) => pageAccess[pg.id]).map((page) => {
                          const isInActiveCategory = activeAccessCategory && (page.page_description || "Uncategorized") === activeAccessCategory;
                          return (
                            <Box key={page.id} sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 0.85, borderRadius: 1.5, bgcolor: isInActiveCategory ? alpha("#16a34a", 0.1) : alpha("#16a34a", 0.04), border: `1px solid ${isInActiveCategory ? alpha("#16a34a", 0.25) : alpha("#16a34a", 0.1)}`, transition: "all 0.15s" }}>
                              <CheckCircle sx={{ fontSize: 11, color: "#16a34a", flexShrink: 0, opacity: isInActiveCategory ? 1 : 0.6 }} />
                              <Typography sx={{ fontSize: "0.72rem", fontWeight: isInActiveCategory ? 700 : 500, color: isInActiveCategory ? "#15803d" : "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "Arial, sans-serif" }}>{page.page_name}</Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    ) : (
                      <Box sx={{ py: 5, textAlign: "center", px: 2 }}>
                        <Lock sx={{ fontSize: 24, color: alpha("#16a34a", 0.15), mb: 1 }} />
                        <Typography sx={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 600, fontFamily: "Arial, sans-serif" }}>No pages granted yet</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2.5, gap: 2, borderTop: `1px solid #f0f0f0`, bgcolor: "#fff", flexShrink: 0 }}>
            <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: "0.72rem", color: "#9ca3af", fontFamily: "Arial, sans-serif" }}>Changes are saved automatically.</Typography></Box>
            <Button onClick={closePageAccessDialog} variant="outlined" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, borderColor: "#e5e7eb", color: "#6b7280", fontFamily: "Arial, sans-serif", "&:hover": { borderColor: "#d1d5db", bgcolor: "#f9fafb" } }}>Cancel</Button>
            <Button variant="contained" startIcon={<CheckCircle sx={{ fontSize: 16 }} />} onClick={() => { window.dispatchEvent(new CustomEvent("pageAccessUpdated", { detail: { employeeNumber: selectedUser?.employeeNumber } })); setSuccessAction("edit"); setSuccessOpen(true); closePageAccessDialog(); }}
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, bgcolor: p, color: "#fff", fontFamily: "Arial, sans-serif", boxShadow: `0 4px 14px ${alpha(p, 0.3)}`, "&:hover": { bgcolor: s } }}>
              Save & Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── User Details Drawer ── */}
        <Drawer anchor="right" open={detailsDrawerOpen} onClose={closeUserDetails} PaperProps={{ sx: { width: isMobile ? "100%" : "500px", bgcolor: "#f7f8fa", fontFamily: "Arial, sans-serif" } }}>
          {selectedUserForDetails && (
            <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <Box sx={{ height: 4, background: `linear-gradient(90deg, ${p} 0%, ${s} 100%)` }} />
              <Box sx={{ px: 3.5, py: 3, bgcolor: "#fff", borderBottom: `1px solid #f0f0f0` }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar src={selectedUserForDetails.avatar || ""} alt={selectedUserForDetails.fullName} sx={{ width: 60, height: 60, bgcolor: alpha(p, 0.12), color: p, fontWeight: 700, fontSize: "1.3rem", border: `3px solid ${alpha(p, 0.15)}` }}>{!selectedUserForDetails.avatar && getInitials(selectedUserForDetails.fullName)}</Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color: "#111", lineHeight: 1.2, fontFamily: "Arial, sans-serif" }}>{selectedUserForDetails.fullName}</Typography>
                      <Box sx={{ display: "inline-flex", alignItems: "center", mt: 0.5, px: 1.25, py: 0.25, bgcolor: alpha(p, 0.08), border: `1px solid ${alpha(p, 0.18)}`, borderRadius: "20px" }}>
                        <Typography sx={{ fontFamily: "Arial, sans-serif", fontSize: "0.65rem", fontWeight: 700, color: p }}>{(selectedUserForDetails.role || "").toUpperCase()}</Typography>
                      </Box>
                    </Box>
                  </Box>
                  <IconButton onClick={closeUserDetails} sx={{ color: "#6b7280", "&:hover": { bgcolor: "#f5f5f5" } }}><Close /></IconButton>
                </Box>
              </Box>
              <Box sx={{ display: "flex", bgcolor: "#fff", borderBottom: `1px solid #f0f0f0` }}>
                {["info", "access"].map((tab) => (
                  <Box key={tab} onClick={() => setActiveTab(tab)} sx={{ flex: 1, p: 1.75, textAlign: "center", cursor: "pointer", borderBottom: activeTab === tab ? `2.5px solid ${p}` : "2.5px solid transparent", color: activeTab === tab ? p : "#6b7280", fontWeight: activeTab === tab ? 700 : 500, fontSize: "0.82rem", "&:hover": { bgcolor: "#fafafa" }, fontFamily: "Arial, sans-serif", transition: "all 0.15s" }}>
                    {tab === "info" ? <><Info sx={{ mr: 0.75, fontSize: 16, verticalAlign: "middle" }} />Information</> : <><Key sx={{ mr: 0.75, fontSize: 16, verticalAlign: "middle" }} />Page Access</>}
                  </Box>
                ))}
              </Box>
              <Box sx={{ flex: 1, overflow: "auto", p: 3 }}>
                {activeTab === "info" && (
                  <Stack spacing={2}>
                    <Box sx={{ bgcolor: "#fff", borderRadius: 2.5, border: `1px solid ${alpha(p, 0.08)}`, overflow: "hidden" }}>
                      <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid #f5f5f5`, display: "flex", alignItems: "center", gap: 1.5 }}>
                        <AssignmentInd sx={{ fontSize: 16, color: p }} />
                        <Typography sx={{ fontWeight: 700, fontSize: "0.875rem", color: "#111", fontFamily: "Arial, sans-serif" }}>Personal Information</Typography>
                      </Box>
                      <Box sx={{ p: 2.5 }}>
                        <Stack spacing={2}>
                          {[{ label: "Full Name", value: selectedUserForDetails.fullName }, { label: "Employee Number", value: `#${selectedUserForDetails.employeeNumber}` }, { label: "Email Address", value: selectedUserForDetails.email }, { label: "Last Login", value: formatDate(selectedUserForDetails.lastLogin) }].map(({ label, value }) => (
                            <Box key={label} sx={{ pb: 1.5, borderBottom: `1px solid #f9f9f9` }}>
                              <Typography sx={{ fontSize: "0.68rem", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.4, fontFamily: "Arial, sans-serif" }}>{label}</Typography>
                              {/* Email value uses monospace */}
                              <Typography sx={{ fontWeight: 600, fontSize: "0.875rem", color: "#111", fontFamily: label === "Email Address" ? "'IBM Plex Mono', monospace" : "Arial, sans-serif" }}>{value || "—"}</Typography>
                            </Box>
                          ))}
                          <Box sx={{ pb: 1.5, borderBottom: `1px solid #f9f9f9` }}>
                            <Typography sx={{ fontSize: "0.68rem", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.75, fontFamily: "Arial, sans-serif" }}>Role</Typography>
                            <Box sx={{ display: "inline-flex", alignItems: "center", px: 1.5, py: 0.4, bgcolor: alpha(p, 0.08), border: `1px solid ${alpha(p, 0.18)}`, borderRadius: "20px" }}>
                              <Typography sx={{ fontFamily: "Arial, sans-serif", fontSize: "0.68rem", fontWeight: 700, color: p }}>{(selectedUserForDetails.role || "").toUpperCase()}</Typography>
                            </Box>
                          </Box>
                          <Box>
                            <Typography sx={{ fontSize: "0.68rem", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.75, fontFamily: "Arial, sans-serif" }}>Employment Category</Typography>
                            {(() => { const info = getEmploymentCategoryInfo(selectedUserForDetails.employmentCategory, selectedUserForDetails.customCategory); return <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, px: 1.5, py: 0.4, bgcolor: info.bgcolor, border: `1px solid ${alpha(info.color, 0.3)}`, borderRadius: "20px" }}><Circle sx={{ fontSize: 7, color: info.color }} /><Typography sx={{ fontSize: "0.72rem", fontWeight: 600, color: info.color, fontFamily: "Arial, sans-serif" }}>{info.label}</Typography></Box>; })()}
                          </Box>
                        </Stack>
                      </Box>
                    </Box>
                  </Stack>
                )}
                {activeTab === "access" && (
                  <Stack spacing={2}>
                    <Box sx={{ bgcolor: "#fff", borderRadius: 2.5, border: `1px solid ${alpha(p, 0.08)}`, overflow: "hidden" }}>
                      <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid #f5f5f5`, display: "flex", alignItems: "center", gap: 1.5 }}>
                        <TrendingUp sx={{ fontSize: 16, color: p }} />
                        <Typography sx={{ fontWeight: 700, fontSize: "0.875rem", color: "#111", fontFamily: "Arial, sans-serif" }}>Page Access Summary</Typography>
                      </Box>
                      <Box sx={{ p: 2.5 }}>
                        <Box sx={{ textAlign: "center", mb: 2.5 }}>
                          <Typography sx={{ fontFamily: "Arial, sans-serif", fontWeight: 900, fontSize: "3rem", color: p, lineHeight: 1 }}>{selectedUserForDetails.accessiblePages?.length || 0}</Typography>
                          <Typography sx={{ fontSize: "0.78rem", color: "#6b7280", mt: 0.5, fontFamily: "Arial, sans-serif" }}>of {selectedUserForDetails.totalPages || 0} pages accessible</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={animatedValue} sx={{ height: 8, borderRadius: 4, bgcolor: alpha(p, 0.08), "& .MuiLinearProgress-bar": { bgcolor: p, borderRadius: 4 } }} />
                        <Typography sx={{ fontSize: "0.68rem", color: "#9ca3af", mt: 1, textAlign: "right", fontFamily: "Arial, sans-serif" }}>{Math.round(animatedValue)}% access</Typography>
                      </Box>
                    </Box>
                  </Stack>
                )}
              </Box>
              <Box sx={{ p: 3, borderTop: `1px solid #f0f0f0`, bgcolor: "#fff" }}>
                <Button fullWidth variant="contained" startIcon={<Security sx={{ fontSize: 17 }} />} onClick={() => { closeUserDetails(); handlePageAccessClick(selectedUserForDetails); }}
                  sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, py: 1.25, bgcolor: p, color: "#fff", fontFamily: "Arial, sans-serif", boxShadow: `0 4px 14px ${alpha(p, 0.3)}`, "&:hover": { bgcolor: s } }}>
                  Manage Page Access
                </Button>
              </Box>
            </Box>
          )}
        </Drawer>

        {/* ── Role Change Dialog ── */}
        <Dialog open={roleChangeDialog} onClose={() => { setRoleChangeDialog(false); setPendingRoleChange(null); }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, fontFamily: "Arial, sans-serif" } }}>
          <Box sx={{ height: 4, background: `linear-gradient(90deg, ${p} 0%, ${s} 100%)` }} />
          <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 3, py: 2.5, fontFamily: "Arial, sans-serif", borderBottom: `1px solid #f0f0f0` }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: alpha(p, 0.08), display: "flex", alignItems: "center", justifyContent: "center" }}><VerifiedUser sx={{ fontSize: 20, color: p }} /></Box>
            <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", fontFamily: "Arial, sans-serif" }}>Confirm Role Change</Typography>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            {pendingRoleChange && (
              <>
                <Box sx={{ mb: 2.5, p: 2.5, borderRadius: 2.5, border: `1px solid #f0f0f0`, bgcolor: "#fafafa" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar sx={{ bgcolor: alpha(p, 0.1), color: p, width: 48, height: 48, fontWeight: 700 }}>{getInitials(pendingRoleChange.user.fullName)}</Avatar>
                    <Box><Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#111", fontFamily: "Arial, sans-serif" }}>{pendingRoleChange.user.fullName}</Typography><Typography sx={{ fontSize: "0.75rem", color: "#6b7280", fontFamily: "Arial, sans-serif", mt: 0.25 }}>#{pendingRoleChange.user.employeeNumber}</Typography></Box>
                  </Box>
                </Box>
                <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }} icon={<Info />}>This role change will be logged in the audit trail.</Alert>
                <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: alpha(p, 0.04), border: `1px solid ${alpha(p, 0.1)}` }}>
                  <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", mb: 1.5, fontFamily: "Arial, sans-serif" }}>Role Change Details</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box sx={{ px: 1.5, py: 0.4, bgcolor: alpha(p, 0.08), border: `1px solid ${alpha(p, 0.18)}`, borderRadius: "20px" }}><Typography sx={{ fontFamily: "Arial, sans-serif", fontSize: "0.68rem", fontWeight: 700, color: p }}>{(pendingRoleChange.oldRole || "").toUpperCase()}</Typography></Box>
                    <Typography sx={{ color: "#9ca3af", fontWeight: 700, fontFamily: "Arial, sans-serif" }}>→</Typography>
                    <Box sx={{ px: 1.5, py: 0.4, bgcolor: alpha(s, 0.08), border: `1px solid ${alpha(s, 0.18)}`, borderRadius: "20px" }}><Typography sx={{ fontFamily: "Arial, sans-serif", fontSize: "0.68rem", fontWeight: 700, color: s }}>{(pendingRoleChange.newRole || "").toUpperCase()}</Typography></Box>
                  </Box>
                </Box>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2.5, gap: 1.5, borderTop: `1px solid #f0f0f0` }}>
            <Button onClick={() => { setRoleChangeDialog(false); setPendingRoleChange(null); }} disabled={roleChangeLoading} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, color: "#6b7280", fontFamily: "Arial, sans-serif" }}>Cancel</Button>
            <Button onClick={confirmRoleChange} variant="contained" disabled={roleChangeLoading} startIcon={roleChangeLoading ? <CircularProgress size={16} /> : <CheckCircle sx={{ fontSize: 16 }} />}
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, bgcolor: p, color: "#fff", fontFamily: "Arial, sans-serif", boxShadow: `0 4px 14px ${alpha(p, 0.3)}`, "&:hover": { bgcolor: s } }}>
              {roleChangeLoading ? "Updating…" : "Confirm Change"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Edit User Dialog ── */}
        <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, fontFamily: "Arial, sans-serif" } }}>
          <Box sx={{ height: 4, background: `linear-gradient(90deg, ${p} 0%, ${s} 100%)` }} />
          <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 3, py: 2.5, borderBottom: `1px solid #f0f0f0` }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: alpha(p, 0.08), display: "flex", alignItems: "center", justifyContent: "center" }}><EditIcon sx={{ fontSize: 20, color: p }} /></Box>
            <Box><Typography sx={{ fontWeight: 700, fontSize: "0.95rem", fontFamily: "Arial, sans-serif" }}>Edit User Information</Typography>{userToEdit && <Typography sx={{ fontSize: "0.72rem", color: "#6b7280", mt: 0.1, fontFamily: "Arial, sans-serif" }}>#{userToEdit.employeeNumber}</Typography>}</Box>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            {userToEdit && (
              <>
                <Box sx={{ p: 2.5, borderRadius: 2.5, border: `1px solid #f0f0f0`, bgcolor: "#fafafa", mb: 2.5 }}>
                  <CleanTextField fullWidth label="Employee Number" value={editedEmployeeNumber} onChange={(e) => setEditedEmployeeNumber(e.target.value)} sx={{ mb: 2 }} required size="small" />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}><CleanTextField fullWidth label="First Name" value={editedFirstName} onChange={(e) => setEditedFirstName(e.target.value)} required size="small" /></Grid>
                    <Grid item xs={12} sm={6}><CleanTextField fullWidth label="Middle Name" value={editedMiddleName} onChange={(e) => setEditedMiddleName(e.target.value)} size="small" /></Grid>
                    <Grid item xs={12} sm={6}><CleanTextField fullWidth label="Last Name" value={editedLastName} onChange={(e) => setEditedLastName(e.target.value)} required size="small" /></Grid>
                    <Grid item xs={12} sm={6}><CleanTextField fullWidth label="Name Extension" value={editedNameExtension} onChange={(e) => setEditedNameExtension(e.target.value)} size="small" /></Grid>
                  </Grid>
                  <CleanTextField fullWidth label="Email" type="email" value={editedEmail} onChange={(e) => setEditedEmail(e.target.value)} sx={{ mt: 2 }} size="small" />
                  <FormControl fullWidth sx={{ mt: 2 }} size="small">
                    <InputLabel sx={{ fontFamily: "Arial, sans-serif", fontSize: "0.82rem" }}>Employment Category</InputLabel>
                    <Select value={editedEmploymentCategory} label="Employment Category" onChange={(e) => { setEditedEmploymentCategory(e.target.value); if (parseInt(e.target.value) !== 5) setEditedCustomCategory(""); }} sx={{ borderRadius: 2, bgcolor: "#fafafa", fontSize: "0.875rem", fontFamily: "Arial, sans-serif" }}>
                      <ListSubheader>Job Order (JO)</ListSubheader>
                      <MenuItem value={0}><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 12, color: "#F57C00" }} /></ListItemIcon>Graduate</MenuItem>
                      <MenuItem value={1}><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 12, color: "#E64A19" }} /></ListItemIcon>UnderGrad</MenuItem>
                      <ListSubheader>Regular</ListSubheader>
                      <MenuItem value={2}><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 12, color: "#2E7D32" }} /></ListItemIcon>Non-Teaching</MenuItem>
                      <MenuItem value={3}><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 12, color: "#1565C0" }} /></ListItemIcon>Teaching (30Hrs)</MenuItem>
                      <MenuItem value={4}><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 12, color: "#7B1FA2" }} /></ListItemIcon>Designated (40Hrs)</MenuItem>
                      <ListSubheader>Custom</ListSubheader>
                      <MenuItem value={5}><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 12, color: "#00796B" }} /></ListItemIcon>Other (specify)</MenuItem>
                    </Select>
                  </FormControl>
                  {parseInt(editedEmploymentCategory) === 5 && <Fade in><CleanTextField fullWidth label="Custom Category Description *" value={editedCustomCategory} onChange={(e) => setEditedCustomCategory(e.target.value)} sx={{ mt: 2 }} required size="small" /></Fade>}
                </Box>
                <Alert severity="info" sx={{ borderRadius: 2 }} icon={<Info />}>Changes will be reflected across all modules and records.</Alert>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2.5, gap: 1.5, borderTop: `1px solid #f0f0f0` }}>
            <Button onClick={() => setEditDialog(false)} disabled={editLoading} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, color: "#6b7280", fontFamily: "Arial, sans-serif" }}>Cancel</Button>
            <Button onClick={handleSaveEdit} variant="contained" disabled={editLoading} startIcon={editLoading ? <CircularProgress size={16} /> : <CheckCircle sx={{ fontSize: 16 }} />}
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, bgcolor: p, color: "#fff", fontFamily: "Arial, sans-serif", boxShadow: `0 4px 14px ${alpha(p, 0.3)}`, "&:hover": { bgcolor: s } }}>
              {editLoading ? "Saving…" : "Save Changes"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Bulk Category Dialog ── */}
        <Dialog open={bulkCategoryDialog} onClose={closeBulkCategoryEdit} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, fontFamily: "Arial, sans-serif" } }}>
          <Box sx={{ height: 4, background: `linear-gradient(90deg, ${p} 0%, ${s} 100%)` }} />
          <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 3, py: 2.5, borderBottom: `1px solid #f0f0f0` }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: alpha(p, 0.08), display: "flex", alignItems: "center", justifyContent: "center" }}><Category sx={{ fontSize: 20, color: p }} /></Box>
            <Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 700, fontSize: "0.95rem", fontFamily: "Arial, sans-serif" }}>Bulk Edit Employment Category</Typography></Box>
            <Box sx={{ px: 1.75, py: 0.4, bgcolor: alpha(p, 0.1), border: `1px solid ${alpha(p, 0.2)}`, borderRadius: "20px" }}><Typography sx={{ fontFamily: "Arial, sans-serif", fontSize: "0.68rem", fontWeight: 700, color: p }}>{selectedEmployeeNumbers.length} selected</Typography></Box>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <Box sx={{ mb: 2.5, p: 2, borderRadius: 2, border: `1px solid #f0f0f0`, bgcolor: "#fafafa" }}>
              <Typography sx={{ fontSize: "0.82rem", color: "#374151", fontFamily: "Arial, sans-serif" }}>This will apply the selected category to all selected employees.</Typography>
            </Box>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontFamily: "Arial, sans-serif", fontSize: "0.82rem" }}>Employment Category</InputLabel>
              <Select value={bulkEmploymentCategory} label="Employment Category" onChange={(e) => { setBulkEmploymentCategory(e.target.value); if (parseInt(e.target.value) !== 5) setBulkCustomCategory(""); }} sx={{ borderRadius: 2, bgcolor: "#fafafa", fontSize: "0.875rem", fontFamily: "Arial, sans-serif" }}>
                <ListSubheader>Job Order (JO)</ListSubheader>
                <MenuItem value={0}><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 12, color: "#F57C00" }} /></ListItemIcon>Graduate</MenuItem>
                <MenuItem value={1}><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 12, color: "#E64A19" }} /></ListItemIcon>UnderGrad</MenuItem>
                <ListSubheader>Regular</ListSubheader>
                <MenuItem value={2}><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 12, color: "#2E7D32" }} /></ListItemIcon>Non-Teaching</MenuItem>
                <MenuItem value={3}><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 12, color: "#1565C0" }} /></ListItemIcon>Teaching (30Hrs)</MenuItem>
                <MenuItem value={4}><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 12, color: "#7B1FA2" }} /></ListItemIcon>Designated (40Hrs)</MenuItem>
                <ListSubheader>Custom</ListSubheader>
                <MenuItem value={5}><ListItemIcon sx={{ minWidth: 28 }}><Circle sx={{ fontSize: 12, color: "#00796B" }} /></ListItemIcon>Other (specify)</MenuItem>
              </Select>
            </FormControl>
            {parseInt(bulkEmploymentCategory) === 5 && <Fade in><CleanTextField fullWidth label="Custom Category Description *" value={bulkCustomCategory} onChange={(e) => setBulkCustomCategory(e.target.value)} sx={{ mt: 2 }} required size="small" /></Fade>}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2.5, gap: 1.5, borderTop: `1px solid #f0f0f0` }}>
            <Button onClick={closeBulkCategoryEdit} startIcon={<Close sx={{ fontSize: 16 }} />} disabled={bulkEditLoading} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, color: "#6b7280", fontFamily: "Arial, sans-serif" }}>Cancel</Button>
            <Button onClick={handleSaveBulkCategoryEdit} variant="contained" disabled={bulkEditLoading} startIcon={bulkEditLoading ? <CircularProgress size={16} /> : <CheckCircle sx={{ fontSize: 16 }} />}
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, bgcolor: p, color: "#fff", fontFamily: "Arial, sans-serif", boxShadow: `0 4px 14px ${alpha(p, 0.3)}`, "&:hover": { bgcolor: s } }}>
              {bulkEditLoading ? "Saving…" : "Apply to Selected"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Delete Dialog ── */}
        <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, fontFamily: "Arial, sans-serif" } }}>
          <Box sx={{ height: 4, bgcolor: "#ef4444" }} />
          <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 3, py: 2.5, borderBottom: `1px solid #f0f0f0` }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: alpha("#ef4444", 0.08), display: "flex", alignItems: "center", justifyContent: "center" }}><DeleteIcon sx={{ fontSize: 20, color: "#ef4444" }} /></Box>
            <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", fontFamily: "Arial, sans-serif" }}>Confirm Delete User</Typography>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            {userToDelete && (
              <>
                <Box sx={{ mb: 2.5, p: 2.5, borderRadius: 2.5, border: `1px solid ${alpha("#ef4444", 0.15)}`, bgcolor: alpha("#ef4444", 0.03) }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar sx={{ bgcolor: alpha("#ef4444", 0.1), color: "#ef4444", width: 48, height: 48, fontWeight: 700 }}>{getInitials(userToDelete.fullName)}</Avatar>
                    <Box><Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#111", fontFamily: "Arial, sans-serif" }}>{userToDelete.fullName}</Typography><Typography sx={{ fontSize: "0.75rem", color: "#6b7280", fontFamily: "Arial, sans-serif", mt: 0.25 }}>#{userToDelete.employeeNumber}</Typography></Box>
                  </Box>
                </Box>
                <Alert severity="warning" sx={{ borderRadius: 2 }} icon={<ErrorOutline />}>
                  <Typography sx={{ fontWeight: 600, mb: 0.5, fontSize: "0.875rem", fontFamily: "Arial, sans-serif" }}>This action cannot be undone!</Typography>
                  <Typography sx={{ fontSize: "0.8rem", fontFamily: "Arial, sans-serif" }}>Deleting this user will permanently remove their account and all associated data.</Typography>
                </Alert>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2.5, gap: 1.5, borderTop: `1px solid #f0f0f0` }}>
            <Button onClick={() => setDeleteDialog(false)} disabled={deleteLoading} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, color: "#6b7280", fontFamily: "Arial, sans-serif" }}>Cancel</Button>
            <Button onClick={handleConfirmDelete} variant="contained" disabled={deleteLoading} startIcon={deleteLoading ? <CircularProgress size={16} /> : <DeleteForever sx={{ fontSize: 16 }} />}
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, bgcolor: "#ef4444", color: "#fff", fontFamily: "Arial, sans-serif", boxShadow: "0 4px 14px rgba(239,68,68,0.3)", "&:hover": { bgcolor: "#dc2626" } }}>
              {deleteLoading ? "Deleting…" : "Delete User"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Snackbar ── */}
        <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
          <Alert onClose={() => setSnackbarOpen(false)} severity="error" sx={{ borderRadius: 2, fontFamily: "Arial, sans-serif" }}>{snackbarMessage}</Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default UsersList;